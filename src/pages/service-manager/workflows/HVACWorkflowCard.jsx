import React, { useState, useEffect } from 'react'
import { Snowflake, Gauge, Zap, Wind, CheckCircle2, ShieldCheck, Thermometer } from 'lucide-react'

export default function HVACWorkflowCard({ booking, onUpdateData, isReadOnly = false }) {
  const existingData = booking?.service_specific_data?.hvac || {}

  const [acType, setAcType] = useState(existingData.acType || 'Split AC')
  const [tonnage, setTonnage] = useState(existingData.tonnage || '1.5 Ton')
  const [inverterType, setInverterType] = useState(existingData.inverterType || 'Inverter')
  const [gasPressurePSI, setGasPressurePSI] = useState(existingData.gasPressurePSI || '60')
  const [compressorAmps, setCompressorAmps] = useState(existingData.compressorAmps || '6.5')
  const [preTempC, setPreTempC] = useState(existingData.preTempC || '28')
  const [postTempC, setPostTempC] = useState(existingData.postTempC || '18')
  const [foamJetDone, setFoamJetDone] = useState(existingData.foamJetDone ?? true)
  const [gasLeakChecked, setGasLeakChecked] = useState(existingData.gasLeakChecked ?? true)
  const [capacitorStatus, setCapacitorStatus] = useState(existingData.capacitorStatus || 'Good (45 MFD)')

  const handleSave = () => {
    if (onUpdateData) {
      onUpdateData({
        hvac: {
          acType,
          tonnage,
          inverterType,
          gasPressurePSI,
          compressorAmps,
          preTempC,
          postTempC,
          foamJetDone,
          gasLeakChecked,
          capacitorStatus,
          savedAt: new Date().toISOString()
        }
      })
    }
  }

  return (
    <div className="bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/40 rounded-2xl p-4 sm:p-5 text-left transition-all">
      <div className="flex items-center gap-2 mb-3 text-sky-700 dark:text-sky-300">
        <Snowflake className="w-5 h-5 animate-pulse text-sky-500" />
        <h4 className="font-black text-sm uppercase tracking-wider">HVAC & AC Technical Diagnostic</h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">AC System</label>
          <select
            disabled={isReadOnly}
            value={acType}
            onChange={(e) => setAcType(e.target.value)}
            className="w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200"
          >
            <option>Split AC</option>
            <option>Window AC</option>
            <option>Cassette AC</option>
            <option>Tower AC</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Tonnage</label>
          <select
            disabled={isReadOnly}
            value={tonnage}
            onChange={(e) => setTonnage(e.target.value)}
            className="w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200"
          >
            <option>0.8 - 1.0 Ton</option>
            <option>1.5 Ton</option>
            <option>2.0 Ton</option>
            <option>2.5+ Ton</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">Technology</label>
          <select
            disabled={isReadOnly}
            value={inverterType}
            onChange={(e) => setInverterType(e.target.value)}
            className="w-full mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200"
          >
            <option>Inverter (Dual Inverter)</option>
            <option>Non-Inverter Fixed Speed</option>
            <option>Smart WiFi Inverter</option>
          </select>
        </div>
      </div>

      {/* Cooling Temp Comparison & Gas PSI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/70 dark:bg-black/30 p-3 rounded-xl border border-sky-100 dark:border-sky-900/30 mb-4">
        <div>
          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
            <Thermometer size={12} className="text-amber-500" /> Pre-Temp
          </span>
          <div className="flex items-center gap-1 mt-1">
            <input
              type="number"
              disabled={isReadOnly}
              value={preTempC}
              onChange={(e) => setPreTempC(e.target.value)}
              className="w-16 bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-black text-rose-500"
            />
            <span className="text-xs font-bold text-gray-500">°C</span>
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
            <Thermometer size={12} className="text-sky-500" /> Post-Cooling
          </span>
          <div className="flex items-center gap-1 mt-1">
            <input
              type="number"
              disabled={isReadOnly}
              value={postTempC}
              onChange={(e) => setPostTempC(e.target.value)}
              className="w-16 bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-black text-emerald-500"
            />
            <span className="text-xs font-bold text-gray-500">°C</span>
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
            <Gauge size={12} className="text-blue-500" /> Gas PSI
          </span>
          <div className="flex items-center gap-1 mt-1">
            <input
              type="number"
              disabled={isReadOnly}
              value={gasPressurePSI}
              onChange={(e) => setGasPressurePSI(e.target.value)}
              className="w-16 bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-black text-blue-600 dark:text-blue-400"
            />
            <span className="text-xs font-bold text-gray-500">PSI</span>
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
            <Zap size={12} className="text-amber-500" /> Current Amps
          </span>
          <div className="flex items-center gap-1 mt-1">
            <input
              type="text"
              disabled={isReadOnly}
              value={compressorAmps}
              onChange={(e) => setCompressorAmps(e.target.value)}
              className="w-16 bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-black text-gray-800 dark:text-gray-200"
            />
            <span className="text-xs font-bold text-gray-500">A</span>
          </div>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={isReadOnly}
            checked={foamJetDone}
            onChange={(e) => setFoamJetDone(e.target.checked)}
            className="rounded text-sky-600 focus:ring-sky-500"
          />
          <span>Indoor & Outdoor 2X Foam Jet Wash Completed</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={isReadOnly}
            checked={gasLeakChecked}
            onChange={(e) => setGasLeakChecked(e.target.checked)}
            className="rounded text-sky-600 focus:ring-sky-500"
          />
          <span>Nitrogen & Soap Bubble Leak Test Passed</span>
        </label>
      </div>

      {!isReadOnly && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl text-xs font-black tracking-wide shadow-sm transition-all"
          >
            Save Diagnostic Specs
          </button>
        </div>
      )}
    </div>
  )
}
