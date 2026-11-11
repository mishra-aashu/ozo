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
    subtitle: 'Fever & Common Care',
    description: 'Fever, cough, infections, diabetes & chronic care',
    icon: Stethoscope,
    gradient: 'from-emerald-500 to-teal-600',
    accentColor: '#059669',
    badge: 'Primary Care'
  },
  {
    slug: 'pediatrics',
    title: 'Pediatrics',
    subtitle: 'Child & Infant Care',
    description: 'Infant growth, newborn vaccines, child fever & flu',
    icon: Baby,
    gradient: 'from-cyan-500 to-blue-600',
    accentColor: '#06b6d4',
    badge: 'Child Care'
  },
  {
    slug: 'gynecology',
    title: 'Women Health',
    subtitle: 'Obstetrics & Gynae',
    description: 'Pregnancy, period pain, PCOS, fertility & hormonal care',
    icon: Heart,
    gradient: 'from-rose-500 to-pink-600',
    accentColor: '#e11d48',
    badge: 'Women Health'
  },
  {
    slug: 'orthopedic',
    title: 'Orthopedic',
    subtitle: 'Bone & Joint Specialist',
    description: 'Joint pain, arthritis, fractures, spine & knee issues',
    icon: Bone,
    gradient: 'from-amber-500 to-orange-600',
    accentColor: '#d97706',
    badge: 'Joints & Bones'
  },
  {
    slug: 'dermatology',
    title: 'Dermatology',
    subtitle: 'Skin & Hair Expert',
    description: 'Acne, eczema, fungal infections, hairfall & allergies',
    icon: Sparkles,
    gradient: 'from-purple-500 to-indigo-600',
    accentColor: '#7c3aed',
    badge: 'Skin & Hair'
  },
  {
    slug: 'cardiology',
    title: 'Cardiology',
    subtitle: 'Heart Specialist',
    description: 'Blood pressure, chest tightness, ECG review & heart health',
    icon: Activity,
    gradient: 'from-red-500 to-rose-600',
    accentColor: '#dc2626',
    badge: 'Heart Care'
  },
  {
    slug: 'ent',
    title: 'ENT Care',
    subtitle: 'Ear, Nose & Throat',
    description: 'Tonsils, ear discharge, sinusitis, hearing & voice issues',
    icon: Ear,
    gradient: 'from-teal-500 to-emerald-600',
    accentColor: '#0d9488',
    badge: 'ENT Specialist'
  },
  {
    slug: 'dental',
    title: 'Dental Care',
    subtitle: 'Teeth & Oral Health',
    description: 'Toothache, cavity filling, root canal & scaling',
    icon: Smile,
    gradient: 'from-blue-500 to-cyan-600',
    accentColor: '#2563eb',
    badge: 'Dental & Oral'
  }
]

export default function SpecialtyIcon({ slug, size = 24, className = '' }) {
  const spec = CARE_SPECIALTIES.find(s => s.slug === slug)
  const IconComponent = spec ? spec.icon : Stethoscope

  return <IconComponent size={size} className={className} />
}
