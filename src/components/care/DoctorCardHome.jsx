import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  CheckCircle2, 
  Star, 
  MapPin, 
  Building2, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  Calendar,
  Sparkles
} from 'lucide-react'
import { useCareStore } from '../../stores/careStore'

export default function DoctorCardHome({ doctor }) {
  const navigate = useNavigate()
  const { themeConfig } = useCareStore()
  const [imgError, setImgError] = useState(false)

  if (!doctor) return null

  const handleCardClick = () => {
    navigate(`/care/doctor/${doctor.id}`)
  }

  // Clean initials for fallback
  const initials = doctor.full_name
    ? doctor.full_name
        .replace(/^(Dr\.|Doctor)\s+/i, '')
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'DR'

  const specialtyClean = doctor.specialty_slug
    ? doctor.specialty_slug.replace(/[-_]/g, ' ')
    : 'General Medicine'

  const avatarSrc = doctor.profile_image || doctor.avatar_url

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardClick()
        }
      }}
      className="group relative bg-white dark:bg-[#121820] rounded-[1.75rem] border border-slate-200/90 dark:border-white/10 p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-emerald-950/20 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 flex flex-col justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 select-none"
    >
      {/* Top Section: Avatar + Doctor Info + Rating */}
      <div>
        <div className="flex items-start gap-4">
          {/* Avatar Container with Verification Badge */}
          <div className="relative shrink-0">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-emerald-500/20 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-0.5 shadow-sm group-hover:scale-105 transition-transform duration-300">
              {!imgError && avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={doctor.full_name}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover rounded-[0.9rem]"
                />
              ) : (
                <div className="w-full h-full rounded-[0.9rem] bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-display font-black text-xl shadow-inner">
                  {initials}
                </div>
              )}
            </div>

            {/* Online Pulse Indicator */}
            <span 
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[#121820] shadow-xs flex items-center justify-center"
              title="Doctor Online / Accepting Tokens"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            </span>
          </div>

          {/* Core Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span 
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-display font-black uppercase tracking-wider"
                style={{
                  backgroundColor: themeConfig?.badge_bg || 'rgba(5, 150, 105, 0.12)',
                  color: themeConfig?.badge_text || '#10b981'
                }}
              >
                {specialtyClean}
              </span>

              {/* Rating */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 font-display font-black text-xs shrink-0">
                <Star size={12} fill="currentColor" />
                <span>{doctor.rating || 4.9}</span>
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-display font-black text-slate-900 dark:text-white mt-1 leading-snug truncate flex items-center gap-1.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              <span>{doctor.full_name.startsWith('Dr.') ? doctor.full_name : `Dr. ${doctor.full_name}`}</span>
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 inline" title="NMC / State Council Verified" />
            </h3>

            <p className="text-xs font-sans font-bold text-slate-600 dark:text-slate-300 truncate mt-0.5">
              {doctor.qualification}
            </p>

            <p className="text-[11px] font-sans font-medium text-slate-400 mt-0.5">
              {doctor.experience_years}+ Years Experience
            </p>
          </div>
        </div>

        {/* Middle Section: Clinic & Location Details (Airy & Clean) */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-white/5 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <Building2 size={14} className="text-emerald-500 shrink-0" />
            <span className="font-semibold truncate">{doctor.clinic_name}</span>
          </div>

          <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400">
            <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
            <span className="truncate leading-snug">{doctor.clinic_address}, {doctor.city || 'Patna'}</span>
          </div>

          {/* Council & Availability Row */}
          <div className="flex items-center justify-between pt-1 text-[11px]">
            <span className="font-mono text-slate-400 flex items-center gap-1">
              <ShieldCheck size={13} className="text-emerald-500" />
              <span>{doctor.registration_number || doctor.council_registration_number || 'NMC Verified'}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Available Today
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Consultation Fee & CTA */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-display font-bold uppercase tracking-wider text-slate-400 block leading-none">
            Consultation Fee
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-white leading-none">
              ₹{doctor.consultation_fee || 500}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">/ OPD</span>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/care/book-appointment/${doctor.id}`)
          }}
          style={{ 
            backgroundColor: themeConfig?.primary || '#059669',
            boxShadow: `0 4px 14px ${themeConfig?.primary_glow || 'rgba(5, 150, 105, 0.3)'}`
          }}
          className="px-5 py-2.5 rounded-xl font-display font-black text-xs sm:text-sm text-white flex items-center gap-1.5 transition-all duration-200 hover:brightness-110 active:scale-95 shrink-0"
        >
          <span>Book Token</span>
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  )
}
