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
const REC_STATUSES = ['Applied', 'Shortlisted', 'Interview scheduled', 'Interviewed', 'Selected', 'Not selected', 'Onboarded', 'Withdrawn'];
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
  if (me.department_id && me.role !== 'editor') return String(ap.departments).split(',').indexOf(me.department_id) >= 0 || String(ap.interviewers).indexOf(lc_(me.email)) >= 0;
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

function recSendOnboard_(ap) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const exp = Utilities.formatDate(new Date(Date.now() + 14 * 86400000), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss");
  updateRow_('Applicants', ap.id, { onboard_hash: sha_(token), onboard_expires: exp });
  const link = CONFIG.SITE_URL + '/join/#onboard=' + token;
  mail_(ap.email, 'Welcome to the TEDxThaltej Youth team 🎉', emailShell_('You’re in, ' + esc_(String(ap.name).split(' ')[0]) + '!',
    '<p>You have been <b>selected</b> to join the TEDxThaltej Youth team as <b>' + esc_(ap.assigned_role || 'Member') + '</b> in <b>' + esc_(recDeptNames_(ap.assigned_department)) + '</b>.</p>' +
    '<p>One last step: read and sign the <b>TEDxThaltej Charter</b>. Under the Charter, you become a member once you accept it, along with its confidentiality terms.</p>' +
    '<p><a href="' + link + '" style="display:inline-block;background:#EB0028;color:#fff;padding:12px 22px;border-radius:30px;text-decoration:none;font-weight:700">Read and sign the Charter</a></p>' +
    '<p style="color:#777;font-size:13px">This link is personal and works for 14 days. After you sign, you will get your Team Portal login by email.</p>'));
}

function recResend_(me, id) {
  if (me.role !== 'super') throw new Error('Only the Organizer can resend the onboarding link.');
  const ap = recGet_(me, id);
  if (ap.status !== 'Selected') throw new Error('Only selected applicants who have not signed yet can get a new link.');
  recSendOnboard_(ap);
  return { ok: true };
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
  return { ok: true, name: ap.name, email: ap.email, role: ap.assigned_role || 'Member', team: recDeptNames_(ap.assigned_department),
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
    const teamId = newId_('TM');
    appendRow_('Team', { id: teamId, name: ap.name, role: rec.role, department_id: ap.assigned_department, edition_id: ed ? ed.id : '', email: lc_(ap.email),
      phone: ap.phone, photo_url: '', bio: '', linkedin: '', sort: '99', published: 'FALSE' });
    let invited = false;
    if (!findAdmin_(ap.email)) {
      const temp = randomPassword_(), salt = Utilities.getUuid();
      appendRow_('Admins', { email: lc_(ap.email), name: ap.name, role: 'member', scopes: '', department_id: ap.assigned_department, salt: salt, hash: hash_(temp, salt),
        active: 'TRUE', must_change: 'TRUE', last_login: '', created_at: now_() });
      sendWelcome_(lc_(ap.email), ap.name, temp, 'member');
      invited = true;
    }
    updateRow_('Applicants', ap.id, { status: 'Onboarded', evidence_json: JSON.stringify(evidence), licenses: lic.join(','), onboard_hash: '', charter_signed_at: signedAt, charter_version: CHARTER_VERSION,
      charter_hash: rec.hash, charter_pdf_id: pdfId, sig_file_id: sigId, member_email: lc_(ap.email), updated_at: now_() });
    const html = function (who) {
      return emailShell_(who === 'member' ? 'Welcome to the team, ' + esc_(String(ap.name).split(' ')[0]) + '.' : 'Charter accepted: ' + esc_(ap.name),
        (who === 'member' ? '<p>You have accepted the TEDxThaltej Charter. You are now an active member of <b>' + esc_(rec.team) + '</b>.</p><p>Your signed copy is attached. ' +
          (invited ? 'Your Team Portal login has been sent in a separate email.' : 'You can sign in to the Team Portal with your existing login.') + '</p>'
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
