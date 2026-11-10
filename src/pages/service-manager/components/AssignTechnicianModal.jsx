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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl text-left">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10">
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              Assign Field Technician
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Job #{booking.booking_number || booking.id?.slice(0, 8)} • {booking.service_title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="py-4 space-y-2.5 max-h-[360px] overflow-y-auto">
          {technicians.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="w-8 h-8 text-gray-300 dark:text-white/20 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-500">No technicians added yet</p>
              <p className="text-xs text-gray-400 mt-1">Add technicians from the Technicians tab first.</p>
            </div>
          ) : (
            technicians.map((tech) => {
              const isSelected = selectedTechId === tech.id
              const isAvailable = tech.duty_status === 'available'

              return (
                <div
                  key={tech.id}
                  onClick={() => setSelectedTechId(tech.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white font-black flex items-center justify-center text-sm">
                      {tech.full_name?.charAt(0) || 'T'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-900 dark:text-white">
                          {tech.full_name}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isAvailable
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {tech.duty_status || 'available'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                          <Star size={11} fill="currentColor" /> {tech.rating || 5.0}
                        </span>
                        <span>•</span>
                        <span className="font-mono">{tech.phone}</span>
                      </div>

                      {/* Skills badges */}
                      {tech.skills && tech.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {tech.skills.slice(0, 3).map((skill, idx) => (
                            <span 
                              key={idx} 
                              className="text-[9px] font-bold bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded"
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
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!selectedTechId || isSubmitting}
            onClick={handleConfirm}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black tracking-wide shadow-md transition-all flex items-center gap-1.5"
          >
            <UserCheck size={14} />
            <span>{isSubmitting ? 'Assigning...' : 'Confirm Assignment'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
