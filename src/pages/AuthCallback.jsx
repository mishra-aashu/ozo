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

      // 2. Fallback: minimal profile from auth metadata if DB fetch failed
      if (!realProfile) {
        realProfile = {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0],
          phone: session.user.user_metadata?.phone || session.user.phone || '',
          role: 'customer',
          user_roles: [],
        }
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
    <div className="min-h-[85vh] w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-[#070709] relative overflow-hidden px-4">
      {/* Keyframe Styles for Loader */}
      <style>{`
        @keyframes progressLoad {
          0% { left: -40%; }
          100% { left: 110%; }
        }
        @keyframes orbitRed {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes orbitGreen {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }
        .animate-progress-bar {
          animation: progressLoad 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .animate-orbit-red {
          animation: orbitRed 3s linear infinite;
        }
        .animate-orbit-green {
          animation: orbitGreen 2.2s linear infinite;
        }
      `}</style>

      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-ozo-red/10 dark:bg-ozo-red/5 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none animate-pulse [animation-delay:2s]" />

      {/* Loading Card */}
      <div className="relative z-10 w-full max-w-sm bg-white/70 dark:bg-[#121214]/60 backdrop-blur-xl border border-gray-200/50 dark:border-white/5 rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center text-center">
        
        {/* Animated Loader Container */}
        <div className="relative mb-8 flex items-center justify-center">
          {/* Pulsing Outer Glow ring */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-ozo-red to-emerald-500 opacity-20 blur-xl animate-pulse scale-110" />
          
          {/* Spinning Outer Ring */}
          <div className="w-24 h-24 rounded-3xl border-2 border-dashed border-ozo-red/35 dark:border-ozo-red/20 animate-[spin_8s_linear_infinite]" />
          
          {/* Spinning Inner Reverse Ring */}
          <div className="absolute w-20 h-20 rounded-[1.25rem] border border-dashed border-emerald-500/40 dark:border-emerald-500/25 animate-[spin_6s_linear_infinite_reverse]" />
          
          {/* Pulsing Core Brand Icon Card */}
          <div className="absolute w-14 h-14 bg-gradient-to-tr from-ozo-red to-rose-600 rounded-2xl shadow-lg flex items-center justify-center text-white transform hover:rotate-12 transition-transform duration-300">
            <Loader2 className="w-7 h-7 animate-spin" style={{ animationDuration: '3s' }} />
          </div>

          {/* Glowing dots orbiting */}
          <div className="absolute w-3 h-3 rounded-full bg-ozo-red blur-[1px] animate-orbit-red" style={{ transformOrigin: 'center 48px' }} />
          <div className="absolute w-2 h-2 rounded-full bg-emerald-500 blur-[1px] animate-orbit-green" style={{ transformOrigin: 'center 40px' }} />
        </div>

        {/* Loading Brand & Status */}
        <div className="space-y-3 w-full">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ozo-red/10 border border-ozo-red/20 text-ozo-red text-[10px] font-black uppercase tracking-widest animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Secure Authentication</span>
          </div>
          
          <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider leading-none">
            Completing Sign In
          </h2>
          
          <p className="text-[11px] font-semibold text-gray-550 dark:text-gray-400 max-w-[240px] mx-auto leading-relaxed">
            Please wait while we securely connect your Google account and load your profile...
          </p>
        </div>

        {/* Glowing Progress Track */}
        <div className="w-full bg-gray-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden mt-7 relative border border-gray-200/20 dark:border-white/5">
          <div className="absolute top-0 bottom-0 w-[40%] bg-gradient-to-r from-ozo-red via-rose-500 to-emerald-500 rounded-full animate-progress-bar" />
        </div>
      </div>
    </div>
  )
}

export default AuthCallback
