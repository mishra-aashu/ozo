/**
 * Utility functions for OneSignal Web Push SDK (v16 User Model)
 * Safe to call even if the SDK fails to load due to ad-blockers.
 */
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

let initPromise = null;
let resolveInitPromise = null;

// The init promise is created lazily on first access rather than at module
// parse time. Accessing `window` at the top level throws in any non-browser
// context (SSR, unit tests, edge functions).
const ensureInitPromise = () => {
  if (typeof window === 'undefined') return;
  if (!window.oneSignalInitPromise) {
    window.oneSignalInitPromise = new Promise((resolve) => {
      resolveInitPromise = resolve;
    });
  }
};

// A helper to wait for the initialization promise with a timeout
const getOneSignal = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    if (window.__oneSignalInitialized && window.OneSignal) {
      resolve(window.OneSignal);
      return;
    }

    ensureInitPromise();

    if (!window.oneSignalInitPromise) {
      resolve(null);
      return;
    }

    // Set a safety timeout of 3 seconds (in case script loading fails or is blocked)
    const timeout = setTimeout(() => {
      console.warn('[OneSignal] Initialization timed out (possibly blocked by ad-blocker)');
      resolve(null);
    }, 3000);

    window.oneSignalInitPromise.then((OneSignal) => {
      clearTimeout(timeout);
      resolve(OneSignal);
    }).catch(() => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
};

// Initialize the OneSignal SDK dynamically
export const initOneSignal = async () => {
  if (typeof window === 'undefined') return null;
  if (initPromise) return initPromise;

  // Create the init promise before the async work starts so that
  // any concurrent calls to getOneSignal() have something to wait on.
  ensureInitPromise();

  initPromise = new Promise((resolve) => {
    try {
      const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
      if (!appId) {
        console.warn('[OneSignal] VITE_ONESIGNAL_APP_ID is not defined in environment variables.');
        resolve(null);
        if (resolveInitPromise) resolveInitPromise(null);
        return;
      }

      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal) {
        try {
          await OneSignal.init({
            appId: appId,
            allowLocalhostAsSecureOrigin: true,
            notifyButton: {
              enable: false,
            },
            serviceWorkerPath: 'OneSignalSDKWorker.js',
            serviceWorkerParam: { scope: '/' }
          });
          window.__oneSignalInitialized = true;
          console.log('[OneSignal] Initialized successfully with App ID:', appId);
          
          // Sync subscription with DB on load if session exists
          await syncSubscriptionWithDatabase(OneSignal);

          // Setup subscription change listener
          if (OneSignal.User && OneSignal.User.pushSubscription) {
            OneSignal.User.pushSubscription.addEventListener("change", async (event) => {
              console.log('[OneSignal] Subscription state changed:', event);
              await syncSubscriptionWithDatabase(OneSignal);
            });
          } else {
            console.warn('[OneSignal] OneSignal.User or pushSubscription not available; skipping subscription change listener.');
          }

          resolve(OneSignal);
          if (resolveInitPromise) resolveInitPromise(OneSignal);
        } catch (err) {
          console.error('[OneSignal] SDK push init execution failed:', err);
          resolve(null);
          if (resolveInitPromise) resolveInitPromise(null);
        }
      });
    } catch (err) {
      console.error('[OneSignal] Wrapper initialization error:', err);
      resolve(null);
      if (resolveInitPromise) resolveInitPromise(null);
    }
  });

  return initPromise;
};

// Sync the active OneSignal push subscription ID with the users table in database
export const syncSubscriptionWithDatabase = async (OneSignal) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      console.log('[OneSignal] No active session found; skipping database subscription sync.');
      return;
    }

    // Ensure the external user ID is logged into OneSignal SDK
    await OneSignal.login(userId);

    // Poll for the subscription ID (up to 10 retries, 500ms apart) in case the SDK is still registering it
    let subscriptionId = OneSignal.User && OneSignal.User.pushSubscription ? OneSignal.User.pushSubscription.id : null;
    let attempts = 0;
    while (!subscriptionId && attempts < 10) {
      console.log(`[OneSignal] Subscription ID not ready. Retrying in 500ms... (Attempt ${attempts + 1}/10)`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      subscriptionId = OneSignal.User && OneSignal.User.pushSubscription ? OneSignal.User.pushSubscription.id : null;
      attempts++;
    }

    console.log('[OneSignal] Active subscription ID resolved:', subscriptionId);

    if (subscriptionId) {
      // Check if we already have this subscription ID saved to avoid redundant DB writes
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('onesignal_subscription_id')
        .eq('id', userId)
        .maybeSingle();

      if (!fetchError && userData?.onesignal_subscription_id === subscriptionId) {
        console.log('[OneSignal] Subscription ID is already in sync with database.');
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ onesignal_subscription_id: subscriptionId })
        .eq('id', userId);

      if (error) {
        console.error('[OneSignal] Failed to update subscription ID in database:', error);
      } else {
        console.log('[OneSignal] Successfully updated subscription ID in database:', subscriptionId);
      }
    } else {
      console.warn('[OneSignal] Subscription ID is still null after polling. Check browser notification permissions.');
    }
  } catch (err) {
    console.error('[OneSignal] Error syncing subscription with database:', err);
  }
};

// Associate the logged-in user with OneSignal
export const oneSignalLogin = async (userId) => {
  try {
    const OneSignal = await getOneSignal();
    if (OneSignal && window.__oneSignalInitialized) {
      console.log('[OneSignal] Linking external user ID:', userId)
      await OneSignal.login(userId)
      // Sync subscription with database after login
      await syncSubscriptionWithDatabase(OneSignal)
    } else {
      console.log('[OneSignal] SDK not initialized or loaded; skipping login.')
    }
  } catch (err) {
    console.warn('[OneSignal] Login sync failed:', err)
  }
}

// Clear the user association on logout
export const oneSignalLogout = async () => {
  try {
    const OneSignal = await getOneSignal();
    if (OneSignal && window.__oneSignalInitialized) {
      console.log('[OneSignal] Clearing user association (logout)')
      await OneSignal.logout()
    } else {
      console.log('[OneSignal] SDK not initialized or loaded; skipping logout.')
    }
  } catch (err) {
    console.warn('[OneSignal] Logout sync failed:', err)
  }
}

// Programmatically trigger the native browser permission prompt
export const promptOneSignalPush = async () => {
  if (!('Notification' in window)) {
    console.warn('[OneSignal] Notifications not supported in this browser.')
    toast.error('Notifications are not supported in this browser.', {
      id: 'onesignal-unsupported',
      style: { borderRadius: '16px', background: '#333', color: '#fff' }
    })
    return 'unsupported'
  }

  if (Notification.permission === 'denied') {
    console.warn('[OneSignal] Notification permission is blocked/denied by the user.')
    toast.error('Notification permission is blocked. Please enable it in browser settings (click the lock icon near the URL) to receive updates.', {
      id: 'onesignal-permission-denied',
      duration: 6000,
      style: { borderRadius: '16px', background: '#333', color: '#fff' }
    })
    return 'denied'
  }

  const initialPermission = Notification.permission;

  try {
    // CRITICAL: Request native permission immediately before any async boundaries
    // to ensure the browser preserves the user gesture call stack.
    console.log('[OneSignal] Requesting native browser notification permission first')
    const finalPermission = await Notification.requestPermission()

    if (finalPermission === 'granted') {
      const OneSignal = await getOneSignal();
      if (OneSignal && window.__oneSignalInitialized) {
        await syncSubscriptionWithDatabase(OneSignal);
      }
      if (initialPermission !== 'granted') {
        toast.success('Notifications enabled successfully! 🔔', {
          id: 'onesignal-permission-granted',
          style: { borderRadius: '16px', background: '#333', color: '#fff' }
        })
      }
    } else if (finalPermission === 'denied') {
      toast.error('Notification permission denied. Please allow notifications in site settings to receive updates.', {
        id: 'onesignal-permission-denied-new',
        duration: 5000,
        style: { borderRadius: '16px', background: '#333', color: '#fff' }
      })
    }

    return finalPermission
  } catch (err) {
    console.warn('[OneSignal] Failed to trigger native prompt:', err)
    return Notification.permission
  }
}

// Check if user is currently opted-in
export const checkPushSubscriptionStatus = async () => {
  try {
    const OneSignal = await getOneSignal();
    if (OneSignal && window.__oneSignalInitialized) {
      const isOptedIn = OneSignal.User?.pushSubscription?.optedIn || false
      return isOptedIn
    }
    return false
  } catch (err) {
    return false
  }
}

// Add a tag to the user profile
export const oneSignalAddTag = async (key, value) => {
  try {
    const OneSignal = await getOneSignal();
    if (OneSignal && window.__oneSignalInitialized) {
      console.log(`[OneSignal] Adding tag: ${key} = ${value}`)
      await OneSignal.User.addTag(key, value)
      return true
    }
    return false
  } catch (err) {
    console.warn('[OneSignal] Add tag failed:', err)
    return false
  }
}

// Remove a tag from the user profile
export const oneSignalRemoveTag = async (key) => {
  try {
    const OneSignal = await getOneSignal();
    if (OneSignal && window.__oneSignalInitialized) {
      console.log(`[OneSignal] Removing tag: ${key}`)
      await OneSignal.User.removeTag(key)
      return true
    }
    return false
  } catch (err) {
    console.warn('[OneSignal] Remove tag failed:', err)
    return false
  }
}
