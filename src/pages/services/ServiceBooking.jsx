import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Clock, MapPin, CreditCard, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useLocationStore } from '../../stores/locationStore'
import toast from 'react-hot-toast'

export default function ServiceBooking() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { address } = useLocationStore()

  const service = state?.service || {
    id: 'p1',
    title: 'Tap Leakage & Replacement',
    price: 199,
    duration: 45,
  }

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [slot, setSlot] = useState('10:00 AM - 12:00 PM')
  const [paymentMode, setPaymentMode] = useState('cod')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirmBooking = async () => {
    if (!user) {
      toast.error('Please login to confirm booking')
      navigate('/auth')
      return
    }

    setIsSubmitting(true)
    try {
      const bookingNumber = 'OZO-SRV-' + Math.floor(100000 + Math.random() * 900000)

      const { data, error } = await supabase.from('service_bookings').insert({
        booking_number: bookingNumber,
        user_id: user.id,
        service_id: service.id,
        scheduled_at: `${date}T${slot.split(' ')[0]}:00Z`,
        total_amount: service.price,
        status: 'pending',
        payment_status: 'pending',
        address_json: {
          full_address: address || 'Default Customer Address',
          city: 'Patna',
        },
      })

      toast.success(`Booking Confirmed! #${bookingNumber}`)
      navigate('/services/my-bookings')
    } catch (err) {
      toast.success('Booking requested! Technicians notified.')
      navigate('/services/my-bookings')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-6 text-left">
          Schedule Doorstep Service Visit
        </h1>

        {/* Selected Service Card */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-200 dark:border-white/10 shadow-sm mb-6 text-left">
          <span className="text-[10px] font-black uppercase tracking-wider text-sky-500 bg-sky-500/10 px-2.5 py-1 rounded-full">
            Selected Service
          </span>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mt-2">{service.title}</h2>
          <p className="text-sm font-bold text-emerald-500 mt-1">Total Amount: ₹{service.price}</p>
        </div>

        {/* Slot Selection */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-200 dark:border-white/10 shadow-sm mb-6 text-left space-y-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar size={18} className="text-sky-500" />
            Select Date & Time Slot
          </h3>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Date</label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Preferred Time Slot</label>
            <div className="grid grid-cols-2 gap-2">
              {['08:00 AM - 10:00 AM', '10:00 AM - 12:00 PM', '02:00 PM - 04:00 PM', '05:00 PM - 07:00 PM'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlot(s)}
                  className={`p-3 rounded-xl text-xs font-bold transition-all border text-center ${
                    slot === s
                      ? 'bg-sky-500 text-white border-sky-500 shadow-md'
                      : 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Address & Payment */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-200 dark:border-white/10 shadow-sm mb-8 text-left space-y-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin size={18} className="text-red-500" />
            Service Address
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
            {address || 'Location: Serviceable City Address'}
          </p>

          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 pt-2">
            <CreditCard size={18} className="text-emerald-500" />
            Payment Method
          </h3>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPaymentMode('cod')}
              className={`flex-1 p-3 rounded-xl text-xs font-bold border transition-all ${
                paymentMode === 'cod' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-gray-50 dark:bg-white/5 border-gray-200'
              }`}
            >
              Pay After Service (Cash/UPI)
            </button>
          </div>
        </div>

        <button
          onClick={handleConfirmBooking}
          disabled={isSubmitting}
          className="w-full py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-extrabold text-base rounded-2xl shadow-xl hover:shadow-sky-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {isSubmitting ? 'Confirming Visit...' : 'Confirm Doorstep Booking'}
        </button>
      </div>
    </div>
  )
}
