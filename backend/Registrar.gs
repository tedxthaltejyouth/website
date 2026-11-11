/**
 * Office of the Registrar (Charter Article 26).
 *
 *  • Anyone can be made Registrar (Portal users → "Registrar of TEDxThaltej Youth"), whatever their role.
 *  • The Registrar issues official instruments on the letterhead: letters (recommendation, association, appointment,
 *    notices, withdrawal acknowledgements), certificates, membership IDs (VID / E-VID), and registers physical
 *    documents with seal codes. Each gets a register number and a verification code; anyone can check it at /verify.
 *  • Members ask for letters and certificates from the portal (Charter 11.3, 14.3); requests land with the Registrar.
 *  • Documents are signed by the Organizer & Licensee only, and carry the Registrar's official seal.
 */
const REG_TYPES = {
  lor:          { label: 'Letter of Recommendation', kind: 'letter', member: true,
    fields: [['recipient_name', 'Full name', 1], ['recipient_email', 'Email (to send it)'], ['role', 'Role / position held', 1], ['department', 'Team / department'],
      ['period', 'Period of association', 1, 'e.g. June 2025 – June 2027'], ['addressee', 'Addressed to', 0, 'To whom it may concern'], ['purpose', 'Purpose', 0, 'e.g. university application'],
      ['highlights', 'Contributions to mention', 0, 'One per line'], ['body', 'Letter text (leave blank to write it for you)', 0, '', 'textarea']] },
  association:  { label: 'Letter of Association', kind: 'letter', member: true,
    fields: [['recipient_name', 'Full name', 1], ['recipient_email', 'Email (to send it)'], ['role', 'Role / position', 1], ['department', 'Team / department'],
      ['since', 'Associated since', 1, 'e.g. 1 July 2026'], ['status_line', 'Current status', 0, 'an active member'], ['purpose', 'Purpose', 0, 'e.g. internship application'], ['body', 'Letter text (leave blank to write it for you)', 0, '', 'textarea']] },
  appointment:  { label: 'Appointment Letter', kind: 'letter',
    fields: [['recipient_name', 'Full name', 1], ['recipient_email', 'Email (to send it)'], ['role', 'Position', 1], ['department', 'Team / department'],
      ['effective', 'Effective from', 1, 'e.g. 15 November 2026'], ['term', 'Term', 0, 'e.g. until the close of TEDxThaltej Youth 2027'], ['method', 'Appointed by', 0, 'Direct appointment by the Organizer (Article 6.2(A))'], ['body', 'Letter text (leave blank to write it for you)', 0, '', 'textarea']] },
  notice:       { label: 'Official Notice', kind: 'letter',
    fields: [['title', 'Notice title', 1], ['addressee', 'Addressed to', 0, 'All members of TEDxThaltej Youth'], ['recipient_email', 'Email a copy to (optional)'], ['body', 'Text of the notice', 1, '', 'textarea']] },
  withdrawal_ack: { label: 'Acknowledgement of Withdrawal', kind: 'letter',
    fields: [['recipient_name', 'Full name', 1], ['recipient_email', 'Email', 1], ['effective', 'Effective date', 1], ['body', 'Letter text (leave blank to write it for you)', 0, '', 'textarea']] },
  cert_appreciation: { label: 'Certificate of Appreciation', kind: 'cert', member: true, title: 'Of Appreciation',
    fields: [['recipient_name', 'Name on the certificate', 1], ['recipient_email', 'Email (to send it)'], ['line', 'For', 1, 'e.g. outstanding contribution to Speaker Support'], ['date_line', 'Date / edition', 0, 'e.g. TEDxThaltej Youth 2027 · 26 June 2027']] },
  cert_participation: { label: 'Certificate of Participation', kind: 'cert', member: true, title: 'Of Participation',
    fields: [['recipient_name', 'Name on the certificate', 1], ['recipient_email', 'Email (to send it)'], ['line', 'For taking part in', 1, 'e.g. TEDxThaltej Youth 2027 as a member of the Hosting team'], ['date_line', 'Date / edition']] },
  cert_completion: { label: 'Certificate of Completion', kind: 'cert', member: true, title: 'Of Completion',
    fields: [['recipient_name', 'Name on the certificate', 1], ['recipient_email', 'Email (to send it)'], ['line', 'For completing', 1, 'e.g. their tenure as Curation Associate, 2026–27'], ['date_line', 'Date / edition']] },
  cert_event:   { label: 'Side Event Certificate', kind: 'cert', title: 'Of Participation',
    fields: [['recipient_name', 'Name on the certificate', 1], ['recipient_email', 'Email (to send it)'], ['event', 'Side event', 1, 'Event title'], ['line', 'Wording', 0, 'for attending and taking part in'], ['date_line', 'Date']] },
  cert_award:   { label: 'Award Certificate', kind: 'cert', title: 'Award',
    fields: [['recipient_name', 'Name on the certificate', 1], ['recipient_email', 'Email (to send it)'], ['award', 'Award', 1, 'e.g. Torch Bearer Award'], ['line', 'Citation', 1], ['date_line', 'Date / edition']] },
  vid:          { label: 'Membership ID (VID)', kind: 'id', member: true,
    fields: [['recipient_name', 'Member name', 1], ['recipient_email', 'Member email', 1], ['role', 'Role', 0], ['department', 'Team'], ['since', 'Member since', 0]] },
  evid:         { label: 'Event ID (E-VID)', kind: 'id',
    fields: [['recipient_name', 'Member name', 1], ['recipient_email', 'Member email', 1], ['vid', 'Linked VID number', 1, 'TXTY-VID-0001'], ['edition', 'Edition / event', 1, 'e.g. TEDxThaltej Youth 2027 · The Zenith'], ['role', 'Role for this event']] },
  physical:     { label: 'Physical document (seal codes)', kind: 'physical',
    fields: [['title', 'Document title', 1], ['recipient_name', 'Issued to / prepared by'], ['recipient_email', 'Their email'], ['pages', 'Number of pages', 1, '1'], ['seals', 'Seals to stamp', 1, '1'], ['notes', 'Notes']] },
};
const REQ_STATUSES = ['Submitted', 'Issued', 'Declined'];

function isRegistrar_(me) { return me.role === 'super' || truthy_(me.registrar); }
function regMust_(me) { if (!isRegistrar_(me)) throw new Error('Only the Registrar can do this.'); }
function regFolder_() {
  const props = PropertiesService.getScriptProperties();
  let root = null;
  try { root = props.getProperty('REGISTRAR_FOLDER_ID') ? DriveApp.getFolderById(props.getProperty('REGISTRAR_FOLDER_ID')) : null; } catch (e) { root = null; }
  if (!root) { root = DriveApp.createFolder('TEDxThaltej Youth — Office of the Registrar'); props.setProperty('REGISTRAR_FOLDER_ID', root.getId()); }
  const y = now_().slice(0, 4), it = root.getFoldersByName(y);
  return it.hasNext() ? it.next() : root.createFolder(y);
}
function regCode_() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = 'TXTY-';
  for (let i = 0; i < 8; i++) { s += c[Math.floor(Math.random() * c.length)]; if (i === 3) s += '-'; }
  return s;
}
function regNorm_(code) { return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function longDate_(iso) { return Utilities.formatDate(new Date(String(iso).slice(0, 10) + 'T12:00:00+05:30'), 'Asia/Kolkata', 'd MMMM yyyy'); }

// ───────────────────────────── ISSUE ─────────────────────────────
function regIssue_(me, b) {
  regMust_(me);
  const T = REG_TYPES[b.type];
  if (!T) throw new Error('Choose what to issue.');
  const f = {};
  T.fields.forEach(function (x) {
    const v = String((b.fields || {})[x[0]] || '').trim().slice(0, x[0] === 'body' ? 8000 : 400);
    if (x[2] && !v) throw new Error('Fill in: ' + x[1]);
    f[x[0]] = v;
  });
  if (f.recipient_email && !isEmail_(f.recipient_email)) throw new Error('That email does not look right.');
  if (f.recipient_email) f.recipient_email = lc_(f.recipient_email);
  if (b.type === 'physical') { f.pages = String(Math.min(500, Math.max(1, parseInt(f.pages, 10) || 1))); f.seals = String(Math.min(200, Math.max(1, parseInt(f.seals, 10) || 1))); }
  if (b.type === 'vid' && readAll_('Register').some(function (r) { return r.type === 'vid' && r.status === 'Valid' && r.recipient_email === f.recipient_email; }))
    throw new Error('This member already has a valid VID. Void it first to reissue.');
  return withLock_(function () {
    const year = now_().slice(0, 4), rows = readAll_('Register');
    const n = rows.filter(function (r) { return String(r.id).indexOf('TXTY/REG/' + year + '/') === 0; }).length + 1;
    const rec = { id: 'TXTY/REG/' + year + '/' + ('000' + n).slice(-4), code: regCode_(), type: b.type, title: f.title || T.label + (f.recipient_name ? ' — ' + f.recipient_name : ''),
      recipient_name: f.recipient_name || '', recipient_email: f.recipient_email || '', issued_by: lc_(me.email), issued_at: now_(), status: 'Valid',
      void_reason: '', voided_by: '', voided_at: '', file_id: '', request_id: String(b.request_id || ''), seal_codes: '', pages: f.pages || '', notes: f.notes || '' };
    if (b.type === 'vid') f.vid = 'TXTY-VID-' + ('000' + (rows.filter(function (r) { return r.type === 'vid'; }).length + 1)).slice(-4);
    if (b.type === 'physical') {
      const codes = []; for (let i = 1; i <= +f.seals; i++) codes.push('S-' + rec.code.slice(5, 9) + '-' + ('0' + i).slice(-2));
      rec.seal_codes = codes.join(',');
    }
    rec.fields_json = JSON.stringify(f);
    if (T.kind !== 'physical') {
      const pdf = T.kind === 'letter' ? letterPdf_(rec, f, T) : certPdf_(rec, f, T);
      rec.file_id = regFolder_().createFile(pdf).getId();
    }
    appendRow_('Register', rec);
    if (rec.request_id && findRow_('Requests', rec.request_id)) updateRow_('Requests', rec.request_id, { status: 'Issued', doc_id: rec.id, updated_at: now_() });
    if (b.send !== false && rec.recipient_email && rec.file_id) regSendCopy_(rec);
    audit_(me.email, 'registrar issued', rec.id + ' ' + rec.type + ' ' + rec.recipient_name);
    return { ok: true, id: rec.id, code: rec.code, seal_codes: rec.seal_codes ? rec.seal_codes.split(',') : [], vid: f.vid || '' };
  });
}

function regSendCopy_(rec) {
  const T = REG_TYPES[rec.type];
  const blob = DriveApp.getFileById(rec.file_id).getBlob();
  mail_(rec.recipient_email, T.label + ' — TEDxThaltej Youth', emailShell_(esc_(T.label) + ' issued',
    '<p>Dear ' + esc_(String(rec.recipient_name || 'member').split(' ')[0]) + ',</p><p>The Office of the Registrar has issued your <b>' + esc_(T.label.toLowerCase()) + '</b>. It is attached to this email.</p>' +
    '<p>Register number: <b>' + esc_(rec.id) + '</b><br>Verification code: <b>' + esc_(rec.code) + '</b></p>' +
    '<p>Anyone can check that it is genuine at <a href="' + CONFIG.SITE_URL + '/verify/?c=' + rec.code + '">' + CONFIG.SITE_URL.replace('https://', '') + '/verify</a>.</p>'),
    { attachments: [blob], name: 'Office of the Registrar · TEDxThaltej Youth' });
}

function regDefaultBody_(type, f) {
  const n = f.recipient_name, first = String(n || '').split(' ')[0];
  const hl = String(f.highlights || '').split('\n').map(function (x) { return x.trim(); }).filter(String);
  if (type === 'lor') return 'It gives me great pleasure to recommend ' + n + ', who served TEDxThaltej Youth as ' + f.role + (f.department ? ' in the ' + f.department + ' team' : '') + ' during ' + f.period + '.\n\n' +
    (hl.length ? 'During this time, ' + first + ':\n' + hl.map(function (x) { return '- ' + x; }).join('\n') + '\n\n' : '') +
    first + ' brought commitment, curiosity and a sense of responsibility to the work of an independently organised TEDx event, and worked well with a young, diverse team.' +
    (f.purpose ? ' I recommend ' + first + ' wholeheartedly for ' + f.purpose + '.' : ' I recommend ' + first + ' wholeheartedly.') + '\n\nPlease feel free to verify this letter using the code below.';
  if (type === 'association') return 'This is to confirm that ' + n + ' has been associated with TEDxThaltej Youth since ' + f.since + ' as ' + f.role + (f.department ? ' in the ' + f.department + ' team' : '') + ', and is ' + (f.status_line || 'an active member') + ' of the organisation as of the date of this letter.' +
    (f.purpose ? '\n\nThis letter is issued at their request for ' + f.purpose + '.' : '') + '\n\nTEDxThaltej Youth is an independently organised TEDx event operated under license from TED.';
  if (type === 'appointment') return 'Under the authority of the Organizer and in accordance with Article 6 of the TEDxThaltej Charter, you are hereby appointed as ' + f.role + (f.department ? ' in the ' + f.department + ' team' : '') + ' of TEDxThaltej Youth, with effect from ' + f.effective + (f.term ? ', ' + f.term : '') + '.\n\n' +
    'Method of appointment: ' + (f.method || 'Direct appointment by the Organizer (Article 6.2(A))') + '.\n\nIn this role you will act within the scope assigned to you, in line with the Charter and the policies issued under it. This appointment remains subject to the final authority of the Organizer (Article 6.4).\n\nCongratulations, and welcome to your new responsibility.';
  if (type === 'withdrawal_ack') return 'This is to acknowledge the Withdrawal Form submitted by ' + n + ' under Article 10 of the TEDxThaltej Charter.\n\nThe withdrawal is accepted with effect from ' + f.effective + '. From that date, all rights, privileges and access associated with membership cease (Article 10.4), while confidentiality obligations continue (Article 16.2.4). Any rejoining would require the explicit permission of the Organizer and fresh onboarding (Article 10.5).\n\nWe thank ' + first + ' for their contribution to TEDxThaltej Youth.';
  return '';
}

/** A4 letter on the official letterhead, built as a Google Doc and exported to PDF. */
function letterPdf_(rec, f, T) {
  const doc = DocumentApp.create('Registrar ' + rec.code);
  const id = doc.getId();
  try {
    const body = doc.getBody();
    body.setPageWidth(595.28).setPageHeight(841.89).setMarginLeft(60).setMarginRight(60).setMarginTop(24).setMarginBottom(24);
    const base = {}; base[DocumentApp.Attribute.FONT_FAMILY] = 'Inter'; base[DocumentApp.Attribute.FONT_SIZE] = 11; base[DocumentApp.Attribute.FOREGROUND_COLOR] = '#101B3D';
    base[DocumentApp.Attribute.LINE_SPACING] = 1.25;
    // letterhead: header + faint X watermark, footer strip
    const header = doc.addHeader(), hp = header.getParagraphs()[0] || header.appendParagraph('');
    hp.appendInlineImage(lhBlob_(LH_HEADER_JPG, 'image/jpeg', 'header.jpg')).setWidth(475).setHeight(78);
    try {
      hp.addPositionedImage(lhBlob_(LH_WATERMARK_PNG, 'image/png', 'x.png')).setWidth(380).setHeight(350).setLeftOffset(48).setTopOffset(190)
        .setLayout(DocumentApp.PositionedLayout.ABOVE_TEXT);
    } catch (e) { Logger.log('watermark: ' + e); }
    const footer = doc.addFooter(), fp = footer.getParagraphs()[0] || footer.appendParagraph('');
    fp.appendInlineImage(lhBlob_(LH_FOOTER_JPG, 'image/jpeg', 'footer.jpg')).setWidth(475).setHeight(50);

    const P = function (text, o) {
      o = o || {};
      const p = body.appendParagraph(text || '');
      p.setAttributes(base);
      if (o.size) p.setFontSize(o.size);
      if (o.bold) p.setBold(true);
      if (o.color) p.setForegroundColor(o.color);
      if (o.align) p.setAlignment(o.align);
      if (o.heading) p.setFontFamily('Anton');
      p.setSpacingAfter(o.after === undefined ? 6 : o.after);
      return p;
    };
    const first = body.getParagraphs()[0]; first.setText(''); first.setAttributes(base);
    // reference block
    [['Ref. No.  ' + rec.id], ['Date  ' + longDate_(rec.issued_at)], ['Verification code  ' + rec.code]].forEach(function (r) { P(r[0], { size: 9.5, align: DocumentApp.HorizontalAlignment.RIGHT, after: 0, color: '#3b4466' }); });
    P('', { after: 8 });
    P(f.addressee || (rec.type === 'notice' ? 'All members of TEDxThaltej Youth' : rec.type === 'lor' ? 'To whom it may concern' : f.recipient_name), { bold: true, after: 10 });
    P((rec.type === 'notice' ? 'Notice: ' + f.title : 'Subject: ' + T.label + (f.recipient_name && rec.type !== 'notice' ? ' — ' + f.recipient_name : '')), { bold: true, after: 12 });
    if (rec.type === 'appointment') P('Dear ' + String(f.recipient_name).split(' ')[0] + ',', { after: 8 });
    const text = f.body || regDefaultBody_(rec.type, f);
    text.split(/\n\s*\n/).forEach(function (para) {
      const lines = para.split('\n');
      if (lines.every(function (l) { return /^\s*-\s+/.test(l); })) lines.forEach(function (l) { const li = body.appendListItem(l.replace(/^\s*-\s+/, '')); li.setAttributes(base); li.setGlyphType(DocumentApp.GlyphType.BULLET); });
      else P(para.replace(/\n/g, ' '), { after: 10, align: DocumentApp.HorizontalAlignment.JUSTIFY });
    });
    P('', { after: 4 });
    P(rec.type === 'notice' ? 'By order,' : 'Yours sincerely,', { after: 2 });
    // signature (Organizer) + seal + QR
    const tbl = body.appendTable([['', '', '']]);
    tbl.setBorderWidth(0);
    const c0 = tbl.getCell(0, 0), c1 = tbl.getCell(0, 1), c2 = tbl.getCell(0, 2);
    c0.setWidth(230); c1.setWidth(110); c2.setWidth(135);
    const sig = organizerSigBlob_();
    const s0 = c0.getChild(0).asParagraph();
    if (sig) s0.appendInlineImage(sig).setWidth(140).setHeight(47); else s0.appendText('(digitally issued)').setItalic(true);
    [['Fenil Pritesh Shah', true], ['Organizer & Licensee', false], ['TEDxThaltej Youth', false]].forEach(function (x) { const p = c0.appendParagraph(x[0]); p.setAttributes(base); p.setFontSize(x[1] ? 11 : 9.5).setBold(x[1]).setSpacingAfter(0); });
    c1.getChild(0).asParagraph().appendInlineImage(lhBlob_(LH_SEAL_PNG, 'image/png', 'seal.png')).setWidth(88).setHeight(88);
    const qr = qrBlob_(CONFIG.SITE_URL + '/verify/?c=' + rec.code);
    const q0 = c2.getChild(0).asParagraph(); q0.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    if (qr) q0.appendInlineImage(qr).setWidth(70).setHeight(70);
    const qt = c2.appendParagraph('Scan to verify'); qt.setAttributes(base); qt.setFontSize(8).setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    P('Registered and authenticated by the Office of the Registrar, TEDxThaltej Youth (registrar@tedxthaltejyouth.in), under Article 26 of the TEDxThaltej Charter. Verify at ' +
      CONFIG.SITE_URL.replace('https://', '') + '/verify with code ' + rec.code + '. This independent TEDx event is operated under license from TED.', { size: 8, color: '#5b6283', after: 0 });
    doc.saveAndClose();
    return DriveApp.getFileById(id).getAs('application/pdf').setName(rec.id.replace(/\//g, '-') + ' ' + T.label + (f.recipient_name ? ' — ' + f.recipient_name : '') + '.pdf');
  } finally {
    try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* ignore */ }
  }
}

/** Landscape certificate / ID card, built as a Google Slide and exported to PDF. */
function certPdf_(rec, f, T) {
  const pres = SlidesApp.create('Registrar ' + rec.code);
  const id = pres.getId();
  try {
    const s = pres.getSlides()[0];
    s.getPageElements().forEach(function (e) { e.remove(); });
    const W = pres.getPageWidth(), H = pres.getPageHeight();
    const N = '#101B3D', R = '#EB0028', Y = '#FFC83D', C = '#FFF4E2';
    s.getBackground().setSolidFill(C);
    const shape = function (type, x, y, w, h, fill, line, weight) {
      const sh = s.insertShape(type, x, y, w, h);
      if (fill) sh.getFill().setSolidFill(fill); else sh.getFill().setTransparent();
      if (line) sh.getBorder().setWeight(weight || 2).getLineFill().setSolidFill(line); else sh.getBorder().setTransparent();
      return sh;
    };
    const text = function (t, x, y, w, h, o) {
      const tb = s.insertTextBox(t, x, y, w, h), r = tb.getText();
      r.getTextStyle().setFontFamily(o.font || 'Inter').setFontSize(o.size || 12).setForegroundColor(o.color || N).setBold(!!o.bold);
      r.getParagraphStyle().setParagraphAlignment(o.align || SlidesApp.ParagraphAlignment.CENTER);
      tb.setContentAlignment(o.v || SlidesApp.ContentAlignment.MIDDLE);
      return tb;
    };
    // poster shapes
    shape(SlidesApp.ShapeType.ELLIPSE, -60, -60, 170, 170, Y, N, 3);
    shape(SlidesApp.ShapeType.ELLIPSE, W - 110, H - 110, 190, 190, R, N, 3);
    shape(SlidesApp.ShapeType.ELLIPSE, W - 64, 40, 26, 26, '#2D6BFF', N, 2);
    shape(SlidesApp.ShapeType.RECTANGLE, 18, 18, W - 36, H - 36, null, N, 3);
    s.insertImage(lhBlob_(LH_WATERMARK_PNG, 'image/png', 'x.png'), W - 300, 70, 250, 230);
    s.insertImage(lhBlob_(LH_LOGO_PNG, 'image/png', 'logo.png'), 44, 36, 190, 21);
    text('No. ' + rec.id, W - 260, 30, 220, 22, { size: 9, color: '#3b4466', align: SlidesApp.ParagraphAlignment.END });
    if (T.kind === 'id') {
      text(rec.type === 'vid' ? 'MEMBERSHIP ID' : 'EVENT ID', 44, 78, 420, 54, { font: 'Anton', size: 40, align: SlidesApp.ParagraphAlignment.START });
      text(rec.type === 'vid' ? 'VID · permanent for the whole of your association' : 'E-VID · linked to VID ' + (f.vid || ''), 44, 128, 460, 22, { size: 11, color: R, bold: true, align: SlidesApp.ParagraphAlignment.START });
      text(f.recipient_name, 44, 162, 480, 50, { font: 'Anton', size: 34, align: SlidesApp.ParagraphAlignment.START });
      shape(SlidesApp.ShapeType.RECTANGLE, 44, 212, 120, 5, R);
      const idno = rec.type === 'vid' ? f.vid : rec.code.replace('TXTY-', 'TXTY-EVID-');
      text(idno, 44, 226, 360, 40, { font: 'Anton', size: 26, color: R, align: SlidesApp.ParagraphAlignment.START });
      text([f.role, f.department, rec.type === 'vid' ? (f.since ? 'Member since ' + f.since : '') : f.edition].filter(String).join('  ·  '), 44, 266, 520, 22, { size: 11, align: SlidesApp.ParagraphAlignment.START });
    } else {
      text('CERTIFICATE', 60, 70, W - 120, 60, { font: 'Anton', size: 50 });
      text((T.title || '').toUpperCase(), 60, 126, W - 120, 30, { font: 'Anton', size: 20, color: R });
      text(rec.type === 'cert_award' ? 'This award is presented to' : 'This certificate is presented to', 60, 160, W - 120, 22, { size: 12 });
      text(f.recipient_name, 60, 182, W - 120, 56, { font: 'Anton', size: 38 });
      shape(SlidesApp.ShapeType.RECTANGLE, W / 2 - 70, 240, 140, 4, R);
      const line = rec.type === 'cert_award' ? (f.award ? f.award + ': ' : '') + f.line : rec.type === 'cert_event' ? (f.line || 'for attending and taking part in') + ' ' + f.event : f.line;
      text(line + (f.date_line ? '\n' + f.date_line : ''), 90, 250, W - 180, 44, { size: 12 });
    }
    // signature, seal, QR
    const sig = organizerSigBlob_();
    if (sig) s.insertImage(sig, 56, H - 104, 120, 40);
    shape(SlidesApp.ShapeType.RECTANGLE, 56, H - 62, 150, 1.5, N);
    text('Fenil Pritesh Shah\nOrganizer & Licensee', 44, H - 60, 180, 32, { size: 9, align: SlidesApp.ParagraphAlignment.START, v: SlidesApp.ContentAlignment.TOP });
    text('Issued ' + longDate_(rec.issued_at), 230, H - 50, 150, 16, { size: 8.5, color: '#3b4466', align: SlidesApp.ParagraphAlignment.START });
    s.insertImage(lhBlob_(LH_SEAL_PNG, 'image/png', 'seal.png'), W / 2 - 36, H - 112, 72, 72);
    const qr = qrBlob_(CONFIG.SITE_URL + '/verify/?c=' + rec.code);
    if (qr) s.insertImage(qr, W - 150, H - 118, 56, 56);
    text('Verify at ' + CONFIG.SITE_URL.replace('https://', '') + '/verify\n' + rec.code, W - 230, H - 58, 136, 28, { size: 7.5, color: '#3b4466', align: SlidesApp.ParagraphAlignment.END, v: SlidesApp.ContentAlignment.TOP });
    pres.saveAndClose();
    return DriveApp.getFileById(id).getAs('application/pdf').setName(rec.id.replace(/\//g, '-') + ' ' + T.label + ' — ' + f.recipient_name + '.pdf');
  } finally {
    try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* ignore */ }
  }
}

function organizerSigBlob_() {
  const id = PropertiesService.getScriptProperties().getProperty('ORGANIZER_SIG_FILE_ID');
  if (!id) return null;
  try { return DriveApp.getFileById(id).getBlob(); } catch (e) { return null; }
}
function qrBlob_(text) {
  try {
    const r = UrlFetchApp.fetch('https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&format=png&data=' + encodeURIComponent(text), { muteHttpExceptions: true });
    return r.getResponseCode() === 200 ? r.getBlob().setName('qr.png') : null;
  } catch (e) { return null; }
}

/** Super-admin: save the Organizer's signature used on every document (also used to countersign speakers). */
function orgSigSave_(me, dataUrl) {
  if (me.role !== 'super') throw new Error('Only the Organizer can set the signature.');
  const id = recordsFolder_('Signatures').createFile(dataUrlBlob_(dataUrl, 'organizer-signature.png')).getId();
  PropertiesService.getScriptProperties().setProperty('ORGANIZER_SIG_FILE_ID', id);
  audit_(me.email, 'organizer signature updated', '');
  return { ok: true };
}

// ───────────────────────────── REGISTER ─────────────────────────────
function regList_(me) {
  regMust_(me);
  return { ok: true, rows: readAll_('Register').reverse().map(function (r) { const o = Object.assign({}, r); o.fields = safeJson_(r.fields_json, {}); delete o.fields_json; delete o._row; return o; }),
    types: Object.keys(REG_TYPES).map(function (k) { return { id: k, label: REG_TYPES[k].label, kind: REG_TYPES[k].kind, fields: REG_TYPES[k].fields }; }),
    requests: readAll_('Requests').reverse(), hasSignature: !!PropertiesService.getScriptProperties().getProperty('ORGANIZER_SIG_FILE_ID'), isSuper: me.role === 'super',
    people: readAll_('Admins').filter(function (a) { return truthy_(a.active); }).map(function (a) { return { email: lc_(a.email), name: a.name, department_id: a.department_id, role: a.role }; }),
    departments: readAll_('Departments').map(function (d) { return { id: d.id, name: d.name }; }),
    events: readAll_('SideEvents').map(function (e) { return { id: e.id, title: e.title, date: String(e.starts_at).slice(0, 10) }; }) };
}
function regVoid_(me, id, reason) {
  regMust_(me);
  const r = findRow_('Register', id);
  if (!r) throw new Error('Document not found.');
  if (r.status === 'Void') throw new Error('Already void.');
  reason = String(reason || '').trim().slice(0, 500);
  if (!reason) throw new Error('Give a reason for voiding (it is shown when someone verifies it).');
  updateRow_('Register', id, { status: 'Void', void_reason: reason, voided_by: lc_(me.email), voided_at: now_() });
  audit_(me.email, 'registrar voided', id + ' · ' + reason);
  return { ok: true };
}
function regPdf_(me, id) {
  const r = findRow_('Register', id);
  if (!r || !r.file_id) throw new Error('Document not found.');
  if (!isRegistrar_(me) && r.recipient_email !== lc_(me.email)) throw new Error('Document not found.');
  const f = DriveApp.getFileById(r.file_id);
  return { ok: true, name: f.getName(), base64: Utilities.base64Encode(f.getBlob().getBytes()), status: r.status };
}
function regResend_(me, id) {
  regMust_(me);
  const r = findRow_('Register', id);
  if (!r || !r.file_id || !r.recipient_email) throw new Error('Nothing to send.');
  regSendCopy_(r);
  return { ok: true };
}
function myDocs_(me) {
  return { ok: true, rows: readAll_('Register').filter(function (r) { return r.recipient_email === lc_(me.email); }).reverse()
    .map(function (r) { return { id: r.id, code: r.code, type: r.type, label: (REG_TYPES[r.type] || {}).label || r.type, title: r.title, issued_at: r.issued_at, status: r.status, void_reason: r.void_reason, has_file: !!r.file_id }; }),
    requests: readAll_('Requests').filter(function (q) { return q.email === lc_(me.email); }).reverse(),
    requestable: Object.keys(REG_TYPES).filter(function (k) { return REG_TYPES[k].member; }).map(function (k) { return { id: k, label: REG_TYPES[k].label }; }) };
}

// ───────────────────────────── REQUESTS (Charter 11.3, 14.3) ─────────────────────────────
function reqNew_(me, b) {
  const T = REG_TYPES[b.type];
  if (!T || !T.member) throw new Error('Choose a letter or certificate.');
  const purpose = String(b.purpose || '').trim().slice(0, 400), details = String(b.details || '').trim().slice(0, 3000);
  if (!purpose) throw new Error('Tell the Registrar what it is for.');
  if (readAll_('Requests').some(function (q) { return q.email === lc_(me.email) && q.type === b.type && q.status === 'Submitted'; })) throw new Error('You already have a pending request of this kind.');
  rateLimit_('req_' + lc_(me.email), 10, 3600);
  const n = readAll_('Requests').length + 1;
  const rec = { id: 'REQ-' + now_().slice(0, 4) + '-' + ('000' + n).slice(-4), email: lc_(me.email), name: me.name || me.email, type: b.type, purpose: purpose, details: details,
    status: 'Submitted', doc_id: '', registrar_note: '', created_at: now_(), updated_at: now_() };
  appendRow_('Requests', rec);
  regNotify_('New request: ' + T.label + ' from ' + rec.name, '<p><b>' + esc_(rec.name) + '</b> asked for a <b>' + esc_(T.label) + '</b>.</p><p>Purpose: ' + esc_(purpose) + '</p>' + (details ? '<p>' + esc_(details).replace(/\n/g, '<br>') + '</p>' : ''));
  return { ok: true, id: rec.id };
}
function reqDecline_(me, id, note) {
  regMust_(me);
  const q = findRow_('Requests', id);
  if (!q || q.status !== 'Submitted') throw new Error('Request not found.');
  note = String(note || '').trim().slice(0, 1000);
  if (!note) throw new Error('Tell the member why (Charter 11.1 eligibility).');
  updateRow_('Requests', id, { status: 'Declined', registrar_note: note, updated_at: now_() });
  mail_(q.email, 'Your request — Office of the Registrar', emailShell_('About your request',
    '<p>Your request for a <b>' + esc_((REG_TYPES[q.type] || {}).label || q.type) + '</b> (' + esc_(q.id) + ') could not be issued.</p><p>' + esc_(note).replace(/\n/g, '<br>') + '</p>'));
  return { ok: true };
}
function regNotify_(subject, html) {
  const regs = readAll_('Admins').filter(function (a) { return truthy_(a.active) && truthy_(a.registrar); }).map(function (a) { return lc_(a.email); });
  const to = regs.length ? regs : [lc_(CONFIG.SUPER_ADMIN_EMAIL)];
  to.forEach(function (e) { mail_(e, subject, emailShell_('Office of the Registrar', html + '<p><a href="' + CONFIG.ADMIN_URL + '#registrar">Open the Office of the Registrar</a></p>')); });
}

// ───────────────────────────── PUBLIC VERIFY ─────────────────────────────
function regVerify_(code) {
  const c = regNorm_(code);
  if (c.length < 6) throw new Error('Enter the code printed on the document.');
  rateLimit_('verify', 300, 3600);
  const rows = readAll_('Register');
  let r = rows.filter(function (x) { return regNorm_(x.code) === c || regNorm_(x.id) === c; })[0], seal = null;
  if (!r) {
    r = rows.filter(function (x) { return x.seal_codes && x.seal_codes.split(',').some(function (s) { return regNorm_(s) === c; }); })[0];
    if (r) { const codes = r.seal_codes.split(','); const i = codes.map(regNorm_).indexOf(c); seal = { n: i + 1, of: codes.length, code: codes[i] }; }
  }
  if (!r) return { ok: true, found: false };
  const T = REG_TYPES[r.type] || {}, f = safeJson_(r.fields_json, {});
  return { ok: true, found: true, number: r.id, code: r.code, type: T.label || r.type, kind: T.kind, title: r.title, recipient: r.recipient_name, issued_at: String(r.issued_at).slice(0, 10),
    status: r.status, void_reason: r.status === 'Void' ? r.void_reason : '', voided_at: r.status === 'Void' ? String(r.voided_at).slice(0, 10) : '', seal: seal, pages: r.pages,
    detail: T.kind === 'cert' ? (f.award || f.event || f.line || '') : T.kind === 'id' ? (r.type === 'vid' ? f.vid : f.edition) : (f.role || ''),
    issuer: 'Office of the Registrar, TEDxThaltej Youth', signatory: T.kind === 'physical' ? '' : 'Fenil Pritesh Shah, Organizer & Licensee' };
}
