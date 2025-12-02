import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import toast from 'react-hot-toast'

export const useCartStore = create(
  persist(
    (set, get) => ({
      // State
      items: [],
      isLoading: false,
      totalItems: 0,
      subtotal: 0,
      discount: 0,
      deliveryFee: 0,
      total: 0,

      // Calculate totals
      calculateTotals: () => {
        const items = get().items
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
        const deliveryFee = subtotal >= 199 ? 0 : 40
        const discount = get().discount || 0
        const total = subtotal + deliveryFee - discount

        set({
          totalItems,
          subtotal,
          deliveryFee,
          total: Math.max(0, total),
        })
      },

      // Fetch cart from database
      fetchCart: async () => {
        try {
          const user = useAuthStore.getState().user
          if (!user) {
            set({ items: [], totalItems: 0, subtotal: 0, total: 0 })
            return
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
                discount_percentage,
                image_url,
                unit,
                is_available,
                quantity_available,
                max_order_qty
              )
            `)
            .eq('user_id', user.id)

          if (error) throw error

          const cartItems = data.map(item => ({
            id: item.id,
            productId: item.product.id,
            name: item.product.name,
            slug: item.product.slug,
            price: parseFloat(item.product.price),
            mrp: parseFloat(item.product.mrp),
            discountPercentage: parseFloat(item.product.discount_percentage),
            image: item.product.image_url,
            unit: item.product.unit,
            quantity: item.quantity,
            isAvailable: item.product.is_available,
            quantityAvailable: item.product.quantity_available,
            maxOrderQty: item.product.max_order_qty,
          }))

          set({ items: cartItems, isLoading: false })
          get().calculateTotals()
        } catch (error) {
          console.error('Fetch cart error:', error)
          set({ isLoading: false })
        }
      },

      // Add item to cart
      addToCart: async (product, quantity = 1) => {
        try {
          const user = useAuthStore.getState().user

          if (!user) {
            toast.error('Please login to add items to cart')
            return { success: false }
          }

          const existingItem = get().items.find(item => item.productId === product.id)

          if (existingItem) {
            return get().updateQuantity(existingItem.id, existingItem.quantity + quantity)
          }

          set({ isLoading: true })

          const { data, error } = await supabase
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

          if (error) throw error

          const newItem = {
            id: data.id,
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
          }

          set({ items: [...get().items, newItem], isLoading: false })
          get().calculateTotals()

          toast.success('Added to cart')
          return { success: true, data }
        } catch (error) {
          console.error('Add to cart error:', error)
          toast.error('Failed to add to cart')
          set({ isLoading: false })
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

          if (item && newQuantity > item.maxOrderQty) {
            toast.error(`Maximum ${item.maxOrderQty} items allowed`)
            return { success: false }
          }

          if (item && newQuantity > item.quantityAvailable) {
            toast.error('Not enough stock available')
            return { success: false }
          }

          const { error } = await supabase
            .from('cart_items')
            .update({ quantity: newQuantity })
            .eq('id', cartItemId)

          if (error) throw error

          set({
            items: get().items.map(item =>
              item.id === cartItemId ? { ...item, quantity: newQuantity } : item
            ),
          })

          get().calculateTotals()
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
          const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('id', cartItemId)

          if (error) throw error

          set({
            items: get().items.filter(item => item.id !== cartItemId),
          })

          get().calculateTotals()
          toast.success('Removed from cart')
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
          if (!user) return

          const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', user.id)

          if (error) throw error

          set({
            items: [],
            totalItems: 0,
            subtotal: 0,
            discount: 0,
            total: 0,
          })

          return { success: true }
        } catch (error) {
          console.error('Clear cart error:', error)
          return { success: false, error }
        }
      },

      // Apply discount/coupon
      applyDiscount: (discountAmount) => {
        set({ discount: discountAmount })
        get().calculateTotals()
      },

      // Remove discount
      removeDiscount: () => {
        set({ discount: 0 })
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
      }),
    }
  )
)