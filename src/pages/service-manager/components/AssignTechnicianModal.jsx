import React, { useState } from 'react'
import { X, Wrench, UserCheck, Phone, Star, ShieldCheck } from 'lucide-react'

export default function AssignTechnicianModal({ 
  isOpen, 
  onClose, 
  booking, 
  technicians = [], 
  onAssign 
}) {
  const [selectedTechId, setSelectedTechId] = useState(booking?.technician_id || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !booking) return null

  const handleConfirm = async () => {
    if (!selectedTechId) return
    setIsSubmitting(true)
    try {
      await onAssign(booking.id, selectedTechId)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/15 rounded-3xl p-7 sm:p-8 w-full max-w-xl shadow-2xl text-left">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              Assign Field Technician
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Job #{booking.booking_number || booking.id?.slice(0, 8)} • {booking.service_title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="py-5 space-y-3 max-h-[420px] overflow-y-auto">
          {technicians.length === 0 ? (
            <div className="text-center py-10">
              <Wrench className="w-10 h-10 text-gray-300 dark:text-white/20 mx-auto mb-3" />
              <p className="text-base font-bold text-gray-500">No technicians added yet</p>
              <p className="text-sm text-gray-400 mt-1">Add technicians from the Field Technicians tab first.</p>
            </div>
          ) : (
            technicians.map((tech) => {
              const isSelected = selectedTechId === tech.id
              const isAvailable = tech.duty_status === 'available'

              return (
                <div
                  key={tech.id}
                  onClick={() => setSelectedTechId(tech.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 shadow-sm'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white font-black flex items-center justify-center text-base flex-shrink-0 shadow-sm">
                      {tech.full_name?.charAt(0) || 'T'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-gray-900 dark:text-white">
                          {tech.full_name}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isAvailable
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {tech.duty_status || 'available'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star size={12} fill="currentColor" /> {tech.rating || 5.0}
                        </span>
                        <span>•</span>
                        <span className="font-mono">{tech.phone}</span>
                      </div>

                      {/* Skills badges */}
                      {tech.skills && tech.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {tech.skills.slice(0, 3).map((skill, idx) => (
                            <span 
                              key={idx} 
                              className="text-[10px] font-bold bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-md"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <input
                    type="radio"
                    name="techSelect"
                    checked={isSelected}
                    onChange={() => setSelectedTechId(tech.id)}
                    className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-100 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 text-sm font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!selectedTechId || isSubmitting}
            onClick={handleConfirm}
            className="px-7 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl text-sm font-black tracking-wide shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 active:scale-[0.98]"
          >
            <UserCheck size={16} />
            <span>{isSubmitting ? 'Assigning...' : 'Confirm Assignment'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
