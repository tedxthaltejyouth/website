/**
 * Email through Zoho Mail (Self Client OAuth), with Gmail as the automatic fallback.
 *
 * Connect once from Team Portal → Site settings → "Email · Zoho Mail" (super-admin only):
 *   1. api-console.zoho.<dc> → Add Client → Self Client → copy Client ID + Client Secret
 *   2. Self Client → Generate Code → paste the scope below → duration 10 minutes → copy the code
 *   3. Paste Client ID, Client Secret, the code, your data centre and the From address into the portal
 * The portal swaps the one-time code for a refresh token. Secrets live in Script Properties,
 * never in the Sheet. Access tokens (1 hour) are refreshed automatically.
 */

const ZOHO_SCOPE = 'ZohoMail.messages.CREATE,ZohoMail.accounts.READ';
const ZOHO_DCS = {
  'in':     { accounts: 'https://accounts.zoho.in',     mail: 'https://mail.zoho.in',     label: 'India (zoho.in)' },
  'com':    { accounts: 'https://accounts.zoho.com',    mail: 'https://mail.zoho.com',    label: 'United States (zoho.com)' },
  'eu':     { accounts: 'https://accounts.zoho.eu',     mail: 'https://mail.zoho.eu',     label: 'Europe (zoho.eu)' },
  'com.au': { accounts: 'https://accounts.zoho.com.au', mail: 'https://mail.zoho.com.au', label: 'Australia (zoho.com.au)' },
  'jp':     { accounts: 'https://accounts.zoho.jp',     mail: 'https://mail.zoho.jp',     label: 'Japan (zoho.jp)' },
};

function zohoProps_() { return PropertiesService.getScriptProperties(); }
function zohoConf_() {
  const p = zohoProps_();
  return { clientId: p.getProperty('ZOHO_CLIENT_ID'), secret: p.getProperty('ZOHO_CLIENT_SECRET'), refresh: p.getProperty('ZOHO_REFRESH_TOKEN'),
    dc: p.getProperty('ZOHO_DC') || 'in', accountId: p.getProperty('ZOHO_ACCOUNT_ID'), from: p.getProperty('ZOHO_FROM'), name: p.getProperty('ZOHO_FROM_NAME') || CONFIG.SENDER_NAME };
}
function zohoConnected_() { const c = zohoConf_(); return !!(c.clientId && c.secret && c.refresh && c.accountId && c.from); }

function zohoTokenCall_(dc, params) {
  const q = Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
  const res = UrlFetchApp.fetch(ZOHO_DCS[dc].accounts + '/oauth/v2/token?' + q, { method: 'post', muteHttpExceptions: true });
  let j = {}; try { j = JSON.parse(res.getContentText()); } catch (e) { /* keep empty */ }
  if (j.error || !j.access_token) {
    const why = { invalid_code: 'The code has expired or was already used. Generate a new code (it lasts only the minutes you chose) and paste it straight away.',
      invalid_client: 'The Client ID or Client Secret is wrong, or the client was created in a different data centre.' }[j.error];
    throw new Error('Zoho said: ' + (why || j.error || ('HTTP ' + res.getResponseCode())));
  }
  return j;
}

function zohoAccessToken_() {
  const cache = CacheService.getScriptCache(), hit = cache.get('zoho_at');
  if (hit) return hit;
  const c = zohoConf_();
  const j = zohoTokenCall_(c.dc, { refresh_token: c.refresh, client_id: c.clientId, client_secret: c.secret, grant_type: 'refresh_token' });
  cache.put('zoho_at', j.access_token, Math.max(60, (parseInt(j.expires_in, 10) || 3600) - 300));
  return j.access_token;
}

function zohoApi_(method, path, body, raw) {
  const c = zohoConf_(), opts = { method: method, muteHttpExceptions: true, headers: { Authorization: 'Zoho-oauthtoken ' + zohoAccessToken_(), Accept: 'application/json' } };
  if (raw) { opts.contentType = 'application/octet-stream'; opts.payload = raw; }
  else if (body) { opts.contentType = 'application/json'; opts.payload = JSON.stringify(body); }
  const res = UrlFetchApp.fetch(ZOHO_DCS[c.dc].mail + path, opts);
  let j = {}; try { j = JSON.parse(res.getContentText()); } catch (e) { /* keep empty */ }
  if (res.getResponseCode() >= 300 || (j.status && j.status.code >= 300)) {
    if (res.getResponseCode() === 401) CacheService.getScriptCache().remove('zoho_at');
    throw new Error('Zoho Mail ' + res.getResponseCode() + ': ' + ((j.data && j.data.moreInfo) || (j.status && j.status.description) || res.getContentText().slice(0, 200)));
  }
  return j.data;
}

/** Send through Zoho. `attachments` are Apps Script blobs (e.g. the signed PDF). */
function zohoSend_(to, subject, html, extra) {
  const c = zohoConf_();
  const files = (extra.attachments || []).map(function (b) {
    const d = zohoApi_('post', '/api/accounts/' + c.accountId + '/messages/attachments?fileName=' + encodeURIComponent(b.getName() || 'attachment.pdf'), null, b.getBytes());
    return { storeName: d.storeName, attachmentPath: d.attachmentPath, attachmentName: d.attachmentName };
  });
  const name = extra.name || c.name;
  const msg = { fromAddress: name ? '"' + String(name).replace(/"/g, '') + '" <' + c.from + '>' : c.from, toAddress: to, subject: subject, content: html, mailFormat: 'html' };
  if (files.length) msg.attachments = files;
  if (extra.cc && [].concat(extra.cc).length) msg.ccAddress = [].concat(extra.cc).join(',');
  zohoApi_('post', '/api/accounts/' + c.accountId + '/messages', msg);
}

// ───────── Team Portal actions (super-admin only) ─────────
function zohoStatus_(me) {
  if (me.role !== 'super') throw new Error('Only the super-admin can manage email.');
  const c = zohoConf_();
  return { ok: true, connected: zohoConnected_(), dc: c.dc, from: c.from || '', fromName: c.name, clientId: c.clientId ? c.clientId.slice(0, 9) + '…' : '',
    scope: ZOHO_SCOPE, dcs: Object.keys(ZOHO_DCS).map(function (k) { return { id: k, label: ZOHO_DCS[k].label, console: ZOHO_DCS[k].accounts.replace('accounts.', 'api-console.') }; }),
    lastError: zohoProps_().getProperty('ZOHO_LAST_ERROR') || '' };
}

function zohoConnect_(me, b) {
  if (me.role !== 'super') throw new Error('Only the super-admin can manage email.');
  const dc = ZOHO_DCS[b.dc] ? b.dc : 'in';
  const clientId = String(b.clientId || '').trim(), secret = String(b.clientSecret || '').trim(), code = String(b.code || '').trim();
  const from = lc_(b.fromAddress), fromName = String(b.fromName || CONFIG.SENDER_NAME).slice(0, 80);
  if (!/^1000\.\w+/.test(clientId)) throw new Error('The Client ID should start with "1000.".');
  if (!secret) throw new Error('Paste the Client Secret.');
  if (!/^1000\.\w+\.\w+/.test(code)) throw new Error('Paste the code from “Generate Code” (it starts with "1000.").');
  if (!isEmail_(from)) throw new Error('Enter the From address, e.g. info@tedxthaltejyouth.in');
  const tok = zohoTokenCall_(dc, { code: code, client_id: clientId, client_secret: secret, grant_type: 'authorization_code' });
  if (!tok.refresh_token) throw new Error('Zoho did not return a refresh token. Generate a fresh code and try again.');
  // find the Zoho Mail account that owns the From address (or has it as an alias)
  const res = UrlFetchApp.fetch(ZOHO_DCS[dc].mail + '/api/accounts', { method: 'get', muteHttpExceptions: true, headers: { Authorization: 'Zoho-oauthtoken ' + tok.access_token, Accept: 'application/json' } });
  let accounts = []; try { accounts = JSON.parse(res.getContentText()).data || []; } catch (e) { /* none */ }
  if (!accounts.length) throw new Error('Connected, but no Zoho Mail account was found. Check the scope includes ZohoMail.accounts.READ.');
  const owns = function (a) {
    const addrs = [a.primaryEmailAddress, a.mailboxAddress, a.incomingUserName].concat((a.emailAddress || []).map(function (x) { return x.mailId; })).concat((a.sendMailDetails || []).map(function (x) { return x.fromAddress; }));
    return addrs.filter(Boolean).map(lc_).indexOf(from) >= 0;
  };
  const acc = accounts.filter(owns)[0];
  if (!acc) throw new Error(from + ' is not an address or alias of this Zoho account (' + accounts.map(function (a) { return a.primaryEmailAddress; }).join(', ') + '). Use one of those, or add it as an alias in Zoho first.');
  const p = zohoProps_();
  p.setProperties({ ZOHO_CLIENT_ID: clientId, ZOHO_CLIENT_SECRET: secret, ZOHO_REFRESH_TOKEN: tok.refresh_token, ZOHO_DC: dc,
    ZOHO_ACCOUNT_ID: String(acc.accountId), ZOHO_FROM: from, ZOHO_FROM_NAME: fromName });
  p.deleteProperty('ZOHO_LAST_ERROR');
  CacheService.getScriptCache().put('zoho_at', tok.access_token, 3000);
  audit_(me.email, 'zoho connected', from + ' (' + dc + ')');
  return zohoStatus_(me);
}

function zohoTest_(me, to) {
  if (me.role !== 'super') throw new Error('Only the super-admin can manage email.');
  if (!zohoConnected_()) throw new Error('Connect Zoho Mail first.');
  to = isEmail_(to) ? lc_(to) : me.email;
  zohoSend_(to, 'Test email from the TEDxThaltej Youth site', emailShell_('Zoho Mail is connected.',
    '<p>This email was sent through Zoho Mail from <b>' + esc_(zohoConf_().from) + '</b>. OTP codes, tickets, signed agreements and portal alerts will now go out this way.</p>'), {});
  return { ok: true, to: to };
}

function zohoDisconnect_(me) {
  if (me.role !== 'super') throw new Error('Only the super-admin can manage email.');
  const p = zohoProps_(), c = zohoConf_();
  try { if (c.refresh) UrlFetchApp.fetch(ZOHO_DCS[c.dc].accounts + '/oauth/v2/token/revoke?token=' + encodeURIComponent(c.refresh), { method: 'post', muteHttpExceptions: true }); } catch (e) { Logger.log(e); }
  ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN', 'ZOHO_ACCOUNT_ID', 'ZOHO_FROM', 'ZOHO_FROM_NAME', 'ZOHO_LAST_ERROR'].forEach(function (k) { p.deleteProperty(k); });
  CacheService.getScriptCache().remove('zoho_at');
  audit_(me.email, 'zoho disconnected', '');
  return zohoStatus_(me);
}
