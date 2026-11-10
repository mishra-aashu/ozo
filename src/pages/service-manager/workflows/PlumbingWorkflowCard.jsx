import React, { useState } from 'react'
import { Droplets, Wrench, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react'

export default function PlumbingWorkflowCard({ booking, onUpdateData, isReadOnly = false }) {
  const existingData = booking?.service_specific_data?.plumbing || {}

  const [fixtureArea, setFixtureArea] = useState(existingData.fixtureArea || 'Bathroom')
  const [leakType, setLeakType] = useState(existingData.leakType || 'Tap Drip / Washer')
  const [pipeStandard, setPipeStandard] = useState(existingData.pipeStandard || 'CPVC 0.75 inch')
  const [pressureBar, setPressureBar] = useState(existingData.pressureBar || '2.5')
  const [cartridgeReplaced, setCartridgeReplaced] = useState(existingData.cartridgeReplaced ?? false)
  const [blockageCleared, setBlockageCleared] = useState(existingData.blockageCleared ?? true)
  const [waterLeakTested, setWaterLeakTested] = useState(existingData.waterLeakTested ?? true)
  const [notes, setNotes] = useState(existingData.notes || '')

  const handleSave = () => {
    if (onUpdateData) {
      onUpdateData({
        plumbing: {
          fixtureArea,
          leakType,
          pipeStandard,
          pressureBar,
          cartridgeReplaced,
          blockageCleared,
          waterLeakTested,
          notes,
          savedAt: new Date().toISOString()
        }
      })
    }
  }

  return (
    <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl p-4 sm:p-5 text-left transition-all">
      <div className="flex items-center gap-2 mb-3 text-blue-700 dark:text-blue-300">
        <Droplets className="w-5 h-5 text-blue-500 animate-bounce" />
        <h4 className="font-black text-sm uppercase tracking-wider">Plumbing Diagnostic & Fixtures</h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Work Location</label>
          <select
            disabled={isReadOnly}
            value={fixtureArea}
            onChange={(e) => setFixtureArea(e.target.value)}
            className="w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200"
          >
            <option>Bathroom Fixtures</option>
            <option>Kitchen Sink & RO Line</option>
            <option>Overhead Water Tank</option>
            <option>Submersible / Motor Pump</option>
            <option>Main Inflow Valve</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Issue Diagnosed</label>
          <select
            disabled={isReadOnly}
            value={leakType}
            onChange={(e) => setLeakType(e.target.value)}
            className="w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200"
          >
            <option>Tap Drip / Washer Wear</option>
            <option>Concealed Wall Seepage</option>
            <option>Flush Tank Internal Overflow</option>
            <option>Drain Line Severe Blockage</option>
            <option>Geyser Inlet Valve Burst</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Piping Standard</label>
          <select
            disabled={isReadOnly}
            value={pipeStandard}
            onChange={(e) => setPipeStandard(e.target.value)}
            className="w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200"
          >
            <option>CPVC Heavy Duty (0.75")</option>
            <option>UPVC Standard (1.0")</option>
            <option>GI Galvanized Iron Pipe</option>
            <option>Flexible SS Braided Hose</option>
          </select>
        </div>
      </div>

      {/* Checklist */}
      <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 bg-white/70 dark:bg-black/30 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={isReadOnly}
            checked={waterLeakTested}
            onChange={(e) => setWaterLeakTested(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <span>Pressurized Water Leak Test Passed (Zero Seepage)</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={isReadOnly}
            checked={cartridgeReplaced}
            onChange={(e) => setCartridgeReplaced(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <span>Ceramic Disc/Diverter Cartridge Replaced</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={isReadOnly}
            checked={blockageCleared}
            onChange={(e) => setBlockageCleared(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <span>High-Flow Drain Line Clear</span>
        </label>
      </div>

      {!isReadOnly && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black tracking-wide shadow-sm transition-all"
          >
            Save Plumbing Specs
          </button>
        </div>
      )}
    </div>
  )
}
