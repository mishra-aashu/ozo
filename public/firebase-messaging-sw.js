// ===================================================================
// OZO Mart Unified Offline-First Service Worker (PWA + Firebase Push)
// Handles:
// 1. Instant 0ms App Shell & Static Asset Caching (JS, CSS, Fonts, Icons)
// 2. High-Performance WebP Product Image Cache (wsrv.nl & local proxies)
// 3. Offline Navigation Fallback for Client-Side Routing
// 4. Background Firebase Push Notifications (Compat SDK)
// ===================================================================

const STATIC_CACHE = 'ozo-static-v2';
const IMAGE_CACHE = 'ozo-images-v2';
const API_CACHE = 'ozo-api-cache-v1';
const MAX_IMAGE_ENTRIES = 150;

// Pre-cached App Shell Assets
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png'
];

// Helper: Trim cache to max entries
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const deleteCount = keys.length - maxItems;
      for (let i = 0; i < deleteCount; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch (err) {
    console.warn('[SW] Cache trim error:', err);
  }
}

// ── 1. INSTALL EVENT ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching core App Shell assets');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache partial fail (non-fatal):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ── 2. ACTIVATE EVENT (Cleanup stale caches) ──────────────────────
self.addEventListener('activate', (event) => {
  const allowedCaches = [STATIC_CACHE, IMAGE_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (!allowedCaches.includes(name)) {
            console.log('[SW] Purging old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ── 3. FETCH EVENT (Offline-First Strategies) ──────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, PUT, DELETE should pass through)
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extensions and browser internal schemes
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Strategy A: Navigation Requests (HTML pages)
  // Network-First with instant fallback to cached /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // If network failed or offline, serve cached index.html
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
          return new Response('You are offline. Please check your internet connection.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
    return;
  }

  // Strategy B: Versioned Vite Static Assets (/assets/.*)
  // Immutable filenames with hashes → Cache-First for instant 0ms load
  if (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.woff2') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.png') || url.pathname.endsWith('.ico')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        }).catch((err) => {
          console.warn('[SW] Static asset fetch failed:', url.pathname);
          return cachedResponse || Response.error();
        });
      })
    );
    return;
  }

  // Strategy C: Product Images (wsrv.nl CDN or /product-images/)
  // Cache-First with Stale-While-Revalidate to save data on 2G/3G
  if (url.hostname.includes('wsrv.nl') || url.pathname.startsWith('/product-images/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(IMAGE_CACHE).then((cache) => {
                cache.put(request, clone);
                trimCache(IMAGE_CACHE, MAX_IMAGE_ENTRIES);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Strategy D: Google Fonts (fonts.googleapis.com, fonts.gstatic.com)
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(() => cachedResponse);
      })
    );
    return;
  }
});

// ── 4. FIREBASE BACKGROUND MESSAGING COMPAT ───────────────────────
// Keep Firebase Push compatibility for background notifications
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

  const firebaseConfig = {
    apiKey: 'AIzaSyA6_IkWfRHK2UsoNgZKNmMP2gRKh6fRHUU',
    authDomain: 'ozo-efcc9.firebaseapp.com',
    projectId: 'ozo-efcc9',
    storageBucket: 'ozo-efcc9.firebasestorage.app',
    messagingSenderId: '566208116360',
    appId: '1:566208116360:web:fda01120decbf9bab1d13d',
    measurementId: 'G-6E5XL7QP2E'
  };

  if (typeof firebase !== 'undefined' && firebase.initializeApp) {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] Firebase background push received:', payload);
      const notificationTitle = payload.notification?.title || 'OZO Order Update';
      const notificationOptions = {
        body: payload.notification?.body || 'You have a new update from OZO.',
        icon: 'https://ozomart.store/apple-touch-icon.png',
        badge: 'https://ozomart.store/logo_bag_only.png',
        data: payload.data || {},
        tag: payload.data?.order_id || 'order-update',
        vibrate: [200, 100, 200],
        requireInteraction: true
      };
      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
} catch (fbErr) {
  console.warn('[SW] Firebase compat init warning:', fbErr);
}

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || 
    (event.notification.data?.order_id ? `/order/${event.notification.data.order_id}` : '/');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => focusedClient.navigate(targetUrl));
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
