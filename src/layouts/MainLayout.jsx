import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import BottomNav from '../components/BottomNav'
import { useAuthStore } from '../stores/authStore'
import { useCartStore } from '../stores/cartStore'
import { useWishlistStore } from '../stores/wishlistStore'
import { useProductStore } from '../stores/productStore'
import { useLocationStore } from '../stores/locationStore'

const MainLayout = () => {
  const { user } = useAuthStore()
  const { fetchWishlist } = useWishlistStore()
  const { fetchCategories, fetchOffers } = useProductStore()
  const { coordinates, detectLocation, fetchActiveCities } = useLocationStore()
  const location = useLocation()

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    // Fetch active cities on layout load
    fetchActiveCities().catch(console.error)
  }, [fetchActiveCities])

  useEffect(() => {
    let checkInterval
    
    const triggerDetectLocation = () => {
      if (location.pathname.startsWith('/admin') || coordinates) {
        clearInterval(checkInterval)
        return
      }

      // Wait for notification permission flow to be resolved/dismissed first
      const isNotificationFlowDone = !user || 
        (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'default') || 
        sessionStorage.getItem('ozo_notification_prompt_dismissed') === 'true'

      if (isNotificationFlowDone) {
        detectLocation(false, true)
        clearInterval(checkInterval)
      }
    }

    triggerDetectLocation()

    if (!coordinates && !location.pathname.startsWith('/admin')) {
      checkInterval = setInterval(triggerDetectLocation, 1500)
    }

    return () => clearInterval(checkInterval)
  }, [location.pathname, coordinates, detectLocation, user])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isSelectLocation = location.pathname === '/select-location'
  const isAuthPage = location.pathname === '/auth'
  const isCategoryPage = location.pathname.startsWith('/category/')
  const isProductsPage = location.pathname === '/products'
  const isSearchPage = location.pathname === '/search'
  
  const hideHeader = isSelectLocation || isAuthPage || isCategoryPage || (isSearchPage && isMobile)
  const hideHeaderFooter = isSelectLocation || isAuthPage
  const hideFooter = isSelectLocation || isAuthPage || isProductsPage || isCategoryPage

  useEffect(() => {
    if (hideHeader) {
      document.documentElement.style.setProperty('--header-height', '0px')
    }
  }, [hideHeader])

  useEffect(() => {
    // Fetch initial data
    fetchCategories()
    fetchOffers()
  }, [fetchCategories, fetchOffers])

  useEffect(() => {
    // Fetch user-specific data when logged in
    if (user) {
      fetchWishlist()
    }
  }, [user, fetchWishlist])

  return (
    <div className="min-h-screen bg-ozo-gray-bg dark:bg-[#0a0a0a] flex flex-col transition-colors duration-300 w-full max-w-full overflow-x-clip">
      {/* Header - Hidden on select location, auth, and category to avoid double headers or distraction */}
      {!hideHeader && <Header />}

      {/* Main Content */}
      <main className={`flex-1 ${hideHeaderFooter || isCategoryPage ? '' : 'pb-28 md:pb-8'} w-full max-w-full overflow-x-clip relative`}>
        <Outlet />
      </main>
      
      {/* Footer (Desktop/Tablet) */}
      {!hideFooter && <Footer />}

      {/* Bottom Navigation (Mobile Only) */}
      {!hideHeaderFooter && <BottomNav />}
    </div>
  )
}

export default MainLayout