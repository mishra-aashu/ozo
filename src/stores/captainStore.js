import { create } from 'zustand'
import { supabase, uploadToImgbb } from '../lib/supabase'
import { useAuthStore } from './authStore'
import { useCartStore } from './cartStore'
import toast from 'react-hot-toast'

const calculateRiderEarnings = (order) => {
  try {
    const cartStoreState = useCartStore.getState()
    const riderConfig = cartStoreState.riderConfig || { base_payout: 10, distance_bonus_per_km: 5 }
    const geofenceConfig = cartStoreState.geofenceConfig || { warehouse_lat: 24.745736, warehouse_lng: 84.390014 }

    const basePayout = parseFloat(riderConfig.base_payout) ?? 20
    const distanceBonusPerKm = parseFloat(riderConfig.distance_bonus_per_km) ?? 5

    let distance = 0

    if (order.distance !== null && order.distance !== undefined) {
      distance = parseFloat(order.distance)
    } else {
      let lat2 = null
      let lon2 = null

      if (order.latitude && order.longitude) {
        lat2 = parseFloat(order.latitude)
        lon2 = parseFloat(order.longitude)
      } else if (order.address) {
        lat2 = parseFloat(order.address.latitude)
        lon2 = parseFloat(order.address.longitude)
      }

      if (lat2 !== null && lon2 !== null && !isNaN(lat2) && !isNaN(lon2)) {
        const lat1 = parseFloat(geofenceConfig.warehouse_lat) || 24.745736
        const lon1 = parseFloat(geofenceConfig.warehouse_lng) || 84.390014

        const R = 6371
        const dLat = (lat2 - lat1) * Math.PI / 180
        const dLon = (lon2 - lon1) * Math.PI / 180
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
          Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        distance = R * c
      }
    }

    const payout = basePayout + (distance * distanceBonusPerKm)
    return parseFloat(payout.toFixed(2))
  } catch (err) {
    console.error('Error calculating rider earnings:', err)
    return parseFloat(order.delivery_fee || 0) + 15
  }
}


export const useCaptainStore = create((set, get) => {
  let radarSubscription = null
  let activeOrderSubscription = null
  let profileSubscription = null
  let assignedOrdersSubscription = null

  return {
    // State
    captainProfile: null,
    isLoadingProfile: false,
    onboardingInProgress: false,
    nearbyOrders: [],
    activeOrder: null,
    isLoadingRadar: false,
    radarSoundEnabled: true,
    completedDeliveriesCount: 0,

    setRadarSoundEnabled: (enabled) => {
      set({ radarSoundEnabled: enabled })
    },

    // Fetch completed deliveries count from DB
    fetchCompletedDeliveriesCount: async () => {
      const user = useAuthStore.getState().user
      if (!user) return
      
      try {
        const { count, error } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('rider_id', user.id)
          .in('status', ['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'])
          
        if (!error) {
          set({ completedDeliveriesCount: count || 0 })
        }
      } catch (err) {
        console.error('Error fetching completed deliveries count:', err)
      }
    },

    // Fetch captain profile
    fetchProfile: async () => {
      try {
        const user = useAuthStore.getState().user
        if (!user) {
          set({ captainProfile: null })
          return null
        }

        set({ isLoadingProfile: true })

        const { data, error } = await supabase
          .from('captains')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (error) throw error

        set({ captainProfile: data, isLoadingProfile: false })

        // Fetch completed deliveries count in parallel
        get().fetchCompletedDeliveriesCount()

        if (data) {
          get().subscribeToProfile(data.id)
          get().subscribeToAssignedOrders(data.id)
        }
        
        // If they have an active assigned/dispatched order, load it
        if (data && (data.status === 'online' || data.status === 'busy' || data.status === 'approved' || data.status === 'offline')) {
          get().fetchActiveOrder()
        }

        return data
      } catch (error) {
        console.error('Fetch captain profile error:', error)
        set({ isLoadingProfile: false })
        return null
      }
    },

    // Submit onboarding documents
    submitOnboarding: async (details, files) => {
      const user = useAuthStore.getState().user
      if (!user) {
        toast.error('Please login to onboard')
        return { success: false }
      }

      try {
        set({ onboardingInProgress: true })

        const uploadFile = async (file, fieldName) => {
          if (!file) return null
          if (typeof file === 'string' && (file.startsWith('http://') || file.startsWith('https://'))) {
            return file
          }
          const customName = `captain_${user.id}_${fieldName}_${Date.now()}`
          const { url, error: uploadError } = await uploadToImgbb(file, customName)

          if (uploadError) throw uploadError
          return url
        }

        // Upload documents
        const aadharPath = await uploadFile(files.aadharCard, 'aadhar')
        const dlPath = await uploadFile(files.drivingLicense, 'license')
        const selfiePath = await uploadFile(files.selfie, 'selfie')

        const payload = {
          id: user.id,
          full_name: details.fullName,
          phone: details.phone,
          whatsapp: details.whatsapp,
          emergency_contact: details.emergencyContact,
          aadhar_number: details.aadharNumber,
          driving_license: details.drivingLicenseNumber,
          bike_number: details.bikeNumber,
          aadhar_card_url: aadharPath,
          driving_license_url: dlPath,
          selfie_url: selfiePath,
          status: 'pending_verification'
        }

        const { data, error } = await supabase
          .from('captains')
          .upsert([payload], { onConflict: 'id' })
          .select()
          .single()

        if (error) throw error

        set({ captainProfile: data, onboardingInProgress: false })
        toast.success('Documents submitted for verification!')
        return { success: true, data }
      } catch (error) {
        console.error('Onboarding submission error:', error)
        toast.error(error.message || 'Failed to submit onboarding documents')
        set({ onboardingInProgress: false })
        return { success: false, error }
      }
    },

    // Toggle duty state (online/offline)
    toggleDuty: async () => {
      const { captainProfile } = get()
      if (!captainProfile) return

      const newStatus = captainProfile.status === 'online' ? 'offline' : 'online'

      try {
        const { data, error } = await supabase
          .from('captains')
          .update({ status: newStatus })
          .eq('id', captainProfile.id)
          .select()
          .single()

        if (error) throw error

        set({ captainProfile: data })
        toast.success(`You are now ${newStatus === 'online' ? 'Online 🟢' : 'Offline 🔴'}`)

        if (newStatus === 'online') {
          get().fetchNearbyOrders()
          get().subscribeToRadar()
        } else {
          get().unsubscribeFromRadar()
        }
      } catch (error) {
        console.error('Toggle duty error:', error)
        toast.error('Failed to change duty status')
      }
    },

    // Fetch packed orders waiting for rider pickup
    fetchNearbyOrders: async () => {
      try {
        set({ isLoadingRadar: true })
        
        // Find orders that are packed and have no rider assigned yet
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            address:addresses (*),
            order_items (*),
            user:users (full_name)
          `)
          .eq('status', 'packed')
          .is('rider_id', null)
          .order('created_at', { ascending: true })

        if (error) throw error

        const formatted = (data || []).map(order => ({
          ...order,
          subtotal: parseFloat(order.subtotal),
          delivery_fee: parseFloat(order.delivery_fee),
          total: parseFloat(order.total),
          estimatedEarnings: calculateRiderEarnings(order)
        }))

        set({ nearbyOrders: formatted, isLoadingRadar: false })
      } catch (error) {
        console.error('Fetch nearby orders error:', error)
        set({ isLoadingRadar: false })
      }
    },

    // Fetch currently accepted active order
    fetchActiveOrder: async () => {
      const { captainProfile } = get()
      if (!captainProfile) return

      try {
        // Find orders where status is assigned or dispatched (picked_up) and belongs to this rider
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            address:addresses (*),
            order_items (*),
            user:users (full_name, phone)
          `)
          .in('status', ['assigned', 'dispatched'])
          .eq('rider_id', captainProfile.id)
          .maybeSingle()

        if (error) throw error

        if (data) {
          const formatted = {
            ...data,
            subtotal: parseFloat(data.subtotal),
            delivery_fee: parseFloat(data.delivery_fee),
            total: parseFloat(data.total),
            estimatedEarnings: calculateRiderEarnings(data)
          }
          set({ activeOrder: formatted })
          get().subscribeToActiveOrder(data.id)
        } else {
          set({ activeOrder: null })
        }
      } catch (error) {
        console.error('Fetch active order error:', error)
      }
    },

    // Accept Order (Swipe to Accept)
    acceptOrder: async (orderId) => {
      const { captainProfile } = get()
      if (!captainProfile) return { success: false }

      try {
        // First check if another rider has already grabbed this order
        const { data: currentOrder, error: checkError } = await supabase
          .from('orders')
          .select('rider_id, status')
          .eq('id', orderId)
          .single()

        if (checkError) throw checkError
        if (currentOrder.rider_id) {
          toast.error('Too late! Another captain accepted this order.')
          get().fetchNearbyOrders()
          return { success: false }
        }

        // Assign to captain and set status to 'assigned'
        const { data, error } = await supabase
          .from('orders')
          .update({
            status: 'assigned',
            rider_id: captainProfile.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .select(`
            *,
            address:addresses (*),
            order_items (*),
            user:users (full_name, phone)
          `)
          .single()

        if (error) throw error

        // Also update captain status to busy
        await supabase
          .from('captains')
          .update({ status: 'busy' })
          .eq('id', captainProfile.id)

        const formatted = {
          ...data,
          subtotal: parseFloat(data.subtotal),
          delivery_fee: parseFloat(data.delivery_fee),
          total: parseFloat(data.total),
          estimatedEarnings: calculateRiderEarnings(data)
        }

        // Update local state
        set((state) => ({
          activeOrder: formatted,
          nearbyOrders: state.nearbyOrders.filter(o => o.id !== orderId),
          captainProfile: { ...state.captainProfile, status: 'busy' }
        }))

        // Setup channel for active order updates
        get().subscribeToActiveOrder(orderId)

        toast.success('Order accepted! Drive safe.')
        return { success: true }
      } catch (error) {
        console.error('Accept order error:', error)
        toast.error('Failed to accept order')
        return { success: false }
      }
    },

    // Confirm Arrival at Store
    arriveAtMart: async () => {
      const { activeOrder } = get()
      if (!activeOrder) return

      try {
        const { data, error } = await supabase
          .from('orders')
          .update({
            status: 'preparing_order',
            updated_at: new Date().toISOString()
          })
          .eq('id', activeOrder.id)
          .select(`
            *,
            address:addresses (*),
            order_items (*),
            user:users (full_name, phone)
          `)
          .single()

        if (error) throw error

        const formatted = {
          ...data,
          subtotal: parseFloat(data.subtotal),
          delivery_fee: parseFloat(data.delivery_fee),
          total: parseFloat(data.total),
          estimatedEarnings: calculateRiderEarnings(data)
        }

        set({ activeOrder: formatted })
        toast.success('Arrival confirmed. Open bag and check items.')
      } catch (err) {
        console.error('Confirm arrival at mart error:', err)
        toast.error('Failed to confirm arrival at mart')
      }
    },

    // Mark items picked up & out for delivery (Swipe to Pickup)
    confirmPickup: async () => {
      const { activeOrder } = get()
      if (!activeOrder) return

      try {
        const { data, error } = await supabase
          .from('orders')
          .update({
            status: 'dispatched', // Out for delivery
            updated_at: new Date().toISOString()
          })
          .eq('id', activeOrder.id)
          .select(`
            *,
            address:addresses (*),
            order_items (*),
            user:users (full_name, phone)
          `)
          .single()

        if (error) throw error

        const formatted = {
          ...data,
          subtotal: parseFloat(data.subtotal),
          delivery_fee: parseFloat(data.delivery_fee),
          total: parseFloat(data.total),
          estimatedEarnings: calculateRiderEarnings(data)
        }

        set({ activeOrder: formatted })
        toast.success('Order Picked Up! Navigate to delivery location.')
      } catch (error) {
        console.error('Confirm pickup error:', error)
        toast.error('Failed to update status to Picked Up')
      }
    },

    // Deliver Order (Swipe to Deliver)
    deliverOrder: async (proofImage1, proofImage2) => {
      const { activeOrder, captainProfile } = get()
      if (!activeOrder || !captainProfile) return

      try {
        // Complete the order transaction
        const { data, error } = await supabase
          .from('orders')
          .update({
            status: 'DELIVERED_VERIFYING',
            payment_status: 'paid', // Mark paid
            delivered_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            delivery_proof_image_1: proofImage1,
            delivery_proof_image_2: proofImage2
          })
          .eq('id', activeOrder.id)
          .select()
          .single()

        if (error) throw error

        // Update captain profile state back to online (earnings and cash-in-hand are calculated and updated securely on the server/DB trigger)
        const { data: profile, error: profileError } = await supabase
          .from('captains')
          .update({
            status: 'online'
          })
          .eq('id', captainProfile.id)
          .select()
          .single()

        if (profileError) throw profileError

        // Create transaction logs if needed or wallet entries

        // Notifications are centrally handled by database triggers to prevent duplicates and ensure consistency.

        // Reset active order state
        set({
          activeOrder: null,
          captainProfile: profile
        })

        // Fetch new completed deliveries count
        get().fetchCompletedDeliveriesCount()

        // Unsubscribe active order listener
        get().unsubscribeFromActiveOrder()

        toast.success('Order Delivered successfully! Earnings added.')
        
        // Fetch new nearby orders
        get().fetchNearbyOrders()
      } catch (error) {
        console.error('Deliver order error:', error)
        toast.error('Failed to complete delivery')
      }
    },

    // Location Simulation
    updateRiderLocation: async (lat, lng) => {
      const { captainProfile } = get()
      if (!captainProfile) return

      try {
        await supabase
          .from('captains')
          .update({
            current_lat: lat,
            current_long: lng
          })
          .eq('id', captainProfile.id)
      } catch (e) {
        console.error('Update coordinates failed', e)
      }
    },

    // Sound chime generator for Order radar
    playRadarSound: () => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const playTone = (freq, duration, delay) => {
          setTimeout(() => {
            const osc = audioContext.createOscillator()
            const gain = audioContext.createGain()
            osc.connect(gain)
            gain.connect(audioContext.destination)
            osc.type = 'sine'
            osc.frequency.setValueAtTime(freq, audioContext.currentTime)
            gain.gain.setValueAtTime(0.15, audioContext.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration - 0.02)
            osc.start()
            osc.stop(audioContext.currentTime + duration)
          }, delay)
        }
        
        // Radar ping sequence: C5 -> E5 -> G5 -> C6
        playTone(523.25, 0.15, 0)
        playTone(659.25, 0.15, 120)
        playTone(783.99, 0.15, 240)
        playTone(1046.50, 0.3, 360)
      } catch (err) {
        console.warn('Audio radar feedback failed', err)
      }
    },

    // Subscriptions
    subscribeToRadar: () => {
      if (radarSubscription) return

      const { captainProfile } = get()
      if (!captainProfile || captainProfile.status !== 'online') return

      radarSubscription = supabase
        .channel('captain-radar')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          async (payload) => {
            const { eventType, new: newRecord } = payload

            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              // Check if manually assigned to me
              if (newRecord.rider_id === captainProfile.id && (newRecord.status === 'assigned' || newRecord.status === 'dispatched')) {
                get().fetchActiveOrder()
                return
              }

              if (newRecord.status === 'packed' && !newRecord.rider_id) {
                // Fetch full order
                const { data, error } = await supabase
                  .from('orders')
                  .select(`
                    *,
                    address:addresses (*),
                    order_items (*),
                    user:users (full_name)
                  `)
                  .eq('id', newRecord.id)
                  .single()

                if (!error && data) {
                  const formatted = {
                    ...data,
                    subtotal: parseFloat(data.subtotal),
                    delivery_fee: parseFloat(data.delivery_fee),
                    total: parseFloat(data.total),
                    estimatedEarnings: calculateRiderEarnings(data)
                  }

                  // Update radar
                  set((state) => {
                    const exists = state.nearbyOrders.some(o => o.id === formatted.id)
                    if (exists) return state
                    
                    if (get().radarSoundEnabled) {
                      get().playRadarSound()
                    }

                    return { nearbyOrders: [...state.nearbyOrders, formatted] }
                  })
                }
              } else {
                // Remove if it changes status or is assigned
                set((state) => ({
                  nearbyOrders: state.nearbyOrders.filter(o => o.id !== newRecord.id)
                }))
              }
            }
          }
        )
        .subscribe()
    },

    unsubscribeFromRadar: () => {
      if (radarSubscription) {
        supabase.removeChannel(radarSubscription)
        radarSubscription = null
      }
      get().unsubscribeFromAssignedOrders()
    },

    subscribeToActiveOrder: (orderId) => {
      if (activeOrderSubscription) {
        supabase.removeChannel(activeOrderSubscription)
      }

      activeOrderSubscription = supabase
        .channel(`active-order-${orderId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
          async (payload) => {
            const updated = payload.new
            const { captainProfile } = get()
            
            // If the order got cancelled or status changed externally
            if (updated.status === 'cancelled') {
              set({ activeOrder: null })
              
              if (captainProfile) {
                const { data } = await supabase
                  .from('captains')
                  .update({ status: 'online' })
                  .eq('id', captainProfile.id)
                  .select()
                  .single()
                
                set({ captainProfile: data })
              }
              
              toast.error('The active order was cancelled.')
              get().unsubscribeFromActiveOrder()
              get().fetchNearbyOrders()
              return
            }

            // If the order is no longer assigned to this rider (reassigned)
            if (captainProfile && updated.rider_id !== captainProfile.id) {
              set({ activeOrder: null })
              
              const { data } = await supabase
                .from('captains')
                .update({ status: 'online' })
                .eq('id', captainProfile.id)
                .select()
                .single()
              
              set({ captainProfile: data })
              
              toast.error('This order has been reassigned to another Captain.')
              get().unsubscribeFromActiveOrder()
              get().fetchNearbyOrders()
            }
          }
        )
        .subscribe()
    },

    unsubscribeFromActiveOrder: () => {
      if (activeOrderSubscription) {
        supabase.removeChannel(activeOrderSubscription)
        activeOrderSubscription = null
      }
    },

    subscribeToProfile: (captainId) => {
      if (profileSubscription) return

      profileSubscription = supabase
        .channel(`captain-profile-${captainId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'captains', filter: `id=eq.${captainId}` },
          (payload) => {
            console.log('Realtime captain profile update:', payload.new)
            const oldStatus = get().captainProfile?.status
            const newStatus = payload.new?.status
            set({ captainProfile: payload.new })

            if (newStatus === 'busy' && !get().activeOrder) {
              get().fetchActiveOrder()
            }
          }
        )
        .subscribe()
    },

    unsubscribeFromProfile: () => {
      if (profileSubscription) {
        supabase.removeChannel(profileSubscription)
        profileSubscription = null
      }
      get().unsubscribeFromAssignedOrders()
    },

    subscribeToAssignedOrders: (captainId) => {
      if (assignedOrdersSubscription) return

      assignedOrdersSubscription = supabase
        .channel(`captain-assigned-orders-${captainId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `rider_id=eq.${captainId}` },
          async (payload) => {
            const { eventType, new: newRecord } = payload
            console.log('Realtime assigned order update:', eventType, newRecord)

            if (eventType === 'INSERT' || eventType === 'UPDATE') {
              if (newRecord.status === 'assigned' || newRecord.status === 'dispatched') {
                get().fetchActiveOrder()
              } else if (['delivered', 'DELIVERED_VERIFYING', 'COMPLETED', 'cancelled', 'CANCELLED_BY_USER', 'RETURN_REQUESTED'].includes(newRecord.status)) {
                set({ activeOrder: null })
                get().fetchNearbyOrders()
                get().fetchCompletedDeliveriesCount()
              }
            } else if (eventType === 'DELETE') {
              set({ activeOrder: null })
              get().fetchNearbyOrders()
            }
          }
        )
        .subscribe()
    },

    unsubscribeFromAssignedOrders: () => {
      if (assignedOrdersSubscription) {
        supabase.removeChannel(assignedOrdersSubscription)
        assignedOrdersSubscription = null
      }
    }
  }
})
