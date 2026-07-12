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

const customFetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url
  const isProxyRequest = supabaseUrl && url.startsWith(supabaseUrl)

  // ─── AUTH BYPASS ───────────────────────────────────────────────────────────
  // Auth endpoints (PKCE token exchange, session refresh, OAuth) must NOT be
  // encrypted or proxied — they need to go directly to Supabase so the PKCE
  // code exchange works correctly. Encrypting these requests breaks the OAuth
  // flow because the proxy's encrypt/decrypt round-trip interferes with the
  // exact binary payload that GoTrue expects.
  const isAuthRequest = url.includes('/auth/v1/')
  if (isAuthRequest && isProxyRequest && supabaseDirectUrl) {
    // Rewrite the proxy URL to the direct Supabase URL for auth requests
    const directUrl = url.replace(supabaseUrl, supabaseDirectUrl)
    const newRequest = input instanceof Request
      ? new Request(directUrl, init)
      : directUrl
    return fetch(newRequest, input instanceof Request ? undefined : init)
  }
  // ──────────────────────────────────────────────────────────────────────────

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
  newInit.headers = newHeaders

  // Encrypt request body if sending JSON to proxy
  if (isProxyRequest && newInit.body && ["POST", "PUT", "PATCH", "DELETE"].includes(newInit.method || 'GET')) {
    const contentType = newHeaders['Content-Type'] || newHeaders['content-type'] || ''
    if (contentType.includes('application/json') || typeof newInit.body === 'string') {
      try {
        const textToEncrypt = typeof newInit.body === 'string' ? newInit.body : JSON.stringify(newInit.body)
        const encryptedBody = await encryptText(textToEncrypt, CRYPTO_SECRET)
        newInit.body = encryptedBody
        newHeaders['x-encrypted'] = 'true'
        // Switch Content-Type to text/plain so Vercel's edge infra doesn't
        // try to JSON.parse the encrypted hex body (which causes 502).
        // Stash the original type so the proxy can restore it for Supabase.
        const origCt = newHeaders['Content-Type'] || newHeaders['content-type'] || 'application/json'
        newHeaders['x-original-content-type'] = origCt
        newHeaders['Content-Type'] = 'text/plain'
        delete newHeaders['content-type'] // avoid duplicate casing
      } catch (err) {
        console.error('[OZO Crypto] Request encryption failed:', err)
      }
    }
  }

  const response = await fetch(input, newInit)

  // Auto-clear invalid/expired sessions if Supabase Auth rejects the token or refresh token fails
  let isInvalidSession = false
  if ((response.status === 401 || response.status === 403) && url.includes('/auth/v1/user')) {
    // Check if the response is JSON and indicates an auth/token error, avoiding logging users
    // out on transient proxy/WAF HTML error pages.
    try {
      const clone = response.clone()
      const body = await clone.json()
      if (body && (body.error || body.msg || body.message)) {
        const errMsg = (body.error || body.msg || body.message || '').toLowerCase()
        if (errMsg.includes('invalid') || errMsg.includes('expired') || errMsg.includes('auth') || errMsg.includes('token') || errMsg.includes('unauthorized')) {
          isInvalidSession = true
        }
      }
    } catch (e) {
      // Not JSON, likely transient proxy/WAF response, ignore.
    }
  } else if (response.status === 400 && url.includes('/auth/v1/token') && url.includes('refresh_token')) {
    try {
      const clone = response.clone()
      const body = await clone.json()
      if (body && body.error === 'invalid_grant') {
        isInvalidSession = true
      }
    } catch (e) {
      // Not JSON, ignore
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
      // AbortError means the request was cancelled by the browser (e.g. navigation
      // or component unmount) before the body finished streaming — this is benign.
      // Re-throw so that the Supabase client and React can handle the cancellation
      // cleanly rather than swallowing the error and hanging.
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
        .select('*')
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