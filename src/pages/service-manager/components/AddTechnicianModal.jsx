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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/15 rounded-3xl p-7 sm:p-9 w-full max-w-xl shadow-2xl text-left">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
              <UserPlus className="w-6 h-6 text-indigo-500" />
              <span>Onboard New Field Technician</span>
            </h3>
            <p className="text-sm text-gray-400 mt-1">Add a verified technician to your doorstep crew roster</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-6 space-y-6">
          <div>
            <label className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-200">
              Technician Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Kumar"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full mt-2 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/15 rounded-2xl px-5 py-4 text-base font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
            />
          </div>

          <div>
            <label className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-200">
              Contact Phone Number *
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full mt-2 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/15 rounded-2xl px-5 py-4 text-base font-bold text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
            />
          </div>

          <div>
            <label className="text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-200 mb-3 block">
              Trade Specializations & Skills
            </label>
            <div className="flex flex-wrap gap-2.5">
              {availableSkills.map((skill) => {
                const isSelected = selectedSkills.includes(skill)
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/20'
                    }`}
                  >
                    {skill}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-5 border-t border-gray-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3.5 text-base font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !fullName.trim() || !phone.trim()}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl text-base font-black tracking-wide shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98]"
            >
              {isSubmitting ? 'Adding...' : 'Add Technician'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
