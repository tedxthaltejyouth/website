// TEDxThaltej Youth website Worker.
// Serves the static site from /public, and the email open-tracking image at /t/o/<id>.<sig>.gif:
// it returns a 1×1 transparent GIF straight away and tells the Apps Script backend about the open in the background.
const GIF = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), c => c.charCodeAt(0));

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/t\/o\/(ML[A-Z0-9]{8,20})\.([a-f0-9]{12})\.gif$/);
    if (m) {
      if (env.TXTY_API) {
        ctx.waitUntil(fetch(env.TXTY_API, {
          method: 'POST', redirect: 'manual',
          body: JSON.stringify({ action: 'trk_open', id: m[1], sig: m[2], ua: (request.headers.get('user-agent') || '').slice(0, 200) })
        }).catch(() => {}));
      }
      return new Response(GIF, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'X-Robots-Tag': 'noindex' } });
    }
    if (url.pathname.startsWith('/t/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  }
};
