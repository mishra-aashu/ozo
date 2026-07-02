import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, User, Clock, ArrowRight, ChevronLeft, Search, Filter } from 'lucide-react'
import { useBlogStore } from '../stores/blogStore'
import OptimizedImage from '../components/OptimizedImage'
import SEO from '../components/SEO'

const Blog = () => {
  const navigate = useNavigate()
  const { posts, isLoading, fetchPosts } = useBlogStore()
  
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  useEffect(() => {
    fetchPosts(true)
  }, [fetchPosts])

  // Get only published posts for the frontend client
  const publishedPosts = posts.filter(post => post.status === 'published')

  // Categories list
  const categories = ['All', ...new Set(publishedPosts.map(p => p.category))].filter(Boolean)

  // Filter posts
  const filteredPosts = publishedPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Skeleton Card component
  const SkeletonCard = () => (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-white/5 animate-pulse flex flex-col h-full">
      <div className="h-48 w-full bg-gray-200 dark:bg-white/5" />
      <div className="p-6 flex flex-col flex-grow space-y-4">
        <div className="flex gap-4">
          <div className="h-4 w-20 bg-gray-200 dark:bg-white/5 rounded-full" />
          <div className="h-4 w-12 bg-gray-200 dark:bg-white/5 rounded-full" />
        </div>
        <div className="h-6 w-5/6 bg-gray-200 dark:bg-white/5 rounded-md" />
        <div className="h-10 w-full bg-gray-200 dark:bg-white/5 rounded-md" />
        <div className="pt-4 border-t border-gray-100 dark:border-white/5 mt-auto flex justify-between items-center">
          <div className="h-4 w-24 bg-gray-200 dark:bg-white/5 rounded-full" />
          <div className="h-4 w-16 bg-gray-200 dark:bg-white/5 rounded-full" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300 relative">
      <SEO
        title="OZO Blog | Fresh Ideas from India's Fastest Grocery Delivery"
        description="Stories, updates, and behind-the-scenes from OZO Mart — Aurangabad's 30-minute grocery delivery. Tech, ops, and fresh food insights."
        keywords="OZO blog, grocery delivery blog, quick commerce India, Aurangabad delivery, fresh food tips"
      />
      
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-[#1a1a1a]/85 backdrop-blur-md border border-gray-150/10 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:text-ozo-red dark:hover:text-white font-black text-xs uppercase tracking-widest transition-all shadow-sm group hover:border-ozo-red/50 hover:bg-white dark:hover:bg-white/10"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back
        </button>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-[#0d0d0d] pt-28 pb-36 border-b border-gray-100 dark:border-white/5 relative overflow-hidden">
        <div className="container-custom relative z-10 text-center max-w-3xl mx-auto px-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 font-display"
          >
            The OZO <span className="text-gradient">Blog.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-base md:text-lg text-ozo-gray dark:text-gray-400 font-semibold"
          >
            Stories, updates, and deep dives from India's fastest fresh delivery team.
          </motion.p>
        </div>
        <div className="absolute top-0 left-0 w-64 h-64 bg-red-500/5 blur-3xl rounded-full -ml-32 -mt-32" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-green-500/5 blur-3xl rounded-full -mr-32 -mb-32" />
      </div>

      {/* Filter and Search Section */}
      <div className="container-custom -mt-20 relative z-20 px-4">
        <div className="max-w-6xl mx-auto bg-white dark:bg-[#111111] p-6 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ozo-gray dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-4 py-3 w-full border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-gray-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-ozo-red focus:border-transparent text-sm transition-all"
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === c
                    ? 'bg-gradient-ozo text-white shadow-md'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-650 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-transparent dark:border-white/5'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="container-custom mt-12 relative z-20 px-4">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-[#111] rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-md px-6">
              <div className="w-16 h-16 bg-red-500/10 text-ozo-red rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">No articles match your criteria</h3>
              <p className="text-sm text-ozo-gray dark:text-gray-400 mt-2 max-w-sm mx-auto">
                Try refining your search text or switching to another category tab to find posts.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post, index) => (
                <motion.div 
                  key={post.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/blog/${post.slug}`)}
                  className="bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] overflow-hidden shadow-md hover:shadow-xl border border-gray-100 dark:border-white/5 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full cursor-pointer group"
                >
                  {/* Card Image */}
                  <div className="h-52 w-full overflow-hidden relative">
                    <OptimizedImage 
                      src={post.image} 
                      alt={post.title} 
                      width={400}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      containerClassName="w-full h-full"
                    />
                    <span className="absolute top-4 left-4 px-3 py-1 bg-white/95 dark:bg-[#111]/95 text-ozo-red rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                      {post.category}
                    </span>
                  </div>
                  
                  {/* Card Content */}
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex items-center gap-4 text-[10px] font-black text-ozo-gray dark:text-gray-500 mb-3 uppercase tracking-widest">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {post.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {post.readTime}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-ozo-red transition-colors duration-300">
                      {post.title}
                    </h3>

                    <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium mb-6 line-clamp-3 leading-relaxed">
                      {post.excerpt}
                    </p>

                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-gradient-ozo text-white text-[9px] font-bold flex items-center justify-center uppercase">
                          {post.author.slice(0,2)}
                        </div>
                        {post.author}
                      </span>
                      <button className="text-ozo-red group-hover:text-red-700 font-black text-xs uppercase tracking-widest flex items-center gap-1 transition-colors">
                        Read Article
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Blog
