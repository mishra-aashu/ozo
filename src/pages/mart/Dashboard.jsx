import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useMartStore } from '../../stores/martStore'
import { useAuthStore } from '../../stores/authStore'
import MartOnboarding from './MartOnboarding'
import LiveOrdersView from './LiveOrdersView'
import InventoryView from './InventoryView'
import EarningsView from './EarningsView'
import StoreProfileView from './StoreProfileView'
import { 
  Bell, 
  BellOff, 
  RefreshCw, 
  Store, 
  Clock, 
  AlertTriangle,
  ArrowLeft
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import BarcodeEnrichmentModal from '../../components/mart/BarcodeEnrichmentModal'
import toast from 'react-hot-toast'

const MartDashboard = () => {
  const { profile } = useAuthStore()
  const isMartOperator = profile?.role === 'mart_operator' || profile?.role === 'mart_owner' || profile?.isMartOwner

  const {
    currentMart,
    liveOrders,
    isLoadingOrders,
    fetchMarts,
    fetchLiveOrders,
    fetchInventory,
    fetchPastOrders,
    subscribeToOrders,
    unsubscribeFromOrders,
    notificationSoundEnabled,
    setNotificationSoundEnabled,
    playAlertSound,
    martApplication,
    isLoadingApplication,
    fetchMartApplication,
    toggleMartStatus
  } = useMartStore()

  // Local UI state
  const [currentView, setCurrentView] = useState('orders') // 'orders', 'inventory', 'earnings', 'profile'
  const [togglingStatus, setTogglingStatus] = useState(false)
  const soundTimer = useRef(null)

  // Fetch initial profile applications and marts
  useEffect(() => {
    if (profile) {
      if (isMartOperator) {
        fetchMartApplication().finally(() => {
          fetchMarts()
        })
        subscribeToOrders()
      } else {
        fetchMartApplication()
      }
    }

    return () => {
      if (isMartOperator) {
        unsubscribeFromOrders()
      }
      if (soundTimer.current) clearInterval(soundTimer.current)
    }
  }, [profile, isMartOperator, fetchMarts, subscribeToOrders, unsubscribeFromOrders, fetchMartApplication])

  // Sound loop trigger for incoming orders
  const incomingOrders = liveOrders.filter(o => ['pending', 'placed', 'CONFIRMED_SYSTEM', 'confirmed'].includes(o.status))
  
  useEffect(() => {
    if (incomingOrders.length > 0 && notificationSoundEnabled) {
      playAlertSound()
      if (soundTimer.current) clearInterval(soundTimer.current)
      soundTimer.current = setInterval(() => {
        playAlertSound()
      }, 2000) // Repeat every 2 seconds
    } else {
      if (soundTimer.current) {
        clearInterval(soundTimer.current)
        soundTimer.current = null
      }
    }

    return () => {
      if (soundTimer.current) clearInterval(soundTimer.current)
    }
  }, [incomingOrders.length, notificationSoundEnabled, playAlertSound])

  const handleToggleStatus = async () => {
    setTogglingStatus(true)
    await toggleMartStatus()
    setTogglingStatus(false)
  }

  // Reset window scroll position when switching views
  useEffect(() => {
    window.scrollTo(0, 0)
    document.body.scrollTop = 0
    if (document.documentElement) {
      document.documentElement.scrollTop = 0
    }
  }, [currentView])

  // Scanner Keyboard Listener for Catalog Enrichment
  const [scannedBarcode, setScannedBarcode] = useState(null)
  const [scannedProduct, setScannedProduct] = useState(null)
  const [isEnrichmentModalOpen, setIsEnrichmentModalOpen] = useState(false)

  useEffect(() => {
    if (!isMartOperator) return

    let barcodeBuffer = ''
    let lastKeyTime = 0

    const handleKeyDown = async (e) => {
      const target = e.target
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      ) {
        return
      }

      // Ignore modifier keys to prevent interception of keyboard shortcuts
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return
      }

      const currentTime = Date.now()

      // Reset buffer if delay between keystrokes is too long (> 80ms)
      if (barcodeBuffer.length > 0 && currentTime - lastKeyTime > 80) {
        barcodeBuffer = ''
      }

      lastKeyTime = currentTime

      if (e.key === 'Enter') {
        const cleanBarcode = barcodeBuffer.trim()
        if (cleanBarcode.length >= 8) {
          e.preventDefault()
          e.stopPropagation()
          
          const loadingToast = toast.loading(`Checking scanned barcode: ${cleanBarcode}...`)
          try {
            const { data: product, error } = await supabase
              .from('products')
              .select('*')
              .eq('barcode', cleanBarcode)
              .maybeSingle()

            if (error) throw error

            if (product) {
              if (product.enrichment_status === 'pending_photo') {
                toast.success(`Found product requiring photo enrichment: ${product.name}`, { id: loadingToast, icon: '📸' })
                setScannedBarcode(cleanBarcode)
                setScannedProduct(product)
                setIsEnrichmentModalOpen(true)
              } else {
                toast(`Product: ${product.name} (Status: ${product.enrichment_status})`, { id: loadingToast, icon: '📦' })
              }
            } else {
              toast.error(`Barcode ${cleanBarcode} is not registered in the catalog.`, { id: loadingToast })
            }
          } catch (err) {
            console.error('Failed to lookup barcode:', err)
            toast.error('Failed to check barcode status', { id: loadingToast })
          }
        }
        barcodeBuffer = ''
        return
      }

      if (e.key.length === 1) {
        barcodeBuffer += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isMartOperator])

  if (isLoadingApplication && !isMartOperator) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 flex flex-col items-center justify-center p-6 transition-colors duration-300">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600 dark:text-slate-400 font-bold uppercase tracking-widest text-sm animate-pulse">Loading Application Status...</p>
      </div>
    )
  }

  if (!isMartOperator) {
    if (!martApplication || martApplication.status === 'rejected') {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white flex flex-col font-sans transition-colors duration-300">
          <header className="border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-500/10">
                <Store className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">OZO Mart Portal</h1>
            </div>
            <Link to="/" className="px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-2xl text-xs font-black uppercase tracking-wider border border-gray-200 dark:border-slate-700 transition-all flex items-center gap-2">
              Back to Home
            </Link>
          </header>
          
          <main className="flex-1 flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px] pointer-events-none"></div>
            
            <div className="w-full max-w-lg z-10 space-y-6">
              {martApplication?.status === 'rejected' && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-3xl flex items-start gap-4">
                  <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-wide">Previous Application Rejected</h4>
                    <p className="text-xs text-red-400/80 mt-1 leading-relaxed">
                      Unfortunately, your previous application was rejected. You can review and resubmit updated details below to re-apply.
                    </p>
                  </div>
                </div>
              )}
              
              <MartOnboarding onComplete={fetchMartApplication} />
            </div>
          </main>
        </div>
      )
    }

    if (martApplication.status === 'pending_verification') {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white flex flex-col font-sans transition-colors duration-300">
          <header className="border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-500/10">
                <Store className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">OZO Mart Portal</h1>
            </div>
            <Link to="/" className="px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-2xl text-xs font-black uppercase tracking-wider border border-gray-200 dark:border-slate-700 transition-all flex items-center gap-2">
              Back to Home
            </Link>
          </header>

          <main className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-[2.5rem] p-10 shadow-2xl text-center space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 animate-pulse"></div>
              
              <div className="inline-flex bg-yellow-50 dark:bg-yellow-500/10 p-5 rounded-3xl text-yellow-600 dark:text-yellow-400 shadow-md">
                <Clock className="w-10 h-10 animate-spin" style={{ animationDuration: '6s' }} />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Verification In Progress</h2>
                <p className="text-sm text-gray-550 dark:text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                  Thank you for applying! We are currently reviewing your store details and documents.
                </p>
              </div>

              <div className="border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 rounded-3xl p-6 text-left space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">✓</div>
                  <div>
                    <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Application Submitted</p>
                    <p className="text-[10px] text-gray-450 font-bold">Details successfully received</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs font-bold animate-pulse">•</div>
                  <div>
                    <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Document Verification</p>
                    <p className="text-[10px] text-gray-450 font-bold">Reviewing license & store details</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 opacity-40">
                  <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-605 dark:text-slate-400 flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Portal Activation</p>
                    <p className="text-[10px] text-gray-450 font-bold">Access to Supermarket Live Desk</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs text-gray-400 dark:text-slate-500 font-bold leading-relaxed">
                  Verification usually takes less than 24 hours. If you have questions, contact us aashutoshk625@gmail.com
                </p>
              </div>
            </div>
          </main>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white flex flex-col items-center justify-center p-6 text-center space-y-4 font-sans transition-colors duration-300">
        <div className="inline-flex bg-blue-50 dark:bg-blue-600/10 p-5 rounded-3xl text-blue-600 dark:text-blue-400 shadow-md">
          <Store className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight">Store Application Approved!</h2>
        <p className="text-gray-900 dark:text-slate-350 max-w-md font-bold text-sm leading-relaxed">
          Your application has been approved! Admin is currently activating your portal permissions. You will gain full access shortly.
        </p>
        <Link to="/" className="px-6 py-3 bg-red-650 hover:bg-red-700 text-white font-black uppercase tracking-wider rounded-2xl text-xs hover:shadow-xl transition-all">
          Go to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="h-screen h-[100dvh] bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-500/30 transition-colors duration-300 overflow-hidden">
      {/* Top Header */}
      <header className="border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <Link to="/" className="p-1.5 md:p-2 hover:bg-gray-150 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white flex items-center justify-center" title="Back to Home">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="hidden sm:block bg-gradient-to-tr from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-750 p-2 md:p-2.5 rounded-xl shadow-lg shadow-blue-500/10 shrink-0">
            <Store className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-xl font-bold tracking-tight text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-none" title="OZO Mart Portal">
                <span className="sm:hidden">OZO Mart</span>
                <span className="hidden sm:inline">OZO Mart Portal</span>
              </h1>
              {currentMart ? (
                <div className="flex items-center gap-2 select-none shrink-0">
                  <button 
                    onClick={handleToggleStatus}
                    disabled={togglingStatus}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none disabled:opacity-50 cursor-pointer shadow-inner p-0 border-none outline-none ${
                      currentMart.is_active 
                        ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 dark:from-emerald-500 dark:to-cyan-500' 
                        : 'bg-gray-350 dark:bg-slate-800'
                    }`}
                    title={currentMart.is_active ? 'Click to go offline' : 'Click to go live'}
                  >
                    <span 
                      className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full shadow transition-all duration-300 transform ${
                        currentMart.is_active ? 'translate-x-[24px]' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className={`text-[10px] sm:text-xs font-bold transition-colors duration-300 ${
                    currentMart.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                  }`}>
                    {currentMart.is_active ? 'Live' : 'Offline'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 select-none shrink-0">
                  <span className="relative w-12 h-6 rounded-full bg-gray-250 dark:bg-slate-800 opacity-60">
                    <span className="absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full shadow" />
                  </span>
                  <span className="text-[10px] sm:text-xs font-bold text-gray-550">Offline</span>
                </div>
              )}
            </div>
            <div className="text-[10px] sm:text-sm text-gray-550 dark:text-slate-400 mt-0.5 flex items-center gap-1 max-w-[180px] sm:max-w-none">
              <span className="hidden sm:inline">Supermarket Counter:</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[120px] sm:max-w-none" title={currentMart?.name || martApplication?.store_name || profile?.full_name || 'My Mart'}>
                {currentMart?.name || martApplication?.store_name || profile?.full_name || 'My Mart'}
              </span>
            </div>
          </div>
        </div>

        {/* Global Controls & Views Navigation */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden lg:flex bg-gray-150 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setCurrentView('orders')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 cursor-pointer ${
                currentView === 'orders'
                  ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md font-bold'
                  : 'text-gray-700 dark:text-slate-300 hover:text-gray-950 dark:hover:text-white'
              }`}
            >
              Live Orders ({liveOrders.length})
            </button>
            <button
              onClick={() => setCurrentView('inventory')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 cursor-pointer ${
                currentView === 'inventory'
                  ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md font-bold'
                  : 'text-gray-700 dark:text-slate-300 hover:text-gray-955 dark:hover:text-white'
              }`}
            >
              Inventory Controller
            </button>
            <button
              onClick={() => setCurrentView('earnings')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 cursor-pointer ${
                currentView === 'earnings'
                  ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md font-bold'
                  : 'text-gray-700 dark:text-slate-300 hover:text-gray-955 dark:hover:text-white'
              }`}
            >
              Earnings & Stats
            </button>
            <button
              onClick={() => setCurrentView('profile')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 cursor-pointer ${
                currentView === 'profile'
                  ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md font-bold'
                  : 'text-gray-700 dark:text-slate-300 hover:text-gray-955 dark:hover:text-white'
              }`}
            >
              Store Profile
            </button>
          </div>

          {currentView === 'orders' && (
            <button
              onClick={() => setNotificationSoundEnabled(!notificationSoundEnabled)}
              className={`p-2.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                notificationSoundEnabled
                  ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20'
                  : 'bg-gray-100 dark:bg-slate-800 border-gray-250 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title={notificationSoundEnabled ? "Disable Alert Sound" : "Enable Alert Sound"}
            >
              {notificationSoundEnabled ? <Bell className="w-5 h-5 animate-swing" /> : <BellOff className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={() => {
              if (currentView === 'orders') fetchLiveOrders()
              else if (currentView === 'inventory') fetchInventory(1, 20)
              else if (currentView === 'earnings') fetchPastOrders()
            }}
            className="p-2.5 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all duration-300 text-gray-800 dark:text-slate-300 hover:text-gray-955 dark:hover:text-white cursor-pointer"
            title="Sync Data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden min-w-0 w-full">
        {currentView === 'orders' && <LiveOrdersView />}
        {currentView === 'inventory' && <InventoryView />}
        {currentView === 'earnings' && <EarningsView />}
        {currentView === 'profile' && <StoreProfileView />}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-200 dark:border-slate-800 flex items-center justify-around py-2 px-2 sticky bottom-0 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => setCurrentView('orders')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-300 relative cursor-pointer ${
            currentView === 'orders' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
          }`}
        >
          <div className="relative">
            <Store className="w-5 h-5" />
            {liveOrders.length > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-[14px] text-center leading-none">
                {liveOrders.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold">Orders</span>
        </button>

        <button
          onClick={() => setCurrentView('inventory')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-300 cursor-pointer ${
            currentView === 'inventory' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px] font-bold">Inventory</span>
        </button>

        <button
          onClick={() => setCurrentView('earnings')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-300 cursor-pointer ${
            currentView === 'earnings' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
          }`}
        >
          <RefreshCw className="w-5 h-5" />
          <span className="text-[10px] font-bold">Earnings</span>
        </button>

        <button
          onClick={() => setCurrentView('profile')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-300 cursor-pointer ${
            currentView === 'profile' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'
          }`}
        >
          <Store className="w-5 h-5" />
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </nav>

      {isEnrichmentModalOpen && scannedBarcode && (
        <BarcodeEnrichmentModal
          barcode={scannedBarcode}
          product={scannedProduct}
          onClose={() => {
            setIsEnrichmentModalOpen(false)
            setScannedBarcode(null)
            setScannedProduct(null)
          }}
          onComplete={(updatedProduct) => {
            setIsEnrichmentModalOpen(false)
            setScannedBarcode(null)
            setScannedProduct(null)
            fetchInventory()
          }}
        />
      )}
    </div>
  )
}

export default MartDashboard
