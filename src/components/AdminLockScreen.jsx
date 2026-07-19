import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, Lock, Unlock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useAuthStore from '../stores/authStore'
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
      // Call RPC verify_admin_login to verify password and get session token
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
              <Loader2 className="w-10 h-10 text-ozo-red animate-spin" />
            ) : (
              <Lock className="w-10 h-10 text-ozo-red group-hover:scale-110 transition-transform duration-300" />
            )}
          </motion.div>
          {/* Subtle indicator */}
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-black text-gray-150 dark:text-white tracking-tight uppercase notranslate" translate="no">
          {isCityManager ? 'City Manager Portal Locked' : 'Admin Panel Locked'}
        </h2>
        <p className="mt-2 text-sm text-gray-400 font-medium px-4">
          {isCityManager 
            ? 'This section contains sensitive city operations. Please enter the master passcode to confirm identity.' 
            : 'This section contains sensitive options. Please enter the master admin password to confirm identity.'}
        </p>

        {/* Form */}
        <form onSubmit={handleUnlock} className="mt-8 space-y-6">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isCityManager ? "Enter Passcode" : "Enter Admin Password"}
              disabled={isLoading}
              className="w-full px-5 py-4 bg-black/40 border border-white/10 focus:border-ozo-red focus:ring-1 focus:ring-ozo-red/30 rounded-2xl text-white placeholder-gray-500 font-mono text-center tracking-wider text-lg focus:outline-none transition-all duration-300 disabled:opacity-50"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-ozo-red to-orange-650 text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-ozo-red/20 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 text-base disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Unlocking...
              </>
            ) : (
              <>
                <Unlock className="w-5 h-5" />
                Unlock Terminal
              </>
            )}
          </button>
        </form>

        {/* Notice */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-red-500/80 font-bold bg-red-950/10 border border-red-500/10 py-2.5 px-4 rounded-xl">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>Server-side encryption & logging is active.</span>
        </div>
      </motion.div>
    </div>
  )
}

export default AdminLockScreen
