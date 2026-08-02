import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, authHelpers, supabaseAdmin } from '../lib/supabase'
import toast from 'react-hot-toast'
import { useLocationStore } from './locationStore'
import { oneSignalLogin, oneSignalLogout } from '../utils/onesignal'

// Module-level subscription handle — kept outside the store so it survives
// store re-creation and can be cleaned up before re-registering.
let authSubscription = null

// Module-level flag to prevent concurrent SIGNED_IN profile fetches from
// racing against each other (e.g. rapid token refreshes triggering the event
// multiple times before the first fetch resolves).
let profileFetchInProgress = false
let activeProfilePollInterval = null

// Helper to ensure user profile exists in public.users table (important for OAuth logins)
const ensureProfileExists = async (user, accessToken = null) => {
  if (!user?.id) return null

  if (!accessToken && typeof window !== 'undefined' && window.__ozo_access_token) {
    accessToken = window.__ozo_access_token
  }
  if (accessToken && typeof window !== 'undefined') {
    window.__ozo_access_token = accessToken
  }

  try {
    // 1. Fetch via RPC / authHelpers
    try {
      const { data: profile } = await authHelpers.getUserProfile(user.id, accessToken)
      if (profile && profile.id) return { ...profile, isFallback: false }
    } catch (_) {}

    // 2. Direct table fetch with authenticated supabase client (passes Bearer token to satisfy auth.uid() RLS policy)
    try {
      const { data: directProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      if (directProfile) return { ...directProfile, isFallback: false }
    } catch (_) {}

    // 3. Truly missing in DB — insert new row
    const metadata = user.user_metadata || {}
    const fullName = metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Ozo User'
    const avatarUrl = metadata.avatar_url || metadata.picture || ''
    const phone = metadata.phone || user.phone || ''

    const profileData = {
      id: user.id,
      email: user.email,
      full_name: fullName,
      avatar_url: avatarUrl,
      phone: phone || null,
      role: 'customer',
    }

    try {
      const { data: newProfile, error: insertError } = await supabase
        .from('users')
        .insert([profileData])
        .select()
        .maybeSingle()

      if (newProfile) return { ...newProfile, isFallback: false }

      // If insert collision (row already exists) or error, re-select via authenticated client
      if (insertError) {
        const { data: existingProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (existingProfile) return { ...existingProfile, isFallback: false }
      }
    } catch (_) {}

    return null
  } catch (err) {
    console.error('[OZO Auth] Error in ensureProfileExists:', err)
    return null
  }
}

// Helper to enrich profile roles and check if admin
const enrichProfileRoles = (profile) => {
  if (!profile) return null

  // Fallback profiles are display-only placeholders. They MUST NOT grant elevated roles!
  if (profile.isFallback) {
    return {
      ...profile,
      role: 'customer',
      roles: [],
      isSuperAdmin: false,
      isCityManager: false,
      isMartOwner: false,
      isRider: false,
      isCustomer: true,
      isFallback: true,
    }
  }

  const rawRoles = profile.user_roles || profile.roles
  const rolesList = Array.isArray(rawRoles)
    ? rawRoles
    : (rawRoles && typeof rawRoles === 'object' ? [rawRoles] : [])

  const hasSuperAdmin = rolesList.some(r => r?.role === 'super_admin') || profile.role === 'admin' || profile.role === 'super_admin'
  const hasCityManager = rolesList.some(r => r?.role === 'city_manager') || profile.role === 'city_manager'
  const hasMartOwner = rolesList.some(r => r?.role === 'mart_owner') || profile.role === 'mart_owner'
  const hasRider = rolesList.some(r => r?.role === 'rider') || profile.role === 'rider'
  const hasCustomer = rolesList.some(r => r?.role === 'customer') || profile.role === 'customer'

  // Set top-level role for backward compatibility
  let primaryRole = profile.role
  if (hasSuperAdmin) primaryRole = 'super_admin'
  else if (hasCityManager) primaryRole = 'city_manager'
  else if (hasMartOwner) primaryRole = 'mart_owner'
  else if (hasRider) primaryRole = 'rider'
  else if (hasCustomer) primaryRole = 'customer'

  return {
    ...profile,
    role: primaryRole,
    roles: rolesList,
    isSuperAdmin: !!hasSuperAdmin,
    isCityManager: !!hasCityManager,
    isMartOwner: !!hasMartOwner,
    isRider: !!hasRider,
    isCustomer: !!hasCustomer,
    isFallback: false,
  }
}

const checkAdmin = (profile) => {
  if (!profile || profile.isFallback) return false
  try {
    const enriched = enrichProfileRoles(profile)
    return !!(enriched?.isSuperAdmin || enriched?.isCityManager || profile.role === 'admin' || profile.role === 'super_admin')
  } catch (e) {
    return profile.role === 'admin' || profile.role === 'super_admin'
  }
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      profile: null,
      isLoading: false,
      isInitialized: false,
      isAuthenticated: false,
      isAdmin: false,

      // Initialize auth
      initializeAuth: async () => {
        try {
          set({ isLoading: true })

          // Tear down any existing listener before registering a new one.
          // Without this, calling initializeAuth more than once (e.g. React
          // StrictMode double-invoke, HMR) accumulates duplicate listeners
          // that each fire on every auth event.
          if (authSubscription) {
            authSubscription.unsubscribe()
            authSubscription = null
          }

          // ─── IMPORTANT: Register the auth state change listener BEFORE
          // calling getSession(). On the OAuth callback page, the Supabase SDK
          // exchanges the PKCE code and fires SIGNED_IN during or right after
          // getSession(). If we register the listener after getSession() returns
          // we miss that event and the store stays unauthenticated, causing
          // AuthCallback to fall back to /auth.
          //
          // We attach the listener now (using a temporary ref) and move the
          // full handler definition below so it has access to the session
          // variable from getSession(). The handler ignores events that arrive
          // before the initial session fetch completes via the earlyEvents queue.
          let initComplete = false
          let earlySignedInCapture = null // { event, session } captured before init completes

          const { data: { subscription: earlySubscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
              // Capture a SIGNED_IN that fires before initializeAuth finishes
              if (!initComplete && event === 'SIGNED_IN' && session?.user) {
                earlySignedInCapture = { event, session }
              }
            }
          )

          // Get current session with a short timeout so UI is never blocked
          let session = null
          try {
            const res = await Promise.race([
              supabase.auth.getSession(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Session fetch timeout')), 1500))
            ])
            session = res?.data?.session || null
          } catch (sessErr) {
            console.warn('[OZO Auth] Session pre-fetch timeout/error:', sessErr)
          }

          if (session?.user) {
            if (typeof window !== 'undefined' && session.access_token) {
              window.__ozo_access_token = session.access_token
            }
            // Sync session to supabaseAdmin client so admin requests are authenticated
            try {
              supabaseAdmin.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              }).catch(() => {})
            } catch (_) {}

            // Sync user to OneSignal push notification service
            oneSignalLogin(session.user.id)

            // Prepare cached or metadata profile
            const localProfile = get().profile
            const fallbackProfile = {
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Ozo User',
              phone: session.user.user_metadata?.phone || session.user.phone || '',
              role: 'customer',
              user_roles: [],
              isFallback: true,
            }

            const initialProfile = (localProfile && localProfile.id === session.user.id)
              ? enrichProfileRoles(localProfile)
              : enrichProfileRoles(fallbackProfile)

            // SET INITIALIZED IMMEDIATELY — do not wait for DB profile query
            set({
              user: session.user,
              profile: initialProfile,
              isAuthenticated: true,
              isAdmin: checkAdmin(initialProfile),
              isLoading: false,
              isInitialized: true,
            })

            // Hydrate / verify real DB profile in the background
            setTimeout(async () => {
              try {
                const dbProfile = await ensureProfileExists(session.user, session.access_token)
                if (dbProfile) {
                  const finalProfile = enrichProfileRoles({
                    ...(get().profile || {}),
                    ...dbProfile,
                    role: dbProfile.role || get().profile?.role || 'customer',
                    isFallback: false,
                  })
                  set({
                    profile: finalProfile,
                    isAdmin: checkAdmin(finalProfile),
                  })
                }
              } catch (bgErr) {
                console.warn('[OZO Auth] Background profile hydration warning:', bgErr)
              }
            }, 0)
          } else {
            set({
              user: null,
              profile: null,
              isAuthenticated: false,
              isAdmin: false,
              isLoading: false,
              isInitialized: true,
            })
          }

          // Mark init as complete and tear down the early capture listener.
          initComplete = true
          earlySubscription.unsubscribe()

          // Register the permanent auth state change listener and store the
          // subscription handle so it can be torn down if initializeAuth is called again.
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
              // Sync session to supabaseAdmin and window memory cache
              if (session) {
                if (typeof window !== 'undefined' && session.access_token) {
                  window.__ozo_access_token = session.access_token
                }
                supabaseAdmin.auth.setSession({
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                }).catch((err) => {
                  console.warn('Failed to sync session to supabaseAdmin on auth change:', err)
                })
              } else {
                if (typeof window !== 'undefined') {
                  window.__ozo_access_token = null
                }
                supabaseAdmin.auth.setSession({
                  access_token: '',
                  refresh_token: '',
                }).catch((err) => {
                  console.warn('Failed to clear session on supabaseAdmin:', err)
                })
              }

              if (event === 'SIGNED_IN' && session?.user) {
                // Sync user to OneSignal push notification service
                oneSignalLogin(session.user.id)

                // ★ Set user + isAuthenticated IMMEDIATELY so route guards
                // (ProtectedRoute, CompleteProfileRoute, PublicOnlyRoute) see
                // the authenticated user right away.  Previously this was
                // deferred until after ensureProfileExists() resolved, which
                // left a multi-second window where user was null and the
                // guards bounced users back to /auth.
                const localProfile = get().profile
                const enrichedLocal = enrichProfileRoles(localProfile)
                set({
                  user: session.user,
                  isAuthenticated: true,
                  // Keep the cached profile (if any) so the UI isn't blank
                  ...(localProfile && localProfile.id === session.user.id
                    ? { profile: enrichedLocal, isAdmin: checkAdmin(enrichedLocal) }
                    : {}),
                })

                // Guard against concurrent profile fetches caused by rapid
                // SIGNED_IN events (e.g. token refresh firing while the
                // previous fetch is still in-flight).
                if (profileFetchInProgress) return
                profileFetchInProgress = true

                // Fetch fresh profile in the background
                setTimeout(async () => {
                  try {
                    let profile = null
                    try {
                      profile = await ensureProfileExists(session.user, session.access_token)
                    } catch (err) {
                      console.warn('Failed to ensure profile on sign in:', err)
                    }

                    // Merge: start with local profile, overwrite with fresh DB profile
                    // details only if the user ID matches.
                    // DB role always wins to prevent stale-cache role mismatch issues.
                    const currentLocalProfile = get().profile
                    const rawProfile = profile
                      ? (currentLocalProfile && currentLocalProfile.id === profile.id
                          ? {
                              ...currentLocalProfile,
                              ...profile,
                              role: profile.role, // DB role always wins
                              avatar_url: profile.avatar_url || currentLocalProfile.avatar_url || '',
                              isFallback: false,
                            }
                          : { ...profile, isFallback: false })
                      : currentLocalProfile
                    const finalProfile = enrichProfileRoles(rawProfile)

                    set({
                      profile: finalProfile,
                      isAdmin: checkAdmin(finalProfile),
                    })

                    // Sync guest addresses immediately upon SIGNED_IN
                    try {
                      await useLocationStore.getState().fetchUserAddresses()
                    } catch (addrErr) {
                      console.error('Failed to sync guest addresses on sign in:', addrErr)
                    }
                  } finally {
                    profileFetchInProgress = false
                  }
                }, 0)
              } else if (event === 'SIGNED_OUT') {
                // Reset the in-progress guard so the next sign-in works correctly
                profileFetchInProgress = false

                // Explicit cleanup of background intervals on signout to prevent zombie loops
                if (typeof window !== 'undefined') {
                  if (window._ozoReconnectInterval) {
                    clearInterval(window._ozoReconnectInterval)
                    window._ozoReconnectInterval = null
                  }
                }
                if (activeProfilePollInterval) {
                  clearInterval(activeProfilePollInterval)
                  activeProfilePollInterval = null
                }

                // Clear user mapping in OneSignal
                oneSignalLogout()

                set({
                  user: null,
                  profile: null,
                  isAuthenticated: false,
                  isAdmin: false,
                })
                try {
                  useLocationStore.getState().clearLocation()
                } catch (err) {
                  console.warn('Failed to clear location on SIGNED_OUT:', err)
                }
                localStorage.removeItem('ozo-auth-token')
                localStorage.removeItem('ozo_refresh_lock_ts')
              } else if (event === 'TOKEN_REFRESHED' && session?.user) {
                // Proactively push fresh session to supabaseAdmin
                try {
                  supabaseAdmin.auth.setSession({
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                  })
                } catch (e) {
                  // Ignore sync warning
                }

                set({
                  user: session.user,
                  isAuthenticated: true,
                })

                // Refresh profile in background so role changes are picked up
                // without requiring a hard page reload.
                setTimeout(async () => {
                  try {
                    const userId = session.user.id
                    const { data } = await authHelpers.getUserProfile(userId)
                    if (data) {
                      const currentProfile = get().profile
                      const merged = enrichProfileRoles(
                        currentProfile && currentProfile.id === userId
                          ? { ...currentProfile, ...data, role: data.role, avatar_url: data.avatar_url || currentProfile.avatar_url || '', isFallback: false }
                          : { ...data, isFallback: false }
                      )
                      set({ profile: merged, isAdmin: checkAdmin(merged) })
                    }
                  } catch (err) {
                    console.warn('[authStore] Background profile refresh on TOKEN_REFRESHED failed:', err)
                  }
                }, 0)
              }
            }
          )

          authSubscription = subscription

          // If a SIGNED_IN event was captured before the permanent listener was
          // registered (race condition on OAuth callback page), replay it now so
          // the store doesn't stay unauthenticated after the PKCE code exchange.
          if (earlySignedInCapture) {
            const { session: earlySess } = earlySignedInCapture
            // Only replay if the store didn't already pick up this session
            if (earlySess?.user && !get().isAuthenticated) {
              // Use get().profile instead of the block-scoped localProfile
              // variable which is not accessible here.
              const cachedProfile = get().profile
              const enrichedCached = enrichProfileRoles(cachedProfile)
              set({
                user: earlySess.user,
                isAuthenticated: true,
                ...(cachedProfile && cachedProfile.id === earlySess.user.id
                  ? { profile: enrichedCached, isAdmin: checkAdmin(enrichedCached) }
                  : {}),
              })
              oneSignalLogin(earlySess.user.id)
              // Kick off profile fetch in background
              setTimeout(async () => {
                try {
                  const profile = await ensureProfileExists(earlySess.user, earlySess.access_token)
                  const currentLocalProfile = get().profile
                  const finalProfile = enrichProfileRoles(profile
                    ? (currentLocalProfile && currentLocalProfile.id === profile.id
                        ? { ...currentLocalProfile, ...profile, role: profile.role, avatar_url: profile.avatar_url || currentLocalProfile.avatar_url || '', isFallback: false }
                        : { ...profile, isFallback: false })
                    : currentLocalProfile)
                  set({ profile: finalProfile, isAdmin: checkAdmin(finalProfile) })
                } catch (err) {
                  console.warn('[authStore] Early SIGNED_IN profile fetch failed:', err)
                } finally {
                  profileFetchInProgress = false
                }
              }, 0)
            }
            earlySignedInCapture = null
          }

          // BUG-19 FIX: Removed duplicate visibilitychange listener from here.
          // The module-level listener at the bottom of this file (with 2-min throttle)
          // is the correct one and already handles tab-focus session revalidation.
          // Keeping two listeners caused double session checks on every tab refocus.
        } catch (error) {
          console.error('Auth initialization error:', error)
          // Fallback: use whatever we have in the persisted store to keep the app functional
          try {
            const cachedUser = get().user
            const cachedProfile = get().profile
            const enrichedCached = cachedProfile ? enrichProfileRoles(cachedProfile) : null
            set({
              user: cachedUser || null,
              profile: enrichedCached || null,
              isAuthenticated: !!cachedUser,
              isAdmin: checkAdmin(enrichedCached),
              isLoading: false,
              isInitialized: true
            })
          } catch (_) {
            set({
              user: null,
              profile: null,
              isAuthenticated: false,
              isAdmin: false,
              isLoading: false,
              isInitialized: true
            })
          }
        }
      },

      // Sign up
      signUp: async (email, password, fullName) => {
        try {
          set({ isLoading: true })
          const { data, error } = await authHelpers.signUp(email, password, fullName)

          if (error) throw error

          toast.success('Account created successfully! Please check your email.')

          set({ isLoading: false })
          return { success: true, data }
        } catch (error) {
          console.error('Sign up error:', error)
          toast.error(error.message || 'Failed to create account')
          set({ isLoading: false })
          return { success: false, error }
        }
      },

      // Sign in
      signIn: async (email, password) => {
        try {
          set({ isLoading: true })
          const { data, error } = await authHelpers.signIn(email, password)

          if (error) throw error

          // BUG-13 FIX: Fetch profile with fallback to ensureProfileExists.
          // If getUserProfile() returns null (network blip, RLS miss), we don't
          // leave profile = null which would break all role checks post-login.
          let profile = null
          try {
            const { data: profileData } = await authHelpers.getUserProfile(data.user.id)
            profile = profileData
          } catch (_) {}

          // Fallback: ensure profile row exists in DB (handles first-time email signups)
          if (!profile) {
            try {
              profile = await ensureProfileExists(data.user, data.session?.access_token)
            } catch (_) {}
          }

          const enrichedProfile = enrichProfileRoles(profile)

          set({
            user: data.user,
            profile: enrichedProfile,
            isAuthenticated: true,
            isAdmin: checkAdmin(enrichedProfile),
            isLoading: false,
          })

          toast.success(`Welcome back, ${profile?.full_name || 'User'}!`)
          return { success: true, data }
        } catch (error) {
          console.error('Sign in error:', error)
          toast.error(error.message || 'Failed to sign in')
          set({ isLoading: false })
          return { success: false, error }
        }
      },

      // Sign in with Google
      signInWithGoogle: async () => {
        try {
          set({ isLoading: true })
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
            },
          })

          if (error) throw error
          return { success: true, data }
        } catch (error) {
          console.error('Google sign in error:', error)
          toast.error(error.message || 'Failed to sign in with Google')
          set({ isLoading: false })
          return { success: false, error }
        }
      },

      // Sign out
      signOut: async (reason = '') => {
        try {
          // Unlink from OneSignal push notification service
          oneSignalLogout()

          // 1. Reset local store state instantly to make UI transition immediate
          set({
            user: null,
            profile: null,
            isAuthenticated: false,
            isAdmin: false,
            isLoading: false,
          })

          // Clear location store immediately as well
          try {
            useLocationStore.getState().clearLocation()
          } catch (err) {
            console.warn('Failed to clear location on signOut:', err)
          }

          // Clear other persisted user stores by dispatching an event to prevent circular dependencies
          // BUT preserve them if the session expired (so the user doesn't lose their cart/wishlist!)
          if (reason !== 'session_expired' && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ozo-auth-signout', { detail: { reason } }))
          }

          // 2. Manually clear Supabase local storage key to guarantee session is deleted from the root
          if (typeof window !== 'undefined') {
            window.__ozo_access_token = null
          }
          localStorage.removeItem('ozo-auth-token')
          localStorage.removeItem('ozo-admin-token')
          sessionStorage.removeItem('ozo-admin-token')

          // 3. Trigger the remote sign out asynchronously in the background so it doesn't block the UI
          supabase.auth.signOut().catch((apiError) => {
            console.warn('Supabase remote sign out failed in background:', apiError)
          })

          // 4. Show toast
          if (reason === 'session_expired') {
            toast.error('Your session has expired. Please sign in again.')
          } else {
            toast.success('Signed out successfully')
          }
          return { success: true }
        } catch (error) {
          console.error('Sign out error:', error)
          // Fallback cleanup
          set({
            user: null,
            profile: null,
            isAuthenticated: false,
            isAdmin: false,
            isLoading: false,
          })
          localStorage.removeItem('ozo-auth-token')
          localStorage.removeItem('ozo-admin-token')
          sessionStorage.removeItem('ozo-admin-token')
          try {
            useLocationStore.getState().clearLocation()
          } catch (err) {
            console.warn('Failed to clear location on fallback signOut:', err)
          }

          // Fallback stores clear (if not session expiration)
          if (reason !== 'session_expired' && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ozo-auth-signout', { detail: { reason } }))
          }

          if (reason === 'session_expired') {
            toast.error('Your session has expired. Please sign in again.')
          } else {
            toast.success('Signed out successfully')
          }
          return { success: true }
        }
      },

      // Update profile
      updateProfile: async (updates) => {
        try {
          set({ isLoading: true })
          const userId = get().user?.id

          if (!userId) throw new Error('User not authenticated')

          // Also sync phone / full_name updates to Supabase Auth metadata
          if (updates.phone || updates.full_name) {
            const metaUpdates = {}
            if (updates.phone) metaUpdates.phone = updates.phone
            if (updates.full_name) metaUpdates.full_name = updates.full_name
            try {
              await supabase.auth.updateUser({ data: metaUpdates })
            } catch (metaErr) {
              console.warn('[OZO Auth] Failed to sync auth user metadata:', metaErr)
            }
          }

          const { data, error } = await authHelpers.updateProfile(userId, updates)

          if (error) {
            console.error('Failed to update profile in database:', error)
            toast.error(error.message || 'Failed to update profile')
            set({ isLoading: false })
            return { success: false, error }
          }

          const enrichedProfile = enrichProfileRoles({ ...(get().profile || {}), ...data, isFallback: false })
          set({ profile: enrichedProfile, isLoading: false })
          toast.success('Profile updated successfully')
          return { success: true, data }
        } catch (error) {
          console.error('Update profile error:', error)
          toast.error(error.message || 'Failed to update profile')
          set({ isLoading: false })
          return { success: false, error }
        }
      },

      // Reset password
      resetPassword: async (email) => {
        try {
          set({ isLoading: true })
          const { error } = await authHelpers.resetPassword(email)

          if (error) throw error

          set({ isLoading: false })
          toast.success('Password reset link sent to your email')
          return { success: true }
        } catch (error) {
          console.error('Reset password error:', error)
          toast.error('Failed to send reset link')
          set({ isLoading: false })
          return { success: false, error }
        }
      },

      // Refresh profile
      refreshProfile: async () => {
        try {
          const userId = get().user?.id
          if (!userId) return

          const { data } = await authHelpers.getUserProfile(userId)
          if (data) {
            const enrichedProfile = enrichProfileRoles({ ...data, isFallback: false })
            set({
              profile: enrichedProfile,
              isAdmin: checkAdmin(enrichedProfile)
            })
          }
        } catch (error) {
          console.error('Refresh profile error:', error)
        }
      },

      // Scoping helper methods
      getScopedCities: () => {
        const profile = get().profile
        if (!profile) return []
        if (profile.isSuperAdmin) return []
        return (profile.roles || [])
          .filter(r => r.role === 'city_manager' && r.city_id)
          .map(r => r.city_id)
      },

      getScopedMarts: () => {
        const profile = get().profile
        if (!profile) return []
        if (profile.isSuperAdmin) return []
        return (profile.roles || [])
          .filter(r => r.role === 'mart_owner' && r.mart_id)
          .map(r => r.mart_id)
      },

      hasAccessToCity: (cityId) => {
        const profile = get().profile
        if (!profile) return false
        if (profile.isSuperAdmin) return true
        if (!cityId) return false
        return (profile.roles || []).some(r => r.role === 'city_manager' && r.city_id === cityId)
      },

      hasAccessToMart: (martId) => {
        const profile = get().profile
        if (!profile) return false
        if (profile.isSuperAdmin) return true
        if (!martId) return false
        return (profile.roles || []).some(r => r.role === 'mart_owner' && r.mart_id === martId)
      },
    }),
    {
      name: 'ozo-auth-storage',
      partialize: (state) => {
        const persistedProfile = (state.profile && !state.profile.isFallback) ? { ...state.profile } : null
        return {
          user: state.user,
          profile: persistedProfile,
          isAuthenticated: state.isAuthenticated,
          isAdmin: checkAdmin(persistedProfile),
        }
      },
    }
  )
)

if (typeof window !== 'undefined') {
  window.addEventListener('ozo-session-expired', () => {
    useAuthStore.getState().signOut('session_expired').catch(() => {})
  })

  // ─── Session Health Check on Tab Visibility ─────────────────────────────
  // When the user returns to a backgrounded/sleeping tab, the Supabase auto-
  // refresh timer may have been throttled by the browser and the JWT could be
  // expired. We re-validate the session proactively to prevent blank pages or
  // silent 401 failures on stale tokens.
  let lastVisibilityCheck = Date.now()

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return

    // Throttle: only check if the tab was hidden for at least 2 minutes
    const elapsed = Date.now() - lastVisibilityCheck
    if (elapsed < 2 * 60 * 1000) return
    lastVisibilityCheck = Date.now()

    const store = useAuthStore.getState()
    if (!store.isAuthenticated || !store.user) return

    try {
      // getSession() returns the cached session; getUser() actually hits the
      // server and verifies the access token is still valid.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (!session || sessionError) {
        console.warn('[authStore] Session invalid on tab refocus, signing out.')
        useAuthStore.getState().signOut('session_expired').catch(() => {})
        return
      }

      // If the token is close to expiry (within 60s), force a refresh
      if (session.expires_at) {
        const expiresInMs = (session.expires_at * 1000) - Date.now()
        if (expiresInMs < 60_000) {
          const { data, error } = await supabase.auth.refreshSession()
          if (error || !data.session) {
            console.warn('[authStore] Token refresh failed on tab refocus:', error)
            useAuthStore.getState().signOut('session_expired').catch(() => {})
          }
        }
      }
    } catch (err) {
      console.warn('[authStore] Visibility check failed:', err)
    }
  })
}
