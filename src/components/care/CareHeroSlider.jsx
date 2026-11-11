import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  Pill, 
  Stethoscope, 
  ArrowRight, 
  Sparkles,
  CheckCircle2,
  Activity
} from 'lucide-react'

const SLIDES = [
  {
    id: 1,
    image: '/images/care/care_doctor_consultation.jpg',
    tag: 'Live OPD Queue Active',
    tagColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    title: 'Consult Verified Specialists',
    subtitle: 'Book OPD Tokens in Patna with Zero Advance Fee',
    highlight: 'Est. Wait < 10 mins • Pay at Clinic',
    ctaText: 'Book OPD Token',
    ctaLink: '/care',
    badgeIcon: Stethoscope
  },
  {
    id: 2,
    image: '/images/care/care_pharmacy_delivery.jpg',
    tag: '30-Min Medicine Delivery',
    tagColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    title: 'Local Chemist Network',
    subtitle: 'Genuine Medicines with Form 20/21 License Guarantee',
    highlight: '100% Genuine Batch & Bill • Fast Delivery',
    ctaText: 'Order Medicines',
    ctaLink: '/care/order-medicines',
    badgeIcon: Pill
  },
  {
    id: 3,
    image: '/images/care/care_abstract_medicine.jpg',
    tag: '100% Genuine Formulations',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    title: 'Lab-Tested & Verified Rx',
    subtitle: 'Strict Quality Checks from Licensed Neighborhood Pharmacies',
    highlight: 'Form 20/21 Certified • Zero Counterfeits',
    ctaText: 'Explore Medicines',
    ctaLink: '/care/order-medicines',
    badgeIcon: Sparkles
  },
  {
    id: 4,
    image: '/images/care/care_medicine_express.jpg',
    tag: 'Digital Rx & Teleconsult',
    tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    title: 'Instant e-Prescriptions',
    subtitle: 'Live Queue Tracking & 1-Click Medicine Reordering',
    highlight: 'Free 5-Day Follow-Up Included',
    ctaText: 'View My Tokens',
    ctaLink: '/care/my-appointments',
    badgeIcon: Activity
  }
]

export default function CareHeroSlider() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const navigate = useNavigate()

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % SLIDES.length)
  }, [])

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)
  }, [])

  // Auto-advance timer (every 4.5 seconds when not hovered)
  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(() => {
      nextSlide()
    }, 4500)
    return () => clearInterval(timer)
  }, [nextSlide, isPaused])

  const currentSlide = SLIDES[currentIndex]
  const BadgeIcon = currentSlide.badgeIcon

  return (
    <div 
      className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-gray-200/90 dark:border-white/10 bg-slate-900 group select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* 16:9 Aspect Ratio Container */}
      <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden">
        
        {/* Animated Background Slides */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute inset-0 w-full h-full"
          >
            <img 
              src={currentSlide.image} 
              alt={currentSlide.title}
              className="w-full h-full object-cover object-center"
            />
            {/* Cinematic Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c1015] via-[#0c1015]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c1015]/80 via-[#0c1015]/30 to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Top Tag Pill */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-display font-black uppercase tracking-wider backdrop-blur-md border ${currentSlide.tagColor}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <BadgeIcon size={12} />
            <span>{currentSlide.tag}</span>
          </span>
        </div>

        {/* Slide Counter on Top Right */}
        <div className="absolute top-4 right-4 z-20 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-[10px] font-mono text-white/80 border border-white/10">
          0{currentIndex + 1} / 0{SLIDES.length}
        </div>

        {/* Overlay Content at Bottom of Slide */}
        <div className="absolute inset-x-0 bottom-0 z-20 p-5 sm:p-6 space-y-2.5 text-left">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="space-y-1.5"
            >
              <h3 className="text-xl sm:text-2xl font-display font-black text-white leading-tight drop-shadow-md">
                {currentSlide.title}
              </h3>
              
              <p className="text-xs sm:text-sm text-slate-200 font-sans font-medium line-clamp-1 drop-shadow">
                {currentSlide.subtitle}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-[11px] font-sans font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span>{currentSlide.highlight}</span>
                </span>

                <button
                  onClick={() => navigate(currentSlide.ctaLink)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition-all active:scale-95 shrink-0"
                >
                  <span>{currentSlide.ctaText}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Arrows (Visible on Group Hover) */}
        <button
          onClick={prevSlide}
          aria-label="Previous Slide"
          className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center border border-white/15 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
        >
          <ChevronLeft size={18} />
        </button>

        <button
          onClick={nextSlide}
          aria-label="Next Slide"
          className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center border border-white/15 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Bottom Progress Navigation Bar */}
      <div className="bg-[#0c1015] px-5 py-3 border-t border-white/10 flex items-center justify-between">
        
        {/* Pagination Dots */}
        <div className="flex items-center gap-2">
          {SLIDES.map((slide, idx) => {
            const isActive = idx === currentIndex
            return (
              <button
                key={slide.id}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full h-1.5 ${
                  isActive 
                    ? 'w-7 bg-emerald-500 shadow-sm shadow-emerald-500' 
                    : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
              />
            )
          })}
        </div>

        {/* Quick Info text */}
        <span className="text-[10px] font-sans text-slate-400">
          Auto-sliding • Swipe or hover to pause
        </span>
      </div>
    </div>
  )
}
