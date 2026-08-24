import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Trash2,
  Copy,
  Pencil,
  Eye,
  Check,
  X,
  Filter,
  Loader2,
  Image as ImageIcon,
  DollarSign,
  Package,
  AlertTriangle,
  RefreshCw,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Terminal,
  Play,
  Zap,
  BarChart2,
  Percent,
  ShieldAlert,
  ChevronDown,
  ArrowUpDown,
  Globe,
  Folder,
  Store,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Coins,
  MapPin,
  HelpCircle
} from 'lucide-react'
import { supabaseAdmin } from '../../lib/supabase'
import toast from 'react-hot-toast'
import ImageUpload from '../../components/ImageUpload'
import { useAuthStore } from '../../stores/authStore'
import BulkControlPanel from '../../components/admin/BulkControlPanel'
import ProductCityManager from '../../components/admin/ProductCityManager'
import ConfirmModal from '../../components/ConfirmModal'

// Helper to generate unique slugs
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') + '-' + Math.random().toString(36).substring(2, 7);
}

// Helper to generate URL-friendly slug while typing (replaces spaces/underscores with hyphens)
const slugifyForTyping = (text) => {
  return text
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
}

// Helper to convert file to base64
const getBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = error => reject(error)
  })
}

// Helper to convert and compress file to base64 with adjustable quality/size
const getCompressedBase64 = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.9) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => resolve(event.target.result)
    }
    reader.onerror = () => resolve('')
  })
}

// Helper to convert base64 back to file object
const dataURLtoFile = (dataurl, filename) => {
  try {
    let arr = dataurl.split(','), 
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), 
        n = bstr.length, 
        u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new File([u8arr], filename, { type: mime })
  } catch (err) {
    console.error('Failed to convert data URL to File:', err)
    return null
  }
}

// Fallback Categories if fetch fails
const FALLBACK_CATEGORIES = [
  { id: 'e3516d99-71e7-4e89-b3b5-75b1d2704101', name: 'Fresh Vegetables', slug: 'vegetables', icon: '🥦' },
  { id: '481306e6-10ae-4eb9-922b-b09d3af61190', name: 'Fresh Fruits', slug: 'fruits', icon: '🍎' },
  { id: '58bee475-e3ed-4ab2-b01e-6bd261cdf9b2', name: 'Mithila & Bihar Specials', slug: 'mithila-specials', icon: '✨' }
]

// Fallback Marts if fetch fails
const FALLBACK_MARTS = [
  { id: 'apna-bazar-uuid', name: 'Apna Bazar', slug: 'apna-bazar', address: 'Main Market Road, Bypass' },
  { id: 'bypass-road-uuid', name: 'Bypass Road Mart', slug: 'bypass-road-mart', address: 'Bypass Crossing, Near Highway' },
  { id: 'city-mega-uuid', name: 'City Mega Mart', slug: 'city-mega-mart', address: 'City Center Mall, 1st Floor' }
]


const Products = () => {
  // Lists
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [marts, setMarts] = useState([])
  const [hoveredImage, setHoveredImage] = useState(null)

  // States
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedMart, setSelectedMart] = useState('all')
  const [stockFilter, setStockFilter] = useState('all') // 'all' | 'in-stock' | 'out-of-stock'
  const [sortBy, setSortBy] = useState('newest') // 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'name-asc'
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [hasImageFilter, setHasImageFilter] = useState('all') // 'all' | 'yes' | 'no'
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 10

  // Stats states
  const [stats, setStats] = useState({ total: 0, oos: 0, pending: 0 })
  const [activeViewTab, setActiveViewTab] = useState('all') // 'all' | 'verification'

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    barcode: '',
    brand: '',
    categoryId: '',
    martId: '',
    mrp: '',
    price: '',
    ozoPrice: '',
    unit: '1 unit',
    description: '',
    isAvailable: true,
    imageUrl: '',
    images: [],
    isUpcoming: false
  })
  
  // Image Upload States
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  // Track inline edited prices: { [productId]: tempPriceValue }
  const [editedPrices, setEditedPrices] = useState({})
  // Track open tooltip breakdown: { productId | null }
  const [activeTooltipId, setActiveTooltipId] = useState(null)
  // Track updating states for individual actions
  const [updatingProductId, setUpdatingProductId] = useState(null)

  // Local SHG / Vendor Network Control States
  const [shgEnabled, setShgEnabled] = useState(true)
  const [isUpdatingShg, setIsUpdatingShg] = useState(false)

  // Profit Optimizer States
  const [showProfitPanel, setShowProfitPanel] = useState(false)
  const [optimizerData, setOptimizerData] = useState({
    configuredCount: 0,
    currentMargin: 0,
    suggestions: [],
    loading: false
  })

  // SQL Drawer console states
  const [drawerTab, setDrawerTab] = useState('form') // 'form' | 'sql'
  const [customSql, setCustomSql] = useState('')
  const [sqlResult, setSqlResult] = useState(null)
  const [runningSql, setRunningSql] = useState(false)

  // Custom Confirmation Modal states
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [confirmRejectProduct, setConfirmRejectProduct] = useState(null)

  const generateProductSql = () => {
    const name = (formData.name || '').trim().replace(/'/g, "''")
    const slug = (formData.slug || '').trim().replace(/'/g, "''")
    const barcode = formData.barcode ? `'${formData.barcode.trim().replace(/'/g, "''")}'` : 'NULL'
    const brand = formData.brand ? `'${formData.brand.trim().replace(/'/g, "''")}'` : 'NULL'
    const categoryId = formData.categoryId ? `'${formData.categoryId}'` : 'NULL'
    const martId = formData.martId ? `'${formData.martId}'` : 'NULL'
    const mrp = parseFloat(formData.mrp) || 0
    const price = parseFloat(formData.price) || 0
    const ozoPrice = formData.ozoPrice !== '' && !isNaN(parseFloat(formData.ozoPrice)) ? parseFloat(formData.ozoPrice) : 'NULL'
    const unit = (formData.unit || '1 unit').trim().replace(/'/g, "''")
    const description = formData.description ? `'${formData.description.trim().replace(/'/g, "''")}'` : 'NULL'
    const isAvailable = formData.isAvailable ? 'true' : 'false'
    const isUpcoming = formData.isUpcoming ? 'true' : 'false'
    const mainImageUrl = formData.images && formData.images.length > 0 ? formData.images[0] : (formData.imageUrl || '')
    const imageUrl = mainImageUrl ? `'${mainImageUrl.trim().replace(/'/g, "''")}'` : 'NULL'
    const imagesSql = formData.images && formData.images.length > 0
      ? `ARRAY[${formData.images.map(img => `'${img.trim().replace(/'/g, "''")}'`).join(', ')}]`
      : 'NULL'

    if (editingProduct) {
      return `UPDATE public.products
SET 
  name = '${name}',
  slug = '${slug}',
  barcode = ${barcode},
  brand = ${brand},
  category_id = ${categoryId},
  mart_id = ${martId},
  mrp = ${mrp},
  price = ${price},
  ozo_price = ${ozoPrice},
  unit = '${unit}',
  description = ${description},
  is_available = ${isAvailable},
  is_upcoming = ${isUpcoming},
  image_url = ${imageUrl},
  images = ${imagesSql},
  updated_at = NOW()
WHERE id = '${editingProduct.id}';`
    } else {
      return `INSERT INTO public.products (
  name, 
  slug, 
  barcode,
  brand, 
  category_id, 
  mart_id, 
  mrp, 
  price, 
  ozo_price,
  unit, 
  description, 
  is_available, 
  is_upcoming,
  image_url,
  images
) VALUES (
  '${name}', 
  '${slug}', 
  ${barcode},
  ${brand}, 
  ${categoryId}, 
  ${martId}, 
  ${mrp}, 
  ${price}, 
  ${ozoPrice},
  '${unit}', 
  ${description}, 
  ${isAvailable}, 
  ${isUpcoming},
  ${imageUrl},
  ${imagesSql}
);`
    }
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
      const { data, error } = await supabaseAdmin.rpc('exec_sql', {
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
        fetchProducts()
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
      setCustomSql(generateProductSql())
    }
  }, [drawerTab, formData])

  // Fetch initial data
  // Fetch static lookups (categories, marts, bigbasket config)
  const loadStaticData = async () => {
    try {
      // 1. Fetch Categories
      let categoriesList = []
      try {
        const { data: catData, error: catError } = await supabaseAdmin
          .from('categories')
          .select('*')
          .order('name', { ascending: true })
        if (catError) throw catError
        categoriesList = catData || []
      } catch (err) {
        console.warn("Failed to load categories, using fallbacks:", err)
        categoriesList = FALLBACK_CATEGORIES
      }
      setCategories(categoriesList)

      // 2. Fetch Marts
      let martsList = []
      try {
        const { profile, getScopedCities, getScopedMarts } = useAuthStore.getState()
        const isSuperAdmin = profile?.isSuperAdmin
        const isCityManager = profile?.isCityManager
        const isMartOwner = profile?.isMartOwner

        let martsQuery = supabaseAdmin
          .from('marts')
          .select('*')

        if (!isSuperAdmin) {
          if (isCityManager) {
            const scopedCities = getScopedCities()
            if (scopedCities.length > 0) {
              martsQuery = martsQuery.in('city_id', scopedCities)
            } else {
              martsQuery = martsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
            }
          } else if (isMartOwner) {
            const scopedMarts = getScopedMarts()
            if (scopedMarts.length > 0) {
              martsQuery = martsQuery.in('id', scopedMarts)
            } else {
              martsQuery = martsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
            }
          } else {
            martsQuery = martsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
          }
        }

        const { data: martData, error: martError } = await martsQuery.order('name', { ascending: true })
        if (martError) throw martError
        martsList = martData || []
      } catch (err) {
        console.warn("Failed to load marts, using fallbacks:", err)
        martsList = FALLBACK_MARTS
      }
      setMarts(martsList)

      // 3. Fetch Local SHG / Vendor Config
      try {
        const { data: bbData, error: bbError } = await supabaseAdmin
          .from('app_settings')
          .select('value')
          .or('key.eq.shg_config,key.eq.bigbasket_config')
        
        if (bbError) {
          console.warn('Failed to load vendor settings:', bbError)
        } else if (bbData && bbData.length > 0 && bbData[0].value) {
          setShgEnabled(bbData[0].value.enabled ?? true)
        }
      } catch (err) {
        console.warn('Error fetching vendor config:', err)
      }
    } catch (error) {
      console.error('Unexpected error fetching static lookups:', error)
    }
  }

  // Fetch paginated, filtered products list and update overall counts
  const fetchProducts = async () => {
    setLoading(true)
    try {
      const { profile, getScopedCities, getScopedMarts } = useAuthStore.getState()
      const isSuperAdmin = profile?.isSuperAdmin
      const isCityManager = profile?.isCityManager
      const isMartOwner = profile?.isMartOwner

      let allowedMartIds = []
      let needsFiltering = false

      if (!isSuperAdmin) {
        needsFiltering = true
        if (isCityManager) {
          const scopedCities = getScopedCities()
          if (scopedCities.length > 0) {
            const { data: managerMarts } = await supabaseAdmin
              .from('marts')
              .select('id')
              .in('city_id', scopedCities)
            if (managerMarts && managerMarts.length > 0) {
              allowedMartIds = managerMarts.map(m => m.id)
            }
          }
        } else if (isMartOwner) {
          const scopedMarts = getScopedMarts()
          if (scopedMarts.length > 0) {
            allowedMartIds = scopedMarts
          }
        }
      }

      // 1. Build Query
      let query = supabaseAdmin
        .from('products')
        .select(`
          *,
          category:categories ( id, name, slug ),
          mart:marts!mart_id ( id, name ),
          enriched_mart:marts!enriched_by_mart_id ( id, name )
        `, { count: 'exact' })

      // Verification Status Filter
      if (activeViewTab === 'verification') {
        query = query.eq('verification_status', 'pending')
      }

      // Search Filter
      if (debouncedSearchQuery) {
        query = query.or(`name.ilike.%${debouncedSearchQuery}%,brand.ilike.%${debouncedSearchQuery}%,description.ilike.%${debouncedSearchQuery}%,barcode.ilike.%${debouncedSearchQuery}%`)
      }

      // Category Filter
      if (selectedCategory !== 'all') {
        const subCategoryIds = categories
          .filter(c => c.parent_id === selectedCategory)
          .map(c => c.id)

        if (subCategoryIds.length > 0) {
          query = query.in('category_id', [selectedCategory, ...subCategoryIds])
        } else {
          query = query.eq('category_id', selectedCategory)
        }
      }

      // Mart Filter Scoping
      if (needsFiltering) {
        if (selectedMart !== 'all') {
          if (allowedMartIds.includes(selectedMart)) {
            query = query.eq('mart_id', selectedMart)
          } else {
            query = query.eq('id', '00000000-0000-0000-0000-000000000000')
          }
        } else {
          if (allowedMartIds.length > 0) {
            query = query.in('mart_id', allowedMartIds)
          } else {
            query = query.eq('id', '00000000-0000-0000-0000-000000000000')
          }
        }
      } else {
        if (selectedMart !== 'all') {
          query = query.eq('mart_id', selectedMart)
        }
      }

      // Stock Status Filter
      if (stockFilter === 'in-stock') {
        query = query.eq('is_available', true)
      } else if (stockFilter === 'out-of-stock') {
        query = query.eq('is_available', false)
      }

      // Price Range Filter
      if (priceMin !== '' && !isNaN(parseFloat(priceMin))) {
        query = query.gte('price', parseFloat(priceMin))
      }
      if (priceMax !== '' && !isNaN(parseFloat(priceMax))) {
        query = query.lte('price', parseFloat(priceMax))
      }

      // Has Image Filter
      if (hasImageFilter === 'yes') {
        query = query.not('image_url', 'is', null).not('image_url', 'eq', '')
      } else if (hasImageFilter === 'no') {
        query = query.or('image_url.is.null,image_url.eq.')
      }

      // Sorting
      const sortMap = {
        'newest':     { col: 'created_at', asc: false },
        'oldest':     { col: 'created_at', asc: true },
        'price-asc':  { col: 'price',      asc: true },
        'price-desc': { col: 'price',      asc: false },
        'name-asc':   { col: 'name',       asc: true },
      }
      const { col, asc } = sortMap[sortBy] || sortMap['newest']

      // Pagination Range
      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1

      const { data, count, error } = await query
        .order(col, { ascending: asc })
        .range(from, to)

      if (error) throw error

      setProducts(data || [])
      setTotalCount(count || 0)

      // 2. Fetch overall stats using database RPC (efficient, single HTTP call, low memory overhead)
      let statsParam = null
      if (needsFiltering) {
        statsParam = allowedMartIds
      }
      
      const { data: statsData, error: statsError } = await supabaseAdmin
        .rpc('get_admin_product_stats', { p_mart_ids: statsParam })
      
      if (statsError) {
        console.warn('Failed to load product stats via RPC:', statsError)
      }

      setStats({
        total: statsData?.total ?? count ?? 0,
        oos: statsData?.oos ?? 0,
        pending: statsData?.pending ?? 0
      })
    } catch (err) {
      console.error('Failed to load products list:', err)
      toast.error('Failed to load products list')
    } finally {
      setLoading(false)
    }
  }

  const loadData = async () => {
    setLoading(true)
    await Promise.all([loadStaticData(), fetchProducts()])
    setLoading(false)
  }

  // Initial load
  useEffect(() => {
    loadData()
  }, [])

  // Sync debounced search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      setCurrentPage(1) // Reset to page 1 on new search
    }, 450)

    return () => clearTimeout(handler)
  }, [searchQuery])

  // Reload products whenever filters or pagination parameters change
  useEffect(() => {
    // Skip if it's the absolute first load (handled by loadData)
    if (categories.length > 0) {
      fetchProducts()
    }
  }, [currentPage, debouncedSearchQuery, selectedCategory, selectedMart, stockFilter, sortBy, priceMin, priceMax, hasImageFilter, activeViewTab])

  const loadOptimizerData = async () => {
    setOptimizerData(prev => ({ ...prev, loading: true }))
    try {
      // Fetch products to analyze (up to 2000)
      const { data: allProducts, error } = await supabaseAdmin
        .from('products')
        .select('id, name, mrp, price, ozo_price, unit, image_url')
        .order('name')
        .limit(2000)

      if (error) throw error

      let configuredCount = 0
      let currentMargin = 0
      const suggestions = []

      allProducts.forEach(p => {
        const mrp = parseFloat(p.mrp || 0)
        const price = parseFloat(p.price || 0)
        const ozoPrice = p.ozo_price !== null && p.ozo_price !== undefined ? parseFloat(p.ozo_price) : null

        if (ozoPrice !== null && ozoPrice > 0) {
          configuredCount++
          currentMargin += Math.max(0, ozoPrice - price)
        }

        const isNotSet = ozoPrice === null || ozoPrice === price
        const discountVal = mrp - price
        const discountPct = mrp > 0 ? (discountVal / mrp) * 100 : 0

        // Suggestions for items where mart discount is substantial (>= 8%)
        if (isNotSet && mrp > price && discountPct >= 8) {
          // suggested margin = 40% of the customer discount, rounded to nearest 0.50
          const suggestedMargin = Math.round(discountVal * 0.4 * 2) / 2
          const suggestedOzoPrice = Math.min(mrp - 0.5, price + suggestedMargin)
          const potentialProfit = suggestedOzoPrice - price

          if (potentialProfit > 0 && suggestedOzoPrice < mrp) {
            suggestions.push({
              product: p,
              mrp,
              price,
              discountPct,
              suggestedOzoPrice,
              potentialProfit
            })
          }
        }
      })

      suggestions.sort((a, b) => b.potentialProfit - a.potentialProfit)

      setOptimizerData({
        configuredCount,
        currentMargin,
        suggestions,
        loading: false
      })
    } catch (err) {
      console.error('Error loading optimizer data:', err)
      toast.error('Failed to load optimizer data')
      setOptimizerData(prev => ({ ...prev, loading: false }))
    }
  }

  const handleApplySuggestion = async (productId, suggestedOzoPrice) => {
    try {
      const { error } = await supabaseAdmin
        .from('products')
        .update({ ozo_price: suggestedOzoPrice })
        .eq('id', productId)

      if (error) throw error

      toast.success('OZO Price optimization applied!')
      
      setOptimizerData(prev => {
        const updatedSuggestions = prev.suggestions.filter(s => s.product.id !== productId)
        const updatedConfigured = prev.configuredCount + 1
        return {
          ...prev,
          configuredCount: updatedConfigured,
          suggestions: updatedSuggestions
        }
      })

      fetchProducts()
    } catch (err) {
      console.error('Error applying suggestion:', err)
      toast.error('Failed to apply suggestion')
    }
  }

  const handleApplyAllSuggestions = async (suggestionsToApply) => {
    if (!suggestionsToApply || suggestionsToApply.length === 0) return
    const toastId = toast.loading('Applying price optimizations in bulk...')
    try {
      let successCount = 0
      const promises = suggestionsToApply.map(async (s) => {
        const { error } = await supabaseAdmin
          .from('products')
          .update({ ozo_price: s.suggestedOzoPrice })
          .eq('id', s.product.id)
        if (!error) successCount++
      })
      await Promise.all(promises)
      
      toast.success(`Successfully optimized ${successCount} product prices!`, { id: toastId })
      loadOptimizerData()
      fetchProducts()
    } catch (err) {
      console.error('Error applying bulk suggestions:', err)
      toast.error('Failed to apply some bulk suggestions', { id: toastId })
    }
  }

  useEffect(() => {
    if (showProfitPanel) {
      loadOptimizerData()
    }
  }, [showProfitPanel])

  // Restore unsaved product form draft on page mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('ozo_product_form_draft')
    if (savedDraft) {
      try {
        const { formData: draftFormData, editingProduct: draftEditingProduct } = JSON.parse(savedDraft)
        
        // Only load if the form actually has some unsaved changes (e.g. name or price is filled)
        if (draftFormData && (draftFormData.name || draftFormData.price || draftFormData.description || draftFormData.imageUrl || (draftFormData.images && draftFormData.images.length > 0))) {
          setFormData(draftFormData)
          setEditingProduct(draftEditingProduct)
          setIsDrawerOpen(true)
          toast.success('Unsaved draft restored successfully!')
        }
      } catch (err) {
        console.error('Failed to restore draft:', err)
      }
    }
  }, [])

  // Auto-save form draft to localStorage whenever it changes
  useEffect(() => {
    if (isDrawerOpen) {
      const draft = {
        formData,
        editingProduct
      }
      localStorage.setItem('ozo_product_form_draft', JSON.stringify(draft))
    }
  }, [formData, editingProduct, isDrawerOpen])

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) return toast.error('Product name is required')
    if (!formData.categoryId) return toast.error('Please select a category')
    if (!formData.price || isNaN(formData.price)) return toast.error('Please enter a valid Selling Price (Mart Price)')
    if (!formData.mrp || isNaN(formData.mrp)) return toast.error('Please enter a valid MRP')
    if (parseFloat(formData.price) > parseFloat(formData.mrp)) {
      return toast.error('Selling price cannot be greater than MRP')
    }
    if (formData.ozoPrice && !isNaN(parseFloat(formData.ozoPrice))) {
      if (parseFloat(formData.ozoPrice) > parseFloat(formData.mrp)) {
        return toast.error('OZO price cannot be greater than MRP')
      }
    }

    setSubmitting(true)
    try {
      const mainImage = (formData.images && formData.images.length > 0) ? formData.images[0] : (formData.imageUrl || '')
      let finalImageUrl = mainImage || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600'

      const productPayload = {
        name: formData.name,
        barcode: formData.barcode || null,
        brand: formData.brand || null,
        category_id: formData.categoryId,
        mart_id: formData.martId || null,
        price: parseFloat(formData.price),
        mrp: parseFloat(formData.mrp),
        ozo_price: formData.ozoPrice !== '' && !isNaN(parseFloat(formData.ozoPrice))
          ? parseFloat(formData.ozoPrice)
          : null,
        unit: formData.unit || '1 unit',
        description: formData.description || null,
        is_available: formData.isAvailable,
        is_upcoming: formData.isUpcoming,
        image_url: finalImageUrl,
        images: formData.images || []
      }

      if (editingProduct) {
        // Edit mode
        const { error } = await supabaseAdmin
          .from('products')
          .update({
            ...productPayload,
            slug: formData.slug?.trim() || editingProduct.slug
          })
          .eq('id', editingProduct.id)

        if (error) throw error
        toast.success('Product updated successfully!')

        // Trigger back-in-stock push notification if product becomes available
        const wasOOS = !editingProduct.is_available
        const isNowAvailable = formData.isAvailable
        if (wasOOS && isNowAvailable) {
          try {
            const payload = {
              tag_key: `notify_prod_${editingProduct.id}`,
              tag_value: 'true',
              title: `${formData.name} is back in stock! 🎉`,
              message: `Great news! ${formData.name} is available again. Grab it before it runs out!`,
              type: 'promo',
              data: {
                product_id: editingProduct.id,
                product_slug: formData.slug?.trim() || editingProduct.slug,
                category_slug: editingProduct.category_slug || editingProduct.category?.slug
              }
            }
            supabaseAdmin.functions.invoke('send-push-notification', {
              body: payload
            }).then(({ data, error }) => {
              if (error) console.error('[PUSH] Failed to trigger push:', error)
              else console.log('[PUSH] Triggered push successfully:', data)
            }).catch(err => console.error('[PUSH] Async trigger failed:', err))
          } catch (e) {
            console.error('[PUSH] Push error:', e)
          }
        }

        // Trigger IndexNow
        try {
          const updatedSlug = formData.slug?.trim() || editingProduct.slug
          fetch('/api/index-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productSlug: updatedSlug })
          }).catch(err => console.warn('Async IndexNow ping failed:', err))
        } catch (e) {}
      } else {
        // Add mode — use admin-entered slug or auto-generate
        const rawSlug = formData.slug.trim()
        const finalSlug = rawSlug
          ? rawSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
          : generateSlug(formData.name)
        const insertPayload = {
          ...productPayload,
          slug: finalSlug,
          quantity_available: 100
        }
        const { error } = await supabaseAdmin
          .from('products')
          .insert([insertPayload])

        if (error) throw error
        toast.success('Product added successfully!')

        // Trigger IndexNow
        try {
          fetch('/api/index-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productSlug: finalSlug })
          }).catch(err => console.warn('Async IndexNow ping failed:', err))
        } catch (e) {}
      }
      
      // Close drawer, clear draft & reset form
      setIsDrawerOpen(false)
      resetForm()
      loadData() // reload lists
    } catch (error) {
      console.error('Error saving product:', error)
      toast.error(error.message || 'Failed to save product')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleSHGVendorProducts = async () => {
    setIsUpdatingShg(true)
    const nextState = !shgEnabled
    const toastId = toast.loading(`${nextState ? 'Enabling' : 'Disabling'} Local SHG Vendor Network...`)
 
    try {
      // 1. Update app_settings (updating both shg_config and legacy bigbasket_config)
      const { error: settingsError } = await supabaseAdmin
        .from('app_settings')
        .upsert([
          {
            key: 'shg_config',
            value: { enabled: nextState },
            description: 'Toggle showing or hiding Local SHG Vendor products'
          },
          {
            key: 'bigbasket_config',
            value: { enabled: nextState },
            description: 'Toggle showing or hiding BigBasket products'
          }
        ])
 
      if (settingsError) throw settingsError
 
      // 2. Update only actual SHG/vendor tagged products
      // NOTE: Do NOT use mart_id.is.null here — that would override is_available
      // on ALL regular products that happen to have no mart_id assigned.
      // Only target products explicitly tagged as shg/vendor/bigbasket.
      const { error: productsError } = await supabaseAdmin
        .from('products')
        .update({ is_available: nextState })
        .or('tags.cs.{"shg"},tags.cs.{"shg_vendor"},tags.cs.{"vendor"},tags.cs.{"bigbasket"}')
 
      if (productsError) throw productsError
 
      setShgEnabled(nextState)
      toast.success(`SHG Vendor network products are now ${nextState ? 'visible' : 'hidden'}!`, { id: toastId })
      
      // Reload products list to reflect updated availability
      await loadData()
    } catch (err) {
      console.error('Error toggling SHG products:', err)
      toast.error('Failed to change SHG visibility: ' + err.message, { id: toastId })
    } finally {
      setIsUpdatingShg(false)
    }
  }

  const resetForm = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      brand: '',
      barcode: '',
      categoryId: '',
      martId: '',
      mrp: '',
      price: '',
      ozoPrice: '',
      unit: '1 unit',
      description: '',
      isAvailable: true,
      imageUrl: '',
      images: [],
      slug: '',
      isUpcoming: false
    })
    setDrawerTab('form')
    setSqlResult(null)
    setCustomSql('')
    localStorage.removeItem('ozo_product_form_draft')
    localStorage.removeItem('ozo_product_image_draft')
  }

  const handleEditProductClick = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      slug: product.slug || '',
      barcode: product.barcode || '',
      brand: product.brand || '',
      categoryId: product.category_id || '',
      martId: product.mart_id || '',
      mrp: product.mrp ? product.mrp.toString() : '',
      price: product.price ? product.price.toString() : '',
      ozoPrice: product.ozo_price !== null && product.ozo_price !== undefined ? product.ozo_price.toString() : '',
      unit: product.unit || '1 unit',
      description: product.description || '',
      isAvailable: product.is_available,
      imageUrl: product.image_url || '',
      images: product.images || (product.image_url ? [product.image_url] : []),
      isUpcoming: product.is_upcoming || false
    })
    setDrawerTab('form')
    setSqlResult(null)
    setIsDrawerOpen(true)
  }

  const handleCopyProductClick = (product) => {
    setEditingProduct(null)
    setFormData({
      name: `${product.name} (Copy)`,
      slug: product.slug ? `${product.slug}-copy` : '',
      barcode: '',
      brand: product.brand || '',
      categoryId: product.category_id || '',
      martId: product.mart_id || '',
      mrp: product.mrp ? product.mrp.toString() : '',
      price: product.price ? product.price.toString() : '',
      ozoPrice: product.ozo_price !== null && product.ozo_price !== undefined ? product.ozo_price.toString() : '',
      unit: product.unit || '1 unit',
      description: product.description || '',
      isAvailable: product.is_available,
      imageUrl: product.image_url || '',
      images: product.images || (product.image_url ? [product.image_url] : []),
      isUpcoming: product.is_upcoming || false
    })
    setDrawerTab('form')
    setSqlResult(null)
    setIsDrawerOpen(true)
    toast.success('Product details copied to form!')
  }

  // Handle Availability Toggle (Out of Stock Quick Action)
  const handleToggleAvailability = async (productId, currentStatus) => {
    setUpdatingProductId(productId)
    try {
      const { error } = await supabaseAdmin
        .from('products')
        .update({ is_available: !currentStatus })
        .eq('id', productId)

      if (error) throw error

      setProducts(prev =>
        prev.map(p => (p.id === productId ? { ...p, is_available: !currentStatus } : p))
      )
      toast.success(currentStatus ? 'Marked as Out of Stock' : 'Marked as Available')

      // Trigger back-in-stock push notification if product becomes available
      if (!currentStatus) {
        const targetProduct = products.find(p => p.id === productId)
        if (targetProduct) {
          try {
            const payload = {
              tag_key: `notify_prod_${productId}`,
              tag_value: 'true',
              title: `${targetProduct.name} is back in stock! 🎉`,
              message: `Great news! ${targetProduct.name} is available again. Grab it before it runs out!`,
              type: 'promo',
              data: {
                product_id: productId,
                product_slug: targetProduct.slug,
                category_slug: targetProduct.category_slug || targetProduct.category?.slug
              }
            }
            supabaseAdmin.functions.invoke('send-push-notification', {
              body: payload
            }).then(({ data, error }) => {
              if (error) console.error('[PUSH] Failed to trigger push:', error)
              else console.log('[PUSH] Triggered push successfully:', data)
            }).catch(err => console.error('[PUSH] Async trigger failed:', err))
          } catch (e) {
            console.error('[PUSH] Push error:', e)
          }
        }
      }

      // Trigger IndexNow
      const targetProduct = products.find(p => p.id === productId)
      if (targetProduct) {
        try {
          fetch('/api/index-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productSlug: targetProduct.slug })
          }).catch(err => console.warn('Async IndexNow ping failed:', err))
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error updating availability:', err)
      toast.error('Failed to update status')
    } finally {
      setUpdatingProductId(null)
    }
  }

  // Handle Price Change input state
  const handlePriceChangeLocal = (productId, val) => {
    setEditedPrices(prev => ({
      ...prev,
      [productId]: val
    }))
  }

  // Save Inline Edited Price
  const handleSavePrice = async (product) => {
    const newPriceVal = editedPrices[product.id]
    if (newPriceVal === undefined) return
    
    let newPrice = null
    if (newPriceVal !== '') {
      newPrice = parseFloat(newPriceVal)
      if (isNaN(newPrice) || newPrice <= 0) {
        toast.error('Please enter a valid price')
        return
      }
      if (newPrice > parseFloat(product.mrp)) {
        toast.error('OZO price cannot be higher than MRP')
        return
      }
    }

    setUpdatingProductId(product.id)
    try {
      const { error } = await supabaseAdmin
        .from('products')
        .update({ ozo_price: newPrice })
        .eq('id', product.id)

      if (error) throw error

      // Update local state
      setProducts(prev =>
        prev.map(p => (p.id === product.id ? { ...p, ozo_price: newPrice } : p))
      )
      
      // Clear temp price state for this product
      setEditedPrices(prev => {
        const copy = { ...prev }
        delete copy[product.id]
        return copy
      })

      toast.success('OZO Price updated successfully')

      // Trigger IndexNow
      try {
        fetch('/api/index-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productSlug: product.slug })
        }).catch(err => console.warn('Async IndexNow ping failed:', err))
      } catch (e) {}
    } catch (err) {
      console.error('Error updating price:', err)
      toast.error('Failed to save price')
    } finally {
      setUpdatingProductId(null)
    }
  }

  // Delete product (opens custom confirmation modal)
  const handleDeleteProduct = (productId) => {
    setConfirmDeleteId(productId)
  }

  // Actual logic to delete product after confirmation
  const executeDeleteProduct = async (productId) => {
    setUpdatingProductId(productId)
    try {
      const { error } = await supabaseAdmin
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error

      setProducts(prev => prev.filter(p => p.id !== productId))
      toast.success('Product deleted')
    } catch (err) {
      console.error('Error deleting product:', err)
      toast.error('Failed to delete product')
    } finally {
      setUpdatingProductId(null)
      setConfirmDeleteId(null)
    }
  }

  // Approve product details and images
  const handleApproveProduct = async (product) => {
    try {
      setUpdatingProductId(product.id)
      const { error } = await supabaseAdmin
        .from('products')
        .update({
          name: product.pending_name || product.name,
          brand: product.pending_brand || product.brand,
          images: product.pending_images || product.images,
          image_url: product.pending_images?.[0] || product.image_url,
          verification_status: 'approved',
          pending_name: null,
          pending_brand: null,
          pending_images: null,
          enriched_by_mart_id: null
        })
        .eq('id', product.id)

      if (error) throw error
      toast.success('Changes approved successfully!')
      fetchProducts()
    } catch (err) {
      console.error('Approve failed:', err)
      toast.error('Approve failed: ' + err.message)
    } finally {
      setUpdatingProductId(null)
    }
  }

  // Reject proposed details and images (opens custom confirmation modal)
  const handleRejectProduct = (product) => {
    setConfirmRejectProduct(product)
  }

  // Actual logic to reject proposed details after confirmation
  const executeRejectProduct = async (product) => {
    try {
      setUpdatingProductId(product.id)
      const { error } = await supabaseAdmin
        .from('products')
        .update({
          verification_status: 'rejected',
          pending_name: null,
          pending_brand: null,
          pending_images: null,
          enriched_by_mart_id: null
        })
        .eq('id', product.id)

      if (error) throw error
      toast.success('Changes rejected and cleared!')
      fetchProducts()
    } catch (err) {
      console.error('Reject failed:', err)
      toast.error('Reject failed: ' + err.message)
    } finally {
      setUpdatingProductId(null)
      setConfirmRejectProduct(null)
    }
  }

  // Filter and Search logic (now handled on the server side)
  const filteredProducts = products

  // Group categories into parent -> children relationship
  const getGroupedCategories = () => {
    const parentIds = new Set(categories.map(c => c.id));
    const parents = categories.filter(c => !c.parent_id || !parentIds.has(c.parent_id));
    const subCategories = categories.filter(c => c.parent_id && parentIds.has(c.parent_id));
    
    // Sort parents by name
    parents.sort((a, b) => a.name.localeCompare(b.name));
    
    // Map each parent to its children
    return parents.map(parent => {
      const children = subCategories
        .filter(sub => sub.parent_id === parent.id)
        .sort((a, b) => a.name.localeCompare(b.name));
      return {
        ...parent,
        children
      };
    });
  }

  // Quick statistics
  const totalProductsCount = stats.total
  const outOfStockCount = stats.oos
  const inStockCount = Math.max(0, totalProductsCount - outOfStockCount)
  const uniqueMartsCount = marts.length

  const [showBulkPanel, setShowBulkPanel] = useState(false)

  return (
    <div className="space-y-6">


      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium">
        <div>
          <h1 className="text-3xl font-black text-gradient">Product Management</h1>
          <p className="text-sm text-ozo-gray mt-1">Dukan ka maal add, edit, aur stock control krein.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBulkPanel(p => !p)}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition-all border ${
              showBulkPanel
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 shadow-sm'
                : 'border-rose-300 dark:border-rose-900/40 text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/15'
            }`}
          >
            <Zap className="w-4 h-4" />
            Bulk Control
          </button>
        <button
          onClick={() => {
            resetForm()
            setIsDrawerOpen(true)
          }}
          className="flex items-center justify-center gap-2 bg-gradient-ozo text-white px-5 py-3 rounded-2xl font-bold shadow-ozo hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Add New Product
        </button>
        </div>
      </div>

      {/* ── Bulk Operations Panel ───────────────────────────────────── */}
      <BulkControlPanel
        showBulkPanel={showBulkPanel}
        setShowBulkPanel={setShowBulkPanel}
        selectedCategory={selectedCategory}
        selectedMart={selectedMart}
        setSelectedCategory={setSelectedCategory}
        setSelectedMart={setSelectedMart}
        supabaseAdmin={supabaseAdmin}
        loadData={loadData}
        marts={marts}
      />


      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div 
          onClick={() => setActiveViewTab('all')}
          className={`p-5 rounded-2xl border transition-all shadow-sm cursor-pointer hover:scale-[1.01] ${
            activeViewTab === 'all' 
              ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-500/35 ring-1 ring-purple-500/20' 
              : 'bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-white/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Total Items</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-gray-900 dark:text-white">{totalProductsCount}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">In Stock</span>
            <div className="p-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-green-600">{inStockCount}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Out of Stock</span>
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-red-600">{outOfStockCount}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Active Marts</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-blue-600">{uniqueMartsCount}</p>
        </div>

        <div 
          onClick={() => setActiveViewTab(activeViewTab === 'verification' ? 'all' : 'verification')}
          className={`p-5 rounded-2xl border transition-all shadow-sm cursor-pointer hover:scale-[1.01] ${
            activeViewTab === 'verification' 
              ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-500/35 ring-1 ring-amber-500/20' 
              : 'bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-white/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Verification Queue</span>
            <div className={`p-2 rounded-xl text-amber-600 ${stats.pending > 0 ? 'bg-amber-100 dark:bg-amber-900/40 animate-pulse' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-2xl font-black text-amber-600">{stats.pending || 0}</p>
            {stats.pending > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-bounce">
                NEW
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filters and List Controls */}
      <div className="flex flex-col gap-3 p-4 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
        {/* Row 1: Search + primary controls */}
        <div className="flex flex-col lg:flex-row gap-3 items-center">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, brand, barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ozo-red"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            {/* Category Filter */}
            <div className="relative flex-1 lg:flex-none">
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                className="w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:border-ozo-red focus:ring-2 focus:ring-ozo-red/20 cursor-pointer appearance-none transition-all shadow-sm hover:border-gray-300 dark:hover:border-white/20"
              >
                <option value="all" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">All Categories</option>
                {getGroupedCategories().map((group) => (
                  <optgroup key={group.id} label={group.name} className="bg-white dark:bg-[#1c1c24] font-bold text-gray-900 dark:text-white">
                    <option value={group.id} className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">{group.name} (All)</option>
                    {group.children.map((child) => (
                      <option key={child.id} value={child.id} className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">
                        {child.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
                {categories.length === 0 && FALLBACK_CATEGORIES.map((cat) => (<option key={cat.slug} value={cat.slug} className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">{cat.name}</option>))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Mart Filter */}
            <div className="relative flex-1 lg:flex-none">
              <select
                value={selectedMart}
                onChange={(e) => { setSelectedMart(e.target.value); setCurrentPage(1); }}
                className="w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:border-ozo-red focus:ring-2 focus:ring-ozo-red/20 cursor-pointer appearance-none transition-all shadow-sm hover:border-gray-300 dark:hover:border-white/20"
              >
                <option value="all" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">All Marts (Dukan)</option>
                {marts.map((m) => (<option key={m.id} value={m.id} className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">{m.name}</option>))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                showAdvancedFilters || stockFilter !== 'all' || priceMin || priceMax || hasImageFilter !== 'all'
                  ? 'border-ozo-red bg-ozo-red/10 text-ozo-red'
                  : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {(stockFilter !== 'all' || priceMin || priceMax || hasImageFilter !== 'all') && (
                <span className="w-4 h-4 rounded-full bg-ozo-red text-white text-[9px] flex items-center justify-center font-black">
                  {[stockFilter !== 'all', !!priceMin, !!priceMax, hasImageFilter !== 'all'].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Refresh Action */}
            <button
              onClick={loadData}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
              title="Refresh database records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Row 2: Advanced Filters (collapsible) */}
        {showAdvancedFilters && (
          <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100 dark:border-white/5">
            {/* Stock Status */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stock Status</label>
              <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
                {[['all','All'],['in-stock','In Stock'],['out-of-stock','Out of Stock']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => { setStockFilter(val); setCurrentPage(1); }}
                    className={`px-3 py-2 text-xs font-bold transition-all ${
                      stockFilter === val
                        ? val === 'out-of-stock' ? 'bg-red-500 text-white' : val === 'in-stock' ? 'bg-green-500 text-white' : 'bg-ozo-red text-white'
                        : 'bg-white dark:bg-[#1c1c24] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort By */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sort By</label>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-3.5 pr-9 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:border-ozo-red focus:ring-2 focus:ring-ozo-red/20 cursor-pointer appearance-none transition-all hover:border-gray-300 dark:hover:border-white/20"
                >
                  <option value="newest" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Newest First</option>
                  <option value="oldest" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Oldest First</option>
                  <option value="price-asc" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Price: Low → High</option>
                  <option value="price-desc" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Price: High → Low</option>
                  <option value="name-asc" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Name: A → Z</option>
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Price Range */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Price Range (₹)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(e) => { setPriceMin(e.target.value); setCurrentPage(1); }}
                  className="w-20 px-2.5 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-ozo-red"
                />
                <span className="text-gray-400 text-xs">–</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(e) => { setPriceMax(e.target.value); setCurrentPage(1); }}
                  className="w-20 px-2.5 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-ozo-red"
                />
              </div>
            </div>

            {/* Has Image */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Product Image</label>
              <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
                {[['all','All'],['yes','Has Image'],['no','No Image']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => { setHasImageFilter(val); setCurrentPage(1); }}
                    className={`px-3 py-2 text-xs font-bold transition-all ${
                      hasImageFilter === val
                        ? 'bg-ozo-red text-white'
                        : 'bg-white dark:bg-[#1c1c24] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear All */}
            {(stockFilter !== 'all' || priceMin || priceMax || hasImageFilter !== 'all' || sortBy !== 'newest') && (
              <div className="flex flex-col justify-end">
                <button
                  onClick={() => { setStockFilter('all'); setPriceMin(''); setPriceMax(''); setHasImageFilter('all'); setSortBy('newest'); setCurrentPage(1); }}
                  className="px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-900/30 transition-all flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear All
                </button>
              </div>
            )}
          </div>
        )}

        {/* Active filter chips */}
        {(stockFilter !== 'all' || priceMin || priceMax || hasImageFilter !== 'all') && (
          <div className="flex flex-wrap gap-2">
            {stockFilter !== 'all' && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                stockFilter === 'in-stock' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}>
                {stockFilter === 'in-stock' ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
                <span>{stockFilter === 'in-stock' ? 'In Stock' : 'Out of Stock'}</span>
                <button onClick={() => setStockFilter('all')} className="ml-0.5 hover:opacity-80"><X className="w-3 h-3" /></button>
              </span>
            )}
            {(priceMin || priceMax) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                <DollarSign className="w-3 h-3 shrink-0" />
                <span>₹{priceMin || '0'} – ₹{priceMax || '∞'}</span>
                <button onClick={() => { setPriceMin(''); setPriceMax(''); }} className="ml-0.5 hover:opacity-80"><X className="w-3 h-3" /></button>
              </span>
            )}
            {hasImageFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                <ImageIcon className="w-3 h-3 shrink-0" />
                <span>{hasImageFilter === 'yes' ? 'Has Image' : 'No Image'}</span>
                <button onClick={() => setHasImageFilter('all')} className="ml-0.5 hover:opacity-80"><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main List Table */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-ozo-red" />
            <p className="text-sm font-semibold text-gray-500">Marts aur products load ho rahe hain...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center text-gray-400 dark:text-white/20 mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Koi products nahi mile</h3>
            <p className="text-sm text-gray-500 max-w-sm mt-1">Filters change karein ya fir naya product add karein.</p>
          </div>
        ) : (
          <div className="overflow-x-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                  {activeViewTab === 'verification' ? (
                    <>
                      <th className="px-2 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-[200px]">Product Info</th>
                      <th className="px-2 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-[160px]">Proposed Changes</th>
                      <th className="px-2 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-[180px] whitespace-nowrap">Captured Images</th>
                      <th className="px-2 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-[120px] whitespace-nowrap">Enriched By</th>
                      <th className="px-2 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right min-w-[100px] whitespace-nowrap">Review Action</th>
                    </>
                  ) : (
                    <>
                      <th className="px-2 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-[200px]">Product Info</th>
                      <th className="px-2 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-[100px] whitespace-nowrap">Category</th>
                      <th className="px-2 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-[110px] whitespace-nowrap">Mart / Dukan</th>
                      <th className="px-2 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-[70px] whitespace-nowrap">MRP</th>
                      <th className="px-2 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider min-w-[80px] whitespace-nowrap">Selling Price</th>
                      <th className="px-2 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-[150px] min-w-[150px] whitespace-nowrap">OZO Price</th>
                      <th className="px-2 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center min-w-[100px] whitespace-nowrap">Stock Status</th>
                      <th className="px-2 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right min-w-[90px] whitespace-nowrap">Action</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredProducts.map((product) => {
                  if (activeViewTab === 'verification') {
                    const hasNameChanged = product.name !== product.pending_name
                    const hasBrandChanged = product.brand !== product.pending_brand
                    const imagesList = product.pending_images || []

                    return (
                      <tr key={product.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                        {/* Product Info (Current) */}
                        <td className="px-2 py-1.5 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/5 overflow-hidden flex items-center justify-center border border-gray-200/50 dark:border-white/10 shrink-0">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-gray-905 dark:text-white text-xs truncate" title={product.name}>{product.name || 'Untitled Product'}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5 truncate">{product.brand || 'No Brand'} • {product.barcode}</div>
                            </div>
                          </div>
                        </td>

                        {/* Proposed changes comparison */}
                        <td className="px-2 py-1.5 min-w-[160px]">
                          <div className="space-y-0.5">
                            <div>
                              <span className="text-[9px] uppercase font-bold text-gray-400">Name:</span>
                              <div className={`text-xs font-bold ${hasNameChanged ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded-md w-fit' : 'text-gray-650 dark:text-gray-450 truncate max-w-[150px]'}`} title={product.pending_name}>
                                {product.pending_name || 'No Name'}
                              </div>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-bold text-gray-400">Brand:</span>
                              <div className={`text-[10px] ${hasBrandChanged ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded-md w-fit' : 'text-gray-650 dark:text-gray-450 truncate max-w-[150px]'}`} title={product.pending_brand}>
                                {product.pending_brand || 'No Brand'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Images preview (Front, Back, Barcode) */}
                        <td className="px-2 py-1.5 min-w-[180px] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {imagesList.map((url, idx) => {
                              const labels = ['Front', 'Back', 'Barcode']
                              return (
                                <div key={idx} className="relative group cursor-zoom-in">
                                  <img
                                    src={url}
                                    alt={`Pending ${labels[idx]}`}
                                    className="w-9 h-9 object-cover rounded-lg border border-gray-200 dark:border-white/10 transition-transform group-hover:scale-105"
                                    onClick={() => window.open(url, '_blank')}
                                  />
                                  <span className="absolute bottom-0 left-0 right-0 text-[7px] font-black text-center text-white bg-black/60 py-0.2 rounded-b-lg">
                                    {labels[idx] || `Photo ${idx + 1}`}
                                  </span>
                                </div>
                              )
                            })}
                            {imagesList.length === 0 && (
                              <span className="text-[10px] text-gray-400 italic">No images uploaded</span>
                            )}
                          </div>
                        </td>

                        {/* Originating Mart info */}
                        <td className="px-2 py-1.5 min-w-[120px] whitespace-nowrap">
                          <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                            <Store className="w-3.5 h-3.5 text-gray-400" />
                            <div>
                              <div className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[100px]">{product.enriched_mart?.name || product.mart?.name || 'Unknown Mart'}</div>
                              <div className="text-[9px] text-gray-400 uppercase">Mart Enriched</div>
                            </div>
                          </div>
                        </td>

                        {/* Review Actions */}
                        <td className="px-2 py-1.5 text-right min-w-[100px] whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleRejectProduct(product)}
                              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors border border-red-200 dark:border-red-900/40"
                              title="Reject Changes"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleApproveProduct(product)}
                              className="flex items-center gap-0.5 px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-md active:scale-95 animate-pulse"
                              title="Approve Changes"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  const tempPrice = editedPrices[product.id]
                  const currentOzoPriceStr = product.ozo_price !== null && product.ozo_price !== undefined ? product.ozo_price.toString() : ''
                  const hasPriceChanged = tempPrice !== undefined && tempPrice !== currentOzoPriceStr
                  const isUpdating = updatingProductId === product.id

                  const mrpVal = parseFloat(product.mrp || 0)
                  const priceVal = parseFloat(product.price || 0)
                  const discountVal = mrpVal - priceVal
                  const suggestedOzoPrice = mrpVal > priceVal
                    ? Math.min(mrpVal - 0.5, priceVal + (Math.round(discountVal * 0.4 * 2) / 2))
                    : priceVal

                  return (
                    <tr key={product.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                      {/* Details */}
                      <td className="px-2 py-1.5 min-w-[200px] max-w-[250px]">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/5 overflow-hidden flex items-center justify-center border border-gray-200/50 dark:border-white/10 text-lg shrink-0 transition-transform duration-200 hover:scale-105 active:scale-95 cursor-zoom-in relative"
                            onMouseEnter={(e) => {
                              if (product.image_url) {
                                const rect = e.currentTarget.getBoundingClientRect()
                                setHoveredImage({ url: product.image_url, name: product.name, rect })
                              }
                            }}
                            onMouseLeave={() => setHoveredImage(null)}
                          >
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.onerror = null
                                  e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'
                                }}
                              />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-xs text-gray-800 dark:text-white leading-tight line-clamp-2" title={product.name}>{product.name}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {product.brand && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(product.brand)
                                    toast.success(`Brand "${product.brand}" copied!`)
                                  }}
                                  className="text-[9px] px-1 py-0.2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 active:scale-95 rounded text-gray-500 hover:text-ozo-red dark:text-gray-400 dark:hover:text-ozo-red font-medium uppercase transition-all flex items-center gap-0.5 cursor-pointer truncate max-w-[80px]"
                                  title="Copy brand name to clipboard"
                                >
                                  {product.brand}
                                  <Copy className="w-2 h-2 opacity-60" />
                                </button>
                              )}
                              <span className="text-[10px] text-gray-400 whitespace-nowrap">{product.unit}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap min-w-[100px]">
                        {product.category?.name || 'Unassigned'}
                      </td>

                      {/* Mart */}
                      <td className="px-2 py-1.5 whitespace-nowrap min-w-[110px]">
                        {product.mart ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                            🏪 {product.mart.name}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">No Mart</span>
                        )}
                      </td>

                      {/* MRP */}
                      <td className="px-2 py-1.5 text-xs text-gray-500 font-medium whitespace-nowrap min-w-[70px]">
                        ₹{parseFloat(product.mrp || 0).toFixed(2)}
                      </td>

                      {/* Selling Price */}
                      <td className="px-2 py-1.5 text-xs text-gray-500 font-medium whitespace-nowrap min-w-[80px]">
                        ₹{parseFloat(product.price || 0).toFixed(2)}
                      </td>

                      {/* OZO Price (Inline Edit) */}
                      <td className="px-2 py-1.5 w-[150px] min-w-[150px] relative">
                        <div className="flex items-center gap-1">
                          <div className="relative">
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder={product.price ? parseFloat(product.price).toFixed(2) : 'Optional'}
                              value={tempPrice !== undefined ? tempPrice : (product.ozo_price !== null && product.ozo_price !== undefined ? product.ozo_price : '')}
                              onChange={(e) => handlePriceChangeLocal(product.id, e.target.value)}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleSavePrice(product)
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault()
                                    setEditedPrices(prev => {
                                      const copy = { ...prev }
                                      delete copy[product.id]
                                      return copy
                                    })
                                  }
                              }}
                              disabled={isUpdating}
                              className={`w-18 pl-4 pr-0.5 py-1 text-xs font-bold border rounded-lg bg-transparent focus:outline-none focus:ring-1 focus:ring-ozo-red ${
                                hasPriceChanged
                                  ? 'border-yellow-500 text-yellow-600 bg-yellow-50/10'
                                  : 'border-gray-200 dark:border-white/10 text-gray-800 dark:text-white'
                              }`}
                            />
                          </div>

                          <div className={`flex items-center gap-0.5 flex-shrink-0 transition-all duration-200 ${
                            hasPriceChanged
                              ? 'opacity-100 pointer-events-auto translate-x-0'
                              : 'opacity-0 pointer-events-none translate-x-1'
                          }`}>
                            <button
                              onClick={() => handleSavePrice(product)}
                              disabled={isUpdating || !hasPriceChanged}
                              className="w-6 h-6 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex-shrink-0"
                              title="Price update save krein"
                            >
                              {isUpdating ? (
                                <Loader2 className="w-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setEditedPrices(prev => {
                                  const copy = { ...prev }
                                  delete copy[product.id]
                                  return copy
                                })
                              }}
                              disabled={isUpdating || !hasPriceChanged}
                              className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 rounded-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex-shrink-0"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {suggestedOzoPrice > priceVal && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {/* Option 1: Apply (Fill Input) */}
                            <button
                              type="button"
                              onClick={() => {
                                handlePriceChangeLocal(product.id, suggestedOzoPrice.toFixed(2))
                              }}
                              className="text-[9px] text-gray-550 dark:text-gray-400 font-semibold flex items-center gap-0.5 hover:text-amber-600 dark:hover:text-amber-300 transition-colors cursor-pointer bg-transparent border-none p-0 flex-shrink-0"
                              title="Click to apply suggested price"
                            >
                              <span className="inline-flex items-center justify-center w-2.5 h-2.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-500 text-[7px] font-black">💡</span>
                              <span>Sug: <strong className="text-amber-500 hover:underline">₹{suggestedOzoPrice.toFixed(2)}</strong></span>
                            </button>

                            {/* Option 2: Breakdown Information */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTooltipId(prev => prev === product.id ? null : product.id)
                              }}
                              className={`transition-colors p-0.5 rounded cursor-pointer flex items-center justify-center flex-shrink-0 ${
                                activeTooltipId === product.id 
                                  ? 'text-amber-500 dark:text-amber-400' 
                                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                              }`}
                              title="View formula breakdown"
                            >
                              <HelpCircle className="w-3 h-3" />
                            </button>

                            {/* Local Breakdown Tooltip Card */}
                            {activeTooltipId === product.id && (
                              <div className="absolute bottom-full right-2 mb-2 w-56 bg-white dark:bg-[#12121a] border border-gray-250 dark:border-white/15 rounded-xl shadow-xl p-2.5 z-50 text-left animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/10 pb-1.5 mb-1.5">
                                  <span className="font-bold text-[10px] text-gray-800 dark:text-gray-200 flex items-center gap-0.5">
                                    📊 Price Breakdown
                                  </span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setActiveTooltipId(null)
                                    }} 
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <div className="space-y-1 text-[10px] text-gray-650 dark:text-gray-450">
                                  <div className="flex justify-between">
                                    <span>MRP:</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">₹{mrpVal.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Selling Price (Mart):</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">₹{priceVal.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Available Discount:</span>
                                    <span className="font-semibold text-amber-605 dark:text-amber-500">₹{discountVal.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>OZO Margin (40%):</span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-500">+₹{((Math.round(discountVal * 0.4 * 2) / 2)).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between border-t border-gray-100 dark:border-white/10 pt-1.5 mt-1.5 font-bold text-gray-900 dark:text-white">
                                    <span>Suggested Price:</span>
                                    <span className="text-ozo-red">₹{suggestedOzoPrice.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                        {/* Stock Status Toggle */}
                        <td className="px-2 py-1.5 text-center whitespace-nowrap min-w-[100px]">
                          <button
                            onClick={() => handleToggleAvailability(product.id, product.is_available)}
                            disabled={isUpdating}
                            className="mx-auto flex items-center justify-center focus:outline-none"
                            title="Stock availability change krein"
                          >
                            <div className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 ${
                              product.is_available 
                                ? 'bg-gradient-green shadow-sm' 
                                : 'bg-gray-300 dark:bg-white/10'
                            }`}>
                              <div 
                                className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform duration-300 ${
                                  product.is_available ? 'translate-x-4.5' : 'translate-x-0'
                                }`}
                              />
                            </div>
                            <span className={`text-[9px] font-bold uppercase ml-1.5 w-12 text-left ${
                              product.is_available 
                                ? 'text-green-500' 
                                : 'text-red-500'
                            }`}>
                              {product.is_available ? 'In' : 'Out'}
                            </span>
                            {product.is_upcoming && (
                              <span className="text-[8px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 py-0.2 rounded ml-1 uppercase whitespace-nowrap">
                                Upc
                              </span>
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-2 py-1.5 text-right whitespace-nowrap min-w-[90px]">
                          <div className="flex justify-end items-center gap-1">
                            <a
                              href={`/product/${product.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-650 hover:text-gray-955 dark:text-gray-300 dark:hover:text-white rounded-lg transition-all flex items-center justify-center flex-shrink-0"
                              title="View product page"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => handleEditProductClick(product)}
                              disabled={isUpdating}
                              className="w-7 h-7 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-305 rounded-lg transition-all flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                              title="Edit details"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              disabled={isUpdating}
                              className="w-7 h-7 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-lg transition-all flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        {!loading && totalCount > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing <span className="font-bold text-gray-800 dark:text-gray-200">{Math.min(totalCount, (currentPage - 1) * pageSize + 1)}</span> to{' '}
              <span className="font-bold text-gray-800 dark:text-gray-200">{Math.min(totalCount, currentPage * pageSize)}</span> of{' '}
              <span className="font-bold text-gray-800 dark:text-gray-200">{totalCount}</span> products
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Page {currentPage} of {Math.ceil(totalCount / pageSize)}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / pageSize), prev + 1))}
                disabled={currentPage === Math.ceil(totalCount / pageSize) || loading}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add New Product - Sliding Drawer/Modal Panel */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && !isUploadingImage && setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black z-50"
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
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {editingProduct 
                      ? `Edit details for ${editingProduct.name}`
                      : 'Admin panel me naya item register krein.'}
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
                {editingProduct && (
                  <button
                    type="button"
                    onClick={() => setDrawerTab('inventory')}
                    className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                      drawerTab === 'inventory'
                        ? 'border-ozo-red text-ozo-red'
                        : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    City & Inventory
                  </button>
                )}
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
                {/* Product Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ashirvaad Aata 5kg, Coca Cola 750ml"
                    value={formData.name}
                    onChange={(e) => {
                      const newName = e.target.value
                      setFormData(prev => ({
                        ...prev,
                        name: newName,
                        // Auto-populate slug only if user hasn't manually changed it
                        slug: prev.slug === '' || prev.slug === slugifyForTyping(prev.name)
                          ? slugifyForTyping(newName)
                          : prev.slug
                      }))
                    }}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm"
                  />
                </div>

                {/* SEO Slug */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    SEO Slug
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    URL-safe unique identifier for this product. Auto-filled from name, but you can edit it for better SEO.
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs select-none">/p/</span>
                    <input
                      type="text"
                      placeholder="e.g. ashirvaad-aata-5kg"
                      value={formData.slug}
                      onChange={(e) => {
                        // Replace spaces and underscores with hyphens, and keep only safe characters
                        const safe = e.target.value
                          .toLowerCase()
                          .replace(/[\s_]+/g, '-')
                          .replace(/[^a-z0-9-]/g, '')
                          .replace(/-+/g, '-')
                        setFormData(prev => ({ ...prev, slug: safe }))
                      }}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-mono"
                    />
                  </div>
                  {formData.slug && (
                    <p className="text-xs text-green-500 mt-1 font-mono truncate">
                      /p/{formData.slug}
                    </p>
                  )}
                </div>

                {/* Barcode */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Product Barcode
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 8901030752764"
                    value={formData.barcode || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm font-mono"
                  />
                </div>

                {/* Grid for Brand & Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Brand Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ashirvaad, Amul"
                      value={formData.brand}
                      onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Unit Size <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 5 kg, 500 ml, 1 pack"
                      value={formData.unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm"
                    />
                  </div>
                </div>

                {/* Grid for Category & Mart */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.categoryId}
                      onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                      className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm text-gray-750 dark:text-gray-300 focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_14px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] dark:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
                    >
                      <option value="" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Select Category</option>
                      {getGroupedCategories().map((group) => (
                        <optgroup key={group.id} label={group.name} className="bg-white dark:bg-[#1c1c24] text-gray-700 dark:text-gray-400 font-bold">
                          <option value={group.id} className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">{group.name} (Main)</option>
                          {group.children.map((child) => (
                            <option key={child.id} value={child.id} className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">
                              {child.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                      {categories.length === 0 && FALLBACK_CATEGORIES.map((cat) => (
                        <option key={cat.slug} value={cat.slug} className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Select Mart / Dukan
                    </label>
                    <select
                      value={formData.martId}
                      onChange={(e) => setFormData(prev => ({ ...prev, martId: e.target.value }))}
                      className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm text-gray-750 dark:text-gray-300 focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_14px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] dark:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
                    >
                      <option value="" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Select Mart (Optional)</option>
                      {marts.map((m) => (
                        <option key={m.id} value={m.id} className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Grid for MRP, Selling Price, and OZO Price */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                      MRP (₹) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={formData.mrp}
                        onChange={(e) => setFormData(prev => ({ ...prev, mrp: e.target.value }))}
                        className="w-full pl-6 pr-2 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2" title="Mart Selling Price">
                      Selling Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        className="w-full pl-6 pr-2 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2" title="User facing Price (Leave blank to use Selling Price)">
                      OZO Price (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Optional"
                        value={formData.ozoPrice}
                        onChange={(e) => setFormData(prev => ({ ...prev, ozoPrice: e.target.value }))}
                        className="w-full pl-6 pr-2 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-ozo-red text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Product Description */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe the product (weight, flavor, usage, pack contents)..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows="3"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-ozo-red text-sm"
                  />
                </div>

                {/* Product Images Upload */}
                <ImageUpload
                  value={formData.images}
                  onChange={(urls) => setFormData(prev => ({ ...prev, images: urls, imageUrl: urls[0] || '' }))}
                  multiple={true}
                  limit={5}
                  customNamePrefix={formData.name || 'product'}
                  label="Product Images"
                  disabled={submitting}
                  onUploadingStateChange={setIsUploadingImage}
                />

                {/* Stock Status Checkbox */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isAvailable: !prev.isAvailable }))}
                    className="focus:outline-none flex items-center"
                  >
                    <div className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                      formData.isAvailable 
                        ? 'bg-gradient-green justify-end shadow-sm' 
                        : 'bg-gray-300 dark:bg-white/10 justify-start'
                    }`}>
                      <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                    </div>
                  </button>
                  <div>
                    <h5 className="text-sm font-bold text-gray-800 dark:text-white">Active & In Stock</h5>
                    <p className="text-xs text-gray-400 mt-0.5">Naya product pehle din se hi app me purchase ke liye list rhega.</p>
                  </div>
                </div>

                {/* Listing Soon Toggle */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 mt-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isUpcoming: !prev.isUpcoming }))}
                    className="focus:outline-none flex items-center"
                  >
                    <div className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                      formData.isUpcoming 
                        ? 'bg-gradient-green justify-end shadow-sm' 
                        : 'bg-gray-300 dark:bg-white/10 justify-start'
                    }`}>
                      <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                    </div>
                  </button>
                  <div>
                    <h5 className="text-sm font-bold text-gray-800 dark:text-white">Listing Soon / Upcoming (Launch Mode)</h5>
                    <p className="text-xs text-gray-400 mt-0.5">Stock na hone par app me "Listing Soon" badge aur notify button dikhega. Off hone par default "Out of Stock" dikhega.</p>
                  </div>
                </div>
              </form>

              {/* Drawer Footer Actions */}
              <div className="p-6 border-t border-gray-100 dark:border-white/5 flex gap-3 bg-gray-50/50 dark:bg-white/[0.02]">
                <button
                  type="button"
                  disabled={submitting || isUploadingImage}
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1 px-4 py-3 bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || isUploadingImage}
                  onClick={handleSubmit}
                  className="flex-2 flex-1 px-4 py-3 bg-gradient-ozo text-white rounded-xl font-bold shadow-ozo hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {editingProduct ? 'Saving Changes...' : 'Saving Product...'}
                    </>
                  ) : (
                    editingProduct ? 'Update Product' : 'Save Product'
                  )}
                </button>
              </div>
            </>
          ) : drawerTab === 'inventory' ? (
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 dark:bg-black/10">
              <ProductCityManager 
                productId={editingProduct?.id} 
                productName={editingProduct?.name} 
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                      : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-905/20 text-red-600 dark:text-red-400'
                  }`}>
                    <p className="font-bold mb-1">{sqlResult.success ? 'Success!' : 'Postgres Error:'}</p>
                    <p className="whitespace-pre-wrap">{sqlResult.message || sqlResult.error}</p>
                    {sqlResult.rowsAffected !== undefined && (
                      <p className="mt-1 opacity-80">Rows affected: {sqlResult.rowsAffected}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-white/5 flex gap-3 bg-gray-50/50 dark:bg-white/[0.01]">
                <button
                  type="button"
                  onClick={() => setCustomSql(generateProductSql())}
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {hoveredImage && (
        <div 
          className="fixed z-[9999] pointer-events-none p-1.5 bg-white dark:bg-[#13131c] border-2 border-amber-500/40 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)]"
          style={{
            top: `${Math.max(10, Math.min(window.innerHeight - 420, hoveredImage.rect.top + (hoveredImage.rect.height / 2) - 200))}px`,
            left: `${hoveredImage.rect.right + 16 + 400 > window.innerWidth 
              ? hoveredImage.rect.left - 400 - 16 
              : hoveredImage.rect.right + 16}px`,
            width: '400px',
            height: '400px',
          }}
        >
          <img 
            src={hoveredImage.url} 
            alt={hoveredImage.name} 
            className="w-full h-full object-contain rounded-xl bg-gray-50 dark:bg-[#0c0c14]"
          />
        </div>
      )}

      {/* Delete Product Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => executeDeleteProduct(confirmDeleteId)}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone and will permanently remove this product from all mart inventories."
        confirmText="Delete Product"
        cancelText="Cancel"
        isDanger={true}
        isLoading={updatingProductId === confirmDeleteId}
      />

      {/* Reject Changes Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmRejectProduct !== null}
        onClose={() => setConfirmRejectProduct(null)}
        onConfirm={() => executeRejectProduct(confirmRejectProduct)}
        title="Reject Proposed Changes"
        message={`Are you sure you want to REJECT the new proposed details and photos for "${confirmRejectProduct?.name || 'this product'}"?`}
        confirmText="Reject Changes"
        cancelText="Cancel"
        isDanger={true}
        isLoading={updatingProductId === confirmRejectProduct?.id}
      />
    </div>
  )
}

export default Products
