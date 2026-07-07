import { supabase } from './supabase'

/**
 * Match CSV rows against the product catalog via server-side Postgres function.
 * @param {Array} rows - Array of objects with barcode and name strings
 * @returns {Promise<{matched: Array, unmatched: Array, total: number}>}
 */
export async function matchProductsForImport(rows) {
  const { data, error } = await supabase.rpc('match_products_for_import', {
    import_data: rows
  })
  if (error) {
    console.error('[RPC match_products_for_import] Failed:', error)
    throw error
  }
  return data;
}
