/**
 * Charter tools for members (the Council = every active portal user except the Organizer).
 *
 *  Elections (Art. 6.2(B), 7):   Organizer opens a selection for a role → candidates apply with a statement of intent,
 *                                 experience and plan (7.3(b)) → Council votes by secret ballot, one vote each →
 *                                 the Registrar verifies the count (27.7.2) → the outcome is a recommendation; the
 *                                 Organizer confirms it or selects otherwise, with a recorded reason (7.6, 7.7).
 *  Right to Information (23.3):  any member asks; the Organizer answers. If anything is withheld for confidentiality,
 *                                 the category under 16.2.2 must be named (27.5).
 *  Motions (23.4, 24.3, 27.7-8): Institutional Hearing or Exceptional Constitutional Review. Members add their support;
 *                                 the threshold is 2/3 of the active Council counted on the day it opens (27.7.1);
 *                                 the Registrar verifies (27.7.2). A Review also needs a substantiation memo (27.8).
 *  Withdrawal (Art. 10):          the formal Withdrawal Form, signed with evidence; the Organizer acknowledges it, the
 *                                 Registrar issues the acknowledgement letter, and access ends.
 */
const RTI_CATEGORIES = { a: '16.2.2(a) internal discussions and decisions', b: '16.2.2(b) documents, records and communications',
  c: '16.2.2(c) personal or organisational data', d: '16.2.2(d) information designated as confidential' };
const REVIEW_GROUNDS = { a: '24.3.2(a) favoritism, partiality or unequal treatment', b: '24.3.2(b) abuse or misuse of authority', c: '24.3.2(c) actions inconsistent with the Charter',
  d: '24.3.2(d) actions threatening the integrity of governance', e: '24.3.2(e) misuse of override powers under Article 21', f: '24.3.2(f) a matter of exceptional institutional importance' };

function council_() {
  return readAll_('Admins').filter(function (a) { return truthy_(a.active) && a.role !== 'super' && !(a.locked_until && a.locked_until > now_()); })
    .map(function (a) { return { email: lc_(a.email), name: a.name || a.email }; });
}
function isCouncil_(me) { return me.role !== 'super'; }
function seq_(tab, prefix) { return prefix + '-' + now_().slice(0, 4) + '-' + ('000' + (readAll_(tab).length + 1)).slice(-4); }

/** One call for the member's "Charter" page. */
function govBoot_(me) {
  const t = now_(), mine = lc_(me.email), size = council_().length;
  const els = readAll_('Elections').filter(function (e) { return e.status !== 'Draft' || me.role === 'super'; }).reverse().map(function (e) { return electionView_(e, me); });
  const motions = readAll_('Motions').reverse().map(function (m) { return motionView_(m, me); });
  const rti = readAll_('Rti').filter(function (r) { return me.role === 'super' || isRegistrar_(me) || r.email === mine; }).reverse();
  const wd = readAll_('Withdrawals').filter(function (w) { return me.role === 'super' || isRegistrar_(me) || w.email === mine; }).reverse()
    .map(function (w) { const o = Object.assign({}, w); delete o.evidence_json; delete o.sig_file_id; return o; });
  return { ok: true, me: mine, isSuper: me.role === 'super', isRegistrar: isRegistrar_(me), councilSize: size, now: t, elections: els, motions: motions, rti: rti, withdrawals: wd,
    rtiCategories: RTI_CATEGORIES, reviewGrounds: REVIEW_GROUNDS };
}

// ───────────────────────────── ELECTIONS ─────────────────────────────
function electionPhase_(e) {
  const t = now_();
  if (e.status === 'Draft' || e.status === 'Cancelled') return e.status;
  if (e.status === 'Confirmed') return 'Confirmed';
  if (e.apply_until && t <= e.apply_until + ':59') return 'Applications open';
  if (t < e.vote_from + ':00') return 'Applications closed';
  if (t <= e.vote_until + ':59') return 'Voting';
  return 'Counting';
}
function electionView_(e, me) {
  const phase = electionPhase_(e), mine = lc_(me.email);
  const cands = readAll_('Candidates').filter(function (c) { return c.election_id === e.id && c.status !== 'Withdrawn'; });
  const votes = readAll_('Votes').filter(function (v) { return v.election_id === e.id; });
  const showResult = ['Counting', 'Confirmed'].indexOf(phase) >= 0;
  const tally = {}; if (showResult) votes.forEach(function (v) { tally[v.choice] = (tally[v.choice] || 0) + 1; });
  return { id: e.id, title: e.title, role: e.role, description: e.description, apply_until: e.apply_until, vote_from: e.vote_from, vote_until: e.vote_until, status: e.status, phase: phase,
    candidates: cands.map(function (c) { return { id: c.id, name: c.name, email: me.role === 'super' || c.email === mine ? c.email : '', intent: c.intent, experience: c.experience, vision: c.vision, links: c.links,
      votes: showResult ? (tally[c.id] || 0) : null }; }),
    applied: cands.some(function (c) { return c.email === mine; }), voted: votes.some(function (v) { return v.voter === mine; }), turnout: votes.length, council: e.council_size,
    verified_by: e.verified_by, verified_at: e.verified_at, confirmed_id: e.confirmed_id, confirmed_name: e.confirmed_name, override: truthy_(e.override), override_reason: e.override_reason, confirmed_at: e.confirmed_at };
}
function elSave_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer can invoke a selection process (Article 7.2).');
  const title = String(b.title || '').trim().slice(0, 160), role = String(b.role || '').trim().slice(0, 120);
  if (!title || !role) throw new Error('Add a title and the role under consideration (7.2(A).2(a)).');
  const re = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
  if (!re.test(b.apply_until || '') || !re.test(b.vote_from || '') || !re.test(b.vote_until || '')) throw new Error('Set the application deadline and the voting window (7.2(A).2(b)).');
  if (!(b.apply_until <= b.vote_from && b.vote_from < b.vote_until)) throw new Error('Voting must start after applications close, and end after it starts.');
  const rec = { title: title, role: role, description: String(b.description || '').slice(0, 4000), apply_until: b.apply_until, vote_from: b.vote_from, vote_until: b.vote_until,
    status: b.publish ? 'Open' : 'Draft', updated_at: now_() };
  let id = b.id;
  if (id) { const e = findRow_('Elections', id); if (!e || e.status === 'Confirmed') throw new Error('This selection can no longer be changed.'); updateRow_('Elections', id, rec); }
  else { id = seq_('Elections', 'SEL'); appendRow_('Elections', Object.assign({ id: id, council_size: String(council_().length), created_by: lc_(me.email), created_at: now_(),
    verified_by: '', verified_at: '', confirmed_id: '', confirmed_name: '', override: 'FALSE', override_reason: '', confirmed_at: '' }, rec)); }
  if (b.publish && b.notify !== false) council_().forEach(function (c) {
    mail_(c.email, 'Selection process: ' + role, emailShell_('A Council Selection Process is open.',
      '<p>The Organizer has invoked a selection for <b>' + esc_(role) + '</b>.</p><p>Applications close <b>' + esc_(b.apply_until.replace('T', ' ')) + '</b>. Voting runs ' + esc_(b.vote_from.replace('T', ' ')) + ' to ' + esc_(b.vote_until.replace('T', ' ')) + ' IST.</p>' +
      '<p>Campaigning and lobbying are not permitted, and all proceedings are confidential (Article 7.8).</p><p><a href="' + CONFIG.ADMIN_URL + '#charter">Open in the Team Portal</a></p>'));
  });
  audit_(me.email, 'selection saved', id + ' ' + role);
  return { ok: true, id: id };
}
function elApply_(me, b) {
  const e = findRow_('Elections', b.id);
  if (!e || electionPhase_(e) !== 'Applications open') throw new Error('Applications are not open for this selection.');
  if (!isCouncil_(me)) throw new Error('The Organizer cannot apply.');
  const f = clean_(b, { intent: 3000, experience: 3000, vision: 3000, links: 600 });
  if (!f.intent || !f.experience || !f.vision) throw new Error('Article 7.3(b) needs all three: statement of intent, experience and your plan for the role.');
  const key = e.id + '|' + lc_(me.email), ex = findRow_('Candidates', key);
  const rec = { id: key, election_id: e.id, email: lc_(me.email), name: me.name || me.email, intent: f.intent, experience: f.experience, vision: f.vision, links: f.links, status: 'Applied', created_at: now_() };
  if (ex) updateRow_('Candidates', key, rec); else appendRow_('Candidates', rec);
  return { ok: true };
}
function elWithdrawApp_(me, id) {
  const key = id + '|' + lc_(me.email), c = findRow_('Candidates', key), e = findRow_('Elections', id);
  if (!c || !e || electionPhase_(e) !== 'Applications open') throw new Error('You can withdraw only while applications are open.');
  updateRow_('Candidates', key, { status: 'Withdrawn' });
  return { ok: true };
}
function elVote_(me, b) {
  const e = findRow_('Elections', b.id);
  if (!e || electionPhase_(e) !== 'Voting') throw new Error('Voting is not open.');
  if (!isCouncil_(me)) throw new Error('The Organizer does not vote; the Council does (7.1).');
  const c = findRow_('Candidates', b.choice);
  if (!c || c.election_id !== e.id || c.status === 'Withdrawn') throw new Error('Choose a candidate.');
  return withLock_(function () {
    const key = e.id + '|' + lc_(me.email);
    if (findRow_('Votes', key)) throw new Error('You have already voted. One member, one vote.');
    appendRow_('Votes', { key: key, election_id: e.id, voter: lc_(me.email), choice: c.id, created_at: now_() });
    return { ok: true };
  });
}
function elVerify_(me, id) {
  regMust_(me);
  const e = findRow_('Elections', id);
  if (!e || electionPhase_(e) !== 'Counting') throw new Error('The count can be verified after voting closes.');
  const votes = readAll_('Votes').filter(function (v) { return v.election_id === id; });
  const voters = council_().map(function (c) { return c.email; });
  const bad = votes.filter(function (v) { return voters.indexOf(v.voter) < 0 && !findAdmin_(v.voter); });
  updateRow_('Elections', id, { verified_by: lc_(me.email), verified_at: now_() });
  audit_(me.email, 'registrar verified count', id + ' votes=' + votes.length + (bad.length ? ' flagged=' + bad.length : ''));
  return { ok: true, votes: votes.length, flagged: bad.length };
}
function elConfirm_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer confirms an appointment (7.7).');
  const e = findRow_('Elections', b.id);
  if (!e || electionPhase_(e) !== 'Counting') throw new Error('Confirm after voting closes.');
  const view = electionView_(e, me), top = view.candidates.slice().sort(function (a, c) { return c.votes - a.votes; })[0];
  const pick = b.candidate ? view.candidates.filter(function (c) { return c.id === b.candidate; })[0] : null;
  if (b.candidate && !pick) throw new Error('Choose a candidate.');
  const override = !!pick && (!top || pick.id !== top.id || view.candidates.filter(function (c) { return c.votes === top.votes; }).length > 1);
  const reason = String(b.reason || '').trim().slice(0, 1500);
  if ((override || !pick) && !reason) throw new Error('Record a reason when you select otherwise or reject all candidates (7.6(B), override log).');
  updateRow_('Elections', e.id, { status: 'Confirmed', confirmed_id: pick ? pick.id : '', confirmed_name: pick ? pick.name : '(no appointment)', override: override || !pick ? 'TRUE' : 'FALSE',
    override_reason: reason, confirmed_at: now_() });
  audit_(me.email, 'selection confirmed', e.id + ' → ' + (pick ? pick.name : 'none') + (override ? ' (override: ' + reason + ')' : ''));
  return { ok: true };
}

// ───────────────────────────── RTI ─────────────────────────────
function rtiNew_(me, b) {
  if (!isCouncil_(me)) throw new Error('RTI is a Council member’s right.');
  const f = clean_(b, { subject: 160, matter: 60, question: 4000 });
  if (!f.subject || !f.question) throw new Error('Add a subject and your question.');
  rateLimit_('rti_' + lc_(me.email), 5, 86400);
  const rec = { id: seq_('Rti', 'RTI'), email: lc_(me.email), name: me.name || me.email, subject: f.subject, matter: f.matter, question: f.question, status: 'Submitted',
    answer: '', withheld: '', withheld_category: '', answered_at: '', created_at: now_() };
  appendRow_('Rti', rec);
  mail_(CONFIG.SUPER_ADMIN_EMAIL, 'RTI request ' + rec.id + ': ' + f.subject, emailShell_('Right to Information request',
    '<p><b>' + esc_(rec.name) + '</b> has asked under Article 23.3:</p><p><b>' + esc_(f.subject) + '</b></p><p>' + esc_(f.question).replace(/\n/g, '<br>') + '</p><p><a href="' + CONFIG.ADMIN_URL + '#charter">Answer in the Team Portal</a></p>'));
  regNotify_('RTI request recorded: ' + rec.id, '<p>For the record (Article 23.6): ' + esc_(rec.name) + ' · ' + esc_(f.subject) + '</p>');
  return { ok: true, id: rec.id };
}
function rtiAnswer_(me, b) {
  if (me.role !== 'super') throw new Error('Only the Organizer answers RTI requests.');
  const r = findRow_('Rti', b.id);
  if (!r) throw new Error('Request not found.');
  const answer = String(b.answer || '').trim().slice(0, 6000), withheld = String(b.withheld || '').trim().slice(0, 1500), cat = RTI_CATEGORIES[b.category] ? b.category : '';
  if (!answer) throw new Error('Give a reasonable clarification, reasoning or context (23.3.3).');
  if (withheld && !cat) throw new Error('If anything is withheld, name the 16.2.2 category (Article 27.5).');
  updateRow_('Rti', r.id, { status: withheld ? 'Answered (part withheld)' : 'Answered', answer: answer, withheld: withheld, withheld_category: cat ? RTI_CATEGORIES[cat] : '', answered_at: now_() });
  mail_(r.email, 'Answer to your RTI request ' + r.id, emailShell_('Your RTI request has been answered.', '<p><b>' + esc_(r.subject) + '</b></p><p>' + esc_(answer).replace(/\n/g, '<br>') + '</p>' +
    (withheld ? '<p><i>Withheld: ' + esc_(withheld) + ' — category ' + esc_(RTI_CATEGORIES[cat]) + '.</i></p>' : '')));
  audit_(me.email, 'RTI answered', r.id);
  return { ok: true };
}

// ───────────────────────────── MOTIONS: HEARING / REVIEW ─────────────────────────────
function motionView_(m, me) {
  const sup = readAll_('Supports').filter(function (s) { return s.motion_id === m.id; });
  const need = Math.ceil((+m.council_size || 0) * 2 / 3);
  return { id: m.id, type: m.type, title: m.title, matter: m.matter, grounds: safeJson_(m.grounds_json, []), facts: m.facts, prior_hearing: m.prior_hearing, proposer: m.proposer_name,
    status: m.status, council_size: +m.council_size, needed: need, support: sup.length, supported: sup.some(function (s) { return s.email === lc_(me.email); }),
    verified_by: m.verified_by, verified_at: m.verified_at, outcome: m.outcome, created_at: m.created_at, closes_at: m.closes_at };
}
function moNew_(me, b) {
  if (!isCouncil_(me)) throw new Error('Motions come from the Council.');
  const type = b.type === 'review' ? 'review' : 'hearing';
  const f = clean_(b, { title: 160, matter: 4000, facts: 6000, prior_hearing: 2000 });
  if (!f.title || !f.matter) throw new Error('Describe the matter.');
  const grounds = [].concat(b.grounds || []).filter(function (g) { return REVIEW_GROUNDS[g]; });
  if (type === 'review') {
    if (!grounds.length) throw new Error('Name the grounds under 24.3.2 (Article 27.8.1(a)).');
    if (!f.facts) throw new Error('Give the factual basis for each ground (27.8.1(b)).');
    if (!f.prior_hearing) throw new Error('Say whether an Institutional Hearing was held on this, and if not, why (27.8.1(c)).');
  }
  const size = council_().length;
  const rec = { id: seq_('Motions', type === 'review' ? 'ECR' : 'HRG'), type: type, title: f.title, matter: f.matter, grounds_json: JSON.stringify(grounds), facts: f.facts, prior_hearing: f.prior_hearing,
    proposer_email: lc_(me.email), proposer_name: me.name || me.email, status: 'Gathering support', council_size: String(size),
    created_at: now_(), closes_at: Utilities.formatDate(new Date(Date.now() + 14 * 86400000), 'Asia/Kolkata', "yyyy-MM-dd'T'HH:mm:ss"), verified_by: '', verified_at: '', outcome: '' };
  withLock_(function () { appendRow_('Motions', rec); appendRow_('Supports', { key: rec.id + '|' + lc_(me.email), motion_id: rec.id, email: lc_(me.email), created_at: now_() }); });
  council_().forEach(function (c) {
    if (c.email === lc_(me.email)) return;
    mail_(c.email, (type === 'review' ? 'Request for Constitutional Review: ' : 'Request for an Institutional Hearing: ') + f.title, emailShell_('A Council motion needs your decision.',
      '<p>' + esc_(rec.proposer_name) + ' has asked for ' + (type === 'review' ? 'an Exceptional Constitutional Review (Article 24)' : 'an Institutional Hearing (Article 23.4)') + ' on: <b>' + esc_(f.title) + '</b>.</p>' +
      '<p>It needs the support of ' + Math.ceil(size * 2 / 3) + ' of ' + size + ' Council members within 14 days. Read it and decide in the portal.</p><p><a href="' + CONFIG.ADMIN_URL + '#charter">Open in the Team Portal</a></p>'));
  });
  regNotify_('Motion opened: ' + rec.id, '<p>' + esc_(f.title) + ' · Council size at opening: ' + size + ' (Article 27.7.1).</p>');
  return { ok: true, id: rec.id };
}
function moSupport_(me, id, on) {
  if (!isCouncil_(me)) throw new Error('Only Council members can support a motion.');
  const m = findRow_('Motions', id);
  if (!m || m.status !== 'Gathering support') throw new Error('This motion is not collecting support.');
  if (now_() > m.closes_at) { updateRow_('Motions', id, { status: 'Lapsed' }); throw new Error('This motion has lapsed.'); }
  const key = id + '|' + lc_(me.email);
  withLock_(function () {
    if (on && !findRow_('Supports', key)) appendRow_('Supports', { key: key, motion_id: id, email: lc_(me.email), created_at: now_() });
    if (!on) deleteRow_('Supports', key);
    const n = readAll_('Supports').filter(function (s) { return s.motion_id === id; }).length;
    if (n >= Math.ceil((+m.council_size) * 2 / 3)) {
      updateRow_('Motions', id, { status: 'Threshold met' });
      regNotify_('Threshold met: ' + id, '<p>' + esc_(m.title) + ' has ' + n + ' of ' + m.council_size + ' Council members. Please verify the count (Article 27.7.2).</p>');
    }
  });
  return { ok: true };
}
function moVerify_(me, id) {
  regMust_(me);
  const m = findRow_('Motions', id);
  if (!m || m.status !== 'Threshold met') throw new Error('Only motions that met the threshold can be verified.');
  const sup = readAll_('Supports').filter(function (s) { return s.motion_id === id; });
  const valid = sup.filter(function (s) { const a = findAdmin_(s.email); return a && truthy_(a.active) && a.role !== 'super'; });
  const need = Math.ceil((+m.council_size) * 2 / 3);
  const ok = valid.length >= need;
  updateRow_('Motions', id, { status: ok ? (m.type === 'review' ? 'Referred to IDC Chairperson' : 'Hearing invoked') : 'Gathering support', verified_by: lc_(me.email), verified_at: now_() });
  audit_(me.email, 'registrar verified motion', id + ' valid=' + valid.length + '/' + m.council_size + ' need=' + need + ' → ' + (ok ? 'valid' : 'short'));
  if (ok) mail_(CONFIG.SUPER_ADMIN_EMAIL, (m.type === 'review' ? 'Constitutional Review requested: ' : 'Institutional Hearing invoked: ') + m.title, emailShell_(m.type === 'review' ? 'A Constitutional Review has been requested.' : 'An Institutional Hearing has been invoked.',
    '<p>' + esc_(m.title) + '</p><p>Supported by ' + valid.length + ' of ' + m.council_size + ' Council members, verified by the Office of the Registrar on ' + longDate_(now_()) + '.</p>' +
    (m.type === 'review' ? '<p>The request now goes to the IDC Chairperson to decide jurisdiction (Article 24.3.3(b)). Under 27.3, the Chairperson cannot be removed while this is pending.</p>' : '<p>A structured session of clarification and questioning should now be scheduled (Article 23.4.2).</p>')));
  return { ok: true, valid: valid.length, needed: need, passed: ok };
}
function moClose_(me, id, outcome) {
  if (me.role !== 'super' && !isRegistrar_(me)) throw new Error('Only the Organizer or Registrar can record the outcome.');
  const m = findRow_('Motions', id);
  if (!m) throw new Error('Motion not found.');
  outcome = String(outcome || '').trim().slice(0, 4000);
  if (!outcome) throw new Error('Record the outcome or key observations (23.6.2).');
  updateRow_('Motions', id, { status: 'Closed', outcome: outcome });
  audit_(me.email, 'motion closed', id);
  return { ok: true };
}

// ───────────────────────────── WITHDRAWAL (Art. 10) ─────────────────────────────
function wdNew_(me, b) {
  if (me.role === 'super') throw new Error('The Organizer’s position is not withdrawn through this form.');
  if (readAll_('Withdrawals').some(function (w) { return w.email === lc_(me.email) && w.status === 'Submitted'; })) throw new Error('You already have a withdrawal pending.');
  if (!b.confirm_intent || !b.ack_obligations) throw new Error('Confirm your intent and acknowledge the obligations (10.2(a).2).');
  const f = clean_(b, { pending: 3000, handover: 3000, claims: 2000, reason: 2000, typedName: 120 });
  if (!f.pending) throw new Error('Declare your pending responsibilities, or write “None” (10.2(a).2(c)).');
  if (String(f.typedName).trim().toLowerCase() !== String(me.name || '').trim().toLowerCase()) throw new Error('Type your full name exactly as: ' + me.name);
  const openReq = readAll_('Requests').filter(function (q) { return q.email === lc_(me.email) && q.status === 'Submitted'; });
  const sigId = recordsFolder_('Signatures').createFile(dataUrlBlob_(b.signature, 'withdrawal-' + lc_(me.email) + '.png')).getId();
  const ev = evidenceSave_(b.evidence, 'withdrawal-' + lc_(me.email));
  const rec = { id: seq_('Withdrawals', 'WDL'), email: lc_(me.email), name: me.name || me.email, confirm_intent: 'TRUE', ack_obligations: 'TRUE', pending: f.pending, handover: f.handover,
    claims: f.claims, reason: f.reason, open_requests: openReq.map(function (q) { return q.id; }).join(','), sig_file_id: sigId, evidence_json: JSON.stringify(ev),
    status: 'Submitted', acknowledged_by: '', effective_date: '', created_at: now_() };
  appendRow_('Withdrawals', rec);
  mail_(CONFIG.SUPER_ADMIN_EMAIL, 'Withdrawal Form: ' + rec.name, emailShell_('A Withdrawal Form was submitted.',
    '<p><b>' + esc_(rec.name) + '</b> (' + esc_(rec.email) + ') submitted a Withdrawal Form under Article 10.2.</p><p>Pending responsibilities: ' + esc_(f.pending) + '</p>' +
    (openReq.length ? '<p>They have ' + openReq.length + ' pending certificate/letter request(s), which must be settled before withdrawal takes effect (10.3(b)).</p>' : '') +
    '<p><a href="' + CONFIG.ADMIN_URL + '#charter">Acknowledge in the Team Portal</a></p>'));
  return { ok: true, id: rec.id, pendingRequests: openReq.length };
}
function wdAcknowledge_(me, b) {
  if (me.role !== 'super') throw new Error('Withdrawal is acknowledged by the Organizer (10.2(b)).');
  const w = findRow_('Withdrawals', b.id);
  if (!w || w.status !== 'Submitted') throw new Error('Withdrawal not found.');
  const eff = /^\d{4}-\d{2}-\d{2}$/.test(b.effective || '') ? b.effective : now_().slice(0, 10);
  updateRow_('Withdrawals', w.id, { status: 'Acknowledged', acknowledged_by: lc_(me.email), effective_date: eff });
  // 10.4: access ends, removed from active team records
  const a = findAdmin_(w.email);
  if (a) updateRow_('Admins', a.email, { active: 'FALSE' });
  const cur = currentEdition_(readAll_('Editions'));
  readAll_('Team').filter(function (t) { return lc_(t.email) === w.email && (!t.edition_id || (cur && t.edition_id === cur.id)); }).reverse().forEach(function (t) { deleteRow_('Team', t.id); });
  let letter = null;
  try { letter = regIssue_(me, { type: 'withdrawal_ack', fields: { recipient_name: w.name, recipient_email: w.email, effective: longDate_(eff) } }); } catch (e) { Logger.log('ack letter: ' + e); }
  audit_(me.email, 'withdrawal acknowledged', w.id + ' effective ' + eff);
  return { ok: true, letter: letter };
}
