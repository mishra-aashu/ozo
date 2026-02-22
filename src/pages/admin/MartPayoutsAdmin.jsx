import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Store,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  Sliders,
  ChevronRight,
  X,
  FileText,
  HelpCircle,
  CreditCard,
  Plus,
  ArrowRight,
  Filter,
  Check,
  Edit2
} from 'lucide-react'
import { supabaseAdmin as supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const MartPayoutsAdmin = () => {
  const [marts, setMarts] = useState([])
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  // Drawer for store payout management
  const [selectedMart, setSelectedMart] = useState(null)
  const [martOrders, setMartOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState([]) // Array of order IDs selected for bulk payout

  // Adjustment Modal
  const [editingOrder, setEditingOrder] = useState(null)
  const [adjustmentValue, setAdjustmentValue] = useState('')
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false)

  // Payout action state
  const [payoutRef, setPayoutRef] = useState('')
  const [submittingPayout, setSubmittingPayout] = useState(false)

  // Statistics
  const [stats, setStats] = useState({
    totalEarnings: 0,
    paidEarnings: 0,
    unpaidEarnings: 0,
    adjustmentsCount: 0
  })

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('operating_cities')
        .select('*')
        .eq('is_active', true)
      if (error) throw error
      setCities(data || [])
    } catch (err) {
      console.error('Error fetching cities:', err)
    }
  }

  const fetchMartsData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      // 1. Fetch marts
      const { data: martsData, error: martsError } = await supabase
        .from('marts')
        .select(`
          *,
          operating_cities!marts_city_id_fkey (name),
          users!marts_owner_id_fkey (full_name, email, phone)
        `)
      if (martsError) throw martsError

      // 2. Fetch all completed/delivered orders to compute payouts
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, mart_id, total, status, mart_payout_status, mart_earning_adjustment')
        .in('status', ['COMPLETED', 'delivered'])

      if (ordersError) throw ordersError

      // 3. Map aggregates
      let globalTotal = 0
      let globalPaid = 0
      let globalUnpaid = 0
      let globalAdjustments = 0

      const processedMarts = (martsData || []).map(mart => {
        const storeOrders = (ordersData || []).filter(o => o.mart_id === mart.id)
        
        let grossSales = 0
        let totalAdjustments = 0
        let paidAmount = 0
        let unpaidAmount = 0
        let unpaidCount = 0

        storeOrders.forEach(order => {
          const totalVal = parseFloat(order.total || 0)
          const adjVal = parseFloat(order.mart_earning_adjustment || 0)
          const netEarning = totalVal + adjVal

          grossSales += totalVal
          totalAdjustments += adjVal

          if (order.mart_payout_status === 'paid') {
            paidAmount += netEarning
            globalPaid += netEarning
          } else {
            unpaidAmount += netEarning
            globalUnpaid += netEarning
            unpaidCount++
          }

          globalTotal += netEarning
          if (adjVal !== 0) globalAdjustments++
        })

        return {
          ...mart,
          completedOrdersCount: storeOrders.length,
          grossSales,
          netEarnings: grossSales + totalAdjustments,
          paidAmount,
          unpaidAmount,
          unpaidCount,
          totalAdjustments
        }
      })

      setStats({
        totalEarnings: globalTotal,
        paidEarnings: globalPaid,
        unpaidEarnings: globalUnpaid,
        adjustmentsCount: globalAdjustments
      })

      setMarts(processedMarts)
    } catch (err) {
      console.error('Error fetching marts financial dashboard:', err)
      toast.error('Failed to load financial records')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchCities()
    fetchMartsData()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchMartsData(true)
    if (selectedMart) {
      loadMartOrders(selectedMart.id)
    }
  }

  const loadMartOrders = async (martId) => {
    setLoadingOrders(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total,
          status,
          payment_method,
          payment_status,
          created_at,
          mart_payout_status,
          mart_earning_adjustment,
          mart_payout_date,
          mart_payout_reference,
          users!orders_user_id_fkey (full_name)
        `)
        .eq('mart_id', martId)
        .in('status', ['COMPLETED', 'delivered'])
        .order('created_at', { ascending: false })

      if (error) throw error
      setMartOrders(data || [])
      setSelectedOrders([]) // reset selections
    } catch (err) {
      console.error('Error loading store orders:', err)
      toast.error('Could not load store orders list')
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleOpenManage = (mart) => {
    setSelectedMart(mart)
    setIsDrawerOpen(true)
    loadMartOrders(mart.id)
  }

  const toggleSelectOrder = (orderId) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId))
    } else {
      setSelectedOrders([...selectedOrders, orderId])
    }
  }

  const toggleSelectAllUnpaid = () => {
    const unpaidOrderIds = martOrders
      .filter(o => o.mart_payout_status !== 'paid')
      .map(o => o.id)

    if (selectedOrders.length === unpaidOrderIds.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(unpaidOrderIds)
    }
  }

  const handleSaveAdjustment = async () => {
    if (!editingOrder) return
    const amount = parseFloat(adjustmentValue)
    if (isNaN(amount)) {
      toast.error('Please enter a valid numeric value')
      return
    }

    const toastId = toast.loading('Applying adjustment to database...')
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          mart_earning_adjustment: amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingOrder.id)

      if (error) throw error
      toast.success('Earnings adjustment applied successfully!', { id: toastId })
      setIsAdjustmentModalOpen(false)
      setEditingOrder(null)
      
      // Reload orders and dashboard statistics
      if (selectedMart) {
        loadMartOrders(selectedMart.id)
      }
      fetchMartsData(true)
    } catch (err) {
      console.error('Error applying adjustment:', err)
      toast.error(`Adjustment failed: ${err.message}`, { id: toastId })
    }
  }

  const handleMarkPayout = async (isCashDirect = false) => {
    if (selectedOrders.length === 0) {
      toast.error('Please select at least one order to settle')
      return
    }

    setSubmittingPayout(true)
    const refText = isCashDirect ? 'CASH_HAND_TO_HAND' : (payoutRef.trim() || 'CASH/ADMIN_DIRECT')
    const toastId = toast.loading(`Settling ${selectedOrders.length} orders...`)
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          mart_payout_status: 'paid',
          mart_payout_date: new Date().toISOString(),
          mart_payout_reference: refText,
          updated_at: new Date().toISOString()
        })
        .in('id', selectedOrders)

      if (error) throw error

      toast.success(`Successfully settled payout for ${selectedOrders.length} orders!`, { id: toastId })
      setPayoutRef('')
      setSelectedOrders([])

      // Reload
      if (selectedMart) {
        loadMartOrders(selectedMart.id)
      }
      fetchMartsData(true)
    } catch (err) {
      console.error('Payout failed:', err)
      toast.error(`Payout settlement failed: ${err.message}`, { id: toastId })
    } finally {
      setSubmittingPayout(false)
    }
  }

  const handleResetPayoutStatus = async (orderId) => {
    const confirmReset = window.confirm('Are you sure you want to mark this order as UNPAID?')
    if (!confirmReset) return

    const toastId = toast.loading('Reverting payout status...')
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          mart_payout_status: 'unpaid',
          mart_payout_date: null,
          mart_payout_reference: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error

      toast.success('Payout status set to unpaid!', { id: toastId })
      if (selectedMart) {
        loadMartOrders(selectedMart.id)
      }
      fetchMartsData(true)
    } catch (err) {
      console.error('Failed to reset payout:', err)
      toast.error(`Failed: ${err.message}`, { id: toastId })
    }
  }

  // Filters
  const filteredMarts = margs => margs.filter(mart => {
    const matchesSearch = mart.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          mart.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          mart.slug?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCity = selectedCity === 'all' || mart.city_slug === selectedCity
    return matchesSearch && matchesCity
  })

  const filteredMartsList = filteredMarts(marts)

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight flex items-center gap-2.5">
            <DollarSign className="w-7 h-7 text-ozo-red" />
            Mart Earnings & Payouts
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Monitor dark store earnings, manually adjust payouts, and settle orders with UPI/Bank reference records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-650 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition-all flex items-center gap-1.5 text-xs font-black uppercase tracking-wider disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium flex items-center gap-4">
          <div className="p-3.5 bg-red-50 dark:bg-red-950/20 text-ozo-red rounded-2xl border border-red-500/10">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase block tracking-wider">Total Net Earnings</span>
            <span className="text-xl font-black text-gray-850 dark:text-white block mt-0.5">
              ₹{stats.totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-2xl border border-emerald-500/10">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase block tracking-wider">Total Paid Payouts</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-450 block mt-0.5">
              ₹{stats.paidEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-2xl border border-amber-500/10">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase block tracking-wider">Unpaid Balance</span>
            <span className="text-xl font-black text-amber-600 dark:text-amber-450 block mt-0.5">
              ₹{stats.unpaidEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 rounded-2xl border border-blue-500/10">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase block tracking-wider">Adjusted Orders</span>
            <span className="text-xl font-black text-gray-850 dark:text-white block mt-0.5">
              {stats.adjustmentsCount} Orders
            </span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-[#1a1a1a] p-4 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search stores by name, slug or owner..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold"
          />
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-400 hidden sm:inline" />
          <select
            value={selectedCity}
            onChange={e => setSelectedCity(e.target.value)}
            className="px-3.5 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ozo-red"
          >
            <option value="all">All Cities</option>
            {cities.map(c => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Marts list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <RefreshCw className="w-8 h-8 text-ozo-red animate-spin" />
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Loading financials database...</span>
        </div>
      ) : filteredMartsList.length === 0 ? (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-12 text-center border border-gray-100 dark:border-white/5 flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 flex items-center justify-center text-gray-405">
            <Store className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-extrabold text-gray-700 dark:text-zinc-350">No stores found</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">There are no dark stores matched for the selected filter parameters.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMartsList.map(mart => {
            const hasUnpaid = mart.unpaidAmount > 0
            return (
              <div
                key={mart.id}
                className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-150/60 dark:border-white/5 shadow-premium hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {mart.logo_url ? (
                        <img src={mart.logo_url} alt={mart.name} className="w-11 h-11 rounded-2xl object-cover border border-gray-200" />
                      ) : (
                        <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-950/20 text-ozo-red flex items-center justify-center font-extrabold text-xs border border-red-500/10">
                          {mart.name?.slice(0, 2) || 'MT'}
                        </div>
                      )}
                      <div>
                        <h4 className="font-extrabold text-sm text-gray-800 dark:text-white leading-tight">
                          {mart.name}
                        </h4>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">
                          Owner: {mart.users?.full_name || 'Walk-in operator'}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-gray-400 bg-gray-50 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/5 px-2 py-0.5 rounded-lg">
                      {mart.operating_cities?.name || mart.city_slug}
                    </span>
                  </div>

                  {/* Financials details block */}
                  <div className="space-y-2.5 bg-gray-50 dark:bg-white/[0.01] border border-gray-150/60 dark:border-white/5 rounded-2xl p-4 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Completed Orders</span>
                      <span className="font-extrabold text-gray-700 dark:text-gray-200 font-mono">
                        {mart.completedOrdersCount} orders
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Gross Completed Sales</span>
                      <span className="font-extrabold text-gray-700 dark:text-gray-200 font-mono">
                        ₹{mart.grossSales.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">Earning Adjustments</span>
                      <span className={`font-extrabold font-mono ${mart.totalAdjustments < 0 ? 'text-red-500' : mart.totalAdjustments > 0 ? 'text-emerald-500' : 'text-gray-500'}`}>
                        {mart.totalAdjustments >= 0 ? '+' : ''}₹{mart.totalAdjustments.toFixed(2)}
                      </span>
                    </div>

                    <div className="border-t border-gray-150 dark:border-white/5 pt-2.5 flex justify-between items-center text-xs">
                      <span className="text-gray-800 dark:text-white font-extrabold">Net Payout Balance</span>
                      <span className="font-black text-gray-800 dark:text-white font-mono">
                        ₹{mart.netEarnings.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Settlements status bar */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center text-[10px]">
                    <div className="bg-emerald-500/[0.03] border border-emerald-500/10 p-2.5 rounded-xl">
                      <span className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-450 block">Paid out</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block font-mono">
                        ₹{mart.paidAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className={`${hasUnpaid ? 'bg-amber-500/[0.04] border-amber-500/15' : 'bg-gray-50 dark:bg-white/[0.01] border-gray-200 dark:border-white/5'} border p-2.5 rounded-xl`}>
                      <span className={`text-[9px] uppercase font-bold block ${hasUnpaid ? 'text-amber-600 dark:text-amber-450' : 'text-gray-400'}`}>
                        Unpaid ({mart.unpaidCount})
                      </span>
                      <span className={`font-extrabold mt-0.5 block font-mono ${hasUnpaid ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                        ₹{mart.unpaidAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <button
                    onClick={() => handleOpenManage(mart)}
                    className={`w-full py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm border ${
                      hasUnpaid 
                        ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white border-transparent shadow-red-500/10' 
                        : 'bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-750 dark:text-gray-300 border-gray-200 dark:border-white/10'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Manage Store Payouts
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Manage Payout Drawer */}
      <AnimatePresence>
        {isDrawerOpen && selectedMart && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />

            {/* Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white dark:bg-[#121212] border-l border-gray-100 dark:border-white/5 shadow-2xl z-50 flex flex-col justify-between"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-gray-150 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-500/10 text-red-500 rounded-xl">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                      Payout Management
                    </h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 tracking-wider">
                      {selectedMart.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Financial Summary */}
                <div className="grid grid-cols-3 gap-3 bg-gray-50 dark:bg-white/[0.01] border border-gray-150 dark:border-white/5 p-4 rounded-2xl text-center text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-450 block">Net Store Earnings</span>
                    <span className="font-black text-[13px] text-gray-800 dark:text-white mt-1 block font-mono">
                      ₹{selectedMart.netEarnings.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-x border-gray-200 dark:border-white/5">
                    <span className="text-[9px] uppercase font-bold text-emerald-600 block">Total Paid Out</span>
                    <span className="font-black text-[13px] text-emerald-600 dark:text-emerald-450 mt-1 block font-mono">
                      ₹{selectedMart.paidAmount.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-amber-600 block">Pending Payout</span>
                    <span className="font-black text-[13px] text-amber-600 dark:text-amber-450 mt-1 block font-mono">
                      ₹{selectedMart.unpaidAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Bulk Settle Control Panel */}
                {selectedOrders.length > 0 && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-4 bg-red-500/[0.03] border border-red-500/20 rounded-2xl space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-black text-gray-800 dark:text-white">Bulk Payout Actions</span>
                        <p className="text-[10px] text-gray-400">{selectedOrders.length} orders selected for payout settlement.</p>
                      </div>
                      <span className="font-black text-sm text-red-500 font-mono">
                        Total: ₹{martOrders
                          .filter(o => selectedOrders.includes(o.id))
                          .reduce((sum, o) => sum + parseFloat(o.total || 0) + parseFloat(o.mart_earning_adjustment || 0), 0)
                          .toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="UPI Txn ID or Bank Reference (e.g. UTIB000...)"
                          value={payoutRef}
                          onChange={e => setPayoutRef(e.target.value)}
                          className="flex-1 px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-xs font-semibold"
                        />
                        <button
                          onClick={() => handleMarkPayout(false)}
                          disabled={submittingPayout}
                          className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1 shadow-md shadow-red-500/10"
                        >
                          {submittingPayout ? 'Processing...' : 'Settle with Ref'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-2 border-t border-red-500/10">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Or Hand-To-Hand Cash:</span>
                        <button
                          onClick={() => handleMarkPayout(true)}
                          disabled={submittingPayout}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1 shadow-sm shadow-emerald-500/10"
                        >
                          Direct Cash Settle
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Orders List for Store */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-gray-850 dark:text-zinc-200 uppercase tracking-wider">
                      Settlement Logs
                    </h4>
                    <button
                      onClick={toggleSelectAllUnpaid}
                      className="text-[10px] font-black uppercase text-red-500 hover:underline"
                    >
                      {selectedOrders.length === martOrders.filter(o => o.mart_payout_status !== 'paid').length ? 'Deselect All' : 'Select All Unpaid'}
                    </button>
                  </div>

                  {loadingOrders ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-2">
                      <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                      <span className="text-[10px] text-gray-405 font-bold uppercase">Loading logs...</span>
                    </div>
                  ) : martOrders.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 text-xs">No completed orders found for this store.</div>
                  ) : (
                    <div className="space-y-3">
                      {martOrders.map(order => {
                        const netOrderEarning = parseFloat(order.total || 0) + parseFloat(order.mart_earning_adjustment || 0)
                        const isPaid = order.mart_payout_status === 'paid'

                        return (
                          <div
                            key={order.id}
                            className={`p-4 border rounded-2xl transition-all flex items-center justify-between gap-4 ${
                              isPaid 
                                ? 'bg-emerald-500/[0.01] border-emerald-500/10' 
                                : selectedOrders.includes(order.id)
                                ? 'bg-red-500/[0.02] border-red-500/20 shadow-sm'
                                : 'bg-white dark:bg-white/[0.01] border-gray-150 dark:border-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {/* Selection checkbox */}
                              {!isPaid && (
                                <button
                                  onClick={() => toggleSelectOrder(order.id)}
                                  className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                                    selectedOrders.includes(order.id)
                                      ? 'bg-red-500 border-red-500 text-white shadow-sm shadow-red-500/10'
                                      : 'border-gray-300 dark:border-white/10 hover:border-gray-400'
                                  }`}
                                >
                                  {selectedOrders.includes(order.id) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </button>
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-xs text-gray-800 dark:text-zinc-100 font-mono">
                                    #{order.order_number || order.id.slice(0, 8).toUpperCase()}
                                  </span>
                                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                    isPaid 
                                      ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' 
                                      : 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                                  }`}>
                                    {isPaid ? 'Settled' : 'Unpaid'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                                  <span>{new Date(order.created_at).toLocaleDateString('en-IN', { dateStyle: 'short' })}</span>
                                  <span className="text-gray-300">•</span>
                                  <span>Gross: ₹{parseFloat(order.total).toFixed(2)}</span>
                                  {order.mart_earning_adjustment !== 0 && (
                                    <>
                                      <span className="text-gray-300">•</span>
                                      <span className={order.mart_earning_adjustment < 0 ? 'text-red-500' : 'text-emerald-500'}>
                                        Adj: {order.mart_earning_adjustment >= 0 ? '+' : ''}₹{parseFloat(order.mart_earning_adjustment).toFixed(2)}
                                      </span>
                                    </>
                                  )}
                                </div>
                                {isPaid && order.mart_payout_reference && (
                                  <p className="text-[9px] text-gray-400 mt-1 font-mono truncate max-w-xs">
                                    Ref: <span className="font-bold">{order.mart_payout_reference}</span> ({new Date(order.mart_payout_date).toLocaleDateString()})
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Earnings display and tweak tools */}
                            <div className="text-right flex items-center gap-3">
                              <div>
                                <span className="text-[9px] text-gray-400 block">Store Share</span>
                                <span className="font-black text-sm text-gray-800 dark:text-white font-mono">
                                  ₹{netOrderEarning.toFixed(2)}
                                </span>
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingOrder(order)
                                    setAdjustmentValue(parseFloat(order.mart_earning_adjustment || 0).toString())
                                    setIsAdjustmentModalOpen(true)
                                  }}
                                  title="Tweak order earnings share"
                                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg border border-gray-200 dark:border-white/5 text-gray-500 hover:text-gray-750 dark:hover:text-white transition-all"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                {isPaid && (
                                  <button
                                    onClick={() => handleResetPayoutStatus(order.id)}
                                    title="Mark unpaid / Revert payout status"
                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg border border-red-500/10 text-red-500 transition-all text-[8px] font-black uppercase"
                                  >
                                    Revert
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Adjust Earnings Modal */}
      <AnimatePresence>
        {isAdjustmentModalOpen && editingOrder && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAdjustmentModalOpen(false)
                setEditingOrder(null)
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#121212] border border-gray-150 dark:border-white/5 rounded-[2rem] p-6 shadow-2xl max-w-sm w-full relative z-10 space-y-4"
            >
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-red-500" />
                  Earning Adjustment
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">
                  Adjust commission fee / payout share for order #{editingOrder.order_number || editingOrder.id.slice(0, 8).toUpperCase()}.
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-gray-50 dark:bg-white/[0.01] border border-gray-150 p-2.5 rounded-xl">
                    <span className="text-[9px] text-gray-400 uppercase block">Gross Sale</span>
                    <span className="font-extrabold font-mono text-gray-700 dark:text-gray-200 mt-0.5 block">
                      ₹{parseFloat(editingOrder.total).toFixed(2)}
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-white/[0.01] border border-gray-150 p-2.5 rounded-xl">
                    <span className="text-[9px] text-gray-400 uppercase block">Current Adj.</span>
                    <span className="font-extrabold font-mono text-gray-700 dark:text-gray-200 mt-0.5 block">
                      ₹{parseFloat(editingOrder.mart_earning_adjustment || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-450 uppercase mb-1.5">
                    Adjustment Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Enter positive or negative adjustment"
                    value={adjustmentValue}
                    onChange={e => setAdjustmentValue(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-semibold"
                  />
                  <span className="text-[9px] text-gray-400 mt-1 block">
                    Use negative numbers to deduct commission fees (e.g. -50.00). Positive numbers add bonus values.
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsAdjustmentModalOpen(false)
                    setEditingOrder(null)
                  }}
                  className="flex-1 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-250 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAdjustment}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-md shadow-red-500/10"
                >
                  <Check className="w-4 h-4" />
                  Save Adjustment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MartPayoutsAdmin
