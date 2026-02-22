import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Filter,
  ChevronDown,
  LayoutGrid,
  List,
  Search as SearchIcon,
  X,
  SlidersHorizontal,
  Box,
  Check,
  ShoppingBag,
  ChevronLeft
} from 'lucide-react'
import { useProductStore } from '../stores/productStore'
import ProductCard from '../components/ProductCard'
import SortDropdown, { sortOptions } from '../components/SortDropdown'
import { resolveCategoryIcon } from '../components/CategoryChip'
import toast from 'react-hot-toast'
import { useProductPagination } from '../hooks/useProductPagination'
import OzoLoadingGuard from '../components/OzoLoadingGuard'
import TopCategories from '../components/TopCategories'
import ProductSkeleton from '../components/ProductSkeleton'
import SEO from '../components/SEO'

const Products = () => {
  const productsSchema = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "OZO Mart Shop Catalog",
    "description": "Browse and order online from OZO Mart's wide catalog of products, including fresh seasonal fruits, organic vegetables, daily snacks, beverages, and Mithila regional foods.",
    "url": "https://ozomart.store/products",
    "about": {
      "@type": "Thing",
      "name": "Online Grocery Shopping"
    }
  }), []);
  const renderTitle = (titleString) => {
    if (!titleString || typeof titleString !== 'string') return null
    const words = titleString.trim().split(/\s+/)
    if (words.length <= 1) {
      return <>{titleString}<span className="text-gradient">.</span></>
    }
    const firstPart = words.slice(0, -1).join(' ')
    const lastWord = words[words.length - 1]
    return <>{firstPart} <span className="text-gradient">{lastWord}.</span></>
  }

  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const filterParam = searchParams.get('filter')
  const searchParam = searchParams.get('q')

  // Redirect to dedicated search page if search parameter is present
  useEffect(() => {
    if (searchParam) {
      navigate(`/search?q=${encodeURIComponent(searchParam)}`, { replace: true })
    }
  }, [searchParam, navigate])

  const [viewMode, setViewMode] = useState('grid')
  const [showMobileFilters, setShowMobileFilters] = useState(false)


  const categories = useProductStore(state => state.categories)
  const fetchCategories = useProductStore(state => state.fetchCategories)

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [expandedParents, setExpandedParents] = useState({})

  // Group categories into parent-child hierarchy
  const structuredCategories = useMemo(() => {
    const parents = categories.filter(c => !c.parent_id)
    const children = categories.filter(c => c.parent_id)
    return parents.map(parent => ({
      ...parent,
      subcategories: children.filter(child => child.parent_id === parent.id)
    }))
  }, [categories])

  // Automatically expand the parent category if a subcategory is active
  useEffect(() => {
    if (selectedCategory && selectedCategory !== 'all' && categories.length > 0) {
      const current = categories.find(c => c.id === selectedCategory)
      if (current && current.parent_id) {
        setExpandedParents(prev => ({
          ...prev,
          [current.parent_id]: true
        }))
      }
    }
  }, [selectedCategory, categories])

  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories()
    }
  }, [categories, fetchCategories])

  const {
    products,
    isLoading: isProductsLoading,
    isLoadingMore,
    isError,
    hasMore,
    fetchProductsPage,
    spellingSuggestion
  } = useProductPagination()

  useEffect(() => {
    fetchProductsPage({
      featured: filterParam === 'featured',
      bestseller: filterParam === 'bestseller',
      search: searchParam || undefined,
      categoryId: selectedCategory === 'all' ? undefined : selectedCategory
    })
  }, [filterParam, searchParam, selectedCategory, fetchProductsPage])

  const handleLoadMore = useCallback(() => {
    fetchProductsPage({
      featured: filterParam === 'featured',
      bestseller: filterParam === 'bestseller',
      search: searchParam || undefined,
      categoryId: selectedCategory === 'all' ? undefined : selectedCategory
    }, true)
  }, [fetchProductsPage, filterParam, searchParam, selectedCategory])

  const observerRef = useRef(null)

  useEffect(() => {
    if (!hasMore || isLoadingMore || isProductsLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore()
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    )

    const currentTarget = observerRef.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, isLoadingMore, isProductsLoading, handleLoadMore])

  const refetch = useCallback(() => {
    fetchProductsPage({
      featured: filterParam === 'featured',
      bestseller: filterParam === 'bestseller',
      search: searchParam || undefined,
      categoryId: selectedCategory === 'all' ? undefined : selectedCategory
    })
  }, [fetchProductsPage, filterParam, searchParam, selectedCategory])

  const [sortBy, setSortBy] = useState('random')

  // Compute maximum price of items
  const maxCategoryPrice = useMemo(() => {
    if (products.length === 0) return 2000
    return Math.max(...products.map(p => p?.price || 0), 2000)
  }, [products])

  const [priceLimit, setPriceLimit] = useState(2000)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [bestsellerOnly, setBestsellerOnly] = useState(false)
  const [featuredOnly, setFeaturedOnly] = useState(false)

  // Reset price limit when max price changes
  useEffect(() => {
    setPriceLimit(maxCategoryPrice)
  }, [maxCategoryPrice])

  // Filter and sort products locally
  const filteredAndSortedProducts = useMemo(() => {
    let result = [...products]

    // Apply Price Filter
    result = result.filter(p => (p?.price || 0) <= priceLimit)

    // Apply Stock Filter
    if (inStockOnly) {
      result = result.filter(p => p?.is_available && p?.quantity_available > 0)
    }

    // Apply Bestseller Filter
    if (bestsellerOnly) {
      result = result.filter(p => p?.is_bestseller)
    }

    // Apply Featured Filter
    if (featuredOnly) {
      result = result.filter(p => p?.is_featured)
    }

    // Apply Sorting
    if (sortBy === 'random') {
      result.sort((a, b) => (a?.randomWeight || 0) - (b?.randomWeight || 0))
    } else if (sortBy === 'price_low_high') {
      result.sort((a, b) => (a?.price || 0) - (b?.price || 0))
    } else if (sortBy === 'price_high_low') {
      result.sort((a, b) => (b?.price || 0) - (a?.price || 0))
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b?.rating || 0) - (a?.rating || 0))
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0))
    } else if (sortBy === 'name_desc') {
      result.sort((a, b) => (b?.name || '').localeCompare(a?.name || ''))
    } else if (sortBy === 'discount') {
      const getDiscount = (p) => {
        if (p?.discount_percentage) return p.discount_percentage
        const price = p?.price ?? 0
        const mrp = p?.mrp ?? 0
        if (mrp && mrp > price) {
          return ((mrp - price) / mrp) * 100
        }
        return 0
      }
      result.sort((a, b) => getDiscount(b) - getDiscount(a))
    } else if (sortBy === 'popularity') {
      const getPopularityScore = (p) => {
        let score = 0
        if (p?.is_bestseller) score += 50
        if (p?.is_featured) score += 30
        if (p?.rating) score += p.rating * 5
        return score
      }
      result.sort((a, b) => getPopularityScore(b) - getPopularityScore(a))
    } else {
      // Default: alphabetical A to Z
      result.sort((a, b) => (a?.name || '').localeCompare(b?.name || ''))
    }

    // Stable sort: in-stock first, out-of-stock last
    return result.sort((a, b) => {
      const aOOS = !a?.is_available || a?.quantity_available === 0;
      const bOOS = !b?.is_available || b?.quantity_available === 0;
      if (aOOS && !bOOS) return 1;
      if (!aOOS && bOOS) return -1;
      return 0;
    });
  }, [products, priceLimit, inStockOnly, bestsellerOnly, featuredOnly, sortBy])

  const groupedProducts = filteredAndSortedProducts

  const getPageTitle = () => {
    if (searchParam) return `Results for "${searchParam}"`
    if (filterParam === 'featured') return 'Featured Products'
    if (filterParam === 'bestseller') return 'Bestselling Items'
    return 'All Products'
  }

  return (
    <div className="min-h-screen bg-ozo-gray-bg dark:bg-[#0a0a0a] transition-colors duration-300">
      <SEO 
        title="Shop Online Grocery & Fresh Produce | OZO Mart"
        description="Browse and order online from OZO Mart's wide catalog of products, including fresh seasonal fruits, organic vegetables, daily snacks, beverages, and Mithila regional foods."
        keywords="shop online grocery, buy fresh fruits, order organic vegetables online, buy Mithila sweets, Patna grocery delivery, Aurangabad grocery delivery"
        schema={productsSchema}
      />
      <div 
        className="bg-white dark:bg-[#0d0d0d] border-b border-ozo-gray-lighter dark:border-white/5 sticky z-30" 
        style={{ 
          top: 'var(--header-height, 60px)',
          transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s, border-color 0.3s'
        }}
      >
        <div className="container-custom py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="p-2.5 rounded-xl border border-gray-205/10 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-gray-700 dark:text-gray-200 hover:text-ozo-red dark:hover:text-white transition-all shadow-sm flex items-center justify-center hover:border-ozo-red/50 hover:bg-white dark:hover:bg-white/10"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                  {renderTitle(getPageTitle())}
                </h1>
                <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium">
                  Showing {groupedProducts.length} items
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Toggles */}
              <div className="hidden sm:flex items-center bg-gray-100 dark:bg-white/5 p-1 rounded-xl mr-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-white dark:bg-white/10 shadow-sm text-ozo-red dark:text-white' 
                      : 'text-ozo-gray dark:text-gray-400 hover:text-ozo-red dark:hover:text-white'
                  }`}
                >
                  <LayoutGrid size={20} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'list' 
                      ? 'bg-white dark:bg-white/10 shadow-sm text-ozo-red dark:text-white' 
                      : 'text-ozo-gray dark:text-gray-400 hover:text-ozo-red dark:hover:text-white'
                  }`}
                >
                  <List size={20} />
                </button>
              </div>

              {/* Filters Toggle Button (triggers sheet on mobile) */}
              <button
                onClick={() => setShowMobileFilters(true)}
                className="flex lg:hidden items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-200 border-ozo-gray-lighter dark:border-white/10 hover:border-ozo-red/50"
              >
                <SlidersHorizontal size={16} />
                Filters
              </button>

              <SortDropdown sortBy={sortBy} onChange={setSortBy} />
            </div>
          </div>

          {/* Desktop Filters Panel - Premium Style */}
          <div className="hidden lg:flex items-center justify-between gap-6 mt-4 p-3.5 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl">
            <div className="flex items-center gap-6 flex-1">
              {/* Price Slider */}
              <div className="flex items-center gap-3 w-80">
                <span className="text-[11px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Price Range:</span>
                <input
                  type="range"
                  className="w-full accent-ozo-red cursor-pointer h-1 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none"
                  min="0"
                  max={maxCategoryPrice}
                  value={priceLimit}
                  onChange={(e) => setPriceLimit(Number(e.target.value))}
                />
                <span className="text-xs font-black text-gradient whitespace-nowrap min-w-[85px] text-right">Max: ₹{priceLimit}</span>
              </div>

              <div className="w-px h-5 bg-gray-200 dark:bg-white/10" />

              {/* Toggle Filters */}
              <div className="flex items-center gap-5">
                {/* In Stock */}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                    inStockOnly
                      ? 'bg-gradient-ozo border-transparent text-white'
                      : 'border-gray-300 dark:border-white/10 group-hover:border-ozo-red'
                  }`}>
                    {inStockOnly && <Check size={10} strokeWidth={4} />}
                  </div>
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="hidden"
                  />
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 select-none whitespace-nowrap">
                    In Stock Only
                  </span>
                </label>

                {/* Bestseller */}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                    bestsellerOnly
                      ? 'bg-gradient-ozo border-transparent text-white'
                      : 'border-gray-300 dark:border-white/10 group-hover:border-ozo-red'
                  }`}>
                    {bestsellerOnly && <Check size={10} strokeWidth={4} />}
                  </div>
                  <input
                    type="checkbox"
                    checked={bestsellerOnly}
                    onChange={(e) => setBestsellerOnly(e.target.checked)}
                    className="hidden"
                  />
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 select-none whitespace-nowrap">
                    Bestsellers Only
                  </span>
                </label>

                {/* Featured */}
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                    featuredOnly
                      ? 'bg-gradient-ozo border-transparent text-white'
                      : 'border-gray-300 dark:border-white/10 group-hover:border-ozo-red'
                  }`}>
                    {featuredOnly && <Check size={10} strokeWidth={4} />}
                  </div>
                  <input
                    type="checkbox"
                    checked={featuredOnly}
                    onChange={(e) => setFeaturedOnly(e.target.checked)}
                    className="hidden"
                  />
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 select-none whitespace-nowrap">
                    Featured Items Only
                  </span>
                </label>
              </div>
            </div>

            {/* Clear Button */}
            {(priceLimit < maxCategoryPrice || inStockOnly || bestsellerOnly || featuredOnly) && (
              <button
                onClick={() => {
                  setPriceLimit(maxCategoryPrice)
                  setInStockOnly(false)
                  setBestsellerOnly(false)
                  setFeaturedOnly(false)
                  setSortBy('random')
                }}
                className="px-3 py-1.5 rounded-xl font-bold text-[11px] border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors whitespace-nowrap flex items-center gap-1 hover:border-ozo-red/50 hover:text-ozo-red"
              >
                <X size={12} />
                Clear Filters
              </button>
            )}
          </div>

          {/* Quick horizontal categories slider for mobile/desktop screens */}
          <div className="mt-3 border-t border-gray-150/10 dark:border-white/5 pt-3">
            <TopCategories
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="flex gap-8">
          {/* Sidebar - Desktop */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="card p-6 sticky border border-gray-100 dark:border-white/5 shadow-sm space-y-4 transition-all duration-300" style={{ top: 'calc(var(--header-height, 60px) + 20px)' }}>
              <div>
                <h3 className="font-extrabold text-[13px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4.5 flex items-center gap-2.5">
                  <Filter size={16} className="text-ozo-red" />
                  All Categories
                </h3>
                <div className="space-y-1.5 max-h-[calc(100vh-240px)] overflow-y-auto overflow-x-hidden custom-scrollbar pr-3">
                  {/* All Products Button */}
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-left border ${
                      selectedCategory === 'all'
                        ? 'bg-gradient-to-r from-ozo-red/10 to-transparent border-ozo-red/20 text-ozo-red font-bold'
                        : 'bg-transparent text-gray-800 dark:text-gray-300 border-transparent hover:bg-gray-105/70 dark:hover:bg-white/5 hover:text-ozo-red dark:hover:text-white'
                    }`}
                  >
                    <Box size={20} className={selectedCategory === 'all' ? 'text-ozo-red' : 'text-gray-400 dark:text-gray-500'} strokeWidth={2} />
                    <span className="text-[14px] font-bold flex-1">All Products</span>
                  </button>

                  {/* Hierarchical Categories */}
                  {structuredCategories.map((parent) => {
                    const CatIcon = resolveCategoryIcon(parent)
                    const isParentActive = selectedCategory === parent.id
                    const hasSubs = parent.subcategories && parent.subcategories.length > 0
                    const isExpanded = !!expandedParents[parent.id]

                    return (
                      <div key={parent.id} className="space-y-1">
                        <div
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all border ${
                            isParentActive
                              ? 'bg-gradient-to-r from-ozo-red/10 to-transparent border-ozo-red/20 text-ozo-red font-bold'
                              : 'bg-transparent text-gray-800 dark:text-gray-300 border-transparent hover:bg-gray-105/70 dark:hover:bg-white/5 hover:text-ozo-red dark:hover:text-white'
                          }`}
                        >
                          <button
                            onClick={() => {
                              setSelectedCategory(parent.id)
                              if (hasSubs) {
                                setExpandedParents(prev => ({
                                  ...prev,
                                  [parent.id]: !prev[parent.id]
                                }))
                              }
                            }}
                            className="flex items-center gap-3 flex-1 text-left"
                          >
                            <CatIcon size={20} className={isParentActive ? 'text-ozo-red' : 'text-gray-400 dark:text-gray-500'} strokeWidth={1.8} />
                            <span className="text-[14px] font-bold whitespace-normal break-words leading-tight flex-1">{parent.name}</span>
                          </button>

                          {hasSubs && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedParents(prev => ({
                                  ...prev,
                                  [parent.id]: !prev[parent.id]
                                }))
                              }}
                              className="p-1.5 hover:bg-gray-200/50 dark:hover:bg-white/10 rounded-lg transition-all text-gray-550 dark:text-gray-400 hover:text-ozo-red dark:hover:text-white ml-1.5 flex-shrink-0"
                            >
                              <ChevronDown
                                size={15}
                                className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>
                          )}
                        </div>

                        {/* Subcategories list */}
                        {hasSubs && isExpanded && (
                          <div className="ml-5 pl-3.5 border-l-2 border-gray-200 dark:border-white/5 space-y-1 py-1">
                            {parent.subcategories.map((child) => {
                              const isChildActive = selectedCategory === child.id
                              return (
                                <button
                                  key={child.id}
                                  onClick={() => setSelectedCategory(child.id)}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left text-xs border ${
                                    isChildActive
                                      ? 'bg-ozo-red/5 dark:bg-ozo-red/10 border-ozo-red/10 text-ozo-red font-bold'
                                      : 'bg-transparent text-gray-650 dark:text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-white/5 hover:text-ozo-red dark:hover:text-white'
                                  }`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${isChildActive ? 'bg-ozo-red' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                  <span className="font-bold text-xs whitespace-normal break-words leading-tight flex-1">{child.name}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}

                </div>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1">
            {searchParam && spellingSuggestion && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4.5 rounded-2xl bg-white dark:bg-[#121212] border border-ozo-red/15 dark:border-ozo-red/25 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5 flex-wrap text-sm">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Showing results for:</span>
                  <button
                    onClick={() => {
                      navigate(`/search?q=${encodeURIComponent(spellingSuggestion)}`)
                    }}
                    className="font-black text-gradient hover:underline focus:outline-none"
                  >
                    {spellingSuggestion}
                  </button>
                  <span className="text-gray-350 dark:text-gray-600 mx-1">|</span>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Search instead for:</span>
                  <button
                    onClick={() => {
                      // Just force navigate to literal term (even if fuzzy matches show up)
                      navigate(`/search?q=${encodeURIComponent(searchParam)}`)
                    }}
                    className="font-bold text-ozo-red dark:text-red-400 hover:underline focus:outline-none"
                  >
                    {searchParam}
                  </button>
                </div>
              </motion.div>
            )}
            <OzoLoadingGuard
              isLoading={isProductsLoading}
              isError={isError}
              isEmpty={!isProductsLoading && groupedProducts.length === 0}
              onRetry={refetch}
              skeleton={<ProductSkeleton viewMode={viewMode} count={8} />}
              fallback={
                <div className="card p-12 text-center">
                  <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <SearchIcon size={32} className="text-ozo-gray dark:text-gray-400 opacity-50" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No products found</h2>
                  <p className="text-ozo-gray dark:text-gray-400 mb-6">Try adjusting your filters or search terms</p>
                  <button
                    onClick={() => {
                      setPriceLimit(maxCategoryPrice)
                      setInStockOnly(false)
                      setBestsellerOnly(false)
                      setFeaturedOnly(false)
                      setSortBy('random')
                    }}
                    className="btn btn-primary"
                  >
                    Clear all filters
                  </button>
                </div>
              }
            >
              <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-3 sm:gap-6`}>
                {groupedProducts?.map((product) => (
                  <ProductCard
                    key={product?.id}
                    product={product}
                    variant={viewMode === 'list' ? 'horizontal' : 'default'}
                  />
                ))}
              </div>

              {hasMore && (
                <div ref={observerRef} className="flex justify-center mt-10 py-6">
                  <div className="flex items-center gap-2.5 text-xs font-black uppercase tracking-widest text-ozo-red">
                    <span className="w-5 h-5 border-2 border-ozo-red border-t-transparent rounded-full animate-spin" />
                    <span>Loading more items...</span>
                  </div>
                </div>
              )}
            </OzoLoadingGuard>
          </div>
        </div>
      </div>

      {/* Mobile Filters Drawer / Sheet */}
      <AnimatePresence>
        {showMobileFilters && (
          <>
            {/* Sheet backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilters(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
            />

            {/* Bottom sliding filter drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#121212] rounded-t-[2.5rem] p-6 z-50 lg:hidden border-t border-gray-100 dark:border-white/5 max-h-[85vh] overflow-y-auto shadow-2xl"
            >
              {/* Header section inside drawer */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-white/5">
                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-ozo-red" />
                  Refine Products
                </h3>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Price range input inside drawer */}
                <div>
                  <h4 className="font-black text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Price Range</h4>
                  <div className="space-y-4">
                    <input
                      type="range"
                      className="w-full accent-ozo-red cursor-pointer"
                      min="0"
                      max={maxCategoryPrice}
                      value={priceLimit}
                      onChange={(e) => setPriceLimit(Number(e.target.value))}
                    />
                    <div className="flex items-center justify-between text-xs font-bold text-ozo-gray dark:text-gray-400">
                      <span>₹0</span>
                      <span className="text-gradient font-black text-sm">Max: ₹{priceLimit}</span>
                      <span>₹{maxCategoryPrice}</span>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gray-200 dark:bg-white/5" />

                {/* Stock availability & Feature filters inside drawer */}
                <div>
                  <h4 className="font-black text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Filters</h4>
                  <div className="space-y-3">
                    {/* In Stock */}
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        inStockOnly
                          ? 'bg-gradient-ozo border-transparent text-white'
                          : 'border-gray-300 dark:border-white/10 group-hover:border-ozo-red'
                      }`}>
                        {inStockOnly && <Check size={12} strokeWidth={4} />}
                      </div>
                      <input
                        type="checkbox"
                        checked={inStockOnly}
                        onChange={(e) => setInStockOnly(e.target.checked)}
                        className="hidden"
                      />
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 select-none">
                        In Stock Only
                      </span>
                    </label>

                    {/* Bestseller */}
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        bestsellerOnly
                          ? 'bg-gradient-ozo border-transparent text-white'
                          : 'border-gray-300 dark:border-white/10 group-hover:border-ozo-red'
                      }`}>
                        {bestsellerOnly && <Check size={12} strokeWidth={4} />}
                      </div>
                      <input
                        type="checkbox"
                        checked={bestsellerOnly}
                        onChange={(e) => setBestsellerOnly(e.target.checked)}
                        className="hidden"
                      />
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 select-none">
                        Bestsellers Only
                      </span>
                    </label>

                    {/* Featured */}
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        featuredOnly
                          ? 'bg-gradient-ozo border-transparent text-white'
                          : 'border-gray-300 dark:border-white/10 group-hover:border-ozo-red'
                      }`}>
                        {featuredOnly && <Check size={12} strokeWidth={4} />}
                      </div>
                      <input
                        type="checkbox"
                        checked={featuredOnly}
                        onChange={(e) => setFeaturedOnly(e.target.checked)}
                        className="hidden"
                      />
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 select-none">
                        Featured Items Only
                      </span>
                    </label>
                  </div>
                </div>

                <div className="h-px bg-gray-200 dark:bg-white/5" />

                {/* Sort options inside drawer */}
                <div>
                  <h4 className="font-black text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Sort By</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {sortOptions.map((option) => {
                      const isActive = option.value === sortBy
                      const Icon = option.icon
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSortBy(option.value)}
                          className={`px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all border flex items-center justify-center gap-1.5 ${
                            isActive
                              ? 'bg-gradient-ozo text-white border-transparent shadow-ozo font-black'
                              : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-100 dark:border-white/5 hover:border-ozo-red/50'
                          }`}
                        >
                          <Icon size={12} />
                          <span className="truncate">{option.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="h-px bg-gray-200 dark:bg-white/5" />

                {/* Categories selector inside drawer */}
                <div>
                  <h4 className="font-black text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Segment Category</h4>
                  <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {categories?.map((cat) => {
                      return (
                        <button
                          key={cat?.id}
                          onClick={() => {
                            if (cat?.slug) {
                              navigate(`/category/${cat.slug}`)
                            }
                            setShowMobileFilters(false)
                          }}
                          className="px-3 py-2 rounded-xl text-xs font-bold transition-all border text-center bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-100 dark:border-white/5 hover:border-ozo-red/50"
                        >
                          {cat?.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Action buttons inside drawer */}
              <div className="flex gap-4 mt-8 pt-4 border-t border-gray-100 dark:border-white/5">
                <button
                  onClick={() => {
                    setPriceLimit(maxCategoryPrice)
                    setInStockOnly(false)
                    setBestsellerOnly(false)
                    setFeaturedOnly(false)
                    setSortBy('random')
                  }}
                  className="flex-1 py-3.5 rounded-xl font-bold text-xs border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="flex-1 py-3.5 rounded-xl font-bold text-xs bg-gradient-ozo text-white shadow-ozo hover:opacity-95 transition-opacity"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Products