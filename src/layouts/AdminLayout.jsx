import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
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
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      path: '/admin',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      icon: Package,
      label: 'Products',
      path: '/admin/products',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      icon: Tag,
      label: 'Categories',
      path: '/admin/categories',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      icon: ShoppingBag,
      label: 'Orders',
      path: '/admin/orders',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      icon: DollarSign,
      label: 'Offers',
      path: '/admin/offers',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      icon: Users,
      label: 'Users',
      path: '/admin/users',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
  ]

  const handleLogout = async () => {
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

  return (
    <div className="min-h-screen bg-gray-50 flex">
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
        initial="closed"
        animate={isSidebarOpen ? 'open' : 'closed'}
        className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl lg:relative lg:translate-x-0 lg:shadow-lg"
        style={{ x: 0 }}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-ozo rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                  🛒
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gradient">OZO Admin</h2>
                  <p className="text-xs text-ozo-gray">Management Panel</p>
                </div>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Admin Info */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-green rounded-full flex items-center justify-center text-white font-semibold">
                {profile?.full_name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{profile?.full_name || 'Admin'}</p>
                <p className="text-xs text-ozo-gray">Administrator</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
                Active
              </span>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/admin'}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-ozo text-white shadow-ozo'
                      : 'hover:bg-gray-100 text-ozo-gray'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : item.bgColor}`}>
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : item.color}`} />
                    </div>
                    <span className="font-medium">{item.label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Settings & Logout */}
          <div className="p-6 border-t border-gray-200 space-y-2">
            <button className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-ozo-gray transition-all w-full">
              <Settings className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-ozo-red transition-all w-full"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Search Bar */}
                <div className="relative hidden sm:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ozo-gray" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl w-80 focus:outline-none focus:ring-2 focus:ring-ozo-red focus:border-transparent"
                  />
                </div>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-4">
                {/* Stats Cards */}
                <div className="hidden lg:flex items-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-600">+23.5%</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-600">Today</span>
                  </div>
                </div>

                {/* Notifications */}
                <button className="relative p-2 rounded-lg hover:bg-gray-100">
                  <Bell className="w-5 h-5 text-ozo-gray" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-ozo-red rounded-full animate-pulse" />
                </button>

                {/* Profile */}
                <div className="flex items-center gap-3 px-3 py-2 bg-gradient-ozo text-white rounded-lg">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="font-bold">👤</span>
                  </div>
                  <span className="text-sm font-medium hidden sm:block">Admin</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto">
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