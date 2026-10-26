/* ═══════════════════════════════════════════════════════════════════
   DuoVibe service worker

   Goal: the app shell loads instantly and keeps working on a bad mobile
   connection. Game state is never cached — every room read goes to the
   network so two players cannot drift apart on stale data.
   ═══════════════════════════════════════════════════════════════════ */
const CACHE = 'duovibe-v15';
const SHELL = [
  './',
  './index.html',
  './style.css',
  './config.js',
  './supabase-lite.js',
  './banks.js',
  './app.js',
  './minigames.js',
  './partygames.js',
  './deck.js',
  './social.js',
  './icons.js',
  './features.js',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  /* Never touch API traffic: room state must always be live */
  if (req.method !== 'GET' || url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/')) {
    return;
  }

  /* Navigations: network first, fall back to the cached shell offline */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  /* Same-origin assets: cache first, refresh in the background */
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  /* Google Fonts: cache first, they are immutable */
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => hit))
    );
  }
});
