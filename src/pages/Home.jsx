import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, Navigation } from 'swiper/modules'
import {
  Clock,
  TrendingUp,
  Star,
  ChevronRight,
  Sparkles,
  Timer,
  Truck,
  Shield,
  ArrowRight,
  Zap,
  Gift,
} from 'lucide-react'
import { useProductStore } from '../stores/productStore'
import { useCartStore } from '../stores/cartStore'
import { useWishlistStore } from '../stores/wishlistStore'
import ProductCard from '../components/ProductCard'
import CategoryChip from '../components/CategoryChip'
import toast from 'react-hot-toast'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'

const Home = () => {
  const navigate = useNavigate()
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 30, seconds: 45 })

  const {
    categories,
    offers,
    featuredProducts,
    bestsellerProducts,
    fetchFeaturedProducts,
    fetchBestsellerProducts,
  } = useProductStore()

  const { addToCart } = useCartStore()
  const { toggleWishlist } = useWishlistStore()

  useEffect(() => {
    // Fetch products
    fetchFeaturedProducts()
    fetchBestsellerProducts()
  }, [fetchFeaturedProducts, fetchBestsellerProducts])

  // Timer for flash sale
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 }
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 }
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        }
        return prev
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleAddToCart = async (product) => {
    const result = await addToCart(product, 1)
    if (!result.success) {
      toast.error('Please login to add items to cart')
    }
  }

  const features = [
    {
      icon: Timer,
      title: '10 Minutes Delivery',
      description: 'Super fast delivery at your doorstep',
      color: 'text-ozo-red',
      bgColor: 'bg-red-50',
    },
    {
      icon: Truck,
      title: 'Free Delivery',
      description: 'On orders above ₹199',
      color: 'text-ozo-green',
      bgColor: 'bg-green-50',
    },
    {
      icon: Shield,
      title: 'Safe & Secure',
      description: '100% secure payments',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Gift,
      title: 'Exciting Offers',
      description: 'Best deals and discounts',
      color: 'text-ozo-yellow',
      bgColor: 'bg-yellow-50',
    },
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section with Offers Carousel */}
      <section className="bg-gradient-hero">
        <div className="container-custom py-6">
          <Swiper
            spaceBetween={20}
            slidesPerView={1}
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
            }}
            pagination={{
              clickable: true,
              dynamicBullets: true,
            }}
            navigation={true}
            modules={[Autoplay, Pagination, Navigation]}
            className="rounded-2xl overflow-hidden h-48 md:h-80"
          >
            {offers.map((offer) => (
              <SwiperSlide key={offer.id}>
                <div className="relative w-full h-full">
                  <img
                    src={offer.image_url}
                    alt={offer.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center p-6 md:p-10">
                    <div className="text-white">
                      <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl md:text-4xl font-bold mb-2"
                      >
                        {offer.title}
                      </motion.h1>
                      <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-sm md:text-lg mb-4"
                      >
                        {offer.description}
                      </motion.p>
                      {offer.coupon_code && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-lg"
                        >
                          <span className="text-sm">Use code:</span>
                          <span className="font-bold">{offer.coupon_code}</span>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-8 bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center text-center p-4"
              >
                <div className={`p-3 rounded-full ${feature.bgColor} mb-3`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                <p className="text-xs text-ozo-gray">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-8 bg-ozo-gray-bg">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold">Shop by Category</h2>
            <Link
              to="/categories"
              className="flex items-center gap-1 text-ozo-red font-semibold hover:underline"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-4 pb-2">
              {categories.slice(0, 10).map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <CategoryChip
                    category={category}
                    onClick={() => navigate(`/category/${category.slug}`)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Flash Sale Section */}
      <section className="py-8 bg-gradient-ozo text-white">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 animate-pulse" />
              <h2 className="text-xl md:text-2xl font-bold">Flash Sale</h2>
              <div className="flex items-center gap-2 ml-4">
                <span className="px-2 py-1 bg-white/20 rounded-lg font-bold">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span>:</span>
                <span className="px-2 py-1 bg-white/20 rounded-lg font-bold">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span>:</span>
                <span className="px-2 py-1 bg-white/20 rounded-lg font-bold">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
            </div>
            <Link
              to="/products?filter=sale"
              className="flex items-center gap-1 text-white font-semibold hover:underline"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="section bg-white">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-ozo-yellow" />
              <h2 className="text-xl md:text-2xl font-bold">Featured Products</h2>
            </div>
            <Link
              to="/products?filter=featured"
              className="flex items-center gap-1 text-ozo-red font-semibold hover:underline"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {featuredProducts.slice(0, 10).map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ProductCard
                  product={product}
                  onAddToCart={() => handleAddToCart(product)}
                  onToggleWishlist={() => toggleWishlist(product)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bestsellers Section */}
      <section className="section bg-ozo-gray-bg">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-ozo-green" />
              <h2 className="text-xl md:text-2xl font-bold">Bestsellers</h2>
            </div>
            <Link
              to="/products?filter=bestseller"
              className="flex items-center gap-1 text-ozo-red font-semibold hover:underline"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {bestsellerProducts.slice(0, 10).map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ProductCard
                  product={product}
                  onAddToCart={() => handleAddToCart(product)}
                  onToggleWishlist={() => toggleWishlist(product)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Download App CTA */}
      <section className="py-12 bg-gradient-mixed text-white">
        <div className="container-custom">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Get the OZO App
            </h2>
            <p className="text-lg mb-6 opacity-90">
              Download now and get ₹100 OFF on your first order!
            </p>
            <div className="flex items-center justify-center gap-4">
              <button className="px-6 py-3 bg-white text-ozo-dark rounded-xl font-semibold hover:bg-gray-100 transition-colors">
                📱 Download Now
              </button>
              <button className="px-6 py-3 bg-white/20 backdrop-blur text-white rounded-xl font-semibold hover:bg-white/30 transition-colors">
                Learn More <ArrowRight className="inline w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home