import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import { useAuthStore } from '../stores/authStore'
import { useCartStore } from '../stores/cartStore'
import { useWishlistStore } from '../stores/wishlistStore'
import { useProductStore } from '../stores/productStore'

const MainLayout = () => {
  const { user } = useAuthStore()
  const { fetchCart } = useCartStore()
  const { fetchWishlist } = useWishlistStore()
  const { fetchCategories, fetchOffers } = useProductStore()

  useEffect(() => {
    // Fetch initial data
    fetchCategories()
    fetchOffers()
  }, [fetchCategories, fetchOffers])

  useEffect(() => {
    // Fetch user-specific data when logged in
    if (user) {
      fetchCart()
      fetchWishlist()
    }
  }, [user, fetchCart, fetchWishlist])

  return (
    <div className="min-h-screen bg-ozo-gray-bg flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-8">
        <Outlet />
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <BottomNav />
    </div>
  )
}

export default MainLayout