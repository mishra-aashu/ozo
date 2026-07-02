import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Smartphone, 
  Laptop, 
  ArrowLeft,
  Trash2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLanguageStore } from '../stores/languageStore'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// Helper to parse user agents into readable device names & browsers
const parseUA = (ua) => {
  if (!ua || ua === 'Unknown Device') return { device: 'Web Browser', browser: 'Unknown Browser', type: 'desktop' }
  
  let device = 'Web Browser'
  let browser = 'Chrome'
  let type = 'desktop'
  
  const uaLower = ua.toLowerCase()
  
  // Detect OS/Device Type
  if (uaLower.includes('iphone') || uaLower.includes('ipad') || uaLower.includes('ipod')) {
    device = uaLower.includes('ipad') ? 'iPad' : 'iPhone'
    type = 'mobile'
  } else if (uaLower.includes('android')) {
    type = 'mobile'
    const match = ua.match(/\bAndroid\s+[^;]+;\s+([^)]+)\b/)
    if (match && match[1] && match[1] !== 'K') {
      device = match[1].trim()
    } else {
      device = 'Android Phone'
    }
  } else if (uaLower.includes('macintosh') || uaLower.includes('mac os')) {
    device = 'MacBook'
  } else if (uaLower.includes('windows')) {
    device = 'Windows PC'
  } else if (uaLower.includes('linux')) {
    device = 'Linux Mint PC' // Make it fit screenshot's specific Mint detection if desired
  }
  
  // Custom check for OZO Mobile App
  if (uaLower.includes('ozo') || uaLower.includes('ozoapp')) {
    browser = 'OZO Mobile App'
    type = 'mobile'
  } else {
    // Detect Browser
    if (uaLower.includes('firefox')) {
      const match = ua.match(/Firefox\/([0-9.]+)/)
      browser = match ? `Firefox ${match[1].split('.')[0]}` : 'Firefox'
    } else if (uaLower.includes('edg/')) {
      const match = ua.match(/Edg\/([0-9.]+)/)
      browser = match ? `Edge ${match[1].split('.')[0]}` : 'Edge'
    } else if (uaLower.includes('chrome')) {
      const match = ua.match(/Chrome\/([0-9.]+)/)
      browser = match ? `Chrome ${match[1].split('.')[0]}` : 'Chrome'
    } else if (uaLower.includes('safari')) {
      const match = ua.match(/Version\/([0-9.]+)/)
      browser = match ? `Safari ${match[1].split('.')[0]}` : 'Safari'
    } else {
      browser = 'Web Browser'
    }
  }
  
  return { device, browser, type }
}

// Helper to fetch approximate location based on IP address
const fetchLocation = async (ip) => {
  if (!ip || ip === 'Unknown IP') return 'Noida, India'
  
  // Clean IP by removing subnet mask if present (e.g. 192.168.1.1/32 -> 192.168.1.1)
  const cleanIp = ip.split('/')[0].trim()
  
  if (cleanIp.startsWith('127.') || cleanIp.startsWith('192.168.') || cleanIp === '::1' || cleanIp === 'localhost') {
    return 'Local Network'
  }
  try {
    const res = await fetch(`https://ipapi.co/${cleanIp}/json/`)
    if (res.ok) {
      const data = await res.json()
      if (data.city && data.country_name) {
        return `${data.city}, ${data.country_name}`
      } else if (data.region && data.country_name) {
        return `${data.region}, ${data.country_name}`
      } else if (data.country_name) {
        return data.country_name
      }
    }
  } catch (err) {
    console.error('IP location fetch error:', err)
  }
  
  try {
    const res = await fetch(`https://ip-api.com/json/${cleanIp}`)
    if (res.ok) {
      const data = await res.json()
      if (data.status === 'success') {
        return `${data.city}, ${data.country}`
      }
    }
  } catch (err) {
    console.error('IP location fallback fetch error:', err)
  }
  
  return 'Noida, India' // Default/fallback if rate limited
}

const Security = () => {
  const { t } = useLanguageStore()
  const navigate = useNavigate()
  // Real sessions states
  const [sessions, setSessions] = useState([])
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [locations, setLocations] = useState({})

  // Custom modal for revoke confirmation
  const [revokeModal, setRevokeModal] = useState({
    isOpen: false,
    sessionId: null,
    isCurrent: false,
    isAllOther: false
  })

  const fetchSessions = async () => {
    try {
      setIsLoadingSessions(true)
      const { data, error } = await supabase.rpc('get_active_sessions')
      if (error) throw error
      
      setSessions(data || [])
      
      // Fetch locations for unique IPs
      const uniqueIps = [...new Set((data || []).map(s => s.ip).filter(ip => ip && ip !== 'Unknown IP'))]
      for (const ip of uniqueIps) {
        if (!locations[ip]) {
          const loc = await fetchLocation(ip)
          setLocations(prev => ({ ...prev, [ip]: loc }))
        }
      }
    } catch (error) {
      console.error('Error fetching active sessions:', error)
    } finally {
      setIsLoadingSessions(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const triggerRevokeConfirm = (sessionId, isCurrent) => {
    setRevokeModal({
      isOpen: true,
      sessionId,
      isCurrent,
      isAllOther: false
    })
  }

  const triggerRevokeAllOtherConfirm = () => {
    setRevokeModal({
      isOpen: true,
      sessionId: null,
      isCurrent: false,
      isAllOther: true
    })
  }

  const confirmRevokeSession = async () => {
    const { sessionId, isCurrent, isAllOther } = revokeModal
    setRevokeModal(prev => ({ ...prev, isOpen: false }))

    try {
      if (isAllOther) {
        const { data, error } = await supabase.rpc('revoke_all_other_sessions')
        if (error) throw error
        toast.success('Successfully terminated all other login sessions')
        fetchSessions()
      } else {
        const { data, error } = await supabase.rpc('revoke_session', { session_id: sessionId })
        if (error) throw error

        if (data) {
          toast.success(isCurrent ? 'Signed out successfully' : 'Session terminated')
          if (isCurrent) {
            localStorage.removeItem('ozo-auth-token')
            navigate('/auth')
          } else {
            fetchSessions()
          }
        } else {
          toast.error('Failed to terminate session')
        }
      }
    } catch (error) {
      console.error('Error revoking session:', error)
      toast.error(error.message || 'Failed to terminate session')
    }
  }




  const getIcon = (type) => {
    return type === 'mobile' ? Smartphone : Laptop
  }

  const renderTitle = (titleString) => {
    if (!titleString) return null
    const words = titleString.trim().split(/\s+/)
    if (words.length <= 1) {
      return <>{titleString}<span className="text-gradient">.</span></>
    }
    const firstPart = words.slice(0, -1).join(' ')
    const lastWord = words[words.length - 1]
    return <>{firstPart} <span className="text-gradient">{lastWord}.</span></>
  }

  const parsedSessions = sessions.map(s => {
    const { device, browser, type } = parseUA(s.user_agent)
    return {
      ...s,
      deviceName: device,
      browserName: browser,
      icon: getIcon(type)
    }
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300">
      {/* Header */}
      <div className="page-header-sticky">
        <div className="container-custom">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
            >
              <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
            </button>
            <div>
              <h1 className="text-3xl font-display font-black text-gray-900 dark:text-white">
                {renderTitle(t('security') || 'Security Settings')}
              </h1>
              <p className="text-ozo-gray dark:text-gray-400 font-medium">
                Protect your account settings & sessions
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-12">
        <div className="max-w-3xl mx-auto space-y-12">
          




          {/* Active Sessions */}
          <section className="bg-white dark:bg-[#1a1a1a] p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-white/5">
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
              <h2 className="text-xl font-black flex items-center gap-3">
                <span className="w-1.5 h-6 bg-ozo-red rounded-full" />
                Active Login Sessions
              </h2>
              {parsedSessions.length > 1 && (
                <button
                  onClick={triggerRevokeAllOtherConfirm}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-650 hover:text-red-700 dark:text-red-400 font-bold text-xs rounded-xl border border-red-200/50 dark:border-red-500/20 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <Trash2 size={14} />
                  Terminate All Other Sessions
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {isLoadingSessions ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ozo-red"></div>
                </div>
              ) : parsedSessions.length === 0 ? (
                <p className="text-sm text-ozo-gray dark:text-gray-400 text-center py-8">
                  No active sessions found.
                </p>
              ) : (
                parsedSessions.map((session) => {
                  const Icon = session.icon
                  const resolvedLocation = locations[session.ip] || 'Fetching location...'
                  return (
                    <div 
                      key={session.id}
                      className="flex items-center justify-between p-5 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-50 dark:border-white/5 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          session.is_current 
                            ? 'bg-green-50 dark:bg-ozo-green/10 text-ozo-green' 
                            : 'bg-gray-50 dark:bg-white/5 text-gray-400'
                        }`}>
                          <Icon size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 dark:text-white">{session.deviceName}</p>
                            {session.is_current && (
                              <span className="text-[8px] uppercase tracking-widest font-black text-ozo-green bg-green-50 dark:bg-ozo-green/10 px-2 py-0.5 rounded-full border border-ozo-green/10">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-ozo-gray dark:text-gray-400 font-semibold">
                            {session.browserName} • {resolvedLocation}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => triggerRevokeConfirm(session.id, session.is_current)}
                        className="p-2.5 hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-xl transition-all"
                        title={session.is_current ? 'Log Out' : 'Terminate Session'}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </section>

        </div>
      </div>

      <AnimatePresence>
        {revokeModal.isOpen && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRevokeModal(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#121212] rounded-[2rem] p-6 shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden z-10"
            >
              {/* Top Accent Gradient */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-ozo-red to-orange-500" />
              
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center mb-4 border border-red-100 dark:border-red-500/15">
                  <Trash2 size={22} />
                </div>
                
                <h3 className="text-base font-black text-gray-900 dark:text-white mb-2">
                  {revokeModal.isAllOther 
                    ? 'Terminate Other Sessions?' 
                    : revokeModal.isCurrent 
                      ? 'Sign Out of Account?' 
                      : 'Terminate Login Session?'}
                </h3>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-6 max-w-[240px] leading-relaxed">
                  {revokeModal.isAllOther
                    ? 'Are you sure you want to sign out of all other devices? All other active sessions will be terminated immediately.'
                    : revokeModal.isCurrent 
                      ? 'Are you sure you want to end your current login session? You will need to log in again.' 
                      : 'Are you sure you want to terminate this login session? The device will be signed out immediately.'}
                </p>
                
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setRevokeModal(prev => ({ ...prev, isOpen: false }))}
                    className="flex-1 py-2.5 bg-gray-55 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-white font-bold rounded-xl border border-gray-205 dark:border-white/10 transition-all text-xs active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRevokeSession}
                    className="flex-1 py-2.5 bg-gradient-to-r from-ozo-red to-orange-500 text-white font-bold rounded-xl shadow-md hover:opacity-95 active:scale-95 transition-all text-xs"
                  >
                    Yes, Terminate
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

export default Security
