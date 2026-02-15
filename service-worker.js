// Ball603 Service Worker
const CACHE_NAME = 'ball603-v14';

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

// Fetch event - network first for HTML/JS, cache first for images/CSS
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip external requests (Supabase, SmugMug, etc.)
  if (!url.origin.includes('ball603')) return;
  
  // Skip API/function calls - always fetch fresh
  if (url.pathname.startsWith('/.netlify/')) return;
  
  // Determine if this is HTML or JS (network-first) vs images/CSS (cache-first)
  const isHtmlOrJs = request.headers.get('accept')?.includes('text/html') ||
                     url.pathname.endsWith('.js') ||
                     url.pathname.endsWith('.html') ||
                     url.pathname === '/' ||
                     !url.pathname.includes('.');
  
  if (isHtmlOrJs) {
    // Network-first strategy for HTML/JS
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return response;
        })
        .catch(() => {
          // Network failed - try cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // Show offline page for HTML requests
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/offline.html');
            }
            return new Response('', { status: 503, statusText: 'Offline' });
          });
        })
    );
  } else {
    // Cache-first strategy for images, CSS, etc.
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Update cache in background
          event.waitUntil(
            fetch(request).then((response) => {
              if (response.ok) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
              }
            }).catch(() => {})
          );
          return cachedResponse;
        }
        
        // Not in cache - fetch from network
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return response;
        }).catch(() => new Response('', { status: 503, statusText: 'Offline' }));
      })
    );
  }
});
