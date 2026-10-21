import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useCartStore } from '../stores/cartStore'
import { supabase } from '../lib/supabase'
import ProductCard from './ProductCard'
import { isProductImageMissing } from '../utils/productUtils'
import { 
  scoreProductRelevance, 
  resolveComplementarySlugs, 
  getCachedRecommendations, 
  setCachedRecommendations 
} from '../utils/recommendationEngine'

/**
 * Standard product select query for high-performance recommendation joins
 */
const PRODUCT_SELECT_FIELDS = `
  id, name, slug, brand, image_url, price, mrp, ozo_price, unit, 
  is_available, is_upcoming, quantity_available, max_order_qty, 
  is_vegetarian, is_featured, is_bestseller, category_id,
  category:categories (
    id,
    name,
    slug,
    parent_id,
    is_active
  )
`

/**
 * Normalizes Supabase product rows into clean float numbers & filters missing images
 */
const formatCandidateProducts = (rawProducts = []) => {
  if (!Array.isArray(rawProducts)) return []
  return rawProducts
    .filter(p => p && p.category && p.category.is_active !== false)
    .filter(p => !isProductImageMissing(p))
    .map(p => ({
      ...p,
      price: parseFloat(p.price || 0),
      mrp: parseFloat(p.mrp || 0),
      ozo_price: p.ozo_price !== null && p.ozo_price !== undefined ? parseFloat(p.ozo_price) : null,
      discount_percentage: parseFloat(p.discount_percentage || 0)
    }))
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
  gridColsClass = 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6',
  products: initialProducts = null,
  exploreLink = '/products'
}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  // Reactive fine-grained cart selectors to prevent unnecessary re-renders
  const cartItemsCount = useCartStore(state => state.items.length)
  const cartItemProductIds = useCartStore(useShallow(state => 
    state.items.map(item => item.product?.id || item.product_id).filter(Boolean)
  ))
  const cartCategorySlugs = useCartStore(useShallow(state => 
    state.items.map(item => item.product?.category?.slug || item.category_slug).filter(Boolean)
  ))

  const excludeIdsStr = JSON.stringify(excludeProductIds)
  const initialProductsIdsStr = Array.isArray(initialProducts) ? JSON.stringify(initialProducts.map(p => p?.id)) : ''
  const cartHash = useMemo(() => cartItemProductIds.slice().sort().join(','), [cartItemProductIds])

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()
    const { signal } = controller

    // Fast-path: If caller supplied explicit product list (e.g. from static catalog), score & render directly
    if (Array.isArray(initialProducts)) {
      const excluded = new Set([productId, ...excludeProductIds].filter(Boolean))
      const formatted = formatCandidateProducts(initialProducts).filter(p => !excluded.has(p.id))
      const sorted = formatted.sort((a, b) => scoreProductRelevance(b) - scoreProductRelevance(a))
      setProducts(sorted.slice(0, limit))
      setLoading(false)
      return
    }

    const loadRecommendations = async () => {
      // 1. Determine effective target type
      let targetType = type
      if (type === 'smart') {
        if (productId) {
          targetType = 'related'
        } else if (cartItemsCount > 0) {
          targetType = 'frequently-bought'
        } else {
          try {
            const viewed = JSON.parse(localStorage.getItem('ozo_recently_viewed') || '[]')
            targetType = viewed.length > 0 ? 'recently-viewed' : 'trending'
          } catch {
            targetType = 'trending'
          }
        }
      }

      // 2. Check 0ms in-memory cache
      const cacheKey = `${targetType}:${productId || ''}:${categoryId || ''}:${categorySlug || ''}:${cartHash}:${limit}`
      const cachedData = getCachedRecommendations(cacheKey)
      if (cachedData && cachedData.length > 0) {
        setProducts(cachedData)
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        let recommendedList = []
        const excluded = new Set([productId, ...excludeProductIds, ...cartItemProductIds].filter(Boolean))

        // Contextual variables
        let baseProduct = null

        // -------------------------------------------------------------
        // BRANCH A: RELATED PRODUCTS (For ProductDetail page)
        // -------------------------------------------------------------
        if (targetType === 'related') {
          let directCategoryId = categoryId

          // If base product info is not provided, fetch product & category metadata
          if (productId) {
            const { data: baseProdData } = await supabase
              .from('products')
              .select(`
                id, name, brand, price, category_id,
                category:categories (id, name, slug, parent_id)
              `)
              .eq('id', productId)
              .abortSignal(signal)
              .maybeSingle()

            if (baseProdData) {
              baseProduct = baseProdData
              directCategoryId = directCategoryId || baseProdData.category_id
            }
          }

          if (!isMounted) return

          // Build hierarchical category collection:
          // 1. Direct subcategory (e.g. rolled-oats)
          // 2. Sibling subcategories under parent (e.g. breakfast-cereals, bakery-grains)
          // 3. High-affinity complementary categories (e.g. milk, peanut-butter)
          const targetCategoryIds = new Set()
          const siblingCategoryIds = new Set()
          const complementaryCategoryIds = new Set()

          if (directCategoryId) {
            targetCategoryIds.add(directCategoryId)

            // Resolve category record to inspect parent & slug
            let catRecord = baseProduct?.category
            if (!catRecord) {
              const { data: catData } = await supabase
                .from('categories')
                .select('id, parent_id, slug')
                .eq('id', directCategoryId)
                .abortSignal(signal)
                .maybeSingle()
              catRecord = catData
            }

            if (catRecord) {
              // Sibling resolution
              const parentIdToSearch = catRecord.parent_id || catRecord.id
              const { data: siblings } = await supabase
                .from('categories')
                .select('id')
                .eq('parent_id', parentIdToSearch)
                .eq('is_active', true)
                .abortSignal(signal)

              if (siblings && siblings.length > 0) {
                siblings.forEach(s => {
                  if (s.id !== directCategoryId) {
                    siblingCategoryIds.add(s.id)
                  }
                })
              }

              // Complementary slug resolution
              const compSlugs = resolveComplementarySlugs([catRecord.slug])
              if (compSlugs.length > 0) {
                const { data: compCats } = await supabase
                  .from('categories')
                  .select('id')
                  .in('slug', compSlugs)
                  .eq('is_active', true)
                  .abortSignal(signal)

                if (compCats && compCats.length > 0) {
                  compCats.forEach(c => complementaryCategoryIds.add(c.id))
                }
              }
            }
          }

          // Combine all resolved category IDs for a single batched query
          const allQueryCategoryIds = [
            ...Array.from(targetCategoryIds),
            ...Array.from(siblingCategoryIds),
            ...Array.from(complementaryCategoryIds)
          ]

          if (allQueryCategoryIds.length > 0) {
            const { data: candidates, error } = await supabase
              .from('products')
              .select(PRODUCT_SELECT_FIELDS)
              .in('category_id', allQueryCategoryIds)
              .limit(Math.max(limit * 5, 30))
              .abortSignal(signal)

            if (!error && candidates) {
              const formatted = formatCandidateProducts(candidates).filter(p => !excluded.has(p.id))

              // Score each candidate with hierarchical distance weighting
              const scored = formatted.map(p => {
                let score = scoreProductRelevance(p, { baseProduct, isCartContext: false })
                if (targetCategoryIds.has(p.category_id)) {
                  score += 60 // Exact same subcategory
                } else if (siblingCategoryIds.has(p.category_id)) {
                  score += 25 // Sibling category under same parent
                } else if (complementaryCategoryIds.has(p.category_id)) {
                  score += 15 // Complementary cross-sell
                }
                return { product: p, score }
              })

              scored.sort((a, b) => b.score - a.score)
              recommendedList = scored.map(s => s.product)
            }
          }

        // -------------------------------------------------------------
        // BRANCH B: FREQUENTLY BOUGHT TOGETHER (For Cart cross-sells)
        // -------------------------------------------------------------
        } else if (targetType === 'frequently-bought') {
          // Resolve all complementary category slugs from all items currently in cart
          const compSlugs = resolveComplementarySlugs(cartCategorySlugs)

          if (compSlugs.length > 0) {
            // Find both parent and child category IDs matching complementary slugs
            const { data: matchedCats } = await supabase
              .from('categories')
              .select('id, parent_id, slug')
              .in('slug', compSlugs)
              .eq('is_active', true)
              .abortSignal(signal)

            const targetCategoryIds = new Set()
            const parentIds = []

            if (matchedCats && matchedCats.length > 0) {
              matchedCats.forEach(c => {
                targetCategoryIds.add(c.id)
                if (!c.parent_id) {
                  parentIds.push(c.id)
                }
              })
            }

            // Include any subcategories under matched parents
            if (parentIds.length > 0) {
              const { data: subcats } = await supabase
                .from('categories')
                .select('id')
                .in('parent_id', parentIds)
                .eq('is_active', true)
                .abortSignal(signal)

              if (subcats && subcats.length > 0) {
                subcats.forEach(s => targetCategoryIds.add(s.id))
              }
            }

            if (targetCategoryIds.size > 0) {
              const { data: candidates, error } = await supabase
                .from('products')
                .select(PRODUCT_SELECT_FIELDS)
                .in('category_id', Array.from(targetCategoryIds))
                .eq('is_available', true)
                .limit(Math.max(limit * 4, 30))
                .abortSignal(signal)

              if (!error && candidates) {
                const formatted = formatCandidateProducts(candidates).filter(p => !excluded.has(p.id))

                // Score candidates with Cart context (impulse sweet-spot under ₹200 bonus)
                const scored = formatted.map(p => ({
                  product: p,
                  score: scoreProductRelevance(p, { isCartContext: true })
                }))

                scored.sort((a, b) => b.score - a.score)
                recommendedList = scored.map(s => s.product)
              }
            }
          }

        // -------------------------------------------------------------
        // BRANCH C: RECENTLY VIEWED PRODUCTS
        // -------------------------------------------------------------
        } else if (targetType === 'recently-viewed') {
          let viewedIds = []
          try {
            viewedIds = JSON.parse(localStorage.getItem('ozo_recently_viewed') || '[]')
          } catch {
            viewedIds = []
          }

          const filteredViewedIds = viewedIds.filter(id => !excluded.has(id))
          if (filteredViewedIds.length > 0) {
            const { data: candidates, error } = await supabase
              .from('products')
              .select(PRODUCT_SELECT_FIELDS)
              .in('id', filteredViewedIds.slice(0, 15))
              .abortSignal(signal)

            if (!error && candidates) {
              const formatted = formatCandidateProducts(candidates)
              // Preserve recency order, but push OOS to bottom
              recommendedList = formatted.sort((a, b) => {
                const aOOS = !a?.is_available || a?.quantity_available === 0
                const bOOS = !b?.is_available || b?.quantity_available === 0
                if (aOOS && !bOOS) return 1
                if (!aOOS && bOOS) return -1
                return filteredViewedIds.indexOf(a.id) - filteredViewedIds.indexOf(b.id)
              })
            }
          }

        // -------------------------------------------------------------
        // BRANCH D: TRENDING / BESTSELLERS / FEATURED
        // -------------------------------------------------------------
        } else if (targetType === 'trending' || targetType === 'bestsellers') {
          const { data: candidates, error } = await supabase
            .from('products')
            .select(PRODUCT_SELECT_FIELDS)
            .eq('is_bestseller', true)
            .limit(limit * 3)
            .abortSignal(signal)

          if (!error && candidates) {
            const formatted = formatCandidateProducts(candidates).filter(p => !excluded.has(p.id))
            const scored = formatted.map(p => ({
              product: p,
              score: scoreProductRelevance(p, { isCartContext: cartItemsCount > 0 })
            }))
            scored.sort((a, b) => b.score - a.score)
            recommendedList = scored.map(s => s.product)
          }
        } else if (targetType === 'featured') {
          const { data: candidates, error } = await supabase
            .from('products')
            .select(PRODUCT_SELECT_FIELDS)
            .eq('is_featured', true)
            .limit(limit * 3)
            .abortSignal(signal)

          if (!error && candidates) {
            const formatted = formatCandidateProducts(candidates).filter(p => !excluded.has(p.id))
            const scored = formatted.map(p => ({
              product: p,
              score: scoreProductRelevance(p, { isCartContext: cartItemsCount > 0 })
            }))
            scored.sort((a, b) => b.score - a.score)
            recommendedList = scored.map(s => s.product)
          }
        }

        if (!isMounted) return

        // -------------------------------------------------------------
        // GUARANTEED FALLBACK: Backfill with top bestsellers if list < limit
        // -------------------------------------------------------------
        if (recommendedList.length < limit) {
          const { data: fallbackCandidates } = await supabase
            .from('products')
            .select(PRODUCT_SELECT_FIELDS)
            .eq('is_bestseller', true)
            .limit(limit * 2)
            .abortSignal(signal)

          if (fallbackCandidates && isMounted) {
            const formatted = formatCandidateProducts(fallbackCandidates)
              .filter(p => !excluded.has(p.id) && !recommendedList.some(r => r.id === p.id))
            recommendedList = [...recommendedList, ...formatted]
          }
        }

        // Final deduplication & limit capping
        const seen = new Set()
        const finalList = []
        for (const item of recommendedList) {
          if (!seen.has(item.id)) {
            seen.add(item.id)
            finalList.push(item)
          }
          if (finalList.length >= limit) break
        }

        if (isMounted) {
          setProducts(finalList)
          // Cache successful result for instant 0ms subsequent views
          if (finalList.length > 0) {
            setCachedRecommendations(cacheKey, finalList)
          }
        }
      } catch (err) {
        if (err.name === 'AbortError' || signal.aborted) {
          return
        }
        console.error('[SuggestedProducts] recommendation engine error:', err)
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
  }, [
    type, 
    productId, 
    categoryId, 
    categorySlug, 
    limit, 
    initialProductsIdsStr, 
    excludeIdsStr, 
    cartItemsCount, 
    cartHash, 
    cartCategorySlugs
  ])

  // Contextual header title generator
  const getDefaultTitle = () => {
    if (title) return title
    let targetType = type
    if (type === 'smart') {
      if (productId) targetType = 'related'
      else if (cartItemsCount > 0) targetType = 'frequently-bought'
      else {
        try {
          const viewedIds = JSON.parse(localStorage.getItem('ozo_recently_viewed') || '[]')
          targetType = viewedIds.length > 0 ? 'recently-viewed' : 'trending'
        } catch {
          targetType = 'trending'
        }
      }
    }

    switch (targetType) {
      case 'related': 
        return 'You Might Also Like'
      case 'frequently-bought': 
        return cartItemsCount > 0 ? 'Pairs Well With Your Cart' : 'Frequently Bought Together'
      case 'recently-viewed': 
        return 'Recently Viewed Items'
      case 'trending': 
        return 'Trending Right Now'
      case 'bestsellers': 
        return 'Our Bestsellers'
      case 'featured':
      default:
        return 'Suggested For You'
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
