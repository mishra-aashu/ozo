import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  X,
  Globe,
  Folder,
  Store,
  Package,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  TrendingUp,
  Coins,
  Percent,
  Loader2,
  ShieldAlert,
  Tag,
  Layers,
  ChevronDown,
  Check,
  Search,
  Undo2,
  History,
  Play
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function BulkControlPanel({
  showBulkPanel,
  setShowBulkPanel,
  selectedCategory,
  selectedMart,
  setSelectedCategory,
  setSelectedMart,
  supabaseAdmin,
  loadData,
  marts = []
}) {
  // Scopes: 'all' | 'category' | 'mart' | 'oos' | 'brand' | 'storage'
  const [bulkScope, setBulkScope] = useState('all') 
  const [selectedBrand, setSelectedBrand] = useState('')
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false)
  const [brandSearchQuery, setBrandSearchQuery] = useState('')
  const [selectedStorage, setSelectedStorage] = useState('frozen') // 'frozen' | 'perishable' | 'staples'

  // Actions: 'oos-off' | 'oos-on' | 'price-adj' | 'margin'
  const [bulkAction, setBulkAction] = useState('oos-off') 
  const [bulkPercent, setBulkPercent] = useState('') 
  const [bulkMargin, setBulkMargin] = useState('') 

  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkPreviewCount, setBulkPreviewCount] = useState(null)

  // Dropdown lists
  const [brands, setBrands] = useState([])
  const [categories, setCategories] = useState([])
  const [loadingDropdowns, setLoadingDropdowns] = useState(false)

  // History & Undo features
  const [activeTab, setActiveTab] = useState('control') // 'control' | 'history' | 'brands'
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Brand Stock management state
  const [brandsStock, setBrandsStock] = useState([])
  const [loadingBrandsStock, setLoadingBrandsStock] = useState(false)
  const [brandStockSearch, setBrandStockSearch] = useState('')
  const [selectedBrandsForBulk, setSelectedBrandsForBulk] = useState([])
  const [updatingBrand, setUpdatingBrand] = useState(null)

  // Fetch unique brands and categories for dropdowns
  useEffect(() => {
    if (showBulkPanel) {
      ensureHistoryTableExists()
      fetchDropdownData()
      fetchHistory()
    }
  }, [showBulkPanel])

  // Fetch brand stock summary when opening brands tab
  useEffect(() => {
    if (showBulkPanel && activeTab === 'brands') {
      fetchBrandsStock()
    }
  }, [showBulkPanel, activeTab])

  const ensureHistoryTableExists = async () => {
    try {
      const createSql = `
        CREATE TABLE IF NOT EXISTS public.bulk_operation_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          scope VARCHAR NOT NULL,
          scope_value VARCHAR,
          action VARCHAR NOT NULL,
          action_value VARCHAR,
          products_affected INT NOT NULL,
          affected_product_ids UUID[] NOT NULL,
          previous_states JSONB NOT NULL,
          is_undone BOOLEAN DEFAULT FALSE
        );
        ALTER TABLE public.bulk_operation_logs ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Admins can do everything on bulk_operation_logs" ON public.bulk_operation_logs;
        CREATE POLICY "Admins can do everything on bulk_operation_logs" 
          ON public.bulk_operation_logs 
          FOR ALL 
          TO authenticated 
          USING (public.is_admin())
          WITH CHECK (public.is_admin());
      `
      await supabaseAdmin.rpc('exec_sql', { query_text: createSql })
    } catch (err) {
      console.warn('Error checking/creating bulk logs table:', err)
    }
  }

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true)
      const { data, error } = await supabaseAdmin
        .from('bulk_operation_logs')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) {
        setHistory(data)
      }
    } catch (err) {
      console.error('Failed to fetch history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const undoBulkOp = async (logId) => {
    const tid = toast.loading('Operation undo ho rahi hai...')
    try {
      const undoSql = `
        UPDATE public.products AS p
        SET
          price = (tmp.val->>'price')::numeric,
          is_available = (tmp.val->>'is_available')::boolean,
          updated_at = NOW()
        FROM jsonb_each((SELECT previous_states FROM public.bulk_operation_logs WHERE id = '${logId}')) AS tmp(key, val)
        WHERE p.id::text = tmp.key;

        UPDATE public.mart_inventory AS mi
        SET
          is_available = (tmp.val->>'is_available')::boolean
        FROM jsonb_each((SELECT previous_states FROM public.bulk_operation_logs WHERE id = '${logId}')) AS tmp(key, val)
        WHERE mi.product_id::text = tmp.key;

        UPDATE public.bulk_operation_logs SET is_undone = true WHERE id = '${logId}';
      `
      await runSql(undoSql)
      toast.success('Operation successfully undo ho gayi!', { id: tid })
      fetchHistory()
      await loadData()
    } catch (err) {
      console.error('Undo failed:', err)
      toast.error('Undo fail ho gaya: ' + err.message, { id: tid })
    }
  }

  const fetchBrandsStock = async () => {
    try {
      setLoadingBrandsStock(true)
      const query = `
        SELECT brand, count(*) as total, sum(case when is_available then 1 else 0 end) as in_stock
        FROM public.products
        WHERE brand IS NOT NULL AND brand != ''
        GROUP BY brand
        ORDER BY brand;
      `
      const result = await runSql(query)
      if (result && result.rows) {
        setBrandsStock(result.rows)
      } else {
        setBrandsStock([])
      }
    } catch (err) {
      console.error('Failed to fetch brand stock summary:', err)
      toast.error('Failed to load brand stocks')
    } finally {
      setLoadingBrandsStock(false)
    }
  }

  const executeBrandStockUpdate = async (brandNames, markInStock) => {
    if (!brandNames || brandNames.length === 0) return

    const isBulk = brandNames.length > 1
    if (!isBulk) setUpdatingBrand(brandNames[0])
    
    const tid = toast.loading(
      isBulk
        ? `Updating stock status for ${brandNames.length} brands...`
        : `Updating stock status for ${brandNames[0]}...`
    )

    try {
      // Create SQL IN list
      const brandListSql = brandNames.map(b => `'${b.replace(/'/g, "''")}'`).join(',')
      const whereClause = `brand IN (${brandListSql})`

      // 1. Fetch matching products first to save states for undo
      const selectSql = `SELECT id, price, is_available, brand FROM public.products WHERE ${whereClause};`
      const selectResult = await runSql(selectSql)
      const previousProducts = selectResult?.rows || []

      if (previousProducts.length === 0) {
        toast.error('No products found for selected brand(s)!', { id: tid })
        return
      }

      // 2. Perform the update
      const updateSql = `
        UPDATE public.mart_inventory 
        SET is_available = ${markInStock ? 'true' : 'false'} 
        WHERE product_id IN (SELECT id FROM public.products WHERE ${whereClause});

        UPDATE public.products 
        SET is_available = ${markInStock ? 'true' : 'false'}, updated_at = NOW() 
        WHERE ${whereClause};
      `
      await runSql(updateSql)

      // 3. Save logs
      const previousStates = {}
      const affectedProductIds = []
      previousProducts.forEach(p => {
        affectedProductIds.push(p.id)
        previousStates[p.id] = {
          price: p.price,
          is_available: p.is_available
        }
      })

      const scope = isBulk ? 'brand-bulk' : 'brand'
      const scopeValue = isBulk ? brandNames.join(', ') : brandNames[0]
      const action = markInStock ? 'oos-on' : 'oos-off'

      const previousStatesJson = JSON.stringify(previousStates).replace(/'/g, "''")
      const affectedIdsSqlArray = `ARRAY[${affectedProductIds.map(id => `'${id}'::uuid`).join(',')}]`

      const insertLogSql = `
        INSERT INTO public.bulk_operation_logs (
          scope, scope_value, action, action_value, products_affected, affected_product_ids, previous_states
        ) VALUES (
          '${scope}',
          '${scopeValue.replace(/'/g, "''")}',
          '${action}',
          NULL,
          ${affectedProductIds.length},
          ${affectedProductIds.length > 0 ? affectedIdsSqlArray : "'{}'::uuid[]"},
          '${previousStatesJson}'::jsonb
        );
      `
      await runSql(insertLogSql)

      toast.success(
        markInStock
          ? `Selected brand(s) marked In Stock! (${affectedProductIds.length} products updated)`
          : `Selected brand(s) marked Out of Stock! (${affectedProductIds.length} products updated)`,
        { id: tid, duration: 5000 }
      )

      // Clear selection
      setSelectedBrandsForBulk([])

      // Refresh data
      await fetchBrandsStock()
      fetchHistory()
      await loadData()
    } catch (err) {
      console.error('Brand stock update failed:', err)
      toast.error('Failed to update brand stock: ' + err.message, { id: tid })
    } finally {
      setUpdatingBrand(null)
    }
  }

  const handleReRun = async (log) => {
    setBulkScope(log.scope)
    
    if (log.scope === 'category') setSelectedCategory(log.scope_value || 'all')
    if (log.scope === 'mart') setSelectedMart(log.scope_value || 'all')
    if (log.scope === 'brand') setSelectedBrand(log.scope_value || '')
    if (log.scope === 'storage') setSelectedStorage(log.scope_value || 'frozen')

    setBulkAction(log.action)
    if (log.action === 'price-adj') setBulkPercent(log.action_value || '')
    if (log.action === 'margin') setBulkMargin(log.action_value || '')

    const tid = toast.loading('Calculating affected products...')
    try {
      await previewBulkCount(log.scope, log.scope_value)
      toast.dismiss(tid)
      setBulkConfirmOpen(true)
    } catch (err) {
      toast.error('Count check failed: ' + err.message, { id: tid })
    }
  }

  const fetchDropdownData = async () => {
    try {
      setLoadingDropdowns(true)
      
      // Fetch Brands
      const { data: brandData, error: brandErr } = await supabaseAdmin
        .from('products')
        .select('brand')
      if (!brandErr && brandData) {
        const unique = [...new Set(brandData.map(p => p.brand).filter(b => b && b.trim() !== ''))].sort()
        setBrands(unique)
      }

      // Fetch Categories (for storage classification helper)
      const { data: catData, error: catErr } = await supabaseAdmin.from('categories').select('id, name, slug, parent_id')
      if (!catErr && catData) {
        setCategories(catData)
      }
    } catch (err) {
      console.error('Failed to load bulk controls dropdown data:', err)
    } finally {
      setLoadingDropdowns(false)
    }
  }

  // Get storage-specific category IDs based on current database categories
  const getStorageCategoryIds = (type) => {
    if (!categories.length) return []
    
    const isFrozen = (name, slug) => 
      /frozen|ice-cream|icecream|dessert|meat|fish|seafood/i.test(name) ||
      /frozen|ice-cream|icecream|dessert|meat|fish|seafood/i.test(slug)

    const isPerishable = (name, slug) => 
      /milk|dairy|bread|curd|butter|paneer|egg|vegetable|fruit|bakery|fresh/i.test(name) ||
      /milk|dairy|bread|curd|butter|paneer|egg|vegetable|fruit|bakery|fresh/i.test(slug)

    const frozenIds = categories.filter(c => isFrozen(c.name, c.slug)).map(c => c.id)
    const perishableIds = categories.filter(c => isPerishable(c.name, c.slug)).map(c => c.id)

    if (type === 'frozen') return frozenIds
    if (type === 'perishable') return perishableIds
    
    // staples / dry
    return categories
      .filter(c => !frozenIds.includes(c.id) && !perishableIds.includes(c.id))
      .map(c => c.id)
  }

  // Count matching products for preview
  const previewBulkCount = async (overrideScope = null, overrideValue = null) => {
    const scope = overrideScope || bulkScope
    const val = overrideValue !== null ? overrideValue : (
      scope === 'category' ? selectedCategory :
      scope === 'mart' ? selectedMart :
      scope === 'brand' ? selectedBrand :
      scope === 'storage' ? selectedStorage : null
    )

    let q = supabaseAdmin.from('products').select('*', { count: 'exact' }).limit(0)
    
    if (scope === 'category' && val !== 'all') {
      const subCategoryIds = categories
        .filter(c => c.parent_id === val)
        .map(c => c.id)

      if (subCategoryIds.length > 0) {
        q = q.in('category_id', [val, ...subCategoryIds])
      } else {
        q = q.eq('category_id', val)
      }
    } else if (scope === 'mart' && val !== 'all') {
      q = q.eq('mart_id', val)
    } else if (scope === 'oos') {
      q = q.eq('is_available', false)
    } else if (scope === 'brand' && val) {
      q = q.eq('brand', val)
    } else if (scope === 'storage') {
      const catIds = getStorageCategoryIds(val)
      if (catIds.length > 0) {
        q = q.in('category_id', catIds)
      } else {
        setBulkPreviewCount(0)
        return 0
      }
    }
    
    const { count } = await q
    const finalCount = count ?? 0
    setBulkPreviewCount(finalCount)
    return finalCount
  }

  const openBulkConfirm = async () => {
    await previewBulkCount()
    setBulkConfirmOpen(true)
  }

  // Build SQL WHERE clause based on scope
  const buildScopeWhere = (overrideScope = null, overrideValue = null) => {
    const scope = overrideScope || bulkScope
    const val = overrideValue !== null ? overrideValue : (
      scope === 'category' ? selectedCategory :
      scope === 'mart' ? selectedMart :
      scope === 'brand' ? selectedBrand :
      scope === 'storage' ? selectedStorage : null
    )

    if (scope === 'category' && val !== 'all') {
      const subCategoryIds = categories
        .filter(c => c.parent_id === val)
        .map(c => c.id)

      if (subCategoryIds.length > 0) {
        return `category_id IN (${[val, ...subCategoryIds].map(id => `'${id}'`).join(',')})`
      }
      return `category_id = '${val}'`
    }
    if (scope === 'mart' && val !== 'all') {
      return `mart_id = '${val}'`
    }
    if (scope === 'oos') {
      return `is_available = false`
    }
    if (scope === 'brand' && val) {
      return `brand = '${val.replace(/'/g, "''")}'`
    }
    if (scope === 'storage') {
      const catIds = getStorageCategoryIds(val)
      if (catIds.length > 0) {
        return `category_id IN (${catIds.map(id => `'${id}'`).join(',')})`
      }
      return `1 = 0` // no matches
    }
    return `1 = 1` // all products
  }

  // Run a raw SQL statement via exec_sql RPC
  const runSql = async (sql) => {
    let cleanedSql = sql.trim()
    if (/^(SELECT|WITH)\b/i.test(cleanedSql)) {
      cleanedSql = cleanedSql.replace(/;\s*$/, '').trim()
    }
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { query_text: cleanedSql })
    if (error) throw new Error(error.message)
    if (data && data.success === false) throw new Error(data.error)
    return data
  }

  const executeBulkOp = async () => {
    setBulkRunning(true)
    const tid = toast.loading('Database par bulk operation chal rahi hai...')
    try {
      const where = buildScopeWhere()
      let sql = ''
      let successMsg = ''

      if (bulkAction === 'oos-off') {
        sql = `
          UPDATE public.mart_inventory 
          SET is_available = false 
          WHERE product_id IN (SELECT id FROM public.products WHERE ${where});

          UPDATE public.products 
          SET is_available = false, updated_at = NOW() 
          WHERE ${where};
        `
        successMsg = 'Emergency: Products Out of Stock mark ho gaye!'
      } else if (bulkAction === 'oos-on') {
        sql = `
          UPDATE public.mart_inventory 
          SET is_available = true 
          WHERE product_id IN (SELECT id FROM public.products WHERE ${where});

          UPDATE public.products 
          SET is_available = true, updated_at = NOW() 
          WHERE ${where};
        `
        successMsg = 'Success: Products wapas In Stock ho gaye!'
      } else if (bulkAction === 'price-adj') {
        const pct = parseFloat(bulkPercent)
        if (isNaN(pct) || pct === 0) {
          toast.error('Valid % daalo', { id: tid })
          setBulkRunning(false)
          return
        }
        sql = `
          UPDATE public.products
          SET
            price = LEAST(mrp, GREATEST(1, ROUND(price * ${1 + pct / 100}))),
            updated_at = NOW()
          WHERE ${where};
        `
        successMsg = `Price ${pct > 0 ? '+' : ''}${pct}% adjust ho gayi! (MRP cap + ₹1 floor applied)`
      } else if (bulkAction === 'margin') {
        const margin = parseFloat(bulkMargin)
        if (isNaN(margin) || margin <= 0 || margin >= 100) {
          toast.error('Margin 1–99% ke beech hona chahiye', { id: tid })
          setBulkRunning(false)
          return
        }
        const factor = (1 - margin / 100).toFixed(6)
        sql = `
          UPDATE public.products
          SET
            price = GREATEST(1, ROUND(mrp::numeric * ${factor})),
            updated_at = NOW()
          WHERE ${where};
        `
        successMsg = `${margin}% margin set ho gaya! Price = MRP × ${(100 - margin)}%`
      }

      if (!sql) {
        toast.dismiss(tid)
        setBulkRunning(false)
        return
      }

      // Fetch matching products first to save state for undo
      const selectSql = `SELECT id, price, is_available FROM public.products WHERE ${where};`
      const selectResult = await runSql(selectSql)
      const previousProducts = selectResult?.rows || []

      if (previousProducts.length === 0) {
        toast.error('Koi products match nahi hue matches se!', { id: tid })
        setBulkRunning(false)
        return
      }

      // Execute update query
      const result = await runSql(sql.trim())
      const affected = result?.rows_affected ?? previousProducts.length

      // Save previous states & logs for UNDO
      const previousStates = {}
      const affectedProductIds = []
      previousProducts.forEach(p => {
        affectedProductIds.push(p.id)
        previousStates[p.id] = {
          price: p.price,
          is_available: p.is_available
        }
      })

      const scopeValue = bulkScope === 'category' ? selectedCategory :
                         bulkScope === 'mart' ? selectedMart :
                         bulkScope === 'brand' ? selectedBrand :
                         bulkScope === 'storage' ? selectedStorage : null

      const previousStatesJson = JSON.stringify(previousStates).replace(/'/g, "''")
      const affectedIdsSqlArray = `ARRAY[${affectedProductIds.map(id => `'${id}'::uuid`).join(',')}]`

      const insertLogSql = `
        INSERT INTO public.bulk_operation_logs (
          scope, scope_value, action, action_value, products_affected, affected_product_ids, previous_states
        ) VALUES (
          '${bulkScope}',
          ${scopeValue ? `'${scopeValue.replace(/'/g, "''")}'` : 'NULL'},
          '${bulkAction}',
          ${bulkAction === 'price-adj' ? `'${bulkPercent}'` : bulkAction === 'margin' ? `'${bulkMargin}'` : 'NULL'},
          ${affectedProductIds.length},
          ${affectedProductIds.length > 0 ? affectedIdsSqlArray : "'{}'::uuid[]"},
          '${previousStatesJson}'::jsonb
        );
      `
      await runSql(insertLogSql)

      toast.success(`${successMsg} (${affected} products updated)`, { id: tid, duration: 5000 })
      setBulkConfirmOpen(false)
      setShowBulkPanel(false)
      fetchHistory()
      await loadData()
    } catch (err) {
      console.error('Bulk op failed:', err)
      toast.error('Bulk operation failed: ' + err.message, { id: tid })
    } finally {
      setBulkRunning(false)
    }
  }

  const filteredBrandsStock = brandsStock.filter(item =>
    (item.brand || '').toLowerCase().includes((brandStockSearch || '').toLowerCase())
  )

  const isAllFilteredSelected = filteredBrandsStock.length > 0 && 
    filteredBrandsStock.every(item => selectedBrandsForBulk.includes(item.brand))

  const handleSelectAllToggle = () => {
    if (isAllFilteredSelected) {
      const filteredNames = filteredBrandsStock.map(item => item.brand)
      setSelectedBrandsForBulk(prev => prev.filter(name => !filteredNames.includes(name)))
    } else {
      const filteredNames = filteredBrandsStock.map(item => item.brand)
      setSelectedBrandsForBulk(prev => {
        const next = [...prev]
        filteredNames.forEach(name => {
          if (!next.includes(name)) next.push(name)
        })
        return next
      })
    }
  }

  const handleBrandCheckboxToggle = (brandName) => {
    setSelectedBrandsForBulk(prev =>
      prev.includes(brandName)
        ? prev.filter(name => name !== brandName)
        : [...prev, brandName]
    )
  }

  return (
    <>
      {/* Bulk Confirm Modal */}
      <AnimatePresence>
        {bulkConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !bulkRunning && setBulkConfirmOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 w-full max-w-md border border-gray-100 dark:border-white/10 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 dark:text-white">Confirm Bulk Operation</h3>
                  <p className="text-xs text-gray-500">This action cannot be easily undone.</p>
                </div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 mb-4">
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                  {bulkAction === 'oos-off' && 'Emergency: Selected products will be marked OUT OF STOCK'}
                  {bulkAction === 'oos-on' && 'Restore: Selected products will be marked IN STOCK'}
                  {bulkAction === 'price-adj' && `Price Adjustment: Selling Price (OZO Price) will adjust by ${parseFloat(bulkPercent) > 0 ? `+${bulkPercent}` : bulkPercent}% (MRP remains unchanged)`}
                  {bulkAction === 'margin' && `Margin Set: ${bulkMargin}% margin will be set — Selling Price (OZO Price) = MRP × ${100 - parseFloat(bulkMargin || 0)}% (MRP remains unchanged)`}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Scope: <strong className="capitalize">{bulkScope === 'all' ? 'All Products' : bulkScope === 'category' ? `Category: ${selectedCategory === 'all' ? 'All' : (categories.find(c => c.id === selectedCategory)?.name || selectedCategory)}` : bulkScope === 'mart' ? `Mart: ${selectedMart === 'all' ? 'All' : (marts.find(m => m.id === selectedMart)?.name || selectedMart)}` : bulkScope === 'oos' ? 'Out of Stock Products' : bulkScope === 'brand' ? `Brand: ${selectedBrand}` : `Storage Zone: ${selectedStorage}`}</strong>
                  {bulkPreviewCount !== null && <> — <strong>{bulkPreviewCount} products</strong> will be affected</>}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setBulkConfirmOpen(false)}
                  disabled={bulkRunning}
                  className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={executeBulkOp}
                  disabled={bulkRunning}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-black hover:from-rose-600 hover:to-amber-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {bulkRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {bulkRunning ? 'Running...' : 'Yes, Execute Operation'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Bulk Operations Drawer */}
      <AnimatePresence>
        {showBulkPanel && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => !bulkRunning && setShowBulkPanel(false)}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-xl bg-zinc-950 shadow-2xl z-50 flex flex-col border-l border-zinc-900"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/30">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-rose-500" />
                  <div>
                    <h3 className="text-lg font-black text-white">Bulk Control Panel</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Emergency stocks & pricing manager</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowBulkPanel(false)}
                  className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab Switcher */}
              <div className="flex border-b border-zinc-900 bg-zinc-950 px-6 py-2 gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('control')}
                  className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
                    activeTab === 'control'
                      ? 'border-rose-500 text-white'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Bulk Controls
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('brands')
                    fetchBrandsStock()
                  }}
                  className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
                    activeTab === 'brands'
                      ? 'border-rose-500 text-white'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Brand Stock
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('history')
                    fetchHistory()
                  }}
                  className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
                    activeTab === 'history'
                      ? 'border-rose-500 text-white'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  History & Undo
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar animate-none">
                {activeTab === 'history' ? (
                  <div className="space-y-4">
                    {loadingHistory ? (
                      <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                        <span className="text-xs">Loading history...</span>
                      </div>
                    ) : history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-zinc-600 text-center space-y-2">
                        <History className="w-8 h-8 text-zinc-800" />
                        <p className="text-xs font-bold text-zinc-500">No bulk operations recorded yet.</p>
                      </div>
                    ) : (
                      history.map((log) => (
                        <div 
                          key={log.id} 
                          className={`p-4 rounded-2xl border bg-[#111317] ${
                            log.is_undone 
                              ? 'border-zinc-900/40 opacity-60' 
                              : 'border-zinc-900 hover:border-zinc-850'
                          } transition-all space-y-3`}
                        >
                          {/* Header row: Action & Badge */}
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              log.action === 'oos-off' 
                                ? 'bg-red-500/10 text-red-400' 
                                : log.action === 'oos-on'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : log.action === 'price-adj'
                                ? 'bg-orange-500/10 text-orange-400'
                                : 'bg-purple-500/10 text-purple-400'
                            }`}>
                              {log.action === 'oos-off' && 'Out of Stock'}
                              {log.action === 'oos-on' && 'In Stock'}
                              {log.action === 'price-adj' && 'Price Adj'}
                              {log.action === 'margin' && 'Margin Set'}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-bold">
                              {new Date(log.created_at).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          {/* Details */}
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-zinc-200">
                              {log.action === 'price-adj' && `Adjusted price by ${log.action_value}%`}
                              {log.action === 'margin' && `Set target margin to ${log.action_value}%`}
                              {log.action === 'oos-off' && 'Marked products as Out of Stock'}
                              {log.action === 'oos-on' && 'Marked products as In Stock'}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              Scope: <strong className="capitalize text-zinc-400">{log.scope}</strong>
                              {log.scope_value && <span className="text-zinc-400"> ({log.scope_value})</span>}
                              {' • '}
                              <strong>{log.products_affected}</strong> products affected
                            </p>
                          </div>

                          {/* Action Row */}
                          <div className="flex items-center justify-between border-t border-zinc-900/60 pt-2.5">
                            {log.is_undone ? (
                              <>
                                <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                                  Undone successfully
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleReRun(log)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-black tracking-wide uppercase transition-all"
                                >
                                  <Play className="w-3 h-3" />
                                  Run Again
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] text-rose-500/60 font-bold">Active Operation</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => undoBulkOp(log.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-black tracking-wide uppercase transition-all"
                                  >
                                    <Undo2 className="w-3 h-3" />
                                    Undo
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReRun(log)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-black tracking-wide uppercase transition-all"
                                  >
                                    <Play className="w-3 h-3" />
                                    Run Again
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : activeTab === 'brands' ? (
                  <div className="space-y-4 animate-none">
                    {/* Brand Selection / Search Header */}
                    <div className="bg-[#111317] border border-zinc-900 rounded-2xl p-5 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-zinc-900/60 pb-2">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-rose-500" />
                          <p className="text-xs font-black text-gray-300 uppercase tracking-wider">Brand Stock Control</p>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-bold">
                          Manage stocks brand-wise
                        </span>
                      </div>

                      {/* Search Bar */}
                      <div className="relative flex items-center bg-zinc-950 border border-zinc-900 rounded-xl p-1">
                        <Search className="w-4 h-4 text-zinc-500 ml-2.5 shrink-0" />
                        <input
                          type="text"
                          placeholder="Search brands..."
                          value={brandStockSearch}
                          onChange={e => setBrandStockSearch(e.target.value)}
                          className="w-full bg-transparent border-0 text-zinc-250 text-xs font-bold focus:outline-none focus:ring-0 pl-2 pr-8 py-2 placeholder-zinc-700"
                        />
                        {brandStockSearch && (
                          <button
                            type="button"
                            onClick={() => setBrandStockSearch('')}
                            className="absolute right-2.5 p-1 rounded-full text-zinc-500 hover:text-zinc-300 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Bulk Selection Operations */}
                      {selectedBrandsForBulk.length > 0 && (
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-rose-400 uppercase tracking-wider">
                              {selectedBrandsForBulk.length} Brand{selectedBrandsForBulk.length > 1 ? 's' : ''} Selected
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedBrandsForBulk([])}
                              className="text-[10px] text-zinc-400 hover:text-zinc-200 underline font-bold"
                            >
                              Clear Selection
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => executeBrandStockUpdate(selectedBrandsForBulk, false)}
                              className="py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-black transition-all flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <AlertOctagon className="w-3.5 h-3.5" />
                              Mark Out of Stock
                            </button>
                            <button
                              type="button"
                              onClick={() => executeBrandStockUpdate(selectedBrandsForBulk, true)}
                              className="py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black transition-all flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Mark In Stock
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Select All Checkbox */}
                      {filteredBrandsStock.length > 0 && (
                        <div className="flex items-center justify-between px-1 py-0.5">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isAllFilteredSelected}
                              onChange={handleSelectAllToggle}
                              className="w-3.5 h-3.5 rounded border-zinc-800 bg-zinc-950 text-rose-500 focus:ring-rose-500/30 focus:ring-offset-0 focus:outline-none"
                            />
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                              Select All Filtered ({filteredBrandsStock.length})
                            </span>
                          </label>
                          <span className="text-[10px] text-zinc-500 font-bold">
                            {selectedBrandsForBulk.length} selected
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Brand stock list */}
                    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                      {loadingBrandsStock ? (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                          <span className="text-xs">Loading brands status...</span>
                        </div>
                      ) : filteredBrandsStock.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-zinc-650 text-center space-y-2">
                          <Tag className="w-8 h-8 text-zinc-800" />
                          <p className="text-xs font-bold text-zinc-500">No brands found.</p>
                        </div>
                      ) : (
                        filteredBrandsStock.map((item) => {
                          const isSelected = selectedBrandsForBulk.includes(item.brand)
                          const isBrandUpdating = updatingBrand === item.brand
                          const isOOS = item.in_stock === 0
                          const isFullStock = item.in_stock === item.total

                          return (
                            <div
                              key={item.brand}
                              className={`p-3 rounded-xl border bg-[#111317] flex items-center justify-between gap-3 ${
                                isSelected ? 'border-rose-500/25 bg-rose-500/[0.01]' : 'border-zinc-900 hover:border-zinc-850'
                              } transition-all`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleBrandCheckboxToggle(item.brand)}
                                  className="w-3.5 h-3.5 rounded border-zinc-800 bg-zinc-950 text-rose-500 focus:ring-rose-500/30 focus:ring-offset-0 focus:outline-none shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-zinc-200 truncate">{item.brand}</p>
                                  <p className="text-[10px] text-zinc-500 font-bold mt-0.5">
                                    {item.in_stock}/{item.total} in stock
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3.5 shrink-0">
                                {/* Status Badge */}
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                  isOOS 
                                    ? 'bg-red-500/10 text-red-400' 
                                    : isFullStock
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-orange-500/10 text-orange-400'
                                }`}>
                                  {isOOS ? 'OOS' : isFullStock ? 'In Stock' : 'Partial'}
                                </span>

                                {/* Quick toggle buttons */}
                                <div className="flex items-center gap-1.5">
                                  {isBrandUpdating ? (
                                    <div className="w-20 flex items-center justify-center">
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => executeBrandStockUpdate([item.brand], false)}
                                        disabled={isOOS}
                                        className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all border ${
                                          isOOS
                                            ? 'border-transparent bg-zinc-950/20 text-zinc-700 cursor-not-allowed'
                                            : 'border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 hover:border-red-500/40'
                                        }`}
                                        title="Mark brand Out of Stock"
                                      >
                                        OOS
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => executeBrandStockUpdate([item.brand], true)}
                                        disabled={isFullStock}
                                        className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all border ${
                                          isFullStock
                                            ? 'border-transparent bg-zinc-950/20 text-zinc-700 cursor-not-allowed'
                                            : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/40'
                                        }`}
                                        title="Mark brand In Stock"
                                      >
                                        Active
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Step 1: Scope */}
                    <div className="bg-[#111317] border border-zinc-900 rounded-2xl p-5 space-y-4 shadow-sm animate-none">
                      <div className="flex items-center gap-2 border-b border-zinc-900/60 pb-2">
                        <span className="w-5 h-5 rounded-full bg-zinc-900 text-[10px] text-zinc-400 flex items-center justify-center font-black">1</span>
                        <p className="text-xs font-black text-gray-300 uppercase tracking-wider">Scope (Target Products)</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 animate-none">
                        {[
                          { val: 'all', label: 'All Products', Icon: Globe },
                          { val: 'category', label: 'Current Category', Icon: Folder },
                          { val: 'mart', label: 'Current Mart', Icon: Store },
                          { val: 'oos', label: 'Out of Stock Only', Icon: Package },
                          { val: 'brand', label: 'Specific Brand', Icon: Tag },
                          { val: 'storage', label: 'Storage Zone', Icon: Layers }
                        ].map(({ val, label, Icon }) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              setBulkScope(val)
                              if (val !== 'brand') setSelectedBrand('')
                            }}
                            className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl text-xs font-bold transition-all border text-center ${
                              bulkScope === val
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-sm'
                                : 'bg-zinc-950/60 text-gray-400 border-zinc-900/80 hover:bg-zinc-900/40'
                            }`}
                          >
                            <Icon className="w-5 h-5 shrink-0" />
                            <span className="text-[11px] truncate w-full">{label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Scope specific selections */}
                      <div className="mt-3">
                        {bulkScope === 'category' && (
                          <div className="bg-zinc-900/20 border border-zinc-900/60 rounded-xl p-3">
                            <p className="text-xs font-semibold text-zinc-350">
                              Selected: <span className="text-zinc-100 font-bold capitalize">{selectedCategory === 'all' ? 'Select Category from filters' : (categories.find(c => c.id === selectedCategory)?.name || selectedCategory)}</span>
                            </p>
                          </div>
                        )}

                        {bulkScope === 'mart' && (
                          <div className="bg-zinc-900/20 border border-zinc-900/60 rounded-xl p-3">
                            <p className="text-xs font-semibold text-zinc-350">
                              Selected: <span className="text-zinc-100 font-bold capitalize">{selectedMart === 'all' ? 'Select Mart from filters' : (marts.find(m => m.id === selectedMart)?.name || selectedMart)}</span>
                            </p>
                          </div>
                        )}

                        {bulkScope === 'brand' && (
                          <div className="space-y-1.5 relative">
                            <label className="text-[11px] text-zinc-400 font-black uppercase tracking-wider block">Select Brand / Vendor</label>
                            {loadingDropdowns ? (
                              <div className="flex items-center gap-2 text-xs text-zinc-500 py-1">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                                Loading brands...
                              </div>
                            ) : (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
                                  className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-zinc-950 border border-zinc-900 text-zinc-200 text-xs focus:outline-none focus:border-rose-500/40 font-bold text-left transition-all hover:bg-zinc-900"
                                >
                                  <span className="truncate pr-2">{selectedBrand || '-- Choose Brand --'}</span>
                                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 shrink-0 ${isBrandDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isBrandDropdownOpen && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-30" 
                                      onClick={() => {
                                        setIsBrandDropdownOpen(false)
                                        setBrandSearchQuery('')
                                      }} 
                                    />
                                    <div className="absolute left-0 right-0 mt-1.5 max-h-52 overflow-y-auto rounded-xl bg-[#13151a] border border-zinc-850 shadow-2xl z-40 p-1 custom-scrollbar">
                                      <div className="p-1.5 border-b border-zinc-900 sticky top-0 bg-[#13151a] z-10">
                                        <div className="relative flex items-center">
                                          <input
                                            type="text"
                                            placeholder="Search Brand..."
                                            value={brandSearchQuery}
                                            onChange={(e) => setBrandSearchQuery(e.target.value)}
                                            className="w-full pl-8 pr-3 py-2 rounded-lg bg-zinc-950 border border-zinc-900 text-zinc-100 text-xs focus:outline-none focus:border-rose-500/50 placeholder-zinc-600"
                                            autoFocus
                                          />
                                          <Search className="absolute left-2.5 w-3.5 h-3.5 text-zinc-500" />
                                          {brandSearchQuery && (
                                            <button 
                                              type="button" 
                                              onClick={() => setBrandSearchQuery('')} 
                                              className="absolute right-2.5 text-zinc-500 hover:text-zinc-350"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedBrand('')
                                          setIsBrandDropdownOpen(false)
                                          setBrandSearchQuery('')
                                        }}
                                        className={`w-full text-left px-3 py-2.5 text-xs rounded-lg transition-colors font-bold ${
                                          !selectedBrand 
                                            ? 'bg-rose-500/10 text-rose-400' 
                                            : 'text-zinc-450 hover:text-zinc-200 hover:bg-white/5'
                                        }`}
                                      >
                                        -- Choose Brand --
                                      </button>
                                      {brands
                                        .filter(b => b.toLowerCase().includes(brandSearchQuery.toLowerCase()))
                                        .map((b) => (
                                          <button
                                            key={b}
                                            type="button"
                                            onClick={() => {
                                              setSelectedBrand(b)
                                              setIsBrandDropdownOpen(false)
                                              setBrandSearchQuery('')
                                            }}
                                            className={`w-full text-left px-3 py-2.5 text-xs rounded-lg transition-colors font-bold flex items-center justify-between ${
                                              selectedBrand === b
                                                ? 'bg-rose-500/10 text-rose-400'
                                                : 'text-zinc-350 hover:text-zinc-200 hover:bg-white/5'
                                            }`}
                                          >
                                            <span className="truncate pr-2">{b}</span>
                                            {selectedBrand === b && <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                                          </button>
                                        ))}
                                      {brands.filter(b => b.toLowerCase().includes(brandSearchQuery.toLowerCase())).length === 0 && (
                                        <div className="px-3 py-4 text-xs text-zinc-600 text-center font-bold">
                                          No brands found
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {bulkScope === 'storage' && (
                          <div className="space-y-2">
                            <label className="text-[11px] text-zinc-450 font-black uppercase tracking-wider block">Select Storage Type</label>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { id: 'frozen', label: 'Frozen' },
                                { id: 'perishable', label: 'Perishables' },
                                { id: 'staples', label: 'Dry Staples' }
                              ].map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => setSelectedStorage(item.id)}
                                  className={`py-3.5 rounded-xl text-xs font-bold border text-center transition-all ${
                                    selectedStorage === item.id
                                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                                      : 'bg-zinc-950 border-zinc-900 text-gray-400 hover:bg-white/5'
                                  }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Step 2: Action */}
                    <div className="bg-[#111317] border border-zinc-900 rounded-2xl p-5 space-y-4 shadow-sm animate-none">
                      <div className="flex items-center gap-2 border-b border-zinc-900/60 pb-2">
                        <span className="w-5 h-5 rounded-full bg-zinc-900 text-[10px] text-zinc-400 flex items-center justify-center font-black">2</span>
                        <p className="text-xs font-black text-gray-300 uppercase tracking-wider">Action (Bulk Task)</p>
                      </div>
                      <div className="space-y-2">
                        {[
                          { val: 'oos-off', label: 'Emergency: All Out of Stock', Icon: AlertOctagon, color: 'red' },
                          { val: 'oos-on',  label: 'Restore: All In Stock', Icon: CheckCircle2, color: 'green' },
                          { val: 'price-adj', label: 'Price % Adjust (Selling Price)', Icon: TrendingUp, color: 'orange' },
                          { val: 'margin',  label: 'Margin % Set (MRP Based)', Icon: Coins, color: 'purple' },
                        ].map(({ val, label, Icon, color }) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setBulkAction(val)}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all border ${
                              bulkAction === val
                                ? color === 'red'
                                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                  : color === 'green'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : color === 'orange'
                                  ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                                  : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                : 'bg-zinc-950/60 text-gray-300 border-zinc-900/80 hover:bg-zinc-900/40'
                            }`}
                          >
                            <Icon className="w-4.5 h-4.5 shrink-0" />
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Step 3: Params */}
                    <div className="bg-[#111317] border border-zinc-900 rounded-2xl p-5 space-y-4 shadow-sm animate-none">
                      <div className="flex items-center gap-2 border-b border-zinc-900/60 pb-2">
                        <span className="w-5 h-5 rounded-full bg-zinc-900 text-[10px] text-zinc-400 flex items-center justify-center font-black">3</span>
                        <p className="text-xs font-black text-gray-300 uppercase tracking-wider">Parameters & Confirm</p>
                      </div>

                      {bulkAction === 'price-adj' && (
                        <div className="space-y-2">
                          <label className="text-xs text-gray-400 block font-bold">Selling Price Change %</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              placeholder="e.g. +5 or -10"
                              value={bulkPercent}
                              onChange={e => setBulkPercent(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-900 text-zinc-100 text-sm focus:outline-none focus:border-rose-500/40 placeholder-zinc-700"
                            />
                            <div className="w-11 h-11 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 text-orange-400 font-bold shrink-0">%</div>
                          </div>
                          {bulkPercent && !isNaN(parseFloat(bulkPercent)) && (
                            <p className="text-[11px] text-orange-300 mt-1">Selling Price: ₹100 → ₹{Math.round(100 * (1 + parseFloat(bulkPercent)/100))} (MRP remains unchanged)</p>
                          )}
                        </div>
                      )}

                      {bulkAction === 'margin' && (
                        <div className="space-y-2">
                          <label className="text-xs text-gray-400 block font-bold">Target Margin % (MRP Value Based)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1" max="99"
                              placeholder="e.g. 20"
                              value={bulkMargin}
                              onChange={e => setBulkMargin(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-900 text-zinc-100 text-sm focus:outline-none focus:border-rose-500/40 placeholder-zinc-700"
                        />
                            <div className="w-11 h-11 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800 text-purple-400 font-bold shrink-0">%</div>
                          </div>
                          {bulkMargin && !isNaN(parseFloat(bulkMargin)) && (
                            <div className="mt-1 bg-purple-950/10 border border-purple-900/20 rounded-xl p-3 space-y-1">
                              <p className="text-[11px] text-purple-300 font-bold">Selling Price = MRP × {(100 - parseFloat(bulkMargin))}%</p>
                              <p className="text-[11px] text-gray-400">e.g. MRP ₹100 → Selling Price ₹{Math.round(100 * (1 - parseFloat(bulkMargin)/100))}</p>
                              <p className="text-[11px] text-green-400 font-bold">Margin: ₹{Math.round(100 * parseFloat(bulkMargin)/100)} per ₹100 MRP</p>
                            </div>
                          )}
                        </div>
                      )}

                      {(bulkAction === 'oos-off' || bulkAction === 'oos-on') && (
                        <div className={`rounded-xl p-3 flex items-start gap-2.5 ${ bulkAction === 'oos-off' ? 'bg-red-950/20 border border-red-900/30' : 'bg-emerald-950/20 border border-emerald-900/30' }`}>
                          {bulkAction === 'oos-off' ? (
                            <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          )}
                          <p className={`text-xs font-semibold ${ bulkAction === 'oos-off' ? 'text-red-300' : 'text-emerald-300' }`}>
                            {bulkAction === 'oos-off'
                              ? 'Selected products will be hidden from the customer application.'
                              : 'Selected products will be active and visible in the customer application.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Drawer Sticky Footer */}
              {activeTab === 'control' && (
                <div className="p-4 border-t border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
                  <button
                    type="button"
                    onClick={openBulkConfirm}
                    disabled={bulkRunning
                      || (bulkAction === 'price-adj' && (!bulkPercent || isNaN(parseFloat(bulkPercent))))
                      || (bulkAction === 'margin' && (!bulkMargin || isNaN(parseFloat(bulkMargin))))
                      || (bulkScope === 'category' && selectedCategory === 'all')
                      || (bulkScope === 'mart' && selectedMart === 'all')
                      || (bulkScope === 'brand' && !selectedBrand)
                    }
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-black text-sm hover:from-rose-600 hover:to-amber-600 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-rose-950/20"
                  >
                    <Zap className="w-4 h-4" />
                    Review & Execute
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
