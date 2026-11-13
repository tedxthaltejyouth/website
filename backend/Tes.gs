/**
 * TES (TEDxThaltej Execution System), merged into the Team Portal:
 *   • Claimable tasks: a task with no assignee is open to its whole department (or to everyone when no department is
 *     set). A member claims it, works on it, submits proof links; the person who set it accepts it or asks for rework.
 *   • Meetings & attendance: Present / Late / Absent / Excused / N.A. Excused counts as attended; N.A. is left out.
 *     Optional Google Meet link and calendar invites.
 *   • Awards (Torch Bearer and others), shown on the member's profile.
 *   • Grievances: case IDs (GRV-YYYY-NNNN), a private thread with the Organizer, statuses, reopen, printable transcript.
 *   • Maintenance mode and temporary access locks (team, speakers, Idea Stewards).
 */
const MEET_STATUSES = ['Present', 'Late', 'Absent', 'Excused', 'N.A.'];
const AWARD_TYPES = ['Torch Bearer Award', 'Rising Star', 'Spirit of TEDx', 'Above and Beyond', 'Team Player', 'Idea Champion'];
const GRV_STATUSES = ['Open', 'Under review', 'Waiting for member', 'Resolved', 'Closed'];
const GRV_CATEGORIES = ['Workload or tasks', 'Conduct of a member', 'Process or decision', 'Recognition or certificate', 'Safety or wellbeing', 'Other'];

// ───────────────────────────── CLAIMABLE TASKS ─────────────────────────────
function taskAvailable_(me) {
  return { ok: true, rows: readAll_('Tasks').filter(function (t) {
    return !t.assigned_to && t.status !== 'Done' && (!t.department_id || me.role === 'super' || inDept_(me, t.department_id));
  }), departments: readAll_('Departments').map(function (d) { return { id: d.id, name: d.name }; }) };
}
function taskClaim_(me, id) {
  return withLock_(function () {
    const t = findRow_('Tasks', id);
    if (!t) throw new Error('Task not found.');
    if (t.assigned_to) throw new Error('Someone has already claimed this task.');
    if (t.department_id && me.role !== 'super' && !inDept_(me, t.department_id)) throw new Error('This task is for another team.');
    const line = '[' + now_().replace('T', ' ').slice(0, 16) + '] ' + (me.name || me.email) + ': claimed the task';
    updateRow_('Tasks', id, { assigned_to: lc_(me.email), status: 'In progress', claimed_at: now_(), comments: (t.comments ? t.comments + '\n' : '') + line, updated_at: now_() });
    if (t.assigned_by && lc_(t.assigned_by) !== lc_(me.email)) mail_(t.assigned_by, 'Task claimed: ' + t.title, emailShell_('A task was claimed.',
      '<p><b>' + esc_(me.name || me.email) + '</b> claimed <b>' + esc_(t.title) + '</b>.</p>'));
    audit_(me.email, 'task claimed', id);
    return { ok: true };
  });
}
function taskSubmit_(me, id, links, note) {
  const t = findRow_('Tasks', id);
  if (!t || lc_(t.assigned_to) !== lc_(me.email)) throw new Error('This task isn’t yours.');
  const L = [].concat(links || []).map(function (x) { return { title: String(x.title || '').slice(0, 120), url: String(x.url || '').trim().slice(0, 500) }; })
    .filter(function (x) { return /^https?:\/\//.test(x.url); }).slice(0, 10);
  if (!L.length) throw new Error('Add at least one link to your work (Drive, Canva, photos, document).');
  const line = '[' + now_().replace('T', ' ').slice(0, 16) + '] ' + (me.name || me.email) + ': (Submitted) ' + String(note || '').slice(0, 800) +
    ' ' + L.map(function (x) { return (x.title ? x.title + ': ' : '') + x.url; }).join(' · ');
  updateRow_('Tasks', id, { status: 'Submitted', proof_json: JSON.stringify(L), comments: (t.comments ? t.comments + '\n' : '') + line, updated_at: now_() });
  if (t.assigned_by) mail_(t.assigned_by, 'Task submitted: ' + t.title, emailShell_('Work submitted for review',
    '<p><b>' + esc_(me.name || me.email) + '</b> submitted <b>' + esc_(t.title) + '</b>.</p><ul>' + L.map(function (x) { return '<li><a href="' + esc_(x.url) + '">' + esc_(x.title || x.url) + '</a></li>'; }).join('') + '</ul>' +
    '<p><a href="' + CONFIG.ADMIN_URL + '#tasks">Review it in the portal</a></p>'));
  return { ok: true };
}
function taskReview_(me, id, decision, note) {
  const t = findRow_('Tasks', id);
  if (!t) throw new Error('Task not found.');
  const manager = me.role === 'super' || lc_(t.assigned_by) === lc_(me.email) || (can_(me, 'tasks', true) && (!deptLocked_(me, 'tasks') || inDept_(me, t.department_id)));
  if (!manager) throw new Error('Only the person who set the task, or its team head, can review it.');
  if (t.status !== 'Submitted') throw new Error('This task has not been submitted.');
  if (['accept', 'rework'].indexOf(decision) < 0) throw new Error('Accept it or ask for rework.');
  note = String(note || '').trim().slice(0, 1000);
  if (decision === 'rework' && !note) throw new Error('Say what needs to change.');
  const chain = taskChain_(t);
  if (decision === 'accept' && chain.length) {
    updateRow_('Tasks', id, { status: 'Awaiting approval', approvals_json: '[]', comments: (t.comments ? t.comments + '\n' : '') + '[' + now_().replace('T', ' ').slice(0, 16) + '] ' + (me.name || me.email) + ': (Reviewed) sent for approval to ' + chain.length + ' approver' + (chain.length > 1 ? 's' : '') + (note ? '. ' + note : ''), updated_at: now_() });
    taskAskNext_(Object.assign({}, t, { approvals_json: '[]' }));
    return { ok: true, approval: true };
  }
  const st = decision === 'accept' ? 'Done' : 'In progress';
  updateRow_('Tasks', id, { status: st, comments: (t.comments ? t.comments + '\n' : '') + '[' + now_().replace('T', ' ').slice(0, 16) + '] ' + (me.name || me.email) + ': (' + (decision === 'accept' ? 'Accepted' : 'Rework requested') + ') ' + note, updated_at: now_() });
  if (t.assigned_to) mail_(t.assigned_to, (decision === 'accept' ? 'Accepted: ' : 'Rework needed: ') + t.title, emailShell_(decision === 'accept' ? 'Your work was accepted. 🎉' : 'A little more work needed.',
    '<p><b>' + esc_(t.title) + '</b></p>' + (note ? '<p>' + esc_(note).replace(/\n/g, '<br>') + '</p>' : '')));
  return { ok: true };
}
// ── Approval chain on tasks: after the setter accepts the work, each approver signs off in order. ──
function taskChain_(t) { return String(t.approvers || '').split(',').map(function (e) { return lc_(e.trim()); }).filter(isEmail_); }
function taskNext_(t) {
  const done = safeJson_(t.approvals_json, []).filter(function (x) { return x.decision === 'approve'; }).map(function (x) { return x.email; });
  return taskChain_(t).filter(function (e) { return done.indexOf(e) < 0; })[0] || '';
}
function taskAskNext_(t) {
  const nx = taskNext_(t); if (!nx) return;
  mail_(nx, 'Approval needed: ' + t.title, emailShell_('Your approval is needed',
    '<p><b>' + esc_(t.title) + '</b> is ready for your approval.</p>' + (t.proof_json ? '<ul>' + safeJson_(t.proof_json, []).map(function (x) { return '<li><a href="' + esc_(x.url) + '">' + esc_(x.title || x.url) + '</a></li>'; }).join('') + '</ul>' : '') +
    '<p><a href="' + CONFIG.ADMIN_URL + '#approvals">Approve or ask for changes</a></p>'));
}
function taskApprove_(me, id, decision, note) {
  const t = findRow_('Tasks', id); if (!t) throw new Error('Task not found.');
  if (t.status !== 'Awaiting approval') throw new Error('This task is not waiting for approval.');
  const nx = taskNext_(t), mine = lc_(me.email);
  if (nx !== mine && me.role !== 'super') throw new Error(nx ? 'It is waiting for another approver first.' : 'Nothing to approve.');
  if (['approve', 'changes'].indexOf(decision) < 0) throw new Error('Approve it or ask for changes.');
  note = String(note || '').trim().slice(0, 1000);
  if (decision === 'changes' && !note) throw new Error('Say what needs to change.');
  const ap = safeJson_(t.approvals_json, []);
  ap.push({ email: mine, name: me.name, decision: decision, note: note, at: now_(), on_behalf: nx && nx !== mine ? nx : '' });
  const line = '[' + now_().replace('T', ' ').slice(0, 16) + '] ' + (me.name || me.email) + ': (' + (decision === 'approve' ? 'Approved' : 'Changes requested') + ') ' + note;
  const up = { approvals_json: JSON.stringify(ap), comments: (t.comments ? t.comments + '\n' : '') + line, updated_at: now_() };
  if (decision === 'changes') up.status = 'In progress';
  else if (me.role === 'super' && nx !== mine) up.status = 'Done';           // the Organizer can give final approval
  else if (!taskNext_(Object.assign({}, t, up))) up.status = 'Done';
  updateRow_('Tasks', id, up);
  const t2 = Object.assign({}, t, up);
  if (up.status === 'In progress' || up.status === 'Done') [t.assigned_to, t.assigned_by].filter(isEmail_).filter(function (e, i, arr) { return arr.indexOf(e) === i && lc_(e) !== mine; }).forEach(function (e) {
    mail_(e, (up.status === 'Done' ? 'Approved: ' : 'Changes requested: ') + t.title, emailShell_(up.status === 'Done' ? 'Approved and done. 🎉' : 'Changes requested', '<p><b>' + esc_(t.title) + '</b></p>' + (note ? '<p>' + esc_(note) + '</p>' : '')));
  });
  else taskAskNext_(t2);
  audit_(me.email, 'task ' + decision, id);
  return { ok: true, status: up.status || t.status };
}

function taskRemind_(me, id, message) {
  const t = findRow_('Tasks', id);
  if (!t) throw new Error('Task not found.');
  if (!(me.role === 'super' || lc_(t.assigned_by) === lc_(me.email) || can_(me, 'tasks', true))) throw new Error('You can’t send reminders for this task.');
  rateLimit_('remind_' + id, 20, 86400);
  const to = t.assigned_to ? [t.assigned_to] : readAll_('Admins').filter(function (a) { return truthy_(a.active) && (!t.department_id || inDept_(a, t.department_id)); }).map(function (a) { return a.email; });
  to.forEach(function (e) {
    mail_(e, 'Reminder: ' + t.title, emailShell_(t.assigned_to ? 'A friendly reminder' : 'This task is waiting to be claimed',
      '<p><b>' + esc_(t.title) + '</b>' + (t.due_date ? ' · due ' + esc_(prettyDate_(t.due_date)) : '') + '</p>' + (message ? '<p>' + esc_(String(message).slice(0, 2000)).replace(/\n/g, '<br>') + '</p>' : '') +
      '<p><a href="' + CONFIG.ADMIN_URL + (t.assigned_to ? '#mytasks' : '#available') + '" style="display:inline-block;background:#EB0028;color:#fff;padding:10px 20px;border-radius:30px;text-decoration:none;font-weight:700">Open the task</a></p>'));
  });
  return { ok: true, sent: to.length };
}

// ───────────────────────────── MEETINGS & ATTENDANCE ─────────────────────────────
function meetCanManage_(me) { return me.role === 'super' || me.role === 'lead'; }
function meetAudience_(m) {
  const aud = String(m.audience || 'all'), people = readAll_('Admins').filter(function (a) { return truthy_(a.active); });
  if (aud === 'all') return people.map(function (a) { return lc_(a.email); });
  const parts = aud.split(',');
  return people.filter(function (a) { return myDepts_(a).some(function (d) { return parts.indexOf('dept:' + d) >= 0; }) || parts.indexOf(lc_(a.email)) >= 0; }).map(function (a) { return lc_(a.email); });
}
function meetList_(me) {
  const att = readAll_('Attendance'), all = readAll_('Meetings').sort(function (a, b) { return String(b.starts_at).localeCompare(String(a.starts_at)); });
  const mine = lc_(me.email);
  const rows = all.filter(function (m) { return meetCanManage_(me) || meetAudience_(m).indexOf(mine) >= 0; }).map(function (m) {
    const a = att.filter(function (x) { return x.meeting_id === m.id; });
    const myA = a.filter(function (x) { return x.email === mine; })[0];
    return Object.assign({}, m, { my_status: myA ? myA.status : '', marked: a.length, audience_size: meetAudience_(m).length, _row: undefined });
  });
  return { ok: true, rows: rows, statuses: MEET_STATUSES, canManage: meetCanManage_(me), stats: attendanceStats_(mine),
    departments: readAll_('Departments').map(function (d) { return { id: d.id, name: d.name }; }),
    people: readAll_('Admins').filter(function (a) { return truthy_(a.active); }).map(function (a) { return { email: lc_(a.email), name: a.name, department_id: a.department_id }; }) };
}
function attendanceStats_(email) {
  const a = readAll_('Attendance').filter(function (x) { return x.email === email; });
  const c = {}; MEET_STATUSES.forEach(function (s) { c[s] = a.filter(function (x) { return x.status === s; }).length; });
  const counted = c.Present + c.Late + c.Absent + c.Excused;
  const months = {};
  const meets = {}; readAll_('Meetings').forEach(function (m) { meets[m.id] = m; });
  a.forEach(function (x) { const m = meets[x.meeting_id]; if (!m || x.status === 'N.A.') return; const k = String(m.starts_at).slice(0, 7);
    months[k] = months[k] || { attended: 0, total: 0 }; months[k].total++; if (x.status !== 'Absent') months[k].attended++; });
  return { counts: c, rate: counted ? Math.round((c.Present + c.Late + c.Excused) / counted * 100) : null, total: counted,
    months: Object.keys(months).sort().slice(-6).map(function (k) { return { month: k, rate: Math.round(months[k].attended / months[k].total * 100) }; }) };
}
function meetSave_(me, b) {
  if (!meetCanManage_(me)) throw new Error('Only the Organizer and department heads can create meetings.');
  const title = String(b.title || '').trim().slice(0, 160);
  if (!title || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(b.starts_at || '')) throw new Error('Add a title, date and time.');
  let aud = [].concat(b.audience || []).map(String).filter(String);
  if (!aud.length || aud.indexOf('all') >= 0) aud = ['all'];
  if (me.role === 'lead' && me.department_id && aud[0] === 'all') aud = ['dept:' + me.department_id];
  const minutes = Math.min(480, Math.max(10, parseInt(b.minutes, 10) || 60));
  const rec = { title: title, starts_at: b.starts_at, minutes: String(minutes), location: String(b.location || '').slice(0, 300), link: String(b.link || '').slice(0, 500),
    agenda: String(b.agenda || '').slice(0, 4000), audience: aud.join(','), updated_at: now_() };
  let id = b.id, existing = id ? findRow_('Meetings', id) : null;
  if (id && !existing) throw new Error('Meeting not found.');
  const start = new Date(b.starts_at + ':00+05:30'), end = new Date(start.getTime() + minutes * 60000);
  const guests = meetAudience_(rec);
  if (b.meet && !rec.link) {
    try { const ev = recCalendar_(title, rec.agenda || 'TEDxThaltej Youth team meeting', start, end, guests.slice(0, 200), existing && existing.event_id); rec.link = ev.meet; rec.event_id = ev.id; }
    catch (e) { Logger.log('meet calendar: ' + e); }
  }
  if (existing) updateRow_('Meetings', id, rec);
  else { id = newId_('MT'); appendRow_('Meetings', Object.assign({ id: id, created_by: lc_(me.email), created_at: now_(), event_id: rec.event_id || '' }, rec)); }
  if (b.notify !== false) {
    const when = Utilities.formatDate(start, 'Asia/Kolkata', "EEEE, d MMMM 'at' h:mm a") + ' IST';
    guests.slice(0, 200).forEach(function (e) {
      mail_(e, (existing ? 'Meeting updated: ' : 'Meeting: ') + title + ' · ' + when, emailShell_(existing ? 'A meeting has changed.' : 'You are invited to a meeting.',
        '<p><b>' + esc_(title) + '</b><br>' + esc_(when) + ' · ' + minutes + ' minutes' + (rec.location ? '<br>📍 ' + esc_(rec.location) : '') + '</p>' +
        (rec.link ? '<p><a href="' + esc_(rec.link) + '" style="display:inline-block;background:#EB0028;color:#fff;padding:10px 20px;border-radius:30px;text-decoration:none;font-weight:700">Join the meeting</a></p>' : '') +
        (rec.agenda ? '<p>' + esc_(rec.agenda).replace(/\n/g, '<br>') + '</p>' : '')));
    });
  }
  audit_(me.email, existing ? 'meeting updated' : 'meeting created', id + ' ' + title);
  return { ok: true, id: id, link: rec.link };
}
function meetRemove_(me, id) {
  if (!meetCanManage_(me)) throw new Error('You can’t delete meetings.');
  const m = findRow_('Meetings', id);
  if (!m) throw new Error('Meeting not found.');
  if (me.role !== 'super' && lc_(m.created_by) !== lc_(me.email)) throw new Error('Only the person who created it can delete it.');
  withLock_(function () {
    const s = sh_('Attendance'), rows = readAll_('Attendance');
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i].meeting_id === id) s.deleteRow(rows[i]._row);
    deleteRow_('Meetings', id);
  });
  try { if (m.event_id) { const ev = CalendarApp.getDefaultCalendar().getEventById(m.event_id); if (ev) ev.deleteEvent(); } } catch (e) { Logger.log(e); }
  if (m.starts_at > now_().slice(0, 16)) meetAudience_(m).slice(0, 200).forEach(function (e) {
    mail_(e, 'Cancelled: ' + m.title, emailShell_('A meeting was cancelled.', '<p><b>' + esc_(m.title) + '</b> on ' + esc_(String(m.starts_at).replace('T', ' at ')) + ' has been cancelled.</p>'));
  });
  return { ok: true };
}
function meetAttendance_(me, id) {
  if (!meetCanManage_(me)) throw new Error('Only the Organizer and department heads mark attendance.');
  const m = findRow_('Meetings', id);
  if (!m) throw new Error('Meeting not found.');
  const att = readAll_('Attendance').filter(function (x) { return x.meeting_id === id; });
  const people = readAll_('Admins').filter(function (a) { return truthy_(a.active); });
  return { ok: true, meeting: m, statuses: MEET_STATUSES, rows: meetAudience_(m).map(function (e) {
    const a = att.filter(function (x) { return x.email === e; })[0], p = people.filter(function (x) { return lc_(x.email) === e; })[0] || {};
    return { email: e, name: p.name || e, status: a ? a.status : '' }; }) };
}
function meetMark_(me, id, marks) {
  if (!meetCanManage_(me)) throw new Error('Only the Organizer and department heads mark attendance.');
  const m = findRow_('Meetings', id);
  if (!m) throw new Error('Meeting not found.');
  const aud = meetAudience_(m);
  withLock_(function () {
    Object.keys(marks || {}).forEach(function (e) {
      const st = marks[e]; e = lc_(e);
      if (aud.indexOf(e) < 0 || MEET_STATUSES.indexOf(st) < 0) return;
      const key = id + '|' + e, row = { key: key, meeting_id: id, email: e, status: st, marked_by: lc_(me.email), marked_at: now_() };
      if (findRow_('Attendance', key)) updateRow_('Attendance', key, row); else appendRow_('Attendance', row);
    });
  });
  audit_(me.email, 'attendance marked', id);
  return { ok: true };
}

// ───────────────────────────── AWARDS ─────────────────────────────
function awList_(me) {
  return { ok: true, types: AWARD_TYPES, canGrant: me.role === 'super', rows: readAll_('Awards').reverse(),
    people: me.role === 'super' ? readAll_('Admins').filter(function (a) { return truthy_(a.active); }).map(function (a) { return { email: lc_(a.email), name: a.name }; }) : [] };
}
function awGrant_(me, b) {
  if (me.role !== 'super') throw new Error('Awards are granted by the Organizer (Article 4.2.2(g)).');
  const a = findAdmin_(b.email);
  if (!a) throw new Error('Choose a member.');
  const award = AWARD_TYPES.indexOf(b.award) >= 0 ? b.award : String(b.award || '').trim().slice(0, 80);
  const citation = String(b.citation || '').trim().slice(0, 1500);
  if (!award || !citation) throw new Error('Choose the award and write the citation.');
  const ed = currentEdition_(readAll_('Editions'));
  const rec = { id: newId_('AW'), email: lc_(a.email), name: a.name, award: award, citation: citation, awarded_by: lc_(me.email), awarded_at: now_(), edition_id: ed ? ed.id : '', doc_id: '' };
  appendRow_('Awards', rec);
  if (b.certificate) {
    try { const r = regIssue_(me, { type: 'cert_award', fields: { recipient_name: a.name, recipient_email: lc_(a.email), award: award, line: citation, date_line: ed ? ed.title : '' }, send: false }); updateRow_('Awards', rec.id, { doc_id: r.id }); }
    catch (e) { Logger.log('award certificate: ' + e); }
  }
  mail_(a.email, 'You have received the ' + award + ' 🏆', emailShell_('Congratulations, ' + esc_(String(a.name).split(' ')[0]) + '!',
    '<p>You have been awarded the <b>' + esc_(award) + '</b>.</p><p style="font-style:italic">“' + esc_(citation) + '”</p><p>It now shows on your profile in the Team Portal.</p>'));
  audit_(me.email, 'award granted', rec.id + ' ' + award + ' → ' + a.email);
  return { ok: true };
}
function awRevoke_(me, id) {
  if (me.role !== 'super') throw new Error('Only the Organizer can revoke awards.');
  deleteRow_('Awards', id);
  return { ok: true };
}

// ───────────────────────────── GRIEVANCES ─────────────────────────────
function grvList_(me) {
  const all = readAll_('Grievances'), msgs = readAll_('GrievanceMsgs');
  const rows = all.filter(function (g) { return me.role === 'super' || g.email === lc_(me.email); }).reverse().map(function (g) {
    const m = msgs.filter(function (x) { return x.case_id === g.id; });
    return Object.assign({}, g, { messages: m.length, last_at: m.length ? m[m.length - 1].created_at : g.created_at, _row: undefined });
  });
  return { ok: true, rows: rows, statuses: GRV_STATUSES, categories: GRV_CATEGORIES, isAdmin: me.role === 'super' };
}
function grvNew_(me, b) {
  const subject = String(b.subject || '').trim().slice(0, 160), body = String(b.body || '').trim().slice(0, 6000);
  if (!subject || !body) throw new Error('Add a subject and describe the concern.');
  rateLimit_('grv_' + lc_(me.email), 5, 86400);
  const year = now_().slice(0, 4), n = readAll_('Grievances').filter(function (g) { return String(g.id).indexOf('GRV-' + year) === 0; }).length + 1;
  const id = 'GRV-' + year + '-' + ('000' + n).slice(-4);
  withLock_(function () {
    appendRow_('Grievances', { id: id, email: lc_(me.email), name: me.name || me.email, subject: subject, category: GRV_CATEGORIES.indexOf(b.category) >= 0 ? b.category : 'Other',
      status: 'Open', created_at: now_(), updated_at: now_() });
    appendRow_('GrievanceMsgs', { id: newId_('GM'), case_id: id, from_email: lc_(me.email), from_name: me.name || me.email, body: body, links: String(b.links || '').slice(0, 1000), created_at: now_() });
  });
  mail_(CONFIG.SUPER_ADMIN_EMAIL, 'New grievance ' + id + ': ' + subject, emailShell_('A grievance was filed.', '<p>Case <b>' + id + '</b> from ' + esc_(me.name || me.email) + '.</p><p><a href="' + CONFIG.ADMIN_URL + '#grievances">Open it in the portal</a></p>'));
  mail_(me.email, 'Your case ' + id + ' is open', emailShell_('We have your concern.', '<p>Your case ID is <b>' + id + '</b>. You will get a reply in the Team Portal, where you can follow up any time.</p>'));
  return { ok: true, id: id };
}
function grvThread_(me, id) {
  const g = findRow_('Grievances', id);
  if (!g || (me.role !== 'super' && g.email !== lc_(me.email))) throw new Error('Case not found.');
  return { ok: true, case: g, messages: readAll_('GrievanceMsgs').filter(function (m) { return m.case_id === id; }), statuses: GRV_STATUSES, isAdmin: me.role === 'super' };
}
function grvReply_(me, b) {
  const g = findRow_('Grievances', b.id);
  if (!g || (me.role !== 'super' && g.email !== lc_(me.email))) throw new Error('Case not found.');
  if (g.status === 'Closed' && me.role !== 'super') throw new Error('This case is closed. Ask to reopen it.');
  const body = String(b.body || '').trim().slice(0, 6000);
  if (!body) throw new Error('Write a reply.');
  appendRow_('GrievanceMsgs', { id: newId_('GM'), case_id: g.id, from_email: lc_(me.email), from_name: me.name || me.email, body: body, links: String(b.links || '').slice(0, 1000), created_at: now_() });
  const patch = { updated_at: now_() };
  if (me.role === 'super') { if (GRV_STATUSES.indexOf(b.status) >= 0) patch.status = b.status; else if (g.status === 'Open') patch.status = 'Under review'; }
  else if (g.status === 'Waiting for member') patch.status = 'Under review';
  updateRow_('Grievances', g.id, patch);
  const to = me.role === 'super' ? g.email : CONFIG.SUPER_ADMIN_EMAIL;
  mail_(to, 'Reply on case ' + g.id, emailShell_('There is a reply on case ' + g.id + '.', '<p><b>' + esc_(g.subject) + '</b></p><p><a href="' + CONFIG.ADMIN_URL + '#grievances">Read it in the Team Portal</a></p>'));
  return { ok: true };
}
function grvStatus_(me, id, status) {
  const g = findRow_('Grievances', id);
  if (!g) throw new Error('Case not found.');
  const reopen = status === 'Open' && g.email === lc_(me.email) && ['Resolved', 'Closed'].indexOf(g.status) >= 0;
  if (me.role !== 'super' && !reopen) throw new Error('Only the Organizer can change the status.');
  if (GRV_STATUSES.indexOf(status) < 0) throw new Error('Unknown status.');
  updateRow_('Grievances', id, { status: status, updated_at: now_() });
  appendRow_('GrievanceMsgs', { id: newId_('GM'), case_id: id, from_email: 'system', from_name: 'System', body: 'Status changed to ' + status + ' by ' + (me.name || me.email) + '.', links: '', created_at: now_() });
  return { ok: true };
}

// ───────────────────────────── LOCKS & MAINTENANCE ─────────────────────────────
const LOCK_TABS = { admins: 'Admins', speakers: 'Speakers', stewards: 'Stewards' };
function lockActive_(row) { return !!(row && row.locked_until && row.locked_until > now_()); }
function lockMessage_(row) {
  return 'Your access is paused until ' + String(row.locked_until).replace('T', ' ').slice(0, 16) + ' IST' + (row.lock_reason ? ' (' + row.lock_reason + ')' : '') + '. Please contact the team if you think this is a mistake.';
}
function lockSet_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer can lock access.');
  const tab = LOCK_TABS[b.module];
  if (!tab) throw new Error('Unknown account type.');
  const row = findRow_(tab, b.id);
  if (!row) throw new Error('Account not found.');
  if (tab === 'Admins' && lc_(b.id) === lc_(me.email)) throw new Error('You can’t lock yourself out.');
  let until = '';
  if (b.until) { if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(b.until)) throw new Error('Choose until when.'); until = b.until + ':00'; }
  updateRow_(tab, b.id, { locked_until: until, lock_reason: until ? String(b.reason || '').slice(0, 200) : '' });
  audit_(me.email, until ? 'access locked' : 'access unlocked', tab + ' ' + b.id + (until ? ' until ' + until : ''));
  return { ok: true };
}
function maintenanceOn_() {
  const c = CacheService.getScriptCache(), hit = c.get('maint');
  if (hit !== null) return hit === '1';
  const on = truthy_(settingsMap_().maintenance_mode);
  c.put('maint', on ? '1' : '0', 60);
  return on;
}
