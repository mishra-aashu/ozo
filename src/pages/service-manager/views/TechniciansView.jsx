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
    <div className="space-y-6 text-left">
      
      {/* Top Banner & Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-500/10 via-sky-500/10 to-teal-500/10 border border-indigo-500/20 rounded-3xl p-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full">
            Field Force Crew
          </span>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mt-1">
            Service Technicians & Field Staff
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Manage your verified technicians, monitor real-time availability & assign jobs.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black tracking-wide shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
        >
          <UserPlus size={16} />
          <span>Add New Technician</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by technician name, phone, or skill..."
          className="w-full bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        />
      </div>

      {/* Technicians Grid */}
      {filteredTechnicians.length === 0 ? (
        <div className="bg-white/60 dark:bg-[#1a1a1a]/60 backdrop-blur-md border border-dashed border-gray-200 dark:border-white/10 rounded-3xl p-12 text-center">
          <Wrench className="w-12 h-12 text-gray-300 dark:text-white/20 mx-auto mb-3" />
          <h3 className="text-base font-black text-gray-800 dark:text-gray-200">
            No Technicians Registered
          </h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto mb-4">
            Add technicians to your service agency roster to start dispatching them to incoming doorstep visits.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md"
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
                className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white font-black text-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                        {tech.full_name?.charAt(0) || 'T'}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900 dark:text-white">
                          {tech.full_name}
                        </h4>
                        <a 
                          href={`tel:${tech.phone}`} 
                          className="text-xs font-mono font-bold text-gray-500 hover:text-indigo-500 flex items-center gap-1 mt-0.5"
                        >
                          <Phone size={11} className="text-emerald-500" />
                          <span>{tech.phone}</span>
                        </a>
                      </div>
                    </div>

                    <button
                      onClick={() => onDeleteTechnician(tech.id)}
                      className="p-1.5 text-gray-300 hover:text-rose-500 rounded-lg transition-colors"
                      title="Remove Technician"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Rating & Completed Jobs */}
                  <div className="flex items-center gap-4 py-2 px-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 text-xs font-bold text-gray-600 dark:text-gray-300 mb-3">
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star size={13} fill="currentColor" />
                      <span>{tech.rating || 5.0}</span>
                    </div>
                    <span>•</span>
                    <div>
                      <span className="text-gray-400">Jobs: </span>
                      <span className="font-mono text-gray-800 dark:text-gray-200">{tech.total_jobs_completed || 0}</span>
                    </div>
                  </div>

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(tech.skills || []).map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg border border-indigo-200/40 dark:border-indigo-800/40"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Duty Status Switcher */}
                <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-black uppercase text-gray-400">Duty Status</span>
                  <select
                    value={tech.duty_status || 'available'}
                    onChange={(e) => onUpdateStatus(tech.id, e.target.value)}
                    className="bg-gray-100 dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-xl px-2.5 py-1 text-xs font-black text-gray-800 dark:text-gray-200 focus:outline-none"
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
