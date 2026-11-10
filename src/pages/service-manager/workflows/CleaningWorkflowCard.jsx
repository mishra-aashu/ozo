import React, { useState } from 'react'
import { Sparkles, Home, ShieldCheck, CheckSquare, Camera } from 'lucide-react'

export default function CleaningWorkflowCard({ booking, onUpdateData, isReadOnly = false }) {
  const existingData = booking?.service_specific_data?.cleaning || {}

  const [propertyType, setPropertyType] = useState(existingData.propertyType || '2 BHK')
  const [areaSqFt, setAreaSqFt] = useState(existingData.areaSqFt || '950')
  const [furnishingState, setFurnishingState] = useState(existingData.furnishingState || 'Furnished')
  const [bathroomCount, setBathroomCount] = useState(existingData.bathroomCount || '2')
  const [rotaryMachineScrubbing, setRotaryMachineScrubbing] = useState(existingData.rotaryMachineScrubbing ?? true)
  const [kitchenDegreasing, setKitchenDegreasing] = useState(existingData.kitchenDegreasing ?? true)
  const [sofaShampooVacuum, setSofaShampooVacuum] = useState(existingData.sofaShampooVacuum ?? false)
  const [acidFreeChemicals, setAcidFreeChemicals] = useState(existingData.acidFreeChemicals ?? true)

  const handleSave = () => {
    if (onUpdateData) {
      onUpdateData({
        cleaning: {
          propertyType,
          areaSqFt,
          furnishingState,
          bathroomCount,
          rotaryMachineScrubbing,
          kitchenDegreasing,
          sofaShampooVacuum,
          acidFreeChemicals,
          savedAt: new Date().toISOString()
        }
      })
    }
  }

  return (
    <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4 sm:p-5 text-left transition-all">
      <div className="flex items-center gap-2 mb-3 text-emerald-700 dark:text-emerald-300">
        <Sparkles className="w-5 h-5 text-emerald-500 animate-spin" style={{ animationDuration: '6s' }} />
        <h4 className="font-black text-sm uppercase tracking-wider">Deep Sanitization & Cleaning Specs</h4>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Property Type</label>
          <select
            disabled={isReadOnly}
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200"
          >
            <option>1 BHK Flat</option>
            <option>2 BHK Flat</option>
            <option>3 BHK Flat</option>
            <option>4 BHK / Villa</option>
            <option>Commercial Office</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Area (Sq Ft)</label>
          <input
            type="number"
            disabled={isReadOnly}
            value={areaSqFt}
            onChange={(e) => setAreaSqFt(e.target.value)}
            className="w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Occupancy</label>
          <select
            disabled={isReadOnly}
            value={furnishingState}
            onChange={(e) => setFurnishingState(e.target.value)}
            className="w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200"
          >
            <option>Furnished Living</option>
            <option>Vacant / Move-in</option>
            <option>Post-Renovation</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Bathrooms</label>
          <select
            disabled={isReadOnly}
            value={bathroomCount}
            onChange={(e) => setBathroomCount(e.target.value)}
            className="w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200"
          >
            <option>1 Bathroom</option>
            <option>2 Bathrooms</option>
            <option>3 Bathrooms</option>
            <option>4+ Bathrooms</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 bg-white/70 dark:bg-black/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={isReadOnly}
            checked={rotaryMachineScrubbing}
            onChange={(e) => setRotaryMachineScrubbing(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-emerald-500"
          />
          <span>Industrial Floor Rotary Scrubbing Completed</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={isReadOnly}
            checked={kitchenDegreasing}
            onChange={(e) => setKitchenDegreasing(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-emerald-500"
          />
          <span>Kitchen Oil Degreasing & Grout Scrubbing</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={isReadOnly}
            checked={acidFreeChemicals}
            onChange={(e) => setAcidFreeChemicals(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-emerald-500"
          />
          <span>Safe Acid-Free & Pet-Safe Solutions Used</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={isReadOnly}
            checked={sofaShampooVacuum}
            onChange={(e) => setSofaShampooVacuum(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-emerald-500"
          />
          <span>Fabric Sofa & Carpet Extraction Shampoo Done</span>
        </label>
      </div>

      {!isReadOnly && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black tracking-wide shadow-sm transition-all"
          >
            Save Cleaning Specs
          </button>
        </div>
      )}
    </div>
  )
}
