import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_DIRECT_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

export interface ActiveCity {
  slug: string;
  name: string;
  state: string;
  latitude?: number;
  longitude?: number;
  service_radius_km?: number;
}

let cachedCities: ActiveCity[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 300000; // 5 minutes in-memory caching

export async function getActiveCities(): Promise<ActiveCity[]> {
  const now = Date.now();
  if (cachedCities && (now - cacheTimestamp < CACHE_TTL)) {
    return cachedCities;
  }

  try {
    const { data, error } = await supabase
      .from('operating_cities')
      .select('slug, name, state, latitude, longitude, service_radius_km')
      .eq('is_active', true);

    if (error) throw error;
    if (data && data.length > 0) {
      cachedCities = data as ActiveCity[];
      cacheTimestamp = now;
      return cachedCities;
    }
  } catch (err) {
    console.error('[SEO] Error fetching operational cities from DB:', err);
  }

  return [];
}
