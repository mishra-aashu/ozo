import React, { useState, useEffect } from 'react'
import {
  Heart,
  Palette,
  ShieldCheck,
  Stethoscope,
  Pill,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  MapPin,
  Calendar,
  Building2,
  RefreshCw,
  Sparkles,
  Save,
  Check,
  Award,
  Phone,
  FileText
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useCareStore } from '../../stores/careStore'
import toast from 'react-hot-toast'

const THEME_PRESETS = [
  {
    theme_id: 'clinical_emerald',
    name: 'Clinical Emerald & Trust Cyan (Default)',
    description: 'Clean medical authority, sterile hygiene & high patient trust',
    primary: '#059669',
    primary_hover: '#047857',
    primary_glow: 'rgba(5, 150, 105, 0.35)',
    secondary: '#06b6d4',
    accent: '#14b8a6',
    badge_bg: 'rgba(5, 150, 105, 0.12)',
    badge_text: '#10b981',
    header_gradient: 'from-emerald-500/15 via-teal-500/10 to-cyan-500/15'
  },
  {
    theme_id: 'royal_indigo',
    name: 'Modern Royal Indigo & Cyan',
    description: 'Hospital grade, institutional clinical tech & digital teleconsultation',
    primary: '#4f46e5',
    primary_hover: '#4338ca',
    primary_glow: 'rgba(79, 70, 229, 0.35)',
    secondary: '#0ea5e9',
    accent: '#6366f1',
    badge_bg: 'rgba(79, 70, 229, 0.12)',
    badge_text: '#6366f1',
    header_gradient: 'from-indigo-500/15 via-blue-500/10 to-sky-500/15'
  },
  {
    theme_id: 'healing_teal',
    name: 'Healing Teal & Mint Jade',
    description: 'Natural wellness, preventive healthcare & clean diagnostics',
    primary: '#0d9488',
    primary_hover: '#0f766e',
    primary_glow: 'rgba(13, 148, 136, 0.35)',
    secondary: '#10b981',
    accent: '#2dd4bf',
    badge_bg: 'rgba(13, 148, 136, 0.12)',
    badge_text: '#14b8a6',
    header_gradient: 'from-teal-500/15 via-emerald-500/10 to-green-500/15'
  },
  {
    theme_id: 'warm_rose',
    name: 'Warm Coral & Maternal Rose',
    description: 'Pediatrics, mother & child healthcare, warm compassionate care',
    primary: '#e11d48',
    primary_hover: '#be123c',
    primary_glow: 'rgba(225, 29, 72, 0.35)',
    secondary: '#f97316',
    accent: '#fb7185',
    badge_bg: 'rgba(225, 29, 72, 0.12)',
    badge_text: '#f43f5e',
    header_gradient: 'from-rose-500/15 via-pink-500/10 to-orange-500/15'
  }
]

export default function CareManageAdmin() {
  const [activeTab, setActiveTab] = useState('theme') // 'theme' | 'doctors' | 'pharmacies' | 'appointments'
  
  // Theme state
  const { themeConfig, updateThemeConfig, fetchThemeConfig } = useCareStore()
  const [customTheme, setCustomTheme] = useState(themeConfig)
  const [isSavingTheme, setIsSavingTheme] = useState(false)

  // Data lists
  const [doctors, setDoctors] = useState([])
  const [pharmacies, setPharmacies] = useState([])
  const [appointments, setAppointments] = useState([])
  const [isLoadingData, setIsLoadingData] = useState(false)

  useEffect(() => {
    fetchThemeConfig()
    loadAdminData()
  }, [])

  useEffect(() => {
    if (themeConfig) {
      setCustomTheme(themeConfig)
    }
  }, [themeConfig])

  const loadAdminData = async () => {
    setIsLoadingData(true)
    try {
      const [docsRes, pharmsRes, apptsRes] = await Promise.all([
        supabase.from('care_doctors').select('*').order('created_at', { ascending: false }),
        supabase.from('care_pharmacies').select('*').order('created_at', { ascending: false }),
        supabase.from('care_appointments').select('*, care_doctors(*)').order('created_at', { ascending: false }).limit(50)
      ])

      setDoctors(docsRes.data || [])
      setPharmacies(pharmsRes.data || [])
      setAppointments(apptsRes.data || [])
    } catch (err) {
      console.error('[AdminCare] Error loading data:', err)
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleSelectPreset = (preset) => {
    setCustomTheme(preset)
  }

  const handleSaveTheme = async () => {
    setIsSavingTheme(true)
    try {
      await updateThemeConfig(customTheme)
    } finally {
      setIsSavingTheme(false)
    }
  }

  const toggleDoctorVerification = async (doctorId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('care_doctors')
        .update({ is_verified: !currentStatus })
        .eq('id', doctorId)

      if (error) throw error
      setDoctors(doctors.map(d => d.id === doctorId ? { ...d, is_verified: !currentStatus } : d))
      toast.success(!currentStatus ? 'Doctor verified & approved for app!' : 'Doctor unverified')
    } catch (err) {
      toast.error('Failed to update doctor verification')
    }
  }

  const togglePharmacyVerification = async (pharmacyId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('care_pharmacies')
        .update({ is_verified: !currentStatus })
        .eq('id', pharmacyId)

      if (error) throw error
      setPharmacies(pharmacies.map(p => p.id === pharmacyId ? { ...p, is_verified: !currentStatus } : p))
      toast.success(!currentStatus ? 'Pharmacy verified & active for medicine orders!' : 'Pharmacy unverified')
    } catch (err) {
      toast.error('Failed to update pharmacy verification')
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 text-left max-w-7xl mx-auto font-sans">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-display font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
              OzoCare Healthcare Control Tower
            </span>
            <span className="text-xs font-sans font-bold text-gray-400">Database & Live Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-gray-900 dark:text-white mt-2 tracking-tight">
            OzoCare Management & Theme Engine
          </h1>
          <p className="text-sm sm:text-base font-sans text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            Live database control: Customize OzoCare theme colors globally, verify Medical Council licenses, and monitor doctor-patient appointments.
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="p-3 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 shadow-sm transition-all flex items-center gap-2 text-xs font-bold shrink-0"
        >
          <RefreshCw size={16} className={isLoadingData ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 w-fit flex-wrap">
        <button
          onClick={() => setActiveTab('theme')}
          className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
            activeTab === 'theme'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Palette size={16} />
          <span>Theme & CSS Variables</span>
        </button>

        <button
          onClick={() => setActiveTab('doctors')}
          className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
            activeTab === 'doctors'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Stethoscope size={16} />
          <span>Doctors ({doctors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pharmacies')}
          className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
            activeTab === 'pharmacies'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Pill size={16} />
          <span>Pharmacies ({pharmacies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 ${
            activeTab === 'appointments'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Calendar size={16} />
          <span>Appointments ({appointments.length})</span>
        </button>
      </div>

      {/* TAB 1: DYNAMIC THEME ENGINE */}
      {activeTab === 'theme' && (
        <div className="space-y-6">
          <div className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-white/10">
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  <span>OzoCare Dynamic Theme & Color Presets</span>
                </h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Changes save to Supabase <code className="font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">app_settings</code> and take effect immediately across all OzoCare screens.
                </p>
              </div>

              <button
                onClick={handleSaveTheme}
                disabled={isSavingTheme}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl text-sm font-black tracking-wide shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 active:scale-95 shrink-0"
              >
                <Save size={16} />
                <span>{isSavingTheme ? 'Saving to Database...' : 'Save & Deploy Theme Globally'}</span>
              </button>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
              {THEME_PRESETS.map((preset) => {
                const isSelected = customTheme?.theme_id === preset.theme_id
                return (
                  <div
                    key={preset.theme_id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/30 shadow-md'
                        : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                          <span>{preset.name}</span>
                          {isSelected && <Check size={16} className="text-emerald-500" />}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-400 mb-4">{preset.description}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                      <div className="w-8 h-8 rounded-xl shadow-xs" style={{ backgroundColor: preset.primary }} title="Primary Color" />
                      <div className="w-8 h-8 rounded-xl shadow-xs" style={{ backgroundColor: preset.secondary }} title="Secondary Color" />
                      <div className="w-8 h-8 rounded-xl shadow-xs" style={{ backgroundColor: preset.accent }} title="Accent Color" />
                      <span className="text-[11px] font-mono text-gray-400 ml-auto font-bold">{preset.primary}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Live Custom Color Hex Editor */}
            <div className="pt-6 border-t border-gray-100 dark:border-white/10 space-y-4">
              <h4 className="text-sm font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Custom Color & Hex Variables Override
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">
                    Primary Brand Color (Buttons & Hero)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={customTheme?.primary || '#059669'}
                      onChange={(e) => setCustomTheme({
                        ...customTheme,
                        theme_id: 'custom',
                        primary: e.target.value,
                        primary_hover: e.target.value,
                        primary_glow: `${e.target.value}55`
                      })}
                      className="w-12 h-12 rounded-xl cursor-pointer border border-gray-200 dark:border-white/10 bg-transparent"
                    />
                    <input
                      type="text"
                      value={customTheme?.primary || '#059669'}
                      onChange={(e) => setCustomTheme({ ...customTheme, primary: e.target.value })}
                      className="flex-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-mono font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">
                    Secondary Accent Color (Badges)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={customTheme?.secondary || '#06b6d4'}
                      onChange={(e) => setCustomTheme({ ...customTheme, theme_id: 'custom', secondary: e.target.value })}
                      className="w-12 h-12 rounded-xl cursor-pointer border border-gray-200 dark:border-white/10 bg-transparent"
                    />
                    <input
                      type="text"
                      value={customTheme?.secondary || '#06b6d4'}
                      onChange={(e) => setCustomTheme({ ...customTheme, secondary: e.target.value })}
                      className="flex-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-mono font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">
                    Tertiary Accent Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={customTheme?.accent || '#14b8a6'}
                      onChange={(e) => setCustomTheme({ ...customTheme, theme_id: 'custom', accent: e.target.value })}
                      className="w-12 h-12 rounded-xl cursor-pointer border border-gray-200 dark:border-white/10 bg-transparent"
                    />
                    <input
                      type="text"
                      value={customTheme?.accent || '#14b8a6'}
                      onChange={(e) => setCustomTheme({ ...customTheme, accent: e.target.value })}
                      className="flex-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-mono font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 mt-4">
                <span className="text-[10px] font-black uppercase text-gray-400 block mb-3">Live Button & Pill Preview:</span>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    style={{ backgroundColor: customTheme?.primary || '#059669', color: '#ffffff' }}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all"
                  >
                    Book Clinic Slot
                  </button>
                  <span
                    style={{ backgroundColor: customTheme?.badge_bg || 'rgba(5, 150, 105, 0.12)', color: customTheme?.primary || '#059669' }}
                    className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider"
                  >
                    NMC Verified Doctor
                  </span>
                  <span
                    style={{ color: customTheme?.secondary || '#06b6d4' }}
                    className="text-xs font-bold"
                  >
                    30-min Chemist Delivery
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DOCTORS MANAGEMENT */}
      {activeTab === 'doctors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={doc.avatar_url || 'https://images.unsplash.com/photo-1594824813627-2c9dd0a81177?auto=format&fit=crop&w=400&q=80'}
                      alt={doc.full_name}
                      className="w-14 h-14 rounded-2xl object-cover border border-emerald-500/30"
                    />
                    <div>
                      <h4 className="text-base font-black text-gray-900 dark:text-white leading-tight">
                        {doc.full_name}
                      </h4>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {doc.qualification}
                      </p>
                      <span className="text-[10px] font-mono text-gray-400 font-bold block mt-0.5">
                        Council Reg: {doc.council_registration_number} ({doc.council_state})
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    doc.is_verified ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {doc.is_verified ? 'Approved' : 'Pending'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300 py-3 border-y border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-1.5">
                    <Building2 size={13} className="text-gray-400" />
                    <span className="font-medium truncate">{doc.clinic_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-gray-400" />
                    <span className="truncate">{doc.clinic_address}, {doc.city}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-gray-500">
                    <Phone size={13} className="text-gray-400" />
                    <span>{doc.phone}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-bold py-3">
                  <span className="text-gray-400">Clinic Fee: <strong className="text-gray-900 dark:text-white font-mono">₹{doc.consultation_fee}</strong></span>
                  <span className="text-gray-400">Patients: <strong className="text-emerald-500 font-mono">{doc.total_patients_consulted}</strong></span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400">Status</span>
                <button
                  onClick={() => toggleDoctorVerification(doc.id, doc.is_verified)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    doc.is_verified
                      ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                  }`}
                >
                  {doc.is_verified ? 'Revoke Approval' : 'Approve Doctor'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: PHARMACIES MANAGEMENT */}
      {activeTab === 'pharmacies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {pharmacies.map((pharm) => (
            <div
              key={pharm.id}
              className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h4 className="text-lg font-black text-gray-900 dark:text-white">
                      {pharm.store_name}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium">
                      Owner: {pharm.owner_name} • Registered Pharmacist: {pharm.registered_pharmacist_name}
                    </p>
                  </div>

                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    pharm.is_verified ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {pharm.is_verified ? 'Licensed Active' : 'Under Review'}
                  </span>
                </div>

                <div className="p-3.5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-1.5 text-xs mb-4">
                  <div className="flex justify-between font-mono font-bold">
                    <span className="text-gray-400">Drug License Form 20:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{pharm.drug_license_form_20}</span>
                  </div>
                  <div className="flex justify-between font-mono font-bold">
                    <span className="text-gray-400">Drug License Form 21:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{pharm.drug_license_form_21}</span>
                  </div>
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="text-gray-400">Pharmacist Reg:</span>
                    <span className="text-gray-700 dark:text-gray-300 font-bold">{pharm.pharmacist_reg_number}</span>
                  </div>
                  <div className="pt-1 text-gray-500 flex items-center gap-1">
                    <MapPin size={12} className="text-rose-500 shrink-0" />
                    <span className="truncate">{pharm.store_address}, {pharm.city}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-gray-400">
                  {pharm.serviceable_pincodes?.length || 0} Pincodes Covered
                </span>
                <button
                  onClick={() => togglePharmacyVerification(pharm.id, pharm.is_verified)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${
                    pharm.is_verified
                      ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                  }`}
                >
                  {pharm.is_verified ? 'Suspend License' : 'Verify & Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: APPOINTMENTS STREAM */}
      {activeTab === 'appointments' && (
        <div className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4">
            Recent Patient Bookings & Tokens Stream
          </h3>

          <div className="space-y-3">
            {appointments.length === 0 ? (
              <p className="text-center py-10 text-gray-400 text-sm font-bold">No appointments recorded yet.</p>
            ) : (
              appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 font-mono font-black flex items-center justify-center text-sm shrink-0">
                      #{apt.token_number || '1'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900 dark:text-white text-sm">{apt.patient_name}</span>
                        <span className="text-[10px] font-mono text-gray-400">({apt.patient_phone})</span>
                      </div>
                      <p className="text-gray-400 font-medium mt-0.5">
                        Consulting with: <strong className="text-gray-700 dark:text-gray-200">{apt.care_doctors?.full_name || 'Doctor'}</strong> ({apt.consultation_mode})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="font-mono font-black text-gray-900 dark:text-white">₹{apt.fee_amount}</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      apt.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  )
}
