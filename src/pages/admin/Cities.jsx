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
  AlertCircle,
  CheckSquare,
  Square,
  MinusSquare,
  AlertOctagon,
  CheckCircle2,
  Filter,
  Layers
} from 'lucide-react'
import { supabaseAdmin as supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'

// Helper to generate URL-friendly slug while typing
const slugifyForTyping = (text) => {
  return text
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
}

const Cities = () => {
  const { profile } = useAuthStore()
  const isSuperAdmin = profile?.isSuperAdmin || profile?.role === 'admin' || profile?.role === 'super_admin'

  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingCity, setEditingCity] = useState(null)

  // City Manager management states
  const [allCityManagers, setAllCityManagers] = useState([])
  const [loadingManagers, setLoadingManagers] = useState(false)
  const [selectedCityForManagers, setSelectedCityForManagers] = useState(null)
  const [showManagersModal, setShowManagersModal] = useState(false)
  const [managerSearchQuery, setManagerSearchQuery] = useState('')

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
  
  // Products Tab State (with city stock filter & bulk selection)
  const [prodSearch, setProdSearch] = useState('')
  const [prodCategory, setProdCategory] = useState('all')
  const [prodBrand, setProdBrand] = useState('all')
  const [prodStockStatus, setProdStockStatus] = useState('all') // 'all', 'in-stock', 'out-of-stock'
  const [prodPageSize, setProdPageSize] = useState(25) // 10, 25, 50, 100
  const [prodPage, setProdPage] = useState(1)
  const [prodTotalCount, setProdTotalCount] = useState(0)
  const [visProducts, setVisProducts] = useState([])
  const [visCategories, setVisCategories] = useState([])
  const [visPcaMap, setVisPcaMap] = useState({}) // product_id -> pca row
  const [loadingVisProducts, setLoadingVisProducts] = useState(false)
  const [savingProductId, setSavingProductId] = useState(null)
  const [localOverrides, setLocalOverrides] = useState({}) // product_id -> { is_available, is_featured, city_price, city_mrp }
  const [selectedProdIds, setSelectedProdIds] = useState(new Set())
  const [isBulkOperating, setIsBulkOperating] = useState(false)

  // City PCA Catalog isolation state
  const [cityPcaCount, setCityPcaCount] = useState(null)
  const [totalMasterCount, setTotalMasterCount] = useState(0)

  // Emergency Out-of-Stock All State
  const [showMarkAllOosModal, setShowMarkAllOosModal] = useState(false)
  const [isMarkingAllOos, setIsMarkingAllOos] = useState(false)
  const [allOosConfirmInput, setAllOosConfirmInput] = useState('')
  const [allOosAcknowledged, setAllOosAcknowledged] = useState(false)
  const [allOosProgress, setAllOosProgress] = useState(null)

  // Mark All In-Stock State
  const [showMarkAllInStockModal, setShowMarkAllInStockModal] = useState(false)
  const [isMarkingAllInStock, setIsMarkingAllInStock] = useState(false)
  const [allInStockAcknowledged, setAllInStockAcknowledged] = useState(false)

  // Add Products from Global Master Catalogue Modal State
  const [showAddFromGlobalModal, setShowAddFromGlobalModal] = useState(false)
  const [globalModalSearch, setGlobalModalSearch] = useState('')
  const [globalModalCategory, setGlobalModalCategory] = useState('all')
  const [globalModalBrand, setGlobalModalBrand] = useState('all')
  const [globalModalPage, setGlobalModalPage] = useState(1)
  const [globalModalPageSize, setGlobalModalPageSize] = useState(25)
  const [globalModalProducts, setGlobalModalProducts] = useState([])
  const [globalModalTotalCount, setGlobalModalTotalCount] = useState(0)
  const [loadingGlobalModal, setLoadingGlobalModal] = useState(false)
  const [selectedGlobalProdIds, setSelectedGlobalProdIds] = useState(new Set())
  const [isAddingFromGlobal, setIsAddingFromGlobal] = useState(false)
  const [isImportingAll, setIsImportingAll] = useState(false)

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

  const fetchCityManagers = async () => {
    setLoadingManagers(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, phone, user_roles!user_roles_user_id_fkey(id, role, city_id)')
        .eq('role', 'city_manager')

      if (error) throw error
      setAllCityManagers(data || [])
    } catch (error) {
      console.error('Error fetching city managers:', error)
    } finally {
      setLoadingManagers(false)
    }
  }

  const handleToggleManagerAssignment = async (manager, isAssigned) => {
    const toastId = toast.loading(isAssigned ? 'Removing manager...' : 'Assigning manager...')
    try {
      if (isAssigned) {
        // Delete assignment row
        const { error: deleteErr } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', manager.id)
          .eq('role', 'city_manager')
          .eq('city_id', selectedCityForManagers.id)

        if (deleteErr) throw deleteErr

        // Check remaining assignments
        const remainingRoles = manager.user_roles?.filter(r => r.role === 'city_manager' && r.city_id !== selectedCityForManagers.id) || []
        if (remainingRoles.length === 0) {
          // Fallback row with null city_id
          const { error: insertErr } = await supabase
            .from('user_roles')
            .insert({
              user_id: manager.id,
              role: 'city_manager',
              city_id: null
            })
          if (insertErr) throw insertErr
        }
        toast.success('Manager removed from city successfully!', { id: toastId })
      } else {
        // Look for null city row
        const nullCityRole = manager.user_roles?.find(r => r.role === 'city_manager' && r.city_id === null)
        if (nullCityRole) {
          const { error: updateErr } = await supabase
            .from('user_roles')
            .update({ city_id: selectedCityForManagers.id })
            .eq('id', nullCityRole.id)

          if (updateErr) throw updateErr
        } else {
          // Insert new assignment
          const { error: insertErr } = await supabase
            .from('user_roles')
            .insert({
              user_id: manager.id,
              role: 'city_manager',
              city_id: selectedCityForManagers.id
            })
          if (insertErr) throw insertErr
        }
        toast.success('Manager assigned to city successfully!', { id: toastId })
      }
      await fetchCityManagers()
    } catch (err) {
      console.error('Failed to toggle manager assignment:', err)
      toast.error('Failed to update assignment: ' + err.message, { id: toastId })
    }
  }

  const getManagersForCity = (cityId) => {
    return allCityManagers.filter(manager =>
      manager.user_roles?.some(role => role.role === 'city_manager' && role.city_id === cityId)
    )
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
    fetchCityManagers()
  }, [])

  useEffect(() => {
    if (cities.length > 0 && !selectedCityForVisibility) {
      setSelectedCityForVisibility(cities[0].slug)
    }
  }, [cities])

  // Fetch Visibility Products with city isolation and advanced SQL filtering
  const fetchVisibilityProducts = async () => {
    if (!selectedCityForVisibility) return
    setLoadingVisProducts(true)
    try {
      // 1. Check if this city has products configured in PCA
      const { count: pcaCount, error: countErr } = await supabase
        .from('product_city_availability')
        .select('*', { count: 'exact', head: true })
        .eq('city_slug', selectedCityForVisibility)

      if (countErr) console.warn('PCA count check error:', countErr)
      setCityPcaCount(pcaCount || 0)

      // Fetch total master products count once for UI stats
      if (totalMasterCount === 0) {
        const { count: masterCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
        if (masterCount) setTotalMasterCount(masterCount)
      }

      // If a newly added city has 0 products configured, isolate it completely (do not leak other cities' products)
      if (!pcaCount || pcaCount === 0) {
        setVisProducts([])
        setProdTotalCount(0)
        setVisPcaMap({})
        setLocalOverrides({})
        setLoadingVisProducts(false)
        return
      }

      // 2. Query products configured specifically for this city via product_city_availability!inner
      let query = supabase
        .from('products')
        .select(`
          id, name, brand, barcode, price, mrp, category_id, is_available, is_featured, quantity_available, image_url,
          product_city_availability!inner(
            id, city_slug, is_available, is_featured, is_upcoming, city_price, city_mrp, city_ozo_price
          )
        `, { count: 'exact' })
        .eq('product_city_availability.city_slug', selectedCityForVisibility)

      if (prodSearch.trim()) {
        const term = prodSearch.trim()
        query = query.or(`name.ilike.%${term}%,brand.ilike.%${term}%,barcode.ilike.%${term}%`)
      }
      if (prodCategory !== 'all') {
        query = query.eq('category_id', prodCategory)
      }
      if (prodBrand !== 'all') {
        query = query.eq('brand', prodBrand)
      }

      // Filter city stock status in SQL directly to maintain exact page size (100 items = 100 items)
      if (prodStockStatus === 'in-stock') {
        query = query.eq('product_city_availability.is_available', true)
      } else if (prodStockStatus === 'out-of-stock') {
        query = query.eq('product_city_availability.is_available', false)
      }

      const start = (prodPage - 1) * prodPageSize
      const end = start + prodPageSize - 1

      const { data, count, error } = await query
        .range(start, end)
        .order('name')

      if (error) throw error

      const fetchedProducts = data || []
      const map = {}
      const overrides = {}

      fetchedProducts.forEach(product => {
        const pcaList = product.product_city_availability
        const pca = Array.isArray(pcaList) ? pcaList[0] : pcaList
        if (pca) {
          map[product.id] = pca
          overrides[product.id] = {
            is_available: pca.is_available,
            is_featured: pca.is_featured,
            city_price: pca.city_price !== null && pca.city_price !== undefined ? pca.city_price.toString() : '',
            city_mrp: pca.city_mrp !== null && pca.city_mrp !== undefined ? pca.city_mrp.toString() : ''
          }
        }
      })

      setVisProducts(fetchedProducts)
      setProdTotalCount(count || 0)
      setVisPcaMap(map)
      setLocalOverrides(overrides)
    } catch (err) {
      console.error('Error fetching visibility products:', err)
      toast.error('Error loading products: ' + err.message)
    } finally {
      setLoadingVisProducts(false)
    }
  }

  // Fetch Master Global Catalogue for "Add Products from Global Catalogue" Modal
  const fetchGlobalModalProducts = async () => {
    setLoadingGlobalModal(true)
    try {
      let query = supabase
        .from('products')
        .select('id, name, brand, barcode, price, mrp, category_id, image_url, is_available', { count: 'exact' })

      if (globalModalSearch.trim()) {
        const term = globalModalSearch.trim()
        query = query.or(`name.ilike.%${term}%,brand.ilike.%${term}%,barcode.ilike.%${term}%`)
      }
      if (globalModalCategory !== 'all') {
        query = query.eq('category_id', globalModalCategory)
      }
      if (globalModalBrand !== 'all') {
        query = query.eq('brand', globalModalBrand)
      }

      const start = (globalModalPage - 1) * globalModalPageSize
      const end = start + globalModalPageSize - 1

      const { data, count, error } = await query
        .range(start, end)
        .order('name')

      if (error) throw error

      setGlobalModalProducts(data || [])
      setGlobalModalTotalCount(count || 0)
    } catch (err) {
      console.error('Error fetching global catalogue in modal:', err)
      toast.error('Failed to load master catalogue')
    } finally {
      setLoadingGlobalModal(false)
    }
  }

  // Add selected products from global catalogue to this city
  const handleAddSelectedFromGlobal = async () => {
    if (selectedGlobalProdIds.size === 0 || !selectedCityForVisibility) {
      toast.error('Please select at least one product')
      return
    }
    setIsAddingFromGlobal(true)
    const toastId = toast.loading(`Adding ${selectedGlobalProdIds.size} products to ${selectedCityForVisibility}...`)

    try {
      const ids = Array.from(selectedGlobalProdIds)
      const CHUNK_SIZE = 500

      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE)
        const rows = chunk.map(id => ({
          product_id: id,
          city_slug: selectedCityForVisibility,
          is_available: true,
          updated_at: new Date().toISOString()
        }))

        const { error } = await supabase
          .from('product_city_availability')
          .upsert(rows, { onConflict: 'product_id,city_slug' })

        if (error) throw error
      }

      toast.success(`Successfully added ${ids.length} products to ${selectedCityForVisibility}!`, { id: toastId })
      setSelectedGlobalProdIds(new Set())
      setShowAddFromGlobalModal(false)
      await fetchVisibilityProducts()
    } catch (err) {
      console.error('Error adding products from global catalogue:', err)
      toast.error('Failed to add products: ' + err.message, { id: toastId })
    } finally {
      setIsAddingFromGlobal(false)
    }
  }

  // Import entire master catalogue to this city (1-click helper)
  const handleImportAllCatalogToCity = async () => {
    if (!selectedCityForVisibility) return
    const confirmed = window.confirm(
      `Are you sure you want to import ALL active products from the global master catalogue into "${selectedCityForVisibility}"?\n\nThis will configure all products as available for this city.`
    )
    if (!confirmed) return

    setIsImportingAll(true)
    const toastId = toast.loading(`Importing active catalogue into ${selectedCityForVisibility}...`)

    try {
      // 1. Try atomic PostgreSQL RPC first
      const { error: rpcErr } = await supabase.rpc('mark_all_products_city_in_stock', {
        p_city_slug: selectedCityForVisibility
      })

      if (!rpcErr) {
        toast.success(`Success! All active products imported to ${selectedCityForVisibility}.`, { id: toastId })
        await fetchVisibilityProducts()
        return
      }

      // 2. Fallback: chunked queue (500 per batch)
      const { data: allProds, error: fetchErr } = await supabase
        .from('products')
        .select('id')
        .eq('is_available', true)

      if (fetchErr) throw fetchErr

      const total = allProds?.length || 0
      const CHUNK_SIZE = 500
      for (let i = 0; i < total; i += CHUNK_SIZE) {
        const chunk = allProds.slice(i, i + CHUNK_SIZE)
        const rows = chunk.map(p => ({
          product_id: p.id,
          city_slug: selectedCityForVisibility,
          is_available: true,
          updated_at: new Date().toISOString()
        }))

        const { error: upsertErr } = await supabase
          .from('product_city_availability')
          .upsert(rows, { onConflict: 'product_id,city_slug' })

        if (upsertErr) throw upsertErr
        await new Promise(r => setTimeout(r, 10))
      }

      toast.success(`Imported ${total} products to ${selectedCityForVisibility}!`, { id: toastId })
      await fetchVisibilityProducts()
    } catch (err) {
      console.error('Import all products error:', err)
      toast.error('Import failed: ' + err.message, { id: toastId })
    } finally {
      setIsImportingAll(false)
    }
  }

  // Remove a product from this city (deletes from PCA)
  const handleRemoveProductFromCity = async (productId, productName) => {
    if (!window.confirm(`Remove "${productName}" from ${selectedCityForVisibility}?`)) return
    try {
      const { error } = await supabase
        .from('product_city_availability')
        .delete()
        .eq('city_slug', selectedCityForVisibility)
        .eq('product_id', productId)

      if (error) throw error
      toast.success(`Removed from ${selectedCityForVisibility}`)
      await fetchVisibilityProducts()
    } catch (err) {
      toast.error('Failed to remove: ' + err.message)
    }
  }

  // Atomic Emergency Out-of-Stock for entire city without frontend freeze
  const handleMarkAllOutOfStock = async () => {
    if (!selectedCityForVisibility) return
    setIsMarkingAllOos(true)
    const toastId = toast.loading(`Marking ALL products in ${selectedCityForVisibility} as OUT OF STOCK...`)

    try {
      // 1. Try atomic PostgreSQL RPC first (instant, 0ms frontend execution)
      const { data: rpcCount, error: rpcError } = await supabase.rpc('mark_all_products_city_out_of_stock', {
        p_city_slug: selectedCityForVisibility
      })

      if (!rpcError) {
        toast.success(`Success! All products in ${selectedCityForVisibility} are now OUT OF STOCK.`, { id: toastId })
        setShowMarkAllOosModal(false)
        setAllOosConfirmInput('')
        setAllOosAcknowledged(false)
        await fetchVisibilityProducts()
        return
      }

      console.warn('RPC mark_all_products_city_out_of_stock not found, using chunked queue fallback:', rpcError)

      // 2. High-performance chunked queue fallback (500 per batch with live progress)
      const { data: allProducts, error: fetchErr } = await supabase
        .from('products')
        .select('id')

      if (fetchErr || !allProducts || allProducts.length === 0) {
        throw new Error('Failed to retrieve products: ' + (fetchErr?.message || 'Empty list'))
      }

      const total = allProducts.length
      const CHUNK_SIZE = 500
      let processed = 0

      for (let i = 0; i < total; i += CHUNK_SIZE) {
        const chunk = allProducts.slice(i, i + CHUNK_SIZE)
        const upsertRows = chunk.map(p => ({
          product_id: p.id,
          city_slug: selectedCityForVisibility,
          is_available: false,
          updated_at: new Date().toISOString()
        }))

        const { error: upsertErr } = await supabase
          .from('product_city_availability')
          .upsert(upsertRows, { onConflict: 'product_id,city_slug' })

        if (upsertErr) throw upsertErr

        processed += chunk.length
        setAllOosProgress({ current: processed, total, percent: Math.round((processed / total) * 100) })
        await new Promise(r => setTimeout(r, 10))
      }

      toast.success(`Done! ${processed} products in ${selectedCityForVisibility} are now OUT OF STOCK.`, { id: toastId })
      setShowMarkAllOosModal(false)
      setAllOosConfirmInput('')
      setAllOosAcknowledged(false)
      setAllOosProgress(null)
      await fetchVisibilityProducts()
    } catch (err) {
      console.error('Failed to mark all out of stock:', err)
      toast.error('Failed to mark out of stock: ' + err.message, { id: toastId })
    } finally {
      setIsMarkingAllOos(false)
    }
  }

  // Restore entire city products to In Stock
  const handleMarkAllInStock = async () => {
    if (!selectedCityForVisibility) return
    setIsMarkingAllInStock(true)
    const toastId = toast.loading(`Restoring all products in ${selectedCityForVisibility} to IN STOCK...`)

    try {
      const { error: rpcError } = await supabase.rpc('mark_all_products_city_in_stock', {
        p_city_slug: selectedCityForVisibility
      })

      if (!rpcError) {
        toast.success(`Done! All products in ${selectedCityForVisibility} are now IN STOCK.`, { id: toastId })
        setShowMarkAllInStockModal(false)
        setAllInStockAcknowledged(false)
        await fetchVisibilityProducts()
        return
      }

      // Fallback chunked queue
      const { data: allProducts, error: fetchErr } = await supabase
        .from('products')
        .select('id')

      if (fetchErr || !allProducts) throw fetchErr

      const total = allProducts.length
      const CHUNK_SIZE = 500
      for (let i = 0; i < total; i += CHUNK_SIZE) {
        const chunk = allProducts.slice(i, i + CHUNK_SIZE)
        const upsertRows = chunk.map(p => ({
          product_id: p.id,
          city_slug: selectedCityForVisibility,
          is_available: true,
          updated_at: new Date().toISOString()
        }))

        const { error: upsertErr } = await supabase
          .from('product_city_availability')
          .upsert(upsertRows, { onConflict: 'product_id,city_slug' })

        if (upsertErr) throw upsertErr
        await new Promise(r => setTimeout(r, 10))
      }

      toast.success(`Done! All products in ${selectedCityForVisibility} are now IN STOCK.`, { id: toastId })
      setShowMarkAllInStockModal(false)
      setAllInStockAcknowledged(false)
      await fetchVisibilityProducts()
    } catch (err) {
      console.error('Failed to mark all in stock:', err)
      toast.error('Failed: ' + err.message, { id: toastId })
    } finally {
      setIsMarkingAllInStock(false)
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
    setSelectedProdIds(new Set())
    if (visibilityTab === 'products') {
      fetchVisibilityProducts()
    } else {
      fetchVisibilityBrandsMap()
    }
  }, [selectedCityForVisibility, visibilityTab, prodPage, prodCategory, prodBrand, prodStockStatus, prodPageSize])

  useEffect(() => {
    if (visibilityTab === 'products') {
      const delay = setTimeout(() => {
        setProdPage(1)
        fetchVisibilityProducts()
      }, 400)
      return () => clearTimeout(delay)
    }
  }, [prodSearch])

  // Triggers for Global Modal
  useEffect(() => {
    if (showAddFromGlobalModal) {
      fetchGlobalModalProducts()
    }
  }, [showAddFromGlobalModal, globalModalPage, globalModalCategory, globalModalBrand, globalModalPageSize])

  useEffect(() => {
    if (showAddFromGlobalModal) {
      const delay = setTimeout(() => {
        setGlobalModalPage(1)
        fetchGlobalModalProducts()
      }, 400)
      return () => clearTimeout(delay)
    }
  }, [globalModalSearch])

  // Bulk Selection Handlers
  const toggleSelectProduct = (productId) => {
    setSelectedProdIds(prev => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  const toggleSelectAllVisible = () => {
    const visibleIds = visProducts.map(p => p.id)
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedProdIds.has(id))
    
    setSelectedProdIds(prev => {
      const next = new Set(prev)
      if (allSelected) {
        visibleIds.forEach(id => next.delete(id))
      } else {
        visibleIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  // Bulk mark In Stock or Out of Stock for selected products
  const handleBulkSetStock = async (isAvailable) => {
    if (selectedProdIds.size === 0) {
      toast.error('Please select at least one product')
      return
    }
    const ids = Array.from(selectedProdIds)
    const statusLabel = isAvailable ? 'In Stock' : 'Out of Stock'
    const toastId = toast.loading(`Marking ${ids.length} products as ${statusLabel} in ${selectedCityForVisibility}...`)
    setIsBulkOperating(true)
    try {
      const payload = ids.map(id => {
        const currentLocal = localOverrides[id] || {}
        const currentProduct = visProducts.find(p => p.id === id)
        return {
          product_id: id,
          city_slug: selectedCityForVisibility,
          is_available: isAvailable,
          is_featured: currentLocal.is_featured ?? currentProduct?.is_featured ?? false,
          city_price: currentLocal.city_price && currentLocal.city_price.trim() !== '' ? parseFloat(currentLocal.city_price) : null,
          city_mrp: currentLocal.city_mrp && currentLocal.city_mrp.trim() !== '' ? parseFloat(currentLocal.city_mrp) : null,
          updated_at: new Date().toISOString()
        }
      })

      // Batch upsert in chunks of 50
      const CHUNK_SIZE = 50
      for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        const chunk = payload.slice(i, i + CHUNK_SIZE)
        const { error } = await supabase
          .from('product_city_availability')
          .upsert(chunk, { onConflict: 'product_id,city_slug' })
        if (error) throw error
      }

      toast.success(`Successfully marked ${ids.length} products as ${statusLabel} in this city!`, { id: toastId })
      setSelectedProdIds(new Set())
      await fetchVisibilityProducts()
    } catch (err) {
      console.error('Bulk stock update error:', err)
      toast.error(`Failed to update products: ${err.message}`, { id: toastId })
    } finally {
      setIsBulkOperating(false)
    }
  }

  // Bulk reset city overrides to global default
  const handleBulkResetOverrides = async () => {
    if (selectedProdIds.size === 0) return
    const ids = Array.from(selectedProdIds)
    const toastId = toast.loading(`Resetting overrides for ${ids.length} products...`)
    setIsBulkOperating(true)
    try {
      const { error } = await supabase
        .from('product_city_availability')
        .delete()
        .eq('city_slug', selectedCityForVisibility)
        .in('product_id', ids)

      if (error) throw error

      toast.success(`Reset ${ids.length} products to global defaults!`, { id: toastId })
      setSelectedProdIds(new Set())
      await fetchVisibilityProducts()
    } catch (err) {
      console.error('Bulk reset error:', err)
      toast.error(`Failed to reset overrides: ${err.message}`, { id: toastId })
    } finally {
      setIsBulkOperating(false)
    }
  }

  // 1-Click instant toggle availability for a single product
  const handleInstantToggleAvailability = async (product, currentAvailable) => {
    const nextAvailable = !currentAvailable
    const statusLabel = nextAvailable ? 'In Stock' : 'Out of Stock'
    const toastId = toast.loading(`Updating ${product.name}...`)
    try {
      const existing = localOverrides[product.id] || {}
      const payload = {
        product_id: product.id,
        city_slug: selectedCityForVisibility,
        is_available: nextAvailable,
        is_featured: existing.is_featured ?? product.is_featured ?? false,
        city_price: existing.city_price && existing.city_price.trim() !== '' ? parseFloat(existing.city_price) : null,
        city_mrp: existing.city_mrp && existing.city_mrp.trim() !== '' ? parseFloat(existing.city_mrp) : null,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('product_city_availability')
        .upsert(payload, { onConflict: 'product_id,city_slug' })

      if (error) throw error

      setVisPcaMap(prev => ({ ...prev, [product.id]: payload }))
      setLocalOverrides(prev => ({
        ...prev,
        [product.id]: {
          ...(prev[product.id] || {}),
          is_available: nextAvailable
        }
      }))
      toast.success(`"${product.name}" marked as ${statusLabel} in this city`, { id: toastId })
    } catch (err) {
      console.error('Instant toggle error:', err)
      toast.error('Failed to update stock: ' + err.message, { id: toastId })
    }
  }

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

        // 1. Optimistic update: reflect changes instantly in the UI table
        setCities(prev => prev.map(c => c.id === editingCity.id ? { ...c, ...payload } : c))
      } else {
        const { data, error } = await supabase
          .from('operating_cities')
          .insert([payload])
          .select()

        if (error) throw error
        toast.success('City registered successfully!', { id: toastId })
        if (data && data[0]) {
          setCities(prev => [...prev, data[0]])
        }
      }

      // 2. Immediately close drawer and reset form so UI never hangs
      setIsDrawerOpen(false)
      resetForm()

      // 3. Background non-blocking sync
      fetchCities()

      // 4. Trigger sitemap ping ONLY on production (skips localhost to avoid connection stalls)
      if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
        try {
          fetch('/api/index-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productSlug: 'all', cities: [payload.slug] })
          }).catch(() => {})
        } catch (e) {}
      }
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
            onClick={async () => {
              await fetchCities()
              await fetchCityManagers()
            }}
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
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
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
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">City Managers</th>
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
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {getManagersForCity(city.id).map(manager => (
                              <span 
                                key={manager.id}
                                className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-950/40 text-purple-650 dark:text-purple-300 px-2.5 py-1 rounded-full text-xs font-semibold border border-purple-250/20 shadow-sm"
                                title={`${manager.email} | ${manager.phone || 'No phone'}`}
                              >
                                {manager.full_name}
                              </span>
                            ))}
                            {getManagersForCity(city.id).length === 0 && (
                              <span className="text-xs text-gray-400 italic">None Assigned</span>
                            )}
                            {isSuperAdmin && (
                              <button
                                onClick={() => {
                                  setSelectedCityForManagers(city)
                                  setShowManagersModal(true)
                                }}
                                className="p-1 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all active:scale-90"
                                title="Manage City Managers"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
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
              {/* Product Filters & Search Bar */}
              <div className="bg-gray-50/70 dark:bg-white/[0.02] p-4 rounded-2xl border border-gray-150 dark:border-white/5 space-y-3">
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                  {/* Search Input */}
                  <div className="relative w-full md:w-96">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <Search className="w-4.5 h-4.5" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search by name, brand, or barcode..."
                      value={prodSearch}
                      onChange={(e) => setProdSearch(e.target.value)}
                      className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-gray-250 dark:border-white/10 bg-white dark:bg-[#18181f] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ozo-red dark:text-white shadow-xs"
                    />
                    {prodSearch && (
                      <button
                        onClick={() => setProdSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Actions & Buttons */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
                    {/* Add Products from Global Catalogue Button */}
                    <button
                      onClick={() => {
                        setShowAddFromGlobalModal(true)
                        fetchGlobalModalProducts()
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gradient-ozo text-white font-black text-xs shadow-ozo hover:shadow-ozo-lg transition-all flex items-center gap-1.5 active:scale-95"
                      title="Add products from global master catalogue into this city"
                    >
                      <Plus className="w-4 h-4 stroke-[3px]" />
                      <span>+ Add Products From Global Catalogue</span>
                    </button>

                    {/* Emergency Mark All Out of Stock Button */}
                    <button
                      onClick={() => {
                        setShowMarkAllOosModal(true)
                        setAllOosConfirmInput('')
                        setAllOosAcknowledged(false)
                      }}
                      className="px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
                      title="Emergency: Mark all products in this city out of stock"
                    >
                      <AlertOctagon className="w-4 h-4 text-red-600 dark:text-red-400 stroke-[2.5px]" />
                      <span>Mark All Out of Stock</span>
                    </button>

                    {/* Restore All In Stock Button */}
                    <button
                      onClick={() => {
                        setShowMarkAllInStockModal(true)
                        setAllInStockAcknowledged(false)
                      }}
                      className="px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
                      title="Restore all products in this city to in-stock"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5px]" />
                      <span>Mark All In Stock</span>
                    </button>

                    <button
                      onClick={() => fetchVisibilityProducts()}
                      disabled={loadingVisProducts}
                      className="p-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 transition-all shadow-xs flex items-center gap-1.5 text-xs font-bold"
                      title="Refresh product list"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingVisProducts ? 'animate-spin text-ozo-red' : ''}`} />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  </div>
                </div>

                {/* Filter Dropdowns Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-gray-100 dark:border-white/5">
                  {/* Category Filter */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Category</label>
                    <select
                      value={prodCategory}
                      onChange={(e) => {
                        setProdCategory(e.target.value)
                        setProdPage(1)
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-white/10 bg-white dark:bg-[#18181f] text-xs font-bold text-gray-750 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-ozo-red cursor-pointer"
                    >
                      <option value="all">All Categories</option>
                      {visCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Brand Filter */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Brand</label>
                    <select
                      value={prodBrand}
                      onChange={(e) => {
                        setProdBrand(e.target.value)
                        setProdPage(1)
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-white/10 bg-white dark:bg-[#18181f] text-xs font-bold text-gray-750 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-ozo-red cursor-pointer"
                    >
                      <option value="all">All Brands</option>
                      {visBrands.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>

                  {/* City Stock Status Filter */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Stock Status in City</label>
                    <select
                      value={prodStockStatus}
                      onChange={(e) => {
                        setProdStockStatus(e.target.value)
                        setProdPage(1)
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-white/10 bg-white dark:bg-[#18181f] text-xs font-bold text-gray-750 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-ozo-red cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="in-stock">🟢 In Stock in this City</option>
                      <option value="out-of-stock">🔴 Out of Stock in this City</option>
                    </select>
                  </div>

                  {/* Page Size Filter */}
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block mb-1">Per Page</label>
                    <select
                      value={prodPageSize}
                      onChange={(e) => {
                        setProdPageSize(Number(e.target.value))
                        setProdPage(1)
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-gray-250 dark:border-white/10 bg-white dark:bg-[#18181f] text-xs font-bold text-gray-750 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-ozo-red cursor-pointer"
                    >
                      <option value={10}>10 items</option>
                      <option value={25}>25 items</option>
                      <option value={50}>50 items</option>
                      <option value={100}>100 items</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Floating Bulk Actions Bar */}
              <AnimatePresence>
                {selectedProdIds.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    className="p-3.5 bg-gray-900/95 dark:bg-[#111116]/95 backdrop-blur-md rounded-2xl border border-white/10 text-white shadow-xl flex flex-wrap items-center justify-between gap-3 sticky top-4 z-20"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-ozo-red/20 text-ozo-red border border-ozo-red/30 rounded-xl text-xs font-black flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5" />
                        {selectedProdIds.size} Selected
                      </span>
                      <button
                        onClick={toggleSelectAllVisible}
                        className="text-xs font-bold text-gray-300 hover:text-white underline transition-colors"
                      >
                        {visProducts.length > 0 && visProducts.every(p => selectedProdIds.has(p.id))
                          ? 'Deselect Page'
                          : 'Select All on Page'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        disabled={isBulkOperating}
                        onClick={() => handleBulkSetStock(false)}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                        title="Mark selected products as Out of Stock in this city"
                      >
                        {isBulkOperating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertOctagon className="w-3.5 h-3.5" />}
                        Mark Out of Stock
                      </button>

                      <button
                        disabled={isBulkOperating}
                        onClick={() => handleBulkSetStock(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                        title="Mark selected products as In Stock in this city"
                      >
                        {isBulkOperating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Mark In Stock
                      </button>

                      <button
                        disabled={isBulkOperating}
                        onClick={handleBulkResetOverrides}
                        className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                        title="Remove custom city overrides for selected products"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset to Global
                      </button>

                      <button
                        onClick={() => setSelectedProdIds(new Set())}
                        className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors ml-1"
                        title="Clear selection"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Products Overrides Table */}
              <div className="bg-white dark:bg-[#18181f] rounded-2xl border border-gray-150 dark:border-white/5 overflow-hidden shadow-xs">
                {loadingVisProducts ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-ozo-red" />
                    <span className="text-sm font-semibold text-gray-500">Loading catalog for {selectedCityForVisibility}...</span>
                  </div>
                ) : visProducts.length === 0 ? (
                  cityPcaCount === 0 && !prodSearch.trim() && prodCategory === 'all' && prodBrand === 'all' ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                      <div className="w-16 h-16 rounded-3xl bg-ozo-red/10 flex items-center justify-center text-ozo-red mb-4 shadow-sm">
                        <Package className="w-8 h-8" />
                      </div>
                      <h4 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                        No products added to {cities.find(c => c.slug === selectedCityForVisibility)?.name || selectedCityForVisibility} yet
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6 leading-relaxed">
                        To avoid showing other cities' stock, add your products in this city directly from the master catalogue.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          onClick={() => {
                            setShowAddFromGlobalModal(true)
                            fetchGlobalModalProducts()
                          }}
                          className="px-6 py-3 rounded-2xl bg-gradient-ozo text-white font-black text-sm shadow-ozo hover:shadow-ozo-lg transition-all flex items-center gap-2 active:scale-95"
                        >
                          <Plus className="w-4.5 h-4.5 stroke-[3px]" />
                          <span>Add your products in this city from global catalogue</span>
                        </button>
                        <button
                          onClick={handleImportAllCatalogToCity}
                          disabled={isImportingAll}
                          className="px-5 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold text-sm transition-all flex items-center gap-2"
                        >
                          {isImportingAll ? <Loader2 className="w-4 h-4 animate-spin text-ozo-red" /> : <Layers className="w-4 h-4" />}
                          <span>Import Entire Master Catalogue</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <AlertCircle className="w-10 h-10 text-gray-400 mb-2" />
                      <h4 className="text-sm font-bold text-gray-700 dark:text-white">No products found</h4>
                      <p className="text-xs text-gray-500 mt-1">Try refining search parameters or filters.</p>
                    </div>
                  )
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-150 dark:border-white/5 bg-gray-50/70 dark:bg-white/[0.01]">
                          <th className="p-3.5 text-center w-10">
                            <input
                              type="checkbox"
                              checked={visProducts.length > 0 && visProducts.every(p => selectedProdIds.has(p.id))}
                              onChange={toggleSelectAllVisible}
                              className="w-4 h-4 rounded accent-ozo-red cursor-pointer"
                              title="Select/Deselect all visible products"
                            />
                          </th>
                          <th className="p-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider w-1/3">Product details</th>
                          <th className="p-3.5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">City Stock Status</th>
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
                            is_available: pca ? pca.is_available : product.is_available,
                            is_featured: pca ? pca.is_featured : false,
                            city_price: pca && pca.city_price !== null ? pca.city_price.toString() : '',
                            city_mrp: pca && pca.city_mrp !== null ? pca.city_mrp.toString() : ''
                          }
                          const isSaving = savingProductId === product.id
                          const hasOverride = !!pca
                          const isSelected = selectedProdIds.has(product.id)
                          const effectiveAvailable = local.is_available ?? product.is_available

                          return (
                            <tr
                              key={product.id}
                              className={`transition-colors ${
                                isSelected
                                  ? 'bg-ozo-red/5 dark:bg-ozo-red/10'
                                  : 'hover:bg-gray-50/40 dark:hover:bg-white/[0.008]'
                              }`}
                            >
                              {/* Selection Checkbox */}
                              <td className="p-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectProduct(product.id)}
                                  className="w-4 h-4 rounded accent-ozo-red cursor-pointer"
                                />
                              </td>

                              {/* Product Details */}
                              <td className="p-3.5">
                                <div className="flex items-center gap-3">
                                  {product.image_url ? (
                                    <img
                                      src={product.image_url}
                                      alt={product.name}
                                      className="w-10 h-10 object-contain rounded-lg border border-gray-200 dark:border-white/5 p-0.5 bg-white dark:bg-black/20 shrink-0"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                                      <Package className="w-5 h-5 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1" title={product.name}>
                                      {product.name}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 font-semibold flex-wrap">
                                      {product.brand && (
                                        <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/5 rounded text-[11px]">
                                          Brand: {product.brand}
                                        </span>
                                      )}
                                      {product.barcode && (
                                        <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/5 rounded text-[10px] text-gray-400">
                                          #{product.barcode}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* City Stock Status - 1-Click Interactive Toggle */}
                              <td className="p-3.5 text-center">
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => handleInstantToggleAvailability(product, effectiveAvailable)}
                                  title={`Click to mark as ${effectiveAvailable ? 'Out of Stock' : 'In Stock'} in ${selectedCityForVisibility}`}
                                  className={`group px-3 py-1.5 rounded-full text-xs font-black transition-all inline-flex items-center gap-1.5 shadow-2xs border cursor-pointer active:scale-95 ${
                                    effectiveAvailable
                                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/30 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                                      : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-200/60 dark:border-rose-900/30 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full ${effectiveAvailable ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                                  <span>{effectiveAvailable ? 'IN STOCK' : 'OUT OF STOCK'}</span>
                                  <span className="text-[9px] opacity-60 font-medium">
                                    {hasOverride ? '(city)' : '(global)'}
                                  </span>
                                </button>
                              </td>

                              {/* Featured Toggle */}
                              <td className="p-3.5 text-center">
                                <input
                                  type="checkbox"
                                  disabled={isSaving}
                                  checked={local.is_featured}
                                  onChange={(e) => handleLocalOverrideChange(product.id, 'is_featured', e.target.checked)}
                                  className="w-4.5 h-4.5 accent-ozo-red rounded cursor-pointer"
                                />
                              </td>

                              {/* Base Prices */}
                              <td className="p-3.5 text-sm font-semibold text-gray-500">
                                <div>Price: ₹{parseFloat(product.price).toFixed(2)}</div>
                                <div>MRP: ₹{parseFloat(product.mrp).toFixed(2)}</div>
                              </td>

                              {/* City Overrides */}
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

                              {/* Actions */}
                              <td className="p-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleSaveProductOverride(product)}
                                    disabled={isSaving}
                                    className={`p-2 rounded-xl text-white shadow-xs transition-all ${
                                      isSaving
                                        ? 'bg-gray-400 dark:bg-zinc-800'
                                        : hasOverride
                                        ? 'bg-blue-650 hover:bg-blue-600'
                                        : 'bg-green-600 hover:bg-green-700'
                                    }`}
                                    title={hasOverride ? "Update Custom Pricing" : "Save Custom Pricing"}
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
                                      title="Reset to Base Global Settings"
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

              {/* Product Pagination Bar */}
              {prodTotalCount > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border border-gray-150 dark:border-white/5 rounded-2xl bg-gray-50/30 dark:bg-transparent">
                  <div className="flex items-center gap-2">
                    <button
                      disabled={prodPage === 1 || loadingVisProducts}
                      onClick={() => setProdPage(prev => Math.max(prev - 1, 1))}
                      className="px-4 py-2 text-xs font-bold border border-gray-200 dark:border-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 transition-all text-gray-650 dark:text-gray-300 shadow-2xs"
                    >
                      Previous
                    </button>
                    <button
                      disabled={prodPage * prodPageSize >= prodTotalCount || loadingVisProducts}
                      onClick={() => setProdPage(prev => prev + 1)}
                      className="px-4 py-2 text-xs font-bold border border-gray-200 dark:border-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 transition-all text-gray-650 dark:text-gray-300 shadow-2xs"
                    >
                      Next
                    </button>
                  </div>

                  <span className="text-xs font-bold text-gray-500">
                    Showing {(prodPage - 1) * prodPageSize + 1} - {Math.min(prodPage * prodPageSize, prodTotalCount)} of {prodTotalCount} products (Page {prodPage} of {Math.max(1, Math.ceil(prodTotalCount / prodPageSize))})
                  </span>
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

      {/* City Managers Modal */}
      <AnimatePresence>
        {showManagersModal && selectedCityForManagers && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowManagersModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            {/* Modal Box */}
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', duration: 0.4 }}
                className="w-full max-w-lg bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[85vh]"
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      City Managers
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Assign or remove managers for <span className="font-bold text-ozo-red">{selectedCityForManagers.name}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowManagersModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-505 hover:text-gray-700 dark:text-gray-400 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Search Manager */}
                <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#1a1a1a]">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-450">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search managers by name or email..."
                      value={managerSearchQuery}
                      onChange={(e) => setManagerSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
                    />
                    {managerSearchQuery && (
                      <button
                        onClick={() => setManagerSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Managers List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingManagers ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-ozo-red" />
                      <p className="text-xs text-gray-505 font-semibold">Loading managers list...</p>
                    </div>
                  ) : allCityManagers.length === 0 ? (
                    <div className="text-center py-10 text-gray-450 italic text-sm">
                      No users with the "City Manager" role found. Update user roles to City Manager first in User Management.
                    </div>
                  ) : (
                    (() => {
                      const filtered = allCityManagers.filter(m =>
                        m.full_name?.toLowerCase().includes(managerSearchQuery.toLowerCase()) ||
                        m.email?.toLowerCase().includes(managerSearchQuery.toLowerCase())
                      )
                      if (filtered.length === 0) {
                        return <div className="text-center py-8 text-gray-400 text-sm">No managers match search.</div>
                      }
                      return filtered.map(manager => {
                        const isAssigned = manager.user_roles?.some(r => r.role === 'city_manager' && r.city_id === selectedCityForManagers.id)
                        
                        return (
                          <div 
                            key={manager.id} 
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl hover:border-purple-200 dark:hover:border-purple-900/30 transition-all"
                          >
                            <div className="min-w-0 pr-4">
                              <p className="font-bold text-gray-850 dark:text-white truncate text-sm">
                                {manager.full_name}
                              </p>
                              <p className="text-xs text-gray-400 truncate mt-0.5">
                                {manager.email}
                              </p>
                              {manager.phone && (
                                <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                                  {manager.phone}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleToggleManagerAssignment(manager, isAssigned)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1.5 ${
                                isAssigned 
                                  ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100'
                                  : 'bg-gradient-ozo text-white shadow-ozo'
                              }`}
                            >
                              {isAssigned ? (
                                <>
                                  <X className="w-3.5 h-3.5" />
                                  Remove
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  Assign
                                </>
                              )}
                            </button>
                          </div>
                        )
                      })
                    })()
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] flex justify-end">
                  <button
                    onClick={() => setShowManagersModal(false)}
                    className="px-5 py-2.5 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/15 text-gray-700 dark:text-white text-sm font-bold rounded-xl transition-all active:scale-95"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}

        {/* Emergency Mark All Out of Stock Modal */}
        {showMarkAllOosModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#18181f] rounded-3xl border border-red-200 dark:border-red-900/50 shadow-2xl max-w-lg w-full overflow-hidden"
            >
              <div className="p-6 bg-red-50/50 dark:bg-red-950/20 border-b border-red-150 dark:border-red-900/40 flex items-start gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-2xl text-red-600 dark:text-red-400 shrink-0">
                  <AlertOctagon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-red-900 dark:text-red-200">
                    Emergency: Mark All Products Out of Stock
                  </h3>
                  <p className="text-xs text-red-700/80 dark:text-red-300/80 mt-1">
                    City: <span className="font-bold underline uppercase">{selectedCityForVisibility}</span>
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
                  <div className="font-black flex items-center gap-1.5 uppercase text-amber-700 dark:text-amber-400">
                    <AlertCircle className="w-4 h-4" /> Immediate Impact Warning
                  </div>
                  <p>• Every single product in <span className="font-bold">{selectedCityForVisibility}</span> will immediately show <span className="font-bold text-red-600">OUT OF STOCK</span> across the entire store and app.</p>
                  <p>• Customers will NOT be able to add items or place orders for this city.</p>
                  <p>• Runs safely in an atomic server query or non-blocking batch queue.</p>
                </div>

                {allOosProgress && (
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-150 dark:border-white/5 space-y-2">
                    <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-200">
                      <span>Queue Progress</span>
                      <span>{allOosProgress.current} / {allOosProgress.total} ({allOosProgress.percent}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-white/10 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-red-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${allOosProgress.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allOosAcknowledged}
                      onChange={(e) => setAllOosAcknowledged(e.target.checked)}
                      disabled={isMarkingAllOos}
                      className="mt-0.5 w-4.5 h-4.5 rounded accent-red-600 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 select-none">
                      I understand this will make all products unavailable to customers in {selectedCityForVisibility}.
                    </span>
                  </label>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">
                      Type <span className="text-red-600 font-mono font-bold select-all">{selectedCityForVisibility}</span> or CONFIRM:
                    </label>
                    <input
                      type="text"
                      value={allOosConfirmInput}
                      onChange={(e) => setAllOosConfirmInput(e.target.value)}
                      disabled={isMarkingAllOos}
                      placeholder={selectedCityForVisibility}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-250 dark:border-white/10 bg-white dark:bg-[#121217] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50/70 dark:bg-white/[0.02] border-t border-gray-150 dark:border-white/5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isMarkingAllOos}
                  onClick={() => setShowMarkAllOosModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    isMarkingAllOos ||
                    !allOosAcknowledged ||
                    (allOosConfirmInput.trim().toLowerCase() !== selectedCityForVisibility.toLowerCase() &&
                     allOosConfirmInput.trim().toUpperCase() !== 'CONFIRM')
                  }
                  onClick={handleMarkAllOutOfStock}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-red-600/20 transition-all flex items-center gap-2 active:scale-95"
                >
                  {isMarkingAllOos ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating in Queue...</span>
                    </>
                  ) : (
                    <>
                      <AlertOctagon className="w-4 h-4" />
                      <span>Confirm & Mark All Out of Stock</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Mark All In Stock Confirmation Modal */}
        {showMarkAllInStockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#18181f] rounded-3xl border border-emerald-200 dark:border-emerald-900/50 shadow-2xl max-w-lg w-full overflow-hidden"
            >
              <div className="p-6 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-150 dark:border-emerald-900/40 flex items-start gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-200">
                    Mark All Products In Stock
                  </h3>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-1">
                    City: <span className="font-bold underline uppercase">{selectedCityForVisibility}</span>
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  This will mark all active products as <span className="font-bold text-emerald-600">IN STOCK</span> for <span className="font-bold">{selectedCityForVisibility}</span>. Customers browsing in this city will immediately be able to purchase products.
                </p>

                <label className="flex items-start gap-2.5 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={allInStockAcknowledged}
                    onChange={(e) => setAllInStockAcknowledged(e.target.checked)}
                    disabled={isMarkingAllInStock}
                    className="mt-0.5 w-4.5 h-4.5 rounded accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 select-none">
                    I confirm that I want to mark all products in {selectedCityForVisibility} back in stock.
                  </span>
                </label>
              </div>

              <div className="p-4 bg-gray-50/70 dark:bg-white/[0.02] border-t border-gray-150 dark:border-white/5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isMarkingAllInStock}
                  onClick={() => setShowMarkAllInStockModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isMarkingAllInStock || !allInStockAcknowledged}
                  onClick={handleMarkAllInStock}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 active:scale-95"
                >
                  {isMarkingAllInStock ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Mark All In Stock</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Add Products from Global Master Catalogue Modal */}
        {showAddFromGlobalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#18181f] rounded-3xl border border-gray-150 dark:border-white/10 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-150 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Package className="w-5 h-5 text-ozo-red" />
                    Add Products from Global Master Catalogue
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Select products from master catalog to make available in <span className="font-bold text-ozo-red underline uppercase">{selectedCityForVisibility}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowAddFromGlobalModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filters Bar */}
              <div className="p-4 bg-gray-50/70 dark:bg-white/[0.02] border-b border-gray-150 dark:border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search name, brand, barcode..."
                    value={globalModalSearch}
                    onChange={(e) => setGlobalModalSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-250 dark:border-white/10 bg-white dark:bg-[#121217] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ozo-red dark:text-white"
                  />
                </div>
                <select
                  value={globalModalCategory}
                  onChange={(e) => {
                    setGlobalModalCategory(e.target.value)
                    setGlobalModalPage(1)
                  }}
                  className="px-3 py-2 rounded-xl border border-gray-250 dark:border-white/10 bg-white dark:bg-[#121217] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ozo-red dark:text-white cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {visCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select
                  value={globalModalBrand}
                  onChange={(e) => {
                    setGlobalModalBrand(e.target.value)
                    setGlobalModalPage(1)
                  }}
                  className="px-3 py-2 rounded-xl border border-gray-250 dark:border-white/10 bg-white dark:bg-[#121217] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ozo-red dark:text-white cursor-pointer"
                >
                  <option value="all">All Brands</option>
                  {visBrands.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Global Products List Table */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingGlobalModal ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-ozo-red" />
                    <span className="text-xs font-bold text-gray-500">Loading master catalogue...</span>
                  </div>
                ) : globalModalProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <AlertCircle className="w-10 h-10 text-gray-400 mb-2" />
                    <span className="text-sm font-bold text-gray-700 dark:text-white">No products found</span>
                    <span className="text-xs text-gray-500 mt-1">Try different search keywords or filters.</span>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-150 dark:border-white/5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={globalModalProducts.length > 0 && globalModalProducts.every(p => selectedGlobalProdIds.has(p.id))}
                            onChange={() => {
                              const allSelected = globalModalProducts.every(p => selectedGlobalProdIds.has(p.id))
                              setSelectedGlobalProdIds(prev => {
                                const next = new Set(prev)
                                if (allSelected) {
                                  globalModalProducts.forEach(p => next.delete(p.id))
                                } else {
                                  globalModalProducts.forEach(p => next.add(p.id))
                                }
                                return next
                              })
                            }}
                            className="w-4 h-4 rounded accent-ozo-red cursor-pointer"
                          />
                        </th>
                        <th className="p-3">Product</th>
                        <th className="p-3">Brand</th>
                        <th className="p-3">Base Price</th>
                        <th className="p-3">MRP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 dark:divide-white/5 text-xs">
                      {globalModalProducts.map(p => {
                        const isSelected = selectedGlobalProdIds.has(p.id)
                        return (
                          <tr
                            key={p.id}
                            onClick={() => {
                              setSelectedGlobalProdIds(prev => {
                                const next = new Set(prev)
                                if (next.has(p.id)) next.delete(p.id)
                                else next.add(p.id)
                                return next
                              })
                            }}
                            className={`hover:bg-gray-50/80 dark:hover:bg-white/[0.02] cursor-pointer transition-colors ${
                              isSelected ? 'bg-ozo-red/5' : ''
                            }`}
                          >
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedGlobalProdIds(prev => {
                                    const next = new Set(prev)
                                    if (next.has(p.id)) next.delete(p.id)
                                    else next.add(p.id)
                                    return next
                                  })
                                }}
                                className="w-4 h-4 rounded accent-ozo-red cursor-pointer"
                              />
                            </td>
                            <td className="p-3 font-semibold text-gray-800 dark:text-gray-200">
                              <div className="flex items-center gap-2.5">
                                {p.image_url && (
                                  <img src={p.image_url} alt="" className="w-8 h-8 object-contain rounded-lg border border-gray-100 dark:border-white/10 shrink-0" />
                                )}
                                <span className="line-clamp-1">{p.name}</span>
                              </div>
                            </td>
                            <td className="p-3 text-gray-500">{p.brand || '-'}</td>
                            <td className="p-3 font-bold text-gray-900 dark:text-white">₹{p.price}</td>
                            <td className="p-3 text-gray-400 line-through">₹{p.mrp}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Modal Pagination & Footer */}
              <div className="p-4 border-t border-gray-150 dark:border-white/5 bg-gray-50/70 dark:bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-gray-500 font-semibold">
                  {selectedGlobalProdIds.size} products selected | Total available: {globalModalTotalCount}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={globalModalPage <= 1}
                    onClick={() => setGlobalModalPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-xl border border-gray-250 dark:border-white/10 text-xs font-bold disabled:opacity-30"
                  >
                    Prev
                  </button>
                  <span className="text-xs font-bold px-2">Page {globalModalPage} of {Math.ceil(globalModalTotalCount / globalModalPageSize) || 1}</span>
                  <button
                    disabled={globalModalPage >= Math.ceil(globalModalTotalCount / globalModalPageSize)}
                    onClick={() => setGlobalModalPage(p => p + 1)}
                    className="px-3 py-1.5 rounded-xl border border-gray-250 dark:border-white/10 text-xs font-bold disabled:opacity-30"
                  >
                    Next
                  </button>

                  <button
                    onClick={handleAddSelectedFromGlobal}
                    disabled={selectedGlobalProdIds.size === 0 || isAddingFromGlobal}
                    className="ml-3 px-5 py-2.5 rounded-xl bg-gradient-ozo text-white font-bold text-xs shadow-ozo hover:shadow-ozo-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    {isAddingFromGlobal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 stroke-[3px]" />}
                    <span>Add {selectedGlobalProdIds.size > 0 ? selectedGlobalProdIds.size : ''} to {selectedCityForVisibility}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Cities
