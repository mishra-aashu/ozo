import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCaptainStore } from '../../stores/captainStore'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { useShallow } from 'zustand/react/shallow'
import CaptainOnboarding from './CaptainOnboarding'
import { promptOneSignalPush, syncSubscriptionWithDatabase, oneSignalLogin } from '../../utils/onesignal'
import CaptainRadar from './CaptainRadar'
import CaptainProfile from './CaptainProfile'
import { 
  Bike, 
  Map, 
  User, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  ShieldAlert, 
  FileCheck2,
  Compass,
  LayoutDashboard,
  Sun,
  Moon,
  ArrowLeft
} from 'lucide-react'

const CaptainDashboard = () => {
  const { 
    isLoadingProfile, 
    fetchProfile, 
    subscribeToRadar, 
    unsubscribeFromRadar,
    unsubscribeFromProfile
  } = useCaptainStore(useShallow(state => ({
    isLoadingProfile: state.isLoadingProfile,
    fetchProfile: state.fetchProfile,
    subscribeToRadar: state.subscribeToRadar,
    unsubscribeFromRadar: state.unsubscribeFromRadar,
    unsubscribeFromProfile: state.unsubscribeFromProfile
  })))

  const captainStatus = useCaptainStore(state => state.captainProfile?.status)
  const hasProfile = useCaptainStore(state => state.captainProfile !== null)

  const { user } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  
  // Navigation tabs for verified Captains: 'radar', 'profile'
  const [activeTab, setActiveTab] = useState('radar')

  useEffect(() => {
    if (user) {
      fetchProfile()
    }

    return () => {
      unsubscribeFromRadar()
      unsubscribeFromProfile()
    }
  }, [user, fetchProfile, unsubscribeFromRadar, unsubscribeFromProfile])

  // Automatically handle radar subscription when status is online
  useEffect(() => {
    if (captainStatus === 'online') {
      subscribeToRadar()
    } else {
      unsubscribeFromRadar()
    }
  }, [captainStatus, subscribeToRadar, unsubscribeFromRadar])

  // 5. MANDATORY NOTIFICATION PERMISSION STATE FOR CAPTAINS
  const [notificationPermission, setNotificationPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  )

  useEffect(() => {
    if (!('Notification' in window)) return

    // Periodically poll permission state to capture settings adjustments instantly
    const interval = setInterval(() => {
      if (Notification.permission !== notificationPermission) {
        setNotificationPermission(Notification.permission)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [notificationPermission])

  // AUTO-SYNC: Ensure OneSignal is linked when rider opens dashboard
  useEffect(() => {
    if (!user) return

    const autoSyncNotifications = async () => {
      try {
        // Login the rider into OneSignal with their user ID
        await oneSignalLogin(user.id)

        // If permission not granted yet, prompt the rider
        if ('Notification' in window && Notification.permission !== 'granted') {
          await promptOneSignalPush()
        } else if ('Notification' in window && Notification.permission === 'granted') {
          // Already granted — just sync the subscription ID to DB
          if (window.__oneSignalInitialized && window.OneSignal) {
            await syncSubscriptionWithDatabase(window.OneSignal)
          }
        }
      } catch (err) {
        console.warn('[Captain] OneSignal auto-sync failed:', err)
      }
    }

    // Slight delay to let OneSignal SDK fully initialize
    const timer = setTimeout(autoSyncNotifications, 1500)
    return () => clearTimeout(timer)
  }, [user])

  const handleOnboardingComplete = () => {
    fetchProfile()
  }

  // 1. LOADING PROFILE STATE
  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#070709] text-gray-900 dark:text-white flex flex-col items-center justify-center p-6 transition-colors duration-300">
        <div className="w-9 h-9 border-4 border-t-[#00FF66] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-4 font-semibold">Retrieving Rider Duty File...</p>
      </div>
    )
  }

  // 2. USER NOT LOGGED IN STATE
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#070709] text-gray-900 dark:text-white flex flex-col items-center justify-center p-6 text-center transition-colors duration-300">
        <div className="bg-white dark:bg-[#1c1c28] border border-gray-200 dark:border-transparent p-4 rounded-2xl text-gray-500 mb-4">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h3 className="text-lg font-bold">Rider Account Required</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-[280px] leading-relaxed">
          Please login to your OZO customer account to register as a Captain.
        </p>
        <Link to="/" className="mt-4 px-6 py-2.5 bg-white dark:bg-[#12121a] hover:bg-gray-50 dark:hover:bg-[#1a1a26] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-2xl text-xs font-black uppercase tracking-wider border border-gray-200 dark:border-white/5 transition-all">
          Back to Home
        </Link>
      </div>
    )
  }

  // 3. REGISTRATION / ONBOARDING FORM STATE OR REJECTED STATE
  if (!hasProfile || captainStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#070709] text-gray-900 dark:text-white py-12 px-4 flex flex-col items-center justify-center overflow-y-auto transition-colors duration-300 gap-6 relative">
        {/* Floating Back Button */}
        <div className="absolute top-4 left-4">
          <Link
            to="/"
            className="p-2.5 bg-white dark:bg-[#0c0c14] border border-gray-200 dark:border-[#1e1e32] rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm flex items-center justify-center"
            title="Back to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
        {/* Floating Theme Toggle */}
        <div className="absolute top-4 right-4">
          <button
            onClick={toggleTheme}
            className="p-2.5 bg-white dark:bg-[#0c0c14] border border-gray-200 dark:border-[#1e1e32] rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-gray-750" /> : <Sun className="w-4 h-4 text-yellow-400" />}
          </button>
        </div>
        {captainStatus === 'rejected' && (
          <div className="w-full max-w-lg bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-[2rem] flex items-start gap-4 shadow-lg shadow-red-500/5">
            <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-black text-sm uppercase tracking-wide">Rider Application Rejected</h4>
              <p className="text-xs text-red-400/80 mt-1 leading-relaxed">
                Unfortunately, your application was rejected by the admin team. Please verify your details, upload clear pictures, and submit again.
              </p>
            </div>
          </div>
        )}
        <CaptainOnboarding onComplete={handleOnboardingComplete} />
      </div>
    )
  }

  // 4. PENDING VERIFICATION REVIEW STATE
  if (captainStatus === 'pending_verification') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#070709] text-gray-900 dark:text-white flex flex-col items-center justify-center p-6 transition-colors duration-300 relative">
        {/* Floating Back Button */}
        <div className="absolute top-4 left-4">
          <Link
            to="/"
            className="p-2.5 bg-white dark:bg-[#0c0c14] border border-gray-200 dark:border-[#1e1e32] rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm flex items-center justify-center"
            title="Back to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
        {/* Floating Theme Toggle */}
        <div className="absolute top-4 right-4">
          <button
            onClick={toggleTheme}
            className="p-2.5 bg-white dark:bg-[#0c0c14] border border-gray-200 dark:border-[#1e1e32] rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-gray-750" /> : <Sun className="w-4 h-4 text-yellow-400" />}
          </button>
        </div>
        <div className="w-full max-w-md bg-white dark:bg-[#0c0c14] border border-gray-200 dark:border-[#1b1b30] rounded-2xl p-6 shadow-2xl space-y-6 text-center">
          <div className="inline-flex bg-[#FFCC00]/10 border border-[#FFCC00]/15 p-4 rounded-full text-[#FFCC00] animate-pulse">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Verification Under Review</h3>
            <p className="text-sm text-gray-700 dark:text-gray-400 max-w-[300px] mx-auto leading-relaxed">
              Our operations team is reviewing your Aadhar, driving license, and vehicle registration card.
            </p>
          </div>

          {/* Process flow indicator */}
          <div className="p-4 bg-gray-50 dark:bg-[#12121e] border border-gray-200 dark:border-[#1d1d33] rounded-xl text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#00FF66] flex items-center justify-center text-black font-bold text-xs">✓</div>
              <span className="text-xs text-gray-700 dark:text-gray-300 font-semibold">Documents Submitted</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full border border-[#FFCC00] flex items-center justify-center text-[#FFCC00] font-bold text-[10px] animate-pulse">●</span>
              <span className="text-xs text-gray-900 dark:text-white font-bold">Verification In Progress</span>
            </div>

            <div className="flex items-center gap-3 opacity-40">
              <span className="w-5 h-5 rounded-full border border-gray-600 flex items-center justify-center text-gray-500 font-bold text-xs">3</span>
              <span className="text-xs text-gray-600 dark:text-gray-400 font-semibold">App Access Granted</span>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Usually verified within 24 hours. Keep this tab open or return later.
          </p>

          <button
            onClick={() => fetchProfile()}
            className="w-full bg-gray-100 dark:bg-[#161626] border border-gray-200 dark:border-[#232338] hover:bg-gray-200 dark:hover:bg-[#1a1a2f] text-gray-800 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" /> Check Status
          </button>
        </div>
      </div>
    )
  }

  if (notificationPermission !== 'granted') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#070709] text-gray-900 dark:text-white flex flex-col items-center justify-center p-6 transition-colors duration-300 relative">
        {/* Floating Back Button */}
        <div className="absolute top-4 left-4">
          <Link
            to="/"
            className="p-2.5 bg-white dark:bg-[#0c0c14] border border-gray-200 dark:border-[#1e1e32] rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm flex items-center justify-center"
            title="Back to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
        {/* Floating Theme Toggle */}
        <div className="absolute top-4 right-4">
          <button
            onClick={toggleTheme}
            className="p-2.5 bg-white dark:bg-[#0c0c14] border border-gray-200 dark:border-[#1e1e32] rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-gray-750" /> : <Sun className="w-4 h-4 text-yellow-400" />}
          </button>
        </div>
        <div className="w-full max-w-md bg-white dark:bg-[#0c0c14] border border-gray-200 dark:border-[#1b1b30] rounded-3xl p-6 shadow-2xl space-y-6 text-center">
          <div className="relative inline-flex mb-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-ozo-red/20 animate-ping opacity-75" />
            <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-ozo-red to-rose-500 text-white rounded-full shadow-lg">
              <ShieldAlert className="w-8 h-8" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-gray-900 dark:text-white">Notification Access Required</h3>
            <p className="text-sm text-gray-700 dark:text-gray-400 max-w-[320px] mx-auto leading-relaxed">
              OZO Captain console requires push notifications to alert you of newly assigned delivery orders, customer messages, and live payouts.
            </p>
          </div>

          {notificationPermission === 'denied' ? (
            <div className="p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-left text-xs leading-relaxed space-y-2">
              <p className="font-bold uppercase tracking-wider text-red-350">How to restore notification permission:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-red-300/90">
                <li>Click the **Lock/Settings icon** 🔒 next to the website URL in your browser address bar.</li>
                <li>Toggle/Change the **Notifications** setting to **Allow**.</li>
                <li>The console will automatically unlock once permission is granted.</li>
              </ol>
            </div>
          ) : (
            <button
              onClick={async () => {
                const res = await promptOneSignalPush()
                setNotificationPermission(res)
              }}
              className="w-full py-3.5 px-4 text-white font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-teal-600 hover:to-emerald-500 active:scale-[0.98] transition-all rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              Enable Push Notifications
            </button>
          )}

          <p className="text-xs text-gray-500 font-medium">
            Duty status is locked offline until permission is granted.
          </p>
        </div>
      </div>
    )
  }

  // 6. RIDER DASHBOARD WORKSPACE (APPROVED / ACTIVE STATES)
  const statusConfig = {
    online: {
      bg: 'bg-emerald-50 dark:bg-[#00FF66]/10',
      border: 'border-emerald-200/60 dark:border-[#00FF66]/20',
      text: 'text-emerald-600 dark:text-[#00FF66]',
      dot: 'bg-emerald-500 dark:bg-[#00FF66]',
      label: 'On Duty'
    },
    busy: {
      bg: 'bg-amber-50/70 dark:bg-[#FF9900]/10',
      border: 'border-amber-200/50 dark:border-[#FF9900]/20',
      text: 'text-amber-600 dark:text-[#FF9900]',
      dot: 'bg-amber-500 dark:bg-[#FF9900]',
      label: 'Busy'
    },
    offline: {
      bg: 'bg-red-50 dark:bg-[#FF3366]/10',
      border: 'border-red-200/50 dark:border-[#FF3366]/20',
      text: 'text-red-600 dark:text-[#FF3366]',
      dot: 'bg-red-500 dark:bg-[#FF3366]',
      label: 'Off Duty'
    }
  }

  const currentStatus = captainStatus || 'offline'
  const config = statusConfig[currentStatus] || statusConfig.offline

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#070709] text-gray-900 dark:text-white flex flex-col font-sans transition-colors duration-300">
      {/* Mobile App Bar */}
      <header className="border-b border-gray-200/80 dark:border-white/5 bg-white/95 dark:bg-[#0c0c12]/95 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors text-gray-900 dark:text-white flex items-center justify-center" title="Back to Home">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="bg-gradient-to-tr from-[#00FF66] to-[#00CC52] p-2.5 rounded-2xl text-black shadow-sm">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-gray-900 dark:text-white">OZO Captain</h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-0.5">Rider Console</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2.5 border border-gray-200 dark:border-[#23233b] bg-white dark:bg-[#121220] hover:bg-gray-100 dark:hover:bg-[#1a1a2b] rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-gray-750" /> : <Sun className="w-4 h-4 text-yellow-400" />}
          </button>

          {/* Small Active Badge */}
          <div className={`flex items-center gap-1.5 ${config.bg} border ${config.border} px-3 py-1 rounded-full shadow-sm`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`}></span>
            <span className={`text-[10px] font-black uppercase ${config.text} tracking-wider`}>
              {config.label}
            </span>
          </div>
        </div>
      </header>

      {/* Main Tab Screen */}
      <main className="flex-1 flex flex-col overflow-hidden pb-24">
        {activeTab === 'radar' ? (
          <CaptainRadar />
        ) : (
          <CaptainProfile />
        )}
      </main>

      {/* App Bottom Navigation Bar */}
      <div className="fixed bottom-6 inset-x-0 z-40 px-6 w-full max-w-md mx-auto">
        <nav className="border border-gray-200/80 dark:border-[#1b1b30] bg-white/95 dark:bg-[#0c0c14]/95 backdrop-blur-lg px-8 py-3.5 flex justify-around rounded-[2rem] shadow-xl shadow-gray-250/20 dark:shadow-[#000]/60 transition-colors duration-300">
          <button
            onClick={() => setActiveTab('radar')}
            className={`flex flex-col items-center gap-1.5 transition-all ${
              activeTab === 'radar' 
                ? 'text-emerald-600 dark:text-[#00FF66] scale-105 font-bold' 
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-550 dark:hover:text-gray-300'
            }`}
          >
            <Compass className="w-5 h-5 stroke-[2.25]" />
            <span className="text-[10px] font-black uppercase tracking-wider">Order Radar</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1.5 transition-all ${
              activeTab === 'profile' 
                ? 'text-emerald-600 dark:text-[#00FF66] scale-105 font-bold' 
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-550 dark:hover:text-gray-300'
            }`}
          >
            <User className="w-5 h-5 stroke-[2.25]" />
            <span className="text-[10px] font-black uppercase tracking-wider">My Profile</span>
          </button>
        </nav>
      </div>
    </div>
  )
}

export default CaptainDashboard
