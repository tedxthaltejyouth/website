/**
 * Official email: members write an email to send as TEDxThaltej Youth from an address on the official domain
 * (e.g. fenil.shah@tedxthaltejyouth.in), with attachments. It goes out through ZeptoMail only after the Organizer
 * approves it. The sender can send as their own name, as TEDxThaltej Youth, or under any display name they choose. Replies go to the
 * TTRIS mailbox by default (or to the sender's verified Google account if they choose). The Organizer can edit everything —
 * sender, recipients, subject, text, attachments — before approving.
 * The From address only sends; to receive mail at it, create the mailbox or forwarding on the domain separately.
 */
const OB_RESERVED = ['admin', 'administrator', 'root', 'postmaster', 'abuse', 'hostmaster', 'webmaster', 'security', 'noreply', 'no-reply', 'organizer', 'organiser', 'licensee',
  'legal', 'billing', 'payments', 'finance', 'registrar', 'support', 'info', 'contact', 'hello', 'team', 'office', 'press', 'media', 'ted', 'tedx'];
const OB_MAX_BYTES = 10 * 1024 * 1024;

function obDomain_() {
  const z = PropertiesService.getScriptProperties().getProperty('ZEPTO_FROM') || '';
  return String(settingsMap_().official_domain || z.split('@')[1] || 'tedxthaltejyouth.in').toLowerCase();
}
function obEmails_(v, max) {
  const out = String([].concat(v || []).join(',')).split(/[,;\s]+/).map(lc_).filter(String);
  out.forEach(function (e) { if (!isEmail_(e)) throw new Error('Check this email address: ' + e); });
  if (out.length > max) throw new Error('At most ' + max + ' addresses here.');
  return out.filter(function (e, i) { return out.indexOf(e) === i; });
}
function obCan_(me, r) { return me.role === 'super' || lc_(r.by) === lc_(me.email); }

function obHandle_(me, a, b) {
  switch (a) {
    case 'obBoot': return obBoot_(me);
    case 'obGet': return obGet_(me, b.id);
    case 'obSave': return obSave_(me, b);
    case 'obWithdraw': return obWithdraw_(me, b);
    case 'obDecide': return obDecide_(me, b);
    case 'obFile': return obFile_(me, b);
    case 'obThread': return obThread_(me, b);
    case 'obReply': return obReply_(me, b);
  }
  return null;
}
function obBoot_(me) {
  const people = {}; readAll_('Admins').forEach(function (a) { people[lc_(a.email)] = a.name; });
  const rows = readAll_('OfficialMails').filter(function (r) { return obCan_(me, r); }).map(function (r) {
    return { id: r.id, subject: r.subject, from: r.from_local + '@' + r.domain, from_name: r.from_name, to: r.to_list, status: r.status, by: people[lc_(r.by)] || r.by, mine: lc_(r.by) === lc_(me.email),
      created_at: r.created_at, sent_at: r.sent_at, note: r.note };
  }).reverse();
  return { ok: true, domain: obDomain_(), google_email: me.google_email || '', ttris_email: (function () { try { return ttrisConf_().email; } catch (e) { return ''; } })(), zepto: zeptoOn_(), super: me.role === 'super', reserved: OB_RESERVED,
    suggested: String(me.name || '').toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/).filter(String).slice(0, 2).join('.'), rows: rows };
}
function obGet_(me, id) {
  const r = findRow_('OfficialMails', id); if (!r || !obCan_(me, r)) throw new Error('Email not found.');
  const people = {}; readAll_('Admins').forEach(function (a) { people[lc_(a.email)] = a.name; });
  return { ok: true, mail: Object.assign({}, r, { by_name: people[lc_(r.by)] || r.by, attachments: safeJson_(r.attachments_json, []).map(function (x) { return { name: x.name, size: x.size, i: x.i }; }),
    html: obHtml_(r), cc_self: truthy_(r.cc_self), decided_by_name: people[lc_(r.decided_by)] || r.decided_by }) };
}
function obHtml_(r, ref) {
  return emailShell_('', bcHtml_(r.body) + (r.signature ? '<p style="margin-top:22px;color:#444">' + esc_(r.signature).replace(/\n/g, '<br>') + '</p>' : ''), { ref: ref, preheader: r.subject });
}
function obSave_(me, b) {
  const old = b.id ? findRow_('OfficialMails', b.id) : null;
  const orgEdit = !!(old && me.role === 'super' && lc_(old.by) !== lc_(me.email));
  if (old && !orgEdit && (lc_(old.by) !== lc_(me.email) || ['Draft', 'Changes requested'].indexOf(old.status) < 0)) throw new Error('This email can’t be edited now.');
  if (orgEdit && ['Pending approval', 'Failed', 'Changes requested', 'Draft'].indexOf(old.status) < 0) throw new Error('This email is ' + String(old.status).toLowerCase() + ' and can’t be edited.');
  const owner = old ? (findAdmin_(old.by) || me) : me;
  const local = String(b.from_local || '').trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9._-]{0,40}[a-z0-9])?$/.test(local) || /\.\./.test(local)) throw new Error('The sender name can use letters, numbers, dots, hyphens and underscores, like fenil.shah');
  if (OB_RESERVED.indexOf(local) >= 0 && me.role !== 'super') throw new Error('“' + local + '@' + obDomain_() + '” is reserved. Use your own name, like ' + (obBoot_(me).suggested || 'first.last') + '.');
  const nameMode = ['me', 'org', 'custom'].indexOf(b.name_mode) >= 0 ? b.name_mode : 'org';
  let fromName = nameMode === 'me' ? String(owner.name || '').slice(0, 60) + ', TEDxThaltej Youth' : 'TEDxThaltej Youth';
  if (nameMode === 'custom') {
    fromName = String(b.from_name || '').replace(/[<>"\r\n\t@]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (fromName.length < 2) throw new Error('Write the name to send as.');
  }
  const to = obEmails_(b.to, 50), cc = obEmails_(b.cc, 20), bcc = obEmails_(b.bcc, 50);
  if (!to.length) throw new Error('Add at least one recipient.');
  const subject = String(b.subject || '').trim().slice(0, 200), body = String(b.body || '').trim().slice(0, 30000);
  if (!subject) throw new Error('Write a subject.');
  if (body.length < 10) throw new Error('Write the email.');
  const ccSelf = truthy_(b.cc_self);
  if (ccSelf && !owner.google_email) throw new Error('Connect your Google account first to CC it.');
  // Every reply from outside comes back through TTRIS: Reply-To is always the TTRIS mailbox, and the writer's own copy is a hidden BCC.
  const replyMode = 'ttris';
  const replyTo = (function () { try { return ttrisConf_().email; } catch (e) { return ''; } })();
  // attachments: keep the ones already saved that are still listed, add new uploads
  const keep = [].concat(b.keep || []).map(Number), oldA = old ? safeJson_(old.attachments_json, []) : [];
  let atts = oldA.filter(function (x) { return keep.indexOf(x.i) >= 0; });
  const folder = (b.files || []).length ? opsFolder_('TEDxThaltej Youth — Official email attachments (private)', 'OB_FOLDER_ID') : null;
  [].concat(b.files || []).slice(0, 10).forEach(function (f) {
    const m = String(f.dataUrl || '').match(/^data:([\w.+\/-]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!m) throw new Error('Could not read the file ' + f.name + '.');
    if (/x-msdownload|x-sh|javascript|x-bat|x-msi|java-archive/.test(m[1]) || /\.(exe|bat|cmd|sh|js|msi|jar|scr|vbs)$/i.test(f.name)) throw new Error('Program files can’t be attached: ' + f.name);
    const bytes = Utilities.base64Decode(m[2]);
    const file = folder.createFile(Utilities.newBlob(bytes, m[1], String(f.name || 'attachment').replace(/[\\/:*?"<>|]/g, '').slice(0, 120)));
    atts.push({ i: Date.now() % 1e9 + atts.length, name: String(f.name).slice(0, 120), type: m[1], size: bytes.length, file_id: file.getId() });
  });
  if (atts.length > 10) throw new Error('At most 10 attachments.');
  if (atts.reduce(function (s, x) { return s + (+x.size || 0); }, 0) > OB_MAX_BYTES) throw new Error('Attachments add up to more than 10 MB. Share large files as a Drive link instead.');
  const submit = b.submit !== false;
  const rec = { from_local: local, domain: obDomain_(), name_mode: nameMode, from_name: fromName, to_list: to.join(','), cc_list: cc.join(','), bcc_list: bcc.join(','),
    subject: subject, body: body, signature: String(b.signature || '').slice(0, 500), attachments_json: JSON.stringify(atts), cc_self: ccSelf ? 'TRUE' : 'FALSE',
    reply_to: replyTo, reply_mode: replyMode, status: orgEdit ? (old.status === 'Draft' ? 'Draft' : 'Pending approval') : (submit ? 'Pending approval' : 'Draft'), note: old ? old.note : '', updated_at: now_() };
  if (orgEdit) rec.edited_by = lc_(me.email);
  let id = old ? old.id : '';
  if (old) updateRow_('OfficialMails', old.id, rec);
  else { id = seq_('OfficialMails', 'OM'); appendRow_('OfficialMails', Object.assign(rec, { id: id, by: lc_(me.email), decided_by: '', decided_at: '', sent_at: '', error: '', created_at: now_() })); }
  if (orgEdit) {
    audit_(me.email, 'official email edited by Organizer', id);
    if (b.approve) return obDecide_(me, { id: id, decision: 'approve', note: b.note });
    return { ok: true, id: id, status: rec.status };
  }
  if (submit) {
    if (me.role === 'super') return obDecide_(me, { id: id, decision: 'approve', self: true });
    mail_(CONFIG.SUPER_ADMIN_EMAIL, 'Official email to approve: ' + subject, emailShell_('An official email needs your approval',
      '<p><b>' + esc_(me.name) + '</b> wants to send an email as <b>' + esc_(fromName) + ' &lt;' + esc_(local + '@' + obDomain_()) + '&gt;</b> to ' + to.length + ' recipient' + (to.length > 1 ? 's' : '') + '.</p><p><b>Subject:</b> ' + esc_(subject) + '</p>' +
      '<p><a href="' + CONFIG.ADMIN_URL + '#approvals">Review and approve</a></p>'));
  }
  audit_(me.email, submit ? 'official email submitted' : 'official email draft', id);
  return { ok: true, id: id, status: rec.status };
}
function obWithdraw_(me, b) {
  const r = findRow_('OfficialMails', b.id); if (!r || lc_(r.by) !== lc_(me.email)) throw new Error('Email not found.');
  if (r.status !== 'Pending approval') throw new Error('Only emails waiting for approval can be withdrawn.');
  updateRow_('OfficialMails', r.id, { status: 'Draft', updated_at: now_() });
  return { ok: true };
}
function obDecide_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer approves official emails.');
  const r = findRow_('OfficialMails', b.id); if (!r) throw new Error('Email not found.');
  if (['Pending approval', 'Failed'].indexOf(r.status) < 0) throw new Error('This email is ' + r.status.toLowerCase() + '.');
  const note = String(b.note || '').trim().slice(0, 1000);
  if (b.decision === 'changes' || b.decision === 'reject') {
    if (!note) throw new Error('Add a note for the sender.');
    updateRow_('OfficialMails', r.id, { status: b.decision === 'changes' ? 'Changes requested' : 'Rejected', note: note, decided_by: lc_(me.email), decided_at: now_(), updated_at: now_() });
    mail_(r.by, (b.decision === 'changes' ? 'Changes requested: ' : 'Not approved: ') + r.subject, emailShell_(b.decision === 'changes' ? 'Changes requested on your official email' : 'Your official email was not approved',
      '<p><b>' + esc_(r.subject) + '</b></p><p>' + esc_(note) + '</p><p><a href="' + CONFIG.ADMIN_URL + '#outbound">Open Official email</a></p>'));
    audit_(me.email, 'official email ' + b.decision, r.id);
    return { ok: true, status: b.decision === 'changes' ? 'Changes requested' : 'Rejected' };
  }
  if (b.decision !== 'approve') throw new Error('Approve, ask for changes or reject.');
  if (!zeptoOn_()) throw new Error('ZeptoMail is not connected. Connect it in Admin Health first.');
  if (opsConf_().use.zepto === false) throw new Error('ZeptoMail is switched off in Admin Health → Email. Switch it on to send official email.');
  const cc = String(r.cc_list || '').split(',').filter(String);
  const sender = findAdmin_(r.by) || {}, bcc = String(r.bcc_list || '').split(',').filter(String);
  if (truthy_(r.cc_self) && sender.google_email && bcc.indexOf(lc_(sender.google_email)) < 0) bcc.push(lc_(sender.google_email));
  const blobs = safeJson_(r.attachments_json, []).map(function (x) { return DriveApp.getFileById(x.file_id).getBlob().setName(x.name); });
  let ref = ''; try { const tc = ttrisConf_(); ref = ttrisRefFor_('official', r.id, r.subject, String(r.to_list).split(',')[0]); if (cc.indexOf(tc.email) < 0) cc.push(tc.email); } catch (e) { Logger.log(e); }
  const rt = (function () { try { return ttrisConf_().email; } catch (e) { return CONFIG.REPLY_TO; } })();
  const lg = mlogStart_(String(r.to_list).split(','), r.subject, obHtml_(r, ref), { kind: 'official', ref: ref, cc: cc, bcc: bcc, fromAddress: r.from_local + '@' + r.domain });
  try {
    zeptoSend_(r.to_list, r.subject, lg.html, { fromAddress: r.from_local + '@' + r.domain, name: r.from_name, cc: cc, bcc: bcc.join(','), replyTo: rt, attachments: blobs });
    mailCount_('zepto', String(r.to_list).split(',').length + cc.length);
    mlogDone_(lg.id, { status: 'Sent', provider: 'zepto', sent_at: now_() });
    try { appendRow_('TtrisMsgs', { id: newId_('TM'), ref: ref, direction: 'out', from_email: r.from_local + '@' + r.domain, from_name: r.from_name, to_email: lc_(String(r.to_list).split(',')[0]), subject: r.subject, body: ttrisText_(bcHtml_(r.body)).slice(0, 20000), zoho_id: '', received_at: now_(), auto: '', status: 'Sent', kind: 'official', rec_id: r.id }); } catch (e2) { }
  } catch (e) {
    mlogDone_(lg.id, { status: 'Failed', error: String(e.message || e).slice(0, 300) });
    updateRow_('OfficialMails', r.id, { status: 'Failed', error: String(e.message || e).slice(0, 500), decided_by: lc_(me.email), decided_at: now_(), updated_at: now_() });
    audit_(me.email, 'official email failed', r.id);
    throw new Error('Approved, but ZeptoMail refused it: ' + e.message + ' (check that ' + r.domain + ' is verified in ZeptoMail). You can try again.');
  }
  updateRow_('OfficialMails', r.id, { status: 'Sent', note: note || r.note, error: '', decided_by: lc_(me.email), decided_at: now_(), sent_at: now_(), updated_at: now_() });
  if (!b.self) mail_(r.by, 'Sent: ' + r.subject, emailShell_('Your official email was approved and sent', '<p><b>' + esc_(r.subject) + '</b> went out from ' + esc_(r.from_name + ' <' + r.from_local + '@' + r.domain + '>') + ' to ' + String(r.to_list).split(',').length + ' recipient(s).</p>' + (r.edited_by ? '<p>The Organizer edited it before sending. Open it in the portal to see the final version.</p>' : '') + (note ? '<p>' + esc_(note) + '</p>' : '')));
  audit_(me.email, 'official email sent', r.id + ' from ' + r.from_local + '@' + r.domain);
  return { ok: true, status: 'Sent' };
}
function obFile_(me, b) {
  const r = findRow_('OfficialMails', b.id); if (!r || !obCan_(me, r)) throw new Error('Email not found.');
  const x = safeJson_(r.attachments_json, []).filter(function (y) { return y.i === +b.i; })[0]; if (!x) throw new Error('File not found.');
  const blob = DriveApp.getFileById(x.file_id).getBlob();
  return { ok: true, name: x.name, type: x.type, base64: Utilities.base64Encode(blob.getBytes()) };
}

/** Replies to a sent official email arrive in TTRIS. The writer (and the Organizer) can read the conversation here and reply
 *  through TTRIS, from the same official address, so the whole conversation stays in the system. */
function obThread_(me, b) {
  const r = findRow_('OfficialMails', b.id); if (!r || !obCan_(me, r)) throw new Error('Email not found.');
  const t = readAll_('TtrisRefs').filter(function (x) { return x.kind === 'official' && x.rec_id === r.id; }).pop();
  const msgs = t ? readAll_('TtrisMsgs').filter(function (m) { return m.ref === t.ref; }) : [];
  return { ok: true, ref: t ? t.ref : '', messages: msgs.map(function (m) { return { dir: m.direction, from: m.from_name || m.from_email, from_email: m.from_email, to: m.to_email, subject: m.subject, body: m.body, at: m.received_at, auto: m.auto }; }) };
}
function obReply_(me, b) {
  const r = findRow_('OfficialMails', b.id); if (!r || !obCan_(me, r)) throw new Error('Email not found.');
  if (r.status !== 'Sent') throw new Error('You can reply once the email has been sent.');
  const text = String(b.body || '').trim(); if (text.length < 2) throw new Error('Write your reply.');
  const t = readAll_('TtrisRefs').filter(function (x) { return x.kind === 'official' && x.rec_id === r.id; }).pop(); if (!t) throw new Error('No conversation yet.');
  const last = readAll_('TtrisMsgs').filter(function (m) { return m.ref === t.ref && m.direction === 'in' && !m.auto; }).pop();
  const to = last ? last.from_email : String(r.to_list).split(',')[0];
  rateLimit_('obreply_' + lc_(me.email), 40, 3600);
  ttrisSend_({ kind: 'official', rec_id: r.id, ref: t.ref, to: to, subject: /^re:/i.test(r.subject) ? r.subject : 'Re: ' + r.subject, title: '',
    html: bcHtml_(text) + (r.signature ? '<p style="margin-top:22px;color:#444">' + esc_(r.signature).replace(/\n/g, '<br>') + '</p>' : ''), fromName: r.from_name, fromLocal: r.from_local, by: me.email });
  audit_(me.email, 'official email reply', r.id + ' → ' + to);
  return { ok: true };
}
