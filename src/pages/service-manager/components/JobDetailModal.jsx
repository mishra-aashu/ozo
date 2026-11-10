import React, { useState } from 'react'
import { 
  X, 
  MapPin, 
  Phone, 
  Calendar, 
  Clock, 
  User, 
  Wrench, 
  CheckCircle2, 
  FileText, 
  ShieldCheck, 
  KeyRound,
  ExternalLink,
  ChevronDown,
  Navigation,
  Printer
} from 'lucide-react'
import DynamicServiceFields from '../workflows/DynamicServiceFields'
import BeforeAfterUploader from './BeforeAfterUploader'
import CategoryIcon from '../../../utils/serviceIcons'
import { printServiceInvoice } from '../../../utils/serviceInvoiceGenerator'
import { useServiceManagerStore } from '../../../stores/serviceManagerStore'

export default function JobDetailModal({
  isOpen,
  onClose,
  booking,
  onUpdateStatus,
  onOpenAssign,
  onOpenEstimate,
  onOpenOtp,
  onUpdateBookingData
}) {
  const { provider } = useServiceManagerStore()
  if (!isOpen || !booking) return null

  const customerAddress = typeof booking.address_json === 'object'
    ? (booking.address_json?.full_address || booking.address_json?.address || 'Patna Doorstep')
    : (booking.address_json || 'Patna Doorstep')

  const mapQuery = encodeURIComponent(customerAddress)
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`

  const statusOptions = [
    { value: 'pending', label: '1. Pending Review' },
    { value: 'accepted', label: '2. Accepted' },
    { value: 'assigned', label: '3. Technician Assigned' },
    { value: 'en_route', label: '4. Technician En Route' },
    { value: 'arrived', label: '5. Arrived at Customer Doorstep' },
    { value: 'inspection', label: '6. Diagnostic Inspection' },
    { value: 'in_progress', label: '7. Work In Progress' },
    { value: 'work_completed', label: '8. Work Done (Awaiting OTP)' },
    { value: 'completed', label: '9. Completed & Verified' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  const handleDynamicDataUpdate = (serviceData) => {
    if (onUpdateBookingData) {
      onUpdateBookingData(booking.id, {
        service_specific_data: {
          ...(booking.service_specific_data || {}),
          ...serviceData
        }
      })
    }
  }

  const handleMediaUpload = (type, url) => {
    if (onUpdateBookingData) {
      const field = type === 'before' ? 'beforePhoto' : 'afterPhoto'
      onUpdateBookingData(booking.id, {
        service_specific_data: {
          ...(booking.service_specific_data || {}),
          [field]: url
        }
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/15 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-left overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between gap-3 bg-gray-50/70 dark:bg-black/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 flex items-center justify-center flex-shrink-0">
              <CategoryIcon category={booking.category_slug || 'plumbing'} size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black text-gray-400">
                  #{booking.booking_number || booking.id?.slice(0, 8)}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  {booking.status?.replace('_', ' ')}
                </span>
              </div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                {booking.service_title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
          
          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/10">
            {booking.customer_phone && (
              <a
                href={`tel:${booking.customer_phone}`}
                className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl flex items-center gap-1.5 border border-emerald-200/50"
              >
                <Phone size={13} /> Call Customer
              </a>
            )}

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-bold rounded-xl flex items-center gap-1.5 border border-amber-200/50"
            >
              <Navigation size={13} /> Google Maps
            </a>

            <button
              onClick={() => onOpenAssign(booking)}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold rounded-xl flex items-center gap-1.5 border border-amber-500/30 transition-colors"
            >
              <Wrench size={13} /> {booking.technician_id ? 'Reassign Tech' : 'Assign Tech'}
            </button>

            <button
              onClick={() => onOpenEstimate(booking)}
              className="px-3 py-1.5 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 font-bold rounded-xl flex items-center gap-1.5 border border-orange-200/50"
            >
              <FileText size={13} /> Add Extra Estimate
            </button>

            {booking.status === 'work_completed' && (
              <button
                onClick={() => onOpenOtp(booking)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl flex items-center gap-1.5 shadow-md"
              >
                <KeyRound size={13} /> Verify OTP & Close
              </button>
            )}

            <button
              onClick={() => printServiceInvoice(booking, provider)}
              className="px-3 py-1.5 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white font-bold rounded-xl flex items-center gap-1.5 border border-gray-200 dark:border-white/10 transition-colors"
              title="Print standard GST service invoice"
            >
              <Printer size={13} /> Print Tax Invoice
            </button>
          </div>

          {/* Customer & Scheduling Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Customer Details</span>
              <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200">
                <User size={14} className="text-amber-500" />
                <span>{booking.customer_name || 'Valued Customer'}</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-gray-600 dark:text-gray-300">
                <Phone size={14} className="text-emerald-500" />
                <span>{booking.customer_phone || 'Not provided'}</span>
              </div>
              <div className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                <MapPin size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{customerAddress}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Appointment & Billing</span>
              <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200">
                <Calendar size={14} className="text-amber-500" />
                <span>{booking.scheduled_at || `${booking.scheduled_date || 'Today'} • ${booking.scheduled_slot || '10:00 AM - 12:00 PM'}`}</span>
              </div>
              <div className="flex items-center justify-between text-gray-700 dark:text-gray-300 pt-1 border-t border-gray-200/50 dark:border-white/10 font-bold">
                <span>Visiting / Labor Fee:</span>
                <span>₹{booking.total_amount || 0}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-black">
                <span>Payment Mode:</span>
                <span>{booking.payment_mode?.toUpperCase() || 'COD'} ({booking.payment_status?.toUpperCase() || 'PENDING'})</span>
              </div>
            </div>
          </div>

          {/* Lifecycle Status Advance Selector */}
          <div className="bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/20 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                Job Progress Stage
              </span>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-0.5">
                Advance stage to update customer & dispatch control
              </p>
            </div>

            <select
              value={booking.status}
              onChange={(e) => onUpdateStatus(booking.id, e.target.value)}
              className="bg-white dark:bg-[#222] border border-amber-300 dark:border-amber-500/30 rounded-xl px-3 py-1.5 font-black text-xs text-amber-700 dark:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Service Specific Diagnostic Sheet */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2">
              Trade Diagnostic Specs & Technical Checklist
            </h4>
            <DynamicServiceFields
              booking={booking}
              onUpdateData={handleDynamicDataUpdate}
              isReadOnly={booking.status === 'completed'}
            />
          </div>

          {/* Before & After Proof Photos */}
          <BeforeAfterUploader
            booking={booking}
            onUploadMedia={handleMediaUpload}
            isReadOnly={booking.status === 'completed'}
          />

          {/* Customer Notes */}
          {booking.customer_notes && (
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Customer Instructions
              </span>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                "{booking.customer_notes}"
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-black/20">
          <span className="text-xs font-bold text-gray-400">
            Assigned: {booking.service_technicians?.full_name || 'Unassigned Crew'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-800 dark:text-white rounded-xl text-xs font-black transition-all"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  )
}
