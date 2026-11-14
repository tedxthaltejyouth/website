/**
 * UPI payments: the /support page (contributions), paid main-event tickets and paid side events.
 *
 * How it works (no payment gateway):
 *  1. The site creates a payment with a reference (PAY-…) and shows a UPI QR code and a "Pay with UPI app" button,
 *     both carrying the exact amount, the UPI ID set in Site settings and the reference in the note.
 *  2. The payer pays from Google Pay, PhonePe, Paytm, BHIM or any UPI app, then uploads a screenshot of the successful
 *     payment (and, optionally, the 12-digit UPI transaction ID).
 *  3. Finance checks the bank app: same UTR, same amount. "Payment verified" posts the income to the books, emails a
 *     receipt (verifiable at /verify) and confirms the seat. "Not received" emails the payer to check and resend.
 *  UPI to a personal account cannot be confirmed automatically; a payment gateway (Razorpay, Cashfree…) would be
 *  needed for that.
 */
const PAY_PURPOSES = { support: ['Contribution', 'INC-103'], ticket: ['Event ticket', 'INC-102'], side: ['Side event ticket', 'INC-104'] };
const PAY_EXPIRE_HOURS = 48;

function payConf_() {
  const s = settingsMap_();
  return { upi: s.upi_id || '8980005283@idfcfirst', name: s.upi_name || 'Shah Fenil Pritesh', on: s.payments_on !== 'FALSE', support_on: s.support_on !== 'FALSE',
    presets: String(s.support_presets || '500,1000,2500,5000').split(',').map(function (x) { return parseInt(x, 10); }).filter(function (x) { return x > 0; }).slice(0, 6),
    ticket_price: money_(s.ticket_price || 0) };
}
function payLink_(p, c) {
  c = c || payConf_();
  return 'upi://pay?pa=' + encodeURIComponent(c.upi) + '&pn=' + encodeURIComponent(c.name) + '&am=' + (+p.amount).toFixed(2) + '&cu=INR&tn=' + encodeURIComponent('TEDxThaltej Youth ' + p.id);
}
function payId_() {
  const fy = fyOf_(), n = readAll_('Payments').filter(function (p) { return p.fy === fy; }).length + 1;
  return 'PAY/' + fy.replace('FY', '') + '/' + ('0000' + n).slice(-4);
}
function payPublic_(p, c) {
  c = c || payConf_();
  return { id: p.id, token: p.token, purpose: p.purpose, title: p.title, amount: +p.amount, status: p.status, name: p.name, upi: c.upi, upi_name: c.name, link: payLink_(p, c),
    utr: p.utr ? '••••••' + String(p.utr).slice(-4) : '', note: p.status === 'Not received' ? p.note : '', created_at: p.created_at,
    expires_at: p.status === 'Awaiting payment' ? new Date(new Date(p.created_at).getTime() + PAY_EXPIRE_HOURS * 3600000).toISOString() : '' };
}
/** Creates a payment. Called by the support page and by paid registrations. */
function payNew_(o) {
  const c = payConf_();
  if (!c.on) throw new Error('Online payments are paused right now. Please try again later.');
  const amt = money_(o.amount);
  if (!(amt >= 1) || amt > 100000) throw new Error('Enter an amount between ₹1 and ₹1,00,000 (the UPI limit for one payment).');
  const rec = { id: '', fy: fyOf_(), token: Utilities.getUuid().replace(/-/g, '').slice(0, 24), purpose: o.purpose, title: String(o.title || PAY_PURPOSES[o.purpose][0]).slice(0, 160),
    ref_id: o.ref_id || '', event_id: o.event_id || '', name: String(o.name).slice(0, 100), email: lc_(o.email), phone: String(o.phone || '').slice(0, 30), amount: String(amt),
    message: String(o.message || '').slice(0, 1000), show_name: o.show_name ? 'TRUE' : 'FALSE', utr: '', status: 'Awaiting payment', note: '', submitted_at: '',
    verified_by: '', verified_at: '', entry_id: '', receipt_code: '', created_at: now_(), updated_at: now_() };
  withLock_(function () { rec.id = payId_(); appendRow_('Payments', rec); });
  return rec;
}
function payBlock_(p, c) {   // the payment box in emails
  c = c || payConf_();
  return '<table style="width:100%;border:2px dashed #EB0028;border-radius:14px;margin:16px 0" cellpadding="16"><tr><td>' +
    '<div style="font-size:12px;letter-spacing:2px;color:#888">AMOUNT TO PAY</div><div style="font-size:30px;font-weight:800">' + inr_(p.amount) + '</div>' +
    '<div style="margin-top:8px">UPI ID: <b>' + esc_(c.upi) + '</b> (' + esc_(c.name) + ')<br>Reference: <b>' + esc_(p.id) + '</b></div></td></tr></table>' +
    '<p><a href="' + CONFIG.SITE_URL + '/pay/?p=' + encodeURIComponent(p.id) + '&t=' + p.token + '" style="display:inline-block;background:#EB0028;color:#fff;padding:12px 22px;border-radius:30px;text-decoration:none;font-weight:700">Open the payment page</a></p>' +
    '<p style="color:#666;font-size:13px">After paying, upload a screenshot of the successful payment on that page. We confirm once our team sees the payment in our account, usually within a day.</p>';
}

// ───────── public ─────────
function payHandle_(a, b) {
  if (a === 'info') return payInfo_();
  if (a === 'start') return payStart_(b);
  if (a === 'get') return payGet_(b);
  if (a === 'utr') return payUtr_(b);
  throw new Error('Unknown request.');
}
function payInfo_() {
  const c = payConf_();
  const wall = readAll_('Payments').filter(function (p) { return p.purpose === 'support' && p.status === 'Verified' && truthy_(p.show_name); })
    .slice(-60).reverse().map(function (p) { return String(p.name).split(' ').slice(0, 2).join(' '); });
  return { ok: true, on: c.on && c.support_on, upi: c.upi, upi_name: c.name, presets: c.presets, supporters: wall };
}
function payStart_(b) {
  if (b.website) return { ok: true };
  const c = payConf_();
  if (!c.on || !c.support_on) throw new Error('Contributions are paused right now. Please try again later.');
  const f = clean_(b, { name: 100, email: 120, phone: 30, message: 1000, amount: 12 });
  if (!f.name || !isEmail_(f.email)) throw new Error('Please enter your name and a valid email for the receipt.');
  if (!/^\+?\d{10,15}$/.test(String(f.phone).replace(/[\s\-().]/g, ''))) throw new Error('Please enter a valid phone number.');
  if (!b.consent) throw new Error('Please tick the box to agree to how we use your details.');
  rateLimit_('pay_' + lc_(f.email), 6, 3600);
  const p = payNew_({ purpose: 'support', title: 'Contribution to TEDxThaltej Youth', name: f.name, email: f.email, phone: f.phone, amount: f.amount, message: f.message, show_name: truthy_(b.show_name) });
  mail_(p.email, 'Your contribution to TEDxThaltej Youth: ' + inr_(p.amount), emailShell_('Thank you, ' + esc_(String(p.name).split(' ')[0]) + '!',
    '<p>Here are the details to complete your contribution by UPI.</p>' + payBlock_(p, c)));
  return { ok: true, payment: payPublic_(p, c) };
}
function payGet_(b) {
  const p = findRow_('Payments', String(b.id || ''));
  if (!p || !b.t || p.token !== String(b.t)) throw new Error('Payment not found. Check the link in your email.');
  return { ok: true, payment: payPublic_(p) };
}
/** The payer uploads a screenshot of the successful payment (required) and, if they can, the 12-digit UTR (optional).
 *  Screenshots are kept privately in Drive for Finance; the same image can't be used twice. */
function payUtr_(b) {
  return withLock_(function () {
    const p = findRow_('Payments', String(b.id || ''));
    if (!p || !b.t || p.token !== String(b.t)) throw new Error('Payment not found. Check the link in your email.');
    if (['Awaiting payment', 'Not received'].indexOf(p.status) < 0) throw new Error(p.status === 'Verified' ? 'This payment is already confirmed. Thank you!' : p.status === 'Expired' ? 'This payment link has expired. Please start again.' : 'We already have your payment details and are checking them.');
    rateLimit_('payutr_' + p.id, 6, 3600);
    const m = String(b.shot || '').match(/^data:(image\/(png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!m) throw new Error('Please add a screenshot of the successful payment from your UPI app.');
    if (m[3].length > 8000000) throw new Error('That screenshot is too large. Please upload a smaller image.');
    const utr = String(b.utr || '').replace(/\s/g, '');
    if (utr && !/^\d{12}$/.test(utr)) throw new Error('The UPI transaction ID has 12 digits. Leave it empty if you can’t find it.');
    const hash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, m[3], Utilities.Charset.UTF_8));
    const others = readAll_('Payments').filter(function (x) { return x.id !== p.id && x.status !== 'Not received'; });
    if (utr && others.some(function (x) { return x.utr === utr; })) throw new Error('This transaction ID has already been used for another payment.');
    if (others.some(function (x) { return x.shot_hash === hash; })) throw new Error('This screenshot has already been used for another payment.');
    const folder = opsFolder_('TEDxThaltej Youth — Payment screenshots (private)', 'PAY_SHOT_FOLDER_ID');
    const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(m[3]), m[1], p.id.replace(/\//g, '-') + '-' + Date.now() + (m[2] === 'png' ? '.png' : m[2] === 'webp' ? '.webp' : '.jpg')));
    updateRow_('Payments', p.id, { utr: utr, shot_file_id: file.getId(), shot_hash: hash, status: 'Submitted', submitted_at: now_(), updated_at: now_() });
    finPayers_().forEach(function (e) { mail_(e, 'UPI payment to verify: ' + inr_(p.amount) + ' from ' + p.name, emailShell_('A UPI payment to check',
      '<p><b>' + esc_(p.name) + '</b> says they paid <b>' + inr_(p.amount) + '</b> for ' + esc_(p.title) + ', and uploaded a screenshot.</p><p>' + (utr ? 'UTR: <b>' + utr + '</b> · ' : 'No transaction ID given · ') + 'Reference ' + esc_(p.id) + '</p>' +
      '<p>Look at the screenshot in the Team Portal, find the payment in the bank app, then mark it.</p><p><a href="' + CONFIG.ADMIN_URL + '#payments">Open UPI payments</a></p>')); });
    return { ok: true, payment: payPublic_(Object.assign({}, p, { utr: utr, status: 'Submitted' })) };
  });
}
function payShot_(me, b) {
  finMust_(me);
  const p = findRow_('Payments', String(b.id || '')); if (!p || !p.shot_file_id) throw new Error('No screenshot for this payment.');
  const blob = DriveApp.getFileById(p.shot_file_id).getBlob();
  return { ok: true, type: blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) };
}

// ───────── Finance (Team Portal) ─────────
function payList_(me) {
  finMust_(me);
  const c = payConf_();
  return { ok: true, conf: c, rows: readAll_('Payments').map(function (p) {
    return { id: p.id, purpose: p.purpose, title: p.title, name: p.name, email: p.email, phone: p.phone, amount: +p.amount, utr: p.utr, status: p.status, note: p.note, message: p.message,
      created_at: p.created_at, submitted_at: p.submitted_at, verified_by: p.verified_by, verified_at: p.verified_at, entry_id: p.entry_id, receipt_code: p.receipt_code, ref_id: p.ref_id, has_shot: !!p.shot_file_id };
  }).reverse() };
}
function payVerify_(me, b) {
  finMust_(me);
  const p = findRow_('Payments', String(b.id || '')); if (!p) throw new Error('Payment not found.');
  if (p.status !== 'Submitted') throw new Error('Only payments with a screenshot can be verified.');
  if (!truthy_(b.confirm)) throw new Error('Confirm that you found this payment in the bank account.');
  finSeed_();
  const pp = PAY_PURPOSES[p.purpose] || PAY_PURPOSES.support;
  const res = finPostCore_(me, { kind: 'Income', date: String(p.submitted_at || now_()).slice(0, 10), debit: 'BNK-101', credit: pp[1], amount: p.amount, party: p.name,
    narration: pp[0] + ': ' + p.title + ' (' + p.id + ')', mode: 'UPI', reference: p.utr ? 'UTR ' + p.utr : 'Screenshot ' + p.id, ref_id: p.id, voucher: true, payee_email: p.email });
  const code = res.voucher_code || '';
  updateRow_('Payments', p.id, { status: 'Verified', verified_by: lc_(me.email), verified_at: now_(), entry_id: res.id, receipt_code: code, updated_at: now_() });
  let seat = '';
  if (p.purpose === 'ticket' && p.ref_id) seat = payConfirmTicket_(p);
  else if (p.purpose === 'side' && p.ref_id) seat = payConfirmSide_(p);
  else mail_(p.email, 'Thank you for supporting TEDxThaltej Youth', emailShell_('Thank you, ' + esc_(String(p.name).split(' ')[0]) + '!',
    '<p>We have received your contribution of <b>' + inr_(p.amount) + '</b>. It helps us put young voices and ideas worth spreading on stage.</p>' +
    (code ? '<p>Your receipt has been emailed separately. Receipt code: <b>' + esc_(code) + '</b> (check it at ' + CONFIG.SITE_URL + '/verify).</p>' : '')));
  audit_(me.email, 'UPI payment verified', p.id + ' ' + p.amount + ' UTR ' + p.utr);
  return { ok: true, entry_id: res.id, receipt_code: code, voucher_error: res.voucher_error || '', seat: seat };
}
function payNotReceived_(me, b) {
  finMust_(me);
  const p = findRow_('Payments', String(b.id || '')); if (!p) throw new Error('Payment not found.');
  if (p.status !== 'Submitted') throw new Error('Only payments waiting for a check can be marked.');
  const note = String(b.note || '').trim().slice(0, 600) || 'We could not find a payment with this transaction ID and amount.';
  updateRow_('Payments', p.id, { status: 'Not received', note: note, updated_at: now_() });
  mail_(p.email, 'About your payment ' + p.id, emailShell_('We couldn’t find your payment yet',
    '<p>We checked our account for <b>' + inr_(p.amount) + '</b> and couldn’t match your payment.</p><p>' + esc_(note) + '</p>' +
    '<p>Please check that the payment went through in your UPI app, then upload the screenshot again (with the 12-digit transaction ID if you can find it). If you haven’t paid yet, you can pay now.</p>' + payBlock_(p)));
  audit_(me.email, 'UPI payment not received', p.id);
  return { ok: true };
}
function payConfirmTicket_(p) {
  const r = findRow_('Registrations', p.ref_id); if (!r || r.status === 'Approved') return r ? 'already confirmed' : '';
  const s = settingsMap_(), code = r.ticket_code || ticketCode_();
  updateRow_('Registrations', r.id, { status: 'Approved', ticket_code: code, updated_at: now_() });
  mail_(r.email, (s.event_name || 'TEDxThaltej Youth') + ': your ticket', emailShell_('Payment received. Your seat is confirmed!',
    '<p>Thank you, ' + esc_(String(r.name).split(' ')[0]) + '. We have received <b>' + inr_(p.amount) + '</b>.</p>' +
    '<table style="width:100%;border:2px dashed #e62b1e;border-radius:12px;margin:20px 0" cellpadding="18"><tr><td><div style="font-size:12px;letter-spacing:2px;color:#888">TICKET CODE</div>' +
    '<div style="font-size:30px;font-weight:800;letter-spacing:4px">' + code + '</div><div style="margin-top:10px">' + esc_(prettyDate_(s.event_date)) + (s.event_time ? ' · ' + esc_(s.event_time) : '') + '<br>' + esc_(s.venue || '') + '</div></td></tr></table>' +
    '<p>Please show this code at the entry desk. Your payment receipt is in a separate email.</p>'));
  return 'ticket ' + code;
}
function payConfirmSide_(p) {
  const r = findRow_('EventRegs', p.ref_id), ev = r && findRow_('SideEvents', r.event_id); if (!r) return '';
  updateRow_('EventRegs', r.id, { status: 'Confirmed' });
  CacheService.getScriptCache().remove('events');
  if (ev) mail_(r.email, 'You’re registered: ' + ev.title, emailShell_('Payment received. See you there!',
    '<p>Thank you, ' + esc_(String(r.name).split(' ')[0]) + '. Your seat for <b>' + esc_(ev.title) + '</b> is confirmed.</p><p><b>When:</b> ' + esc_(evtWhen_(ev)) + '<br><b>Where:</b> ' + esc_(ev.venue || 'To be announced') + '</p>' +
    '<p><a href="' + CONFIG.SITE_URL + '/events/?e=' + ev.slug + '">Event details and agenda</a></p>'));
  return 'side event seat confirmed';
}
function paySettings_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer changes payment settings.');
  const map = {};
  if (b.upi_id != null) { const v = String(b.upi_id).trim(); if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(v)) throw new Error('Enter a UPI ID like 8980005283@idfcfirst.'); map.upi_id = v; }
  if (b.upi_name != null) { const v = String(b.upi_name).trim().slice(0, 60); if (!v) throw new Error('Enter the name on the bank account.'); map.upi_name = v; }
  if (b.payments_on != null) map.payments_on = b.payments_on ? 'TRUE' : 'FALSE';
  if (b.support_on != null) map.support_on = b.support_on ? 'TRUE' : 'FALSE';
  if (b.support_presets != null) map.support_presets = String(b.support_presets).split(',').map(function (x) { return parseInt(x, 10); }).filter(function (x) { return x > 0 && x <= 100000; }).slice(0, 6).join(',');
  if (b.ticket_price != null) { const v = money_(b.ticket_price || 0); if (v < 0 || v > 100000) throw new Error('Ticket price must be between ₹0 and ₹1,00,000.'); map.ticket_price = String(v); }
  withLock_(function () { const ex = settingsMap_(); Object.keys(map).forEach(function (k) { if (ex[k] === undefined) appendRow_('Settings', { key: k, value: map[k] }); else updateRow_('Settings', k, { value: map[k] }); }); });
  bust_(); audit_(me.email, 'payment settings', JSON.stringify(map));
  return { ok: true };
}
/** Unpaid payments expire after 48 hours and free the seat they were holding. Runs hourly. */
function payExpire_() {
  const cut = Date.now() - PAY_EXPIRE_HOURS * 3600000;
  readAll_('Payments').filter(function (p) { return p.status === 'Awaiting payment' && new Date(p.created_at).getTime() < cut; }).forEach(function (p) {
    updateRow_('Payments', p.id, { status: 'Expired', updated_at: now_() });
    if (p.purpose === 'ticket' && p.ref_id) { const r = findRow_('Registrations', p.ref_id); if (r && r.status === 'Payment pending') updateRow_('Registrations', r.id, { status: 'Cancelled', updated_at: now_() }); }
    if (p.purpose === 'side' && p.ref_id && findRow_('EventRegs', p.ref_id)) { deleteRow_('EventRegs', p.ref_id); CacheService.getScriptCache().remove('events'); }
  });
}
