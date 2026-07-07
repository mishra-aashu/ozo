import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Are you sure?', 
  message = 'Do you really want to perform this action? This cannot be undone.', 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  isDanger = true,
  isLoading = false
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
            className="relative w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-2xl p-6 overflow-hidden z-10"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={isLoading}
              className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              {/* Warning Icon Banner */}
              <div className={`p-4 rounded-2xl mb-4 ${
                isDanger 
                  ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-500' 
                  : 'bg-amber-50 dark:bg-amber-950/20 text-amber-500'
              }`}>
                <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-black text-gray-900 dark:text-white font-sans">
                {title}
              </h3>

              {/* Message */}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2.5 px-2 leading-relaxed font-sans">
                {message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-5 py-3 rounded-2xl font-bold text-sm border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1a1a1a] hover:bg-gray-50 dark:hover:bg-white/5 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 px-5 py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
                  isDanger 
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-650 hover:to-rose-700 shadow-red-500/10' 
                    : 'bg-gradient-to-r from-amber-500 to-orange-650 hover:from-amber-650 hover:to-orange-700 shadow-amber-500/10'
                }`}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default ConfirmModal
