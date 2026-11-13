# tedxthaltejyouth.in: one site, one backend, one team portal

This repo replaces the nine separate subdomains with one site, served from Cloudflare Pages and connected to GitHub. A single Google Sheet and Apps Script backend runs every form, feed and account, and the Team Portal lives at `/portal`.

```
public/                  ← what Cloudflare Pages serves (build output directory)
  index.html             home: Light → Kaleidoscope → Zenith scroll scene, editions, speakers, attend, contact
  2025/  2026/  2027/    the three edition pages
  ais/   ais/apply/      Ahmedabad Idea Search + Steward Desk
  virasat/  team/  partner/  story/
  join/                  Join the team: application form + "sign the Charter" onboarding
  events/                side events: list, event page (?e=slug), feedback form (events/feedback)
  news/                  newsroom: list + citable article pages (?a=slug)
  sitemap/  sitemap.xml  robots.txt
  speaker/               Speaker Portal: sign the 4 agreements, write the talk, check facts, get feedback
  portal/                Team Portal: tasks, Team Mail, recruitment, roles, registrations, AIS, speakers, website
                         (installable as a phone app: manifest + service worker + icons)
  assets/config.js       the ONE setting: your Apps Script URL
  assets/site.js + .css  the shared header, menu and footer every page uses
  _redirects  _headers
wrangler.jsonc           tells Cloudflare to serve public/
backend/                 paste these twelve files into one Apps Script project (+ appsscript.json)
  Code.gs  Feeds.gs  Ais.gs  Docs.gs  Speakers.gs  Mail.gs  Charter.gs  Recruit.gs  Intra.gs
  Rehearsals.gs  Events.gs  News.gs
```

Every page now shares the home page's header, mobile menu, footer and colours (cream, navy, red and yellow), so you can always get back home and move between pages.

## Where the old subdomains now live

| Old address | New address |
|---|---|
| www.education.tedxthaltejyouth.in/2025 | tedxthaltejyouth.in/2025 |
| www.kaliedoscope.tedxthaltejyouth.in/2026 | /2026 |
| www.zenith.tedxthaltejyouth.in/2027 | /2027 |
| www.ais.tedxthaltejyouth.in/home | /ais |
| www.apply.ais.tedxthaltejyouth.in/now | /ais/apply |
| www.virasat.tedxthaltejyouth.in/heritage | /virasat |
| www.team.tedxthaltejyouth.in/executors | /team |
| www.sponsor.tedxthaltejyouth.in/us | /partner |
| www.story.tedxthaltejyouth.in/share | /story |

The content of all nine pages is unchanged. Only these things were edited: links between the pages, the brand name now linking home, and the Team and Steward Desk pages reading the shared backend URL. The Partner page also shows confirmed partners from the portal.

---

## 1 · Backend (about 15 minutes)

1. Create a new Google Sheet named **TEDxThaltej Youth: Site**, using the Google account that should send the site's emails.
2. Go to **Extensions → Apps Script**. Delete the sample code and create twenty-one files: `Code`, `Feeds`, `Ais`, `Docs`, `Speakers`, `Mail`, `Charter`, `Recruit`, `Intra`, `Rehearsals`, `Events`, `News`, `Identity`, `Letterhead`, `Registrar`, `Council`, `Tes`, `Finance`, `Subscribe`, `Ai` and `Ops` (Apps Script adds `.gs`). Paste each file from `backend/` into the file with the same name. **Only `Code.gs` starts with `const CONFIG`.** If you get "Identifier 'CONFIG' has already been declared", Code.gs was pasted into another file as well.
   - `Letterhead.gs` is long (it holds the letterhead, watermark and seal images). Paste all of it.
   - For Google Meet links on interview invites: click **Services (+)** in the left bar → **Google Calendar API** → **Add**. (Or turn on *Project Settings → Show "appsscript.json"* and paste `backend/appsscript.json`.) Without it, invites still go out, just without a Meet link.
3. In `Code.gs`, check the `CONFIG` block at the top. `SUPER_ADMIN_EMAIL` is the licensee's portal login.
4. Choose `setup` in the function menu and click **Run**, then approve the permissions. This:
   - creates every tab;
   - fills in the three editions, all 15 past speakers, the 2025 team and the 2027 department leads;
   - creates your super-admin account and emails you a temporary password. The password is also printed in the execution log.
5. Go to **Deploy → New deployment → Web app**. Set *Execute as*: **Me** and *Who has access*: **Anyone**. Copy the URL that ends in `/exec`.
6. Paste that URL into `public/assets/config.js`:
   ```js
   window.TXTY_API = 'https://script.google.com/macros/s/…/exec';
   ```
   Commit the change. The home page, Team page, Steward Desk, Partner page and Team Portal now all use this one Sheet.

> When you change the backend code later, use **Deploy → Manage deployments → Edit → New version**. This keeps the same URL. After pasting new files, run `setup` once more: it adds any new tabs (Applicants, Scores, Messages, Mailbox, Rehearsals, SideEvents, EventRegs, EventFeedback, NpsLog, News, Register, Requests, Elections, Candidates, Votes, Rti, Motions, Supports, Withdrawals, Meetings, Attendance, Awards, Grievances, GrievanceMsgs) and new columns, new settings and the daily clean-up trigger, and never overwrites your data. Then run `authorize` once so Google approves any new permission (Docs, Slides and Maps are new for the Registrar and signing evidence).

### Moving your existing data in
- **Team page:** copy the rows from the old Team sheet into the **Team** tab. Use the `role` column for the designation and set `edition_id` to `ED-2025`, `ED-2026` or `ED-2027`. You can also add people one at a time in Portal → Team members.
- **AIS Stewards and referrals:** copy the old referrals into the **Referrals** tab. Stewards cannot keep their old passwords, because the old script stored them differently. Copy their rows into **Stewards** and leave `salt` and `hash` blank. Each Steward then signs in once with **Forgot password** to set a new one. Alternatively, ask them to register again.
- Until `TXTY_API` is set, the Team page and Steward Desk keep using the **old** scripts, so nothing breaks during the switch.

### Speaker Portal setup (5 minutes)
1. **Fact-check key (free):** go to **console.groq.com → API Keys → Create API Key** (no card needed; Groq does not train on your data). In Apps Script, open **Project Settings → Script properties** and add `GROQ_API_KEY`. Optional backup: a Google AI Studio key as `GEMINI_API_KEY` is used automatically if Groq is busy or over its free limit (Google may use free-tier requests to improve its products). Models are set in Site settings (`groq_model`, `gemini_model`); if one is retired, the site tries the current ones by itself. Without any key, speakers can still submit drafts, but without the AI fact list.
2. **Drive:** the first signed agreement creates a **TEDxThaltej Youth — Speaker Records** folder with `Agreements/`, `Drafts/` and `Signatures/` subfolders. To use your own folder instead, add its ID as `DRIVE_FOLDER_ID` in Script properties.
3. **Settings** (Portal → Site settings): `organizer_name`, `speaker_contact_email` (receives a copy of every signed PDF), `speaker_draft_due` (goes into the Confirmation form) and `gemini_model`.
4. After pasting the new files, run `setup` once more and approve the new permissions (Drive, Docs, external requests).

**The speaker journey:**
1. In Portal → **Speakers**, add a speaker with their email and assign a **Speaker Ambassador**, then press **Invite**. The speaker gets a set-password link that lasts 14 days.
2. The speaker fills in their details and reads all four agreements: TED Speaker Release, Speaker Confirmation and Agreement Form, Organizer Protection and Extended Agreement, and Issue & Insurer Protection Agreement. Each agreement has its own tick box, which only unlocks once they have scrolled to the end. They then type their name and draw one signature; a parent or guardian also signs if the speaker is under 18. The event date, theme and venue come automatically from the speaker's edition.
3. A PDF of all four agreements plus a signing record is emailed to the speaker and to `speaker_contact_email`, and saved to Drive. The signing record holds the time, device and a hash of each document's exact text.
4. The organizer (super-admin) opens the speaker → **Agreements** → **Countersign**. They draw their signature once, and it can be reused after that. The final PDF, signed by both, is emailed and saved.
5. The speaker writes the talk in the portal, which autosaves. They press **Check facts**: the AI (Groq, Gemini as backup) lists every statistic, date, study, quote or scientific claim, and flags TEDx guideline issues such as selling or political or religious agendas. Each listed fact needs a source link, or must be marked as personal experience or to be removed, before the draft can be submitted. The checker only finds claims; people verify them.
6. The ambassador reads the version, sees every claim with its sources, and adds comments on specific paragraphs. They then **Request changes** or **Approve**, and the speaker is emailed. Every submitted version is also saved as a Google Doc in Drive for your records. Speakers never see Google Docs.

### Team recruitment (`/join`) and the Charter
1. Share **tedxthaltejyouth.in/join** (Portal → Recruitment → *Copy form link*). Applicants choose up to two teams and up to two licenses (Charter 9.2). Turn the form off with the setting `recruit_open` = FALSE.
2. **Portal → Recruitment** lists everyone by stage: Applied → Shortlisted → Interview scheduled → Interviewed → Selected → Onboarded.
3. **Shortlist** emails the applicant. **Schedule** picks a date, time and interviewers (portal users and any other Gmail). It creates a Google Calendar event with a Meet link and sends the invite to everyone, plus an email with the link. Rescheduling moves the same event.
4. Each interviewer enters **marks** out of 10 per criterion (setting `recruit_criteria`); the portal shows the average.
5. **Select** (super-admin only, as the Charter's 8.2.4 says) emails a personal link to read and sign the **TEDxThaltej Charter** (`Charter.gs`). They tick the three Article 8.3 acknowledgements, choose their licenses, type their name and draw a signature. Then automatically:
   - a PDF (acceptance page + the full Charter + signature + SHA-256 of the text) is emailed to them and to `registrar_email` and saved in Drive → *TEDxThaltej Youth — Team Records*;
   - they are added to **Team** (unpublished) and get a **Team Portal** login.
6. Department heads with the *recruit* section see applicants for their own team; leave the department blank (or make them an *editor*) to see everyone.

The Charter file you shared had a stray drafting fragment in the middle of Article 20/21 (a half-written "21.6" and an assistant chat line). It is **not** included; the final Article 21 is. Edit `Charter.gs` and bump `CHARTER_VERSION` whenever the Charter is amended.

### Team Mail
Portal → **Team Mail**: private messages inside the portal (not real email). Send to people, a whole department, the Core Team or everyone; reply-all threads, star, archive, delete, search. People get a short email nudge with no message text (setting `intramail_notify`).

**Install the portal as an app:** on iPhone open tedxthaltejyouth.in/portal in Safari → Share → *Add to Home Screen*. On Android/Chrome → menu → *Install app*. It opens full-screen with a bottom tab bar, and the unread count shows on the icon where the phone supports it.

### AIS Head
Portal → Portal users → Add user → **Quick setup: AIS Head** (role: department head, sections: Referrals, Idea Stewards, Website inbox, department: AIS). They can read every referral, move its status (the Steward is emailed) and pause Steward accounts.

### Speaker rehearsals
Portal → Speakers → open a speaker → **Rehearsals**. The speaker's Ambassador (or anyone with Speakers edit access) schedules an online run-through (Google Meet link created), an in-person rehearsal or a full dress rehearsal. The speaker gets a calendar invite and an email, sees it in the Speaker Portal and taps **I'll be there** or **Need another time**. Afterwards: **Mark done + notes** (emailed to the speaker and kept in their portal), **Missed** or **Cancel**.

### Side events (`/events`)
Portal → **Side events → New side event**: title, subtitle, banner (upload or paste a link), start/end, venue + Maps link, description and an **agenda** (time · what happens · details). Registration can be **on this website** (name, email, phone + optional school/age/city/class, with a seat limit), an **outside link**, or **none**. Each event gets its own page at `/events/?e=…` with *Add to calendar* and *Share*.
- **Feedback & NPS:** the portal gives you the feedback link, a ready subject and message, and all registered emails. **Nothing is sent automatically**: copy them into your own mail (emails in Bcc). The form asks for a 0–10 score plus what they liked and what could be better.
- **7-day deletion:** 7 days after an event ends, its registrations and written feedback are deleted automatically (daily trigger at about 3 am; also whenever Side events is opened). Only the NPS numbers stay, on the event and in the **NpsLog** tab.

### News (`/news`)
Portal → **News → New article**: headline, summary, section, author, date, tags, main image (+ alt text and photo credit) and the body (simple formatting, with a preview). Drafts stay private; a future date publishes it on that day. Every article page shows the byline, dates, a **Cite this article** box (APA, MLA, Chicago, BibTeX), a permanent link and article ID, and tells search engines it is a NewsArticle.

Uploaded banners and news images are saved in Drive → *TEDxThaltej Youth — Website Media* and shared view-only by link so the site can show them. Give people the **events** or **news** section in Portal users to let them manage these.

## 2 · Cloudflare Pages + GitHub (about 10 minutes)

1. Push this folder to a GitHub repository, for example `tedxthaltejyouth/site`.
2. In Cloudflare, go to **Workers & Pages → Create → Pages → Connect to Git** and pick the repo.
   - Framework preset: **None** · Build command: *(leave empty)* · Build output directory: **`public`**
3. Under **Custom domains**, add `tedxthaltejyouth.in` and `www.tedxthaltejyouth.in`. Your DNS is already on Cloudflare, so the records are created for you.
4. Every push to `main` now goes live automatically. Every pull request also gets its own preview link.

If the project was created as a **Worker** instead of Pages, `wrangler.jsonc` (in the repo root) tells it to serve `public/`. A brand-new `*.workers.dev` address can show `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` for a while until its certificate is issued; adding your own domain avoids the wait.

### Google Search Console
- Sitemap: **https://tedxthaltejyouth.in/sitemap.xml** (also listed in `robots.txt`). In Search Console → Sitemaps, paste `sitemap.xml` and submit.
- A human-readable sitemap is at `/sitemap`. The portals are kept out of search (`noindex` + `robots.txt`).
- Domain verification: easiest is the **Domain** property with a DNS TXT record in Cloudflare. For the URL-prefix property, drop Google's `google….html` file into `public/`.

### Sending old subdomain links to the new paths
Old links shared on Instagram or WhatsApp keep working once you add one redirect per subdomain. In Cloudflare, go to **Rules → Redirect Rules**, or use **Bulk Redirects** to do them all at once:

`www.zenith.tedxthaltejyouth.in/*` → `https://tedxthaltejyouth.in/2027` (301). Repeat for each subdomain in the table above. Each subdomain needs a proxied (orange-cloud) DNS record for the rule to catch it.

## 3 · Email: Zoho Mail (Self Client)

All site emails go through Zoho Mail once it is connected. This includes OTP codes, tickets, task alerts, Steward and speaker emails, and signed agreement PDFs, which are sent as attachments. Until Zoho is connected, or if Zoho ever fails, emails go out from the Google account that owns the script, so nothing is lost. When that fallback happens, the last Zoho error appears in the panel.

**Connect it once (super-admin, about 3 minutes):** go to Team Portal → **Site settings** → **Email · Connect Zoho Mail**, then:

1. **Data centre.** Pick the one you log in to Zoho Mail at: `zoho.in` for India. The panel's link changes to match.
2. **Create a Self Client.** Open `api-console.zoho.in` and sign in with the Zoho account that owns the From address. Click **Add Client → Self Client → Create → OK**. On the **Client Secret** tab, copy the **Client ID** and **Client Secret** into the panel.
3. **Generate a code.** On the **Generate Code** tab:
   - **Scope:** `ZohoMail.messages.CREATE,ZohoMail.accounts.READ` (the panel has a Copy button).
   - **Time Duration:** 10 minutes.
   - **Description:** anything.
   - Click **Create**, and pick your organisation if asked. Paste the code (it starts with `1000.`) into the panel **straight away**. It works only once and expires.
4. **Connect.** Enter the From address and name, then press **Connect Zoho Mail**, then **Send test email**.

**Notes**
- The From address must be the Zoho mailbox you signed in with, or an alias of it, for example `info@tedxthaltejyouth.in`. If it isn't, the panel tells you which addresses are allowed.
- The Client Secret and refresh token are kept in the script's private **Script Properties**, never in the Sheet. The panel never shows them again.
- To change accounts, press **Disconnect**. This revokes the token. Then connect again.
- **Receiving mail:** Zoho Mail receives on its own addresses. For any other address on the domain, Cloudflare **Email Routing** (free) can forward it.

## 4 · Team Portal (`/portal`)

| Role | What they can do |
|---|---|
| **Super-admin** (licensee) | Everything, including portal users and the audit log |
| **Department head** | Edits the sections you give them, limited to their own department. Adds members to their department and assigns them tasks |
| **Editor / Viewer** | Edits, or only views, the sections you tick |
| **Team member** | Sees **My tasks** and **Team Mail**: update status and post comments. Their head is emailed on each update |
| **Speaker Ambassador** | Any portal user assigned to a speaker. Sees **My speakers**: drafts, sources, feedback |

Sections: Dashboard · **Team Mail** · **Recruitment** (applications, interviews with Meet links, marks, selection, Charter) · **Speakers** (invite, ambassador, countersign, draft review) · My tasks · Task allocation (board) · Team members · Departments · Portal users · Registrations (approve → ticket code emailed, waitlist, check-in, CSV) · Inbox (reply by email) · **AIS referrals** (read the three answers and move the status; the Steward is emailed) · **Idea Stewards** (pause an account) · Speakers · Editions · Partners · Site settings · Audit log.

### Charter tools (every member)
- **Open tasks**: tasks with no assignee, for your department or for everyone. Claim one; when done, submit links to your work. The person who set it accepts it or asks for rework (Task allocation → *Review queue*).
- **Meetings**: heads and the Organizer create meetings (Everyone, departments or people; optional Google Meet and invites) and mark attendance: Present, Late, Absent, Excused (counts as attended) or N.A. (left out). Everyone sees their own attendance chart.
- **Charter & Council**: elections (Article 7: apply, secret ballot, Registrar verifies the count, Organizer confirms or overrides with a reason), Right to Information to the Organizer (23.3; anything withheld must name its 16.2.2 category), Institutional Hearing and Constitutional Review requests (2/3 of the Council, verified by the Registrar), and the Withdrawal Form (Article 10).
- **My documents**: request letters and certificates, download what was issued.
- **Grievances**: a private case with the Organizer (GRV-YYYY-NNNN), with a printable transcript. **Awards**: the Torch Bearer Award and others.

### Onboarding the existing team
Portal users (or Recruitment) → **Onboard existing members**: enter name, email, department, title and portal role (Member, Head or Editor) for each person, or paste a list. Each gets a **secret single-use link** (24 hours by default) to read and sign the Charter, with signature, location and camera photo. On the same page they create their password, and their Team Portal works immediately. They skip the application and interview. You can also copy each link to send on WhatsApp.

**One link for the whole team:** Portal users → **Team onboarding link**. Choose how long it lasts (24 hours by default) and how many people can use it (20 by default), then share it on WhatsApp. Each person enters their name, email, team, title and the date they joined, signs the Charter and creates a password. Their account waits under *Waiting for activation* until you click **Activate** (choose Member, Head or Editor). The member is emailed and can sign in immediately.

### Speakers: two ways in
- **Interview first:** open a speaker → *Interview first (no commitment)*. They get a Google Meet invite whose email states plainly that the conversation is not a confirmation of selection. Afterwards add notes, then *Select → send portal invite* or *Not selected* (polite email). Only the Organizer makes the final call.
- **Direct selection:** *Invite to speaker portal* as before.
- In the speaker portal, **Profile & availability** comes first: headshot, ~150-word bio, designation, talk title, LinkedIn, and a Monday–Sunday grid of free time slots plus dates they're away. The team sees all of it in the speaker's Overview and at the top of the Rehearsals tab.

### AI helpers (Groq, with Gemini as backup)
- **Polish my bio** (speaker portal): turns the speaker's bio into a 150-word programme bio, a 50-word social bio and a one-line card, without adding facts. The speaker picks what to use.
- **Curation report** (Speakers → Drafts → 🔎): checks a draft against TED's TEDx Content Guidelines (commercial, political, religious, bad science/health) and talk craft, with quoted passages, fixes, a verdict and next steps. Cached until the draft changes; printable. It advises; the team decides.

### Admin Health (Organizer only)
Portal → **Admin Health** shows the portal, forms, email, queue, AI, backup and error status at a glance, plus:
- **Pause switches:** public forms (with your own message), outgoing email, and the Team Portal (maintenance). Sign-in codes always go out.
- **Traffic guard:** if more public actions than the limit arrive in a minute, forms pause themselves for 10 minutes. Site traffic charts for the last hour and 48 hours.
- **ZeptoMail:** Admin Health → *Connect ZeptoMail*: host (as shown in ZeptoMail → Mail Agents → Setup Info → API, e.g. `cpaas.zoho.in` or `api.zeptomail.in`), the Send Mail token, and a sender on your verified domain. The token is stored in Script Properties only. All website emails then go ZeptoMail → Zoho Mail → Gmail; subscriber newsletters skip ZeptoMail.
- **Email limits and queue:** set daily limits for Gmail and Zoho. Emails beyond the limit, or while email is paused, wait in the queue and go out hourly. Open any queued email to edit the recipient, subject or HTML, hold it, delete it or send it now.
- **Backups:** a copy of the Sheet every night at 3 am (last 30 kept), or *Back up now*. Plus sheet size and an error log.
- **Clean up:** deletes what is no longer needed: old sent emails, old errors, expired devices and links, unconfirmed or unsubscribed subscribers (automatically every Sunday after the backup), and, only when you tick them, past-cycle applicants who weren't selected, audit entries older than 2 years and old update copies. Signed records, finance, issued documents and members are never touched.
Run `authorize` once after updating so the hourly job is installed.

### Privacy
`/privacy` explains what is collected, why, retention, minors and rights. It is linked in the footer, the subscribe forms, Charter signing and the camera/location step. Have it reviewed by someone who knows the DPDP Act before relying on it.

### Office of the Registrar
In **Portal users**, tick **Registrar of TEDxThaltej Youth** on anyone (any role). They get the *Office of the Registrar* section:
- **Issue**: choose the document, fill in the fields (or pick a team member), check the live preview, click Issue. Letters go on the A4 letterhead; certificates and IDs use the poster design. All are signed by the Organizer & Licensee, carry the Registrar's seal and a QR code, are saved to Drive (*Office of the Registrar/YEAR*) and emailed. Physical documents get numbered seal codes (S-XXXX-01…).
- **Side events**: in Side events → Registrations, *Issue certificates* opens the form for that event; *Issue to every registrant* sends one to each person who attended.
- **Register**: every document, with void (reason required), resend, PDF and CSV export. **Requests**: members' requests; issue (prefilled) or decline.
- **Signature & seal**: the Organizer draws, types or uploads their signature once. Until then documents show the printed name.

Anyone can check a document at **/verify** with the code, the register number or a seal code. Void documents show as void with the reason.

### Signing
Every signature (speaker agreements, the Charter at onboarding, countersigning, withdrawal, the Organizer's signature) can be drawn, typed or uploaded. Before an agreement is signed, the signer is asked for their location (stored as the nearest area) and the camera takes a photo with a "Look at the camera" countdown. Both are added to the signed PDF's signing record and kept privately in Drive (*Signing evidence*).

### Pausing access
The Organizer can pause anyone's access until a date with a reason: Portal users → open a user → **Pause access**; Speakers → open a speaker → **Pause portal access**. Site settings → *Maintenance mode* pauses sign-in for everyone except the Organizer.

### Finance (FinanceOS)
- **Money requests** (everyone): reimbursement, advance or vendor payment → department head approves → the Organizer approves (Finance users can approve up to `fin_staff_limit`, default ₹2,000) → Finance records the payment. Paying posts the journal entry and emails a **Payment Voucher** on the letterhead, signed by the Organizer and verifiable at /verify. Advances sit in ADV-101 until settled against bills.
- **Finance** (the Organizer, and users given the `finance` section): overview with budget vs spent, journal (expense, income, sponsorship, transfers such as EME-105 → ADJ-101, capital, drawings), ledgers with statements, sponsorship pledges with receipts, trial balance, income & expenditure, position, CSV and print.
- Entries are never edited or deleted. Mistakes are reversed, which also voids the voucher. Financial years run April–March; a closed year accepts no entries until the Organizer reopens it with a reason.
- Ledgers, budgets and years: Finance → Set-up (Organizer only). The default chart of accounts is created the first time Finance opens.

### Stay informed (subscribers)
- A **Subscribe** box sits in every page footer, plus a full page at `/subscribe`. People confirm by email, and every update has an unsubscribe link.
- Portal → **Subscribers** (the Organizer, or anyone with News): list, CSV, and **Send an update** (sent in batches of 40; Gmail allows about 100 a day, Zoho more).
- The Google Group **tedxthaltej-community@googlegroups.com** is offered on the subscribe page. Google doesn't let a script add people to a free group, so invite subscribers there from the CSV if you want them in the group too.

### Security
- **2-step sign-in**: the Organizer, Registrars, Finance users and anyone who manages portal users get a 6-digit code by email at each new sign-in, with "trust this device for 30 days". Site settings → `two_factor`: `privileged` (default), `all` or `off`.
- Changing a password ends every other session. **Sign-in & security** in the portal lists trusted devices and has *Sign out everywhere*.
- Repeated wrong passwords email the account owner. Logins are rate-limited; codes expire in 10 minutes and allow 5 tries.
- `_headers` adds HSTS, a Content-Security-Policy and clickjacking protection. Also turn on 2-step verification for the Google account that owns the Sheet, the Cloudflare account and GitHub; those are the real keys to the site.

## Still to bring in
Pages on the old Google Site that weren't shared yet: Gallery, Press release, Policy documents, Audit reports, Speaker verifier, FAQ, Blog, TEDxAssist and Collaborators. 

## Governance bodies (Senior Advisors and IDC)

- **Who holds what:** every member sees *Charter → Governance bodies*. It lists the Organizer, Registrar, Senior Advisors (Art. 24), the IDC Chairperson and 5 members (Art. 13B) with vacant seats, the Core Team, and the Council size.
- **Appointing:** Organizer → Portal users → edit a person → *Charter offices*.
  - The IDC Chair must also be a Senior Advisor (24.2.1).
  - The IDC can have at most 5 members.
  - The Chair can't be replaced while a Constitutional Review is pending.
  - New appointees get an email.
- **Report a concern:** any member can send a confidential report to the IDC. They follow it under *My IDC matters*.
- **IDC case files** (IDC and Organizer):
  - The Chair informs the concerned person, who can read the allegations and respond privately (13B.7.2). The reporter's name is not shown to them.
  - The Chair schedules a hearing with Meet.
  - Members write internal notes and can recuse themselves.
  - The Chair submits findings and a recommendation.
  - The Organizer decides or dismisses, and both sides are emailed.
  - When the Registrar verifies a Constitutional Review, an IDC case opens and the Chair is emailed.
- **Senior Advisors:** the Organizer asks a question, the advisors reply, and the Organizer closes it with a summary.
- **New tabs:** IdcCases, IdcMsgs, AdviceAsks, AdviceReplies, plus an Admins `bodies` column. Run `setup` once.

## Design Studio, approvals, page access, several teams, email the team

- **Several teams:** Portal users → edit → *Also part of these teams*. The member sees tasks, meetings, Team Mail and money approvals for each team.
- **Page access:** any member, whatever their role, can get any page as *View* or *Edit*. Scopes are stored as `speakers` (edit) or `speakers:view`.
- **Design Studio** (Design.gs, portal-design.js):
  - Members request designs.
  - The design head assigns them, or a designer takes one.
  - Designers keep the Canva edit link (team only) and a view link.
  - Each version needs an exported file (PNG/JPG/PDF up to 8 MB, saved privately in Drive) or a Drive link, and the brand checklist.
  - Approval goes requester → design head → Organizer (only for public work).
  - The brand kit holds logos, colours, fonts, templates and the checklist. The library holds approved finals.
  - The design team is the department named in setting `design_department`, or the one with "Design"/"Graphic" in its name, plus anyone given the Design page.
- **Task approvals:** a task can list up to 5 approvers. After the setter accepts the work it becomes *Awaiting approval*, and each approver signs off in order. The Organizer can give final approval.
- **Approvals page:** one inbox for task and design sign-offs.
- **Email the team** (Organizer only): real email to everyone, a team, the Core Team, the Council, Senior Advisors or the IDC.
  - It is sent as bulk mail through Zoho Mail (Gmail as a fallback), with replies going to the Organizer.
  - After 40 recipients, or when the day's limit is reached, the rest go through the email queue.
  - `{name}` becomes each person's first name.
  - An optional copy goes to Team Mail.
- **New tabs:** DesignRequests, DesignVersions, DesignMsgs, BrandKit, Broadcasts.
- **New columns:** Admins `extra_departments`, Tasks `approvers` and `approvals_json`.
- Run `setup` once.

## Money rule: ask before you spend

- **Spending approval:** a member asks before spending. It goes head → Finance (up to the staff limit) or the Organizer. Approval only gives permission to spend; nothing is paid.
- **Reimbursement:** can only be claimed against the member's own *approved* spending approval, up to the approved amount, with the bill.
  - The claim goes straight to Finance to check and pay.
  - Finance can send a claim back, which reopens the spending approval.
  - Payment can never exceed what was approved.
- Advances and vendor payments are unchanged; both are asked for before spending.
- **Activation emails:**
  - Activating a member, whether from team onboarding or by ticking *Active* in Portal users, sends "Your Team Portal account is active" straight away (never queued).
  - If sending fails, the portal says so.

## Email services: on/off and order

- Admin Health → Email sending lets you switch **ZeptoMail, Zoho Mail and Gmail** on or off and order them with ↑ ↓.
  - Settings: `mail_use_zepto`, `mail_use_zoho`, `mail_use_gmail`, `mail_order`.
  - The first service that is on and connected sends. If it fails, the next takes over.
  - You can't switch off the last working service.
- **Bulk mail** (team email, subscriber updates) never uses ZeptoMail. It can be pinned to Zoho Mail or Gmail with `mail_bulk_via`.
- If no allowed service is left for a message, it waits in the email queue rather than being lost.
