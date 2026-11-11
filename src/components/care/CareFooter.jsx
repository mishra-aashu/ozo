import React from 'react'
import { Link } from 'react-router-dom'
import {
  Stethoscope,
  Pill,
  ShieldCheck,
  Clock,
  Heart,
  PhoneCall,
  AlertTriangle,
  MapPin,
  Mail,
  FileText,
  CheckCircle2,
  ArrowRight,
  Activity,
  Sparkles,
  Building2,
  Lock,
  Phone
} from 'lucide-react'

export default function CareFooter() {
  const currentYear = new Date().getFullYear()

  const trustFeatures = [
    {
      icon: ShieldCheck,
      title: 'NMC Registered Specialists',
      desc: '100% verified medical council practitioners with active clinical registrations.'
    },
    {
      icon: Pill,
      title: 'Form 20/21 Licensed Chemists',
      desc: 'Genuine batch, manufacturer seal & GST tax invoice guaranteed on all medicines.'
    },
    {
      icon: Clock,
      title: '₹0 Advance Token Booking',
      desc: 'Reserve confirmed OPD queue numbers with zero prepayment. Pay directly at the clinic.'
    },
    {
      icon: Activity,
      title: '30-Min Local Medicine Dispatch',
      desc: 'Rapid doorstep fulfillment from your trusted neighborhood chemist network.'
    }
  ]

  const specialistLinks = [
    { label: 'General Physician', to: '/care' },
    { label: 'Pediatrician (Child Care)', to: '/care' },
    { label: 'Gynecologist & Obstetrics', to: '/care' },
    { label: 'Dermatologist (Skin & Hair)', to: '/care' },
    { label: 'Orthopedic & Joint Care', to: '/care' },
    { label: 'My Appointments & Tokens', to: '/care/my-appointments' }
  ]

  const pharmacyLinks = [
    { label: 'Order Medicines from Local Chemist', to: '/care/order-medicines' },
    { label: 'Upload Doctor Prescription (Rx)', to: '/care/order-medicines' },
    { label: 'Form 20/21 License Verification', to: '/terms' },
    { label: '30-Minute Neighborhood Delivery', to: '/care/order-medicines' },
    { label: 'Chemist Partner Portal', to: '/pharmacy' }
  ]

  const providerLinks = [
    { label: 'Doctor Workstation Portal', to: '/doctor' },
    { label: 'Chemist Management Desk', to: '/pharmacy' },
    { label: 'Register Your Clinic or Pharmacy', to: '/contact' },
    { label: 'Telemedicine Practice Guidelines', to: '/terms' },
    { label: 'Patient Grievance Redressal', to: '/help' }
  ]

  return (
    <footer className="bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800/80 pt-14 pb-28 md:pb-12 transition-colors duration-300 relative overflow-hidden">
      
      {/* Subtle background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[250px] bg-emerald-500/5 dark:bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        
        {/* 1. TOP TRUST BADGES GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-10 border-b border-slate-200 dark:border-slate-800/80">
          {trustFeatures.map((item, idx) => {
            const Icon = item.icon
            return (
              <div 
                key={idx}
                className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 flex items-start gap-3.5 hover:border-emerald-500/40 dark:hover:border-emerald-500/30 transition-all shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/70 dark:border-emerald-500/20">
                  <Icon size={18} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-display font-black text-sm text-slate-900 dark:text-white">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                    {item.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* 2. EMERGENCY MEDICAL ADVISORY NOTICE */}
        <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-500/10 border border-amber-200/90 dark:border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 text-xs font-sans shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <p>
              <strong className="font-bold text-amber-800 dark:text-amber-300">Emergency Medical Advisory:</strong> In case of severe trauma, chest pain, stroke symptoms, or acute medical emergencies, please immediately call <span className="underline font-bold text-amber-950 dark:text-amber-100">108</span> or visit the nearest hospital emergency department.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono font-bold text-xs border border-amber-300/80 dark:border-amber-500/30">
              Ambulance: 108
            </span>
          </div>
        </div>

        {/* 3. MAIN NAVIGATION COLUMNS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 text-left">
          
          {/* Brand & Purpose (2 Columns Wide on Desktop) */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/care" className="inline-flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Stethoscope size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black text-xl tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                  Ozo<span className="text-emerald-600 dark:text-emerald-400">Care</span>
                </span>
                <span className="text-[10px] font-sans font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest -mt-1">
                  Healthcare & Pharmacy Network
                </span>
              </div>
            </Link>

            <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed max-w-sm">
              Connecting verified patients in Patna with NMC-registered doctors for confirmed OPD queue tokens and 30-minute authentic medicine delivery from licensed neighborhood chemists.
            </p>

            {/* Helpline & Location Info */}
            <div className="space-y-2 pt-2 text-xs font-sans text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Patna Central & Greater Bihar Region</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Care Support: <strong className="text-slate-800 dark:text-slate-200">+91 91220 91220</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>care@ozofast.com</span>
              </div>
            </div>
          </div>

          {/* Column 2: Consult Specialists */}
          <div className="space-y-3">
            <h5 className="font-display font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Stethoscope size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span>OPD & Specialists</span>
            </h5>
            <ul className="space-y-2 text-xs font-sans">
              {specialistLinks.map((link, i) => (
                <li key={i}>
                  <Link 
                    to={link.to} 
                    className="text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-emerald-600 dark:group-hover:bg-emerald-400 transition-colors" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Local Pharmacy */}
          <div className="space-y-3">
            <h5 className="font-display font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Pill size={13} className="text-teal-600 dark:text-teal-400" />
              <span>Pharmacy & Rx</span>
            </h5>
            <ul className="space-y-2 text-xs font-sans">
              {pharmacyLinks.map((link, i) => (
                <li key={i}>
                  <Link 
                    to={link.to} 
                    className="text-slate-600 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 transition-colors flex items-center gap-1.5 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-teal-600 dark:group-hover:bg-teal-400 transition-colors" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Portals & Compliance */}
          <div className="space-y-3">
            <h5 className="font-display font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-sky-600 dark:text-sky-400" />
              <span>Healthcare Portals</span>
            </h5>
            <ul className="space-y-2 text-xs font-sans">
              {providerLinks.map((link, i) => (
                <li key={i}>
                  <Link 
                    to={link.to} 
                    className="text-slate-600 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition-colors flex items-center gap-1.5 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-sky-600 dark:group-hover:bg-sky-400 transition-colors" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 4. STATUTORY IT ACT 2000 SECTION 79 REGULATORY INTERMEDIARY DISCLOSURE */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-left space-y-2 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">⚖️</span>
            <span className="font-display font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Statutory Intermediary Status • Information Technology Act, 2000 (Section 79)
            </span>
          </div>
          <p className="text-[11px] font-sans text-slate-600 dark:text-slate-400 leading-relaxed">
            Ozo operates strictly as a digital technology intermediary platform under Section 79 of the Information Technology Act, 2000, read with the Telemedicine Practice Guidelines, 2020 and the Drugs and Cosmetics Act, 1940. Ozo does not practice medicine, provide medical advice, diagnosis, or triage, nor does it independently dispense, stock, or sell pharmaceutical formulations. All medical consultations, clinical examinations, prescriptions, and advice are rendered independently by autonomous, registered medical practitioners (NMC/State Medical Council certified). All medicines and medical supplies are fulfilled, billed, and dispatched directly by independent, licensed retail pharmacies holding valid Form 20 and Form 21 licenses.
          </p>
        </div>

        {/* 5. BOTTOM BAR: COPYRIGHT & POLICIES */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-slate-500 dark:text-slate-500">
          <p>
            © {currentYear} OzoCare Technologies. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <Link to="/privacy" className="hover:text-slate-800 dark:hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-slate-800 dark:hover:text-slate-300 transition-colors">Terms of Healthcare Service</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-slate-800 dark:hover:text-slate-300 transition-colors">Doctor Code of Conduct</Link>
            <span>•</span>
            <Link to="/help" className="hover:text-slate-800 dark:hover:text-slate-300 transition-colors">Grievance Officer</Link>
          </div>
        </div>

      </div>
    </footer>
  )
}
