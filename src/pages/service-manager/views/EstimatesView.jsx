import React, { useState } from 'react'
import { 
  FileText, 
  Search, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Calendar, 
  User, 
  Phone,
  Layers,
  ArrowRight,
  Printer
} from 'lucide-react'
import { printServiceEstimate } from '../../../utils/serviceInvoiceGenerator'
import { useServiceManagerStore } from '../../../stores/serviceManagerStore'

export default function EstimatesView({
  estimates = [],
  isLoading = false
}) {
  const { provider } = useServiceManagerStore()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredEstimates = estimates.filter(est => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (est.estimate_number || '').toLowerCase().includes(q) ||
      (est.service_bookings?.customer_name || '').toLowerCase().includes(q) ||
      (est.service_bookings?.service_title || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6 text-left">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10 border border-orange-500/20 rounded-3xl p-6 sm:p-8">
        <span className="text-xs font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full">
          On-Site Quotation Register
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-2">
          Customer Job Estimates
        </h2>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
          Track extra work, spare parts quotations and customer approvals requested by your field technicians during doorstep inspection.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search estimate number, service, customer..."
          className="w-full bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm sm:text-base font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
        />
      </div>

      {/* Estimates Grid */}
      {filteredEstimates.length === 0 ? (
        <div className="bg-white/60 dark:bg-[#1a1a1a]/60 backdrop-blur-md border border-dashed border-gray-200 dark:border-white/10 rounded-3xl p-16 text-center">
          <FileText className="w-14 h-14 text-gray-300 dark:text-white/20 mx-auto mb-3" />
          <h3 className="text-lg font-black text-gray-800 dark:text-gray-200">
            No Quotations Issued Yet
          </h3>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
            When technicians inspect customer premises and recommend replacement parts, create an estimate directly from the Job Details modal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEstimates.map((est) => {
            const statusConfig = {
              sent: { label: 'Sent to Customer', class: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
              approved: { label: 'Customer Approved', class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
              rejected: { label: 'Declined', class: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
              draft: { label: 'Draft', class: 'bg-gray-100 text-gray-600 border-gray-200' }
            }[est.status] || { label: est.status, class: 'bg-gray-100 text-gray-600' }

            return (
              <div
                key={est.id}
                className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-xs font-mono font-black text-orange-600 dark:text-orange-400">
                      #{est.estimate_number || est.id?.slice(0, 8)}
                    </span>
                    <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${statusConfig.class}`}>
                      {statusConfig.label}
                    </span>
                  </div>

                  <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-white mb-1.5">
                    {est.service_bookings?.service_title || 'Extra Repair & Component Work'}
                  </h4>

                  {est.service_bookings?.customer_name && (
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 mb-3.5">
                      <User size={14} className="text-indigo-500" />
                      <span>{est.service_bookings.customer_name}</span>
                    </div>
                  )}

                  {/* Line items preview */}
                  {Array.isArray(est.items) && est.items.length > 0 && (
                    <div className="p-3.5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-1.5 text-xs sm:text-sm mb-3.5">
                      {est.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-gray-700 dark:text-gray-300 font-medium">
                          <span className="truncate pr-2">{item.description} (x{item.qty || 1})</span>
                          <span className="font-mono font-black">₹{item.qty * item.unit_price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3.5 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400 block font-bold mb-0.5">Quote Total</span>
                    <span className="text-lg sm:text-xl font-black text-orange-600 dark:text-orange-400">
                      ₹{est.total_amount}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-gray-400">
                      {new Date(est.created_at).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => printServiceEstimate(est, provider)}
                      className="p-2 rounded-xl text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
                      title="Print Quotation"
                    >
                      <Printer size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
