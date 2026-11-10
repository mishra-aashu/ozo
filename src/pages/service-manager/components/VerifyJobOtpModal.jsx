import React, { useState } from 'react'
import { X, ShieldCheck, CheckCircle2, KeyRound } from 'lucide-react'

export default function VerifyJobOtpModal({ isOpen, onClose, booking, onVerify }) {
  const [otp, setOtp] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !booking) return null

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!otp.trim()) return

    setIsSubmitting(true)
    try {
      const success = await onVerify(booking.id, otp.trim())
      if (success) {
        onClose()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/15 rounded-3xl p-7 sm:p-8 w-full max-w-md shadow-2xl text-left">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={24} />
            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              Customer Job OTP
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleVerify} className="py-5 space-y-5">
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Please ask the customer for the verification code sent to their phone to guarantee completion of <span className="font-bold text-gray-800 dark:text-gray-200">{booking.service_title}</span>.
          </p>

          <div>
            <label className="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 block mb-2">
              Enter 4 or 6 Digit OTP
            </label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                autoFocus
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/15 rounded-2xl py-4 pl-12 pr-4 text-center tracking-[0.4em] text-2xl font-black font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">Default demo code: 1234</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!otp || isSubmitting}
              className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-black shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? 'Verifying...' : 'Complete Job'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
