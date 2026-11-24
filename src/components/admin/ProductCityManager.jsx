import { useState, useEffect } from 'react'
import { supabaseAdmin as supabase } from '../../lib/supabase'
import { 
  MapPin, 
  Store, 
  Check, 
  Save, 
  Loader2, 
  Info, 
  Star, 
  Plus, 
  Minus, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Layers,
  Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProductCityManager({ productId, productName, onSaveSuccess }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState(null)
  
  // Base product data from database
  const [baseProduct, setBaseProduct] = useState(null)
  const [cities, setCities] = useState([])
  const [marts, setMarts] = useState([])
  
  // cityAvailability state:
  // { [citySlug]: { is_assigned: boolean, is_available: boolean, city_price: string, city_mrp: string, city_ozo_price: string, is_featured: boolean, is_upcoming: boolean, id: string|null } }
  const [cityAvailability, setCityAvailability] = useState({})
  
  // martInventory state:
  // { [martId]: { stock_quantity: number, reserved_quantity: number, mart_price: string, mart_mrp: string } }
  const [martInventory, setMartInventory] = useState({})

  useEffect(() => {
    if (productId) {
      loadData()
    }
  }, [productId])

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Fetch base product, operating cities, active marts, PCA rows, and mart inventory
      const [prodRes, citiesRes, martsRes, pcaRes, miRes] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, slug, price, mrp, ozo_price, is_available, is_upcoming, unit, brand')
          .eq('id', productId)
          .single(),
        supabase
          .from('operating_cities')
          .select('id, name, slug, code, state, is_active')
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase
          .from('marts')
          .select('id, name, slug, city_slug, is_active, address')
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase
          .from('product_city_availability')
          .select('*')
          .eq('product_id', productId),
        supabase
          .from('mart_inventory')
          .select('*')
          .eq('product_id', productId)
      ])

      if (prodRes.error && prodRes.error.code !== 'PGRST116') {
        console.warn('Product base fetch note:', prodRes.error)
      }
      if (citiesRes.error) throw citiesRes.error
      if (martsRes.error) throw martsRes.error
      if (pcaRes.error) throw pcaRes.error
      if (miRes.error) throw miRes.error

      setBaseProduct(prodRes.data || null)
      const activeCities = citiesRes.data || []
      const activeMarts = martsRes.data || []
      setCities(activeCities)
      setMarts(activeMarts)

      const existingPcaList = pcaRes.data || []
      const existingMiList = miRes.data || []

      // Map City availability
      const cityMap = {}
      activeCities.forEach(city => {
        const foundPca = existingPcaList.find(p => p.city_slug === city.slug)
        if (foundPca) {
          // Explicitly configured in database
          cityMap[city.slug] = {
            is_assigned: true,
            is_available: foundPca.is_available === true,
            city_price: foundPca.city_price !== null && foundPca.city_price !== undefined ? String(foundPca.city_price) : '',
            city_mrp: foundPca.city_mrp !== null && foundPca.city_mrp !== undefined ? String(foundPca.city_mrp) : '',
            city_ozo_price: foundPca.city_ozo_price !== null && foundPca.city_ozo_price !== undefined ? String(foundPca.city_ozo_price) : '',
            is_featured: !!foundPca.is_featured,
            is_upcoming: !!foundPca.is_upcoming,
            id: foundPca.id
          }
        } else {
          // Not yet configured in this city
          cityMap[city.slug] = {
            is_assigned: false,
            is_available: false,
            city_price: '',
            city_mrp: '',
            city_ozo_price: '',
            is_featured: false,
            is_upcoming: false,
            id: null
          }
        }
      })
      setCityAvailability(cityMap)

      // Map Mart inventory
      const martMap = {}
      activeMarts.forEach(mart => {
        const foundMi = existingMiList.find(mi => mi.mart_id === mart.id)
        if (foundMi) {
          martMap[mart.id] = {
            stock_quantity: foundMi.stock_quantity ?? 0,
            reserved_quantity: foundMi.reserved_quantity ?? 0,
            mart_price: foundMi.mart_price !== null && foundMi.mart_price !== undefined ? String(foundMi.mart_price) : '',
            mart_mrp: foundMi.mart_mrp !== null && foundMi.mart_mrp !== undefined ? String(foundMi.mart_mrp) : ''
          }
        } else {
          martMap[mart.id] = {
            stock_quantity: 0,
            reserved_quantity: 0,
            mart_price: '',
            mart_mrp: ''
          }
        }
      })
      setMartInventory(martMap)
      setLastRefreshed(new Date().toLocaleTimeString())

    } catch (error) {
      console.error('Error loading product configuration data:', error)
      toast.error('Failed to load availability settings from database')
    } finally {
      setLoading(false)
    }
  }

  // Toggle city assignment (Include in City Catalog or not)
  const handleToggleCityAssignment = (citySlug) => {
    setCityAvailability(prev => {
      const current = prev[citySlug] || {}
      const nextAssigned = !current.is_assigned
      return {
        ...prev,
        [citySlug]: {
          ...current,
          is_assigned: nextAssigned,
          // When turning on, default to In Stock (true); when turning off, false
          is_available: nextAssigned ? true : false
        }
      }
    })
  }

  // Toggle Stock Status (In Stock vs Out of Stock) for an assigned city
  const handleToggleCityStock = (citySlug) => {
    setCityAvailability(prev => {
      const current = prev[citySlug] || {}
      return {
        ...prev,
        [citySlug]: {
          ...current,
          is_available: !current.is_available
        }
      }
    })
  }

  const handleCityFieldChange = (citySlug, field, value) => {
    setCityAvailability(prev => ({
      ...prev,
      [citySlug]: {
        ...prev[citySlug],
        [field]: value
      }
    }))
  }

  const handleMartFieldChange = (martId, field, value) => {
    setMartInventory(prev => ({
      ...prev,
      [martId]: {
        ...prev[martId],
        [field]: value
      }
    }))
  }

  const adjustMartStock = (martId, delta) => {
    const currentStock = parseInt(martInventory[martId]?.stock_quantity || 0)
    const newStock = Math.max(0, currentStock + delta)
    handleMartFieldChange(martId, 'stock_quantity', newStock)
  }

  // Quick Action: Enable in all cities with In Stock
  const handleEnableAllCitiesInStock = () => {
    setCityAvailability(prev => {
      const updated = { ...prev }
      cities.forEach(c => {
        updated[c.slug] = {
          ...updated[c.slug],
          is_assigned: true,
          is_available: true
        }
      })
      return updated
    })
    toast.success('All cities enabled as In Stock (Click Save to persist)')
  }

  // Quick Action: Mark all assigned cities Out of Stock
  const handleMarkAllCitiesOutOfStock = () => {
    setCityAvailability(prev => {
      const updated = { ...prev }
      cities.forEach(c => {
        if (updated[c.slug]?.is_assigned) {
          updated[c.slug] = {
            ...updated[c.slug],
            is_available: false
          }
        }
      })
      return updated
    })
    toast.success('All assigned cities marked Out of Stock (Click Save to persist)')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const citiesToUpsert = []
      const citiesToDelete = []

      Object.entries(cityAvailability).forEach(([slug, settings]) => {
        if (settings.is_assigned) {
          citiesToUpsert.push({
            product_id: productId,
            city_slug: slug,
            is_available: settings.is_available === true,
            city_price: settings.city_price !== '' && !isNaN(parseFloat(settings.city_price)) 
              ? parseFloat(settings.city_price) 
              : null,
            city_mrp: settings.city_mrp !== '' && !isNaN(parseFloat(settings.city_mrp)) 
              ? parseFloat(settings.city_mrp) 
              : null,
            city_ozo_price: settings.city_ozo_price !== '' && !isNaN(parseFloat(settings.city_ozo_price)) 
              ? parseFloat(settings.city_ozo_price) 
              : null,
            is_featured: !!settings.is_featured,
            is_upcoming: !!settings.is_upcoming,
            updated_at: new Date().toISOString()
          })
        } else {
          // If explicitly unassigned, we remove its row so it doesn't leak into that city's catalog
          citiesToDelete.push(slug)
        }
      })

      // 1. Upsert assigned city availability rows
      if (citiesToUpsert.length > 0) {
        const { error: upsertErr } = await supabase
          .from('product_city_availability')
          .upsert(citiesToUpsert, { onConflict: 'product_id,city_slug' })

        if (upsertErr) throw upsertErr
      }

      // 2. Delete unassigned cities from product_city_availability
      if (citiesToDelete.length > 0) {
        const { error: deleteErr } = await supabase
          .from('product_city_availability')
          .delete()
          .eq('product_id', productId)
          .in('city_slug', citiesToDelete)

        if (deleteErr) {
          console.warn('Note deleting unassigned cities:', deleteErr)
        }
      }

      // 3. Save Mart stocks
      const inventoryUpdates = Object.entries(martInventory).map(([martId, settings]) => ({
        product_id: productId,
        mart_id: martId,
        stock_quantity: parseInt(settings.stock_quantity) || 0,
        mart_price: settings.mart_price !== '' && !isNaN(parseFloat(settings.mart_price)) 
          ? parseFloat(settings.mart_price) 
          : null,
        mart_mrp: settings.mart_mrp !== '' && !isNaN(parseFloat(settings.mart_mrp)) 
          ? parseFloat(settings.mart_mrp) 
          : null,
        updated_at: new Date().toISOString()
      }))

      if (inventoryUpdates.length > 0) {
        const { error: invError } = await supabase
          .from('mart_inventory')
          .upsert(inventoryUpdates, { onConflict: 'product_id,mart_id' })

        if (invError) throw invError
      }

      toast.success('Live database updated! City availability & stocks verified.')
      await loadData()
      if (onSaveSuccess) {
        onSaveSuccess()
      }

      // Async IndexNow notification
      try {
        const { data: prodData } = await supabase
          .from('products')
          .select('slug')
          .eq('id', productId)
          .single()
        if (prodData?.slug) {
          fetch('/api/index-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productSlug: prodData.slug })
          }).catch(err => console.warn('Async IndexNow ping failed:', err))
        }
      } catch (e) {}

    } catch (error) {
      console.error('Save settings error:', error)
      toast.error('Failed to save settings: ' + (error.message || 'Unknown database error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="w-9 h-9 text-ozo-red animate-spin" />
        <p className="text-sm text-gray-500 font-semibold tracking-wide">
          Verifying live database city mappings...
        </p>
      </div>
    )
  }

  // Summary counts
  const assignedCount = Object.values(cityAvailability).filter(c => c.is_assigned).length
  const inStockCount = Object.values(cityAvailability).filter(c => c.is_assigned && c.is_available).length
  const outOfStockCount = Object.values(cityAvailability).filter(c => c.is_assigned && !c.is_available).length

  return (
    <div className="space-y-6">
      {/* 1. MASTER STATUS & SUMMARY BANNER */}
      <div className="bg-white dark:bg-[#1a1a24] rounded-2xl p-5 border border-gray-150 dark:border-white/10 shadow-premium">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-ozo-red/10 text-ozo-red">
                <MapPin className="w-4 h-4" />
              </span>
              <h3 className="text-base font-extrabold text-gray-900 dark:text-white tracking-wide">
                Live City Availability & Inventory
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Direct live sync with <code className="text-ozo-red font-mono font-bold">product_city_availability</code> & <code className="text-ozo-red font-mono font-bold">mart_inventory</code>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 text-xs font-bold transition-all cursor-pointer"
              title="Refresh live data from database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Verify Live Sync</span>
              {lastRefreshed && (
                <span className="text-[10px] text-gray-400 font-mono ml-0.5">({lastRefreshed})</span>
              )}
            </button>
          </div>
        </div>

        {/* Global Reference Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-1">
          <div className="bg-gray-50/80 dark:bg-white/[0.03] p-3 rounded-xl border border-gray-150 dark:border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
              Global Master
            </span>
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <span className={`w-2 h-2 rounded-full ${baseProduct?.is_available ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className={baseProduct?.is_available ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>
                {baseProduct?.is_available ? 'Master Active' : 'Master Inactive'}
              </span>
            </div>
          </div>

          <div className="bg-gray-50/80 dark:bg-white/[0.03] p-3 rounded-xl border border-gray-150 dark:border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
              Base Selling Price
            </span>
            <span className="font-extrabold text-xs text-gray-800 dark:text-white">
              ₹{baseProduct?.price ? parseFloat(baseProduct.price).toFixed(2) : '0.00'}
            </span>
            <span className="text-[10px] text-gray-400 ml-1">
              (MRP: ₹{baseProduct?.mrp ? parseFloat(baseProduct.mrp).toFixed(2) : '0.00'})
            </span>
          </div>

          <div className="bg-gray-50/80 dark:bg-white/[0.03] p-3 rounded-xl border border-gray-150 dark:border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
              Active in Cities
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xs text-gray-800 dark:text-white">
                {assignedCount} / {cities.length}
              </span>
              <span className="text-[10px] text-gray-400">cities</span>
            </div>
          </div>

          <div className="bg-gray-50/80 dark:bg-white/[0.03] p-3 rounded-xl border border-gray-150 dark:border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
              Stock Health
            </span>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {inStockCount} In
              </span>
              <span className="text-red-500 flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {outOfStockCount} Out
              </span>
            </div>
          </div>
        </div>

        {/* Quick Bulk Actions */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-white/5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mr-1">
            Quick Actions:
          </span>
          <button
            type="button"
            onClick={handleEnableAllCitiesInStock}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/40 transition-all cursor-pointer flex items-center gap-1"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Enable in All Cities (In Stock)
          </button>
          <button
            type="button"
            onClick={handleMarkAllCitiesOutOfStock}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/40 transition-all cursor-pointer flex items-center gap-1"
          >
            <XCircle className="w-3 h-3 text-red-500" />
            Mark Out of Stock Everywhere
          </button>
        </div>
      </div>

      {/* 2. PER-CITY CARDS WITH EMBEDDED MARTS */}
      <div className="space-y-4">
        {cities.map(city => {
          const settings = cityAvailability[city.slug] || {
            is_assigned: false,
            is_available: false,
            city_price: '',
            city_mrp: '',
            city_ozo_price: '',
            is_featured: false,
            is_upcoming: false
          }

          // Marts belonging directly to this city
          const cityMarts = marts.filter(m => m.city_slug === city.slug)

          return (
            <div 
              key={city.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                settings.is_assigned 
                  ? settings.is_available
                    ? 'border-emerald-300/60 dark:border-emerald-500/30 bg-white dark:bg-[#1a1a24] shadow-sm'
                    : 'border-red-300/60 dark:border-red-500/30 bg-white dark:bg-[#1a1a24] shadow-sm'
                  : 'border-gray-200 dark:border-white/10 bg-gray-50/40 dark:bg-white/[0.01]'
              }`}
            >
              {/* City Card Header */}
              <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-start sm:items-center gap-3">
                  {/* Assignment Checkbox / Toggle */}
                  <div className="pt-0.5 sm:pt-0">
                    <input
                      type="checkbox"
                      id={`city-assign-${city.slug}`}
                      checked={settings.is_assigned}
                      onChange={() => handleToggleCityAssignment(city.slug)}
                      className="w-5 h-5 rounded border-gray-300 text-ozo-red focus:ring-ozo-red cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label 
                        htmlFor={`city-assign-${city.slug}`}
                        className="font-bold text-sm text-gray-900 dark:text-white cursor-pointer hover:text-ozo-red transition-colors flex items-center gap-1.5"
                      >
                        <span>{city.name}</span>
                        {city.code && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" title={`City Code: ${city.code}`}>
                            [{city.code}]
                          </span>
                        )}
                      </label>
                      <span className="text-[10px] font-semibold text-gray-400 capitalize px-2 py-0.5 rounded bg-gray-100 dark:bg-white/5">
                        State: {city.state}
                      </span>

                      {/* City Status Pill */}
                      {settings.is_assigned ? (
                        settings.is_available ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50 uppercase tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live & In Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-700/50 uppercase tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Out of Stock
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400 border border-gray-200 dark:border-white/10 uppercase tracking-wide">
                          Not Added to City
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {settings.is_assigned 
                        ? `Configured in ${city.name} catalogue`
                        : `Check the box to make this product available in ${city.name}`
                      }
                    </p>
                  </div>
                </div>

                {/* Stock Switch Buttons (When City is Assigned) */}
                {settings.is_assigned && (
                  <div className="flex items-center gap-2 self-start md:self-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mr-1 hidden sm:inline">
                      Stock:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCityFieldChange(city.slug, 'is_available', true)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        settings.is_available
                          ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/20'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      IN STOCK
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCityFieldChange(city.slug, 'is_available', false)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        !settings.is_available
                          ? 'bg-red-500 text-white shadow-sm ring-2 ring-red-500/20'
                          : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      OUT OF STOCK
                    </button>
                  </div>
                )}
              </div>

              {/* City Settings Body (Only rendered if Assigned) */}
              {settings.is_assigned ? (
                <div className="p-4 sm:p-5 space-y-5 bg-white dark:bg-[#1a1a24]">
                  {/* City Price & MRP Overrides */}
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-ozo-red" />
                      City Pricing & Badges (Optional Overrides)
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* City Selling Price */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            City Price (₹)
                          </label>
                          <span className="text-[10px] text-gray-400">
                            Base: ₹{baseProduct?.price || '0'}
                          </span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          placeholder={baseProduct?.price ? `Inherit (₹${baseProduct.price})` : 'Inherit base'}
                          value={settings.city_price}
                          onChange={(e) => handleCityFieldChange(city.slug, 'city_price', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50/50 dark:bg-[#232330] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-800 dark:text-white focus:outline-none focus:border-ozo-red focus:bg-white dark:focus:bg-[#232330] transition-colors"
                        />
                      </div>

                      {/* City MRP */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            City MRP (₹)
                          </label>
                          <span className="text-[10px] text-gray-400">
                            Base: ₹{baseProduct?.mrp || '0'}
                          </span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          placeholder={baseProduct?.mrp ? `Inherit (₹${baseProduct.mrp})` : 'Inherit base'}
                          value={settings.city_mrp}
                          onChange={(e) => handleCityFieldChange(city.slug, 'city_mrp', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50/50 dark:bg-[#232330] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-800 dark:text-white focus:outline-none focus:border-ozo-red focus:bg-white dark:focus:bg-[#232330] transition-colors"
                        />
                      </div>

                      {/* Featured in City Checkbox */}
                      <div className="flex items-end">
                        <label className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-[#232330] cursor-pointer hover:border-gray-300 transition-colors select-none">
                          <div className="flex items-center gap-1.5">
                            <Star className={`w-4 h-4 ${settings.is_featured ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} />
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                              Featured in {city.name.split(',')[0]}
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={settings.is_featured}
                            onChange={(e) => handleCityFieldChange(city.slug, 'is_featured', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-ozo-red focus:ring-ozo-red cursor-pointer"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Dark Stores / Marts in this City */}
                  <div className="pt-3 border-t border-gray-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-ozo-red" />
                        Dark Stores & Mart Stocks in {city.name}
                      </h4>
                      <span className="text-[10px] text-gray-400 font-medium">
                        {cityMarts.length} {cityMarts.length === 1 ? 'store' : 'stores'} registered
                      </span>
                    </div>

                    {cityMarts.length === 0 ? (
                      <div className="p-3 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-dashed border-gray-200 dark:border-white/10 text-center">
                        <p className="text-xs text-gray-400 font-medium">
                          No active dark stores registered for {city.name} yet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {cityMarts.map(mart => {
                          const martSettings = martInventory[mart.id] || {
                            stock_quantity: 0,
                            reserved_quantity: 0,
                            mart_price: '',
                            mart_mrp: ''
                          }

                          return (
                            <div 
                              key={mart.id}
                              className="p-3 rounded-xl border border-gray-150 dark:border-white/5 bg-gray-50/40 dark:bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div>
                                <span className="font-bold text-xs text-gray-800 dark:text-gray-200 block">
                                  {mart.name}
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium">
                                  {mart.address ? mart.address.split(',')[0] : 'Dark Store Hub'}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-3">
                                {/* Mart Stock Counter */}
                                <div>
                                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                                    Inventory Stock
                                  </label>
                                  <div className="flex items-center bg-white dark:bg-[#232330] border border-gray-200 dark:border-white/10 rounded-lg p-0.5">
                                    <button
                                      type="button"
                                      onClick={() => adjustMartStock(mart.id, -10)}
                                      className="px-1.5 py-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded text-[10px] font-bold text-gray-500 hover:text-red-500 transition-colors"
                                      title="Subtract 10"
                                    >
                                      -10
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => adjustMartStock(mart.id, -1)}
                                      className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded text-gray-500 hover:text-red-500 transition-colors"
                                      title="Subtract 1"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <input
                                      type="number"
                                      value={martSettings.stock_quantity}
                                      onChange={(e) => handleMartFieldChange(mart.id, 'stock_quantity', Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-12 text-center bg-transparent border-none outline-none font-extrabold text-xs text-gray-900 dark:text-white focus:ring-0 p-0"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => adjustMartStock(mart.id, 1)}
                                      className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded text-gray-500 hover:text-emerald-500 transition-colors"
                                      title="Add 1"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => adjustMartStock(mart.id, 10)}
                                      className="px-1.5 py-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded text-[10px] font-bold text-gray-500 hover:text-emerald-500 transition-colors"
                                      title="Add 10"
                                    >
                                      +10
                                    </button>
                                  </div>
                                </div>

                                {/* Mart Price Override (Optional) */}
                                <div className="w-24">
                                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                                    Mart Price (₹)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Inherit city"
                                    value={martSettings.mart_price}
                                    onChange={(e) => handleMartFieldChange(mart.id, 'mart_price', e.target.value)}
                                    className="w-full px-2 py-1 bg-white dark:bg-[#232330] border border-gray-200 dark:border-white/10 rounded-lg text-xs font-bold focus:outline-none focus:border-ozo-red"
                                  />
                                </div>

                                {martSettings.reserved_quantity > 0 && (
                                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                                    <Info className="w-3 h-3" />
                                    Res: {martSettings.reserved_quantity}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50/50 dark:bg-white/[0.01] flex items-center justify-between text-xs text-gray-400">
                  <span className="italic">
                    This product is not active in {city.name}. Customers in this city cannot see or purchase it.
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleCityAssignment(city.slug)}
                    className="text-ozo-red font-bold hover:underline cursor-pointer ml-2 whitespace-nowrap"
                  >
                    + Add to {city.name.split(',')[0]}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 3. SAVE BUTTON */}
      <div className="sticky bottom-0 bg-white/95 dark:bg-[#1a1a24]/95 backdrop-blur-md p-4 rounded-2xl border border-gray-150 dark:border-white/10 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Real-time Supabase sync: Updates <code className="font-mono text-gray-700 dark:text-gray-300">product_city_availability</code></span>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-gradient-ozo text-white font-extrabold rounded-xl shadow-premium hover:shadow-premium-hover hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 text-xs uppercase tracking-wider cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving to Database...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Configurations & Stocks
            </>
          )}
        </button>
      </div>
    </div>
  )
}
