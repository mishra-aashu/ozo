import React, { useState } from 'react'
import { Zap, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ElectricalWorkflowCard({ booking, onUpdateData, isReadOnly = false }) {
  const existingData = booking?.service_specific_data?.electrical || {}

  const [supplyPhase, setSupplyPhase] = useState(existingData.supplyPhase || 'Single Phase (230V)')
  const [circuitType, setCircuitType] = useState(existingData.circuitType || 'Modular Switchboard')
  const [wireLoadGauge, setWireLoadGauge] = useState(existingData.wireLoadGauge || '2.5 sq mm FR')
  const [voltageMeasured, setVoltageMeasured] = useState(existingData.voltageMeasured || '232')
  const [mcbTested, setMcbTested] = useState(existingData.mcbTested ?? true)
  const [earthingChecked, setEarthingChecked] = useState(existingData.earthingChecked ?? true)
  const [shortCircuitTest, setShortCircuitTest] = useState(existingData.shortCircuitTest ?? true)

  const handleSave = () => {
    if (onUpdateData) {
      onUpdateData({
        electrical: {
          supplyPhase,
          circuitType,
          wireLoadGauge,
          voltageMeasured,
          mcbTested,
          earthingChecked,
          shortCircuitTest,
          savedAt: new Date().toISOString()
        }
      })
    }
  }

  return (
    <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 sm:p-5 text-left transition-all">
      <div className="flex items-center gap-2 mb-3 text-amber-700 dark:text-amber-300">
        <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
        <h4 className="font-black text-sm uppercase tracking-wider">Electrical Load & Safety Diagnostic</h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Power Supply</label>
          <select
            disabled={isReadOnly}
            value={supplyPhase}
            onChange={(e) => setSupplyPhase(e.target.value)}
            className="w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200"
          >
            <option>Single Phase (230V AC)</option>
            <option>Three Phase (415V Industrial)</option>
            <option>Inverter / Battery Backup Circuit</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Circuit Component</label>
          <select
            disabled={isReadOnly}
            value={circuitType}
            onChange={(e) => setCircuitType(e.target.value)}
            className="w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200"
          >
            <option>Modular Switchboard & Socket</option>
            <option>MCB / RCCB Distribution Board</option>
            <option>Ceiling Fan / Regulator Wiring</option>
            <option>AC / Geyser 16A/25A Heavy Point</option>
            <option>Chandelier / Smart Light Point</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Wire Gauge Used</label>
          <select
            disabled={isReadOnly}
            value={wireLoadGauge}
            onChange={(e) => setWireLoadGauge(e.target.value)}
            className="w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200"
          >
            <option>1.5 sq mm (Light / Fan)</option>
            <option>2.5 sq mm (Power Socket)</option>
            <option>4.0 sq mm (AC / Geyser)</option>
            <option>6.0 sq mm (Main Breaker Inflow)</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 bg-white/70 dark:bg-black/30 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={isReadOnly}
            checked={earthingChecked}
            onChange={(e) => setEarthingChecked(e.target.checked)}
            className="rounded text-amber-600 focus:ring-amber-500"
          />
          <span>Earthing Continuity Verified (&lt; 3 Volts Neutral-Earth)</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={isReadOnly}
            checked={mcbTested}
            onChange={(e) => setMcbTested(e.target.checked)}
            className="rounded text-amber-600 focus:ring-amber-500"
          />
          <span>RCCB Shock Protection Trip Test Passed</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={isReadOnly}
            checked={shortCircuitTest}
            onChange={(e) => setShortCircuitTest(e.target.checked)}
            className="rounded text-amber-600 focus:ring-amber-500"
          />
          <span>Zero Short-Circuit Continuity Clean</span>
        </label>
      </div>

      {!isReadOnly && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black tracking-wide shadow-sm transition-all"
          >
            Save Electrical Specs
          </button>
        </div>
      )}
    </div>
  )
}
