import React, { useState } from 'react'
import { X, Plus, Trash2, FileText, Send, Calculator, ShieldAlert } from 'lucide-react'

export default function CreateEstimateModal({ isOpen, onClose, booking, spareParts = [], onSubmitEstimate }) {
  const [items, setItems] = useState([
    { description: 'Extra Labor & Component Fitting', type: 'labor', qty: 1, unit_price: 250 }
  ])
  const [includeTax, setIncludeTax] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !booking) return null

  const handleAddItem = (type = 'part') => {
    setItems([
      ...items,
      { description: type === 'part' ? 'Replacement Spare Part' : 'Additional Labor', type, qty: 1, unit_price: 150 }
    ])
  }

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, idx) => idx !== index))
  }

  const handleItemChange = (index, field, value) => {
    const updated = [...items]
    updated[index][field] = value
    setItems(updated)
  }

  const subtotal = items.reduce((sum, item) => sum + (Number(item.qty) || 1) * (Number(item.unit_price) || 0), 0)
  const taxAmount = includeTax ? Math.round(subtotal * 0.18) : 0
  const totalAmount = subtotal + taxAmount

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (items.length === 0) return

    setIsSubmitting(true)
    try {
      await onSubmitEstimate({
        booking_id: booking.id,
        technician_id: booking.technician_id,
        items,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount
      })
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/15 rounded-3xl p-7 sm:p-8 w-full max-w-2xl shadow-2xl text-left">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
              <FileText className="w-6 h-6 text-orange-500" />
              <span>Create On-Site Quotation</span>
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Job #{booking.booking_number} • Customer: {booking.customer_name || 'Customer'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4 max-h-[420px] overflow-y-auto">
          {/* Line items list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                Itemized Work & Parts
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddItem('part')}
                  className="px-2 py-1 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-sky-100"
                >
                  <Plus size={12} /> Add Part
                </button>
                <button
                  type="button"
                  onClick={() => handleAddItem('labor')}
                  className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-indigo-100"
                >
                  <Plus size={12} /> Add Labor
                </button>
              </div>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    placeholder="Description (e.g. Copper Pipe 3ft or Extra Leak Fix)"
                    className="flex-1 bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) => handleItemChange(idx, 'qty', parseInt(e.target.value) || 1)}
                      className="w-full mt-0.5 bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 font-bold text-gray-800 dark:text-gray-200"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase">Rate (₹)</label>
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full mt-0.5 bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1 font-bold text-gray-800 dark:text-gray-200"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase">Total (₹)</label>
                    <div className="w-full mt-0.5 bg-gray-100 dark:bg-white/10 rounded-lg px-2 py-1 font-black text-gray-900 dark:text-white">
                      ₹{(item.qty * item.unit_price) || 0}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tax & Totals */}
          <div className="bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-800/30 rounded-2xl p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-600 dark:text-gray-400 font-bold">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>

            <div className="flex justify-between items-center text-gray-600 dark:text-gray-400 font-bold">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTax}
                  onChange={(e) => setIncludeTax(e.target.checked)}
                  className="rounded text-orange-500"
                />
                <span>GST (18%)</span>
              </label>
              <span>₹{taxAmount}</span>
            </div>

            <div className="flex justify-between text-sm font-black text-gray-900 dark:text-white pt-1.5 border-t border-orange-200/60 dark:border-orange-800/30">
              <span>Customer Approval Amount</span>
              <span className="text-orange-600 dark:text-orange-400">₹{totalAmount}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-xs font-black tracking-wide shadow-md transition-all flex items-center gap-1.5"
            >
              <Send size={14} />
              <span>{isSubmitting ? 'Sharing...' : 'Send Estimate to Customer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
