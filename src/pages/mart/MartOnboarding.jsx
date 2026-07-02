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
    <div className="w-full max-w-lg mx-auto bg-white dark:bg-black border border-gray-100 dark:border-white/5 rounded-[2.5rem] p-8 md:p-10 shadow-2xl transition-all duration-300">
      <div className="text-center mb-8">
        <div className="inline-flex bg-green-50 dark:bg-ozo-green/10 p-4 rounded-2xl mb-4 shadow-sm text-ozo-green">
          <Store className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">OZO Mart Partner</h2>
        <p className="text-sm text-ozo-gray dark:text-gray-400 mt-2 font-medium">List your supermarket and start receiving orders</p>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center justify-between px-8 mb-10 relative">
        <div className="absolute left-12 right-12 top-1/2 h-[2px] bg-gray-100 dark:bg-white/5 -translate-y-1/2 -z-10"></div>
        {[1, 2].map((num) => (
          <div 
            key={num}
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 ${
              step >= num 
                ? 'bg-ozo-green border-ozo-green text-black shadow-lg shadow-ozo-green/20' 
                : 'bg-white dark:bg-[#121212] border-gray-200 dark:border-white/10 text-gray-400'
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
              <Sparkles className="w-4 h-4 text-ozo-green" />
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">1. Owner Details</h3>
            </div>
            
            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-ozo-green transition-colors" />
                <input
                  type="text"
                  name="ownerName"
                  placeholder="Owner's Full Name"
                  required
                  value={details.ownerName}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-ozo-green dark:focus:border-ozo-green focus:ring-4 focus:ring-ozo-green/10 transition-all font-bold placeholder:text-gray-400"
                />
              </div>

              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-ozo-green transition-colors" />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Contact Mobile Number"
                  required
                  value={details.phone}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-ozo-green dark:focus:border-ozo-green focus:ring-4 focus:ring-ozo-green/10 transition-all font-bold placeholder:text-gray-400"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={nextStep}
              className="w-full bg-ozo-green hover:bg-[#00b95c] text-black font-black py-4 rounded-2xl text-sm flex items-center justify-center gap-1 mt-6 transition-all hover:shadow-lg hover:shadow-ozo-green/10 active:scale-[0.98]"
            >
              Continue Store Details <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          /* STEP 2: Store Info */
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-ozo-green" />
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">2. Store Information</h3>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-ozo-green transition-colors" />
                <input
                  type="text"
                  name="storeName"
                  placeholder="Supermarket / Store Name"
                  required
                  value={details.storeName}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-ozo-green dark:focus:border-ozo-green focus:ring-4 focus:ring-ozo-green/10 transition-all font-bold placeholder:text-gray-400"
                />
              </div>

              <div className="relative group">
                <MapPin className="absolute left-4 top-5 w-4 h-4 text-gray-400 group-focus-within:text-ozo-green transition-colors" />
                <textarea
                  name="address"
                  placeholder="Full Store Address"
                  required
                  rows="3"
                  value={details.address}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-ozo-green dark:focus:border-ozo-green focus:ring-4 focus:ring-ozo-green/10 transition-all font-bold placeholder:text-gray-400 resize-none"
                />
              </div>

              <div className="relative group">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-ozo-green transition-colors" />
                <input
                  type="text"
                  name="licenseNumber"
                  placeholder="GSTIN or Trade License No. (Optional)"
                  value={details.licenseNumber}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-ozo-green dark:focus:border-ozo-green focus:ring-4 focus:ring-ozo-green/10 transition-all font-bold placeholder:text-gray-400 uppercase"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                type="button"
                onClick={prevStep}
                disabled={submittingApplication}
                className="w-1/3 border border-gray-200 dark:border-white/10 text-gray-500 hover:text-gray-700 dark:hover:text-white dark:text-gray-400 font-black py-4 rounded-2xl text-sm flex items-center justify-center gap-1 transition-all disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="submit"
                disabled={submittingApplication}
                className="w-2/3 bg-ozo-green hover:bg-[#00b95c] text-black font-black py-4 rounded-2xl text-sm flex items-center justify-center gap-1 transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-ozo-green/10 active:scale-[0.98]"
              >
                {submittingApplication ? (
                  <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
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
