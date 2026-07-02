import React, { useState, useEffect, useMemo } from 'react'
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Search,
  ArrowRight,
  CheckCircle2,
  Percent,
  Sliders,
  Sparkles,
  Plus,
  Minus,
  Check,
  Loader2,
  Package,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { supabaseAdmin } from '../../lib/supabase'
import toast from 'react-hot-toast'

const ProfitOptimizer = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [formulaFactor, setFormulaFactor] = useState(40) // Take 40% of discount by default
  const [selectedIds, setSelectedIds] = useState([])
  const [processingId, setProcessingId] = useState(null)
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [adjustedOzoPrices, setAdjustedOzoPrices] = useState({}) // { [productId]: price }
  const [discountFilter, setDiscountFilter] = useState('all')
  const [priceFilter, setPriceFilter] = useState('all')
  const [sortBy, setSortBy] = useState('discount-desc')
  const [showAllProducts, setShowAllProducts] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [salesData, setSalesData] = useState({}) // { [productId]: { unitsSold, marginEarned } }
  const [ruleCategoryId, setRuleCategoryId] = useState('all')
  const [ruleFactor, setRuleFactor] = useState(40)
  const [ruleMinDiscount, setRuleMinDiscount] = useState(8)

  // 1. Fetch catalog data on mount
  const loadData = async () => {
    setLoading(true)
    try {
      // Fetch categories
      const { data: catData } = await supabaseAdmin
        .from('categories')
        .select('id, name')
        .order('name')
      setCategories(catData || [])

      // Fetch all products with their category details
      const { data: prodData, error } = await supabaseAdmin
        .from('products')
        .select(`
          id,
          name,
          mrp,
          price,
          ozo_price,
          unit,
          image_url,
          category_id
        `)
        .order('name')
      
      if (error) throw error

      // Fetch order items to analyze order velocity and historical margin
      const { data: itemsData } = await supabaseAdmin
        .from('order_items')
        .select('product_id, quantity, unit_price, mart_unit_price')

      const salesMap = {}
      if (itemsData) {
        itemsData.forEach(item => {
          const pid = item.product_id
          if (!pid) return
          
          const qty = parseInt(item.quantity || 0)
          const price = parseFloat(item.unit_price || 0)
          const martPrice = parseFloat(item.mart_unit_price || 0)
          const margin = (price - martPrice) * qty
          
          if (!salesMap[pid]) {
            salesMap[pid] = {
              unitsSold: 0,
              marginEarned: 0
            }
          }
          salesMap[pid].unitsSold += qty
          salesMap[pid].marginEarned += margin
        })
      }
      setSalesData(salesMap)
      setProducts(prodData || [])
    } catch (err) {
      console.error('Error fetching optimizer catalog:', err)
      toast.error('Failed to load catalog data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 2. Compute live analytical suggestions & overall stats
  const analysis = useMemo(() => {
    let totalItems = 0
    let optimizedCount = 0
    let currentMarginTotal = 0
    let potentialAdditionalMargin = 0
    let totalRealizedMargin = 0
    let totalUnitsSold = 0
    const suggestionsList = []

    products.forEach(p => {
      const mrp = parseFloat(p.mrp || 0)
      const price = parseFloat(p.price || 0)
      const ozoPrice = p.ozo_price !== null && p.ozo_price !== undefined ? parseFloat(p.ozo_price) : null
      
      totalItems++

      const isOptimized = ozoPrice !== null && ozoPrice > 0 && ozoPrice > price
      const isRejected = ozoPrice === -1

      // If custom Ozo Price is active
      if (isOptimized) {
        optimizedCount++
        currentMarginTotal += (ozoPrice - price)
      }

      // Check for suggestions:
      // Product must have a discount (mrp > price)
      // No custom ozo_price is set, and it is not rejected
      const isNotSet = ozoPrice === null || ozoPrice === price
      const discountVal = mrp - price
      const discountPct = mrp > 0 ? (discountVal / mrp) * 100 : 0
      const isSuggestion = mrp > price && discountPct >= 8 && !isRejected && isNotSet

      // Suggested margin based on formula factor (e.g. 40% of discount)
      const factor = formulaFactor / 100
      const calculatedMargin = mrp > price ? Math.round(discountVal * factor * 2) / 2 : 0
      // Make sure suggested Ozo Price doesn't equal/exceed MRP
      const suggestedOzo = mrp > price 
        ? Math.min(mrp - 0.5, price + calculatedMargin)
        : price // If no discount, default to price itself
      const potentialProfit = suggestedOzo - price

      // Sales velocity stats
      const salesInfo = salesData[p.id] || { unitsSold: 0, marginEarned: 0 }
      totalRealizedMargin += salesInfo.marginEarned
      totalUnitsSold += salesInfo.unitsSold

      suggestionsList.push({
        id: p.id,
        name: p.name,
        unit: p.unit,
        image_url: p.image_url,
        category_id: p.category_id,
        mrp,
        price,
        discountVal,
        discountPct,
        defaultSuggestedOzo: suggestedOzo,
        potentialProfit: potentialProfit > 0 ? potentialProfit : 0,
        unitsSold: salesInfo.unitsSold,
        realizedProfit: salesInfo.marginEarned,
        isSuggestion,
        isOptimized,
        isRejected
      })

      if (isSuggestion && potentialProfit > 0) {
        potentialAdditionalMargin += potentialProfit
      }
    })

    return {
      totalItems,
      optimizedCount,
      currentMarginTotal,
      potentialAdditionalMargin,
      totalRealizedMargin,
      totalUnitsSold,
      suggestionsList
    }
  }, [products, formulaFactor, salesData])

  // Compute category heatmap metrics
  const categoryHeatmap = useMemo(() => {
    const map = {}
    categories.forEach(cat => {
      map[cat.id] = {
        id: cat.id,
        name: cat.name,
        totalProducts: 0,
        optimizedProducts: 0,
        potentialMargin: 0,
        realizedMargin: 0,
        unitsSold: 0
      }
    })

    products.forEach(p => {
      const catId = p.category_id
      if (!catId || !map[catId]) return
      
      const mrp = parseFloat(p.mrp || 0)
      const price = parseFloat(p.price || 0)
      const ozoPrice = p.ozo_price !== null && p.ozo_price !== undefined ? parseFloat(p.ozo_price) : null
      const isOptimized = ozoPrice !== null && ozoPrice > 0 && ozoPrice > price
      
      const salesInfo = salesData[p.id] || { unitsSold: 0, marginEarned: 0 }
      
      map[catId].totalProducts++
      if (isOptimized) {
        map[catId].optimizedProducts++
      }

      // potential addition
      const discountVal = mrp - price
      const discountPct = mrp > 0 ? (discountVal / mrp) * 100 : 0
      const isNotSet = ozoPrice === null || ozoPrice === price
      const isSuggestion = mrp > price && discountPct >= 8 && ozoPrice !== -1 && isNotSet
      if (isSuggestion) {
        const factor = formulaFactor / 100
        const calculatedMargin = Math.round(discountVal * factor * 2) / 2
        const potentialProfit = Math.min(mrp - 0.5, price + calculatedMargin) - price
        if (potentialProfit > 0) {
          map[catId].potentialMargin += potentialProfit
        }
      }

      map[catId].realizedMargin += salesInfo.marginEarned
      map[catId].unitsSold += salesInfo.unitsSold
    })

    return Object.values(map)
      .filter(c => c.totalProducts > 0)
      .sort((a, b) => b.realizedMargin - a.realizedMargin || b.potentialMargin - a.potentialMargin)
  }, [products, categories, salesData, formulaFactor])

  // 3. Filter and Sort suggestions based on UI inputs
  const filteredSuggestions = useMemo(() => {
    // Apply filters
    let list = analysis.suggestionsList.filter(s => {
      const matchCat = selectedCategory === 'all' || s.category_id === selectedCategory
      const matchSearch = searchQuery === '' || s.name.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Discount range filter
      let matchDiscount = true
      if (discountFilter === '8-15') {
        matchDiscount = s.discountPct >= 8 && s.discountPct < 15
      } else if (discountFilter === '15-30') {
        matchDiscount = s.discountPct >= 15 && s.discountPct < 30
      } else if (discountFilter === '30-50') {
        matchDiscount = s.discountPct >= 30 && s.discountPct < 50
      } else if (discountFilter === '50+') {
        matchDiscount = s.discountPct >= 50
      }

      // Price range filter
      let matchPrice = true
      if (priceFilter === 'under-100') {
        matchPrice = s.price < 100
      } else if (priceFilter === '100-500') {
        matchPrice = s.price >= 100 && s.price < 500
      } else if (priceFilter === '500-1500') {
        matchPrice = s.price >= 500 && s.price < 1500
      } else if (priceFilter === '1500+') {
        matchPrice = s.price >= 1500
      }

      // If user is searching or showAllProducts toggle is enabled, show everything. Otherwise, only show suggestions.
      const matchesVisibility = (showAllProducts || searchQuery !== '') ? true : s.isSuggestion

      return matchCat && matchSearch && matchDiscount && matchPrice && matchesVisibility
    })

    // Sort list
    list.sort((a, b) => {
      const aOzoVal = adjustedOzoPrices[a.id] !== undefined ? adjustedOzoPrices[a.id] : a.defaultSuggestedOzo
      const bOzoVal = adjustedOzoPrices[b.id] !== undefined ? adjustedOzoPrices[b.id] : b.defaultSuggestedOzo
      const aMargin = aOzoVal - a.price
      const bMargin = bOzoVal - b.price

      if (sortBy === 'discount-desc') {
        return b.discountPct - a.discountPct
      } else if (sortBy === 'discount-asc') {
        return a.discountPct - b.discountPct
      } else if (sortBy === 'profit-desc') {
        return bMargin - aMargin
      } else if (sortBy === 'profit-asc') {
        return aMargin - bMargin
      } else if (sortBy === 'price-desc') {
        return b.price - a.price
      } else if (sortBy === 'price-asc') {
        return a.price - b.price
      } else if (sortBy === 'sales-desc') {
        return b.unitsSold - a.unitsSold
      } else if (sortBy === 'sales-asc') {
        return a.unitsSold - b.unitsSold
      }
      return 0
    })

    return list
  }, [analysis.suggestionsList, selectedCategory, searchQuery, discountFilter, priceFilter, sortBy, showAllProducts, adjustedOzoPrices])

  const paginatedSuggestions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredSuggestions.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredSuggestions, currentPage, itemsPerPage])

  // Clear selections & reset page if filtered suggestions change
  useEffect(() => {
    setSelectedIds([])
    setCurrentPage(1)
  }, [selectedCategory, searchQuery, discountFilter, priceFilter, sortBy, showAllProducts])

  // Toggle single item selection
  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  // Toggle select all visible items on the current page
  const toggleSelectAll = () => {
    const allPaginatedSelected = paginatedSuggestions.length > 0 && paginatedSuggestions.every(s => selectedIds.includes(s.id))
    if (allPaginatedSelected) {
      const paginatedIds = paginatedSuggestions.map(s => s.id)
      setSelectedIds(prev => prev.filter(id => !paginatedIds.includes(id)))
    } else {
      setSelectedIds(prev => {
        const next = [...prev]
        paginatedSuggestions.forEach(s => {
          if (!next.includes(s.id)) next.push(s.id)
        })
        return next
      })
    }
  }

  // Adjust custom OZO Price for a product inline
  const getOzoPriceValue = (item) => {
    if (adjustedOzoPrices[item.id] !== undefined) {
      return adjustedOzoPrices[item.id]
    }
    return item.defaultSuggestedOzo
  }

  const handlePriceAdjust = (itemId, change, currentVal, price, mrp) => {
    const newVal = Math.max(price + 0.5, Math.min(mrp - 0.5, currentVal + change))
    setAdjustedOzoPrices(prev => ({
      ...prev,
      [itemId]: Math.round(newVal * 2) / 2 // round to nearest 0.50
    }))
  }

  // Apply single optimization
  const applySingleOptimization = async (item) => {
    const ozoPriceToApply = getOzoPriceValue(item)
    setProcessingId(item.id)
    try {
      const { error } = await supabaseAdmin
        .from('products')
        .update({ ozo_price: ozoPriceToApply })
        .eq('id', item.id)

      if (error) throw error

      toast.success(`Optimized price for ${item.name}`)
      // Update local state to reflect the change
      setProducts(prev => prev.map(p => 
        p.id === item.id ? { ...p, ozo_price: ozoPriceToApply } : p
      ))
      // Remove from adjusted dictionary
      setAdjustedOzoPrices(prev => {
        const copy = { ...prev }
        delete copy[item.id]
        return copy
      })
    } catch (err) {
      console.error(err)
      toast.error('Failed to update Ozo Price')
    } finally {
      setProcessingId(null)
    }
  }

  // Apply selected optimizations in bulk
  const applyBulkOptimizations = async () => {
    if (selectedIds.length === 0) return
    setBulkProcessing(true)
    const toastId = toast.loading(`Optimizing ${selectedIds.length} products...`)
    
    try {
      let successCount = 0
      const updates = filteredSuggestions
        .filter(s => selectedIds.includes(s.id))
        .map(async (s) => {
          const priceVal = getOzoPriceValue(s)
          const { error } = await supabaseAdmin
            .from('products')
            .update({ ozo_price: priceVal })
            .eq('id', s.id)
          if (!error) {
            successCount++
            return { id: s.id, ozo_price: priceVal }
          }
          return null
        })

      const results = await Promise.all(updates)
      const successfulUpdates = results.filter(Boolean)

      // Apply to local state
      setProducts(prev => {
        let updated = [...prev]
        successfulUpdates.forEach(u => {
          updated = updated.map(p => p.id === u.id ? { ...p, ozo_price: u.ozo_price } : p)
        })
        return updated
      })

      // Clean adjusted prices dictionary
      setAdjustedOzoPrices(prev => {
        const copy = { ...prev }
        successfulUpdates.forEach(u => {
          delete copy[u.id]
        })
        return copy
      })

      setSelectedIds([])
      toast.success(`Successfully optimized ${successCount} products!`, { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Failed during bulk optimization', { id: toastId })
    } finally {
      setBulkProcessing(false)
    }
  }

  // Reject single suggestion (set ozo_price to -1)
  const rejectSingleSuggestion = async (item) => {
    setProcessingId(item.id + '-reject')
    try {
      const { error } = await supabaseAdmin
        .from('products')
        .update({ ozo_price: -1 })
        .eq('id', item.id)

      if (error) throw error

      toast.success(`Suggestion rejected for ${item.name}`)
      // Update local state to reflect the change
      setProducts(prev => prev.map(p => 
        p.id === item.id ? { ...p, ozo_price: -1 } : p
      ))
      // Remove from adjusted dictionary
      setAdjustedOzoPrices(prev => {
        const copy = { ...prev }
        delete copy[item.id]
        return copy
      })
    } catch (err) {
      console.error(err)
      toast.error('Failed to reject suggestion')
    } finally {
      setProcessingId(null)
    }
  }

  // Reject selected suggestions in bulk
  const rejectBulkSuggestions = async () => {
    if (selectedIds.length === 0) return
    setBulkProcessing(true)
    const toastId = toast.loading(`Rejecting ${selectedIds.length} suggestions...`)
    
    try {
      const { error } = await supabaseAdmin
        .from('products')
        .update({ ozo_price: -1 })
        .in('id', selectedIds)

      if (error) throw error

      // Apply to local state
      setProducts(prev => prev.map(p => 
        selectedIds.includes(p.id) ? { ...p, ozo_price: -1 } : p
      ))

      // Clean adjusted prices dictionary
      setAdjustedOzoPrices(prev => {
        const copy = { ...prev }
        selectedIds.forEach(id => {
          delete copy[id]
        })
        return copy
      })

      setSelectedIds([])
      toast.success(`Successfully rejected ${selectedIds.length} suggestions!`, { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Failed during bulk rejection', { id: toastId })
    } finally {
      setBulkProcessing(false)
    }
  }

  // Bulk Auto-Pricing Rules Engine implementation
  const applyCategoryPricingRule = async (catId, factorPct, minDiscountPct = 8) => {
    setBulkProcessing(true)
    const toastId = toast.loading('Applying auto-pricing rules...')
    try {
      // Find all products that match criteria
      const targets = analysis.suggestionsList.filter(s => {
        const matchCat = catId === 'all' || s.category_id === catId
        const matchDiscount = s.discountPct >= minDiscountPct
        return matchCat && matchDiscount && !s.isRejected && !s.isOptimized
      })

      if (targets.length === 0) {
        toast.error('No pending suggestions found matching this criteria', { id: toastId })
        setBulkProcessing(false)
        return
      }

      const factor = factorPct / 100
      let successCount = 0
      
      const updates = targets.map(async (s) => {
        // Calculate suggested price
        const calculatedMargin = Math.round(s.discountVal * factor * 2) / 2
        const suggestedOzo = Math.min(s.mrp - 0.5, s.price + calculatedMargin)
        
        const { error } = await supabaseAdmin
          .from('products')
          .update({ ozo_price: suggestedOzo })
          .eq('id', s.id)
        
        if (!error) {
          successCount++
          return { id: s.id, ozo_price: suggestedOzo }
        }
        return null
      })

      const results = await Promise.all(updates)
      const successfulUpdates = results.filter(Boolean)

      // Apply to local state
      setProducts(prev => {
        let updated = [...prev]
        successfulUpdates.forEach(u => {
          updated = updated.map(p => p.id === u.id ? { ...p, ozo_price: u.ozo_price } : p)
        })
        return updated
      })

      toast.success(`Successfully applied rules to ${successCount} products!`, { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Failed to apply auto-pricing rules', { id: toastId })
    } finally {
      setBulkProcessing(false)
    }
  }

  const handleExportCSV = () => {
    try {
      const headers = ['Product Name', 'Category', 'MRP', 'Mart Selling Price', 'OZO Price', 'Current Margin (INR)', 'Discount Pct', 'Sales Velocity (Units)', 'Realized OZO Profit (INR)', 'Status']
      const rows = filteredSuggestions.map(s => {
        const catName = categories.find(c => c.id === s.category_id)?.name || 'Unknown'
        const statusText = s.isRejected ? 'Rejected' : s.isOptimized ? 'Active OZO' : 'Suggested Opportunity'
        const ozoPriceVal = getOzoPriceValue(s)
        return [
          `"${s.name.replace(/"/g, '""')}"`,
          `"${catName.replace(/"/g, '""')}"`,
          s.mrp,
          s.price,
          ozoPriceVal,
          (ozoPriceVal - s.price).toFixed(2),
          s.discountPct.toFixed(0),
          s.unitsSold,
          s.realizedProfit.toFixed(2),
          statusText
        ]
      })
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
      
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", `Ozo_Profit_Optimization_Report_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Report downloaded successfully!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to export CSV')
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header & Description ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Coins className="w-7 h-7 text-emerald-500 animate-pulse" />
            Pricing Analytics & Margin Engine
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Analyze high-discount items dynamically. Recalculate margins and automatically suggest optimal consumer-facing Ozo Prices without changing mart billing prices.
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl hover:bg-gray-250 dark:hover:bg-zinc-700 transition-all border border-gray-200 dark:border-white/5"
        >
          Refresh Data
        </button>
      </div>

      {/* ── Key Statistics Panel ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="p-5 bg-white dark:bg-[#121214] rounded-2xl border border-gray-150 dark:border-white/5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:scale-125 transition-all duration-500" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Catalog Items</span>
          <p className="text-3xl font-black mt-2 text-gray-900 dark:text-white">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" /> : analysis.totalItems}
          </p>
          <span className="text-[11px] text-gray-450 dark:text-gray-500 mt-2 block">All active database products</span>
        </div>

        {/* Stat 2 */}
        <div className="p-5 bg-white dark:bg-[#121214] rounded-2xl border border-gray-150 dark:border-white/5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:scale-125 transition-all duration-500" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Optimized (Ozo Price Active)</span>
          <p className="text-3xl font-black mt-2 text-indigo-650 dark:text-indigo-400">
            {loading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" /> : analysis.optimizedCount}
          </p>
          <span className="text-[11px] text-indigo-500/80 dark:text-indigo-400/80 mt-2 block font-medium">
            {analysis.totalItems > 0 ? ((analysis.optimizedCount / analysis.totalItems) * 100).toFixed(1) : 0}% catalog coverage
          </span>
        </div>

        {/* Stat 3 */}
        <div className="p-5 bg-white dark:bg-[#121214] rounded-2xl border border-gray-150 dark:border-white/5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:scale-125 transition-all duration-500" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Realized OZO Profit</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-black text-emerald-650 dark:text-emerald-400">
              ₹{loading ? '---' : analysis.totalRealizedMargin.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <span className="text-[11px] text-emerald-500/80 dark:text-emerald-400/80 mt-2 block font-medium">
            From {analysis.totalUnitsSold} delivered units
          </span>
        </div>

        {/* Stat 4 */}
        <div className="p-5 bg-white dark:bg-[#121214] rounded-2xl border border-gray-150 dark:border-white/5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:scale-125 transition-all duration-500" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Potential Unused Profit</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-black text-amber-550 dark:text-amber-400">
              ₹{loading ? '---' : analysis.potentialAdditionalMargin.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <span className="text-[11px] text-amber-500/80 dark:text-amber-400/80 mt-2 block font-medium">
            Ready to unlock from high-discounts
          </span>
        </div>
      </div>

      {/* ── Dashboard: Auto-Pricing & Category Heatmap ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Bulk Auto-Pricing Rules Engine (1/3 width) */}
        <div className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-gray-150 dark:border-white/5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm tracking-wide uppercase">Auto-Pricing Rules</h3>
          </div>
          <p className="text-xs text-gray-400">
            Automatically optimize consumer ozo prices in bulk across categories based on margins.
          </p>

          <div className="space-y-3.5 pt-2">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Target Category</label>
              <select
                value={ruleCategoryId}
                onChange={(e) => setRuleCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-205 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs text-gray-750 dark:text-gray-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Take Margin Cut</label>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {ruleFactor}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="5"
                  value={ruleFactor}
                  onChange={(e) => setRuleFactor(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
              <span className="text-[10px] text-gray-400 leading-normal block mt-1">
                Take {ruleFactor}% of vendor discount as ozo profit.
              </span>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Minimum Vendor Discount</label>
              <select
                value={ruleMinDiscount}
                onChange={(e) => setRuleMinDiscount(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-205 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs text-gray-750 dark:text-gray-250 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
              >
                <option value="5">Above 5% Discount</option>
                <option value="8">Above 8% Discount</option>
                <option value="12">Above 12% Discount</option>
                <option value="15">Above 15% Discount</option>
                <option value="20">Above 20% Discount</option>
              </select>
            </div>

            <button
              onClick={() => applyCategoryPricingRule(ruleCategoryId, ruleFactor, ruleMinDiscount)}
              disabled={bulkProcessing || loading}
              className="w-full py-2.5 bg-emerald-500 text-white font-bold text-xs rounded-xl hover:bg-emerald-600 active:scale-98 transition-all disabled:opacity-55 disabled:hover:bg-emerald-500 shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2"
            >
              {bulkProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Applying Rules...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Apply Pricing Rule
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Category Heatmap (2/3 width) */}
        <div className="bg-white dark:bg-[#121214] p-6 rounded-2xl border border-gray-150 dark:border-white/5 shadow-sm space-y-4 lg:col-span-2 flex flex-col h-[340px] lg:h-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm tracking-wide uppercase">Category Heatmap</h3>
            </div>
            <span className="text-[9px] bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
              Sorted by Realized Profit
            </span>
          </div>

          <div className="overflow-y-auto flex-1 pr-1 space-y-2 max-h-[220px] lg:max-h-[250px] scrollbar-thin">
            {categoryHeatmap.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                No active category data found
              </div>
            ) : (
              categoryHeatmap.map(cat => {
                const coverage = cat.totalProducts > 0 ? (cat.optimizedProducts / cat.totalProducts) * 100 : 0
                return (
                  <div key={cat.id} className="p-2.5 bg-gray-50/50 dark:bg-white/2 rounded-xl border border-gray-200/40 dark:border-white/3 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                    <div>
                      <span className="font-bold text-xs text-gray-800 dark:text-gray-250 block">
                        {cat.name}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400 font-semibold">
                        <span>Items: {cat.totalProducts}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-white/10" />
                        <span>Coverage: {coverage.toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center sm:text-right">
                        <span className="text-[9px] text-gray-400 uppercase tracking-wider block font-bold">Realized Profit</span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          ₹{cat.realizedMargin.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="text-center sm:text-right">
                        <span className="text-[9px] text-gray-400 uppercase tracking-wider block font-bold">Unused Potential</span>
                        <span className="text-xs font-black text-amber-550 dark:text-amber-400">
                          ₹{cat.potentialMargin.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Interactive Controls ───────────────────────────────────── */}
      <div className="p-5 bg-white dark:bg-[#121214] rounded-2xl border border-gray-150 dark:border-white/5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search suggestions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-800 dark:text-white rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-700 dark:text-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer font-semibold"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Show All Products Toggle */}
            <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 rounded-xl cursor-pointer select-none text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={showAllProducts}
                onChange={(e) => setShowAllProducts(e.target.checked)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer accent-emerald-500"
              />
              <span>Show All Inventory Items</span>
            </label>
          </div>

          {/* Formula Factor Customizer Slider */}
          <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 px-4 py-2.5 rounded-xl border border-gray-200/50 dark:border-white/5 self-start lg:self-auto">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Margin Cut Formula:</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={formulaFactor}
                onChange={(e) => setFormulaFactor(parseInt(e.target.value))}
                className="w-32 accent-emerald-500 cursor-pointer"
              />
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 w-10">
                {formulaFactor}%
              </span>
            </div>
            <div className="text-[10px] text-gray-400 max-w-[200px] leading-tight border-l border-gray-200 dark:border-white/10 pl-3">
              Take {formulaFactor}% of vendor discount as margin; customer keeps {100 - formulaFactor}%.
            </div>
          </div>
        </div>

        {/* Secondary Row: Advanced Filters & Sorting */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 dark:border-white/5">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filters & Sorting:</span>
          
          {/* Discount Filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 pl-3 rounded-xl border border-gray-200/55 dark:border-white/5">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Discount:</span>
            <select
              value={discountFilter}
              onChange={(e) => setDiscountFilter(e.target.value)}
              className="py-1.5 pr-2 bg-transparent text-xs text-gray-800 dark:text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-zinc-900">All (&gt; 8%)</option>
              <option value="8-15" className="bg-white dark:bg-zinc-900">Low (8% - 15%)</option>
              <option value="15-30" className="bg-white dark:bg-zinc-900">Medium (15% - 30%)</option>
              <option value="30-50" className="bg-white dark:bg-zinc-900">High (30% - 50%)</option>
              <option value="50+" className="bg-white dark:bg-zinc-900">Mega (50%+)</option>
            </select>
          </div>

          {/* Price Value Filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 pl-3 rounded-xl border border-gray-200/55 dark:border-white/5">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Mart Price:</span>
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="py-1.5 pr-2 bg-transparent text-xs text-gray-800 dark:text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-zinc-900">All Prices</option>
              <option value="under-100" className="bg-white dark:bg-zinc-900">Under ₹100</option>
              <option value="100-500" className="bg-white dark:bg-zinc-900">₹100 - ₹500</option>
              <option value="500-1500" className="bg-white dark:bg-zinc-900">₹500 - ₹1500</option>
              <option value="1500+" className="bg-white dark:bg-zinc-900">₹1500+</option>
            </select>
          </div>

          {/* Sort By Filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 pl-3 rounded-xl border border-gray-200/55 dark:border-white/5">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="py-1.5 pr-2 bg-transparent text-xs text-gray-800 dark:text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="discount-desc" className="bg-white dark:bg-zinc-900">Discount: High to Low</option>
              <option value="discount-asc" className="bg-white dark:bg-zinc-900">Discount: Low to High</option>
              <option value="profit-desc" className="bg-white dark:bg-zinc-900">Ozo Margin: High to Low</option>
              <option value="profit-asc" className="bg-white dark:bg-zinc-900">Ozo Margin: Low to High</option>
              <option value="price-desc" className="bg-white dark:bg-zinc-900">Mart Price: High to Low</option>
              <option value="price-asc" className="bg-white dark:bg-zinc-900">Mart Price: Low to High</option>
              <option value="sales-desc" className="bg-white dark:bg-zinc-900">Sales Velocity: High to Low</option>
              <option value="sales-asc" className="bg-white dark:bg-zinc-900">Sales Velocity: Low to High</option>
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl transition-all border border-emerald-500/20 flex items-center gap-1.5 ml-auto"
          >
            Export CSV
          </button>

          {/* Reset Filters Button */}
          {(discountFilter !== 'all' || priceFilter !== 'all' || sortBy !== 'discount-desc' || selectedCategory !== 'all' || searchQuery !== '') && (
            <button
              onClick={() => {
                setDiscountFilter('all')
                setPriceFilter('all')
                setSortBy('discount-desc')
                setSelectedCategory('all')
                setSearchQuery('')
              }}
              className="px-3 py-1.5 text-xs font-black text-red-500 hover:text-red-650 transition-all"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Bulk Action Controls */}
        {selectedIds.length > 0 && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-between flex-wrap gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                {selectedIds.length} products selected for OZO Price optimization
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white font-bold transition-all"
              >
                Deselect All
              </button>
              <button
                onClick={rejectBulkSuggestions}
                disabled={bulkProcessing}
                className="px-3 py-1.5 border border-red-500/35 text-red-500 hover:bg-red-500/10 rounded-lg text-xs font-black transition-all active:scale-95 flex items-center gap-1.5"
              >
                {bulkProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Reject Selected</>
                )}
              </button>
              <button
                onClick={applyBulkOptimizations}
                disabled={bulkProcessing}
                className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-black hover:bg-emerald-600 active:scale-95 transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
              >
                {bulkProcessing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Optimize Selected Prices
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Suggestions Grid / Table ───────────────────────────────── */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-gray-150 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-150 dark:border-white/5 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base">
            OZO Price Optimization Suggestions ({filteredSuggestions.length})
          </h3>
          <span className="text-xs text-gray-400">Showing opportunities based on vendor discount</span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Analyzing inventory pricing data...</p>
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="font-bold text-gray-800 dark:text-gray-200 text-lg mt-3">All Prices Optimized</h4>
            <p className="text-sm text-gray-400 max-w-sm mx-auto mt-1">
              There are no products with high discounts that haven't been optimized yet!
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-150 dark:border-white/5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="py-4 px-6 text-center w-12">
                    <button 
                      onClick={toggleSelectAll}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                    >
                      {paginatedSuggestions.length > 0 && paginatedSuggestions.every(s => selectedIds.includes(s.id)) ? (
                        <CheckSquare className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-4 px-4">Product</th>
                  <th className="py-4 px-4 text-center">MRP</th>
                  <th className="py-4 px-4 text-center">Mart price</th>
                  <th className="py-4 px-4 text-center">Vendor Discount</th>
                  <th className="py-4 px-6 text-center w-52">Suggested Ozo Price</th>
                  <th className="py-4 px-4 text-center text-emerald-600 dark:text-emerald-400">OZO Margin</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-white/5">
                {paginatedSuggestions.map((item) => {
                  const currentVal = getOzoPriceValue(item)
                  const ozoMargin = currentVal - item.price
                  const isSelected = selectedIds.includes(item.id)

                  return (
                    <tr 
                      key={item.id}
                      className={`group hover:bg-gray-50/50 dark:hover:bg-white/3 transition-colors ${
                        isSelected ? 'bg-emerald-500/5 dark:bg-emerald-500/2' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-6 text-center">
                        <button 
                          onClick={() => toggleSelect(item.id)}
                          className="text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Product Details */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {item.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item.name} 
                              className="w-10 h-10 object-contain rounded-lg border bg-white dark:bg-zinc-800 p-1"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-sm text-gray-800 dark:text-gray-250 block line-clamp-1">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[11px] text-gray-450 dark:text-gray-500 font-semibold">
                                {item.unit}
                              </span>
                              {item.isOptimized && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 rounded border border-emerald-500/20">
                                  Active OZO
                                </span>
                              )}
                              {item.isRejected && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 bg-red-500/10 text-red-500 rounded border border-red-500/20">
                                  Rejected
                                </span>
                              )}
                              {item.unitsSold > 0 ? (
                                <span className="text-[9px] font-black px-1.5 py-0.2 bg-blue-500/10 text-blue-650 dark:text-blue-400 rounded border border-blue-500/20">
                                  Sold: {item.unitsSold} units (Margin: ₹{item.realizedProfit.toFixed(0)})
                                </span>
                              ) : (
                                <span className="text-[9px] font-black px-1.5 py-0.2 bg-gray-500/10 text-gray-500 dark:text-gray-400 rounded border border-gray-200 dark:border-white/5">
                                  No Orders
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* MRP */}
                      <td className="py-4 px-4 text-center font-semibold text-gray-500 line-through text-xs">
                        ₹{item.mrp}
                      </td>

                      {/* Mart Price */}
                      <td className="py-4 px-4 text-center font-bold text-sm text-gray-800 dark:text-gray-200">
                        ₹{item.price}
                      </td>

                      {/* Discount Pct */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/10">
                          <Percent className="w-3 h-3" />
                          {item.discountPct.toFixed(0)}% OFF
                        </span>
                      </td>

                      {/* Suggested Ozo Price Adjuster */}
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center bg-gray-50 dark:bg-[#1a1a1f] border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden max-w-[150px] mx-auto">
                          <button
                            onClick={() => handlePriceAdjust(item.id, -0.5, currentVal, item.price, item.mrp)}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          
                          <div className="flex-1 text-center font-black text-sm text-gray-900 dark:text-white select-none min-w-[50px]">
                            ₹{currentVal.toFixed(1)}
                          </div>
                          
                          <button
                            onClick={() => handlePriceAdjust(item.id, 0.5, currentVal, item.price, item.mrp)}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Potential Profit Margin */}
                      <td className="py-4 px-4 text-center font-black text-sm text-emerald-600 dark:text-emerald-400">
                        +₹{ozoMargin.toFixed(1)}
                      </td>

                      {/* Apply / Reject button */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 ml-auto">
                          {item.isRejected ? (
                            <button
                              onClick={() => applySingleOptimization(item)}
                              disabled={processingId !== null}
                              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg transition-all active:scale-95"
                            >
                              Restore
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => rejectSingleSuggestion(item)}
                                disabled={processingId !== null}
                                className="px-2.5 py-1.5 text-xs font-bold text-red-500 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-all active:scale-95 flex items-center gap-1"
                                title="Reject this suggestion"
                              >
                                {processingId === item.id + '-reject' ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  'Reject'
                                )}
                              </button>
                              
                              <button
                                onClick={() => applySingleOptimization(item)}
                                disabled={processingId !== null}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 text-xs font-bold rounded-lg transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1"
                              >
                                {processingId === item.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    {item.isOptimized ? 'Update' : 'Apply'} <ArrowRight className="w-3 h-3" />
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredSuggestions.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-150 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50 dark:bg-white/2">
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 font-medium flex-wrap">
                <span>
                  Showing <strong className="font-bold text-gray-900 dark:text-white">{Math.min(filteredSuggestions.length, (currentPage - 1) * itemsPerPage + 1)}</strong> to{' '}
                  <strong className="font-bold text-gray-900 dark:text-white">{Math.min(filteredSuggestions.length, currentPage * itemsPerPage)}</strong> of{' '}
                  <strong className="font-bold text-gray-900 dark:text-white">{filteredSuggestions.length}</strong> products
                </span>
                <div className="flex items-center gap-1.5 border-l border-gray-250 dark:border-white/10 pl-4">
                  <span>Per Page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(parseInt(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="bg-transparent text-gray-750 dark:text-gray-250 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="10" className="bg-white dark:bg-zinc-900">10</option>
                    <option value="25" className="bg-white dark:bg-zinc-900">25</option>
                    <option value="50" className="bg-white dark:bg-zinc-900">50</option>
                    <option value="100" className="bg-white dark:bg-zinc-900">100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-wrap justify-center">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Smart page numbers */}
                {(() => {
                  const totalPages = Math.ceil(filteredSuggestions.length / itemsPerPage)
                  const pages = []
                  const maxVisible = 5
                  
                  if (totalPages <= maxVisible) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i)
                  } else {
                    pages.push(1)
                    
                    let start = Math.max(2, currentPage - 1)
                    let end = Math.min(totalPages - 1, currentPage + 1)
                    
                    if (currentPage <= 2) {
                      end = 4
                    }
                    if (currentPage >= totalPages - 1) {
                      start = totalPages - 3
                    }
                    
                    if (start > 2) {
                      pages.push('ellipsis-start')
                    }
                    
                    for (let i = start; i <= end; i++) {
                      pages.push(i)
                    }
                    
                    if (end < totalPages - 1) {
                      pages.push('ellipsis-end')
                    }
                    
                    pages.push(totalPages)
                  }

                  return pages.map((p, idx) => {
                    if (p === 'ellipsis-start' || p === 'ellipsis-end') {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 select-none">
                          ...
                        </span>
                      )
                    }
                    return (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                          currentPage === p
                            ? 'bg-emerald-500 text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  })
                })()}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredSuggestions.length / itemsPerPage), prev + 1))}
                  disabled={currentPage === Math.ceil(filteredSuggestions.length / itemsPerPage)}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  )
}

export default ProfitOptimizer
