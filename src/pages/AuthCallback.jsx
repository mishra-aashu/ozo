import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { Loader2 } from 'lucide-react'

const AuthCallback = () => {
  const navigate = useNavigate()
  const hasHandled = useRef(false)

  useEffect(() => {
    // Step 1: Register onAuthStateChange FIRST (before any async work)
    // so we never miss the SIGNED_IN event from the PKCE code exchange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (hasHandled.current) return

        if (
          (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') &&
          session?.user
        ) {
          hasHandled.current = true
          subscription.unsubscribe()
          await handleAuthSuccess(session)
        }
      }
    )

    // Step 2: Also try getSession() as a fast path in case the SDK has
    // already exchanged the code before our listener was registered.
    const tryGetSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('[AuthCallback] getSession error:', error)
        }
        if (session?.user && !hasHandled.current) {
          hasHandled.current = true
          subscription.unsubscribe()
          await handleAuthSuccess(session)
        }
      } catch (err) {
        console.error('[AuthCallback] getSession threw:', err)
      }
    }
    tryGetSession()

    // Step 3: Hard timeout fallback — 15 seconds
    const fallbackTimer = setTimeout(async () => {
      if (hasHandled.current) return
      hasHandled.current = true
      subscription.unsubscribe()

      // Last-ditch: try reading session directly
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          await handleAuthSuccess(session)
          return
        }
      } catch (_) {}

      // Truly failed — go back to auth page
      navigate('/auth', { replace: true })
    }, 15000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(fallbackTimer)
    }
  }, [navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Called once we have a confirmed Supabase session.
   * Syncs state into the authStore (in case the store's own listener missed
   * the SIGNED_IN event due to late registration), then decides where to navigate.
   */
  const handleAuthSuccess = async (session) => {
    const store = useAuthStore.getState()

    // Manually sync user + isAuthenticated into the store if the store's own
    // onAuthStateChange listener hasn't fired yet (race condition on PKCE exchange).
    if (!store.isAuthenticated) {
      useAuthStore.setState({
        user: session.user,
        isAuthenticated: true,
        isInitialized: true,
      })
    }

    // Poll for the store's profile fetch to complete (max 6s / 12 attempts).
    // The store's SIGNED_IN handler fires ensureProfileExists() in a setTimeout,
    // so it may lag slightly behind this callback.
    let attempts = 0
    const maxAttempts = 12

    while (attempts < maxAttempts) {
      const { profile, isAuthenticated } = useAuthStore.getState()

      if (isAuthenticated) {
        // Only make routing decision if profile is loaded and is NOT a temporary fallback profile
        if (profile !== null && !profile.isFallback) {
          if (profile.phone) {
            navigate('/', { replace: true })
          } else {
            navigate('/complete-profile', { replace: true })
          }
          return
        }
      }

      await new Promise((r) => setTimeout(r, 500))
      attempts++
    }

    // Timed out polling — attempt direct fetch before falling back to complete-profile
    try {
      const { data: realProfile } = await authHelpers.getUserProfile(session.user.id)
      if (realProfile) {
        const enriched = useAuthStore.getState().enrichProfileRoles
          ? useAuthStore.getState().enrichProfileRoles(realProfile)
          : realProfile
        useAuthStore.setState({ profile: enriched })
        if (realProfile.phone) {
          navigate('/', { replace: true })
          return
        }
      }
    } catch (_) {}

    const { isAuthenticated, profile } = useAuthStore.getState()
    if (isAuthenticated) {
      if (profile && !profile.isFallback && profile.phone) {
        navigate('/', { replace: true })
      } else {
        navigate('/complete-profile', { replace: true })
      }
    } else {
      navigate('/auth', { replace: true })
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-white dark:bg-[#060608]">
      <div className="relative flex flex-col items-center justify-center max-w-sm px-6 text-center">
        {/* Glow effect */}
        <div className="absolute w-72 h-72 bg-ozo-red/5 rounded-full filter blur-3xl opacity-75 pointer-events-none" />
        
        {/* Animated Spinners */}
        <div className="relative mb-8">
          <div className="w-16 h-16 border-4 border-ozo-red/20 border-t-ozo-red rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-ozo-red animate-spin [animation-duration:3s]" />
          </div>
        </div>

        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
          Completing Sign In
        </h2>
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 leading-relaxed">
          Please wait while we securely connect your Google account and load your profile...
        </p>
      </div>
    </div>
  )
}

export default AuthCallback
