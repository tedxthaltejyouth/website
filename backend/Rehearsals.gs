/**
 * Speaker rehearsals.
 * The speaker's Ambassador (or anyone with Speakers edit access) schedules a rehearsal: online with a Google Meet link,
 * or in person at a venue. The speaker gets a calendar invite and an email, sees it in the Speaker Portal, and can
 * confirm or ask for another time. After the rehearsal the Ambassador marks it done and leaves notes for the speaker.
 */
const REH_TYPES = ['Online run-through', 'In person', 'Full dress rehearsal', 'Tech check'];
const REH_STATUSES = ['Scheduled', 'Done', 'Missed', 'Cancelled'];

function rehFor_(speakerId) {
  return readAll_('Rehearsals').filter(function (r) { return r.speaker_id === speakerId; })
    .sort(function (a, b) { return String(a.starts_at).localeCompare(String(b.starts_at)); });
}
function rehPublic_(r) {
  return { id: r.id, type: r.type, starts_at: r.starts_at, minutes: r.minutes, location: r.location, meet_link: r.meet_link, agenda: r.agenda,
    status: r.status, speaker_reply: r.speaker_reply, speaker_note: r.speaker_note, notes: r.notes, created_by: r.created_by, updated_at: r.updated_at };
}

/** Portal: list for one speaker */
function rehList_(me, speakerId) {
  const sp = findRow_('Speakers', speakerId);
  if (!sp || !spkCanSee_(me, sp)) throw new Error('Speaker not found.');
  return { ok: true, rows: rehFor_(speakerId).map(rehPublic_), types: REH_TYPES, statuses: REH_STATUSES, canEdit: spkCanReview_(me, sp),
    people: readAll_('Admins').filter(function (a) { return truthy_(a.active); }).map(function (a) { return { email: lc_(a.email), name: a.name }; }) };
}

/** Portal: create or move a rehearsal. b: {speaker_id, id?, type, date, time, minutes, mode:'online'|'venue', location, agenda, team:[emails]} */
function rehSave_(me, b) {
  const sp = findRow_('Speakers', b.speaker_id);
  if (!sp || !spkCanReview_(me, sp)) throw new Error('Only this speaker’s Ambassador or the speakers team can schedule rehearsals.');
  if (!isEmail_(sp.email)) throw new Error('Add the speaker’s email first.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date || '') || !/^\d{2}:\d{2}$/.test(b.time || '')) throw new Error('Choose a date and a time.');
  const type = REH_TYPES.indexOf(b.type) >= 0 ? b.type : REH_TYPES[0];
  const minutes = Math.min(240, Math.max(10, parseInt(b.minutes, 10) || 30));
  const start = new Date(b.date + 'T' + b.time + ':00+05:30');
  if (start.getTime() < Date.now() - 60000) throw new Error('That time has already passed.');
  const end = new Date(start.getTime() + minutes * 60000);
  const online = b.mode !== 'venue';
  const location = String(b.location || '').slice(0, 300);
  if (!online && !location) throw new Error('Add the venue for an in-person rehearsal.');
  const team = [lc_(me.email)].concat([].concat(b.team || []).map(lc_).filter(isEmail_)).filter(function (e, i, a) { return a.indexOf(e) === i; }).slice(0, 10);
  const existing = b.id ? findRow_('Rehearsals', b.id) : null;
  if (b.id && (!existing || existing.speaker_id !== sp.id)) throw new Error('Rehearsal not found.');
  const title = 'Rehearsal · ' + sp.name + ' · ' + type;
  const desc = 'TEDxThaltej Youth speaker rehearsal (' + type + ').\nSpeaker: ' + sp.name + (online ? '' : '\nVenue: ' + location) +
    (b.agenda ? '\n\nWhat we will work on:\n' + String(b.agenda).slice(0, 1500) : '');
  let ev = { id: existing ? existing.event_id : '', meet: existing ? existing.meet_link : '', via: '' };
  try {
    ev = online ? recCalendar_(title, desc, start, end, [sp.email].concat(team), existing && existing.event_id)
      : rehVenueEvent_(title, desc, start, end, [sp.email].concat(team), location, existing && existing.event_id);
  } catch (e) { Logger.log('Calendar failed: ' + e); }
  const row = { speaker_id: sp.id, type: type, starts_at: b.date + 'T' + b.time, minutes: String(minutes), location: online ? 'Online' : location,
    meet_link: online ? ev.meet : '', event_id: ev.id || '', agenda: String(b.agenda || '').slice(0, 2000), status: 'Scheduled',
    speaker_reply: '', speaker_note: '', team: team.join(','), updated_at: now_() };
  let id = b.id;
  withLock_(function () {
    if (existing) updateRow_('Rehearsals', id, row);
    else { id = newId_('RH'); appendRow_('Rehearsals', Object.assign({ id: id, notes: '', created_by: lc_(me.email), created_at: now_() }, row)); }
  });
  const when = Utilities.formatDate(start, 'Asia/Kolkata', "EEEE, d MMMM 'at' h:mm a") + ' IST';
  mail_(sp.email, (existing ? 'Rehearsal moved: ' : 'Rehearsal scheduled: ') + when, emailShell_((existing ? 'Your rehearsal has moved.' : 'Your rehearsal is scheduled.'),
    '<p>Hi ' + esc_(String(sp.name).split(' ')[0]) + ', your <b>' + esc_(type.toLowerCase()) + '</b> is on <b>' + esc_(when) + '</b> (' + minutes + ' minutes).</p>' +
    (online ? (row.meet_link ? '<p><a href="' + row.meet_link + '" style="display:inline-block;background:#EB0028;color:#fff;padding:12px 22px;border-radius:30px;text-decoration:none;font-weight:700">Join with Google Meet</a></p>' : '<p>The joining link will be shared with you.</p>')
      : '<p><b>Venue:</b> ' + esc_(location) + '</p>') +
    (row.agenda ? '<p><b>What we will work on</b><br>' + esc_(row.agenda).replace(/\n/g, '<br>') + '</p>' : '') +
    '<p>Please confirm in your <a href="' + CONFIG.SITE_URL + '/speaker">Speaker Portal</a>, or ask for another time there.</p>'));
  audit_(me.email, existing ? 'move rehearsal' : 'schedule rehearsal', sp.id + ' ' + row.starts_at);
  return { ok: true, id: id, meet_link: row.meet_link };
}

function rehVenueEvent_(title, desc, start, end, guests, location, existingId) {
  const cal = CalendarApp.getDefaultCalendar();
  let e = null;
  if (existingId) { try { e = cal.getEventById(existingId); } catch (x) { e = null; } }
  if (e) { e.setTime(start, end); e.setLocation(location); guests.forEach(function (g) { try { e.addGuest(g); } catch (x) { /* already a guest */ } }); }
  else e = cal.createEvent(title, start, end, { description: desc, location: location, guests: guests.join(','), sendInvites: true });
  return { id: e.getId(), meet: '', via: 'calendar-basic' };
}

/** Portal: mark done / missed / cancelled, with notes for the speaker */
function rehUpdate_(me, b) {
  const r = findRow_('Rehearsals', b.id);
  if (!r) throw new Error('Rehearsal not found.');
  const sp = findRow_('Speakers', r.speaker_id);
  if (!sp || !spkCanReview_(me, sp)) throw new Error('Only this speaker’s Ambassador can update the rehearsal.');
  if (REH_STATUSES.indexOf(b.status) < 0) throw new Error('Choose a status.');
  const notes = String(b.notes || '').slice(0, 5000);
  updateRow_('Rehearsals', r.id, { status: b.status, notes: notes, updated_at: now_() });
  if (b.status === 'Cancelled') {
    try { if (r.event_id) { const ev = CalendarApp.getDefaultCalendar().getEventById(r.event_id); if (ev) ev.deleteEvent(); } } catch (e) { Logger.log(e); }
    mail_(sp.email, 'Rehearsal cancelled', emailShell_('Your rehearsal is cancelled.', '<p>The rehearsal on <b>' + esc_(String(r.starts_at).replace('T', ' at ')) + '</b> has been cancelled.' +
      (notes ? '</p><p>' + esc_(notes).replace(/\n/g, '<br>') : '') + '</p><p>Your Ambassador will set a new time with you.</p>'));
  } else if (b.status === 'Done' && notes && b.notify !== false) {
    mail_(sp.email, 'Notes from your rehearsal', emailShell_('Notes from your rehearsal.',
      '<p>' + esc_(notes).replace(/\n/g, '<br>') + '</p><p>You can always find these in your <a href="' + CONFIG.SITE_URL + '/speaker">Speaker Portal</a>.</p>'));
  }
  audit_(me.email, 'rehearsal ' + b.status.toLowerCase(), r.id);
  return { ok: true };
}

/** Speaker Portal */
function rehSpeakerList_(sp) {
  return { ok: true, rows: rehFor_(sp.id).filter(function (r) { return r.status !== 'Cancelled'; }).map(rehPublic_) };
}
function rehSpeakerReply_(sp, b) {
  const r = findRow_('Rehearsals', b.id);
  if (!r || r.speaker_id !== sp.id) throw new Error('Rehearsal not found.');
  if (r.status !== 'Scheduled') throw new Error('This rehearsal is no longer open.');
  if (['Confirmed', 'Needs another time'].indexOf(b.reply) < 0) throw new Error('Choose a reply.');
  const note = String(b.note || '').slice(0, 1000);
  if (b.reply === 'Needs another time' && !note) throw new Error('Tell your Ambassador which times work for you.');
  updateRow_('Rehearsals', r.id, { speaker_reply: b.reply, speaker_note: note, updated_at: now_() });
  String(r.team || sp.ambassador_email || '').split(',').filter(isEmail_).forEach(function (e) {
    mail_(e, sp.name + (b.reply === 'Confirmed' ? ' confirmed the rehearsal' : ' needs another rehearsal time'),
      emailShell_(esc_(sp.name) + (b.reply === 'Confirmed' ? ' will be there.' : ' needs another time.'),
        '<p>Rehearsal: <b>' + esc_(String(r.starts_at).replace('T', ' at ')) + '</b> · ' + esc_(r.type) + '</p>' + (note ? '<p>“' + esc_(note) + '”</p>' : '') +
        '<p><a href="' + CONFIG.ADMIN_URL + '#speakers">Open the speaker in the Team Portal</a></p>'));
  });
  return { ok: true };
}
