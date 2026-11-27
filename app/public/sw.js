/* Service Worker — CampusPulse
 * Cache-first for app shell, stale-while-revalidate for /data/*
 * Versioned cache names, old caches deleted on activate
 */

const APP_VERSION = 'v1'; // Increment when app shell changes
const APP_SHELL_CACHE = `campuspulse-shell-${APP_VERSION}`;
const DATA_CACHE = 'campuspulse-data-v1';

// Files to cache immediately (app shell)
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches, claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== APP_SHELL_CACHE && name !== DATA_CACHE)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first for app shell, stale-while-revalidate for /data/*
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API/data requests: stale-while-revalidate
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Navigation requests: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Static assets: cache-first
  event.respondWith(cacheFirst(request));
});

/** Cache-first strategy */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(APP_SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return offline fallback for HTML
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/index.html');
    }
    throw new Error('Offline');
  }
}

/** Network-first with offline fallback */
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(APP_SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Return cached index.html for SPA fallback
    return caches.match('/index.html');
  }
}

/** Stale-while-revalidate for data */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request);

  // Fetch fresh in background
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached); // Return cached if network fails

  // Return cached immediately if available, otherwise wait for network
  return cached || fetchPromise;
}

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'getVersion') {
    event.ports[0].postMessage({ version: APP_VERSION });
  }
});
