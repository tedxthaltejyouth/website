/**
 * Quality Assurance Committee (QAC).
 *  • Structure: a Member Secretary (runs the Committee; there is no Chair) and QAC members, most of them from outside the
 *    team. The Organizer appoints them. Outside members get a separate, limited account (Admins.external = TRUE) that
 *    opens only the QAC area. They accept a confidentiality and conflict-of-interest declaration first, can connect
 *    Google sign-in like everyone else, and lose access automatically when their term ends.
 *  • Items: review requests from department heads, queries the QAC raises, and automatic delay queries.
 *  • Auto QAC: every day, tasks that are late by more than qac_delay_days get a delay query. The AI writes a few polite
 *    questions (template questions if AI is off), the concerned member is emailed and replies in the portal. The item goes
 *    to the QAC member with the lightest load. No reply → a reminder, then escalation to the department head and Member
 *    Secretary. If the QAC member does not act on a reply in time, the AI adds a suggested assessment for them.
 *  • Recommendations: QAC raises one, the department head responds, QAC closes it.
 *  • Meetings with agenda, minutes and decisions.
 *  • Annual quality report: drafted automatically on qac_report_on (MM-DD) from totals only (no names), with an AI-written
 *    narrative. The Member Secretary edits it, the Organizer issues it on the letterhead (Register + /verify).
 *  Privacy: the AI only sees task titles/descriptions, department names, dates and the reply text. Finance-team tasks never
 *  go to the AI. Outside members never see attendee or member personal data beyond the item they are working on.
 */
const QAC_KINDS = ['Review', 'Query', 'Delay query'];
const QAC_STATUSES = ['Open', 'Awaiting reply', 'Replied', 'Escalated', 'Closed'];
const QAC_REC_STATUSES = ['Open', 'Responded', 'Closed'];
const QAC_DECLARATION = 'I will keep everything I see as a QAC member confidential, use it only for quality assurance of TEDxThaltej Youth, ' +
  'declare any conflict of interest and step back from items where I have one, and treat team members, many of whom are students, with fairness and respect.';

function isQacSec_(me) { return bodiesOf_(me).indexOf('qac_secretary') >= 0; }
function isQac_(me) { return isQacSec_(me) || bodiesOf_(me).indexOf('qac_member') >= 0; }
function qacLead_(me) { return me.role === 'super' || isQacSec_(me); }
function qacPeople_() { return readAll_('Admins').filter(function (a) { return truthy_(a.active) && (bodiesOf_(a).indexOf('qac_secretary') >= 0 || bodiesOf_(a).indexOf('qac_member') >= 0); }); }
function qacSecretary_() { return qacPeople_().filter(isQacSec_)[0] || null; }
function qacConf_() {
  const s = settingsMap_();
  const n = function (k, d, lo, hi) { const v = parseInt(s[k], 10); return isNaN(v) ? d : Math.max(lo, Math.min(hi, v)); };
  return { auto: s.qac_auto === undefined ? true : truthy_(s.qac_auto), ai: s.qac_ai === undefined ? true : truthy_(s.qac_ai),
    delay: n('qac_delay_days', 2, 0, 30), reply: n('qac_reply_days', 3, 1, 30),
    report_on: /^\d{2}-\d{2}$/.test(String(s.qac_report_on || '')) ? s.qac_report_on : '07-15',
    cycle: s.qac_cycle || s.recruit_cycle || '2026-27' };
}
function qacMust_(me, needDeclared) {
  if (me.role !== 'super' && !isQac_(me)) throw new Error('Only QAC members and the Organizer can do this.');
  if (needDeclared !== false && isQac_(me) && !me.qac_declared_at) throw new Error('Accept the QAC declaration first.');
}
function qacDay_(d) { return Utilities.formatDate(d || new Date(), 'Asia/Kolkata', 'yyyy-MM-dd'); }
function qacDays_(a, b) { return Math.round((new Date(String(b).slice(0, 10) + 'T12:00:00Z') - new Date(String(a).slice(0, 10) + 'T12:00:00Z')) / 86400000); }
function qacNames_() { const p = {}; readAll_('Admins').forEach(function (a) { p[lc_(a.email)] = a.name || a.email; }); return p; }
function qacDeptNames_() { const d = {}; readAll_('Departments').forEach(function (x) { d[x.id] = x.name; }); return d; }
function qacHeads_(dept) { return readAll_('Admins').filter(function (a) { return truthy_(a.active) && a.role === 'lead' && dept && myDepts_(a).indexOf(dept) >= 0; }); }
function qacLink_() { return CONFIG.ADMIN_URL + '#qac'; }
function qacSetSettings_(map) {
  withLock_(function () { const ex = settingsMap_(); Object.keys(map).forEach(function (k) { if (ex[k] === undefined) appendRow_('Settings', { key: k, value: map[k] }); else updateRow_('Settings', k, { value: map[k] }); }); });
  bust_();
}
function qacPickMember_() {   // lightest open load; Member Secretary only if nobody else
  const ppl = qacPeople_(); if (!ppl.length) return '';
  const open = {}; readAll_('QacItems').forEach(function (i) { if (i.status !== 'Closed') open[lc_(i.assigned_to)] = (open[lc_(i.assigned_to)] || 0) + 1; });
  const pool = ppl.filter(function (a) { return !isQacSec_(a) && a.qac_declared_at; }); const use = pool.length ? pool : ppl;
  use.sort(function (a, b) { return (open[lc_(a.email)] || 0) - (open[lc_(b.email)] || 0); });
  return lc_(use[0].email);
}
function qacSys_(itemId, body) { appendRow_('QacMsgs', { id: newId_('QM'), item_id: itemId, from_email: 'system', body: String(body).slice(0, 6000), created_at: now_() }); }
function qacMail_(to, subject, html) { try { mail_(to, subject, emailShell_('Quality Assurance Committee', html + '<p><a href="' + qacLink_() + '">Open in the Team Portal</a></p>')); } catch (e) { Logger.log('qac mail: ' + e); } }

// ───────── members ─────────
function qacMemberSave_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer appoints QAC members.');
  const email = lc_(b.email); if (!isEmail_(email)) throw new Error('Enter a valid email.');
  const name = String(b.name || '').trim().slice(0, 100), office = b.secretary ? 'qac_secretary' : 'qac_member';
  const term = String(b.term_until || '').slice(0, 10); if (term && !/^\d{4}-\d{2}-\d{2}$/.test(term)) throw new Error('Choose the term end date.');
  const info = { qac_expertise: String(b.expertise || '').slice(0, 160), qac_term_until: term };
  let a = findAdmin_(email);
  if (a && a.role === 'super') throw new Error('The Organizer cannot be a QAC member.');
  if (office === 'qac_secretary') {   // only one Member Secretary
    const cur = qacSecretary_();
    if (cur && lc_(cur.email) !== email) updateRow_('Admins', lc_(cur.email), { bodies: bodiesOf_(cur).filter(function (x) { return x !== 'qac_secretary'; }).concat(['qac_member']).join(',') });
  }
  let created = false;
  if (!a) {
    if (!name) throw new Error('Give their name.');
    const temp = randomPassword_(), salt = Utilities.getUuid();
    appendRow_('Admins', Object.assign({ email: email, name: name, role: 'member', scopes: '', department_id: '', salt: salt, hash: hash_(temp, salt), active: 'TRUE',
      must_change: 'TRUE', last_login: '', created_at: now_(), registrar: 'FALSE', bodies: office, external: 'TRUE', qac_declared_at: '' }, info));
    mail_(email, 'Your invitation to the Quality Assurance Committee of TEDxThaltej Youth', emailShell_('Welcome, ' + esc_(name.split(' ')[0]) + '.',
      '<p>The Organizer has appointed you as <b>' + (office === 'qac_secretary' ? 'Member Secretary' : 'a member') + ' of the Quality Assurance Committee</b> of TEDxThaltej Youth' + (term ? ', until ' + esc_(longDate_(term)) : '') + '.</p>' +
      '<p>Your account opens only the QAC area of the Team Portal. Sign in with this email and the temporary password below, then set your own. You can also connect your Google account.</p>' +
      '<p style="font-size:20px;font-weight:800;letter-spacing:2px">' + esc_(temp) + '</p><p><a href="' + qacLink_() + '">Open the Team Portal</a></p>'), { priority: 'high' });
    created = true;
  } else {
    const bod = bodiesOf_(a).filter(function (x) { return x !== 'qac_secretary' && x !== 'qac_member'; }).concat([office]);
    updateRow_('Admins', email, Object.assign({ bodies: bod.join(','), active: 'TRUE' }, name ? { name: name } : {}, info));
    if (!isQac_(a)) qacMail_(email, 'Your appointment to the Quality Assurance Committee', '<p>The Organizer has appointed you as <b>' + (office === 'qac_secretary' ? 'Member Secretary' : 'a member') + ' of the Quality Assurance Committee</b>. Your tools are under <b>Quality (QAC)</b>.</p>');
  }
  audit_(me.email, 'QAC appointment', email + ' → ' + office);
  return { ok: true, created: created };
}
function qacMemberRemove_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer changes the QAC.');
  const a = findAdmin_(b.email); if (!a) throw new Error('Not found.');
  const up = { bodies: bodiesOf_(a).filter(function (x) { return x !== 'qac_secretary' && x !== 'qac_member'; }).join(',') };
  if (truthy_(a.external)) up.active = 'FALSE';
  updateRow_('Admins', lc_(a.email), up);
  readAll_('QacItems').forEach(function (i) { if (i.status !== 'Closed' && lc_(i.assigned_to) === lc_(a.email)) updateRow_('QacItems', i.id, { assigned_to: qacPickMember_() }); });
  audit_(me.email, 'QAC removal', lc_(a.email));
  return { ok: true };
}
function qacDeclare_(me, b) {
  if (!isQac_(me)) throw new Error('Only QAC members make this declaration.');
  if (!b.agree) throw new Error('Tick the declaration to continue.');
  updateRow_('Admins', lc_(me.email), { qac_declared_at: now_(), qac_conflicts: String(b.conflicts || '').slice(0, 1000) });
  audit_(me.email, 'QAC declaration', b.conflicts ? 'with conflicts declared' : '');
  return { ok: true };
}

// ───────── overview ─────────
function qacBoot_(me) {
  const mine = lc_(me.email), names = qacNames_(), deps = qacDeptNames_();
  const asConcerned = readAll_('QacItems').filter(function (i) { return lc_(i.concerned_email) === mine && i.kind !== 'Review'; })
    .map(function (i) { return { id: i.id, title: i.title, kind: i.kind, status: i.status, due: i.reply_by, created_at: i.created_at }; }).reverse();
  const myRecs = readAll_('QacRecs').filter(function (r) { return lc_(r.owner_email) === mine; })
    .map(function (r) { return { id: r.id, title: r.title, detail: r.detail, due: r.due, status: r.status, response: r.response }; }).reverse();
  const member = me.role === 'super' || isQac_(me);
  const out = { ok: true, member: member, lead: qacLead_(me), super: me.role === 'super', external: truthy_(me.external), mine: asConcerned, myRecs: myRecs,
    canRequest: me.role === 'lead' || me.role === 'super', departments: readAll_('Departments').filter(function (d) { return me.role === 'super' || isQac_(me) || myDepts_(me).indexOf(d.id) >= 0; }).map(function (d) { return { id: d.id, name: d.name }; }) };
  if (!member) return out;
  out.declared = me.role === 'super' || !!me.qac_declared_at; out.declaration = QAC_DECLARATION;
  out.people = qacPeople_().map(function (a) { return { name: a.name || a.email, email: lc_(a.email), secretary: isQacSec_(a), external: truthy_(a.external), expertise: a.qac_expertise || '', term_until: a.qac_term_until || '', declared: !!a.qac_declared_at }; });
  if (!out.declared) return out;
  const today = qacDay_();
  out.items = readAll_('QacItems').map(function (i) { return { id: i.id, kind: i.kind, title: i.title, department: deps[i.department_id] || '', concerned: names[lc_(i.concerned_email)] || i.concerned_email || '',
    assigned: names[lc_(i.assigned_to)] || i.assigned_to || '', mine: lc_(i.assigned_to) === mine, status: i.status, reply_by: i.reply_by, rating: i.rating, auto: truthy_(i.auto), created_at: i.created_at }; }).reverse();
  out.recs = readAll_('QacRecs').map(function (r) { return { id: r.id, title: r.title, detail: r.detail, department: deps[r.department_id] || '', owner: names[lc_(r.owner_email)] || r.owner_email, due: r.due, status: r.status,
    overdue: r.status !== 'Closed' && r.due && r.due < today, response: r.response, item_id: r.item_id }; }).reverse();
  out.meetings = readAll_('QacMeetings').map(function (m) { return { id: m.id, title: m.title, at: m.at, link: m.link, agenda: m.agenda, minutes: m.minutes, decisions: m.decisions, attendees: m.attendees }; }).reverse();
  out.reports = readAll_('QacReports').map(function (r) { return { id: r.id, cycle: r.cycle, from: r.date_from, to: r.date_to, status: r.status, reg_id: r.reg_id, created_at: r.created_at, issued_at: r.issued_at }; }).reverse();
  out.conf = qacConf_();
  out.kinds = QAC_KINDS; out.statuses = QAC_STATUSES;
  return out;
}

// ───────── items ─────────
function qacCanSee_(me, i) {
  if (me.role === 'super' || isQac_(me)) return 'qac';
  if (lc_(i.concerned_email) === lc_(me.email) && i.kind !== 'Review') return 'concerned';
  if (lc_(i.created_by) === lc_(me.email)) return 'requester';
  return '';
}
function qacItemNew_(me, b) {
  const f = clean_(b, { kind: 20, title: 160, detail: 6000, links: 800, department_id: 40, concerned_email: 120 });
  const isQ = me.role === 'super' || isQac_(me);
  if (f.kind === 'Review') {
    if (!isQ && me.role !== 'lead') throw new Error('Department heads ask the QAC for reviews.');
    if (!isQ && f.department_id && !inDept_(me, f.department_id)) throw new Error('Choose your own department.');
    if (!f.title || f.detail.length < 20) throw new Error('Say what should be reviewed and what you want checked.');
  } else {
    qacMust_(me); f.kind = 'Query';
    if (!isEmail_(f.concerned_email) || !findAdmin_(f.concerned_email)) throw new Error('Choose the team member to ask.');
    if (!f.title) throw new Error('Give a title.');
  }
  rateLimit_('qacnew_' + lc_(me.email), 30, 86400);
  const qs = f.kind === 'Query' ? [].concat(b.questions || []).map(function (q) { return String(q).trim().slice(0, 500); }).filter(String).slice(0, 8) : [];
  if (f.kind === 'Query' && !qs.length) throw new Error('Add at least one question.');
  const reply = qacConf_().reply, rec = { id: seq_('QacItems', 'QAC'), kind: f.kind, title: f.title, detail: f.detail, links: f.links, department_id: f.department_id || (findAdmin_(f.concerned_email) || {}).department_id || '',
    concerned_email: lc_(f.concerned_email), created_by: lc_(me.email), assigned_to: isQ && f.kind === 'Query' ? lc_(me.email) : qacPickMember_(), questions_json: JSON.stringify(qs),
    status: f.kind === 'Query' ? 'Awaiting reply' : 'Open', reply_by: f.kind === 'Query' ? qacDay_(new Date(Date.now() + reply * 86400000)) : '', source_id: '', auto: 'FALSE',
    reminders: '0', rating: '', outcome: '', ai_note: '', created_at: now_(), updated_at: now_(), closed_at: '' };
  appendRow_('QacItems', rec);
  if (f.kind === 'Query') qacAskMail_(rec, qs);
  if (rec.assigned_to && rec.assigned_to !== lc_(me.email)) qacMail_(rec.assigned_to, 'New QAC item for you: ' + rec.id, '<p><b>' + esc_(rec.title) + '</b> (' + esc_(rec.kind) + ') has been assigned to you.</p>');
  audit_(me.email, 'QAC item', rec.id + ' ' + rec.kind);
  return { ok: true, id: rec.id };
}
function qacAskMail_(rec, qs) {
  const a = findAdmin_(rec.concerned_email) || {};
  qacMail_(rec.concerned_email, 'Questions from the Quality Assurance Committee (' + rec.id + ')',
    '<p>Dear ' + esc_(String(a.name || 'member').split(' ')[0]) + ',</p><p>The Quality Assurance Committee would like to understand <b>' + esc_(rec.title) + '</b>. This is not a disciplinary matter; it helps us support the team and improve how we work.</p>' +
    '<ol>' + qs.map(function (q) { return '<li>' + esc_(q) + '</li>'; }).join('') + '</ol><p>Please reply in the Team Portal by <b>' + esc_(longDate_(rec.reply_by)) + '</b>.</p>');
}
function qacItem_(me, id) {
  const i = findRow_('QacItems', id); if (!i) throw new Error('Item not found.');
  const role = qacCanSee_(me, i); if (!role) throw new Error('Item not found.');
  if (role === 'qac') qacMust_(me);
  const names = qacNames_(), deps = qacDeptNames_();
  const msgs = readAll_('QacMsgs').filter(function (m) { return m.item_id === i.id && (role === 'qac' || m.channel !== 'qac'); })
    .map(function (m) { return { from: m.from_email === 'system' ? 'system' : (names[lc_(m.from_email)] || m.from_email), mine: lc_(m.from_email) === lc_(me.email), body: m.body, at: m.created_at, internal: m.channel === 'qac' }; });
  const task = i.source_id ? findRow_('Tasks', String(i.source_id).split('@')[0]) : null;
  return { ok: true, role: role, lead: qacLead_(me), item: { id: i.id, kind: i.kind, title: i.title, detail: i.detail, links: i.links, department: deps[i.department_id] || '', department_id: i.department_id,
    concerned: names[lc_(i.concerned_email)] || i.concerned_email, assigned: names[lc_(i.assigned_to)] || i.assigned_to, assigned_email: role === 'qac' ? lc_(i.assigned_to) : '', mine: lc_(i.assigned_to) === lc_(me.email),
    questions: safeJson_(i.questions_json, []), status: i.status, reply_by: i.reply_by, rating: i.rating, outcome: i.status === 'Closed' || role === 'qac' ? i.outcome : '', auto: truthy_(i.auto),
    ai_note: role === 'qac' ? i.ai_note : '', created_at: i.created_at,
    task: task && role === 'qac' ? { title: task.title, due: task.due_date, status: task.status } : null }, messages: msgs,
    people: role === 'qac' ? qacPeople_().map(function (a) { return { email: lc_(a.email), name: a.name }; }) : [] };
}
function qacPost_(me, b) {
  const i = findRow_('QacItems', b.id); if (!i) throw new Error('Item not found.');
  const role = qacCanSee_(me, i); if (!role) throw new Error('Item not found.');
  if (role === 'qac') qacMust_(me);
  if (i.status === 'Closed') throw new Error('This item is closed.');
  const body = String(b.body || '').trim().slice(0, 6000); if (!body) throw new Error('Write a message.');
  const internal = role === 'qac' && !!b.internal;
  appendRow_('QacMsgs', { id: newId_('QM'), item_id: i.id, channel: internal ? 'qac' : 'open', from_email: lc_(me.email), body: body, created_at: now_() });
  const up = { updated_at: now_() };
  if (role === 'concerned' || role === 'requester') {
    if (role === 'concerned') { up.status = 'Replied'; up.replied_at = now_(); }
    [i.assigned_to, (qacSecretary_() || {}).email].filter(isEmail_).filter(function (e, k, arr) { return arr.indexOf(e) === k; })
      .forEach(function (e) { qacMail_(e, 'Reply on ' + i.id, '<p>' + esc_(me.name) + ' replied on <b>' + esc_(i.title) + '</b>.</p>'); });
  } else if (!internal) {
    const to = i.kind === 'Review' ? i.created_by : i.concerned_email;
    if (isEmail_(to)) qacMail_(to, 'Message from the Quality Assurance Committee (' + i.id + ')', '<p>You have a new message about <b>' + esc_(i.title) + '</b>.</p><blockquote>' + esc_(body).replace(/\n/g, '<br>') + '</blockquote>');
    if (i.kind !== 'Review' && i.status !== 'Awaiting reply') { up.status = 'Awaiting reply'; up.reply_by = qacDay_(new Date(Date.now() + qacConf_().reply * 86400000)); up.reminders = '0'; }
  }
  updateRow_('QacItems', i.id, up);
  return { ok: true };
}
function qacAct_(me, b) {
  qacMust_(me);
  const i = findRow_('QacItems', b.id); if (!i) throw new Error('Item not found.');
  const up = { updated_at: now_() }; let note = '';
  if (b.op === 'assign') {
    const e = lc_(b.email); if (!qacPeople_().some(function (a) { return lc_(a.email) === e; })) throw new Error('Choose a QAC member.');
    if (!qacLead_(me) && lc_(i.assigned_to) !== lc_(me.email)) throw new Error('Only the Member Secretary reassigns items.');
    up.assigned_to = e; note = 'assigned to ' + (findAdmin_(e) || {}).name; if (e !== lc_(me.email)) qacMail_(e, 'QAC item for you: ' + i.id, '<p><b>' + esc_(i.title) + '</b> has been assigned to you.</p>');
  } else if (b.op === 'close') {
    const out = String(b.outcome || '').trim(); if (out.length < 10) throw new Error('Write the outcome (what QAC found).');
    const r = parseInt(b.rating, 10); if (i.kind === 'Review' && !(r >= 1 && r <= 5)) throw new Error('Give a quality rating from 1 to 5.');
    up.status = 'Closed'; up.outcome = out.slice(0, 4000); up.rating = r >= 1 && r <= 5 ? String(r) : ''; up.closed_at = now_(); note = 'closed';
    const to = i.kind === 'Review' ? i.created_by : i.concerned_email;
    if (isEmail_(to)) qacMail_(to, 'QAC ' + i.id + ' closed', '<p><b>' + esc_(i.title) + '</b> is closed.</p><p><b>Outcome:</b><br>' + esc_(up.outcome).replace(/\n/g, '<br>') + '</p>');
  } else if (b.op === 'reopen') { up.status = i.kind === 'Review' ? 'Open' : 'Awaiting reply'; up.closed_at = ''; note = 'reopened'; }
  else if (b.op === 'remind') { if (i.kind === 'Review') throw new Error('Reviews have no one to remind.'); qacAskMail_(i, safeJson_(i.questions_json, [])); up.reminders = String((+i.reminders || 0) + 1); note = 'sent a reminder'; }
  else if (b.op === 'escalate') { qacEscalate_(i, me.name); return { ok: true }; }
  else if (b.op === 'ai') { const n = qacAiAssess_(i); up.ai_note = n; note = 'AI assessment added'; }
  else throw new Error('Unknown action.');
  updateRow_('QacItems', i.id, up);
  qacSys_(i.id, me.name + ': ' + note);
  audit_(me.email, 'QAC ' + b.op, i.id);
  return { ok: true };
}
function qacEscalate_(i, by) {
  const heads = qacHeads_(i.department_id).map(function (a) { return lc_(a.email); }), sec = qacSecretary_();
  heads.concat(sec ? [lc_(sec.email)] : []).filter(function (e, k, arr) { return e !== lc_(i.concerned_email) && arr.indexOf(e) === k; }).forEach(function (e) {
    qacMail_(e, 'Escalated by QAC: ' + i.title, '<p>The Quality Assurance Committee has not received a reply on <b>' + esc_(i.title) + '</b> (' + esc_(i.id) + ') from ' + esc_((findAdmin_(i.concerned_email) || {}).name || i.concerned_email) + '. Please follow up with them.</p>'); });
  updateRow_('QacItems', i.id, { status: 'Escalated', escalated_at: now_(), updated_at: now_() });
  qacSys_(i.id, (by || 'Auto QAC') + ': escalated to the department head' + (heads.length ? '' : ' (none found)') + ' and the Member Secretary');
}

// ───────── AI ─────────
function qacAiOk_(deptId) { return qacConf_().ai && !/financ|money|account/i.test(qacDeptNames_()[deptId] || ''); }
function qacTemplateQs_(t, late) {
  return ['What has held up "' + clipS_(t.title, 100) + '"' + (late ? ' (it was due ' + late + ' day' + (late === 1 ? '' : 's') + ' ago)' : '') + '?',
    'How much of it is done so far, and what is left?', 'By what date can you realistically finish it?', 'Is there anything or anyone that would help you finish it?'];
}
function qacAiQuestions_(me, b) {   // for the QAC: draft questions for a manual query
  qacMust_(me);
  const t = clean_(b, { title: 160, detail: 1500, department_id: 40 });
  if (!t.title) throw new Error('Give the title first.');
  if (!qacAiOk_(t.department_id)) return { ok: true, questions: qacTemplateQs_(t, 0), ai: false };
  rateLimit_('qacai_' + lc_(me.email), 30, 3600);
  try { return { ok: true, questions: qacAiQs_(t, 0), ai: true }; } catch (e) { return { ok: true, questions: qacTemplateQs_(t, 0), ai: false, error: e.message }; }
}
function qacAiQs_(t, late) {
  const r = aiRun_('You write questions for the Quality Assurance Committee of TEDxThaltej Youth, a student-run TEDx event in Ahmedabad. Team members are mostly students, so be warm, ' +
    'respectful and specific, never accusing. Write 3 or 4 short questions that help the committee understand the work below: the cause of any delay, progress so far, a realistic new date, and what support would help. ' +
    'Return JSON: {"questions":["..."]}\n\nWORK: ' + clipS_(t.title, 160) + '\nDETAILS: ' + clipS_(t.detail || t.description, 800) + '\nTEAM: ' + clipS_(qacDeptNames_()[t.department_id] || '', 60) +
    (late ? '\nDUE: ' + t.due_date + ' (' + late + ' days late)\nSTATUS: ' + clipS_(t.status, 30) : ''));
  const qs = [].concat((r.out || {}).questions || []).map(function (q) { return clipS_(q, 300); }).filter(String).slice(0, 5);
  if (!qs.length) throw new Error('AI returned no questions.');
  return qs;
}
function qacAiAssess_(i) {
  if (!qacAiOk_(i.department_id)) return 'AI is not used for this item.';
  const replies = readAll_('QacMsgs').filter(function (m) { return m.item_id === i.id && m.from_email !== 'system' && m.channel !== 'qac'; }).map(function (m) { return clipS_(m.body, 1200); });
  const r = aiRun_('You help the Quality Assurance Committee of a student-run TEDx event. Read the questions and the replies below and write a short, fair assessment for the committee member. ' +
    'Do not judge the person; focus on the work. Return JSON: {"summary":"2 sentences","answered":"yes|partly|no","risks":["up to 3"],"suggested_outcome":"1–2 sentences the committee could record","follow_up":["up to 2 questions, only if something is unanswered"]}\n\n' +
    'ITEM: ' + clipS_(i.title, 160) + '\nDETAILS: ' + clipS_(i.detail, 800) + '\nQUESTIONS:\n' + safeJson_(i.questions_json, []).map(function (q, k) { return (k + 1) + '. ' + q; }).join('\n') + '\nREPLIES:\n' + (replies.join('\n---\n') || '(none)'));
  const o = r.out || {};
  return clipS_(['Summary: ' + clipS_(o.summary, 600), 'Answered: ' + clipS_(o.answered, 10), (o.risks || []).length ? 'Risks: ' + [].concat(o.risks).slice(0, 3).map(function (x) { return clipS_(x, 200); }).join('; ') : '',
    'Suggested outcome: ' + clipS_(o.suggested_outcome, 400), (o.follow_up || []).length ? 'Follow-up: ' + [].concat(o.follow_up).slice(0, 2).map(function (x) { return clipS_(x, 200); }).join(' / ') : ''].filter(String).join('\n'), 3000);
}

// ───────── recommendations ─────────
function qacRecNew_(me, b) {
  qacMust_(me);
  const f = clean_(b, { title: 160, detail: 4000, department_id: 40, owner_email: 120, due: 10, item_id: 30 });
  if (!f.title || f.detail.length < 10) throw new Error('Write the recommendation.');
  let owner = lc_(f.owner_email); if (!owner) owner = lc_((qacHeads_(f.department_id)[0] || {}).email || '');
  if (!isEmail_(owner) || !findAdmin_(owner)) throw new Error('Choose who should respond (usually the department head).');
  const rec = { id: seq_('QacRecs', 'QR'), item_id: f.item_id, title: f.title, detail: f.detail, department_id: f.department_id, owner_email: owner, due: f.due, status: 'Open', response: '',
    created_by: lc_(me.email), created_at: now_(), responded_at: '', closed_at: '' };
  appendRow_('QacRecs', rec);
  qacMail_(owner, 'QAC recommendation for you: ' + f.title, '<p>The Quality Assurance Committee recommends:</p><p><b>' + esc_(f.title) + '</b><br>' + esc_(f.detail).replace(/\n/g, '<br>') + '</p>' + (f.due ? '<p>Please respond by <b>' + esc_(longDate_(f.due)) + '</b>.</p>' : ''));
  audit_(me.email, 'QAC recommendation', rec.id);
  return { ok: true, id: rec.id };
}
function qacRecRespond_(me, b) {
  const r = findRow_('QacRecs', b.id); if (!r) throw new Error('Not found.');
  if (lc_(r.owner_email) !== lc_(me.email) && me.role !== 'super') throw new Error('Only the person it is addressed to can respond.');
  if (r.status === 'Closed') throw new Error('Already closed.');
  const t = String(b.response || '').trim(); if (t.length < 10) throw new Error('Say what you have done or will do.');
  updateRow_('QacRecs', r.id, { response: t.slice(0, 4000), status: 'Responded', responded_at: now_() });
  [r.created_by, (qacSecretary_() || {}).email].filter(isEmail_).forEach(function (e) { qacMail_(e, 'Response to QAC recommendation ' + r.id, '<p>' + esc_(me.name) + ' responded to <b>' + esc_(r.title) + '</b>.</p>'); });
  return { ok: true };
}
function qacRecClose_(me, b) {
  qacMust_(me);
  const r = findRow_('QacRecs', b.id); if (!r) throw new Error('Not found.');
  if (b.back) { updateRow_('QacRecs', r.id, { status: 'Open' }); qacMail_(r.owner_email, 'QAC needs more on ' + r.title, '<p>' + esc_(String(b.note || 'Please add more detail.')) + '</p>'); }
  else updateRow_('QacRecs', r.id, { status: 'Closed', closed_at: now_() });
  return { ok: true };
}

// ───────── meetings ─────────
function qacMeetSave_(me, b) {
  qacMust_(me); if (!qacLead_(me)) throw new Error('The Member Secretary schedules QAC meetings.');
  const f = clean_(b, { id: 30, title: 160, at: 16, agenda: 4000, minutes: 10000, decisions: 4000, attendees: 1000, link: 300 });
  if (f.id) { const m = findRow_('QacMeetings', f.id); if (!m) throw new Error('Not found.'); delete f.id; updateRow_('QacMeetings', m.id, f); return { ok: true, id: m.id }; }
  if (!f.title || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(f.at)) throw new Error('Give a title, date and time.');
  const start = new Date(f.at + ':00+05:30'), end = new Date(start.getTime() + (parseInt(b.minutesLong, 10) || 60) * 60000);
  let cal = { meet: '' }; try { cal = recCalendar_('QAC meeting · ' + f.title, f.agenda || 'Quality Assurance Committee meeting', start, end, qacPeople_().map(function (a) { return lc_(a.email); }).concat([lc_(CONFIG.SUPER_ADMIN_EMAIL)]), ''); } catch (e) { Logger.log(e); }
  const rec = { id: seq_('QacMeetings', 'QM'), title: f.title, at: f.at, link: cal.meet || f.link, agenda: f.agenda, minutes: '', decisions: '', attendees: '', created_by: lc_(me.email), created_at: now_() };
  appendRow_('QacMeetings', rec);
  return { ok: true, id: rec.id };
}

// ───────── annual quality report ─────────
function qacMetrics_(from, to) {
  const inR = function (d) { d = String(d || '').slice(0, 10); return d && d >= from && d <= to; };
  const deps = qacDeptNames_(), tasks = readAll_('Tasks').filter(function (t) { return inR(t.due_date); });
  const byDept = {};
  tasks.forEach(function (t) { const k = deps[t.department_id] || 'Unassigned'; byDept[k] = byDept[k] || { tasks: 0, done: 0, on_time: 0 }; byDept[k].tasks++;
    if (t.status === 'Done') { byDept[k].done++; if (String(t.updated_at).slice(0, 10) <= t.due_date) byDept[k].on_time++; } });
  const items = readAll_('QacItems').filter(function (i) { return inR(i.created_at); });
  const q = items.filter(function (i) { return i.kind !== 'Review'; }), rv = items.filter(function (i) { return i.kind === 'Review'; });
  const replyDays = q.filter(function (i) { return i.replied_at; }).map(function (i) { return qacDays_(i.created_at, i.replied_at); });
  const ratings = rv.map(function (i) { return +i.rating; }).filter(function (x) { return x > 0; });
  const recs = readAll_('QacRecs').filter(function (r) { return inR(r.created_at); }), today = qacDay_();
  const evIds = readAll_('SideEvents').filter(function (e) { return inR(e.starts_at); }).map(function (e) { return e.id; });
  const nps = readAll_('EventFeedback').filter(function (f) { return evIds.indexOf(f.event_id) >= 0 && f.nps !== ''; }).map(function (f) { return +f.nps; });
  const avg = function (a) { return a.length ? Math.round(a.reduce(function (s, x) { return s + x; }, 0) / a.length * 10) / 10 : null; };
  const done = tasks.filter(function (t) { return t.status === 'Done'; });
  return { period: { from: from, to: to },
    tasks: { due: tasks.length, done: done.length, on_time: done.filter(function (t) { return String(t.updated_at).slice(0, 10) <= t.due_date; }).length,
      by_team: Object.keys(byDept).sort().map(function (k) { return { team: k, tasks: byDept[k].tasks, done: byDept[k].done, on_time: byDept[k].on_time }; }) },
    queries: { raised: q.length, automatic: q.filter(function (i) { return truthy_(i.auto); }).length, replied: replyDays.length, avg_reply_days: avg(replyDays), escalated: q.filter(function (i) { return !!i.escalated_at; }).length },
    reviews: { done: rv.filter(function (i) { return i.status === 'Closed'; }).length, requested: rv.length, avg_rating: avg(ratings) },
    recommendations: { raised: recs.length, closed: recs.filter(function (r) { return r.status === 'Closed'; }).length, open: recs.filter(function (r) { return r.status !== 'Closed'; }).length,
      overdue: recs.filter(function (r) { return r.status !== 'Closed' && r.due && r.due < today; }).length },
    meetings: { held: readAll_('QacMeetings').filter(function (m) { return inR(m.at) && m.at.slice(0, 10) <= today; }).length, with_minutes: readAll_('QacMeetings').filter(function (m) { return inR(m.at) && m.minutes; }).length },
    feedback: { side_events: evIds.length, responses: nps.length, avg_score: avg(nps),
      nps: nps.length ? Math.round((nps.filter(function (x) { return x >= 9; }).length - nps.filter(function (x) { return x <= 6; }).length) / nps.length * 100) : null },
    members: qacPeople_().length };
}
function qacReportText_(m, cycle) {
  const pct = function (a, b) { return b ? Math.round(a / b * 100) + '%' : '—'; };
  const t = m.tasks, base = 'This report of the Quality Assurance Committee covers the ' + cycle + ' cycle of TEDxThaltej Youth, from ' + longDate_(m.period.from) + ' to ' + longDate_(m.period.to) + '. It is prepared from totals in the Team Portal and names no individual.';
  let ai = null;
  if (qacConf_().ai) try { ai = (aiRun_('You write the annual quality report of the Quality Assurance Committee of TEDxThaltej Youth, a student-run, independently organised TEDx event in Ahmedabad. ' +
    'Use ONLY the figures given; do not invent numbers, people or events. Be balanced, plain and constructive. British/Indian English. ' +
    'Return JSON: {"overview":"one paragraph","strengths":["3–5"],"concerns":["2–5"],"recommendations":["4–6, specific and doable next cycle"]}\n\nFIGURES:\n' + JSON.stringify(m)).out || null); } catch (e) { Logger.log('qac report ai: ' + e); }
  const li = function (a) { return [].concat(a || []).slice(0, 6).map(function (x) { return '- ' + clipS_(x, 300); }).join('\n'); };
  const parts = [base];
  parts.push(ai && ai.overview ? clipS_(ai.overview, 1500) : 'Across the cycle, ' + t.done + ' of ' + t.due + ' tasks that fell due were completed (' + pct(t.done, t.due) + '), ' + pct(t.on_time, t.due) + ' of them on time. ' +
    'The Committee raised ' + m.queries.raised + ' queries (' + m.queries.automatic + ' automatically on delayed tasks), completed ' + m.reviews.done + ' quality reviews and made ' + m.recommendations.raised + ' recommendations, of which ' + m.recommendations.closed + ' are closed.');
  if (ai && (ai.strengths || []).length) parts.push('Strengths\n' + li(ai.strengths));
  if (ai && (ai.concerns || []).length) parts.push('Areas of concern\n' + li(ai.concerns));
  if (ai && (ai.recommendations || []).length) parts.push('Recommendations for the next cycle\n' + li(ai.recommendations));
  parts.push('The Committee thanks the team for its cooperation. This report is advisory; decisions on it rest with the Organizer.');
  return parts.join('\n\n').slice(0, 7800);
}
function qacReportTable_(m) {
  const pct = function (a, b) { return b ? ' (' + Math.round(a / b * 100) + '%)' : ''; };
  return [['Tasks due', String(m.tasks.due)], ['Completed', m.tasks.done + pct(m.tasks.done, m.tasks.due)], ['Completed on time', m.tasks.on_time + pct(m.tasks.on_time, m.tasks.due)],
    ['QAC queries', m.queries.raised + ' (' + m.queries.automatic + ' automatic) · ' + m.queries.replied + ' answered' + (m.queries.avg_reply_days != null ? ' · avg ' + m.queries.avg_reply_days + ' days' : '')],
    ['Quality reviews', m.reviews.done + ' of ' + m.reviews.requested + (m.reviews.avg_rating != null ? ' · avg rating ' + m.reviews.avg_rating + '/5' : '')],
    ['Recommendations', m.recommendations.raised + ' raised · ' + m.recommendations.closed + ' closed · ' + m.recommendations.overdue + ' overdue'],
    ['QAC meetings', m.meetings.held + ' held · ' + m.meetings.with_minutes + ' with minutes'],
    ['Side-event feedback', m.feedback.responses ? m.feedback.responses + ' responses · NPS ' + m.feedback.nps : 'No responses']]
    .concat(m.tasks.by_team.slice(0, 12).map(function (d) { return ['Team: ' + d.team, d.on_time + ' of ' + d.tasks + ' on time']; }));
}
function qacReportDraft_(me, b) {
  if (me) { qacMust_(me); if (!qacLead_(me)) throw new Error('The Member Secretary prepares the report.'); }
  const c = qacConf_(), today = qacDay_();
  let to = String((b && b.to) || today).slice(0, 10), from = String((b && b.from) || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) from = qacDay_(new Date(new Date((+to.slice(0, 4) - 1) + '-' + c.report_on + 'T12:00:00+05:30').getTime() + 86400000));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || from > to) throw new Error('Check the dates.');
  const m = qacMetrics_(from, to), cycle = String((b && b.cycle) || c.cycle).slice(0, 20);
  const ex = readAll_('QacReports').filter(function (r) { return r.cycle === cycle && r.status === 'Draft'; })[0];
  const rec = { cycle: cycle, date_from: from, date_to: to, metrics_json: JSON.stringify(m), body: qacReportText_(m, cycle), updated_at: now_() };
  let id;
  if (ex) { updateRow_('QacReports', ex.id, rec); id = ex.id; }
  else { id = seq_('QacReports', 'AQR'); appendRow_('QacReports', Object.assign({ id: id, status: 'Draft', reg_id: '', created_at: now_(), issued_at: '' }, rec)); }
  [(qacSecretary_() || {}).email, CONFIG.SUPER_ADMIN_EMAIL].filter(isEmail_).forEach(function (e) {
    qacMail_(e, 'Annual Quality Report ' + cycle + ': draft ready', '<p>The draft Annual Quality Report for <b>' + esc_(cycle) + '</b> is ready. The Member Secretary can edit it; the Organizer issues it.</p>'); });
  return { ok: true, id: id };
}
function qacReport_(me, id) {
  qacMust_(me);
  const r = findRow_('QacReports', id); if (!r) throw new Error('Not found.');
  return { ok: true, report: { id: r.id, cycle: r.cycle, from: r.date_from, to: r.date_to, status: r.status, body: r.body, metrics: safeJson_(r.metrics_json, {}), table: qacReportTable_(safeJson_(r.metrics_json, {})), reg_id: r.reg_id }, lead: qacLead_(me), super: me.role === 'super' };
}
function qacReportSave_(me, b) {
  qacMust_(me); if (!qacLead_(me)) throw new Error('The Member Secretary edits the report.');
  const r = findRow_('QacReports', b.id); if (!r || r.status !== 'Draft') throw new Error('Only a draft can be edited.');
  updateRow_('QacReports', r.id, { body: String(b.body || '').slice(0, 7800), updated_at: now_() });
  return { ok: true };
}
function qacReportIssue_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer issues the Annual Quality Report.');
  const r = findRow_('QacReports', b.id); if (!r || r.status !== 'Draft') throw new Error('This report is already issued.');
  const m = safeJson_(r.metrics_json, {});
  const res = regIssue_(me, { type: 'qac_report', send: false, fields: { recipient_name: r.cycle, addressee: 'The Organizer and members of TEDxThaltej Youth',
    table_json: JSON.stringify(qacReportTable_(m)), body: r.body } }, true);
  updateRow_('QacReports', r.id, { status: 'Issued', reg_id: res.id, issued_at: now_() });
  const reg = findRow_('Register', res.id), blob = reg && reg.file_id ? DriveApp.getFileById(reg.file_id).getBlob() : null;
  qacPeople_().forEach(function (a) { try { mail_(a.email, 'Annual Quality Report ' + r.cycle + ' issued', emailShell_('Quality Assurance Committee', '<p>The Organizer has issued the Annual Quality Report for <b>' + esc_(r.cycle) + '</b>. It is attached.</p><p>Register number: <b>' + esc_(res.id) + '</b></p>'), blob ? { attachments: [blob] } : {}); } catch (e) { } });
  audit_(me.email, 'QAC report issued', r.id + ' → ' + res.id);
  return { ok: true, reg_id: res.id };
}
function qacReportPdf_(me, id) {
  qacMust_(me);
  const r = findRow_('QacReports', id); if (!r || !r.reg_id) throw new Error('Not issued yet.');
  const reg = findRow_('Register', r.reg_id); if (!reg || !reg.file_id) throw new Error('File not found.');
  const f = DriveApp.getFileById(reg.file_id);
  return { ok: true, name: f.getName(), base64: Utilities.base64Encode(f.getBlob().getBytes()) };
}

// ───────── settings ─────────
function qacSettings_(me, b) {
  qacMust_(me); if (!qacLead_(me)) throw new Error('The Member Secretary or the Organizer changes QAC settings.');
  const map = {};
  if (b.auto != null) map.qac_auto = b.auto ? 'TRUE' : 'FALSE';
  if (b.ai != null) map.qac_ai = b.ai ? 'TRUE' : 'FALSE';
  if (b.delay != null) map.qac_delay_days = String(Math.max(0, Math.min(30, parseInt(b.delay, 10) || 0)));
  if (b.reply != null) map.qac_reply_days = String(Math.max(1, Math.min(30, parseInt(b.reply, 10) || 3)));
  if (b.report_on != null) { if (!/^\d{2}-\d{2}$/.test(b.report_on)) throw new Error('Report date must look like 07-15 (month-day).'); map.qac_report_on = b.report_on; }
  if (b.cycle != null) map.qac_cycle = String(b.cycle).slice(0, 20);
  if (Object.keys(map).length) { qacSetSettings_(map); audit_(me.email, 'QAC settings', JSON.stringify(map)); }
  return { ok: true, conf: qacConf_() };
}

// ───────── daily automation (called from opsHourly, runs once a day) ─────────
function qacDaily_(force) {
  const props = PropertiesService.getScriptProperties(), today = qacDay_();
  if (!force && props.getProperty('QAC_LAST_DAILY') === today) return { skipped: true };
  props.setProperty('QAC_LAST_DAILY', today);
  const c = qacConf_(), out = { queries: 0, reminders: 0, escalated: 0, ai: 0, expired: 0, report: false };
  // 1) terms that ended
  readAll_('Admins').forEach(function (a) {
    if (!isQac_(a) || !a.qac_term_until || a.qac_term_until >= today || !truthy_(a.active)) return;
    const up = { bodies: bodiesOf_(a).filter(function (x) { return x !== 'qac_secretary' && x !== 'qac_member'; }).join(',') };
    if (truthy_(a.external)) up.active = 'FALSE';
    updateRow_('Admins', lc_(a.email), up); out.expired++;
    try { mail_(a.email, 'Thank you for serving on the QAC', emailShell_('Thank you.', '<p>Your term on the Quality Assurance Committee of TEDxThaltej Youth ended on ' + esc_(longDate_(a.qac_term_until)) + '. Thank you for your time and care.</p>')); } catch (e) { }
  });
  if (!qacPeople_().length) return out;
  // 2) new delay queries
  if (c.auto) {
    const have = {}; readAll_('QacItems').forEach(function (i) { if (i.source_id) have[i.source_id] = 1; });
    readAll_('Tasks').forEach(function (t) {
      if (['To do', 'In progress', 'Blocked'].indexOf(t.status) < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(String(t.due_date)) || !t.assigned_to) return;
      const late = qacDays_(t.due_date, today); if (late <= c.delay) return;
      const key = t.id + '@' + t.due_date; if (have[key] || out.queries >= 25) return;
      const who = String(t.assigned_to).split(',').map(lc_).filter(isEmail_)[0]; if (!who || !findAdmin_(who)) return;
      let qs, ai = false;
      if (qacAiOk_(t.department_id)) try { qs = qacAiQs_(t, late); ai = true; } catch (e) { Logger.log('qac ai: ' + e); }
      if (!qs) qs = qacTemplateQs_(t, late);
      const rec = { id: seq_('QacItems', 'QAC'), kind: 'Delay query', title: 'Delayed task: ' + clipS_(t.title, 140), detail: 'Task ' + t.id + ' was due on ' + t.due_date + ' and is still "' + t.status + '" (' + late + ' days late).',
        links: '', department_id: t.department_id, concerned_email: who, created_by: 'system', assigned_to: qacPickMember_(), questions_json: JSON.stringify(qs), status: 'Awaiting reply',
        reply_by: qacDay_(new Date(Date.now() + c.reply * 86400000)), source_id: key, auto: 'TRUE', reminders: '0', rating: '', outcome: '', ai_note: '', created_at: now_(), updated_at: now_(), closed_at: '' };
      appendRow_('QacItems', rec); have[key] = 1; out.queries++;
      qacSys_(rec.id, 'Auto QAC: opened because the task is ' + late + ' days late' + (ai ? '; questions written by AI' : ''));
      qacAskMail_(rec, qs);
    });
  }
  // 3) reminders, escalation, AI help for slow QAC members
  readAll_('QacItems').forEach(function (i) {
    if (i.status === 'Awaiting reply' && i.reply_by && i.reply_by < today) {
      if ((+i.reminders || 0) < 1) { qacAskMail_(i, safeJson_(i.questions_json, [])); updateRow_('QacItems', i.id, { reminders: '1', reply_by: qacDay_(new Date(Date.now() + c.reply * 86400000)) }); qacSys_(i.id, 'Auto QAC: reminder sent'); out.reminders++; }
      else { qacEscalate_(i, 'Auto QAC'); out.escalated++; }
    }
    if (i.status === 'Replied' && i.replied_at && !i.ai_note && qacDays_(i.replied_at, today) >= c.reply && c.ai) {
      try { const n = qacAiAssess_(i); updateRow_('QacItems', i.id, { ai_note: n }); qacSys_(i.id, 'Auto QAC: AI assessment added because the reply waited ' + c.reply + '+ days');
        [i.assigned_to, (qacSecretary_() || {}).email].filter(isEmail_).forEach(function (e) { qacMail_(e, 'Waiting for you: ' + i.id, '<p>A reply on <b>' + esc_(i.title) + '</b> has been waiting. The AI has added a suggested assessment to help you close it.</p>'); });
        out.ai++; } catch (e) { Logger.log('qac assess: ' + e); }
    }
  });
  // 4) annual report on its date
  if (today.slice(5) === c.report_on && !readAll_('QacReports').some(function (r) { return r.cycle === c.cycle; })) { try { qacReportDraft_(null, {}); out.report = true; } catch (e) { opsLog_('scheduled', 'QAC report draft failed', e.message); } }
  return out;
}

// ───────── router ─────────
function qacHandle_(me, a, b) {
  if (a === 'qacBoot') return qacBoot_(me);
  if (a === 'qacDeclare') return qacDeclare_(me, b);
  if (a === 'qacMemberSave') return qacMemberSave_(me, b);
  if (a === 'qacMemberRemove') return qacMemberRemove_(me, b);
  if (a === 'qacItemNew') return qacItemNew_(me, b);
  if (a === 'qacItem') return qacItem_(me, b.id);
  if (a === 'qacPost') return qacPost_(me, b);
  if (a === 'qacAct') return qacAct_(me, b);
  if (a === 'qacAiQuestions') return qacAiQuestions_(me, b);
  if (a === 'qacRecNew') return qacRecNew_(me, b);
  if (a === 'qacRecRespond') return qacRecRespond_(me, b);
  if (a === 'qacRecClose') return qacRecClose_(me, b);
  if (a === 'qacMeetSave') return qacMeetSave_(me, b);
  if (a === 'qacReportDraft') return qacReportDraft_(me, b);
  if (a === 'qacReport') return qacReport_(me, b.id);
  if (a === 'qacReportSave') return qacReportSave_(me, b);
  if (a === 'qacReportIssue') return qacReportIssue_(me, b);
  if (a === 'qacReportPdf') return qacReportPdf_(me, b.id);
  if (a === 'qacSettings') return qacSettings_(me, b);
  if (a === 'qacRunNow') { if (!qacLead_(me)) throw new Error('Only the Member Secretary or the Organizer.'); return Object.assign({ ok: true }, qacDaily_(true)); }
  if (a === 'qacMembers') { qacMust_(me); return { ok: true, people: readAll_('Admins').filter(function (x) { return truthy_(x.active) && !truthy_(x.external); }).map(function (x) { return { email: lc_(x.email), name: x.name, department_id: x.department_id }; }) }; }
  return null;
}
