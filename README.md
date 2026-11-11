# tedxthaltejyouth.in: one site, one backend, one team portal

This repo replaces the nine separate subdomains with one site, served from Cloudflare Pages and connected to GitHub. A single Google Sheet and Apps Script backend runs every form, feed and account, and the Team Portal lives at `/portal`.

```
public/                  ← what Cloudflare Pages serves (build output directory)
  index.html             home: Light → Kaleidoscope → Zenith scroll scene, editions, speakers, attend, contact
  2025/  2026/  2027/    the three edition pages
  ais/   ais/apply/      Ahmedabad Idea Search + Steward Desk
  virasat/  team/  partner/  story/
  speaker/               Speaker Portal: sign the 4 agreements, write the talk, check facts, get feedback
  portal/                Team Portal (tasks, roles, inbox, registrations, AIS, speakers, website content)
  assets/config.js       the ONE setting: your Apps Script URL
  _redirects  _headers
backend/                 paste these six files into one Apps Script project
  Code.gs   Feeds.gs   Ais.gs   Docs.gs   Speakers.gs   Mail.gs
```

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
2. Go to **Extensions → Apps Script**. Delete the sample code and create six files: `Code.gs`, `Feeds.gs`, `Ais.gs`, `Docs.gs`, `Speakers.gs` and `Mail.gs`. Paste each file from `backend/` into the matching file.
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

> When you change the backend code later, use **Deploy → Manage deployments → Edit → New version**. This keeps the same URL.

### Moving your existing data in
- **Team page:** copy the rows from the old Team sheet into the **Team** tab. Use the `role` column for the designation and set `edition_id` to `ED-2025`, `ED-2026` or `ED-2027`. You can also add people one at a time in Portal → Team members.
- **AIS Stewards and referrals:** copy the old referrals into the **Referrals** tab. Stewards cannot keep their old passwords, because the old script stored them differently. Copy their rows into **Stewards** and leave `salt` and `hash` blank. Each Steward then signs in once with **Forgot password** to set a new one. Alternatively, ask them to register again.
- Until `TXTY_API` is set, the Team page and Steward Desk keep using the **old** scripts, so nothing breaks during the switch.

### Speaker Portal setup (5 minutes)
1. **Gemini key (free):** go to Google AI Studio → **Get API key** and create a key. In Apps Script, open **Project Settings → Script properties** and add `GEMINI_API_KEY` with your key. Free-tier requests are rate-limited, and Google may use them to improve its products. Without a key, speakers can still submit drafts, but without the AI fact list.
2. **Drive:** the first signed agreement creates a **TEDxThaltej Youth — Speaker Records** folder with `Agreements/`, `Drafts/` and `Signatures/` subfolders. To use your own folder instead, add its ID as `DRIVE_FOLDER_ID` in Script properties.
3. **Settings** (Portal → Site settings): `organizer_name`, `speaker_contact_email` (receives a copy of every signed PDF), `speaker_draft_due` (goes into the Confirmation form) and `gemini_model`.
4. After pasting the new files, run `setup` once more and approve the new permissions (Drive, Docs, external requests).

**The speaker journey:**
1. In Portal → **Speakers**, add a speaker with their email and assign a **Speaker Ambassador**, then press **Invite**. The speaker gets a set-password link that lasts 14 days.
2. The speaker fills in their details and reads all four agreements: TED Speaker Release, Speaker Confirmation and Agreement Form, Organizer Protection and Extended Agreement, and Issue & Insurer Protection Agreement. Each agreement has its own tick box, which only unlocks once they have scrolled to the end. They then type their name and draw one signature; a parent or guardian also signs if the speaker is under 18. The event date, theme and venue come automatically from the speaker's edition.
3. A PDF of all four agreements plus a signing record is emailed to the speaker and to `speaker_contact_email`, and saved to Drive. The signing record holds the time, device and a hash of each document's exact text.
4. The organizer (super-admin) opens the speaker → **Agreements** → **Countersign**. They draw their signature once, and it can be reused after that. The final PDF, signed by both, is emailed and saved.
5. The speaker writes the talk in the portal, which autosaves. They press **Check facts**: Gemini lists every statistic, date, study, quote or scientific claim, and flags TEDx guideline issues such as selling or political or religious agendas. Each listed fact needs a source link, or must be marked as personal experience or to be removed, before the draft can be submitted. The checker only finds claims; people verify them.
6. The ambassador reads the version, sees every claim with its sources, and adds comments on specific paragraphs. They then **Request changes** or **Approve**, and the speaker is emailed. Every submitted version is also saved as a Google Doc in Drive for your records. Speakers never see Google Docs.

## 2 · Cloudflare Pages + GitHub (about 10 minutes)

1. Push this folder to a GitHub repository, for example `tedxthaltejyouth/site`.
2. In Cloudflare, go to **Workers & Pages → Create → Pages → Connect to Git** and pick the repo.
   - Framework preset: **None** · Build command: *(leave empty)* · Build output directory: **`public`**
3. Under **Custom domains**, add `tedxthaltejyouth.in` and `www.tedxthaltejyouth.in`. Your DNS is already on Cloudflare, so the records are created for you.
4. Every push to `main` now goes live automatically. Every pull request also gets its own preview link.

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
| **Team member** | Sees **My tasks** only: update status and post comments. Their head is emailed on each update |
| **Speaker Ambassador** | Any portal user assigned to a speaker. Sees **My speakers**: drafts, sources, feedback |

Sections: Dashboard · **Speakers** (invite, ambassador, countersign, draft review) · My tasks · Task allocation (board) · Team members · Departments · Portal users · Registrations (approve → ticket code emailed, waitlist, check-in, CSV) · Inbox (reply by email) · **AIS referrals** (read the three answers and move the status; the Steward is emailed) · **Idea Stewards** (pause an account) · Speakers · Editions · Partners · Site settings · Audit log.

Coming next: **Finance** and **TES**, once their old systems are shared.

## Still to bring in
Pages on the old Google Site that weren't shared yet: Gallery, Press release, Policy documents, Audit reports, Speaker verifier, FAQ, Blog, TEDxAssist and Collaborators. 
