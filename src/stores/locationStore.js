import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { reverseGeocode, resolveAddressToCoordinates } from '../lib/geocoding'
import { GEOFENCE_DEFAULTS } from '../config/deliveryDefaults'


const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const useLocationStore = create(
  persist(
    (set, get) => ({
      address: null,
      coordinates: null,
      addressDetails: null,
      browsingCitySlug: null,
      deliveryCitySlug: null,
      selectedCitySlug: null,
      invalidCitySlugNotice: null,
      hasLocationDrift: false,
      driftDistanceKm: 0,
      nearestCity: null,
      tracedThrough: null,
      userAddresses: [],
      isDetecting: false,
      isLoading: false,
      isLocationInitialized: false,
      error: null,
      activeCities: [],
      localities: [],
      landmarks: [],
      galis: [],
      serviceabilityModal: {
        isOpen: false,
        cityName: '',
        pincode: '',
        onConfirm: null
      },

      showServiceabilityModal: (cityName, pincode, onConfirm = null) => {
        set({
          serviceabilityModal: {
            isOpen: true,
            cityName,
            pincode,
            onConfirm
          }
        })
      },

      closeServiceabilityModal: () => {
        const modalState = get().serviceabilityModal
        if (modalState.onConfirm) {
          modalState.onConfirm()
        }
        set({
          serviceabilityModal: {
            isOpen: false,
            cityName: '',
            pincode: '',
            onConfirm: null
          }
        })
      },

      fetchActiveCities: async () => {
        try {
          const { data: activeCities } = await supabase
            .from('operating_cities')
            .select('*')
            .eq('is_active', true)
          if (activeCities && activeCities.length > 0) {
            const sanitizedCities = activeCities.map(c => ({
              ...c,
              service_radius_km: Math.max(parseFloat(c.service_radius_km) || 25.0, 25.0)
            }))

                        const currentSlug = get().selectedCitySlug || get().browsingCitySlug || get().deliveryCitySlug
            const isValid = sanitizedCities.some(c => c.slug === currentSlug)
            const resolvedSlug = isValid ? currentSlug : null

            set({ 
              activeCities: sanitizedCities,
              selectedCitySlug: resolvedSlug,
              browsingCitySlug: resolvedSlug,
              deliveryCitySlug: resolvedSlug,
              isLocationInitialized: true 
            })

            return sanitizedCities
          }
        } catch (e) {
          console.error('Failed to fetch active cities:', e)
        }
        set({ 
          selectedCitySlug: null,
          isLocationInitialized: true 
        })
        return []
      },

      fetchHierarchicalData: async () => {
        try {
          const [locs, lms, gas] = await Promise.all([
            supabase.from('localities').select('*'),
            supabase.from('landmarks').select('*'),
            supabase.from('galis_apartments').select('*')
          ]);
          set({
            localities: locs.data || [],
            landmarks: lms.data || [],
            galis: gas.data || []
          });
        } catch (err) {
          console.error('Error fetching hierarchical data:', err);
        }
      },

      findClosestHierarchicalMatch: (lat, lng) => {
        const { localities, landmarks, galis } = get();
        if (!lat || !lng) return { locality: null, landmark: null, gali: null };

        let matchedGali = null;
        let matchedLandmark = null;
        let matchedLocality = null;

        // 1. First check if coordinates fall within the radius of any primary locality
        const primaryLocalities = localities.filter(loc => loc.is_primary === true);
        let closestPrimaryLocality = null;
        let minPrimaryLocalityDist = Infinity;

        for (const loc of primaryLocalities) {
          if (loc.latitude && loc.longitude) {
            const dist = getDistanceKm(lat, lng, parseFloat(loc.latitude), parseFloat(loc.longitude));
            const allowedLocRadiusKm = loc.radius ? parseFloat(loc.radius) / 1000 : 0.4;
            if (dist <= allowedLocRadiusKm) {
              if (dist < minPrimaryLocalityDist) {
                minPrimaryLocalityDist = dist;
                closestPrimaryLocality = loc;
              }
            }
          }
        }

        // If we found a matching primary locality by radius, use it and search within its children
        if (closestPrimaryLocality) {
          matchedLocality = closestPrimaryLocality;

          // Search closest gali within this locality
          let closestGali = null;
          let minGaliDist = Infinity;
          const localityGalis = galis.filter(g => g.locality_id === matchedLocality.id);
          for (const g of localityGalis) {
            if (g.latitude && g.longitude) {
              const dist = getDistanceKm(lat, lng, parseFloat(g.latitude), parseFloat(g.longitude));
              if (dist < minGaliDist) {
                minGaliDist = dist;
                closestGali = g;
              }
            }
          }
          if (closestGali) {
            const allowedGaliRadiusKm = closestGali.radius ? parseFloat(closestGali.radius) / 1000 : 0.15;
            if (minGaliDist <= allowedGaliRadiusKm) {
              matchedGali = closestGali;
            }
          }

          // Search closest landmark within this locality
          let closestLandmark = null;
          let minLandmarkDist = Infinity;
          const localityLandmarks = landmarks.filter(lm => lm.locality_id === matchedLocality.id);
          for (const lm of localityLandmarks) {
            if (lm.latitude && lm.longitude) {
              const dist = getDistanceKm(lat, lng, parseFloat(lm.latitude), parseFloat(lm.longitude));
              if (dist < minLandmarkDist) {
                minLandmarkDist = dist;
                closestLandmark = lm;
              }
            }
          }
          if (closestLandmark && minLandmarkDist <= 0.2) {
            matchedLandmark = closestLandmark;
          }
        } else {
          // 2. Standard fallback matching if not inside any primary locality's radius
          let closestGali = null;
          let minGaliDist = Infinity;
          for (const g of galis) {
            if (g.latitude && g.longitude) {
              const dist = getDistanceKm(lat, lng, parseFloat(g.latitude), parseFloat(g.longitude));
              if (dist < minGaliDist) {
                minGaliDist = dist;
                closestGali = g;
              }
            }
          }

          let closestLandmark = null;
          let minLandmarkDist = Infinity;
          for (const lm of landmarks) {
            if (lm.latitude && lm.longitude) {
              const dist = getDistanceKm(lat, lng, parseFloat(lm.latitude), parseFloat(lm.longitude));
              if (dist < minLandmarkDist) {
                minLandmarkDist = dist;
                closestLandmark = lm;
              }
            }
          }

          let closestLocality = null;
          let minLocalityDist = Infinity;
          for (const loc of localities) {
            if (loc.latitude && loc.longitude) {
              const dist = getDistanceKm(lat, lng, parseFloat(loc.latitude), parseFloat(loc.longitude));
              if (dist < minLocalityDist) {
                minLocalityDist = dist;
                closestLocality = loc;
              }
            }
          }

          if (closestGali) {
            const allowedGaliRadiusKm = closestGali.radius ? parseFloat(closestGali.radius) / 1000 : 0.15;
            if (minGaliDist <= allowedGaliRadiusKm) {
              matchedGali = closestGali;
              matchedLocality = localities.find(loc => loc.id === closestGali.locality_id) || null;
            }
          }

          if (closestLandmark && minLandmarkDist <= 0.2) {
            matchedLandmark = closestLandmark;
            if (!matchedLocality) {
              matchedLocality = localities.find(loc => loc.id === closestLandmark.locality_id) || null;
            }
          }

          if (closestLocality) {
            const allowedLocRadiusKm = closestLocality.radius ? parseFloat(closestLocality.radius) / 1000 : 0.4;
            if (minLocalityDist <= allowedLocRadiusKm) {
              if (!matchedLocality) {
                matchedLocality = closestLocality;
              }
            }
          }

          if (!matchedLocality && closestLocality && minLocalityDist <= 2.5) {
            matchedLocality = closestLocality;
          }
        }

        return {
          locality: matchedLocality,
          landmark: matchedLandmark,
          gali: matchedGali
        };
      },

      setAddress: (address) => {
        set({ address });
        if (typeof localStorage !== 'undefined' && address) {
          localStorage.setItem('ozo_delivery_address', JSON.stringify(address));
        }
      },
      setSelectedCitySlug: (selectedCitySlug) => set({ 
        selectedCitySlug, 
        browsingCitySlug: selectedCitySlug || get().browsingCitySlug 
      }),
      setBrowsingCitySlug: (slug) => {
        if (!slug) {
          set({ browsingCitySlug: null, selectedCitySlug: get().deliveryCitySlug || null });
          return;
        }

        const cleanSlug = slug.toLowerCase().trim();
        const activeCities = get().activeCities || [];

        const matched = activeCities.find(c => c.slug.toLowerCase() === cleanSlug);

        if (matched) {
          set({
            browsingCitySlug: matched.slug,
            selectedCitySlug: matched.slug,
            invalidCitySlugNotice: null
          });
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('ozo_browsing_city', matched.slug);
          }
        } else if (activeCities.length > 0) {
          const defaultCity = activeCities[0].slug;
          console.warn(`[LocationStore] City slug "${slug}" not found. Soft falling back to "${defaultCity}".`);
          set({
            browsingCitySlug: defaultCity,
            selectedCitySlug: defaultCity,
            invalidCitySlugNotice: `City "${slug}" was not found. Showing default catalog for ${activeCities[0].name || defaultCity}.`
          });
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('ozo_browsing_city', defaultCity);
          }
        } else {
          set({
            browsingCitySlug: cleanSlug,
            selectedCitySlug: cleanSlug,
            invalidCitySlugNotice: null
          });
        }
      },

      clearInvalidCitySlugNotice: () => set({ invalidCitySlugNotice: null }),

      checkLocationDrift: (liveLat, liveLng) => {
        const storedCoords = get().coordinates;
        if (!storedCoords || !storedCoords.lat || !storedCoords.lng || !liveLat || !liveLng) {
          set({ hasLocationDrift: false, driftDistanceKm: 0 });
          return;
        }

        const R = 6371;
        const dLat = (liveLat - storedCoords.lat) * Math.PI / 180;
        const dLon = (liveLng - storedCoords.lng) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(storedCoords.lat * Math.PI / 180) * Math.cos(liveLat * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        if (distance > 15) {
          set({ hasLocationDrift: true, driftDistanceKm: Math.round(distance) });
        } else {
          set({ hasLocationDrift: false, driftDistanceKm: 0 });
        }
      },
      setCoordinates: async (coordinates) => {
        set({ coordinates })
        if (coordinates) {
          await get().updateNearestCitySlug(coordinates.lat, coordinates.lng)
        }
      },

      updateNearestCitySlug: async (lat, lng) => {
        try {
          const { data: activeCities } = await supabase
            .from('operating_cities')
            .select('*')
            .eq('is_active', true)
          
          if (activeCities && activeCities.length > 0) {
            let nearestCityObj = activeCities[0]
            let minDistance = Infinity
            const R = 6371 // Earth's radius in km

            for (const city of activeCities) {
              if (city.latitude && city.longitude) {
                const cLat = parseFloat(city.latitude)
                const cLng = parseFloat(city.longitude)
                
                const dLat = (cLat - lat) * Math.PI / 180
                const dLon = (cLng - lng) * Math.PI / 180
                const a = 
                  Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat * Math.PI / 180) * Math.cos(cLat * Math.PI / 180) * 
                  Math.sin(dLon / 2) * Math.sin(dLon / 2)
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
                const distance = R * c

                if (distance < minDistance) {
                  minDistance = distance
                  nearestCityObj = city
                }
              }
            }

            const maxRadius = Math.max(parseFloat(nearestCityObj.service_radius_km) || 25.0, 25.0)
            const isServiceable = minDistance <= maxRadius

            set({ 
              selectedCitySlug: isServiceable ? nearestCityObj.slug : null,
              nearestCity: nearestCityObj,
              activeCities: activeCities
            })
          }
        } catch (e) {
          console.error('Failed to update nearest city slug:', e)
        }
      },

      // Fetch saved addresses from Supabase
      fetchUserAddresses: async (options = {}) => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            return { success: true, data: get().userAddresses || [] }
          }

          // If the stored addresses belong to a different user (e.g. after
          // account switch), clear them before fetching the correct ones so
          // one user never briefly sees another user's addresses.
          const existingAddresses = get().userAddresses || []
          const addressesBelongToDifferentUser =
            existingAddresses.length > 0 &&
            existingAddresses.some(
              a => a.user_id && a.user_id !== session.user.id
            )
          if (addressesBelongToDifferentUser) {
            get().clearUserAddresses()
          }

          // If there are guest addresses, sync/upload them to database first
          const guestAddresses = (get().userAddresses || []).filter(
            addr => addr.id && addr.id.toString().startsWith('temp-addr-')
          )
          
          if (guestAddresses.length > 0) {
            set({ isLoading: true })
            const { data: dbAddresses } = await supabase
              .from('addresses')
              .select('*')
              .eq('user_id', session.user.id)
            const dbList = dbAddresses || []

            for (const addr of guestAddresses) {
              const { id, created_at, ...cleanAddrData } = addr
              
              // Check if duplicate already exists in DB addresses
              const duplicateInDb = dbList.find(dbAddr => {
                if (cleanAddrData.latitude && cleanAddrData.longitude && dbAddr.latitude && dbAddr.longitude) {
                  const latDiff = Math.abs(parseFloat(dbAddr.latitude) - parseFloat(cleanAddrData.latitude))
                  const lngDiff = Math.abs(parseFloat(dbAddr.longitude) - parseFloat(cleanAddrData.longitude))
                  return latDiff < 0.00025 && lngDiff < 0.00025
                }
                const line1Match = (dbAddr.address_line1 || '').toLowerCase().trim() === (cleanAddrData.address_line1 || '').toLowerCase().trim()
                const cityMatch = (dbAddr.city || '').toLowerCase().trim() === (cleanAddrData.city || '').toLowerCase().trim()
                const pinMatch = (dbAddr.pincode || '').toString().trim() === (cleanAddrData.pincode || '').toString().trim()
                return line1Match && cityMatch && pinMatch
              })

              if (duplicateInDb) {
                continue // Skip syncing this duplicate guest address
              }
              
              if (cleanAddrData.is_default) {
                await supabase
                  .from('addresses')
                  .update({ is_default: false })
                  .eq('user_id', session.user.id)
              }
              
              const { error: insertError } = await supabase
                .from('addresses')
                .insert([{ ...cleanAddrData, user_id: session.user.id }])
              
              if (insertError) {
                console.error('Failed to sync guest address:', insertError)
              }
            }
          }

          set({ isLoading: true })
          let query = supabase
            .from('addresses')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })

          if (options.signal) {
            query = query.abortSignal(options.signal)
          }

          const { data, error } = await query

          if (error) throw error
          set({ userAddresses: data, isLoading: false })
          return { success: true, data }
        } catch (error) {
          if (error.name === 'AbortError' || error.message?.includes('aborted')) {
            console.log('Fetch addresses aborted.')
            return { success: false, error, aborted: true }
          }
          console.error('Fetch addresses error:', error)
          set({ isLoading: false })
          return { success: false, error }
        }
      },

      // Add a new address
      addUserAddress: async (addressData, silent = false) => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const userAddresses = get().userAddresses || []

          let lat = addressData.latitude
          let lng = addressData.longitude
          let tracedThrough = addressData.traced_through || 'manual'

          if (!lat || !lng) {
            const resolvedCoords = await resolveAddressToCoordinates(addressData)
            if (resolvedCoords) {
              lat = resolvedCoords.lat
              lng = resolvedCoords.lng
              tracedThrough = resolvedCoords.traced_through
            } else {
              const matchedCity = findCityByPincode(addressData.pincode) || findMatchingActiveCity(addressData.city)
              if (matchedCity && matchedCity.latitude && matchedCity.longitude) {
                lat = parseFloat(matchedCity.latitude)
                lng = parseFloat(matchedCity.longitude)
                tracedThrough = 'city_fallback'
              }
            }
          }

          const resolvedAddressData = {
            ...addressData,
            latitude: lat,
            longitude: lng,
            traced_through: tracedThrough
          }

          // Check if an address with almost identical coordinates or matching address lines already exists
          const existingAddress = userAddresses.find(addr => {
            if (resolvedAddressData.latitude && resolvedAddressData.longitude && addr.latitude && addr.longitude) {
              const latDiff = Math.abs(parseFloat(addr.latitude) - parseFloat(resolvedAddressData.latitude))
              const lngDiff = Math.abs(parseFloat(addr.longitude) - parseFloat(resolvedAddressData.longitude))
              return latDiff < 0.00025 && lngDiff < 0.00025
            }
            const line1Match = (addr.address_line1 || '').toLowerCase().trim() === (resolvedAddressData.address_line1 || '').toLowerCase().trim()
            const cityMatch = (addr.city || '').toLowerCase().trim() === (resolvedAddressData.city || '').toLowerCase().trim()
            const pinMatch = (addr.pincode || '').toString().trim() === (resolvedAddressData.pincode || '').toString().trim()
            return line1Match && cityMatch && pinMatch
          })

          if (existingAddress) {
            // Update default status if requested and not already default
            if (resolvedAddressData.is_default && !existingAddress.is_default) {
              existingAddress.is_default = true
              if (session) {
                await supabase
                  .from('addresses')
                  .update({ is_default: false })
                  .eq('user_id', session.user.id)
                await supabase
                  .from('addresses')
                  .update({ is_default: true })
                  .eq('id', existingAddress.id)
                await get().fetchUserAddresses()
              } else {
                set({
                  userAddresses: userAddresses.map(a => 
                    a.id === existingAddress.id ? { ...a, is_default: true } : { ...a, is_default: false }
                  )
                })
              }
            }
            return existingAddress
          }

          if (!session) {
            // Guest mode: save to local state / storage
            const newAddress = {
              id: `temp-addr-${Date.now()}`,
              ...resolvedAddressData,
              created_at: new Date().toISOString()
            }
            
            let currentAddresses = get().userAddresses || []
            if (resolvedAddressData.is_default) {
              currentAddresses = currentAddresses.map(addr => ({ ...addr, is_default: false }))
            }
            
            set({
              userAddresses: [newAddress, ...currentAddresses]
            })
            if (!silent) {
              toast.success('Address saved locally')
            }
            return newAddress
          }

          set({ isLoading: true })

          // If the new address is default, reset other default addresses first
          if (resolvedAddressData.is_default) {
            await supabase
              .from('addresses')
              .update({ is_default: false })
              .eq('user_id', session.user.id)
          }

          const { data, error } = await supabase
            .from('addresses')
            .insert([{ ...resolvedAddressData, user_id: session.user.id }])
            .select()
            .single()

          if (error) throw error
          
          await get().fetchUserAddresses()
          if (!silent) {
            toast.success('Address saved successfully')
          }
          return data
        } catch (error) {
          console.error('Add address error:', error)
          toast.error('Failed to save address')
          set({ isLoading: false })
          return null
        }
      },

      // Update an address
      updateUserAddress: async (addressId, addressData) => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          
          let lat = addressData.latitude
          let lng = addressData.longitude
          let tracedThrough = addressData.traced_through || 'manual'

          if (!lat || !lng) {
            const resolvedCoords = await resolveAddressToCoordinates(addressData)
            if (resolvedCoords) {
              lat = resolvedCoords.lat
              lng = resolvedCoords.lng
              tracedThrough = resolvedCoords.traced_through
            } else {
              const matchedCity = findCityByPincode(addressData.pincode) || findMatchingActiveCity(addressData.city)
              if (matchedCity && matchedCity.latitude && matchedCity.longitude) {
                lat = parseFloat(matchedCity.latitude)
                lng = parseFloat(matchedCity.longitude)
                tracedThrough = 'city_fallback'
              }
            }
          }

          const resolvedAddressData = {
            ...addressData,
            latitude: lat,
            longitude: lng,
            traced_through: tracedThrough
          }

          if (!session) {
            // Guest mode: update locally
            let currentAddresses = get().userAddresses || []
            if (resolvedAddressData.is_default) {
              currentAddresses = currentAddresses.map(addr => ({ ...addr, is_default: false }))
            }
            const updatedAddresses = currentAddresses.map(addr => 
              addr.id === addressId ? { ...addr, ...resolvedAddressData } : addr
            )
            set({ userAddresses: updatedAddresses })
            toast.success('Address updated locally')
            return updatedAddresses.find(addr => addr.id === addressId)
          }

          set({ isLoading: true })

          // If this address is set to default, reset other default addresses first
          if (resolvedAddressData.is_default) {
            await supabase
              .from('addresses')
              .update({ is_default: false })
              .eq('user_id', session.user.id)
          }

          const { data, error } = await supabase
            .from('addresses')
            .update(resolvedAddressData)
            .eq('id', addressId)
            .eq('user_id', session.user.id)
            .select()
            .single()

          if (error) throw error

          await get().fetchUserAddresses()
          toast.success('Address updated successfully')
          return data
        } catch (error) {
          console.error('Update address error:', error)
          toast.error('Failed to update address')
          set({ isLoading: false })
          return null
        }
      },

      // Delete an address
      deleteUserAddress: async (addressId) => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            // Guest mode: delete locally
            set({
              userAddresses: (get().userAddresses || []).filter(addr => addr.id !== addressId)
            })
            toast.success('Address deleted locally')
            return true
          }

          set({ isLoading: true })
          const { error } = await supabase
            .from('addresses')
            .delete()
            .eq('id', addressId)
            .eq('user_id', session.user.id)

          if (error) throw error

          await get().fetchUserAddresses()
          toast.success('Address deleted successfully')
          return true
        } catch (error) {
          console.error('Delete address error:', error)
          toast.error('Failed to delete address')
          set({ isLoading: false })
          return false
        }
      },

      getFallbackLocation: async (userLat = null, userLng = null) => {
        return { lat: null, lng: null, cityName: '', rawCity: '', stateName: '', pincode: '' }
      },

      detectLocation: async (isManual = false, silent = false) => {
        set({ isDetecting: true, error: null })
        if (isManual) {
          localStorage.removeItem('ozo_location_permission_denied')
        }
        
        if (!navigator.geolocation) {
          set({ isDetecting: false })
          return false
        }

        // Ensure active cities are loaded before checking serviceability
        let activeCities = get().activeCities || []
        if (activeCities.length === 0) {
          activeCities = await get().fetchActiveCities()
        }

        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords
              localStorage.removeItem('ozo_location_permission_denied')
              
              // First update the nearest city slug so geocoding lookup has the correct city context
              await get().updateNearestCitySlug(latitude, longitude)

              try {
                // Reverse geocoding to fetch detailed address via utility
                const { displayName, addressDetails } = await reverseGeocode(latitude, longitude, null, {
                  nearestCity: get().nearestCity,
                  activeCities: get().activeCities
                })
                
                // Construct a shorter, cleaner display address (e.g. Road, Suburb, City)
                const road = addressDetails.road || addressDetails.street || ''
                const suburb = addressDetails.suburb || addressDetails.neighbourhood || addressDetails.village || ''
                const city = addressDetails.city || addressDetails.town || addressDetails.county || ''
                
                let displayAddress = ''
                if (road || suburb) {
                  displayAddress = [road, suburb, city].filter(Boolean).join(', ')
                } else {
                  displayAddress = displayName || `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`
                }

                set({ 
                  coordinates: { lat: latitude, lng: longitude },
                  address: displayAddress,
                  addressDetails: addressDetails,
                  isDetecting: false,
                  tracedThrough: 'gps'
                })
                // Update nearest city AFTER saving coordinates — this sets selectedCitySlug
                await get().updateNearestCitySlug(latitude, longitude)
                // Now re-check serviceability with selectedCitySlug already set
                const isServiceableAfter = checkDeliveryZoneStatus(latitude, longitude)
                if (!isServiceableAfter && !silent) {
                  toast.error("OZO is not yet serviceable at your location. Showing detected location.", { duration: 6000, id: 'out-of-zone-warning' })
                } else if (isManual) {
                  toast.success('Location detected successfully!')
                }
                resolve(true)
              } catch (err) {
                // Fallback to simple display using dynamic active city
                const fallback = await get().getFallbackLocation(latitude, longitude)
                const nearestCity = get().nearestCity
                const distToNearest = nearestCity ? getDistanceKm(latitude, longitude, parseFloat(nearestCity.latitude), parseFloat(nearestCity.longitude)) : Infinity
                const useNearest = nearestCity && distToNearest <= 50.0

                set({ 
                  coordinates: { lat: latitude, lng: longitude },
                  address: `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                  addressDetails: {
                    road: '',
                    suburb: '',
                    city: useNearest ? nearestCity.name : 'Unknown',
                    state: useNearest ? nearestCity.state : 'Unknown',
                    postcode: (useNearest && nearestCity.allowed_pincodes) ? nearestCity.allowed_pincodes[0] : ''
                  },
                  isDetecting: false,
                  tracedThrough: 'gps'
                })
                await get().updateNearestCitySlug(latitude, longitude)
                if (isManual) {
                  toast.success('Location detected successfully!')
                }
                resolve(true)
              }
            },
            async (error) => {
              // Do NOT automatically fallback to a default city when permission is denied or geolocator fails
              set({ isDetecting: false })
              
              if (error.code === error.PERMISSION_DENIED) {
                localStorage.setItem('ozo_location_permission_denied', 'true')
              }
              if (isManual) {
                toast.error(`Could not detect live location. Please select your location manually.`, { id: 'gps-error' })
              }
              resolve(false)
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
          )
        })
      },

      // Clears GPS-derived location state and the selected city.
      // User addresses are intentionally NOT cleared here — they belong to
      // the user's profile, not to the current GPS position. Wiping them on
      // every sign-out causes a visible flash of empty addresses when the
      // user signs back in before the DB fetch completes, and loses
      // guest-mode addresses that were saved locally.
      // Addresses are cleared in fetchUserAddresses when the user ID changes.
      clearLocation: () => set({
        address: null,
        coordinates: null,
        addressDetails: null,
        selectedCitySlug: null,
        tracedThrough: null,
      }),

      // Explicitly clear saved addresses — called when the user account changes
      // (different user logs in) to prevent one user seeing another's addresses.
      clearUserAddresses: () => set({ userAddresses: [] }),
    }),
    {
      name: 'ozo-location-storage',
      partialize: (state) => ({ 
        address: state.address, 
        coordinates: state.coordinates,
        addressDetails: state.addressDetails,
        browsingCitySlug: state.browsingCitySlug,
        deliveryCitySlug: state.deliveryCitySlug,
        selectedCitySlug: state.selectedCitySlug || state.browsingCitySlug || state.deliveryCitySlug,
        nearestCity: state.nearestCity,
        activeCities: state.activeCities,
        localities: state.localities,
        landmarks: state.landmarks,
        galis: state.galis,
        userAddresses: state.userAddresses,
        tracedThrough: state.tracedThrough
      }),
    }
  )
)

// Dynamic Circle Geofence Check (Haversine Formula)
//
// Accepts an optional `config` object so callers that already hold the cart
// store state can pass it in directly. This keeps locationStore free of any
// dependency on cartStore (which imports locationStore), preventing a circular
// module dependency.
//
// config shape (all optional):
//   { deliveryConfig: { store_lat, store_lng },
//     geofenceConfig: { warehouse_lat, warehouse_lng, max_radius_km } }
//
// Call sites that have useCartStore available should pass:
//   checkDeliveryZoneStatus(lat, lng, useCartStore.getState())
export const checkDeliveryZoneStatus = (userLat, userLng, config = null) => {
  if (!userLat || !userLng) return false;
  const lat = parseFloat(userLat);
  const lng = parseFloat(userLng);
  if (isNaN(lat) || isNaN(lng)) return false;

  try {
    const locationState = useLocationStore.getState();

    // If selectedCitySlug is set, location was already positively matched — trust it
    if (locationState.selectedCitySlug) {
      const activeCities = locationState.activeCities || [];
      const matched = activeCities.find(c => c.slug === locationState.selectedCitySlug);
      if (matched) return true;
    }

    const activeCities = locationState.activeCities || [];

    // If cities haven't loaded yet, don't block the user — return true gracefully
    if (activeCities.length === 0) return true;

    // Check distance against all active operating cities using enforced minimum 25km radius
    for (const city of activeCities) {
      if (!city.latitude || !city.longitude) continue;
      const cLat = parseFloat(city.latitude);
      const cLng = parseFloat(city.longitude);
      // Apply same Math.max(radius, 25) guarantee as fetchActiveCities sanitization
      const maxRadius = Math.max(parseFloat(city.service_radius_km) || 25.0, 25.0);
      const dist = getDistanceKm(lat, lng, cLat, cLng);
      if (dist <= maxRadius) return true;
    }

    return false;
  } catch (e) {
    console.error("Error checking dynamic delivery zone:", e);
    return true; // Fail open — don't falsely block users on errors
  }
};

export const findMatchingActiveCity = (cityName) => {
  if (!cityName) return null;
  const cleanInput = cityName.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  const activeCities = useLocationStore.getState().activeCities || [];
  
  // Try exact or substring match first
  let matched = activeCities.find(c => {
    const cleanCityName = c.name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    return cleanCityName === cleanInput || cleanCityName.includes(cleanInput) || cleanInput.includes(cleanCityName);
  });
  
  // Fallback: match by slug
  if (!matched) {
    const cleanSlugInput = cityName.toLowerCase().replace(/[\s,]+/g, '-').replace(/[^a-z0-9-]/g, '').trim();
    matched = activeCities.find(c => {
      const cleanSlug = c.slug.toLowerCase().trim();
      return cleanSlug === cleanSlugInput || cleanSlug.includes(cleanSlugInput) || cleanSlugInput.includes(cleanSlug);
    });
  }
  
  return matched;
};

export const findCityByPincode = (pincode) => {
  if (!pincode) return null;
  const cleanPin = pincode.toString().trim();
  const activeCities = useLocationStore.getState().activeCities || [];
  return activeCities.find(c => c.allowed_pincodes && Array.isArray(c.allowed_pincodes) && c.allowed_pincodes.includes(cleanPin));
};

export const checkPincodeServiceable = (pincode, cityName = null) => {
  if (!pincode) return true;
  const cleanPin = pincode.toString().trim();
  const activeCities = useLocationStore.getState().activeCities || [];
  
  if (cityName) {
    const cleanCity = cityName.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const city = activeCities.find(c => {
      const cleanName = c.name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      const cleanSlug = c.slug.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      return cleanName.includes(cleanCity) || cleanCity.includes(cleanName) || cleanSlug.includes(cleanCity) || cleanCity.includes(cleanSlug);
    });
    if (city) {
      if (city.allowed_pincodes && Array.isArray(city.allowed_pincodes) && city.allowed_pincodes.length > 0) {
        return city.allowed_pincodes.includes(cleanPin);
      }
      return true;
    }
  }
  
  return activeCities.some(c => !c.allowed_pincodes || c.allowed_pincodes.length === 0 || (Array.isArray(c.allowed_pincodes) && c.allowed_pincodes.includes(cleanPin)));
};

export const showServiceabilityModal = (cityName, pincode, onConfirm = null) => {
  useLocationStore.getState().showServiceabilityModal(cityName, pincode, onConfirm);
};

// Initialize active cities on module load
if (typeof window !== 'undefined') {
  useLocationStore.getState().fetchActiveCities().catch(console.error);
  useLocationStore.getState().fetchHierarchicalData().catch(console.error);
}
