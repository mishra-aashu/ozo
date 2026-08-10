/**
 * Helper functions to parse and format the landmark field.
 * This stores the receiver's name, phone number, and delivery notes/instructions
 * in a serialized format inside the landmark field since direct columns do not exist in the database.
 */

export const parseLandmark = (landmarkStr) => {
  if (!landmarkStr) {
    return { receiverName: '', receiverPhone: '', notes: '', landmark: '' }
  }
  
  // Format: [Contact: Name | Phone: Phone | Notes: Notes] Landmark
  const contactMatch = landmarkStr.match(/^\[Contact:\s*([^|]*?)\s*\|\s*Phone:\s*([^|\]]*?)(?:\s*\|\s*Notes:\s*([^\]]*?))?\]\s*(.*)$/)
  if (contactMatch) {
    return {
      receiverName: contactMatch[1]?.trim() || '',
      receiverPhone: contactMatch[2]?.trim() || '',
      notes: contactMatch[3]?.trim() || '',
      landmark: contactMatch[4]?.trim() || ''
    }
  }
  
  return { receiverName: '', receiverPhone: '', notes: '', landmark: landmarkStr.trim() }
}

export const formatLandmark = (receiverName, receiverPhone, landmark, notes = '') => {
  const cleanName = receiverName?.trim() || ''
  const cleanPhone = receiverPhone?.trim() || ''
  const cleanLandmark = landmark?.trim() || ''
  const cleanNotes = notes?.trim() || ''
  
  if (!cleanName && !cleanPhone && !cleanNotes) {
    return cleanLandmark
  }
  
  let contactPart = `Contact: ${cleanName} | Phone: ${cleanPhone}`
  if (cleanNotes) {
    contactPart += ` | Notes: ${cleanNotes}`
  }
  return `[${contactPart}] ${cleanLandmark}`
}

import { useLocationStore } from '../stores/locationStore'

export const resolveSnappedAddress = (loc) => {
  const addr = loc.addressDetails || {}
  const nearest = loc.nearestStreet || null
  const lat = loc.lat
  const lng = loc.lng
  
  const nearestCity = useLocationStore.getState().nearestCity
  
  // Calculate distance between user coordinates and the nearest active city center
  let isWithinCityZone = false
  if (nearestCity && nearestCity.latitude && nearestCity.longitude && lat && lng) {
    const R = 6371 // Earth's radius in km
    const cLat = parseFloat(nearestCity.latitude)
    const cLng = parseFloat(nearestCity.longitude)
    const dLat = (cLat - lat) * Math.PI / 180
    const dLon = (cLng - lng) * Math.PI / 180
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat*Math.PI/180)*Math.cos(cLat*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2)
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const maxRadius = Math.max(parseFloat(nearestCity.service_radius_km) || 25.0, 25.0)
    isWithinCityZone = dist <= maxRadius
  }

  const useSnappedCityDetails = nearest && isWithinCityZone
  
  const street = nearest 
    ? (nearest.name_hi ? `${nearest.name} (${nearest.name_hi})` : nearest.name)
    : [addr.road, addr.pedestrian || addr.suburb].filter(Boolean).join(', ')
  
  const cityVal = useSnappedCityDetails ? (nearestCity?.name || '') : (addr.city || addr.town || addr.village || addr.county || '')
  const stateVal = useSnappedCityDetails ? (nearestCity?.state || '') : (addr.state || '')
  const pincodeVal = useSnappedCityDetails ? (nearestCity?.allowed_pincodes?.[0] || '') : (addr.postcode || '')
  const landmarkVal = addr.amenity || addr.landmark || addr.commercial || addr.shop || ''

  return {
    street,
    cityVal,
    stateVal,
    pincodeVal,
    landmarkVal
  }
}
