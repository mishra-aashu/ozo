import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Loader2 } from 'lucide-react'

const AuthCallback = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isInitialized } = useAuthStore()

  useEffect(() => {
    // If auth store has finished initializing and the user is authenticated, redirect them
    if (isInitialized) {
      if (isAuthenticated) {
        // Successful login, redirect to home page
        navigate('/', { replace: true })
      } else {
        // If not authenticated after initialization, redirect back to auth page
        const timer = setTimeout(() => {
          navigate('/auth', { replace: true })
        }, 3000)
        return () => clearTimeout(timer)
      }
    }
  }, [isInitialized, isAuthenticated, navigate])

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
