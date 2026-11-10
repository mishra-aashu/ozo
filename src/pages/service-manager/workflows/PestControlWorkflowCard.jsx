import React, { useState } from 'react'
import { Bug, ShieldCheck, Calendar, AlertCircle } from 'lucide-react'

export default function PestControlWorkflowCard({ booking, onUpdateData, isReadOnly = false }) {
  const existingData = booking?.service_specific_data?.pestControl || {}

  const [pestType, setPestType] = useState(existingData.pestType || 'Cockroach & Ants')
  const [treatmentMethod, setTreatmentMethod] = useState(existingData.treatmentMethod || 'Odorless Herbal Gel Baiting')
  const [chemicalBatch, setChemicalBatch] = useState(existingData.chemicalBatch || `CHM-${Math.floor(1000 + Math.random() * 9000)}`)
  const [warrantyDays, setWarrantyDays] = useState(existingData.warrantyDays || '90')
  const [gelAppliedKitchen, setGelAppliedKitchen] = useState(existingData.gelAppliedKitchen ?? true)
  const [safetyAdvisoryGiven, setSafetyAdvisoryGiven] = useState(existingData.safetyAdvisoryGiven ?? true)

  const handleSave = () => {
    if (onUpdateData) {
      onUpdateData({
        pestControl: {
          pestType,
          treatmentMethod,
          chemicalBatch,
          warrantyDays,
          gelAppliedKitchen,
          safetyAdvisoryGiven,
          savedAt: new Date().toISOString()
        }
      })
    }
  }

  return (
    <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-2xl p-4 sm:p-5 text-left transition-all">
      <div className="flex items-center gap-2 mb-3 text-rose-700 dark:text-rose-300">
        <Bug className="w-5 h-5 text-rose-500 animate-pulse" />
        <h4 className="font-black text-sm uppercase tracking-wider">Pest Elimination & Warranty Card</h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Target Pest</label>
          <select
            disabled={isReadOnly}
            value={pestType}
            onChange={(e) => setPestType(e.target.value)}
            className="w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200"
          >
            <option>Cockroach & Ants</option>
            <option>Termite (Deemak) Underground</option>
            <option>Bedbugs (Khatmal) 2-Cycle</option>
            <option>Rodents & Rats</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Treatment Method</label>
          <select
            disabled={isReadOnly}
            value={treatmentMethod}
            onChange={(e) => setTreatmentMethod(e.target.value)}
            className="w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200"
          >
            <option>Odorless Herbal Gel Baiting</option>
            <option>Bayer Permethrin Spray</option>
            <option>Wall Perimeter Drilling & Injection</option>
            <option>Thermal Cold Mist Fogging</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Warranty Period</label>
          <select
            disabled={isReadOnly}
            value={warrantyDays}
            onChange={(e) => setWarrantyDays(e.target.value)}
            className="w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200"
          >
            <option value="90">90 Days Warranty (Free Re-visit)</option>
            <option value="180">180 Days Extended Warranty</option>
            <option value="365">1 Year Annual Maintenance</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 bg-white/70 dark:bg-black/30 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={isReadOnly}
            checked={gelAppliedKitchen}
            onChange={(e) => setGelAppliedKitchen(e.target.checked)}
            className="rounded text-rose-600 focus:ring-rose-500"
          />
          <span>Gel Dots Applied to All Cabinets, Hinges & Drain Points</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={isReadOnly}
            checked={safetyAdvisoryGiven}
            onChange={(e) => setSafetyAdvisoryGiven(e.target.checked)}
            className="rounded text-rose-600 focus:ring-rose-500"
          />
          <span>Ventilation & Pet Safety Advisory Signed</span>
        </label>
      </div>

      {!isReadOnly && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black tracking-wide shadow-sm transition-all"
          >
            Save Pest Control Specs
          </button>
        </div>
      )}
    </div>
  )
}
