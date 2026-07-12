// Firebase Messaging Service Worker - handles background push notifications
// This file MUST have hardcoded config so Chrome Android can wake it up reliably
// when the app/browser is completely closed.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// Firebase config - hardcoded for reliable background wake-up on Android
// These are PUBLIC client-side keys (safe to expose, same as in the built JS bundle)
const firebaseConfig = {
  apiKey: 'AIzaSyA6_IkWfRHK2UsoNgZKNmMP2gRKh6fRHUU',
  authDomain: 'ozo-efcc9.firebaseapp.com',
  projectId: 'ozo-efcc9',
  storageBucket: 'ozo-efcc9.firebasestorage.app',
  messagingSenderId: '566208116360',
  appId: '1:566208116360:web:fda01120decbf9bab1d13d',
  measurementId: 'G-6E5XL7QP2E'
}

firebase.initializeApp(firebaseConfig)
const messaging = firebase.messaging()

// Background Message Handler - fires when app/browser is closed or in background
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload)

  const notificationTitle = payload.notification?.title || 'OZO Order Update'
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification from OZO.',
    icon: 'https://ozomart.store/apple-touch-icon.png',
    badge: 'https://ozomart.store/logo_bag_only.png',
    data: payload.data || {},
    tag: payload.data?.order_id || 'order-update',
    vibrate: [200, 100, 200],
    requireInteraction: true
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification click - opens the correct page
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const targetUrl = event.notification.data?.url || 
    (event.notification.data?.order_id ? `/order/${event.notification.data.order_id}` : '/')

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i]
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => focusedClient.navigate(targetUrl))
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

// Keep alive - ensure SW stays active for push events
self.addEventListener('push', (event) => {
  // This listener ensures the SW wakes up for push events even if
  // onBackgroundMessage doesn't fire (e.g. data-only messages)
  if (!event.data) return

  try {
    const payload = event.data.json()
    // If there's no notification field, show one from data
    if (!payload.notification && payload.data) {
      const title = payload.data.title || 'OZO Notification'
      const options = {
        body: payload.data.body || payload.data.message || 'You have a new update.',
        icon: 'https://ozomart.store/apple-touch-icon.png',
        badge: 'https://ozomart.store/logo_bag_only.png',
        data: payload.data,
        tag: payload.data.order_id || 'ozo-update',
        vibrate: [200, 100, 200],
        requireInteraction: true
      }
      event.waitUntil(self.registration.showNotification(title, options))
    }
  } catch (e) {
    console.warn('[firebase-messaging-sw.js] Push event parse error:', e)
  }
})
