import { supabase } from './supabase'

/**
 * Match CSV rows against the product catalog via server-side Postgres function.
 * @param {Array} rows - Array of objects with barcode and name strings
 * @returns {Promise<{matched: Array, unmatched: Array, total: number}>}
 */
/**
 * Match CSV rows against the product catalog via server-side Postgres function.
 * Batches requests in chunks of 100 rows if necessary.
 * @param {Array} rows - Array of objects with barcode, name, brand, unit, price, mart_id
 * @returns {Promise<{matched: Array, review: Array, unmatched: Array, total: number}>}
 */
export async function matchProductsForImport(rows) {
  if (!rows || rows.length === 0) {
    return { matched: [], review: [], unmatched: [], total: 0 }
  }

  const BATCH_SIZE = 100
  if (rows.length <= BATCH_SIZE) {
    const { data, error } = await supabase.rpc('match_products_for_import', {
      import_data: rows
    })
    if (error) {
      console.error('[RPC match_products_for_import] Failed:', error)
      throw error
    }
    return data
  }

  // Batching for large CSVs
  let allMatched = []
  let allReview = []
  let allUnmatched = []

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { data, error } = await supabase.rpc('match_products_for_import', {
      import_data: batch
    })
    if (error) {
      console.error(`[RPC match_products_for_import] Batch ${i} failed:`, error)
      throw error
    }
    if (data) {
      if (data.matched) allMatched.push(...data.matched)
      if (data.review) allReview.push(...data.review)
      if (data.unmatched) allUnmatched.push(...data.unmatched)
    }
  }

  return {
    matched: allMatched,
    review: allReview,
    unmatched: allUnmatched,
    total: rows.length
  }
}

/**
 * Save user-confirmed product link for future self-learning.
 * @param {string} martId - Mart UUID
 * @param {string} sourceName - Original CSV product name
 * @param {string} sourceBarcode - Original CSV barcode (optional)
 * @param {string} productId - Global product UUID
 * @param {number} matchScore - Confidence score
 */
export async function confirmProductLink(martId, sourceName, sourceBarcode, productId, matchScore = 100) {
  if (!martId || !sourceName || !productId) return null;

  // normalize source name in client too or let DB handle via normalize_product_name RPC
  const { data: normData } = await supabase.rpc('normalize_product_name', { input_name: sourceName })
  const normalizedName = normData || sourceName.toLowerCase().trim();

  const { data, error } = await supabase
    .from('confirmed_product_links')
    .upsert({
      mart_id: martId,
      source_name: sourceName,
      source_name_normalized: normalizedName,
      source_barcode: sourceBarcode || null,
      product_id: productId,
      match_score: matchScore
    }, { onConflict: 'mart_id,source_name_normalized' })

  if (error) {
    console.error('[RPC confirmProductLink] Failed:', error)
  }
  return data
}

