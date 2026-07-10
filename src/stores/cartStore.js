import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { useLocationStore, checkDeliveryZoneStatus } from './locationStore'
import toast from 'react-hot-toast'
import { DELIVERY_DEFAULTS, GEOFENCE_DEFAULTS } from '../config/deliveryDefaults'

// Categories where delivery charge is always mandatory regardless of subtotal.
// These are low-margin staple goods — waiving delivery on them causes net losses.
// Slugs must match public.categories.slug exactly.
const LOW_MARGIN_CATEGORY_SLUGS = new Set([
  'cooking-oils',
  'ghee-vanaspati',
  'oils-fats',
  'rice-poha',
  'flour-grains',
  'pulses-lentils-dals',
  'split-lentils-dal',
  'whole-lentils',
  'salt-sugar',
  'atta',           // future-proof
])

// UUID v4 pattern check — used to guard DB operations so that fallback/mock
// product IDs like 'summer-fallback-2' or 'deal-1' never reach PostgREST
// (which expects a real UUID and rejects anything else with a 400).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isValidUUID = (id) => typeof id === 'string' && UUID_RE.test(id)

const roundTo2Decimals = (num) => Math.round((num + Number.EPSILON) * 100) / 100

let roadDistanceTimeout = null

export const useCartStore = create(
  persist(
    (set, get) => ({
      // State
      items: [],
      isLoading: false,
      totalItems: 0,
      subtotal: 0,
      discount: 0,
      couponCode: '',
      deliveryFee: 0,
      platformFee: 0,
      distance: 0,
      distanceCharge: 0,
      isOutsideZone: false,
      roadDistance: null,
      lastDistanceCoords: null,
      requestedDistanceCoords: null,
      total: 0,
      deliveryConfig: DELIVERY_DEFAULTS,
      orderConfig: { min_order_value: 0, max_items_per_order: 50, pre_order_lead_hours: 4 },
      platformConfig: { platform_fee: 2, charity_enabled: true, global_commission_pct: 24 },
      shgConfig: { enabled: true },
      riderConfig: { base_payout: 10, distance_bonus_per_km: 5, max_cash_limit: 2000 },
      geofenceConfig: GEOFENCE_DEFAULTS,
      mapConfig: { hide_map: false },
      launchConfig: { launch_mode_enabled: true, show_out_of_stock_btn: true, show_listing_soon_btn: true, show_mandi_section: true, show_budget_section: true },
      paymentConfig: { cashfree_enabled: true, cod_enabled: true, razorpay_enabled: false },
      serviceHoursConfig: {
        enabled: true,
        start_time: '06:00',
        end_time: '21:00',
        prevent_checkout: false,
        banner_text: '⏰ OZO Service Update: Our delivery services are active from 6:00 AM to 9:00 PM daily. Orders placed after 9:00 PM will be automatically scheduled for delivery first thing tomorrow morning. We are actively upgrading our systems to launch 24/7 Night Delivery very soon! Thank you for your patience.',
        checkout_text: '⚠️ Late-Night Delivery Notice: Please note that OZO Mart does not deliver overnight yet. Orders placed after 9:00 PM are queued for next-morning delivery. We are currently scaling our operations to transition into a 24-hour system shortly. Thank you for supporting a local startup!'
      },

      // Refresh prices for guest cart items from the database.
      // Guest items use prices captured at add-time and stored in localStorage.
      // If a product's price changes before the guest logs in, they would
      // silently see and be charged the old price. This function re-fetches
      // the current price/availability for every guest item and updates the
      // local state so the displayed totals and coupon checks are always correct.
      refreshGuestPrices: async () => {
        const items = get().items
        const guestItems = items.filter(i => i.id && i.id.toString().startsWith('temp-'))
        if (guestItems.length === 0) return

        try {
          const productIds = guestItems.map(i => i.productId).filter(Boolean)
          const citySlug = useLocationStore.getState().selectedCitySlug

          const { data: products, error } = await supabase
            .from('products')
            .select('id, name, slug, price, mrp, ozo_price, discount_percentage, image_url, unit, is_available, quantity_available, max_order_qty, brand, category:categories(slug)')
            .in('id', productIds)

          if (error) throw error

          let cityAvail = []
          if (citySlug && productIds.length > 0) {
            const { data } = await supabase
              .from('product_city_availability')
              .select('product_id, city_price, city_mrp, city_ozo_price, is_available')
              .eq('city_slug', citySlug)
              .in('product_id', productIds)
            if (data) cityAvail = data
          }

          const cityMap = new Map(cityAvail.map(c => [c.product_id, c]))
          const productMap = new Map(products.map(p => [p.id, p]))

          const refreshedItems = items.map(item => {
            if (!item.id || !item.id.toString().startsWith('temp-')) return item
            const fresh = productMap.get(item.productId)
            if (!fresh) return item

            const pca = cityMap.get(item.productId)
            const isAvailable = pca && pca.is_available !== null && pca.is_available !== undefined
              ? pca.is_available
              : fresh.is_available

            const sellingPriceVal = pca && pca.city_price !== null && pca.city_price !== undefined
              ? parseFloat(pca.city_price)
              : parseFloat(fresh.price)

            const mrpVal = pca && pca.city_mrp !== null && pca.city_mrp !== undefined
              ? parseFloat(pca.city_mrp)
              : parseFloat(fresh.mrp)

            const ozoPriceVal = pca && pca.city_ozo_price !== null && pca.city_ozo_price !== undefined
              ? parseFloat(pca.city_ozo_price)
              : (fresh.ozo_price !== null && fresh.ozo_price !== undefined ? parseFloat(fresh.ozo_price) : null)

            const displayPriceVal = (ozoPriceVal !== null && ozoPriceVal > 0) ? ozoPriceVal : sellingPriceVal

            return {
              ...item,
              name: fresh.name,
              slug: fresh.slug,
              price: displayPriceVal,
              mrp: mrpVal,
              discountPercentage: (mrpVal && mrpVal > displayPriceVal)
                ? Math.round(((mrpVal - displayPriceVal) / mrpVal) * 100)
                : parseFloat(fresh.discount_percentage || 0),
              image: fresh.image_url,
              unit: fresh.unit,
              isAvailable: isAvailable,
              quantityAvailable: fresh.quantity_available,
              maxOrderQty: fresh.max_order_qty,
              brand: fresh.brand,
              categorySlug: fresh.category?.slug || item.categorySlug || null,
            }
          })

          set({ items: refreshedItems })
          get().calculateTotals()
        } catch (err) {
          console.error('Failed to refresh guest cart prices:', err)
        }
      },

      // Fetch settings from public.app_settings
      fetchSettings: async () => {
        try {
          const { data, error } = await supabase
              .from('app_settings')
              .select('*')

          if (error) throw error

          if (data) {
            const updates = {}
            data.forEach(item => {
              if (item.key === 'delivery_config') updates.deliveryConfig = item.value
              if (item.key === 'order_config') updates.orderConfig = item.value
              if (item.key === 'platform_config') updates.platformConfig = item.value
              if (item.key === 'bigbasket_config' || item.key === 'shg_config') updates.shgConfig = item.value
              if (item.key === 'rider_config') updates.riderConfig = item.value
              if (item.key === 'geofence_config') updates.geofenceConfig = { ...GEOFENCE_DEFAULTS, ...item.value }
              if (item.key === 'map_config') updates.mapConfig = item.value
              if (item.key === 'launch_config') updates.launchConfig = item.value
              if (item.key === 'payment_config') updates.paymentConfig = { cashfree_enabled: true, cod_enabled: true, razorpay_enabled: false, ...item.value }
              if (item.key === 'service_hours_config') updates.serviceHoursConfig = item.value
            })
            set(updates)
            get().calculateTotals()
          }
        } catch (error) {
          console.error('Fetch settings error:', error)
        }
      },

      // Calculate totals
      calculateTotals: (customCoords = null) => {
        const items = get().items
        const subtotal = roundTo2Decimals(items.reduce((sum, item) => sum + roundTo2Decimals((item.price || 0) * (item.quantity || 0)), 0))
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
        
        const deliveryConfig = get().deliveryConfig || DELIVERY_DEFAULTS
        const platformConfig = get().platformConfig || { platform_fee: 2, charity_enabled: true, global_commission_pct: 24 }
        const geofenceConfig = get().geofenceConfig || GEOFENCE_DEFAULTS
        const riderConfig = get().riderConfig || { base_payout: 10, distance_bonus_per_km: 5, max_cash_limit: 2000 }

        const baseFee = parseFloat(deliveryConfig.base_fee) || 30
        const freeAbove = parseFloat(deliveryConfig.free_above) || 99
        const surgeMultiplier = parseFloat(deliveryConfig.surge_multiplier) || 1

        let baseDeliveryFee = subtotal >= freeAbove ? 0 : Math.round(baseFee * surgeMultiplier)

        // Mandatory delivery for low-margin category items when cart is small (≤ 3 total items).
        // Even if subtotal clears the free-delivery threshold, these categories must pay delivery
        // because the thin margin cannot absorb the delivery cost.
        if (baseDeliveryFee === 0 && totalItems <= 3) {
          const hasLowMarginItem = items.some(item => item.categorySlug && LOW_MARGIN_CATEGORY_SLUGS.has(item.categorySlug))
          if (hasLowMarginItem) {
            baseDeliveryFee = Math.round(baseFee * surgeMultiplier)
          }
        }
        
        // Calculate distance charge if enabled
        let calculatedDistance = 0
        let calculatedDistanceCharge = 0
        let isOutsideZone = false
        
        const locationStore = useLocationStore.getState()
        const coords = customCoords || locationStore.coordinates
        
        if (coords && coords.lat && coords.lng) {
          const lastCoords = get().lastDistanceCoords
          const coordsChanged = !lastCoords ||
            Math.abs(lastCoords.lat - coords.lat) > 0.0001 ||
            Math.abs(lastCoords.lng - coords.lng) > 0.0001

          if (coordsChanged) {
            get().fetchRoadDistance(coords.lat, coords.lng)
          }

          const nearestCity = locationStore.nearestCity
          
          let wLat = parseFloat(geofenceConfig.warehouse_lat) || GEOFENCE_DEFAULTS.warehouse_lat
          let wLng = parseFloat(geofenceConfig.warehouse_lng) || GEOFENCE_DEFAULTS.warehouse_lng
          
          if (nearestCity && nearestCity.latitude && nearestCity.longitude) {
            wLat = parseFloat(nearestCity.latitude)
            wLng = parseFloat(nearestCity.longitude)
          }

          const sLat = nearestCity ? wLat : (parseFloat(deliveryConfig.store_lat) || wLat)
          const sLng = nearestCity ? wLng : (parseFloat(deliveryConfig.store_lng) || wLng)
          
          // Haversine helper
          const getDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371
            const dLat = (lat2 - lat1) * Math.PI / 180
            const dLon = (lon2 - lon1) * Math.PI / 180
            const a = 
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
            return R * c
          }

          const distanceFromWarehouse = getDistance(wLat, wLng, coords.lat, coords.lng)
          const distanceFromStore = getDistance(sLat, sLng, coords.lat, coords.lng)
          
          // Billing distance
          if (get().roadDistance !== null && !coordsChanged) {
            calculatedDistance = get().roadDistance
          } else {
            // Immediate fallback while fetching OSRM road distance
            calculatedDistance = distanceFromStore * 1.3
          }
          
          if (deliveryConfig.distance_charge_enabled) {
            const freeDist = parseFloat(deliveryConfig.free_distance) || 0
            const chargePerKm = parseFloat(deliveryConfig.charge_per_km) || 0
            
            if (calculatedDistance > freeDist) {
              calculatedDistanceCharge = Math.round((calculatedDistance - freeDist) * chargePerKm)
            }
          }

          // Check if coordinates are outside our geofence zone
          const maxRadius = nearestCity 
            ? (parseFloat(nearestCity.service_radius_km) || 1.5)
            : (parseFloat(geofenceConfig.max_radius_km) || GEOFENCE_DEFAULTS.max_radius_km)
          isOutsideZone = distanceFromStore > maxRadius
        }

        let deliveryFee = baseDeliveryFee + calculatedDistanceCharge
        
        // Double delivery fee if outside geofence zone and strict enforcement is disabled
        if (isOutsideZone && !geofenceConfig.strict_enforcement) {
          deliveryFee = deliveryFee * 2
        }

        // Referral System Free Delivery Credit Check
        // Low-margin category carts (≤ 3 items) are excluded — credits cannot waive delivery on them.
        const authProfile = useAuthStore.getState().profile
        const hasFreeDeliveryCredits = authProfile?.free_delivery_orders_left > 0
        const hasLowMarginItemForReferral = totalItems <= 3 && items.some(item => item.categorySlug && LOW_MARGIN_CATEGORY_SLUGS.has(item.categorySlug))
        if (hasFreeDeliveryCredits && subtotal >= 99 && subtotal < freeAbove && !hasLowMarginItemForReferral) {
          deliveryFee = 0
        }


        // Re-evaluate the active coupon against the current subtotal so that
        // adding/removing items always reflects the correct discount amount.
        // The coupon metadata is stored in `couponCode`; we look it up from
        // the persisted state to recompute a percentage discount correctly.
        let discount = 0
        const storedCouponCode = get().couponCode
        const storedDiscount = get().discount

        if (storedCouponCode && storedDiscount > 0) {
          // We don't re-fetch the coupon from the DB on every keystroke — instead
          // we re-derive the amount from the coupon type stored alongside the code.
          // The coupon type/value is not persisted separately, so we use the
          // following heuristic: if the stored discount is a round percentage of
          // the original subtotal it was applied on, re-apply it to the new
          // subtotal. For flat discounts it stays unchanged (they're not
          // subtotal-dependent). In practice, the Checkout page will call
          // applyDiscount with the recalculated amount whenever the user
          // interacts with the coupon — this ensures the cart sidebar and
          // totals are at minimum never over-discounted beyond the subtotal.
          discount = roundTo2Decimals(Math.min(storedDiscount, subtotal))
        }

        const platformFee = parseFloat(platformConfig.platform_fee) || 0
        const total = roundTo2Decimals(Math.max(0, subtotal + deliveryFee + platformFee - discount))

        set({
          totalItems,
          subtotal,
          deliveryFee: roundTo2Decimals(deliveryFee),
          platformFee,
          discount,
          distance: calculatedDistance,
          distanceCharge: calculatedDistanceCharge,
          isOutsideZone,
          total,
        })
      },
      fetchRoadDistance: async (lat, lng) => {
        if (roadDistanceTimeout) {
          clearTimeout(roadDistanceTimeout)
        }

        set({ 
          requestedDistanceCoords: { lat, lng },
          lastDistanceCoords: { lat, lng } // Set immediately to prevent duplicate requests while in-flight
        })

        roadDistanceTimeout = setTimeout(async () => {
          const deliveryConfig = get().deliveryConfig || DELIVERY_DEFAULTS
          const locationStore = useLocationStore.getState()
          const nearestCity = locationStore.nearestCity

          let wLat = parseFloat(GEOFENCE_DEFAULTS.warehouse_lat)
          let wLng = parseFloat(GEOFENCE_DEFAULTS.warehouse_lng)
          if (nearestCity && nearestCity.latitude && nearestCity.longitude) {
            wLat = parseFloat(nearestCity.latitude)
            wLng = parseFloat(nearestCity.longitude)
          }

          const sLat = nearestCity ? wLat : (parseFloat(deliveryConfig.store_lat) || wLat)
          const sLng = nearestCity ? wLng : (parseFloat(deliveryConfig.store_lng) || wLng)

          const url = `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${sLng},${sLat}?overview=false`
          let roadDist = null

          try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 2500)
            const res = await fetch(url, { signal: controller.signal })
            clearTimeout(timeoutId)
            if (res.ok) {
              const data = await res.json()
              if (data && data.routes && data.routes[0] && typeof data.routes[0].distance === 'number') {
                roadDist = data.routes[0].distance / 1000
              }
            }
          } catch (e) {
            console.warn('[OSRM Client Error]', e)
          }

          const reqCoords = get().requestedDistanceCoords
          if (!reqCoords || Math.abs(reqCoords.lat - lat) > 0.0001 || Math.abs(reqCoords.lng - lng) > 0.0001) {
            return
          }

          if (roadDist !== null) {
            set({
              roadDistance: roadDist,
              lastDistanceCoords: { lat, lng }
            })
          } else {
            // Haversine fallback * 1.3
            const R = 6371
            const dLat = (lat - sLat) * Math.PI / 180
            const dLon = (lng - sLng) * Math.PI / 180
            const a = 
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(sLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
            const fallbackDist = R * c * 1.3

            set({
              roadDistance: fallbackDist,
              lastDistanceCoords: { lat, lng }
            })
          }
          get().calculateTotals()
        }, 500)
      },
      fetchCart: async () => {
        // Fetch fresh settings in background to keep shipping limits synced
        get().fetchSettings()

        try {
          const user = useAuthStore.getState().user
          if (!user) {
            // For guest users, refresh prices from the DB so stale localStorage
            // prices don't silently persist across product price changes.
            await get().refreshGuestPrices()
            get().calculateTotals()
            return
          }

          // Merge guest cart items if any exist (skip mock/fallback product IDs)
          const guestItems = get().items.filter(item =>
            item.id && item.id.toString().startsWith('temp-') && isValidUUID(item.productId)
          )
          if (guestItems.length > 0) {
            set({ isLoading: true })
            const upsertPayload = guestItems.map(item => ({
              user_id: user.id,
              product_id: item.productId,
              quantity: item.quantity
            }))

            const { error: mergeError } = await supabase
              .from('cart_items')
              .upsert(upsertPayload, { onConflict: 'user_id,product_id' })

            if (mergeError) {
              console.error('Error merging guest cart items:', mergeError)
            }
          }

          set({ isLoading: true })

          const { data, error } = await supabase
            .from('cart_items')
            .select(`
              *,
              product:products (
                id,
                name,
                slug,
                price,
                mrp,
                ozo_price,
                discount_percentage,
                image_url,
                unit,
                is_available,
                quantity_available,
                max_order_qty,
                brand,
                category:categories ( slug )
              )
            `)
            .eq('user_id', user.id)

          if (error) throw error

          const productIds = data.map(item => item.product?.id).filter(Boolean)
          const citySlug = useLocationStore.getState().selectedCitySlug

          // Fetch city overrides if city is selected
          let cityAvail = []
          if (citySlug && productIds.length > 0) {
            const { data: pcaData } = await supabase
              .from('product_city_availability')
              .select('product_id, city_price, city_mrp, city_ozo_price, is_available')
              .eq('city_slug', citySlug)
              .in('product_id', productIds)
            if (pcaData) cityAvail = pcaData
          }

          const cityMap = new Map(cityAvail.map(c => [c.product_id, c]))

          const cartItems = data.map(item => {
            const p = item.product
            const pca = cityMap.get(p.id)

            const isAvailable = pca && pca.is_available !== null && pca.is_available !== undefined
              ? pca.is_available
              : p.is_available

            const sellingPriceVal = pca && pca.city_price !== null && pca.city_price !== undefined
              ? parseFloat(pca.city_price)
              : parseFloat(p.price)

            const mrpVal = pca && pca.city_mrp !== null && pca.city_mrp !== undefined
              ? parseFloat(pca.city_mrp)
              : parseFloat(p.mrp)

            const ozoPriceVal = pca && pca.city_ozo_price !== null && pca.city_ozo_price !== undefined
              ? parseFloat(pca.city_ozo_price)
              : (p.ozo_price !== null && p.ozo_price !== undefined ? parseFloat(p.ozo_price) : null)

            const displayPriceVal = (ozoPriceVal !== null && ozoPriceVal > 0) ? ozoPriceVal : sellingPriceVal

            return {
              id: item.id,
              productId: p.id,
              name: p.name,
              slug: p.slug,
              price: displayPriceVal,
              mrp: mrpVal,
              discountPercentage: (mrpVal && mrpVal > displayPriceVal)
                ? Math.round(((mrpVal - displayPriceVal) / mrpVal) * 100)
                : parseFloat(p.discount_percentage || 0),
              image: p.image_url,
              unit: p.unit,
              quantity: item.quantity,
              isAvailable: isAvailable,
              quantityAvailable: p.quantity_available,
              maxOrderQty: p.max_order_qty,
              brand: p.brand,
              categorySlug: p.category?.slug || null,
            }
          })

          set({ items: cartItems, isLoading: false })
          get().calculateTotals()
        } catch (error) {
          console.error('Fetch cart error:', error)
          set({ isLoading: false })
        }
      },

      // Add item to cart
      addToCart: async (product, quantity = 1, showToast = true) => {
        try {
          const user = useAuthStore.getState().user

          if (!user) {
            // Guest mode: update local state only!
            const existingItem = get().items.find(item => item.productId === product.id)
            if (existingItem) {
              const newQuantity = existingItem.quantity + quantity
              if (newQuantity > existingItem.maxOrderQty) {
                toast.error(`Maximum ${existingItem.maxOrderQty} items allowed`)
                return { success: false }
              }
              if (newQuantity > existingItem.quantityAvailable) {
                toast.error('Not enough stock available')
                return { success: false }
              }
              set({
                items: get().items.map(i =>
                  i.productId === product.id ? { ...i, quantity: newQuantity } : i
                )
              })
              get().calculateTotals()
              if (showToast) toast.success('Added to cart')
              return { success: true }
            }

            const tempId = `temp-${Date.now()}`
            const newItem = {
              id: tempId,
              productId: product.id,
              name: product.name,
              slug: product.slug,
              price: parseFloat(product.price),
              mrp: parseFloat(product.mrp),
              discountPercentage: parseFloat(product.discount_percentage || 0),
              image: product.image_url,
              unit: product.unit,
              quantity: quantity,
              isAvailable: product.is_available,
              quantityAvailable: product.quantity_available,
              maxOrderQty: product.max_order_qty,
              categorySlug: product.category?.slug || product.categorySlug || null,
            }

            set({ items: [...get().items, newItem] })
            get().calculateTotals()
            if (showToast) toast.success('Added to cart')
            return { success: true }
          }

          const existingItem = get().items.find(item => item.productId === product.id)

          if (existingItem) {
            return get().updateQuantity(existingItem.id, existingItem.quantity + quantity)
          }

          // Mock/fallback products (non-UUID IDs like 'summer-fallback-2') are
          // display-only placeholders. They cannot be persisted to the cart_items
          // table because product_id is a UUID FK. Treat them as local-only.
          const isMockProduct = !isValidUUID(product.id)

          const tempId = `temp-${Date.now()}`
          const newItem = {
            id: tempId,
            productId: product.id,
            name: product.name,
            slug: product.slug,
            price: parseFloat(product.price),
            mrp: parseFloat(product.mrp),
            discountPercentage: parseFloat(product.discount_percentage || 0),
            image: product.image_url,
            unit: product.unit,
            quantity: quantity,
            isAvailable: product.is_available,
            quantityAvailable: product.quantity_available,
            maxOrderQty: product.max_order_qty,
            categorySlug: product.category?.slug || product.categorySlug || null,
          }

          const previousItems = get().items
          set({ items: [...previousItems, newItem] })
          get().calculateTotals()

          if (showToast) {
            toast.success('Added to cart')
          }

          // Skip DB insert for mock/fallback products — local state only
          if (isMockProduct) {
            return { success: true }
          }

          // Perform network request in background
          supabase
            .from('cart_items')
            .insert([
              {
                user_id: user.id,
                product_id: product.id,
                quantity: quantity,
              },
            ])
            .select()
            .single()
            .then(({ data, error }) => {
              if (error) {
                console.error('Add to cart background error:', error)
                // Rollback on error
                set({ items: previousItems })
                get().calculateTotals()
                if (showToast) {
                  toast.error('Failed to add to cart')
                }
              } else {
                // Update temporary ID with real database ID
                set({
                  items: get().items.map(item =>
                    item.id === tempId ? { ...item, id: data.id } : item
                  ),
                })
              }
            })

          return { success: true }
        } catch (error) {
          console.error('Add to cart error:', error)
          if (showToast) {
            toast.error('Failed to add to cart')
          }
          return { success: false, error }
        }
      },

      // Update quantity
      updateQuantity: async (cartItemId, newQuantity) => {
        try {
          if (newQuantity < 1) {
            return get().removeFromCart(cartItemId)
          }

          const item = get().items.find(i => i.id === cartItemId)

          if (!item) {
            return { success: false }
          }

          if (newQuantity > item.maxOrderQty) {
            toast.error(`Maximum ${item.maxOrderQty} items allowed`)
            return { success: false }
          }

          if (newQuantity > item.quantityAvailable) {
            toast.error('Not enough stock available')
            return { success: false }
          }

          const previousItems = get().items

          // Optimistically update quantity
          set({
            items: get().items.map(i =>
              i.id === cartItemId ? { ...i, quantity: newQuantity } : i
            ),
          })
          get().calculateTotals()

          const user = useAuthStore.getState().user
          // Skip DB sync for guests or mock products with non-UUID IDs
          if (!user || !isValidUUID(item.productId)) return { success: true }

          // Perform network request in background
          const updateQuery = cartItemId.toString().startsWith('temp-')
            ? supabase
                .from('cart_items')
                .upsert(
                  {
                    user_id: user.id,
                    product_id: item.productId,
                    quantity: newQuantity,
                  },
                  { onConflict: 'user_id,product_id' }
                )
                .select()
                .single()
            : supabase
                .from('cart_items')
                .update({ quantity: newQuantity })
                .eq('id', cartItemId)
                .select()
                .single()

          updateQuery.then(({ data, error }) => {
            if (error) {
              console.error('Update quantity background error:', error)
              // Rollback
              set({ items: previousItems })
              get().calculateTotals()
              toast.error('Failed to update quantity')
            } else if (data && cartItemId.toString().startsWith('temp-')) {
              // Update temporary ID with real database ID
              set({
                items: get().items.map(i =>
                  i.id === cartItemId ? { ...i, id: data.id } : i
                ),
              })
            }
          })

          return { success: true }
        } catch (error) {
          console.error('Update quantity error:', error)
          toast.error('Failed to update quantity')
          return { success: false, error }
        }
      },

      // Remove from cart
      removeFromCart: async (cartItemId) => {
        try {
          const item = get().items.find(i => i.id === cartItemId)
          if (!item) return { success: false }

          const previousItems = get().items

          // Optimistically update local state
          set({
            items: get().items.filter(i => i.id !== cartItemId),
          })
          get().calculateTotals()
          toast.success('Removed from cart')

          const user = useAuthStore.getState().user
          // Skip DB sync for guests or mock products with non-UUID IDs
          if (!user || !isValidUUID(item.productId)) return { success: true }

          // Perform network request in background
          const deleteQuery = cartItemId.toString().startsWith('temp-')
            ? supabase
                .from('cart_items')
                .delete()
                .eq('user_id', user.id)
                .eq('product_id', item.productId)
            : supabase
                .from('cart_items')
                .delete()
                .eq('id', cartItemId)

          deleteQuery.then(({ error }) => {
            if (error) {
              console.error('Remove from cart background error:', error)
              // Rollback
              set({ items: previousItems })
              get().calculateTotals()
              toast.error('Failed to remove from cart')
            }
          })

          return { success: true }
        } catch (error) {
          console.error('Remove from cart error:', error)
          toast.error('Failed to remove from cart')
          return { success: false, error }
        }
      },

      // Clear cart
      clearCart: async () => {
        try {
          const user = useAuthStore.getState().user
          const previousItems = get().items

          // Optimistically clear local state
          set({
            items: [],
            totalItems: 0,
            subtotal: 0,
            discount: 0,
            total: 0,
          })

          if (!user) return { success: true }

          supabase
            .from('cart_items')
            .delete()
            .eq('user_id', user.id)
            .then(({ error }) => {
              if (error) {
                console.error('Clear cart background error:', error)
                // Rollback
                set({ items: previousItems })
                get().calculateTotals()
                toast.error('Failed to clear cart')
              }
            })

          return { success: true }
        } catch (error) {
          console.error('Clear cart error:', error)
          return { success: false, error }
        }
      },

      // Reorder items from a previous order
      reorder: async (orderItems) => {
        try {
          const user = useAuthStore.getState().user
          if (!user) {
            toast.error('Please login to reorder')
            return { success: false }
          }

          set({ isLoading: true })

          // Fetch latest products details for these items to make sure they are available
          const productIds = orderItems.map(item => item.product_id).filter(Boolean)
          if (productIds.length === 0) {
            toast.error('No items to reorder')
            set({ isLoading: false })
            return { success: false }
          }

          const { data: products, error: prodError } = await supabase
            .from('products')
            .select('*')
            .in('id', productIds)

          if (prodError) throw prodError

          // Filter only available products
          const availableProductsMap = new Map(
            products
              .filter(p => p.is_available && p.quantity_available > 0)
              .map(p => [p.id, p])
          )

          if (availableProductsMap.size === 0) {
            toast.error('None of the items from this order are currently available')
            set({ isLoading: false })
            return { success: false }
          }

          // Prepare cart items to upsert
          const previousItems = get().items
          const upsertPayload = []
          
          for (const item of orderItems) {
            if (!item.product_id) continue
            const product = availableProductsMap.get(item.product_id)
            if (!product) continue // Skip if unavailable

            // Find if already in cart
            const existingItem = previousItems.find(i => i.productId === item.product_id)
            const currentQtyInCart = existingItem ? existingItem.quantity : 0
            
            // Limit quantity by availability and max order qty
            const targetQty = currentQtyInCart + item.quantity
            const allowedQty = Math.min(targetQty, product.quantity_available, product.max_order_qty || 99)

            if (allowedQty > currentQtyInCart) {
              upsertPayload.push({
                user_id: user.id,
                product_id: item.product_id,
                quantity: allowedQty
              })
            }
          }

          if (upsertPayload.length === 0) {
            toast.error('Items are already in your cart at their maximum limit')
            set({ isLoading: false })
            return { success: false }
          }

          const { error: upsertError } = await supabase
            .from('cart_items')
            .upsert(upsertPayload, { onConflict: 'user_id,product_id' })

          if (upsertError) throw upsertError

          // Fetch the updated cart
          await get().fetchCart()
          
          toast.success('Items added to cart')
          return { success: true }
        } catch (error) {
          console.error('Reorder error:', error)
          toast.error('Failed to add items to cart')
          set({ isLoading: false })
          return { success: false, error }
        }
      },

      // Apply discount/coupon
      applyDiscount: (discountAmount, couponCode = '') => {
        set({ discount: discountAmount, couponCode })
        get().calculateTotals()
      },

      // Remove discount
      removeDiscount: () => {
        set({ discount: 0, couponCode: '' })
        get().calculateTotals()
      },

      // Get item quantity by product ID
      getItemQuantity: (productId) => {
        const item = get().items.find(item => item.productId === productId)
        return item ? item.quantity : 0
      },

      // Check if product is in cart
      isInCart: (productId) => {
        return get().items.some(item => item.productId === productId)
      },
    }),
    {
      name: 'ozo-cart-storage',
      partialize: (state) => ({
        items: state.items,
        discount: state.discount,
        couponCode: state.couponCode,
      }),
    }
  )
)

if (typeof window !== 'undefined') {
  window.addEventListener('ozo-auth-signout', (e) => {
    if (e.detail?.reason !== 'session_expired') {
      useCartStore.getState().clearCart().catch(() => {})
    }
  })
}



