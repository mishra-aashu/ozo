import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './_supabase.js';
import { checkRateLimit, setRateLimitHeaders } from './_ratelimit.js';

// In-memory cache for API responses (persists between warm requests on the same Vercel instance)
const apiCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

interface SyncConfig {
  api_key: string;
  state: string;
  district: string;
  market: string;
  markup_percent: number;
  mrp_markup_percent: number;
  auto_sync: boolean;
  mappings: Record<string, {
    commodity: string;
    variety?: string;
    weight_override?: number;
  }>;
  last_run?: {
    timestamp: string;
    status: 'success' | 'failed' | 'partial';
    products_processed: number;
    products_updated: number;
    products_skipped: number;
    api_calls_made: number;
    execution_time_ms: number;
    errors: string[];
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  
  // CORS — restrict to OZO domains + localhost
  const origin = (req.headers.origin || '') as string;
  const allowedOrigins = ["https://www.ozomart.store", "https://ozomart.store"];
  const isAllowed = allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : 'https://www.ozomart.store');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Validate Authorization
  const authHeader = req.headers.authorization;
  const expectedSecret = process.env.MANDI_SYNC_SECRET;
  if (!expectedSecret || authHeader !== expectedSecret) {
    // Stop enumeration by rate limiting failed attempts specifically (5 per minute)
    const rateLimitResult = await checkRateLimit(req, 5, 60);
    setRateLimitHeaders(res, rateLimitResult);
    if (!rateLimitResult.success) {
      return res.status(429).json({ error: 'Too many unauthorized attempts. Rate limit exceeded.' });
    }
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const isDryRun = req.query.test === 'true';

  const errors: string[] = [];
  let apiCallsMade = 0;
  let productsProcessed = 0;
  let productsUpdated = 0;
  let productsSkipped = 0;

  try {
    // 1. Fetch Mandi Sync configuration from public.app_settings
    const { data: configRow, error: configError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'mandi_sync_config')
      .single();

    if (configError || !configRow) {
      throw new Error(`Failed to load sync configuration: ${configError?.message || 'Config row not found'}`);
    }

    const config = configRow.value as SyncConfig;
    const apiKey = config.api_key || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
    const state = config.state || 'Bihar';
    const district = config.district || 'Gaya';
    const market = config.market || 'Tekari APMC';
    const markupPercent = config.markup_percent !== undefined ? config.markup_percent : 25;
    const mrpMarkupPercent = config.mrp_markup_percent !== undefined ? config.mrp_markup_percent : 50;
    const mappings = config.mappings || {};

    // 2. Fetch Mandi records for the state (with caching and pagination support)
    const todayStr = new Date().toISOString().split('T')[0];
    const cacheKey = `mandi_${state}_${todayStr}`;
    const cached = apiCache.get(cacheKey);

    let allRecords: any[] = [];
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      allRecords = cached.data;
    } else {
      let offset = 0;
      // If the key is the public sample key, default limit to 10 to avoid api blockages/limits.
      // Otherwise, query larger pages (e.g. 500) to minimize network roundtrips.
      const isSampleKey = apiKey === '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
      const limit = isSampleKey ? 10 : 500;
      let totalRecordsCount = 0;

      do {
        const apiUrl = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=${limit}&offset=${offset}&filters[state.keyword]=${encodeURIComponent(state)}`;
        
        apiCallsMade++;
        const apiRes = await fetch(apiUrl);
        if (!apiRes.ok) {
          throw new Error(`Mandi API request failed with status ${apiRes.status}`);
        }

        const data = await apiRes.json();
        if (data.status === 'error') {
          throw new Error(`Mandi API error: ${data.message || 'Unknown API failure'}`);
        }

        const records = data.records || [];
        allRecords.push(...records);
        totalRecordsCount = data.total || 0;
        
        offset += limit;
        // Break if we've fetched all or no more records are returned
        if (records.length === 0 || allRecords.length >= totalRecordsCount) {
          break;
        }
      } while (allRecords.length < totalRecordsCount);

      // Cache records if we successfully fetched them
      if (allRecords.length > 0) {
        apiCache.set(cacheKey, {
          data: allRecords,
          timestamp: Date.now()
        });
      }
    }

    // 3. Get all vegetable categories & subcategories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id')
      .or(`id.eq.e3516d99-71e7-4e89-b3b5-75b1d2704101,parent_id.eq.e3516d99-71e7-4e89-b3b5-75b1d2704101`);

    if (catError) {
      throw new Error(`Failed to load categories: ${catError.message}`);
    }
    const vegetableCategoryIds = categories.map(c => c.id);

    // 4. Fetch all vegetable products
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, slug, name, unit, price, mrp, base_price, base_mrp')
      .in('category_id', vegetableCategoryIds);

    if (prodError) {
      throw new Error(`Failed to load products: ${prodError.message}`);
    }

    const updatesLog: any[] = [];
    const updatesPayload: any[] = [];

    // 5. Process products and match prices
    for (const product of products) {
      productsProcessed++;
      const mapping = mappings[product.slug];
      if (!mapping || !mapping.commodity) {
        productsSkipped++;
        continue;
      }

      const targetCommodity = mapping.commodity.trim().toLowerCase();
      const targetVariety = mapping.variety ? mapping.variety.trim().toLowerCase() : '';

      // Filter state records by commodity name
      const commodityRecords = allRecords.filter(
        r => r.commodity && r.commodity.trim().toLowerCase() === targetCommodity
      );

      if (commodityRecords.length === 0) {
        productsSkipped++;
        errors.push(`No commodity records found in API for commodity "${mapping.commodity}" (product slug: ${product.slug})`);
        continue;
      }

      // Apply Fallback Matching Strategy
      const matchedRecord = findMatchingRecord(commodityRecords, targetVariety, market, district);
      if (!matchedRecord) {
        productsSkipped++;
        errors.push(`No fallback match found for commodity "${mapping.commodity}" / variety "${mapping.variety || ''}" (product slug: ${product.slug})`);
        continue;
      }

      // Base price conversion from quintal (100 kg)
      const baseCostPrice = matchedRecord.modal_price / 100;
      const rawMaxPrice = matchedRecord.max_price / 100;
      const baseMrpPrice = rawMaxPrice > 0 ? rawMaxPrice : 1.25 * baseCostPrice;

      // Apply Markups
      const ozoCostPerKg = baseCostPrice * (1 + markupPercent / 100);
      const ozoMrpPerKg = baseMrpPrice * (1 + mrpMarkupPercent / 100);

      // Determine weight factor (Custom override or parse from unit string)
      let weightFactor = 1.0;
      if (mapping.weight_override !== undefined && mapping.weight_override > 0) {
        weightFactor = mapping.weight_override;
      } else {
        weightFactor = parseUnitToKg(product.unit);
      }

      // Final Price Calculations (rounded to whole Rupees)
      let finalPrice = Math.round(ozoCostPerKg * weightFactor);
      let finalMrp = Math.round(ozoMrpPerKg * weightFactor);

      // Safety checks: ensure price >= ₹1, and MRP >= price
      finalPrice = Math.max(1, finalPrice);
      finalMrp = Math.max(finalPrice, finalMrp);

      // Add to updates list
      productsUpdated++;
      updatesLog.push({
        id: product.id,
        name: product.name,
        slug: product.slug,
        unit: product.unit,
        weight_factor: weightFactor,
        original_price: product.price,
        original_mrp: product.mrp,
        new_price: finalPrice,
        new_mrp: finalMrp,
        base_price: Number(baseCostPrice.toFixed(2)),
        base_mrp: Number(baseMrpPrice.toFixed(2)),
        matched_mandi: {
          market: matchedRecord.market,
          district: matchedRecord.district,
          variety: matchedRecord.variety,
          modal_price: matchedRecord.modal_price,
          max_price: matchedRecord.max_price
        }
      });

      if (!isDryRun) {
        updatesPayload.push({
          id: product.id,
          price: finalPrice,
          mrp: finalMrp,
          base_price: Number(baseCostPrice.toFixed(2)),
          base_mrp: Number(baseMrpPrice.toFixed(2)),
          last_price_updated: new Date().toISOString()
        });
      }
    }

    // 6. Execute updates in a single bulk RPC call (if not dry run)
    if (!isDryRun && updatesPayload.length > 0) {
      const { error: bulkError } = await supabase.rpc('bulk_update_product_prices', {
        p_updates: updatesPayload
      });
      if (bulkError) {
        errors.push(bulkError.message);
      }
    }

    const executionTimeMs = Date.now() - startTime;
    const finalStatus = errors.length === 0 ? 'success' : (productsUpdated > 0 ? 'partial' : 'failed');

    // 7. Save sync status run details to config in public.app_settings (if not dry run)
    if (!isDryRun) {
      const updatedConfig: SyncConfig = {
        ...config,
        last_run: {
          timestamp: new Date().toISOString(),
          status: finalStatus,
          products_processed: productsProcessed,
          products_updated: productsUpdated,
          products_skipped: productsSkipped,
          api_calls_made: apiCallsMade,
          execution_time_ms: executionTimeMs,
          errors: errors.slice(0, 15) // Keep last 15 errors to avoid row size limit
        }
      };

      await supabase
        .from('app_settings')
        .update({ value: updatedConfig })
        .eq('key', 'mandi_sync_config');
    }

    return res.status(200).json({
      success: true,
      dry_run: isDryRun,
      status: finalStatus,
      execution_time_ms: executionTimeMs,
      summary: {
        processed: productsProcessed,
        updated: productsUpdated,
        skipped: productsSkipped,
        api_calls: apiCallsMade
      },
      updated_products: updatesLog,
      errors
    });

  } catch (error: any) {
    const executionTimeMs = Date.now() - startTime;
    console.error('Mandi Synchronization Error:', error);
    
    // Save failed run status if database access is available
    if (!isDryRun) {
      try {
        const { data: configRow } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'mandi_sync_config')
          .single();

        if (configRow) {
          const config = configRow.value as SyncConfig;
          const updatedConfig: SyncConfig = {
            ...config,
            last_run: {
              timestamp: new Date().toISOString(),
              status: 'failed',
              products_processed: productsProcessed,
              products_updated: productsUpdated,
              products_skipped: productsSkipped,
              api_calls_made: apiCallsMade,
              execution_time_ms: executionTimeMs,
              errors: [error.message || 'Fatal execution error']
            }
          };

          await supabase
            .from('app_settings')
            .update({ value: updatedConfig })
            .eq('key', 'mandi_sync_config');
        }
      } catch (logErr) {
        console.error('Failed to log sync crash status:', logErr);
      }
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Fatal sync error',
      execution_time_ms: executionTimeMs,
      summary: {
        processed: productsProcessed,
        updated: productsUpdated,
        skipped: productsSkipped,
        api_calls: apiCallsMade
      },
      errors: [error.message || 'Fatal execution error']
    });
  }
}

/**
 * Applies the fallback matching strategy to locate the correct commodity record.
 */
function findMatchingRecord(records: any[], targetVariety: string, localMarket: string, localDistrict: string): any | null {
  const marketLower = localMarket.toLowerCase();
  const districtLower = localDistrict.toLowerCase();
  const varietyLower = targetVariety.toLowerCase();

  // 1. Try matching Local Market + Variety (if variety specified)
  if (varietyLower) {
    const match = records.find(r => 
      r.market && r.market.toLowerCase() === marketLower &&
      r.district && r.district.toLowerCase() === districtLower &&
      r.variety && r.variety.toLowerCase() === varietyLower
    );
    if (match) return match;
  }

  // 2. Try matching Local Market (any variety)
  const matchMarketAny = records.find(r => 
    r.market && r.market.toLowerCase() === marketLower &&
    r.district && r.district.toLowerCase() === districtLower
  );
  if (matchMarketAny) return matchMarketAny;

  // 3. Try matching District + Variety (if variety specified)
  if (varietyLower) {
    const match = records.find(r => 
      r.district && r.district.toLowerCase() === districtLower &&
      r.variety && r.variety.toLowerCase() === varietyLower
    );
    if (match) return match;
  }

  // 4. Try matching District (any variety)
  const matchDistrictAny = records.find(r => 
    r.district && r.district.toLowerCase() === districtLower
  );
  if (matchDistrictAny) return matchDistrictAny;

  // 5. Try matching State + Variety (if variety specified)
  if (varietyLower) {
    const match = records.find(r => r.variety && r.variety.toLowerCase() === varietyLower);
    if (match) return match;
  }

  // 6. Fallback: return the first available record of this commodity in the state
  if (records.length > 0) {
    return records[0];
  }

  return null;
}

/**
 * Parses a product unit string into equivalent weight factors in kg.
 */
function parseUnitToKg(unitStr: string): number {
  if (!unitStr) return 1.0;
  const clean = unitStr.trim().toLowerCase();

  // 1. Check for multiplier syntax: e.g. "2 x 250 g" or "2x250g"
  const multiplierMatch = clean.match(/^(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(g|gm|gram|grams|kg|kilo|kilogram|kilograms)/);
  if (multiplierMatch) {
    const qty = parseInt(multiplierMatch[1], 10);
    const value = parseFloat(multiplierMatch[2]);
    const unit = multiplierMatch[3];
    if (unit.startsWith('k')) {
      return qty * value;
    } else {
      return (qty * value) / 1000;
    }
  }

  // 2. Check for ranges inside parens: e.g. "1 pc (approx. 500-800g)"
  const rangeMatch = clean.match(/\((\s*approx\.?\s*)?(\d+)\s*-\s*(\d+)\s*(g|gm|gram|grams|kg|kilo|kilogram|kilograms)\)/);
  if (rangeMatch) {
    const minVal = parseFloat(rangeMatch[2]);
    const maxVal = parseFloat(rangeMatch[3]);
    const unit = rangeMatch[4];
    const avg = (minVal + maxVal) / 2;
    if (unit.startsWith('k')) {
      return avg;
    } else {
      return avg / 1000;
    }
  }

  // 3. Check for standard pattern: e.g. "250 g", "1.5 kg"
  const standardMatch = clean.match(/^(\d+(?:\.\d+)?)\s*(g|gm|gram|grams|kg|kilo|kilogram|kilograms)/);
  if (standardMatch) {
    const value = parseFloat(standardMatch[1]);
    const unit = standardMatch[2];
    if (unit.startsWith('k')) {
      return value;
    } else {
      return value / 1000;
    }
  }

  // 4. Check for piece/packet fallback: e.g. "1 pc", "1 piece", "1 pkt"
  if (clean.includes('pc') || clean.includes('piece') || clean.includes('pkt') || clean.includes('packet')) {
    return 0.5; // Fallback to 0.5 kg
  }

  // 5. Default fallback
  return 1.0;
}
