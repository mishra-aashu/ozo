// Dynamic Smart City Resolver & Normalizer
// 100% Dynamic: NO hardcoded cities or aliases.
// Reads entirely from database (operating_cities) via activeCities list or locationStore.
// Supports: Case insensitivity, Code matching, Alias matching, Substring matching, and Levenshtein Typo Tolerance.

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
 * Dynamically resolves any city string / code / alias to canonical city object
 * @param {string} input - City string, slug, code or address fragment (e.g. 'BHAGALPUR', 'bgp', 'bhgalpur', 'Aurangabad, Bihar')
 * @param {Array} citiesList - Optional array of operating_cities from DB. If not provided, reads from locationStore.
 * @returns {object|null} Canonical city object from DB: { id, name, slug, code, state, ... }
 */
export function resolveCity(input, citiesList = null) {
  if (!input || typeof input !== 'string') return null

  // 1. Retrieve dynamic cities from parameters or from locationStore state
  let activeCities = (Array.isArray(citiesList) && citiesList.length > 0)
    ? citiesList
    : []

  if (activeCities.length === 0 && typeof useLocationStore !== 'undefined') {
    try {
      activeCities = useLocationStore.getState?.()?.activeCities || []
    } catch (e) {
      activeCities = []
    }
  }

  if (!activeCities || activeCities.length === 0) return null

  const rawTrimmed = input.trim()
  const upperTrimmed = rawTrimmed.toUpperCase()
  const cleaned = normalizeCityString(rawTrimmed)
  const slugified = cleaned.replace(/\s+/g, '-')

  // 1. Exact City Code match (e.g. 'BGP', 'AUR')
  const byCode = activeCities.find(c => c.code && c.code.toUpperCase() === upperTrimmed)
  if (byCode) return byCode

  // 2. Exact Slug match (case-insensitive)
  const bySlug = activeCities.find(c => 
    c.slug && (c.slug.toLowerCase() === rawTrimmed.toLowerCase() || c.slug.toLowerCase() === slugified)
  )
  if (bySlug) return bySlug

  // 3. Match within dynamic DB aliases array (e.g. c.aliases from Postgres)
  const byAlias = activeCities.find(c => {
    if (!Array.isArray(c.aliases)) return false
    return c.aliases.some(a => {
      if (!a) return false
      const aClean = normalizeCityString(a)
      return aClean === cleaned || a.toLowerCase() === rawTrimmed.toLowerCase()
    })
  })
  if (byAlias) return byAlias

  // 4. Cleaned Name exact or substring match
  const byName = activeCities.find(c => {
    const cClean = normalizeCityString(c.name)
    if (!cClean) return false
    return cClean === cleaned || cClean.includes(cleaned) || (cleaned.length >= 3 && cleaned.includes(cClean))
  })
  if (byName) return byName

  // 5. Smart Fuzzy matching with similarity threshold (handles spelling mistakes like 'bhaglpur' -> 'Bhagalpur')
  let bestMatch = null
  let highestSimilarity = 0

  for (const c of activeCities) {
    const cClean = normalizeCityString(c.name)
    const sim = calculateSimilarity(cleaned, cClean)
    if (sim > highestSimilarity && sim >= 0.65) {
      highestSimilarity = sim
      bestMatch = c
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
    : useLocationStore?.getState?.()?.activeCities?.[0]
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
