import React, { useState } from 'react'
import { Hammer, Ruler, CheckCircle2, ShieldCheck } from 'lucide-react'

export default function CarpentryWorkflowCard({ booking, onUpdateData, isReadOnly = false }) {
  const existingData = booking?.service_specific_data?.carpentry || {}

  const [furnitureItem, setFurnitureItem] = useState(existingData.furnitureItem || 'Wardrobe Door')
  const [materialType, setMaterialType] = useState(existingData.materialType || 'Plywood (BWP 710)')
  const [hardwareType, setHardwareType] = useState(existingData.hardwareType || 'Hydraulic Soft-Close Hinge')
  const [screwsTightened, setScrewsTightened] = useState(existingData.screwsTightened ?? true)
  const [hingeAligned, setHingeAligned] = useState(existingData.hingeAligned ?? true)
  const [smoothMovementTested, setSmoothMovementTested] = useState(existingData.smoothMovementTested ?? true)

  const handleSave = () => {
    if (onUpdateData) {
      onUpdateData({
        carpentry: {
          furnitureItem,
          materialType,
          hardwareType,
          screwsTightened,
          hingeAligned,
          smoothMovementTested,
          savedAt: new Date().toISOString()
        }
      })
    }
  }

  return (
    <div className="bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 rounded-2xl p-4 sm:p-5 text-left transition-all">
      <div className="flex items-center gap-2 mb-3 text-orange-700 dark:text-orange-300">
        <Hammer className="w-5 h-5 text-orange-500" />
        <h4 className="font-black text-sm uppercase tracking-wider">Carpentry & Hardware Specs</h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Furniture / Fixture</label>
          <select
            disabled={isReadOnly}
            value={furnitureItem}
            onChange={(e) => setFurnitureItem(e.target.value)}
            className="w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200"
          >
            <option>Wardrobe Door / Hinge</option>
            <option>Main Door Lock / Handle</option>
            <option>Bed Hydraulic Storage</option>
            <option>Modular Kitchen Drawer Channel</option>
            <option>IKEA / Flatpack Assembly</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Wood Material</label>
          <select
            disabled={isReadOnly}
            value={materialType}
            onChange={(e) => setMaterialType(e.target.value)}
            className="w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200"
          >
            <option>Plywood (BWP 710 Marine Grade)</option>
            <option>MDF / Pre-laminated Particle Board</option>
            <option>Solid Teak / Sheesham Wood</option>
            <option>PVC / WPC Waterproof Board</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Hardware Fitting</label>
          <select
            disabled={isReadOnly}
            value={hardwareType}
            onChange={(e) => setHardwareType(e.target.value)}
            className="w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200"
          >
            <option>Hydraulic Soft-Close Hinges</option>
            <option>Telescopic Ball Bearing Channels</option>
            <option>Mortise Cylinder Lock & Keys</option>
            <option>Gas Spring Pump (150N/200N)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 bg-white/70 dark:bg-black/30 p-3 rounded-xl border border-orange-100 dark:border-orange-900/30">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={isReadOnly}
            checked={hingeAligned}
            onChange={(e) => setHingeAligned(e.target.checked)}
            className="rounded text-orange-600 focus:ring-orange-500"
          />
          <span>Perfect Door Alignment & Zero Sag</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={isReadOnly}
            checked={smoothMovementTested}
            onChange={(e) => setSmoothMovementTested(e.target.checked)}
            className="rounded text-orange-600 focus:ring-orange-500"
          />
          <span>Smooth Glide & Latch Lock Test Passed</span>
        </label>
      </div>

      {!isReadOnly && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black tracking-wide shadow-sm transition-all"
          >
            Save Carpentry Specs
          </button>
        </div>
      )}
    </div>
  )
}
