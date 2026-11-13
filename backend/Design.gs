/**
 * Design Studio — the Design & Graphics team's workspace.
 *  • Requests: any member asks for a design (kind, size, text, references, deadline). The design head assigns it, or a
 *    designer claims it. The designer keeps the Canva edit link (shared with the design team) on the request.
 *  • Versions: each draft is submitted with an exported file (PNG/JPG/PDF, or a Drive link) and an optional Canva view
 *    link, after ticking the brand checklist. The exported file is the locked record of what was approved.
 *  • Approvals: requester → design head → Organizer (Organizer only for public work: posts, partner logos, the TEDx name).
 *    Anyone in the chain can ask for changes; the last approval marks the version final and sends it to the requester.
 *  • Brand kit: logos, colours, fonts, templates and the brand checklist, managed by the design head.
 *  • Library: every approved final, searchable, downloadable by any member.
 * Who is "the design team": members of the department named in setting `design_department` (or the department whose
 * name contains "Design" / "Graphic"), plus anyone given the Design page. Heads of that department and people with
 * edit access to the Design page manage it.
 */
const DS_KINDS = [
  ['Instagram post', '1080 × 1350 px'], ['Instagram story / reel cover', '1080 × 1920 px'], ['Square post', '1080 × 1080 px'],
  ['LinkedIn post', '1200 × 627 px'], ['Speaker card', '1080 × 1350 px'], ['Poster A3', '297 × 420 mm'], ['Poster A4', '210 × 297 mm'],
  ['Certificate', 'A4 landscape'], ['Standee', '6 × 3 ft'], ['Banner', 'custom'], ['Presentation', '1920 × 1080 px'], ['Video thumbnail', '1280 × 720 px'], ['Other', 'custom']];
const DS_STATUSES = ['Requested', 'Assigned', 'In progress', 'In review', 'Changes requested', 'Approved', 'Cancelled'];
const DS_BRAND_KINDS = ['Logo', 'Colour', 'Font', 'Template', 'Checklist', 'Guide'];
const DS_DEFAULT_CHECKS = [
  'The TEDxThaltej Youth logo is the official file, not redrawn or recoloured',
  'The red TEDx logo is not stretched, rotated or changed in any way',
  '“x = independently organized TED event” is shown where the logo is used publicly',
  'Colours are from the brand palette (cream, navy, red, yellow)',
  'Fonts are Anton and Inter',
  'Names, titles, dates and spellings are checked',
  'Partner logos are the latest versions and placed as agreed'];

function dsDept_() {
  const s = settingsMap_().design_department;
  if (s && findRow_('Departments', s)) return s;
  const d = readAll_('Departments').filter(function (x) { return /design|graphic/i.test(x.name); })[0];
  return d ? d.id : '';
}
function dsTeam_(me) { return me.role === 'super' || (me.scopeList || []).indexOf('design') >= 0 || inDept_(me, dsDept_()); }
function dsManager_(me) { return me.role === 'super' || (me.role === 'lead' && inDept_(me, dsDept_())) || can_(me, 'design', true) && (me.scopeList || []).indexOf('design') >= 0; }
function dsHead_() {
  const d = dsDept_();
  return readAll_('Admins').filter(function (a) { return truthy_(a.active) && a.role === 'lead' && inDept_(a, d); })[0] || null;
}
function dsCan_(me, r) {
  const mine = lc_(me.email);
  return dsTeam_(me) || lc_(r.requested_by) === mine || String(r.approvers || '').split(',').indexOf(mine) >= 0;
}
function dsNext_(r) {
  const done = safeJson_(r.approvals_json, []).filter(function (x) { return x.decision === 'approve'; }).map(function (x) { return x.email; });
  return String(r.approvers || '').split(',').filter(String).filter(function (e) { return done.indexOf(e) < 0; })[0] || '';
}
function dsChain_(r, designer) {
  const out = [], push = function (e) { e = lc_(e || ''); if (isEmail_(e) && e !== lc_(designer) && out.indexOf(e) < 0) out.push(e); };
  push(r.requested_by);
  const h = dsHead_(); if (h) push(h.email);
  if (truthy_(r.public)) push(CONFIG.SUPER_ADMIN_EMAIL);
  if (!out.length) push(h ? h.email : CONFIG.SUPER_ADMIN_EMAIL);
  if (!out.length) out.push(lc_(CONFIG.SUPER_ADMIN_EMAIL));   // a designer who is also head and organizer still gets a check
  return out;
}
function dsMail_(to, subject, title, html) {
  [].concat(to).filter(isEmail_).forEach(function (e) {
    try { mail_(e, subject, emailShell_(title, html + '<p><a href="' + CONFIG.ADMIN_URL + '#design">Open Design Studio</a></p>')); } catch (x) { Logger.log(x); }
  });
}
function dsLog_(r, me, text) { appendRow_('DesignMsgs', { id: newId_('DM'), request_id: r.id, email: 'system', body: (me ? me.name + ': ' : '') + text, created_at: now_() }); }
function dsChecks_() {
  const rows = readAll_('BrandKit').filter(function (b) { return b.kind === 'Checklist'; }).map(function (b) { return b.name; });
  return rows.length ? rows : DS_DEFAULT_CHECKS;
}

function dsHandle_(me, a, b) {
  switch (a) {
    case 'dsBoot': return dsBoot_(me);
    case 'dsGet': return dsGet_(me, b.id);
    case 'dsRequest': return dsRequest_(me, b);
    case 'dsAssign': return dsAssign_(me, b);
    case 'dsUpdate': return dsUpdate_(me, b);
    case 'dsSubmit': return dsSubmit_(me, b);
    case 'dsDecide': return dsDecide_(me, b);
    case 'dsMsg': return dsMsg_(me, b);
    case 'dsFile': return dsFile_(me, b);
    case 'dsBrandSave': return dsBrandSave_(me, b);
    case 'dsBrandDelete': return dsBrandDelete_(me, b);
  }
  return null;
}

function dsBoot_(me) {
  const people = {}; readAll_('Admins').forEach(function (a) { people[lc_(a.email)] = a.name; });
  const mine = lc_(me.email), team = dsTeam_(me), d = dsDept_();
  const all = readAll_('DesignRequests');
  const vis = all.filter(function (r) { return team || lc_(r.requested_by) === mine || String(r.approvers || '').split(',').indexOf(mine) >= 0; });
  const row = function (r) {
    return { id: r.id, title: r.title, kind: r.kind, size: r.size, deadline: r.deadline, priority: r.priority, public: truthy_(r.public), status: r.status,
      requested_by: people[lc_(r.requested_by)] || r.requested_by, mine_req: lc_(r.requested_by) === mine, assignee: people[lc_(r.assignee)] || r.assignee || '',
      assignee_email: lc_(r.assignee), mine_work: lc_(r.assignee) === mine, waiting_me: r.status === 'In review' && dsNext_(r) === mine,
      final: !!(r.final_file_id || r.final_link), tags: r.tags, edition_id: r.edition_id, created_at: r.created_at, updated_at: r.updated_at };
  };
  const designers = readAll_('Admins').filter(function (a) { return truthy_(a.active) && (inDept_(a, d) || String(a.scopes || '').split(',').some(function (s) { return s.split(':')[0] === 'design'; })); })
    .map(function (a) { return { email: lc_(a.email), name: a.name, open: all.filter(function (r) { return lc_(r.assignee) === lc_(a.email) && ['Assigned', 'In progress', 'In review', 'Changes requested'].indexOf(r.status) >= 0; }).length }; });
  return { ok: true, team: team, manager: dsManager_(me), kinds: DS_KINDS, statuses: DS_STATUSES, brandKinds: DS_BRAND_KINDS,
    dept: d, designers: team ? designers : [], rows: vis.map(row).reverse(),
    library: all.filter(function (r) { return r.status === 'Approved' && (r.final_file_id || r.final_link); }).map(row).reverse(),
    brand: readAll_('BrandKit').map(function (x) { return { id: x.id, kind: x.kind, name: x.name, value: x.value, link: x.link, file_id: x.file_id, note: x.note, sort: x.sort }; })
      .sort(function (p, q) { return (DS_BRAND_KINDS.indexOf(p.kind) - DS_BRAND_KINDS.indexOf(q.kind)) || ((+p.sort || 0) - (+q.sort || 0)); }),
    checks: dsChecks_(), editions: readAll_('Editions').map(function (e) { return { id: e.id, name: 'Edition ' + e.number }; }) };
}

function dsGet_(me, id) {
  const r = findRow_('DesignRequests', id); if (!r || !dsCan_(me, r)) throw new Error('Request not found.');
  const people = {}; readAll_('Admins').forEach(function (a) { people[lc_(a.email)] = a.name; });
  const team = dsTeam_(me);
  return { ok: true, team: team, manager: dsManager_(me), checks: dsChecks_(),
    request: Object.assign({}, r, { public: truthy_(r.public), requested_by_name: people[lc_(r.requested_by)] || r.requested_by, assignee_name: people[lc_(r.assignee)] || '',
      canva_edit: team ? r.canva_edit : '', next: dsNext_(r), next_name: people[dsNext_(r)] || dsNext_(r),
      chain: String(r.approvers || '').split(',').filter(String).map(function (e) { return { email: e, name: people[e] || e }; }),
      approvals: safeJson_(r.approvals_json, []), mine_req: lc_(r.requested_by) === lc_(me.email), mine_work: lc_(r.assignee) === lc_(me.email) }),
    versions: readAll_('DesignVersions').filter(function (v) { return v.request_id === r.id; }).map(function (v) {
      return { id: v.id, v: v.v, canva_view: v.canva_view, has_file: !!v.file_id, file_name: v.file_name, file_type: v.file_type, link: v.link, note: v.note, by: people[lc_(v.by)] || v.by, status: v.status, created_at: v.created_at }; }).reverse(),
    messages: readAll_('DesignMsgs').filter(function (m) { return m.request_id === r.id; }).map(function (m) {
      return { from: m.email === 'system' ? 'system' : (people[lc_(m.email)] || m.email), mine: lc_(m.email) === lc_(me.email), body: m.body, at: m.created_at }; }) };
}

function dsRequest_(me, b) {
  const f = clean_(b, { title: 140, kind: 60, size: 60, purpose: 1500, copy_text: 4000, refs: 1500, deadline: 10, priority: 20, edition_id: 30, tags: 200 });
  if (!f.title) throw new Error('Give the design a title.');
  if (!DS_KINDS.some(function (k) { return k[0] === f.kind; })) f.kind = 'Other';
  if (!f.size) f.size = (DS_KINDS.filter(function (k) { return k[0] === f.kind; })[0] || ['', ''])[1];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.deadline)) throw new Error('Choose a deadline.');
  if (f.deadline < now_().slice(0, 10)) throw new Error('The deadline is in the past.');
  if (!f.purpose) throw new Error('Say what it is for and where it will be used.');
  if (TASK_PRIORITIES.indexOf(f.priority) < 0) f.priority = 'Medium';
  rateLimit_('dsreq_' + lc_(me.email), 20, 86400);
  const rec = Object.assign(f, { id: seq_('DesignRequests', 'DS'), public: truthy_(b.public) ? 'TRUE' : 'FALSE', requested_by: lc_(me.email), req_department: me.department_id || '',
    assignee: '', status: 'Requested', canva_edit: '', canva_view: '', approvers: '', approvals_json: '[]', final_version: '', final_file_id: '', final_link: '', created_at: now_(), updated_at: now_() });
  appendRow_('DesignRequests', rec);
  const h = dsHead_();
  dsMail_(h ? h.email : CONFIG.SUPER_ADMIN_EMAIL, 'New design request: ' + rec.title, 'New design request',
    '<p><b>' + esc_(rec.title) + '</b> · ' + esc_(rec.kind) + ' (' + esc_(rec.size) + ')<br>From ' + esc_(me.name) + ' · needed by ' + esc_(prettyDate_(rec.deadline)) + '</p>');
  audit_(me.email, 'design request', rec.id);
  return { ok: true, id: rec.id };
}

function dsAssign_(me, b) {
  const r = findRow_('DesignRequests', b.id); if (!r) throw new Error('Request not found.');
  const to = lc_(b.email || me.email);
  if (to === lc_(me.email) ? !dsTeam_(me) : !dsManager_(me)) throw new Error(to === lc_(me.email) ? 'Only the design team can take requests.' : 'Only the design head assigns requests.');
  if (['Approved', 'Cancelled'].indexOf(r.status) >= 0) throw new Error('This request is closed.');
  const u = findAdmin_(to); if (!u || !truthy_(u.active)) throw new Error('Choose an active member.');
  if (r.assignee && lc_(r.assignee) !== to && !dsManager_(me)) throw new Error('Someone is already working on this.');
  updateRow_('DesignRequests', r.id, { assignee: to, status: r.status === 'Requested' ? (to === lc_(me.email) ? 'In progress' : 'Assigned') : r.status, updated_at: now_() });
  dsLog_(r, me, to === lc_(me.email) ? 'took this request' : 'assigned it to ' + u.name);
  if (to !== lc_(me.email)) dsMail_(to, 'Design assigned to you: ' + r.title, 'A design for you', '<p><b>' + esc_(r.title) + '</b> · needed by ' + esc_(prettyDate_(r.deadline)) + '</p>');
  if (lc_(r.requested_by) !== to) dsMail_(r.requested_by, 'Your design request is with ' + u.name, 'Your request is being worked on', '<p><b>' + esc_(r.title) + '</b> is with ' + esc_(u.name) + '.</p>');
  return { ok: true };
}

function dsUpdate_(me, b) {
  const r = findRow_('DesignRequests', b.id); if (!r) throw new Error('Request not found.');
  const isReq = lc_(r.requested_by) === lc_(me.email), mgr = dsManager_(me), work = lc_(r.assignee) === lc_(me.email);
  const up = { updated_at: now_() };
  if (b.canva_edit !== undefined || b.canva_view !== undefined) {
    if (!work && !mgr) throw new Error('Only the designer can set the Canva links.');
    ['canva_edit', 'canva_view'].forEach(function (k) { if (b[k] === undefined) return; const v = String(b[k] || '').trim();
      if (v && !/^https:\/\/(www\.)?canva\.(com|link)\//.test(v)) throw new Error('Paste a Canva link (canva.com/design/…).'); up[k] = v.slice(0, 500); });
  }
  if (b.status === 'Cancelled') { if (!isReq && !mgr) throw new Error('Only the requester or the design head can cancel.'); up.status = 'Cancelled'; dsLog_(r, me, 'cancelled the request'); }
  ['deadline', 'priority', 'tags', 'public'].forEach(function (k) {
    if (b[k] === undefined) return; if (!isReq && !mgr) throw new Error('Only the requester or the design head can change this.');
    up[k] = k === 'public' ? (truthy_(b[k]) ? 'TRUE' : 'FALSE') : String(b[k]).slice(0, 200);
  });
  updateRow_('DesignRequests', r.id, up);
  return { ok: true };
}

function dsSaveFile_(dataUrl, name) {
  const m = String(dataUrl || '').match(/^data:(image\/(png|jpeg|webp)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw new Error('Upload a PNG, JPG, WebP or PDF export.');
  if (m[3].length > 11000000) throw new Error('That file is over 8 MB. Export a compressed version, or paste a Google Drive link instead.');
  const folder = opsFolder_('TEDxThaltej Youth — Design Studio', 'DS_FOLDER_ID');
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(m[3]), m[1], String(name || 'design').replace(/[^\w.\- ]/g, '').slice(0, 90) || 'design'));
  return { id: file.getId(), type: m[1] };
}

function dsSubmit_(me, b) {
  const r = findRow_('DesignRequests', b.id); if (!r) throw new Error('Request not found.');
  if (lc_(r.assignee) !== lc_(me.email) && !dsManager_(me)) throw new Error('Only the designer working on it can submit a version.');
  if (['In progress', 'Assigned', 'Changes requested'].indexOf(r.status) < 0) throw new Error(r.status === 'In review' ? 'A version is already in review.' : 'This request is ' + r.status.toLowerCase() + '.');
  const checks = dsChecks_(), ticked = [].concat(b.checks || []).map(Number);
  if (checks.some(function (_, i) { return ticked.indexOf(i) < 0; })) throw new Error('Tick every item on the brand checklist first.');
  const link = String(b.link || '').trim(), cv = String(b.canva_view || r.canva_view || '').trim();
  if (link && !/^https:\/\/(drive|docs)\.google\.com\//.test(link)) throw new Error('Paste a Google Drive link for the file.');
  if (cv && !/^https:\/\/(www\.)?canva\.(com|link)\//.test(cv)) throw new Error('Paste a Canva view link.');
  if (!b.dataUrl && !link) throw new Error('Attach the exported file (PNG, JPG or PDF), or a Drive link to it. It becomes the locked copy.');
  const saved = b.dataUrl ? dsSaveFile_(b.dataUrl, b.name || (r.id + ' v')) : null;
  const v = readAll_('DesignVersions').filter(function (x) { return x.request_id === r.id; }).length + 1;
  appendRow_('DesignVersions', { id: newId_('DV'), request_id: r.id, v: String(v), canva_view: cv.slice(0, 500), file_id: saved ? saved.id : '', file_name: saved ? String(b.name || '').slice(0, 90) : '',
    file_type: saved ? saved.type : '', link: link.slice(0, 500), note: String(b.note || '').slice(0, 1500), by: lc_(me.email), status: 'In review', checks_json: JSON.stringify(checks), created_at: now_() });
  const chain = dsChain_(r, r.assignee || me.email);
  updateRow_('DesignRequests', r.id, { status: 'In review', approvers: chain.join(','), approvals_json: '[]', canva_view: cv || r.canva_view, updated_at: now_() });
  dsLog_(r, me, 'submitted version ' + v + ' for approval');
  dsMail_(chain[0], 'Approval needed: ' + r.title + ' (v' + v + ')', 'Your approval is needed', '<p>Version ' + v + ' of <b>' + esc_(r.title) + '</b> is ready for you to approve.</p>');
  audit_(me.email, 'design submitted', r.id + ' v' + v);
  return { ok: true, v: v, chain: chain };
}

function dsDecide_(me, b) {
  return withLock_(function () {
    const r = findRow_('DesignRequests', b.id); if (!r) throw new Error('Request not found.');
    if (r.status !== 'In review') throw new Error('Nothing is waiting for approval.');
    const mine = lc_(me.email), nx = dsNext_(r);
    if (nx !== mine && me.role !== 'super') throw new Error('It is waiting for ' + (nx ? 'another approver' : 'no one') + ' first.');
    if (['approve', 'changes'].indexOf(b.decision) < 0) throw new Error('Approve it or ask for changes.');
    const note = String(b.note || '').trim().slice(0, 1500);
    if (b.decision === 'changes' && !note) throw new Error('Say what needs to change.');
    const vers = readAll_('DesignVersions').filter(function (x) { return x.request_id === r.id; });
    const cur = vers[vers.length - 1];
    const ap = safeJson_(r.approvals_json, []); ap.push({ email: mine, name: me.name, decision: b.decision, note: note, v: cur ? cur.v : '', at: now_() });
    const up = { approvals_json: JSON.stringify(ap), updated_at: now_() };
    let done = false;
    if (b.decision === 'changes') { up.status = 'Changes requested'; if (cur) updateRow_('DesignVersions', cur.id, { status: 'Changes requested' }); }
    else if (!dsNext_(Object.assign({}, r, up)) || (me.role === 'super' && nx !== mine)) {
      done = true; up.status = 'Approved'; up.final_version = cur ? cur.v : ''; up.final_file_id = cur ? cur.file_id : ''; up.final_link = cur ? cur.link : '';
      if (cur) updateRow_('DesignVersions', cur.id, { status: 'Approved' });
    }
    updateRow_('DesignRequests', r.id, up);
    dsLog_(r, me, (b.decision === 'approve' ? 'approved' : 'asked for changes on') + ' version ' + (cur ? cur.v : '') + (note ? ': ' + note : ''));
    if (b.decision === 'changes') dsMail_(r.assignee, 'Changes requested: ' + r.title, 'Changes requested', '<p><b>' + esc_(r.title) + '</b></p><p>' + esc_(note) + '</p>');
    else if (done) dsMail_([r.requested_by, r.assignee].filter(function (e, i, a) { return a.indexOf(e) === i; }), 'Approved: ' + r.title, 'Approved and ready to use 🎉',
      '<p>Version ' + (cur ? cur.v : '') + ' of <b>' + esc_(r.title) + '</b> is approved. Download the final from the Design Studio library. Use only this approved file.</p>');
    else dsMail_(dsNext_(Object.assign({}, r, up)), 'Approval needed: ' + r.title, 'Your approval is needed', '<p><b>' + esc_(r.title) + '</b> has been approved by ' + esc_(me.name) + ' and now needs yours.</p>');
    audit_(me.email, 'design ' + b.decision, r.id);
    return { ok: true, status: up.status || r.status };
  });
}

function dsMsg_(me, b) {
  const r = findRow_('DesignRequests', b.id); if (!r || !dsCan_(me, r)) throw new Error('Request not found.');
  const body = String(b.body || '').trim().slice(0, 3000); if (!body) throw new Error('Write a comment.');
  appendRow_('DesignMsgs', { id: newId_('DM'), request_id: r.id, email: lc_(me.email), body: body, created_at: now_() });
  updateRow_('DesignRequests', r.id, { updated_at: now_() });
  const to = [r.requested_by, r.assignee].filter(function (e) { return isEmail_(e) && lc_(e) !== lc_(me.email); });
  if (to.length) try { dsMail_(to, 'Comment on ' + r.title, 'New comment', '<p>' + esc_(me.name) + ' commented on <b>' + esc_(r.title) + '</b>.</p>'); } catch (e) { }
  return { ok: true };
}

/** Returns a version's file (or a brand kit file) as base64 for preview and download. Files stay private in Drive. */
function dsFile_(me, b) {
  let fid = '', name = 'design';
  if (b.brand) { const k = findRow_('BrandKit', b.brand); if (!k || !k.file_id) throw new Error('File not found.'); fid = k.file_id; name = k.name; }
  else {
    const v = findRow_('DesignVersions', b.version); if (!v || !v.file_id) throw new Error('File not found.');
    const r = findRow_('DesignRequests', v.request_id);
    const isFinal = r && r.status === 'Approved' && r.final_file_id === v.file_id;
    if (!r || (!isFinal && !dsCan_(me, r))) throw new Error('File not found.');
    fid = v.file_id; name = (r.title + ' v' + v.v).replace(/[^\w.\- ]/g, '');
  }
  const f = DriveApp.getFileById(fid), blob = f.getBlob();
  if (blob.getBytes().length > 9000000) return { ok: true, tooLarge: true, url: f.getUrl() };
  return { ok: true, name: name + (/pdf/.test(blob.getContentType()) ? '.pdf' : /png/.test(blob.getContentType()) ? '.png' : '.jpg'), type: blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) };
}

function dsBrandSave_(me, b) {
  if (!dsManager_(me)) throw new Error('Only the design head manages the brand kit.');
  const f = clean_(b, { id: 30, kind: 20, name: 200, value: 200, link: 500, note: 600, sort: 6 });
  if (DS_BRAND_KINDS.indexOf(f.kind) < 0) throw new Error('Choose a kind.');
  if (!f.name) throw new Error('Give it a name.');
  if (f.kind === 'Colour' && !/^#[0-9a-f]{6}$/i.test(f.value)) throw new Error('Give the colour as a hex code, like #E62B1E.');
  if (f.link && !/^https:\/\//.test(f.link)) throw new Error('Links must start with https://');
  const rec = { kind: f.kind, name: f.name, value: f.value, link: f.link, note: f.note, sort: f.sort || '0' };
  if (b.dataUrl) rec.file_id = dsSaveFile_(b.dataUrl, f.name).id;
  if (f.id && findRow_('BrandKit', f.id)) updateRow_('BrandKit', f.id, rec);
  else appendRow_('BrandKit', Object.assign(rec, { id: newId_('BK'), file_id: rec.file_id || '', created_at: now_() }));
  audit_(me.email, 'brand kit', f.kind + ': ' + f.name);
  return { ok: true };
}
function dsBrandDelete_(me, b) {
  if (!dsManager_(me)) throw new Error('Only the design head manages the brand kit.');
  deleteRow_('BrandKit', b.id); return { ok: true };
}

/** One inbox for everything waiting on this person's sign-off: task approvals and design approvals. */
function approvalsInbox_(me) {
  const people = {}; readAll_('Admins').forEach(function (a) { people[lc_(a.email)] = a.name; });
  const mine = lc_(me.email);
  const tasks = readAll_('Tasks').filter(function (t) { return t.status === 'Awaiting approval' && (taskNext_(t) === mine || (me.role === 'super' && taskChain_(t).length)); })
    .map(function (t) { return { type: 'task', id: t.id, title: t.title, who: people[lc_(t.assigned_to)] || t.assigned_to, due: t.due_date, proof: safeJson_(t.proof_json, []),
      chain: taskChain_(t).map(function (e) { return people[e] || e; }), approvals: safeJson_(t.approvals_json, []), mine: taskNext_(t) === mine, description: t.description }; });
  const designs = readAll_('DesignRequests').filter(function (r) { return r.status === 'In review' && (dsNext_(r) === mine || me.role === 'super'); })
    .map(function (r) { return { type: 'design', id: r.id, title: r.title, who: people[lc_(r.assignee)] || r.assignee, due: r.deadline, kind: r.kind, public: truthy_(r.public),
      chain: String(r.approvers || '').split(',').filter(String).map(function (e) { return people[e] || e; }), approvals: safeJson_(r.approvals_json, []), mine: dsNext_(r) === mine }; });
  return { ok: true, rows: tasks.concat(designs) };
}
