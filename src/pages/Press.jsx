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
  Mail,
  FileText,
  Clock,
  Printer,
  Compass,
  Radio
} from 'lucide-react'
import SEO from '../components/SEO'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// Default fallback articles reflecting the real OZO Bihar journey
const DEFAULT_PRESS_DATA = {
  badge: 'The Official Gazette & Press Room',
  title: 'Press Room.',
  subtitle: 'Official dispatches, city expansions, customer milestones, and chronicle archives.',
  media_kit: {
    title: 'Official Media Kit & Press Assets',
    description: 'Download our high-resolution logos, brand stylebook, executive photos, and official company backgrounder.',
    download_url: '/logo_transparent.png',
    file_size: '14.2 MB'
  },
  articles: [
    {
      id: 'press-aurangabad-launch',
      title: 'OZO Mart Launches Quick-Commerce Grocery Delivery in Aurangabad',
      source: 'Dainik Jagran',
      date: 'March 12, 2026',
      city: 'Aurangabad, Bihar',
      category: 'Launch',
      description: 'OZO Mart officially begins operations in Aurangabad, Bihar, offering 10-20 minute delivery of fresh groceries, farm produce, dairy, and household essentials directly to consumers doorsteps.',
      link: ''
    },
    {
      id: 'press-first-delivery',
      title: 'Milestone: OZO Mart Successfully Delivers Its Very First Order in Record 11 Minutes',
      source: 'OZO Newsroom',
      date: 'March 14, 2026',
      city: 'Aurangabad, Bihar',
      category: 'Milestone',
      description: 'A huge milestone for our ground ops team — our first live order was picked, packed, and successfully handed over to a delighted customer in Aurangabad in under 12 minutes.',
      link: ''
    },
    {
      id: 'press-20-deliveries',
      title: 'Customer Trust: OZO Completes 20+ Happy Deliveries with 100% 5-Star Satisfaction',
      source: 'Bihar Startup Chronicle',
      date: 'March 22, 2026',
      city: 'Aurangabad, Bihar',
      category: 'Milestone',
      description: 'Celebrating early customer love across Aurangabad! Over 20+ successful, on-time deliveries completed with zero delays and pristine fruit & vegetable quality ratings.',
      link: ''
    },
    {
      id: 'press-bhagalpur-launch',
      title: 'OZO Expands Footprint to Bhagalpur: Bringing Fast Grocery Delivery to the Silk City',
      source: 'The Times of Bihar',
      date: 'April 18, 2026',
      city: 'Bhagalpur, Bihar',
      category: 'Expansion',
      description: 'Following great reception in Aurangabad, OZO Mart inaugurates its next delivery hub in Bhagalpur, establishing local dark stores and direct farm linkages for instant 15-minute grocery delivery.',
      link: ''
    },
    {
      id: 'press-farm-kirana',
      title: 'Direct Farm-to-Fork: OZO Empowers Bihar Farmers & Local Kiranas with Fair-Price Sourcing',
      source: 'The Economic Times (East)',
      date: 'May 05, 2026',
      city: 'Statewide Dispatch',
      category: 'Partnership',
      description: 'How OZOs hyperlocal supply chain eliminates middlemen, providing local farmers direct market access while helping neighborhood kirana partners go digital.',
      link: ''
    }
  ]
}

const CATEGORY_COLORS = {
  Launch: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/50',
  Milestone: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-300 dark:border-amber-800/50',
  Expansion: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-300 dark:border-blue-800/50',
  Partnership: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-300 dark:border-purple-800/50',
  Coverage: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-300 dark:border-rose-800/50',
  default: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 border-gray-300 dark:border-white/10'
}

const CATEGORY_ICONS = {
  Launch: Rocket,
  Milestone: Award,
  Expansion: MapPin,
  Partnership: Users,
  Coverage: Newspaper,
  default: Newspaper
}

// Background Vintage Broadsheet & Newsprint Texture Component
const VintageNewspaperBg = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* 1. Halftone Newsprint Ink Pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04] dark:opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="halftone-newsprint" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="currentColor" className="text-gray-900 dark:text-white" />
            <circle cx="12" cy="12" r="1.2" fill="currentColor" className="text-gray-900 dark:text-white" />
            <circle cx="18" cy="4" r="0.8" fill="currentColor" className="text-gray-900 dark:text-white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#halftone-newsprint)" />
      </svg>

      {/* 2. Vintage Newspaper Columns & Rules Matrix */}
      <div className="absolute inset-0 max-w-7xl mx-auto px-6 grid grid-cols-4 md:grid-cols-6 h-full opacity-[0.05] dark:opacity-[0.04]">
        <div className="border-r border-dashed border-gray-900 dark:border-white h-full" />
        <div className="border-r border-dashed border-gray-900 dark:border-white h-full" />
        <div className="border-r border-dashed border-gray-900 dark:border-white h-full" />
        <div className="border-r border-dashed border-gray-900 dark:border-white h-full hidden md:block" />
        <div className="border-r border-dashed border-gray-900 dark:border-white h-full hidden md:block" />
        <div className="h-full hidden md:block" />
      </div>

      {/* 3. Watermark Broadsheet Newspaper Headlines in Background */}
      <div className="absolute inset-0 overflow-hidden flex flex-col justify-around opacity-[0.025] dark:opacity-[0.035] font-serif leading-none">
        <div className="whitespace-nowrap -rotate-6 text-6xl md:text-8xl tracking-widest font-black uppercase text-gray-950 dark:text-white">
          THE OZO CHRONICLE • LATE CITY EDITION • AURANGABAD • BHAGALPUR • SPECIAL GAZETTE
        </div>
        <div className="whitespace-nowrap rotate-3 text-7xl md:text-9xl tracking-tight font-black uppercase text-gray-950 dark:text-white ml-24">
          ★ EXTRA! EXTRA! ★ 15-MINUTE QUICK COMMERCE ARRIVES IN BIHAR ★ DAILY DISPATCH
        </div>
        <div className="whitespace-nowrap -rotate-3 text-5xl md:text-7xl tracking-widest font-bold uppercase text-gray-950 dark:text-white -ml-40">
          OFFICIAL PRESS BUREAU • TELEGRAPH WIRE • LOCAL FARMERS EMPOWERED • 20+ HAPPY ORDERS
        </div>
        <div className="whitespace-nowrap rotate-6 text-6xl md:text-8xl tracking-tight font-black uppercase text-gray-950 dark:text-white ml-12">
          HYPERLOCAL SUPPLY CHAIN • RECORD DELIVERY TIMES • BIHAR NEWSROOM ARCHIVES
        </div>
      </div>

      {/* 4. Vintage Postal / Press Stamp - Top Left */}
      <div className="absolute top-28 left-4 md:left-12 opacity-[0.08] dark:opacity-[0.07] rotate-[-14deg]">
        <div className="w-36 h-36 md:w-44 md:h-44 rounded-full border-4 border-dashed border-gray-900 dark:border-white flex flex-col items-center justify-center p-3 text-center">
          <div className="w-full h-full rounded-full border border-gray-900 dark:border-white flex flex-col items-center justify-center p-2 font-serif">
            <span className="text-[9px] font-black tracking-widest uppercase text-gray-900 dark:text-white">★ PRESS ROOM ★</span>
            <span className="text-xs font-black tracking-tighter text-gray-900 dark:text-white my-0.5">BIHAR DISPATCH</span>
            <span className="text-[8px] font-bold tracking-widest text-gray-900 dark:text-white">ESTD. 2026</span>
            <span className="text-[7px] tracking-widest text-gray-900 dark:text-white mt-1">VERIFIED ARCHIVE</span>
          </div>
        </div>
      </div>

      {/* 5. Vintage "LATE CITY EDITION" Rubber Stamp - Bottom Right */}
      <div className="absolute bottom-24 right-4 md:right-16 opacity-[0.08] dark:opacity-[0.07] rotate-[11deg]">
        <div className="px-6 py-3 border-4 border-double border-gray-900 dark:border-white font-serif text-center">
          <span className="block text-[10px] font-black tracking-[0.25em] text-gray-900 dark:text-white uppercase">
            SPECIAL RELEASE
          </span>
          <span className="block text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-widest">
            EXTRA ! EXTRA !
          </span>
          <span className="block text-[8px] font-bold tracking-widest text-gray-900 dark:text-white mt-0.5">
            OZO WIRE SERVICE • 2026
          </span>
        </div>
      </div>

      {/* 6. Subtle Vignette Edge Mask */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-50/80 dark:to-[#0a0a0a]/80" />
    </div>
  )
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
      (article.date && article.date.toLowerCase().includes(q)) ||
      (article.city && article.city.toLowerCase().includes(q))
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
    <div className="min-h-screen bg-[#FBF9F5] dark:bg-[#0A0B0D] text-gray-900 dark:text-gray-100 pb-28 transition-colors duration-300 relative overflow-x-hidden font-sans">
      <SEO
        title="Press Room & Official Chronicle | OZO Mart Media Coverage"
        description="Official press releases, city launches in Aurangabad and Bhagalpur, customer milestones, and media coverage of OZO Mart — Bihar's fastest grocery delivery app."
        keywords="OZO Mart press, Aurangabad grocery launch, Bhagalpur quick commerce, OZO milestones, Bihar delivery startup, press kit"
      />

      {/* Background Vintage Newspaper Watermark Texture */}
      <VintageNewspaperBg />

      {/* HEADER SECTION */}
      <div className="relative z-10 pt-8 pb-20 border-b border-gray-200/80 dark:border-white/10 bg-white/60 dark:bg-[#0D0F12]/80 backdrop-blur-md">
        
        {/* Vintage Newspaper Top Banner Strip */}
        <div className="max-w-6xl mx-auto px-4 mb-8">
          <div className="border-y-2 border-double border-gray-300 dark:border-white/15 py-2.5 px-3 flex flex-wrap items-center justify-between gap-3 text-[11px] font-serif uppercase tracking-widest text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span className="font-black text-gray-900 dark:text-white">VOL. I — NO. 04</span>
              <span className="text-gray-400 dark:text-gray-600">|</span>
              <span className="flex items-center gap-1 font-semibold">
                <Compass size={12} className="text-ozo-red" />
                AURANGABAD • BHAGALPUR • PATNA
              </span>
            </div>

            <div className="hidden md:flex items-center gap-2 text-center text-[10px] font-bold text-gray-500 tracking-[0.2em]">
              ★ ★ ★ THE OZO CHRONICLE • SPECIAL COMMERCE GAZETTE ★ ★ ★
            </div>

            <div className="flex items-center gap-2 ml-auto sm:ml-0 font-semibold">
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">WEATHER: 15-MIN DELIVERIES</span>
              <span className="text-gray-400 dark:text-gray-600">|</span>
              <span className="font-bold">PRICE: ₹0 DELIVERY</span>
            </div>
          </div>
        </div>

        {/* Masthead Title & Subtitle */}
        <div className="container-custom text-center max-w-4xl mx-auto px-4">
          
          {/* Retro Vintage Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 dark:bg-red-500/15 border border-ozo-red/30 text-ozo-red text-xs font-bold uppercase tracking-wider mb-5 shadow-sm"
          >
            <Radio size={13} className="animate-pulse" />
            <span className="font-serif tracking-widest">{pressData.badge || 'The Official Gazette & Press Room'}</span>
          </motion.div>

          {/* Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl md:text-7xl font-black text-gray-950 dark:text-white mb-5 font-serif tracking-tight"
          >
            Press <span className="text-gradient font-serif italic">Room.</span>
          </motion.h1>

          {/* Ornamental Divider */}
          <div className="flex items-center justify-center gap-3 my-4 opacity-60">
            <div className="w-16 h-px bg-gray-400 dark:bg-white/20" />
            <span className="font-serif text-xs tracking-widest text-gray-500">❖ ESTABLISHED 2026 ❖</span>
            <div className="w-16 h-px bg-gray-400 dark:bg-white/20" />
          </div>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base md:text-lg text-gray-600 dark:text-gray-300 font-medium leading-relaxed max-w-2xl mx-auto"
          >
            {pressData.subtitle}
          </motion.p>
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <div className="container-custom -mt-10 relative z-20 px-4">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Editorial Broadsheet Card */}
          <div className="bg-white/90 dark:bg-[#121418]/90 backdrop-blur-md p-6 md:p-10 rounded-[2.5rem] shadow-2xl shadow-black/5 dark:shadow-black/60 border border-gray-200/90 dark:border-white/10 relative overflow-hidden">
            
            {/* Top Vintage Card Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 mb-8 pb-6 border-b border-gray-200 dark:border-white/10">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-md bg-red-100 dark:bg-ozo-red/20 text-ozo-red font-mono text-[10px] font-black tracking-widest uppercase">
                    WIRE ARCHIVE
                  </span>
                  <span className="text-[11px] font-serif italic text-gray-500 dark:text-gray-400">
                    Chronicle of Quick Commerce Growth
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-gray-950 dark:text-white font-serif tracking-tight flex items-center gap-2.5">
                  <Newspaper className="text-ozo-red" size={26} />
                  Front-Page <span className="italic text-gradient">Coverage & Milestones</span>
                </h2>
              </div>

              {/* Search Bar with Vintage Print Feel */}
              <div className="relative w-full md:w-72">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search archives, cities, dates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ozo-red/40 transition-all font-sans"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Vintage Section Pill Tabs */}
            <div className="flex flex-wrap items-center gap-2 mb-8 pb-4 border-b border-gray-100 dark:border-white/5">
              <span className="text-[11px] font-serif font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mr-2 flex items-center gap-1">
                <FileText size={13} />
                Section:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    activeCategory === cat
                      ? 'bg-gray-950 dark:bg-white text-white dark:text-gray-950 shadow-md scale-105'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200/60 dark:border-white/5'
                  }`}
                >
                  {cat === 'All' ? 'All Dispatches' : cat}
                </button>
              ))}
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto hidden sm:inline font-mono">
                {filteredArticles.length} {filteredArticles.length === 1 ? 'Dispatch' : 'Dispatches'}
              </span>
            </div>

            {/* Articles List */}
            {isLoading ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw size={24} className="animate-spin text-ozo-red mx-auto" />
                <p className="text-xs text-gray-500 font-serif">Retrieving chronicle archives from database...</p>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-gray-50 dark:bg-white/[0.02] rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                <Newspaper size={34} className="text-gray-400 mx-auto" />
                <p className="text-base font-bold text-gray-800 dark:text-gray-200 font-serif">No dispatches found in archives</p>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  No articles matched your search query. Try selecting another section or clearing your search keywords.
                </p>
                <button
                  onClick={() => { setActiveCategory('All'); setSearchQuery(''); }}
                  className="px-4 py-2 text-xs font-bold text-ozo-red bg-red-50 dark:bg-ozo-red/10 rounded-xl hover:bg-red-100 transition-colors"
                >
                  Reset Section Filter
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
                      className="group p-6 md:p-8 rounded-[2rem] border border-gray-200/80 dark:border-white/10 bg-gradient-to-br from-white via-white to-gray-50/60 dark:from-[#16181E] dark:via-[#16181E] dark:to-[#1a1d24] hover:border-ozo-red/40 dark:hover:border-ozo-red/50 hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 relative overflow-hidden"
                    >
                      {/* Subtle Decorative Newsprint Accent Bar */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-ozo-red/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Header row: Category pill, Source & Dateline */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${colorClass}`}>
                            <CategoryIcon size={12} />
                            {art.category || 'News'}
                          </span>

                          <span className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-gray-200 font-serif">
                            {art.source}
                          </span>

                          {art.city && (
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-[10px] font-mono text-gray-500 dark:text-gray-400">
                              <MapPin size={10} className="text-ozo-red" />
                              {art.city}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-gray-500 dark:text-gray-400">
                          <Calendar size={13} className="text-gray-400" />
                          <span>{art.date}</span>
                        </div>
                      </div>

                      {/* Headline with Newspaper Serif Elegance */}
                      <h3 className="text-lg md:text-xl font-bold font-serif text-gray-950 dark:text-white mb-3 group-hover:text-ozo-red transition-colors leading-snug">
                        {art.title}
                      </h3>

                      {/* Description / Story Content */}
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-normal mb-5">
                        {/* Dateline lead-in */}
                        {art.city && (
                          <span className="font-mono text-xs font-bold text-gray-900 dark:text-gray-200 mr-2 uppercase tracking-wide">
                            [{art.city.split(',')[0].toUpperCase()}] —
                          </span>
                        )}
                        {art.description}
                      </p>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-4">
                          {art.link ? (
                            <a
                              href={art.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-black uppercase tracking-wider text-ozo-red flex items-center gap-1.5 hover:underline"
                            >
                              Read Full Dispatch
                              <ExternalLink size={13} />
                            </a>
                          ) : (
                            <button
                              onClick={() => setActiveArticleModal(art)}
                              className="text-xs font-black uppercase tracking-wider text-ozo-red flex items-center gap-1.5 hover:underline"
                            >
                              Read Full Story
                              <ArrowRight size={13} />
                            </button>
                          )}
                        </div>

                        <button
                          onClick={(e) => handleShare(art, e)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-gray-300 transition-all shadow-sm"
                          title="Share Dispatch Link"
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

            {/* Official Media Kit Broadsheet Certificate */}
            <div className="mt-14 p-7 md:p-9 bg-gradient-to-br from-amber-50/50 via-white to-red-50/30 dark:from-[#181a20] dark:via-[#16181e] dark:to-red-950/20 rounded-[2rem] border-2 border-dashed border-gray-300 dark:border-white/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
              <div className="space-y-1.5 relative z-10">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-ozo-red uppercase tracking-widest">
                  <Download size={13} />
                  <span>PRESS CREDENTIALS & ASSETS</span>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-gray-950 dark:text-white font-serif">
                  {pressData.media_kit?.title || 'Official Media Kit & Press Assets'}
                </h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-medium max-w-xl leading-relaxed">
                  {pressData.media_kit?.description || 'Download high-res brand logos, typography guide, leadership photos, and verified press backgrounders.'}
                </p>
              </div>

              <button
                onClick={handleDownloadMediaKit}
                className="relative z-10 px-6 py-3.5 bg-gradient-ozo text-white font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-red-500/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform self-stretch md:self-auto justify-center"
              >
                <Download size={15} />
                Download Kit ({pressData.media_kit?.file_size || '14.2 MB'})
              </button>
            </div>

            {/* Media Desk Contact Card */}
            <div className="mt-6 p-6 bg-gray-50/80 dark:bg-white/[0.02] rounded-[1.75rem] border border-gray-200/80 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-ozo-red/10 text-ozo-red flex items-center justify-center flex-shrink-0">
                  <Mail size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white font-serif">Newsroom & Journalist Inquiries</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Request executive interviews, company data, or official editorial quotes.</p>
                </div>
              </div>
              <a
                href="mailto:contact@ozomart.store?subject=Press%20Inquiry%20-%20OZO%20Mart"
                className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-white/10 text-gray-800 dark:text-gray-200 hover:border-ozo-red hover:text-ozo-red transition-colors self-stretch sm:self-auto text-center font-mono"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#181a20] rounded-[2rem] border border-gray-200 dark:border-white/10 p-6 md:p-8 max-w-lg w-full shadow-2xl relative"
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
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400 font-serif">
                  {activeArticleModal.source}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mb-4">
                <Calendar size={13} />
                <span>{activeArticleModal.date}</span>
                {activeArticleModal.city && (
                  <>
                    <span>•</span>
                    <span>{activeArticleModal.city}</span>
                  </>
                )}
              </div>

              <h3 className="text-xl font-bold font-serif text-gray-900 dark:text-white mb-4 leading-snug">
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
