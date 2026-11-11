/* Team Portal service worker: lets the portal install as an app and open instantly.
   Pages and scripts: network first, cached copy when offline. API calls (script.google.com) are never cached. */
const CACHE = 'txty-portal-v1';
const SHELL = ['/portal/', '/portal/portal-plus.js', '/assets/config.js', '/assets/logo-white.png', '/assets/logo-black.png', '/portal/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); if (r.ok) caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(m => m || caches.match('/portal/'))));
});
