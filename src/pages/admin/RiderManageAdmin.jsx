import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings,
  Truck,
  Percent,
  Save,
  RefreshCw,
  Sliders,
  DollarSign,
  Info,
  Users,
  Bike,
  CheckCircle2,
  AlertCircle,
  MapPin,
  TrendingUp,
  Wallet,
  FileText,
  X,
  ExternalLink,
  Shield,
  Trash2,
  Edit,
  Activity,
  Check,
  CheckCircle,
  Clock,
  Star,
  Search,
  ChevronRight,
  Eye,
  Briefcase,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  ThumbsUp,
  ThumbsDown,
  UserCheck
} from 'lucide-react'
import { supabaseAdmin as supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { DELIVERY_DEFAULTS } from '../../config/deliveryDefaults'
import { useAuthStore } from '../../stores/authStore'

const RiderManageAdmin = () => {
  const [activeTab, setActiveTab] = useState('directory') // 'directory' | 'settings'
  const [captains, setCaptains] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'pending' | 'approved' | 'suspended' | 'online'
  
  // Selected captain details for modal/drawers
  const [selectedCaptain, setSelectedCaptain] = useState(null)
  const [showDocModal, setShowDocModal] = useState(false)
  const [showSettleModal, setShowSettleModal] = useState(false)
  const [settleAmount, setSettleAmount] = useState('')
  const [settleType, setSettleType] = useState('payout') // 'payout' (reduce earnings) | 'collect' (reduce cash_in_hand) | 'custom' (adjust manually)
  const [customEarnings, setCustomEarnings] = useState('')
  const [customCashInHand, setCustomCashInHand] = useState('')
  const [isSavingCaptain, setIsSavingCaptain] = useState(false)
  const [selectedCityId, setSelectedCityId] = useState('')
  const [cities, setCities] = useState([])

  const { profile } = useAuthStore()
  const isSuperAdmin = profile?.isSuperAdmin
  const isCityManager = profile?.isCityManager
  const managerCityId = profile?.roles?.find(r => r.role === 'city_manager')?.city_id
  const filteredCities = isSuperAdmin 
    ? cities 
    : cities.filter(city => city.id === managerCityId)

  // System settings state
  const [riderConfig, setRiderConfig] = useState({
    base_payout: 10,
    distance_bonus_per_km: 5,
    max_cash_limit: 2000
  })

  const [deliveryConfig, setDeliveryConfig] = useState({
    base_fee: 30,
    free_above: 250,
    surge_multiplier: 1.0,
    distance_charge_enabled: false,
    charge_per_km: 10,
    free_distance: 3
  })
  
  const [savingSettings, setSavingSettings] = useState(false)

  const fetchCaptains = async () => {
    try {
      setLoading(true)
      const { data: captainsData, error: captainsError } = await supabase
        .from('captains')
        .select('*')
        .order('created_at', { ascending: false })

      if (captainsError) throw captainsError

      if (captainsData && captainsData.length > 0) {
        const captainIds = captainsData.map(c => c.id)
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, city_id, id')
          .eq('role', 'rider')
          .in('user_id', captainIds)

        if (rolesError) throw rolesError

        const merged = captainsData.map(captain => {
          const roleEntry = rolesData?.find(r => r.user_id === captain.id)
          return {
            ...captain,
            city_id: roleEntry?.city_id || null,
            user_role_id: roleEntry?.id || null
          }
        })
        setCaptains(merged)
      } else {
        setCaptains([])
      }
    } catch (err) {
      console.error('Failed to fetch captains:', err)
      toast.error('Could not load Captains directory')
    } finally {
      setLoading(false)
    }
  }

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('operating_cities')
        .select('id, name')
        .order('name')
      if (error) throw error
      setCities(data || [])
    } catch (err) {
      console.error('Failed to fetch cities:', err)
    }
  }

  const fetchSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .in('key', ['rider_config', 'delivery_config'])

      if (error) throw error

      if (data) {
        data.forEach(item => {
          if (item.key === 'rider_config') {
            setRiderConfig(prev => ({ ...prev, ...item.value }))
          } else if (item.key === 'delivery_config') {
            setDeliveryConfig(prev => ({ ...prev, ...item.value }))
          }
        })
      }
    } catch (err) {
      console.error('Failed to fetch rider settings:', err)
    }
  }

  useEffect(() => {
    fetchCaptains()
    fetchCities()
    fetchSystemSettings()
  }, [])

  useEffect(() => {
    if (selectedCaptain) {
      setSelectedCityId(selectedCaptain.city_id || '')
    }
  }, [selectedCaptain])

  // Action: Approve Captain Onboarding
  const handleApproveCaptain = async (captainId) => {
    setIsSavingCaptain(true)
    const toastId = toast.loading('Approving Captain profile...')
    try {
      const { error: capError } = await supabase
        .from('captains')
        .update({ 
          status: 'offline',
          updated_at: new Date().toISOString()
        })
        .eq('id', captainId)

      if (capError) throw capError

      const { error: userError } = await supabase
        .from('users')
        .update({ role: 'captain' })
        .eq('id', captainId)

      if (userError) throw userError

      if (selectedCityId) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ city_id: selectedCityId })
          .eq('user_id', captainId)
          .eq('role', 'rider')

        if (roleError) throw roleError
      }

      toast.success('Captain approved successfully! Ready for duty.', { id: toastId })
      setShowDocModal(false)
      fetchCaptains()
    } catch (err) {
      console.error('Error approving captain:', err)
      toast.error(`Approve failed: ${err.message}`, { id: toastId })
    } finally {
      setIsSavingCaptain(false)
    }
  }

  // Action: Reject Captain Onboarding / Suspend
  const handleUpdateStatus = async (captainId, newStatus) => {
    setIsSavingCaptain(true)
    const toastId = toast.loading(`Updating Captain status to ${newStatus}...`)
    try {
      const { error } = await supabase
        .from('captains')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', captainId)

      if (error) throw error
      toast.success(`Captain status updated to ${newStatus}`, { id: toastId })
      setShowDocModal(false)
      fetchCaptains()
    } catch (err) {
      console.error('Error updating captain status:', err)
      toast.error(`Failed to update: ${err.message}`, { id: toastId })
    } finally {
      setIsSavingCaptain(false)
    }
  }

  const handleUpdateCity = async (captainId, newCityId) => {
    setIsSavingCaptain(true)
    const toastId = toast.loading('Updating Captain city...')
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ city_id: newCityId })
        .eq('user_id', captainId)
        .eq('role', 'rider')

      if (error) throw error
      toast.success('Captain city updated successfully!', { id: toastId })
      setShowDocModal(false)
      fetchCaptains()
    } catch (err) {
      console.error('Error updating captain city:', err)
      toast.error(`Update failed: ${err.message}`, { id: toastId })
    } finally {
      setIsSavingCaptain(false)
    }
  }

  // Action: Settle earnings/cash balance
  const handleSettleBalance = async (e) => {
    e.preventDefault()
    if (!selectedCaptain) return

    setIsSavingCaptain(true)
    const toastId = toast.loading('Processing balance settlement...')
    try {
      let finalEarnings = parseFloat(selectedCaptain.earnings || 0)
      let finalCash = parseFloat(selectedCaptain.cash_in_hand || 0)

      if (settleType === 'payout') {
        const amount = parseFloat(settleAmount)
        if (isNaN(amount) || amount <= 0) {
          toast.error('Please enter a valid amount')
          return
        }
        if (amount > finalEarnings) {
          toast.error('Payout amount cannot exceed current earnings')
          return
        }
        finalEarnings -= amount
      } else if (settleType === 'collect') {
        const amount = parseFloat(settleAmount)
        if (isNaN(amount) || amount <= 0) {
          toast.error('Please enter a valid amount')
          return
        }
        if (amount > finalCash) {
          toast.error('Collected cash cannot exceed Cash in Hand limit')
          return
        }
        finalCash -= amount
      } else if (settleType === 'custom') {
        finalEarnings = parseFloat(customEarnings)
        finalCash = parseFloat(customCashInHand)
        if (isNaN(finalEarnings) || isNaN(finalCash)) {
          toast.error('Invalid values provided')
          return
        }
      }

      const { error } = await supabase
        .from('captains')
        .update({
          earnings: finalEarnings,
          cash_in_hand: finalCash,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCaptain.id)

      if (error) throw error
      
      toast.success('Rider wallet balanced settled successfully!', { id: toastId })
      setShowSettleModal(false)
      setSettleAmount('')
      fetchCaptains()
    } catch (err) {
      console.error('Failed to settle balance:', err)
      toast.error(`Settlement failed: ${err.message}`, { id: toastId })
    } finally {
      setIsSavingCaptain(false)
    }
  }

  // Action: Save System Configuration
  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSavingSettings(true)
    const toastId = toast.loading('Saving configurations to database...')
    try {
      const { error: err1 } = await supabase
        .from('app_settings')
        .upsert({
          key: 'rider_config',
          value: {
            base_payout: parseFloat(riderConfig.base_payout) || 0,
            distance_bonus_per_km: parseFloat(riderConfig.distance_bonus_per_km) || 0,
            max_cash_limit: parseFloat(riderConfig.max_cash_limit) || 0
          },
          description: 'Fleet and payout configuration for OZO Captains'
        })
      if (err1) throw err1

      const { error: err2 } = await supabase
        .from('app_settings')
        .upsert({
          key: 'delivery_config',
          value: {
            base_fee: parseFloat(deliveryConfig.base_fee) || 0,
            free_above: parseFloat(deliveryConfig.free_above) || 0,
            surge_multiplier: parseFloat(deliveryConfig.surge_multiplier) || 1,
            distance_charge_enabled: !!deliveryConfig.distance_charge_enabled,
            charge_per_km: parseFloat(deliveryConfig.charge_per_km) || 0,
            free_distance: parseFloat(deliveryConfig.free_distance) || 0,
            store_lat: parseFloat(deliveryConfig.store_lat) || DELIVERY_DEFAULTS.store_lat,
            store_lng: parseFloat(deliveryConfig.store_lng) || DELIVERY_DEFAULTS.store_lng
          },
          description: 'Configuration for delivery charges'
        })
      if (err2) throw err2

      toast.success('Rider configuration and rates saved successfully!', { id: toastId })
      fetchSystemSettings()
    } catch (err) {
      console.error('Failed to save settings:', err)
      toast.error(`Failed to save settings: ${err.message}`, { id: toastId })
    } finally {
      setSavingSettings(false)
    }
  }

  const filteredCaptains = captains.filter(c => {
    const searchString = `${c.full_name || ''} ${c.phone || ''} ${c.bike_number || ''} ${c.driving_license || ''}`.toLowerCase()
    const matchesSearch = searchString.includes(searchQuery.toLowerCase())

    if (filterStatus === 'all') return matchesSearch
    if (filterStatus === 'pending') return matchesSearch && (c.status === 'pending' || !c.driving_license)
    if (filterStatus === 'approved') return matchesSearch && c.status !== 'pending' && c.status !== 'suspended'
    if (filterStatus === 'suspended') return matchesSearch && c.status === 'suspended'
    if (filterStatus === 'online') return matchesSearch && (c.status === 'online' || c.status === 'busy')
    return matchesSearch
  })

  const totalRiders = captains.length
  const activeOnline = captains.filter(c => c.status === 'online' || c.status === 'busy').length
  const pendingVerify = captains.filter(c => c.status === 'pending' || (!c.driving_license && c.aadhar_card_url)).length
  const suspendedCount = captains.filter(c => c.status === 'suspended').length

  return (
    <div className="space-y-8 max-w-7xl mx-auto text-gray-900 dark:text-white">
      {/* Banner */}
      <div className="p-8 bg-gradient-ozo text-white rounded-[2rem] shadow-premium relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center justify-center pointer-events-none">
          <Bike className="w-80 h-80 rotate-12 translate-x-12 translate-y-12 text-white" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="bg-white/20 text-white font-bold text-xs uppercase tracking-widest px-3.5 py-1 rounded-full">
              OZO Fleet Administration
            </span>
            <h1 className="text-3xl sm:text-4xl font-black mt-4 leading-tight font-sans">
              Rider Management & Settings
            </h1>
            <p className="mt-2 text-white/85 text-sm max-w-xl font-medium leading-relaxed">
              Verify documents of newly registered captains, adjust individual rider wallets, update payout base rates, per-kilometer mileage bonuses, and client delivery fees.
            </p>
          </div>
          <button
            onClick={() => {
              fetchCaptains()
              fetchSystemSettings()
            }}
            disabled={loading}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white px-5 py-3 rounded-2xl font-bold text-xs active:scale-95 transition-all self-start md:self-center disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Sync Database
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium flex items-center gap-4 hover:-translate-y-0.5 transition-transform">
          <div className="p-4 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Captains</p>
            <h3 className="text-3xl font-black font-mono leading-none mt-1.5">{totalRiders}</h3>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium flex items-center gap-4 hover:-translate-y-0.5 transition-transform">
          <div className="p-4 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-2xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Online Right Now</p>
            <h3 className="text-3xl font-black font-mono leading-none mt-1.5 text-emerald-650 dark:text-[#00FF66]">{activeOnline}</h3>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium flex items-center gap-4 hover:-translate-y-0.5 transition-transform relative">
          <div className="p-4 bg-amber-100 dark:bg-amber-900/20 text-amber-650 dark:text-amber-400 rounded-2xl relative">
            <FileText className="w-6 h-6" />
            {pendingVerify > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
            )}
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Verification Pending</p>
            <h3 className="text-3xl font-black font-mono leading-none mt-1.5 text-amber-650 dark:text-amber-400">{pendingVerify}</h3>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium flex items-center gap-4 hover:-translate-y-0.5 transition-transform">
          <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-2xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Suspended Accounts</p>
            <h3 className="text-3xl font-black font-mono leading-none mt-1.5 text-red-600 dark:text-red-400">{suspendedCount}</h3>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-gray-200 dark:border-white/5">
        <button
          onClick={() => setActiveTab('directory')}
          className={`px-6 py-3 font-bold text-xs uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'directory'
              ? 'border-ozo-red text-ozo-red dark:text-[#FF6B6B]'
              : 'border-transparent text-gray-400 hover:text-gray-905 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Captains Directory
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-3 font-bold text-xs uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'border-ozo-red text-ozo-red dark:text-[#FF6B6B]'
              : 'border-transparent text-gray-400 hover:text-gray-905 dark:hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          Payout & Commission Rates
        </button>
      </div>

      {/* Directory Tab View */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/5 p-5 rounded-[2rem] shadow-premium">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, phone, plate..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ozo-red transition-all"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap items-center w-full sm:w-auto justify-end">
              {[
                { label: 'All', value: 'all' },
                { label: 'Pending Docs', value: 'pending' },
                { label: 'Online / Active', value: 'online' },
                { label: 'Approved', value: 'approved' },
                { label: 'Suspended', value: 'suspended' }
              ].map((btn) => (
                <button
                  key={btn.value}
                  onClick={() => setFilterStatus(btn.value)}
                  className={`px-4.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                    filterStatus === btn.value
                      ? 'bg-gradient-ozo border-transparent text-white shadow-ozo'
                      : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.03] hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Directory Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-12 h-12 border-4 border-ozo-red border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-gray-405 dark:text-gray-400 font-bold uppercase tracking-wider animate-pulse">Syncing directory...</p>
            </div>
          ) : filteredCaptains.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-premium">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">No Captains Found</h4>
              <p className="text-xs text-gray-400 mt-1">Try resetting the status filter or search parameters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCaptains.map((captain) => {
                const totalEarnings = parseFloat(captain.earnings || 0)
                const cashInHand = parseFloat(captain.cash_in_hand || 0)
                const netSettlement = totalEarnings - cashInHand
                const isDocPending = captain.status === 'pending' || !captain.driving_license

                return (
                  <div 
                    key={captain.id}
                    className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/5 hover:border-ozo-red/20 dark:hover:border-ozo-red/20 rounded-[2rem] p-6 flex flex-col justify-between shadow-premium hover:shadow-premium-lg transition-all duration-300 relative overflow-hidden group"
                  >
                    {/* Status indicator bar */}
                    <div className={`absolute top-0 inset-x-0 h-1.5 transition-all ${
                      captain.status === 'online' || captain.status === 'busy' ? 'bg-[#00FF66]' :
                      captain.status === 'offline' ? 'bg-blue-500' :
                      captain.status === 'suspended' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />

                    <div>
                      {/* Card Header */}
                      <div className="flex items-center justify-between gap-2 mb-5">
                        <div className="flex items-center gap-3">
                          {captain.selfie_url ? (
                            <img 
                              src={captain.selfie_url} 
                              alt={captain.full_name} 
                              className="w-12 h-12 rounded-full object-cover border border-gray-250 dark:border-white/10"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/20 text-ozo-red dark:text-[#FF6B6B] flex items-center justify-center font-extrabold text-sm uppercase border border-red-500/15">
                              {captain.full_name?.slice(0, 2) || 'CP'}
                            </div>
                          )}
                          <div>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5 leading-none">
                              {captain.full_name || 'Anonymous Captain'}
                              {captain.status !== 'pending' && captain.status !== 'suspended' && (
                                <Shield className="w-3.5 h-3.5 text-blue-500" title="Verified Captain" />
                              )}
                            </h4>
                            <p className="text-[10px] text-gray-400 font-bold mt-1.5 font-mono">{captain.phone}</p>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                          captain.status === 'online' ? 'bg-[#00FF66]/10 text-emerald-650 dark:text-[#00FF66] border-emerald-500/20' :
                          captain.status === 'busy' ? 'bg-amber-500/10 text-amber-650 dark:text-amber-400 border-amber-500/20 animate-pulse' :
                          captain.status === 'suspended' ? 'bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/20' :
                          captain.status === 'pending' ? 'bg-amber-500/10 text-amber-650 dark:text-amber-400 border-amber-500/20' :
                          'bg-gray-100 dark:bg-white/5 text-gray-405 border-gray-200 dark:border-white/5'
                        }`}>
                          {captain.status}
                        </span>
                      </div>

                      {/* Detail stats */}
                      <div className="grid grid-cols-2 gap-3 mb-5 bg-gray-50/50 dark:bg-white/[0.01] rounded-2xl border border-gray-150/60 dark:border-white/5 p-4 text-xs">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">Bike Number</span>
                          <span className="font-extrabold text-gray-800 dark:text-gray-200 uppercase font-mono tracking-wider">
                            {captain.bike_number || 'No Plate #'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">DL License</span>
                          <span className="font-extrabold text-gray-800 dark:text-gray-200 uppercase font-mono truncate block">
                            {captain.driving_license || 'No DL #'}
                          </span>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-gray-150 dark:border-white/5 flex items-center justify-between">
                          <span className="text-[9px] uppercase font-bold text-gray-450">City</span>
                          <span className="font-extrabold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-450" />
                            {cities.find(city => city.id === captain.city_id)?.name || (
                              <span className="text-amber-500 font-bold">Unassigned (Pending)</span>
                            )}
                          </span>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-gray-150 dark:border-white/5 flex items-center justify-between">
                          <span className="text-[9px] uppercase font-bold text-gray-450">Rating</span>
                          <span className="flex items-center gap-1 font-extrabold text-gray-800 dark:text-gray-200">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                            {parseFloat(captain.rating || 5).toFixed(1)}
                          </span>
                        </div>
                      </div>

                      {/* Financial info */}
                      <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-150 dark:border-white/5 rounded-2xl p-4 text-xs space-y-2.5 mb-5">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-medium">Total Earnings:</span>
                          <span className="font-bold text-green-600 dark:text-green-400">₹{totalEarnings.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-medium">Cash in Hand (COD):</span>
                          <span className={`font-bold ${cashInHand >= riderConfig.max_cash_limit ? 'text-red-500 animate-pulse font-black' : 'text-gray-700 dark:text-gray-300'}`}>
                            ₹{cashInHand.toFixed(2)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-gray-150 dark:border-white/5 flex justify-between items-center font-bold">
                          <span className="text-[10px] text-gray-450 uppercase">Settlement:</span>
                          {netSettlement >= 0 ? (
                            <span className="text-green-600 dark:text-green-400 text-[10px] uppercase">Pay Rider: ₹{netSettlement.toFixed(2)}</span>
                          ) : (
                            <span className="text-red-500 text-[10px] uppercase font-black">Collect: ₹{Math.abs(netSettlement).toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions bar */}
                    <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
                      <button
                        onClick={() => {
                          setSelectedCaptain(captain)
                          setShowDocModal(true)
                        }}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 ${
                          isDocPending
                            ? 'bg-amber-500 text-black border-transparent hover:shadow-lg hover:shadow-amber-500/15'
                            : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-650 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {isDocPending ? 'Verify / Setup' : 'Docs'}
                      </button>

                      <button
                        onClick={() => {
                          setSelectedCaptain(captain)
                          setCustomEarnings(parseFloat(captain.earnings || 0).toString())
                          setCustomCashInHand(parseFloat(captain.cash_in_hand || 0).toString())
                          setShowSettleModal(true)
                        }}
                        className="px-5 py-2.5 bg-gradient-ozo hover:opacity-90 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-ozo"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        Settle
                      </button>

                      {captain.status !== 'suspended' ? (
                        <button
                          onClick={() => handleUpdateStatus(captain.id, 'suspended')}
                          className="p-2.5 border border-red-500/20 hover:border-red-500/40 text-red-500 rounded-xl hover:bg-red-500/5 transition-all"
                          title="Suspend Captain"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(captain.id, 'offline')}
                          className="p-2.5 border border-green-500/20 hover:border-green-500/40 text-emerald-600 dark:text-[#00FF66] rounded-xl hover:bg-green-500/5 transition-all"
                          title="Reactivate Captain"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab View */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-8 max-w-4xl animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* OZO Captain Settings Card */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-premium space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3.5 bg-red-100 dark:bg-red-950/20 text-ozo-red rounded-2xl border border-red-500/10">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-800 dark:text-white">Rider Payout Settings</h2>
                  <p className="text-xs text-gray-400">Payout commissions for delivery agents</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-450 dark:text-gray-400 uppercase mb-2">
                    Base Order Payout (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={riderConfig.base_payout}
                      onChange={e => setRiderConfig({ ...riderConfig, base_payout: parseFloat(e.target.value) || 0 })}
                      className="pl-8 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">Guaranteed base payment to a rider for accepting and completing a delivery.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-455 dark:text-gray-400 uppercase mb-2">
                    Distance Mileage Bonus (₹/km)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={riderConfig.distance_bonus_per_km}
                      onChange={e => setRiderConfig({ ...riderConfig, distance_bonus_per_km: parseFloat(e.target.value) || 0 })}
                      className="pl-8 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">Extra bonus cash paid per km traveled from mart coordinates to customer address.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-455 dark:text-gray-400 uppercase mb-2">
                    Max COD cash Limit (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={riderConfig.max_cash_limit}
                      onChange={e => setRiderConfig({ ...riderConfig, max_cash_limit: parseFloat(e.target.value) || 0 })}
                      className="pl-8 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">Maximum cash amount collected from COD orders a captain is allowed to hold before being blocked from taking new tasks.</p>
                </div>
              </div>
            </div>

            {/* Delivery Fee Settings Card */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-premium space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3.5 bg-red-100 dark:bg-red-950/20 text-ozo-red rounded-2xl border border-red-500/10">
                  <Percent className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-800 dark:text-white">Customer Delivery Fees</h2>
                  <p className="text-xs text-gray-400">Configure client billing and margins</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-455 dark:text-gray-400 uppercase mb-2">
                    Customer Base Delivery Fee (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={deliveryConfig.base_fee}
                      onChange={e => setDeliveryConfig({ ...deliveryConfig, base_fee: parseFloat(e.target.value) || 0 })}
                      className="pl-8 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-455 dark:text-gray-400 uppercase mb-2">
                    Free Delivery Threshold (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={deliveryConfig.free_above}
                      onChange={e => setDeliveryConfig({ ...deliveryConfig, free_above: parseFloat(e.target.value) || 0 })}
                      className="pl-8 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Orders with a subtotal above this value receive free delivery.</p>
                </div>

                <div className="pt-3 border-t border-gray-150 dark:border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-800 dark:text-white">Enable Distance Charges</p>
                      <p className="text-[10px] text-gray-400">Surcharge customers who live far from OZO Mart.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!deliveryConfig.distance_charge_enabled}
                        onChange={e => setDeliveryConfig({ ...deliveryConfig, distance_charge_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {deliveryConfig.distance_charge_enabled && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                          Charge/km (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={deliveryConfig.charge_per_km}
                          onChange={e => setDeliveryConfig({ ...deliveryConfig, charge_per_km: parseFloat(e.target.value) || 0 })}
                          className="px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold animate-fadeIn"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                          Free distance (km)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={deliveryConfig.free_distance}
                          onChange={e => setDeliveryConfig({ ...deliveryConfig, free_distance: parseFloat(e.target.value) || 0 })}
                          className="px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold animate-fadeIn"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-8 py-4 bg-gradient-to-r bg-gradient-ozo text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-ozo hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {savingSettings ? (
                <>Saving Rates...</>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save configurations
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Modal: Document Lightbox / Verification Form */}
      <AnimatePresence>
        {showDocModal && selectedCaptain && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDocModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Content Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/5 rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl z-10"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowDocModal(false)}
                className="absolute top-5 right-5 p-2 rounded-full bg-gray-100 hover:bg-gray-250 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 hover:text-gray-700 dark:hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-red-500" />
                    Verify Captain Onboarding Documents
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Review images uploaded by <strong>{selectedCaptain.full_name}</strong>. Check plate matches and license details match the inputs.
                  </p>
                </div>

                {/* Personal summary info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-white/[0.01] rounded-2xl border border-gray-100 dark:border-white/5 text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-405 block mb-0.5">Full Name</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{selectedCaptain.full_name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-405 block mb-0.5">Phone Contact</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{selectedCaptain.phone}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-405 block mb-0.5">Aadhar Card Number</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200 font-mono">
                      {selectedCaptain.aadhar_number || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-405 block mb-0.5">Driving License</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200 uppercase font-mono">
                      {selectedCaptain.driving_license || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* City Assignment Selection */}
                <div className="p-5 bg-red-50/10 dark:bg-white/[0.02] border border-gray-150 dark:border-white/5 rounded-2xl space-y-3">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                    City Assignment Scoping
                  </span>
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="w-full sm:flex-1">
                      <select
                        value={selectedCityId}
                        onChange={(e) => setSelectedCityId(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ozo-red"
                      >
                        <option value="" disabled className="text-gray-405">Select operational city for scoping...</option>
                        {filteredCities.map(city => (
                          <option key={city.id} value={city.id} className="text-gray-900 dark:text-black">
                            {city.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-full sm:w-auto text-xs text-gray-400 italic">
                      {selectedCaptain.city_id 
                        ? 'Update scoping to transfer rider to another city.' 
                        : 'Must assign an operational city to complete onboarding.'}
                    </div>
                  </div>
                </div>

                {/* Document images */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Selfie */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                      1. Selfie Image
                    </span>
                    <div className="h-56 bg-gray-100 dark:bg-black/35 border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden flex items-center justify-center relative group/img">
                      {selectedCaptain.selfie_url ? (
                        <>
                          <img 
                            src={selectedCaptain.selfie_url} 
                            alt="Selfie" 
                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                          />
                          <a 
                            href={selectedCaptain.selfie_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="absolute bottom-3 right-3 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No selfie uploaded</span>
                      )}
                    </div>
                  </div>

                  {/* Aadhar */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-red-500" />
                      2. Aadhar Card
                    </span>
                    <div className="h-56 bg-gray-100 dark:bg-black/35 border border-gray-250 dark:border-white/5 rounded-2xl overflow-hidden flex items-center justify-center relative group/img">
                      {selectedCaptain.aadhar_card_url ? (
                        <>
                          <img 
                            src={selectedCaptain.aadhar_card_url} 
                            alt="Aadhar Card" 
                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                          />
                          <a 
                            href={selectedCaptain.aadhar_card_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="absolute bottom-3 right-3 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No Aadhar uploaded</span>
                      )}
                    </div>
                  </div>

                  {/* Driving License */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-purple-500" />
                      3. Driving License
                    </span>
                    <div className="h-56 bg-gray-100 dark:bg-black/35 border border-gray-250 dark:border-white/5 rounded-2xl overflow-hidden flex items-center justify-center relative group/img">
                      {selectedCaptain.driving_license_url ? (
                        <>
                          <img 
                            src={selectedCaptain.driving_license_url} 
                            alt="Driving License" 
                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                          />
                          <a 
                            href={selectedCaptain.driving_license_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="absolute bottom-3 right-3 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No license uploaded</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Verification decision footer */}
                <div className="pt-6 border-t border-gray-150 dark:border-white/5 flex flex-col sm:flex-row gap-3 justify-end items-center">
                  {selectedCaptain.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(selectedCaptain.id, 'suspended')}
                        disabled={isSavingCaptain}
                        className="w-full sm:w-auto px-5 py-3 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                      >
                        <ThumbsDown className="w-4 h-4" /> Reject / Suspend Captain
                      </button>

                      <button
                        onClick={() => handleApproveCaptain(selectedCaptain.id)}
                        disabled={isSavingCaptain || !selectedCaptain.driving_license || !selectedCityId}
                        className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r bg-gradient-ozo text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-ozo hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
                      >
                        <ThumbsUp className="w-4 h-4" /> Approve Captain Profile
                      </button>
                    </>
                  ) : (
                    <>
                      {selectedCaptain.status !== 'suspended' && (
                        <button
                          onClick={() => handleUpdateStatus(selectedCaptain.id, 'suspended')}
                          disabled={isSavingCaptain}
                          className="w-full sm:w-auto px-5 py-3 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                        >
                          <ShieldAlert className="w-4 h-4" /> Suspend Captain
                        </button>
                      )}
                      {selectedCityId !== (selectedCaptain.city_id || '') && (
                        <button
                          onClick={() => handleUpdateCity(selectedCaptain.id, selectedCityId)}
                          disabled={isSavingCaptain || !selectedCityId}
                          className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r bg-gradient-ozo text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-ozo hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40"
                        >
                          <Save className="w-4 h-4" /> Save City Assignment
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Settle Wallet Balance Form */}
      <AnimatePresence>
        {showSettleModal && selectedCaptain && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettleModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Form Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/5 rounded-[2rem] w-full max-w-md p-6 sm:p-8 shadow-2xl z-10"
            >
              <button
                onClick={() => setShowSettleModal(false)}
                className="absolute top-5 right-5 p-2 rounded-full bg-gray-100 hover:bg-gray-250 dark:bg-white/5 dark:hover:bg-white/10 text-gray-550 hover:text-gray-700 dark:hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <form onSubmit={handleSettleBalance} className="space-y-5">
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-red-500" />
                    Settle Rider Account
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Balance rider earnings or deduct cash-in-hand collectibles for <strong>{selectedCaptain.full_name}</strong>.
                  </p>
                </div>

                {/* Quick stats banner */}
                <div className="p-4 bg-gray-50 dark:bg-white/[0.01] rounded-2xl border border-gray-100 dark:border-white/5 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-450 block">Current Earnings</span>
                    <span className="font-bold text-green-600 dark:text-green-400 text-sm">
                      ₹{parseFloat(selectedCaptain.earnings || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-455 block">Cash in Hand (COD)</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                      ₹{parseFloat(selectedCaptain.cash_in_hand || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Settle Type Toggle */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Payout', value: 'payout' },
                    { label: 'Cash Coll.', value: 'collect' },
                    { label: 'Manual Adj.', value: 'custom' }
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setSettleType(item.value)}
                      className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                        settleType === item.value
                          ? 'bg-gradient-ozo border-transparent text-white shadow-ozo'
                          : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.03] hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {settleType !== 'custom' ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-450 dark:text-gray-400 uppercase mb-2">
                      {settleType === 'payout' ? 'Payout Amount (₹)' : 'Collected COD Cash (₹)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={settleAmount}
                        onChange={e => setSettleAmount(e.target.value)}
                        className="pl-8 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5 leading-normal">
                      {settleType === 'payout'
                        ? 'Deducts from rider earnings. Settle this after bank transferring their payout.'
                        : 'Deducts from rider COD Cash in hand. Settle this after the rider hands over cash to warehouse.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-450 dark:text-gray-400 uppercase mb-2">
                        Override Total Earnings (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={customEarnings}
                        onChange={e => setCustomEarnings(e.target.value)}
                        className="px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-450 dark:text-gray-400 uppercase mb-2">
                        Override COD Cash in Hand (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={customCashInHand}
                        onChange={e => setCustomCashInHand(e.target.value)}
                        className="px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-250 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowSettleModal(false)}
                    disabled={isSavingCaptain}
                    className="w-1/3 border border-gray-200 dark:border-white/5 text-gray-450 hover:text-gray-700 dark:hover:text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingCaptain}
                    className="w-2/3 bg-gradient-ozo text-white font-black py-3.5 rounded-xl text-xs flex items-center justify-center gap-1 hover:opacity-90 transition-all shadow-ozo disabled:opacity-50"
                  >
                    {isSavingCaptain ? (
                      <>Processing...</>
                    ) : (
                      <>Confirm Settlement <Check className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default RiderManageAdmin
