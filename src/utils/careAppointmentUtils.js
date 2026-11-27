/**
 * Utility functions for OzoCare appointments:
 * - Parsing dates and slot end times
 * - Determining whether an appointment / token is active, upcoming, or over (expired/past)
 */

export function parseDateParts(rawDate) {
  if (!rawDate) return null
  if (rawDate instanceof Date) {
    if (isNaN(rawDate.getTime())) return null
    return {
      year: rawDate.getFullYear(),
      month: rawDate.getMonth() + 1,
      day: rawDate.getDate()
    }
  }

  const str = String(rawDate).trim()

  // Match YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (ymdMatch) {
    return {
      year: parseInt(ymdMatch[1], 10),
      month: parseInt(ymdMatch[2], 10),
      day: parseInt(ymdMatch[3], 10)
    }
  }

  // Match DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (dmyMatch) {
    return {
      year: parseInt(dmyMatch[3], 10),
      month: parseInt(dmyMatch[2], 10),
      day: parseInt(dmyMatch[1], 10)
    }
  }

  // Fallback to Date.parse
  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) {
    return {
      year: parsed.getFullYear(),
      month: parsed.getMonth() + 1,
      day: parsed.getDate()
    }
  }

  return null
}

/**
 * Parses the end time of a time_slot string (e.g. "11:30 AM - 12:00 PM" -> 12:00 PM).
 * Returns a Date object anchored to the provided baseDate (or today).
 */
export function parseSlotEndTime(slotStr, baseDate = new Date()) {
  if (!slotStr) return null
  const str = String(slotStr).trim()
  
  let timeStr = str
  if (str.includes('-')) {
    const segments = str.split('-')
    timeStr = segments[1]?.trim() || segments[0]?.trim()
  }

  // Regex to match "12:00 PM", "12:00pm", "1:30 AM", "14:00"
  const match = timeStr.match(/(\d{1,2}):(\d{2})(?:\s*([ap]m))?/i)
  if (!match) return null

  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const meridiem = match[3] ? match[3].toUpperCase() : null

  if (meridiem === 'PM' && hours < 12) {
    hours += 12
  } else if (meridiem === 'AM' && hours === 12) {
    hours = 0
  }

  const d = new Date(baseDate)
  d.setHours(hours, minutes, 0, 0)
  return d
}

/**
 * Compares parsed appointment date with current local date.
 * Returns -1 if appointment date is before today (past)
 * Returns  0 if appointment date is today
 * Returns  1 if appointment date is after today (future)
 */
export function getDateComparisonWithToday(aptParts) {
  if (!aptParts) return 0
  const now = new Date()
  const todayYear = now.getFullYear()
  const todayMonth = now.getMonth() + 1
  const todayDay = now.getDate()

  if (aptParts.year < todayYear) return -1
  if (aptParts.year > todayYear) return 1
  if (aptParts.month < todayMonth) return -1
  if (aptParts.month > todayMonth) return 1
  if (aptParts.day < todayDay) return -1
  if (aptParts.day > todayDay) return 1

  return 0 // exactly today!
}

/**
 * Checks if an appointment is for today.
 */
export function isAppointmentToday(appointment) {
  if (!appointment) return false
  const rawDate = appointment.appointment_date || appointment.date || appointment.scheduled_date
  const aptParts = parseDateParts(rawDate)
  if (!aptParts) return false
  return getDateComparisonWithToday(aptParts) === 0
}

/**
 * Checks if an appointment is completely "over" / finished / expired / past time.
 * If true, it should NOT be shown in active live banners or queue counters.
 */
export function isAppointmentOver(appointment) {
  if (!appointment) return true

  const status = (appointment.status || '').toLowerCase().trim()
  // Explicitly completed, cancelled, or rejected appointments are over
  if (['completed', 'cancelled', 'canceled', 'rejected', 'expired', 'refunded', 'absent', 'no_show'].includes(status)) {
    return true
  }

  try {
    const rawDate = appointment.appointment_date || appointment.date || appointment.scheduled_date || appointment.created_at
    const aptParts = parseDateParts(rawDate)
    const now = new Date()

    if (aptParts) {
      const cmp = getDateComparisonWithToday(aptParts)

      // 1. Date has already passed
      if (cmp < 0) {
        return true
      }

      // 2. Date is in the future
      if (cmp > 0) {
        return false
      }

      // 3. Date is TODAY
      // If doctor is actively in consultation with patient right now, it is not over
      if (status === 'in_consultation') {
        return false
      }

      // If status is 'booked', check slot end time
      const slotStr = appointment.time_slot || appointment.slot_time || appointment.slot
      if (slotStr) {
        const slotEndTime = parseSlotEndTime(slotStr, now)
        if (slotEndTime && now.getTime() > slotEndTime.getTime()) {
          // Time slot has passed! Appointment is over.
          return true
        }
      }

      // If slot has not ended yet today
      return false
    }

    // Fallback if no date could be parsed: if created > 24h ago, consider over
    if (appointment.created_at) {
      const createdTime = new Date(appointment.created_at).getTime()
      if (!isNaN(createdTime) && now.getTime() - createdTime > 24 * 60 * 60 * 1000) {
        return true
      }
    }
  } catch (err) {
    console.error('[careAppointmentUtils] Error checking appointment status:', err)
  }

  return false
}

/**
 * Checks if an appointment is currently active (upcoming or in consultation, not over).
 */
export function isAppointmentActive(appointment) {
  if (!appointment) return false
  const status = (appointment.status || '').toLowerCase().trim()
  if (status !== 'booked' && status !== 'in_consultation') {
    return false
  }
  return !isAppointmentOver(appointment)
}
