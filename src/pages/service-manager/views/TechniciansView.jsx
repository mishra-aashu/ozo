import React, { useState } from 'react'
import { 
  UserPlus, 
  Wrench, 
  Phone, 
  Star, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ShieldCheck,
  Search
} from 'lucide-react'
import AddTechnicianModal from '../components/AddTechnicianModal'

export default function TechniciansView({
  technicians = [],
  isLoading = false,
  onAddTechnician,
  onUpdateStatus,
  onDeleteTechnician
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTechnicians = technicians.filter(tech => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (tech.full_name || '').toLowerCase().includes(q) ||
      (tech.phone || '').includes(q) ||
      (tech.skills || []).some(s => s.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-7 text-left">
      
      {/* Top Banner & Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 border border-amber-500/20 rounded-3xl p-7 sm:p-8">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full">
            Field Force Crew
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-2">
            Service Technicians & Field Staff
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your verified technicians, monitor real-time availability & assign jobs.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-6 py-3.5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-2xl text-sm font-black tracking-wide shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2.5 active:scale-95 flex-shrink-0"
        >
          <UserPlus size={18} />
          <span>Add New Technician</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by technician name, phone, or skill..."
          className="w-full bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
        />
      </div>

      {/* Technicians Grid */}
      {filteredTechnicians.length === 0 ? (
        <div className="bg-white/60 dark:bg-[#1a1a1a]/60 backdrop-blur-md border border-dashed border-gray-200 dark:border-white/10 rounded-3xl p-16 text-center">
          <Wrench className="w-16 h-16 text-gray-300 dark:text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-black text-gray-800 dark:text-gray-200">
            No Technicians Registered
          </h3>
          <p className="text-sm text-gray-400 mt-1.5 max-w-md mx-auto mb-6">
            Add technicians to your service agency roster to start dispatching them to incoming doorstep visits.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-amber-500/25 transition-all"
          >
            Add First Technician
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTechnicians.map((tech) => {
            return (
              <div
                key={tech.id}
                className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                        {tech.full_name?.charAt(0) || 'T'}
                      </div>
                      <div>
                        <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                          {tech.full_name}
                        </h4>
                        <a 
                          href={`tel:${tech.phone}`} 
                          className="text-sm font-mono font-bold text-gray-500 dark:text-gray-400 hover:text-amber-500 flex items-center gap-1.5 mt-0.5"
                        >
                          <Phone size={13} className="text-emerald-500" />
                          <span>{tech.phone}</span>
                        </a>
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteTechnician(tech.id)}
                      className="p-2 text-gray-300 hover:text-rose-500 rounded-xl transition-colors"
                      title="Remove Technician"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  {/* Rating & Completed Jobs */}
                  <div className="flex items-center gap-4 py-2.5 px-3.5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-3.5">
                    <div className="flex items-center gap-1.5 text-amber-500 font-extrabold">
                      <Star size={15} fill="currentColor" />
                      <span>{tech.rating || 5.0}</span>
                    </div>
                    <span>•</span>
                    <div>
                      <span className="text-gray-400 font-medium">Jobs: </span>
                      <span className="font-mono text-gray-900 dark:text-white font-black">{tech.total_jobs_completed || 0}</span>
                    </div>
                  </div>

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(tech.skills || []).map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-xl border border-amber-200/40 dark:border-amber-800/40"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Duty Status Switcher */}
                <div className="pt-3.5 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-400">Duty Status</span>
                  <select
                    value={tech.duty_status || 'available'}
                    onChange={(e) => onUpdateStatus(tech.id, e.target.value)}
                    className="bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-black text-gray-800 dark:text-gray-200 focus:outline-none"
                  >
                    <option value="available">🟢 Available</option>
                    <option value="assigned">🟡 Assigned</option>
                    <option value="on_job">🔵 On Job</option>
                    <option value="offline">⚪ Offline</option>
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Technician Modal */}
      <AddTechnicianModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddTechnician={onAddTechnician}
      />
    </div>
  )
}
