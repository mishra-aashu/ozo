import React, { useState } from 'react'
import { X, UserPlus, Wrench, Phone, Star } from 'lucide-react'

export default function AddTechnicianModal({ isOpen, onClose, onAddTechnician }) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedSkills, setSelectedSkills] = useState(['AC & Appliance'])
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const availableSkills = [
    'AC & Appliance',
    'Gas Charging R32/R410A',
    'Plumbing & Drainage',
    'Electrical & Breakers',
    'Deep Sanitization & Scrubbing',
    'Carpentry & Locks',
    'Pest Elimination'
  ]

  const toggleSkill = (skill) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill))
    } else {
      setSelectedSkills([...selectedSkills, skill])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fullName.trim() || !phone.trim()) return

    setIsSubmitting(true)
    try {
      await onAddTechnician({
        full_name: fullName.trim(),
        phone: phone.trim(),
        skills: selectedSkills,
        avatar_url: avatarUrl.trim() || null
      })
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl text-left">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-500" />
              <span>Onboard New Field Technician</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Add a verified technician to your crew roster</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Technician Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Kumar"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full mt-1.5 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Contact Phone Number *
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full mt-1.5 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 block">
              Trade Specializations & Skills
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableSkills.map((skill) => {
                const isSelected = selectedSkills.includes(skill)
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-gray-300'
                    }`}
                  >
                    {skill}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !fullName.trim() || !phone.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black tracking-wide shadow-md transition-all"
            >
              {isSubmitting ? 'Adding...' : 'Add Technician'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
