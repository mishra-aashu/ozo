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
  try {
    const { data: profile } = await authHelpers.getUserProfile(user.id)
    if (profile) return profile

    // Profile doesn't exist, create it (e.g. Google OAuth login)
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
      console.warn('Failed to insert user profile via client SDK (might be RLS):', insertError)
      // Return a fallback profile so application continues functioning
      return {
        id: user.id,
        email: user.email,
        full_name: fullName,
        avatar_url: avatarUrl,
        role: 'customer',
      }
    }
    return newProfile
  } catch (err) {
    console.error('Error ensuring profile exists:', err)
    return null
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
              // Set initialized state immediately with cached local profile so the UI doesn't hang
              set({
                user: session.user,
                profile: localProfile,
                isAuthenticated: true,
                isAdmin: localProfile?.role === 'admin',
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
                    const finalProfile = {
                      ...localProfile,
                      ...profile,
                      role: profile.role, // DB role always wins
                      avatar_url: profile.avatar_url || localProfile.avatar_url || ''
                    }

                    set({
                      profile: finalProfile,
                      isAdmin: finalProfile?.role === 'admin'
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

              const finalProfile = profile || localProfile

              set({
                user: session.user,
                profile: finalProfile,
                isAuthenticated: true,
                isAdmin: finalProfile?.role === 'admin',
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

          // Register the auth state change listener and store the subscription
          // handle so it can be torn down if initializeAuth is called again.
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

                // Guard against concurrent profile fetches caused by rapid
                // SIGNED_IN events (e.g. token refresh firing while the
                // previous fetch is still in-flight).
                if (profileFetchInProgress) return
                profileFetchInProgress = true

                // Defer async database queries to avoid client lock deadlocks
                setTimeout(async () => {
                  try {
                    const localProfile = get().profile
                    let profile = null
                    try {
                      profile = await ensureProfileExists(session.user)
                    } catch (err) {
                      console.warn('Failed to ensure profile on sign in:', err)
                    }

                    // Merge: start with local profile, overwrite with fresh DB profile
                    // details only if the user ID matches.
                    // DB role always wins to prevent stale-cache role mismatch issues.
                    const finalProfile = profile
                      ? (localProfile && localProfile.id === profile.id
                          ? {
                              ...localProfile,
                              ...profile,
                              role: profile.role, // DB role always wins
                              avatar_url: profile.avatar_url || localProfile.avatar_url || ''
                            }
                          : profile)
                      : localProfile

                    set({
                      user: session.user,
                      profile: finalProfile,
                      isAuthenticated: true,
                      isAdmin: finalProfile?.role === 'admin',
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
              }
            }
          )

          authSubscription = subscription
        } catch (error) {
          console.error('Auth initialization error:', error)
          // Fallback: use whatever we have in the persisted store to keep the app functional
          const cachedUser = get().user
          const cachedProfile = get().profile
          set({
            user: cachedUser || null,
            profile: cachedProfile || null,
            isAuthenticated: !!cachedUser,
            isAdmin: cachedProfile?.role === 'admin',
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

          set({
            user: data.user,
            profile: profile,
            isAuthenticated: true,
            isAdmin: profile?.role === 'admin',
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
          const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth`,
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

          set({ profile: data, isLoading: false })
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
            set({
              profile: data,
              isAdmin: data.role === 'admin'
            })
          }
        } catch (error) {
          console.error('Refresh profile error:', error)
        }
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
}
