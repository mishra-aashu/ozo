import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe,
  Activity,
  CheckCircle,
  ExternalLink,
  Send,
  RefreshCw,
  Zap,
  Settings,
  Layers,
  Search,
  FileText,
  Check,
  Copy,
  Plus,
  Loader2,
  AlertCircle,
  AlertTriangle,
  X,
  Pause,
  Play
} from 'lucide-react'
import { supabaseAdmin as supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const SeoDashboard = () => {
  const [stats, setStats] = useState({
    activeCities: 0,
    totalProducts: 0,
    totalCategories: 0,
    indexNowKey: 'e8f38ed1f5024872aef3741996d6c9ba'
  })
  
  const [loading, setLoading] = useState(true)
  const [indexingProduct, setIndexingProduct] = useState('')
  const [indexingCity, setIndexingCity] = useState('')
  const [isBulkIndexing, setIsBulkIndexing] = useState(false)
  const [isSingleIndexing, setIsSingleIndexing] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const [bulkStatus, setBulkStatus] = useState('idle') // 'idle', 'fetching', 'indexing', 'completed', 'failed', 'paused'
  const [bulkTotal, setBulkTotal] = useState(0)
  const [bulkProcessed, setBulkProcessed] = useState(0)
  const [bulkCurrentItem, setBulkCurrentItem] = useState('')
  const [bulkProductsQueue, setBulkProductsQueue] = useState([])
  const bulkAbortedRef = useRef(false)

  // Diagnostics states
  const [diagnosticsLog, setDiagnosticsLog] = useState([])
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false)

  // Active cities and search states
  const [citiesList, setCitiesList] = useState([])
  const [productsList, setProductsList] = useState([])
  const [searchProductQuery, setSearchProductQuery] = useState('')
  const [selectedProductForIndex, setSelectedProductForIndex] = useState(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      // 1. Fetch cities count
      const { count: citiesCount, data: citiesData } = await supabase
        .from('operating_cities')
        .select('slug, name, state', { count: 'exact' })
        .eq('is_active', true)
      
      setCitiesList(citiesData || [])

      // 2. Fetch products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .limit(0)

      // 3. Fetch categories count
      const { count: categoriesCount } = await supabase
        .from('categories')
        .select('*', { count: 'exact' })
        .limit(0)

      // Get some products for dropdown/quick index
      const { data: prodData } = await supabase
        .from('products')
        .select('name, slug')
        .eq('is_available', true)
        .limit(100)

      setProductsList(prodData || [])

      setStats({
        activeCities: citiesCount || 0,
        totalProducts: productsCount || 0,
        totalCategories: categoriesCount || 0,
        indexNowKey: import.meta.env.VITE_INDEXNOW_KEY || 'e8f38ed1f5024872aef3741996d6c9ba'
      })
    } catch (err) {
      console.error('Error fetching SEO stats:', err)
      toast.error('Failed to load SEO Dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyKey = () => {
    navigator.clipboard.writeText(stats.indexNowKey)
    setCopiedKey(true)
    toast.success('IndexNow Verification Key copied!')
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true)
    setDiagnosticsLog([])
    const addLog = (message, type = 'info') => {
      setDiagnosticsLog(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message, type }])
    }

    addLog('Starting OZO SEO Diagnostics...', 'info')
    
    // Test 1: Check IndexNow Endpoint
    try {
      addLog('Verifying IndexNow Key API endpoint local accessibility...', 'info')
      const host = window.location.host
      const protocol = window.location.protocol
      
      const keyUrl = `${protocol}//${host}/api/indexnow-key`
      addLog(`Pinging key handler: ${keyUrl}`, 'info')
      
      const res = await fetch(keyUrl)
      if (res.ok) {
        const text = await res.text()
        addLog(`IndexNow verification key retrieved successfully: "${text}"`, 'success')
      } else {
        addLog(`IndexNow key handler failed with status ${res.status}`, 'error')
      }
    } catch (e) {
      addLog(`Failed to verify IndexNow Key endpoint: ${e.message}`, 'error')
    }

    // Test 2: Check Sitemap Index
    try {
      addLog('Checking sitemap-index.ts generator...', 'info')
      const sitemapIndexRes = await fetch('/sitemap.xml')
      if (sitemapIndexRes.ok) {
        addLog('Sitemap Index is generated correctly (Status 200 OK)', 'success')
      } else {
        addLog(`Sitemap Index returned status ${sitemapIndexRes.status}`, 'error')
      }
    } catch (e) {
      addLog(`Failed to load Sitemap Index: ${e.message}`, 'error')
    }

    // Test 3: Check Active Cities Data
    try {
      addLog(`Checking database for operating_cities. Total active found: ${stats.activeCities}`, 'info')
      if (stats.activeCities > 0) {
        addLog(`Active cities detected: ${citiesList.map(c => c.name.split(',')[0]).join(', ')}`, 'success')
      } else {
        addLog('No active cities in operating_cities! Dynamic SEO pages will fail.', 'error')
      }
    } catch (e) {
      addLog(`Failed database cities inspection: ${e.message}`, 'error')
    }

    setIsRunningDiagnostics(false)
    addLog('Diagnostics session completed.', 'info')
  }

  const triggerSingleIndex = async (e) => {
    e.preventDefault()
    if (!indexingProduct.trim()) {
      toast.error('Please enter a product slug or select one!')
      return
    }

    setIsSingleIndexing(true)
    const slug = indexingProduct.trim().toLowerCase()
    const targetCities = indexingCity ? [indexingCity] : []

    const toastId = toast.loading(`Submitting "${slug}" for indexing...`)
    try {
      const res = await fetch('/api/index-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productSlug: slug,
          cities: targetCities
        })
      })

      const result = await res.json()
      if (res.ok && result.success) {
        toast.success(`Successfully pinged index for ${result.indexedUrls?.length} pages!`, { id: toastId })
        // Add diagnostic log
        setDiagnosticsLog(prev => [
          {
            timestamp: new Date().toLocaleTimeString(),
            message: `Manually indexed "${slug}" across ${result.indexedUrls?.length} cities.`,
            type: 'success'
          },
          ...prev
        ])
      } else {
        throw new Error(result.error || 'Failed to trigger indexing')
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Indexing API failed', { id: toastId })
    } finally {
      setIsSingleIndexing(false)
    }
  }

  const triggerBulkIndexAll = async () => {
    bulkAbortedRef.current = false
    setBulkStatus('fetching')
    setBulkProcessed(0)
    setBulkTotal(0)
    setBulkCurrentItem('Fetching products list from database...')

    try {
      // Fetch all products from DB (paginated to bypass Supabase 1000 limit)
      let allProducts = []
      let from = 0
      let to = 999
      let hasMore = true

      while (hasMore) {
        const { data: products, error } = await supabase
          .from('products')
          .select('slug, name')
          .eq('is_available', true)
          .range(from, to)

        if (error) throw error

        if (products && products.length > 0) {
          allProducts = allProducts.concat(products)
          if (products.length < 1000) {
            hasMore = false
          } else {
            from += 1000
            to += 1000
          }
        } else {
          hasMore = false
        }
      }

      if (allProducts.length === 0) {
        throw new Error('No available products found to index.')
      }

      // First item is active city homepages
      const queue = [{ slug: 'homepage', name: 'Active City Homepages' }, ...allProducts]
      setBulkProductsQueue(queue)
      setBulkTotal(queue.length)
      
      // Start processing from 0
      await startIndexingQueue(queue, 0)
    } catch (err) {
      console.error('Bulk index initialization error:', err)
      setBulkStatus('failed')
      setBulkCurrentItem(err.message || 'Initialization failed.')
      toast.error(err.message || 'Bulk indexing failed.')
    }
  }

  const startIndexingQueue = async (queue, startIndex) => {
    setBulkStatus('indexing')
    setIsBulkIndexing(true)

    const BATCH_SIZE = 10
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    try {
      for (let i = startIndex; i < queue.length; i += BATCH_SIZE) {
        if (bulkAbortedRef.current) {
          setBulkStatus('paused')
          setIsBulkIndexing(false)
          return
        }

        const batch = queue.slice(i, i + BATCH_SIZE)
        const batchSlugs = batch.map(item => item.slug)
        const batchNames = batch.map(item => item.name).join(', ')

        setBulkCurrentItem(batchNames)

        const res = await fetch('/api/index-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productSlugs: batchSlugs
          })
        })

        const result = await res.json()
        if (!res.ok) {
          throw new Error(result.error || 'Failed during batch index request')
        }

        // Update processed count (ensure we don't exceed queue length)
        const newProcessed = Math.min(i + batch.length, queue.length)
        setBulkProcessed(newProcessed)

        // Wait between batch runs to respect crawler pings and API limit thresholds
        await delay(300)
      }

      setBulkStatus('completed')
      setBulkCurrentItem('All URLs successfully submitted to IndexNow!')
      toast.success('Bulk indexing complete!')
    } catch (err) {
      console.error('Queue processing error:', err)
      setBulkStatus('failed')
      setBulkCurrentItem(err.message || 'Queue processing failed.')
      toast.error(err.message || 'Queue processing failed.')
    } finally {
      setIsBulkIndexing(false)
    }
  }

  const resumeBulkIndex = async () => {
    bulkAbortedRef.current = false
    await startIndexingQueue(bulkProductsQueue, bulkProcessed)
  }

  const pauseBulkIndex = () => {
    bulkAbortedRef.current = true
    setBulkStatus('paused')
  }

  const closeBulkModal = () => {
    bulkAbortedRef.current = true
    setBulkStatus('idle')
    setShowBulkConfirm(false)
  }

  const filteredDropdownProducts = searchProductQuery.trim()
    ? productsList.filter(p => p.name.toLowerCase().includes(searchProductQuery.toLowerCase()) || p.slug.toLowerCase().includes(searchProductQuery.toLowerCase())).slice(0, 5)
    : []

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-8 bg-gradient-ozo text-white rounded-[2rem] shadow-premium relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center justify-center pointer-events-none">
          <Globe className="w-85 h-85 rotate-12 translate-x-12 translate-y-12 animate-pulse" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <span className="bg-white/20 text-white font-bold text-xs uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 w-fit">
            <Activity className="w-3.5 h-3.5" />
            SEO & Crawling Engine
          </span>
          <h1 className="text-3xl sm:text-4xl font-black mt-4 leading-tight">
            SEO & Instant Indexing Dashboard
          </h1>
          <p className="mt-2 text-white/85 text-sm sm:text-base font-medium">
            Manage your store's search engine presence. Update the IndexNow index, check dynamic sitemaps, verify operational cities configuration, and monitor bot crawling paths.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-premium flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase">Serviceable Cities</span>
            <p className="text-3xl font-black mt-2 text-gray-900 dark:text-white">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-ozo-red" /> : stats.activeCities}
            </p>
            <p className="text-xs text-gray-500 mt-1">Active operational landing domains</p>
          </div>
          <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400">
            <Globe className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-premium flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase">Total Items</span>
            <p className="text-3xl font-black mt-2 text-gray-900 dark:text-white">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-ozo-red" /> : stats.totalProducts}
            </p>
            <p className="text-xs text-gray-500 mt-1">SEO dynamic product layouts</p>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-premium flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase">Verification Protocol</span>
            <p className="text-3xl font-black mt-2 text-gray-900 dark:text-white flex items-center gap-1">
              IndexNow
            </p>
            <p className="text-xs text-gray-500 mt-1">Bing & Yandex crawler sync</p>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Box: Manual IndexNow triggers */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-100 dark:border-white/5 p-6 shadow-premium space-y-6">
          <div>
            <h3 className="text-base font-black text-gray-800 dark:text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-ozo-red" />
              Manual Search Engine Index Submission
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Ping IndexNow instantly to update product/category changes. Leave the city blank to index the product in all cities.
            </p>
          </div>

          <form onSubmit={triggerSingleIndex} className="space-y-4">
            {/* Slug input & dropdown search */}
            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Product Slug</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-450" />
                  <input
                    type="text"
                    placeholder="e.g. premium-mithila-phool-makhana"
                    value={indexingProduct}
                    onChange={(e) => {
                      setIndexingProduct(e.target.value)
                      setSearchProductQuery(e.target.value)
                    }}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-250 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ozo-red"
                  />
                </div>
              </div>

              {/* Dropdown for products list */}
              {filteredDropdownProducts.length > 0 && (
                <div className="absolute top-[75px] left-0 right-0 bg-white dark:bg-[#1f1f2a] border border-gray-200 dark:border-white/10 rounded-xl shadow-lg z-20 overflow-hidden divide-y divide-gray-100 dark:divide-white/5">
                  {filteredDropdownProducts.map((p, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setIndexingProduct(p.slug)
                        setSearchProductQuery('')
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-white/5 text-xs text-gray-800 dark:text-gray-200 font-bold transition-all"
                    >
                      {p.name} <span className="text-gray-450 font-normal italic">({p.slug})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* City Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Target City (Optional)</label>
              <select
                value={indexingCity}
                onChange={(e) => setIndexingCity(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-250 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ozo-red cursor-pointer"
              >
                <option value="">All active cities ({stats.activeCities})</option>
                {citiesList.map(c => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                disabled={isSingleIndexing}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-ozo text-white px-5 py-3 rounded-xl font-bold hover:shadow-ozo hover:scale-[1.01] transition-all disabled:opacity-55"
              >
                {isSingleIndexing ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    Submitting API Pings...
                  </>
                ) : (
                  <>
                    <Send className="w-4.5 h-4.5" />
                    Index Product Page
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowBulkConfirm(true)}
                disabled={isBulkIndexing}
                className="flex items-center justify-center gap-2 border border-red-500/35 text-red-500 hover:bg-red-500/10 px-5 py-3 rounded-xl font-bold transition-all disabled:opacity-55"
              >
                {isBulkIndexing ? (
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                ) : (
                  <Zap className="w-4.5 h-4.5" />
                )}
                Bulk Index All Pages
              </button>
            </div>
          </form>

          {/* Key and Sitemap Links */}
          <div className="pt-4 border-t border-gray-100 dark:border-white/5 space-y-4">
            <h4 className="text-xs font-black text-gray-550 uppercase tracking-widest">Verification & Maps</h4>
            
            {/* IndexNow Key displaying */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-150 dark:border-white/5">
              <div className="min-w-0 flex-1 pr-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase">IndexNow API Key</span>
                <p className="font-mono text-xs text-gray-750 dark:text-gray-300 truncate mt-0.5">{stats.indexNowKey}</p>
              </div>
              <button
                onClick={handleCopyKey}
                className="p-2 bg-white dark:bg-[#1f1f23] rounded-lg border border-gray-200 dark:border-white/5 text-gray-500 dark:text-gray-300 hover:text-ozo-red dark:hover:text-white transition-all shadow-sm flex-shrink-0"
              >
                {copiedKey ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* Sitemap direct links */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-gray-50 dark:bg-white/5 hover:bg-red-50/20 dark:hover:bg-red-950/10 rounded-xl border border-gray-150 dark:border-white/5 flex items-center justify-between group transition-all"
              >
                <div className="min-w-0">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Sitemap Index</span>
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate mt-0.5">/sitemap.xml</span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-ozo-red transition-all" />
              </a>

              <a
                href="/api/sitemap-static"
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-gray-50 dark:bg-white/5 hover:bg-red-50/20 dark:hover:bg-red-950/10 rounded-xl border border-gray-150 dark:border-white/5 flex items-center justify-between group transition-all"
              >
                <div className="min-w-0">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Static Maps</span>
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate mt-0.5">/sitemap-static</span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-ozo-red transition-all" />
              </a>
            </div>
          </div>
        </div>

        {/* Right Box: Diagnostic Console */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-100 dark:border-white/5 p-6 shadow-premium flex flex-col h-full justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-800 dark:text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-ozo-red" />
                  SEO Checker & Diagnostics
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Run test calls to check endpoint responses and dynamic routing.
                </p>
              </div>
              <button
                onClick={runDiagnostics}
                disabled={isRunningDiagnostics}
                className="p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/5 hover:bg-red-500/10 text-gray-650 hover:text-red-500 transition-all flex-shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isRunningDiagnostics ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Diagnostic Logs console */}
            <div className="bg-gray-950 dark:bg-black border border-gray-900 rounded-2xl p-4 font-mono text-[11px] h-[330px] overflow-y-auto scrollbar-hide space-y-2">
              {diagnosticsLog.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 italic space-y-2 select-none">
                  <AlertCircle className="w-7 h-7 text-gray-700" />
                  <p>Click the refresh button to run diagnostics.</p>
                </div>
              ) : (
                diagnosticsLog.map((log, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 leading-relaxed ${
                      log.type === 'success'
                        ? 'text-emerald-400'
                        : log.type === 'error'
                        ? 'text-rose-450 font-bold'
                        : 'text-zinc-400'
                    }`}
                  >
                    <span className="text-gray-600 select-none">[{log.timestamp}]</span>
                    <span>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-gray-100 dark:border-white/5">
            <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Operational Cities Index Status</h4>
            <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto pr-1">
              {citiesList.map(city => (
                <a
                  key={city.slug}
                  href={`/sitemap-${city.slug}.xml`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 border border-gray-150 dark:border-white/5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 group transition-all"
                >
                  <Globe className="w-3.5 h-3.5 text-purple-400" />
                  {city.name.split(',')[0]}
                  <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Indexing Confirmation & Progress Modal */}
      <AnimatePresence>
        {showBulkConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => {
                if (bulkStatus === 'idle' || bulkStatus === 'completed' || bulkStatus === 'failed' || bulkStatus === 'paused') {
                  closeBulkModal();
                }
              }}
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md overflow-hidden bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-2xl z-10"
            >
              {/* Close Button */}
              {(bulkStatus === 'idle' || bulkStatus === 'completed' || bulkStatus === 'failed' || bulkStatus === 'paused') && (
                <button
                  onClick={closeBulkModal}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-650 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              )}

              {/* Content */}
              <div className="flex flex-col items-center text-center mt-2">
                {/* 1. CONFIRMATION STATE */}
                {bulkStatus === 'idle' && (
                  <>
                    <div className="relative mb-5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500/20 animate-ping opacity-75" />
                      <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-amber-500 to-orange-600 text-white rounded-full shadow-lg">
                        <AlertTriangle size={28} />
                      </div>
                    </div>

                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white leading-snug">
                      Confirm Bulk Indexing?
                    </h3>
                    
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 max-w-sm leading-relaxed">
                      Are you sure you want to index <span className="font-extrabold text-gray-950 dark:text-white">ALL products</span> across <span className="font-extrabold text-gray-950 dark:text-white">ALL active cities</span>?
                    </p>

                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl text-left text-xs text-amber-800 dark:text-amber-300 leading-relaxed flex items-start gap-2.5">
                      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block mb-0.5">Safe Batching Protocol</span>
                        This system processes products sequentially in batches of 10 to avoid search engine API rate limits. Pings will be triggered for all active cities ({stats.activeCities} total).
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row w-full gap-3 mt-6">
                      <button
                        onClick={closeBulkModal}
                        className="flex-1 py-3 px-4 text-gray-600 dark:text-gray-300 font-bold text-sm bg-gray-100 dark:bg-white/5 hover:bg-gray-250 dark:hover:bg-white/10 transition-all rounded-xl active:scale-[0.98]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={triggerBulkIndexAll}
                        className="flex-1 py-3 px-4 text-white font-bold text-sm bg-gradient-to-r from-red-600 to-ozo-red hover:from-ozo-red hover:to-red-650 active:scale-[0.98] transition-all rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ozo-red/50"
                      >
                        Yes, Index All Pages
                      </button>
                    </div>
                  </>
                )}

                {/* 2. FETCHING / INDEXING PROGRESS STATE */}
                {(bulkStatus === 'fetching' || bulkStatus === 'indexing') && (
                  <>
                    <div className="relative mb-5">
                      <div className="relative flex items-center justify-center w-16 h-16 bg-red-500/10 text-ozo-red rounded-full">
                        <Loader2 size={28} className="animate-spin text-ozo-red" />
                      </div>
                    </div>

                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white leading-snug">
                      {bulkStatus === 'fetching' ? 'Initializing...' : 'Indexing Pages...'}
                    </h3>

                    <div className="w-full mt-5">
                      <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">
                        <span>Progress</span>
                        <span>{bulkTotal > 0 ? Math.round((bulkProcessed / bulkTotal) * 100) : 0}%</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-3 overflow-hidden border border-gray-200/10">
                        <motion.div
                          className="bg-gradient-to-r from-red-500 to-ozo-red h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${bulkTotal > 0 ? (bulkProcessed / bulkTotal) * 100 : 0}%` }}
                          transition={{ duration: 0.2 }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-400 mt-2 font-mono">
                        <span>Processed: {bulkProcessed} / {bulkTotal}</span>
                        <span>Cities: {stats.activeCities}</span>
                      </div>
                    </div>

                    <div className="w-full bg-gray-50 dark:bg-white/5 border border-gray-150 dark:border-white/5 p-3 rounded-xl mt-4 text-left">
                      <span className="text-[10px] uppercase font-bold text-gray-450 tracking-wider block">Current Batch</span>
                      <p className="text-xs text-gray-750 dark:text-gray-250 font-bold truncate mt-0.5">{bulkCurrentItem}</p>
                    </div>

                    <button
                      onClick={pauseBulkIndex}
                      className="w-full mt-6 py-3 px-4 flex items-center justify-center gap-2 text-red-500 hover:bg-red-500/10 border border-red-500/20 font-bold text-sm transition-all rounded-xl active:scale-[0.98]"
                    >
                      <Pause size={16} />
                      Pause Indexing
                    </button>
                  </>
                )}

                {/* 3. PAUSED STATE */}
                {bulkStatus === 'paused' && (
                  <>
                    <div className="relative mb-5">
                      <div className="relative flex items-center justify-center w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full">
                        <Pause size={28} className="text-amber-500" />
                      </div>
                    </div>

                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white leading-snug">
                      Indexing Paused
                    </h3>
                    
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Successfully processed {bulkProcessed} of {bulkTotal} items.
                    </p>

                    <div className="w-full mt-4 bg-gray-100 dark:bg-white/5 rounded-full h-3 overflow-hidden border border-gray-200/10">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${bulkTotal > 0 ? (bulkProcessed / bulkTotal) * 100 : 0}%` }}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row w-full gap-3 mt-6">
                      <button
                        onClick={closeBulkModal}
                        className="flex-1 py-3 px-4 text-gray-600 dark:text-gray-300 font-bold text-sm bg-gray-100 dark:bg-white/5 hover:bg-gray-250 dark:hover:bg-white/10 transition-all rounded-xl active:scale-[0.98]"
                      >
                        Cancel & Exit
                      </button>
                      <button
                        onClick={resumeBulkIndex}
                        className="flex-1 py-3 px-4 text-white font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-orange-500 hover:to-amber-500 active:scale-[0.98] transition-all rounded-xl shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
                      >
                        <Play size={16} />
                        Resume Indexing
                      </button>
                    </div>
                  </>
                )}

                {/* 4. COMPLETED STATE */}
                {bulkStatus === 'completed' && (
                  <>
                    <div className="relative mb-5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500/20 animate-ping opacity-75" />
                      <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-emerald-500 to-green-600 text-white rounded-full shadow-lg">
                        <CheckCircle size={28} />
                      </div>
                    </div>

                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white leading-snug">
                      Bulk Indexing Complete!
                    </h3>
                    
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xs leading-relaxed">
                      Successfully processed and submitted all <span className="font-extrabold text-gray-850 dark:text-white">{bulkTotal} items</span> across <span className="font-extrabold text-gray-850 dark:text-white">{stats.activeCities} active cities</span>.
                    </p>

                    <button
                      onClick={closeBulkModal}
                      className="w-full mt-6 py-3 px-4 text-white font-bold text-sm bg-gradient-to-r from-emerald-500 to-green-600 active:scale-[0.98] transition-all rounded-xl shadow-md"
                    >
                      Done
                    </button>
                  </>
                )}

                {/* 5. FAILED STATE */}
                {bulkStatus === 'failed' && (
                  <>
                    <div className="relative mb-5">
                      <div className="relative flex items-center justify-center w-16 h-16 bg-red-500/10 text-red-500 rounded-full">
                        <AlertCircle size={28} className="text-red-500" />
                      </div>
                    </div>

                    <h3 className="text-xl font-extrabold text-gray-900 dark:text-white leading-snug">
                      Indexing Failed
                    </h3>
                    
                    <p className="text-sm text-red-500 dark:text-red-400 mt-3 p-3 bg-red-500/5 border border-red-500/10 rounded-xl w-full text-left text-xs font-mono break-words max-h-[120px] overflow-y-auto">
                      {bulkCurrentItem}
                    </p>

                    <div className="flex flex-col sm:flex-row w-full gap-3 mt-6">
                      <button
                        onClick={closeBulkModal}
                        className="flex-1 py-3 px-4 text-gray-600 dark:text-gray-300 font-bold text-sm bg-gray-100 dark:bg-white/5 hover:bg-gray-250 dark:hover:bg-white/10 transition-all rounded-xl active:scale-[0.98]"
                      >
                        Close
                      </button>
                      <button
                        onClick={triggerBulkIndexAll}
                        className="flex-1 py-3 px-4 text-white font-bold text-sm bg-gradient-to-r from-red-600 to-ozo-red hover:from-ozo-red hover:to-red-650 active:scale-[0.98] transition-all rounded-xl shadow-md"
                      >
                        Retry
                      </button>
                    </div>
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

export default SeoDashboard
