import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, Lock, Unlock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

const AdminLockScreen = ({ onUnlock }) => {
  const { profile } = useAuthStore()
  const isCityManager = profile?.isCityManager

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleUnlock = async (e) => {
    e.preventDefault()
    if (!password.trim()) {
      toast.error(isCityManager ? 'Please enter the passcode' : 'Please enter the admin password')
      return
    }

    setIsLoading(true)
    try {
      // Step 1: Get session — if token is expired or missing, refresh it first
      const { data: initialSessionData } = await supabase.auth.getSession()
      let currentToken = initialSessionData?.session?.access_token

      if (!currentToken) {
        // No session at all — try a refresh
        const { data: refreshed } = await supabase.auth.refreshSession()
        currentToken = refreshed?.session?.access_token
      } else {
        // Check if the token is close to expiry (within 60s)
        const exp = initialSessionData.session?.expires_at
        if (exp && (exp * 1000) < Date.now() + 60_000) {
          const { data: refreshed } = await supabase.auth.refreshSession()
          if (refreshed?.session?.access_token) {
            currentToken = refreshed.session.access_token
          }
        }
      }

      if (!currentToken) {
        throw new Error('Your session has expired. Please refresh the page and sign in again.')
      }

      // Step 2: Sync fresh token to window so the custom fetch interceptor sends it as Bearer
      if (typeof window !== 'undefined') {
        window.__ozo_access_token = currentToken
      }

      // Step 3: Call RPC verify_admin_login with the fresh session
      const { data: token, error } = await supabase.rpc('verify_admin_login', {
        p_password: password
      })

      if (error) {
        throw error
      }

      if (token) {
        localStorage.setItem('ozo-admin-token', token)
        toast.success(isCityManager ? 'City Manager console unlocked successfully' : 'Admin panel unlocked successfully')
        onUnlock()
      } else {
        throw new Error('Authentication failed: No token returned.')
      }
    } catch (err) {
      console.error('[Admin Unlock Error]:', err)
      toast.error(err.message || (isCityManager ? 'Incorrect passcode. Please try again.' : 'Incorrect admin password. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/90 dark:bg-black/95 backdrop-blur-md px-4 select-none">
      {/* Background ambient glow */}
      <div className="absolute w-[400px] h-[400px] bg-ozo-red/10 rounded-full blur-[100px] top-1/4 left-1/4 animate-pulse pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] bg-ozo-green/10 rounded-full blur-[100px] bottom-1/4 right-1/4 animate-pulse pointer-events-none [animation-delay:2s]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
        className="w-full max-w-md bg-white/5 dark:bg-zinc-900/50 backdrop-blur-xl border border-white/10 dark:border-white/5 p-8 rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] text-center relative overflow-hidden"
      >
        {/* Glow accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ozo-red to-orange-500" />

        {/* Lock Icon */}
        <div className="relative mx-auto w-20 h-20 bg-zinc-900 dark:bg-zinc-800 rounded-3xl border border-white/10 flex items-center justify-center shadow-inner group mb-6">
          <motion.div
            animate={isLoading ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            {isLoading ? (
              <Loader2 size={32} className="text-ozo-red animate-spin" />
            ) : (
              <Lock size={32} className="text-ozo-red" />
            )}
          </motion.div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-ozo-red rounded-full animate-pulse" />
        </div>

        <h1 className="text-2xl font-black text-white mb-2 tracking-tight">
          {isCityManager ? 'CITY MANAGER PORTAL' : 'ADMIN PANEL LOCKED'}
        </h1>
        <p className="text-sm text-zinc-400 font-medium mb-8 leading-relaxed">
          {isCityManager
            ? 'Enter your city manager passcode to access the portal.'
            : 'This section contains sensitive options. Please enter the master admin password to confirm identity.'}
        </p>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isCityManager ? 'Enter passcode' : 'Enter master password'}
              className="w-full bg-black/30 border border-white/10 text-white placeholder-zinc-600 rounded-2xl px-5 py-4 pr-12 focus:outline-none focus:border-ozo-red/50 focus:ring-1 focus:ring-ozo-red/30 transition-all font-mono text-lg tracking-[0.3em]"
              autoFocus
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <motion.button
            type="submit"
            disabled={isLoading || !password.trim()}
            whileTap={{ scale: 0.97 }}
            className="w-full bg-gradient-to-r from-ozo-red to-red-600 hover:from-red-600 hover:to-ozo-red disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-ozo-red/20"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Unlock size={18} />
                Unlock Terminal
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-2 text-zinc-600">
          <ShieldAlert size={14} />
          <p className="text-xs font-semibold">Server-side encryption &amp; logging is active.</p>
        </div>
      </motion.div>
    </div>
  )
}

export default AdminLockScreen
