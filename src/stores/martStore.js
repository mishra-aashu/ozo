import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { useAuthStore } from './authStore'

export const useMartStore = create((set, get) => {
  let ordersSubscription = null

  return {
    // State
    currentMart: null,
    marts: [],
    liveOrders: [],
    pastOrders: [],
    inventory: [],
    inventoryTotalCount: 0,
    isLoadingOrders: false,
    isLoadingPastOrders: false,
    isLoadingInventory: false,
    isLoadingMarts: false,
    activeTab: 'incoming', // 'incoming', 'preparing', 'ready'
    notificationSoundEnabled: true,
    
    // Application state
    martApplication: null,
    isLoadingApplication: false,
    submittingApplication: false,

    // Actions
    setCurrentMart: (mart) => {
      get().unsubscribeFromOrders()
      set({ currentMart: mart })
      if (mart) {
        get().fetchLiveOrders()
        get().fetchPastOrders()
        get().fetchInventory()
        get().subscribeToOrders()
      }
    },

    setNotificationSoundEnabled: (enabled) => {
      set({ notificationSoundEnabled: enabled })
    },

    setActiveTab: (tab) => {
      set({ activeTab: tab })
    },

    // Fetch all available marts
    fetchMarts: async () => {
      try {
        set({ isLoadingMarts: true })
        const { data, error } = await supabase
          .from('marts')
          .select('*')
          .order('name')

        if (error) throw error

        set({ marts: data || [], isLoadingMarts: false })
        
        // Find matching mart by owner_id, fallback to application store_name or user's full_name
        const user = useAuthStore.getState().user
        let matchingMart = null
        if (user) {
          matchingMart = data?.find(m => m.owner_id === user.id)
        }
        
        if (!matchingMart) {
          const app = get().martApplication
          const userProfile = useAuthStore.getState().profile
          const targetName = app?.store_name || userProfile?.full_name || ''
          
          matchingMart = data?.find(m => 
            m.name.toLowerCase() === targetName.toLowerCase()
          )
        }
        
        if (matchingMart) {
          get().setCurrentMart(matchingMart)
        } else {
          set({ currentMart: null })
        }
      } catch (error) {
        console.error('Fetch marts error:', error)
        set({ isLoadingMarts: false })
      }
    },

    // Toggle mart status between Live and Offline
    toggleMartStatus: async () => {
      const { currentMart } = get()
      if (!currentMart) return { success: false, error: 'No mart selected' }

      const newStatus = !currentMart.is_active
      try {
        const { error } = await supabase
          .from('marts')
          .update({ is_active: newStatus })
          .eq('id', currentMart.id)

        if (error) throw error

        const updatedMart = { ...currentMart, is_active: newStatus }
        
        set(state => ({
          currentMart: updatedMart,
          marts: state.marts.map(m => m.id === currentMart.id ? updatedMart : m)
        }))

        toast.success(newStatus ? 'Mart is now Live/Online' : 'Mart is now Offline/Closed')
        return { success: true }
      } catch (error) {
        console.error('Error toggling mart status:', error)
        toast.error('Failed to change mart status')
        return { success: false, error }
      }
    },

    // Fetch live orders for the current mart
    fetchLiveOrders: async () => {
      const { currentMart } = get()
      if (!currentMart) return

      try {
        set({ isLoadingOrders: true })

        // Fetch orders that are in live stages (CONFIRMED_SYSTEM, confirmed, preparing, packed)
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
              product_id,
              product_name,
              product_image,
              quantity,
              unit_price,
              total_price,
              is_packed,
              packed_quantity,
              is_cancelled,
              products (
                price,
                barcode,
                slug
              )
            ),
            user:users (
              full_name,
              phone
            )
          `)
          .eq('mart_id', currentMart.id)
          .in('status', ['CONFIRMED_SYSTEM', 'confirmed', 'preparing', 'packed', 'DELIVERED_VERIFYING'])
          .order('created_at', { ascending: false })

        if (error) throw error

        const formatted = data.map(order => {
          const items = (order.order_items || []).map(item => {
            const rawSellingPrice = item.products?.price !== null && item.products?.price !== undefined
              ? parseFloat(item.products.price)
              : parseFloat(item.unit_price)
            return {
              ...item,
              unit_price: rawSellingPrice,
              total_price: rawSellingPrice * item.quantity,
              barcode: item.products?.barcode || '',
              product_slug: item.products?.slug || '',
              checked: item.is_packed || false,
              packed_quantity: item.packed_quantity || 0,
              is_cancelled: item.is_cancelled || false
            }
          })
          const subtotal = items.filter(item => !item.is_cancelled).reduce((sum, item) => sum + item.total_price, 0)
          const total = Math.max(0, subtotal + parseFloat(order.delivery_fee || 0) - parseFloat(order.discount || 0))
          return {
            ...order,
            subtotal,
            delivery_fee: parseFloat(order.delivery_fee || 0),
            discount: parseFloat(order.discount || 0),
            total,
            order_items: items
          }
        })

        set({ liveOrders: formatted, isLoadingOrders: false })
      } catch (error) {
        console.error('Fetch live orders error:', error)
        set({ isLoadingOrders: false })
      }
    },

    // Fetch past/completed and cancelled orders for the current mart
    fetchPastOrders: async () => {
      const { currentMart } = get()
      if (!currentMart) return

      try {
        set({ isLoadingPastOrders: true })

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
              product_id,
              product_name,
              product_image,
              quantity,
              unit_price,
              total_price,
              is_cancelled,
              products (
                price,
                slug
              )
            ),
            user:users (
              full_name,
              phone
            )
          `)
          .eq('mart_id', currentMart.id)
          .in('status', ['delivered', 'cancelled', 'DELIVERED_VERIFYING', 'COMPLETED', 'CANCELLED_BY_USER', 'RETURN_REQUESTED'])
          .order('created_at', { ascending: false })

        if (error) throw error

        const formatted = data.map(order => {
          const items = (order.order_items || []).map(item => {
            const rawSellingPrice = item.products?.price !== null && item.products?.price !== undefined
              ? parseFloat(item.products.price)
              : parseFloat(item.unit_price)
            return {
              ...item,
              unit_price: rawSellingPrice,
              total_price: rawSellingPrice * item.quantity,
              product_slug: item.products?.slug || '',
              is_cancelled: item.is_cancelled || false
            }
          })
          const subtotal = items.filter(item => !item.is_cancelled).reduce((sum, item) => sum + item.total_price, 0)
          const total = Math.max(0, subtotal + parseFloat(order.delivery_fee || 0) - parseFloat(order.discount || 0))
          return {
            ...order,
            subtotal,
            delivery_fee: parseFloat(order.delivery_fee || 0),
            discount: parseFloat(order.discount || 0),
            total,
            order_items: items,
            user: {
              full_name: 'Ozo Customer',
              phone: 'N/A'
            },
            address: null
          }
        })

        set({ pastOrders: formatted, isLoadingPastOrders: false })
      } catch (error) {
        console.error('Fetch past orders error:', error)
        set({ isLoadingPastOrders: false })
      }
    },

    // Toggle checked status of an item in the checklist (persists to Supabase)
    toggleCheckItem: async (orderId, itemId) => {
      // Find current item to toggle
      let targetItem = null;
      const liveOrders = get().liveOrders;
      for (const order of liveOrders) {
        if (order.id === orderId) {
          targetItem = order.order_items.find(i => i.id === itemId);
          break;
        }
      }
      if (!targetItem) return;

      const newChecked = !targetItem.checked;
      const newPackedQty = newChecked ? targetItem.quantity : 0;

      // Update local state first for instant response
      set({
        liveOrders: liveOrders.map(order => {
          if (order.id !== orderId) return order
          return {
            ...order,
            order_items: order.order_items.map(item => 
              item.id === itemId ? { ...item, checked: newChecked, packed_quantity: newPackedQty } : item
            )
          }
        })
      });

      // Update Supabase in background
      try {
        const { error } = await supabase
          .from('order_items')
          .update({
            is_packed: newChecked,
            packed_quantity: newPackedQty
          })
          .eq('id', itemId);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to update order item packed status:', err);
      }
    },

    // Increment/update packed quantity of a specific item (persists to Supabase)
    updateItemPackedQuantity: async (orderId, itemId, newQty) => {
      let targetItem = null;
      const liveOrders = get().liveOrders;
      for (const order of liveOrders) {
        if (order.id === orderId) {
          targetItem = order.order_items.find(i => i.id === itemId);
          break;
        }
      }
      if (!targetItem) return;

      const isPacked = newQty >= targetItem.quantity;

      // Update local state first
      set({
        liveOrders: liveOrders.map(order => {
          if (order.id !== orderId) return order
          return {
            ...order,
            order_items: order.order_items.map(item => 
              item.id === itemId ? { ...item, checked: isPacked, packed_quantity: newQty } : item
            )
          }
        })
      });

      // Update Supabase
      try {
        const { error } = await supabase
          .from('order_items')
          .update({
            is_packed: isPacked,
            packed_quantity: newQty
          })
          .eq('id', itemId);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to update packed quantity:', err);
      }
    },

    // Accept Incoming Order
    acceptOrder: async (orderId) => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .update({
            status: 'preparing',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
          .select()

        if (error) throw error

        // Update local status
        set({
          liveOrders: get().liveOrders.map(order => 
            order.id === orderId ? { ...order, status: 'preparing' } : order
          )
        })

        toast.success('Order Accepted! Start preparing items.')
      } catch (error) {
        console.error('Accept order error:', error)
        toast.error('Failed to accept order')
      }
    },

    // Reject Incoming Order
    rejectOrder: async (orderId, reason) => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .update({
            status: 'CANCELLED_BY_MART',
            cancellation_reason: reason,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
          .select('id')

        if (error) throw error
        if (!data || data.length === 0) throw new Error('Order update failed — no rows affected. Check permissions.')

        // Update local status by filtering out from live orders
        set({
          liveOrders: get().liveOrders.filter(order => order.id !== orderId)
        })

        toast.success('Order rejected successfully.')
        return { success: true }
      } catch (error) {
        console.error('Reject order error:', error)
        toast.error(error?.message || 'Failed to reject order')
        return { success: false, error }
      }
    },

    // Cancel a specific item in an order (Mark as Unavailable)
    cancelOrderItem: async (orderId, itemId) => {
      try {
        // Set item as cancelled in Supabase
        const { data: updatedItem, error } = await supabase
          .from('order_items')
          .update({ is_cancelled: true })
          .eq('id', itemId)
          .select('id');

        if (error) throw error;
        if (!updatedItem || updatedItem.length === 0) {
          throw new Error('Item update failed — no rows affected. Check permissions.');
        }

        // Recalculate local order total after cancelling item
        const liveOrders = get().liveOrders;
        const updatedOrders = liveOrders.map(order => {
          if (order.id !== orderId) return order;

          const updatedItems = order.order_items.map(item => 
            item.id === itemId ? { ...item, is_cancelled: true, checked: false } : item
          );

          // Calculate subtotal from non-cancelled items
          const subtotal = updatedItems
            .filter(item => !item.is_cancelled)
            .reduce((sum, item) => sum + item.total_price, 0);

          // If all items are cancelled, we should auto-cancel the whole order!
          const allCancelled = updatedItems.every(item => item.is_cancelled);
          
          let status = order.status;
          if (allCancelled) {
            status = 'CANCELLED_BY_MART';
            // Trigger order status update in background to notify and restore stock
            supabase
              .from('orders')
              .update({
                status: 'CANCELLED_BY_MART',
                cancellation_reason: 'All items marked unavailable by store.',
                updated_at: new Date().toISOString()
              })
              .eq('id', orderId)
              .select('id')
              .then(({ data: d, error: orderErr }) => {
                if (orderErr) console.error('Failed to auto-cancel order:', orderErr);
                if (!d?.length) console.error('Auto-cancel order: 0 rows affected');
              });
          } else {
            // Recalculate order total in DB as well!
            const newTotal = Math.max(0, subtotal + parseFloat(order.delivery_fee || 0) - parseFloat(order.discount || 0));
            supabase
              .from('orders')
              .update({
                subtotal: subtotal,
                total: newTotal,
                updated_at: new Date().toISOString()
              })
              .eq('id', orderId)
              .select('id')
              .then(({ data: d, error: totalErr }) => {
                if (totalErr) console.error('Failed to update order totals:', totalErr);
                if (!d?.length) console.error('Update order totals: 0 rows affected');
              });
          }

          const newTotal = Math.max(0, subtotal + parseFloat(order.delivery_fee || 0) - parseFloat(order.discount || 0));
          return {
            ...order,
            status,
            subtotal,
            total: newTotal,
            order_items: updatedItems
          };
        });

        // Filter out if order became CANCELLED_BY_MART
        set({
          liveOrders: updatedOrders.filter(o => o.status !== 'CANCELLED_BY_MART')
        });

        toast.success('Item marked as unavailable. Order total updated.');
        return { success: true };
      } catch (err) {
        console.error('Failed to cancel order item:', err);
        toast.error(err?.message || 'Failed to mark item unavailable');
        return { success: false, error: err };
      }
    },

    // Mark Order as Packed / Ready
    packOrder: async (orderId) => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .update({
            status: 'packed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
          .select()

        if (error) throw error

        // Update local status
        set({
          liveOrders: get().liveOrders.map(order => 
            order.id === orderId ? { ...order, status: 'packed' } : order
          )
        })

        toast.success('Order packed and marked ready for pickup!')
      } catch (error) {
        console.error('Pack order error:', error)
        toast.error('Failed to update order status')
      }
    },

    // Request self delivery from admin (updates instructions and requests address details)
    requestSelfDelivery: async (orderId) => {
      try {
        const order = get().liveOrders.find(o => o.id === orderId)
        if (!order) return

        if (order.delivery_instructions?.includes('[SELF_DELIVERY_REQUESTED]')) {
          toast.success('Self-delivery details already requested! Admin has been notified.')
          return
        }

        const newInstructions = `[SELF_DELIVERY_REQUESTED] ${order.delivery_instructions || ''}`.trim()

        const { error } = await supabase
          .from('orders')
          .update({
            delivery_instructions: newInstructions,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)

        if (error) throw error

        // Update local state
        set({
          liveOrders: get().liveOrders.map(o => 
            o.id === orderId ? { ...o, delivery_instructions: newInstructions } : o
          )
        })

        toast.success('Self-delivery request sent to Admin!')
      } catch (error) {
        console.error('Request self delivery error:', error)
        toast.error('Failed to send request')
      }
    },

    // Verify OTP code for delivery
    verifyOrderOtp: async (orderId, otp) => {
      try {
        const { data, error } = await supabase
          .rpc('verify_order_otp', {
            p_order_id: orderId,
            p_otp: otp
          })

        if (error) throw error

        // Update local state by removing/completing it
        set((state) => ({
          liveOrders: state.liveOrders.filter(o => o.id !== orderId)
        }))
        
        get().fetchPastOrders()
        toast.success('Order completed successfully!')
        return { success: true }
      } catch (error) {
        console.error('Verify OTP error:', error)
        toast.error(error.message || 'Invalid verification code')
        return { success: false, error }
      }
    },

    // Real-time Subscriptions Setup
    subscribeToOrders: () => {
      if (ordersSubscription) return

      const { currentMart } = get()
      if (!currentMart) return

      ordersSubscription = supabase
        .channel(`mart-orders-channel-${currentMart.id}`)
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'orders',
            filter: `mart_id=eq.${currentMart.id}`
          },
          async (payload) => {
            const { eventType, new: newRecord, old: oldRecord } = payload

            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              const liveStatuses = ['CONFIRMED_SYSTEM', 'confirmed', 'preparing', 'packed', 'DELIVERED_VERIFYING']
              const isLive = liveStatuses.includes(newRecord.status)

              if (isLive) {
                // Fetch full order details including relations
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
                      product_id,
                      product_name,
                      product_image,
                      quantity,
                      unit_price,
                      total_price,
                      is_packed,
                      packed_quantity,
                      is_cancelled,
                      products (
                        price,
                        barcode,
                        slug
                      )
                    ),
                    user:users (
                      full_name,
                      phone
                    )
                  `)
                  .eq('id', newRecord.id)
                  .single()

                if (!error && data) {
                  const items = (data.order_items || []).map(item => {
                    const rawSellingPrice = item.products?.price !== null && item.products?.price !== undefined
                      ? parseFloat(item.products.price)
                      : parseFloat(item.unit_price)
                    return {
                      ...item,
                      unit_price: rawSellingPrice,
                      total_price: rawSellingPrice * item.quantity,
                      barcode: item.products?.barcode || '',
                      product_slug: item.products?.slug || '',
                      checked: item.is_packed || false,
                      packed_quantity: item.packed_quantity || 0,
                      is_cancelled: item.is_cancelled || false
                    }
                  })
                  const subtotal = items.filter(item => !item.is_cancelled).reduce((sum, item) => sum + item.total_price, 0)
                  const total = Math.max(0, subtotal + parseFloat(data.delivery_fee || 0) - parseFloat(data.discount || 0))
                  
                  const formatted = {
                    ...data,
                    subtotal,
                    delivery_fee: parseFloat(data.delivery_fee || 0),
                    discount: parseFloat(data.discount || 0),
                    total,
                    order_items: items
                  }

                  // Update liveOrders list
                  set((state) => {
                    const exists = state.liveOrders.some(o => o.id === formatted.id)
                    let updated = []
                    if (exists) {
                      updated = state.liveOrders.map(o => o.id === formatted.id ? formatted : o)
                    } else {
                      updated = [formatted, ...state.liveOrders]
                      // Play notification sound for new incoming order
                      if (get().notificationSoundEnabled && (formatted.status === 'CONFIRMED_SYSTEM' || formatted.status === 'confirmed')) {
                        get().playAlertSound()
                      }
                    }
                    return { liveOrders: updated }
                  })
                }
              } else {
                // If the order has transitioned out of live stages (e.g. dispatched/delivered), remove it
                set((state) => ({
                  liveOrders: state.liveOrders.filter(o => o.id !== newRecord.id)
                }))
                get().fetchPastOrders()
              }
            } else if (eventType === 'DELETE') {
              set((state) => ({
                liveOrders: state.liveOrders.filter(o => o.id !== oldRecord.id)
              }))
            }
          }
        )
        .subscribe()
    },

    unsubscribeFromOrders: () => {
      if (ordersSubscription) {
        supabase.removeChannel(ordersSubscription)
        ordersSubscription = null
      }
    },

    playAlertSound: () => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        if (audioContext.state === 'suspended') {
          audioContext.resume()
        }
        const playTone = (freq, duration, delay) => {
          setTimeout(() => {
            const osc = audioContext.createOscillator()
            const gain = audioContext.createGain()
            osc.connect(gain)
            gain.connect(audioContext.destination)
            osc.type = 'sine'
            osc.frequency.setValueAtTime(freq, audioContext.currentTime)
            gain.gain.setValueAtTime(0.12, audioContext.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.005, audioContext.currentTime + duration - 0.02)
            osc.start()
            osc.stop(audioContext.currentTime + duration)
          }, delay)
        }
        
        // Premium bright double ring-ring alarm sequence:
        // Ring 1
        playTone(880.00, 0.12, 0)
        playTone(1100.00, 0.12, 0)
        playTone(880.00, 0.12, 140)
        playTone(1100.00, 0.12, 140)
        
        // Ring 2
        playTone(880.00, 0.12, 380)
        playTone(1100.00, 0.12, 380)
        playTone(880.00, 0.12, 520)
        playTone(1100.00, 0.12, 520)

        // Resolve chime
        playTone(1046.50, 0.3, 760)
        playTone(1318.51, 0.3, 760)
      } catch (err) {
        console.warn('Audio feedback failed to play', err)
      }
    },

    // Fetch Mart inventory (products) with server-side pagination & search
    fetchInventory: async (page = 1, pageSize = 20, search = '', lowStockOnly = false, categoryId = '', availabilityStatus = 'all') => {
      const { currentMart } = get()
      if (!currentMart) return

      try {
        set({ isLoadingInventory: true })

        // Fetch count of mart inventory products matching search criteria via HEAD query
        let countQuery = supabase
          .from('mart_inventory')
          .select('*, products!inner(*)', { count: 'exact', head: true })
          .eq('mart_id', currentMart.id)

        if (lowStockOnly) {
          countQuery = countQuery.lt('stock_quantity', 5)
        }
        if (search) {
          countQuery = countQuery.or(`name.ilike.%${search}%,brand.ilike.%${search}%,barcode.ilike.%${search}%`, { foreignTable: 'products' })
        }
        if (categoryId) {
          countQuery = countQuery.eq('products.category_id', categoryId)
        }
        if (availabilityStatus === 'in_stock') {
          countQuery = countQuery.eq('is_available', true)
        } else if (availabilityStatus === 'out_of_stock') {
          countQuery = countQuery.eq('is_available', false)
        }

        const { count, error: countError } = await countQuery
        if (countError) throw countError

        // Fetch mart inventory products matching search criteria for current page
        let query = supabase
          .from('mart_inventory')
          .select(`
            id,
            mart_id,
            product_id,
            stock_quantity,
            mart_price,
            mart_mrp,
            is_available,
            updated_at,
            custom_image_url,
            products!inner(
              id,
              name,
              slug,
              brand,
              unit,
              image_url,
              mrp,
              price,
              blinkit_product_id,
              barcode,
              category_id
            )
          `)
          .eq('mart_id', currentMart.id)

        if (lowStockOnly) {
          query = query.lt('stock_quantity', 5)
        }
        if (search) {
          query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%,barcode.ilike.%${search}%`, { foreignTable: 'products' })
        }
        if (categoryId) {
          query = query.eq('products.category_id', categoryId)
        }
        if (availabilityStatus === 'in_stock') {
          query = query.eq('is_available', true)
        } else if (availabilityStatus === 'out_of_stock') {
          query = query.eq('is_available', false)
        }

        // Order by products.name
        query = query.order('name', { foreignTable: 'products' })

        // Apply range for pagination
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        query = query.range(from, to)

        const { data, error } = await query

        if (error) throw error

        const formatted = (data || []).map(item => ({
          id: item.products.id, // product UUID
          inventory_id: item.id,
          name: item.products.name,
          brand: item.products.brand,
          unit: item.products.unit,
          image_url: item.custom_image_url || item.products.image_url,
          // override price and mrp with mart-specific data, fallback to global prices
          price: parseFloat(item.mart_price !== null && item.mart_price !== undefined ? item.mart_price : item.products.price),
          mrp: parseFloat(item.mart_mrp !== null && item.mart_mrp !== undefined ? item.mart_mrp : item.products.mrp),
          is_available: item.is_available !== false,
          stock_quantity: item.stock_quantity,
          blinkit_product_id: item.products.blinkit_product_id,
          barcode: item.products.barcode,
          category_id: item.products.category_id
        }))

        set({ 
          inventory: formatted, 
          inventoryTotalCount: count || 0,
          isLoadingInventory: false 
        })
      } catch (error) {
        console.error('Fetch inventory error:', error)
        set({ isLoadingInventory: false })
      }
    },

    // Toggle stock availability
    toggleStock: async (productId, isAvailable) => {
      const { currentMart } = get()
      if (!currentMart) return

      try {
        const { error } = await supabase
          .from('mart_inventory')
          .update({ is_available: isAvailable })
          .eq('mart_id', currentMart.id)
          .eq('product_id', productId)

        if (error) throw error

        // Update local state
        set({
          inventory: get().inventory.map(item => 
            item.id === productId ? { ...item, is_available: isAvailable } : item
          )
        })

        toast.success(isAvailable ? 'Product back in stock!' : 'Product marked out of stock!')
      } catch (error) {
        console.error('Toggle stock error:', error)
        toast.error('Failed to update product availability')
      }
    },

    // Update product price
    updatePrice: async (productId, price) => {
      const { currentMart } = get()
      if (!currentMart) return

      try {
        const numericPrice = parseFloat(price)
        if (isNaN(numericPrice) || numericPrice <= 0) {
          toast.error('Invalid price amount')
          return
        }

        const { error } = await supabase
          .from('mart_inventory')
          .update({ mart_price: numericPrice })
          .eq('mart_id', currentMart.id)
          .eq('product_id', productId)

        if (error) throw error

        // Update local state
        set({
          inventory: get().inventory.map(item => 
            item.id === productId ? { ...item, price: numericPrice } : item
          )
        })

        toast.success('Price updated successfully!')
      } catch (error) {
        console.error('Update price error:', error)
        toast.error('Failed to update product price')
      }
    },

    // Update product stock quantity
    updateStockQuantity: async (productId, quantity) => {
      const { currentMart } = get()
      if (!currentMart) return

      try {
        const numericQty = parseInt(quantity)
        if (isNaN(numericQty) || numericQty < 0) {
          toast.error('Invalid stock quantity')
          return
        }

        const isAvailable = numericQty > 0;

        const { error } = await supabase
          .from('mart_inventory')
          .update({ 
            stock_quantity: numericQty,
            is_available: isAvailable
          })
          .eq('mart_id', currentMart.id)
          .eq('product_id', productId)

        if (error) throw error

        // Update local state
        set({
          inventory: get().inventory.map(item => 
            item.id === productId ? { ...item, stock_quantity: numericQty, is_available: isAvailable } : item
          )
        })

        toast.success('Stock quantity updated!')
      } catch (error) {
        console.error('Update stock quantity error:', error)
        toast.error('Failed to update stock quantity')
      }
    },

    // Bulk upsert inventory rows
    importInventoryRows: async (rows) => {
      const { currentMart } = get()
      if (!currentMart) {
        toast.error('No active mart selected')
        return { success: false, error: 'No active mart selected' }
      }

      try {
        set({ isLoadingInventory: true })
        const payload = rows.map(r => ({
          mart_id: currentMart.id,
          product_id: r.product_id,
          stock_quantity: parseInt(r.stock_quantity) || 0,
          mart_price: r.mart_price !== null && r.mart_price !== undefined ? parseFloat(r.mart_price) : null,
          mart_mrp: r.mart_mrp !== null && r.mart_mrp !== undefined ? parseFloat(r.mart_mrp) : null,
          is_available: r.is_available !== false,
          updated_at: new Date().toISOString()
        }))

        const { error } = await supabase
          .from('mart_inventory')
          .upsert(payload, { onConflict: 'mart_id,product_id' })

        if (error) throw error

        toast.success(`Successfully imported/updated ${rows.length} products!`)
        // Refresh inventory
        await get().fetchInventory(1, 20)
        return { success: true }
      } catch (error) {
        console.error('Import inventory error:', error)
        toast.error('Failed to import inventory rows: ' + error.message)
        set({ isLoadingInventory: false })
        return { success: false, error }
      }
    },

    // Import unmatched rows as pending products
    importPendingProducts: async (rows) => {
      const { currentMart } = get()
      if (!currentMart) {
        toast.error('No active mart selected')
        return { success: false, error: 'No active mart selected' }
      }

      try {
        set({ isLoadingInventory: true })
        const payload = rows.map(r => ({
          mart_id: currentMart.id,
          barcode: r.identifier || r.barcode,
          name: r.name,
          brand: r.brand || '',
          unit: r.unit || '1 unit',
          stock_quantity: parseInt(r.stock_quantity) || 0,
          mart_price: r.mart_price !== null && r.mart_price !== undefined ? parseFloat(r.mart_price) : null,
          mart_mrp: r.mart_mrp !== null && r.mart_mrp !== undefined ? parseFloat(r.mart_mrp) : null,
          raw_csv_data: r,
          enrich_status: 'pending'
        }))

        const { error } = await supabase
          .from('mart_pending_products')
          .insert(payload)

        if (error) throw error

        toast.success(`Successfully added ${rows.length} products to pending list!`)
        set({ isLoadingInventory: false })
        return { success: true }
      } catch (error) {
        console.error('Import pending products error:', error)
        toast.error('Failed to save pending products: ' + error.message)
        set({ isLoadingInventory: false })
        return { success: false, error }
      }
    },

    // Fetch pending products for the current mart
    fetchPendingProducts: async () => {
      const { currentMart } = get()
      if (!currentMart) return []
      try {
        const { data, error } = await supabase
          .from('mart_pending_products')
          .select('*')
          .eq('mart_id', currentMart.id)
          .eq('enrich_status', 'pending')
          .order('created_at', { ascending: false })
        if (error) throw error
        return data
      } catch (err) {
        console.error('Fetch pending products error:', err)
        return []
      }
    },

    // Fetch Mart Onboarding / Application
    fetchMartApplication: async () => {
      try {
        const user = useAuthStore.getState().user
        if (!user) {
          set({ martApplication: null })
          return null
        }

        set({ isLoadingApplication: true })
        const { data, error } = await supabase
          .from('mart_applications')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (error) throw error

        set({ martApplication: data, isLoadingApplication: false })
        return data
      } catch (error) {
        console.error('Fetch mart application error:', error)
        set({ isLoadingApplication: false })
        return null
      }
    },

    // Submit Mart Onboarding / Application
    submitMartApplication: async (details) => {
      const user = useAuthStore.getState().user
      if (!user) {
        toast.error('Please login to apply')
        return { success: false }
      }

      try {
        set({ submittingApplication: true })

        const payload = {
          id: user.id,
          owner_name: details.ownerName,
          store_name: details.storeName,
          phone: details.phone,
          email: user.email,
          address: details.address,
          license_number: details.licenseNumber,
          status: 'pending_verification'
        }

        const { data, error } = await supabase
          .from('mart_applications')
          .upsert([payload], { onConflict: 'id' })
          .select()
          .single()

        if (error) throw error

        set({ martApplication: data, submittingApplication: false })
        toast.success('Mart application submitted successfully!')
        return { success: true, data }
      } catch (error) {
        console.error('Submit mart application error:', error)
        toast.error(error.message || 'Failed to submit application')
        set({ submittingApplication: false })
        return { success: false, error }
      }
    }
  }
})
