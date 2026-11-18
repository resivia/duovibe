/* Cache the versioned app shell, never live room or authentication data. */
const ASSET_VERSION = 17;
const CACHE = 'duovibe-v' + ASSET_VERSION;
const VERSIONED_ASSETS = [
  'style.css', 'config.js', 'supabase-lite.js', 'banks.js', 'app.js',
  'minigames.js', 'deck.js', 'icons.js', 'partygames.js', 'social.js', 'features.js', 'duogames.js'
].map(file => './' + file + '?v=' + ASSET_VERSION);
const SHELL = ['./index.html', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png', ...VERSIONED_ASSETS];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('duovibe-v') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || /^\/(auth|rest)\/v1(?:\/|$)/.test(url.pathname)) return;

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(async () => (await caches.open(CACHE)).match('./index.html')));
  } else {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(req)) || fetch(req)));
  }
});
