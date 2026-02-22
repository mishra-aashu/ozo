import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Eye,
  X,
  Upload,
  Calendar,
  User,
  Clock,
  Check,
  AlertTriangle,
  FileText,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react'
import { useBlogStore } from '../../stores/blogStore'
import { useAuthStore } from '../../stores/authStore'
import toast from 'react-hot-toast'

// Helper to render both HTML and simple plain text properly
const formatBlogBody = (content) => {
  if (!content) return '';
  
  // Check if content already contains block-level HTML tags
  const hasHtmlBlocks = /<(p|br|div|li|h[1-6]|ul|ol|table|pre|blockquote)\b/i.test(content);
  if (hasHtmlBlocks) {
    return content;
  }
  
  // Convert plain text newlines: double newlines to paragraphs, single newlines to br
  return content
    .split(/\n\s*\n/)
    .map(para => `<p>${para.replace(/\n/g, '<br />')}</p>`)
    .join('');
};

const Blog = () => {
  const { posts, isLoading, fetchPosts, savePost, deletePost } = useBlogStore()
  const { profile } = useAuthStore()

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('write') // 'write' | 'preview'
  const [editingPost, setEditingPost] = useState(null)
  
  // Form fields
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [isAutoSlug, setIsAutoSlug] = useState(true)
  const [category, setCategory] = useState('Tech & Ops')
  const [customCategory, setCustomCategory] = useState('')
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [author, setAuthor] = useState('')
  const [readTime, setReadTime] = useState('2 min read')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('draft')
  const [coverImage, setCoverImage] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false)
  
  // Confirm delete dialog state
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState(null)

  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchPosts(true)
  }, [fetchPosts])

  // Set default author name from profile on load
  useEffect(() => {
    if (profile?.full_name) {
      setAuthor(profile.full_name)
    }
  }, [profile])

  // Slug generation logic
  useEffect(() => {
    if (isAutoSlug && title) {
      const generated = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-') // collapse dashes
        .trim()
      setSlug(generated)
    }
  }, [title, isAutoSlug])

  // Word count & read time auto-calculation
  useEffect(() => {
    const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0
    const minutes = Math.max(1, Math.ceil(wordCount / 200)) // ~200 WPM
    setReadTime(`${minutes} min read`)
  }, [body])

  // Unique categories derived from posts + defaults
  const categories = ['Tech & Ops', 'Updates', 'Recipes', 'Fresh Produce', 'Company News', ...new Set(posts.map(p => p.category))].filter(Boolean)

  const handleOpenCreate = () => {
    setEditingPost(null)
    setTitle('')
    setSlug('')
    setIsAutoSlug(true)
    setCategory('Tech & Ops')
    setCustomCategory('')
    setIsCustomCategory(false)
    setAuthor(profile?.full_name || 'Admin')
    setReadTime('1 min read')
    setExcerpt('')
    setBody('')
    setStatus('draft')
    setCoverImage('')
    setImageFile(null)
    setImagePreview('')
    setActiveTab('write')
    setIsEditorOpen(true)
  }

  const handleOpenEdit = async (postSummary) => {
    const loadingToast = toast.loading('Fetching full post details...')
    const res = await useBlogStore.getState().fetchPostBySlug(postSummary.slug)
    toast.dismiss(loadingToast)

    if (res.success && res.data) {
      const post = res.data
      setEditingPost(post)
      setTitle(post.title)
      setSlug(post.slug)
      setIsAutoSlug(false)
      
      if (categories.includes(post.category)) {
        setCategory(post.category)
        setIsCustomCategory(false)
      } else {
        setCategory('Custom')
        setCustomCategory(post.category)
        setIsCustomCategory(true)
      }

      setAuthor(post.author)
      setReadTime(post.readTime)
      setExcerpt(post.excerpt)
      setBody(post.body || '')
      setStatus(post.status)
      setCoverImage(post.image)
      setImageFile(null)
      setImagePreview(post.image)
      setActiveTab('write')
      setIsEditorOpen(true)
    } else {
      toast.error('Could not open post details')
    }
  }

  // File drop/upload handlers
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleImageSelection(files[0])
    }
  }

  const handleFileChange = (e) => {
    const files = e.target.files
    if (files && files[0]) {
      handleImageSelection(files[0])
    }
  }

  const handleImageSelection = (file) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed')
      return
    }
    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be under 5MB')
      return
    }
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  // Submit Handler
  const handleSave = async (e) => {
    e.preventDefault()

    if (!title.trim() || !slug.trim() || !excerpt.trim() || !body.trim()) {
      toast.error('Please fill in all required fields (Title, Excerpt, Body)')
      return
    }

    const finalCategory = isCustomCategory ? customCategory.trim() : category
    if (!finalCategory) {
      toast.error('Please specify a category')
      return
    }

    // Cover image check
    if (!coverImage && !imageFile) {
      toast.error('Please upload a cover image')
      return
    }

    const postPayload = {
      title,
      slug,
      category: finalCategory,
      author,
      readTime,
      excerpt,
      body,
      status,
      image: coverImage,
      created_at: editingPost ? editingPost.created_at : undefined
    }

    const res = await savePost(postPayload, imageFile)
    if (res.success) {
      setIsEditorOpen(false)
      fetchPosts(true)
    }
  }

  // Delete Handler
  const handleDelete = async (slugToDelete) => {
    const res = await deletePost(slugToDelete)
    if (res.success) {
      setDeleteConfirmSlug(null)
      fetchPosts(true)
    }
  }

  // Filtering Logic
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'All' || post.category === categoryFilter
    const matchesStatus = statusFilter === 'All' || post.status === statusFilter.toLowerCase()

    return matchesSearch && matchesCategory && matchesStatus
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] p-4 lg:p-8 transition-colors duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            Blog Posts
          </h1>
          <p className="text-sm font-semibold text-ozo-gray dark:text-gray-400 mt-1">
            Publish and manage news, articles, and updates hosted serverless on Supabase Storage.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-ozo text-white font-bold text-sm hover:opacity-90 transition-all shadow-ozo"
        >
          <Plus size={18} />
          Create New Post
        </button>
      </div>

      {/* Controls & Search */}
      <div className="bg-white dark:bg-[#0d0d0d] p-4 rounded-3xl border border-gray-150/10 dark:border-white/5 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ozo-gray dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search blogs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2.5 w-full border border-gray-250/20 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-ozo-red focus:border-transparent text-sm transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Category Selector */}
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-250/20 dark:border-white/10 rounded-xl px-3 py-2">
            <Filter size={14} className="text-ozo-gray dark:text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-gray-700 dark:text-gray-200 focus:outline-none text-xs font-semibold"
            >
              <option value="All">All Categories</option>
              {categories.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status buttons */}
          <div className="flex bg-gray-50 dark:bg-white/5 border border-gray-250/20 dark:border-white/10 p-1 rounded-xl">
            {['All', 'Published', 'Draft'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === status
                    ? 'bg-gradient-ozo text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main List Table */}
      <div className="bg-white dark:bg-[#0d0d0d] rounded-3xl border border-gray-150/10 dark:border-white/5 shadow-sm overflow-hidden">
        {isLoading && posts.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-ozo-red border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold animate-pulse">Loading blogs...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-24 text-center">
            <FileText size={48} className="mx-auto text-ozo-gray dark:text-gray-600 mb-4 stroke-1" />
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">No blog posts found</h3>
            <p className="text-sm text-ozo-gray dark:text-gray-400 mt-1 max-w-xs mx-auto">
              Create a new blog post or modify filters to see entries.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-150/10 dark:border-white/5 text-ozo-gray dark:text-gray-400 text-xs uppercase font-extrabold tracking-wider bg-gray-50/50 dark:bg-[#0e0e0e]/50">
                  <th className="px-6 py-4 whitespace-nowrap">Article</th>
                  <th className="px-6 py-4 whitespace-nowrap">Category</th>
                  <th className="px-6 py-4 whitespace-nowrap">Author</th>
                  <th className="px-6 py-4 whitespace-nowrap">Date</th>
                  <th className="px-6 py-4 whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 whitespace-nowrap">Read Time</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150/10 dark:divide-white/5">
                {filteredPosts.map((post) => (
                  <tr key={post.slug} className="hover:bg-gray-50/40 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={post.image}
                          alt={post.title}
                          className="w-14 h-10 object-cover rounded-lg border border-gray-200 dark:border-white/10"
                        />
                        <div className="max-w-xs sm:max-w-md">
                          <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1 group-hover:text-ozo-red transition-colors">
                            {post.title}
                          </h4>
                          <p className="text-xs text-ozo-gray dark:text-gray-400 line-clamp-1 mt-0.5">
                            {post.excerpt}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-block px-2.5 py-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg whitespace-nowrap">
                        {post.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-800 dark:text-gray-250 whitespace-nowrap">
                      {post.author}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-ozo-gray dark:text-gray-400 whitespace-nowrap">
                      {post.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-extrabold rounded-full ${
                        post.status === 'published'
                          ? 'bg-green-100 dark:bg-green-950/20 text-green-600 dark:text-green-400'
                          : 'bg-yellow-100 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${post.status === 'published' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        {post.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-ozo-gray dark:text-gray-400 whitespace-nowrap">
                      {post.readTime}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {post.status === 'published' && (
                          <a
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-ozo-red hover:bg-gray-150/20 dark:hover:bg-white/5 rounded-xl transition-all"
                            title="View post on website"
                          >
                            <ExternalLink size={16} />
                          </a>
                        )}
                        <button
                          onClick={() => handleOpenEdit(post)}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-150/20 dark:hover:bg-white/5 rounded-xl transition-all"
                          title="Edit post"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmSlug(post.slug)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-150/20 dark:hover:bg-white/5 rounded-xl transition-all"
                          title="Delete post"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Fullscreen Drawer for Create/Edit */}
      <AnimatePresence>
        {isEditorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end"
          >
            {/* Modal Body */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-w-5xl h-screen bg-white dark:bg-[#0f0f0f] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-150/10 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-[#0d0d0d]/50">
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">
                    {editingPost ? 'Edit Blog Post' : 'Create New Blog Post'}
                  </h2>
                  <p className="text-xs text-ozo-gray dark:text-gray-400 mt-1">
                    {slug ? `File: posts/${slug}.json` : 'Draft post in development'}
                  </p>
                </div>
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="p-2.5 rounded-xl hover:bg-gray-150/50 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-6 border-b border-gray-150/10 dark:border-white/5 flex items-center gap-6">
                <button
                  onClick={() => setActiveTab('write')}
                  className={`py-3.5 text-sm font-bold border-b-2 transition-all ${
                    activeTab === 'write'
                      ? 'border-ozo-red text-ozo-red'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Write Post
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`py-3.5 text-sm font-bold border-b-2 transition-all ${
                    activeTab === 'preview'
                      ? 'border-ozo-red text-ozo-red'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Live Preview
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {activeTab === 'write' ? (
                  <form onSubmit={handleSave} className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main input column */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Title */}
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-750 dark:text-gray-300">
                          Title *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="How OZO delivers organic avocados in 30 mins..."
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white rounded-xl focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 text-sm transition-all"
                        />
                      </div>

                      {/* Slug */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-black uppercase tracking-wider text-gray-750 dark:text-gray-300">
                            Slug *
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-ozo-gray dark:text-gray-400 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isAutoSlug}
                              onChange={(e) => setIsAutoSlug(e.target.checked)}
                              className="rounded border-gray-300 text-ozo-red focus:ring-ozo-red h-3.5 w-3.5"
                            />
                            Auto Generate
                          </label>
                        </div>
                        <input
                          type="text"
                          required
                          disabled={isAutoSlug}
                          value={slug}
                          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                          placeholder="auto-generated-slug"
                          className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] disabled:opacity-60 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 text-sm transition-all font-mono"
                        />
                      </div>

                      {/* Excerpt */}
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-750 dark:text-gray-300">
                          Excerpt / Summary *
                        </label>
                        <textarea
                          required
                          rows={3}
                          value={excerpt}
                          onChange={(e) => setExcerpt(e.target.value)}
                          placeholder="Provide a brief summary card description for the list page..."
                          className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white rounded-xl focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 text-sm transition-all resize-none"
                        />
                      </div>

                      {/* Body */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-black uppercase tracking-wider text-gray-750 dark:text-gray-300">
                            Article Body (HTML/Rich Content) *
                          </label>
                          <span className="text-[10px] text-ozo-gray dark:text-gray-500 font-semibold">
                            Supports standard tags: &lt;h3&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;blockquote&gt;
                          </span>
                        </div>
                        <textarea
                          required
                          rows={16}
                          value={body}
                          onChange={(e) => setBody(e.target.value)}
                          placeholder="<p>Write your beautiful blog article body here using HTML tags for paragraphs, headings, lists...</p>"
                          className="w-full px-4 py-3 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white rounded-xl focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 text-sm transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* Meta Sidebar column */}
                    <div className="space-y-6 bg-gray-50/30 dark:bg-white/[0.01] p-4 rounded-3xl border border-gray-150/10 dark:border-white/5">
                      {/* Status Toggle */}
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-750 dark:text-gray-300 block">
                          Publish Status
                        </label>
                        <div className="flex bg-gray-150/50 dark:bg-white/5 border border-gray-250/10 dark:border-white/10 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setStatus('draft')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                              status === 'draft'
                                ? 'bg-white dark:bg-[#151515] text-yellow-600 dark:text-yellow-400 shadow-sm border border-yellow-500/20'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                          >
                            Draft
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatus('published')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                              status === 'published'
                                ? 'bg-white dark:bg-[#151515] text-green-600 dark:text-green-400 shadow-sm border border-green-500/20'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                          >
                            Publish
                          </button>
                        </div>
                      </div>

                      {/* Cover Image Upload Area */}
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-750 dark:text-gray-300 block">
                          Cover Image *
                        </label>
                        
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-40 ${
                            isDragging
                              ? 'border-ozo-red bg-ozo-red/5'
                              : imagePreview
                              ? 'border-gray-300 dark:border-white/15 hover:border-ozo-red bg-transparent'
                              : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50/50 dark:hover:bg-white/[0.01]'
                          }`}
                        >
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                          />
                          
                          {imagePreview ? (
                            <div className="w-full space-y-3">
                              <img
                                src={imagePreview}
                                alt="Cover preview"
                                className="w-full h-28 object-cover rounded-xl border border-gray-200 dark:border-white/10"
                              />
                              <p className="text-[10px] text-ozo-gray dark:text-gray-400 font-semibold truncate max-w-full">
                                {imageFile ? imageFile.name : 'Existing Image URL'}
                              </p>
                              <span className="text-[10px] uppercase tracking-wider font-extrabold text-ozo-red group-hover:underline">
                                Change Image
                              </span>
                            </div>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-gray-450 dark:text-gray-500 mb-2 stroke-1" />
                              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                Drag & Drop Image
                              </p>
                              <p className="text-[10px] text-ozo-gray dark:text-gray-400 mt-1 font-semibold">
                                Supports JPEG, PNG, WEBP (Max 5MB)
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Category Selector */}
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-750 dark:text-gray-300 block">
                          Category
                        </label>
                        {!isCustomCategory ? (
                          <div className="flex gap-2">
                             <select
                               value={category}
                               onChange={(e) => {
                                 if (e.target.value === 'Custom') {
                                   setIsCustomCategory(true)
                                 } else {
                                   setCategory(e.target.value)
                                 }
                               }}
                               className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1c24] text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_14px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] dark:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
                             >
                               {categories.map((c, i) => (
                                 <option key={i} value={c} className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">{c}</option>
                               ))}
                               <option value="Custom" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">+ Custom Category</option>
                             </select>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <input
                               type="text"
                               value={customCategory}
                               onChange={(e) => setCustomCategory(e.target.value)}
                               placeholder="Enter custom category..."
                               className="w-full px-4 py-3 bg-white dark:bg-[#1c1c24] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 text-sm text-gray-900 dark:text-white"
                             />
                            <button
                              type="button"
                              onClick={() => setIsCustomCategory(false)}
                              className="text-[10px] font-extrabold uppercase text-ozo-gray dark:text-gray-400 hover:text-ozo-red"
                            >
                              Choose existing category
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Author */}
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-750 dark:text-gray-300">
                          Author Name
                        </label>
                        <input
                          type="text"
                          value={author}
                          onChange={(e) => setAuthor(e.target.value)}
                          placeholder="Aashu Mishra"
                          className="w-full px-4 py-3 bg-white dark:bg-[#1c1c24] border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 text-sm text-gray-900 dark:text-white"
                        />
                      </div>

                      {/* Auto metrics (Read Only) */}
                      <div className="p-3 bg-gray-100/50 dark:bg-white/[0.02] border border-gray-150/10 dark:border-white/5 rounded-2xl space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-ozo-gray dark:text-gray-400">
                          <span>Auto Calculated metrics:</span>
                        </div>
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-gray-500">Read Time:</span>
                          <span className="text-gray-900 dark:text-white flex items-center gap-1">
                            <Clock size={12} />
                            {readTime}
                          </span>
                        </div>
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-gray-500">Word Count:</span>
                          <span className="text-gray-900 dark:text-white">
                            {body.trim() ? body.trim().split(/\s+/).length : 0} words
                          </span>
                        </div>
                      </div>
                    </div>
                  </form>
                ) : (
                  /* Live Preview Column */
                  <div className="max-w-3xl mx-auto px-6 py-10 space-y-8 min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 transition-colors duration-300">
                    {/* Cover Header */}
                    <div className="space-y-4">
                      <span className="px-3.5 py-1.5 bg-ozo-red/10 text-ozo-red text-xs font-black uppercase tracking-widest rounded-full">
                        {isCustomCategory ? customCategory || 'Uncategorized' : category}
                      </span>
                      <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white leading-tight font-display">
                        {title || 'Example Blog Post Title'}
                      </h1>
                      
                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-6 text-sm text-ozo-gray dark:text-gray-400 font-semibold pt-2 border-y border-gray-100 dark:border-white/5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-ozo flex items-center justify-center text-white text-[10px] font-bold uppercase">
                            {author ? author.slice(0, 2) : 'A'}
                          </div>
                          <span>{author || 'Anonymous'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          <span>
                            {editingPost ? new Date(editingPost.created_at).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            }) : new Date().toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} />
                          <span>{readTime}</span>
                        </div>
                      </div>
                    </div>

                    {/* Excerpt panel */}
                    {excerpt && (
                      <p className="text-lg font-bold text-gray-600 dark:text-gray-300 italic border-l-4 border-ozo-red pl-4 leading-relaxed">
                        {excerpt}
                      </p>
                    )}

                    {/* Cover Image */}
                    {imagePreview && (
                      <div className="h-80 md:h-[400px] w-full rounded-3xl overflow-hidden shadow-lg border border-gray-200 dark:border-white/10">
                        <img
                          src={imagePreview}
                          alt="Cover"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Article Body */}
                    <div 
                      className="prose prose-lg dark:prose-invert max-w-none pt-4 leading-relaxed text-gray-800 dark:text-gray-200
                        prose-headings:font-black prose-headings:font-display prose-headings:text-gray-900 dark:prose-headings:text-white
                        prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
                        prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
                        prose-p:mb-6 prose-p:text-base prose-p:leading-8
                        prose-blockquote:border-l-4 prose-blockquote:border-ozo-green prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:my-8 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-300"
                      dangerouslySetInnerHTML={{ 
                        __html: body ? formatBlogBody(body) : '<p className="text-gray-400 text-sm">Write content in the "Write Post" tab to see it formatted here...</p>' 
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="p-6 border-t border-gray-150/10 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-[#0d0d0d]/50">
                <div className="flex items-center gap-1.5 text-xs text-ozo-gray dark:text-gray-400">
                  {status === 'draft' ? (
                    <>
                      <AlertTriangle size={14} className="text-yellow-500 animate-pulse" />
                      <span>Post will be saved as a draft (hidden from store frontend).</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} className="text-green-500 animate-pulse" />
                      <span>Post will be published live instantly.</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-650 dark:text-gray-300 hover:bg-gray-150/30 dark:hover:bg-white/5 font-semibold text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-ozo text-white font-black text-sm hover:opacity-90 disabled:opacity-50 transition-all shadow-ozo"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : editingPost ? (
                      'Save Changes'
                    ) : (
                      'Publish Post'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deleteConfirmSlug && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-[#0f0f0f] border border-gray-150/10 dark:border-white/5 rounded-3xl p-6 shadow-2xl space-y-6"
            >
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-950/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Delete Blog Post?</h3>
                  <p className="text-sm text-ozo-gray dark:text-gray-400 mt-2">
                    Are you sure you want to delete <span className="font-bold text-gray-800 dark:text-white">posts/{deleteConfirmSlug}.json</span>? This action is permanent and cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmSlug(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-650 dark:text-gray-305 hover:bg-gray-150/25 dark:hover:bg-white/5 font-semibold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirmSlug)}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl bg-red-650 text-white font-bold text-xs hover:bg-red-700 disabled:opacity-50 transition-all"
                >
                  {isLoading ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Blog
