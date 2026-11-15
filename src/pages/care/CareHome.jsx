import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
      
      {/* 1. HERO BANNER WITH CRISP PUNCHY VALUE PROP & 2 ACTION CARDS */}
      <section className="relative overflow-hidden pt-4 sm:pt-7 pb-6 sm:pb-10 px-3 xs:px-4 sm:px-6 lg:px-8 border-b border-gray-200/80 dark:border-white/5">
        {/* Dynamic mesh glow background based on theme */}
        <div 
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: themeConfig?.primary || '#059669' }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 sm:gap-8">
            
            {/* Left: Punchy Headline, Live Beacon & 2 Interactive Action Cards */}
            <div className="w-full max-w-2xl space-y-3 sm:space-y-4 min-w-0">
              
              {/* Live Status Pill with pulsing beacon */}
              <motion.div 
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="inline-flex items-center gap-2 px-2.5 xs:px-3 py-1 rounded-full text-[10px] xs:text-[11px] font-sans font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 backdrop-blur-md select-none max-w-full overflow-hidden"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="truncate">Verified Doctors & 30m Chemist Network</span>
              </motion.div>

              {/* Punchy Animated Headline */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="space-y-1.5"
              >
                <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tight leading-[1.12]">
                  Instant Doctor OPD & <br className="hidden xs:inline" />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500">
                    Medicines in 30 Mins.
                  </span>
                </h1>
                
                {/* Micro Trust Points (3 clean points, zero long AI paragraphs) */}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] xs:text-xs text-slate-500 dark:text-slate-400 font-sans font-medium pt-0.5">
                  <span className="flex items-center gap-1 shrink-0">
                    <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                    <span>NMC Verified Doctors</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 shrink-0">
                    <Clock size={13} className="text-teal-500 shrink-0" />
                    <span>Zero Advance Fee</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 shrink-0">
                    <Sparkles size={13} className="text-amber-500 shrink-0" />
                    <span>Pay at Clinic Counter</span>
                  </span>
                </div>
              </motion.div>

              {/* 2 Sleek Interactive Action Cards (Side-by-Side on Mobile!) */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.18 }}
                className="grid grid-cols-2 gap-2.5 sm:gap-3.5 pt-1 w-full"
              >
                {/* Action Card 1: Doctors & OPD Tokens */}
                <Link
                  to="/care/my-appointments"
                  className="group relative p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#121820] border border-slate-200/90 dark:border-white/10 hover:border-emerald-500/50 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden active:scale-95"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Calendar size={17} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 leading-none">
                      Live Queue
                    </span>
                  </div>

                  <div className="mt-2 text-left">
                    <h3 className="font-display font-black text-xs sm:text-sm text-slate-900 dark:text-white leading-tight flex items-center gap-1 group-hover:text-emerald-500 transition-colors">
                      <span>Book OPD Token</span>
                      <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform shrink-0" />
                    </h3>
                    <p className="text-[10px] text-slate-400 font-sans mt-0.5 truncate">
                      Skip Clinic Waiting
                    </p>
                  </div>
                </Link>

                {/* Action Card 2: 30-Min Medicine Delivery */}
                <Link
                  to="/care/order-medicines"
                  className="group relative p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md hover:shadow-xl hover:shadow-emerald-950/30 transition-all duration-300 flex flex-col justify-between overflow-hidden active:scale-95"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Pill size={17} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/20 text-white leading-none">
                      ⚡ 30m Express
                    </span>
                  </div>

                  <div className="mt-2 text-left">
                    <h3 className="font-display font-black text-xs sm:text-sm text-white leading-tight flex items-center gap-1">
                      <span>Order Medicines</span>
                      <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform shrink-0" />
                    </h3>
                    <p className="text-[10px] text-emerald-100/90 font-sans mt-0.5 truncate">
                      Upload Rx Chemist Bill
                    </p>
                  </div>
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
