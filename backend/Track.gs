/**
 * Email log + open tracking for every email the system sends (system, bulk, outreach, TTRIS threads, official email).
 *  • mail_() records each email in MailLog (to, cc, subject, the text of the body, kind, provider, status, sent time) and adds a
 *    1×1 tracking image. Private emails (sign-in codes, passwords) are logged without their body.
 *  • The image is served by the website's Worker at /t/o/<id>.<sig>.gif; the Worker tells Apps Script (trk_open), which records
 *    the first open time, last open time and number of opens. The signature stops anyone faking opens.
 *  • Limits, honestly: opens are counted only when the reader's email app loads images. Apple Mail can load them in advance
 *    (an "open" that may not be a real read); Outlook often blocks them (a real read that isn't counted). One email to several
 *    people counts opens together. "Sent" is when our email service accepted it; bounces show up in the TTRIS Inbox.
 *  • The Organizer sees everything in Team Portal → Email log. QAC members can request the records for any address in a date
 *    range; the request is fulfilled at once, logged, and the Organizer is told.
 */
function trkSecret_() {
  const p = PropertiesService.getScriptProperties(); let s = p.getProperty('TRK_SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('TRK_SECRET', s); }
  return s;
}
function trkSig_(id) {
  return Utilities.computeHmacSha256Signature(String(id), trkSecret_()).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('').slice(0, 12);
}
function trkPixel_(id) {
  return '<img src="' + CONFIG.SITE_URL + '/t/o/' + id + '.' + trkSig_(id) + '.gif" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0" aria-hidden="true">';
}
function mlogKind_(subject, extra) {
  if (extra.kind) return String(extra.kind);
  if (extra.private || TTRIS_PRIVATE.test(String(subject || ''))) return 'private';
  if (extra.bulk) return 'bulk';
  if (extra.ref) return 'thread';
  return 'system';
}
/** Create the log row and return html with the tracking image. */
function mlogStart_(to, subject, html, extra) {
  try {
    const id = 'ML' + Utilities.getUuid().replace(/-/g, '').slice(0, 14).toUpperCase(), kind = mlogKind_(subject, extra);
    const priv = kind === 'private' || !!extra.private || TTRIS_PRIVATE.test(String(subject || ''));
    appendRow_('MailLog', { id: id, to_list: lc_([].concat(to).join(',')).slice(0, 2000), cc_list: lc_([].concat(extra.cc || []).join(',')).slice(0, 1000), bcc_list: lc_([].concat(extra.bcc || []).join(',')).slice(0, 1000),
      subject: String(subject || '').slice(0, 300), body: priv ? '[Private email: content not stored]' : ttrisText_(html).slice(0, 8000), kind: kind, ref: extra.ref || '', from_address: extra.fromAddress || '',
      provider: '', status: 'Sending', created_at: now_(), sent_at: '', opened_at: '', last_open_at: '', open_count: '0', open_agent: '', error: '' });
    const px = trkPixel_(id);
    html = /<\/body>/i.test(html) ? String(html).replace(/<\/body>/i, px + '</body>') : String(html) + px;
    return { id: id, html: html };
  } catch (e) { Logger.log('mlog: ' + e); return { id: '', html: html }; }
}
function mlogDone_(id, up) { if (!id) return; try { updateRow_('MailLog', id, up); } catch (e) { Logger.log('mlog update: ' + e); } }

/** Public: the Worker reports an open. */
function trkOpen_(d) {
  const id = String(d.id || ''), sig = String(d.sig || '');
  if (!/^ML[A-Z0-9]{8,20}$/.test(id) || sig !== trkSig_(id)) return { ok: false };
  const r = findRow_('MailLog', id); if (!r) return { ok: false };
  const ua = String(d.ua || '').slice(0, 160);
  const up = { last_open_at: now_(), open_count: String((+r.open_count || 0) + 1) };
  if (!r.opened_at) { up.opened_at = now_(); up.open_agent = /GoogleImageProxy/.test(ua) ? 'Gmail' : /YahooMailProxy/.test(ua) ? 'Yahoo' : /Outlook|Microsoft/.test(ua) ? 'Outlook' : /iPhone|iPad|Macintosh/.test(ua) ? 'Apple Mail' : 'Other'; }
  updateRow_('MailLog', id, up);
  return { ok: true };
}

// ───────── viewing ─────────
function mlogRow_(r) {
  return { id: r.id, to: r.to_list, cc: r.cc_list, bcc: r.bcc_list, subject: r.subject, kind: r.kind, status: r.status, provider: r.provider, from: r.from_address,
    sent_at: r.sent_at || r.created_at, opened_at: r.opened_at, last_open_at: r.last_open_at, opens: +r.open_count || 0, agent: r.open_agent, error: r.error, ref: r.ref };
}
function mlogFind_(email, from, to, q) {
  email = lc_(email || ''); q = String(q || '').toLowerCase();
  return readAll_('MailLog').filter(function (r) {
    const d = String(r.created_at).slice(0, 10);
    if (from && d < from) return false; if (to && d > to) return false;
    if (email && [r.to_list, r.cc_list, r.bcc_list].join(',').split(',').indexOf(email) < 0) return false;
    if (q && (r.subject + ' ' + r.to_list).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
}
function mlogList_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer sees the email log.');
  const all = mlogFind_(b.email, b.from, b.to, b.q), rows = all.slice(-500).reverse().map(mlogRow_);
  const sent = all.filter(function (r) { return r.status === 'Sent'; }), opened = sent.filter(function (r) { return r.opened_at; });
  return { ok: true, rows: rows, total: all.length, stats: { sent: sent.length, opened: opened.length, rate: sent.length ? Math.round(opened.length / sent.length * 100) : 0,
    failed: all.filter(function (r) { return r.status === 'Failed'; }).length, queued: all.filter(function (r) { return r.status === 'Queued'; }).length } };
}
function mlogGet_(me, id) {
  const r = findRow_('MailLog', id); if (!r) throw new Error('Not found.');
  if (me.role !== 'super') throw new Error('Only the Organizer.');
  return { ok: true, mail: Object.assign(mlogRow_(r), { body: r.body }) };
}
/** QAC: request every email sent to an address (fulfilled at once). */
function qacMailRequest_(me, b) {
  qacMust_(me);
  const email = lc_(b.email); if (!isEmail_(email)) throw new Error('Enter the email address.');
  const from = /^\d{4}-\d{2}-\d{2}$/.test(String(b.from || '')) ? b.from : '', to = /^\d{4}-\d{2}-\d{2}$/.test(String(b.to || '')) ? b.to : '';
  const purpose = String(b.purpose || '').trim().slice(0, 300); if (purpose.length < 5) throw new Error('Say briefly why the Committee needs these records.');
  rateLimit_('qacmail_' + lc_(me.email), 30, 86400);
  const rows = mlogFind_(email, from, to).reverse().slice(0, 1000).map(function (r) { return Object.assign(mlogRow_(r), { body: r.body }); });
  const id = newId_('QDR');
  appendRow_('QacDataRequests', { id: id, by: lc_(me.email), email: email, date_from: from, date_to: to, purpose: purpose, count: String(rows.length), created_at: now_() });
  audit_(me.email, 'QAC email records', email + ' (' + rows.length + ')');
  try { mail_(CONFIG.SUPER_ADMIN_EMAIL, 'QAC requested email records for ' + email, emailShell_('QAC email records request', '<p><b>' + esc_(me.name) + '</b> requested the email records for <b>' + esc_(email) + '</b>' + (from || to ? ' (' + esc_(from || 'start') + ' to ' + esc_(to || 'today') + ')' : '') + '. ' + rows.length + ' email' + (rows.length === 1 ? '' : 's') + ' were provided automatically.</p><p><b>Purpose:</b> ' + esc_(purpose) + '</p>', { kicker: 'Quality Assurance Committee' }), { noCopy: true, kind: 'system' }); } catch (e) { }
  return { ok: true, id: id, email: email, rows: rows };
}
function qacMailRequests_(me) {
  qacMust_(me);
  const names = {}; readAll_('Admins').forEach(function (a) { names[lc_(a.email)] = a.name; });
  return { ok: true, rows: readAll_('QacDataRequests').slice(-100).reverse().map(function (r) { return { id: r.id, by: names[r.by] || r.by, email: r.email, from: r.date_from, to: r.date_to, purpose: r.purpose, count: r.count, at: r.created_at }; }) };
}
