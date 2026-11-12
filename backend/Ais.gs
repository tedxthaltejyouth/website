/**
 * Ahmedabad Idea Search — Steward Desk backend (/ais/apply)
 * Same request/response contract the Steward Desk page already uses; the page sends
 * actions prefixed with "ais_" so they never clash with Team Portal actions.
 * Steward accounts are separate from team accounts and live in the Stewards tab.
 */

const AIS_STATUSES = ['Received', 'Listening', 'In development', 'Passed to curation', 'Closed'];
const AIS_SESSION_MIN = 25;
const AIS_CODE_MIN = 10;
const AIS_AUTH = { ok: false, code: 'AUTH', error: 'Your session has ended. Please sign in again.' };
const AIS_MAIL = { name: 'Ahmedabad Idea Search', replyTo: 'ais@tedxthaltejyouth.in' };

function aisHandle_(a, d) {
  const email = lc_(d.email);
  switch (a) {
    case 'register':       return aisRegister_(d);
    case 'verifyEmail':    return aisVerify_(email, d.code);
    case 'resendCode':     return aisResend_(email, d.purpose);
    case 'login':          return aisLogin_(email, d.password);
    case 'forgot':         return aisForgot_(email);
    case 'reset':          return aisReset_(email, d.code, d.password);
    case 'me': {
      const s = aisAuth_(d.token); if (!s) return AIS_AUTH;
      return { ok: true, user: aisProfile_(s.st), expiresIn: Math.ceil((s.exp - Date.now()) / 1000) };
    }
    case 'logout':         CacheService.getScriptCache().remove('aiss_' + d.token); return { ok: true };
    case 'changePassword': return aisChangePassword_(d);
    case 'refer':          return aisRefer_(d);
    case 'myReferrals':    return aisMyReferrals_(d.token);
  }
  return { ok: false, error: 'Unknown action.' };
}

// ───────── accounts ─────────
function aisFindByEmail_(email) {
  return readAll_('Stewards').filter(function (s) { return lc_(s.email) === email; })[0] || null;
}

function aisPwOk_(p) { p = String(p || ''); return p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p); }
const AIS_PW_RULE = 'Use at least 8 characters, with at least one letter and one number.';

function aisRegister_(d) {
  const email = lc_(d.email);
  if (d.website) return { ok: true, step: 'verify', email: email }; // honeypot
  const f = clean_(d, { name: 100, email: 120, phone: 30, city: 80, community: 150 });
  if (f.name.length < 2) throw new Error('Please enter your full name.');
  if (!isEmail_(f.email)) throw new Error('Please enter a valid email address.');
  if (!/^\+?\d{10,15}$/.test(String(f.phone).replace(/[\s\-().]/g, ''))) throw new Error('Please enter a valid phone number, for example +91 98765 43210.');
  if (f.city.length < 2) throw new Error('Please enter your city of residence.');
  if (!aisPwOk_(d.password)) throw new Error(AIS_PW_RULE);
  if (!(d.agreePathway && d.agreeData && d.agreeAge)) throw new Error('Please confirm the three statements.');
  if (aisFindByEmail_(email)) throw new Error('An account with this email already exists. Please sign in, or use “Forgot password”.');
  rateLimit_('aisreg_' + email, 5, 3600);
  const salt = Utilities.getUuid();
  f.salt = salt; f.hash = hash_(String(d.password), salt);   // never keep the plain password, even briefly
  aisSendCode_(email, 'register', f, f.name);
  return { ok: true, step: 'verify', email: email };
}

function aisSendCode_(email, purpose, data, name) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  CacheService.getScriptCache().put('aisc_' + purpose + '_' + email,
    JSON.stringify({ h: hash_(code, email), n: 0, d: data || null }), AIS_CODE_MIN * 60);
  const reg = purpose === 'register';
  mail_(email, (reg ? 'Your Idea Steward code: ' : 'Your password reset code: ') + code,
    aisShell_(reg ? 'Confirm your email' : 'Reset your password',
      '<p>Hello ' + esc_(String(name || 'there').split(' ')[0]) + ',</p>' +
      '<p>' + (reg ? 'Use this code to confirm your email and finish becoming an Idea Steward.' : 'Use this code to set a new password for your Steward Desk account.') +
      ' It expires in ' + AIS_CODE_MIN + ' minutes.</p>' +
      '<p style="font-size:34px;letter-spacing:8px;font-weight:900;margin:22px 0;color:#1B2150">' + code + '</p>' +
      '<p style="color:#8C6A3C">If you did not ask for this, you can ignore this email.</p>'), AIS_MAIL);
}

function aisCheckCode_(email, purpose, code) {
  const cache = CacheService.getScriptCache(), key = 'aisc_' + purpose + '_' + email, raw = cache.get(key);
  if (!raw) throw new Error(purpose === 'register' ? 'This code has expired. Please register again.' : 'This code has expired. Please ask for a new one.');
  const o = JSON.parse(raw);
  if (o.n >= 5) { cache.remove(key); throw new Error('Too many attempts. Please ask for a new code.'); }
  if (hash_(String(code || '').trim(), email) !== o.h) {
    o.n++; cache.put(key, JSON.stringify(o), AIS_CODE_MIN * 60);
    throw new Error('That code is not right. Please check the email and try again.');
  }
  cache.remove(key);
  return o;
}

function aisVerify_(email, code) {
  const o = aisCheckCode_(email, 'register', code), p = o.d;
  let st;
  withLock_(function () {
    if (aisFindByEmail_(email)) throw new Error('An account with this email already exists. Please sign in.');
    const n = readAll_('Stewards').length + 1;
    st = { id: 'AIS-S-' + ('000' + n).slice(-4), name: p.name, email: email, phone: p.phone, city: p.city, community: p.community,
      salt: p.salt, hash: p.hash, pw_version: '1', active: 'TRUE', created_at: now_(), last_login: now_() };
    appendRow_('Stewards', st);
  });
  try {
    mail_(email, 'Welcome, Idea Steward — ' + st.id, aisShell_('Welcome to the Steward Desk.',
      '<p>Hello ' + esc_(st.name.split(' ')[0]) + ', thank you for helping Amdavad hear its own ideas.</p>' +
      '<p>Your Steward ID is <b>' + st.id + '</b>. Sign in at <a href="' + CONFIG.SITE_URL + '/ais/apply">' + CONFIG.SITE_URL.replace('https://', '') + '/ais/apply</a> to refer an idea and follow your referrals.</p>' +
      '<p style="background:#F6ECDA;padding:14px 16px;border-radius:12px">AIS is a pathway, not the gate. Being a Steward, or referring someone, never means selection to speak at TEDxThaltej Youth.</p>'), AIS_MAIL);
  } catch (e) { Logger.log(e); }
  return aisSession_(st);
}

function aisResend_(email, purpose) {
  rateLimit_('aisresend_' + email, 5, 3600);
  const cache = CacheService.getScriptCache();
  if (purpose === 'register') {
    const raw = cache.get('aisc_register_' + email);
    if (!raw) throw new Error('This code has expired. Please register again.');
    const d = JSON.parse(raw).d;
    aisSendCode_(email, 'register', d, d.name);
  } else {
    const st = aisFindByEmail_(email);
    if (st && truthy_(st.active)) aisSendCode_(email, 'reset', null, st.name);
  }
  return { ok: true, message: 'A new code is on its way.' };
}

function aisLogin_(email, password) {
  rateLimit_('aislogin_' + email, 8, 900);
  const st = aisFindByEmail_(email);
  if (!st || hash_(String(password || ''), st.salt) !== st.hash) throw new Error('That email and password do not match. Please try again.');
  if (!truthy_(st.active)) throw new Error('This Steward account is paused. Please write to ais@tedxthaltejyouth.in.');
  if (lockActive_(st)) throw new Error(lockMessage_(st));
  updateRow_('Stewards', st.id, { last_login: now_() });
  return aisSession_(st);
}

function aisForgot_(email) {
  rateLimit_('aisforgot_' + email, 4, 900);
  const st = aisFindByEmail_(email);
  if (st && truthy_(st.active)) aisSendCode_(email, 'reset', null, st.name);
  return { ok: true, step: 'reset', email: email }; // same answer whether or not the account exists
}

function aisReset_(email, code, password) {
  if (!aisPwOk_(password)) throw new Error(AIS_PW_RULE);
  aisCheckCode_(email, 'reset', code);
  const st = aisFindByEmail_(email);
  if (!st) throw new Error('This code has expired. Please ask for a new one.');
  const salt = Utilities.getUuid();
  updateRow_('Stewards', st.id, { salt: salt, hash: hash_(String(password), salt), pw_version: String((parseInt(st.pw_version, 10) || 1) + 1) });
  try { mail_(email, 'Your Steward Desk password was reset', aisShell_('Password reset', '<p>Your password was just reset. If this was not you, write to ais@tedxthaltejyouth.in straight away.</p>'), AIS_MAIL); } catch (e) { Logger.log(e); }
  return { ok: true };
}

function aisChangePassword_(d) {
  const s = aisAuth_(d.token); if (!s) return AIS_AUTH;
  if (hash_(String(d.current || ''), s.st.salt) !== s.st.hash) throw new Error('Your current password is not right.');
  if (!aisPwOk_(d.password)) throw new Error(AIS_PW_RULE);
  const salt = Utilities.getUuid(), v = String((parseInt(s.st.pw_version, 10) || 1) + 1);
  updateRow_('Stewards', s.st.id, { salt: salt, hash: hash_(String(d.password), salt), pw_version: v });
  CacheService.getScriptCache().remove('aiss_' + d.token);
  s.st.pw_version = v;
  try { mail_(s.st.email, 'Your Steward Desk password was changed', aisShell_('Password changed', '<p>Your password was changed and any other sign-ins were ended. If this was not you, write to ais@tedxthaltejyouth.in.</p>'), AIS_MAIL); } catch (e) { Logger.log(e); }
  const r = aisSession_(s.st, s.exp);
  r.message = 'Password changed. Any other sign-ins have been ended.';
  return r;
}

// ───────── sessions (25 minutes, fixed, not renewed) ─────────
function aisSession_(st, exp) {
  exp = exp || Date.now() + AIS_SESSION_MIN * 60000;
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const secs = Math.max(1, Math.ceil((exp - Date.now()) / 1000));
  CacheService.getScriptCache().put('aiss_' + token, JSON.stringify({ id: st.id, v: String(st.pw_version || '1'), exp: exp }), secs);
  return { ok: true, token: token, expiresIn: secs, user: aisProfile_(st) };
}

function aisAuth_(token) {
  if (!token) return null;
  const raw = CacheService.getScriptCache().get('aiss_' + token);
  if (!raw) return null;
  const s = JSON.parse(raw);
  if (Date.now() >= s.exp) return null;
  const st = findRow_('Stewards', s.id);
  if (!st || !truthy_(st.active) || lockActive_(st) || String(st.pw_version || '1') !== s.v) return null; // password change ends other sign-ins
  return { st: st, exp: s.exp };
}

function aisCycle_() { return settingsMap_().ais_cycle || '2627'; }

function aisProfile_(st) {
  const set = settingsMap_(), limit = parseInt(set.ais_referral_limit, 10) || 5, cycle = set.ais_cycle || '2627';
  const used = readAll_('Referrals').filter(function (r) { return r.steward_id === st.id && r.cycle === cycle; }).length;
  return { id: st.id, name: st.name, email: st.email, city: st.city, community: st.community, limit: limit, remaining: Math.max(0, limit - used) };
}

// ───────── referrals ─────────
function aisWords_(s) { return (String(s || '').trim().match(/\S+/g) || []).length; }

function aisRefer_(d) {
  const s = aisAuth_(d.token); if (!s) return AIS_AUTH;
  if (d.website) return { ok: true, ref: 'AIS-0000', remaining: aisProfile_(s.st).remaining };
  const f = clean_(d, { personName: 100, personRole: 60, ageGroup: 20, language: 20, contact: 150, q1: 4000, q2: 4000, q3: 4000 });
  if (!f.personName || !f.personRole || !f.ageGroup || !f.language) throw new Error('Please complete the details about the person.');
  for (let i = 1; i <= 3; i++) if (aisWords_(f['q' + i]) < 10) throw new Error('Please answer question ' + i + ' in a little more detail (a few sentences).');
  const minor = f.ageGroup === 'Under 18';
  if (!d.consentAware) throw new Error('Please confirm that the person knows about this referral.');
  if (minor && !d.consentGuardian) throw new Error('For anyone under 18, please confirm that a parent or guardian is aware.');
  if (!d.consentNotSelection) throw new Error('Please confirm that you understand AIS is a pathway, not a gate.');
  rateLimit_('aisrefer_' + s.st.id, 10, 3600);
  const cycle = aisCycle_();
  let ref, remaining;
  withLock_(function () {
    const prof = aisProfile_(s.st);
    if (prof.remaining <= 0) throw new Error('You have used all your referrals for this cycle.');
    const n = readAll_('Referrals').filter(function (r) { return r.cycle === cycle; }).length + 1;
    ref = 'AIS-' + cycle + '-' + ('000' + n).slice(-4);
    appendRow_('Referrals', { ref: ref, cycle: cycle, steward_id: s.st.id, steward_email: s.st.email, person_name: f.personName, person_role: f.personRole,
      age_group: f.ageGroup, language: f.language, contact: minor ? '' : f.contact, q1: f.q1, q2: f.q2, q3: f.q3,
      guardian_aware: minor ? 'TRUE' : '', status: 'Received', notes: '', created_at: now_(), updated_at: now_() });
    remaining = prof.remaining - 1;
  });
  try {
    mail_(s.st.email, 'Referral received — ' + ref, aisShell_('Thank you for listening with us.',
      '<p>Your referral of <b>' + esc_(f.personName) + '</b> has reached the AIS team.</p>' +
      '<p style="font-size:22px;font-weight:900;color:#1B2150">' + ref + '</p>' +
      '<p>Every referral is read carefully, in the language it was written in. We may reach out to you first, and then, with consent, to the person whose idea it is.</p>' +
      '<p style="color:#8C6A3C">Most ideas we discover will not become TEDx talks. That is intentional: discovery is valuable on its own.</p>'), AIS_MAIL);
    const to = settingsMap_().ais_notify_email;
    if (to) mail_(to, 'New AIS referral ' + ref + ' from ' + s.st.name, aisShell_('New referral ' + ref,
      '<p><b>' + esc_(f.personName) + '</b> · ' + esc_(f.personRole) + ' · ' + esc_(f.ageGroup) + ' · ' + esc_(f.language) + '</p>' +
      '<p>Referred by ' + esc_(s.st.name) + ' (' + s.st.id + ')</p><p><a href="' + CONFIG.ADMIN_URL + '">Open in the Team Portal</a></p>'), AIS_MAIL);
  } catch (e) { Logger.log(e); }
  return { ok: true, ref: ref, remaining: remaining };
}

function aisMyReferrals_(token) {
  const s = aisAuth_(token); if (!s) return AIS_AUTH;
  const tz = Session.getScriptTimeZone();
  const items = readAll_('Referrals').filter(function (r) { return r.steward_id === s.st.id; }).reverse().map(function (r) {
    let date = r.created_at;
    try { const p = String(r.created_at).slice(0, 10).split('-'); date = Utilities.formatDate(new Date(+p[0], +p[1] - 1, +p[2]), tz, 'd MMM yyyy'); } catch (e) { /* keep raw */ }
    return { ref: r.ref, date: date, person: r.person_name, status: r.status || 'Received' };
  });
  return { ok: true, items: items };
}

/** Called by the Team Portal when a referral's status changes. */
function aisStatusMail_(ref, status) {
  const r = findRow_('Referrals', ref);
  if (!r || !r.steward_email) return;
  const words = {
    'Listening': 'The AIS team is reading it closely and may reach out to you soon.',
    'In development': 'The idea is in conversation with the AIS team and is being developed further.',
    'Passed to curation': 'With consent, the idea has been shared with the independent TEDxThaltej Youth curation team as one input among many. This is not a selection to speak.',
    'Closed': 'Thank you. This referral is now closed. Discovery is valuable on its own, even when an idea does not continue.',
    'Received': 'Your referral is with the AIS team.',
  };
  mail_(r.steward_email, 'Update on your referral ' + ref, aisShell_('Your referral: ' + esc_(status),
    '<p>Referral <b>' + ref + '</b> (' + esc_(r.person_name) + ') is now <b>' + esc_(status) + '</b>.</p><p>' + (words[status] || '') + '</p>' +
    '<p>You can follow all your referrals at <a href="' + CONFIG.SITE_URL + '/ais/apply">the Steward Desk</a>.</p>'), AIS_MAIL);
}

function aisShell_(title, inner) {
  return '<div style="background:#F6ECDA;padding:30px 12px;font-family:Helvetica,Arial,sans-serif;color:#15120F">' +
    '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden">' +
    '<div style="background:#1B2150;padding:22px 28px;color:#fff"><div style="font-size:18px;font-weight:900">Ahmedabad Idea Search</div>' +
    '<div style="font-size:12px;color:#F5A524;letter-spacing:2px;text-transform:uppercase;margin-top:4px">Listening to Amdavad. Discovering its Ideas.</div></div>' +
    '<div style="height:6px;background:linear-gradient(90deg,#EB0028,#F5A524,#0E7F82,#D93B74)"></div>' +
    '<div style="padding:28px;font-size:15px;line-height:1.6"><h2 style="margin:0 0 14px;font-size:22px;color:#1B2150">' + title + '</h2>' + inner + '</div>' +
    '<div style="padding:16px 28px;background:#FBF6EC;font-size:12px;color:#8C6A3C">A year-round initiative of TEDxThaltej Youth. AIS is a pathway, not the gate.<br>This independent TEDx event is operated under license from TED.</div></div></div>';
}
