import { create } from 'zustand'
import { supabase, supabaseAdmin } from '../lib/supabase'
import toast from 'react-hot-toast'
import { useLocationStore, getActiveCitySlug } from './locationStore'
import { useCartStore } from './cartStore'
import { isImageMissing } from '../utils/imageOptimizer'

// File-scoped references to cancel active in-flight requests on concurrent calls
let fetchProductsController = null
let fetchFeaturedProductsController = null
let fetchBestsellerProductsController = null
let fetchCategoriesController = null
let fetchOffersController = null
let fetchProductBySlugController = null
let searchProductsController = null
let getProductsByCategoryController = null

// In-memory search results cache with 3 min TTL
export const searchCache = new Map()
const SEARCH_CACHE_TTL = 3 * 60 * 1000

// Global fast in-memory map for 0ms instant product hydration across pages
export const fastProductMap = new Map()

export const cacheProductInMemory = (product) => {
  if (!product) return
  if (product.slug) {
    fastProductMap.set(product.slug, product)
  }
  if (product.id) {
    fastProductMap.set(product.id, product)
  }
}

// Helper to construct product query with city filters and overrides
const buildProductQuery = (supabaseClient, citySlug, fields = 'id, name, slug, brand, image_url, price, mrp, ozo_price, unit, is_available, is_upcoming, quantity_available, max_order_qty, is_vegetarian, is_featured, is_bestseller, category_id', includeUnavailable = true) => {
  if (citySlug) {
    let query = supabaseClient
      .from('products')
      .select(`
        ${fields},
        product_city_availability!left(
          city_slug,
          city_price,
          city_mrp,
          city_ozo_price,
          is_featured,
          is_available,
          is_upcoming
        )
      `)

    if (!includeUnavailable) {
      query = query.eq('is_available', true)
    }
    return query
  }

  let query = supabaseClient
    .from('products')
    .select(fields)

  if (!includeUnavailable) {
    query = query.eq('is_available', true)
  }
  return query
}

// Helper to format products and apply overrides
const formatProductsWithCity = (data, citySlug, includeUnavailable = true, allowMissingImage = false) => {
  if (!data) return []
  const formatted = data.map(product => {
    if (!product) return null

    // Filter out products belonging to inactive categories
    if (product.category && product.category.is_active === false) {
      return null
    }

    const imageMissing = isImageMissing(product.image_url);

    const isAdminOrMart = typeof window !== 'undefined' && 
      (window.location.pathname.includes('/admin') || 
       window.location.pathname.includes('/mart'));

    if (imageMissing && !isAdminOrMart && !allowMissingImage) {
      return null
    }

    const pcaList = product.product_city_availability
    const pca = citySlug && Array.isArray(pcaList)
      ? (pcaList.find(row => row.city_slug === citySlug) || null)
      : (citySlug && pcaList ? pcaList : null)

    const isAvailable = pca && pca.is_available !== null && pca.is_available !== undefined
      ? pca.is_available
      : product.is_available

    const isUpcomingRaw = pca && pca.is_upcoming !== null && pca.is_upcoming !== undefined
      ? pca.is_upcoming
      : (product.is_upcoming || false)

    const launchConfig = useCartStore.getState().launchConfig
    const launchModeEnabled = !!launchConfig?.launch_mode_enabled

    const isUpcoming = (launchModeEnabled && !isAvailable) ? true : isUpcomingRaw

    if (!isAvailable && !includeUnavailable) return null

    const sellingPriceVal = pca?.city_price !== null && pca?.city_price !== undefined
      ? parseFloat(pca.city_price)
      : parseFloat(product.price)
    const mrpVal = pca?.city_mrp !== null && pca?.city_mrp !== undefined
      ? parseFloat(pca.city_mrp)
      : parseFloat(product.mrp)
    const ozoPriceVal = pca?.city_ozo_price !== null && pca?.city_ozo_price !== undefined
      ? parseFloat(pca.city_ozo_price)
      : (product.ozo_price !== null && product.ozo_price !== undefined ? parseFloat(product.ozo_price) : null)

    const displayPriceVal = (ozoPriceVal !== null && ozoPriceVal > 0) ? ozoPriceVal : sellingPriceVal

    return {
      ...product,
      price: displayPriceVal,
      selling_price: sellingPriceVal,
      ozo_price: ozoPriceVal,
      mrp: mrpVal,
      is_available: isAvailable,
      is_upcoming: isUpcoming,
      image_url: product.image_url,
      is_featured: pca && pca.is_featured !== null && pca.is_featured !== undefined 
        ? pca.is_featured 
        : product.is_featured,
      discount_percentage: (mrpVal && mrpVal > displayPriceVal) 
        ? Math.round(((mrpVal - displayPriceVal) / mrpVal) * 100)
        : parseFloat(product.discount_percentage || 0)
    }
  }).filter(Boolean)

  const sorted = formatted.sort((a, b) => {
    const aOOS = !a.is_available || a.quantity_available === 0;
    const bOOS = !b.is_available || b.quantity_available === 0;
    if (aOOS && !bOOS) return 1;
    if (!aOOS && bOOS) return -1;
    return 0;
  });

  // Automatically index formatted products for instant 0ms product detail transitions
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (p && p.slug) {
      fastProductMap.set(p.slug, p);
      if (p.id) fastProductMap.set(p.id, p);
    }
  }

  return sorted;
}

const ensureNumericPrices = (product) => {
  if (!product) return null;
  return {
    ...product,
    price: parseFloat(product.price || 0),
    mrp: parseFloat(product.mrp || 0),
    selling_price: parseFloat(product.selling_price || 0),
    ozo_price: product.ozo_price !== null && product.ozo_price !== undefined ? parseFloat(product.ozo_price) : null,
    discount_percentage: parseInt(product.discount_percentage || 0, 10),
    is_available: !!product.is_available,
    is_upcoming: !!product.is_upcoming,
  };
};

// ─── SWR CACHE HELPERS (Offline-First & Low-Network Instant Hydration) ────
const SWR_PREFIX = 'ozo_swr_';

export const getCachedData = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${SWR_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data || null;
  } catch (e) {
    return null;
  }
};

export const setCachedData = (key, data) => {
  if (typeof window === 'undefined' || !data) return;
  try {
    localStorage.setItem(`${SWR_PREFIX}${key}`, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (e) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(SWR_PREFIX) && k !== `${SWR_PREFIX}${key}`) {
          localStorage.removeItem(k);
          break;
        }
      }
    } catch (_) {}
  }
};

// Pre-hydrate catalog synchronously from cache on app boot for 0ms initial paint
const initialCachedHome = typeof window !== 'undefined' 
  ? (getCachedData('home_default') || getCachedData('home_aurangabad-bihar')) 
  : null;
const initialCachedCategories = typeof window !== 'undefined' ? getCachedData('categories') : null;
const initialCachedOffers = typeof window !== 'undefined' ? getCachedData('offers') : null;

export const useProductStore = create((set, get) => ({
  // State — pre-hydrated from cache so UI renders with zero layout shift
  products: [],
  featuredProducts: initialCachedHome?.featuredProducts || [],
  bestsellerProducts: initialCachedHome?.bestsellerProducts || [],
  categories: initialCachedHome?.categories || initialCachedCategories || [],
  offers: initialCachedHome?.offers || initialCachedOffers || [],
  stealDeals: initialCachedHome?.stealDeals || [],
  summerSpecials: initialCachedHome?.summerSpecials || [],
  mandi: initialCachedHome?.mandi || [],
  budgetPicks: initialCachedHome?.budgetPicks || [],
  isLoading: false,
  isProductsLoading: false,
  isFeaturedLoading: false,
  isBestsellersLoading: false,
  isCategoriesLoading: false,
  isOffersLoading: false,
  isSearchLoading: false,
  isSearchError: false,
  isProductDetailLoading: false,
  isHomeLoading: false,
  currentProduct: null,
  searchResults: [],
  spellingSuggestion: null,
  filters: {
    category: null,
    priceRange: [0, 10000],
    sortBy: 'name',
    inStock: true,
  },

  // Fetch all products
  fetchProducts: async (options = {}) => {
    if (fetchProductsController) {
      fetchProductsController.abort()
    }
    const controller = new AbortController()
    fetchProductsController = controller
    const signal = options.signal || controller.signal

    try {
      set({ isProductsLoading: true, isLoading: true })

      const citySlug = getActiveCitySlug()
      let query = buildProductQuery(supabase, citySlug, `
        id, name, slug, brand, image_url, price, mrp, ozo_price, unit, is_available, is_upcoming, quantity_available, max_order_qty, is_vegetarian, is_featured, is_bestseller, category_id,
        category:categories (
          id,
          name,
          slug,
          parent_id,
          is_active
        )
      `, options.includeUnavailable)

      // Apply filters
      if (options.categoryId) {
        // Find child category IDs if this is a parent category
        const { data: subcategories } = await supabase
          .from('categories')
          .select('id')
          .eq('parent_id', options.categoryId)
          .eq('is_active', true)

        let categoryIds = [options.categoryId]
        if (subcategories && subcategories.length > 0) {
          categoryIds = [...categoryIds, ...subcategories.map(s => s.id)]
        }
        query = query.in('category_id', categoryIds)
      }

      if (options.featured) {
        if (citySlug) {
          try {
            const { data: cityFeaturedData } = await supabase
              .from('product_city_availability')
              .select('product_id')
              .eq('city_slug', citySlug)
              .eq('is_featured', true)
            
            const cityFeaturedIds = cityFeaturedData?.map(f => f.product_id) || []
            if (cityFeaturedIds.length > 0) {
              query = query.or(`is_featured.eq.true,id.in.(${cityFeaturedIds.join(',')})`)
            } else {
              query = query.eq('is_featured', true)
            }
          } catch (err) {
            console.error('Error fetching city featured IDs:', err)
            query = query.eq('is_featured', true)
          }
        } else {
          query = query.eq('is_featured', true)
        }
      }

      if (options.bestseller) {
        query = query.eq('is_bestseller', true)
      }

      if (options.search) {
        query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%,barcode.ilike.%${options.search}%`)
      }

      // Sorting
      const sortBy = options.sortBy || 'created_at'
      const ascending = options.ascending !== undefined ? options.ascending : false
      query = query.order(sortBy, { ascending })

      // Limit
      if (options.limit) {
        query = query.limit(options.limit)
      }

      // Chain abort signal to query
      query = query.abortSignal(signal)

      const { data, error } = await query

      if (error) throw error

      if (signal.aborted) {
        return { success: false, error: new DOMException('Aborted', 'AbortError') }
      }

      let products = formatProductsWithCity(data, citySlug, options.includeUnavailable)
      if (options.featured && citySlug) {
        products = products.filter(p => p.is_featured)
      }

      set({ 
        products, 
        isProductsLoading: false, 
        isLoading: get().isFeaturedLoading || get().isBestsellersLoading || get().isCategoriesLoading || get().isOffersLoading || get().isSearchLoading || get().isProductDetailLoading 
      })
      return { success: true, data: products }
    } catch (error) {
      if (signal.aborted || error.name === 'AbortError') {
        return { success: false, error }
      }
      console.error('Fetch products error:', error)
      set({ 
        isProductsLoading: false, 
        isLoading: get().isFeaturedLoading || get().isBestsellersLoading || get().isCategoriesLoading || get().isOffersLoading || get().isSearchLoading || get().isProductDetailLoading 
      })
      return { success: false, error }
    }
  },

  // Fetch featured products
  fetchFeaturedProducts: async (options = {}) => {
    if (fetchFeaturedProductsController) {
      fetchFeaturedProductsController.abort()
    }
    const controller = new AbortController()
    fetchFeaturedProductsController = controller
    const signal = options.signal || controller.signal

    try {
      set({ isFeaturedLoading: true, isLoading: true })
      
      const citySlug = getActiveCitySlug()
      
      let cityFeaturedIds = []
      if (citySlug) {
        try {
          const { data: cityFeaturedData } = await supabase
            .from('product_city_availability')
            .select('product_id')
            .eq('city_slug', citySlug)
            .eq('is_featured', true)
          
          cityFeaturedIds = cityFeaturedData?.map(f => f.product_id) || []
        } catch (err) {
          console.error('Error fetching city featured IDs:', err)
        }
      }

      let query = buildProductQuery(supabase, citySlug, `
        id, name, slug, brand, image_url, price, mrp, ozo_price, unit, is_available, is_upcoming, quantity_available, max_order_qty, is_vegetarian, is_featured, is_bestseller, category_id,
        category:categories (
          id,
          name,
          slug,
          parent_id,
          is_active
        )
      `)

      if (cityFeaturedIds.length > 0) {
        query = query.or(`is_featured.eq.true,id.in.(${cityFeaturedIds.join(',')})`)
      } else {
        query = query.eq('is_featured', true)
      }

      query = query
        .not('image_url', 'is', null)
        .not('image_url', 'ilike', '%raw.githubusercontent.com%')
        .not('image_url', 'ilike', '%logo_transparent.png%')
        .limit(200)
        .abortSignal(signal)
      const { data, error } = await query

      if (error) throw error

      if (signal.aborted) {
        return { success: false, error: new DOMException('Aborted', 'AbortError') }
      }

      let products = formatProductsWithCity(data, citySlug)
      if (citySlug) {
        products = products.filter(p => p.is_featured)
      }

      if (products.length === 0) {
        let fallbackQuery = buildProductQuery(supabase, citySlug, `
          id, name, slug, brand, image_url, price, mrp, ozo_price, unit, is_available, is_upcoming, quantity_available, max_order_qty, is_vegetarian, is_featured, is_bestseller, category_id,
          category:categories (
            id,
            name,
            slug,
            parent_id,
            is_active
          )
        `)
        fallbackQuery = fallbackQuery
          .eq('is_available', true)
          .or('quantity_available.gt.0,quantity_available.is.null')
          .not('image_url', 'is', null)
          .not('image_url', 'ilike', '%raw.githubusercontent.com%')
          .not('image_url', 'ilike', '%logo_transparent.png%')
          .limit(50)
          .abortSignal(signal)
        const { data: fallbackData, error: fallbackError } = await fallbackQuery
        if (!fallbackError && fallbackData) {
          products = formatProductsWithCity(fallbackData, citySlug)
        }
      }

      set({ 
        featuredProducts: products.slice(0, 50), 
        isFeaturedLoading: false, 
        isLoading: get().isProductsLoading || get().isBestsellersLoading || get().isCategoriesLoading || get().isOffersLoading || get().isSearchLoading || get().isProductDetailLoading 
      })
      return { success: true, data: products.slice(0, 50) }
    } catch (error) {
      if (signal.aborted || error.name === 'AbortError') {
        return { success: false, error }
      }
      console.error('Fetch featured products error:', error)
      set({ 
        isFeaturedLoading: false, 
        isLoading: get().isProductsLoading || get().isBestsellersLoading || get().isCategoriesLoading || get().isOffersLoading || get().isSearchLoading || get().isProductDetailLoading 
      })
      return { success: false, error }
    }
  },

  // Fetch bestseller products
  fetchBestsellerProducts: async (options = {}) => {
    if (fetchBestsellerProductsController) {
      fetchBestsellerProductsController.abort()
    }
    const controller = new AbortController()
    fetchBestsellerProductsController = controller
    const signal = options.signal || controller.signal

    try {
      set({ isBestsellersLoading: true, isLoading: true })
      
      const citySlug = getActiveCitySlug()
      let query = buildProductQuery(supabase, citySlug, `
        id, name, slug, brand, image_url, price, mrp, ozo_price, unit, is_available, is_upcoming, quantity_available, max_order_qty, is_vegetarian, is_featured, is_bestseller, category_id,
        category:categories (
          id,
          name,
          slug,
          parent_id,
          is_active
        )
      `)
      .eq('is_bestseller', true)
      .not('image_url', 'is', null)
      .not('image_url', 'ilike', '%raw.githubusercontent.com%')
      .not('image_url', 'ilike', '%logo_transparent.png%')
      .limit(50)

      query = query.abortSignal(signal)
      const { data, error } = await query

      if (error) throw error

      if (signal.aborted) {
        return { success: false, error: new DOMException('Aborted', 'AbortError') }
      }

      let products = formatProductsWithCity(data, citySlug)

      if (products.length === 0) {
        let fallbackQuery = buildProductQuery(supabase, citySlug, `
          id, name, slug, brand, image_url, price, mrp, ozo_price, unit, is_available, is_upcoming, quantity_available, max_order_qty, is_vegetarian, is_featured, is_bestseller, category_id,
          category:categories (
            id,
            name,
            slug,
            parent_id,
            is_active
          )
        `)
        fallbackQuery = fallbackQuery
          .eq('is_available', true)
          .or('quantity_available.gt.0,quantity_available.is.null')
          .not('image_url', 'is', null)
          .not('image_url', 'ilike', '%raw.githubusercontent.com%')
          .not('image_url', 'ilike', '%logo_transparent.png%')
          .limit(50)
          .abortSignal(signal)
        const { data: fallbackData, error: fallbackError } = await fallbackQuery
        if (!fallbackError && fallbackData) {
          products = formatProductsWithCity(fallbackData, citySlug)
        }
      }

      set({ 
        bestsellerProducts: products, 
        isBestsellersLoading: false, 
        isLoading: get().isProductsLoading || get().isFeaturedLoading || get().isCategoriesLoading || get().isOffersLoading || get().isSearchLoading || get().isProductDetailLoading 
      })
      return { success: true, data: products }
    } catch (error) {
      if (signal.aborted || error.name === 'AbortError') {
        return { success: false, error }
      }
      console.error('Fetch bestseller products error:', error)
      set({ 
        isBestsellersLoading: false, 
        isLoading: get().isProductsLoading || get().isFeaturedLoading || get().isCategoriesLoading || get().isOffersLoading || get().isSearchLoading || get().isProductDetailLoading 
      })
      return { success: false, error }
    }
  },

  // Prefetch a product into in-memory fastProductMap
  prefetchProduct: (product) => {
    if (product) {
      cacheProductInMemory(product)
    }
  },

  // Synchronously get cached product by slug or id
  getCachedProduct: (slugOrId) => {
    if (!slugOrId) return null
    return fastProductMap.get(slugOrId) || null
  },

  // Fetch single product by slug (with Instant In-Memory / SWR Cache Hydration)
  fetchProductBySlug: async (slug, options = {}) => {
    if (!slug) return { success: false, error: 'No slug provided' }

    if (fetchProductBySlugController) {
      fetchProductBySlugController.abort()
    }
    const controller = new AbortController()
    fetchProductBySlugController = controller
    const signal = options.signal || controller.signal

    const citySlug = options.citySlug || getActiveCitySlug()
    const cacheKey = `prod_${slug}_${citySlug || 'global'}`

    // 1. FAST PATH: Check options.initialProduct, fast in-memory map, memory store or SWR cache for instant 0ms render
    const currentProd = get().currentProduct
    let cachedProduct = options.initialProduct || null

    if (!cachedProduct) {
      if (currentProd && currentProd.slug === slug) {
        cachedProduct = currentProd
      } else if (fastProductMap.has(slug)) {
        cachedProduct = fastProductMap.get(slug)
      } else {
        const allKnownProducts = [
          ...(get().products || []),
          ...(get().featuredProducts || []),
          ...(get().bestsellerProducts || []),
          ...(get().summerSpecials || []),
          ...(get().mandi || []),
          ...(get().budgetPicks || [])
        ]
        const foundInMemory = allKnownProducts.find(p => p && p.slug === slug)
        cachedProduct = foundInMemory || getCachedData(cacheKey) || getCachedData(`prod_${slug}`)
      }
    }

    if (cachedProduct) {
      // Hydrate instantly! User sees page in 0ms!
      cacheProductInMemory(cachedProduct)
      set({
        currentProduct: cachedProduct,
        isProductDetailLoading: false,
        isLoading: false
      })
    } else {
      // Only set loading if no cached version exists
      set({
        currentProduct: null,
        isProductDetailLoading: true,
        isLoading: true
      })
    }

    try {
      let query = buildProductQuery(supabase, citySlug, `
        *,
        category:categories (
          id,
          name,
          slug,
          parent_id,
          is_active
        )
      `, true)
      .eq('slug', slug)
      .maybeSingle()

      query = query.abortSignal(signal)
      const { data, error } = await query

      if (error) throw error

      if (signal.aborted) {
        return { success: false, error: new DOMException('Aborted', 'AbortError') }
      }

      if (!data) {
        set({
          isProductDetailLoading: false,
          isLoading: false
        })
        return { success: false, error: new Error('Product not found') }
      }

      const formatted = formatProductsWithCity([data], citySlug, true, true)
      const product = formatted[0]

      if (product) {
        cacheProductInMemory(product)
        setCachedData(cacheKey, product)
        set({ 
          currentProduct: product, 
          isProductDetailLoading: false, 
          isLoading: false 
        })
        return { success: true, data: product }
      } else {
        set({ 
          isProductDetailLoading: false, 
          isLoading: false 
        })
        return { success: false, error: new Error('Product format returned null') }
      }
    } catch (error) {
      if (signal.aborted || error.name === 'AbortError') {
        return { success: false, error }
      }
      console.error('Fetch product error:', error)
      set({ 
        isProductDetailLoading: false, 
        isLoading: false 
      })
      return { success: false, error }
    }
  },

  // Fetch categories with SWR caching
  fetchCategories: async (options = {}) => {
    if (fetchCategoriesController) {
      fetchCategoriesController.abort()
    }
    const controller = new AbortController()
    fetchCategoriesController = controller
    const signal = options.signal || controller.signal

    const cached = getCachedData('categories')
    if (cached && cached.length > 0) {
      set({ categories: cached, isCategoriesLoading: false })
    } else {
      set({ isCategoriesLoading: true, isLoading: true })
    }

    try {
      let query = supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })

      query = query.abortSignal(signal)
      const { data, error } = await query

      if (error) throw error

      if (signal.aborted) {
        return { success: false, error: new DOMException('Aborted', 'AbortError') }
      }

      // Map categories directly from database categories table
      const categoriesWithImages = (data || []).map(cat => ({
        ...cat,
        image_url: cat.image_url
      }))

      setCachedData('categories', categoriesWithImages)

      set({ 
        categories: categoriesWithImages, 
        isCategoriesLoading: false, 
        isLoading: get().isProductsLoading || get().isFeaturedLoading || get().isBestsellersLoading || get().isOffersLoading || get().isSearchLoading || get().isProductDetailLoading 
      })
      return { success: true, data: categoriesWithImages }
    } catch (error) {
      if (signal.aborted || error.name === 'AbortError') {
        return { success: false, error }
      }
      console.warn('Fetch categories error (falling back to cache):', error)
      const hasCategories = get().categories.length > 0
      set({ 
        isCategoriesLoading: false, 
        isLoading: get().isProductsLoading || get().isFeaturedLoading || get().isBestsellersLoading || get().isOffersLoading || get().isSearchLoading || get().isProductDetailLoading 
      })
      if (hasCategories) {
        return { success: true, fromCache: true, data: get().categories }
      }
      return { success: false, error }
    }
  },

  // Fetch offers/banners with SWR caching
  fetchOffers: async (options = {}) => {
    if (fetchOffersController) {
      fetchOffersController.abort()
    }
    const controller = new AbortController()
    fetchOffersController = controller
    const signal = options.signal || controller.signal

    const cached = getCachedData('offers')
    if (cached && cached.length > 0) {
      set({ offers: cached, isOffersLoading: false })
    } else {
      set({ isOffersLoading: true, isLoading: true })
    }

    try {
      let query = supabase
          .from('offers')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })

      query = query.abortSignal(signal)
      const { data, error } = await query

      if (error) throw error

      if (signal.aborted) {
        return { success: false, error: new DOMException('Aborted', 'AbortError') }
      }

      setCachedData('offers', data || [])

      set({ 
        offers: data, 
        isOffersLoading: false, 
        isLoading: get().isProductsLoading || get().isFeaturedLoading || get().isBestsellersLoading || get().isCategoriesLoading || get().isSearchLoading || get().isProductDetailLoading 
      })
      return { success: true, data }
    } catch (error) {
      if (signal.aborted || error.name === 'AbortError') {
        return { success: false, error }
      }
      console.warn('Fetch offers error (falling back to cache):', error)
      const hasOffers = get().offers.length > 0
      set({ 
        isOffersLoading: false, 
        isLoading: get().isProductsLoading || get().isFeaturedLoading || get().isBestsellersLoading || get().isCategoriesLoading || get().isSearchLoading || get().isProductDetailLoading 
      })
      if (hasOffers) {
        return { success: true, fromCache: true, data: get().offers }
      }
      return { success: false, error }
    }
  },

  // Search products
  searchProducts: async (searchTerm, options = {}) => {
    if (searchProductsController) {
      searchProductsController.abort()
    }
    const controller = new AbortController()
    searchProductsController = controller
    const signal = options.signal || controller.signal

    const trimmed = (searchTerm || '').trim()
    if (!trimmed) {
      set({ searchResults: [], spellingSuggestion: null, isSearchError: false, isSearchLoading: false })
      return { success: true, data: [] }
    }

    const citySlug = getActiveCitySlug() || 'global'
    const cacheKey = `${trimmed.toLowerCase()}:${citySlug}`
    const now = Date.now()

    // Fast path: instant 0ms return if cached and within TTL
    const cached = searchCache.get(cacheKey)
    if (cached && (now - cached.timestamp < SEARCH_CACHE_TTL)) {
      set({ 
        searchResults: cached.products, 
        spellingSuggestion: cached.spellingSuggestion, 
        isSearchLoading: false, 
        isSearchError: false 
      })
      return { success: true, data: cached.products }
    }

    let isTimeout = false
    const timeoutId = setTimeout(() => {
      isTimeout = true
      controller.abort()
    }, 12000) // 12 seconds timeout

    try {
      set({ isSearchLoading: true, isSearchError: false, isLoading: true })

      // Fetch search results and spelling suggestion in parallel
      const searchPromise = supabase
        .rpc('search_products_fuzzy', { 
          search_term: trimmed,
          similarity_threshold: 0.2
        })
        .select(`
          id, name, slug, brand, image_url, price, mrp, ozo_price, unit, is_available, is_upcoming, quantity_available, max_order_qty, is_vegetarian, is_featured, is_bestseller, category_id,
          category:categories (
            id,
            name,
            slug,
            parent_id,
            is_active
          )
        `)
        .limit(60)
        .abortSignal(signal)

      const suggestionPromise = supabase
        .rpc('get_spelling_suggestion', { search_term: trimmed })
        .abortSignal(signal)

      const [searchRes, suggestionRes] = await Promise.all([searchPromise, suggestionPromise])

      let products = []
      if (searchRes.error) {
        if (searchRes.error.code === '42501' || searchRes.error.status === 401 || searchRes.error.message?.includes('permission denied')) {
          console.warn('[searchProducts] RPC search permission denied, using standard table fallback');
          const sanitized = trimmed.replace(/[%_]/g, '');
          const fallbackRes = await supabase.from('products').select(`
            id, name, slug, brand, image_url, price, mrp, ozo_price, unit, is_available, is_upcoming, quantity_available, max_order_qty, is_vegetarian, is_featured, is_bestseller, category_id,
            category:categories (
              id, name, slug, parent_id, is_active
            )
          `)
          .or(`name.ilike.%${sanitized}%,brand.ilike.%${sanitized}%`)
          .limit(60)
          .abortSignal(signal);

          if (fallbackRes.error) throw fallbackRes.error;
          products = fallbackRes.data || [];
        } else {
          throw searchRes.error;
        }
      } else {
        products = searchRes.data || [];
      }

      if (signal.aborted) {
        return { success: false, error: new DOMException('Aborted', 'AbortError') }
      }
      const citySlug = getActiveCitySlug()

      if (citySlug && products.length > 0) {
        const productIds = products.map(p => p.id)
        const { data: cityAvail } = await supabase
          .from('product_city_availability')
          .select('product_id, city_price, city_mrp, city_ozo_price, is_featured, is_available, is_upcoming')
          .eq('city_slug', citySlug)
          .in('product_id', productIds)
          .abortSignal(signal)

        const availMap = new Map(cityAvail?.map(item => [item.product_id, item]) || [])
        
        products = products
          .map(p => {
            const imageMissing = isImageMissing(p.image_url);

            const isAdminOrMart = typeof window !== 'undefined' && 
              (window.location.pathname.includes('/admin') || 
               window.location.pathname.includes('/mart'));

            if (imageMissing && !isAdminOrMart) return null;

            const pca = availMap.get(p.id)
            const isAvailable = pca && pca.is_available !== null && pca.is_available !== undefined
              ? pca.is_available
              : p.is_available

            const isUpcomingRaw = pca && pca.is_upcoming !== null && pca.is_upcoming !== undefined
              ? pca.is_upcoming
              : (p.is_upcoming || false)

            const launchConfig = useCartStore.getState().launchConfig
            const launchModeEnabled = !!launchConfig?.launch_mode_enabled

            const isUpcoming = (launchModeEnabled && !isAvailable) ? true : isUpcomingRaw

            if (!isAvailable && !isUpcoming) return null

            const sellingPriceVal = pca?.city_price !== null && pca?.city_price !== undefined 
              ? parseFloat(pca.city_price) 
              : parseFloat(p.price)
            const mrpVal = pca?.city_mrp !== null && pca?.city_mrp !== undefined 
              ? parseFloat(pca.city_mrp) 
              : parseFloat(p.mrp)
            const ozoPriceVal = pca?.city_ozo_price !== null && pca?.city_ozo_price !== undefined
              ? parseFloat(pca.city_ozo_price)
              : (p.ozo_price !== null && p.ozo_price !== undefined ? parseFloat(p.ozo_price) : null)

            const displayPriceVal = (ozoPriceVal !== null && ozoPriceVal > 0) ? ozoPriceVal : sellingPriceVal

            return {
              ...p,
              price: displayPriceVal,
              selling_price: sellingPriceVal,
              ozo_price: ozoPriceVal,
              mrp: mrpVal,
              is_available: isAvailable,
              is_upcoming: isUpcoming,
              is_featured: pca && pca.is_featured !== null && pca.is_featured !== undefined
                ? pca.is_featured
                : p.is_featured,
              discount_percentage: (mrpVal && mrpVal > displayPriceVal) 
                ? Math.round(((mrpVal - displayPriceVal) / mrpVal) * 100) 
                : parseFloat(p.discount_percentage || 0)
            }
          })
          .filter(Boolean)
      } else {
        products = products.map(product => {
          const imageMissing = isImageMissing(product.image_url);

          const isAdminOrMart = typeof window !== 'undefined' && 
            (window.location.pathname.includes('/admin') || 
             window.location.pathname.includes('/mart'));

          if (imageMissing && !isAdminOrMart) return null;

          const sellingPriceVal = parseFloat(product.price)
          const mrpVal = parseFloat(product.mrp)
          const ozoPriceVal = product.ozo_price !== null && product.ozo_price !== undefined ? parseFloat(product.ozo_price) : null
          const displayPriceVal = (ozoPriceVal !== null && ozoPriceVal > 0) ? ozoPriceVal : sellingPriceVal

          return {
            ...product,
            price: displayPriceVal,
            selling_price: sellingPriceVal,
            ozo_price: ozoPriceVal,
            mrp: mrpVal,
            discount_percentage: (mrpVal && mrpVal > displayPriceVal) 
              ? Math.round(((mrpVal - displayPriceVal) / mrpVal) * 100)
              : parseFloat(product.discount_percentage || 0),
          }
        }).filter(Boolean)
      }

      // Sort search results: in-stock first, out-of-stock last
      products = products.sort((a, b) => {
        const aOOS = !a.is_available || a.quantity_available === 0;
        const bOOS = !b.is_available || b.quantity_available === 0;
        if (aOOS && !bOOS) return 1;
        if (!aOOS && bOOS) return -1;
        return 0;
      });

      // Cap results to desired display limit (20) after city filtering and sorting
      products = products.slice(0, 20);

      const spellingSuggestion = suggestionRes.data || null

      // Save to in-memory search cache
      if (searchCache.size > 100) {
        const firstKey = searchCache.keys().next().value
        searchCache.delete(firstKey)
      }
      searchCache.set(cacheKey, {
        products,
        spellingSuggestion,
        timestamp: Date.now()
      })

      set({ 
        searchResults: products, 
        spellingSuggestion,
        isSearchLoading: false, 
        isSearchError: false,
        isLoading: get().isProductsLoading || get().isFeaturedLoading || get().isBestsellersLoading || get().isCategoriesLoading || get().isOffersLoading || get().isProductDetailLoading 
      })
      return { success: true, data: products }
    } catch (error) {
      if (signal.aborted || error.name === 'AbortError') {
        if (isTimeout) {
          set({ isSearchError: true, isSearchLoading: false, isLoading: false })
        }
        return { success: false, error }
      }
      console.error('Search products error:', error)
      set({ 
        isSearchLoading: false, 
        isSearchError: true,
        isLoading: get().isProductsLoading || get().isFeaturedLoading || get().isBestsellersLoading || get().isCategoriesLoading || get().isOffersLoading || get().isProductDetailLoading 
      })
      return { success: false, error }
    } finally {
      clearTimeout(timeoutId)
    }
  },

  // Get products by category
  getProductsByCategory: async (categorySlug, options = {}) => {
    if (getProductsByCategoryController) {
      getProductsByCategoryController.abort()
    }
    const controller = new AbortController()
    getProductsByCategoryController = controller
    const signal = options.signal || controller.signal

    try {
      set({ isProductsLoading: true, isLoading: true })

      // First get category
      let categoryQuery = supabase
          .from('categories')
          .select('id')
          .eq('slug', categorySlug)
          .single()

      categoryQuery = categoryQuery.abortSignal(signal)
      const { data: category, error: categoryError } = await categoryQuery

      if (categoryError) throw categoryError

      if (signal.aborted) {
        return { success: false, error: new DOMException('Aborted', 'AbortError') }
      }

      // Get all child category IDs if this is a parent category
      let categoryIds = [category.id]
      let subcategoriesQuery = supabase
          .from('categories')
          .select('id')
          .eq('parent_id', category.id)
          .eq('is_active', true)

      subcategoriesQuery = subcategoriesQuery.abortSignal(signal)
      const { data: subcategories } = await subcategoriesQuery

      if (signal.aborted) {
        return { success: false, error: new DOMException('Aborted', 'AbortError') }
      }

      if (subcategories && subcategories.length > 0) {
        categoryIds = [...categoryIds, ...subcategories.map(s => s.id)]
      }

      // Then get products
      const citySlug = getActiveCitySlug()
      let productsQuery = buildProductQuery(supabase, citySlug, `
        id, name, slug, brand, image_url, price, mrp, ozo_price, unit, is_available, is_upcoming, quantity_available, max_order_qty, is_vegetarian, is_featured, is_bestseller, category_id,
        category:categories (
          id,
          name,
          slug,
          parent_id,
          is_active
        )
      `)
      .in('category_id', categoryIds)
      .order('name', { ascending: true })

      productsQuery = productsQuery.abortSignal(signal)
      const { data, error } = await productsQuery

      if (error) throw error

      if (signal.aborted) {
        return { success: false, error: new DOMException('Aborted', 'AbortError') }
      }

      const products = formatProductsWithCity(data, citySlug)

      set({ 
        products, 
        isProductsLoading: false, 
        isLoading: get().isFeaturedLoading || get().isBestsellersLoading || get().isCategoriesLoading || get().isOffersLoading || get().isSearchLoading || get().isProductDetailLoading 
      })
      return { success: true, data: products }
    } catch (error) {
      if (signal.aborted || error.name === 'AbortError') {
        return { success: false, error }
      }
      console.error('Get products by category error:', error)
      set({ 
        isProductsLoading: false, 
        isLoading: get().isFeaturedLoading || get().isBestsellersLoading || get().isCategoriesLoading || get().isOffersLoading || get().isSearchLoading || get().isProductDetailLoading 
      })
      return { success: false, error }
    }
  },

  // Apply filters
  applyFilters: (filters) => {
    set({ filters: { ...get().filters, ...filters } })
  },

  // Reset filters
  resetFilters: () => {
    set({
      filters: {
        category: null,
        priceRange: [0, 10000],
        sortBy: 'name',
        inStock: true,
      },
    })
  },

  // Clear search results
  clearSearchResults: () => {
    set({ searchResults: [], spellingSuggestion: null, isSearchError: false })
  },

  // Fetch all home page data with Stale-While-Revalidate (SWR) local caching
  fetchHomePageData: async (options = {}) => {
    const controller = new AbortController()
    const signal = options.signal || controller.signal

    const citySlug = getActiveCitySlug()
    const cacheKey = `home_${citySlug || 'default'}`
    const cached = getCachedData(cacheKey) || getCachedData('home_default')

    // If cache exists, hydrate immediately so user gets 0ms instant display on 2G/3G
    if (cached && (cached.categories?.length || cached.featuredProducts?.length)) {
      set({
        categories: cached.categories?.length ? cached.categories : get().categories,
        offers: cached.offers || get().offers,
        featuredProducts: cached.featuredProducts || get().featuredProducts,
        bestsellerProducts: cached.bestsellerProducts || get().bestsellerProducts,
        stealDeals: cached.stealDeals || get().stealDeals,
        summerSpecials: cached.summerSpecials || get().summerSpecials,
        mandi: cached.mandi || get().mandi,
        budgetPicks: cached.budgetPicks || get().budgetPicks,
        isHomeLoading: false,
        isFeaturedLoading: false,
        isBestsellersLoading: false,
        isCategoriesLoading: false,
        isOffersLoading: false
      })
    } else {
      set({ 
        isHomeLoading: true, 
        isFeaturedLoading: true,
        isBestsellersLoading: true,
        isCategoriesLoading: true,
        isOffersLoading: true,
        isLoading: true 
      })
    }

    try {
      let { data, error } = await supabase
        .rpc('get_home_page_data', { p_city_slug: citySlug || null })
        .abortSignal(signal)

      if (error) throw error

      if (signal.aborted) {
        return { success: false, error: new DOMException('Aborted', 'AbortError') }
      }

      const formatList = (list) => (list || []).map(ensureNumericPrices).filter(Boolean);
      const categoriesWithImages = (data?.categories || []).map(cat => ({
        ...cat,
        image_url: cat.image_url
      }))

      const freshHomeData = {
        categories: categoriesWithImages,
        offers: data?.offers || [],
        featuredProducts: formatList(data?.featured_products),
        bestsellerProducts: formatList(data?.bestseller_products),
        stealDeals: formatList(data?.steal_deals),
        summerSpecials: formatList(data?.summer_specials),
        mandi: formatList(data?.mandi),
        budgetPicks: formatList(data?.budget_picks),
      }

      // Persist to local cache for subsequent instant loads & offline browsing
      setCachedData(cacheKey, freshHomeData)
      if (citySlug) setCachedData('home_default', freshHomeData)

      set({
        ...freshHomeData,
        isHomeLoading: false,
        isFeaturedLoading: false,
        isBestsellersLoading: false,
        isCategoriesLoading: false,
        isOffersLoading: false,
        isLoading: get().isProductsLoading || get().isSearchLoading || get().isProductDetailLoading
      })

      return { success: true }
    } catch (error) {
      if (signal.aborted || error.name === 'AbortError') {
        return { success: false, error }
      }
      console.warn('Fetch home page data error (falling back to cache):', error)
      
      const hasExistingData = get().categories.length > 0 || get().featuredProducts.length > 0
      set({ 
        isHomeLoading: false,
        isFeaturedLoading: false,
        isBestsellersLoading: false,
        isCategoriesLoading: false,
        isOffersLoading: false,
        isLoading: get().isProductsLoading || get().isSearchLoading || get().isProductDetailLoading
      })

      // If cached data was already presented, return success so UI remains functional
      if (hasExistingData) {
        return { success: true, fromCache: true }
      }
      return { success: false, error }
    }
  },

  // Optimistic toggle product availability (instant 0ms UI update + background sync)
  toggleProductAvailability: async (productId, newStatus, martId = null) => {
    if (!productId) return { success: false }

    // Snapshot current state for rollback on error
    const prevProducts = get().products
    const prevFeatured = get().featuredProducts
    const prevBestsellers = get().bestsellerProducts
    const prevCurrentProduct = get().currentProduct

    const updateProductInList = (list) =>
      (list || []).map(p => {
        if (p.id === productId) {
          return { ...p, is_available: newStatus }
        }
        if (p.variants && Array.isArray(p.variants)) {
          return {
            ...p,
            variants: p.variants.map(v => v.id === productId ? { ...v, is_available: newStatus } : v)
          }
        }
        return p
      })

    // 1. OPTIMISTIC UPDATE: Update UI state instantly (0ms)
    set({
      products: updateProductInList(prevProducts),
      featuredProducts: updateProductInList(prevFeatured),
      bestsellerProducts: updateProductInList(prevBestsellers),
      currentProduct: prevCurrentProduct && prevCurrentProduct.id === productId
        ? { ...prevCurrentProduct, is_available: newStatus }
        : prevCurrentProduct
    })

    toast.success(newStatus ? 'Product marked In Stock!' : 'Product marked Out of Stock!', { duration: 1500 })

    // 2. BACKGROUND SYNC (Non-blocking):
    try {
      const updates = [
        supabaseAdmin.from('products').update({ is_available: newStatus }).eq('id', productId)
      ]

      if (martId) {
        updates.push(
          supabaseAdmin
            .from('mart_inventory')
            .update({ is_available: newStatus, updated_at: new Date().toISOString() })
            .eq('mart_id', martId)
            .eq('product_id', productId)
        )
      }

      const results = await Promise.all(updates)
      const hasError = results.some(r => r.error)
      if (hasError) {
        const firstErr = results.find(r => r.error)?.error
        throw firstErr || new Error('Failed to update product availability')
      }
      return { success: true }
    } catch (err) {
      console.error('Failed to sync product availability to database:', err)
      // Rollback to previous state on failure
      set({
        products: prevProducts,
        featuredProducts: prevFeatured,
        bestsellerProducts: prevBestsellers,
        currentProduct: prevCurrentProduct
      })
      toast.error('Failed to save stock change to server')
      return { success: false, error: err }
    }
  },

  // Clear products state (data only — do NOT reset loading flags here,
  // those are managed by each fetch function to avoid race conditions)
  clearProducts: () => {
    set({ products: [], currentProduct: null })
  },
})
)