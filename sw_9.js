// Compass — minimal offline service worker (companion file).
//
// This is the one piece of Compass's "app" setup that can't live inside compass.html itself:
// browsers won't let a page register a service worker from a blob:/data: URL (unlike the PWA
// manifest, which compass.html already builds inline) — a service worker script has to be
// fetched as a real, same-origin file. So: upload this file in the SAME folder as compass.html
// when you host it. If it's missing, compass.html just skips registering it and works exactly as
// it does today — nothing else depends on this file being present.
//
// What it does: caches compass.html itself (and the page's own URL) so the app still opens with
// no internet connection. It does NOT try to cache the Google Fonts request — if that fails
// offline, the CSS already falls back to system fonts (serif/sans-serif/monospace), so nothing
// breaks, text just renders in a default font until it's back online.
const CACHE_NAME = 'compass-cache-v1';
const APP_SHELL = ['./', './compass.html'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Network-first, falling back to the cached app shell: a student online always gets the latest
// version; a student offline (or whose connection drops mid-session) still gets the app itself.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./compass.html')))
  );
});
