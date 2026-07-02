import React, { useState, useEffect } from 'react'
import { Truck, Phone, Star, MapPin, ExternalLink, Shield, AlertCircle, Wallet, FileText, Landmark, RefreshCw, CheckCircle2, Clock } from 'lucide-react'
import { supabaseAdmin as supabase } from '../../lib/supabase'
import { GEOFENCE_DEFAULTS } from '../../config/deliveryDefaults'

const RiderAdmin = ({ rider, order, onAssignRider }) => {
  const [onlineRiders, setOnlineRiders] = useState([])
  const [isLoadingOnline, setIsLoadingOnline] = useState(false)
  const [isAssigning, setIsAssigning] = useState(null)
  const [showReassignList, setShowReassignList] = useState(false)

  const isOrderActive = order && !['delivered', 'DELIVERED_VERIFYING', 'COMPLETED', 'cancelled', 'CANCELLED_BY_USER'].includes(order.status)

  const fetchOnlineRiders = async () => {
    setIsLoadingOnline(true)
    try {
      const { data, error } = await supabase
        .from('captains')
        .select('*')
        .eq('status', 'online')
        .order('full_name', { ascending: true })

      if (error) throw error
      setOnlineRiders(data || [])
    } catch (err) {
      console.error('Failed to fetch online riders:', err)
    } finally {
      setIsLoadingOnline(false)
    }
  }

  useEffect(() => {
    if (isOrderActive && (!rider || showReassignList)) {
      fetchOnlineRiders()
    }
  }, [rider, showReassignList, order?.id])

  const renderOnlineRidersSection = () => {
    if (!isOrderActive) return null

    return (
      <div className="mt-4 pt-4 border-t border-gray-150 dark:border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-black uppercase tracking-wider text-gray-405 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-emerald-500" />
            Available Online Captains
          </h5>
          <button
            onClick={fetchOnlineRiders}
            disabled={isLoadingOnline}
            className="p-1 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-550 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg transition-colors"
            title="Refresh Online Captains"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOnline ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoadingOnline ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2 bg-gray-50/30 dark:bg-white/[0.01] rounded-xl border border-gray-100 dark:border-white/5">
            <div className="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Searching Online Captains...</p>
          </div>
        ) : onlineRiders.length === 0 ? (
          <div className="p-4 bg-gray-50/30 dark:bg-white/[0.01] rounded-xl border border-gray-100 dark:border-white/5 text-center text-xs text-gray-400">
            <AlertCircle className="w-4 h-4 text-amber-500 mx-auto mb-1.5" />
            No captains are currently online.
          </div>
        ) : (
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {onlineRiders.map((captain) => (
              <div 
                key={captain.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-white/[0.02] hover:bg-gray-50 dark:hover:bg-white/[0.04] rounded-xl border border-gray-100 dark:border-white/5 transition-all duration-200 group/item"
              >
                <div className="flex items-center gap-3">
                  {captain.selfie_url ? (
                    <img
                      src={captain.selfie_url}
                      alt={captain.full_name}
                      className="w-8 h-8 rounded-full object-cover border border-emerald-500/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-[#00FF66] flex items-center justify-center font-bold text-xs uppercase border border-emerald-500/20">
                      {captain.full_name?.slice(0, 2) || 'CP'}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <div className="font-bold text-gray-905 dark:text-white text-xs flex items-center gap-1">
                      {captain.full_name || 'OZO Captain'}
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Online" />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span className="font-semibold">{captain.bike_number || 'No Bike #'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {parseFloat(captain.rating || 5).toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    setIsAssigning(captain.id)
                    await onAssignRider(captain.id)
                    setIsAssigning(null)
                    setShowReassignList(false)
                  }}
                  disabled={isAssigning !== null}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors shadow-sm"
                >
                  {isAssigning === captain.id ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!rider) {
    return (
      <div className="p-5 bg-gradient-to-br from-gray-50/80 to-gray-50/30 dark:from-white/[0.03] dark:to-transparent rounded-2xl border border-gray-100 dark:border-white/5 space-y-4 hover:border-emerald-500/20 dark:hover:border-emerald-500/10 transition-all duration-300 shadow-sm relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all duration-500 pointer-events-none" />

        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
          <h4 className="text-sm font-black uppercase tracking-wider text-gray-450 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-emerald-500 dark:text-[#00FF66]" />
            Delivery Captain Details
          </h4>
          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
            Unassigned
          </span>
        </div>

        <div className="flex flex-col items-center justify-center text-center py-6 bg-gray-50/50 dark:bg-white/[0.01] rounded-xl border border-dashed border-gray-200 dark:border-white/10 p-4">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-2">
            <Truck className="w-5 h-5 animate-bounce" style={{ animationDuration: '3s' }} />
          </div>
          <h5 className="text-xs font-extrabold text-gray-700 dark:text-gray-300">No Captain Assigned</h5>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 max-w-[200px]">
            This order is waiting for a delivery partner.
          </p>
        </div>

        {renderOnlineRidersSection()}
      </div>
    )
  }

  const getRiderLocationUrl = () => {
    if (rider.current_lat && rider.current_long) {
      return `https://www.google.com/maps/search/?api=1&query=${rider.current_lat},${rider.current_long}`
    }
    return null
  }

  const renderStars = (rating) => {
    const stars = []
    const val = parseFloat(rating) || 5.0
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i <= val
              ? 'fill-amber-400 text-amber-400'
              : 'text-gray-200 dark:text-gray-700'
          }`}
        />
      )
    }
    return stars
  }

  // Calculate order payout for the rider
  const calculateDistance = (lat2, lon2) => {
    // Use live geofenceConfig from cartStore if available, else fall back to central defaults
    const cartStoreState = typeof window !== 'undefined' && window.__cartStore ? window.__cartStore.getState() : null
    const geofenceConfig = cartStoreState?.geofenceConfig || GEOFENCE_DEFAULTS
    const lat1 = parseFloat(geofenceConfig.warehouse_lat) || GEOFENCE_DEFAULTS.warehouse_lat
    const lon1 = parseFloat(geofenceConfig.warehouse_lng) || GEOFENCE_DEFAULTS.warehouse_lng
    const R = 6371 // km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const getOrderPayout = () => {
    const basePayout = 10.0
    const distanceBonus = 5.0
    
    if (order && order.distance !== null && order.distance !== undefined) {
      const dist = parseFloat(order.distance)
      return {
        distance: dist,
        payout: basePayout + (dist * distanceBonus)
      }
    }
    if (order && order.latitude && order.longitude) {
      const dist = calculateDistance(parseFloat(order.latitude), parseFloat(order.longitude))
      return {
        distance: dist,
        payout: basePayout + (dist * distanceBonus)
      }
    }
    if (order && order.address?.latitude && order.address?.longitude) {
      const dist = calculateDistance(parseFloat(order.address.latitude), parseFloat(order.address.longitude))
      return {
        distance: dist,
        payout: basePayout + (dist * distanceBonus)
      }
    }
    return {
      distance: null,
      payout: parseFloat(order?.delivery_fee || 0) + 15.0
    }
  }

  const payoutInfo = getOrderPayout()
  const totalEarnings = parseFloat(rider.earnings || 0)
  const cashInHand = parseFloat(rider.cash_in_hand || 0)
  const netBalance = totalEarnings - cashInHand

  return (
    <div className="p-5 bg-gradient-to-br from-gray-50/80 to-gray-50/30 dark:from-white/[0.03] dark:to-transparent rounded-2xl border border-gray-100 dark:border-white/5 space-y-4 hover:border-emerald-500/20 dark:hover:border-emerald-500/10 transition-all duration-300 shadow-sm relative overflow-hidden group">
      {/* Decorative background glow */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all duration-500 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
        <h4 className="text-sm font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
          <Truck className="w-4 h-4 text-emerald-500 dark:text-[#00FF66]" />
          Delivery Captain Details
        </h4>
        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-[#00FF66] border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
          Active Rider
        </span>
      </div>

      {/* Profile Info */}
      <div className="flex items-center gap-4">
        {rider.selfie_url ? (
          <div className="relative">
            <img
              src={rider.selfie_url}
              alt={rider.full_name}
              className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/30 dark:border-[#00FF66]/20 shadow-md group-hover:scale-105 transition-all duration-300"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#141414] rounded-full"></span>
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-[#00FF66] flex items-center justify-center font-extrabold text-sm uppercase border border-emerald-500/20 shadow-inner">
            {rider.full_name?.slice(0, 2) || 'CP'}
          </div>
        )}
        <div className="space-y-1">
          <div className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
            {rider.full_name || 'OZO Captain'}
            <Shield className="w-3.5 h-3.5 text-blue-500" title="Verified Captain" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {renderStars(rider.rating)}
            </div>
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
              {parseFloat(rider.rating || 5).toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Bike Number & Contact */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-450 block mb-1">Bike Number</span>
          <span className="font-extrabold text-gray-800 dark:text-gray-250 bg-gray-100 dark:bg-white/5 px-2.5 py-1.5 rounded-xl border border-gray-200/50 dark:border-white/5 inline-block uppercase tracking-wider">
            {rider.bike_number || 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-450 block mb-1">Contact</span>
          <div className="flex flex-col gap-1.5">
            <a
              href={`tel:${rider.phone}`}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-[#00FF66] font-black uppercase tracking-wider rounded-xl transition-all border border-emerald-500/20"
            >
              <Phone className="w-3 h-3" />
              {rider.phone || 'Call Rider'}
            </a>
            {rider.whatsapp && (
              <a
                href={`https://wa.me/${rider.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 text-[10px] font-bold uppercase rounded-lg border border-green-500/20"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Delivery Progress Timeline */}
      {order && (
        <div className="bg-gray-50/50 dark:bg-white/[0.01] rounded-2xl border border-gray-150/60 dark:border-white/5 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-150 dark:border-white/5 pb-2">
            <span className="text-[10px] uppercase font-black text-gray-400 dark:text-gray-400 tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              Rider Progress Timeline
            </span>
            {order.status === 'cancelled' ? (
              <span className="text-[9px] font-black uppercase bg-red-500/10 text-red-650 dark:text-red-400 px-2 py-0.5 rounded-md border border-red-500/20 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-red-500" />
                Cancelled
              </span>
            ) : (
              <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-[#00FF66] px-2 py-0.5 rounded-md border border-emerald-500/20">
                Live updates
              </span>
            )}
          </div>

          {order.status === 'cancelled' && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 text-red-650 dark:text-red-400 rounded-xl border border-red-500/20 text-xs font-black uppercase tracking-wider">
              <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
              Order has been Cancelled
            </div>
          )}

          <div className="relative pl-6 space-y-5">
            {/* Vertical timeline connector */}
            <div className="absolute left-2.5 top-1.5 bottom-1.5 w-[2px] bg-gray-200 dark:bg-white/5" />

            {/* Step 1: Rider Accepted / Assigned */}
            {(() => {
              const isDone = ['preparing_order', 'dispatched', 'delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(order.status);
              const isActive = order.status === 'assigned';
              return (
                <div className="relative flex gap-3">
                  <div className={`absolute -left-[20px] top-0.5 w-2 h-2 rounded-full border-2 transition-all duration-300 ${
                    isDone ? 'bg-emerald-500 border-emerald-500 shadow-sm' :
                    isActive ? 'bg-[#00FF66] border-[#00FF66] ring-4 ring-emerald-500/20 animate-pulse' :
                    'bg-gray-300 dark:bg-gray-700 border-gray-300 dark:border-gray-750'
                  }`} />
                  <div className="space-y-0.5">
                    <p className={`text-xs font-black flex items-center gap-1 ${
                      isDone ? 'text-gray-500 dark:text-gray-400 line-through decoration-gray-400/30' :
                      isActive ? 'text-gray-900 dark:text-white font-extrabold' : 'text-gray-400'
                    }`}>
                      1. Rider Accepted & Heading to Mart
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />}
                    </p>
                    <p className="text-[10px] text-gray-450 dark:text-gray-400 leading-normal">
                      Rider is currently navigating to the store/mart location.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Step 2: Arrived at Mart */}
            {(() => {
              const isDone = ['dispatched', 'delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(order.status);
              const isActive = order.status === 'preparing_order';
              return (
                <div className="relative flex gap-3">
                  <div className={`absolute -left-[20px] top-0.5 w-2 h-2 rounded-full border-2 transition-all duration-300 ${
                    isDone ? 'bg-emerald-500 border-emerald-500 shadow-sm' :
                    isActive ? 'bg-[#00FF66] border-[#00FF66] ring-4 ring-emerald-500/20 animate-pulse' :
                    'bg-gray-300 dark:bg-gray-700 border-gray-300 dark:border-gray-750'
                  }`} />
                  <div className="space-y-0.5">
                    <p className={`text-xs font-black flex items-center gap-1 ${
                      isDone ? 'text-gray-500 dark:text-gray-400 line-through decoration-gray-400/30' :
                      isActive ? 'text-gray-900 dark:text-white font-extrabold' : 'text-gray-400'
                    }`}>
                      2. Arrived at Mart & Checking Items
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />}
                    </p>
                    <p className="text-[10px] text-gray-450 dark:text-gray-400 leading-normal">
                      Rider has arrived at Mart and is verifying checklist items.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Step 3: Out for Delivery */}
            {(() => {
              const isDone = ['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(order.status);
              const isActive = order.status === 'dispatched';
              return (
                <div className="relative flex gap-3">
                  <div className={`absolute -left-[20px] top-0.5 w-2 h-2 rounded-full border-2 transition-all duration-300 ${
                    isDone ? 'bg-emerald-500 border-emerald-500 shadow-sm' :
                    isActive ? 'bg-[#00FF66] border-[#00FF66] ring-4 ring-emerald-500/20 animate-pulse' :
                    'bg-gray-300 dark:bg-gray-700 border-gray-300 dark:border-gray-750'
                  }`} />
                  <div className="space-y-0.5">
                    <p className={`text-xs font-black flex items-center gap-1 ${
                      isDone ? 'text-gray-500 dark:text-gray-400 line-through decoration-gray-400/30' :
                      isActive ? 'text-gray-900 dark:text-white font-extrabold' : 'text-gray-400'
                    }`}>
                      3. Out for Delivery
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />}
                    </p>
                    <p className="text-[10px] text-gray-450 dark:text-gray-400 leading-normal">
                      Rider is carrying the items and is on the way to the customer's location.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Step 4: Delivered */}
            {(() => {
              const isDone = ['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(order.status);
              return (
                <div className="relative flex gap-3">
                  <div className={`absolute -left-[20px] top-0.5 w-2 h-2 rounded-full border-2 transition-all duration-300 ${
                    isDone ? 'bg-emerald-500 border-emerald-500 shadow-sm' :
                    'bg-gray-300 dark:bg-gray-700 border-gray-300 dark:border-gray-750'
                  }`} />
                  <div className="space-y-0.5">
                    <p className={`text-xs font-black flex items-center gap-1 ${
                      isDone ? 'text-emerald-500 font-extrabold' : 'text-gray-400'
                    }`}>
                      4. Delivered Successfully
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />}
                    </p>
                    <p className="text-[10px] text-gray-450 dark:text-gray-400 leading-normal">
                      Order successfully handed over to customer.
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Documents/Credentials section */}
      <div className="bg-gray-50/50 dark:bg-white/[0.01] rounded-xl border border-gray-100 dark:border-white/5 p-3 text-xs space-y-2">
        <span className="text-[10px] uppercase font-bold text-gray-450 flex items-center gap-1">
          <FileText className="w-3 h-3 text-emerald-500" />
          Captain Documents
        </span>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-[9px] text-gray-400 block">Aadhaar Number</span>
            <span className="font-semibold text-gray-750 dark:text-gray-300">
              {rider.aadhar_number ? `${rider.aadhar_number.slice(0, 4)}-${rider.aadhar_number.slice(4, 8)}-${rider.aadhar_number.slice(8)}` : 'Not Available'}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-gray-400 block">Driving License</span>
            <span className="font-semibold text-gray-750 dark:text-gray-300 uppercase">
              {rider.driving_license || 'Not Available'}
            </span>
          </div>
        </div>
      </div>

      {/* Payout for this Order */}
      <div className="bg-emerald-500/5 dark:bg-emerald-500/[0.02] rounded-xl border border-emerald-500/10 dark:border-emerald-500/25 p-3 text-xs space-y-2">
        <span className="text-[10px] uppercase font-black text-emerald-600 dark:text-[#00FF66] flex items-center gap-1">
          <Wallet className="w-3.5 h-3.5" />
          Payout for this Order
        </span>
        <div className="flex justify-between items-center">
          <div>
            <span className="font-bold text-gray-800 dark:text-gray-250 block">Rider Earnings</span>
            {payoutInfo.distance ? (
              <span className="text-[9px] text-gray-400">
                Calculated: Base ₹10 + {payoutInfo.distance.toFixed(2)} km (₹5/km)
              </span>
            ) : (
              <span className="text-[9px] text-gray-400">
                Calculated: Delivery Fee + ₹15 bonus
              </span>
            )}
          </div>
          <span className="text-base font-black text-emerald-600 dark:text-[#00FF66]">
            ₹{payoutInfo.payout.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Overall Wallet/Earnings Balance */}
      <div className="bg-blue-500/5 dark:bg-blue-500/[0.01] rounded-xl border border-blue-500/10 dark:border-blue-500/20 p-3 text-xs space-y-3">
        <span className="text-[10px] uppercase font-black text-blue-600 dark:text-blue-400 flex items-center gap-1">
          <Landmark className="w-3.5 h-3.5" />
          Rider Account Wallet Summary
        </span>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-[9px] text-gray-400 block">Total Earnings</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              ₹{totalEarnings.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-gray-400 block">Cash in Hand (COD Collects)</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
              ₹{cashInHand.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-150 dark:border-white/5 flex justify-between items-center">
          <span className="font-extrabold text-[10px] text-gray-500 uppercase">Settlement status</span>
          {netBalance >= 0 ? (
            <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">
              Pay Captain: ₹{netBalance.toFixed(2)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-650 dark:text-red-400 border border-red-500/25 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase animate-pulse">
              Collect Cash: ₹{Math.abs(netBalance).toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Live tracking coordinates */}
      {rider.current_lat && rider.current_long ? (
        <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-gray-550 dark:text-gray-450 text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />
            <div>
              <p className="font-extrabold">Live Location Available</p>
              <p className="text-[9px] text-gray-400 font-mono mt-0.5">
                {parseFloat(rider.current_lat).toFixed(5)}, {parseFloat(rider.current_long).toFixed(5)}
              </p>
            </div>
          </div>
          <a
            href={getRiderLocationUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border border-blue-500/20"
          >
            <ExternalLink className="w-3 h-3" />
            Track Live
          </a>
        </div>
      ) : (
        <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center gap-1.5 text-gray-400 text-[10px]">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>No active GPS signal from rider app yet.</span>
        </div>
      )}

      {/* Reassign captain option */}
      {isOrderActive && (
        <div className="pt-2 border-t border-gray-100 dark:border-white/5">
          <button
            type="button"
            onClick={() => setShowReassignList(!showReassignList)}
            className="w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-750 dark:text-gray-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border border-gray-200/50 dark:border-white/5 flex items-center justify-center gap-1"
          >
            {showReassignList ? 'Cancel Reassignment' : 'Reassign Captain'}
          </button>
          {showReassignList && renderOnlineRidersSection()}
        </div>
      )}
    </div>
  )
}

export default RiderAdmin
