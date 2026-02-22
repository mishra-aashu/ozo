import { supabase } from './supabase'
// Circular import: locationStore imports this file (reverseGeocode) at the top
// level. ESM live bindings make this safe — useLocationStore will be undefined
// during module evaluation but fully initialised by the time reverseGeocode()
// is called at runtime. We ONLY read it inside function bodies, never at the
// top level, so the circular reference resolves cleanly.
import { useLocationStore } from '../stores/locationStore'

const LOCATIONIQ_KEY = import.meta.env.VITE_LOCATIONIQ_KEY || '';

// Helper: Calculate distance between two coordinates in km (Haversine formula)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const d = R * c // Distance in km
  return d
}

let cachedStreets = null;
export const getServiceableStreets = async () => {
  if (cachedStreets) return cachedStreets;
  try {
    const { data, error } = await supabase
      .from('serviceable_streets')
      .select('*')
      .eq('is_active', true)
    if (!error && data) {
      cachedStreets = data;
    }
  } catch (e) {
    console.error('Failed to load serviceable streets for geocoding', e);
  }
  return cachedStreets || [];
};

export const findNearestStreet = (lat, lng, streetsList) => {
  if (!streetsList || streetsList.length === 0) return null
  let minDistance = Infinity
  let nearest = null
  for (const st of streetsList) {
    if (st.latitude && st.longitude) {
      const dist = getDistance(lat, lng, parseFloat(st.latitude), parseFloat(st.longitude))
      if (dist < minDistance) {
        minDistance = dist
        nearest = st
      }
    }
  }
  // Threshold: within 2.5 km is acceptable for matching a neighborhood/street in Aurangabad
  if (minDistance <= 2.5) {
    return nearest
  }
  return null
}

export const reverseGeocode = async (lat, lng, providedStreets = null) => {
  let displayName = '';
  let addressDetails = {};
  let success = false;

  // 1. Try serverless geocoding proxy first (skip in dev mode to avoid dev server lookup of node api files)
  const isDev = import.meta.env.DEV;
  if (!isDev) {
    try {
      const res = await fetch(`/api/geocode?type=reverse&lat=${lat}&lon=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          addressDetails = data.address;
          displayName = data.display_name || '';
          success = true;
        }
      }
    } catch (e) {
      console.warn('Geocoding proxy failed, falling back to direct requests:', e);
    }
  }

  // 2. Fallback to direct LocationIQ if proxy failed
  if (!success && LOCATIONIQ_KEY && LOCATIONIQ_KEY !== 'YOUR_FREE_KEY_HERE' && !LOCATIONIQ_KEY.includes('YOUR_')) {
    try {
      const res = await fetch(
        `https://us1.locationiq.com/v1/reverse.php?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lng}&format=json&accept-language=en`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          addressDetails = data.address;
          displayName = data.display_name || '';
          success = true;
        }
      }
    } catch (e) {
      console.warn('Direct LocationIQ geocoding failed, falling back to Nominatim:', e);
    }
  }

  // 3. Fallback to direct Nominatim if everything else failed
  if (!success) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (data) {
          addressDetails = data.address || {};
          displayName = data.display_name || '';
          success = true;
        }
      }
    } catch (e) {
      console.error('Direct Nominatim geocoding failed:', e);
    }
  }

  // 3. Find nearest street from local database for fallback matching and enrichment
  const streets = providedStreets || await getServiceableStreets();
  const nearest = findNearestStreet(lat, lng, streets);
  
  if (nearest) {
    const verifiedStreet = nearest.name_hi 
      ? `${nearest.name} (${nearest.name_hi})` 
      : nearest.name;
      
    const currentRoad = addressDetails.road || addressDetails.pedestrian || addressDetails.street || '';
    
    const isRoadEmpty = !currentRoad;
    const isSameRoad = currentRoad && (
      currentRoad.toLowerCase().includes(nearest.name.toLowerCase()) || 
      nearest.name.toLowerCase().includes(currentRoad.toLowerCase())
    );

    // Filter out Urdu/Arabic script characters (range \u0600-\u06FF)
    const hasUrdu = /[\u0600-\u06FF]/.test(currentRoad);

    if (isRoadEmpty || isSameRoad || hasUrdu) {
      addressDetails.road = verifiedStreet;
    } else {
      // Geocoded road is different/specific (and not Urdu), prepend it
      addressDetails.road = `${currentRoad}, ${verifiedStreet}`;
    }
    
    let nearestCityName = 'Unknown';
    let nearestState = 'Unknown';
    let nearestPostcode = '';
    try {
      const nearestCity = useLocationStore.getState().nearestCity;
      if (nearestCity) {
        nearestCityName = nearestCity.name || nearestCityName;
        nearestState = nearestCity.state || nearestState;
        nearestPostcode = nearestCity.slug?.includes('aurangabad') ? '824101' : '';
      }
    } catch (e) {
      console.error('Failed to get nearestCity from store in geocoding:', e);
    }

    addressDetails.suburb = addressDetails.suburb || nearest.type || '';
    addressDetails.city = addressDetails.city || nearestCityName;
    addressDetails.state = addressDetails.state || nearestState;
    addressDetails.postcode = addressDetails.postcode || nearestPostcode;
  } else {
    // No nearest street matched, clean up geocoded road/pedestrian if needed
    const currentRoad = addressDetails.road || addressDetails.pedestrian || addressDetails.street || '';
    if (currentRoad) {
      addressDetails.road = currentRoad;
    }
  }

  // Clean up and construct displayName
  const road = addressDetails.road || '';
  const suburb = addressDetails.suburb || addressDetails.neighbourhood || addressDetails.village || '';
  
  let nearestCityNameFallback = 'Unknown';
  let nearestStateFallback = 'Unknown';
  try {
    const nearestCity = useLocationStore.getState().nearestCity;
    if (nearestCity) {
      nearestCityNameFallback = nearestCity.name || nearestCityNameFallback;
      nearestStateFallback = nearestCity.state || nearestStateFallback;
    }
  } catch (e) {
    // Non-fatal — fall back to defaults
  }
  
  const city = addressDetails.city || addressDetails.town || nearestCityNameFallback;
  const state = addressDetails.state || nearestStateFallback;
  
  const parts = [road, suburb, city, state];
  
  // Deduplicate consecutive/similar terms and filter out Urdu characters
  const seen = new Set();
  const cleanParts = [];
  for (const part of parts) {
    if (!part) continue;
    if (/[\u0600-\u06FF]/.test(part)) continue; // Filter out Urdu/Arabic text
    const normalized = part.toLowerCase().trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      cleanParts.push(part.trim());
    }
  }

  displayName = cleanParts.join(', ');

  // Fallback if we still don't have a display name
  if (!displayName) {
    displayName = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
  }

  // Postcode & City self-healing correction logic:
  // If the coordinates (lat, lng) are physically within the service_radius_km of an active city,
  // we check if the postcode returned by Nominatim/LocationIQ is in the city's allowed_pincodes.
  // If it's not (or if it is missing), we automatically override it with the city's primary allowed postcode.
  try {
    const locationState = useLocationStore.getState();
    const activeCities = locationState.activeCities || [];
    const R = 6371; // Earth's radius in KM
    
    let matchedCity = null;
    for (const c of activeCities) {
      if (!c.latitude || !c.longitude) continue;
      const cLat = parseFloat(c.latitude);
      const cLng = parseFloat(c.longitude);
      const maxRadius = parseFloat(c.service_radius_km) || 15.0;

      const dLat = (lat - cLat) * Math.PI / 180;
      const dLon = (lng - cLng) * Math.PI / 180;
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(cLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const distCalc = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      if (distCalc <= maxRadius) {
        matchedCity = c;
        break; // Match the first city that physically covers the coordinates
      }
    }

    if (matchedCity) {
      // Force correct the city name and state to match our operating city configuration
      const baseCityName = matchedCity.name.split(',')[0].trim();
      addressDetails.city = baseCityName;
      
      const allowedPincodes = matchedCity.allowed_pincodes || [];
      const currentPincode = (addressDetails.postcode || '').toString().trim();
      
      if (allowedPincodes.length > 0 && !allowedPincodes.includes(currentPincode)) {
        addressDetails.postcode = allowedPincodes[0];
      }
    }
  } catch (e) {
    console.error('Error auto-correcting postcode:', e);
  }

  return {
    displayName,
    addressDetails,
    nearestStreet: nearest
  };
};

/**
 * Parses coordinates (latitude, longitude) from raw Google Maps or other maps links
 * @param {string} url 
 * @returns {{lat: number, lng: number} | null}
 */
export const extractCoordinatesFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;

  // Pattern 0: Google Maps exact place coordinates (!3d<lat>!4d<lng>)
  const gmapsPlaceMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (gmapsPlaceMatch) {
    return { lat: parseFloat(gmapsPlaceMatch[1]), lng: parseFloat(gmapsPlaceMatch[2]) };
  }

  // Pattern 1: @lat,lng (e.g. @24.7511,84.3745)
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }

  // Pattern 2: q=lat,lng or query=lat,lng or ll=lat,lng
  const queryMatch = url.match(/[?&](query|q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (queryMatch) {
    return { lat: parseFloat(queryMatch[2]), lng: parseFloat(queryMatch[3]) };
  }

  // Pattern 3: /place/lat,lng or /search/lat,lng
  const placeMatch = url.match(/\/(place|search)\/(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (placeMatch) {
    return { lat: parseFloat(placeMatch[2]), lng: parseFloat(placeMatch[3]) };
  }

  // Pattern 4: Any two decimal numbers separated by comma in the URL
  const genericMatch = url.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (genericMatch) {
    const lat = parseFloat(genericMatch[1]);
    const lng = parseFloat(genericMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return null;
};

