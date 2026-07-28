import { createClient } from '@supabase/supabase-js'

// =============================================
// DUAL URL SETUP
// VITE_SUPABASE_URL      → Cloudflare Proxy  (REST API / Auth)
// VITE_SUPABASE_DIRECT_URL → Direct Supabase  (Realtime WebSockets)
// =============================================
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL         // proxy
if (supabaseUrl && supabaseUrl.startsWith('/')) {
  if (typeof window !== 'undefined') {
    supabaseUrl = `${window.location.origin}${supabaseUrl}`
  } else {
    supabaseUrl = `http://localhost:3000${supabaseUrl}`
  }
}
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseDirectUrl = import.meta.env.VITE_SUPABASE_DIRECT_URL // direct

// Build the direct WSS realtime endpoint from VITE_SUPABASE_DIRECT_URL
// Falls back to JWT decode if direct URL is not set
const getRealtimeWssUrl = (directUrl, anonKey) => {
  try {
    // Priority 1: Use VITE_SUPABASE_DIRECT_URL (most reliable)
    if (directUrl && directUrl.includes('supabase.co')) {
      const host = new URL(directUrl).host
      return `wss://${host}/realtime/v1`
    }
    // Priority 2: Decode project ref from JWT anon key
    if (!anonKey) return null
    const parts = anonKey.split('.')
    if (parts.length < 2) return null
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    if (pad) base64 += '='.repeat(4 - pad)
    // Use the platform-appropriate base64 decoder — atob is browser-only;
    // in Node/edge environments Buffer.from is the correct approach.
    const decoded = typeof window !== 'undefined'
      ? window.atob(base64)
      : Buffer.from(base64, 'base64').toString('binary')
    const payload = JSON.parse(decodeURIComponent(
      decoded.split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    ))
    if (payload.ref) return `wss://${payload.ref}.supabase.co/realtime/v1`
    return null
  } catch (e) {
    console.warn('[OZO] Could not resolve direct Realtime URL:', e)
    return null
  }
}

// =============================================
// ENCRYPTION/DECRYPTION HELPERS
// Encrypts outgoing payloads and decrypts incoming payloads
// to protect database schema structure in Network tab.
// =============================================
const CRYPTO_SECRET = import.meta.env.VITE_CRYPTO_SECRET;
if (!CRYPTO_SECRET) {
  console.warn('[OZO] VITE_CRYPTO_SECRET is missing. Secure DB operations will fail.');
}

function bufToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBuf(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  }
  return bytes.buffer
}

async function encryptText(text, secret) {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const hash = await crypto.subtle.digest("SHA-256", keyData)
  const key = await crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encoder.encode(text)
  )
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return bufToHex(combined.buffer)
}

async function decryptText(hex, secret) {
  const buf = hexToBuf(hex)
  const bytes = new Uint8Array(buf)
  const iv = bytes.slice(0, 12)
  const ciphertext = bytes.slice(12)
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const hash = await crypto.subtle.digest("SHA-256", keyData)
  const key = await crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  )
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    ciphertext
  )
  return new TextDecoder().decode(decrypted)
}

// Helper to check if JWT access token is expired or close to expiring (<30s left)
const isJwtExpired = (token, skewSeconds = 30) => {
  if (!token) return true
  try {
    const parts = token.split('.')
    if (parts.length < 2) return true
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    if (pad) base64 += '='.repeat(4 - pad)
    const decoded = typeof window !== 'undefined'
      ? window.atob(base64)
      : Buffer.from(base64, 'base64').toString('binary')
    const payload = JSON.parse(decoded)
    if (!payload.exp) return false
    return (payload.exp * 1000) - Date.now() < (skewSeconds * 1000)
  } catch (e) {
    return false
  }
}

// ─── HARDENED STRUCTURED ERROR CLASSIFIER ─────────────────────────────────
const isTerminalAuthError = (error, responseBody) => {
  if (!error && !responseBody) return false

  // Structured properties check first (GoTrue error standards)
  const status = error?.status || responseBody?.status || responseBody?.httpStatusCode
  const code = (error?.code || responseBody?.code || responseBody?.error || '').toString().toLowerCase()
  const errorName = (error?.name || '').toString()

  // 1. Explicit GoTrue Terminal Error Codes
  const terminalCodes = [
    'invalid_grant',
    'refresh_token_not_found',
    'session_not_found',
    'user_not_found',
    'invalid_credentials',
    'token_expired',
  ]

  if (terminalCodes.includes(code)) {
    return true
  }

  // 2. HTTP 400/401/422 with AuthApiError or invalid_grant
  if ((status === 400 || status === 401 || status === 422) && (code === 'invalid_grant' || errorName === 'AuthApiError')) {
    const msg = (error?.message || responseBody?.error_description || responseBody?.msg || responseBody?.message || '').toString().toLowerCase()
    if (msg.includes('invalid') || msg.includes('revoked') || msg.includes('not found') || msg.includes('expired')) {
      return true
    }
  }

  // 3. Fallback string checks for legacy payloads
  const msg = (error?.message || responseBody?.error_description || responseBody?.msg || responseBody?.message || '').toString().toLowerCase()
  return (
    code === 'invalid_grant' ||
    msg.includes('invalid refresh token') ||
    msg.includes('refresh token not found') ||
    msg.includes('session not found') ||
    msg.includes('user not found')
  )
}

// ─── CROSS-TAB BROADCAST & STORAGE LOCK COORDINATOR ─────────────────────────
const REFRESH_CHANNEL_NAME = 'ozo_session_refresh_channel'
let refreshBroadcastChannel = null
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    refreshBroadcastChannel = new BroadcastChannel(REFRESH_CHANNEL_NAME)
  } catch (e) {
    // Fallback to storage events
  }
}

// Single-flight promise for refreshSession to prevent thundering herd and race conditions
let globalRefreshPromise = null

const waitForLeaderTabRefresh = (timeoutMs = 8000) => {
  return new Promise((resolve) => {
    let resolved = false

    const cleanup = () => {
      if (resolved) return
      resolved = true
      if (refreshBroadcastChannel) {
        refreshBroadcastChannel.removeEventListener('message', handleMessage)
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageEvent)
      }
    }

    const timer = setTimeout(() => {
      cleanup()
      // Fallback read from localStorage after timeout
      try {
        const raw = localStorage.getItem('ozo-auth-token')
        if (raw) {
          const parsed = JSON.parse(raw)
          const session = parsed?.currentSession || parsed
          if (session?.access_token) {
            resolve({ data: { session }, error: null })
            return
          }
        }
      } catch (e) {}
      
      // Dispatch telemetry event for monitoring lock collision / timeout
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ozo-auth-telemetry', {
          detail: { event: 'leader_refresh_timeout', timestamp: Date.now() }
        }))
      }
      resolve({ data: { session: null }, error: new Error('Leader tab refresh wait timeout') })
    }, timeoutMs)

    const handleMessage = (evt) => {
      if (evt?.data?.type === 'REFRESH_SUCCESS' && evt?.data?.session) {
        clearTimeout(timer)
        cleanup()
        resolve({ data: { session: evt.data.session }, error: null })
      } else if (evt?.data?.type === 'REFRESH_FAILED') {
        clearTimeout(timer)
        cleanup()
        resolve({ data: { session: null }, error: evt.data.error || new Error('Leader refresh failed') })
      }
    }

    const handleStorageEvent = (e) => {
      if (e.key === 'ozo-auth-token' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          const session = parsed?.currentSession || parsed
          if (session?.access_token) {
            clearTimeout(timer)
            cleanup()
            resolve({ data: { session }, error: null })
          }
        } catch (err) {}
      }
    }

    if (refreshBroadcastChannel) {
      refreshBroadcastChannel.addEventListener('message', handleMessage)
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageEvent)
    }
  })
}

// Helper to execute refreshSession with a strict 4.5-second timeout limit
// Guarantees no hung socket or frozen fetch can ever stall past the 7.0s lock staleness threshold
const refreshSessionWithTimeout = async (timeoutMs = 4500) => {
  let timer = null
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error('Refresh network request timeout (4500ms exceeded)')
      err.name = 'TimeoutError'
      reject(err)
    }, timeoutMs)
  })

  try {
    let refreshParam = undefined
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('ozo-auth-token')
        if (raw) {
          const parsed = JSON.parse(raw)
          const rt = parsed?.refresh_token || parsed?.currentSession?.refresh_token
          if (rt) {
            refreshParam = { refresh_token: rt }
          }
        }
      } catch (e) {}
    }

    const result = await Promise.race([
      supabase.auth.refreshSession(refreshParam),
      timeoutPromise
    ])
    return result
  } finally {
    if (timer) clearTimeout(timer)
  }
}

const refreshSessionDeduplicated = async () => {
  if (globalRefreshPromise) {
    return globalRefreshPromise
  }

  globalRefreshPromise = (async () => {
    try {
      // 1. Lock Staleness Expiry Check with 7000ms threshold (survives cumulative backoff delays):
      const lastLock = typeof window !== 'undefined' ? localStorage.getItem('ozo_refresh_lock_ts') : null
      const lockAge = lastLock ? Date.now() - parseInt(lastLock, 10) : Infinity
      const isLockedByActiveTab = lockAge < 7000

      if (isLockedByActiveTab) {
        console.log('[OZO Auth] Leader tab is currently refreshing session. Subscribing to REFRESH_SUCCESS broadcast...')
        const leaderResult = await waitForLeaderTabRefresh(8000)
        if (leaderResult.data?.session) {
          return leaderResult
        }
        console.warn('[OZO Auth] Leader tab broadcast timed out or failed. Taking over as lock leader...')
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ozo-auth-telemetry', {
            detail: { event: 'lock_takeover', lockAge, timestamp: Date.now() }
          }))
        }
      }

      // 2. Claim lock as leader tab with current timestamp
      if (typeof window !== 'undefined') {
        localStorage.setItem('ozo_refresh_lock_ts', Date.now().toString())
        refreshBroadcastChannel?.postMessage({ type: 'REFRESH_START' })
      }

      // 3. Exponential Backoff Retry Loop (500ms, 1500ms, 3000ms) with Lock Heartbeat Renewal
      const backoffDelays = [500, 1500, 3000]
      let lastResult = null

      for (let attempt = 0; attempt <= backoffDelays.length; attempt++) {
        try {
          // HEARTBEAT LOCK RENEWAL: Refresh timestamp on every attempt so active leader tab never gets preempted
          if (typeof window !== 'undefined') {
            localStorage.setItem('ozo_refresh_lock_ts', Date.now().toString())
          }

          const result = await refreshSessionWithTimeout(4500)
          
          if (!result.error && result.data?.session) {
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('ozo-auth-token', JSON.stringify(result.data.session))
              } catch (sErr) {}
              localStorage.removeItem('ozo_refresh_lock_ts')
              refreshBroadcastChannel?.postMessage({ type: 'REFRESH_SUCCESS', session: result.data.session })
              window.dispatchEvent(new CustomEvent('ozo-connection-state', { detail: { status: 'connected' } }))
            }
            return result
          }

          lastResult = result

          // If it's a genuine terminal error (e.g. invalid_grant), stop retries immediately!
          if (isTerminalAuthError(result.error)) {
            console.error('[OZO Auth] Terminal auth failure detected (invalid_grant/revoked token):', result.error)
            if (typeof window !== 'undefined') {
              localStorage.removeItem('ozo_refresh_lock_ts')
              refreshBroadcastChannel?.postMessage({ type: 'REFRESH_FAILED', isTerminal: true, error: result.error })
              window.dispatchEvent(new CustomEvent('ozo-auth-telemetry', {
                detail: { event: 'terminal_auth_failure', error: result.error?.message, timestamp: Date.now() }
              }))
            }
            break
          }

          // Transient error: notify connection state reconnecting & telemetry
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ozo-connection-state', { detail: { status: 'reconnecting', attempt: attempt + 1 } }))
            window.dispatchEvent(new CustomEvent('ozo-auth-telemetry', {
              detail: { event: 'transient_refresh_error', attempt: attempt + 1, error: result.error?.message, timestamp: Date.now() }
            }))
          }

          if (attempt < backoffDelays.length) {
            console.warn(`[OZO Auth] Session refresh transient hiccup. Retrying in ${backoffDelays[attempt]}ms (Attempt ${attempt + 1})...`)
            await new Promise(res => setTimeout(res, backoffDelays[attempt]))
          }
        } catch (netErr) {
          lastResult = { data: { session: null }, error: netErr }
          if (attempt < backoffDelays.length) {
            await new Promise(res => setTimeout(res, backoffDelays[attempt]))
          }
        }
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem('ozo_refresh_lock_ts')
      }

      // If transient retries exhausted without terminal error, launch background periodic reconnect loop (every 20s)
      if (lastResult?.error && !isTerminalAuthError(lastResult.error)) {
        console.warn('[OZO Auth] Transient refresh retries exhausted. Launching silent 20s periodic reconnect loop...')
        if (typeof window !== 'undefined' && !window._ozoReconnectInterval) {
          window._ozoReconnectInterval = setInterval(async () => {
            console.log('[OZO Auth] Periodic background reconnect attempt...')
            const res = await supabase.auth.refreshSession()
            if (!res.error && res.data?.session) {
              clearInterval(window._ozoReconnectInterval)
              window._ozoReconnectInterval = null
              window.dispatchEvent(new CustomEvent('ozo-connection-state', { detail: { status: 'connected' } }))
              console.log('[OZO Auth] Background periodic reconnect successful!')
            }
          }, 20000)
        }
      }

      return lastResult || { data: { session: null }, error: new Error('Refresh failed') }
    } finally {
      globalRefreshPromise = null
    }
  })()

  return globalRefreshPromise
}

const customFetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url
  const isProxyRequest = supabaseUrl && url.startsWith(supabaseUrl)
  const isAuthRequest = url.includes('/auth/v1/')

  let newInit = { ...init }

  // Normalize and prepare headers
  let newHeaders = {}
  if (newInit.headers) {
    if (newInit.headers instanceof Headers) {
      newHeaders = Object.fromEntries(newInit.headers.entries())
    } else {
      newHeaders = { ...newInit.headers }
    }
  }

  // Inject admin session token if it exists in localStorage and this is an admin request
  const adminToken = typeof window !== 'undefined' ? localStorage.getItem('ozo-admin-token') : null
  const isDocAdminRequest = newHeaders['x-application-name'] === 'ozo-grocery-app-admin' || 
                            newHeaders['X-Application-Name'] === 'ozo-grocery-app-admin' ||
                            url.includes('/admin/');
  if (adminToken && isDocAdminRequest) {
    newHeaders['x-admin-token'] = adminToken
  }

  // ─── SMART TOKEN INJECTION & EXPIRY PRE-CHECK ────────────────────────────
  // Check token freshness before attaching Authorization header to prevent
  // PostgREST 401 JWT expired errors on database queries.
  let existingAuthHeader = newHeaders['Authorization'] || newHeaders['authorization'] || ''
  
  if (!isAuthRequest) {
    let headerToken = existingAuthHeader.startsWith('Bearer ')
      ? existingAuthHeader.substring(7).trim()
      : ''

    const isTokenMissingOrAnon = !headerToken || headerToken === supabaseAnonKey || headerToken === 'null' || headerToken === 'undefined'
    const isHeaderTokenExpired = headerToken && headerToken !== supabaseAnonKey && isJwtExpired(headerToken)

    if (isTokenMissingOrAnon || isHeaderTokenExpired) {
      try {
        const rawStorage = typeof window !== 'undefined' ? localStorage.getItem('ozo-auth-token') : null
        const activeSession = rawStorage ? JSON.parse(rawStorage) : null
        let token = activeSession?.access_token || activeSession?.currentSession?.access_token

        if (isHeaderTokenExpired || (token && isJwtExpired(token))) {
          console.log('[OZO Auth] Detected expired session token pre-flight. Triggering deduplicated refresh...')
          const { data: refreshData } = await refreshSessionDeduplicated()
          token = refreshData?.session?.access_token || null

          if (refreshData?.session) {
            try {
              supabaseAdmin.auth.setSession({
                access_token: refreshData.session.access_token,
                refresh_token: refreshData.session.refresh_token,
              }).catch(() => {})
            } catch (e) {}
          }
        }

        if (token && !isJwtExpired(token)) {
          newHeaders['Authorization'] = `Bearer ${token}`
        } else {
          // If user is unauthenticated or refresh failed, fallback to Anon Key so public/read queries pass
          newHeaders['Authorization'] = `Bearer ${supabaseAnonKey}`
        }
      } catch (e) {
        console.warn('[OZO Auth] Smart token pre-check warning:', e)
        newHeaders['Authorization'] = `Bearer ${supabaseAnonKey}`
      }
    }
  } else {
    // For auth requests, ensure Authorization is present if provided or fallback to Anon Key
    if (!existingAuthHeader && supabaseAnonKey) {
      newHeaders['Authorization'] = `Bearer ${supabaseAnonKey}`
    }
  }

  // Guarantee apikey header is always present for Supabase API requests
  if (supabaseAnonKey && (!newHeaders['apikey'] && !newHeaders['ApiKey'])) {
    newHeaders['apikey'] = supabaseAnonKey
  }

  newInit.headers = newHeaders

  // Encrypt request body if sending JSON to proxy (non-auth requests only)
  if (isProxyRequest && !isAuthRequest && newInit.body && ["POST", "PUT", "PATCH", "DELETE"].includes((newInit.method || 'GET').toUpperCase())) {
    const contentType = newHeaders['Content-Type'] || newHeaders['content-type'] || ''
    if (contentType.includes('application/json') || typeof newInit.body === 'string') {
      try {
        const textToEncrypt = typeof newInit.body === 'string' ? newInit.body : JSON.stringify(newInit.body)
        const encryptedBody = await encryptText(textToEncrypt, CRYPTO_SECRET)
        newInit.body = encryptedBody
        newHeaders['x-encrypted'] = 'true'
        // Switch Content-Type to text/plain so Vercel edge infra doesn't JSON.parse hex body
        const origCt = newHeaders['Content-Type'] || newHeaders['content-type'] || 'application/json'
        newHeaders['x-original-content-type'] = origCt
        newHeaders['Content-Type'] = 'text/plain'
        delete newHeaders['content-type']
      } catch (err) {
        console.error('[OZO Crypto] Request encryption failed:', err)
      }
    }
  }

  let response = await fetch(input, newInit)

  // Auto-clear invalid/expired sessions or attempt single-flight retry on REST 401 JWT Expiry
  let isInvalidSession = false
  if ((response.status === 401 || response.status === 403) && url.includes('/auth/v1/user')) {
    try {
      const clone = response.clone()
      const body = await clone.json()
      if (isTerminalAuthError(null, body)) {
        isInvalidSession = true
      }
    } catch (e) {
      // Not JSON, ignore
    }
  } else if (response.status === 400 && url.includes('/auth/v1/token') && url.includes('refresh_token')) {
    try {
      const clone = response.clone()
      const body = await clone.json()
      if (isTerminalAuthError(null, body)) {
        isInvalidSession = true
      }
    } catch (e) {
      // Not JSON, ignore
    }
  } else if ((response.status === 401 || response.status === 403) && (url.includes('/rest/v1/') || url.includes('/storage/v1/'))) {
    // ─── REST API / Storage API JWT Expiry Handling & Deduplicated Retry ────
    // MAX 1 RETRY CAP FOR REQUEST: If newInit._isRetry is already true, do NOT retry request again.
    if (!newInit._isRetry) {
      try {
        const clone = response.clone()
        const body = await clone.json()
        const errMsg = (body?.message || body?.msg || body?.error || '').toLowerCase()
        if (errMsg.includes('jwt expired') || errMsg.includes('jwt') || body?.code === 'PGRST301' || response.status === 401) {
          console.warn('[OZO Auth] REST API returned 401/JWT expired. Triggering cross-tab deduplicated session refresh...')
          // Use single-flight mutex with backoff & cross-tab locking
          const { data: refreshData, error: refreshError } = await refreshSessionDeduplicated()
          if (!refreshError && refreshData?.session) {
            const newAccessToken = refreshData.session.access_token
            // Sync session to supabaseAdmin
            try {
              await supabaseAdmin.auth.setSession({
                access_token: newAccessToken,
                refresh_token: refreshData.session.refresh_token,
              })
            } catch (e) {
              // Ignore admin sync warning
            }

            // Retry request MAX 1 TIME with fresh Authorization header and apikey
            const retriedHeaders = { 
              ...newInit.headers, 
              Authorization: `Bearer ${newAccessToken}`,
              apikey: supabaseAnonKey 
            }
            const retriedInit = { ...newInit, headers: retriedHeaders, _isRetry: true }
            response = await fetch(input, retriedInit)
          } else {
            // Refresh failed (or user is not logged in / network issue).
            // If request is a GET (read query for products, categories, etc.), retry ONCE with Supabase Anon Key
            const method = (newInit.method || 'GET').toUpperCase()
            if (method === 'GET') {
              console.warn('[OZO Auth] Session refresh failed. Retrying GET request with Supabase Anon Key for public data access...')
              const anonHeaders = { 
                ...newInit.headers, 
                Authorization: `Bearer ${supabaseAnonKey}`,
                apikey: supabaseAnonKey 
              }
              const anonInit = { ...newInit, headers: anonHeaders, _isRetry: true }
              response = await fetch(input, anonInit)
            } else if (isTerminalAuthError(refreshError)) {
              // ONLY force logout on genuine TERMINAL auth failures (revoked / invalid grant)
              console.error('[OZO Auth] Single-flight refresh returned terminal error. Invalidating session.')
              isInvalidSession = true
            } else {
              console.warn('[OZO Auth] Refresh failed due to transient error/network hiccup. Session preserved.')
            }
          }
        }
      } catch (e) {
        // Not JSON, ignore
      }
    } else if (response.status === 401) {
      try {
        const clone = response.clone()
        const body = await clone.json()
        if (isTerminalAuthError(null, body)) {
          isInvalidSession = true
        }
      } catch (e) {}
    }
  }

  if (isInvalidSession) {
    console.warn('[OZO Auth] Got session invalidation from Supabase Auth. Clearing invalid session storage.');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('ozo-auth-token');
      window.localStorage.removeItem('ozo-auth-storage');
      window.dispatchEvent(new CustomEvent('ozo-session-expired'));
    }
  }

  // Auto-clear admin panel session if response is 401/403 and x-admin-token was sent
  const sentAdminToken = newHeaders['x-admin-token'] || newHeaders['X-Admin-Token'];
  if ((response.status === 401 || response.status === 403) && sentAdminToken) {
    console.warn('[OZO Auth] Admin session token was rejected or has expired. Clearing admin session.');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('ozo-admin-token');
      window.dispatchEvent(new CustomEvent('ozo-admin-session-expired'));
    }
  }

  // Decrypt response if it is encrypted
  const isResponseEncrypted = response.headers.get('x-encrypted') === 'true'
  if (isProxyRequest && isResponseEncrypted) {
    try {
      const encryptedText = await response.text()
      const decryptedText = await decryptText(encryptedText, CRYPTO_SECRET)

      const decryptedHeaders = new Headers(response.headers)
      decryptedHeaders.set('content-type', 'application/json; charset=utf-8')

      return new Response(decryptedText, {
        status: response.status,
        statusText: response.statusText,
        headers: decryptedHeaders
      })
    } catch (err) {
      if (err && err.name === 'AbortError') {
        throw err
      }
      console.error('[OZO Crypto] Response decryption failed:', err)
    }
  }

  return response
}

// Create main Supabase client (all REST/Auth calls → Cloudflare Proxy)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Use localStorage only when running in a real browser environment.
    // Referencing window.localStorage directly at module parse time throws a
    // ReferenceError in non-browser contexts (SSR, edge functions, unit tests).
    // The Supabase client already defaults to localStorage in browsers, so
    // we only pass it explicitly when we are certain window exists.
    ...(typeof window !== 'undefined' && { storage: window.localStorage }),
    storageKey: 'ozo-auth-token',
  },
  global: {
    fetch: customFetch,
    headers: {
      'x-application-name': 'ozo-grocery-app',
    },
  },
})

// 🔥 Force Realtime to use direct Supabase WebSocket URL (bypasses proxy)
// The Supabase constructor always builds realtimeUrl from supabaseUrl,
// so we must override it directly on the realtime client instance.
const directRealtimeWssUrl = getRealtimeWssUrl(supabaseDirectUrl, supabaseAnonKey)
if (directRealtimeWssUrl) {
  supabase.realtime.endPoint = directRealtimeWssUrl + '/websocket'
  supabase.realtime.httpEndpoint = directRealtimeWssUrl
    .replace(/^wss:\/\//, 'https://')
    .replace(/^ws:\/\//, 'http://')
    .replace(/\/realtime\/v1$/, '')
} else {
  console.warn('[OZO] Realtime direct URL not resolved. WebSockets may fail.')
}

// =============================================
// ADMIN CLIENT — Proxied for Reliability
// Used in all admin pages. Connects through the secure local proxy to
// bypass client-side DNS/adblocker blocks on supabase.co domains.
// Session persistence is disabled here to avoid duplicate GoTrue client
// storage warnings. The session is synced manually from authStore.js.
// =============================================
export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: customFetch,
    headers: {
      'x-application-name': 'ozo-grocery-app-admin',
    },
  },
})

// Override supabaseAdmin realtime WebSocket URL just like the main client
if (directRealtimeWssUrl) {
  supabaseAdmin.realtime.endPoint = directRealtimeWssUrl + '/websocket'
  supabaseAdmin.realtime.httpEndpoint = directRealtimeWssUrl
    .replace(/^wss:\/\//, 'https://')
    .replace(/^ws:\/\//, 'http://')
    .replace(/\/realtime\/v1$/, '')
}

// =============================================
// AUTH HELPERS
// =============================================

export const authHelpers = {
  // Sign up with email and password
  signUp: async (email, password, fullName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) throw error

      // Create user profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              full_name: fullName,
              role: 'customer',
            },
          ])

        if (profileError) throw profileError
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Sign in with email and password
  signIn: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Sign out
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error }
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return { user, error: null }
    } catch (error) {
      return { user: null, error }
    }
  },

  // Get user profile
  getUserProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, user_roles!user_id(*)')
        .eq('id', userId)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Update user profile
  updateProfile: async (userId, updates) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Reset password
  resetPassword: async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },
}

// =============================================
// DATABASE HELPERS
// =============================================

export const dbHelpers = {
  // Generic fetch function
  fetch: async (table, options = {}) => {
    try {
      let query = supabase.from(table).select(options.select || '*')

      if (options.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
      }

      if (options.order) {
        query = query.order(options.order.column, {
          ascending: options.order.ascending ?? true
        })
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      if (options.range) {
        query = query.range(options.range.from, options.range.to)
      }

      const { data, error } = await query

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Generic insert function
  insert: async (table, data) => {
    try {
      const { data: insertedData, error } = await supabase
        .from(table)
        .insert(data)
        .select()

      if (error) throw error
      return { data: insertedData, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Generic update function
  update: async (table, id, updates) => {
    try {
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Generic delete function
  delete: async (table, id) => {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)

      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error }
    }
  },
}

// =============================================
// STORAGE HELPERS
// =============================================

export const storageHelpers = {
  // Upload file
  uploadFile: async (bucket, path, file) => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path)

      return { data: { ...data, publicUrl }, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  // Delete file
  deleteFile: async (bucket, path) => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path])

      if (error) throw error
      return { error: null }
    } catch (error) {
      return { error }
    }
  },

  // Get public URL
  getPublicUrl: (bucket, path) => {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  },
}

// =============================================
// IMGBB IMAGE UPLOAD HELPER
// =============================================

export const uploadToImgbb = async (file, customName = null) => {
  const errors = []
  
  // Determine standard file extension and construct renaming structure if needed
  let filename = (file instanceof File && file.name) ? file.name : `image_${Date.now()}.jpg`
  if (customName) {
    const ext = filename.split('.').pop()
    filename = customName.endsWith(`.${ext}`) ? customName : `${customName}.${ext}`
  }

  const getBase64 = (f) => {
    return new Promise((resolve, reject) => {
      if (typeof f === 'string') {
        if (f.startsWith('data:')) {
          return resolve(f.split(',')[1])
        }
        return resolve(f)
      }
      const reader = new FileReader()
      reader.readAsDataURL(f)
      reader.onload = () => {
        const base64String = reader.result.split(',')[1]
        resolve(base64String)
      }
      reader.onerror = (err) => reject(err)
    })
  }

  // --- METHOD 1: ImgBB via local /api/upload-image ---
  try {
    const formData = new FormData()
    if (customName && file instanceof File) {
      const renamedFile = new File([file], filename, { type: file.type })
      formData.append('image', renamedFile)
      formData.append('name', customName)
    } else {
      formData.append('image', file)
      if (customName) {
        formData.append('name', customName)
      }
    }
    
    const url = '/api/upload-image'
    
    // Add 15-second timeout for the first attempt
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    
    const result = await response.json()
    if (result.success && result.data && result.data.url) {
      console.log('[Upload System] ImgBB upload succeeded:', result.data.url)
      return { url: result.data.url, data: result.data, error: null }
    } else {
      throw new Error(result.error?.message || 'Failed to upload image to imgbb')
    }
  } catch (err) {
    const errMsg = err.name === 'AbortError' ? 'ImgBB timed out' : err.message
    console.warn('[Upload System] ImgBB upload failed. Attempting Freeimage.host fallback...', errMsg)
    errors.push(`ImgBB: ${errMsg}`)
  }

  // --- METHOD 2: Freeimage.host (Direct Client-Side) ---
  try {
    const freeimageKey = import.meta.env.VITE_FREEIMAGE_API_KEY
    if (!freeimageKey) {
      throw new Error('VITE_FREEIMAGE_API_KEY not configured')
    }

    console.log('[Upload System] Attempting direct upload to Freeimage.host...')
    const base64Data = await getBase64(file)
    const payload = new URLSearchParams({
      key: freeimageKey,
      action: 'upload',
      source: base64Data,
      format: 'json'
    })

    const freeimageRes = await fetch('https://freeimage.host/api/1/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: payload.toString()
    })

    if (!freeimageRes.ok) {
      const errText = await freeimageRes.text()
      throw new Error(`Freeimage.host rejected: ${errText}`)
    }

    const resJson = await freeimageRes.json()
    if (resJson.image && resJson.image.url) {
      console.log('[Upload System] Direct Freeimage.host upload succeeded:', resJson.image.url)
      return { url: resJson.image.url, data: resJson, error: null }
    } else {
      throw new Error('Freeimage.host returned no URL')
    }
  } catch (err) {
    console.warn('[Upload System] Freeimage.host upload failed. Trying ImageKit...', err.message)
    errors.push(`Freeimage: ${err.message}`)
  }

  // --- METHOD 3: ImageKit (via imagekit-auth Edge Function) ---
  try {
    console.log('[Upload System] Requesting ImageKit auth signature...')
    const { data: authData, error: authError } = await supabase.functions.invoke('imagekit-auth')
    if (authError || !authData) {
      throw authError || new Error('No auth details returned from Edge Function')
    }

    const { signature, expire, token } = authData
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileName', filename)
    formData.append('publicKey', import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || 'public_e6aAVXZkPBwJl0S...')
    formData.append('signature', signature)
    formData.append('expire', expire.toString())
    formData.append('token', token)
    formData.append('folder', '/ozo-general-uploads')

    console.log('[Upload System] Uploading directly to ImageKit API...')
    const imagekitRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      body: formData
    })

    if (!imagekitRes.ok) {
      const errText = await imagekitRes.text()
      throw new Error(`ImageKit API rejected: ${errText}`)
    }

    const imagekitData = await imagekitRes.json()
    if (imagekitData && imagekitData.url) {
      console.log('[Upload System] ImageKit upload succeeded:', imagekitData.url)
      return { url: imagekitData.url, data: imagekitData, error: null }
    } else {
      throw new Error('ImageKit upload returned no URL')
    }
  } catch (err) {
    console.warn('[Upload System] ImageKit upload failed.', err.message)
    errors.push(`ImageKit: ${err.message}`)
  }

  console.error('[Upload System] All upload backends failed.')
  return { 
    url: null, 
    data: null, 
    error: new Error(`Image upload failed on all configured channels: ${errors.join(' | ')}`) 
  }
}

// Parallel Image Uploader (Primary ImageKit + Backup Supabase Storage)
export const uploadCatalogImage = async (file, barcode, imageIndex) => {
  try {
    const ext = (file instanceof File && file.name) ? file.name.split('.').pop() : 'jpg';
    const fileName = `${barcode}_${imageIndex}.${ext}`;

    // 1. Fetch ImageKit Authentication Parameters from Supabase Edge Function
    const authPromise = (async () => {
      const { data, error: authError } = await supabase.functions.invoke('imagekit-auth');
      if (authError || !data) {
        throw authError || new Error('No authentication details returned from Edge Function');
      }
      return data;
    })();

    // 2. Backup upload to Supabase Storage in parallel (start immediately)
    const supabasePath = `merchant-photos/${barcode}/${imageIndex}.${ext}`;
    const backupPromise = supabase.storage
      .from('mart-assets')
      .upload(supabasePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    // Wait for ImageKit auth to resolve
    let authData = null;
    try {
      authData = await authPromise;
    } catch (authErr) {
      console.error('[Upload] ImageKit authentication failed:', authErr);
    }

    let primaryUrl = null;
    let imagekitData = null;

    if (authData) {
      const { signature, expire, token } = authData;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      formData.append('publicKey', import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || 'public_e6aAVXZkPBwJl0S...');
      formData.append('signature', signature);
      formData.append('expire', expire.toString());
      formData.append('token', token);
      formData.append('folder', '/ozomart-products');

      try {
        const imagekitRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
          method: 'POST',
          body: formData
        });
        if (imagekitRes.ok) {
          imagekitData = await imagekitRes.json();
          primaryUrl = imagekitData.url;
        } else {
          const errText = await imagekitRes.text();
          console.error('[Upload] ImageKit upload error response:', errText);
        }
      } catch (uploadErr) {
        console.error('[Upload] ImageKit fetch error:', uploadErr);
      }
    }

    // Await backup upload results
    let backupUrl = null;
    try {
      const backupResult = await backupPromise;
      if (backupResult && !backupResult.error) {
        const { data } = supabase.storage
          .from('mart-assets')
          .getPublicUrl(supabasePath);
        backupUrl = data?.publicUrl;
      } else {
        console.warn('[Upload] Backup upload to Supabase failed:', backupResult?.error);
      }
    } catch (backupErr) {
      console.warn('[Upload] Backup upload promise rejected:', backupErr);
    }

    return {
      url: primaryUrl || backupUrl,
      primaryUrl,
      backupUrl,
      error: (primaryUrl || backupUrl) ? null : 'Both primary CDN and backup storage failed'
    };
  } catch (err) {
    console.error('[Upload] Parallel upload system error:', err);
    return { url: null, primaryUrl: null, backupUrl: null, error: err };
  }
}


// =============================================
// FILE SECURITY HELPERS (Prevent Zip / Renamed Upload DDoS Attacks)
// =============================================

export const validateFileHeader = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = (e) => {
      if (!e.target || !e.target.result) {
        resolve({ valid: false, error: 'Could not read file header.' })
        return
      }
      const arr = new Uint8Array(e.target.result)
      let header = ""
      for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16).padStart(2, '0')
      }
      header = header.toUpperCase()
      
      // ZIP files magic numbers start with 504B0304 (PK\x03\x04), 504B0506 (empty), 504B0708 (spanned)
      if (header.startsWith('504B0304') || header.startsWith('504B0506') || header.startsWith('504B0708')) {
        resolve({ valid: false, error: 'Zip files / compressed archives are not allowed for security reasons.' })
        return
      }

      // Check standard image/PDF formats (White-listing magic numbers)
      const isPNG = header.startsWith('89504E47')
      const isJPEG = header.startsWith('FFD8FF')
      const isPDF = header.startsWith('25504446')
      const isRIFF = header.startsWith('52494646') // WEBP starts with RIFF

      if (isPNG || isJPEG || isPDF || isRIFF) {
        resolve({ valid: true })
      } else {
        resolve({ valid: false, error: 'Invalid file content. Only JPG, PNG, WEBP, and PDF files are allowed.' })
      }
    }
    reader.readAsArrayBuffer(file.slice(0, 12))
  })
}

export default supabase