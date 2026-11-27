import React, { useState, useEffect, useRef } from 'react'
import { 
  Mic, MicOff, Video as VideoIcon, VideoOff, MonitorUp, PhoneOff, 
  Maximize2, Minimize2, FileText, Image as ImageIcon, Eye, Download, 
  ShieldCheck, AlertCircle, Plus, Trash2, Clock, CheckCircle2, ChevronRight,
  ExternalLink, User, X, RefreshCw, Copy, Activity, Share2, GripVertical
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useWebRTC } from '../../hooks/useWebRTC'
import { useDoctorStore } from '../../stores/doctorStore'
import toast from 'react-hot-toast'

export default function DoctorTeleconsultWorkstation({ 
  appointment, 
  onClose, 
  onPrescriptionIssued 
}) {
  const { createPrescription, doctor } = useDoctorStore()

  const [activeSideTab, setActiveSideTab] = useState('records') // 'records' | 'rx' | 'notes'
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedImagePreview, setSelectedImagePreview] = useState(null)
  const [selectedPdfPreview, setSelectedPdfPreview] = useState(null)

  // Prescription State
  const [diagnosis, setDiagnosis] = useState(
    appointment?.symptoms || appointment?.symptoms_description 
      ? `Evaluation for: ${appointment.symptoms || appointment.symptoms_description}` 
      : 'Clinical Teleconsultation'
  )
  const [generalAdvice, setGeneralAdvice] = useState('Take adequate bed rest, stay hydrated with warm water.')
  const [followUpDate, setFollowUpDate] = useState('')
  const [medicines, setMedicines] = useState([
    { name: '', dosage: '1-0-1', duration: '5 Days', instructions: 'After food' }
  ])
  const [isSubmittingRx, setIsSubmittingRx] = useState(false)
  const [rxIssuedSuccess, setRxIssuedSuccess] = useState(false)

  // Clinical Notes State
  const [clinicalNotes, setClinicalNotes] = useState('')

  // Video Stream Elements Ref
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const workstationRef = useRef(null)
  const stageContainerRef = useRef(null)

  const roomId = appointment?.meeting_room_id || `care-room-${appointment?.appointment_number?.toLowerCase() || appointment?.id}`

  const {
    localStream,
    remoteStream,
    connectionState,
    isAudioMuted,
    isVideoDisabled,
    isScreenSharing,
    formattedDuration,
    errorMessage,
    peerName,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    endCall
  } = useWebRTC({
    roomId,
    isInitiator: true, // Doctor creates the SDP offer
    userName: `Dr. ${doctor?.full_name || 'Practitioner'}`
  })

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId)
    toast.success('Room ID copied to clipboard!')
  }

  const copyPatientLink = () => {
    const link = `${window.location.origin}/care/my-appointments`
    navigator.clipboard.writeText(link)
    toast.success('Patient consultation link copied!')
  }

  // Attach local stream to video tag
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  // Attach remote stream to video tag
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      workstationRef.current?.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  // Prescription Helper
  const handleAddMedicine = () => {
    setMedicines([...medicines, { name: '', dosage: '1-0-1', duration: '5 Days', instructions: 'After food' }])
  }

  const handleUpdateMedicine = (index, field, value) => {
    const updated = [...medicines]
    updated[index][field] = value
    setMedicines(updated)
  }

  const handleRemoveMedicine = (index) => {
    if (medicines.length === 1) return
    setMedicines(medicines.filter((_, idx) => idx !== index))
  }

  const handleIssuePrescription = async (e) => {
    e.preventDefault()
    if (!diagnosis.trim()) {
      toast.error('Please enter clinical diagnosis')
      return
    }

    const validMeds = medicines.filter(m => m.name.trim().length > 0)
    if (validMeds.length === 0) {
      toast.error('Add at least one medicine to the prescription')
      return
    }

    setIsSubmittingRx(true)
    try {
      const rxPayload = {
        diagnosis: diagnosis.trim(),
        medicines: validMeds,
        general_advice: generalAdvice.trim(),
        follow_up_date: followUpDate || null
      }

      const res = await createPrescription(appointment, rxPayload)
      if (res) {
        setRxIssuedSuccess(true)
        toast.success(`Digital Rx successfully issued to ${appointment.patient_name}!`)
        if (onPrescriptionIssued) onPrescriptionIssued(res)
      }
    } catch (err) {
      toast.error('Failed to issue prescription')
    } finally {
      setIsSubmittingRx(false)
    }
  }

  const attachments = Array.isArray(appointment?.attachments) ? appointment.attachments : []

  return (
    <div 
      ref={workstationRef}
      className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden"
    >
      {/* 1. TOP STATUS BAR */}
      <header className="h-16 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-sm z-30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 shrink-0">
            OPD
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm sm:text-base text-white truncate font-display">
                Teleconsultation: {appointment?.patient_name}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shrink-0">
                Token #{appointment?.token_number || '1'}
              </span>
              <span className="text-xs text-slate-400 font-medium px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-700/50 hidden md:inline shrink-0">
                {appointment?.patient_age ? `${appointment.patient_age} yrs, ` : ''}{appointment?.patient_gender || 'Patient'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-slate-400 font-mono truncate">
                Room: {roomId}
              </span>
              <button
                type="button"
                onClick={copyRoomId}
                className="text-slate-400 hover:text-emerald-400 p-0.5 transition-colors cursor-pointer"
                title="Copy Room ID"
              >
                <Copy size={11} />
              </button>
            </div>
          </div>
        </div>

        {/* Call Timer & Status Indicator */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 shadow-inner">
            <div className={`w-2 h-2 rounded-full shrink-0 ${
              connectionState === 'connected' 
                ? 'bg-emerald-400 animate-pulse' 
                : connectionState === 'connecting'
                ? 'bg-amber-400 animate-ping'
                : 'bg-rose-500'
            }`} />
            <span className="text-xs font-mono font-bold text-slate-200 capitalize">
              {connectionState === 'connected' ? formattedDuration : `${connectionState}...`}
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-rose-500/20 hover:border-rose-500/40 border border-slate-700/50 text-slate-300 hover:text-rose-400 transition-all cursor-pointer"
            title="Close Desk"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* 2. DUAL PANEL WORKSPACE BODY */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT STAGE: WEBRTC VIDEO STAGE (65% width) */}
        <div className="flex-1 bg-[#090d14] relative flex flex-col justify-between overflow-hidden p-3 sm:p-5">
          
          {/* Main Remote Video (Patient) */}
          <div 
            ref={stageContainerRef}
            className="flex-1 rounded-3xl bg-slate-900/90 border border-slate-800/90 relative overflow-hidden flex items-center justify-center shadow-2xl"
          >
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className={`w-full h-full object-cover ${!remoteStream ? 'hidden' : ''}`}
            />
            {!remoteStream && (
              <div className="text-center p-6 sm:p-8 space-y-4 max-w-md mx-auto">
                <div className="relative inline-flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/70 flex items-center justify-center text-emerald-400 relative z-10 shadow-2xl">
                    <User size={38} className="text-slate-300" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base sm:text-lg font-bold text-white font-display">Waiting for Patient to Connect...</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <span className="text-slate-200 font-semibold">{appointment.patient_name}</span> has received the teleconsult link for Token #{appointment.token_number}. Once they enter the room, live audio and video will activate automatically.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold shadow-xs">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Signaling Channel Active</span>
                  </div>
                  <button
                    type="button"
                    onClick={copyPatientLink}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Share2 size={12} />
                    <span>Copy Patient Join Link</span>
                  </button>
                </div>
              </div>
            )}

            {/* Draggable Doctor Self-Stream PiP */}
            <motion.div 
              drag
              dragConstraints={stageContainerRef}
              dragElastic={0.08}
              dragMomentum={false}
              whileDrag={{ scale: 1.04, zIndex: 50 }}
              className="absolute top-4 right-4 w-36 h-28 sm:w-48 sm:h-36 rounded-2xl bg-slate-950 border border-slate-700/80 shadow-2xl overflow-hidden z-20 ring-1 ring-black/50 group cursor-grab active:cursor-grabbing select-none touch-none"
            >
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover pointer-events-none ${isVideoDisabled ? 'hidden' : ''}`}
              />
              {isVideoDisabled && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500 text-xs font-bold gap-1 pointer-events-none">
                  <VideoOff size={18} />
                  <span>Camera Off</span>
                </div>
              )}
              {/* Drag Grip Handle Hint on hover */}
              <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md p-1 rounded-md text-white/70 pointer-events-none">
                <GripVertical size={13} />
              </div>
              <div className="absolute bottom-1.5 left-2 bg-slate-900/85 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10 text-[10px] font-bold text-white flex items-center gap-1.5 shadow-sm pointer-events-none">
                <div className={`w-1.5 h-1.5 rounded-full ${isAudioMuted ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                <span>You (Dr)</span>
              </div>
            </motion.div>

            {/* Error Message Toast in stage */}
            {errorMessage && (
              <div className="absolute top-4 left-4 p-3 rounded-2xl bg-rose-950/90 border border-rose-800/90 text-rose-200 text-xs flex items-center gap-2 max-w-md z-30 shadow-xl backdrop-blur-md">
                <AlertCircle size={16} className="shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Chief Complaints Overlay Pill */}
            <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md border border-slate-800/90 p-3 rounded-2xl max-w-md text-xs z-10 hidden sm:block shadow-xl">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                <Activity size={12} />
                <span>Patient Reported Symptoms</span>
              </div>
              <p className="text-slate-100 font-medium truncate">
                {appointment.symptoms || appointment.symptoms_description || 'General Health Examination'}
              </p>
            </div>
          </div>

          {/* Floating Dock Calling Control Bar */}
          <div className="mt-4 flex items-center justify-center shrink-0">
            <div className="px-4 py-2 rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-slate-800/90 shadow-2xl shadow-black/80 flex items-center gap-2.5 sm:gap-3">
              {/* Audio Mute/Unmute */}
              <button
                onClick={toggleAudio}
                className={`w-11 h-11 rounded-2xl font-bold transition-all shadow-md flex items-center justify-center active:scale-95 cursor-pointer ${
                  isAudioMuted 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/60'
                }`}
                title={isAudioMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isAudioMuted ? <MicOff size={19} /> : <Mic size={19} />}
              </button>

              {/* Video Enable/Disable */}
              <button
                onClick={toggleVideo}
                className={`w-11 h-11 rounded-2xl font-bold transition-all shadow-md flex items-center justify-center active:scale-95 cursor-pointer ${
                  isVideoDisabled 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/60'
                }`}
                title={isVideoDisabled ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isVideoDisabled ? <VideoOff size={19} /> : <VideoIcon size={19} />}
              </button>

              {/* Screen Share */}
              <button
                onClick={toggleScreenShare}
                className={`w-11 h-11 rounded-2xl font-bold transition-all shadow-md flex items-center justify-center active:scale-95 cursor-pointer ${
                  isScreenSharing 
                    ? 'bg-sky-500 text-white shadow-sky-500/30 border border-sky-400' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/60'
                }`}
                title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen with Patient'}
              >
                <MonitorUp size={19} />
              </button>

              <div className="h-6 w-px bg-slate-700/60 mx-0.5" />

              {/* End Consultation Button */}
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to conclude this video consultation?')) {
                    endCall()
                    onClose()
                  }
                }}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-950/60 active:scale-95 transition-all cursor-pointer"
              >
                <PhoneOff size={17} />
                <span>Conclude Call</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT INTERACTIVE PANEL (35% width, Tabbed: Records | Rx Studio | Notes) */}
        <div className="w-full lg:w-[420px] bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col shrink-0">
          
          {/* Sub Navigation Segmented Tabs */}
          <div className="p-2.5 bg-slate-950/70 border-b border-slate-800/80 flex gap-1.5 shrink-0">
            <button
              onClick={() => setActiveSideTab('records')}
              className={`flex-1 py-2 px-2.5 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeSideTab === 'records'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <ImageIcon size={14} />
              <span>Records ({attachments.length})</span>
            </button>

            <button
              onClick={() => setActiveSideTab('rx')}
              className={`flex-1 py-2 px-2.5 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeSideTab === 'rx'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <FileText size={14} />
              <span>Digital Rx {rxIssuedSuccess ? '✓' : ''}</span>
            </button>

            <button
              onClick={() => setActiveSideTab('notes')}
              className={`flex-1 py-2 px-2.5 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeSideTab === 'notes'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <Clock size={14} />
              <span>Doctor Notes</span>
            </button>
          </div>

          {/* TAB 1: PATIENT ATTACHED RECORDS & LAB REPORTS */}
          {activeSideTab === 'records' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-white text-sm">Patient Uploaded Documents</h4>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Uploaded by {appointment.patient_name} for this appointment token.
                </p>
              </div>

              {attachments.length === 0 ? (
                <div className="py-14 px-6 text-center rounded-2xl bg-slate-950/50 border border-dashed border-slate-800/90 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-emerald-400/80">
                    <FileText size={22} />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs">No Medical Records Attached</h5>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Patient did not attach external lab reports or imaging photos for this consultation.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {attachments.map((doc, idx) => {
                    const isPdf = doc.file_type?.includes('pdf') || doc.name?.endsWith('.pdf')

                    return (
                      <div 
                        key={idx}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                              {isPdf ? (
                                <FileText size={18} className="text-rose-500" />
                              ) : (
                                <ImageIcon size={18} className="text-emerald-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-white truncate block text-xs">
                                {doc.name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {isPdf ? 'PDF Medical Document' : 'Clinical Image'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isPdf ? (
                              <button
                                onClick={() => setSelectedPdfPreview(doc)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1"
                              >
                                <Eye size={12} /> View
                              </button>
                            ) : (
                              <button
                                onClick={() => setSelectedImagePreview(doc)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1"
                              >
                                <Eye size={12} /> Zoom
                              </button>
                            )}
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-lg text-slate-400 hover:text-white"
                              title="Open External"
                            >
                              <ExternalLink size={13} />
                            </a>
                          </div>
                        </div>

                        {/* Thumbnail image inline preview */}
                        {!isPdf && (
                          <div 
                            onClick={() => setSelectedImagePreview(doc)}
                            className="h-28 rounded-lg overflow-hidden border border-slate-800/80 cursor-pointer group relative"
                          >
                            <img 
                              src={doc.url} 
                              alt={doc.name} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                              <Eye size={14} /> Click to Zoom
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIVE DIGITAL RX STUDIO */}
          {activeSideTab === 'rx' && (
            <form onSubmit={handleIssuePrescription} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Live Prescription Authoring</h4>
                  <p className="text-[11px] text-slate-400">Issue official Rx during consultation.</p>
                </div>
                {rxIssuedSuccess && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Issued
                  </span>
                )}
              </div>

              {/* Diagnosis Field */}
              <div>
                <label className="font-bold text-slate-300 block mb-1">Clinical Diagnosis *</label>
                <input 
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Acute Pharyngitis with Viral Fever"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                  required
                />
              </div>

              {/* Medicines List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-300">Prescribed Medicines *</label>
                  <button
                    type="button"
                    onClick={handleAddMedicine}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Medicine
                  </button>
                </div>

                <div className="space-y-2">
                  {medicines.map((med, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input 
                          type="text"
                          placeholder="Medicine Name (e.g. Paracetamol 650mg)"
                          value={med.name}
                          onChange={(e) => handleUpdateMedicine(idx, 'name', e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        {medicines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicine(idx)}
                            className="p-1.5 text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-0.5">Dosage</span>
                          <input 
                            type="text"
                            placeholder="1-0-1"
                            value={med.dosage}
                            onChange={(e) => handleUpdateMedicine(idx, 'dosage', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-0.5">Duration</span>
                          <input 
                            type="text"
                            placeholder="5 Days"
                            value={med.duration}
                            onChange={(e) => handleUpdateMedicine(idx, 'duration', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-0.5">Instructions</span>
                          <input 
                            type="text"
                            placeholder="After meals"
                            value={med.instructions}
                            onChange={(e) => handleUpdateMedicine(idx, 'instructions', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* General Advice */}
              <div>
                <label className="font-bold text-slate-300 block mb-1">Dietary & General Advice</label>
                <textarea 
                  rows={2}
                  value={generalAdvice}
                  onChange={(e) => setGeneralAdvice(e.target.value)}
                  placeholder="Drink warm water, avoid oily food, complete antibiotic course..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              {/* Follow Up Date */}
              <div>
                <label className="font-bold text-slate-300 block mb-1">Recommended Follow-up (Optional)</label>
                <input 
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              {/* Submit Rx Button */}
              <button
                type="submit"
                disabled={isSubmittingRx}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-all disabled:opacity-50"
              >
                {isSubmittingRx ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing & Sending Digital Rx...</span>
                  </>
                ) : (
                  <>
                    <FileText size={14} />
                    <span>Generate & Send Digital Rx</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: CLINICAL NOTES */}
          {activeSideTab === 'notes' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-white text-sm">Private Clinical Notes</h4>
                <p className="text-[11px] text-slate-400">Doctor internal remarks for this case.</p>
              </div>

              <textarea 
                rows={10}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Note blood pressure readings, temperature observations, allergies, or chronic conditions here..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs leading-relaxed"
              />

              <button
                type="button"
                onClick={() => toast.success('Clinical notes saved locally')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
              >
                Save Notes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. LIGHTBOX IMAGE PREVIEW MODAL */}
      {selectedImagePreview && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setSelectedImagePreview(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-slate-300"
            >
              <X size={24} />
            </button>
            <img 
              src={selectedImagePreview.url} 
              alt={selectedImagePreview.name} 
              className="max-h-[80vh] w-auto rounded-xl object-contain shadow-2xl border border-slate-800"
            />
            <div className="mt-3 flex items-center gap-3 text-xs text-white">
              <span className="font-semibold">{selectedImagePreview.name}</span>
              <a 
                href={selectedImagePreview.url} 
                target="_blank" 
                rel="noreferrer"
                download
                className="px-3 py-1 rounded-lg bg-emerald-600 text-white flex items-center gap-1.5"
              >
                <Download size={12} /> Download
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 4. PDF DOCUMENT EMBED MODAL */}
      {selectedPdfPreview && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full h-[85vh] bg-slate-900 rounded-2xl border border-slate-800 flex flex-col overflow-hidden">
            <div className="h-12 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between">
              <span className="font-bold text-sm text-white flex items-center gap-2">
                <FileText size={16} className="text-rose-500" />
                {selectedPdfPreview.name}
              </span>
              <div className="flex items-center gap-2">
                <a 
                  href={selectedPdfPreview.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-3 py-1 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1"
                >
                  <ExternalLink size={12} /> Open in New Tab
                </a>
                <button
                  onClick={() => setSelectedPdfPreview(null)}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <iframe 
              src={selectedPdfPreview.url} 
              title={selectedPdfPreview.name}
              className="flex-1 w-full bg-slate-950"
            />
          </div>
        </div>
      )}
    </div>
  )
}
