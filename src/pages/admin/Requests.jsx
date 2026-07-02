import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  X,
  User,
  Store,
  Phone,
  Calendar,
  MapPin,
  Bike,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  FileText,
  Search,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { supabaseAdmin as supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const Requests = () => {
  // Tabs: 'riders' | 'marts' | 'active_riders' | 'active_marts' | 'returns'
  const [activeTab, setActiveTab] = useState('riders')
  
  // Data lists
  const [riderRequests, setRiderRequests] = useState([])
  const [martRequests, setMartRequests] = useState([])
  const [activeRiders, setActiveRiders] = useState([])
  const [activeMarts, setActiveMarts] = useState([])
  const [returnRequests, setReturnRequests] = useState([])
  
  // Search & Loading
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [submittingId, setSubmittingId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  
  const getCurrentListLength = () => {
    switch (activeTab) {
      case 'riders':
        return getFilteredRiders().length
      case 'marts':
        return getFilteredMarts().length
      case 'returns':
        return getFilteredReturns().length
      case 'active_riders':
        return getFilteredActiveRiders().length
      case 'active_marts':
        return getFilteredActiveMarts().length
      default:
        return 0
    }
  }

  const getTotalPages = () => {
    return Math.ceil(getCurrentListLength() / pageSize)
  }
  
  // Details Drawer/Modal
  const [selectedRider, setSelectedRider] = useState(null)
  const [selectedMart, setSelectedMart] = useState(null)
  const [selectedReturn, setSelectedReturn] = useState(null)
  const [adminComment, setAdminComment] = useState('')
  
  // Document Signed URLs state
  const [docUrls, setDocUrls] = useState({ aadhar: null, dl: null, selfie: null })
  const [loadingDocs, setLoadingDocs] = useState(false)
  
  // Stats
  const [stats, setStats] = useState({
    pendingRiders: 0,
    pendingMarts: 0,
    activeRidersCount: 0,
    activeMartsCount: 0,
    pendingReturns: 0
  })

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Fetch pending riders
      const { data: pendingRidersData, error: prErr } = await supabase
        .from('captains')
        .select('*')
        .eq('status', 'pending_verification')
        .order('created_at', { ascending: false })
      if (prErr) throw prErr

      // 2. Fetch pending marts
      const { data: pendingMartsData, error: pmErr } = await supabase
        .from('mart_applications')
        .select('*')
        .eq('status', 'pending_verification')
        .order('created_at', { ascending: false })
      if (pmErr) throw pmErr

      // 3. Fetch active/approved riders
      const { data: activeRidersData, error: arErr } = await supabase
        .from('captains')
        .select('*')
        .neq('status', 'pending_verification')
        .order('created_at', { ascending: false })
      if (arErr) throw arErr

      // 4. Fetch all marts
      const { data: martsData, error: mErr } = await supabase
        .from('marts')
        .select('*')
        .order('created_at', { ascending: false })
      if (mErr) throw mErr

      // 5. Fetch return requests
      const { data: returnsData, error: retErr } = await supabase
        .from('return_requests')
        .select(`
          *,
          user:users (
            full_name,
            phone
          ),
          order:orders (
            order_number,
            total,
            delivered_at,
            delivery_proof_image_1,
            delivery_proof_image_2,
            order_items (
              product_name,
              quantity,
              unit_price,
              total_price
            )
          )
        `)
        .order('created_at', { ascending: false })
      if (retErr) throw retErr

      setRiderRequests(pendingRidersData || [])
      setMartRequests(pendingMartsData || [])
      setActiveRiders(activeRidersData || [])
      setActiveMarts(martsData || [])
      setReturnRequests(returnsData || [])

      setStats({
        pendingRiders: (pendingRidersData || []).length,
        pendingMarts: (pendingMartsData || []).length,
        activeRidersCount: (activeRidersData || []).filter(r => r.status !== 'rejected').length,
        activeMartsCount: (martsData || []).filter(m => m.is_active).length,
        pendingReturns: (returnsData || []).filter(r => r.status === 'pending').length
      })
    } catch (error) {
      console.error('Error loading verification data:', error)
      toast.error('Failed to load application requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery])

  // Generate signed URLs when a rider is selected
  useEffect(() => {
    const fetchSignedUrls = async () => {
      if (!selectedRider) {
        setDocUrls({ aadhar: null, dl: null, selfie: null })
        return
      }

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
          getUrl(selectedRider.aadhar_card_url),
          getUrl(selectedRider.driving_license_url),
          getUrl(selectedRider.selfie_url)
        ])

        setDocUrls({
          aadhar: aadharUrl,
          dl: dlUrl,
          selfie: selfieUrl
        })
      } catch (err) {
        console.error('Failed to load signed document URLs:', err)
        toast.error('Could not retrieve private document images')
      } finally {
        setLoadingDocs(false)
      }
    }

    fetchSignedUrls()
  }, [selectedRider])

  // Rider Approval
  const handleApproveRider = async (rider) => {
    setSubmittingId(rider.id)
    const toastId = toast.loading('Approving rider application...')
    try {
      // 1. Update status in captains
      const { error: capError } = await supabase
        .from('captains')
        .update({ status: 'offline' })
        .eq('id', rider.id)
      if (capError) throw capError

      // 2. Update role in users
      const { error: userError } = await supabase
        .from('users')
        .update({ role: 'captain' })
        .eq('id', rider.id)
      if (userError) throw userError

      toast.success('Rider application approved & portal activated!', { id: toastId })
      setSelectedRider(null)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to approve rider: ' + err.message, { id: toastId })
    } finally {
      setSubmittingId(null)
    }
  }

  // Rider Rejection
  const handleRejectRider = async (rider) => {
    if (!window.confirm('Are you sure you want to REJECT this rider application?')) return
    setSubmittingId(rider.id)
    const toastId = toast.loading('Rejecting rider application...')
    try {
      const { error } = await supabase
        .from('captains')
        .update({ status: 'rejected' })
        .eq('id', rider.id)
      if (error) throw error

      toast.success('Rider application rejected.', { id: toastId })
      setSelectedRider(null)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to reject rider: ' + err.message, { id: toastId })
    } finally {
      setSubmittingId(null)
    }
  }

  // Mart Approval
  const handleApproveMart = async (app) => {
    setSubmittingId(app.id)
    const toastId = toast.loading('Approving store application...')
    try {
      // 1. Update status in mart_applications
      const { error: appError } = await supabase
        .from('mart_applications')
        .update({ status: 'approved' })
        .eq('id', app.id)
      if (appError) throw appError

      // 2. Update user's role in users table
      const { error: userError } = await supabase
        .from('users')
        .update({ role: 'mart_operator' })
        .eq('id', app.id)
      if (userError) throw userError

      // 3. Create a corresponding entry in marts table
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
          is_active: true,
          owner_id: app.id
        })
      if (martError) throw martError

      // 4. Create database notification (will auto-trigger OneSignal push notification)
      const { error: notifError } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: app.id,
            title: 'Mart Application Approved! 🎉',
            message: `Congratulations! Your store application for "${app.store_name}" has been approved. You can now access your Mart Operator portal.`,
            type: 'system',
            data: { status: 'approved', store_name: app.store_name }
          }
        ])
      if (notifError) console.error('Failed to create approval notification:', notifError)

      toast.success('Supermarket approved, registered & portal activated!', { id: toastId })
      setSelectedMart(null)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to approve mart: ' + err.message, { id: toastId })
    } finally {
      setSubmittingId(null)
    }
  }

  // Mart Rejection
  const handleRejectMart = async (app) => {
    if (!window.confirm('Are you sure you want to REJECT this store application?')) return
    setSubmittingId(app.id)
    const toastId = toast.loading('Rejecting store application...')
    try {
      const { error } = await supabase
        .from('mart_applications')
        .update({ status: 'rejected' })
        .eq('id', app.id)
      if (error) throw error

      // Create database notification (will auto-trigger OneSignal push notification)
      const { error: notifError } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: app.id,
            title: 'Mart Application Rejected 😔',
            message: `We regret to inform you that your application for "${app.store_name}" was rejected. Please contact support for details.`,
            type: 'system',
            data: { status: 'rejected', store_name: app.store_name }
          }
        ])
      if (notifError) console.error('Failed to create rejection notification:', notifError)

      toast.success('Supermarket application rejected.', { id: toastId })
      setSelectedMart(null)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to reject mart: ' + err.message, { id: toastId })
    } finally {
      setSubmittingId(null)
    }
  }

  // Return Approval
  const handleApproveReturn = async (retReq) => {
    if (!window.confirm('Are you sure you want to APPROVE this return request? The order amount will be credited back to the customer\'s wallet immediately.')) return
    setSubmittingId(retReq.id)
    const toastId = toast.loading('Processing approval & wallet refund...')
    try {
      const { error } = await supabase
        .from('return_requests')
        .update({ 
          status: 'approved',
          admin_comment: adminComment || 'Approved'
        })
        .eq('id', retReq.id)
      if (error) throw error

      toast.success('Return request approved & refunded successfully!', { id: toastId })
      setSelectedReturn(null)
      setAdminComment('')
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to approve return: ' + err.message, { id: toastId })
    } finally {
      setSubmittingId(null)
    }
  }

  // Return Rejection
  const handleRejectReturn = async (retReq) => {
    if (!adminComment.trim()) {
      toast.error('Please enter a rejection reason in feedback comments')
      return
    }
    if (!window.confirm('Are you sure you want to REJECT this return request?')) return
    setSubmittingId(retReq.id)
    const toastId = toast.loading('Processing rejection...')
    try {
      const { error } = await supabase
        .from('return_requests')
        .update({ 
          status: 'rejected',
          admin_comment: adminComment
        })
        .eq('id', retReq.id)
      if (error) throw error

      toast.success('Return request rejected.', { id: toastId })
      setSelectedReturn(null)
      setAdminComment('')
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to reject return: ' + err.message, { id: toastId })
    } finally {
      setSubmittingId(null)
    }
  }

  // Filters logic
  const getFilteredReturns = () => {
    return returnRequests.filter(r => 
      (r.user?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.order?.order_number || '').includes(searchQuery) ||
      (r.reason || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const getFilteredRiders = () => {
    return riderRequests.filter(r => 
      r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery)
    )
  }

  const getFilteredMarts = () => {
    return martRequests.filter(m => 
      m.store_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.owner_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.includes(searchQuery)
    )
  }

  const getFilteredActiveRiders = () => {
    return activeRiders.filter(r => 
      r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery)
    )
  }

  const getFilteredActiveMarts = () => {
    return activeMarts.filter(m => 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.slug.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium">
        <div>
          <h1 className="text-3xl font-black text-gradient">Verification Desk</h1>
          <p className="text-sm text-ozo-gray mt-1">Review onboarding applications and grant portal permissions.</p>
        </div>
        <button
          onClick={loadData}
          className="p-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-2xl border border-gray-200 dark:border-white/10 transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Reload Applications
        </button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Pending Riders</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600">
              <Bike className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-gray-900 dark:text-white">{stats.pendingRiders}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Pending Marts</span>
            <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-gray-900 dark:text-white">{stats.pendingMarts}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Pending Returns</span>
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-905/20 text-red-600">
              <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-red-650">{stats.pendingReturns}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Active Captains</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-emerald-650">{stats.activeRidersCount}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Active Marts</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-blue-650">{stats.activeMartsCount}</p>
        </div>
      </div>

      {/* Tabs & Search Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between p-4 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
        <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl w-full lg:w-auto overflow-x-auto whitespace-nowrap bg-gray-100 dark:bg-zinc-800">
          <button
            onClick={() => { setActiveTab('riders'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'riders'
                ? 'bg-white dark:bg-[#161622] text-[#FF3366] shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Rider Requests ({stats.pendingRiders})
          </button>
          <button
            onClick={() => { setActiveTab('marts'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'marts'
                ? 'bg-white dark:bg-[#161622] text-[#FF3366] shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Mart Requests ({stats.pendingMarts})
          </button>
          <button
            onClick={() => { setActiveTab('returns'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'returns'
                ? 'bg-white dark:bg-[#161622] text-[#FF3366] shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Return Requests ({stats.pendingReturns})
          </button>
          <button
            onClick={() => { setActiveTab('active_riders'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'active_riders'
                ? 'bg-white dark:bg-[#161622] text-[#FF3366] shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Verified Captains
          </button>
          <button
            onClick={() => { setActiveTab('active_marts'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'active_marts'
                ? 'bg-white dark:bg-[#161622] text-[#FF3366] shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Verified Marts
          </button>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab.replace('_', ' ')}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-ozo-red"
          />
        </div>
      </div>

      {/* Main List Table */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-ozo-red" />
            <p className="text-sm font-semibold text-gray-500">Retrieving requests file...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            {/* RIDER REQUESTS TABLE */}
            {activeTab === 'riders' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Applicant</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Vehicle Details</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">License & Aadhar</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date Applied</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {getFilteredRiders().length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-12 text-center text-sm text-gray-500">
                        No pending rider verification requests found.
                      </td>
                    </tr>
                  ) : (
                    getFilteredRiders().slice((currentPage - 1) * pageSize, currentPage * pageSize).map((rider) => (
                      <tr key={rider.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                        <td className="p-4">
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">{rider.full_name}</div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5" /> {rider.phone}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 uppercase">
                            <Bike className="w-3.5 h-3.5" /> {rider.bike_number}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-xs text-gray-700 dark:text-gray-300">
                            <div>DL: <span className="font-mono font-bold text-gray-900 dark:text-white">{rider.driving_license}</span></div>
                            <div className="mt-0.5">Aadhar: <span className="font-mono font-bold text-gray-900 dark:text-white">{rider.aadhar_number}</span></div>
                          </div>
                        </td>
                        <td className="p-4 text-xs text-gray-500 font-medium">
                          {new Date(rider.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedRider(rider)}
                            className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-gray-300 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-gray-200 dark:border-white/5"
                          >
                            <Eye className="w-3.5 h-3.5" /> View & Review
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* MART REQUESTS TABLE */}
            {activeTab === 'marts' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Store & Owner</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Contact</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">GSTIN/License</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Address</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {getFilteredMarts().length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-12 text-center text-sm text-gray-500">
                        No pending supermarket applications found.
                      </td>
                    </tr>
                  ) : (
                    getFilteredMarts().slice((currentPage - 1) * pageSize, currentPage * pageSize).map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                        <td className="p-4">
                          <div>
                            <div className="font-extrabold text-gray-905 dark:text-white flex items-center gap-1.5">
                              🏪 {app.store_name}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 font-medium">Owner: {app.owner_name}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-xs">
                            <div className="font-bold text-gray-905 dark:text-white">{app.phone}</div>
                            <div className="text-gray-400 mt-0.5">{app.email}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-mono font-bold text-xs bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">
                            {app.license_number || 'N/A'}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 max-w-[200px]" title={app.address}>
                            {app.address}
                          </p>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedMart(app)}
                            className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-gray-300 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-gray-200 dark:border-white/5"
                          >
                            <Eye className="w-3.5 h-3.5" /> View & Review
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* RETURN REQUESTS TABLE */}
            {activeTab === 'returns' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Order Details</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Return Issue</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {getFilteredReturns().length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-12 text-center text-sm text-gray-500">
                        No return requests found.
                      </td>
                    </tr>
                  ) : (
                    getFilteredReturns().slice((currentPage - 1) * pageSize, currentPage * pageSize).map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                        <td className="p-4">
                          <div>
                            <div className="font-extrabold text-gray-905 dark:text-white flex items-center gap-1.5 text-xs">
                              Order #{req.order?.order_number || req.order_id.slice(0, 8)}
                            </div>
                            <div className="text-xs font-bold text-ozo-red mt-0.5">₹{req.order?.total?.toLocaleString()}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white text-xs">{req.user?.full_name || 'Customer'}</div>
                            <div className="text-[10px] text-gray-450 font-bold mt-0.5">{req.user?.phone || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-500">
                              {req.reason}
                            </span>
                            {req.custom_note && (
                              <p className="text-[11px] font-semibold text-gray-550 dark:text-gray-400 line-clamp-1 max-w-[220px] mt-1" title={req.custom_note}>
                                {req.custom_note}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            req.status === 'approved'
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
                              : req.status === 'rejected'
                              ? 'bg-red-500/10 border border-red-500/20 text-red-500'
                              : 'bg-amber-500/10 border border-amber-500/20 text-amber-500 animate-pulse'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedReturn(req)
                              setAdminComment(req.admin_comment || '')
                            }}
                            className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-gray-300 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-gray-200 dark:border-white/5"
                          >
                            <Eye className="w-3.5 h-3.5" /> Inspect Request
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* ACTIVE/VERIFIED RIDERS TABLE */}
            {activeTab === 'active_riders' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Captain</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Vehicle Details</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Earnings</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Review Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {getFilteredActiveRiders().length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-12 text-center text-sm text-gray-500">
                        No verified riders found.
                      </td>
                    </tr>
                  ) : (
                    getFilteredActiveRiders().slice((currentPage - 1) * pageSize, currentPage * pageSize).map((rider) => (
                      <tr key={rider.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                        <td className="p-4">
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">{rider.full_name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{rider.phone}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">
                            🏍 {rider.bike_number}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            rider.status === 'online'
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
                              : rider.status === 'busy'
                              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500'
                              : rider.status === 'offline'
                              ? 'bg-gray-500/10 border border-gray-500/20 text-gray-550 dark:text-gray-400'
                              : 'bg-red-500/10 border border-red-500/20 text-red-500'
                          }`}>
                            {rider.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-xs font-bold text-gray-900 dark:text-white">
                            <div>Earnings: ₹{rider.earnings}</div>
                            <div className="text-gray-400 text-[10px] mt-0.5 font-bold">Cash: ₹{rider.cash_in_hand}</div>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedRider(rider)}
                            className="inline-flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-gray-200 dark:border-white/5"
                          >
                            <FileText className="w-3.5 h-3.5" /> Full File
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* ACTIVE/VERIFIED MARTS TABLE */}
            {activeTab === 'active_marts' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Supermarket Name</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Slug ID</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Address</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {getFilteredActiveMarts().length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-12 text-center text-sm text-gray-500">
                        No active supermarkets registered.
                      </td>
                    </tr>
                  ) : (
                    getFilteredActiveMarts().slice((currentPage - 1) * pageSize, currentPage * pageSize).map((mart) => (
                      <tr key={mart.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                        <td className="p-4 font-black text-gray-900 dark:text-white flex items-center gap-2">
                          🏪 {mart.name}
                        </td>
                        <td className="p-4 text-xs font-mono text-gray-500 font-semibold">{mart.slug}</td>
                        <td className="p-4 text-xs text-gray-500 dark:text-gray-400 line-clamp-1 max-w-[280px]" title={mart.address}>
                          {mart.address}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            mart.is_active
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            {mart.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-gray-500 font-medium text-right">
                          {new Date(mart.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          {getTotalPages() > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/[0.01]">
              <div className="text-xs text-gray-500 font-medium">
                Showing <span className="font-bold text-gray-900 dark:text-white">{Math.min((currentPage - 1) * pageSize + 1, getCurrentListLength())}</span> to{' '}
                <span className="font-bold text-gray-900 dark:text-white">{Math.min(currentPage * pageSize, getCurrentListLength())}</span> of{' '}
                <span className="font-bold text-gray-900 dark:text-white">{getCurrentListLength()}</span> entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-gray-900 dark:text-white px-2">
                  Page {currentPage} of {getTotalPages()}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, getTotalPages()))}
                  disabled={currentPage === getTotalPages()}
                  className="p-2 rounded-lg border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>

      {/* RIDER DRAWER OVERLAY */}
      <AnimatePresence>
        {selectedRider && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRider(null)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-xl bg-white dark:bg-[#0c0c12] border-l border-gray-200 dark:border-white/5 shadow-2xl z-50 flex flex-col font-sans overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50 dark:bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 dark:bg-amber-950/30 p-2.5 rounded-xl text-amber-600">
                    <Bike className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-gray-900 dark:text-white uppercase tracking-tight">Rider File Review</h3>
                    <p className="text-xs text-gray-500">ID: {selectedRider.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRider(null)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors text-gray-500 hover:text-gray-800 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Status indicator */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    selectedRider.status === 'pending_verification'
                      ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500 animate-pulse'
                      : selectedRider.status === 'rejected'
                      ? 'bg-red-500/10 border border-red-500/20 text-red-500'
                      : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
                  }`}>
                    {selectedRider.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Details Card */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest text-black dark:text-white">Personal & Vehicle Info</h4>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 p-5 rounded-2xl">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Full Name</span>
                      <p className="text-sm font-extrabold text-gray-900 dark:text-gray-200 mt-0.5">{selectedRider.full_name}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Phone Number</span>
                      <p className="text-sm font-extrabold text-gray-900 dark:text-gray-200 mt-0.5 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-gray-405" /> {selectedRider.phone}
                      </p>
                    </div>
                    {selectedRider.whatsapp && (
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">WhatsApp</span>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-200 mt-0.5">{selectedRider.whatsapp}</p>
                      </div>
                    )}
                    {selectedRider.emergency_contact && (
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Emergency Contact</span>
                        <p className="text-sm font-bold text-red-500 mt-0.5">{selectedRider.emergency_contact}</p>
                      </div>
                    )}
                    <div className="col-span-2 border-t border-gray-100 dark:border-white/5 pt-3 mt-1 grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Bike Plate</span>
                        <p className="text-xs font-black text-gray-900 dark:text-white uppercase mt-0.5">{selectedRider.bike_number}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Driving License</span>
                        <p className="text-xs font-mono font-bold text-gray-900 dark:text-white uppercase mt-0.5">{selectedRider.driving_license}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Aadhar Number</span>
                        <p className="text-xs font-mono font-bold text-gray-900 dark:text-white mt-0.5">{selectedRider.aadhar_number}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documents Display */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest text-black dark:text-white font-black">Verification Documents</h4>
                  
                  {loadingDocs ? (
                    <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-white/[0.01] rounded-2xl border border-gray-100 dark:border-white/5 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-ozo-red" />
                      <p className="text-xs text-gray-500 font-medium">Fetching secure image logs...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Selfie */}
                      <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 p-4 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-gray-800 dark:text-gray-300">Rider Profile Selfie</span>
                          {docUrls.selfie && (
                            <a
                              href={docUrls.selfie}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-500 font-bold flex items-center gap-1 hover:underline"
                            >
                              Open Full Image <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="w-full aspect-[4/3] bg-gray-205 dark:bg-white/5 rounded-xl flex items-center justify-center border border-gray-300/40 dark:border-white/10 relative">
                          {docUrls.selfie ? (
                            <img
                              src={docUrls.selfie}
                              alt="Selfie"
                              className="w-full h-full object-cover rounded-xl transition-all duration-300 hover:scale-[2.8] hover:z-50 hover:shadow-2xl relative cursor-zoom-in"
                            />
                          ) : (
                            <span className="text-xs text-gray-400 italic">No selfie image uploaded</span>
                          )}
                        </div>
                      </div>

                      {/* Driving License */}
                      <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 p-4 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-gray-800 dark:text-gray-300">Driving License Card</span>
                          {docUrls.dl && (
                            <a
                              href={docUrls.dl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-500 font-bold flex items-center gap-1 hover:underline"
                            >
                              Open Full Image <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="w-full aspect-[16/10] bg-gray-205 dark:bg-white/5 rounded-xl flex items-center justify-center border border-gray-300/40 dark:border-white/10 relative">
                          {docUrls.dl ? (
                            <img
                              src={docUrls.dl}
                              alt="Driving License Card"
                              className="w-full h-full object-cover rounded-xl transition-all duration-300 hover:scale-[2.8] hover:z-50 hover:shadow-2xl relative cursor-zoom-in"
                            />
                          ) : (
                            <span className="text-xs text-gray-400 italic">No license image uploaded</span>
                          )}
                        </div>
                      </div>

                      {/* Aadhar Card */}
                      <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 p-4 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-gray-800 dark:text-gray-300">Aadhar Card Image</span>
                          {docUrls.aadhar && (
                            <a
                              href={docUrls.aadhar}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-500 font-bold flex items-center gap-1 hover:underline"
                            >
                              Open Full Image <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <div className="w-full aspect-[16/10] bg-gray-205 dark:bg-white/5 rounded-xl flex items-center justify-center border border-gray-300/40 dark:border-white/10 relative">
                          {docUrls.aadhar ? (
                            <img
                              src={docUrls.aadhar}
                              alt="Aadhar Card"
                              className="w-full h-full object-cover rounded-xl transition-all duration-300 hover:scale-[2.8] hover:z-50 hover:shadow-2xl relative cursor-zoom-in"
                            />
                          ) : (
                            <span className="text-xs text-gray-400 italic">No Aadhar image uploaded</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Footer */}
              {selectedRider.status === 'pending_verification' && (
                <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.01] grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleRejectRider(selectedRider)}
                    disabled={submittingId !== null}
                    className="py-3.5 border border-red-500/20 text-red-500 hover:bg-red-500/10 font-bold rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                  >
                    <X className="w-4 h-4" /> Reject Request
                  </button>
                  <button
                    onClick={() => handleApproveRider(selectedRider)}
                    disabled={submittingId !== null}
                    className="py-3.5 bg-emerald-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <Check className="w-4 h-4" /> Approve & Verify
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MART DRAWER OVERLAY */}
      <AnimatePresence>
        {selectedMart && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMart(null)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-xl bg-white dark:bg-[#0c0c12] border-l border-gray-200 dark:border-white/5 shadow-2xl z-50 flex flex-col font-sans overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50 dark:bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 dark:bg-orange-950/30 p-2.5 rounded-xl text-orange-600">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-gray-900 dark:text-white uppercase tracking-tight">Store Review Desk</h3>
                    <p className="text-xs text-gray-500">ID: {selectedMart.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMart(null)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors text-gray-500 hover:text-gray-800 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Status indicator */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    selectedMart.status === 'pending_verification'
                      ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500 animate-pulse'
                      : selectedMart.status === 'rejected'
                      ? 'bg-red-500/10 border border-red-500/20 text-red-500'
                      : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
                  }`}>
                    {selectedMart.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Details Card */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest text-black dark:text-white">Store Onboarding File</h4>
                  <div className="space-y-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 p-6 rounded-3xl">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Store Name</span>
                        <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">{selectedMart.store_name}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Owner Name</span>
                        <p className="text-sm font-extrabold text-gray-800 dark:text-gray-200 mt-0.5">{selectedMart.owner_name}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Phone Number</span>
                        <p className="text-sm font-extrabold text-gray-850 dark:text-gray-200 mt-0.5">{selectedMart.phone}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Email Address</span>
                        <p className="text-sm font-bold text-gray-850 dark:text-gray-200 mt-0.5">{selectedMart.email}</p>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-white/5 pt-4">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">GSTIN / Municipal License Number</span>
                      <p className="text-sm font-mono font-bold text-gray-900 dark:text-white uppercase mt-0.5">
                        {selectedMart.license_number || 'No license number provided'}
                      </p>
                    </div>

                    <div className="border-t border-gray-100 dark:border-white/5 pt-4 space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" /> Store Physical Address
                      </span>
                      <p className="text-xs text-gray-800 dark:text-gray-300 leading-relaxed font-bold">
                        {selectedMart.address}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold leading-relaxed">
                    By approving this supermarket application, you will automatically construct a live storefront in OZO marts indexing registry, authorizing the operator to deploy inventories and coordinate prepare desks.
                  </p>
                </div>
              </div>

              {/* Action Buttons Footer */}
              {selectedMart.status === 'pending_verification' && (
                <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.01] grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleRejectMart(selectedMart)}
                    disabled={submittingId !== null}
                    className="py-3.5 border border-red-500/20 text-red-500 hover:bg-red-500/10 font-bold rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                  >
                    <X className="w-4 h-4" /> Decline & Close
                  </button>
                  <button
                    onClick={() => handleApproveMart(selectedMart)}
                    disabled={submittingId !== null}
                    className="py-3.5 bg-emerald-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <Check className="w-4 h-4" /> Approve & Register
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* RETURN DRAWER OVERLAY */}
      <AnimatePresence>
        {selectedReturn && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReturn(null)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-xl bg-white dark:bg-[#0c0c12] border-l border-gray-200 dark:border-white/5 shadow-2xl z-50 flex flex-col font-sans overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50 dark:bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 dark:bg-red-950/30 p-2.5 rounded-xl text-red-650">
                    <RefreshCw className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-gray-900 dark:text-white uppercase tracking-tight">Return Review Desk</h3>
                    <p className="text-xs text-gray-500">ID: {selectedReturn.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedReturn(null)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors text-gray-500 hover:text-gray-800 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Status indicator */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    selectedReturn.status === 'pending'
                      ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500 animate-pulse'
                      : selectedReturn.status === 'rejected'
                      ? 'bg-red-500/10 border border-red-500/20 text-red-500'
                      : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
                  }`}>
                    {selectedReturn.status}
                  </span>
                </div>

                {/* Details Card */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest text-black dark:text-white">Return Request File</h4>
                  <div className="space-y-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 p-6 rounded-3xl">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Customer Name</span>
                        <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">{selectedReturn.user?.full_name || 'Customer'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Customer Phone</span>
                        <p className="text-sm font-extrabold text-gray-800 dark:text-gray-250 mt-0.5">{selectedReturn.user?.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Order Reference</span>
                        <p className="text-sm font-extrabold text-gray-850 dark:text-gray-200 mt-0.5">
                          #{selectedReturn.order?.order_number || selectedReturn.order_id.slice(0, 8)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Refund Amount</span>
                        <p className="text-sm font-black text-ozo-red mt-0.5">
                          ₹{selectedReturn.order?.total?.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-white/5 pt-4">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Reason for Return</span>
                      <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">
                        {selectedReturn.reason}
                      </p>
                    </div>

                    {selectedReturn.custom_note && (
                      <div className="border-t border-gray-100 dark:border-white/5 pt-4">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Customer Explanatory Note</span>
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-300 leading-relaxed mt-0.5">
                          {selectedReturn.custom_note}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Proof Image Section */}
                <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-gray-800 dark:text-gray-300">Live Photo Proof</span>
                    {selectedReturn.proof_image && (
                      <a
                        href={selectedReturn.proof_image}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-blue-500 font-bold flex items-center gap-1 hover:underline"
                      >
                        Open Full Image <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="w-full aspect-[4/3] bg-gray-205 dark:bg-white/5 rounded-xl flex items-center justify-center border border-gray-300/40 dark:border-white/10 relative">
                    {selectedReturn.proof_image ? (
                      <img
                        src={selectedReturn.proof_image}
                        alt="Proof Image"
                        className="w-full h-full object-cover rounded-xl transition-all duration-300 hover:scale-[1.8] hover:z-50 hover:shadow-2xl relative cursor-zoom-in"
                      />
                    ) : (
                      <span className="text-xs text-gray-400 italic">No proof image uploaded</span>
                    )}
                  </div>
                </div>

                {/* Rider's Delivery Proof Verification Section */}
                <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-gray-800 dark:text-gray-300">Rider Delivery Proof Photos</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Photo 1: Doorstep Proof</span>
                      <div className="w-full aspect-[4/3] bg-gray-205 dark:bg-white/5 rounded-xl flex items-center justify-center border border-gray-300/40 dark:border-white/10 relative overflow-hidden">
                        {selectedReturn.order?.delivery_proof_image_1 ? (
                          <img
                            src={selectedReturn.order.delivery_proof_image_1}
                            alt="Rider Proof 1"
                            className="w-full h-full object-cover rounded-xl transition-all duration-300 hover:scale-[1.8] hover:z-50 hover:shadow-2xl relative cursor-zoom-in"
                          />
                        ) : (
                          <span className="text-xs text-gray-400 italic">No doorstep proof</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Photo 2: Location Proof</span>
                      <div className="w-full aspect-[4/3] bg-gray-205 dark:bg-white/5 rounded-xl flex items-center justify-center border border-gray-300/40 dark:border-white/10 relative overflow-hidden">
                        {selectedReturn.order?.delivery_proof_image_2 ? (
                          <img
                            src={selectedReturn.order.delivery_proof_image_2}
                            alt="Rider Proof 2"
                            className="w-full h-full object-cover rounded-xl transition-all duration-300 hover:scale-[1.8] hover:z-50 hover:shadow-2xl relative cursor-zoom-in"
                          />
                        ) : (
                          <span className="text-xs text-gray-400 italic">No location proof</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest text-black dark:text-white">Order Items Purchased</h4>
                  <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-white/5">
                    {selectedReturn.order?.order_items?.map((item, index) => (
                      <div key={index} className="p-3 flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-gray-905 dark:text-white">{item.product_name}</div>
                          <div className="text-gray-405 font-semibold mt-0.5">₹{item.unit_price} x {item.quantity}</div>
                        </div>
                        <div className="font-black text-gray-905 dark:text-white">₹{item.total_price}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feedback Comment Section */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 dark:text-gray-350 uppercase tracking-widest">
                    Feedback Comments
                  </label>
                  {selectedReturn.status === 'pending' ? (
                    <textarea
                      rows={3}
                      value={adminComment}
                      onChange={(e) => setAdminComment(e.target.value)}
                      placeholder="Enter details about why this request is approved or rejected (required for rejection)..."
                      className="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] px-4 py-3 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:text-white font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:opacity-50"
                    />
                  ) : (
                    <p className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {selectedReturn.admin_comment || 'No feedback comments provided.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons Footer */}
              {selectedReturn.status === 'pending' && (
                <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.01] grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleRejectReturn(selectedReturn)}
                    disabled={submittingId !== null}
                    className="py-3.5 border border-red-500/20 text-red-500 hover:bg-red-500/10 font-bold rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                  >
                    <X className="w-4 h-4" /> Decline Return
                  </button>
                  <button
                    onClick={() => handleApproveReturn(selectedReturn)}
                    disabled={submittingId !== null}
                    className="py-3.5 bg-emerald-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <Check className="w-4 h-4" /> Approve & Refund
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Requests
