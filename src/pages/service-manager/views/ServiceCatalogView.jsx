import React, { useState } from 'react'
import { 
  Layers, 
  Tag, 
  Clock, 
  Star, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  Edit2, 
  Save,
  Search,
  Sparkles
} from 'lucide-react'
import CategoryIcon from '../../../utils/serviceIcons'

export default function ServiceCatalogView({
  catalog = [],
  categories = [],
  provider,
  isLoading = false,
  onUpdateVisitingFee
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [visitingFeeInput, setVisitingFeeInput] = useState(provider?.visiting_fee_override || '99')
  const [isSavingFee, setIsSavingFee] = useState(false)

  const filteredCatalog = catalog.filter(item => {
    if (selectedCategory !== 'all' && item.category_slug !== selectedCategory) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        (item.title || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const handleSaveFee = async () => {
    if (!onUpdateVisitingFee) return
    setIsSavingFee(true)
    try {
      await onUpdateVisitingFee(Number(visitingFeeInput) || 99)
    } finally {
      setIsSavingFee(false)
    }
  }

  return (
    <div className="space-y-6 text-left">
      
      {/* Visiting Fee Configuration Card */}
      <div className="bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-indigo-500/10 border border-sky-500/20 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full">
            Visiting & Inspection Fee
          </span>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mt-1">
            Doorstep Diagnostic Charge
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-md">
            This fee is automatically billed to the customer upon booking for technician doorstep arrival and initial inspection.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md p-2 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
          <span className="text-xs font-black text-gray-400 pl-2">₹</span>
          <input
            type="number"
            value={visitingFeeInput}
            onChange={(e) => setVisitingFeeInput(e.target.value)}
            className="w-20 bg-transparent text-sm font-black text-gray-900 dark:text-white focus:outline-none"
          />
          <button
            onClick={handleSaveFee}
            disabled={isSavingFee}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-black tracking-wide shadow-sm transition-all"
          >
            {isSavingFee ? 'Saving...' : 'Save Fee'}
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search catalog services..."
            className="w-full bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-white/90 dark:bg-[#1a1a1a]/90 border border-gray-200 dark:border-white/10 rounded-2xl px-3 py-2.5 text-xs font-bold text-gray-800 dark:text-gray-200 shadow-sm"
        >
          <option value="all">All Trade Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.title}
            </option>
          ))}
        </select>
      </div>

      {/* Services Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCatalog.map((service) => (
          <div
            key={service.id}
            className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-full">
                    {service.category_slug}
                  </span>
                  {service.tag && (
                    <span className="text-[10px] font-bold bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full">
                      {service.tag}
                    </span>
                  )}
                </div>

                <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center p-1 flex-shrink-0 border border-gray-100 dark:border-white/10">
                  <CategoryIcon category={service.category_slug} size={22} />
                </div>
              </div>

              <h4 className="text-sm font-black text-gray-900 dark:text-white mb-1">
                {service.title}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-3">
                {service.description}
              </p>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  ₹{service.price}
                </span>
                {service.original_price && (
                  <span className="text-xs text-gray-400 line-through">
                    ₹{service.original_price}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-gray-400 text-[11px] font-bold">
                <Clock size={12} className="text-sky-500" />
                <span>{service.estimated_duration_mins || 45} mins</span>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
