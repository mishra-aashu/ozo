import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
}

export function useWebRTC({ roomId, isInitiator = false, userName = 'Participant' }) {
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [connectionState, setConnectionState] = useState('initializing') // 'initializing' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'ended'
  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [isVideoDisabled, setIsVideoDisabled] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [errorMessage, setErrorMessage] = useState(null)
  const [peerName, setPeerName] = useState('')

  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  const channelRef = useRef(null)
  const timerIntervalRef = useRef(null)
  const screenTrackRef = useRef(null)
  const originalVideoTrackRef = useRef(null)
  const pendingCandidatesRef = useRef([])

  // 1. Initialize Local Media Stream
  const initLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      localStreamRef.current = stream
      setLocalStream(stream)
      return stream
    } catch (err) {
      console.error('[WebRTC] Media access error:', err)
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Camera/Microphone permission denied. Please allow access in browser settings.'
          : 'Could not detect camera or microphone on this device.'
      )
      setConnectionState('failed')
      return null
    }
  }, [])

  // 2. Setup RTCPeerConnection
  const createPeerConnection = useCallback((stream) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }

    const pc = new RTCPeerConnection(ICE_SERVERS)
    peerConnectionRef.current = pc

    // Add local tracks to peer connection
    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream)
      })
    }

    // Remote Track Listener
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0])
      }
    }

    // ICE Candidate Listener
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: {
            type: 'candidate',
            candidate: event.candidate,
            sender: userName
          }
        })
      }
    }

    // Connection State Change
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      setConnectionState(state)

      if (state === 'connected') {
        // Start call duration timer
        if (!timerIntervalRef.current) {
          timerIntervalRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1)
          }, 1000)
        }
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current)
          timerIntervalRef.current = null
        }
      }
    }

    return pc
  }, [userName])

  // Process pending ICE candidates once remote description is set
  const processPendingCandidates = async () => {
    if (!peerConnectionRef.current || !peerConnectionRef.current.remoteDescription) return
    while (pendingCandidatesRef.current.length > 0) {
      const candidate = pendingCandidatesRef.current.shift()
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.warn('[WebRTC] Error adding pending ICE candidate:', err)
      }
    }
  }

  // 3. Initiate Offer (Caller Side)
  const sendOffer = useCallback(async () => {
    const pc = peerConnectionRef.current
    if (!pc || !channelRef.current) return

    try {
      setConnectionState('connecting')
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      })
      await pc.setLocalDescription(offer)

      await channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload: {
          type: 'offer',
          sdp: offer,
          sender: userName
        }
      })
    } catch (err) {
      console.error('[WebRTC] Error creating offer:', err)
    }
  }, [userName])

  // 4. Handle Received Offer & Send Answer
  const handleOffer = useCallback(async (offer, sender) => {
    const pc = peerConnectionRef.current
    if (!pc || !channelRef.current) return

    try {
      setPeerName(sender)
      setConnectionState('connecting')
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      await processPendingCandidates()

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      await channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload: {
          type: 'answer',
          sdp: answer,
          sender: userName
        }
      })
    } catch (err) {
      console.error('[WebRTC] Error responding to offer:', err)
    }
  }, [userName])

  // 5. Handle Received Answer
  const handleAnswer = useCallback(async (answer, sender) => {
    const pc = peerConnectionRef.current
    if (!pc) return

    try {
      setPeerName(sender)
      await pc.setRemoteDescription(new RTCSessionDescription(answer))
      await processPendingCandidates()
    } catch (err) {
      console.error('[WebRTC] Error setting remote answer:', err)
    }
  }, [])

  // 6. Handle Received Candidate
  const handleCandidate = useCallback(async (candidate) => {
    const pc = peerConnectionRef.current
    if (!pc) return

    if (pc.remoteDescription && pc.remoteDescription.type) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.warn('[WebRTC] Error adding received candidate:', err)
      }
    } else {
      pendingCandidatesRef.current.push(candidate)
    }
  }, [])

  // 7. Supabase Realtime Signaling Channel Setup
  useEffect(() => {
    if (!roomId) return

    let isMounted = true

    const setupSignaling = async () => {
      const stream = await initLocalMedia()
      if (!stream || !isMounted) return

      const pc = createPeerConnection(stream)

      // Connect to Supabase Realtime broadcast channel
      const safeRoomId = roomId.replace(/[^a-zA-Z0-9_-]/g, '_')
      const channel = supabase.channel(`webrtc_room_${safeRoomId}`, {
        config: { broadcast: { self: false } }
      })
      channelRef.current = channel

      channel
        .on('broadcast', { event: 'webrtc-signal' }, async ({ payload }) => {
          if (!payload) return

          switch (payload.type) {
            case 'peer-ready':
              // When peer enters, if we are initiator, send offer
              if (isInitiator) {
                await sendOffer()
              }
              break

            case 'offer':
              await handleOffer(payload.sdp, payload.sender)
              break

            case 'answer':
              await handleAnswer(payload.sdp, payload.sender)
              break

            case 'candidate':
              await handleCandidate(payload.candidate)
              break

            case 'call-ended':
              setConnectionState('ended')
              break

            default:
              break
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionState('connecting')
            // Announce presence
            channel.send({
              type: 'broadcast',
              event: 'webrtc-signal',
              payload: {
                type: 'peer-ready',
                sender: userName
              }
            })

            // If initiator, send offer after a tiny delay to allow channel discovery
            if (isInitiator) {
              setTimeout(() => {
                sendOffer()
              }, 600)
            }
          }
        })
    }

    setupSignaling()

    return () => {
      isMounted = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [roomId, isInitiator, userName, initLocalMedia, createPeerConnection, sendOffer, handleOffer, handleAnswer, handleCandidate])

  // 8. Media Toggle Controls
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioMuted(!audioTrack.enabled)
      }
    }
  }, [])

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoDisabled(!videoTrack.enabled)
      }
    }
  }, [])

  const toggleScreenShare = useCallback(async () => {
    const pc = peerConnectionRef.current
    if (!pc) return

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const screenTrack = screenStream.getVideoTracks()[0]
        screenTrackRef.current = screenTrack

        // Store original camera track
        const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video')
        if (videoSender) {
          originalVideoTrackRef.current = videoSender.track
          await videoSender.replaceTrack(screenTrack)
        }

        screenTrack.onended = () => {
          // Auto revert when user clicks browser's native "Stop sharing"
          if (videoSender && originalVideoTrackRef.current) {
            videoSender.replaceTrack(originalVideoTrackRef.current)
          }
          setIsScreenSharing(false)
        }

        setIsScreenSharing(true)
      } catch (err) {
        console.warn('[WebRTC] Screen share cancelled or not allowed:', err)
      }
    } else {
      // Revert to camera
      if (screenTrackRef.current) {
        screenTrackRef.current.stop()
      }
      const videoSender = pc.getSenders().find((s) => s.track && s.track.kind === 'video')
      if (videoSender && originalVideoTrackRef.current) {
        await videoSender.replaceTrack(originalVideoTrackRef.current)
      }
      setIsScreenSharing(false)
    }
  }, [isScreenSharing])

  const endCall = useCallback(async () => {
    if (channelRef.current) {
      try {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: {
            type: 'call-ended',
            sender: userName
          }
        })
      } catch (err) {
        console.warn('[WebRTC] Could not send call-ended signal:', err)
      }
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
    }

    setConnectionState('ended')
  }, [userName])

  // Format call duration MM:SS
  const formatDuration = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return {
    localStream,
    remoteStream,
    connectionState,
    isAudioMuted,
    isVideoDisabled,
    isScreenSharing,
    callDuration,
    formattedDuration: formatDuration(callDuration),
    errorMessage,
    peerName,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    endCall
  }
}
