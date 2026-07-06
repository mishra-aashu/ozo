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
      fetchWishlist: async (options = {}) => {
        try {
          const user = useAuthStore.getState().user
          if (!user) {
            set({ items: [] })
            return { success: true, data: [] }
          }

          set({ isLoading: true })

          let query = supabase
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

          if (options.signal) {
            query = query.abortSignal(options.signal)
          }

          const { data, error } = await query

          if (error) throw error

          const wishlistItems = (data || [])
            .filter(item => item && item.product)
            .map(item => ({
              id: item.id,
              productId: item.product.id,
              name: item.product.name,
              slug: item.product.slug,
              price: parseFloat(item.product.price),
              mrp: parseFloat(item.product.mrp),
              discountPercentage: parseFloat(item.product.discount_percentage || 0),
              image: item.product.image_url,
              unit: item.product.unit,
              isAvailable: item.product.is_available,
              quantityAvailable: item.product.quantity_available,
              brand: item.product.brand,
              addedAt: item.created_at,
            }))

          set({ items: wishlistItems, isLoading: false })
          return { success: true, data: wishlistItems }
        } catch (error) {
          if (error.name === 'AbortError' || error.message?.includes('aborted')) {
            console.log('Fetch wishlist request aborted.')
            return { success: false, error, aborted: true }
          }
          console.error('Fetch wishlist error:', error)
          set({ isLoading: false })
          return { success: false, error }
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
            isAvailable: product.is_available,
            quantityAvailable: product.quantity_available,
            brand: product.brand,
            addedAt: new Date().toISOString(),
          }

          const previousItems = get().items

          // Optimistically update
          set({ items: [...previousItems, newItem] })
          toast.success('Added to wishlist')

          // Perform network request in background
          supabase
            .from('wishlist')
            .insert([
              {
                user_id: user.id,
                product_id: product.id,
              },
            ])
            .select()
            .single()
            .then(({ data, error }) => {
              if (error) {
                console.error('Add to wishlist background error:', error)
                // Rollback
                set({ items: previousItems })
                toast.error('Failed to add to wishlist')
              } else {
                // Update temp ID with real db ID
                set({
                  items: get().items.map(item =>
                    item.id === tempId ? { ...item, id: data.id, addedAt: data.created_at } : item
                  ),
                })
              }
            })

          return { success: true }
        } catch (error) {
          console.error('Add to wishlist error:', error)
          toast.error('Failed to add to wishlist')
          return { success: false, error }
        }
      },

      // Remove from wishlist
      removeFromWishlist: async (wishlistItemId) => {
        try {
          const item = get().items.find(i => i.id === wishlistItemId)
          if (!item) return { success: false }

          const previousItems = get().items

          // Optimistically update state
          set({
            items: get().items.filter(i => i.id !== wishlistItemId),
          })
          toast.success('Removed from wishlist')

          const user = useAuthStore.getState().user
          if (!user) return { success: false }

          // Perform network request in background
          const deleteQuery = wishlistItemId.toString().startsWith('temp-')
            ? supabase
                .from('wishlist')
                .delete()
                .eq('user_id', user.id)
                .eq('product_id', item.productId)
            : supabase
                .from('wishlist')
                .delete()
                .eq('id', wishlistItemId)

          deleteQuery.then(({ error }) => {
            if (error) {
              console.error('Remove from wishlist background error:', error)
              // Rollback
              set({ items: previousItems })
              toast.error('Failed to remove from wishlist')
            }
          })

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

          const previousItems = get().items

          // Optimistically update state
          set({
            items: get().items.filter(item => item.productId !== productId),
          })

          supabase
            .from('wishlist')
            .delete()
            .eq('user_id', user.id)
            .eq('product_id', productId)
            .then(({ error }) => {
              if (error) {
                console.error('Remove from wishlist background error:', error)
                // Rollback
                set({ items: previousItems })
              }
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
          if (!user) return { success: false }

          const previousItems = get().items

          // Optimistically clear
          set({ items: [] })
          toast.success('Wishlist cleared')

          supabase
            .from('wishlist')
            .delete()
            .eq('user_id', user.id)
            .then(({ error }) => {
              if (error) {
                console.error('Clear wishlist background error:', error)
                // Rollback
                set({ items: previousItems })
                toast.error('Failed to clear wishlist')
              }
            })

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

if (typeof window !== 'undefined') {
  window.addEventListener('ozo-auth-signout', (e) => {
    if (e.detail?.reason !== 'session_expired') {
      useWishlistStore.getState().clearWishlist().catch(() => {})
    }
  })
}