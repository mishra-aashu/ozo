import { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, setRateLimitHeaders } from './_ratelimit.js';
import fs from 'fs';
import path from 'path';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(s => s.trim().replace(/^"(.*)"$/, '$1').replace(/""/g, '"'));
}

function lookupLocalBarcode(barcode: string): { name: string; brand: string } | null {
  try {
    const csvPath = path.join(process.cwd(), 'barcode file.csv');
    if (!fs.existsSync(csvPath)) {
      console.warn(`[Search-Image] Local barcode CSV not found at ${csvPath}`);
      return null;
    }
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(',');
      if (cols.length > 0) {
        const rowBarcode = cols[0].trim();
        if (rowBarcode === barcode) {
          const parsedRow = parseCSVLine(line);
          if (parsedRow.length > 5) {
            const name = parsedRow[4]?.trim() || '';
            const brand = parsedRow[5]?.trim() || '';
            if (name || brand) {
              return { name, brand };
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[Search-Image] Local barcode CSV lookup failed:', err);
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS setup
  const origin = req.headers.origin || '';
  const allowedOrigins = ["https://www.ozomart.store", "https://ozomart.store"];
  const isAllowed = allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : 'https://www.ozomart.store');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate Limiting (e.g., 40 requests per minute)
  const rateLimitResult = await checkRateLimit(req, 40, 60);
  setRateLimitHeaders(res, rateLimitResult);
  if (!rateLimitResult.success) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded. Please try again in a minute.' 
    });
  }

  const query = req.query.q ? String(req.query.q).trim() : '';
  const barcode = req.query.barcode ? String(req.query.barcode).trim() : '';
  if (!query && !barcode) {
    return res.status(400).json({ error: 'Query parameter "q" or "barcode" is required' });
  }

  try {
    const results = await searchImages(query, barcode);
    return res.status(200).json({ results });
  } catch (error: any) {
    console.error('[Search-Image] Search failed:', error);
    return res.status(500).json({ error: error.message || 'Failed to search images' });
  }
}

interface ImageSearchResult {
  url: string;
  thumbnail: string;
  title: string;
  source: string;
}

async function searchImages(query: string, barcode?: string): Promise<ImageSearchResult[]> {
  const results: ImageSearchResult[] = [];
  const cleanBarcode = barcode ? barcode.trim() : '';
  const cleanQuery = query ? query.trim() : '';

  // Determine if either the barcode or the query looks like a barcode
  const targetBarcode = /^\d{5,14}$/.test(cleanBarcode) 
    ? cleanBarcode 
    : (/^\d{5,14}$/.test(cleanQuery) ? cleanQuery : '');

  if (targetBarcode) {
    console.log(`[Search-Image] Barcode detected: ${targetBarcode}. Executing barcode-first searches.`);
    
    let barcodeNameQuery = '';
    let offBarcodeResults: ImageSearchResult[] = [];

    // 1. First, check local CSV database for the barcode
    const localMatch = lookupLocalBarcode(targetBarcode);
    if (localMatch) {
      const { name, brand } = localMatch;
      barcodeNameQuery = brand ? `${brand} ${name}` : name;
      console.log(`[Search-Image] Resolved barcode ${targetBarcode} from local CSV to: "${barcodeNameQuery}"`);
    } else {
      // 2. Fallback: Resolve product name from Open Food Facts using the barcode
      try {
        const offUrl = `https://world.openfoodfacts.org/api/v0/product/${targetBarcode}.json`;
        const response = await fetch(offUrl, {
          headers: { 'User-Agent': 'OzoMartImageTool/1.0 (mishra.aashu@gmail.com)' },
          signal: AbortSignal.timeout(4000)
        });
        if (response.ok) {
          const data = await response.json() as any;
          if (data.status === 1 && data.product) {
            const prod = data.product;
            const imgUrl = prod.image_url || prod.image_front_url || prod.image_small_url;
            const brandName = prod.brands ? prod.brands.split(',')[0].trim() : '';
            const prodName = prod.product_name || prod.product_name_en || '';
            
            if (brandName || prodName) {
              barcodeNameQuery = `${brandName} ${prodName}`.trim();
              console.log(`[Search-Image] Resolved barcode ${targetBarcode} from Open Food Facts to name query: "${barcodeNameQuery}"`);
            }
            
            if (imgUrl) {
              offBarcodeResults.push({
                url: imgUrl,
                thumbnail: prod.image_small_url || imgUrl,
                title: `${brandName ? `[${brandName}] ` : ''}${prodName}`.trim() || `Barcode Product (${targetBarcode})`,
                source: 'OzoMart'
              });
            }
          }
        }
      } catch (err) {
        console.error('[Search-Image] Open Food Facts barcode lookup failed:', err);
      }
    }

    // 3. Query BigBasket with the barcode directly (some barcodes are indexed directly by BigBasket)
    let bbBarcodeResults: ImageSearchResult[] = [];
    try {
      bbBarcodeResults = await searchBigBasketImages(targetBarcode);
      if (bbBarcodeResults.length > 0) {
        console.log(`[Search-Image] Found ${bbBarcodeResults.length} barcode results directly on BigBasket.`);
      }
    } catch (err) {
      console.error('[Search-Image] BigBasket direct barcode search failed:', err);
    }

    // 4. Query BigBasket using the resolved name (from local CSV or Open Food Facts)
    let bbResolvedNameResults: ImageSearchResult[] = [];
    if (barcodeNameQuery) {
      try {
        console.log(`[Search-Image] Searching BigBasket with resolved barcode name: "${barcodeNameQuery}"`);
        bbResolvedNameResults = await searchBigBasketImages(barcodeNameQuery);
        if (bbResolvedNameResults.length > 0) {
          console.log(`[Search-Image] Found ${bbResolvedNameResults.length} results on BigBasket using resolved barcode name.`);
        }
      } catch (err) {
        console.error('[Search-Image] BigBasket search by resolved barcode name failed:', err);
      }
    }

    // Combine barcode results: Prioritize BigBasket results over Open Food Facts
    const barcodeCombined = [...bbBarcodeResults, ...bbResolvedNameResults, ...offBarcodeResults];

    if (barcodeCombined.length > 0) {
      // Deduplicate results by URL
      const uniqueResults: ImageSearchResult[] = [];
      const seenUrls = new Set<string>();
      for (const r of barcodeCombined) {
        if (!seenUrls.has(r.url)) {
          seenUrls.add(r.url);
          uniqueResults.push(r);
        }
      }

      // If we also have a custom user search query that differs from the barcode and resolved name, run name search for additional choices
      const resolvedQueryLower = barcodeNameQuery.toLowerCase();
      if (cleanQuery && cleanQuery !== targetBarcode && cleanQuery.toLowerCase() !== resolvedQueryLower) {
        const nameResults = await searchImagesByName(cleanQuery);
        for (const nr of nameResults) {
          if (!seenUrls.has(nr.url)) {
            seenUrls.add(nr.url);
            uniqueResults.push(nr);
          }
        }
      }
      return uniqueResults;
    }
  }

  // Fallback to name search if no barcode results were found
  if (cleanQuery && cleanQuery !== targetBarcode) {
    return searchImagesByName(cleanQuery);
  }

  return [];
}

async function searchImagesByName(query: string): Promise<ImageSearchResult[]> {
  // 1. Primary: BigBasket Catalog Search (High resolution, clean grocery pack images)
  try {
    console.log(`[Search-Image] Searching BigBasket catalog for: ${query}`);
    const results = await searchBigBasketImages(query);
    if (results.length > 0) {
      return results;
    }
  } catch (err) {
    console.error('[Search-Image] BigBasket search failed:', err);
  }

  // 2. Fallback: OpenSERP (Google/Bing/DuckDuckGo combined API)
  const openSerpUrl = process.env.OPENSERP_URL || "http://localhost:7000";
  try {
    console.log(`[Search-Image] BigBasket empty. Querying OpenSERP at ${openSerpUrl} for query: ${query}`);
    const url = `${openSerpUrl}/mega/image?text=${encodeURIComponent(query)}&engines=google,bing,duck&limit=24`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(6000)
    });
    if (response.ok) {
      const data = await response.json();
      if (data.results && Array.isArray(data.results) && data.results.length > 0) {
        return data.results.map((item: any) => {
          const imgData = item.image || {};
          return {
            url: imgData.url || item.image || '',
            thumbnail: imgData.thumbnail || item.thumbnail || imgData.url || '',
            title: item.title || '',
            source: 'OzoMart'
          };
        });
      }
    } else {
      console.warn(`[Search-Image] OpenSERP returned status ${response.status}`);
    }
  } catch (err) {
    console.error('[Search-Image] OpenSERP request failed:', err);
  }

  // 3. Fallback: Open Food Facts Search
  try {
    console.log(`[Search-Image] OpenSERP failed. Trying Open Food Facts fallback for: ${query}`);
    const results = await searchOpenFoodFactsImages(query);
    if (results.length > 0) {
      return results;
    }
  } catch (err) {
    console.error('[Search-Image] Open Food Facts fallback failed:', err);
  }

  return [];
}

async function searchBigBasketImages(query: string): Promise<ImageSearchResult[]> {
  const fallbackCookie = '_bb_cid=1; _bb_sa_ids=19224; _bb_cda_sa_info=djIuY2RhX3NhLjEwLjE5MjI0; is_integrated_sa=1; _bb_aid="MjkxMzA4NDUzMA=="; _bb_nhid=7427; _bb_hid=7427; _bb_dsid=7427; _bb_dsevid=7427; is_global=1; bb2_enabled=true; ufi=1; _bb_vid=MTMwMDkyNDE2MjYxOTM5MjQ5NA==; bigbasket.com=b623f16c-2c81-4d29-94a2-29f8cdbd834f; isintegratedsa=true; PWA=1';
  const headers = {
    'accept': '*/*',
    'accept-language': 'en-GB,en;q=0.9,hi-IN;q=0.8,hi;q=0.7,en-US;q=0.6',
    'common-client-static-version': '101',
    'content-type': 'application/json',
    'dnt': '1',
    'osmos-enabled': 'true',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'user-agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36',
    'x-caller': 'bigbasket-pwa',
    'x-channel': 'BB-PWA',
    'x-entry-context': 'bbnow',
    'x-entry-context-id': '10',
    'x-requested-with': 'XMLHttpRequest',
    'cookie': process.env.CATALOG_COOKIE || fallbackCookie
  };

  const url = `https://www.bigbasket.com/listing-svc/v2/products?type=ps&slug=${encodeURIComponent(query)}&page=1&bucket_id=36`;
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
    if (!response.ok) {
      console.warn(`[Search-Image] BigBasket API returned status ${response.status}`);
      return [];
    }
    const data = await response.json() as any;
    const tabs = data.tabs || [];
    if (tabs.length === 0) return [];
    
    const products = tabs[0]?.product_info?.products || [];
    const results: ImageSearchResult[] = [];
    for (const prod of products) {
      const images = prod.images || [];
      const imageUrl = images[0] ? (images[0].xxl || images[0].xl || images[0].l || images[0].m || images[0].s) : null;
      if (imageUrl) {
        const brandName = prod.brand?.name ? `[${prod.brand.name}] ` : '';
        const packSize = prod.w ? ` (${prod.w})` : '';
        results.push({
          url: imageUrl,
          thumbnail: imageUrl,
          title: `${brandName}${prod.desc || query}${packSize}`,
          source: 'OzoMart'
        });
      }
    }
    return results;
  } catch (err) {
    console.error('[Search-Image] BigBasket API query failed:', err);
  }
  return [];
}

async function getOpenFoodFactsProductByBarcode(barcode: string): Promise<ImageSearchResult[]> {
  try {
    const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'OzoMartImageTool/1.0 (mishra.aashu@gmail.com)' },
      signal: AbortSignal.timeout(4000)
    });
    if (response.ok) {
      const data = await response.json() as any;
      if (data.status === 1 && data.product) {
        const prod = data.product;
        const imgUrl = prod.image_url || prod.image_front_url || prod.image_small_url;
        if (imgUrl) {
          const brandName = prod.brands ? `[${prod.brands}] ` : '';
          const prodName = prod.product_name || prod.product_name_en || '';
          return [{
            url: imgUrl,
            thumbnail: prod.image_small_url || imgUrl,
            title: `${brandName}${prodName}`.trim() || `Barcode Product (${barcode})`,
            source: 'OzoMart'
          }];
        }
      }
    }
  } catch (err) {
    console.error('[Search-Image] Open Food Facts barcode query failed:', err);
  }
  return [];
}

async function searchOpenFoodFactsImages(query: string): Promise<ImageSearchResult[]> {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'OzoMartImageTool/1.0 (mishra.aashu@gmail.com)' },
      signal: AbortSignal.timeout(4000)
    });
    if (response.ok) {
      const data = await response.json() as any;
      if (data.products && Array.isArray(data.products)) {
        const results: ImageSearchResult[] = [];
        for (const prod of data.products) {
          const imgUrl = prod.image_url || prod.image_front_url || prod.image_small_url;
          if (imgUrl) {
            results.push({
              url: imgUrl,
              thumbnail: prod.image_small_url || imgUrl,
              title: prod.product_name || query,
              source: 'OzoMart'
            });
          }
        }
        return results;
      }
    }
  } catch (err) {
    console.error('[Search-Image] Open Food Facts query failed:', err);
  }
  return [];
}