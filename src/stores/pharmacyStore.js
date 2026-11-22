import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const usePharmacyStore = create((set, get) => ({
  pharmacy: null,
  isPharmacyLoaded: false,
  isLoading: false,

  // Orders queue
  orders: [],
  activeFilter: 'all', // 'all' | 'rx_review' | 'packing' | 'ready_for_pickup' | 'delivered'
  isLoadingOrders: false,

  // =============================================
  // 1. PHARMACY PROFILE & DRUG LICENSING
  // =============================================

  fetchPharmacyProfile: async () => {
    set({ isLoading: true })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        set({ pharmacy: null, isPharmacyLoaded: true, isLoading: false })
        return null
      }

      let { data, error } = await supabase
        .from('care_pharmacies')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!data && (user.phone || user.email)) {
        const query = supabase.from('care_pharmacies').select('*')
        if (user.phone) query.eq('phone', user.phone)
        else if (user.email) query.eq('email', user.email)
        
        const fallbackRes = await query.maybeSingle()
        if (fallbackRes.data) {
          data = fallbackRes.data
          await supabase.from('care_pharmacies').update({ user_id: user.id }).eq('id', data.id)
        }
      }

      set({ pharmacy: data, isPharmacyLoaded: true })
      return data
    } catch (err) {
      console.error('[PharmacyStore] Profile fetch error:', err)
      set({ pharmacy: null, isPharmacyLoaded: true })
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  onboardPharmacy: async (payload) => {
    set({ isLoading: true })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const addressValue = payload.address || payload.store_address || ''
      const licenseValue = payload.drug_license_number || payload.drug_license_form_20 || 'DL-PENDING'
      const pharmacistName = payload.registered_pharmacist_name || payload.owner_name || 'Pharmacist'

      const pharmacyData = {
        store_name: payload.store_name,
        registered_pharmacist_name: pharmacistName,
        owner_name: payload.owner_name || pharmacistName,
        drug_license_number: licenseValue,
        drug_license_form_20: payload.drug_license_form_20 || licenseValue,
        drug_license_form_21: payload.drug_license_form_21 || licenseValue,
        pharmacist_reg_number: payload.pharmacist_reg_number || licenseValue,
        address: addressValue,
        store_address: addressValue,
        city: payload.city || 'Aurangabad',
        phone: payload.phone || user?.phone || '',
        email: payload.email || user?.email || '',
        operating_hours: payload.operating_hours || '08:00 AM - 10:00 PM',
        serviceable_pincodes: payload.serviceable_pincodes || [],
        user_id: user?.id || null,
        is_verified: true, // auto-verified for seamless operational onboarding
        is_active: true,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('care_pharmacies')
        .insert([pharmacyData])
        .select()
        .single()

      if (error) throw error

      set({ pharmacy: data })
      toast.success('Licensed Pharmacy Store registered successfully!')
      return data
    } catch (err) {
      console.error('[PharmacyStore] Onboarding error:', err)
      toast.error('Registration failed: ' + (err.message || 'Error'))
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  updatePharmacyProfile: async (updatedFields) => {
    const { pharmacy } = get()
    if (!pharmacy) return false

    set({ isLoading: true })
    try {
      const sanitized = { ...updatedFields }
      if (sanitized.address) {
        sanitized.store_address = sanitized.address
      }
      if (sanitized.drug_license_number) {
        sanitized.drug_license_form_20 = sanitized.drug_license_number
        sanitized.drug_license_form_21 = sanitized.drug_license_number
      }

      const { data, error } = await supabase
        .from('care_pharmacies')
        .update(sanitized)
        .eq('id', pharmacy.id)
        .select()
        .single()

      if (error) throw error

      set({ pharmacy: data })
      toast.success('Chemist Shop & Licensing Details updated!')
      return true
    } catch (err) {
      toast.error('Failed to update store details')
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  // =============================================
  // 2. MEDICINE ORDERS & PRESCRIPTION WORKFLOW
  // =============================================

  fetchOrders: async () => {
    const { pharmacy } = get()
    if (!pharmacy) return []

    set({ isLoadingOrders: true })
    try {
      const { data, error } = await supabase
        .from('care_medicine_orders')
        .select('*, care_prescriptions(*)')
        .eq('pharmacy_id', pharmacy.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ orders: data || [] })
      return data || []
    } catch (err) {
      console.error('[PharmacyStore] Orders fetch error:', err)
      return []
    } finally {
      set({ isLoadingOrders: false })
    }
  },

  updateOrderStatus: async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('care_medicine_orders')
        .update({ order_status: newStatus })
        .eq('id', orderId)

      if (error) throw error

      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === orderId ? { ...o, order_status: newStatus } : o
        )
      }))

      const statusMessages = {
        packing: 'Prescription verified. Medicines packaging started!',
        ready_for_pickup: 'Medicines packed! Ozo Captain rider notified for pickup.',
        out_for_delivery: 'Rider picked up medicines. Out for doorstep delivery!',
        delivered: 'Medicine Order completed & delivered to customer!',
        rejected: 'Medicine Order declined.'
      }

      toast.success(statusMessages[newStatus] || `Order updated to ${newStatus}`)
      return true
    } catch (err) {
      toast.error('Failed to update order status')
      return false
    }
  }
}))
