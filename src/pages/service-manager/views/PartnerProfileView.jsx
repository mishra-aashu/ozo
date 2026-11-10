import React, { useState } from 'react'
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  CreditCard, 
  Save, 
  Star,
  CheckCircle2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase'

export default function PartnerProfileView({ provider, onRefresh }) {
  const [businessName, setBusinessName] = useState(provider?.business_name || '')
  const [ownerName, setOwnerName] = useState(provider?.owner_name || '')
  const [phone, setPhone] = useState(provider?.phone || '')
  const [email, setEmail] = useState(provider?.email || '')
  const [city, setCity] = useState(provider?.city || 'Patna')
  const [pincodesInput, setPincodesInput] = useState((provider?.serviceable_pincodes || ['800001', '800020']).join(', '))
  
  // Bank details
  const [accNumber, setAccNumber] = useState(provider?.bank_details?.account_number || '')
  const [ifsc, setIfsc] = useState(provider?.bank_details?.ifsc_code || '')
  const [beneficiary, setBeneficiary] = useState(provider?.bank_details?.beneficiary_name || '')
  const [upiId, setUpiId] = useState(provider?.bank_details?.upi_id || '')

  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!provider) return

    setIsSaving(true)
    try {
      const pincodesArray = pincodesInput
        .split(',')
        .map(p => p.trim())
        .filter(Boolean)

      const { error } = await supabase
        .from('service_providers')
        .update({
          business_name: businessName,
          owner_name: ownerName,
          phone,
          email,
          city,
          serviceable_pincodes: pincodesArray,
          bank_details: {
            account_number: accNumber,
            ifsc_code: ifsc,
            beneficiary_name: beneficiary,
            upi_id: upiId
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', provider.id)

      if (error) throw error

      toast.success('Service Partner Profile Updated!')
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Update profile error:', err)
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8 text-left max-w-5xl mx-auto pb-10">
      
      {/* Profile Header Banner */}
      <div className="bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 border border-sky-500/20 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-black text-3xl flex items-center justify-center shadow-lg shadow-sky-500/25 shrink-0">
            {businessName.charAt(0) || 'O'}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {businessName || 'Service Partner Agency'}
              </h2>
              {provider?.is_verified && (
                <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-3 text-sm sm:text-base text-gray-500 dark:text-gray-300 mt-2 font-bold flex-wrap">
              <span className="flex items-center gap-1.5 text-amber-500 font-extrabold">
                <Star size={16} fill="currentColor" /> {provider?.rating || 5.0}
              </span>
              <span className="text-gray-400">•</span>
              <span>{city} Operational Hub</span>
              <span className="text-gray-400">•</span>
              <span className="text-emerald-500 font-black">{provider?.total_jobs_completed || 0} Jobs Done</span>
            </div>
          </div>
        </div>

        <span className="text-xs sm:text-sm font-black uppercase tracking-wider px-4 py-2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Verified Partner</span>
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Business Credentials */}
        <div className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2.5 border-b border-gray-100 dark:border-white/5 pb-4">
            <Building2 className="w-5 h-5 text-sky-500" />
            <span>Business Credentials & Hub</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
            <div>
              <label className="block text-xs sm:text-sm font-black uppercase text-gray-400 dark:text-gray-400 tracking-wider mb-2">
                Agency / Business Name
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm sm:text-base font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-black uppercase text-gray-400 dark:text-gray-400 tracking-wider mb-2">
                Partner / Owner Name
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm sm:text-base font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-black uppercase text-gray-400 dark:text-gray-400 tracking-wider mb-2">
                Dispatch Contact Phone
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm sm:text-base font-bold text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-black uppercase text-gray-400 dark:text-gray-400 tracking-wider mb-2">
                Official Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm sm:text-base font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-black uppercase text-gray-400 dark:text-gray-400 tracking-wider mb-2">
                Primary Service City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm sm:text-base font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-black uppercase text-gray-400 dark:text-gray-400 tracking-wider mb-2">
                Covered Pincodes (Comma separated)
              </label>
              <input
                type="text"
                value={pincodesInput}
                onChange={(e) => setPincodesInput(e.target.value)}
                placeholder="e.g. 800001, 800020, 800014"
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm sm:text-base font-bold text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Bank & Payout Destination */}
        <div className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2.5 border-b border-gray-100 dark:border-white/5 pb-4">
            <CreditCard className="w-5 h-5 text-emerald-500" />
            <span>Bank Account & Settlement Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
            <div>
              <label className="block text-xs sm:text-sm font-black uppercase text-gray-400 dark:text-gray-400 tracking-wider mb-2">
                Beneficiary / Account Holder Name
              </label>
              <input
                type="text"
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                placeholder="As per bank passbook"
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm sm:text-base font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-black uppercase text-gray-400 dark:text-gray-400 tracking-wider mb-2">
                Bank Account Number
              </label>
              <input
                type="text"
                value={accNumber}
                onChange={(e) => setAccNumber(e.target.value)}
                placeholder="e.g. 01234567890123"
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm sm:text-base font-bold text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-black uppercase text-gray-400 dark:text-gray-400 tracking-wider mb-2">
                IFSC Code
              </label>
              <input
                type="text"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="e.g. SBIN0001234"
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm sm:text-base font-bold text-gray-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-black uppercase text-gray-400 dark:text-gray-400 tracking-wider mb-2">
                Instant UPI ID
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. agency@okaxis"
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm sm:text-base font-bold text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white rounded-2xl text-sm sm:text-base font-black tracking-wide shadow-xl shadow-sky-500/25 transition-all flex items-center gap-2.5 active:scale-95"
          >
            <Save size={18} />
            <span>{isSaving ? 'Saving Changes...' : 'Save Partner Profile'}</span>
          </button>
        </div>

      </form>
    </div>
  )
}
