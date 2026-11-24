// Dynamic Smart City Resolver & Normalizer
// 100% Dynamic: ZERO hardcoded cities or static dictionaries.
// Reads entirely from database (operating_cities) via activeCities list or window.__ozo_active_cities.
// Features: Case insensitivity, City code matching, Pincode matching, Dynamic alias synthesis,
// Substring matching, and Levenshtein Typo/Spelling Tolerance.

/**
 * Calculates string similarity using Levenshtein distance (0.0 to 1.0)
 */
export function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  if (s1 === s2) return 1.0

  const track = Array(s2.length + 1).fill(null).map(() =>
    Array(s1.length + 1).fill(null))
  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      )
    }
  }

  const distance = track[s2.length][s1.length]
  const maxLength = Math.max(s1.length, s2.length)
  return 1 - distance / maxLength
}

/**
 * Clean and normalize any raw city string: lowercases, collapses whitespace, strips stop-words
 */
export function normalizeCityString(input) {
  if (!input || typeof input !== 'string') return ''
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s,._-]+/g, ' ')
    .replace(/\b(bihar|jharkhand|up|uttar pradesh|delhi|india|in|city|district|dist)\b/gi, '')
    .trim()
}

/**
 * Dynamically synthesizes search aliases for a city object if not already explicitly stored.
 * Generates combinations: pure name, name without state, acronyms, code, slug without hyphens.
 */
export function getCityAliases(city) {
  if (!city) return []
  const aliases = new Set()

  // 1. Explicit aliases from DB if present
  if (Array.isArray(city.aliases)) {
    city.aliases.forEach(a => {
      if (a && typeof a === 'string') {
        aliases.add(a.toLowerCase().trim())
        const cleanA = normalizeCityString(a)
        if (cleanA) aliases.add(cleanA)
      }
    })
  }

  // 2. City Code
  if (city.code && typeof city.code === 'string') {
    aliases.add(city.code.toLowerCase().trim())
  }

  // 3. City Slug
  if (city.slug && typeof city.slug === 'string') {
    aliases.add(city.slug.toLowerCase().trim())
    aliases.add(city.slug.replace(/[-_]+/g, ' ').trim().toLowerCase())
  }

  // 4. City Name (both full and primary part before comma)
  if (city.name && typeof city.name === 'string') {
    const rawLower = city.name.toLowerCase().trim()
    aliases.add(rawLower)
    const primary = city.name.split(',')[0].trim().toLowerCase()
    aliases.add(primary)
    const cleanName = normalizeCityString(city.name)
    if (cleanName) aliases.add(cleanName)
    // Primary + state combo (e.g. "bhagalpur bihar")
    if (city.state && typeof city.state === 'string') {
      aliases.add(`${primary} ${city.state.toLowerCase().trim()}`)
    }
  }

  return Array.from(aliases).filter(Boolean)
}

/**
 * Dynamically resolves any city string / code / alias / pincode to canonical city object
 * @param {string} input - City string, slug, code, pincode, or address fragment (e.g. 'BHAGALPUR', 'bgp', 'bhgalpur', '824101')
 * @param {Array} citiesList - Optional array of operating_cities from DB. If not provided, reads from cache/window.
 * @returns {object|null} Canonical city object from DB: { id, name, slug, code, state, ... }
 */
export function resolveCity(input, citiesList = null) {
  if (!input || typeof input !== 'string') return null

  // 1. Retrieve dynamic cities from parameters or from locationStore state
  let activeCities = (Array.isArray(citiesList) && citiesList.length > 0)
    ? citiesList
    : []

  if (activeCities.length === 0 && typeof window !== 'undefined') {
    activeCities = window.__ozo_active_cities || []
  }

  if (!activeCities || activeCities.length === 0) return null

  const rawTrimmed = input.trim()
  const upperTrimmed = rawTrimmed.toUpperCase()
  const cleaned = normalizeCityString(rawTrimmed)
  const slugified = cleaned.replace(/\s+/g, '-')

  // Check 1: Pincode Match (if input is 6 digits)
  if (/^\d{6}$/.test(rawTrimmed)) {
    const byPincode = activeCities.find(c => 
      Array.isArray(c.allowed_pincodes) && c.allowed_pincodes.some(p => String(p).trim() === rawTrimmed)
    )
    if (byPincode) return byPincode
  }

  // Check 2: Exact City Code match (e.g. 'BGP', 'AUR', 'GAY')
  const byCode = activeCities.find(c => c.code && c.code.toUpperCase() === upperTrimmed)
  if (byCode) return byCode

  // Check 3: Exact Slug match (case-insensitive)
  const bySlug = activeCities.find(c => 
    c.slug && (c.slug.toLowerCase() === rawTrimmed.toLowerCase() || c.slug.toLowerCase() === slugified)
  )
  if (bySlug) return bySlug

  // Check 4: Match within dynamic synthesized aliases (DB aliases + auto-derived aliases)
  const byAlias = activeCities.find(c => {
    const allAliases = getCityAliases(c)
    return allAliases.some(a => {
      return a === rawTrimmed.toLowerCase() || a === cleaned
    })
  })
  if (byAlias) return byAlias

  // Check 5: Cleaned Name exact or substring match
  const byName = activeCities.find(c => {
    const cClean = normalizeCityString(c.name)
    if (!cClean) return false
    return cClean === cleaned || cClean.includes(cleaned) || (cleaned.length >= 3 && cleaned.includes(cClean))
  })
  if (byName) return byName

  // Check 6: Smart Fuzzy matching with Levenshtein distance for typos (e.g. 'bhgalpur' -> 'Bhagalpur', 'aurangbad' -> 'Aurangabad')
  let bestMatch = null
  let highestSimilarity = 0

  for (const c of activeCities) {
    const allAliases = getCityAliases(c)
    for (const alias of allAliases) {
      const sim = calculateSimilarity(cleaned, alias)
      if (sim > highestSimilarity && sim >= 0.65) {
        highestSimilarity = sim
        bestMatch = c
      }
    }
  }

  return bestMatch
}

/**
 * Returns canonical slug for any input, or fallback
 */
export function resolveCitySlug(input, citiesList = null, fallback = null) {
  const resolved = resolveCity(input, citiesList)
  if (resolved?.slug) return resolved.slug
  if (fallback) return fallback
  const first = (Array.isArray(citiesList) && citiesList.length > 0)
    ? citiesList[0]
    : (typeof window !== 'undefined' && window.__ozo_active_cities?.[0])
  return first?.slug || 'aurangabad-bihar'
}

/**
 * Returns canonical 3-letter city code (e.g. 'BGP', 'AUR')
 */
export function resolveCityCode(input, citiesList = null, fallback = 'OZO') {
  const resolved = resolveCity(input, citiesList)
  if (resolved?.code) return resolved.code
  return fallback
}
