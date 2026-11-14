/**
 * Community updates: "Subscribe to stay informed".
 *  • Anyone can subscribe from the footer or /subscribe. They confirm by email (double opt-in), and every update
 *    carries a one-click unsubscribe link.
 *  • Subscribers are kept in the Subscribers tab. The Google Group (tedxthaltej-community@googlegroups.com) is
 *    offered as an extra way to join; Google does not let a script add people to a free Google Group.
 *  • Portal → Subscribers (Organizer, or anyone with the News section): list, CSV, and send an update in batches.
 */
const COMMUNITY_GROUP = 'tedxthaltej-community@googlegroups.com';
const COMMUNITY_GROUP_URL = 'https://groups.google.com/g/tedxthaltej-community';

function subHandle_(a, b) {
  if (a === 'join') return subJoin_(b);
  if (a === 'confirm') return subConfirm_(b.t);
  if (a === 'leave') return subLeave_(b.t);
  if (a === 'info') return { ok: true, group: COMMUNITY_GROUP, groupUrl: COMMUNITY_GROUP_URL };
  throw new Error('Unknown request.');
}
function subToken_() { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8); }
function subByToken_(t) { t = String(t || '').replace(/[^a-f0-9]/g, ''); return t.length >= 32 ? readAll_('Subscribers').filter(function (s) { return s.token === t; })[0] : null; }

function subJoin_(b) {
  if (b.website) return { ok: true }; // honeypot
  const f = clean_(b, { email: 120, name: 80, source: 40 });
  if (!isEmail_(f.email)) throw new Error('Please enter a valid email address.');
  rateLimit_('subj_' + f.email, 3, 3600); rateLimit_('subj_all', 200, 3600);
  return withLock_(function () {
    let s = findRow_('Subscribers', f.email);
    if (s && s.status === 'Confirmed') return { ok: true, already: true };
    const token = s && s.token ? s.token : subToken_();
    if (s) updateRow_('Subscribers', f.email, { name: f.name || s.name, status: 'Pending', token: token, updated_at: now_() });
    else appendRow_('Subscribers', { email: f.email, name: f.name, status: 'Pending', source: f.source || 'site', token: token, created_at: now_(), confirmed_at: '', updated_at: now_(), last_sent: '' });
    const link = CONFIG.SITE_URL + '/subscribe/?c=' + token;
    mail_(f.email, 'Confirm your subscription to TEDxThaltej Youth', emailShell_('One click to confirm',
      '<p>' + (f.name ? 'Hi ' + esc_(f.name.split(' ')[0]) + ',' : 'Hello,') + '</p><p>Please confirm that you want updates from TEDxThaltej Youth: speakers, events, Idea Search and ways to take part. A few emails a month at most.</p>' +
      '<p style="margin:26px 0"><a href="' + link + '" style="background:#EB0028;color:#fff;padding:14px 26px;border-radius:999px;font-weight:800;text-decoration:none">Yes, keep me informed</a></p>' +
      '<p style="color:#666">Didn’t ask for this? Ignore this email and you won’t hear from us.</p>'));
    return { ok: true, pending: true };
  });
}
function subConfirm_(t) {
  const s = subByToken_(t); if (!s) throw new Error('This link is not valid any more. Please subscribe again.');
  if (s.status !== 'Confirmed') updateRow_('Subscribers', s.email, { status: 'Confirmed', confirmed_at: now_(), updated_at: now_() });
  return { ok: true, email: s.email, group: COMMUNITY_GROUP, groupUrl: COMMUNITY_GROUP_URL };
}
function subLeave_(t) {
  const s = subByToken_(t); if (!s) throw new Error('This link is not valid.');
  updateRow_('Subscribers', s.email, { status: 'Unsubscribed', updated_at: now_() });
  return { ok: true, email: s.email };
}

// ───────── portal ─────────
function subMust_(me) { if (me.role !== 'super' && (me.scopeList || []).indexOf('news') < 0) throw new Error('You do not have access to Subscribers.'); }
function subList_(me) {
  subMust_(me);
  const rows = readAll_('Subscribers').map(function (s) { return { email: s.email, name: s.name, status: s.status, source: s.source, created_at: s.created_at, confirmed_at: s.confirmed_at, last_sent: s.last_sent }; }).reverse();
  return { ok: true, rows: rows, group: COMMUNITY_GROUP, groupUrl: COMMUNITY_GROUP_URL, campaigns: readAll_('SubCampaigns').map(function (c) { const o = Object.assign({}, c); delete o._row; delete o.html; return o; }).reverse() };
}
function subRemove_(me, email) { subMust_(me); deleteRow_('Subscribers', lc_(email)); audit_(me.email, 'subscriber removed', email); return { ok: true }; }

/** Sends one batch (up to 40) of an update; the portal calls again until done. Email quotas apply (Gmail ~100/day, Zoho more). */
function subSend_(me, b) {
  subMust_(me);
  let c = b.id ? findRow_('SubCampaigns', b.id) : null;
  if (!c) {
    const subject = String(b.subject || '').trim().slice(0, 150), body = String(b.body || '').trim().slice(0, 20000);
    if (!subject || !body) throw new Error('Write a subject and the message.');
    if (b.test) { mail_(me.email, '[Test] ' + subject, subHtml_(subject, body, '')); return { ok: true, test: true }; }
    c = { id: newId_('UPD'), subject: subject, html: body, created_by: lc_(me.email), created_at: now_(), sent: '0', total: '', status: 'Sending', done_at: '' };
    appendRow_('SubCampaigns', c);
    audit_(me.email, 'update started', c.id + ' ' + subject);
  }
  if (c.status === 'Done') return { ok: true, id: c.id, done: true, sent: +c.sent };
  const list = readAll_('Subscribers').filter(function (s) { return s.status === 'Confirmed' && s.last_sent !== c.id; });
  const batch = list.slice(0, 40); let n = 0, err = '';
  for (let i = 0; i < batch.length; i++) {
    try { mail_(batch[i].email, c.subject, subHtml_(c.subject, c.html, batch[i].token), { bulk: true }); updateRow_('Subscribers', batch[i].email, { last_sent: c.id }); n++; }
    catch (e) { err = String(e.message || e); break; }
  }
  const sent = (+c.sent || 0) + n, left = list.length - n;
  updateRow_('SubCampaigns', c.id, { sent: String(sent), total: String(sent + left), status: left > 0 ? 'Sending' : 'Done', done_at: left > 0 ? '' : now_() });
  return { ok: true, id: c.id, sent: sent, left: left, done: left === 0, error: err ? 'Stopped: ' + err + ' (probably the daily email limit). Press Continue tomorrow.' : '' };
}
function subHtml_(subject, body, token) {
  const html = esc_(body).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(https:\/\/[^\s<]+)/g, '<a href="$1">$1</a>').split(/\n\s*\n/).map(function (p) { return '<p>' + p.replace(/\n/g, '<br>') + '</p>'; }).join('');
  return emailShell_(esc_(subject), html + '<p style="margin-top:28px;color:#888;font-size:12px">You’re getting this because you subscribed to TEDxThaltej Youth updates. ' +
    (token ? '<a href="' + CONFIG.SITE_URL + '/subscribe/?u=' + token + '" style="color:#888">Unsubscribe</a> · ' : '') + '<a href="' + COMMUNITY_GROUP_URL + '" style="color:#888">Our community group</a></p>');
}
