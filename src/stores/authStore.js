import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, authHelpers } from '../lib/supabase'
import toast from 'react-hot-toast'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      profile: null,
      isLoading: false,
      isAuthenticated: false,
      isAdmin: false,

      // Initialize auth
      initializeAuth: async () => {
        try {
          set({ isLoading: true })

          // Get current session
          const { data: { session } } = await supabase.auth.getSession()

          if (session?.user) {
            // Fetch user profile
            const { data: profile } = await authHelpers.getUserProfile(session.user.id)

            set({
              user: session.user,
              profile: profile,
              isAuthenticated: true,
              isAdmin: profile?.role === 'admin',
              isLoading: false,
            })
          } else {
            set({ isLoading: false })
          }

          // Listen to auth changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              const { data: profile } = await authHelpers.getUserProfile(session.user.id)

              set({
                user: session.user,
                profile: profile,
                isAuthenticated: true,
                isAdmin: profile?.role === 'admin',
              })
            } else if (event === 'SIGNED_OUT') {
              set({
                user: null,
                profile: null,
                isAuthenticated: false,
                isAdmin: false,
              })
            }
          })
        } catch (error) {
          console.error('Auth initialization error:', error)
          set({ isLoading: false })
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

      // Sign out
      signOut: async () => {
        try {
          set({ isLoading: true })
          const { error } = await authHelpers.signOut()

          if (error) throw error

          set({
            user: null,
            profile: null,
            isAuthenticated: false,
            isAdmin: false,
            isLoading: false,
          })

          toast.success('Signed out successfully')
          return { success: true }
        } catch (error) {
          console.error('Sign out error:', error)
          toast.error('Failed to sign out')
          set({ isLoading: false })
          return { success: false, error }
        }
      },

      // Update profile
      updateProfile: async (updates) => {
        try {
          set({ isLoading: true })
          const userId = get().user?.id

          if (!userId) throw new Error('User not authenticated')

          const { data, error } = await authHelpers.updateProfile(userId, updates)

          if (error) throw error

          set({ profile: data, isLoading: false })
          toast.success('Profile updated successfully')
          return { success: true, data }
        } catch (error) {
          console.error('Update profile error:', error)
          toast.error('Failed to update profile')
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
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
      }),
    }
  )
)