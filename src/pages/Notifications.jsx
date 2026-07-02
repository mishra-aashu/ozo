import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  Package, 
  Tag, 
  Info, 
  Trash2, 
  Clock,
  ChevronRight,
  ArrowLeft,
  MessageSquare
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLanguageStore } from '../stores/languageStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useOzoQuery } from '../hooks/useOzoQuery'
import OzoLoadingGuard from '../components/OzoLoadingGuard'

const Notifications = () => {
  const { t } = useLanguageStore()
  const navigate = useNavigate()
  
  const {
    notifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
  } = useNotificationStore()

  const { isLoading: isNotificationsLoading } = useOzoQuery(
    async () => {
      await fetchNotifications()
    },
    [fetchNotifications]
  )

  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.is_read).length
    if (unreadCount > 0) {
      markAllAsRead(true)
    }
  }, [notifications, markAllAsRead])

  const formatTimeAgo = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now - date) / 1000)
    
    if (seconds < 60) return 'Just now'
    
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    
    const days = Math.floor(hours / 24)
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const getTypeStyles = (type) => {
    switch (type) {
      case 'order': return 'bg-green-50 dark:bg-ozo-green/10 text-ozo-green'
      case 'promo': return 'bg-red-50 dark:bg-ozo-red/10 text-ozo-red'
      case 'info': return 'bg-blue-50 dark:bg-blue-500/10 text-blue-500'
      case 'review_reply': return 'bg-rose-50 dark:bg-rose-500/10 text-rose-500'
      default: return 'bg-gray-50 dark:bg-white/5 text-gray-500'
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'order': return <Package size={18} />
      case 'promo': return <Tag size={18} />
      case 'info': return <Info size={18} />
      case 'review_reply': return <MessageSquare size={18} />
      default: return <Bell size={18} />
    }
  }

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id)
    if (notif.type === 'review_reply' && notif.data?.product_id) {
      navigate(`/product/${notif.data.product_id}`)
    } else if (notif.data?.order_id) {
      navigate(`/order/${notif.data.order_id}`)
    } else if (notif.type === 'promo' || notif.type === 'offer') {
      navigate('/offers')
    }
  }

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
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300">
      {/* Header */}
      <div className="page-header-sticky">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
               </button>
               <div>
                  <h1 className="text-3xl font-black text-gray-900 dark:text-white font-display flex items-center gap-3">
                    {renderTitle(t?.('notifications') || 'Notifications')}
                    <span className="text-xs font-black bg-ozo-red text-white px-2 py-0.5 rounded-full">
                      {notifications.filter(n => !n.is_read).length}
                    </span>
                  </h1>
                  <p className="text-ozo-gray dark:text-gray-400 font-medium">Stay updated with your orders and offers</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
              {notifications.length > 0 && (
                <>
                  <button 
                    onClick={markAllAsRead}
                    className="text-sm font-black text-ozo-red hover:underline"
                  >
                    Mark all as read
                  </button>
                  <button 
                    onClick={clearAllNotifications}
                    className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl text-ozo-gray hover:text-ozo-red transition-colors"
                    title="Delete all notifications"
                  >
                    <Trash2 size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-12">
        <div className="max-w-3xl mx-auto space-y-4">
            <OzoLoadingGuard
              isLoading={isNotificationsLoading}
              isEmpty={notifications.length === 0}
              skeleton={
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-4 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/5 rounded-2xl animate-pulse flex gap-4">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-white/10 rounded-xl flex-shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/4" />
                        <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              }
              fallback={
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center text-gray-400 mb-6">
                     <Bell size={40} />
                  </div>
                  <h3 className="text-2xl font-black mb-2">All caught up!</h3>
                  <p className="text-ozo-gray">You don't have any new notifications at the moment.</p>
                </div>
              }
            >
              <AnimatePresence mode="popLayout">
                {notifications.map((notif, index) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleNotificationClick(notif)}
                    className={`relative p-4 rounded-2xl shadow-sm border transition-shadow transition-colors duration-300 cursor-pointer group hover:shadow-md 
                      ${!notif.is_read 
                        ? 'bg-red-50/20 dark:bg-[#201516] border-y-red-100/50 border-r-red-100/50 border-l-[4px] border-l-ozo-red dark:border-y-ozo-red/15 dark:border-r-ozo-red/15' 
                        : 'bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-white/5'
                      }`}
                  >
                    <div className="flex gap-4">
                      <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getTypeStyles(notif.type)} group-hover:scale-105 transition-transform`}>
                         {getTypeIcon(notif.type)}
                         {!notif.is_read && (
                           <span className="absolute -top-1 -right-1 w-3 h-3 bg-ozo-red rounded-full border-2 border-white dark:border-[#201516] animate-pulse" />
                         )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                           <div className="flex items-center gap-2">
                             <h4 className="font-black text-sm text-gray-900 dark:text-white">
                               {notif.title}
                             </h4>
                             {!notif.is_read && (
                               <span className="text-[9px] font-extrabold bg-ozo-red/10 text-ozo-red dark:bg-ozo-red/25 dark:text-ozo-red-light px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                 New
                               </span>
                             )}
                           </div>
                           <span className="text-[10px] font-bold text-ozo-gray dark:text-gray-500 flex items-center gap-1">
                              <Clock size={12} />
                              {formatTimeAgo(notif.created_at)}
                           </span>
                        </div>
                        <p className="text-xs text-ozo-gray dark:text-gray-400 font-medium leading-relaxed">{notif.message}</p>
                        
                        <div className="pt-2 flex items-center justify-between">
                           {(notif.data?.order_id || notif.data?.product_id || notif.type === 'promo' || notif.type === 'offer') ? (
                             <button className="text-[11px] font-black text-gray-900 dark:text-white flex items-center gap-0.5 hover:text-ozo-red transition-colors">
                                View Details <ChevronRight size={14} />
                             </button>
                           ) : (
                             <span />
                           )}
                           <button 
                            onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                            className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-2 text-ozo-gray hover:text-red-500 transition-all"
                            title="Delete notification"
                           >
                              <Trash2 size={14} />
                           </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </OzoLoadingGuard>
        </div>
      </div>
    </div>
  )
}

export default Notifications
