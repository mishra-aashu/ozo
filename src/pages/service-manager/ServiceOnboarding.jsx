import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Building2, 
  Wrench, 
  CreditCard, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck, 
  Sparkles,
  Zap,
  Snowflake,
  Droplets,
  Hammer,
  Bug,
  MapPin
} from 'lucide-react'

export default function ServiceOnboarding({ onCompleteOnboarding, user }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)

  // Step 1: Business Profile
  const [businessName, setBusinessName] = useState('')
  const [ownerName, setOwnerName] = useState(user?.user_metadata?.full_name || '')
  const [phone, setPhone] = useState(user?.phone || user?.user_metadata?.phone || '')
  const [city, setCity] = useState('Patna')

  // Step 2: Categories
  const [selectedCategories, setSelectedCategories] = useState(['ac-appliance', 'plumbing'])

  // Step 3: Bank Details
  const [accNumber, setAccNumber] = useState('')
  const [ifsc, setIfsc] = useState('')
  const [beneficiary, setBeneficiary] = useState('')
  const [upiId, setUpiId] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)

  const categoryOptions = [
    { id: 'ac-appliance', label: 'AC & Appliance Repair', icon: Snowflake, desc: 'Foam jet cleaning, gas charging & compressor fix' },
    { id: 'plumbing', label: 'Plumbing & Water Systems', icon: Droplets, desc: 'Tap leakage, flush tank, geyser fitting & pipe work' },
    { id: 'electrician', label: 'Electrical & Wiring', icon: Zap, desc: 'Modular switchboards, MCBs, light points & fans' },
    { id: 'home-cleaning', label: 'Deep Cleaning & Sanitization', icon: Sparkles, desc: 'Full home rotary scrubbing, bathroom & kitchen shine' },
    { id: 'carpentry', label: 'Carpentry & Furniture Repair', icon: Hammer, desc: 'Door locks, hydraulic hinges, bed storage & cabinets' },
    { id: 'pest-control', label: 'Pest Elimination & Warranty', icon: Bug, desc: 'Odorless gel treatment for cockroaches, termites & bugs' }
  ]

  const toggleCategory = (catId) => {
    if (selectedCategories.includes(catId)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter(c => c !== catId))
      }
    } else {
      setSelectedCategories([...selectedCategories, catId])
    }
  }

  const handleFinalSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onCompleteOnboarding({
        business_name: businessName || `${ownerName || 'Ozo'} Services`,
        owner_name: ownerName,
        phone,
        city,
        serviceable_cities: [city],
        serviceable_pincodes: ['800001', '800020'],
        operating_categories: selectedCategories,
        bank_details: {
          account_number: accNumber,
          ifsc_code: ifsc,
          beneficiary_name: beneficiary || ownerName,
          upi_id: upiId
        }
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center relative text-left">
      <div className="w-full max-w-xl bg-white/95 dark:bg-[#181818]/95 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        
        {/* Progress Tracker & Back Navigation */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
              className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all border border-gray-200/80 dark:border-white/10 flex-shrink-0"
              title={step > 1 ? 'Previous Step' : 'Back to App'}
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-500 bg-sky-500/10 px-2.5 py-1 rounded-full">
                Partner Registration
              </span>
              <h1 className="text-xl font-black text-gray-900 dark:text-white mt-1">
                Join Ozo Service Force
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-black text-gray-400">
            <span className={step >= 1 ? 'text-sky-500 font-black' : ''}>1</span>
            <span>•</span>
            <span className={step >= 2 ? 'text-sky-500 font-black' : ''}>2</span>
            <span>•</span>
            <span className={step >= 3 ? 'text-sky-500 font-black' : ''}>3</span>
          </div>
        </div>

        {/* STEP 1: Agency Information */}
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="text-[11px] font-black uppercase text-gray-500 dark:text-gray-400">
                Agency / Business Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Home Care Solutions"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full mt-1.5 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-gray-500 dark:text-gray-400">
                Partner / Lead Technician Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rajesh Sharma"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full mt-1.5 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black uppercase text-gray-500 dark:text-gray-400">
                  Primary Mobile *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full mt-1.5 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <MapPin size={12} className="text-sky-500" />
                  <span>Operating Hub City *</span>
                </label>
                <div className="relative mt-1.5">
                  <input
                    type="text"
                    required
                    list="hub-cities-list"
                    placeholder="Type city name (e.g. Patna)"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <datalist id="hub-cities-list">
                    <option value="Patna" />
                    <option value="Muzaffarpur" />
                    <option value="Gaya" />
                    <option value="Darbhanga" />
                    <option value="Bhagalpur" />
                    <option value="Purnia" />
                    <option value="Aurangabad" />
                    <option value="Ranchi" />
                    <option value="Varanasi" />
                    <option value="Kolkata" />
                    <option value="Delhi NCR" />
                  </datalist>
                </div>
              </div>
            </div>

            {/* Quick-Pick Popular City Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-gray-400">Popular:</span>
              {['Patna', 'Muzaffarpur', 'Gaya', 'Darbhanga', 'Bhagalpur', 'Aurangabad'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCity(c)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border transition-all ${
                    city.toLowerCase() === c.toLowerCase()
                      ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-sky-500/40'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="py-3.5 px-5 rounded-2xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all flex items-center gap-1.5 flex-shrink-0"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={!businessName.trim() || !phone.trim() || !city.trim()}
                onClick={() => setStep(2)}
                className="flex-1 py-3.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black tracking-wide shadow-lg shadow-sky-600/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Next: Select Trade Services</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Trade Categories Selection */}
        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select all doorstep trades your agency or technicians provide:
            </p>

            <div className="grid grid-cols-1 gap-2.5 max-h-[340px] overflow-y-auto">
              {categoryOptions.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id)
                const IconComponent = cat.icon

                return (
                  <div
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/30'
                        : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-sky-500 text-white'
                          : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                      }`}>
                        <IconComponent size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-gray-900 dark:text-white">
                          {cat.label}
                        </h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">{cat.desc}</p>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCategory(cat.id)}
                      className="rounded text-sky-600 focus:ring-sky-500"
                    />
                  </div>
                )
              })}
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-5 rounded-2xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500"
              >
                Back
              </button>
              <button
                type="button"
                disabled={selectedCategories.length === 0}
                onClick={() => setStep(3)}
                className="flex-1 py-3.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black tracking-wide shadow-lg shadow-sky-600/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Next: Settlement Account</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Settlement Bank & Complete */}
        {step === 3 && (
          <form onSubmit={handleFinalSubmit} className="space-y-4 animate-fadeIn">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Enter your bank account details or UPI ID for direct payout settlements:
            </p>

            <div>
              <label className="text-[11px] font-black uppercase text-gray-400">Account Holder Name</label>
              <input
                type="text"
                placeholder="As per bank passbook"
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                className="w-full mt-1.5 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-bold text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black uppercase text-gray-400">Account Number</label>
                <input
                  type="text"
                  placeholder="e.g. 01234567890123"
                  value={accNumber}
                  onChange={(e) => setAccNumber(e.target.value)}
                  className="w-full mt-1.5 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-bold font-mono text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-gray-400">IFSC Code</label>
                <input
                  type="text"
                  placeholder="e.g. SBIN0001234"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  className="w-full mt-1.5 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-bold font-mono uppercase text-gray-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-gray-400">Instant UPI ID (Optional)</label>
              <input
                type="text"
                placeholder="e.g. myagency@okaxis"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full mt-1.5 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-bold font-mono text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-3 px-5 rounded-2xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black tracking-wide shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                <span>{isSubmitting ? 'Activating Profile...' : 'Complete & Launch Portal'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}
