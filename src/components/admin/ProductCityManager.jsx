import { useState, useEffect } from 'react'
import { supabaseAdmin as supabase } from '../../lib/supabase'
import { MapPin, Store, Check, Save, Loader2, Info, Star, Plus, Minus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProductCityManager({ productId, productName }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cities, setCities] = useState([])
  const [marts, setMarts] = useState([])
  
  // cityAvailability state: { [citySlug]: { is_available, city_price, city_mrp, is_featured } }
  const [cityAvailability, setCityAvailability] = useState({})
  
  // martInventory state: { [martId]: { stock_quantity, mart_price, mart_mrp } }
  const [martInventory, setMartInventory] = useState({})

  useEffect(() => {
    if (productId) {
      loadData()
    }
  }, [productId])

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Fetch cities and marts
      const [citiesRes, martsRes, pcaRes, miRes] = await Promise.all([
        supabase.from('operating_cities').select('*').eq('is_active', true),
        supabase.from('marts').select('*').eq('is_active', true),
        supabase.from('product_city_availability').select('*').eq('product_id', productId),
        supabase.from('mart_inventory').select('*').eq('product_id', productId)
      ])

      if (citiesRes.error) throw citiesRes.error
      if (martsRes.error) throw martsRes.error
      if (pcaRes.error) throw pcaRes.error
      if (miRes.error) throw miRes.error

      setCities(citiesRes.data || [])
      setMarts(martsRes.data || [])

      // Map City availability
      const cityMap = {}
      // Initialize all active cities as not available by default
      citiesRes.data.forEach(c => {
        cityMap[c.slug] = {
          is_available: false,
          city_price: '',
          city_mrp: '',
          is_featured: false
        }
      })
      // Populate existing mappings
      pcaRes.data.forEach(pca => {
        cityMap[pca.city_slug] = {
          is_available: pca.is_available,
          city_price: pca.city_price || '',
          city_mrp: pca.city_mrp || '',
          is_featured: pca.is_featured || false
        }
      })
      setCityAvailability(cityMap)

      // Map Mart inventory
      const martMap = {}
      // Initialize all active marts with 0 stock by default
      martsRes.data.forEach(m => {
        martMap[m.id] = {
          stock_quantity: 0,
          reserved_quantity: 0,
          mart_price: '',
          mart_mrp: ''
        }
      })
      // Populate existing inventory
      miRes.data.forEach(mi => {
        martMap[mi.mart_id] = {
          stock_quantity: mi.stock_quantity || 0,
          reserved_quantity: mi.reserved_quantity || 0,
          mart_price: mi.mart_price || '',
          mart_mrp: mi.mart_mrp || ''
        }
      })
      setMartInventory(martMap)

    } catch (error) {
      console.error('Error loading product configuration data:', error)
      toast.error('Failed to load availability settings')
    } finally {
      setLoading(false)
    }
  }

  const handleCityToggle = (slug) => {
    setCityAvailability(prev => ({
      ...prev,
      [slug]: {
        ...prev[slug],
        is_available: !prev[slug].is_available
      }
    }))
  }

  const handleCityChange = (slug, field, value) => {
    setCityAvailability(prev => ({
      ...prev,
      [slug]: {
        ...prev[slug],
        [field]: value
      }
    }))
  }

  const handleMartChange = (martId, field, value) => {
    setMartInventory(prev => ({
      ...prev,
      [martId]: {
        ...prev[martId],
        [field]: value
      }
    }))
  }

  const adjustStock = (martId, delta) => {
    const currentStock = parseInt(martInventory[martId]?.stock_quantity || 0)
    const newStock = Math.max(0, currentStock + delta)
    handleMartChange(martId, 'stock_quantity', newStock)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // 1. Save City overrides
      const cityUpdates = Object.entries(cityAvailability).map(([slug, settings]) => ({
        product_id: productId,
        city_slug: slug,
        is_available: settings.is_available,
        city_price: settings.city_price !== '' ? parseFloat(settings.city_price) : null,
        city_mrp: settings.city_mrp !== '' ? parseFloat(settings.city_mrp) : null,
        is_featured: settings.is_featured
      }))

      const { error: cityError } = await supabase
        .from('product_city_availability')
        .upsert(cityUpdates, { onConflict: 'product_id,city_slug' })

      if (cityError) throw cityError

      // 2. Save Mart stocks
      const inventoryUpdates = Object.entries(martInventory).map(([martId, settings]) => ({
        product_id: productId,
        mart_id: martId,
        stock_quantity: parseInt(settings.stock_quantity) || 0,
        mart_price: settings.mart_price !== '' ? parseFloat(settings.mart_price) : null,
        mart_mrp: settings.mart_mrp !== '' ? parseFloat(settings.mart_mrp) : null
      }))

      const { error: invError } = await supabase
        .from('mart_inventory')
        .upsert(inventoryUpdates, { onConflict: 'product_id,mart_id' })

      if (invError) throw invError

      toast.success('Availability and Stock settings saved!')
      loadData()

      // Trigger IndexNow for the product across updated cities
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
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 text-ozo-red animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading inventory mappings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* City Section */}
      <div className="bg-white dark:bg-[#1a1a24] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-premium">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-ozo-red" />
          <h3 className="text-base font-bold text-gray-800 dark:text-white uppercase tracking-wider">
            City Availability & Prices
          </h3>
        </div>
        
        <div className="space-y-4">
          {cities.map(city => {
            const settings = cityAvailability[city.slug] || {
              is_available: false,
              city_price: '',
              city_mrp: '',
              is_featured: false
            }

            return (
              <div 
                key={city.id} 
                className={`p-4 rounded-xl border transition-all ${
                  settings.is_available 
                    ? 'border-ozo-red/20 bg-ozo-red/[0.02] dark:bg-ozo-red/[0.01]' 
                    : 'border-gray-150 dark:border-white/5 bg-gray-50/20 dark:bg-white/[0.005]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Checkbox and City Name */}
                  <label className="flex items-center gap-3 cursor-pointer group select-none">
                    <input
                      type="checkbox"
                      checked={settings.is_available}
                      onChange={() => handleCityToggle(city.slug)}
                      className="w-5 h-5 rounded border-gray-300 text-ozo-red focus:ring-ozo-red"
                    />
                    <div>
                      <span className="font-bold text-sm text-gray-800 dark:text-gray-200 group-hover:text-ozo-red transition-all">
                        {city.name}
                      </span>
                      <p className="text-xs text-gray-400 font-medium capitalize mt-0.5">
                        State: {city.state}
                      </p>
                    </div>
                  </label>

                  {/* Right: Pricing Settings (if enabled) */}
                  {settings.is_available && (
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Price Override */}
                      <div className="w-28">
                        <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1">
                          City Price (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Inherit base"
                          value={settings.city_price}
                          onChange={(e) => handleCityChange(city.slug, 'city_price', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#232330] border border-gray-200 dark:border-white/10 rounded-lg text-xs font-bold focus:outline-none focus:border-ozo-red"
                        />
                      </div>

                      {/* MRP Override */}
                      <div className="w-28">
                        <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1">
                          City MRP (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Inherit base"
                          value={settings.city_mrp}
                          onChange={(e) => handleCityChange(city.slug, 'city_mrp', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-[#232330] border border-gray-200 dark:border-white/10 rounded-lg text-xs font-bold focus:outline-none focus:border-ozo-red"
                        />
                      </div>

                      {/* Featured Checkbox */}
                      <label className="flex items-center gap-1.5 mt-4 cursor-pointer select-none bg-gray-50 dark:bg-white/5 border border-gray-150 dark:border-white/5 px-2.5 py-1.5 rounded-lg">
                        <input
                          type="checkbox"
                          checked={settings.is_featured}
                          onChange={(e) => handleCityChange(city.slug, 'is_featured', e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-ozo-red focus:ring-ozo-red"
                        />
                        <Star className={`w-3.5 h-3.5 ${settings.is_featured ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} />
                        <span className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-350">
                          Featured
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Mart Stock Section */}
      <div className="bg-white dark:bg-[#1a1a24] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-premium">
        <div className="flex items-center gap-2 mb-4">
          <Store className="w-5 h-5 text-ozo-red" />
          <h3 className="text-base font-bold text-gray-800 dark:text-white uppercase tracking-wider">
            Dark Store / Mart Stock Levels
          </h3>
        </div>

        <div className="space-y-4">
          {marts.map(mart => {
            const settings = martInventory[mart.id] || {
              stock_quantity: 0,
              reserved_quantity: 0,
              mart_price: '',
              mart_mrp: ''
            }

            return (
              <div 
                key={mart.id} 
                className="p-4 rounded-xl border border-gray-150 dark:border-white/5 bg-gray-50/20 dark:bg-white/[0.005]"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Mart Info */}
                  <div>
                    <span className="font-bold text-sm text-gray-800 dark:text-gray-200">
                      {mart.name}
                    </span>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                      Service Radius: {mart.service_radius_km} km
                    </p>
                  </div>

                  {/* Right: Stock Control & Mart-specific pricing */}
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Price & MRP overrides */}
                    <div className="w-24">
                      <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1">
                        Mart Price (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Inherit city"
                        value={settings.mart_price}
                        onChange={(e) => handleMartChange(mart.id, 'mart_price', e.target.value)}
                        className="w-full px-2 py-1 bg-white dark:bg-[#232330] border border-gray-200 dark:border-white/10 rounded-lg text-xs font-bold focus:outline-none focus:border-ozo-red"
                      />
                    </div>

                    <div className="w-24">
                      <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1">
                        Mart MRP (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Inherit city"
                        value={settings.mart_mrp}
                        onChange={(e) => handleMartChange(mart.id, 'mart_mrp', e.target.value)}
                        className="w-full px-2 py-1 bg-white dark:bg-[#232330] border border-gray-200 dark:border-white/10 rounded-lg text-xs font-bold focus:outline-none focus:border-ozo-red"
                      />
                    </div>

                    {/* Stock Counter */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1">
                        Stock Quantity
                      </label>
                      <div className="flex items-center bg-white dark:bg-[#232330] border border-gray-200 dark:border-white/10 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => adjustStock(mart.id, -10)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded text-gray-500 hover:text-ozo-red transition-all"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          value={settings.stock_quantity}
                          onChange={(e) => handleMartChange(mart.id, 'stock_quantity', parseInt(e.target.value) || 0)}
                          className="w-14 text-center bg-transparent border-none outline-none font-black text-xs text-gray-800 dark:text-gray-150 focus:ring-0 p-0"
                        />
                        <button
                          type="button"
                          onClick={() => adjustStock(mart.id, 10)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded text-gray-500 hover:text-emerald-500 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Reserved stock info */}
                    {settings.reserved_quantity > 0 && (
                      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Reserved: {settings.reserved_quantity}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-ozo text-white font-bold rounded-xl shadow-premium hover:shadow-premium-hover hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 text-sm uppercase tracking-wider"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving Settings...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Configurations
            </>
          )}
        </button>
      </div>
    </div>
  )
}
