import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  Power
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
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] relative text-gray-900 dark:text-white transition-colors duration-300">
      <ServicePortalBackground />

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Top Navbar */}
        <header className="bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-xl border border-gray-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm mb-7 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Left: Branding & Back to Main */}
          <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-start">
            <Link
              to="/"
              className="p-2.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
              title="Return to Main Customer App"
            >
              <ArrowLeft size={20} />
            </Link>

            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 flex-shrink-0">
                <Wrench size={24} />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">
                    {provider?.business_name || 'OZO Service Manager'}
                  </h1>
                  <span className="text-[11px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-500 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
                    Partner Portal
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-bold mt-0.5">
                  {provider?.city || 'Patna'} Hub • Doorstep Operations
                </p>
              </div>
            </div>
          </div>

          {/* Right: Controls & Toggles */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            
            {/* Online / Duty Toggle */}
            <button
              onClick={toggleOnlineStatus}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all border ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
              }`}
            >
              <Power size={15} className={isOnline ? 'animate-pulse' : ''} />
              <span>{isOnline ? 'Receiving Jobs' : 'Offline'}</span>
            </button>

            {/* Sound Chime Toggle */}
            <button
              onClick={() => setNotificationSoundEnabled(!notificationSoundEnabled)}
              className={`p-3 rounded-2xl border transition-all ${
                notificationSoundEnabled
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-400 border-gray-200 dark:border-white/10'
              }`}
              title={notificationSoundEnabled ? 'Audio alerts active' : 'Audio alerts muted'}
            >
              {notificationSoundEnabled ? <Bell size={18} /> : <BellOff size={18} />}
            </button>

            {/* Dark/Light Mode */}
            <button
              onClick={toggleTheme}
              className="p-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-2xl border border-gray-200 dark:border-white/10 transition-all"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

          </div>
        </header>

        {/* Navigation Tabs Bar */}
        <nav className="flex items-center gap-2.5 overflow-x-auto pb-3 mb-8 scrollbar-none">
          {[
            { id: 'jobs', label: 'Live Jobs', icon: Wrench, count: pendingRequests.length },
            { id: 'technicians', label: 'Field Technicians', icon: Users, count: technicians.length },
            { id: 'catalog', label: 'Service Catalog', icon: Layers },
            { id: 'spare_parts', label: 'Spare Parts', icon: Package, count: spareParts.length },
            { id: 'estimates', label: 'Quotations', icon: FileText, count: estimates.length },
            { id: 'earnings', label: 'Settlements & Revenue', icon: DollarSign },
            { id: 'profile', label: 'Agency Profile', icon: Building2 }
          ].map((tab) => {
            const isActive = currentTab === tab.id
            const IconComponent = tab.icon

            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all flex items-center gap-2.5 border ${
                  isActive
                    ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/25'
                    : 'bg-white/80 dark:bg-[#1a1a1a]/80 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                }`}
              >
                <IconComponent size={16} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.id === 'jobs'
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Tab Content Router */}
        <main className="transition-all animate-fadeIn">
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
                await updateBookingStatus(provider.id, provider.status, { visiting_fee_override: fee })
                fetchProviderProfile()
              }}
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
        </main>

        {/* Modals */}
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
    </div>
  )
}
