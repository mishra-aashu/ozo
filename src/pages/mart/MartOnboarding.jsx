import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useMartStore } from '../../stores/martStore'
import { 
  User, 
  Phone, 
  Store, 
  MapPin, 
  FileText, 
  CheckCircle,
  Clock,
  ChevronRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react'

const MartOnboarding = ({ onComplete }) => {
  const { submitMartApplication, submittingApplication } = useMartStore()

  // Form step state
  const [step, setStep] = useState(1)

  // Details
  const [details, setDetails] = useState({
    ownerName: '',
    storeName: '',
    phone: '',
    address: '',
    licenseNumber: ''
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setDetails(prev => ({ ...prev, [name]: value }))
  }

  const nextStep = () => {
    if (step === 1) {
      if (!details.ownerName || !details.phone) {
        toast.error('Please fill in owner details')
        return
      }
    }
    setStep(s => s + 1)
  }

  const prevStep = () => {
    setStep(s => s - 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!details.storeName || !details.address) {
      toast.error('Please fill in store details')
      return
    }

    const result = await submitMartApplication(details)
    if (result.success && onComplete) {
      onComplete()
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-950/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 sm:p-8 md:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] transition-all duration-300 relative z-10">
      <div className="text-center mb-8">
        <div className="inline-flex bg-blue-600/15 border border-blue-500/20 p-4 rounded-2xl mb-4 shadow-sm text-blue-400">
          <Store className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tight">OZO Mart Partner</h2>
        <p className="text-sm text-slate-300 mt-2 font-medium">List your supermarket and start receiving orders</p>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center justify-between px-8 mb-10 relative">
        <div className="absolute left-12 right-12 top-1/2 h-[2px] bg-white/10 -translate-y-1/2 -z-10"></div>
        {[1, 2].map((num) => (
          <div 
            key={num}
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 ${
              step >= num 
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30' 
                : 'bg-slate-900/90 border-white/10 text-slate-400'
            }`}
          >
            {num}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && (
          /* STEP 1: Owner Info */
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">1. Owner Details</h3>
            </div>
            
            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="text"
                  name="ownerName"
                  placeholder="Owner's Full Name"
                  required
                  value={details.ownerName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all font-bold placeholder:text-slate-400 backdrop-blur-md"
                />
              </div>

              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Contact Mobile Number"
                  required
                  value={details.phone}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all font-bold placeholder:text-slate-400 backdrop-blur-md"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={nextStep}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl text-sm flex items-center justify-center gap-1 mt-6 transition-all hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]"
            >
              Continue Store Details <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          /* STEP 2: Store Info */
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">2. Store Information</h3>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="text"
                  name="storeName"
                  placeholder="Supermarket / Store Name"
                  required
                  value={details.storeName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all font-bold placeholder:text-slate-400 backdrop-blur-md"
                />
              </div>

              <div className="relative group">
                <MapPin className="absolute left-4 top-5 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                <textarea
                  name="address"
                  placeholder="Full Store Address"
                  required
                  rows="3"
                  value={details.address}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all font-bold placeholder:text-slate-400 resize-none backdrop-blur-md"
                />
              </div>

              <div className="relative group">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="text"
                  name="licenseNumber"
                  placeholder="GSTIN or Trade License No. (Optional)"
                  value={details.licenseNumber}
                  onChange={handleInputChange}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all font-bold placeholder:text-slate-400 uppercase backdrop-blur-md"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                type="button"
                onClick={prevStep}
                disabled={submittingApplication}
                className="w-1/3 border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-black py-4 rounded-2xl text-sm flex items-center justify-center gap-1 transition-all disabled:opacity-50 backdrop-blur-md"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="submit"
                disabled={submittingApplication}
                className="w-2/3 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl text-sm flex items-center justify-center gap-1 transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]"
              >
                {submittingApplication ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>Submit Application <CheckCircle className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

export default MartOnboarding
