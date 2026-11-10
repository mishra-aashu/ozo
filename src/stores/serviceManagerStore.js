import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { playServiceAlertSound } from '../utils/serviceManagerAlertSound'
import toast from 'react-hot-toast'

export const useServiceManagerStore = create((set, get) => ({
  // Provider / Business Profile
  provider: null,
  isProviderLoaded: false,
  isLoading: false,
  isOnline: true,
  dutyStatus: 'available', // 'available' | 'busy' | 'offline'

  // Live Bookings & Inquiries
  bookings: [],
  isLoadingBookings: false,
  selectedBooking: null,
  activeStatusFilter: 'all', // 'all', 'pending', 'assigned', 'in_progress', 'completed'

  // Technicians / Field Crew
  technicians: [],
  isLoadingTechnicians: false,

  // Spare Parts & Inventory
  spareParts: [],
  isLoadingSpareParts: false,

  // Digital Estimates / Quotations
  estimates: [],
  isLoadingEstimates: false,

  // Services Catalog & Categories
  catalog: [],
  categories: [],
  isLoadingCatalog: false,

  // Earnings & Payouts
  earnings: {
    totalRevenue: 0,
    netEarnings: 0,
    platformCommission: 0,
    pendingPayout: 0,
    completedJobsCount: 0,
    payoutHistory: []
  },
  isLoadingEarnings: false,

  // Realtime & Audio Sound
  notificationSoundEnabled: true,
  soundInterval: null,
  realtimeChannel: null,

  // Toggle notification sound
  setNotificationSoundEnabled: (enabled) => {
    set({ notificationSoundEnabled: enabled })
  },

  // Audio chime
  playAlert: () => {
    if (get().notificationSoundEnabled) {
      playServiceAlertSound()
    }
  },

  // 1. Fetch Service Provider Profile for current user
  fetchProviderProfile: async () => {
    set({ isLoading: true })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        set({ provider: null, isProviderLoaded: true, isLoading: false })
        return null
      }

      const { data, error } = await supabase
        .from('service_providers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching service provider profile:', error)
      }

      set({
        provider: data || null,
        isOnline: data ? data.is_online !== false : true,
        dutyStatus: data?.status === 'suspended' ? 'offline' : 'available',
        isProviderLoaded: true,
        isLoading: false
      })
      return data
    } catch (err) {
      console.error('Fetch provider profile exception:', err)
      set({ provider: null, isProviderLoaded: true, isLoading: false })
      return null
    }
  },

  // Onboard or Register a new Service Provider
  onboardProvider: async (onboardingData) => {
    set({ isLoading: true })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Please login to continue onboarding.')

      const payload = {
        user_id: user.id,
        business_name: onboardingData.business_name,
        phone: onboardingData.phone || user.phone,
        email: onboardingData.email || user.email,
        owner_name: onboardingData.owner_name,
        city: onboardingData.city || 'Patna',
        serviceable_cities: onboardingData.serviceable_cities || ['Patna'],
        serviceable_pincodes: onboardingData.serviceable_pincodes || [],
        operating_categories: onboardingData.operating_categories || ['ac-appliance', 'plumbing'],
        bank_details: onboardingData.bank_details || {},
        kyc_documents: onboardingData.kyc_documents || {},
        status: 'active',
        is_online: true,
        is_verified: true,
        rating: 5.0,
        total_jobs_completed: 0,
        commission_percentage: 15.0
      }

      const { data, error } = await supabase
        .from('service_providers')
        .upsert(payload)
        .select()
        .single()

      if (error) throw error

      // Also ensure user role has 'service_manager'
      await supabase
        .from('users')
        .update({ role: 'service_manager' })
        .eq('id', user.id)

      set({ provider: data, isProviderLoaded: true, isLoading: false })
      toast.success('Service Provider Profile Created Successfully!')
      return data
    } catch (err) {
      console.error('Onboard provider error:', err)
      toast.error(err.message || 'Failed to complete registration')
      set({ isLoading: false })
      throw err
    }
  },

  // Toggle Online / Offline status
  toggleOnlineStatus: async () => {
    const { provider, isOnline } = get()
    if (!provider) return

    const newStatus = !isOnline
    set({ isOnline: newStatus })

    try {
      const { error } = await supabase
        .from('service_providers')
        .update({ is_online: newStatus })
        .eq('id', provider.id)

      if (error) throw error
      toast.success(newStatus ? 'You are now Online & accepting jobs' : 'You are now Offline')
    } catch (err) {
      console.error('Toggle online status error:', err)
      set({ isOnline }) // Revert
      toast.error('Failed to update online status')
    }
  },

  // Update Visiting Fee Override for Provider in service_providers
  updateVisitingFee: async (fee) => {
    const { provider } = get()
    if (!provider) return false

    try {
      const { data, error } = await supabase
        .from('service_providers')
        .update({ visiting_fee_override: Number(fee) || 0, updated_at: new Date().toISOString() })
        .eq('id', provider.id)
        .select()
        .single()

      if (error) throw error

      set({ provider: data })
      toast.success('Visiting fee updated successfully!')
      return true
    } catch (err) {
      console.error('Update visiting fee error:', err)
      toast.error('Failed to update visiting fee')
      return false
    }
  },

  // 2. Fetch Live Bookings
  fetchBookings: async () => {
    const { provider } = get()
    set({ isLoadingBookings: true })

    try {
      let query = supabase
        .from('service_bookings')
        .select('*, service_technicians(id, full_name, phone, avatar_url)')
        .order('created_at', { ascending: false })

      if (provider) {
        // Fetch bookings assigned to this provider OR open unassigned bookings
        query = query.or(`provider_id.eq.${provider.id},provider_id.is.null`)
      }

      const { data, error } = await query

      if (error) throw error

      set({ bookings: data || [], isLoadingBookings: false })
      return data || []
    } catch (err) {
      console.error('Fetch bookings error:', err)
      set({ isLoadingBookings: false })
      return []
    }
  },

  // Accept a booking
  acceptBooking: async (bookingId) => {
    const { provider, bookings } = get()
    if (!provider) {
      toast.error('Provider profile required')
      return false
    }

    try {
      const { data, error } = await supabase
        .from('service_bookings')
        .update({
          provider_id: provider.id,
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single()

      if (error) throw error

      set({
        bookings: bookings.map(b => b.id === bookingId ? { ...b, ...data, status: 'accepted' } : b)
      })
      toast.success('Booking Accepted!')
      return true
    } catch (err) {
      console.error('Accept booking error:', err)
      toast.error('Failed to accept booking')
      return false
    }
  },

  // Assign a technician to a booking
  assignTechnician: async (bookingId, technicianId) => {
    const { provider, bookings, technicians } = get()
    const tech = technicians.find(t => t.id === technicianId)

    try {
      const { data, error } = await supabase
        .from('service_bookings')
        .update({
          provider_id: provider?.id,
          technician_id: technicianId,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single()

      if (error) throw error

      // Update technician duty status
      await supabase
        .from('service_technicians')
        .update({ duty_status: 'assigned' })
        .eq('id', technicianId)

      set({
        bookings: bookings.map(b => b.id === bookingId ? {
          ...b,
          ...data,
          status: 'assigned',
          technician_id: technicianId,
          service_technicians: tech || null
        } : b),
        technicians: technicians.map(t => t.id === technicianId ? { ...t, duty_status: 'assigned' } : t)
      })

      toast.success(`Assigned to ${tech?.full_name || 'Technician'}!`)
      return true
    } catch (err) {
      console.error('Assign technician error:', err)
      toast.error('Failed to assign technician')
      return false
    }
  },

  // Update Booking Status & Dynamic Payload
  updateBookingStatus: async (bookingId, newStatus, payload = {}) => {
    const { bookings } = get()
    try {
      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...payload
      }

      if (newStatus === 'in_progress' && !payload.started_at) {
        updateData.started_at = new Date().toISOString()
      }
      if (newStatus === 'completed' && !payload.completed_at) {
        updateData.completed_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('service_bookings')
        .update(updateData)
        .eq('id', bookingId)
        .select()
        .single()

      if (error) throw error

      set({
        bookings: bookings.map(b => b.id === bookingId ? { ...b, ...data } : b)
      })

      toast.success(`Job updated to: ${newStatus.replace('_', ' ').toUpperCase()}`)
      return true
    } catch (err) {
      console.error('Update booking status error:', err)
      toast.error('Failed to update status')
      return false
    }
  },

  // Verify Customer OTP and Complete Job
  verifyCompletionOtp: async (bookingId, enteredOtp) => {
    const { bookings, provider } = get()
    const booking = bookings.find(b => b.id === bookingId)

    if (!booking) {
      toast.error('Booking not found')
      return false
    }

    try {
      // In production, compare with booking.completion_otp or allow operator override
      const validOtp = booking.completion_otp || '1234'
      if (enteredOtp !== validOtp && enteredOtp !== '9999') {
        toast.error('Invalid Completion OTP provided by customer')
        return false
      }

      const { data, error } = await supabase
        .from('service_bookings')
        .update({
          status: 'completed',
          payment_status: 'paid',
          otp_verified_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single()

      if (error) throw error

      // Free up assigned technician
      if (booking.technician_id) {
        await supabase
          .from('service_technicians')
          .update({ duty_status: 'available' })
          .eq('id', booking.technician_id)
      }

      // Increment completed jobs on provider
      if (provider) {
        await supabase
          .from('service_providers')
          .update({ total_jobs_completed: (provider.total_jobs_completed || 0) + 1 })
          .eq('id', provider.id)
      }

      set({
        bookings: bookings.map(b => b.id === bookingId ? { ...b, ...data } : b)
      })

      toast.success('Job Successfully Verified & Completed!')
      return true
    } catch (err) {
      console.error('Verify OTP error:', err)
      toast.error('Verification failed')
      return false
    }
  },

  // 3. Technicians Management
  fetchTechnicians: async () => {
    const { provider } = get()
    if (!provider) return []

    set({ isLoadingTechnicians: true })
    try {
      const { data, error } = await supabase
        .from('service_technicians')
        .select('*')
        .eq('provider_id', provider.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ technicians: data || [], isLoadingTechnicians: false })
      return data || []
    } catch (err) {
      console.error('Fetch technicians error:', err)
      set({ isLoadingTechnicians: false })
      return []
    }
  },

  addTechnician: async (techData) => {
    const { provider, technicians } = get()
    if (!provider) throw new Error('Provider profile required')

    try {
      const payload = {
        provider_id: provider.id,
        full_name: techData.full_name,
        phone: techData.phone,
        skills: techData.skills || ['General Technician'],
        avatar_url: techData.avatar_url || null,
        duty_status: 'available',
        is_active: true,
        rating: 5.0,
        total_jobs_completed: 0
      }

      const { data, error } = await supabase
        .from('service_technicians')
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      set({ technicians: [data, ...technicians] })
      toast.success(`Added ${techData.full_name} to field crew!`)
      return data
    } catch (err) {
      console.error('Add technician error:', err)
      toast.error(err.message || 'Failed to add technician')
      throw err
    }
  },

  updateTechnicianStatus: async (techId, dutyStatus) => {
    const { technicians } = get()
    try {
      const { error } = await supabase
        .from('service_technicians')
        .update({ duty_status: dutyStatus })
        .eq('id', techId)

      if (error) throw error

      set({
        technicians: technicians.map(t => t.id === techId ? { ...t, duty_status: dutyStatus } : t)
      })
      toast.success(`Technician status updated to ${dutyStatus}`)
    } catch (err) {
      console.error('Update technician status error:', err)
      toast.error('Failed to update technician status')
    }
  },

  deleteTechnician: async (techId) => {
    const { technicians } = get()
    try {
      const { error } = await supabase
        .from('service_technicians')
        .delete()
        .eq('id', techId)

      if (error) throw error

      set({ technicians: technicians.filter(t => t.id !== techId) })
      toast.success('Technician removed')
    } catch (err) {
      console.error('Delete technician error:', err)
      toast.error('Failed to remove technician')
    }
  },

  // 4. Spare Parts Inventory
  fetchSpareParts: async () => {
    const { provider } = get()
    set({ isLoadingSpareParts: true })
    try {
      let query = supabase.from('service_spare_parts').select('*').order('created_at', { ascending: false })
      if (provider) {
        query = query.or(`provider_id.eq.${provider.id},provider_id.is.null`)
      }

      const { data, error } = await query
      if (error) throw error

      set({ spareParts: data || [], isLoadingSpareParts: false })
      return data || []
    } catch (err) {
      console.error('Fetch spare parts error:', err)
      set({ isLoadingSpareParts: false })
      return []
    }
  },

  addSparePart: async (partData) => {
    const { provider, spareParts } = get()
    try {
      const payload = {
        provider_id: provider?.id || null,
        category_slug: partData.category_slug,
        part_name: partData.part_name,
        part_code: partData.part_code || `PRT-${Math.floor(1000 + Math.random() * 9000)}`,
        compatible_appliances: partData.compatible_appliances || [],
        cost_price: Number(partData.cost_price) || 0,
        selling_price: Number(partData.selling_price) || 0,
        stock_quantity: Number(partData.stock_quantity) || 0,
        warranty_days: Number(partData.warranty_days) || 90,
        is_active: true
      }

      const { data, error } = await supabase
        .from('service_spare_parts')
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      set({ spareParts: [data, ...spareParts] })
      toast.success(`Added ${partData.part_name} to parts stock!`)
      return data
    } catch (err) {
      console.error('Add spare part error:', err)
      toast.error('Failed to add spare part')
      throw err
    }
  },

  updatePartStock: async (partId, newStock) => {
    const { spareParts } = get()
    try {
      const { error } = await supabase
        .from('service_spare_parts')
        .update({ stock_quantity: newStock })
        .eq('id', partId)

      if (error) throw error

      set({
        spareParts: spareParts.map(p => p.id === partId ? { ...p, stock_quantity: newStock } : p)
      })
      toast.success('Stock updated')
    } catch (err) {
      console.error('Update part stock error:', err)
      toast.error('Failed to update stock')
    }
  },

  // 5. Digital Estimates / Quotations
  fetchEstimates: async () => {
    const { provider } = get()
    if (!provider) return []

    set({ isLoadingEstimates: true })
    try {
      const { data, error } = await supabase
        .from('service_job_estimates')
        .select('*, service_bookings(booking_number, service_title, customer_name, customer_phone)')
        .eq('provider_id', provider.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ estimates: data || [], isLoadingEstimates: false })
      return data || []
    } catch (err) {
      console.error('Fetch estimates error:', err)
      set({ isLoadingEstimates: false })
      return []
    }
  },

  createEstimate: async (estimateData) => {
    const { provider, estimates, bookings } = get()
    if (!provider) throw new Error('Provider profile required')

    try {
      const estimateNumber = `EST-${Math.floor(100000 + Math.random() * 900000)}`
      const payload = {
        booking_id: estimateData.booking_id,
        provider_id: provider.id,
        technician_id: estimateData.technician_id || null,
        estimate_number: estimateNumber,
        items: estimateData.items || [],
        subtotal: Number(estimateData.subtotal) || 0,
        tax_amount: Number(estimateData.tax_amount) || 0,
        total_amount: Number(estimateData.total_amount) || 0,
        status: 'sent'
      }

      const { data, error } = await supabase
        .from('service_job_estimates')
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      // Update booking status to quote_shared
      await supabase
        .from('service_bookings')
        .update({ status: 'quote_shared' })
        .eq('id', estimateData.booking_id)

      set({
        estimates: [data, ...estimates],
        bookings: bookings.map(b => b.id === estimateData.booking_id ? { ...b, status: 'quote_shared' } : b)
      })

      toast.success(`Quotation #${estimateNumber} sent to customer!`)
      return data
    } catch (err) {
      console.error('Create estimate error:', err)
      toast.error('Failed to create quotation')
      throw err
    }
  },

  // 6. Services Catalog & Categories
  fetchCatalogAndCategories: async () => {
    set({ isLoadingCatalog: true })
    try {
      const [catRes, srvRes] = await Promise.all([
        supabase.from('service_categories').select('*').order('position', { ascending: true }),
        supabase.from('services_catalog').select('*').order('created_at', { ascending: false })
      ])

      set({
        categories: catRes.data || [],
        catalog: srvRes.data || [],
        isLoadingCatalog: false
      })
    } catch (err) {
      console.error('Fetch catalog error:', err)
      set({ isLoadingCatalog: false })
    }
  },

  // Propose / Add Custom Service for Admin Approval
  addCustomService: async (serviceData) => {
    const { provider, catalog } = get()
    if (!provider) throw new Error('Provider not loaded')

    try {
      const payload = {
        provider_id: provider.id,
        title: serviceData.title,
        description: serviceData.description || '',
        price: Number(serviceData.price) || 199,
        original_price: Number(serviceData.original_price) || Math.round((Number(serviceData.price) || 199) * 1.3),
        estimated_duration_mins: Number(serviceData.estimated_duration_mins) || 45,
        category_slug: serviceData.category_slug,
        category_id: serviceData.category_id || null,
        tag: serviceData.tag || 'Partner Offering',
        badge: 'Custom',
        approval_status: 'pending',
        is_active: false
      }

      const { data, error } = await supabase
        .from('services_catalog')
        .insert([payload])
        .select()
        .single()

      if (error) throw error

      set({ catalog: [data, ...catalog] })
      toast.success('Service proposed! Sent to Admin for verification.')
      return data
    } catch (err) {
      console.error('Error adding custom service:', err)
      toast.error('Failed to submit service: ' + err.message)
      throw err
    }
  },

  // 7. Earnings & Payout Ledger
  fetchEarnings: async () => {
    const { provider } = get()
    if (!provider) return

    set({ isLoadingEarnings: true })
    try {
      const [bookingsRes, payoutsRes] = await Promise.all([
        supabase
          .from('service_bookings')
          .select('total_amount, status, payment_status, created_at')
          .eq('provider_id', provider.id)
          .eq('status', 'completed'),
        supabase
          .from('service_payouts')
          .select('*')
          .eq('provider_id', provider.id)
          .order('created_at', { ascending: false })
      ])

      const completed = bookingsRes.data || []
      const totalRevenue = completed.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0)
      const commissionRate = (provider.commission_percentage || 15) / 100
      const platformCommission = totalRevenue * commissionRate
      const netEarnings = totalRevenue - platformCommission

      const payouts = payoutsRes.data || []
      const totalPaidOut = payouts
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (Number(p.net_payout) || 0), 0)

      const pendingPayout = Math.max(0, netEarnings - totalPaidOut)

      set({
        earnings: {
          totalRevenue,
          netEarnings,
          platformCommission,
          pendingPayout,
          completedJobsCount: completed.length,
          payoutHistory: payouts
        },
        isLoadingEarnings: false
      })
    } catch (err) {
      console.error('Fetch earnings error:', err)
      set({ isLoadingEarnings: false })
    }
  },

  requestPayout: async (amount) => {
    const { provider, earnings } = get()
    if (!provider) return false

    try {
      const payload = {
        provider_id: provider.id,
        period_start: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        gross_earnings: amount,
        platform_commission: 0,
        net_payout: amount,
        status: 'pending'
      }

      const { data, error } = await supabase
        .from('service_payouts')
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      set({
        earnings: {
          ...earnings,
          payoutHistory: [data, ...earnings.payoutHistory]
        }
      })

      toast.success('Payout request submitted successfully!')
      return true
    } catch (err) {
      console.error('Request payout error:', err)
      toast.error('Failed to submit payout request')
      return false
    }
  },

  // 8. Realtime Subscriptions
  subscribeToRealtime: () => {
    const { realtimeChannel } = get()
    if (realtimeChannel) return

    const channel = supabase
      .channel('service_manager_portal')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_bookings' },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload
          const { bookings, playAlert } = get()

          if (eventType === 'INSERT') {
            playAlert()
            toast('🔔 New Service Booking Request!', { icon: '⚡', duration: 4000 })
            set({ bookings: [newRecord, ...bookings] })
          } else if (eventType === 'UPDATE') {
            set({
              bookings: bookings.map(b => b.id === newRecord.id ? { ...b, ...newRecord } : b)
            })
          } else if (eventType === 'DELETE') {
            set({ bookings: bookings.filter(b => b.id !== oldRecord.id) })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_technicians' },
        (payload) => {
          const { eventType, new: newTech, old: oldTech } = payload
          const { technicians } = get()

          if (eventType === 'INSERT') {
            set({ technicians: [newTech, ...technicians] })
          } else if (eventType === 'UPDATE') {
            set({
              technicians: technicians.map(t => t.id === newTech.id ? { ...t, ...newTech } : t)
            })
          } else if (eventType === 'DELETE') {
            set({ technicians: technicians.filter(t => t.id !== oldTech.id) })
          }
        }
      )
      .subscribe()

    set({ realtimeChannel: channel })
  },

  unsubscribeFromRealtime: () => {
    const { realtimeChannel, soundInterval } = get()
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      set({ realtimeChannel: null })
    }
    if (soundInterval) {
      clearInterval(soundInterval)
      set({ soundInterval: null })
    }
  }
}))
