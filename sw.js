/* Minimal service worker.
   Chrome needs one with a fetch handler before it will offer "Install app".
   It caches only the shell, never your data — every figure is fetched live. */

const SHELL = 'money-shell-v1';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never touch the API or Google sign-in — those must always go to the network.
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Network first, so a redeployed app shows up straight away; cache is the
  // fallback for a dead connection.
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(SHELL).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
