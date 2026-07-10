import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { Loader2 } from 'lucide-react'

const AuthCallback = () => {
  const navigate = useNavigate()
  const hasHandled = useRef(false)

  useEffect(() => {
    // Listen directly to the Supabase auth state change — this is the only
    // reliable way to know when the URL hash tokens have been exchanged for
    // a session.  The zustand store's `isInitialized` flag may flip to true
    // BEFORE the URL token exchange completes (race condition), which caused
    // users to be bounced back to /auth.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only act on the events that signal a fresh session from the callback URL.
        // INITIAL_SESSION fires when the client finishes its initialize() — which
        // includes processing the URL hash.  SIGNED_IN fires right after.
        if (
          (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') &&
          session?.user &&
          !hasHandled.current
        ) {
          hasHandled.current = true

          // Give the auth store a moment to process the SIGNED_IN event and
          // populate the profile (it does this in a setTimeout(…, 0)).
          // We wait up to 4 seconds for the profile to appear.
          let profile = useAuthStore.getState().profile
          let attempts = 0
          while (!profile && attempts < 8) {
            await new Promise((r) => setTimeout(r, 500))
            profile = useAuthStore.getState().profile
            attempts++
          }

          // Decide where to send the user
          if (profile?.phone) {
            navigate('/', { replace: true })
          } else {
            navigate('/complete-profile', { replace: true })
          }
        }
      }
    )

    // Fallback: if no auth event fires within 8 seconds (e.g. the URL had no
    // valid tokens), check the store state and redirect accordingly.
    const fallbackTimer = setTimeout(() => {
      if (hasHandled.current) return
      hasHandled.current = true

      const { isAuthenticated, profile } = useAuthStore.getState()
      if (isAuthenticated) {
        if (profile?.phone) {
          navigate('/', { replace: true })
        } else {
          navigate('/complete-profile', { replace: true })
        }
      } else {
        navigate('/auth', { replace: true })
      }
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(fallbackTimer)
    }
  }, [navigate])

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
