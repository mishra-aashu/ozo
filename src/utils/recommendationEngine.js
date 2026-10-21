/**
 * OZO Quick-Commerce Smart Recommendation Engine
 * 
 * Provides:
 * 1. Verified Quick-Commerce Category & Subcategory Affinity Matrix
 * 2. Multi-Factor Deterministic Candidate Scoring
 * 3. In-Memory Recommendation Cache (0ms response)
 */

// 1. High-Precision Quick-Commerce Complementary Affinity Matrix
// Maps active Supabase category & subcategory slugs to high-affinity cross-sell categories
export const COMPLEMENTARY_AFFINITY_MAP = {
  // --- Subcategory Specific Pairings (Highest relevance) ---
  'breads': ['butter', 'cheese', 'sauces-spreads', 'milk', 'tea', 'coffee'],
  'buns-rusks': ['tea', 'coffee', 'butter', 'milk'],
  'biscuits-cookies': ['tea', 'coffee', 'milk', 'cold-drinks'],
  'breakfast-cereals': ['milk', 'curd-yogurt', 'dry-fruits-nuts'],
  'rolled-oats': ['milk', 'peanut-butter', 'dry-fruits-nuts'],
  'milk': ['breads', 'breakfast-cereals', 'biscuits-cookies', 'tea', 'coffee'],
  'butter': ['breads', 'buns-rusks', 'cheese', 'flour-grains'],
  'cheese': ['breads', 'noodles-pasta', 'sauces-spreads', 'butter'],
  'paneer-tofu': ['mixed-spice-blends', 'cooking-oils', 'ghee-vanaspati', 'flour-grains'],
  'curd-yogurt': ['rice-poha', 'breakfast-cereals', 'flour-grains'],
  'tea': ['biscuits-cookies', 'milk', 'buns-rusks', 'salt-sugar'],
  'coffee': ['biscuits-cookies', 'milk', 'cakes-pastries', 'salt-sugar'],
  'cold-drinks': ['western-snacks', 'indian-namkeen', 'noodles-pasta', 'roasted-dry-snacks'],
  'soft-drinks-soda': ['western-snacks', 'indian-namkeen', 'noodles-pasta'],
  'juices-sharbat': ['western-snacks', 'biscuits-cookies', 'roasted-dry-snacks'],
  'noodles-pasta': ['sauces-spreads', 'cheese', 'soft-drinks-soda', 'cold-drinks'],
  'ready-meals': ['cold-drinks', 'soft-drinks-soda', 'pickles', 'curd-yogurt'],
  'split-lentils-dal': ['rice-poha', 'whole-spices', 'powdered-spices', 'cooking-oils', 'ghee-vanaspati', 'pickles'],
  'whole-lentils': ['rice-poha', 'whole-spices', 'cooking-oils', 'ghee-vanaspati'],
  'rice-poha': ['split-lentils-dal', 'cooking-oils', 'ghee-vanaspati', 'roasted-dry-snacks'],
  'cooking-oils': ['split-lentils-dal', 'powdered-spices', 'flour-grains', 'rice-poha'],
  'ghee-vanaspati': ['flour-grains', 'rice-poha', 'split-lentils-dal', 'pooja-essentials'],
  'flour-grains': ['cooking-oils', 'ghee-vanaspati', 'split-lentils-dal', 'salt-sugar'],
  'whole-spices': ['split-lentils-dal', 'cooking-oils', 'rice-poha'],
  'powdered-spices': ['cooking-oils', 'split-lentils-dal', 'rice-poha', 'flour-grains'],
  'mixed-spice-blends': ['cooking-oils', 'paneer-tofu', 'split-lentils-dal'],
  'salt-sugar': ['tea', 'coffee', 'flour-grains', 'cooking-oils'],
  'pickles': ['split-lentils-dal', 'rice-poha', 'flour-grains'],
  'sauces-spreads': ['breads', 'noodles-pasta', 'western-snacks'],
  'peanut-butter': ['breads', 'rolled-oats', 'breakfast-cereals'],
  'indian-namkeen': ['tea', 'cold-drinks', 'soft-drinks-soda', 'biscuits-cookies'],
  'western-snacks': ['cold-drinks', 'soft-drinks-soda', 'sauces-spreads'],
  'roasted-dry-snacks': ['tea', 'coffee', 'cold-drinks'],
  'pooja-essentials': ['ghee-vanaspati', 'pooja-others'],
  'detergents': ['dishwash', 'floor-surface-cleaners', 'tissues-wipes'],
  'dishwash': ['detergents', 'kitchen-consumables', 'floor-surface-cleaners'],
  'floor-surface-cleaners': ['detergents', 'dishwash', 'tissues-wipes'],
  'kitchen-consumables': ['dishwash', 'detergents', 'tissues-wipes'],
  'oral-care': ['personal-care-hygiene', 'skin-care'],
  'hair-care': ['skin-care', 'personal-care-hygiene'],
  'skin-care': ['hair-care', 'oral-care'],
  'baby-cereals': ['baby-snacks', 'diapers-baby-hygiene', 'milk'],
  'baby-formula': ['diapers-baby-hygiene', 'baby-cereals'],
  'diapers-baby-hygiene': ['baby-cereals', 'baby-formula', 'baby-snacks'],

  // --- Parent Category Pairings (Broad fallback) ---
  'dairy-products': ['bakery-grains', 'beverages', 'breakfast-cereals', 'snacks-namkeen'],
  'bakery-grains': ['dairy-products', 'beverages', 'instant-ready-to-eat'],
  'pulses-lentils-dals': ['spices-seasonings', 'oils-fats', 'bakery-grains', 'pickles-chutneys-sauces'],
  'oils-fats': ['pulses-lentils-dals', 'spices-seasonings', 'bakery-grains'],
  'spices-seasonings': ['pulses-lentils-dals', 'oils-fats', 'pickles-chutneys-sauces'],
  'pickles-chutneys-sauces': ['snacks-namkeen', 'instant-ready-to-eat', 'bakery-grains'],
  'snacks-namkeen': ['beverages', 'instant-ready-to-eat', 'summer-specials'],
  'beverages': ['snacks-namkeen', 'bakery-grains', 'dairy-products'],
  'instant-ready-to-eat': ['beverages', 'snacks-namkeen', 'pickles-chutneys-sauces'],
  'baking-sweet-essentials': ['dairy-products', 'bakery-grains'],
  'frozen-foods': ['beverages', 'snacks-namkeen', 'sauces-spreads'],
  'baby-care': ['personal-care-hygiene', 'dairy-products'],
  'household-cleaning': ['personal-care-hygiene', 'kitchen-consumables'],
  'personal-care-hygiene': ['household-cleaning', 'baby-care'],
  'pooja-spiritual-items': ['oils-fats', 'spices-seasonings'],
  'summer-specials': ['beverages', 'snacks-namkeen', 'dairy-products'],
  'non-veg-food': ['spices-seasonings', 'oils-fats', 'beverages']
}

// 2. Multi-Factor Composite Candidate Scoring Function
/**
 * Scores a candidate product based on relevance to viewed context or cart
 * 
 * @param {Object} candidate - Product to score
 * @param {Object} context - { baseProduct, isCartContext, targetPriceBand }
 * @returns {number} Numeric relevance score
 */
export const scoreProductRelevance = (candidate, context = {}) => {
  if (!candidate) return -99999

  let score = 0
  const { baseProduct = null, isCartContext = false } = context

  // 1. Availability / In-Stock Guarantee (+1000 or -1000)
  const isAvailable = candidate.is_available !== false
  const hasQuantity = candidate.quantity_available !== 0 && candidate.quantity_available !== '0'
  const inStock = isAvailable && hasQuantity

  if (inStock) {
    score += 1000
  } else {
    score -= 1000
  }

  // 2. Brand Affinity (+35)
  // If user is looking at Amul Milk, suggest Amul Butter/Cheese
  if (baseProduct?.brand && candidate?.brand) {
    const baseBrand = baseProduct.brand.trim().toLowerCase()
    const candBrand = candidate.brand.trim().toLowerCase()
    if (baseBrand === candBrand && baseBrand.length > 1) {
      score += 35
    }
  }

  // 3. Bestseller Boost (+25)
  if (candidate.is_bestseller) {
    score += 25
  }

  // 4. Featured Flag (+10)
  if (candidate.is_featured) {
    score += 10
  }

  // 5. Discount & Value Appeal (+10 to +20)
  const mrp = parseFloat(candidate.mrp || 0)
  const price = parseFloat(candidate.ozo_price || candidate.price || 0)
  if (mrp > price && mrp > 0) {
    const discountPct = Math.round(((mrp - price) / mrp) * 100)
    if (discountPct >= 20) {
      score += 20
    } else if (discountPct >= 10) {
      score += 12
    } else if (discountPct > 0) {
      score += 5
    }
  }

  // 6. Cart Context: Impulse Add-On Sweet Spot (₹20 to ₹199) (+18)
  // Quick-commerce users frequently add items under ₹200 to cross free delivery thresholds
  if (isCartContext) {
    if (price >= 20 && price <= 199) {
      score += 18
    } else if (price > 199 && price <= 350) {
      score += 8
    }
  }

  return score
}

// 3. High-Performance In-Memory Cache (3-minute TTL)
const recommendationCache = new Map()
const CACHE_TTL_MS = 3 * 60 * 1000 // 3 minutes

export const getCachedRecommendations = (key) => {
  const cached = recommendationCache.get(key)
  if (!cached) return null
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    recommendationCache.delete(key)
    return null
  }
  return cached.data
}

export const setCachedRecommendations = (key, data) => {
  if (recommendationCache.size > 150) {
    const firstKey = recommendationCache.keys().next().value
    recommendationCache.delete(firstKey)
  }
  recommendationCache.set(key, {
    data,
    timestamp: Date.now()
  })
}

// 4. Slug Resolver: Resolve complementary category slugs for an array of input slugs
export const resolveComplementarySlugs = (inputSlugs = []) => {
  const result = new Set()
  if (!Array.isArray(inputSlugs)) return []

  inputSlugs.forEach(slug => {
    if (!slug) return
    const cleanSlug = slug.toLowerCase().trim()
    const complements = COMPLEMENTARY_AFFINITY_MAP[cleanSlug]
    if (Array.isArray(complements)) {
      complements.forEach(comp => result.add(comp))
    }
  })

  return Array.from(result)
}
