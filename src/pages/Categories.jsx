import { useEffect, useMemo } from 'react'
import Breadcrumb from '../components/Breadcrumb'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Grid, ChevronLeft } from 'lucide-react'
import { useProductStore } from '../stores/productStore'
import { CategoryGrid } from '../components/CategoryChip'
import { useTranslation } from '../hooks/useTranslation'
import OzoLoadingGuard from '../components/OzoLoadingGuard'
import useOzoQuery from '../hooks/useOzoQuery'

const Categories = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const fetchCategories = useProductStore(state => state.fetchCategories)

  const breadcrumbItems = useMemo(() => {
    return [
      { name: t('home') || 'Home', url: '/' },
      { name: t('categories') || 'Categories', url: null }
    ]
  }, [t])

  const { data: categoriesData, isLoading, isError, refetch } = useOzoQuery(
    async (signal) => {
      const res = await fetchCategories({ signal })
      if (!res.success) {
        throw res.error || new Error('Failed to fetch categories')
      }
      return res.data || []
    },
    [fetchCategories]
  )

  const categories = categoriesData || []

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

  return (
    <div className="min-h-screen bg-ozo-gray-bg dark:bg-[#0a0a0a] transition-colors duration-300">
      <div 
        className="bg-white dark:bg-[#0d0d0d] border-b border-ozo-gray-lighter dark:border-white/5 sticky z-30 hidden md:block" 
        style={{ 
          top: 'var(--header-height, 60px)',
          transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s, border-color 0.3s'
        }}
      >
        <div className="container-custom py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl hover:bg-ozo-gray-bg dark:hover:bg-white/5 transition-colors"
            >
              <ChevronLeft size={24} className="text-ozo-gray dark:text-gray-400" />
            </button>
            <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Grid className="w-6 h-6 text-ozo-red" />
              {renderTitle(t?.('allCategories') || 'All Categories')}
            </h1>
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        {/* Breadcrumb Trail */}
        <Breadcrumb items={breadcrumbItems} className="mb-6" />

        {/* Mobile Header */}
        <div className="md:hidden flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-white dark:bg-[#1a1a1a] border border-transparent dark:border-white/5 shadow-sm"
          >
            <ChevronLeft size={20} className="text-ozo-gray dark:text-gray-400" />
          </button>
          <h1 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            {renderTitle(t?.('allCategories') || 'All Categories')}
          </h1>
        </div>

        <OzoLoadingGuard
          isLoading={isLoading}
          isError={isError}
          isEmpty={!isLoading && categories.length === 0}
          onRetry={refetch}
          skeleton={
            <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9 gap-2 xs:gap-2.5 sm:gap-4.5">
              {[...Array(16)].map((_, i) => (
                <div key={i} className="aspect-square bg-white dark:bg-[#1a1a1a] border border-transparent dark:border-white/5 rounded-[1.75rem] sm:rounded-[2rem] animate-pulse" />
              ))}
            </div>
          }
          fallback={
            <div className="card-premium p-12 text-center rounded-[2.5rem]">
              <div className="w-20 h-20 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Grid className="w-10 h-10 text-ozo-red/30" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No categories found</h2>
              <p className="text-ozo-gray dark:text-gray-400 mb-6">
                Please ensure your Supabase database is populated and your API keys are correctly set in the .env file.
              </p>
              <button 
                onClick={() => fetchCategories()}
                className="btn btn-primary"
              >
                Retry Loading
              </button>
            </div>
          }
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card-premium p-6 md:p-8 rounded-[2.5rem]"
          >
            <CategoryGrid
              categories={categories.filter(c => !c.parent_id)}
              onCategoryClick={(cat) => navigate(`/category/${cat?.slug}`)}
            />
          </motion.div>
        </OzoLoadingGuard>
      </div>
    </div>
  )
}

export default Categories
