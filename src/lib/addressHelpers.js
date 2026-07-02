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
