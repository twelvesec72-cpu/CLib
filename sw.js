/* Clib service worker.
   BUMP THIS STRING ON EVERY DEPLOY or the phones keep serving the old app. */
const CACHE = 'clib-v2';
const COVERS = 'clib-covers-v1';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      // addAll is all-or-nothing; a single 404 would leave the app uncached,
      // so each entry is fetched on its own and failures are tolerated.
      .then(cache => Promise.all(SHELL.map(url =>
        cache.add(new Request(url, { cache: 'reload' })).catch(err => {
          console.warn('[sw] could not precache', url, err);
        })
      )))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(n => n !== CACHE && n !== COVERS)
      .map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Open Library metadata is never cached — a stale lookup is worse than none.
  if (url.hostname === 'openlibrary.org') return;

  // Cover thumbnails: cache-first, filled in opportunistically. They are the
  // only reason the library looks right offline.
  if (url.hostname === 'covers.openlibrary.org') {
    event.respondWith((async () => {
      const cache = await caches.open(COVERS);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        // Opaque responses still cache and still paint; only store successes.
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      } catch (err) {
        return hit || Response.error();
      }
    })());
    return;
  }

  // Navigations: network-first so a fresh deploy is picked up, falling back to
  // the cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', res.clone());
        return res;
      } catch (err) {
        const cache = await caches.open(CACHE);
        return (await cache.match('./index.html')) ||
               (await cache.match('./')) ||
               new Response('Offline and no cached copy of Clib.', {
                 status: 503, headers: { 'Content-Type': 'text/plain' }
               });
      }
    })());
    return;
  }

  // Same-origin assets: cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        return new Response('', { status: 504 });
      }
    })());
  }

  // Everything else (the ZXing CDN) falls through to the network untouched.
});
