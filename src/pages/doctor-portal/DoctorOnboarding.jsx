import React, { useState } from 'react'
import { 
  User, 
  Stethoscope, 
  Award, 
  ShieldCheck, 
  Clock, 
  Building2, 
  MapPin, 
  Phone, 
  IndianRupee, 
  Video, 
  Camera, 
  ArrowLeft, 
  ChevronRight, 
  Check, 
  RefreshCw,
  Search,
  ChevronDown
} from 'lucide-react'
import { CARE_SPECIALTIES } from '../../utils/careIcons'
import DoctorSpecialtyModal from './DoctorSpecialtyModal'
import toast from 'react-hot-toast'

export default function DoctorOnboarding({
  user,
  onboardForm,
  setOnboardForm,
  handleCompleteOnboarding,
  isOnboarding,
  formatDoctorName
}) {
  const [step, setStep] = useState(1)
  const [isSpecialtyModalOpen, setIsSpecialtyModalOpen] = useState(false)

  const selectedSpecialty = CARE_SPECIALTIES.find(s => s.slug === onboardForm.specialty_slug) || CARE_SPECIALTIES[0]
  const SelectedIcon = selectedSpecialty.icon || Stethoscope

  const quickCities = ['Bhagalpur', 'Aurangabad', 'Patna', 'Gaya', 'Darbhanga']
  const qualificationChips = ['MBBS', 'MD', 'MS', 'DNB', 'DM', 'BAMS', 'BHMS']
  const avatarPresets = [
    { id: 'male1', url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=256&h=256&fit=crop&crop=faces', label: 'Doctor 1' },
    { id: 'female1', url: 'https://images.unsplash.com/photo-1594824813586-2a6234eb1a47?w=256&h=256&fit=crop&crop=faces', label: 'Doctor 2' },
    { id: 'male2', url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=256&h=256&fit=crop&crop=faces', label: 'Specialist 1' },
    { id: 'female2', url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=256&h=256&fit=crop&crop=faces', label: 'Specialist 2' },
  ]

  const nextStep = () => {
    if (step === 1) {
      if (!onboardForm.full_name?.trim()) {
        toast.error('Please enter your full name')
        return
      }
      if (!onboardForm.qualification?.trim()) {
        toast.error('Please specify medical qualification (e.g. MBBS, MD)')
        return
      }
      if (!onboardForm.council_registration_number?.trim()) {
        toast.error('Please enter your State Medical Council / NMC Registration Number')
        return
      }
    } else if (step === 2) {
      if (!onboardForm.clinic_name?.trim()) {
        toast.error('Please enter your clinic, hospital, or chamber name')
        return
      }
      if (!onboardForm.city?.trim()) {
        toast.error('Please specify your operating city')
        return
      }
    }
    setStep(s => s + 1)
  }

  const prevStep = () => {
    setStep(s => s - 1)
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-white/95 dark:bg-[#0c0c14]/90 backdrop-blur-2xl border border-gray-200/80 dark:border-[#1b1b2d] rounded-[2rem] p-6 sm:p-8 md:p-10 shadow-2xl transition-all duration-300 relative z-10">
      
      {/* Header Badge */}
      <div className="text-center mb-6">
        <div className="inline-flex bg-gradient-to-tr from-emerald-500 to-teal-500 p-3.5 rounded-2xl mb-3 shadow-md shadow-emerald-500/20">
          <Stethoscope className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-black text-gray-900 dark:text-white font-display tracking-tight">
          Doctor Verification
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
          Submit your clinical credentials to activate your practice with OZO
        </p>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center justify-between px-8 mb-8 relative">
        <div className="absolute left-12 right-12 top-1/2 h-[2px] bg-gray-200 dark:bg-[#1d1d33] -translate-y-1/2 -z-10"></div>
        {[1, 2, 3].map((num) => (
          <div 
            key={num}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all duration-300 ${
              step >= num 
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/25' 
                : 'bg-white dark:bg-[#0c0c14] border-gray-200 dark:border-[#1d1d33] text-gray-400 dark:text-gray-500'
            }`}
          >
            {num}
          </div>
        ))}
      </div>

      <form onSubmit={handleCompleteOnboarding} className="space-y-6">
        
        {/* STEP 1: Personal & Council Credentials */}
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              1. Medical Credentials
            </h3>

            {/* Doctor Full Name */}
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Full Name (as in Medical Council)"
                required
                value={onboardForm.full_name}
                onChange={(e) => setOnboardForm({ ...onboardForm, full_name: e.target.value })}
                onBlur={() => {
                  if (onboardForm.full_name && formatDoctorName) {
                    setOnboardForm(prev => ({ ...prev, full_name: formatDoctorName(prev.full_name) }))
                  }
                }}
                className="w-full bg-gray-50/90 dark:bg-[#121220]/90 border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-colors font-medium"
              />
            </div>

            {/* Medical Specialty - Searchable Modal Trigger */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1 flex items-center justify-between">
                <span>Medical Specialty *</span>
                <button
                  type="button"
                  onClick={() => setIsSpecialtyModalOpen(true)}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Search className="w-3 h-3" />
                  <span>Search All (18)</span>
                </button>
              </label>

              <button
                type="button"
                onClick={() => setIsSpecialtyModalOpen(true)}
                className="w-full bg-gray-50/90 dark:bg-[#121220]/90 hover:bg-gray-100/90 dark:hover:bg-[#18182c] border border-gray-200 dark:border-[#1e1e35] hover:border-emerald-500/50 dark:hover:border-emerald-400/50 rounded-2xl p-3 pl-3.5 pr-4 text-left transition-all flex items-center gap-3.5 cursor-pointer group shadow-sm active:scale-[0.99]"
              >
                {/* Specialty Icon Badge */}
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${selectedSpecialty.gradient || 'from-emerald-500 to-teal-600'} flex items-center justify-center text-white shrink-0 shadow-sm shadow-emerald-500/20`}>
                  <SelectedIcon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-white truncate font-display">
                      {selectedSpecialty.title}
                    </span>
                    {selectedSpecialty.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                        {selectedSpecialty.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium">
                    {selectedSpecialty.subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-all shrink-0">
                  <Search className="w-3.5 h-3.5" />
                  <span>Change</span>
                </div>
              </button>
            </div>

            {/* Qualifications */}
            <div className="space-y-2">
              <div className="relative group">
                <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Medical Degree (e.g. MBBS, MD)"
                  required
                  value={onboardForm.qualification}
                  onChange={(e) => setOnboardForm({ ...onboardForm, qualification: e.target.value })}
                  className="w-full bg-gray-50/90 dark:bg-[#121220]/90 border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-colors font-medium"
                />
              </div>

              {/* Quick Qualification Chips */}
              <div className="flex flex-wrap items-center gap-1.5 px-1">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mr-1">Quick add:</span>
                {qualificationChips.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      const current = onboardForm.qualification || ''
                      if (!current.includes(q)) {
                        setOnboardForm({
                          ...onboardForm,
                          qualification: current ? `${current}, ${q}` : q
                        })
                      }
                    }}
                    className="px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-[#1a1a2e] hover:bg-gray-200 dark:hover:bg-[#252540] border border-gray-200 dark:border-[#2a2a44] text-[10px] font-bold text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    + {q}
                  </button>
                ))}
              </div>
            </div>

            {/* NMC / State Medical Council Reg No */}
            <div className="relative group">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="State Council / NMC Reg. No (e.g. BR-49201)"
                required
                value={onboardForm.council_registration_number}
                onChange={(e) => setOnboardForm({ ...onboardForm, council_registration_number: e.target.value })}
                className="w-full bg-gray-50/90 dark:bg-[#121220]/90 border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-colors font-mono font-medium"
              />
            </div>

            {/* Experience Years */}
            <div className="relative group">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
              <input
                type="number"
                min="1"
                max="60"
                placeholder="Experience in Years"
                value={onboardForm.experience_years}
                onChange={(e) => setOnboardForm({ ...onboardForm, experience_years: e.target.value })}
                className="w-full bg-gray-50/90 dark:bg-[#121220]/90 border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-colors font-medium"
              />
            </div>

            {/* Step 1 Next Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={nextStep}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-sm shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/35 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Clinic & Location */}
        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              2. Clinic & Chamber Details
            </h3>

            {/* Clinic Name */}
            <div className="relative group">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Clinic / Hospital / Chamber Name *"
                required
                value={onboardForm.clinic_name}
                onChange={(e) => setOnboardForm({ ...onboardForm, clinic_name: e.target.value })}
                className="w-full bg-gray-50/90 dark:bg-[#121220]/90 border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-colors font-medium"
              />
            </div>

            {/* Operating City */}
            <div className="space-y-2">
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Operating City *"
                  required
                  value={onboardForm.city}
                  onChange={(e) => setOnboardForm({ ...onboardForm, city: e.target.value })}
                  className="w-full bg-gray-50/90 dark:bg-[#121220]/90 border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-colors font-medium"
                />
              </div>

              {/* Quick City Pills */}
              <div className="flex flex-wrap items-center gap-1.5 px-1">
                {quickCities.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setOnboardForm({ ...onboardForm, city: c })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      onboardForm.city?.toLowerCase() === c.toLowerCase()
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                        : 'bg-gray-100 dark:bg-[#1a1a2e] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#2a2a44] hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Chamber Address */}
            <div className="relative group">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Full Chamber Address & Landmark"
                value={onboardForm.clinic_address}
                onChange={(e) => setOnboardForm({ ...onboardForm, clinic_address: e.target.value })}
                className="w-full bg-gray-50/90 dark:bg-[#121220]/90 border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-colors font-medium"
              />
            </div>

            {/* Contact Phone */}
            <div className="relative group">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
              <input
                type="tel"
                placeholder="Contact Phone Number"
                value={onboardForm.phone}
                onChange={(e) => setOnboardForm({ ...onboardForm, phone: e.target.value })}
                className="w-full bg-gray-50/90 dark:bg-[#121220]/90 border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-colors font-medium"
              />
            </div>

            {/* Step 2 Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={prevStep}
                className="w-1/3 py-4 rounded-2xl bg-gray-100 dark:bg-[#1a1a2e] hover:bg-gray-200 dark:hover:bg-[#252540] text-gray-700 dark:text-gray-300 font-bold text-sm border border-gray-200 dark:border-[#2a2a44] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={nextStep}
                className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-sm shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/35 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Consultation Rates & Practice Activation */}
        {step === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              3. Rates & Practice Activation
            </h3>

            {/* In-Clinic OPD Fee */}
            <div className="space-y-2">
              <div className="relative group">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
                <input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="In-Clinic OPD Fee (₹)"
                  required
                  value={onboardForm.consultation_fee}
                  onChange={(e) => setOnboardForm({ ...onboardForm, consultation_fee: e.target.value })}
                  className="w-full bg-gray-50/90 dark:bg-[#121220]/90 border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-colors font-mono font-bold"
                />
              </div>

              {/* Preset Fee Pills */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mr-1">Presets:</span>
                {[300, 500, 700, 1000].map(fee => (
                  <button
                    key={fee}
                    type="button"
                    onClick={() => setOnboardForm({ ...onboardForm, consultation_fee: fee })}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border transition-all ${
                      Number(onboardForm.consultation_fee) === fee
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                        : 'bg-gray-100 dark:bg-[#1a1a2e] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#2a2a44]'
                    }`}
                  >
                    ₹{fee}
                  </button>
                ))}
              </div>
            </div>

            {/* Video Teleconsult Fee */}
            <div className="space-y-2">
              <div className="relative group">
                <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
                <input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="Video Teleconsult Fee (₹)"
                  required
                  value={onboardForm.teleconsult_fee}
                  onChange={(e) => setOnboardForm({ ...onboardForm, teleconsult_fee: e.target.value })}
                  className="w-full bg-gray-50/90 dark:bg-[#121220]/90 border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-colors font-mono font-bold"
                />
              </div>

              {/* Preset Video Fee Pills */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mr-1">Presets:</span>
                {[300, 450, 600, 800].map(fee => (
                  <button
                    key={fee}
                    type="button"
                    onClick={() => setOnboardForm({ ...onboardForm, teleconsult_fee: fee })}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border transition-all ${
                      Number(onboardForm.teleconsult_fee) === fee
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                        : 'bg-gray-100 dark:bg-[#1a1a2e] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#2a2a44]'
                    }`}
                  >
                    ₹{fee}
                  </button>
                ))}
              </div>
            </div>

            {/* Profile Avatar Selection */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block px-1">
                Choose Doctor Badge / Avatar (Optional)
              </label>

              <div className="flex items-center gap-3 px-1">
                {avatarPresets.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setOnboardForm({ ...onboardForm, avatar_url: preset.url })}
                    className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all p-0.5 ${
                      onboardForm.avatar_url === preset.url
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-105'
                        : 'border-gray-200 dark:border-[#252540] opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img src={preset.url} alt={preset.label} className="w-full h-full object-cover rounded-lg" />
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setOnboardForm({ ...onboardForm, avatar_url: '' })}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                    !onboardForm.avatar_url
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                      : 'border-gray-200 dark:border-[#252540] text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Default
                </button>
              </div>

              <div className="relative group mt-2">
                <Camera className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
                <input
                  type="url"
                  placeholder="Or paste custom photo URL (optional)"
                  value={onboardForm.avatar_url}
                  onChange={(e) => setOnboardForm({ ...onboardForm, avatar_url: e.target.value })}
                  className="w-full bg-gray-50/90 dark:bg-[#121220]/90 border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3 pl-11 pr-4 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Step 3 Action Buttons */}
            <div className="pt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={prevStep}
                className="w-1/3 py-4 rounded-2xl bg-gray-100 dark:bg-[#1a1a2e] hover:bg-gray-200 dark:hover:bg-[#252540] text-gray-700 dark:text-gray-300 font-bold text-sm border border-gray-200 dark:border-[#2a2a44] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={isOnboarding}
                className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-sm shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/35 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isOnboarding ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Activating...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Activate Doctor Workstation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </form>

      {/* Searchable Medical Specialty Modal */}
      <DoctorSpecialtyModal
        isOpen={isSpecialtyModalOpen}
        onClose={() => setIsSpecialtyModalOpen(false)}
        selectedSlug={onboardForm.specialty_slug}
        onSelect={(slug) => setOnboardForm(prev => ({ ...prev, specialty_slug: slug }))}
      />
    </div>
  )
}
