// NEC Front Row offline helper.
// Always tries the internet first, so new uploads show up right away.
// Keeps a copy of the styles, code and logos so pages load faster on a bad connection.
// Video and live scores are never stored.
const CACHE = 'frontrow-v3';
const SHELL = ['/frontrow/assets/fr.css', '/frontrow/assets/fr.js', '/frontrow/assets/player.js', '/frontrow/data/events.json', '/frontrow/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Page loads go straight to the site. Safari refuses a page the helper hands back after a
  // redirect (like ball603.com/frontrow without the ending slash), so we stay out of the way.
  if (req.mode === 'navigate') return;
  const url = new URL(req.url);
  const isLogo = url.pathname === '/.netlify/functions/frontrow-logo';
  const mine = url.origin === location.origin && (url.pathname.startsWith('/frontrow/') || isLogo);
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!mine && !fonts) return;   // video, scores and everything else go straight to the internet
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: !isLogo }).then(hit => hit || Response.error()))
  );
});
