/**
 * Team recruitment, from application to signed Charter.
 *
 *   /join                     public application form (rec_info, rec_apply)
 *   Team Portal → Recruitment shortlist · schedule interview (Google Calendar + Meet invite) · interview marks · decision
 *   /join#onboard=<token>     selected candidate reads and signs the TEDxThaltej Charter (rec_onboard, rec_sign)
 *
 * Per the Charter: interviews by designated members, Directors or Heads (8.2.3); final selection by the Organizer (8.2.4);
 * nobody is a member until they accept the Charter, the confidentiality agreement and future amendments (8.3);
 * at most two licenses (9.2). Signed copies go to the Office of the Registrar (26.6).
 */
const REC_STATUSES = ['Applied', 'Shortlisted', 'Interview scheduled', 'Interviewed', 'Selected', 'Not selected', 'Awaiting activation', 'Onboarded', 'Withdrawn'];
const REC_DEFAULT_CRITERIA = 'Communication,Understanding of TEDx,Initiative,Role fit,Commitment';
const REC_DEFAULT_LICENSES = 'TEDxThaltej Youth,TEDxThaltej Salon,TEDxThaltej Women';

function recSettings_() {
  const s = settingsMap_();
  const list = function (v, d) { return String(v || d).split(',').map(function (x) { return x.trim(); }).filter(String); };
  return {
    open: truthy_(s.recruit_open === undefined ? 'TRUE' : s.recruit_open),
    cycle: s.recruit_cycle || '2026-27',
    intro: s.recruit_intro || 'Join the young team that builds TEDxThaltej Youth: curation, design, operations, partnerships, media and more.',
    deadline: s.recruit_deadline || '',
    criteria: list(s.recruit_criteria, REC_DEFAULT_CRITERIA),
    licenses: list(s.recruit_licenses, REC_DEFAULT_LICENSES),
    registrar: s.registrar_email || 'registrar@tedxthaltejyouth.in',
    minutes: parseInt(s.recruit_interview_minutes, 10) || 20,
  };
}

// ───────────────────────────── PUBLIC (rec_) ─────────────────────────────
function recruitHandle_(a, d) {
  if (a === 'info') return recInfo_();
  if (a === 'apply') return recApply_(d);
  if (a === 'onboard') return recOnboard_(d.token);
  if (a === 'sign') return recSign_(d);
  if (a === 'team_info') return teamInfo_(d.token);
  if (a === 'team_sign') return teamSign_(d);
  throw new Error('Unknown action');
}

function recInfo_() {
  const r = recSettings_();
  return { ok: true, open: r.open, cycle: r.cycle, intro: r.intro, deadline: r.deadline, licenses: r.licenses,
    departments: readAll_('Departments').sort(by_('sort', true)).map(function (x) { return { id: x.id, name: x.name, description: x.description }; }) };
}

function recApply_(b) {
  if (b.website) return { ok: true }; // honeypot
  const r = recSettings_();
  if (!r.open) throw new Error('Applications are closed right now. Follow us on Instagram to hear when they open.');
  const f = clean_(b, { name: 100, email: 120, phone: 30, age: 3, institution: 150, grade: 40, city: 60, experience: 2000, why: 2000, plan: 2000, portfolio: 300 });
  if (!f.name || !isEmail_(f.email)) throw new Error('Please enter your name and a valid email.');
  if (!/^\+?\d{10,15}$/.test(String(f.phone).replace(/[\s\-().]/g, ''))) throw new Error('Please enter a valid phone number.');
  if (!f.why || f.why.split(/\s+/).length < 15) throw new Error('Tell us a little more about why you want to join (at least 15 words).');
  const deptIds = readAll_('Departments').map(function (x) { return x.id; });
  const prefs = [].concat(b.departments || []).map(String).filter(function (x) { return deptIds.indexOf(x) >= 0; });
  if (!prefs.length) throw new Error('Choose at least one team you would like to join.');
  if (prefs.length > 2) throw new Error('Choose at most two teams.');
  const lic = [].concat(b.licenses || []).map(String).filter(function (x) { return r.licenses.indexOf(x) >= 0; });
  if (lic.length > 2) throw new Error('You can take part in at most two licenses (Charter 9.2).');
  rateLimit_('rec_' + f.email, 3, 3600);
  const dup = readAll_('Applicants').some(function (x) { return lc_(x.email) === f.email && x.cycle === r.cycle && x.status !== 'Withdrawn'; });
  if (dup) throw new Error('You have already applied this cycle. We will email you about the next step.');
  const rec = Object.assign(f, { id: newId_('AP'), cycle: r.cycle, created_at: now_(), departments: prefs.join(','), licenses: lic.join(','),
    status: 'Applied', updated_at: now_() });
  withLock_(function () { appendRow_('Applicants', rec); });
  mail_(f.email, 'We received your application — TEDxThaltej Youth', emailShell_('Thank you, ' + esc_(f.name.split(' ')[0]) + '.',
    '<p>Your application to join the TEDxThaltej Youth team has reached us. Our team reads every application.</p>' +
    '<p>If you are shortlisted, we will email you to set up a short interview.</p><p style="color:#666">Reference: <b>' + rec.id + '</b></p>'));
  audit_(f.email, 'recruit apply', rec.id);
  return { ok: true, id: rec.id };
}

// ───────────────────────────── PORTAL (rec*) ─────────────────────────────
function recCanSee_(me, ap) {
  if (me.role === 'super') return true;
  if (me.scopeList.indexOf('recruit') < 0) return false;
  if (me.department_id && me.role !== 'editor') return String(ap.departments).split(',').some(function (d) { return inDept_(me, d); }) || String(ap.interviewers).indexOf(lc_(me.email)) >= 0;
  return true;
}
function recMust_(me, write) {
  if (me.role === 'super') return;
  if (me.scopeList.indexOf('recruit') < 0) throw new Error('You don’t have access to recruitment.');
  if (write && me.role === 'viewer') throw new Error('You have view-only access to recruitment.');
}
function recGet_(me, id) {
  const ap = findRow_('Applicants', id);
  if (!ap || !recCanSee_(me, ap)) throw new Error('Applicant not found.');
  return ap;
}
function recPublic_(ap) {
  const o = {};
  SCHEMA.Applicants.forEach(function (c) { if (['onboard_hash', 'sig_file_id'].indexOf(c) < 0) o[c] = ap[c]; });
  return o;
}

function recList_(me) {
  recMust_(me, false);
  const r = recSettings_();
  const scores = readAll_('Scores');
  const rows = readAll_('Applicants').filter(function (ap) { return recCanSee_(me, ap); }).reverse().map(function (ap) {
    const o = recPublic_(ap);
    o.my_scored = scores.some(function (s) { return s.applicant_id === ap.id && lc_(s.reviewer) === lc_(me.email); });
    o.score_count = scores.filter(function (s) { return s.applicant_id === ap.id; }).length;
    return o;
  });
  const counts = {}; REC_STATUSES.forEach(function (s) { counts[s] = rows.filter(function (x) { return x.status === s; }).length; });
  return { ok: true, rows: rows, counts: counts, statuses: REC_STATUSES, criteria: r.criteria, cycle: r.cycle, open: r.open, minutes: r.minutes,
    canDecide: me.role === 'super', joinUrl: CONFIG.SITE_URL + '/join',
    departments: readAll_('Departments').map(function (x) { return { id: x.id, name: x.name }; }),
    people: readAll_('Admins').filter(function (a) { return truthy_(a.active); }).map(function (a) { return { email: lc_(a.email), name: a.name, role: a.role }; }) };
}

function recDetail_(me, id) {
  recMust_(me, false);
  const ap = recGet_(me, id);
  const scores = readAll_('Scores').filter(function (s) { return s.applicant_id === id; }).map(function (s) {
    return { reviewer: s.reviewer, marks: safeJson_(s.marks_json, {}), total: s.total, note: s.note, created_at: s.created_at };
  });
  return { ok: true, applicant: recPublic_(ap), scores: scores, mine: scores.filter(function (s) { return lc_(s.reviewer) === lc_(me.email); })[0] || null,
    criteria: recSettings_().criteria, canDecide: me.role === 'super' };
}

function recShortlist_(me, id, note) {
  recMust_(me, true);
  const ap = recGet_(me, id);
  if (['Applied', 'Not selected'].indexOf(ap.status) < 0) throw new Error('Only new applications can be shortlisted.');
  updateRow_('Applicants', id, { status: 'Shortlisted', updated_at: now_() });
  mail_(ap.email, 'You’re shortlisted — TEDxThaltej Youth', emailShell_('Good news, ' + esc_(String(ap.name).split(' ')[0]) + '!',
    '<p>You have been <b>shortlisted</b> to join the TEDxThaltej Youth team.</p>' +
    (note ? '<p>' + esc_(String(note).slice(0, 1000)).replace(/\n/g, '<br>') + '</p>' : '') +
    '<p>Next is a short online interview. You will receive a calendar invitation with a Google Meet link shortly.</p>'));
  audit_(me.email, 'recruit shortlist', id);
  return { ok: true };
}

/** date 'YYYY-MM-DD', time 'HH:MM' (IST), interviewers: emails. Creates or moves a Google Calendar event with a Meet link. */
function recSchedule_(me, b) {
  recMust_(me, true);
  const ap = recGet_(me, b.id);
  if (['Shortlisted', 'Interview scheduled', 'Interviewed'].indexOf(ap.status) < 0) throw new Error('Shortlist the applicant before scheduling an interview.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '') || !/^\d{2}:\d{2}$/.test(b.time || '')) throw new Error('Choose a date and a time.');
  const minutes = Math.min(180, Math.max(10, parseInt(b.minutes, 10) || recSettings_().minutes));
  const start = new Date(b.date + 'T' + b.time + ':00+05:30');
  if (start.getTime() < Date.now() - 60000) throw new Error('That time has already passed.');
  const end = new Date(start.getTime() + minutes * 60000);
  const interviewers = [].concat(b.interviewers || []).map(lc_).filter(isEmail_).slice(0, 10);
  if (!interviewers.length) interviewers.push(lc_(me.email));
  const title = 'TEDxThaltej Youth interview · ' + ap.name;
  const desc = 'Interview for the TEDxThaltej Youth team.\nCandidate: ' + ap.name + ' (' + ap.email + ')\nTeams: ' + recDeptNames_(ap.departments) +
    (b.note ? '\n\n' + String(b.note).slice(0, 1000) : '') + '\n\nInterviewers: please enter marks in the Team Portal → Recruitment.';
  const ev = recCalendar_(title, desc, start, end, [ap.email].concat(interviewers), ap.event_id);
  const when = Utilities.formatDate(start, 'Asia/Kolkata', "EEEE, d MMMM yyyy 'at' h:mm a") + ' IST';
  updateRow_('Applicants', ap.id, { status: 'Interview scheduled', interview_at: b.date + 'T' + b.time, interview_minutes: String(minutes),
    interviewers: interviewers.join(','), meet_link: ev.meet, event_id: ev.id, updated_at: now_() });
  const meetBtn = ev.meet ? '<p><a href="' + ev.meet + '" style="display:inline-block;background:#EB0028;color:#fff;padding:12px 22px;border-radius:30px;text-decoration:none;font-weight:700">Join with Google Meet</a></p><p style="color:#777;font-size:13px">' + ev.meet + '</p>' : '';
  mail_(ap.email, 'Your interview — ' + when, emailShell_('Your interview is scheduled.',
    '<p>Hi ' + esc_(String(ap.name).split(' ')[0]) + ', your interview with the TEDxThaltej Youth team is on <b>' + esc_(when) + '</b> and lasts about ' + minutes + ' minutes.</p>' +
    meetBtn + '<p>A Google Calendar invitation has also been sent to this email. Join from a quiet place with your camera on, and keep 5 minutes spare.</p>' +
    (b.note ? '<p>' + esc_(String(b.note).slice(0, 1000)).replace(/\n/g, '<br>') + '</p>' : '')));
  interviewers.forEach(function (e) {
    if (e === lc_(ap.email)) return;
    mail_(e, 'Interview: ' + ap.name + ' — ' + when, emailShell_('You are interviewing ' + esc_(ap.name) + '.',
      '<p><b>' + esc_(when) + '</b> · ' + minutes + ' minutes</p>' + meetBtn +
      '<p>Read the application and enter your marks in <a href="' + CONFIG.ADMIN_URL + '#recruit">Team Portal → Recruitment</a>.</p>'));
  });
  audit_(me.email, 'recruit schedule', ap.id + ' ' + b.date + ' ' + b.time);
  return { ok: true, meet_link: ev.meet, calendar: ev.via };
}

/** Google Calendar event with a Meet link. Needs the "Google Calendar API" advanced service; falls back to CalendarApp (no Meet link). */
function recCalendar_(title, desc, start, end, guests, existingId) {
  const body = { summary: title, description: desc,
    start: { dateTime: start.toISOString(), timeZone: 'Asia/Kolkata' }, end: { dateTime: end.toISOString(), timeZone: 'Asia/Kolkata' },
    attendees: guests.map(function (e) { return { email: e }; }), reminders: { useDefault: true } };
  if (typeof Calendar !== 'undefined' && Calendar.Events) {
    let ev;
    if (existingId && !/@/.test(existingId)) {
      ev = Calendar.Events.patch(body, 'primary', existingId, { conferenceDataVersion: 1, sendUpdates: 'all' });
    } else {
      body.conferenceData = { createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } } };
      ev = Calendar.Events.insert(body, 'primary', { conferenceDataVersion: 1, sendUpdates: 'all' });
    }
    const ep = ev.conferenceData && ev.conferenceData.entryPoints ? ev.conferenceData.entryPoints.filter(function (x) { return x.entryPointType === 'video'; })[0] : null;
    return { id: ev.id, meet: ev.hangoutLink || (ep ? ep.uri : ''), via: 'calendar-api' };
  }
  const cal = CalendarApp.getDefaultCalendar();
  let e = null;
  if (existingId) { try { e = cal.getEventById(existingId); } catch (x) { e = null; } }
  if (e) { e.setTime(start, end); guests.forEach(function (g) { try { e.addGuest(g); } catch (x) { /* already a guest */ } }); }
  else e = cal.createEvent(title, start, end, { description: desc, guests: guests.join(','), sendInvites: true });
  return { id: e.getId(), meet: '', via: 'calendar-basic' };
}

function recScore_(me, id, marks, note) {
  recMust_(me, true);
  const ap = recGet_(me, id);
  if (['Interview scheduled', 'Interviewed', 'Shortlisted'].indexOf(ap.status) < 0) throw new Error('Marks can be entered once the interview is scheduled.');
  const crit = recSettings_().criteria, clean = {};
  let total = 0;
  crit.forEach(function (c) {
    const n = Number(marks && marks[c]);
    if (!(n >= 0 && n <= 10)) throw new Error('Give every criterion a mark from 0 to 10.');
    clean[c] = Math.round(n * 2) / 2; total += clean[c];
  });
  const key = id + '|' + lc_(me.email);
  withLock_(function () {
    const row = { id: key, applicant_id: id, reviewer: lc_(me.email), marks_json: JSON.stringify(clean), total: String(total), note: String(note || '').slice(0, 2000), created_at: now_() };
    if (findRow_('Scores', key)) updateRow_('Scores', key, row); else appendRow_('Scores', row);
    const all = readAll_('Scores').filter(function (s) { return s.applicant_id === id; });
    const max = crit.length * 10;
    const avg = all.reduce(function (t, s) { return t + Number(s.total || 0); }, 0) / all.length;
    updateRow_('Applicants', id, { score_avg: (Math.round(avg / max * 1000) / 10) + '', status: ap.status === 'Interview scheduled' ? 'Interviewed' : ap.status, updated_at: now_() });
  });
  audit_(me.email, 'recruit marks', id);
  return { ok: true };
}

/** The Organizer's final decision (Charter 8.2.4). */
function recDecide_(me, b) {
  if (me.role !== 'super') throw new Error('Final selection is made by the Organizer.');
  const ap = recGet_(me, b.id);
  if (['Onboarded', 'Withdrawn'].indexOf(ap.status) >= 0) throw new Error('This applicant is already ' + ap.status.toLowerCase() + '.');
  const first = esc_(String(ap.name).split(' ')[0]);
  if (b.decision === 'Not selected') {
    updateRow_('Applicants', ap.id, { status: 'Not selected', decided_by: me.email, decided_at: now_(), decision_note: String(b.note || '').slice(0, 1000), updated_at: now_() });
    if (b.notify !== false) mail_(ap.email, 'Your TEDxThaltej Youth application', emailShell_('Thank you, ' + first + '.',
      '<p>Thank you for applying and for the time you gave us. We had many strong applicants and limited places, and we are not able to offer you a place this cycle.</p>' +
      '<p>We would love to see you in the audience, and we hope you apply again.</p>'));
    audit_(me.email, 'recruit not selected', ap.id);
    return { ok: true };
  }
  if (b.decision !== 'Selected') throw new Error('Choose Select or Not selected.');
  const dept = String(b.department_id || String(ap.departments).split(',')[0] || '');
  if (!findRow_('Departments', dept)) throw new Error('Choose the team they will join.');
  const role = String(b.role || 'Member').slice(0, 80);
  updateRow_('Applicants', ap.id, { status: 'Selected', assigned_department: dept, assigned_role: role, decided_by: me.email, decided_at: now_(),
    decision_note: String(b.note || '').slice(0, 1000), updated_at: now_() });
  recSendOnboard_(findRow_('Applicants', ap.id));
  audit_(me.email, 'recruit selected', ap.id + ' → ' + dept);
  return { ok: true };
}

function recSendOnboard_(ap, hours) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  hours = hours || (ap.source === 'existing' ? 24 : 14 * 24);
  const exp = Utilities.formatDate(new Date(Date.now() + hours * 3600000), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss");
  updateRow_('Applicants', ap.id, { onboard_hash: sha_(token), onboard_expires: exp });
  const link = CONFIG.SITE_URL + '/join/#onboard=' + token;
  if (ap.source === 'existing') {
    const until = exp.replace('T', ' ').slice(0, 16);
    mail_(ap.email, 'Your TEDxThaltej Youth onboarding link (valid ' + hours + ' hours)', emailShell_('Welcome aboard, ' + esc_(String(ap.name).split(' ')[0]) + '!',
      '<p>TEDxThaltej Youth is moving to the TEDxThaltej Charter and a new Team Portal. As a member of <b>' + esc_(recDeptNames_(ap.assigned_department)) + '</b> (' + esc_(ap.assigned_role || 'Member') + '), please complete your onboarding:</p>' +
      '<ol><li>Read and sign the Charter</li><li>Create your Team Portal password</li><li>Start using the portal</li></ol>' +
      '<p><a href="' + link + '" style="display:inline-block;background:#EB0028;color:#fff;padding:12px 22px;border-radius:30px;text-decoration:none;font-weight:700">Start onboarding</a></p>' +
      '<p style="color:#777;font-size:13px">This link is personal and secret. It stops working at <b>' + until + ' IST</b> or once used. Don’t forward it.</p>'));
    return link;
  }
  mail_(ap.email, 'Welcome to the TEDxThaltej Youth team 🎉', emailShell_('You’re in, ' + esc_(String(ap.name).split(' ')[0]) + '!',
    '<p>You have been <b>selected</b> to join the TEDxThaltej Youth team as <b>' + esc_(ap.assigned_role || 'Member') + '</b> in <b>' + esc_(recDeptNames_(ap.assigned_department)) + '</b>.</p>' +
    '<p>One last step: read and sign the <b>TEDxThaltej Charter</b>. Under the Charter, you become a member once you accept it, along with its confidentiality terms.</p>' +
    '<p><a href="' + link + '" style="display:inline-block;background:#EB0028;color:#fff;padding:12px 22px;border-radius:30px;text-decoration:none;font-weight:700">Read and sign the Charter</a></p>' +
    '<p style="color:#777;font-size:13px">This link is personal and works for 14 days. After you sign, you will get your Team Portal login by email.</p>'));
  return link;
}

/** Existing team members: skip the application and interview, send a secret onboarding link (24 hours by default). */
function recInviteExisting_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer can onboard existing members.');
  const hours = Math.max(1, Math.min(168, parseInt(b.hours, 10) || 24));
  const people = [].concat(b.people || []).slice(0, 60);
  if (!people.length) throw new Error('Add at least one person.');
  const r = recSettings_(), out = [];
  people.forEach(function (p) {
    const email = lc_(p.email), name = String(p.name || '').trim().slice(0, 100);
    try {
      if (!isEmail_(email)) throw new Error('invalid email');
      if (!name) throw new Error('name missing');
      const dept = String(p.department_id || '');
      if (!findRow_('Departments', dept)) throw new Error('choose a department');
      const prole = ['member', 'lead', 'editor'].indexOf(p.portal_role) >= 0 ? p.portal_role : 'member';
      const scopes = [].concat(p.scopes || []).map(String).filter(function (x) { return EDITABLE_SCOPES.indexOf(x) >= 0; }).join(',');
      const prev = readAll_('Applicants').filter(function (x) { return lc_(x.email) === email && ['Selected', 'Onboarded'].indexOf(x.status) >= 0; }).pop();
      if (prev && prev.status === 'Onboarded') { out.push({ email: email, name: name, ok: false, error: 'already onboarded (signed the Charter on ' + String(prev.charter_signed_at).slice(0, 10) + ')' }); return; }
      let ap = prev;
      const fields = { name: name, phone: String(p.phone || '').slice(0, 30), assigned_department: dept, assigned_role: String(p.title || 'Member').slice(0, 80),
        portal_role: prole, portal_scopes: scopes, source: 'existing', updated_at: now_() };
      if (ap) updateRow_('Applicants', ap.id, fields);
      else {
        ap = Object.assign({ id: newId_('AP'), cycle: r.cycle, created_at: now_(), email: email, departments: dept, licenses: '', status: 'Selected',
          decided_by: me.email, decided_at: now_(), decision_note: 'Existing team member: direct onboarding' }, fields);
        appendRow_('Applicants', ap);
      }
      const link = recSendOnboard_(findRow_('Applicants', ap.id), hours);
      out.push({ email: email, name: name, ok: true, link: link });
    } catch (e) { out.push({ email: email, name: name, ok: false, error: e.message }); }
  });
  audit_(me.email, 'existing members invited', out.filter(function (x) { return x.ok; }).length + ' of ' + out.length);
  return { ok: true, results: out, hours: hours };
}

function recResend_(me, id) {
  if (me.role !== 'super') throw new Error('Only the Organizer can resend the onboarding link.');
  const ap = recGet_(me, id);
  if (ap.status !== 'Selected') throw new Error('Only selected applicants who have not signed yet can get a new link.');
  const link = recSendOnboard_(ap);
  return { ok: true, link: link };
}

function recDeptNames_(ids) {
  const d = readAll_('Departments');
  return String(ids || '').split(',').filter(String).map(function (id) { const x = d.filter(function (y) { return y.id === id; })[0]; return x ? x.name : id; }).join(', ');
}

// ───────────────────────────── ONBOARDING: sign the Charter ─────────────────────────────
function recByToken_(token) {
  if (!/^[a-f0-9]{64}$/.test(String(token || ''))) throw new Error('This link is not valid. Use the link from your selection email.');
  const h = sha_(token);
  const ap = readAll_('Applicants').filter(function (x) { return x.onboard_hash && x.onboard_hash === h; })[0];
  if (!ap) throw new Error('This link is not valid or has already been used.');
  if (ap.onboard_expires && ap.onboard_expires < now_()) throw new Error('This link has expired. Write to us and we will send a new one.');
  return ap;
}

function recOnboard_(token) {
  const ap = recByToken_(token);
  const r = recSettings_();
  const acct = findAdmin_(ap.email);
  return { ok: true, name: ap.name, email: ap.email, role: ap.assigned_role || 'Member', team: recDeptNames_(ap.assigned_department), existing: ap.source === 'existing',
    hasAccount: !!(acct && !truthy_(acct.must_change)), expires: ap.onboard_expires,
    licenses: r.licenses, chosen: String(ap.licenses || '').split(',').filter(String),
    charter: { title: CHARTER_TITLE, version: CHARTER_VERSION, hash: charterHash_(), lines: CHARTER } };
}

function recSign_(d) {
  const ap = recByToken_(d.token);
  const r = recSettings_();
  const ag = d.agreed || {};
  if (!ag.charter || !ag.confidentiality || !ag.amendments) throw new Error('Please tick all three acknowledgements.');
  const typed = String(d.typedName || '').trim();
  if (typed.toLowerCase().replace(/\s+/g, ' ') !== String(ap.name).trim().toLowerCase().replace(/\s+/g, ' ')) throw new Error('Type your full name exactly as: ' + ap.name);
  const lic = [].concat(d.licenses || []).map(String).filter(function (x) { return r.licenses.indexOf(x) >= 0; });
  if (!lic.length) throw new Error('Choose at least one license you will take part in.');
  if (lic.length > 2) throw new Error('You can take part in at most two licenses (Charter 9.2).');
  if (d.charterHash && d.charterHash !== charterHash_()) throw new Error('The Charter was updated while you were reading. Please reload the page and read it again.');
  const acct0 = findAdmin_(ap.email), needPw = !(acct0 && !truthy_(acct0.must_change));
  if (needPw) { if (String(d.password || '') !== String(d.password2 || '')) throw new Error('The two passwords don’t match.'); checkStrength_(d.password); }
  const sigBlob = dataUrlBlob_(d.signature, ap.id + '-charter-signature.png');
  const evidence = evidenceSave_(d.evidence, ap.id + '-charter');
  return withLock_(function () {
    const fresh = findRow_('Applicants', ap.id);
    if (fresh.status === 'Onboarded') throw new Error('You have already signed.');
    const folder = teamRecordsFolder_('Charter acceptances');
    const sigId = folder.createFile(sigBlob).getId();
    const signedAt = now_();
    const rec = { name: ap.name, email: ap.email, role: ap.assigned_role || 'Member', team: recDeptNames_(ap.assigned_department), licenses: lic,
      signedAt: signedAt, ua: String(d.ua || '').slice(0, 300), hash: charterHash_(), id: ap.id, evidence: evidence };
    const pdf = Utilities.newBlob(charterPdfHtml_(rec, fileDataUrl_(sigId)), 'text/html', 'c.html').getAs('application/pdf')
      .setName('TEDxThaltej Charter — accepted by ' + ap.name + ' — ' + signedAt.slice(0, 10) + '.pdf');
    const pdfId = folder.createFile(pdf).getId();

    // Team record + portal login
    const ed = currentEdition_(readAll_('Editions'));
    const inTeam = readAll_('Team').some(function (t) { return lc_(t.email) === lc_(ap.email) && (!ed || t.edition_id === ed.id); });
    if (!inTeam) appendRow_('Team', { id: newId_('TM'), name: ap.name, role: rec.role, department_id: ap.assigned_department, edition_id: ed ? ed.id : '', email: lc_(ap.email),
      phone: ap.phone, photo_url: '', bio: '', linkedin: '', sort: '99', published: 'FALSE' });
    let invited = false;
    const prole = ['member', 'lead', 'editor'].indexOf(ap.portal_role) >= 0 ? ap.portal_role : 'member';
    const salt = Utilities.getUuid();
    const pw = needPw ? { salt: salt, hash: hash_(String(d.password), salt), must_change: 'FALSE' } : {};
    const acct = findAdmin_(ap.email);
    if (!acct) {
      appendRow_('Admins', Object.assign({ email: lc_(ap.email), name: ap.name, role: prole, scopes: ap.portal_scopes || '', department_id: ap.assigned_department,
        active: 'TRUE', last_login: '', created_at: now_() }, pw));
      invited = true;
    } else {
      const up = Object.assign({ active: 'TRUE', department_id: ap.assigned_department || acct.department_id }, pw);
      if (acct.role !== 'super' && ap.source === 'existing') { up.role = prole; if (ap.portal_scopes) up.scopes = ap.portal_scopes; }
      updateRow_('Admins', acct.email, up);
    }
    updateRow_('Applicants', ap.id, { status: 'Onboarded', evidence_json: JSON.stringify(evidence), licenses: lic.join(','), onboard_hash: '', charter_signed_at: signedAt, charter_version: CHARTER_VERSION,
      charter_hash: rec.hash, charter_pdf_id: pdfId, sig_file_id: sigId, member_email: lc_(ap.email), updated_at: now_() });
    const html = function (who) {
      return emailShell_(who === 'member' ? 'Welcome to the team, ' + esc_(String(ap.name).split(' ')[0]) + '.' : 'Charter accepted: ' + esc_(ap.name),
        (who === 'member' ? '<p>You have accepted the TEDxThaltej Charter. You are now an active member of <b>' + esc_(rec.team) + '</b>.</p><p>Your signed copy is attached. ' +
          'Sign in to the Team Portal at <a href="' + CONFIG.ADMIN_URL + '">' + CONFIG.ADMIN_URL.replace(/^https:\/\//, '') + '</a> with this email and ' + (needPw ? 'the password you just created.' : 'your existing password.') + '</p>'
          : '<p>' + esc_(ap.name) + ' (' + esc_(ap.email) + ') accepted Charter version ' + CHARTER_VERSION + ' on ' + signedAt.replace('T', ' ').slice(0, 16) + ' IST.</p><p>Team: ' + esc_(rec.team) + ' · Licenses: ' + esc_(lic.join(', ')) + '</p><p>Signed copy attached for the register (Charter 26.6).</p>'));
    };
    mail_(ap.email, 'Your signed TEDxThaltej Charter', html('member'), { attachments: [pdf] });
    if (isEmail_(r.registrar)) mail_(r.registrar, 'Charter accepted — ' + ap.name, html('registrar'), { attachments: [pdf] });
    audit_(ap.email, 'charter signed', ap.id + ' v' + CHARTER_VERSION);
    return { ok: true, invited: invited };
  });
}

function teamRecordsFolder_(sub) {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('TEAM_FOLDER_ID'), root;
  try { root = id ? DriveApp.getFolderById(id) : null; } catch (e) { root = null; }
  if (!root) { root = DriveApp.createFolder('TEDxThaltej Youth — Team Records'); props.setProperty('TEAM_FOLDER_ID', root.getId()); }
  const it = root.getFoldersByName(sub);
  return it.hasNext() ? it.next() : root.createFolder(sub);
}

function charterPdfHtml_(rec, sig) {
  const at = String(rec.signedAt).replace('T', ' ').slice(0, 16) + ' IST';
  return '<html><head><style>body{font-family:Helvetica,Arial,sans-serif;color:#111;font-size:10pt;line-height:1.5}' +
    '.cover{border-top:8px solid #EB0028;padding-top:14px}.brand{font-size:20pt;font-weight:bold}.brand span{color:#EB0028}' +
    'h1{font-size:20pt;margin:22px 0 6px}h2{font-size:13pt;margin:20px 0 4px;border-bottom:2px solid #111;padding-bottom:4px}h3{font-size:10.5pt;margin:12px 0 2px}' +
    'p{margin:3px 0}.it{margin-left:16px}.kv td{padding:3px 12px 3px 0}.doc{page-break-before:always}.sig img{height:64px}.line{border-top:1px solid #111;width:260px;margin:2px 0 4px}' +
    '.mono{font-family:Courier,monospace;font-size:8pt;word-break:break-all}.ack{background:#f4f4f4;padding:10px 12px;margin:10px 0}</style></head><body>' +
    '<div class="cover"><div class="brand"><span>TEDx</span>Thaltej Youth</div><h1>Acceptance of the TEDxThaltej Charter</h1>' +
    '<table class="kv"><tr><td>Member</td><td><b>' + esc_(rec.name) + '</b> (' + esc_(rec.email) + ')</td></tr>' +
    '<tr><td>Role · Team</td><td>' + esc_(rec.role) + ' · ' + esc_(rec.team) + '</td></tr>' +
    '<tr><td>Licenses (max two, 9.2)</td><td>' + esc_(rec.licenses.join(', ')) + '</td></tr>' +
    '<tr><td>Charter version</td><td>' + CHARTER_VERSION + '</td></tr><tr><td>Signed electronically</td><td>' + at + '</td></tr></table>' +
    '<div class="ack"><b>The member accepted, under Article 8.3:</b><br>(a) the provisions of this Charter and all rules and obligations under it;<br>' +
    '(b) the confidentiality obligations of the Charter (8.3(b) and 16.2), during and after association;<br>(c) to be bound by future amendments and provisions issued under this Charter.</div>' +
    '<div class="sig"><img src="' + sig + '"><div class="line"></div><b>' + esc_(rec.name) + '</b><br>' + at + '</div>' +
    '<table class="kv" style="margin-top:10px">' + evidenceHtml_(rec.evidence, rec.name) + '</table>' +
    '<p style="margin-top:14px;font-size:9pt;color:#555">Record ' + esc_(rec.id) + ' · Device: ' + esc_(rec.ua) + '<br>SHA-256 of the Charter text signed: <span class="mono">' + rec.hash + '</span></p></div>' +
    '<div class="doc"><h1>' + esc_(CHARTER_TITLE) + '</h1>' + charterHtml_() +
    '<div class="sig" style="margin-top:24px"><img src="' + sig + '"><div class="line"></div><b>' + esc_(rec.name) + '</b> · accepted ' + at + '</div></div></body></html>';
}

function recPdf_(me, id) {
  recMust_(me, false);
  const ap = recGet_(me, id);
  if (!ap.charter_pdf_id) throw new Error('No signed Charter yet.');
  const f = DriveApp.getFileById(ap.charter_pdf_id);
  return { ok: true, name: f.getName(), base64: Utilities.base64Encode(f.getBlob().getBytes()) };
}

// ───────────────────────────── ONE SHARED LINK FOR THE EXISTING TEAM ─────────────────────────────
// The Organizer creates one secret link (e.g. 24 hours, up to 20 people). Each person fills in their details and the
// date they joined, reads and signs the Charter (signature, location, camera photo) and creates their password.
// Their account waits until the Organizer clicks Activate.
function teamLinkByToken_(token) {
  if (!/^[a-f0-9]{48}$/.test(String(token || ''))) throw new Error('This link is not valid.');
  const h = sha_(token), L = readAll_('OnboardLinks').filter(function (x) { return x.token_hash === h; })[0];
  if (!L || L.status !== 'Active') throw new Error('This onboarding link has been closed. Ask the Organizer for a new one.');
  if (L.expires < now_()) throw new Error('This onboarding link has expired. Ask the Organizer for a new one.');
  if ((+L.uses || 0) >= (+L.max_uses || 0)) throw new Error('This onboarding link has been used by the maximum number of people.');
  return L;
}
function teamLinkCreate_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer can create onboarding links.');
  const hours = Math.max(1, Math.min(168, parseInt(b.hours, 10) || 24)), max = Math.max(1, Math.min(200, parseInt(b.max, 10) || 20));
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 48);
  const exp = Utilities.formatDate(new Date(Date.now() + hours * 3600000), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss");
  const rec = { id: newId_('OBL'), token_hash: sha_(token), note: String(b.note || '').slice(0, 120), created_by: lc_(me.email), created_at: now_(), expires: exp,
    max_uses: String(max), uses: '0', status: 'Active' };
  appendRow_('OnboardLinks', rec);
  audit_(me.email, 'team onboarding link created', rec.id + ' · ' + hours + 'h · ' + max + ' people');
  return { ok: true, id: rec.id, url: CONFIG.SITE_URL + '/join/#team=' + token, expires: exp, max: max };
}
function teamLinks_(me) {
  if (me.role !== 'super') throw new Error('Only the Organizer can see onboarding links.');
  const pending = readAll_('Applicants').filter(function (a) { return a.status === 'Awaiting activation'; }).map(function (a) {
    return { id: a.id, name: a.name, email: a.email, phone: a.phone, department_id: a.assigned_department, title: a.assigned_role, joined_on: a.joined_on,
      signed_at: a.charter_signed_at, licenses: a.licenses, link_id: a.link_id, evidence: safeJson_(a.evidence_json, {}).place || '' }; });
  return { ok: true, links: readAll_('OnboardLinks').map(function (l) { const o = Object.assign({}, l); delete o._row; delete o.token_hash;
      o.live = o.status === 'Active' && o.expires > now_() && (+o.uses) < (+o.max_uses); return o; }).reverse(),
    pending: pending, departments: readAll_('Departments').map(function (d) { return { id: d.id, name: d.name }; }) };
}
function teamLinkClose_(me, id) {
  if (me.role !== 'super') throw new Error('Only the Organizer can close links.');
  updateRow_('OnboardLinks', id, { status: 'Closed' }); audit_(me.email, 'team onboarding link closed', id);
  return { ok: true };
}
function teamInfo_(token) {
  const L = teamLinkByToken_(token), r = recSettings_();
  return { ok: true, expires: L.expires, left: (+L.max_uses) - (+L.uses), licenses: r.licenses,
    departments: readAll_('Departments').map(function (d) { return { id: d.id, name: d.name }; }),
    charter: { title: CHARTER_TITLE, version: CHARTER_VERSION, hash: charterHash_(), lines: CHARTER } };
}
function teamSign_(d) {
  const L = teamLinkByToken_(d.token), r = recSettings_();
  const f = clean_(d, { name: 100, email: 120, phone: 30, department_id: 40, title: 80, joined_on: 10 });
  if (!f.name || f.name.split(/\s+/).length < 2) throw new Error('Enter your full name (first and last).');
  if (!isEmail_(f.email)) throw new Error('Enter a valid email address.');
  if (!findRow_('Departments', f.department_id)) throw new Error('Choose your team.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.joined_on) || f.joined_on > now_().slice(0, 10) || f.joined_on < '2023-01-01') throw new Error('Enter the date you joined TEDxThaltej Youth.');
  const email = lc_(f.email), acct = findAdmin_(email);
  if (acct && truthy_(acct.active)) throw new Error('You already have an active Team Portal account. Sign in at ' + CONFIG.ADMIN_URL);
  if (readAll_('Applicants').some(function (a) { return lc_(a.email) === email && ['Awaiting activation', 'Onboarded'].indexOf(a.status) >= 0; }))
    throw new Error('This email has already been onboarded. Wait for the Organizer to activate you.');
  const ag = d.agreed || {};
  if (!ag.charter || !ag.confidentiality || !ag.amendments) throw new Error('Please tick all three acknowledgements.');
  if (String(d.typedName || '').trim().toLowerCase().replace(/\s+/g, ' ') !== f.name.toLowerCase().replace(/\s+/g, ' ')) throw new Error('Type your full name exactly as entered above: ' + f.name);
  const lic = [].concat(d.licenses || []).map(String).filter(function (x) { return r.licenses.indexOf(x) >= 0; });
  if (!lic.length) throw new Error('Choose at least one license you will take part in.');
  if (lic.length > 2) throw new Error('You can take part in at most two licenses (Charter 9.2).');
  if (d.charterHash && d.charterHash !== charterHash_()) throw new Error('The Charter was updated while you were reading. Please reload the page.');
  if (String(d.password || '') !== String(d.password2 || '')) throw new Error('The two passwords don’t match.');
  checkStrength_(d.password);
  rateLimit_('teamsign_' + email, 5, 3600);
  const id = newId_('AP');
  const sigBlob = dataUrlBlob_(d.signature, id + '-charter-signature.png');
  const evidence = evidenceSave_(d.evidence, id + '-charter');
  return withLock_(function () {
    const L2 = teamLinkByToken_(d.token);
    const folder = teamRecordsFolder_('Charter acceptances'), sigId = folder.createFile(sigBlob).getId(), signedAt = now_();
    const team = recDeptNames_(f.department_id);
    const rec = { name: f.name, email: email, role: f.title || 'Member', team: team, licenses: lic, signedAt: signedAt, ua: String(d.ua || '').slice(0, 300),
      hash: charterHash_(), id: id, evidence: evidence };
    const pdf = Utilities.newBlob(charterPdfHtml_(rec, fileDataUrl_(sigId)), 'text/html', 'c.html').getAs('application/pdf')
      .setName('TEDxThaltej Charter — accepted by ' + f.name + ' — ' + signedAt.slice(0, 10) + '.pdf');
    const pdfId = folder.createFile(pdf).getId();
    appendRow_('Applicants', { id: id, cycle: r.cycle, created_at: now_(), name: f.name, email: email, phone: f.phone, departments: f.department_id, licenses: lic.join(','),
      status: 'Awaiting activation', assigned_department: f.department_id, assigned_role: f.title || 'Member', decision_note: 'Existing team member via shared link ' + L2.id,
      charter_signed_at: signedAt, charter_version: CHARTER_VERSION, charter_hash: rec.hash, charter_pdf_id: pdfId, sig_file_id: sigId, member_email: email,
      evidence_json: JSON.stringify(evidence), source: 'team-link', link_id: L2.id, joined_on: f.joined_on, updated_at: now_() });
    const salt = Utilities.getUuid(), pw = { salt: salt, hash: hash_(String(d.password), salt), must_change: 'FALSE' };
    if (acct) updateRow_('Admins', email, Object.assign({ name: f.name, department_id: f.department_id, joined_on: f.joined_on, active: 'FALSE' }, pw));
    else appendRow_('Admins', Object.assign({ email: email, name: f.name, role: 'member', scopes: '', department_id: f.department_id, joined_on: f.joined_on,
      active: 'FALSE', last_login: '', created_at: now_() }, pw));
    updateRow_('OnboardLinks', L2.id, { uses: String((+L2.uses || 0) + 1) });
    mail_(email, 'Your signed TEDxThaltej Charter', emailShell_('Thank you, ' + esc_(f.name.split(' ')[0]) + '.',
      '<p>You have accepted the TEDxThaltej Charter. Your signed copy is attached.</p><p>Your Team Portal account is ready and will open as soon as the Organizer activates it. We’ll email you then.</p>'), { attachments: [pdf] });
    const html = emailShell_('Waiting for activation: ' + esc_(f.name), '<p>' + esc_(f.name) + ' (' + esc_(email) + ') signed the Charter through the team onboarding link.</p><p>Team: ' + esc_(team) +
      ' · Title: ' + esc_(f.title || 'Member') + ' · Joined: ' + esc_(f.joined_on) + '</p><p><a href="' + CONFIG.ADMIN_URL + '#admins">Activate in the Team Portal</a></p>');
    mail_(CONFIG.SUPER_ADMIN_EMAIL, 'Activate ' + f.name + ' (signed the Charter)', html, { attachments: [pdf] });
    if (isEmail_(r.registrar)) mail_(r.registrar, 'Charter accepted — ' + f.name, html, { attachments: [pdf] });
    audit_(email, 'charter signed via team link', id + ' v' + CHARTER_VERSION);
    return { ok: true };
  });
}
function teamActivate_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer can activate members.');
  const ap = findRow_('Applicants', b.id); if (!ap || ap.status !== 'Awaiting activation') throw new Error('Nothing to activate.');
  if (b.decision === 'reject') {
    updateRow_('Applicants', ap.id, { status: 'Not selected', decided_by: me.email, decided_at: now_(), decision_note: String(b.note || 'Not activated').slice(0, 500), updated_at: now_() });
    const a = findAdmin_(ap.email); if (a && !truthy_(a.active)) deleteRow_('Admins', lc_(ap.email));
    audit_(me.email, 'team link rejected', ap.id);
    return { ok: true };
  }
  const dept = String(b.department_id || ap.assigned_department), role = ['member', 'lead', 'editor'].indexOf(b.portal_role) >= 0 ? b.portal_role : 'member';
  const scopes = [].concat(b.scopes || []).map(String).filter(function (x) { return EDITABLE_SCOPES.indexOf(x) >= 0; }).join(',');
  updateRow_('Admins', lc_(ap.email), { active: 'TRUE', role: role, scopes: scopes, department_id: dept });
  const ed = currentEdition_(readAll_('Editions'));
  if (!readAll_('Team').some(function (t) { return lc_(t.email) === lc_(ap.email) && (!ed || t.edition_id === ed.id); }))
    appendRow_('Team', { id: newId_('TM'), name: ap.name, role: ap.assigned_role || 'Member', department_id: dept, edition_id: ed ? ed.id : '', email: lc_(ap.email),
      phone: ap.phone, photo_url: '', bio: '', linkedin: '', sort: '99', published: 'FALSE' });
  updateRow_('Applicants', ap.id, { status: 'Onboarded', assigned_department: dept, decided_by: me.email, decided_at: now_(), updated_at: now_() });
  const sent = activationMail_(ap.email, ap.name);
  audit_(me.email, 'member activated', ap.id + ' as ' + role + (sent.ok ? '' : ' (email failed: ' + sent.error + ')'));
  return { ok: true, emailed: sent.ok, email_error: sent.error || '' };
}

/** "Your Team Portal is active" email. Sent at once (never queued), and a failure is reported back instead of being lost. */
function activationMail_(email, name) {
  try {
    mail_(email, 'Your Team Portal account is active: sign in now', emailShell_('You’re in, ' + esc_(String(name || '').split(' ')[0] || 'there') + '!',
      '<p>The Organizer has activated your TEDxThaltej Youth Team Portal account.</p><p><a href="' + CONFIG.ADMIN_URL + '" style="display:inline-block;background:#EB0028;color:#fff;padding:12px 22px;border-radius:30px;text-decoration:none;font-weight:700">Open the Team Portal</a></p>' +
      '<p>Sign in with <b>' + esc_(email) + '</b> and the password you created. Forgot it? Use <i>Forgot password</i> on the sign-in page.</p>'), { priority: 'high' });
    return { ok: true };
  } catch (e) {
    try { opsLog_('activation email', String(e.message || e), email); } catch (x) { }
    return { ok: false, error: String(e.message || e).slice(0, 200) };
  }
}
