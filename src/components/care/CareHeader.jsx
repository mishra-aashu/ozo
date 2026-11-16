import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  MapPin, 
  ChevronDown, 
  Moon, 
  Sun, 
  User, 
  Calendar, 
  FileText, 
  Pill, 
  Stethoscope, 
  PhoneCall, 
  ShieldCheck, 
  Activity, 
  LogOut, 
  Menu, 
  X, 
  Clock, 
  Building2,
  Bell,
  Package,
  Settings,
  ShoppingBag,
  Store,
  Bike,
  Wrench
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useCareStore } from '../../stores/careStore'
import { useThemeStore } from '../../stores/themeStore'
import { useLocationStore } from '../../stores/locationStore'
import { useServiceModeStore } from '../../stores/serviceModeStore'
import { useNotificationStore } from '../../stores/notificationStore'
import VerticalDropdownHeader from '../VerticalDropdownHeader'
import OzoLogo from '../OzoLogo'
import UserAvatar from '../UserAvatar'
import toast from 'react-hot-toast'

export default function CareHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentMode } = useServiceModeStore()

  const { theme, toggleTheme } = useThemeStore()
  const { user, profile, isAuthenticated, signOut, isAdmin } = useAuthStore()
  const { 
    searchQuery, 
    setSearchQuery, 
    myAppointments, 
    fetchMyAppointments,
    themeConfig,
    fetchThemeConfig,
    applyThemeVariables
  } = useCareStore()

  const { address, addressDetails, nearestCity } = useLocationStore()
  const notifications = useNotificationStore(state => state.notifications)
  const unreadCount = notifications ? notifications.filter(n => !n.is_read).length : 0

  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)

  const profileRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    fetchThemeConfig()
    applyThemeVariables()
    const defaultPhone = user?.phone || user?.user_metadata?.phone || ''
    if (defaultPhone && fetchMyAppointments) {
      fetchMyAppointments(defaultPhone)
    }
  }, [user])

  // Close dropdowns on route changes
  useEffect(() => {
    setIsProfileOpen(false)
    setIsMobileMenuOpen(false)
    setIsSearchFocused(false)
  }, [location.pathname])

  // Close on outside clicks
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false)
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (location.pathname !== '/care') {
      navigate('/care')
    }
    setIsSearchFocused(false)
  }

  const handleQuickSpecialtyClick = (specialty) => {
    setSearchQuery(specialty)
    if (location.pathname !== '/care') {
      navigate('/care')
    }
    setIsSearchFocused(false)
  }

  const handleLogout = async () => {
    try {
      await signOut()
      toast.success('Logged out successfully')
      navigate('/care')
    } catch {
      toast.error('Failed to log out')
    }
  }

  const activeCityName = addressDetails?.city || nearestCity?.name || 'Aurangabad, Bihar'
  const activeTokensCount = myAppointments?.filter(a => a.status === 'booked' || a.status === 'in_consultation').length || 0

  const quickMedicalSuggestions = [
    { title: 'General Physician', query: 'General Physician', icon: '🩺' },
    { title: 'Dermatologist (Skin & Hair)', query: 'Dermatology', icon: '🧴' },
    { title: 'Pediatrician (Child Specialist)', query: 'Pediatrics', icon: '👶' },
    { title: 'Gynecologist & Women Health', query: 'Gynecology', icon: '🌸' },
    { title: 'Orthopedic (Bone & Joint)', query: 'Orthopedic', icon: '🦴' },
    { title: 'Order Medicines (30m Delivery)', query: 'Medicines', link: '/care/order-medicines', icon: '💊' }
  ]

  return (
    <>
      {/* Top Bar (Matches OzoMart top announcement bar) */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 text-white py-2 hidden md:block border-b border-emerald-900/40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Delivery in 30 minutes
              </span>
              <span>
                Free delivery on medicine orders above ₹199
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/offers" className="hover:underline text-emerald-100 hover:text-white transition-colors">Offers</Link>
              <Link to="/doctor" className="hover:underline text-emerald-100 hover:text-white transition-colors">Doctor Portal</Link>
              <Link to="/pharmacy" className="hover:underline text-emerald-100 hover:text-white transition-colors">Chemist Portal</Link>
              <Link to="/help" className="hover:underline text-emerald-100 hover:text-white transition-colors">Help</Link>
              <Link to="/help" className="hover:underline text-emerald-100 hover:text-white transition-colors">📞 Contact Us</Link>
            </div>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0c1015]/95 backdrop-blur-md border-b border-gray-200/90 dark:border-white/10 transition-colors py-3 md:py-4 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between gap-1.5 xs:gap-3 md:gap-4">
            
            {/* Logo + Switcher + Location Column (Matches OzoMart) */}
            <div className="flex items-center gap-1.5 md:gap-2.5 min-w-0 md:flex-shrink-0">
              {/* Desktop Logo & Segmented Switcher */}
              <div className="hidden lg:block">
                <VerticalDropdownHeader />
              </div>

              {/* Mobile Logo */}
              <div className="lg:hidden flex items-center gap-1.5 min-w-0">
                <Link to="/care" className="flex items-center gap-1.5 min-w-0 focus:outline-none" aria-label="Ozo Care">
                  <OzoLogo size="sm" verticalMode="care" />
                </Link>
              </div>

              {/* Location Selector (Desktop Only - Matches OzoMart 1:1) */}
              <button 
                onClick={() => {
                  navigate('/select-location', { state: { from: location.pathname + location.search } })
                }}
                aria-label="Select Delivery Location"
                className="hidden lg:flex items-center translate-y-[2.5px] lg:translate-y-0 gap-1 lg:gap-2 px-1.5 lg:px-3 py-1 lg:py-1.5 rounded-xl lg:rounded-2xl transition-all duration-300 border shadow-sm hover:shadow-md group max-w-[240px] lg:max-w-[280px] bg-gray-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border-gray-100 dark:border-white/5 hover:border-emerald-500/20 dark:hover:border-emerald-500/20 text-left"
              >
                <div className="w-5 h-5 xs:w-7 xs:h-7 lg:w-9 lg:h-9 rounded-md xs:rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all flex-shrink-0 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <MapPin className="w-2.5 h-2.5 xs:w-3.5 xs:h-3.5 lg:w-4 lg:h-4" />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[6px] xs:text-[8px] lg:text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-black leading-none mb-0.5">
                      Deliver to
                    </p>
                    <span className="text-[6px] xs:text-[8px] lg:text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-1 py-0.5 rounded leading-none uppercase tracking-wider">
                      Serviceable
                    </span>
                  </div>
                  <p className="text-[9px] xs:text-xs lg:text-sm font-black flex items-center gap-0.5 xs:gap-1 truncate text-gray-900 dark:text-white">
                    <span className="truncate">{activeCityName}</span>
                    <ChevronDown className="w-2.5 h-2.5 xs:w-3.5 xs:h-3.5 lg:w-3.5 lg:h-3.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                  </p>
                </div>
              </button>
            </div>

            {/* Central Search Bar (Matches OzoMart search bar design & dimensions) */}
            <form 
              ref={searchRef}
              onSubmit={handleSearchSubmit}
              className="flex-1 min-w-[200px] md:min-w-[240px] lg:min-w-[320px] max-w-md lg:max-w-xl relative hidden md:block"
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-0 group-focus-within:opacity-5 blur-xl transition-opacity duration-500 rounded-3xl pointer-events-none" />
                <button 
                  type="submit" 
                  aria-label="Search" 
                  className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center cursor-pointer"
                >
                  <Search className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder="Search doctors, clinics, symptoms ('fever', 'skin')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  className="w-full pl-14 pr-6 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[1.5rem] focus:bg-white dark:focus:bg-[#1a1a1a] focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-300 text-sm font-bold text-gray-800 dark:text-white placeholder:text-gray-400 shadow-sm focus:shadow-xl"
                />

                {/* Search Quick Suggestions Dropdown */}
                <AnimatePresence>
                  {isSearchFocused && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/5 p-4 z-50 text-left font-sans"
                    >
                      <span className="text-[10px] font-display font-black uppercase tracking-wider text-slate-400 block mb-2.5">
                        Popular Specialties & Care
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {quickMedicalSuggestions.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              if (item.link) {
                                navigate(item.link)
                                setIsSearchFocused(false)
                              } else {
                                handleQuickSpecialtyClick(item.query)
                              }
                            }}
                            className="p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-transparent hover:border-emerald-500/20 text-left flex items-center gap-2.5 transition-all text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            <span className="text-base">{item.icon}</span>
                            <span className="truncate">{item.title}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </form>

            {/* Desktop Actions (Matches OzoMart right action cluster: Profile, Theme, Divider, Icons) */}
            <div className="hidden md:flex items-center gap-1 md:gap-1.5 lg:gap-3 flex-shrink-0 relative">
              {/* Auth / User Profile */}
              {isAuthenticated ? (
                <div ref={profileRef} className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 p-1 md:pr-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all duration-300 cursor-pointer"
                  >
                    <UserAvatar 
                      profile={profile} 
                      user={user} 
                      className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold shadow-sm flex items-center justify-center text-sm uppercase"
                      imgClassName="w-full h-full object-cover"
                    />
                    <span className="hidden lg:block text-sm font-bold text-gray-800 dark:text-gray-200">
                      {profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'User'}
                    </span>
                    <ChevronDown 
                      className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${
                        isProfileOpen ? 'rotate-180' : ''
                      }`} 
                    />
                  </button>

                  {/* Profile Dropdown */}
                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        className="absolute right-0 top-full mt-3 w-80 bg-white dark:bg-[#15171c] rounded-2xl shadow-2xl border border-gray-200/80 dark:border-white/10 overflow-hidden z-50 text-left font-sans"
                      >
                        {/* User Header */}
                        <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-gray-50 dark:from-white/[0.04] dark:to-white/[0.02] border-b border-gray-100 dark:border-white/5">
                          <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar 
                              profile={profile} 
                              user={user} 
                              className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold shadow-sm flex items-center justify-center text-sm uppercase flex-shrink-0"
                              imgClassName="w-full h-full object-cover"
                            />
                            <div className="min-w-0">
                              <p className="font-black text-gray-900 dark:text-white leading-tight truncate text-sm">
                                {profile?.full_name || user?.user_metadata?.full_name || 'Patient Account'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate mt-0.5">
                                {user?.email || user?.phone}
                              </p>
                            </div>
                          </div>
                          <Link
                            to="/profile"
                            onClick={() => setIsProfileOpen(false)}
                            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-2.5 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors flex-shrink-0"
                          >
                            Profile
                          </Link>
                        </div>

                        {/* Quick Links */}
                        <div className="p-2 space-y-1">
                          <Link
                            to="/care/my-appointments"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-emerald-50/60 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 hover:text-emerald-600 transition-colors text-xs font-semibold"
                          >
                            <div className="flex items-center gap-2.5">
                              <Calendar size={16} className="text-emerald-500" />
                              <span>My Tokens & Appointments</span>
                            </div>
                            {activeTokensCount > 0 && (
                              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                                {activeTokensCount}
                              </span>
                            )}
                          </Link>

                          <Link
                            to="/care/order-medicines"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-emerald-50/60 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 hover:text-emerald-600 transition-colors text-xs font-semibold"
                          >
                            <Pill size={16} className="text-teal-500" />
                            <span>Prescriptions & Medicines</span>
                          </Link>

                          <Link
                            to="/doctor"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-emerald-50/60 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 hover:text-emerald-600 transition-colors text-xs font-semibold"
                          >
                            <div className="flex items-center gap-2.5">
                              <Stethoscope size={16} className="text-sky-500" />
                              <span>Doctor Consultation Portal</span>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500">
                              OPD
                            </span>
                          </Link>

                          <Link
                            to="/pharmacy"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-emerald-50/60 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 hover:text-emerald-600 transition-colors text-xs font-semibold"
                          >
                            <div className="flex items-center gap-2.5">
                              <Building2 size={16} className="text-amber-500" />
                              <span>Chemist Pharmacy Portal</span>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
                              Form 20/21
                            </span>
                          </Link>
                        </div>

                        {/* Bottom Actions */}
                        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-white/[0.02] flex items-center justify-between">
                          <Link 
                            to="/help" 
                            onClick={() => setIsProfileOpen(false)}
                            className="text-xs text-gray-500 dark:text-gray-400 font-medium hover:text-emerald-600 transition-colors"
                          >
                            Need help? Support
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl transition-all font-bold text-xs cursor-pointer"
                          >
                            <LogOut size={14} />
                            <span>Logout</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl shadow-md hover:brightness-105 transition-all font-bold text-sm cursor-pointer"
                >
                  <User size={18} />
                  <span>Login</span>
                </Link>
              )}

              {/* Theme Toggle (Matches OzoMart) */}
              <div className="relative group">
                <button
                  onClick={toggleTheme}
                  className="p-1.5 md:p-2 lg:p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center cursor-pointer"
                  aria-label="Toggle Theme"
                >
                  <AnimatePresence mode="wait">
                    {theme === 'light' ? (
                      <motion.div
                        key="moon"
                        initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Moon size={20} strokeWidth={2.5} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="sun"
                        initial={{ opacity: 0, rotate: 90, scale: 0.8 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Sun size={20} strokeWidth={2.5} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </div>

              {/* Vertical Divider (Matches OzoMart) */}
              <div className="h-8 w-px bg-gray-200 dark:bg-white/10 mx-1 hidden md:block" />

              {/* Action 1: Appointments & Tokens (Matches Wishlist Icon in OzoMart) */}
              <Link
                to="/care/my-appointments"
                aria-label="My Appointments & Tokens"
                className="relative p-1.5 md:p-2 lg:p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 group cursor-pointer"
                title="My Appointments & Tokens"
              >
                <Calendar size={24} strokeWidth={2} className="group-hover:scale-110 transition-transform" />
                {activeTokensCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-emerald-600 text-white text-[10px] rounded-full flex items-center justify-center font-black shadow-md border-2 border-white dark:border-[#1C1C1C]">
                    {activeTokensCount}
                  </span>
                )}
              </Link>

              {/* Action 2: Notifications (Matches Bell in OzoMart) */}
              {isAuthenticated && (
                <Link
                  to="/notifications"
                  aria-label="Notifications"
                  className="relative p-1.5 md:p-2 lg:p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 group cursor-pointer"
                  title="Notifications"
                >
                  <Bell size={24} strokeWidth={2} className="group-hover:scale-110 transition-transform" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-emerald-600 text-white text-[10px] rounded-full flex items-center justify-center font-black shadow-md border-2 border-white dark:border-[#1C1C1C]">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Action 3: Medicines & Prescriptions (Matches Cart Icon in OzoMart) */}
              <Link
                to="/care/order-medicines"
                aria-label="Medicines (30m Delivery)"
                className="relative p-1.5 md:p-2 lg:p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-300 group cursor-pointer"
                title="Order Medicines (30m Delivery)"
              >
                <Pill size={24} strokeWidth={2} className="group-hover:scale-110 transition-transform" />
              </Link>
            </div>

            {/* Mobile Actions (Mobile view) */}
            <div className="flex items-center gap-1.5 md:hidden">
              <button
                onClick={toggleTheme}
                aria-label="Toggle Theme"
                className="p-1.5 xs:p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
              >
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              <Link
                to="/care/my-appointments"
                aria-label="My Tokens"
                className="relative p-1.5 xs:p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
              >
                <Calendar size={17} />
                {activeTokensCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-600 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                    {activeTokensCount}
                  </span>
                )}
              </Link>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                className="p-1.5 xs:p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 active:scale-95 transition-all"
              >
                {isMobileMenuOpen ? <X size={20} className="text-emerald-500" /> : <Menu size={20} />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile/Tablet Rows (Location & Vertical Switcher & Search) */}
        <div className="mt-2.5 px-3 xs:px-4 sm:px-6 lg:hidden space-y-2">
          {/* Row 2: Segmented Switcher Capsule */}
          <div className="w-full">
            <VerticalDropdownHeader fullWidth showLogo={false} />
          </div>

          {/* Row 3: Healthcare Location Selector */}
          <button 
            onClick={() => {
              navigate('/select-location', { state: { from: location.pathname + location.search } })
            }}
            aria-label="Select Delivery Location"
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-2xl transition-all duration-300 border shadow-sm hover:shadow-md group bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border-slate-200/80 dark:border-white/10 text-left"
          >
            <div className="w-7 h-7 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all flex-shrink-0 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[8px] uppercase tracking-widest text-slate-400 font-black leading-none mb-0.5">
                  Deliver to
                </p>
                <span className="text-[7px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-1 py-0.5 rounded leading-none uppercase tracking-wider">
                  Serviceable
                </span>
              </div>
              <p className="text-xs font-display font-black truncate text-slate-900 dark:text-white flex items-center gap-1">
                <span>{activeCityName}</span>
                <ChevronDown size={11} className="text-emerald-600" />
              </p>
            </div>
          </button>

          {/* Row 4: Mobile Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search doctors, clinics, symptoms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
            />
          </form>
        </div>

        {/* Mobile Slide-down Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden border-t border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0c1015] px-4 py-4 space-y-4 text-left font-sans"
            >
              {isAuthenticated ? (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <UserAvatar 
                    profile={profile} 
                    user={user} 
                    className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold shadow-sm flex items-center justify-center text-sm uppercase flex-shrink-0"
                    imgClassName="w-full h-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-black text-sm text-slate-900 dark:text-white truncate">
                      {profile?.full_name || user?.user_metadata?.full_name || 'Patient'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {user?.phone || user?.email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 px-2 py-1"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-display font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-900/20"
                >
                  <User size={15} />
                  <span>Login / Register as Patient</span>
                </Link>
              )}

              <div className="space-y-1 text-xs font-semibold">
                <Link
                  to="/care"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200"
                >
                  <div className="flex items-center gap-2.5">
                    <Stethoscope size={15} className="text-emerald-500" />
                    <span>Find & Book Doctors</span>
                  </div>
                </Link>

                <Link
                  to="/care/order-medicines"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200"
                >
                  <div className="flex items-center gap-2.5">
                    <Pill size={15} className="text-teal-500" />
                    <span>Order Medicines (30m Delivery)</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    Chemist
                  </span>
                </Link>

                <Link
                  to="/care/my-appointments"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200"
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar size={15} className="text-emerald-500" />
                    <span>My Tokens & Appointments</span>
                  </div>
                  {activeTokensCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                      {activeTokensCount} Active
                    </span>
                  )}
                </Link>

                <Link
                  to="/doctor"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200"
                >
                  <div className="flex items-center gap-2.5">
                    <Stethoscope size={15} className="text-sky-500" />
                    <span>Doctor Consultation Workstation</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500">
                    OPD
                  </span>
                </Link>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    setShowEmergencyModal(true)
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold text-rose-600 dark:text-rose-400"
                >
                  <Activity size={15} className="animate-pulse" />
                  <span>24x7 Emergency Assistance</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Emergency Assistance Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 font-sans text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center">
              <Activity size={28} className="animate-pulse" />
            </div>

            <h3 className="font-display font-black text-xl text-slate-900 dark:text-white">
              Emergency Medical Assistance
            </h3>

            <p className="text-xs text-slate-500 leading-relaxed">
              If you or someone around you is facing a critical emergency, please dial the national medical emergency response numbers or visit the nearest hospital casualty immediately.
            </p>

            <div className="space-y-2 pt-2">
              <a
                href="tel:108"
                className="w-full py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-display font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950/20"
              >
                <PhoneCall size={16} />
                <span>Call Emergency Ambulance (108)</span>
              </a>

              <a
                href="tel:112"
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-2"
              >
                <span>National Emergency Helpline (112)</span>
              </a>
            </div>

            <button
              onClick={() => setShowEmergencyModal(false)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold pt-2 cursor-pointer"
            >
              Close Notice
            </button>
          </div>
        </div>
      )}
    </>
  )
}
