import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Newspaper,
  Plus,
  Save,
  Trash2,
  Edit3,
  ExternalLink,
  Code,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Calendar,
  Sparkles,
  MapPin,
  Rocket,
  Award,
  Users,
  Search,
  Download,
  Info,
  RefreshCw,
  X
} from 'lucide-react'
import { supabaseAdmin as supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

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

const CATEGORIES = ['Launch', 'Milestone', 'Expansion', 'Partnership', 'Coverage', 'Announcement']

const AdminPress = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('visual') // 'visual' | 'json' | 'mediakit'
  
  // Press config state
  const [pressConfig, setPressConfig] = useState(DEFAULT_PRESS_DATA)
  
  // Raw JSON state for the JSON editor tab
  const [rawJsonText, setRawJsonText] = useState('')
  const [jsonError, setJsonError] = useState(null)
  
  // Search and filter
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')

  // Edit / Add Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    source: '',
    date: '',
    category: 'Launch',
    description: '',
    link: ''
  })

  // Delete confirm modal state
  const [deleteIndex, setDeleteIndex] = useState(null)

  // Fetch from Supabase
  const loadPressConfig = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'press_config')
        .maybeSingle()

      if (error) throw error

      if (data?.value && typeof data.value === 'object') {
        const loaded = {
          badge: data.value.badge || DEFAULT_PRESS_DATA.badge,
          title: data.value.title || DEFAULT_PRESS_DATA.title,
          subtitle: data.value.subtitle || DEFAULT_PRESS_DATA.subtitle,
          media_kit: { ...DEFAULT_PRESS_DATA.media_kit, ...(data.value.media_kit || {}) },
          articles: Array.isArray(data.value.articles) && data.value.articles.length > 0 
            ? data.value.articles 
            : DEFAULT_PRESS_DATA.articles
        }
        setPressConfig(loaded)
        setRawJsonText(JSON.stringify(loaded, null, 2))
      } else {
        setPressConfig(DEFAULT_PRESS_DATA)
        setRawJsonText(JSON.stringify(DEFAULT_PRESS_DATA, null, 2))
      }
    } catch (err) {
      console.error('Failed to load press_config:', err)
      toast.error('Failed to load press configuration from database')
      setPressConfig(DEFAULT_PRESS_DATA)
      setRawJsonText(JSON.stringify(DEFAULT_PRESS_DATA, null, 2))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPressConfig()
  }, [])

  // Sync JSON text when switching to JSON tab
  useEffect(() => {
    if (activeTab === 'json') {
      setRawJsonText(JSON.stringify(pressConfig, null, 2))
      setJsonError(null)
    }
  }, [activeTab, pressConfig])

  // Save to database
  const saveToDatabase = async (configToSave) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'press_config',
          value: configToSave,
          description: 'Configuration and article list for the public Press Room and milestone coverage',
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      setPressConfig(configToSave)
      setRawJsonText(JSON.stringify(configToSave, null, 2))
      toast.success('Press Room settings saved to database successfully!')
    } catch (err) {
      console.error('Error saving press_config:', err)
      toast.error(`Save failed: ${err.message || 'Unknown database error'}`)
    } finally {
      setSaving(false)
    }
  }

  // Handle saving from visual editor
  const handleSaveVisual = () => {
    saveToDatabase(pressConfig)
  }

  // Handle saving from raw JSON editor
  const handleSaveJson = () => {
    try {
      const parsed = JSON.parse(rawJsonText)
      if (!Array.isArray(parsed.articles)) {
        throw new Error('JSON must include an "articles" array.')
      }
      setJsonError(null)
      saveToDatabase(parsed)
    } catch (err) {
      setJsonError(err.message)
      toast.error(`Invalid JSON: ${err.message}`)
    }
  }

  // Format / Prettify raw JSON
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(rawJsonText)
      setRawJsonText(JSON.stringify(parsed, null, 2))
      setJsonError(null)
      toast.success('JSON formatted!')
    } catch (err) {
      setJsonError(err.message)
      toast.error(`Format error: ${err.message}`)
    }
  }

  // Reset to default milestones
  const handleResetDefaults = () => {
    if (window.confirm('Reset all press releases and milestones to default Bihar journey (Aurangabad launch, 20+ orders, Bhagalpur expansion)?')) {
      saveToDatabase(DEFAULT_PRESS_DATA)
    }
  }

  // Open modal to add new
  const handleAddNew = () => {
    setEditingIndex(null)
    setFormData({
      id: `press-${Date.now()}`,
      title: '',
      source: 'Dainik Jagran',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      category: 'Launch',
      description: '',
      link: ''
    })
    setIsModalOpen(true)
  }

  // Open modal to edit
  const handleEdit = (index) => {
    const item = pressConfig.articles[index]
    setEditingIndex(index)
    setFormData({
      id: item.id || `press-${Date.now()}`,
      title: item.title || '',
      source: item.source || '',
      date: item.date || '',
      category: item.category || 'Launch',
      description: item.description || '',
      link: item.link || ''
    })
    setIsModalOpen(true)
  }

  // Submit modal form
  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!formData.date.trim()) {
      toast.error('Date is required')
      return
    }

    const updatedArticles = [...pressConfig.articles]
    if (editingIndex !== null) {
      updatedArticles[editingIndex] = { ...formData }
    } else {
      updatedArticles.unshift({ ...formData })
    }

    const newConfig = {
      ...pressConfig,
      articles: updatedArticles
    }

    setPressConfig(newConfig)
    setIsModalOpen(false)
    saveToDatabase(newConfig)
  }

  // Delete article
  const handleDelete = (index) => {
    const updatedArticles = pressConfig.articles.filter((_, i) => i !== index)
    const newConfig = {
      ...pressConfig,
      articles: updatedArticles
    }
    setPressConfig(newConfig)
    setDeleteIndex(null)
    saveToDatabase(newConfig)
    toast.success('Press release deleted')
  }

  // Reorder article
  const handleMove = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= pressConfig.articles.length) return

    const updatedArticles = [...pressConfig.articles]
    const temp = updatedArticles[index]
    updatedArticles[index] = updatedArticles[newIndex]
    updatedArticles[newIndex] = temp

    const newConfig = {
      ...pressConfig,
      articles: updatedArticles
    }
    setPressConfig(newConfig)
    saveToDatabase(newConfig)
  }

  // Filtered articles for list view
  const filteredArticles = pressConfig.articles.filter(item => {
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter
    const q = searchQuery.toLowerCase().trim()
    const matchesQuery = !q ||
      item.title.toLowerCase().includes(q) ||
      item.source.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.date.toLowerCase().includes(q)
    return matchesCategory && matchesQuery
  })

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#111] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-red-500/10 text-ozo-red">
              <Newspaper size={20} />
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-ozo-red">
              Content & Newsroom Management
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Press & Milestones Manager
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Manage city launches, customer milestones, media coverage, and live press releases.
          </p>
        </div>

        {/* Global Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/press"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-1.5 transition-colors"
          >
            <Eye size={14} />
            View Public Page
          </a>

          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900/40 flex items-center gap-1.5 transition-colors"
            title="Reset to default Bihar journey"
          >
            <RotateCcw size={14} />
            Reset Defaults
          </button>

          <button
            onClick={handleAddNew}
            className="px-4 py-2.5 rounded-xl bg-ozo-red text-white text-xs font-bold hover:bg-red-600 flex items-center gap-1.5 shadow-md shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={15} />
            Add Press Release
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-gray-100 dark:border-white/5">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Stories</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
            {pressConfig.articles.length}
          </p>
        </div>
        <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-gray-100 dark:border-white/5">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">City Launches</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {pressConfig.articles.filter(a => a.category === 'Launch' || a.category === 'Expansion').length}
          </p>
        </div>
        <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-gray-100 dark:border-white/5">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Key Milestones</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {pressConfig.articles.filter(a => a.category === 'Milestone').length}
          </p>
        </div>
        <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-gray-100 dark:border-white/5">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Database Status</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Live Synced</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs: Visual Editor vs Raw JSON Editor vs Media Kit */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('visual')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
              activeTab === 'visual'
                ? 'bg-ozo-red text-white shadow-md shadow-red-500/20'
                : 'bg-white dark:bg-[#111] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-white/5'
            }`}
          >
            <Newspaper size={14} />
            Visual Stories Editor
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
              activeTab === 'json'
                ? 'bg-ozo-red text-white shadow-md shadow-red-500/20'
                : 'bg-white dark:bg-[#111] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-white/5'
            }`}
          >
            <Code size={14} />
            Raw JSON Editor
          </button>

          <button
            onClick={() => setActiveTab('mediakit')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
              activeTab === 'mediakit'
                ? 'bg-ozo-red text-white shadow-md shadow-red-500/20'
                : 'bg-white dark:bg-[#111] text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-white/5'
            }`}
          >
            <Download size={14} />
            Media Kit Settings
          </button>
        </div>

        {activeTab === 'visual' && (
          <button
            onClick={handleSaveVisual}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Save All Changes
          </button>
        )}
      </div>

      {/* TAB 1: VISUAL STORIES EDITOR */}
      {activeTab === 'visual' && (
        <div className="space-y-6">
          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-[#111] p-4 rounded-2xl border border-gray-100 dark:border-white/5">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search releases by title, source, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ozo-red/50"
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

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {['All', ...CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                    categoryFilter === cat
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Articles List */}
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw size={28} className="animate-spin text-ozo-red mx-auto mb-2" />
              <p className="text-xs text-gray-500">Loading press items from database...</p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-[#111] rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
              <Newspaper size={36} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No press releases found</p>
              <p className="text-xs text-gray-500 mt-1">Try clearing filters or add a new press release.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredArticles.map((article) => {
                const realIndex = pressConfig.articles.findIndex(a => a.id === article.id || a.title === article.title)
                return (
                  <motion.div
                    key={article.id || realIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-[#141414] p-5 md:p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    {/* Left: Reorder Arrows */}
                    <div className="hidden md:flex flex-col gap-1 text-gray-400">
                      <button
                        onClick={() => handleMove(realIndex, 'up')}
                        disabled={realIndex === 0}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-20"
                        title="Move Up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => handleMove(realIndex, 'down')}
                        disabled={realIndex === pressConfig.articles.length - 1}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-20"
                        title="Move Down"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>

                    {/* Middle: Content */}
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 dark:bg-ozo-red/10 text-ozo-red border border-red-100 dark:border-ozo-red/20">
                          {article.category || 'News'}
                        </span>
                        <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                          {article.source}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar size={12} />
                          {article.date}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
                        {article.title}
                      </h3>

                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {article.description}
                      </p>

                      {article.link && (
                        <a
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-ozo-red hover:underline"
                        >
                          External link: {article.link}
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        onClick={() => handleEdit(realIndex)}
                        className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1.5 text-xs font-bold"
                        title="Edit Story"
                      >
                        <Edit3 size={14} />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => setDeleteIndex(realIndex)}
                        className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors"
                        title="Delete Story"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RAW JSON EDITOR */}
      {activeTab === 'json' && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-4 rounded-2xl flex items-start gap-3">
            <Info size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong>Direct Database JSON Editor:</strong> You can directly edit the press coverage JSON text here, including dates, sources, descriptions, and city milestones. Any valid JSON saved here updates the <code className="bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded">app_settings</code> table directly.
            </div>
          </div>

          {jsonError && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 p-4 rounded-2xl flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-bold">
              <AlertTriangle size={16} />
              <span>JSON Syntax Error: {jsonError}</span>
            </div>
          )}

          <div className="relative">
            <textarea
              rows={22}
              value={rawJsonText}
              onChange={(e) => {
                setRawJsonText(e.target.value)
                try {
                  JSON.parse(e.target.value)
                  setJsonError(null)
                } catch (err) {
                  setJsonError(err.message)
                }
              }}
              spellCheck={false}
              className="w-full p-4 font-mono text-xs rounded-2xl bg-gray-900 text-emerald-400 border border-gray-800 focus:outline-none focus:ring-2 focus:ring-ozo-red/50 shadow-inner"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleFormatJson}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-xs font-bold text-gray-800 dark:text-gray-200 transition-colors"
              >
                Format / Prettify JSON
              </button>
              <button
                onClick={() => {
                  setRawJsonText(JSON.stringify(pressConfig, null, 2))
                  setJsonError(null)
                }}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Discard Edits
              </button>
            </div>

            <button
              onClick={handleSaveJson}
              disabled={saving || !!jsonError}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              Save JSON to Database
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: MEDIA KIT SETTINGS */}
      {activeTab === 'mediakit' && (
        <div className="bg-white dark:bg-[#141414] p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-white/5 space-y-6 max-w-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Official Media Kit Configuration</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Customize the downloadable press kit card that journalists and media outlets download from the Press Room.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Card Title</label>
              <input
                type="text"
                value={pressConfig.media_kit?.title || ''}
                onChange={(e) => setPressConfig({
                  ...pressConfig,
                  media_kit: { ...pressConfig.media_kit, title: e.target.value }
                })}
                placeholder="Official Media Kit"
                className="w-full px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ozo-red/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <textarea
                rows={3}
                value={pressConfig.media_kit?.description || ''}
                onChange={(e) => setPressConfig({
                  ...pressConfig,
                  media_kit: { ...pressConfig.media_kit, description: e.target.value }
                })}
                placeholder="Download our brand guidelines, high-res logos, and executive headshots."
                className="w-full px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ozo-red/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Download File Size</label>
                <input
                  type="text"
                  value={pressConfig.media_kit?.file_size || ''}
                  onChange={(e) => setPressConfig({
                    ...pressConfig,
                    media_kit: { ...pressConfig.media_kit, file_size: e.target.value }
                  })}
                  placeholder="14.2 MB"
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ozo-red/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Download URL (Asset / Zip Path)</label>
                <input
                  type="text"
                  value={pressConfig.media_kit?.download_url || ''}
                  onChange={(e) => setPressConfig({
                    ...pressConfig,
                    media_kit: { ...pressConfig.media_kit, download_url: e.target.value }
                  })}
                  placeholder="/logo_transparent.png"
                  className="w-full px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ozo-red/50"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex justify-end">
            <button
              onClick={handleSaveVisual}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              Save Media Kit Settings
            </button>
          </div>
        </div>
      )}

      {/* ADD / EDIT STORY MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/10 p-6 md:p-8 max-w-xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white"
              >
                <X size={18} />
              </button>

              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1">
                {editingIndex !== null ? 'Edit Press Release' : 'Add New Press Release'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                Fill in the details for this milestone or news item.
              </p>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Headline / Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. OZO Mart Launches Fast Delivery in Aurangabad"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ozo-red/50"
                  />
                </div>

                {/* Source & Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Publication / Source *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dainik Jagran / OZO Newsroom"
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      className="w-full px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ozo-red/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Release Date *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. March 12, 2026"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ozo-red/50"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Category Tag
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ozo-red/50"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Summary / Story Content *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Explain what happened in detail (e.g. how many deliveries were completed, city launched, customer response)..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ozo-red/50 leading-relaxed"
                  />
                </div>

                {/* External Link */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    External Article URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    className="w-full px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-ozo-red/50"
                  />
                </div>

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-ozo-red hover:bg-red-600 text-white text-xs font-bold transition-all shadow-md shadow-red-500/20"
                  >
                    {editingIndex !== null ? 'Update Story' : 'Add Story'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteIndex !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/10 p-6 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 size={20} />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                Delete Press Story?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                Are you sure you want to delete this press story? It will be permanently removed from the public Press Room.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setDeleteIndex(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteIndex)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AdminPress
