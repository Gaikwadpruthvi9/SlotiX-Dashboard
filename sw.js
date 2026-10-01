const CACHE_NAME = 'slotix-cache-v5';

self.addEventListener('install', (event) => {
  // Activate immediately without waiting
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Purge all old caches completely so updates show immediately
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

// Network-First strategy: always fetch fresh version from server
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Real-time APIs / Firebase are strictly network only
  if (url.includes('firebaseio.com') || url.includes('firebasedatabase.app') || url.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Return fresh response immediately
        return networkResponse;
      })
      .catch(() => {
        // Only fallback to cache if completely offline
        return caches.match(event.request);
      })
  );
});
