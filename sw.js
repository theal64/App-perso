// Service worker : met l'app en cache pour qu'elle marche hors ligne.
// Pense à incrémenter VERSION à chaque modification des fichiers ci-dessous.
const VERSION = 'v11';
const CACHE = `routine-${VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/storage.js',
  './js/date.js',
  './js/theme.js',
  './js/sky.js',
  './js/endsky.js',
  './js/transition.js',
  './js/chime.js',
  './js/tabs/matin-plan.js',
  './js/tabs/matin-figures.js',
  './js/tabs/matin-icon.js',
  './js/tabs/index.js',
  './js/tabs/matin.js',
  './js/tabs/journee.js',
  './js/tabs/soir.js',
  './js/tabs/stats.js',
  './js/tabs/soon.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'no-cache' }))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// Réseau d'abord (pour avoir les mises à jour), cache en secours hors ligne.
// Les polices Google sont gardées en cache pour marcher hors ligne.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }
  if (url.origin !== self.location.origin) return;

  // cache: 'no-cache' : on revalide toujours auprès du serveur (GitHub Pages
  // laisse sinon le navigateur garder une ancienne version jusqu'à 10 min).
  event.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }))
  );
});
