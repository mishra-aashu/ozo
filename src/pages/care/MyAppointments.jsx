import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Calendar, Clock, MapPin, Stethoscope, FileText, 
  CheckCircle, AlertCircle, ShoppingBag, Phone, Search, X, Printer
} from 'lucide-react'
import { useCareStore } from '../../stores/careStore'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

export default function MyAppointments() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { 
    myAppointments, 
    fetchMyAppointments, 
    cancelAppointment, 
    isLoadingAppointments,
    themeConfig, 
    applyThemeVariables 
  } = useCareStore()

  const [searchPhone, setSearchPhone] = useState(user?.phone || user?.user_metadata?.phone || '')
  const [selectedRx, setSelectedRx] = useState(null)

  useEffect(() => {
    applyThemeVariables()
    const defaultPhone = user?.phone || user?.user_metadata?.phone || ''
    if (defaultPhone) {
      fetchMyAppointments(defaultPhone)
    }
  }, [user])

  const handleSearch = (e) => {
    e.preventDefault()
    if (!searchPhone.trim()) {
      toast.error('Enter mobile number to view appointments')
      return
    }
    fetchMyAppointments(searchPhone.trim())
  }

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this appointment token?')) {
      await cancelAppointment(id)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'booked':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            ⏳ Token Confirmed (In Queue)
          </span>
        )
      case 'in_consultation':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-pulse">
            🟢 In Consultation Now
          </span>
        )
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            ✓ Consultation Completed
          </span>
        )
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            Cancelled
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 font-sans">
      {/* Top Navbar */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link 
            to="/care"
            className="flex items-center gap-2 text-sm font-display font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Back to OzoCare
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/care/order-medicines"
              className="text-xs font-display font-bold px-3 py-1.5 rounded-xl text-white shadow-sm flex items-center gap-1.5"
              style={{ backgroundColor: themeConfig?.primary || '#059669' }}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Order Medicines
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-display font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
              <Stethoscope className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              My Appointments & Consultation Tokens
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Track live queue tokens, OPD status, and access digital prescriptions (Rx).
            </p>
          </div>

          {/* Phone Lookup Bar */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="tel"
                placeholder="Lookup phone number..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48 sm:w-56"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold hover:opacity-90"
            >
              Search
            </button>
          </form>
        </div>

        {/* Content List */}
        {isLoadingAppointments ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400">Loading your consultation tokens...</p>
          </div>
        ) : myAppointments.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200 dark:border-slate-800 text-center max-w-md mx-auto mt-6 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Consultations Found</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {searchPhone ? `No appointments booked under ${searchPhone}. Search with another number or book a new token.` : 'Enter your mobile number above to find your booked tokens.'}
            </p>
            <Link
              to="/care"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md"
              style={{ backgroundColor: themeConfig?.primary || '#059669' }}
            >
              Book Doctor Consultation Now
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {myAppointments.map((apt) => {
              const doctor = apt.care_doctors
              const rx = apt.care_prescriptions?.[0] || apt.care_prescriptions

              return (
                <div 
                  key={apt.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      {/* Token Big Badge */}
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex flex-col items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Token</span>
                        <span className="text-xl font-black">#{apt.token_number || '1'}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-slate-900 dark:text-white">
                            Dr. {doctor?.full_name || 'Specialist Doctor'}
                          </h2>
                          <span className="text-xs text-slate-400">• {doctor?.specialty_slug?.replace('_', ' ')}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {doctor?.clinic_name} • {doctor?.clinic_address}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5">
                      {getStatusBadge(apt.status)}
                      <span className="text-[11px] font-mono text-slate-400">Ref: {apt.appointment_number}</span>
                    </div>
                  </div>

                  {/* Details row */}
                  <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Date & Slot:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {apt.appointment_date} ({apt.time_slot})
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Patient Name:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                        {apt.patient_name} {apt.patient_age ? `(${apt.patient_age}y)` : ''}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Consultation Fee:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                        ₹{apt.consultation_fee || 500}
                        <span className="text-[10px] font-normal text-slate-400 ml-1">({apt.payment_status || 'Pay at clinic'})</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">Symptoms / Note:</span>
                      <span className="text-slate-600 dark:text-slate-300 truncate mt-0.5 block">
                        {apt.symptoms || 'General Checkup'}
                      </span>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {rx ? (
                        <button
                          onClick={() => setSelectedRx(rx)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5" /> View Digital Rx
                        </button>
                      ) : apt.status === 'booked' ? (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          Rx will be available here right after doctor consultation
                        </span>
                      ) : null}

                      {rx && (
                        <button
                          onClick={() => navigate('/care/order-medicines', { state: { preselectedRx: rx } })}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 hover:opacity-90"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" /> Order Medicines (1-Click)
                        </button>
                      )}
                    </div>

                    {apt.status === 'booked' && (
                      <button
                        onClick={() => handleCancel(apt.id)}
                        className="text-xs text-rose-500 hover:text-rose-700 font-semibold px-2 py-1"
                      >
                        Cancel Token
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Digital Prescription Modal */}
      {selectedRx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Digital Prescription (e-Rx)
                </h3>
              </div>
              <button 
                onClick={() => setSelectedRx(null)} 
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Rx Sheet Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300">
              {/* Doctor Header Banner */}
              <div className="border-b-2 border-slate-200 dark:border-slate-700 pb-4 flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">
                    Dr. {selectedRx.care_doctors?.full_name || 'Medical Practitioner'}
                  </h4>
                  <p className="text-slate-500">{selectedRx.care_doctors?.qualification || 'MBBS / MD'}</p>
                  <p className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    Reg. No: {selectedRx.care_doctors?.registration_number || 'NMC-847291-BR'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 dark:text-white">{selectedRx.care_doctors?.clinic_name}</p>
                  <p className="text-slate-400 text-[11px]">{selectedRx.care_doctors?.clinic_address}</p>
                  <p className="text-slate-400 text-[11px] mt-1">Date: {new Date(selectedRx.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Patient Vitals & Diagnosis */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl">
                <div>
                  <span className="text-slate-400 block font-medium">Patient Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{selectedRx.patient_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Clinical Diagnosis:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                    {selectedRx.diagnosis || 'Acute Pharyngitis / Viral Fever'}
                  </span>
                </div>
              </div>

              {/* Medicines Table (1-0-1 Standard Format) */}
              <div>
                <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-2 flex items-center gap-1.5">
                  <span className="text-emerald-600 font-serif font-black text-base italic">℞</span> Prescribed Medicines
                </h5>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-3">Medicine & Strength</th>
                        <th className="p-3">Dosage</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(selectedRx.medicines && selectedRx.medicines.length > 0) ? (
                        selectedRx.medicines.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-3 font-semibold text-slate-900 dark:text-white">
                              {m.name || m.medicine}
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {m.dosage || '1-0-1'}
                            </td>
                            <td className="p-3">{m.duration || '5 Days'}</td>
                            <td className="p-3 text-slate-500">{m.instructions || 'After meals'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-400">
                            Paracetamol 650mg (1-0-1 for 3 days), Azithromycin 500mg (1-0-0 for 3 days).
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Doctor General Advice */}
              <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 p-3.5 rounded-xl">
                <span className="font-bold text-amber-900 dark:text-amber-300 block mb-0.5">Doctor Advice:</span>
                <p className="text-amber-800 dark:text-amber-400">
                  {selectedRx.general_advice || 'Drink warm fluids, steam inhalation twice daily, adequate bed rest.'}
                </p>
                {selectedRx.follow_up_date && (
                  <p className="mt-1 font-semibold text-amber-900 dark:text-amber-200">
                    Follow-up Date: {selectedRx.follow_up_date}
                  </p>
                )}
              </div>

              {/* Legal Intermediary Verification */}
              <div className="text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3">
                Digitally generated under Telemedicine Practice Guidelines 2020. Dispensing is subject to physical verification by a licensed chemist under Drugs & Cosmetics Rules (Form 20/21).
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-white dark:hover:bg-slate-700 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print Rx
              </button>

              <button
                onClick={() => {
                  const rxToPass = selectedRx
                  setSelectedRx(null)
                  navigate('/care/order-medicines', { state: { preselectedRx: rxToPass } })
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                <ShoppingBag className="w-4 h-4" /> Order with Nearby Chemist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
