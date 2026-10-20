import { useState, useEffect } from 'react'

/**
 * useNetworkQuality Hook
 * Detects network condition in real-time using Network Information API and window online/offline events.
 * Identifies 2G, slow 3G, or Save-Data modes to trigger lightweight layouts & compressed images.
 */
export const checkIsLowNetwork = () => {
  if (typeof navigator === 'undefined') return false
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (!conn) return false
  return Boolean(
    conn.saveData ||
    conn.effectiveType === '2g' ||
    conn.effectiveType === 'slow-2g' ||
    (conn.rtt && conn.rtt > 800) ||
    (conn.downlink && conn.downlink < 0.5)
  )
}

export const useNetworkQuality = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [isLowNetwork, setIsLowNetwork] = useState(checkIsLowNetwork())
  const [effectiveType, setEffectiveType] = useState(() => {
    if (typeof navigator === 'undefined') return '4g'
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    return conn?.effectiveType || '4g'
  })
  const [saveData, setSaveData] = useState(() => {
    if (typeof navigator === 'undefined') return false
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    return Boolean(conn?.saveData)
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection

    const updateConnectionStatus = () => {
      if (conn) {
        setIsLowNetwork(checkIsLowNetwork())
        setEffectiveType(conn.effectiveType || '4g')
        setSaveData(Boolean(conn.saveData))
      }
    }

    if (conn && conn.addEventListener) {
      conn.addEventListener('change', updateConnectionStatus)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (conn && conn.removeEventListener) {
        conn.removeEventListener('change', updateConnectionStatus)
      }
    }
  }, [])

  return {
    isOnline,
    isLowNetwork,
    effectiveType,
    saveData
  }
}

export default useNetworkQuality
