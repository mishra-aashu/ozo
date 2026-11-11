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
  AlertCircle,
  Sparkles,
  ClipboardList
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useCareStore } from '../../stores/careStore'
import { useThemeStore } from '../../stores/themeStore'
import { useLocationStore } from '../../stores/locationStore'
import { useServiceModeStore } from '../../stores/serviceModeStore'
import VerticalDropdownHeader from '../VerticalDropdownHeader'
import toast from 'react-hot-toast'

export default function CareHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentMode } = useServiceModeStore()

  const { theme, toggleTheme } = useThemeStore()
  const { user, profile, isAuthenticated, signOut } = useAuthStore()
  const { 
    searchQuery, 
    setSearchQuery, 
    myAppointments, 
    themeConfig,
    fetchThemeConfig,
    applyThemeVariables
  } = useCareStore()

  const { address, addressDetails, nearestCity } = useLocationStore()

  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)

  const profileRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    fetchThemeConfig()
    applyThemeVariables()
  }, [])

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

  const activeCityName = addressDetails?.city || nearestCity?.name || 'Patna'
  const activeTokensCount = myAppointments?.filter(a => a.status === 'booked' || a.status === 'in_consultation').length || 0

  const quickMedicalSuggestions = [
    { title: 'General Physician', query: 'General Physician', icon: '🩺' },
    { title: 'Dermatologist (Skin)', query: 'Dermatology', icon: '🧴' },
    { title: 'Pediatrician (Kids)', query: 'Pediatrics', icon: '👶' },
    { title: 'Gynecologist', query: 'Gynecology', icon: '🌸' },
    { title: 'Orthopedic (Joints)', query: 'Orthopedic', icon: '🦴' },
    { title: 'Order Medicines (30m)', query: 'Medicines', link: '/care/order-medicines', icon: '💊' }
  ]

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0c1015]/95 backdrop-blur-md border-b border-gray-200/90 dark:border-white/10 transition-colors">
        
        {/* Top Mini Trust Bar (Desktop only) */}
        <div className="hidden lg:block bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-950 text-emerald-200 text-[11px] font-sans py-1 border-b border-emerald-900/40">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <ShieldCheck size={13} className="text-emerald-400" />
                NMC Verified Doctors & Form 20/21 Licensed Pharmacy Network
              </span>
              <span className="text-emerald-800">•</span>
              <span className="text-slate-300">
                Zero Upfront OPD Booking Fee • Pay at Clinic Counter
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowEmergencyModal(true)}
                className="flex items-center gap-1.5 text-rose-300 hover:text-rose-200 font-bold transition-colors"
              >
                <Activity size={12} className="animate-pulse text-rose-400" />
                <span>24x7 Emergency Help</span>
              </button>

              <span className="text-emerald-800">•</span>

              <Link to="/doctor-portal" className="hover:text-white transition-colors">
                Doctor Portal
              </Link>
              <Link to="/pharmacy-portal" className="hover:text-white transition-colors">
                Pharmacy Portal
              </Link>
            </div>
          </div>
        </div>

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3 sm:gap-4">
          
          {/* LEFT: VERTICAL SWITCHER & LOGO */}
          <div className="flex items-center gap-3 shrink-0">
            <VerticalDropdownHeader />
          </div>

          {/* MIDDLE-LEFT: CLINIC & PHARMACY DELIVERY LOCATION (Desktop only) */}
          <button
            onClick={() => navigate('/select-location', { state: { from: location.pathname } })}
            className="hidden xl:flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 bg-slate-50 dark:bg-slate-900/60 transition-all text-left group shrink-0"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <MapPin size={15} />
            </div>
            <div className="min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold leading-none">
                  Consult & Deliver in
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 leading-tight">
                  Serviceable
                </span>
              </div>
              <p className="text-xs font-display font-black text-slate-900 dark:text-white truncate flex items-center gap-1 mt-0.5">
                <span>{activeCityName}, BIHAR</span>
                <ChevronDown size={12} className="text-slate-400" />
              </p>
            </div>
          </button>

          {/* MIDDLE: HEALTHCARE SEARCH BAR (Desktop) */}
          <div ref={searchRef} className="relative flex-1 max-w-lg hidden md:block">
            <form onSubmit={handleSearchSubmit} className="relative group">
              <Search 
                size={16} 
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" 
              />
              <input
                type="text"
                placeholder="Search doctors, specialties, clinics, medicines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-slate-50 dark:bg-[#121820] border border-slate-200 dark:border-white/10 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-inner"
              />
            </form>

            {/* Quick Suggestions Dropdown */}
            <AnimatePresence>
              {isSearchFocused && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#121820] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl p-4 z-50 text-left font-sans"
                >
                  <span className="text-[10px] font-display font-black uppercase tracking-wider text-slate-400 block mb-2">
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
                        className="p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-transparent hover:border-emerald-500/20 text-left flex items-center gap-2.5 transition-all text-xs font-semibold text-slate-700 dark:text-slate-200"
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

          {/* RIGHT: HEALTHCARE NAVIGATION & ACTIONS */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Quick Nav Links (Desktop) */}
            <div className="hidden lg:flex items-center gap-1">
              <Link
                to="/care"
                className={`px-3 py-2 rounded-xl text-xs font-display font-bold transition-all ${
                  location.pathname === '/care'
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                Doctors
              </Link>

              <Link
                to="/care/order-medicines"
                className={`px-3 py-2 rounded-xl text-xs font-display font-bold transition-all flex items-center gap-1.5 ${
                  location.pathname === '/care/order-medicines'
                    ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <Pill size={14} className="text-teal-500" />
                <span>Medicines</span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  30m
                </span>
              </Link>
            </div>

            {/* My Tokens & Appointments Button (Replaces Shopping Cart!) */}
            <Link
              to="/care/my-appointments"
              className="relative p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all flex items-center gap-2"
              title="My Appointments & Active Tokens"
            >
              <Calendar size={18} className="text-emerald-500" />
              <span className="hidden sm:inline text-xs font-display font-bold">
                My Tokens
              </span>
              {activeTokensCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-display font-black text-[10px] flex items-center justify-center animate-pulse">
                  {activeTokensCount}
                </span>
              )}
            </Link>

            {/* Theme Switcher */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* User Profile / Login Dropdown */}
            <div ref={profileRef} className="relative">
              {isAuthenticated ? (
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50 dark:bg-slate-900/60 transition-all"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 text-white font-display font-bold text-xs flex items-center justify-center">
                    {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'P'}
                  </div>
                  <span className="hidden md:inline text-xs font-display font-bold text-slate-800 dark:text-white truncate max-w-[100px]">
                    {user?.user_metadata?.full_name || 'Patient'}
                  </span>
                  <ChevronDown size={13} className="text-slate-400 hidden sm:inline" />
                </button>
              ) : (
                <Link
                  to="/auth"
                  style={{
                    backgroundColor: themeConfig?.primary || '#059669',
                    boxShadow: `0 4px 14px ${themeConfig?.primary_glow || 'rgba(5, 150, 105, 0.3)'}`
                  }}
                  className="px-4 py-2 rounded-xl text-white font-display font-bold text-xs flex items-center gap-1.5 transition-all hover:brightness-110 active:scale-95 shadow-md"
                >
                  <User size={14} />
                  <span>Login</span>
                </Link>
              )}

              {/* Profile Dropdown Menu */}
              <AnimatePresence>
                {isProfileOpen && isAuthenticated && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#121820] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-2 z-50 text-left font-sans text-xs"
                  >
                    <div className="p-3 border-b border-slate-100 dark:border-white/5 space-y-0.5">
                      <p className="font-display font-black text-slate-900 dark:text-white text-sm truncate">
                        {user?.user_metadata?.full_name || 'Patient Profile'}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {user?.phone || user?.email}
                      </p>
                    </div>

                    <div className="py-1 space-y-0.5">
                      <Link
                        to="/care/my-appointments"
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 font-semibold text-slate-700 dark:text-slate-300"
                      >
                        <Calendar size={15} className="text-emerald-500" />
                        <span>My OPD Tokens & Queue</span>
                      </Link>

                      <Link
                        to="/care/order-medicines"
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 font-semibold text-slate-700 dark:text-slate-300"
                      >
                        <Pill size={15} className="text-teal-500" />
                        <span>Prescriptions & Medicine Orders</span>
                      </Link>

                      <Link
                        to="/doctor-portal"
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 font-semibold text-slate-700 dark:text-slate-300"
                      >
                        <Stethoscope size={15} className="text-sky-500" />
                        <span>Doctor Consultation Portal</span>
                      </Link>

                      <Link
                        to="/pharmacy-portal"
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 font-semibold text-slate-700 dark:text-slate-300"
                      >
                        <Building2 size={15} className="text-amber-500" />
                        <span>Local Chemist Pharmacy Portal</span>
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-slate-100 dark:border-white/5">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold transition-colors"
                      >
                        <LogOut size={14} />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl border border-slate-200 dark:border-white/10 md:hidden text-slate-700 dark:text-slate-300"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Search Row (Mobile Only) */}
        <div className="md:hidden px-4 pb-3 pt-1">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search doctors, clinics, medicines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-[#121820] border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </form>
        </div>

        {/* Mobile Slide-Over Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#121820] px-4 py-4 space-y-3 font-sans text-xs overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/care"
                  className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-display font-bold flex items-center gap-2"
                >
                  <Stethoscope size={16} />
                  <span>Find Doctors</span>
                </Link>

                <Link
                  to="/care/order-medicines"
                  className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-display font-bold flex items-center gap-2"
                >
                  <Pill size={16} />
                  <span>Order Medicines</span>
                </Link>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-white/5">
                <Link
                  to="/care/my-appointments"
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 font-semibold text-slate-700 dark:text-slate-300"
                >
                  <span className="flex items-center gap-2">
                    <Calendar size={15} className="text-emerald-500" />
                    <span>My Consultation Tokens</span>
                  </span>
                  {activeTokensCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                      {activeTokensCount} Active
                    </span>
                  )}
                </Link>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    setShowEmergencyModal(true)
                  }}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold text-rose-600 dark:text-rose-400"
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
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold pt-2"
            >
              Close Notice
            </button>
          </div>
        </div>
      )}
    </>
  )
}
