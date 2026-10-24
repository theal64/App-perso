// Service worker : met l'app en cache pour qu'elle marche hors ligne.
// Pense à incrémenter VERSION à chaque modification des fichiers ci-dessous.
const VERSION = 'v2';
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
  './js/transition.js',
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
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
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

// Réseau d'abord (pour avoir les mises à jour), cache en secours hors ligne.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }))
  );
});
