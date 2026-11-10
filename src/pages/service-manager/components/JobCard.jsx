import React from 'react'
import { 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  Calendar, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Wrench,
  ShieldCheck,
  Tag
} from 'lucide-react'
import CategoryIcon from '../../../utils/serviceIcons'

export default function JobCard({ 
  booking, 
  onSelect, 
  onAccept, 
  onOpenAssign, 
  onOpenOtp 
}) {
  const statusColorMap = {
    pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    accepted: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
    assigned: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    en_route: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    arrived: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    inspection: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
    quote_shared: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    quote_approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    in_progress: 'bg-blue-600/15 text-blue-600 border-blue-600/30 animate-pulse',
    work_completed: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    cancelled: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
  }

  const statusLabelMap = {
    pending: 'New Request',
    accepted: 'Accepted',
    assigned: 'Tech Assigned',
    en_route: 'En Route',
    arrived: 'At Doorstep',
    inspection: 'Inspection',
    quote_shared: 'Quote Sent',
    quote_approved: 'Quote Approved',
    in_progress: 'Work In Progress',
    work_completed: 'Awaiting OTP',
    completed: 'Verified & Completed',
    cancelled: 'Cancelled'
  }

  const statusClass = statusColorMap[booking.status] || 'bg-gray-100 text-gray-700 border-gray-200'
  const statusLabel = statusLabelMap[booking.status] || booking.status

  const customerAddress = typeof booking.address_json === 'object' 
    ? (booking.address_json?.full_address || booking.address_json?.address || 'Patna Doorstep')
    : (booking.address_json || 'Patna Doorstep')

  return (
    <div 
      className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all text-left relative overflow-hidden group"
    >
      {/* Top Bar: Booking Number & Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black tracking-wider text-gray-500 dark:text-gray-400">
            #{booking.booking_number || booking.id?.slice(0, 8)}
          </span>
          <span className="text-gray-300 dark:text-white/20">|</span>
          <span className="text-xs font-bold text-gray-400 capitalize">
            {booking.category_slug || 'Home Service'}
          </span>
        </div>

        <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      {/* Main Title & Category Illustration */}
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white leading-snug group-hover:text-amber-500 transition-colors">
            {booking.service_title || 'Doorstep Service Visit'}
          </h3>
          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ₹{booking.total_amount || 0}
            <span className="text-xs text-gray-400 font-semibold ml-1.5">
              ({booking.payment_mode?.toUpperCase() || 'COD'} • {booking.payment_status || 'Pending'})
            </span>
          </p>
        </div>

        <div className="w-13 h-13 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center p-2 flex-shrink-0 border border-gray-100 dark:border-white/10">
          <CategoryIcon category={booking.category_slug || 'plumbing'} size={32} />
        </div>
      </div>

      {/* Scheduled Time & Address */}
      <div className="space-y-2 mb-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
        <div className="flex items-center gap-2.5">
          <Calendar size={15} className="text-amber-500 flex-shrink-0" />
          <span className="truncate">
            {booking.scheduled_at || `${booking.scheduled_date || 'Today'} • ${booking.scheduled_slot || '10:00 AM - 12:00 PM'}`}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <MapPin size={15} className="text-rose-500 flex-shrink-0" />
          <span className="truncate text-gray-500 dark:text-gray-400">{customerAddress}</span>
        </div>

        {booking.customer_name && (
          <div className="flex items-center gap-2.5">
            <User size={15} className="text-indigo-500 flex-shrink-0" />
            <span className="font-bold text-gray-800 dark:text-gray-200">{booking.customer_name}</span>
            {booking.customer_phone && (
              <span className="text-xs text-gray-400 font-mono font-bold">({booking.customer_phone})</span>
            )}
          </div>
        )}

        {/* Assigned Tech Pill */}
        {booking.service_technicians && (
          <div className="flex items-center gap-2 pt-1.5 border-t border-gray-100 dark:border-white/5 text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 font-black">
            <Wrench size={14} />
            <span>Assigned: {booking.service_technicians.full_name}</span>
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-2 pt-3.5 border-t border-gray-100 dark:border-white/10">
        <button
          type="button"
          onClick={() => onSelect(booking)}
          className="text-sm font-black text-gray-700 dark:text-gray-300 hover:text-amber-500 flex items-center gap-1 transition-colors"
        >
          <span>Details & Inspect</span>
          <ChevronRight size={15} />
        </button>

        <div className="flex items-center gap-2">
          {booking.status === 'pending' && onAccept && (
            <button
              type="button"
              onClick={() => onAccept(booking.id)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl text-xs sm:text-sm font-black tracking-wide shadow-md shadow-amber-500/25 transition-all"
            >
              Accept Job
            </button>
          )}

          {['accepted', 'assigned'].includes(booking.status) && onOpenAssign && (
            <button
              type="button"
              onClick={() => onOpenAssign(booking)}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs sm:text-sm font-black tracking-wide shadow-sm transition-all"
            >
              {booking.technician_id ? 'Reassign Tech' : 'Assign Crew'}
            </button>
          )}

          {booking.status === 'work_completed' && onOpenOtp && (
            <button
              type="button"
              onClick={() => onOpenOtp(booking)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs sm:text-sm font-black tracking-wide shadow-sm transition-all animate-bounce"
            >
              Verify OTP
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
