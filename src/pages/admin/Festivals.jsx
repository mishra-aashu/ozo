import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Plus,
  Search,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  AlertCircle,
  Tag,
  Bell,
  Sparkles,
  Clock,
  RefreshCw,
  Eye,
  Camera,
  Image as ImageIcon
} from 'lucide-react'
import { supabaseAdmin as supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import ImageUpload from '../../components/ImageUpload'

const Festivals = () => {
  const [festivals, setFestivals] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingFestival, setEditingFestival] = useState(null)

  // Google Calendar Integration States
  const [calendarHolidays, setCalendarHolidays] = useState([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false)
  const [calendarSearchQuery, setCalendarSearchQuery] = useState('')

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'Upcoming', 'Active', 'Completed'
  const [sortBy, setSortBy] = useState('actual_date') // 'actual_date', 'festival_name'

  // Inline Buffer Days Editing State
  const [editingBufferId, setEditingBufferId] = useState(null)
  const [tempBufferValue, setTempBufferValue] = useState('')

  // Form State
  const [formData, setFormData] = useState({
    festival_name: '',
    actual_date: '',
    buffer_days: 7,
    banner_url: '',
    category_id: '',
    tagline: '',
    custom_description: ''
  })

  // Fetch all categories (to link to festival)
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  // Fetch all festivals and run sync on load
  const syncAndFetchFestivals = async (showToast = false) => {
    let toastId
    if (showToast) {
      toastId = toast.loading('Syncing festival status with database...')
    }
    try {
      // Run the database function to update statuses and active/inactive categories
      const { data: syncData, error: syncError } = await supabase.rpc('sync_festival_campaigns')
      if (syncError) throw syncError

      if (showToast && syncData) {
        toast.success(
          `Sync complete! Updated ${syncData.updated_campaigns || 0} campaigns and sent ${syncData.notifications_sent || 0} alerts.`,
          { id: toastId }
        )
      }

      // Fetch the latest list of festivals
      const { data, error } = await supabase
        .from('festival_planner')
        .select('*')
        .order('actual_date', { ascending: true })

      if (error) throw error
      setFestivals(data || [])
    } catch (err) {
      console.error('Error syncing/fetching festivals:', err)
      toast.error('Failed to sync or load festivals!', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const fetchUpcomingHolidays = async () => {
    const apiKey = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY
    if (!apiKey) {
      toast.error('Google Calendar API Key is missing in env!')
      return
    }

    setCalendarLoading(true)
    try {
      const calendarId = 'en.indian#holiday@group.v.calendar.google.com'
      const timeMin = new Date().toISOString()
      const timeMax = new Date(new Date().getFullYear() + 1, 11, 31).toISOString()
      
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`
      
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`Google Calendar API error: ${res.statusText}`)
      }
      
      const data = await res.json()
      
      const holidayItems = (data.items || [])
        .map(item => ({
          name: item.summary,
          date: item.start?.date || item.start?.dateTime?.split('T')[0],
          description: item.description || ''
        }))
        .filter(h => h.name && h.date)
        
      setCalendarHolidays(holidayItems)
      setIsCalendarModalOpen(true)
    } catch (err) {
      console.error('Google Calendar fetch error:', err)
      toast.error('Failed to fetch Indian holidays from Google Calendar. Check API Key.')
    } finally {
      setCalendarLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
    syncAndFetchFestivals(false)
  }, [])

  // Inline Buffer Days Update Handler
  const handleSaveBufferInline = async (id, currentActualDate) => {
    const parsedVal = parseInt(tempBufferValue, 10)
    if (isNaN(parsedVal) || parsedVal < 0) {
      toast.error('Buffer days must be a non-negative integer!')
      return
    }

    const toastId = toast.loading('Updating buffer days...')
    try {
      const { error } = await supabase
        .from('festival_planner')
        .update({ buffer_days: parsedVal })
        .eq('id', id)

      if (error) throw error

      toast.success('Buffer days updated successfully!', { id: toastId })
      setEditingBufferId(null)
      // Refresh list to recalculate status & live dates
      await syncAndFetchFestivals(false)
    } catch (err) {
      console.error('Error updating buffer days inline:', err)
      toast.error('Failed to update buffer days.', { id: toastId })
    }
  }

  // Form Submition Handler (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    if (!formData.festival_name.trim()) {
      toast.error('Festival Name is required!')
      return
    }
    if (!formData.actual_date) {
      toast.error('Actual Date is required!')
      return
    }
    if (formData.buffer_days === '' || formData.buffer_days < 0) {
      toast.error('Buffer days must be 0 or more!')
      return
    }

    setSubmitting(true)
    const toastId = toast.loading(editingFestival ? 'Updating campaign planner...' : 'Creating new campaign planner...')

    try {
      const payload = {
        festival_name: formData.festival_name.trim(),
        actual_date: formData.actual_date,
        buffer_days: parseInt(formData.buffer_days, 10),
        banner_url: formData.banner_url || null,
        category_id: formData.category_id || null,
        tagline: formData.tagline?.trim() || null,
        custom_description: formData.custom_description?.trim() || null,
        updated_at: new Date().toISOString()
      }

      if (editingFestival) {
        const { error } = await supabase
          .from('festival_planner')
          .update(payload)
          .eq('id', editingFestival.id)

        if (error) throw error
        toast.success('Festival planner updated successfully!', { id: toastId })
      } else {
        const { error } = await supabase
          .from('festival_planner')
          .insert([payload])

        if (error) throw error
        toast.success('New festival planner added successfully!', { id: toastId })
      }

      setIsDrawerOpen(false)
      resetForm()
      await syncAndFetchFestivals(false)
    } catch (error) {
      console.error('Submit festival error:', error)
      toast.error(error.message || 'Saving failed. Check inputs.', { id: toastId })
    } finally {
      setSubmitting(false)
    }
  }

  // Delete Campaign Planner
  const handleDelete = async (festival) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${festival.festival_name}" planner?`)
    if (!confirmDelete) return

    const toastId = toast.loading('Deleting campaign...')
    try {
      const { error } = await supabase
        .from('festival_planner')
        .delete()
        .eq('id', festival.id)

      if (error) throw error

      toast.success('Campaign planner deleted successfully!', { id: toastId })
      await syncAndFetchFestivals(false)
    } catch (error) {
      console.error('Delete festival error:', error)
      toast.error(error.message || 'Failed to delete.', { id: toastId })
    }
  }

  const resetForm = () => {
    setFormData({
      festival_name: '',
      actual_date: '',
      buffer_days: 7,
      banner_url: '',
      category_id: '',
      tagline: '',
      custom_description: ''
    })
    setEditingFestival(null)
  }

  const handleEdit = (festival) => {
    setEditingFestival(festival)
    setFormData({
      festival_name: festival.festival_name || '',
      actual_date: festival.actual_date || '',
      buffer_days: festival.buffer_days ?? 7,
      banner_url: festival.banner_url || '',
      category_id: festival.category_id || '',
      tagline: festival.tagline || '',
      custom_description: festival.custom_description || ''
    })
    setIsDrawerOpen(true)
  }

  // Helper: calculate days between dates
  const getDaysDiff = (dateStr) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(dateStr)
    target.setHours(0, 0, 0, 0)
    const diffTime = target - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Alerts logic: identify campaigns that are active or starting within 10 days
  const alertsList = festivals
    .map(f => {
      const daysUntilActual = getDaysDiff(f.actual_date)
      const daysUntilStart = getDaysDiff(f.campaign_start_date)
      return {
        ...f,
        daysUntilActual,
        daysUntilStart
      }
    })
    .filter(f => {
      // Show alert if the campaign starts within 10 days, or is currently active
      return (f.status === 'Active') || (f.status === 'Upcoming' && f.daysUntilStart <= 10)
    })
    .sort((a, b) => a.daysUntilStart - b.daysUntilStart)

  // Filter and Sort Table Data
  const filteredFestivals = festivals
    .filter(f => {
      const matchesSearch = f.festival_name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || f.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (sortBy === 'actual_date') {
        return new Date(a.actual_date) - new Date(b.actual_date)
      } else if (sortBy === 'festival_name') {
        return a.festival_name.localeCompare(b.festival_name)
      }
      return 0
    })

  return (
    <div className="space-y-6 p-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium">
        <div>
          <h1 className="text-3xl font-black text-gradient flex items-center gap-2.5">
            <Sparkles className="w-8 h-8 text-fuchsia-500 animate-pulse" />
            Festival & Special Days Automation
          </h1>
          <p className="text-sm text-ozo-gray mt-1">
            Automate app banners, special store categories, and smart inventory push warning systems for Indian festivals.
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => syncAndFetchFestivals(true)}
            className="p-3 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-250 dark:border-white/10 rounded-2xl text-gray-500 hover:text-gray-700 dark:text-gray-400 transition-all active:scale-95 flex items-center justify-center"
            title="Force Run Sync Automation"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={fetchUpcomingHolidays}
            disabled={calendarLoading}
            className="flex items-center justify-center gap-2 bg-white dark:bg-white/5 border border-gray-250 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 text-gray-750 dark:text-gray-200 px-5 py-3 rounded-2xl font-bold shadow-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {calendarLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-fuchsia-500" />
            ) : (
              <Calendar className="w-5 h-5 text-fuchsia-500" />
            )}
            Import from Calendar
          </button>
          <button
            onClick={() => {
              resetForm()
              setIsDrawerOpen(true)
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-ozo text-white px-5 py-3 rounded-2xl font-bold shadow-ozo hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Festival Plan
          </button>
        </div>
      </div>

      {/* Alerts Carousel / Section */}
      {alertsList.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Bell className="w-4.5 h-4.5 text-red-500 animate-bounce" />
            Active & Upcoming Alerts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alertsList.map((alert) => {
              const isCurrentlyActive = alert.status === 'Active'
              
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-5 rounded-2xl border transition-all relative overflow-hidden shadow-sm ${
                    isCurrentlyActive
                      ? 'bg-gradient-to-r from-emerald-50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10 border-emerald-200 dark:border-emerald-900/30'
                      : 'bg-gradient-to-r from-amber-50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 border-amber-200 dark:border-amber-900/30'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`p-3.5 rounded-xl flex-shrink-0 ${
                      isCurrentlyActive 
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    }`}>
                      <Calendar className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          isCurrentlyActive 
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-350' 
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-350'
                        }`}>
                          {alert.status}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">
                          {isCurrentlyActive ? 'Live Campaign' : `Starts in ${alert.daysUntilStart}d`}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white mt-1.5 truncate text-base">
                        {alert.festival_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                        {isCurrentlyActive ? (
                          <>
                            <strong>Rakhi Special Store</strong> / Categories are active. The banner is shown on the home page.
                          </>
                        ) : (
                          <>
                            {alert.festival_name} aane me <strong>{alert.daysUntilActual} din</strong> bache hain. App Live Date (<strong>{new Date(alert.campaign_start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong>) aane wali hai.
                          </>
                        )}
                      </p>
                      
                      {/* Warning suggestion for Inventory */}
                      <div className="mt-3 flex items-start gap-2 text-xs text-gray-500 dark:text-gray-450 bg-white/50 dark:bg-black/20 p-2.5 rounded-xl border border-gray-100 dark:border-white/5">
                        <span className="text-sm">💡</span>
                        <span>
                          <strong>Smart Inventory Warning:</strong> Check stocks for sweets, puja samagri, and gifts for this festival.
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Main Content Filters & Table */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between p-4 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
        <div className="relative w-full lg:w-80">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            <Search className="w-4.5 h-4.5" />
          </span>
          <input
            type="text"
            placeholder="Search festivals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm text-gray-750 dark:text-gray-300 focus:outline-none focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_12px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
          >
            <option value="all">All Campaign Status</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Active">🟢 Active (Running)</option>
            <option value="Completed">⚪ Completed</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm text-gray-750 dark:text-gray-300 focus:outline-none focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_12px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
          >
            <option value="actual_date">Sort: Festival Date</option>
            <option value="festival_name">Sort: Festival Name</option>
          </select>
        </div>
      </div>

      {/* Datatable (Control Center) */}
      <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-ozo-red" />
            <p className="text-sm font-semibold text-gray-500">Loading automation data...</p>
          </div>
        ) : filteredFestivals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-4xl mb-4">🪔</span>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">No campaigns scheduled</h3>
            <p className="text-sm text-gray-500 mt-1">Change filters or add a new festival automation layout.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Festival Details</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Actual Date</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Buffer Days (Pehle)</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">App Live Date</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Linked Category</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Banner</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredFestivals.map((festival) => {
                  const isEditingBuffer = editingBufferId === festival.id
                  const matchedCategory = categories.find(c => c.id === festival.category_id)

                  return (
                    <tr key={festival.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-gray-850 dark:text-white block">
                          {festival.festival_name}
                        </span>
                        {festival.tagline && (
                          <span className="text-[10px] font-extrabold text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-950/20 px-1.5 py-0.5 rounded-md border border-fuchsia-100 dark:border-fuchsia-900/30 inline-block mt-0.5 mr-1">
                            {festival.tagline}
                          </span>
                        )}
                        {festival.custom_description && (
                          <span className="text-[11px] text-gray-500 block mt-1 line-clamp-1 italic">
                            "{festival.custom_description}"
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 font-mono block mt-1">
                          ID: {festival.id.substring(0, 8)}...
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-700 dark:text-gray-300 font-semibold">
                        {new Date(festival.actual_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="p-4 text-sm text-gray-700 dark:text-gray-300">
                        {isEditingBuffer ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              value={tempBufferValue}
                              onChange={(e) => setTempBufferValue(e.target.value)}
                              className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-white/10 bg-transparent rounded-lg text-center font-bold focus:ring-1 focus:ring-ozo-red outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveBufferInline(festival.id, festival.actual_date)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-md transition-all"
                            >
                              <Check className="w-4.5 h-4.5 stroke-[2.5]" />
                            </button>
                            <button
                              onClick={() => setEditingBufferId(null)}
                              className="p-1 text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-all"
                            >
                              <X className="w-4.5 h-4.5 stroke-[2.5]" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingBufferId(festival.id)
                              setTempBufferValue(festival.buffer_days.toString())
                            }}
                            className="group flex items-center gap-1 cursor-pointer hover:bg-gray-150/40 dark:hover:bg-white/5 px-2.5 py-1.5 rounded-xl border border-dashed border-transparent hover:border-gray-300 dark:hover:border-white/10 w-fit transition-all"
                            title="Click to edit buffer days"
                          >
                            <span className="font-extrabold text-gray-850 dark:text-white">
                              {festival.buffer_days}
                            </span>
                            <span className="text-xs text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                              Days
                            </span>
                            <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 ml-1.5 transition-opacity" />
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="font-bold text-ozo-gray dark:text-gray-300">
                            {new Date(festival.campaign_start_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        {matchedCategory ? (
                          <span className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-bold px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-900/30">
                            <Tag className="w-3.5 h-3.5" />
                            {matchedCategory.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">None linked</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {festival.banner_url ? (
                          <div className="relative inline-block w-12 h-8 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 group bg-gray-50">
                            <img
                              src={festival.banner_url}
                              alt="Banner placeholder"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                              <Eye
                                className="w-3.5 h-3.5 text-white"
                                onClick={() => {
                                  // Open in new tab
                                  window.open(festival.banner_url, '_blank')
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <ImageIcon className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                          festival.status === 'Active'
                            ? 'bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/30 animate-pulse'
                            : festival.status === 'Upcoming'
                            ? 'bg-amber-100 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                        }`}>
                          {festival.status === 'Active' ? '🟢 Active (Running)' : festival.status === 'Upcoming' ? '⚪ Upcoming' : '✅ Completed'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(festival)}
                            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl transition-all"
                            title="Edit Campaign Details"
                          >
                            <Pencil className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(festival)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl transition-all"
                            title="Delete Campaign"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-out Drawer for Create/Edit */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Drawer Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white dark:bg-[#121214] shadow-2xl border-l border-transparent dark:border-white/5 z-50 overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">
                    {editingFestival ? 'Edit Festival Plan' : 'Schedule Festival Plan'}
                  </h2>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1.5 hover:bg-gray-150 dark:hover:bg-white/5 rounded-full text-gray-500 dark:text-gray-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Festival Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider block">
                      Festival Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Diwali, Raksha Bandhan, Holi"
                      value={formData.festival_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, festival_name: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:ring-1 focus:ring-ozo-red outline-none dark:text-white"
                    />
                  </div>

                  {/* Festival Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider block">
                      Festival Actual Date
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.actual_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, actual_date: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:ring-1 focus:ring-ozo-red outline-none dark:text-white"
                    />
                  </div>

                  {/* Buffer Days */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider block">
                      Buffer Days (Pehle App Par Live)
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="e.g. 7 days ya 10 days"
                      value={formData.buffer_days}
                      onChange={(e) => setFormData(prev => ({ ...prev, buffer_days: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:ring-1 focus:ring-ozo-red outline-none dark:text-white"
                    />
                    <p className="text-[11px] text-gray-400">
                      Tyavahar se itne din pehle category aur banner automatically active ho jayenge app par.
                    </p>
                  </div>

                  {/* Associated Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider block">
                      Link App Category (Optional)
                    </label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:ring-1 focus:ring-ozo-red outline-none dark:text-white dark:bg-[#121214]"
                    >
                      <option value="">-- No Category Linked --</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-gray-405">
                      Jaise hi campaign live hoga, system automatically is category ko app par active (is_active = true) kar dega.
                    </p>
                  </div>

                  {/* Tagline */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider block">
                      Campaign Tagline
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Diwali Dhamaka, Special Offer, Holi Hungama"
                      value={formData.tagline}
                      onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:ring-1 focus:ring-ozo-red outline-none dark:text-white"
                    />
                    <p className="text-[11px] text-gray-400">
                      Banners ke upar aane wali bold tagline text.
                    </p>
                  </div>

                  {/* Custom Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider block">
                      Custom Description
                    </label>
                    <textarea
                      rows="2"
                      placeholder="e.g. Pooja items, sweets, and gifts delivered in 10 mins!"
                      value={formData.custom_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, custom_description: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:ring-1 focus:ring-ozo-red outline-none dark:text-white resize-none"
                    />
                    <p className="text-[11px] text-gray-400">
                      Banners ke upar aane wali detail description text.
                    </p>
                  </div>

                  {/* Banner Upload */}
                  <div className="space-y-1.5">
                    <ImageUpload
                      label="Campaign Banner Placeholder"
                      value={formData.banner_url}
                      onChange={(url) => setFormData(prev => ({ ...prev, banner_url: url }))}
                      customNamePrefix={`festival_banner_${formData.festival_name || 'custom'}`}
                    />
                    <p className="text-[11px] text-gray-400">
                      Campaign banner upload karein. App/Web is banner placeholder ko campaign start date par live kar denge.
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => setIsDrawerOpen(false)}
                      className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold text-gray-650 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-ozo text-white py-3 px-4 rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {submitting && <Loader2 className="w-4.5 h-4.5 animate-spin" />}
                      Save Campaign
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Google Calendar Holiday Import Modal */}
      <AnimatePresence>
        {isCalendarModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCalendarModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl bg-white dark:bg-[#121214] shadow-2xl rounded-3xl border border-transparent dark:border-white/5 z-50 flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5.5 h-5.5 text-fuchsia-500" />
                    Indian Holidays & Festivals
                  </h2>
                  <p className="text-xs text-ozo-gray mt-0.5">
                    Select a holiday from Google Calendar to quickly configure a campaign.
                  </p>
                </div>
                <button
                  onClick={() => setIsCalendarModalOpen(false)}
                  className="p-1.5 hover:bg-gray-150 dark:hover:bg-white/5 rounded-full text-gray-500 dark:text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Search */}
              <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01]">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search holidays (e.g. Diwali, Holi)..."
                    value={calendarSearchQuery}
                    onChange={(e) => setCalendarSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-250 dark:border-white/10 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-ozo-red dark:text-white"
                  />
                </div>
              </div>

              {/* Modal Body - List of Holidays */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {calendarHolidays
                  .filter(h => h.name.toLowerCase().includes(calendarSearchQuery.toLowerCase()))
                  .map((holiday, idx) => {
                    const alreadyExists = festivals.some(f => 
                      f.festival_name.toLowerCase() === holiday.name.toLowerCase() || 
                      f.actual_date === holiday.date
                    )
                    
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          alreadyExists
                            ? 'bg-gray-50/50 dark:bg-white/[0.01] border-gray-100 dark:border-white/5 opacity-60'
                            : 'bg-white dark:bg-[#1a1a1a] border-gray-150 dark:border-white/5 hover:border-gray-250 dark:hover:border-white/10 shadow-sm'
                        }`}
                      >
                        <div>
                          <h4 className="font-bold text-gray-850 dark:text-white text-sm">
                            {holiday.name}
                          </h4>
                          <span className="text-xs font-semibold text-gray-450 dark:text-gray-400 mt-0.5 block">
                            {new Date(holiday.date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                        </div>

                        <div>
                          {alreadyExists ? (
                            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Scheduled
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                // Pre-fill and open drawer
                                setFormData({
                                  festival_name: holiday.name,
                                  actual_date: holiday.date,
                                  buffer_days: 7,
                                  banner_url: '',
                                  category_id: '',
                                  tagline: `${holiday.name} Special!`,
                                  custom_description: `${holiday.name} ki taiyari shuru karein OZO ke sath! Best deals & rapid delivery.`
                                })
                                setIsCalendarModalOpen(false)
                                setIsDrawerOpen(true)
                              }}
                              className="text-xs font-bold text-white bg-gradient-ozo px-3.5 py-2 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-sm"
                            >
                              Setup Campaign
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                {calendarHolidays.filter(h => h.name.toLowerCase().includes(calendarSearchQuery.toLowerCase())).length === 0 && (
                  <div className="text-center py-12">
                    <span className="text-3xl">📅</span>
                    <h4 className="font-bold text-gray-800 dark:text-white mt-2">No matching holidays found</h4>
                    <p className="text-xs text-gray-500 mt-1">Try searching for other terms.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Festivals
