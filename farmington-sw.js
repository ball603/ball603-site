/* Farmington Tigers service worker.
 *
 * SCOPE. The Tigers site is reachable at two origins: ball603.com under
 * /farmingtontigersnh/, and farmingtontigersnh.com at the root. This file is
 * served at BOTH .../sw.js paths by _redirects, and is registered from whichever
 * one matches the current host, so the scope comes out right on each without
 * any Service-Worker-Allowed header.
 *
 * That scope also matters on ball603.com for a second reason: Ball603's own
 * service worker is registered at the root with scope "/", so it already
 * controls the Tigers pages for anyone who has visited Ball603. A narrower
 * scope wins, so this one takes those URLs back — which is what we want,
 * because Ball603's worker serves CSS cache-first and that would quietly undo
 * the no-cache headers on farmington.css.
 *
 * CACHING. Deliberately not the same shape as Ball603's:
 *
 *   - farmington.css and farmington.js are network-ONLY while the network is
 *     there. Every Tigers page depends on that pair matching the HTML, and a
 *     stale script is exactly the bug the _headers overrides were written to
 *     stop. Cached copies exist solely so an offline launch renders something.
 *   - Supabase, Arbiter and SmugMug are never touched. Scores go stale in
 *     minutes and a cached score is worse than no score.
 *   - Everything else (logos, icons, the offline page) is cache-first, because
 *     it does not change and it is what makes a cold launch feel instant.
 */

/* BUMP THIS WHENEVER A CACHED FILE CHANGES. It is not decoration.
 *
 * Images are served cache-first below, and a cache is only ever cleared when
 * this name changes — so replacing a file at the same URL leaves the OLD bytes
 * being handed out for as long as the browser keeps the cache, which is
 * indefinitely. That is exactly what happened with the Home Screen icon: the
 * artwork was fixed and deployed, the icon on the phone did not change, and
 * neither a redeploy nor re-adding the page could shift it, because this said
 * v1 both times.
 *
 * The icons now live under a versioned path (/icons/farmington/v2/...) so their
 * URLs change when they do, which is the real fix — a URL that has never been
 * requested cannot be in any cache, here or in the browser's own. When the
 * icons change, this and that folder move together; a change to anything else
 * in SHELL moves this alone (v3: phone dark theme; v4: footer wordmark; v5: score page styles; v6: Score Entry in the menu). */
const CACHE = 'tigers-v6';

// Enough to open the app offline and have it look like itself. The pages
// themselves are cached as they are visited rather than up front, so installing
// does not pull down the whole site over someone's mobile data.
const SHELL = [
  '/farmington.css',
  '/farmington.js',
  '/farmington-offline.html',
  '/logos/farmington-tigers-wordmark.jpg',
  '/logos/100px/Farmington.png',
  '/icons/farmington/v2/icon-192.png'
];

// Never cached, at either origin: live data and anything that writes.
const LIVE = [/\/rest\/v1\//, /\.netlify\/functions\//, /supabase\.co/,
              /arbitersports\.com/, /smugmug\.com/, /googleapis\.com/];

// Must always match the deployed HTML, so never served from cache while online.
const ALWAYS_FRESH = [/\/farmington\.css$/, /\/farmington\.js$/];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // addAll is all-or-nothing: one 404 in the list and nothing is cached at
      // all, so each file is added on its own and a miss is survivable.
      .then(cache => Promise.all(SHELL.map(url =>
        cache.add(url).catch(err => console.warn('[Tigers SW] skipped', url, err.message)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      // Only this worker's own caches. Ball603's live alongside it on the same
      // origin and deleting those would empty the main site's cache.
      .then(names => Promise.all(names
        .filter(n => n.startsWith('tigers-') && n !== CACHE)
        .map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

const matches = (list, url) => list.some(re => re.test(url));

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // someone else's server
  if (matches(LIVE, request.url)) return;            // live data, straight through

  const wantsHtml = request.mode === 'navigate' ||
                    (request.headers.get('accept') || '').includes('text/html');

  // The two files every page depends on, and the pages themselves: network
  // first, cache only as a fallback when the network is not there.
  if (wantsHtml || matches(ALWAYS_FRESH, url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(c => c.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then(hit =>
          hit || (wantsHtml ? caches.match('/farmington-offline.html') : undefined) ||
          new Response('', { status: 503, statusText: 'Offline' })))
    );
    return;
  }

  // Logos, icons, crests: cache first, refreshed quietly in the background.
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) {
        event.waitUntil(fetch(request).then((response) => {
          if (response && response.ok) {
            return caches.open(CACHE).then(c => c.put(request, response));
          }
        }).catch(() => {}));
        return hit;
      }
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(c => c.put(request, copy));
        }
        return response;
      }).catch(() => new Response('', { status: 503, statusText: 'Offline' }));
    })
  );
});
