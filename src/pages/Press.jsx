import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Newspaper, 
  Download, 
  ExternalLink, 
  Share2, 
  Calendar, 
  MapPin, 
  Rocket, 
  Award, 
  Building2, 
  Users, 
  Search, 
  Check, 
  X, 
  ArrowRight,
  Sparkles,
  RefreshCw,
  Mail
} from 'lucide-react'
import SEO from '../components/SEO'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// Default fallback articles reflecting the real OZO Bihar journey
const DEFAULT_PRESS_DATA = {
  badge: 'OZO Newsroom & Milestones',
  title: 'Press Room.',
  subtitle: 'Latest news, city expansions, customer milestones, and official press releases.',
  media_kit: {
    title: 'Official Media Kit',
    description: 'Download our official brand assets, logos, typography, and company backgrounders.',
    download_url: '/logo_transparent.png',
    file_size: '14.2 MB'
  },
  articles: [
    {
      id: 'press-aurangabad-launch',
      title: 'OZO Mart Launches Quick-Commerce Grocery Delivery in Aurangabad',
      source: 'Dainik Jagran',
      date: 'March 12, 2026',
      category: 'Launch',
      description: 'OZO Mart officially begins operations in Aurangabad, Bihar, offering 10-20 minute delivery of fresh groceries, farm produce, dairy, and household essentials directly to consumers doorsteps.',
      link: ''
    },
    {
      id: 'press-first-delivery',
      title: 'Milestone: OZO Mart Successfully Delivers Its Very First Order in Record 11 Minutes',
      source: 'OZO Newsroom',
      date: 'March 14, 2026',
      category: 'Milestone',
      description: 'A huge milestone for our ground ops team — our first live order was picked, packed, and successfully handed over to a delighted customer in Aurangabad in under 12 minutes.',
      link: ''
    },
    {
      id: 'press-20-deliveries',
      title: 'Customer Trust: OZO Completes 20+ Happy Deliveries with 100% 5-Star Satisfaction',
      source: 'Bihar Startup Chronicle',
      date: 'March 22, 2026',
      category: 'Milestone',
      description: 'Celebrating early customer love across Aurangabad! Over 20+ successful, on-time deliveries completed with zero delays and pristine fruit & vegetable quality ratings.',
      link: ''
    },
    {
      id: 'press-bhagalpur-launch',
      title: 'OZO Expands Footprint to Bhagalpur: Bringing Fast Grocery Delivery to the Silk City',
      source: 'The Times of Bihar',
      date: 'April 18, 2026',
      category: 'Expansion',
      description: 'Following great reception in Aurangabad, OZO Mart inaugurates its next delivery hub in Bhagalpur, establishing local dark stores and direct farm linkages for instant 15-minute grocery delivery.',
      link: ''
    },
    {
      id: 'press-farm-kirana',
      title: 'Direct Farm-to-Fork: OZO Empowers Bihar Farmers & Local Kiranas with Fair-Price Sourcing',
      source: 'The Economic Times (East)',
      date: 'May 05, 2026',
      category: 'Partnership',
      description: 'How OZOs hyperlocal supply chain eliminates middlemen, providing local farmers direct market access while helping neighborhood kirana partners go digital.',
      link: ''
    }
  ]
}

const CATEGORY_COLORS = {
  Launch: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40',
  Milestone: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/40',
  Expansion: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800/40',
  Partnership: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800/40',
  Coverage: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800/40',
  default: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 border-gray-200 dark:border-white/10'
}

const CATEGORY_ICONS = {
  Launch: Rocket,
  Milestone: Award,
  Expansion: MapPin,
  Partnership: Users,
  Coverage: Newspaper,
  default: Newspaper
}

const Press = () => {
  const [pressData, setPressData] = useState(DEFAULT_PRESS_DATA)
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeArticleModal, setActiveArticleModal] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  // Fetch press config from Supabase app_settings table
  const fetchPressData = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'press_config')
        .maybeSingle()

      if (error) {
        console.warn('Could not load press_config from Supabase, using fallback:', error)
        return
      }

      if (data?.value && typeof data.value === 'object') {
        const remoteArticles = Array.isArray(data.value.articles) ? data.value.articles : []
        if (remoteArticles.length > 0) {
          setPressData({
            badge: data.value.badge || DEFAULT_PRESS_DATA.badge,
            title: data.value.title || DEFAULT_PRESS_DATA.title,
            subtitle: data.value.subtitle || DEFAULT_PRESS_DATA.subtitle,
            media_kit: { ...DEFAULT_PRESS_DATA.media_kit, ...(data.value.media_kit || {}) },
            articles: remoteArticles
          })
        }
      }
    } catch (err) {
      console.warn('Error reading press data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPressData()
  }, [])

  // Categories list
  const categories = ['All', ...Array.from(new Set(pressData.articles.map(a => a.category).filter(Boolean)))]

  // Filtered articles
  const filteredArticles = pressData.articles.filter(article => {
    const matchesCategory = activeCategory === 'All' || article.category === activeCategory
    const q = searchQuery.toLowerCase().trim()
    const matchesQuery = !q || 
      (article.title && article.title.toLowerCase().includes(q)) ||
      (article.description && article.description.toLowerCase().includes(q)) ||
      (article.source && article.source.toLowerCase().includes(q)) ||
      (article.date && article.date.toLowerCase().includes(q))
    return matchesCategory && matchesQuery
  })

  // Share handler
  const handleShare = async (article, e) => {
    e.stopPropagation()
    const shareUrl = window.location.href.split('#')[0] + `#${article.id || ''}`
    const shareText = `${article.title} — OZO Mart Press Room`

    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: shareText,
          url: shareUrl
        })
        return
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Share rejected:', err)
        }
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
      setCopiedId(article.id)
      toast.success('Press release link copied to clipboard!')
      setTimeout(() => setCopiedId(null), 2500)
    } catch {
      toast.success('Link copied!')
    }
  }

  const handleDownloadMediaKit = () => {
    const downloadUrl = pressData.media_kit?.download_url || '/logo_transparent.png'
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = 'OZO-Brand-Assets'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Downloading OZO Brand Assets Kit')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300">
      <SEO
        title="Press Room & Milestones | OZO Mart Media Coverage"
        description="Official press releases, city launches in Aurangabad and Bhagalpur, customer milestones, and media coverage of OZO Mart — Bihar's fastest grocery delivery app."
        keywords="OZO Mart press, Aurangabad grocery launch, Bhagalpur quick commerce, OZO milestones, Bihar delivery startup, press kit"
      />

      {/* Header */}
      <div className="bg-white dark:bg-[#0d0d0d] pt-24 pb-32 border-b border-gray-100 dark:border-white/5 relative overflow-hidden">
        <div className="container-custom relative z-10 text-center max-w-3xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-ozo-red/20 text-ozo-red text-xs font-bold uppercase tracking-wider mb-5"
          >
            <Sparkles size={14} />
            <span>{pressData.badge || 'OZO Newsroom & Milestones'}</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 font-display tracking-tight"
          >
            Press <span className="text-gradient">Room.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base md:text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed max-w-2xl mx-auto"
          >
            {pressData.subtitle}
          </motion.p>
        </div>

        {/* Ambient background glows */}
        <div className="absolute top-0 left-0 w-80 h-80 bg-red-500/10 blur-3xl rounded-full -ml-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-500/10 blur-3xl rounded-full -mr-32 -mb-32 pointer-events-none" />
      </div>

      <div className="container-custom -mt-16 relative z-20 px-4">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Main Card */}
          <div className="bg-white dark:bg-[#141414] p-6 md:p-10 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-white/5">
            
            {/* Search and Category Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
                  <Newspaper className="text-ozo-red" size={28} />
                  Official <span className="text-gradient">Coverage & Milestones</span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Chronological journey of our quick-commerce expansion across Bihar
                </p>
              </div>

              {/* Search bar */}
              <div className="relative w-full md:w-64">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search coverage..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ozo-red/50 transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap items-center gap-2 mb-8 pb-4 border-b border-gray-100 dark:border-white/5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                    activeCategory === cat
                      ? 'bg-ozo-red text-white shadow-md shadow-red-500/20 scale-105'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
              <span className="text-xs text-gray-400 ml-auto hidden sm:inline">
                Showing {filteredArticles.length} {filteredArticles.length === 1 ? 'story' : 'stories'}
              </span>
            </div>

            {/* Articles List */}
            {isLoading ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw size={24} className="animate-spin text-ozo-red mx-auto" />
                <p className="text-xs text-gray-500">Loading press releases from database...</p>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-gray-50 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                <Newspaper size={32} className="text-gray-400 mx-auto" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No coverage found</p>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  No articles matched your search or category filter. Try selecting another category or clear your search query.
                </p>
                <button
                  onClick={() => { setActiveCategory('All'); setSearchQuery(''); }}
                  className="px-4 py-2 text-xs font-bold text-ozo-red bg-red-50 dark:bg-ozo-red/10 rounded-xl hover:bg-red-100 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredArticles.map((art, index) => {
                  const CategoryIcon = CATEGORY_ICONS[art.category] || CATEGORY_ICONS.default
                  const colorClass = CATEGORY_COLORS[art.category] || CATEGORY_COLORS.default

                  return (
                    <motion.div
                      key={art.id || index}
                      id={art.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group p-6 md:p-7 rounded-[2rem] border border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-white/[0.03] hover:bg-white dark:hover:bg-[#1a1a1a] hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-black/50 transition-all duration-300 relative overflow-hidden"
                    >
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${colorClass}`}>
                            <CategoryIcon size={12} />
                            {art.category || 'News'}
                          </span>
                          <span className="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-400">
                            {art.source}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                          <Calendar size={13} className="text-gray-400" />
                          <span>{art.date}</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-ozo-red transition-colors duration-200">
                        {art.title}
                      </h3>

                      {/* Description */}
                      <p className="text-sm text-gray-600 dark:text-gray-300 font-normal mb-5 leading-relaxed">
                        {art.description}
                      </p>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-4">
                          {art.link ? (
                            <a
                              href={art.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-black uppercase tracking-wider text-ozo-red flex items-center gap-1.5 hover:underline"
                            >
                              Read Full Article
                              <ExternalLink size={13} />
                            </a>
                          ) : (
                            <button
                              onClick={() => setActiveArticleModal(art)}
                              className="text-xs font-black uppercase tracking-wider text-ozo-red flex items-center gap-1.5 hover:underline"
                            >
                              Read Story Details
                              <ArrowRight size={13} />
                            </button>
                          )}
                        </div>

                        <button
                          onClick={(e) => handleShare(art, e)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-gray-300 transition-all"
                          title="Share Article Link"
                        >
                          {copiedId === art.id ? (
                            <>
                              <Check size={13} className="text-emerald-500" />
                              <span className="text-emerald-500">Link Copied</span>
                            </>
                          ) : (
                            <>
                              <Share2 size={13} />
                              <span>Share</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* Official Media Kit Banner */}
            <div className="mt-14 p-6 md:p-8 bg-gradient-to-br from-gray-50 to-red-50/30 dark:from-white/5 dark:to-red-950/10 rounded-[2rem] border border-gray-200/80 dark:border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-ozo-red uppercase tracking-wider">
                  <Download size={14} />
                  <span>Media Assets</span>
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  {pressData.media_kit?.title || 'Official Media Kit'}
                </h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {pressData.media_kit?.description || 'Download high-res brand logos, founder headshots, and media kit.'}
                </p>
              </div>

              <button
                onClick={handleDownloadMediaKit}
                className="px-6 py-3.5 bg-gradient-ozo text-white font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-red-500/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform self-stretch md:self-auto justify-center"
              >
                <Download size={15} />
                Download Brand Kit ({pressData.media_kit?.file_size || '14.2 MB'})
              </button>
            </div>

            {/* Media Inquiries Card */}
            <div className="mt-6 p-6 bg-gray-50 dark:bg-white/[0.02] rounded-[1.75rem] border border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-ozo-red/10 text-ozo-red flex items-center justify-center flex-shrink-0">
                  <Mail size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Press & Media Inquiries</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Looking for press kits, founder interviews, or comment quotes?</p>
                </div>
              </div>
              <a
                href="mailto:contact@ozomart.store?subject=Press%20Inquiry%20-%20OZO%20Mart"
                className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 hover:border-ozo-red hover:text-ozo-red transition-colors self-stretch sm:self-auto text-center"
              >
                contact@ozomart.store
              </a>
            </div>

          </div>
        </div>
      </div>

      {/* Story Details Modal */}
      <AnimatePresence>
        {activeArticleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-100 dark:border-white/10 p-6 md:p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button
                onClick={() => setActiveArticleModal(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${CATEGORY_COLORS[activeArticleModal.category] || CATEGORY_COLORS.default}`}>
                  {activeArticleModal.category || 'News'}
                </span>
                <span className="text-xs font-bold text-gray-500">
                  {activeArticleModal.source}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                <Calendar size={13} />
                <span>{activeArticleModal.date}</span>
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 leading-snug">
                {activeArticleModal.title}
              </h3>

              <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                {activeArticleModal.description}
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={(e) => handleShare(activeArticleModal, e)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors flex items-center gap-1.5"
                >
                  <Share2 size={14} />
                  Share Release
                </button>
                <button
                  onClick={() => setActiveArticleModal(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-ozo-red text-white hover:bg-red-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Press
