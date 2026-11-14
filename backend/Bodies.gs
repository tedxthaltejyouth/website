/**
 * Governance bodies under the TEDxThaltej Charter, visible to every member in the Team Portal.
 *  • Senior Advisors (Article 24.1): appointed by the Organizer; Council members; asked for advice through
 *    Consultations (the Organizer asks, advisors reply, the Organizer records a summary).
 *  • Internal Disciplinary Committee (13B): one Chairperson (from the Senior Advisors, 24.2.1) + five members.
 *    Members can report a concern; the IDC investigates in a confidential case file, informs the concerned person
 *    and hears them (13B.7.2), recommends findings and action to the Organizer, who decides (13B.6.3).
 *    Constitutional Reviews verified by the Registrar open an IDC case automatically (Article 24.3).
 *  • Core Team (13A): everyone in a Head (lead) role.
 */
const IDC_KINDS = ['Misconduct', 'Charter violation', 'Breach of confidentiality', 'Ethical or professional misconduct', 'Constitutional review', 'Other'];
const IDC_STATUSES = ['Received', 'Under inquiry', 'Hearing scheduled', 'Findings submitted', 'Decided', 'Dismissed', 'Closed'];

function isAdvisor_(me) { return bodiesOf_(me).indexOf('senior_advisor') >= 0; }
function isIdcChair_(me) { return bodiesOf_(me).indexOf('idc_chair') >= 0; }
function isIdc_(me) { return isIdcChair_(me) || bodiesOf_(me).indexOf('idc_member') >= 0; }
function idcChair_() { return readAll_('Admins').filter(function (a) { return truthy_(a.active) && bodiesOf_(a).indexOf('idc_chair') >= 0; })[0] || null; }
function idcPeople_() { return readAll_('Admins').filter(function (a) { return truthy_(a.active) && (bodiesOf_(a).indexOf('idc_chair') >= 0 || bodiesOf_(a).indexOf('idc_member') >= 0); }); }

// ───────── who is who (all members) ─────────
function govBodies_(me) {
  const all = readAll_('Admins').filter(function (a) { return truthy_(a.active); });
  const deps = {}; readAll_('Departments').forEach(function (d) { deps[d.id] = d.name; });
  const pub = function (a) { return { name: a.name || a.email, email: lc_(a.email), team: myDepts_(a).map(function (d) { return deps[d]; }).filter(String).join(' · ') }; };
  const sup = all.filter(function (a) { return a.role === 'super'; })[0] || { name: CONFIG.SUPER_ADMIN_NAME, email: CONFIG.SUPER_ADMIN_EMAIL };
  const chair = all.filter(function (a) { return bodiesOf_(a).indexOf('idc_chair') >= 0; }).map(pub);
  const mine = lc_(me.email);
  const my = readAll_('IdcCases').filter(function (c) { return lc_(c.reported_by) === mine || (lc_(c.subject_email) === mine && truthy_(c.notified)); })
    .map(function (c) { return { id: c.id, title: c.title, status: c.status, role: lc_(c.reported_by) === mine ? 'reported' : 'concerned', created_at: c.created_at }; }).reverse();
  return { ok: true, organizer: pub(sup),
    registrars: all.filter(function (a) { return truthy_(a.registrar) && a.role !== 'super'; }).map(pub),
    advisors: all.filter(function (a) { return bodiesOf_(a).indexOf('senior_advisor') >= 0; }).map(pub),
    idc: { chair: chair[0] || null, members: all.filter(function (a) { return bodiesOf_(a).indexOf('idc_member') >= 0 && bodiesOf_(a).indexOf('idc_chair') < 0; }).map(pub) },
    core: all.filter(function (a) { return a.role === 'lead'; }).map(pub),
    qac: { secretary: all.filter(function (a) { return bodiesOf_(a).indexOf('qac_secretary') >= 0; }).map(function (a) { return { name: a.name || a.email, email: truthy_(a.external) ? '' : lc_(a.email), team: a.qac_expertise || (truthy_(a.external) ? 'External member' : '') }; })[0] || null,
      members: all.filter(function (a) { return bodiesOf_(a).indexOf('qac_member') >= 0; }).map(function (a) { return { name: a.name || a.email, email: truthy_(a.external) ? '' : lc_(a.email), team: a.qac_expertise || (truthy_(a.external) ? 'External member' : '') }; }) },
    council: council_().length, kinds: IDC_KINDS, myCases: my,
    me: { advisor: isAdvisor_(me), idc: isIdc_(me), chair: isIdcChair_(me), super: me.role === 'super' } };
}
function bodiesSet_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer appoints Senior Advisors and the IDC (24.1.1, 13B.2.3).');
  const a = findAdmin_(b.email); if (!a) throw new Error('Not a portal user.');
  if (a.role === 'super') throw new Error('The Organizer cannot hold these offices.');
  const want = [].concat(b.bodies || []).filter(function (x) { return ['senior_advisor', 'idc_chair', 'idc_member'].indexOf(x) >= 0; });
  if (want.indexOf('idc_chair') >= 0 && want.indexOf('senior_advisor') < 0) throw new Error('The IDC Chairperson must be appointed from among the Senior Advisors (24.2.1). Tick Senior Advisor too.');
  if (want.indexOf('idc_chair') >= 0 && want.indexOf('idc_member') >= 0) want.splice(want.indexOf('idc_member'), 1);
  const others = readAll_('Admins').filter(function (x) { return lc_(x.email) !== lc_(a.email) && truthy_(x.active); });
  if (want.indexOf('idc_chair') >= 0) {
    const cur = others.filter(function (x) { return bodiesOf_(x).indexOf('idc_chair') >= 0; })[0];
    if (cur) {
      if (readAll_('Motions').some(function (m) { return m.type === 'review' && ['Threshold met', 'Referred to IDC Chairperson'].indexOf(m.status) >= 0; }))
        throw new Error('A Constitutional Review is pending, so the IDC Chairperson cannot be replaced now (27.3).');
      updateRow_('Admins', lc_(cur.email), { bodies: bodiesOf_(cur).filter(function (x) { return x !== 'idc_chair'; }).join(',') });
    }
  }
  if (want.indexOf('idc_member') >= 0 && others.filter(function (x) { return bodiesOf_(x).indexOf('idc_member') >= 0; }).length >= 5)
    throw new Error('The IDC already has five members (13B.2.1(b)). Remove one first.');
  if (bodiesOf_(a).indexOf('idc_chair') >= 0 && want.indexOf('idc_chair') < 0 &&
      readAll_('Motions').some(function (m) { return m.type === 'review' && ['Threshold met', 'Referred to IDC Chairperson'].indexOf(m.status) >= 0; }))
    throw new Error('A Constitutional Review is pending, so the IDC Chairperson cannot be removed now (27.3).');
  updateRow_('Admins', lc_(a.email), { bodies: want.concat(bodiesOf_(a).filter(function (x) { return /^qac_/.test(x); })).join(',') });   // QAC offices are set from the QAC page
  audit_(me.email, 'governance offices', lc_(a.email) + ' → ' + (want.join(',') || 'none'));
  const labels = { senior_advisor: 'Senior Advisor to the Organizer', idc_chair: 'Chairperson of the Internal Disciplinary Committee', idc_member: 'Member of the Internal Disciplinary Committee' };
  const added = want.filter(function (x) { return bodiesOf_(a).indexOf(x) < 0; });
  if (added.length) mail_(a.email, 'Your appointment at TEDxThaltej Youth', emailShell_('Congratulations, ' + esc_(String(a.name).split(' ')[0]) + '.',
    '<p>The Organizer has appointed you as <b>' + added.map(function (x) { return labels[x]; }).join('</b> and <b>') + '</b> under the TEDxThaltej Charter.</p><p>Your tools are in the Team Portal under <b>Governance bodies</b>.</p><p><a href="' + CONFIG.ADMIN_URL + '#bodies">Open the Team Portal</a></p>'));
  return { ok: true };
}

// ───────── IDC cases ─────────
function idcCaseFor_(me, id) {
  const c = findRow_('IdcCases', id); if (!c) throw new Error('Case not found.');
  const mine = lc_(me.email), role = me.role === 'super' ? 'organizer' : isIdc_(me) ? 'idc' : lc_(c.subject_email) === mine && truthy_(c.notified) ? 'concerned' : lc_(c.reported_by) === mine ? 'reporter' : '';
  if (!role) throw new Error('Case not found.');
  if (role === 'idc' && String(c.recused || '').split(',').indexOf(mine) >= 0 && !isIdcChair_(me)) return { c: c, role: 'recused' };
  return { c: c, role: role };
}
function idcNotifyIdc_(subject, html, exceptEmail) {
  idcPeople_().concat([{ email: CONFIG.SUPER_ADMIN_EMAIL }]).forEach(function (p) { if (lc_(p.email) !== lc_(exceptEmail || '')) try { mail_(p.email, subject, emailShell_('Internal Disciplinary Committee', html + '<p><a href="' + CONFIG.ADMIN_URL + '#idc">Open the IDC case file</a></p>')); } catch (e) { } });
}
function idcReport_(me, b) {
  const f = clean_(b, { title: 160, kind: 60, subject_email: 120, allegations: 6000, links: 600 });
  if (!f.title || f.allegations.length < 30) throw new Error('Give a title and describe what happened (a few sentences, with dates).');
  if (IDC_KINDS.indexOf(f.kind) < 0) f.kind = 'Other';
  if (f.subject_email && !isEmail_(f.subject_email)) throw new Error('Check the email of the person concerned.');
  if (lc_(f.subject_email) === lc_(me.email)) throw new Error('You cannot report yourself.');
  rateLimit_('idcrep_' + lc_(me.email), 5, 86400);
  const rec = { id: seq_('IdcCases', 'IDC'), title: f.title, kind: f.kind, source: me.role === 'super' ? 'Organizer referral' : 'Member report', reported_by: lc_(me.email),
    subject_email: lc_(f.subject_email), allegations: f.allegations, links: f.links, status: 'Received', notified: 'FALSE', hearing_at: '', hearing_link: '', findings: '', recommendation: '',
    decision: '', decided_by: '', decided_at: '', recused: '', motion_id: '', created_at: now_(), updated_at: now_() };
  appendRow_('IdcCases', rec);
  idcNotifyIdc_('New IDC matter: ' + rec.id, '<p>A new matter has been received: <b>' + esc_(rec.title) + '</b> (' + esc_(rec.kind) + ').</p><p>Details are in the confidential case file.</p>', me.email);
  audit_(me.email, 'IDC report', rec.id);
  return { ok: true, id: rec.id };
}
function idcFromReview_(m) {   // called when a Constitutional Review is verified
  if (readAll_('IdcCases').some(function (c) { return c.motion_id === m.id; })) return;
  appendRow_('IdcCases', { id: seq_('IdcCases', 'IDC'), title: 'Constitutional Review: ' + m.title, kind: 'Constitutional review', source: 'Council motion ' + m.id, reported_by: '',
    subject_email: '', allegations: String(m.matter || '') + (m.facts ? '\n\nFactual basis:\n' + m.facts : '') + (m.prior_hearing ? '\n\nPrior hearing:\n' + m.prior_hearing : ''), links: '',
    status: 'Received', notified: 'FALSE', recused: '', motion_id: m.id, created_at: now_(), updated_at: now_() });
}
function idcList_(me) {
  if (me.role !== 'super' && !isIdc_(me)) throw new Error('Only the IDC and the Organizer can open case files.');
  const people = {}; readAll_('Admins').forEach(function (a) { people[lc_(a.email)] = a.name; });
  return { ok: true, statuses: IDC_STATUSES, chair: isIdcChair_(me), super: me.role === 'super',
    rows: readAll_('IdcCases').map(function (c) { return { id: c.id, title: c.title, kind: c.kind, source: c.source, status: c.status, subject: people[lc_(c.subject_email)] || c.subject_email,
      recused: String(c.recused || '').split(',').indexOf(lc_(me.email)) >= 0, hearing_at: c.hearing_at, created_at: c.created_at, updated_at: c.updated_at }; }).reverse() };
}
function idcCase_(me, id) {
  const x = idcCaseFor_(me, id), c = x.c, role = x.role;
  if (role === 'recused') return { ok: true, recused: true, case: { id: c.id, title: c.title, status: c.status } };
  const people = {}; readAll_('Admins').forEach(function (a) { people[lc_(a.email)] = a.name; });
  const chans = role === 'organizer' || role === 'idc' ? ['idc', 'concerned', 'reporter'] : [role];
  const msgs = readAll_('IdcMsgs').filter(function (m) { return m.case_id === c.id && chans.indexOf(m.channel) >= 0; })
    .map(function (m) { return { channel: m.channel, from: people[lc_(m.from_email)] || m.from_email, mine: lc_(m.from_email) === lc_(me.email), body: m.body, at: m.created_at }; });
  const full = role === 'organizer' || role === 'idc';
  return { ok: true, role: role, chair: isIdcChair_(me), statuses: IDC_STATUSES,
    case: { id: c.id, title: c.title, kind: c.kind, source: c.source, status: c.status, created_at: c.created_at,
      allegations: full || role === 'concerned' ? c.allegations : '', links: full ? c.links : '',
      reported_by: full ? (people[lc_(c.reported_by)] || c.reported_by || '') : '', subject: people[lc_(c.subject_email)] || c.subject_email, subject_email: full ? c.subject_email : '',
      notified: truthy_(c.notified), hearing_at: c.hearing_at, hearing_link: role === 'reporter' ? '' : c.hearing_link,
      findings: full ? c.findings : '', recommendation: full ? c.recommendation : '', decision: c.status === 'Decided' || c.status === 'Dismissed' || full ? c.decision : '',
      recused: full ? String(c.recused || '').split(',').filter(String).map(function (e) { return people[e] || e; }) : [], motion_id: c.motion_id }, messages: msgs };
}
function idcPost_(me, b) {
  const x = idcCaseFor_(me, b.id), c = x.c;
  if (x.role === 'recused') throw new Error('You have recused yourself from this matter.');
  const body = String(b.body || '').trim().slice(0, 6000); if (!body) throw new Error('Write a message.');
  let ch = String(b.channel || '');
  if (x.role === 'concerned' || x.role === 'reporter') ch = x.role;
  if (['idc', 'concerned', 'reporter'].indexOf(ch) < 0) throw new Error('Choose who this message is for.');
  if (ch === 'concerned' && !truthy_(c.notified)) throw new Error('Inform the concerned person of the allegations first.');
  if (ch === 'reporter' && !c.reported_by) throw new Error('This matter has no reporter.');
  appendRow_('IdcMsgs', { id: newId_('IM'), case_id: c.id, channel: ch, from_email: lc_(me.email), body: body, created_at: now_() });
  updateRow_('IdcCases', c.id, { updated_at: now_() });
  if (x.role === 'concerned' || x.role === 'reporter') idcNotifyIdc_('IDC ' + c.id + ': new reply', '<p>' + (x.role === 'concerned' ? 'The concerned person' : 'The person who reported it') + ' replied in <b>' + esc_(c.id) + '</b>.</p>');
  else if (ch !== 'idc') { const to = ch === 'concerned' ? c.subject_email : c.reported_by;
    mail_(to, 'Message from the Internal Disciplinary Committee (' + c.id + ')', emailShell_('Internal Disciplinary Committee', '<p>You have a new message about matter <b>' + esc_(c.id) + '</b>. It is confidential; please read and reply in the Team Portal.</p><p><a href="' + CONFIG.ADMIN_URL + '#bodies">Open it</a></p>')); }
  return { ok: true };
}
function idcAct_(me, b) {
  const x = idcCaseFor_(me, b.id), c = x.c, mine = lc_(me.email);
  if (x.role !== 'organizer' && x.role !== 'idc' && x.role !== 'recused') throw new Error('Only the IDC can do this.');
  const chairOrOrg = isIdcChair_(me) || me.role === 'super';
  const up = { updated_at: now_() }; let what = b.op;
  if (b.op === 'recuse') { const r = String(c.recused || '').split(',').filter(String); const i = r.indexOf(mine); if (i >= 0) r.splice(i, 1); else r.push(mine); up.recused = r.join(','); }
  else if (b.op === 'status') { if (!chairOrOrg) throw new Error('Only the Chairperson manages the case.'); if (['Received', 'Under inquiry', 'Closed'].indexOf(b.status) < 0) throw new Error('Use the specific buttons for hearings, findings and decisions.'); up.status = b.status; }
  else if (b.op === 'notify') {
    if (!chairOrOrg) throw new Error('Only the Chairperson informs the concerned person.');
    if (!isEmail_(c.subject_email)) throw new Error('Add the concerned person’s email first.');
    up.notified = 'TRUE'; if (c.status === 'Received') up.status = 'Under inquiry';
    mail_(c.subject_email, 'Notice from the Internal Disciplinary Committee (' + c.id + ')', emailShell_('Notice of a matter under inquiry',
      '<p>The Internal Disciplinary Committee of TEDxThaltej Youth has received a matter concerning you: <b>' + esc_(c.title) + '</b>.</p>' +
      '<p>Under Article 13B.7.2 of the Charter you are informed of the allegations and have the opportunity to respond. You can read them and reply privately in the Team Portal.</p>' +
      '<p>The proceedings are confidential and fair. No decision has been made.</p><p><a href="' + CONFIG.ADMIN_URL + '#bodies">Read and respond</a></p>'));
  }
  else if (b.op === 'subject') { if (!chairOrOrg) throw new Error('Only the Chairperson can change this.'); const e = lc_(b.email || ''); if (e && !isEmail_(e)) throw new Error('Check the email.'); up.subject_email = e; up.notified = 'FALSE'; }
  else if (b.op === 'hearing') {
    if (!chairOrOrg) throw new Error('Only the Chairperson schedules hearings.');
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(b.at || ''))) throw new Error('Choose the date and time.');
    const start = new Date(b.at + ':00+05:30'), end = new Date(start.getTime() + (parseInt(b.minutes, 10) || 45) * 60000);
    const guests = idcPeople_().map(function (p) { return lc_(p.email); }).filter(function (e) { return String(c.recused || '').split(',').indexOf(e) < 0; });
    if (truthy_(c.notified) && c.subject_email) guests.push(lc_(c.subject_email));
    let cal = { meet: '' }; try { cal = recCalendar_('IDC hearing · ' + c.id, 'Confidential hearing of the Internal Disciplinary Committee.', start, end, guests, ''); } catch (e) { Logger.log(e); }
    up.hearing_at = b.at; up.hearing_link = cal.meet || String(b.place || '').slice(0, 300); up.status = 'Hearing scheduled';
  }
  else if (b.op === 'findings') {
    if (!chairOrOrg) throw new Error('The Chairperson submits findings for the Committee.');
    const fnd = String(b.findings || '').trim(), rec = String(b.recommendation || '').trim();
    if (fnd.length < 30 || !rec) throw new Error('Write the findings and the recommended action (13B.5.3).');
    if (c.subject_email && !truthy_(c.notified)) throw new Error('The concerned person must be informed and heard before findings (13B.7.2).');
    up.findings = fnd.slice(0, 10000); up.recommendation = rec.slice(0, 3000); up.status = 'Findings submitted';
    mail_(CONFIG.SUPER_ADMIN_EMAIL, 'IDC findings submitted: ' + c.id, emailShell_('Findings for your decision', '<p>The IDC has submitted findings and a recommendation on <b>' + esc_(c.title) + '</b>. Under 13B.6.3 the final decision is yours.</p><p><a href="' + CONFIG.ADMIN_URL + '#idc">Review and decide</a></p>'));
  }
  else if (b.op === 'decide') {
    if (me.role !== 'super') throw new Error('Final decisions are made by the Organizer (13B.6.3).');
    const d = String(b.decision || '').trim(); if (!d) throw new Error('Record the decision.');
    up.decision = d.slice(0, 4000); up.decided_by = mine; up.decided_at = now_(); up.status = b.dismiss ? 'Dismissed' : 'Decided';
    [c.subject_email && truthy_(c.notified) ? c.subject_email : '', c.reported_by].filter(isEmail_).forEach(function (e) {
      mail_(e, 'Outcome of IDC matter ' + c.id, emailShell_('Outcome', '<p>The matter <b>' + esc_(c.title) + '</b> has been ' + (b.dismiss ? 'dismissed' : 'decided') + '. You can read the outcome in the Team Portal.</p><p><a href="' + CONFIG.ADMIN_URL + '#bodies">Open</a></p>')); });
    idcNotifyIdc_('IDC ' + c.id + ' decided', '<p>The Organizer recorded a decision on <b>' + esc_(c.title) + '</b>.</p>', me.email);
  }
  else throw new Error('Unknown action.');
  updateRow_('IdcCases', c.id, up);
  appendRow_('IdcMsgs', { id: newId_('IM'), case_id: c.id, channel: 'idc', from_email: 'system', body: me.name + ': ' + ({ recuse: 'recusal changed', status: 'status → ' + b.status, notify: 'informed the concerned person of the allegations', subject: 'changed the concerned person', hearing: 'scheduled a hearing for ' + String(b.at).replace('T', ' '), findings: 'submitted findings to the Organizer', decide: (b.dismiss ? 'dismissed the matter' : 'recorded the decision') })[what], created_at: now_() });
  audit_(me.email, 'IDC ' + what, c.id);
  return { ok: true };
}

// ───────── Senior Advisors: consultations ─────────
function advMust_(me) { if (me.role !== 'super' && !isAdvisor_(me)) throw new Error('Only Senior Advisors and the Organizer can open consultations.'); }
function advList_(me) {
  advMust_(me);
  const people = {}; readAll_('Admins').forEach(function (a) { people[lc_(a.email)] = a.name; });
  const reps = readAll_('AdviceReplies');
  return { ok: true, super: me.role === 'super', rows: readAll_('AdviceAsks').map(function (q) {
    const r = reps.filter(function (x) { return x.ask_id === q.id; });
    return { id: q.id, title: q.title, question: q.question, due: q.due, status: q.status, summary: q.summary, created_at: q.created_at,
      replies: r.map(function (x) { return { by: people[lc_(x.email)] || x.email, mine: lc_(x.email) === lc_(me.email), body: x.body, at: x.created_at }; }) };
  }).reverse(), advisors: readAll_('Admins').filter(function (a) { return truthy_(a.active) && bodiesOf_(a).indexOf('senior_advisor') >= 0; }).map(function (a) { return a.name; }) };
}
function advAsk_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer asks for advice.');
  const f = clean_(b, { title: 160, question: 6000, due: 10 }); if (!f.title || !f.question) throw new Error('Give a title and the question.');
  const rec = { id: seq_('AdviceAsks', 'ADV'), title: f.title, question: f.question, due: f.due, status: 'Open', summary: '', created_at: now_() };
  appendRow_('AdviceAsks', rec);
  readAll_('Admins').filter(function (a) { return truthy_(a.active) && bodiesOf_(a).indexOf('senior_advisor') >= 0; }).forEach(function (a) {
    mail_(a.email, 'The Organizer asks for your advice: ' + f.title, emailShell_('A consultation for Senior Advisors', '<p><b>' + esc_(f.title) + '</b>' + (f.due ? ' · advice by ' + esc_(f.due) : '') + '</p><p><a href="' + CONFIG.ADMIN_URL + '#advisory">Read and reply</a></p>')); });
  audit_(me.email, 'consultation opened', rec.id);
  return { ok: true, id: rec.id };
}
function advReply_(me, b) {
  if (!isAdvisor_(me)) throw new Error('Only Senior Advisors reply to consultations.');
  const q = findRow_('AdviceAsks', b.id); if (!q || q.status !== 'Open') throw new Error('This consultation is closed.');
  const body = String(b.body || '').trim().slice(0, 8000); if (!body) throw new Error('Write your advice.');
  appendRow_('AdviceReplies', { id: newId_('AR'), ask_id: q.id, email: lc_(me.email), body: body, created_at: now_() });
  mail_(CONFIG.SUPER_ADMIN_EMAIL, 'Advice received: ' + q.title, emailShell_('Advice received', '<p>' + esc_(me.name) + ' replied to <b>' + esc_(q.title) + '</b>.</p><p><a href="' + CONFIG.ADMIN_URL + '#advisory">Read it</a></p>'));
  return { ok: true };
}
function advClose_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer closes consultations.');
  updateRow_('AdviceAsks', b.id, { status: 'Closed', summary: String(b.summary || '').slice(0, 4000) });
  return { ok: true };
}
