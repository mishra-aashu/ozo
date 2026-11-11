import React from 'react'
import {
  Stethoscope,
  Baby,
  Heart,
  Bone,
  Sparkles,
  Activity,
  Eye,
  Ear,
  Brain,
  Smile,
  Pill,
  ShieldCheck,
  Building2,
  Syringe,
  Microscope,
  Cross
} from 'lucide-react'

export const CARE_SPECIALTIES = [
  {
    slug: 'general-physician',
    title: 'General Physician',
    hindiTitle: 'सामान्य चिकित्सक',
    description: 'Fever, cough, infections, diabetes & chronic care',
    icon: Stethoscope,
    gradient: 'from-emerald-500 to-teal-600',
    accentColor: '#059669',
    badge: 'Most Consulted'
  },
  {
    slug: 'pediatrics',
    title: 'Pediatrics & Child Care',
    hindiTitle: 'शिशु एवं बाल रोग',
    description: 'Infant growth, newborn vaccines, child fever & flu',
    icon: Baby,
    gradient: 'from-cyan-500 to-blue-600',
    accentColor: '#06b6d4',
    badge: 'Kid Friendly'
  },
  {
    slug: 'gynecology',
    title: 'Women Health & Gynecologist',
    hindiTitle: 'स्त्री एवं प्रसूति रोग',
    description: 'Pregnancy, period pain, PCOS, fertility & hormonal care',
    icon: Heart,
    gradient: 'from-rose-500 to-pink-600',
    accentColor: '#e11d48',
    badge: '100% Confidential'
  },
  {
    slug: 'orthopedic',
    title: 'Orthopedic & Bone Care',
    hindiTitle: 'हड्डी एवं जोड़ रोग',
    description: 'Joint pain, arthritis, fractures, spine & knee issues',
    icon: Bone,
    gradient: 'from-amber-500 to-orange-600',
    accentColor: '#d97706',
    badge: 'Expert Surgeons'
  },
  {
    slug: 'dermatology',
    title: 'Dermatology & Skin Care',
    hindiTitle: 'त्वचा एवं सौंदर्य रोग',
    description: 'Acne, eczema, fungal infections, hairfall & allergies',
    icon: Sparkles,
    gradient: 'from-purple-500 to-indigo-600',
    accentColor: '#7c3aed',
    badge: 'Top Rated'
  },
  {
    slug: 'cardiology',
    title: 'Cardiology & Heart',
    hindiTitle: 'हृदय रोग विशेषज्ञ',
    description: 'Blood pressure, chest tightness, ECG review & heart health',
    icon: Activity,
    gradient: 'from-red-500 to-rose-600',
    accentColor: '#dc2626',
    badge: 'Critical Care'
  },
  {
    slug: 'ent',
    title: 'ENT (Ear, Nose, Throat)',
    hindiTitle: 'कान, नाक एवं गला',
    description: 'Tonsils, ear discharge, sinusitis, hearing & voice issues',
    icon: Ear,
    gradient: 'from-teal-500 to-emerald-600',
    accentColor: '#0d9488',
    badge: 'Specialist'
  },
  {
    slug: 'dental',
    title: 'Dental & Oral Care',
    hindiTitle: 'दांत एवं मुख रोग',
    description: 'Toothache, cavity filling, root canal & scaling',
    icon: Smile,
    gradient: 'from-blue-500 to-cyan-600',
    accentColor: '#2563eb',
    badge: 'Painless Care'
  }
]

export default function SpecialtyIcon({ slug, size = 24, className = '' }) {
  const spec = CARE_SPECIALTIES.find(s => s.slug === slug)
  const IconComponent = spec ? spec.icon : Stethoscope

  return <IconComponent size={size} className={className} />
}
