import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, Loader2, LogOut, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

const CompleteProfile = () => {
  const { user, profile, updateProfile, signOut } = useAuthStore()
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/'

  // Clean phone input to only allow digits
  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '')
    if (value.length <= 10) {
      setPhone(value)
      setError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!phone) {
      setError('Phone number is required')
      return
    }

    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number')
      return
    }

    setIsLoading(true)
    try {
      const result = await updateProfile({ phone })
      if (result.success) {
        toast.success('Profile completed successfully!')
        navigate(from, { replace: true })
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to update phone number. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    const result = await signOut()
    if (result.success) {
      navigate('/auth')
    }
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center py-12 px-6 bg-gray-50 dark:bg-[#0a0a0a]">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-[#121212] p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-white/5"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 dark:bg-ozo-red/10 text-ozo-red rounded-2xl mb-4">
            <Phone className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            Complete Your <span className="text-gradient">Profile.</span>
          </h2>
          <p className="text-sm text-ozo-gray dark:text-gray-400 mt-2">
            Just one last step, <span className="font-bold text-gray-900 dark:text-white">{profile?.full_name || 'User'}</span>! We need your phone number to coordinate delivery.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 font-bold text-gray-500 dark:text-gray-400">
                +91
              </span>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="Enter 10-digit number"
                disabled={isLoading}
                className={`w-full pl-14 pr-4 py-4 rounded-2xl border ${
                  error
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-200 dark:border-white/10 focus:ring-ozo-red'
                } bg-white dark:bg-white/5 text-gray-900 dark:text-white font-semibold text-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                autoFocus
              />
            </div>
            {error && (
              <p className="text-xs text-red-500 font-medium mt-2 flex items-center gap-1">
                {error}
              </p>
            )}
          </div>

          {/* Bullet points */}
          <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex gap-2 text-xs text-gray-600 dark:text-gray-400 font-medium">
              <CheckCircle className="w-4 h-4 text-ozo-green shrink-0" />
              <span>Used by riders to reach your location</span>
            </div>
            <div className="flex gap-2 text-xs text-gray-600 dark:text-gray-400 font-medium">
              <CheckCircle className="w-4 h-4 text-ozo-green shrink-0" />
              <span>Receive delivery updates via SMS & WhatsApp</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn btn-primary py-4 flex items-center justify-center gap-2 rounded-2xl text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Complete Registration'
            )}
          </button>
        </form>

        {/* Cancel / Logout */}
        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5 text-center">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-600 hover:underline transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default CompleteProfile
