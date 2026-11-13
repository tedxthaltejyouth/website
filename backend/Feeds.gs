/**
 * Public feeds used by the existing pages, plus first-run content.
 *   ?action=team      → the /team page (same shape as the old Team script; JSONP supported)
 *   ?action=partners  → confirmed partner names for /partner
 */

function currentEdition_(eds) {
  const today = now_().slice(0, 10);
  const asc = eds.slice().sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
  return asc.filter(function (e) { return String(e.date).slice(0, 10) >= today; })[0] || asc[asc.length - 1] || null;
}

function teamFeed_() {
  const cache = CacheService.getScriptCache(), hit = cache.get('teamfeed');
  if (hit) return JSON.parse(hit);
  const eds = readAll_('Editions').filter(pub_).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  const cur = currentEdition_(eds);
  const team = readAll_('Team').filter(pub_).sort(by_('sort', true));
  const out = {
    editions: eds.map(function (e) {
      return {
        name: 'TEDxThaltej Youth ' + String(e.date).slice(0, 4),
        theme: e.theme || e.title,
        members: team.filter(function (t) { return (t.edition_id || (cur && cur.id)) === e.id; })
          .map(function (t) { return { name: t.name, designation: t.role }; }),
      };
    }),
  };
  try { cache.put('teamfeed', JSON.stringify(out), CONFIG.SITE_CACHE_SECONDS); } catch (x) { /* fine */ }
  return out;
}

function partnersFeed_() {
  const eds = readAll_('Editions').filter(pub_), cur = currentEdition_(eds);
  return readAll_('Sponsors').filter(pub_).filter(function (s) { return !s.edition_id || (cur && s.edition_id === cur.id); })
    .sort(by_('sort', true)).map(function (s) { return s.name; });
}

/** First run only: the editions, speakers and team already published on the existing pages. */
function seedContent_() {
  if (readAll_('Departments').length === 0) {
    [
      ['Ahmedabad Idea Search (AIS)', 'Sanskriti Patidar'], ['Curation', 'Hirva'], ['Speaker Support', 'Jagruti'],
      ['Social Media', 'Kalash'], ['Design & Graphics', 'Sashwat'], ['Hosting', 'Aryan (co-lead Kanisha)'],
      ['Finance', 'Yashvi Mehta'], ['Virasat · Arts and Culture Space', ''],
    ].forEach(function (d, i) { appendRow_('Departments', { id: 'DP-' + (i + 1), name: d[0], description: '', lead: d[1], sort: String(i + 1) }); });
  }
  if (readAll_('Editions').length > 0) return;

  const E1 = 'ED-2025', E2 = 'ED-2026', E3 = 'ED-2027';
  [
    { id: E1, number: '01', date: '2025-06-15', title: 'The Future of Education: A Light Towards Wisdom', theme: 'A Light Towards Wisdom',
      venue: 'JG Auditorium, JG Campus of Excellence, Sola Road, Ahmedabad', page_url: '/2025', video_url: 'https://youtu.be/sezR_5jnGq0',
      description: 'Six speakers, three performances and the first light of TEDxThaltej Youth.' },
    { id: E2, number: '02', date: '2026-06-25', title: 'The Kaleidoscope of Perspectives', theme: 'The Kaleidoscope of Perspectives',
      venue: 'Apple Global School Auditorium, Ahmedabad', page_url: '/2026', video_url: 'https://youtu.be/07l8K1AiDB8',
      description: 'Nine speakers, two performances and one auditorium full of perspectives.' },
    { id: E3, number: '03', date: '2027-06-26', title: 'The Zenith — Where the Unseen Connects', theme: 'The Zenith',
      venue: 'Ahmedabad', page_url: '/2027', video_url: '', description: 'Where the Unseen Connects.' },
  ].forEach(function (e) { e.published = 'TRUE'; e.image_url = ''; appendRow_('Editions', e); });

  const SP = [
    [E1, 'Dr. Darshak Dasadiya', 'Medical doctor, yoga practitioner and holistic development advocate'],
    [E1, 'Dr. Kavita Sharma', 'Pioneering educator and principal'],
    [E1, 'Dr. Shivani Mehta', 'Global educator and principal'],
    [E1, 'Apoorv Jha', 'Podcaster, digital marketer and healthcare advocate'],
    [E1, 'Hemanshi Agrawal', 'Social entrepreneur'],
    [E1, 'Saumya Sheth', 'Student and advocate for social justice'],
    [E2, 'Dr. Archana Chowdhry', 'Ophthalmic surgeon, entrepreneur and advocate for women’s leadership'],
    [E2, 'Dr. CA Achyut Dani', 'Entrepreneur, educator and strategic management mentor'],
    [E2, 'Dr. Vijay Rao', 'Educator, entrepreneur and financial literacy professional'],
    [E2, 'Nitesh Bhardwaj', 'Social entrepreneur and community development practitioner'],
    [E2, 'Falgun Rathod', 'Cyber security expert, ethical hacker, author and entrepreneur'],
    [E2, 'Raju Dandigam', 'Staff Software Engineer and AI engineering leader at Navan'],
    [E2, 'Shabd Shaurya', 'Author and Guinness World Record holder'],
    [E2, 'Shuvajit Payne', 'Education innovator and social impact leader'],
    [E2, 'Hemangi Prajapati', 'Creator, author and youth development advocate'],
  ];
  SP.forEach(function (s, i) {
    appendRow_('Speakers', { id: 'SP-' + ('00' + (i + 1)).slice(-3), name: s[1], designation: s[2], talk_title: '', bio: '', photo_url: '',
      edition_id: s[0], video_url: '', sort: String(i + 1), published: 'TRUE' });
  });

  const TM = [
    [E1, 'Fenil Shah', 'Organiser', ''], [E1, 'Bindu Raphael', 'Co-organiser', ''], [E1, 'Stephen Philip', 'Team member', ''],
    [E1, 'Yashvi Mehta', 'Team member', ''], [E1, 'Vinchy Makwana', 'Team member', ''], [E1, 'Darshini Patel', 'Team member', ''],
    [E1, 'Pranjal Koisa', 'Team member', ''],
    [E3, 'Fenil Pritesh Shah', 'Organiser and Licensee', ''], [E3, 'Sanskriti Patidar', 'Lead, Ahmedabad Idea Search', 'DP-1'],
    [E3, 'Hirva', 'Lead, Curation', 'DP-2'], [E3, 'Jagruti', 'Lead, Speaker Support', 'DP-3'], [E3, 'Kalash', 'Lead, Social Media', 'DP-4'],
    [E3, 'Sashwat', 'Lead, Design & Graphics', 'DP-5'], [E3, 'Aryan', 'Lead, Hosting', 'DP-6'], [E3, 'Kanisha', 'Co-lead, Hosting', 'DP-6'],
    [E3, 'Yashvi Mehta', 'Director of Finance', 'DP-7'],
  ];
  TM.forEach(function (t, i) {
    appendRow_('Team', { id: 'TM-' + ('00' + (i + 1)).slice(-3), name: t[1], role: t[2], department_id: t[3], edition_id: t[0],
      email: '', phone: '', photo_url: '', bio: '', linkedin: '', sort: String(i + 1), published: 'TRUE' });
  });
}
