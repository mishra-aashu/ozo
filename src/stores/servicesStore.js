import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// Default Seed Categories
export const DEFAULT_SERVICE_CATEGORIES = [
  {
    id: 'cat-1',
    title: 'Plumbing',
    slug: 'plumbing',
    icon: 'plumbing',
    image: '/images/services/plumbing_vector_art.jpg',
    color: 'from-blue-500 to-indigo-600',
    description: 'Tap repair, pipe leaks, drainage & bathroom fitting',
    position: 1,
    is_active: true,
    priceStarting: 199,
    badge: 'Popular'
  },
  {
    id: 'cat-2',
    title: 'Electrician',
    slug: 'electrician',
    icon: 'electrician',
    image: '/images/services/electrician_vector_art.jpg',
    color: 'from-amber-500 to-orange-600',
    description: 'Switchboards, wiring, fan & light installation',
    position: 2,
    is_active: true,
    priceStarting: 149,
    badge: 'Urgent'
  },
  {
    id: 'cat-3',
    title: 'AC Repair',
    slug: 'ac-appliance',
    icon: 'ac-appliance',
    image: '/images/services/ac_repair_vector_art.jpg',
    color: 'from-sky-500 to-blue-600',
    description: 'AC foam servicing, fridge & washing machine repair',
    position: 3,
    is_active: true,
    priceStarting: 299,
    badge: 'Offer'
  },
  {
    id: 'cat-4',
    title: 'Carpentry',
    slug: 'carpentry',
    icon: 'carpentry',
    image: '/images/services/carpentry_vector_art.jpg',
    color: 'from-orange-600 to-amber-700',
    description: 'Door locks, furniture assembly & wooden repair',
    position: 4,
    is_active: true,
    priceStarting: 249
  },
  {
    id: 'cat-5',
    title: 'Cleaning',
    slug: 'home-cleaning',
    icon: 'home-cleaning',
    image: '/images/services/home_cleaning_vector_art.jpg',
    color: 'from-emerald-500 to-teal-600',
    description: 'Bathroom, kitchen & full home deep sanitization',
    position: 5,
    is_active: true,
    priceStarting: 499,
    badge: 'Top Rated'
  },
  {
    id: 'cat-6',
    title: 'Painting',
    slug: 'painting',
    icon: 'painting',
    image: '/images/services/painting_vector_art.jpg',
    color: 'from-purple-500 to-pink-600',
    description: 'Wall touchup, damp proofing & full painting',
    position: 6,
    is_active: true,
    priceStarting: 999
  },
  {
    id: 'cat-7',
    title: 'Pest Control',
    slug: 'pest-control',
    icon: 'pest-control',
    image: '/images/services/pest_control_vector_art.jpg',
    color: 'from-rose-500 to-red-600',
    description: 'Termite, cockroach & bedbug treatment',
    position: 7,
    is_active: true,
    priceStarting: 399
  }
]

// Default Seed Services Catalog Items
export const DEFAULT_SERVICES_CATALOG = [
  {
    id: 'srv-1',
    title: 'AC Foam Jet Service (Split AC)',
    slug: 'ac-foam-jet-split',
    category_slug: 'ac-appliance',
    category: 'AC & Appliance',
    description: 'Deep 2x cooling foam jet cleaning of indoor coils & outdoor unit with anti-bacterial spray.',
    price: 499,
    original_price: 799,
    estimated_duration_mins: 60,
    rating: 4.8,
    reviews_count: 1420,
    tag: 'Bestseller',
    badge: 'Summer Offer',
    is_active: true
  },
  {
    id: 'srv-2',
    title: 'Tap Leakage & Blockage Repair',
    slug: 'tap-leakage-repair',
    category_slug: 'plumbing',
    category: 'Plumbing',
    description: 'Fix dripping taps, washer replacement, water pipe leakages & flush tank repair.',
    price: 199,
    original_price: 299,
    estimated_duration_mins: 30,
    rating: 4.9,
    reviews_count: 2150,
    tag: '30 Mins Visit',
    badge: 'Popular',
    is_active: true
  },
  {
    id: 'srv-3',
    title: 'Switchboard & Socket Installation',
    slug: 'switchboard-installation',
    category_slug: 'electrician',
    category: 'Electrical',
    description: 'Installation or replacement of modular switchboard, socket, MCB or main switch.',
    price: 149,
    original_price: 249,
    estimated_duration_mins: 45,
    rating: 4.7,
    reviews_count: 980,
    tag: 'Fixed Rates',
    badge: 'Urgent',
    is_active: true
  },
  {
    id: 'srv-4',
    title: 'Door Lock Repair & Fitting',
    slug: 'door-lock-fitting',
    category_slug: 'carpentry',
    category: 'Carpentry',
    description: 'Mortise lock, latch, main door handle fitting or broken lock repair.',
    price: 249,
    original_price: 399,
    estimated_duration_mins: 45,
    rating: 4.8,
    reviews_count: 630,
    tag: 'Expert Carpenter',
    badge: null,
    is_active: true
  },
  {
    id: 'srv-5',
    title: 'Deep Bathroom Sanitization',
    slug: 'deep-bathroom-sanitization',
    category_slug: 'home-cleaning',
    category: 'Cleaning',
    description: 'Hard water stain removal, tile scrub, toilet disinfection & mirror shine.',
    price: 499,
    original_price: 799,
    estimated_duration_mins: 90,
    rating: 4.9,
    reviews_count: 1840,
    tag: 'Full Sanitized',
    badge: '20% OFF',
    is_active: true
  },
  {
    id: 'srv-6',
    title: 'Cockroach & Pest Control',
    slug: 'cockroach-pest-control',
    category_slug: 'pest-control',
    category: 'Pest Control',
    description: 'Odorless gel injection & spray treatment with 90-day pest-free guarantee.',
    price: 399,
    original_price: 599,
    estimated_duration_mins: 45,
    rating: 4.7,
    reviews_count: 510,
    tag: 'Odorless Gel',
    badge: 'Guaranteed',
    is_active: true
  }
]

export const useServicesStore = create((set, get) => ({
  categories: DEFAULT_SERVICE_CATEGORIES,
  services: DEFAULT_SERVICES_CATALOG,
  bookings: [],
  isLoading: false,
  isLoaded: false,

  // Fetch Categories from database or fallback to default
  fetchCategories: async (force = false) => {
    if (get().isLoaded && !force) return get().categories

    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('position', { ascending: true })

      if (!error && data && data.length > 0) {
        set({ categories: data, isLoaded: true, isLoading: false })
        return data
      } else {
        // Use default categories if database table doesn't have rows
        set({ categories: DEFAULT_SERVICE_CATEGORIES, isLoaded: true, isLoading: false })
        return DEFAULT_SERVICE_CATEGORIES
      }
    } catch (err) {
      console.warn('Error fetching service_categories, using defaults:', err)
      set({ categories: DEFAULT_SERVICE_CATEGORIES, isLoaded: true, isLoading: false })
      return DEFAULT_SERVICE_CATEGORIES
    }
  },

  // Fetch Services from database or fallback to default
  fetchServices: async (categorySlug = null) => {
    set({ isLoading: true })
    try {
      let query = supabase.from('services_catalog').select('*').order('created_at', { ascending: false })
      
      if (categorySlug) {
        query = query.eq('category_slug', categorySlug)
      }

      const { data, error } = await query

      if (!error && data && data.length > 0) {
        set({ services: data, isLoading: false })
        return data
      } else {
        const filtered = categorySlug 
          ? DEFAULT_SERVICES_CATALOG.filter(s => s.category_slug === categorySlug)
          : DEFAULT_SERVICES_CATALOG
        set({ services: filtered, isLoading: false })
        return filtered
      }
    } catch (err) {
      console.warn('Error fetching services_catalog, using defaults:', err)
      const filtered = categorySlug 
        ? DEFAULT_SERVICES_CATALOG.filter(s => s.category_slug === categorySlug)
        : DEFAULT_SERVICES_CATALOG
      set({ services: filtered, isLoading: false })
      return filtered
    }
  },

  // Add a new Category
  addCategory: async (categoryData) => {
    const slug = categoryData.slug || categoryData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const newCategory = {
      id: categoryData.id || `cat-${Date.now()}`,
      title: categoryData.title,
      slug,
      icon: categoryData.icon || '🛠️',
      color: categoryData.color || 'from-sky-500 to-blue-600',
      description: categoryData.description || '',
      position: categoryData.position || (get().categories.length + 1),
      priceStarting: categoryData.priceStarting || 199,
      badge: categoryData.badge || null,
      is_active: categoryData.is_active !== undefined ? categoryData.is_active : true,
      created_at: new Date().toISOString()
    }

    // Try inserting into Supabase
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .insert([{
          title: newCategory.title,
          slug: newCategory.slug,
          icon: newCategory.icon,
          description: newCategory.description,
          position: newCategory.position,
          is_active: newCategory.is_active
        }])
        .select()
        .single()

      if (!error && data) {
        newCategory.id = data.id
      }
    } catch (e) {
      console.warn('Could not insert to Supabase service_categories, updating store locally:', e)
    }

    set(state => ({
      categories: [...state.categories, newCategory]
    }))
    toast.success(`Category "${newCategory.title}" added successfully!`)
    return newCategory
  },

  // Update Category
  updateCategory: async (id, categoryData) => {
    const updatedCategories = get().categories.map(c => c.id === id ? { ...c, ...categoryData } : c)
    set({ categories: updatedCategories })

    try {
      await supabase
        .from('service_categories')
        .update({
          title: categoryData.title,
          slug: categoryData.slug,
          icon: categoryData.icon,
          description: categoryData.description,
          position: categoryData.position,
          is_active: categoryData.is_active
        })
        .eq('id', id)
    } catch (e) {
      console.warn('Supabase category update warning:', e)
    }
    toast.success('Category updated!')
  },

  // Delete Category
  deleteCategory: async (id) => {
    set(state => ({
      categories: state.categories.filter(c => c.id !== id)
    }))
    try {
      await supabase.from('service_categories').delete().eq('id', id)
    } catch (e) {
      console.warn('Supabase category delete warning:', e)
    }
    toast.success('Category deleted!')
  },

  // Add a new Service
  addService: async (serviceData) => {
    const slug = serviceData.slug || serviceData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const newService = {
      id: serviceData.id || `srv-${Date.now()}`,
      title: serviceData.title,
      slug,
      category_slug: serviceData.category_slug || 'plumbing',
      category: serviceData.category || 'Service',
      description: serviceData.description || '',
      price: parseFloat(serviceData.price) || 199,
      original_price: serviceData.original_price ? parseFloat(serviceData.original_price) : null,
      estimated_duration_mins: parseInt(serviceData.estimated_duration_mins) || 45,
      rating: parseFloat(serviceData.rating) || 5.0,
      reviews_count: parseInt(serviceData.reviews_count) || 1,
      tag: serviceData.tag || 'Verified',
      badge: serviceData.badge || null,
      image_url: serviceData.image_url || null,
      is_active: serviceData.is_active !== undefined ? serviceData.is_active : true,
      created_at: new Date().toISOString()
    }

    try {
      const { data, error } = await supabase
        .from('services_catalog')
        .insert([{
          title: newService.title,
          description: newService.description,
          price: newService.price,
          estimated_duration_mins: newService.estimated_duration_mins,
          image_url: newService.image_url,
          is_active: newService.is_active
        }])
        .select()
        .single()

      if (!error && data) {
        newService.id = data.id
      }
    } catch (e) {
      console.warn('Could not insert to Supabase services_catalog, updating store locally:', e)
    }

    set(state => ({
      services: [newService, ...state.services]
    }))
    toast.success(`Service "${newService.title}" added successfully!`)
    return newService
  },

  // Update Service
  updateService: async (id, serviceData) => {
    const updatedServices = get().services.map(s => s.id === id ? { ...s, ...serviceData } : s)
    set({ services: updatedServices })

    try {
      await supabase
        .from('services_catalog')
        .update({
          title: serviceData.title,
          description: serviceData.description,
          price: serviceData.price,
          estimated_duration_mins: serviceData.estimated_duration_mins,
          image_url: serviceData.image_url,
          is_active: serviceData.is_active
        })
        .eq('id', id)
    } catch (e) {
      console.warn('Supabase service update warning:', e)
    }
    toast.success('Service updated!')
  },

  // Delete Service
  deleteService: async (id) => {
    set(state => ({
      services: state.services.filter(s => s.id !== id)
    }))
    try {
      await supabase.from('services_catalog').delete().eq('id', id)
    } catch (e) {
      console.warn('Supabase service delete warning:', e)
    }
    toast.success('Service deleted!')
  },

  // Fetch Service Bookings
  fetchBookings: async () => {
    try {
      const { data, error } = await supabase
        .from('service_bookings')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        set({ bookings: data })
        return data
      }
    } catch (e) {
      console.warn('Error fetching service_bookings:', e)
    }
    return get().bookings
  },

  // Update Booking Status
  updateBookingStatus: async (id, status) => {
    set(state => ({
      bookings: state.bookings.map(b => b.id === id ? { ...b, status } : b)
    }))

    try {
      await supabase
        .from('service_bookings')
        .update({ status })
        .eq('id', id)
    } catch (e) {
      console.warn('Booking status update error:', e)
    }
    toast.success(`Booking status updated to ${status}!`)
  },

  // =====================================
  // VISITING FEES & INQUIRY SYSTEM
  // =====================================
  visitingFeeDefault: 99,
  visitingFeesByCity: {
    'Muzaffarpur': 99,
    'Patna': 149,
    'Darbhanga': 99,
    'Gaya': 99,
    'Bhagalpur': 99
  },
  inquiries: [],

  // Helper to get visiting fee for a given city name
  getVisitingFee: (cityName = '') => {
    const state = get()
    if (!cityName) return state.visitingFeeDefault
    const cleanCity = cityName.trim()
    for (const [cityKey, fee] of Object.entries(state.visitingFeesByCity)) {
      if (cleanCity.toLowerCase().includes(cityKey.toLowerCase()) || cityKey.toLowerCase().includes(cleanCity.toLowerCase())) {
        return fee
      }
    }
    return state.visitingFeeDefault
  },

  // Fetch visiting fee configurations from database or localStorage
  fetchVisitingFees: async () => {
    try {
      const savedFees = localStorage.getItem('ozo_visiting_fees')
      if (savedFees) {
        const parsed = JSON.parse(savedFees)
        set({
          visitingFeeDefault: parsed.default || 99,
          visitingFeesByCity: parsed.cities || get().visitingFeesByCity
        })
      }

      const { data, error } = await supabase
        .from('service_settings')
        .select('*')
        .eq('key', 'visiting_fees')
        .single()

      if (!error && data && data.value) {
        set({
          visitingFeeDefault: data.value.default || 99,
          visitingFeesByCity: data.value.cities || get().visitingFeesByCity
        })
        localStorage.setItem('ozo_visiting_fees', JSON.stringify(data.value))
      }
    } catch (e) {
      console.warn('Visiting fees fetch warning:', e)
    }
  },

  // Update Visiting Fees (Admin command)
  updateVisitingFees: async (defaultFee, cityFeesMap) => {
    const updatedDefault = parseFloat(defaultFee) || 99
    const updatedCities = { ...cityFeesMap }

    set({
      visitingFeeDefault: updatedDefault,
      visitingFeesByCity: updatedCities
    })

    const payload = { default: updatedDefault, cities: updatedCities }
    localStorage.setItem('ozo_visiting_fees', JSON.stringify(payload))

    try {
      await supabase
        .from('service_settings')
        .upsert({ key: 'visiting_fees', value: payload }, { onConflict: 'key' })
    } catch (e) {
      console.warn('Visiting fees Supabase save warning:', e)
    }
    toast.success('Visiting fees configuration saved!')
  },

  // Upload Inquiry Image using ImgBB API or Supabase Storage with base64 fallback
  uploadInquiryImage: async (file) => {
    if (!file) return null

    // Attempt 1: ImgBB API Key from .env
    try {
      const apiKey = import.meta.env.VITE_IMGBB_API_KEY || '42583b3b3c01cf66407867e6b1cb49db'
      const formData = new FormData()
      formData.append('image', file)
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      })
      const resData = await response.json()
      if (resData && resData.data && resData.data.url) {
        return resData.data.url
      }
    } catch (err) {
      console.warn('ImgBB upload error, falling back to Supabase:', err)
    }

    // Attempt 2: Supabase Storage bucket
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `inquiry-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const { data, error } = await supabase.storage.from('service-inquiry-images').upload(fileName, file)
      if (!error && data) {
        const { data: pubData } = supabase.storage.from('service-inquiry-images').getPublicUrl(fileName)
        if (pubData?.publicUrl) return pubData.publicUrl
      }
    } catch (e) {
      console.warn('Supabase storage upload error:', e)
    }

    // Attempt 3: Local Data URL
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(file)
    })
  },

  // Fetch Customer Inquiries
  fetchInquiries: async () => {
    try {
      // Local Storage load
      const saved = localStorage.getItem('ozo_customer_inquiries')
      let localInquiries = []
      if (saved) {
        localInquiries = JSON.parse(saved)
      }

      const { data, error } = await supabase
        .from('service_inquiries')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        set({ inquiries: data })
        localStorage.setItem('ozo_customer_inquiries', JSON.stringify(data))
        return data
      } else {
        set({ inquiries: localInquiries })
        return localInquiries
      }
    } catch (e) {
      console.warn('Error fetching service_inquiries:', e)
      const saved = localStorage.getItem('ozo_customer_inquiries')
      const localInquiries = saved ? JSON.parse(saved) : []
      set({ inquiries: localInquiries })
      return localInquiries
    }
  },

  // Create Customer Inquiry
  createInquiry: async (inquiryData) => {
    const newInquiry = {
      id: `inq-${Date.now()}`,
      inquiry_number: 'OZO-INQ-' + Math.floor(100000 + Math.random() * 900000),
      name: inquiryData.name || 'Valued Customer',
      phone: inquiryData.phone || '',
      city: inquiryData.city || 'Muzaffarpur',
      address: inquiryData.address || '',
      category_name: inquiryData.category_name || 'General Inquiry',
      issue_description: inquiryData.issue_description || '',
      image_url: inquiryData.image_url || null,
      visiting_fee: inquiryData.visiting_fee || 99,
      status: 'pending', // 'pending' | 'contacted' | 'resolved' | 'cancelled'
      created_at: new Date().toISOString()
    }

    // Try Supabase insert
    try {
      const { data, error } = await supabase
        .from('service_inquiries')
        .insert([newInquiry])
        .select()
        .single()

      if (!error && data) {
        newInquiry.id = data.id
      }
    } catch (e) {
      console.warn('Supabase inquiry insert warning:', e)
    }

    set(state => {
      const updated = [newInquiry, ...state.inquiries]
      localStorage.setItem('ozo_customer_inquiries', JSON.stringify(updated))
      return { inquiries: updated }
    })

    toast.success(`Inquiry #${newInquiry.inquiry_number} submitted! We will contact you shortly.`)
    return newInquiry
  },

  // Update Inquiry Status
  updateInquiryStatus: async (id, status) => {
    set(state => {
      const updated = state.inquiries.map(i => i.id === id ? { ...i, status } : i)
      localStorage.setItem('ozo_customer_inquiries', JSON.stringify(updated))
      return { inquiries: updated }
    })

    try {
      await supabase
        .from('service_inquiries')
        .update({ status })
        .eq('id', id)
    } catch (e) {
      console.warn('Inquiry status update error:', e)
    }
    toast.success(`Inquiry status updated to ${status}!`)
  }
}))

