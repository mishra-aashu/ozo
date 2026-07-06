import React, { useState, useEffect } from 'react'
import { useMartStore } from '../../stores/martStore'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { 
  Store, 
  Upload, 
  X, 
  RefreshCw, 
  Check,
  Zap,
  ShieldCheck,
  Star,
  Shield,
  Award,
  Clock,
  ThumbsUp,
  TrendingUp,
  Info
} from 'lucide-react'

export const parseTimeString = (timeStr) => {
  if (!timeStr) return { hour: '09', minute: '00' }
  const parts = timeStr.split(':')
  return {
    hour: parts[0] || '09',
    minute: parts[1] || '00'
  }
}

const StoreProfileView = () => {
  const { currentMart } = useMartStore()

  // Local Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    opens_at: '',
    closes_at: '',
    is_24_7: false,
    logo_url: '',
    banner_url: '',
    badges: [],
    guarantees: []
  })
  const [profileLogoFile, setProfileLogoFile] = useState(null)
  const [profileBannerFile, setProfileBannerFile] = useState(null)
  const [uploadingProfileLogo, setUploadingProfileLogo] = useState(false)
  const [uploadingProfileBanner, setUploadingProfileBanner] = useState(false)
  const [newProfileBadgeText, setNewProfileBadgeText] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  useEffect(() => {
    if (currentMart) {
      setProfileForm({
        name: currentMart.name || '',
        description: currentMart.description || '',
        address: currentMart.address || '',
        phone: currentMart.phone || '',
        opens_at: currentMart.opens_at || '',
        closes_at: currentMart.closes_at || '',
        is_24_7: currentMart.is_24_7 || false,
        logo_url: currentMart.logo_url || '',
        banner_url: currentMart.banner_url || '',
        badges: currentMart.badges || [],
        guarantees: currentMart.guarantees || []
      })
    }
  }, [currentMart])

  // Handle profile image upload to mart-assets bucket
  const handleProfileImageUpload = async (file, type) => {
    if (!file || !currentMart) return null
    
    const setUploading = type === 'logo' ? setUploadingProfileLogo : setUploadingProfileBanner
    setUploading(true)
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${currentMart.id}/${type}-${Date.now()}.${fileExt}`
      
      const { error } = await supabase.storage
        .from('mart-assets')
        .upload(fileName, file, {
          cacheControl: '365 days',
          upsert: true
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('mart-assets')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (err) {
      console.error(`Error uploading ${type}:`, err)
      toast.error(`Failed to upload ${type}`)
      return null
    } finally {
      setUploading(false)
    }
  }

  // Handle save profile changes
  const handleSaveStoreProfile = async (e) => {
    if (e) e.preventDefault()
    if (!currentMart) return
    setIsSavingProfile(true)

    try {
      let finalLogoUrl = profileForm.logo_url
      let finalBannerUrl = profileForm.banner_url

      if (profileLogoFile) {
        const uploadedLogo = await handleProfileImageUpload(profileLogoFile, 'logo')
        if (uploadedLogo) finalLogoUrl = uploadedLogo
      }

      if (profileBannerFile) {
        const uploadedBanner = await handleProfileImageUpload(profileBannerFile, 'banner')
        if (uploadedBanner) finalBannerUrl = uploadedBanner
      }

      const updatedFields = {
        name: profileForm.name,
        description: profileForm.description,
        address: profileForm.address,
        phone: profileForm.phone,
        opens_at: profileForm.opens_at || null,
        closes_at: profileForm.closes_at || null,
        is_24_7: profileForm.is_24_7,
        logo_url: finalLogoUrl,
        banner_url: finalBannerUrl,
        badges: profileForm.badges,
        guarantees: profileForm.guarantees
      }

      const { data, error } = await supabase
        .from('marts')
        .update(updatedFields)
        .eq('id', currentMart.id)
        .select()
        .single()

      if (error) throw error

      // Update local store state instantly!
      useMartStore.setState({ currentMart: data })
      
      setProfileLogoFile(null)
      setProfileBannerFile(null)
      toast.success('Store profile updated successfully!')
    } catch (error) {
      console.error('Error saving store profile:', error)
      toast.error('Failed to update store profile')
    } finally {
      setIsSavingProfile(false)
    }
  }

  if (!currentMart) return null

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-gray-50 dark:bg-slate-950 scrollbar-hide pb-16 lg:pb-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-slate-850">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white uppercase tracking-wider">Store Profile Settings</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Configure your public store details, banners, operating status, badges, and guarantees.</p>
          </div>
          <button
            onClick={() => handleSaveStoreProfile()}
            disabled={isSavingProfile}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-2 active:scale-95 cursor-pointer select-none"
          >
            {isSavingProfile ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Logo & Banner */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-850 rounded-2xl p-5 shadow-sm space-y-5">
              <h3 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider">Branding Assets</h3>

              {/* Banner Upload */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Store Banner</label>
                <div className="flex flex-col gap-3">
                  <div className="w-full h-28 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 overflow-hidden flex items-center justify-center relative group">
                    {profileBannerFile ? (
                      <img src={URL.createObjectURL(profileBannerFile)} alt="Banner Preview" className="w-full h-full object-cover" />
                    ) : profileForm.banner_url ? (
                      <img src={profileForm.banner_url} alt="Banner" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center py-6">
                        <Store className="w-7 h-7 text-gray-350 dark:text-gray-650 mx-auto mb-1" />
                        <span className="text-[11px] text-gray-400 block font-medium">No Banner Uploaded</span>
                      </div>
                    )}
                    {(profileForm.banner_url || profileBannerFile) && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileBannerFile(null)
                          setProfileForm(prev => ({ ...prev, banner_url: '' }))
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all cursor-pointer"
                        title="Remove Banner"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <label className="flex flex-col items-center justify-center border border-dashed border-gray-200 dark:border-slate-800 rounded-xl py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/40 hover:border-blue-500 dark:hover:border-blue-500/50 transition-all group">
                    {uploadingProfileBanner ? (
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-gray-400 mb-1 group-hover:text-blue-500 transition-colors" />
                        <span className="text-[9px] font-bold text-gray-500 dark:text-gray-450 uppercase tracking-wider group-hover:text-blue-500 transition-colors">Upload Banner</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProfileBannerFile(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Logo Upload */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Store Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 overflow-hidden shrink-0 flex items-center justify-center relative group">
                    {profileLogoFile ? (
                      <img src={URL.createObjectURL(profileLogoFile)} alt="Logo Preview" className="w-full h-full object-cover" />
                    ) : profileForm.logo_url ? (
                      <img src={profileForm.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-5 h-5 text-gray-350 dark:text-gray-650" />
                    )}
                  </div>
                  <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-gray-200 dark:border-slate-800 rounded-xl py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/40 hover:border-blue-500 dark:hover:border-blue-500/50 transition-all group">
                    {uploadingProfileLogo ? (
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-gray-400 mb-1 group-hover:text-blue-500 transition-colors" />
                        <span className="text-[9px] font-bold text-gray-500 dark:text-gray-450 uppercase tracking-wider group-hover:text-blue-500 transition-colors">Upload Logo</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProfileLogoFile(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Basic Details & Hours */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-gray-155 dark:border-slate-850 rounded-2xl p-5 shadow-sm space-y-5">
              <h3 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider">Store Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Store Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-gray-800 dark:text-gray-200 shadow-sm transition-all"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Helpline Phone</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-gray-800 dark:text-gray-200 shadow-sm transition-all"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Description / Tagline</label>
                <textarea
                  rows={2}
                  value={profileForm.description}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your store and offers..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-gray-800 dark:text-gray-200 shadow-sm transition-all resize-none"
                />
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Address</label>
                <input
                  type="text"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-gray-800 dark:text-gray-200 shadow-sm transition-all"
                />
              </div>

              {/* Operating Hours */}
              <div className="bg-gray-50/50 dark:bg-slate-900/40 rounded-xl p-4 space-y-4 border border-gray-200/60 dark:border-slate-850">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-gray-700 dark:text-white">Operating Hours Configuration</h4>
                    <p className="text-[11px] text-gray-400 dark:text-gray-450 mt-0.5">Configure opening and closing schedule</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfileForm(prev => ({ ...prev, is_24_7: !prev.is_24_7 }))}
                    className={`w-10 h-5.5 rounded-full p-0.5 transition-all flex items-center cursor-pointer ${
                      profileForm.is_24_7 ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-800'
                    }`}
                  >
                    <div className={`w-4.5 h-4.5 rounded-full bg-white transition-all transform ${
                      profileForm.is_24_7 ? 'translate-x-4.5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {!profileForm.is_24_7 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Opens At */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-450 dark:text-gray-500 uppercase tracking-wider block">Opens At</label>
                      <div className="flex gap-2 items-center">
                        <select
                          value={parseTimeString(profileForm.opens_at).hour}
                          onChange={(e) => {
                            const newHour = e.target.value
                            const currentMin = parseTimeString(profileForm.opens_at).minute
                            setProfileForm(prev => ({
                              ...prev,
                              opens_at: `${newHour}:${currentMin}:00`
                            }))
                          }}
                          className="flex-1 min-w-0 appearance-none pr-8 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-250 shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[right_8px_center] bg-no-repeat bg-[length:16px_16px]"
                        >
                          {Array.from({ length: 24 }).map((_, i) => {
                            const h = String(i).padStart(2, '0')
                            return (
                              <option key={h} value={h} className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
                                {h} ({i >= 12 ? (i === 12 ? '12 PM' : `${i-12} PM`) : (i === 0 ? '12 AM' : `${i} AM`)})
                              </option>
                            )
                          })}
                        </select>
                        <span className="text-gray-400 font-bold shrink-0">:</span>
                        <select
                          value={parseTimeString(profileForm.opens_at).minute}
                          onChange={(e) => {
                            const newMin = e.target.value
                            const currentHour = parseTimeString(profileForm.opens_at).hour
                            setProfileForm(prev => ({
                              ...prev,
                              opens_at: `${currentHour}:${newMin}:00`
                            }))
                          }}
                          className="w-20 shrink-0 appearance-none pr-8 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-250 shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[right_8px_center] bg-no-repeat bg-[length:16px_16px]"
                        >
                          {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                            <option key={m} value={m} className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white">{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Closes At */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-455 dark:text-gray-500 uppercase tracking-wider block">Closes At</label>
                      <div className="flex gap-2 items-center">
                        <select
                          value={parseTimeString(profileForm.closes_at).hour}
                          onChange={(e) => {
                            const newHour = e.target.value
                            const currentMin = parseTimeString(profileForm.closes_at).minute
                            setProfileForm(prev => ({
                              ...prev,
                              closes_at: `${newHour}:${currentMin}:00`
                            }))
                          }}
                          className="flex-1 min-w-0 appearance-none pr-8 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-250 shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[right_8px_center] bg-no-repeat bg-[length:16px_16px]"
                        >
                          {Array.from({ length: 24 }).map((_, i) => {
                            const h = String(i).padStart(2, '0')
                            return (
                              <option key={h} value={h} className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
                                {h} ({i >= 12 ? (i === 12 ? '12 PM' : `${i-12} PM`) : (i === 0 ? '12 AM' : `${i} AM`)})
                              </option>
                            )
                          })}
                        </select>
                        <span className="text-gray-400 font-bold shrink-0">:</span>
                        <select
                          value={parseTimeString(profileForm.closes_at).minute}
                          onChange={(e) => {
                            const newMin = e.target.value
                            const currentHour = parseTimeString(profileForm.closes_at).hour
                            setProfileForm(prev => ({
                              ...prev,
                              closes_at: `${currentHour}:${newMin}:00`
                            }))
                          }}
                          className="w-20 shrink-0 appearance-none pr-8 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-250 shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none transition-all cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[right_8px_center] bg-no-repeat bg-[length:16px_16px]"
                        >
                          {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                            <option key={m} value={m} className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white">{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Badges Custom Config */}
          <div className="bg-white dark:bg-slate-900 border border-gray-155 dark:border-slate-850 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider">Store Badges / Highlights</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-450 mt-0.5">These small highlight badges are shown under the store title.</p>
            </div>

            {/* Added Badges list */}
            <div className="flex flex-wrap gap-2">
              {profileForm.badges?.map((badge, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-zinc-300 animate-fade-in"
                >
                  <span>{badge}</span>
                  <button
                    type="button"
                    onClick={() => setProfileForm(prev => ({
                      ...prev,
                      badges: prev.badges.filter((_, i) => i !== idx)
                    }))}
                    className="text-gray-400 hover:text-rose-500 transition-colors p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              {(!profileForm.badges || profileForm.badges.length === 0) && (
                <p className="text-xs text-gray-400 dark:text-zinc-500 italic font-medium">No badges configured. Standard system defaults will be shown.</p>
              )}
            </div>

            {/* Add badge input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add custom highlight (e.g. Pure Veg)"
                value={newProfileBadgeText}
                onChange={(e) => setNewProfileBadgeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (newProfileBadgeText.trim()) {
                      if (!profileForm.badges.includes(newProfileBadgeText.trim())) {
                        setProfileForm(prev => ({
                          ...prev,
                          badges: [...prev.badges, newProfileBadgeText.trim()]
                        }))
                      }
                      setNewProfileBadgeText('')
                    }
                  }
                }}
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-gray-800 dark:text-gray-200 shadow-sm transition-all"
              />
              <button
                type="button"
                onClick={() => {
                  if (newProfileBadgeText.trim()) {
                    if (!profileForm.badges.includes(newProfileBadgeText.trim())) {
                      setProfileForm(prev => ({
                        ...prev,
                        badges: [...prev.badges, newProfileBadgeText.trim()]
                      }))
                    }
                    setNewProfileBadgeText('')
                  }
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-xl text-xs font-bold uppercase text-gray-700 dark:text-zinc-200 transition-all active:scale-95 shrink-0 cursor-pointer"
              >
                Add
              </button>
            </div>

            {/* Quick Suggestions */}
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest block">Quick Suggestions</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  '30 Min Delivery',
                  '100% Hygienic',
                  'Top Rated Store',
                  'Contactless Delivery',
                  '100% Pure Veg',
                  'Organic Produce',
                  'Sealed Packaging',
                  'Fresh Stock'
                ].map((sug, idx) => {
                  const isAdded = profileForm.badges?.includes(sug)
                  if (isAdded) return null
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setProfileForm(prev => ({
                        ...prev,
                        badges: [...(prev.badges || []), sug]
                      }))}
                      className="text-[10px] font-bold px-2 py-1 bg-gray-50 hover:bg-gray-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-lg text-gray-600 dark:text-zinc-400 hover:border-blue-500/35 dark:hover:border-blue-500/35 transition-all cursor-pointer"
                    >
                      + {sug}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Guarantees Custom Config */}
          <div className="bg-white dark:bg-slate-900 border border-gray-155 dark:border-slate-850 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider">Store Guarantees</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-450 mt-0.5">Configure the trust indicators shown on your store profile.</p>
              </div>
              <button
                type="button"
                onClick={() => setProfileForm(prev => ({
                  ...prev,
                  guarantees: [
                    ...(prev.guarantees || []),
                    { title: 'New Guarantee', description: 'Describe your guarantee here.', icon: 'shield' }
                  ]
                }))}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                + Add Card
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-hide">
              {profileForm.guarantees?.map((guarantee, idx) => (
                <div key={idx} className="bg-gray-50/50 dark:bg-slate-950 p-4 rounded-xl border border-gray-200 dark:border-slate-850 space-y-3.5 relative">
                  <button
                    type="button"
                    onClick={() => setProfileForm(prev => ({
                      ...prev,
                      guarantees: prev.guarantees.filter((_, i) => i !== idx)
                    }))}
                    className="absolute top-2.5 right-2.5 text-gray-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                    title="Remove Guarantee"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Title */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-450 uppercase tracking-widest block">Title</label>
                    <input
                      type="text"
                      value={guarantee.title}
                      onChange={(e) => {
                        const newVal = e.target.value
                        setProfileForm(prev => {
                          const newGuar = [...prev.guarantees]
                          newGuar[idx] = { ...newGuar[idx], title: newVal }
                          return { ...prev, guarantees: newGuar }
                        })
                      }}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-455 uppercase tracking-widest block">Description</label>
                    <textarea
                      rows={2}
                      value={guarantee.description}
                      onChange={(e) => {
                        const newVal = e.target.value
                        setProfileForm(prev => {
                          const newGuar = [...prev.guarantees]
                          newGuar[idx] = { ...newGuar[idx], description: newVal }
                          return { ...prev, guarantees: newGuar }
                        })
                      }}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                    />
                  </div>

                  {/* Icon Selection */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-455 uppercase tracking-widest block">Icon style</label>
                    <select
                      value={guarantee.icon}
                      onChange={(e) => {
                        const newVal = e.target.value
                        setProfileForm(prev => {
                          const newGuar = [...prev.guarantees]
                          newGuar[idx] = { ...newGuar[idx], icon: newVal }
                          return { ...prev, guarantees: newGuar }
                        })
                      }}
                      className="w-full appearance-none pr-8 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-800 dark:text-gray-250 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[right_8px_center] bg-no-repeat bg-[length:16px_16px]"
                    >
                      <option value="shield">Shield (Security)</option>
                      <option value="shield-check">Shield Check (Quality Check)</option>
                      <option value="clock">Clock (Delivery Speed)</option>
                      <option value="thumbs-up">Thumbs Up (Replacement / Trust)</option>
                      <option value="trending-up">Trending Up (Pricing / Rates)</option>
                      <option value="zap">Zap (Speed/Flash)</option>
                      <option value="star">Star (Rating/Top)</option>
                      <option value="check">Checkmark (Verified)</option>
                    </select>
                  </div>
                </div>
              ))}
              {(!profileForm.guarantees || profileForm.guarantees.length === 0) && (
                <p className="text-xs text-gray-400 dark:text-zinc-550 italic text-center py-6 bg-gray-50 dark:bg-slate-950 rounded-xl border border-dashed border-gray-200 dark:border-slate-850">No guarantees configured.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StoreProfileView
