/**
 * Dynamic loader for Cashfree Payment Gateway SDK (v3).
 * Loads the external SDK only when the payment flow is triggered,
 * preventing render-blocking and saving ~100KB+ on initial page loads.
 */
let cashfreeLoadPromise = null

export const loadCashfreeSdk = () => {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.Cashfree) return Promise.resolve(window.Cashfree)
  if (cashfreeLoadPromise) return cashfreeLoadPromise

  cashfreeLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="cashfree.com"]')
    if (existing) {
      if (window.Cashfree) return resolve(window.Cashfree)
      existing.addEventListener('load', () => resolve(window.Cashfree))
      existing.addEventListener('error', (err) => reject(new Error('Failed to load Cashfree SDK: ' + (err?.message || 'error'))))
      return
    }

    const script = document.createElement('script')
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js'
    script.async = true
    script.crossOrigin = 'anonymous'
    script.onload = () => {
      resolve(window.Cashfree)
    }
    script.onerror = () => {
      cashfreeLoadPromise = null
      reject(new Error('Failed to load Cashfree SDK from CDN'))
    }
    document.head.appendChild(script)
  })

  return cashfreeLoadPromise
}

export default loadCashfreeSdk
