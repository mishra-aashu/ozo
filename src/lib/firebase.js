import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'

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

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Analytics conditionally (safely handles environments without window/IndexedDB)
let analytics = null
if (typeof window !== 'undefined') {
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

export { app, analytics }
