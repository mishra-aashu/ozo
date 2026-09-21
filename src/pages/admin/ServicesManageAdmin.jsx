import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wrench,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Tag,
  Clock,
  Star,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Filter,
  DollarSign,
  AlertCircle,
  Phone,
  User,
  MapPin,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Camera,
  ExternalLink,
  Eye,
  Image as ImageIcon,
  Save
} from 'lucide-react'
import { useServicesStore } from '../../stores/servicesStore'
import CategoryIcon from '../../utils/serviceIcons'
import SEO from '../../components/SEO'
import toast from 'react-hot-toast'

export default function ServicesManageAdmin() {
  const {
    categories,
    services,
    bookings,
    visitingFeeDefault,
    visitingFeesByCity,
    inquiries,
    fetchCategories,
    fetchServices,
    fetchBookings,
    fetchVisitingFees,
    updateVisitingFees,
    fetchInquiries,
    updateInquiryStatus,
    addCategory,
    updateCategory,
    deleteCategory,
    addService,
    updateService,
    deleteService,
    updateBookingStatus,
    isLoading
  } = useServicesStore()

  const [activeTab, setActiveTab] = useState('services') // 'services' | 'categories' | 'bookings' | 'inquiries'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all')

  // Visiting Fees Local Admin Edit State
  const [adminDefaultFee, setAdminDefaultFee] = useState(visitingFeeDefault || 99)
  const [adminCityFees, setAdminCityFees] = useState(visitingFeesByCity || {})
  const [newCityInput, setNewCityInput] = useState('')
  const [newFeeInput, setNewFeeInput] = useState('')
  const [previewImage, setPreviewImage] = useState(null)

  useEffect(() => {
    fetchCategories(true)
    fetchServices()
    fetchBookings()
    fetchVisitingFees()
    fetchInquiries()
  }, [])

  useEffect(() => {
    setAdminDefaultFee(visitingFeeDefault)
    setAdminCityFees(visitingFeesByCity || {})
  }, [visitingFeeDefault, visitingFeesByCity])

  // Modals
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [serviceForm, setServiceForm] = useState({
    title: '',
    category_slug: 'plumbing',
    category: 'Plumbing',
    description: '',
    price: '',
    original_price: '',
    estimated_duration_mins: '45',
    tag: 'Verified',
    badge: '',
    image_url: '',
    is_active: true
  })

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [categoryForm, setCategoryForm] = useState({
    title: '',
    slug: '',
    icon: '🛠️',
    description: '',
    priceStarting: '199',
    badge: '',
    position: 1,
    is_active: true
  })

  useEffect(() => {
    fetchCategories(true)
    fetchServices()
    fetchBookings()
  }, [])

  // Filtered Services
  const filteredServices = services.filter((s) => {
    const matchesSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCat = selectedCategoryFilter === 'all' || s.category_slug === selectedCategoryFilter
    return matchesSearch && matchesCat
  })

  // Open Add/Edit Service Modal
  const handleOpenServiceModal = (service = null) => {
    if (service) {
      setEditingService(service)
      setServiceForm({
        title: service.title || '',
        category_slug: service.category_slug || 'plumbing',
        category: service.category || 'Plumbing',
        description: service.description || '',
        price: service.price || '',
        original_price: service.original_price || '',
        estimated_duration_mins: service.estimated_duration_mins || '45',
        tag: service.tag || 'Verified',
        badge: service.badge || '',
        image_url: service.image_url || '',
        is_active: service.is_active !== undefined ? service.is_active : true
      })
    } else {
      setEditingService(null)
      setServiceForm({
        title: '',
        category_slug: categories[0]?.slug || 'plumbing',
        category: categories[0]?.title || 'Plumbing',
        description: '',
        price: '199',
        original_price: '299',
        estimated_duration_mins: '45',
        tag: 'Verified',
        badge: '',
        image_url: '',
        is_active: true
      })
    }
    setIsServiceModalOpen(true)
  }

  // Save Service
  const handleSaveService = async (e) => {
    e.preventDefault()
    if (!serviceForm.title.trim() || !serviceForm.price) {
      toast.error('Please enter service title and price')
      return
    }

    const matchedCat = categories.find(c => c.slug === serviceForm.category_slug)
    const categoryName = matchedCat ? matchedCat.title : serviceForm.category

    if (editingService) {
      await updateService(editingService.id, {
        ...serviceForm,
        category: categoryName,
        price: parseFloat(serviceForm.price),
        original_price: serviceForm.original_price ? parseFloat(serviceForm.original_price) : null,
        estimated_duration_mins: parseInt(serviceForm.estimated_duration_mins) || 45
      })
    } else {
      await addService({
        ...serviceForm,
        category: categoryName,
        price: parseFloat(serviceForm.price),
        original_price: serviceForm.original_price ? parseFloat(serviceForm.original_price) : null,
        estimated_duration_mins: parseInt(serviceForm.estimated_duration_mins) || 45
      })
    }
    setIsServiceModalOpen(false)
  }

  // Open Add/Edit Category Modal
  const handleOpenCategoryModal = (category = null) => {
    if (category) {
      setEditingCategory(category)
      setCategoryForm({
        title: category.title || '',
        slug: category.slug || '',
        icon: category.icon || '🛠️',
        description: category.description || '',
        priceStarting: category.priceStarting || '199',
        badge: category.badge || '',
        position: category.position || 1,
        is_active: category.is_active !== undefined ? category.is_active : true
      })
    } else {
      setEditingCategory(null)
      setCategoryForm({
        title: '',
        slug: '',
        icon: '🛠️',
        description: '',
        priceStarting: '199',
        badge: '',
        position: categories.length + 1,
        is_active: true
      })
    }
    setIsCategoryModalOpen(true)
  }

  // Save Category
  const handleSaveCategory = async (e) => {
    e.preventDefault()
    if (!categoryForm.title.trim()) {
      toast.error('Please enter category title')
      return
    }

    if (editingCategory) {
      await updateCategory(editingCategory.id, {
        ...categoryForm,
        priceStarting: parseFloat(categoryForm.priceStarting) || 199,
        position: parseInt(categoryForm.position) || 1
      })
    } else {
      await addCategory({
        ...categoryForm,
        priceStarting: parseFloat(categoryForm.priceStarting) || 199,
        position: parseInt(categoryForm.position) || 1
      })
    }
    setIsCategoryModalOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d0d] p-4 sm:p-6 lg:p-8 text-left transition-colors">
      <SEO title="OZO Services Manager - Admin Dashboard" />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-900 via-blue-900 to-black rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-black uppercase px-3 py-1 rounded-full tracking-wider inline-flex items-center gap-1.5">
            <Wrench size={13} className="animate-pulse" />
            <span>OZO Services Control Center</span>
          </span>
          <h1 className="text-2xl sm:text-4xl font-black mt-3">Doorstep Services Manager</h1>
          <p className="text-xs sm:text-sm text-sky-200/80 mt-1 font-medium max-w-xl">
            Add, edit & organize doorstep repair categories, service pricing rate cards, and monitor customer booking visits.
          </p>
        </div>

        <button
          onClick={() => {
            fetchCategories(true)
            fetchServices()
            fetchBookings()
            toast.success('Services data refreshed!')
          }}
          className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-xs flex items-center gap-2 transition-all border border-white/10 shrink-0"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Catalog</span>
        </button>
      </div>

      {/* Overview Stats Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-200 dark:border-white/10 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center font-bold">
            <Layers size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400">Categories</p>
            <p className="text-xl font-black text-gray-900 dark:text-white">{categories.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-200 dark:border-white/10 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
            <Wrench size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400">Catalog Services</p>
            <p className="text-xl font-black text-gray-900 dark:text-white">{services.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-200 dark:border-white/10 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400">Active Offerings</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {services.filter(s => s.is_active).length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-200 dark:border-white/10 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-gray-400">Doorstep Visits</p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400">{bookings.length}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/10 mb-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('services')}
          className={`pb-3 px-4 font-black text-sm flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'services'
              ? 'border-sky-500 text-sky-500'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Wrench size={16} />
          <span>Services Catalog ({services.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 px-4 font-black text-sm flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'categories'
              ? 'border-sky-500 text-sky-500'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Layers size={16} />
          <span>Service Categories ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 px-4 font-black text-sm flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'bookings'
              ? 'border-sky-500 text-sky-500'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Calendar size={16} />
          <span>Customer Bookings ({bookings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('inquiries')}
          className={`pb-3 px-4 font-black text-sm flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'inquiries'
              ? 'border-sky-500 text-sky-500'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare size={16} />
          <span>Inquiries & Visiting Fees ({inquiries.length})</span>
        </button>
      </div>

      {/* TAB 1: SERVICES CATALOG */}
      {activeTab === 'services' && (
        <div>
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
            <div className="flex flex-1 items-center gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search service title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-2xl text-xs font-bold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Category Filter */}
              <div className="relative shrink-0">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="pl-3.5 pr-8 py-2.5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-2xl text-xs font-bold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer appearance-none shadow-sm transition-all"
                >
                  <option value="all" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.slug} className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white">
                      {c.title}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <button
              onClick={() => handleOpenServiceModal()}
              className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-2xl font-black text-xs shadow-md transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shrink-0"
            >
              <Plus size={16} />
              <span>Add New Service</span>
            </button>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {filteredServices.map((item) => (
              <div
                key={item.id}
                className={`bg-white dark:bg-[#1a1a1a] rounded-3xl p-5 border transition-all flex flex-col justify-between relative group ${
                  item.is_active
                    ? 'border-gray-200 dark:border-white/10 shadow-sm hover:shadow-xl hover:border-sky-500/30'
                    : 'border-red-200 dark:border-red-950/40 bg-red-50/20 dark:bg-red-950/10 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-500 bg-sky-500/10 px-2.5 py-1 rounded-lg">
                      {item.category || item.category_slug}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          {item.badge}
                        </span>
                      )}
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        item.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-extrabold text-gray-900 dark:text-white leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {item.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <Clock size={13} /> {item.estimated_duration_mins || 45} mins
                    </span>
                    {item.rating && (
                      <span className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star size={13} fill="currentColor" /> {item.rating}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-gray-900 dark:text-white">₹{item.price}</span>
                      {item.original_price && (
                        <span className="text-xs font-semibold text-gray-400 line-through">₹{item.original_price}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">Rate card price</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenServiceModal(item)}
                      className="p-2 bg-gray-100 dark:bg-white/10 hover:bg-sky-500 hover:text-white rounded-xl text-gray-600 dark:text-gray-300 transition-all"
                      title="Edit Service"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete service "${item.title}"?`)) {
                          deleteService(item.id)
                        }
                      }}
                      className="p-2 bg-gray-100 dark:bg-white/10 hover:bg-red-500 hover:text-white rounded-xl text-gray-600 dark:text-gray-300 transition-all"
                      title="Delete Service"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredServices.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-200 dark:border-white/10">
              <Wrench size={40} className="mx-auto text-gray-400 mb-3 opacity-50" />
              <p className="text-base font-bold text-gray-700 dark:text-gray-300">No Services Found</p>
              <p className="text-xs text-gray-400 mt-1">Click "Add New Service" to create your first doorstep offering.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SERVICE CATEGORIES */}
      {activeTab === 'categories' && (
        <div>
          <div className="flex items-center justify-between gap-4 mb-6">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
              Manage service verticals displayed on user home & categories catalog.
            </p>
            <button
              onClick={() => handleOpenCategoryModal()}
              className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-2xl font-black text-xs shadow-md transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shrink-0"
            >
              <Plus size={16} />
              <span>Add Service Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-5 border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm bg-gray-900 border border-gray-200 dark:border-white/10 flex items-center justify-center p-0.5 shrink-0">
                      <CategoryIcon icon={cat.icon} slug={cat.slug} title={cat.title} className="w-full h-full object-cover rounded-xl" />
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      cat.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {cat.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-gray-900 dark:text-white">{cat.title}</h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">/{cat.slug}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{cat.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500">Starts @ ₹{cat.priceStarting || 199}</span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenCategoryModal(cat)}
                      className="p-2 bg-gray-100 dark:bg-white/10 hover:bg-sky-500 hover:text-white rounded-xl text-gray-600 dark:text-gray-300 transition-all"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete category "${cat.title}"?`)) {
                          deleteCategory(cat.id)
                        }
                      }}
                      className="p-2 bg-gray-100 dark:bg-white/10 hover:bg-red-500 hover:text-white rounded-xl text-gray-600 dark:text-gray-300 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMER BOOKINGS */}
      {activeTab === 'bookings' && (
        <div>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900 dark:text-white">Recent Doorstep Service Visits</h3>
              <span className="text-xs font-bold text-gray-400">{bookings.length} Bookings Total</span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {bookings.map((booking) => (
                <div key={booking.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-sky-500">#{booking.booking_number || booking.id.slice(0, 8)}</span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        booking.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                        booking.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                        'bg-amber-500/10 text-amber-500'
                      }`}>
                        {booking.status}
                      </span>
                    </div>

                    <p className="text-sm font-extrabold text-gray-900 dark:text-white">
                      Service Visit Total: ₹{booking.total_amount || 499}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Calendar size={12} /> Scheduled: {booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString() : 'Immediate Visit'}
                    </p>
                  </div>

                  <div className="relative">
                    <select
                      value={booking.status || 'pending'}
                      onChange={(e) => updateBookingStatus(booking.id, e.target.value)}
                      className="pl-3 pr-7 py-1.5 bg-gray-100 dark:bg-[#26262a] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-800 dark:text-white focus:ring-2 focus:ring-sky-500 cursor-pointer appearance-none shadow-sm"
                    >
                      <option value="pending" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white">Pending</option>
                      <option value="confirmed" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white">Confirmed</option>
                      <option value="in_progress" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white">In Progress</option>
                      <option value="completed" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white">Completed</option>
                      <option value="cancelled" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white">Cancelled</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              ))}

              {bookings.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-xs font-bold">
                  No active customer bookings registered yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INQUIRIES & VISITING FEES */}
      {activeTab === 'inquiries' && (
        <div className="space-y-8">
          {/* SECTION 1: VISITING & INSPECTION FEES CONFIGURATOR */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 sm:p-7 border border-gray-200 dark:border-white/10 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-white/10 pb-5 mb-6">
              <div>
                <span className="text-[10px] font-black uppercase text-sky-500 bg-sky-500/10 px-2.5 py-0.5 rounded-full">
                  Dynamic Location Pricing
                </span>
                <h3 className="text-lg font-black text-gray-900 dark:text-white mt-1">
                  Doorstep Visiting / Inspection Fee Settings
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Configure default inspection fees & city-wise rules. Non-hardcoded & saved in database!
                </p>
              </div>

              <button
                type="button"
                onClick={() => updateVisitingFees(adminDefaultFee, adminCityFees)}
                className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-all"
              >
                <Save size={15} />
                <span>Save Fee Settings</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Default Fee */}
              <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
                <label className="block text-xs font-black uppercase text-gray-500 dark:text-gray-400 mb-1.5">
                  Global Default Visiting Fee (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm">₹</span>
                  <input
                    type="number"
                    value={adminDefaultFee}
                    onChange={(e) => setAdminDefaultFee(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-sm font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <p className="text-[11px] text-gray-400 font-medium mt-2">
                  Applied to any city without custom fee rules.
                </p>
              </div>

              {/* City Specific Override List */}
              <div className="md:col-span-2 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
                <h4 className="text-xs font-black uppercase text-gray-500 dark:text-gray-400 mb-3">
                  City-Wise Specific Fee Rules
                </h4>

                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
                  {Object.entries(adminCityFees).map(([city, fee]) => (
                    <div key={city} className="flex items-center justify-between p-2.5 bg-white dark:bg-[#121212] rounded-xl border border-gray-200 dark:border-white/10">
                      <span className="text-xs font-black text-gray-800 dark:text-white">{city}</span>
                      <div className="flex items-center gap-3">
                        <div className="relative w-24">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">₹</span>
                          <input
                            type="number"
                            value={fee}
                            onChange={(e) => {
                              const newVal = parseFloat(e.target.value) || 0
                              setAdminCityFees({ ...adminCityFees, [city]: newVal })
                            }}
                            className="w-full pl-6 pr-2 py-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-bold text-gray-900 dark:text-white text-right"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const copy = { ...adminCityFees }
                            delete copy[city]
                            setAdminCityFees(copy)
                          }}
                          className="text-red-500 hover:text-red-600 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add New City Rule */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-white/10">
                  <input
                    type="text"
                    placeholder="New City (e.g. Ranchi)"
                    value={newCityInput}
                    onChange={(e) => setNewCityInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder="Fee (₹)"
                    value={newFeeInput}
                    onChange={(e) => setNewFeeInput(e.target.value)}
                    className="w-24 px-3 py-1.5 bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newCityInput.trim() || !newFeeInput) {
                        toast.error('Enter city name and fee')
                        return
                      }
                      setAdminCityFees({ ...adminCityFees, [newCityInput.trim()]: parseFloat(newFeeInput) || 99 })
                      setNewCityInput('')
                      setNewFeeInput('')
                      toast.success(`Rule added for ${newCityInput.trim()}`)
                    }}
                    className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: CUSTOMER INQUIRIES LIST */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 sm:p-7 border border-gray-200 dark:border-white/10 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-white/10 pb-5 mb-6">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  Customer Submissions
                </span>
                <h3 className="text-lg font-black text-gray-900 dark:text-white mt-1">
                  Customer Issue Inquiries ({inquiries.length})
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Review custom problem descriptions, uploaded issue photos, and contact customers via WhatsApp or call.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full">
                  Pending: {inquiries.filter(i => i.status === 'pending').length}
                </span>
                <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
                  Resolved: {inquiries.filter(i => i.status === 'resolved').length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inquiries.map((inquiry) => (
                <div
                  key={inquiry.id}
                  className="p-5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 flex flex-col justify-between text-left"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-gray-900 dark:text-white bg-white dark:bg-[#121212] px-2.5 py-1 rounded-lg border border-gray-200 dark:border-white/10">
                          #{inquiry.inquiry_number || inquiry.id}
                        </span>
                        <span className="text-xs font-bold text-sky-500 bg-sky-500/10 px-2.5 py-0.5 rounded-md">
                          {inquiry.category_name || 'General Inquiry'}
                        </span>
                      </div>

                      <div className="relative">
                        <select
                          value={inquiry.status || 'pending'}
                          onChange={(e) => updateInquiryStatus(inquiry.id, e.target.value)}
                          className="pl-2.5 pr-6 py-1 bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-lg text-xs font-extrabold text-gray-900 dark:text-white cursor-pointer appearance-none shadow-xs"
                        >
                          <option value="pending" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white">Pending</option>
                          <option value="contacted" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white">Contacted</option>
                          <option value="resolved" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white">Resolved</option>
                          <option value="cancelled" className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white">Cancelled</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                      <p className="font-extrabold text-sm text-gray-900 dark:text-white">{inquiry.name}</p>
                      <p className="flex items-center gap-1.5 text-gray-500 font-semibold">
                        <Phone size={12} className="text-sky-500" /> {inquiry.phone} • <MapPin size={12} className="text-red-500" /> {inquiry.city}
                      </p>
                      {inquiry.address && (
                        <p className="text-gray-400 font-medium italic">"{inquiry.address}"</p>
                      )}
                    </div>

                    <div className="mt-3 p-3 bg-white dark:bg-[#121212] rounded-xl border border-gray-200 dark:border-white/10">
                      <p className="text-xs text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
                        <strong className="text-sky-500 font-bold block mb-0.5">Issue Description:</strong>
                        {inquiry.issue_description}
                      </p>

                      {inquiry.image_url && (
                        <div className="mt-3 pt-2 border-t border-gray-100 dark:border-white/5 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setPreviewImage(inquiry.image_url)}
                            className="relative w-14 h-14 rounded-xl overflow-hidden border border-sky-500/40 group shrink-0"
                          >
                            <img src={inquiry.image_url} alt="Inquiry Attachment" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Eye size={16} />
                            </div>
                          </button>

                          <div className="text-[11px]">
                            <span className="font-bold text-sky-500 flex items-center gap-1">
                              <Camera size={12} /> Photo Attached
                            </span>
                            <button
                              type="button"
                              onClick={() => setPreviewImage(inquiry.image_url)}
                              className="text-gray-400 hover:text-white underline text-[10px] font-semibold mt-0.5"
                            >
                              Click to expand full image
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-white/10 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                      Visiting Fee: ₹{inquiry.visiting_fee || 99}
                    </span>

                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${inquiry.phone}`}
                        className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm"
                      >
                        <Phone size={13} />
                        <span>Call</span>
                      </a>

                      <a
                        href={`https://wa.me/${(inquiry.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${inquiry.name}, regarding your OZO Doorstep Inquiry #${inquiry.inquiry_number}...`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm"
                      >
                        <MessageSquare size={13} />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))}

              {inquiries.length === 0 && (
                <div className="col-span-full p-12 text-center text-gray-400 text-xs font-bold bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                  No customer inquiries submitted yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW LIGHTBOX MODAL */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-3xl max-h-[85vh] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/20 p-2"
            >
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white p-2 rounded-full z-10"
              >
                <XCircle size={22} />
              </button>
              <img src={previewImage} alt="Inquiry attachment full view" className="max-w-full max-h-[80vh] object-contain rounded-2xl" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 1: ADD/EDIT SERVICE */}
      <AnimatePresence>
        {isServiceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 w-full max-w-xl shadow-2xl border border-gray-200 dark:border-white/10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-4 mb-4">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  {editingService ? 'Edit Doorstep Service' : 'Add New Doorstep Service'}
                </h3>
                <button
                  onClick={() => setIsServiceModalOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveService} className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 dark:text-gray-400 mb-1">Service Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AC Foam Jet Service (Split AC)"
                    value={serviceForm.title}
                    onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 dark:text-gray-400 mb-1">Category *</label>
                    <div className="relative">
                      <select
                        value={serviceForm.category_slug}
                        onChange={(e) => {
                          const slug = e.target.value
                          const cat = categories.find(c => c.slug === slug)
                          setServiceForm({ ...serviceForm, category_slug: slug, category: cat ? cat.title : 'Service' })
                        }}
                        className="w-full pl-4 pr-9 py-2.5 bg-gray-50 dark:bg-[#26262a] border border-gray-200 dark:border-white/10 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 appearance-none shadow-sm cursor-pointer"
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.slug} className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white">
                            {c.title}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 dark:text-gray-400 mb-1">Duration (Mins)</label>
                    <input
                      type="number"
                      placeholder="45"
                      value={serviceForm.estimated_duration_mins}
                      onChange={(e) => setServiceForm({ ...serviceForm, estimated_duration_mins: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 dark:text-gray-400 mb-1">Rate Card Price (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="499"
                      value={serviceForm.price}
                      onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 dark:text-gray-400 mb-1">Original Price (₹)</label>
                    <input
                      type="number"
                      placeholder="799"
                      value={serviceForm.original_price}
                      onChange={(e) => setServiceForm({ ...serviceForm, original_price: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 dark:text-gray-400 mb-1">Service Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide details about what technician will inspect and repair..."
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 dark:text-gray-400 mb-1">Offer Badge Tag</label>
                    <input
                      type="text"
                      placeholder="e.g. Summer Offer, 20% OFF"
                      value={serviceForm.badge}
                      onChange={(e) => setServiceForm({ ...serviceForm, badge: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex items-center pt-6 gap-2">
                    <input
                      type="checkbox"
                      id="is_active_check"
                      checked={serviceForm.is_active}
                      onChange={(e) => setServiceForm({ ...serviceForm, is_active: e.target.checked })}
                      className="w-4 h-4 text-sky-500 rounded border-gray-300 focus:ring-sky-500 cursor-pointer"
                    />
                    <label htmlFor="is_active_check" className="text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                      Active (Visible to users)
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsServiceModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-black text-xs shadow-md"
                  >
                    {editingService ? 'Update Service' : 'Save Service'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ADD/EDIT CATEGORY */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-gray-200 dark:border-white/10"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-4 mb-4">
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  {editingCategory ? 'Edit Service Category' : 'Add Service Category'}
                </h3>
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 dark:text-gray-400 mb-1">Category Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Appliance Repair"
                    value={categoryForm.title}
                    onChange={(e) => setCategoryForm({ ...categoryForm, title: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 dark:text-gray-400 mb-1">Emoji Icon</label>
                    <input
                      type="text"
                      placeholder="🚰"
                      value={categoryForm.icon}
                      onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 dark:text-gray-400 mb-1">Starting Price (₹)</label>
                    <input
                      type="number"
                      placeholder="199"
                      value={categoryForm.priceStarting}
                      onChange={(e) => setCategoryForm({ ...categoryForm, priceStarting: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-gray-500 dark:text-gray-400 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Short summary of services included..."
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-black text-xs shadow-md"
                  >
                    {editingCategory ? 'Update Category' : 'Save Category'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
