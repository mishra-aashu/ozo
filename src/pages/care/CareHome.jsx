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
  Upload
} from 'lucide-react'
import { useCareStore } from '../../stores/careStore'
import SpecialtyIcon, { CARE_SPECIALTIES } from '../../utils/careIcons'

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
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#0c1015] text-left pb-20 font-sans">
      
      {/* 1. HERO BANNER */}
      <section className="relative overflow-hidden pt-8 pb-12 px-4 sm:px-6 lg:px-8 border-b border-gray-200/80 dark:border-white/5">
        {/* Dynamic mesh glow background based on theme */}
        <div 
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full blur-3xl opacity-35 pointer-events-none"
          style={{ backgroundColor: themeConfig?.primary || '#059669' }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-4">
              <div 
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-display font-black uppercase tracking-wider border shadow-xs"
                style={{
                  backgroundColor: themeConfig?.badge_bg || 'rgba(5, 150, 105, 0.12)',
                  borderColor: themeConfig?.primary || '#059669',
                  color: themeConfig?.badge_text || '#10b981'
                }}
              >
                <ShieldCheck size={14} />
                <span>NMC Certified Doctors • 100% Licensed Local Chemists</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-display font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                Healthcare with Trust. <br />
                <span 
                  className="bg-clip-text text-transparent bg-gradient-to-r"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${themeConfig?.primary || '#059669'}, ${themeConfig?.secondary || '#06b6d4'})`
                  }}
                >
                  Consult Doctors & Order Meds
                </span>
              </h1>

              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 font-sans font-medium leading-relaxed">
                Book verified clinic visits or teleconsultations with top specialists in Patna. Get digital prescriptions fulfilled by your trusted neighborhood pharmacy.
              </p>

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/care/my-appointments"
                  className="px-5 py-3 rounded-2xl bg-white dark:bg-[#161e27] border border-gray-200 dark:border-white/10 hover:border-emerald-500 text-xs sm:text-sm font-display font-bold text-gray-800 dark:text-gray-200 transition-all flex items-center gap-2 shadow-xs"
                >
                  <Calendar size={16} className="text-emerald-500" />
                  <span>My Appointments & Tokens</span>
                </Link>

                <Link
                  to="/care/order-medicines"
                  className="px-5 py-3 rounded-2xl text-white text-xs sm:text-sm font-display font-black transition-all flex items-center gap-2 shadow-md active:scale-95"
                  style={{ 
                    backgroundColor: themeConfig?.primary || '#059669',
                    boxShadow: `0 8px 20px ${themeConfig?.primary_glow || 'rgba(5, 150, 105, 0.35)'}`
                  }}
                >
                  <Upload size={16} />
                  <span>Order Medicines from Local Chemist</span>
                </Link>
              </div>
            </div>

            {/* Quick Search & Symptoms Card */}
            <div className="w-full lg:w-96 bg-white/90 dark:bg-[#161e27]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-black uppercase tracking-wider text-gray-400">Quick Doctor Search</span>
                <span className="text-xs font-display font-bold text-emerald-500">Patna Hub</span>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Doctor name, clinic, or fever..."
                  className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-xs sm:text-sm font-sans font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <span className="text-[11px] font-display font-bold text-gray-400 block mb-2">Common Symptoms:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Fever', 'Cough & Flu', 'Joint Pain', 'Skin Rash', 'Stomach Ache', 'PCOS', 'Acne'].map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => setSearchQuery(sym)}
                      className="px-3 py-1 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-500 text-gray-600 dark:text-gray-300 text-xs font-sans font-bold transition-all border border-gray-200/50 dark:border-white/5"
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MEDICAL SPECIALTIES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="text-xs font-display font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Find Doctors By Clinical Field
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-gray-900 dark:text-white mt-1 tracking-tight">
              Medical Specialities
            </h2>
          </div>

          <button
            onClick={() => setSelectedSpecialty('all')}
            className={`text-xs font-display font-black transition-colors ${
              selectedSpecialty === 'all' ? 'text-emerald-600 dark:text-emerald-400 underline' : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            Show All Doctors
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
          {CARE_SPECIALTIES.map((spec) => {
            const isSelected = selectedSpecialty === spec.slug
            return (
              <button
                key={spec.slug}
                onClick={() => setSelectedSpecialty(isSelected ? 'all' : spec.slug)}
                className={`p-4 rounded-3xl border transition-all text-center flex flex-col items-center justify-between group active:scale-95 ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20 shadow-md scale-[1.02]'
                    : 'bg-white/90 dark:bg-[#161e27]/90 border-gray-200 dark:border-white/10 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 hover:shadow-md'
                }`}
              >
                <div 
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-2.5 shadow-md bg-gradient-to-br ${spec.gradient} group-hover:scale-110 transition-transform`}
                >
                  <SpecialtyIcon slug={spec.slug} size={22} />
                </div>
                <div>
                  <h4 className="text-xs font-display font-black text-gray-900 dark:text-white leading-tight">
                    {spec.title}
                  </h4>
                  <p className="text-[10px] font-sans font-medium text-gray-400 mt-1 line-clamp-1">
                    {spec.subtitle || spec.badge}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* 3. VERIFIED DOCTORS LIST */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-gray-900 dark:text-white tracking-tight">
              Verified Doctors in Patna
            </h2>
            <p className="text-xs sm:text-sm font-sans text-gray-400 mt-0.5">
              NMC / Bihar Medical Council Registration verified. Direct clinic tokens & slots.
            </p>
          </div>

          <span className="text-xs font-display font-black px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500">
            {doctors.length} Doctors Available
          </span>
        </div>

        {isLoadingDoctors ? (
          <div className="text-center py-20 text-gray-400 text-sm font-display font-bold animate-pulse">
            Loading verified doctors in your area...
          </div>
        ) : doctors.length === 0 ? (
          <div className="bg-white/60 dark:bg-[#161e27]/60 border border-dashed border-gray-200 dark:border-white/10 rounded-3xl p-16 text-center">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {doctors.map((doc) => (
              <div
                key={doc.id}
                className="bg-white/90 dark:bg-[#161e27]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-emerald-500/30 shrink-0 bg-slate-800">
                        <img
                          src={doc.profile_image || doc.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.full_name)}&background=059669&color=fff&size=200`}
                          alt={doc.full_name}
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.full_name)}&background=059669&color=fff&size=200`
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base sm:text-lg font-display font-black text-gray-900 dark:text-white leading-tight">
                            {doc.full_name}
                          </h3>
                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" title="Verified Medical License" />
                        </div>
                        <p className="text-xs font-sans font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {doc.qualification}
                        </p>
                        <p className="text-[11px] font-sans text-gray-400 mt-0.5 font-medium">
                          {doc.experience_years}+ Years Clinical Practice
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-500 text-xs font-display font-black">
                      <Star size={13} fill="currentColor" />
                      <span>{doc.rating || 4.9}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-black/30 rounded-2xl border border-gray-100 dark:border-white/5 space-y-1.5 text-xs text-gray-600 dark:text-gray-300 mb-4 font-sans">
                    <div className="flex items-center gap-2">
                      <Building2 size={13} className="text-gray-400 shrink-0" />
                      <span className="font-bold truncate">{doc.clinic_name}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin size={13} className="text-rose-500 shrink-0 mt-0.5" />
                      <span className="leading-snug truncate">{doc.clinic_address}, {doc.city}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-gray-200/50 dark:border-white/5 text-[11px] text-gray-400">
                      <span className="font-mono">Council Reg: {doc.registration_number || doc.council_registration_number || 'NMC-BR-Verified'}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">🟢 Available</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-display font-bold text-gray-400 block uppercase tracking-wider">Consultation Fee</span>
                    <span className="text-lg sm:text-xl font-display font-black text-gray-900 dark:text-white">
                      ₹{doc.consultation_fee}
                    </span>
                  </div>

                  <Link
                    to={`/care/doctor/${doc.id}`}
                    style={{ backgroundColor: themeConfig?.primary || '#059669' }}
                    className="px-5 py-2.5 rounded-2xl text-white text-xs sm:text-sm font-display font-black shadow-md hover:brightness-110 transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <span>Book Token</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. LOCAL PHARMACY BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-teal-900/90 to-emerald-950/90 text-white rounded-3xl p-6 sm:p-10 border border-teal-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
          <div className="space-y-2 max-w-xl relative z-10">
            <span className="text-[10px] font-display font-black uppercase tracking-wider px-3 py-1 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/30">
              Form 20/21 Licensed Pharmacy Network
            </span>
            <h3 className="text-2xl sm:text-3xl font-display font-black tracking-tight">
              Medicines Delivered from Your Trusted Neighborhood Chemist
            </h3>
            <p className="text-xs sm:text-sm font-sans text-teal-100/80 leading-relaxed">
              Upload doctor prescription photo or select from your OzoCare consultations vault. Verified licensed pharmacists pack medicines and dispatch via Ozo Captain riders in 30-45 minutes.
            </p>
          </div>

          <Link
            to="/care/order-medicines"
            className="px-7 py-4 bg-white hover:bg-teal-50 text-teal-900 rounded-2xl text-sm font-display font-black shadow-lg shadow-black/20 transition-all flex items-center gap-2 active:scale-95 shrink-0 relative z-10"
          >
            <Pill size={18} className="text-emerald-600" />
            <span>Upload Rx & Order Now</span>
          </Link>
        </div>
      </section>

    </div>
  )
}
