import React, { useState } from 'react'
import { X, PlusCircle, Sparkles, Clock, IndianRupee, Layers, FileText, ShieldCheck } from 'lucide-react'

export default function AddCustomServiceModal({
  isOpen,
  onClose,
  categories = [],
  onAddCustomService
}) {
  const [title, setTitle] = useState('')
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug || 'plumbing')
  const [price, setPrice] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [durationMins, setDurationMins] = useState('45')
  const [tag, setTag] = useState('Partner Special')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const selectedCategoryObj = categories.find(c => c.slug === categorySlug)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !price || !description.trim()) return

    setIsSubmitting(true)
    try {
      await onAddCustomService({
        title: title.trim(),
        category_slug: categorySlug,
        category_id: selectedCategoryObj?.id || null,
        price: Number(price),
        original_price: originalPrice ? Number(originalPrice) : Math.round(Number(price) * 1.3),
        estimated_duration_mins: Number(durationMins) || 45,
        tag: tag.trim() || 'Partner Special',
        description: description.trim()
      })
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/15 rounded-3xl p-7 sm:p-8 w-full max-w-2xl shadow-2xl text-left max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
              <PlusCircle className="w-6 h-6 text-sky-500" />
              <span>Propose New Service Offering</span>
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Add a specialized service for your agency. Submitted services are reviewed by Ozo Admin.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Notice Banner */}
        <div className="my-4 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-start gap-3 text-sky-700 dark:text-sky-300 text-xs sm:text-sm">
          <ShieldCheck size={18} className="shrink-0 mt-0.5 text-sky-500" />
          <p className="leading-relaxed">
            <strong>Admin Verification Process:</strong> To maintain high customer trust, new service offerings are verified by Admin for standard safety and pricing guidelines before appearing in the live customer app.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 block mb-1.5">
              Service Name / Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Commercial RO Membrane & Deep Chemical Cleaning"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/15 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Category & Tag */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 block mb-1.5">
                Service Trade Category *
              </label>
              <select
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/15 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {categories.map((c) => (
                  <option key={c.id || c.slug} value={c.slug} className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white">
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 block mb-1.5">
                Highlight Tag
              </label>
              <input
                type="text"
                placeholder="e.g. 6-Month Warranty, Special"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/15 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Pricing & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 block mb-1.5">
                Customer Price (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="499"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/15 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 block mb-1.5">
                MRP / Crossed Price (₹)
              </label>
              <input
                type="number"
                min="1"
                placeholder="699"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/15 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 block mb-1.5">
                Estimated Duration (Mins)
              </label>
              <input
                type="number"
                required
                min="15"
                step="5"
                placeholder="45"
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
                className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/15 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 block mb-1.5">
              Service Scope & Work Description *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe what is covered in this service (parts, labor, chemical inspection, warranty terms)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/15 rounded-2xl p-4 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 text-sm font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !price || !description.trim()}
              className="px-7 py-3.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-2xl text-sm font-black tracking-wide shadow-lg shadow-sky-600/30 transition-all flex items-center gap-2 active:scale-[0.98]"
            >
              <PlusCircle size={18} />
              <span>{isSubmitting ? 'Submitting Proposal...' : 'Submit for Admin Approval'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
