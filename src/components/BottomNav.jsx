import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Home,
  Search,
  LayoutGrid,
  ShoppingCart,
  User,
} from 'lucide-react'
import { useCartStore } from '../stores/cartStore'
import { useAuthStore } from '../stores/authStore'

const BottomNav = () => {
  const location = useLocation()
  const { totalItems } = useCartStore()
  const { isAuthenticated } = useAuthStore()

  const navItems = [
    {
      icon: Home,
      label: 'Home',
      path: '/',
      color: 'text-ozo-red',
    },
    {
      icon: Search,
      label: 'Search',
      path: '/search',
      color: 'text-ozo-green',
    },
    {
      icon: LayoutGrid,
      label: 'Categories',
      path: '/categories',
      color: 'text-ozo-yellow',
    },
    {
      icon: ShoppingCart,
      label: 'Cart',
      path: '/cart',
      color: 'text-ozo-red',
      badge: totalItems,
    },
    {
      icon: User,
      label: isAuthenticated ? 'Profile' : 'Login',
      path: isAuthenticated ? '/profile' : '/auth',
      color: 'text-ozo-green',
    },
  ]

  // Hide on admin routes
  if (location.pathname.startsWith('/admin')) {
    return null
  }

  return (
    <nav className="bottom-nav md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? 'bottom-nav-item-active' : ''}`
            }
          >
            {({ isActive }) => (
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="relative flex flex-col items-center justify-center"
              >
                {/* Badge */}
                {item.badge > 0 && (
                  <span className="bottom-nav-badge animate-pulse">
                    {item.badge}
                  </span>
                )}

                {/* Icon with animation */}
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.2 : 1,
                    y: isActive ? -2 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  <item.icon
                    className={`w-6 h-6 ${
                      isActive ? item.color : 'text-ozo-gray'
                    }`}
                  />
                </motion.div>

                {/* Label */}
                <span
                  className={`text-xs mt-1 ${
                    isActive ? 'font-semibold' : 'font-normal'
                  }`}
                >
                  {item.label}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -bottom-1 w-1 h-1 bg-ozo-red rounded-full"
                    transition={{ type: 'spring', stiffness: 500 }}
                  />
                )}
              </motion.div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default BottomNav