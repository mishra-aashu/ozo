// Audio Alert Engine for OZO Service Manager Portal
// Uses HTML5 Audio with fallback to Web Audio API synthesized alert chime

let audioContext = null

export const playServiceAlertSound = () => {
  try {
    // Try Web Audio API synthesized high-priority chime
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return

    if (!audioContext) {
      audioContext = new AudioCtx()
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }

    const now = audioContext.currentTime

    // Oscillator 1 (Primary High Chime)
    const osc1 = audioContext.createOscillator()
    const gain1 = audioContext.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, now) // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15) // A5
    gain1.gain.setValueAtTime(0.25, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    osc1.connect(gain1)
    gain1.connect(audioContext.destination)
    osc1.start(now)
    osc1.stop(now + 0.35)

    // Oscillator 2 (Harmonic Accent)
    const osc2 = audioContext.createOscillator()
    const gain2 = audioContext.createGain()
    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(880, now + 0.15)
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3) // D6
    gain2.gain.setValueAtTime(0.2, now + 0.15)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
    osc2.connect(gain2)
    gain2.connect(audioContext.destination)
    osc2.start(now + 0.15)
    osc2.stop(now + 0.5)
  } catch (err) {
    console.warn('Audio chime playback error:', err)
  }
}
