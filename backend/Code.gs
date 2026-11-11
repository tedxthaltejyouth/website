/**
 * TEDxThaltej Youth — one backend for the whole site
 * Website data, forms, registrations, the Team page feed, the AIS Steward Desk,
 * partners, and the Team Portal (tasks, roles, inbox). Google Apps Script bound to
 * one Google Sheet. Files: Code.gs (core + portal), Feeds.gs, Ais.gs (Steward Desk), Docs.gs + Speakers.gs (Speaker Portal),
 * Mail.gs (Zoho Mail), Charter.gs + Recruit.gs (team recruitment), Intra.gs (Team Mail).
 *
 * One web-app URL serves both pages:
 *   GET  ?action=site            -> public site data (JSON, cached)
 *   POST {action:'submit'|'register'|'login'|...}  (body sent as text/plain JSON)
 */

// ───────────────────────────── CONFIG ─────────────────────────────
const CONFIG = {
  SUPER_ADMIN_EMAIL: 'fenil@fenilpshah.com',
  SUPER_ADMIN_NAME: 'Fenil Pritesh Shah',
  SENDER_NAME: 'TEDxThaltej Youth',
  FROM_ALIAS: '',            // optional: a "Send mail as" alias on the script owner's Gmail, e.g. 'contact@tedxthaltejyouth.in'
  REPLY_TO: '',              // optional reply-to address for outgoing mail
  SITE_URL: 'https://tedxthaltejyouth.in',
  ADMIN_URL: 'https://tedxthaltejyouth.in/portal',
  SESSION_MINUTES: 30,       // sliding: renewed on every admin action
  OTP_MINUTES: 10,
  HASH_ROUNDS: 300,
  SITE_CACHE_SECONDS: 300,
};

// Sheet tabs and their columns. First column is the row key.
const SCHEMA = {
  Settings:      ['key', 'value'],
  Editions:      ['id', 'number', 'date', 'title', 'theme', 'description', 'venue', 'page_url', 'image_url', 'video_url', 'published'],
  Speakers:      ['id', 'name', 'designation', 'talk_title', 'bio', 'photo_url', 'edition_id', 'video_url', 'sort', 'published',
                  'email', 'phone', 'address', 'under_18', 'ambassador_email', 'stage', 'portal_active', 'salt', 'hash', 'pw_version', 'invite_hash', 'invite_expires', 'last_login'],
  Agreements:    ['id', 'speaker_id', 'edition_id', 'signed_at', 'speaker_name', 'guardian_name', 'under_18', 'personal_json', 'doc_hashes', 'user_agent',
                  'sig_file_id', 'guardian_sig_file_id', 'pdf_file_id', 'status', 'countersigned_by', 'countersigned_at', 'org_sig_file_id', 'final_pdf_file_id'],
  Drafts:        ['id', 'speaker_id', 'version', 'status', 'title', 'body', 'text_hash', 'factcheck_json', 'sources_json', 'doc_id', 'submitted_at',
                  'reviewed_by', 'reviewed_at', 'feedback', 'comments_json', 'updated_at'],
  Departments:   ['id', 'name', 'description', 'lead', 'sort'],
  Team:          ['id', 'name', 'role', 'department_id', 'edition_id', 'email', 'phone', 'photo_url', 'bio', 'linkedin', 'sort', 'published'],
  Submissions:   ['id', 'type', 'name', 'email', 'phone', 'organisation', 'subject', 'message', 'status', 'department_id', 'notes', 'created_at', 'updated_at'],
  Registrations: ['id', 'name', 'email', 'phone', 'age', 'institution', 'city', 'why', 'status', 'ticket_code', 'checked_in', 'created_at', 'updated_at'],
  Sponsors:      ['id', 'name', 'tier', 'logo_url', 'website', 'edition_id', 'description', 'sort', 'published'],
  Tasks:         ['id', 'title', 'description', 'department_id', 'assigned_to', 'assigned_by', 'priority', 'due_date', 'status', 'comments', 'created_at', 'updated_at'],
  Stewards:      ['id', 'name', 'email', 'phone', 'city', 'community', 'salt', 'hash', 'pw_version', 'active', 'created_at', 'last_login'],
  Referrals:     ['ref', 'cycle', 'steward_id', 'steward_email', 'person_name', 'person_role', 'age_group', 'language', 'contact', 'q1', 'q2', 'q3', 'guardian_aware', 'status', 'notes', 'created_at', 'updated_at'],
  Admins:        ['email', 'name', 'role', 'scopes', 'department_id', 'salt', 'hash', 'active', 'must_change', 'last_login', 'created_at'],
  Applicants:    ['id', 'cycle', 'created_at', 'name', 'email', 'phone', 'age', 'institution', 'grade', 'city', 'departments', 'licenses', 'experience', 'why', 'plan', 'portfolio',
                  'status', 'interview_at', 'interview_minutes', 'interviewers', 'meet_link', 'event_id', 'score_avg', 'assigned_department', 'assigned_role',
                  'decided_by', 'decided_at', 'decision_note', 'onboard_hash', 'onboard_expires', 'charter_signed_at', 'charter_version', 'charter_hash',
                  'charter_pdf_id', 'sig_file_id', 'member_email', 'updated_at'],
  Scores:        ['id', 'applicant_id', 'reviewer', 'marks_json', 'total', 'note', 'created_at'],
  Messages:      ['id', 'thread_id', 'from_email', 'from_name', 'to_json', 'to_label', 'subject', 'body', 'created_at'],
  Mailbox:       ['key', 'msg_id', 'thread_id', 'email', 'folder', 'read', 'starred', 'updated_at'],
  Audit:         ['time', 'email', 'action', 'detail'],
};

// Admin console modules -> sheet tab
const MODULES = {
  settings: 'Settings', editions: 'Editions', speakers: 'Speakers', departments: 'Departments',
  team: 'Team', submissions: 'Submissions', registrations: 'Registrations', sponsors: 'Sponsors', tasks: 'Tasks',
  stewards: 'Stewards', referrals: 'Referrals', admins: 'Admins', audit: 'Audit',
};
const EDITABLE_SCOPES = ['settings', 'editions', 'speakers', 'sponsors', 'departments', 'team', 'tasks', 'submissions', 'registrations', 'stewards', 'referrals', 'recruit'];
const SUPER_ONLY = ['admins', 'audit'];
const DEPT_SCOPED = ['team', 'submissions', 'tasks']; // users tied to a department only see their department's rows here
/*
 * Roles
 *   super  – licensee / full control, manages users and sees the audit log
 *   lead   – department head: edits the sections in their scopes, limited to their own department for
 *            team / tasks / submissions; can add 'member' accounts to their department and assign them tasks
 *   editor – edits the sections in their scopes (department-limited if a department is set)
 *   viewer – read-only on their scopes
 *   member – team member: only sees "My tasks" (update status, comment)
 * Every role, including member, gets "My tasks".
 */
const ROLES = ['super', 'lead', 'editor', 'viewer', 'member'];
const TASK_STATUSES = ['To do', 'In progress', 'Blocked', 'Done'];
const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

const SUBMISSION_TYPES = ['Contact', 'Volunteer', 'Partner', 'Sponsor', 'Media'];
const SUBMISSION_STATUSES = ['New', 'In progress', 'Replied', 'Closed'];
const REG_STATUSES = ['Pending', 'Approved', 'Waitlisted', 'Rejected', 'Cancelled'];

// Settings safe to show on the public site
const PUBLIC_SETTINGS = ['event_name', 'event_date', 'event_time', 'theme', 'tagline', 'venue', 'registration_open',
  'registration_note', 'contact_email', 'instagram', 'youtube', 'linkedin', 'ais_url', 'about', 'highlight_video'];

// ───────────────────────────── SETUP ─────────────────────────────
/** Run once from the Apps Script editor. Creates tabs, seeds data and the super-admin. Safe to re-run. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMA).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const cols = SCHEMA[name];
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#111').setFontColor('#fff');
      sh.setFrozenRows(1);
      sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@'); // keep everything as plain text
    }
  });
  const s1 = ss.getSheetByName('Sheet1');
  if (s1 && s1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s1);

  seedIfEmpty_();

  const admins = readAll_('Admins');
  if (!admins.some(function (a) { return lc_(a.email) === lc_(CONFIG.SUPER_ADMIN_EMAIL); })) {
    const temp = randomPassword_();
    const salt = Utilities.getUuid();
    appendRow_('Admins', {
      email: lc_(CONFIG.SUPER_ADMIN_EMAIL), name: CONFIG.SUPER_ADMIN_NAME, role: 'super', scopes: 'all', department_id: '',
      salt: salt, hash: hash_(temp, salt), active: 'TRUE', must_change: 'TRUE', last_login: '', created_at: now_(),
    });
    Logger.log('Super-admin created: ' + CONFIG.SUPER_ADMIN_EMAIL + '  temporary password: ' + temp);
    try { sendWelcome_(CONFIG.SUPER_ADMIN_EMAIL, CONFIG.SUPER_ADMIN_NAME, temp, 'super'); } catch (e) { Logger.log('Mail failed: ' + e); }
  }
  Logger.log('Setup complete.');
}

function seedIfEmpty_() {
  if (readAll_('Settings').length === 0) {
    const s = {
      event_name: 'TEDxThaltej Youth 2027', event_date: '2027-06-26', event_time: '10:00', theme: 'The Zenith',
      tagline: 'Where the Unseen Connects', venue: 'Ahmedabad, Gujarat', registration_open: 'TRUE', capacity: '100',
      registration_note: 'Seats are limited. Every registration is reviewed and confirmed by email.',
      contact_email: 'info@tedxthaltejyouth.in', instagram: 'https://www.instagram.com/tedxthaltejyouth', youtube: 'https://youtu.be/GG64ZSxIqtQ', linkedin: 'https://www.linkedin.com/company/tedxthaltej-youth/',
      ais_url: '/ais', highlight_video: '3nWF4UE4RL4', ais_referral_limit: '5', ais_cycle: '2627', ais_notify_email: 'ais@tedxthaltejyouth.in',
      organizer_name: 'Fenil Shah', speaker_contact_email: 'info@tedxthaltejyouth.in', speaker_draft_due: '2027-05-15', gemini_model: 'gemini-2.5-flash',
      about: 'TEDxThaltej Youth is an independently organised TEDx event in Ahmedabad that gives young people a stage for ideas worth spreading.',
    };
    Object.keys(s).forEach(function (k) { appendRow_('Settings', { key: k, value: s[k] }); });
  }
  // Settings added in later versions: filled in on existing Sheets too, without touching values you changed.
  const later = { recruit_open: 'TRUE', recruit_cycle: '2026-27', recruit_deadline: '', recruit_interview_minutes: '20',
    recruit_intro: 'Join the young team that builds TEDxThaltej Youth: curation, design, operations, partnerships, media and more.',
    recruit_criteria: 'Communication,Understanding of TEDx,Initiative,Role fit,Commitment',
    recruit_licenses: 'TEDxThaltej Youth,TEDxThaltej Salon,TEDxThaltej Women', registrar_email: 'registrar@tedxthaltejyouth.in', intramail_notify: 'TRUE' };
  const have = settingsMap_();
  Object.keys(later).forEach(function (k) { if (have[k] === undefined) appendRow_('Settings', { key: k, value: later[k] }); });
  seedContent_(); // Feeds.gs: real editions, speakers and team from the existing pages
}

// ───────────────────────────── HTTP ─────────────────────────────
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'site';
  try {
    if (action === 'site') return json_({ ok: true, data: getSite_() });
    if (action === 'team') return jsonp_(teamFeed_(), e.parameter.callback);
    if (action === 'partners') return json_({ ok: true, partners: partnersFeed_() });
    if (action === 'ping') return json_({ ok: true, time: now_() });
    return json_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) { return json_({ ok: false, error: 'Bad request' }); }
  const a = body.action;
  try {
    // Speaker Portal (/speaker): its own accounts
    if (String(a).indexOf('spk_') === 0) return json_(speakerHandle_(a.slice(4), body));
    // AIS Steward Desk (/ais/apply): its own accounts, separate from team accounts
    if (String(a).indexOf('ais_') === 0) return json_(aisHandle_(a.slice(4), body));
    // Team recruitment (/join): application form and Charter signing
    if (String(a).indexOf('rec_') === 0) return json_(recruitHandle_(a.slice(4), body));
    // Public
    if (a === 'submit') return json_(publicSubmit_(body));
    if (a === 'register') return json_(publicRegister_(body));
    // Auth
    if (a === 'login') return json_(login_(body));
    if (a === 'forgot') return json_(forgot_(body));
    if (a === 'reset') return json_(reset_(body));
    // Everything below needs a session
    const me = auth_(body.token);
    if (a === 'logout') { CacheService.getScriptCache().remove('s_' + body.token); return json_({ ok: true }); }
    if (a === 'me') return json_({ ok: true, me: publicAdmin_(me) });
    if (a === 'changePassword') return json_(changePassword_(me, body));
    if (a === 'dashboard') return json_(dashboard_(me));
    if (a === 'list') return json_(list_(me, body.module));
    if (a === 'save') return json_(save_(me, body.module, body.record || {}));
    if (a === 'remove') return json_(remove_(me, body.module, body.id));
    if (a === 'saveSettings') return json_(saveSettings_(me, body.settings || {}));
    if (a === 'reply') return json_(reply_(me, body.id, body.message));
    if (a === 'decide') return json_(decide_(me, body.id, body.status, body.message));
    if (a === 'checkIn') return json_(checkIn_(me, body.id, body.value));
    if (a === 'resetAdmin') return json_(resetAdmin_(me, body.email));
    if (a === 'myTasks') return json_(myTasks_(me));
    if (a === 'updateTask') return json_(updateMyTask_(me, body.id, body.status, body.comment));
    if (a === 'assignees') return json_({ ok: true, rows: assignees_(me) });
    if (a === 'zohoStatus') return json_(zohoStatus_(me));
    if (a === 'zohoConnect') return json_(zohoConnect_(me, body));
    if (a === 'zohoTest') return json_(zohoTest_(me, body.to));
    if (a === 'zohoDisconnect') return json_(zohoDisconnect_(me));
    if (a === 'recList') return json_(recList_(me));
    if (a === 'recDetail') return json_(recDetail_(me, body.id));
    if (a === 'recShortlist') return json_(recShortlist_(me, body.id, body.note));
    if (a === 'recSchedule') return json_(recSchedule_(me, body));
    if (a === 'recScore') return json_(recScore_(me, body.id, body.marks, body.note));
    if (a === 'recDecide') return json_(recDecide_(me, body));
    if (a === 'recResend') return json_(recResend_(me, body.id));
    if (a === 'recPdf') return json_(recPdf_(me, body.id));
    if (a === 'imBoot') return json_(imBoot_(me));
    if (a === 'imList') return json_(imList_(me, body.folder, body.q));
    if (a === 'imThread') return json_(imThread_(me, body.thread_id));
    if (a === 'imSend') return json_(imSend_(me, body));
    if (a === 'imAct') return json_(imAct_(me, body.thread_id, body.op));
    if (a === 'imCounts') return json_({ ok: true, counts: imCounts_(me) });
    if (a === 'spkList') return json_(spkAdminList_(me));
    if (a === 'spkDetail') return json_(spkAdminDetail_(me, body.id));
    if (a === 'spkInvite') return json_(spkInvite_(me, body.id));
    if (a === 'spkReview') return json_(spkReview_(me, body.id, body.decision, body.feedback, body.comments));
    if (a === 'spkCountersign') return json_(spkCountersign_(me, body.id, body.signature));
    if (a === 'spkPdf') return json_(spkAdminPdf_(me, body.id));
    return json_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err), auth: err.auth === true });
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** JSON, or JSONP when a safe callback name is given (the Team page uses this as a fallback). */
function jsonp_(o, cb) {
  if (cb && /^[A-Za-z_$][\w$]{0,60}$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + JSON.stringify(o) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json_(o);
}

// ───────────────────────────── PUBLIC ─────────────────────────────
function getSite_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('site');
  if (hit) return JSON.parse(hit);
  const settingsAll = settingsMap_();
  const settings = {};
  PUBLIC_SETTINGS.forEach(function (k) { if (settingsAll[k] !== undefined) settings[k] = settingsAll[k]; });
  const data = {
    settings: settings,
    editions: readAll_('Editions').filter(pub_).sort(by_('number')),
    speakers: readAll_('Speakers').filter(pub_).sort(by_('sort', true)).map(function (x) {
      return { id: x.id, name: x.name, designation: x.designation, talk_title: x.talk_title, bio: x.bio, photo_url: x.photo_url, edition_id: x.edition_id, video_url: x.video_url };
    }),
    departments: readAll_('Departments').sort(by_('sort', true)),
    sponsors: readAll_('Sponsors').filter(pub_).sort(by_('sort', true)),
    team: readAll_('Team').filter(pub_).sort(by_('sort', true)).map(function (t) {
      return { id: t.id, name: t.name, role: t.role, department_id: t.department_id, edition_id: t.edition_id, photo_url: t.photo_url, bio: t.bio, linkedin: t.linkedin };
    }),
  };
  try { cache.put('site', JSON.stringify(data), CONFIG.SITE_CACHE_SECONDS); } catch (x) { /* too large to cache: fine */ }
  return data;
}

function publicSubmit_(b) {
  if (b.website) return { ok: true }; // honeypot
  const f = clean_(b, { type: 20, name: 100, email: 120, phone: 30, organisation: 150, subject: 200, message: 3000 });
  if (SUBMISSION_TYPES.indexOf(f.type) < 0) f.type = 'Contact';
  if (!f.name || !isEmail_(f.email) || !f.message) throw new Error('Please fill in your name, a valid email and a message.');
  rateLimit_('sub_' + lc_(f.email), 5, 3600);
  const rec = Object.assign(f, { id: newId_('SB'), status: 'New', department_id: '', notes: '', created_at: now_(), updated_at: now_() });
  withLock_(function () { appendRow_('Submissions', rec); });
  mail_(f.email, 'We received your message — TEDxThaltej Youth',
    emailShell_('Thank you, ' + esc_(f.name.split(' ')[0]) + '.',
      '<p>We have received your <b>' + esc_(f.type.toLowerCase()) + '</b> message and the right team will get back to you soon.</p>' +
      '<p style="color:#666">Reference: <b>' + rec.id + '</b></p>'));
  notifyTeam_('New ' + f.type + ' submission from ' + f.name, rec);
  return { ok: true, id: rec.id };
}

function publicRegister_(b) {
  if (b.website) return { ok: true };
  const s = settingsMap_();
  if (!truthy_(s.registration_open)) throw new Error('Registrations are closed right now.');
  const f = clean_(b, { name: 100, email: 120, phone: 30, age: 3, institution: 150, city: 80, why: 1500 });
  if (!f.name || !isEmail_(f.email) || !f.phone) throw new Error('Please fill in your name, a valid email and phone number.');
  rateLimit_('reg_' + lc_(f.email), 3, 3600);
  let rec;
  withLock_(function () {
    const all = readAll_('Registrations');
    if (all.some(function (r) { return lc_(r.email) === lc_(f.email) && r.status !== 'Cancelled'; }))
      throw new Error('This email is already registered. Check your inbox for updates.');
    const cap = parseInt(s.capacity, 10);
    const approved = all.filter(function (r) { return r.status === 'Approved'; }).length;
    rec = Object.assign(f, { id: newId_('RG'), status: (cap && approved >= cap) ? 'Waitlisted' : 'Pending', ticket_code: '', checked_in: 'FALSE', created_at: now_(), updated_at: now_() });
    appendRow_('Registrations', rec);
  });
  mail_(f.email, 'Registration received — ' + (s.event_name || 'TEDxThaltej Youth'),
    emailShell_('You’re on the list, ' + esc_(f.name.split(' ')[0]) + '.',
      '<p>We have received your registration for <b>' + esc_(s.event_name || 'TEDxThaltej Youth') + '</b>' +
      (s.event_date ? ' on <b>' + esc_(prettyDate_(s.event_date)) + '</b>' : '') + '.</p>' +
      '<p>Status: <b>' + rec.status + '</b>. Our team reviews every registration and will email you a confirmed ticket if approved.</p>' +
      '<p style="color:#666">Reference: <b>' + rec.id + '</b></p>'));
  return { ok: true, id: rec.id, status: rec.status };
}

// ───────────────────────────── AUTH ─────────────────────────────
function login_(b) {
  const email = lc_(b.email);
  rateLimit_('login_' + email, 6, 900);
  const a = findAdmin_(email);
  if (!a || !truthy_(a.active) || hash_(String(b.password || ''), a.salt) !== a.hash) throw new Error('Incorrect email or password.');
  const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('s_' + token, email, CONFIG.SESSION_MINUTES * 60);
  updateRow_('Admins', email, { last_login: now_() });
  audit_(email, 'login', '');
  return { ok: true, token: token, me: publicAdmin_(a), mustChange: truthy_(a.must_change) };
}

function auth_(token) {
  const fail = function () { const e = new Error('Your session has expired. Please sign in again.'); e.auth = true; return e; };
  if (!token) throw fail();
  const cache = CacheService.getScriptCache();
  const email = cache.get('s_' + token);
  if (!email) throw fail();
  const a = findAdmin_(email);
  if (!a || !truthy_(a.active)) throw fail();
  cache.put('s_' + token, email, CONFIG.SESSION_MINUTES * 60); // slide
  a.scopeList = a.role === 'super' ? EDITABLE_SCOPES.concat(SUPER_ONLY) : a.role === 'member' ? [] :
    String(a.scopes || '').split(',').map(function (x) { return x.trim(); }).filter(String);
  if (a.role === 'lead' && a.scopeList.indexOf('tasks') < 0) a.scopeList.push('tasks');
  return a;
}

function forgot_(b) {
  const email = lc_(b.email);
  rateLimit_('otp_' + email, 3, 900);
  const a = findAdmin_(email);
  if (a && truthy_(a.active)) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    CacheService.getScriptCache().put('o_' + email, JSON.stringify({ h: hash_(code, email), n: 0 }), CONFIG.OTP_MINUTES * 60);
    mail_(email, 'Your TEDxThaltej Youth admin code: ' + code,
      emailShell_('Password reset code',
        '<p>Use this code to reset your admin console password. It expires in ' + CONFIG.OTP_MINUTES + ' minutes.</p>' +
        '<p style="font-size:34px;letter-spacing:8px;font-weight:800;margin:24px 0">' + code + '</p>' +
        '<p style="color:#666">If you didn’t ask for this, you can ignore this email.</p>'));
  }
  return { ok: true }; // same answer whether or not the email exists
}

function reset_(b) {
  const email = lc_(b.email);
  const cache = CacheService.getScriptCache();
  const raw = cache.get('o_' + email);
  if (!raw) throw new Error('That code has expired. Request a new one.');
  const o = JSON.parse(raw);
  if (o.n >= 5) { cache.remove('o_' + email); throw new Error('Too many attempts. Request a new code.'); }
  if (hash_(String(b.code || '').trim(), email) !== o.h) {
    o.n++; cache.put('o_' + email, JSON.stringify(o), CONFIG.OTP_MINUTES * 60);
    throw new Error('Incorrect code.');
  }
  checkStrength_(b.password);
  const salt = Utilities.getUuid();
  updateRow_('Admins', email, { salt: salt, hash: hash_(b.password, salt), must_change: 'FALSE' });
  cache.remove('o_' + email);
  audit_(email, 'password reset', 'via email code');
  return { ok: true };
}

function changePassword_(me, b) {
  if (hash_(String(b.current || ''), me.salt) !== me.hash) throw new Error('Current password is incorrect.');
  checkStrength_(b.password);
  const salt = Utilities.getUuid();
  updateRow_('Admins', me.email, { salt: salt, hash: hash_(b.password, salt), must_change: 'FALSE' });
  audit_(me.email, 'password changed', '');
  return { ok: true };
}

function checkStrength_(p) {
  p = String(p || '');
  if (p.length < 8 || !/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) throw new Error('Use at least 8 characters with letters and numbers.');
}

function publicAdmin_(a) {
  let scopes = a.role === 'super' ? EDITABLE_SCOPES.concat(SUPER_ONLY) : a.role === 'member' ? [] :
    String(a.scopes || '').split(',').map(function (x) { return x.trim(); }).filter(String);
  if (a.role === 'lead') { if (scopes.indexOf('tasks') < 0) scopes.push('tasks'); if (a.department_id) scopes.push('admins'); }
  const amb = readAll_('Speakers').filter(function (s) { return lc_(s.ambassador_email) === lc_(a.email); }).length;
  return { ambassador_of: amb, email: a.email, name: a.name, role: a.role, scopes: scopes, department_id: a.department_id, must_change: truthy_(a.must_change) };
}

// ───────────────────────────── PERMISSIONS ─────────────────────────────
function can_(me, module, write) {
  if (me.role === 'super') return true;
  if (module === 'admins' && me.role === 'lead' && me.department_id) return true; // leads manage members of their own department
  if (SUPER_ONLY.indexOf(module) >= 0) return false;
  if (me.scopeList.indexOf(module) < 0) return false;
  if (write && me.role !== 'editor' && me.role !== 'lead') return false;
  return true;
}
function must_(me, module, write) {
  if (!MODULES[module]) throw new Error('Unknown section.');
  if (!can_(me, module, write)) throw new Error(write ? 'You have view-only access to this section.' : 'You don’t have access to this section.');
}
function deptLocked_(me, module) {
  return me.role !== 'super' && !!me.department_id && (DEPT_SCOPED.indexOf(module) >= 0 || module === 'admins');
}

// ───────────────────────────── ADMIN ACTIONS ─────────────────────────────
function dashboard_(me) {
  const out = { me: publicAdmin_(me), counts: {} };
  ['editions', 'speakers', 'sponsors', 'departments', 'team', 'tasks', 'submissions', 'registrations', 'stewards', 'referrals'].forEach(function (m) {
    if (!can_(me, m, false)) return;
    let rows = readAll_(MODULES[m]);
    if (deptLocked_(me, m)) rows = rows.filter(function (r) { return r.department_id === me.department_id; });
    const c = { total: rows.length };
    if (m === 'submissions') c.new = rows.filter(function (r) { return r.status === 'New'; }).length;
    if (m === 'referrals') c.new = rows.filter(function (r) { return r.status === 'Received'; }).length;
    if (m === 'tasks') { TASK_STATUSES.forEach(function (s) { c[s] = rows.filter(function (r) { return r.status === s; }).length; });
      c.overdue = rows.filter(function (r) { return r.status !== 'Done' && r.due_date && r.due_date < now_().slice(0, 10); }).length; }
    if (m === 'registrations') {
      REG_STATUSES.forEach(function (s) { c[s] = rows.filter(function (r) { return r.status === s; }).length; });
      c.checked_in = rows.filter(function (r) { return truthy_(r.checked_in); }).length;
      c.recent = rows.slice(-5).reverse().map(function (r) { return { name: r.name, status: r.status, created_at: r.created_at }; });
    }
    if (m === 'submissions') c.recent = rows.slice(-5).reverse().map(function (r) { return { name: r.name, type: r.type, status: r.status, created_at: r.created_at }; });
    out.counts[m] = c;
  });
  const mine = readAll_('Tasks').filter(function (t) { return lc_(t.assigned_to) === lc_(me.email); });
  out.myTasks = { open: mine.filter(function (t) { return t.status !== 'Done'; }).length, done: mine.filter(function (t) { return t.status === 'Done'; }).length };
  const s = settingsMap_();
  out.event = { name: s.event_name, date: s.event_date, capacity: s.capacity, registration_open: truthy_(s.registration_open) };
  return Object.assign({ ok: true }, out);
}

function list_(me, module) {
  must_(me, module, false);
  const extra = module === 'tasks' ? { assignees: assignees_(me) } : {};
  let rows = readAll_(MODULES[module]);
  if (deptLocked_(me, module)) rows = rows.filter(function (r) { return r.department_id === me.department_id; });
  if (module === 'admins' || module === 'stewards' || module === 'speakers') rows = rows.map(function (r) { ['salt', 'hash', 'pw_version', 'invite_hash'].forEach(function (k) { delete r[k]; }); return r; });
  if (module === 'speakers') extra.people = readAll_('Admins').filter(function (a) { return truthy_(a.active); }).map(function (a) { return { email: lc_(a.email), name: a.name || a.email }; });
  if (module === 'audit') rows = rows.slice(-500).reverse();
  return Object.assign({ ok: true, rows: rows, canWrite: can_(me, module, true), lists: lookups_() }, extra);
}

function lookups_() {
  return {
    departments: readAll_('Departments').map(function (d) { return { id: d.id, name: d.name }; }),
    editions: readAll_('Editions').map(function (e) { return { id: e.id, name: 'Edition ' + e.number + ' — ' + e.title }; }),
    submissionTypes: SUBMISSION_TYPES, submissionStatuses: SUBMISSION_STATUSES, regStatuses: REG_STATUSES,
    referralStatuses: AIS_STATUSES, taskStatuses: TASK_STATUSES, taskPriorities: TASK_PRIORITIES, roles: ROLES, scopes: EDITABLE_SCOPES,
    sponsorTiers: ['Title', 'Platinum', 'Gold', 'Silver', 'Partner', 'In-kind', 'Media'],
  };
}

function save_(me, module, rec) {
  must_(me, module, true);
  if (module === 'settings' || module === 'audit') throw new Error('Not editable here.');
  if (module === 'admins') return saveAdmin_(me, rec);
  const sheet = MODULES[module];
  const cols = SCHEMA[sheet];
  const clean = {};
  cols.forEach(function (c) { if (rec[c] !== undefined) clean[c] = String(rec[c]).slice(0, 5000); });
  if (deptLocked_(me, module)) clean.department_id = me.department_id;
  if (module === 'stewards') { ['salt', 'hash', 'pw_version', 'email', 'created_at'].forEach(function (k) { delete clean[k]; }); if (!clean.id) throw new Error('Stewards register themselves at /ais/apply.'); }
  if (module === 'speakers') { ['salt', 'hash', 'pw_version', 'invite_hash', 'invite_expires', 'last_login', 'stage'].forEach(function (k) { delete clean[k]; }); if (clean.email) clean.email = lc_(clean.email); if (clean.ambassador_email) clean.ambassador_email = lc_(clean.ambassador_email); }
  let prevStatus = null;
  if (module === 'tasks') {
    if (!clean.title) throw new Error('Give the task a title.');
    if (clean.assigned_to) {
      clean.assigned_to = lc_(clean.assigned_to);
      const ok = assignees_(me).some(function (u) { return u.email === clean.assigned_to; });
      if (!ok) throw new Error('You can only assign tasks to people in your department.');
      if (!clean.department_id) { const u = findAdmin_(clean.assigned_to); if (u) clean.department_id = u.department_id; }
    }
    if (!clean.status) clean.status = 'To do';
    if (!clean.priority) clean.priority = 'Medium';
  }
  const keyCol = cols[0];
  if (module === 'referrals' && !clean.ref) throw new Error('Referrals come in from the Steward Desk.');
  let id = clean[keyCol];
  let prevAssignee = null;
  withLock_(function () {
    if (id) {
      const existing = findRow_(sheet, id);
      if (!existing) throw new Error('Record not found.');
      if (deptLocked_(me, module) && existing.department_id !== me.department_id) throw new Error('That record belongs to another department.');
      if (cols.indexOf('updated_at') >= 0) clean.updated_at = now_();
      delete clean.created_at;
      if (module === 'tasks') { prevAssignee = existing.assigned_to; delete clean.assigned_by; delete clean.comments; }
      if (module === 'referrals') { prevStatus = existing.status; ['cycle', 'steward_id', 'steward_email', 'q1', 'q2', 'q3'].forEach(function (k) { delete clean[k]; }); }
      updateRow_(sheet, id, clean);
    } else {
      id = clean.id = newId_(sheet.slice(0, 2).toUpperCase());
      if (cols.indexOf('created_at') >= 0) clean.created_at = clean.updated_at = now_();
      if (module === 'submissions' && !clean.status) clean.status = 'New';
      if (module === 'registrations' && !clean.status) clean.status = 'Pending';
      if (module === 'tasks') { clean.assigned_by = me.email; clean.comments = ''; }
      appendRow_(sheet, clean);
    }
  });
  if (module === 'referrals' && prevStatus !== null && clean.status && clean.status !== prevStatus) {
    try { aisStatusMail_(id, clean.status); } catch (e) { Logger.log(e); }
  }
  if (module === 'tasks' && clean.assigned_to && lc_(clean.assigned_to) !== lc_(prevAssignee) && lc_(clean.assigned_to) !== lc_(me.email)) {
    try { notifyTask_(clean.assigned_to, Object.assign({ id: id }, clean), me); } catch (e) { Logger.log(e); }
  }
  bust_();
  audit_(me.email, 'save ' + module, id + (clean.name ? ' (' + clean.name + ')' : ''));
  return { ok: true, id: id };
}

function saveAdmin_(me, rec) {
  const email = lc_(rec.email);
  if (!isEmail_(email)) throw new Error('Enter a valid email.');
  let role = ROLES.indexOf(rec.role) >= 0 ? rec.role : 'member';
  let scopes = role === 'super' ? 'all' : role === 'member' ? '' : String(rec.scopes || '').split(',').map(function (s) { return s.trim(); })
    .filter(function (s) { return EDITABLE_SCOPES.indexOf(s) >= 0; }).join(',');
  let dept = role === 'super' ? '' : String(rec.department_id || '');
  const existing = findAdmin_(email);
  if (me.role !== 'super') { // department head adding / editing their own members
    if (existing && (existing.role !== 'member' || existing.department_id !== me.department_id)) throw new Error('You can only manage members of your own department.');
    role = 'member'; scopes = ''; dept = me.department_id;
  }
  const fields = { name: String(rec.name || '').slice(0, 100), role: role, scopes: scopes, department_id: dept, active: truthy_(rec.active) ? 'TRUE' : 'FALSE' };
  if (existing) {
    if (email === lc_(me.email) && (role !== 'super' || fields.active !== 'TRUE')) throw new Error('You can’t remove your own super-admin access.');
    updateRow_('Admins', email, fields);
    audit_(me.email, 'update admin', email + ' → ' + role);
    return { ok: true, id: email };
  }
  const temp = randomPassword_();
  const salt = Utilities.getUuid();
  appendRow_('Admins', Object.assign(fields, { email: email, salt: salt, hash: hash_(temp, salt), must_change: 'TRUE', last_login: '', created_at: now_() }));
  sendWelcome_(email, fields.name, temp, role);
  audit_(me.email, 'add admin', email + ' as ' + role);
  return { ok: true, id: email, invited: true };
}

function resetAdmin_(me, email) {
  must_(me, 'admins', true);
  const a = findAdmin_(email);
  if (!a) throw new Error('Admin not found.');
  if (me.role !== 'super' && (a.role !== 'member' || a.department_id !== me.department_id)) throw new Error('You can only reset members of your own department.');
  const temp = randomPassword_();
  const salt = Utilities.getUuid();
  updateRow_('Admins', a.email, { salt: salt, hash: hash_(temp, salt), must_change: 'TRUE' });
  sendWelcome_(a.email, a.name, temp, a.role, true);
  audit_(me.email, 'reset admin password', a.email);
  return { ok: true };
}

function remove_(me, module, id) {
  must_(me, module, true);
  if (['settings', 'audit'].indexOf(module) >= 0) throw new Error('Not removable.');
  if (module === 'admins' && lc_(id) === lc_(me.email)) throw new Error('You can’t delete yourself.');
  if (module === 'admins' && me.role !== 'super') { const t = findAdmin_(id); if (!t || t.role !== 'member') throw new Error('You can only remove members of your own department.'); }
  const sheet = MODULES[module];
  withLock_(function () {
    const row = findRow_(sheet, id);
    if (!row) throw new Error('Record not found.');
    if (deptLocked_(me, module) && row.department_id !== me.department_id) throw new Error('That record belongs to another department.');
    deleteRow_(sheet, id);
  });
  bust_();
  audit_(me.email, 'delete ' + module, String(id));
  return { ok: true };
}

function saveSettings_(me, map) {
  must_(me, 'settings', true);
  withLock_(function () {
    const existing = settingsMap_();
    Object.keys(map).forEach(function (k) {
      const key = String(k).replace(/[^a-z0-9_]/gi, '').toLowerCase();
      if (!key) return;
      const v = String(map[k]).slice(0, 5000);
      if (existing[key] === undefined) appendRow_('Settings', { key: key, value: v });
      else updateRow_('Settings', key, { value: v });
    });
  });
  bust_();
  audit_(me.email, 'save settings', Object.keys(map).join(', '));
  return { ok: true };
}

function reply_(me, id, message) {
  must_(me, 'submissions', true);
  message = String(message || '').trim();
  if (!message) throw new Error('Write a reply first.');
  const r = findRow_('Submissions', id);
  if (!r) throw new Error('Submission not found.');
  if (deptLocked_(me, 'submissions') && r.department_id !== me.department_id) throw new Error('That submission belongs to another department.');
  mail_(r.email, 'Re: ' + (r.subject || 'Your message to TEDxThaltej Youth'),
    emailShell_('Hello ' + esc_(String(r.name).split(' ')[0]) + ',',
      '<div style="white-space:pre-wrap">' + esc_(message) + '</div>' +
      '<p style="margin-top:24px">— ' + esc_(me.name || 'Team') + ', TEDxThaltej Youth</p>' +
      '<hr style="border:none;border-top:1px solid #eee;margin:24px 0"><p style="color:#888;font-size:13px">Your message (' + r.id + '):<br>' + esc_(r.message) + '</p>'));
  const note = (r.notes ? r.notes + '\n' : '') + '[' + now_() + '] ' + me.email + ' replied: ' + message.slice(0, 500);
  updateRow_('Submissions', id, { status: 'Replied', notes: note, updated_at: now_() });
  audit_(me.email, 'reply submission', id);
  return { ok: true };
}

function decide_(me, id, status, message) {
  must_(me, 'registrations', true);
  if (REG_STATUSES.indexOf(status) < 0) throw new Error('Unknown status.');
  const r = findRow_('Registrations', id);
  if (!r) throw new Error('Registration not found.');
  const s = settingsMap_();
  const patch = { status: status, updated_at: now_() };
  if (status === 'Approved' && !r.ticket_code) patch.ticket_code = ticketCode_();
  updateRow_('Registrations', id, patch);
  const first = esc_(String(r.name).split(' ')[0]);
  const extra = message ? '<p style="white-space:pre-wrap">' + esc_(message) + '</p>' : '';
  const ev = esc_(s.event_name || 'TEDxThaltej Youth');
  let html;
  if (status === 'Approved') {
    const code = patch.ticket_code || r.ticket_code;
    html = emailShell_('Your seat is confirmed, ' + first + '!',
      '<p>We’re delighted to confirm your seat at <b>' + ev + '</b>.</p>' +
      '<table style="width:100%;border:2px dashed #e62b1e;border-radius:12px;margin:20px 0" cellpadding="18"><tr><td>' +
      '<div style="font-size:12px;letter-spacing:2px;color:#888">TICKET CODE</div>' +
      '<div style="font-size:30px;font-weight:800;letter-spacing:4px">' + code + '</div>' +
      '<div style="margin-top:10px">' + esc_(prettyDate_(s.event_date)) + (s.event_time ? ' · ' + esc_(s.event_time) : '') + '<br>' + esc_(s.venue || '') + '</div>' +
      '</td></tr></table><p>Please show this code at the entry desk.</p>' + extra);
  } else if (status === 'Waitlisted') {
    html = emailShell_('You’re on the waitlist, ' + first + '.', '<p>All seats for <b>' + ev + '</b> are currently allotted. You’re on our waitlist and we’ll email you if a seat opens up.</p>' + extra);
  } else if (status === 'Rejected') {
    html = emailShell_('Thank you for registering, ' + first + '.', '<p>We received many more registrations for <b>' + ev + '</b> than we have seats, and we’re unable to offer you a seat this time. We hope to see you at a future edition.</p>' + extra);
  } else if (status === 'Cancelled') {
    html = emailShell_('Registration cancelled', '<p>Your registration for <b>' + ev + '</b> has been cancelled.</p>' + extra);
  }
  if (html) mail_(r.email, ev + ' — registration ' + status.toLowerCase(), html);
  audit_(me.email, 'registration ' + status, id);
  return { ok: true, ticket_code: patch.ticket_code || r.ticket_code };
}

function checkIn_(me, id, value) {
  must_(me, 'registrations', true);
  const r = findRow_('Registrations', id);
  if (!r) throw new Error('Registration not found.');
  if (r.status !== 'Approved' && value) throw new Error('Only approved registrations can be checked in.');
  updateRow_('Registrations', id, { checked_in: value ? 'TRUE' : 'FALSE', updated_at: now_() });
  audit_(me.email, value ? 'check-in' : 'undo check-in', id);
  return { ok: true };
}

// ───────────────────────────── TASKS ─────────────────────────────
/** People this user may assign tasks to. */
function assignees_(me) {
  const users = readAll_('Admins').filter(function (u) { return truthy_(u.active); });
  let pool;
  if (me.role === 'super') pool = users;
  else if (!can_(me, 'tasks', true)) pool = [];
  else if (me.department_id) pool = users.filter(function (u) { return u.department_id === me.department_id; });
  else pool = users;
  return pool.map(function (u) { return { email: lc_(u.email), name: u.name || u.email, department_id: u.department_id, role: u.role }; });
}

function myTasks_(me) {
  const rows = readAll_('Tasks').filter(function (t) { return lc_(t.assigned_to) === lc_(me.email); });
  return { ok: true, rows: rows, lists: { taskStatuses: TASK_STATUSES, departments: readAll_('Departments').map(function (d) { return { id: d.id, name: d.name }; }) } };
}

function updateMyTask_(me, id, status, comment) {
  const t = findRow_('Tasks', id);
  if (!t) throw new Error('Task not found.');
  const mine = lc_(t.assigned_to) === lc_(me.email);
  const manager = can_(me, 'tasks', true) && (!deptLocked_(me, 'tasks') || t.department_id === me.department_id);
  if (!mine && !manager) throw new Error('This task isn’t assigned to you.');
  const patch = { updated_at: now_() };
  if (status) { if (TASK_STATUSES.indexOf(status) < 0) throw new Error('Unknown status.'); patch.status = status; }
  comment = String(comment || '').trim().slice(0, 1000);
  if (comment || status) {
    const line = '[' + now_().replace('T', ' ').slice(0, 16) + '] ' + (me.name || me.email) + ': ' + (status && status !== t.status ? '(' + status + ') ' : '') + comment;
    patch.comments = (t.comments ? t.comments + '\n' : '') + line;
  }
  updateRow_('Tasks', id, patch);
  audit_(me.email, 'task update', id + (status ? ' → ' + status : ''));
  if (mine && t.assigned_by && lc_(t.assigned_by) !== lc_(me.email)) {
    try {
      mail_(t.assigned_by, 'Task update: ' + t.title, emailShell_('Task update',
        '<p><b>' + esc_(me.name || me.email) + '</b> updated <b>' + esc_(t.title) + '</b>' + (status ? ' to <b>' + esc_(status) + '</b>' : '') + '.</p>' +
        (comment ? '<p style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px">' + esc_(comment) + '</p>' : '') +
        '<p><a href="' + CONFIG.ADMIN_URL + '">Open the portal</a></p>'));
    } catch (e) { Logger.log(e); }
  }
  return { ok: true };
}

function notifyTask_(to, t, me) {
  mail_(to, 'New task: ' + t.title, emailShell_('You have a new task',
    '<p><b>' + esc_(me.name || me.email) + '</b> assigned you a task.</p>' +
    '<table cellpadding="6" style="font-size:15px"><tr><td style="color:#888">Task</td><td><b>' + esc_(t.title) + '</b></td></tr>' +
    (t.due_date ? '<tr><td style="color:#888">Due</td><td>' + esc_(prettyDate_(t.due_date)) + '</td></tr>' : '') +
    '<tr><td style="color:#888">Priority</td><td>' + esc_(t.priority || 'Medium') + '</td></tr></table>' +
    (t.description ? '<p style="white-space:pre-wrap">' + esc_(t.description) + '</p>' : '') +
    '<p><a href="' + CONFIG.ADMIN_URL + '" style="display:inline-block;background:#e62b1e;color:#fff;padding:12px 22px;border-radius:30px;text-decoration:none;font-weight:700">Open my tasks</a></p>'));
}

// ───────────────────────────── EMAIL ─────────────────────────────
function emailShell_(title, inner) {
  return '<div style="background:#f4f4f4;padding:32px 12px;font-family:Helvetica,Arial,sans-serif;color:#111">' +
    '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden">' +
    '<div style="background:#000;padding:22px 28px;font-size:20px;font-weight:800;color:#fff">' +
    '<span style="color:#e62b1e">TEDx</span>Thaltej <span style="font-weight:400">Youth</span></div>' +
    '<div style="padding:30px 28px;font-size:15px;line-height:1.6"><h2 style="margin:0 0 16px;font-size:22px">' + title + '</h2>' + inner + '</div>' +
    '<div style="padding:18px 28px;background:#fafafa;font-size:12px;color:#888">' +
    'This independent TEDx event is operated under license from TED.<br>' +
    '<a href="' + CONFIG.SITE_URL + '" style="color:#e62b1e">' + CONFIG.SITE_URL.replace('https://', '') + '</a></div></div></div>';
}

function mail_(to, subject, html, extra) {
  extra = extra || {};
  // Zoho Mail when connected (Team Portal → Site settings); Gmail of the script owner otherwise, or if Zoho fails.
  if (zohoConnected_()) {
    try { zohoSend_(to, subject, html, extra); return; }
    catch (e) { PropertiesService.getScriptProperties().setProperty('ZOHO_LAST_ERROR', now_() + ' · ' + String(e.message || e).slice(0, 300)); Logger.log('Zoho failed, using Gmail: ' + e); }
  }
  const opts = { htmlBody: html, name: extra.name || CONFIG.SENDER_NAME };
  if (extra.replyTo || CONFIG.REPLY_TO) opts.replyTo = extra.replyTo || CONFIG.REPLY_TO;
  if (extra.attachments) opts.attachments = extra.attachments;
  if (CONFIG.FROM_ALIAS && GmailApp.getAliases().indexOf(CONFIG.FROM_ALIAS) >= 0) opts.from = CONFIG.FROM_ALIAS;
  GmailApp.sendEmail(to, subject, 'Please view this email in an HTML-capable client.', opts);
}

function sendWelcome_(email, name, temp, role, isReset) {
  mail_(email, isReset ? 'Your admin password was reset — TEDxThaltej Youth' : 'You’ve been added to the TEDxThaltej Youth admin console',
    emailShell_((isReset ? 'Password reset' : 'Welcome aboard') + (name ? ', ' + esc_(String(name).split(' ')[0]) : '') + '.',
      '<p>' + (isReset ? 'A super-admin reset your password.' : 'You now have <b>' + esc_(role) + '</b> access to the admin console.') + '</p>' +
      '<p>Email: <b>' + esc_(email) + '</b><br>Temporary password: <b style="font-family:monospace;font-size:17px">' + temp + '</b></p>' +
      '<p>You’ll be asked to set your own password on first sign-in.</p>' +
      '<p><a href="' + CONFIG.ADMIN_URL + '" style="display:inline-block;background:#e62b1e;color:#fff;padding:12px 22px;border-radius:30px;text-decoration:none;font-weight:700">Open admin console</a></p>'));
}

function notifyTeam_(subject, rec) {
  const to = settingsMap_().notify_email;
  if (!to) return;
  try {
    mail_(to, subject, emailShell_(esc_(subject),
      '<p><b>' + esc_(rec.name) + '</b> &lt;' + esc_(rec.email) + '&gt;' + (rec.organisation ? ' · ' + esc_(rec.organisation) : '') + '</p>' +
      '<p style="white-space:pre-wrap">' + esc_(rec.message) + '</p><p><a href="' + CONFIG.ADMIN_URL + '">Open in admin console</a></p>'));
  } catch (e) { Logger.log(e); }
}

// ───────────────────────────── SHEET HELPERS ─────────────────────────────
function sh_(name) {
  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!s) throw new Error('Missing tab "' + name + '". Run setup() first.');
  return s;
}

function readAll_(name) {
  const s = sh_(name);
  const last = s.getLastRow();
  if (last < 2) return [];
  const cols = SCHEMA[name];
  const tz = Session.getScriptTimeZone();
  return s.getRange(2, 1, last - 1, cols.length).getValues().map(function (row, i) {
    const o = { _row: i + 2 };
    cols.forEach(function (c, j) {
      let v = row[j];
      if (v instanceof Date) v = Utilities.formatDate(v, tz, (v.getHours() || v.getMinutes()) ? "yyyy-MM-dd'T'HH:mm:ss" : 'yyyy-MM-dd');
      else if (typeof v === 'boolean') v = v ? 'TRUE' : 'FALSE';
      o[c] = v === null || v === undefined ? '' : String(v);
    });
    return o;
  }).filter(function (o) { return o[cols[0]] !== ''; }).map(function (o) { const r = o._row; delete o._row; Object.defineProperty(o, '_row', { value: r, enumerable: false }); return o; });
}

function findRow_(name, key) {
  key = String(key);
  const k0 = SCHEMA[name][0];
  const isEmailKey = k0 === 'email';
  return readAll_(name).filter(function (r) { return isEmailKey ? lc_(r[k0]) === lc_(key) : r[k0] === key; })[0] || null;
}
function findAdmin_(email) { return email ? findRow_('Admins', lc_(email)) : null; }

function safeCell_(v) {
  v = v === undefined || v === null ? '' : String(v);
  return /^[=+\-@]/.test(v) ? "'" + v : v; // stop formula injection; keeps "+91…" phone numbers as text
}

function appendRow_(name, obj) {
  const cols = SCHEMA[name];
  const s = sh_(name);
  const r = s.getLastRow() + 1;
  const range = s.getRange(r, 1, 1, cols.length);
  range.setNumberFormat('@');
  range.setValues([cols.map(function (c) { return safeCell_(obj[c]); })]);
}

function updateRow_(name, key, patch) {
  const row = findRow_(name, key);
  if (!row) throw new Error('Record not found.');
  const cols = SCHEMA[name];
  const merged = cols.map(function (c) { return safeCell_(patch[c] !== undefined && c !== cols[0] ? patch[c] : row[c]); });
  sh_(name).getRange(row._row, 1, 1, cols.length).setValues([merged]);
}

function deleteRow_(name, key) {
  const row = findRow_(name, key);
  if (row) sh_(name).deleteRow(row._row);
}

function settingsMap_() {
  const m = {};
  readAll_('Settings').forEach(function (r) { m[r.key] = r.value; });
  return m;
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('The system is busy. Please try again.');
  try { return fn(); } finally { lock.releaseLock(); }
}

function audit_(email, action, detail) {
  try { appendRow_('Audit', { time: now_(), email: email, action: action, detail: String(detail || '').slice(0, 500) }); } catch (e) { Logger.log(e); }
}

function bust_() { CacheService.getScriptCache().removeAll(['site', 'teamfeed']); }

// ───────────────────────────── UTIL ─────────────────────────────
function now_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss"); }
function lc_(s) { return String(s || '').trim().toLowerCase(); }
function truthy_(v) { return ['true', 'yes', '1', 'y'].indexOf(lc_(v)) >= 0; }
function pub_(r) { return truthy_(r.published); }
function isEmail_(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '')); }
function esc_(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function by_(k, num) { return function (a, b) { return num ? (parseFloat(a[k]) || 999) - (parseFloat(b[k]) || 999) : String(a[k]).localeCompare(String(b[k])); }; }
function newId_(p) { return p + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase(); }
function ticketCode_() { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = 'TXTY-'; for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }
function randomPassword_() { const c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 10; i++) s += c[Math.floor(Math.random() * c.length)]; return s + Math.floor(Math.random() * 9 + 1); }

function hash_(text, salt) {
  let h = String(salt) + '|' + String(text);
  for (let i = 0; i < CONFIG.HASH_ROUNDS; i++) {
    h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + salt, Utilities.Charset.UTF_8));
  }
  return h;
}

function clean_(b, limits) {
  const o = {};
  Object.keys(limits).forEach(function (k) { o[k] = String(b[k] === undefined ? '' : b[k]).trim().slice(0, limits[k]); });
  if (o.email !== undefined) o.email = lc_(o.email);
  return o;
}

function rateLimit_(key, max, seconds) {
  const c = CacheService.getScriptCache();
  const n = parseInt(c.get('rl_' + key) || '0', 10);
  if (n >= max) throw new Error('Too many attempts. Please try again later.');
  c.put('rl_' + key, String(n + 1), seconds);
}

function prettyDate_(d) {
  if (!d) return '';
  const p = String(d).slice(0, 10).split('-');
  if (p.length !== 3) return d;
  const dt = new Date(+p[0], +p[1] - 1, +p[2]);
  return Utilities.formatDate(dt, Session.getScriptTimeZone(), 'EEEE, d MMMM yyyy');
}
