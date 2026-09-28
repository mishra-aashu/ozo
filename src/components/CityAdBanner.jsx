import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Megaphone, MapPin } from 'lucide-react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination } from 'swiper/modules'
import { supabase } from '../lib/supabase'
import { useLocationStore } from '../stores/locationStore'

import 'swiper/css'
import 'swiper/css/pagination'

export default function CityAdBanner() {
  const navigate = useNavigate()
  const selectedCitySlug = useLocationStore(state => state.selectedCitySlug)
  const browsingCitySlug = useLocationStore(state => state.browsingCitySlug)
  const activeCities = useLocationStore(state => state.activeCities)

  const currentCitySlug = selectedCitySlug || browsingCitySlug || (activeCities?.[0]?.slug)

  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchCityAds = async () => {
      try {
        setLoading(true)

        // Query active ads for 'all' OR matching city_slug
        const { data, error } = await supabase
          .from('city_ads')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false })

        if (error) throw error

        if (isMounted && data) {
          // Filter in memory for matching city_slug or 'all'
          const matching = data.filter(ad => {
            if (!ad.city_slug || ad.city_slug === 'all') return true
            if (currentCitySlug && ad.city_slug.toLowerCase() === currentCitySlug.toLowerCase()) return true
            return false
          })
          setAds(matching)
        }
      } catch (err) {
        console.error('[CityAdBanner] Error loading city ads:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchCityAds()

    return () => {
      isMounted = false
    }
  }, [currentCitySlug])

  if (loading || !ads || ads.length === 0) {
    return null
  }

  const handleAdClick = (ad) => {
    if (!ad.target_link) return
    const link = ad.target_link.trim()

    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank', 'noopener,noreferrer')
    } else {
      navigate(link)
    }
  }

  return (
    <div className="container-custom py-2 md:py-4">
      {ads.length === 1 ? (
        // Single Ad Card
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          onClick={() => handleAdClick(ads[0])}
          className={`relative w-full rounded-2xl md:rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group border border-gray-150 dark:border-white/10 ${
            ads[0].target_link ? 'cursor-pointer' : ''
          }`}
        >
          {/* Banner Aspect Ratio Container */}
          <div className="relative w-full h-[140px] sm:h-[180px] md:h-[220px] bg-zinc-900 overflow-hidden">
            <img
              src={ads[0].image_url}
              alt={ads[0].title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

            {/* Banner Text Content */}
            <div className="absolute inset-0 p-4 sm:p-6 md:p-8 flex flex-col justify-center items-start max-w-xl z-10 text-white">
              {ads[0].badge_text && (
                <div className="inline-flex items-center gap-1.5 bg-amber-500/90 text-black text-[9px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm mb-2 backdrop-blur-xs">
                  <Sparkles size={12} />
                  <span>{ads[0].badge_text}</span>
                </div>
              )}

              <h3 className="text-base sm:text-2xl md:text-3xl font-black uppercase tracking-tight leading-tight line-clamp-2 drop-shadow-md">
                {ads[0].title}
              </h3>

              {ads[0].subtitle && (
                <p className="text-xs sm:text-sm text-white/90 font-medium line-clamp-1 mt-1 drop-shadow-sm">
                  {ads[0].subtitle}
                </p>
              )}

              {ads[0].target_link && (
                <div className="mt-3 inline-flex items-center gap-2 bg-white text-gray-950 font-black text-xs sm:text-sm px-4 py-2 rounded-xl shadow-md group-hover:bg-ozo-red group-hover:text-white transition-all transform group-hover:translate-x-1">
                  <span>Explore Now</span>
                  <ArrowRight size={14} />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        // Multiple Ads Carousel (Swiper)
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden shadow-md border border-gray-150 dark:border-white/10"
        >
          <Swiper
            modules={[Autoplay, Pagination]}
            spaceBetween={15}
            slidesPerView={1}
            autoplay={{ delay: 4500, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            className="w-full h-[140px] sm:h-[180px] md:h-[220px] rounded-2xl md:rounded-3xl overflow-hidden"
          >
            {ads.map(ad => (
              <SwiperSlide key={ad.id}>
                <div
                  onClick={() => handleAdClick(ad)}
                  className={`relative w-full h-full bg-zinc-900 overflow-hidden group ${
                    ad.target_link ? 'cursor-pointer' : ''
                  }`}
                >
                  <img
                    src={ad.image_url}
                    alt={ad.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

                  <div className="absolute inset-0 p-4 sm:p-6 md:p-8 flex flex-col justify-center items-start max-w-xl z-10 text-white">
                    {ad.badge_text && (
                      <div className="inline-flex items-center gap-1.5 bg-amber-500/90 text-black text-[9px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm mb-2 backdrop-blur-xs">
                        <Sparkles size={12} />
                        <span>{ad.badge_text}</span>
                      </div>
                    )}

                    <h3 className="text-base sm:text-2xl md:text-3xl font-black uppercase tracking-tight leading-tight line-clamp-2 drop-shadow-md">
                      {ad.title}
                    </h3>

                    {ad.subtitle && (
                      <p className="text-xs sm:text-sm text-white/90 font-medium line-clamp-1 mt-1 drop-shadow-sm">
                        {ad.subtitle}
                      </p>
                    )}

                    {ad.target_link && (
                      <div className="mt-3 inline-flex items-center gap-2 bg-white text-gray-950 font-black text-xs sm:text-sm px-4 py-2 rounded-xl shadow-md group-hover:bg-ozo-red group-hover:text-white transition-all transform group-hover:translate-x-1">
                        <span>Explore Now</span>
                        <ArrowRight size={14} />
                      </div>
                    )}
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </motion.div>
      )}
    </div>
  )
}
