import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useCartStore } from '../stores/cartStore'
import { supabase } from '../lib/supabase'
import ProductCard from './ProductCard'

// Complementary categories map for cross-selling recommendations
const COMPLEMENTARY_CATEGORIES = {
  'fresh-vegetables': ['staples-dals', 'dairy-bread-eggs'],
  'fresh-fruits': ['dairy-bread-eggs', 'beverages'],
  'dairy-bread-eggs': ['fresh-vegetables', 'snacks-packaged-foods'],
  'beverages': ['snacks-packaged-foods', 'dairy-bread-eggs'],
  'snacks-packaged-foods': ['beverages', 'dairy-bread-eggs'],
  'staples-dals': ['fresh-vegetables', 'mithila-bihar-specials'],
  'mithila-bihar-specials': ['staples-dals', 'snacks-packaged-foods']
}

// Standalone function to fetch products without mutating global Zustand store
const fetchProductsDirect = async (options = {}) => {
  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories (
          id,
          name,
          slug,
          is_active
        )
      `)

    if (options.categoryId) {
      // Find subcategories for this category ID
      const { data: subcategories } = await supabase
        .from('categories')
        .select('id')
        .eq('parent_id', options.categoryId)
        .eq('is_active', true);

      let categoryIds = [options.categoryId];
      if (subcategories && subcategories.length > 0) {
        categoryIds = [...categoryIds, ...subcategories.map(s => s.id)];
      }
      query = query.in('category_id', categoryIds);
    }
    
    if (options.categorySlug) {
      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', options.categorySlug)
        .eq('is_active', true)
        .single()
      if (category) {
        // Find subcategories
        const { data: subcategories } = await supabase
          .from('categories')
          .select('id')
          .eq('parent_id', category.id)
          .eq('is_active', true);

        let categoryIds = [category.id];
        if (subcategories && subcategories.length > 0) {
          categoryIds = [...categoryIds, ...subcategories.map(s => s.id)];
        }
        query = query.in('category_id', categoryIds);
      }
    }

    if (options.featured) {
      query = query.eq('is_featured', true)
    }

    if (options.bestseller) {
      query = query.eq('is_bestseller', true)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.signal) {
      query = query.abortSignal(options.signal)
    }

    const { data, error } = await query
    if (error) throw error

    return {
      success: true,
      data: (data || [])
        .filter(product => !(product.category && product.category.is_active === false))
        .map(product => ({
          ...product,
          price: parseFloat(product.price),
          mrp: parseFloat(product.mrp),
          discount_percentage: parseFloat(product.discount_percentage || 0),
        }))
    }
  } catch (error) {
    if (error.name === 'AbortError' || (options.signal && options.signal.aborted)) {
      return { success: false, data: [] }
    }
    console.error('fetchProductsDirect error:', error)
    return { success: false, data: [] }
  }
}

export default function SuggestedProducts({
  type = 'smart', // 'smart' | 'related' | 'frequently-bought' | 'recently-viewed' | 'trending' | 'bestsellers' | 'featured'
  productId = null, // Current product to exclude
  categoryId = null, // Specific category ID
  categorySlug = null, // Specific category slug
  excludeProductIds = [], // Array of product IDs to exclude
  limit = 6,
  title = null,
  showExploreButton = true,
  className = '',
  gridColsClass = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6',
  products: initialProducts = null,
  exploreLink = '/products'
}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const cartItemsCount = useCartStore(state => state.items.length)
  const cartCategorySlugs = useCartStore(useShallow(state => 
    state.items.map(item => item.product?.category?.slug || item.category_slug).filter(Boolean)
  ))

  const excludeIdsStr = JSON.stringify(excludeProductIds)
  const initialProductsIdsStr = Array.isArray(initialProducts) ? JSON.stringify(initialProducts.map(p => p?.id)) : ''

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()
    const { signal } = controller

    // If initialProducts is provided (e.g. from ProductDetail), use it directly
    if (Array.isArray(initialProducts)) {
      const excluded = new Set([productId, ...excludeProductIds].filter(Boolean))
      const filtered = initialProducts.filter(p => p && !excluded.has(p.id))
      const sortedFiltered = [...filtered].sort((a, b) => {
        const aOOS = !a?.is_available || a?.quantity_available === 0;
        const bOOS = !b?.is_available || b?.quantity_available === 0;
        if (aOOS && !bOOS) return 1;
        if (!aOOS && bOOS) return -1;
        return 0;
      });
      setProducts(sortedFiltered.slice(0, limit))
      setLoading(false)
      return
    }

    const loadRecommendations = async () => {
      setLoading(true)
      try {
        let recommendedList = []
        const excluded = new Set([productId, ...excludeProductIds].filter(Boolean))

        // 1. Get Recently Viewed product IDs from local storage
        const getRecentlyViewed = () => {
          try {
            const viewedIds = JSON.parse(localStorage.getItem('ozo_recently_viewed') || '[]')
            return viewedIds.filter(id => !excluded.has(id))
          } catch (e) {
            return []
          }
        }

        // 2. Cross-selling logic for frequently bought together based on Cart Items
        const getCrossSellCategorySlugs = () => {
          // cartCategorySlugs is retrieved via reactive fine-grained selector
          const result = new Set()
          cartCategorySlugs.forEach(slug => {
            const complements = COMPLEMENTARY_CATEGORIES[slug] || []
            complements.forEach(comp => result.add(comp))
          })
          return Array.from(result)
        }

        // Determine the actual type of recommendation to run
        let targetType = type
        if (type === 'smart') {
          if (productId) {
            targetType = 'related'
          } else if (cartItemsCount > 0) {
            targetType = 'frequently-bought'
          } else {
            const viewed = getRecentlyViewed()
            if (viewed.length > 0) {
              targetType = 'recently-viewed'
            } else {
              targetType = 'trending'
            }
          }
        }

        if (!isMounted) return

        // Execute queries based on targetType
        if (targetType === 'related') {
          // Category products
          let targetCategoryId = categoryId
          if (!targetCategoryId && productId) {
            let categoryQuery = supabase
              .from('products')
              .select('category_id')
              .eq('id', productId)
              .single()
            
            categoryQuery = categoryQuery.abortSignal(signal)
            const { data: currentProduct } = await categoryQuery
            if (currentProduct) {
              targetCategoryId = currentProduct.category_id
            }
          }
          if (!isMounted) return
          if (targetCategoryId) {
            const res = await fetchProductsDirect({ categoryId: targetCategoryId, signal })
            if (!isMounted) return
            if (res.success && res.data) {
              recommendedList = res.data.filter(p => !excluded.has(p.id))
            }
          }
        } else if (targetType === 'frequently-bought') {
          // Frequently bought together / Cross-selling
          const compSlugs = getCrossSellCategorySlugs()
          if (compSlugs.length > 0) {
            // Fetch products from complementary categories
            const promises = compSlugs.map(slug => fetchProductsDirect({ categorySlug: slug, signal }))
            const results = await Promise.all(promises)
            if (!isMounted) return
            results.forEach(res => {
              if (res.success && res.data) {
                recommendedList.push(...res.data)
              }
            })
            // Filter unique & excluded
            const seen = new Set()
            recommendedList = recommendedList.filter(p => {
              if (seen.has(p.id) || excluded.has(p.id)) return false
              seen.add(p.id)
              return true
            })
          }
        } else if (targetType === 'recently-viewed') {
          // Recently viewed products
          const viewedIds = getRecentlyViewed()
          if (viewedIds.length > 0) {
            let recentQuery = supabase
              .from('products')
              .select(`
                *,
                category:categories (
                  id,
                  name,
                  slug,
                  is_active
                )
              `)
              .in('id', viewedIds)

            recentQuery = recentQuery.abortSignal(signal)
            const { data, error } = await recentQuery

            if (!isMounted) return
            if (!error && data) {
              const formatted = data
                .filter(product => !(product.category && product.category.is_active === false))
                .map(product => ({
                  ...product,
                  price: parseFloat(product.price),
                  mrp: parseFloat(product.mrp),
                  discount_percentage: parseFloat(product.discount_percentage || 0),
                }))
              recommendedList = formatted.sort((a, b) => viewedIds.indexOf(a.id) - viewedIds.indexOf(b.id))
            }
          }
        } else if (targetType === 'trending' || targetType === 'bestsellers') {
          // Bestsellers / trending
          const res = await fetchProductsDirect({ bestseller: true, limit: limit * 2, signal })
          if (!isMounted) return
          if (res.success && res.data) {
            recommendedList = res.data.filter(p => !excluded.has(p.id))
          }
        } else if (targetType === 'featured') {
          // Featured items
          const res = await fetchProductsDirect({ featured: true, signal })
          if (!isMounted) return
          if (res.success && res.data) {
            recommendedList = res.data.filter(p => !excluded.has(p.id))
          }
        }

        // Fallback: If list is empty or has fewer items than limit, backfill with featured
        if (recommendedList.length < limit) {
          const res = await fetchProductsDirect({ featured: true, limit: limit * 3, signal })
          if (!isMounted) return
          if (res.success && res.data) {
            const fallbacks = res.data.filter(p => !excluded.has(p.id) && !recommendedList.some(r => r.id === p.id))
            recommendedList = [...recommendedList, ...fallbacks]
          }
        }

        if (isMounted) {
          const sortedList = [...recommendedList].sort((a, b) => {
            const aOOS = !a?.is_available || a?.quantity_available === 0;
            const bOOS = !b?.is_available || b?.quantity_available === 0;
            if (aOOS && !bOOS) return 1;
            if (!aOOS && bOOS) return -1;
            return 0;
          });
          // Take only the specified limit
          setProducts(sortedList.slice(0, limit))
        }
      } catch (err) {
        if (err.name === 'AbortError' || signal.aborted) {
          return
        }
        console.error('Error fetching recommendations:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadRecommendations()
    
    return () => {
      isMounted = false
      controller.abort()
    }
  }, [type, productId, categoryId, categorySlug, limit, initialProductsIdsStr, excludeIdsStr, cartItemsCount, cartCategorySlugs])

  // Helper to get default title if none provided
  const getDefaultTitle = () => {
    if (title) return title
    let targetType = type
    if (type === 'smart') {
      if (productId) targetType = 'related'
      else if (cartItemsCount > 0) targetType = 'frequently-bought'
      else {
        const viewedIds = JSON.parse(localStorage.getItem('ozo_recently_viewed') || '[]')
        targetType = viewedIds.length > 0 ? 'recently-viewed' : 'trending'
      }
    }

    switch (targetType) {
      case 'related': return 'Related Products'
      case 'frequently-bought': return 'Frequently Bought Together'
      case 'recently-viewed': return 'Recently Viewed Items'
      case 'trending': return 'Trending Right Now'
      case 'bestsellers': return 'Our Bestsellers'
      case 'featured':
      default:
        return 'Suggested Products'
    }
  }

  const renderTitle = (titleString) => {
    if (!titleString) return null
    const words = titleString.trim().split(/\s+/)
    if (words.length <= 1) {
      return <>{titleString}<span className="text-gradient">.</span></>
    }
    const firstPart = words.slice(0, -1).join(' ')
    const lastWord = words[words.length - 1]
    return <>{firstPart} <span className="text-gradient">{lastWord}.</span></>
  }

  if (loading) {
    return (
      <div className={`suggested-products-section ${className}`}>
        <h3 className="text-2xl font-black mb-8 text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <span>{getDefaultTitle()}</span>
          <Sparkles className="w-5 h-5 text-ozo-red animate-pulse" />
        </h3>
        <div className={`grid ${gridColsClass} gap-3 sm:gap-6`}>
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="aspect-square bg-white dark:bg-[#111] rounded-[2.5rem] shimmer border border-white/20 dark:border-white/5" />
          ))}
        </div>
      </div>
    )
  }

  if (products.length === 0) return null

  return (
    <div className={`suggested-products-section ${className}`}>
      <h3 className="text-2xl font-black mb-8 text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
        <span>{renderTitle(getDefaultTitle())}</span>
      </h3>
      <div className={`grid ${gridColsClass} gap-3 sm:gap-6`}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {showExploreButton && (
        <div className="flex justify-center mt-10">
          <Link
            to={exploreLink}
            className="group inline-flex items-center gap-2 px-8 py-3.5 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-2xl font-bold shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            <span>Explore More Products</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      )}
    </div>
  )
}
