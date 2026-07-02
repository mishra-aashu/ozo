import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Calendar, User, Clock, ChevronLeft, Share2, Copy, Check, ArrowRight, Loader } from 'lucide-react'
import { useBlogStore } from '../stores/blogStore'
import OptimizedImage from '../components/OptimizedImage'
import SEO from '../components/SEO'
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

const BlogDetail = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { currentPost, posts, isLoading, fetchPostBySlug, fetchPosts } = useBlogStore()
  
  const [scrollProgress, setScrollProgress] = useState(0)
  const [copied, setCopied] = useState(false)

  // Fetch this specific post and index for recommendations
  useEffect(() => {
    fetchPostBySlug(slug)
    fetchPosts()
    
    // Reset scroll when slug changes
    window.scrollTo(0, 0)
  }, [slug, fetchPostBySlug, fetchPosts])

  // Track scroll progress for reading bar
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight
      if (totalScroll > 0) {
        const progress = (window.scrollY / totalScroll) * 100
        setScrollProgress(progress)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Handle Share/Copy Link
  const handleShare = async () => {
    const shareData = {
      title: currentPost?.title || 'OZO Blog',
      text: currentPost?.excerpt || 'Read this interesting blog post from OZO!',
      url: window.location.href,
    }

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData)
        return
      } catch (err) {
        console.warn('Native share failed, falling back to copy to clipboard', err)
      }
    }

    // Fallback: Copy link
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy link')
    }
  }

  if (isLoading && !currentPost) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center">
        <Loader className="w-10 h-10 text-ozo-red animate-spin mb-4" />
        <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold animate-pulse">Loading article details...</p>
      </div>
    )
  }

  if (!currentPost) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-3xl font-black text-gray-950 dark:text-white mb-2">Article Not Found</h2>
        <p className="text-sm text-ozo-gray dark:text-gray-400 mb-6 max-w-sm">
          The article you are trying to view does not exist or has been removed.
        </p>
        <button
          onClick={() => navigate('/blog')}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-ozo text-white font-bold rounded-2xl shadow-md text-sm hover:opacity-90"
        >
          <ChevronLeft size={16} />
          Back to Blogs
        </button>
      </div>
    )
  }

  // Recommended Articles Logic:
  // Filter out the current post, then prioritize posts in the same category. Take exactly 2.
  const otherPosts = posts.filter(p => p.slug !== currentPost.slug && p.status === 'published')
  const sameCategoryPosts = otherPosts.filter(p => p.category === currentPost.category)
  const recommendations = [...sameCategoryPosts, ...otherPosts.filter(p => p.category !== currentPost.category)].slice(0, 2)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300 relative">
      <SEO
        title={`${currentPost.title} | OZO Blog`}
        description={currentPost.excerpt}
        keywords={`Ozo blog, ${currentPost.category.toLowerCase()}, ${currentPost.title}`}
      />

      {/* Reading Progress Bar */}
      <div 
        className="fixed top-0 left-0 h-1 bg-gradient-ozo z-50 transition-all duration-100" 
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Floating Header Actions */}
      <div className="max-w-6xl mx-auto px-4 pt-6 flex items-center justify-between relative z-20">
        <button
          onClick={() => navigate('/blog')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-[#1a1a1a]/85 backdrop-blur-md border border-gray-150/10 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:text-ozo-red dark:hover:text-white font-black text-xs uppercase tracking-widest transition-all shadow-sm group hover:border-ozo-red/50 hover:bg-white dark:hover:bg-white/10"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          All Blogs
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-[#1a1a1a]/85 backdrop-blur-md border border-gray-150/10 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:text-ozo-red dark:hover:text-white font-black text-xs uppercase tracking-widest transition-all shadow-sm hover:border-ozo-red/50 hover:bg-white dark:hover:bg-white/10"
        >
          {copied ? <Check size={16} className="text-green-500" /> : <Share2 size={16} />}
          {copied ? 'Copied' : 'Share'}
        </button>
      </div>

      {/* Glassmorphic Parallax-style Banner Area */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <div className="space-y-4 text-center max-w-3xl mx-auto">
          <span className="px-3.5 py-1.5 bg-ozo-red/10 text-ozo-red text-xs font-black uppercase tracking-widest rounded-full">
            {currentPost.category}
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white leading-tight font-display">
            {currentPost.title}
          </h1>
          
          {/* Metadata Block */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-ozo-gray dark:text-gray-400 font-semibold pt-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-ozo flex items-center justify-center text-white text-[10px] font-bold uppercase">
                {currentPost.author.slice(0, 2)}
              </div>
              <span className="text-gray-850 dark:text-gray-200">{currentPost.author}</span>
            </div>
            <span className="w-1.5 h-1.5 bg-gray-300 dark:bg-gray-750 rounded-full" />
            <div className="flex items-center gap-1.5">
              <Calendar size={14} />
              <span>{currentPost.date}</span>
            </div>
            <span className="w-1.5 h-1.5 bg-gray-300 dark:bg-gray-750 rounded-full" />
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>{currentPost.readTime}</span>
            </div>
          </div>
        </div>

        {/* Hero Cover Image */}
        <div className="mt-8 rounded-[2.5rem] overflow-hidden shadow-xl border border-gray-200 dark:border-white/10 h-72 sm:h-[450px] relative">
          <OptimizedImage
            src={currentPost.image}
            alt={currentPost.title}
            className="w-full h-full object-cover"
            containerClassName="w-full h-full"
          />
        </div>
      </div>

      {/* Body Content */}
      <article className="max-w-3xl mx-auto px-4 mt-12 bg-transparent">
        <div className="bg-white dark:bg-[#111] border border-gray-100 dark:border-white/5 rounded-[2.5rem] p-6 sm:p-12 shadow-md">
          {/* Excerpt Summary */}
          {currentPost.excerpt && (
            <p className="text-lg font-bold text-gray-650 dark:text-gray-300 italic border-l-4 border-ozo-red pl-5 mb-8 leading-relaxed">
              {currentPost.excerpt}
            </p>
          )}

          {/* HTML Render */}
          <div 
            className="prose prose-lg dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 leading-relaxed
              prose-headings:font-black prose-headings:font-display prose-headings:text-gray-900 dark:prose-headings:text-white
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-p:mb-6 prose-p:text-[16px] prose-p:leading-8 prose-p:text-gray-750 dark:prose-p:text-gray-305
              prose-strong:font-bold prose-strong:text-gray-950 dark:prose-strong:text-white
              prose-blockquote:border-l-4 prose-blockquote:border-ozo-green prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:my-8 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-350"
            dangerouslySetInnerHTML={{ __html: formatBlogBody(currentPost.body) }}
          />
        </div>
      </article>

      {/* Recommended Posts Footer */}
      {recommendations.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 mt-20 pt-16 border-t border-gray-200 dark:border-white/5">
          <h3 className="text-2xl font-black text-gray-950 dark:text-white mb-8 font-display">
            Recommended Articles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {recommendations.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="bg-white dark:bg-[#151515] p-5 rounded-[2rem] border border-gray-100 dark:border-white/5 hover:-translate-y-1 transition-all duration-300 shadow-sm flex flex-col group hover:shadow-md"
              >
                <div className="h-40 w-full overflow-hidden rounded-2xl relative mb-4">
                  <OptimizedImage
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    containerClassName="w-full h-full"
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/95 dark:bg-[#111]/95 text-ozo-red rounded-full text-[9px] font-black uppercase tracking-widest shadow-md">
                    {post.category}
                  </span>
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-3 text-[9px] font-bold text-ozo-gray dark:text-gray-500 mb-2 uppercase tracking-widest">
                    <span>{post.date}</span>
                    <span>•</span>
                    <span>{post.readTime}</span>
                  </div>
                  <h4 className="font-bold text-gray-950 dark:text-white text-base group-hover:text-ozo-red transition-colors line-clamp-2">
                    {post.title}
                  </h4>
                  <div className="mt-4 flex items-center justify-between text-xs font-black text-ozo-red uppercase tracking-wider">
                    <span>Read Article</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default BlogDetail
