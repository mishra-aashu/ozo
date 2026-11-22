import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Building2, ShoppingBag, ShieldCheck, Clock, FileText, CheckCircle, 
  AlertCircle, RefreshCw, X, ZoomIn, Phone, MapPin, Truck, ChevronRight,
  Sun, Moon, ArrowLeft, LogIn, Loader2
} from 'lucide-react'
import { usePharmacyStore } from '../../stores/pharmacyStore'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import PharmacyPortalBackground from './PharmacyPortalBackground'
import PharmacyOnboarding from './PharmacyOnboarding'
import toast from 'react-hot-toast'

export default function PharmacyDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { 
    pharmacy, 
    isPharmacyLoaded,
    fetchPharmacyProfile, 
    onboardPharmacy,
    orders, 
    fetchOrders, 
    updateOrderStatus,
    updatePharmacyProfile,
    isLoading 
  } = usePharmacyStore()

  const [activeTab, setActiveTab] = useState('orders') // 'orders' | 'profile' | 'history'
  const [activeFilter, setActiveFilter] = useState('all')

  // Inspector Modal State
  const [inspectingOrder, setInspectingOrder] = useState(null)
  const [billAmount, setBillAmount] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Onboarding State
  const [isOnboarding, setIsOnboarding] = useState(false)
  const [onboardForm, setOnboardForm] = useState({
    store_name: '',
    registered_pharmacist_name: '',
    drug_license_number: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    operating_hours: ''
  })

  // Profile Edit State
  const [editStoreName, setEditStoreName] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editLicense, setEditLicense] = useState('')
  const [editPharmacist, setEditPharmacist] = useState('')

  useEffect(() => {
    fetchPharmacyProfile().then((store) => {
      if (store) {
        setEditStoreName(store.store_name || '')
        setEditAddress(store.address || store.store_address || '')
        setEditPhone(store.phone || '')
        setEditLicense(store.drug_license_number || store.drug_license_form_20 || '')
        setEditPharmacist(store.registered_pharmacist_name || store.owner_name || '')
      }
    })
  }, [])

  useEffect(() => {
    if (user) {
      setOnboardForm(prev => ({
        ...prev,
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || ''
      }))
    }
  }, [user])

  useEffect(() => {
    if (pharmacy) {
      fetchOrders()
    }
  }, [pharmacy])

  // Polling fallback every 15s for incoming orders
  useEffect(() => {
    const interval = setInterval(() => {
      if (pharmacy) fetchOrders()
    }, 15000)
    return () => clearInterval(interval)
  }, [pharmacy])

  const handleCompleteOnboarding = async (e) => {
    e.preventDefault()
    if (!onboardForm.store_name.trim()) {
      toast.error('Store / Medical Hall name is required')
      return
    }
    if (!onboardForm.drug_license_number.trim()) {
      toast.error('Drug License number is required')
      return
    }
    setIsOnboarding(true)
    try {
      const res = await onboardPharmacy(onboardForm)
      if (res) {
        fetchOrders()
      }
    } finally {
      setIsOnboarding(false)
    }
  }

  // 1. Loading state while verifying credentials
  if (!isPharmacyLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#070709] text-gray-900 dark:text-white py-12 px-4 flex flex-col items-center justify-center overflow-y-auto transition-colors duration-300 gap-6 relative">
        <PharmacyPortalBackground />

        {/* Floating Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={toggleTheme}
            className="p-2.5 bg-white/90 dark:bg-[#0c0c14]/90 backdrop-blur-md border border-gray-200 dark:border-[#1e1e32] rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-gray-700" /> : <Sun className="w-4 h-4 text-yellow-400" />}
          </button>
        </div>

        <div className="w-full max-w-sm mx-auto bg-white/95 dark:bg-[#0c0c14]/90 backdrop-blur-2xl border border-gray-200/80 dark:border-[#1b1b2d] rounded-[2rem] p-8 shadow-2xl transition-all duration-300 relative z-10 text-center flex flex-col items-center">
          
          {/* Animated Loading Badge with Spinning Gradient Ring */}
          <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
            {/* Spinning gradient ring */}
            <div className="absolute inset-0 rounded-3xl border-2 border-teal-500/20 border-t-teal-500 border-r-cyan-500 animate-spin" />
            {/* Center icon badge */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/25">
              <Building2 className="w-7 h-7 animate-pulse" />
            </div>
          </div>

          <h3 className="text-base font-black text-gray-900 dark:text-white font-display tracking-tight uppercase">
            Verifying Chemist Credentials
          </h3>
          
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-500 shrink-0" />
            <span>Connecting to OzoCare Pharmacy Dispensation Registry...</span>
          </div>

          {/* Progress bar shimmer */}
          <div className="w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mt-6">
            <div className="h-full bg-gradient-to-r from-teal-500 via-cyan-400 to-teal-600 rounded-full w-2/3 animate-[pulse_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    )
  }

  // 2. Unauthenticated user gate
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#070709] text-gray-900 dark:text-white py-12 px-4 flex flex-col items-center justify-center overflow-y-auto transition-colors duration-300 gap-6 relative">
        <PharmacyPortalBackground />

        {/* Floating Back Button */}
        <div className="absolute top-4 left-4 z-20">
          <Link
            to="/care"
            className="p-2.5 bg-white/90 dark:bg-[#0c0c14]/90 backdrop-blur-md border border-gray-200 dark:border-[#1e1e32] rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm flex items-center justify-center"
            title="Back to Patient Care"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        {/* Floating Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={toggleTheme}
            className="p-2.5 bg-white/90 dark:bg-[#0c0c14]/90 backdrop-blur-md border border-gray-200 dark:border-[#1e1e32] rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-gray-700" /> : <Sun className="w-4 h-4 text-yellow-400" />}
          </button>
        </div>

        <div className="w-full max-w-md mx-auto bg-white/95 dark:bg-[#0c0c14]/90 backdrop-blur-2xl border border-gray-200/80 dark:border-[#1b1b2d] rounded-[2rem] p-6 sm:p-8 md:p-10 shadow-2xl transition-all duration-300 relative z-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-500 p-3.5 mx-auto mb-4 text-white shadow-md shadow-teal-500/20 flex items-center justify-center">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white font-display tracking-tight">
            Chemist Workstation
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed font-medium">
            This dispensation workstation is restricted to licensed pharmacy retail partners. Sign in to review doctor e-prescriptions and fulfill medicine deliveries.
          </p>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => navigate('/auth?redirect=/pharmacy')}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In to Chemist Account</span>
            </button>

            <button
              onClick={() => navigate('/auth?redirect=/pharmacy')}
              className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold text-xs border border-gray-200 dark:border-white/10 transition-all cursor-pointer"
            >
              Partner with OzoCare
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 3. User is logged in, but no pharmacy store created yet
  if (!pharmacy) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#070709] text-gray-900 dark:text-white py-12 px-4 flex flex-col items-center justify-center overflow-y-auto transition-colors duration-300 gap-6 relative">
        <PharmacyPortalBackground />

        {/* Floating Back Button */}
        <div className="absolute top-4 left-4 z-20">
          <Link
            to="/care"
            className="p-2.5 bg-white/90 dark:bg-[#0c0c14]/90 backdrop-blur-md border border-gray-200 dark:border-[#1e1e32] rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm flex items-center justify-center cursor-pointer"
            title="Back to Patient Care"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        {/* Floating Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={toggleTheme}
            className="p-2.5 bg-white/90 dark:bg-[#0c0c14]/90 backdrop-blur-md border border-gray-200 dark:border-[#1e1e32] rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4 text-gray-700" /> : <Sun className="w-4 h-4 text-yellow-400" />}
          </button>
        </div>

        <PharmacyOnboarding
          user={user}
          onboardForm={onboardForm}
          setOnboardForm={setOnboardForm}
          handleCompleteOnboarding={handleCompleteOnboarding}
          isOnboarding={isOnboarding}
        />
      </div>
    )
  }

  const handleOpenInspector = (order) => {
    setInspectingOrder(order)
    setBillAmount(order.estimated_amount ? String(order.estimated_amount) : '')
  }

  const handleStatusTransition = async (orderId, newStatus) => {
    setIsUpdatingStatus(true)
    const success = await updateOrderStatus(orderId, newStatus)
    setIsUpdatingStatus(false)
    if (success) {
      fetchOrders()
      if (inspectingOrder?.id === orderId) {
        setInspectingOrder(null)
      }
    }
  }

  const handleVerifyAndBill = async (e) => {
    e.preventDefault()
    if (!billAmount || parseFloat(billAmount) <= 0) {
      toast.error('Please enter valid medicine billing amount')
      return
    }

    setIsUpdatingStatus(true)
    try {
      const { supabase } = await import('../../lib/supabase')
      await supabase
        .from('care_medicine_orders')
        .update({
          estimated_amount: parseFloat(billAmount),
          order_status: 'rx_verified'
        })
        .eq('id', inspectingOrder.id)

      toast.success(`Rx Verified! Bill of ₹${billAmount} generated.`)
      setInspectingOrder(null)
      fetchOrders()
    } catch (err) {
      toast.error('Failed to update order')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    await updatePharmacyProfile({
      store_name: editStoreName,
      address: editAddress,
      phone: editPhone,
      drug_license_number: editLicense,
      registered_pharmacist_name: editPharmacist
    })
  }

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === 'all') return true
    return o.order_status === activeFilter
  })

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-teal-900/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-white text-base tracking-tight">OzoCare</span>
                <span className="text-[10px] font-display uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-teal-950 text-teal-400 border border-teal-800">
                  Chemist Station
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {pharmacy.store_name}
                {pharmacy.drug_license_number ? ` • Lic: ${pharmacy.drug_license_number}` : ''}
                {pharmacy.address ? ` • ${pharmacy.address}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" /> Licensed Dispenser
            </span>

            <button
              onClick={() => fetchOrders()}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh Orders"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 flex gap-6 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'orders'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Incoming Prescription Orders ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-teal-500 text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Drug License & Store Profile
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* STATS OVERVIEW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Awaiting Rx Review</span>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {orders.filter(o => o.order_status === 'rx_review').length}
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">Immediate Action</span>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Packing in Progress</span>
            <div className="text-2xl font-black text-indigo-400 mt-1">
              {orders.filter(o => o.order_status === 'packing' || o.order_status === 'rx_verified').length}
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">Preparing Dispatches</span>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rider Handover</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {orders.filter(o => o.order_status === 'ready_for_pickup').length}
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">Ready for Delivery</span>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Delivered Today</span>
            <div className="text-2xl font-black text-teal-400 mt-1">
              {orders.filter(o => o.order_status === 'delivered').length}
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">Fulfilled</span>
          </div>
        </div>

        {/* TAB 1: ORDERS LIST */}
        {activeTab === 'orders' && (
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                {['all', 'rx_review', 'rx_verified', 'packing', 'ready_for_pickup', 'delivered'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 rounded-xl font-bold capitalize transition-colors ${
                      activeFilter === filter
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {filter.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-400">
                Tap <strong>"Inspect Rx"</strong> to verify medicines & issue bill
              </span>
            </div>

            {/* Orders Feed */}
            {filteredOrders.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold">No prescription orders in this queue</p>
                <p className="text-xs text-slate-600 mt-1">Customer medicine orders will appear here in real-time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((ord) => (
                  <div 
                    key={ord.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">{ord.order_number}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                          {ord.order_status?.replace('_', ' ')}
                        </span>
                        {ord.estimated_amount > 0 && (
                          <span className="font-bold text-emerald-400 text-xs">
                            Bill: ₹{ord.estimated_amount}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 text-xs text-slate-400 space-y-0.5">
                        <p><strong>Patient:</strong> {ord.patient_name} • 📞 {ord.customer_phone}</p>
                        <p><strong>Address:</strong> {ord.delivery_address}</p>
                        {ord.notes && <p className="text-amber-400/90"><strong>Note:</strong> {ord.notes}</p>}
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => handleOpenInspector(ord)}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-teal-400" />
                        Inspect Rx
                      </button>

                      {ord.order_status === 'rx_review' && (
                        <button
                          onClick={() => handleOpenInspector(ord)}
                          className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
                        >
                          Verify & Bill
                        </button>
                      )}

                      {ord.order_status === 'rx_verified' && (
                        <button
                          onClick={() => handleStatusTransition(ord.id, 'packing')}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                        >
                          Mark as Packing
                        </button>
                      )}

                      {ord.order_status === 'packing' && (
                        <button
                          onClick={() => handleStatusTransition(ord.id, 'ready_for_pickup')}
                          className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5"
                        >
                          <Truck className="w-3.5 h-3.5" /> Ready for Rider
                        </button>
                      )}

                      {ord.order_status === 'ready_for_pickup' && (
                        <button
                          onClick={() => handleStatusTransition(ord.id, 'delivered')}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Mark Delivered
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PROFILE & DRUG LICENSING */}
        {activeTab === 'profile' && (
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 max-w-2xl mx-auto space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Chemist Shop & Licensing Verification</h3>
              <p className="text-xs text-slate-400 mt-1">
                State Drug Form 20/21 compliance details as required by Drugs and Cosmetics Act 1940.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">State Retail Drug License (Form 20 & 21)</label>
                <input 
                  type="text" 
                  value={editLicense} 
                  onChange={(e) => setEditLicense(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Registered Pharmacist Name & Reg No.</label>
                <input 
                  type="text" 
                  value={editPharmacist} 
                  onChange={(e) => setEditPharmacist(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Pharmacy / Chemist Shop Name</label>
                <input 
                  type="text" 
                  value={editStoreName} 
                  onChange={(e) => setEditStoreName(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Complete Store Address</label>
                <textarea 
                  rows={2}
                  value={editAddress} 
                  onChange={(e) => setEditAddress(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Shop Helpline Contact Number</label>
                <input 
                  type="tel" 
                  value={editPhone} 
                  onChange={(e) => setEditPhone(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md"
              >
                Save Store & License Info
              </button>
            </form>
          </div>
        )}
      </main>

      {/* PRESCRIPTION INSPECTOR MODAL */}
      {inspectingOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 rounded-3xl max-w-2xl w-full border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-white text-sm">
                  Prescription Inspection • {inspectingOrder.order_number}
                </h3>
              </div>
              <button 
                onClick={() => setInspectingOrder(null)} 
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
              {/* Order Info */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Customer</span>
                  <span className="font-bold text-white text-sm">{inspectingOrder.patient_name}</span>
                  <span className="text-slate-400 block mt-0.5">📞 {inspectingOrder.customer_phone}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase">Delivery To</span>
                  <span className="text-slate-200">{inspectingOrder.delivery_address}</span>
                </div>
              </div>

              {/* Prescription Image or Digital Rx */}
              {inspectingOrder.prescription_image_url ? (
                <div>
                  <span className="font-bold text-white block mb-2">Attached Prescription Image:</span>
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-black/40 p-2 text-center">
                    <img 
                      src={inspectingOrder.prescription_image_url} 
                      alt="Prescription" 
                      className="max-h-72 mx-auto object-contain rounded-lg"
                    />
                    <a 
                      href={inspectingOrder.prescription_image_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-teal-400 hover:underline"
                    >
                      <ZoomIn className="w-3.5 h-3.5" /> Open Full Resolution Image
                    </a>
                  </div>
                </div>
              ) : inspectingOrder.care_prescriptions ? (
                <div>
                  <span className="font-bold text-white block mb-2">Digital Prescription Details:</span>
                  <div className="border border-slate-800 rounded-xl p-4 bg-slate-900 space-y-2">
                    <p className="text-teal-400 font-bold">
                      Diagnosis: {inspectingOrder.care_prescriptions.diagnosis}
                    </p>
                    <div className="space-y-1">
                      {inspectingOrder.care_prescriptions.medicines?.map((m, idx) => (
                        <div key={idx} className="flex justify-between text-slate-300 border-b border-slate-800/60 pb-1">
                          <span>{m.name}</span>
                          <span className="font-mono text-emerald-400">{m.dosage} ({m.duration})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-center">
                  Prescription details pending customer attachment.
                </div>
              )}

              {/* Billing Form */}
              <form onSubmit={handleVerifyAndBill} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <span className="font-bold text-white block">Pharmacist Verification & Bill Generation</span>
                <div>
                  <label className="text-slate-400 block mb-1 text-[11px]">Calculated Medicine Amount (₹) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="Enter total medicine bill amount (e.g. 420.50)"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-sm focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md"
                >
                  {isUpdatingStatus ? 'Generating Bill...' : 'Verify Prescription & Approve Bill (Move to Packing)'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
