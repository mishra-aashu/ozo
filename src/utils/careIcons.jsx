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
  Cross,
  Wind,
  Flame,
  Droplet,
  Leaf,
  Apple
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
    badge: 'Primary Care',
    aliases: ['general-physician', 'physician', 'general_physician']
  },
  {
    slug: 'pediatrics',
    title: 'Pediatrics',
    subtitle: 'Child & Infant Care',
    description: 'Infant growth, newborn vaccines, child fever & flu',
    icon: Baby,
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
    icon: Heart,
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
    icon: Bone,
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
    icon: Sparkles,
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
    icon: Activity,
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
    icon: Ear,
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
    icon: Smile,
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
    icon: Eye,
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
    icon: Brain,
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
    icon: Wind,
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
    icon: Flame,
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
    icon: Droplet,
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
    icon: Brain,
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
    icon: Activity,
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
    icon: Syringe,
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
    icon: Activity,
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
    icon: Leaf,
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
    icon: Apple,
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
    icon: Microscope,
    gradient: 'from-indigo-500 to-purple-700',
    accentColor: '#4f46e5',
    badge: 'Pathology & Lab',
    aliases: ['pathology', 'pathologist', 'diagnostics']
  }
]

export default function SpecialtyIcon({ slug, size = 24, className = '' }) {
  const spec = CARE_SPECIALTIES.find(s => s.slug === slug || (s.aliases && s.aliases.includes(slug)))
  const IconComponent = spec ? spec.icon : Stethoscope

  return <IconComponent size={size} className={className} />
}
