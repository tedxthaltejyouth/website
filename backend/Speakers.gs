/**
 * Speaker Portal (/speaker) + the speaker tools inside the Team Portal.
 *
 *  Speaker journey:  invited by email → sets a password → signs all four agreements (one signature,
 *  drawn on screen; parent/guardian too if under 18) → signed PDF emailed + saved to Drive →
 *  Organizer countersigns in the Team Portal → final PDF emailed + saved →
 *  speaker writes the talk in the portal → "Check facts" (Gemini) lists every claim that needs a
 *  source → speaker adds links → submits → assigned Speaker Ambassador gives feedback →
 *  speaker revises and resubmits → approved.
 *  Every submitted version is also saved as a Google Doc in the team's Drive (speakers never see Docs).
 *
 *  Script Properties (Project Settings → Script properties):
 *    GEMINI_API_KEY   free key from Google AI Studio (aistudio.google.com → Get API key)
 *    DRIVE_FOLDER_ID  optional; otherwise a "TEDxThaltej Youth — Speaker Records" folder is created
 */

const SPK_SESSION_MIN = 60;
const SPK_STAGES = ['Not invited', 'Invited', 'Agreements signed', 'Countersigned', 'Draft submitted', 'Changes requested', 'Approved'];
const SPK_AUTH = { ok: false, code: 'AUTH', error: 'Your session has ended. Please sign in again.' };
const SPK_EDITABLE = ['Agreements signed', 'Countersigned', 'Changes requested'];

// ───────────────────────── speaker-facing actions (prefix "spk_") ─────────────────────────
function speakerHandle_(a, d) {
  switch (a) {
    case 'setup':   return spkSetup_(d.setupToken, d.password);
    case 'login':   return spkLogin_(lc_(d.email), d.password);
    case 'forgot':  return spkForgot_(lc_(d.email));
    case 'reset':   return spkReset_(lc_(d.email), d.code, d.password);
  }
  const s = spkAuth_(d.token);
  if (!s) return SPK_AUTH;
  const sp = s.sp;
  switch (a) {
    case 'me':        return { ok: true, me: spkProfile_(sp) };
    case 'logout':    CacheService.getScriptCache().remove('spks_' + d.token); return { ok: true };
    case 'docs':      return { ok: true, docs: speakerDocs_(sp), vars: docVars_(sp), signed: !!spkAgreement_(sp.id) };
    case 'sign':      return spkSign_(sp, d);
    case 'pdf':       return spkPdfFor_(spkAgreement_(sp.id));
    case 'draft':     return spkDraftState_(sp);
    case 'saveDraft': return spkSaveDraft_(sp, d.title, d.body);
    case 'factCheck': return spkFactCheck_(sp);
    case 'submit':    return spkSubmit_(sp, d.resolutions || {});
  }
  return { ok: false, error: 'Unknown action.' };
}

// ───────────────────────── accounts ─────────────────────────
function spkByEmail_(email) {
  return readAll_('Speakers').filter(function (s) { return email && lc_(s.email) === email; })[0] || null;
}

function spkSetup_(token, password) {
  if (!token) throw new Error('This link is not valid. Ask the team for a new invitation.');
  if (!aisPwOk_(password)) throw new Error(AIS_PW_RULE);
  const h = sha_(String(token));
  const sp = readAll_('Speakers').filter(function (s) { return s.invite_hash && s.invite_hash === h; })[0];
  if (!sp || String(sp.invite_expires) < now_()) throw new Error('This invitation has expired. Ask the team to send a new one.');
  const salt = Utilities.getUuid();
  updateRow_('Speakers', sp.id, { salt: salt, hash: hash_(String(password), salt), pw_version: String((parseInt(sp.pw_version, 10) || 0) + 1),
    invite_hash: '', invite_expires: '', portal_active: 'TRUE', last_login: now_() });
  return spkSession_(findRow_('Speakers', sp.id));
}

function spkLogin_(email, password) {
  rateLimit_('spklogin_' + email, 8, 900);
  const sp = spkByEmail_(email);
  if (!sp || !sp.hash || hash_(String(password || ''), sp.salt) !== sp.hash) throw new Error('That email and password do not match.');
  if (!truthy_(sp.portal_active)) throw new Error('Your speaker account is paused. Please write to the team.');
  updateRow_('Speakers', sp.id, { last_login: now_() });
  return spkSession_(sp);
}

function spkForgot_(email) {
  rateLimit_('spkforgot_' + email, 4, 900);
  const sp = spkByEmail_(email);
  if (sp && sp.hash && truthy_(sp.portal_active)) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    CacheService.getScriptCache().put('spkc_' + email, JSON.stringify({ h: hash_(code, email), n: 0 }), 600);
    mail_(email, 'Your speaker portal code: ' + code, emailShell_('Reset your password',
      '<p>Use this code to set a new password for the TEDxThaltej Youth speaker portal. It expires in 10 minutes.</p>' +
      '<p style="font-size:34px;letter-spacing:8px;font-weight:800;margin:22px 0">' + code + '</p>'));
  }
  return { ok: true };
}

function spkReset_(email, code, password) {
  if (!aisPwOk_(password)) throw new Error(AIS_PW_RULE);
  const cache = CacheService.getScriptCache(), raw = cache.get('spkc_' + email);
  if (!raw) throw new Error('That code has expired. Ask for a new one.');
  const o = JSON.parse(raw);
  if (o.n >= 5 || hash_(String(code || '').trim(), email) !== o.h) {
    o.n++; cache.put('spkc_' + email, JSON.stringify(o), 600); throw new Error('That code is not right.');
  }
  cache.remove('spkc_' + email);
  const sp = spkByEmail_(email); if (!sp) throw new Error('That code has expired. Ask for a new one.');
  const salt = Utilities.getUuid();
  updateRow_('Speakers', sp.id, { salt: salt, hash: hash_(String(password), salt), pw_version: String((parseInt(sp.pw_version, 10) || 0) + 1) });
  return { ok: true };
}

function spkSession_(sp) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('spks_' + token, JSON.stringify({ id: sp.id, v: String(sp.pw_version || '1') }), SPK_SESSION_MIN * 60);
  return { ok: true, token: token, me: spkProfile_(sp) };
}

function spkAuth_(token) {
  if (!token) return null;
  const cache = CacheService.getScriptCache(), raw = cache.get('spks_' + token);
  if (!raw) return null;
  const s = JSON.parse(raw), sp = findRow_('Speakers', s.id);
  if (!sp || !truthy_(sp.portal_active) || String(sp.pw_version || '1') !== s.v) return null;
  cache.put('spks_' + token, raw, SPK_SESSION_MIN * 60); // sliding
  return { sp: sp };
}

function spkProfile_(sp) {
  const ed = findRow_('Editions', sp.edition_id) || {};
  const amb = sp.ambassador_email ? findAdmin_(sp.ambassador_email) : null;
  const ag = spkAgreement_(sp.id);
  const set = settingsMap_();
  return {
    id: sp.id, name: sp.name, email: sp.email, talk_title: sp.talk_title, stage: sp.stage || 'Invited',
    edition: { title: ed.title || '', theme: ed.theme || '', date: ed.date || '', venue: ed.venue || '' },
    ambassador: amb ? { name: amb.name, email: amb.email } : null,
    signed: !!ag, countersigned: !!(ag && ag.status === 'Countersigned'),
    draft_due: set.speaker_draft_due || '', factcheck_ready: !!PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'),
  };
}

// ───────────────────────── Drive + PDF ─────────────────────────
function recordsFolder_(sub) {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('DRIVE_FOLDER_ID'), root;
  try { root = id ? DriveApp.getFolderById(id) : null; } catch (e) { root = null; }
  if (!root) { root = DriveApp.createFolder('TEDxThaltej Youth — Speaker Records'); props.setProperty('DRIVE_FOLDER_ID', root.getId()); }
  if (!sub) return root;
  const it = root.getFoldersByName(sub);
  return it.hasNext() ? it.next() : root.createFolder(sub);
}

function dataUrlBlob_(dataUrl, name) {
  const m = String(dataUrl || '').match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw new Error('Please draw your signature.');
  if (m[1].length > 400000) throw new Error('That signature image is too large. Please clear it and sign again.');
  return Utilities.newBlob(Utilities.base64Decode(m[1]), 'image/png', name);
}

function fileDataUrl_(id) {
  if (!id) return '';
  return 'data:image/png;base64,' + Utilities.base64Encode(DriveApp.getFileById(id).getBlob().getBytes());
}

function agreementHtml_(sp, ag, docs, sigs) {
  const P = JSON.parse(ag.personal_json || '{}');
  const signedOn = String(ag.signed_at).replace('T', ' ').slice(0, 16) + ' IST';
  const sigBlock = function () {
    return '<table class="sig"><tr>' +
      '<td><div class="lab">Speaker</div>' + (sigs.speaker ? '<img src="' + sigs.speaker + '">' : '') + '<div class="line"></div><b>' + esc_(ag.speaker_name) + '</b><br>' + signedOn + '</td>' +
      (truthy_(ag.under_18) ? '<td><div class="lab">Parent / Guardian</div>' + (sigs.guardian ? '<img src="' + sigs.guardian + '">' : '') + '<div class="line"></div><b>' + esc_(ag.guardian_name) + '</b><br>' + signedOn + '</td>' : '') +
      '<td><div class="lab">Organizer</div>' + (sigs.organizer ? '<img src="' + sigs.organizer + '"><div class="line"></div><b>' + esc_(sigs.organizerName) + '</b><br>' + String(ag.countersigned_at || '').replace('T', ' ').slice(0, 16) + ' IST'
        : '<div class="pending">Awaiting organizer countersignature</div><div class="line"></div><b>' + esc_(docVars_(sp).ORGANIZER) + '</b>') + '</td>' +
      '</tr></table>';
  };
  let html = '<html><head><style>' +
    'body{font-family:Helvetica,Arial,sans-serif;color:#111;font-size:10.5pt;line-height:1.5}' +
    '.cover{border-top:8px solid #EB0028;padding-top:14px}.brand{font-size:20pt;font-weight:bold}.brand span{color:#EB0028}' +
    'h1{font-size:18pt;margin:24px 0 6px}h2{font-size:15pt;margin:0 0 4px;border-bottom:2px solid #111;padding-bottom:6px}h3{font-size:11pt;margin:14px 0 4px}' +
    'p{margin:6px 0}.note{background:#f4f4f4;padding:8px 10px;font-size:9.5pt}ul{margin:4px 0 6px 18px;padding:0}' +
    '.doc{page-break-before:always}.sig{width:100%;margin-top:22px;border-collapse:collapse}.sig td{vertical-align:bottom;padding:8px 12px 0 0;font-size:9pt;width:33%}' +
    '.sig img{height:60px;max-width:200px}.line{border-top:1px solid #111;margin:2px 0 4px}.lab{font-size:8pt;text-transform:uppercase;letter-spacing:1px;color:#EB0028;font-weight:bold}' +
    '.pending{height:60px;color:#999;font-style:italic;font-size:9pt;padding-top:30px}.kv td{padding:3px 10px 3px 0;font-size:10pt}.mono{font-family:Courier,monospace;font-size:8pt;word-break:break-all}' +
    '.foot{margin-top:20px;font-size:8pt;color:#666}</style></head><body>';
  html += '<div class="cover"><div class="brand"><span>TEDx</span>Thaltej Youth</div><h1>Speaker agreements</h1>' +
    '<table class="kv"><tr><td>Speaker</td><td><b>' + esc_(ag.speaker_name) + '</b> (' + esc_(sp.email) + ')</td></tr>' +
    '<tr><td>Event</td><td>' + esc_(docVars_(sp).THEME) + ' · ' + esc_(docVars_(sp).EVENT_DATE) + '</td></tr>' +
    '<tr><td>Venue</td><td>' + esc_(docVars_(sp).VENUE) + '</td></tr>' +
    '<tr><td>Talk title</td><td>' + esc_(P.talkTitle || '') + '</td></tr>' +
    '<tr><td>Signed electronically</td><td>' + signedOn + '</td></tr>' +
    '<tr><td>Status</td><td><b>' + (ag.status === 'Countersigned' ? 'Signed by speaker and countersigned by organizer' : 'Signed by speaker · awaiting organizer countersignature') + '</b></td></tr></table>' +
    '<p style="margin-top:14px">This file contains: ' + docs.map(function (d, i) { return (i + 1) + '. ' + esc_(d.title); }).join(' · ') + ', followed by the electronic signing record.</p></div>';
  docs.forEach(function (d) { html += '<div class="doc"><h2>' + esc_(d.title) + '</h2>' + docHtml_(d.lines) + sigBlock() + '</div>'; });
  html += '<div class="doc"><h2>Electronic signing record</h2><table class="kv">' +
    '<tr><td>Agreement ID</td><td>' + esc_(ag.id) + '</td></tr><tr><td>Speaker account</td><td>' + esc_(sp.id) + ' · ' + esc_(sp.email) + ' (signed in with their own password)</td></tr>' +
    '<tr><td>Signed at</td><td>' + signedOn + '</td></tr><tr><td>Device</td><td>' + esc_(ag.user_agent) + '</td></tr>' +
    (truthy_(ag.under_18) ? '<tr><td>Parent / Guardian</td><td>' + esc_(ag.guardian_name) + '</td></tr>' : '') +
    (ag.status === 'Countersigned' ? '<tr><td>Countersigned by</td><td>' + esc_(ag.countersigned_by) + ' at ' + String(ag.countersigned_at).replace('T', ' ').slice(0, 16) + ' IST</td></tr>' : '') +
    '</table><h3>Each document, as signed (SHA-256 of the exact text)</h3><table class="kv">' +
    docs.map(function (d) { return '<tr><td>' + esc_(d.title) + '</td><td class="mono">' + d.hash + '</td></tr>'; }).join('') + '</table>' +
    '<p class="foot">The speaker ticked a separate "I have read and agree" box for each document before signing. This independent TEDx event is operated under license from TED.</p></div>';
  return html + '</body></html>';
}

function agreementPdf_(sp, ag, final) {
  const P = JSON.parse(ag.personal_json || '{}');
  const docs = speakerDocs_(sp, spkPersonalLines_(P, sp));
  const s = settingsMap_();
  const sigs = { speaker: fileDataUrl_(ag.sig_file_id), guardian: fileDataUrl_(ag.guardian_sig_file_id) };
  if (final) { sigs.organizer = fileDataUrl_(ag.org_sig_file_id); sigs.organizerName = s.organizer_name || 'Fenil Shah'; }
  const name = 'Speaker agreements — ' + ag.speaker_name + ' — ' + (docVars_(sp).EVENT_DATE) + (final ? ' (countersigned)' : ' (speaker signed)') + '.pdf';
  return Utilities.newBlob(agreementHtml_(sp, ag, docs, sigs), 'text/html', 'a.html').getAs('application/pdf').setName(name);
}

function spkPersonalLines_(P, sp) {
  return [['Full Name', P.fullName], ['E-mail', sp.email], ['Phone Number', P.phone], ['Address', P.address], ['Title of the Talk', P.talkTitle]];
}

function spkAgreement_(speakerId) {
  return readAll_('Agreements').filter(function (a) { return a.speaker_id === speakerId; }).pop() || null;
}

function spkPdfFor_(ag) {
  if (!ag) throw new Error('No signed agreement yet.');
  const id = ag.final_pdf_file_id || ag.pdf_file_id;
  const f = DriveApp.getFileById(id);
  return { ok: true, name: f.getName(), base64: Utilities.base64Encode(f.getBlob().getBytes()) };
}

// ───────────────────────── signing ─────────────────────────
function spkSign_(sp, d) {
  if (spkAgreement_(sp.id)) throw new Error('You have already signed. Your signed copy was emailed to you.');
  const P = clean_(d.personal || {}, { fullName: 120, phone: 30, address: 400, talkTitle: 200 });
  if (P.fullName.length < 3) throw new Error('Please enter your full name.');
  if (!P.phone || !P.address) throw new Error('Please add your phone number and address.');
  if (!P.talkTitle) throw new Error('Please add a working title for your talk. You can change it later.');
  const agreed = d.agreed || {};
  SPEAKER_DOCS.forEach(function (doc) { if (agreed[doc.key] !== true) throw new Error('Please read and tick “I agree” on: ' + doc.title + '.'); });
  if (lc_(String(d.typedName || '').trim()) !== lc_(P.fullName)) throw new Error('Type your full name exactly as above to sign.');
  const minor = d.under18 === true;
  const guardianName = String(d.guardianName || '').trim().slice(0, 120);
  if (minor && (guardianName.length < 3 || !d.guardianSig)) throw new Error('A parent or guardian must add their name and sign, because you are under 18.');
  rateLimit_('spksign_' + sp.id, 5, 3600);

  const folder = recordsFolder_('Signatures');
  const sigId = folder.createFile(dataUrlBlob_(d.signature, sp.id + '-speaker.png')).getId();
  const gSigId = minor ? folder.createFile(dataUrlBlob_(d.guardianSig, sp.id + '-guardian.png')).getId() : '';
  const docs = speakerDocs_(sp, spkPersonalLines_(P, sp));
  const ag = { id: 'AG-' + Utilities.getUuid().slice(0, 8).toUpperCase(), speaker_id: sp.id, edition_id: sp.edition_id, signed_at: now_(),
    speaker_name: P.fullName, guardian_name: minor ? guardianName : '', under_18: minor ? 'TRUE' : 'FALSE', personal_json: JSON.stringify(P),
    doc_hashes: docs.map(function (x) { return x.key + ':' + x.hash; }).join(' '), user_agent: String(d.ua || '').slice(0, 250),
    sig_file_id: sigId, guardian_sig_file_id: gSigId, pdf_file_id: '', status: 'Awaiting organizer', countersigned_by: '', countersigned_at: '',
    org_sig_file_id: '', final_pdf_file_id: '' };
  const pdf = agreementPdf_(sp, ag, false);
  ag.pdf_file_id = recordsFolder_('Agreements').createFile(pdf).getId();
  withLock_(function () { appendRow_('Agreements', ag); });
  updateRow_('Speakers', sp.id, { stage: 'Agreements signed', phone: P.phone, address: P.address, talk_title: P.talkTitle, under_18: ag.under_18 });

  const s = settingsMap_(), office = s.speaker_contact_email || 'info@tedxthaltejyouth.in';
  mail_(sp.email, 'Your signed speaker agreements — TEDxThaltej Youth', emailShell_('Thank you for signing, ' + esc_(P.fullName.split(' ')[0]) + '.',
    '<p>Your signed copy of all four agreements is attached. Please keep it for your records.</p>' +
    '<p>Once the organizer countersigns, you will receive the final copy. Meanwhile, you can start writing your talk in the <a href="' + CONFIG.SITE_URL + '/speaker">speaker portal</a>.</p>'),
    { attachments: [pdf] });
  try {
    mail_(office, 'Speaker signed: ' + P.fullName + ' — countersignature needed', emailShell_('Countersignature needed',
      '<p><b>' + esc_(P.fullName) + '</b> signed all four agreements' + (minor ? ' (with parent/guardian ' + esc_(guardianName) + ')' : '') + '.</p>' +
      '<p><a href="' + CONFIG.ADMIN_URL + '">Open the Team Portal → Speakers</a> to countersign.</p>'), { attachments: [pdf] });
  } catch (e) { Logger.log(e); }
  audit_(sp.email, 'speaker signed agreements', ag.id);
  return { ok: true, me: spkProfile_(findRow_('Speakers', sp.id)) };
}

// ───────────────────────── drafts ─────────────────────────
function spkDrafts_(speakerId) {
  return readAll_('Drafts').filter(function (r) { return r.speaker_id === speakerId; });
}
function spkWorking_(speakerId) {
  return spkDrafts_(speakerId).filter(function (r) { return r.version === '0'; })[0] || null;
}

function spkDraftState_(sp) {
  if (!spkAgreement_(sp.id)) return { ok: false, error: 'Please sign your agreements first.' };
  const all = spkDrafts_(sp.id);
  const w = all.filter(function (r) { return r.version === '0'; })[0] || {};
  const versions = all.filter(function (r) { return r.version !== '0'; }).sort(function (a, b) { return (+b.version) - (+a.version); }).map(function (r) {
    return { id: r.id, version: r.version, status: r.status, title: r.title, submitted_at: r.submitted_at, reviewed_at: r.reviewed_at,
      feedback: r.feedback, comments: safeJson_(r.comments_json, []) };
  });
  const fc = safeJson_(w.factcheck_json, null);
  return { ok: true, editable: SPK_EDITABLE.indexOf(sp.stage) >= 0 || !sp.stage, stage: sp.stage,
    title: w.title || sp.talk_title || '', body: w.body || '', updated_at: w.updated_at || '',
    factcheck: fc, factcheck_current: !!(fc && w.text_hash && w.text_hash === sha_(String(w.body || ''))),
    resolutions: safeJson_(w.sources_json, {}), versions: versions };
}

function spkSaveDraft_(sp, title, body) {
  if (!spkAgreement_(sp.id)) throw new Error('Please sign your agreements first.');
  if (!(SPK_EDITABLE.indexOf(sp.stage) >= 0)) throw new Error(sp.stage === 'Approved' ? 'Your talk is approved. Write to your ambassador to change it.' : 'Your draft is with your ambassador. You can edit again once they reply.');
  title = String(title || '').slice(0, 200); body = String(body || '').slice(0, 40000);
  withLock_(function () {
    const w = spkWorking_(sp.id);
    if (w) updateRow_('Drafts', w.id, { title: title, body: body, updated_at: now_() });
    else appendRow_('Drafts', { id: 'DR-' + Utilities.getUuid().slice(0, 8).toUpperCase(), speaker_id: sp.id, version: '0', status: 'Working',
      title: title, body: body, text_hash: '', factcheck_json: '', sources_json: '', doc_id: '', submitted_at: '', reviewed_by: '', reviewed_at: '',
      feedback: '', comments_json: '', updated_at: now_() });
  });
  return { ok: true, saved_at: now_() };
}

function spkParas_(body) {
  return String(body || '').split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(String);
}

function spkFactCheck_(sp) {
  const w = spkWorking_(sp.id);
  if (!w || spkParas_(w.body).join(' ').split(/\s+/).length < 80) throw new Error('Write at least a first full draft (80+ words) before checking facts.');
  rateLimit_('spkfc_' + sp.id, 15, 86400);
  const result = geminiFactCheck_(w.title, w.body);
  updateRow_('Drafts', w.id, { factcheck_json: JSON.stringify(result), text_hash: sha_(String(w.body || '')), updated_at: now_() });
  return { ok: true, factcheck: result };
}

function geminiFactCheck_(title, body) {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('The fact checker is not switched on yet. You can still submit; your ambassador will review sources with you.');
  const model = settingsMap_().gemini_model || 'gemini-2.5-flash';
  const paras = spkParas_(body);
  const numbered = paras.map(function (p, i) { return '[' + (i + 1) + '] ' + p; }).join('\n\n');
  const prompt =
    'You help speakers prepare TEDx talks. Read the draft below (paragraphs are numbered).\n\n' +
    'TASK 1 — List every statement a TEDx fact-checker would need a source for: statistics and numbers, dates and historical events, ' +
    'scientific, medical or health claims, research findings ("studies show…"), quotes attributed to people, and claims about named people or organisations. ' +
    'Do NOT list the speaker\'s own personal stories, opinions, feelings or clearly hypothetical examples. Do not judge whether a claim is true; only identify it.\n' +
    'TASK 2 — Flag passages that may conflict with TEDx content guidelines: selling or promoting a product, service, book or the speaker\'s organisation; ' +
    'political or religious agendas or proselytising; pseudoscience or unproven health claims; divisive "us vs them" language.\n\n' +
    'Return only JSON in this shape: {"claims":[{"paragraph":1,"quote":"exact words copied from the draft","type":"statistic|date|science|health|research|quote|history|other",' +
    '"why":"one short sentence","source_hint":"what kind of source would prove it"}],"flags":[{"paragraph":1,"quote":"exact words","guideline":"which guideline","why":"one short sentence"}]}\n\n' +
    'TITLE: ' + title + '\n\nDRAFT:\n' + numbered;
  const res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: { 'x-goog-api-key': key },
    payload: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, responseMimeType: 'application/json' } }),
  });
  const code = res.getResponseCode();
  if (code === 429) throw new Error('The free fact checker has reached its limit for now. Please try again in a few minutes, or tomorrow.');
  if (code >= 400) throw new Error('The fact checker could not run right now (' + code + '). Please try again later.');
  let out;
  try { out = JSON.parse(JSON.parse(res.getContentText()).candidates[0].content.parts[0].text); }
  catch (e) { throw new Error('The fact checker returned an unreadable answer. Please try again.'); }
  const clip = function (s, n) { return String(s || '').slice(0, n); };
  const claims = (out.claims || []).slice(0, 40).map(function (c, i) {
    return { id: 'C' + (i + 1), paragraph: parseInt(c.paragraph, 10) || 0, quote: clip(c.quote, 400), type: clip(c.type, 20), why: clip(c.why, 300), source_hint: clip(c.source_hint, 300) };
  }).filter(function (c) { return c.quote; });
  const flags = (out.flags || []).slice(0, 20).map(function (f) {
    return { paragraph: parseInt(f.paragraph, 10) || 0, quote: clip(f.quote, 400), guideline: clip(f.guideline, 120), why: clip(f.why, 300) };
  }).filter(function (f) { return f.quote; });
  return { model: model, checked_at: now_(), claims: claims, flags: flags };
}

/** resolutions: { C1: {kind:'link', links:'https://…'} | {kind:'personal'} | {kind:'remove'} } */
function spkSubmit_(sp, resolutions) {
  if (!(SPK_EDITABLE.indexOf(sp.stage) >= 0)) throw new Error('This draft cannot be submitted right now.');
  const w = spkWorking_(sp.id);
  if (!w || spkParas_(w.body).length === 0) throw new Error('Write your draft first.');
  const fcOn = !!PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const fc = safeJson_(w.factcheck_json, null);
  if (fcOn) {
    if (!fc || w.text_hash !== sha_(String(w.body || ''))) throw new Error('Run “Check facts” on this version of your draft before submitting.');
    const missing = fc.claims.filter(function (c) {
      const r = resolutions[c.id] || {};
      if (r.kind === 'personal' || r.kind === 'remove') return false;
      return !(r.kind === 'link' && /https?:\/\/\S+\.\S+/.test(String(r.links || '')));
    });
    if (missing.length) throw new Error(missing.length + ' fact' + (missing.length > 1 ? 's still need' : ' still needs') + ' a source link (or mark it as personal experience / to be removed).');
  }
  const clean = {};
  Object.keys(resolutions).slice(0, 60).forEach(function (k) {
    const r = resolutions[k] || {};
    clean[String(k).slice(0, 6)] = { kind: ['link', 'personal', 'remove'].indexOf(r.kind) >= 0 ? r.kind : 'link', links: String(r.links || '').slice(0, 1000), note: String(r.note || '').slice(0, 300) };
  });
  const prev = spkDrafts_(sp.id).filter(function (r) { return r.version !== '0'; });
  const version = String(prev.length + 1);
  const row = { id: 'DR-' + Utilities.getUuid().slice(0, 8).toUpperCase(), speaker_id: sp.id, version: version, status: 'Submitted', title: w.title, body: w.body,
    text_hash: w.text_hash, factcheck_json: w.factcheck_json, sources_json: JSON.stringify(clean), doc_id: '', submitted_at: now_(), reviewed_by: '', reviewed_at: '',
    feedback: '', comments_json: '', updated_at: now_() };
  try { row.doc_id = spkMirrorDoc_(sp, row, fc, clean); } catch (e) { Logger.log('Doc mirror failed: ' + e); }
  withLock_(function () {
    appendRow_('Drafts', row);
    updateRow_('Drafts', w.id, { sources_json: JSON.stringify(clean) });
  });
  updateRow_('Speakers', sp.id, { stage: 'Draft submitted', talk_title: w.title || sp.talk_title });
  const to = sp.ambassador_email || settingsMap_().speaker_contact_email;
  if (to) try {
    mail_(to, 'Draft v' + version + ' from ' + sp.name + ': ' + (w.title || 'untitled'), emailShell_('A new draft to review',
      '<p><b>' + esc_(sp.name) + '</b> submitted version ' + version + ' of “' + esc_(w.title) + '”.</p>' +
      '<p><a href="' + CONFIG.ADMIN_URL + '">Open the Team Portal → Speakers</a> to read it and give feedback.</p>'));
  } catch (e) { Logger.log(e); }
  return { ok: true, version: version };
}

/** A Google Doc copy of each submitted version, for the team's records. Speakers never see it. */
function spkMirrorDoc_(sp, row, fc, res) {
  const doc = DocumentApp.create(sp.name + ' — ' + (row.title || 'Talk') + ' — v' + row.version);
  const b = doc.getBody();
  b.appendParagraph(row.title || 'Untitled talk').setHeading(DocumentApp.ParagraphHeading.TITLE);
  b.appendParagraph(sp.name + ' · version ' + row.version + ' · submitted ' + row.submitted_at.replace('T', ' ').slice(0, 16));
  spkParas_(row.body).forEach(function (p, i) { b.appendParagraph('[' + (i + 1) + '] ' + p); });
  if (fc && fc.claims && fc.claims.length) {
    b.appendParagraph('Facts and sources').setHeading(DocumentApp.ParagraphHeading.HEADING1);
    fc.claims.forEach(function (c) {
      const r = res[c.id] || {};
      b.appendParagraph(c.id + ' · ¶' + c.paragraph + ' · “' + c.quote + '”').setHeading(DocumentApp.ParagraphHeading.HEADING3);
      b.appendParagraph(r.kind === 'personal' ? 'Speaker: personal experience' : r.kind === 'remove' ? 'Speaker: will remove this' : 'Sources: ' + (r.links || '—'));
    });
  }
  doc.saveAndClose();
  const f = DriveApp.getFileById(doc.getId());
  f.moveTo(recordsFolder_('Drafts'));
  return doc.getId();
}

function safeJson_(s, dflt) { try { return s ? JSON.parse(s) : dflt; } catch (e) { return dflt; } }

// ───────────────────────── Team Portal side (called after admin auth) ─────────────────────────
function spkCanSee_(me, sp) {
  return can_(me, 'speakers', false) || lc_(sp.ambassador_email) === lc_(me.email);
}
function spkCanReview_(me, sp) {
  return can_(me, 'speakers', true) || lc_(sp.ambassador_email) === lc_(me.email);
}
function spkPublic_(sp) {
  const o = {}; Object.keys(sp).forEach(function (k) { if (['salt', 'hash', 'pw_version', 'invite_hash'].indexOf(k) < 0) o[k] = sp[k]; }); return o;
}

function spkAdminList_(me) {
  const all = readAll_('Speakers').filter(function (s) { return spkCanSee_(me, s); });
  const ags = readAll_('Agreements'), drafts = readAll_('Drafts');
  const people = readAll_('Admins').filter(function (a) { return truthy_(a.active); }).map(function (a) { return { email: lc_(a.email), name: a.name || a.email }; });
  return { ok: true, canWrite: can_(me, 'speakers', true), isSuper: me.role === 'super', people: people, lists: lookups_(),
    rows: all.map(function (s) {
      const ag = ags.filter(function (a) { return a.speaker_id === s.id; }).pop();
      const v = drafts.filter(function (d) { return d.speaker_id === s.id && d.version !== '0'; }).length;
      return Object.assign(spkPublic_(s), { agreement: ag ? { id: ag.id, status: ag.status, signed_at: ag.signed_at } : null, versions: v });
    }) };
}

function spkAdminDetail_(me, id) {
  const sp = findRow_('Speakers', id);
  if (!sp || !spkCanSee_(me, sp)) throw new Error('Speaker not found.');
  const ag = spkAgreement_(id);
  const versions = spkDrafts_(id).filter(function (r) { return r.version !== '0'; }).sort(function (a, b) { return (+b.version) - (+a.version); }).map(function (r) {
    return { id: r.id, version: r.version, status: r.status, title: r.title, body: r.body, submitted_at: r.submitted_at, reviewed_by: r.reviewed_by,
      reviewed_at: r.reviewed_at, feedback: r.feedback, comments: safeJson_(r.comments_json, []), factcheck: safeJson_(r.factcheck_json, null),
      sources: safeJson_(r.sources_json, {}), doc_url: r.doc_id ? 'https://docs.google.com/document/d/' + r.doc_id + '/edit' : '' };
  });
  return { ok: true, speaker: spkPublic_(sp), agreement: ag ? { id: ag.id, status: ag.status, signed_at: ag.signed_at, speaker_name: ag.speaker_name,
      guardian_name: ag.guardian_name, under_18: ag.under_18, countersigned_by: ag.countersigned_by, countersigned_at: ag.countersigned_at } : null,
    versions: versions, canReview: spkCanReview_(me, sp), isSuper: me.role === 'super',
    hasSavedSignature: !!PropertiesService.getScriptProperties().getProperty('ORGANIZER_SIG_FILE_ID') };
}

function spkInvite_(me, id) {
  must_(me, 'speakers', true);
  const sp = findRow_('Speakers', id);
  if (!sp) throw new Error('Speaker not found.');
  if (!isEmail_(sp.email)) throw new Error('Add the speaker’s email first, then send the invitation.');
  if (readAll_('Speakers').some(function (s) { return s.id !== id && lc_(s.email) === lc_(sp.email); })) throw new Error('Another speaker already uses this email.');
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const exp = Utilities.formatDate(new Date(Date.now() + 14 * 86400000), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
  updateRow_('Speakers', id, { invite_hash: sha_(token), invite_expires: exp, stage: sp.stage && sp.stage !== 'Not invited' ? sp.stage : 'Invited', email: lc_(sp.email) });
  const v = docVars_(sp), link = CONFIG.SITE_URL + '/speaker#setup=' + token;
  mail_(sp.email, 'Your TEDxThaltej Youth speaker portal', emailShell_('Welcome to the stage, ' + esc_(String(sp.name).split(' ')[0]) + '.',
    '<p>We are delighted that you will speak at <b>' + esc_(v.THEME) + '</b> on <b>' + esc_(v.EVENT_DATE) + '</b>.</p>' +
    '<p>Your speaker portal is where you will sign your agreements, write your talk, check your facts and work with your Speaker Ambassador.</p>' +
    '<p><a href="' + link + '" style="display:inline-block;background:#EB0028;color:#fff;padding:12px 22px;border-radius:30px;text-decoration:none;font-weight:700">Set your password</a></p>' +
    '<p style="color:#777;font-size:13px">This link works for 14 days. If it expires, ask the team for a new one.</p>'));
  audit_(me.email, 'invite speaker', id);
  return { ok: true };
}

function spkReview_(me, draftId, decision, feedback, comments) {
  const r = findRow_('Drafts', draftId);
  if (!r || r.version === '0') throw new Error('Draft not found.');
  const sp = findRow_('Speakers', r.speaker_id);
  if (!sp || !spkCanReview_(me, sp)) throw new Error('Only this speaker’s ambassador can review their draft.');
  if (['Changes requested', 'Approved'].indexOf(decision) < 0) throw new Error('Choose “Request changes” or “Approve”.');
  feedback = String(feedback || '').trim().slice(0, 5000);
  const cm = (Array.isArray(comments) ? comments : []).slice(0, 80).map(function (c) { return { para: parseInt(c.para, 10) || 0, text: String(c.text || '').slice(0, 1000) }; })
    .filter(function (c) { return c.text; });
  if (decision === 'Changes requested' && !feedback && !cm.length) throw new Error('Add feedback so the speaker knows what to change.');
  updateRow_('Drafts', draftId, { status: decision, feedback: feedback, comments_json: JSON.stringify(cm), reviewed_by: me.name || me.email, reviewed_at: now_(), updated_at: now_() });
  updateRow_('Speakers', sp.id, { stage: decision });
  mail_(sp.email, decision === 'Approved' ? 'Your talk is approved 🎉' : 'Feedback on your draft (v' + r.version + ')', emailShell_(
    decision === 'Approved' ? 'Your talk is approved.' : 'Your ambassador has feedback.',
    '<p>' + esc_(me.name || 'Your Speaker Ambassador') + ' reviewed version ' + r.version + ' of “' + esc_(r.title) + '”.</p>' +
    (feedback ? '<div style="white-space:pre-wrap;background:#f6f6f6;padding:14px;border-radius:10px">' + esc_(feedback) + '</div>' : '') +
    (cm.length ? '<p>' + cm.length + ' comment' + (cm.length > 1 ? 's' : '') + ' on specific paragraphs are waiting in your portal.</p>' : '') +
    '<p><a href="' + CONFIG.SITE_URL + '/speaker">Open your speaker portal</a></p>'));
  audit_(me.email, 'review draft ' + decision, draftId);
  return { ok: true };
}

function spkCountersign_(me, agreementId, signature) {
  if (me.role !== 'super') throw new Error('Only the organizer can countersign.');
  const ag = findRow_('Agreements', agreementId);
  if (!ag) throw new Error('Agreement not found.');
  if (ag.status === 'Countersigned') throw new Error('Already countersigned.');
  const props = PropertiesService.getScriptProperties();
  let sigId = props.getProperty('ORGANIZER_SIG_FILE_ID');
  if (signature) {
    sigId = recordsFolder_('Signatures').createFile(dataUrlBlob_(signature, 'organizer-signature.png')).getId();
    props.setProperty('ORGANIZER_SIG_FILE_ID', sigId);
  }
  if (!sigId) throw new Error('Draw your signature to countersign.');
  const sp = findRow_('Speakers', ag.speaker_id);
  ag.status = 'Countersigned'; ag.countersigned_by = (me.name || me.email) + ' (' + me.email + ')'; ag.countersigned_at = now_(); ag.org_sig_file_id = sigId;
  const pdf = agreementPdf_(sp, ag, true);
  const fid = recordsFolder_('Agreements').createFile(pdf).getId();
  updateRow_('Agreements', ag.id, { status: ag.status, countersigned_by: ag.countersigned_by, countersigned_at: ag.countersigned_at, org_sig_file_id: sigId, final_pdf_file_id: fid });
  if (sp.stage === 'Agreements signed') updateRow_('Speakers', sp.id, { stage: 'Countersigned' });
  mail_(sp.email, 'Your countersigned speaker agreements — TEDxThaltej Youth', emailShell_('Fully signed.',
    '<p>The organizer has countersigned your agreements. The final copy, signed by both of us, is attached.</p>'), { attachments: [pdf] });
  try { mail_(settingsMap_().speaker_contact_email || 'info@tedxthaltejyouth.in', 'Countersigned: ' + ag.speaker_name, emailShell_('Countersigned', '<p>Final copy attached and saved to Drive.</p>'), { attachments: [pdf] }); } catch (e) { Logger.log(e); }
  audit_(me.email, 'countersign', ag.id);
  return { ok: true };
}

function spkAdminPdf_(me, agreementId) {
  const ag = findRow_('Agreements', agreementId);
  const sp = ag && findRow_('Speakers', ag.speaker_id);
  if (!sp || !spkCanSee_(me, sp)) throw new Error('Not found.');
  return spkPdfFor_(ag);
}
