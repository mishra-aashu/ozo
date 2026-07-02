import { useState, useEffect, useRef, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search as SearchIcon, 
  X, 
  Filter, 
  ArrowRight, 
  ShoppingBag,
  TrendingUp,
  History,
  Info,
  ChevronLeft
} from 'lucide-react'
import { useProductStore } from '../stores/productStore'
import { Link, useNavigate } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { resolveCategoryIcon, getGradient } from '../components/CategoryChip'
import { useOzoQuery } from '../hooks/useOzoQuery'
import OzoLoadingGuard from '../components/OzoLoadingGuard'

const Search = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const { searchResults, searchProducts, isSearchLoading, clearSearchResults, fetchCategories, spellingSuggestion } = useProductStore(useShallow(state => ({
    searchResults: state.searchResults,
    searchProducts: state.searchProducts,
    isSearchLoading: state.isSearchLoading,
    clearSearchResults: state.clearSearchResults,
    fetchCategories: state.fetchCategories,
    spellingSuggestion: state.spellingSuggestion,
  })))
  const searchControllerRef = useRef(null)

  const { data: categoriesData, isLoading: isCategoriesLoading, isError: isCategoriesError, refetch } = useOzoQuery(
    async (signal) => {
      const res = await fetchCategories({ signal })
      if (!res.success) {
        throw res.error || new Error('Failed to fetch categories')
      }
      return res.data || []
    },
    [fetchCategories]
  )

  const performSearch = useCallback((term) => {
    if (searchControllerRef.current) {
      searchControllerRef.current.abort()
    }
    const controller = new AbortController()
    searchControllerRef.current = controller
    useProductStore.getState().searchProducts(term, { signal: controller.signal })
  }, [])

  useEffect(() => {
    return () => {
      useProductStore.getState().clearSearchResults()
      if (searchControllerRef.current) {
        searchControllerRef.current.abort()
      }
    }
  }, [])

  const handleSearch = useCallback((e) => {
    const value = e.target.value
    setSearchTerm(value)
    if (value.length >= 2) {
      performSearch(value)
    } else if (value.length === 0) {
      if (searchControllerRef.current) {
        searchControllerRef.current.abort()
      }
      useProductStore.getState().clearSearchResults()
    }
  }, [performSearch])

  const trendingSearches = ['Milk', 'Fruits', 'Vegetables', 'Cooking Oil', 'Bread', 'Snacks']

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300">
      {/* Search Header */}
      <div className="page-header-sticky">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="p-3.5 rounded-[1.5rem] border border-gray-205/10 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-gray-700 dark:text-gray-200 hover:text-ozo-red dark:hover:text-white transition-all shadow-sm flex items-center justify-center hover:border-ozo-red/50 hover:bg-white dark:hover:bg-white/10"
            >
              <ChevronLeft size={24} />
            </button>
            <form 
              onSubmit={(e) => { e.preventDefault(); if (searchTerm.trim()) performSearch(searchTerm.trim()); }} 
              className="flex-1 relative group"
            >
              <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-ozo-gray group-focus-within:text-ozo-red transition-colors" size={24} />
            <input 
              autoFocus
              type="text" 
              value={searchTerm}
              onChange={handleSearch}
              placeholder="Search for fruits, vegetables, specials and more..."
              className="w-full pl-16 pr-16 py-5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-ozo-red/10 transition-all font-bold text-lg shadow-sm"
            />
            {searchTerm && (
              <button 
                type="button"
                onClick={() => { 
                  setSearchTerm(''); 
                  if (searchControllerRef.current) {
                    searchControllerRef.current.abort()
                  }
                  clearSearchResults(); 
                }}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </form>
          </div>
        </div>
      </div>

      <div className="container-custom py-12">
        <AnimatePresence mode="wait">
          {!searchTerm ? (
            <motion.div 
              key="initial"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto space-y-12"
            >
              {/* Trending Searches */}
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-ozo-gray dark:text-gray-500 mb-6 flex items-center gap-2">
                  <TrendingUp size={16} />
                  Trending Searches
                </h3>
                <div className="flex flex-wrap gap-3">
                  {trendingSearches.map((term) => (
                    <button 
                      key={term}
                      onClick={() => { setSearchTerm(term); performSearch(term); }}
                      className="px-6 py-3 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl font-bold text-gray-700 dark:text-gray-300 hover:border-ozo-red hover:text-ozo-red transition-all shadow-sm active:scale-95"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              {/* Browse Categories */}
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-ozo-gray dark:text-gray-500 mb-6 flex items-center gap-2">
                  Browse Categories
                </h3>
                <OzoLoadingGuard
                  isLoading={isCategoriesLoading}
                  isError={isCategoriesError}
                  isEmpty={!isCategoriesLoading && (categoriesData || []).length === 0}
                  onRetry={refetch}
                  skeleton={
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-40 bg-white dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/10 animate-pulse" />
                      ))}
                    </div>
                  }
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {(categoriesData || []).slice(0, 6).map((cat) => {
                        const isEmoji = cat.icon && cat.icon.codePointAt(0) > 127
                        const IconComponent = isEmoji ? null : (resolveCategoryIcon(cat) || ShoppingBag)
                        const gradientClasses = getGradient(cat.slug, cat.name)
                        const gradientSplit = gradientClasses.split(' ')
                        const fromTo = gradientSplit.slice(0, 2).join(' ')
                        const textColor = gradientSplit[2] || 'text-gray-600'

                        return (
                          <Link 
                           key={cat.id} 
                           to={`/category/${cat.slug}`}
                           className="p-6 bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-100 dark:border-white/5 hover:border-ozo-red hover:shadow-xl transition-all group flex flex-col items-center text-center gap-4"
                          >
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform bg-gradient-to-br ${fromTo}`}>
                               {isEmoji ? (
                                 <span className="text-2xl">{cat.icon}</span>
                                ) : (
                                 <IconComponent size={28} className={textColor} strokeWidth={2} />
                               )}
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white">{cat.name}</span>
                          </Link>
                        )
                      })}
                  </div>
                </OzoLoadingGuard>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {spellingSuggestion && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4.5 rounded-2xl bg-white dark:bg-[#121212] border border-ozo-red/15 dark:border-ozo-red/25 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5 flex-wrap text-sm">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Showing results for:</span>
                    <button
                      onClick={() => {
                        setSearchTerm(spellingSuggestion)
                        performSearch(spellingSuggestion)
                      }}
                      className="font-black text-gradient hover:underline focus:outline-none"
                    >
                      {spellingSuggestion}
                    </button>
                    <span className="text-gray-350 dark:text-gray-600 mx-1">|</span>
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Search instead for:</span>
                    <button
                      onClick={() => {
                        // In case they click, perform search for the exact literal phrase
                        performSearch(searchTerm)
                      }}
                      className="font-bold text-ozo-red dark:text-red-400 hover:underline focus:outline-none"
                    >
                      {searchTerm}
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                  Search results for "<span className="text-gradient">{searchTerm}</span>"
                  <span className="px-3 py-1 bg-gray-100 dark:bg-white/5 rounded-lg text-xs font-bold text-ozo-gray">{searchResults.length} items</span>
                </h2>
                <button className="flex items-center gap-2 text-ozo-gray hover:text-ozo-red font-bold text-sm">
                   <Filter size={18} />
                   Filters
                </button>
              </div>

              {isSearchLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="aspect-[3/4] bg-white dark:bg-white/5 rounded-[2.5rem] animate-pulse" />
                  ))}
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
                  {searchResults.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                   <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center text-gray-400 mb-6">
                      <Info size={40} />
                   </div>
                   <h3 className="text-2xl font-black mb-2">No results found</h3>
                   <p className="text-ozo-gray max-w-sm">We couldn't find anything matching your search. Try different keywords or browse categories.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default Search
