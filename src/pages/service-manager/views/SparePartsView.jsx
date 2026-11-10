import React, { useState } from 'react'
import { 
  Package, 
  Plus, 
  Search, 
  ShieldCheck, 
  Tag, 
  AlertTriangle, 
  Check, 
  X,
  Layers
} from 'lucide-react'

export default function SparePartsView({
  spareParts = [],
  isLoading = false,
  onAddPart,
  onUpdateStock
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // New Part Form State
  const [partName, setPartName] = useState('')
  const [partCode, setPartCode] = useState('')
  const [categorySlug, setCategorySlug] = useState('ac-appliance')
  const [costPrice, setCostPrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [stockQuantity, setStockQuantity] = useState('10')
  const [warrantyDays, setWarrantyDays] = useState('90')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredParts = spareParts.filter(part => {
    if (selectedCategory !== 'all' && part.category_slug !== selectedCategory) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        (part.part_name || '').toLowerCase().includes(q) ||
        (part.part_code || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const handleCreatePart = async (e) => {
    e.preventDefault()
    if (!partName.trim() || !sellingPrice) return

    setIsSubmitting(true)
    try {
      await onAddPart({
        part_name: partName.trim(),
        part_code: partCode.trim() || `PRT-${Math.floor(1000 + Math.random() * 9000)}`,
        category_slug: categorySlug,
        cost_price: Number(costPrice) || 0,
        selling_price: Number(sellingPrice) || 0,
        stock_quantity: Number(stockQuantity) || 0,
        warranty_days: Number(warrantyDays) || 90
      })
      setIsAddModalOpen(false)
      setPartName('')
      setCostPrice('')
      setSellingPrice('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 text-left">
      
      {/* Top Banner & Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-teal-500/10 border border-amber-500/20 rounded-3xl p-6 sm:p-8">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full">
            Component Warehouse
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-2">
            Spare Parts & Materials Inventory
          </h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Keep track of replacement hardware, copper pipes, capacitors, valves & sanitizing chemicals.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-6 py-3.5 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl text-sm sm:text-base font-black tracking-wide shadow-lg shadow-teal-600/20 transition-all flex items-center gap-2.5 shrink-0 active:scale-95"
        >
          <Plus size={18} />
          <span>Add Spare Part</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search spare parts or part code..."
            className="w-full bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm sm:text-base font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-white/90 dark:bg-[#1a1a1a]/90 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm sm:text-base font-bold text-gray-800 dark:text-gray-200 shadow-sm"
        >
          <option value="all">All Categories</option>
          <option value="ac-appliance">AC & Appliance</option>
          <option value="plumbing">Plumbing</option>
          <option value="electrician">Electrician</option>
          <option value="home-cleaning">Cleaning Supplies</option>
          <option value="carpentry">Carpentry Hardware</option>
          <option value="pest-control">Pest Control Chemicals</option>
        </select>
      </div>

      {/* Parts Grid */}
      {filteredParts.length === 0 ? (
        <div className="bg-white/60 dark:bg-[#1a1a1a]/60 backdrop-blur-md border border-dashed border-gray-200 dark:border-white/10 rounded-3xl p-16 text-center">
          <Package className="w-14 h-14 text-gray-300 dark:text-white/20 mx-auto mb-3" />
          <h3 className="text-lg font-black text-gray-800 dark:text-gray-200">
            No Spare Parts Found
          </h3>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto mb-5">
            Add commonly used components to create on-site estimates seamlessly during customer inspections.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl text-sm font-black shadow-md"
          >
            Add First Component
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredParts.map((part) => (
            <div
              key={part.id}
              className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-xs font-mono font-black text-gray-400 uppercase">
                    {part.part_code || 'PRT'}
                  </span>
                  <span className="text-xs font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 px-3 py-1 rounded-full border border-teal-200/50">
                    {part.warranty_days || 90} Days Warranty
                  </span>
                </div>

                <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-white mb-1.5">
                  {part.part_name}
                </h4>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-4 font-bold">
                  {part.category_slug}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between py-2.5 border-t border-gray-100 dark:border-white/10 text-xs mb-3.5">
                  <div>
                    <span className="text-xs font-bold text-gray-400 block mb-0.5">Selling Price</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      ₹{part.selling_price}
                    </span>
                  </div>

                  {part.cost_price > 0 && (
                    <div className="text-right">
                      <span className="text-xs font-bold text-gray-400 block mb-0.5">Unit Cost</span>
                      <span className="text-sm font-bold text-gray-500 font-mono">
                        ₹{part.cost_price}
                      </span>
                    </div>
                  )}
                </div>

                {/* Stock Controls */}
                <div className="flex items-center justify-between bg-gray-50 dark:bg-white/5 p-3 rounded-2xl border border-gray-100 dark:border-white/5">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    In Stock: <span className="font-mono font-black text-base ml-1">{part.stock_quantity || 0}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onUpdateStock(part.id, Math.max(0, (part.stock_quantity || 0) - 1))}
                      className="w-8 h-8 bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-xl text-sm font-black hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateStock(part.id, (part.stock_quantity || 0) + 1)}
                      className="w-8 h-8 bg-white dark:bg-[#222] border border-gray-200 dark:border-white/10 rounded-xl text-sm font-black hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Part Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
              <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-teal-500" />
                <span>Add Spare Part to Stock</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePart} className="py-4 space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-gray-400">Part Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Copper Pipe (3/8 inch) or AC Capacitor (45 MFD)"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  className="w-full mt-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 font-bold text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-gray-400">Trade Category</label>
                  <select
                    value={categorySlug}
                    onChange={(e) => setCategorySlug(e.target.value)}
                    className="w-full mt-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 font-bold text-gray-900 dark:text-white focus:outline-none"
                  >
                    <option value="ac-appliance">AC & Appliance</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="electrician">Electrician</option>
                    <option value="home-cleaning">Cleaning Supplies</option>
                    <option value="carpentry">Carpentry</option>
                    <option value="pest-control">Pest Control</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-gray-400">Part Code</label>
                  <input
                    type="text"
                    placeholder="e.g. PRT-AC-01"
                    value={partCode}
                    onChange={(e) => setPartCode(e.target.value)}
                    className="w-full mt-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 font-bold text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-gray-400">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 450"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full mt-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 font-bold text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-gray-400">Cost Price (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 280"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full mt-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 font-bold text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-gray-400">Initial Stock</label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full mt-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 font-bold text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-gray-400">Warranty (Days)</label>
                  <input
                    type="number"
                    value={warrantyDays}
                    onChange={(e) => setWarrantyDays(e.target.value)}
                    className="w-full mt-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 font-bold text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !partName.trim() || !sellingPrice}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-black tracking-wide shadow-md transition-all"
                >
                  {isSubmitting ? 'Saving...' : 'Add Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
