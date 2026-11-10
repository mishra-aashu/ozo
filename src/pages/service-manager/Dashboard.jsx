import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  BellOff, 
  RefreshCw, 
  Wrench, 
  Clock, 
  AlertTriangle,
  ArrowLeft,
  Sun,
  Moon,
  Users,
  Layers,
  Package,
  FileText,
  DollarSign,
  Building2,
  Power,
  Menu,
  X,
  ChevronRight,
  Home,
  MapPin
} from 'lucide-react'
import { useServiceManagerStore } from '../../stores/serviceManagerStore'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import ServicePortalBackground from './ServicePortalBackground'
import ServiceOnboarding from './ServiceOnboarding'
import LiveJobsView from './views/LiveJobsView'
import TechniciansView from './views/TechniciansView'
import ServiceCatalogView from './views/ServiceCatalogView'
import SparePartsView from './views/SparePartsView'
import EstimatesView from './views/EstimatesView'
import EarningsView from './views/EarningsView'
import PartnerProfileView from './views/PartnerProfileView'

import JobDetailModal from './components/JobDetailModal'
import AssignTechnicianModal from './components/AssignTechnicianModal'
import VerifyJobOtpModal from './components/VerifyJobOtpModal'
import CreateEstimateModal from './components/CreateEstimateModal'

export default function ServiceManagerDashboard() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()

  const {
    provider,
    isProviderLoaded,
    isLoading,
    isOnline,
    bookings,
    technicians,
    spareParts,
    estimates,
    catalog,
    categories,
    earnings,
    notificationSoundEnabled,
    setNotificationSoundEnabled,
    playAlert,
    fetchProviderProfile,
    onboardProvider,
    toggleOnlineStatus,
    fetchBookings,
    acceptBooking,
    assignTechnician,
    updateBookingStatus,
    updateVisitingFee,
    addCustomService,
    verifyCompletionOtp,
    fetchTechnicians,
    addTechnician,
    updateTechnicianStatus,
    deleteTechnician,
    fetchSpareParts,
    addSparePart,
    updatePartStock,
    fetchEstimates,
    createEstimate,
    fetchCatalogAndCategories,
    fetchEarnings,
    requestPayout,
    subscribeToRealtime,
    unsubscribeFromRealtime
  } = useServiceManagerStore()

  // Navigation tabs: 'jobs' | 'technicians' | 'catalog' | 'spare_parts' | 'estimates' | 'earnings' | 'profile'
  const [currentTab, setCurrentTab] = useState('jobs')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Modals state
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState(null)
  const [selectedBookingForAssign, setSelectedBookingForAssign] = useState(null)
  const [selectedBookingForOtp, setSelectedBookingForOtp] = useState(null)
  const [selectedBookingForEstimate, setSelectedBookingForEstimate] = useState(null)

  // Audio alert timer ref
  const soundTimer = useRef(null)

  // 1. Initial Data Fetch on Mount
  useEffect(() => {
    fetchProviderProfile()
    fetchCatalogAndCategories()
  }, [])

  // 2. Fetch specific data once provider profile is available
  useEffect(() => {
    if (provider) {
      fetchBookings()
      fetchTechnicians()
      fetchSpareParts()
      fetchEstimates()
      fetchEarnings()
      subscribeToRealtime()
    }

    return () => {
      unsubscribeFromRealtime()
      if (soundTimer.current) clearInterval(soundTimer.current)
    }
  }, [provider])

  // 3. Audio Chime loop for incoming unassigned bookings
  const pendingRequests = bookings.filter(b => b.status === 'pending')

  useEffect(() => {
    if (pendingRequests.length > 0 && notificationSoundEnabled && isOnline) {
      playAlert()
      if (soundTimer.current) clearInterval(soundTimer.current)
      soundTimer.current = setInterval(() => {
        playAlert()
      }, 3000)
    } else {
      if (soundTimer.current) {
        clearInterval(soundTimer.current)
        soundTimer.current = null
      }
    }

    return () => {
      if (soundTimer.current) clearInterval(soundTimer.current)
    }
  }, [pendingRequests.length, notificationSoundEnabled, isOnline])

  // 4. Scroll to top on tab change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [currentTab])

  // Nav Groups definition with styling and subtitles
  const navGroups = [
    {
      title: 'Operations',
      items: [
        {
          id: 'jobs',
          label: 'Live Jobs',
          icon: Wrench,
          count: pendingRequests.length,
          countBadgeColor: 'bg-amber-500 text-black font-black animate-pulse',
          color: 'text-sky-500 dark:text-sky-400',
          bgColor: 'bg-sky-500/10',
          subtitle: 'Real-time doorstep dispatch & active job visits'
        },
        {
          id: 'technicians',
          label: 'Field Technicians',
          icon: Users,
          count: technicians.length,
          countBadgeColor: 'bg-blue-500/10 text-blue-500',
          color: 'text-blue-500 dark:text-blue-400',
          bgColor: 'bg-blue-500/10',
          subtitle: 'Manage duty status, contact & assignments'
        },
        {
          id: 'catalog',
          label: 'Service Catalog',
          icon: Layers,
          color: 'text-indigo-500 dark:text-indigo-400',
          bgColor: 'bg-indigo-500/10',
          subtitle: 'Rate card offerings & custom service proposals'
        }
      ]
    },
    {
      title: 'Supplies & Quotations',
      items: [
        {
          id: 'spare_parts',
          label: 'Spare Parts',
          icon: Package,
          count: spareParts.length,
          countBadgeColor: 'bg-amber-500/10 text-amber-500',
          color: 'text-amber-500 dark:text-amber-400',
          bgColor: 'bg-amber-500/10',
          subtitle: 'Materials inventory, stock count & unit costs'
        },
        {
          id: 'estimates',
          label: 'Quotations',
          icon: FileText,
          count: estimates.length,
          countBadgeColor: 'bg-purple-500/10 text-purple-500',
          color: 'text-purple-500 dark:text-purple-400',
          bgColor: 'bg-purple-500/10',
          subtitle: 'Customer billing quotes & approval records'
        }
      ]
    },
    {
      title: 'Financials & Account',
      items: [
        {
          id: 'earnings',
          label: 'Settlements & Revenue',
          icon: DollarSign,
          color: 'text-emerald-500 dark:text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          subtitle: 'Completed visits revenue, bank account & payout transfers'
        },
        {
          id: 'profile',
          label: 'Agency Profile',
          icon: Building2,
          color: 'text-rose-500 dark:text-rose-400',
          bgColor: 'bg-rose-500/10',
          subtitle: 'Business KYC, phone, address & operating hub'
        }
      ]
    }
  ]

  const allNavItems = navGroups.flatMap(g => g.items)
  const currentTabObj = allNavItems.find(item => item.id === currentTab) || allNavItems[0]

  // Loading state while verifying provider profile
  if (!isProviderLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#121212] relative flex items-center justify-center">
        <ServicePortalBackground />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25">
            <Wrench size={24} className="animate-spin" />
          </div>
          <p className="text-xs font-bold text-gray-500 tracking-wider uppercase">Loading Service Partner Hub...</p>
        </div>
      </div>
    )
  }

  // If provider not registered yet, show onboarding wizard
  if (!provider) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#121212] relative overflow-hidden">
        <ServicePortalBackground />
        <ServiceOnboarding onCompleteOnboarding={onboardProvider} user={user} />
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-gray-50 dark:bg-[#0c0c0c] text-gray-900 dark:text-white flex overflow-hidden font-sans transition-colors duration-300 relative">
      
      {/* Mobile Drawer Backdrop Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
          />
        )}
      </AnimatePresence>

      {/* LEFT SIDEBAR (Sticky on desktop, slide-in drawer on mobile) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 lg:w-72 xl:w-80 h-full bg-white dark:bg-[#121212] border-r border-gray-200 dark:border-white/10 shadow-2xl lg:shadow-none flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/25 shrink-0">
              <Wrench size={24} />
            </div>
            <div className="text-left min-w-0">
              <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white truncate leading-tight">
                {provider?.business_name || 'Service Partner'}
              </h2>
              <span className="text-xs font-black uppercase tracking-wider text-sky-500 bg-sky-500/10 px-3 py-0.5 rounded-full inline-block mt-0.5">
                Partner Portal
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 lg:hidden"
            title="Close Menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* Agency Mini Status Card */}
        <div className="p-4 m-3.5 rounded-2xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/5">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-black text-gray-900 dark:text-white truncate">
                  {provider?.city || 'Patna'} Hub
                </p>
                <p className="text-xs sm:text-sm text-gray-400 font-semibold truncate">
                  Doorstep Operations
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleOnlineStatus}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black tracking-wider uppercase border transition-all flex items-center gap-1.5 shrink-0 ${
                isOnline
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
              }`}
              title="Click to toggle Duty Status"
            >
              <Power size={13} className={isOnline ? 'animate-pulse' : ''} />
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3.5 py-2 space-y-5 scrollbar-thin">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-2">
              <div className="px-3.5 py-1 text-xs font-black tracking-widest uppercase text-gray-400 dark:text-gray-400 select-none">
                {group.title}
              </div>

              <div className="space-y-1">
                {group.items.map((tab) => {
                  const isActive = currentTab === tab.id
                  const Icon = tab.icon

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setCurrentTab(tab.id)
                        setIsSidebarOpen(false)
                      }}
                      className={`group w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl text-base font-bold transition-all text-left ${
                        isActive
                          ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-600/25'
                          : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-xl transition-colors shrink-0 ${
                            isActive ? 'bg-white/20 text-white' : `${tab.bgColor} ${tab.color}`
                          }`}
                        >
                          <Icon size={18} />
                        </div>
                        <span className="truncate">{tab.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {tab.count !== undefined && tab.count > 0 && (
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                              isActive
                                ? 'bg-white/20 text-white font-black'
                                : tab.countBadgeColor || 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                        <ChevronRight
                          size={15}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                            isActive ? 'text-white' : 'text-gray-400'
                          }`}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3.5 border-t border-gray-100 dark:border-white/5 space-y-2 shrink-0">
          <Link
            to="/"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm sm:text-base font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
          >
            <Home size={18} className="text-emerald-500 shrink-0" />
            <span>Return to Store</span>
          </Link>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setNotificationSoundEnabled(!notificationSoundEnabled)}
              className={`p-2.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                notificationSoundEnabled
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-400 border-gray-200 dark:border-white/10'
              }`}
              title={notificationSoundEnabled ? 'Audio alerts active' : 'Audio alerts muted'}
            >
              {notificationSoundEnabled ? <Bell size={16} /> : <BellOff size={16} />}
              <span className="text-xs sm:text-sm">{notificationSoundEnabled ? 'Alerts ON' : 'Muted'}</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-white/10 transition-all"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-gray-50/80 dark:bg-[#0c0c0c] relative">
        <ServicePortalBackground />

        {/* Top Header Bar */}
        <header className="relative z-10 h-20 px-4 sm:px-6 lg:px-8 border-b border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl flex items-center justify-between gap-4 shrink-0 transition-colors">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 lg:hidden shrink-0"
              title="Open Navigation"
            >
              <Menu size={22} />
            </button>

            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white truncate flex items-center gap-2.5">
                <span>{currentTabObj.label}</span>
                {currentTab === 'jobs' && pendingRequests.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-black animate-pulse">
                    {pendingRequests.length} Incoming
                  </span>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-semibold truncate hidden sm:block mt-0.5">
                {currentTabObj.subtitle}
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            {/* Duty toggle */}
            <button
              type="button"
              onClick={toggleOnlineStatus}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all border ${
                isOnline
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
              }`}
            >
              <Power size={14} className={isOnline ? 'animate-pulse' : ''} />
              <span className="hidden sm:inline">{isOnline ? 'Receiving Jobs' : 'Offline'}</span>
            </button>

            {/* Quick Refresh */}
            <button
              type="button"
              onClick={() => {
                fetchBookings()
                fetchTechnicians()
                fetchSpareParts()
                fetchEstimates()
                fetchEarnings()
              }}
              className="p-2.5 sm:p-3 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-2xl border border-gray-200 dark:border-white/10 transition-all shadow-xs"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>

            {/* Hub Pill */}
            <div className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">
              <MapPin size={14} className="text-sky-500" />
              <span>{provider?.city || 'Patna'} Hub</span>
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-thin">
          <div className="max-w-[1600px] mx-auto w-full space-y-6">
            {currentTab === 'jobs' && (
              <LiveJobsView
                bookings={bookings}
                isLoading={isLoading}
                onRefresh={fetchBookings}
                onSelectBooking={(b) => setSelectedBookingForDetail(b)}
                onAcceptBooking={acceptBooking}
                onOpenAssign={(b) => setSelectedBookingForAssign(b)}
                onOpenOtp={(b) => setSelectedBookingForOtp(b)}
              />
            )}

            {currentTab === 'technicians' && (
              <TechniciansView
                technicians={technicians}
                isLoading={isLoading}
                onAddTechnician={addTechnician}
                onUpdateStatus={updateTechnicianStatus}
                onDeleteTechnician={deleteTechnician}
              />
            )}

            {currentTab === 'catalog' && (
              <ServiceCatalogView
                catalog={catalog}
                categories={categories}
                provider={provider}
                isLoading={isLoading}
                onUpdateVisitingFee={async (fee) => {
                  await updateVisitingFee(fee)
                }}
                onAddCustomService={addCustomService}
              />
            )}

            {currentTab === 'spare_parts' && (
              <SparePartsView
                spareParts={spareParts}
                isLoading={isLoading}
                onAddPart={addSparePart}
                onUpdateStock={updatePartStock}
              />
            )}

            {currentTab === 'estimates' && (
              <EstimatesView
                estimates={estimates}
                isLoading={isLoading}
              />
            )}

            {currentTab === 'earnings' && (
              <EarningsView
                earnings={earnings}
                provider={provider}
                isLoading={isLoading}
                onRequestPayout={requestPayout}
              />
            )}

            {currentTab === 'profile' && (
              <PartnerProfileView
                provider={provider}
                onRefresh={fetchProviderProfile}
              />
            )}
          </div>
        </main>
      </div>

      {/* Modals placed outside main container so they overlay properly */}
      <JobDetailModal
        isOpen={!!selectedBookingForDetail}
        onClose={() => setSelectedBookingForDetail(null)}
        booking={selectedBookingForDetail}
        onUpdateStatus={updateBookingStatus}
        onOpenAssign={(b) => {
          setSelectedBookingForDetail(null)
          setSelectedBookingForAssign(b)
        }}
        onOpenEstimate={(b) => {
          setSelectedBookingForDetail(null)
          setSelectedBookingForEstimate(b)
        }}
        onOpenOtp={(b) => {
          setSelectedBookingForDetail(null)
          setSelectedBookingForOtp(b)
        }}
        onUpdateBookingData={updateBookingStatus}
      />

      <AssignTechnicianModal
        isOpen={!!selectedBookingForAssign}
        onClose={() => setSelectedBookingForAssign(null)}
        booking={selectedBookingForAssign}
        technicians={technicians}
        onAssign={assignTechnician}
      />

      <VerifyJobOtpModal
        isOpen={!!selectedBookingForOtp}
        onClose={() => setSelectedBookingForOtp(null)}
        booking={selectedBookingForOtp}
        onVerify={verifyCompletionOtp}
      />

      <CreateEstimateModal
        isOpen={!!selectedBookingForEstimate}
        onClose={() => setSelectedBookingForEstimate(null)}
        booking={selectedBookingForEstimate}
        spareParts={spareParts}
        onSubmitEstimate={createEstimate}
      />
    </div>
  )
}
