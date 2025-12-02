import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import toast from 'react-hot-toast'

export const useWishlistStore = create(
  persist(
    (set, get) => ({
      // State
      items: [],
      isLoading: false,

      // Fetch wishlist from database
      fetchWishlist: async () => {
        try {
          const user = useAuthStore.getState().user
          if (!user) {
            set({ items: [] })
            return
          }

          set({ isLoading: true })

          const { data, error } = await supabase
            .from('wishlist')
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
                brand
              )
            `)
            .eq('user_id', user.id)

          if (error) throw error

          const wishlistItems = data.map(item => ({
            id: item.id,
            productId: item.product.id,
            name: item.product.name,
            slug: item.product.slug,
            price: parseFloat(item.product.price),
            mrp: parseFloat(item.product.mrp),
            discountPercentage: parseFloat(item.product.discount_percentage),
            image: item.product.image_url,
            unit: item.product.unit,
            isAvailable: item.product.is_available,
            quantityAvailable: item.product.quantity_available,
            brand: item.product.brand,
            addedAt: item.created_at,
          }))

          set({ items: wishlistItems, isLoading: false })
        } catch (error) {
          console.error('Fetch wishlist error:', error)
          set({ isLoading: false })
        }
      },

      // Add to wishlist
      addToWishlist: async (product) => {
        try {
          const user = useAuthStore.getState().user

          if (!user) {
            toast.error('Please login to add items to wishlist')
            return { success: false }
          }

          const existingItem = get().items.find(item => item.productId === product.id)

          if (existingItem) {
            toast('Already in wishlist', { icon: '💚' })
            return { success: false }
          }

          set({ isLoading: true })

          const { data, error } = await supabase
            .from('wishlist')
            .insert([
              {
                user_id: user.id,
                product_id: product.id,
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
            isAvailable: product.is_available,
            quantityAvailable: product.quantity_available,
            brand: product.brand,
            addedAt: data.created_at,
          }

          set({ items: [...get().items, newItem], isLoading: false })
          toast.success('Added to wishlist')
          return { success: true, data }
        } catch (error) {
          console.error('Add to wishlist error:', error)
          toast.error('Failed to add to wishlist')
          set({ isLoading: false })
          return { success: false, error }
        }
      },

      // Remove from wishlist
      removeFromWishlist: async (wishlistItemId) => {
        try {
          const { error } = await supabase
            .from('wishlist')
            .delete()
            .eq('id', wishlistItemId)

          if (error) throw error

          set({
            items: get().items.filter(item => item.id !== wishlistItemId),
          })

          toast.success('Removed from wishlist')
          return { success: true }
        } catch (error) {
          console.error('Remove from wishlist error:', error)
          toast.error('Failed to remove from wishlist')
          return { success: false, error }
        }
      },

      // Remove by product ID
      removeByProductId: async (productId) => {
        try {
          const user = useAuthStore.getState().user
          if (!user) return { success: false }

          const { error } = await supabase
            .from('wishlist')
            .delete()
            .eq('user_id', user.id)
            .eq('product_id', productId)

          if (error) throw error

          set({
            items: get().items.filter(item => item.productId !== productId),
          })

          return { success: true }
        } catch (error) {
          console.error('Remove from wishlist error:', error)
          return { success: false, error }
        }
      },

      // Clear wishlist
      clearWishlist: async () => {
        try {
          const user = useAuthStore.getState().user
          if (!user) return

          const { error } = await supabase
            .from('wishlist')
            .delete()
            .eq('user_id', user.id)

          if (error) throw error

          set({ items: [] })
          toast.success('Wishlist cleared')
          return { success: true }
        } catch (error) {
          console.error('Clear wishlist error:', error)
          toast.error('Failed to clear wishlist')
          return { success: false, error }
        }
      },

      // Toggle wishlist (add/remove)
      toggleWishlist: async (product) => {
        const existingItem = get().items.find(item => item.productId === product.id)

        if (existingItem) {
          return get().removeFromWishlist(existingItem.id)
        } else {
          return get().addToWishlist(product)
        }
      },

      // Check if product is in wishlist
      isInWishlist: (productId) => {
        return get().items.some(item => item.productId === productId)
      },

      // Get wishlist item by product ID
      getWishlistItem: (productId) => {
        return get().items.find(item => item.productId === productId)
      },
    }),
    {
      name: 'ozo-wishlist-storage',
      partialize: (state) => ({
        items: state.items,
      }),
    }
  )
)