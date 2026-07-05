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

  let newInit = { ...init }

  // Encrypt request body if sending JSON to proxy
  if (isProxyRequest && newInit.body && ["POST", "PUT", "PATCH", "DELETE"].includes(newInit.method || 'GET')) {
    let newHeaders = {}
    if (newInit.headers) {
      if (newInit.headers instanceof Headers) {
        newHeaders = Object.fromEntries(newInit.headers.entries())
      } else {
        newHeaders = { ...newInit.headers }
      }
    }
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
        newInit.headers = newHeaders
      } catch (err) {
        console.error('[OZO Crypto] Request encryption failed:', err)
      }
    }
  }

  const response = await fetch(input, newInit)

  // Auto-clear invalid/expired sessions if Supabase Auth rejects the token with 403 Forbidden
  if (response.status === 403 && url.includes('/auth/v1/user')) {
    console.warn('[OZO Auth] Got 403 Forbidden from Supabase Auth. Clearing invalid session storage.');
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('ozo-auth-token');
      window.localStorage.removeItem('ozo-auth-storage');
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
// ADMIN CLIENT — Direct Supabase (No Proxy)
// Used in all admin pages for reliable data fetching.
// Session persistence is disabled here to avoid duplicate GoTrue client
// storage warnings. The session is synced manually from authStore.js.
// =============================================
const adminUrl = supabaseDirectUrl || supabaseUrl
export const supabaseAdmin = createClient(adminUrl, supabaseAnonKey, {
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
  try {
    const formData = new FormData()
    if (customName && file instanceof File) {
      const ext = file.name.split('.').pop()
      const filename = customName.endsWith(`.${ext}`) ? customName : `${customName}.${ext}`
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
    
    // Add 8-second timeout controller to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      const result = await response.json()
      if (result.success && result.data && result.data.url) {
        return { url: result.data.url, data: result.data, error: null }
      } else {
        throw new Error(result.error?.message || 'Failed to upload image to imgbb')
      }
    } catch (fetchErr) {
      clearTimeout(timeoutId)
      if (fetchErr.name === 'AbortError') {
        throw new Error('Image upload timed out after 8 seconds')
      }
      throw fetchErr
    }
  } catch (error) {
    console.error('Imgbb upload error:', error)
    return { url: null, data: null, error }
  }
}

// Parallel Image Uploader (Primary freehost + Backup Supabase Storage)
export const uploadCatalogImage = async (file, barcode, imageIndex) => {
  try {
    const ext = (file instanceof File && file.name) ? file.name.split('.').pop() : 'jpg';
    const customName = `catalog-${barcode}-${imageIndex}`;
    
    // 1. Primary upload to ImgBB / Freeimage.host
    const primaryPromise = uploadToImgbb(file, customName);
    
    // 2. Backup upload to Supabase Storage in parallel
    const supabasePath = `merchant-photos/${barcode}/${imageIndex}.${ext}`;
    const backupPromise = supabase.storage
      .from('mart-assets')
      .upload(supabasePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    // Wait for both in parallel
    const [primaryResult, backupResult] = await Promise.allSettled([
      primaryPromise,
      backupPromise
    ]);

    let primaryUrl = null;
    let backupUrl = null;
    let error = null;

    if (primaryResult.status === 'fulfilled' && primaryResult.value && primaryResult.value.url) {
      primaryUrl = primaryResult.value.url;
    } else {
      const errReason = primaryResult.status === 'rejected' 
        ? primaryResult.reason 
        : ((primaryResult.value && primaryResult.value.error) || 'Primary upload failed');
      console.error('[Upload] Primary upload failed:', errReason);
      error = errReason;
    }

    if (backupResult.status === 'fulfilled' && backupResult.value && !backupResult.value.error) {
      const { data } = supabase.storage
        .from('mart-assets')
        .getPublicUrl(supabasePath);
      backupUrl = data?.publicUrl;
    } else {
      const errReason = backupResult.status === 'rejected' 
        ? backupResult.reason 
        : ((backupResult.value && backupResult.value.error) || 'Backup upload failed');
      console.warn('[Upload] Backup upload to Supabase failed:', errReason);
    }

    // Return the result
    return {
      url: primaryUrl || backupUrl, // Fallback to backup if primary failed
      primaryUrl,
      backupUrl,
      error: (primaryUrl || backupUrl) ? null : (error || 'Both upload providers failed')
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