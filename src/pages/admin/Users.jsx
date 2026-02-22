import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users as UsersIcon,
  User,
  Shield,
  Store,
  Bike,
  Search,
  Filter,
  Loader2,
  RefreshCw,
  Edit2,
  X,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  UserCheck,
  Calendar,
  AlertTriangle,
  MapPin,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Hash,
  Activity,
  Eye,
  Check,
  FileText,
  ExternalLink,
  Image as ImageIcon,
  Terminal,
  Play
} from 'lucide-react'
import { supabaseAdmin as supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import UserAvatar from '../../components/UserAvatar'

const Users = () => {
  // Lists
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setIsSubmitting] = useState(false)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 10

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    customer: 0,
    captain: 0,
    mart_operator: 0,
    admin: 0
  })

  // Drawer / Detail state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [activeDrawerTab, setActiveDrawerTab] = useState('profile') // 'profile' | 'addresses' | 'orders' | 'requests'
  const [userAddresses, setUserAddresses] = useState([])
  const [userOrders, setUserOrders] = useState([])
  const [loadingDrawerData, setLoadingDrawerData] = useState(false)
  const [originalUserRole, setOriginalUserRole] = useState('')
  const [editingAddress, setEditingAddress] = useState(null)
  const [savingAddressId, setSavingAddressId] = useState(null)

  // SQL console sub-tab inside profile
  const [profileTabMode, setProfileTabMode] = useState('form') // 'form' | 'sql'
  const [customSql, setCustomSql] = useState('')
  const [sqlResult, setSqlResult] = useState(null)
  const [runningSql, setRunningSql] = useState(false)

  const generateUserSql = () => {
    if (!selectedUser) return ''
    const fullName = (selectedUser.full_name || '').trim().replace(/'/g, "''")
    const phone = (selectedUser.phone || '').trim().replace(/'/g, "''")
    const role = (selectedUser.role || 'customer').trim().replace(/'/g, "''")

    return `UPDATE public.users
SET 
  full_name = '${fullName}',
  phone = '${phone}',
  role = '${role}',
  updated_at = NOW()
WHERE id = '${selectedUser.id}';`
  }

  const handleRunDrawerSql = async () => {
    if (!customSql.trim()) {
      toast.error('SQL Query cannot be empty!')
      return
    }
    setRunningSql(true)
    setSqlResult(null)
    try {
      let queryToRun = customSql.trim()
      if (/^(SELECT|WITH)\b/i.test(queryToRun)) {
        queryToRun = queryToRun.replace(/;\s*$/, '').trim()
      }
      const { data, error } = await supabase.rpc('exec_sql', {
        query_text: queryToRun
      })
      if (error) {
        setSqlResult({ success: false, error: error.message })
        toast.error('SQL execution failed!')
        return
      }
      if (data && data.success === false) {
        setSqlResult({ success: false, error: data.error })
        toast.error('SQL execution failed!')
      } else {
        setSqlResult({
          success: true,
          message: data.message || 'SQL executed successfully!',
          rowsAffected: data.rows_affected,
          rows: data.rows || []
        })
        toast.success('SQL executed successfully!')
        fetchUsers()
      }
    } catch (err) {
      setSqlResult({ success: false, error: err.message })
      toast.error('System error occurred!')
    } finally {
      setRunningSql(false)
    }
  }

  useEffect(() => {
    if (profileTabMode === 'sql') {
      setCustomSql(generateUserSql())
    }
  }, [profileTabMode, selectedUser])

  // Onboarding Requests states inside drawer
  const [userCaptainRequest, setUserCaptainRequest] = useState(null)
  const [userMartRequest, setUserMartRequest] = useState(null)
  const [docUrls, setDocUrls] = useState({ aadhar: null, dl: null, selfie: null })
  const [loadingDocs, setLoadingDocs] = useState(false)

  // Expandable orders inside the drawer
  const [expandedOrders, setExpandedOrders] = useState({}) // { [orderId]: boolean }
  const [orderItemsMap, setOrderItemsMap] = useState({}) // { [orderId]: items }
  const [loadingOrderItems, setLoadingOrderItems] = useState({}) // { [orderId]: boolean }

  // Load stats and users list
  const loadStats = async () => {
    try {
      const [
        { count: total },
        { count: customer },
        { count: captain },
        { count: mart_operator },
        { count: admin }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'captain'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'mart_operator'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin')
      ])

      setStats({
        total: total || 0,
        customer: customer || 0,
        captain: captain || 0,
        mart_operator: mart_operator || 0,
        admin: admin || 0
      })
    } catch (err) {
      console.warn('Failed to load user stats:', err)
    }
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })

      // Apply search query
      if (searchQuery.trim() !== '') {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
      }

      // Apply role filter
      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter)
      }

      // Pagination
      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error

      setUsers(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Error fetching users:', err)
      toast.error('Failed to load users list')
    } finally {
      setLoading(false)
    }
  }

  // Reload when filters change
  useEffect(() => {
    fetchUsers()
  }, [currentPage, roleFilter])

  // Fetch initial stats and users
  useEffect(() => {
    loadStats()
    fetchUsers()
  }, [])

  // Trigger search on submit or change
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchUsers()
  }

  // Open details drawer
  const handleOpenDrawer = async (user, initialTab = 'profile') => {
    setSelectedUser({ ...user })
    setOriginalUserRole(user.role || 'customer')
    setActiveDrawerTab(initialTab)
    setProfileTabMode('form')
    setSqlResult(null)
    setCustomSql('')
    setIsDrawerOpen(true)
    
    // Clear previous drawer data
    setUserAddresses([])
    setUserOrders([])
    setUserCaptainRequest(null)
    setUserMartRequest(null)
    setDocUrls({ aadhar: null, dl: null, selfie: null })
    setExpandedOrders({})
    setOrderItemsMap({})
    setEditingAddress(null)

    setLoadingDrawerData(true)
    try {
      const [addrRes, ordersRes, capRes, martRes] = await Promise.all([
        supabase.from('addresses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('captains').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('mart_applications').select('*').eq('id', user.id).maybeSingle()
      ])

      if (addrRes.error) throw addrRes.error
      if (ordersRes.error) throw ordersRes.error
      if (capRes.error) throw capRes.error
      if (martRes.error) throw martRes.error

      setUserAddresses(addrRes.data || [])
      setUserOrders(ordersRes.data || [])
      setUserCaptainRequest(capRes.data || null)
      setUserMartRequest(martRes.data || null)

      // If captain profile exists, fetch signed document URLs
      if (capRes.data) {
        fetchCaptainDocUrls(capRes.data)
      }
    } catch (err) {
      console.error('Failed to load user details:', err)
      toast.error('Failed to retrieve user relationship data')
    } finally {
      setLoadingDrawerData(false)
    }
  }

  const handleSaveAddress = async (e) => {
    e.preventDefault()
    if (!editingAddress) return
    
    setSavingAddressId(editingAddress.id)
    const toastId = toast.loading('Saving address changes...')
    try {
      // 1. If is_default is true, set is_default to false for all other addresses of this user first
      if (editingAddress.is_default) {
        const { error: resetErr } = await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', selectedUser.id)
          .neq('id', editingAddress.id)
          
        if (resetErr) throw resetErr
      }
      
      // 2. Update address
      const { error: updateErr } = await supabase
        .from('addresses')
        .update({
          label: editingAddress.label,
          address_line1: editingAddress.address_line1,
          address_line2: editingAddress.address_line2,
          city: editingAddress.city,
          state: editingAddress.state,
          pincode: editingAddress.pincode,
          landmark: editingAddress.landmark,
          latitude: editingAddress.latitude ? parseFloat(editingAddress.latitude) : null,
          longitude: editingAddress.longitude ? parseFloat(editingAddress.longitude) : null,
          is_default: editingAddress.is_default
        })
        .eq('id', editingAddress.id)
        
      if (updateErr) throw updateErr
      
      toast.success('Address updated successfully!', { id: toastId })
      
      // Refresh addresses list
      const { data: updatedAddrs, error: fetchErr } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', selectedUser.id)
        .order('created_at', { ascending: false })
        
      if (fetchErr) throw fetchErr
      setUserAddresses(updatedAddrs || [])
      setEditingAddress(null)
    } catch (err) {
      console.error('Failed to update address:', err)
      toast.error('Failed to update address: ' + err.message, { id: toastId })
    } finally {
      setSavingAddressId(null)
    }
  }

  const fetchCaptainDocUrls = async (captainData) => {
    setLoadingDocs(true)
    try {
      const getUrl = async (path) => {
        if (!path) return null
        if (path.startsWith('http://') || path.startsWith('https://')) {
          return path
        }
        const { data, error } = await supabase.storage
          .from('captain-documents')
          .createSignedUrl(path, 3600)
        if (error) throw error
        return data.signedUrl
      }

      const [aadharUrl, dlUrl, selfieUrl] = await Promise.all([
        getUrl(captainData.aadhar_card_url),
        getUrl(captainData.driving_license_url),
        getUrl(captainData.selfie_url)
      ])

      setDocUrls({
        aadhar: aadharUrl,
        dl: dlUrl,
        selfie: selfieUrl
      })
    } catch (err) {
      console.warn('Failed to load signed document URLs:', err)
    } finally {
      setLoadingDocs(false)
    }
  }

  // Handle user updates from Profile form inside Drawer
  const handleUpdateUser = async (e) => {
    e.preventDefault()
    if (!selectedUser) return

    setIsSubmitting(true)
    const toastId = toast.loading('Updating user profile...')
    try {
      // 1. If role is changing to captain, ensure captain record exists
      if (selectedUser.role === 'captain' && originalUserRole !== 'captain') {
        const { data: capCheck, error: capCheckErr } = await supabase
          .from('captains')
          .select('id')
          .eq('id', selectedUser.id)
          .maybeSingle()

        if (capCheckErr) throw capCheckErr

        if (!capCheck) {
          // Insert a default captain profile
          const { error: capInsertErr } = await supabase
            .from('captains')
            .insert({
              id: selectedUser.id,
              full_name: selectedUser.full_name,
              phone: selectedUser.phone || '',
              status: 'offline',
              earnings: 0,
              cash_in_hand: 0,
              rating: 5.0
            })
          if (capInsertErr) throw capInsertErr
        }
      }

      // 2. Update user profile in public.users
      const { error: updateErr } = await supabase
        .from('users')
        .update({
          full_name: selectedUser.full_name,
          phone: selectedUser.phone || null,
          role: selectedUser.role
        })
        .eq('id', selectedUser.id)

      if (updateErr) throw updateErr

      toast.success('User updated successfully!', { id: toastId })
      setOriginalUserRole(selectedUser.role)
      loadStats()
      fetchUsers()
    } catch (err) {
      console.error('Failed to update user:', err)
      toast.error('Failed to update user: ' + err.message, { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Approve Captain request inside Drawer
  const handleApproveRider = async (rider) => {
    setIsSubmitting(true)
    const toastId = toast.loading('Approving captain request...')
    try {
      const { error: capError } = await supabase
        .from('captains')
        .update({ status: 'offline' })
        .eq('id', rider.id)
      if (capError) throw capError

      const { error: userError } = await supabase
        .from('users')
        .update({ role: 'captain' })
        .eq('id', rider.id)
      if (userError) throw userError

      toast.success('Rider application approved & portal activated!', { id: toastId })
      
      // Update local state
      setUserCaptainRequest(prev => ({ ...prev, status: 'offline' }))
      setSelectedUser(prev => ({ ...prev, role: 'captain' }))
      setOriginalUserRole('captain')
      loadStats()
      fetchUsers()
    } catch (err) {
      console.error('Failed to approve rider:', err)
      toast.error('Failed to approve rider: ' + err.message, { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reject Captain request inside Drawer
  const handleRejectRider = async (rider) => {
    if (!window.confirm('Are you sure you want to REJECT this rider application?')) return
    setIsSubmitting(true)
    const toastId = toast.loading('Rejecting rider application...')
    try {
      const { error } = await supabase
        .from('captains')
        .update({ status: 'rejected' })
        .eq('id', rider.id)
      if (error) throw error

      toast.success('Rider application rejected.', { id: toastId })
      
      // Update local state
      setUserCaptainRequest(prev => ({ ...prev, status: 'rejected' }))
      loadStats()
      fetchUsers()
    } catch (err) {
      console.error('Failed to reject rider:', err)
      toast.error('Failed to reject rider: ' + err.message, { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Approve Mart application inside Drawer
  const handleApproveMart = async (app) => {
    setIsSubmitting(true)
    const toastId = toast.loading('Approving store application...')
    try {
      const { error: appError } = await supabase
        .from('mart_applications')
        .update({ status: 'approved' })
        .eq('id', app.id)
      if (appError) throw appError

      const { error: userError } = await supabase
        .from('users')
        .update({ role: 'mart_operator' })
        .eq('id', app.id)
      if (userError) throw userError

      const rawSlug = app.store_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
      const uniqueSlug = `${rawSlug}-${Math.random().toString(36).substring(2, 7)}`

      const { error: martError } = await supabase
        .from('marts')
        .insert({
          name: app.store_name,
          slug: uniqueSlug,
          address: app.address,
          is_active: true
        })
      if (martError) throw martError

      toast.success('Supermarket approved, registered & portal activated!', { id: toastId })
      
      // Update local state
      setUserMartRequest(prev => ({ ...prev, status: 'approved' }))
      setSelectedUser(prev => ({ ...prev, role: 'mart_operator' }))
      setOriginalUserRole('mart_operator')
      loadStats()
      fetchUsers()
    } catch (err) {
      console.error('Failed to approve mart:', err)
      toast.error('Failed to approve mart: ' + err.message, { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reject Mart application inside Drawer
  const handleRejectMart = async (app) => {
    if (!window.confirm('Are you sure you want to REJECT this store application?')) return
    setIsSubmitting(true)
    const toastId = toast.loading('Rejecting store application...')
    try {
      const { error } = await supabase
        .from('mart_applications')
        .update({ status: 'rejected' })
        .eq('id', app.id)
      if (error) throw error

      toast.success('Supermarket application rejected.', { id: toastId })
      
      // Update local state
      setUserMartRequest(prev => ({ ...prev, status: 'rejected' }))
      loadStats()
      fetchUsers()
    } catch (err) {
      console.error('Failed to reject mart:', err)
      toast.error('Failed to reject mart: ' + err.message, { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle order accordion items
  const toggleOrderItems = async (orderId) => {
    if (expandedOrders[orderId]) {
      setExpandedOrders((prev) => ({ ...prev, [orderId]: false }))
      return
    }

    setExpandedOrders((prev) => ({ ...prev, [orderId]: true }))

    // Fetch order items if not already cached
    if (!orderItemsMap[orderId]) {
      setLoadingOrderItems((prev) => ({ ...prev, [orderId]: true }))
      try {
        const { data, error } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId)

        if (error) throw error

        setOrderItemsMap((prev) => ({ ...prev, [orderId]: data || [] }))
      } catch (err) {
        console.error('Failed to fetch order items:', err)
        toast.error('Failed to load order items')
      } finally {
        setLoadingOrderItems((prev) => ({ ...prev, [orderId]: false }))
      }
    }
  }

  const handleResetSearch = () => {
    setSearchQuery('')
    setCurrentPage(1)
    setTimeout(() => {
      fetchUsers()
    }, 10)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Stat Cards Mapping
  const statCards = [
    {
      title: 'Total Users',
      value: stats.total,
      icon: UsersIcon,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/20'
    },
    {
      title: 'Customers',
      value: stats.customer,
      icon: User,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20'
    },
    {
      title: 'Captains / Riders',
      value: stats.captain,
      icon: Bike,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20'
    },
    {
      title: 'Mart Operators',
      value: stats.mart_operator,
      icon: Store,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20'
    }
  ]

  // Role Badge Styling
  const getRoleBadge = (role) => {
    const defaultStyle = 'px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 w-fit'
    switch (role) {
      case 'admin':
        return (
          <span className={`${defaultStyle} bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30`}>
            <Shield className="w-3.5 h-3.5" /> Admin
          </span>
        )
      case 'mart_operator':
        return (
          <span className={`${defaultStyle} bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30`}>
            <Store className="w-3.5 h-3.5" /> Mart Op
          </span>
        )
      case 'captain':
        return (
          <span className={`${defaultStyle} bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30`}>
            <Bike className="w-3.5 h-3.5" /> Captain
          </span>
        )
      default:
        return (
          <span className={`${defaultStyle} bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30`}>
            <User className="w-3.5 h-3.5" /> Customer
          </span>
        )
    }
  }

  // Order Status Color
  const getOrderStatusBadge = (status) => {
    const defaultStyle = 'px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider'
    switch (status) {
      case 'delivered':
        return <span className={`${defaultStyle} bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400`}>Delivered</span>
      case 'cancelled':
        return <span className={`${defaultStyle} bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400`}>Cancelled</span>
      case 'pending':
      case 'placed':
        return <span className={`${defaultStyle} bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 animate-pulse`}>Pending</span>
      default:
        return <span className={`${defaultStyle} bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400`}>{status}</span>
    }
  }

  const hasRequests = !!(userCaptainRequest || userMartRequest)
  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            User Directory
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitor registration counts, audit security permissions, view saved addresses, and inspect purchase histories.
          </p>
        </div>
        <button
          onClick={() => {
            loadStats()
            fetchUsers()
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 shadow-sm transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Directory
        </button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="p-5 rounded-2xl bg-white dark:bg-[#0d0d0d] border border-gray-100 dark:border-white/5 shadow-sm flex items-center justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {card.title}
              </span>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {card.value}
              </h3>
            </div>
            <div className={`p-3 rounded-xl ${card.bgColor} ${card.color}`}>
              <card.icon className="w-6 h-6" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Table Container & Filter Section */}
      <div className="bg-white dark:bg-[#0d0d0d] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
        {/* Filters Header */}
        <div className="p-5 border-b border-gray-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name, email or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-ozo-red text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-ozo hover:opacity-90 text-white font-medium text-sm rounded-xl transition-all shadow-sm"
            >
              Search
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={handleResetSearch}
                className="px-3 py-2 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Clear
              </button>
            )}
          </form>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-400 flex items-center gap-1.5">
              <Filter className="w-4 h-4" /> Filter Role:
            </span>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-4 pr-10 py-2 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-gray-750 dark:text-gray-300 focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_12px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] dark:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
            >
              <option value="all" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">All Roles</option>
              <option value="customer" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Customers</option>
              <option value="captain" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Captains</option>
              <option value="mart_operator" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Mart Operators</option>
              <option value="admin" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Admins</option>
            </select>
          </div>
        </div>

        {/* Content Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 text-ozo-red animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading user catalog...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto text-gray-400">
                <UsersIcon className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-gray-700 dark:text-gray-300">No users found</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                No profiles matched your search parameters. Try expanding your search queries or clearing filters.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-150 dark:border-white/5">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">User Profile</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Contact details</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Assigned Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Joined Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {users.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-all group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          profile={item}
                          className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden flex-shrink-0"
                          imgClassName="w-full h-full object-cover"
                        />
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white group-hover:text-ozo-red transition-colors">
                            {item.full_name || 'No Name'}
                          </p>
                          <span className="text-xs font-mono text-gray-400 block max-w-[200px] truncate" title={item.id}>
                            ID: {item.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5 text-sm">
                        <p className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-gray-400" /> {item.email}
                        </p>
                        {item.phone && (
                          <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400" /> {item.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(item.role)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formatDate(item.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenDrawer(item, 'profile')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-gray-100 hover:bg-gradient-ozo text-gray-700 hover:text-white dark:bg-white/5 dark:text-gray-300 dark:hover:text-white transition-all shadow-sm border border-gray-200/20"
                      >
                        <Eye className="w-3.5 h-3.5" /> View details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Section */}
        {totalPages > 1 && (
          <div className="p-5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Showing <span className="font-bold text-gray-800 dark:text-gray-200">{users.length}</span> of{' '}
              <span className="font-bold text-gray-800 dark:text-gray-200">{totalCount}</span> profiles
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="p-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 disabled:opacity-50 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages || loading}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="p-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 disabled:opacity-50 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Sliding Drawer (Overlay Layout) */}
      <AnimatePresence>
        {isDrawerOpen && selectedUser && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Sliding Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl bg-white dark:bg-[#0c0c0c] border-l border-gray-150 dark:border-white/5 shadow-2xl h-full flex flex-col z-10"
            >
              {/* Header profile area */}
              <div className="p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    profile={selectedUser}
                    className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-sm border border-gray-200 dark:border-white/5 flex-shrink-0"
                    imgClassName="w-full h-full object-cover"
                  />
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900 dark:text-white truncate max-w-[280px]">
                      {selectedUser.full_name || 'No Name'}
                    </h3>
                    <p className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-[280px]">
                      {selectedUser.id}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="grid grid-cols-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/[0.005]">
                {[
                  { id: 'profile', label: 'Profile' },
                  { id: 'requests', label: 'Requests' + (hasRequests ? ' 🔴' : '') },
                  { id: 'addresses', label: `Addresses (${userAddresses.length})` },
                  { id: 'orders', label: `Orders (${userOrders.length})` }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDrawerTab(tab.id)}
                    className={`py-3 px-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider relative transition-all border-b-2 text-center flex items-center justify-center min-h-[48px] ${
                      activeDrawerTab === tab.id
                        ? 'border-ozo-red text-ozo-red dark:text-white bg-gray-50/50 dark:bg-white/[0.02]'
                        : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Scrollable Contents */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {loadingDrawerData ? (
                  <div className="flex flex-col items-center justify-center py-24 space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-ozo-red" />
                    <p className="text-xs text-gray-400">Loading user relationship data...</p>
                  </div>
                ) : (
                  <>
                    {/* PROFILE TAB */}
                    {activeDrawerTab === 'profile' && (
                      <div className="space-y-5">
                        {/* Inner Tab Selector */}
                        <div className="flex border-b border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/[0.01] rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setProfileTabMode('form')}
                            className={`flex-1 py-2 text-center text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                              profileTabMode === 'form'
                                ? 'border-ozo-red text-ozo-red'
                                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                          >
                            Standard Form
                          </button>
                          <button
                            type="button"
                            onClick={() => setProfileTabMode('sql')}
                            className={`flex-1 py-2 text-center text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                              profileTabMode === 'sql'
                                ? 'border-ozo-red text-ozo-red'
                                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                            }`}
                          >
                            <Terminal className="w-3.5 h-3.5" />
                            SQL Query
                          </button>
                        </div>

                        {profileTabMode === 'form' ? (
                          <form onSubmit={handleUpdateUser} className="space-y-5">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                              Full Name
                            </label>
                            <input
                              type="text"
                              required
                              value={selectedUser.full_name || ''}
                              onChange={(e) =>
                                setSelectedUser({ ...selectedUser, full_name: e.target.value })
                              }
                              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm text-gray-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                              Email Address (Read Only)
                            </label>
                            <input
                              type="email"
                              disabled
                              value={selectedUser.email || ''}
                              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-xl text-sm text-gray-500 cursor-not-allowed"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              value={selectedUser.phone || ''}
                              onChange={(e) =>
                                setSelectedUser({ ...selectedUser, phone: e.target.value })
                              }
                              placeholder="e.g. 9876543210"
                              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm text-gray-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                              App Access Role
                            </label>
                            <select
                              value={selectedUser.role || 'customer'}
                              onChange={(e) =>
                                setSelectedUser({ ...selectedUser, role: e.target.value })
                              }
                              className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm text-gray-750 dark:text-gray-300 focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_12px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] dark:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
                            >
                              <option value="customer" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Customer (Default)</option>
                              <option value="captain" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Captain (Rider Portal)</option>
                              <option value="mart_operator" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Mart Operator (Store Portal)</option>
                              <option value="admin" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Administrator (Full Control)</option>
                            </select>
                          </div>
                        </div>

                        {/* Role specific alerts */}
                        {selectedUser.role === 'admin' && (
                          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl flex gap-2 text-xs text-red-600 dark:text-red-400 font-medium">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>
                              <strong>Warning:</strong> Admin status authorizes full reading, writing, and permission modifications.
                            </span>
                          </div>
                        )}
                        {selectedUser.role === 'captain' && originalUserRole !== 'captain' && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-xl flex gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                            <Bike className="w-4 h-4 flex-shrink-0" />
                            <span>
                              <strong>Notice:</strong> This user will automatically be created in the verified Captain database upon saving.
                            </span>
                          </div>
                        )}

                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3 bg-gradient-ozo text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-ozo/20 disabled:opacity-50"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
                              </>
                            ) : (
                              'Save Profile Changes'
                            )}
                          </button>
                        </div>
                          </form>
                        ) : (
                          <div className="space-y-4">
                            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-250/20 dark:border-amber-900/30 text-amber-600 dark:text-amber-400 p-3.5 rounded-xl text-xs leading-relaxed font-semibold">
                              <AlertTriangle className="w-4 h-4 inline mr-1.5 align-text-bottom text-amber-500" />
                              <strong>Warning:</strong> Arbitrary SQL updates the database directly. Be careful with keys and columns.
                            </div>

                            <div className="space-y-2">
                              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                                SQL Statement
                              </label>
                              <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-950 dark:bg-black p-3 font-mono text-xs">
                                <textarea
                                  value={customSql}
                                  onChange={(e) => setCustomSql(e.target.value)}
                                  className="w-full bg-transparent text-emerald-400 focus:outline-none min-h-[200px] leading-relaxed resize-y font-mono"
                                  spellCheck="false"
                                />
                              </div>
                            </div>

                            {sqlResult && (
                              <div className={`p-4 rounded-xl text-xs font-mono border ${
                                sqlResult.success 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250/20 text-emerald-600 dark:text-emerald-400' 
                                  : 'bg-red-50 dark:bg-red-950/20 border-red-250/20 text-red-600 dark:text-red-400'
                              }`}>
                                <p className="font-bold mb-1">{sqlResult.success ? 'Success!' : 'Postgres Error:'}</p>
                                <p className="whitespace-pre-wrap">{sqlResult.message || sqlResult.error}</p>
                                {sqlResult.rowsAffected !== undefined && (
                                  <p className="mt-1 opacity-80">Rows affected: {sqlResult.rowsAffected}</p>
                                )}
                              </div>
                            )}

                            <div className="flex gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setCustomSql(generateUserSql())}
                                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-gray-350 text-gray-700 font-bold rounded-xl text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                title="Reset to generated SQL"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Reset
                              </button>
                              <button
                                type="button"
                                onClick={handleRunDrawerSql}
                                disabled={runningSql}
                                className="flex-1 px-4 py-3 bg-gradient-ozo text-white font-bold rounded-xl text-sm shadow-ozo hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                {runningSql ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Running...
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4 fill-current" />
                                    Execute SQL
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* REQUESTS & APPLICATIONS TAB */}
                    {activeDrawerTab === 'requests' && (
                      <div className="space-y-6">
                        {!hasRequests ? (
                          <div className="text-center py-16 bg-gray-50/50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-gray-200 dark:border-white/5">
                            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              No Onboarding Requests Found
                            </p>
                            <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1">
                              This customer has not registered any Captain / Rider applications or Supermarket applications yet.
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Captain Application request */}
                            {userCaptainRequest && (
                              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-200/50 dark:border-white/5 pb-3">
                                  <div className="flex items-center gap-2">
                                    <Bike className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                                      Captain/Rider Request
                                    </span>
                                  </div>
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    userCaptainRequest.status === 'pending_verification'
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                      : userCaptainRequest.status === 'rejected'
                                      ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                                      : 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                                  }`}>
                                    {userCaptainRequest.status}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs">
                                  <div>
                                    <span className="text-gray-400 block font-semibold">Vehicle Number</span>
                                    <span className="font-bold font-mono text-gray-800 dark:text-gray-200 text-sm">
                                      {userCaptainRequest.bike_number || 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 block font-semibold">Joined / Applied On</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-200">
                                      {formatDate(userCaptainRequest.created_at)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 block font-semibold">Driving License</span>
                                    <span className="font-bold font-mono text-gray-800 dark:text-gray-200">
                                      {userCaptainRequest.driving_license || 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 block font-semibold">Aadhar Number</span>
                                    <span className="font-bold font-mono text-gray-800 dark:text-gray-200">
                                      {userCaptainRequest.aadhar_number || 'N/A'}
                                    </span>
                                  </div>
                                </div>

                                {/* Documents Signed Urls display */}
                                <div className="pt-3 border-t border-gray-200/50 dark:border-white/5 space-y-3">
                                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    Uploaded Identification Docs
                                  </h4>

                                  {loadingDocs ? (
                                    <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                                      <Loader2 className="w-4 h-4 animate-spin text-ozo-red" /> Fetching document previews...
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-3 gap-2">
                                      {[
                                        { key: 'aadhar', name: 'Aadhar Card', url: docUrls.aadhar },
                                        { key: 'dl', name: 'Driving License', url: docUrls.dl },
                                        { key: 'selfie', name: 'Selfie Photograph', url: docUrls.selfie }
                                      ].map((doc) => (
                                        <div key={doc.key} className="space-y-1">
                                          <span className="text-[10px] text-gray-400 block font-semibold truncate">
                                            {doc.name}
                                          </span>
                                          {doc.url ? (
                                            <a
                                              href={doc.url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="block aspect-square relative rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden group bg-black/5 dark:bg-white/[0.02] transition-all duration-300 hover:scale-[4] hover:z-50 hover:shadow-2xl cursor-zoom-in"
                                            >
                                              <img
                                                src={doc.url}
                                                alt={doc.name}
                                                className="w-full h-full object-cover"
                                              />
                                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                                <ExternalLink className="w-4 h-4 text-white" />
                                              </div>
                                            </a>
                                          ) : (
                                            <div className="aspect-square rounded-xl bg-gray-100 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center text-[10px] text-gray-400 text-center p-1">
                                              <ImageIcon className="w-5 h-5 text-gray-300 mb-1" />
                                              Not uploaded
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Decision Action Buttons */}
                                {userCaptainRequest.status === 'pending_verification' && (
                                  <div className="flex gap-2 pt-3 border-t border-gray-200/50 dark:border-white/5">
                                    <button
                                      onClick={() => handleRejectRider(userCaptainRequest)}
                                      className="flex-1 py-2 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                                    >
                                      <X className="w-3.5 h-3.5" /> Reject Request
                                    </button>
                                    <button
                                      onClick={() => handleApproveRider(userCaptainRequest)}
                                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10 transition-all"
                                    >
                                      <Check className="w-3.5 h-3.5" /> Approve Rider
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Mart Application request */}
                            {userMartRequest && (
                              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-200/50 dark:border-white/5 pb-3">
                                  <div className="flex items-center gap-2">
                                    <Store className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                                      Supermarket Request
                                    </span>
                                  </div>
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    userMartRequest.status === 'pending_verification'
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                      : userMartRequest.status === 'rejected'
                                      ? 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                                      : 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                                  }`}>
                                    {userMartRequest.status}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs">
                                  <div>
                                    <span className="text-gray-400 block font-semibold">Store Name</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                                      🏪 {userMartRequest.store_name || 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 block font-semibold">Owner Name</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-200">
                                      {userMartRequest.owner_name || 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 block font-semibold">GSTIN / License</span>
                                    <span className="font-bold font-mono text-gray-800 dark:text-gray-200">
                                      {userMartRequest.license_number || 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 block font-semibold">Date Registered</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-200">
                                      {formatDate(userMartRequest.created_at)}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <span className="text-gray-400 block text-xs font-semibold">Supermarket Address</span>
                                  <p className="text-xs text-gray-700 dark:text-gray-300 font-medium bg-white dark:bg-black/20 p-2.5 rounded-xl border border-gray-200 dark:border-white/5 mt-1">
                                    {userMartRequest.address || 'No Address provided'}
                                  </p>
                                </div>

                                {/* Decision Action Buttons */}
                                {userMartRequest.status === 'pending_verification' && (
                                  <div className="flex gap-2 pt-3 border-t border-gray-200/50 dark:border-white/5">
                                    <button
                                      onClick={() => handleRejectMart(userMartRequest)}
                                      className="flex-1 py-2 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                                    >
                                      <X className="w-3.5 h-3.5" /> Reject Request
                                    </button>
                                    <button
                                      onClick={() => handleApproveMart(userMartRequest)}
                                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10 transition-all"
                                    >
                                      <Check className="w-3.5 h-3.5" /> Approve Mart
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* ADDRESSES TAB */}
                    {activeDrawerTab === 'addresses' && (
                      <div className="space-y-4">
                        {userAddresses.length === 0 ? (
                          <div className="text-center py-12 text-sm text-gray-500">
                            <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            No saved addresses found for this profile.
                          </div>
                        ) : (
                          userAddresses.map((addr) => (
                            <div
                              key={addr.id}
                              className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 relative overflow-hidden"
                            >
                              {editingAddress && editingAddress.id === addr.id ? (
                                <form onSubmit={handleSaveAddress} className="space-y-4">
                                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-ozo-red">
                                      Edit Address
                                    </h4>
                                    <button
                                      type="button"
                                      onClick={() => setEditingAddress(null)}
                                      className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md text-gray-400 hover:text-gray-605 dark:hover:text-white"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-400 block uppercase mb-1">Label</label>
                                      <input
                                        type="text"
                                        value={editingAddress.label || ''}
                                        onChange={(e) => setEditingAddress({ ...editingAddress, label: e.target.value })}
                                        className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red font-semibold"
                                        placeholder="e.g. Home, Work"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-400 block uppercase mb-1">Landmark</label>
                                      <input
                                        type="text"
                                        value={editingAddress.landmark || ''}
                                        onChange={(e) => setEditingAddress({ ...editingAddress, landmark: e.target.value })}
                                        className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red font-semibold"
                                        placeholder="e.g. Near park"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-gray-400 block uppercase mb-1">Address Line 1</label>
                                    <input
                                      type="text"
                                      required
                                      value={editingAddress.address_line1 || ''}
                                      onChange={(e) => setEditingAddress({ ...editingAddress, address_line1: e.target.value })}
                                      className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red font-semibold"
                                      placeholder="Street address, building, etc."
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-gray-400 block uppercase mb-1">Address Line 2 (Optional)</label>
                                    <input
                                      type="text"
                                      value={editingAddress.address_line2 || ''}
                                      onChange={(e) => setEditingAddress({ ...editingAddress, address_line2: e.target.value })}
                                      className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red font-semibold"
                                      placeholder="Suite, apartment, area, etc."
                                    />
                                  </div>

                                  <div className="grid grid-cols-3 gap-3">
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-400 block uppercase mb-1">City</label>
                                      <input
                                        type="text"
                                        required
                                        value={editingAddress.city || ''}
                                        onChange={(e) => setEditingAddress({ ...editingAddress, city: e.target.value })}
                                        className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red font-semibold"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-400 block uppercase mb-1">State</label>
                                      <input
                                        type="text"
                                        required
                                        value={editingAddress.state || ''}
                                        onChange={(e) => setEditingAddress({ ...editingAddress, state: e.target.value })}
                                        className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red font-semibold"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-400 block uppercase mb-1">Pincode</label>
                                      <input
                                        type="text"
                                        required
                                        value={editingAddress.pincode || ''}
                                        onChange={(e) => setEditingAddress({ ...editingAddress, pincode: e.target.value })}
                                        className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red font-semibold"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-400 block uppercase mb-1">Latitude</label>
                                      <input
                                        type="number"
                                        step="any"
                                        value={editingAddress.latitude || ''}
                                        onChange={(e) => setEditingAddress({ ...editingAddress, latitude: e.target.value })}
                                        className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red font-mono"
                                        placeholder="e.g. 25.6234"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-gray-400 block uppercase mb-1">Longitude</label>
                                      <input
                                        type="number"
                                        step="any"
                                        value={editingAddress.longitude || ''}
                                        onChange={(e) => setEditingAddress({ ...editingAddress, longitude: e.target.value })}
                                        className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red font-mono"
                                        placeholder="e.g. 85.1323"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 py-1">
                                    <input
                                      type="checkbox"
                                      id={`is_default_edit_${addr.id}`}
                                      checked={!!editingAddress.is_default}
                                      onChange={(e) => setEditingAddress({ ...editingAddress, is_default: e.target.checked })}
                                      className="rounded border-gray-300 text-ozo-red focus:ring-ozo-red w-4 h-4 bg-white dark:bg-black/40"
                                    />
                                    <label htmlFor={`is_default_edit_${addr.id}`} className="text-xs text-gray-650 dark:text-gray-300 font-semibold select-none cursor-pointer">
                                      Mark as Default Address
                                    </label>
                                  </div>

                                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                                    <button
                                      type="button"
                                      onClick={() => setEditingAddress(null)}
                                      className="flex-1 py-2 px-3 text-xs font-bold text-gray-550 dark:text-gray-400 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl transition-all"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      disabled={savingAddressId === addr.id}
                                      className="flex-1 py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/10"
                                    >
                                      {savingAddressId === addr.id ? (
                                        <>
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          Saving...
                                        </>
                                      ) : (
                                        <>
                                          <Check className="w-3.5 h-3.5" />
                                          Save Changes
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                        {addr.label || 'Home'}
                                      </span>
                                      {addr.is_default && (
                                        <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                          Default
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => setEditingAddress({ ...addr })}
                                      className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg transition-all"
                                      title="Edit Address"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                    {addr.address_line1}
                                  </p>
                                  {addr.address_line2 && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                      {addr.address_line2}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    {addr.city}, {addr.state} - {addr.pincode}
                                  </p>
                                  {addr.landmark && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400/90 font-medium mt-1">
                                      Landmark: {addr.landmark}
                                    </p>
                                  )}

                                  {addr.latitude && addr.longitude && (
                                    <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-white/5 flex items-center gap-2 text-[10px] text-gray-400 font-mono">
                                      <Activity className="w-3.5 h-3.5" />
                                      GPS: {parseFloat(addr.latitude).toFixed(5)}, {parseFloat(addr.longitude).toFixed(5)}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* ORDERS TAB */}
                    {activeDrawerTab === 'orders' && (
                      <div className="space-y-4">
                        {userOrders.length === 0 ? (
                          <div className="text-center py-12 text-sm text-gray-500">
                            <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            No order history found for this profile.
                          </div>
                        ) : (
                          userOrders.map((order) => {
                            const isExpanded = !!expandedOrders[order.id]
                            const items = orderItemsMap[order.id] || []
                            const isLoadingItems = !!loadingOrderItems[order.id]

                            return (
                              <div
                                key={order.id}
                                className="border border-gray-150 dark:border-white/5 rounded-2xl overflow-hidden bg-gray-50/50 dark:bg-white/[0.01] transition-all hover:border-gray-300 dark:hover:border-white/10"
                              >
                                {/* Order Main summary */}
                                <div
                                  onClick={() => toggleOrderItems(order.id)}
                                  className="p-4 flex items-center justify-between cursor-pointer select-none bg-white dark:bg-[#0c0c0c] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                                        #{order.order_number || order.id.substring(0, 8).toUpperCase()}
                                      </span>
                                      {getOrderStatusBadge(order.status)}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatDateTime(order.created_at)}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <p className="font-extrabold text-sm text-gray-900 dark:text-white">
                                        ₹{parseFloat(order.total || 0).toFixed(2)}
                                      </p>
                                      <p className="text-[10px] text-gray-400">
                                        {order.payment_method?.toUpperCase() || 'COD'}
                                      </p>
                                    </div>
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-gray-400" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-gray-400" />
                                    )}
                                  </div>
                                </div>

                                {/* Expanded order items details */}
                                <AnimatePresence>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="border-t border-gray-150 dark:border-white/5 bg-gray-50 dark:bg-[#0f0f1f]/10 p-4"
                                    >
                                      {isLoadingItems ? (
                                        <div className="flex items-center justify-center py-4">
                                          <Loader2 className="w-5 h-5 animate-spin text-ozo-red" />
                                        </div>
                                      ) : items.length === 0 ? (
                                        <p className="text-xs text-gray-500 text-center py-2">
                                          No items recorded in this order.
                                        </p>
                                      ) : (
                                        <div className="space-y-3">
                                          {items.map((item) => (
                                            <div
                                              key={item.id}
                                              className="flex items-center justify-between text-xs"
                                            >
                                              <div className="flex items-center gap-2 min-w-0">
                                                {item.product_image ? (
                                                  <div className="w-8 h-8 rounded-lg bg-white overflow-hidden flex items-center justify-center border border-gray-200 dark:border-white/5 flex-shrink-0 transition-all duration-300 hover:scale-[7] hover:z-50 hover:shadow-2xl relative cursor-zoom-in">
                                                    <img
                                                      src={item.product_image}
                                                      alt={item.product_name}
                                                      className="w-full h-full object-cover"
                                                    />
                                                  </div>
                                                ) : (
                                                  <div className="w-8 h-8 bg-gray-100 dark:bg-white/5 rounded-lg flex items-center justify-center">
                                                    📦
                                                  </div>
                                                )}
                                                <div className="min-w-0">
                                                  <p className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[200px]">
                                                    {item.product_name}
                                                  </p>
                                                  <p className="text-gray-400 text-[10px]">
                                                    ₹{parseFloat(item.unit_price || 0).toFixed(2)} x{' '}
                                                    {item.quantity}
                                                  </p>
                                                </div>
                                              </div>
                                              <span className="font-extrabold text-gray-900 dark:text-white">
                                                ₹{parseFloat(item.total_price || 0).toFixed(2)}
                                              </span>
                                            </div>
                                          ))}

                                          {/* Subtotal breaking summary */}
                                          <div className="pt-3 mt-3 border-t border-gray-200 dark:border-white/5 text-[11px] space-y-1 text-gray-500 dark:text-gray-400">
                                            <div className="flex justify-between">
                                              <span>Subtotal</span>
                                              <span>₹{parseFloat(order.subtotal || 0).toFixed(2)}</span>
                                            </div>
                                            {parseFloat(order.delivery_fee || 0) > 0 && (
                                              <div className="flex justify-between">
                                                <span>Delivery Fee</span>
                                                <span>+₹{parseFloat(order.delivery_fee || 0).toFixed(2)}</span>
                                              </div>
                                            )}
                                            {parseFloat(order.discount || 0) > 0 && (
                                              <div className="flex justify-between text-emerald-600 font-medium">
                                                <span>Discount ({order.coupon_code || 'Promo'})</span>
                                                <span>-₹{parseFloat(order.discount || 0).toFixed(2)}</span>
                                              </div>
                                            )}
                                            <div className="flex justify-between font-extrabold text-gray-800 dark:text-gray-200 text-xs pt-1.5">
                                              <span>Total</span>
                                              <span>₹{parseFloat(order.total || 0).toFixed(2)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Users