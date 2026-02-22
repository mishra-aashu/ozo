import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  Trash2,
  ImageOff,
  Star,
  MessageSquare,
  Clock,
  Search,
  RefreshCw,
  Loader2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  CornerDownRight,
  Send,
  X
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import OptimizedImage from '../../components/OptimizedImage'
import UserAvatar from '../../components/UserAvatar'

const Reviews = () => {
  // Tabs: 'pending' | 'approved' | 'all'
  const [activeTab, setActiveTab] = useState('pending')
  
  // Data lists
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [submittingId, setSubmittingId] = useState(null)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 8

  // Reply state
  const [replyText, setReplyText] = useState('')
  const [replyingReviewId, setReplyingReviewId] = useState(null)
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  const [activeLightboxImage, setActiveLightboxImage] = useState(null)

  // Quick stats
  const [stats, setStats] = useState({
    pendingCount: 0,
    approvedCount: 0,
    totalCount: 0
  })

  const loadReviews = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          user:users (
            id,
            full_name,
            avatar_url,
            phone,
            email
          ),
          product:products (
            id,
            name,
            image_url,
            slug
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const reviewsList = data || []
      setReviews(reviewsList)

      // Calculate stats
      const pending = reviewsList.filter(r => 
        ((r.image_url && r.image_url !== '') || (r.images && r.images.length > 0)) && 
        r.is_image_approved === false
      ).length

      const approved = reviewsList.filter(r => 
        ((r.image_url && r.image_url !== '') || (r.images && r.images.length > 0)) && 
        r.is_image_approved === true
      ).length

      setStats({
        pendingCount: pending,
        approvedCount: approved,
        totalCount: reviewsList.length
      })
    } catch (err) {
      console.error('Error loading reviews:', err)
      toast.error('Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery])

  // Approve review image
  const handleApproveImage = async (reviewId) => {
    setSubmittingId(reviewId)
    const toastId = toast.loading('Approving review image...')
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ is_image_approved: true })
        .eq('id', reviewId)

      if (error) throw error

      toast.success('Review image approved successfully!', { id: toastId })
      loadReviews()
    } catch (err) {
      console.error('Failed to approve review image:', err)
      toast.error('Approval failed: ' + err.message, { id: toastId })
    } finally {
      setSubmittingId(null)
    }
  }

  // Remove offending image but keep review text
  const handleRemoveImage = async (reviewId) => {
    if (!window.confirm('Are you sure you want to REMOVE the image(s) from this review? The text and rating will remain.')) return
    setSubmittingId(reviewId)
    const toastId = toast.loading('Removing review image...')
    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          image_url: null,
          images: null,
          is_image_approved: null
        })
        .eq('id', reviewId)

      if (error) throw error

      toast.success('Review image removed successfully.', { id: toastId })
      loadReviews()
    } catch (err) {
      console.error('Failed to remove review image:', err)
      toast.error('Failed to remove image: ' + err.message, { id: toastId })
    } finally {
      setSubmittingId(null)
    }
  }

  // Delete entire review row
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to DELETE this entire review? This action cannot be undone.')) return
    setSubmittingId(reviewId)
    const toastId = toast.loading('Deleting review...')
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)

      if (error) throw error

      toast.success('Review deleted successfully.', { id: toastId })
      loadReviews()
    } catch (err) {
      console.error('Failed to delete review:', err)
      toast.error('Delete failed: ' + err.message, { id: toastId })
    } finally {
      setSubmittingId(null)
    }
  }

  // Submit Official Reply
  const handleSendReply = async (reviewId) => {
    if (!replyText.trim()) return
    setIsSubmittingReply(true)
    const toastId = toast.loading('Posting official reply...')
    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          reply_text: replyText.trim(),
          replied_at: new Date().toISOString()
        })
        .eq('id', reviewId)

      if (error) throw error

      toast.success('Reply posted successfully!', { id: toastId })
      setReplyText('')
      setReplyingReviewId(null)
      loadReviews()
    } catch (err) {
      console.error('Failed to post reply:', err)
      toast.error('Failed to post reply: ' + err.message, { id: toastId })
    } finally {
      setIsSubmittingReply(false)
    }
  }

  // Filter reviews based on active tab and search query
  const getFilteredReviews = () => {
    return reviews.filter(r => {
      const matchesSearch = 
        r.review_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      if (activeTab === 'pending') {
        const hasImg = (r.image_url && r.image_url !== '') || (r.images && r.images.length > 0)
        return hasImg && r.is_image_approved === false
      }
      
      if (activeTab === 'approved') {
        const hasImg = (r.image_url && r.image_url !== '') || (r.images && r.images.length > 0)
        return hasImg && r.is_image_approved === true
      }

      // 'all' tab shows everything
      return true
    })
  }

  const filteredReviews = getFilteredReviews()
  const totalPages = Math.ceil(filteredReviews.length / pageSize)
  const paginatedReviews = filteredReviews.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium">
        <div>
          <h1 className="text-3xl font-black text-gradient">Review Moderation</h1>
          <p className="text-sm text-ozo-gray mt-1">Review user uploaded photos to block inappropriate or offensive content.</p>
        </div>
        <button
          onClick={loadReviews}
          className="p-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-2xl border border-gray-200 dark:border-white/10 transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Reload Reviews
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Pending Review Images</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-amber-600">{stats.pendingCount}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Approved Images</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-emerald-600">{stats.approvedCount}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Total Review Submissions</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600">
              <Star className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-blue-600">{stats.totalCount}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between p-4 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
        <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl w-full lg:w-auto overflow-x-auto whitespace-nowrap bg-gray-100 dark:bg-zinc-800">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-[#161622] text-[#FF3366] shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Pending Approval ({stats.pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'approved'
                ? 'bg-white dark:bg-[#161622] text-[#FF3366] shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Approved Images ({stats.approvedCount})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'all'
                ? 'bg-white dark:bg-[#161622] text-[#FF3366] shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All Reviews ({stats.totalCount})
          </button>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search reviews, users, or products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-ozo-red"
          />
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5">
            <Loader2 className="w-10 h-10 animate-spin text-ozo-red" />
            <p className="text-sm font-semibold text-gray-500">Loading reviews database...</p>
          </div>
        ) : paginatedReviews.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-500">No reviews found matching this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence mode="popLayout">
              {paginatedReviews.map((review) => {
                const hasImages = (review.image_url && review.image_url !== '') || (review.images && review.images.length > 0)
                const reviewImages = review.images || (review.image_url ? [review.image_url] : [])

                return (
                  <motion.div
                    key={review.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm space-y-4"
                  >
                    {/* Header: User & Product */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-50 dark:border-white/5 pb-4">
                      {/* User Info */}
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          profile={review.user}
                          className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200 dark:border-white/10"
                        />
                        <div>
                          <h4 className="font-bold text-sm text-gray-905 dark:text-white">
                            {review.user?.full_name || 'Ozo Customer'}
                          </h4>
                          <p className="text-[10px] text-gray-400">
                            {review.user?.phone && review.user?.email 
                              ? `${review.user.phone} • ${review.user.email}` 
                              : (review.user?.phone || review.user?.email || 'No contact details')}
                          </p>
                        </div>
                      </div>

                      {/* Product details */}
                      <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 p-2 rounded-2xl max-w-xs">
                        <OptimizedImage
                          src={review.product?.image_url}
                          alt={review.product?.name}
                          width={60}
                          className="w-10 h-10 object-cover rounded-xl border border-gray-200 dark:border-white/5"
                        />
                        <div className="min-w-0">
                          <h5 className="font-bold text-xs text-gray-800 dark:text-white truncate">
                            {review.product?.name || 'Deleted Product'}
                          </h5>
                          <span className="text-[9px] text-gray-400 font-medium">Rating: {review.rating} ⭐</span>
                        </div>
                      </div>
                    </div>

                    {/* Body: Ratings, Text & Images */}
                    <div className="space-y-3">
                      {/* Stars */}
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 dark:text-gray-700'}
                          />
                        ))}
                        {review.is_verified && (
                          <span className="ml-2 bg-green-500/10 text-green-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-green-500/20 flex items-center gap-0.5">
                            Verified Purchase
                          </span>
                        )}
                      </div>

                      {/* Review Text */}
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 leading-relaxed">
                        {review.review_text}
                      </p>

                      {/* Review Images */}
                      {hasImages && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Uploaded Media:</span>
                            {review.is_image_approved === false && (
                              <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                Pending Moderation
                              </span>
                            )}
                            {review.is_image_approved === true && (
                              <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                Approved
                              </span>
                            )}
                          </div>
                          <div className="flex gap-3 flex-wrap">
                            {reviewImages.map((url, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setActiveLightboxImage(url)}
                                className="relative group block w-24 h-24 rounded-2xl overflow-hidden border border-gray-150 dark:border-white/5 hover:border-ozo-red transition-all cursor-zoom-in shadow-sm"
                              >
                                <OptimizedImage
                                  src={url}
                                  alt="Moderation preview"
                                  width={200}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye size={18} className="text-white" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Official replies thread */}
                    {review.reply_text && (
                      <div className="p-3.5 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-2xl flex gap-2 items-start">
                        <CornerDownRight size={16} className="text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-red-600 dark:text-red-400">Official Reply</span>
                            <span className="text-[9px] text-gray-400">
                              {new Date(review.replied_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">
                            {review.reply_text}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Footer / Moderation Actions */}
                    <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t border-gray-50 dark:border-white/5">
                      <div className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                        <Clock size={12} />
                        Submitted on {new Date(review.created_at).toLocaleString()}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Reply Action */}
                        <button
                          onClick={() => setReplyingReviewId(replyingReviewId === review.id ? null : review.id)}
                          className="px-3.5 py-2 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all border border-gray-200 dark:border-white/10 flex items-center gap-1.5"
                        >
                          <MessageSquare size={13} />
                          {review.reply_text ? 'Edit Reply' : 'Reply'}
                        </button>

                        {/* Approve Image (Visible if image is uploaded and not approved) */}
                        {hasImages && review.is_image_approved !== true && (
                          <button
                            onClick={() => handleApproveImage(review.id)}
                            disabled={submittingId === review.id}
                            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Check size={13} />
                            Approve Image
                          </button>
                        )}

                        {/* Remove Image (Keep text review) */}
                        {hasImages && (
                          <button
                            onClick={() => handleRemoveImage(review.id)}
                            disabled={submittingId === review.id}
                            className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/20 text-amber-600 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <ImageOff size={13} />
                            Remove Image
                          </button>
                        )}

                        {/* Delete entire review */}
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          disabled={submittingId === review.id}
                          className="px-3.5 py-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-red-500 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Trash2 size={13} />
                          Delete Review
                        </button>
                      </div>
                    </div>

                    {/* Inline Reply Input Box */}
                    {replyingReviewId === review.id && (
                      <div className="pt-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder={`Reply to ${review.user?.full_name || 'customer'}...`}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-905 dark:text-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-ozo-red"
                          />
                          <button
                            onClick={() => handleSendReply(review.id)}
                            disabled={isSubmittingReply || !replyText.trim()}
                            className="px-4 py-2 bg-gradient-ozo text-white rounded-xl text-xs font-black transition-all shadow-ozo flex items-center gap-1 disabled:opacity-50"
                          >
                            <Send size={12} />
                            Send
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                <span className="text-xs text-gray-500 font-bold">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-250 dark:border-white/10 rounded-xl hover:bg-gray-55 dark:hover:bg-white/5 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-250 dark:border-white/10 rounded-xl hover:bg-gray-55 dark:hover:bg-white/5 disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activeLightboxImage && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.85 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveLightboxImage(null)}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] cursor-zoom-out"
            />
            {/* Image Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-4 md:inset-12 z-[10000] flex items-center justify-center pointer-events-none"
            >
              <div className="relative max-w-full max-h-full flex items-center justify-center pointer-events-auto">
                <img
                  src={activeLightboxImage}
                  alt="Review preview full size"
                  className="max-w-full max-h-[85vh] md:max-h-[90vh] rounded-3xl object-contain shadow-2xl border border-white/10"
                />
                {/* Close button */}
                <button
                  onClick={() => setActiveLightboxImage(null)}
                  className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors border border-white/10"
                >
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Reviews
