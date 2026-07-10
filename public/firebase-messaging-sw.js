// Give the service worker access to Firebase Messaging.
// Note that we must use compat libraries in service workers when loading via CDN scripts.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// Initialize the Firebase app in the service worker.
// Replace placeholders with your Firebase project keys.
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
})

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging()

// Background Message Handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload)

  // Customize background notification title and options
  const notificationTitle = payload.notification?.title || 'OZO Order Update'
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification from OZO.',
    icon: '/apple-touch-icon.png', // Replace with your notification icon path
    badge: '/logo_bag_only.png',  // Replace with your badge icon path
    data: payload.data || {},
    tag: payload.data?.order_id || 'order-update', // Collapses notifications of the same order
    vibrate: [200, 100, 200]
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Optional: Handle Notification click events
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  // Retrieve custom payload data
  const orderId = event.notification.data?.order_id
  const targetUrl = orderId ? `/order/${orderId}` : '/'

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
