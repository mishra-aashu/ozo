import React, { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useMartStore } from '../../stores/martStore'
import OptimizedImage from '../../components/OptimizedImage'
import {
  ShoppingBag,
  Clock,
  ArrowLeft,
  PackageCheck,
  Package,
  Check,
  ExternalLink,
  CheckCircle2,
  Bell,
  BellOff,
  Lock
} from 'lucide-react'

const getGoogleMapsUrl = (address, order) => {
  if (order && order.latitude && order.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`;
  }
  if (address && address.latitude && address.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${address.latitude},${address.longitude}`;
  }
  if (!address) return '';
  const addressParts = [
    address.address_line1,
    address.address_line2,
    address.city,
    address.state,
    address.pincode
  ].filter(Boolean);
  const addressString = addressParts.join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressString)}`;
};

const OrderSlaTimer = ({ createdAt }) => {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const calculateElapsed = () => {
      const ms = Date.now() - new Date(createdAt).getTime()
      setElapsed(Math.max(0, Math.floor(ms / 1000)))
    }

    calculateElapsed()
    const interval = setInterval(calculateElapsed, 1000)
    return () => clearInterval(interval)
  }, [createdAt])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  let colorClass = 'text-blue-600 dark:text-blue-500 bg-blue-50 dark:bg-blue-600/10 border border-blue-500/20 dark:border-blue-500/20'
  let isFlashing = false

  if (mins >= 10) {
    colorClass = 'text-ozo-red bg-ozo-red/10 dark:bg-ozo-red/20 border border-ozo-red/25'
    isFlashing = true
  } else if (mins >= 5) {
    colorClass = 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border border-amber-250 dark:border-amber-500/20'
  }

  return (
    <span className={`px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${colorClass} ${isFlashing ? 'animate-pulse' : ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full bg-current ${isFlashing ? 'animate-ping' : ''}`}></span>
      {mins}m {secs}s ago
    </span>
  )
}

const LiveOrdersView = () => {
  const {
    liveOrders,
    isLoadingOrders,
    toggleCheckItem,
    updateItemPackedQuantity,
    acceptOrder,
    packOrder,
    requestSelfDelivery,
    rejectOrder,
    cancelOrderItem,
    subscribeToOrders,
    unsubscribeFromOrders,
    fetchLiveOrders,
    currentMart
  } = useMartStore()

  // Local UI state
  const [activeSubTab, setActiveSubTab] = useState('incoming') // 'incoming', 'preparing', 'ready'
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [lastScannedItem, setLastScannedItem] = useState(null)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [itemToMarkUnavailable, setItemToMarkUnavailable] = useState(null)
  const scanFeedbackTimer = useRef(null)

  // Audio feedback chimes
  const playScanSuccessBeep = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      const osc1 = audioContext.createOscillator();
      const osc2 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      const gain2 = audioContext.createGain();

      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.50, audioContext.currentTime); // C6
      gain1.gain.setValueAtTime(0.08, audioContext.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.005, audioContext.currentTime + 0.08);

      osc1.start();
      osc1.stop(audioContext.currentTime + 0.08);

      setTimeout(() => {
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1318.51, audioContext.currentTime); // E6
        gain2.gain.setValueAtTime(0.08, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.005, audioContext.currentTime + 0.08);
        
        osc2.start();
        osc2.stop(audioContext.currentTime + 0.08);
      }, 75);
    } catch (err) {
      console.warn('Audio context success beep failed', err);
    }
  };

  const playScanWarningBeep = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160.00, audioContext.currentTime); // low buzz
      gain.gain.setValueAtTime(0.12, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, audioContext.currentTime + 0.35);

      osc.start();
      osc.stop(audioContext.currentTime + 0.35);
    } catch (err) {
      console.warn('Audio context warning beep failed', err);
    }
  };

  const playOrderCompleteChime = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, audioContext.currentTime);
          gain.gain.setValueAtTime(0.08, audioContext.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.005, audioContext.currentTime + 0.12);
          
          osc.start();
          osc.stop(audioContext.currentTime + 0.12);
        }, idx * 100);
      });
    } catch (err) {
      console.warn('Audio context complete chime failed', err);
    }
  };

  const handlePackOrder = async (orderId) => {
    await packOrder(orderId);
    setShowCompletionModal(false);
    setLastScannedItem(null);
  };

  // Filter orders by status
  const incomingOrders = liveOrders.filter(o => ['pending', 'placed', 'CONFIRMED_SYSTEM', 'confirmed'].includes(o.status))
  const preparingOrders = liveOrders.filter(o => o.status === 'preparing')
  const readyOrders = liveOrders.filter(o => o.status === 'packed')

  const getFilteredOrders = () => {
    switch (activeSubTab) {
      case 'incoming': return incomingOrders
      case 'preparing': return preparingOrders
      case 'ready': return readyOrders
      default: return []
    }
  }

  const filteredOrders = getFilteredOrders()
  const selectedOrder = liveOrders.find(o => o.id === selectedOrderId)

  // Real-time Subscription Lifecycle & Recovery (Smart Refresh)
  useEffect(() => {
    subscribeToOrders();

    const handleSync = () => {
      console.log('Re-syncing live orders due to focus/network change');
      fetchLiveOrders();
      unsubscribeFromOrders();
      subscribeToOrders();
    };

    window.addEventListener('online', handleSync);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleSync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubscribeFromOrders();
    };
  }, [currentMart, subscribeToOrders, unsubscribeFromOrders, fetchLiveOrders]);

  // Auto-select first order if none selected or if selected order is no longer in this list (Desktop only)
  useEffect(() => {
    const isDesktop = window.innerWidth >= 1024;
    if (filteredOrders.length > 0) {
      const exists = filteredOrders.some(o => o.id === selectedOrderId);
      if (!exists) {
        if (isDesktop) {
          setSelectedOrderId(filteredOrders[0].id);
        } else {
          setSelectedOrderId(null);
        }
      }
    } else {
      setSelectedOrderId(null);
    }
  }, [activeSubTab, liveOrders])

  // Scanner Keyboard Listener
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e) => {
      const target = e.target;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      ) {
        return;
      }

      if (
        activeSubTab !== 'preparing' || 
        !selectedOrder || 
        selectedOrder.status !== 'preparing'
      ) {
        return;
      }

      const currentTime = Date.now();

      if (barcodeBuffer.length > 0 && currentTime - lastKeyTime > 80) {
        barcodeBuffer = '';
      }

      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        const cleanBarcode = barcodeBuffer.trim();
        if (cleanBarcode.length >= 8) {
          e.preventDefault();
          e.stopPropagation();
          processScannedBarcode(cleanBarcode);
        }
        barcodeBuffer = '';
        return;
      }

      if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    const processScannedBarcode = async (barcode) => {
      const cleanBarcode = barcode.toLowerCase();

      const matchedItem = selectedOrder.order_items.find(item => {
        const itemBarcode = (item.barcode || item.products?.barcode || '').toString().trim().toLowerCase();
        return itemBarcode === cleanBarcode;
      });

      if (scanFeedbackTimer.current) {
        clearTimeout(scanFeedbackTimer.current);
      }

      if (matchedItem && matchedItem.is_cancelled) {
        setLastScannedItem({
          success: false,
          barcode: barcode,
          errorMsg: `"${matchedItem.product_name}" has been cancelled from this order.`
        });
        playScanWarningBeep();
        
        scanFeedbackTimer.current = setTimeout(() => {
          setLastScannedItem(null);
        }, 5000);
        return;
      }

      if (matchedItem) {
        const currentQty = matchedItem.packed_quantity || 0;
        const totalQty = matchedItem.quantity || 1;

        if (currentQty < totalQty) {
          const newQty = currentQty + 1;
          
          await updateItemPackedQuantity(selectedOrder.id, matchedItem.id, newQty);

          const isFullyPacked = newQty >= totalQty;

          setLastScannedItem({
            success: true,
            name: matchedItem.product_name,
            price: matchedItem.unit_price,
            quantity: matchedItem.quantity,
            packed_quantity: newQty,
            image: matchedItem.product_image,
            slug: matchedItem.product_slug,
            barcode: barcode,
            isCompleted: isFullyPacked
          });

          if (isFullyPacked) {
            playScanSuccessBeep();
          } else {
            try {
              const audioContext = new (window.AudioContext || window.webkitAudioContext)();
              const osc = audioContext.createOscillator();
              const gain = audioContext.createGain();
              osc.connect(gain);
              gain.connect(audioContext.destination);
              osc.type = 'sine';
              osc.frequency.setValueAtTime(1046.50, audioContext.currentTime); // C6
              gain.gain.setValueAtTime(0.08, audioContext.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.005, audioContext.currentTime + 0.1);
              osc.start();
              osc.stop(audioContext.currentTime + 0.1);
            } catch (err) {}
          }

          scanFeedbackTimer.current = setTimeout(() => {
            setLastScannedItem(null);
          }, 5000);

          const updatedItems = selectedOrder.order_items.map(item => 
            item.id === matchedItem.id 
              ? { ...item, checked: isFullyPacked, packed_quantity: newQty } 
              : item
          );
          
          if (updatedItems.filter(i => !i.is_cancelled).every(i => i.checked)) {
            setTimeout(() => {
              playOrderCompleteChime();
              setShowCompletionModal(true);
            }, 500);
          }

        } else {
          setLastScannedItem({
            success: false,
            barcode: barcode,
            errorMsg: `"${matchedItem.product_name}" is already fully packed (${totalQty}/${totalQty}).`
          });
          playScanWarningBeep();
          
          scanFeedbackTimer.current = setTimeout(() => {
            setLastScannedItem(null);
          }, 5000);
        }
      } else {
        setLastScannedItem({
          success: false,
          barcode: barcode,
          errorMsg: `Wrong Item! Barcode "${barcode}" does not match any item in this order.`
        });
        playScanWarningBeep();

        scanFeedbackTimer.current = setTimeout(() => {
          setLastScannedItem(null);
        }, 5000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (scanFeedbackTimer.current) clearTimeout(scanFeedbackTimer.current);
    };
  }, [activeSubTab, selectedOrderId, selectedOrder]);

  return (
    <div className="flex-1 flex overflow-hidden h-full pb-0">
      {/* Left Sidebar - Order Stages */}
      <div className={`w-full lg:w-[380px] border-r border-gray-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 ${selectedOrderId ? 'hidden lg:flex' : 'flex'}`}>
        {/* Tabs header */}
        <div className="grid grid-cols-3 border-b border-gray-200 dark:border-slate-800 p-2 bg-gray-50 dark:bg-slate-900/50">
          <button
            onClick={() => setActiveSubTab('incoming')}
            className={`py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex flex-col items-center gap-1.5 transition-all relative ${
              activeSubTab === 'incoming' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-600/10' : 'text-gray-750 dark:text-slate-300 hover:text-gray-955 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1">
              Incoming
              {incomingOrders.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-ozo-red animate-ping"></span>
              )}
            </span>
            <span className={`text-sm px-3 py-0.5 rounded-full font-black border transition-all ${
              incomingOrders.length > 0
                ? 'bg-ozo-red text-white border-ozo-red-dark shadow-md shadow-ozo-red/20 animate-pulse'
                : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50'
            }`}>
              {incomingOrders.length}
            </span>
            {activeSubTab === 'incoming' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-600"></span>}
          </button>

          <button
            onClick={() => setActiveSubTab('preparing')}
            className={`py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex flex-col items-center gap-1.5 transition-all relative ${
              activeSubTab === 'preparing' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-600/10' : 'text-gray-750 dark:text-slate-300 hover:text-gray-955 dark:hover:text-white'
            }`}
          >
            <span>Packing</span>
            <span className={`text-sm px-3 py-0.5 rounded-full font-black border transition-all ${
              preparingOrders.length > 0
                ? 'bg-ozo-red text-white border-ozo-red-dark shadow-md shadow-ozo-red/20 animate-pulse'
                : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50'
            }`}>
              {preparingOrders.length}
            </span>
            {activeSubTab === 'preparing' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-600"></span>}
          </button>

          <button
            onClick={() => setActiveSubTab('ready')}
            className={`py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex flex-col items-center gap-1.5 transition-all relative ${
              activeSubTab === 'ready' ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10' : 'text-gray-750 dark:text-slate-300 hover:text-gray-955 dark:hover:text-white'
            }`}
          >
            <span>Ready</span>
            <span className={`text-sm px-3 py-0.5 rounded-full font-black border transition-all ${
              readyOrders.length > 0
                ? 'bg-ozo-red text-white border-ozo-red-dark shadow-md shadow-ozo-red/20 animate-pulse'
                : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50'
            }`}>
              {readyOrders.length}
            </span>
            {activeSubTab === 'ready' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 dark:bg-amber-400"></span>}
          </button>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoadingOrders ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
              <p className="text-gray-555 text-sm">Loading active orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center px-4">
              <ShoppingBag className="w-10 h-10 text-gray-400 dark:text-slate-600 mb-2" />
              <p className="text-gray-800 dark:text-slate-300 font-bold">No orders in this stage</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">New customer orders will show up here in real-time.</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <button
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-300 flex flex-col gap-2.5 relative overflow-hidden group ${
                  selectedOrderId === order.id
                    ? 'bg-gray-100 dark:bg-slate-800 border-blue-500 dark:border-blue-500 shadow-lg shadow-blue-500/5'
                    : 'bg-white dark:bg-slate-800/60 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-350 dark:hover:border-slate-600'
                }`}
              >
                {activeSubTab === 'incoming' && (
                  <div className="absolute inset-0 bg-blue-500/2 opacity-[0.02] group-hover:opacity-[0.05] pointer-events-none"></div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-black text-gray-950 dark:text-slate-200">
                    #{order.order_number}
                  </span>
                  <div className="flex items-center gap-2">
                    <OrderSlaTimer createdAt={order.created_at} />
                    <span className="text-xs text-gray-650 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-gray-900 dark:text-slate-100">
                    {order.order_items.length} {order.order_items.length === 1 ? 'item' : 'items'}
                  </div>
                  <div className="text-sm font-black text-blue-600 dark:text-blue-400">
                    ₹{order.total.toFixed(2)}
                  </div>
                </div>

                <div className="text-xs text-gray-800 dark:text-slate-300 font-semibold truncate">
                  Deliver to: {['delivered', 'DELIVERED_VERIFYING', 'COMPLETED', 'cancelled', 'CANCELLED_BY_USER', 'RETURN_REQUESTED'].includes(order.status)
                    ? 'Ozo Customer'
                    : (order.user?.full_name || 'Ozo Customer')
                  } • {['delivered', 'DELIVERED_VERIFYING', 'COMPLETED', 'cancelled', 'CANCELLED_BY_USER', 'RETURN_REQUESTED'].includes(order.status)
                    ? 'Ozo Delivery'
                    : (order.address?.landmark || order.address?.city || 'Ozo Delivery')
                  }
                </div>

                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  ['pending', 'placed', 'CONFIRMED_SYSTEM', 'confirmed'].includes(order.status)
                    ? 'bg-ozo-red'
                    : order.status === 'preparing'
                    ? 'bg-blue-500'
                    : 'bg-amber-500 dark:bg-amber-400'
                }`}></div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Pane - Order Detail / Packing Checklist */}
      <div className={`flex-1 flex flex-col bg-gray-50 dark:bg-slate-900 overflow-hidden ${!selectedOrderId ? 'hidden lg:flex' : 'flex'}`}>
        {selectedOrder ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Detail Header */}
            <div className="p-4 md:p-6 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  onClick={() => setSelectedOrderId(null)}
                  className="lg:hidden flex-shrink-0 p-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-700 dark:text-slate-300 transition-colors cursor-pointer flex items-center justify-center"
                  title="Back to Orders List"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <h2 className="text-base sm:text-lg md:text-xl font-bold font-mono text-gray-955 dark:text-white truncate">Order #{selectedOrder.order_number}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      ['pending', 'placed', 'CONFIRMED_SYSTEM', 'confirmed'].includes(selectedOrder.status)
                        ? 'bg-ozo-red/10 border border-ozo-red/20 text-ozo-red'
                        : selectedOrder.status === 'preparing'
                        ? 'bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400'
                        : 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400'
                    }`}>
                      {['pending', 'placed', 'CONFIRMED_SYSTEM', 'confirmed'].includes(selectedOrder.status) ? 'Placed' : selectedOrder.status === 'preparing' ? 'Preparing' : 'Ready'}
                    </span>
                    <OrderSlaTimer createdAt={selectedOrder.created_at} />
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                    Received on {new Date(selectedOrder.created_at).toLocaleDateString()} at {new Date(selectedOrder.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col justify-between sm:justify-start items-center sm:items-end border-t sm:border-t-0 border-gray-100 dark:border-slate-700 pt-2.5 sm:pt-0 shrink-0">
                <p className="text-xs text-gray-500 dark:text-slate-400">Total Value</p>
                <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">₹{selectedOrder.total.toFixed(2)}</p>
              </div>
            </div>

            {/* Detail Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
              {/* Items & Packing Checklist (Left 3 columns) */}
              <div className="col-span-1 lg:col-span-3 flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">Packing Checklist</h3>
                    {selectedOrder.status === 'preparing' && (
                      <span className="ml-2 flex items-center gap-1.5 bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse border border-blue-100 dark:border-blue-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
                        Scanner Active
                      </span>
                    )}
                  </div>
                  {selectedOrder.status === 'preparing' && (
                    <span className="text-xs text-gray-800 dark:text-slate-300 font-bold">
                      {selectedOrder.order_items.filter(i => !i.is_cancelled && i.checked).length} of {selectedOrder.order_items.filter(i => !i.is_cancelled).length} items packed
                    </span>
                  )}
                </div>

                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                  {lastScannedItem && (
                    <div className={`p-4 transition-all duration-300 border-b ${
                      lastScannedItem.success 
                        ? 'bg-blue-600/10 border-blue-500/20 text-blue-905 dark:text-slate-100' 
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-900 dark:text-rose-100'
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-4">
                          {lastScannedItem.success && (
                            <OptimizedImage
                              src={lastScannedItem.image}
                              slug={lastScannedItem.slug}
                              alt={lastScannedItem.name}
                              width={60}
                              className="w-12 h-12 object-contain bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-1 flex-shrink-0"
                              containerClassName="w-12 h-12 flex-shrink-0"
                            />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                lastScannedItem.success 
                                  ? 'bg-blue-600/20 text-blue-600 dark:text-blue-400' 
                                  : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                              }`}>
                                {lastScannedItem.success ? 'Correct Scan' : 'Scan Mismatch'}
                              </span>
                              <span className="text-[10px] font-mono text-gray-500 dark:text-slate-400">
                                [{lastScannedItem.barcode}]
                              </span>
                            </div>
                            <p className="font-bold text-sm mt-1 leading-snug">
                              {lastScannedItem.success 
                                ? `${lastScannedItem.name} (${lastScannedItem.packed_quantity}/${lastScannedItem.quantity})`
                                : lastScannedItem.errorMsg
                              }
                            </p>
                            {lastScannedItem.success && (
                              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mt-0.5">
                                Price: ₹{lastScannedItem.price.toFixed(2)} | Packed Successfully
                              </p>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => setLastScannedItem(null)}
                          className="text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          <span className="text-lg">×</span>
                        </button>
                      </div>
                    </div>
                  )}
                  {selectedOrder.order_items.map(item => {
                    const isPreparing = selectedOrder.status === 'preparing'
                    const isCheckable = isPreparing && !item.is_cancelled

                    return (
                      <div 
                        key={item.id}
                        onClick={() => isCheckable && toggleCheckItem(selectedOrder.id, item.id)}
                        className={`p-4 flex items-center justify-between transition-all select-none ${
                          item.is_cancelled ? 'opacity-60 bg-ozo-red/[0.01]' :
                          isCheckable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700' : ''
                        } ${item.checked && !item.is_cancelled ? 'bg-blue-600/5 dark:bg-blue-600/5' : ''}`}
                      >
                        <div className="flex items-center gap-3 sm:gap-5 min-w-0 flex-1">
                          {isPreparing ? (
                            item.is_cancelled ? (
                              <div className="w-5 h-5 rounded bg-ozo-red/10 border border-ozo-red/30 flex items-center justify-center text-ozo-red flex-shrink-0">
                                <span className="text-[10px] font-bold">✕</span>
                              </div>
                            ) : item.checked ? (
                              <div className="w-5 h-5 rounded bg-blue-600 dark:bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
                                <Check className="w-4.5 h-4.5 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded border-2 border-gray-300 dark:border-slate-600 group-hover:border-gray-900 dark:group-hover:border-white transition-all flex-shrink-0"></div>
                            )
                          ) : (
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.is_cancelled ? 'bg-ozo-red' : 'bg-gray-400 dark:bg-slate-500'}`}></div>
                          )}

                          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                            <OptimizedImage
                              src={item.product_image}
                              slug={item.product_slug}
                              alt={item.product_name}
                              width={80}
                              className={`w-12 h-12 sm:w-16 sm:h-16 object-contain rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 flex-shrink-0 p-1 transition-all duration-300 hover:scale-[2.5] hover:z-10 hover:shadow-2xl relative cursor-zoom-in ${item.is_cancelled ? 'grayscale contrast-75' : ''}`}
                              containerClassName="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 rounded-xl sm:rounded-2xl overflow-hidden"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className={`font-bold text-xs sm:text-sm leading-snug break-words ${
                                  item.is_cancelled ? 'line-through text-ozo-red dark:text-red-400 font-medium' :
                                  item.checked ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-950 dark:text-slate-100'
                                }`}>
                                  {item.product_name}
                                </p>
                                {item.is_cancelled && (
                                  <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black bg-ozo-red/10 dark:bg-ozo-red/20 text-ozo-red dark:text-red-400 border border-ozo-red/20 dark:border-ozo-red/45 rounded-md uppercase tracking-wider scale-95 origin-left">
                                    Cancelled
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] sm:text-xs text-gray-600 dark:text-slate-400 font-semibold mt-1">
                                Unit Price: ₹{item.unit_price.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1 shrink-0 ml-2">
                          <span className={`text-xs sm:text-sm font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg border whitespace-nowrap shrink-0 ${
                            item.is_cancelled ? 'text-ozo-red/80 dark:text-red-400/80 bg-ozo-red/[0.03] border-ozo-red/20' :
                            item.checked ? 'text-gray-450 dark:text-slate-500 bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700' : 
                            'text-blue-600 dark:text-blue-400 bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                          }`}>
                            {item.is_cancelled ? 'Cancelled' : isPreparing ? `${item.packed_quantity || 0} / ${item.quantity}` : `QTY: ${item.quantity}`}
                          </span>
                          {!item.is_cancelled && (item.barcode || item.products?.barcode) && (
                            <span className="text-[9px] sm:text-[10px] font-mono text-gray-500 dark:text-slate-400 whitespace-nowrap">
                              {item.barcode || item.products?.barcode}
                            </span>
                          )}
                          {isPreparing && !item.is_cancelled && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToMarkUnavailable(item);
                              }}
                              className="mt-1.5 text-[9px] sm:text-[10px] font-black text-ozo-red hover:text-ozo-red-dark dark:text-red-400 dark:hover:text-red-300 bg-ozo-red/5 hover:bg-ozo-red/10 px-2 py-0.5 rounded border border-ozo-red/10 dark:border-ozo-red/20 transition-all cursor-pointer whitespace-nowrap"
                            >
                              Mark Unavailable
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Customer & Actions Column (Right 2 columns) */}
              <div className="col-span-1 lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col gap-4">
                  <h3 className="font-bold text-sm text-gray-600 dark:text-slate-350 uppercase tracking-wider pb-2 border-b border-gray-200 dark:border-slate-700">
                    Fulfillment Action
                  </h3>

                  {['placed', 'pending', 'CONFIRMED_SYSTEM', 'confirmed'].includes(selectedOrder.status) ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-650 dark:text-slate-400 leading-relaxed">
                        New order is waiting to be accepted. Loud notifications will ring until accepted.
                      </p>
                      <button
                        onClick={() => acceptOrder(selectedOrder.id)}
                        className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Accept Order
                      </button>
                      <button
                        onClick={() => {
                          setRejectReason('');
                          setShowRejectModal(true);
                        }}
                        className="w-full py-3.5 rounded-xl bg-ozo-red/10 hover:bg-ozo-red/20 text-ozo-red font-bold text-sm border border-ozo-red/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        ✕ Decline Order
                      </button>
                    </div>
                  ) : selectedOrder.status === 'preparing' ? (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-650 dark:text-slate-400">
                        Please verify and tick all items in the checklist on the left before sealing the bag.
                      </p>

                      {selectedOrder.order_items.filter(i => !i.is_cancelled).every(i => i.checked) ? (
                        <button
                          onClick={() => handlePackOrder(selectedOrder.id)}
                          className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-500/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <PackageCheck className="w-5 h-5" /> Mark Packed & Ready
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full py-4 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 font-bold text-sm border border-gray-200 dark:border-slate-600 cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Package className="w-5 h-5" /> Pack Checklist to Complete
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setRejectReason('');
                          setShowRejectModal(true);
                        }}
                        className="w-full py-3 rounded-xl bg-ozo-red/10 hover:bg-ozo-red/20 text-ozo-red font-bold text-xs border border-ozo-red/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        ✕ Cancel Entire Order
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl flex items-start gap-2.5">
                      <Clock className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p className="font-bold text-sm">Bag Sealed & Ready</p>
                        <p className="text-xs text-gray-800 dark:text-slate-350 font-semibold mt-1 leading-relaxed">
                          Waiting for OZO Rider to accept the broadcast and arrive at the store for pickup.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 space-y-4">
                  <h3 className="font-bold text-sm text-gray-600 dark:text-slate-300 uppercase tracking-wider pb-2 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between gap-2 flex-wrap">
                    <span>Delivery Information</span>
                    {selectedOrder.delivery_instructions?.includes('[SELF_DELIVERY_APPROVED]') ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 uppercase tracking-wider whitespace-nowrap">
                        Self-Delivery Approved
                      </span>
                    ) : selectedOrder.delivery_instructions?.includes('[SELF_DELIVERY_REQUESTED]') ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-wider animate-pulse whitespace-nowrap">
                        Self-Delivery Requested
                      </span>
                    ) : null}
                  </h3>

                  {/* Self-Delivery Request Button / Status */}
                  {selectedOrder.delivery_instructions?.includes('[SELF_DELIVERY_APPROVED]') ? (
                    <div className="p-3 bg-green-500/5 border border-green-500/15 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-xs font-bold text-green-500">Self-Delivery Approved</span>
                      </div>
                      <span className="text-[10px] text-green-600 font-extrabold uppercase">Details Unlocked</span>
                    </div>
                  ) : selectedOrder.delivery_instructions?.includes('[SELF_DELIVERY_REQUESTED]') ? (
                    <div className="p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
                        <span className="text-xs font-bold text-blue-500 dark:text-blue-400">Self-Delivery Requested</span>
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-slate-400 font-semibold uppercase animate-pulse">Waiting for Admin...</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => requestSelfDelivery(selectedOrder.id)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20 text-blue-500 font-bold text-xs border border-blue-500/20 hover:border-blue-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> Request Self-Delivery Details
                    </button>
                  )}
                  
                  {selectedOrder.delivery_instructions?.includes('[SELF_DELIVERY_APPROVED]') && 
                   !['delivered', 'DELIVERED_VERIFYING', 'COMPLETED', 'cancelled', 'CANCELLED_BY_USER', 'RETURN_REQUESTED'].includes(selectedOrder.status) ? (
                    <div className="space-y-3.5">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-slate-400 font-bold">Customer Name</p>
                        <p className="text-sm font-black text-gray-955 dark:text-white mt-0.5">{selectedOrder.user?.full_name || 'Ozo Customer'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-slate-400 font-bold">Contact Number</p>
                        <p className="text-sm font-black text-gray-955 dark:text-white mt-0.5 select-all">{selectedOrder.user?.phone || 'No phone provided'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-slate-400 font-bold">Delivery Address</p>
                        <p className="text-sm font-black text-gray-955 dark:text-white mt-0.5 leading-relaxed">
                          {selectedOrder.address && (selectedOrder.address.address_line1 || selectedOrder.address.city) ? (
                            <>
                              {selectedOrder.address.address_line1 && selectedOrder.address.address_line1.startsWith('Location Link: ') ? (
                                <>
                                  Location Link:{' '}
                                  <a
                                    href={selectedOrder.google_maps_url || selectedOrder.address.google_maps_url || selectedOrder.address.address_line1.replace('Location Link: ', '')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-ozo-red hover:underline break-all font-bold"
                                  >
                                    {selectedOrder.google_maps_url || selectedOrder.address.google_maps_url || selectedOrder.address.address_line1.replace('Location Link: ', '')}
                                  </a>
                                </>
                              ) : (
                                selectedOrder.address.address_line1
                              )}
                              {selectedOrder.address.address_line2 && `, ${selectedOrder.address.address_line2}`}
                              {(selectedOrder.address.city || selectedOrder.address.state || selectedOrder.address.pincode) && (
                                <>
                                  <br />
                                  {[selectedOrder.address.city, selectedOrder.address.state].filter(Boolean).join(', ')}
                                  {selectedOrder.address.pincode && ` - ${selectedOrder.address.pincode}`}
                                </>
                              )}
                            </>
                          ) : (
                            'Address not specified / Counter Pickup'
                          )}
                        </p>
                        {selectedOrder.address && (
                          <a 
                            href={getGoogleMapsUrl(selectedOrder.address, selectedOrder)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-600/10 hover:bg-blue-100 dark:hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg transition-colors mt-2"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View on Google Maps
                          </a>
                        )}
                      </div>
                      {selectedOrder.address?.landmark && (
                        <div className="p-3 bg-amber-50 dark:bg-[amber-500/5 border border-amber-200 dark:border-[amber-500/15 rounded-xl">
                          <p className="text-xs text-amber-700 dark:text-[amber-400 font-bold">Desi Landmark Address</p>
                          <p className="text-sm font-black text-amber-900 dark:text-[amber-400 mt-0.5">{selectedOrder.address.landmark}</p>
                        </div>
                      )}
                      {selectedOrder.delivery_instructions && 
                       selectedOrder.delivery_instructions.replace(/\[SELF_DELIVERY_APPROVED\]/gi, '').replace(/\[SELF_DELIVERY_REQUESTED\]/gi, '').trim().length > 0 && (
                        <div>
                          <p className="text-xs text-gray-600 dark:text-slate-400 font-bold">Special Instructions</p>
                          <p className="text-xs text-gray-900 dark:text-slate-200 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-transparent p-2 rounded-lg mt-1 italic font-semibold">
                            "{selectedOrder.delivery_instructions.replace(/\[SELF_DELIVERY_APPROVED\]/gi, '').replace(/\[SELF_DELIVERY_REQUESTED\]/gi, '').trim()}"
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-slate-400 font-bold">Customer Name</p>
                        <p className="text-sm font-black text-gray-955 dark:text-white mt-0.5">{selectedOrder.user?.full_name || 'Ozo Customer'}</p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-150 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-center py-6 gap-2">
                        <Lock className="w-6 h-6 text-gray-400 dark:text-slate-500 animate-pulse" />
                        <p className="text-xs font-bold text-gray-800 dark:text-slate-200">Customer Details Locked</p>
                        <p className="text-[10px] text-gray-500 dark:text-slate-405 max-w-[200px] leading-relaxed">
                          {['delivered', 'DELIVERED_VERIFYING', 'COMPLETED', 'cancelled', 'CANCELLED_BY_USER', 'RETURN_REQUESTED'].includes(selectedOrder.status)
                            ? 'Order is delivered/completed. Customer details are hidden for privacy.'
                            : selectedOrder.delivery_instructions?.includes('[SELF_DELIVERY_REQUESTED]') 
                            ? 'Request sent to Admin. Details will unlock as soon as Admin approves Self-Delivery.' 
                            : 'To deliver this order yourself, click the request button above to seek Admin approval.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-500 dark:text-slate-400">
            <ShoppingBag className="w-16 h-16 text-gray-400 dark:text-slate-600 mb-3" />
            <p className="text-lg font-bold text-gray-850 dark:text-slate-350">Select an order from the list</p>
            <p className="text-sm text-gray-500 mt-1">Use the left panel to select an active order to view packing details.</p>
          </div>
        )}
      </div>

      {showCompletionModal && selectedOrder && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 max-w-md w-full rounded-2xl p-6 shadow-2xl animate-scale-up text-center">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <PackageCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Order #{selectedOrder.order_number} Fully Packed!</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
              All items in the checklist have been successfully scanned and verified.
            </p>
            
            <div className="bg-gray-50 dark:bg-slate-900/50 border border-gray-250 dark:border-slate-700 rounded-xl p-3.5 my-5 text-left text-xs font-mono max-h-40 overflow-y-auto divide-y divide-gray-200 dark:divide-slate-700">
              {selectedOrder.order_items.filter(item => !item.is_cancelled).map(item => (
                <div key={item.id} className="py-1.5 flex items-center justify-between">
                  <span className="text-gray-800 dark:text-slate-350 truncate pr-4">{item.product_name}</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold shrink-0">{item.quantity} x QTY</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCompletionModal(false)}
                className="flex-1 py-3 border border-gray-200 dark:border-slate-750 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-850 dark:text-slate-300 text-sm font-bold rounded-xl transition-all cursor-pointer"
              >
                Keep Checklist Open
              </button>
              <button
                onClick={() => handlePackOrder(selectedOrder.id)}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 cursor-pointer"
              >
                Mark Packed & Ready
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && selectedOrder && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 max-w-md w-full rounded-2xl p-6 shadow-2xl animate-scale-up text-left">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {selectedOrder.status === 'preparing' ? `Cancel Order #${selectedOrder.order_number}` : `Reject Order #${selectedOrder.order_number}`}
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
              {selectedOrder.status === 'preparing' 
                ? 'Please select or enter a reason for cancelling this active order.' 
                : 'Please select or enter a reason for declining this incoming order.'}
            </p>

            <div className="space-y-2 mb-5">
              {[
                'Store closing / closed',
                'Products out of stock',
                'Too busy / high order volume',
                'Rider unavailable at location'
              ].map(reason => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setRejectReason(reason)}
                  className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    rejectReason === reason
                      ? 'bg-ozo-red/10 border border-ozo-red/35 text-ozo-red'
                      : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-350 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {reason}
                </button>
              ))}
              <input
                type="text"
                placeholder="Or enter custom reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:border-ozo-red focus:ring-1 focus:ring-ozo-red/20 rounded-xl px-4 py-3 text-xs font-semibold text-gray-900 dark:text-white placeholder-gray-450 outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="flex-1 py-3 border border-gray-200 dark:border-slate-750 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-880 dark:text-slate-300 text-sm font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!rejectReason.trim()) {
                    toast.error('Please enter or select a rejection reason');
                    return;
                  }
                  const success = await rejectOrder(selectedOrder.id, rejectReason);
                  if (success) {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setSelectedOrderId(null);
                  }
                }}
                className="flex-1 py-3 bg-ozo-red hover:bg-ozo-red-dark text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-ozo-red/15 hover:shadow-ozo-red/25 cursor-pointer"
              >
                {selectedOrder.status === 'preparing' ? 'Confirm Cancel' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}

      {itemToMarkUnavailable && selectedOrder && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 max-w-md w-full rounded-2xl p-6 shadow-2xl animate-scale-up text-left">
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">Mark Item Unavailable?</h3>
            <p className="text-sm text-gray-650 dark:text-slate-400 mb-6 leading-relaxed">
              Are you sure you want to mark <span className="font-extrabold text-ozo-red dark:text-red-400">"{itemToMarkUnavailable.product_name}"</span> as unavailable? This will remove it from the order checklist and update the total amount.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setItemToMarkUnavailable(null)}
                className="flex-1 py-3 border border-gray-200 dark:border-slate-750 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-300 text-sm font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await cancelOrderItem(selectedOrder.id, itemToMarkUnavailable.id);
                  setItemToMarkUnavailable(null);
                }}
                className="flex-1 py-3 bg-ozo-red hover:bg-ozo-red-dark text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-ozo-red/15 hover:shadow-ozo-red/25 cursor-pointer"
              >
                Confirm Unavailable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LiveOrdersView
