import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  Phone, 
  Calendar, 
  Wrench, 
  MapPin, 
  ShieldCheck, 
  AlertCircle,
  XCircle,
  ChevronRight,
  User,
  Star,
  RefreshCw
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'
import SEO from '../../components/SEO'

export default function MyBookings() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'active' | 'completed' | 'cancelled'
  const [cancellingId, setCancellingId] = useState(null)

  const fetchBookings = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('service_bookings')
        .select('*, services_catalog(title, price, category_id)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setBookings(data)
      }
    } catch (err) {
      console.error('Error fetching service bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [user])

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this doorstep service visit?')) return

    setCancellingId(bookingId)
    try {
      const { error } = await supabase
        .from('service_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)

      if (error) throw error

      toast.success('Doorstep booking cancelled successfully.')
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b))
    } catch (err) {
      toast.error('Failed to cancel booking. Please try again.')
    } finally {
      setCancellingId(null)
    }
  }

  const filteredBookings = bookings.filter(b => {
    const st = (b.status || '').toLowerCase()
    if (filter === 'active') return ['pending', 'assigned', 'in_progress', 'scheduled'].includes(st)
    if (filter === 'completed') return st === 'completed'
    if (filter === 'cancelled') return st === 'cancelled'
    return true
  })

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'completed') {
      return <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold rounded-full border border-emerald-500/20"><CheckCircle2 size={12} /> Service Completed</span>
    }
    if (s === 'cancelled') {
      return <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-extrabold rounded-full border border-red-500/20"><XCircle size={12} /> Cancelled</span>
    }
    if (s === 'in_progress') {
      return <span className="inline-flex items-center gap-1 px-3 py-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-extrabold rounded-full border border-sky-500/20"><Wrench size={12} className="animate-spin" /> Technician Working</span>
    }
    if (s === 'assigned') {
      return <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-extrabold rounded-full border border-blue-500/20"><User size={12} /> Partner Assigned</span>
    }
    return <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-extrabold rounded-full border border-amber-500/20"><Clock size={12} /> Scheduled Visit</span>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f] py-8 px-4 sm:px-6 lg:px-8 pb-24 transition-colors">
      <SEO title="My Service Bookings - OZO Services" description="Track doorstep visit status, technician details and service booking history." />

      <div className="max-w-3xl mx-auto text-left">
        {/* Back Button */}
        <button
          onClick={() => navigate('/services')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to OZO Services</span>
        </button>

        {/* Title & Refresh */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
              <Wrench size={26} className="text-sky-500" />
              <span>My Doorstep Service Visits</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">
              Track technician arrival status & booking records
            </p>
          </div>

          <button
            onClick={fetchBookings}
            className="p-2.5 rounded-xl bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:text-sky-500 transition-colors shadow-sm"
            title="Refresh Bookings"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
          {[
            { id: 'all', label: 'All Bookings' },
            { id: 'active', label: 'Active / Scheduled' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all border ${
                filter === t.id
                  ? 'bg-sky-500 text-white border-sky-500 shadow-md'
                  : 'bg-white dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Guest / Unauthenticated State */}
        {!user ? (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-10 text-center border border-gray-200 dark:border-white/10 shadow-sm">
            <div className="w-16 h-16 bg-sky-500/10 text-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <User size={32} />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">Please Login to View Bookings</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto font-medium">
              Log in with your account to view scheduled visits, technician phone details and booking status.
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="mt-6 px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-md transition-transform active:scale-95"
            >
              Login Now
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-100 dark:border-white/5 animate-pulse h-40" />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-12 text-center border border-gray-200 dark:border-white/10 shadow-sm">
            <div className="w-16 h-16 bg-sky-500/10 text-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Wrench size={32} />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">No bookings found</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto font-medium leading-relaxed">
              {filter === 'all' 
                ? "You haven't scheduled any doorstep visits yet. Choose a verified plumber, electrician or AC mechanic."
                : `No ${filter} service bookings found.`}
            </p>
            <button
              onClick={() => navigate('/services')}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-xs rounded-2xl shadow-md hover:shadow-sky-500/25 transition-transform active:scale-95"
            >
              Explore Services & Book Visit
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((b) => {
              const isCanCancel = ['pending', 'scheduled', 'assigned'].includes((b.status || '').toLowerCase())

              return (
                <div
                  key={b.id}
                  className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-5 sm:p-6 border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all text-left relative overflow-hidden"
                >
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-white/5 pb-4 mb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-sky-500 bg-sky-500/10 px-2.5 py-0.5 rounded-full">
                        #{b.booking_number || 'OZO-SRV-' + b.id.slice(0, 6)}
                      </span>
                      <h3 className="text-base font-black text-gray-900 dark:text-white mt-1.5 leading-snug">
                        {b.services_catalog?.title || b.service_name || 'Doorstep Service Visit'}
                      </h3>
                    </div>

                    {getStatusBadge(b.status)}
                  </div>

                  {/* Booking Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-300 font-medium mb-4">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                      <Calendar size={16} className="text-sky-500 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Scheduled Visit</p>
                        <p className="font-extrabold text-gray-900 dark:text-white mt-0.5">
                          {b.scheduled_at ? new Date(b.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Flexible Slot'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                      <MapPin size={16} className="text-red-500 flex-shrink-0" />
                      <div className="truncate">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Service Location</p>
                        <p className="font-bold text-gray-900 dark:text-white mt-0.5 truncate">
                          {b.address_json?.full_address || b.address || 'Registered Doorstep Address'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Technician Info Card if Assigned */}
                  {b.technician_name ? (
                    <div className="bg-sky-50 dark:bg-sky-500/10 border border-sky-500/20 p-3.5 rounded-2xl mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center font-black">
                          <User size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Assigned Service Partner</p>
                          <p className="text-sm font-black text-gray-900 dark:text-white">{b.technician_name}</p>
                        </div>
                      </div>

                      {b.technician_phone && (
                        <a
                          href={`tel:${b.technician_phone}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow transition-transform active:scale-95 flex-shrink-0"
                        >
                          <Phone size={14} />
                          <span>Call Tech</span>
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                      <ShieldCheck size={16} className="text-emerald-500 flex-shrink-0" />
                      <span>Technician assignment in progress. Contact details will appear here shortly.</span>
                    </div>
                  )}

                  {/* Footer & Actions */}
                  <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount Payable</span>
                      <p className="text-lg font-black text-gray-900 dark:text-white leading-none mt-0.5">
                        ₹{b.total_amount || b.services_catalog?.price || 199}
                        <span className="text-[10px] text-gray-400 font-medium ml-1.5">(Pay after service)</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href="tel:+918000000000"
                        className="px-3 py-2 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                      >
                        <Phone size={13} />
                        <span>Support</span>
                      </a>

                      {isCanCancel && (
                        <button
                          type="button"
                          onClick={() => handleCancelBooking(b.id)}
                          disabled={cancellingId === b.id}
                          className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl border border-red-500/20 transition-colors disabled:opacity-50"
                        >
                          {cancellingId === b.id ? 'Cancelling...' : 'Cancel Visit'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
