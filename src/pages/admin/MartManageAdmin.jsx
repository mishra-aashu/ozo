import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Store,
  Clock,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit,
  Activity,
  ChevronRight,
  Eye,
  Settings,
  Shield,
  ShieldAlert,
  Users,
  Phone,
  MapPin,
  Sliders,
  DollarSign,
  X,
  ExternalLink,
  Lock,
  Unlock,
  FileText,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  Star
} from 'lucide-react'
import { supabaseAdmin as supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

// Helper to generate URL-friendly slug while typing
const slugifyForTyping = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
}

const MartManageAdmin = () => {
  const [activeTab, setActiveTab] = useState('directory') // 'directory' | 'settings'
  const [marts, setMarts] = useState([])
  const [cities, setCities] = useState([])
  const [operators, setOperators] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'active' | 'inactive' | '24_7'
  
  // Selected mart details for modal/drawer
  const [selectedMart, setSelectedMart] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [martToDelete, setMartToDelete] = useState(null)

  // View orders states
  const [selectedMartForOrders, setSelectedMartForOrders] = useState(null)
  const [martOrders, setMartOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [isOrdersDrawerOpen, setIsOrdersDrawerOpen] = useState(false)

  // Form State for Mart
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    phone: '',
    description: '',
    address: '',
    city_id: '',
    city_slug: '',
    opens_at: '08:00',
    closes_at: '22:00',
    is_24_7: false,
    max_concurrent_orders: 50,
    owner_id: '',
    logo_url: '',
    banner_url: ''
  })

  // Global Config State for Marts (to match Rider config structure)
  const [martConfig, setMartConfig] = useState({
    max_load_warning_threshold: 40,
    auto_assign_radius_km: 5,
    enable_auto_load_balancing: true
  })
  const [savingSettings, setSavingSettings] = useState(false)

  const fetchMarts = async () => {
    try {
      setLoading(true)
      // Fetch marts and join with city and owner details
      const { data: martsData, error: martsError } = await supabase
        .from('marts')
        .select(`
          *,
          operating_cities!marts_city_id_fkey (name),
          users!marts_owner_id_fkey (full_name, email, phone)
        `)
        .order('created_at', { ascending: false })

      if (martsError) throw martsError

      // Fetch all orders to aggregate stats
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('mart_id, total, status')

      if (ordersError) throw ordersError

      // Map orders to marts
      const processedMarts = (martsData || []).map(mart => {
        const martOrders = (ordersData || []).filter(o => o.mart_id === mart.id)
        
        // Active orders: anything not completed or cancelled
        const activeOrders = martOrders.filter(o => 
          !['COMPLETED', 'delivered', 'cancelled', 'CANCELLED_BY_USER'].includes(o.status)
        ).length

        // Completed orders
        const completedOrders = martOrders.filter(o => 
          ['COMPLETED', 'delivered'].includes(o.status)
        ).length

        // Total earnings: sum of total for completed/delivered orders
        const totalEarnings = martOrders
          .filter(o => ['COMPLETED', 'delivered'].includes(o.status))
          .reduce((sum, o) => sum + parseFloat(o.total || 0), 0)

        return {
          ...mart,
          totalOrders: martOrders.length,
          activeOrders,
          completedOrders,
          totalEarnings
        }
      })

      setMarts(processedMarts)
    } catch (err) {
      console.error('Failed to fetch marts:', err)
      toast.error('Could not load Marts directory')
    } finally {
      setLoading(false)
    }
  }

  const handleViewOrders = async (mart) => {
    setSelectedMartForOrders(mart)
    setIsOrdersDrawerOpen(true)
    setLoadingOrders(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          users!orders_user_id_fkey (full_name, email, phone)
        `)
        .eq('mart_id', mart.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch order items for these orders
      const orderIds = (data || []).map(o => o.id)
      let itemsData = []
      if (orderIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds)
        if (itemsError) throw itemsError
        itemsData = items || []
      }

      // Attach items to orders
      const ordersWithItems = (data || []).map(order => ({
        ...order,
        items: itemsData.filter(item => item.order_id === order.id)
      }))

      setMartOrders(ordersWithItems)
    } catch (err) {
      console.error('Failed to fetch mart orders:', err)
      toast.error('Could not load store orders')
    } finally {
      setLoadingOrders(false)
    }
  }

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('operating_cities')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      setCities(data || [])
    } catch (err) {
      console.error('Failed to fetch operating cities:', err)
    }
  }

  const fetchOperators = async () => {
    try {
      // Fetch users who are either admins or mart operators
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .in('role', ['mart_operator', 'admin'])
        .order('full_name')
      if (error) throw error
      setOperators(data || [])
    } catch (err) {
      console.error('Failed to fetch store operators:', err)
    }
  }

  const fetchSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'mart_global_config')
      
      if (error) throw error

      if (data && data.length > 0 && data[0].value) {
        setMartConfig(prev => ({ ...prev, ...data[0].value }))
      }
    } catch (err) {
      console.error('Failed to fetch mart settings:', err)
    }
  }

  useEffect(() => {
    fetchMarts()
    fetchCities()
    fetchOperators()
    fetchSystemSettings()
  }, [])

  // Auto-fill slug from name when creating a new mart
  useEffect(() => {
    if (!selectedMart && formData.name) {
      setFormData(prev => ({
        ...prev,
        slug: slugifyForTyping(formData.name)
      }))
    }
  }, [formData.name, selectedMart])

  // Sync city_slug automatically when city_id is changed
  useEffect(() => {
    if (formData.city_id) {
      const selectedCity = cities.find(c => c.id === formData.city_id)
      if (selectedCity) {
        setFormData(prev => ({
          ...prev,
          city_slug: selectedCity.slug
        }))
      }
    } else {
      setFormData(prev => ({
        ...prev,
        city_slug: ''
      }))
    }
  }, [formData.city_id, cities])

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      phone: '',
      description: '',
      address: '',
      city_id: '',
      city_slug: '',
      opens_at: '08:00',
      closes_at: '22:00',
      is_24_7: false,
      max_concurrent_orders: 50,
      owner_id: '',
      logo_url: '',
      banner_url: ''
    })
    setSelectedMart(null)
  }

  const handleEdit = (mart) => {
    setSelectedMart(mart)
    // format time columns (HH:MM:SS -> HH:MM)
    const formatTime = (timeStr) => {
      if (!timeStr) return '08:00'
      return timeStr.slice(0, 5)
    }

    setFormData({
      name: mart.name || '',
      slug: mart.slug || '',
      phone: mart.phone || mart.users?.phone || '',
      description: mart.description || '',
      address: mart.address || '',
      city_id: mart.city_id || '',
      city_slug: mart.city_slug || '',
      opens_at: formatTime(mart.opens_at),
      closes_at: formatTime(mart.closes_at),
      is_24_7: mart.is_24_7 || false,
      max_concurrent_orders: mart.max_concurrent_orders || 50,
      owner_id: mart.owner_id || '',
      logo_url: mart.logo_url || '',
      banner_url: mart.banner_url || ''
    })
    setIsDrawerOpen(true)
  }

  const handleToggleActive = async (martId, currentActive) => {
    const toastId = toast.loading(`${currentActive ? 'Deactivating' : 'Activating'} Mart...`)
    try {
      const { error } = await supabase
        .from('marts')
        .update({
          is_active: !currentActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', martId)

      if (error) throw error
      toast.success(`Mart ${currentActive ? 'deactivated' : 'activated'} successfully!`, { id: toastId })
      fetchMarts()
    } catch (err) {
      console.error('Error toggling active status:', err)
      toast.error(`Update failed: ${err.message}`, { id: toastId })
    }
  }

  const triggerDeleteConfirm = (mart) => {
    setMartToDelete(mart)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteMart = async () => {
    if (!martToDelete) return
    const mart = martToDelete
    setDeleteConfirmOpen(false)
    setMartToDelete(null)

    setIsDeleting(mart.id)
    const toastId = toast.loading('Deleting Mart from database...')
    try {
      const { error } = await supabase
        .from('marts')
        .delete()
        .eq('id', mart.id)

      if (error) throw error
      toast.success('Mart deleted successfully!', { id: toastId })
      fetchMarts()
    } catch (err) {
      console.error('Error deleting mart:', err)
      toast.error(`Delete failed: ${err.message}`, { id: toastId })
    } finally {
      setIsDeleting(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    if (!formData.name.trim()) {
      toast.error('Mart Name is required')
      return
    }
    if (!formData.slug.trim()) {
      toast.error('Mart Slug is required')
      return
    }
    if (!formData.phone.trim()) {
      toast.error('Mart Contact Phone is required')
      return
    }
    if (!formData.city_id) {
      toast.error('Please assign an operational city')
      return
    }

    setSubmitting(true)
    const toastId = toast.loading(selectedMart ? 'Updating store configuration...' : 'Registering new Mart...')
    try {
      // Standardize time inputs to format HH:MM:SS
      const getFormattedTime = (timeStr) => {
        if (!timeStr) return null
        return timeStr.length === 5 ? `${timeStr}:00` : timeStr
      }

      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        phone: formData.phone.trim(),
        description: formData.description.trim(),
        address: formData.address.trim(),
        city_id: formData.city_id,
        city_slug: formData.city_slug,
        opens_at: formData.is_24_7 ? null : getFormattedTime(formData.opens_at),
        closes_at: formData.is_24_7 ? null : getFormattedTime(formData.closes_at),
        is_24_7: formData.is_24_7,
        max_concurrent_orders: parseInt(formData.max_concurrent_orders) || 50,
        owner_id: formData.owner_id || null,
        logo_url: formData.logo_url.trim() || null,
        banner_url: formData.banner_url.trim() || null,
        // Add defaults if creating new mart
        ...(selectedMart ? {} : {
          current_order_load: 0
        })
      }

      let error
      if (selectedMart) {
        const { error: err } = await supabase
          .from('marts')
          .update({
            ...payload,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedMart.id)
        error = err
      } else {
        const { error: err } = await supabase
          .from('marts')
          .insert([payload])
        error = err
      }

      if (error) throw error

      toast.success(selectedMart ? 'Mart updated successfully!' : 'Mart registered successfully!', { id: toastId })
      setIsDrawerOpen(false)
      resetForm()
      fetchMarts()
    } catch (err) {
      console.error('Error saving mart:', err)
      toast.error(`Save failed: ${err.message || 'Slug might be duplicated'}`, { id: toastId })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveGlobalConfig = async (e) => {
    e.preventDefault()
    setSavingSettings(true)
    const toastId = toast.loading('Saving global configurations...')
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'mart_global_config',
          value: {
            max_load_warning_threshold: parseInt(martConfig.max_load_warning_threshold) || 40,
            auto_assign_radius_km: parseFloat(martConfig.auto_assign_radius_km) || 5,
            enable_auto_load_balancing: !!martConfig.enable_auto_load_balancing
          },
          description: 'Global threshold parameters for dark store operations and dispatch'
        })
      if (error) throw error
      toast.success('Global settings saved successfully!', { id: toastId })
      fetchSystemSettings()
    } catch (err) {
      console.error('Failed to save settings:', err)
      toast.error(`Failed to save settings: ${err.message}`, { id: toastId })
    } finally {
      setSavingSettings(false)
    }
  }

  // Filter & Search Logic
  const filteredMarts = marts.filter(m => {
    const searchString = `${m.name || ''} ${m.slug || ''} ${m.phone || ''} ${m.address || ''} ${m.operating_cities?.name || ''}`.toLowerCase()
    const matchesSearch = searchString.includes(searchQuery.toLowerCase())

    if (filterStatus === 'all') return matchesSearch
    if (filterStatus === 'active') return matchesSearch && m.is_active
    if (filterStatus === 'inactive') return matchesSearch && !m.is_active
    if (filterStatus === '24_7') return matchesSearch && m.is_24_7
    return matchesSearch
  })

  // KPIs Calculations
  const totalMarts = marts.length
  const activeMartsCount = marts.filter(m => m.is_active).length
  const closedMartsCount = totalMarts - activeMartsCount
  const allDayMartsCount = marts.filter(m => m.is_24_7).length
  const totalActiveLoad = marts.reduce((acc, m) => acc + (m.current_order_load || 0), 0)

  return (
    <div className="space-y-8 max-w-7xl mx-auto text-gray-900 dark:text-white font-sans">
      {/* Banner */}
      <div className="p-8 bg-gradient-ozo text-white rounded-[2rem] shadow-premium relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center justify-center pointer-events-none">
          <Store className="w-80 h-80 rotate-12 translate-x-12 translate-y-12 text-white" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="bg-white/20 text-white font-bold text-xs uppercase tracking-widest px-3.5 py-1 rounded-full">
              OZO Supermarkets Administration
            </span>
            <h1 className="text-3xl sm:text-4xl font-black mt-4 leading-tight font-sans">
              Dark Store Mart Management
            </h1>
            <p className="mt-2 text-white/85 text-sm max-w-xl font-medium leading-relaxed">
              Create and configure local dark stores, update open/close operating schedules, adjust store capacity parameters, and assign management owners.
            </p>
          </div>
          <div className="flex gap-3 self-start md:self-center">
            <button
              onClick={() => {
                resetForm()
                setIsDrawerOpen(true)
              }}
              className="flex items-center gap-2 bg-white text-ozo-red px-5 py-3 rounded-2xl font-black text-xs hover:bg-white/90 active:scale-95 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              Register New Mart
            </button>
            <button
              onClick={() => {
                fetchMarts()
                fetchSystemSettings()
              }}
              disabled={loading}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white px-5 py-3 rounded-2xl font-bold text-xs active:scale-95 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Sync Database
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium flex items-center gap-4 hover:-translate-y-0.5 transition-transform">
          <div className="p-4 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Mart Locations</p>
            <h3 className="text-3xl font-black font-mono leading-none mt-1.5">{totalMarts}</h3>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium flex items-center gap-4 hover:-translate-y-0.5 transition-transform">
          <div className="p-4 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-2xl">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Active Dark Stores</p>
            <h3 className="text-3xl font-black font-mono leading-none mt-1.5 text-emerald-650 dark:text-[#00FF66]">{activeMartsCount}</h3>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium flex items-center gap-4 hover:-translate-y-0.5 transition-transform">
          <div className="p-4 bg-amber-100 dark:bg-amber-900/20 text-amber-650 dark:text-amber-400 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">24/7 Operations</p>
            <h3 className="text-3xl font-black font-mono leading-none mt-1.5 text-amber-650 dark:text-amber-400">{allDayMartsCount}</h3>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium flex items-center gap-4 hover:-translate-y-0.5 transition-transform">
          <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-2xl">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Active Load</p>
            <h3 className="text-3xl font-black font-mono leading-none mt-1.5 text-red-650 dark:text-red-400">{totalActiveLoad} orders</h3>
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
          <Store className="w-4 h-4" />
          Dark Stores List
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
          Dispatch & Load Limits
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
                placeholder="Search name, slug, city, phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ozo-red transition-all"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap items-center w-full sm:w-auto justify-end">
              {[
                { label: 'All Stores', value: 'all' },
                { label: 'Active / Open', value: 'active' },
                { label: 'Inactive / Closed', value: 'inactive' },
                { label: '24/7 Hours', value: '24_7' }
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
              <p className="text-xs text-gray-450 dark:text-gray-400 font-bold uppercase tracking-wider animate-pulse">Syncing Marts...</p>
            </div>
          ) : filteredMarts.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/5 rounded-[2rem] p-6 shadow-premium">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">No Marts Found</h4>
              <p className="text-xs text-gray-400 mt-1">Try resetting the status filter or search parameters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMarts.map((mart) => {
                const currentLoad = mart.current_order_load || 0
                const maxOrders = mart.max_concurrent_orders || 50
                const loadPercent = Math.min((currentLoad / maxOrders) * 100, 100)
                const isHighLoad = currentLoad >= martConfig.max_load_warning_threshold

                return (
                  <div 
                    key={mart.id}
                    className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/5 hover:border-ozo-red/20 dark:hover:border-ozo-red/20 rounded-[2rem] p-6 flex flex-col justify-between shadow-premium hover:shadow-premium-lg transition-all duration-300 relative overflow-hidden group"
                  >
                    {/* Status indicator bar */}
                    <div className={`absolute top-0 inset-x-0 h-1.5 transition-all ${
                      mart.is_active ? 'bg-[#00FF66]' : 'bg-red-500'
                    }`} />

                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div className="flex items-center gap-3">
                          {mart.logo_url ? (
                            <img 
                              src={mart.logo_url} 
                              alt={mart.name} 
                              className="w-12 h-12 rounded-2xl object-cover border border-gray-200 dark:border-white/10"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/20 text-ozo-red dark:text-[#FF6B6B] flex items-center justify-center font-extrabold text-sm uppercase border border-red-500/15">
                              {mart.name?.slice(0, 2) || 'MT'}
                            </div>
                          )}
                          <div>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5 leading-none">
                              {mart.name || 'Anonymous Mart'}
                              {mart.is_active && (
                                <CheckCircle className="w-3.5 h-3.5 text-blue-500" title="Active store" />
                              )}
                            </h4>
                            <p className="text-[10px] text-gray-400 font-bold mt-1.5 font-mono">
                              {mart.phone || mart.users?.phone || <span className="text-red-500 font-black">⚠️ Phone Required</span>}
                            </p>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                          mart.is_active 
                            ? 'bg-[#00FF66]/10 text-emerald-650 dark:text-[#00FF66] border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/20'
                        }`}>
                        {mart.is_active ? 'Open' : 'Closed'}
                        </span>
                      </div>

                      {/* Detail stats */}
                      <div className="grid grid-cols-2 gap-3 mb-4 bg-gray-50/50 dark:bg-white/[0.01] rounded-2xl border border-gray-150/60 dark:border-white/5 p-4 text-xs">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-gray-500 dark:text-gray-400 block mb-0.5">Operating City</span>
                          <span className="font-extrabold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-ozo-red" />
                            {mart.operating_cities?.name || mart.city_slug || 'Default'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-gray-500 dark:text-gray-400 block mb-0.5">Operating Hours</span>
                          <span className="font-extrabold text-gray-800 dark:text-gray-200 block truncate">
                            {mart.is_24_7 ? (
                              <span className="text-amber-500 font-mono text-[10px] font-black uppercase">24/7 Hours</span>
                            ) : (
                              <span className="font-mono text-[10px]">
                                {mart.opens_at?.slice(0, 5)} - {mart.closes_at?.slice(0, 5)}
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-gray-150 dark:border-white/5">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] uppercase font-bold text-gray-600 dark:text-gray-400">Active Load Status</span>
                            <span className={`text-[10px] font-extrabold ${isHighLoad ? 'text-red-500 font-black animate-pulse' : 'text-gray-800 dark:text-gray-200'}`}>
                              {currentLoad}/{maxOrders} Orders
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${isHighLoad ? 'bg-red-500' : 'bg-emerald-500'}`} 
                              style={{ width: `${loadPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Store Performance */}
                      <div className="grid grid-cols-2 gap-3 mb-4 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01] rounded-2xl border border-emerald-500/10 dark:border-emerald-500/5 p-3.5 text-xs">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-450 block mb-0.5 tracking-wider flex items-center gap-1">
                            <DollarSign className="w-2.5 h-2.5" /> Total Earnings
                          </span>
                          <span className="font-extrabold text-[13px] text-emerald-600 dark:text-emerald-400 tracking-tight block">
                            ₹{parseFloat(mart.totalEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-gray-500 dark:text-gray-400 block mb-0.5 tracking-wider">
                            Completed Orders
                          </span>
                          <span className="font-extrabold text-gray-800 dark:text-gray-200 block font-mono text-[13px]">
                            {mart.completedOrders || 0}
                          </span>
                        </div>
                      </div>

                      {/* Store Metadata */}
                      <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-150 dark:border-white/5 rounded-2xl p-4 text-xs space-y-2.5 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 dark:text-gray-400 font-semibold">Store Operator/Owner:</span>
                          <span className="font-extrabold text-gray-800 dark:text-gray-200 truncate max-w-[150px]" title={mart.users?.email}>
                            {mart.users?.full_name || 'Unassigned'}
                          </span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-gray-500 dark:text-gray-400 font-semibold shrink-0">Address:</span>
                          <span className="font-semibold text-gray-700 dark:text-gray-350 text-right line-clamp-2 max-w-[180px]">
                            {mart.address || 'No address registered'}
                          </span>
                        </div>
                        {mart.slug && (
                          <div className="pt-2 border-t border-gray-150 dark:border-white/5 flex justify-between items-center font-mono text-[9px] text-gray-500 dark:text-gray-450">
                            <span>Slug:</span>
                            <span className="font-bold text-gray-650 dark:text-gray-300">{mart.slug}</span>
                          </div>
                        )}
                      </div>

                      {/* View Orders Button */}
                      <button
                        onClick={() => handleViewOrders(mart)}
                        className="w-full mb-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-red-500/10 hover:shadow-lg"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        View Store Orders ({mart.totalOrders || 0})
                      </button>
                    </div>

                    {/* Actions bar */}
                    <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
                      <button
                        onClick={() => handleEdit(mart)}
                        className="flex-1 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-650 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Configure
                      </button>

                      <button
                        onClick={() => handleToggleActive(mart.id, mart.is_active)}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 border ${
                          mart.is_active
                            ? 'border-red-500/20 text-red-500 hover:bg-red-500/5 bg-transparent'
                            : 'border-green-500/20 text-emerald-600 dark:text-[#00FF66] hover:bg-green-500/5 bg-transparent'
                        }`}
                      >
                        {mart.is_active ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        {mart.is_active ? 'Close Store' : 'Open Store'}
                      </button>

                      <button
                        onClick={() => triggerDeleteConfirm(mart)}
                        disabled={isDeleting === mart.id}
                        className="p-2.5 border border-red-500/20 hover:border-red-500/40 text-red-500 rounded-xl hover:bg-red-500/5 transition-all disabled:opacity-50"
                        title="Delete Mart Location"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
        <form onSubmit={handleSaveGlobalConfig} className="space-y-8 max-w-4xl animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* OZO Mart Dispatch Limits Card */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-premium space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3.5 bg-red-100 dark:bg-red-950/20 text-ozo-red rounded-2xl border border-red-500/10">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-800 dark:text-white">Store Dispatch Parameters</h2>
                  <p className="text-xs text-gray-400">Configure order dispatch parameters</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-450 dark:text-gray-400 uppercase mb-2">
                    High Load Order Alert Limit
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={martConfig.max_load_warning_threshold}
                      onChange={e => setMartConfig({ ...martConfig, max_load_warning_threshold: parseInt(e.target.value) || 0 })}
                      className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">Threshold of concurrent processing orders in a dark store that triggers warning flags for dispatchers.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-455 dark:text-gray-400 uppercase mb-2">
                    Auto-Assignment Radius Limit (km)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={martConfig.auto_assign_radius_km}
                      onChange={e => setMartConfig({ ...martConfig, auto_assign_radius_km: parseFloat(e.target.value) || 0 })}
                      className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-semibold"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5">Maximum displacement distance between a dark store location and order address to allow auto-matching riders.</p>
                </div>
              </div>
            </div>

            {/* Load Balancing Config Card */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-gray-100 dark:border-white/5 shadow-premium space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3.5 bg-red-100 dark:bg-red-950/20 text-ozo-red rounded-2xl border border-red-500/10">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-800 dark:text-white">Intelligent Load Balancing</h2>
                  <p className="text-xs text-gray-400">Optimize store traffic dynamically</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-white">Enable Auto Load Balancing</p>
                    <p className="text-[10px] text-gray-400 max-w-[200px]">Reroute orders from overloaded stores to nearest alternative stores.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!martConfig.enable_auto_load_balancing}
                      onChange={e => setMartConfig({ ...martConfig, enable_auto_load_balancing: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                  </label>
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
              {savingSettings ? 'Saving Settings...' : 'Save Parameters'}
            </button>
          </div>
        </form>
      )}

      {/* Edit/Add Mart Slide-Over Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsDrawerOpen(false)
                resetForm()
              }}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />

            {/* Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-[#121212] border-l border-gray-100 dark:border-white/5 shadow-2xl z-50 flex flex-col justify-between"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-gray-150 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    {selectedMart ? 'Configure Dark Store' : 'Register New Mart'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedMart ? `Editing fields for ${selectedMart.name}` : 'Create a fresh supermarket dispatch node'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsDrawerOpen(false)
                    resetForm()
                  }}
                  className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Form Body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Store Name & Slug */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Mart Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Ozo Mart Cantonment"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Mart Slug</label>
                    <input
                      type="text"
                      placeholder="ozo-mart-cantonment"
                      value={formData.slug}
                      onChange={e => setFormData({ ...formData, slug: slugifyForTyping(e.target.value) })}
                      className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Description</label>
                  <textarea
                    placeholder="Describe store location or special inventory features..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold text-gray-900 dark:text-white"
                  />
                </div>

                {/* Phone & Operational City */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Store Contact Phone</label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 9876543210"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Operating City</label>
                    <select
                      value={formData.city_id}
                      onChange={e => setFormData({ ...formData, city_id: e.target.value })}
                      className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer"
                      required
                    >
                      <option value="">Select Operational City</option>
                      {cities.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.slug})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Owner/Operator Assignment */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Assign Store Operator</label>
                  <select
                    value={formData.owner_id}
                    onChange={e => setFormData({ ...formData, owner_id: e.target.value })}
                    className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold text-gray-750 dark:text-gray-300 cursor-pointer"
                  >
                    <option value="">Unassigned (No Operator)</option>
                    {operators.map(op => (
                      <option key={op.id} value={op.id}>
                        {op.full_name || 'Unnamed Operator'} ({op.email}) - {op.role}
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-gray-400 mt-1">Users must have the role 'mart_operator' or 'admin' to be assignable as store operators.</p>
                </div>

                {/* Operating Schedule hours */}
                <div className="bg-gray-50 dark:bg-white/[0.01] border border-gray-150 dark:border-white/5 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-800 dark:text-white">Store Hours - 24/7 Service</p>
                      <p className="text-[10px] text-gray-400">Keep store open around the clock.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.is_24_7}
                        onChange={e => setFormData({ ...formData, is_24_7: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {!formData.is_24_7 && (
                    <div className="grid grid-cols-2 gap-4 pt-2 animate-fadeIn">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Opens At</label>
                        <input
                          type="time"
                          value={formData.opens_at}
                          onChange={e => setFormData({ ...formData, opens_at: e.target.value })}
                          className="px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold text-gray-900 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Closes At</label>
                        <input
                          type="time"
                          value={formData.closes_at}
                          onChange={e => setFormData({ ...formData, closes_at: e.target.value })}
                          className="px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold text-gray-900 dark:text-white"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Capacity Limit & Address */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2" title="Max concurrent orders">Max Order Load</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.max_concurrent_orders}
                      onChange={e => setFormData({ ...formData, max_concurrent_orders: parseInt(e.target.value) || 50 })}
                      className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Address details</label>
                    <input
                      type="text"
                      placeholder="Dark store postal address details..."
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Logo & Banner URLs */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Logo Image URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={formData.logo_url}
                    onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                    className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Banner Image URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/banner.png"
                    value={formData.banner_url}
                    onChange={e => setFormData({ ...formData, banner_url: e.target.value })}
                    className="px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-semibold text-gray-900 dark:text-white"
                  />
                </div>

              </form>

              {/* Drawer Footer Actions */}
              <div className="p-6 border-t border-gray-150 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDrawerOpen(false)
                    resetForm()
                  }}
                  className="flex-1 py-3.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-650 dark:text-gray-300 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="flex-1 py-3.5 bg-gradient-ozo text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-ozo hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                >
                  {submitting ? 'Saving Config...' : selectedMart ? 'Save Config' : 'Register Mart'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* View Mart Orders Slide-Over Drawer */}
      <AnimatePresence>
        {isOrdersDrawerOpen && selectedMartForOrders && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOrdersDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 cursor-pointer"
            />

            {/* Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-xl bg-white dark:bg-[#121212] border-l border-gray-150 dark:border-white/5 shadow-2xl z-50 flex flex-col justify-between"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-gray-150 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Store className="w-5 h-5 text-ozo-red" />
                    {selectedMartForOrders.name} Orders
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Performance: ₹{parseFloat(selectedMartForOrders.totalEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} • {selectedMartForOrders.completedOrders || 0} completed
                  </p>
                </div>
                <button
                  onClick={() => setIsOrdersDrawerOpen(false)}
                  className="p-2 border border-gray-150 dark:border-white/5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 text-gray-450 dark:text-gray-455 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {loadingOrders ? (
                  <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <RefreshCw className="w-8 h-8 text-ozo-red animate-spin" />
                    <span className="text-sm font-bold text-gray-400">Loading order records...</span>
                  </div>
                ) : martOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 flex items-center justify-center text-gray-400">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h4 className="font-extrabold text-gray-700 dark:text-zinc-300">No orders found</h4>
                    <p className="text-xs text-gray-400 max-w-xs">There are currently no dispatch requests logged for this store location.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {martOrders.map((order) => (
                      <div 
                        key={order.id} 
                        className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/5 rounded-3xl p-5 space-y-4 shadow-sm hover:shadow-md transition-all duration-300"
                      >
                        {/* Order Header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-black font-mono text-gray-800 dark:text-zinc-200">
                              #{order.order_number || order.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className="text-[10px] text-gray-405 block mt-0.5 font-mono">
                              {new Date(order.created_at).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })}
                            </span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${
                            ['completed', 'delivered'].includes(order.status?.toLowerCase())
                              ? 'bg-[#00FF66]/10 text-emerald-650 dark:text-[#00FF66] border-emerald-500/20'
                              : ['cancelled', 'cancelled_by_user'].includes(order.status?.toLowerCase())
                              ? 'bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          }`}>
                            {order.status}
                          </span>
                        </div>

                        {/* Customer Info */}
                        <div className="bg-gray-50/50 dark:bg-white/[0.01] rounded-2xl border border-gray-150/60 dark:border-white/5 p-3 text-[11px] grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">Customer</span>
                            <span className="font-extrabold text-gray-800 dark:text-gray-100 truncate block">
                              {order.users?.full_name || 'Walk-in Customer'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">Contact</span>
                            <span className="font-extrabold text-gray-850 dark:text-gray-200 block font-mono">
                              {order.users?.phone || order.recipient_phone || 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-2">
                          <span className="text-[9px] uppercase font-black text-gray-400 tracking-wider block">Items Summary</span>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {order.items && order.items.map((item) => (
                              <div key={item.id} className="flex justify-between items-center text-[11px] bg-gray-50 dark:bg-white/[0.02] border border-gray-150 dark:border-white/5 p-2 rounded-xl">
                                <div className="flex items-center gap-2">
                                  {item.product_image ? (
                                    <img src={item.product_image} alt={item.product_name} className="w-8 h-8 rounded-lg object-cover border border-gray-100 dark:border-white/5" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center"><FileText className="w-4 h-4 text-gray-400" /></div>
                                  )}
                                  <div>
                                    <span className="font-bold text-gray-750 dark:text-gray-100 block max-w-[200px] truncate">{item.product_name}</span>
                                    <span className="text-[9px] text-gray-450 font-mono">₹{parseFloat(item.unit_price).toFixed(2)} × {item.quantity}</span>
                                  </div>
                                </div>
                                <span className="font-black text-gray-800 dark:text-gray-100 font-mono">₹{parseFloat(item.total_price).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Price Details */}
                        <div className="pt-3 border-t border-gray-150 dark:border-white/5 flex justify-between items-center text-xs">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-gray-450 block">Payment Method</span>
                            <span className="font-extrabold text-gray-700 dark:text-gray-250 uppercase tracking-wide text-[10px]">
                              {order.payment_method || 'COD'} ({order.payment_status})
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] uppercase font-bold text-gray-455 block">Grand Total</span>
                            <span className="font-black text-sm text-emerald-600 dark:text-emerald-450 font-mono">
                              ₹{parseFloat(order.total).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-6 border-t border-gray-150 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01]">
                <button
                  onClick={() => setIsOrdersDrawerOpen(false)}
                  className="w-full py-3.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-750 dark:text-gray-250 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Close Orders List
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmOpen && martToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setDeleteConfirmOpen(false)
                setMartToDelete(null)
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white dark:bg-[#121212] border border-gray-150 dark:border-white/5 rounded-[2rem] p-6 shadow-2xl max-w-sm w-full relative z-10 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">Delete Mart Location?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                  Are you sure you want to delete Mart <span className="font-extrabold text-gray-800 dark:text-gray-200">"{martToDelete.name}"</span>? This action is permanent and will unlink all products associated with this store.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setDeleteConfirmOpen(false)
                    setMartToDelete(null)
                  }}
                  className="flex-1 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-750 dark:text-gray-250 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteMart}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-red-500/10 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Mart
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MartManageAdmin
