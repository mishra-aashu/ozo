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

// Safely resolve Firebase Messaging IndexedDB VersionError by resetting the database if version > 1
if (typeof window !== 'undefined' && 'indexedDB' in window) {
  try {
    const dbName = 'firebase-messaging-database';
    const req = indexedDB.open(dbName);
    req.onsuccess = (e) => {
      const db = e.target.result;
      const version = db.version;
      db.close();
      if (version > 1) {
        console.warn(`[Firebase] Detected legacy messaging DB version ${version} > 1. Resetting database...`);
        indexedDB.deleteDatabase(dbName);
      }
    };
    req.onerror = (e) => {
      // If version mismatch error is encountered, delete the DB
      if (e.target.error && e.target.error.name === 'VersionError') {
        console.warn('[Firebase] Messaging DB VersionError detected. Resetting database...');
        indexedDB.deleteDatabase(dbName);
      }
    };
  } catch (err) {
    console.error('[Firebase] Error checking legacy DB:', err);
  }
}

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
      // Register service worker manually with query parameters to pass config securely without hardcoding
      let registration = null
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const swUrl = `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(firebaseConfig.apiKey || '')}` +
          `&authDomain=${encodeURIComponent(firebaseConfig.authDomain || '')}` +
          `&projectId=${encodeURIComponent(firebaseConfig.projectId || '')}` +
          `&storageBucket=${encodeURIComponent(firebaseConfig.storageBucket || '')}` +
          `&messagingSenderId=${encodeURIComponent(firebaseConfig.messagingSenderId || '')}` +
          `&appId=${encodeURIComponent(firebaseConfig.appId || '')}` +
          `&measurementId=${encodeURIComponent(firebaseConfig.measurementId || '')}`
        
        await navigator.serviceWorker.register(swUrl)
        registration = await navigator.serviceWorker.ready
        console.log('[FCM] Service Worker registered and ready successfully')
      }

      console.log('[FCM] Attempting to retrieve token with VAPID Key:', import.meta.env.VITE_FIREBASE_VAPID_KEY)
      const tokenOptions = {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      }
      if (registration) {
        tokenOptions.serviceWorkerRegistration = registration
      }
      const token = await getToken(messaging, tokenOptions)

      if (token) {
        console.log('[FCM] Token generated successfully:', token)
        
        // Delete any old tokens for this user on the same device (userAgent) to avoid duplicates
        const userAgent = navigator.userAgent || 'Web PWA Client'
        try {
          const { error: deleteError } = await supabase
            .from('user_fcm_tokens')
            .delete()
            .eq('user_id', userId)
            .eq('device_info', userAgent)
            .neq('token', token)
            
          if (deleteError) {
            console.warn('[FCM] Error clearing old device tokens:', deleteError)
          } else {
            console.log('[FCM] Cleared stale tokens for this device.')
          }
        } catch (delErr) {
          console.error('[FCM] Failed to clear old tokens:', delErr)
        }

        // Sync token to user_fcm_tokens table
        const { error } = await supabase
          .from('user_fcm_tokens')
          .upsert({
            user_id: userId,
            token: token,
            device_info: userAgent,
            updated_at: new Date().toISOString()
          }, { onConflict: 'token' })

        if (error) {
          console.error('[FCM] Error saving token to DB:', error)
        } else {
          console.log('[FCM] Token synced to DB successfully.')
        }
        return token
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
 * Requests browser notification permission and retrieves FCM registration token
 * @returns {Promise<string|null>} FCM Registration Token
 */
export const requestForToken = async () => {
  if (!messaging) return null

  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      // Register service worker manually with query parameters to pass config securely without hardcoding
      let registration = null
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const swUrl = `/firebase-messaging-sw.js?apiKey=${encodeURIComponent(firebaseConfig.apiKey || '')}` +
          `&authDomain=${encodeURIComponent(firebaseConfig.authDomain || '')}` +
          `&projectId=${encodeURIComponent(firebaseConfig.projectId || '')}` +
          `&storageBucket=${encodeURIComponent(firebaseConfig.storageBucket || '')}` +
          `&messagingSenderId=${encodeURIComponent(firebaseConfig.messagingSenderId || '')}` +
          `&appId=${encodeURIComponent(firebaseConfig.appId || '')}` +
          `&measurementId=${encodeURIComponent(firebaseConfig.measurementId || '')}`
        
        await navigator.serviceWorker.register(swUrl)
        registration = await navigator.serviceWorker.ready
        console.log('[FCM] Service Worker registered and ready successfully')
      }

      console.log('[FCM] Attempting to retrieve token with VAPID Key:', import.meta.env.VITE_FIREBASE_VAPID_KEY)
      const tokenOptions = {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      }
      if (registration) {
        tokenOptions.serviceWorkerRegistration = registration
      }
      const currentToken = await getToken(messaging, tokenOptions)
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

export { app, analytics }
