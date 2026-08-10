import React from 'react';
import { useLocationStore } from '../stores/locationStore';
import { MapPin, AlertTriangle, X, Compass } from 'lucide-react';

export default function BrowsingBanner() {
  const { 
    browsingCitySlug, 
    deliveryCitySlug, 
    activeCities, 
    invalidCitySlugNotice,
    clearInvalidCitySlugNotice,
    hasLocationDrift,
    driftDistanceKm,
    coordinates,
    address,
    selectedCitySlug
  } = useLocationStore();

  const browsingCity = activeCities?.find(c => c.slug === browsingCitySlug);
  const deliveryCity = activeCities?.find(c => c.slug === deliveryCitySlug);

  // We calculate if the selected delivery location is serviceable using coordinates or selectedCitySlug
  const isLocationServiceable = React.useMemo(() => {
    if (!address) return true;

    if (coordinates && coordinates.lat && coordinates.lng) {
      const lat = parseFloat(coordinates.lat);
      const lng = parseFloat(coordinates.lng);
      
      if (Math.abs(lat) < 0.01 && Math.abs(lng) < 0.01) return false;
      if (!activeCities || activeCities.length === 0) return true;

      for (const city of activeCities) {
        if (!city.latitude || !city.longitude) continue;
        const cLat = parseFloat(city.latitude);
        const cLng = parseFloat(city.longitude);
        const maxRadius = Math.max(parseFloat(city.service_radius_km) || 25.0, 25.0);
        const R = 6371;
        const dLat = (cLat - lat) * Math.PI / 180;
        const dLon = (cLng - lng) * Math.PI / 180;
        const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat*Math.PI/180)*Math.cos(cLat*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        if (dist <= maxRadius) return true;
      }
      return false;
    }

    if (selectedCitySlug) {
      const matched = (activeCities || []).find(c => c.slug === selectedCitySlug);
      if (matched) return true;
    }

    return true;
  }, [address, coordinates, selectedCitySlug, activeCities]);

  const showUnserviceableWarning = !isLocationServiceable && address;
  const showBrowsingNotice = browsingCitySlug && deliveryCitySlug && browsingCitySlug !== deliveryCitySlug;

  if (!showUnserviceableWarning && !invalidCitySlugNotice && !showBrowsingNotice && !hasLocationDrift) {
    return null;
  }

  if (showUnserviceableWarning) {
    return (
      <div className="w-full bg-red-50 border-b border-red-200 text-red-900 text-xs md:text-sm px-4 py-2.5 flex items-center justify-between shadow-xs transition-all z-[100] relative">
        <div className="flex items-center gap-2 flex-1">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 animate-pulse" />
          <span>
            Browsing <strong className="font-semibold">{browsingCity?.name || browsingCitySlug || 'Aurangabad'}</strong> store — Delivery to <span className="font-semibold text-red-700">{address}</span> is unavailable.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 text-amber-900 text-xs md:text-sm px-4 py-2 flex items-center justify-between shadow-xs transition-all z-[100] relative">
      <div className="flex items-center gap-2 flex-1">
        {invalidCitySlugNotice ? (
          <>
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{invalidCitySlugNotice}</span>
          </>
        ) : showBrowsingNotice ? (
          <>
            <Compass className="w-4 h-4 text-emerald-600 shrink-0 animate-pulse" />
            <span>
              Browsing catalog for <strong className="font-semibold">{browsingCity?.name || browsingCitySlug}</strong>. Delivery address set to <strong className="font-semibold">{deliveryCity?.name || deliveryCitySlug}</strong>. (Serviceability verified at checkout)
            </span>
          </>
        ) : hasLocationDrift ? (
          <>
            <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Your current GPS location appears to be ~{driftDistanceKm} km away from your saved delivery address.
            </span>
          </>
        ) : null}
      </div>

      {invalidCitySlugNotice && (
        <button 
          onClick={clearInvalidCitySlugNotice} 
          className="p-1 hover:bg-amber-100 rounded-full text-amber-700 transition"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
