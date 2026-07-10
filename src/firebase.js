import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

// Replace placeholders with your Firebase project keys
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
}

// Initialize Firebase App
const app = initializeApp(firebaseConfig)

// Initialize Firebase Cloud Messaging (conditionally checked for SSR/Non-browser support)
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null

/**
 * Requests browser notification permission and retrieves FCM registration token
 * @returns {Promise<string|null>} FCM Registration Token
 */
export const requestForToken = async () => {
  if (!messaging) return null

  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, {
        vapidKey: 'YOUR_PUBLIC_VAPID_KEY' // Replace with your public VAPID key from Firebase Console -> Project Settings -> Cloud Messaging -> Web configuration
      })
      if (currentToken) {
        console.log('[FCM] Token generated successfully:', currentToken)
        return currentToken
      } else {
        console.warn('[FCM] No registration token available.')
        return null
      }
    } else {
      console.warn('[FCM] Notification permission denied.')
      return null
    }
  } catch (err) {
    console.error('[FCM] An error occurred while retrieving token:', err)
    return null
  }
}

/**
 * Attaches a listener for foreground FCM messages when the application is active
 * @param {Function} callback Function executed with the message payload
 * @returns {Function} Unsubscribe function to clean up listener
 */
export const onMessageListener = (callback) => {
  if (!messaging) return () => {}
  return onMessage(messaging, (payload) => {
    console.log('[FCM] Foreground message received:', payload)
    callback(payload)
  })
}
