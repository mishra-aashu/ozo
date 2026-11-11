import React, { useState, useEffect } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Upload, FileText, Building2, ShieldCheck, MapPin, 
  Truck, CheckCircle, AlertCircle, Clock, ShoppingBag, X, Phone, User
} from 'lucide-react'
import { useCareStore } from '../../stores/careStore'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

export default function OrderMedicines() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { 
    pharmacies, 
    fetchPharmacies, 
    uploadPrescriptionImage, 
    createMedicineOrder,
    myMedicineOrders,
    fetchMyMedicineOrders,
    themeConfig, 
    applyThemeVariables 
  } = useCareStore()

  // Preselected Rx passed via navigate state
  const preselectedRx = location.state?.preselectedRx || null

  const [orderMode, setOrderMode] = useState(preselectedRx ? 'digital_rx' : 'upload') // 'upload' | 'digital_rx'
  const [rxImageFile, setRxImageFile] = useState(null)
  const [rxImageUrl, setRxImageUrl] = useState('')
  const [isUploadingRx, setIsUploadingRx] = useState(false)

  // Selection & Details
  const [selectedPharmacyId, setSelectedPharmacyId] = useState('')
  const [patientName, setPatientName] = useState(user?.user_metadata?.full_name || '')
  const [patientPhone, setPatientPhone] = useState(user?.phone || user?.user_metadata?.phone || '')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [patientNotes, setPatientNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderConfirmed, setOrderConfirmed] = useState(null)

  useEffect(() => {
    applyThemeVariables()
    fetchPharmacies().then((stores) => {
      if (stores && stores.length > 0 && !selectedPharmacyId) {
        setSelectedPharmacyId(stores[0].id)
      }
    })
    const defaultPhone = user?.phone || user?.user_metadata?.phone || ''
    if (defaultPhone) {
      fetchMyMedicineOrders(defaultPhone)
    }
  }, [user])

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, JPEG)')
      return
    }

    setRxImageFile(file)
    setIsUploadingRx(true)
    const toastId = toast.loading('Uploading Prescription to Secure Cloud...')

    const uploadedUrl = await uploadPrescriptionImage(file)
    setIsUploadingRx(false)

    if (uploadedUrl) {
      setRxImageUrl(uploadedUrl)
      toast.success('Prescription image attached successfully!', { id: toastId })
    } else {
      toast.error('Failed to upload image. Please try again.', { id: toastId })
    }
  }

  const handleOrderSubmit = async (e) => {
    e.preventDefault()

    if (orderMode === 'upload' && !rxImageUrl) {
      toast.error('Please upload your prescription image first')
      return
    }
    if (orderMode === 'digital_rx' && !preselectedRx) {
      toast.error('No digital prescription selected')
      return
    }
    if (!selectedPharmacyId) {
      toast.error('Please select a verified local chemist store')
      return
    }
    if (!patientPhone.trim() || patientPhone.trim().length < 10) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }
    if (!deliveryAddress.trim()) {
      toast.error('Please enter delivery address')
      return
    }

    setIsSubmitting(true)

    const payload = {
      customer_id: user?.id || null,
      pharmacy_id: selectedPharmacyId,
      prescription_id: orderMode === 'digital_rx' ? preselectedRx.id : null,
      prescription_image_url: orderMode === 'upload' ? rxImageUrl : null,
      patient_name: patientName.trim() || 'Patient',
      customer_phone: patientPhone.trim(),
      delivery_address: deliveryAddress.trim(),
      notes: patientNotes.trim() || null,
      estimated_amount: 0,
      delivery_fee: 0, // Free 30-min delivery offer
      order_status: 'rx_review'
    }

    const res = await createMedicineOrder(payload)
    setIsSubmitting(false)

    if (res) {
      setOrderConfirmed(res)
      fetchMyMedicineOrders(patientPhone.trim())
    }
  }

  const getOrderStatusText = (status) => {
    switch (status) {
      case 'rx_review':
        return { label: 'Pharmacist Reviewing Rx', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' }
      case 'rx_verified':
        return { label: 'Rx Verified & Billing Ready', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' }
      case 'packing':
        return { label: 'Packing Medicines', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' }
      case 'ready_for_pickup':
        return { label: 'Ready for Rider Pickup', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' }
      case 'out_for_delivery':
        return { label: 'Out for 30-min Delivery', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300' }
      case 'delivered':
        return { label: 'Delivered', color: 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300' }
      default:
        return { label: status, color: 'bg-slate-100 text-slate-700' }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      {/* Top Navbar */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link 
            to="/care"
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Care
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" /> Licensed Chemists Form 20/21
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Banner */}
        <div className="mb-8 rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-600 to-teal-700 text-white relative overflow-hidden shadow-lg">
          <div className="relative z-10 max-w-2xl">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 uppercase tracking-wider backdrop-blur-sm">
              ⚡ 30-Min Local Chemist Delivery
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-3">
              Order Medicines with Verified Prescription
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 mt-2 leading-relaxed">
              Upload your doctor's prescription or attach your OzoCare e-Rx. Dispensed exclusively by certified retail pharmacies with authentic batch bills.
            </p>
          </div>
          <div className="absolute right-6 -bottom-6 opacity-15 hidden sm:block">
            <ShoppingBag className="w-48 h-48" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Order Flow */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleOrderSubmit} className="space-y-6">
              {/* Step 1: Prescription Selection */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Step 1: Attach Valid Prescription
                </h2>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <button
                    type="button"
                    onClick={() => setOrderMode('upload')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                      orderMode === 'upload'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Upload className="w-4 h-4" /> Upload Rx Photo
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderMode('digital_rx')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                      orderMode === 'digital_rx'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <FileText className="w-4 h-4" /> Use OzoCare e-Rx
                  </button>
                </div>

                {orderMode === 'upload' ? (
                  <div>
                    {!rxImageUrl ? (
                      <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/40">
                        <Upload className="w-10 h-10 text-slate-400 mb-2" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {isUploadingRx ? 'Uploading to secure cloud...' : 'Click to Upload Prescription Photo / Slip'}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1">
                          PNG, JPG up to 10MB • Clear doctor signature & date
                        </span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileChange}
                          disabled={isUploadingRx}
                          className="hidden" 
                        />
                      </label>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4" /> Prescription Attached
                          </span>
                          <button
                            type="button"
                            onClick={() => { setRxImageUrl(''); setRxImageFile(null) }}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <img 
                          src={rxImageUrl} 
                          alt="Uploaded prescription" 
                          className="w-full max-h-56 object-contain rounded-xl bg-black/5 dark:bg-black/40"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {preselectedRx ? (
                      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            Dr. {preselectedRx.care_doctors?.full_name || 'Consultation Rx'}
                          </span>
                          <span className="text-[11px] font-mono text-emerald-600">
                            Ref: {preselectedRx.id?.slice(0, 8)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                          Diagnosis: {preselectedRx.diagnosis || 'Clinical Prescription'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {preselectedRx.medicines?.length || 0} prescribed medicines will be dispensed.
                        </p>
                      </div>
                    ) : (
                      <div className="p-6 text-center border border-slate-200 dark:border-slate-800 rounded-2xl">
                        <p className="text-xs text-slate-500">
                          No e-Rx selected yet. You can book an appointment first or choose "Upload Rx Photo" above.
                        </p>
                        <Link 
                          to="/care/my-appointments"
                          className="mt-3 inline-block text-xs font-bold text-emerald-600 hover:underline"
                        >
                          Select from My Appointments →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Select Local Chemist */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Step 2: Choose Verified Retail Chemist
                </h2>

                <div className="space-y-3">
                  {pharmacies.map((store) => (
                    <label 
                      key={store.id}
                      className={`p-4 rounded-xl border flex items-start gap-4 cursor-pointer transition-all ${
                        selectedPharmacyId === store.id
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="pharmacy"
                        checked={selectedPharmacyId === store.id}
                        onChange={() => setSelectedPharmacyId(store.id)}
                        className="mt-1 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {store.store_name}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> 30-45 Mins
                          </span>
                        </div>
                        <p className="text-slate-500 mt-0.5">{store.address}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-600 dark:text-slate-300">
                            Drug Lic: {store.drug_license_number || 'Form 20/21'}
                          </span>
                          <span className="text-slate-400">
                            Pharmacist: {store.registered_pharmacist_name || 'Verified Chemist'}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Step 3: Delivery Address & Details */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Step 3: Delivery Details
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Patient / Contact Person *
                    </label>
                    <input 
                      type="text"
                      placeholder="Full Name"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Mobile Number (for Chemist & Rider) *
                    </label>
                    <input 
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Complete Delivery Address *
                  </label>
                  <textarea 
                    rows={2}
                    placeholder="House/Flat No, Landmark, Sector, City"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Special Instructions (Optional)
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Call before ringing bell, send generic substitutes if approved"
                    value={patientNotes}
                    onChange={(e) => setPatientNotes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Statutory Mediation Notice */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 leading-relaxed border border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                    🛡️ Regulatory Compliance (Drugs & Cosmetics Act)
                  </span>
                  Ozo acts exclusively as an intermediary aggregator and delivery logistics partner. Medicines are billed, packed, and sold directly by the chosen licensed retail chemist holding valid Form 20/21 licenses. Schedule H/X medications require physical Rx inspection upon delivery.
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm shadow-lg transition-all transform active:scale-95 disabled:opacity-50"
                  style={{
                    backgroundColor: themeConfig?.primary || '#059669',
                    boxShadow: `0 8px 20px ${themeConfig?.primary_glow || 'rgba(5, 150, 105, 0.35)'}`
                  }}
                >
                  {isSubmitting ? 'Routing to Licensed Chemist...' : 'Send Prescription to Chemist (Free 30-Min Delivery)'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Active & Past Orders */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Live Medicine Deliveries
            </h3>

            {myMedicineOrders.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                No medicine orders yet. Submit your prescription on the left to order from nearby chemists.
              </div>
            ) : (
              myMedicineOrders.map((ord) => {
                const statusMeta = getOrderStatusText(ord.order_status)
                return (
                  <div 
                    key={ord.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {ord.order_number}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusMeta.color}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {ord.care_pharmacies?.store_name || 'Local Chemist'}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{ord.delivery_address}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-slate-400">Delivery Status:</span>
                      <span className="font-bold text-emerald-600">30-Min Express Dispatch</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {orderConfirmed && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4">
              <CheckCircle className="w-9 h-9" />
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Prescription Transmitted!
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              Order #{orderConfirmed.order_number}
            </p>

            <p className="text-xs text-slate-600 dark:text-slate-300 mt-4 leading-relaxed">
              Your prescription has been forwarded to <strong>{orderConfirmed.care_pharmacies?.store_name}</strong>. The registered pharmacist is verifying the medicines and preparing your bill.
            </p>

            <button
              onClick={() => setOrderConfirmed(null)}
              className="mt-6 w-full py-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs shadow-md"
            >
              Track Medicine Status
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
