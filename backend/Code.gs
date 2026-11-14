/**
 * TEDxThaltej Youth — one backend for the whole site
 * Website data, forms, registrations, the Team page feed, the AIS Steward Desk,
 * partners, and the Team Portal (tasks, roles, inbox). Google Apps Script bound to
 * one Google Sheet. Files: Code.gs (core + portal), Feeds.gs, Ais.gs (Steward Desk), Docs.gs + Speakers.gs (Speaker Portal),
 * Mail.gs (Zoho Mail), Charter.gs + Recruit.gs (team recruitment), Intra.gs (Team Mail), Rehearsals.gs,
 * Events.gs (side events, feedback, NPS), News.gs, Identity.gs (signing evidence), Letterhead.gs + Registrar.gs,
 * Council.gs (elections, RTI, hearings, withdrawal), Tes.gs (claimable tasks, meetings, awards, grievances, locks).
 *
 * One web-app URL serves both pages:
 *   GET  ?action=site            -> public site data (JSON, cached)
 *   POST {action:'submit'|'register'|'login'|...}  (body sent as text/plain JSON)
 */

// ───────────────────────────── CONFIG ─────────────────────────────
const CONFIG = {
  SUPER_ADMIN_EMAIL: 'fenil@fenilpshah.com',
  SUPER_ADMIN_NAME: 'Fenil Pritesh Shah',
  SENDER_NAME: 'TEDxThaltej Youth',
  FROM_ALIAS: '',            // optional: a "Send mail as" alias on the script owner's Gmail, e.g. 'contact@tedxthaltejyouth.in'
  REPLY_TO: '',              // optional reply-to address for outgoing mail
  SITE_URL: 'https://tedxthaltejyouth.in',
  ADMIN_URL: 'https://tedxthaltejyouth.in/portal',
  SESSION_MINUTES: 30,       // sliding: renewed on every admin action
  OTP_MINUTES: 10,
  HASH_ROUNDS: 300,
  SITE_CACHE_SECONDS: 300,
};

// Sheet tabs and their columns. First column is the row key.
const SCHEMA = {
  Settings:      ['key', 'value'],
  Editions:      ['id', 'number', 'date', 'title', 'theme', 'description', 'venue', 'page_url', 'image_url', 'video_url', 'published'],
  Speakers:      ['id', 'name', 'designation', 'talk_title', 'bio', 'photo_url', 'edition_id', 'video_url', 'sort', 'published',
                  'email', 'phone', 'address', 'under_18', 'ambassador_email', 'stage', 'portal_active', 'salt', 'hash', 'pw_version', 'invite_hash', 'invite_expires', 'last_login', 'locked_until', 'lock_reason',
                  'selection', 'interview_at', 'interview_minutes', 'interview_link', 'interview_event_id', 'interview_note', 'availability_json', 'linkedin', 'photo_file_id', 'profile_updated_at', 'bio_short', 'bio_line',
                  'community', 'cm_status', 'cm_claim_email', 'cm_joined_at', 'cm_mail', 'cm_token', 'google_sub', 'google_email', 'google_linked_at', 'cm_phone', 'cm_directory', 'cm_offers', 'cm_offer_note',
                  'kind', 'side_event_id', 'cm_public', 'slug'],
  Agreements:    ['id', 'speaker_id', 'edition_id', 'signed_at', 'speaker_name', 'guardian_name', 'under_18', 'personal_json', 'doc_hashes', 'user_agent',
                  'sig_file_id', 'guardian_sig_file_id', 'pdf_file_id', 'status', 'countersigned_by', 'countersigned_at', 'org_sig_file_id', 'final_pdf_file_id', 'evidence_json', 'org_evidence_json'],
  Drafts:        ['id', 'speaker_id', 'version', 'status', 'title', 'body', 'text_hash', 'factcheck_json', 'sources_json', 'doc_id', 'submitted_at',
                  'reviewed_by', 'reviewed_at', 'feedback', 'comments_json', 'updated_at', 'curation_json'],
  Departments:   ['id', 'name', 'description', 'lead', 'sort'],
  Team:          ['id', 'name', 'role', 'department_id', 'edition_id', 'email', 'phone', 'photo_url', 'bio', 'linkedin', 'sort', 'published'],
  Submissions:   ['id', 'type', 'name', 'email', 'phone', 'organisation', 'subject', 'message', 'status', 'department_id', 'notes', 'created_at', 'updated_at'],
  Registrations: ['id', 'name', 'email', 'phone', 'age', 'institution', 'city', 'why', 'status', 'ticket_code', 'checked_in', 'created_at', 'updated_at', 'payment_id'],
  Sponsors:      ['id', 'name', 'tier', 'logo_url', 'website', 'edition_id', 'description', 'sort', 'published'],
  Tasks:         ['id', 'title', 'description', 'department_id', 'assigned_to', 'assigned_by', 'priority', 'due_date', 'status', 'comments', 'created_at', 'updated_at', 'claimed_at', 'proof_json', 'approvers', 'approvals_json'],
  Stewards:      ['id', 'name', 'email', 'phone', 'city', 'community', 'salt', 'hash', 'pw_version', 'active', 'created_at', 'last_login', 'locked_until', 'lock_reason'],
  Referrals:     ['ref', 'cycle', 'steward_id', 'steward_email', 'person_name', 'person_role', 'age_group', 'language', 'contact', 'q1', 'q2', 'q3', 'guardian_aware', 'status', 'notes', 'created_at', 'updated_at'],
  Admins:        ['email', 'name', 'role', 'scopes', 'department_id', 'salt', 'hash', 'active', 'must_change', 'last_login', 'created_at', 'registrar', 'locked_until', 'lock_reason', 'joined_on', 'bodies', 'extra_departments', 'google_sub', 'google_email', 'google_linked_at', 'external', 'qac_expertise', 'qac_term_until', 'qac_declared_at', 'qac_conflicts'],
  Applicants:    ['id', 'cycle', 'created_at', 'name', 'email', 'phone', 'age', 'institution', 'grade', 'city', 'departments', 'licenses', 'experience', 'why', 'plan', 'portfolio',
                  'status', 'interview_at', 'interview_minutes', 'interviewers', 'meet_link', 'event_id', 'score_avg', 'assigned_department', 'assigned_role',
                  'decided_by', 'decided_at', 'decision_note', 'onboard_hash', 'onboard_expires', 'charter_signed_at', 'charter_version', 'charter_hash',
                  'charter_pdf_id', 'sig_file_id', 'member_email', 'updated_at', 'evidence_json', 'source', 'portal_role', 'portal_scopes', 'link_id', 'joined_on'],
  Scores:        ['id', 'applicant_id', 'reviewer', 'marks_json', 'total', 'note', 'created_at'],
  Messages:      ['id', 'thread_id', 'from_email', 'from_name', 'to_json', 'to_label', 'subject', 'body', 'created_at'],
  Mailbox:       ['key', 'msg_id', 'thread_id', 'email', 'folder', 'read', 'starred', 'updated_at'],
  Rehearsals:    ['id', 'speaker_id', 'type', 'starts_at', 'minutes', 'location', 'meet_link', 'event_id', 'agenda', 'status', 'speaker_reply', 'speaker_note',
                  'notes', 'team', 'created_by', 'created_at', 'updated_at'],
  SideEvents:    ['id', 'slug', 'title', 'subtitle', 'banner_url', 'starts_at', 'ends_at', 'venue', 'map_url', 'description', 'agenda_json', 'host',
                  'reg_mode', 'reg_link', 'reg_open', 'capacity', 'extra_fields', 'published', 'feedback_token', 'purged_at',
                  'nps_score', 'nps_responses', 'nps_promoters', 'nps_passives', 'nps_detractors', 'created_at', 'updated_at', 'price'],
  EventRegs:     ['id', 'event_id', 'name', 'email', 'phone', 'institution', 'age', 'city', 'grade', 'created_at', 'status', 'payment_id'],
  Payments:      ['id', 'fy', 'token', 'purpose', 'title', 'ref_id', 'event_id', 'name', 'email', 'phone', 'amount', 'message', 'show_name', 'utr', 'status', 'note',
                  'submitted_at', 'verified_by', 'verified_at', 'entry_id', 'receipt_code', 'created_at', 'updated_at', 'shot_file_id', 'shot_hash'],
  EventFeedback: ['id', 'event_id', 'nps', 'liked', 'improve', 'email', 'created_at'],
  NpsLog:        ['event_id', 'title', 'event_date', 'responses', 'promoters', 'passives', 'detractors', 'nps', 'avg', 'scores', 'logged_at'],
  News:          ['id', 'slug', 'title', 'summary', 'body', 'image_url', 'image_alt', 'image_credit', 'author', 'category', 'tags', 'status',
                  'published_at', 'created_by', 'created_at', 'updated_at'],
  Register:      ['id', 'code', 'type', 'title', 'recipient_name', 'recipient_email', 'fields_json', 'issued_by', 'issued_at', 'status', 'void_reason', 'voided_by', 'voided_at',
                  'file_id', 'request_id', 'seal_codes', 'pages', 'notes'],
  Requests:      ['id', 'email', 'name', 'type', 'purpose', 'details', 'status', 'doc_id', 'registrar_note', 'created_at', 'updated_at'],
  Elections:     ['id', 'title', 'role', 'description', 'apply_until', 'vote_from', 'vote_until', 'status', 'council_size', 'created_by', 'created_at', 'updated_at',
                  'verified_by', 'verified_at', 'confirmed_id', 'confirmed_name', 'override', 'override_reason', 'confirmed_at'],
  Candidates:    ['id', 'election_id', 'email', 'name', 'intent', 'experience', 'vision', 'links', 'status', 'created_at'],
  Votes:         ['key', 'election_id', 'voter', 'choice', 'created_at'],
  Rti:           ['id', 'email', 'name', 'subject', 'matter', 'question', 'status', 'answer', 'withheld', 'withheld_category', 'answered_at', 'created_at'],
  Motions:       ['id', 'type', 'title', 'matter', 'grounds_json', 'facts', 'prior_hearing', 'proposer_email', 'proposer_name', 'status', 'council_size', 'created_at', 'closes_at',
                  'verified_by', 'verified_at', 'outcome'],
  Supports:      ['key', 'motion_id', 'email', 'created_at'],
  Withdrawals:   ['id', 'email', 'name', 'confirm_intent', 'ack_obligations', 'pending', 'handover', 'claims', 'reason', 'open_requests', 'sig_file_id', 'evidence_json',
                  'status', 'acknowledged_by', 'effective_date', 'created_at'],
  Meetings:      ['id', 'title', 'starts_at', 'minutes', 'location', 'link', 'agenda', 'audience', 'event_id', 'created_by', 'created_at', 'updated_at'],
  Attendance:    ['key', 'meeting_id', 'email', 'status', 'marked_by', 'marked_at'],
  Awards:        ['id', 'email', 'name', 'award', 'citation', 'awarded_by', 'awarded_at', 'edition_id', 'doc_id'],
  Grievances:    ['id', 'email', 'name', 'subject', 'category', 'status', 'created_at', 'updated_at'],
  GrievanceMsgs: ['id', 'case_id', 'from_email', 'from_name', 'body', 'links', 'created_at'],
  Audit:         ['time', 'email', 'action', 'detail'],
  // FinanceOS (Finance.gs)
  FinAccounts:   ['code', 'name', 'type', 'grp', 'active', 'description', 'sort'],
  FinYears:      ['id', 'label', 'starts', 'ends', 'status', 'closed_at', 'closed_by', 'budgets_json'],
  FinEntries:    ['id', 'fy', 'date', 'kind', 'debit', 'credit', 'amount', 'party', 'narration', 'mode', 'reference', 'ref_id', 'proof_url', 'voucher_id', 'voucher_code',
                  'status', 'reversal_of', 'created_by', 'created_at'],
  FinRequests:   ['id', 'fy', 'email', 'name', 'department_id', 'kind', 'title', 'amount', 'code', 'needed_by', 'details', 'proof_url', 'payee', 'payee_details', 'status',
                  'head_by', 'head_at', 'approved_by', 'approved_at', 'paid_amount', 'note', 'entry_id', 'voucher_id', 'created_at', 'updated_at', 'history', 'pre_id'],
  FinPledges:    ['id', 'fy', 'sponsor', 'tier', 'committed', 'due_date', 'contact', 'status', 'notes', 'created_at'],
  // Security: devices that passed 2-step sign-in ("trust this device for 30 days")
  TrustedDevices: ['id', 'email', 'hash', 'expires', 'ua', 'created_at'],
  EmailQueue:    ['id', 'created_at', 'to', 'subject', 'html', 'html_file', 'attachments', 'reply_to', 'status', 'tries', 'last_error', 'sent_at', 'reason', 'bulk'],
  ErrorLog:      ['time', 'kind', 'message', 'detail'],
  Traffic:       ['hour', 'gets', 'posts'],
  IdcCases:      ['id', 'title', 'kind', 'source', 'reported_by', 'subject_email', 'allegations', 'links', 'status', 'notified', 'hearing_at', 'hearing_link',
                  'findings', 'recommendation', 'decision', 'decided_by', 'decided_at', 'recused', 'motion_id', 'created_at', 'updated_at'],
  IdcMsgs:       ['id', 'case_id', 'channel', 'from_email', 'body', 'created_at'],
  DesignRequests: ['id', 'title', 'kind', 'size', 'purpose', 'copy_text', 'refs', 'deadline', 'priority', 'public', 'requested_by', 'req_department', 'assignee', 'status',
                  'canva_edit', 'canva_view', 'approvers', 'approvals_json', 'final_version', 'final_file_id', 'final_link', 'edition_id', 'tags', 'created_at', 'updated_at'],
  DesignVersions: ['id', 'request_id', 'v', 'canva_view', 'file_id', 'file_name', 'file_type', 'link', 'note', 'by', 'status', 'checks_json', 'created_at'],
  DesignMsgs:    ['id', 'request_id', 'email', 'body', 'created_at'],
  BrandKit:      ['id', 'kind', 'name', 'value', 'link', 'file_id', 'note', 'sort', 'created_at'],
  OfficialMails: ['id', 'by', 'from_local', 'domain', 'name_mode', 'from_name', 'to_list', 'cc_list', 'bcc_list', 'subject', 'body', 'signature', 'attachments_json', 'cc_self',
                  'reply_to', 'status', 'note', 'decided_by', 'decided_at', 'sent_at', 'error', 'created_at', 'updated_at'],
  Broadcasts:    ['id', 'subject', 'body', 'audience', 'recipients', 'sent', 'queued', 'by', 'also_team_mail', 'created_at'],
  AdviceAsks:    ['id', 'title', 'question', 'due', 'status', 'summary', 'created_at'],
  AdviceReplies: ['id', 'ask_id', 'email', 'body', 'created_at'],
  QacItems:      ['id', 'kind', 'title', 'detail', 'links', 'department_id', 'concerned_email', 'created_by', 'assigned_to', 'questions_json', 'status', 'reply_by', 'source_id', 'auto',
                  'reminders', 'rating', 'outcome', 'ai_note', 'replied_at', 'escalated_at', 'created_at', 'updated_at', 'closed_at'],
  CommunityLinks: ['id', 'token_hash', 'edition_id', 'note', 'created_by', 'created_at', 'expires', 'max_uses', 'uses', 'status'],
  CommunityFeedback: ['id', 'speaker_id', 'name', 'kind', 'about', 'rating', 'message', 'publish_ok', 'status', 'reply', 'created_at'],
  CommunityPosts: ['id', 'title', 'body', 'link', 'link_label', 'pinned', 'status', 'created_by', 'created_at'],
  CommunityRsvps: ['id', 'event_id', 'speaker_id', 'name', 'status', 'created_at', 'updated_at'],
  CommunityMails: ['id', 'subject', 'audience', 'count', 'sent_by', 'sent_at'],
  Outreach:      ['id', 'company', 'industry', 'website', 'city', 'contact_name', 'contact_role', 'email', 'phone', 'linkedin', 'tier', 'owner_email', 'status', 'notes', 'next_step', 'next_date',
                  'ref', 'last_subject', 'first_sent_at', 'last_contact_at', 'followups_sent', 'next_followup_at', 'auto_followups', 'replied_at', 'created_by', 'created_at', 'updated_at'],
  TtrisRefs:     ['ref', 'kind', 'rec_id', 'subject', 'to_email', 'created_at', 'last_out_at', 'last_in_at'],
  TtrisMsgs:     ['id', 'ref', 'direction', 'from_email', 'from_name', 'to_email', 'subject', 'body', 'zoho_id', 'received_at', 'auto', 'status', 'kind', 'rec_id'],
  QacMsgs:       ['id', 'item_id', 'channel', 'from_email', 'body', 'created_at'],
  QacRecs:       ['id', 'item_id', 'title', 'detail', 'department_id', 'owner_email', 'due', 'status', 'response', 'created_by', 'created_at', 'responded_at', 'closed_at'],
  QacMeetings:   ['id', 'title', 'at', 'link', 'agenda', 'minutes', 'decisions', 'attendees', 'created_by', 'created_at'],
  QacReports:    ['id', 'cycle', 'date_from', 'date_to', 'status', 'body', 'metrics_json', 'reg_id', 'created_at', 'updated_at', 'issued_at'],
  OnboardLinks:  ['id', 'token_hash', 'note', 'created_by', 'created_at', 'expires', 'max_uses', 'uses', 'status'],
  // Community updates (Subscribe.gs)
  Subscribers:   ['email', 'name', 'status', 'source', 'token', 'created_at', 'confirmed_at', 'updated_at', 'last_sent'],
  SubCampaigns:  ['id', 'subject', 'html', 'created_by', 'created_at', 'sent', 'total', 'status', 'done_at'],
};

// Admin console modules -> sheet tab
const MODULES = {
  settings: 'Settings', editions: 'Editions', speakers: 'Speakers', departments: 'Departments',
  team: 'Team', submissions: 'Submissions', registrations: 'Registrations', sponsors: 'Sponsors', tasks: 'Tasks',
  stewards: 'Stewards', referrals: 'Referrals', admins: 'Admins', audit: 'Audit',
};
const EDITABLE_SCOPES = ['settings', 'editions', 'speakers', 'sponsors', 'departments', 'team', 'tasks', 'submissions', 'registrations', 'stewards', 'referrals', 'recruit', 'events', 'news', 'finance', 'design', 'outreach', 'inbox'];
const SUPER_ONLY = ['admins', 'audit'];
const DEPT_SCOPED = ['team', 'submissions', 'tasks']; // users tied to a department only see their department's rows here
/*
 * Roles
 *   super  – licensee / full control, manages users and sees the audit log
 *   lead   – department head: edits the sections in their scopes, limited to their own department for
 *            team / tasks / submissions; can add 'member' accounts to their department and assign them tasks
 *   editor – edits the sections in their scopes (department-limited if a department is set)
 *   viewer – read-only on their scopes
 *   member – team member: only sees "My tasks" (update status, comment)
 * Every role, including member, gets "My tasks".
 */
const ROLES = ['super', 'lead', 'editor', 'viewer', 'member'];
const TASK_STATUSES = ['To do', 'In progress', 'Blocked', 'Submitted', 'Awaiting approval', 'Done'];
const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

const SUBMISSION_TYPES = ['Contact', 'Volunteer', 'Partner', 'Sponsor', 'Media'];
const SUBMISSION_STATUSES = ['New', 'In progress', 'Replied', 'Closed'];
const REG_STATUSES = ['Pending', 'Payment pending', 'Approved', 'Waitlisted', 'Rejected', 'Cancelled'];

// Settings safe to show on the public site
const PUBLIC_SETTINGS = ['event_name', 'event_date', 'event_time', 'theme', 'tagline', 'venue', 'registration_open',
  'registration_note', 'contact_email', 'instagram', 'youtube', 'linkedin', 'ais_url', 'about', 'highlight_video', 'ticket_price'];

// ───────────────────────────── SETUP ─────────────────────────────
/** Run once from the Apps Script editor. Creates tabs, seeds data and the super-admin. Safe to re-run. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMA).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const cols = SCHEMA[name];
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#111').setFontColor('#fff');
      sh.setFrozenRows(1);
      sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@'); // keep everything as plain text
    } else if (sh.getLastColumn() < cols.length) { // a newer version added columns at the end: add their headers
      sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#111').setFontColor('#fff');
      sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@');
    }
  });
  const s1 = ss.getSheetByName('Sheet1');
  if (s1 && s1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s1);

  seedIfEmpty_();

  const admins = readAll_('Admins');
  if (!admins.some(function (a) { return lc_(a.email) === lc_(CONFIG.SUPER_ADMIN_EMAIL); })) {
    const temp = randomPassword_();
    const salt = Utilities.getUuid();
    appendRow_('Admins', {
      email: lc_(CONFIG.SUPER_ADMIN_EMAIL), name: CONFIG.SUPER_ADMIN_NAME, role: 'super', scopes: 'all', department_id: '',
      salt: salt, hash: hash_(temp, salt), active: 'TRUE', must_change: 'TRUE', last_login: '', created_at: now_(),
    });
    Logger.log('Super-admin created: ' + CONFIG.SUPER_ADMIN_EMAIL + '  temporary password: ' + temp);
    try { sendWelcome_(CONFIG.SUPER_ADMIN_EMAIL, CONFIG.SUPER_ADMIN_NAME, temp, 'super'); } catch (e) { Logger.log('Mail failed: ' + e); }
  }
  Logger.log('Setup complete.');
}

function seedIfEmpty_() {
  if (readAll_('Settings').length === 0) {
    const s = {
      event_name: 'TEDxThaltej Youth 2027', event_date: '2027-06-26', event_time: '10:00', theme: 'The Zenith',
      tagline: 'Where the Unseen Connects', venue: 'Ahmedabad, Gujarat', registration_open: 'TRUE', capacity: '100',
      registration_note: 'Seats are limited. Every registration is reviewed and confirmed by email.',
      contact_email: 'info@tedxthaltejyouth.in', instagram: 'https://www.instagram.com/tedxthaltejyouth', youtube: 'https://youtu.be/GG64ZSxIqtQ', linkedin: 'https://www.linkedin.com/company/tedxthaltej-youth/',
      ais_url: '/ais', highlight_video: '3nWF4UE4RL4', ais_referral_limit: '5', ais_cycle: '2627', ais_notify_email: 'ais@tedxthaltejyouth.in',
      organizer_name: 'Fenil Shah', speaker_contact_email: 'info@tedxthaltejyouth.in', speaker_draft_due: '2027-05-15', gemini_model: 'gemini-flash-latest',
      about: 'TEDxThaltej Youth is an independently organised TEDx event in Ahmedabad that gives young people a stage for ideas worth spreading.',
    };
    Object.keys(s).forEach(function (k) { appendRow_('Settings', { key: k, value: s[k] }); });
  }
  // Settings added in later versions: filled in on existing Sheets too, without touching values you changed.
  const later = { recruit_open: 'TRUE', recruit_cycle: '2026-27', recruit_deadline: '', recruit_interview_minutes: '20',
    recruit_intro: 'Join the young team that builds TEDxThaltej Youth: curation, design, operations, partnerships, media and more.',
    recruit_criteria: 'Communication,Understanding of TEDx,Initiative,Role fit,Commitment',
    recruit_licenses: 'TEDxThaltej Youth,TEDxThaltej Salon,TEDxThaltej Women', registrar_email: 'registrar@tedxthaltejyouth.in', intramail_notify: 'TRUE', groq_model: 'openai/gpt-oss-120b',
    fin_staff_limit: '2000', two_factor: 'privileged', login_alerts: 'TRUE', maintenance_mode: 'FALSE', maintenance_message: 'The Team Portal is down for a short upgrade. Please try again soon.', idc_chair_email: '' };
  const have = settingsMap_();
  Object.keys(later).forEach(function (k) { if (have[k] === undefined) appendRow_('Settings', { key: k, value: later[k] }); });
  seedContent_();
  try { installTriggers_(); } catch (e) { Logger.log('Could not install the daily trigger yet: ' + e.message); } // Feeds.gs: real editions, speakers and team from the existing pages
}

/**
 * Run once from the editor whenever Google asks for new permissions (for example after adding
 * Speakers.gs or Recruit.gs). It touches every Google service the site uses, so one approval covers all.
 */
function authorize() {
  DriveApp.getRootFolder().getName();                          // signed agreements + Charter PDFs
  recordsFolder_(); teamRecordsFolder_('Charter acceptances'); // creates the record folders now, proving Drive write access
  const tmpDoc = DocumentApp.create('TEDxTY permission check'); // letters on the letterhead (Office of the Registrar)
  DriveApp.getFileById(tmpDoc.getId()).setTrashed(true);
  const tmpDeck = SlidesApp.create('TEDxTY permission check');   // certificates and IDs
  DriveApp.getFileById(tmpDeck.getId()).setTrashed(true);
  CalendarApp.getDefaultCalendar().getName();                  // interview invites
  MailApp.getRemainingDailyQuota();                            // Admin Health: emails left today
  Maps.newGeocoder().reverseGeocode(23.05, 72.5);              // nearest place for signing evidence
  GmailApp.getAliases();                                       // email (fallback when Zoho is not connected)
  UrlFetchApp.getRequest('https://www.google.com');            // Zoho Mail + Gemini
  SpreadsheetApp.getActiveSpreadsheet().getName();
  installTriggers_();                                          // daily: delete side-event data 7 days after each event
  Logger.log('All permissions granted for ' + Session.getEffectiveUser().getEmail() + '. Folders ready: ' + recordsFolder_().getUrl());
  Logger.log('Now: Deploy → Manage deployments → Edit → Execute as: Me, Who has access: Anyone → Version: New version → Deploy.');
}

// ───────────────────────────── HTTP ─────────────────────────────
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'site';
  trafficHit_('get');
  try {
    if (action === 'site') return json_({ ok: true, data: getSite_() });
    if (action === 'team') return jsonp_(teamFeed_(), e.parameter.callback);
    if (action === 'partners') return json_({ ok: true, partners: partnersFeed_() });
    if (action === 'events') return json_(eventsFeed_());
    if (action === 'news') return json_(newsFeed_());
    if (action === 'article') return json_(newsArticle_(e.parameter.slug));
    if (action === 'ping') return json_({ ok: true, time: now_() });
    if (action === 'health') { // open <web-app-url>?action=health to check who the site runs as and that Drive works
      const out = { ok: true, runsAs: Session.getEffectiveUser().getEmail() || '(hidden: deployment is not "Execute as: Me")' };
      try { recordsFolder_(); teamRecordsFolder_('Charter acceptances'); out.drive = 'ok'; } catch (x) { out.ok = false; out.drive = String(x.message || x); }
      return json_(out);
    }
    return json_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    if (isSystemError_(err)) opsLog_('error', String(err.message || err), 'GET ' + action + '\n' + (err.stack || ''));
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  let body = {};
  if (e && e.postData && e.postData.contents && e.postData.contents.length > 30 * 1024 * 1024) return json_({ ok: false, error: 'That upload is too large.' });
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) { return json_({ ok: false, error: 'Bad request' }); }
  const a = body.action;
  const gate = opsGate_(a, trafficHit_('post'));
  if (gate) return json_(gate);
  try {
    // Speaker Portal (/speaker): its own accounts
    if (String(a).indexOf('spk_') === 0) return json_(speakerHandle_(a.slice(4), body));
    // Speaker Community (/community): joining with the shared link, Google sign-in, unsubscribe
    if (String(a).indexOf('cm_') === 0) return json_(communityHandle_(a.slice(3), body));
    // AIS Steward Desk (/ais/apply): its own accounts, separate from team accounts
    if (String(a).indexOf('ais_') === 0) return json_(aisHandle_(a.slice(4), body));
    // Team recruitment (/join): application form and Charter signing
    if (String(a).indexOf('rec_') === 0) return json_(recruitHandle_(a.slice(4), body));
    // Side events (/events): registration and feedback
    if (String(a).indexOf('evt_') === 0) return json_(eventsHandle_(a.slice(4), body));
    if (String(a).indexOf('pay_') === 0) return json_(payHandle_(a.slice(4), body));
    // Office of the Registrar: public verification (/verify)
    if (a === 'reg_verify') return json_(regVerify_(body.code));
    // Community updates (/subscribe and the footer box)
    if (String(a).indexOf('sub_') === 0) return json_(subHandle_(a.slice(4), body));
    // Public
    if (a === 'submit') return json_(publicSubmit_(body));
    if (a === 'register') return json_(publicRegister_(body));
    // Auth
    if (a === 'login') return json_(login_(body));
    if (a === 'login2') return json_(login2_(body));
    if (a === 'loginGoogle') return json_(loginGoogle_(body));
    if (a === 'googleConfig') return json_({ ok: true, client_id: gConf_().client_id });
    if (a === 'forgot') return json_(forgot_(body));
    if (a === 'reset') return json_(reset_(body));
    // Everything below needs a session
    const me = auth_(body.token);
    if (a === 'logout') { CacheService.getScriptCache().remove('s_' + body.token); return json_({ ok: true }); }
    if (a === 'me') return json_({ ok: true, me: publicAdmin_(me) });
    if (a === 'changePassword') return json_(changePassword_(me, body));
    if (a === 'googleLink') return json_(googleLink_(me, body));
    if (a === 'googleSettings') return json_(googleSettings_(me, body));   // before the gate, so the Organizer can always fix the setup
    if (needsGoogle_(me)) throw new Error('Connect your Google account to continue.');   // required once the Organizer turns it on
    // Outside QAC members: their account opens the QAC area (and their own sign-in settings) only
    if (truthy_(me.external) && String(a).indexOf('qac') !== 0 && ['googleUnlink', 'devices', 'deviceRemove', 'logoutAll'].indexOf(a) < 0) throw new Error('Your account opens the QAC area only.');
    if (a === 'googleUnlink') return json_(googleUnlink_(me, body));
    if (a === 'dashboard') return json_(dashboard_(me));
    if (a === 'list') return json_(list_(me, body.module));
    if (a === 'save') return json_(save_(me, body.module, body.record || {}));
    if (a === 'remove') return json_(remove_(me, body.module, body.id));
    if (a === 'saveSettings') return json_(saveSettings_(me, body.settings || {}));
    if (a === 'reply') return json_(reply_(me, body.id, body.message));
    if (a === 'decide') return json_(decide_(me, body.id, body.status, body.message));
    if (a === 'checkIn') return json_(checkIn_(me, body.id, body.value));
    if (a === 'resetAdmin') return json_(resetAdmin_(me, body.email));
    if (a === 'myTasks') return json_(myTasks_(me));
    if (a === 'updateTask') return json_(updateMyTask_(me, body.id, body.status, body.comment));
    if (a === 'assignees') return json_({ ok: true, rows: assignees_(me) });
    if (a === 'zohoStatus') return json_(zohoStatus_(me));
    if (a === 'zohoConnect') return json_(zohoConnect_(me, body));
    if (a === 'zohoTest') return json_(zohoTest_(me, body.to));
    if (a === 'zohoDisconnect') return json_(zohoDisconnect_(me));
    if (a === 'recList') return json_(recList_(me));
    if (a === 'recImportPreview') return json_(recImportPreview_(me, body));
    if (a === 'recImport') return json_(recImport_(me, body));
    if (a === 'recDetail') return json_(recDetail_(me, body.id));
    if (a === 'recShortlist') return json_(recShortlist_(me, body.id, body.note));
    if (a === 'recSchedule') return json_(recSchedule_(me, body));
    if (a === 'recScore') return json_(recScore_(me, body.id, body.marks, body.note));
    if (a === 'recDecide') return json_(recDecide_(me, body));
    if (a === 'recResend') return json_(recResend_(me, body.id));
    if (a === 'recInviteExisting') return json_(recInviteExisting_(me, body));
    if (a === 'teamLinkCreate') return json_(teamLinkCreate_(me, body));
    if (a === 'teamLinks') return json_(teamLinks_(me));
    if (a === 'teamLinkClose') return json_(teamLinkClose_(me, body.id));
    if (a === 'teamActivate') return json_(teamActivate_(me, body));
    if (a === 'recPdf') return json_(recPdf_(me, body.id));
    // Registrar
    if (a === 'regList') return json_(regList_(me));
    if (a === 'regIssue') return json_(regIssue_(me, body));
    if (a === 'regVoid') return json_(regVoid_(me, body.id, body.reason));
    if (a === 'regPdf') return json_(regPdf_(me, body.id));
    if (a === 'regResend') return json_(regResend_(me, body.id));
    if (a === 'orgSigSave') return json_(orgSigSave_(me, body.signature));
    if (a === 'myDocs') return json_(myDocs_(me));
    if (a === 'reqNew') return json_(reqNew_(me, body));
    if (a === 'reqDecline') return json_(reqDecline_(me, body.id, body.note));
    // Charter tools
    if (a === 'govBoot') return json_(govBoot_(me));
    if (a === 'elSave') return json_(elSave_(me, body));
    if (a === 'elApply') return json_(elApply_(me, body));
    if (a === 'elWithdrawApp') return json_(elWithdrawApp_(me, body.id));
    if (a === 'elVote') return json_(elVote_(me, body));
    if (a === 'elVerify') return json_(elVerify_(me, body.id));
    if (a === 'elConfirm') return json_(elConfirm_(me, body));
    if (a === 'rtiNew') return json_(rtiNew_(me, body));
    if (a === 'rtiAnswer') return json_(rtiAnswer_(me, body));
    if (a === 'moNew') return json_(moNew_(me, body));
    if (a === 'moSupport') return json_(moSupport_(me, body.id, body.on !== false));
    if (a === 'moVerify') return json_(moVerify_(me, body.id));
    if (a === 'moClose') return json_(moClose_(me, body.id, body.outcome));
    if (a === 'wdNew') return json_(wdNew_(me, body));
    if (a === 'wdAck') return json_(wdAcknowledge_(me, body));
    // TES
    if (a === 'taskAvailable') return json_(taskAvailable_(me));
    if (a === 'taskClaim') return json_(taskClaim_(me, body.id));
    if (a === 'taskSubmit') return json_(taskSubmit_(me, body.id, body.links, body.note));
    if (a === 'taskReview') return json_(taskReview_(me, body.id, body.decision, body.note));
    if (a === 'taskApprove') return json_(taskApprove_(me, body.id, body.decision, body.note));
    if (a === 'approvals') return json_(approvalsInbox_(me));
    if (a.indexOf('ds') === 0 && typeof dsHandle_ === 'function') { const r = dsHandle_(me, a, body); if (r) return json_(r); }
    if (a === 'payList') return json_(payList_(me));
    if (a === 'payVerify') return json_(payVerify_(me, body));
    if (a === 'payShot') return json_(payShot_(me, body));
    if (a === 'payNotReceived') return json_(payNotReceived_(me, body));
    if (a === 'paySettings') return json_(paySettings_(me, body));
    if (/^cm[A-Z]/.test(a)) { const r = cmTeamHandle_(me, a, body); if (r) return json_(r); }
    if (a.indexOf('sp') === 0 && /^sp[A-Z]/.test(a)) { const r = spHandle_(me, a, body); if (r) return json_(r); }
    if (a.indexOf('ttris') === 0) { const r = ttrisHandle_(me, a, body); if (r) return json_(r); }
    if (a.indexOf('qac') === 0) { const r = qacHandle_(me, a, body); if (r) return json_(r); }
    if (a.indexOf('ob') === 0) { const r = obHandle_(me, a, body); if (r) return json_(r); }
    if (a === 'bcBoot') return json_(bcBoot_(me));
    if (a === 'bcPreview') return json_(bcPreview_(me, body));
    if (a === 'bcSend') return json_(bcSend_(me, body));
    if (a === 'taskRemind') return json_(taskRemind_(me, body.id, body.message));
    if (a === 'meetList') return json_(meetList_(me));
    if (a === 'meetSave') return json_(meetSave_(me, body));
    if (a === 'meetRemove') return json_(meetRemove_(me, body.id));
    if (a === 'meetAttendance') return json_(meetAttendance_(me, body.id));
    if (a === 'meetMark') return json_(meetMark_(me, body.id, body.marks));
    if (a === 'awList') return json_(awList_(me));
    if (a === 'awGrant') return json_(awGrant_(me, body));
    if (a === 'awRevoke') return json_(awRevoke_(me, body.id));
    if (a === 'grvList') return json_(grvList_(me));
    if (a === 'grvNew') return json_(grvNew_(me, body));
    if (a === 'grvThread') return json_(grvThread_(me, body.id));
    if (a === 'grvReply') return json_(grvReply_(me, body));
    if (a === 'grvStatus') return json_(grvStatus_(me, body.id, body.status));
    if (a === 'lockSet') return json_(lockSet_(me, body));
    if (a === 'rehList') return json_(rehList_(me, body.speaker_id));
    if (a === 'rehSave') return json_(rehSave_(me, body));
    if (a === 'rehUpdate') return json_(rehUpdate_(me, body));
    if (a === 'evList') return json_(evtList_(me));
    if (a === 'evSave') return json_(evtSave_(me, body.record || {}));
    if (a === 'evRemove') return json_(evtRemove_(me, body.id));
    if (a === 'evRegs') return json_(evtRegs_(me, body.id));
    if (a === 'evFeedbackKit') return json_(evtFeedbackKit_(me, body.id));
    if (a === 'newsList') return json_(newsList_(me));
    if (a === 'newsSave') return json_(newsSave_(me, body.record || {}));
    if (a === 'newsRemove') return json_(newsRemove_(me, body.id));
    if (a === 'upload') return json_(mediaUpload_(me, body));
    if (/^fin[A-Z]/.test(String(a))) return json_(finHandle_(me, a, body));
    if (a === 'devices') return json_(devicesList_(me));
    if (a === 'subList') return json_(subList_(me));
    if (a === 'opsHealth') return json_(opsHealth_(me));
    if (a === 'opsSet') return json_(opsSet_(me, body));
    if (a === 'opsQueueGet') return json_(opsQueueGet_(me, body.id));
    if (a === 'opsQueue') return json_(opsQueueAct_(me, body));
    if (a === 'govBodies') return json_(govBodies_(me));
    if (a === 'bodiesSet') return json_(bodiesSet_(me, body));
    if (a === 'idcReport') return json_(idcReport_(me, body));
    if (a === 'idcList') return json_(idcList_(me));
    if (a === 'idcCase') return json_(idcCase_(me, body.id));
    if (a === 'idcPost') return json_(idcPost_(me, body));
    if (a === 'idcAct') return json_(idcAct_(me, body));
    if (a === 'advList') return json_(advList_(me));
    if (a === 'advAsk') return json_(advAsk_(me, body));
    if (a === 'advReply') return json_(advReply_(me, body));
    if (a === 'advClose') return json_(advClose_(me, body));
    if (a === 'zeptoSave') return json_(zeptoSave_(me, body));
    if (a === 'cleanupPreview') return json_(cleanupPreview_(me));
    if (a === 'cleanupRun') { if (me.role !== 'super') throw new Error('Only the Organizer can clean up.'); return json_(cleanupRun_([].concat(body.keys || []), me.email)); }
    if (a === 'opsBackup') { if (me.role !== 'super') throw new Error('Only the Organizer can do this.'); return json_(Object.assign({ ok: true }, opsBackup_())); }
    if (a === 'opsErrorsClear') { if (me.role !== 'super') throw new Error('Only the Organizer can do this.'); readAll_('ErrorLog').slice().reverse().forEach(function (r) { sh_('ErrorLog').deleteRow(r._row); }); return json_({ ok: true }); }
    if (a === 'subSend') return json_(subSend_(me, body));
    if (a === 'subRemove') return json_(subRemove_(me, body.email));
    if (a === 'deviceRemove') return json_(deviceRemove_(me, body.id));
    if (a === 'logoutAll') return json_(logoutAll_(me));
    if (a === 'imBoot') return json_(imBoot_(me));
    if (a === 'imList') return json_(imList_(me, body.folder, body.q));
    if (a === 'imThread') return json_(imThread_(me, body.thread_id));
    if (a === 'imSend') return json_(imSend_(me, body));
    if (a === 'imAct') return json_(imAct_(me, body.thread_id, body.op));
    if (a === 'imCounts') return json_({ ok: true, counts: imCounts_(me) });
    if (a === 'spkList') return json_(spkAdminList_(me));
    if (a === 'spkDetail') return json_(spkAdminDetail_(me, body.id));
    if (a === 'spkInvite') return json_(spkInvite_(me, body.id));
    if (a === 'spkInterview') return json_(spkInterview_(me, body));
    if (a === 'aiCurate') return json_(aiCurate_(me, body));
    if (a === 'spkInterviewOutcome') return json_(spkInterviewOutcome_(me, body));
    if (a === 'spkReview') return json_(spkReview_(me, body.id, body.decision, body.feedback, body.comments));
    if (a === 'spkCountersign') return json_(spkCountersign_(me, body.id, body.signature, body.evidence));
    if (a === 'spkPdf') return json_(spkAdminPdf_(me, body.id));
    return json_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    if (isSystemError_(err)) opsLog_('error', String(err.message || err), 'POST ' + a + '\n' + (err.stack || ''));
    return json_({ ok: false, error: String(err.message || err), auth: err.auth === true });
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** JSON, or JSONP when a safe callback name is given (the Team page uses this as a fallback). */
function jsonp_(o, cb) {
  if (cb && /^[A-Za-z_$][\w$]{0,60}$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + JSON.stringify(o) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json_(o);
}

// ───────────────────────────── PUBLIC ─────────────────────────────
function getSite_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('site');
  if (hit) return JSON.parse(hit);
  const settingsAll = settingsMap_();
  const settings = {};
  PUBLIC_SETTINGS.forEach(function (k) { if (settingsAll[k] !== undefined) settings[k] = settingsAll[k]; });
  const data = {
    settings: settings,
    editions: readAll_('Editions').filter(pub_).sort(by_('number')),
    speakers: readAll_('Speakers').filter(function (x) { return pub_(x) && x.kind !== 'salon'; }).sort(by_('sort', true)).map(function (x) {
      return { id: x.id, name: x.name, designation: x.designation, talk_title: x.talk_title, bio: x.bio, photo_url: x.photo_url, edition_id: x.edition_id, video_url: x.video_url };
    }),
    departments: readAll_('Departments').sort(by_('sort', true)),
    sponsors: readAll_('Sponsors').filter(pub_).sort(by_('sort', true)),
    team: readAll_('Team').filter(pub_).sort(by_('sort', true)).map(function (t) {
      return { id: t.id, name: t.name, role: t.role, department_id: t.department_id, edition_id: t.edition_id, photo_url: t.photo_url, bio: t.bio, linkedin: t.linkedin };
    }),
  };
  try { cache.put('site', JSON.stringify(data), CONFIG.SITE_CACHE_SECONDS); } catch (x) { /* too large to cache: fine */ }
  return data;
}

function publicSubmit_(b) {
  if (b.website) return { ok: true }; // honeypot
  const f = clean_(b, { type: 20, name: 100, email: 120, phone: 30, organisation: 150, subject: 200, message: 3000 });
  if (SUBMISSION_TYPES.indexOf(f.type) < 0) f.type = 'Contact';
  if (!f.name || !isEmail_(f.email) || !f.message) throw new Error('Please fill in your name, a valid email and a message.');
  rateLimit_('sub_' + lc_(f.email), 5, 3600);
  const rec = Object.assign(f, { id: newId_('SB'), status: 'New', department_id: '', notes: '', created_at: now_(), updated_at: now_() });
  withLock_(function () { appendRow_('Submissions', rec); });
  mail_(f.email, 'We received your message — TEDxThaltej Youth',
    emailShell_('Thank you, ' + esc_(f.name.split(' ')[0]) + '.',
      '<p>We have received your <b>' + esc_(f.type.toLowerCase()) + '</b> message and the right team will get back to you soon.</p>' +
      '<p style="color:#666">Reference: <b>' + rec.id + '</b></p>'));
  notifyTeam_('New ' + f.type + ' submission from ' + f.name, rec);
  return { ok: true, id: rec.id };
}

function publicRegister_(b) {
  if (b.website) return { ok: true };
  const s = settingsMap_();
  if (!truthy_(s.registration_open)) throw new Error('Registrations are closed right now.');
  const f = clean_(b, { name: 100, email: 120, phone: 30, age: 3, institution: 150, city: 80, why: 1500 });
  if (!f.name || !isEmail_(f.email) || !f.phone) throw new Error('Please fill in your name, a valid email and phone number.');
  rateLimit_('reg_' + lc_(f.email), 3, 3600);
  let rec;
  withLock_(function () {
    const all = readAll_('Registrations');
    if (all.some(function (r) { return lc_(r.email) === lc_(f.email) && r.status !== 'Cancelled'; }))
      throw new Error('This email is already registered. Check your inbox for updates.');
    const cap = parseInt(s.capacity, 10);
    const approved = all.filter(function (r) { return r.status === 'Approved'; }).length;
    rec = Object.assign(f, { id: newId_('RG'), status: (cap && approved >= cap) ? 'Waitlisted' : 'Pending', ticket_code: '', checked_in: 'FALSE', created_at: now_(), updated_at: now_(), payment_id: '' });
    appendRow_('Registrations', rec);
  });
  const price = payConf_().ticket_price;
  if (price > 0 && rec.status === 'Pending') {      // paid ticket: the seat is confirmed once Finance verifies the UPI payment
    const p = payNew_({ purpose: 'ticket', title: 'Ticket: ' + (s.event_name || 'TEDxThaltej Youth'), ref_id: rec.id, name: f.name, email: f.email, phone: f.phone, amount: price });
    updateRow_('Registrations', rec.id, { status: 'Payment pending', payment_id: p.id });
    mail_(f.email, 'Complete your ticket: ' + (s.event_name || 'TEDxThaltej Youth'), emailShell_('One step left, ' + esc_(f.name.split(' ')[0]) + '.',
      '<p>Pay for your ticket to <b>' + esc_(s.event_name || 'TEDxThaltej Youth') + '</b> by UPI within ' + PAY_EXPIRE_HOURS + ' hours to keep your seat.</p>' + payBlock_(p)));
    return { ok: true, id: rec.id, status: 'Payment pending', payment: payPublic_(p) };
  }
  mail_(f.email, 'Registration received — ' + (s.event_name || 'TEDxThaltej Youth'),
    emailShell_('You’re on the list, ' + esc_(f.name.split(' ')[0]) + '.',
      '<p>We have received your registration for <b>' + esc_(s.event_name || 'TEDxThaltej Youth') + '</b>' +
      (s.event_date ? ' on <b>' + esc_(prettyDate_(s.event_date)) + '</b>' : '') + '.</p>' +
      '<p>Status: <b>' + rec.status + '</b>. Our team reviews every registration and will email you a confirmed ticket if approved.</p>' +
      '<p style="color:#666">Reference: <b>' + rec.id + '</b></p>'));
  return { ok: true, id: rec.id, status: rec.status };
}

// ───────────────────────────── AUTH ─────────────────────────────
function sessSig_(a) { return String(a.hash || '').slice(-12) + '.' + String(a.salt || '').slice(0, 4); } // changes when the password changes
function sessStart_(a) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('s_' + token, lc_(a.email) + '|' + sessSig_(a) + '|' + Date.now(), CONFIG.SESSION_MINUTES * 60);
  updateRow_('Admins', lc_(a.email), { last_login: now_() });
  return token;
}
function needs2fa_(a) {
  const mode = lc_(settingsMap_().two_factor || 'privileged');
  if (mode === 'off') return false;
  if (mode === 'all') return true;
  const scopes = String(a.scopes || '').split(',').map(function (x) { return x.trim(); });
  return a.role === 'super' || truthy_(a.registrar) || scopes.indexOf('finance') >= 0 || scopes.indexOf('admins') >= 0;
}
function deviceOk_(email, dev) {
  if (!dev || String(dev).length < 40) return false;
  const h = hash_(String(dev), 'device'), t = now_();
  return readAll_('TrustedDevices').some(function (d) { return d.email === email && d.hash === h && d.expires > t; });
}
function failAlert_(email) {
  // tell the owner once per hour when someone keeps getting their password wrong
  const c = CacheService.getScriptCache(), k = 'fa_' + email, n = parseInt(c.get(k) || '0', 10) + 1;
  c.put(k, String(n), 3600);
  if (n === 4 && truthy_(settingsMap_().login_alerts || 'TRUE') && findAdmin_(email)) {
    try { mail_(email, 'Failed sign-in attempts on your TEDxThaltej Youth account', emailShell_('Was this you?',
      '<p>Someone entered the wrong password for your Team Portal account several times in the last hour.</p><p>If it was you, no action is needed. If not, reset your password now from the sign-in page, and tell the Organizer.</p>')); } catch (e) { Logger.log(e); }
    audit_(email, 'failed sign-ins', n + ' in an hour');
  }
}
function login_(b) {
  const email = lc_(b.email);
  rateLimit_('login_' + email, 6, 900);
  const a = findAdmin_(email);
  if (!a || hash_(String(b.password || ''), a.salt) !== a.hash) { failAlert_(email); throw new Error('Incorrect email or password.'); }
  if (!truthy_(a.active)) throw new Error(readAll_('Applicants').some(function (x) { return lc_(x.email) === email && x.status === 'Awaiting activation'; })
    ? 'Your account is waiting for activation by the Organizer. You’ll get an email once it is active.' : 'This account is not active. Contact the Organizer.');
  if (lockActive_(a)) throw new Error(lockMessage_(a));
  return finishLogin_(a, b, 'password');
}
/** After the password (or Google) check: active/lock/maintenance checks, the 2-step code when needed, then a session. */
function finishLogin_(a, b, via) {
  const email = lc_(a.email);
  if (!truthy_(a.active)) throw new Error(readAll_('Applicants').some(function (x) { return lc_(x.email) === email && x.status === 'Awaiting activation'; })
    ? 'Your account is waiting for activation by the Organizer. You’ll get an email once it is active.' : 'This account is not active. Contact the Organizer.');
  if (lockActive_(a)) throw new Error(lockMessage_(a));
  if (a.role !== 'super' && maintenanceOn_()) throw new Error(settingsMap_().maintenance_message || 'The Team Portal is under maintenance. Please try again soon.');
  if (needs2fa_(a) && !deviceOk_(email, b.device)) {
    rateLimit_('2fa_send_' + email, 5, 900);
    const code = String(Math.floor(100000 + Math.random() * 900000)), ticket = Utilities.getUuid().replace(/-/g, '');
    CacheService.getScriptCache().put('t_' + ticket, JSON.stringify({ e: email, h: hash_(code, ticket), n: 0 }), 600);
    mail_(email, code + ' is your TEDxThaltej Youth sign-in code', emailShell_('Your sign-in code',
      '<p>Enter this code to finish signing in to the Team Portal. It expires in 10 minutes.</p><p style="font-size:34px;letter-spacing:8px;font-weight:800;margin:24px 0">' + code + '</p>' +
      '<p style="color:#666">Didn’t try to sign in? Someone has your password. Reset it now and tell the Organizer.</p>'));
    return { ok: true, step: 'code', ticket: ticket, hint: email.replace(/^(.).*?(.)@/, '$1•••$2@') };
  }
  const token = sessStart_(a);
  audit_(email, 'login', via === 'password' ? '' : via);
  return { ok: true, token: token, me: publicAdmin_(a), mustChange: truthy_(a.must_change) };
}
function login2_(b) {
  const cache = CacheService.getScriptCache(), key = 't_' + String(b.ticket || '').replace(/[^a-f0-9]/g, '');
  const raw = cache.get(key); if (!raw) throw new Error('That code has expired. Sign in again.');
  const o = JSON.parse(raw);
  if (o.n >= 5) { cache.remove(key); throw new Error('Too many wrong codes. Sign in again.'); }
  if (hash_(String(b.code || '').replace(/\D/g, ''), String(b.ticket)) !== o.h) { o.n++; cache.put(key, JSON.stringify(o), 600); throw new Error('That code is not right.'); }
  cache.remove(key);
  const a = findAdmin_(o.e);
  if (!a || !truthy_(a.active) || lockActive_(a)) throw new Error('This account cannot sign in.');
  let device = '';
  if (b.trust) {
    device = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    const exp = Utilities.formatDate(new Date(Date.now() + 30 * 864e5), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
    appendRow_('TrustedDevices', { id: newId_('DEV'), email: o.e, hash: hash_(device, 'device'), expires: exp, ua: String(b.ua || '').slice(0, 160), created_at: now_() });
  }
  const token = sessStart_(a);
  audit_(o.e, 'login', '2-step' + (b.trust ? ' · device trusted 30 days' : ''));
  return { ok: true, token: token, device: device, me: publicAdmin_(a), mustChange: truthy_(a.must_change) };
}
function devicesList_(me) {
  const t = now_();
  return { ok: true, rows: readAll_('TrustedDevices').filter(function (d) { return d.email === lc_(me.email) && d.expires > t; })
    .map(function (d) { return { id: d.id, ua: d.ua, created_at: d.created_at, expires: d.expires }; }).reverse() };
}
function deviceRemove_(me, id) {
  const d = findRow_('TrustedDevices', id);
  if (!d || (d.email !== lc_(me.email) && me.role !== 'super')) throw new Error('Device not found.');
  deleteRow_('TrustedDevices', id); audit_(me.email, 'device removed', id);
  return { ok: true };
}
/** Sign out everywhere: forget trusted devices and end every session (sessions carry a key that the new salt changes). */
function logoutAll_(me) {
  readAll_('TrustedDevices').filter(function (d) { return d.email === lc_(me.email); }).forEach(function (d) { deleteRow_('TrustedDevices', d.id); });
  PropertiesService.getScriptProperties().setProperty('SV_' + lc_(me.email), String(Date.now()));
  audit_(me.email, 'signed out everywhere', '');
  return { ok: true };
}

function auth_(token) {
  const fail = function () { const e = new Error('Your session has expired. Please sign in again.'); e.auth = true; return e; };
  if (!token || String(token).length < 40) throw fail();
  const cache = CacheService.getScriptCache();
  const raw = cache.get('s_' + token);
  if (!raw) throw fail();
  const email = raw.split('|')[0], sig = raw.split('|')[1] || '';
  const a = findAdmin_(email);
  if (!a || !truthy_(a.active) || lockActive_(a)) throw fail();
  if (sig !== sessSig_(a)) { cache.remove('s_' + token); throw fail(); }            // password changed since this session began
  const cut = +(PropertiesService.getScriptProperties().getProperty('SV_' + email) || 0);   // "sign out everywhere"
  if (cut && +(raw.split('|')[2] || 0) <= cut) { cache.remove('s_' + token); throw fail(); }
  if (a.role !== 'super' && maintenanceOn_()) { const e = new Error(settingsMap_().maintenance_message || 'The Team Portal is under maintenance.'); e.auth = true; throw e; }
  cache.put('s_' + token, raw, CONFIG.SESSION_MINUTES * 60); // slide
  const sc = scopesOf_(a); a.scopeList = sc.list; a.scopeView = sc.view;
  return a;
}

function forgot_(b) {
  const email = lc_(b.email);
  rateLimit_('otp_' + email, 3, 900);
  const a = findAdmin_(email);
  if (a && truthy_(a.active)) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    CacheService.getScriptCache().put('o_' + email, JSON.stringify({ h: hash_(code, email), n: 0 }), CONFIG.OTP_MINUTES * 60);
    mail_(email, 'Your TEDxThaltej Youth admin code: ' + code,
      emailShell_('Password reset code',
        '<p>Use this code to reset your admin console password. It expires in ' + CONFIG.OTP_MINUTES + ' minutes.</p>' +
        '<p style="font-size:34px;letter-spacing:8px;font-weight:800;margin:24px 0">' + code + '</p>' +
        '<p style="color:#666">If you didn’t ask for this, you can ignore this email.</p>'));
  }
  return { ok: true }; // same answer whether or not the email exists
}

function reset_(b) {
  const email = lc_(b.email);
  const cache = CacheService.getScriptCache();
  const raw = cache.get('o_' + email);
  if (!raw) throw new Error('That code has expired. Request a new one.');
  const o = JSON.parse(raw);
  if (o.n >= 5) { cache.remove('o_' + email); throw new Error('Too many attempts. Request a new code.'); }
  if (hash_(String(b.code || '').trim(), email) !== o.h) {
    o.n++; cache.put('o_' + email, JSON.stringify(o), CONFIG.OTP_MINUTES * 60);
    throw new Error('Incorrect code.');
  }
  checkStrength_(b.password);
  const salt = Utilities.getUuid();
  updateRow_('Admins', email, { salt: salt, hash: hash_(b.password, salt), must_change: 'FALSE' });
  cache.remove('o_' + email);
  audit_(email, 'password reset', 'via email code');
  return { ok: true };
}

function changePassword_(me, b) {
  if (hash_(String(b.current || ''), me.salt) !== me.hash) throw new Error('Current password is incorrect.');
  checkStrength_(b.password);
  const salt = Utilities.getUuid();
  updateRow_('Admins', me.email, { salt: salt, hash: hash_(b.password, salt), must_change: 'FALSE' });
  audit_(me.email, 'password changed', '');
  return { ok: true };
}

function checkStrength_(p) {
  p = String(p || '');
  if (p.length < 8 || !/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) throw new Error('Use at least 8 characters with letters and numbers.');
}

/** Page access. Each entry in `scopes` is a page id ("speakers" = can edit) or "speakers:view" (view only).
 *  Viewers are always view-only. Any role (member included) can be given pages. */
function scopesOf_(a) {
  if (a.role === 'super') return { list: EDITABLE_SCOPES.concat(SUPER_ONLY), view: [] };
  const list = [], view = [];
  String(a.scopes || '').split(',').map(function (x) { return x.trim(); }).filter(String).forEach(function (x) {
    const p = x.split(':'), id = p[0];
    if (EDITABLE_SCOPES.indexOf(id) < 0 || list.indexOf(id) >= 0) return;
    list.push(id); if (p[1] === 'view' || a.role === 'viewer') view.push(id);
  });
  if (a.role === 'lead' && list.indexOf('tasks') < 0) list.push('tasks');
  return { list: list, view: view };
}
/** Departments a user belongs to: the main one plus any extra teams. */
function myDepts_(a) {
  const out = [];
  [a && a.department_id].concat(String((a && a.extra_departments) || '').split(',')).forEach(function (d) { d = String(d || '').trim(); if (d && out.indexOf(d) < 0) out.push(d); });
  return out;
}
function inDept_(a, d) { return !!d && myDepts_(a).indexOf(String(d)) >= 0; }
function shareDept_(a, b) { const m = myDepts_(a); return myDepts_(b).some(function (d) { return m.indexOf(d) >= 0; }); }

function publicAdmin_(a) {
  const sc = scopesOf_(a);
  let scopes = sc.list.slice();
  if (a.role === 'lead' && a.department_id) scopes.push('admins');
  const amb = readAll_('Speakers').filter(function (s) { return lc_(s.ambassador_email) === lc_(a.email); }).length;
  return { ambassador_of: amb, email: a.email, name: a.name, role: a.role, scopes: scopes, scopes_view: sc.view, google_email: a.google_email || '', needs_google: needsGoogle_(a), external: truthy_(a.external), qac_declared: !!a.qac_declared_at, can_outreach: (function () { try { const x = Object.assign({}, a, { scopeList: scopesOf_(a).list, scopeView: scopesOf_(a).view }); return spCan_(x); } catch (e) { return false; } })(), can_inbox: a.role === 'super' || scopesOf_(a).list.indexOf('inbox') >= 0, department_id: a.department_id, departments: myDepts_(a), must_change: truthy_(a.must_change),
    registrar: truthy_(a.registrar) || a.role === 'super', is_registrar_flag: truthy_(a.registrar), bodies: bodiesOf_(a) };
}

// ───────────────────────────── PERMISSIONS ─────────────────────────────
function can_(me, module, write) {
  if (me.role === 'super') return true;
  if (module === 'admins' && me.role === 'lead' && me.department_id) return true; // leads manage members of their own department
  if (SUPER_ONLY.indexOf(module) >= 0) return false;
  if (me.scopeList.indexOf(module) < 0) return false;
  if (write && (me.role === 'viewer' || (me.scopeView || []).indexOf(module) >= 0)) return false;
  return true;
}
function must_(me, module, write) {
  if (!MODULES[module]) throw new Error('Unknown section.');
  if (!can_(me, module, write)) throw new Error(write ? 'You have view-only access to this section.' : 'You don’t have access to this section.');
}
function deptLocked_(me, module) {
  return me.role !== 'super' && !!me.department_id && (DEPT_SCOPED.indexOf(module) >= 0 || module === 'admins');
}

// ───────────────────────────── ADMIN ACTIONS ─────────────────────────────
function dashboard_(me) {
  const out = { me: publicAdmin_(me), counts: {} };
  ['editions', 'speakers', 'sponsors', 'departments', 'team', 'tasks', 'submissions', 'registrations', 'stewards', 'referrals'].forEach(function (m) {
    if (!can_(me, m, false)) return;
    let rows = readAll_(MODULES[m]);
    if (deptLocked_(me, m)) rows = rows.filter(function (r) { return inDept_(me, r.department_id); });
    const c = { total: rows.length };
    if (m === 'submissions') c.new = rows.filter(function (r) { return r.status === 'New'; }).length;
    if (m === 'referrals') c.new = rows.filter(function (r) { return r.status === 'Received'; }).length;
    if (m === 'tasks') { TASK_STATUSES.forEach(function (s) { c[s] = rows.filter(function (r) { return r.status === s; }).length; });
      c.overdue = rows.filter(function (r) { return r.status !== 'Done' && r.due_date && r.due_date < now_().slice(0, 10); }).length; }
    if (m === 'registrations') {
      REG_STATUSES.forEach(function (s) { c[s] = rows.filter(function (r) { return r.status === s; }).length; });
      c.checked_in = rows.filter(function (r) { return truthy_(r.checked_in); }).length;
      c.recent = rows.slice(-5).reverse().map(function (r) { return { name: r.name, status: r.status, created_at: r.created_at }; });
    }
    if (m === 'submissions') c.recent = rows.slice(-5).reverse().map(function (r) { return { name: r.name, type: r.type, status: r.status, created_at: r.created_at }; });
    out.counts[m] = c;
  });
  const mine = readAll_('Tasks').filter(function (t) { return lc_(t.assigned_to) === lc_(me.email); });
  out.myTasks = { open: mine.filter(function (t) { return t.status !== 'Done'; }).length, done: mine.filter(function (t) { return t.status === 'Done'; }).length };
  const s = settingsMap_();
  out.event = { name: s.event_name, date: s.event_date, capacity: s.capacity, registration_open: truthy_(s.registration_open) };
  return Object.assign({ ok: true }, out);
}

function list_(me, module) {
  must_(me, module, false);
  const extra = module === 'tasks' ? { assignees: assignees_(me), approverPool: readAll_('Admins').filter(function (u) { return truthy_(u.active); }).map(function (u) { return { email: lc_(u.email), name: u.name || u.email, role: u.role }; }) } : {};
  let rows = readAll_(MODULES[module]);
  if (deptLocked_(me, module)) rows = rows.filter(function (r) { return inDept_(me, r.department_id); });
  if (module === 'admins' || module === 'stewards' || module === 'speakers') rows = rows.map(function (r) { ['salt', 'hash', 'pw_version', 'invite_hash'].forEach(function (k) { delete r[k]; }); return r; });
  if (module === 'speakers') extra.people = readAll_('Admins').filter(function (a) { return truthy_(a.active); }).map(function (a) { return { email: lc_(a.email), name: a.name || a.email }; });
  if (module === 'audit') rows = rows.slice(-500).reverse();
  return Object.assign({ ok: true, rows: rows, canWrite: can_(me, module, true), lists: lookups_() }, extra);
}

function lookups_() {
  return {
    departments: readAll_('Departments').map(function (d) { return { id: d.id, name: d.name }; }),
    editions: readAll_('Editions').map(function (e) { return { id: e.id, name: 'Edition ' + e.number + ' — ' + e.title }; }),
    submissionTypes: SUBMISSION_TYPES, submissionStatuses: SUBMISSION_STATUSES, regStatuses: REG_STATUSES,
    referralStatuses: AIS_STATUSES, taskStatuses: TASK_STATUSES, taskPriorities: TASK_PRIORITIES, roles: ROLES, scopes: EDITABLE_SCOPES,
    sponsorTiers: ['Title', 'Platinum', 'Gold', 'Silver', 'Partner', 'In-kind', 'Media'],
  };
}

function save_(me, module, rec) {
  must_(me, module, true);
  if (module === 'settings' || module === 'audit') throw new Error('Not editable here.');
  if (module === 'admins') return saveAdmin_(me, rec);
  const sheet = MODULES[module];
  const cols = SCHEMA[sheet];
  const clean = {};
  cols.forEach(function (c) { if (rec[c] !== undefined) clean[c] = String(rec[c]).slice(0, 5000); });
  if (deptLocked_(me, module) && !inDept_(me, clean.department_id)) clean.department_id = me.department_id;
  if (module === 'stewards') { ['salt', 'hash', 'pw_version', 'email', 'created_at'].forEach(function (k) { delete clean[k]; }); if (!clean.id) throw new Error('Stewards register themselves at /ais/apply.'); }
  if (module === 'speakers') { ['salt', 'hash', 'pw_version', 'invite_hash', 'invite_expires', 'last_login', 'stage'].forEach(function (k) { delete clean[k]; }); if (clean.email) clean.email = lc_(clean.email); if (clean.ambassador_email) clean.ambassador_email = lc_(clean.ambassador_email); }
  let prevStatus = null;
  if (module === 'tasks') {
    if (!clean.title) throw new Error('Give the task a title.');
    if (clean.assigned_to) {
      clean.assigned_to = lc_(clean.assigned_to);
      const ok = assignees_(me).some(function (u) { return u.email === clean.assigned_to; });
      if (!ok) throw new Error('You can only assign tasks to people in your department.');
      if (!clean.department_id) { const u = findAdmin_(clean.assigned_to); if (u) clean.department_id = u.department_id; }
    }
    if (!clean.status) clean.status = 'To do';
    if (!clean.priority) clean.priority = 'Medium';
    if (clean.approvers !== undefined) clean.approvers = String(clean.approvers || '').split(',').map(function (e) { return lc_(e.trim()); })
      .filter(function (e, i, arr) { const u = findAdmin_(e); return u && truthy_(u.active) && arr.indexOf(e) === i; }).slice(0, 5).join(',');
    if (clean.approvals_json !== undefined) delete clean.approvals_json;
  }
  const keyCol = cols[0];
  if (module === 'referrals' && !clean.ref) throw new Error('Referrals come in from the Steward Desk.');
  let id = clean[keyCol];
  let prevAssignee = null;
  withLock_(function () {
    if (id) {
      const existing = findRow_(sheet, id);
      if (!existing) throw new Error('Record not found.');
      if (deptLocked_(me, module) && !inDept_(me, existing.department_id)) throw new Error('That record belongs to another department.');
      if (cols.indexOf('updated_at') >= 0) clean.updated_at = now_();
      delete clean.created_at;
      if (module === 'tasks') { prevAssignee = existing.assigned_to; delete clean.assigned_by; delete clean.comments; }
      if (module === 'referrals') { prevStatus = existing.status; ['cycle', 'steward_id', 'steward_email', 'q1', 'q2', 'q3'].forEach(function (k) { delete clean[k]; }); }
      updateRow_(sheet, id, clean);
    } else {
      id = clean.id = newId_(sheet.slice(0, 2).toUpperCase());
      if (cols.indexOf('created_at') >= 0) clean.created_at = clean.updated_at = now_();
      if (module === 'submissions' && !clean.status) clean.status = 'New';
      if (module === 'registrations' && !clean.status) clean.status = 'Pending';
      if (module === 'tasks') { clean.assigned_by = me.email; clean.comments = ''; }
      appendRow_(sheet, clean);
    }
  });
  if (module === 'referrals' && prevStatus !== null && clean.status && clean.status !== prevStatus) {
    try { aisStatusMail_(id, clean.status); } catch (e) { Logger.log(e); }
  }
  if (module === 'tasks' && clean.assigned_to && lc_(clean.assigned_to) !== lc_(prevAssignee) && lc_(clean.assigned_to) !== lc_(me.email)) {
    try { notifyTask_(clean.assigned_to, Object.assign({ id: id }, clean), me); } catch (e) { Logger.log(e); }
  }
  bust_();
  audit_(me.email, 'save ' + module, id + (clean.name ? ' (' + clean.name + ')' : ''));
  return { ok: true, id: id };
}

function saveAdmin_(me, rec) {
  const email = lc_(rec.email);
  if (!isEmail_(email)) throw new Error('Enter a valid email.');
  let role = ROLES.indexOf(rec.role) >= 0 ? rec.role : 'member';
  let scopes = role === 'super' ? 'all' : String(rec.scopes || '').split(',').map(function (s) { return s.trim(); })
    .filter(function (s) { const p = s.split(':'); return EDITABLE_SCOPES.indexOf(p[0]) >= 0 && (!p[1] || p[1] === 'view'); }).join(',');
  let dept = role === 'super' ? '' : String(rec.department_id || '');
  const existing = findAdmin_(email);
  if (me.role !== 'super') { // department head adding / editing their own members
    if (existing && (existing.role !== 'member' || !inDept_(me, existing.department_id))) throw new Error('You can only manage members of your own department.');
    role = 'member'; scopes = existing ? existing.scopes : ''; dept = existing && inDept_(me, existing.department_id) ? existing.department_id : me.department_id;
  }
  const fields = { name: String(rec.name || '').slice(0, 100), role: role, scopes: scopes, department_id: dept, active: truthy_(rec.active) ? 'TRUE' : 'FALSE' };
  if (me.role === 'super') fields.registrar = truthy_(rec.registrar) ? 'TRUE' : 'FALSE'; else if (existing) fields.registrar = existing.registrar;
  if (me.role === 'super' && rec.extra_departments !== undefined) fields.extra_departments = String(rec.extra_departments || '').split(',').map(function (d) { return d.trim(); })
    .filter(function (d) { return d && d !== dept && !!findRow_('Departments', d); }).join(',');
  if (existing) {
    if (email === lc_(me.email) && (role !== 'super' || fields.active !== 'TRUE')) throw new Error('You can’t remove your own super-admin access.');
    updateRow_('Admins', email, fields);
    audit_(me.email, 'update admin', email + ' → ' + role);
    let activated = null;
    if (!truthy_(existing.active) && fields.active === 'TRUE') {   // switched on → tell them, and close any waiting team-link record
      activated = activationMail_(email, fields.name || existing.name);
      readAll_('Applicants').filter(function (ap) { return lc_(ap.email) === email && ap.status === 'Awaiting activation'; })
        .forEach(function (ap) { updateRow_('Applicants', ap.id, { status: 'Onboarded', decided_by: me.email, decided_at: now_(), updated_at: now_() }); });
    }
    return { ok: true, id: email, activated: !!activated, emailed: activated ? activated.ok : undefined, email_error: activated && !activated.ok ? activated.error : undefined };
  }
  const temp = randomPassword_();
  const salt = Utilities.getUuid();
  appendRow_('Admins', Object.assign(fields, { email: email, salt: salt, hash: hash_(temp, salt), must_change: 'TRUE', last_login: '', created_at: now_() }));
  sendWelcome_(email, fields.name, temp, role);
  audit_(me.email, 'add admin', email + ' as ' + role);
  return { ok: true, id: email, invited: true };
}

function resetAdmin_(me, email) {
  must_(me, 'admins', true);
  const a = findAdmin_(email);
  if (!a) throw new Error('Admin not found.');
  if (me.role !== 'super' && (a.role !== 'member' || !inDept_(me, a.department_id))) throw new Error('You can only reset members of your own department.');
  const temp = randomPassword_();
  const salt = Utilities.getUuid();
  updateRow_('Admins', a.email, { salt: salt, hash: hash_(temp, salt), must_change: 'TRUE' });
  sendWelcome_(a.email, a.name, temp, a.role, true);
  audit_(me.email, 'reset admin password', a.email);
  return { ok: true };
}

function remove_(me, module, id) {
  must_(me, module, true);
  if (['settings', 'audit'].indexOf(module) >= 0) throw new Error('Not removable.');
  if (module === 'admins' && lc_(id) === lc_(me.email)) throw new Error('You can’t delete yourself.');
  if (module === 'admins' && me.role !== 'super') { const t = findAdmin_(id); if (!t || t.role !== 'member') throw new Error('You can only remove members of your own department.'); }
  const sheet = MODULES[module];
  withLock_(function () {
    const row = findRow_(sheet, id);
    if (!row) throw new Error('Record not found.');
    if (deptLocked_(me, module) && !inDept_(me, row.department_id)) throw new Error('That record belongs to another department.');
    deleteRow_(sheet, id);
  });
  bust_();
  audit_(me.email, 'delete ' + module, String(id));
  return { ok: true };
}

function saveSettings_(me, map) {
  must_(me, 'settings', true);
  withLock_(function () {
    const existing = settingsMap_();
    Object.keys(map).forEach(function (k) {
      const key = String(k).replace(/[^a-z0-9_]/gi, '').toLowerCase();
      if (!key) return;
      const v = String(map[k]).slice(0, 5000);
      if (existing[key] === undefined) appendRow_('Settings', { key: key, value: v });
      else updateRow_('Settings', key, { value: v });
    });
  });
  bust_();
  audit_(me.email, 'save settings', Object.keys(map).join(', '));
  return { ok: true };
}

function reply_(me, id, message) {
  must_(me, 'submissions', true);
  message = String(message || '').trim();
  if (!message) throw new Error('Write a reply first.');
  const r = findRow_('Submissions', id);
  if (!r) throw new Error('Submission not found.');
  if (deptLocked_(me, 'submissions') && !inDept_(me, r.department_id)) throw new Error('That submission belongs to another department.');
  ttrisSend_({ kind: 'submission', rec_id: r.id, to: r.email, subject: 'Re: ' + (r.subject || 'Your message to TEDxThaltej Youth'), title: 'Hello ' + esc_(String(r.name).split(' ')[0]) + ',',
    html: bcHtml_(message) + '<p style="margin-top:22px">' + esc_(me.name || 'Team') + '<br><span style="color:#6B6455">TEDxThaltej Youth</span></p>' +
      '<hr><p style="color:#8a8170;font-size:13px">Your message (' + r.id + '):<br>' + esc_(r.message).replace(/\n/g, '<br>') + '</p>',
    fromName: String(me.name || 'TEDxThaltej Youth').split(' ')[0] + ' · TEDxThaltej Youth', by: me.email });
  const note = (r.notes ? r.notes + '\n' : '') + '[' + now_() + '] ' + me.email + ' replied: ' + message.slice(0, 500);
  updateRow_('Submissions', id, { status: 'Replied', notes: note, updated_at: now_() });
  audit_(me.email, 'reply submission', id);
  return { ok: true };
}

function decide_(me, id, status, message) {
  must_(me, 'registrations', true);
  if (REG_STATUSES.indexOf(status) < 0) throw new Error('Unknown status.');
  const r = findRow_('Registrations', id);
  if (!r) throw new Error('Registration not found.');
  const s = settingsMap_();
  const patch = { status: status, updated_at: now_() };
  if (status === 'Approved' && !r.ticket_code) patch.ticket_code = ticketCode_();
  updateRow_('Registrations', id, patch);
  const first = esc_(String(r.name).split(' ')[0]);
  const extra = message ? '<p style="white-space:pre-wrap">' + esc_(message) + '</p>' : '';
  const ev = esc_(s.event_name || 'TEDxThaltej Youth');
  let html;
  if (status === 'Approved') {
    const code = patch.ticket_code || r.ticket_code;
    html = emailShell_('Your seat is confirmed, ' + first + '!',
      '<p>We’re delighted to confirm your seat at <b>' + ev + '</b>.</p>' +
      '<table style="width:100%;border:2px dashed #e62b1e;border-radius:12px;margin:20px 0" cellpadding="18"><tr><td>' +
      '<div style="font-size:12px;letter-spacing:2px;color:#888">TICKET CODE</div>' +
      '<div style="font-size:30px;font-weight:800;letter-spacing:4px">' + code + '</div>' +
      '<div style="margin-top:10px">' + esc_(prettyDate_(s.event_date)) + (s.event_time ? ' · ' + esc_(s.event_time) : '') + '<br>' + esc_(s.venue || '') + '</div>' +
      '</td></tr></table><p>Please show this code at the entry desk.</p>' + extra);
  } else if (status === 'Waitlisted') {
    html = emailShell_('You’re on the waitlist, ' + first + '.', '<p>All seats for <b>' + ev + '</b> are currently allotted. You’re on our waitlist and we’ll email you if a seat opens up.</p>' + extra);
  } else if (status === 'Rejected') {
    html = emailShell_('Thank you for registering, ' + first + '.', '<p>We received many more registrations for <b>' + ev + '</b> than we have seats, and we’re unable to offer you a seat this time. We hope to see you at a future edition.</p>' + extra);
  } else if (status === 'Cancelled') {
    html = emailShell_('Registration cancelled', '<p>Your registration for <b>' + ev + '</b> has been cancelled.</p>' + extra);
  }
  if (html) mail_(r.email, ev + ' — registration ' + status.toLowerCase(), html);
  audit_(me.email, 'registration ' + status, id);
  return { ok: true, ticket_code: patch.ticket_code || r.ticket_code };
}

function checkIn_(me, id, value) {
  must_(me, 'registrations', true);
  const r = findRow_('Registrations', id);
  if (!r) throw new Error('Registration not found.');
  if (r.status !== 'Approved' && value) throw new Error('Only approved registrations can be checked in.');
  updateRow_('Registrations', id, { checked_in: value ? 'TRUE' : 'FALSE', updated_at: now_() });
  audit_(me.email, value ? 'check-in' : 'undo check-in', id);
  return { ok: true };
}

// ───────────────────────────── TASKS ─────────────────────────────
/** People this user may assign tasks to. */
function assignees_(me) {
  const users = readAll_('Admins').filter(function (u) { return truthy_(u.active); });
  let pool;
  if (me.role === 'super') pool = users;
  else if (!can_(me, 'tasks', true)) pool = [];
  else if (me.department_id) pool = users.filter(function (u) { return shareDept_(me, u); });
  else pool = users;
  return pool.map(function (u) { return { email: lc_(u.email), name: u.name || u.email, department_id: u.department_id, role: u.role }; });
}

function myTasks_(me) {
  const rows = readAll_('Tasks').filter(function (t) { return lc_(t.assigned_to) === lc_(me.email); });
  return { ok: true, rows: rows, lists: { taskStatuses: TASK_STATUSES, departments: readAll_('Departments').map(function (d) { return { id: d.id, name: d.name }; }) } };
}

function updateMyTask_(me, id, status, comment) {
  const t = findRow_('Tasks', id);
  if (!t) throw new Error('Task not found.');
  const mine = lc_(t.assigned_to) === lc_(me.email);
  const manager = can_(me, 'tasks', true) && (!deptLocked_(me, 'tasks') || inDept_(me, t.department_id));
  if (!mine && !manager) throw new Error('This task isn’t assigned to you.');
  const patch = { updated_at: now_() };
  if (status) { if (TASK_STATUSES.indexOf(status) < 0) throw new Error('Unknown status.'); patch.status = status; }
  comment = String(comment || '').trim().slice(0, 1000);
  if (comment || status) {
    const line = '[' + now_().replace('T', ' ').slice(0, 16) + '] ' + (me.name || me.email) + ': ' + (status && status !== t.status ? '(' + status + ') ' : '') + comment;
    patch.comments = (t.comments ? t.comments + '\n' : '') + line;
  }
  updateRow_('Tasks', id, patch);
  audit_(me.email, 'task update', id + (status ? ' → ' + status : ''));
  if (mine && t.assigned_by && lc_(t.assigned_by) !== lc_(me.email)) {
    try {
      mail_(t.assigned_by, 'Task update: ' + t.title, emailShell_('Task update',
        '<p><b>' + esc_(me.name || me.email) + '</b> updated <b>' + esc_(t.title) + '</b>' + (status ? ' to <b>' + esc_(status) + '</b>' : '') + '.</p>' +
        (comment ? '<p style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px">' + esc_(comment) + '</p>' : '') +
        '<p><a href="' + CONFIG.ADMIN_URL + '">Open the portal</a></p>'));
    } catch (e) { Logger.log(e); }
  }
  return { ok: true };
}

function notifyTask_(to, t, me) {
  mail_(to, 'New task: ' + t.title, emailShell_('You have a new task',
    '<p><b>' + esc_(me.name || me.email) + '</b> assigned you a task.</p>' +
    '<table cellpadding="6" style="font-size:15px"><tr><td style="color:#888">Task</td><td><b>' + esc_(t.title) + '</b></td></tr>' +
    (t.due_date ? '<tr><td style="color:#888">Due</td><td>' + esc_(prettyDate_(t.due_date)) + '</td></tr>' : '') +
    '<tr><td style="color:#888">Priority</td><td>' + esc_(t.priority || 'Medium') + '</td></tr></table>' +
    (t.description ? '<p style="white-space:pre-wrap">' + esc_(t.description) + '</p>' : '') +
    '<p><a href="' + CONFIG.ADMIN_URL + '" style="display:inline-block;background:#e62b1e;color:#fff;padding:12px 22px;border-radius:30px;text-decoration:none;font-weight:700">Open my tasks</a></p>'));
}

// ───────────────────────────── EMAIL ─────────────────────────────
/** Branded email layout used by every email the system sends (table-based so it holds up in Gmail, Outlook and phones).
 *  opts: { kicker, preheader, ref, theme: 'ais' } — `ref` prints the TTRIS reference line that routes replies back to the right thread. */
const EMAIL_THEMES = {
  tedx: { bg: '#F4EEE3', head: '#101B3D', accent: '#E62B1E', ink: '#1B2033', soft: '#FBF7F0', stripe: ['#E62B1E', '#FFC83D', '#E62B1E', '#FFC83D'], tagline: 'Ideas worth spreading, from the youth of Ahmedabad', foot: '#6B6455' },
  ais:  { bg: '#F6ECDA', head: '#1B2150', accent: '#EB0028', ink: '#15120F', soft: '#FBF6EC', stripe: ['#EB0028', '#F5A524', '#0E7F82', '#D93B74'], tagline: 'Listening to Amdavad. Discovering its Ideas.', foot: '#8C6A3C', name: 'Ahmedabad Idea Search' }
};
function emailStyle_(html, t) {   // give plain tags a consistent, inline style (only tags without a style of their own)
  const btn = function (href, text) {
    return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 8px"><tr><td style="background:' + t.accent + ';border-radius:999px">' +
      '<a href="' + href + '" style="display:inline-block;padding:13px 26px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px">' + text + ' &rarr;</a></td></tr></table>';
  };
  return String(html || '')
    .replace(/<p>\s*<a href="([^"]+)">([^<]{1,60})<\/a>\s*<\/p>/g, function (m, h, x) { return btn(h, x); })
    .replace(/<a href="([^"]+)" style="display:inline-block;background:#e62b1e;[^"]*">([^<]+)<\/a>/gi, function (m, h, x) { return btn(h, x).replace(/^<table[^>]*>/, '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;margin:8px 0">'); })
    .replace(/<p>/g, '<p style="margin:0 0 14px">')
    .replace(/<a (?![^>]*style=)/g, '<a style="color:' + t.accent + ';font-weight:600;text-decoration:underline" ')
    .replace(/<(ul|ol)>/g, '<$1 style="margin:4px 0 16px;padding-left:22px">')
    .replace(/<li>/g, '<li style="margin:0 0 6px">')
    .replace(/<blockquote>/g, '<blockquote style="margin:12px 0 16px;padding:12px 16px;background:' + t.soft + ';border-left:4px solid ' + t.stripe[1] + ';border-radius:0 10px 10px 0;color:#3a3a3a">')
    .replace(/<h3>/g, '<h3 style="margin:22px 0 8px;font-size:16px;color:' + t.head + '">')
    .replace(/<hr\s*\/?>/g, '<hr style="border:none;border-top:1px solid #ECE4D6;margin:22px 0">')
    .replace(/<table>/g, '<table style="width:100%;border-collapse:collapse;margin:8px 0 16px;font-size:14px">')
    .replace(/<td>/g, '<td style="padding:8px 10px;border-bottom:1px solid #ECE4D6;vertical-align:top">')
    .replace(/<th>/g, '<th style="padding:8px 10px;border-bottom:2px solid ' + t.head + ';text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.06em">');
}
function emailShell_(title, inner, opts) {
  opts = opts || {};
  const t = EMAIL_THEMES[opts.theme] || EMAIL_THEMES.tedx, s = settingsMap_ ? (function () { try { return settingsMap_(); } catch (e) { return {}; } })() : {};
  const site = CONFIG.SITE_URL, host = site.replace(/^https?:\/\//, '');
  const pre = String(opts.preheader || String(title || '').replace(/<[^>]+>/g, '')).slice(0, 140);
  const links = [['Website', site], ['Instagram', s.instagram], ['LinkedIn', s.linkedin], ['YouTube', s.youtube]].filter(function (l) { return l[1]; })
    .map(function (l) { return '<a href="' + l[1] + '" style="color:' + t.head + ';font-weight:700;text-decoration:none">' + l[0] + '</a>'; }).join('<span style="color:#C9BFAE">&nbsp;&nbsp;·&nbsp;&nbsp;</span>');
  const stripe = t.stripe.map(function (c) { return '<td height="6" style="background:' + c + ';font-size:0;line-height:0">&nbsp;</td>'; }).join('');
  const logo = t.name ? '<div style="font-family:Helvetica,Arial,sans-serif;font-size:19px;font-weight:900;color:#ffffff">' + t.name + '</div><div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:' + t.stripe[1] + ';margin-top:4px">' + t.tagline + '</div>'
    : '<a href="' + site + '" style="text-decoration:none"><img src="' + site + '/assets/logo-white.png" width="230" alt="TEDxThaltej Youth" style="display:block;width:230px;max-width:70%;height:auto;border:0;font-family:Helvetica,Arial,sans-serif;font-size:20px;font-weight:800;color:#ffffff"></a>';
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>' +
    '<body style="margin:0;padding:0;background:' + t.bg + '">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">' + esc_(pre) + '&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + t.bg + '"><tr><td align="center" style="padding:28px 12px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #E7DECF">' +
    '<tr><td style="background:' + t.head + ';padding:26px 32px 24px">' + logo + '</td></tr>' +
    '<tr><td style="font-size:0;line-height:0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' + stripe + '</tr></table></td></tr>' +
    '<tr><td style="padding:34px 32px 30px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.65;color:' + t.ink + '">' +
      (opts.kicker ? '<div style="font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:' + t.accent + ';margin:0 0 8px">' + opts.kicker + '</div>' : '') +
      (title ? '<h1 style="margin:0 0 18px;font-family:Helvetica,Arial,sans-serif;font-size:26px;line-height:1.2;font-weight:800;letter-spacing:-.3px;color:' + t.head + '">' + title + '</h1>' : '') +
      emailStyle_(inner, t) + '</td></tr>' +
    '<tr><td style="background:' + t.soft + ';padding:22px 32px;border-top:1px solid #EFE6D6;font-family:Helvetica,Arial,sans-serif;font-size:12.5px;line-height:1.6;color:' + t.foot + '">' +
      (links ? '<div style="margin:0 0 10px">' + links + '</div>' : '') +
      '<div>' + (t.name ? 'A year-round initiative of TEDxThaltej Youth. ' : '<b style="color:' + t.head + '">TEDxThaltej Youth</b> · Ahmedabad, India<br>') + 'This independent TEDx event is operated under license from TED.</div>' +
      (opts.ref ? '<div style="margin-top:12px;padding-top:10px;border-top:1px dashed #DCCFB8;font-family:Menlo,Consolas,monospace;font-size:11px;color:#9A8F7C">Ref: ' + esc_(opts.ref) + ' · please keep this line when you reply</div>' : '') +
    '</td></tr></table>' +
    '<div style="font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#A79C89;margin-top:14px"><a href="' + site + '" style="color:#A79C89;text-decoration:none">' + host + '</a></div>' +
    '</td></tr></table></body></html>';
}

// mail_() lives in Ops.gs (limits, queue, Zoho/Gmail).

function sendWelcome_(email, name, temp, role, isReset) {
  mail_(email, isReset ? 'Your admin password was reset — TEDxThaltej Youth' : 'You’ve been added to the TEDxThaltej Youth admin console',
    emailShell_((isReset ? 'Password reset' : 'Welcome aboard') + (name ? ', ' + esc_(String(name).split(' ')[0]) : '') + '.',
      '<p>' + (isReset ? 'A super-admin reset your password.' : 'You now have <b>' + esc_(role) + '</b> access to the admin console.') + '</p>' +
      '<p>Email: <b>' + esc_(email) + '</b><br>Temporary password: <b style="font-family:monospace;font-size:17px">' + temp + '</b></p>' +
      '<p>You’ll be asked to set your own password on first sign-in.</p>' +
      '<p><a href="' + CONFIG.ADMIN_URL + '" style="display:inline-block;background:#e62b1e;color:#fff;padding:12px 22px;border-radius:30px;text-decoration:none;font-weight:700">Open admin console</a></p>'), { private: true });
}

function notifyTeam_(subject, rec) {
  const to = settingsMap_().notify_email;
  if (!to) return;
  try {
    mail_(to, subject, emailShell_(esc_(subject),
      '<p><b>' + esc_(rec.name) + '</b> &lt;' + esc_(rec.email) + '&gt;' + (rec.organisation ? ' · ' + esc_(rec.organisation) : '') + '</p>' +
      '<p style="white-space:pre-wrap">' + esc_(rec.message) + '</p><p><a href="' + CONFIG.ADMIN_URL + '">Open in admin console</a></p>'));
  } catch (e) { Logger.log(e); }
}

// ───────────────────────────── SHEET HELPERS ─────────────────────────────
function sh_(name) {
  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!s) throw new Error('Missing tab "' + name + '". Run setup() first.');
  return s;
}

function readAll_(name) {
  const s = sh_(name);
  const last = s.getLastRow();
  if (last < 2) return [];
  const cols = SCHEMA[name];
  const tz = Session.getScriptTimeZone();
  return s.getRange(2, 1, last - 1, cols.length).getValues().map(function (row, i) {
    const o = { _row: i + 2 };
    cols.forEach(function (c, j) {
      let v = row[j];
      if (v instanceof Date) v = Utilities.formatDate(v, tz, (v.getHours() || v.getMinutes()) ? "yyyy-MM-dd'T'HH:mm:ss" : 'yyyy-MM-dd');
      else if (typeof v === 'boolean') v = v ? 'TRUE' : 'FALSE';
      o[c] = v === null || v === undefined ? '' : String(v);
    });
    return o;
  }).filter(function (o) { return o[cols[0]] !== ''; }).map(function (o) { const r = o._row; delete o._row; Object.defineProperty(o, '_row', { value: r, enumerable: false }); return o; });
}

function findRow_(name, key) {
  key = String(key);
  const k0 = SCHEMA[name][0];
  const isEmailKey = k0 === 'email';
  return readAll_(name).filter(function (r) { return isEmailKey ? lc_(r[k0]) === lc_(key) : r[k0] === key; })[0] || null;
}
function findAdmin_(email) { return email ? findRow_('Admins', lc_(email)) : null; }

function safeCell_(v) {
  v = v === undefined || v === null ? '' : String(v);
  return /^[=+\-@]/.test(v) ? "'" + v : v; // stop formula injection; keeps "+91…" phone numbers as text
}

function appendRow_(name, obj) {
  const cols = SCHEMA[name];
  const s = sh_(name);
  const r = s.getLastRow() + 1;
  const range = s.getRange(r, 1, 1, cols.length);
  range.setNumberFormat('@');
  range.setValues([cols.map(function (c) { return safeCell_(obj[c]); })]);
}

function updateRow_(name, key, patch) {
  const row = findRow_(name, key);
  if (!row) throw new Error('Record not found.');
  const cols = SCHEMA[name];
  const merged = cols.map(function (c) { return safeCell_(patch[c] !== undefined && c !== cols[0] ? patch[c] : row[c]); });
  sh_(name).getRange(row._row, 1, 1, cols.length).setValues([merged]);
}

function deleteRow_(name, key) {
  const row = findRow_(name, key);
  if (row) sh_(name).deleteRow(row._row);
}

function settingsMap_() {
  const m = {};
  readAll_('Settings').forEach(function (r) { m[r.key] = r.value; });
  return m;
}

var LOCK_DEPTH_ = 0;   // nested withLock_ calls in one request reuse the lock already held
function withLock_(fn) {
  if (LOCK_DEPTH_ > 0) { LOCK_DEPTH_++; try { return fn(); } finally { LOCK_DEPTH_--; } }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('The system is busy. Please try again.');
  LOCK_DEPTH_ = 1;
  try { return fn(); } finally { LOCK_DEPTH_ = 0; lock.releaseLock(); }
}

function audit_(email, action, detail) {
  try { appendRow_('Audit', { time: now_(), email: email, action: action, detail: String(detail || '').slice(0, 500) }); } catch (e) { Logger.log(e); }
}

function bust_() {
  CacheService.getScriptCache().removeAll(['maint', 'opsconf', 'site', 'teamfeed']); }

// ───────────────────────────── UTIL ─────────────────────────────
function now_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss"); }
function lc_(s) { return String(s || '').trim().toLowerCase(); }
function truthy_(v) { return ['true', 'yes', '1', 'y'].indexOf(lc_(v)) >= 0; }
function pub_(r) { return truthy_(r.published); }
function isEmail_(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '')); }
function esc_(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function by_(k, num) { return function (a, b) { return num ? (parseFloat(a[k]) || 999) - (parseFloat(b[k]) || 999) : String(a[k]).localeCompare(String(b[k])); }; }
function newId_(p) { return p + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase(); }
function ticketCode_() { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = 'TXTY-'; for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }
function randomPassword_() { const c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 10; i++) s += c[Math.floor(Math.random() * c.length)]; return s + Math.floor(Math.random() * 9 + 1); }

function hash_(text, salt) {
  let h = String(salt) + '|' + String(text);
  for (let i = 0; i < CONFIG.HASH_ROUNDS; i++) {
    h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + salt, Utilities.Charset.UTF_8));
  }
  return h;
}

function clean_(b, limits) {
  const o = {};
  Object.keys(limits).forEach(function (k) { o[k] = String(b[k] === undefined ? '' : b[k]).trim().slice(0, limits[k]); });
  if (o.email !== undefined) o.email = lc_(o.email);
  return o;
}

function rateLimit_(key, max, seconds) {
  const c = CacheService.getScriptCache();
  const n = parseInt(c.get('rl_' + key) || '0', 10);
  if (n >= max) throw new Error('Too many attempts. Please try again later.');
  c.put('rl_' + key, String(n + 1), seconds);
}

function prettyDate_(d) {
  if (!d) return '';
  const p = String(d).slice(0, 10).split('-');
  if (p.length !== 3) return d;
  const dt = new Date(+p[0], +p[1] - 1, +p[2]);
  return Utilities.formatDate(dt, Session.getScriptTimeZone(), 'EEEE, d MMMM yyyy');
}

/** Charter offices a portal user holds (senior_advisor, idc_chair, idc_member). Used by Bodies.gs. */
function bodiesOf_(a) { return String((a && a.bodies) || '').split(',').map(function (x) { return x.trim(); }).filter(String); }
