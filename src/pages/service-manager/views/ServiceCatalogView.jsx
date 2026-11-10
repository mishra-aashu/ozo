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
  Sparkles,
  PlusCircle,
  Building2,
  AlertCircle
} from 'lucide-react'
import CategoryIcon from '../../../utils/serviceIcons'
import AddCustomServiceModal from '../components/AddCustomServiceModal'

export default function ServiceCatalogView({
  catalog = [],
  categories = [],
  provider,
  isLoading = false,
  onUpdateVisitingFee,
  onAddCustomService
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [ownershipFilter, setOwnershipFilter] = useState('all') // 'all' | 'platform' | 'my_custom'
  const [visitingFeeInput, setVisitingFeeInput] = useState(provider?.visiting_fee_override || '99')
  const [isSavingFee, setIsSavingFee] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const myCustomServicesCount = catalog.filter(s => s.provider_id && s.provider_id === provider?.id).length

  const filteredCatalog = catalog.filter(item => {
    // Ownership filter
    if (ownershipFilter === 'my_custom' && item.provider_id !== provider?.id) return false
    if (ownershipFilter === 'platform' && item.provider_id) return false

    // Category filter
    if (selectedCategory !== 'all' && item.category_slug !== selectedCategory) return false

    // Search query
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
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 border border-amber-500/25 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div>
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3.5 py-1 rounded-full">
            Visiting & Inspection Fee
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-2">
            Doorstep Diagnostic Charge
          </h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
            This minimum fee is billed to the customer upon booking for technician doorstep arrival and initial inspection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3.5">
          <div className="flex items-center gap-2 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md p-2.5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <span className="text-sm font-black text-gray-400 pl-2.5">₹</span>
            <input
              type="number"
              value={visitingFeeInput}
              onChange={(e) => setVisitingFeeInput(e.target.value)}
              className="w-24 bg-transparent text-base sm:text-lg font-black text-gray-900 dark:text-white focus:outline-none"
            />
            <button
              onClick={handleSaveFee}
              disabled={isSavingFee}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs sm:text-sm font-black tracking-wide shadow-sm transition-all"
            >
              {isSavingFee ? 'Saving...' : 'Save Fee'}
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-3.5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2.5 active:scale-95"
          >
            <PlusCircle size={19} />
            <span>Propose Custom Service</span>
          </button>
        </div>
      </div>

      {/* Filter, Tabs and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Ownership tabs */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl border border-gray-200 dark:border-white/10 w-fit">
          <button
            onClick={() => setOwnershipFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              ownershipFilter === 'all'
                ? 'bg-white dark:bg-[#1f1f23] text-gray-900 dark:text-white shadow-sm font-black'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All Services ({catalog.length})
          </button>
          <button
            onClick={() => setOwnershipFilter('platform')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              ownershipFilter === 'platform'
                ? 'bg-white dark:bg-[#1f1f23] text-gray-900 dark:text-white shadow-sm font-black'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Platform Catalog
          </button>
          <button
            onClick={() => setOwnershipFilter('my_custom')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              ownershipFilter === 'my_custom'
                ? 'bg-white dark:bg-[#1f1f23] text-sky-600 dark:text-sky-400 shadow-sm font-black'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <span>My Custom Services</span>
            {myCustomServicesCount > 0 && (
              <span className="bg-sky-500 text-white text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                {myCustomServicesCount}
              </span>
            )}
          </button>
        </div>

        {/* Search and Category filter */}
        <div className="flex items-center gap-3 flex-1 max-w-lg justify-end">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services..."
              className="w-full bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white/90 dark:bg-[#1a1a1a]/90 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-gray-800 dark:text-gray-200 shadow-sm cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.slug}>
                {cat.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Services Catalog Grid */}
      {filteredCatalog.length === 0 ? (
        <div className="bg-white/60 dark:bg-[#1a1a1a]/60 backdrop-blur-md border border-dashed border-gray-200 dark:border-white/10 rounded-3xl p-16 text-center">
          <Layers className="w-16 h-16 text-gray-300 dark:text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-black text-gray-800 dark:text-gray-100">
            No Services Found
          </h3>
          <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto mb-5">
            {ownershipFilter === 'my_custom' 
              ? 'You have not submitted any custom services yet. Click below to propose a specialized service for admin approval.' 
              : 'Try adjusting your search query or category filters.'}
          </p>
          {ownershipFilter === 'my_custom' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl text-sm font-black shadow-md"
            >
              Propose First Custom Service
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCatalog.map((service) => {
            const isMyCustomService = service.provider_id && service.provider_id === provider?.id

            return (
              <div
                key={service.id}
                className={`bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                  isMyCustomService 
                    ? 'border-sky-500/40 ring-1 ring-sky-500/20' 
                    : 'border-gray-200 dark:border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-sky-500 bg-sky-500/10 px-2.5 py-1 rounded-full">
                        {service.category_slug}
                      </span>
                      {service.tag && (
                        <span className="text-xs font-bold bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full">
                          {service.tag}
                        </span>
                      )}
                      {isMyCustomService && (
                        <span className="text-xs font-black bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Building2 size={12} /> Agency Custom
                        </span>
                      )}
                    </div>

                    <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center p-1.5 flex-shrink-0 border border-gray-100 dark:border-white/10">
                      <CategoryIcon category={service.category_slug} size={26} />
                    </div>
                  </div>

                  {/* Approval Status Badge for Custom Services */}
                  {isMyCustomService && (
                    <div className="mb-3">
                      {service.approval_status === 'pending' && (
                        <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5 w-fit">
                          <Clock size={13} className="animate-spin" /> Awaiting Admin Approval
                        </span>
                      )}
                      {service.approval_status === 'approved' && (
                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5 w-fit">
                          <CheckCircle2 size={13} /> Approved & Live for Customers
                        </span>
                      )}
                      {service.approval_status === 'rejected' && (
                        <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5 w-fit">
                          <XCircle size={13} /> Proposal Declined by Admin
                        </span>
                      )}
                    </div>
                  )}

                  <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-white mb-1.5">
                    {service.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-4">
                    {service.description}
                  </p>
                </div>

                <div className="pt-3.5 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
                      ₹{service.price}
                    </span>
                    {service.original_price && (
                      <span className="text-xs sm:text-sm text-gray-400 line-through">
                        ₹{service.original_price}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-gray-400 text-xs sm:text-sm font-bold">
                    <Clock size={14} className="text-sky-500" />
                    <span>{service.estimated_duration_mins || 45} mins</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Custom Service Modal */}
      <AddCustomServiceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        categories={categories}
        onAddCustomService={onAddCustomService}
      />

    </div>
  )
}
