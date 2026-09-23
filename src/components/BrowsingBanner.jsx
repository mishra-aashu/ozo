import React, { useState } from 'react';
import { useLocationStore } from '../stores/locationStore';
import { useNavigate } from 'react-router-dom';
import { Compass, X, Store } from 'lucide-react';

export default function BrowsingBanner() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

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

  const browsingCity = activeCities?.find(c => c.slug === browsingCitySlug) || activeCities?.[0];
  const deliveryCity = activeCities?.find(c => c.slug === deliveryCitySlug);

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

  if (dismissed || (!showUnserviceableWarning && !invalidCitySlugNotice && !showBrowsingNotice && !hasLocationDrift)) {
    return null;
  }

  const shortAddress = address ? address.split(',')[0] : '';
  const storeName = browsingCity?.name ? browsingCity.name.split(',')[0] : 'Aurangabad';

  if (showUnserviceableWarning) {
    return (
      <div className="w-full bg-slate-900 text-white text-xs px-3 py-1.5 sm:px-3.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-2 shadow-xs transition-all z-[100] relative border-b border-white/10">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Store className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] sm:text-xs font-medium truncate">
            Browsing <strong className="text-amber-400 font-extrabold">{storeName}</strong> catalog
            <span className="opacity-80 hidden md:inline ml-1">(Delivery to {shortAddress} outside zone)</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => navigate('/select-location')}
            className="text-[10px] font-bold uppercase tracking-wide bg-white/15 hover:bg-white/25 text-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md transition whitespace-nowrap"
          >
            <span className="sm:hidden">Change</span>
            <span className="hidden sm:inline">Change Location</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition shrink-0"
            aria-label="Dismiss banner"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900 text-white text-xs px-3 py-1.5 sm:px-3.5 sm:py-2 flex items-center justify-between gap-1.5 sm:gap-2 shadow-xs transition-all z-[100] relative border-b border-white/10">
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <Compass className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span className="text-[11px] sm:text-xs font-medium truncate">
          Browsing <strong className="text-sky-400 font-extrabold">{storeName}</strong> catalog
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition shrink-0"
        aria-label="Dismiss banner"
      >
        <X size={14} />
      </button>
    </div>
  );
}

