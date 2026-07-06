import React, { useState, useEffect, useRef } from 'react'
import { supabaseAdmin, supabase } from '../../lib/supabase'
import QRCode from 'react-qr-code'
import {
  Smartphone,
  Camera,
  QrCode,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Play,
  ArrowRight,
  Search,
  Image as ImageIcon,
  Loader2,
  Trash2,
  RotateCcw,
  Sparkles,
  Link,
  SmartphoneNfc
} from 'lucide-react'
import toast from 'react-hot-toast'

// Mock high-quality grocery images for simulation
const MOCK_PHOTOS = [
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80', // Front View
  'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600&auto=format&fit=crop&q=80', // Back Label
  'https://images.unsplash.com/photo-1595079676339-1534801ad6cf?w=600&auto=format&fit=crop&q=80'  // Barcode / MRP
]

export default function PhoneCaptureSandbox() {
  const [marts, setMarts] = useState([])
  const [products, setProducts] = useState([])
  const [selectedMartId, setSelectedMartId] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [customBarcode, setCustomBarcode] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [activeSession, setActiveSession] = useState(null)
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [simulating, setSimulating] = useState(false)

  // Realtime subscription reference
  const subscriptionRef = useRef(null)

  // 1. Fetch Marts and Products on Mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        // Fetch Marts
        const { data: martsData } = await supabaseAdmin
          .from('marts')
          .select('id, name, slug')
          .order('name')
        
        setMarts(martsData || [])
        if (martsData && martsData.length > 0) {
          setSelectedMartId(martsData[0].id)
        }

        // Fetch Products (top 15 for quick select)
        const { data: productsData } = await supabaseAdmin
          .from('products')
          .select('id, name, brand, barcode, image_url')
          .not('barcode', 'is', null)
          .limit(30)
        
        setProducts(productsData || [])
      } catch (err) {
        console.error('Failed to load sandbox options:', err)
        toast.error('Failed to load marts or products')
      } finally {
        setLoading(false)
      }
    }
    loadData()

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [])

  // 2. Subscribe to Active Capture Session Database Changes
  const subscribeToSession = (sessId) => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
    }

    const channel = supabase
      .channel(`sandbox-session-${sessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'capture_sessions',
          filter: `session_id=eq.${sessId}`
        },
        (payload) => {
          console.log('[Sandbox Realtime] Session change received:', payload)
          if (payload.new) {
            setActiveSession(payload.new)
            
            // Show toast feedback on status changes
            if (payload.old && payload.old.status !== payload.new.status) {
              toast.success(`Session status changed to: ${payload.new.status.toUpperCase()}`, {
                icon: '🔄'
              })
            }
          }
        }
      )
      .subscribe()

    subscriptionRef.current = channel
  }

  // 3. Create Capture Session
  const handleCreateSession = async () => {
    if (!selectedMartId) {
      toast.error('Please select a Mart context first')
      return
    }

    setCreating(true)
    try {
      let barcodeVal = customBarcode.trim()
      let productIdVal = selectedProductId || null

      if (selectedProductId) {
        const selectedProd = products.find(p => p.id === selectedProductId)
        if (selectedProd && !barcodeVal) {
          barcodeVal = selectedProd.barcode
        }
      }

      if (!barcodeVal && !productIdVal) {
        barcodeVal = 'TEST-' + Math.floor(100000 + Math.random() * 900000)
      }

      const { data: sess, error: err } = await supabaseAdmin
        .from('capture_sessions')
        .insert({
          barcode: barcodeVal || null,
          product_id: productIdVal,
          mart_id: selectedMartId,
          status: 'waiting',
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 mins
        })
        .select()
        .single()

      if (err) throw err

      setActiveSession(sess)
      subscribeToSession(sess.session_id)
      toast.success('Test Capture Session generated successfully!')
    } catch (err) {
      console.error('Create session error:', err)
      toast.error('Failed to create session: ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  // 4. Force status change manually (Simulation)
  const handleUpdateStatus = async (newStatus) => {
    if (!activeSession) return
    try {
      const { error: err } = await supabaseAdmin
        .from('capture_sessions')
        .update({ status: newStatus })
        .eq('session_id', activeSession.session_id)

      if (err) throw err
      toast.success(`Simulated session status: ${newStatus}`)
    } catch (err) {
      toast.error('Simulation update failed: ' + err.message)
    }
  }

  // 5. Force upload mock photos manually
  const handlePushMockPhoto = async (index) => {
    if (!activeSession) return
    setSimulating(true)
    try {
      const currentPhotos = activeSession.photos ? [...activeSession.photos] : [null, null, null]
      currentPhotos[index] = MOCK_PHOTOS[index]

      // Determine new status based on photos
      let newStatus = 'uploading'
      const completedAll = currentPhotos[0] && currentPhotos[1] && currentPhotos[2]
      if (completedAll) {
        newStatus = 'completed'
      }

      const { error: err } = await supabaseAdmin
        .from('capture_sessions')
        .update({
          photos: currentPhotos,
          status: newStatus
        })
        .eq('session_id', activeSession.session_id)

      if (err) throw err
      toast.success(`Photo ${index + 1} synchronized to session!`)

      // If completed, trigger verification queue mock status inside products table
      if (completedAll && activeSession.product_id) {
        await supabaseAdmin
          .from('products')
          .update({
            verification_status: 'pending',
            pending_images: currentPhotos,
            enriched_by_mart_id: activeSession.mart_id
          })
          .eq('id', activeSession.product_id)
        
        toast.success('Product updated to pending verification queue!')
      }
    } catch (err) {
      toast.error('Photo simulation failed: ' + err.message)
    } finally {
      setSimulating(false)
    }
  }

  // 6. Reset current session photos
  const handleResetPhotos = async () => {
    if (!activeSession) return
    try {
      const { error: err } = await supabaseAdmin
        .from('capture_sessions')
        .update({
          photos: [null, null, null],
          status: 'waiting'
        })
        .eq('session_id', activeSession.session_id)

      if (err) throw err
      toast.success('Session reset to waiting status with empty photos.')
    } catch (err) {
      toast.error('Reset failed: ' + err.message)
    }
  }

  const handleCopyLink = () => {
    if (!activeSession) return
    const url = `${window.location.origin}/capture/${activeSession.session_id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Mobile Capture link copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const captureUrl = activeSession
    ? `${window.location.origin}/capture/${activeSession.session_id}`
    : ''

  // Filter products by search query
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchQuery))
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-4">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium">
        <div>
          <div className="flex items-center gap-2 text-ozo-red dark:text-rose-400 font-black text-xs uppercase tracking-widest mb-1">
            <SmartphoneNfc className="w-4.5 h-4.5" />
            Developer Tools
          </div>
          <h1 className="text-3xl font-black text-gradient font-sans">Phone Capture Sandbox</h1>
          <p className="text-sm text-ozo-gray mt-1 font-sans">
            Simulate and test the live mobile scan capture UI, database state synchronization, and realtime updates.
          </p>
        </div>
        {activeSession && (
          <button
            onClick={() => {
              if (subscriptionRef.current) {
                supabase.removeChannel(subscriptionRef.current)
              }
              setActiveSession(null)
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-all font-sans"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Start New Test
          </button>
        )}
      </div>

      {!activeSession ? (
        /* Create Session Wizard */
        <div className="max-w-2xl mx-auto bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 p-8 shadow-premium space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <QrCode className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold font-sans">Generate Capture Test Session</h2>
            <p className="text-xs text-ozo-gray font-sans">Configure session context details to simulate register dashboard state.</p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <Loader2 className="w-8 h-8 text-ozo-red animate-spin" />
              <p className="text-xs text-gray-400 font-sans">Loading marts and products...</p>
            </div>
          ) : (
            <div className="space-y-4 font-sans">
              {/* Mart Select */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">1. Target Mart Context</label>
                <select
                  value={selectedMartId}
                  onChange={(e) => setSelectedMartId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-ozo-red font-semibold"
                >
                  <option value="" disabled>Select Mart</option>
                  {marts.map(m => (
                    <option key={m.id} value={m.id} className="dark:bg-[#1a1a1a]">{m.name} ({m.slug})</option>
                  ))}
                </select>
              </div>

              {/* Product Select */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">2. Associated Catalog Product (Optional)</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value)
                    const selected = products.find(p => p.id === e.target.value)
                    if (selected) {
                      setCustomBarcode(selected.barcode || '')
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-ozo-red font-semibold"
                >
                  <option value="">-- No specific product (simulate barcode scan) --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} className="dark:bg-[#1a1a1a]">{p.brand ? `[${p.brand}] ` : ''}{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Barcode input */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">3. Custom Barcode</label>
                <input
                  type="text"
                  placeholder="Enter barcode digits (e.g. 8901030022201)"
                  value={customBarcode}
                  onChange={(e) => setCustomBarcode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-ozo-red font-semibold"
                />
                <p className="text-[10px] text-gray-500 font-medium">Leave empty to auto-generate a random mock barcode.</p>
              </div>

              {/* Submit */}
              <button
                onClick={handleCreateSession}
                disabled={creating}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-ozo text-white py-3.5 rounded-xl font-bold shadow-ozo hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Session...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    Start Simulation Session
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Split view: Operator Console VS Phone Mockup */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start font-sans">
          {/* LEFT PANEL: Operator Controls & Console (xl:span-7) */}
          <div className="xl:col-span-7 space-y-6">
            {/* Session Card */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-white/5">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Capture Session ID</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-sm">
                      {activeSession.session_id}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeSession.session_id)
                        toast.success('Session ID copied')
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Realtime Connection Status badge */}
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Live DB Status</span>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        activeSession.status === 'completed'
                          ? 'bg-emerald-400'
                          : activeSession.status === 'joined'
                            ? 'bg-blue-400'
                            : activeSession.status === 'uploading'
                              ? 'bg-amber-400'
                              : 'bg-rose-400 animate-pulse'
                      }`}></span>
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        activeSession.status === 'completed'
                          ? 'bg-emerald-500'
                          : activeSession.status === 'joined'
                            ? 'bg-blue-500'
                            : activeSession.status === 'uploading'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                      }`}></span>
                    </span>
                    <span className="text-xs font-black uppercase tracking-wider bg-gray-50 dark:bg-white/5 px-2.5 py-1 rounded-full text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-white/5">
                      {activeSession.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* QR and Launch Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Operator QR View */}
                <div className="p-4 bg-gray-50 dark:bg-[#141414] rounded-2xl border border-gray-200/50 dark:border-white/5 flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden">
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-rose-500/10 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-rose-500 border border-rose-500/20">
                    <QrCode className="w-3 h-3" />
                    Live QR Code
                  </div>
                  
                  <div className="p-3 bg-white rounded-xl shadow-md mt-2 border border-gray-100">
                    <QRCode value={captureUrl} size={130} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 font-bold leading-normal">
                      Scan QR code on physical mobile device to test camera hardware.
                    </p>
                  </div>
                </div>

                {/* Info & External Launch Link */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-gray-400 uppercase">Product details</div>
                    <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 space-y-1">
                      <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate">
                        {activeSession.barcode || 'NO BARCODE'}
                      </p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">
                        Associated Mart ID: {activeSession.mart_id.substring(0, 18)}...
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleCopyLink}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold transition-all"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      Copy Link
                    </button>
                    <a
                      href={captureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/15 text-rose-500 border border-rose-500/20 px-4 py-3 rounded-xl text-xs font-bold transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in New Tab
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated actions panel */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-500 border-b border-gray-100 dark:border-white/5 pb-3">
                <Sparkles className="w-4.5 h-4.5" />
                Real-time Database Simulators
              </div>
              <p className="text-xs text-gray-400 leading-normal font-sans">
                Click the buttons below to force change values in the Database table. You will see the changes instantly sync to the phone iframe mockup on the right side via Real-time websockets.
              </p>

              {/* Status Simulation Group */}
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">A. Modify Session Status</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['waiting', 'joined', 'uploading', 'completed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(status)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold uppercase border tracking-wider transition-all ${
                        activeSession.status === status
                          ? 'bg-rose-500 text-white border-rose-600'
                          : 'bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photos Simulation Group */}
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400">B. Simulate Syncing Images</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {['1. Front View', '2. Back View', '3. MRP / Barcode'].map((label, idx) => {
                    const hasPhoto = activeSession.photos && activeSession.photos[idx]
                    return (
                      <button
                        key={idx}
                        onClick={() => handlePushMockPhoto(idx)}
                        disabled={simulating}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs text-left font-bold transition-all ${
                          hasPhoto
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                            : 'bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 border-gray-200 dark:border-white/10'
                        }`}
                      >
                        <div className="space-y-0.5 text-sans">
                          <div>{label}</div>
                          <div className="text-[9px] text-gray-500 uppercase font-black">
                            {hasPhoto ? 'Synced' : 'No image'}
                          </div>
                        </div>
                        {hasPhoto ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Clear and Reset */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleResetPhotos}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 px-4 py-3 rounded-xl text-xs font-black text-gray-700 dark:text-gray-300 transition-all border border-transparent dark:border-white/5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear Mock Images
                </button>
              </div>
            </div>

            {/* Realtime Live Feed Preview */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 p-6 shadow-sm space-y-4">
              <div className="text-xs font-black uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-white/5 pb-3 flex items-center justify-between">
                <span>Realtime Photos Feed</span>
                <span className="text-[10px] text-gray-500">Live view of uploads</span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map((idx) => {
                  const url = activeSession.photos?.[idx]
                  return (
                    <div
                      key={idx}
                      className="aspect-square bg-gray-50 dark:bg-[#141414] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden relative flex items-center justify-center group"
                    >
                      {url ? (
                        <>
                          <img
                            src={url}
                            alt={`Photo ${idx + 1}`}
                            className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-300"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-white text-black p-2 rounded-full shadow-lg"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-2 text-center text-gray-500">
                          <ImageIcon className="w-6 h-6 text-gray-300 dark:text-gray-700 mb-1" />
                          <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">Step {idx + 1}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Smartphone Frame Mockup (xl:span-5) */}
          <div className="xl:col-span-5 flex flex-col items-center">
            <div className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              Live Phone Mockup Frame
            </div>
            
            {/* Phone Body Wrapper */}
            <div className="relative mx-auto w-[360px] h-[720px] rounded-[52px] border-[12px] border-slate-900 dark:border-[#222] bg-[#0c0f16] shadow-premium overflow-hidden ring-8 ring-slate-800/20 select-none">
              
              {/* Dynamic Island / Notch */}
              <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-28 h-6.5 bg-black rounded-full z-30 flex items-center justify-center shadow-inner">
                {/* camera lens light */}
                <div className="absolute right-4 w-2 h-2 rounded-full bg-slate-900 border border-slate-800/40" />
              </div>

              {/* Mobile Screen Status Bar */}
              <div className="absolute top-0 inset-x-0 h-10 px-6 flex items-center justify-between text-[11px] font-black text-white z-20 pointer-events-none select-none bg-gradient-to-b from-black/30 to-transparent">
                <span>9:41 AM</span>
                <div className="flex items-center gap-1.5">
                  {/* Signal bars */}
                  <div className="flex items-end gap-0.5 h-2">
                    <div className="w-0.5 h-1 bg-white rounded-full" />
                    <div className="w-0.5 h-1.5 bg-white rounded-full" />
                    <div className="w-0.5 h-2 bg-white rounded-full" />
                    <div className="w-0.5 h-2 bg-white rounded-full opacity-40" />
                  </div>
                  {/* Wifi */}
                  <span className="font-bold">5G</span>
                  {/* Battery */}
                  <div className="w-5 h-2.5 rounded-md border border-white/60 p-0.5 flex items-center">
                    <div className="w-full h-full bg-white rounded-[2px]" />
                  </div>
                </div>
              </div>

              {/* Smartphone Screen Iframe Wrapper */}
              <div className="w-full h-full pt-10 pb-4 overflow-hidden relative">
                {activeSession ? (
                  <iframe
                    src={captureUrl}
                    title="Mobile Camera Mockup Viewport"
                    className="w-full h-full border-0 select-text"
                    allow="camera; microphone; display-capture; geolocation"
                    style={{ background: "#020617" }}
                  />
                ) : (
                  <div className="w-full h-full bg-[#020617] flex flex-col items-center justify-center p-6 text-center text-gray-500">
                    <AlertCircle className="w-8 h-8 text-rose-500 animate-pulse mb-3" />
                    <p className="text-xs font-semibold text-gray-400">Waiting for active capture session...</p>
                  </div>
                )}
              </div>

              {/* iPhone Home Pill Bar */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/40 hover:bg-white/80 transition-colors rounded-full z-30 pointer-events-none" />
            </div>

            {/* Note regarding Iframe camera access */}
            <div className="text-[10px] text-gray-500 max-w-sm text-center mt-3 font-semibold leading-normal">
              💡 <b>Camera Note:</b> Most browsers require HTTPS or localhost origin to grant camera access inside an iframe. If camera doesn't start, please click the <b>Upload Image</b> fallback in the phone viewport or use the database simulation buttons.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
