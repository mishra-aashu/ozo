import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Stethoscope,
  Search,
  Star,
  MapPin,
  Calendar,
  Pill,
  ArrowRight,
  Phone,
  CheckCircle2,
  Building2,
  FileText,
  Upload,
  X,
  Activity,
  ChevronDown
} from 'lucide-react'
import { useCareStore } from '../../stores/careStore'
import { useLocationStore } from '../../stores/locationStore'
import SpecialtyIcon, { CARE_SPECIALTIES } from '../../utils/careIcons'
import DoctorCardHome from '../../components/care/DoctorCardHome'
import CareHeroSlider from '../../components/care/CareHeroSlider'

export default function CareHome() {
  const navigate = useNavigate()
  const [showAllSpecialties, setShowAllSpecialties] = useState(true)
  const { addressDetails, nearestCity } = useLocationStore()
  const activeCityName = addressDetails?.city || nearestCity?.name || 'Aurangabad'
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
      
      {/* 1. HERO BANNER WITH CRISP PUNCHY VALUE PROP & 2 ACTION CARDS */}
      <section className="relative overflow-hidden pt-4 sm:pt-7 pb-6 sm:pb-10 px-3 xs:px-4 sm:px-6 lg:px-8 border-b border-gray-200/80 dark:border-white/5">
        {/* Dynamic mesh glow background based on theme */}
        <div 
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: themeConfig?.primary || '#059669' }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 sm:gap-8">
            
            {/* Left: Clean, Solid Headline & 2 Direct Action Buttons */}
            <div className="w-full max-w-2xl space-y-3.5 sm:space-y-4 min-w-0">
              
              {/* Clean Single-Line Status Badge */}
              <motion.div 
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 max-w-full select-none"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="truncate">NMC Verified Doctors & 30m Pharmacy Network</span>
              </motion.div>

              {/* Natural Heading (NO manual line breaks or broken fragments) */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.08 }}
              >
                <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  Doctor OPD & Medicines in 30 Mins.
                </h1>
              </motion.div>

              {/* 2 Clean, Solid Single-Line Action Buttons */}
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.14 }}
                className="grid grid-cols-2 gap-2.5 sm:gap-3.5 pt-1 w-full"
              >
                <Link
                  to="/care/my-appointments"
                  className="h-12 px-3.5 rounded-xl sm:rounded-2xl bg-white dark:bg-[#121820] border border-slate-200/90 dark:border-white/10 hover:border-emerald-500/50 text-slate-800 dark:text-white font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all active:scale-95 text-center min-w-0"
                >
                  <Calendar size={16} className="text-emerald-500 shrink-0" />
                  <span className="truncate">My Appointments</span>
                </Link>

                <Link
                  to="/care/order-medicines"
                  className="h-12 px-3.5 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 hover:shadow-lg transition-all active:scale-95 text-center min-w-0"
                >
                  <Pill size={16} className="shrink-0" />
                  <span className="truncate">Order Medicines</span>
                </Link>
              </motion.div>
            </div>

            {/* Right: Visual Care Hero Carousel (4 Slides with High-Res Images & Auto-Slide) */}
            <div className="w-full max-w-full lg:w-[480px] xl:w-[540px] lg:shrink-0 overflow-hidden">
              <CareHeroSlider />
            </div>
          </div>
        </div>
      </section>

      {/* 2. MEDICAL SPECIALTIES GRID */}
      <section className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] xs:text-xs font-display font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Find Doctors By Clinical Field
              </span>
              <span className="text-[10px] xs:text-xs font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                {CARE_SPECIALTIES.length} Specialities
              </span>
            </div>
            <h2 className="text-xl sm:text-3xl font-display font-black text-gray-900 dark:text-white mt-0.5 tracking-tight">
              Medical Specialities
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {selectedSpecialty !== 'all' && (
              <button
                onClick={() => setSelectedSpecialty('all')}
                className="text-xs font-display font-bold text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
              >
                <X size={13} />
                <span>Clear Filter</span>
              </button>
            )}

            <button
              onClick={() => setShowAllSpecialties(!showAllSpecialties)}
              className="text-xs font-display font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>{showAllSpecialties ? 'Show Top 8' : `Show All (${CARE_SPECIALTIES.length})`}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllSpecialties ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3 sm:gap-3.5">
          {(showAllSpecialties ? CARE_SPECIALTIES : CARE_SPECIALTIES.slice(0, 8)).map((spec) => {
            const isSelected = selectedSpecialty === spec.slug
            return (
              <button
                key={spec.slug}
                onClick={() => setSelectedSpecialty(isSelected ? 'all' : spec.slug)}
                title={`${spec.title} - ${spec.subtitle || spec.description || ''}`}
                className={`p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all text-center flex flex-col items-center justify-center group active:scale-95 min-w-0 cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-md scale-[1.02]'
                    : 'bg-white/90 dark:bg-[#161e27]/90 border-gray-200 dark:border-white/10 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 hover:shadow-md'
                }`}
              >
                <div className="w-12 h-12 sm:w-13 sm:h-13 flex items-center justify-center mb-2 relative shrink-0 group-hover:scale-110 group-hover:-translate-y-0.5 transition-all duration-200">
                  <div 
                    className="absolute inset-1 rounded-2xl blur-md opacity-20 dark:opacity-30 group-hover:opacity-45 transition-opacity duration-200 pointer-events-none" 
                    style={{ backgroundColor: spec.accentColor }} 
                  />
                  <SpecialtyIcon slug={spec.slug} size={42} className="relative z-10 drop-shadow-sm" />
                </div>
                <div className="w-full min-w-0 flex items-center justify-center min-h-[32px]">
                  <span className="text-xs sm:text-[13px] font-display font-bold text-gray-900 dark:text-white leading-tight text-center break-words line-clamp-2">
                    {spec.title}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </section>


      {/* 3. VERIFIED DOCTORS LIST & SEARCH */}
      <section className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-3 sm:py-5 space-y-3 sm:space-y-4">
        
        {/* Clean, Non-Cluttered Section Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <h2 className="text-lg xs:text-xl sm:text-2xl font-display font-black text-gray-900 dark:text-white tracking-tight truncate">
              Doctors in {activeCityName}
            </h2>
            <span className="text-[11px] sm:text-xs font-display font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              {doctors.length}
            </span>
          </div>

          {(searchQuery || selectedSpecialty !== 'all') && (
            <button
              onClick={() => { setSelectedSpecialty('all'); setSearchQuery('') }}
              className="text-xs font-display font-bold text-rose-500 hover:text-rose-600 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            >
              <X size={13} />
              <span>Clear Filter</span>
            </button>
          )}
        </div>

        {/* Clean, Modern Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search doctor, clinic, or specialty..."
            className="w-full bg-white dark:bg-[#121820] border border-slate-200/90 dark:border-white/10 rounded-2xl pl-10 sm:pl-11 pr-10 py-3 text-xs sm:text-sm font-sans font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-xs"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              title="Clear Search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Doctor Cards Grid */}
        {isLoadingDoctors ? (
          <div className="text-center py-20 text-gray-400 text-sm font-display font-bold animate-pulse">
            Loading verified doctors in your area...
          </div>
        ) : doctors.length === 0 ? (
          <div className="bg-white/60 dark:bg-[#161e27]/60 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl sm:rounded-3xl p-8 sm:p-14 text-center">
            <Stethoscope className="w-12 h-12 text-gray-300 dark:text-white/20 mx-auto mb-3" />
            {selectedSpecialty !== 'all' || searchQuery.trim() ? (
              <>
                <h3 className="text-base font-display font-black text-gray-800 dark:text-gray-200">No Doctors Match Your Search</h3>
                <p className="text-xs font-sans text-gray-400 mt-1 max-w-sm mx-auto">Try clearing search filters or choosing another specialty category.</p>
                <button
                  onClick={() => { setSelectedSpecialty('all'); setSearchQuery('') }}
                  className="mt-4 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-display font-bold shadow-md hover:bg-emerald-500 transition-colors"
                >
                  Reset Filters
                </button>
              </>
            ) : (
              <>
                <h3 className="text-base font-display font-black text-gray-800 dark:text-gray-200">No Doctors Listed Yet</h3>
                <p className="text-xs font-sans text-gray-400 mt-1 max-w-sm mx-auto">
                  Verified medical specialists will appear here once onboarded.
                </p>
                <div className="flex items-center justify-center gap-3 mt-4">
                  <Link
                    to="/doctor"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-display font-bold shadow-md transition-colors inline-flex items-center gap-2"
                  >
                    <Stethoscope size={14} />
                    <span>Are you a Doctor? Onboard Practice</span>
                  </Link>
                </div>
              </>
            )}
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
