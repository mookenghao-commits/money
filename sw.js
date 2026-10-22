/* Minimal service worker.
   Chrome needs one with a fetch handler before it will offer "Install app".
   It caches only the shell, never your data — every figure is fetched live. */

const SHELL = 'money-shell-v2';
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

  // The page itself is fetched with cache:'reload', which skips the browser's
  // own HTTP cache. Without this, GitHub Pages' 10-minute cache header can keep
  // serving yesterday's index.html even though the network is fine — which looks
  // exactly like "my edit did not save".
  const isDoc = e.request.mode === 'navigate' || e.request.destination === 'document';
  const req = isDoc ? new Request(e.request.url, { cache: 'reload' }) : e.request;

  // Network first, so a redeployed app shows up straight away; cache is the
  // fallback for a dead connection.
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(SHELL).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
