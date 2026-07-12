// Give the service worker access to Firebase Messaging.
// Note that we must use compat libraries in service workers when loading via CDN scripts.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// Extract config from query parameters
const urlParams = new URLSearchParams(self.location.search)
const firebaseConfig = {
  apiKey: urlParams.get('apiKey'),
  authDomain: urlParams.get('authDomain'),
  projectId: urlParams.get('projectId'),
  storageBucket: urlParams.get('storageBucket'),
  messagingSenderId: urlParams.get('messagingSenderId'),
  appId: urlParams.get('appId'),
  measurementId: urlParams.get('measurementId')
}

let messaging = null

// Only initialize if we received valid parameters
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig)
  messaging = firebase.messaging()
} else {
  console.warn('[firebase-messaging-sw.js] Missing configuration parameters, skipping initialization')
}

// Background Message Handler
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message: ', payload)

    // Customize background notification title and options
    const notificationTitle = payload.notification?.title || 'OZO Order Update'
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new notification from OZO.',
      icon: 'https://ozomart.store/apple-touch-icon.png', // Replace with your notification icon path
      badge: 'https://ozomart.store/logo_bag_only.png',  // Replace with your badge icon path
      data: payload.data || {},
      tag: payload.data?.order_id || 'order-update', // Collapses notifications of the same order
      vibrate: [200, 100, 200]
    }

    self.registration.showNotification(notificationTitle, notificationOptions)
  })
}

// Optional: Handle Notification click events
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  // Retrieve custom payload data
  const orderId = event.notification.data?.order_id
  const targetUrl = event.notification.data?.url || (orderId ? `/order/${orderId}` : '/')

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, navigate it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i]
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => focusedClient.navigate(targetUrl))
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})
