/**
 * Operations: Admin Health, pause switches, traffic guard, email limits + queue, daily backups, error log.
 *
 *  • mail_() now goes through here. Sign-in codes, password and confirmation emails always go straight out.
 *    Everything else is sent only while today's count is under the limit for the provider in use (Zoho or Gmail)
 *    and email is not paused; otherwise it waits in the EmailQueue tab and is sent hourly, oldest first.
 *    The Organizer can edit, hold, send or delete queued emails in Admin Health.
 *  • Pause switches: public forms, outgoing email, the Team Portal (maintenance mode).
 *  • Traffic guard: if public requests per minute pass the set limit, public forms answer "busy, try again shortly"
 *    for 10 minutes. Reading pages is never blocked.
 *  • Daily backup copy of the Sheet (last 30 kept) and an error log of real system errors.
 */
const OPS_PUBLIC_WRITES = /^(submit|register|rec_apply|rec_sign|rec_team_sign|sub_join|ais_register|evt_register|evt_feedback|pay_start|pay_utr|cm_start|cm_verify)$/;
const OPS_URGENT = /code|password|reset|confirm|verify|sign-in|signing|one-time|OTP/i;

function opsConf_() {
  const c = CacheService.getScriptCache(), hit = c.get('opsconf');
  if (hit) return JSON.parse(hit);
  const s = settingsMap_();
  const o = { forms: truthy_(s.ops_pause_forms), email: truthy_(s.ops_pause_email), traffic: parseInt(s.traffic_limit_per_min || '0', 10) || 0,
    lg: parseInt(s.email_limit_gmail || '90', 10) || 90, lz: parseInt(s.email_limit_zoho || '400', 10) || 400, lzp: parseInt(s.email_limit_zepto || '5000', 10) || 5000, msg: s.ops_pause_message || '',
    use: { zepto: s.mail_use_zepto !== 'FALSE', zoho: s.mail_use_zoho !== 'FALSE', gmail: s.mail_use_gmail !== 'FALSE' }, order: mailOrderOf_(s.mail_order), bulkVia: s.mail_bulk_via === 'gmail' ? 'gmail' : s.mail_bulk_via === 'zoho' ? 'zoho' : 'auto' };
  c.put('opsconf', JSON.stringify(o), 60);
  return o;
}
function day_() { return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd'); }
function minuteKey_() { return Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMddHHmm'); }
function hourKey_(d) { return Utilities.formatDate(d || new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:00'); }

// ───────── traffic ─────────
function trafficHit_(kind) {
  try {
    const c = CacheService.getScriptCache(), mk = 'tm_' + kind + '_' + minuteKey_(), hk = 'th_' + kind + '_' + hourKey_();
    const vals = c.getAll([mk, hk]);
    c.putAll({ [mk]: String((+vals[mk] || 0) + 1), [hk]: String((+vals[hk] || 0) + 1) }, 7200);
    return (+vals[mk] || 0) + 1;
  } catch (e) { return 0; }
}
/** Returns an error object if this request must be refused, else null. */
function opsGate_(a, perMin) {
  if (!OPS_PUBLIC_WRITES.test(String(a || ''))) return null;
  const o = opsConf_(), c = CacheService.getScriptCache();
  if (o.forms) return { ok: false, paused: true, error: o.msg || 'Forms are paused for a short while. Please try again later.' };
  if (c.get('ops_busy')) return { ok: false, busy: true, error: 'We’re getting a lot of visitors right now. Please try again in a few minutes.' };
  if (o.traffic && perMin > o.traffic) {
    c.put('ops_busy', '1', 600);
    opsLog_('traffic', 'Traffic guard switched on: ' + perMin + ' requests in a minute (limit ' + o.traffic + '). Public forms paused for 10 minutes.');
    return { ok: false, busy: true, error: 'We’re getting a lot of visitors right now. Please try again in a few minutes.' };
  }
  return null;
}

// ───────── error log ─────────
function opsLog_(kind, msg, detail) {
  try {
    const c = CacheService.getScriptCache(), k = 'el_' + sha_(kind + msg).slice(0, 16);
    if (c.get(k)) return; c.put(k, '1', 300); // same error at most once per 5 minutes
    appendRow_('ErrorLog', { time: now_(), kind: kind, message: String(msg).slice(0, 500), detail: String(detail || '').slice(0, 1500) });
  } catch (e) { Logger.log('opsLog failed: ' + e); }
}
function isSystemError_(err) {
  return !err.auth && /Exception|is not defined|Cannot read|TypeError|ReferenceError|Service|quota|timed out|Too many|Missing tab|Unexpected|Invalid argument|Limit Exceeded|Server error|We're sorry/i.test(String(err.message || err));
}

// ───────── email: counting, limits, queue ─────────
// ───────── ZeptoMail (Zoho's transactional email API) ─────────
function zeptoConf_() {
  const p = PropertiesService.getScriptProperties();
  return { key: p.getProperty('ZEPTO_API_KEY') || '', host: p.getProperty('ZEPTO_HOST') || 'api.zeptomail.in', from: p.getProperty('ZEPTO_FROM') || '',
    name: p.getProperty('ZEPTO_FROM_NAME') || CONFIG.SENDER_NAME, alias: p.getProperty('ZEPTO_ALIAS') || '' };
}
function zeptoOn_() { const z = zeptoConf_(); return !!(z.key && z.from); }
function zeptoSend_(to, subject, html, extra) {
  const z = zeptoConf_();
  const list = function (v) { return [].concat(v || []).join(',').split(/[,;\s]+/).filter(String).map(function (e) { return { email_address: { address: e } }; }); };
  const body = { from: { address: extra.fromAddress || z.from, name: extra.name || z.name }, subject: subject, htmlbody: html, to: list(to) };
  if (extra.cc && list(extra.cc).length) body.cc = list(extra.cc);
  if (extra.bcc && list(extra.bcc).length) body.bcc = list(extra.bcc);
  const rt = extra.replyTo || CONFIG.REPLY_TO; if (rt) body.reply_to = [{ address: rt }];
  if (extra.attachments && extra.attachments.length) body.attachments = extra.attachments.map(function (b) {
    return { name: b.getName ? b.getName() : 'attachment', mime_type: (b.getContentType && b.getContentType()) || 'application/octet-stream', content: Utilities.base64Encode(b.getBytes()) }; });
  const hosts = [z.host].concat(['api.zeptomail.in', 'api.zeptomail.com'].filter(function (h) { return h !== z.host; }));
  let last = '';
  for (let i = 0; i < hosts.length; i++) {
    let r;
    try { r = UrlFetchApp.fetch('https://' + hosts[i] + '/v1.1/email', { method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { Authorization: /^Zoho-enczapikey /i.test(z.key) ? z.key : 'Zoho-enczapikey ' + z.key, Accept: 'application/json' }, payload: JSON.stringify(body) }); }
    catch (e) { last = hosts[i] + ': ' + e.message; continue; }               // host not reachable → try the next
    const code = r.getResponseCode(), txt = r.getContentText();
    if (code >= 200 && code < 300) { if (hosts[i] !== z.host) PropertiesService.getScriptProperties().setProperty('ZEPTO_HOST', hosts[i]); return true; }
    last = hosts[i] + ' ' + code + ': ' + txt.slice(0, 300);
    if (code !== 404) break;                                                  // a real answer (bad key, unverified sender…) — don't retry elsewhere
  }
  throw new Error('ZeptoMail: ' + last);
}
function zeptoSave_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer can connect email.');
  const p = PropertiesService.getScriptProperties();
  if (b.disconnect) { ['ZEPTO_API_KEY', 'ZEPTO_FROM', 'ZEPTO_ALIAS', 'ZEPTO_LAST_ERROR'].forEach(function (k) { p.deleteProperty(k); }); audit_(me.email, 'ZeptoMail disconnected', ''); return { ok: true }; }
  const from = lc_(b.from || ''); if (!isEmail_(from)) throw new Error('Enter the sender address from your verified ZeptoMail domain, e.g. noreply@tedxthaltejyouth.in');
  const host = String(b.host || 'api.zeptomail.in').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) throw new Error('The host looks wrong.');
  if (b.key) { const k = String(b.key).trim(); if (k.length < 20) throw new Error('Paste the full Send Mail token.'); p.setProperty('ZEPTO_API_KEY', k); }
  if (!p.getProperty('ZEPTO_API_KEY')) throw new Error('Paste the Send Mail token.');
  p.setProperty('ZEPTO_FROM', from); p.setProperty('ZEPTO_HOST', host);
  p.setProperty('ZEPTO_FROM_NAME', String(b.name || CONFIG.SENDER_NAME).slice(0, 80)); p.setProperty('ZEPTO_ALIAS', String(b.alias || '').slice(0, 60));
  audit_(me.email, 'ZeptoMail connected', host + ' · ' + from);
  if (b.test) {
    try { zeptoSend_(me.email, 'ZeptoMail is connected', emailShell_('It works!', '<p>This test email was sent through ZeptoMail from <b>' + esc_(from) + '</b>. Transactional emails from the website will now go this way.</p>'), {}); mailCount_('zepto', 1); }
    catch (e) { p.setProperty('ZEPTO_LAST_ERROR', now_() + ' · ' + e.message); throw new Error('Saved, but the test email failed: ' + e.message); }
  }
  p.deleteProperty('ZEPTO_LAST_ERROR');
  return { ok: true };
}
/** Email services, in the Organizer's chosen order, that are both switched on and set up.
 *  Bulk mail (team email, subscriber updates) never uses ZeptoMail, and can be pinned to Zoho Mail or Gmail. */
const MAIL_PROVIDERS = ['zepto', 'zoho', 'gmail'];
function mailOrderOf_(s) {
  const o = String(s || '').split(',').map(function (x) { return x.trim(); }).filter(function (x, i, a) { return MAIL_PROVIDERS.indexOf(x) >= 0 && a.indexOf(x) === i; });
  MAIL_PROVIDERS.forEach(function (p) { if (o.indexOf(p) < 0) o.push(p); });
  return o;
}
function mailReady_(p) { return p === 'zepto' ? zeptoOn_() : p === 'zoho' ? zohoConnected_() : true; }
function mailChain_(bulk) {
  const o = opsConf_();
  let list = o.order.filter(function (p) { return o.use[p] && mailReady_(p) && !(bulk && p === 'zepto'); });
  if (bulk && o.bulkVia !== 'auto' && list.indexOf(o.bulkVia) >= 0) list = [o.bulkVia].concat(list.filter(function (p) { return p !== o.bulkVia; }));
  return list;
}
function mailProvider_(bulk) { return mailChain_(bulk)[0] || 'none'; }
function mailCount_(provider, add) {
  const p = PropertiesService.getScriptProperties(), k = 'MC_' + day_() + '_' + provider;
  const n = parseInt(p.getProperty(k) || '0', 10) + (add || 0);
  if (add) p.setProperty(k, String(n));
  return n;
}
function mailRoom_(bulk) {
  const o = opsConf_(), prov = mailProvider_(bulk), used = mailCount_(prov);
  if (prov === 'none') return { provider: 'none', used: 0, room: 0 };
  let room = (prov === 'zepto' ? o.lzp : prov === 'zoho' ? o.lz : o.lg) - used;
  if (prov === 'gmail') { try { room = Math.min(room, MailApp.getRemainingDailyQuota() - 3); } catch (e) { } }
  return { provider: prov, used: used, room: room };
}
function mail_(to, subject, html, extra) {
  extra = extra || {};
  const urgent = extra.priority === 'high' || OPS_URGENT.test(String(subject || ''));
  const o = opsConf_();
  if (mailProvider_(extra.bulk) === 'none') return mailQueue_(to, subject, html, extra, 'No email service is switched on');
  if (!urgent && (o.email || mailRoom_(extra.bulk).room <= 0 || extra.queue)) return mailQueue_(to, subject, html, extra, o.email ? 'Email paused' : 'Daily limit reached');
  try { mailSendNow_(to, subject, html, extra); }
  catch (e) {
    if (!urgent && /too many|quota|limit|rate/i.test(String(e.message || e))) return mailQueue_(to, subject, html, extra, 'Provider limit: ' + String(e.message || e).slice(0, 120));
    throw e;
  }
}
function mailSendNow_(to, subject, html, extra) {
  extra = ttrisCopy_(to, subject, extra || {});   // CC the TTRIS mailbox when switched on (never for private or bulk emails)
  const chain = mailChain_(extra.bulk), props = PropertiesService.getScriptProperties();
  if (!chain.length) throw new Error('No email service is switched on (Admin Health → Email).');
  let last = null;
  for (let i = 0; i < chain.length; i++) {
    const p = chain[i];
    try {
      if (p === 'zepto') zeptoSend_(to, subject, html, extra);
      else if (p === 'zoho') zohoSend_(to, subject, html, extra);
      else gmailSend_(to, subject, html, extra);
      mailCount_(p, 1); return p;
    } catch (e) {
      last = e; props.setProperty(p.toUpperCase() + '_LAST_ERROR', now_() + ' · ' + String(e.message || e).slice(0, 300));
      Logger.log(p + ' failed' + (i < chain.length - 1 ? ', trying ' + chain[i + 1] : '') + ': ' + e);
    }
  }
  throw last;
}
function gmailSend_(to, subject, html, extra) {
  const opts = { htmlBody: html, name: extra.name || CONFIG.SENDER_NAME };
  if (extra.replyTo || CONFIG.REPLY_TO) opts.replyTo = extra.replyTo || CONFIG.REPLY_TO;
  if (extra.attachments) opts.attachments = extra.attachments;
  if (extra.cc && [].concat(extra.cc).length) opts.cc = [].concat(extra.cc).join(',');
  if (CONFIG.FROM_ALIAS && GmailApp.getAliases().indexOf(CONFIG.FROM_ALIAS) >= 0) opts.from = CONFIG.FROM_ALIAS;
  GmailApp.sendEmail(to, subject, 'Please view this email in an HTML-capable client.', opts);
}
function opsFolder_(name, prop) {
  const props = PropertiesService.getScriptProperties();
  let f = null; try { f = props.getProperty(prop) ? DriveApp.getFolderById(props.getProperty(prop)) : null; } catch (e) { f = null; }
  if (!f) { f = DriveApp.createFolder(name); props.setProperty(prop, f.getId()); }
  return f;
}
function mailQueue_(to, subject, html, extra, reason) {
  const rec = { id: newId_('EQ'), created_at: now_(), to: String(to).slice(0, 500), subject: String(subject).slice(0, 300), html: '', html_file: '', attachments: '',
    reply_to: extra.replyTo || '', bulk: extra.bulk ? 'TRUE' : '', status: 'Queued', tries: '0', last_error: '', sent_at: '', reason: reason || '' };
  if (String(html).length > 40000) rec.html_file = opsFolder_('TEDxThaltej Youth — Email queue', 'EQ_FOLDER_ID').createFile(rec.id + '.html', html, 'text/html').getId();
  else rec.html = html;
  if (extra.attachments && extra.attachments.length) {
    const f = opsFolder_('TEDxThaltej Youth — Email queue', 'EQ_FOLDER_ID');
    rec.attachments = extra.attachments.map(function (b) { return f.createFile(b).getId(); }).join(',');
  }
  appendRow_('EmailQueue', rec);
  return { queued: rec.id };
}
/** Send queued emails while there is room. Called hourly, daily and from Admin Health. */
function mailQueueRun_(max) {
  const o = opsConf_(); if (o.email) return { sent: 0, left: readAll_('EmailQueue').filter(function (q) { return q.status === 'Queued'; }).length, paused: true };
  const t0 = Date.now(); let sent = 0;
  const q = readAll_('EmailQueue').filter(function (x) { return x.status === 'Queued'; });
  for (let i = 0; i < q.length && sent < (max || 200) && Date.now() - t0 < 240000; i++) {
    if (mailRoom_().room <= 0) break;
    const x = q[i];
    try {
      const html = x.html_file ? DriveApp.getFileById(x.html_file).getBlob().getDataAsString() : x.html;
      const att = x.attachments ? x.attachments.split(',').filter(String).map(function (id) { return DriveApp.getFileById(id).getBlob(); }) : null;
      mailSendNow_(x.to, x.subject, html, { attachments: att, replyTo: x.reply_to || undefined, bulk: x.bulk === 'TRUE' });
      updateRow_('EmailQueue', x.id, { status: 'Sent', sent_at: now_(), tries: String((+x.tries || 0) + 1), last_error: '' });
      [x.html_file].concat(String(x.attachments || '').split(',')).filter(String).forEach(function (id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { } });
      sent++;
    } catch (e) {
      const tries = (+x.tries || 0) + 1;
      updateRow_('EmailQueue', x.id, { tries: String(tries), last_error: String(e.message || e).slice(0, 300), status: tries >= 5 ? 'Failed' : 'Queued' });
      if (/too many|quota|limit/i.test(String(e.message || e))) break;
    }
  }
  return { sent: sent, left: readAll_('EmailQueue').filter(function (q) { return q.status === 'Queued'; }).length };
}

// ───────── backups + scheduled work ─────────
function opsBackup_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet(), f = opsFolder_('TEDxThaltej Youth — Backups', 'BACKUP_FOLDER_ID');
  const copy = DriveApp.getFileById(ss.getId()).makeCopy('Backup ' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH-mm') + ' · ' + ss.getName(), f);
  const all = []; const it = f.getFiles(); while (it.hasNext()) { const x = it.next(); all.push(x); }
  all.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); }).slice(30).forEach(function (x) { try { x.setTrashed(true); } catch (e) { } });
  PropertiesService.getScriptProperties().setProperty('LAST_BACKUP', now_() + '|' + copy.getId());
  return { id: copy.getId(), url: copy.getUrl() };
}
function opsHourly() {
  try { opsFlushTraffic_(); } catch (e) { opsLog_('scheduled', 'Traffic flush failed', e.message); }
  try { mailQueueRun_(); } catch (e) { opsLog_('scheduled', 'Email queue run failed', e.message); }
  try { payExpire_(); } catch (e) { opsLog_('scheduled', 'Payment expiry failed', e.message); }
  try { spFollowups_(); } catch (e) { opsLog_('scheduled', 'Outreach follow-ups failed', e.message); }
  try { if (+Utilities.formatDate(new Date(), 'Asia/Kolkata', 'H') >= 9) qacDaily_(); } catch (e) { opsLog_('scheduled', 'QAC daily run failed', e.message); }
}
function opsFlushTraffic_() {
  const c = CacheService.getScriptCache(), prev = new Date(Date.now() - 3600000), h = hourKey_(prev);
  if (readAll_('Traffic').some(function (r) { return r.hour === h; })) return;
  const v = c.getAll(['th_get_' + h, 'th_post_' + h]);
  appendRow_('Traffic', { hour: h, gets: String(+v['th_get_' + h] || 0), posts: String(+v['th_post_' + h] || 0) });
  const rows = readAll_('Traffic'); if (rows.length > 24 * 60) rows.slice(0, rows.length - 24 * 60).forEach(function (r) { deleteRow_('Traffic', r.hour); });
}

// ───────── Admin Health ─────────
function opsHealth_(me) {
  if (me.role !== 'super') throw new Error('Only the Organizer can open Admin Health.');
  const o = opsConf_(), room = mailRoom_(), p = PropertiesService.getScriptProperties(), c = CacheService.getScriptCache();
  let gmailLeft = null; try { gmailLeft = MailApp.getRemainingDailyQuota(); } catch (e) { }
  const q = readAll_('EmailQueue');
  const mins = []; const now = new Date();
  const keys = []; for (let i = 59; i >= 0; i--) { const k = Utilities.formatDate(new Date(now.getTime() - i * 60000), 'Asia/Kolkata', 'yyyyMMddHHmm'); keys.push(k); }
  const mg = c.getAll(keys.map(function (k) { return 'tm_get_' + k; })), mp = c.getAll(keys.map(function (k) { return 'tm_post_' + k; }));
  keys.forEach(function (k) { mins.push({ t: k.slice(8, 10) + ':' + k.slice(10), get: +mg['tm_get_' + k] || 0, post: +mp['tm_post_' + k] || 0 }); });
  const lb = String(p.getProperty('LAST_BACKUP') || '').split('|');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tabs = ss.getSheets().map(function (s) { return { name: s.getName(), rows: Math.max(0, s.getLastRow() - 1), cells: s.getMaxRows() * s.getMaxColumns() }; });
  const triggers = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  return { ok: true, now: now_(),
    switches: { forms: o.forms, email: o.email, portal: maintenanceOn_(), traffic_limit: o.traffic, busy: !!c.get('ops_busy'), message: o.msg },
    email: { provider: room.provider, zoho: zohoConnected_(), zoho_error: p.getProperty('ZOHO_LAST_ERROR') || '', gmail_error: p.getProperty('GMAIL_LAST_ERROR') || '',
      use: o.use, order: o.order, bulk_via: o.bulkVia, chain: mailChain_(false), bulk_chain: mailChain_(true), bulk_provider: mailProvider_(true), sent_today: { zepto: mailCount_('zepto'), zoho: mailCount_('zoho'), gmail: mailCount_('gmail') },
      zepto: (function () { const z = zeptoConf_(); return { on: zeptoOn_(), host: z.host, from: z.from, name: z.name, alias: z.alias, key_set: !!z.key, key_hint: z.key ? '••••' + z.key.slice(-4) : '', error: p.getProperty('ZEPTO_LAST_ERROR') || '' }; })(),
      limit_gmail: o.lg, limit_zoho: o.lz, limit_zepto: o.lzp, room: room.room, gmail_quota_left: gmailLeft,
      queued: q.filter(function (x) { return x.status === 'Queued'; }).length, held: q.filter(function (x) { return x.status === 'Held'; }).length, failed: q.filter(function (x) { return x.status === 'Failed'; }).length },
    queue: q.filter(function (x) { return x.status !== 'Sent'; }).slice(-150).reverse().map(function (x) { return { id: x.id, created_at: x.created_at, to: x.to, subject: x.subject, status: x.status, tries: x.tries, last_error: x.last_error, reason: x.reason, attachments: x.attachments ? x.attachments.split(',').length : 0 }; }),
    traffic: { minutes: mins, hours: readAll_('Traffic').slice(-48).map(function (r) { return { hour: r.hour, get: +r.gets || 0, post: +r.posts || 0 }; }) },
    errors: readAll_('ErrorLog').slice(-60).reverse().map(function (e) { const x = Object.assign({}, e); delete x._row; return x; }),
    ai: factCheckReady_(), backup: { at: lb[0] || '', url: lb[1] ? 'https://docs.google.com/spreadsheets/d/' + lb[1] : '' },
    triggers: { daily: triggers.indexOf('dailyMaintenance') >= 0, hourly: triggers.indexOf('opsHourly') >= 0 },
    sheet: { tabs: tabs.sort(function (a, b) { return b.rows - a.rows; }), cells: tabs.reduce(function (s, t) { return s + t.cells; }, 0), cell_limit: 10000000 } };
}
function opsSet_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer can change these.');
  const map = {};
  if (b.forms != null) map.ops_pause_forms = b.forms ? 'TRUE' : 'FALSE';
  if (b.email != null) map.ops_pause_email = b.email ? 'TRUE' : 'FALSE';
  if (b.portal != null) map.maintenance_mode = b.portal ? 'TRUE' : 'FALSE';
  if (b.message != null) map.ops_pause_message = String(b.message).slice(0, 300);
  if (b.traffic_limit != null) map.traffic_limit_per_min = String(Math.max(0, Math.min(5000, parseInt(b.traffic_limit, 10) || 0)));
  if (b.limit_gmail != null) map.email_limit_gmail = String(Math.max(1, Math.min(1500, parseInt(b.limit_gmail, 10) || 90)));
  if (b.limit_zepto != null) map.email_limit_zepto = String(Math.max(1, Math.min(100000, parseInt(b.limit_zepto, 10) || 5000)));
  if (b.limit_zoho != null) map.email_limit_zoho = String(Math.max(1, Math.min(10000, parseInt(b.limit_zoho, 10) || 400)));
  if (b.use) {
    const cur = opsConf_().use, next = {};
    MAIL_PROVIDERS.forEach(function (p) { next[p] = b.use[p] != null ? !!b.use[p] : cur[p]; map['mail_use_' + p] = next[p] ? 'TRUE' : 'FALSE'; });
    if (!MAIL_PROVIDERS.some(function (p) { return next[p] && mailReady_(p); }))
      throw new Error('Keep at least one working email service on. Otherwise sign-in codes and every other email stop.');
  }
  if (b.order) map.mail_order = mailOrderOf_([].concat(b.order).join(',')).join(',');
  if (b.bulk_via != null) map.mail_bulk_via = ['zoho', 'gmail'].indexOf(b.bulk_via) >= 0 ? b.bulk_via : 'auto';
  saveSettings_(me, map);
  if (b.busy === false) CacheService.getScriptCache().remove('ops_busy');
  audit_(me.email, 'operations changed', JSON.stringify(map));
  return { ok: true };
}
function opsQueueGet_(me, id) {
  if (me.role !== 'super') throw new Error('Only the Organizer can open queued emails.');
  const x = findRow_('EmailQueue', id); if (!x) throw new Error('Not in the queue.');
  return { ok: true, item: { id: x.id, to: x.to, subject: x.subject, status: x.status, html: x.html_file ? DriveApp.getFileById(x.html_file).getBlob().getDataAsString() : x.html, attachments: x.attachments ? x.attachments.split(',').length : 0 } };
}
function opsQueueAct_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer can change queued emails.');
  if (b.op === 'run') return Object.assign({ ok: true }, mailQueueRun_());
  if (b.op === 'retryFailed') { readAll_('EmailQueue').filter(function (x) { return x.status === 'Failed'; }).forEach(function (x) { updateRow_('EmailQueue', x.id, { status: 'Queued', tries: '0' }); }); return { ok: true }; }
  if (b.op === 'clearSent') { readAll_('EmailQueue').filter(function (x) { return x.status === 'Sent'; }).forEach(function (x) { deleteRow_('EmailQueue', x.id); }); return { ok: true }; }
  const x = findRow_('EmailQueue', b.id); if (!x) throw new Error('Not in the queue.');
  if (b.op === 'edit') {
    const to = String(b.to || '').split(/[,\s]+/).filter(String);
    if (!to.length || !to.every(isEmail_)) throw new Error('Check the recipient email(s).');
    const up = { to: to.join(','), subject: String(b.subject || x.subject).slice(0, 300) };
    if (b.html != null) { if (x.html_file) DriveApp.getFileById(x.html_file).setContent(String(b.html)); else if (String(b.html).length > 40000) { up.html_file = opsFolder_('TEDxThaltej Youth — Email queue', 'EQ_FOLDER_ID').createFile(x.id + '.html', b.html, 'text/html').getId(); up.html = ''; } else up.html = String(b.html); }
    updateRow_('EmailQueue', x.id, up); audit_(me.email, 'queued email edited', x.id); return { ok: true };
  }
  if (b.op === 'hold') { updateRow_('EmailQueue', x.id, { status: 'Held' }); return { ok: true }; }
  if (b.op === 'release') { updateRow_('EmailQueue', x.id, { status: 'Queued', tries: '0' }); return { ok: true }; }
  if (b.op === 'delete') {
    [x.html_file].concat(String(x.attachments || '').split(',')).filter(String).forEach(function (id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { } });
    deleteRow_('EmailQueue', x.id); audit_(me.email, 'queued email deleted', x.id + ' ' + x.subject); return { ok: true };
  }
  if (b.op === 'sendNow') {
    const html = x.html_file ? DriveApp.getFileById(x.html_file).getBlob().getDataAsString() : x.html;
    const att = x.attachments ? x.attachments.split(',').filter(String).map(function (id) { return DriveApp.getFileById(id).getBlob(); }) : null;
    mailSendNow_(x.to, x.subject, html, { attachments: att, replyTo: x.reply_to || undefined, bulk: x.bulk === 'TRUE' });
    updateRow_('EmailQueue', x.id, { status: 'Sent', sent_at: now_() }); return { ok: true };
  }
  throw new Error('Unknown action.');
}

// ───────── clean-up: delete what is no longer needed ─────────
// Safe items run automatically every Sunday; the rest only when the Organizer ticks them in Admin Health.
function ago_(days) { return Utilities.formatDate(new Date(Date.now() - days * 864e5), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss"); }
function cleanupPlan_() {
  const t = now_(), cyc = recSettings_().cycle;
  const sentQ = readAll_('EmailQueue').filter(function (x) { return x.status === 'Sent' && x.sent_at < ago_(7); });
  const plan = {
    sentEmails:  { label: 'Sent emails in the queue (older than 7 days)', safe: true, tab: 'EmailQueue', rows: sentQ },
    errors:      { label: 'Error log entries older than 30 days', safe: true, tab: 'ErrorLog', rows: readAll_('ErrorLog').filter(function (x) { return x.time < ago_(30); }) },
    devices:     { label: 'Expired trusted devices', safe: true, tab: 'TrustedDevices', rows: readAll_('TrustedDevices').filter(function (x) { return x.expires < t; }) },
    links:       { label: 'Onboarding links that ended over 30 days ago', safe: true, tab: 'OnboardLinks', rows: readAll_('OnboardLinks').filter(function (x) { return (x.status !== 'Active' || x.expires < t) && x.expires < ago_(30); }) },
    pendingSubs: { label: 'Subscribers who never confirmed (30+ days)', safe: true, tab: 'Subscribers', rows: readAll_('Subscribers').filter(function (x) { return x.status === 'Pending' && x.created_at < ago_(30); }) },
    unsubscribed:{ label: 'People who unsubscribed (delete their email address)', safe: true, tab: 'Subscribers', rows: readAll_('Subscribers').filter(function (x) { return x.status === 'Unsubscribed'; }) },
    oldApplicants:{ label: 'Team applicants from past cycles who were not selected or withdrew (with their interview marks)', safe: false, tab: 'Applicants',
      rows: readAll_('Applicants').filter(function (x) { return x.cycle && x.cycle !== cyc && ['Not selected', 'Withdrawn', 'Applied', 'Shortlisted', 'Interviewed', 'Interview scheduled'].indexOf(x.status) >= 0; }) },
    audit:       { label: 'Audit log entries older than 2 years', safe: false, tab: 'Audit', rows: readAll_('Audit').filter(function (x) { return x.time < ago_(730); }) },
    sentUpdates: { label: 'Copies of subscriber updates older than 1 year (counts are kept in the log)', safe: false, tab: 'SubCampaigns', rows: readAll_('SubCampaigns').filter(function (x) { return x.status === 'Done' && x.created_at < ago_(365); }) },
  };
  return plan;
}
function cleanupDeleteRows_(tab, rows) {
  const sh = sh_(tab);
  rows.map(function (r) { return r._row; }).sort(function (a, b) { return b - a; }).forEach(function (n) { sh.deleteRow(n); });
}
function cleanupRun_(keys, who) {
  const plan = cleanupPlan_(), done = {};
  withLock_(function () {
    keys.forEach(function (k) {
      const p = plan[k]; if (!p || !p.rows.length) return;
      if (k === 'sentEmails') p.rows.forEach(function (x) { [x.html_file].concat(String(x.attachments || '').split(',')).filter(String).forEach(function (id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { } }); });
      if (k === 'oldApplicants') { const ids = p.rows.map(function (x) { return x.id; }); cleanupDeleteRows_('Scores', readAll_('Scores').filter(function (s) { return ids.indexOf(s.applicant_id) >= 0; })); }
      if (k === 'unsubscribed') { // re-read: rows may have shifted after pendingSubs in the same tab
        cleanupDeleteRows_('Subscribers', readAll_('Subscribers').filter(function (x) { return x.status === 'Unsubscribed'; })); done[k] = p.rows.length; return; }
      if (k === 'pendingSubs') { cleanupDeleteRows_('Subscribers', readAll_('Subscribers').filter(function (x) { return x.status === 'Pending' && x.created_at < ago_(30); })); done[k] = p.rows.length; return; }
      cleanupDeleteRows_(p.tab, p.rows); done[k] = p.rows.length;
    });
  });
  const total = Object.keys(done).reduce(function (s, k) { return s + done[k]; }, 0);
  if (total) audit_(who || 'system', 'clean-up', JSON.stringify(done));
  return { ok: true, deleted: done, total: total };
}
function cleanupPreview_(me) {
  if (me.role !== 'super') throw new Error('Only the Organizer can clean up.');
  const plan = cleanupPlan_();
  return { ok: true, items: Object.keys(plan).map(function (k) { return { key: k, label: plan[k].label, safe: plan[k].safe, count: plan[k].rows.length }; }) };
}
function cleanupAuto_() {
  if (new Date().getDay() !== 0) return; // Sundays
  const plan = cleanupPlan_();
  return cleanupRun_(Object.keys(plan).filter(function (k) { return plan[k].safe; }), 'automatic clean-up');
}
