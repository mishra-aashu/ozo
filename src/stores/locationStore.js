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
      selectedCitySlug: null,
      nearestCity: null,
      tracedThrough: null,
      userAddresses: [],
      isDetecting: false,
      isLoading: false,
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
          if (activeCities) {
            set({ activeCities })
            return activeCities
          }
        } catch (e) {
          console.error('Failed to fetch active cities:', e)
        }
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

      setAddress: (address) => set({ address }),
      setSelectedCitySlug: (selectedCitySlug) => set({ selectedCitySlug }),
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

            const maxRadius = parseFloat(nearestCityObj.service_radius_km) || 30.0
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

      detectLocation: async (isManual = false, silent = false) => {
        set({ isDetecting: true, error: null })
        if (isManual) {
          localStorage.removeItem('ozo_location_permission_denied')
        }
        
        if (!navigator.geolocation) {
          const errMsg = 'Geolocation is not supported by your browser'
          const lat = GEOFENCE_DEFAULTS.warehouse_lat || 24.753239;
          const lng = GEOFENCE_DEFAULTS.warehouse_lng || 84.374124;
          set({ 
            coordinates: { lat, lng },
            address: 'Aurangabad, Bihar - 824101',
            addressDetails: {
              road: '',
              suburb: '',
              city: 'Aurangabad',
              state: 'Bihar',
              postcode: '824101'
            },
            isDetecting: false,
            tracedThrough: 'fallback_default'
          })
          await get().updateNearestCitySlug(lat, lng)
          return false
        }

        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords
              localStorage.removeItem('ozo_location_permission_denied')
              
              // Validate serviceability using checkDeliveryZoneStatus
              const isServiceable = checkDeliveryZoneStatus(latitude, longitude)
              if (!isServiceable) {
                const errMsg = 'OZO is not yet serviceable at your location. We currently only deliver in Aurangabad, Bihar.'
                set({ 
                  error: errMsg, 
                  isDetecting: false 
                })
                if (isManual) {
                  toast.error(errMsg, { duration: 6000, id: 'out-of-zone-error' })
                }
                resolve(false)
                return
              }

              try {
                // Reverse geocoding to fetch detailed address via utility
                const { displayName, addressDetails } = await reverseGeocode(latitude, longitude)
                
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
                await get().updateNearestCitySlug(latitude, longitude)
                if (isManual) {
                  toast.success('Location detected successfully!')
                }
                resolve(true)
              } catch (err) {
                // Fallback to simple display
                const nearestCity = get().nearestCity
                set({ 
                  coordinates: { lat: latitude, lng: longitude },
                  address: `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                  addressDetails: {
                    road: '',
                    suburb: '',
                    city: nearestCity?.name || 'Aurangabad',
                    state: nearestCity?.state || 'Bihar',
                    postcode: nearestCity?.allowed_pincodes?.[0] || '824101'
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
              // Fallback to Aurangabad defaults when permission is denied or geolocator fails
              const lat = 24.753239;
              const lng = 84.374124;
              
              set({ 
                coordinates: { lat, lng },
                address: 'Aurangabad, Bihar - 824101',
                addressDetails: {
                  road: '',
                  suburb: '',
                  city: 'Aurangabad',
                  state: 'Bihar',
                  postcode: '824101'
                },
                isDetecting: false,
                tracedThrough: 'fallback_default'
              })
              await get().updateNearestCitySlug(lat, lng)
              
              if (error.code === error.PERMISSION_DENIED) {
                localStorage.setItem('ozo_location_permission_denied', 'true')
              }
              if (isManual) {
                toast.error('Could not detect live location. Defaulted to Aurangabad.', { id: 'gps-error' })
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
        selectedCitySlug: state.selectedCitySlug,
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
    const activeCities = locationState.activeCities || [];
    const localities = locationState.localities || [];
    const landmarks = locationState.landmarks || [];
    const galis = locationState.galis || [];

    // If we have active cities loaded, check if coordinates fall within any active city's radius
    if (activeCities.length > 0) {
      let matchedCity = null;
      for (const city of activeCities) {
        if (!city.latitude || !city.longitude) continue;
        const cLat = parseFloat(city.latitude);
        const cLng = parseFloat(city.longitude);
        const maxRadius = parseFloat(city.service_radius_km) || 15.0;
        const dist = getDistanceKm(lat, lng, cLat, cLng);
        if (dist <= maxRadius) {
          matchedCity = city;
          break;
        }
      }

      if (!matchedCity) return false;

      // If the matched city is Aurangabad, apply hyper-local boundary check
      if (matchedCity.slug?.includes('aurangabad')) {
        // 1. Check Localities
        for (const loc of localities) {
          if (loc.latitude && loc.longitude) {
            const distMeters = getDistanceKm(lat, lng, parseFloat(loc.latitude), parseFloat(loc.longitude)) * 1000;
            const radius = parseFloat(loc.radius) || 250;
            if (distMeters <= radius) {
              return true;
            }
          }
        }
        
        // 2. Check Landmarks
        const landmarkRadii = {
          'Ramesh Chowk': 80,
          'Maharajganj Chowk': 60,
          'Gandhi Chowk': 50,
          'Swarn Jayanti Chowk': 70,
          'Karma Road More': 100,
          'Karma Road Entry More': 40,
          'Karma Road Mid-Section': 50,
          'Karma Road Bypass Crossing': 100,
          'Maa Sharda Complex': 30,
          'Karma Road Power Grid': 120,
          'St. Joseph\'s / Local Schools Area': 80,
          'Deo More': 150,
          'Jasaiya More': 50,
          'Amba More': 60,
          'Overbridge Chowk': 120,
          'Kutchehry Chowk': 80,
          'Bypass Chauraha': 200,
          'Sinha College More': 60,
          'Dhobaul More': 40,
          'Kanap More': 40,
          'Old GT Road More': 90,
          'Mavesi Hospital More': 50,
          'Bauddh Vihar Chowk': 40,
          'Jail More': 50,
          'Thana Chowk': 50,
          'Block More': 50
        };
        for (const lm of landmarks) {
          if (lm.latitude && lm.longitude) {
            const distMeters = getDistanceKm(lat, lng, parseFloat(lm.latitude), parseFloat(lm.longitude)) * 1000;
            const radius = landmarkRadii[lm.name] || 80;
            if (distMeters <= radius) {
              return true;
            }
          }
        }
        
        // 3. Check Galis
        for (const gali of galis) {
          if (gali.latitude && gali.longitude) {
            const distMeters = getDistanceKm(lat, lng, parseFloat(gali.latitude), parseFloat(gali.longitude)) * 1000;
            const stretch = parseFloat(gali.length) || 300;
            if (distMeters <= stretch) {
              return true;
            }
          }
        }
        
        // If it's Aurangabad but matches none of our serviceable areas, it's not deliverable!
        return false;
      }

      // For other cities, return true as it's within the city radius
      return true;
    }

    // Fallback: If activeCities are not loaded yet
    let centerLat = GEOFENCE_DEFAULTS.warehouse_lat;
    let centerLng = GEOFENCE_DEFAULTS.warehouse_lng;
    let maxRadius = GEOFENCE_DEFAULTS.max_radius_km;

    const nearestCity = locationState.nearestCity;
    if (nearestCity && nearestCity.latitude && nearestCity.longitude) {
      centerLat = parseFloat(nearestCity.latitude);
      centerLng = parseFloat(nearestCity.longitude);
      maxRadius = parseFloat(nearestCity.service_radius_km) || 2.5;
    } else if (config) {
      const { deliveryConfig, geofenceConfig } = config;
      if (deliveryConfig && deliveryConfig.store_lat) {
        centerLat = parseFloat(deliveryConfig.store_lat);
        centerLng = parseFloat(deliveryConfig.store_lng);
      } else if (geofenceConfig) {
        if (geofenceConfig.warehouse_lat) centerLat = parseFloat(geofenceConfig.warehouse_lat);
        if (geofenceConfig.warehouse_lng) centerLng = parseFloat(geofenceConfig.warehouse_lng);
      }
      if (geofenceConfig && geofenceConfig.max_radius_km) {
        maxRadius = parseFloat(geofenceConfig.max_radius_km);
      }
    }

    const dist = getDistanceKm(lat, lng, centerLat, centerLng);
    return dist <= maxRadius;
  } catch (e) {
    console.error("Error checking dynamic delivery zone:", e);
    return false;
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
  if (!pincode) return false;
  const cleanPin = pincode.toString().trim();
  const activeCities = useLocationStore.getState().activeCities || [];
  
  if (cityName) {
    const cleanCity = cityName.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const city = activeCities.find(c => c.name.toLowerCase().replace(/[^a-z0-9]/g, '').trim().includes(cleanCity));
    if (city) {
      return city.allowed_pincodes && Array.isArray(city.allowed_pincodes) && city.allowed_pincodes.includes(cleanPin);
    }
  }
  
  return activeCities.some(c => c.allowed_pincodes && Array.isArray(c.allowed_pincodes) && c.allowed_pincodes.includes(cleanPin));
};

export const showServiceabilityModal = (cityName, pincode, onConfirm = null) => {
  useLocationStore.getState().showServiceabilityModal(cityName, pincode, onConfirm);
};

// Initialize active cities on module load
if (typeof window !== 'undefined') {
  useLocationStore.getState().fetchActiveCities().catch(console.error);
  useLocationStore.getState().fetchHierarchicalData().catch(console.error);
}
