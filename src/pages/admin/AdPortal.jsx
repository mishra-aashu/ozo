import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  Image as ImageIcon,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Megaphone,
  ExternalLink,
  MapPin,
  Eye,
  EyeOff,
  Sparkles,
  Tag,
  Globe
} from 'lucide-react'
import { supabaseAdmin as supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import ImageUpload from '../../components/ImageUpload'
import ConfirmModal from '../../components/ConfirmModal'

export default function AdPortal() {
  const [ads, setAds] = useState([])
  const [activeCities, setActiveCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingAd, setEditingAd] = useState(null)
  const [confirmDeleteAd, setConfirmDeleteAd] = useState(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [cityFilter, setCityFilter] = useState('all_filter')
  const [statusFilter, setStatusFilter] = useState('all')

  // Image upload
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    targetLink: '',
    citySlug: 'all',
    badgeText: 'LOCAL PROMO',
    displayOrder: 0,
    isActive: true
  })

  // Fetch active operating cities for city selector dropdown
  const fetchCities = async () => {
    try {
      const { data } = await supabase
        .from('operating_cities')
        .select('slug, name, state')
        .eq('is_active', true)
        .order('name')
      if (data) setActiveCities(data)
    } catch (err) {
      console.error('Error fetching operating cities:', err)
    }
  }

  // Fetch ads from database
  const fetchAds = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('city_ads')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error
      setAds(data || [])
    } catch (err) {
      console.error('Error fetching city ads:', err)
      toast.error('Failed to load city ads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCities()
    fetchAds()
  }, [])

  // Open Drawer for Create or Edit
  const handleOpenDrawer = (ad = null) => {
    if (ad) {
      setEditingAd(ad)
      setFormData({
        title: ad.title || '',
        subtitle: ad.subtitle || '',
        imageUrl: ad.image_url || '',
        targetLink: ad.target_link || '',
        citySlug: ad.city_slug || 'all',
        badgeText: ad.badge_text || 'LOCAL PROMO',
        displayOrder: ad.display_order ?? 0,
        isActive: ad.is_active ?? true
      })
    } else {
      setEditingAd(null)
      setFormData({
        title: '',
        subtitle: '',
        imageUrl: '',
        targetLink: '',
        citySlug: 'all',
        badgeText: 'LOCAL PROMO',
        displayOrder: ads.length + 1,
        isActive: true
      })
    }
    setIsDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setEditingAd(null)
  }

  // Handle Create / Update Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error('Ad Title is required')
      return
    }
    if (!formData.imageUrl.trim()) {
      toast.error('Banner Image is required')
      return
    }

    setSubmitting(true)
    const toastId = toast.loading(editingAd ? 'Updating Ad Banner...' : 'Creating New Ad Banner...')

    try {
      const payload = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim() || null,
        image_url: formData.imageUrl.trim(),
        target_link: formData.targetLink.trim() || null,
        city_slug: formData.citySlug || 'all',
        badge_text: formData.badgeText.trim() || null,
        display_order: parseInt(formData.displayOrder) || 0,
        is_active: formData.isActive,
        updated_at: new Date().toISOString()
      }

      if (editingAd) {
        const { error } = await supabase
          .from('city_ads')
          .update(payload)
          .eq('id', editingAd.id)
        if (error) throw error
        toast.success('Ad Banner updated successfully!', { id: toastId })
      } else {
        const { error } = await supabase
          .from('city_ads')
          .insert([payload])
        if (error) throw error
        toast.success('New Ad Banner created!', { id: toastId })
      }

      handleCloseDrawer()
      fetchAds()
    } catch (err) {
      console.error('Submit error:', err)
      toast.error(err.message || 'Failed to save Ad Banner', { id: toastId })
    } finally {
      setSubmitting(false)
    }
  }

  // Toggle Active Status
  const handleToggleActive = async (ad) => {
    const newStatus = !ad.is_active
    try {
      const { error } = await supabase
        .from('city_ads')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', ad.id)

      if (error) throw error

      setAds(prev => prev.map(item => item.id === ad.id ? { ...item, is_active: newStatus } : item))
      toast.success(newStatus ? 'Ad Banner activated' : 'Ad Banner deactivated')
    } catch (err) {
      console.error('Toggle status error:', err)
      toast.error('Failed to update status')
    }
  }

  // Delete Ad
  const handleDeleteAd = async () => {
    if (!confirmDeleteAd) return
    const toastId = toast.loading('Deleting Ad Banner...')
    try {
      const { error } = await supabase
        .from('city_ads')
        .delete()
        .eq('id', confirmDeleteAd.id)

      if (error) throw error
      toast.success('Ad Banner deleted successfully', { id: toastId })
      setAds(prev => prev.filter(item => item.id !== confirmDeleteAd.id))
      setConfirmDeleteAd(null)
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Failed to delete Ad Banner', { id: toastId })
    }
  }

  // Filtered Ads List
  const filteredAds = ads.filter(ad => {
    const matchesSearch =
      (ad.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ad.subtitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ad.badge_text || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCity =
      cityFilter === 'all_filter'
        ? true
        : cityFilter === 'global_only'
        ? ad.city_slug === 'all'
        : ad.city_slug === cityFilter

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? ad.is_active
        : !ad.is_active

    return matchesSearch && matchesCity && matchesStatus
  })

  const getCityNameBySlug = (slug) => {
    if (!slug || slug === 'all') return 'All Cities (Global)'
    const matched = activeCities.find(c => c.slug === slug)
    return matched ? matched.name.split(',')[0].trim() : slug
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-150 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Megaphone size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight font-display">
              City Ad Portal
            </h1>
            <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 mt-0.5">
              Manage hero sub-banners, city promos, and sponsored ads shown on the Home Page
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAds()}
            disabled={loading}
            className="p-3 rounded-2xl border border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400 transition"
            title="Refresh List"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => handleOpenDrawer()}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-ozo-red to-rose-600 hover:from-rose-600 hover:to-ozo-red text-white font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition active:scale-95"
          >
            <Plus size={16} />
            <span>Create New Ad</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-150 dark:border-zinc-800 shadow-sm">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title, badge, subtitle..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red"
          />
        </div>

        {/* City Filter */}
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-gray-400 shrink-0" />
          <select
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            className="w-full py-2.5 px-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red"
          >
            <option value="all_filter">All Cities (Filter Off)</option>
            <option value="global_only">Global Only (All Cities)</option>
            {activeCities.map(c => (
              <option key={c.slug} value={c.slug}>
                {c.name.split(',')[0]} ({c.state || 'Bihar'})
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-gray-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full py-2.5 px-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Ads List Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-150 dark:border-zinc-800">
          <Loader2 size={36} className="animate-spin text-ozo-red mb-3" />
          <p className="text-xs font-bold text-gray-500">Loading City Ads...</p>
        </div>
      ) : filteredAds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-150 dark:border-zinc-800 text-center px-4">
          <ImageIcon size={48} className="text-gray-300 dark:text-zinc-700 mb-3" />
          <h3 className="text-base font-extrabold text-gray-900 dark:text-white">No Ads Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mt-1 mb-5">
            {searchQuery || cityFilter !== 'all_filter'
              ? 'No ads match your current search/filter settings.'
              : 'Create your first city promo ad to showcase right below the home page hero banner.'}
          </p>
          <button
            onClick={() => handleOpenDrawer()}
            className="px-5 py-2.5 rounded-xl bg-ozo-red text-white text-xs font-black uppercase tracking-wider shadow-md hover:bg-rose-600 transition"
          >
            + Create Ad Banner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAds.map(ad => (
            <div
              key={ad.id}
              className={`relative bg-white dark:bg-zinc-900 rounded-3xl border ${
                ad.is_active ? 'border-gray-200 dark:border-zinc-800 shadow-sm' : 'border-red-200 dark:border-red-950/40 opacity-75'
              } overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300`}
            >
              {/* Banner Image Preview */}
              <div className="relative h-44 w-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                <img
                  src={ad.image_url}
                  alt={ad.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Badge Overlay */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="bg-amber-500 text-black font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    {ad.badge_text || 'PROMO'}
                  </span>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm ${
                    ad.city_slug === 'all'
                      ? 'bg-sky-500 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    {ad.city_slug === 'all' ? '🌐 All Cities' : `📍 ${getCityNameBySlug(ad.city_slug)}`}
                  </span>
                </div>

                {/* Toggle Status Button */}
                <button
                  onClick={() => handleToggleActive(ad)}
                  className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md text-white shadow-md transition ${
                    ad.is_active ? 'bg-emerald-500/80 hover:bg-emerald-600' : 'bg-rose-500/80 hover:bg-rose-600'
                  }`}
                  title={ad.is_active ? 'Click to Deactivate' : 'Click to Activate'}
                >
                  {ad.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>

                {/* Title inside Banner Overlay */}
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-white font-extrabold text-base line-clamp-1 leading-tight drop-shadow-sm">
                    {ad.title}
                  </h3>
                  {ad.subtitle && (
                    <p className="text-white/80 font-medium text-xs line-clamp-1 mt-0.5">
                      {ad.subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Info Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5 text-xs text-gray-600 dark:text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Target Link:</span>
                    {ad.target_link ? (
                      <a
                        href={ad.target_link}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-ozo-red hover:underline truncate max-w-[180px] flex items-center gap-1"
                      >
                        <span className="truncate">{ad.target_link}</span>
                        <ExternalLink size={12} className="shrink-0" />
                      </a>
                    ) : (
                      <span className="text-gray-400 italic">None (Display only)</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Order Index:</span>
                    <span className="font-bold text-gray-900 dark:text-white">#{ad.display_order ?? 0}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleActive(ad)}
                    className={`text-[11px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-xl border transition ${
                      ad.is_active
                        ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
                        : 'border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5'
                    }`}
                  >
                    {ad.is_active ? 'Active' : 'Inactive'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenDrawer(ad)}
                      className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition"
                      title="Edit Ad"
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      onClick={() => setConfirmDeleteAd(ad)}
                      className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition"
                      title="Delete Ad"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawer / Modal Form for Create & Edit */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-[150] flex justify-end bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={handleCloseDrawer}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col z-10 border-l border-gray-150 dark:border-zinc-800 overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-gray-150 dark:border-zinc-800 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-ozo-red/10 text-ozo-red flex items-center justify-center">
                    <Megaphone size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                      {editingAd ? 'Edit Ad Banner' : 'Create New Ad Banner'}
                    </h2>
                    <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      Configure banner text, link, target city, and image
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCloseDrawer}
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                    Ad Title <span className="text-ozo-red">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 50% Off Fresh Vegetables, Heavy Discounts!"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red"
                  />
                </div>

                {/* Subtitle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                    Subtitle / Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Order fresh organic produce delivered in 10 mins"
                    value={formData.subtitle}
                    onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red"
                  />
                </div>

                {/* Target City */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                    Target City
                  </label>
                  <select
                    value={formData.citySlug}
                    onChange={e => setFormData({ ...formData, citySlug: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red"
                  >
                    <option value="all">🌐 All Cities (Global Ad)</option>
                    {activeCities.map(c => (
                      <option key={c.slug} value={c.slug}>
                        📍 {c.name.split(',')[0]} ({c.state || 'Bihar'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-semibold">
                    Pick a specific city to show this ad ONLY to users browsing that city, or choose "All Cities".
                  </p>
                </div>

                {/* Target Click Link */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                    Click Link / Route (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. /category/fresh-vegetables OR https://..."
                    value={formData.targetLink}
                    onChange={e => setFormData({ ...formData, targetLink: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red"
                  />
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-semibold">
                    When user clicks the banner, they will be redirected to this category, product, or URL.
                  </p>
                </div>

                {/* Badge Text & Display Order Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                      Badge Label
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. LOCAL PROMO"
                      value={formData.badgeText}
                      onChange={e => setFormData({ ...formData, badgeText: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={formData.displayOrder}
                      onChange={e => setFormData({ ...formData, displayOrder: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-ozo-red"
                    />
                  </div>
                </div>

                {/* Banner Image Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                    Banner Image <span className="text-ozo-red">*</span>
                  </label>
                  <ImageUpload
                    value={formData.imageUrl}
                    onChange={url => setFormData({ ...formData, imageUrl: url })}
                    onUploadingChange={setIsUploadingImage}
                    folder="city-ads"
                  />
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border border-gray-200 dark:border-zinc-750">
                  <div>
                    <p className="font-extrabold text-sm text-gray-900 dark:text-white">Active Status</p>
                    <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                      Enable to show this ad banner immediately on home page
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
                      formData.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        formData.isActive ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Form Actions */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-150 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={handleCloseDrawer}
                    className="px-5 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 text-xs font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || isUploadingImage}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-ozo-red to-rose-600 hover:from-rose-600 hover:to-ozo-red text-white text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition active:scale-95 disabled:opacity-60"
                  >
                    {submitting ? 'Saving...' : editingAd ? 'Update Ad' : 'Publish Ad Banner'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Modal */}
      {confirmDeleteAd && (
        <ConfirmModal
          isOpen={!!confirmDeleteAd}
          onClose={() => setConfirmDeleteAd(null)}
          onConfirm={handleDeleteAd}
          title="Delete Ad Banner"
          message={`Are you sure you want to delete "${confirmDeleteAd.title}"? This action cannot be undone.`}
          confirmText="Yes, Delete"
        />
      )}
    </div>
  )
}
