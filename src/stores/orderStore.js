import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { useCartStore } from './cartStore'
import toast from 'react-hot-toast'

export const useOrderStore = create((set, get) => ({
  // State
  orders: [],
  currentOrder: null,
  isLoading: false,
  isPlacingOrder: false,

  // Fetch user orders
  fetchOrders: async () => {
    try {
      const user = useAuthStore.getState().user
      if (!user) {
        set({ orders: [] })
        return
      }

      set({ isLoading: true })

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          address:addresses (
            address_line1,
            address_line2,
            city,
            state,
            pincode
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

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
      console.error('Fetch orders error:', error)
      set({ isLoading: false })
      return { success: false, error }
    }
  },

  // Fetch single order by ID
  fetchOrderById: async (orderId) => {
    try {
      set({ isLoading: true })

      const { data, error } = await supabase
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
            landmark
          ),
          order_items (
            id,
            product_name,
            product_image,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('id', orderId)
        .single()

      if (error) throw error

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
        })),
      }

      set({ currentOrder: order, isLoading: false })
      return { success: true, data: order }
    } catch (error) {
      console.error('Fetch order error:', error)
      set({ isLoading: false })
      return { success: false, error }
    }
  },

  // Place new order
  placeOrder: async (orderData) => {
    try {
      const user = useAuthStore.getState().user
      const cartItems = useCartStore.getState().items

      if (!user) {
        toast.error('Please login to place order')
        return { success: false }
      }

      if (cartItems.length === 0) {
        toast.error('Cart is empty')
        return { success: false }
      }

      set({ isPlacingOrder: true })

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            user_id: user.id,
            address_id: orderData.addressId,
            subtotal: orderData.subtotal,
            delivery_fee: orderData.deliveryFee,
            discount: orderData.discount,
            total: orderData.total,
            coupon_code: orderData.couponCode,
            payment_method: orderData.paymentMethod,
            payment_status: orderData.paymentMethod === 'cod' ? 'pending' : 'paid',
            delivery_instructions: orderData.deliveryInstructions,
            estimated_delivery: orderData.estimatedDelivery,
            status: 'pending',
          },
        ])
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.name,
        product_image: item.image,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      // Clear cart after successful order
      await useCartStore.getState().clearCart()

      // Create notification
      await supabase.from('notifications').insert([
        {
          user_id: user.id,
          title: 'Order Placed Successfully',
          message: `Your order #${order.order_number} has been placed successfully`,
          type: 'order',
          data: { order_id: order.id },
        },
      ])

      set({ isPlacingOrder: false })
      toast.success('Order placed successfully!')
      return { success: true, data: order }
    } catch (error) {
      console.error('Place order error:', error)
      toast.error('Failed to place order')
      set({ isPlacingOrder: false })
      return { success: false, error }
    }
  },

  // Cancel order
  cancelOrder: async (orderId) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single()

      if (error) throw error

      // Update orders list
      set({
        orders: get().orders.map(order =>
          order.id === orderId ? { ...order, status: 'cancelled' } : order
        ),
      })

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
        .single()

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
        pending: data.filter(o => o.status === 'pending').length,
        delivered: data.filter(o => o.status === 'delivered').length,
        cancelled: data.filter(o => o.status === 'cancelled').length,
        totalSpent: data
          .filter(o => o.status !== 'cancelled')
          .reduce((sum, o) => sum + parseFloat(o.total), 0),
      }

      return { success: true, data: stats }
    } catch (error) {
      console.error('Get order stats error:', error)
      return { success: false, error }
    }
  },
}))