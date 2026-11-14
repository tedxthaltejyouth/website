/**
 * Speaker Community (/community): every speaker, past and present, keeps a home with TEDxThaltej Youth.
 *  Joining (past speakers who were never on the portal):
 *    The Organizer creates one shared link (/community/#join=<token>, e.g. 7 days, up to 60 people). The speaker taps their
 *    name in the list (names come from the Speakers page), enters their email, gets a 6-digit code, and sets a password.
 *    If we already hold a different email for that speaker, the claim waits for the Organizer's approval.
 *    Joining subscribes them to speaker-community emails (they can switch off) and to the newsletter.
 *  Home: upcoming main and side events, share feedback / ideas / a testimonial, update their short profile,
 *    email preference, and connect Google sign-in (then "Sign in with Google" works on /community).
 *  Team Portal → Speaker community (Organizer, or anyone with the Speakers page): members, approvals, links, feedback,
 *    and "Email the speaker community" (members only, or also past speakers we have an email for), with an
 *    unsubscribe link in every email.
 *  Speakers of the current edition use /speaker for their talk; they can open /community too.
 */
const CM_OFFERS = ['Mentor this year’s speakers', 'Speak at a side event', 'Host or co-host a side event', 'Help curate talks or judge Ahmedabad Idea Search',
  'Introduce sponsors or partners', 'Volunteer on event day', 'Run a workshop for students'];
function cmConf_() {
  const s = settingsMap_();
  return { whatsapp: /^https:\/\/(chat\.whatsapp\.com|whatsapp\.com\/channel|wa\.me)\//.test(String(s.cm_whatsapp || '')) ? s.cm_whatsapp : '',
    whatsapp_note: String(s.cm_whatsapp_note || ''), approve_all: truthy_(s.cm_approve_all) };
}
function cmPhone_(v) {
  let p = String(v || '').replace(/[\s()-]/g, '');
  if (/^0\d{10}$/.test(p)) p = p.slice(1);
  if (/^\d{10}$/.test(p)) p = '+91' + p;
  if (/^91\d{10}$/.test(p)) p = '+' + p;
  if (!/^\+\d{8,15}$/.test(p)) throw new Error('Enter your WhatsApp number with country code, e.g. +91 98765 43210.');
  return p;
}
const CM_FEEDBACK_KINDS = ['Feedback on an event', 'An idea or suggestion', 'A testimonial we can share', 'I would like to help', 'Something else'];

function cmLinkByToken_(token) {
  if (!/^[a-f0-9]{48}$/.test(String(token || ''))) throw new Error('This link is not valid.');
  const h = sha_(token), L = readAll_('CommunityLinks').filter(function (x) { return x.token_hash === h; })[0];
  if (!L || L.status !== 'Active') throw new Error('This link has been closed. Ask the team for a new one.');
  if (L.expires < now_()) throw new Error('This link has expired. Ask the team for a new one.');
  if ((+L.uses || 0) >= (+L.max_uses || 0)) throw new Error('This link has been used by the maximum number of people. Ask the team for a new one.');
  return L;
}
function cmEditions_() { const m = {}; readAll_('Editions').forEach(function (e) { m[e.id] = e; }); return m; }
function cmEdLabel_(e) { if (!e) return ''; return [e.number ? 'Edition ' + e.number : '', String(e.date || '').slice(0, 4), e.theme || e.title].filter(String).join(' · '); }
function cmSideMap_() { const m = {}; readAll_('SideEvents').forEach(function (e) { m[e.id] = e; }); return m; }
function cmLabel_(s, eds, sides) {
  if (s.kind === 'salon') { const e = (sides || cmSideMap_())[s.side_event_id]; return 'Salon speaker' + (e ? ' · ' + e.title + ' · ' + String(e.starts_at).slice(0, 4) : ''); }
  return cmEdLabel_((eds || cmEditions_())[s.edition_id]);
}
function cmYear_(s, eds, sides) { return s.kind === 'salon' ? String(((sides || {})[s.side_event_id] || {}).starts_at || '').slice(0, 4) : String(((eds || {})[s.edition_id] || {}).date || '').slice(0, 4); }
function cmSlug_(s) {
  if (s.slug) return s.slug;
  const base = String(s.name || 'speaker').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'speaker';
  const used = {}; readAll_('Speakers').forEach(function (x) { if (x.slug) used[x.slug] = 1; });
  let slug = base, n = 2; while (used[slug]) slug = base + '-' + n++;
  updateRow_('Speakers', s.id, { slug: slug });
  return slug;
}
function cmJoined_(sp) { return !!(sp.hash && (truthy_(sp.portal_active) || sp.cm_status === 'Pending')); }
function cmCurrentId_() { const c = currentEdition_(readAll_('Editions')); return c ? c.id : ''; }

// ───────── public (prefix cm_) ─────────
function communityHandle_(a, d) {
  if (a === 'info') return cmInfo_(d.token);
  if (a === 'start') return cmStart_(d);
  if (a === 'verify') return cmVerify_(d);
  if (a === 'leave') return cmLeave_(d.t);
  if (a === 'gLogin') return cmGLogin_(d);
  if (a === 'public') return cmPublic_();
  return { ok: false, error: 'Unknown action.' };
}
function cmInfo_(token) {
  const L = cmLinkByToken_(token), eds = cmEditions_(), sides = cmSideMap_(), cur = cmCurrentId_();
  const people = readAll_('Speakers').filter(function (s) { return s.name && s.edition_id !== cur && (L.edition_id === 'salon' ? s.kind === 'salon' : L.edition_id ? s.edition_id === L.edition_id && s.kind !== 'salon' : true); })
    .map(function (s) { const e = eds[s.edition_id], se = sides[s.side_event_id]; return { id: s.id, name: s.name, edition: cmLabel_(s, eds, sides), salon: s.kind === 'salon', edition_sort: String(s.kind === 'salon' ? (se || {}).starts_at || '' : (e || {}).date || ''), talk: s.talk_title || '', photo: s.photo_url || '', joined: cmJoined_(s) }; })
    .sort(function (a, b) { return a.edition_sort < b.edition_sort ? 1 : a.edition_sort > b.edition_sort ? -1 : String(a.name).localeCompare(String(b.name)); });
  return { ok: true, people: people, expires: L.expires, google_client_id: gConf_().client_id };
}
function cmStart_(d) {
  const L = cmLinkByToken_(d.token), email = lc_(d.email);
  if (!isEmail_(email)) throw new Error('Enter a valid email address.');
  const sp = findRow_('Speakers', d.speaker_id); if (!sp || sp.edition_id === cmCurrentId_()) throw new Error('Choose your name from the list.');
  cmPhone_(d.phone);
  if (cmJoined_(sp)) throw new Error('This speaker has already joined. Sign in instead, or use “Forgot password”.');
  const other = spkByEmail_(email); if (other && other.id !== sp.id && cmJoined_(other)) throw new Error('That email is already used by another speaker account.');
  rateLimit_('cmstart_' + email, 5, 3600); rateLimit_('cmstartsp_' + sp.id, 8, 3600);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  CacheService.getScriptCache().put('cmc_' + sp.id + '_' + email, JSON.stringify({ h: hash_(code, email), n: 0, link: L.id }), 900);
  mail_(email, code + ' is your Speaker Community code', emailShell_('Your code', '<p>Hello ' + esc_(String(sp.name).split(' ')[0]) + ', use this code to join the TEDxThaltej Youth Speaker Community. It expires in 15 minutes.</p>' +
    '<p style="font-size:34px;letter-spacing:8px;font-weight:800;margin:22px 0">' + code + '</p><p>Didn’t ask for this? Ignore this email.</p>', { kicker: 'Speaker Community' }), { priority: 'high', private: true });
  return { ok: true, masked: sp.email && lc_(sp.email) !== email ? true : false };
}
function cmVerify_(d) {
  const L = cmLinkByToken_(d.token), email = lc_(d.email), sp = findRow_('Speakers', d.speaker_id);
  if (!sp) throw new Error('Choose your name from the list.');
  const cache = CacheService.getScriptCache(), key = 'cmc_' + sp.id + '_' + email, raw = cache.get(key);
  if (!raw) throw new Error('That code has expired. Ask for a new one.');
  const o = JSON.parse(raw);
  if (o.n >= 5 || hash_(String(d.code || '').trim(), email) !== o.h) { o.n++; cache.put(key, JSON.stringify(o), 900); throw new Error('That code is not right.'); }
  if (!aisPwOk_(d.password)) throw new Error(AIS_PW_RULE);
  if (String(d.password) !== String(d.password2 || d.password)) throw new Error('The two passwords do not match.');
  return withLock_(function () {
    const s = findRow_('Speakers', sp.id); if (cmJoined_(s)) throw new Error('This speaker has already joined. Sign in instead.');
    const L2 = cmLinkByToken_(d.token);
    cache.remove(key);
    const salt = Utilities.getUuid(), conf = cmConf_(), differ = !!(s.email && lc_(s.email) !== email), mismatch = differ || conf.approve_all;
    const phone = cmPhone_(d.phone);
    const up = { salt: salt, hash: hash_(String(d.password), salt), pw_version: String((parseInt(s.pw_version, 10) || 0) + 1), community: 'TRUE', cm_joined_at: now_(), cm_mail: 'TRUE',
      cm_token: Utilities.getUuid().replace(/-/g, ''), last_login: now_(), cm_phone: phone, cm_directory: 'TRUE' };
    if (mismatch) Object.assign(up, { cm_status: 'Pending', cm_claim_email: email, portal_active: 'FALSE' });
    else Object.assign(up, { email: email, cm_status: 'Active', portal_active: 'TRUE', stage: s.stage || 'Alumni' });
    updateRow_('Speakers', s.id, up);
    updateRow_('CommunityLinks', L2.id, { uses: String((+L2.uses || 0) + 1) });
    const ed = cmEditions_()[s.edition_id];
    const note = emailShell_((mismatch ? 'Approve: ' : 'Joined: ') + esc_(s.name), '<p><b>' + esc_(s.name) + '</b> (' + esc_(cmEdLabel_(ed)) + ') ' + (mismatch ? 'wants to join the Speaker Community with <b>' + esc_(email) + '</b> and WhatsApp ' + esc_(phone) + '.' + (differ ? ' We hold <b>' + esc_(s.email) + '</b> for them.' : '') + ' Please check it is really them, then approve.' : 'joined the Speaker Community with ' + esc_(email) + '.') + '</p><p><a href="' + CONFIG.ADMIN_URL + '#community">Open Speaker community</a></p>', { kicker: 'Speaker Community' });
    try { mail_(CONFIG.SUPER_ADMIN_EMAIL, (mismatch ? 'Approve speaker: ' : 'Speaker joined: ') + s.name, note, { noCopy: true }); } catch (e) { }
    if (mismatch) return { ok: true, pending: true };
    cmSubscribe_(email, s.name);
    cmWelcome_(findRow_('Speakers', s.id));
    audit_(email, 'speaker community joined', s.id);
    return spkSession_(findRow_('Speakers', s.id));
  });
}
function cmSubscribe_(email, name) {
  try { if (!findRow_('Subscribers', email)) appendRow_('Subscribers', { email: email, name: name, status: 'Active', source: 'speaker-community', token: subToken_(), created_at: now_(), confirmed_at: now_(), updated_at: now_(), last_sent: '' }); } catch (e) { Logger.log(e); }
}
function cmWelcome_(s) {
  try { mail_(s.email, 'Welcome to the TEDxThaltej Youth Speaker Community', emailShell_('Welcome back, ' + esc_(String(s.name).split(' ')[0]) + '.',
    '<p>You are now part of the <b>TEDxThaltej Youth Speaker Community</b>: everyone who has stood on our stage.</p>' +
    '<ul><li>Hear first about our next main event and side events</li><li>Share feedback, ideas and memories with the team</li><li>Stay connected with fellow speakers</li></ul>' +
    '<p><a href="' + CONFIG.SITE_URL + '/community/">Open your community home</a></p><p style="font-size:13px;color:#6B6455">You can connect your Google account there for one-tap sign-in, and switch community emails off at any time.</p>', { kicker: 'Speaker Community' })); } catch (e) { Logger.log(e); }
}
function cmLeave_(t) {
  t = String(t || '').replace(/[^a-f0-9]/g, ''); if (t.length < 20) throw new Error('This link is not valid.');
  const s = readAll_('Speakers').filter(function (x) { return x.cm_token === t; })[0]; if (!s) throw new Error('This link is not valid.');
  updateRow_('Speakers', s.id, { cm_mail: 'FALSE' });
  return { ok: true, name: String(s.name).split(' ')[0] };
}
function cmPublic_() {
  const cache = CacheService.getScriptCache(), hit = cache.get('cm_public'); if (hit) return JSON.parse(hit);
  const eds = cmEditions_(), sides = cmSideMap_();
  const yt = function (u) { const m = String(u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : ''; };
  const people = readAll_('Speakers').filter(function (s) { return truthy_(s.community) && truthy_(s.portal_active) && s.cm_public !== 'FALSE' && s.photo_url && String(s.bio || '').length >= 40 && !truthy_(s.under_18); })
    .map(function (s) {
      const e = eds[s.edition_id], se = sides[s.side_event_id];
      return { slug: cmSlug_(s), name: s.name, photo: s.photo_url, designation: s.designation || '', bio_line: s.bio_line || '', bio: s.bio || '', linkedin: s.linkedin || '', talk: s.talk_title || '',
        salon: s.kind === 'salon', label: cmLabel_(s, eds, sides), year: cmYear_(s, eds, sides),
        event: s.kind === 'salon' ? (se ? { title: se.title, date: String(se.starts_at).slice(0, 10), url: CONFIG.SITE_URL + '/events/' + (se.slug ? '#' + se.slug : '') } : null)
          : (e ? { title: (e.title || 'TEDxThaltej Youth') + (e.theme ? ': ' + e.theme : ''), date: String(e.date).slice(0, 10), url: CONFIG.SITE_URL + '/' + String(e.date).slice(0, 4) + '/' } : null),
        yt: yt(s.video_url) };
    }).sort(function (a, b) { return (a.salon - b.salon) || (a.year < b.year ? 1 : a.year > b.year ? -1 : String(a.name).localeCompare(String(b.name))); });
  const out = { ok: true, people: people };
  try { cache.put('cm_public', JSON.stringify(out), 900); } catch (e) { }
  return out;
}
function cmGLogin_(d) {
  const g = gVerify_(d.credential);
  const s = readAll_('Speakers').filter(function (x) { return x.google_sub === g.sub; })[0];
  if (!s) throw new Error('This Google account is not connected to a speaker account yet. Sign in with your email and password, then connect Google from your home page.');
  if (!truthy_(s.portal_active)) throw new Error('Your speaker account is paused. Please write to the team.');
  if (lockActive_(s)) throw new Error(lockMessage_(s));
  updateRow_('Speakers', s.id, { last_login: now_() });
  return spkSession_(s);
}

// ───────── signed-in speaker (via speakerHandle_) ─────────
function cmHome_(sp) {
  const eds = cmEditions_(), cur = currentEdition_(readAll_('Editions')), today = now_().slice(0, 10);
  const events = [];
  if (cur && String(cur.date).slice(0, 10) >= today) events.push({ kind: 'Main event', title: cur.title || 'TEDxThaltej Youth', theme: cur.theme || '', date: cur.date, venue: cur.venue || '', url: cur.page_url || CONFIG.SITE_URL });
  readAll_('SideEvents').filter(function (e) { return truthy_(e.published) && String(e.starts_at).slice(0, 10) >= today; })
    .sort(function (a, b) { return String(a.starts_at) < String(b.starts_at) ? -1 : 1; }).slice(0, 8)
    .forEach(function (e) { events.push({ id: e.id, kind: 'Side event', title: e.title, theme: e.subtitle || '', date: e.starts_at, venue: e.venue || '', url: CONFIG.SITE_URL + '/events/' + (e.slug ? '#' + e.slug : ''), open: truthy_(e.reg_open) }); });
  const members = readAll_('Speakers').filter(function (s) { return truthy_(s.community) && truthy_(s.portal_active); });
  const peers = members.filter(function (s) { return s.id !== sp.id; }).length;
  const rs = readAll_('CommunityRsvps'), mineR = {}, cnt = {};
  rs.forEach(function (r) { if (r.status !== 'Going') return; cnt[r.event_id] = (cnt[r.event_id] || 0) + 1; if (r.speaker_id === sp.id) mineR[r.event_id] = 1; });
  events.forEach(function (e) { if (e.id) { e.going = !!mineR[e.id]; e.count = cnt[e.id] || 0; } });
  const yt = function (u) { const m = String(u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : ''; };
  const directory = members.filter(function (s) { return s.cm_directory !== 'FALSE'; }).map(function (s) {
    return { id: s.id, name: s.name, edition: cmLabel_(s, eds, cmSideMap_()), salon: s.kind === 'salon', year: s.kind === 'salon' ? 'Salon' : String((eds[s.edition_id] || {}).date || '').slice(0, 4), talk: s.talk_title || '', designation: s.designation || '', bio_line: s.bio_line || '',
      linkedin: s.linkedin || '', photo: s.photo_url || '', yt: yt(s.video_url), me: s.id === sp.id }; }).sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
  const talks = readAll_('Speakers').filter(function (s) { return truthy_(s.published) && yt(s.video_url); }).map(function (s) {
    return { name: s.name, talk: s.talk_title || '', edition: cmLabel_(s, eds, cmSideMap_()), year: s.kind === 'salon' ? 'Salon' : String((eds[s.edition_id] || {}).date || '').slice(0, 4), yt: yt(s.video_url), url: s.video_url }; })
    .sort(function (a, b) { return a.year < b.year ? 1 : a.year > b.year ? -1 : 0; });
  const conf = cmConf_();
  const posts = readAll_('CommunityPosts').filter(function (p) { return p.status !== 'Hidden'; }).map(function (p) { return { id: p.id, title: p.title, body: p.body, link: p.link, link_label: p.link_label, pinned: truthy_(p.pinned), at: p.created_at }; })
    .sort(function (a, b) { return (b.pinned - a.pinned) || (a.at < b.at ? 1 : -1); }).slice(0, 12);
  const sides = cmSideMap_();
  return { ok: true, needs_profile: !(sp.photo_url && String(sp.bio || '').trim().length >= 40), me: { name: sp.name, edition: cmLabel_(sp, eds, sides), salon: sp.kind === 'salon', bio: sp.bio || '', public_on: sp.cm_public !== 'FALSE', slug: sp.slug || '', talk: sp.talk_title || '', designation: sp.designation || '', linkedin: sp.linkedin || '', bio_line: sp.bio_line || '',
      photo: sp.photo_url || '', email: sp.email, current: sp.edition_id === (cur || {}).id, google_email: sp.google_email || '', mail: sp.cm_mail !== 'FALSE', video: sp.video_url || '' },
    events: events, peers: peers, kinds: CM_FEEDBACK_KINDS, google_client_id: gConf_().client_id,
    whatsapp: conf.whatsapp, whatsapp_note: conf.whatsapp_note, posts: posts, directory: directory, talks: talks, offers: CM_OFFERS, my_offers: safeJson_(sp.cm_offers, []),
    phone: sp.cm_phone || sp.phone || '', in_directory: sp.cm_directory !== 'FALSE',
    mine: readAll_('CommunityFeedback').filter(function (f) { return f.speaker_id === sp.id; }).map(function (f) { return { kind: f.kind, message: f.message, at: f.created_at, status: f.status, reply: f.reply }; }).reverse() };
}
function cmFeedback_(sp, d) {
  const f = clean_(d, { kind: 60, about: 160, message: 4000 });
  if (CM_FEEDBACK_KINDS.indexOf(f.kind) < 0) f.kind = 'Something else';
  if (f.message.length < 10) throw new Error('Write a little more, please.');
  rateLimit_('cmfb_' + sp.id, 10, 86400);
  const r = parseInt(d.rating, 10);
  appendRow_('CommunityFeedback', { id: newId_('CF'), speaker_id: sp.id, name: sp.name, kind: f.kind, about: f.about, rating: r >= 1 && r <= 5 ? String(r) : '', message: f.message,
    publish_ok: d.publish_ok ? 'TRUE' : 'FALSE', status: 'New', reply: '', created_at: now_() });
  const to = settingsMap_().notify_email || CONFIG.SUPER_ADMIN_EMAIL;
  try { mail_(to, 'Speaker community: ' + f.kind + ' from ' + sp.name, emailShell_(esc_(f.kind), '<p><b>' + esc_(sp.name) + '</b> wrote' + (f.about ? ' about <b>' + esc_(f.about) + '</b>' : '') + ':</p><blockquote>' + esc_(f.message).replace(/\n/g, '<br>') + '</blockquote>' +
    (d.publish_ok ? '<p>They are happy for us to share this.</p>' : '') + '<p><a href="' + CONFIG.ADMIN_URL + '#community">Open Speaker community</a></p>', { kicker: 'Speaker Community' }), { noCopy: true }); } catch (e) { }
  return { ok: true };
}
function cmRsvp_(sp, d) {
  const e = findRow_('SideEvents', d.event_id); if (!e || !truthy_(e.published)) throw new Error('Event not found.');
  const ex = readAll_('CommunityRsvps').filter(function (r) { return r.event_id === e.id && r.speaker_id === sp.id; })[0];
  const st = d.going ? 'Going' : 'Not going';
  if (ex) updateRow_('CommunityRsvps', ex.id, { status: st, updated_at: now_() });
  else appendRow_('CommunityRsvps', { id: newId_('CR'), event_id: e.id, speaker_id: sp.id, name: sp.name, status: st, created_at: now_(), updated_at: now_() });
  return { ok: true };
}
function cmOffers_(sp, d) {
  const want = [].concat(d.offers || []).filter(function (x) { return CM_OFFERS.indexOf(x) >= 0; });
  const before = safeJson_(sp.cm_offers, []), added = want.filter(function (x) { return before.indexOf(x) < 0; });
  updateRow_('Speakers', sp.id, { cm_offers: JSON.stringify(want), cm_offer_note: String(d.note || '').slice(0, 600) });
  if (added.length) { const to = settingsMap_().notify_email || CONFIG.SUPER_ADMIN_EMAIL;
    try { mail_(to, sp.name + ' offered to help', emailShell_(esc_(sp.name) + ' would like to help', '<ul>' + added.map(function (x) { return '<li>' + esc_(x) + '</li>'; }).join('') + '</ul>' + (d.note ? '<blockquote>' + esc_(d.note) + '</blockquote>' : '') +
      '<p><a href="' + CONFIG.ADMIN_URL + '#community">Open Speaker community</a></p>', { kicker: 'Speaker Community' }), { noCopy: true }); } catch (e) { } }
  return { ok: true };
}
function cmPrefs_(sp, d) {
  const up = { cm_token: sp.cm_token || Utilities.getUuid().replace(/-/g, '') };
  if (d.mail != null) up.cm_mail = d.mail ? 'TRUE' : 'FALSE';
  if (d.directory != null) up.cm_directory = d.directory ? 'TRUE' : 'FALSE';
  updateRow_('Speakers', sp.id, up); return { ok: true };
}
function cmProfile_(sp, d) {
  const f = clean_(d, { designation: 120, linkedin: 200, bio_line: 160, bio: 1500 });
  if (d.bio != null) { const w = (f.bio.match(/\S+/g) || []).length; if (f.bio.length < 40) throw new Error('Please write a short bio (at least a couple of sentences).'); if (w > 220) throw new Error('Please keep your bio to about 150 words (yours is ' + w + ').'); } else delete f.bio;
  if (d.public_on != null) f.cm_public = d.public_on ? 'TRUE' : 'FALSE';
  if (d.photo) {
    const m = String(d.photo).match(/^data:(image\/(png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!m) throw new Error('Use a JPG, PNG or WebP photo.');
    if (m[3].length > 8000000) throw new Error('That photo is too large.');
    const file = recordsFolder_('Speaker headshots').createFile(Utilities.newBlob(Utilities.base64Decode(m[3]), m[1], sp.id + '-' + String(sp.name).replace(/[^\w ]/g, '') + '-community.' + m[2].replace('jpeg', 'jpg')));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    f.photo_url = 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200'; f.photo_file_id = file.getId();
  }
  if (d.require && !(f.photo_url || sp.photo_url)) throw new Error('Please add your photo.');
  if (d.phone != null && String(d.phone).trim()) f.cm_phone = cmPhone_(d.phone);
  if (f.linkedin && !/^https:\/\/(www\.)?linkedin\.com\//i.test(f.linkedin)) throw new Error('Paste your full LinkedIn link (https://www.linkedin.com/in/…).');
  updateRow_('Speakers', sp.id, Object.assign(f, { profile_updated_at: now_() }));
  try { cmSlug_(findRow_('Speakers', sp.id)); bust_(); CacheService.getScriptCache().remove('cm_public'); } catch (e) { }
  return { ok: true };
}
function cmGLink_(sp, d) {
  const g = gVerify_(d.credential);
  if (readAll_('Speakers').some(function (x) { return x.google_sub === g.sub && x.id !== sp.id; })) throw new Error('That Google account is connected to another speaker. Use a different one.');
  updateRow_('Speakers', sp.id, { google_sub: g.sub, google_email: g.email, google_linked_at: now_() });
  return { ok: true, google_email: g.email };
}
function cmGUnlink_(sp) { updateRow_('Speakers', sp.id, { google_sub: '', google_email: '', google_linked_at: '' }); return { ok: true }; }

// ───────── Team Portal ─────────
function cmMust_(me, write) { if (!can_(me, 'speakers', !!write) && me.role !== 'super') throw new Error('Only the Organizer and the Speakers team can open the Speaker community.'); }
function cmAdmin_(me) {
  cmMust_(me);
  const eds = cmEditions_(), cur = cmCurrentId_(), sidesA = cmSideMap_();
  const people = readAll_('Speakers').filter(function (s) { return s.name; }).map(function (s) {
    return { id: s.id, name: s.name, edition: cmLabel_(s, eds, sidesA), salon: s.kind === 'salon', side_event_id: s.side_event_id || '', talk: s.talk_title || '', current: s.kind !== 'salon' && s.edition_id === cur, public_on: s.cm_public !== 'FALSE' && !!s.photo_url, email: s.email || '', claim_email: s.cm_status === 'Pending' ? s.cm_claim_email : '',
      status: s.cm_status === 'Pending' ? 'Waiting for approval' : truthy_(s.community) && truthy_(s.portal_active) ? 'Member' : s.hash && truthy_(s.portal_active) ? 'Speaker portal' : s.email ? 'Not joined (email on file)' : 'Not joined',
      joined_at: s.cm_joined_at || '', last_login: s.last_login || '', mail: s.cm_mail !== 'FALSE' && (truthy_(s.community) || !!s.email), google: !!s.google_sub,
      phone: s.cm_phone || s.phone || '', designation: s.designation || '', offers: safeJson_(s.cm_offers, []), offer_note: s.cm_offer_note || '' };
  });
  const links = me.role === 'super' ? readAll_('CommunityLinks').map(function (l) { const o = Object.assign({}, l); delete o._row; delete o.token_hash; o.live = o.status === 'Active' && o.expires > now_() && (+o.uses) < (+o.max_uses); return o; }).reverse() : [];
  const fb = readAll_('CommunityFeedback').map(function (f) { return { id: f.id, name: f.name, kind: f.kind, about: f.about, rating: f.rating, message: f.message, publish_ok: truthy_(f.publish_ok), status: f.status, reply: f.reply, at: f.created_at }; }).reverse();
  const evs = readAll_('SideEvents').filter(function (e) { return truthy_(e.published) && String(e.starts_at).slice(0, 10) >= now_().slice(0, 10); }).map(function (e) { return { id: e.id, title: e.title, starts_at: e.starts_at, venue: e.venue, url: CONFIG.SITE_URL + '/events/' + (e.slug ? '#' + e.slug : '') }; });
  const rs = readAll_('CommunityRsvps').filter(function (r) { return r.status === 'Going'; });
  evs.forEach(function (e) { e.going = rs.filter(function (r) { return r.event_id === e.id; }).map(function (r) { return r.name; }); });
  const posts = readAll_('CommunityPosts').map(function (p) { return { id: p.id, title: p.title, body: p.body, link: p.link, link_label: p.link_label, pinned: truthy_(p.pinned), status: p.status, at: p.created_at }; }).reverse();
  return { ok: true, super: me.role === 'super', canEdit: can_(me, 'speakers', true) || me.role === 'super', people: people, links: links, feedback: fb, events: evs, posts: posts, conf: cmConf_(), offers: CM_OFFERS,
    editions: Object.keys(eds).map(function (k) { return { id: k, label: cmEdLabel_(eds[k]) }; }).concat([{ id: 'salon', label: 'Salon speakers only' }]),
    sides: readAll_('SideEvents').map(function (e) { return { id: e.id, title: e.title, date: String(e.starts_at).slice(0, 10) }; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; }), history: readAll_('CommunityMails').slice(-20).reverse(),
    counts: { members: people.filter(function (p) { return p.status === 'Member'; }).length, pending: people.filter(function (p) { return p.claim_email; }).length, reachable: cmAudience_('all').length } };
}
function cmLinkCreate_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer creates community links.');
  const hours = Math.max(1, Math.min(24 * 30, parseInt(b.hours, 10) || 168)), max = Math.max(1, Math.min(500, parseInt(b.max, 10) || 60));
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 48);
  const exp = Utilities.formatDate(new Date(Date.now() + hours * 3600000), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss");
  const rec = { id: newId_('CML'), token_hash: sha_(token), edition_id: b.edition_id === 'salon' || (b.edition_id && findRow_('Editions', b.edition_id)) ? b.edition_id : '', note: String(b.note || '').slice(0, 120),
    created_by: lc_(me.email), created_at: now_(), expires: exp, max_uses: String(max), uses: '0', status: 'Active' };
  appendRow_('CommunityLinks', rec);
  audit_(me.email, 'community link created', rec.id);
  return { ok: true, url: CONFIG.SITE_URL + '/community/#join=' + token, expires: exp, max: max };
}
function cmLinkClose_(me, id) { if (me.role !== 'super') throw new Error('Only the Organizer.'); updateRow_('CommunityLinks', id, { status: 'Closed' }); return { ok: true }; }
function cmApprove_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer approves speakers.');
  const s = findRow_('Speakers', b.id); if (!s || s.cm_status !== 'Pending') throw new Error('Nothing to approve.');
  if (b.decision === 'reject') { updateRow_('Speakers', s.id, { cm_status: '', cm_claim_email: '', salt: '', hash: '', community: '', portal_active: 'FALSE' }); audit_(me.email, 'community claim rejected', s.id); return { ok: true }; }
  const email = lc_(s.cm_claim_email);
  updateRow_('Speakers', s.id, { email: email, cm_status: 'Active', cm_claim_email: '', portal_active: 'TRUE', stage: s.stage || 'Alumni' });
  cmSubscribe_(email, s.name); cmWelcome_(findRow_('Speakers', s.id));
  audit_(me.email, 'community claim approved', s.id + ' ' + email);
  return { ok: true };
}
function cmRemove_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer.');
  const s = findRow_('Speakers', b.id); if (!s) throw new Error('Not found.');
  if (s.edition_id === cmCurrentId_()) throw new Error('This is a current speaker. Manage them from Speakers.');
  updateRow_('Speakers', s.id, { portal_active: 'FALSE', community: 'FALSE', cm_status: '' }); audit_(me.email, 'community member removed', s.id);
  return { ok: true };
}
function cmFbMark_(me, b) {
  cmMust_(me, true);
  const f = findRow_('CommunityFeedback', b.id); if (!f) throw new Error('Not found.');
  const up = { status: b.status === 'Done' ? 'Done' : 'Seen' };
  if (b.reply) {
    const s = findRow_('Speakers', f.speaker_id); const text = String(b.reply).trim().slice(0, 4000);
    if (s && isEmail_(s.email)) ttrisSend_({ kind: 'community', rec_id: f.id, to: s.email, subject: 'Re: your note to TEDxThaltej Youth', title: 'Thank you, ' + esc_(String(s.name).split(' ')[0]) + '.',
      html: bcHtml_(text) + '<p style="margin-top:20px">' + esc_(me.name) + '<br><span style="color:#6B6455">TEDxThaltej Youth</span></p><hr><p style="color:#8a8170;font-size:13px">You wrote:<br>' + esc_(f.message).replace(/\n/g, '<br>') + '</p>',
      kicker: 'Speaker Community', fromName: String(me.name || '').split(' ')[0] + ' · TEDxThaltej Youth', by: me.email });
    up.reply = text; up.status = 'Done';
  }
  updateRow_('CommunityFeedback', f.id, up);
  return { ok: true };
}
function cmAudience_(aud) {
  const cur = cmCurrentId_(), seen = {};
  return readAll_('Speakers').filter(function (s) {
    if (!isEmail_(s.email) || s.cm_mail === 'FALSE' || seen[lc_(s.email)]) return false;
    const member = truthy_(s.community) && truthy_(s.portal_active);
    const ok = aud === 'members' ? member : aud === 'all' ? (member || s.edition_id !== cur) : aud === 'everyone' ? true : false;
    if (ok) seen[lc_(s.email)] = 1; return ok;
  });
}
function cmLeaveLink_(s) {
  let t = s.cm_token; if (!t) { t = Utilities.getUuid().replace(/-/g, ''); updateRow_('Speakers', s.id, { cm_token: t }); }
  return CONFIG.SITE_URL + '/community/#leave=' + t;
}
function cmSend_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer emails the speaker community.');
  const subject = String(b.subject || '').trim().slice(0, 180), body = String(b.body || '').trim().slice(0, 12000);
  if (!subject || body.length < 10) throw new Error('Write a subject and a message.');
  const list = cmAudience_(b.audience); if (!list.length) throw new Error('Nobody to send to yet.');
  if (b.preview) { const s = list[0]; return { ok: true, count: list.length, html: cmMailHtml_(s, subject, body, b) }; }
  let sent = 0;
  list.forEach(function (s) { try { mail_(s.email, subject, cmMailHtml_(s, subject, body, b), { bulk: true, replyTo: (ttrisConf_().email) }); sent++; } catch (e) { Logger.log(e); } });
  appendRow_('CommunityMails', { id: newId_('CMM'), subject: subject, audience: b.audience, count: String(sent), sent_by: lc_(me.email), sent_at: now_() });
  audit_(me.email, 'speaker community email', subject + ' → ' + sent);
  return { ok: true, sent: sent };
}
function cmMailHtml_(s, subject, body, b) {
  const ev = b.event_id ? findRow_('SideEvents', b.event_id) : null;
  const card = ev ? '<table><tr><td><b style="font-size:16px">' + esc_(ev.title) + '</b><br>' + esc_(longDate_(String(ev.starts_at).slice(0, 10))) + (String(ev.starts_at).length > 10 ? ' · ' + esc_(String(ev.starts_at).slice(11, 16)) : '') + (ev.venue ? ' · ' + esc_(ev.venue) : '') + '</td></tr></table>' +
    '<p><a href="' + CONFIG.SITE_URL + '/events/' + (ev.slug ? '#' + ev.slug : '') + '">See the event and RSVP</a></p>' : '';
  return emailShell_(esc_(subject), bcHtml_(body.replace(/\{name\}/g, String(s.name).split(' ')[0])) + card +
    '<p style="font-size:12.5px;color:#8a8170;margin-top:22px">You are receiving this as a TEDxThaltej Youth speaker. <a href="' + CONFIG.SITE_URL + '/community/">Your community home</a> · <a href="' + cmLeaveLink_(s) + '">Stop these emails</a></p>', { kicker: 'Speaker Community' });
}
function cmSettings_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer.');
  const map = {};
  if (b.whatsapp != null) { const u = String(b.whatsapp).trim(); if (u && !/^https:\/\/(chat\.whatsapp\.com|whatsapp\.com\/channel|wa\.me)\//.test(u)) throw new Error('Paste the WhatsApp invite link (https://chat.whatsapp.com/…).'); map.cm_whatsapp = u; }
  if (b.whatsapp_note != null) map.cm_whatsapp_note = String(b.whatsapp_note).slice(0, 200);
  if (b.approve_all != null) map.cm_approve_all = b.approve_all ? 'TRUE' : 'FALSE';
  withLock_(function () { const ex = settingsMap_(); Object.keys(map).forEach(function (k) { if (ex[k] === undefined) appendRow_('Settings', { key: k, value: map[k] }); else updateRow_('Settings', k, { value: map[k] }); }); });
  bust_(); audit_(me.email, 'community settings', Object.keys(map).join(','));
  return { ok: true, conf: cmConf_() };
}
function cmPost_(me, b) {
  cmMust_(me, true);
  if (b.id && b.delete) { const p = findRow_('CommunityPosts', b.id); if (p) deleteRow_('CommunityPosts', p.id); return { ok: true }; }
  const f = clean_(b, { title: 140, body: 4000, link: 300, link_label: 40 });
  if (!f.title || f.body.length < 5) throw new Error('Write a title and a short message.');
  if (f.link && !/^https:\/\//.test(f.link)) throw new Error('Links must start with https://');
  const rec = Object.assign(f, { pinned: b.pinned ? 'TRUE' : 'FALSE', status: 'Live' });
  if (b.id) { updateRow_('CommunityPosts', b.id, rec); return { ok: true, id: b.id }; }
  rec.id = newId_('CP'); rec.created_by = lc_(me.email); rec.created_at = now_();
  appendRow_('CommunityPosts', rec);
  let sent = 0;
  if (b.email && me.role === 'super') sent = cmSend_(me, { audience: 'members', subject: f.title, body: f.body + (f.link ? '\n\n[' + (f.link_label || 'Open') + '](' + f.link + ')' : '') }).sent;
  return { ok: true, id: rec.id, sent: sent };
}
function cmSalonSave_(me, b) {
  cmMust_(me, true);
  const f = clean_(b, { name: 100, email: 120, designation: 120, talk_title: 160, side_event_id: 40 });
  if (!f.name) throw new Error('Give the speaker’s name.');
  if (!findRow_('SideEvents', f.side_event_id)) throw new Error('Choose the salon / side event they spoke at.');
  if (f.email) { f.email = lc_(f.email); if (!isEmail_(f.email)) throw new Error('Check the email.'); }
  if (b.id) { const s = findRow_('Speakers', b.id); if (!s || s.kind !== 'salon') throw new Error('Not found.'); updateRow_('Speakers', s.id, f); return { ok: true, id: s.id }; }
  const id = 'SAL-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  appendRow_('Speakers', Object.assign({ id: id, kind: 'salon', edition_id: '', published: 'FALSE', stage: 'Alumni', portal_active: 'FALSE', sort: '999' }, f));
  audit_(me.email, 'salon speaker added', id + ' ' + f.name);
  return { ok: true, id: id };
}
function cmTeamHandle_(me, a, b) {
  if (a === 'cmSalonSave') return cmSalonSave_(me, b);
  if (a === 'cmSettings') return cmSettings_(me, b);
  if (a === 'cmPost') return cmPost_(me, b);
  if (a === 'cmAdmin') return cmAdmin_(me);
  if (a === 'cmLinkCreate') return cmLinkCreate_(me, b);
  if (a === 'cmLinkClose') return cmLinkClose_(me, b.id);
  if (a === 'cmApprove') return cmApprove_(me, b);
  if (a === 'cmRemove') return cmRemove_(me, b);
  if (a === 'cmFbMark') return cmFbMark_(me, b);
  if (a === 'cmSend') return cmSend_(me, b);
  return null;
}
