import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, 
  ShieldCheck, AlertCircle, Clock, FileText, ShoppingBag, Eye, X, 
  ExternalLink, Stethoscope, RefreshCw, Sparkles
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWebRTC } from '../../hooks/useWebRTC'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function PatientConsultationRoom() {
  const { appointmentId } = useParams()
  const navigate = useNavigate()

  const [appointment, setAppointment] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasPermissions, setHasPermissions] = useState(false)
  const [activeSideDrawer, setActiveSideDrawer] = useState(false)
  const [livePrescription, setLivePrescription] = useState(null)
  const [showLeaveModal, setShowLeaveModal] = useState(false)

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)

  // Fetch appointment details
  useEffect(() => {
    const fetchApt = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('care_appointments')
          .select('*, care_doctors(*), care_prescriptions(*)')
          .or(`id.eq.${appointmentId},appointment_number.eq.${appointmentId}`)
          .single()

        if (error) throw error
        setAppointment(data)
        if (data.care_prescriptions && data.care_prescriptions.length > 0) {
          setLivePrescription(data.care_prescriptions[0])
        }
      } catch (err) {
        console.error('Failed to load consultation:', err)
        toast.error('Could not find appointment')
      } finally {
        setIsLoading(false)
      }
    }
    if (appointmentId) fetchApt()
  }, [appointmentId])

  // Listen for real-time prescription creation on this appointment
  useEffect(() => {
    if (!appointment?.id) return

    const sub = supabase
      .channel(`patient_rx_${appointment.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'care_prescriptions',
        filter: `appointment_id=eq.${appointment.id}`
      }, (payload) => {
        if (payload.new) {
          setLivePrescription(payload.new)
          toast.success('Dr. has issued your digital prescription (Rx)!', {
            duration: 6000,
            icon: '📋'
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(sub)
    }
  }, [appointment?.id])

  const roomId = appointment?.meeting_room_id || `care-room-${appointment?.appointment_number?.toLowerCase() || appointment?.id}`

  const {
    localStream,
    remoteStream,
    connectionState,
    isAudioMuted,
    isVideoDisabled,
    formattedDuration,
    errorMessage,
    toggleAudio,
    toggleVideo,
    endCall
  } = useWebRTC({
    roomId: appointment ? roomId : null,
    isInitiator: false, // Patient receives the offer and responds with answer
    userName: appointment?.patient_name || 'Patient'
  })

  // Attach streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream, isLoading])

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream, isLoading])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white font-sans">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-semibold text-slate-400">Connecting to OzoCare Teleconsult Room...</p>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white font-sans text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold">Consultation Room Not Found</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">This video link may have expired or is invalid.</p>
        <Link to="/care/my-appointments" className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-xs font-bold">
          Back to My Appointments
        </Link>
      </div>
    )
  }

  const doctor = appointment.care_doctors
  const attachments = Array.isArray(appointment.attachments) ? appointment.attachments : []
  const isDisconnected = connectionState === 'disconnected' || connectionState === 'ended' || connectionState === 'closed' || connectionState === 'failed'

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      
      {/* 1. TOP HEADER */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (connectionState === 'connected') {
                setShowLeaveModal(true)
              } else {
                endCall()
                navigate('/care/my-appointments')
              }
            }}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Back to Appointments"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
              <Stethoscope size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-white truncate">
                  Dr. {doctor?.full_name || 'Specialist Doctor'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 shrink-0">
                  Token #{appointment.token_number}
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 truncate block">
                {doctor?.qualification || 'Medical Practitioner'} • {doctor?.clinic_name}
              </span>
            </div>
          </div>
        </div>

        {/* Status & Timer & Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/80 shadow-inner">
            <div className={`w-2 h-2 rounded-full shrink-0 ${
              connectionState === 'connected' 
                ? 'bg-emerald-400 animate-pulse' 
                : connectionState === 'connecting'
                ? 'bg-amber-400 animate-ping'
                : 'bg-rose-500'
            }`} />
            <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-200 capitalize">
              {connectionState === 'connected' ? formattedDuration : connectionState}
            </span>
          </div>

          {/* Quick Leave Button when Disconnected */}
          {isDisconnected && (
            <button
              type="button"
              onClick={() => {
                endCall()
                navigate('/care/my-appointments')
              }}
              className="px-3 py-1 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-950 transition-all cursor-pointer animate-pulse"
              title="Leave Consultation Room"
            >
              <PhoneOff size={13} />
              <span>Leave VC</span>
            </button>
          )}

          <button
            onClick={() => setActiveSideDrawer(!activeSideDrawer)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeSideDrawer
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <FileText size={14} />
            <span className="hidden sm:inline">Records & Rx</span>
            <span className="sm:hidden">Rx</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN STAGE */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        
        {/* Video Frame */}
        <div className="flex-1 bg-black relative flex flex-col p-2 sm:p-3 min-h-0 overflow-hidden">
          <div className="flex-1 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden flex items-center justify-center min-h-0">
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className={`w-full h-full object-cover ${!remoteStream ? 'hidden' : ''}`}
            />
            {!remoteStream && (
              <div className="text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-400 flex items-center justify-center mx-auto animate-pulse">
                  <Stethoscope size={32} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Connecting with Dr. {doctor?.full_name}...</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Please ensure your camera and microphone are switched on. The doctor will appear here as soon as they pick up.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Waiting on Doctor's Video</span>
                </div>
              </div>
            )}

            {/* Patient Floating Self View PiP */}
            <div className="absolute top-4 right-4 w-28 h-20 sm:w-40 sm:h-28 rounded-xl bg-slate-950 border-2 border-slate-700/80 shadow-2xl overflow-hidden z-20">
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${isVideoDisabled ? 'hidden' : ''}`}
              />
              {isVideoDisabled && (
                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500 text-[10px] font-bold">
                  Camera Off
                </div>
              )}
              <span className="absolute bottom-1 left-2 text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                You
              </span>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="absolute top-4 left-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2 max-w-md z-30">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Real-time Rx Notification Banner */}
            {livePrescription && (
              <div className="absolute top-4 left-4 right-4 sm:right-auto bg-emerald-950/90 border border-emerald-500 p-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs z-30 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
                    <FileText size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-white block">Digital Prescription Issued!</span>
                    <span className="text-[11px] text-emerald-300">Diagnosis: {livePrescription.diagnosis}</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveSideDrawer(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer"
                >
                  View Rx
                </button>
              </div>
            )}

            {/* Floating Controls Dock (Always visible & elevated, never cut off) */}
            {!isDisconnected && (
              <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 sm:gap-3 bg-slate-900/95 backdrop-blur-md px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-slate-700/80 shadow-2xl">
                <button
                  type="button"
                  onClick={toggleAudio}
                  className={`p-2.5 sm:p-3 rounded-xl font-bold transition-all shadow-md active:scale-95 cursor-pointer ${
                    isAudioMuted 
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40' 
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                  title={isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isAudioMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                <button
                  type="button"
                  onClick={toggleVideo}
                  className={`p-2.5 sm:p-3 rounded-xl font-bold transition-all shadow-md active:scale-95 cursor-pointer ${
                    isVideoDisabled 
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40' 
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                  title={isVideoDisabled ? 'Turn Camera On' : 'Turn Camera Off'}
                >
                  {isVideoDisabled ? <VideoOff size={18} /> : <VideoIcon size={18} />}
                </button>

                <div className="h-6 w-px bg-slate-700/60 mx-0.5" />

                <button
                  type="button"
                  onClick={() => setShowLeaveModal(true)}
                  className="px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-950/60 transition-all cursor-pointer active:scale-95"
                >
                  <PhoneOff size={16} />
                  <span>Leave Call</span>
                </button>
              </div>
            )}

            {/* CALL DISCONNECTED / CONCLUDED OVERLAY (Shows automatically when doctor ends or call disconnects) */}
            {isDisconnected && (
              <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="relative max-w-md w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-rose-950/40 text-center overflow-hidden"
                >
                  {/* Decorative ambient radial glow */}
                  <div className="absolute -top-16 -right-16 w-36 h-36 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="relative">
                    {/* Icon Badge */}
                    <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-rose-500/20 to-red-600/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-4 shadow-inner">
                      <PhoneOff size={28} className="stroke-[2.2]" />
                    </div>

                    <h3 className="text-xl font-bold text-white font-display mb-1.5">
                      {connectionState === 'ended' ? 'Consultation Concluded' : 'Video Call Disconnected'}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed mb-5 max-w-xs mx-auto">
                      {connectionState === 'ended'
                        ? `Dr. ${doctor?.full_name || 'Your doctor'} has concluded this teleconsultation session.`
                        : `The live video consultation with Dr. ${doctor?.full_name || 'your doctor'} has ended.`}
                    </p>

                    {/* Session Summary Snapshot */}
                    <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/90 mb-5 text-left space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Doctor:</span>
                        <span className="font-semibold text-white">Dr. {doctor?.full_name || 'Practitioner'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Call Duration:</span>
                        <span className="font-mono font-bold text-emerald-400">{formattedDuration}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Digital Prescription:</span>
                        {livePrescription ? (
                          <span className="font-semibold text-emerald-400 flex items-center gap-1 text-[11px]">
                            <FileText size={12} /> Issued ({livePrescription.diagnosis})
                          </span>
                        ) : (
                          <span className="text-amber-400 font-medium text-[11px]">
                            Viewable in Appointments
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Prominent Action Buttons */}
                    <div className="space-y-2.5">
                      {livePrescription && (
                        <button
                          type="button"
                          onClick={() => setActiveSideDrawer(true)}
                          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer active:scale-95"
                        >
                          <FileText size={15} />
                          <span>View Digital Prescription</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          endCall()
                          navigate('/care/my-appointments')
                        }}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/60 active:scale-95 transition-all cursor-pointer"
                      >
                        <PhoneOff size={15} />
                        <span>Leave Consultation Room</span>
                      </button>

                      {connectionState !== 'ended' && (
                        <button
                          type="button"
                          onClick={() => window.location.reload()}
                          className="w-full py-2 px-3 text-slate-400 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RefreshCw size={12} />
                          <span>Accidental Disconnect? Reconnect</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>

        {/* Side Drawer for Patient Records & Rx */}
        {activeSideDrawer && (
          <div className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col p-4 space-y-4 overflow-y-auto shrink-0 z-30">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <FileText size={16} className="text-emerald-400" />
                Consultation Vault
              </h3>
              <button 
                onClick={() => setActiveSideDrawer(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Issued Rx section */}
            {livePrescription ? (
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 text-sm">Official e-Prescription</span>
                  <span className="text-[10px] text-slate-400">{new Date(livePrescription.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-slate-200">
                  <strong>Diagnosis:</strong> {livePrescription.diagnosis}
                </p>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Medicines:</span>
                  {livePrescription.medicines?.map((m, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex justify-between text-[11px]">
                      <span className="font-semibold text-white">{m.name}</span>
                      <span className="text-emerald-400 font-mono">{m.dosage} ({m.duration})</span>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-slate-400 pt-1">
                  <strong>Advice:</strong> {livePrescription.general_advice}
                </p>

                <button
                  onClick={() => navigate('/care/order-medicines', { state: { preselectedRx: livePrescription } })}
                  className="w-full mt-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
                >
                  <ShoppingBag size={14} /> Order Medicines (1-Click Delivery)
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
                Prescription will appear here as soon as the doctor writes it during call.
              </div>
            )}

            {/* Attached documents */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Your Uploaded Documents ({attachments.length}):
              </span>
              {attachments.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No files attached to this token.</p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <span className="truncate text-white text-[11px] font-medium">{file.name}</span>
                      <a 
                        href={file.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 font-semibold text-[11px] flex items-center gap-1"
                      >
                        <Eye size={12} /> View
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* LEAVE CONSULTATION MODAL */}
      <AnimatePresence>
        {showLeaveModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 14 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative max-w-md w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-rose-950/40 overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-rose-500/15 rounded-full blur-2xl pointer-events-none" />

              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/20 to-red-600/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-inner">
                    <PhoneOff size={22} className="stroke-[2.2]" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLeaveModal(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <h3 className="text-lg font-bold text-white font-display mb-1.5">
                  Leave Consultation Room?
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  Are you sure you want to disconnect from Dr. {doctor?.full_name || 'Specialist'}? You can view any prescriptions issued directly in your Appointments dashboard.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowLeaveModal(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700/60 transition-all cursor-pointer text-center"
                  >
                    Stay in Call
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLeaveModal(false)
                      endCall()
                      navigate('/care/my-appointments')
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/60 active:scale-95 transition-all cursor-pointer"
                  >
                    <PhoneOff size={15} />
                    <span>Leave Call</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
