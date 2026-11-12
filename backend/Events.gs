/**
 * Side events (workshops, meetups, screenings…) with their own page at /events/?e=<slug>.
 *
 *  • Registration: on this site (name, email, phone + optional fields), or an outside link, or none.
 *  • Feedback: the portal makes a feedback link plus a ready email (subject, body, all registrant emails) to copy into
 *    your own mail. Nothing is sent automatically. The feedback form asks for an NPS score (0–10) and two short answers.
 *  • Privacy: 7 days after an event ends, its registrations and written feedback are deleted. Only the NPS numbers
 *    are kept (on the event and in the NpsLog tab). A daily trigger does this; the portal also runs it when opened.
 */
const EVT_EXTRA = { institution: 'School / college / organisation', age: 'Age', city: 'City', grade: 'Class / year' };
const EVT_KEEP_DAYS = 7;

function evtSlug_(title, id) {
  return (String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'event') + '-' + id.slice(-4).toLowerCase();
}
function evtPurgeAt_(ev) {
  const end = new Date((ev.ends_at || ev.starts_at) + ':00+05:30');
  return Utilities.formatDate(new Date(end.getTime() + EVT_KEEP_DAYS * 86400000), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss");
}
function evtState_(ev) {
  const t = now_(), start = ev.starts_at + ':00', end = (ev.ends_at || ev.starts_at) + ':00';
  return t < start ? 'upcoming' : t <= end ? 'live' : 'past';
}
function evtCounts_(id) {
  return { regs: readAll_('EventRegs').filter(function (r) { return r.event_id === id; }).length,
    feedback: readAll_('EventFeedback').filter(function (r) { return r.event_id === id; }).length };
}
function npsOf_(scores) {
  const n = scores.length;
  if (!n) return { responses: 0, promoters: 0, passives: 0, detractors: 0, nps: '', avg: '' };
  const pro = scores.filter(function (s) { return s >= 9; }).length, det = scores.filter(function (s) { return s <= 6; }).length;
  return { responses: n, promoters: pro, passives: n - pro - det, detractors: det, nps: Math.round((pro - det) / n * 100),
    avg: Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / n * 10) / 10 };
}

// ───────────────────────────── PUBLIC ─────────────────────────────
function evtPublic_(ev) {
  const st = evtState_(ev), c = ev.purged_at ? { regs: 0 } : evtCounts_(ev.id);
  const cap = parseInt(ev.capacity, 10) || 0;
  return { id: ev.id, slug: ev.slug, title: ev.title, subtitle: ev.subtitle, banner_url: ev.banner_url, starts_at: ev.starts_at, ends_at: ev.ends_at,
    venue: ev.venue, map_url: ev.map_url, description: ev.description, agenda: safeJson_(ev.agenda_json, []), host: ev.host,
    reg_mode: ev.reg_mode, reg_link: ev.reg_mode === 'link' ? ev.reg_link : '', extra_fields: String(ev.extra_fields || '').split(',').filter(function (f) { return EVT_EXTRA[f]; }),
    reg_open: ev.reg_mode === 'site' && truthy_(ev.reg_open) && st === 'upcoming' && !ev.purged_at && (!cap || c.regs < cap),
    seats_left: cap ? Math.max(0, cap - c.regs) : null, state: st,
    nps: ev.purged_at ? ev.nps_score : '' };
}

function eventsFeed_() {
  const cache = CacheService.getScriptCache(), hit = cache.get('events');
  if (hit) return JSON.parse(hit);
  const out = { ok: true, events: readAll_('SideEvents').filter(pub_).map(evtPublic_).sort(function (a, b) { return String(a.starts_at).localeCompare(String(b.starts_at)); }) };
  cache.put('events', JSON.stringify(out), 120);
  return out;
}

function eventsHandle_(a, d) {
  if (a === 'register') return evtRegister_(d);
  if (a === 'feedbackInfo') return evtFeedbackInfo_(d.slug, d.t);
  if (a === 'feedback') return evtFeedback_(d);
  throw new Error('Unknown action');
}
function evtBySlug_(slug) {
  return readAll_('SideEvents').filter(function (e) { return e.slug === String(slug || '') && pub_(e); })[0] || null;
}

function evtRegister_(b) {
  if (b.website) return { ok: true };
  const ev = evtBySlug_(b.slug);
  if (!ev) throw new Error('Event not found.');
  const P = evtPublic_(ev);
  if (!P.reg_open) throw new Error(P.state !== 'upcoming' ? 'Registration for this event has closed.' : P.seats_left === 0 ? 'All seats are taken. Thank you for your interest!' : 'Registration is not open.');
  const f = clean_(b, { name: 100, email: 120, phone: 30, institution: 150, age: 3, city: 60, grade: 40 });
  if (!f.name || !isEmail_(f.email)) throw new Error('Please enter your name and a valid email.');
  if (!/^\+?\d{10,15}$/.test(String(f.phone).replace(/[\s\-().]/g, ''))) throw new Error('Please enter a valid phone number.');
  if (!b.consent) throw new Error('Please tick the box to agree to how we use your details.');
  rateLimit_('evr_' + f.email, 5, 3600);
  return withLock_(function () {
    const regs = readAll_('EventRegs').filter(function (r) { return r.event_id === ev.id; });
    if (regs.some(function (r) { return lc_(r.email) === f.email; })) throw new Error('You are already registered with this email.');
    const cap = parseInt(ev.capacity, 10) || 0;
    if (cap && regs.length >= cap) throw new Error('All seats are taken. Thank you for your interest!');
    const extra = String(ev.extra_fields || '').split(',');
    const rec = { id: newId_('ER'), event_id: ev.id, name: f.name, email: f.email, phone: f.phone, institution: extra.indexOf('institution') >= 0 ? f.institution : '',
      age: extra.indexOf('age') >= 0 ? f.age : '', city: extra.indexOf('city') >= 0 ? f.city : '', grade: extra.indexOf('grade') >= 0 ? f.grade : '', created_at: now_() };
    appendRow_('EventRegs', rec);
    CacheService.getScriptCache().remove('events');
    const when = evtWhen_(ev);
    mail_(f.email, 'You’re registered: ' + ev.title, emailShell_('See you there, ' + esc_(f.name.split(' ')[0]) + '!',
      '<p>You are registered for <b>' + esc_(ev.title) + '</b>.</p><p><b>When:</b> ' + esc_(when) + '<br><b>Where:</b> ' + esc_(ev.venue || 'To be announced') + '</p>' +
      '<p><a href="' + CONFIG.SITE_URL + '/events/?e=' + ev.slug + '">Event details and agenda</a></p>' +
      '<p style="color:#777;font-size:13px">We keep your registration details only until ' + EVT_KEEP_DAYS + ' days after the event, then delete them.</p>'));
    return { ok: true };
  });
}

function evtWhen_(ev) {
  const s = new Date(ev.starts_at + ':00+05:30');
  let t = Utilities.formatDate(s, 'Asia/Kolkata', "EEEE, d MMMM yyyy · h:mm a");
  if (ev.ends_at) {
    const e = new Date(ev.ends_at + ':00+05:30');
    t += ' – ' + (ev.ends_at.slice(0, 10) === ev.starts_at.slice(0, 10) ? Utilities.formatDate(e, 'Asia/Kolkata', 'h:mm a') : Utilities.formatDate(e, 'Asia/Kolkata', "d MMMM, h:mm a"));
  }
  return t + ' IST';
}

function evtFeedbackInfo_(slug, t) {
  const ev = evtBySlug_(slug);
  if (!ev || !t || t !== ev.feedback_token) throw new Error('This feedback link is not valid.');
  if (ev.purged_at || now_() > evtPurgeAt_(ev)) throw new Error('Feedback for this event has closed. Thank you!');
  if (evtState_(ev) === 'upcoming') throw new Error('Feedback opens when the event starts.');
  return { ok: true, title: ev.title, banner_url: ev.banner_url, when: evtWhen_(ev), closes: evtPurgeAt_(ev).slice(0, 10) };
}

function evtFeedback_(b) {
  if (b.website) return { ok: true };
  evtFeedbackInfo_(b.slug, b.t);
  const ev = evtBySlug_(b.slug);
  const nps = parseInt(b.nps, 10);
  if (!(nps >= 0 && nps <= 10)) throw new Error('Choose a score from 0 to 10.');
  const email = lc_(b.email);
  rateLimit_('evf_' + ev.id + '_' + (email || Utilities.getUuid().slice(0, 4)), 3, 3600);
  return withLock_(function () {
    if (email && readAll_('EventFeedback').some(function (r) { return r.event_id === ev.id && r.email === email; })) throw new Error('You have already shared feedback. Thank you!');
    appendRow_('EventFeedback', { id: newId_('EF'), event_id: ev.id, nps: String(nps), liked: String(b.liked || '').slice(0, 2000), improve: String(b.improve || '').slice(0, 2000),
      email: isEmail_(email) ? email : '', created_at: now_() });
    return { ok: true };
  });
}

// ───────────────────────────── PORTAL ─────────────────────────────
function evtMust_(me, write) {
  if (me.role === 'super') return;
  if (me.scopeList.indexOf('events') < 0) throw new Error('You don’t have access to side events.');
  if (write && me.role === 'viewer') throw new Error('You have view-only access to side events.');
}

function evtList_(me) {
  evtMust_(me, false);
  try { eventsPurge_(); } catch (e) { Logger.log(e); }
  const regs = readAll_('EventRegs'), fb = readAll_('EventFeedback');
  const rows = readAll_('SideEvents').map(function (ev) {
    const scores = fb.filter(function (f) { return f.event_id === ev.id; }).map(function (f) { return +f.nps; });
    const n = npsOf_(scores);
    return { id: ev.id, slug: ev.slug, title: ev.title, subtitle: ev.subtitle, banner_url: ev.banner_url, starts_at: ev.starts_at, ends_at: ev.ends_at, venue: ev.venue,
      map_url: ev.map_url, description: ev.description, agenda: safeJson_(ev.agenda_json, []), host: ev.host, reg_mode: ev.reg_mode, reg_link: ev.reg_link, reg_open: ev.reg_open,
      capacity: ev.capacity, extra_fields: ev.extra_fields, published: ev.published, state: evtState_(ev), purge_on: evtPurgeAt_(ev).slice(0, 10), purged_at: ev.purged_at,
      regs: regs.filter(function (r) { return r.event_id === ev.id; }).length, feedback: scores.length,
      nps: ev.purged_at ? ev.nps_score : n.nps, nps_responses: ev.purged_at ? ev.nps_responses : n.responses };
  }).sort(function (a, b) { return String(b.starts_at).localeCompare(String(a.starts_at)); });
  return { ok: true, rows: rows, extra: EVT_EXTRA, keepDays: EVT_KEEP_DAYS, siteUrl: CONFIG.SITE_URL,
    log: readAll_('NpsLog').reverse().slice(0, 50) };
}

function evtSave_(me, r) {
  evtMust_(me, true);
  const title = String(r.title || '').trim().slice(0, 140);
  if (!title) throw new Error('Add a title.');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(r.starts_at || '')) throw new Error('Add the start date and time.');
  if (r.ends_at && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(r.ends_at) || r.ends_at < r.starts_at)) throw new Error('The end must be after the start.');
  const mode = ['site', 'link', 'none'].indexOf(r.reg_mode) >= 0 ? r.reg_mode : 'site';
  if (mode === 'link' && !/^https?:\/\//.test(r.reg_link || '')) throw new Error('Add the registration link (starting with https://).');
  const agenda = [].concat(r.agenda || []).filter(function (x) { return x && (x.time || x.title); }).slice(0, 40).map(function (x) {
    return { time: String(x.time || '').slice(0, 20), title: String(x.title || '').slice(0, 140), detail: String(x.detail || '').slice(0, 500) };
  });
  const rec = { title: title, subtitle: String(r.subtitle || '').slice(0, 200), banner_url: String(r.banner_url || '').slice(0, 500), starts_at: r.starts_at,
    ends_at: r.ends_at || '', venue: String(r.venue || '').slice(0, 300), map_url: String(r.map_url || '').slice(0, 500), description: String(r.description || '').slice(0, 6000),
    agenda_json: JSON.stringify(agenda), host: String(r.host || '').slice(0, 140), reg_mode: mode, reg_link: mode === 'link' ? String(r.reg_link).slice(0, 500) : '',
    reg_open: truthy_(r.reg_open) ? 'TRUE' : 'FALSE', capacity: String(parseInt(r.capacity, 10) || ''),
    extra_fields: [].concat(r.extra_fields || []).filter(function (f) { return EVT_EXTRA[f]; }).join(','), published: truthy_(r.published) ? 'TRUE' : 'FALSE', updated_at: now_() };
  let id = r.id;
  withLock_(function () {
    if (id) { if (!findRow_('SideEvents', id)) throw new Error('Event not found.'); updateRow_('SideEvents', id, rec); }
    else {
      id = newId_('EV');
      appendRow_('SideEvents', Object.assign({ id: id, slug: evtSlug_(title, id), feedback_token: Utilities.getUuid().replace(/-/g, '').slice(0, 20), created_at: now_(),
        purged_at: '', nps_score: '', nps_responses: '', nps_promoters: '', nps_passives: '', nps_detractors: '' }, rec));
    }
  });
  CacheService.getScriptCache().remove('events');
  audit_(me.email, 'save side event', id + ' ' + title);
  return { ok: true, id: id, slug: findRow_('SideEvents', id).slug };
}

function evtRemove_(me, id) {
  evtMust_(me, true);
  const ev = findRow_('SideEvents', id);
  if (!ev) throw new Error('Event not found.');
  withLock_(function () {
    evtLogNps_(ev);
    evtDeleteData_(id);
    deleteRow_('SideEvents', id);
  });
  CacheService.getScriptCache().remove('events');
  audit_(me.email, 'delete side event', id + ' ' + ev.title);
  return { ok: true };
}

function evtRegs_(me, id) {
  evtMust_(me, false);
  const ev = findRow_('SideEvents', id);
  if (!ev) throw new Error('Event not found.');
  return { ok: true, rows: readAll_('EventRegs').filter(function (r) { return r.event_id === id; }), purge_on: evtPurgeAt_(ev).slice(0, 10), purged_at: ev.purged_at };
}

/** The feedback kit: link + an email to copy into your own mail app. Nothing is sent from here. */
function evtFeedbackKit_(me, id) {
  evtMust_(me, false);
  const ev = findRow_('SideEvents', id);
  if (!ev) throw new Error('Event not found.');
  const link = CONFIG.SITE_URL + '/events/feedback/?e=' + ev.slug + '&t=' + ev.feedback_token;
  const regs = readAll_('EventRegs').filter(function (r) { return r.event_id === id; });
  const fb = readAll_('EventFeedback').filter(function (r) { return r.event_id === id; });
  const subject = 'How was ' + ev.title + '? (1 minute)';
  const body = 'Hi,\n\nThank you for joining us at ' + ev.title + '. We would love to hear how it went for you. It takes about a minute:\n\n' + link +
    '\n\nThe link stays open until ' + evtPurgeAt_(ev).slice(0, 10) + '.\n\nWarm regards,\nTEDxThaltej Youth';
  return { ok: true, link: link, subject: subject, body: body, emails: regs.map(function (r) { return r.email; }), purge_on: evtPurgeAt_(ev).slice(0, 10), purged_at: ev.purged_at,
    nps: ev.purged_at ? { responses: ev.nps_responses, promoters: ev.nps_promoters, passives: ev.nps_passives, detractors: ev.nps_detractors, nps: ev.nps_score } : npsOf_(fb.map(function (f) { return +f.nps; })),
    responses: fb.map(function (f) { return { nps: f.nps, liked: f.liked, improve: f.improve, created_at: f.created_at }; }).reverse() };
}

// ───────────────────────────── 7-DAY DELETION ─────────────────────────────
function evtLogNps_(ev) {
  const scores = readAll_('EventFeedback').filter(function (f) { return f.event_id === ev.id; }).map(function (f) { return +f.nps; });
  const n = npsOf_(scores);
  if (!n.responses || ev.purged_at) return n;
  appendRow_('NpsLog', { event_id: ev.id, title: ev.title, event_date: String(ev.starts_at).slice(0, 10), responses: String(n.responses), promoters: String(n.promoters),
    passives: String(n.passives), detractors: String(n.detractors), nps: String(n.nps), avg: String(n.avg), scores: scores.join(','), logged_at: now_() });
  return n;
}
function evtDeleteData_(id) {
  ['EventRegs', 'EventFeedback'].forEach(function (tab) {
    const s = sh_(tab), rows = readAll_(tab);
    for (let i = rows.length - 1; i >= 0; i--) if (rows[i].event_id === id) s.deleteRow(rows[i]._row);
  });
}
/** Runs daily (trigger) and whenever the portal opens Side events. */
function eventsPurge_() {
  const t = now_();
  readAll_('SideEvents').filter(function (ev) { return !ev.purged_at && t > evtPurgeAt_(ev); }).forEach(function (ev) {
    withLock_(function () {
      const n = evtLogNps_(ev);
      evtDeleteData_(ev.id);
      updateRow_('SideEvents', ev.id, { purged_at: t, nps_score: String(n.nps), nps_responses: String(n.responses), nps_promoters: String(n.promoters),
        nps_passives: String(n.passives), nps_detractors: String(n.detractors), reg_open: 'FALSE' });
    });
    audit_('system', 'event data deleted after ' + EVT_KEEP_DAYS + ' days', ev.id + ' ' + ev.title + ' (NPS kept: ' + (ev.nps_score || 'none') + ')');
  });
  CacheService.getScriptCache().remove('events');
}

/** Daily housekeeping. setup() installs a trigger for this. */
function dailyMaintenance() {
  try { eventsPurge_(); } catch (e) { opsLog_('scheduled', 'Side-event purge failed', e.message); }
  try { opsBackup_(); } catch (e) { opsLog_('scheduled', 'Daily backup failed', e.message); }
  try { mailQueueRun_(); } catch (e) { opsLog_('scheduled', 'Email queue run failed', e.message); }
  try { cleanupAuto_(); } catch (e) { opsLog_('scheduled', 'Weekly clean-up failed', e.message); }
}
function installTriggers_() {
  const have = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  if (have.indexOf('dailyMaintenance') < 0) ScriptApp.newTrigger('dailyMaintenance').timeBased().everyDays(1).atHour(3).create();
  if (have.indexOf('opsHourly') < 0) ScriptApp.newTrigger('opsHourly').timeBased().everyHours(1).create();
}

// ───────────────────────────── IMAGES (banners, news) ─────────────────────────────
/** Saves an uploaded image to Drive (“TEDxThaltej Youth — Website Media”), shares it as view-only by link, returns a URL the site can show. */
function mediaUpload_(me, b) {
  if (me.role !== 'super' && me.scopeList.indexOf('events') < 0 && me.scopeList.indexOf('news') < 0) throw new Error('You can’t upload images.');
  const m = String(b.dataUrl || '').match(/^data:(image\/(png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw new Error('Choose a PNG, JPG, WebP or GIF image.');
  if (m[3].length > 7000000) throw new Error('That image is too large. Please use one under 5 MB.');
  const props = PropertiesService.getScriptProperties();
  let folder = null;
  try { folder = props.getProperty('MEDIA_FOLDER_ID') ? DriveApp.getFolderById(props.getProperty('MEDIA_FOLDER_ID')) : null; } catch (e) { folder = null; }
  if (!folder) { folder = DriveApp.createFolder('TEDxThaltej Youth — Website Media'); props.setProperty('MEDIA_FOLDER_ID', folder.getId()); }
  const name = String(b.name || 'image').replace(/[^\w.\- ]/g, '').slice(0, 80) || 'image';
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(m[3]), m[1], name));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  audit_(me.email, 'upload image', name);
  return { ok: true, url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w2000', id: file.getId() };
}
