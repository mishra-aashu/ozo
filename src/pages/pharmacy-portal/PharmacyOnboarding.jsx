import React, { useState } from 'react'
import { 
  Building2, 
  User, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Clock, 
  FileText, 
  ArrowLeft, 
  ChevronRight, 
  RefreshCw 
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function PharmacyOnboarding({
  user,
  onboardForm,
  setOnboardForm,
  handleCompleteOnboarding,
  isOnboarding
}) {
  const [step, setStep] = useState(1)

  const quickCities = ['Bhagalpur', 'Aurangabad', 'Patna', 'Gaya', 'Darbhanga']
  const hourPresets = ['08:00 AM - 10:00 PM', '24x7 Open', '09:00 AM - 09:00 PM', '07:00 AM - 11:00 PM']

  const nextStep = () => {
    if (step === 1) {
      if (!onboardForm.store_name?.trim()) {
        toast.error('Please enter pharmacy or medical hall name')
        return
      }
      if (!onboardForm.drug_license_number?.trim()) {
        toast.error('Please enter your Drug License Number (Form 20/21)')
        return
      }
    } else if (step === 2) {
      if (!onboardForm.city?.trim()) {
        toast.error('Please select or enter your city')
        return
      }
      if (!onboardForm.address?.trim()) {
        toast.error('Please enter store address')
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
        <div className="inline-flex bg-gradient-to-tr from-teal-500 to-cyan-500 p-3.5 rounded-2xl mb-3 shadow-md shadow-teal-500/20">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-black text-gray-900 dark:text-white font-display tracking-tight">
          Chemist Verification
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
          Submit your drug license & store details to partner with OZO
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
                ? 'bg-teal-500 border-teal-500 text-white shadow-lg shadow-teal-500/25' 
                : 'bg-white dark:bg-[#0c0c14] border-gray-200 dark:border-[#1d1d33] text-gray-400 dark:text-gray-500'
            }`}
          >
            {num}
          </div>
        ))}
      </div>

      <form onSubmit={handleCompleteOnboarding} className="space-y-6">
        
        {/* STEP 1: Licensing Information */}
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              1. Licensing Information
            </h3>

            {/* Store Name */}
            <div className="relative group">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Pharmacy / Medical Store Name *"
                required
                value={onboardForm.store_name}
                onChange={(e) => setOnboardForm({ ...onboardForm, store_name: e.target.value })}
                className="w-full bg-gray-50/90 dark:bg-[#121220]/90 border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 transition-colors font-medium"
              />
            </div>

            {/* Registered Pharmacist Name */}
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Registered Pharmacist Name (e.g. D.Pharm / B.Pharm)"
                value={onboardForm.registered_pharmacist_name}
                onChange={(e) => setOnboardForm({ ...onboardForm, registered_pharmacist_name: e.target.value })}
                className="w-full bg-gray-50/90 dark:bg-[#121220]/90 border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 transition-colors font-medium"
              />
            </div>

            {/* Drug License Number */}
            <div className="relative group">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Drug License Number (Form 20/21) *"
                required
                value={onboardForm.drug_license_number}
                onChange={(e) => setOnboardForm({ ...onboardForm, drug_license_number: e.target.value })}
                className="w-full bg-gray-50/90 dark:bg-[#121220]/90 border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 transition-colors font-mono font-medium"
              />
            </div>

            {/* Step 1 Next Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={nextStep}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-black text-sm shadow-xl shadow-teal-500/25 hover:shadow-teal-500/35 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Store Location & Contact */}
        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              2. Store Location & Contact
            </h3>

            {/* City */}
            <div className="space-y-2">
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Operating City *"
                  required
                  value={onboardForm.city}
                  onChange={(e) => setOnboardForm({ ...onboardForm, city: e.target.value })}
                  className="w-full bg-gray-50/90 dark:bg-[#121220]/90 border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 transition-colors font-medium"
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
                        ? 'bg-teal-500 text-white border-teal-500 shadow-sm'
                        : 'bg-gray-100 dark:bg-[#1a1a2e] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#2a2a44] hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Store Address */}
            <div className="relative group">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Shop No., Market Area, Landmark *"
                required
                value={onboardForm.address}
                onChange={(e) => setOnboardForm({ ...onboardForm, address: e.target.value })}
                className="w-full bg-gray-50/90 dark:bg-[#121220]/90 border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 transition-colors font-medium"
              />
            </div>

            {/* Store Contact Phone */}
            <div className="relative group">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
              <input
                type="tel"
                placeholder="Store Contact Phone Number"
                value={onboardForm.phone}
                onChange={(e) => setOnboardForm({ ...onboardForm, phone: e.target.value })}
                className="w-full bg-gray-50/90 dark:bg-[#121220]/90 border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 transition-colors font-medium"
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
                className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-black text-sm shadow-xl shadow-teal-500/25 hover:shadow-teal-500/35 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Operating Schedule & Activation */}
        {step === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              3. Operating Schedule & Activation
            </h3>

            {/* Operating Hours */}
            <div className="space-y-2">
              <div className="relative group">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Operating Hours (e.g. 08:00 AM - 10:00 PM)"
                  value={onboardForm.operating_hours}
                  onChange={(e) => setOnboardForm({ ...onboardForm, operating_hours: e.target.value })}
                  className="w-full bg-gray-50/90 dark:bg-[#121220]/90 border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-teal-500 dark:focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 transition-colors font-medium"
                />
              </div>

              {/* Preset Schedule Pills */}
              <div className="flex flex-wrap items-center gap-1.5 px-1">
                {hourPresets.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setOnboardForm({ ...onboardForm, operating_hours: h })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      onboardForm.operating_hours === h
                        ? 'bg-teal-500 text-white border-teal-500 shadow-sm'
                        : 'bg-gray-100 dark:bg-[#1a1a2e] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#2a2a44]'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Information Notice */}
            <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-800 dark:text-teal-300 text-xs leading-relaxed">
              <strong className="font-bold block text-teal-900 dark:text-teal-200 mb-0.5">
                OZO Fast Medicine Dispatch
              </strong>
              Your store will receive local customer prescription orders verified by registered doctors with doorstep rider pickup.
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
                className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 hover:from-teal-400 hover:to-cyan-400 text-white font-black text-sm shadow-xl shadow-teal-500/25 hover:shadow-teal-500/35 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isOnboarding ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Activating Store...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Activate Pharmacy Workstation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </form>
    </div>
  )
}
