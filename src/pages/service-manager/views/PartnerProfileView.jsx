import React, { useState, useRef, useEffect } from 'react'
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
  CheckCircle2,
  Camera,
  UploadCloud,
  Trash2,
  Loader2,
  Lock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase'
import { useServiceManagerStore } from '../../../stores/serviceManagerStore'

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

  // Logo upload system
  const fileInputRef = useRef(null)
  const { uploadProviderLogo, removeProviderLogo } = useServiceManagerStore()
  const [logoUrl, setLogoUrl] = useState(provider?.logo_url || '')
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  useEffect(() => {
    if (provider?.logo_url !== undefined) {
      setLogoUrl(provider.logo_url || '')
    }
  }, [provider?.logo_url])

  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingLogo(true)
    try {
      const newUrl = await uploadProviderLogo(file)
      if (newUrl) {
        setLogoUrl(newUrl)
        if (onRefresh) onRefresh()
      }
    } finally {
      setIsUploadingLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveLogo = async () => {
    if (!confirm('Are you sure you want to remove your agency logo?')) return
    setIsUploadingLogo(true)
    try {
      const ok = await removeProviderLogo()
      if (ok) {
        setLogoUrl('')
        if (onRefresh) onRefresh()
      }
    } finally {
      setIsUploadingLogo(false)
    }
  }

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
    <div className="space-y-8 text-left max-w-6xl mx-auto pb-12">
      
      {/* Profile Header Banner */}
      <div className="bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 border border-sky-500/20 rounded-3xl p-6 sm:p-9 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          
          {/* Agency Logo Avatar & Interactive Upload system */}
          <div className="relative group shrink-0">
            <div
              onClick={() => !isUploadingLogo && fileInputRef.current?.click()}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden cursor-pointer relative shadow-xl shadow-sky-500/25 border-2 border-white/20 dark:border-white/10 transition-all hover:scale-105 active:scale-95 bg-white dark:bg-black/40 flex items-center justify-center group"
              title="Click to Upload / Change Agency Logo"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={businessName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-black text-4xl sm:text-5xl flex items-center justify-center">
                  {businessName.charAt(0) || 'O'}
                </div>
              )}

              {/* Hover / Uploading Overlay */}
              <div
                className={`absolute inset-0 bg-black/65 backdrop-blur-xs flex flex-col items-center justify-center text-white transition-opacity duration-200 ${
                  isUploadingLogo ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                {isUploadingLogo ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <Loader2 className="w-7 h-7 animate-spin text-sky-400" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-300">Uploading...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Camera className="w-7 h-7 text-sky-300" />
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      {logoUrl ? 'Change' : 'Upload'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Floating Camera Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingLogo}
              className="absolute -bottom-2 -right-2 p-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white shadow-lg shadow-sky-500/40 transition-all border-2 border-white dark:border-[#18181b] active:scale-95 flex items-center justify-center"
              title="Upload / Change Logo"
            >
              <Camera size={16} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoFileChange}
              className="hidden"
            />
          </div>

          <div>
            <div className="flex items-center gap-3.5">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                {businessName || 'Service Partner Agency'}
              </h2>
              {provider?.is_verified && (
                <ShieldCheck className="w-8 h-8 text-emerald-500 shrink-0" />
              )}
            </div>
            
            <div className="flex items-center gap-3.5 text-base sm:text-lg text-gray-500 dark:text-gray-300 mt-2.5 font-bold flex-wrap">
              <span className="flex items-center gap-2 text-amber-500 font-extrabold">
                <Star size={20} fill="currentColor" /> {provider?.rating || 5.0}
              </span>
              <span className="text-gray-400">•</span>
              <span>{city} Operational Hub</span>
              <span className="text-gray-400">•</span>
              <span className="text-emerald-500 font-black">{provider?.total_jobs_completed || 0} Jobs Done</span>
            </div>

            {/* Logo Actions / Hint */}
            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo}
                className="text-xs sm:text-sm font-bold text-sky-500 hover:text-sky-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <UploadCloud size={16} />
                <span>{logoUrl ? 'Change Agency Logo' : 'Upload Agency Logo'}</span>
              </button>

              {logoUrl && (
                <>
                  <span className="text-gray-400">•</span>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    disabled={isUploadingLogo}
                    className="text-xs sm:text-sm font-bold text-rose-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Remove Logo</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <span className="text-sm sm:text-base font-black uppercase tracking-wider px-5 py-2.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-2 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Verified Partner</span>
        </span>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Business Credentials */}
        <div className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-7 sm:p-9 shadow-sm space-y-7">
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-3 border-b border-gray-100 dark:border-white/5 pb-5">
            <Building2 className="w-7 h-7 text-sky-500" />
            <span>Business Credentials & Hub</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-7">
            <div>
              <label className="block text-sm sm:text-base font-bold text-gray-700 dark:text-gray-200 tracking-wide uppercase mb-2.5">
                Agency / Business Name
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 text-base sm:text-lg font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all shadow-inner"
              />
            </div>

            <div>
              <label className="block text-sm sm:text-base font-bold text-gray-700 dark:text-gray-200 tracking-wide uppercase mb-2.5">
                Partner / Owner Name
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 text-base sm:text-lg font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all shadow-inner"
              />
            </div>

            <div>
              <label className="block text-sm sm:text-base font-bold text-gray-700 dark:text-gray-200 tracking-wide uppercase mb-2.5">
                Dispatch Contact Phone
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 text-base sm:text-lg font-bold text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all shadow-inner"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="block text-sm sm:text-base font-bold text-gray-700 dark:text-gray-200 tracking-wide uppercase">
                  Official Email
                </label>
                <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                  <Lock size={12} className="text-gray-400" />
                  <span>Read Only</span>
                </span>
              </div>
              <input
                type="email"
                readOnly
                value={email}
                className="w-full bg-gray-100/80 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 text-base sm:text-lg font-bold text-gray-500 dark:text-gray-400 cursor-not-allowed select-all focus:outline-none shadow-inner"
                title="Official account email is permanent and cannot be changed"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 font-medium">
                Linked to your Ozomart partner login account.
              </p>
            </div>

            <div>
              <label className="block text-sm sm:text-base font-bold text-gray-700 dark:text-gray-200 tracking-wide uppercase mb-2.5">
                Primary Service City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 text-base sm:text-lg font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all shadow-inner"
              />
            </div>

            <div>
              <label className="block text-sm sm:text-base font-bold text-gray-700 dark:text-gray-200 tracking-wide uppercase mb-2.5">
                Covered Pincodes (Comma separated)
              </label>
              <input
                type="text"
                value={pincodesInput}
                onChange={(e) => setPincodesInput(e.target.value)}
                placeholder="e.g. 800001, 800020, 800014"
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 text-base sm:text-lg font-bold text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Bank & Payout Destination */}
        <div className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-7 sm:p-9 shadow-sm space-y-7">
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-3 border-b border-gray-100 dark:border-white/5 pb-5">
            <CreditCard className="w-7 h-7 text-emerald-500" />
            <span>Bank Account & Settlement Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-7">
            <div>
              <label className="block text-sm sm:text-base font-bold text-gray-700 dark:text-gray-200 tracking-wide uppercase mb-2.5">
                Beneficiary / Account Holder Name
              </label>
              <input
                type="text"
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                placeholder="As per bank passbook"
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 text-base sm:text-lg font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-inner"
              />
            </div>

            <div>
              <label className="block text-sm sm:text-base font-bold text-gray-700 dark:text-gray-200 tracking-wide uppercase mb-2.5">
                Bank Account Number
              </label>
              <input
                type="text"
                value={accNumber}
                onChange={(e) => setAccNumber(e.target.value)}
                placeholder="e.g. 01234567890123"
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 text-base sm:text-lg font-bold text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-inner"
              />
            </div>

            <div>
              <label className="block text-sm sm:text-base font-bold text-gray-700 dark:text-gray-200 tracking-wide uppercase mb-2.5">
                IFSC Code
              </label>
              <input
                type="text"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="e.g. SBIN0001234"
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 text-base sm:text-lg font-bold text-gray-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-inner"
              />
            </div>

            <div>
              <label className="block text-sm sm:text-base font-bold text-gray-700 dark:text-gray-200 tracking-wide uppercase mb-2.5">
                Instant UPI ID
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. agency@okaxis"
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 text-base sm:text-lg font-bold text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="px-10 py-5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white rounded-2xl text-base sm:text-lg font-black tracking-wide shadow-xl shadow-sky-500/25 transition-all flex items-center gap-3 active:scale-95"
          >
            <Save size={22} />
            <span>{isSaving ? 'Saving Changes...' : 'Save Partner Profile'}</span>
          </button>
        </div>

      </form>
    </div>
  )
}
