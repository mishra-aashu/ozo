import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { supabase, authHelpers } from '../lib/supabase'
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
    try {
      const store = useAuthStore.getState()

      // 1. Fetch real profile from DB via RPC / helper immediately
      let realProfile = null
      try {
        const { data } = await authHelpers.getUserProfile(session.user.id, session.access_token)
        realProfile = data
      } catch (_) {}

      // 2. Fallback to ensureProfileExists if RPC missed
      if (!realProfile) {
        try {
          realProfile = await ensureProfileExists(session.user, session.access_token)
        } catch (_) {}
      }

      // 3. Enrich profile with roles and admin status
      const enrichedProfile = realProfile
        ? store.enrichProfileRoles(realProfile)
        : store.enrichProfileRoles({ id: session.user.id, email: session.user.email, role: 'customer' })

      const isAdmin = store.checkAdmin(enrichedProfile)

      // 4. Update authStore state synchronously
      useAuthStore.setState({
        user: session.user,
        profile: enrichedProfile,
        isAuthenticated: true,
        isAdmin: isAdmin,
        isInitialized: true,
      })

      // 5. Navigate immediately
      if (enrichedProfile.phone) {
        navigate('/', { replace: true })
      } else {
        navigate('/complete-profile', { replace: true })
      }
    } catch (err) {
      console.error('[AuthCallback] Error handling auth success:', err)
      navigate('/', { replace: true })
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
