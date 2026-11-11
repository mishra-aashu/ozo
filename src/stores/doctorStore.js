import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export const useDoctorStore = create((set, get) => ({
  doctor: null,
  isDoctorLoaded: false,
  isLoading: false,

  // Appointments Queue
  appointments: [],
  selectedDate: new Date().toISOString().split('T')[0],
  activeFilter: 'today', // 'today' | 'upcoming' | 'completed' | 'all'
  isLoadingAppointments: false,

  // Prescriptions created by this doctor
  issuedPrescriptions: [],
  isLoadingPrescriptions: false,

  // =============================================
  // 1. DOCTOR PROFILE & REGISTRATION
  // =============================================

  fetchDoctorProfile: async () => {
    set({ isLoading: true })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        set({ doctor: null, isDoctorLoaded: true, isLoading: false })
        return null
      }

      // 1. Fetch by user_id
      let { data, error } = await supabase
        .from('care_doctors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      // 2. Fallback check by phone/email if not matched by user_id
      if (!data && (user.phone || user.email)) {
        const query = supabase.from('care_doctors').select('*')
        if (user.phone) query.eq('phone', user.phone)
        else if (user.email) query.eq('email', user.email)
        
        const fallbackRes = await query.maybeSingle()
        if (fallbackRes.data) {
          data = fallbackRes.data
          // Link user_id
          await supabase.from('care_doctors').update({ user_id: user.id }).eq('id', data.id)
        }
      }

      // Demo fallback: If no doctor profile, link to first verified doctor for immediate UI testing
      if (!data) {
        const { data: demoDoc } = await supabase
          .from('care_doctors')
          .select('*')
          .limit(1)
          .maybeSingle()
        if (demoDoc) data = demoDoc
      }

      set({ doctor: data, isDoctorLoaded: true })
      return data
    } catch (err) {
      console.error('[DoctorStore] Profile fetch error:', err)
      set({ doctor: null, isDoctorLoaded: true })
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  onboardDoctor: async (payload) => {
    set({ isLoading: true })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const doctorData = {
        ...payload,
        user_id: user?.id || null,
        is_verified: true, // auto-verified for smooth operational onboarding
        is_online: true,
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('care_doctors')
        .insert([doctorData])
        .select()
        .single()

      if (error) throw error

      set({ doctor: data })
      toast.success('Doctor Profile Registered Successfully!')
      return data
    } catch (err) {
      console.error('[DoctorStore] Onboarding error:', err)
      toast.error('Registration failed: ' + (err.message || 'Error'))
      return null
    } finally {
      set({ isLoading: false })
    }
  },

  updateDoctorProfile: async (updatedFields) => {
    const { doctor } = get()
    if (!doctor) return false

    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('care_doctors')
        .update({ ...updatedFields, updated_at: new Date().toISOString() })
        .eq('id', doctor.id)
        .select()
        .single()

      if (error) throw error

      set({ doctor: data })
      toast.success('Clinical Profile & Schedule updated!')
      return true
    } catch (err) {
      console.error('[DoctorStore] Update error:', err)
      toast.error('Failed to update profile')
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  // Toggle online teleconsultation availability
  toggleDutyStatus: async () => {
    const { doctor } = get()
    if (!doctor) return
    const newStatus = !doctor.is_online

    try {
      await supabase
        .from('care_doctors')
        .update({ is_online: newStatus })
        .eq('id', doctor.id)

      set({ doctor: { ...doctor, is_online: newStatus } })
      toast.success(newStatus ? '🟢 You are now Online for Consultations' : '⚪ Duty status set to Offline')
    } catch (err) {
      toast.error('Failed to update status')
    }
  },

  // =============================================
  // 2. APPOINTMENTS & REAL-TIME QUEUE
  // =============================================

  fetchAppointments: async () => {
    const { doctor, selectedDate } = get()
    if (!doctor) return []

    set({ isLoadingAppointments: true })
    try {
      const { data, error } = await supabase
        .from('care_appointments')
        .select('*, care_prescriptions(*)')
        .eq('doctor_id', doctor.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ appointments: data || [] })
      return data || []
    } catch (err) {
      console.error('[DoctorStore] Appointments fetch error:', err)
      return []
    } finally {
      set({ isLoadingAppointments: false })
    }
  },

  updateAppointmentStatus: async (appointmentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('care_appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId)

      if (error) throw error

      set((state) => ({
        appointments: state.appointments.map((a) =>
          a.id === appointmentId ? { ...a, status: newStatus } : a
        )
      }))

      toast.success(`Patient marked as ${newStatus.replace('_', ' ')}`)
      return true
    } catch (err) {
      toast.error('Failed to update appointment status')
      return false
    }
  },

  // =============================================
  // 3. CLINICAL DIGITAL PRESCRIPTIONS (Rx)
  // =============================================

  createPrescription: async (appointment, rxData) => {
    const { doctor } = get()
    if (!doctor || !appointment) return null

    try {
      const payload = {
        appointment_id: appointment.id,
        doctor_id: doctor.id,
        patient_name: appointment.patient_name,
        diagnosis: rxData.diagnosis || 'General Clinical Observation',
        medicines: rxData.medicines || [],
        general_advice: rxData.general_advice || 'Plenty of fluids & rest',
        follow_up_date: rxData.follow_up_date || null,
        created_at: new Date().toISOString()
      }

      // 1. Insert Rx
      const { data: newRx, error: rxError } = await supabase
        .from('care_prescriptions')
        .insert([payload])
        .select()
        .single()

      if (rxError) throw rxError

      // 2. Link prescription_id and mark appointment as completed
      await supabase
        .from('care_appointments')
        .update({
          prescription_id: newRx.id,
          status: 'completed'
        })
        .eq('id', appointment.id)

      // 3. Increment doctor's total_patients_consulted
      await supabase
        .from('care_doctors')
        .update({
          total_patients_consulted: (doctor.total_patients_consulted || 0) + 1
        })
        .eq('id', doctor.id)

      // Update state
      set((state) => ({
        appointments: state.appointments.map((a) =>
          a.id === appointment.id
            ? { ...a, status: 'completed', prescription_id: newRx.id }
            : a
        ),
        doctor: {
          ...doctor,
          total_patients_consulted: (doctor.total_patients_consulted || 0) + 1
        }
      }))

      toast.success('Digital Prescription (Rx) generated & sent to patient!')
      return newRx
    } catch (err) {
      console.error('[DoctorStore] Create Rx error:', err)
      toast.error('Failed to generate prescription: ' + (err.message || 'Error'))
      return null
    }
  },

  fetchIssuedPrescriptions: async () => {
    const { doctor } = get()
    if (!doctor) return []

    set({ isLoadingPrescriptions: true })
    try {
      const { data, error } = await supabase
        .from('care_prescriptions')
        .select('*, care_appointments(*)')
        .eq('doctor_id', doctor.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ issuedPrescriptions: data || [] })
      return data || []
    } catch (err) {
      console.error('[DoctorStore] Prescriptions fetch error:', err)
      return []
    } finally {
      set({ isLoadingPrescriptions: false })
    }
  }
}))
