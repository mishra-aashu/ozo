import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, AlertTriangle, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { promptOneSignalPush } from '../utils/onesignal'

export default function NotificationPromptModal() {
  const { user, profile } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [permissionState, setPermissionState] = useState('default') // 'default', 'granted', 'denied'

  const isMartOperator = profile?.role === 'mart_operator'

  const checkPermission = () => {
    if (!('Notification' in window)) return

    const currentPermission = Notification.permission
    
    // Respect user dismissal for non-operators to avoid locking them out
    const isDismissed = sessionStorage.getItem('ozo_notification_prompt_dismissed') === 'true'
    const targetOpen = !!(user && currentPermission !== 'granted' && (!isDismissed || isMartOperator))

    setPermissionState(prev => prev !== currentPermission ? currentPermission : prev)
    setIsOpen(prev => prev !== targetOpen ? targetOpen : prev)
  }

  const handleDismiss = () => {
    sessionStorage.setItem('ozo_notification_prompt_dismissed', 'true')
    setIsOpen(false)
  }

  useEffect(() => {
    checkPermission()

    // Recheck when window is refocused (typically when returning from browser settings)
    window.addEventListener('focus', checkPermission)
    return () => window.removeEventListener('focus', checkPermission)
  }, [user])

  // Listen to browser permission state changes if supported
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'notifications' }).then((permissionStatus) => {
        permissionStatus.onchange = () => {
          checkPermission()
        }
      }).catch(err => console.log('Permissions API query not supported:', err))
    }
  }, [])

  const handleRequestPermission = async () => {
    try {
      // Trigger OneSignal push registration which invokes browser prompt
      await promptOneSignalPush()
      // Immediately check again
      setTimeout(checkPermission, 1000)
    } catch (err) {
      console.error('[OneSignal] Permission request failed:', err)
      checkPermission()
    }
  }

  if (!isOpen || !user) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md overflow-hidden bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl z-10"
        >
          {/* Content */}
          <div className="flex flex-col items-center text-center">
            {permissionState === 'denied' ? (
              <>
                {/* Warning/Alert Icon */}
                <div className="relative mb-5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500/20 animate-ping opacity-75" />
                  <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-full shadow-lg">
                    <AlertTriangle size={28} />
                  </div>
                </div>

                <h3 className="text-xl font-black text-zinc-900 dark:text-white leading-snug">
                  Notifications Blocked!
                </h3>
                
                {isMartOperator ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-3 max-w-xs leading-relaxed">
                    Mart Dashboard operates on real-time sound chimes and alerts. 
                    <strong className="block text-red-500 mt-1">You cannot receive or process orders unless notifications are allowed.</strong>
                  </p>
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-3 max-w-xs leading-relaxed">
                    We need notification permissions to send you live delivery tracking updates and order receipts.
                  </p>
                )}

                <div className="w-full bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 mt-5 text-left text-xs text-amber-700 dark:text-amber-400">
                  <span className="font-extrabold uppercase block mb-1">How to enable:</span>
                  <ol className="list-decimal list-inside space-y-1 font-medium">
                    <li>Click the <strong className="font-bold">lock/settings icon</strong> 🔒 next to the website URL in your address bar.</li>
                    <li>Toggle <strong className="font-bold">Notifications</strong> to <strong className="font-bold text-green-600 dark:text-green-400">"Allow"</strong>.</li>
                    <li>Reload the page or click "Check Status" below.</li>
                  </ol>
                </div>

                <button
                  onClick={checkPermission}
                  className="w-full mt-6 py-3 px-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-black text-xs uppercase tracking-wider transition-all rounded-xl shadow-md flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} />
                  Check Permission Status
                </button>

                {!isMartOperator && (
                  <button
                    onClick={handleDismiss}
                    className="w-full mt-2.5 py-3 px-4 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-black text-xs uppercase tracking-wider transition-all rounded-xl border border-zinc-200 dark:border-zinc-800"
                  >
                    Skip for now
                  </button>
                )}
              </>
            ) : (
              <>
                {/* Pulsing Bell Icon Wrapper */}
                <div className="relative mb-5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-ozo-red/20 animate-ping opacity-75" />
                  <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-ozo-red to-rose-500 text-white rounded-full shadow-lg">
                    <Bell size={28} className="animate-[wiggle_1s_ease-in-out_infinite]" />
                  </div>
                </div>

                <h3 className="text-xl font-black text-zinc-900 dark:text-white leading-snug">
                  {isMartOperator ? 'Enable Mart Notifications' : 'Enable Live Order Updates'}
                </h3>
                
                {isMartOperator ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-3 max-w-xs leading-relaxed">
                    To receive incoming orders and run the audio alert system, notification permissions are <strong className="text-ozo-red font-bold">mandatory</strong>.
                  </p>
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-3 max-w-xs leading-relaxed">
                    Stay updated with real-time delivery tracking, rider details, and status updates for your orders.
                  </p>
                )}

                <div className="flex flex-col w-full gap-2.5 mt-6">
                  <button
                    onClick={handleRequestPermission}
                    className="w-full py-3 px-4 text-white font-black text-xs uppercase tracking-wider bg-gradient-to-r from-ozo-red to-rose-600 hover:from-rose-600 hover:to-ozo-red active:scale-[0.98] transition-all rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ozo-red/50"
                  >
                    Allow Notifications
                  </button>
                  {!isMartOperator && (
                    <button
                      onClick={handleDismiss}
                      className="w-full py-3 px-4 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-black text-xs uppercase tracking-wider transition-all rounded-xl border border-zinc-200 dark:border-zinc-800"
                    >
                      Maybe Later
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
