import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  Stethoscope, Users, Calendar, Clock, CheckCircle, AlertCircle, 
  Plus, Search, ShieldCheck, FileText, Phone, Building2, 
  ToggleLeft, ToggleRight, RefreshCw, X, ChevronRight, Activity
} from 'lucide-react'
import { useDoctorStore } from '../../stores/doctorStore'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { 
    doctor, 
    fetchDoctorProfile, 
    toggleDutyStatus,
    appointments, 
    fetchAppointments, 
    updateAppointmentStatus,
    createPrescription,
    issuedPrescriptions,
    fetchIssuedPrescriptions,
    updateDoctorProfile,
    isLoading 
  } = useDoctorStore()

  const [activeTab, setActiveTab] = useState('queue') // 'queue' | 'rx_studio' | 'profile' | 'history'
  const [activeQueueFilter, setActiveQueueFilter] = useState('all') // 'all' | 'booked' | 'in_consultation' | 'completed'

  // Rx Modal State
  const [selectedAppointmentForRx, setSelectedAppointmentForRx] = useState(null)
  const [rxDiagnosis, setRxDiagnosis] = useState('')
  const [rxAdvice, setRxAdvice] = useState('')
  const [rxFollowUpDate, setRxFollowUpDate] = useState('')
  const [rxMedicines, setRxMedicines] = useState([
    { name: '', dosage: '1-0-1', duration: '5 Days', instructions: 'After food' }
  ])
  const [isSubmittingRx, setIsSubmittingRx] = useState(false)

  // Profile Edit State
  const [editFee, setEditFee] = useState('')
  const [editClinicName, setEditClinicName] = useState('')
  const [editClinicAddress, setEditClinicAddress] = useState('')
  const [editTimings, setEditTimings] = useState('')

  useEffect(() => {
    fetchDoctorProfile().then((doc) => {
      if (doc) {
        setEditFee(doc.consultation_fee || 500)
        setEditClinicName(doc.clinic_name || '')
        setEditClinicAddress(doc.clinic_address || '')
        setEditTimings(typeof doc.timings === 'string' ? doc.timings : 'Mon-Sat 10:00 AM - 08:00 PM')
      }
    })
  }, [])

  useEffect(() => {
    if (doctor) {
      fetchAppointments()
      fetchIssuedPrescriptions()
    }
  }, [doctor])

  // Real-time polling fallback / refresh every 15s for queue
  useEffect(() => {
    const interval = setInterval(() => {
      if (doctor) fetchAppointments()
    }, 15000)
    return () => clearInterval(interval)
  }, [doctor])

  const handleAddMedicineRow = () => {
    setRxMedicines([
      ...rxMedicines,
      { name: '', dosage: '1-0-1', duration: '5 Days', instructions: 'After food' }
    ])
  }

  const handleMedicineChange = (index, field, value) => {
    const updated = [...rxMedicines]
    updated[index][field] = value
    setRxMedicines(updated)
  }

  const handleRemoveMedicineRow = (index) => {
    if (rxMedicines.length === 1) return
    setRxMedicines(rxMedicines.filter((_, idx) => idx !== index))
  }

  const handleOpenRxModal = (apt) => {
    setSelectedAppointmentForRx(apt)
    setRxDiagnosis(apt.symptoms ? `Observation for: ${apt.symptoms}` : 'General Examination')
    setRxAdvice('Take complete rest, drink plenty of warm fluids.')
    setRxFollowUpDate('')
    setRxMedicines([
      { name: 'Paracetamol 650mg', dosage: '1-0-1', duration: '3 Days', instructions: 'After meals' }
    ])
  }

  const handleSubmitRx = async (e) => {
    e.preventDefault()
    if (!rxDiagnosis.trim()) {
      toast.error('Please enter diagnosis')
      return
    }

    const validMedicines = rxMedicines.filter(m => m.name.trim().length > 0)
    if (validMedicines.length === 0) {
      toast.error('Add at least one medicine')
      return
    }

    setIsSubmittingRx(true)
    const rxPayload = {
      diagnosis: rxDiagnosis.trim(),
      medicines: validMedicines,
      general_advice: rxAdvice.trim(),
      follow_up_date: rxFollowUpDate || null
    }

    const res = await createPrescription(selectedAppointmentForRx, rxPayload)
    setIsSubmittingRx(false)

    if (res) {
      setSelectedAppointmentForRx(null)
      fetchAppointments()
      fetchIssuedPrescriptions()
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    await updateDoctorProfile({
      consultation_fee: parseInt(editFee, 10) || 500,
      clinic_name: editClinicName,
      clinic_address: editClinicAddress,
      timings: editTimings
    })
  }

  // Filter queue
  const filteredQueue = appointments.filter((apt) => {
    if (activeQueueFilter === 'all') return true
    return apt.status === activeQueueFilter
  })

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Professional Doctor Header */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-900/30">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-base tracking-tight">OzoCare</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Doctor Workstation
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Dr. {doctor?.full_name || 'Medical Practitioner'} • {doctor?.qualification || 'MBBS, MD'}
              </p>
            </div>
          </div>

          {/* Quick Actions & Duty Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDutyStatus}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                doctor?.is_online
                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${doctor?.is_online ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              {doctor?.is_online ? 'Online (Accepting Patients)' : 'Offline'}
            </button>

            <button
              onClick={() => fetchAppointments()}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <Link
              to="/care"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Customer View ↗
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-6 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('queue')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'queue'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" /> Live Patient Queue ({appointments.length})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'history'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" /> Prescriptions Vault ({issuedPrescriptions.length})
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Credentials & Clinic Timings
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Tokens</span>
            <div className="text-2xl font-black text-white mt-1">
              {appointments.filter(a => a.status === 'booked' || a.status === 'in_consultation').length}
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold">Active in OPD Queue</span>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed Today</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {appointments.filter(a => a.status === 'completed').length}
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">Prescriptions Issued</span>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Consultation Fee</span>
            <div className="text-2xl font-black text-sky-400 mt-1">
              ₹{doctor?.consultation_fee || 500}
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">Per OPD Token</span>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Council Status</span>
            <div className="text-sm font-bold text-emerald-400 mt-2 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Verified RMP
            </div>
            <span className="text-[10px] text-slate-500 font-mono truncate block mt-0.5">
              {doctor?.registration_number || 'NMC-847291-BR'}
            </span>
          </div>
        </div>

        {/* TAB 1: PATIENT QUEUE */}
        {activeTab === 'queue' && (
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs">
                {['all', 'booked', 'in_consultation', 'completed'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveQueueFilter(filter)}
                    className={`px-3 py-1.5 rounded-xl font-bold capitalize transition-colors ${
                      activeQueueFilter === filter
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {filter.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-400">
                Auto-refreshes every 15s • Tap <strong>"Call Next"</strong> to update live token
              </span>
            </div>

            {/* Patients List */}
            {filteredQueue.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold">No patients currently in this queue</p>
                <p className="text-xs text-slate-600 mt-1">New appointments booked by patients will appear here instantly.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQueue.map((apt) => (
                  <div 
                    key={apt.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-700"
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      {/* Big Token Number */}
                      <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] uppercase font-bold tracking-wider">Token</span>
                        <span className="text-lg font-black">#{apt.token_number}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{apt.patient_name}</h4>
                          {apt.patient_age && (
                            <span className="text-xs text-slate-400">({apt.patient_age} yrs, {apt.patient_gender})</span>
                          )}
                          <span className="text-xs font-mono text-slate-500">📞 {apt.patient_phone}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          <strong>Chief Symptoms:</strong> {apt.symptoms || 'General Checkup'}
                        </p>
                        <span className="text-[11px] text-slate-500 mt-1 block">
                          Slot: {apt.time_slot} • Type: {apt.consultation_type === 'teleconsult' ? '📹 Video Call' : '🏥 In-Clinic OPD'}
                        </span>
                      </div>
                    </div>

                    {/* Operational Action Controls */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      {apt.status === 'booked' && (
                        <button
                          onClick={() => updateAppointmentStatus(apt.id, 'in_consultation')}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-sm"
                        >
                          Call Patient Inside
                        </button>
                      )}

                      {apt.status === 'in_consultation' && (
                        <button
                          onClick={() => handleOpenRxModal(apt)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950"
                        >
                          <FileText className="w-4 h-4" /> Issue Digital Prescription (Rx)
                        </button>
                      )}

                      {apt.status === 'completed' && (
                        <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-emerald-400 text-xs font-bold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Rx Issued
                        </span>
                      )}

                      {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                        <button
                          onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 text-xs"
                          title="Mark No Show / Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ISSUED PRESCRIPTIONS VAULT */}
        {activeTab === 'history' && (
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Issued Digital Prescriptions
            </h3>

            {issuedPrescriptions.length === 0 ? (
              <p className="text-xs text-slate-500 py-10 text-center">No prescriptions issued yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {issuedPrescriptions.map((rx) => (
                  <div 
                    key={rx.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-white text-sm">{rx.patient_name}</span>
                      <span className="text-[10px] text-slate-400">{new Date(rx.created_at).toLocaleDateString()}</span>
                    </div>

                    <p className="text-emerald-400 font-semibold">
                      Diagnosis: {rx.diagnosis}
                    </p>

                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Medicines:</span>
                      {rx.medicines?.map((m, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] text-slate-300">
                          <span>{m.name}</span>
                          <span className="font-mono text-emerald-400">{m.dosage} ({m.duration})</span>
                        </div>
                      ))}
                    </div>

                    <p className="text-slate-400 text-[11px]">
                      Advice: {rx.general_advice}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PROFILE & CLINICAL SETTINGS */}
        {activeTab === 'profile' && (
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 max-w-2xl mx-auto space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Clinical Profile & OPD Configuration</h3>
              <p className="text-xs text-slate-400 mt-1">
                Keep your clinic address and consultation fees up-to-date for patients.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">State / NMC Medical Registration Number</label>
                <input 
                  type="text" 
                  value={doctor?.registration_number || 'NMC-847291-BR'} 
                  disabled 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-500 font-mono"
                />
                <span className="text-[10px] text-emerald-500 mt-1 block">✓ Verified with State Medical Council</span>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">OPD Consultation Fee (₹)</label>
                <input 
                  type="number" 
                  value={editFee} 
                  onChange={(e) => setEditFee(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Clinic / Hospital Name</label>
                <input 
                  type="text" 
                  value={editClinicName} 
                  onChange={(e) => setEditClinicName(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Clinic Address & Landmark</label>
                <textarea 
                  rows={2}
                  value={editClinicAddress} 
                  onChange={(e) => setEditClinicAddress(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">OPD Timings</label>
                <input 
                  type="text" 
                  value={editTimings} 
                  onChange={(e) => setEditTimings(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
              >
                Save Clinical Settings
              </button>
            </form>
          </div>
        )}
      </main>

      {/* DIGITAL PRESCRIPTION (Rx) WRITER MODAL */}
      {selectedAppointmentForRx && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 rounded-3xl max-w-2xl w-full border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">
                  Write Digital Prescription • Token #{selectedAppointmentForRx.token_number}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedAppointmentForRx(null)} 
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitRx} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Patient</span>
                  <span className="font-bold text-white text-sm">{selectedAppointmentForRx.patient_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase">Symptoms Reported</span>
                  <span className="text-slate-300">{selectedAppointmentForRx.symptoms || 'General Checkup'}</span>
                </div>
              </div>

              {/* Diagnosis */}
              <div>
                <label className="font-bold text-slate-300 block mb-1">Clinical Diagnosis *</label>
                <input 
                  type="text"
                  placeholder="e.g. Acute Pharyngitis, Upper Respiratory Infection"
                  value={rxDiagnosis}
                  onChange={(e) => setRxDiagnosis(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Medicines List Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-300">
                    ℞ Prescribed Medicines (Dosage Format)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMedicineRow}
                    className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Medicine
                  </button>
                </div>

                <div className="space-y-2">
                  {rxMedicines.map((med, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <input 
                          type="text"
                          placeholder="Medicine Name & Strength"
                          value={med.name}
                          onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-[11px]"
                          required
                        />
                      </div>
                      <div className="col-span-3">
                        <input 
                          type="text"
                          placeholder="Dosage (e.g. 1-0-1)"
                          value={med.dosage}
                          onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono text-[11px]"
                        />
                      </div>
                      <div className="col-span-2">
                        <input 
                          type="text"
                          placeholder="Duration (5d)"
                          value={med.duration}
                          onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white text-[11px]"
                        />
                      </div>
                      <div className="col-span-2">
                        <input 
                          type="text"
                          placeholder="Instructions"
                          value={med.instructions}
                          onChange={(e) => handleMedicineChange(idx, 'instructions', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-300 text-[11px]"
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicineRow(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advice */}
              <div>
                <label className="font-bold text-slate-300 block mb-1">Doctor Advice / Lifestyle Notes</label>
                <textarea 
                  rows={2}
                  placeholder="e.g. Steam inhalation, drink plenty of warm water, avoid cold beverages"
                  value={rxAdvice}
                  onChange={(e) => setRxAdvice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Follow-up */}
              <div>
                <label className="font-bold text-slate-300 block mb-1">Follow-up Date (Optional)</label>
                <input 
                  type="date"
                  value={rxFollowUpDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setRxFollowUpDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAppointmentForRx(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRx}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-950"
                >
                  {isSubmittingRx ? 'Signing & Transmitting...' : 'Sign & Complete Consultation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
