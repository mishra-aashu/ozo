/**
 * OZO Delivery Confirmation OTP / PIN Utility
 * 
 * Generates, extracts, and validates 4-digit delivery verification PINs
 * displayed directly inside the OZO app (no SMS required).
 */

/**
 * Generates a random 4-digit OTP string between 1000 and 9999
 * @returns {string} 4-digit OTP
 */
export const generateDeliveryOtp = () => {
  return String(Math.floor(1000 + Math.random() * 9000))
}

/**
 * Resolves the 4-digit Delivery PIN for an order.
 * Primary: order.delivery_otp from database
 * Fallbacks: deterministic 4-digit PIN derived from order_number or order.id
 * 
 * Ensures consistent PIN display across Customer and Captain apps even if
 * database migration is pending or during offline synchronization.
 * 
 * @param {Object} order - Order object
 * @returns {string} 4-digit OTP
 */
export const getDeliveryOtp = (order) => {
  if (!order) return '0000'

  // 1. Direct database column
  if (order.delivery_otp && String(order.delivery_otp).trim().length >= 4) {
    return String(order.delivery_otp).trim().slice(-4)
  }

  // 2. Metadata property if present
  if (order.metadata?.delivery_otp && String(order.metadata.delivery_otp).trim().length >= 4) {
    return String(order.metadata.delivery_otp).trim().slice(-4)
  }

  // 3. Fallback: extract last 4 digits from order_number (e.g. OZO-481920 -> 1920)
  const orderNumberStr = String(order.order_number || '')
  const digitsOnly = orderNumberStr.replace(/\D/g, '')
  if (digitsOnly.length >= 4) {
    return digitsOnly.slice(-4)
  }

  // 4. Fallback: deterministic numeric hash from order UUID
  const idStr = String(order.id || '')
  if (idStr.length > 0) {
    let hash = 0
    for (let i = 0; i < idStr.length; i++) {
      hash = ((hash << 5) - hash) + idStr.charCodeAt(i)
      hash |= 0
    }
    const pin = Math.abs(hash % 9000) + 1000
    return String(pin)
  }

  return '1234'
}

/**
 * Validates an entered OTP against the expected order PIN
 * @param {Object} order - Order object
 * @param {string} enteredOtp - OTP entered by delivery captain
 * @returns {boolean} True if matching
 */
export const verifyDeliveryOtp = (order, enteredOtp) => {
  if (!order || !enteredOtp) return false
  const expected = getDeliveryOtp(order).trim()
  const actual = String(enteredOtp).replace(/\D/g, '').trim()
  return actual.length === 4 && actual === expected
}
