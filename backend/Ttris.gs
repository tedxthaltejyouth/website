/**
 * TTRIS mailbox — the shared inbox that keeps a copy of everything.
 *  • Copy: when switched on, outgoing emails CC the TTRIS address (Settings: ttris_email, ttris_cc). Sign-in codes, passwords and
 *    other private emails are never copied, and bulk team emails are not copied one by one.
 *  • Threads: emails that expect an answer (sponsor outreach, replies to website messages, official emails, inbox replies) carry a
 *    reference line at the end, e.g. "Ref: TTRIS-7KQ2MD". Replies go to the TTRIS mailbox (Reply-To + CC).
 *  • Reading: the TTRIS mailbox is connected with its own Zoho Mail OAuth (read-only scope). Every 10 minutes new mail is fetched,
 *    matched to its thread by the reference (or by the sender's address), and filed: sponsor replies stop follow-ups, website
 *    replies re-open the message, everything else lands in "Unsorted". Out-of-office and bounce messages are recognised.
 *  • Team Portal → TTRIS Inbox: read, file and reply. Replies keep the same reference so the conversation stays together.
 *  Access: the Organizer, and anyone given the "inbox" page. Mail bodies are stored as plain text (no remote HTML is rendered).
 */
const TTRIS_SCOPE = 'ZohoMail.messages.READ,ZohoMail.folders.READ,ZohoMail.accounts.READ';
const TTRIS_PRIVATE = /code|password|reset|one-time|OTP|sign-in|verify your|security/i;
const TTRIS_AUTO = /^(re:\s*)?(auto(matic)?[ -]?(reply|response)|out of (the )?office|autoreply|away from|on leave|ooo\b)/i;
const TTRIS_BOUNCE = /(undeliver|delivery status notification|mail delivery (failed|subsystem)|returned mail|failure notice|delivery has failed|address not found)/i;

function ttrisConf_() {
  const s = settingsMap_(), p = PropertiesService.getScriptProperties();
  const email = isEmail_(s.ttris_email) ? lc_(s.ttris_email) : 'ttris@' + (obDomainSafe_() || 'tedxthaltejyouth.in');
  return { email: email, cc: truthy_(s.ttris_cc), connected: !!(p.getProperty('TTRIS_REFRESH') && p.getProperty('TTRIS_ACCOUNT_ID')),
    dc: p.getProperty('TTRIS_DC') || 'in', account: p.getProperty('TTRIS_ACCOUNT_ID') || '', folder: p.getProperty('TTRIS_FOLDER_ID') || '',
    lastPoll: p.getProperty('TTRIS_LAST_POLL') || '', lastError: p.getProperty('TTRIS_LAST_ERROR') || '' };
}
function obDomainSafe_() { try { return obDomain_(); } catch (e) { return ''; } }
function ttrisCan_(me) { return me.role === 'super' || (me.scopeList || []).indexOf('inbox') >= 0; }
function ttrisMust_(me) { if (!ttrisCan_(me)) throw new Error('Only the Organizer and people given the TTRIS Inbox can open it.'); }

/** Called from mailSendNow_: adds the TTRIS copy when it applies. */
function ttrisCopy_(to, subject, extra) {
  if (extra.noCopy || extra.bulk || extra.private || TTRIS_PRIVATE.test(String(subject || ''))) return extra;
  let c; try { c = ttrisConf_(); } catch (e) { return extra; }
  if (!c.cc && !extra.ref) return extra;
  const all = [].concat(to || [], extra.cc || []).join(',').toLowerCase();
  if (all.indexOf(c.email) >= 0) return extra;
  return Object.assign({}, extra, { cc: [].concat(extra.cc || []).concat([c.email]).filter(String) });
}

// ───────── threads ─────────
function ttrisRefNew_(kind, recId, subject, to) {
  let ref; const have = {}; readAll_('TtrisRefs').forEach(function (r) { have[r.ref] = 1; });
  do { ref = 'TTRIS-' + Utilities.getUuid().replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6); } while (have[ref]);
  appendRow_('TtrisRefs', { ref: ref, kind: kind, rec_id: recId, subject: String(subject || '').slice(0, 200), to_email: lc_(to || ''), created_at: now_(), last_out_at: '', last_in_at: '' });
  return ref;
}
function ttrisRefFor_(kind, recId, subject, to) {
  const r = readAll_('TtrisRefs').filter(function (x) { return x.kind === kind && x.rec_id === recId; }).pop();
  return r ? r.ref : ttrisRefNew_(kind, recId, subject, to);
}
function ttrisText_(html) {
  return String(html || '').replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h\d|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#\d+;/g, '')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
/** Send an email that belongs to a thread. o: { kind, rec_id, to, subject, title, html, kicker, fromName, fromLocal, ref, by } */
function ttrisSend_(o) {
  const c = ttrisConf_(), ref = o.ref || ttrisRefFor_(o.kind, o.rec_id, o.subject, o.to);
  const html = emailShell_(o.title || '', o.html, { ref: ref, kicker: o.kicker, preheader: o.preheader });
  const extra = { ref: ref, replyTo: c.email, name: o.fromName || CONFIG.SENDER_NAME, priority: 'high', cc: [].concat(o.cc || []) };
  const dom = obDomainSafe_(); if (o.fromLocal && dom) extra.fromAddress = o.fromLocal + '@' + dom;
  mail_(o.to, o.subject, html, extra);
  appendRow_('TtrisMsgs', { id: newId_('TM'), ref: ref, direction: 'out', from_email: lc_(o.by || ''), from_name: o.fromName || '', to_email: lc_(o.to), subject: String(o.subject).slice(0, 300),
    body: ttrisText_(o.html).slice(0, 20000), zoho_id: '', received_at: now_(), auto: '', status: 'Sent', kind: o.kind, rec_id: o.rec_id });
  const r = findRow_('TtrisRefs', ref); if (r) updateRow_('TtrisRefs', ref, { last_out_at: now_() });
  return ref;
}

// ───────── reading the mailbox ─────────
function ttrisToken_() {
  const cache = CacheService.getScriptCache(), hit = cache.get('ttris_at'); if (hit) return hit;
  const p = PropertiesService.getScriptProperties();
  const j = zohoTokenCall_(p.getProperty('TTRIS_DC') || 'in', { refresh_token: p.getProperty('TTRIS_REFRESH'), client_id: p.getProperty('TTRIS_CLIENT_ID'), client_secret: p.getProperty('TTRIS_SECRET'), grant_type: 'refresh_token' });
  cache.put('ttris_at', j.access_token, Math.max(60, (parseInt(j.expires_in, 10) || 3600) - 300));
  return j.access_token;
}
function ttrisApi_(path) {
  const c = ttrisConf_();
  const res = UrlFetchApp.fetch(ZOHO_DCS[c.dc].mail + path, { method: 'get', muteHttpExceptions: true, headers: { Authorization: 'Zoho-oauthtoken ' + ttrisToken_(), Accept: 'application/json' } });
  let j = {}; try { j = JSON.parse(res.getContentText()); } catch (e) { }
  if (res.getResponseCode() >= 300) { if (res.getResponseCode() === 401) CacheService.getScriptCache().remove('ttris_at'); throw new Error('Zoho Mail ' + res.getResponseCode() + ': ' + ((j.data && j.data.moreInfo) || res.getContentText().slice(0, 160))); }
  return j.data;
}
function ttrisConnect_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer connects the TTRIS mailbox.');
  const dc = ZOHO_DCS[b.dc] ? b.dc : 'in', id = String(b.clientId || '').trim(), sec = String(b.clientSecret || '').trim(), code = String(b.code || '').trim();
  if (!/^1000\.\w+/.test(id) || !sec || !/^1000\.\w+\.\w+/.test(code)) throw new Error('Paste the Client ID, Client Secret and the code (they start with "1000.").');
  const tok = zohoTokenCall_(dc, { code: code, client_id: id, client_secret: sec, grant_type: 'authorization_code' });
  if (!tok.refresh_token) throw new Error('Zoho did not return a refresh token. Generate a fresh code and try again.');
  const get = function (path) { const r = UrlFetchApp.fetch(ZOHO_DCS[dc].mail + path, { muteHttpExceptions: true, headers: { Authorization: 'Zoho-oauthtoken ' + tok.access_token, Accept: 'application/json' } }); try { return JSON.parse(r.getContentText()).data || []; } catch (e) { return []; } };
  const want = ttrisConf_().email, accs = get('/api/accounts');
  const acc = accs.filter(function (a) { return [a.primaryEmailAddress, a.mailboxAddress, a.incomingUserName].concat((a.emailAddress || []).map(function (x) { return x.mailId; })).filter(Boolean).map(lc_).indexOf(want) >= 0; })[0];
  if (!acc) throw new Error('This Zoho login is not the ' + want + ' mailbox (found: ' + accs.map(function (a) { return a.primaryEmailAddress; }).join(', ') + '). Generate the code while signed in to Zoho as ' + want + '.');
  const folders = get('/api/accounts/' + acc.accountId + '/folders');
  const inbox = folders.filter(function (f) { return String(f.folderType || f.folderName).toLowerCase() === 'inbox'; })[0];
  if (!inbox) throw new Error('Could not find the Inbox folder. Check the scope includes ZohoMail.folders.READ.');
  PropertiesService.getScriptProperties().setProperties({ TTRIS_CLIENT_ID: id, TTRIS_SECRET: sec, TTRIS_REFRESH: tok.refresh_token, TTRIS_DC: dc, TTRIS_ACCOUNT_ID: String(acc.accountId),
    TTRIS_FOLDER_ID: String(inbox.folderId), TTRIS_LAST_TS: String(Date.now() - 3 * 86400000), TTRIS_LAST_ERROR: '' });
  CacheService.getScriptCache().put('ttris_at', tok.access_token, 3000);
  try { const have = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); }); if (have.indexOf('ttrisPoll') < 0) ScriptApp.newTrigger('ttrisPoll').timeBased().everyMinutes(10).create(); } catch (e) { Logger.log(e); }
  audit_(me.email, 'TTRIS mailbox connected', want);
  return { ok: true, conf: ttrisConf_() };
}
function ttrisDisconnect_(me) {
  if (me.role !== 'super') throw new Error('Only the Organizer.');
  const p = PropertiesService.getScriptProperties();
  ['TTRIS_CLIENT_ID', 'TTRIS_SECRET', 'TTRIS_REFRESH', 'TTRIS_ACCOUNT_ID', 'TTRIS_FOLDER_ID', 'TTRIS_LAST_ERROR'].forEach(function (k) { p.deleteProperty(k); });
  CacheService.getScriptCache().remove('ttris_at');
  audit_(me.email, 'TTRIS mailbox disconnected', '');
  return { ok: true };
}
/** Trigger entry point (every 10 minutes). */
function ttrisPoll() { try { ttrisPoll_(); } catch (e) { PropertiesService.getScriptProperties().setProperty('TTRIS_LAST_ERROR', now_() + ' · ' + String(e.message || e).slice(0, 300)); } }
function ttrisPoll_() {
  const c = ttrisConf_(); if (!c.connected) return { ok: false, reason: 'not connected' };
  const p = PropertiesService.getScriptProperties(), since = parseInt(p.getProperty('TTRIS_LAST_TS') || '0', 10) || 0;
  const list = ttrisApi_('/api/accounts/' + c.account + '/messages/view?folderId=' + c.folder + '&limit=50&start=1&sortorder=false') || [];
  const seen = {}; readAll_('TtrisMsgs').forEach(function (m) { if (m.zoho_id) seen[m.zoho_id] = 1; });
  const ours = ttrisOwnAddrs_();
  let max = since, n = 0;
  list.filter(function (m) { return +m.receivedTime > since - 600000 && !seen[String(m.messageId)]; }).reverse().slice(0, 30).forEach(function (m) {
    max = Math.max(max, +m.receivedTime || 0);
    const from = lc_((String(m.fromAddress || m.sender || '').match(/[^<\s"]+@[^>\s"]+/) || [''])[0]);
    if (ours.indexOf(from) >= 0) { seen[String(m.messageId)] = 1; return; }                       // our own copies
    let body = '';
    try { const d = ttrisApi_('/api/accounts/' + c.account + '/folders/' + (m.folderId || c.folder) + '/messages/' + m.messageId + '/content'); body = ttrisText_((d && d.content) || ''); } catch (e) { body = String(m.summary || ''); }
    ttrisFile_({ zoho_id: String(m.messageId), from: from, from_name: String(m.sender || '').replace(/<.*>/, '').replace(/"/g, '').trim(), to: String(m.toAddress || '').slice(0, 300),
      subject: String(m.subject || '(no subject)'), body: body, at: new Date(+m.receivedTime || Date.now()).toISOString() });
    n++;
  });
  p.setProperty('TTRIS_LAST_TS', String(max)); p.setProperty('TTRIS_LAST_POLL', now_()); p.deleteProperty('TTRIS_LAST_ERROR');
  return { ok: true, fetched: n };
}
function ttrisOwnAddrs_() {
  const z = (function () { try { return zeptoConf_().from; } catch (e) { return ''; } })(), zo = (function () { try { return zohoConf_().from; } catch (e) { return ''; } })();
  return [ttrisConf_().email, z, zo, CONFIG.FROM_ALIAS].filter(isEmail_).map(lc_);
}
/** File one incoming message: find its thread, store it, and tell the feature it belongs to. */
function ttrisFile_(m) {
  const auto = TTRIS_AUTO.test(m.subject) ? 'auto' : TTRIS_BOUNCE.test(m.subject + ' ' + m.from) ? 'bounce' : '';
  const refs = (String(m.subject) + '\n' + m.body).match(/TTRIS-[A-Z0-9]{6}\b/g) || [];
  let t = null; for (let i = 0; i < refs.length && !t; i++) t = findRow_('TtrisRefs', refs[i]);
  if (!t && auto !== 'bounce') t = readAll_('TtrisRefs').filter(function (r) { return r.to_email === m.from; }).sort(function (a, b) { return String(a.last_out_at || a.created_at) < String(b.last_out_at || b.created_at) ? -1 : 1; }).pop() || null;
  if (!t && auto === 'bounce') { const addr = (m.body.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || []).map(lc_).filter(function (e) { return ttrisOwnAddrs_().indexOf(e) < 0; }); t = readAll_('TtrisRefs').filter(function (r) { return addr.indexOf(r.to_email) >= 0; }).pop() || null; }
  const rec = { id: newId_('TM'), ref: t ? t.ref : '', direction: 'in', from_email: m.from, from_name: m.from_name || '', to_email: m.to || '', subject: m.subject.slice(0, 300), body: String(m.body).slice(0, 20000),
    zoho_id: m.zoho_id || '', received_at: m.at || now_(), auto: auto, status: 'New', kind: t ? t.kind : '', rec_id: t ? t.rec_id : '' };
  appendRow_('TtrisMsgs', rec);
  if (t) { updateRow_('TtrisRefs', t.ref, { last_in_at: now_() });
    try { if (t.kind === 'sponsor') spInbound_(t, rec); else if (t.kind === 'submission') ttrisSubInbound_(t, rec); } catch (e) { Logger.log('ttris route: ' + e); } }
  return rec;
}
function ttrisSubInbound_(t, m) {
  if (m.auto) return;
  const r = findRow_('Submissions', t.rec_id); if (!r) return;
  updateRow_('Submissions', r.id, { status: 'New', notes: (r.notes ? r.notes + '\n' : '') + '[' + now_() + '] ' + m.from_email + ' replied by email (TTRIS)', updated_at: now_() });
  const to = settingsMap_().notify_email; if (isEmail_(to)) try { mail_(to, 'Reply received: ' + (r.subject || r.id), emailShell_('A website message got a reply', '<p><b>' + esc_(r.name) + '</b> replied to our email about <b>' + esc_(r.subject || r.type) + '</b>.</p><p><a href="' + CONFIG.ADMIN_URL + '#ttris">Open the TTRIS Inbox</a></p>'), { noCopy: true }); } catch (e) { }
}

// ───────── portal ─────────
function ttrisBoot_(me) {
  ttrisMust_(me);
  const c = ttrisConf_(), refs = {}; readAll_('TtrisRefs').forEach(function (r) { refs[r.ref] = r; });
  const sp = {}; readAll_('Outreach').forEach(function (s) { sp[s.id] = s.company; });
  const subs = {}; readAll_('Submissions').forEach(function (s) { subs[s.id] = s.name + ' · ' + (s.subject || s.type); });
  const label = function (k, id) { return k === 'sponsor' ? 'Sponsor · ' + (sp[id] || id) : k === 'submission' ? 'Website · ' + (subs[id] || id) : k === 'official' ? 'Official email · ' + id : k === 'inbox' ? 'Inbox thread' : ''; };
  const rows = readAll_('TtrisMsgs').filter(function (m) { return m.direction === 'in'; }).slice(-300).reverse()
    .map(function (m) { return { id: m.id, from: m.from_name || m.from_email, from_email: m.from_email, subject: m.subject, snippet: String(m.body).slice(0, 140), at: m.received_at, status: m.status, auto: m.auto, kind: m.kind || 'unsorted', ref: m.ref, thread: label(m.kind, m.rec_id) }; });
  const web = readAll_('Submissions').slice(-80).reverse().map(function (s) { return { id: s.id, type: s.type, name: s.name, email: s.email, subject: s.subject, status: s.status, at: s.created_at, snippet: String(s.message || '').slice(0, 140) }; });
  return { ok: true, super: me.role === 'super', conf: { email: c.email, cc: c.cc, connected: c.connected, lastPoll: c.lastPoll, lastError: c.lastError, scope: TTRIS_SCOPE,
    dcs: Object.keys(ZOHO_DCS).map(function (k) { return { id: k, label: ZOHO_DCS[k].label, console: ZOHO_DCS[k].accounts.replace('accounts.', 'api-console.') }; }) }, inbox: rows, web: web };
}
function ttrisThread_(me, b) {
  ttrisMust_(me);
  let ref = b.ref, head = null;
  if (b.msg) { const m = findRow_('TtrisMsgs', b.msg); if (!m) throw new Error('Not found.'); if (m.status === 'New') updateRow_('TtrisMsgs', m.id, { status: 'Read' }); ref = m.ref; head = m; }
  if (b.submission) { const s = findRow_('Submissions', b.submission); if (!s) throw new Error('Not found.');
    ref = (readAll_('TtrisRefs').filter(function (r) { return r.kind === 'submission' && r.rec_id === s.id; }).pop() || {}).ref || '';
    head = { from_email: s.email, from_name: s.name, subject: s.subject || ('Your message to TEDxThaltej Youth'), body: s.message, received_at: s.created_at, direction: 'in', web: true, sub_id: s.id }; }
  const msgs = ref ? readAll_('TtrisMsgs').filter(function (m) { return m.ref === ref; }) : (head && head.id ? [head] : []);
  if (head && head.web) msgs.unshift(head);
  return { ok: true, ref: ref, head: head ? { from: head.from_name || head.from_email, from_email: head.from_email, subject: head.subject, sub_id: head.sub_id || '', id: head.id || '' } : null,
    messages: msgs.map(function (m) { return { dir: m.direction, from: m.from_name || m.from_email, from_email: m.from_email, to: m.to_email, subject: m.subject, body: m.body, at: m.received_at, auto: m.auto }; }) };
}
function ttrisReply_(me, b) {
  ttrisMust_(me);
  const text = String(b.body || '').trim(); if (text.length < 2) throw new Error('Write your reply.');
  let to, subject, kind, recId, ref = b.ref || '';
  if (b.submission) return reply_(me, b.submission, text);
  const m = b.msg ? findRow_('TtrisMsgs', b.msg) : null;
  if (ref) { const t = findRow_('TtrisRefs', ref); if (!t) throw new Error('Thread not found.'); kind = t.kind; recId = t.rec_id; to = m ? m.from_email : t.to_email; subject = m ? m.subject : t.subject; }
  else if (m) { to = m.from_email; subject = m.subject; kind = 'inbox'; recId = m.id; ref = ttrisRefNew_('inbox', m.id, m.subject, m.from_email); updateRow_('TtrisMsgs', m.id, { ref: ref, kind: 'inbox', rec_id: m.id }); }
  else throw new Error('Choose a message to reply to.');
  if (!isEmail_(to)) throw new Error('No address to reply to.');
  rateLimit_('ttrisreply_' + lc_(me.email), 60, 3600);
  subject = /^re:/i.test(subject) ? subject : 'Re: ' + subject;
  ttrisSend_({ kind: kind, rec_id: recId, ref: ref, to: to, subject: subject, title: '', html: bcHtml_(text) + '<p style="margin-top:20px">' + esc_(me.name) + '<br><span style="color:#6B6455">TEDxThaltej Youth</span></p>',
    fromName: String(me.name || '').split(' ')[0] + ' · TEDxThaltej Youth', by: me.email });
  if (m) updateRow_('TtrisMsgs', m.id, { status: 'Done' });
  if (kind === 'sponsor') { const s = findRow_('Outreach', recId); if (s) updateRow_('Outreach', s.id, { last_contact_at: now_(), updated_at: now_() }); }
  audit_(me.email, 'TTRIS reply', ref);
  return { ok: true, ref: ref };
}
function ttrisMark_(me, b) {
  ttrisMust_(me);
  const m = findRow_('TtrisMsgs', b.id); if (!m) throw new Error('Not found.');
  const up = {};
  if (b.status) { if (['New', 'Read', 'Done'].indexOf(b.status) < 0) throw new Error('Bad status.'); up.status = b.status; }
  if (b.sponsor) {   // file under a sponsor
    const s = findRow_('Outreach', b.sponsor); if (!s) throw new Error('Company not found.');
    up.ref = ttrisRefFor_('sponsor', s.id, s.last_subject || s.company, s.email); up.kind = 'sponsor'; up.rec_id = s.id;
    updateRow_('TtrisMsgs', m.id, up); spInbound_(findRow_('TtrisRefs', up.ref), Object.assign({}, m, up)); return { ok: true };
  }
  updateRow_('TtrisMsgs', m.id, up);
  return { ok: true };
}
function ttrisSettings_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer.');
  const map = {};
  if (b.email != null) { if (!isEmail_(b.email)) throw new Error('Enter the TTRIS address.'); map.ttris_email = lc_(b.email); }
  if (b.cc != null) map.ttris_cc = b.cc ? 'TRUE' : 'FALSE';
  withLock_(function () { const ex = settingsMap_(); Object.keys(map).forEach(function (k) { if (ex[k] === undefined) appendRow_('Settings', { key: k, value: map[k] }); else updateRow_('Settings', k, { value: map[k] }); }); });
  bust_(); audit_(me.email, 'TTRIS settings', JSON.stringify(map));
  return { ok: true };
}
function ttrisHandle_(me, a, b) {
  if (a === 'ttrisBoot') return ttrisBoot_(me);
  if (a === 'ttrisThread') return ttrisThread_(me, b);
  if (a === 'ttrisReply') return ttrisReply_(me, b);
  if (a === 'ttrisMark') return ttrisMark_(me, b);
  if (a === 'ttrisSettings') return ttrisSettings_(me, b);
  if (a === 'ttrisConnect') return ttrisConnect_(me, b);
  if (a === 'ttrisDisconnect') return ttrisDisconnect_(me);
  if (a === 'ttrisPollNow') { ttrisMust_(me); return ttrisPoll_(); }
  return null;
}
