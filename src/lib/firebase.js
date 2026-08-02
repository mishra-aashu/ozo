import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { supabase } from './supabase'

// Firebase Configuration using Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

// Check if required configuration is present
const hasConfig = firebaseConfig.apiKey && firebaseConfig.projectId

// Initialize Firebase safely (prevents duplicate app registration)
const app = hasConfig
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : null

if (!hasConfig) {
  console.warn('[Firebase] Configuration is missing. Make sure VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID are set in .env and restart the Vite dev server.')
}

// Initialize Analytics conditionally (safely handles environments without window/IndexedDB)
let analytics = null
if (app && typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app)
      console.log('[Firebase] Analytics initialized successfully')
    } else {
      console.warn('[Firebase] Analytics is not supported in this environment')
    }
  }).catch((err) => {
    console.error('[Firebase] Failed to check analytics support:', err)
  })
}

// Initialize Messaging safely
export const messaging = app && typeof window !== 'undefined' ? getMessaging(app) : null

/**
 * Syncs the FCM token to the user_fcm_tokens table in the database if permission is granted.
 * @param {string} userId - The user ID
 * @param {boolean} forcePrompt - Whether to force prompt for permission if not already granted
 * @returns {Promise<string|null>} FCM Registration Token
 */
export const syncFcmTokenWithDatabase = async (userId, forcePrompt = false) => {
  if (!messaging || !userId) return null

  try {
    const currentPermission = Notification.permission
    if (!forcePrompt && currentPermission !== 'granted') {
      console.log('[FCM] Skipping token sync because permission is not granted.')
      return null
    }

    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      let registration = null
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      }

      const tokenOptions = {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      }
      if (registration) {
        tokenOptions.serviceWorkerRegistration = registration
      }
      const token = await getToken(messaging, tokenOptions)

      if (token) {
        const userAgent = navigator.userAgent || 'Web PWA Client'
        const activeToken = (typeof window !== 'undefined' && window.__ozo_access_token) || (typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('ozo-auth-token') || '{}')?.access_token || JSON.parse(localStorage.getItem('ozo-auth-token') || '{}')?.currentSession?.access_token) : null)

        if (!activeToken) {
          console.log('[FCM] Skipping token sync: active user session token not initialized yet.')
          return token
        }
        window.__ozo_access_token = activeToken

        try {
          await supabase
            .from('user_fcm_tokens')
            .delete()
            .eq('user_id', userId)
            .eq('device_info', userAgent)
            .neq('token', token)
        } catch (_) {}

        const { error } = await supabase
          .from('user_fcm_tokens')
          .upsert({
            user_id: userId,
            token: token,
            device_info: userAgent,
            updated_at: new Date().toISOString()
          }, { onConflict: 'token' })

        if (error) {
          console.warn('[FCM] Error saving token to DB:', error.message || error)
        } else {
          console.log('[FCM] Token synced to DB successfully.')
        }
        return token
      }
      return null
    }
    return null
  } catch (err) {
    if (err?.name === 'NotFoundError' || err?.message?.includes('IDBDatabase') || err?.message?.includes('store')) {
      console.warn('[FCM] Resetting corrupted IndexedDB object store...')
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        try { indexedDB.deleteDatabase('firebase-messaging-database') } catch (_) {}
      }
    } else {
      console.warn('[FCM] Could not retrieve FCM token:', err?.message || err)
    }
    return null
  }
}

/**
 * Requests browser notification permission and retrieves FCM registration token
 * @returns {Promise<string|null>} FCM Registration Token
 */
export const requestForToken = async () => {
  if (!messaging) return null

  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      let registration = null
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      }

      const tokenOptions = {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      }
      if (registration) {
        tokenOptions.serviceWorkerRegistration = registration
      }
      const currentToken = await getToken(messaging, tokenOptions)
      return currentToken || null
    }
    return null
  } catch (err) {
    if (err?.name === 'NotFoundError' || err?.message?.includes('IDBDatabase') || err?.message?.includes('store')) {
      console.warn('[FCM] Resetting corrupted IndexedDB object store...')
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        try { indexedDB.deleteDatabase('firebase-messaging-database') } catch (_) {}
      }
    }
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

export { app, analytics }
