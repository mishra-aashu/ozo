import React, { useState, useEffect } from 'react'
import { useMartStore } from '../../stores/martStore'
import { supabase } from '../../lib/supabase'
import Papa from 'papaparse'
import toast from 'react-hot-toast'
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
  Loader2
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
    importInventoryRows
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

  // Bulk CSV Import State
  const [showUploader, setShowUploader] = useState(false)
  const [importStep, setImportStep] = useState('upload') // 'upload', 'mapping', 'preview'
  const [importMethod, setImportMethod] = useState('csv') // 'csv' or 'paste'
  const [pasteText, setPasteText] = useState('')
  const [csvFileName, setCsvFileName] = useState('')
  const [csvHeaders, setCsvHeaders] = useState([])
  const [csvRawRows, setCsvRawRows] = useState([])
  const [columnMapping, setColumnMapping] = useState({
    product_identifier: '',
    stock_quantity: '',
    mart_price: '',
    mart_mrp: '',
    product_name: '',
    brand_name: '',
    product_unit: ''
  })
  const [previewRows, setPreviewRows] = useState([])
  const [isMatching, setIsMatching] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // Single Product Add State
  const [showSingleProductModal, setShowSingleProductModal] = useState(false)
  const [singleProductMode, setSingleProductMode] = useState('catalog') // 'catalog' or 'new'
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogResults, setCatalogResults] = useState([])
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState(null)
  const [categories, setCategories] = useState([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)

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

  // Poll Localhost Image Tool status
  useEffect(() => {
    let intervalId
    
    const detectLocalPort = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paramPort = urlParams.get('local_port');
      if (paramPort && /^\d+$/.test(paramPort)) {
        localStorage.setItem('ozo_local_tool_port', paramPort);
        return;
      }
      
      const ports = [5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009];
      for (const port of ports) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 350);
          const res = await fetch(`http://localhost:${port}/api/status`, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            localStorage.setItem('ozo_local_tool_port', port.toString());
            break;
          }
        } catch (e) {
          // ignore
        }
      }
    };

    const checkLocalTool = async () => {
      try {
        const res = await fetch(`${getLocalToolUrl()}/api/status`)
        if (res.ok) {
          const data = await res.json()
          setLocalToolState({
            online: true,
            status: data.status || 'idle',
            processed: data.processed || 0,
            total: data.total || 0,
            currentProduct: data.current_product || '',
            lockedConfig: data.locked_config || null
          })
        } else {
          setLocalToolState(prev => ({ ...prev, online: false, status: 'offline' }))
        }
      } catch (err) {
        setLocalToolState(prev => ({ ...prev, online: false, status: 'offline' }))
      }
    }

    const runInit = async () => {
      await detectLocalPort()
      await checkLocalTool()
      intervalId = setInterval(checkLocalTool, 3000)
    }

    runInit()

    return () => clearInterval(intervalId)
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
      const res = await fetch(`/api/search-image?q=${encodeURIComponent(q)}`)
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

  // Clear image search when modal closes
  useEffect(() => {
    if (!showSingleProductModal) {
      setImageSearchQuery('')
      setImageSearchResults([])
      setIsSearchingImages(false)
      setShowImageSearchGrid(false)
    }
  }, [showSingleProductModal])

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

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch inventory
  useEffect(() => {
    if (currentMart) {
      fetchInventory(currentPage, 20, debouncedSearchQuery, showLowStockOnly)
    }
  }, [currentMart, currentPage, debouncedSearchQuery, showLowStockOnly, fetchInventory])

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
      fetchInventory(currentPage, 20, debouncedSearchQuery, showLowStockOnly)
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
      
      fetchInventory(currentPage, 20, debouncedSearchQuery, showLowStockOnly)
    } catch (err) {
      console.error('Failed to create custom product:', err)
      toast.error('Failed to create product: ' + err.message)
    }
  }

  const parseCSV = (text) => {
    const results = Papa.parse(text, {
      skipEmptyLines: true
    })
    return results.data || []
  }

  const parseTSV = (text) => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '')
    return lines.map(line => line.split('\t'))
  }

  const handlePastedData = () => {
    if (!pasteText.trim()) {
      toast.error('Please paste some Excel or Google Sheets data')
      return
    }

    const parsed = parseTSV(pasteText)
    if (parsed.length === 0) {
      toast.error('The pasted data is empty')
      return
    }

    const headers = parsed[0].map(h => h.trim())
    const dataRows = parsed.slice(1).filter(r => r.some(cell => cell.trim() !== ''))

    if (headers.length === 0) {
      toast.error('Could not find any headers in the pasted data')
      return
    }

    setCsvFileName('Copied Excel/Sheets Data')
    setCsvHeaders(headers)
    setCsvRawRows(dataRows)
    
    const detected = autoDetectColumns(headers, dataRows)
    setColumnMapping(detected)
    
    setImportStep('mapping')
  }

  const autoDetectColumns = (headers, rows = []) => {
    const mapping = {
      product_identifier: '',
      stock_quantity: '',
      mart_price: '',
      mart_mrp: '',
      product_name: '',
      brand_name: '',
      product_unit: ''
    }

    const serialHeaders = ['sno', 's_no', 'slno', 'sl_no', 'serial', 'index', 'srno', 'sr_no', 'id', 'no']

    // 1. First Pass: Direct keyword matching
    headers.forEach(h => {
      const clean = h.toLowerCase().trim().replace(/[^a-z0-9_]/g, '')
      
      // Product Identifier matching
      if (
        (clean === 'barcode' || clean === 'sku' || clean === 'slug' || 
        clean.includes('barcode') || clean.includes('sku') || 
        clean.includes('productid') || clean.includes('itemcode') || 
        clean.includes('code') || clean.includes('identifier')) &&
        !serialHeaders.includes(clean)
      ) {
        if (!mapping.product_identifier) mapping.product_identifier = h
      }
      
      // Stock quantity matching
      if (
        (clean === 'stock' || clean === 'qty' || clean === 'quantity' || 
        clean.includes('stock') || clean.includes('qty') || 
        clean.includes('quantity') || clean.includes('inventory')) &&
        !serialHeaders.includes(clean)
      ) {
        if (!mapping.stock_quantity) mapping.stock_quantity = h
      }
      
      // Mart Selling Price matching (avoid MRP)
      if (
        (clean.includes('price') || clean.includes('rate') || clean.includes('selling') || clean.includes('cost')) && 
        !clean.includes('mrp') && !clean.includes('market') &&
        !serialHeaders.includes(clean)
      ) {
        if (!mapping.mart_price) mapping.mart_price = h
      }
      
      // Mart MRP matching
      if (
        (clean.includes('mrp') || clean.includes('market') || 
        clean.includes('retail') || clean.includes('print') || 
        clean.includes('originalprice')) &&
        !serialHeaders.includes(clean)
      ) {
        if (!mapping.mart_mrp) mapping.mart_mrp = h
      }

      // Product Name matching
      if (
        (clean === 'name' || clean === 'title' || clean === 'item' || clean === 'product' ||
        clean.includes('name') || clean.includes('title') || clean.includes('itemname')) &&
        !serialHeaders.includes(clean)
      ) {
        if (!mapping.product_name) mapping.product_name = h
      }

      // Brand Name matching
      if (
        (clean === 'brand' || clean === 'mfg' || clean === 'manufacturer' || clean === 'make' || clean === 'company' ||
        clean.includes('brand') || clean.includes('mfg')) &&
        !serialHeaders.includes(clean)
      ) {
        if (!mapping.brand_name) mapping.brand_name = h
      }

      // Unit matching
      if (
        (clean === 'unit' || clean === 'weight' || clean === 'size' || clean === 'pack' || clean === 'measure' ||
        clean.includes('unit') || clean.includes('weight') || clean.includes('pack')) &&
        !serialHeaders.includes(clean)
      ) {
        if (!mapping.product_unit) mapping.product_unit = h
      }
    })

    // 2. Second Pass: Inspect data rows if headers didn't match perfectly
    if (rows && rows.length > 0) {
      const colSamples = {}
      headers.forEach((h, colIdx) => {
        colSamples[h] = rows.slice(0, 10).map(r => r[colIdx]).filter(Boolean)
      })

      headers.forEach(h => {
        const clean = h.toLowerCase().trim().replace(/[^a-z0-9_]/g, '')
        if (serialHeaders.includes(clean)) return

        const samples = colSamples[h] || []
        if (samples.length === 0) return

        const allNumeric = samples.every(s => /^\d+(\.\d+)?$/.test(s.toString().trim().replace(/[₹$,\s]/g, '')))
        const hasDecimals = samples.some(s => s.toString().includes('.'))
        const averageLength = samples.reduce((acc, s) => acc + s.toString().trim().length, 0) / samples.length

        if (!mapping.product_identifier && allNumeric && averageLength >= 6) {
          mapping.product_identifier = h
        }

        if (!mapping.mart_price && allNumeric && hasDecimals && !clean.includes('mrp')) {
          mapping.mart_price = h
        }

        if (!mapping.stock_quantity && allNumeric && !hasDecimals) {
          const maxVal = Math.max(...samples.map(s => parseInt(s.toString().trim().replace(/[,\s]/g, ''), 10) || 0))
          if (maxVal > 0 && maxVal < 10000) {
            mapping.stock_quantity = h
          }
        }
      })
    }

    // 3. Fallbacks - Make sure to avoid Serial Number columns
    const nonSerialHeaders = headers.filter(h => {
      const clean = h.toLowerCase().trim().replace(/[^a-z0-9_]/g, '')
      return !serialHeaders.includes(clean)
    })

    if (!mapping.product_identifier) {
      mapping.product_identifier = nonSerialHeaders[0] || headers[0] || ''
    }
    if (!mapping.stock_quantity) {
      const unmatched = nonSerialHeaders.find(h => 
        h !== mapping.product_identifier && 
        !h.toLowerCase().includes('price') && 
        !h.toLowerCase().includes('mrp') &&
        !h.toLowerCase().includes('name')
      )
      mapping.stock_quantity = unmatched || nonSerialHeaders[1] || headers[1] || ''
    }
    
    if (mapping.stock_quantity === mapping.product_identifier && headers.length > 1) {
      mapping.stock_quantity = headers.find(h => h !== mapping.product_identifier) || ''
    }

    return mapping
  }

  const handleCSVFile = (file) => {
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a valid CSV file (.csv)')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const parsed = parseCSV(text)
      if (parsed.length === 0) {
        toast.error('The uploaded CSV file is empty')
        return
      }

      const headers = parsed[0].map(h => h.trim())
      const dataRows = parsed.slice(1).filter(r => r.some(cell => cell.trim() !== ''))

      if (headers.length === 0) {
        toast.error('Could not find any headers in the CSV')
        return
      }

      setCsvFileName(file.name)
      setCsvHeaders(headers)
      setCsvRawRows(dataRows)
      
      const detected = autoDetectColumns(headers, dataRows)
      setColumnMapping(detected)
      
      setImportStep('mapping')
    }
    reader.readAsText(file)
  }

  const runProductMatching = async () => {
    setIsMatching(true)
    try {
      const identifierIndex = csvHeaders.indexOf(columnMapping.product_identifier)
      const qtyIndex = csvHeaders.indexOf(columnMapping.stock_quantity)
      const priceIndex = csvHeaders.indexOf(columnMapping.mart_price)
      const mrpIndex = csvHeaders.indexOf(columnMapping.mart_mrp)
      const nameIndex = csvHeaders.indexOf(columnMapping.product_name)
      const brandIndex = csvHeaders.indexOf(columnMapping.brand_name)
      const unitIndex = csvHeaders.indexOf(columnMapping.product_unit)

      if (identifierIndex === -1) {
        toast.error('Please select a column for Product Identifier')
        setIsMatching(false)
        return
      }

      if (qtyIndex === -1) {
        toast.error('Please select a column for Stock Quantity')
        setIsMatching(false)
        return
      }

      const cleanNumber = (val) => {
        if (val === undefined || val === null || val.toString().trim() === '') return null
        const cleaned = val.toString().trim()
          .replace(/[₹$,\s]/g, '')
          .replace(/[A-Za-z]/g, '')
        const num = parseFloat(cleaned)
        return isNaN(num) ? null : num
      }

      const cleanInteger = (val) => {
        if (val === undefined || val === null || val.toString().trim() === '') return 0
        const cleaned = val.toString().trim()
          .replace(/[,\s]/g, '')
          .replace(/[A-Za-z]/g, '')
        const num = parseInt(cleaned, 10)
        return isNaN(num) ? 0 : num
      }

      const mappedRows = csvRawRows.map(r => {
        const rowName = nameIndex !== -1 ? r[nameIndex]?.trim() : ''
        const rowBrand = brandIndex !== -1 ? r[brandIndex]?.trim() : ''
        const rowUnit = unitIndex !== -1 ? r[unitIndex]?.trim() : ''

        // Fallback for name if not mapped specifically
        const fallbackName = r.find((val, idx) => 
          idx !== identifierIndex && 
          idx !== qtyIndex && 
          idx !== priceIndex && 
          idx !== mrpIndex && 
          idx !== nameIndex && 
          idx !== brandIndex && 
          idx !== unitIndex
        ) || ''

        return {
          identifier: r[identifierIndex]?.trim() || '',
          stock_quantity: cleanInteger(r[qtyIndex]),
          mart_price: cleanNumber(r[priceIndex]),
          mart_mrp: cleanNumber(r[mrpIndex]),
          name: rowName || fallbackName,
          brand: rowBrand,
          unit: rowUnit
        }
      }).filter(r => r.identifier !== '')

      if (mappedRows.length === 0) {
        toast.error('No rows with valid identifiers found')
        setIsMatching(false)
        return
      }

      // Fetch all products in the catalog into memory (since total products is ~6530, this is extremely fast and efficient)
      let allCatalogProducts = []
      let from = 0
      const limit = 2000
      while (true) {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, slug, brand, unit, image_url, price, mrp, blinkit_product_id, barcode')
          .range(from, from + limit - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        allCatalogProducts.push(...data)
        if (data.length < limit) break
        from += limit
      }

      // Build index maps for fast exact matches
      const barcodeMap = new Map()
      const blinkitIdMap = new Map()
      const slugMap = new Map()
      const uuidMap = new Map()
      const nameMap = new Map()

      allCatalogProducts.forEach(p => {
        if (p.barcode) barcodeMap.set(p.barcode.toString().trim().toLowerCase(), p)
        if (p.blinkit_product_id) blinkitIdMap.set(p.blinkit_product_id.toString().trim().toLowerCase(), p)
        if (p.slug) slugMap.set(p.slug.toString().trim().toLowerCase(), p)
        if (p.name) nameMap.set(p.name.toString().trim().toLowerCase(), p)
        if (p.id) uuidMap.set(p.id.toLowerCase(), p)
      })

      // Resolve each row
      const resolved = mappedRows.map((r, idx) => {
        const iden = r.identifier.toString().trim()
        const key = iden.toLowerCase()

        // 1. Exact matches
        let matched = barcodeMap.get(key) || 
                      blinkitIdMap.get(key) || 
                      slugMap.get(key) || 
                      uuidMap.get(key) || 
                      nameMap.get(key) || 
                      null

        // 2. Suffix/Partial matching fallback
        if (!matched && iden.length >= 4) {
          const isNumeric = /^\d+$/.test(iden)
          
          // Suffix match for barcodes and blinkit_ids (e.g. "496979" matches "8906092496979")
          matched = allCatalogProducts.find(p => {
            const barcode = p.barcode?.toString() || ''
            const blinkitId = p.blinkit_product_id?.toString() || ''
            
            if (isNumeric) {
              if (barcode.endsWith(iden) || blinkitId.endsWith(iden)) return true
            }
            if (barcode.includes(iden) || blinkitId.includes(iden)) return true
            return false
          }) || null
        }

        // 3. Fallback to name-based substring/fuzzy match
        if (!matched && r.name && r.name.length >= 3) {
          const cleanName = r.name.toLowerCase().trim()
          matched = allCatalogProducts.find(p => {
            const catalogName = p.name?.toLowerCase() || ''
            return catalogName.includes(cleanName) || cleanName.includes(catalogName)
          }) || null
        }

        return {
          index: idx + 1,
          identifier: r.identifier,
          stock_quantity: r.stock_quantity,
          mart_price: r.mart_price,
          mart_mrp: r.mart_mrp,
          product: matched,
          status: matched ? 'matched' : 'not_found'
        }
      })

      setPreviewRows(resolved)
      setImportStep('preview')
    } catch (err) {
      console.error('Matching products failed', err)
      toast.error('Catalog matching failed: ' + err.message)
    } finally {
      setIsMatching(false)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCSVFile(e.dataTransfer.files[0])
    }
  }

  const downloadSampleTemplate = () => {
    const headers = "barcode,name,stock_quantity,mart_price,mart_mrp\n"
    const mock = "689103,Tea Powder 80g,50,664.00,699.00\n543646,Masala Puffs 90g,120,31.00,50.00\n569173,Cheese Spread 150g,80,53.00,99.00\n"
    const blob = new Blob([headers + mock], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "ozo_inventory_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Sample template downloaded!')
  }

  const executeBulkImport = async () => {
    try {
      const getFallbackCategoryId = () => {
        if (categories.length === 0) return null
        const otherCat = categories.find(c => {
          const n = c.name.toLowerCase()
          return n.includes('other') || n.includes('general') || n.includes('grocery') || n.includes('pack')
        })
        return otherCat ? otherCat.id : categories[0].id
      }

      const matchedRows = previewRows.filter(r => r.status === 'matched').map(r => ({
        product_id: r.product.id,
        stock_quantity: r.stock_quantity,
        mart_price: r.mart_price,
        mart_mrp: r.mart_mrp,
        is_available: r.stock_quantity > 0
      }))

      const notFoundRowsWithNames = previewRows.filter(r => r.status === 'not_found' && r.name && r.name.trim() !== '')
      
      let createdRows = []
      if (notFoundRowsWithNames.length > 0) {
        const catId = getFallbackCategoryId()
        const newProductsPayload = notFoundRowsWithNames.map(r => {
          const baseSlug = r.name.toLowerCase().trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '')
          const slug = `${baseSlug}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
          
          return {
            name: r.name.trim(),
            slug,
            brand: r.brand?.trim() || null,
            unit: r.unit?.trim() || '1 unit',
            category_id: catId,
            price: r.mart_price || 0,
            mrp: r.mart_mrp || r.mart_price || 0,
            barcode: r.identifier?.trim() || null,
            is_available: true
          }
        })

        toast.loading(`Creating ${newProductsPayload.length} new custom products...`, { id: 'import-loading' })
        const { data: createdProducts, error: productsError } = await supabase
          .from('products')
          .insert(newProductsPayload)
          .select()

        if (productsError) {
          toast.dismiss('import-loading')
          throw productsError
        }

        toast.dismiss('import-loading')

        if (createdProducts && createdProducts.length > 0) {
          createdRows = createdProducts.map(p => {
            const matchingRow = notFoundRowsWithNames.find(r => 
              (r.identifier && p.barcode && r.identifier.trim() === p.barcode.trim()) || 
              (r.name.trim().toLowerCase() === p.name.trim().toLowerCase())
            )
            return {
              product_id: p.id,
              stock_quantity: matchingRow ? matchingRow.stock_quantity : 0,
              mart_price: matchingRow ? matchingRow.mart_price : p.price,
              mart_mrp: matchingRow ? matchingRow.mart_mrp : p.mrp,
              is_available: matchingRow ? matchingRow.stock_quantity > 0 : true
            }
          })
        }
      }

      const allRowsToImport = [...matchedRows, ...createdRows]

      if (allRowsToImport.length === 0) {
        toast.error('No matched or new products to import')
        return
      }

      toast.loading(`Importing ${allRowsToImport.length} products to inventory...`, { id: 'import-loading' })
      const res = await importInventoryRows(allRowsToImport)
      toast.dismiss('import-loading')

      if (res.success) {
        setShowUploader(false)
        setCsvFileName('')
        setCsvHeaders([])
        setCsvRawRows([])
        setPreviewRows([])
        setImportStep('upload')
        
        // Auto-trigger local image helper tool if online
        if (localToolState.online) {
          setTimeout(() => {
            startLocalPipeline()
          }, 800)
        }
      }
    } catch (err) {
      console.error('Bulk import failed:', err)
      toast.error('Bulk import failed: ' + err.message)
    }
  }

  const renderUploaderStep = () => {
    return (
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full py-8 overflow-y-auto scrollbar-hide">
        <div className="text-center mb-6">
          <div className="inline-flex p-3.5 bg-emerald-500/10 rounded-2xl text-emerald-500 mb-3 animate-bounce">
            <Upload className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-extrabold text-gray-900 dark:text-white font-sans">Import Your Inventory</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 max-w-md mx-auto leading-relaxed">
            Select how you would like to import or update your catalog inventory.
          </p>
        </div>

        {/* Method Toggles */}
        <div className="flex border-b border-gray-150 dark:border-[#1e1e2d] mb-6 w-full shrink-0">
          <button
            onClick={() => setImportMethod('csv')}
            className={`flex-1 pb-2.5 text-xs font-bold text-center border-b-2 transition-all cursor-pointer ${
              importMethod === 'csv'
                ? 'border-emerald-500 dark:border-[#00FF66] text-emerald-600 dark:text-[#00FF66]'
                : 'border-transparent text-gray-500 hover:text-gray-750 dark:hover:text-gray-300'
            }`}
          >
            Option 1: Upload CSV File
          </button>
          <button
            onClick={() => setImportMethod('paste')}
            className={`flex-1 pb-2.5 text-xs font-bold text-center border-b-2 transition-all cursor-pointer ${
              importMethod === 'paste'
                ? 'border-emerald-500 dark:border-[#00FF66] text-emerald-600 dark:text-[#00FF66]'
                : 'border-transparent text-gray-500 hover:text-gray-750 dark:hover:text-gray-300'
            }`}
          >
            Option 2: Copy-Paste Excel / Sheets
          </button>
        </div>

        {/* Mode specific container */}
        {importMethod === 'csv' ? (
          /* Drag & Drop Zone */
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('csv-file-input').click()}
            className={`w-full border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
              dragActive 
                ? 'border-emerald-500 dark:border-[#00FF66] bg-emerald-50 dark:bg-[#00FF66]/5 shadow-[0_0_20px_rgba(16,185,129,0.1)] dark:shadow-[0_0_20px_rgba(0,255,102,0.1)]' 
                : 'border-gray-200 dark:border-[#1e1e2f] hover:border-gray-400 dark:hover:border-[#00FF66]/50 bg-white dark:bg-[#0c0c14]'
            }`}
          >
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => handleCSVFile(e.target.files[0])}
            />
            <FileSpreadsheet className={`w-12 h-12 mb-4 transition-colors duration-300 ${dragActive ? 'text-emerald-500 dark:text-[#00FF66]' : 'text-gray-400 dark:text-gray-600'}`} />
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-300">
              Drag and drop your CSV file here, or <span className="text-emerald-600 dark:text-[#00FF66] hover:underline font-bold">browse files</span>
            </p>
            <p className="text-[10px] text-gray-500 mt-2">Only CSV files (.csv) are supported</p>
          </div>
        ) : (
          /* Excel Paste Area */
          <div className="w-full flex flex-col gap-4">
            <div className="bg-emerald-50 dark:bg-[#00FF66]/5 border border-emerald-500/10 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-emerald-800 dark:text-emerald-350">
              <Info className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
              <div>
                <span className="font-extrabold uppercase tracking-wide text-[10px] block mb-1">How to copy-paste:</span>
                Open your spreadsheet in Excel or Google Sheets, select the columns you want (e.g. barcode, quantity, price), copy them (Ctrl+C), and paste them below (Ctrl+V). We will read your headers and auto-align!
              </div>
            </div>
            <textarea
              placeholder="Paste cells here...&#10;Example:&#10;barcode	stock_quantity	mart_price	mart_mrp&#10;890103001	50	45	50&#10;890103002	10	90	100"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="w-full h-44 bg-white dark:bg-[#0c0c14] border-2 border-dashed border-gray-200 dark:border-[#1e1e2f] hover:border-gray-400 dark:hover:border-[#00FF66]/50 rounded-3xl p-4 text-xs font-semibold font-mono text-gray-900 dark:text-white outline-none focus:border-emerald-500 dark:focus:border-[#00FF66] transition-colors resize-none placeholder-gray-400 dark:placeholder-gray-600"
            />
            <button
              onClick={handlePastedData}
              className="w-full py-3 bg-emerald-500 dark:bg-[#00FF66] text-white dark:text-black font-extrabold rounded-xl hover:bg-emerald-600 dark:hover:bg-[#00e65c] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 dark:shadow-[0_4px_12px_rgba(0,255,102,0.2)] font-sans text-xs uppercase tracking-wider"
            >
              Process Pasted Data & Map Columns
            </button>
          </div>
        )}

        {/* Helper Action links */}
        <div className="flex items-center gap-4 mt-8 w-full justify-between px-4 shrink-0">
          <button
            onClick={downloadSampleTemplate}
            className="flex items-center gap-2 text-[11px] font-bold text-emerald-600 dark:text-[#00FF66] hover:text-emerald-700 dark:hover:text-[#00e65c] transition-colors bg-emerald-50 dark:bg-[#00FF66]/10 px-4 py-2.5 rounded-xl border border-emerald-100 dark:border-[#00FF66]/20 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Sample CSV Template
          </button>

          {inventoryTotalCount > 0 && (
            <button
              onClick={() => setShowUploader(false)}
              className="text-[11px] font-bold text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-[#151522] cursor-pointer"
            >
              Cancel & Return
            </button>
          )}
        </div>
      </div>
    )
  }

  const renderMappingStep = () => {
    const getColumnSamples = (headerName) => {
      const idx = csvHeaders.indexOf(headerName)
      if (idx === -1) return []
      return csvRawRows
        .map(row => row[idx])
        .filter(val => val !== undefined && val !== null && val.trim() !== '')
        .slice(0, 3)
    }

    const renderMappingPreview = () => {
      const identifierIdx = csvHeaders.indexOf(columnMapping.product_identifier)
      const qtyIdx = csvHeaders.indexOf(columnMapping.stock_quantity)
      const priceIdx = csvHeaders.indexOf(columnMapping.mart_price)
      const mrpIdx = csvHeaders.indexOf(columnMapping.mart_mrp)

      if (identifierIdx === -1) return null

      const cleanNumber = (val) => {
        if (val === undefined || val === null || val.toString().trim() === '') return null
        const cleaned = val.toString().trim()
          .replace(/[₹$,\s]/g, '')
          .replace(/[A-Za-z]/g, '')
        const num = parseFloat(cleaned)
        return isNaN(num) ? null : num
      }

      const cleanInteger = (val) => {
        if (val === undefined || val === null || val.toString().trim() === '') return 0
        const cleaned = val.toString().trim()
          .replace(/[,\s]/g, '')
          .replace(/[A-Za-z]/g, '')
        const num = parseInt(cleaned, 10)
        return isNaN(num) ? 0 : num
      }

      const previewItems = csvRawRows.slice(0, 3).map((row) => {
        const idVal = row[identifierIdx]?.trim() || 'N/A'
        const qtyVal = cleanInteger(row[qtyIdx])
        const priceVal = priceIdx !== -1 && row[priceIdx] ? `₹${cleanNumber(row[priceIdx])?.toFixed(2) || '0.00'}` : 'Inherit Catalog'
        const mrpVal = mrpIdx !== -1 && row[mrpIdx] ? `₹${cleanNumber(row[mrpIdx])?.toFixed(2) || '0.00'}` : 'Inherit Catalog'
        return { idVal, qtyVal, priceVal, mrpVal }
      })

      return (
        <div className="mt-5 border border-emerald-500/20 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.015] rounded-2xl p-4">
          <h4 className="text-[10px] font-black text-gray-800 dark:text-gray-300 uppercase tracking-wider mb-2.5">Live Mapping Preview (First 3 Rows)</h4>
          <div className="space-y-2">
            {previewItems.map((item, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between text-xs py-1.5 border-b border-gray-100 dark:border-white/5 last:border-b-0">
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-400 font-bold uppercase">Identifier</span>
                  <span className="font-mono font-bold text-gray-800 dark:text-gray-250">{item.idVal}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[9px] text-gray-400 font-bold uppercase">Qty</span>
                  <span className="font-mono font-semibold text-gray-800 dark:text-gray-250">{item.qtyVal}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[9px] text-gray-400 font-bold uppercase">Price</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-[#00FF66]">{item.priceVal}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[9px] text-gray-400 font-bold uppercase">MRP</span>
                  <span className="font-mono font-semibold text-gray-800 dark:text-gray-250">{item.mrpVal}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    const getValidationWarnings = () => {
      const warnings = []
      const qtyIdx = csvHeaders.indexOf(columnMapping.stock_quantity)
      const priceIdx = csvHeaders.indexOf(columnMapping.mart_price)
      const mrpIdx = csvHeaders.indexOf(columnMapping.mart_mrp)
      const idenIdx = csvHeaders.indexOf(columnMapping.product_identifier)

      let invalidQtyCount = 0
      let invalidPriceCount = 0
      let invalidMrpCount = 0

      csvRawRows.forEach(row => {
        if (qtyIdx !== -1 && row[qtyIdx]) {
          const raw = row[qtyIdx].toString().trim().replace(/[,\s]/g, '')
          if (raw && isNaN(parseInt(raw, 10))) invalidQtyCount++
        }
        if (priceIdx !== -1 && row[priceIdx]) {
          const raw = row[priceIdx].toString().trim().replace(/[₹$,\s]/g, '')
          if (raw && isNaN(parseFloat(raw))) invalidPriceCount++
        }
        if (mrpIdx !== -1 && row[mrpIdx]) {
          const raw = row[mrpIdx].toString().trim().replace(/[₹$,\s]/g, '')
          if (raw && isNaN(parseFloat(raw))) invalidMrpCount++
        }
      })

      if (invalidQtyCount > 0) {
        warnings.push(`Found ${invalidQtyCount} rows with non-numeric stock values (will default to 0).`)
      }
      if (invalidPriceCount > 0) {
        warnings.push(`Found ${invalidPriceCount} rows with non-numeric price values (will inherit catalog price).`)
      }
      if (invalidMrpCount > 0) {
        warnings.push(`Found ${invalidMrpCount} rows with non-numeric MRP values (will inherit catalog MRP).`)
      }

      // Check if Stock Quantity looks like a serial number/index
      if (qtyIdx !== -1 && csvRawRows.length > 5) {
        let isSequential = true
        for (let i = 0; i < Math.min(csvRawRows.length, 10); i++) {
          const val = parseInt(csvRawRows[i][qtyIdx]?.toString().trim().replace(/[,\s]/g, ''), 10)
          if (isNaN(val) || (i > 0 && val !== parseInt(csvRawRows[i-1][qtyIdx]?.toString().trim().replace(/[,\s]/g, ''), 10) + 1)) {
            isSequential = false
            break
          }
        }
        if (isSequential) {
          warnings.push(`⚠️ Stock Quantity column contains sequential numbers (1, 2, 3...). You might have mapped the Serial Number/Row Index column instead of actual stock.`)
        }
      }

      // Check if Product Identifier has extremely short values
      if (idenIdx !== -1 && csvRawRows.length > 0) {
        const sampleIds = csvRawRows.slice(0, 10).map(r => r[idenIdx]?.toString().trim()).filter(Boolean)
        const allVeryShort = sampleIds.length > 0 && sampleIds.every(id => id.length <= 3)
        if (allVeryShort) {
          warnings.push(`⚠️ Product Identifier column has very short codes (under 4 characters). Barcodes are usually longer. Check if you mapped the wrong column.`)
        }
      }

      return warnings
    }

    const warnings = getValidationWarnings()

    const CustomSelect = ({ value, onChange, placeholder, isRequired }) => {
      const [isOpen, setIsOpen] = useState(false)
      
      const getLabel = () => {
        if (!value) return placeholder
        const samples = getColumnSamples(value)
        return value + (samples.length > 0 ? ` (e.g. ${samples.join(', ')})` : '')
      }

      return (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between bg-gray-50 dark:bg-[#12121e] border border-gray-200 dark:border-[#1e1e2f] rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:border-emerald-500 dark:hover:border-[#00FF66] focus:outline-none transition-all duration-200 cursor-pointer text-left font-medium"
          >
            <span className="truncate">{getLabel()}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-550 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-[#12121e] border border-gray-200 dark:border-[#1e1e2f] rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto scrollbar-hide py-1.5">
                {!isRequired && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange('')
                      setIsOpen(false)
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a2c] hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {placeholder}
                  </button>
                )}
                {csvHeaders.map((h) => {
                  const samples = getColumnSamples(h)
                  const isSelected = value === h
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        onChange(h)
                        setIsOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs transition-colors cursor-pointer flex flex-col gap-0.5 border-b border-gray-100/50 dark:border-white/5 last:border-b-0 ${
                        isSelected
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-[#00FF66] font-bold'
                          : 'text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1b1b2d]'
                      }`}
                    >
                      <span className="font-semibold text-sm">{h}</span>
                      {samples.length > 0 && (
                        <span className="text-[10px] text-gray-450 dark:text-gray-500 font-normal">
                          Sample values: {samples.join(', ')}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )
    }

    return (
      <div className="flex-1 max-w-5xl mx-auto w-full py-8 flex flex-col justify-center overflow-y-auto scrollbar-hide">
        <div className="bg-white dark:bg-[#0c0c14] border border-gray-200 dark:border-[#1e1e2f] rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <button 
              onClick={() => setImportStep('upload')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a2c] rounded-xl text-gray-550 dark:text-gray-400 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white font-sans">Map CSV Columns</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-gray-500">Source: {csvFileName}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-[#00FF66] border border-emerald-500/20">
                  {csvRawRows.length} rows loaded
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left side: CSV Columns (Source Tags) */}
            <div className="lg:col-span-4 bg-gray-50/50 dark:bg-[#08080f] rounded-2xl p-5 border border-gray-150 dark:border-[#131320] flex flex-col gap-4">
              <div>
                <h4 className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider">CSV Columns Detected</h4>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  Drag these columns to target slots, or use the dropdowns to match them.
                </p>
              </div>

              <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[480px] pr-1.5 scrollbar-hide">
                {csvHeaders.map((h) => {
                  const samples = getColumnSamples(h)
                  const isMapped = Object.values(columnMapping).includes(h)
                  
                  return (
                    <div
                      key={h}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", h)
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing flex flex-col gap-1 select-none ${
                        isMapped
                          ? 'bg-emerald-500/5 dark:bg-[#00FF66]/[0.02] border-emerald-500/20 text-emerald-600 dark:text-[#00FF66] opacity-60'
                          : 'bg-white dark:bg-[#12121e] border-gray-200 dark:border-[#1e1e2f] hover:border-emerald-500 dark:hover:border-[#00FF66] hover:shadow-sm text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate">{h}</span>
                        {isMapped && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-500/10 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-[#00FF66]">
                            Mapped
                          </span>
                        )}
                      </div>
                      {samples.length > 0 && (
                        <span className="text-[10px] text-gray-550 dark:text-gray-400 font-normal truncate">
                          e.g. {samples.join(', ')}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right side: Mapping target slots */}
            <div className="lg:col-span-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Identifier Slot */}
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const h = e.dataTransfer.getData("text/plain")
                    if (h) setColumnMapping(prev => ({ ...prev, product_identifier: h }))
                  }}
                  className="bg-white dark:bg-[#0e0e18] border border-gray-200 dark:border-[#1e1e2f] rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-emerald-500/50 transition-colors"
                >
                  <div>
                    <label className="block text-[11px] font-black text-gray-800 dark:text-gray-300 uppercase tracking-wider">
                      Product Identifier <span className="text-[#FF3366]">*</span>
                    </label>
                    <p className="text-[10px] text-gray-500 mt-0.5">Used for matching products (Barcode / SKU / Slug)</p>
                  </div>
                  <CustomSelect
                    value={columnMapping.product_identifier}
                    onChange={(val) => setColumnMapping(prev => ({ ...prev, product_identifier: val }))}
                    placeholder="Drop column here or select..."
                    isRequired={true}
                  />
                </div>

                {/* Product Name Slot */}
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const h = e.dataTransfer.getData("text/plain")
                    if (h) setColumnMapping(prev => ({ ...prev, product_name: h }))
                  }}
                  className="bg-white dark:bg-[#0e0e18] border border-gray-200 dark:border-[#1e1e2f] rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-emerald-500/50 transition-colors"
                >
                  <div>
                    <label className="block text-[11px] font-black text-gray-800 dark:text-gray-300 uppercase tracking-wider">
                      Product Name
                    </label>
                    <p className="text-[10px] text-gray-500 mt-0.5">Allows auto-creation of missing products</p>
                  </div>
                  <CustomSelect
                    value={columnMapping.product_name}
                    onChange={(val) => setColumnMapping(prev => ({ ...prev, product_name: val }))}
                    placeholder="Drop column here or select..."
                  />
                </div>

                {/* Brand Name Slot */}
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const h = e.dataTransfer.getData("text/plain")
                    if (h) setColumnMapping(prev => ({ ...prev, brand_name: h }))
                  }}
                  className="bg-white dark:bg-[#0e0e18] border border-gray-200 dark:border-[#1e1e2f] rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-emerald-500/50 transition-colors"
                >
                  <div>
                    <label className="block text-[11px] font-black text-gray-800 dark:text-gray-300 uppercase tracking-wider">
                      Brand Name
                    </label>
                    <p className="text-[10px] text-gray-500 mt-0.5">Brand name of the product</p>
                  </div>
                  <CustomSelect
                    value={columnMapping.brand_name}
                    onChange={(val) => setColumnMapping(prev => ({ ...prev, brand_name: val }))}
                    placeholder="Drop column here or select..."
                  />
                </div>

                {/* Unit / Pack Size Slot */}
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const h = e.dataTransfer.getData("text/plain")
                    if (h) setColumnMapping(prev => ({ ...prev, product_unit: h }))
                  }}
                  className="bg-white dark:bg-[#0e0e18] border border-gray-200 dark:border-[#1e1e2f] rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-emerald-500/50 transition-colors"
                >
                  <div>
                    <label className="block text-[11px] font-black text-gray-800 dark:text-gray-300 uppercase tracking-wider">
                      Unit / Pack Size
                    </label>
                    <p className="text-[10px] text-gray-500 mt-0.5">e.g. 500g, 1L, 1 packet</p>
                  </div>
                  <CustomSelect
                    value={columnMapping.product_unit}
                    onChange={(val) => setColumnMapping(prev => ({ ...prev, product_unit: val }))}
                    placeholder="Drop column here or select..."
                  />
                </div>

                {/* Stock Quantity Slot */}
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const h = e.dataTransfer.getData("text/plain")
                    if (h) setColumnMapping(prev => ({ ...prev, stock_quantity: h }))
                  }}
                  className="bg-white dark:bg-[#0e0e18] border border-gray-200 dark:border-[#1e1e2f] rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-emerald-500/50 transition-colors"
                >
                  <div>
                    <label className="block text-[11px] font-black text-gray-800 dark:text-gray-300 uppercase tracking-wider">
                      Stock Quantity <span className="text-[#FF3366]">*</span>
                    </label>
                    <p className="text-[10px] text-gray-500 mt-0.5">Physical quantity available in stock</p>
                  </div>
                  <CustomSelect
                    value={columnMapping.stock_quantity}
                    onChange={(val) => setColumnMapping(prev => ({ ...prev, stock_quantity: val }))}
                    placeholder="Drop column here or select..."
                    isRequired={true}
                  />
                </div>

                {/* Selling Price Slot */}
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const h = e.dataTransfer.getData("text/plain")
                    if (h) setColumnMapping(prev => ({ ...prev, mart_price: h }))
                  }}
                  className="bg-white dark:bg-[#0e0e18] border border-gray-200 dark:border-[#1e1e2f] rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-emerald-500/50 transition-colors"
                >
                  <div>
                    <label className="block text-[11px] font-black text-gray-800 dark:text-gray-300 uppercase tracking-wider">
                      Selling Price (₹)
                    </label>
                    <p className="text-[10px] text-gray-500 mt-0.5">Your selling price at the mart</p>
                  </div>
                  <CustomSelect
                    value={columnMapping.mart_price}
                    onChange={(val) => setColumnMapping(prev => ({ ...prev, mart_price: val }))}
                    placeholder="Drop column here or select..."
                  />
                </div>

                {/* MRP Slot */}
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const h = e.dataTransfer.getData("text/plain")
                    if (h) setColumnMapping(prev => ({ ...prev, mart_mrp: h }))
                  }}
                  className="bg-white dark:bg-[#0e0e18] border border-gray-200 dark:border-[#1e1e2f] rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-emerald-500/50 transition-colors"
                >
                  <div>
                    <label className="block text-[11px] font-black text-gray-800 dark:text-gray-300 uppercase tracking-wider">
                      Maximum Retail Price (₹)
                    </label>
                    <p className="text-[10px] text-gray-500 mt-0.5">Printed price (MRP)</p>
                  </div>
                  <CustomSelect
                    value={columnMapping.mart_mrp}
                    onChange={(val) => setColumnMapping(prev => ({ ...prev, mart_mrp: val }))}
                    placeholder="Drop column here or select..."
                  />
                </div>
              </div>

              {/* Live Mapping Preview */}
              {renderMappingPreview()}

              {/* Warnings & Process Button */}
              <div className="space-y-4">
                {warnings.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5 animate-pulse" />
                    <div>
                      <span className="font-extrabold uppercase tracking-wide text-[10px] block mb-1">Data Mismatch Warnings:</span>
                      <ul className="list-disc pl-4 space-y-1 text-[11px] font-medium">
                        {warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <button
                  onClick={runProductMatching}
                  disabled={isMatching || !columnMapping.product_identifier}
                  className="w-full py-3 bg-emerald-500 dark:bg-[#00FF66] disabled:bg-gray-700 text-white dark:text-black font-extrabold rounded-xl hover:bg-emerald-600 dark:hover:bg-[#00e65c] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 dark:shadow-[0_4px_12px_rgba(0,255,102,0.2)] disabled:shadow-none font-sans text-xs uppercase tracking-wider"
                >
                  {isMatching ? (
                    <>
                      <div className="w-4 h-4 border-2 border-t-black border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                      Matching Products with Catalog...
                    </>
                  ) : (
                    'Process Match & Preview'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderPreviewStep = () => {
    const matchedCount = previewRows.filter(r => r.status === 'matched').length
    const unmatchedCount = previewRows.filter(r => r.status === 'not_found').length
    const matchRate = previewRows.length > 0 ? (matchedCount / previewRows.length) * 100 : 0

    return (
      <div className="flex-1 flex flex-col overflow-hidden py-4 w-full">
        {/* Header Summary Stats */}
        <div className="flex items-center justify-between mb-6 bg-white dark:bg-[#0c0c14] border border-gray-200 dark:border-[#1e1e2f] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setImportStep('mapping')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#1a1a2c] rounded-xl text-gray-550 dark:text-gray-400 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white font-sans">Review & Match Preview</h3>
              <p className="text-xs text-gray-500">Cross-referencing global catalog</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-sans">
            <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300 font-bold">
              Total Rows: {previewRows.length}
            </div>
            <div className="px-3 py-1.5 bg-emerald-500/10 rounded-lg text-emerald-500 font-bold border border-emerald-500/20">
              Matched: {matchedCount}
            </div>
            <div className="px-3 py-1.5 bg-amber-500/10 rounded-lg text-amber-500 font-bold border border-amber-500/20">
              Not Found: {unmatchedCount}
            </div>
          </div>
        </div>

        {matchRate < 10 && previewRows.length > 0 && (
          <div className="mb-4 bg-red-50 dark:bg-red-950/20 border border-red-500/20 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-red-800 dark:text-red-300">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500 mt-0.5 animate-pulse" />
            <div>
              <span className="font-extrabold uppercase tracking-wide text-[10px] block mb-1">⚠️ Mapping Issue Detected (Low Match Rate)</span>
              <p className="font-medium text-[11px]">
                Almost no products matched the global catalog (Match Rate: <strong>{matchRate.toFixed(1)}%</strong>). 
                You likely selected the wrong <strong>Product Identifier</strong> or <strong>Stock Quantity</strong> column. 
                Please click <strong>"Back to Mapping"</strong> and verify your selection (e.g. choose the column containing full barcodes or slugs).
              </p>
            </div>
          </div>
        )}

        {/* Preview Scrollable Table */}
        <div className="flex-1 bg-white dark:bg-[#0c0c14] border border-gray-200 dark:border-[#1e1e2f] rounded-2xl overflow-hidden flex flex-col mb-4">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[#181827] bg-gray-55 dark:bg-[#0e0e1a]">
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-550 dark:text-gray-400">#</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400">CSV Identifier</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400">Matched Catalog Product</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400">Import Stock</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400">Import Price</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400">Match Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-[#181827]">
                {previewRows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-[#121222] transition-colors">
                    <td className="p-4 text-sm font-semibold text-gray-500">{r.index}</td>
                    <td className="p-4 text-sm font-bold text-gray-800 dark:text-gray-300 font-mono">{r.identifier}</td>
                    <td className="p-4">
                      {r.status === 'matched' ? (
                        <div className="flex items-center gap-3">
                          {r.product.image_url ? (
                            <img src={r.product.image_url} alt={r.product.name} className="w-8 h-8 object-contain rounded p-0.5 bg-gray-100 dark:bg-[#1c1c28]" />
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 dark:bg-[#1c1c28] rounded flex items-center justify-center text-xs">No Img</div>
                          )}
                          <div>
                            <p className="font-bold text-sm text-gray-900 dark:text-gray-200">{r.product.name}</p>
                            <p className="text-xs text-gray-555">Unit: {r.product.unit} | Brand: {r.product.brand || 'Ozo Choice'}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm">
                          <Info className="w-4 h-4" />
                          <span>No catalog match found</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-sm font-extrabold font-mono text-gray-800 dark:text-gray-300">{r.stock_quantity}</td>
                    <td className="p-4 text-sm">
                      {r.mart_price !== null ? (
                        <div className="flex flex-col">
                          <span className="font-extrabold font-mono text-emerald-600 dark:text-[#00FF66]">₹{parseFloat(r.mart_price).toFixed(2)}</span>
                          {r.product && (
                            <span className="text-[10px] text-gray-500 line-through">Catalog: ₹{parseFloat(r.product.price).toFixed(2)}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs italic">Inherit Catalog (₹{r.product ? parseFloat(r.product.price).toFixed(2) : '0.00'})</span>
                      )}
                    </td>
                    <td className="p-4">
                      {r.status === 'matched' ? (
                        <span className="px-3 py-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                          Ready to Import
                        </span>
                      ) : (
                        <span className="px-3 py-1 text-xs font-bold text-amber-500 bg-amber-500/10 rounded-full border border-amber-500/20">
                          Skipped
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Import Footer Actions */}
          <div className="border-t border-gray-200 dark:border-[#181827] bg-gray-50 dark:bg-[#0c0c14] px-6 py-4 flex items-center justify-between font-sans">
            <button
              onClick={() => setImportStep('mapping')}
              className="px-5 py-2.5 border border-gray-200 dark:border-[#1e1e2d] bg-white dark:bg-[#12121a] hover:bg-gray-50 dark:hover:bg-[#1a1a28] text-xs font-bold text-gray-800 dark:text-gray-300 rounded-xl transition-all cursor-pointer"
            >
              Back to Mapping
            </button>

            <button
              onClick={executeBulkImport}
              disabled={matchedCount === 0}
              className="px-6 py-2.5 bg-emerald-500 dark:bg-[#00FF66] disabled:bg-gray-700 text-white dark:text-black font-extrabold text-xs rounded-xl hover:bg-emerald-600 dark:hover:bg-[#00e65c] transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 dark:shadow-[0_4px_12px_rgba(0,255,102,0.2)] disabled:shadow-none"
            >
              <Check className="w-4 h-4" />
              Confirm Import ({matchedCount} products)
            </button>
          </div>
        </div>
      </div>
    )
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
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-gray-400 rounded-full border-2 border-white dark:border-[#070709]" />
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
      <div className="mb-6 bg-gradient-to-r from-emerald-950/10 to-teal-950/10 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-500/20 dark:border-[#00FF66]/20 rounded-2xl p-5 font-sans relative overflow-hidden shadow-lg shadow-emerald-500/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Info */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 dark:bg-[#00FF66]/10 flex items-center justify-center text-emerald-400 dark:text-[#00FF66]">
                {isRunning ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Package className="h-5 w-5" />
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 dark:bg-[#00FF66] rounded-full border-2 border-white dark:border-[#070709] animate-pulse" />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-emerald-600 dark:text-[#00FF66] uppercase tracking-widest">Local Image Finder</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold uppercase ${
                  isRunning ? 'bg-emerald-500/20 text-emerald-600 dark:text-[#00FF66]' :
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
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 dark:from-[#00FF66] dark:to-teal-450 transition-all duration-500 rounded-full" 
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
                    className="px-3.5 py-2 bg-emerald-500 dark:bg-[#00FF66] dark:text-black hover:bg-emerald-600 dark:hover:bg-[#00e65c] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
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
                  className="px-4 py-2.5 bg-emerald-500 dark:bg-[#00FF66] dark:text-black hover:bg-emerald-600 dark:hover:bg-[#00e65c] text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
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
    <div className="flex-1 flex flex-col p-4 lg:p-8 overflow-hidden bg-gray-50 dark:bg-[#070709] pb-16 lg:pb-8">
      {renderLocalToolWidget()}
      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white font-sans">Mart Inventory Controls</h2>
          <p className="text-sm text-gray-550 dark:text-gray-400 mt-0.5 font-sans">Directly toggle item stock status or edit prices instantly.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* Low Stock Toggle */}
          <button
            onClick={() => {
              setShowLowStockOnly(prev => !prev)
              setCurrentPage(1)
            }}
            className={`flex items-center justify-center gap-2 text-xs font-bold transition-all px-4 py-2.5 rounded-xl border cursor-pointer font-sans w-full sm:w-auto ${
              showLowStockOnly
                ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold shadow-sm shadow-amber-500/5'
                : 'bg-white dark:bg-[#0c0c14] border-gray-200 dark:border-[#1e1e2f] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1a26]'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${showLowStockOnly ? 'text-amber-500 animate-bounce' : 'text-gray-400 dark:text-gray-500'}`} />
            <span>Low Stock Alert</span>
          </button>

          {/* Add Single Product Button */}
          <button
            onClick={() => {
              setShowSingleProductModal(true)
            }}
            className="flex items-center justify-center gap-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-[#00FF66] dark:hover:bg-[#00e65c] dark:text-black transition-colors px-4 py-2.5 rounded-xl border border-transparent cursor-pointer font-sans w-full sm:w-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Single Product
          </button>

          {/* Bulk Import Button */}
          <button
            onClick={() => {
              setShowUploader(true)
              setImportStep('upload')
            }}
            className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 dark:text-[#00FF66] hover:text-emerald-700 dark:hover:text-[#00e65c] transition-colors bg-emerald-50 dark:bg-[#00FF66]/10 px-4 py-2.5 rounded-xl border border-emerald-100 dark:border-[#00FF66]/20 cursor-pointer font-sans w-full sm:w-auto"
          >
            <Upload className="w-3.5 h-3.5" />
            Bulk Import CSV
          </button>

          {/* Download Image Resolver App */}
          {downloadUrl && (
            <a
              href={downloadUrl}
              download="OzoMartImageTool.exe"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-xs font-bold text-blue-600 dark:text-[#38bdf8] hover:text-blue-700 dark:hover:text-[#7dd3fc] transition-colors bg-blue-50 dark:bg-[#38bdf8]/10 px-4 py-2.5 rounded-xl border border-blue-100 dark:border-[#38bdf8]/20 cursor-pointer font-sans w-full sm:w-auto"
              title="Download desktop app to scan and resolve missing product images automatically"
            >
              <Download className="w-3.5 h-3.5" />
              Download Image Tool
            </a>
          )}

          {/* Search Bar */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search products by name/brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#0c0c14] border border-gray-200 dark:border-[#1e1e2f] rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66] transition-colors font-sans"
            />
          </div>
        </div>
      </div>

      {/* Inventory Container */}
      {(inventoryTotalCount === 0 && !isLoadingInventory && searchQuery === '') || showUploader ? (
        <div className="flex-1 bg-white dark:bg-[#0c0c14] border border-gray-200 dark:border-[#181827] rounded-2xl overflow-hidden flex flex-col p-6 font-sans">
          {importStep === 'upload' && renderUploaderStep()}
          {importStep === 'mapping' && renderMappingStep()}
          {importStep === 'preview' && renderPreviewStep()}
        </div>
      ) : (
        /* Inventory Table Container */
        <div className="flex-1 bg-white dark:bg-[#0c0c14] border border-gray-200 dark:border-[#181827] rounded-2xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            {isLoadingInventory ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-t-emerald-500 dark:border-t-[#00FF66] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 text-sm">Fetching stock ledger...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-8">
                <Package className="w-12 h-12 text-gray-400 dark:text-gray-700 mb-2" />
                <p className="text-gray-700 dark:text-gray-400 font-bold">No products found</p>
                <p className="text-xs text-gray-555 dark:text-gray-600 mt-1">Try resetting your search query.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[650px] lg:min-w-0">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-[#181827] bg-gray-50 dark:bg-[#0e0e1a]">
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-550 dark:text-gray-400">Product Detail</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400">Brand</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400">Sales Price (₹)</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400">MRP (₹)</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400">Stock Qty</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-555 dark:text-gray-400 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-[#181827]">
                  {filteredProducts.map(product => (
                    <tr 
                      key={product.id} 
                      className={`hover:bg-gray-50 dark:hover:bg-[#121222] transition-colors group ${
                        product.stock_quantity < 5 
                          ? 'bg-amber-500/[0.03] dark:bg-amber-500/[0.015] border-l-2 border-l-amber-500/40 dark:border-l-amber-500/20' 
                          : ''
                      }`}
                    >
                      {/* Details */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name} 
                              className="w-10 h-10 object-contain bg-gray-100 dark:bg-[#1c1c28] rounded-lg p-1 cursor-zoom-in transition-transform duration-200 hover:scale-105 active:scale-95"
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                setHoveredImage({ url: product.image_url, name: product.name, rect })
                              }}
                              onMouseLeave={() => setHoveredImage(null)}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-150 dark:bg-[#1c1c28] rounded-lg flex items-center justify-center text-gray-500 text-xs">
                              No Img
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-sm text-gray-800 dark:text-gray-250 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                              {product.name}
                            </p>
                            <p className="text-xs text-gray-555 mt-0.5">
                              Unit size: {product.unit}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Brand */}
                      <td className="p-4 text-sm font-semibold text-gray-800 dark:text-gray-300">
                        {product.brand || 'OZO Choice'}
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
                              className="w-20 bg-gray-50 dark:bg-[#1a1a26] border border-gray-200 dark:border-[#2d2d3e] rounded-lg px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66] font-bold font-mono"
                              autoFocus
                            />
                            <button
                              onClick={() => handlePriceSave(product.id)}
                              className="px-2 py-1 bg-emerald-500 dark:bg-[#00FF66] text-white dark:text-black rounded text-xs font-bold hover:bg-emerald-600 dark:hover:bg-[#00e65c] cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={handlePriceCancel}
                              className="px-2 py-1 bg-gray-100 dark:bg-[#242435] text-gray-700 dark:text-gray-400 rounded text-xs font-semibold hover:text-gray-900 dark:hover:text-white cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group-hover:translate-x-0.5 transition-transform">
                            <span className="font-bold text-sm text-emerald-600 dark:text-[#00FF66] font-mono">
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
                      <td className="p-4 text-sm font-extrabold font-mono text-gray-800 dark:text-gray-300">
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
                              className="w-16 bg-gray-55 dark:bg-[#1a1a26] border border-gray-200 dark:border-[#2d2d3e] rounded-lg px-2 py-1 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66] font-bold font-mono"
                              autoFocus
                            />
                            <button
                              onClick={() => handleStockSave(product.id)}
                              className="px-2 py-1 bg-emerald-500 dark:bg-[#00FF66] text-white dark:text-black rounded text-xs font-bold hover:bg-emerald-600 dark:hover:bg-[#00e65c] cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleStockCancel}
                              className="px-2 py-1 bg-gray-100 dark:bg-[#242435] text-gray-700 dark:text-gray-400 rounded text-xs font-semibold hover:text-gray-900 dark:hover:text-white cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 group-hover:translate-x-0.5 transition-transform">
                              <span className={`font-bold text-sm font-mono ${product.stock_quantity < 5 ? 'text-amber-600 dark:text-amber-400 font-extrabold' : 'text-gray-800 dark:text-gray-300'}`}>
                                {product.stock_quantity ?? 0}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingStockId(product.id)
                                  setTempStock((product.stock_quantity ?? 0).toString())
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-550 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white underline cursor-pointer"
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
                          onClick={() => toggleStock(product.id, !product.is_available)}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            product.is_available
                              ? 'bg-emerald-50 dark:bg-[#00FF66]/10 border border-emerald-100 dark:border-[#00FF66]/20 text-emerald-600 dark:text-[#00FF66] hover:bg-emerald-100 dark:hover:bg-[#00FF66]/20'
                              : 'bg-[#FF3366]/10 border border-[#FF3366]/20 text-[#FF3366] hover:bg-[#FF3366]/20'
                          }`}
                        >
                          {product.is_available ? 'In Stock' : 'Out of Stock'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          {!isLoadingInventory && inventoryTotalCount > 0 && (
            <div className="border-t border-gray-200 dark:border-[#181827] bg-gray-50 dark:bg-[#0c0c14] px-6 py-4 flex items-center justify-between">
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 select-none">
                Showing <span className="text-gray-900 dark:text-white font-extrabold">{Math.min(inventoryTotalCount, (currentPage - 1) * 20 + 1)}</span> to{' '}
                <span className="text-gray-900 dark:text-white font-extrabold">{Math.min(inventoryTotalCount, currentPage * 20)}</span> of{' '}
                <span className="text-gray-900 dark:text-white font-extrabold">{inventoryTotalCount}</span> products
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-200 dark:border-[#1e1e2d] bg-white dark:bg-[#12121a] hover:bg-gray-50 dark:hover:bg-[#1a1a28] disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#12121a] text-xs font-bold text-gray-800 dark:text-gray-300 rounded-xl transition-all cursor-pointer select-none"
                >
                  ← Previous
                </button>
                <div className="text-xs font-extrabold text-gray-900 dark:text-white px-3 select-none">
                  Page {currentPage} of {Math.ceil(inventoryTotalCount / 20) || 1}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(inventoryTotalCount / 20), prev + 1))}
                  disabled={currentPage * 20 >= inventoryTotalCount}
                  className="px-4 py-2 border border-gray-200 dark:border-[#1e1e2d] bg-white dark:bg-[#12121a] hover:bg-gray-50 dark:hover:bg-[#1a1a28] disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#12121a] text-xs font-bold text-gray-800 dark:text-gray-300 rounded-xl transition-all cursor-pointer select-none"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showSingleProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-[#0c0c14] border border-gray-200 dark:border-[#1e1e2f] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-[#08080f]/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-500" />
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
            <div className="flex border-b border-gray-100 dark:border-white/5 p-2 bg-gray-50/30 dark:bg-[#08080f]/20">
              <button
                onClick={() => setSingleProductMode('catalog')}
                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  singleProductMode === 'catalog'
                    ? 'bg-white dark:bg-[#12121e] text-emerald-600 dark:text-[#00FF66] shadow-sm border border-emerald-500/10'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Select from Global Catalog
              </button>
              <button
                onClick={() => setSingleProductMode('new')}
                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  singleProductMode === 'new'
                    ? 'bg-white dark:bg-[#12121e] text-emerald-600 dark:text-[#00FF66] shadow-sm border border-emerald-500/10'
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
                    <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">
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
                        className="w-full bg-gray-50 dark:bg-[#12121e] border border-gray-200 dark:border-[#1e1e2f] rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66] transition-colors"
                      />
                    </div>

                    {/* Results Dropdown */}
                    {catalogResults.length > 0 && !selectedCatalogProduct && (
                      <div className="absolute z-10 left-0 right-0 mt-1.5 bg-white dark:bg-[#0f0f1b] border border-gray-200 dark:border-[#1e1e2f] rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
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
                            className="flex items-center gap-3 p-3 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/[0.03] cursor-pointer transition-colors"
                          >
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-8 h-8 object-contain rounded bg-gray-50 dark:bg-[#181825] p-0.5" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                                <Package className="w-4 h-4" />
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
                    <div className="border border-emerald-500/20 bg-emerald-500/[0.02] rounded-xl p-4 flex items-center gap-4">
                      {selectedCatalogProduct.image_url ? (
                        <img src={selectedCatalogProduct.image_url} alt={selectedCatalogProduct.name} className="w-12 h-12 object-contain rounded bg-white dark:bg-[#12121e] p-1" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-black text-emerald-600 dark:text-[#00FF66] bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Selected Catalog Product</span>
                        <h4 className="text-sm font-bold text-gray-955 dark:text-white truncate mt-1">{selectedCatalogProduct.name}</h4>
                        <p className="text-xs text-gray-500">{selectedCatalogProduct.brand || 'No Brand'} • {selectedCatalogProduct.unit} • {selectedCatalogProduct.barcode || 'No Barcode'}</p>
                      </div>
                    </div>
                  )}

                  {/* Pricing and Stock Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Stock Quantity <span className="text-[#FF3366]">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={catalogForm.stock_quantity}
                        onChange={(e) => setCatalogForm(prev => ({ ...prev, stock_quantity: e.target.value }))}
                        className="w-full bg-gray-55 dark:bg-[#12121e] border border-gray-200 dark:border-[#1e1e2f] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Mart Price (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={selectedCatalogProduct ? `Inherit ₹${parseFloat(selectedCatalogProduct.price || 0).toFixed(2)}` : 'e.g. 99.00'}
                        value={catalogForm.mart_price}
                        onChange={(e) => setCatalogForm(prev => ({ ...prev, mart_price: e.target.value }))}
                        className="w-full bg-gray-55 dark:bg-[#12121e] border border-gray-200 dark:border-[#1e1e2f] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Mart MRP (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={selectedCatalogProduct ? `Inherit ₹${parseFloat(selectedCatalogProduct.mrp || 0).toFixed(2)}` : 'e.g. 120.00'}
                        value={catalogForm.mart_mrp}
                        onChange={(e) => setCatalogForm(prev => ({ ...prev, mart_mrp: e.target.value }))}
                        className="w-full bg-gray-55 dark:bg-[#12121e] border border-gray-200 dark:border-[#1e1e2f] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66]"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => setShowSingleProductModal(false)}
                      className="px-5 py-2.5 border border-gray-200 dark:border-[#1e1e2f] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!selectedCatalogProduct}
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 dark:bg-[#00FF66] dark:hover:bg-[#00e65c] disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white dark:text-black font-extrabold rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider"
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
                      <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Product Name <span className="text-[#FF3366]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Amul Gold Milk"
                        value={newProductForm.name}
                        onChange={(e) => setNewProductForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-gray-55 dark:bg-[#12121e] border border-gray-200 dark:border-[#1e1e2f] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Brand Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Amul"
                        value={newProductForm.brand}
                        onChange={(e) => setNewProductForm(prev => ({ ...prev, brand: e.target.value }))}
                        className="w-full bg-gray-55 dark:bg-[#12121e] border border-gray-200 dark:border-[#1e1e2f] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Unit / Size <span className="text-[#FF3366]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 500 ml, 1 kg, 1 unit"
                        value={newProductForm.unit}
                        onChange={(e) => setNewProductForm(prev => ({ ...prev, unit: e.target.value }))}
                        className="w-full bg-gray-55 dark:bg-[#12121e] border border-gray-200 dark:border-[#1e1e2f] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Category <span className="text-[#FF3366]">*</span>
                      </label>
                      <select
                        value={newProductForm.category_id}
                        onChange={(e) => setNewProductForm(prev => ({ ...prev, category_id: e.target.value }))}
                        className="w-full bg-gray-55 dark:bg-[#12121e] border border-gray-200 dark:border-[#1e1e2f] rounded-xl px-4 py-2.5 text-sm text-gray-950 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66]"
                        required
                      >
                        <option value="">{isLoadingCategories ? 'Loading categories...' : '-- Choose Category --'}</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Barcode / SKU
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 8901262150012"
                        value={newProductForm.barcode}
                        onChange={(e) => setNewProductForm(prev => ({ ...prev, barcode: e.target.value }))}
                        className="w-full bg-gray-55 dark:bg-[#12121e] border border-gray-200 dark:border-[#1e1e2f] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Global Catalog Base Price (₹) <span className="text-[#FF3366]">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 33.00"
                        value={newProductForm.price}
                        onChange={(e) => setNewProductForm(prev => ({ ...prev, price: e.target.value }))}
                        className="w-full bg-gray-55 dark:bg-[#12121e] border border-gray-200 dark:border-[#1e1e2f] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Global Catalog Base MRP (₹) <span className="text-[#FF3366]">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 35.00"
                        value={newProductForm.mrp}
                        onChange={(e) => setNewProductForm(prev => ({ ...prev, mrp: e.target.value }))}
                        className="w-full bg-gray-55 dark:bg-[#12121e] border border-gray-200 dark:border-[#1e1e2f] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66]"
                        required
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-100 dark:border-white/5 pt-4">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-3">Mart Specific Details</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">
                          Your Stock Quantity <span className="text-[#FF3366]">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newProductForm.stock_quantity}
                          onChange={(e) => setNewProductForm(prev => ({ ...prev, stock_quantity: e.target.value }))}
                          className="w-full bg-gray-55 dark:bg-[#12121e] border border-gray-200 dark:border-[#1e1e2f] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">
                          Your Selling Price (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={newProductForm.price ? `Default: ₹${parseFloat(newProductForm.price).toFixed(2)}` : 'e.g. 33.00'}
                          value={newProductForm.mart_price}
                          onChange={(e) => setNewProductForm(prev => ({ ...prev, mart_price: e.target.value }))}
                          className="w-full bg-gray-55 dark:bg-[#12121e] border border-gray-200 dark:border-[#1e1e2f] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-400 uppercase tracking-wider mb-2">
                          Your MRP (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={newProductForm.mrp ? `Default: ₹${parseFloat(newProductForm.mrp).toFixed(2)}` : 'e.g. 35.00'}
                          value={newProductForm.mart_mrp}
                          onChange={(e) => setNewProductForm(prev => ({ ...prev, mart_mrp: e.target.value }))}
                          className="w-full bg-gray-55 dark:bg-[#12121e] border border-gray-200 dark:border-[#1e1e2f] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-400 uppercase tracking-wider">
                        Product Image URL
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const defaultQuery = `${newProductForm.brand || ''} ${newProductForm.name || ''}`.trim()
                          setImageSearchQuery(defaultQuery)
                          const nextShow = !showImageSearchGrid
                          setShowImageSearchGrid(nextShow)
                          if (nextShow && defaultQuery) {
                            handleSearchImages(defaultQuery)
                          }
                        }}
                        className="text-xs font-bold text-emerald-600 dark:text-[#00FF66] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Image className="w-3.5 h-3.5" />
                        {showImageSearchGrid ? 'Hide Search' : '✨ Find Online Images'}
                      </button>
                    </div>

                    <div className="flex gap-3">
                      {newProductForm.image_url && (
                        <div className="w-11 h-11 rounded-xl bg-gray-55 dark:bg-[#12121e] border border-gray-200 dark:border-[#1e1e2f] flex-shrink-0 flex items-center justify-center p-1 overflow-hidden">
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
                        className="flex-1 bg-gray-55 dark:bg-[#12121e] border border-gray-200 dark:border-[#1e1e2f] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66]"
                      />
                    </div>

                    {showImageSearchGrid && (
                      <div className="mt-3 p-4 bg-gray-55 dark:bg-[#12121e] border border-gray-200 dark:border-[#1e1e2f] rounded-2xl space-y-3">
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
                              className="w-full bg-white dark:bg-[#0c0c14] border border-gray-200 dark:border-[#1e1e2f] rounded-xl py-1.5 pl-9 pr-3 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSearchImages()}
                            disabled={isSearchingImages}
                            className="px-3 py-1.5 bg-emerald-500 dark:bg-[#00FF66] text-white dark:text-black hover:bg-emerald-600 dark:hover:bg-[#00e65c] disabled:opacity-50 text-xs font-bold rounded-xl flex items-center gap-1 transition-all cursor-pointer"
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
                                  className={`relative aspect-square cursor-pointer rounded-lg overflow-hidden border bg-white dark:bg-[#0c0c14] flex items-center justify-center p-0.5 group transition-all hover:scale-105 duration-200 ${
                                    isSelected
                                      ? 'border-emerald-500 dark:border-[#00FF66] ring-2 ring-emerald-500/20 dark:ring-[#00FF66]/20'
                                      : 'border-gray-200 dark:border-[#1e1e2f] hover:border-emerald-400 dark:hover:border-[#00FF66]/40'
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
                                    <div className="absolute inset-0 bg-emerald-500/10 dark:bg-[#00FF66]/5 flex items-center justify-center">
                                      <div className="bg-emerald-500 dark:bg-[#00FF66] text-white dark:text-black rounded-full p-0.5 shadow">
                                        <Check className="w-2.5 h-2.5 font-bold" />
                                      </div>
                                    </div>
                                  )}
                                  <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white py-0.5 px-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                    {img.source || 'image'}
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
                      className="px-5 py-2.5 border border-gray-200 dark:border-[#1e1e2f] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 dark:bg-[#00FF66] dark:hover:bg-[#00e65c] text-white dark:text-black font-extrabold rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider"
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
    </div>
  )
}

export default InventoryView
