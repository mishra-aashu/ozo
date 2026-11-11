import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// Default fallback theme: Clinical Emerald & Trust Cyan
const DEFAULT_CARE_THEME = {
  theme_id: 'clinical_emerald',
  name: 'Clinical Emerald & Trust Cyan (Default)',
  primary: '#059669',
  primary_hover: '#047857',
  primary_glow: 'rgba(5, 150, 105, 0.35)',
  secondary: '#06b6d4',
  accent: '#14b8a6',
  badge_bg: 'rgba(5, 150, 105, 0.12)',
  badge_text: '#10b981',
  header_gradient: 'from-emerald-500/15 via-teal-500/10 to-cyan-500/15'
}

export const useCareStore = create((set, get) => ({
  // Theme Engine
  themeConfig: (() => {
    try {
      const cached = localStorage.getItem('ozo_care_theme')
      return cached ? JSON.parse(cached) : DEFAULT_CARE_THEME
    } catch {
      return DEFAULT_CARE_THEME
    }
  })(),
  isThemeLoading: false,

  // Doctors & Specialties
  doctors: [],
  selectedSpecialty: 'all',
  searchQuery: '',
  isLoadingDoctors: false,

  // Appointments
  myAppointments: [],
  isLoadingAppointments: false,

  // Prescriptions Vault
  myPrescriptions: [],
  isLoadingPrescriptions: false,

  // Pharmacies & Medicine Orders
  pharmacies: [],
  myMedicineOrders: [],
  isLoadingPharmacies: false,
  isLoadingMedicineOrders: false,

  // =============================================
  // 1. THEME ENGINE & DYNAMIC CSS VARIABLES
  // =============================================

  // Injects CSS Variables onto document.documentElement
  applyThemeVariables: (theme) => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const t = theme || get().themeConfig || DEFAULT_CARE_THEME

    root.style.setProperty('--care-primary', t.primary || '#059669')
    root.style.setProperty('--care-primary-hover', t.primary_hover || '#047857')
    root.style.setProperty('--care-primary-glow', t.primary_glow || 'rgba(5, 150, 105, 0.35)')
    root.style.setProperty('--care-secondary', t.secondary || '#06b6d4')
    root.style.setProperty('--care-accent', t.accent || '#14b8a6')
    root.style.setProperty('--care-badge-bg', t.badge_bg || 'rgba(5, 150, 105, 0.12)')
    root.style.setProperty('--care-badge-text', t.badge_text || '#10b981')
  },

  // Fetch theme configuration from Supabase app_settings
  fetchThemeConfig: async () => {
    set({ isThemeLoading: true })
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'care_theme_config')
        .single()

      if (!error && data?.value) {
        const theme = data.value
        set({ themeConfig: theme })
        localStorage.setItem('ozo_care_theme', JSON.stringify(theme))
        get().applyThemeVariables(theme)
        return theme
      }
    } catch (err) {
      console.warn('[OzoCare] Failed to fetch theme from DB, using cache/default:', err)
    } finally {
      set({ isThemeLoading: false })
      get().applyThemeVariables(get().themeConfig)
    }
  },

  // Update theme configuration (Admin function, saves to DB & local cache)
  updateThemeConfig: async (newThemeConfig) => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'care_theme_config',
          value: newThemeConfig,
          description: 'Dynamic Theme & Color configuration for OzoCare vertical',
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      set({ themeConfig: newThemeConfig })
      localStorage.setItem('ozo_care_theme', JSON.stringify(newThemeConfig))
      get().applyThemeVariables(newThemeConfig)
      toast.success('OzoCare theme updated & applied globally!')
      return true
    } catch (err) {
      console.error('[OzoCare] Update theme error:', err)
      toast.error('Failed to save theme: ' + (err.message || 'Error'))
      return false
    }
  },

  // =============================================
  // 2. DOCTOR DISCOVERY & SEARCH
  // =============================================

  fetchDoctors: async (specialtySlug = null, search = '') => {
    set({ isLoadingDoctors: true })
    try {
      let query = supabase
        .from('care_doctors')
        .select('*')
        .eq('is_verified', true)
        .order('rating', { ascending: false })

      if (specialtySlug && specialtySlug !== 'all') {
        query = query.eq('specialty_slug', specialtySlug)
      }

      if (search && search.trim()) {
        const q = search.trim()
        query = query.or(`full_name.ilike.%${q}%,clinic_name.ilike.%${q}%,qualification.ilike.%${q}%,specialty_slug.ilike.%${q}%`)
      }

      const { data, error } = await query

      if (error) throw error
      set({ doctors: data || [] })
      return data || []
    } catch (err) {
      console.error('[OzoCare] Error fetching doctors:', err)
      toast.error('Failed to load doctors')
      return []
    } finally {
      set({ isLoadingDoctors: false })
    }
  },

  setSelectedSpecialty: (slug) => {
    set({ selectedSpecialty: slug })
    get().fetchDoctors(slug, get().searchQuery)
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query })
    get().fetchDoctors(get().selectedSpecialty, query)
  },

  getDoctorById: async (id) => {
    try {
      const { data, error } = await supabase
        .from('care_doctors')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.error('[OzoCare] Error fetching doctor detail:', err)
      return null
    }
  },

  // =============================================
  // 3. APPOINTMENTS & PATIENT BOOKINGS
  // =============================================

  bookAppointment: async (appointmentPayload) => {
    try {
      const appointmentNumber = `CARE-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`
      const tokenNumber = Math.floor(1 + Math.random() * 25)

      const payload = {
        ...appointmentPayload,
        appointment_number: appointmentNumber,
        token_number: tokenNumber,
        status: 'booked',
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('care_appointments')
        .insert([payload])
        .select('*, care_doctors(*)')
        .single()

      if (error) throw error

      toast.success(`Token #${tokenNumber} confirmed with Dr. ${data.care_doctors?.full_name || 'Specialist'}!`)
      return data
    } catch (err) {
      console.error('[OzoCare] Error booking appointment:', err)
      toast.error('Booking failed: ' + (err.message || 'Try again'))
      return null
    }
  },

  fetchMyAppointments: async (patientPhone) => {
    if (!patientPhone) return []
    set({ isLoadingAppointments: true })
    try {
      const { data, error } = await supabase
        .from('care_appointments')
        .select('*, care_doctors(*), care_prescriptions(*)')
        .eq('patient_phone', patientPhone)
        .order('appointment_date', { ascending: false })

      if (error) throw error
      set({ myAppointments: data || [] })
      return data || []
    } catch (err) {
      console.error('[OzoCare] Error fetching patient appointments:', err)
      return []
    } finally {
      set({ isLoadingAppointments: false })
    }
  },

  cancelAppointment: async (appointmentId) => {
    try {
      const { error } = await supabase
        .from('care_appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId)

      if (error) throw error

      set((state) => ({
        myAppointments: state.myAppointments.map((a) =>
          a.id === appointmentId ? { ...a, status: 'cancelled' } : a
        )
      }))
      toast.success('Appointment cancelled')
      return true
    } catch (err) {
      toast.error('Failed to cancel appointment')
      return false
    }
  },

  // =============================================
  // 4. PRESCRIPTIONS VAULT
  // =============================================

  fetchMyPrescriptions: async (patientPhone) => {
    if (!patientPhone) return []
    set({ isLoadingPrescriptions: true })
    try {
      const { data, error } = await supabase
        .from('care_prescriptions')
        .select('*, care_doctors(*), care_appointments(*)')
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ myPrescriptions: data || [] })
      return data || []
    } catch (err) {
      console.error('[OzoCare] Error fetching prescriptions:', err)
      return []
    } finally {
      set({ isLoadingPrescriptions: false })
    }
  },

  // =============================================
  // 5. PHARMACIES & LOCAL CHEMIST ORDERS
  // =============================================

  fetchPharmacies: async (city = 'Patna') => {
    set({ isLoadingPharmacies: true })
    try {
      const { data, error } = await supabase
        .from('care_pharmacies')
        .select('*')
        .eq('is_verified', true)
        .eq('is_active', true)
        .eq('city', city)

      if (error) throw error
      set({ pharmacies: data || [] })
      return data || []
    } catch (err) {
      console.error('[OzoCare] Error loading pharmacies:', err)
      return []
    } finally {
      set({ isLoadingPharmacies: false })
    }
  },

  // Upload prescription image to ImgBB directly
  uploadPrescriptionImage: async (file) => {
    if (!file) return null
    try {
      const apiKey = import.meta.env.VITE_IMGBB_API_KEY
      if (!apiKey) {
        // Fallback to Base64 data URL if env key missing
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.readAsDataURL(file)
        })
      }

      const formData = new FormData()
      formData.append('image', file)
      formData.append('name', `prescription_${Date.now()}`)

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const resData = await response.json()
        if (resData?.data?.display_url || resData?.data?.url) {
          return resData.data.display_url || resData.data.url
        }
      }

      // Base64 fallback if ImgBB fails
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.readAsDataURL(file)
      })
    } catch (err) {
      console.warn('[OzoCare] Prescription upload fallback:', err)
      return null
    }
  },

  // Place medicine order with local chemist
  createMedicineOrder: async (orderPayload) => {
    try {
      const orderNumber = `MED-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`
      const payload = {
        ...orderPayload,
        order_number: orderNumber,
        order_status: 'rx_review',
        payment_status: 'pending',
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('care_medicine_orders')
        .insert([payload])
        .select('*, care_pharmacies(*)')
        .single()

      if (error) throw error

      toast.success(`Medicine Order #${orderNumber} sent to ${data.care_pharmacies?.store_name || 'Local Chemist'}!`)
      return data
    } catch (err) {
      console.error('[OzoCare] Error creating medicine order:', err)
      toast.error('Failed to submit medicine order: ' + (err.message || 'Error'))
      return null
    }
  },

  fetchMyMedicineOrders: async (customerPhone) => {
    if (!customerPhone) return []
    set({ isLoadingMedicineOrders: true })
    try {
      const { data, error } = await supabase
        .from('care_medicine_orders')
        .select('*, care_pharmacies(*), care_prescriptions(*)')
        .eq('customer_phone', customerPhone)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ myMedicineOrders: data || [] })
      return data || []
    } catch (err) {
      console.error('[OzoCare] Error fetching medicine orders:', err)
      return []
    } finally {
      set({ isLoadingMedicineOrders: false })
    }
  }
}))
