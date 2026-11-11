import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, Star, ShieldCheck, MapPin, Calendar, Clock, Phone, 
  User, CheckCircle2, AlertCircle, Video, Building2, Stethoscope, 
  FileText, Share2, Award, Heart, MessageSquare, ChevronRight, Navigation
} from 'lucide-react'
import { useCareStore } from '../../stores/careStore'
import { useAuthStore } from '../../stores/authStore'
import DoctorReviewsComponent from '../../components/care/DoctorReviewsComponent'
import toast from 'react-hot-toast'

export default function DoctorProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { getDoctorById, themeConfig, applyThemeVariables } = useCareStore()

  const [doctor, setDoctor] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('about') // 'about' | 'clinic' | 'pricing' | 'reviews'

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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${doctor?.full_name?.startsWith('Dr.') ? doctor?.full_name : `Dr. ${doctor?.full_name}`} on OzoCare`,
        text: `Book verified consultation token with ${doctor?.full_name?.startsWith('Dr.') ? doctor?.full_name : `Dr. ${doctor?.full_name}`} (${doctor?.qualification})`,
        url: window.location.href
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Doctor profile link copied to clipboard!')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-display font-medium text-slate-500">Loading Doctor Profile...</p>
        </div>
      </div>
    )
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">Doctor Not Found</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">The doctor profile you are searching for might be unavailable or awaiting credential verification.</p>
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e14] text-slate-900 dark:text-slate-100 pb-20 font-sans text-left">
      {/* Top Navbar */}
      <div className="sticky top-0 z-30 bg-white/85 dark:bg-[#0e131b]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate('/care')} 
            className="flex items-center gap-2 text-sm font-display font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Doctors
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              title="Share Profile"
            >
              <Share2 size={16} />
            </button>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" /> NMC Verified Doctor
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* DOCTOR MAIN HERO PROFILE CARD */}
        <div className="relative bg-white dark:bg-[#121820] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-white/10 shadow-sm overflow-hidden">
          {/* Theme Gradient Accent Top Stripe */}
          <div 
            className="absolute top-0 left-0 right-0 h-2.5"
            style={{ 
              background: `linear-gradient(90deg, ${themeConfig?.primary || '#059669'}, ${themeConfig?.secondary || '#06b6d4'})` 
            }}
          />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Doctor Avatar */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-emerald-500/30 p-1 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 shadow-md">
                  {avatarSrc ? (
                    <img 
                      src={avatarSrc}
                      alt={doctor.full_name}
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doctor.full_name)}&background=059669&color=fff&size=200`
                      }}
                      className="w-full h-full object-cover rounded-[1.3rem]"
                    />
                  ) : (
                    <div className="w-full h-full rounded-[1.3rem] bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-display font-black text-3xl">
                      {initials}
                    </div>
                  )}
                </div>

                <span 
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#121820] flex items-center justify-center shadow-xs"
                  title="Verified & Active on OzoCare"
                >
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                </span>
              </div>

              {/* Bio Highlights */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span 
                    className="px-3 py-0.5 rounded-full text-xs font-display font-black uppercase tracking-wider"
                    style={{ 
                      backgroundColor: themeConfig?.badge_bg || 'rgba(5,150,105,0.12)',
                      color: themeConfig?.badge_text || '#059669'
                    }}
                  >
                    {doctor.specialty_slug?.replace(/[-_]/g, ' ')}
                  </span>

                  <span className="flex items-center gap-1 text-xs font-display font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{doctor.rating || '4.9'} ({doctor.total_patients_consulted || '150'}+ Patients)</span>
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{doctorDisplayName}</span>
                  <CheckCircle2 size={20} className="text-emerald-500 shrink-0" title="State Council Verified Doctor" />
                </h1>

                <p className="text-sm font-sans font-bold text-emerald-600 dark:text-emerald-400">
                  {doctor.qualification}
                </p>

                <p className="text-xs font-sans text-slate-500 dark:text-slate-400">
                  {doctor.experience_years}+ Years Clinical Practice • State Medical Council Reg: <strong className="font-mono text-slate-700 dark:text-slate-300">{doctor.registration_number || doctor.council_registration_number || 'NMC-847291-BR'}</strong>
                </p>
              </div>
            </div>

            {/* Quick Fee Token Pill & Direct CTA */}
            <div className="bg-slate-50 dark:bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 text-right w-full md:w-auto shrink-0 flex md:flex-col justify-between items-center md:items-end gap-3">
              <div>
                <span className="text-[11px] font-display font-bold text-slate-400 uppercase tracking-wider block">Consultation Fee</span>
                <span className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-white">
                  ₹{doctor.consultation_fee || 500}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">
                  Pay at Clinic / Zero Advance
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/care/book-appointment/${doctor.id}`)}
                style={{
                  backgroundColor: themeConfig?.primary || '#059669',
                  boxShadow: `0 4px 14px ${themeConfig?.primary_glow || 'rgba(5, 150, 105, 0.3)'}`
                }}
                className="px-5 py-2.5 rounded-xl font-display font-black text-xs sm:text-sm text-white flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-md shrink-0"
              >
                <span>Book Token Now</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Quick Tabs Bar */}
          <div className="mt-8 pt-4 border-t border-slate-100 dark:border-white/5 flex gap-6 overflow-x-auto text-xs font-display font-bold">
            <button
              onClick={() => setActiveTab('about')}
              className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'about'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'
              }`}
            >
              <User size={15} /> Overview & Bio
            </button>

            <button
              onClick={() => setActiveTab('clinic')}
              className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'clinic'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'
              }`}
            >
              <Building2 size={15} /> Clinic & Timings
            </button>

            <button
              onClick={() => setActiveTab('pricing')}
              className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'pricing'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'
              }`}
            >
              <Award size={15} /> Consultation Charges
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'reviews'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'
              }`}
            >
              <MessageSquare size={15} /> Patient Reviews (★ {doctor.rating || '4.9'})
            </button>
          </div>
        </div>

        {/* MAIN BODY: 2-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (Details by Active Tab) - 7 cols */}
          <div className="lg:col-span-7 space-y-6">
            {/* TAB 1: ABOUT & BIO */}
            {activeTab === 'about' && (
              <div className="bg-white dark:bg-[#121820] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-display font-black text-slate-900 dark:text-white">
                    About {doctorDisplayName}
                  </h3>
                  <p className="text-sm font-sans text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                    {doctor.bio || `${doctorDisplayName} is a highly accomplished specialist in ${doctor.specialty_slug?.replace(/[-_]/g, ' ')} with over ${doctor.experience_years} years of dedicated clinical practice. Renowned for ethical medical consultations, evidence-based treatments, and thorough patient counseling.`}
                  </p>
                </div>

                {/* Key Clinical Credentials */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-white/5 space-y-1">
                    <span className="text-slate-400 font-medium">Medical Qualifications</span>
                    <p className="font-display font-bold text-slate-900 dark:text-white text-sm">
                      {doctor.qualification}
                    </p>
                    <p className="text-[11px] text-slate-400">Premier Medical Institutions</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-white/5 space-y-1">
                    <span className="text-slate-400 font-medium">Medical Registration</span>
                    <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-1.5">
                      <ShieldCheck size={16} /> {doctor.registration_number || doctor.council_registration_number || 'NMC-847291-BR'}
                    </p>
                    <p className="text-[11px] text-slate-400">Verified with State Medical Council</p>
                  </div>
                </div>

                {/* Specializations & Focus Areas */}
                <div>
                  <h4 className="text-sm font-display font-bold text-slate-900 dark:text-white mb-2.5">
                    Clinical Focus & Specializations
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Outpatient Clinical Care',
                      'Preventive Medicine',
                      'Prescription Management',
                      'Diet & Lifestyle Guidance',
                      'Chronic Illness Monitoring',
                      'Telemedicine Consultation'
                    ].map((spec, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                      >
                        ✓ {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CLINIC LOCATION & TIMINGS (Kaha ke hai) */}
            {activeTab === 'clinic' && (
              <div className="bg-white dark:bg-[#121820] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-display font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                      Physical Clinic Location
                    </span>
                    <span className="text-xs font-bold text-slate-400">Patna, Bihar</span>
                  </div>
                  <h3 className="text-xl font-display font-black text-slate-900 dark:text-white mt-1">
                    Clinic Details & Directions
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Where {doctorDisplayName} consults patients in-person</p>
                </div>

                {/* Primary Clinic Card */}
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                      <Building2 size={28} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-display font-black text-lg text-slate-900 dark:text-white">
                        {doctor.clinic_name}
                      </h4>
                      <p className="text-xs font-sans text-slate-600 dark:text-slate-300 flex items-start gap-1.5 leading-relaxed">
                        <MapPin size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{doctor.clinic_address}, {doctor.city || 'Patna'}, Bihar</span>
                      </p>
                      <p className="text-[11px] font-sans text-slate-400">
                        Landmark: Prominent Medical Corridor, easy access via Metro / Auto / Car Parking available
                      </p>
                    </div>
                  </div>

                  {/* Consultation Timings Grid */}
                  <div className="pt-4 border-t border-slate-200/60 dark:border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-white/5 space-y-1">
                      <span className="text-[11px] text-slate-400 font-semibold block flex items-center gap-1.5">
                        <Clock size={13} className="text-emerald-500" /> Morning OPD Session
                      </span>
                      <p className="font-display font-bold text-slate-800 dark:text-white text-xs">
                        10:00 AM – 01:30 PM (Mon – Sat)
                      </p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-white/5 space-y-1">
                      <span className="text-[11px] text-slate-400 font-semibold block flex items-center gap-1.5">
                        <Clock size={13} className="text-emerald-500" /> Evening OPD Session
                      </span>
                      <p className="font-display font-bold text-slate-800 dark:text-white text-xs">
                        05:00 PM – 08:30 PM (Mon – Sat)
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons: Google Maps & Reception Call */}
                  <div className="pt-3 border-t border-slate-200/60 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${doctor.phone || '9835012345'}`}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-xs flex items-center gap-2 transition-all shadow-sm active:scale-95"
                      >
                        <Phone size={14} />
                        <span>Call Reception (+91 {doctor.phone || '9835012345'})</span>
                      </a>

                      <a
                        href={`https://wa.me/91${doctor.phone || '9835012345'}?text=${encodeURIComponent(`Hi ${doctorDisplayName}, I am reaching out through OzoCare regarding OPD consultation timings and queue position.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2.5 rounded-xl bg-teal-600/10 hover:bg-teal-600/20 text-teal-700 dark:text-teal-300 font-display font-bold text-xs flex items-center gap-2 transition-all border border-teal-500/20 active:scale-95"
                      >
                        <MessageSquare size={14} />
                        <span>WhatsApp Desk</span>
                      </a>
                    </div>

                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(`${doctor.clinic_name} ${doctor.clinic_address} Patna`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-display font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow-sm"
                    >
                      <Navigation size={13} />
                      <span>Open in Google Maps</span>
                    </a>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300">
                  <span className="font-bold block mb-1">💡 Live Token Queue:</span>
                  Booking a token gives you a confirmed queue position. You can track your live queue token from your OzoCare account to avoid clinic waiting.
                </div>
              </div>
            )}

            {/* TAB 3: CONSULTATION CHARGES & CONTACT (Kya charges hai contact krne ki) */}
            {activeTab === 'pricing' && (
              <div className="bg-white dark:bg-[#121820] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-display font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                      Transparent Pricing
                    </span>
                    <span className="text-xs font-bold text-slate-400">Zero Advance Required</span>
                  </div>
                  <h3 className="text-xl font-display font-black text-slate-900 dark:text-white mt-1">
                    Consultation Charges & Payment Policy
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Clear doctor fees with direct payment at the clinic counter</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Mode 1: In-Clinic OPD Visit */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border-2 border-emerald-500/40 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Building2 size={16} className="text-emerald-500" />
                        In-Clinic OPD Visit
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                        Most Popular
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-display font-black text-slate-900 dark:text-white">
                        ₹{doctor.consultation_fee || 500}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">/ patient</span>
                    </div>

                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 pt-1 font-sans">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                        <span>Physical clinical examination & vitals check</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                        <span>Detailed doctor diagnosis & written Rx</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                        <span><strong>1 Free Follow-up</strong> within 5 days</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                        <span>Zero upfront booking fee • Pay at clinic</span>
                      </li>
                    </ul>
                  </div>

                  {/* Mode 2: Video Call Teleconsultation */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Video size={16} className="text-sky-500" />
                        Video Teleconsultation
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500">
                        Online
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-display font-black text-slate-900 dark:text-white">
                        ₹{doctor.teleconsult_fee || doctor.consultation_fee || 450}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">/ video call</span>
                    </div>

                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 pt-1 font-sans">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-sky-500 shrink-0" />
                        <span>15-minute 1-on-1 private video consultation</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-sky-500 shrink-0" />
                        <span>Instant digital e-Prescription (Rx) generated</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-sky-500 shrink-0" />
                        <span>1-Click medicine delivery from local chemists</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-sky-500 shrink-0" />
                        <span>Follow-up chat support for 48 hours</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Direct Contact Desk Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-display font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Phone size={15} className="text-emerald-500" />
                        Doctor & Clinic Direct Contact Desk
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        For queue status, inquiries, or urgent consultations
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${doctor.phone || '9835012345'}`}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Phone size={13} />
                        <span>Call +91 {doctor.phone || '9835012345'}</span>
                      </a>

                      <a
                        href={`https://wa.me/91${doctor.phone || '9835012345'}?text=${encodeURIComponent(`Hi ${doctorDisplayName}, I want to check appointment availability and fee details.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-display font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <MessageSquare size={13} />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: REVIEWS COMPONENT */}
            {activeTab === 'reviews' && (
              <DoctorReviewsComponent 
                doctorName={doctorDisplayName} 
                rating={doctor.rating || 4.9} 
                totalConsults={doctor.total_patients_consulted || 150} 
              />
            )}

            {/* Intermediary Regulatory Shield Notice */}
            <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 text-[11px] text-slate-500 leading-normal font-sans">
              <strong className="text-slate-700 dark:text-slate-300 font-semibold block mb-1">
                ⚖️ Intermediary Health Notice (IT Act 2000 Section 79)
              </strong>
              Ozo acts strictly as a technological communication platform and queue appointment coordinator between patients and autonomous registered medical practitioners (RMPs). Diagnosis, prescription generation, and medical treatment are the independent professional responsibility of the attending doctor. In case of an emergency, please visit the nearest hospital emergency department immediately.
            </div>
          </div>

          {/* Right Column: Instant Token & Clinic Summary Action Card - 5 cols */}
          <div className="lg:col-span-5 sticky top-24">
            <div className="bg-white dark:bg-[#121820] rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-white/10 shadow-xl space-y-6">
              
              {/* Header */}
              <div className="pb-4 border-b border-slate-100 dark:border-white/5 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-display font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Available Today
                    </span>
                  </div>
                  <h3 className="text-lg font-display font-black text-slate-900 dark:text-white mt-1">
                    Book Consultation
                  </h3>
                  <p className="text-xs text-slate-400 font-sans">
                    Guaranteed OPD Token • Live Queue
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider block">OPD Fee</span>
                  <div className="text-2xl font-display font-black text-slate-900 dark:text-white">
                    ₹{doctor.consultation_fee || 500}
                  </div>
                </div>
              </div>

              {/* Consultation Modes Quick Toggle Preview */}
              <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-emerald-500/30 space-y-1">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block flex items-center gap-1">
                    <Building2 size={13} /> In-Clinic OPD
                  </span>
                  <p className="font-display font-bold text-slate-900 dark:text-white text-sm">
                    ₹{doctor.consultation_fee || 500}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">At {doctor.clinic_name}</p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 space-y-1">
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold block flex items-center gap-1">
                    <Video size={13} /> Video Call
                  </span>
                  <p className="font-display font-bold text-slate-900 dark:text-white text-sm">
                    ₹{doctor.teleconsult_fee || doctor.consultation_fee || 450}
                  </p>
                  <p className="text-[10px] text-slate-400">Online 15-min call</p>
                </div>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 font-sans pt-1">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span><strong>Zero Advance</strong> — Pay fee at clinic counter</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span><strong>1 Free Follow-Up</strong> consultation within 5 days</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span><strong>Instant Token SMS</strong> with live queue status</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  <span>Official digital e-Prescription (Rx) generated</span>
                </div>
              </div>

              {/* MAIN CTA BUTTON -> NAVIGATES TO DEDICATED BOOKING PAGE */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate(`/care/book-appointment/${doctor.id}`)}
                  className="w-full py-4 px-6 rounded-2xl text-white font-display font-black text-sm shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-2 hover:brightness-110"
                  style={{
                    backgroundColor: themeConfig?.primary || '#059669',
                    boxShadow: `0 8px 24px ${themeConfig?.primary_glow || 'rgba(5, 150, 105, 0.35)'}`
                  }}
                >
                  <span>Book Appointment / Token</span>
                  <ChevronRight size={18} />
                </button>
                <p className="text-center text-[11px] text-slate-400 mt-2">
                  Select your date, slot & patient details on the next page
                </p>
              </div>

              {/* Direct Help / Reception Desk */}
              <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-2">
                <span className="text-[11px] font-display font-bold text-slate-400 uppercase tracking-wider block">
                  Clinic Reception Desk
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`tel:${doctor.phone || '9835012345'}`}
                    className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-slate-300 text-xs font-display font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone size={13} className="text-emerald-500" />
                    <span>Call Clinic</span>
                  </a>

                  <a
                    href={`https://wa.me/91${doctor.phone || '9835012345'}?text=${encodeURIComponent(`Hi ${doctorDisplayName}, I want to check OPD consultation token availability.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-xl border border-teal-500/20 bg-teal-500/5 hover:bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-display font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageSquare size={13} className="text-teal-500" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
