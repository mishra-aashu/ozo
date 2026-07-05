import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// HMAC-SHA256 signature verification helper
async function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const secretKeyData = encoder.encode(secret);
    
    const key = await crypto.subtle.importKey(
      "raw",
      secretKeyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const payloadData = encoder.encode(`${orderId}|${paymentId}`);
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      payloadData
    );
    
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const generatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return generatedSignature === signature;
  } catch (err) {
    console.error('Signature calculation error:', err);
    return false;
  }
}

// Server-side calculation of the expected amount based on DB state
async function calculateExpectedAmount(
  supabaseAdmin: any, 
  userId: string, 
  addressId?: string, 
  couponCode?: string,
  martId?: string
): Promise<{ subtotal: number, deliveryFee: number, discountAmount: number, platformFee: number, total: number }> {
  
  // 1. Fetch address first if addressId is provided (needed for city-specific pricing and delivery fee)
  let address: any = null
  let citySlug = 'aurangabad-bihar'
  
  if (addressId) {
    const { data: addrData, error: addressError } = await supabaseAdmin
      .from('addresses')
      .select('*')
      .eq('id', addressId)
      .eq('user_id', userId)
      .maybeSingle()

    if (addressError) {
      throw new Error(`Address retrieval failed: ${addressError.message}`)
    }
    address = addrData

    if (address && address.city) {
      // Find matching active city slug in operating_cities
      const { data: cities } = await supabaseAdmin
        .from('operating_cities')
        .select('slug, name')
        .eq('is_active', true)
      
      if (cities && cities.length > 0) {
        const cleanInput = address.city.toLowerCase().replace(/[^a-z0-9]/g, '').trim()
        const matchedCity = cities.find((c: any) => {
          const cleanName = c.name.toLowerCase().replace(/[^a-z0-9]/g, '').trim()
          const cleanSlug = c.slug.toLowerCase().replace(/[^a-z0-9]/g, '').trim()
          return cleanName === cleanInput || cleanName.includes(cleanInput) || cleanInput.includes(cleanName) || cleanSlug === cleanInput
        })
        if (matchedCity) {
          citySlug = matchedCity.slug
        }
      }
    }
  }

  // 2. Fetch cart items
  const { data: cartItems, error: cartError } = await supabaseAdmin
    .from('cart_items')
    .select('quantity, product_id')
    .eq('user_id', userId)

  if (cartError) {
    throw new Error(`Cart retrieval failed: ${cartError.message}`);
  }
  if (!cartItems || cartItems.length === 0) {
    throw new Error('Cart is empty or could not be retrieved');
  }

  // 3. Fetch product details
  const productIds = cartItems.map((item: any) => item.product_id)
  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id, name, price, mrp, ozo_price, is_available, quantity_available, max_order_qty, min_order_qty')
    .in('id', productIds)

  if (productsError) {
    throw new Error(`Products retrieval failed: ${productsError.message}`);
  }
  if (!products || products.length === 0) {
    throw new Error('Failed to retrieve product details');
  }

  // 4. Fetch mart overrides OR city overrides
  let resolvedMartId = martId
  if (!resolvedMartId && address) {
    const lat = parseFloat(address.latitude)
    const lng = parseFloat(address.longitude)
    if (!isNaN(lat) && !isNaN(lng)) {
      const rpcItems = cartItems.map((item: any) => ({
        product_id: item.product_id,
        quantity: item.quantity
      }))
      const { data: optMartId, error: optMartError } = await supabaseAdmin.rpc('find_optimal_mart', {
        p_latitude: lat,
        p_longitude: lng,
        p_items: rpcItems
      })
      if (!optMartError && optMartId) {
        resolvedMartId = optMartId
      }
    }
  }

  let martOverrides: any[] = []
  if (resolvedMartId && productIds.length > 0) {
    const { data: miData, error: miError } = await supabaseAdmin
      .from('mart_inventory')
      .select('product_id, mart_price, customer_price, stock_quantity, is_available')
      .eq('mart_id', resolvedMartId)
      .in('product_id', productIds)
    if (!miError && miData) {
      martOverrides = miData
    }
  }

  let cityOverrides: any[] = []
  if (!resolvedMartId && citySlug) {
    const { data: pcaData, error: pcaError } = await supabaseAdmin
      .from('product_city_availability')
      .select('product_id, is_available, city_price, city_mrp, city_ozo_price')
      .in('product_id', productIds)
      .eq('city_slug', citySlug)
    if (!pcaError && pcaData) {
      cityOverrides = pcaData
    }
  }

  // 5. Compute subtotal with overrides
  let subtotal = 0
  for (const item of cartItems) {
    const product = products.find((p: any) => p.id === item.product_id)
    if (!product) {
      throw new Error(`Product not found in database.`);
    }

    // Resolve overrides
    const martOverride = martOverrides.find((m: any) => m.product_id === product.id)
    const override = cityOverrides.find((o: any) => o.product_id === product.id)
    
    let isAvailable = product.is_available
    let originalMartPrice = parseFloat(product.price || 0)
    let baseOzoPrice = product.ozo_price !== null && product.ozo_price !== undefined ? parseFloat(product.ozo_price) : null
    let stockQuantity = product.quantity_available

    if (martOverride) {
      if (martOverride.is_available !== null && martOverride.is_available !== undefined) {
        isAvailable = martOverride.is_available && martOverride.stock_quantity > 0
      } else {
        isAvailable = isAvailable && martOverride.stock_quantity > 0
      }
      stockQuantity = martOverride.stock_quantity
      
      // Prioritize customer_price, fallback to mart_price * 1.10 markup
      if (martOverride.customer_price !== null && martOverride.customer_price !== undefined && parseFloat(martOverride.customer_price) > 0) {
        originalMartPrice = parseFloat(martOverride.customer_price)
      } else {
        originalMartPrice = parseFloat(martOverride.mart_price) * 1.10
      }
      baseOzoPrice = null // No ozo price override for mart specific prices
    } else if (override) {
      if (override.is_available !== null && override.is_available !== undefined) {
        isAvailable = override.is_available
      }
      if (override.city_price !== null && override.city_price !== undefined) {
        originalMartPrice = parseFloat(override.city_price)
      }
      if (override.city_ozo_price !== null && override.city_ozo_price !== undefined) {
        baseOzoPrice = parseFloat(override.city_ozo_price)
      }
    }

    let resolvedPrice = originalMartPrice
    if (baseOzoPrice !== null && baseOzoPrice !== undefined && baseOzoPrice > 0) {
      resolvedPrice = baseOzoPrice
    }

    if (!isAvailable) {
      throw new Error(`Product "${product.name || 'Selected item'}" is currently unavailable.`);
    }
    if (stockQuantity !== null && stockQuantity !== undefined) {
      if (item.quantity > stockQuantity) {
        throw new Error(`Only ${stockQuantity} units of "${product.name || 'Selected item'}" are available.`);
      }
    }
    if (product.max_order_qty !== null && product.max_order_qty !== undefined) {
      if (item.quantity > product.max_order_qty) {
        throw new Error(`Maximum allowed order quantity for "${product.name || 'Selected item'}" is ${product.max_order_qty}.`);
      }
    }
    if (product.min_order_qty !== null && product.min_order_qty !== undefined) {
      if (item.quantity < product.min_order_qty) {
        throw new Error(`Minimum allowed order quantity for "${product.name || 'Selected item'}" is ${product.min_order_qty}.`);
      }
    }
    subtotal += resolvedPrice * item.quantity
  }

  // 6. Compute coupon discount
  let discountAmount = 0
  if (couponCode) {
    const { data: coupon, error: couponError } = await supabaseAdmin
      .from('offers')
      .select('*')
      .eq('coupon_code', couponCode.toUpperCase())
      .eq('is_active', true)
      .maybeSingle()

    if (coupon && !couponError) {
      const now = new Date()
      const startDate = coupon.start_date ? new Date(coupon.start_date) : null
      const endDate = coupon.end_date ? new Date(coupon.end_date) : null

      let isCouponValid = true
      if (startDate && now < startDate) isCouponValid = false
      if (endDate && now > endDate) isCouponValid = false
      if (coupon.min_order_value && subtotal < coupon.min_order_value) isCouponValid = false

      if (isCouponValid) {
        if (coupon.discount_type === 'percentage') {
          discountAmount = (subtotal * coupon.discount_value) / 100
          if (coupon.max_discount && discountAmount > coupon.max_discount) {
            discountAmount = coupon.max_discount
          }
        } else {
          discountAmount = coupon.discount_value
        }
      }
    }
  }

  // 7. Compute delivery fee & platform fee
  let deliveryFee = 0
  let platformFee = 0
  let calculatedDistance = 0
  let calculatedDistanceCharge = 0
  let isOutsideZone = false

  if (address) {
      const { data: settings, error: settingsError } = await supabaseAdmin
        .from('app_settings')
        .select('*')

      if (settingsError || !settings) {
        throw new Error(`Failed to load app settings from database: ${settingsError?.message || 'No settings found'}`);
      }

      const deliveryConfigSetting = settings.find((s: any) => s.key === 'delivery_config');
      const geofenceConfigSetting = settings.find((s: any) => s.key === 'geofence_config');
      const platformConfigSetting = settings.find((s: any) => s.key === 'platform_config');

      const platformConfig = {
        platform_fee: 0,
        ...(platformConfigSetting?.value || {})
      };
      platformFee = parseFloat(platformConfig.platform_fee) || 0;

      const deliveryConfig = {
        base_fee: 30,
        free_above: 99,
        surge_multiplier: 1,
        distance_charge_enabled: false,
        charge_per_km: 10,
        free_distance: 3,
        store_lat: 24.752871,
        store_lng: 84.3738,
        ...(deliveryConfigSetting?.value || {})
      };

      const geofenceConfig = {
        strict_enforcement: true,
        warehouse_lat: 24.745736,
        warehouse_lng: 84.390014,
        max_radius_km: 2.5,
        ...(geofenceConfigSetting?.value || {})
      };

      const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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

      const addrLat = parseFloat(address.latitude)
      const addrLng = parseFloat(address.longitude)

      if (!isNaN(addrLat) && !isNaN(addrLng)) {
        let nearestCity: any = null
        const { data: activeCities, error: citiesError } = await supabaseAdmin
          .from('operating_cities')
          .select('*')
          .eq('is_active', true)

        if (activeCities && !citiesError && activeCities.length > 0) {
          let minDistance = Infinity
          activeCities.forEach((city: any) => {
            const cityLat = parseFloat(city.latitude)
            const cityLng = parseFloat(city.longitude)
            if (!isNaN(cityLat) && !isNaN(cityLng)) {
              const dist = getDistance(cityLat, cityLng, addrLat, addrLng)
              if (dist < minDistance) {
                minDistance = dist
                nearestCity = city
              }
            }
          })
        }

        let wLat = parseFloat(geofenceConfig.warehouse_lat) || 24.754622
        let wLng = parseFloat(geofenceConfig.warehouse_lng) || 84.375011
        
        if (nearestCity && nearestCity.latitude && nearestCity.longitude) {
          wLat = parseFloat(nearestCity.latitude)
          wLng = parseFloat(nearestCity.longitude)
        }

        const sLat = nearestCity ? wLat : (parseFloat(deliveryConfig.store_lat) || wLat)
        const sLng = nearestCity ? wLng : (parseFloat(deliveryConfig.store_lng) || wLng)

        const distanceFromWarehouse = getDistance(wLat, wLng, addrLat, addrLng)
        const distanceFromStore = getDistance(sLat, sLng, addrLat, addrLng)
        
        // Fetch OSRM road distance
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${addrLng},${addrLat};${sLng},${sLat}?overview=false`
        let roadDistance: number | null = null
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 2500)
          const res = await fetch(osrmUrl, { signal: controller.signal })
          clearTimeout(timeoutId)
          if (res.ok) {
            const data = await res.json()
            if (data && data.routes && data.routes[0] && typeof data.routes[0].distance === 'number') {
              roadDistance = data.routes[0].distance / 1000
            }
          }
        } catch (e) {
          console.warn('[OSRM Server Error]', e)
        }

        if (roadDistance !== null) {
          calculatedDistance = roadDistance
        } else {
          // Haversine fallback * 1.3
          calculatedDistance = distanceFromStore * 1.3
        }

        if (deliveryConfig.distance_charge_enabled) {
          const freeDist = parseFloat(deliveryConfig.free_distance) || 0
          const chargePerKm = parseFloat(deliveryConfig.charge_per_km) || 0
          
          if (calculatedDistance > freeDist) {
            calculatedDistanceCharge = Math.round((calculatedDistance - freeDist) * chargePerKm)
          }
        }

        const maxRadius = nearestCity 
          ? (parseFloat(nearestCity.service_radius_km) || 1.5)
          : (parseFloat(geofenceConfig.max_radius_km) || 1.5)
        
        isOutsideZone = distanceFromWarehouse > maxRadius

        if (isOutsideZone && geofenceConfig.strict_enforcement) {
          throw new Error('Address is outside the active delivery zone.');
        }
      }

      const baseFee = parseFloat(deliveryConfig.base_fee) || 30
      const freeAbove = parseFloat(deliveryConfig.free_above) || 99
      const surgeMultiplier = parseFloat(deliveryConfig.surge_multiplier) || 1

      const baseDeliveryFee = subtotal >= freeAbove ? 0 : Math.round(baseFee * surgeMultiplier)
      deliveryFee = baseDeliveryFee + calculatedDistanceCharge

      if (isOutsideZone && !geofenceConfig.strict_enforcement) {
        deliveryFee = deliveryFee * 2
      }
    }

  const total = subtotal + deliveryFee + platformFee - discountAmount
  return {
    subtotal,
    deliveryFee,
    discountAmount,
    platformFee,
    total: Math.max(0, total)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) {
      return new Response(
        JSON.stringify({ verified: false, error: 'Authorization token is missing' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ""
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify client token using anon key + auth header context
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ verified: false, error: 'Unauthorized access' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract client IP address safely, prioritizing x-real-ip
    let clientIp = '127.0.0.1'
    const realIp = req.headers.get('x-real-ip')
    if (realIp) {
      clientIp = realIp.trim()
    } else {
      const forwardedFor = req.headers.get('x-forwarded-for')
      if (forwardedFor) {
        clientIp = forwardedFor.split(',')[0].trim()
      }
    }

    const body = await req.json()
    const { action, paymentId, orderId, signature, addressId, couponCode, martId } = body

    if (action === 'create_order' || action === 'verify_payment' || action === 'calculate_totals') {
      if (!addressId) {
        return new Response(
          JSON.stringify({ verified: false, error: 'Address is required to compute delivery fee and total' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID')
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (action === 'create_order' || action === 'verify_payment' || action === 'get_payment_details' || !action) {
      if (!keyId || !keySecret) {
        return new Response(
          JSON.stringify({ 
            verified: false, 
            error: 'Razorpay keys are not configured on the server. Operation cannot proceed.'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const razorpayAuthHeader = (keyId && keySecret) ? ('Basic ' + btoa(`${keyId}:${keySecret}`)) : ''

    // Calculate server-side expected price
    let calculatedDetails;
    try {
      calculatedDetails = await calculateExpectedAmount(supabaseAdmin, user.id, addressId, couponCode, martId)
    } catch (e: any) {
      return new Response(
        JSON.stringify({ verified: false, error: e.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const computedTotal = calculatedDetails.total
    const expectedPaise = Math.round(computedTotal * 100)

    // ACTION: Calculate Totals (COD path)
    if (action === 'calculate_totals') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          calculatedDetails: {
            subtotal: calculatedDetails.subtotal,
            deliveryFee: calculatedDetails.deliveryFee,
            discount: calculatedDetails.discountAmount,
            platformFee: calculatedDetails.platformFee,
            total: calculatedDetails.total
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ACTION: Create Razorpay Order
    if (action === 'create_order') {
      // Apply server-side database rate limit (max 5 order attempts per 10 minutes)
      const { error: limitError } = await supabaseClient.rpc('check_db_rate_limit', {
        p_action: 'create_payment_order',
        p_max_requests: 5,
        p_window_interval: '10 minutes',
        p_ip_address: clientIp
      })

      if (limitError) {
        console.warn(`[Rate Limit Exceeded] create_payment_order by user ${user.id} (IP: ${clientIp}):`, limitError.message)
        return new Response(
          JSON.stringify({ verified: false, error: 'Rate limit exceeded: Max 5 order attempts per 10 minutes. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (expectedPaise <= 0) {
        return new Response(
          JSON.stringify({ error: 'Calculated order amount must be greater than zero' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }


      const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': razorpayAuthHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: expectedPaise,
          currency: 'INR',
          receipt: `rec_${Math.random().toString(36).substring(2, 11)}`
        })
      })

      if (!orderResponse.ok) {
        const errText = await orderResponse.text()
        console.error('Razorpay Create Order API error:', errText)
        return new Response(
          JSON.stringify({ error: `Razorpay API error: ${errText}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const rzpOrder = await orderResponse.json()

      // Link the generated Razorpay order ID to our pre-created database order
      if (body.pendingOrderId) {
        const { error: linkError } = await supabaseAdmin
          .from('orders')
          .update({ transaction_id: rzpOrder.id })
          .eq('id', body.pendingOrderId)
        if (linkError) {
          console.error('[Razorpay] Failed to link rzpOrder.id to pendingOrderId:', linkError)
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          order: rzpOrder,
          calculatedDetails: {
            subtotal: calculatedDetails.subtotal,
            deliveryFee: calculatedDetails.deliveryFee,
            discount: calculatedDetails.discountAmount,
            platformFee: calculatedDetails.platformFee,
            total: calculatedDetails.total
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ACTION: Verify Payment (SDK Path with Signature)
    if (action === 'verify_payment') {
      if (!paymentId || !orderId || !signature) {
        return new Response(
          JSON.stringify({ verified: false, error: 'paymentId, orderId, and signature are required for verification' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 1. Verify the signature
      const isSignatureValid = await verifySignature(orderId, paymentId, signature, keySecret)
      if (!isSignatureValid) {
        return new Response(
          JSON.stringify({ verified: false, error: 'Razorpay signature verification failed. Untrusted request.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 2. Double Spend Check
      const { data: existingOrder, error: checkError } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('transaction_id', orderId) // match razorpay order id
        .eq('payment_status', 'paid') // only block if already paid
        .maybeSingle()

      if (checkError) {
        console.error('Error checking existing order:', checkError)
      }

      if (existingOrder) {
        return new Response(
          JSON.stringify({ verified: false, error: 'This payment has already been associated with another order.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 3. Fetch payment details from Razorpay to verify the amount
      const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': razorpayAuthHeader }
      })

      if (!response.ok) {
        const errText = await response.text()
        return new Response(
          JSON.stringify({ verified: false, error: `Razorpay API error checking payment: ${errText}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const payment = await response.json()
      
      // Ensure payment is successful
      const isSuccessful = payment.status === 'captured' || payment.status === 'authorized'
      if (!isSuccessful) {
        return new Response(
          JSON.stringify({ verified: false, error: `Payment status is ${payment.status}, not authorized/captured` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Ensure amount matches
      if (payment.amount !== expectedPaise) {
        return new Response(
          JSON.stringify({ 
            verified: false, 
            error: `Payment amount mismatch. Order expects ${(expectedPaise/100).toFixed(2)} INR (${expectedPaise} paise), but payment was for ${(payment.amount/100).toFixed(2)} INR (${payment.amount} paise).` 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Record verified payment in the database
      const verifiedAmount = payment.amount / 100
      const { error: dbError } = await supabaseAdmin
        .from('verified_payments')
        .upsert({ id: paymentId, amount: verifiedAmount })

      if (dbError) {
        console.error('Error inserting verified payment:', dbError)
        return new Response(
          JSON.stringify({ verified: false, error: `Database logging error: ${dbError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update the database order status to paid
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'PLACED_COOLING'
        })
        .eq('transaction_id', orderId) // matching orderId (razorpay order_id)

      if (updateError) {
        console.error('[Razorpay] Failed to update order status to paid:', updateError)
      }

      // Clear database cart items for this user server-side
      const { error: cartClearError } = await supabaseAdmin
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)

      if (cartClearError) {
        console.error('[Razorpay] Failed to clear database cart items:', cartClearError)
      }

      return new Response(
        JSON.stringify({ 
          verified: true, 
          payment_id: paymentId, 
          data: payment,
          calculatedDetails: {
            subtotal: calculatedDetails.subtotal,
            deliveryFee: calculatedDetails.deliveryFee,
            discount: calculatedDetails.discountAmount,
            platformFee: calculatedDetails.platformFee,
            total: calculatedDetails.total
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ACTION: Get Payment Details (Admin Only)
    if (action === 'get_payment_details') {
      if (!paymentId) {
        return new Response(
          JSON.stringify({ success: false, error: 'paymentId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 1. Verify user is an admin
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError || profile?.role !== 'admin') {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized: Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 2. Fetch payment details from Razorpay
      const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': razorpayAuthHeader }
      })

      if (!response.ok) {
        const errText = await response.text()
        return new Response(
          JSON.stringify({ success: false, error: `Razorpay API error: ${errText}` }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const payment = await response.json()
      return new Response(
        JSON.stringify({ success: true, payment }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Unknown / unhandled action
    return new Response(
      JSON.stringify({ verified: false, error: `Unknown action: "${action}". Valid actions are: create_order, verify_payment, calculate_totals, get_payment_details` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ verified: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
