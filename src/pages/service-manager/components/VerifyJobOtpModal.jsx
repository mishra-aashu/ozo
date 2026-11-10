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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-left">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={20} />
            <h3 className="text-base font-black text-gray-900 dark:text-white">
              Customer Job OTP
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleVerify} className="py-4 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Please ask the customer for the verification code sent to their phone to guarantee completion of <span className="font-bold text-gray-800 dark:text-gray-200">{booking.service_title}</span>.
          </p>

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-gray-400">
              Enter 4 or 6 Digit OTP
            </label>
            <div className="relative mt-1.5">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                autoFocus
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="e.g. 1234"
                className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl py-3 pl-10 pr-4 text-center tracking-[0.5em] text-lg font-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-1">Default demo code: 1234</p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!otp || isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={14} />
              <span>{isSubmitting ? 'Verifying...' : 'Complete Job'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
