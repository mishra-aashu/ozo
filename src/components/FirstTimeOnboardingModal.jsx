import React from 'react'
import { ShoppingBag, Wrench, Sparkles, Check } from 'lucide-react'
import { useServiceModeStore } from '../stores/serviceModeStore'
import { useNavigate } from 'react-router-dom'

export default function FirstTimeOnboardingModal({ isOpen, onClose }) {
  const { setMode, setHasSeenOnboarding } = useServiceModeStore()
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleChoose = (mode) => {
    setMode(mode)
    setHasSeenOnboarding(true)
    if (onClose) onClose()
    if (mode === 'mart') {
      navigate('/')
    } else {
      navigate('/services')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-white/10 text-center relative overflow-hidden">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Sparkles size={24} />
        </div>

        <h2 className="text-2xl font-black text-gray-900 dark:text-white">
          Aapko aaj kya chahiye?
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 mb-8 max-w-md mx-auto">
          OZO platform par aap grocery mangwa sakte hain ya apne ghar ke liye verified doorstep technicians book kar sakte hain.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Card 1: OZO Mart */}
          <button
            type="button"
            onClick={() => handleChoose('mart')}
            className="group relative p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/5 dark:from-amber-500/20 dark:to-orange-500/10 border-2 border-amber-500/30 rounded-2xl hover:scale-105 transition-all duration-200 text-left flex flex-col items-center justify-between"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform">
              <ShoppingBag size={28} />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-gray-900 dark:text-white">OZO Mart</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Grocery, Fresh Vegetables, Fruits & Daily Essentials
              </p>
            </div>

            <span className="mt-5 px-4 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-full shadow-sm">
              Explore Mart &rarr;
            </span>
          </button>

          {/* Card 2: OZO Services */}
          <button
            type="button"
            onClick={() => handleChoose('services')}
            className="group relative p-6 bg-gradient-to-br from-sky-500/10 to-blue-500/5 dark:from-sky-500/20 dark:to-blue-500/10 border-2 border-sky-500/30 rounded-2xl hover:scale-105 transition-all duration-200 text-left flex flex-col items-center justify-between"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform">
              <Wrench size={28} />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-gray-900 dark:text-white">OZO Services</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Plumber, Electrician, AC Repair & Home Experts
              </p>
            </div>

            <span className="mt-5 px-4 py-1.5 bg-sky-500 text-white text-xs font-bold rounded-full shadow-sm">
              Book Services &rarr;
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleChoose('mart')}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline font-semibold"
        >
          Skip for now (default to OZO Mart)
        </button>
      </div>
    </div>
  )
}
