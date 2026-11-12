/**
 * Team Mail — private messages inside the Team Portal (not real email).
 * Every active portal user has a mailbox. Messages can go to people, a whole team (department), the Core Team or everyone.
 * Messages: one row per message. Mailbox: one row per (message, person) holding folder, read and star.
 * Optional: settings `intramail_notify` = TRUE emails a short "you have a new message" note (no message text).
 */
const IM_FOLDERS = ['inbox', 'sent', 'archive', 'trash'];

function imPeople_() {
  return readAll_('Admins').filter(function (a) { return truthy_(a.active); })
    .map(function (a) { return { email: lc_(a.email), name: a.name || a.email, role: a.role, department_id: a.department_id }; });
}

function imBoot_(me) {
  const depts = readAll_('Departments').sort(by_('sort', true));
  const people = imPeople_();
  const groups = [{ id: 'all', name: 'Everyone', count: people.length },
    { id: 'core', name: 'Core Team (Directors & Heads)', count: people.filter(function (p) { return p.role === 'super' || p.role === 'lead'; }).length }]
    .concat(depts.map(function (d) { return { id: 'dept:' + d.id, name: d.name + ' team', count: people.filter(function (p) { return p.department_id === d.id; }).length }; }));
  return { ok: true, me: lc_(me.email), people: people, groups: groups, counts: imCounts_(me) };
}

function imCounts_(me) {
  const mine = readAll_('Mailbox').filter(function (b) { return b.email === lc_(me.email); });
  const unread = {};
  mine.forEach(function (b) { if (b.folder === 'inbox' && !truthy_(b.read)) unread[b.thread_id] = 1; });
  return { inbox: Object.keys(unread).length, starred: mine.filter(function (b) { return truthy_(b.starred) && b.folder !== 'trash'; }).length };
}

function imExpand_(me, to) {
  const people = imPeople_(), set = {};
  [].concat(to || []).forEach(function (t) {
    t = String(t).trim();
    if (t === 'all') people.forEach(function (p) { set[p.email] = 1; });
    else if (t === 'core') people.forEach(function (p) { if (p.role === 'super' || p.role === 'lead') set[p.email] = 1; });
    else if (t.indexOf('dept:') === 0) people.forEach(function (p) { if (p.department_id === t.slice(5)) set[p.email] = 1; });
    else if (people.some(function (p) { return p.email === lc_(t); })) set[lc_(t)] = 1;
  });
  delete set[lc_(me.email)];
  return Object.keys(set);
}

function imLabel_(to) {
  const depts = readAll_('Departments'), people = imPeople_();
  return [].concat(to || []).map(function (t) {
    if (t === 'all') return 'Everyone';
    if (t === 'core') return 'Core Team';
    if (String(t).indexOf('dept:') === 0) { const d = depts.filter(function (x) { return x.id === t.slice(5); })[0]; return (d ? d.name : t) + ' team'; }
    const p = people.filter(function (x) { return x.email === lc_(t); })[0]; return p ? p.name : t;
  }).join(', ');
}

function imSend_(me, b) {
  const subject = String(b.subject || '').trim().slice(0, 200);
  const body = String(b.body || '').trim().slice(0, 20000);
  if (!body) throw new Error('Write a message first.');
  let threadId = String(b.thread_id || ''), to = [].concat(b.to || []);
  if (threadId) {
    const prev = readAll_('Mailbox').filter(function (x) { return x.thread_id === threadId; });
    if (!prev.some(function (x) { return x.email === lc_(me.email); })) throw new Error('Conversation not found.');
    if (!to.length) prev.forEach(function (x) { if (to.indexOf(x.email) < 0) to.push(x.email); }); // reply all
  }
  const recipients = imExpand_(me, to);
  if (!recipients.length) throw new Error('Choose at least one person or team.');
  if (!threadId && !subject) throw new Error('Add a subject.');
  rateLimit_('im_' + lc_(me.email), 60, 600);
  const id = newId_('MS');
  if (!threadId) threadId = id;
  const first = readAll_('Messages').filter(function (m) { return m.thread_id === threadId; })[0];
  const msg = { id: id, thread_id: threadId, from_email: lc_(me.email), from_name: me.name || me.email, to_json: JSON.stringify(recipients),
    to_label: b.thread_id ? 'Reply' : imLabel_(to), subject: first ? first.subject : subject, body: body, created_at: now_() };
  withLock_(function () {
    appendRow_('Messages', msg);
    const rows = recipients.map(function (e) { return { key: id + '|' + e, msg_id: id, thread_id: threadId, email: e, folder: 'inbox', read: 'FALSE', starred: 'FALSE', updated_at: now_() }; });
    rows.push({ key: id + '|' + lc_(me.email), msg_id: id, thread_id: threadId, email: lc_(me.email), folder: 'sent', read: 'TRUE', starred: 'FALSE', updated_at: now_() });
    appendRows_('Mailbox', rows);
  });
  if (truthy_(settingsMap_().intramail_notify) && recipients.length <= 60) {
    recipients.forEach(function (e) {
      mail_(e, 'New Team Mail from ' + msg.from_name, emailShell_('You have a new message.',
        '<p><b>' + esc_(msg.from_name) + '</b> sent you a message in Team Mail: <b>' + esc_(msg.subject) + '</b>.</p>' +
        '<p><a href="' + CONFIG.ADMIN_URL + '#mail" style="display:inline-block;background:#EB0028;color:#fff;padding:10px 20px;border-radius:30px;text-decoration:none;font-weight:700">Open Team Mail</a></p>'));
    });
  }
  return { ok: true, id: id, thread_id: threadId };
}

/** folder: inbox | sent | starred | archive | trash; q: search text */
function imList_(me, folder, q) {
  folder = folder === 'starred' || IM_FOLDERS.indexOf(folder) >= 0 ? folder : 'inbox';
  const mine = readAll_('Mailbox').filter(function (b) { return b.email === lc_(me.email); });
  const msgs = {}; readAll_('Messages').forEach(function (m) { msgs[m.id] = m; });
  const threads = {};
  mine.forEach(function (b) {
    const inFolder = folder === 'starred' ? truthy_(b.starred) && b.folder !== 'trash' : b.folder === folder;
    const t = threads[b.thread_id] || (threads[b.thread_id] = { thread_id: b.thread_id, inFolder: false, unread: false, starred: false, count: 0, last: null, people: {} });
    const m = msgs[b.msg_id]; if (!m) return;
    t.count++;
    if (inFolder) t.inFolder = true;
    if (b.folder !== 'trash' && !truthy_(b.read)) t.unread = true;
    if (truthy_(b.starred)) t.starred = true;
    t.people[m.from_name] = 1;
    if (!t.last || m.created_at > t.last.created_at) t.last = m;
  });
  q = String(q || '').toLowerCase().trim();
  const rows = Object.keys(threads).map(function (k) { return threads[k]; }).filter(function (t) { return t.inFolder && t.last; })
    .map(function (t) {
      return { thread_id: t.thread_id, subject: t.last.subject, from: t.last.from_name, from_email: t.last.from_email, to_label: t.last.to_label,
        snippet: String(t.last.body).replace(/\s+/g, ' ').slice(0, 140), at: t.last.created_at, unread: t.unread, starred: t.starred, count: t.count,
        people: Object.keys(t.people).slice(0, 4) };
    })
    .filter(function (t) { return !q || (t.subject + ' ' + t.from + ' ' + t.snippet).toLowerCase().indexOf(q) >= 0; })
    .sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); }).slice(0, 300);
  return { ok: true, folder: folder, rows: rows, counts: imCounts_(me) };
}

function imThread_(me, threadId) {
  const mine = readAll_('Mailbox').filter(function (b) { return b.email === lc_(me.email) && b.thread_id === threadId; });
  if (!mine.length) throw new Error('Conversation not found.');
  const ids = {}; mine.forEach(function (b) { ids[b.msg_id] = b; });
  const messages = readAll_('Messages').filter(function (m) { return ids[m.id]; }).sort(by_('created_at'))
    .map(function (m) { return { id: m.id, from: m.from_name, from_email: m.from_email, to: safeJson_(m.to_json, []), to_label: m.to_label, body: m.body, at: m.created_at }; });
  imMarkRows_(mine.filter(function (b) { return !truthy_(b.read); }), { read: 'TRUE' });
  const people = imPeople_(), nameOf = {}; people.forEach(function (p) { nameOf[p.email] = p.name; });
  const participants = {}; messages.forEach(function (m) { participants[m.from_email] = 1; m.to.forEach(function (e) { participants[e] = 1; }); });
  return { ok: true, thread_id: threadId, subject: (readAll_('Messages').filter(function (m) { return m.thread_id === threadId; })[0] || {}).subject,
    messages: messages, starred: mine.some(function (b) { return truthy_(b.starred); }), folder: mine[mine.length - 1].folder,
    participants: Object.keys(participants).map(function (e) { return { email: e, name: nameOf[e] || e }; }), counts: imCounts_(me) };
}

/** op: read | unread | star | unstar | archive | inbox | trash */
function imAct_(me, threadId, op) {
  const mine = readAll_('Mailbox').filter(function (b) { return b.email === lc_(me.email) && b.thread_id === threadId; });
  if (!mine.length) throw new Error('Conversation not found.');
  const patch = { read: { read: 'TRUE' }, unread: { read: 'FALSE' }, star: { starred: 'TRUE' }, unstar: { starred: 'FALSE' } }[op];
  if (patch) imMarkRows_(op === 'unread' ? mine.slice(-1) : mine, patch);
  else if (op === 'trash') imMarkRows_(mine, { folder: 'trash' });
  else if (op === 'archive') imMarkRows_(mine.filter(function (b) { return b.folder === 'inbox'; }), { folder: 'archive' });
  else if (op === 'inbox') { // restore: messages I sent go back to Sent, the rest to Inbox
    const from = {}; readAll_('Messages').forEach(function (m) { if (m.thread_id === threadId) from[m.id] = m.from_email; });
    mine.filter(function (b) { return b.folder === 'archive' || b.folder === 'trash'; }).forEach(function (b) {
      imMarkRows_([b], { folder: from[b.msg_id] === lc_(me.email) ? 'sent' : 'inbox' });
    });
  } else throw new Error('Unknown action.');
  return { ok: true, counts: imCounts_(me) };
}

function imMarkRows_(rows, patch) {
  if (!rows.length) return;
  withLock_(function () { rows.forEach(function (b) { updateRow_('Mailbox', b.key, Object.assign({ updated_at: now_() }, patch)); }); });
}

/** Append many rows in one write. */
function appendRows_(name, objs) {
  if (!objs.length) return;
  const cols = SCHEMA[name], s = sh_(name), r = s.getLastRow() + 1;
  const range = s.getRange(r, 1, objs.length, cols.length);
  range.setNumberFormat('@');
  range.setValues(objs.map(function (o) { return cols.map(function (c) { return safeCell_(o[c]); }); }));
}
