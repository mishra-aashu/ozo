import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useCaptainStore } from '../../stores/captainStore'
import ImageUpload from '../../components/ImageUpload'
import { 
  User, 
  Phone, 
  Smartphone, 
  AlertCircle, 
  CreditCard, 
  FileText, 
  Bike, 
  Camera, 
  Upload, 
  CheckCircle,
  FileCheck,
  ChevronRight,
  ArrowLeft
} from 'lucide-react'

const CaptainOnboarding = ({ onComplete }) => {
  const submitOnboarding = useCaptainStore(state => state.submitOnboarding)
  const onboardingInProgress = useCaptainStore(state => state.onboardingInProgress)

  // Form step state
  const [step, setStep] = useState(1)

  // Details
  const [details, setDetails] = useState({
    fullName: '',
    phone: '',
    whatsapp: '',
    emergencyContact: '',
    aadharNumber: '',
    drivingLicenseNumber: '',
    bikeNumber: ''
  })

  // File uploads
  const [files, setFiles] = useState({
    aadharCard: '',
    drivingLicense: '',
    selfie: ''
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setDetails(prev => ({ ...prev, [name]: value }))
  }

  const nextStep = () => {
    if (step === 1) {
      if (!details.fullName || !details.phone || !details.emergencyContact) {
        toast.error('Please fill in all personal details')
        return
      }
    } else if (step === 2) {
      if (!details.aadharNumber || !details.drivingLicenseNumber || !details.bikeNumber) {
        toast.error('Please fill in document numbers')
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
    if (!files.aadharCard || !files.drivingLicense || !files.selfie) {
      toast.error('Please upload all required photos/documents')
      return
    }

    const result = await submitOnboarding(details, files)
    if (result.success && onComplete) {
      onComplete()
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-white dark:bg-[#0c0c14] border border-gray-200/80 dark:border-[#1b1b2d] rounded-[1.75rem] p-8 shadow-2xl transition-all duration-300">
      <div className="text-center mb-6">
        <div className="inline-flex bg-gradient-to-tr from-[#00FF66] to-[#00CC52] p-3 rounded-2xl mb-3 shadow-md shadow-[#00FF66]/10">
          <Bike className="w-6 h-6 text-black" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Captain Verification</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Submit your details to start delivering with OZO</p>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center justify-between px-8 mb-10 relative">
        <div className="absolute left-12 right-12 top-1/2 h-[2px] bg-gray-150 dark:bg-[#1d1d33] -translate-y-1/2 -z-10"></div>
        {[1, 2, 3].map((num) => (
          <div 
            key={num}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all duration-300 ${
              step >= num 
                ? 'bg-white dark:bg-black border-emerald-500 dark:border-[#00FF66] text-emerald-650 dark:text-[#00FF66] shadow-emerald-500/5 dark:shadow-[#00FF66]/10 shadow-md' 
                : 'bg-white dark:bg-[#0c0c14] border-gray-200 dark:border-[#1d1d33] text-gray-400 dark:text-gray-500'
            }`}
          >
            {num}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && (
          /* STEP 1: Personal Details */
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">1. Personal Information</h3>
            
            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  name="fullName"
                  placeholder="Full Name (as in Aadhar)"
                  required
                  value={details.fullName}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-[#121220] border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66] transition-colors"
                />
              </div>

              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  required
                  value={details.phone}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-[#121220] border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66] transition-colors"
                />
              </div>

              <div className="relative group">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="tel"
                  name="whatsapp"
                  placeholder="WhatsApp Number (Optional)"
                  value={details.whatsapp}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-[#121220] border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66] transition-colors"
                />
              </div>

              <div className="relative group">
                <AlertCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="tel"
                  name="emergencyContact"
                  placeholder="Emergency Contact Number"
                  required
                  value={details.emergencyContact}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-[#121220] border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66] transition-colors"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={nextStep}
              className="w-full bg-gradient-to-r from-[#00FF66] to-[#00CC52] text-black font-bold py-3.5 rounded-xl text-sm hover:shadow-lg hover:shadow-[#00FF66]/10 flex items-center justify-center gap-1 mt-4 transition-all"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          /* STEP 2: Document numbers */
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">2. Verification Details</h3>

            <div className="space-y-4">
              <div className="relative group">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  name="aadharNumber"
                  placeholder="12-Digit Aadhar Card Number"
                  required
                  maxLength="12"
                  value={details.aadharNumber}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-[#121220] border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66] font-mono transition-colors"
                />
              </div>

              <div className="relative group">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  name="drivingLicenseNumber"
                  placeholder="Driving License Number"
                  required
                  value={details.drivingLicenseNumber}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-[#121220] border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66] uppercase transition-colors"
                />
              </div>

              <div className="relative group">
                <Bike className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  name="bikeNumber"
                  placeholder="Two-Wheeler Plate Number (e.g. DL3CBA1234)"
                  required
                  value={details.bikeNumber}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 dark:bg-[#121220] border border-gray-200 dark:border-[#1e1e35] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#00FF66] uppercase font-mono transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={prevStep}
                className="w-1/3 border border-gray-200 dark:border-[#1e1e35] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-1 transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="w-2/3 bg-gradient-to-r from-[#00FF66] to-[#00CC52] text-black font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-1 transition-all"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          /* STEP 3: Photo Uploads */
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">3. Upload Documents</h3>
            
            <div className="space-y-4">
              {/* Aadhar Card upload */}
              <div className="space-y-2">
                <ImageUpload
                  value={files.aadharCard}
                  onChange={(url) => setFiles(prev => ({ ...prev, aadharCard: url }))}
                  customNamePrefix="captain_aadhar"
                  label="Aadhar Card Front Image"
                  disabled={onboardingInProgress}
                  maxSize={5 * 1024 * 1024}
                />
              </div>

              {/* Driving License upload */}
              <div className="space-y-2">
                <ImageUpload
                  value={files.drivingLicense}
                  onChange={(url) => setFiles(prev => ({ ...prev, drivingLicense: url }))}
                  customNamePrefix="captain_license"
                  label="Driving License Front Image"
                  disabled={onboardingInProgress}
                  maxSize={5 * 1024 * 1024}
                />
              </div>

              {/* Selfie upload */}
              <div className="space-y-2">
                <ImageUpload
                  value={files.selfie}
                  onChange={(url) => setFiles(prev => ({ ...prev, selfie: url }))}
                  customNamePrefix="captain_selfie"
                  label="Selfie with Bike & Plate Visible"
                  disabled={onboardingInProgress}
                  maxSize={5 * 1024 * 1024}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={prevStep}
                disabled={onboardingInProgress}
                className="w-1/3 border border-gray-200 dark:border-[#1e1e35] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-1 transition-all disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="submit"
                disabled={onboardingInProgress}
                className="w-2/3 bg-gradient-to-r from-[#00FF66] to-[#00CC52] text-black font-black py-3.5 rounded-xl text-sm flex items-center justify-center gap-1 transition-all disabled:opacity-50"
              >
                {onboardingInProgress ? (
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>Submit Onboarding <CheckCircle className="w-4 h-4 stroke-[3]" /></>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

export default CaptainOnboarding
