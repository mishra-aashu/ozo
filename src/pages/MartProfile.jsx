import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Phone,
  Clock,
  Edit,
  Save,
  Upload,
  X,
  Search,
  Share2,
  ExternalLink,
  QrCode,
  Store,
  Check,
  ChevronRight,
  Sparkles,
  Filter,
  Loader2,
  ShoppingBag,
  Info,
  Calendar,
  AlertCircle,
  ThumbsUp,
  Star,
  ShieldCheck,
  TrendingUp,
  Zap,
  Shield,
  Award,
  CheckCircle
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useCartStore } from '../stores/cartStore'
import { useLocationStore } from '../stores/locationStore'
import ProductCard from '../components/ProductCard'
import SEO from '../components/SEO'
import toast from 'react-hot-toast'

const getBadgeConfig = (badgeText) => {
  const text = badgeText.toLowerCase();
  
  if (text.includes('delivery') || text.includes('min') || text.includes('fast') || text.includes('speedy') || text.includes('quick')) {
    return { icon: Zap, color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
  }
  if (text.includes('hygienic') || text.includes('clean') || text.includes('safe') || text.includes('sanit')) {
    return { icon: ShieldCheck, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
  }
  if (text.includes('rate') || text.includes('top') || text.includes('star') || text.includes('best') || text.includes('popular')) {
    return { icon: Star, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
  }
  if (text.includes('contactless') || text.includes('shield') || text.includes('secure') || text.includes('verified')) {
    return { icon: Shield, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' };
  }
  if (text.includes('veg') || text.includes('organic') || text.includes('fresh') || text.includes('green') || text.includes('nature') || text.includes('healthy')) {
    return { icon: CheckCircle, color: 'text-teal-500 bg-teal-500/10 border-teal-500/20' };
  }
  
  return { icon: Award, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
}

const getGuaranteeIcon = (iconName) => {
  switch (iconName) {
    case 'clock':
      return Clock
    case 'shield-check':
    case 'shield':
      return ShieldCheck
    case 'thumbs-up':
      return ThumbsUp
    case 'trending-up':
      return TrendingUp
    case 'zap':
      return Zap
    case 'star':
      return Star
    case 'check':
      return Check
    case 'info':
      return Info
    default:
      return Shield
  }
}

const parseTimeString = (timeStr) => {
  if (!timeStr) return { hour: '09', minute: '00' }
  const parts = timeStr.split(':')
  return {
    hour: parts[0] || '09',
    minute: parts[1] || '00'
  }
}

const MartProfile = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  
  const { user, isAdmin } = useAuthStore()
  const selectedCitySlug = useLocationStore(state => state.selectedCitySlug)

  // State
  const [mart, setMart] = useState(null)
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('products') // 'products' | 'about'
  const [storeCategories, setStoreCategories] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const ITEMS_PER_PAGE = 24

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    opens_at: '',
    closes_at: '',
    is_24_7: false,
    is_active: true,
    logo_url: '',
    banner_url: '',
    badges: [],
    guarantees: []
  })
  const [newBadgeText, setNewBadgeText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  const isOwner = useMemo(() => {
    if (!user || !mart) return false
    return isAdmin || mart.owner_id === user.id
  }, [user, mart, isAdmin])

  // Fetch paginated products from database
  const fetchProducts = async (pageToFetch, catId, searchStr, append = false, currentMart = mart) => {
    const activeMart = currentMart || mart
    if (!activeMart) return
    
    setIsFetchingMore(true)
    try {
      const from = pageToFetch * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

      let query = supabase
        .from('mart_inventory')
        .select(`
          id,
          mart_id,
          product_id,
          stock_quantity,
          mart_price,
          mart_mrp,
          is_available,
          custom_image_url,
          products!inner(
            id,
            name,
            slug,
            brand,
            unit,
            image_url,
            mrp,
            price,
            is_available,
            quantity_available,
            max_order_qty,
            category_id
          )
        `)
        .eq('mart_id', activeMart.id)
        .eq('is_available', true)
        .gt('stock_quantity', 0)
        .range(from, to)

      // Apply category filter
      if (catId && catId !== 'all') {
        query = query.eq('products.category_id', catId)
      }

      // Apply search filter
      if (searchStr && searchStr.trim() !== '') {
        query = query.or(`name.ilike.%${searchStr}%,brand.ilike.%${searchStr}%`, { foreignTable: 'products' })
      }

      // Order products by name
      query = query.order('name', { foreignTable: 'products' })

      const { data, error } = await query
      if (error) throw error

      if (append) {
        setInventory(prev => [...prev, ...(data || [])])
      } else {
        setInventory(data || [])
      }

      setHasMore(data && data.length === ITEMS_PER_PAGE)
    } catch (err) {
      console.error('Error fetching products:', err)
      toast.error('Failed to load products')
    } finally {
      setIsFetchingMore(false)
    }
  }

  // Fetch mart details and categories
  const fetchData = async () => {
    try {
      setLoading(true)
      
      // 1. Fetch mart details
      const { data: martData, error: martError } = await supabase
        .from('marts')
        .select(`
          *,
          users!marts_owner_id_fkey (phone)
        `)
        .eq('slug', slug)
        .single()

      if (martError || !martData) {
        toast.error('Store not found')
        navigate('/')
        return
      }

      const isStoreOwner = isAdmin || martData.owner_id === user?.id
      if (!martData.is_active && !isStoreOwner) {
        toast.error('Store is currently offline')
        navigate('/')
        return
      }

      setMart(martData)
      setEditForm({
        name: martData.name || '',
        description: martData.description || '',
        address: martData.address || '',
        phone: martData.phone || martData.users?.phone || '',
        opens_at: martData.opens_at || '',
        closes_at: martData.closes_at || '',
        is_24_7: martData.is_24_7 || false,
        is_active: martData.is_active || false,
        logo_url: martData.logo_url || '',
        banner_url: martData.banner_url || '',
        badges: martData.badges || [],
        guarantees: martData.guarantees || []
      })

      // Store active mart ID to ensure correct checkout routing
      localStorage.setItem('active_mart_id', martData.id)

      // Fetch distinct categories in a separate light query
      const { data: catData, error: catError } = await supabase
        .from('mart_inventory')
        .select(`
          products!inner(
            category_id,
            categories(id, name, slug)
          )
        `)
        .eq('mart_id', martData.id)
        .eq('is_available', true)
        .gt('stock_quantity', 0)

      if (catError) throw catError
      
      const catsMap = new Map()
      catData?.forEach(item => {
        const cat = item.products?.categories
        if (cat && cat.id) {
          catsMap.set(cat.id, cat)
        }
      })
      setStoreCategories(Array.from(catsMap.values()))

      // Now fetch initial products
      setPage(0)
      setHasMore(true)
      await fetchProducts(0, 'all', '', false, martData)

    } catch (err) {
      console.error('Error fetching mart details:', err)
      toast.error('Failed to load store inventory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Reset filters on store change
    setSelectedCategory('all')
    setSearchQuery('')
    fetchData()
  }, [slug])

  // Fetch products on category/search change
  useEffect(() => {
    if (mart && !loading) {
      setPage(0)
      setHasMore(true)
      fetchProducts(0, selectedCategory, searchQuery, false)
    }
  }, [selectedCategory, searchQuery])

  const handleLoadMore = () => {
    if (isFetchingMore || !hasMore) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchProducts(nextPage, selectedCategory, searchQuery, true)
  }

  const filteredProducts = inventory

  // Copy store link to clipboard
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    toast.success('Store link copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  // Download QR code flyer
  const handleDownloadQr = () => {
    toast.loading('Generating store flyer...', { id: 'generating-flyer' })
    const canvas = document.createElement('canvas')
    canvas.width = 800
    canvas.height = 1100
    const ctx = canvas.getContext('2d')

    // 1. Draw background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, '#0d0d11')
    gradient.addColorStop(1, '#070709')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 2. Draw ambient glows
    const redGlow = ctx.createRadialGradient(0, 0, 10, 0, 0, 400)
    redGlow.addColorStop(0, 'rgba(235, 20, 20, 0.15)')
    redGlow.addColorStop(1, 'rgba(235, 20, 20, 0)')
    ctx.fillStyle = redGlow
    ctx.beginPath()
    ctx.arc(0, 0, 400, 0, Math.PI * 2)
    ctx.fill()

    const indigoGlow = ctx.createRadialGradient(canvas.width, canvas.height, 10, canvas.width, canvas.height, 400)
    indigoGlow.addColorStop(0, 'rgba(79, 70, 229, 0.15)')
    indigoGlow.addColorStop(1, 'rgba(79, 70, 229, 0)')
    ctx.fillStyle = indigoGlow
    ctx.beginPath()
    ctx.arc(canvas.width, canvas.height, 400, 0, Math.PI * 2)
    ctx.fill()

    // 3. Draw OZO logo header
    ctx.textAlign = 'center'
    
    // "OZO MART" brand text
    ctx.fillStyle = '#ff2a44' // Ozo Red
    ctx.font = '900 64px system-ui, -apple-system, sans-serif'
    ctx.fillText('OZO MART', canvas.width / 2, 140)

    // Tagline "SCAN TO SHOP"
    ctx.fillStyle = '#a1a1aa' // Zinc 400
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif'
    ctx.fillText('SCAN  TO  SHOP', canvas.width / 2, 200)

    // 4. Load & draw QR code
    const qrImg = new Image()
    qrImg.crossOrigin = 'anonymous'
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(window.location.href)}`
    
    qrImg.onload = () => {
      // Draw a beautiful white card in the center for the QR code
      const cardWidth = 560
      const cardHeight = 560
      const cardX = (canvas.width - cardWidth) / 2
      const cardY = 260
      const cardRadius = 40

      // Draw shadow for card
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
      ctx.shadowBlur = 30
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 15

      // Draw white rounded card
      ctx.fillStyle = '#ffffff'
      if (ctx.roundRect) {
        ctx.beginPath()
        ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cardRadius)
        ctx.fill()
      } else {
        ctx.fillRect(cardX, cardY, cardWidth, cardHeight)
      }

      // Reset shadow
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      // Draw the QR Code image inside the card (centered)
      const qrSize = 460
      const qrX = cardX + (cardWidth - qrSize) / 2
      const qrY = cardY + (cardHeight - qrSize) / 2
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)

      // 5. Draw Store Name below QR card
      ctx.fillStyle = '#ffffff'
      ctx.font = '900 44px system-ui, -apple-system, sans-serif'
      ctx.fillText(mart?.name || 'Ozo Mart Store', canvas.width / 2, 890)

      // 6. Draw Store Address (trimmed to fit)
      if (mart?.address) {
        ctx.fillStyle = '#a1a1aa'
        ctx.font = '500 22px system-ui, -apple-system, sans-serif'
        let addressToShow = mart.address
        if (addressToShow.length > 55) {
          addressToShow = addressToShow.substring(0, 52) + '...'
        }
        ctx.fillText(addressToShow, canvas.width / 2, 940)
      }

      // 7. Draw Footer brand tagline
      ctx.fillStyle = '#4b5563' // Gray 600
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif'
      ctx.fillText('ORDER  •  ZERO DELAY  •  ON-TIME', canvas.width / 2, 1030)

      // 8. Trigger Download
      canvas.toBlob((blob) => {
        toast.dismiss('generating-flyer')
        if (!blob) {
          toast.error('Failed to generate flyer image')
          return
        }
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = `${mart?.name?.toLowerCase().replace(/\s+/g, '-')}-flyer-qr.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(blobUrl)
        toast.success('Store QR Flyer downloaded successfully!')
      }, 'image/png')
    }

    qrImg.onerror = () => {
      toast.dismiss('generating-flyer')
      toast.error('Failed to load QR code image for flyer generation')
    }
  }

  // Check store status (open/closed)
  const isStoreOpen = useMemo(() => {
    if (!mart) return false
    if (!mart.is_active) return false
    if (mart.is_24_7) return true
    if (!mart.opens_at || !mart.closes_at) return true

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    const [openH, openM] = mart.opens_at.split(':').map(Number)
    const [closeH, closeM] = mart.closes_at.split(':').map(Number)
    
    const openTime = openH * 60 + openM
    const closeTime = closeH * 60 + closeM

    if (closeTime > openTime) {
      return currentTime >= openTime && currentTime <= closeTime
    } else {
      // Over-midnight hours
      return currentTime >= openTime || currentTime <= closeTime
    }
  }, [mart])

  // Handle Image uploads to mart-assets bucket
  const handleImageUpload = async (file, type) => {
    if (!file || !mart) return null
    
    const setUploading = type === 'logo' ? setUploadingLogo : setUploadingBanner
    setUploading(true)
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${mart.id}/${type}-${Date.now()}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('mart-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('mart-assets')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (err) {
      console.error(`Error uploading ${type}:`, err)
      toast.error(`Failed to upload ${type}`)
      return null
    } finally {
      setUploading(false)
    }
  }

  // Handle store profile update save
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!mart) return
    setIsSaving(true)

    try {
      let finalLogoUrl = editForm.logo_url
      let finalBannerUrl = editForm.banner_url

      if (logoFile) {
        const uploadedLogo = await handleImageUpload(logoFile, 'logo')
        if (uploadedLogo) finalLogoUrl = uploadedLogo
      }

      if (bannerFile) {
        const uploadedBanner = await handleImageUpload(bannerFile, 'banner')
        if (uploadedBanner) finalBannerUrl = uploadedBanner
      }

      const updatedFields = {
        name: editForm.name,
        description: editForm.description,
        address: editForm.address,
        phone: editForm.phone,
        opens_at: editForm.opens_at || null,
        closes_at: editForm.closes_at || null,
        is_24_7: editForm.is_24_7,
        is_active: editForm.is_active,
        logo_url: finalLogoUrl,
        banner_url: finalBannerUrl,
        badges: editForm.badges,
        guarantees: editForm.guarantees
      }

      const { data, error } = await supabase
        .from('marts')
        .update(updatedFields)
        .eq('id', mart.id)
        .select(`
          *,
          users!marts_owner_id_fkey (phone)
        `)
        .single()

      if (error) throw error

      setMart(data)
      setShowEditModal(false)
      setLogoFile(null)
      setBannerFile(null)
      toast.success('Store profile updated successfully!')
    } catch (err) {
      console.error('Error updating store:', err)
      toast.error('Failed to update store profile')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-transparent">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-ozo-red/20 border-t-ozo-red rounded-full animate-spin" />
          <div className="absolute w-8 h-8 border-4 border-ozo-green/20 border-b-ozo-green rounded-full animate-spin [animation-direction:reverse] [animation-duration:1s]" />
        </div>
        <p className="mt-6 text-gray-500 dark:text-gray-400 text-xs font-black uppercase tracking-widest animate-pulse">
          Loading store details...
        </p>
      </div>
    )
  }

  if (!mart) return null

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070709] pb-20 relative overflow-hidden">
      {/* Ambient decorative background glows */}
      <div className="absolute top-[350px] left-[-15%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-ozo-red/5 dark:bg-ozo-red/[0.015] blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute top-[800px] right-[-15%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-amber-500/5 dark:bg-amber-500/[0.015] blur-[120px] rounded-full pointer-events-none z-0" />

      <SEO 
        title={`${mart.name} - OZO Mart`}
        description={mart.description || `Order fresh groceries, organic items, and home essentials from ${mart.name} on OZO Mart. Fast delivery to your doorstep.`}
      />

      {/* Hero Banner Section */}
      <div className="relative h-40 md:h-80 overflow-hidden">
        {mart.banner_url ? (
          <img 
            src={mart.banner_url} 
            alt={mart.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full relative overflow-hidden bg-gradient-to-r from-violet-900 via-indigo-900 to-blue-900">
            {/* Animated Ambient Shapes */}
            <div className="absolute top-[10%] left-[20%] w-[30%] h-[50%] bg-pink-500/10 blur-[100px] rounded-full animate-pulse-slow" />
            <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-float" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {isOwner && (
          <button
            onClick={() => setShowEditModal(true)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 dark:bg-black/40 dark:hover:bg-black/60 backdrop-blur-md text-white border border-white/20 font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-lg transition-all active:scale-95 z-20"
          >
            <Edit className="w-4 h-4" />
            <span>Manage Store</span>
          </button>
        )}
      </div>

      {/* Mart Info Card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 md:-mt-36 relative z-10">
        <div className="bg-white/95 dark:bg-[#121214]/95 backdrop-blur-xl border border-gray-150 dark:border-white/5 rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-8 shadow-premium flex flex-col md:flex-row items-center md:items-start justify-between gap-4 md:gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 text-center md:text-left w-full">
            {/* Logo */}
            <div className="w-20 h-20 md:w-36 md:h-36 rounded-2xl md:rounded-3xl overflow-hidden bg-white dark:bg-white/5 border border-white dark:border-white/10 shadow-premium flex-shrink-0 flex items-center justify-center relative group">
              {mart.logo_url ? (
                <img src={mart.logo_url} alt={mart.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center">
                  <Store className="w-8 h-8 md:w-12 md:h-12 text-white" />
                </div>
              )}
            </div>

            {/* details */}
            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mb-2">
                <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">
                  {mart.name}
                </h1>
                <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider ${
                  isStoreOpen 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse'
                }`}>
                  {isStoreOpen ? 'Open Now' : 'Closed'}
                </span>
              </div>

              {mart.description && (
                <p className="text-xs md:text-sm font-semibold text-gray-500 dark:text-gray-400 max-w-2xl mb-3 md:mb-5 leading-relaxed">
                  {mart.description}
                </p>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] md:text-xs text-gray-600 dark:text-gray-400 font-bold justify-center md:justify-start">
                {mart.address && (
                  <div className="flex items-center justify-center md:justify-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-ozo-red shrink-0" />
                    <span>{mart.address}</span>
                  </div>
                )}
                {(mart.phone || mart.users?.phone) && (
                  <a href={`tel:${mart.phone || mart.users?.phone}`} className="flex items-center justify-center md:justify-start gap-1.5 hover:text-ozo-red transition-colors">
                    <Phone className="w-3.5 h-3.5 text-ozo-green shrink-0" />
                    <span>{mart.phone || mart.users?.phone}</span>
                  </a>
                )}
                <div className="flex items-center justify-center md:justify-start gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>
                    {mart.is_24_7 ? '24/7 Delivery' : `${mart.opens_at || '09:00'} - ${mart.closes_at || '22:00'}`}
                  </span>
                </div>
              </div>

              {/* Badges strip */}
              <div className="flex flex-nowrap overflow-x-auto scrollbar-hide gap-2 mt-4 pb-1 w-full justify-start md:justify-start md:flex-wrap md:overflow-visible">
                {(mart.badges && mart.badges.length > 0
                  ? mart.badges
                  : ['30 Min Delivery', '100% Hygienic', 'Top Rated Store', 'Contactless Delivery']
                ).map((badgeText, idx) => {
                  const config = getBadgeConfig(badgeText)
                  const Icon = config.icon
                  return (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-wider border shrink-0 ${config.color}`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{badgeText}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-2 md:mt-0 justify-center w-full md:w-auto shrink-0">
            <button
              onClick={handleShare}
              className="p-2.5 md:p-3.5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-100 dark:border-white/5 rounded-xl md:rounded-2xl transition-all text-gray-700 dark:text-gray-300 flex items-center justify-center active:scale-95 shadow-sm"
              title="Share Store Link"
            >
              {copied ? <Check className="w-4 h-4 md:w-5 md:h-5 text-ozo-green" /> : <Share2 className="w-4 h-4 md:w-5 md:h-5" />}
            </button>

            <button
              onClick={() => setIsQrModalOpen(true)}
              className="p-2.5 md:p-3.5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-100 dark:border-white/5 rounded-xl md:rounded-2xl transition-all text-gray-700 dark:text-gray-300 flex items-center justify-center active:scale-95 shadow-sm"
              title="Show Store QR Code"
            >
              <QrCode className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            
            {mart.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mart.name + ' ' + mart.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 md:p-3.5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-100 dark:border-white/5 rounded-xl md:rounded-2xl transition-all text-gray-700 dark:text-gray-300 flex items-center justify-center active:scale-95 shadow-sm"
                title="View Directions"
              >
                <ExternalLink className="w-4 h-4 md:w-5 md:h-5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Selector Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="flex border-b border-gray-200 dark:border-white/5 gap-8">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${
              activeTab === 'products' ? 'text-ozo-red' : 'text-gray-400 hover:text-gray-650'
            }`}
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>Offerings ({filteredProducts.length})</span>
            </span>
            {activeTab === 'products' && (
              <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-1 bg-ozo-red rounded-full" />
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('about')}
            className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${
              activeTab === 'about' ? 'text-ozo-red' : 'text-gray-400 hover:text-gray-650'
            }`}
          >
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span>Store Info & Hours</span>
            </span>
            {activeTab === 'about' && (
              <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-1 bg-ozo-red rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <AnimatePresence mode="wait">
          {activeTab === 'products' ? (
            <motion.div
              key="productsTab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              {/* Inner Store Search & Categories */}
              <div className="flex flex-col gap-6 bg-white dark:bg-[#121214] p-5 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm">
                <div className="relative w-full max-w-lg mx-auto">
                  <input
                    type="text"
                    placeholder={`Search products in ${mart.name}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-10 py-3.5 bg-gray-50 dark:bg-[#09090b] border border-gray-200 dark:border-white/5 rounded-2xl text-sm font-bold text-gray-900 dark:text-white placeholder-gray-450 focus:outline-none focus:ring-2 focus:ring-ozo-red/20 focus:border-ozo-red transition-all shadow-inner"
                  />
                  <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Categories Pill Scroll */}
                <div className="w-full overflow-x-auto no-scrollbar scroll-smooth flex items-center gap-3.5 pb-2 border-t border-gray-100 dark:border-white/5 pt-4">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                      selectedCategory === 'all'
                        ? 'bg-gradient-ozo text-white border-transparent shadow-lg shadow-ozo-red/20 scale-[1.02]'
                        : 'bg-gray-50 dark:bg-[#09090b] text-gray-500 dark:text-gray-400 border-gray-150 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10'
                    }`}
                  >
                    <span>All Products</span>
                  </button>
                  
                  {storeCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                        selectedCategory === cat.id
                          ? 'bg-gradient-ozo text-white border-transparent shadow-lg shadow-ozo-red/20 scale-[1.02]'
                          : 'bg-gray-50 dark:bg-[#09090b] text-gray-500 dark:text-gray-400 border-gray-150 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10'
                      }`}
                    >
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Grid */}
              <div>
                {filteredProducts.length === 0 ? (
                  <div className="bg-white dark:bg-[#121214] rounded-[2.5rem] border border-gray-100 dark:border-white/5 p-16 text-center max-w-lg mx-auto shadow-sm">
                    <Info className="w-14 h-14 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-gray-800 dark:text-white mb-2">No Products Available</h3>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 leading-relaxed">
                      We couldn't find any in-stock products matching your criteria in this store. Try browsing other categories or reset search queries.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredProducts.map(item => {
                      const displayProduct = {
                        ...item.products,
                        image_url: item.custom_image_url || item.products.image_url,
                        price: item.mart_price ? parseFloat(item.mart_price) : parseFloat(item.products.price),
                        mrp: item.mart_mrp ? parseFloat(item.mart_mrp) : parseFloat(item.products.mrp),
                        quantity_available: item.stock_quantity,
                        is_available: item.is_available && item.stock_quantity > 0
                      }

                      return (
                        <ProductCard 
                          key={item.id} 
                          product={displayProduct}
                        />
                      )
                    })}
                  </div>
                )}

                {/* Load More Section */}
                {hasMore && (
                  <div className="flex flex-col items-center justify-center mt-12 mb-6">
                    <button
                      onClick={handleLoadMore}
                      disabled={isFetchingMore}
                      className="px-8 py-3.5 rounded-full bg-ozo-red hover:bg-ozo-red/90 text-white font-black uppercase text-xs tracking-wider shadow-lg hover:shadow-ozo-red/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all duration-300 flex items-center gap-2 cursor-pointer"
                    >
                      {isFetchingMore ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Loading Products...</span>
                        </>
                      ) : (
                        <span>Load More Products</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="aboutTab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"
            >
              {/* Left & Middle Column: Store details & features */}
              <div className="lg:col-span-2 space-y-6">
                {/* Store Description and Info */}
                <div className="bg-white dark:bg-[#121214] p-6 md:p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider mb-2">About The Store</h3>
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-450 leading-relaxed">
                      {mart.description || `${mart.name} is your trusted neighborhood grocery partner. We offer handpicked vegetables, dairy products, bakery staples, organic food items, and home essentials with superfast 30-minute delivery in ${selectedCitySlug || 'Aurangabad'}.`}
                    </p>
                  </div>

                  <div className="border-t border-gray-100 dark:border-white/5 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest block">Store Address</span>
                      <p className="text-sm font-bold text-gray-700 dark:text-zinc-300 leading-snug">{mart.address || 'Not Configured'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest block">Store Helpline</span>
                      <p className="text-sm font-bold text-gray-700 dark:text-zinc-300">{mart.phone || mart.users?.phone || 'Not Configured'}</p>
                    </div>
                  </div>
                </div>

                {/* Why Shop Here Badges detail list */}
                {mart.guarantees && mart.guarantees.length > 0 && (
                  <div className="bg-white dark:bg-[#121214] p-6 md:p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm space-y-6">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">Store Guarantees</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {mart.guarantees.map((guarantee, idx) => {
                        const Icon = getGuaranteeIcon(guarantee.icon)
                        let colorClasses = 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                        if (guarantee.icon === 'clock') {
                          colorClasses = 'bg-red-500/10 text-rose-500 border border-red-500/20'
                        } else if (guarantee.icon === 'shield-check' || guarantee.icon === 'shield') {
                          colorClasses = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        } else if (guarantee.icon === 'thumbs-up') {
                          colorClasses = 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        } else if (guarantee.icon === 'trending-up') {
                          colorClasses = 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                        } else if (guarantee.icon === 'zap') {
                          colorClasses = 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20'
                        }

                        return (
                          <div key={idx} className="flex gap-4 items-start">
                            <div className={`p-3 rounded-2xl shrink-0 ${colorClasses}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-black text-sm text-gray-800 dark:text-white">{guarantee.title}</h4>
                              <p className="text-xs text-gray-550 dark:text-gray-400 font-bold mt-0.5">{guarantee.description}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Business hours & map details */}
              <div className="space-y-6">
                {/* Business Hours Summary */}
                <div className="bg-white dark:bg-[#121214] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
                  <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-ozo-red" />
                    <span>Business Hours</span>
                  </h3>
                  
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-zinc-300 pb-2 border-b border-gray-100 dark:border-white/5">
                      <span>Store Status</span>
                      <span className={`font-black ${isStoreOpen ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isStoreOpen ? 'OPEN FOR ORDERING' : 'CURRENTLY CLOSED'}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                      <span>Delivery Type</span>
                      <span className="font-black text-gray-800 dark:text-white">
                        {mart.is_24_7 ? '24 Hours Delivery' : 'Standard Scheduled Hours'}
                      </span>
                    </div>

                    {!mart.is_24_7 && (
                      <>
                        <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-450">
                          <span>Opening Time</span>
                          <span className="font-black text-gray-800 dark:text-white">{mart.opens_at || '09:00'}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-450">
                          <span>Closing Time</span>
                          <span className="font-black text-gray-800 dark:text-white">{mart.closes_at || '22:00'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Google Maps Embed Mock Card */}
                {mart.address && (
                  <div className="bg-white dark:bg-[#121214] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
                    <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-ozo-red" />
                      <span>Directions</span>
                    </h3>
                    
                    <div className="h-40 rounded-2xl overflow-hidden relative border border-gray-150 dark:border-white/5 bg-gray-100 dark:bg-white/5 flex flex-col justify-center items-center p-4 text-center">
                      <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=24.7501,84.3725&zoom=14&size=400x200&sensor=false')] bg-cover opacity-20" />
                      <div className="relative z-10 space-y-2">
                        <p className="text-xs font-black text-gray-700 dark:text-zinc-300 line-clamp-2 px-4 leading-tight">{mart.address}</p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mart.name + ' ' + mart.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-ozo text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all"
                        >
                          <span>Open in Google Maps</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Edit Store Profile Drawer / Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Sidebar drawer content */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md h-full bg-white dark:bg-[#0c0c0c] border-l border-gray-150 dark:border-white/10 shadow-2xl flex flex-col z-10"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg text-gray-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-ozo-red" />
                    <span>Manage Store Profile</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-0.5">Customize how your store appears to customers</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-gray-450 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                {/* Store Status Active Toggle */}
                <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 flex items-center justify-between border border-gray-100 dark:border-white/5">
                  <div>
                    <h4 className="text-sm font-black text-gray-800 dark:text-white">Active Status</h4>
                    <p className="text-xs text-gray-500 font-bold mt-0.5">Show or hide this store on OZO Mart</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                    className={`w-12 h-6.5 rounded-full p-1 transition-all ${
                      editForm.is_active ? 'bg-ozo-green' : 'bg-gray-300 dark:bg-white/10'
                    }`}
                  >
                    <div className={`w-4.5 h-4.5 rounded-full bg-white transition-all transform ${
                      editForm.is_active ? 'translate-x-5.5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider block">Store Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl text-sm font-bold focus:outline-none focus:border-ozo-red text-gray-900 dark:text-white"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider block">Tagline / Description</label>
                  <textarea
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="E.g. Fresh organic vegetables, dairy, and local Mithila items."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl text-sm font-bold focus:outline-none focus:border-ozo-red text-gray-900 dark:text-white resize-none"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider block">Address</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl text-sm font-bold focus:outline-none focus:border-ozo-red text-gray-900 dark:text-white"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider block">Phone Number</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl text-sm font-bold focus:outline-none focus:border-ozo-red text-gray-900 dark:text-white"
                  />
                </div>

                {/* Operating hours */}
                <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 space-y-4 border border-gray-100 dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-gray-800 dark:text-white">Operating Hours</h4>
                      <p className="text-xs text-gray-550 font-bold mt-0.5">Toggle 24/7 delivery status</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, is_24_7: !prev.is_24_7 }))}
                      className={`w-12 h-6.5 rounded-full p-1 transition-all ${
                        editForm.is_24_7 ? 'bg-ozo-green' : 'bg-gray-300 dark:bg-white/10'
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full bg-white transition-all transform ${
                        editForm.is_24_7 ? 'translate-x-5.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {!editForm.is_24_7 && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-650 uppercase tracking-wider block">Opens At</label>
                        <div className="flex gap-2 items-center">
                          <select
                            value={parseTimeString(editForm.opens_at).hour}
                            onChange={(e) => {
                              const newHour = e.target.value
                              const currentMin = parseTimeString(editForm.opens_at).minute
                              setEditForm(prev => ({
                                ...prev,
                                opens_at: `${newHour}:${currentMin}:00`
                              }))
                            }}
                            className="flex-1 bg-white dark:bg-black border border-gray-200 dark:border-white/5 rounded-xl px-2.5 py-2 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red cursor-pointer"
                          >
                            {Array.from({ length: 24 }).map((_, i) => {
                              const h = String(i).padStart(2, '0')
                              return (
                                <option key={h} value={h} className="bg-white dark:bg-black text-gray-900 dark:text-white">
                                  {h} ({i >= 12 ? (i === 12 ? '12 PM' : `${i-12} PM`) : (i === 0 ? '12 AM' : `${i} AM`)})
                                </option>
                              )
                            })}
                          </select>
                          <span className="text-gray-400 font-bold">:</span>
                          <select
                            value={parseTimeString(editForm.opens_at).minute}
                            onChange={(e) => {
                              const newMin = e.target.value
                              const currentHour = parseTimeString(editForm.opens_at).hour
                              setEditForm(prev => ({
                                ...prev,
                                opens_at: `${currentHour}:${newMin}:00`
                              }))
                            }}
                            className="flex-1 bg-white dark:bg-black border border-gray-200 dark:border-white/5 rounded-xl px-2.5 py-2 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red cursor-pointer"
                          >
                            {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                              <option key={m} value={m} className="bg-white dark:bg-black text-gray-900 dark:text-white">{m}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-650 uppercase tracking-wider block">Closes At</label>
                        <div className="flex gap-2 items-center">
                          <select
                            value={parseTimeString(editForm.closes_at).hour}
                            onChange={(e) => {
                              const newHour = e.target.value
                              const currentMin = parseTimeString(editForm.closes_at).minute
                              setEditForm(prev => ({
                                ...prev,
                                closes_at: `${newHour}:${currentMin}:00`
                              }))
                            }}
                            className="flex-1 bg-white dark:bg-black border border-gray-200 dark:border-white/5 rounded-xl px-2.5 py-2 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red cursor-pointer"
                          >
                            {Array.from({ length: 24 }).map((_, i) => {
                              const h = String(i).padStart(2, '0')
                              return (
                                <option key={h} value={h} className="bg-white dark:bg-black text-gray-900 dark:text-white">
                                  {h} ({i >= 12 ? (i === 12 ? '12 PM' : `${i-12} PM`) : (i === 0 ? '12 AM' : `${i} AM`)})
                                </option>
                              )
                            })}
                          </select>
                          <span className="text-gray-400 font-bold">:</span>
                          <select
                            value={parseTimeString(editForm.closes_at).minute}
                            onChange={(e) => {
                              const newMin = e.target.value
                              const currentHour = parseTimeString(editForm.closes_at).hour
                              setEditForm(prev => ({
                                ...prev,
                                closes_at: `${currentHour}:${newMin}:00`
                              }))
                            }}
                            className="flex-1 bg-white dark:bg-black border border-gray-200 dark:border-white/5 rounded-xl px-2.5 py-2 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red cursor-pointer"
                          >
                            {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                              <option key={m} value={m} className="bg-white dark:bg-black text-gray-900 dark:text-white">{m}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Store Badges Custom Configuration */}
                <div className="space-y-3 bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
                  <div>
                    <h4 className="text-sm font-black text-gray-800 dark:text-white">Store Highlights / Badges</h4>
                    <p className="text-xs text-gray-500 font-bold mt-0.5">Customize badges shown on your store profile page</p>
                  </div>

                  {/* Added Badges list */}
                  <div className="flex flex-wrap gap-2">
                    {editForm.badges?.map((badge, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-800 dark:text-zinc-200"
                      >
                        <span>{badge}</span>
                        <button
                          type="button"
                          onClick={() => setEditForm(prev => ({
                            ...prev,
                            badges: prev.badges.filter((_, i) => i !== idx)
                          }))}
                          className="text-gray-400 hover:text-rose-500 transition-colors p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                    {(!editForm.badges || editForm.badges.length === 0) && (
                      <p className="text-xs text-gray-400 dark:text-zinc-500 italic">No badges configured. Standard system defaults will be shown.</p>
                    )}
                  </div>

                  {/* Add badge input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add custom highlight (e.g. Pure Veg)"
                      value={newBadgeText}
                      onChange={(e) => setNewBadgeText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (newBadgeText.trim()) {
                            if (!editForm.badges.includes(newBadgeText.trim())) {
                              setEditForm(prev => ({
                                ...prev,
                                badges: [...prev.badges, newBadgeText.trim()]
                              }))
                            }
                            setNewBadgeText('')
                          }
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-white dark:bg-black border border-gray-200 dark:border-white/5 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newBadgeText.trim()) {
                          if (!editForm.badges.includes(newBadgeText.trim())) {
                            setEditForm(prev => ({
                              ...prev,
                              badges: [...prev.badges, newBadgeText.trim()]
                            }))
                          }
                          setNewBadgeText('')
                        }
                      }}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-white/10 dark:hover:bg-white/15 rounded-xl text-xs font-black uppercase text-gray-800 dark:text-white transition-all active:scale-95 shrink-0"
                    >
                      Add
                    </button>
                  </div>

                  {/* Quick Suggestions */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest block">Quick Suggestions</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        '30 Min Delivery',
                        '100% Hygienic',
                        'Top Rated Store',
                        'Contactless Delivery',
                        '100% Pure Veg',
                        'Organic Produce',
                        'Sealed Packaging',
                        'Fresh Stock'
                      ].map((sug, idx) => {
                        const isAdded = editForm.badges?.includes(sug)
                        if (isAdded) return null
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setEditForm(prev => ({
                              ...prev,
                              badges: [...(prev.badges || []), sug]
                            }))}
                            className="text-[10px] font-bold px-2 py-1 bg-white hover:bg-gray-100 dark:bg-black dark:hover:bg-zinc-900 border border-gray-150 dark:border-white/5 rounded-lg text-gray-600 dark:text-zinc-400 hover:border-ozo-red/30 transition-colors"
                          >
                            + {sug}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Store Guarantees Configuration */}
                <div className="space-y-4 bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-gray-800 dark:text-white">Store Guarantees</h4>
                      <p className="text-xs text-gray-500 font-bold">List key guarantees of your store</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditForm(prev => ({
                        ...prev,
                        guarantees: [
                          ...(prev.guarantees || []),
                          { title: 'New Guarantee', description: 'Describe your guarantee here.', icon: 'shield' }
                        ]
                      }))}
                      className="px-2.5 py-1 bg-ozo-red text-white hover:bg-ozo-red/90 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      + Add
                    </button>
                  </div>

                  <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1 no-scrollbar">
                    {editForm.guarantees?.map((guarantee, idx) => (
                      <div key={idx} className="bg-white dark:bg-black p-3.5 rounded-xl border border-gray-200 dark:border-white/5 space-y-2.5 relative">
                        <button
                          type="button"
                          onClick={() => setEditForm(prev => ({
                            ...prev,
                            guarantees: prev.guarantees.filter((_, i) => i !== idx)
                          }))}
                          className="absolute top-2.5 right-2.5 text-gray-405 hover:text-rose-500 transition-colors p-1"
                          title="Remove Guarantee"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        {/* Title input */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Title</label>
                          <input
                            type="text"
                            value={guarantee.title}
                            onChange={(e) => {
                              const newVal = e.target.value
                              setEditForm(prev => {
                                const newGuar = [...prev.guarantees]
                                newGuar[idx] = { ...newGuar[idx], title: newVal }
                                return { ...prev, guarantees: newGuar }
                              })
                            }}
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-150 dark:border-white/10 rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red"
                          />
                        </div>

                        {/* Description input */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Description</label>
                          <textarea
                            rows={2}
                            value={guarantee.description}
                            onChange={(e) => {
                              const newVal = e.target.value
                              setEditForm(prev => {
                                const newGuar = [...prev.guarantees]
                                newGuar[idx] = { ...newGuar[idx], description: newVal }
                                return { ...prev, guarantees: newGuar }
                              })
                            }}
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-150 dark:border-white/10 rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red resize-none"
                          />
                        </div>

                        {/* Icon Select dropdown */}
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Icon style</label>
                          <select
                            value={guarantee.icon}
                            onChange={(e) => {
                              const newVal = e.target.value
                              setEditForm(prev => {
                                const newGuar = [...prev.guarantees]
                                newGuar[idx] = { ...newGuar[idx], icon: newVal }
                                return { ...prev, guarantees: newGuar }
                              })
                            }}
                            className="w-full px-2.5 py-1.5 bg-gray-50 dark:bg-zinc-900 border border-gray-150 dark:border-white/10 rounded-lg text-xs font-bold text-gray-950 dark:text-zinc-100 focus:outline-none focus:border-ozo-red"
                          >
                            <option value="shield">Shield (Security)</option>
                            <option value="shield-check">Shield Check (Quality Check)</option>
                            <option value="clock">Clock (Delivery Speed)</option>
                            <option value="thumbs-up">Thumbs Up (Replacement / Trust)</option>
                            <option value="trending-up">Trending Up (Pricing / Rates)</option>
                            <option value="zap">Zap (Speed/Flash)</option>
                            <option value="star">Star (Rating/Top)</option>
                            <option value="check">Checkmark (Verified)</option>
                          </select>
                        </div>
                      </div>
                    ))}
                    {(!editForm.guarantees || editForm.guarantees.length === 0) && (
                      <p className="text-xs text-gray-400 dark:text-zinc-500 italic text-center py-4 bg-white dark:bg-black rounded-xl border border-dashed border-gray-200 dark:border-white/10">No guarantees configured.</p>
                    )}
                  </div>
                </div>

                {/* Logo Image Upload */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider block">Store Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                      {logoFile ? (
                        <img src={URL.createObjectURL(logoFile)} alt="Logo Preview" className="w-full h-full object-cover" />
                      ) : editForm.logo_url ? (
                        <img src={editForm.logo_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-gray-300 dark:border-white/10 rounded-2xl py-4 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                      {uploadingLogo ? (
                        <Loader2 className="w-5 h-5 animate-spin text-ozo-red" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-gray-400 mb-1" />
                          <span className="text-[10px] font-black text-gray-650 dark:text-gray-400 uppercase tracking-wider">Choose File</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Banner Image Upload */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider block">Store Banner</label>
                  <div className="flex flex-col gap-3">
                    <div className="w-full h-24 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 overflow-hidden flex items-center justify-center">
                      {bannerFile ? (
                        <img src={URL.createObjectURL(bannerFile)} alt="Banner Preview" className="w-full h-full object-cover" />
                      ) : editForm.banner_url ? (
                        <img src={editForm.banner_url} alt="Banner" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600" />
                      )}
                    </div>
                    <label className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 dark:border-white/10 rounded-2xl py-3 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                      {uploadingBanner ? (
                        <Loader2 className="w-5 h-5 animate-spin text-ozo-red" />
                      ) : (
                        <>
                          <Upload className="w-5 h-5 text-gray-400" />
                          <span className="text-[10px] font-black text-gray-650 dark:text-gray-400 uppercase tracking-wider">Choose Banner File</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setBannerFile(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </form>

              {/* Footer */}
              <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-[#0c0c0c] flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 border border-gray-100 dark:border-white/5 rounded-xl font-black text-xs uppercase tracking-widest text-gray-700 dark:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving || uploadingLogo || uploadingBanner}
                  className="flex-1 py-3 bg-gradient-ozo text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-ozo-red/20 active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Code Sharing Modal */}
      <AnimatePresence>
        {isQrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#121214] rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-white/5 relative flex flex-col items-center text-center overflow-hidden"
            >
              {/* Top ambient glowing circle */}
              <div className="absolute -top-12 -left-12 w-28 h-28 bg-ozo-red/10 blur-2xl rounded-full pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-indigo-600/10 blur-2xl rounded-full pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="absolute top-6 right-6 p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>

              {/* Icon & Store Info */}
              <div className="w-12 h-12 rounded-2xl bg-ozo-red/10 flex items-center justify-center text-ozo-red mb-4 mt-2">
                <Store size={22} />
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mb-1">
                Scan to Shop
              </h3>
              <p className="text-xs text-ozo-gray dark:text-gray-400 font-black mb-6 max-w-[200px] truncate">
                {mart?.name}
              </p>

              {/* QR Code Container */}
              <div className="p-4 bg-white rounded-3xl shadow-inner border border-gray-150 relative mb-6">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.href)}`}
                  alt={`${mart?.name} QR Code`}
                  className="w-48 h-48 object-contain animate-fade-in"
                />
              </div>

              {/* Buttons Actions */}
              <div className="w-full space-y-3">
                <button
                  onClick={handleShare}
                  className="w-full py-3 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 border border-gray-100 dark:border-white/5 rounded-xl font-black text-xs uppercase tracking-widest text-gray-700 dark:text-gray-300 transition-all flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-ozo-green" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>Copy Store Link</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownloadQr}
                  className="w-full py-3 bg-gradient-ozo hover:opacity-90 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-ozo-red/20 active:scale-95"
                >
                  <Upload className="w-4 h-4 rotate-180" />
                  <span>Download QR Image</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MartProfile
