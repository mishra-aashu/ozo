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
    driftDistanceKm
  } = useLocationStore();

  const browsingCity = activeCities?.find(c => c.slug === browsingCitySlug);
  const deliveryCity = activeCities?.find(c => c.slug === deliveryCitySlug);

  const showBrowsingNotice = browsingCitySlug && deliveryCitySlug && browsingCitySlug !== deliveryCitySlug;

  if (!invalidCitySlugNotice && !showBrowsingNotice && !hasLocationDrift) {
    return null;
  }

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 text-amber-900 text-xs md:text-sm px-4 py-2 flex items-center justify-between shadow-xs transition-all">
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
