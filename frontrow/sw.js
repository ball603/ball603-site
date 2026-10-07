// NEC Front Row helper for the home screen app.
// It only keeps copies of team logos and fonts so they show instantly. Pages, code, scores and
// video always come straight from the internet (Safari can trip over helpers that do more).
const CACHE = 'frontrow-v4';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys
    // Only this app's own caches. Ball603 and the Tigers app keep their caches on
    // this same origin, and an unfiltered delete here empties theirs too.
    .filter(k => k.startsWith('frontrow-') && k !== CACHE)
    .map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || req.mode === 'navigate') return;
  const url = new URL(req.url);
  const isLogo = url.origin === location.origin && url.pathname === '/.netlify/functions/frontrow-logo';
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!isLogo && !isFont) return;   // everything else goes straight to the internet
  e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') c.put(req, res.clone());
    return res;
  }))));
});
