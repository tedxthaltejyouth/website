/**
 * Sign in with Google.
 *  • Every member connects a Google account once (any Google account; it doesn't have to match the portal email).
 *    When the Organizer turns on "Require Google" (default once a Client ID is set), the next sign-in asks for it and
 *    nothing else in the portal works until it's connected.
 *  • After that, "Sign in with Google" works on the sign-in page. Members with privileged access still get the emailed
 *    code on a new device, like a password sign-in.
 *  • Only the basic sign-in data (name, email, account ID) is used, so Google shows no "unverified app" warning, and the
 *    site never gets access to anyone's Gmail or Drive.
 * Setup: Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → Web application, authorised
 * JavaScript origin https://tedxthaltejyouth.in. Paste the Client ID in Team Portal → Sign-in & security.
 */
function gConf_() {
  const s = settingsMap_(), id = String(s.google_client_id || '').trim();
  return { client_id: id, required: !!id && s.google_required !== 'FALSE' };
}
/** Checks a Google ID token with Google and returns the verified account. */
function gVerify_(credential) {
  const c = gConf_(); if (!c.client_id) throw new Error('Google sign-in is not set up yet.');
  const t = String(credential || '');
  if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(t) || t.length > 4096) throw new Error('Google sign-in failed. Please try again.');
  const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(t), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('Google could not confirm this sign-in. Please try again.');
  const p = JSON.parse(r.getContentText());
  if (p.aud !== c.client_id) throw new Error('This Google sign-in was not made for this site.');
  if (['accounts.google.com', 'https://accounts.google.com'].indexOf(p.iss) < 0) throw new Error('Google sign-in failed.');
  if (String(p.email_verified) !== 'true') throw new Error('That Google account’s email is not verified.');
  if ((+p.exp || 0) * 1000 < Date.now()) throw new Error('That Google sign-in expired. Please try again.');
  return { sub: String(p.sub), email: lc_(p.email), name: String(p.name || '') };
}
function needsGoogle_(a) { return gConf_().required && !a.google_sub; }
function googleLink_(me, b) {
  const g = gVerify_(b.credential);
  const other = readAll_('Admins').filter(function (x) { return x.google_sub === g.sub && lc_(x.email) !== lc_(me.email); })[0];
  if (other) throw new Error('That Google account is already connected to another portal user. Use a different one.');
  updateRow_('Admins', lc_(me.email), { google_sub: g.sub, google_email: g.email, google_linked_at: now_() });
  audit_(me.email, 'Google connected', g.email);
  try { mail_(me.email, 'Google account connected to your Team Portal', emailShell_('Google connected',
    '<p>The Google account <b>' + esc_(g.email) + '</b> is now connected to your TEDxThaltej Youth Team Portal account. You can use <b>Sign in with Google</b> from now on.</p><p>Wasn’t you? Tell the Organizer straight away.</p>')); } catch (e) { }
  return { ok: true, me: publicAdmin_(findAdmin_(me.email)) };
}
function googleUnlink_(me, b) {
  const target = b.email && me.role === 'super' ? findAdmin_(b.email) : me;
  if (!target) throw new Error('User not found.');
  if (lc_(target.email) === lc_(me.email) && gConf_().required) throw new Error('A Google account is required. Connect a different one instead.');
  updateRow_('Admins', lc_(target.email), { google_sub: '', google_email: '', google_linked_at: '' });
  audit_(me.email, 'Google disconnected', target.email);
  return { ok: true };
}
function loginGoogle_(b) {
  const g = gVerify_(b.credential);
  rateLimit_('glogin_' + g.sub, 10, 900);
  const a = readAll_('Admins').filter(function (x) { return x.google_sub === g.sub; })[0];
  if (!a) throw new Error('This Google account isn’t connected to a Team Portal account yet. Sign in with your email and password once, then connect Google.');
  return finishLogin_(a, b, 'Google (' + g.email + ')');
}
function googleSettings_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer sets up Google sign-in.');
  const map = {};
  if (b.client_id != null) { const v = String(b.client_id).trim(); if (v && !/^[\w-]+\.apps\.googleusercontent\.com$/.test(v)) throw new Error('Paste the Client ID, ending in .apps.googleusercontent.com'); map.google_client_id = v; }
  if (b.required != null) map.google_required = b.required ? 'TRUE' : 'FALSE';
  if (Object.keys(map).length) withLock_(function () { const ex = settingsMap_(); Object.keys(map).forEach(function (k) { if (ex[k] === undefined) appendRow_('Settings', { key: k, value: map[k] }); else updateRow_('Settings', k, { value: map[k] }); }); });
  if (Object.keys(map).length) { bust_(); audit_(me.email, 'Google sign-in settings', JSON.stringify(map)); }
  const g = gConf_(), linked = readAll_('Admins').filter(function (x) { return truthy_(x.active); });
  return { ok: true, client_id: g.client_id, required: g.required, linked: linked.filter(function (x) { return x.google_sub; }).length, total: linked.length };
}
