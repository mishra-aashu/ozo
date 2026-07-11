import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { Loader2 } from 'lucide-react'

const AuthCallback = () => {
  const navigate = useNavigate()
  const hasHandled = useRef(false)

  useEffect(() => {
    // The Supabase client automatically exchanges the `code` query param
    // (PKCE flow) or the URL hash tokens (implicit flow) for a session when
    // the page mounts — because `detectSessionInUrl: true` is set in the
    // client config.  We just need to wait for the resulting auth event.

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (hasHandled.current) return

        // INITIAL_SESSION fires after the SDK finishes its own initialize()
        // which includes processing the URL tokens/code.
        // SIGNED_IN fires immediately after a successful token exchange.
        if (
          (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') &&
          session?.user
        ) {
          hasHandled.current = true
          await redirectAfterAuth()
        }
      }
    )

    // Fallback: if no auth event fires within 10 seconds, use store state
    const fallbackTimer = setTimeout(async () => {
      if (hasHandled.current) return
      hasHandled.current = true

      const { isAuthenticated } = useAuthStore.getState()
      if (isAuthenticated) {
        await redirectAfterAuth()
      } else {
        navigate('/auth', { replace: true })
      }
    }, 10000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(fallbackTimer)
    }
  }, [navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  const redirectAfterAuth = async () => {
    // Poll for profile to be loaded in the auth store (max ~5s).
    // The store's SIGNED_IN handler fetches the profile asynchronously,
    // so we wait for it before navigating to avoid landing on a route
    // whose guard immediately bounces us back because profile is still null.
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      const { isAuthenticated, profile, isInitialized } = useAuthStore.getState()

      // isInitialized must be true and user must be authenticated
      if (isAuthenticated && isInitialized) {
        // If profile is loaded, we can make an informed routing decision
        if (profile !== null) {
          if (profile.phone) {
            navigate('/', { replace: true })
          } else {
            navigate('/complete-profile', { replace: true })
          }
          return
        }

        // Profile is still null — it's either still fetching OR this is a
        // brand-new user whose DB row hasn't been created yet (first OAuth login).
        // After 3 seconds of waiting (6 attempts × 500ms), assume new user.
        if (attempts >= 6) {
          navigate('/complete-profile', { replace: true })
          return
        }
      }

      await new Promise((r) => setTimeout(r, 500))
      attempts++
    }

    // Timed out waiting for profile — do a safe fallback
    const { isAuthenticated, profile } = useAuthStore.getState()
    if (isAuthenticated) {
      navigate(profile?.phone ? '/' : '/complete-profile', { replace: true })
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
