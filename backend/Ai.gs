/**
 * AI helpers (Groq first, Gemini as backup; same keys as the fact checker).
 *  • Bio polish: a speaker's bio → clean third-person 150-word, 50-word and one-line versions. The speaker chooses.
 *  • Curation report: a talk draft checked against TED's TEDx Content Guidelines
 *    (https://www.ted.com/tedx/organizer-guide/tedx-content-guidelines): no commercial agendas, no political agendas or
 *    inflammatory rhetoric, no religious agendas, no bad science (incl. health claims), plus talk craft.
 *  The AI only advises: people decide. Nothing private (grievances, money, signatures, evidence) is ever sent.
 */
function aiRun_(prompt) {
  const props = PropertiesService.getScriptProperties();
  const groqKey = props.getProperty('GROQ_API_KEY'), gemKey = props.getProperty('GEMINI_API_KEY');
  if (!groqKey && !gemKey) throw new Error('AI is not switched on yet. Add GROQ_API_KEY in Script Properties.');
  let last = null;
  if (groqKey) try { return groqRun_(groqKey, prompt); } catch (e) { last = e; Logger.log('AI groq: ' + e.message); }
  if (gemKey) try { return geminiRun_(gemKey, prompt); } catch (e) { last = e; Logger.log('AI gemini: ' + e.message); }
  throw last;
}
const clipS_ = function (s, n) { return String(s == null ? '' : s).trim().slice(0, n); };

// ───────── bio polish ─────────
function aiBio_(sp, d) {
  const bio = clipS_(d.bio || sp.bio, 3000);
  if ((bio.match(/\S+/g) || []).length < 15) throw new Error('Write a few sentences about yourself first (15+ words), then polish.');
  rateLimit_('aibio_' + sp.id, 8, 3600);
  const r = aiRun_('You edit speaker bios for a TEDx event programme. Rewrite the bio below.\n' +
    'Rules: third person; use the name "' + clipS_(sp.name, 80) + '"; keep every fact exactly as given and add NO new facts, titles, numbers or awards; ' +
    'no hype words ("visionary", "renowned", "world-class", "thought leader") unless they are in the original; plain, warm, specific English; Indian English spelling; ' +
    'no promotion of products, books or services, and no calls to action.\n' +
    'Return JSON: {"bio150":"about 150 words","bio50":"about 50 words","line":"one line of at most 18 words for a speaker card","notes":["up to 3 short notes for the speaker, e.g. facts that seem missing or a sentence you removed and why"]}\n\n' +
    'DESIGNATION: ' + clipS_(d.designation || sp.designation, 160) + '\nTALK TITLE: ' + clipS_(d.talk_title || sp.talk_title, 160) + '\n\nBIO:\n' + bio);
  const o = r.out || {};
  return { ok: true, model: r.model, bio150: clipS_(o.bio150, 1600), bio50: clipS_(o.bio50, 600), line: clipS_(o.line, 200),
    notes: [].concat(o.notes || []).slice(0, 3).map(function (x) { return clipS_(x, 240); }) };
}

// ───────── curation report ─────────
const TEDX_GUIDES = [
  ['commercial', 'No commercial agendas', 'If it feels like an advertisement, it probably is. Mention own work only when essential; no pitching products or services, promoting books, asking for funding, branded logos or merchandise, calls to buy or get involved with the speaker\'s business. Ideas first, not the speaker\'s role. No circuit/motivational speakers or life coaches.'],
  ['political', 'No political agendas or inflammatory rhetoric', 'No partisan politics, attacking or advocating parties, platforms or leaders; no campaigning for or against a candidate, official or bill; no extremist or inflammatory positions; no advocating violence or oppression; no recruiting for or glorifying military/police/defence or warfare. Divisive topics need nuance, no "us vs them", consensus-building, care for a global audience. Focus on concrete problems and solutions.'],
  ['religious', 'No religious agendas', 'No trying to prove or persuade that a religion, deity or belief system (including atheism) is correct; may be honest about own beliefs but not promote them or denigrate others. Caution with new-age beliefs (quantum consciousness, Gaia theory, archaeoastronomy, drug-induced spiritual epiphanies).'],
  ['science', 'No bad science (and health claims)', 'Scientific claims should be testable, peer-reviewed, credible to experts, backed by enough data, acknowledge doubt, not contradict the broad body of science, come from a qualified speaker, respect the scientific method. Red flags: untestable or mysterious claims, irreproducible results, overconfident advocacy, oversimplified studies, vague vocabulary ("quantum consciousness", "energy fields", "crystal healing"), dismissing evidence. Health and medical claims must not mislead people with illness.']
];
function aiCurate_(me, b) {
  const dr = findRow_('Drafts', b.draftId); if (!dr) throw new Error('Draft not found.');
  const sp = findRow_('Speakers', dr.speaker_id); if (!sp || !spkCanSee_(me, sp)) throw new Error('Draft not found.');
  if (!b.refresh) { const old = safeJson_(dr.curation_json, null); if (old && old.text_hash === sha_(String(dr.body || ''))) return { ok: true, report: old, cached: true }; }
  rateLimit_('aicur_' + lc_(me.email), 20, 3600);
  const paras = spkParas_(dr.body || ''), words = (String(dr.body || '').match(/\S+/g) || []).length;
  if (words < 120) throw new Error('This draft is too short for a curation report (needs 120+ words).');
  const ed = findRow_('Editions', sp.edition_id) || {};
  const prompt = 'You are a senior TEDx curator. Write a curation report on the talk draft below, judged against TED\'s official TEDx Content Guidelines and good talk craft. Be fair, specific and kind; quote the draft exactly when you point to a problem; do not invent facts about the speaker.\n\n' +
    'TEDx CONTENT GUIDELINES:\n' + TEDX_GUIDES.map(function (g, i) { return (i + 1) + '. [' + g[0] + '] ' + g[1] + ': ' + g[2]; }).join('\n') + '\n\n' +
    'EVENT THEME: ' + clipS_(ed.theme || ed.title, 160) + '\nTALK TITLE: ' + clipS_(dr.title, 200) + '\nSPEAKER DESIGNATION: ' + clipS_(sp.designation, 160) + '\n\n' +
    'Return JSON exactly in this shape:\n{"verdict":"ready|minor|major|not_suitable","summary":"3 sentences on where the talk stands",' +
    '"idea":"the talk\'s central idea in one sentence, or \\"unclear\\"","idea_strength":1,"theme_fit":"one sentence",' +
    '"guidelines":[{"key":"commercial|political|religious|science","status":"pass|caution|fail","note":"one sentence","findings":[{"paragraph":1,"quote":"exact words","issue":"what is wrong","fix":"how to fix it"}]}],' +
    '"craft":{"opening":{"score":1,"note":""},"structure":{"score":1,"note":""},"evidence":{"score":1,"note":""},"storytelling":{"score":1,"note":""},"ending":{"score":1,"note":""},"accessibility":{"score":1,"note":"jargon, global audience"}},' +
    '"risks":["short items needing a fact-check or legal/sensitivity care"],"strengths":["up to 4"],"next_steps":["up to 6 concrete edits, most important first"]}\n' +
    'Scores are 1–5. Include all four guideline keys. Use "caution" when unsure.\n\nDRAFT (numbered paragraphs):\n' + paras.map(function (p, i) { return '[' + (i + 1) + '] ' + p; }).join('\n\n');
  const r = aiRun_(prompt), o = r.out || {};
  const V = ['ready', 'minor', 'major', 'not_suitable'], S = ['pass', 'caution', 'fail'];
  const sc = function (x) { const n = parseInt(x, 10); return n >= 1 && n <= 5 ? n : 3; };
  const g = TEDX_GUIDES.map(function (G) {
    const f = [].concat(o.guidelines || []).filter(function (x) { return x && x.key === G[0]; })[0] || {};
    return { key: G[0], title: G[1], status: S.indexOf(f.status) >= 0 ? f.status : 'caution', note: clipS_(f.note, 300),
      findings: [].concat(f.findings || []).slice(0, 6).map(function (x) { return { paragraph: parseInt(x.paragraph, 10) || 0, quote: clipS_(x.quote, 400), issue: clipS_(x.issue, 300), fix: clipS_(x.fix, 300) }; }).filter(function (x) { return x.quote || x.issue; }) };
  });
  const craft = {}; ['opening', 'structure', 'evidence', 'storytelling', 'ending', 'accessibility'].forEach(function (k) { const c = (o.craft || {})[k] || {}; craft[k] = { score: sc(c.score), note: clipS_(c.note, 300) }; });
  const list = function (a, n, m) { return [].concat(a || []).slice(0, n).map(function (x) { return clipS_(x, m); }).filter(String); };
  let verdict = V.indexOf(o.verdict) >= 0 ? o.verdict : 'major';
  if (g.some(function (x) { return x.status === 'fail'; }) && verdict === 'ready') verdict = 'major';
  const report = { model: r.model, made_at: now_(), made_by: lc_(me.email), version: dr.version, title: dr.title, speaker: sp.name, words: words, minutes: Math.round(words / 130 * 10) / 10,
    verdict: verdict, summary: clipS_(o.summary, 900), idea: clipS_(o.idea, 400), idea_strength: sc(o.idea_strength), theme_fit: clipS_(o.theme_fit, 300),
    guidelines: g, craft: craft, risks: list(o.risks, 8, 240), strengths: list(o.strengths, 4, 240), next_steps: list(o.next_steps, 6, 300), text_hash: sha_(String(dr.body || '')) };
  updateRow_('Drafts', dr.id, { curation_json: JSON.stringify(report) });
  audit_(me.email, 'curation report', dr.id);
  return { ok: true, report: report };
}
