import React, { useState, useMemo } from 'react'
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Inbox, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Wrench,
  Sparkles,
  Calendar
} from 'lucide-react'
import JobCard from '../components/JobCard'

export default function LiveJobsView({
  bookings = [],
  isLoading = false,
  onRefresh,
  onSelectBooking,
  onAcceptBooking,
  onOpenAssign,
  onOpenOtp
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatusTab, setSelectedStatusTab] = useState('all')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all')

  // Filter tabs definition with dynamic counters
  const statusTabs = useMemo(() => {
    const counts = {
      all: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      assigned: bookings.filter(b => ['assigned', 'en_route', 'arrived'].includes(b.status)).length,
      in_progress: bookings.filter(b => ['in_progress', 'inspection', 'quote_shared', 'quote_approved'].includes(b.status)).length,
      work_completed: bookings.filter(b => b.status === 'work_completed').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length
    }

    return [
      { id: 'all', label: 'All Jobs', count: counts.all },
      { id: 'pending', label: 'Incoming', count: counts.pending, highlight: counts.pending > 0 },
      { id: 'assigned', label: 'Assigned', count: counts.assigned },
      { id: 'in_progress', label: 'In Progress', count: counts.in_progress },
      { id: 'work_completed', label: 'Awaiting OTP', count: counts.work_completed, alert: counts.work_completed > 0 },
      { id: 'completed', label: 'Completed', count: counts.completed }
    ]
  }, [bookings])

  // Filtered Bookings logic
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      // 1. Status Tab Filter
      if (selectedStatusTab === 'pending' && booking.status !== 'pending') return false
      if (selectedStatusTab === 'assigned' && !['assigned', 'en_route', 'arrived'].includes(booking.status)) return false
      if (selectedStatusTab === 'in_progress' && !['in_progress', 'inspection', 'quote_shared', 'quote_approved'].includes(booking.status)) return false
      if (selectedStatusTab === 'work_completed' && booking.status !== 'work_completed') return false
      if (selectedStatusTab === 'completed' && booking.status !== 'completed') return false

      // 2. Category Filter
      if (selectedCategoryFilter !== 'all' && booking.category_slug !== selectedCategoryFilter) return false

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const bNum = (booking.booking_number || '').toLowerCase()
        const title = (booking.service_title || '').toLowerCase()
        const name = (booking.customer_name || '').toLowerCase()
        const phone = (booking.customer_phone || '').toLowerCase()
        const addr = typeof booking.address_json === 'object'
          ? (booking.address_json?.full_address || '').toLowerCase()
          : (booking.address_json || '').toLowerCase()

        if (!bNum.includes(q) && !title.includes(q) && !name.includes(q) && !phone.includes(q) && !addr.includes(q)) {
          return false
        }
      }

      return true
    })
  }, [bookings, selectedStatusTab, selectedCategoryFilter, searchQuery])

  return (
    <div className="space-y-6">
      
      {/* Top Controls: Search, Filter, Refresh */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by #booking, phone, customer or street..."
            className="w-full bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm sm:text-base font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm transition-all"
          />
        </div>

        {/* Category & Refresh */}
        <div className="flex items-center gap-2.5">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="bg-white/90 dark:bg-[#1a1a1a]/90 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-800 dark:text-gray-200 focus:outline-none shadow-sm cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="ac-appliance">AC & Appliances</option>
            <option value="plumbing">Plumbing</option>
            <option value="electrician">Electrician</option>
            <option value="home-cleaning">Deep Cleaning</option>
            <option value="carpentry">Carpentry</option>
            <option value="pest-control">Pest Control</option>
          </select>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-3.5 bg-white/90 dark:bg-[#1a1a1a]/90 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-600 dark:text-gray-300 shadow-sm transition-all"
            title="Refresh Bookings"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin text-sky-500' : ''} />
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        {statusTabs.map((tab) => {
          const isActive = selectedStatusTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedStatusTab(tab.id)}
              className={`px-4 py-2.5 rounded-2xl text-sm font-black whitespace-nowrap transition-all flex items-center gap-2.5 border ${
                isActive
                  ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/20'
                  : 'bg-white/80 dark:bg-[#1a1a1a]/80 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                isActive
                  ? 'bg-white/25 text-white'
                  : tab.highlight
                    ? 'bg-amber-500 text-white animate-pulse'
                    : tab.alert
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
              }`}>
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Bookings Grid */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white/60 dark:bg-[#1a1a1a]/60 backdrop-blur-md border border-dashed border-gray-200 dark:border-white/10 rounded-3xl p-16 text-center">
          <Inbox className="w-16 h-16 text-gray-300 dark:text-white/20 mx-auto mb-4" />
          <h3 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-gray-100">
            No Service Bookings Found
          </h3>
          <p className="text-sm sm:text-base text-gray-400 mt-2 max-w-md mx-auto">
            {searchQuery
              ? `No results match "${searchQuery}". Try clearing filters or searching another keyword.`
              : `There are currently no active bookings under the "${selectedStatusTab}" tab.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map((booking) => (
            <JobCard
              key={booking.id}
              booking={booking}
              onSelect={onSelectBooking}
              onAccept={onAcceptBooking}
              onOpenAssign={onOpenAssign}
              onOpenOtp={onOpenOtp}
            />
          ))}
        </div>
      )}

    </div>
  )
}
