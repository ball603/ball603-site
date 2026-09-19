/* Farmington Tigers: service-worker reset for farmingtontigersnh.com.
 *
 * WHY THIS EXISTS. farmingtontigersnh.com now only redirects to
 * ball603.com/farmingtontigersnh/. But browsers that visited the domain back
 * when it served pages itself (the old SportsEngine site, or the Tigers site
 * before it moved under ball603.com) still have a service worker installed on
 * that origin. A service worker answers navigations before the network is
 * asked, so those people keep landing on SportsEngine's "page not found" no
 * matter what DNS or Netlify say, and a normal cache clear does not remove it.
 *
 * A browser re-downloads a worker's script from the network every time it
 * visits, to check for an update. _redirects serves THIS file at the script
 * paths an old worker could be registered under (instead of the 301 every
 * other path gets, which the browser would treat as a failed update and keep
 * the old worker forever). It installs over the old one, deletes every cache
 * the old one kept, unregisters itself, and sends any open tab to the real
 * site. After that the domain behaves like a plain redirect again.
 *
 * Safe to leave in place permanently.
 */
const HOME = 'https://ball603.com/farmingtontigersnh/';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      for (const key of await caches.keys()) await caches.delete(key);
    } catch (e) { /* nothing cached */ }
    await self.registration.unregister();
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const tab of tabs) {
      try { await tab.navigate(HOME); } catch (e) { /* tab already gone */ }
    }
  })());
});

// No fetch handler: until it unregisters, every request simply goes to the
// network, which is the redirect to ball603.com.
