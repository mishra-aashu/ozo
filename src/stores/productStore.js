import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { useLocationStore } from './locationStore'
import { useCartStore } from './cartStore'

// File-scoped references to cancel active in-flight requests on concurrent calls
let fetchProductsController = null
let fetchFeaturedProductsController = null
let fetchBestsellerProductsController = null
let fetchCategoriesController = null
let fetchOffersController = null
let fetchProductBySlugController = null
let searchProductsController = null
let getProductsByCategoryController = null

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

    const isImageMissing = !product.image_url || 
      product.image_url.includes('raw.githubusercontent.com') || 
      product.image_url.includes('logo_transparent.png');

    const isAdminOrMart = typeof window !== 'undefined' && 
      (window.location.pathname.includes('/admin') || 
       window.location.pathname.includes('/mart'));

    if (isImageMissing && !isAdminOrMart && !allowMissingImage) {
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

  return formatted.sort((a, b) => {
    const aOOS = !a.is_available || a.quantity_available === 0;
    const bOOS = !b.is_available || b.quantity_available === 0;
    if (aOOS && !bOOS) return 1;
    if (!aOOS && bOOS) return -1;
    return 0;
  });
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

export const useProductStore = create((set, get) => ({
  // State
  products: [],
  featuredProducts: [],
  bestsellerProducts: [],
  categories: [],
  offers: [],
  stealDeals: [],
  summerSpecials: [],
  mandi: [],
  budgetPicks: [],
  isLoading: false,
  isProductsLoading: false,
  isFeaturedLoading: false,
  isBestsellersLoading: false,
  isCategoriesLoading: false,
  isOffersLoading: false,
  isSearchLoading: false,
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

      const citySlug = useLocationStore.getState().selectedCitySlug
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
      
      const citySlug = useLocationStore.getState().selectedCitySlug
      
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
      
      const citySlug = useLocationStore.getState().selectedCitySlug
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

  // Fetch single product by slug
  fetchProductBySlug: async (slug, options = {}) => {
    if (fetchProductBySlugController) {
      fetchProductBySlugController.abort()
    }
    const controller = new AbortController()
    fetchProductBySlugController = controller
    const signal = options.signal || controller.signal

    try {
      set({ currentProduct: null, isProductDetailLoading: true, isLoading: true })

      const citySlug = useLocationStore.getState().selectedCitySlug
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
      
      // Since buildProductQuery might query multiple rows if PCA has duplicates (though it shouldn't),
      // we get the single item
      if (citySlug) {
        // PostgREST will wrap inner join items, we can call single() or just take the first item
        query = query.single()
      } else {
        query = query.single()
      }

      query = query.abortSignal(signal)
      const { data, error } = await query

      if (error) throw error

      if (signal.aborted) {
        return { success: false, error: new DOMException('Aborted', 'AbortError') }
      }

      const formatted = formatProductsWithCity([data], citySlug, true, true)
      const product = formatted[0]

      set({ 
        currentProduct: product, 
        isProductDetailLoading: false, 
        isLoading: get().isProductsLoading || get().isFeaturedLoading || get().isBestsellersLoading || get().isCategoriesLoading || get().isOffersLoading || get().isSearchLoading 
      })
      return { success: true, data: product }
    } catch (error) {
      if (signal.aborted || error.name === 'AbortError') {
        return { success: false, error }
      }
      console.error('Fetch product error:', error)
      set({ 
        isProductDetailLoading: false, 
        isLoading: get().isProductsLoading || get().isFeaturedLoading || get().isBestsellersLoading || get().isCategoriesLoading || get().isOffersLoading || get().isSearchLoading 
      })
      return { success: false, error }
    }
  },

  // Fetch categories
  fetchCategories: async (options = {}) => {
    if (fetchCategoriesController) {
      fetchCategoriesController.abort()
    }
    const controller = new AbortController()
    fetchCategoriesController = controller
    const signal = options.signal || controller.signal

    try {
      set({ isCategoriesLoading: true, isLoading: true })
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

      // Map categories directly from database categories table (which contains pre-populated image URLs)
      const categoriesWithImages = (data || []).map(cat => ({
        ...cat,
        image_url: cat.image_url
      }))

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
      console.error('Fetch categories error:', error)
      set({ 
        isCategoriesLoading: false, 
        isLoading: get().isProductsLoading || get().isFeaturedLoading || get().isBestsellersLoading || get().isOffersLoading || get().isSearchLoading || get().isProductDetailLoading 
      })
      return { success: false, error }
    }
  },

  // Fetch offers/banners
  fetchOffers: async (options = {}) => {
    if (fetchOffersController) {
      fetchOffersController.abort()
    }
    const controller = new AbortController()
    fetchOffersController = controller
    const signal = options.signal || controller.signal

    try {
      set({ isOffersLoading: true, isLoading: true })
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
      console.error('Fetch offers error:', error)
      set({ 
        isOffersLoading: false, 
        isLoading: get().isProductsLoading || get().isFeaturedLoading || get().isBestsellersLoading || get().isCategoriesLoading || get().isSearchLoading || get().isProductDetailLoading 
      })
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

    try {
      if (!searchTerm || searchTerm.trim() === '') {
        set({ searchResults: [], spellingSuggestion: null })
        return { success: true, data: [] }
      }

      set({ isSearchLoading: true, isLoading: true })

      // Fetch search results and spelling suggestion in parallel
      const searchPromise = supabase
        .rpc('search_products_fuzzy', { 
          search_term: searchTerm,
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
        .limit(20)
        .abortSignal(signal)

      const suggestionPromise = supabase
        .rpc('get_spelling_suggestion', { search_term: searchTerm })
        .abortSignal(signal)

      const [searchRes, suggestionRes] = await Promise.all([
        searchPromise,
        suggestionPromise
      ])

      if (searchRes.error) throw searchRes.error

      if (signal.aborted) {
        return { success: false, error: new DOMException('Aborted', 'AbortError') }
      }

      let products = searchRes.data || []
      const citySlug = useLocationStore.getState().selectedCitySlug

      if (citySlug && products.length > 0) {
        const productIds = products.map(p => p.id)
        const { data: cityAvail } = await supabase
          .from('product_city_availability')
          .select('product_id, city_price, city_mrp, city_ozo_price, is_featured, is_available, is_upcoming')
          .eq('city_slug', citySlug)
          .in('product_id', productIds)

        const availMap = new Map(cityAvail?.map(item => [item.product_id, item]) || [])
        
        products = products
          .map(p => {
            const isImageMissing = !p.image_url || 
              p.image_url.includes('raw.githubusercontent.com') || 
              p.image_url.includes('logo_transparent.png');

            const isAdminOrMart = typeof window !== 'undefined' && 
              (window.location.pathname.includes('/admin') || 
               window.location.pathname.includes('/mart'));

            if (isImageMissing && !isAdminOrMart) return null;

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
          const isImageMissing = !product.image_url || 
            product.image_url.includes('raw.githubusercontent.com') || 
            product.image_url.includes('logo_transparent.png');

          const isAdminOrMart = typeof window !== 'undefined' && 
            (window.location.pathname.includes('/admin') || 
             window.location.pathname.includes('/mart'));

          if (isImageMissing && !isAdminOrMart) return null;

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

      set({ 
        searchResults: products, 
        spellingSuggestion: suggestionRes.data || null,
        isSearchLoading: false, 
        isLoading: get().isProductsLoading || get().isFeaturedLoading || get().isBestsellersLoading || get().isCategoriesLoading || get().isOffersLoading || get().isProductDetailLoading 
      })
      return { success: true, data: products }
    } catch (error) {
      if (signal.aborted || error.name === 'AbortError') {
        return { success: false, error }
      }
      console.error('Search products error:', error)
      set({ 
        isSearchLoading: false, 
        isLoading: get().isProductsLoading || get().isFeaturedLoading || get().isBestsellersLoading || get().isCategoriesLoading || get().isOffersLoading || get().isProductDetailLoading 
      })
      return { success: false, error }
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
      const citySlug = useLocationStore.getState().selectedCitySlug
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
    set({ searchResults: [], spellingSuggestion: null })
  },

  // Fetch all home page data in a single batched RPC query
  fetchHomePageData: async (options = {}) => {
    const controller = new AbortController()
    const signal = options.signal || controller.signal

    try {
      set({ 
        isHomeLoading: true, 
        isFeaturedLoading: true,
        isBestsellersLoading: true,
        isCategoriesLoading: true,
        isOffersLoading: true,
        isLoading: true 
      })

      const citySlug = useLocationStore.getState().selectedCitySlug
      
      const { data, error } = await supabase
        .rpc('get_home_page_data', { p_city_slug: citySlug || null })
        .abortSignal(signal)

      if (error) throw error

      if (signal.aborted) {
        return { success: false, error: new DOMException('Aborted', 'AbortError') }
      }

      const formatList = (list) => (list || []).map(ensureNumericPrices).filter(Boolean);

      const categoriesWithImages = (data.categories || []).map(cat => ({
        ...cat,
        image_url: cat.image_url
      }))

      set({
        categories: categoriesWithImages,
        offers: data.offers || [],
        featuredProducts: formatList(data.featured_products),
        bestsellerProducts: formatList(data.bestseller_products),
        stealDeals: formatList(data.steal_deals),
        summerSpecials: formatList(data.summer_specials),
        mandi: formatList(data.mandi),
        budgetPicks: formatList(data.budget_picks),
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
      console.error('Fetch home page data error:', error)
      set({ 
        isHomeLoading: false,
        isFeaturedLoading: false,
        isBestsellersLoading: false,
        isCategoriesLoading: false,
        isOffersLoading: false,
        isLoading: get().isProductsLoading || get().isSearchLoading || get().isProductDetailLoading
      })
      return { success: false, error }
    }
  },

  // Clear products state (data only — do NOT reset loading flags here,
  // those are managed by each fetch function to avoid race conditions)
  clearProducts: () => {
    set({ products: [], currentProduct: null })
  },
})
)