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
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      
      {/* Profile Header Banner */}
      <div className="bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 border border-sky-500/20 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
            {businessName.charAt(0) || 'O'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">
                {businessName || 'Service Partner Agency'}
              </h2>
              {provider?.is_verified && (
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1 font-bold">
              <span className="flex items-center gap-1 text-amber-500">
                <Star size={13} fill="currentColor" /> {provider?.rating || 5.0}
              </span>
              <span>•</span>
              <span>{city} Operational Hub</span>
              <span>•</span>
              <span className="text-emerald-500 font-black">{provider?.total_jobs_completed || 0} Jobs Done</span>
            </div>
          </div>
        </div>

        <span className="text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          ● Verified Partner
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Business Credentials */}
        <div className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-500" />
            <span>Business Credentials & Hub</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-[11px] font-black uppercase text-gray-400">Agency / Business Name</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full mt-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 font-bold text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-gray-400">Partner / Owner Name</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full mt-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 font-bold text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-gray-400">Dispatch Contact Phone</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full mt-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 font-bold text-gray-900 dark:text-white font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-gray-400">Official Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 font-bold text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-gray-400">Primary Service City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full mt-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 font-bold text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-gray-400">Covered Pincodes (Comma separated)</label>
              <input
                type="text"
                value={pincodesInput}
                onChange={(e) => setPincodesInput(e.target.value)}
                placeholder="e.g. 800001, 800020, 800014"
                className="w-full mt-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 font-bold text-gray-900 dark:text-white font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Bank & Payout Destination */}
        <div className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-500" />
            <span>Bank Account & Settlement Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-[11px] font-black uppercase text-gray-400">Beneficiary / Account Holder Name</label>
              <input
                type="text"
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                placeholder="As per bank passbook"
                className="w-full mt-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 font-bold text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-gray-400">Bank Account Number</label>
              <input
                type="text"
                value={accNumber}
                onChange={(e) => setAccNumber(e.target.value)}
                placeholder="e.g. 01234567890123"
                className="w-full mt-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 font-bold text-gray-900 dark:text-white font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-gray-400">IFSC Code</label>
              <input
                type="text"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="e.g. SBIN0001234"
                className="w-full mt-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 font-bold text-gray-900 dark:text-white font-mono uppercase focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-gray-400">Instant UPI ID</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. agency@okaxis"
                className="w-full mt-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 font-bold text-gray-900 dark:text-white font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black tracking-wide shadow-lg shadow-sky-600/20 transition-all flex items-center gap-2"
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving Changes...' : 'Save Partner Profile'}</span>
          </button>
        </div>

      </form>
    </div>
  )
}
