import { supabase } from '../lib/supabase'

export const logError = async ({
  error,
  message,
  componentName,
  severity = 'error',
  additionalInfo = {}
}) => {
  try {
    const errorMsg = message || error?.message || 'Unknown Error'
    const errorStack = error?.stack || null
    const url = typeof window !== 'undefined' ? window.location.href : null
    
    let userId = null
    try {
      const authRaw = typeof window !== 'undefined' ? localStorage.getItem('ozo-auth-token') : null
      if (authRaw) {
        const parsed = JSON.parse(authRaw)
        userId = parsed?.user?.id || parsed?.id || null
      }
    } catch (_) {}

    let citySlug = null
    try {
      const locationRaw = typeof window !== 'undefined' ? localStorage.getItem('ozo_selected_city_slug') || localStorage.getItem('location-storage') : null
      if (locationRaw) {
        if (locationRaw.startsWith('{')) {
          const parsed = JSON.parse(locationRaw)
          citySlug = parsed?.state?.selectedCitySlug || null
        } else {
          citySlug = locationRaw
        }
      }
    } catch (_) {}

    const deviceInfo = {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
      viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : null,
      platform: typeof navigator !== 'undefined' ? navigator.platform : null,
      language: typeof navigator !== 'undefined' ? navigator.language : null,
      ...additionalInfo
    }

    const { error: insertError } = await supabase.from('error_logs').insert({
      url,
      error_message: errorMsg,
      error_stack: errorStack,
      component_name: componentName || null,
      device_info: deviceInfo,
      city_slug: citySlug,
      severity,
      user_id: userId
    })

    if (insertError) {
      console.error('[Logger] Failed to persist error log in Supabase:', insertError)
    }
  } catch (err) {
    console.error('[Logger] Failed to log error:', err)
  }
}
