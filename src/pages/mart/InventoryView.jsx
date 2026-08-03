import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useMartStore } from '../../stores/martStore'
import { supabase } from '../../lib/supabase'
import Papa from 'papaparse'
import toast from 'react-hot-toast'
import BulkImportWizard from './BulkImportWizard'
import BarcodeEnrichmentModal from '../../components/mart/BarcodeEnrichmentModal'
import {
  Search,
  Upload,
  RefreshCw,
  Package,
  ArrowLeft,
  Download,
  Info,
  Check,
  FileSpreadsheet,
  AlertTriangle,
  ChevronDown,
  Plus,
  X,
  Image,
  Loader2,
  Camera,
  Trash2,
  Sparkles
} from 'lucide-react'

const getLocalToolUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const paramPort = urlParams.get('local_port');
  if (paramPort && /^\d+$/.test(paramPort)) {
    localStorage.setItem('ozo_local_tool_port', paramPort);
    return `http://localhost:${paramPort}`;
  }
  const savedPort = localStorage.getItem('ozo_local_tool_port');
  if (savedPort && /^\d+$/.test(savedPort)) {
    return `http://localhost:${savedPort}`;
  }
  return 'http://localhost:5000';
};

const InventoryView = () => {
  const {
    currentMart,
    inventory,
    inventoryTotalCount,
    isLoadingInventory,
    fetchInventory,
    toggleStock,
    updatePrice,
    updateStockQuantity,
    importInventoryRows,
    fetchPendingProducts
  } = useMartStore()

  const filteredProducts = inventory || []

  // Local state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingPriceId, setEditingPriceId] = useState(null)
  const [tempPrice, setTempPrice] = useState('')
  const [editingStockId, setEditingStockId] = useState(null)
  const [tempStock, setTempStock] = useState('')
  const [hoveredImage, setHoveredImage] = useState(null)
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('all') // 'all' | 'in_stock' | 'out_of_stock'

  // Photo enrichment capture states
  const [enrichmentProduct, setEnrichmentProduct] = useState(null)
  const [isEnrichmentModalOpen, setIsEnrichmentModalOpen] = useState(false)

  // Pending / Draft Queue local states
  const [inventorySubView, setInventorySubView] = useState('active') // 'active' | 'pending'
  const [pendingProducts, setPendingProducts] = useState([])
  const [isLoadingPending, setIsLoadingPending] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [enrichingPendingProduct, setEnenrichingPendingProduct] = useState(null)
  const [isEnenrichingPendingModalOpen, setIsEnenrichingPendingModalOpen] = useState(false)

  // Bulk CSV Import State
  const [showUploader, setShowUploader] = useState(false)
  const [hasClosedUploader, setHasClosedUploader] = useState(false)

  // Single Product Add State
  const [showSingleProductModal, setShowSingleProductModal] = useState(false)
  const [singleProductMode, setSingleProductMode] = useState('catalog') // 'catalog' or 'new'
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogResults, setCatalogResults] = useState([])
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState(null)
  const [categories, setCategories] = useState([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)

  const [imageErrors, setImageErrors] = useState({})

  const [catalogForm, setCatalogForm] = useState({
    stock_quantity: '0',
    mart_price: '',
    mart_mrp: ''
  })

  const [newProductForm, setNewProductForm] = useState({
    name: '',
    brand: '',
    unit: '',
    category_id: '',
    barcode: '',
    price: '',
    mrp: '',
    image_url: '',
    stock_quantity: '0',
  })

  // Image Search State for Custom Products
  const [imageSearchQuery, setImageSearchQuery] = useState('')
  const [imageSearchResults, setImageSearchResults] = useState([])
  const [isSearchingImages, setIsSearchingImages] = useState(false)
  const [showImageSearchGrid, setShowImageSearchGrid] = useState(false)

  // Searchable Category Dropdown States
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
  const [categorySearchQuery, setCategorySearchQuery] = useState('')
  const categoryDropdownRef = useRef(null)

  // Searchable Category Filter Dropdown States
  const [isFilterCategoryDropdownOpen, setIsFilterCategoryDropdownOpen] = useState(false)
  const [filterCategorySearchQuery, setFilterCategorySearchQuery] = useState('')
  const filterCategoryDropdownRef = useRef(null)

  // Dynamic download URL state for Localhost Image Tool
  const [downloadUrl, setDownloadUrl] = useState('')

  // Localhost Image Tool integration states
  const [localToolState, setLocalToolState] = useState({
    online: false,
    status: 'offline',
    processed: 0,
    total: 0,
    currentProduct: '',
    lockedConfig: null
  })

  const isImportMode = showUploader || (inventoryTotalCount === 0 && pendingProducts.length === 0 && !showLowStockOnly && !isLoadingInventory && searchQuery === '' && !hasClosedUploader)

  const selectedCategoryName = categories.find(cat => cat.id === newProductForm.category_id)?.name || ''
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
  )

  const selectedFilterCategoryName = categories.find(cat => cat.id === selectedCategoryId)?.name || ''
  const filteredFilterCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(filterCategorySearchQuery.toLowerCase())
  )

  // Poll Localhost Image Tool status (Disabled to prevent console noise)
  useEffect(() => {
    // Localhost port detection and status polling disabled
  }, [])

  const startLocalPipeline = async () => {
    if (!currentMart || !currentMart.id) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${getLocalToolUrl()}/api/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mart_id: currentMart.id,
          mart_name: currentMart.name,
          access_token: token
        })
      })
      if (res.ok) {
        toast.success('Started local image auto-finder!')
      } else {
        const errData = await res.json()
        toast.error(errData.error || 'Failed to start local tool')
      }
    } catch (err) {
      toast.error('Could not communicate with local tool')
    }
  }

  const pauseLocalPipeline = async () => {
    try {
      const res = await fetch(`${getLocalToolUrl()}/api/pause`, { method: 'POST' })
      if (res.ok) {
        toast.success('Paused local image finder')
      }
    } catch (err) {
      toast.error('Failed to communicate with local tool')
    }
  }

  const resumeLocalPipeline = async () => {
    try {
      const res = await fetch(`${getLocalToolUrl()}/api/resume`, { method: 'POST' })
      if (res.ok) {
        toast.success('Resumed local image finder')
      }
    } catch (err) {
      toast.error('Failed to communicate with local tool')
    }
  }

  const stopLocalPipeline = async () => {
    try {
      const res = await fetch(`${getLocalToolUrl()}/api/stop`, { method: 'POST' })
      if (res.ok) {
        toast.success('Stopping local image finder...')
      }
    } catch (err) {
      toast.error('Failed to communicate with local tool')
    }
  }

  // Fetch download URL config on mount
  useEffect(() => {
    const fetchImageToolConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'image_tool_config')
          .single()
        if (data && data.value && data.value.download_url) {
          setDownloadUrl(data.value.download_url)
        }
      } catch (err) {
        console.error('Error fetching image tool config:', err)
      }
    }
    fetchImageToolConfig()
  }, [])

  // Connect and lock the Localhost Image Tool to this mart on mount/change
  useEffect(() => {
    if (!currentMart || !currentMart.id) return

    const handshakeLocalhostTool = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        const res = await fetch(`${getLocalToolUrl()}/api/config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            mart_id: currentMart.id,
            mart_name: currentMart.name,
            access_token: token
          })
        })
        if (res.ok) {
          console.log('✅ Localhost Image Tool successfully locked to store:', currentMart.name)
        }
      } catch (err) {
        // Silent catch: localhost tool might not be running, which is fine
      }
    }

    handshakeLocalhostTool()
  }, [currentMart])


  const handleSearchImages = async (customQuery) => {
    const q = (customQuery !== undefined ? customQuery : imageSearchQuery).trim()
    if (!q) {
      toast.error('Please enter a product name or search term first')
      return
    }
    setIsSearchingImages(true)
    setShowImageSearchGrid(true)
    try {
      const barcodeParam = newProductForm.barcode?.trim() ? `&barcode=${encodeURIComponent(newProductForm.barcode.trim())}` : ''
      const res = await fetch(`/api/search-image?q=${encodeURIComponent(q)}${barcodeParam}`)
      if (!res.ok) {
        throw new Error('Failed to fetch images')
      }
      const data = await res.json()
      setImageSearchResults(data.results || [])
    } catch (err) {
      console.error('Error searching images:', err)
      toast.error('Failed to load images. Try typing a different search query.')
    } finally {
      setIsSearchingImages(false)
    }
  }

  // Clear image search and category dropdown when modal closes
  useEffect(() => {
    if (!showSingleProductModal) {
      setImageSearchQuery('')
      setImageSearchResults([])
      setIsSearchingImages(false)
      setShowImageSearchGrid(false)
      setIsCategoryDropdownOpen(false)
      setCategorySearchQuery('')
    }
  }, [showSingleProductModal])

  // Click outside category dropdowns to close them
  useEffect(() => {
    function handleClickOutside(event) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setIsCategoryDropdownOpen(false)
      }
      if (filterCategoryDropdownRef.current && !filterCategoryDropdownRef.current.contains(event.target)) {
        setIsFilterCategoryDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true)
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .order('name')
        if (error) throw error
        setCategories(data || [])
      } catch (err) {
        console.error('Error fetching categories:', err)
      } finally {
        setIsLoadingCategories(false)
      }
    }
    fetchCategories()
  }, [])

  // Catalog live search
  useEffect(() => {
    if (!catalogSearch.trim()) {
      setCatalogResults([])
      return
    }
    if (selectedCatalogProduct && selectedCatalogProduct.name === catalogSearch) {
      return
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, brand, unit, mrp, price, image_url, barcode')
          .or(`name.ilike.%${catalogSearch}%,brand.ilike.%${catalogSearch}%,barcode.ilike.%${catalogSearch}%`)
          .limit(10)
        if (error) throw error
        setCatalogResults(data || [])
      } catch (err) {
        console.error('Catalog search failed:', err)
      }
    }, 300)
    return () => clearTimeout(delayDebounce)
  }, [catalogSearch, selectedCatalogProduct])

  const refreshInventory = useCallback(() => {
    fetchInventory(currentPage, 20, debouncedSearchQuery, showLowStockOnly, selectedCategoryId, availabilityFilter)
  }, [currentPage, debouncedSearchQuery, showLowStockOnly, selectedCategoryId, availabilityFilter, fetchInventory])

  const loadPending = useCallback(async () => {
    if (!currentMart) return
    setIsLoadingPending(true)
    try {
      const data = await fetchPendingProducts()
      setPendingProducts(data || [])
      setPendingCount(data?.length || 0)
    } catch (err) {
      console.error('Failed to load pending products:', err)
    } finally {
      setIsLoadingPending(false)
    }
  }, [currentMart, fetchPendingProducts])

  useEffect(() => {
    if (currentMart) {
      loadPending()
    }
  }, [currentMart, loadPending])

  const handleEnrichPendingComplete = async (enrichedProd) => {
    if (!currentMart || !enrichingPendingProduct) return

    try {
      let productId = enrichedProd.id
      if (!productId && enrichedProd.barcode) {
        const { data: pData, error: pErr } = await supabase
          .from('products')
          .select('id')
          .eq('barcode', enrichedProd.barcode)
          .maybeSingle()
        if (pErr) throw pErr
        productId = pData?.id
      }

      if (!productId && enrichedProd.slug) {
        const slug = enrichedProd.slug
        const { data: pData, error: pErr } = await supabase
          .from('products')
          .select('id')
          .eq('slug', slug)
          .maybeSingle()
        if (pErr) throw pErr
        productId = pData?.id
      }

      if (!productId) {
        throw new Error('Could not resolve product catalog reference.')
      }

      // Add/upsert to mart_inventory
      const { error: invErr } = await supabase
        .from('mart_inventory')
        .upsert({
          mart_id: currentMart.id,
          product_id: productId,
          stock_quantity: parseInt(enrichedProd.stock_quantity) || 0,
          mart_price: parseFloat(enrichedProd.price) || null,
          mart_mrp: parseFloat(enrichedProd.mrp) || null,
          is_available: (parseInt(enrichedProd.stock_quantity) || 0) > 0,
          updated_at: new Date().toISOString()
        }, { onConflict: 'mart_id,product_id' })

      if (invErr) throw invErr

      // Mark the pending product as completed
      const { error: pendErr } = await supabase
        .from('mart_pending_products')
        .update({ enrich_status: 'completed' })
        .eq('id', enrichingPendingProduct.id)

      if (pendErr) throw pendErr

      toast.success('Product successfully enriched and imported to inventory!')
      
      // Cleanup & Refresh
      setEnenrichingPendingProduct(null)
      setIsEnenrichingPendingModalOpen(false)
      loadPending()
      refreshInventory()
    } catch (err) {
      console.error('Enrich pending product complete error:', err)
      toast.error('Failed to import enriched product: ' + err.message)
    }
  }

  const handleRemovePending = async (pendingId) => {
    if (!confirm('Are you sure you want to remove this item from the pending list?')) return
    try {
      const { error } = await supabase
        .from('mart_pending_products')
        .delete()
        .eq('id', pendingId)
      if (error) throw error
      toast.success('Removed from pending list')
      loadPending()
    } catch (err) {
      console.error('Error removing pending product:', err)
      toast.error('Failed to remove: ' + err.message)
    }
  }

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategoryId, availabilityFilter, showLowStockOnly])

  // Fetch inventory
  useEffect(() => {
    if (currentMart) {
      refreshInventory()
    }
  }, [currentMart, refreshInventory])

  const handlePriceSave = async (id) => {
    await updatePrice(id, tempPrice)
    setEditingPriceId(null)
  }

  const handlePriceCancel = () => {
    setEditingPriceId(null)
  }

  const handleStockSave = async (id) => {
    await updateStockQuantity(id, tempStock)
    setEditingStockId(null)
  }

  const handleStockCancel = () => {
    setEditingStockId(null)
  }

  const handleStatusToggle = async (product) => {
    if (product.is_available) {
      const confirmed = window.confirm(`Are you sure you want to mark "${product.name}" as Out of Stock? This will set its stock quantity to 0.`)
      if (!confirmed) return
      await updateStockQuantity(product.id, 0)
    } else {
      const qtyStr = window.prompt(`Enter stock quantity for "${product.name}":`, "10")
      if (qtyStr === null) return
      const qty = parseInt(qtyStr, 10)
      if (isNaN(qty) || qty <= 0) {
        toast.error('Please enter a valid stock quantity greater than 0.')
        return
      }
      await updateStockQuantity(product.id, qty)
    }
  }

  const handleAddCatalogProduct = async (e) => {
    e.preventDefault()
    if (!selectedCatalogProduct) {
      toast.error('Please select a product from the catalog')
      return
    }
    if (!currentMart) {
      toast.error('No mart selected')
      return
    }

    try {
      const stock = parseInt(catalogForm.stock_quantity) || 0
      const martPrice = catalogForm.mart_price ? parseFloat(catalogForm.mart_price) : null
      const martMrp = catalogForm.mart_mrp ? parseFloat(catalogForm.mart_mrp) : null

      const { error } = await supabase
        .from('mart_inventory')
        .upsert({
          mart_id: currentMart.id,
          product_id: selectedCatalogProduct.id,
          stock_quantity: stock,
          mart_price: martPrice,
          mart_mrp: martMrp,
          is_available: stock > 0,
          updated_at: new Date().toISOString()
        }, { onConflict: 'mart_id,product_id' })

      if (error) throw error

      toast.success('Product added to inventory successfully!')
      setShowSingleProductModal(false)
      setSelectedCatalogProduct(null)
      setCatalogSearch('')
      setCatalogForm({ stock_quantity: '0', mart_price: '', mart_mrp: '' })
      
      // Refresh inventory
      refreshInventory()
    } catch (err) {
      console.error('Failed to add catalog product:', err)
      toast.error('Failed to add product: ' + err.message)
    }
  }

  const handleAddCustomProduct = async (e) => {
    e.preventDefault()
    if (!newProductForm.name.trim()) {
      toast.error('Product Name is required')
      return
    }
    if (!newProductForm.unit.trim()) {
      toast.error('Unit (e.g. 1 kg) is required')
      return
    }
    if (!newProductForm.category_id) {
      toast.error('Category is required')
      return
    }
    if (!newProductForm.price || !newProductForm.mrp) {
      toast.error('Base Price and MRP are required')
      return
    }
    if (!currentMart) {
      toast.error('No mart selected')
      return
    }

    try {
      if (newProductForm.barcode.trim()) {
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('barcode', newProductForm.barcode.trim())
          .maybeSingle()
        if (existing) {
          toast.error('A product with this barcode already exists in the catalog. Try searching for it!')
          return
        }
      }

      const baseSlug = newProductForm.name.toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
      const slug = `${baseSlug}-${Date.now()}`

      const newProductPayload = {
        name: newProductForm.name.trim(),
        slug,
        brand: newProductForm.brand.trim() || null,
        unit: newProductForm.unit.trim(),
        category_id: newProductForm.category_id,
        price: parseFloat(newProductForm.price),
        mrp: parseFloat(newProductForm.mrp),
        barcode: newProductForm.barcode.trim() || null,
        image_url: newProductForm.image_url.trim() || null,
        is_available: true,
        mart_id: currentMart.id
      }

      const { data: createdProduct, error: productError } = await supabase
        .from('products')
        .insert(newProductPayload)
        .select()
        .single()

      if (productError) throw productError

      const stock = parseInt(newProductForm.stock_quantity) || 0
      const martPrice = newProductForm.mart_price ? parseFloat(newProductForm.mart_price) : parseFloat(newProductForm.price)
      const martMrp = newProductForm.mart_mrp ? parseFloat(newProductForm.mart_mrp) : parseFloat(newProductForm.mrp)

      const { error: inventoryError } = await supabase
        .from('mart_inventory')
        .insert({
          mart_id: currentMart.id,
          product_id: createdProduct.id,
          stock_quantity: stock,
          mart_price: martPrice,
          mart_mrp: martMrp,
          is_available: stock > 0,
          updated_at: new Date().toISOString()
        })

      if (inventoryError) throw inventoryError

      toast.success('Custom product created and added successfully!')
      setShowSingleProductModal(false)

      const createdBarcode = createdProduct?.barcode
      const shouldOpenCapture = !newProductForm.image_url && createdBarcode

      setNewProductForm({
        name: '',
        brand: '',
        unit: '',
        category_id: '',
        barcode: '',
        price: '',
        mrp: '',
        image_url: '',
        stock_quantity: '0',
        mart_price: '',
        mart_mrp: ''
      })
      
      refreshInventory()

      if (shouldOpenCapture) {
        setEnrichmentProduct(createdProduct)
        setIsEnrichmentModalOpen(true)
      }
    } catch (err) {
      console.error('Failed to create custom product:', err)
      toast.error('Failed to create product: ' + err.message)
    }
  }



  const renderLocalToolWidget = () => {
    const { online, status, processed, total, currentProduct } = localToolState

    if (!online) {
      return (
        <div className="mb-6 bg-gradient-to-r from-blue-950/15 to-indigo-950/15 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-500/20 dark:border-blue-400/20 rounded-2xl p-5 font-sans relative overflow-hidden shadow-lg shadow-blue-500/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Status Info */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center text-blue-500 dark:text-blue-400">
                  <Download className="h-5 w-5 animate-bounce" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-gray-400 rounded-full border-2 border-white dark:border-slate-950" />
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Local Image Finder</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md font-extrabold uppercase bg-gray-500/20 text-gray-500">
                    Offline
                  </span>
                </div>
                
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                  Automate missing product images directly from your desktop.
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Connect the local helper tool to scan missing images and auto-resolve using barcodes.
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
              {downloadUrl ? (
                <a
                  href={downloadUrl}
                  download="OzoMartImageTool.exe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full md:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl text-center transition-all cursor-pointer shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Desktop Assistant
                </a>
              ) : (
                <span className="text-xs text-gray-400 italic">Download link not configured.</span>
              )}
            </div>
          </div>
        </div>
      )
    }

    const isRunning = status === 'running'
    const isPaused = status === 'paused'
    const percent = total > 0 ? Math.round((processed / total) * 100) : 0

    return (
      <div className="mb-6 bg-gradient-to-r from-blue-950/10 to-teal-950/10 dark:from-blue-950/30 dark:to-teal-950/30 border border-blue-500/20 dark:border-blue-500/20 rounded-2xl p-5 font-sans relative overflow-hidden shadow-lg shadow-blue-500/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Info */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-xl bg-blue-600/10 dark:bg-blue-600/10 flex items-center justify-center text-blue-500 dark:text-blue-500">
                {isRunning ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Package className="h-5 w-5" />
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-blue-600 dark:bg-blue-600 rounded-full border-2 border-white dark:border-slate-950 animate-pulse" />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest">Local Image Finder</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold uppercase ${
                  isRunning ? 'bg-blue-600/20 text-blue-600 dark:text-blue-500' :
                  isPaused ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                  'bg-gray-500/20 text-gray-500'
                }`}>
                  {status}
                </span>
              </div>
              
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                {isRunning 
                  ? `Automating product images...` 
                  : `Desktop app connected and ready.`
                }
              </h3>
              
              {isRunning && currentProduct && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Current: <span className="font-semibold text-gray-855 dark:text-gray-200">{currentProduct}</span>
                </p>
              )}
            </div>
          </div>

          {/* Progress & Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
            {total > 0 && (
              <div className="flex-1 sm:w-48">
                <div className="flex justify-between text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  <span>Progress</span>
                  <span>{processed} / {total} ({percent}%)</span>
                </div>
                <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-teal-400 dark:from-blue-500 dark:to-teal-450 transition-all duration-500 rounded-full" 
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              {isRunning ? (
                <>
                  <button
                    onClick={pauseLocalPipeline}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Pause
                  </button>
                  <button
                    onClick={stopLocalPipeline}
                    className="px-3.5 py-2 bg-red-650 hover:bg-red-750 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Stop
                  </button>
                </>
              ) : isPaused ? (
                <>
                  <button
                    onClick={resumeLocalPipeline}
                    className="px-3.5 py-2 bg-blue-600 dark:bg-blue-600 dark:text-black hover:bg-blue-700 dark:hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Resume
                  </button>
                  <button
                    onClick={stopLocalPipeline}
                    className="px-3.5 py-2 bg-red-650 hover:bg-red-750 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Stop
                  </button>
                </>
              ) : (
                <button
                  onClick={startLocalPipeline}
                  className="px-4 py-2.5 bg-blue-600 dark:bg-blue-600 dark:text-black hover:bg-blue-700 dark:hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-500/10"
                >
                  Start Automating Images
                </button>
              )}

              <a
                href={getLocalToolUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Open Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-4 lg:p-8 overflow-hidden bg-gray-50 dark:bg-slate-950 pb-3 lg:pb-8">
      {/* Control Bar */}
      {!isImportMode && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white font-sans">Mart Inventory Controls</h2>
            <p className="hidden sm:block text-sm text-gray-550 dark:text-gray-400 mt-0.5 font-sans">Directly toggle item stock status or edit prices instantly.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Search Bar (First on mobile for easy access) */}
            <div className="relative w-full lg:w-80 order-first sm:order-last">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-555 w-4 h-4" />
              <input
                type="text"
                placeholder="Search products by name/brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl py-2 pl-10 pr-4 text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors font-sans shadow-sm"
              />
            </div>

            {/* Compact Action Buttons Row */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto shrink-0">
              {/* Low Stock Toggle */}
              <button
                onClick={() => {
                  setShowLowStockOnly(prev => !prev)
                  setCurrentPage(1)
                }}
                className={`flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold transition-all px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border cursor-pointer font-sans whitespace-nowrap flex-1 sm:flex-none ${
                  showLowStockOnly
                    ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold shadow-sm shadow-amber-500/5'
                    : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-850'
                }`}
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${showLowStockOnly ? 'text-amber-500 animate-bounce' : 'text-gray-400 dark:text-gray-550'}`} />
                <span>Low Stock</span>
              </button>

              {/* Add Single Product Button */}
              <button
                onClick={() => {
                  setShowSingleProductModal(true)
                }}
                className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-black transition-colors px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-transparent cursor-pointer font-sans whitespace-nowrap flex-1 sm:flex-none"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </button>

              {/* Bulk Import Button */}
              <button
                onClick={() => {
                  setShowUploader(true)
                  setHasClosedUploader(false)
                }}
                className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-600 transition-colors bg-blue-50 dark:bg-blue-600/10 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-blue-100 dark:border-blue-500/20 cursor-pointer font-sans whitespace-nowrap flex-1 sm:flex-none"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </button>
            </div>
          </div>
        </div>)}

      {/* Inventory Container */}
      {isImportMode ? (
        <BulkImportWizard
          categories={categories}
          localToolState={localToolState}
          startLocalPipeline={startLocalPipeline}
          fetchInventory={fetchInventory}
          onClose={() => {
            setShowUploader(false)
            setHasClosedUploader(true)
          }}
        />
      ) : (
        /* Inventory Table Container */
        <div className="flex-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          {/* Tab Selector */}
          <div className="flex border-b border-gray-200 dark:border-slate-800 bg-gray-50/20 dark:bg-slate-900/10">
            <button
              onClick={() => setInventorySubView('active')}
              className={`flex-1 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                inventorySubView === 'active'
                  ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-500 bg-blue-600/[0.02]'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50/50 dark:hover:bg-slate-850/50'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Active Inventory ({inventoryTotalCount})</span>
            </button>
            <button
              onClick={() => {
                setInventorySubView('pending')
                loadPending()
              }}
              className={`flex-1 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 relative ${
                inventorySubView === 'pending'
                  ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-500 bg-blue-600/[0.02]'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50/50 dark:hover:bg-slate-850/50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Pending / Draft Queue</span>
              {pendingCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>

          {inventorySubView === 'active' ? (
            <>
              {/* Filters Bar */}
              <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-550 dark:text-gray-400 font-sans">Filters</span>
                  {(selectedCategoryId || availabilityFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setSelectedCategoryId('')
                        setAvailabilityFilter('all')
                      }}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 transition-colors flex items-center gap-1 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Category Searchable Dropdown */}
                  <div className="relative flex-1 sm:w-56" ref={filterCategoryDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsFilterCategoryDropdownOpen(!isFilterCategoryDropdownOpen)}
                      className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl py-2 pl-3 pr-9 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors font-sans cursor-pointer flex items-center justify-between"
                    >
                      <span className="truncate">
                        {selectedFilterCategoryName || "All Categories"}
                      </span>
                      <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 transition-transform duration-200 ${isFilterCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isFilterCategoryDropdownOpen && (
                      <div className="absolute left-0 sm:left-auto right-0 z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl p-2.5 space-y-2.5 max-h-64 overflow-hidden flex flex-col animate-fadeIn">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-550 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search category..."
                            value={filterCategorySearchQuery}
                            onChange={(e) => setFilterCategorySearchQuery(e.target.value)}
                            className="w-full bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 rounded-lg pl-9 pr-8 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none"
                            autoFocus
                          />
                          {filterCategorySearchQuery && (
                            <button
                              type="button"
                              onClick={() => setFilterCategorySearchQuery("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div className="overflow-y-auto max-h-40 space-y-1 pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategoryId('')
                              setIsFilterCategoryDropdownOpen(false)
                              setFilterCategorySearchQuery('')
                            }}
                            className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                              !selectedCategoryId
                                ? 'bg-blue-600/10 text-blue-600 dark:text-blue-500 font-bold'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-55 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span>All Categories</span>
                            {!selectedCategoryId && <Check className="w-3.5 h-3.5" />}
                          </button>

                          {filteredFilterCategories.length === 0 ? (
                            <div className="text-gray-400 dark:text-gray-500 text-xs py-3 text-center">No categories found</div>
                          ) : (
                            filteredFilterCategories.map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCategoryId(cat.id)
                                  setIsFilterCategoryDropdownOpen(false)
                                  setFilterCategorySearchQuery('')
                                }}
                                className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center justify-between ${
                                  selectedCategoryId === cat.id
                                    ? 'bg-blue-600/10 text-blue-600 dark:text-blue-500 font-bold'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-55 dark:hover:bg-slate-800'
                                }`}
                              >
                                <span className="truncate">{cat.name}</span>
                                {selectedCategoryId === cat.id && <Check className="w-3.5 h-3.5" />}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Select */}
                  <div className="relative flex-1 sm:w-40">
                    <select
                      value={availabilityFilter}
                      onChange={(e) => setAvailabilityFilter(e.target.value)}
                      className="w-full appearance-none bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl py-2 pl-3 pr-9 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors font-sans cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="in_stock">In Stock</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {isLoadingInventory ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-4 border-t-blue-500 dark:border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-550 dark:text-gray-400 text-sm">Fetching stock ledger...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-8">
                    <Package className="w-12 h-12 text-gray-400 dark:text-gray-700 mb-2" />
                    <p className="text-gray-700 dark:text-gray-400 font-bold">No products found</p>
                    <p className="text-xs text-gray-555 dark:text-gray-600 mt-1">Try resetting your search query.</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop View Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[650px] lg:min-w-0">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-55 dark:bg-slate-900">
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-550 dark:text-gray-400">Product Detail</th>
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400">Brand</th>
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400">Category</th>
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400">Sales Price (₹)</th>
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400">MRP (₹)</th>
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400">Stock Qty</th>
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400 text-center">Status</th>
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400 text-center">Capture</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                          {filteredProducts.map(product => (
                            <tr 
                              key={product.id} 
                              className={`hover:bg-gray-55 dark:hover:bg-slate-880 transition-colors group ${
                                product.stock_quantity < 5 
                                  ? 'bg-amber-500/[0.03] dark:bg-amber-500/[0.015] border-l-2 border-l-amber-500/40 dark:border-l-amber-500/20' 
                                  : ''
                              }`}
                            >
                              {/* Details */}
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  {product.image_url && !imageErrors[product.id] ? (
                                    <img 
                                      src={product.image_url} 
                                      alt={product.name} 
                                      className="w-10 h-10 object-contain bg-gray-100 dark:bg-slate-880 rounded-lg p-1 cursor-zoom-in transition-transform duration-200 hover:scale-105 active:scale-95"
                                      onError={() => setImageErrors(prev => ({ ...prev, [product.id]: true }))}
                                      onMouseEnter={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect()
                                        setHoveredImage({ url: product.image_url, name: product.name, rect })
                                      }}
                                      onMouseLeave={() => setHoveredImage(null)}
                                    />
                                  ) : (
                                    <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/20 rounded-lg flex items-center justify-center border border-amber-200 dark:border-amber-900/40 text-amber-600 dark:text-amber-500" title="Missing photo - Enrich required">
                                      <AlertTriangle className="w-5 h-5" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-bold text-sm text-gray-800 dark:text-gray-250 group-hover:text-gray-905 dark:group-hover:text-white transition-colors">
                                      {product.name}
                                    </p>
                                    <p className="text-xs text-gray-555 mt-0.5">
                                      Unit size: {product.unit}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Brand */}
                              <td className="p-4 text-sm font-semibold text-gray-800 dark:text-gray-305">
                                {product.brand || 'OZO Choice'}
                              </td>

                              {/* Category */}
                              <td className="p-4 text-sm font-semibold text-gray-800 dark:text-gray-305">
                                {categories.find(cat => cat.id === product.category_id)?.name || 'N/A'}
                              </td>

                              {/* Sales Price with inline editor */}
                              <td className="p-4">
                                {editingPriceId === product.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={tempPrice}
                                      onChange={(e) => setTempPrice(e.target.value)}
                                      className="w-20 bg-gray-55 dark:bg-slate-855 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm text-gray-955 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 font-bold font-mono"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handlePriceSave(product.id)}
                                      className="px-2 py-1 bg-blue-600 dark:bg-blue-600 text-white dark:text-black rounded text-xs font-bold hover:bg-blue-700 dark:hover:bg-blue-700 cursor-pointer"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={handlePriceCancel}
                                      className="px-2 py-1 bg-gray-100 dark:bg-slate-750 text-gray-700 dark:text-gray-400 rounded text-xs font-semibold hover:text-gray-905 dark:hover:text-white cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 group-hover:translate-x-0.5 transition-transform">
                                    <span className="font-bold text-sm text-blue-600 dark:text-blue-505 font-mono">
                                      ₹{product.price.toFixed(2)}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setEditingPriceId(product.id)
                                        setTempPrice(product.price.toString())
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white underline cursor-pointer"
                                    >
                                      Edit Price
                                    </button>
                                  </div>
                                )}
                              </td>

                               {/* MRP */}
                              <td className="p-4 text-sm font-extrabold font-mono text-gray-805 dark:text-gray-305">
                                ₹{product.mrp.toFixed(2)}
                              </td>

                              {/* Stock Qty with inline editor */}
                              <td className="p-4">
                                {editingStockId === product.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      min="0"
                                      step="1"
                                      value={tempStock}
                                      onChange={(e) => setTempStock(e.target.value)}
                                      className="w-16 bg-gray-55 dark:bg-slate-855 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm text-gray-955 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 font-bold font-mono"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleStockSave(product.id)}
                                      className="px-2 py-1 bg-blue-600 dark:bg-blue-600 text-white dark:text-black rounded text-xs font-bold hover:bg-blue-700 dark:hover:bg-blue-700 cursor-pointer"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={handleStockCancel}
                                      className="px-2 py-1 bg-gray-100 dark:bg-slate-750 text-gray-700 dark:text-gray-400 rounded text-xs font-semibold hover:text-gray-905 dark:hover:text-white cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 group-hover:translate-x-0.5 transition-transform">
                                      <span className={`font-bold text-sm font-mono ${product.stock_quantity < 5 ? 'text-amber-600 dark:text-amber-405 font-extrabold' : 'text-gray-800 dark:text-gray-300'}`}>
                                        {product.stock_quantity ?? 0}
                                      </span>
                                      <button
                                        onClick={() => {
                                          setEditingStockId(product.id)
                                          setTempStock((product.stock_quantity ?? 0).toString())
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-555 dark:text-gray-500 hover:text-gray-905 dark:hover:text-white underline cursor-pointer"
                                      >
                                        Edit Stock
                                      </button>
                                    </div>
                                    {product.stock_quantity < 5 && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/15 w-max select-none animate-pulse">
                                        Low Stock
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Stock status toggle */}
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => handleStatusToggle(product)}
                                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                    product.is_available
                                      ? 'bg-blue-50 dark:bg-blue-600/10 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-600/20'
                                      : 'bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20'
                                  }`}
                                >
                                  {product.is_available ? 'In Stock' : 'Out of Stock'}
                                </button>
                              </td>

                              {/* Photo Capture */}
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => {
                                    setEnrichmentProduct(product)
                                    setIsEnenrichingPendingModalOpen(false) // make sure other modal state is clear
                                    setIsEnenrichingPendingModalOpen(false)
                                    setIsEnenrichingPendingModalOpen(false)
                                    setIsEnrichmentModalOpen(true)
                                  }}
                                  className="p-2 bg-gray-55 hover:bg-gray-100 dark:bg-slate-855 dark:hover:bg-slate-750 rounded-xl text-gray-655 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-550 border border-gray-200 dark:border-slate-700/30 transition-all flex items-center justify-center mx-auto cursor-pointer"
                                  title="Capture photo using phone or webcam"
                                >
                                  <Camera className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card List View */}
                    <div className="md:hidden flex flex-col gap-3 p-3 bg-gray-55 dark:bg-slate-950/40">
                      {filteredProducts.map(product => {
                        const catName = categories.find(cat => cat.id === product.category_id)?.name || 'N/A';
                        return (
                          <div
                            key={product.id}
                            className={`bg-white dark:bg-slate-900 rounded-2xl border ${
                              product.stock_quantity < 5
                                ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/10 dark:bg-amber-950/[0.01]'
                                : 'border-gray-200 dark:border-slate-750'
                            } p-3.5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all`}
                          >
                            {/* Upper Section */}
                            <div className="flex items-start gap-3.5">
                              {/* Product Image */}
                              <div className="relative shrink-0">
                                {product.image_url && !imageErrors[product.id] ? (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-14 h-14 object-contain bg-gray-50 dark:bg-slate-855 rounded-xl p-1.5 border border-gray-100 dark:border-slate-800"
                                    onError={() => setImageErrors(prev => ({ ...prev, [product.id]: true }))}
                                  />
                                ) : (
                                  <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/20 rounded-xl flex items-center justify-center border border-amber-200 dark:border-amber-900/40 text-amber-600 dark:text-amber-500 shrink-0 shadow-inner" title="Missing photo - Click capture to add">
                                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                                  </div>
                                )}
                                {/* Stock Indicator Dot */}
                                <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${product.is_available ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              </div>

                              {/* Product Info */}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-xs text-gray-900 dark:text-white leading-tight break-words">
                                  {product.name}
                                </h4>
                                <p className="text-[10px] text-gray-400 dark:text-gray-555 mt-1 font-semibold">
                                  {product.brand || 'OZO Choice'} • {catName} • {product.unit}
                                </p>
                              </div>
                            </div>

                            {/* Middle Section: Price & Stock Qty (Two Column Grid) */}
                            <div className="grid grid-cols-2 gap-3 bg-gray-55/60 dark:bg-slate-850/25 border border-gray-150 dark:border-slate-800 rounded-xl p-2.5">
                              {/* Price */}
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Price</span>
                                {editingPriceId === product.id ? (
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={tempPrice}
                                      onChange={(e) => setTempPrice(e.target.value)}
                                      className="w-16 bg-white dark:bg-slate-900 border border-gray-250 dark:border-slate-750 rounded px-1.5 py-0.5 text-xs text-gray-900 dark:text-white font-mono focus:outline-none"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handlePriceSave(product.id)}
                                      className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[8px] font-bold"
                                    >
                                      Save
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-baseline gap-1 mt-0.5">
                                    <span className="font-bold text-xs text-blue-650 dark:text-blue-400 font-mono">
                                      ₹{product.price.toFixed(2)}
                                    </span>
                                    <span className="text-[9px] text-gray-400 line-through font-mono">
                                      ₹{product.mrp.toFixed(2)}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setEditingPriceId(product.id)
                                        setTempPrice(product.price.toString())
                                      }}
                                      className="text-[9px] text-blue-505 hover:underline font-bold ml-1"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Stock */}
                              <div className="flex flex-col gap-0.5 border-l border-gray-200 dark:border-slate-800/80 pl-3">
                                <span className="text-[9px] font-extrabold text-gray-400 dark:text-gray-550 uppercase tracking-wider">Stock Qty</span>
                                {editingStockId === product.id ? (
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <input
                                      type="number"
                                      min="0"
                                      value={tempStock}
                                      onChange={(e) => setTempStock(e.target.value)}
                                      className="w-12 bg-white dark:bg-slate-900 border border-gray-250 dark:border-slate-750 rounded px-1.5 py-0.5 text-xs text-gray-900 dark:text-white font-mono focus:outline-none"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleStockSave(product.id)}
                                      className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[8px] font-bold"
                                    >
                                      Save
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-baseline gap-1 mt-0.5">
                                    <span className={`font-mono text-xs font-bold ${product.stock_quantity < 5 ? 'text-amber-600 dark:text-amber-405 font-extrabold' : 'text-gray-800 dark:text-gray-205'}`}>
                                      {product.stock_quantity ?? 0}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setEditingStockId(product.id)
                                        setTempStock((product.stock_quantity ?? 0).toString())
                                      }}
                                      className="text-[9px] text-blue-505 hover:underline font-bold ml-1"
                                    >
                                      Edit
                                    </button>
                                    {product.stock_quantity < 5 && (
                                      <span className="text-[8px] px-1 py-0.2 rounded font-black bg-amber-500/10 text-amber-600 dark:text-amber-450 uppercase tracking-wider animate-pulse ml-0.5">
                                        Low
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Lower Actions Section (Camera & Toggle) */}
                            <div className="flex items-center gap-2 mt-1 pt-2.5 border-t border-gray-200 dark:border-slate-800">
                              {/* Camera Button */}
                              <button
                                onClick={() => {
                                  setEnrichmentProduct(product)
                                  setIsEnrichmentModalOpen(true)
                                }}
                                className={`flex items-center justify-center gap-1.5 flex-1 py-1.5 rounded-xl transition-all text-xs font-bold shrink-0 cursor-pointer ${
                                  product.image_url && !imageErrors[product.id]
                                    ? 'bg-gray-50 hover:bg-gray-105 dark:bg-slate-800 dark:hover:bg-slate-700 border border-gray-250 dark:border-slate-700/50 text-gray-700 dark:text-gray-300'
                                    : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/20 dark:hover:bg-rose-900/30 border border-rose-250 dark:border-rose-900/40 text-rose-600 dark:text-rose-455 font-extrabold shadow-sm'
                                }`}
                                title={product.image_url && !imageErrors[product.id] ? "Update photo" : "Add missing product photo (required)"}
                              >
                                <Camera className={`w-3.5 h-3.5 ${product.image_url && !imageErrors[product.id] ? 'text-gray-550 dark:text-gray-400' : 'text-rose-500 animate-pulse'}`} />
                                <span>{product.image_url && !imageErrors[product.id] ? 'Update Photo' : 'Add Photo ⚠️'}</span>
                              </button>

                              {/* Status Toggle Button */}
                              <button
                                onClick={() => handleStatusToggle(product)}
                                className={`flex items-center justify-center gap-1.5 flex-1 py-1.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                                  product.is_available
                                    ? 'bg-blue-50 dark:bg-blue-600/10 border-blue-150 dark:border-blue-500/20 text-blue-600 dark:text-blue-505'
                                    : 'bg-red-50 dark:bg-red-500/10 border-red-150 dark:border-red-500/20 text-red-600 dark:text-red-405'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${product.is_available ? 'bg-blue-500' : 'bg-red-500'}`} />
                                <span>{product.is_available ? 'Active' : 'Inactive'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Pagination Footer */}
              {!isLoadingInventory && inventoryTotalCount > 0 && (
                <div className="border-t border-gray-200 dark:border-slate-800 bg-gray-55 dark:bg-slate-900 px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                  <div className="hidden sm:block text-xs font-bold text-gray-500 dark:text-gray-400 select-none">
                    Showing <span className="text-gray-900 dark:text-white font-extrabold">{Math.min(inventoryTotalCount, (currentPage - 1) * 20 + 1)}</span> to{' '}
                    <span className="text-gray-900 dark:text-white font-extrabold">{Math.min(inventoryTotalCount, currentPage * 20)}</span> of{' '}
                    <span className="text-gray-900 dark:text-white font-extrabold">{inventoryTotalCount}</span> products
                  </div>
                  <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-850 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-900 text-[11px] sm:text-xs font-bold text-gray-800 dark:text-gray-300 rounded-xl transition-all cursor-pointer select-none"
                    >
                      ← Prev
                    </button>
                    <div className="text-[11px] sm:text-xs font-extrabold text-gray-900 dark:text-white px-2 select-none">
                      Page {currentPage} of {Math.ceil(inventoryTotalCount / 20) || 1}
                    </div>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(inventoryTotalCount / 20), prev + 1))}
                      disabled={currentPage * 20 >= inventoryTotalCount}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-850 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-900 text-[11px] sm:text-xs font-bold text-gray-800 dark:text-gray-300 rounded-xl transition-all cursor-pointer select-none"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Pending Products Sub-view */
            <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
              <div className="px-4 py-3.5 border-b border-gray-200 dark:border-slate-800 bg-amber-500/[0.02] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500 font-sans flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Unmatched CSV Imports ({pendingProducts.length})
                  </span>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    These items did not match any products in the master catalog. Enrich them with photos and details to list them.
                  </p>
                </div>
                {pendingProducts.length > 0 && (
                  <button
                    onClick={loadPending}
                    className="text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-blue-600 flex items-center gap-1.5 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700/50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPending ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {isLoadingPending ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                    <p className="text-gray-550 dark:text-gray-400 text-sm">Loading pending drafts...</p>
                  </div>
                ) : pendingProducts.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-8">
                    <Sparkles className="w-12 h-12 text-gray-350 dark:text-slate-800 mb-2" />
                    <p className="text-gray-700 dark:text-gray-400 font-bold">Draft queue is empty</p>
                    <p className="text-xs text-gray-555 dark:text-gray-550 mt-1 max-w-sm">
                      All imported CSV products were matched or enriched. Upload a new CSV in "Import CSV" to add more.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop View Table for Pending */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[650px] lg:min-w-0">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900">
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-550 dark:text-gray-400">Product Name</th>
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400">Brand</th>
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400">Unit</th>
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400">Barcode</th>
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400">Price (₹)</th>
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400">MRP (₹)</th>
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400">CSV Stock</th>
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                          {pendingProducts.map(item => (
                            <tr key={item.id} className="hover:bg-gray-55 dark:hover:bg-slate-800/50 transition-colors group">
                              <td className="p-4 font-bold text-sm text-gray-800 dark:text-gray-205">
                                {item.name}
                              </td>
                              <td className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                                {item.brand || '—'}
                              </td>
                              <td className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                                {item.unit || '1 unit'}
                              </td>
                              <td className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-450 font-mono">
                                {item.barcode || 'No Barcode'}
                              </td>
                              <td className="p-4 text-sm font-bold text-gray-700 dark:text-gray-300 font-mono">
                                ₹{item.mart_price ? Number(item.mart_price).toFixed(2) : '—'}
                              </td>
                              <td className="p-4 text-sm font-bold text-gray-700 dark:text-gray-300 font-mono">
                                ₹{item.mart_mrp ? Number(item.mart_mrp).toFixed(2) : '—'}
                              </td>
                              <td className="p-4 text-sm font-bold text-gray-800 dark:text-gray-300 font-mono">
                                {item.stock_quantity ?? 0}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      setEnenrichingPendingProduct(item)
                                      setIsEnenrichingPendingModalOpen(true)
                                    }}
                                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Enrich & Import</span>
                                  </button>
                                  <button
                                    onClick={() => handleRemovePending(item.id)}
                                    className="p-1.5 text-gray-450 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                                    title="Delete Draft"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card List View for Pending */}
                    <div className="md:hidden flex flex-col gap-3 p-3 bg-gray-50 dark:bg-slate-950/40">
                      {pendingProducts.map(item => (
                        <div key={item.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-750 p-3.5 flex flex-col gap-2.5 shadow-sm">
                          <div>
                            <h4 className="font-bold text-xs text-gray-900 dark:text-white leading-tight">
                              {item.name}
                            </h4>
                            <p className="text-[10px] text-gray-450 dark:text-gray-550 mt-1 font-semibold">
                              Brand: {item.brand || '—'} • Unit: {item.unit || '1 unit'}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-slate-850/25 border border-gray-200 dark:border-slate-800 rounded-xl p-2 font-mono text-xs">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">Price/MRP</span>
                              <span className="font-bold text-gray-700 dark:text-gray-300">
                                ₹{item.mart_price ? Number(item.mart_price).toFixed(2) : '—'} / ₹{item.mart_mrp ? Number(item.mart_mrp).toFixed(2) : '—'}
                              </span>
                            </div>
                            <div className="flex flex-col gap-0.5 border-l border-gray-200 dark:border-slate-800/80 pl-2">
                              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">Stock Qty</span>
                              <span className="font-bold text-gray-800 dark:text-gray-200">
                                {item.stock_quantity ?? 0}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 border-t border-gray-150 dark:border-slate-850/50 pt-2">
                            <button
                              onClick={() => {
                                setEnenrichingPendingProduct(item)
                                setIsEnenrichingPendingModalOpen(true)
                              }}
                              className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Enrich & Import</span>
                            </button>
                            <button
                              onClick={() => handleRemovePending(item.id)}
                              className="p-2 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 rounded-xl hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {showSingleProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-slate-950/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-500" />
                  Add Single Product
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Add products to your mart inventory ledger</p>
              </div>
              <button
                onClick={() => setShowSingleProductModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Toggle Tabs */}
            <div className="flex border-b border-gray-100 dark:border-white/5 p-2 bg-gray-50/30 dark:bg-slate-950/20">
              <button
                onClick={() => setSingleProductMode('catalog')}
                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  singleProductMode === 'catalog'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-500 shadow-sm border border-blue-500/10'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Select from Global Catalog
              </button>
              <button
                onClick={() => setSingleProductMode('new')}
                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  singleProductMode === 'new'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-500 shadow-sm border border-blue-500/10'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Create New Custom Product
              </button>
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {singleProductMode === 'catalog' ? (
                /* Select From Catalog Form */
                <form onSubmit={handleAddCatalogProduct} className="space-y-4">
                  <div className="relative">
                    <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400/70 uppercase tracking-wider mb-1.5">
                      Search Global Catalog
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search by name, brand, or barcode..."
                        value={catalogSearch}
                        onChange={(e) => {
                          setCatalogSearch(e.target.value)
                          setSelectedCatalogProduct(null)
                        }}
                        className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
                      />
                    </div>

                    {/* Results Dropdown */}
                    {catalogResults.length > 0 && !selectedCatalogProduct && (
                      <div className="absolute z-10 left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
                        {catalogResults.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedCatalogProduct(p)
                              setCatalogForm(prev => ({
                                ...prev,
                                mart_price: p.price ? p.price.toString() : '',
                                mart_mrp: p.mrp ? p.mrp.toString() : ''
                              }))
                              setCatalogSearch(p.name)
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-blue-50/40 dark:hover:bg-blue-600/[0.03] cursor-pointer transition-colors"
                          >
                            {p.image_url && !imageErrors[p.id] ? (
                              <img 
                                src={p.image_url} 
                                alt={p.name} 
                                className="w-8 h-8 object-contain rounded bg-gray-50 dark:bg-slate-850 p-0.5" 
                                onError={() => setImageErrors(prev => ({ ...prev, [p.id]: true }))}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-amber-50 dark:bg-amber-955/20 flex items-center justify-center border border-amber-200 dark:border-amber-900/30 text-amber-600 dark:text-amber-500 shrink-0" title="Missing photo">
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{p.name}</p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{p.brand || 'No Brand'} • {p.unit} • {p.barcode || 'No Barcode'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-gray-900 dark:text-white">₹{parseFloat(p.price || 0).toFixed(2)}</p>
                              {p.mrp > p.price && (
                                <p className="text-[9px] text-gray-400 line-through">₹{parseFloat(p.mrp || 0).toFixed(2)}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Product Card */}
                  {selectedCatalogProduct && (
                    <div className="border border-blue-500/20 bg-blue-600/[0.02] rounded-xl p-4 flex items-center gap-4">
                      {selectedCatalogProduct.image_url && !imageErrors[selectedCatalogProduct.id] ? (
                        <img 
                          src={selectedCatalogProduct.image_url} 
                          alt={selectedCatalogProduct.name} 
                          className="w-12 h-12 object-contain rounded bg-white dark:bg-slate-805 p-1" 
                          onError={() => setImageErrors(prev => ({ ...prev, [selectedCatalogProduct.id]: true }))}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-amber-50 dark:bg-amber-955/20 flex items-center justify-center border border-amber-200 dark:border-amber-900/30 text-amber-600 dark:text-amber-500 shrink-0" title="Missing photo - Click capture to add">
                          <AlertTriangle className="w-5 h-5 animate-pulse" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-black text-blue-600 dark:text-blue-500 bg-blue-600/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Selected Catalog Product</span>
                        <h4 className="text-sm font-bold text-gray-955 dark:text-white truncate mt-1">{selectedCatalogProduct.name}</h4>
                        <p className="text-xs text-gray-500">{selectedCatalogProduct.brand || 'No Brand'} • {selectedCatalogProduct.unit} • {selectedCatalogProduct.barcode || 'No Barcode'}</p>
                      </div>
                    </div>
                  )}

                  {/* Pricing and Stock Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400/70 uppercase tracking-wider mb-1.5">
                        Stock Quantity <span className="text-[red-550">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={catalogForm.stock_quantity}
                        onChange={(e) => setCatalogForm(prev => ({ ...prev, stock_quantity: e.target.value }))}
                        onFocus={(e) => {
                          if (catalogForm.stock_quantity === '0') {
                            setCatalogForm(prev => ({ ...prev, stock_quantity: '' }))
                          }
                        }}
                        onBlur={(e) => {
                          if (catalogForm.stock_quantity === '') {
                            setCatalogForm(prev => ({ ...prev, stock_quantity: '0' }))
                          }
                        }}
                        className="w-full bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400/70 uppercase tracking-wider mb-1.5">
                        Mart Price (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={selectedCatalogProduct ? `Inherit ₹${parseFloat(selectedCatalogProduct.price || 0).toFixed(2)}` : 'e.g. 99.00'}
                        value={catalogForm.mart_price}
                        onChange={(e) => setCatalogForm(prev => ({ ...prev, mart_price: e.target.value }))}
                        className="w-full bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400/70 uppercase tracking-wider mb-1.5">
                        Mart MRP (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={selectedCatalogProduct ? `Inherit ₹${parseFloat(selectedCatalogProduct.mrp || 0).toFixed(2)}` : 'e.g. 120.00'}
                        value={catalogForm.mart_mrp}
                        onChange={(e) => setCatalogForm(prev => ({ ...prev, mart_mrp: e.target.value }))}
                        className="w-full bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => setShowSingleProductModal(false)}
                      className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!selectedCatalogProduct}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white dark:text-black font-extrabold rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider"
                    >
                      Add Product
                    </button>
                  </div>
                </form>
              ) : (
                /* Create New Custom Product Form */
                <form onSubmit={handleAddCustomProduct} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400/70 uppercase tracking-wider mb-1.5">
                        Product Name <span className="text-[red-550">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Amul Gold Milk"
                        value={newProductForm.name}
                        onChange={(e) => setNewProductForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400/70 uppercase tracking-wider mb-1.5">
                        Brand Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Amul"
                        value={newProductForm.brand}
                        onChange={(e) => setNewProductForm(prev => ({ ...prev, brand: e.target.value }))}
                        className="w-full bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400/70 uppercase tracking-wider mb-1.5">
                        Unit / Size <span className="text-[red-550">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 500 ml, 1 kg, 1 unit"
                        value={newProductForm.unit}
                        onChange={(e) => setNewProductForm(prev => ({ ...prev, unit: e.target.value }))}
                        className="w-full bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400/70 uppercase tracking-wider mb-1.5">
                        Category <span className="text-[red-550">*</span>
                      </label>
                      {isLoadingCategories ? (
                        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500 dark:text-blue-500" />
                          <span>Loading categories...</span>
                        </div>
                      ) : (
                        <div className="relative" ref={categoryDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                            className="w-full bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all flex items-center justify-between cursor-pointer font-medium text-left"
                          >
                            <span className={selectedCategoryName ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}>
                              {selectedCategoryName || "-- Choose Category --"}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-555 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {isCategoryDropdownOpen && (
                            <div className="absolute z-[100] w-full mt-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl p-2.5 space-y-2.5 max-h-64 overflow-hidden flex flex-col animate-fadeIn">
                              <div className="relative">
                                <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  placeholder="Search category..."
                                  value={categorySearchQuery}
                                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 rounded-lg pl-9 pr-8 py-2 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none"
                                  autoFocus
                                />
                                {categorySearchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => setCategorySearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              <div className="overflow-y-auto max-h-40 space-y-1 pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10">
                                {filteredCategories.length === 0 ? (
                                  <div className="text-gray-400 dark:text-gray-500 text-xs py-3 text-center">No categories found</div>
                                ) : (
                                  filteredCategories.map((cat) => (
                                    <button
                                      key={cat.id}
                                      type="button"
                                      onClick={() => {
                                        setNewProductForm(prev => ({ ...prev, category_id: cat.id }))
                                        setIsCategoryDropdownOpen(false)
                                        setCategorySearchQuery("")
                                      }}
                                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-150 flex items-center justify-between ${
                                        newProductForm.category_id === cat.id
                                          ? 'bg-blue-600 dark:bg-blue-600 text-white dark:text-black font-extrabold'
                                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-950 dark:hover:text-white'
                                      }`}
                                    >
                                      <span>{cat.name}</span>
                                      {newProductForm.category_id === cat.id && (
                                        <Check className="w-3.5 h-3.5 text-white dark:text-black font-extrabold" />
                                      )}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400/70 uppercase tracking-wider mb-1.5">
                        Barcode / SKU
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 8901262150012"
                        value={newProductForm.barcode}
                        onChange={(e) => setNewProductForm(prev => ({ ...prev, barcode: e.target.value }))}
                        className="w-full bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400/70 uppercase tracking-wider mb-1.5">
                        Global Catalog Base Price (₹) <span className="text-[red-550">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 33.00"
                        value={newProductForm.price}
                        onChange={(e) => setNewProductForm(prev => ({ ...prev, price: e.target.value }))}
                        className="w-full bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400/70 uppercase tracking-wider mb-1.5">
                        Global Catalog Base MRP (₹) <span className="text-[red-550">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 35.00"
                        value={newProductForm.mrp}
                        onChange={(e) => setNewProductForm(prev => ({ ...prev, mrp: e.target.value }))}
                        className="w-full bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-100 dark:border-white/5 pt-4">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-3">Mart Specific Details</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400/70 uppercase tracking-wider mb-1.5">
                          Your Stock Quantity <span className="text-[red-550">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newProductForm.stock_quantity}
                          onChange={(e) => setNewProductForm(prev => ({ ...prev, stock_quantity: e.target.value }))}
                          onFocus={(e) => {
                            if (newProductForm.stock_quantity === '0') {
                              setNewProductForm(prev => ({ ...prev, stock_quantity: '' }))
                            }
                          }}
                          onBlur={(e) => {
                            if (newProductForm.stock_quantity === '') {
                              setNewProductForm(prev => ({ ...prev, stock_quantity: '0' }))
                            }
                          }}
                          className="w-full bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400/70 uppercase tracking-wider mb-1.5">
                          Your Selling Price (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={newProductForm.price ? `Default: ₹${parseFloat(newProductForm.price).toFixed(2)}` : 'e.g. 33.00'}
                          value={newProductForm.mart_price}
                          onChange={(e) => setNewProductForm(prev => ({ ...prev, mart_price: e.target.value }))}
                          className="w-full bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400/70 uppercase tracking-wider mb-1.5">
                          Your MRP (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={newProductForm.mrp ? `Default: ₹${parseFloat(newProductForm.mrp).toFixed(2)}` : 'e.g. 35.00'}
                          value={newProductForm.mart_mrp}
                          onChange={(e) => setNewProductForm(prev => ({ ...prev, mart_mrp: e.target.value }))}
                          className="w-full bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400/70 uppercase tracking-wider">
                        Product Image URL
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          let defaultQuery = `${newProductForm.brand || ''} ${newProductForm.name || ''}`.trim()
                          if (!defaultQuery && newProductForm.barcode?.trim()) {
                            defaultQuery = newProductForm.barcode.trim()
                          }
                          setImageSearchQuery(defaultQuery)
                          const nextShow = !showImageSearchGrid
                          setShowImageSearchGrid(nextShow)
                          if (nextShow && (defaultQuery || newProductForm.barcode?.trim())) {
                            handleSearchImages(defaultQuery)
                          }
                        }}
                        className="text-xs font-bold text-blue-600 dark:text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Image className="w-3.5 h-3.5" />
                        {showImageSearchGrid ? 'Hide Search' : '✨ Find Online Images'}
                      </button>
                    </div>

                    <div className="flex gap-3">
                      {newProductForm.image_url && (
                        <div className="w-11 h-11 rounded-xl bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex-shrink-0 flex items-center justify-center p-1 overflow-hidden">
                          <img
                            src={newProductForm.image_url}
                            alt="Preview"
                            className="w-full h-full object-contain rounded-lg"
                            onError={(e) => { e.target.src = 'https://wsrv.nl/?url=placeholder&default=ssl' }}
                          />
                        </div>
                      )}
                      <input
                        type="url"
                        placeholder="e.g. https://images.unsplash.com/... or search online"
                        value={newProductForm.image_url}
                        onChange={(e) => setNewProductForm(prev => ({ ...prev, image_url: e.target.value }))}
                        className="flex-1 bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1 select-none">
                      <Camera className="w-3.5 h-3.5 text-blue-500 dark:text-blue-500" />
                      <span>Leave empty to capture images using phone/webcam camera immediately after creation.</span>
                    </p>

                    {showImageSearchGrid && (
                      <div className="mt-3 p-4 bg-gray-55 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl space-y-3">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                            <input
                              type="text"
                              placeholder="Search images..."
                              value={imageSearchQuery}
                              onChange={(e) => setImageSearchQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleSearchImages()
                                }
                              }}
                              className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl py-1.5 pl-9 pr-3 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSearchImages()}
                            disabled={isSearchingImages}
                            className="px-3 py-1.5 bg-blue-600 dark:bg-blue-600 text-white dark:text-black hover:bg-blue-700 dark:hover:bg-blue-700 disabled:opacity-50 text-xs font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                          >
                            {isSearchingImages ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'Search'
                            )}
                          </button>
                        </div>

                        {isSearchingImages ? (
                          <div className="grid grid-cols-4 gap-2 pt-2 animate-pulse">
                            {[...Array(8)].map((_, i) => (
                              <div key={i} className="aspect-square bg-gray-200 dark:bg-white/5 rounded-lg" />
                            ))}
                          </div>
                        ) : imageSearchResults.length > 0 ? (
                          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10">
                            {imageSearchResults.map((img, i) => {
                              const isSelected = newProductForm.image_url === img.url
                              return (
                                <div
                                  key={i}
                                  onClick={() => setNewProductForm(prev => ({ ...prev, image_url: img.url }))}
                                  className={`relative aspect-square cursor-pointer rounded-lg overflow-hidden border bg-white dark:bg-slate-900 flex items-center justify-center p-0.5 group transition-all hover:scale-105 duration-200 ${
                                    isSelected
                                      ? 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20 dark:ring-blue-500/20'
                                      : 'border-gray-200 dark:border-slate-700 hover:border-blue-500/40 dark:hover:border-blue-500/40'
                                  }`}
                                  title={img.title}
                                >
                                  <img
                                    src={img.thumbnail || img.url}
                                    alt={img.title}
                                    className="w-full h-full object-contain rounded-md"
                                    loading="lazy"
                                    onError={(e) => { e.target.src = 'https://wsrv.nl/?url=placeholder&default=ssl' }}
                                  />
                                  {isSelected && (
                                    <div className="absolute inset-0 bg-blue-600/10 dark:bg-blue-600/5 flex items-center justify-center">
                                      <div className="bg-blue-600 dark:bg-blue-600 text-white dark:text-black rounded-full p-0.5 shadow">
                                        <Check className="w-2.5 h-2.5 font-bold" />
                                      </div>
                                    </div>
                                  )}
                                  <div className="absolute bottom-0 inset-x-0 bg-blue-600 dark:bg-blue-600 text-white dark:text-black text-[9px] font-bold text-center py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                    Select Image
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-xs">
                            {imageSearchQuery ? 'No images found. Try a different query.' : 'Type a query and search for images.'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => setShowSingleProductModal(false)}
                      className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white dark:text-black font-extrabold rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider"
                    >
                      Create & Add
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {hoveredImage && (
        <div 
          className="fixed z-[9999] pointer-events-none p-1.5 bg-white dark:bg-slate-900 border-2 border-amber-500/40 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)]"
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
            className="w-full h-full object-contain rounded-xl bg-gray-50 dark:bg-slate-900"
          />
        </div>
      )}

      {isEnrichmentModalOpen && enrichmentProduct && (
        <BarcodeEnrichmentModal
          barcode={enrichmentProduct.barcode}
          product={enrichmentProduct}
          onClose={() => {
            setIsEnrichmentModalOpen(false)
            setEnrichmentProduct(null)
          }}
          onComplete={(updatedProduct) => {
            setIsEnrichmentModalOpen(false)
            setEnrichmentProduct(null)
            refreshInventory()
          }}
        />
      )}

      {isEnenrichingPendingModalOpen && enrichingPendingProduct && (
        <BarcodeEnrichmentModal
          barcode={enrichingPendingProduct.barcode}
          product={enrichingPendingProduct}
          onClose={() => {
            setIsEnenrichingPendingModalOpen(false)
            setEnenrichingPendingProduct(null)
          }}
          onComplete={handleEnrichPendingComplete}
        />
      )}
    </div>
  )
}

export default InventoryView
