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
  MapPin,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Globe,
  Settings,
  Compass,
  Link as LinkIcon,
  Tag,
  Package,
  RotateCcw,
  AlertCircle
} from 'lucide-react'
import { supabaseAdmin as supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

// Helper to generate URL-friendly slug while typing
const slugifyForTyping = (text) => {
  return text
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
}

const Cities = () => {
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingCity, setEditingCity] = useState(null)

  // Filters & Search for Cities
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'active', 'inactive'
  const [sortBy, setSortBy] = useState('name') // 'name', 'created_at'
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Form State for City
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    state: '',
    latitude: '',
    longitude: '',
    serviceRadiusKm: 15,
    seoTitle: '',
    seoDescription: '',
    seoKeywordsStr: '',
    isActive: true,
    allowedPincodesStr: ''
  })

  // Action Pending states for inline operations
  const [pendingActions, setPendingActions] = useState({})

  // Visibility Manager State
  const [selectedCityForVisibility, setSelectedCityForVisibility] = useState('')
  const [visibilityTab, setVisibilityTab] = useState('products') // 'products', 'brands'
  
  // Products Tab State
  const [prodSearch, setProdSearch] = useState('')
  const [prodCategory, setProdCategory] = useState('all')
  const [prodPage, setProdPage] = useState(1)
  const [prodTotalCount, setProdTotalCount] = useState(0)
  const [visProducts, setVisProducts] = useState([])
  const [visCategories, setVisCategories] = useState([])
  const [visPcaMap, setVisPcaMap] = useState({}) // product_id -> pca row
  const [loadingVisProducts, setLoadingVisProducts] = useState(false)
  const [savingProductId, setSavingProductId] = useState(null)
  const [localOverrides, setLocalOverrides] = useState({}) // product_id -> { is_available, is_featured, city_price, city_mrp }

  // Brands Tab State
  const [brandSearch, setBrandSearch] = useState('')
  const [visBrands, setVisBrands] = useState([])
  const [visBcaMap, setVisBcaMap] = useState({}) // brand name -> bca row
  const [loadingVisBrands, setLoadingVisBrands] = useState(false)
  const [savingBrandName, setSavingBrandName] = useState(null)

  // Fetch all cities
  const fetchCities = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('operating_cities')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setCities(data || [])
    } catch (error) {
      console.error('Error fetching cities:', error)
      toast.error('Failed to load cities!')
    } finally {
      setLoading(false)
    }
  }

  const fetchVisCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      if (!error && data) setVisCategories(data)
    } catch (e) {
      console.error('Error fetching categories:', e)
    }
  }

  const fetchVisBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('distinct_brands')
        .select('brand')
      if (!error && data) setVisBrands(data.map(b => b.brand))
    } catch (e) {
      console.error('Error fetching distinct brands:', e)
    }
  }

  useEffect(() => {
    fetchCities()
    fetchVisCategories()
    fetchVisBrands()
  }, [])

  useEffect(() => {
    if (cities.length > 0 && !selectedCityForVisibility) {
      setSelectedCityForVisibility(cities[0].slug)
    }
  }, [cities])

  // Fetch Visibility Products
  const fetchVisibilityProducts = async () => {
    if (!selectedCityForVisibility) return
    setLoadingVisProducts(true)
    try {
      let query = supabase
        .from('products')
        .select('id, name, brand, price, mrp, category_id, is_available, is_featured', { count: 'exact' })
      
      if (prodSearch.trim()) {
        query = query.ilike('name', `%${prodSearch.trim()}%`)
      }
      if (prodCategory !== 'all') {
        query = query.eq('category_id', prodCategory)
      }
      
      const start = (prodPage - 1) * 8
      const end = start + 7
      
      const { data, count, error } = await query
        .range(start, end)
        .order('name')
        
      if (error) throw error
      
      setVisProducts(data || [])
      setProdTotalCount(count || 0)
      
      // Fetch city overrides for these products
      if (data && data.length > 0) {
        const pIds = data.map(p => p.id)
        const { data: pcaData, error: pcaError } = await supabase
          .from('product_city_availability')
          .select('*')
          .eq('city_slug', selectedCityForVisibility)
          .in('product_id', pIds)
          
        if (!pcaError && pcaData) {
          const map = {}
          const overrides = {}
          pcaData.forEach(row => {
            map[row.product_id] = row
            overrides[row.product_id] = {
              is_available: row.is_available,
              is_featured: row.is_featured,
              city_price: row.city_price !== null && row.city_price !== undefined ? row.city_price.toString() : '',
              city_mrp: row.city_mrp !== null && row.city_mrp !== undefined ? row.city_mrp.toString() : ''
            }
          })
          setVisPcaMap(map)
          setLocalOverrides(overrides)
        } else {
          setVisPcaMap({})
          setLocalOverrides({})
        }
      } else {
        setVisPcaMap({})
        setLocalOverrides({})
      }
    } catch (err) {
      console.error('Error fetching visibility products:', err)
    } finally {
      setLoadingVisProducts(false)
    }
  }

  // Fetch Brand Visibility Map
  const fetchVisibilityBrandsMap = async () => {
    if (!selectedCityForVisibility) return
    setLoadingVisBrands(true)
    try {
      const { data, error } = await supabase
        .from('brand_city_availability')
        .select('*')
        .eq('city_slug', selectedCityForVisibility)
        
      if (error) throw error
      
      const map = {}
      data?.forEach(row => {
        map[row.brand] = row
      })
      setVisBcaMap(map)
    } catch (err) {
      console.error('Error fetching brand visibility map:', err)
    } finally {
      setLoadingVisBrands(false)
    }
  }

  useEffect(() => {
    if (visibilityTab === 'products') {
      fetchVisibilityProducts()
    } else {
      fetchVisibilityBrandsMap()
    }
  }, [selectedCityForVisibility, visibilityTab, prodPage, prodCategory])

  useEffect(() => {
    if (visibilityTab === 'products') {
      const delay = setTimeout(() => {
        setProdPage(1)
        fetchVisibilityProducts()
      }, 400)
      return () => clearTimeout(delay)
    }
  }, [prodSearch])

  // Handle local override changes
  const handleLocalOverrideChange = (productId, field, value) => {
    setLocalOverrides(prev => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {
          is_available: true,
          is_featured: false,
          city_price: '',
          city_mrp: ''
        }),
        [field]: value
      }
    }))
  }

  // Save product settings override
  const handleSaveProductOverride = async (product) => {
    setSavingProductId(product.id)
    try {
      const currentLocal = localOverrides[product.id] || {}
      
      const payload = {
        product_id: product.id,
        city_slug: selectedCityForVisibility,
        is_available: currentLocal.is_available ?? product.is_available,
        is_featured: currentLocal.is_featured ?? product.is_featured,
        city_price: currentLocal.city_price && currentLocal.city_price.trim() !== '' ? parseFloat(currentLocal.city_price) : null,
        city_mrp: currentLocal.city_mrp && currentLocal.city_mrp.trim() !== '' ? parseFloat(currentLocal.city_mrp) : null,
        updated_at: new Date().toISOString()
      }
      
      const { error } = await supabase
        .from('product_city_availability')
        .upsert(payload, { onConflict: 'product_id,city_slug' })
        
      if (error) throw error
      
      toast.success(`Updated settings for ${product.name}`)
      
      // Update pcaMap state
      setVisPcaMap(prev => ({
        ...prev,
        [product.id]: payload
      }))
    } catch (err) {
      console.error('Error saving product override:', err)
      toast.error('Failed to save product settings')
    } finally {
      setSavingProductId(null)
    }
  }

  // Reset product settings override
  const handleResetProductOverride = async (product) => {
    setSavingProductId(product.id)
    try {
      const { error } = await supabase
        .from('product_city_availability')
        .delete()
        .eq('product_id', product.id)
        .eq('city_slug', selectedCityForVisibility)
        
      if (error) throw error
      
      toast.success(`Reset settings for ${product.name} to default`)
      
      // Remove from pcaMap and localOverrides
      setVisPcaMap(prev => {
        const copy = { ...prev }
        delete copy[product.id]
        return copy
      })
      setLocalOverrides(prev => {
        const copy = { ...prev }
        delete copy[product.id]
        return copy
      })
    } catch (err) {
      console.error('Error resetting product override:', err)
      toast.error('Failed to reset product settings')
    } finally {
      setSavingProductId(null)
    }
  }

  // Toggle Brand availability
  const handleToggleBrandOverride = async (brandName, currentAvailable) => {
    setSavingBrandName(brandName)
    const nextAvailable = !currentAvailable
    const toastId = toast.loading(`Updating visibility for brand "${brandName}"...`)
    try {
      const { error } = await supabase.rpc('set_brand_city_availability', {
        p_brand: brandName,
        p_city_slug: selectedCityForVisibility,
        p_is_available: nextAvailable
      })
      
      if (error) throw error
      
      toast.success(`Brand "${brandName}" is now ${nextAvailable ? 'Visible' : 'Hidden'} in selected city`, { id: toastId })
      
      // Update local map state
      setVisBcaMap(prev => ({
        ...prev,
        [brandName]: {
          brand: brandName,
          city_slug: selectedCityForVisibility,
          is_available: nextAvailable
        }
      }))
    } catch (err) {
      console.error('Error setting brand availability:', err)
      toast.error('Failed to update brand visibility', { id: toastId })
    } finally {
      setSavingBrandName(null)
    }
  }

  // Auto-fill slug and SEO preview from name
  useEffect(() => {
    if (!editingCity && formData.name) {
      const generatedSlug = slugifyForTyping(formData.name)
      setFormData(prev => ({
        ...prev,
        slug: generatedSlug,
        seoTitle: prev.seoTitle || `Online Grocery Delivery in ${formData.name} | OZO Mart - 30 Min`,
        seoDescription: prev.seoDescription || `Order fresh groceries, vegetables & daily essentials online in ${formData.name}. Fast 30-minute delivery. Cash on Delivery available.`
      }))
    }
  }, [formData.name, editingCity])

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      state: '',
      latitude: '',
      longitude: '',
      serviceRadiusKm: 15,
      seoTitle: '',
      seoDescription: '',
      seoKeywordsStr: '',
      isActive: true,
      allowedPincodesStr: ''
    })
    setEditingCity(null)
  }

  const handleEdit = (city) => {
    setEditingCity(city)
    setFormData({
      name: city.name || '',
      slug: city.slug || '',
      state: city.state || '',
      latitude: city.latitude || '',
      longitude: city.longitude || '',
      serviceRadiusKm: city.service_radius_km || 15,
      seoTitle: city.seo_title || '',
      seoDescription: city.seo_description || '',
      seoKeywordsStr: city.seo_keywords ? city.seo_keywords.join(', ') : '',
      isActive: city.is_active ?? true,
      allowedPincodesStr: city.allowed_pincodes ? city.allowed_pincodes.join(', ') : ''
    })
    setIsDrawerOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    if (!formData.name.trim()) {
      toast.error('City Name is required!')
      return
    }
    if (!formData.slug.trim()) {
      toast.error('City Slug is required!')
      return
    }

    setSubmitting(true)
    const toastId = toast.loading(editingCity ? 'Updating city...' : 'Creating city...')

    try {
      const keywords = formData.seoKeywordsStr
        ? formData.seoKeywordsStr.split(',').map(k => k.trim()).filter(Boolean)
        : [
            `grocery delivery ${formData.name.toLowerCase()}`,
            `online grocery ${formData.name.toLowerCase()}`,
            `vegetables home delivery ${formData.name.toLowerCase()}`,
            `30 minute delivery ${formData.name.toLowerCase()}`
          ]

      const pincodes = formData.allowedPincodesStr
        ? formData.allowedPincodesStr.split(',').map(p => p.trim()).filter(Boolean)
        : []

      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        state: formData.state.trim(),
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        service_radius_km: parseInt(formData.serviceRadiusKm) || 15,
        seo_title: formData.seoTitle.trim() || `Online Grocery Delivery in ${formData.name} | OZO Mart - 30 Min`,
        seo_description: formData.seoDescription.trim() || `Order fresh groceries, vegetables & daily essentials online in ${formData.name}. Fast 30-minute delivery. Cash on Delivery available.`,
        seo_keywords: keywords,
        is_active: formData.isActive,
        allowed_pincodes: pincodes
      }

      if (editingCity) {
        const { error } = await supabase
          .from('operating_cities')
          .update(payload)
          .eq('id', editingCity.id)

        if (error) throw error
        toast.success('City updated successfully!', { id: toastId })
      } else {
        const { error } = await supabase
          .from('operating_cities')
          .insert([payload])

        if (error) throw error
        toast.success('City registered successfully!', { id: toastId })
      }

      // Trigger sitemap ping and metadata update asynchronously
      try {
        fetch('/api/index-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productSlug: 'all', cities: [payload.slug] })
        }).catch(err => console.warn('Async IndexNow ping failed:', err))
      } catch (e) {}

      setIsDrawerOpen(false)
      resetForm()
      fetchCities()
    } catch (error) {
      console.error('Submit city error:', error)
      toast.error(error.message || 'Saving failed. Check if slug is unique.', { id: toastId })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (city) => {
    const key = `toggle-${city.id}`
    if (pendingActions[key]) return

    setPendingActions(prev => ({ ...prev, [key]: true }))
    try {
      const { error } = await supabase
        .from('operating_cities')
        .update({ is_active: !city.is_active })
        .eq('id', city.id)

      if (error) throw error

      setCities(prev =>
        prev.map(c => (c.id === city.id ? { ...c, is_active: !c.is_active } : c))
      )
      toast.success(`${city.name} status updated!`)
    } catch (error) {
      console.error('Toggle city active status error:', error)
      toast.error('Failed to change status.')
    } finally {
      setPendingActions(prev => {
        const copy = { ...prev }
        delete copy[key]
        return copy
      })
    }
  }

  const handleDelete = async (city) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete city "${city.name}"? This will disable all SEO routes for this city.`)
    if (!confirmDelete) return

    const key = `delete-${city.id}`
    if (pendingActions[key]) return

    setPendingActions(prev => ({ ...prev, [key]: true }))
    const toastId = toast.loading('Deleting city...')

    try {
      const { error } = await supabase
        .from('operating_cities')
        .delete()
        .eq('id', city.id)

      if (error) throw error

      toast.success('City deleted successfully!', { id: toastId })
      fetchCities()
    } catch (error) {
      console.error('Delete city error:', error)
      toast.error(error.message || 'Failed to delete city.', { id: toastId })
    } finally {
      setPendingActions(prev => {
        const copy = { ...prev }
        delete copy[key]
        return copy
      })
    }
  }

  // Filtering & Sorting Logic
  const filteredCities = cities.filter(city => {
    const matchesSearch =
      city.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      city.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      city.state?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && city.is_active) ||
      (statusFilter === 'inactive' && !city.is_active)

    return matchesSearch && matchesStatus
  }).sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name)
    } else if (sortBy === 'created_at') {
      return new Date(b.created_at) - new Date(a.created_at)
    }
    return 0
  })

  // Statistics
  const totalCities = cities.length
  const activeCities = cities.filter(c => c.is_active).length
  const inactiveCities = totalCities - activeCities

  // Pagination helper for cities table
  const totalCityPages = Math.ceil(filteredCities.length / pageSize)

  // Filtered Brands
  const filteredBrands = visBrands.filter(brand =>
    brand.toLowerCase().includes(brandSearch.toLowerCase())
  )

  return (
    <div className="space-y-6 p-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium">
        <div>
          <h1 className="text-3xl font-black text-gradient">City & Location Management</h1>
          <p className="text-sm text-ozo-gray mt-1">Manage operational cities, dark store ranges, and automatic localized SEO listings.</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setIsDrawerOpen(true)
          }}
          className="flex items-center justify-center gap-2 bg-gradient-ozo text-white px-5 py-3 rounded-2xl font-bold shadow-ozo hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Add New City
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Total Cities</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-gray-900 dark:text-white">{totalCities}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Active Cities</span>
            <div className="p-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-green-600">{activeCities}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Inactive Cities</span>
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-red-600">{inactiveCities}</p>
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
            placeholder="Search cities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm text-gray-750 dark:text-gray-300 focus:outline-none focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_12px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm text-gray-750 dark:text-gray-300 focus:outline-none focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_12px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
          >
            <option value="name">Sort: Name (A-Z)</option>
            <option value="created_at">Sort: Date Added</option>
          </select>

          <button
            onClick={fetchCities}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-250 dark:border-white/10 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 transition-all active:scale-95"
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
            <p className="text-sm font-semibold text-gray-500">Cities loading...</p>
          </div>
        ) : filteredCities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center text-2xl mb-4">
              🏙️
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">No cities found</h3>
            <p className="text-sm text-gray-500 mt-1">Change filters or add a new operational city.</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">City Name</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Slug</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">State</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Coordinates</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Radius</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filteredCities.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((city) => {
                    const isDeleting = pendingActions[`delete-${city.id}`]
                    const isToggling = pendingActions[`toggle-${city.id}`]

                    return (
                      <tr key={city.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                        <td className="p-4 font-bold text-gray-850 dark:text-white">
                          {city.name}
                        </td>
                        <td className="p-4 text-sm font-mono text-gray-500">
                          {city.slug}
                        </td>
                        <td className="p-4 text-sm text-gray-700 dark:text-gray-300">
                          {city.state}
                        </td>
                        <td className="p-4 text-xs font-mono text-gray-400">
                          {city.latitude && city.longitude ? `${city.latitude}, ${city.longitude}` : 'Not set'}
                        </td>
                        <td className="p-4 text-sm font-bold text-center text-gray-750 dark:text-gray-250">
                          {city.service_radius_km} km
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggleActive(city)}
                            disabled={isToggling}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                              city.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-zinc-800'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                city.is_active ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedCityForVisibility(city.slug)
                                setTimeout(() => {
                                  document.getElementById('visibility-manager-section')?.scrollIntoView({ behavior: 'smooth' })
                                }, 100)
                              }}
                              className="p-2 hover:bg-purple-50 dark:hover:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-xl transition-all"
                              title="Manage Visibility Controls"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(city)}
                              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl transition-all"
                              title="Edit City"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(city)}
                              disabled={isDeleting}
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl transition-all disabled:opacity-30"
                              title="Delete City"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Cities */}
            {totalCityPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-transparent">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-4 py-2 text-xs font-bold border border-gray-200 dark:border-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 transition-all text-gray-650 dark:text-gray-300"
                >
                  Previous
                </button>
                <span className="text-xs font-bold text-gray-500">
                  Page {currentPage} of {totalCityPages}
                </span>
                <button
                  disabled={currentPage === totalCityPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalCityPages))}
                  className="px-4 py-2 text-xs font-bold border border-gray-200 dark:border-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 transition-all text-gray-650 dark:text-gray-300"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product & Brand Visibility Manager Panel */}
      {selectedCityForVisibility && (
        <div id="visibility-manager-section" className="bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium p-6 mt-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-white/5 pb-5 mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="w-6 h-6 text-ozo-red animate-spin-slow" />
                Product & Brand City Overrides
              </h2>
              <p className="text-sm text-ozo-gray mt-1">
                Customize availability, visibility, prices, and features specifically for the selected city.
              </p>
            </div>

            {/* City Selector Dropdown */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Target City:</label>
              <select
                value={selectedCityForVisibility}
                onChange={(e) => {
                  setSelectedCityForVisibility(e.target.value)
                  setProdPage(1)
                }}
                className="pl-4 pr-10 py-2.5 rounded-xl border border-gray-250 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm font-bold text-gray-750 dark:text-white focus:outline-none focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_12px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
              >
                {cities.map(c => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex gap-2 p-1.5 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl w-fit mb-6">
            <button
              onClick={() => setVisibilityTab('products')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
                visibilityTab === 'products'
                  ? 'bg-white dark:bg-[#25252e] text-ozo-red shadow-sm'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Package className="w-4.5 h-4.5" />
              Products Availability & Pricing
            </button>
            <button
              onClick={() => setVisibilityTab('brands')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
                visibilityTab === 'brands'
                  ? 'bg-white dark:bg-[#25252e] text-ozo-red shadow-sm'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Tag className="w-4.5 h-4.5" />
              Brands Visibility Control
            </button>
          </div>

          {/* PRODUCTS TAB CONTENT */}
          {visibilityTab === 'products' && (
            <div className="space-y-4">
              {/* Product Filters */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-80">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Search className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search products in catalog..."
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
                  />
                  {prodSearch && (
                    <button
                      onClick={() => setProdSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <span className="text-xs font-bold text-gray-400 uppercase whitespace-nowrap">Category:</span>
                  <select
                    value={prodCategory}
                    onChange={(e) => {
                      setProdCategory(e.target.value)
                      setProdPage(1)
                    }}
                    className="pl-4 pr-10 py-2 rounded-xl border border-gray-250 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_12px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
                  >
                    <option value="all">All Categories</option>
                    {visCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Products Overrides Table */}
              <div className="bg-white dark:bg-[#18181f] rounded-2xl border border-gray-150 dark:border-white/5 overflow-hidden">
                {loadingVisProducts ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-ozo-red" />
                    <span className="text-sm font-semibold text-gray-500">Loading catalog...</span>
                  </div>
                ) : visProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="w-10 h-10 text-gray-400 mb-2" />
                    <h4 className="text-sm font-bold text-gray-700 dark:text-white">No products found</h4>
                    <p className="text-xs text-gray-500 mt-1">Try refining search parameters or filters.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-150 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01]">
                          <th className="p-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider w-1/3">Product details</th>
                          <th className="p-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Available</th>
                          <th className="p-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Featured</th>
                          <th className="p-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">Base Prices</th>
                          <th className="p-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider">City Overrides</th>
                          <th className="p-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150 dark:divide-white/5">
                        {visProducts.map(product => {
                          const pca = visPcaMap[product.id]
                          const local = localOverrides[product.id] || {
                            is_available: pca ? pca.is_available : true,
                            is_featured: pca ? pca.is_featured : false,
                            city_price: pca && pca.city_price !== null ? pca.city_price.toString() : '',
                            city_mrp: pca && pca.city_mrp !== null ? pca.city_mrp.toString() : ''
                          }
                          const isSaving = savingProductId === product.id
                          const hasOverride = !!pca

                          return (
                            <tr key={product.id} className="hover:bg-gray-50/30 dark:hover:bg-white/[0.005] transition-colors">
                              <td className="p-3.5">
                                <div className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">
                                  {product.name}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 font-semibold">
                                  {product.brand && (
                                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/5 rounded">
                                      Brand: {product.brand}
                                    </span>
                                  )}
                                  <span className="text-gray-400">•</span>
                                  <span>ID: {product.id.slice(0, 8)}...</span>
                                </div>
                              </td>

                              <td className="p-3.5 text-center">
                                <button
                                  disabled={isSaving}
                                  onClick={() => handleLocalOverrideChange(product.id, 'is_available', !local.is_available)}
                                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                    local.is_available
                                      ? 'bg-green-50 dark:bg-green-950/20 text-green-600 hover:bg-green-100 border border-green-200/50'
                                      : 'bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-100 border border-red-200/50'
                                  }`}
                                >
                                  {local.is_available ? 'Available' : 'Hidden'}
                                </button>
                              </td>

                              <td className="p-3.5 text-center">
                                <input
                                  type="checkbox"
                                  disabled={isSaving}
                                  checked={local.is_featured}
                                  onChange={(e) => handleLocalOverrideChange(product.id, 'is_featured', e.target.checked)}
                                  className="w-4.5 h-4.5 accent-ozo-red rounded cursor-pointer"
                                />
                              </td>

                              <td className="p-3.5 text-sm font-semibold text-gray-500">
                                <div>Price: ₹{parseFloat(product.price).toFixed(2)}</div>
                                <div>MRP: ₹{parseFloat(product.mrp).toFixed(2)}</div>
                              </td>

                              <td className="p-3.5">
                                <div className="flex gap-2">
                                  <div className="w-24">
                                    <span className="text-[10px] text-gray-400 block mb-0.5 font-bold uppercase">City Price (₹)</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      disabled={isSaving}
                                      placeholder={parseFloat(product.price).toFixed(2)}
                                      value={local.city_price}
                                      onChange={(e) => handleLocalOverrideChange(product.id, 'city_price', e.target.value)}
                                      className="w-full px-2 py-1 bg-transparent border border-gray-250 dark:border-white/10 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
                                    />
                                  </div>
                                  <div className="w-24">
                                    <span className="text-[10px] text-gray-400 block mb-0.5 font-bold uppercase">City MRP (₹)</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      disabled={isSaving}
                                      placeholder={parseFloat(product.mrp).toFixed(2)}
                                      value={local.city_mrp}
                                      onChange={(e) => handleLocalOverrideChange(product.id, 'city_mrp', e.target.value)}
                                      className="w-full px-2 py-1 bg-transparent border border-gray-250 dark:border-white/10 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
                                    />
                                  </div>
                                </div>
                              </td>

                              <td className="p-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleSaveProductOverride(product)}
                                    disabled={isSaving}
                                    className={`p-2 rounded-xl text-white shadow-sm transition-all ${
                                      isSaving
                                        ? 'bg-gray-400 dark:bg-zinc-800'
                                        : hasOverride
                                        ? 'bg-blue-650 hover:bg-blue-600'
                                        : 'bg-green-600 hover:bg-green-700'
                                    }`}
                                    title={hasOverride ? "Update Custom Settings" : "Save Custom settings"}
                                  >
                                    {isSaving ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Check className="w-4 h-4" />
                                    )}
                                  </button>
                                  {hasOverride && (
                                    <button
                                      onClick={() => handleResetProductOverride(product)}
                                      disabled={isSaving}
                                      className="p-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 rounded-xl transition-all"
                                      title="Reset to Base Settings"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Product pagination */}
              {prodTotalCount > 8 && (
                <div className="flex items-center justify-between p-4 border border-gray-150 dark:border-white/5 rounded-2xl bg-gray-50/20 dark:bg-transparent">
                  <button
                    disabled={prodPage === 1 || loadingVisProducts}
                    onClick={() => setProdPage(prev => Math.max(prev - 1, 1))}
                    className="px-4 py-2 text-xs font-bold border border-gray-200 dark:border-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 transition-all text-gray-650 dark:text-gray-300"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-bold text-gray-500">
                    Showing {(prodPage - 1) * 8 + 1} - {Math.min(prodPage * 8, prodTotalCount)} of {prodTotalCount} products
                  </span>
                  <button
                    disabled={prodPage * 8 >= prodTotalCount || loadingVisProducts}
                    onClick={() => setProdPage(prev => prev + 1)}
                    className="px-4 py-2 text-xs font-bold border border-gray-200 dark:border-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 transition-all text-gray-650 dark:text-gray-300"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {/* BRANDS TAB CONTENT */}
          {visibilityTab === 'brands' && (
            <div className="space-y-4">
              {/* Brand Search */}
              <div className="relative w-full sm:w-80">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  placeholder="Search brands..."
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
                />
                {brandSearch && (
                  <button
                    onClick={() => setBrandSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Brands Grid */}
              {loadingVisBrands ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-ozo-red" />
                  <span className="text-sm font-semibold text-gray-500">Loading brands...</span>
                </div>
              ) : filteredBrands.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="w-10 h-10 text-gray-400 mb-2" />
                  <h4 className="text-sm font-bold text-gray-700 dark:text-white">No brands found</h4>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredBrands.map(brandName => {
                    const bca = visBcaMap[brandName]
                    const isAvailable = bca ? bca.is_available : true // Defaults to true
                    const isSaving = savingBrandName === brandName

                    return (
                      <div
                        key={brandName}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                          isAvailable
                            ? 'bg-white dark:bg-[#18181f] border-gray-150 dark:border-white/5'
                            : 'bg-red-50/20 dark:bg-red-950/5 border-red-200/50 dark:border-red-950/20'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-gray-800 dark:text-white text-sm line-clamp-1">
                              {brandName}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isAvailable
                                ? 'bg-green-50 dark:bg-green-950/20 text-green-600'
                                : 'bg-red-50 dark:bg-red-950/20 text-red-600'
                            }`}>
                              {isAvailable ? 'Visible' : 'Hidden'}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1 font-semibold">
                            Toggling will enable/disable all products of this brand in {selectedCityForVisibility}.
                          </p>
                        </div>

                        <div className="mt-4 flex items-center justify-end">
                          <button
                            disabled={isSaving}
                            onClick={() => handleToggleBrandOverride(brandName, isAvailable)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5 ${
                              isAvailable
                                ? 'bg-red-600 hover:bg-red-750 text-white'
                                : 'bg-green-650 hover:bg-green-600 text-white'
                            }`}
                          >
                            {isSaving ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isAvailable ? (
                              'Hide Brand'
                            ) : (
                              'Show Brand'
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Slide-out Add/Edit Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-screen w-full sm:w-[540px] bg-white dark:bg-[#15151c] shadow-premium border-l border-gray-150 dark:border-white/5 z-50 overflow-y-auto p-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5 mb-6">
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">
                    {editingCity ? 'Edit Operating City' : 'Register New City'}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">Configure operating parameters and local search engine metadata.</p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2">City Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Aurangabad, Bihar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2">Slug *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., aurangabad-bihar"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: slugifyForTyping(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Bihar"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="e.g., 24.7522"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="e.g., 84.3742"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2">Service Radius (km)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="15"
                    value={formData.serviceRadiusKm}
                    onChange={(e) => setFormData({ ...formData, serviceRadiusKm: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2">Serviceable Pincodes (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. 824101, 824102, 824124"
                    value={formData.allowedPincodesStr}
                    onChange={(e) => setFormData({ ...formData, allowedPincodesStr: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white font-bold"
                  />
                  <p className="text-[10px] text-gray-450 mt-1">
                    Enter the pincodes where OZO delivers in this city. If left empty, all areas within the service radius are allowed.
                  </p>
                </div>

                <div className="border-t border-gray-100 dark:border-white/5 pt-4">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-ozo-red" />
                    SEO & Indexing Properties
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase mb-2">Custom SEO Title (Optimal: 50-60 chars)</label>
                      <input
                        type="text"
                        placeholder="Auto-generated if empty"
                        value={formData.seoTitle}
                        onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase mb-2">Custom Meta Description (Optimal: 140-160 chars)</label>
                      <textarea
                        rows="3"
                        placeholder="Auto-generated if empty"
                        value={formData.seoDescription}
                        onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase mb-2">SEO Keywords (Comma-separated)</label>
                      <input
                        type="text"
                        placeholder="grocery delivery, online fruits, fresh organic veggies"
                        value={formData.seoKeywordsStr}
                        onChange={(e) => setFormData({ ...formData, seoKeywordsStr: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 accent-ozo-red rounded"
                  />
                  <label htmlFor="isActive" className="text-sm font-semibold text-gray-700 dark:text-gray-300 select-none">
                    Mark this city as active & open for delivery
                  </label>
                </div>

                <div className="flex gap-3 pt-6 border-t border-gray-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="flex-1 py-3 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl font-bold text-gray-600 dark:text-gray-450 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-gradient-ozo text-white rounded-xl font-bold shadow-ozo hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save City Configuration'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Cities
