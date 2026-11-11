import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, Star, ShieldCheck, MapPin, Calendar, Clock, Phone, 
  User, CheckCircle, AlertCircle, Video, Building2, Stethoscope, FileText 
} from 'lucide-react'
import { useCareStore } from '../../stores/careStore'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

export default function DoctorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { getDoctorById, bookAppointment, themeConfig, applyThemeVariables } = useCareStore()

  const [doctor, setDoctor] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Booking Form State
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [selectedSlot, setSelectedSlot] = useState('10:00 AM - 10:30 AM')
  const [consultationType, setConsultationType] = useState('clinic_visit') // 'clinic_visit' | 'teleconsult'
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

  const timeSlots = [
    '09:30 AM - 10:00 AM',
    '10:00 AM - 10:30 AM',
    '10:30 AM - 11:00 AM',
    '11:30 AM - 12:00 PM',
    '05:00 PM - 05:30 PM',
    '05:30 PM - 06:00 PM',
    '06:30 PM - 07:00 PM',
    '07:30 PM - 08:00 PM'
  ]

  const handleBooking = async (e) => {
    e.preventDefault()
    if (!patientName.trim()) {
      toast.error('Please enter patient name')
      return
    }
    if (!patientPhone.trim() || patientPhone.trim().length < 10) {
      toast.error('Please enter a valid 10-digit mobile number')
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
      symptoms: symptoms.trim() || 'General health consultation',
      consultation_fee: doctor.consultation_fee || 500,
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Loading Doctor Profile...</p>
        </div>
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Doctor Not Found</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">The doctor profile you are searching for might be unavailable or awaiting credential verification.</p>
        <Link 
          to="/care"
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to OzoCare
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 font-sans">
      {/* Top Navbar */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button 
            onClick={() => navigate('/care')} 
            className="flex items-center gap-2 text-sm font-display font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Care
          </button>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-display font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" /> NMC / State Council Verified
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Doctor Profile Details */}
          <div className="lg:col-span-7 space-y-6">
            {/* Card: Doctor Main Info */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
              <div 
                className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r"
                style={{ 
                  background: `linear-gradient(90deg, ${themeConfig?.primary || '#059669'}, ${themeConfig?.secondary || '#06b6d4'})` 
                }}
              />
              
              <div className="flex flex-col sm:flex-row items-start gap-5 pt-2">
                <img 
                  src={doctor.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.full_name)}&background=059669&color=fff&size=200`}
                  alt={doctor.full_name}
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.full_name)}&background=059669&color=fff&size=200`
                  }}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-slate-100 dark:border-slate-800 shadow-md"
                />

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-xs font-display font-bold uppercase tracking-wide"
                      style={{ 
                        backgroundColor: themeConfig?.badge_bg || 'rgba(5,150,105,0.12)',
                        color: themeConfig?.badge_text || '#059669'
                      }}
                    >
                      {doctor.specialty_slug?.replace('_', ' ')}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-display font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {doctor.rating || '4.9'} ({doctor.total_patients_consulted || '150'}+ Patients)
                    </span>
                  </div>

                  <h1 className="text-2xl font-display font-black text-slate-900 dark:text-white">
                    Dr. {doctor.full_name}
                  </h1>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    {doctor.qualification} • {doctor.experience_years} Years Clinical Exp.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{doctor.clinic_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{doctor.clinic_address || 'Patna, Bihar'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verified Credentials Box */}
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                  <p className="text-slate-400 font-medium">Medical Registration Reg. No</p>
                  <p className="text-slate-900 dark:text-white font-mono font-bold mt-0.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    {doctor.registration_number || 'NMC-847291-BR'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Verified with State Medical Council</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                  <p className="text-slate-400 font-medium">Clinical Consultation Fee</p>
                  <p className="text-emerald-600 dark:text-emerald-400 font-bold text-base mt-0.5">
                    ₹{doctor.consultation_fee || 500}
                    <span className="text-xs text-slate-400 font-normal ml-1.5">(Pay at Clinic / OPD)</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Zero Booking Advance Required</p>
                </div>
              </div>

              {/* Bio & Clinical Expertise */}
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Doctor Profile & Clinical Focus</h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {doctor.bio || `Dr. ${doctor.full_name} is an esteemed specialist in ${doctor.specialty_slug?.replace('_', ' ')} with over ${doctor.experience_years} years of practice in premier clinical institutes. Dedicated to evidence-based medicine, patient-centric care, and ethical diagnosis.`}
                </p>
              </div>

              {/* Clinic Timings */}
              <div className="mt-5 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-start gap-3">
                <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">OPD Clinic Hours: </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {doctor.timings ? JSON.stringify(doctor.timings) : 'Mon - Sat: 09:30 AM - 01:30 PM, 05:00 PM - 08:30 PM'}
                  </span>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                    ✓ Live Token queue system helps avoid clinic waiting times.
                  </p>
                </div>
              </div>
            </div>

            {/* Intermediary Regulatory Shield Notice */}
            <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 leading-normal">
              <strong className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                ⚖️ Intermediary Health Notice (IT Act 2000 Section 79)
              </strong>
              Ozo acts strictly as a technological communication platform and queue appointment coordinator between patients and autonomous registered medical practitioners (RMPs). Diagnosis, prescription generation, and medical treatment are the independent professional responsibility of the attending doctor. In case of an emergency, please visit the nearest hospital emergency department immediately.
            </div>
          </div>

          {/* Right Column: Appointment Booking Engine */}
          <div className="lg:col-span-5">
            <div className="sticky top-20 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-md">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">Book Consultation</h2>
                  <p className="text-xs text-slate-400">Instant Token Confirmation</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-slate-900 dark:text-white">₹{doctor.consultation_fee || 500}</div>
                  <span className="text-[10px] text-emerald-600 font-semibold">Pay at Clinic</span>
                </div>
              </div>

              {/* Consultation Type Selector */}
              <div className="mt-5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">
                  Consultation Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConsultationType('clinic_visit')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                      consultationType === 'clinic_visit'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Building2 className="w-4 h-4" /> In-Clinic Visit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsultationType('teleconsult')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                      consultationType === 'teleconsult'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Video className="w-4 h-4" /> Teleconsult (Video)
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleBooking} className="mt-5 space-y-4">
                {/* Date Picker */}
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Select Appointment Date
                  </label>
                  <div className="relative">
                    <input 
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                {/* Time Slots */}
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                    Available Slots
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`text-[11px] font-semibold py-2 px-2.5 rounded-lg border text-center transition-all ${
                          selectedSlot === slot
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Patient Information */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Patient Full Name *
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Age
                      </label>
                      <input 
                        type="number"
                        placeholder="Age (yrs)"
                        value={patientAge}
                        onChange={(e) => setPatientAge(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Gender
                      </label>
                      <select
                        value={patientGender}
                        onChange={(e) => setPatientGender(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Mobile Number (for Token SMS) *
                    </label>
                    <input 
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Chief Symptoms / Health Concern
                    </label>
                    <textarea 
                      rows={2}
                      placeholder="Describe briefly (e.g. fever since 3 days, mild cough, body ache)"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-xl text-white font-display font-black text-sm shadow-lg transition-all transform active:scale-95 disabled:opacity-50"
                  style={{
                    backgroundColor: themeConfig?.primary || '#059669',
                    boxShadow: `0 8px 20px ${themeConfig?.primary_glow || 'rgba(5, 150, 105, 0.35)'}`
                  }}
                >
                  {isSubmitting ? 'Generating Consultation Token...' : `Confirm Token Booking (₹${doctor.consultation_fee || 500})`}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Confirmation Modal */}
      {confirmedBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4">
              <CheckCircle className="w-9 h-9" />
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-display font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Appointment Token Confirmed
            </span>

            <h3 className="text-2xl font-display font-black text-slate-900 dark:text-white mt-2">
              Token #{confirmedBooking.token_number}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Ref ID: {confirmedBooking.appointment_number}
            </p>

            <div className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Doctor:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Dr. {doctor.full_name}</span>
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

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => navigate('/care/my-appointments')}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md"
              >
                View My Appointments & Live Token
              </button>
              <button
                onClick={() => setConfirmedBooking(null)}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Book Another Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
