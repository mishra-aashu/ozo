import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Building2, 
  Video, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle, 
  MapPin, 
  Star, 
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react'
import { useCareStore } from '../../stores/careStore'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

export default function BookAppointment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { getDoctorById, bookAppointment, themeConfig, applyThemeVariables } = useCareStore()

  const [doctor, setDoctor] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Booking Form State
  const [consultationType, setConsultationType] = useState('clinic_visit') // 'clinic_visit' | 'teleconsult'
  
  // Date calculation
  const today = new Date().toISOString().split('T')[0]
  const tomorrowDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const dayAfterDate = new Date(Date.now() + 172800000).toISOString().split('T')[0]

  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedSlot, setSelectedSlot] = useState('10:00 AM - 10:30 AM')
  const [patientName, setPatientName] = useState(user?.user_metadata?.full_name || '')
  const [patientAge, setPatientAge] = useState('')
  const [patientGender, setPatientGender] = useState('Male')
  const [patientPhone, setPatientPhone] = useState(user?.phone || user?.user_metadata?.phone || '')
  const [symptoms, setSymptoms] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmedBooking, setConfirmedBooking] = useState(null)

  useEffect(() => {
    applyThemeVariables()
    const loadDoctor = async () => {
      setIsLoading(true)
      const data = await getDoctorById(id)
      setDoctor(data)
      setIsLoading(false)
    }
    if (id) loadDoctor()
  }, [id])

  const morningSlots = [
    '09:30 AM - 10:00 AM',
    '10:00 AM - 10:30 AM',
    '10:30 AM - 11:00 AM',
    '11:30 AM - 12:00 PM',
    '12:00 PM - 12:30 PM',
    '12:30 PM - 01:00 PM'
  ]

  const eveningSlots = [
    '05:00 PM - 05:30 PM',
    '05:30 PM - 06:00 PM',
    '06:00 PM - 06:30 PM',
    '06:30 PM - 07:00 PM',
    '07:00 PM - 07:30 PM',
    '07:30 PM - 08:00 PM'
  ]

  const handleBooking = async (e) => {
    e.preventDefault()
    if (!patientName.trim()) {
      toast.error('Please enter patient full name')
      return
    }
    if (!patientPhone.trim() || patientPhone.trim().length < 10) {
      toast.error('Please enter a valid 10-digit mobile number for SMS token')
      return
    }

    setIsSubmitting(true)
    const bookingPayload = {
      doctor_id: doctor.id,
      patient_name: patientName.trim(),
      patient_phone: patientPhone.trim(),
      patient_age: patientAge ? parseInt(patientAge, 10) : null,
      patient_gender: patientGender,
      consultation_type: consultationType,
      appointment_date: selectedDate,
      time_slot: selectedSlot,
      symptoms: symptoms.trim() || 'General Health Consultation',
      consultation_fee: consultationType === 'teleconsult' 
        ? (doctor.teleconsult_fee || doctor.consultation_fee || 450)
        : (doctor.consultation_fee || 500),
      payment_status: 'pay_at_clinic'
    }

    const res = await bookAppointment(bookingPayload)
    setIsSubmitting(false)

    if (res) {
      setConfirmedBooking(res)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-display font-medium text-slate-500">Preparing Booking Desk...</p>
        </div>
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">Doctor Not Found</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">The doctor profile you are trying to book with is currently unavailable.</p>
        <Link 
          to="/care"
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-display font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to OzoCare
        </Link>
      </div>
    )
  }

  const doctorDisplayName = doctor.full_name?.startsWith('Dr.') 
    ? doctor.full_name 
    : `Dr. ${doctor.full_name}`

  const avatarSrc = doctor.profile_image || doctor.avatar_url
  const initials = doctor.full_name
    ? doctor.full_name.replace(/^(Dr\.|Doctor)\s+/i, '').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'DR'

  const feeAmount = consultationType === 'teleconsult'
    ? (doctor.teleconsult_fee || doctor.consultation_fee || 450)
    : (doctor.consultation_fee || 500)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e14] text-slate-900 dark:text-slate-100 pb-20 font-sans text-left">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-white/85 dark:bg-[#0e131b]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate(`/care/doctor/${doctor.id}`)} 
            className="flex items-center gap-2 text-sm font-display font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Profile
          </button>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Confirmed Token
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title & Step Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-display font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            <span>Appointment Booking</span>
            <span>•</span>
            <span>Step 1 of 1</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight">
            Confirm Your Consultation Token
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Zero booking advance required. Pay your doctor directly at the clinic counter.
          </p>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: DOCTOR SUMMARY & FEE BREAKDOWN (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Doctor Card Recap */}
            <div className="bg-white dark:bg-[#121820] rounded-3xl p-6 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-5">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-500/30 p-0.5 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 shrink-0">
                  {avatarSrc ? (
                    <img 
                      src={avatarSrc} 
                      alt={doctor.full_name} 
                      className="w-full h-full object-cover rounded-[0.8rem]"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.full_name)}&background=059669&color=fff&size=150`
                      }}
                    />
                  ) : (
                    <div className="w-full h-full rounded-[0.8rem] bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-display font-black text-xl">
                      {initials}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {doctor.specialty_slug?.replace(/[-_]/g, ' ')}
                    </span>
                    <span className="text-[11px] font-display font-bold text-amber-500 flex items-center gap-0.5">
                      <Star size={11} fill="currentColor" /> {doctor.rating || '4.9'}
                    </span>
                  </div>

                  <h3 className="text-base font-display font-black text-slate-900 dark:text-white truncate mt-1">
                    {doctorDisplayName}
                  </h3>
                  <p className="text-xs font-sans text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                    {doctor.qualification}
                  </p>
                </div>
              </div>

              {/* Clinic & Location Details */}
              <div className="space-y-2.5 text-xs font-sans">
                <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                  <Building2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span className="font-semibold">{doctor.clinic_name}</span>
                </div>

                <div className="flex items-start gap-2.5 text-slate-500 dark:text-slate-400">
                  <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{doctor.clinic_address}, {doctor.city || 'Patna'}</span>
                </div>

                <div className="flex items-start gap-2.5 text-slate-500 dark:text-slate-400">
                  <Clock size={15} className="text-slate-400 shrink-0 mt-0.5" />
                  <span>OPD Hours: 10:00 AM – 08:30 PM (Mon – Sat)</span>
                </div>
              </div>

              {/* Consultation Summary Bill */}
              <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-2.5 text-xs">
                <span className="text-[11px] font-display font-bold text-slate-400 uppercase tracking-wider block">
                  Fee Summary
                </span>

                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Consultation ({consultationType === 'teleconsult' ? 'Video Teleconsult' : 'In-Clinic OPD'})</span>
                  <span className="font-semibold text-slate-900 dark:text-white">₹{feeAmount}</span>
                </div>

                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>OzoCare Token Booking Convenience</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">FREE</span>
                </div>

                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Follow-Up Consultation (within 5 days)</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">100% FREE</span>
                </div>

                <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                  <span className="font-display font-bold text-slate-900 dark:text-white text-sm">
                    Total Amount Due
                  </span>
                  <div className="text-right">
                    <span className="font-display font-black text-slate-900 dark:text-white text-xl">
                      ₹{feeAmount}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold leading-none">
                      Pay at Clinic Counter
                    </span>
                  </div>
                </div>
              </div>

              {/* Trust & Guarantee Box */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Zero Advance Policy
                </span>
                <p className="text-[11px] leading-relaxed">
                  No payment needed right now. Generate your queue token instantly and pay after your consultation.
                </p>
              </div>
            </div>

            {/* Intermediary Regulatory Notice */}
            <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 text-[11px] text-slate-500 leading-normal font-sans">
              <strong className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                ⚖️ Technology Platform Notice
              </strong>
              Ozo acts as a technological queue booking coordinator. Medical consultations and prescriptions are the sole professional responsibility of Dr. {doctor.full_name}.
            </div>
          </div>

          {/* RIGHT: COMPREHENSIVE BOOKING FORM (7 cols) */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-[#121820] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-6">
              
              <form onSubmit={handleBooking} className="space-y-6 text-xs font-sans">
                
                {/* 1. SELECT CONSULTATION TYPE */}
                <div>
                  <label className="text-xs font-display font-bold text-slate-700 dark:text-slate-300 block mb-2.5">
                    1. Choose Consultation Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setConsultationType('clinic_visit')}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                        consultationType === 'clinic_visit'
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-sm ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        consultationType === 'clinic_visit'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'
                      }`}>
                        <Building2 size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-black text-sm text-slate-900 dark:text-white">
                            In-Clinic OPD Visit
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            ₹{doctor.consultation_fee || 500}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                          Physical checkup at {doctor.clinic_name}. Live token tracking on app.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConsultationType('teleconsult')}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                        consultationType === 'teleconsult'
                          ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 shadow-sm ring-2 ring-sky-500/20'
                          : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        consultationType === 'teleconsult'
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'
                      }`}>
                        <Video size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-black text-sm text-slate-900 dark:text-white">
                            Video Teleconsult
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">
                            ₹{doctor.teleconsult_fee || doctor.consultation_fee || 450}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                          15-min HD Video consultation + instant digital e-Prescription.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. SELECT APPOINTMENT DATE */}
                <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                  <label className="text-xs font-display font-bold text-slate-700 dark:text-slate-300 block mb-2.5">
                    2. Select Consultation Date
                  </label>

                  {/* Quick Date Pills */}
                  <div className="grid grid-cols-3 gap-2.5 mb-3">
                    <button
                      type="button"
                      onClick={() => setSelectedDate(today)}
                      className={`py-2.5 px-3 rounded-xl border text-center transition-all ${
                        selectedDate === today
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm font-bold'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[11px] block font-display">Today</span>
                      <span className="text-[10px] opacity-75">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedDate(tomorrowDate)}
                      className={`py-2.5 px-3 rounded-xl border text-center transition-all ${
                        selectedDate === tomorrowDate
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm font-bold'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[11px] block font-display">Tomorrow</span>
                      <span className="text-[10px] opacity-75">{new Date(Date.now() + 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedDate(dayAfterDate)}
                      className={`py-2.5 px-3 rounded-xl border text-center transition-all ${
                        selectedDate === dayAfterDate
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm font-bold'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[11px] block font-display">Day After</span>
                      <span className="text-[10px] opacity-75">{new Date(Date.now() + 172800000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input 
                      type="date"
                      value={selectedDate}
                      min={today}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                {/* 3. SELECT TIME SLOT */}
                <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-3">
                  <label className="text-xs font-display font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    3. Choose Preferred Time Slot
                  </label>

                  {/* Morning Slots */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 mb-1.5 block">
                      Morning Sessions (10:00 AM – 01:00 PM)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {morningSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`text-[11px] font-semibold py-2 px-2.5 rounded-xl border text-center transition-all ${
                            selectedSlot === slot
                              ? 'bg-emerald-600 text-white border-transparent font-bold shadow-md'
                              : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Evening Slots */}
                  <div className="pt-2">
                    <span className="text-[11px] font-semibold text-slate-400 mb-1.5 block">
                      Evening Sessions (05:00 PM – 08:00 PM)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {eveningSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`text-[11px] font-semibold py-2 px-2.5 rounded-xl border text-center transition-all ${
                            selectedSlot === slot
                              ? 'bg-emerald-600 text-white border-transparent font-bold shadow-md'
                              : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. PATIENT INFORMATION */}
                <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-3.5">
                  <label className="text-xs font-display font-bold text-slate-700 dark:text-slate-300 block">
                    4. Patient Details for Prescription & Token
                  </label>

                  <div>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                      Patient Full Name *
                    </span>
                    <input 
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                        Age (Years)
                      </span>
                      <input 
                        type="number"
                        placeholder="Age (e.g. 32)"
                        value={patientAge}
                        onChange={(e) => setPatientAge(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                        Gender
                      </span>
                      <select
                        value={patientGender}
                        onChange={(e) => setPatientGender(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                      Mobile Number (Token SMS will be sent here) *
                    </span>
                    <input 
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
                      Chief Symptoms / Reason for Visit
                    </span>
                    <textarea 
                      rows={2}
                      placeholder="Briefly describe symptoms (e.g. skin rash, seasonal flu, joint pain since 3 days)"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* 5. SUBMIT BUTTON */}
                <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 rounded-2xl text-white font-display font-black text-sm shadow-xl transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: themeConfig?.primary || '#059669',
                      boxShadow: `0 8px 24px ${themeConfig?.primary_glow || 'rgba(5, 150, 105, 0.35)'}`
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Generating Confirmed Token...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm Appointment & Get Token (₹{feeAmount})</span>
                        <ChevronRight size={18} />
                      </>
                    )}
                  </button>

                  <p className="text-center text-[11px] text-slate-400">
                    By confirming, you agree to receive SMS queue notifications regarding your token status.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMED BOOKING MODAL */}
      {confirmedBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200 font-sans">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-display font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Appointment Token Confirmed
            </span>

            <h3 className="text-3xl font-display font-black text-slate-900 dark:text-white mt-2">
              Token #{confirmedBooking.token_number}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Ref ID: {confirmedBooking.appointment_number}
            </p>

            <div className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Doctor:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{doctorDisplayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Clinic:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{doctor.clinic_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date & Slot:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{confirmedBooking.appointment_date} ({confirmedBooking.time_slot})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Patient:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{confirmedBooking.patient_name}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-400">Fee Payable at Clinic:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">₹{confirmedBooking.consultation_fee}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 font-display">
              <button
                onClick={() => navigate('/care/my-appointments')}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md"
              >
                View My Appointments & Live Token
              </button>
              <button
                onClick={() => navigate('/care')}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Back to OzoCare Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
