import { create } from 'zustand'
import { supabase, supabaseAdmin } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { useCartStore } from './cartStore'
import toast from 'react-hot-toast'

export const useOrderStore = create((set, get) => ({
  // State
  orders: [],
  activeOrder: null,
  currentOrder: null,
  isLoading: false,
  isPlacingOrder: false,
  serverTimeOffset: 0,
  unserviceableOrderError: null,
  totalCount: 0,
  orderStats: { total: 0, pending: 0, inTransit: 0, delivered: 0, revenue: 0 },

  clearUnserviceableOrderError: () => set({ unserviceableOrderError: null }),

  setUnserviceableError: (errorOrMsg) => {
    const cartItems = useCartStore.getState().items || []
    let rawMsg = typeof errorOrMsg === 'string' 
      ? errorOrMsg 
      : (errorOrMsg?.message || errorOrMsg?.details || errorOrMsg?.error || 'Failed to place order')
    
    let matchedItems = []

    try {
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
      const uuids = (typeof rawMsg === 'string' ? rawMsg.match(uuidRegex) : null) || []
      
      if (uuids.length > 0) {
        uuids.forEach(uuid => {
          const item = cartItems.find(i => 
            (i.productId && String(i.productId).toLowerCase() === String(uuid).toLowerCase()) || 
            (i.id && String(i.id).toLowerCase() === String(uuid).toLowerCase())
          )
          if (item && !matchedItems.some(m => (m.productId || m.id) === (item.productId || item.id))) {
            matchedItems.push(item)
          }
          const itemName = item?.name || item?.productName || item?.title
          if (itemName) {
            rawMsg = rawMsg.replace(new RegExp(uuid, 'gi'), `"${itemName}"`)
          } else {
            rawMsg = rawMsg
              .replace(new RegExp(`Product ${uuid}`, 'gi'), 'An item')
              .replace(new RegExp(`product ${uuid}`, 'gi'), 'an item')
              .replace(new RegExp(`product ID ${uuid}`, 'gi'), 'an item')
              .replace(new RegExp(uuid, 'gi'), 'Item')
          }
        })
      } else {
        cartItems.forEach(i => {
          const name = i.name || i.productName || i.title
          if (name && typeof rawMsg === 'string' && rawMsg.toLowerCase().includes(String(name).toLowerCase())) {
            if (!matchedItems.some(m => (m.productId || m.id) === (i.productId || i.id))) {
              matchedItems.push(i)
            }
          }
        })
      }

      if (typeof rawMsg === 'string' && rawMsg.includes('is not available in the selected mart')) {
        rawMsg = rawMsg.replace('is not available in the selected mart', 'is not available in your delivery area')
      }

      if (matchedItems.length === 0 && typeof rawMsg === 'string' && (
        rawMsg.toLowerCase().includes('not available') || 
        rawMsg.toLowerCase().includes('stock') || 
        rawMsg.toLowerCase().includes('mart')
      )) {
        matchedItems = [...cartItems]
      }
    } catch (e) {
      console.warn('Error parsing checkout error message:', e)
    }

    set({ 
      isPlacingOrder: false,
      unserviceableOrderError: {
        message: String(rawMsg),
        items: matchedItems,
        rawError: errorOrMsg
      }
    })
  },

  // Fetch user orders
  fetchOrders: async (options = {}) => {
    try {
      const user = useAuthStore.getState().user
      if (!user) {
        set({ orders: [] })
        return { success: true, data: [] }
      }

      set({ isLoading: true })

      let query = supabase
        .from('orders')
        .select(`
          *,
          address:addresses (
            address_line1,
            address_line2,
            city,
            state,
            pincode,
            latitude,
            longitude
          ),
          order_items (
            id,
            product_id,
            product_name,
            product_image,
            quantity,
            unit_price,
            is_cancelled
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (options.signal) {
        query = query.abortSignal(options.signal)
      }

      const { data, error } = await query

      if (error) throw error

      const orders = data.map(order => ({
        ...order,
        subtotal: parseFloat(order.subtotal),
        delivery_fee: parseFloat(order.delivery_fee),
        discount: parseFloat(order.discount),
        total: parseFloat(order.total),
      }))

      set({ orders, isLoading: false })
      return { success: true, data: orders }
    } catch (error) {
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        console.log('Fetch orders aborted.')
        return { success: false, error, aborted: true }
      }
      console.error('Fetch orders error:', error)
      set({ isLoading: false })
      return { success: false, error }
    }
  },

  // Fetch active orders (lightweight, single-record query)
  fetchActiveOrder: async (options = {}) => {
    try {
      const user = useAuthStore.getState().user
      if (!user) {
        set({ activeOrder: null })
        return { success: true, data: null }
      }

      let query = supabase
        .from('orders')
        .select(`
          id,
          status,
          created_at,
          order_items (
            id,
            product_image
          )
        `)
        .eq('user_id', user.id)
        .not('status', 'in', '("delivered","DELIVERED_VERIFYING","COMPLETED","cancelled","CANCELLED_BY_USER")')
        .order('created_at', { ascending: false })
        .limit(1)

      if (options.signal) {
        query = query.abortSignal(options.signal)
      }

      const { data, error } = await query

      if (error) throw error

      const activeOrder = data && data.length > 0 ? data[0] : null
      set({ activeOrder })
      return { success: true, data: activeOrder }
    } catch (error) {
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        return { success: false, error, aborted: true }
      }
      console.error('Fetch active order error:', error)
      return { success: false, error }
    }
  },

  // Fetch single order by ID
  fetchOrderById: async (orderId, options = {}) => {
    try {
      const { silent } = options
      if (!silent) {
        set({ isLoading: true })
      }

      let query = supabase
        .from('orders')
        .select(`
          *,
          address:addresses (
            label,
            address_line1,
            address_line2,
            city,
            state,
            pincode,
            landmark,
            latitude,
            longitude
          ),
          rider:captains (
            id,
            full_name,
            phone,
            bike_number,
            rating,
            selfie_url,
            current_lat,
            current_long,
            earnings,
            cash_in_hand,
            whatsapp,
            driving_license,
            aadhar_number
          ),
          mart:marts (
            id,
            name,
            slug,
            is_active
          ),
          order_items (
            id,
            product_id,
            product_name,
            product_image,
            quantity,
            unit_price,
            total_price,
            is_cancelled,
            product:products (
              slug,
              is_available
            )
          )
        `)
        .eq('id', orderId)
        .maybeSingle()

      if (options.signal) {
        query = query.abortSignal(options.signal)
      }

      // Fetch order details and database server time in parallel to compute clock offset
      const [queryResult, timeResult] = await Promise.all([
        query,
        supabase.rpc('get_server_time')
      ])

      const { data, error } = queryResult
      if (error) throw error

      let offset = 0
      if (timeResult && timeResult.data) {
        offset = new Date(timeResult.data).getTime() - new Date().getTime()
      }

      const order = {
        ...data,
        subtotal: parseFloat(data.subtotal),
        delivery_fee: parseFloat(data.delivery_fee),
        discount: parseFloat(data.discount),
        total: parseFloat(data.total),
        order_items: data.order_items.map(item => ({
          ...item,
          unit_price: parseFloat(item.unit_price),
          total_price: parseFloat(item.total_price),
          is_cancelled: !!item.is_cancelled,
          product_slug: item.product?.slug || '',
          is_available: item.product?.is_available ?? true
        })),
      }

      set({ currentOrder: order, serverTimeOffset: offset })
      if (!silent) {
        set({ isLoading: false })
      }
      return { success: true, data: order }
    } catch (error) {
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        console.log('Fetch order by id aborted.')
        return { success: false, error, aborted: true }
      }
      console.error('Fetch order error:', error)
      if (!options.silent) {
        set({ isLoading: false })
      }
      return { success: false, error }
    }
  },

  // Place new order
  placeOrder: async (orderData) => {
    const user = useAuthStore.getState().user
    const cartItems = useCartStore.getState().items || []

    if (!user) {
      toast.error('Please login to place order')
      return { success: false }
    }

    if (cartItems.length === 0) {
      toast.error('Cart is empty')
      return { success: false }
    }

    set({ isPlacingOrder: true })

    try {
      // Fetch latitude/longitude/google_maps_url of the selected address to save directly on order
      let lat = orderData.latitude || null
      let lng = orderData.longitude || null
      let googleMapsUrlVal = orderData.googleMapsUrl || null
      try {
        const { data: addressData } = await supabase
          .from('addresses')
          .select('latitude, longitude, google_maps_url')
          .eq('id', orderData.addressId)
          .maybeSingle()
        if (addressData) {
          if (addressData.latitude) lat = addressData.latitude
          if (addressData.longitude) lng = addressData.longitude
          if (addressData.google_maps_url) googleMapsUrlVal = addressData.google_maps_url
        }
      } catch (e) {
        console.warn('Could not fetch address coordinates during order placement', e)
      }

      // Prepare items list for the RPC call
      const rpcItems = cartItems.map(item => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price
      }))

      // Call the RPC function to create the order atomically and decrement stock
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('create_order_secure', {
          p_address_id: orderData.addressId,
          p_subtotal: orderData.subtotal,
          p_delivery_fee: orderData.deliveryFee,
          p_discount: orderData.discount,
          p_total: orderData.total,
          p_coupon_code: orderData.couponCode || null,
          p_payment_method: orderData.paymentMethod === 'cod' ? 'cod' : 'online',
          p_payment_status: orderData.paymentStatus || (orderData.paymentMethod === 'cod' ? 'pending' : 'paid'),
          p_delivery_instructions: orderData.transactionId 
            ? `${orderData.deliveryInstructions || ''} [Payment ID: ${orderData.transactionId}]`.trim() 
            : orderData.deliveryInstructions || null,
          p_estimated_delivery: orderData.estimatedDelivery,
          p_transaction_id: orderData.transactionId || null,
          p_latitude: lat,
          p_longitude: lng,
          p_items: rpcItems,
          p_order_for: orderData.orderFor || 'myself',
          p_recipient_name: orderData.recipientName || null,
          p_recipient_phone: orderData.recipientPhone || null,
          p_house_no: orderData.houseNo || null,
          p_street_gali: orderData.streetGali || null,
          p_landmark: orderData.landmark || null,
          p_delivery_city: orderData.deliveryCity || 'Aurangabad',
          p_google_maps_url: googleMapsUrlVal,
          p_mart_id: orderData.martId || null,
          p_platform_fee: orderData.platformFee || 0,
          p_distance: orderData.distance || null,
          p_charity_donation: orderData.charityDonation || 0
        })

      if (rpcError) throw rpcError

      // Fetch the newly created order record to preserve full compatibility with rest of store and app
      const { data: order, error: fetchOrderError } = await supabase
        .from('orders')
        .select()
        .eq('id', rpcResult.id)
        .single()

      if (fetchOrderError) throw fetchOrderError

      // Clear cart after successful order (unless it is a pending payment order)
      if (orderData.paymentStatus !== 'pending_payment') {
        await useCartStore.getState().clearCart()
      }

      // Refresh auth profile to update free delivery credits
      try {
        await useAuthStore.getState().refreshProfile()
      } catch (profileErr) {
        console.warn('Failed to refresh profile after order placement:', profileErr)
      }

      set({
        isPlacingOrder: false,
        activeOrder: {
          ...order,
          order_items: cartItems.map(item => ({
            id: item.productId,
            product_image: item.productImage
          }))
        }
      })
      toast.success('Order placed successfully!')
      return { success: true, data: order }
    } catch (error) {
      console.error('Place order error:', error)
      get().setUnserviceableError(error)
      const errState = get().unserviceableOrderError
      return { 
        success: false, 
        error, 
        message: errState?.message || 'Failed to place order', 
        unserviceableItems: errState?.items || [] 
      }
    }
  },

  // Cancel order
  cancelOrder: async (orderId, cancellationDetails) => {
    try {
      if (!orderId) {
        console.warn('cancelOrder called without orderId')
        return { success: false, error: 'No order ID provided' }
      }

      const updatePayload = {
        status: 'CANCELLED_BY_USER',
        updated_at: new Date().toISOString(),
      }

      if (cancellationDetails) {
        const { reason, note } = cancellationDetails
        const currentOrder = get().currentOrder
        const originalInstructions = currentOrder?.delivery_instructions || ''
        updatePayload.delivery_instructions = `${originalInstructions} [Cancel Reason: ${reason}] [Cancel Note: ${note || ''}]`.trim()
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId)
        .select()
        .maybeSingle()

      if (error) throw error

      if (!data) {
        console.warn('cancelOrder: No row updated. Order might already be cancelled or not eligible.')
      }

      // Update orders list, activeOrder, and currentOrder
      set(state => ({
        orders: state.orders.map(order =>
          order.id === orderId ? { ...order, status: 'CANCELLED_BY_USER' } : order
        ),
        activeOrder: state.activeOrder && state.activeOrder.id === orderId ? null : state.activeOrder,
        currentOrder: state.currentOrder && state.currentOrder.id === orderId ? { ...state.currentOrder, status: 'CANCELLED_BY_USER' } : state.currentOrder
      }))

      toast.success('Order cancelled successfully')
      return { success: true, data }
    } catch (error) {
      console.error('Cancel order error:', error)
      toast.error('Failed to cancel order')
      return { success: false, error }
    }
  },

  // Track order (get real-time updates)
  trackOrder: async (orderId) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('status, estimated_delivery, delivered_at')
        .eq('id', orderId)
        .maybeSingle()

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Track order error:', error)
      return { success: false, error }
    }
  },

  // Get order statistics
  getOrderStats: async () => {
    try {
      const user = useAuthStore.getState().user
      if (!user) return { success: false }

      const { data, error } = await supabase
        .from('orders')
        .select('status, total')
        .eq('user_id', user.id)

      if (error) throw error

      const stats = {
        total: data.length,
        pending: data.filter(o => ['pending', 'placed', 'PLACED_COOLING', 'CONFIRMED_SYSTEM'].includes(o.status)).length,
        delivered: data.filter(o => ['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(o.status)).length,
        cancelled: data.filter(o => ['cancelled', 'CANCELLED_BY_USER'].includes(o.status)).length,
        totalSpent: data
          .filter(o => !['cancelled', 'CANCELLED_BY_USER'].includes(o.status))
          .reduce((sum, o) => sum + parseFloat(o.total), 0),
      }

      return { success: true, data: stats }
    } catch (error) {
      console.error('Get order stats error:', error)
      return { success: false, error }
    }
  },

  // Admin: Fetch all orders in system (with server-side pagination, search, and filtering)
  adminFetchOrders: async (options = {}) => {
    try {
      set({ isLoading: true })
      const { page = 1, pageSize = 10, searchQuery = '', statusFilter = 'all' } = options

      const { profile, getScopedCities, getScopedMarts } = useAuthStore.getState()
      const isSuperAdmin = profile?.isSuperAdmin
      const isCityManager = profile?.isCityManager
      const isMartOwner = profile?.isMartOwner

      let allowedMartIds = []
      let needsFiltering = false

      if (!isSuperAdmin) {
        if (isCityManager) {
          needsFiltering = true
          const scopedCities = getScopedCities()
          if (scopedCities.length > 0) {
            const { data: managerMarts } = await supabaseAdmin
              .from('marts')
              .select('id')
              .in('city_id', scopedCities)
            if (managerMarts && managerMarts.length > 0) {
              allowedMartIds = [...allowedMartIds, ...managerMarts.map(m => m.id)]
            }
          }
        }
        if (isMartOwner) {
          needsFiltering = true
          const scopedMarts = getScopedMarts()
          if (scopedMarts.length > 0) {
            allowedMartIds = [...allowedMartIds, ...scopedMarts]
          }
        }
      }

      let query = supabaseAdmin
        .from('orders')
        .select(`
          id,
          order_number,
          user_id,
          address_id,
          mart_id,
          rider_id,
          status,
          payment_method,
          payment_status,
          subtotal,
          delivery_fee,
          discount,
          total,
          platform_fee,
          mart_payout,
          coupon_code,
          transaction_id,
          delivery_instructions,
          estimated_delivery,
          delivered_at,
          created_at,
          updated_at,
          recipient_name,
          recipient_phone,
          house_no,
          street_gali,
          landmark,
          delivery_city,
          cancellation_reason,
          mart_payout_status,
          distance,
          address:addresses (
            address_line1,
            address_line2,
            city,
            state,
            pincode,
            latitude,
            longitude
          ),
          rider:captains (
            id,
            full_name,
            phone,
            bike_number,
            rating,
            selfie_url,
            current_lat,
            current_long,
            whatsapp
          ),
          mart:marts (
            id,
            name,
            slug,
            is_active
          ),
          order_items (
            id,
            product_id,
            product_name,
            product_image,
            quantity,
            unit_price,
            total_price,
            is_cancelled,
            product:products (
              slug,
              is_available
            )
          ),
          customer:users (
            id,
            email,
            full_name,
            phone,
            avatar_url
          ),
          reviews (
            id,
            rating,
            review_text,
            images,
            product_id,
            created_at
          )
        `, { count: 'exact' })

      if (needsFiltering) {
        if (allowedMartIds.length > 0) {
          query = query.in('mart_id', allowedMartIds)
        } else {
          // No access to any marts, force empty result
          query = query.eq('id', '00000000-0000-0000-0000-000000000000')
        }
      }

      // Apply statusFilter on backend
      if (statusFilter !== 'all') {
        if (statusFilter === 'cancelled') {
          query = query.in('status', ['cancelled', 'CANCELLED_BY_USER'])
        } else {
          query = query.eq('status', statusFilter)
        }
      }

      // Apply searchQuery on backend (by order_number, recipient_name, recipient_phone, transaction_id, or customer users)
      if (searchQuery.trim() !== '') {
        const queryTerm = searchQuery.trim()
        const { data: matchedUsers } = await supabaseAdmin
          .from('users')
          .select('id')
          .or(`full_name.ilike.%${queryTerm}%,email.ilike.%${queryTerm}%,phone.ilike.%${queryTerm}%`)
        
        const matchedUserIds = matchedUsers ? matchedUsers.map(u => u.id) : []
        
        let orConditions = `order_number.ilike.%${queryTerm}%,recipient_name.ilike.%${queryTerm}%,recipient_phone.ilike.%${queryTerm}%,transaction_id.ilike.%${queryTerm}%`
        if (matchedUserIds.length > 0) {
          const userIdsStr = matchedUserIds.map(id => `"${id}"`).join(',')
          orConditions += `,user_id.in.(${userIdsStr})`
        }
        query = query.or(orConditions)
      }

      // Pagination
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Fetch server time, stats, and orders in parallel
      let statsParam = needsFiltering ? allowedMartIds : null

      const [queryResult, timeResult, statsResult] = await Promise.all([
        query.order('created_at', { ascending: false }).range(from, to),
        supabaseAdmin.rpc('get_server_time'),
        supabaseAdmin.rpc('get_admin_order_stats', { p_mart_ids: statsParam })
      ])

      const { data, count, error } = queryResult
      if (error) throw error

      let offset = 0
      if (timeResult && timeResult.data) {
        offset = new Date(timeResult.data).getTime() - new Date().getTime()
      }

      const parsedOrders = data.map(order => ({
        ...order,
        subtotal: parseFloat(order.subtotal),
        delivery_fee: parseFloat(order.delivery_fee),
        discount: parseFloat(order.discount),
        total: parseFloat(order.total),
        order_items: order.order_items ? order.order_items.map(item => ({
          ...item,
          unit_price: parseFloat(item.unit_price || 0),
          total_price: parseFloat(item.total_price || 0),
          is_cancelled: !!item.is_cancelled,
          product_slug: item.product?.slug || '',
          is_available: item.product?.is_available ?? true
        })) : []
      }))

      set({ 
        orders: parsedOrders, 
        totalCount: count || 0,
        orderStats: statsResult.data || { total: 0, pending: 0, inTransit: 0, delivered: 0, revenue: 0 },
        serverTimeOffset: offset, 
        isLoading: false 
      })
      return { success: true, data: parsedOrders, count }
    } catch (error) {
      console.error('Admin fetch orders error:', error)
      set({ isLoading: false })
      return { success: false, error }
    }
  },

  // Admin: Update order status
  adminUpdateOrderStatus: async (orderId, newStatus, cancellationDetails = null) => {
    try {
      const updatePayload = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      }
      
      if (newStatus === 'cancelled' && cancellationDetails) {
        const { reason, note } = cancellationDetails
        const targetOrder = get().orders.find(o => o.id === orderId) || get().currentOrder
        const originalInstructions = targetOrder?.delivery_instructions || ''
        updatePayload.delivery_instructions = `${originalInstructions} [Cancel Reason: ${reason}] [Cancel Note: ${note || ''}]`.trim()
      }

      const { data, error } = await supabaseAdmin
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId)
        .select()
        .single()

      if (error) throw error

      // Notifications are centrally handled by database triggers to prevent duplicates and ensure consistency.

      // Update state locally
      const currentOrders = get().orders
      const updatedOrders = currentOrders.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
      set({ orders: updatedOrders })

      if (get().currentOrder?.id === orderId) {
        set({ currentOrder: { ...get().currentOrder, status: newStatus } })
      }

      toast.success(`Order status updated to ${newStatus.replace('_', ' ')}`)
      return { success: true, data }
    } catch (error) {
      console.error('Admin update status error:', error)
      toast.error('Failed to update status')
      return { success: false, error }
    }
  },

  // Admin: Update payment status
  adminUpdatePaymentStatus: async (orderId, newPaymentStatus) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .update({
          payment_status: newPaymentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single()

      if (error) throw error

      // Update state locally
      const currentOrders = get().orders
      const updatedOrders = currentOrders.map(o => o.id === orderId ? { ...o, payment_status: newPaymentStatus } : o)
      set({ orders: updatedOrders })

      if (get().currentOrder?.id === orderId) {
        set({ currentOrder: { ...get().currentOrder, payment_status: newPaymentStatus } })
      }

      toast.success(`Payment status marked as ${newPaymentStatus.toUpperCase()}`)
      return { success: true, data }
    } catch (error) {
      console.error('Admin update payment status error:', error)
      toast.error('Failed to update payment status')
      return { success: false, error }
    }
  },

  // Admin: Assign Mart to order
  adminAssignMart: async (orderId, martId) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('orders')
        .update({
          mart_id: martId,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single()

      if (error) throw error

      // Refresh admin orders in store
      await get().adminFetchOrders()

      // Update state locally
      if (get().currentOrder?.id === orderId) {
        const latestOrder = get().orders.find(o => o.id === orderId)
        if (latestOrder) {
          set({ currentOrder: latestOrder })
        }
      }

      toast.success('Mart assigned successfully!')
      return { success: true, data }
    } catch (error) {
      console.error('Admin assign mart error:', error)
      toast.error('Failed to assign mart')
      return { success: false, error }
    }
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('ozo-auth-signout', (e) => {
    if (e.detail?.reason !== 'session_expired') {
      useOrderStore.setState({ orders: [], activeOrder: null, currentOrder: null })
    }
  })
}