// Ball603 Service Worker
const CACHE_NAME = 'ball603-v2';

// Static assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/styles.css',
  '/team.css',
  '/app.js',
  '/logo.png',
  '/includes/nav-loader.js',
  '/manifest.json',
  '/offline.html'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip external requests (Supabase, SmugMug, etc.)
  if (!url.origin.includes('ball603')) return;
  
  // Skip API/function calls - always fetch fresh
  if (url.pathname.startsWith('/.netlify/')) return;
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          // Fetch fresh version in background for next time
          event.waitUntil(
            fetch(request)
              .then((response) => {
                if (response.ok) {
                  caches.open(CACHE_NAME)
                    .then((cache) => cache.put(request, response));
                }
              })
              .catch(() => {}) // Ignore errors for background fetch
          );
          return cachedResponse;
        }
        
        // Not in cache - fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response.ok) return response;
            
            // Clone response (can only be consumed once)
            const responseToCache = response.clone();
            
            // Cache the fetched response for future
            caches.open(CACHE_NAME)
              .then((cache) => {
                // Only cache HTML pages and static assets
                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('text/html') || 
                    contentType.includes('text/css') ||
                    contentType.includes('javascript') ||
                    contentType.includes('image/')) {
                  cache.put(request, responseToCache);
                }
              });
            
            return response;
          })
          .catch(() => {
            // Network failed - show offline page for HTML requests
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/offline.html');
            }
            // Return empty response for other failed requests
            return new Response('', { status: 503, statusText: 'Offline' });
          });
      })
  );
});
