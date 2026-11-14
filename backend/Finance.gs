/**
 * FinanceOS: the money side of TEDxThaltej Youth, inside the Team Portal.
 *
 *  • Chart of accounts with ledger codes (BNK-101, EME-105, ADJ-101 …), editable by the Organizer.
 *  • Financial years (April–March). A closed year cannot be posted to.
 *  • Double-entry journal: every entry debits one ledger and credits another. Entries are never edited or deleted;
 *    a mistake is corrected with a reversal, so the books keep a full history.
 *  • Money requests: a member asks (reimbursement, advance or vendor payment) → their department head approves →
 *    the Organizer (or Finance, up to a limit) approves → Finance pays. Paying posts the entry and issues a
 *    Payment Voucher through the Office of the Registrar, signed by the Organizer & Licensee and verifiable at /verify.
 *  • Sponsorship pledges, with received amounts taken from the journal; receipts can be issued to sponsors.
 *  • Transfers between ledgers (e.g. EME-105 → ADJ-101), capital introduced, budgets per ledger per year.
 *
 *  Who: the Organizer, and portal users given the "finance" section. Every member can raise and follow requests.
 */
const FIN_TYPES = ['Asset', 'Liability', 'Capital', 'Income', 'Expense'];
const FIN_DEBIT_NATURE = { Asset: 1, Expense: 1, Liability: -1, Capital: -1, Income: -1 };
/** Strict rule: nobody spends first and asks later. Spending must be approved BEFORE it happens ("Spending approval");
 *  a Reimbursement can only be claimed against your own approved Spending approval, for no more than the approved amount.
 *  Advances and Vendor payments are, by their nature, asked before the money is spent. */
const FIN_REQ_KINDS = ['Spending approval', 'Reimbursement', 'Advance', 'Vendor payment'];
const FIN_REQ_STATUSES = ['Submitted', 'Head approved', 'Approved', 'Rejected', 'Paid', 'Settled', 'Withdrawn', 'Claimed'];
const FIN_MODES = ['Bank transfer', 'UPI', 'Cash', 'Cheque', 'Card', 'Adjustment'];
const FIN_DEFAULT_CHART = [
  ['BNK-101', 'Bank account', 'Asset', 'Bank & cash'], ['CSH-101', 'Cash in hand', 'Asset', 'Bank & cash'], ['ADV-101', 'Advances to team members', 'Asset', 'Receivables'],
  ['REC-101', 'Sponsorship receivable', 'Asset', 'Receivables'], ['PAY-101', 'Payables (vendors and members)', 'Liability', 'Payables'],
  ['CAP-101', "Organizer's capital", 'Capital', 'Capital'], ['CAP-102', 'Accumulated surplus', 'Capital', 'Capital'],
  ['INC-101', 'Sponsorships', 'Income', 'Income'], ['INC-102', 'Registrations and tickets', 'Income', 'Income'], ['INC-103', 'Grants and donations', 'Income', 'Income'],
  ['INC-104', 'Side events', 'Income', 'Income'], ['INC-105', 'Other income', 'Income', 'Income'],
  ['EME-101', 'Venue and set-up', 'Expense', 'Event management'], ['EME-102', 'Stage, AV and production', 'Expense', 'Event management'],
  ['EME-103', 'Printing and branding', 'Expense', 'Event management'], ['EME-104', 'Speaker hospitality and travel', 'Expense', 'Event management'],
  ['EME-105', 'Food and refreshments', 'Expense', 'Event management'], ['EME-106', 'Gifts and mementos', 'Expense', 'Event management'],
  ['EME-107', 'Volunteer and team costs', 'Expense', 'Event management'],
  ['OPX-101', 'TEDx licence and fees', 'Expense', 'Operations'], ['OPX-102', 'Software and subscriptions', 'Expense', 'Operations'],
  ['OPX-103', 'Marketing and promotion', 'Expense', 'Operations'], ['OPX-104', 'Bank charges', 'Expense', 'Operations'], ['OPX-105', 'Miscellaneous', 'Expense', 'Operations'],
  ['SDE-101', 'Side events', 'Expense', 'Side events'], ['ADJ-101', 'Adjustments and reallocations', 'Expense', 'Adjustments']
];

// ───────── access ─────────
function finStaff_(me) { return me.role === 'super' || (me.scopeList || []).indexOf('finance') >= 0; }
function finMust_(me) { if (!finStaff_(me)) throw new Error('Only Finance can do this.'); }
function finSuper_(me) { if (me.role !== 'super') throw new Error('Only the Organizer can do this.'); }
function finLimit_() { return parseFloat(settingsMap_().fin_staff_limit || '2000') || 0; }
function money_(n) { n = Math.round((parseFloat(n) || 0) * 100) / 100; return n; }
function inr_(n) { const v = money_(n), s = Math.abs(v).toFixed(2).split('.'); let i = s[0], last = i.slice(-3), rest = i.slice(0, -3);
  if (rest) last = ',' + last; return (v < 0 ? '−' : '') + '₹' + rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + last + (s[1] !== '00' ? '.' + s[1] : ''); }

/** Indian financial year for a date: 2026-11-12 → FY2026-27 */
function fyOf_(date) { const d = String(date || now_()).slice(0, 10), y = +d.slice(0, 4), m = +d.slice(5, 7), s = m >= 4 ? y : y - 1;
  return 'FY' + s + '-' + String(s + 1).slice(2); }
function fyEnsure_(id) {
  if (findRow_('FinYears', id)) return findRow_('FinYears', id);
  const s = +id.slice(2, 6);
  const rec = { id: id, label: 'Financial year ' + s + '–' + String(s + 1).slice(2), starts: s + '-04-01', ends: (s + 1) + '-03-31', status: 'Open', closed_at: '', closed_by: '', budgets_json: '{}' };
  appendRow_('FinYears', rec); return rec;
}
function finSeed_() {
  if (readAll_('FinAccounts').length) return;
  FIN_DEFAULT_CHART.forEach(function (a, i) { appendRow_('FinAccounts', { code: a[0], name: a[1], type: a[2], grp: a[3], active: 'TRUE', description: '', sort: String(i + 1) }); });
  fyEnsure_(fyOf_());
}
function finAccount_(code) { const a = findRow_('FinAccounts', String(code || '').toUpperCase().trim()); if (!a || !truthy_(a.active)) throw new Error('Unknown or inactive ledger code: ' + code); return a; }
function finOpen_(date) { const fy = fyEnsure_(fyOf_(date)); if (fy.status !== 'Open') throw new Error(fy.label + ' is closed. Ask the Organizer to reopen it to post entries dated ' + String(date).slice(0, 10) + '.'); return fy; }

// ───────── router ─────────
function finHandle_(me, a, b) {
  finSeed_();
  switch (a) {
    case 'finBoot': return finBoot_(me, b.fy);
    case 'finMine': return finMine_(me);
    case 'finReqNew': return finReqNew_(me, b);
    case 'finReqWithdraw': return finReqWithdraw_(me, b.id);
    case 'finReqHead': return finReqHead_(me, b);
    case 'finReqApprove': return finReqApprove_(me, b);
    case 'finReqReturn': return finReqReturn_(me, b);
    case 'finReqPay': return finReqPay_(me, b);
    case 'finReqSettle': return finReqSettle_(me, b);
    case 'finPost': return finPost_(me, b);
    case 'finReverse': return finReverse_(me, b);
    case 'finVoucher': return finVoucher_(me, b);
    case 'finAccountSave': return finAccountSave_(me, b.record || {});
    case 'finYearSave': return finYearSave_(me, b);
    case 'finBudgetSave': return finBudgetSave_(me, b);
    case 'finPledgeSave': return finPledgeSave_(me, b.record || {});
    case 'finPledgeRemove': return finPledgeRemove_(me, b.id);
  }
  throw new Error('Unknown finance action.');
}

// ───────── reading ─────────
function finBoot_(me, fy) {
  finMust_(me);
  fy = fy || fyOf_(); fyEnsure_(fy);
  const all = readAll_('FinEntries'), opening = {};
  all.forEach(function (e) { if (e.fy < fy) { opening[e.debit] = money_((opening[e.debit] || 0) + (+e.amount)); opening[e.credit] = money_((opening[e.credit] || 0) - (+e.amount)); } });
  const entries = all.filter(function (e) { return e.fy === fy; }).map(finClean_);
  const pledges = readAll_('FinPledges').filter(function (p) { return p.fy === fy; }).map(finClean_);
  const received = {};
  entries.forEach(function (e) { if (e.ref_id && e.status !== 'Reversed' && e.kind !== 'Reversal') received[e.ref_id] = money_((received[e.ref_id] || 0) + (+e.amount)); });
  pledges.forEach(function (p) { p.received = received[p.id] || 0; });
  const reqs = readAll_('FinRequests').filter(function (r) { return r.fy === fy || ['Submitted', 'Head approved', 'Approved', 'Paid'].indexOf(r.status) >= 0; }).map(finClean_).reverse();
  return { ok: true, fy: fy, years: readAll_('FinYears').map(finClean_).sort(function (x, y) { return y.id.localeCompare(x.id); }),
    accounts: readAll_('FinAccounts').map(finClean_).sort(by_('sort', true)), opening: opening, entries: entries.reverse(), requests: reqs, pledges: pledges,
    types: FIN_TYPES, kinds: FIN_REQ_KINDS, statuses: FIN_REQ_STATUSES, modes: FIN_MODES, isSuper: me.role === 'super', limit: finLimit_(),
    hasSignature: !!PropertiesService.getScriptProperties().getProperty('ORGANIZER_SIG_FILE_ID'),
    departments: readAll_('Departments').map(function (d) { return { id: d.id, name: d.name }; }),
    sponsors: readAll_('Sponsors').map(function (s) { return { id: s.id, name: s.name, tier: s.tier }; }) };
}
function finClean_(r) { const o = Object.assign({}, r); delete o._row; return o; }

function finMine_(me) {
  const mine = lc_(me.email);
  const all = readAll_('FinRequests');
  const leadOf = me.role === 'lead' ? myDepts_(me) : [];
  const toApprove = all.filter(function (r) {
    if (r.status === 'Submitted') return (leadOf.indexOf(r.department_id) >= 0 && lc_(r.email) !== mine) || (finStaff_(me) && lc_(r.email) !== mine);
    if (r.status === 'Head approved') return me.role === 'super' || (finStaff_(me) && (+r.amount) <= finLimit_() && lc_(r.email) !== mine);
    return false;
  }).map(finClean_);
  return { ok: true, rows: all.filter(function (r) { return lc_(r.email) === mine; }).map(finClean_).reverse(), toApprove: toApprove, kinds: FIN_REQ_KINDS,
    accounts: readAll_('FinAccounts').filter(function (a) { return truthy_(a.active) && a.type === 'Expense'; }).map(function (a) { return { code: a.code, name: a.name, grp: a.grp }; }),
    isStaff: finStaff_(me), isSuper: me.role === 'super', limit: finLimit_(),
    claimable: all.filter(function (r) { return lc_(r.email) === mine && r.kind === 'Spending approval' && r.status === 'Approved'; })
      .map(function (r) { return { id: r.id, title: r.title, amount: r.amount, code: r.code, approved_at: r.approved_at }; }) };
}

// ───────── money requests ─────────
function finReqId_(fy) { const n = readAll_('FinRequests').filter(function (r) { return r.fy === fy; }).length + 1; return 'MR/' + fy.slice(2) + '/' + ('000' + n).slice(-4); }
function finHist_(r, who, what) { return String(r.history || '') + (r.history ? '\n' : '') + now_().replace('T', ' ').slice(0, 16) + ' · ' + who + ' · ' + what; }

function finReqNew_(me, b) {
  const f = clean_(b, { kind: 30, title: 160, amount: 20, code: 12, needed_by: 10, details: 3000, proof_url: 500, payee: 160, payee_details: 500 });
  if (FIN_REQ_KINDS.indexOf(f.kind) < 0) throw new Error('Choose the type of request.');
  if (!f.title) throw new Error('Say what the money is for.');
  const amt = money_(f.amount); if (!(amt > 0) || amt > 10000000) throw new Error('Enter a valid amount.');
  if (f.proof_url && !/^https:\/\//.test(f.proof_url)) throw new Error('The bill or quote link must start with https://');
  if (f.kind === 'Reimbursement' && !f.proof_url) throw new Error('Reimbursements need a link to the bill or receipt.');
  if (f.code) finAccount_(f.code);
  rateLimit_('finreq_' + lc_(me.email), 15, 3600);
  if (f.kind === 'Reimbursement') return finClaim_(me, f, amt, String(b.pre_id || ''));
  return withLock_(function () {
    const fy = fyOf_(); fyEnsure_(fy);
    const dept = b.department_id && inDept_(me, b.department_id) ? String(b.department_id) : (me.department_id || '');
    const lead = dept ? readAll_('Admins').filter(function (a) { return a.role === 'lead' && inDept_(a, dept) && truthy_(a.active) && lc_(a.email) !== lc_(me.email); })[0] : null;
    const skipHead = !lead || me.role === 'lead' || me.role === 'super';
    const rec = { id: finReqId_(fy), fy: fy, email: lc_(me.email), name: me.name, department_id: dept, kind: f.kind, title: f.title, amount: String(amt), code: f.code.toUpperCase(),
      needed_by: f.needed_by, details: f.details, proof_url: f.proof_url, payee: f.payee || me.name, payee_details: f.payee_details,
      status: skipHead ? 'Head approved' : 'Submitted', head_by: skipHead ? 'not needed' : '', head_at: '', approved_by: '', approved_at: '', paid_amount: '', note: '',
      entry_id: '', voucher_id: '', created_at: now_(), updated_at: now_(), history: '' };
    rec.history = finHist_(rec, me.name, 'Requested ' + inr_(amt) + (skipHead ? ' (no head approval needed)' : ''));
    appendRow_('FinRequests', rec);
    const to = skipHead ? finApprovers_(amt) : [lc_(lead.email)];
    to.forEach(function (e) { mail_(e, 'Money request ' + rec.id + ': ' + inr_(amt), emailShell_('Money request to approve',
      '<p><b>' + esc_(me.name) + '</b> asked for <b>' + inr_(amt) + '</b> (' + esc_(f.kind.toLowerCase()) + '): ' + esc_(f.title) + '.</p><p><a href="' + CONFIG.ADMIN_URL + '#money">Review it in the Team Portal</a></p>')); });
    audit_(me.email, 'money request', rec.id + ' ' + amt);
    return { ok: true, id: rec.id, status: rec.status };
  });
}
function finApprovers_(amt) {
  const lim = finLimit_(), out = [lc_(CONFIG.SUPER_ADMIN_EMAIL)];
  if (amt <= lim) readAll_('Admins').forEach(function (a) { if (truthy_(a.active) && a.role !== 'super' && String(a.scopes || '').split(',').map(function (x) { return x.trim(); }).indexOf('finance') >= 0) out.push(lc_(a.email)); });
  return out.filter(function (x, i) { return out.indexOf(x) === i; });
}
function finReq_(id) { const r = findRow_('FinRequests', id); if (!r) throw new Error('Request not found.'); return r; }
function finTell_(r, subject, html) { try { mail_(r.email, subject, emailShell_('Your money request', html + '<p><a href="' + CONFIG.ADMIN_URL + '#money">Open Money requests</a></p>')); } catch (e) { Logger.log(e); } }

function finReqWithdraw_(me, id) {
  const r = finReq_(id);
  if (lc_(r.email) !== lc_(me.email)) throw new Error('You can only withdraw your own request.');
  if (['Submitted', 'Head approved', 'Approved'].indexOf(r.status) < 0) throw new Error('This request can no longer be withdrawn.');
  updateRow_('FinRequests', id, { status: 'Withdrawn', updated_at: now_(), history: finHist_(r, me.name, 'Withdrawn') });
  if (r.kind === 'Reimbursement' && r.pre_id) finReopenPre_(r.pre_id, me.name, 'Claim ' + r.id + ' withdrawn');
  return { ok: true };
}
function finReqHead_(me, b) {
  const r = finReq_(b.id);
  if (r.status !== 'Submitted') throw new Error('This request is not waiting for a head.');
  if (lc_(r.email) === lc_(me.email)) throw new Error('You cannot approve your own request.');
  const ok = finStaff_(me) || (me.role === 'lead' && inDept_(me, r.department_id));
  if (!ok) throw new Error('Only the head of ' + (r.department_id || 'this department') + ' can do this.');
  const yes = b.decision === 'approve', note = String(b.note || '').slice(0, 1000);
  if (!yes && !note) throw new Error('Say why it is rejected.');
  updateRow_('FinRequests', r.id, { status: yes ? 'Head approved' : 'Rejected', head_by: me.name, head_at: now_(), note: note || r.note, updated_at: now_(),
    history: finHist_(r, me.name, (yes ? 'Head approved' : 'Rejected by head') + (note ? ': ' + note : '')) });
  if (yes) finApprovers_(+r.amount).forEach(function (e) { mail_(e, 'Money request ' + r.id + ' needs final approval', emailShell_('Money request to approve',
    '<p>' + esc_(r.name) + ' · <b>' + inr_(r.amount) + '</b> · ' + esc_(r.title) + '</p><p>Approved by the head (' + esc_(me.name) + ').</p><p><a href="' + CONFIG.ADMIN_URL + '#money">Review it</a></p>')); });
  else finTell_(r, 'Money request ' + r.id + ' was not approved', '<p>Your request for ' + inr_(r.amount) + ' (' + esc_(r.title) + ') was not approved by your head.</p><p><b>Reason:</b> ' + esc_(note) + '</p>');
  audit_(me.email, 'money request head ' + (yes ? 'approve' : 'reject'), r.id);
  return { ok: true };
}
function finReqApprove_(me, b) {
  const r = finReq_(b.id);
  if (r.status !== 'Head approved') throw new Error('This request is not waiting for final approval.');
  if (lc_(r.email) === lc_(me.email) && me.role !== 'super') throw new Error('You cannot approve your own request.');
  if (me.role !== 'super' && !(finStaff_(me) && (+r.amount) <= finLimit_())) throw new Error('Requests above ' + inr_(finLimit_()) + ' are approved by the Organizer.');
  const yes = b.decision === 'approve', note = String(b.note || '').slice(0, 1000);
  if (!yes && !note) throw new Error('Say why it is rejected.');
  const code = String(b.code || r.code || '').toUpperCase(); if (yes && code) finAccount_(code);
  updateRow_('FinRequests', r.id, { status: yes ? 'Approved' : 'Rejected', approved_by: me.name, approved_at: now_(), code: code, note: note || r.note, updated_at: now_(),
    history: finHist_(r, me.name, (yes ? 'Approved' : 'Rejected') + (note ? ': ' + note : '')) });
  finTell_(r, 'Money request ' + r.id + (yes ? ' approved' : ' not approved'), yes ? (r.kind === 'Spending approval'
      ? '<p>You may now spend up to <b>' + inr_(r.amount) + '</b> on ' + esc_(r.title) + '. Keep the bill. After spending, open Money requests and claim the reimbursement against <b>' + esc_(r.id) + '</b>.</p><p>Spending above this amount, or on anything else, will not be reimbursed.</p>'
      : '<p>Your request for <b>' + inr_(r.amount) + '</b> (' + esc_(r.title) + ') is approved. Finance will pay it and send you a voucher.</p>')
    : '<p>Your request for ' + inr_(r.amount) + ' (' + esc_(r.title) + ') was not approved.</p><p><b>Reason:</b> ' + esc_(note) + '</p>');
  audit_(me.email, 'money request ' + (yes ? 'approve' : 'reject'), r.id);
  return { ok: true };
}
function finReqPay_(me, b) {
  finMust_(me);
  const r = finReq_(b.id);
  if (r.kind === 'Spending approval') throw new Error('A spending approval is permission to spend, not a payment. The member claims a reimbursement against it after spending.');
  if (r.status !== 'Approved') throw new Error('Only approved requests can be paid.');
  const amt = money_(b.amount || r.amount); if (!(amt > 0)) throw new Error('Enter the amount paid.');
  if (amt > (+r.amount)) throw new Error('You cannot pay more than was approved (' + inr_(r.amount) + ').');
  const from = String(b.from || 'BNK-101').toUpperCase(), code = String(b.code || r.code || '').toUpperCase();
  if (!code) throw new Error('Choose the ledger code for this expense.');
  const debit = r.kind === 'Advance' ? 'ADV-101' : code;
  const res = finPostCore_(me, { kind: r.kind === 'Advance' ? 'Advance' : 'Expense', date: b.date || now_().slice(0, 10), debit: debit, credit: from, amount: amt,
    party: r.payee || r.name, narration: r.kind + ' for ' + r.title + ' (' + r.id + ')' + (r.kind === 'Advance' ? ' · to be settled against ' + code : ''),
    mode: b.mode || 'Bank transfer', reference: b.reference || '', ref_id: r.id, proof_url: r.proof_url, voucher: true, payee_email: r.email });
  updateRow_('FinRequests', r.id, { status: 'Paid', paid_amount: String(amt), code: code, entry_id: res.id, voucher_id: res.voucher_id || '', updated_at: now_(),
    history: finHist_(r, me.name, 'Paid ' + inr_(amt) + ' from ' + from + (b.reference ? ' · ref ' + b.reference : '') + (res.voucher_id ? ' · voucher ' + res.voucher_id : '')) });
  return { ok: true, entry: res.id, voucher_id: res.voucher_id, voucher_code: res.voucher_code };
}
/** Advances: record what was actually spent; any money returned goes back to the bank. */
function finReqSettle_(me, b) {
  finMust_(me);
  const r = finReq_(b.id);
  if (r.kind !== 'Advance' || r.status !== 'Paid') throw new Error('Only paid advances are settled.');
  const spent = money_(b.spent), paid = money_(r.paid_amount), refund = money_(paid - spent), code = String(b.code || r.code).toUpperCase();
  if (spent < 0 || spent > paid + 0.001) throw new Error('Spent must be between 0 and the advance paid (' + inr_(paid) + '). Raise a new request for anything extra.');
  if (spent > 0) finPostCore_(me, { kind: 'Settlement', date: b.date || now_().slice(0, 10), debit: code, credit: 'ADV-101', amount: spent, party: r.name,
    narration: 'Settlement of advance ' + r.id + ': ' + r.title, mode: 'Adjustment', ref_id: r.id, proof_url: String(b.proof_url || r.proof_url || '') });
  if (refund > 0) finPostCore_(me, { kind: 'Refund', date: b.date || now_().slice(0, 10), debit: String(b.to || 'BNK-101').toUpperCase(), credit: 'ADV-101', amount: refund, party: r.name,
    narration: 'Unspent advance returned: ' + r.id, mode: b.mode || 'Bank transfer', reference: b.reference || '', ref_id: r.id });
  updateRow_('FinRequests', r.id, { status: 'Settled', updated_at: now_(), history: finHist_(r, me.name, 'Settled: spent ' + inr_(spent) + (refund > 0 ? ', returned ' + inr_(refund) : '')) });
  return { ok: true };
}

// ───────── claims against spending approvals ─────────
function finClaim_(me, f, amt, preId) {
  return withLock_(function () {
    const pre = preId ? findRow_('FinRequests', preId) : null;
    if (!pre || pre.kind !== 'Spending approval') throw new Error('You can only claim money for spending that was approved first. Ask for a Spending approval before you spend, then claim against it.');
    if (lc_(pre.email) !== lc_(me.email)) throw new Error('You can only claim against your own spending approval.');
    if (pre.status !== 'Approved') throw new Error(pre.status === 'Claimed' ? 'This spending approval has already been claimed.' : 'Spending approval ' + pre.id + ' is not approved (' + pre.status + ').');
    if (amt > (+pre.amount) + 0.001) throw new Error('You can claim at most ' + inr_(pre.amount) + ', the amount approved in ' + pre.id + '. Anything above it was not approved.');
    const fy = fyOf_(); fyEnsure_(fy);
    const rec = { id: finReqId_(fy), fy: fy, email: lc_(me.email), name: me.name, department_id: pre.department_id, kind: 'Reimbursement', title: f.title || pre.title, amount: String(amt),
      code: (f.code || pre.code || '').toUpperCase(), needed_by: f.needed_by, details: f.details, proof_url: f.proof_url, payee: f.payee || me.name, payee_details: f.payee_details,
      status: 'Approved', head_by: pre.head_by, head_at: pre.head_at, approved_by: 'Pre-approved in ' + pre.id + ' (' + pre.approved_by + ')', approved_at: pre.approved_at, paid_amount: '', note: '',
      entry_id: '', voucher_id: '', created_at: now_(), updated_at: now_(), history: '', pre_id: pre.id };
    rec.history = finHist_(rec, me.name, 'Claimed ' + inr_(amt) + ' against spending approval ' + pre.id + ' (approved ' + inr_(pre.amount) + ')');
    appendRow_('FinRequests', rec);
    updateRow_('FinRequests', pre.id, { status: 'Claimed', updated_at: now_(), history: finHist_(pre, me.name, 'Claimed in ' + rec.id + ' for ' + inr_(amt)) });
    finPayers_().forEach(function (e) { mail_(e, 'Claim to pay ' + rec.id + ': ' + inr_(amt), emailShell_('Reimbursement claim to check and pay',
      '<p><b>' + esc_(me.name) + '</b> claims <b>' + inr_(amt) + '</b> for ' + esc_(rec.title) + ', against spending approval ' + esc_(pre.id) + ' (' + inr_(pre.amount) + ').</p><p>Check the bill matches before paying.</p><p><a href="' + CONFIG.ADMIN_URL + '#finance">Open Finance</a></p>')); });
    audit_(me.email, 'reimbursement claim', rec.id + ' against ' + pre.id);
    return { ok: true, id: rec.id, status: rec.status };
  });
}
function finPayers_() {
  const out = [lc_(CONFIG.SUPER_ADMIN_EMAIL)];
  readAll_('Admins').forEach(function (a) { if (truthy_(a.active) && a.role !== 'super' && String(a.scopes || '').split(',').some(function (x) { return x.trim() === 'finance'; })) out.push(lc_(a.email)); });
  return out.filter(function (x, i) { return out.indexOf(x) === i; });
}
function finReopenPre_(preId, who, why) {
  const pre = findRow_('FinRequests', preId);
  if (pre && pre.status === 'Claimed') updateRow_('FinRequests', pre.id, { status: 'Approved', updated_at: now_(), history: finHist_(pre, who, why + ': can be claimed again') });
}
/** Finance sends a claim back (bill missing, amount doesn't match). The spending approval opens again for a correct claim. */
function finReqReturn_(me, b) {
  finMust_(me);
  const r = finReq_(b.id), note = String(b.note || '').trim().slice(0, 1000);
  if (r.kind !== 'Reimbursement' || r.status !== 'Approved') throw new Error('Only unpaid reimbursement claims can be sent back.');
  if (!note) throw new Error('Say what is wrong with the claim.');
  updateRow_('FinRequests', r.id, { status: 'Rejected', note: note, updated_at: now_(), history: finHist_(r, me.name, 'Sent back: ' + note) });
  if (r.pre_id) finReopenPre_(r.pre_id, me.name, 'Claim ' + r.id + ' sent back');
  finTell_(r, 'Claim ' + r.id + ' sent back', '<p>Your claim for ' + inr_(r.amount) + ' (' + esc_(r.title) + ') was sent back by Finance.</p><p><b>Reason:</b> ' + esc_(note) + '</p><p>You can claim again against ' + esc_(r.pre_id) + ' with the correct bill.</p>');
  audit_(me.email, 'claim returned', r.id);
  return { ok: true };
}

// ───────── journal ─────────
function finPost_(me, b) {
  finMust_(me);
  const kinds = ['Expense', 'Income', 'Sponsorship', 'Transfer', 'Capital', 'Drawing', 'Journal'];
  if (kinds.indexOf(b.kind) < 0) throw new Error('Choose the type of entry.');
  if (b.kind === 'Capital' || b.kind === 'Drawing') finSuper_(me);
  return finPostCore_(me, b);
}
function finEntryId_(fy) { const n = readAll_('FinEntries').filter(function (e) { return e.fy === fy; }).length + 1; return 'JV/' + fy.slice(2) + '/' + ('0000' + n).slice(-5); }
function finPostCore_(me, b) {
  const date = String(b.date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Choose the date of the entry.');
  if (date > Utilities.formatDate(new Date(Date.now() + 2 * 864e5), 'Asia/Kolkata', 'yyyy-MM-dd')) throw new Error('The date cannot be in the future.');
  const amt = money_(b.amount); if (!(amt > 0) || amt > 100000000) throw new Error('Enter a valid amount.');
  const dr = finAccount_(b.debit), cr = finAccount_(b.credit);
  if (dr.code === cr.code) throw new Error('Debit and credit cannot be the same ledger.');
  const narration = String(b.narration || '').trim().slice(0, 600); if (!narration) throw new Error('Write a narration: what this entry is for.');
  const proof = String(b.proof_url || '').trim().slice(0, 500); if (proof && !/^https:\/\//.test(proof)) throw new Error('Proof links must start with https://');
  const rec = withLock_(function () {
    const fy = finOpen_(date);
    const rec = { id: finEntryId_(fy.id), fy: fy.id, date: date, kind: b.kind || 'Journal', debit: dr.code, credit: cr.code, amount: String(amt),
      party: String(b.party || '').slice(0, 160), narration: narration, mode: FIN_MODES.indexOf(b.mode) >= 0 ? b.mode : '', reference: String(b.reference || '').slice(0, 120),
      ref_id: String(b.ref_id || '').slice(0, 40), proof_url: proof, voucher_id: '', voucher_code: '', status: 'Posted', reversal_of: String(b.reversal_of || ''),
      created_by: lc_(me.email), created_at: now_() };
    appendRow_('FinEntries', rec);
    audit_(me.email, 'journal ' + rec.kind, rec.id + ' Dr ' + dr.code + ' Cr ' + cr.code + ' ' + amt);
    return rec;
  });
  let v = null;
  if (b.voucher) { try { v = finIssueVoucher_(me, rec, b.payee_email || ''); } catch (e) { Logger.log('voucher: ' + e); v = { error: e.message }; } }
  return { ok: true, id: rec.id, voucher_id: v && v.id, voucher_code: v && v.code, voucher_error: v && v.error };
}
function finReverse_(me, b) {
  finMust_(me);
  const e = findRow_('FinEntries', b.id); if (!e) throw new Error('Entry not found.');
  if (e.status !== 'Posted' || e.kind === 'Reversal') throw new Error('This entry is already reversed or is itself a reversal.');
  const reason = String(b.reason || '').trim(); if (!reason) throw new Error('Give a reason for the reversal.');
  const date = String(b.date || now_()).slice(0, 10);
  const res = finPostCore_(me, { kind: 'Reversal', date: date, debit: e.credit, credit: e.debit, amount: e.amount, party: e.party, narration: 'Reversal of ' + e.id + ': ' + reason,
    mode: 'Adjustment', ref_id: e.ref_id, reversal_of: e.id });
  updateRow_('FinEntries', e.id, { status: 'Reversed' });
  if (e.voucher_id) try { regVoid_(me, e.voucher_id, 'Entry ' + e.id + ' reversed: ' + reason); } catch (x) { Logger.log(x); }
  return { ok: true, id: res.id };
}

// ───────── vouchers and receipts (Office of the Registrar) ─────────
function amountWords_(n) {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const t = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = function (x) { return x < 20 ? a[x] : t[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : ''); };
  const three = function (x) { return (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : ''); };
  let r = Math.floor(n), p = Math.round((n - r) * 100), out = [];
  [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand']].forEach(function (u) { if (r >= u[0]) { out.push(two(Math.floor(r / u[0])) + ' ' + u[1]); r %= u[0]; } });
  if (r) out.push(three(r));
  return 'Rupees ' + (out.join(' ') || 'Zero') + (p ? ' and ' + two(p) + ' Paise' : '') + ' Only';
}
function finIssueVoucher_(me, e, email) {
  const income = ['Income', 'Sponsorship', 'Capital'].indexOf(e.kind) >= 0;
  const dr = findRow_('FinAccounts', e.debit) || {}, cr = findRow_('FinAccounts', e.credit) || {};
  const rows = [['Voucher for', e.kind + (e.ref_id ? ' · ' + e.ref_id : '')], [income ? 'Received from' : 'Paid to', e.party || '—'], ['Amount', inr_(e.amount)], ['In words', amountWords_(+e.amount)],
    ['Debit', e.debit + ' · ' + (dr.name || '')], ['Credit', e.credit + ' · ' + (cr.name || '')], ['Mode', (e.mode || '—') + (e.reference ? ' · ref ' + e.reference : '')],
    ['Date of transaction', longDate_(e.date)], ['Journal entry', e.id + ' · ' + e.fy]];
  const res = regIssue_(me, { type: income ? 'receipt' : 'voucher', send: !!email, fields: {
    recipient_name: e.party || 'TEDxThaltej Youth', recipient_email: email || '', amount: inr_(e.amount), table_json: JSON.stringify(rows),
    body: income ? 'Received with thanks the amount stated above. This receipt is issued by TEDxThaltej Youth and can be verified using the code below.'
      : 'Narration: ' + e.narration + '\n\nPaid by TEDxThaltej Youth against the approval recorded in its books. This voucher can be verified using the code below.' } }, true);
  updateRow_('FinEntries', e.id, { voucher_id: res.id, voucher_code: res.code });
  return res;
}
function finVoucher_(me, b) {
  finMust_(me);
  const e = findRow_('FinEntries', b.id); if (!e) throw new Error('Entry not found.');
  if (e.voucher_id) return { ok: true, id: e.voucher_id, code: e.voucher_code, existing: true };
  const email = lc_(b.email || ''); if (email && !isEmail_(email)) throw new Error('That email does not look right.');
  const v = finIssueVoucher_(me, e, email);
  return { ok: true, id: v.id, code: v.code };
}

// ───────── set-up: ledgers, years, budgets, pledges ─────────
function finAccountSave_(me, r) {
  finSuper_(me);
  const code = String(r.code || '').toUpperCase().trim();
  if (!/^[A-Z]{2,5}-\d{3}$/.test(code)) throw new Error('Ledger codes look like EME-105: 2–5 letters, a hyphen, 3 digits.');
  if (FIN_TYPES.indexOf(r.type) < 0) throw new Error('Choose the ledger type.');
  const name = String(r.name || '').trim().slice(0, 100); if (!name) throw new Error('Name the ledger.');
  const rec = { code: code, name: name, type: r.type, grp: String(r.grp || '').slice(0, 60), active: truthy_(r.active) ? 'TRUE' : 'FALSE', description: String(r.description || '').slice(0, 300), sort: String(r.sort || '') };
  const old = findRow_('FinAccounts', code);
  if (old) {
    if (old.type !== rec.type && readAll_('FinEntries').some(function (e) { return e.debit === code || e.credit === code; })) throw new Error('This ledger has entries, so its type cannot change.');
    updateRow_('FinAccounts', code, rec);
  } else { rec.sort = rec.sort || String(readAll_('FinAccounts').length + 1); appendRow_('FinAccounts', rec); }
  audit_(me.email, 'ledger saved', code + ' ' + name);
  return { ok: true };
}
function finYearSave_(me, b) {
  finSuper_(me);
  const id = String(b.id || ''); if (!/^FY\d{4}-\d{2}$/.test(id)) throw new Error('Unknown year.');
  const y = fyEnsure_(id);
  if (b.status === 'Closed') {
    const open = readAll_('FinRequests').filter(function (r) { return r.fy === id && ['Approved', 'Paid'].indexOf(r.status) >= 0 && !(r.kind !== 'Advance' && r.status === 'Paid'); });
    if (open.length && !b.force) throw new Error(open.length + ' request(s) in this year are approved but unpaid or unsettled advances: ' + open.map(function (r) { return r.id; }).join(', ') + '.');
    updateRow_('FinYears', id, { status: 'Closed', closed_at: now_(), closed_by: lc_(me.email) });
  } else if (b.status === 'Open') {
    if (!String(b.reason || '').trim()) throw new Error('Give a reason for reopening a closed year.');
    updateRow_('FinYears', id, { status: 'Open', closed_at: '', closed_by: '' });
  }
  audit_(me.email, 'financial year ' + (b.status || 'saved'), id + (b.reason ? ' · ' + b.reason : ''));
  return { ok: true, year: findRow_('FinYears', y.id) };
}
function finBudgetSave_(me, b) {
  finSuper_(me);
  const y = fyEnsure_(b.fy || fyOf_()), out = {};
  Object.keys(b.budgets || {}).forEach(function (k) { const v = money_(b.budgets[k]); if (v > 0 && findRow_('FinAccounts', k)) out[k] = v; });
  updateRow_('FinYears', y.id, { budgets_json: JSON.stringify(out) });
  audit_(me.email, 'budgets saved', y.id);
  return { ok: true };
}
function finPledgeSave_(me, r) {
  finMust_(me);
  const amt = money_(r.committed); if (!(amt > 0)) throw new Error('Enter the amount committed.');
  const sponsor = String(r.sponsor || '').trim().slice(0, 160); if (!sponsor) throw new Error('Name the sponsor.');
  const rec = { sponsor: sponsor, tier: String(r.tier || '').slice(0, 40), committed: String(amt), due_date: String(r.due_date || '').slice(0, 10), contact: String(r.contact || '').slice(0, 160),
    status: ['Committed', 'Agreement signed', 'Part received', 'Received', 'Cancelled'].indexOf(r.status) >= 0 ? r.status : 'Committed', notes: String(r.notes || '').slice(0, 1000) };
  if (r.id && findRow_('FinPledges', r.id)) updateRow_('FinPledges', r.id, rec);
  else { rec.id = newId_('SPN'); rec.fy = fyOf_(r.due_date || now_()); rec.created_at = now_(); appendRow_('FinPledges', rec); }
  audit_(me.email, 'pledge saved', sponsor + ' ' + amt);
  return { ok: true };
}
function finPledgeRemove_(me, id) {
  finSuper_(me);
  if (readAll_('FinEntries').some(function (e) { return e.ref_id === id && e.status === 'Posted'; })) throw new Error('Money has been received against this pledge. Mark it Cancelled instead.');
  deleteRow_('FinPledges', id); return { ok: true };
}
