import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Calendar, Clock, MapPin, Stethoscope, FileText, 
  CheckCircle, AlertCircle, ShoppingBag, Phone, Search, X, Printer,
  Video, Paperclip, Eye, ChevronRight, Headphones
} from 'lucide-react'
import { useCareStore } from '../../stores/careStore'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import { isAppointmentOver } from '../../utils/careAppointmentUtils'
import AppointmentDetailModal from '../../components/care/AppointmentDetailModal'

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
  const [selectedDetailApt, setSelectedDetailApt] = useState(null)
  const [printingTokenApt, setPrintingTokenApt] = useState(null)

  const handlePrintRx = () => {
    document.body.classList.add('hide-root-on-print')
    setTimeout(() => {
      window.print()
      setTimeout(() => {
        document.body.classList.remove('hide-root-on-print')
      }, 500)
    }, 100)
  }

  const handlePrintTokenSlip = (apt) => {
    setPrintingTokenApt(apt)
    document.body.classList.add('hide-root-on-print')
    setTimeout(() => {
      window.print()
      setTimeout(() => {
        document.body.classList.remove('hide-root-on-print')
      }, 500)
    }, 100)
  }

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

  const getStatusBadge = (status, apt) => {
    if (apt && isAppointmentOver(apt)) {
      if (status === 'cancelled' || status === 'canceled') {
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">
            Cancelled
          </span>
        )
      }
      if (status === 'completed') {
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            ✓ Consultation Completed
          </span>
        )
      }
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400 border border-slate-200 dark:border-white/10">
          ⏱️ Slot Ended (Past)
        </span>
      )
    }

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
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">
            Cancelled
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#0c1015] text-slate-900 dark:text-white pb-20 font-sans">
      {/* Top Navbar */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-[#0c1015]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10">
        <div className="max-w-5xl mx-auto px-3 xs:px-4 h-14 flex items-center justify-between gap-2">
          <Link 
            to="/care"
            className="flex items-center gap-1.5 xs:gap-2 text-xs xs:text-sm font-display font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shrink-0"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" /> <span>Back to OzoCare</span>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/care/order-medicines"
              className="text-xs font-display font-bold px-2.5 xs:px-3 py-1.5 rounded-xl text-white shadow-sm flex items-center gap-1.5"
              style={{ backgroundColor: themeConfig?.primary || '#059669' }}
            >
              <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">Order Medicines</span>
              <span className="xs:hidden">Medicines</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 xs:px-4 sm:px-6 py-5 sm:py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6">
          <div>
            <h1 className="text-xl xs:text-2xl font-display font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
              <Stethoscope className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>My Appointments & Tokens</span>
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
                className="pl-9 pr-3 py-2 bg-white dark:bg-black/30 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48 sm:w-56"
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
          <div className="bg-white dark:bg-[#121820] rounded-3xl p-10 border border-slate-200/90 dark:border-white/10 text-center max-w-md mx-auto mt-6 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4 text-slate-400">
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
                  className="bg-white dark:bg-[#121820] rounded-2xl p-5 border border-slate-200/90 dark:border-white/10 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
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
                      {getStatusBadge(apt.status, apt)}
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
                        {apt.symptoms || apt.symptoms_description || 'General Checkup'}
                      </span>
                    </div>
                  </div>

                  {/* Attached Documents Pills */}
                  {apt.attachments && apt.attachments.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 flex-wrap text-xs">
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Paperclip size={12} /> Uploaded Records:
                      </span>
                      {apt.attachments.map((file, fIdx) => (
                        <a
                          key={fIdx}
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-[11px] text-slate-700 dark:text-slate-300 font-medium transition-colors"
                        >
                          <Eye size={11} className="text-emerald-500" />
                          <span className="max-w-[130px] truncate">{file.name}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Teleconsult Dedicated Video Call Action */}
                      {(apt.consultation_type === 'teleconsult' || apt.consultation_mode === 'teleconsult') && (apt.status === 'booked' || apt.status === 'in_consultation') && !isAppointmentOver(apt) && (
                        <Link
                          to={`/care/room/${apt.id}`}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-all hover:scale-105"
                        >
                          <Video className="w-4 h-4 animate-pulse" /> Join Video Consultation
                        </Link>
                      )}

              {rx ? (
                        <button
                          onClick={() => setSelectedRx({ ...rx, care_doctors: rx.care_doctors || doctor, appointment: apt })}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> View Digital Rx
                        </button>
                      ) : apt.status === 'booked' && apt.consultation_type !== 'teleconsult' && apt.consultation_mode !== 'teleconsult' && !isAppointmentOver(apt) ? (
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

                      {/* Print Token Slip Button */}
                      <button
                        onClick={() => handlePrintTokenSlip(apt)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Print Token Slip"
                      >
                        <Printer size={13} />
                        <span>Print Slip</span>
                      </button>
                    </div>

                    {apt.status === 'booked' && !isAppointmentOver(apt) && (
                      <button
                        onClick={() => handleCancel(apt.id)}
                        className="text-xs text-rose-500 hover:text-rose-700 font-semibold px-2 py-1 cursor-pointer"
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

      {/* Digital Prescription Modal (Screen View) */}
      {selectedRx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121820] rounded-3xl max-w-2xl w-full border border-slate-200/90 dark:border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-black/30">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Digital Prescription (e-Rx)
                </h3>
              </div>
              <button 
                onClick={() => setSelectedRx(null)} 
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Rx Sheet Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300">
              {/* Doctor Header Banner */}
              <div className="border-b-2 border-slate-200 dark:border-white/10 pb-4 flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">
                    Dr. {selectedRx.care_doctors?.full_name || selectedRx.appointment?.care_doctors?.full_name || 'Medical Practitioner'}
                  </h4>
                  <p className="text-slate-500">{selectedRx.care_doctors?.qualification || selectedRx.appointment?.care_doctors?.qualification || 'MBBS / Specialist Doctor'}</p>
                  <p className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    Reg. No: {selectedRx.care_doctors?.council_registration_number || selectedRx.care_doctors?.registration_number || selectedRx.appointment?.care_doctors?.council_registration_number || 'NMC / RMP Verified'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 dark:text-white">{selectedRx.care_doctors?.clinic_name || selectedRx.appointment?.care_doctors?.clinic_name || 'OzoCare Clinic'}</p>
                  <p className="text-slate-400 text-[11px]">{selectedRx.care_doctors?.clinic_address || selectedRx.appointment?.care_doctors?.clinic_address || 'Aurangabad, Bihar'}</p>
                  <p className="text-slate-400 text-[11px] mt-1">Date: {new Date(selectedRx.created_at || Date.now()).toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              {/* Patient Vitals & Diagnosis */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-white/[0.04] p-4 rounded-xl border border-slate-100 dark:border-white/5">
                <div>
                  <span className="text-slate-400 block font-medium">Patient Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{selectedRx.patient_name || selectedRx.appointment?.patient_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Clinical Diagnosis:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                    {selectedRx.diagnosis || 'Clinical OPD Assessment'}
                  </span>
                </div>
              </div>

              {/* Medicines Table (1-0-1 Standard Format) */}
              <div>
                <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-2 flex items-center gap-1.5">
                  <span className="text-emerald-600 font-serif font-black text-base italic">℞</span> Prescribed Medicines
                </h5>
                <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-white/5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-3">Medicine & Strength</th>
                        <th className="p-3">Dosage</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {(selectedRx.medicines && selectedRx.medicines.length > 0) ? (
                        selectedRx.medicines.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
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
                            Standard medication advised during clinical consultation.
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
              <div className="text-[10px] text-slate-400 border-t border-slate-200 dark:border-white/10 pt-3">
                Digitally generated under Telemedicine Practice Guidelines 2020. Dispensing is subject to physical verification by a licensed chemist under Drugs & Cosmetics Rules (Form 20/21).
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-black/30 flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrintRx}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-semibold hover:bg-white dark:hover:bg-white/5 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Print Rx
              </button>

              <button
                onClick={() => {
                  const rxToPass = selectedRx
                  setSelectedRx(null)
                  navigate('/care/order-medicines', { state: { preselectedRx: rxToPass } })
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" /> Order with Nearby Chemist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED PORTAL PRINTABLE PRESCRIPTION (A4 High-Res Medical Sheet) */}
      {selectedRx && typeof document !== 'undefined' && createPortal(
        <div id="print-prescription-container" className="hidden print:block bg-white text-gray-900 p-8 font-sans max-w-[800px] mx-auto">
          {/* Letterhead Header */}
          <div className="flex justify-between items-start border-b-2 border-emerald-700 pb-4 mb-4">
            <div>
              <h2 className="text-xl font-black text-emerald-900 uppercase tracking-tight">
                Dr. {selectedRx.care_doctors?.full_name || selectedRx.appointment?.care_doctors?.full_name || 'Consultant Physician'}
              </h2>
              <p className="text-xs font-bold text-gray-700 mt-0.5">
                {selectedRx.care_doctors?.qualification || selectedRx.appointment?.care_doctors?.qualification || 'MBBS, MD'}
              </p>
              <p className="text-[11px] text-gray-600 font-mono mt-0.5">
                Council Reg No: <strong className="text-gray-900">{selectedRx.care_doctors?.council_registration_number || selectedRx.care_doctors?.registration_number || selectedRx.appointment?.care_doctors?.council_registration_number || 'NMC / Bihar Verified'}</strong>
              </p>
              <p className="text-[11px] text-gray-600 mt-0.5">
                Specialty: <strong className="capitalize">{selectedRx.care_doctors?.specialty_slug?.replace(/_/g, ' ') || 'General Medicine'}</strong>
              </p>
            </div>

            <div className="text-right">
              <h3 className="text-sm font-extrabold text-gray-900 uppercase">
                {selectedRx.care_doctors?.clinic_name || selectedRx.appointment?.care_doctors?.clinic_name || 'OzoCare Health Partner Clinic'}
              </h3>
              <p className="text-[11px] text-gray-600 max-w-[240px] leading-tight mt-0.5">
                {selectedRx.care_doctors?.clinic_address || selectedRx.appointment?.care_doctors?.clinic_address || 'Aurangabad, Bihar'}
              </p>
              <div className="mt-2 inline-block px-2.5 py-1 bg-emerald-50 border border-emerald-300 rounded text-[10px] font-bold text-emerald-900">
                DIGITAL PRESCRIPTION (e-Rx)
              </div>
            </div>
          </div>

          {/* Patient Details & Vitals Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs mb-5">
            <div>
              <span className="text-gray-500 block text-[10px] uppercase font-bold">Patient Name</span>
              <strong className="text-gray-900 text-sm">{selectedRx.patient_name || selectedRx.appointment?.patient_name || 'Patient'}</strong>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px] uppercase font-bold">Age / Gender</span>
              <span className="text-gray-800 font-semibold">
                {selectedRx.appointment?.patient_age ? `${selectedRx.appointment.patient_age} Yrs` : '—'} / {selectedRx.appointment?.patient_gender || '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px] uppercase font-bold">Token / Booking Ref</span>
              <strong className="text-emerald-800 font-mono">
                #{selectedRx.appointment?.token_number || selectedRx.token_number || '1'} ({selectedRx.appointment?.appointment_number || selectedRx.prescription_number || 'OPD'})
              </strong>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px] uppercase font-bold">Consultation Date</span>
              <span className="text-gray-800 font-semibold">
                {new Date(selectedRx.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Clinical Findings & Diagnosis */}
          <div className="mb-5 pb-3 border-b border-gray-200 text-xs">
            <span className="text-gray-500 uppercase font-bold text-[10px] block mb-1">Clinical Diagnosis & Assessment</span>
            <p className="text-sm font-bold text-gray-900 bg-emerald-50/50 border border-emerald-100 p-2.5 rounded">
              {selectedRx.diagnosis || selectedRx.symptoms || 'General OPD Examination & Assessment'}
            </p>
          </div>

          {/* Medicines Prescription Table */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-serif italic font-black text-emerald-800 leading-none">℞</span>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-800">Prescribed Medicines</h4>
            </div>

            <table className="w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-gray-100 text-gray-800 font-bold border-b border-gray-300">
                  <th className="p-2.5 text-center border-r border-gray-300 w-10">#</th>
                  <th className="p-2.5 text-left border-r border-gray-300">Medicine & Strength</th>
                  <th className="p-2.5 text-center border-r border-gray-300 w-28">Dosage (M-A-N)</th>
                  <th className="p-2.5 text-center border-r border-gray-300 w-24">Duration</th>
                  <th className="p-2.5 text-left">Instructions</th>
                </tr>
              </thead>
              <tbody>
                {(selectedRx.medicines && selectedRx.medicines.length > 0) ? (
                  selectedRx.medicines.map((med, idx) => (
                    <tr key={idx} className={`border-b border-gray-200 ${idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                      <td className="p-2.5 text-center font-bold text-gray-500 border-r border-gray-300">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-gray-900 border-r border-gray-300">
                        {med.name || med.medicine}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-emerald-800 border-r border-gray-300">
                        {med.dosage || '1 - 0 - 1'}
                      </td>
                      <td className="p-2.5 text-center font-semibold text-gray-700 border-r border-gray-300">
                        {med.duration || '5 Days'}
                      </td>
                      <td className="p-2.5 text-gray-700 font-medium">
                        {med.instructions || 'After food'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500 italic">
                      Standard medication as instructed during clinical consultation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Doctor Advice & Follow-up */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-xs">
            <div className="border border-gray-200 rounded p-3 bg-gray-50/50">
              <strong className="block text-gray-700 uppercase text-[10px] font-extrabold mb-1">Doctor Advice & Precautions</strong>
              <p className="text-gray-800 leading-relaxed">
                {selectedRx.general_advice || 'Take adequate rest, maintain hydration, and avoid cold/spicy foods.'}
              </p>
            </div>

            <div className="border border-gray-200 rounded p-3 bg-gray-50/50 flex flex-col justify-between">
              <div>
                <strong className="block text-gray-700 uppercase text-[10px] font-extrabold mb-1">Follow-up Consultation</strong>
                <p className="text-gray-900 font-bold">
                  {selectedRx.follow_up_date ? `Next Visit on: ${selectedRx.follow_up_date}` : 'As required or if symptoms persist after 5 days.'}
                </p>
              </div>
              <div className="mt-3 text-[10px] text-gray-500 font-mono">
                Teleconsultation verified under NMC 2020 Guidelines
              </div>
            </div>
          </div>

          {/* Signature & Stamp Section */}
          <div className="flex justify-between items-end pt-4 border-t-2 border-gray-200 mb-6">
            <div className="text-[10px] text-gray-500 max-w-sm leading-relaxed">
              <p className="font-semibold text-gray-700">Dispensing Chemist Instructions:</p>
              <p>This is a valid e-Prescription under Indian Telemedicine Practice Guidelines 2020 & IT Act 2000. Dispense genuine medicines with batch and tax invoice.</p>
            </div>

            <div className="text-right">
              <div className="inline-block border-b-2 border-gray-900 pb-1 mb-1 min-w-[160px] text-center">
                <span className="text-xs font-bold text-emerald-800 italic">Dr. {selectedRx.care_doctors?.full_name || selectedRx.appointment?.care_doctors?.full_name}</span>
              </div>
              <p className="text-[11px] font-bold text-gray-900">Authorized Digital Signature</p>
              <p className="text-[9px] text-gray-500">Reg: {selectedRx.care_doctors?.council_registration_number || selectedRx.appointment?.care_doctors?.council_registration_number || 'Registered Medical Practitioner'}</p>
            </div>
          </div>

          {/* OzoCare Branding Footer */}
          <div className="border-t border-gray-200 pt-2 flex justify-between items-center text-[9px] text-gray-400">
            <span>Generated via OzoCare Digital Health Platform • ozomart.store</span>
            <span>1-Click Medicine Delivery: www.ozomart.store/care/order-medicines</span>
          </div>
        </div>,
        document.body
      )}

      {/* DEDICATED PORTAL PRINTABLE APPOINTMENT TOKEN SLIP */}
      {printingTokenApt && typeof document !== 'undefined' && createPortal(
        <div id="print-token-container" className="hidden print:block bg-white text-gray-900 p-8 font-sans max-w-[800px] mx-auto">
          {/* Token Slip Header */}
          <div className="flex justify-between items-center border-b-2 border-emerald-700 pb-4 mb-6">
            <div>
              <h2 className="text-2xl font-black text-emerald-900 tracking-tight">OzoCare OPD TOKEN SLIP</h2>
              <p className="text-xs text-gray-500 font-semibold uppercase">Appointment & Clinic Queue Pass</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-emerald-800 bg-emerald-50 border-2 border-emerald-600 px-4 py-1.5 rounded-xl inline-block">
                TOKEN #{printingTokenApt.token_number || '1'}
              </span>
            </div>
          </div>

          {/* Token Details Grid */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 text-xs">
            <div>
              <span className="text-gray-500 block uppercase font-bold text-[10px]">Doctor / Specialist</span>
              <strong className="text-gray-900 text-sm">Dr. {printingTokenApt.care_doctors?.full_name || 'Specialist'}</strong>
              <p className="text-gray-600 mt-0.5 capitalize">{printingTokenApt.care_doctors?.specialty_slug?.replace(/_/g, ' ')}</p>
              <p className="text-gray-600 font-mono text-[11px]">Reg: {printingTokenApt.care_doctors?.council_registration_number || 'RMP Verified'}</p>
            </div>

            <div>
              <span className="text-gray-500 block uppercase font-bold text-[10px]">Clinic & Location</span>
              <strong className="text-gray-900">{printingTokenApt.care_doctors?.clinic_name || 'OzoCare Partner Clinic'}</strong>
              <p className="text-gray-600 mt-0.5">{printingTokenApt.care_doctors?.clinic_address || 'Aurangabad, Bihar'}</p>
            </div>

            <div>
              <span className="text-gray-500 block uppercase font-bold text-[10px]">Patient Name</span>
              <strong className="text-gray-900 text-sm">{printingTokenApt.patient_name}</strong>
              {printingTokenApt.patient_age && <span className="text-gray-600"> ({printingTokenApt.patient_age} Yrs, {printingTokenApt.patient_gender || 'Male'})</span>}
            </div>

            <div>
              <span className="text-gray-500 block uppercase font-bold text-[10px]">Scheduled Slot</span>
              <strong className="text-emerald-800 text-sm">{printingTokenApt.appointment_date}</strong>
              <p className="text-emerald-700 font-bold">{printingTokenApt.time_slot}</p>
            </div>

            <div>
              <span className="text-gray-500 block uppercase font-bold text-[10px]">Consultation Fee</span>
              <strong className="text-gray-900 text-sm">₹{printingTokenApt.consultation_fee || 500}</strong>
              <span className="text-gray-500 ml-1">({printingTokenApt.payment_status || 'Pay at clinic'})</span>
            </div>

            <div>
              <span className="text-gray-500 block uppercase font-bold text-[10px]">Booking Reference</span>
              <strong className="text-gray-900 font-mono text-sm">{printingTokenApt.appointment_number}</strong>
            </div>
          </div>

          {/* Instructions for Patient */}
          <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 mb-6 text-xs text-gray-700">
            <h4 className="font-bold text-emerald-900 mb-1.5 uppercase text-[11px]">OPD Instructions for Patient:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Please arrive at the clinic 10 minutes prior to your time slot: <strong>{printingTokenApt.time_slot}</strong>.</li>
              <li>Present this token slip or show SMS token <strong>#{printingTokenApt.token_number}</strong> at the clinic reception desk.</li>
              <li>Digital prescription will be available in your OzoCare account immediately after consultation.</li>
            </ul>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-[10px] text-gray-400">
            <span>OzoCare Digital Health Platform • Direct Clinic Tokens</span>
            <span>Helpline: +91 94708 07255 • ozomart.store/care</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
