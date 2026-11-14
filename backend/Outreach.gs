/**
 * Sponsorship outreach.
 *  • Companies: name, contact person, email, phone, website, industry, city, target tier, owner, status, notes, next step.
 *    Add one by one or paste a list (CSV).
 *  • First email from a template (or written/edited per company, with an optional AI draft from public company details only).
 *    Every outreach email carries a TTRIS reference, CCs the TTRIS mailbox and asks replies to go there.
 *  • Automatic follow-ups: up to sp_followups (0–3, default 3) gentle reminders, sp_gap_days apart (default 4), sent on weekdays
 *    between 10 am and 6 pm IST, in the same thread. They stop as soon as the company replies (TTRIS reads the reply),
 *    when someone marks it replied/meeting/declined, or when the email bounces. After the last one: "No response".
 *  • Daily cap (sp_daily_cap, default 40) protects the domain from looking like spam.
 *  Access: the Organizer, the Sponsorship team (a department whose name contains "sponsor"/"partnership"), and anyone given
 *  the "outreach" page. AI never sees amounts, notes or replies.
 */
const SP_STATUSES = ['Prospect', 'Contacted', 'Replied', 'Meeting', 'Proposal sent', 'Negotiating', 'Confirmed', 'Declined', 'No response', 'Bounced', 'On hold'];
const SP_STOP = ['Replied', 'Meeting', 'Proposal sent', 'Negotiating', 'Confirmed', 'Declined', 'Bounced', 'On hold', 'No response'];
const SP_TIERS = ['Title', 'Platinum', 'Gold', 'Silver', 'Partner', 'In-kind', 'Media'];
const SP_TPL = {
  subject: 'Partnering with TEDxThaltej Youth 2027 · {company}',
  first: 'Dear {first},\n\nI am {sender} from the {team} team at **TEDxThaltej Youth**, an independently organised TEDx event in Ahmedabad led by young people. Our 2027 edition brings together speakers, performers and an audience of students, parents, educators and professionals from across the city.\n\n' +
    'We believe **{company}** would be a wonderful partner, and we would love to explore working together, whether through sponsorship, an in-kind partnership or a programme collaboration. Our partners are seen on stage, online and across our community, and connect meaningfully with Ahmedabad\'s young changemakers.\n\n' +
    'Would you be open to a short call this week or next? I would be happy to share our partnership deck.\n\nWarm regards,\n\n{sender}\n{team}, TEDxThaltej Youth',
  f1: 'Dear {first},\n\nI am following up on my note about partnering with TEDxThaltej Youth 2027. I would be glad to share our partnership deck or set up a 15-minute call at a time that suits you.\n\nWarm regards,\n\n{sender}',
  f2: 'Dear {first},\n\nJust bringing this back to the top of your inbox. We have a few ways to partner, from sponsorship to in-kind support, and I think one could be a good fit for {company}. If someone else on your team looks after partnerships, I would be grateful if you could point me to them.\n\nWarm regards,\n\n{sender}',
  f3: 'Dear {first},\n\nThis is my last note, so I do not crowd your inbox. If partnering with TEDxThaltej Youth interests you now or later in the year, simply reply to this email and we will pick it up.\n\nThank you for your time,\n\n{sender}'
};

function spConf_() {
  const s = settingsMap_(), n = function (k, d, lo, hi) { const v = parseInt(s[k], 10); return isNaN(v) ? d : Math.max(lo, Math.min(hi, v)); };
  return { followups: n('sp_followups', 3, 0, 3), gap: n('sp_gap_days', 4, 1, 30), cap: n('sp_daily_cap', 40, 1, 200), from_local: /^[a-z0-9._-]{1,40}$/.test(String(s.sp_from_local || '')) ? s.sp_from_local : 'partnerships',
    subject: s.sp_tpl_subject || SP_TPL.subject, first: s.sp_tpl_first || SP_TPL.first, f1: s.sp_tpl_f1 || SP_TPL.f1, f2: s.sp_tpl_f2 || SP_TPL.f2, f3: s.sp_tpl_f3 || SP_TPL.f3 };
}
function spDept_() { return readAll_('Departments').filter(function (d) { return /sponsor|partnership/i.test(d.name); }).map(function (d) { return d.id; }); }
function spCan_(me, write) {
  if (me.role === 'super') return true;
  const sc = me.scopeList || [], v = me.scopeView || [];
  if (sc.indexOf('outreach') >= 0) return !write || v.indexOf('outreach') < 0;
  return spDept_().some(function (d) { return myDepts_(me).indexOf(d) >= 0; });
}
function spMust_(me, write) { if (!spCan_(me, write)) throw new Error(write ? 'You can view outreach but not change it.' : 'Only the Sponsorship team and the Organizer can open sponsor outreach.'); }
function spFill_(tpl, s, sender) {
  const first = String(s.contact_name || '').trim().split(/\s+/)[0] || 'Sir/Madam';
  const team = (readAll_('Departments').filter(function (d) { return spDept_().indexOf(d.id) >= 0; })[0] || {}).name || 'Partnerships';
  return String(tpl).replace(/\{first\}/g, first).replace(/\{name\}/g, s.contact_name || first).replace(/\{company\}/g, s.company || '').replace(/\{role\}/g, s.contact_role || '')
    .replace(/\{sender\}/g, sender.name || 'TEDxThaltej Youth').replace(/\{team\}/g, team);
}
function spSentToday_() { const d = day_(); return readAll_('TtrisMsgs').filter(function (m) { return m.kind === 'sponsor' && m.direction === 'out' && String(m.received_at).slice(0, 10) === d; }).length; }
function spView_(s, names) {
  return { id: s.id, company: s.company, industry: s.industry, website: s.website, city: s.city, contact_name: s.contact_name, contact_role: s.contact_role, email: s.email, phone: s.phone,
    linkedin: s.linkedin, tier: s.tier, owner: names[lc_(s.owner_email)] || s.owner_email, owner_email: lc_(s.owner_email), status: s.status, notes: s.notes, next_step: s.next_step, next_date: s.next_date,
    followups_sent: +s.followups_sent || 0, next_followup_at: s.status === 'Contacted' ? s.next_followup_at : '', first_sent_at: s.first_sent_at, last_contact_at: s.last_contact_at,
    replied_at: s.replied_at, ref: s.ref, created_at: s.created_at };
}

function spBoot_(me) {
  spMust_(me);
  const names = {}; readAll_('Admins').forEach(function (a) { names[lc_(a.email)] = a.name; });
  const rows = readAll_('Outreach').map(function (s) { return spView_(s, names); }).reverse();
  const c = spConf_(), t = ttrisConf_();
  const team = readAll_('Admins').filter(function (a) { return truthy_(a.active) && !truthy_(a.external) && (a.role === 'super' || spDept_().some(function (d) { return myDepts_(a).indexOf(d) >= 0; }) || scopesOf_(a).list.indexOf('outreach') >= 0); })
    .map(function (a) { return { email: lc_(a.email), name: a.name }; });
  const by = {}; SP_STATUSES.forEach(function (x) { by[x] = 0; }); rows.forEach(function (r) { by[r.status] = (by[r.status] || 0) + 1; });
  return { ok: true, rows: rows, statuses: SP_STATUSES, tiers: SP_TIERS, team: team, counts: by, canEdit: spCan_(me, true), super: me.role === 'super',
    conf: c, sentToday: spSentToday_(), ttris: { email: t.email, connected: t.connected }, aiOn: !!(PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || PropertiesService.getScriptProperties().getProperty('GROQ_API_KEY')) };
}
function spClean_(b) {
  const f = clean_(b, { company: 120, industry: 80, website: 200, city: 60, contact_name: 100, contact_role: 80, email: 120, phone: 30, linkedin: 200, tier: 20, notes: 3000, next_step: 200, next_date: 10, owner_email: 120 });
  if (f.email) { f.email = lc_(f.email); if (!isEmail_(f.email)) throw new Error('“' + f.email + '” is not a valid email.'); }
  if (f.tier && SP_TIERS.indexOf(f.tier) < 0) f.tier = '';
  if (f.website && !/^https?:\/\//i.test(f.website)) f.website = 'https://' + f.website;
  return f;
}
function spSave_(me, b) {
  spMust_(me, true);
  const f = spClean_(b);
  if (!f.company) throw new Error('Give the company name.');
  const dup = readAll_('Outreach').filter(function (s) { return s.id !== b.id && ((f.email && lc_(s.email) === f.email) || lc_(s.company) === lc_(f.company)); })[0];
  if (dup) throw new Error(dup.company + ' is already in the list (' + dup.id + ', owner ' + dup.owner_email + ').');
  if (b.id) {
    const s = findRow_('Outreach', b.id); if (!s) throw new Error('Not found.');
    if (b.status && SP_STATUSES.indexOf(b.status) >= 0 && b.status !== s.status) { f.status = b.status; if (SP_STOP.indexOf(b.status) >= 0) f.next_followup_at = ''; if (b.status === 'Replied' && !s.replied_at) f.replied_at = now_(); }
    if (f.owner_email && !findAdmin_(f.owner_email)) delete f.owner_email;
    f.updated_at = now_(); updateRow_('Outreach', s.id, f);
    return { ok: true, id: s.id };
  }
  const rec = Object.assign({ id: seq_('Outreach', 'SP'), status: 'Prospect', owner_email: lc_(f.owner_email && findAdmin_(f.owner_email) ? f.owner_email : me.email), followups_sent: '0', next_followup_at: '', first_sent_at: '',
    last_contact_at: '', replied_at: '', last_subject: '', ref: '', created_by: lc_(me.email), created_at: now_(), updated_at: now_() }, f);
  rec.owner_email = lc_(f.owner_email && findAdmin_(f.owner_email) ? f.owner_email : me.email);
  appendRow_('Outreach', rec);
  audit_(me.email, 'outreach add', rec.id + ' ' + rec.company);
  return { ok: true, id: rec.id };
}
function spImport_(me, b) {
  spMust_(me, true);
  const rows = [].concat(b.rows || []).slice(0, 300); if (!rows.length) throw new Error('Nothing to import.');
  const have = readAll_('Outreach'), em = {}, co = {};
  have.forEach(function (s) { if (s.email) em[lc_(s.email)] = 1; co[lc_(s.company)] = 1; });
  let added = 0; const skipped = [];
  rows.forEach(function (r, i) {
    let f; try { f = spClean_(r); } catch (e) { skipped.push((i + 2) + ': ' + e.message); return; }
    if (!f.company) { skipped.push((i + 2) + ': no company'); return; }
    if ((f.email && em[f.email]) || co[lc_(f.company)]) { skipped.push((i + 2) + ': ' + f.company + ' already listed'); return; }
    appendRow_('Outreach', Object.assign({ id: seq_('Outreach', 'SP'), status: 'Prospect', followups_sent: '0', next_followup_at: '', first_sent_at: '', last_contact_at: '', replied_at: '', last_subject: '', ref: '',
      created_by: lc_(me.email), created_at: now_(), updated_at: now_() }, f, { owner_email: lc_(me.email) }));
    if (f.email) em[f.email] = 1; co[lc_(f.company)] = 1; added++;
  });
  audit_(me.email, 'outreach import', added + ' added');
  return { ok: true, added: added, skipped: skipped };
}
function spDelete_(me, b) {
  spMust_(me, true);
  const s = findRow_('Outreach', b.id); if (!s) throw new Error('Not found.');
  if (s.first_sent_at && me.role !== 'super') throw new Error('This company has been emailed, so only the Organizer can remove it. Set it to "On hold" instead.');
  deleteRow_('Outreach', s.id); audit_(me.email, 'outreach delete', s.id + ' ' + s.company);
  return { ok: true };
}
/** Preview the first email (template filled in) */
function spDraft_(me, b) {
  spMust_(me);
  const s = findRow_('Outreach', b.id); if (!s) throw new Error('Not found.');
  const c = spConf_(), sender = findAdmin_(me.email) || me;
  return { ok: true, to: s.email, subject: spFill_(c.subject, s, sender), body: spFill_(c.first, s, sender), followups: c.followups, gap: c.gap };
}
function spAiDraft_(me, b) {
  spMust_(me, true);
  const s = findRow_('Outreach', b.id); if (!s) throw new Error('Not found.');
  rateLimit_('spai_' + lc_(me.email), 30, 3600);
  const sender = findAdmin_(me.email) || me;
  const r = aiRun_('You write the first sponsorship outreach email for TEDxThaltej Youth, an independently organised, youth-led TEDx event in Ahmedabad, India (2027 edition). ' +
    'Write to the company below. Be warm, specific and brief (under 170 words), professional Indian English, no hype, no invented facts, no amounts, no promises about speakers. ' +
    'Explain in one sentence why this company fits (based only on what is given), suggest sponsorship, in-kind or programme partnership, and ask for a short call. ' +
    'Use **bold** sparingly. Sign off with the sender\'s name. Return JSON: {"subject":"...","body":"..."} where body uses blank lines between paragraphs.\n\n' +
    'COMPANY: ' + clipS_(s.company, 120) + '\nINDUSTRY: ' + clipS_(s.industry, 80) + '\nCITY: ' + clipS_(s.city, 60) + '\nWEBSITE: ' + clipS_(s.website, 120) + '\nCONTACT: ' + clipS_(s.contact_name, 80) + ' (' + clipS_(s.contact_role, 60) + ')' +
    '\nSENDER: ' + clipS_(sender.name, 80));
  const o = r.out || {};
  if (!o.body) throw new Error('The AI did not return a draft. Try again or use the template.');
  return { ok: true, subject: clipS_(o.subject || spFill_(spConf_().subject, s, sender), 180), body: String(o.body).slice(0, 4000) };
}
function spSend_(me, b) {
  spMust_(me, true);
  const s = findRow_('Outreach', b.id); if (!s) throw new Error('Not found.');
  if (!isEmail_(s.email)) throw new Error('Add the contact’s email first.');
  if (s.first_sent_at && !b.again) throw new Error('The first email was already sent on ' + String(s.first_sent_at).slice(0, 10) + '. Reply from the thread instead.');
  const c = spConf_();
  if (spSentToday_() >= c.cap) throw new Error('Today’s outreach limit (' + c.cap + ' emails) is reached, to keep our domain out of spam folders. Try tomorrow.');
  const sender = findAdmin_(me.email) || me;
  const subject = String(b.subject || spFill_(c.subject, s, sender)).trim().slice(0, 180), body = String(b.body || spFill_(c.first, s, sender)).trim().slice(0, 8000);
  if (body.length < 40) throw new Error('The email is too short.');
  rateLimit_('spsend_' + lc_(me.email), 60, 3600);
  const ref = ttrisSend_({ kind: 'sponsor', rec_id: s.id, to: s.email, subject: subject, title: '', kicker: 'Partnership invitation', preheader: 'An invitation to partner with TEDxThaltej Youth 2027',
    html: bcHtml_(body), fromName: String(sender.name || 'TEDxThaltej Youth').split(' ')[0] + ' · TEDxThaltej Youth', fromLocal: c.from_local, by: me.email, cc: b.cc_me && isEmail_(sender.google_email || sender.email) ? [sender.google_email || sender.email] : [] });
  const next = c.followups > 0 && b.auto !== false ? spNextSlot_(c.gap) : '';
  updateRow_('Outreach', s.id, { status: 'Contacted', ref: ref, first_sent_at: now_(), last_contact_at: now_(), last_subject: subject, followups_sent: '0', next_followup_at: next,
    auto_followups: b.auto === false ? 'FALSE' : 'TRUE', owner_email: s.owner_email || lc_(me.email), updated_at: now_() });
  audit_(me.email, 'outreach sent', s.id + ' → ' + s.email);
  return { ok: true, ref: ref, next_followup_at: next };
}
function spNextSlot_(days) {   // a weekday, 10:30 IST, `days` from now
  const d = new Date(Date.now() + days * 86400000);
  let ist = new Date(d.getTime() + 19800000);
  while (ist.getUTCDay() === 0 || ist.getUTCDay() === 6) ist = new Date(ist.getTime() + 86400000);
  ist.setUTCHours(10, 30, 0, 0);
  return new Date(ist.getTime() - 19800000).toISOString();
}
/** Hourly: send due follow-ups (weekdays, 10:00–18:00 IST). */
function spFollowups_(force) {
  const ist = new Date(Date.now() + 19800000), h = ist.getUTCHours(), wd = ist.getUTCDay();
  if (!force && (wd === 0 || wd === 6 || h < 10 || h >= 18)) return { skipped: 'outside hours' };
  const c = spConf_(), nowIso = new Date().toISOString(); let sent = 0, ended = 0, room = c.cap - spSentToday_();
  readAll_('Outreach').forEach(function (s) {
    if (s.status !== 'Contacted' || !s.next_followup_at || s.next_followup_at > nowIso || s.auto_followups === 'FALSE' || !isEmail_(s.email)) return;
    const done = +s.followups_sent || 0;
    if (done >= c.followups) { updateRow_('Outreach', s.id, { status: 'No response', next_followup_at: '', updated_at: now_() }); spTellOwner_(s, 'No reply from ' + s.company, '<p>We sent <b>' + s.company + '</b> the first email and ' + done + ' follow-up' + (done === 1 ? '' : 's') + ', with no reply. It is now marked <b>No response</b>. You could try a phone call or LinkedIn.</p>'); ended++; return; }
    if (room <= 0) return;
    const owner = findAdmin_(s.owner_email) || { name: 'TEDxThaltej Youth' };
    const tpl = c['f' + (done + 1)] || c.f1, subj = /^re:/i.test(s.last_subject) ? s.last_subject : 'Re: ' + (s.last_subject || spFill_(c.subject, s, owner));
    try {
      ttrisSend_({ kind: 'sponsor', rec_id: s.id, ref: s.ref, to: s.email, subject: subj, title: '', kicker: 'Following up', html: bcHtml_(spFill_(tpl, s, owner)),
        fromName: String(owner.name || 'TEDxThaltej Youth').split(' ')[0] + ' · TEDxThaltej Youth', fromLocal: c.from_local, by: 'system' });
      const n = done + 1;
      updateRow_('Outreach', s.id, { followups_sent: String(n), last_contact_at: now_(), next_followup_at: n < c.followups ? spNextSlot_(c.gap) : spNextSlot_(c.gap), updated_at: now_() });
      sent++; room--;
    } catch (e) { opsLog_('scheduled', 'Outreach follow-up failed for ' + s.id, e.message); }
  });
  return { sent: sent, ended: ended };
}
function spTellOwner_(s, subject, html) {
  const to = [s.owner_email].filter(isEmail_); if (!to.length) return;
  try { mail_(to[0], subject, emailShell_(subject, html + '<p><a href="' + CONFIG.ADMIN_URL + '#outreach">Open Sponsor outreach</a></p>', { kicker: 'Sponsor outreach' }), { noCopy: true }); } catch (e) { Logger.log(e); }
}
/** A reply (or bounce) arrived in TTRIS for this company. */
function spInbound_(t, m) {
  const s = findRow_('Outreach', t.rec_id); if (!s) return;
  if (m.auto === 'auto') return;                                   // out-of-office: keep following up
  if (m.auto === 'bounce') { updateRow_('Outreach', s.id, { status: 'Bounced', next_followup_at: '', updated_at: now_() }); spTellOwner_(s, 'Email to ' + s.company + ' bounced', '<p>Our email to <b>' + esc_(s.email) + '</b> could not be delivered. Please check the address.</p>'); return; }
  const up = { last_contact_at: now_(), next_followup_at: '', updated_at: now_() };
  if (['Prospect', 'Contacted', 'No response'].indexOf(s.status) >= 0) { up.status = 'Replied'; up.replied_at = now_(); }
  updateRow_('Outreach', s.id, up);
  spTellOwner_(s, s.company + ' replied', '<p><b>' + esc_(m.from_name || m.from_email) + '</b> from <b>' + esc_(s.company) + '</b> replied. Follow-ups have stopped.</p><blockquote>' + esc_(String(m.body).split(/\n\s*(On .{5,80} wrote:|From: |-----Original)/)[0].slice(0, 1200)).replace(/\n/g, '<br>') + '</blockquote><p>Reply from the TTRIS Inbox or Sponsor outreach so the thread stays together.</p>');
}
function spThread_(me, b) {
  spMust_(me);
  const s = findRow_('Outreach', b.id); if (!s) throw new Error('Not found.');
  const msgs = s.ref ? readAll_('TtrisMsgs').filter(function (m) { return m.ref === s.ref; }) : [];
  return { ok: true, ref: s.ref, messages: msgs.map(function (m) { return { id: m.id, dir: m.direction, from: m.from_name || m.from_email, to: m.to_email, subject: m.subject, body: m.body, at: m.received_at, auto: m.auto }; }) };
}
function spReply_(me, b) {
  spMust_(me, true);
  const s = findRow_('Outreach', b.id); if (!s || !s.ref) throw new Error('Send the first email before replying.');
  const text = String(b.body || '').trim(); if (text.length < 2) throw new Error('Write your reply.');
  const last = readAll_('TtrisMsgs').filter(function (m) { return m.ref === s.ref && m.direction === 'in' && !m.auto; }).pop();
  const to = last ? last.from_email : s.email, subj = (last && last.subject) || s.last_subject || s.company;
  const sender = findAdmin_(me.email) || me;
  ttrisSend_({ kind: 'sponsor', rec_id: s.id, ref: s.ref, to: to, subject: /^re:/i.test(subj) ? subj : 'Re: ' + subj, title: '', html: bcHtml_(text) + '<p style="margin-top:20px">' + esc_(sender.name) + '<br><span style="color:#6B6455">TEDxThaltej Youth</span></p>',
    fromName: String(sender.name || '').split(' ')[0] + ' · TEDxThaltej Youth', fromLocal: spConf_().from_local, by: me.email });
  updateRow_('Outreach', s.id, { last_contact_at: now_(), next_followup_at: '', updated_at: now_() });
  return { ok: true };
}
function spSettings_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer changes outreach settings and templates.');
  const map = {};
  if (b.followups != null) map.sp_followups = String(Math.max(0, Math.min(3, parseInt(b.followups, 10) || 0)));
  if (b.gap != null) map.sp_gap_days = String(Math.max(1, Math.min(30, parseInt(b.gap, 10) || 4)));
  if (b.cap != null) map.sp_daily_cap = String(Math.max(1, Math.min(200, parseInt(b.cap, 10) || 40)));
  if (b.from_local != null) { const l = String(b.from_local).trim().toLowerCase(); if (!/^[a-z0-9._-]{1,40}$/.test(l)) throw new Error('Sender address: letters, numbers, dots and hyphens only.'); map.sp_from_local = l; }
  ['subject', 'first', 'f1', 'f2', 'f3'].forEach(function (k) { if (b[k] != null) map['sp_tpl_' + k] = String(b[k]).slice(0, 6000); });
  withLock_(function () { const ex = settingsMap_(); Object.keys(map).forEach(function (k) { if (ex[k] === undefined) appendRow_('Settings', { key: k, value: map[k] }); else updateRow_('Settings', k, { value: map[k] }); }); });
  bust_(); audit_(me.email, 'outreach settings', Object.keys(map).join(','));
  return { ok: true, conf: spConf_() };
}
function spHandle_(me, a, b) {
  if (a === 'spBoot') return spBoot_(me);
  if (a === 'spSave') return spSave_(me, b);
  if (a === 'spImport') return spImport_(me, b);
  if (a === 'spDelete') return spDelete_(me, b);
  if (a === 'spDraft') return spDraft_(me, b);
  if (a === 'spAiDraft') return spAiDraft_(me, b);
  if (a === 'spSend') return spSend_(me, b);
  if (a === 'spThread') return spThread_(me, b);
  if (a === 'spReply') return spReply_(me, b);
  if (a === 'spSettings') return spSettings_(me, b);
  if (a === 'spRunNow') { if (me.role !== 'super') throw new Error('Only the Organizer.'); return Object.assign({ ok: true }, spFollowups_(true)); }
  return null;
}
