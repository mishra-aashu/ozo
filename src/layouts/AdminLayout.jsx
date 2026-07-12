import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import OzoLogo from '../components/OzoLogo'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Tag,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Settings,
  Bell,
  Search,
  TrendingUp,
  DollarSign,
  Calendar,
  Sun,
  Moon,
  ClipboardCheck,
  Terminal,
  MessageSquare,
  MapPin,
  Globe,
  Star,
  Bike,
  Database,
  Newspaper,
  Coins,
  Store,
  Smartphone
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useThemeStore } from '../stores/themeStore'
import { useAdminIndicatorStore } from '../stores/adminIndicatorStore'
import toast from 'react-hot-toast'
import UserAvatar from '../components/UserAvatar'
import AdminLockScreen from '../components/AdminLockScreen'
 
const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { user, profile, signOut } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { badges, todayStats, startSubscribing, stopSubscribing, markAsSeen } = useAdminIndicatorStore()
  const navigate = useNavigate()
  const location = useLocation()

  const [isUnlocked, setIsUnlocked] = useState(() => {
    return !!localStorage.getItem('ozo-admin-token')
  })

  useEffect(() => {
    const handleExpired = () => {
      setIsUnlocked(false)
    }
    window.addEventListener('ozo-admin-session-expired', handleExpired)
    return () => window.removeEventListener('ozo-admin-session-expired', handleExpired)
  }, [])

  useEffect(() => {
    const path = location.pathname
    if (path === '/admin/orders') {
      markAsSeen('orders')
    } else if (path === '/admin/users') {
      markAsSeen('users')
    } else if (path === '/admin/requests') {
      markAsSeen('requests')
    } else if (path === '/admin/reviews') {
      markAsSeen('reviews')
    } else if (path === '/admin/messages') {
      markAsSeen('messages')
    }
  }, [location.pathname, markAsSeen])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    startSubscribing()
    return () => stopSubscribing()
  }, [startSubscribing, stopSubscribing])

  const getBadgeCount = (label) => {
    switch (label) {
      case 'Orders':
        return badges.orders
      case 'Users':
        return badges.users
      case 'Requests':
        return badges.requests
      case 'Reviews':
        return badges.reviews
      case 'Support Messages':
        return badges.messages
      default:
        return 0
    }
  }

  const totalAlerts = badges.orders + badges.requests + badges.reviews + badges.messages

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      path: '/admin',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-950/30',
    },
    {
      icon: Package,
      label: 'Products',
      path: '/admin/products',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-950/30',
    },
    {
      icon: Coins,
      label: 'Profit Optimizer',
      path: '/admin/profit-optimizer',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-950/30',
    },
    {
      icon: Tag,
      label: 'Categories',
      path: '/admin/categories',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-950/30',
    },
    {
      icon: MapPin,
      label: 'Cities',
      path: '/admin/cities',
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-100 dark:bg-teal-950/30',
    },
    {
      icon: ShoppingBag,
      label: 'Orders',
      path: '/admin/orders',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-950/30',
    },
    {
      icon: DollarSign,
      label: 'Offers',
      path: '/admin/offers',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-950/30',
    },
    {
      icon: Users,
      label: 'Users',
      path: '/admin/users',
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-100 dark:bg-indigo-950/30',
    },
    {
      icon: ClipboardCheck,
      label: 'Requests',
      path: '/admin/requests',
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-100 dark:bg-pink-950/30',
    },
    {
      icon: Star,
      label: 'Reviews',
      path: '/admin/reviews',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-950/30',
    },
    {
      icon: Newspaper,
      label: 'Blogs',
      path: '/admin/blog',
      color: 'text-sky-605 dark:text-sky-400',
      bgColor: 'bg-sky-100 dark:bg-sky-950/30',
    },
    {
      icon: Terminal,
      label: 'SQL Console',
      path: '/admin/sql',
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-100 dark:bg-rose-950/30',
    },
    {
      icon: Database,
      label: 'Database Backup',
      path: '/admin/backup',
      color: 'text-amber-500 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-950/30',
    },
    {
      icon: MessageSquare,
      label: 'Support Messages',
      path: '/admin/messages',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-950/30',
    },
    {
      icon: Globe,
      label: 'SEO Panel',
      path: '/admin/seo',
      color: 'text-emerald-650 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
    },
    {
      icon: Bike,
      label: 'Rider Settings',
      path: '/admin/riders',
      color: 'text-emerald-500 dark:text-blue-500',
      bgColor: 'bg-emerald-100 dark:bg-emerald-950/30',
    },
    {
      icon: Store,
      label: 'Mart Settings',
      path: '/admin/marts',
      color: 'text-rose-500 dark:text-[#FF4A70]',
      bgColor: 'bg-rose-100 dark:bg-rose-950/30',
    },
    {
      icon: DollarSign,
      label: 'Mart Payouts',
      path: '/admin/marts/payouts',
      color: 'text-amber-500 dark:text-[#FFB800]',
      bgColor: 'bg-amber-100 dark:bg-amber-950/30',
    },
    {
      icon: Smartphone,
      label: 'Capture Sandbox',
      path: '/admin/phone-capture-sandbox',
      color: 'text-[#e11d48] dark:text-rose-400',
      bgColor: 'bg-rose-100/50 dark:bg-rose-950/20',
    },
  ]

  const handleLogout = async () => {
    localStorage.removeItem('ozo-admin-token')
    const result = await signOut()
    if (result.success) {
      navigate('/')
      toast.success('Logged out successfully')
    }
  }

  const sidebarVariants = {
    open: {
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
    closed: {
      x: '-100%',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
  }

  if (!isUnlocked) {
    return <AdminLockScreen onUnlock={() => setIsUnlocked(true)} />
  }

  return (
    <div className="h-screen w-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white flex overflow-hidden transition-colors duration-300 font-sans">
      {/* Overlay for mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        variants={sidebarVariants}
        initial={isMobile ? "closed" : "open"}
        animate={isMobile ? (isSidebarOpen ? 'open' : 'closed') : 'open'}
        className="fixed inset-y-0 left-0 z-50 w-72 h-full bg-white dark:bg-[#0d0d0d] shadow-xl border-r border-transparent dark:border-white/5 lg:static lg:h-full lg:translate-x-0 lg:shadow-lg lg:border-r"
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-4 border-b border-gray-200 dark:border-white/5">
            <div className="flex items-center justify-between">
              <OzoLogo
                size="lg"
                admin={true}
                textClassName="text-xl"
                subText="Management Panel"
                subTextClassName="text-xs text-ozo-gray dark:text-gray-400 font-medium normal-case tracking-normal mt-0.5"
              />
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 lg:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Admin Info */}
          <div className="p-4 border-b border-gray-200 dark:border-white/5">
            <div className="flex items-center gap-3">
              <UserAvatar 
                profile={profile} 
                user={user} 
                className="w-10 h-10 rounded-full overflow-hidden bg-gradient-green text-white font-semibold flex items-center justify-center uppercase"
                imgClassName="w-full h-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">{profile?.full_name || 'Admin'}</p>
                <p className="text-xs text-ozo-gray dark:text-gray-400">Administrator</p>
              </div>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-950/20 text-green-600 dark:text-green-400 text-xs rounded-full flex-shrink-0 font-bold">
                Active
              </span>
            </div>
          </div>

          {/* Scrollable Navigation */}
          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
            <nav className="px-4 py-3 space-y-1">
              {menuItems.map((item) => {
                const count = getBadgeCount(item.label)
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/admin'}
                    className={({ isActive }) =>
                      `group flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-ozo text-white shadow-ozo'
                          : 'hover:bg-gray-100 dark:hover:bg-white/5 text-ozo-gray dark:text-gray-400 font-medium'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-white/20' : item.bgColor}`}>
                          <item.icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : item.color}`} />
                        </div>
                        <span className="font-semibold text-sm">{item.label}</span>
                        
                        {count > 0 && (
                          <motion.span
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`ml-auto flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[10px] font-black rounded-full transition-all duration-200 ${
                              isActive
                                ? 'bg-white text-ozo-red shadow-sm'
                                : 'bg-red-500 text-white animate-pulse shadow-sm shadow-red-500/20'
                            }`}
                          >
                            {count}
                          </motion.span>
                        )}
                        
                        <ChevronRight className={`w-3.5 h-3.5 transition-opacity ${count > 0 ? 'ml-1.5' : 'ml-auto'} opacity-0 group-hover:opacity-100`} />
                      </>
                    )}
                  </NavLink>
                )
              })}
            </nav>
          </div>

          {/* Settings & Logout */}
          <div className="p-4 border-t border-gray-200 dark:border-white/5 space-y-1">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-ozo-gray dark:text-gray-400 transition-all w-full text-left"
            >
              <Home className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-sm">Go to Store</span>
            </button>
            <button
              onClick={() => navigate('/admin/settings')}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-ozo-gray dark:text-gray-400 transition-all w-full text-left"
            >
              <Settings className="w-4.5 h-4.5" />
              <span className="font-semibold text-sm">System Settings</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-ozo-red transition-all w-full text-left"
            >
              <LogOut className="w-4.5 h-4.5" />
              <span className="font-semibold text-sm">Logout</span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white dark:bg-[#0d0d0d] shadow-sm border-b border-gray-200 dark:border-white/5 sticky top-0 z-30 transition-colors duration-300">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 lg:hidden"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Search Bar */}
                <div className="relative hidden sm:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ozo-gray dark:text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="pl-10 pr-4 py-2 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white rounded-xl w-80 focus:outline-none focus:ring-2 focus:ring-ozo-red focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-4">
                {/* Stats Cards */}
                <div className="hidden lg:flex items-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">₹{todayStats.sales.toLocaleString('en-IN')} Sales</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <ShoppingBag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{todayStats.orders} {todayStats.orders === 1 ? 'Order' : 'Orders'}</span>
                  </div>
                </div>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-ozo-gray dark:text-gray-400 transition-all flex items-center justify-center"
                  aria-label="Toggle Theme"
                >
                  <AnimatePresence mode="wait">
                    {theme === 'light' ? (
                      <motion.div
                        key="moon"
                        initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Moon size={20} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="sun"
                        initial={{ opacity: 0, rotate: 90, scale: 0.8 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: -90, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Sun size={20} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>

                {/* Notifications */}
                <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-ozo-gray dark:text-gray-400">
                  <Bell className="w-5 h-5" />
                  {totalAlerts > 0 ? (
                    <span className="absolute -top-1.5 -right-1.5 bg-ozo-red text-white text-[9px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center border-2 border-white dark:border-[#0d0d0d] animate-pulse">
                      {totalAlerts}
                    </span>
                  ) : (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-ozo-red rounded-full animate-pulse" />
                  )}
                </button>

                {/* Profile */}
                <div className="flex items-center gap-3 px-3 py-2 bg-gradient-ozo text-white rounded-lg shadow-sm">
                  <UserAvatar 
                    profile={profile} 
                    user={user} 
                    className="w-8 h-8 rounded-full overflow-hidden bg-white/20 text-white font-bold flex items-center justify-center text-xs uppercase"
                    imgClassName="w-full h-full object-cover"
                  />
                  <span className="text-sm font-medium hidden sm:block">Admin</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto overflow-x-hidden max-w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}

export default AdminLayout