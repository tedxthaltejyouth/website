/**
 * News: articles at /news (list) and /news/?a=<slug> (article), written in the Team Portal.
 * Each article carries citation metadata (author, dates, publisher, permanent URL) so it can be cited, and the
 * article page publishes it as schema.org NewsArticle data for search engines.
 * Body format: plain text with simple markup: blank line = new paragraph, "## " heading, "> " quote, "- " list,
 * **bold**, *italic*, [link text](https://…), and ![image caption](https://image-url) for an image.
 */
const NEWS_CATEGORIES = ['Announcement', 'Press release', 'Story', 'Event recap', 'Speaker', 'Idea Search', 'Partners', 'Behind the scenes'];

function newsSlug_(title, id) {
  return (String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'article') + '-' + id.slice(-4).toLowerCase();
}
function newsPublic_(a, withBody) {
  const o = { id: a.id, slug: a.slug, title: a.title, summary: a.summary, image_url: a.image_url, image_alt: a.image_alt, image_credit: a.image_credit,
    author: a.author, category: a.category, tags: String(a.tags || '').split(',').map(function (t) { return t.trim(); }).filter(String),
    published_at: a.published_at, updated_at: a.updated_at, words: String(a.body || '').split(/\s+/).filter(String).length };
  if (withBody) o.body = a.body;
  return o;
}
function newsLive_(a) { return a.status === 'Published' && a.published_at && a.published_at <= now_().slice(0, 10); }

function newsFeed_() {
  const cache = CacheService.getScriptCache(), hit = cache.get('news');
  if (hit) return JSON.parse(hit);
  const out = { ok: true, categories: NEWS_CATEGORIES, articles: readAll_('News').filter(newsLive_)
    .sort(function (a, b) { return String(b.published_at + b.created_at).localeCompare(String(a.published_at + a.created_at)); }).map(function (a) { return newsPublic_(a, false); }) };
  cache.put('news', JSON.stringify(out), 300);
  return out;
}
function newsArticle_(slug) {
  const a = readAll_('News').filter(function (x) { return x.slug === String(slug || '') && newsLive_(x); })[0];
  if (!a) throw new Error('Article not found.');
  return { ok: true, article: newsPublic_(a, true), publisher: 'TEDxThaltej Youth', site: CONFIG.SITE_URL };
}

// ───────────────────────────── PORTAL ─────────────────────────────
function newsMust_(me, write) {
  if (me.role === 'super') return;
  if (me.scopeList.indexOf('news') < 0) throw new Error('You don’t have access to News.');
  if (write && me.role === 'viewer') throw new Error('You have view-only access to News.');
}
function newsList_(me) {
  newsMust_(me, false);
  return { ok: true, categories: NEWS_CATEGORIES, siteUrl: CONFIG.SITE_URL,
    rows: readAll_('News').sort(function (a, b) { return String(b.published_at || b.created_at).localeCompare(String(a.published_at || a.created_at)); })
      .map(function (a) { return Object.assign(newsPublic_(a, true), { status: a.status, created_by: a.created_by }); }) };
}
function newsSave_(me, r) {
  newsMust_(me, true);
  const title = String(r.title || '').trim().slice(0, 160);
  if (!title) throw new Error('Add a headline.');
  const status = r.status === 'Published' ? 'Published' : 'Draft';
  const body = String(r.body || '').slice(0, 60000);
  if (status === 'Published' && body.split(/\s+/).filter(String).length < 20) throw new Error('Write the article (at least 20 words) before publishing.');
  if (r.published_at && !/^\d{4}-\d{2}-\d{2}$/.test(r.published_at)) throw new Error('Use a valid publication date.');
  const rec = { title: title, summary: String(r.summary || '').slice(0, 400), body: body, image_url: String(r.image_url || '').slice(0, 500),
    image_alt: String(r.image_alt || '').slice(0, 200), image_credit: String(r.image_credit || '').slice(0, 200), author: String(r.author || me.name || 'TEDxThaltej Youth').slice(0, 120),
    category: NEWS_CATEGORIES.indexOf(r.category) >= 0 ? r.category : NEWS_CATEGORIES[0],
    tags: String(r.tags || '').split(',').map(function (t) { return t.trim(); }).filter(String).slice(0, 10).join(', '),
    status: status, published_at: r.published_at || (status === 'Published' ? now_().slice(0, 10) : ''), updated_at: now_() };
  let id = r.id;
  withLock_(function () {
    if (id) {
      const ex = findRow_('News', id);
      if (!ex) throw new Error('Article not found.');
      updateRow_('News', id, rec);
    } else {
      id = newId_('NW');
      appendRow_('News', Object.assign({ id: id, slug: newsSlug_(title, id), created_by: lc_(me.email), created_at: now_() }, rec));
    }
  });
  CacheService.getScriptCache().remove('news');
  audit_(me.email, 'save article', id + ' ' + status + ' ' + title);
  return { ok: true, id: id, slug: findRow_('News', id).slug };
}
function newsRemove_(me, id) {
  newsMust_(me, true);
  const a = findRow_('News', id);
  if (!a) throw new Error('Article not found.');
  deleteRow_('News', id);
  CacheService.getScriptCache().remove('news');
  audit_(me.email, 'delete article', id + ' ' + a.title);
  return { ok: true };
}
