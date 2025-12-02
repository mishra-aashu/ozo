import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  MapPin,
  User,
  ShoppingCart,
  Heart,
  Menu,
  X,
  ChevronDown,
  Clock,
  Package,
  LogOut,
  Settings,
  Bell,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useCartStore } from '../stores/cartStore'
import { useWishlistStore } from '../stores/wishlistStore'
import { useProductStore } from '../stores/productStore'
import toast from 'react-hot-toast'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()

  const { user, profile, isAuthenticated, signOut } = useAuthStore()
  const { totalItems } = useCartStore()
  const { items: wishlistItems } = useWishlistStore()
  const { searchProducts, searchResults } = useProductStore()

  // Close dropdowns when route changes
  useEffect(() => {
    setIsMenuOpen(false)
    setIsProfileOpen(false)
    setShowSearch(false)
  }, [location])

  // Handle search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        searchProducts(searchQuery)
        setShowSearch(true)
      } else {
        setShowSearch(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, searchProducts])

  const handleLogout = async () => {
    const result = await signOut()
    if (result.success) {
      navigate('/')
    }
  }

  const handleSearchSelect = (product) => {
    setSearchQuery('')
    setShowSearch(false)
    navigate(`/product/${product.slug}`)
  }

  return (
    <>
      {/* Top Bar */}
      <div className="bg-gradient-ozo text-white py-2 hidden md:block">
        <div className="container-custom">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Delivery in 10 minutes
              </span>
              <span>Free delivery on orders above ₹199</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/offers" className="hover:underline">Offers</Link>
              <Link to="/help" className="hover:underline">Help</Link>
              <span>📞 1800-123-4567</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="header bg-white sticky top-0 z-50">
        <div className="container-custom py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-ozo rounded-xl flex items-center justify-center text-white text-xl md:text-2xl font-bold shadow-ozo">
                🛒
              </div>
              <span className="text-2xl md:text-3xl font-display font-bold text-gradient hidden sm:block">
                OZO
              </span>
            </Link>

            {/* Location Selector */}
            <button className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-ozo-gray-bg transition-colors">
              <MapPin className="w-5 h-5 text-ozo-red" />
              <div className="text-left">
                <p className="text-xs text-ozo-gray">Deliver to</p>
                <p className="text-sm font-semibold flex items-center gap-1">
                  Select Location
                  <ChevronDown className="w-4 h-4" />
                </p>
              </div>
            </button>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ozo-gray" />
                <input
                  type="text"
                  placeholder="Search for 'milk', 'bread', 'eggs'..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-ozo-gray-lighter rounded-xl focus:outline-none focus:ring-2 focus:ring-ozo-red focus:border-transparent transition-all"
                />
              </div>

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {showSearch && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-ozo-gray-lighter max-h-96 overflow-y-auto z-50"
                  >
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleSearchSelect(product)}
                        className="flex items-center gap-3 p-3 hover:bg-ozo-gray-bg transition-colors w-full text-left"
                      >
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-semibold line-clamp-1">{product.name}</p>
                          <p className="text-sm text-ozo-gray">{product.unit}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">₹{product.price}</p>
                          {product.mrp > product.price && (
                            <p className="text-xs text-ozo-gray line-through">₹{product.mrp}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Auth Button/Profile */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl hover:bg-ozo-gray-bg transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-green rounded-full flex items-center justify-center text-white font-semibold">
                      {profile?.full_name?.charAt(0) || 'U'}
                    </div>
                    <span className="hidden md:block text-sm font-semibold">
                      {profile?.full_name?.split(' ')[0] || 'User'}
                    </span>
                    <ChevronDown className="w-4 h-4 hidden md:block" />
                  </button>

                  {/* Profile Dropdown */}
                  <AnimatePresence>
                    {isProfileOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-ozo-gray-lighter overflow-hidden z-50"
                      >
                        <div className="p-4 border-b border-ozo-gray-lighter">
                          <p className="font-semibold">{profile?.full_name}</p>
                          <p className="text-sm text-ozo-gray">{user?.email}</p>
                        </div>
                        <div className="py-2">
                          <Link
                            to="/profile"
                            className="flex items-center gap-3 px-4 py-2 hover:bg-ozo-gray-bg transition-colors"
                          >
                            <User className="w-4 h-4 text-ozo-gray" />
                            <span>My Profile</span>
                          </Link>
                          <Link
                            to="/orders"
                            className="flex items-center gap-3 px-4 py-2 hover:bg-ozo-gray-bg transition-colors"
                          >
                            <Package className="w-4 h-4 text-ozo-gray" />
                            <span>My Orders</span>
                          </Link>
                          <Link
                            to="/wishlist"
                            className="flex items-center gap-3 px-4 py-2 hover:bg-ozo-gray-bg transition-colors"
                          >
                            <Heart className="w-4 h-4 text-ozo-gray" />
                            <span>Wishlist</span>
                          </Link>
                          <Link
                            to="/notifications"
                            className="flex items-center gap-3 px-4 py-2 hover:bg-ozo-gray-bg transition-colors"
                          >
                            <Bell className="w-4 h-4 text-ozo-gray" />
                            <span>Notifications</span>
                          </Link>
                          <Link
                            to="/settings"
                            className="flex items-center gap-3 px-4 py-2 hover:bg-ozo-gray-bg transition-colors"
                          >
                            <Settings className="w-4 h-4 text-ozo-gray" />
                            <span>Settings</span>
                          </Link>
                          <hr className="my-2 border-ozo-gray-lighter" />
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-red-50 text-ozo-red transition-colors w-full"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Logout</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-ozo text-white rounded-xl hover:shadow-ozo-lg transition-all"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden md:block font-semibold">Login</span>
                </Link>
              )}

              {/* Wishlist */}
              <Link
                to="/wishlist"
                className="relative p-2 rounded-xl hover:bg-ozo-gray-bg transition-colors"
              >
                <Heart className="w-6 h-6 text-ozo-gray" />
                {wishlistItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-ozo-red text-white text-xs rounded-full flex items-center justify-center font-semibold">
                    {wishlistItems.length}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                to="/cart"
                className="relative p-2 rounded-xl hover:bg-ozo-gray-bg transition-colors"
              >
                <ShoppingCart className="w-6 h-6 text-ozo-gray" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-ozo-green text-white text-xs rounded-full flex items-center justify-center font-semibold">
                    {totalItems}
                  </span>
                )}
              </Link>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-xl hover:bg-ozo-gray-bg transition-colors md:hidden"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}

export default Header