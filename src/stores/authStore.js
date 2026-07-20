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

// Helper to ensure user profile exists in public.users table (important for OAuth logins)
const ensureProfileExists = async (user) => {
  if (!user) return null
  
  const fetchWithRetry = async (retries = 2, delay = 500) => {
    for (let i = 0; i <= retries; i++) {
      try {
        const { data: profile, error } = await authHelpers.getUserProfile(user.id)
        if (profile) return profile
        // If it's a PGRST116 (no rows found) error, we know the profile doesn't exist
        // in the database, so we don't need to retry the fetch.
        if (error && error.code === 'PGRST116') {
          return null
        }
        if (error) {
          console.warn(`Fetch profile attempt ${i + 1} failed:`, error)
        }
      } catch (err) {
        console.warn(`Fetch profile attempt ${i + 1} threw:`, err)
      }
      if (i < retries) {
        await new Promise(res => setTimeout(res, delay * Math.pow(2, i)))
      }
    }
    return null
  }

  try {
    // 1. Try to fetch the profile with retries for transient issues
    let profile = await fetchWithRetry()
    if (profile) return profile

    // 2. If it doesn't exist, attempt to insert
    const metadata = user.user_metadata || {}
    const fullName = metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Ozo User'
    const avatarUrl = metadata.avatar_url || metadata.picture || ''

    const { data: newProfile, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          id: user.id,
          email: user.email,
          full_name: fullName,
          avatar_url: avatarUrl,
          role: 'customer',
        }
      ])
      .select()
      .single()

    if (insertError) {
      console.warn('Failed to insert user profile via client SDK (might be RLS or duplicate key):', insertError)
      
      // 3. Retry the fetch one more time. The row might have been created by
      // a concurrent trigger (like on_auth_user_created) or another process.
      profile = await fetchWithRetry(2, 500)
      if (profile) {
        console.log('Successfully retrieved profile on retry after insert failure.')
        return profile
      }
      
      // 4. Return null instead of a fake fallback with phone: null.
      // This ensures that if the user already has a valid cached profile
      // in the store (e.g. from localStorage), we do not overwrite their
      // phone number with null and throw them into a redirect loop.
      return null
    }

    return newProfile
  } catch (err) {
    console.error('Error ensuring profile exists:', err)
    return null
  }
}

// Helper to enrich profile roles and check if admin
const enrichProfileRoles = (profile) => {
  if (!profile) return null
  const roles = profile.user_roles || []
  const hasSuperAdmin = roles.some(r => r.role === 'super_admin') || profile.role === 'admin' || profile.role === 'super_admin'
  const hasCityManager = roles.some(r => r.role === 'city_manager') || profile.role === 'city_manager'
  const hasMartOwner = roles.some(r => r.role === 'mart_owner') || profile.role === 'mart_owner'
  const hasRider = roles.some(r => r.role === 'rider') || profile.role === 'rider'
  const hasCustomer = roles.some(r => r.role === 'customer') || profile.role === 'customer'

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
    roles: roles,
    isSuperAdmin: hasSuperAdmin,
    isCityManager: hasCityManager,
    isMartOwner: hasMartOwner,
    isRider: hasRider,
    isCustomer: hasCustomer,
  }
}

const checkAdmin = (profile) => {
  if (!profile) return false
  const enriched = enrichProfileRoles(profile)
  return !!(enriched?.isSuperAdmin || enriched?.isCityManager)
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

          // Get current session with a timeout to prevent absolute block if auth endpoints hang
          const { data: { session } } = await Promise.race([
            supabase.auth.getSession(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Session fetch timeout')), 5000))
          ])

          if (session?.user) {
            // Sync session to supabaseAdmin client so admin requests are authenticated
            try {
              await supabaseAdmin.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              })
            } catch (adminErr) {
              console.warn('Failed to sync session to supabaseAdmin on init:', adminErr)
            }

            // Sync user to OneSignal push notification service
            oneSignalLogin(session.user.id)

            // Fetch and ensure user profile
            const localProfile = get().profile

            if (localProfile && localProfile.id === session.user.id) {
              const enrichedLocal = enrichProfileRoles(localProfile)
              // Set initialized state immediately with cached local profile so the UI doesn't hang
              set({
                user: session.user,
                profile: enrichedLocal,
                isAuthenticated: true,
                isAdmin: checkAdmin(enrichedLocal),
                isLoading: false,
                isInitialized: true,
              })

              // Fetch the latest profile in the background to ensure it is up to date
              setTimeout(async () => {
                try {
                  const profile = await Promise.race([
                    ensureProfileExists(session.user),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timeout')), 5000))
                  ])

                  if (profile) {
                    // Always let the fresh DB profile win for role — never use stale cached role
                    const finalProfile = enrichProfileRoles({
                      ...localProfile,
                      ...profile,
                      role: profile.role, // DB role always wins
                      avatar_url: profile.avatar_url || localProfile.avatar_url || ''
                    })

                    set({
                      profile: finalProfile,
                      isAdmin: checkAdmin(finalProfile)
                    })
                  }
                } catch (err) {
                  console.warn('Failed to refresh profile in background on init:', err)
                }
              }, 0)
            } else {
              // No cached profile for this user. Wait for the database query.
              let profile = null
              try {
                profile = await Promise.race([
                  ensureProfileExists(session.user),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timeout')), 7000))
                ])
              } catch (err) {
                console.warn('Failed to ensure profile on init:', err)
              }

              const finalProfile = enrichProfileRoles(profile || localProfile)

              set({
                user: session.user,
                profile: finalProfile,
                isAuthenticated: true,
                isAdmin: checkAdmin(finalProfile),
                isLoading: false,
                isInitialized: true,
              })
            }
          } else {
            set({
              user: null,
              profile: null,
              isAuthenticated: false,
              isAdmin: false,
              isLoading: false,
              isInitialized: true,
            })
            try {
              useLocationStore.getState().clearLocation()
            } catch (err) {
              console.warn('Failed to clear location on auth initialization mismatch:', err)
            }
          }

          // Mark init as complete and tear down the early capture listener.
          initComplete = true
          earlySubscription.unsubscribe()

          // Register the permanent auth state change listener and store the
          // subscription handle so it can be torn down if initializeAuth is called again.
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
              // Sync session to supabaseAdmin
              if (session) {
                supabaseAdmin.auth.setSession({
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                }).catch((err) => {
                  console.warn('Failed to sync session to supabaseAdmin on auth change:', err)
                })
              } else {
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
                      profile = await ensureProfileExists(session.user)
                    } catch (err) {
                      console.warn('Failed to ensure profile on sign in:', err)
                    }

                    // Merge: start with local profile, overwrite with fresh DB profile
                    // details only if the user ID matches.
                    // DB role always wins to prevent stale-cache role mismatch issues.
                    const currentLocalProfile = get().profile
                    const finalProfile = enrichProfileRoles(profile
                      ? (currentLocalProfile && currentLocalProfile.id === profile.id
                          ? {
                              ...currentLocalProfile,
                              ...profile,
                              role: profile.role, // DB role always wins
                              avatar_url: profile.avatar_url || currentLocalProfile.avatar_url || ''
                            }
                          : profile)
                      : currentLocalProfile)

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
              } else if (event === 'TOKEN_REFRESHED' && session?.user) {
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
                          ? { ...currentProfile, ...data, role: data.role, avatar_url: data.avatar_url || currentProfile.avatar_url || '' }
                          : data
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
                  const profile = await ensureProfileExists(earlySess.user)
                  const currentLocalProfile = get().profile
                  const finalProfile = enrichProfileRoles(profile
                    ? (currentLocalProfile && currentLocalProfile.id === profile.id
                        ? { ...currentLocalProfile, ...profile, role: profile.role, avatar_url: profile.avatar_url || currentLocalProfile.avatar_url || '' }
                        : profile)
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
        } catch (error) {
          console.error('Auth initialization error:', error)
          // Fallback: use whatever we have in the persisted store to keep the app functional
          const cachedUser = get().user
          const cachedProfile = get().profile
          const enrichedCached = enrichProfileRoles(cachedProfile)
          set({
            user: cachedUser || null,
            profile: enrichedCached || null,
            isAuthenticated: !!cachedUser,
            isAdmin: checkAdmin(enrichedCached),
            isLoading: false,
            isInitialized: true
          })
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

          // Fetch profile
          const { data: profile } = await authHelpers.getUserProfile(data.user.id)
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

          const { data, error } = await authHelpers.updateProfile(userId, updates)

          if (error) {
            console.error('Failed to update profile in database:', error)
            toast.error(error.message || 'Failed to update profile')
            set({ isLoading: false })
            return { success: false, error }
          }

          const enrichedProfile = enrichProfileRoles(data)
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
            const enrichedProfile = enrichProfileRoles(data)
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
        const persistedProfile = state.profile ? { ...state.profile } : null
        // Do not delete role to avoid redirecting admins on page refresh
        return {
          user: state.user,
          profile: persistedProfile,
          isAuthenticated: state.isAuthenticated,
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
