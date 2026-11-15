import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Stethoscope,
  Search,
  ShieldCheck,
  Star,
  MapPin,
  Calendar,
  Pill,
  ArrowRight,
  Clock,
  Sparkles,
  Phone,
  CheckCircle2,
  Building2,
  FileText,
  Upload,
  X,
  Activity
} from 'lucide-react'
import { useCareStore } from '../../stores/careStore'
import SpecialtyIcon, { CARE_SPECIALTIES } from '../../utils/careIcons'
import DoctorCardHome from '../../components/care/DoctorCardHome'
import CareHeroSlider from '../../components/care/CareHeroSlider'

export default function CareHome() {
  const navigate = useNavigate()
  const {
    doctors,
    selectedSpecialty,
    setSelectedSpecialty,
    searchQuery,
    setSearchQuery,
    fetchDoctors,
    themeConfig,
    fetchThemeConfig,
    isLoadingDoctors
  } = useCareStore()

  useEffect(() => {
    fetchThemeConfig()
    fetchDoctors()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#0c1015] text-left pb-28 md:pb-20 font-sans overflow-x-clip">
      
      {/* 1. HERO BANNER WITH VISUAL HEALTHCARE SHOWCASE */}
      <section className="relative overflow-hidden pt-5 sm:pt-8 pb-8 sm:pb-12 px-3 xs:px-4 sm:px-6 lg:px-8 border-b border-gray-200/80 dark:border-white/5">
        {/* Dynamic mesh glow background based on theme */}
        <div 
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full blur-3xl opacity-35 pointer-events-none"
          style={{ backgroundColor: themeConfig?.primary || '#059669' }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 sm:gap-8">
            
            {/* Left: Headline & Trust Actions */}
            <div className="w-full max-w-2xl space-y-3 sm:space-y-4 min-w-0">
              <div 
                className="inline-flex items-center gap-1.5 xs:gap-2 px-2.5 xs:px-3 py-1 xs:py-1.5 rounded-full text-[10px] xs:text-xs font-display font-black uppercase tracking-wider border shadow-xs max-w-full overflow-hidden"
                style={{
                  backgroundColor: themeConfig?.badge_bg || 'rgba(5, 150, 105, 0.12)',
                  borderColor: themeConfig?.primary || '#059669',
                  color: themeConfig?.badge_text || '#10b981'
                }}
              >
                <ShieldCheck size={13} className="shrink-0 text-emerald-500" />
                <span className="truncate min-w-0">NMC Verified Doctors • 100% Licensed Chemists</span>
              </div>

              <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-display font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                Healthcare with Trust. <br className="hidden xs:inline" />
                <span 
                  className="bg-clip-text text-transparent bg-gradient-to-r"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${themeConfig?.primary || '#059669'}, ${themeConfig?.secondary || '#06b6d4'})`
                  }}
                >
                  Consult Doctors & Order Medicines
                </span>
              </h1>

              <p className="text-xs xs:text-sm sm:text-base text-gray-600 dark:text-gray-300 font-sans font-medium leading-relaxed">
                Book verified clinic visits or teleconsultations with top specialists in Patna. Get digital prescriptions fulfilled in 30 minutes by your trusted neighborhood chemist.
              </p>

              {/* Quick Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1 sm:pt-2 w-full max-w-full">
                <Link
                  to="/care/my-appointments"
                  className="w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl bg-white dark:bg-[#161e27] border border-gray-200 dark:border-white/10 hover:border-emerald-500 text-xs sm:text-sm font-display font-bold text-gray-800 dark:text-gray-200 transition-all flex items-center justify-center gap-2 shadow-xs hover:-translate-y-0.5 active:scale-95 text-center min-w-0"
                >
                  <Calendar size={16} className="text-emerald-500 shrink-0" />
                  <span className="truncate">My Appointments & Tokens</span>
                </Link>

                <Link
                  to="/care/order-medicines"
                  className="w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl text-white text-xs sm:text-sm font-display font-black transition-all flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5 active:scale-95 text-center min-w-0"
                  style={{ 
                    backgroundColor: themeConfig?.primary || '#059669',
                    boxShadow: `0 8px 20px ${themeConfig?.primary_glow || 'rgba(5, 150, 105, 0.35)'}`
                  }}
                >
                  <Upload size={16} className="shrink-0" />
                  <span className="truncate">Order Medicines from Local Chemist</span>
                </Link>
              </div>
            </div>

            {/* Right: Visual Care Hero Carousel (4 Slides with High-Res Images & Auto-Slide) */}
            <div className="w-full max-w-full lg:w-[480px] xl:w-[540px] lg:shrink-0 overflow-hidden">
              <CareHeroSlider />
            </div>
          </div>
        </div>
      </section>

      {/* 2. MEDICAL SPECIALTIES GRID */}
      <section className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-6 sm:py-10 overflow-hidden">
        <div className="flex items-end justify-between mb-4 sm:mb-6">
          <div>
            <span className="text-[10px] xs:text-xs font-display font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Find Doctors By Clinical Field
            </span>
            <h2 className="text-xl sm:text-3xl font-display font-black text-gray-900 dark:text-white mt-0.5 tracking-tight">
              Medical Specialities
            </h2>
          </div>

          <button
            onClick={() => setSelectedSpecialty('all')}
            className={`text-xs font-display font-black transition-colors ${
              selectedSpecialty === 'all' ? 'text-emerald-600 dark:text-emerald-400 underline' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            Show All
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3.5">
          {CARE_SPECIALTIES.map((spec) => {
            const isSelected = selectedSpecialty === spec.slug
            return (
              <button
                key={spec.slug}
                onClick={() => setSelectedSpecialty(isSelected ? 'all' : spec.slug)}
                className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all text-center flex flex-col items-center justify-between group active:scale-95 min-w-0 overflow-hidden ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-md scale-[1.02]'
                    : 'bg-white/90 dark:bg-[#161e27]/90 border-gray-200 dark:border-white/10 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 hover:shadow-md'
                }`}
              >
                <div 
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center text-white mb-2 shadow-md bg-gradient-to-br ${spec.gradient} group-hover:scale-110 transition-transform shrink-0`}
                >
                  <SpecialtyIcon slug={spec.slug} size={20} />
                </div>
                <div className="w-full min-w-0">
                  <h4 className="text-[11px] sm:text-xs font-display font-black text-gray-900 dark:text-white leading-tight truncate">
                    {spec.title}
                  </h4>
                  <p className="text-[9px] sm:text-[10px] font-sans font-medium text-gray-400 mt-0.5 truncate">
                    {spec.subtitle || spec.badge}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </section>


      {/* 3. VERIFIED DOCTORS LIST & DEDICATED SEARCH TOOLBAR */}
      <section className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
        
        {/* Section Heading Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] xs:text-xs font-display font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                In-Clinic OPD & Video Consultations
              </span>
              <span className="text-[10px] xs:text-xs font-bold text-slate-400">• Patna Region</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-display font-black text-gray-900 dark:text-white tracking-tight mt-0.5">
              Verified Doctors in Patna
            </h2>
            <p className="text-xs sm:text-sm font-sans text-gray-400 mt-0.5">
              NMC / Bihar Medical Council Registration verified. Direct clinic tokens & instant queue slots.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="text-xs font-display font-black px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {doctors.length} Doctors Available
            </span>
            {(searchQuery || selectedSpecialty !== 'all') && (
              <button
                onClick={() => { setSelectedSpecialty('all'); setSearchQuery('') }}
                className="text-xs font-display font-bold text-slate-400 hover:text-rose-500 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
              >
                <X size={13} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Dedicated Search & Symptoms Toolbar */}
        <div className="bg-white dark:bg-[#121820] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-3.5 sm:space-y-4">
          
          {/* Main Doctor Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search doctor, clinic, specialty, or illness..."
              className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl sm:rounded-2xl pl-10 sm:pl-11 pr-10 py-3 sm:py-3.5 text-xs sm:text-sm font-sans font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-inner"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                title="Clear Search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Common Symptoms Quick Filter Chips */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-0.5">
            <span className="text-[11px] font-display font-bold text-slate-400 shrink-0">
              Common Symptoms:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {['Fever', 'Cough & Flu', 'Joint Pain', 'Skin Rash', 'Stomach Ache', 'PCOS', 'Acne', 'Diabetes'].map((sym) => {
                const isSymActive = searchQuery.toLowerCase().includes(sym.toLowerCase())
                return (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => {
                      if (isSymActive) {
                        setSearchQuery('')
                      } else {
                        setSearchQuery(sym)
                      }
                    }}
                    className={`px-2.5 xs:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] xs:text-xs font-sans font-bold transition-all border ${
                      isSymActive
                        ? 'bg-emerald-600 text-white border-transparent shadow-sm'
                        : 'bg-slate-50 dark:bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-500 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-white/5'
                    }`}
                  >
                    {sym}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Doctor Cards Grid */}
        {isLoadingDoctors ? (
          <div className="text-center py-20 text-gray-400 text-sm font-display font-bold animate-pulse">
            Loading verified doctors in your area...
          </div>
        ) : doctors.length === 0 ? (
          <div className="bg-white/60 dark:bg-[#161e27]/60 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl sm:rounded-3xl p-10 sm:p-16 text-center">
            <Stethoscope className="w-12 h-12 text-gray-300 dark:text-white/20 mx-auto mb-3" />
            <h3 className="text-base font-display font-black text-gray-800 dark:text-gray-200">No Doctors Found</h3>
            <p className="text-xs font-sans text-gray-400 mt-1 max-w-sm mx-auto">Try clearing search filters or choosing another specialty category.</p>
            <button
              onClick={() => { setSelectedSpecialty('all'); setSearchQuery('') }}
              className="mt-4 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-display font-bold shadow-md"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-2">
            {doctors.map((doc) => (
              <DoctorCardHome key={doc.id} doctor={doc} />
            ))}
          </div>
        )}
      </section>

      {/* 4. LOCAL PHARMACY BANNER */}
      <section className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-gradient-to-r from-teal-900/90 to-emerald-950/90 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-10 border border-teal-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6 relative overflow-hidden shadow-2xl">
          <div className="space-y-2 max-w-xl relative z-10">
            <span className="text-[9px] xs:text-[10px] font-display font-black uppercase tracking-wider px-2.5 xs:px-3 py-1 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/30">
              Form 20/21 Licensed Pharmacy Network
            </span>
            <h3 className="text-xl sm:text-3xl font-display font-black tracking-tight leading-snug">
              Order Medicines from Your Local Chemist
            </h3>
            <p className="text-xs sm:text-sm text-teal-100/80 font-sans leading-relaxed">
              Upload doctor prescription or choose from e-Prescription vault. Genuine medicines delivered to your doorstep in 30 minutes with bill and batch guarantee.
            </p>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full sm:w-auto">
            <Link
              to="/care/order-medicines"
              className="px-5 py-3 sm:px-6 sm:py-3.5 bg-white text-emerald-950 hover:bg-emerald-50 rounded-xl sm:rounded-2xl font-display font-black text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95 text-center"
            >
              <Upload size={16} />
              <span>Upload Prescription Now</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
