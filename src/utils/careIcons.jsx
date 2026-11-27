import React from 'react'

// ==========================================
// 20 HANDCRAFTED ABSTRACT MEDICAL ICONS
// Designed with layered SVG depth, rich dual-tone gradients,
// soft bio-glows, and modern abstract geometric healthcare shapes.
// ==========================================

export function GeneralPhysicianIcon({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="gp-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="gp-cross" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="gp-steth" x1="8" y1="18" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <radialGradient id="gp-pulse" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(35 13) scale(6)">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Soft abstract squircle backdrop */}
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#gp-bg)" />
      <rect x="5" y="5" width="38" height="38" rx="13" stroke="#10b981" strokeWidth="1" strokeOpacity="0.3" />
      {/* Abstract Stethoscope Orbit Wave */}
      <path d="M 12 18 C 9 27 15 37 25 37 C 34 37 38 31 37 25" stroke="url(#gp-steth)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="36.5" cy="23.5" r="3.2" fill="#0d9488" stroke="#ffffff" strokeWidth="1.2" />
      {/* Modern Dimensional Medical Cross */}
      <rect x="15" y="21" width="18" height="6" rx="3" fill="url(#gp-cross)" />
      <rect x="21" y="15" width="6" height="18" rx="3" fill="url(#gp-cross)" />
      {/* Center Vitality Specular Spark */}
      <circle cx="24" cy="24" r="1.5" fill="#ffffff" />
      {/* Upper-right Bio-Pulse Beacon */}
      <circle cx="35" cy="13" r="3" fill="url(#gp-pulse)" />
      <circle cx="35" cy="13" r="1.2" fill="#ffffff" />
    </svg>
  )
}

export function PediatricsIcon({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="ped-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="ped-cradle" x1="10" y1="24" x2="38" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="ped-face" x1="17" y1="13" x2="31" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="60%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#ped-bg)" />
      <rect x="5" y="5" width="38" height="38" rx="13" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.25" />
      {/* Protective Abstract Cradle Arc */}
      <path d="M 11 27 C 13 36 25 38 35 32 C 37 30.5 38.5 28 36.5 26.5 C 34.5 25 32.5 27 30 28.5 C 23.5 32.5 16.5 29 15 24 C 14.5 21.5 11 23 11 27 Z" fill="url(#ped-cradle)" />
      {/* Sunny Child Sprout / Face */}
      <circle cx="24" cy="20" r="8" fill="url(#ped-face)" />
      {/* Joyful Hair Curl */}
      <path d="M 24 12 C 25.5 9.5 28 10.5 26.5 12.5" stroke="#d97706" strokeWidth="1.4" strokeLinecap="round" />
      {/* Rosy Cheeks */}
      <circle cx="21" cy="21.5" r="1.3" fill="#f43f5e" opacity="0.65" />
      <circle cx="27" cy="21.5" r="1.3" fill="#f43f5e" opacity="0.65" />
      {/* Smiling Curve */}
      <path d="M 22 22.8 C 23.2 24.3 24.8 24.3 26 22.8" stroke="#78350f" strokeWidth="1.2" strokeLinecap="round" />
      {/* Celestial Sparkles */}
      <path d="M 35 11 L 36 13.5 L 38.5 14.5 L 36 15.5 L 35 18 L 34 15.5 L 31.5 14.5 L 34 13.5 Z" fill="#38bdf8" />
      <circle cx="13" cy="15" r="2" fill="#67e8f9" opacity="0.8" />
    </svg>
  )
}

export function GynecologyIcon({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="gyn-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#e11d48" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="gyn-petal1" x1="12" y1="12" x2="24" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#e11d48" />
        </linearGradient>
        <linearGradient id="gyn-petal2" x1="36" y1="12" x2="24" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>
        <linearGradient id="gyn-core" x1="22" y1="19" x2="26" y2="33" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#fda4af" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#gyn-bg)" />
      <rect x="5" y="5" width="38" height="38" rx="13" stroke="#f43f5e" strokeWidth="1" strokeOpacity="0.25" />
      {/* Interlocking Heart & Lotus Ribbon */}
      <path d="M 24 37 C 14 31 8 22 11 15 C 13.5 9.5 20.5 11 24 16.5" fill="url(#gyn-petal1)" opacity="0.9" />
      <path d="M 24 37 C 34 31 40 22 37 15 C 34.5 9.5 27.5 11 24 16.5" fill="url(#gyn-petal2)" opacity="0.85" />
      {/* Glowing Inner Life Pearl */}
      <path d="M 24 18 C 21 23 21 28 24 32 C 27 28 27 23 24 18 Z" fill="url(#gyn-core)" />
      {/* Top Diamond Sparkle */}
      <circle cx="24" cy="10" r="2" fill="#fda4af" />
      <circle cx="24" cy="10" r="1" fill="#ffffff" />
    </svg>
  )
}

export function OrthopedicIcon({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="ortho-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ea580c" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="ortho-bone" x1="14" y1="12" x2="34" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="ortho-ring" x1="10" y1="20" x2="38" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fdba74" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#ortho-bg)" />
      <rect x="5" y="5" width="38" height="38" rx="13" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.25" />
      {/* Mobility Gyroscope Orbit Ring */}
      <ellipse cx="24" cy="24" rx="15" ry="6.5" transform="rotate(-30 24 24)" stroke="url(#ortho-ring)" strokeWidth="2.5" strokeDasharray="30 8" fill="none" />
      {/* Sculpted Bone / Vertebra Joint */}
      <path d="M 18 12 C 16 12 14.5 13.5 14.5 15.5 C 14.5 17.5 16 19 18 19 C 19 19 20 18.5 20.8 17.8 L 27.2 24.2 C 26.5 25 26 26 26 27 C 26 29 27.5 30.5 29.5 30.5 C 31.5 30.5 33 29 33 27 C 33 25 31.5 23.5 29.5 23.5 C 28.5 23.5 27.5 24 26.8 24.8 L 20.4 18.4 C 21 17.6 21.5 16.6 21.5 15.5 C 21.5 13.5 20 12 18 12 Z" fill="url(#ortho-bone)" />
      {/* Pivot Articulation Core */}
      <circle cx="23.8" cy="23.8" r="3.6" fill="#ffffff" stroke="#d97706" strokeWidth="1.2" />
      <circle cx="23" cy="23" r="1.2" fill="#fbbf24" />
    </svg>
  )
}

export function DermatologyIcon({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="derm-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="derm-drop" x1="24" y1="10" x2="24" y2="39" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="derm-star" x1="27" y1="13" x2="39" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e9d5ff" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#derm-bg)" />
      <rect x="5" y="5" width="38" height="38" rx="13" stroke="#8b5cf6" strokeWidth="1" strokeOpacity="0.25" />
      {/* Cellular Moisture Glow Droplet */}
      <path d="M 23 10 C 23 10 13 23 13 29 C 13 34.5 17.5 39 23 39 C 28.5 39 33 34.5 33 29 C 33 23 23 10 23 10 Z" fill="url(#derm-drop)" />
      {/* Hydration Ripple Ring */}
      <ellipse cx="23" cy="31" rx="6.5" ry="3" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.5" />
      {/* Radiant 8-Point Diamond Facet Sparkle */}
      <path d="M 33 11 L 34.5 15.5 L 39 17 L 34.5 18.5 L 33 23 L 31.5 18.5 L 27 17 L 31.5 15.5 Z" fill="url(#derm-star)" />
      <circle cx="33" cy="17" r="1.5" fill="#ffffff" />
      {/* Micro-sparkles */}
      <circle cx="15" cy="17" r="1.5" fill="#e9d5ff" opacity="0.9" />
      <circle cx="34" cy="33" r="1.8" fill="#c084fc" opacity="0.8" />
    </svg>
  )
}

export function CardiologyIcon({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="cardio-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="cardio-heart" x1="10" y1="10" x2="38" y2="39" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="40%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#cardio-bg)" />
      <rect x="5" y="5" width="38" height="38" rx="13" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.25" />
      {/* Layered Cardiac Chamber */}
      <path d="M 24 38 C 24 38 10 28.5 10 18.5 C 10 13 14.5 9.5 19.8 10.5 C 22 11 23.3 12.5 24 14 C 24.7 12.5 26 11 28.2 10.5 C 33.5 9.5 38 13 38 18.5 C 38 28.5 24 38 24 38 Z" fill="url(#cardio-heart)" />
      {/* Specular Ventricular Highlight */}
      <path d="M 14 18.5 C 14 15 16.5 12.2 19.5 12.5 C 18 14.8 17.5 18 18.5 22 C 16 22 14 20.5 14 18.5 Z" fill="#ffffff" opacity="0.32" />
      {/* High-Voltage Electrocardiogram (ECG) Wave */}
      <path d="M 7 24 L 16 24 L 19 18 L 22.5 30 L 26 13 L 29.5 27 L 31.5 24 L 41 24" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Peak Voltage Node */}
      <circle cx="26" cy="13" r="2.2" fill="#fef08a" stroke="#ffffff" strokeWidth="1" />
    </svg>
  )
}

export function EntIcon({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="ent-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#047857" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="ent-ear" x1="12" y1="12" x2="30" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="60%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
        <linearGradient id="ent-wave" x1="32" y1="14" x2="42" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#ent-bg)" />
      <rect x="5" y="5" width="38" height="38" rx="13" stroke="#14b8a6" strokeWidth="1" strokeOpacity="0.25" />
      {/* Stylized Fibonacci Ear Silhouette */}
      <path d="M 20 12 C 26 12 30 16 30 22 C 30 27 27 29 24 30 C 21 31 20 33 20 35.5 C 20 37 18.5 38 17 38 C 15.5 38 14 36.5 14 34 C 14 28 19 26 21 24 C 23 22 23 19 20 19 C 17.5 19 16.5 20.5 16 22 C 15.5 23 14 23 13 22 C 12 21 12.5 19 14.5 16 C 16 13.5 18 12 20 12 Z" fill="url(#ent-ear)" />
      {/* Acoustic Resonance Radiating Waves */}
      <path d="M 33 18 C 35.8 20.5 35.8 25.5 33 28" stroke="url(#ent-wave)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 38 14 C 42.5 18.5 42.5 27.5 38 32" stroke="url(#ent-wave)" strokeWidth="2.2" strokeLinecap="round" opacity="0.75" />
      {/* Resonance Core Node */}
      <circle cx="20" cy="24" r="2.2" fill="#5eead4" />
    </svg>
  )
}

export function DentalIcon({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="dent-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="dent-tooth" x1="14" y1="11" x2="34" y2="39" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#dent-bg)" />
      <rect x="5" y="5" width="38" height="38" rx="13" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.25" />
      {/* Abstract Sculpted Tooth Crown */}
      <path d="M 14 16 C 14 11.5 18 10.5 24 10.5 C 30 10.5 34 11.5 34 16 C 34 23 32 29 30 36.5 C 29.5 38.5 27.5 38.5 26.5 36.5 C 25.5 34.5 25 30.5 24 30.5 C 23 30.5 22.5 34.5 21.5 36.5 C 20.5 38.5 18.5 38.5 18 36.5 C 16 29 14 23 14 16 Z" fill="url(#dent-tooth)" />
      {/* Enamel Specular Glaze */}
      <path d="M 17.5 14 C 19.5 13 22 12.5 24 12.5 C 26 12.5 28.5 13 30.5 14 C 30.5 17 29.5 21 28.5 23.5 C 26.5 23 24 23 21.5 23.5 C 19.5 21 18.5 17 17.5 14 Z" fill="#ffffff" opacity="0.38" />
      {/* Diamond Enamel Shine Star */}
      <path d="M 32 7 L 33.5 10.5 L 37 12 L 33.5 13.5 L 32 17 L 30.5 13.5 L 27 12 L 30.5 10.5 Z" fill="#ffffff" />
      <circle cx="32" cy="12" r="1.2" fill="#67e8f9" />
    </svg>
  )
}

export function OphthalmologyIcon({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="eye-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#4338ca" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="eye-contour" x1="8" y1="14" x2="40" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <radialGradient id="eye-iris" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(24 24) scale(8)">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="60%" stopColor="#0369a1" />
          <stop offset="100%" stopColor="#0c4a6e" />
        </radialGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#eye-bg)" />
      <rect x="5" y="5" width="38" height="38" rx="13" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.25" />
      {/* Aerodynamic Ocular Contour */}
      <path d="M 8 24 C 14 14 34 14 40 24 C 34 34 14 34 8 24 Z" fill="url(#eye-contour)" />
      <path d="M 10 24 C 15 16 33 16 38 24 C 33 32 15 32 10 24 Z" fill="#0f172a" opacity="0.45" />
      {/* Concentric Biometric Iris & Aperture */}
      <circle cx="24" cy="24" r="7.5" fill="url(#eye-iris)" stroke="#38bdf8" strokeWidth="1.2" />
      <circle cx="24" cy="24" r="3.5" fill="#030712" />
      {/* Specular Vision Reflection */}
      <circle cx="22" cy="22" r="1.5" fill="#ffffff" />
      {/* Alignment Ticks */}
      <line x1="5" y1="24" x2="8" y2="24" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="24" x2="43" y2="24" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function NeurologyIcon({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="neuro-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#4338ca" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="neuro-lobes" x1="12" y1="11" x2="36" y2="37" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="60%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#neuro-bg)" />
      <rect x="5" y="5" width="38" height="38" rx="13" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.25" />
      {/* Dual Cerebral Hemispheres */}
      <path d="M 23 11 C 17 11 12 15 12 21 C 12 24 13.5 27 15 28.5 C 13.5 30.5 14 34 17 36 C 19 37.5 22 37 23 37 Z" fill="url(#neuro-lobes)" opacity="0.9" />
      <path d="M 25 11 C 31 11 36 15 36 21 C 36 24 34.5 27 33 28.5 C 34.5 30.5 34 34 31 36 C 29 37.5 26 37 25 37 Z" fill="url(#neuro-lobes)" opacity="0.85" />
      {/* Synaptic Pathway Circuit */}
      <path d="M 18 19 L 24 24 L 30 18 M 17 29 L 24 24 L 31 29 M 24 13 L 24 35" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" />
      {/* Synaptic Junction Spheres */}
      <circle cx="24" cy="24" r="2.8" fill="#fef08a" stroke="#ffffff" strokeWidth="0.8" />
      <circle cx="18" cy="19" r="2" fill="#22d3ee" />
      <circle cx="30" cy="18" r="2" fill="#22d3ee" />
      <circle cx="24" cy="13" r="1.8" fill="#e879f9" />
    </svg>
  )
}

export function PulmonologyIcon({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="pulmo-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0e7490" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="pulmo-lung" x1="11" y1="13" x2="37" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="60%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#pulmo-bg)" />
      <rect x="5" y="5" width="38" height="38" rx="13" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.25" />
      {/* Dual Aerodynamic Lung Lobes */}
      <path d="M 22 13 C 17 13 11 18 11 26 C 11 33 15 37.5 21 37.5 C 22.5 37.5 23 36 23 34.5 L 23 15.5 C 23 14 22.8 13 22 13 Z" fill="url(#pulmo-lung)" />
      <path d="M 26 13 C 31 13 37 18 37 26 C 37 33 33 37.5 27 37.5 C 25.5 37.5 25 36 25 34.5 L 25 15.5 C 25 14 25.2 13 26 13 Z" fill="url(#pulmo-lung)" opacity="0.9" />
      {/* Oxygen Airflow Current Waves */}
      <path d="M 8 20 C 14 18 20 22 24 18 C 28 14 34 18 40 16" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
      <path d="M 9 27 C 15 25 20 28 24 26 C 28 24 33 27 39 25" stroke="#a5f3fc" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      {/* Trachea Conduit */}
      <path d="M 24 9 L 24 15 M 22 15 L 24 17 L 26 15" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export function GastroenterologyIcon({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="gastro-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ea580c" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="gastro-stomach" x1="12" y1="12" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="60%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
        <linearGradient id="gastro-fire" x1="19" y1="19" x2="28" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#gastro-bg)" />
      <rect x="5" y="5" width="38" height="38" rx="13" stroke="#f97316" strokeWidth="1" strokeOpacity="0.25" />
      {/* Gastric Flow Ribbon Contour */}
      <path d="M 16 12 C 19 12 21 14 21 17 C 21 21 26 21 28 18 C 30 15 34 16 34 20 C 34 29 27 36 20 36 C 14 36 12 30 12 26 C 12 20 14 16 16 12 Z" fill="url(#gastro-stomach)" />
      {/* Inner Metabolic Enzymatic Core */}
      <path d="M 24 19 C 27 22 28 26 26 29 C 24 32 20 32 19 29 C 18 26 21 24 24 19 Z" fill="url(#gastro-fire)" />
      {/* Digestive Equilibrium Sparkles */}
      <circle cx="34" cy="13" r="2" fill="#fde047" />
      <circle cx="12" cy="19" r="1.5" fill="#fed7aa" />
    </svg>
  )
}

export function UrologyIcon({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="uro-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#1e40af" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="uro-kidney" x1="13" y1="11" x2="34" y2="37" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="60%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="uro-drop" x1="20" y1="18" x2="30" y2="33" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#uro-bg)" />
      <rect x="5" y="5" width="38" height="38" rx="13" stroke="#2563eb" strokeWidth="1" strokeOpacity="0.25" />
      {/* Stylized Renal Bean Contour */}
      <path d="M 20 11 C 28 11 34 17 34 25 C 34 33 28 37 22 37 C 16 37 13 32 13 25 C 13 21 17 19 17 16 C 17 13 18.5 11 20 11 Z" fill="url(#uro-kidney)" />
      {/* Pure Hydro-Filtration Droplet */}
      <path d="M 25 17 C 25 17 19.5 24 19.5 27.5 C 19.5 30.5 22 33 25 33 C 28 33 30.5 30.5 30.5 27.5 C 30.5 24 25 17 25 17 Z" fill="url(#uro-drop)" />
      {/* Fluid Ripple Wave */}
      <path d="M 11 30 C 14 33 22 35 28 33" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function PsychiatryIcon({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="psych-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c026d3" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="psych-head" x1="14" y1="9" x2="34" y2="37" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e879f9" />
          <stop offset="50%" stopColor="#c026d3" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#psych-bg)" />
      <rect x="5" y="5" width="38" height="38" rx="13" stroke="#c026d3" strokeWidth="1" strokeOpacity="0.25" />
      {/* Zen Mind Silhouette Contour */}
      <path d="M 16 37 C 16 33 18 31 18 28 C 18 26 14 24 14 19 C 14 13.5 18.5 9 24 9 C 29.5 9 34 13.5 34 19 C 34 23 32 26 32 29 C 32 32 34 34 34 37 Z" fill="url(#psych-head)" opacity="0.9" />
      {/* Harmonic Mindfulness Zen Spiral */}
      <path d="M 24 14.5 C 26.5 14.5 28.5 16.5 28.5 19 C 28.5 21.5 26.5 23.5 24 23.5 C 22 23.5 20.5 22 20.5 20 C 20.5 18.5 21.5 17.5 23 17.5 C 24 17.5 24.5 18 24.5 19" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      {/* Guiding Serenity Star */}
      <circle cx="24" cy="19" r="1.8" fill="#fef08a" />
    </svg>
  )
}

export function EndocrinologyIcon({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="endo-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d97706" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#b45309" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="endo-hex" x1="14" y1="12" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#endo-bg)" />
      <rect x="5" y="5" width="38" height="38" rx="13" stroke="#d97706" strokeWidth="1" strokeOpacity="0.25" />
      {/* Endocrine Metabolic Gyro-Orbit Ring */}
      <ellipse cx="24" cy="24" rx="15" ry="6.5" transform="rotate(30 24 24)" stroke="#fef08a" strokeWidth="2.2" strokeDasharray="30 10" fill="none" />
      {/* Geometric Hexagonal Glucose Molecule */}
      <polygon points="24,12 34,18 34,30 24,36 14,30 14,18" fill="url(#endo-hex)" stroke="#ffffff" strokeWidth="1.2" />
      {/* Central Hormonal Balance Spark */}
      <circle cx="24" cy="24" r="3.6" fill="#ffffff" stroke="#d97706" strokeWidth="1.2" />
      <circle cx="24" cy="24" r="1.6" fill="#f59e0b" />
    </svg>
  )
}

export function GeneralSurgeryIcon({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="surg-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#475569" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#1e293b" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="surg-blade" x1="14" y1="11" x2="37" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#surg-bg)" />
      <rect x="5" y="5" width="38" height="38" rx="13" stroke="#64748b" strokeWidth="1" strokeOpacity="0.25" />
      {/* Precision Laser Reticle Crosshairs */}
      <circle cx="24" cy="24" r="14" stroke="#38bdf8" strokeWidth="1.4" strokeDasharray="6 6" opacity="0.6" />
      <line x1="24" y1="6" x2="24" y2="10" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="24" y1="38" x2="24" y2="42" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="6" y1="24" x2="10" y2="24" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="38" y1="24" x2="42" y2="24" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
      {/* Aerodynamic Precision Micro-Scalpel */}
      <path d="M 14 34 L 28 20 L 33 22 L 23 36 Z" fill="#64748b" />
      <path d="M 28 20 L 37 11 C 36 15 34 18 31 21 Z" fill="url(#surg-blade)" stroke="#ffffff" strokeWidth="1" />
      {/* Laser Sterile Glint */}
      <circle cx="37" cy="11" r="2.2" fill="#38bdf8" />
      <circle cx="37" cy="11" r="1" fill="#ffffff" />
    </svg>
  )
}

export function PhysiotherapyIcon({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="physio-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#84cc16" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#15803d" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="physio-spine" x1="16" y1="12" x2="32" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#bef264" />
          <stop offset="50%" stopColor="#84cc16" />
          <stop offset="100%" stopColor="#4d7c0f" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#physio-bg)" />
      <rect x="5" y="5" width="38" height="38" rx="13" stroke="#84cc16" strokeWidth="1" strokeOpacity="0.25" />
      {/* Dynamic Kinetic Mobility Spine */}
      <path d="M 16 36 C 14 30 18 25 24 24 C 30 23 34 18 32 12" stroke="url(#physio-spine)" strokeWidth="3.5" strokeLinecap="round" />
      {/* Kinetic Velocity Streamlines */}
      <path d="M 12 28 C 16 22 24 20 28 15" stroke="#a3e635" strokeWidth="2.2" strokeLinecap="round" opacity="0.75" />
      <path d="M 20 38 C 24 34 30 32 36 26" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" opacity="0.75" />
      {/* Kinematic Pivot Nodes */}
      <circle cx="32" cy="12" r="3.4" fill="#ffffff" stroke="#65a30d" strokeWidth="1.4" />
      <circle cx="24" cy="24" r="2.2" fill="#bef264" />
    </svg>
  )
}

export function AyurvedaIcon({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="ayur-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#047857" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="ayur-leaf1" x1="14" y1="10" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="60%" stopColor="#059669" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
        <linearGradient id="ayur-leaf2" x1="10" y1="13" x2="18" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#ayur-bg)" />
      <rect x="5" y="5" width="38" height="38" rx="13" stroke="#10b981" strokeWidth="1" strokeOpacity="0.25" />
      {/* Primary Sacred Herbal Leaf */}
      <path d="M 14 36 C 14 36 12 23 21 14 C 29 6 36 10 36 10 C 36 10 38 23 29 32 C 21 40 14 36 14 36 Z" fill="url(#ayur-leaf1)" />
      {/* Golden Life-Force Leaf Vein */}
      <path d="M 17 33 C 22 26 27 19 33 13 M 22 25 L 26 27 M 25 21 L 29 23" stroke="#a7f3d0" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      {/* Secondary Herbal Bud */}
      <path d="M 13 25 C 10 18 15 13 18 14 C 20 19 16 24 13 25 Z" fill="url(#ayur-leaf2)" opacity="0.85" />
      {/* Morning Nectar Dewdrop */}
      <circle cx="31" cy="16" r="2.8" fill="#ffffff" stroke="#059669" strokeWidth="0.8" />
      <circle cx="31" cy="16" r="1.2" fill="#a7f3d0" />
    </svg>
  )
}

export function NutritionIcon({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="nutri-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#15803d" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="nutri-apple" x1="12" y1="12" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#nutri-bg)" />
      <rect x="5" y="5" width="38" height="38" rx="13" stroke="#22c55e" strokeWidth="1" strokeOpacity="0.25" />
      {/* Geometric Crisp Apple Silhouette */}
      <path d="M 24 14 C 21 11 15 12 13 16 C 10 22 12 33 18 37 C 21 39 23 37.5 24 37.5 C 25 37.5 27 39 30 37 C 36 33 38 22 35 16 C 33 12 27 11 24 14 Z" fill="url(#nutri-apple)" />
      {/* Fresh Nutrient Sprout Leaf */}
      <path d="M 24 13 C 24 9 27 7 29 8 C 29 11 26 13 24 13 Z" fill="#86efac" />
      <path d="M 24 14 C 23.5 11 22 9 20 8" stroke="#713f12" strokeWidth="1.8" strokeLinecap="round" />
      {/* Freshness Sheen Highlight */}
      <path d="M 15 19 C 14 23 15 28 17 31" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.45" />
    </svg>
  )
}

export function PathologyIcon({ size = 36, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="path-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#4338ca" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="path-flask" x1="14" y1="11" x2="34" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="60%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id="path-liquid" x1="14" y1="27" x2="34" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="38" height="38" rx="13" fill="url(#path-bg)" />
      <rect x="5" y="5" width="38" height="38" rx="13" stroke="#6366f1" strokeWidth="1" strokeOpacity="0.25" />
      {/* Diagnostic Prism Flask Contour */}
      <path d="M 21 11 L 27 11 L 27 17 L 34 31 C 36 35 33 38 29 38 L 19 38 C 15 38 12 35 14 31 L 21 17 Z" fill="url(#path-flask)" stroke="#ffffff" strokeWidth="1.2" />
      {/* Bio-Reagent Liquid Level */}
      <path d="M 16 27 C 19 25.5 29 28.5 32 27 L 34 31 C 36 35 33 38 29 38 L 19 38 C 15 38 12 35 14 31 Z" fill="url(#path-liquid)" opacity="0.85" />
      {/* Ascending Helical Test Bubbles */}
      <circle cx="21" cy="32" r="2.2" fill="#ffffff" />
      <circle cx="27" cy="29" r="1.8" fill="#fda4af" />
      <circle cx="23" cy="23" r="1.8" fill="#fef08a" />
      {/* Laser Inspection Cross-Scan */}
      <line x1="9" y1="28" x2="39" y2="28" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.9" />
    </svg>
  )
}

// ==========================================
// SPECIALTIES MASTER CONFIGURATION
// ==========================================
export const CARE_SPECIALTIES = [
  {
    slug: 'general-physician',
    title: 'General Physician',
    subtitle: 'Fever & Common Care',
    description: 'Fever, cough, infections, diabetes & chronic care',
    icon: GeneralPhysicianIcon,
    gradient: 'from-emerald-500 to-teal-600',
    accentColor: '#059669',
    badge: 'Primary Care',
    aliases: ['general-physician', 'physician', 'general_physician']
  },
  {
    slug: 'pediatrics',
    title: 'Pediatrics',
    subtitle: 'Child & Infant Care',
    description: 'Infant growth, newborn vaccines, child fever & flu',
    icon: PediatricsIcon,
    gradient: 'from-cyan-500 to-blue-600',
    accentColor: '#06b6d4',
    badge: 'Child Care',
    aliases: ['pediatrics', 'pediatrician']
  },
  {
    slug: 'gynecology',
    title: 'Women Health',
    subtitle: 'Obstetrics & Gynae',
    description: 'Pregnancy, period pain, PCOS, fertility & hormonal care',
    icon: GynecologyIcon,
    gradient: 'from-rose-500 to-pink-600',
    accentColor: '#e11d48',
    badge: 'Women Health',
    aliases: ['gynecology', 'gynecologist', 'obstetrics']
  },
  {
    slug: 'orthopedic',
    title: 'Orthopedic',
    subtitle: 'Bone & Joint Specialist',
    description: 'Joint pain, arthritis, fractures, spine & knee issues',
    icon: OrthopedicIcon,
    gradient: 'from-amber-500 to-orange-600',
    accentColor: '#d97706',
    badge: 'Joints & Bones',
    aliases: ['orthopedic', 'orthopedics', 'orthopedist']
  },
  {
    slug: 'dermatology',
    title: 'Dermatology',
    subtitle: 'Skin & Hair Expert',
    description: 'Acne, eczema, fungal infections, hairfall & allergies',
    icon: DermatologyIcon,
    gradient: 'from-purple-500 to-indigo-600',
    accentColor: '#7c3aed',
    badge: 'Skin & Hair',
    aliases: ['dermatology', 'dermatologist']
  },
  {
    slug: 'cardiology',
    title: 'Cardiology',
    subtitle: 'Heart Specialist',
    description: 'Blood pressure, chest tightness, ECG review & heart health',
    icon: CardiologyIcon,
    gradient: 'from-red-500 to-rose-600',
    accentColor: '#dc2626',
    badge: 'Heart Care',
    aliases: ['cardiology', 'cardiologist']
  },
  {
    slug: 'ent',
    title: 'ENT Care',
    subtitle: 'Ear, Nose & Throat',
    description: 'Tonsils, ear discharge, sinusitis, hearing & voice issues',
    icon: EntIcon,
    gradient: 'from-teal-500 to-emerald-600',
    accentColor: '#0d9488',
    badge: 'ENT Specialist',
    aliases: ['ent', 'ent-specialist', 'ent-care']
  },
  {
    slug: 'dental',
    title: 'Dental Care',
    subtitle: 'Teeth & Oral Health',
    description: 'Toothache, cavity filling, root canal & scaling',
    icon: DentalIcon,
    gradient: 'from-blue-500 to-cyan-600',
    accentColor: '#2563eb',
    badge: 'Dental & Oral',
    aliases: ['dental', 'dentist', 'dentistry']
  },
  {
    slug: 'ophthalmology',
    title: 'Eye Care',
    subtitle: 'Vision & Cataract',
    description: 'Eye vision tests, cataract, glaucoma, spectacles & irritation',
    icon: OphthalmologyIcon,
    gradient: 'from-sky-500 to-blue-700',
    accentColor: '#0284c7',
    badge: 'Ophthalmology',
    aliases: ['ophthalmology', 'ophthalmologist', 'eye-care']
  },
  {
    slug: 'neurology',
    title: 'Neurology',
    subtitle: 'Brain & Spine Expert',
    description: 'Migraines, numbness, seizures, tremors, spine & stroke recovery',
    icon: NeurologyIcon,
    gradient: 'from-violet-600 to-indigo-700',
    accentColor: '#7c3aed',
    badge: 'Brain & Nerves',
    aliases: ['neurology', 'neurologist']
  },
  {
    slug: 'pulmonology',
    title: 'Chest & Lungs',
    subtitle: 'Asthma & Breathing',
    description: 'Chronic cough, asthma, bronchitis, COPD & lung infections',
    icon: PulmonologyIcon,
    gradient: 'from-cyan-600 to-teal-700',
    accentColor: '#0891b2',
    badge: 'Pulmonology',
    aliases: ['pulmonology', 'pulmonologist', 'chest-specialist']
  },
  {
    slug: 'gastroenterology',
    title: 'Gastro Care',
    subtitle: 'Stomach & Digestion',
    description: 'Acidity, GERD, stomach ulcers, constipation & liver health',
    icon: GastroenterologyIcon,
    gradient: 'from-orange-500 to-red-600',
    accentColor: '#ea580c',
    badge: 'Gastroenterology',
    aliases: ['gastroenterology', 'gastroenterologist', 'gastro']
  },
  {
    slug: 'urology',
    title: 'Urology',
    subtitle: 'Kidney & Urinary Care',
    description: 'Kidney stones, UTI, prostate enlargement & bladder pain',
    icon: UrologyIcon,
    gradient: 'from-blue-600 to-indigo-800',
    accentColor: '#1d4ed8',
    badge: 'Kidney & Urine',
    aliases: ['urology', 'urologist']
  },
  {
    slug: 'psychiatry',
    title: 'Mental Health',
    subtitle: 'Psychiatry & Mind',
    description: 'Anxiety, depression, sleep issues, panic & stress management',
    icon: PsychiatryIcon,
    gradient: 'from-fuchsia-500 to-pink-600',
    accentColor: '#c026d3',
    badge: 'Mind Wellness',
    aliases: ['psychiatry', 'psychiatrist', 'mental-health']
  },
  {
    slug: 'endocrinology',
    title: 'Diabetes & Thyroid',
    subtitle: 'Hormones & Sugar',
    description: 'Type 1/2 diabetes, thyroid disorders, metabolism & PCOS',
    icon: EndocrinologyIcon,
    gradient: 'from-yellow-500 to-amber-600',
    accentColor: '#d97706',
    badge: 'Endocrinology',
    aliases: ['endocrinology', 'endocrinologist', 'diabetologist']
  },
  {
    slug: 'general-surgery',
    title: 'General Surgery',
    subtitle: 'Laparoscopic & Minor',
    description: 'Hernia, gallstones, piles, fissure & laparoscopic procedures',
    icon: GeneralSurgeryIcon,
    gradient: 'from-slate-700 to-slate-900',
    accentColor: '#334155',
    badge: 'Surgical Care',
    aliases: ['general-surgery', 'surgeon', 'general-surgeon']
  },
  {
    slug: 'physiotherapy',
    title: 'Physiotherapy',
    subtitle: 'Rehab & Pain Relief',
    description: 'Back pain, neck stiffness, sports injuries & post-op recovery',
    icon: PhysiotherapyIcon,
    gradient: 'from-lime-500 to-emerald-600',
    accentColor: '#65a30d',
    badge: 'Physio & Rehab',
    aliases: ['physiotherapy', 'physiotherapist']
  },
  {
    slug: 'ayurveda',
    title: 'Ayurveda',
    subtitle: 'Herbal & Holistic',
    description: 'Ayurvedic therapies, panchakarma & natural lifestyle wellness',
    icon: AyurvedaIcon,
    gradient: 'from-emerald-600 to-green-700',
    accentColor: '#047857',
    badge: 'Ayush Holistic',
    aliases: ['ayurveda', 'ayurvedic']
  },
  {
    slug: 'nutrition',
    title: 'Diet & Nutrition',
    subtitle: 'Weight & Meal Plans',
    description: 'Weight loss, clinical diet charts, gut health & lifestyle plans',
    icon: NutritionIcon,
    gradient: 'from-green-500 to-emerald-600',
    accentColor: '#16a34a',
    badge: 'Dietetics',
    aliases: ['nutrition', 'dietitian', 'nutritionist']
  },
  {
    slug: 'pathology',
    title: 'Lab & Diagnostics',
    subtitle: 'Blood Tests & Scans',
    description: 'Full body checkups, CBC, thyroid tests, lipid profile & reports',
    icon: PathologyIcon,
    gradient: 'from-indigo-500 to-purple-700',
    accentColor: '#4f46e5',
    badge: 'Pathology & Lab',
    aliases: ['pathology', 'pathologist', 'diagnostics']
  }
]

export default function SpecialtyIcon({ slug, size = 36, className = '' }) {
  const spec = CARE_SPECIALTIES.find(s => s.slug === slug || (s.aliases && s.aliases.includes(slug)))
  const IconComponent = spec ? spec.icon : GeneralPhysicianIcon

  return <IconComponent size={size} className={className} />
}
