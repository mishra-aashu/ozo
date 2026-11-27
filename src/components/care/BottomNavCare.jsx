import React, { useState, useEffect } from 'react'
import { NavLink, useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Stethoscope, 
  Pill, 
  Calendar, 
  Activity, 
  User, 
  ChevronRight,
  PhoneCall,
  Clock,
  ShieldCheck,
  X
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useCareStore } from '../../stores/careStore'
import { useLocationStore } from '../../stores/locationStore'
import { prefetchRoute } from '../../utils/routePrefetch'
import { isAppointmentActive, isAppointmentToday } from '../../utils/careAppointmentUtils'

export default function BottomNavCare() {
  const location = useLocation()
  const { isAuthenticated, user } = useAuthStore()
  const { myAppointments } = useCareStore()
  const { addressDetails, nearestCity } = useLocationStore()
  const activeCityName = addressDetails?.city || nearestCity?.name || 'Aurangabad'
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [, setTick] = useState(0)
  const [dismissedTokens, setDismissedTokens] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('ozo_dismissed_token_banners') || '[]')
    } catch {
      return []
    }
  })

  // Periodically check every 30s so banner auto-hides as soon as slot or time is over
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1)
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  const handleDismissTokenBanner = (e, appointmentId) => {
    e.preventDefault()
    e.stopPropagation()
    if (!appointmentId) return
    setDismissedTokens(prev => {
      if (prev.includes(appointmentId)) return prev
      const next = [...prev, appointmentId]
      try {
        sessionStorage.setItem('ozo_dismissed_token_banners', JSON.stringify(next))
      } catch {}
      return next
    })
  }

  // Active appointments: strictly filter out any appointments whose slot or date is over
  const activeAppointments = myAppointments?.filter(isAppointmentActive) || []
  const activeTokensCount = activeAppointments.length

  // For the banner, prioritize today's active live token
  const todayActive = activeAppointments.find(isAppointmentToday)
  const latestActiveAppointment = todayActive || activeAppointments[0] || null

  const isCurrentPath = (path) => {
    const current = location.pathname
    if (path === '/care') {
      return current === '/care' || current.startsWith('/care/doctor') || current.startsWith('/care/book')
    }
    if (path === '/care/order-medicines') {
      return current.startsWith('/care/order-medicines')
    }
    if (path === '/care/my-appointments') {
      return current.startsWith('/care/my-appointments')
    }
    if (path === '/profile' || path === '/auth') {
      return current.startsWith('/profile') || current.startsWith('/auth')
    }
    return current === path
  }

  const isDismissed = latestActiveAppointment && dismissedTokens.includes(latestActiveAppointment.id)

  const shouldShowTokenBanner = latestActiveAppointment && 
    !isDismissed &&
    !location.pathname.startsWith('/care/my-appointments') &&
    !location.pathname.startsWith('/care/book-appointment')

  const navItems = [
    {
      id: 'doctors',
      label: 'Doctors',
      path: '/care',
      icon: Stethoscope,
      activeColor: 'text-emerald-600 dark:text-emerald-400',
      activeGlow: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    },
    {
      id: 'medicines',
      label: 'Medicines',
      path: '/care/order-medicines',
      icon: Pill,
      activeColor: 'text-teal-600 dark:text-teal-400',
      activeGlow: 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
    },
    {
      id: 'tokens',
      label: 'Tokens',
      path: '/care/my-appointments',
      icon: Calendar,
      badge: activeTokensCount,
      activeColor: 'text-emerald-600 dark:text-emerald-400',
      activeGlow: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    },
    {
      id: 'emergency',
      label: '24x7 Help',
      action: () => setShowEmergencyModal(true),
      icon: Activity,
      isEmergency: true
    },
    {
      id: 'profile',
      label: isAuthenticated ? 'Profile' : 'Login',
      path: isAuthenticated ? '/profile' : '/auth',
      icon: User,
      activeColor: 'text-emerald-600 dark:text-emerald-400',
      activeGlow: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    }
  ]

  return (
    <>
      {/* Floating Active OPD Token Notification Banner */}
      <AnimatePresence>
        {shouldShowTokenBanner && (
          <motion.div
            key="care-token-banner"
            initial={{ opacity: 0, y: 30, scale: 0.95, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 30, scale: 0.95, x: '-50%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-[calc(84px+env(safe-area-inset-bottom,0px))] left-1/2 w-max max-w-[calc(100%-1.5rem)] z-50 select-none"
          >
            <Link
              to="/care/my-appointments"
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-slate-900/95 dark:bg-[#121820]/95 text-white backdrop-blur-md shadow-2xl border border-emerald-500/40 hover:border-emerald-500 transition-all group"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-display font-black text-xs shrink-0 shadow-sm animate-pulse">
                #{latestActiveAppointment.token_number || '1'}
              </div>

              <div className="text-left pr-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <p className="text-[11px] font-display font-black leading-tight text-white truncate">
                    Live Token Confirmed
                  </p>
                </div>
                <p className="text-[10px] text-slate-300 font-sans truncate max-w-[190px]">
                  {latestActiveAppointment.time_slot || 'In Clinic Queue'}
                </p>
              </div>

              <div className="w-6 h-6 rounded-full bg-white/10 group-hover:bg-emerald-500 transition-colors flex items-center justify-center shrink-0">
                <ChevronRight size={13} className="text-white" />
              </div>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Bottom Navigation Bar */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden backdrop-blur-md bg-white/95 dark:bg-[#0c1015]/95 border-t border-slate-200/90 dark:border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] transition-colors duration-200 select-none"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-16 px-1">
          {navItems.map((item) => {
            if (item.action) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  className="flex flex-col items-center justify-center py-1.5 px-2.5 outline-none transition-all duration-150 text-rose-500 dark:text-rose-400 group"
                  aria-label={item.label}
                >
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className="relative flex flex-col items-center justify-center gap-0.5"
                  >
                    <div className="w-8 h-8 rounded-full bg-rose-500/10 group-hover:bg-rose-500/20 flex items-center justify-center transition-colors">
                      <item.icon size={16} className="animate-pulse" />
                    </div>
                    <span className="text-[9.5px] font-display font-black leading-tight tracking-tight">
                      {item.label}
                    </span>
                  </motion.div>
                </button>
              )
            }

            const active = isCurrentPath(item.path)
            const Icon = item.icon

            return (
              <NavLink
                key={item.id}
                to={item.path}
                onMouseEnter={() => prefetchRoute(item.path)}
                onTouchStart={() => prefetchRoute(item.path)}
                className={`flex flex-col items-center justify-center py-1.5 px-2.5 outline-none transition-all duration-150 ${
                  active 
                    ? item.activeColor 
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="relative flex flex-col items-center justify-center gap-0.5"
                >
                  <div className={`relative p-1 rounded-xl transition-all ${active ? item.activeGlow : ''}`}>
                    <Icon size={19} strokeWidth={active ? 2.5 : 2} />

                    {/* Active tokens count badge */}
                    {item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-emerald-600 text-white font-display font-black text-[9px] flex items-center justify-center shadow-sm animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <span className={`text-[9.5px] font-display leading-tight tracking-tight ${
                    active ? 'font-black' : 'font-medium'
                  }`}>
                    {item.label}
                  </span>

                  {/* Active Indicator Underline Dot */}
                  {active && (
                    <motion.span
                      layoutId="activeCareBottomTab"
                      className="w-1.5 h-1 rounded-full bg-emerald-500 mt-0.5"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </motion.div>
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Emergency Assistance Modal (Shared for mobile) */}
      <AnimatePresence>
        {showEmergencyModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-[#121820] rounded-3xl max-w-sm w-full border border-slate-200 dark:border-white/10 shadow-2xl p-6 text-center font-sans space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-display font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                  <Activity size={13} className="animate-pulse" />
                  24x7 Emergency Help
                </span>
                <button
                  onClick={() => setShowEmergencyModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center shadow-inner">
                <PhoneCall size={26} className="animate-pulse" />
              </div>

              <div>
                <h3 className="font-display font-black text-lg text-slate-900 dark:text-white">
                  Immediate Emergency Dial
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  For critical emergencies, accidents, or urgent medical transport in {activeCityName}:
                </p>
              </div>

              <div className="space-y-2 pt-1 font-display">
                <a
                  href="tel:108"
                  className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/20 active:scale-95 transition-all"
                >
                  <PhoneCall size={16} />
                  <span>Call Govt Ambulance (108)</span>
                </a>

                <a
                  href="tel:112"
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <span>National Emergency (112)</span>
                </a>
              </div>

              <button
                type="button"
                onClick={() => setShowEmergencyModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold pt-1"
              >
                Close Emergency Notice
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
