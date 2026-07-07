import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  Image as ImageIcon,
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Gift,
  Tag,
  Percent,
  Calendar,
  AlertTriangle,
  Terminal,
  Play,
  CheckCircle,
  AlertCircle,
  Bell,
  Send
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { supabaseAdmin as supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import ImageUpload from '../../components/ImageUpload'
import ConfirmModal from '../../components/ConfirmModal'

// Helper to format ISO date to datetime-local value (YYYY-MM-DDTHH:MM)
const formatToDatetimeLocal = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return ''
  
  const pad = (num) => String(num).padStart(2, '0')
  const yyyy = date.getFullYear()
  const MM = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  
  return `${yyyy}-${MM}-${dd}T${hh}-${mm}`
}

// Converting local datetime string to ISO string for DB
const formatToIso = (localString) => {
  if (!localString) return null
  const date = new Date(localString)
  return isNaN(date.getTime()) ? null : date.toISOString()
}

const Offers = () => {
  // Lists
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingOffer, setEditingOffer] = useState(null)

  // Filters & Search
  const [activeTab, setActiveTab] = useState('hero-banners') // 'hero-banners', 'coupons-deals'
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all') // 'all', 'banner', 'coupon', 'deal'
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'active', 'inactive'
  const [sortBy, setSortBy] = useState('display_order') // 'display_order', 'title', 'created_at'
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Image Upload State
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [confirmDeleteOffer, setConfirmDeleteOffer] = useState(null)

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    offerType: 'banner',
    discountType: 'percentage',
    discountValue: '',
    minOrderValue: 0,
    maxDiscount: '',
    couponCode: '',
    startDate: '',
    endDate: '',
    isActive: true,
    displayOrder: 0,
    tagline: '',
    categorySlug: ''
  })

  const [categories, setCategories] = useState([])

  // Action Pending states for inline operations
  const [pendingActions, setPendingActions] = useState({})

  // Push notification state variables
  const [notifyingOffer, setNotifyingOffer] = useState(null)
  const [notificationTargetType, setNotificationTargetType] = useState('broadcast')
  const [isSendingPush, setIsSendingPush] = useState(false)
  const [notificationTitle, setNotificationTitle] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')

  // SQL Drawer console states
  const [drawerTab, setDrawerTab] = useState('form') // 'form' | 'sql'
  const [customSql, setCustomSql] = useState('')
  const [sqlResult, setSqlResult] = useState(null)
  const [runningSql, setRunningSql] = useState(false)

  // Generate SQL statement based on form data
  const generateOfferSql = () => {
    const title = (formData.title || '').trim().replace(/'/g, "''")
    const description = formData.description ? `'${formData.description.trim().replace(/'/g, "''")}'` : 'NULL'
    const imageUrl = formData.imageUrl ? `'${formData.imageUrl.trim().replace(/'/g, "''")}'` : 'NULL'
    const offerType = `'${formData.offerType}'`
    
    const hasDiscount = formData.discountValue !== '';
    const discountType = hasDiscount ? `'${formData.discountType}'` : 'NULL'
    const discountValue = hasDiscount ? parseFloat(formData.discountValue) : 'NULL'
    const minOrderValue = parseFloat(formData.minOrderValue) || 0
    const maxDiscount = formData.maxDiscount ? parseFloat(formData.maxDiscount) : 'NULL'
    
    const couponCode = formData.couponCode ? `'${formData.couponCode.trim().toUpperCase().replace(/'/g, "''")}'` : 'NULL'
    const startDate = formData.startDate ? `'${formatToIso(formData.startDate)}'` : 'NULL'
    const endDate = formData.endDate ? `'${formatToIso(formData.endDate)}'` : 'NULL'
    const isActive = formData.isActive ? 'true' : 'false'
    const displayOrder = parseInt(formData.displayOrder) || 0
    const tagline = formData.tagline ? `'${formData.tagline.trim().replace(/'/g, "''")}'` : 'NULL'
    const categorySlug = formData.categorySlug ? `'${formData.categorySlug.trim().replace(/'/g, "''")}'` : 'NULL'

    if (editingOffer) {
      return `UPDATE public.offers
SET 
  title = '${title}',
  description = ${description},
  image_url = ${imageUrl},
  offer_type = ${offerType},
  discount_type = ${discountType},
  discount_value = ${discountValue},
  min_order_value = ${minOrderValue},
  max_discount = ${maxDiscount},
  coupon_code = ${couponCode},
  start_date = ${startDate},
  end_date = ${endDate},
  is_active = ${isActive},
  display_order = ${displayOrder},
  tagline = ${tagline},
  category_slug = ${categorySlug}
WHERE id = '${editingOffer.id}';`
    } else {
      return `INSERT INTO public.offers (
  title, 
  description, 
  image_url, 
  offer_type, 
  discount_type, 
  discount_value, 
  min_order_value, 
  max_discount, 
  coupon_code, 
  start_date, 
  end_date, 
  is_active, 
  display_order,
  tagline,
  category_slug
) VALUES (
  '${title}', 
  ${description}, 
  ${imageUrl}, 
  ${offerType}, 
  ${discountType}, 
  ${discountValue}, 
  ${minOrderValue}, 
  ${maxDiscount}, 
  ${couponCode}, 
  ${startDate}, 
  ${endDate}, 
  ${isActive}, 
  ${displayOrder},
  ${tagline},
  ${categorySlug}
);`
    }
  }

  // Run the SQL generated query inside the drawer
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
        fetchOffers()
      }
    } catch (err) {
      setSqlResult({ success: false, error: err.message })
      toast.error('System error occurred!')
    } finally {
      setRunningSql(false)
    }
  }

  useEffect(() => {
    if (drawerTab === 'sql') {
      setCustomSql(generateOfferSql())
    }
  }, [drawerTab, formData])

  // Fetch all offers
  const fetchOffers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error
      setOffers(data || [])
    } catch (error) {
      console.error('Error fetching offers:', error)
      toast.error('Offers load karne me error aayi!')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('name', { ascending: true })
      if (!error && data) {
        setCategories(data)
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  useEffect(() => {
    fetchOffers()
    fetchCategories()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, typeFilter, statusFilter, sortBy])

  // Reset form state
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      imageUrl: '',
      offerType: activeTab === 'hero-banners' ? 'banner' : 'coupon',
      discountType: 'percentage',
      discountValue: '',
      minOrderValue: 0,
      maxDiscount: '',
      couponCode: '',
      startDate: '',
      endDate: '',
      isActive: true,
      displayOrder: 0,
      tagline: '',
      categorySlug: ''
    })
    setEditingOffer(null)
    setDrawerTab('form')
    setSqlResult(null)
    setCustomSql('')
  }

  // Open drawer and populate values for editing
  const handleEdit = (offer) => {
    setEditingOffer(offer)
    setFormData({
      title: offer.title || '',
      description: offer.description || '',
      imageUrl: offer.image_url || '',
      offerType: offer.offer_type || 'banner',
      discountType: offer.discount_type || 'percentage',
      discountValue: offer.discount_value !== null ? offer.discount_value.toString() : '',
      minOrderValue: offer.min_order_value || 0,
      maxDiscount: offer.max_discount !== null ? offer.max_discount.toString() : '',
      couponCode: offer.coupon_code || '',
      startDate: offer.start_date ? formatToDatetimeLocal(offer.start_date) : '',
      endDate: offer.end_date ? formatToDatetimeLocal(offer.end_date) : '',
      isActive: offer.is_active ?? true,
      displayOrder: offer.display_order || 0,
      tagline: offer.tagline || '',
      categorySlug: offer.category_slug || ''
    })
    setDrawerTab('form')
    setSqlResult(null)
    setIsDrawerOpen(true)
  }

  // Handle standard form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting || isUploadingImage) return

    if (!formData.title.trim()) {
      toast.error('Offer Title zaroori hai!')
      return
    }

    if (formData.offerType === 'coupon' && !formData.couponCode.trim()) {
      toast.error('Coupon code is required for Coupon type!')
      return
    }

    if (formData.discountValue !== '' && isNaN(formData.discountValue)) {
      toast.error('Discount value must be a valid number!')
      return
    }

    setSubmitting(true)
    const toastId = toast.loading(editingOffer ? 'Offer update ho raha hai...' : 'Offer create ho raha hai...')

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        image_url: formData.imageUrl || null,
        offer_type: formData.offerType,
        discount_type: formData.offerType !== 'banner' && formData.discountValue !== '' ? formData.discountType : null,
        discount_value: formData.offerType !== 'banner' && formData.discountValue !== '' ? parseFloat(formData.discountValue) : null,
        min_order_value: formData.offerType !== 'banner' ? (parseFloat(formData.minOrderValue) || 0) : 0,
        max_discount: formData.offerType !== 'banner' && formData.maxDiscount !== '' ? parseFloat(formData.maxDiscount) : null,
        coupon_code: formData.offerType !== 'banner' ? (formData.couponCode.trim().toUpperCase() || null) : null,
        start_date: formData.startDate ? formatToIso(formData.startDate) : null,
        end_date: formData.endDate ? formatToIso(formData.endDate) : null,
        is_active: formData.isActive,
        display_order: parseInt(formData.displayOrder) || 0,
        tagline: formData.offerType === 'banner' ? (formData.tagline.trim() || null) : null,
        category_slug: formData.offerType === 'banner' ? (formData.categorySlug.trim() || null) : null
      }

      if (editingOffer) {
        const { error } = await supabase
          .from('offers')
          .update(payload)
          .eq('id', editingOffer.id)

        if (error) throw error
        toast.success('Offer updated successfully!', { id: toastId })
      } else {
        const { error } = await supabase
          .from('offers')
          .insert([payload])

        if (error) throw error
        toast.success('Offer created successfully!', { id: toastId })
      }

      setIsDrawerOpen(false)
      resetForm()
      fetchOffers()
    } catch (error) {
      console.error('Submit offer error:', error)
      toast.error(error.message || 'Saving fail ho gaya. Check code formatting/uniqueness.', { id: toastId })
    } finally {
      setSubmitting(false)
    }
  }

  // Toggle active status inline
  const handleToggleActive = async (offer) => {
    const key = `toggle-${offer.id}`
    if (pendingActions[key]) return

    setPendingActions(prev => ({ ...prev, [key]: true }))
    try {
      const { error } = await supabase
        .from('offers')
        .update({ is_active: !offer.is_active })
        .eq('id', offer.id)

      if (error) throw error

      setOffers(prev =>
        prev.map(off => (off.id === offer.id ? { ...off, is_active: !off.is_active } : off))
      )
      toast.success(`"${offer.title}" status updated!`)
    } catch (error) {
      console.error('Toggle active status error:', error)
      toast.error('Status change karne me error aayi.')
    } finally {
      setPendingActions(prev => {
        const copy = { ...prev }
        delete copy[key]
        return copy
      })
    }
  }

  // Increment / decrement display order inline
  const handleUpdateDisplayOrder = async (offer, newOrder) => {
    if (newOrder < 0) return
    const key = `order-${offer.id}`
    if (pendingActions[key]) return

    setPendingActions(prev => ({ ...prev, [key]: true }))
    try {
      const { error } = await supabase
        .from('offers')
        .update({ display_order: newOrder })
        .eq('id', offer.id)

      if (error) throw error

      setOffers(prev =>
        prev.map(off => (off.id === offer.id ? { ...off, display_order: newOrder } : off))
      )
      toast.success(`"${offer.title}" display order updated to ${newOrder}`)
    } catch (error) {
      console.error('Update display order error:', error)
      toast.error('Order change karne me error aayi.')
    } finally {
      setPendingActions(prev => {
        const copy = { ...prev }
        delete copy[key]
        return copy
      })
    }
  }

  // Delete Offer (opens custom confirmation modal)
  const handleDelete = (offer) => {
    setConfirmDeleteOffer(offer)
  }

  // Actual logic to delete offer after confirmation
  const executeDeleteOffer = async (offer) => {
    const key = `delete-${offer.id}`
    if (pendingActions[key]) return

    setPendingActions(prev => ({ ...prev, [key]: true }))
    const toastId = toast.loading('Offer delete kiya ja raha hai...')

    try {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', offer.id)

      if (error) throw error

      toast.success('Offer deleted successfully!', { id: toastId })
      fetchOffers()
    } catch (error) {
      console.error('Delete offer error:', error)
      toast.error(error.message || 'Offer delete nahi ho paya.', { id: toastId })
    } finally {
      setConfirmDeleteOffer(null)
      setPendingActions(prev => {
        const copy = { ...prev }
        delete copy[key]
        return copy
      })
    }
  }

  // Send Push Notification for an Offer
  const handleSendPushNotification = async (e) => {
    if (e) e.preventDefault()
    if (!notifyingOffer) return
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast.error('Notification Title and Message fields are required!')
      return
    }

    setIsSendingPush(true)
    const toastId = toast.loading('Sending push notification...')

    try {
      const payload = {
        title: notificationTitle.trim(),
        message: notificationMessage.trim(),
        type: 'promo',
        data: {
          offer_id: notifyingOffer.id,
          offer_type: notifyingOffer.offer_type,
          category_slug: notifyingOffer.category_slug || null,
          coupon_code: notifyingOffer.coupon_code || null,
          url: notifyingOffer.offer_type === 'banner' && notifyingOffer.category_slug
            ? `https://ozomart.store/category/${notifyingOffer.category_slug}`
            : 'https://ozomart.store/offers'
        }
      }

      if (notificationTargetType === 'category' && notifyingOffer.category_slug) {
        payload.tag_key = `notify_cat_${notifyingOffer.category_slug}`
        payload.tag_value = 'true'
      } else {
        payload.broadcast = true
      }

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: payload
      })

      if (error) {
        let errMsg = error.message
        if (error.context && typeof error.context.text === 'function') {
          try {
            const bodyText = await error.context.text()
            const parsed = JSON.parse(bodyText)
            if (parsed.error) errMsg = parsed.error
          } catch (_) {}
        }
        throw new Error(errMsg)
      }

      toast.success('Notification broadcasted successfully!', { id: toastId })
      setNotifyingOffer(null)
    } catch (err) {
      console.error('[PUSH] Failed to send notification:', err)
      toast.error(err.message || 'Notification broadcast fail ho gaya!', { id: toastId })
    } finally {
      setIsSendingPush(false)
    }
  }

  // Filtering & Sorting Logic
  const filteredOffers = offers.filter(offer => {
    const matchesSearch = 
      offer.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.coupon_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTab = 
      activeTab === 'hero-banners'
        ? offer.offer_type === 'banner'
        : (offer.offer_type === 'coupon' || offer.offer_type === 'deal')

    const matchesType =
      activeTab === 'hero-banners'
        ? true
        : (typeFilter === 'all' || offer.offer_type === typeFilter)

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && offer.is_active) ||
      (statusFilter === 'inactive' && !offer.is_active)

    return matchesSearch && matchesTab && matchesType && matchesStatus
  }).sort((a, b) => {
    if (sortBy === 'display_order') {
      return a.display_order - b.display_order
    } else if (sortBy === 'title') {
      return a.title.localeCompare(b.title)
    } else if (sortBy === 'created_at') {
      return new Date(b.created_at) - new Date(a.created_at)
    }
    return 0
  })

  // Quick stats calculations
  const totalOffers = offers.length
  const activeOffers = offers.filter(o => o.is_active).length
  const bannersCount = offers.filter(o => o.offer_type === 'banner').length
  const couponsCount = offers.filter(o => o.offer_type === 'coupon').length

  return (
    <div className="space-y-6 p-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium">
        <div>
          <h1 className="text-3xl font-black text-gradient">Offers & Carousel Banners</h1>
          <p className="text-sm text-ozo-gray mt-1">Banners, taglines, category links, discount coupons, aur deals manage krein.</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setIsDrawerOpen(true)
          }}
          className="flex items-center justify-center gap-2 bg-gradient-ozo text-white px-5 py-3 rounded-2xl font-bold shadow-ozo hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          {activeTab === 'hero-banners' ? 'Add New Banner' : 'Add New Coupon / Deal'}
        </button>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl w-full max-w-lg border border-gray-200/50 dark:border-white/5">
        <button
          onClick={() => {
            setActiveTab('hero-banners')
            resetForm()
          }}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-extrabold transition-all cursor-pointer ${
            activeTab === 'hero-banners'
              ? 'bg-white dark:bg-[#1a1a1a] text-ozo-red shadow-premium'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Hero Banners ({bannersCount})
        </button>
        <button
          onClick={() => {
            setActiveTab('coupons-deals')
            resetForm()
          }}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-extrabold transition-all cursor-pointer ${
            activeTab === 'coupons-deals'
              ? 'bg-white dark:bg-[#1a1a1a] text-ozo-red shadow-premium'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <Tag className="w-4 h-4" />
          Coupons & Deals ({couponsCount})
        </button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Total Offers</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600">
              <Gift className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-gray-900 dark:text-white">{totalOffers}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Active</span>
            <div className="p-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-green-600">{activeOffers}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Banners</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600">
              <ImageIcon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-blue-600">{bannersCount}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Coupons</span>
            <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600">
              <Tag className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-orange-600">{couponsCount}</p>
        </div>
      </div>

      {/* Filters and List Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between p-4 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
        <div className="relative w-full lg:w-80">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            <Search className="w-4.5 h-4.5" />
          </span>
          <input
            type="text"
            placeholder="Search offers or coupon code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm text-gray-750 dark:text-gray-300 focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_12px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] dark:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
          >
            <option value="all" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">All Status</option>
            <option value="active" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Active Only</option>
            <option value="inactive" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Inactive Only</option>
          </select>

          {/* Type Filter */}
          {activeTab === 'coupons-deals' && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm text-gray-750 dark:text-gray-300 focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_12px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] dark:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
            >
              <option value="all" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">All Coupons/Deals</option>
              <option value="coupon" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Coupon Only</option>
              <option value="deal" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Deals Only</option>
            </select>
          )}

          {/* Sort Filter */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm text-gray-750 dark:text-gray-300 focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_12px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] dark:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
          >
            <option value="display_order" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Sort: Display Order</option>
            <option value="title" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Sort: Title (A-Z)</option>
            <option value="created_at" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Sort: Recently Added</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchOffers}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-250 dark:border-white/10 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-all active:scale-95"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main List Table */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-ozo-red" />
            <p className="text-sm font-semibold text-gray-500">Offers load ho rahi hain...</p>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center text-2xl mb-4">
              🎁
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Koi offers nahi mile</h3>
            <p className="text-sm text-gray-500 max-w-sm mt-1">Filters change karein ya fir naya offer add krein.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {activeTab === 'hero-banners' ? 'Banner Title & Subtitle' : 'Offer Title & Info'}
                  </th>
                  {activeTab === 'hero-banners' ? (
                    <>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Tagline</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Category Redirect Link</th>
                    </>
                  ) : (
                    <>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Promo Code</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Value details</th>
                    </>
                  )}
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Display Order</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredOffers.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((offer) => {
                  const isDeleting = pendingActions[`delete-${offer.id}`]
                  const isToggling = pendingActions[`toggle-${offer.id}`]
                  const isOrdering = pendingActions[`order-${offer.id}`]

                  // Check if offer date has expired
                  const now = new Date()
                  const isExpired = offer.end_date && new Date(offer.end_date) < now

                  return (
                    <tr key={offer.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                      {/* Name & Banner Image */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-12 rounded-xl bg-gray-100 dark:bg-white/5 overflow-hidden flex items-center justify-center border border-gray-200/50 dark:border-white/10 text-xl shrink-0 transition-all duration-300 hover:scale-[5] hover:z-50 hover:shadow-2xl relative cursor-zoom-in">
                            {offer.image_url ? (
                              <img
                                src={offer.image_url}
                                alt={offer.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null
                                  e.target.style.display = 'none'
                                }}
                              />
                            ) : (
                              <Gift className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 dark:text-white leading-tight">{offer.title}</h4>
                            {offer.description && (
                              <p className="text-xs text-gray-450 mt-0.5 line-clamp-1 max-w-[280px]">
                                {offer.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Active Tab Specific Columns */}
                      {activeTab === 'hero-banners' ? (
                        <>
                          {/* Tagline */}
                          <td className="p-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {offer.tagline ? (
                              <span className="inline-block px-2.5 py-1 rounded-lg bg-ozo-red/10 text-ozo-red text-xs font-black uppercase tracking-wider">
                                {offer.tagline}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600">—</span>
                            )}
                          </td>

                          {/* Category Link */}
                          <td className="p-4 text-sm text-gray-700 dark:text-gray-300">
                            {offer.category_slug ? (
                              <span className="px-2.5 py-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-700 dark:text-gray-300 font-semibold text-xs">
                                /category/{offer.category_slug}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500">None (General Link)</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Offer Type Badge */}
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              offer.offer_type === 'banner'
                                ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/20'
                                : offer.offer_type === 'coupon'
                                ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/20'
                                : 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/20'
                            }`}>
                              {offer.offer_type?.toUpperCase()}
                            </span>
                          </td>

                          {/* Coupon Code */}
                          <td className="p-4">
                            {offer.coupon_code ? (
                              <span className="font-mono text-sm px-2.5 py-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-700 dark:text-gray-300 font-bold">
                                {offer.coupon_code}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600">—</span>
                            )}
                          </td>

                          {/* Value details */}
                          <td className="p-4 text-sm text-gray-700 dark:text-gray-300">
                            {offer.discount_value ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-black text-gray-900 dark:text-white flex items-center gap-0.5">
                                  {offer.discount_type === 'flat' ? '₹' : ''}
                                  {offer.discount_value}
                                  {offer.discount_type === 'percentage' ? '%' : ''} OFF
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  Min Order: ₹{offer.min_order_value || 0}
                                  {offer.max_discount ? ` • Max: ₹${offer.max_discount}` : ''}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">Info Banner</span>
                            )}
                          </td>
                        </>
                      )}

                      {/* Display Order */}
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-2 bg-gray-50 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/5 px-2 py-1 rounded-xl">
                          <button
                            onClick={() => handleUpdateDisplayOrder(offer, offer.display_order - 1)}
                            disabled={offer.display_order <= 0 || isOrdering}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-white/5 text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-30 rounded-lg transition-colors"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-black text-gray-900 dark:text-white min-w-[20px]">
                            {offer.display_order}
                          </span>
                          <button
                            onClick={() => handleUpdateDisplayOrder(offer, offer.display_order + 1)}
                            disabled={isOrdering}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-white/5 text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-30 rounded-lg transition-colors"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                      {/* Status switch */}
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => handleToggleActive(offer)}
                            disabled={isToggling}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-ozo-red ${
                              offer.is_active && !isExpired ? 'bg-green-500' : 'bg-gray-300 dark:bg-zinc-800'
                            } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                offer.is_active && !isExpired ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          {isExpired && (
                            <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider">Expired</span>
                          )}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setNotifyingOffer(offer)
                              setNotificationTargetType(offer.category_slug ? 'category' : 'broadcast')
                              setNotificationTitle(offer.title || 'Special Promotion! 🎉')
                              const defaultMsg = offer.coupon_code 
                                ? `Use code ${offer.coupon_code} to get discounts! ${offer.description || ''}` 
                                : (offer.description || offer.tagline || 'Check out our new offer on OZO!')
                              setNotificationMessage(defaultMsg.trim())
                            }}
                            className="p-2 hover:bg-amber-50 dark:hover:bg-amber-500/10 text-gray-400 hover:text-amber-500 rounded-xl transition-all active:scale-95"
                            title="Notify Users"
                          >
                            <Bell className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => handleEdit(offer)}
                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-400 hover:text-blue-500 rounded-xl transition-all active:scale-95"
                            title="Edit Offer"
                          >
                            <Pencil className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(offer)}
                            disabled={isDeleting}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                            title="Delete Offer"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-4.5 h-4.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-4.5 h-4.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && filteredOffers.length > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing <span className="font-bold text-gray-800 dark:text-gray-200">{Math.min(filteredOffers.length, (currentPage - 1) * pageSize + 1)}</span> to{' '}
              <span className="font-bold text-gray-800 dark:text-gray-200">{Math.min(filteredOffers.length, currentPage * pageSize)}</span> of{' '}
              <span className="font-bold text-gray-800 dark:text-gray-200">{filteredOffers.length}</span> offers
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Page {currentPage} of {Math.ceil(filteredOffers.length / pageSize)}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredOffers.length / pageSize), prev + 1))}
                disabled={currentPage === Math.ceil(filteredOffers.length / pageSize)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slideout Drawer Modal Panel */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && !isUploadingImage && setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-[#1a1a1a] shadow-2xl z-50 flex flex-col border-l border-gray-100 dark:border-white/5"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">
                    {activeTab === 'hero-banners'
                      ? (editingOffer ? 'Edit Hero Banner' : 'Add New Banner')
                      : (editingOffer ? 'Edit Coupon / Deal' : 'Add New Coupon / Deal')}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {activeTab === 'hero-banners'
                      ? (editingOffer 
                          ? `Edit banner details for "${editingOffer.title}"`
                          : 'Home screen banner slider aur category link control krein.')
                      : (editingOffer 
                          ? `Edit discount settings for "${editingOffer.title}"`
                          : 'Store discounts aur checkout coupons register krein.')}
                  </p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  disabled={submitting || isUploadingImage}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/[0.01]">
                <button
                  type="button"
                  onClick={() => setDrawerTab('form')}
                  className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                    drawerTab === 'form'
                      ? 'border-ozo-red text-ozo-red'
                      : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  Standard Form
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab('sql')}
                  className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                    drawerTab === 'sql'
                      ? 'border-ozo-red text-ozo-red'
                      : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  SQL Query
                </button>
              </div>

              {drawerTab === 'form' ? (
                <>
                  {/* Drawer Body - Scrollable Form */}
                  <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Offer Title */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Offer Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Special Bihar Holi Festival Promo"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
                      />
                    </div>

                    {/* Offer Type Selection (Only if on coupons & deals tab) */}
                    {activeTab === 'coupons-deals' ? (
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                          Offer Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.offerType}
                          onChange={(e) => setFormData(prev => ({ ...prev, offerType: e.target.value }))}
                          className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm text-gray-750 dark:text-gray-300 focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_14px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] dark:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
                        >
                          <option value="coupon" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Coupon (Discount Code)</option>
                          <option value="deal" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Deal (Promotional Offer)</option>
                        </select>
                      </div>
                    ) : (
                      // Implicitly set for Hero Banners tab, display a read-only visual indicator
                      <div className="p-3.5 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-150 dark:border-blue-900/20 rounded-2xl flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Implicit Category:</span>
                        <span className="text-xs font-extrabold uppercase px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-700 dark:text-blue-400">
                          Hero Banner (Home Carousel)
                        </span>
                      </div>
                    )}

                    {/* Tagline & Category link (Banners only) */}
                    {formData.offerType === 'banner' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Tagline
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Mithila Special"
                            value={formData.tagline}
                            onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Category Link
                          </label>
                          <div className="relative">
                            <select
                              value={formData.categorySlug}
                              onChange={(e) => setFormData(prev => ({ ...prev, categorySlug: e.target.value }))}
                              className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm text-gray-750 dark:text-gray-300 focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_14px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] dark:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
                            >
                              <option value="" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">None (General Link)</option>
                              {categories.map(cat => (
                                <option key={cat.id} value={cat.slug} className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Conditional Coupon Code */}
                    {formData.offerType !== 'banner' && (
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                          Coupon Code {formData.offerType === 'coupon' && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. HOLI50, OZOSTAR"
                          value={formData.couponCode}
                          onChange={(e) => setFormData(prev => ({ ...prev, couponCode: e.target.value.toUpperCase() }))}
                          className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Customers can search or apply this code during checkout.</p>
                      </div>
                    )}

                    {/* Value Configuration (Discount value and type) */}
                    {formData.offerType !== 'banner' && (
                      <div className="p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-150 dark:border-white/5 rounded-2xl space-y-4">
                        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">Promotion Value Settings</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">
                              Discount Type
                            </label>
                            <select
                              value={formData.discountType}
                              onChange={(e) => setFormData(prev => ({ ...prev, discountType: e.target.value }))}
                              className="w-full pl-3 pr-8 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-xs text-gray-750 dark:text-gray-300 focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_10px_center] bg-[size:12px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] dark:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
                            >
                              <option value="percentage" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Percentage (%)</option>
                              <option value="flat" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Flat Amount (₹)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">
                              Discount Value
                            </label>
                            <input
                              type="number"
                              min="0"
                              placeholder="e.g. 10 or 150"
                              value={formData.discountValue}
                              onChange={(e) => setFormData(prev => ({ ...prev, discountValue: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-transparent text-xs focus:outline-none dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">
                              Min Order Value (₹)
                            </label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={formData.minOrderValue}
                              onChange={(e) => setFormData(prev => ({ ...prev, minOrderValue: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-transparent text-xs focus:outline-none dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">
                              Max Discount (₹)
                            </label>
                            <input
                              type="number"
                              min="0"
                              placeholder="Optional limit"
                              value={formData.maxDiscount}
                              onChange={(e) => setFormData(prev => ({ ...prev, maxDiscount: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-transparent text-xs focus:outline-none dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Schedule Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                          Start Date
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.startDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-xs focus:outline-none dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                          End Date
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.endDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-xs focus:outline-none dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Image Upload Banner */}
                    <ImageUpload
                      value={formData.imageUrl}
                      onChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                      label="Promo Banner Image"
                      customNamePrefix="offers"
                      onUploadingStateChange={setIsUploadingImage}
                    />

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        {formData.offerType === 'banner' ? 'Banner Subtitle / Description' : 'Offer Description'}
                      </label>
                      <textarea
                        rows="3"
                        placeholder={formData.offerType === 'banner' ? 'e.g. Fresh Mangoes direct from Mithila' : 'Detail information about the offer...'}
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
                      />
                    </div>

                    {/* Display Order & Active status toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-150 dark:border-white/5 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                          Display Order:
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.displayOrder}
                          onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                          className="w-20 px-3 py-1.5 rounded-lg border border-gray-250 dark:border-white/10 bg-transparent text-center font-bold text-xs focus:outline-none dark:text-white"
                        />
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                          Is Active:
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            formData.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-zinc-800'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              formData.isActive ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Action buttons footer */}
                    <div className="pt-4 flex gap-3 border-t border-gray-100 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => setIsDrawerOpen(false)}
                        disabled={submitting}
                        className="flex-1 py-3 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || isUploadingImage}
                        className="flex-1 py-3 bg-gradient-ozo text-white rounded-xl text-sm font-bold hover:shadow-ozo hover:scale-[1.01] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Offer'
                        )}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                /* SQL Terminal tab content */
                <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      Runs directly via Supabase exec_sql RPC
                    </span>
                    <button
                      onClick={() => setCustomSql(generateOfferSql())}
                      className="text-xs text-ozo-red hover:underline font-bold"
                    >
                      Reset SQL
                    </button>
                  </div>

                  <div className="flex-1 relative rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-inner bg-gray-950 dark:bg-black p-4">
                    <textarea
                      value={customSql}
                      onChange={(e) => setCustomSql(e.target.value)}
                      className="w-full h-full bg-transparent text-emerald-400 font-mono text-xs leading-relaxed focus:outline-none resize-none"
                      spellCheck="false"
                    />
                  </div>

                  {sqlResult && (
                    <div className={`p-4 rounded-xl border text-xs overflow-y-auto max-h-40 ${
                      sqlResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-red-50 dark:bg-red-950/20 border-red-250/20 text-red-600 dark:text-red-400'
                    }`}>
                      <p className="font-bold mb-1">{sqlResult.success ? 'Success!' : 'Postgres Error'}</p>
                      <p className="font-mono">{sqlResult.message || sqlResult.error}</p>
                      {sqlResult.rowsAffected !== undefined && (
                        <p className="mt-1 font-bold">Rows affected: {sqlResult.rowsAffected}</p>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleRunDrawerSql}
                    disabled={runningSql || !customSql.trim()}
                    className="w-full py-3 bg-gradient-ozo text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:shadow-ozo transition-all disabled:opacity-50"
                  >
                    {runningSql ? (
                      <>
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        Running SQL Query...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        Execute SQL Statements
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Push Notification dialog */}
      <AnimatePresence>
        {notifyingOffer && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSendingPush && setNotifyingOffer(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 cursor-pointer"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 bottom-4 top-auto md:inset-0 m-auto md:max-w-xl md:h-fit bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-150 dark:border-white/5 shadow-2xl p-6 z-[60] overflow-y-auto max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-2xl shadow-sm">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Notify Subscribers</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Push notification broadcast and target settings</p>
                  </div>
                </div>
                <button
                  onClick={() => !isSendingPush && setNotifyingOffer(null)}
                  disabled={isSendingPush}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-450 hover:text-gray-900 dark:hover:text-white rounded-xl transition-colors disabled:opacity-30 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Offer Context Panel */}
              <div className="p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-150 dark:border-white/5 rounded-2xl mb-5 text-sm">
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Offer Context</span>
                <h4 className="font-extrabold text-gray-800 dark:text-gray-250 mt-1 flex items-center gap-2">
                  <Gift className="w-4.5 h-4.5 text-ozo-red shrink-0" />
                  {notifyingOffer.title}
                </h4>
                {notifyingOffer.coupon_code && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Promo Code:</span>
                    <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-lg text-xs font-black uppercase tracking-wider">
                      {notifyingOffer.coupon_code}
                    </span>
                  </div>
                )}
              </div>

              {/* Push Config Form */}
              <form onSubmit={handleSendPushNotification} className="space-y-4">
                {/* Target Audience selection */}
                {notifyingOffer.category_slug && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Target Audience
                    </label>
                    <div className="grid grid-cols-2 gap-3 bg-gray-100 dark:bg-white/5 p-1 rounded-2xl border border-gray-250/20 dark:border-white/5">
                      <button
                        type="button"
                        onClick={() => setNotificationTargetType('broadcast')}
                        className={`py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          notificationTargetType === 'broadcast'
                            ? 'bg-white dark:bg-[#1a1a1a] text-ozo-red shadow-premium'
                            : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
                        }`}
                      >
                        All Subscribed Users
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotificationTargetType('category')}
                        className={`py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          notificationTargetType === 'category'
                            ? 'bg-white dark:bg-[#1a1a1a] text-ozo-red shadow-premium'
                            : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
                        }`}
                      >
                        Category: {notifyingOffer.category_slug}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 italic px-1">
                      {notificationTargetType === 'broadcast'
                        ? 'Sends a general push broadcast to all active OneSignal subscribers.'
                        : `Targeting subscribers with tag: notify_cat_${notifyingOffer.category_slug}`}
                    </p>
                  </div>
                )}

                {/* Title input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Push Title
                  </label>
                  <input
                    type="text"
                    required
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="Enter notification title..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white font-bold"
                  />
                </div>

                {/* Message input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Push Message
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    placeholder="Enter notification message details..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white resize-none"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-white/5 mt-5">
                  <button
                    type="button"
                    onClick={() => setNotifyingOffer(null)}
                    disabled={isSendingPush}
                    className="flex-1 py-3 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingPush}
                    className="flex-1 py-3 bg-gradient-ozo text-white rounded-xl text-sm font-bold hover:shadow-ozo hover:scale-[1.01] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSendingPush ? (
                      <>
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Now
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Offer Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDeleteOffer !== null}
        onClose={() => setConfirmDeleteOffer(null)}
        onConfirm={() => executeDeleteOffer(confirmDeleteOffer)}
        title="Delete Offer"
        message={`Are you sure you want to delete the offer "${confirmDeleteOffer?.title || ''}"? This action cannot be undone and will remove it from all user-facing banners and screens.`}
        confirmText="Delete Offer"
        cancelText="Cancel"
        isDanger={true}
        isLoading={confirmDeleteOffer && pendingActions[`delete-${confirmDeleteOffer.id}`]}
      />
    </div>
  )
}

export default Offers