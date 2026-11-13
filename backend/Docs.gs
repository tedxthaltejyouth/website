/**
 * The four speaker agreements, word for word, with the event details filled in automatically
 * from the speaker's edition (Editions tab) and Site settings:
 *   {{TEDX}} {{EVENT_DATE}} {{THEME}} {{VENUE}} {{DRAFT_DUE}} {{ORGANIZER}} {{ORGANIZER_MR}} {{CONTACT}}
 * Markup: "## " heading · "- " list item · "> " note · anything else is a paragraph.
 * To change wording, edit here and redeploy. Every signed copy records a hash of the exact text signed.
 */

const SPEAKER_DOCS = [
  {
    key: 'release',
    title: 'TEDx Speaker Release',
    body: [
      '> Thank you for contributing to the TEDx Community. Our goal is for your upcoming TEDx Talk to be widely distributed across a range of media platforms around the world. In order to do so, please review and if agreed, sign the speaker release below. Please note that if the materials in your TEDx Talk are not properly licensed, the Talk may be (i) rejected for publication, (ii) taken down from the TEDx YouTube channel by a copyright owner, and/or (iii) targeted for legal action due to infringement. Please complete this form, make copies for your records and email to your {{TEDX}} contact: {{CONTACT}}',
      '## 1. Scope',
      '{{TEDX}} will be recording all the presentations at the TEDx event to be held {{EVENT_DATE}} (the "Event") with the theme "{{THEME}}". The Event is operated under license of TED Conferences, LLC located at 330 Hudson Street, 11th Floor, New York, NY 10013 ("TED"). This release (the "Release") represents our agreement concerning your participation at the Event. In consideration for the platform provided to you and in support of the goal of "ideas worth spreading", you agree that: (i) you have created your own presentation; (ii) the materials used in your presentation are owned by you or licensed appropriately for use; (iii) you grant {{TEDX}}, TED and other entities authorized to do so - e.g., broadcasters - (collectively, the "TED Parties") the right to record, stream, film and photograph your presentation at the Event (the "Presentation"); and (iv) you grant TED exclusive, unrestricted rights to display, distribute, perform, reproduce, edit, create derivative works from, and/or otherwise use the Presentation anywhere around the world, in whole or in part, alone or accompanied by other material, in any and all media without any further approval from you, in perpetuity. This includes the ability to translate your Presentation into any language, and the right to sub-license the Presentation as necessary to third parties that TED deems appropriate.',
      '## 2. Personal information',
      'You understand and agree that by contributing to {{TEDX}}, that you consent to have your Presentation published worldwide, and grant full consent to {{TEDX}} and TED to process, manage, store and transmit personal information collected from your Presentation, including supporting information, such as your name, voice, photograph, likeness and biographical data (collectively, "Supporting Information") to third parties for permitted use. Examples of permitted uses of the Presentation and Supporting Information include TED\'s right to display the Presentation on the TEDx YouTube channel or on TED\'s website (TED.com) on television and distributing the Presentation on mobile phones, films, and other video distribution channels, such as iTunes, or through other third party organizations (such as airlines, hotels or corporate partners).',
      '## 3. Public distribution',
      'You understand and agree that TEDx Talks selected for publication may be shared under a "Creative Commons" license, CC BY - NC - ND 4.0 as long as appropriate credit is given, not edited or distorted, nor used for commercial purposes.',
      '## 4. No conditions',
      'You understand and agree that your involvement is for the opportunity to present an idea to a wide audience and to support the {{TEDX}} and TED mission, as good and valuable consideration. You agree that there are no other conditions required and that: (i) {{TEDX}} and TED aren\'t obligated to use, publish or distribute the Presentation or Supporting Information in any way; (ii) you won\'t receive any form of payment in connection with the use of the Presentation and/or Supporting Information; and (iii) except as required by law, you may not revoke the rights granted in this Release.',
      '## 5. Ownership',
      'You affirm that: (i) you have the full power and authority to grant the rights set forth in this Release; (ii) you are the sole author of the Presentation; (iii) you have not violated the intellectual property rights of another party and have permission to include all material in the Presentation, including, but not limited to, all copyrights and trademark rights; and (iv) you will advise {{TEDX}} in writing of all third-party material contained in the Presentation (and provide copies of licenses or permissions securing all necessary rights).',
      '## 6. Legal claims',
      'If any third party claims arise stating the use of the Presentation violates their rights, you agree to hold harmless and to cooperate fully with {{TEDX}} and TED to defend against or otherwise respond to such claim, pay license fees, if applicable, and provide written evidence of ownership of any portion of your Presentation if required.',
      '## 7. Entire agreement',
      'This Release contains the entire understanding between the parties and may not be modified except in a writing signed by both of us. This Release is governed by New York law, without regard to conflict-of-law principles. If you are under the age of 18, a signature from your parent/guardian is required below.',
    ],
  },
  {
    key: 'confirmation',
    title: 'Speaker Confirmation and Agreement Form',
    body: [
      '> Event Date: {{EVENT_DATE}} · Venue: {{VENUE}} · Theme: {{THEME}}',
      '## Section 1: Personal Information',
      '{{PERSONAL}}',
      '## Section 2: Agreement to Participation',
      '## 1. Event Participation',
      '1.1 I confirm my attendance at the {{TEDX}} event on {{EVENT_DATE}}.',
      '1.2 I agree to attend mandatory rehearsals, either 1 or 2 days prior to the event, as scheduled and communicated by the organizers.',
      '## 2. Financial Provisions',
      '2.1 I acknowledge that {{TEDX}} is a not-for-profit initiative, and no lodging, accommodation, or transportation will be provided by the organizers.',
      '2.2 I confirm that I will make my own arrangements for lodging, accommodation, and transportation to and from the venue.',
      '2.3 I understand that {{TEDX}} does not charge speakers any fees.',
      '2.4 I acknowledge that any guest accompanying me to the event will be required to pay the entry fee as determined by the Organizer.',
      '## 3. Association and Commitment',
      '3.1 By signing this agreement, I confirm my association with {{TEDX}} and agree to represent the event with integrity.',
      '3.2 I agree that I will not deny or disassociate myself from {{TEDX}} in any capacity following my participation in the event.',
      '3.3 I agree to adhere to TEDx branding and content guidelines in my talk and presentation materials.',
      '## 4. Content and Compliance',
      '4.1 I affirm that my talk and all materials used (e.g., slides, images, videos) are my original work or properly licensed, and comply with copyright laws.',
      '4.2 I agree to provide the first draft of my talk and presentation materials by {{DRAFT_DUE}} (or as communicated) for review and approval by the {{TEDX}} curation team.',
      '## 5. Legal and Liability',
      '5.1 I understand that {{TEDX}} operates as an independent, not-for-profit TEDx event, and I will not hold the organizers, volunteers, or TED liable for any personal loss, injury, or inconvenience incurred as part of my participation.',
      '5.2 I agree to abide by all rules, guidelines, and schedules communicated by the organizers.',
      '## 6. Media Release',
      '6.1 I grant {{TEDX}} the right to record, film, photograph, and distribute my talk and likeness in any media format, including YouTube and official TEDx platforms.',
      '6.2 I understand that my talk will be available under TEDx’s standard Creative Commons license, and I grant the organizers full rights to use my content for promotional and educational purposes.',
      '## 7. Miscellaneous',
      '7.1 I acknowledge that all decisions made by the Organizer, {{ORGANIZER_MR}}, and the {{TEDX}} team are final and binding.',
      '7.2 I understand that any updates or changes to this agreement will be communicated in writing.',
      '## Acknowledgment and Acceptance',
      'By signing this document, I confirm that I have read, understood, and agreed to the terms outlined above. I accept full responsibility for my participation in {{TEDX}} and commit to fulfilling all obligations as a speaker.',
      '> Note: if the speaker is below 18 years of age then the parent/guardian\'s consent and signature is mandatory.',
    ],
  },
  {
    key: 'protection',
    title: 'Organizer Protection and Extended Agreement',
    body: [
      '> Event Date: {{EVENT_DATE}} · Venue: {{VENUE}} · Theme: {{THEME}}',
      'This Agreement ("Agreement") is entered into by and between {{ORGANIZER_MR}}, Organizer of {{TEDX}} ("Organizer"), and the undersigned speaker ("Speaker"), in connection with the Speaker\'s participation in the above-referenced event ("Event").',
      '## 1. Organizer\'s Authority',
      '1.1 The Speaker acknowledges that all operational, logistical, and content-related decisions made by the Organizer and the {{TEDX}} team shall be final and binding.',
      '1.2 The Organizer reserves the right to amend, reschedule, edit, or withdraw the Speaker\'s participation at his sole discretion, without incurring any liability.',
      '## 2. Indemnification',
      '2.1 The Speaker agrees to indemnify, defend, and hold harmless the Organizer, {{TEDX}}, its affiliates, volunteers, and partners from any and all claims, liabilities, damages, expenses, or legal proceedings arising from:',
      '- (a) the Speaker\'s talk, presentation materials, or conduct;',
      '- (b) infringement of third-party intellectual property rights;',
      '- (c) reputational, legal, or financial harm resulting from the Speaker\'s actions or omissions.',
      '## 3. Confidentiality',
      '3.1 The Speaker shall treat all internal communications, operational processes, and proprietary information of {{TEDX}} as confidential.',
      '3.2 This obligation shall survive indefinitely beyond the conclusion of the Event.',
      '## 4. Non-Disparagement',
      '4.1 The Speaker shall not, at any time before, during, or after the Event, make or publish any false, defamatory, harmful, or malicious statements concerning the Organizer, {{TEDX}}, its volunteers, affiliates, or sponsors.',
      '4.2 Any genuine concerns or grievances must be raised privately and directly with the Organizer through appropriate professional channels.',
      '4.3 Breach of this clause entitles the Organizer to seek injunctive relief and/or damages under applicable law.',
      '## 5. Extended Use of Likeness',
      '5.1 The Speaker grants the Organizer the right to use their name, image, likeness, and biographical information for promotional, archival, or marketing purposes directly connected with {{TEDX}}, in any medium, worldwide, in perpetuity.',
      '## 6. Governing Law',
      '6.1 This Agreement shall be governed by and construed in accordance with the laws of the Republic of India.',
      '6.2 The Speaker consents to the exclusive jurisdiction of the courts of Ahmedabad, Gujarat, for the resolution of any disputes.',
      '## Acknowledgment',
      'By signing below, the Speaker affirms that they have read, understood, and voluntarily agreed to the terms set forth in this Agreement.',
      '> Note: if the speaker is below 18 years of age then the parent/guardian\'s consent and signature is mandatory.',
    ],
  },
  {
    key: 'issue',
    title: 'Issue & Insurer Protection Agreement',
    body: [
      '> Event Date: {{EVENT_DATE}} · Venue: {{VENUE}} · Organizer: {{ORGANIZER_MR}}, Organizer – {{TEDX}} · Event: {{TEDX}} ("Event")',
      'This Issue & Insurer Protection Agreement ("Agreement") is entered into between {{TEDX}} ("Organizer") and the undersigned Speaker ("Speaker") for the purposes of protecting the Event, its brand, and its leadership against misconduct, disputes, reputational harm, and related issues.',
      '## 1. Organizer\'s Rights',
      '1.1 The Speaker acknowledges that TED and {{TEDX}} have full discretion in all operational, logistical, and content decisions.',
      '1.2 The Organizer reserves the right to modify, reschedule, replace, or withdraw the Speaker\'s participation at any time, without liability, if required under TED guidelines or organizational policies.',
      '## 2. "Issue Clause" – Conditions Leading to Removal',
      '2.1 The Speaker may be withdrawn from the Event if:',
      '- (a) the Speaker violates TED/TEDx content, conduct, or communication guidelines;',
      '- (b) the Speaker engages in misconduct, unprofessional behavior, harassment, or creates a reputational risk;',
      '- (c) any information, behavior, or association of the Speaker threatens the credibility or safety of TED or {{TEDX}};',
      '- (d) the Speaker refuses to comply with rehearsals, deadlines, or TED-format requirements;',
      '- (e) there is any conflict of interest, policy breach, or public controversy involving the Speaker.',
      '2.2 The Organizer is not required to state a reason publicly and may withdraw the Speaker to protect the integrity of TED, {{TEDX}}, volunteers, team members, or attendees.',
      '## 3. Insurer & Indemnity Obligations (Speaker Liability Protection)',
      '3.1 The Speaker agrees to fully indemnify, defend, and hold harmless TED, {{TEDX}}, the Organizer, volunteers, partners, and affiliates against any and all claims, damages, losses, liabilities, or costs arising from:',
      '- (a) the Speaker\'s statements, presentation, conduct, or online/offline behavior;',
      '- (b) intellectual property violations (e.g., plagiarized content);',
      '- (c) any legal action initiated by third parties due to the Speaker\'s actions;',
      '- (d) reputational harm caused to TED or {{TEDX}}.',
      '3.2 If the Speaker is removed from the Event, this indemnity automatically increases in scope and remains valid indefinitely, without expiry.',
      '3.3 The Speaker confirms that they shall not hold TED, {{TEDX}}, or the Organizer liable for any perceived loss, damage, or consequence due to their removal.',
      '## 4. Non-Disparagement (Online & Offline Behavior)',
      '4.1 The Speaker agrees not to post, publish, share, forward, or circulate—in any form—any harmful, negative, false, or defamatory content about:',
      '- TED',
      '- {{TEDX}}',
      '- Organizer {{ORGANIZER_MR}}',
      '- Volunteers, partners, sponsors, or affiliates',
      '4.2 If the Speaker has concerns or grievances, they must raise them privately through official {{TEDX}} communication channels.',
      '4.3 Any violation of this clause entitles the Organizer to seek:',
      '- legal damages,',
      '- injunctive relief, and',
      '- reporting under applicable defamation & cyber laws.',
      '## 5. No Claims Upon Removal',
      '5.1 If the Speaker is removed due to any issue or policy:',
      '- (a) the Speaker shall file no suit, complaint, or claim against the Organizer or TED entities;',
      '- (b) removal shall not be considered discrimination or defamation;',
      '- (c) the Speaker waives any right to seek compensation or reinstatement.',
      '## 6. Confidentiality',
      '6.1 All internal communications, processes, documents, and operational information of {{TEDX}} are confidential.',
      '6.2 This confidentiality obligation survives permanently.',
      '## 7. Use of Likeness',
      '7.1 The Speaker grants {{TEDX}} the perpetual right to use their name, image, likeness, and biographical details for event-related marketing, archival, or promotional purposes.',
      '7.2 This right continues even if the Speaker is removed prior to the Event.',
      '## 8. Legal Compliance',
      '8.1 This Agreement is governed by the laws of the Republic of India.',
      '8.2 In case of any dispute, the Speaker agrees to the exclusive jurisdiction of the courts of Ahmedabad, Gujarat.',
      '## Acknowledgment & Signature',
      'By signing below, the Speaker confirms that:',
      '- They have read and understood this Agreement.',
      '- They agree to comply with all clauses.',
      '- They voluntarily enter into this Agreement without coercion.',
      '> Note: if the speaker is below 18 years of age then the parent/guardian\'s consent and signature is mandatory.',
    ],
  },
];

function ordinalDate_(iso) {
  const p = String(iso || '').slice(0, 10).split('-');
  if (p.length !== 3) return String(iso || '');
  const d = +p[2], m = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][+p[1] - 1];
  const sfx = (d % 10 === 1 && d !== 11) ? 'st' : (d % 10 === 2 && d !== 12) ? 'nd' : (d % 10 === 3 && d !== 13) ? 'rd' : 'th';
  return d + sfx + ' ' + m + ' ' + p[0];
}

/** Event details for a speaker's edition, used to fill every agreement. */
function docVars_(sp) {
  const s = settingsMap_();
  const ed = findRow_('Editions', sp.edition_id) || {};
  return {
    TEDX: 'TEDxThaltej Youth',
    EVENT_DATE: ordinalDate_(ed.date),
    THEME: ed.title || ed.theme || '',
    VENUE: ed.venue || s.venue || 'Ahmedabad, Gujarat',
    DRAFT_DUE: s.speaker_draft_due ? ordinalDate_(s.speaker_draft_due) : 'the date communicated by the organizers',
    ORGANIZER: s.organizer_name || 'Fenil Shah',
    ORGANIZER_MR: 'Mr. ' + (s.organizer_name || 'Fenil Shah'),
    CONTACT: s.speaker_contact_email || 'info@tedxthaltejyouth.in',
  };
}

/** The four documents, filled for this speaker. `personal` lines go into the Confirmation form. */
function speakerDocs_(sp, personal) {
  const v = docVars_(sp);
  return SPEAKER_DOCS.map(function (d) {
    const lines = [];
    d.body.forEach(function (line) {
      if (line === '{{PERSONAL}}') {
        (personal || [['Full Name', ''], ['E-mail', ''], ['Phone Number', ''], ['Address', ''], ['Title of the Talk', '']])
          .forEach(function (kv) { lines.push('- ' + kv[0] + ': ' + (kv[1] || '—')); });
        return;
      }
      lines.push(line.replace(/\{\{(\w+)\}\}/g, function (m, k) { return v[k] !== undefined ? v[k] : m; }));
    });
    return { key: d.key, title: d.title, lines: lines, hash: sha_(d.title + '\n' + lines.join('\n')) };
  });
}

function sha_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

function docHtml_(lines) {
  let html = '', inList = false;
  lines.forEach(function (l) {
    const isLi = l.indexOf('- ') === 0;
    if (inList && !isLi) { html += '</ul>'; inList = false; }
    if (l.indexOf('## ') === 0) html += '<h3>' + esc_(l.slice(3)) + '</h3>';
    else if (isLi) { if (!inList) { html += '<ul>'; inList = true; } html += '<li>' + esc_(l.slice(2)) + '</li>'; }
    else if (l.indexOf('> ') === 0) html += '<p class="note">' + esc_(l.slice(2)) + '</p>';
    else html += '<p>' + esc_(l) + '</p>';
  });
  if (inList) html += '</ul>';
  return html;
}
