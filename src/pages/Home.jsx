import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, 
  ShieldCheck, 
  Gift, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Star,
  Clock,
  Truck,
  Plus,
  Minus,
  X,
  Loader2,
  Sparkles,
  Package,
  MapPin,
  Heart,
  Send,
  AlertCircle,
  ShoppingCart,
  Apple,
  Landmark,
  PenTool,
  Bell,
  Check,
  Store,
  Sun
} from 'lucide-react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, Navigation } from 'swiper/modules'
import { useProductStore } from '../stores/productStore'
import { useCartStore } from '../stores/cartStore'
import { useAuthStore } from '../stores/authStore'
import { useLocationStore } from '../stores/locationStore'
import { isProductImageMissing } from '../utils/productUtils'
import { findMatchingActiveCityForDetails } from '../components/LocationPromptModal'
import { useTranslation } from '../hooks/useTranslation'
import ProductCard from '../components/ProductCard'
import TopCategories from '../components/TopCategories'
import OptimizedImage from '../components/OptimizedImage'
import { OzoCategoryGrid, isCategoryListingSoon } from '../components/CategoryChip'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { promptOneSignalPush, oneSignalAddTag } from '../utils/onesignal'
import OzoLoadingGuard from '../components/OzoLoadingGuard'
import useOzoQuery from '../hooks/useOzoQuery'
import ImageUpload from '../components/ImageUpload'
import SEO from '../components/SEO'


// Import Swiper styles
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'

// Stable random shuffle seed generated once per page load
const PAGE_LOAD_SHUFFLE_SEED = Math.random();

// Helper to generate a stable pseudo-random value for a given ID/name and seed
const getSeededRandom = (key, seed) => {
  let h = 0;
  const combined = String(key) + seed;
  for (let i = 0; i < combined.length; i++) {
    h = Math.imul(31, h) + combined.charCodeAt(i) | 0;
  }
  // Standard LCG or simple fractional part of sin for seed generation
  const val = Math.sin(h) * 10000;
  return val - Math.floor(val);
};

// Helper to sort an array pseudo-randomly but stably using a Schwartzian transform
const seededSort = (arr, seed) => {
  if (!arr || arr.length === 0) return [];
  return arr
    .map(item => ({
      item,
      rand: getSeededRandom(item.id || item.name || '', seed)
    }))
    .sort((a, b) => a.rand - b.rand)
    .map(entry => entry.item);
};

// Helper to get exactly one product from each parent category to ensure diversity
const getOnePerCategory = (arr, seed, limit = 4) => {
  if (!arr || arr.length === 0) return [];
  
  const byCategory = {};
  arr.forEach(p => {
    const catKey = p.category?.parent_id || p.category_id || p.category?.id || 'uncategorized';
    if (!byCategory[catKey]) {
      byCategory[catKey] = [];
    }
    byCategory[catKey].push(p);
  });

  const selectedIds = new Set();
  const representativeProducts = [];

  const catKeys = Object.keys(byCategory);
  const seededCatKeys = seededSort(catKeys.map(key => ({ id: key })), seed).map(item => item.id);

  seededCatKeys.forEach(catKey => {
    const prodsInCat = byCategory[catKey];
    const sorted = [...prodsInCat].sort((a, b) => {
      const aOOS = !a.is_available || a.quantity_available === 0;
      const bOOS = !b.is_available || b.quantity_available === 0;
      if (aOOS !== bOOS) {
        return aOOS ? 1 : -1;
      }
      const discountA = a.discount_percentage || 0;
      const discountB = b.discount_percentage || 0;
      if (discountA !== discountB) {
        return discountB - discountA;
      }
      return getSeededRandom(a.id || a.name || '', seed) - getSeededRandom(b.id || b.name || '', seed);
    });

    if (sorted[0]) {
      representativeProducts.push(sorted[0]);
      selectedIds.add(sorted[0].id || sorted[0].name);
    }
  });

  if (representativeProducts.length < limit) {
    const remainingProducts = seededSort(
      arr.filter(p => !selectedIds.has(p.id || p.name)),
      seed
    );
    const sortedRemaining = [...remainingProducts].sort((a, b) => {
      const aOOS = !a.is_available || a.quantity_available === 0;
      const bOOS = !b.is_available || b.quantity_available === 0;
      if (aOOS && !bOOS) return 1;
      if (!aOOS && bOOS) return -1;
      return 0;
    });

    for (const p of sortedRemaining) {
      if (representativeProducts.length >= limit) break;
      representativeProducts.push(p);
      selectedIds.add(p.id || p.name);
    }
  }

  const sortedFinal = [...representativeProducts].sort((a, b) => {
    const aOOS = !a.is_available || a.quantity_available === 0;
    const bOOS = !b.is_available || b.quantity_available === 0;
    if (aOOS && !bOOS) return 1;
    if (!aOOS && bOOS) return -1;
    return 0;
  });

  return sortedFinal.slice(0, limit);
};

// Helper to interleave products of different categories to ensure diversity
const mixCategories = (arr, seed, limit = 12) => {
  if (!arr || arr.length === 0) return [];

  const byCategory = {};
  arr.forEach(p => {
    const catKey = p.category?.parent_id || p.category_id || p.category?.id || 'uncategorized';
    if (!byCategory[catKey]) {
      byCategory[catKey] = [];
    }
    byCategory[catKey].push(p);
  });

  const sortedCategories = {};
  Object.keys(byCategory).forEach(catKey => {
    const prods = byCategory[catKey];
    sortedCategories[catKey] = [...prods].sort((a, b) => {
      const aOOS = !a.is_available || a.quantity_available === 0;
      const bOOS = !b.is_available || b.quantity_available === 0;
      if (aOOS !== bOOS) {
        return aOOS ? 1 : -1;
      }
      const discountA = a.discount_percentage || 0;
      const discountB = b.discount_percentage || 0;
      if (discountA !== discountB) {
        return discountB - discountA;
      }
      return getSeededRandom(a.id || a.name || '', seed) - getSeededRandom(b.id || b.name || '', seed);
    });
  });

  const catKeys = Object.keys(byCategory);
  // Shuffle the category keys using seededSort to make the category order randomized yet stable per seed
  const shuffledCatKeys = seededSort(catKeys.map(key => ({ id: key })), seed).map(item => item.id);

  const mixedList = [];
  const selectedIds = new Set();
  
  let hasMore = true;
  let round = 0;
  while (hasMore && mixedList.length < limit) {
    hasMore = false;
    for (const catKey of shuffledCatKeys) {
      const list = sortedCategories[catKey];
      if (list && list.length > round) {
        const candidate = list[round];
        if (candidate && !selectedIds.has(candidate.id)) {
          mixedList.push(candidate);
          selectedIds.add(candidate.id);
        }
        hasMore = true;
      }
    }
    round++;
  }

  return mixedList;
};



// Helper to render offer/banner title with smart keyword highlights
const renderTitleWithHighlights = (title) => {
  if (!title) return null;
  const words = title.split(' ');
  
  // Keywords to highlight in primary brand color (ozo-red)
  const redHighlightKeywords = [
    'free', 'off', 'flat', 'save', 'deals', 'offers', 'special', 'only',
    'organic', 'dairy', 'munchies', 'snacks', 'drinks', 'juices', 'sweets', 'staples', 'grains', 'fruits', 'vegetables', 'sweet'
  ];

  return words.map((word, i) => {
    // Clean word from punctuation for keyword checking
    const cleanWord = word.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    
    // Check if the word contains numbers or currency symbols (like ₹, %, 100, 20) or matches keywords
    const isNumberOrPercentage = /[\d%₹]/.test(word);
    const shouldHighlight = isNumberOrPercentage || redHighlightKeywords.includes(cleanWord);

    return (
      <span key={i} className={shouldHighlight ? "text-ozo-red" : ""}>
        {word}{' '}
      </span>
    );
  });
};

const MART_COLOR_PRESETS = [
  {
    bg: 'from-rose-500/10 to-orange-500/10 dark:from-rose-500/20 dark:to-orange-500/20',
    border: 'border-rose-500/20',
    icon: 'text-rose-500 dark:text-rose-400'
  },
  {
    bg: 'from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20',
    border: 'border-emerald-500/20',
    icon: 'text-emerald-500 dark:text-emerald-400'
  },
  {
    bg: 'from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20',
    border: 'border-violet-500/20',
    icon: 'text-violet-500 dark:text-violet-400'
  },
  {
    bg: 'from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20',
    border: 'border-blue-500/20',
    icon: 'text-blue-500 dark:text-blue-400'
  },
  {
    bg: 'from-amber-500/10 to-yellow-500/10 dark:from-amber-500/20 dark:to-yellow-500/20',
    border: 'border-amber-500/20',
    icon: 'text-amber-500 dark:text-amber-400'
  },
  {
    bg: 'from-pink-500/10 to-fuchsia-500/10 dark:from-pink-500/20 dark:to-fuchsia-500/20',
    border: 'border-pink-500/20',
    icon: 'text-pink-500 dark:text-pink-400'
  }
]

const fetchAndApplyCityOverrides = async (products, citySlug) => {
  if (!products || products.length === 0) return [];
  if (!citySlug) {
    return products.map(product => {
      const priceVal = parseFloat(product.price);
      const mrpVal = parseFloat(product.mrp);
      return {
        ...product,
        price: priceVal,
        mrp: mrpVal,
        discount_percentage: (mrpVal && mrpVal > priceVal) 
          ? Math.round(((mrpVal - priceVal) / mrpVal) * 100)
          : parseFloat(product.discount_percentage || 0)
      };
    });
  }

  try {
    const productIds = products.map(p => p.id);
    const { data: cityData, error: cityErr } = await supabase
      .from('product_city_availability')
      .select('product_id, city_price, city_mrp, is_available, is_featured, is_upcoming')
      .eq('city_slug', citySlug)
      .in('product_id', productIds);

    if (cityErr) {
      console.warn('[Home] City override query failed:', cityErr);
    }

    const cityMap = new Map((cityData || []).map(row => [row.product_id, row]));
    const launchConfig = useCartStore.getState().launchConfig;
    const launchModeEnabled = !!launchConfig?.launch_mode_enabled;

    return products.map(product => {
      const pca = cityMap.get(product.id);
      
      const isAvailable = pca && pca.is_available !== null && pca.is_available !== undefined
        ? pca.is_available
        : product.is_available;

      const isUpcomingRaw = pca && pca.is_upcoming !== null && pca.is_upcoming !== undefined
        ? pca.is_upcoming
        : (product.is_upcoming || false);

      const isUpcoming = (launchModeEnabled && !isAvailable) ? true : isUpcomingRaw;

      const priceVal = pca?.city_price !== null && pca?.city_price !== undefined
        ? parseFloat(pca.city_price)
        : parseFloat(product.price);
      const mrpVal = pca?.city_mrp !== null && pca?.city_mrp !== undefined
        ? parseFloat(pca.city_mrp)
        : parseFloat(product.mrp);

      return {
        ...product,
        price: priceVal,
        mrp: mrpVal,
        is_available: isAvailable,
        is_upcoming: isUpcoming,
        is_featured: pca && pca.is_featured !== null && pca.is_featured !== undefined
          ? pca.is_featured
          : product.is_featured,
        discount_percentage: (mrpVal && mrpVal > priceVal)
          ? Math.round(((mrpVal - priceVal) / mrpVal) * 100)
          : parseFloat(product.discount_percentage || 0)
      };
    });
  } catch (err) {
    console.error('[Home] Error applying city overrides:', err);
    return products.map(product => ({
      ...product,
      price: parseFloat(product.price),
      mrp: parseFloat(product.mrp)
    }));
  }
};

const Home = () => {
  const [shuffleSeed] = useState(() => Math.random())
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const navigate = useNavigate()
  const { city } = useParams()
  const { t } = useTranslation()
  const selectedCitySlug = useLocationStore(state => state.selectedCitySlug)
  const setSelectedCitySlug = useLocationStore(state => state.setSelectedCitySlug)
  const address = useLocationStore(state => state.address)
  const coordinates = useLocationStore(state => state.coordinates)
  const addressDetails = useLocationStore(state => state.addressDetails)
  const activeCities = useLocationStore(state => state.activeCities)

  const homeSchema = useMemo(() => ({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://ozomart.store/#website",
        "url": "https://ozomart.store/",
        "name": "OZO Mart",
        "alternateName": ["OZO", "Ozo Mart", "OZO Delivery"],
        "description": "Jo Chahiye, Jab Chahiye | Online Grocery, Fresh Fruits, Vegetables & Mithila Specials Delivered in 30 Minutes",
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://ozomart.store/search?q={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": ["OnlineStore", "Organization"],
        "@id": "https://ozomart.store/#organization",
        "name": "OZO Mart",
        "alternateName": ["OZO", "Ozo Mart", "OZO Delivery"],
        "url": "https://ozomart.store",
        "logo": {
          "@type": "ImageObject",
          "url": "https://ozomart.store/images/logo_transparent.png",
          "width": 512,
          "height": 512
        },
        "image": "https://ozomart.store/images/logo_transparent.png",
        "description": "OZO Mart is India's premium 30-minute quick-commerce delivery app for farm-fresh fruits, organic vegetables, daily essentials, and authentic Mithila regional specialties like Makhana and Thekua. Based in Patna and Aurangabad, Bihar, OZO Mart operates independently as an online grocery platform.",
        "priceRange": "₹₹",
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "IN",
          "addressRegion": "Bihar",
          "addressLocality": "Patna, Aurangabad"
        },
        "sameAs": [
          "https://www.facebook.com/ozomart.store",
          "https://twitter.com/ozomart_store",
          "https://www.instagram.com/ozomart.store"
        ]
      },
      {
        "@type": "ItemList",
        "name": "OZO Mart Quick Navigation Links",
        "itemListElement": [
          {
            "@type": "SiteNavigationElement",
            "position": 1,
            "name": "Shop All Products",
            "url": "https://ozomart.store/products"
          },
          {
            "@type": "SiteNavigationElement",
            "position": 2,
            "name": "Browse Categories",
            "url": "https://ozomart.store/categories"
          },
          {
            "@type": "SiteNavigationElement",
            "position": 3,
            "name": "Today's Offers & Deals",
            "url": "https://ozomart.store/offers"
          },
          {
            "@type": "SiteNavigationElement",
            "position": 4,
            "name": "Mithila Specials",
            "url": "https://ozomart.store/category/mithila-specials"
          },
          {
            "@type": "SiteNavigationElement",
            "position": 5,
            "name": "Fresh Vegetables",
            "url": "https://ozomart.store/category/vegetables"
          },
          {
            "@type": "SiteNavigationElement",
            "position": 6,
            "name": "About OZO Mart",
            "url": "https://ozomart.store/about"
          },
          {
            "@type": "SiteNavigationElement",
            "position": 7,
            "name": "Help & Support",
            "url": "https://ozomart.store/help"
          },
          {
            "@type": "SiteNavigationElement",
            "position": 8,
            "name": "Contact Us",
            "url": "https://ozomart.store/contact"
          }
        ]
      }
    ]
  }), []);

  useEffect(() => {
    const checkAndSetCity = async () => {
      if (!activeCities || activeCities.length === 0) return
      
      const isUrlCityValid = activeCities.some(c => c.slug.toLowerCase() === (city || '').toLowerCase())
      
      if (address) {
        const matchedCity = findMatchingActiveCityForDetails(address, coordinates, addressDetails, activeCities)
        if (matchedCity) {
          if (city !== matchedCity.slug) {
            navigate(`/${matchedCity.slug}`, { replace: true })
          }
          if (selectedCitySlug !== matchedCity.slug) {
            setSelectedCitySlug(matchedCity.slug)
          }
        } else {
          if (city) {
            navigate('/', { replace: true })
          }
          if (selectedCitySlug !== null) {
            setSelectedCitySlug(null)
          }
        }
      } else {
        if (city) {
          if (isUrlCityValid) {
            if (selectedCitySlug !== city.toLowerCase()) {
              setSelectedCitySlug(city.toLowerCase())
            }
          } else {
            console.log(`[Router] Invalid city slug in URL: ${city}. Redirecting to /`);
            navigate('/', { replace: true })
          }
        }
      }
    }
    checkAndSetCity()
  }, [city, address, coordinates, addressDetails, activeCities, selectedCitySlug, setSelectedCitySlug, navigate])
  const categories = useProductStore(state => state.categories)
  const offers = useProductStore(state => state.offers)
  const storeFeaturedProducts = useProductStore(state => state.featuredProducts)
  const storeBestsellerProducts = useProductStore(state => state.bestsellerProducts)
  const fetchFeaturedProducts = useProductStore(state => state.fetchFeaturedProducts)
  const fetchBestsellerProducts = useProductStore(state => state.fetchBestsellerProducts)
  const fetchCategories = useProductStore(state => state.fetchCategories)
  const fetchOffers = useProductStore(state => state.fetchOffers)
  const isFeaturedLoading = useProductStore(state => state.isFeaturedLoading)
  const isBestsellersLoading = useProductStore(state => state.isBestsellersLoading)

  const user = useAuthStore(state => state.user)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  const addToCart = useCartStore(state => state.addToCart)
  const updateQuantity = useCartStore(state => state.updateQuantity)
  const getItemQuantity = useCartStore(state => state.getItemQuantity)
  const cartItems = useCartStore(useShallow(state => state.items))
  const deliveryConfig = useCartStore(state => state.deliveryConfig)
  const launchConfig = useCartStore(state => state.launchConfig)

  const featuredProducts = useMemo(() => {
    const isUpcoming = (p) => {
      const isQtyOOS = p.quantity_available !== null && p.quantity_available !== undefined && p.quantity_available === 0;
      const isOOS = !p.is_available || isQtyOOS;
      return (launchConfig?.launch_mode_enabled && isOOS) ? true : (p.is_upcoming || false);
    };
    return (storeFeaturedProducts || []).filter(p => !isUpcoming(p));
  }, [storeFeaturedProducts, launchConfig]);

  const bestsellerProducts = useMemo(() => {
    const isUpcoming = (p) => {
      const isQtyOOS = p.quantity_available !== null && p.quantity_available !== undefined && p.quantity_available === 0;
      const isOOS = !p.is_available || isQtyOOS;
      return (launchConfig?.launch_mode_enabled && isOOS) ? true : (p.is_upcoming || false);
    };
    return (storeBestsellerProducts || []).filter(p => !isUpcoming(p));
  }, [storeBestsellerProducts, launchConfig]);

  const freeAbove = deliveryConfig?.free_above ?? 99

  const [notifiedProducts, setNotifiedProducts] = useState(() => {
    try {
      const keys = Object.keys(localStorage);
      const notified = {};
      keys.forEach(k => {
        if (k.startsWith('notify_prod_')) {
          const id = k.replace('notify_prod_', '');
          if (localStorage.getItem(k) === 'true') {
            notified[id] = true;
          }
        }
      });
      return notified;
    } catch {
      return {};
    }
  });

  const handleNotifyMe = useCallback(async (product, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const permission = await promptOneSignalPush();
      if (permission === 'granted') {
        localStorage.setItem(`notify_prod_${product.id}`, 'true');
        setNotifiedProducts(prev => ({ ...prev, [product.id]: true }));
        await oneSignalAddTag(`notify_prod_${product.id}`, 'true');

        toast.success(`We will notify you when ${product.name} is back in stock!`, {
          icon: '🔔',
          style: {
            borderRadius: '16px',
            background: '#333',
            color: '#fff',
          }
        });
      }
    } catch (err) {
      console.error('[OneSignal] Notification request failed:', err);
    }
  }, []);


  const [isReorderingId, setIsReorderingId] = useState(null)
  const [selectedFeaturedCategory, setSelectedFeaturedCategory] = useState('all')
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [categoryProducts, setCategoryProducts] = useState([])
  const [isCategoryProductsLoading, setIsCategoryProductsLoading] = useState(false)
  const mandiScrollRef = useRef(null)
  const summerScrollRef = useRef(null)

  useEffect(() => {
    if (selectedFeaturedCategory === 'all') {
      setCategoryProducts([]);
      return;
    }

    let isMounted = true;
    const loadCategoryProducts = async () => {
      try {
        setIsCategoryProductsLoading(true);
        
        // 1. Get all child category IDs (subcategories) for this category ID
        const { data: subcategories, error: subError } = await supabase
          .from('categories')
          .select('id')
          .eq('parent_id', selectedFeaturedCategory)
          .eq('is_active', true);

        if (subError) throw subError;

        let categoryIds = [selectedFeaturedCategory];
        if (subcategories && subcategories.length > 0) {
          categoryIds = [...categoryIds, ...subcategories.map(s => s.id)];
        }

        // 2. Fetch products in those categories
        const citySlug = useLocationStore.getState().selectedCitySlug;
        const productsQuery = supabase
          .from('products')
          .select(`
            *,
            category:categories (
              id,
              name,
              slug,
              parent_id,
              is_active
            )
          `);

        const { data: rawProducts, error: prodError } = await productsQuery
          .in('category_id', categoryIds)
          .limit(15); // Show top 15 products

        if (prodError) throw prodError;

        const products = await fetchAndApplyCityOverrides(rawProducts || [], citySlug);

        if (isMounted) {
          const formattedProducts = products.map(product => {
            if (product.category && product.category.is_active === false) {
              return null;
            }
            if (isProductImageMissing(product)) {
              return null;
            }
            return product;
          }).filter(Boolean);
          const sortedProducts = formattedProducts.sort((a, b) => {
            const aOOS = !a.is_available || a.quantity_available === 0;
            const bOOS = !b.is_available || b.quantity_available === 0;
            if (aOOS && !bOOS) return 1;
            if (!aOOS && bOOS) return -1;
            return 0;
          });
          setCategoryProducts(sortedProducts);
        }
      } catch (err) {
        console.error('Error fetching category products:', err);
      } finally {
        if (isMounted) {
          setIsCategoryProductsLoading(false);
        }
      }
    };

    loadCategoryProducts();

    return () => {
      isMounted = false;
    };
  }, [selectedFeaturedCategory, selectedCitySlug]);
  
  // Custom home page queries
  const { data: recentOrdersData, isLoading: isRecentOrdersLoading } = useOzoQuery(
    async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          created_at,
          order_items (
            product_id,
            product_name,
            product_image,
            quantity,
            unit_price
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)
      if (error) throw error
      return data || []
    },
    [user?.id]
  )

  const { data: stealDealsData = [], isLoading: isStealDealsLoading } = useOzoQuery(
    async () => {
      const query = supabase
        .from('products')
        .select(`
          *,
          category:categories (
            id,
            name,
            slug,
            parent_id,
            is_active
          )
        `)
        .gt('discount_percentage', 0)
        .eq('is_available', true)
        .order('discount_percentage', { ascending: false })
        .limit(100)

      const { data: rawProducts, error } = await query
      if (error) throw error

      if (rawProducts && rawProducts.length > 0) {
        const products = await fetchAndApplyCityOverrides(rawProducts, selectedCitySlug);
        return products.map(product => {
          if (product.category && product.category.is_active === false) {
            return null
          }
          if (isProductImageMissing(product)) {
            return null
          }
          return product;
        }).filter(Boolean).filter(p => p.discount_percentage > 0 && p.is_available)
      }
      return []
    },
    [selectedCitySlug]
  )

  const { data: summerSpecialsProductsData = [], isLoading: isSummerSpecialsLoading } = useOzoQuery(
    async () => {
      // Find parent category ID for summer specials
      const { data: parentCat, error: catError } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', 'summer-specials')
        .eq('is_active', true)
        .maybeSingle()

      if (catError) throw catError
      if (!parentCat) return []

      // Find subcategories of Summer Specials
      const { data: subcategories, error: subError } = await supabase
        .from('categories')
        .select('id')
        .eq('parent_id', parentCat.id)
        .eq('is_active', true)

      if (subError) throw subError

      const categoryIds = [parentCat.id, ...(subcategories || []).map(s => s.id)]

      const query = supabase
        .from('products')
        .select(`
          *,
          category:categories (
            id,
            name,
            slug,
            parent_id,
            is_active
          )
        `);

      const { data: rawProducts, error: prodError } = await query
        .in('category_id', categoryIds)
        .limit(20)

      if (prodError) throw prodError

      const products = await fetchAndApplyCityOverrides(rawProducts || [], selectedCitySlug);

      // Format product pricing and availability
      let formatted = products
        .filter(product => !(product.category && product.category.is_active === false))
        .filter(product => !isProductImageMissing(product));

      // Sort: in-stock first
      return formatted.sort((a, b) => {
        const aOOS = !a.is_available || a.quantity_available === 0;
        const bOOS = !b.is_available || b.quantity_available === 0;
        if (aOOS && !bOOS) return 1;
        if (!aOOS && bOOS) return -1;
        return 0;
      })
    },
    [selectedCitySlug]
  )

  const { data: mandiProductsData, isLoading: isMandiLoading } = useOzoQuery(
    async () => {
      const { data: catData } = await supabase
        .from('categories')
        .select('id')
        .in('slug', ['vegetables', 'fruits', 'leafy-greens', 'root-vegetables', 'flower-vegetables', 'fruiting-vegetables', 'pods-legumes', 'fresh-fruits'])
        .eq('is_active', true)

      if (catData && catData.length > 0) {
        const parentIds = catData.map(c => c.id)
        // Fetch all child subcategories
        const { data: subCatData } = await supabase
          .from('categories')
          .select('id')
          .in('parent_id', parentIds)
          .eq('is_active', true)

        const catIds = [
          ...parentIds,
          ...(subCatData?.map(s => s.id) || [])
        ]
        const query = supabase
          .from('products')
          .select(`
            *,
            category:categories (
              id,
              name,
              slug,
              is_active
            )
          `)

        const { data: rawProducts, error } = await query.in('category_id', catIds)
        if (error) throw error

        if (rawProducts && rawProducts.length > 0) {
          const products = await fetchAndApplyCityOverrides(rawProducts, selectedCitySlug);
          const formatted = products.map(product => {
            if (product.category && product.category.is_active === false) {
              return null
            }
            if (isProductImageMissing(product)) {
              return null
            }
            return product;
          }).filter(Boolean);
          return formatted;
        }
      }
      return [];
    },
    [selectedCitySlug]
  )

  const { data: budgetProductsData = [], isLoading: isBudgetLoading } = useOzoQuery(
    async () => {
      const query = supabase
        .from('products')
        .select(`
          *,
          category:categories (
            id,
            name,
            slug,
            is_active
          )
        `)
        .lte('price', 50)
        .eq('is_available', true)
        .order('price', { ascending: true })
        .limit(150)

      const { data: rawProducts, error } = await query
      if (error) throw error

      if (rawProducts && rawProducts.length > 0) {
        const products = await fetchAndApplyCityOverrides(rawProducts, selectedCitySlug);
        const formatted = products.map(product => {
          if (product.category && product.category.is_active === false) {
            return null
          }
          if (isProductImageMissing(product)) {
            return null
          }
          return product;
        }).filter(Boolean).filter(p => p.price <= 50 && p.is_available)

        // Exclude raw cooking ingredients, spices, cleaning/detergents and select snack-like / ready-to-eat products
        const filtered = formatted.filter(p => {
          const name = p.name.toLowerCase()
          const excludeKeywords = [
            'powder', 'mirch', 'haldi', 'turmeric', 'coriander', 'dhania', 'jeera', 'cumin', 'hing', 
            'masala', 'ginger', 'adrak', 'garlic', 'lehsun', 'oil', 'ghee', 'mustard', 'refined', 
            'rice', 'chawal', 'salt', 'namak', 'chini', 'atta', 'flour', 'dal', 'lentil', 'raw',
            'whole spice', 'cardamom', 'elaichi', 'clove', 'laung', 'cinnamon', 'dalchini', 'saffron',
            'kesar', 'black pepper', 'kali mirch', 'fenugreek', 'methi', 'mustard seed', 'rai', 
            'fennel', 'saunf', 'detergent', 'soap', 'cleaner', 'shampoo', 'brush', 'scrub', 'raw sugar'
          ]
          if (excludeKeywords.some(kw => name.includes(kw))) {
            return false
          }
          const includeKeywords = [
            'choc', 'ice cream', 'drink', 'beverage', 'pepsi', 'coke', 'cola', 'fanta', 'sprite',
            'chips', 'namkeen', 'bhujia', 'snack', 'biscuit', 'cookie', 'wafer', 'roll', 'thekua',
            'sweet', 'jamun', 'lassi', 'curd', 'yoghurt', 'juice', 'nectar', 'water', 'soda',
            'makhana', 'popcorn', 'crisps', 'bite', 'candy', 'toffee', 'bar', 'cake', 'croissant',
            'bun', 'bread', 'butter', 'cheese', 'paneer'
          ]
          return includeKeywords.some(kw => name.includes(kw))
        })

        // If not enough snack-like products, backfill with remaining safe products under 50
        if (filtered.length < 24) {
          const selectedIds = new Set(filtered.map(f => f.id))
          const backfill = formatted
            .filter(p => !selectedIds.has(p.id))
            .filter(p => {
              const name = p.name.toLowerCase()
              return !['powder', 'masala', 'detergent', 'soap', 'cleaner', 'shampoo', 'scrub'].some(kw => name.includes(kw))
            })
          
          for (const p of backfill) {
            if (filtered.length >= 24) break
            filtered.push(p)
          }
        }

        return filtered
      }
      return []
    },
    [selectedCitySlug]
  )
  
  // Request Modal states
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [requestName, setRequestName] = useState('')
  const [requestBrand, setRequestBrand] = useState('')
  const [requestQuantity, setRequestQuantity] = useState('')
  const [requestDescription, setRequestDescription] = useState('')
  const [requestImageUrl, setRequestImageUrl] = useState('')
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)

  const [marts, setMarts] = useState([])
  const [isMartsLoading, setIsMartsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const fetchMarts = async () => {
      try {
        if (isMounted) setIsMartsLoading(true)
        let query = supabase.from('marts').select('*').eq('is_active', true)
        if (selectedCitySlug) {
          query = query.eq('city_slug', selectedCitySlug)
        }
        const { data, error } = await query.order('name')
        if (error) throw error
        if (isMounted) setMarts(data || [])
      } catch (err) {
        console.error('Error fetching marts:', err)
      } finally {
        if (isMounted) setIsMartsLoading(false)
      }
    }
    fetchMarts()
    return () => {
      isMounted = false
    }
  }, [selectedCitySlug])

  // Fetch standard data on mount using useOzoQuery to preserve initial loading state
  const { isLoading: isHomeDataLoading } = useOzoQuery(
    async (signal) => {
      const results = await Promise.all([
        fetchOffers({ signal }),
        fetchFeaturedProducts({ signal }),
        fetchBestsellerProducts({ signal }),
        fetchCategories({ signal })
      ])
      const failed = results.find(r => !r.success)
      if (failed) {
        throw failed.error || new Error('Failed to load homepage data')
      }
    },
    [fetchOffers, fetchFeaturedProducts, fetchBestsellerProducts, fetchCategories, selectedCitySlug]
  )

  // Custom quantity controls for inline cards
  const handleCustomIncrement = useCallback(async (product) => {
    const cartState = useCartStore.getState()
    const cartItem = cartState.items.find(item => item.productId === product.id)
    if (cartItem) {
      const quantity = cartItem.quantity
      if (quantity >= (product.max_order_qty || 10)) {
        toast.error(`Maximum order quantity reached`)
        return
      }
      await cartState.updateQuantity(cartItem.id, quantity + 1)
    }
  }, [])

  const handleCustomDecrement = useCallback(async (product) => {
    const cartState = useCartStore.getState()
    const cartItem = cartState.items.find(item => item.productId === product.id)
    if (cartItem) {
      const quantity = cartItem.quantity
      if (quantity > 0) {
        await cartState.updateQuantity(cartItem.id, quantity - 1)
      }
    }
  }, [])

  const handleCustomAddToCart = useCallback(async (product) => {
    const cartState = useCartStore.getState()
    await cartState.addToCart(product, 1)
  }, [])

  // Quick 1-Click Reorder Action
  const handleReorderClick = async (pack) => {
    if (!isAuthenticated) {
      toast.error('Please login to reorder items')
      navigate('/login')
      return
    }

    setIsReorderingId(pack.id)
    try {
      // Filter out simulated/mock IDs
      const productIds = pack.items
        .map(item => item.product_id)
        .filter(id => id && !id.startsWith('mock') && !id.startsWith('sample'))

      if (productIds.length === 0) {
        // Fallback simulated reorder
        let addedMockCount = 0
        const allProds = [...bestsellerProducts, ...featuredProducts]
        for (const item of pack.items) {
          const realProduct = allProds.find(
            p => p.id === item.product_id || p.name.toLowerCase().includes(item.name.toLowerCase())
          )
          if (realProduct) {
            await addToCart(realProduct, item.quantity || 1, false)
            addedMockCount++
          }
        }
        if (addedMockCount > 0) {
          toast.success(`Successfully reordered ${addedMockCount} items!`)
        } else {
          toast.error('Mock products are currently unavailable')
        }
        return
      }

      const { data: dbProducts, error } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds)

      if (error || !dbProducts || dbProducts.length === 0) {
        toast.error('Products in this package are currently unavailable')
        return
      }

      let successCount = 0
      for (const item of pack.items) {
        const prod = dbProducts.find(p => p.id === item.product_id)
        if (prod && prod.is_available) {
          await addToCart(prod, item.quantity || 1, false)
          successCount++
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully reordered ${successCount} items!`)
      } else {
        toast.error('All products in this order are currently out of stock')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to process reorder')
    } finally {
      setIsReorderingId(null)
    }
  }

  // Hyperlocal combos action
  const handleSpecialsClick = (specialType) => {
    navigate(`/combo/${specialType}`)
  }

  // Handle missing product request form submission
  const handleRequestSubmit = async (e) => {
    e.preventDefault()
    if (!requestName.trim()) {
      toast.error('Please enter the product name')
      return
    }

    if (isUploadingImage) {
      toast.error('Please wait for the image to finish uploading')
      return
    }

    setIsSubmittingRequest(true)
    try {
      const requestData = {
        user_id: user?.id || null,
        product_name: requestName,
        brand: requestBrand || null,
        quantity: requestQuantity || null,
        description: requestDescription || null,
        image_url: requestImageUrl || null,
        status: 'pending'
      }

      // Try database insertion
      const { error } = await supabase
        .from('product_requests')
        .insert([requestData])

      if (error) {
        console.warn('Database insert failed, saving to localStorage:', error)
        // Fallback localStorage logging
        const localReqs = JSON.parse(localStorage.getItem('ozo-product-requests') || '[]')
        localReqs.push({ ...requestData, id: crypto.randomUUID(), created_at: new Date().toISOString() })
        localStorage.setItem('ozo-product-requests', JSON.stringify(localReqs))
      }

      toast.success('Thank you! The OZO team has received your request. We will make it available within 24 hours!')
      
      // Reset form fields
      setRequestName('')
      setRequestBrand('')
      setRequestQuantity('')
      setRequestDescription('')
      setRequestImageUrl('')
      setIsRequestModalOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('Failed to submit request')
    } finally {
      setIsSubmittingRequest(false)
    }
  }

  // Smart helper to look up real product matching context keywords
  const findRealProduct = (keywords, defaultName, defaultImage) => {
    const allProds = [...bestsellerProducts, ...featuredProducts]
    const found = allProds.find(p => 
      keywords.some(kw => p.name.toLowerCase().includes(kw))
    )
    if (found) {
      return {
        product_id: found.id,
        name: found.name,
        image_url: found.image_url
      }
    }
    return {
      product_id: `mock-${defaultName.toLowerCase().replace(/\s+/g, '-')}`,
      name: defaultName,
      image_url: defaultImage
    }
  }

  // Pair correct products instead of blindly slicing indices
  const tomatoProd = findRealProduct(['tomato', 'tamatar'], 'Fresh Red Tomatoes', 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/tomato_1.jpg')
  const onionProd = findRealProduct(['onion', 'pyaz', 'pyaaz'], 'Fresh Red Onion (Pyaz)', 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/fresh-red-onion-pyaz-fres.jpg')
  const potatoProd = findRealProduct(['potato', 'aloo'], 'Premium Potato (Aloo)', 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/potato_1.jpg')
  const makhanaProd = findRealProduct(['makhana', 'phool'], 'Premium Mithila Phool Makhana', 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/premium-mithila-phool-makhana.jpg')
  const thekuaProd = findRealProduct(['thekua'], 'Mithila Special Leaf-Shaped Thekua', '/images/products/thekua.png')
  const mangoProd = findRealProduct(['mango', 'hapus', 'aam'], 'Premium Alphonso Mango (Hapus)', 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/premium-alphonso-mango-hapus-prem.jpg')
  const pomegranateProd = findRealProduct(['pomegranate', 'anar'], 'Fresh Pomegranate (Anar)', 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/fresh-pomegranate-anar-fres.jpg')
  const pickleProd = findRealProduct(['pickle', 'achar', 'mango pickle'], 'Mithila Special Homemade Mango Pickle', '/images/products/mithila-special-homemade-mango-pickle.jpg')

  // Computed / fallback quick reorders
  const reorderPacks = useMemo(() => {
    let rawList = [];
    if (user && recentOrdersData && recentOrdersData.length > 0) {
      rawList = recentOrdersData.map(o => ({
        id: o?.id,
        name: `Order #${o?.order_number ? o.order_number.slice(-6) : ''}`,
        items: (o?.order_items || [])
          .filter(item => item && item.product_id && item.product_name)
          .map(item => ({
            product_id: item.product_id,
            name: item.product_name,
            image_url: item.product_image,
            quantity: item.quantity
          }))
      })).filter(pack => pack.items.length > 0);
    } else if (!user) {
      rawList = [
        {
          id: 'mock-1',
          name: 'Salad Special Combo',
          items: [
            { ...tomatoProd, quantity: 1 },
            { ...onionProd, quantity: 1 },
            { ...potatoProd, quantity: 2 }
          ]
        },
        {
          id: 'mock-2',
          name: 'Mithila Feast Combo',
          items: [
            { ...thekuaProd, quantity: 1 },
            { ...makhanaProd, quantity: 1 },
            { ...pickleProd, quantity: 1 }
          ]
        },
        {
          id: 'mock-3',
          name: 'Fruit Basket Combo',
          items: [
            { ...mangoProd, quantity: 1 },
            { ...pomegranateProd, quantity: 1 }
          ]
        }
      ].filter(pack => pack.items && pack.items.length > 0 && pack.items.every(i => i.name));
    }

    const uniquePacks = [];
    const seenProductKeys = new Set();
    for (const pack of rawList) {
      const key = pack.items.map(item => item.product_id || item.id || item.name).sort().join(',');
      if (key && !seenProductKeys.has(key)) {
        seenProductKeys.add(key);
        uniquePacks.push(pack);
      }
    }
    return uniquePacks;
  }, [recentOrdersData, user, tomatoProd, onionProd, potatoProd, thekuaProd, makhanaProd, pickleProd, mangoProd, pomegranateProd])

  // Computed / fallback steal deals
  const displayStealDeals = useMemo(() => {
    const fallbackDeals = [
      {
        id: 'deal-1',
        name: 'Mithila Special Leaf-Shaped Thekua',
        price: 120,
        mrp: 150,
        discount_percentage: 20,
        unit: '250g',
        image_url: '/images/products/thekua.png',
        is_available: true
      },
      {
        id: 'deal-2',
        name: 'Premium Mithila Phool Makhana',
        price: 149,
        mrp: 199,
        discount_percentage: 25,
        unit: '250g',
        image_url: 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/premium-mithila-phool-makhana.jpg',
        is_available: true
      },
      {
        id: 'deal-3',
        name: 'Mithila Special Homemade Mango Pickle',
        price: 165,
        mrp: 220,
        discount_percentage: 25,
        unit: '400g',
        image_url: '/images/products/mithila-special-homemade-mango-pickle.jpg',
        is_available: true
      },
      {
        id: 'deal-4',
        name: 'Premium Salad Kit (Broccoli, Lettuce, Cherry Tomatoes)',
        price: 89,
        mrp: 120,
        discount_percentage: 25,
        unit: '1 Pack',
        image_url: 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/broccoli_1.jpg',
        is_available: true
      }
    ];

    const isUpcoming = (p) => {
      const isQtyOOS = p.quantity_available !== null && p.quantity_available !== undefined && p.quantity_available === 0;
      const isOOS = !p.is_available || isQtyOOS;
      return (launchConfig?.launch_mode_enabled && isOOS) ? true : (p.is_upcoming || false);
    };

    const filteredDeals = (stealDealsData || []).filter(p => !isUpcoming(p));
    const filteredBestsellers = (bestsellerProducts || []).filter(p => !isUpcoming(p));

    return (filteredDeals.length > 0)
      ? getOnePerCategory(filteredDeals, shuffleSeed, 4)
      : (
        filteredBestsellers.length >= 4 
          ? getOnePerCategory(filteredBestsellers, shuffleSeed, 4).map(p => ({
              ...p,
              mrp: (p?.mrp && p.mrp > p.price) ? p.mrp : Math.round((p?.price || 0) * 1.25),
              discount_percentage: p?.discount_percentage || 20
             }))
          : seededSort(fallbackDeals, shuffleSeed)
      );
  }, [stealDealsData, bestsellerProducts, shuffleSeed, launchConfig]);

  // Computed / fallback fresh mandi arrivals
  const displayMandi = useMemo(() => {
    const fallbackMandi = [
      { id: 'mandi-1', name: 'Fresh Red Apple (Seb)', price: 129, mrp: 160, discount_percentage: 20, unit: '4 pcs', image_url: 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/fresh-red-apple-seb-fres.jpg', is_available: true },
      { id: 'mandi-2', name: 'Premium Green Broccoli', price: 79, mrp: 110, discount_percentage: 28, unit: '1 pc', image_url: 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/broccoli_1.jpg', is_available: true },
      { id: 'mandi-3', name: 'Fresh Spinach (Palak)', price: 22, mrp: 30, discount_percentage: 26, unit: '250 g', image_url: 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/fresh-spinach-palak-b6d253.jpg', is_available: true },
      { id: 'mandi-4', name: 'Premium Potato (Aloo)', price: 30, mrp: 40, discount_percentage: 25, unit: '1 kg', image_url: 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/potato_1.jpg', is_available: true },
      { id: 'mandi-5', name: 'Fresh Red Onion (Pyaz)', price: 35, mrp: 45, discount_percentage: 22, unit: '1 kg', image_url: 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/fresh-red-onion-pyaz-fres.jpg', is_available: true },
      { id: 'mandi-6', name: 'Fresh Red Tomatoes', price: 49, mrp: 70, discount_percentage: 30, unit: '1 kg', image_url: 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/tomato_1.jpg', is_available: true }
    ];

    if (mandiProductsData && mandiProductsData.length > 0) {
      const isUpcoming = (p) => {
        const isQtyOOS = p.quantity_available !== null && p.quantity_available !== undefined && p.quantity_available === 0;
        const isOOS = !p.is_available || isQtyOOS;
        return (launchConfig?.launch_mode_enabled && isOOS) ? true : (p.is_upcoming || false);
      };
      const filteredMandi = mandiProductsData.filter(p => !isUpcoming(p));
      const stealDealsIds = new Set(displayStealDeals.map(p => p.id));
      const filtered = filteredMandi.filter(p => !stealDealsIds.has(p.id));

      const inStock = filtered.filter(p => p.is_available && !(p.quantity_available !== null && p.quantity_available === 0));
      const outOfStock = filtered.filter(p => !p.is_available || (p.quantity_available !== null && p.quantity_available === 0));

      const shuffledInStock = seededSort(inStock, shuffleSeed);
      const shuffledOutOfStock = seededSort(outOfStock, shuffleSeed);

      // Prioritize in-stock products, show up to 8 total. Include OOS only if we don't have enough in-stock.
      let result = shuffledInStock.slice(0, 8);
      if (result.length < 8 && shuffledOutOfStock.length > 0) {
        result = [...result, ...shuffledOutOfStock.slice(0, 8 - result.length)];
      }
      return result;
    }

    return seededSort(fallbackMandi, shuffleSeed);
  }, [mandiProductsData, displayStealDeals, shuffleSeed, launchConfig]);

  useEffect(() => {
    const el = mandiScrollRef.current
    if (!el) return

    let animationId
    let isInteracting = false
    let interactionTimeout
    let direction = 1 // 1 = right, -1 = left
    let currentScroll = el.scrollLeft
    let lastTime = performance.now()
    const speed = 0.05 // pixels per millisecond (approx 50px/sec, highly smooth and consistent)

    const handleInteractionStart = () => {
      isInteracting = true
      if (interactionTimeout) clearTimeout(interactionTimeout)
    }

    const handleInteractionEnd = () => {
      if (interactionTimeout) clearTimeout(interactionTimeout)
      interactionTimeout = setTimeout(() => {
        isInteracting = false
        currentScroll = el.scrollLeft // Sync to actual scroll position on resume
        lastTime = performance.now() // Reset timer accumulator
      }, 3000) // Resume after 3s of inactivity
    }

    const handleWheel = () => {
      handleInteractionStart()
      handleInteractionEnd()
    }

    el.addEventListener('mouseenter', handleInteractionStart, { passive: true })
    el.addEventListener('mouseleave', handleInteractionEnd, { passive: true })
    el.addEventListener('touchstart', handleInteractionStart, { passive: true })
    el.addEventListener('touchend', handleInteractionEnd, { passive: true })
    el.addEventListener('mousedown', handleInteractionStart, { passive: true })
    el.addEventListener('mouseup', handleInteractionEnd, { passive: true })
    el.addEventListener('wheel', handleWheel, { passive: true })

    const animate = (time) => {
      const delta = time - lastTime
      lastTime = time

      // Clamp delta to prevent huge jumps (e.g. when tab is backgrounded)
      const cappedDelta = Math.min(delta, 100)

      if (!isInteracting && el.scrollWidth > el.clientWidth) {
        currentScroll += speed * cappedDelta * direction
        el.scrollLeft = Math.round(currentScroll)

        if (direction === 1 && el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) {
          direction = -1
          currentScroll = el.scrollLeft
        } else if (direction === -1 && el.scrollLeft <= 1) {
          direction = 1
          currentScroll = el.scrollLeft
        }
      } else if (isInteracting) {
        currentScroll = el.scrollLeft // Keep internal state updated with user gestures
      }
      animationId = requestAnimationFrame(animate)
    }

    const initialTimeout = setTimeout(() => {
      lastTime = performance.now()
      animationId = requestAnimationFrame(animate)
    }, 1500)

    return () => {
      clearTimeout(initialTimeout)
      cancelAnimationFrame(animationId)
      if (interactionTimeout) clearTimeout(interactionTimeout)
      el.removeEventListener('mouseenter', handleInteractionStart)
      el.removeEventListener('mouseleave', handleInteractionEnd)
      el.removeEventListener('touchstart', handleInteractionStart)
      el.removeEventListener('touchend', handleInteractionEnd)
      el.removeEventListener('mousedown', handleInteractionStart)
      el.removeEventListener('mouseup', handleInteractionEnd)
      el.removeEventListener('wheel', handleWheel)
    }
  }, [displayMandi])

  // Computed / fallback summer specials
  const displaySummerSpecials = useMemo(() => {
    const fallbackSummer = [
      {
        id: 'summer-fallback-1',
        name: 'Coca-Cola Soft Drink',
        price: 40,
        mrp: 45,
        discount_percentage: 11,
        unit: '250 ml Can',
        image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=60&w=300',
        is_available: true,
        slug: 'coca-cola-250ml'
      },
      {
        id: 'summer-fallback-2',
        name: 'Sprite Lemon-Lime Drink',
        price: 38,
        mrp: 40,
        discount_percentage: 5,
        unit: '250 ml Can',
        image_url: 'https://images.unsplash.com/photo-1625772290748-3909393a53cb?auto=format&fit=crop&q=60&w=300',
        is_available: true,
        slug: 'sprite-250ml'
      },
      {
        id: 'summer-fallback-3',
        name: 'Amul Vanilla Gold Ice Cream',
        price: 220,
        mrp: 250,
        discount_percentage: 12,
        unit: '1 L',
        image_url: 'https://images.unsplash.com/photo-1560180474-e8563fd75bab?auto=format&fit=crop&q=60&w=300',
        is_available: true,
        slug: 'amul-vanilla-1l'
      },
      {
        id: 'summer-fallback-4',
        name: 'Kwality Walls Choco Feast',
        price: 40,
        mrp: 40,
        discount_percentage: 0,
        unit: '70 ml',
        image_url: 'https://images.unsplash.com/photo-1557142046-c704a3adf364?auto=format&fit=crop&q=60&w=300',
        is_available: true,
        slug: 'choco-feast-70ml'
      }
    ];

    if (summerSpecialsProductsData && summerSpecialsProductsData.length > 0) {
      const isUpcoming = (p) => {
        const isQtyOOS = p.quantity_available !== null && p.quantity_available !== undefined && p.quantity_available === 0;
        const isOOS = !p.is_available || isQtyOOS;
        return (launchConfig?.launch_mode_enabled && isOOS) ? true : (p.is_upcoming || false);
      };
      const filteredSummer = summerSpecialsProductsData.filter(p => !isUpcoming(p));

      const inStock = filteredSummer.filter(p => p.is_available && !(p.quantity_available !== null && p.quantity_available === 0));
      const outOfStock = filteredSummer.filter(p => !p.is_available || (p.quantity_available !== null && p.quantity_available === 0));

      const shuffledInStock = seededSort(inStock, shuffleSeed);
      const shuffledOutOfStock = seededSort(outOfStock, shuffleSeed);

      let result = shuffledInStock.slice(0, 10);
      if (result.length < 10 && shuffledOutOfStock.length > 0) {
        result = [...result, ...shuffledOutOfStock.slice(0, 10 - result.length)];
      }
      return result;
    }

    return seededSort(fallbackSummer, shuffleSeed);
  }, [summerSpecialsProductsData, shuffleSeed, launchConfig]);

  // Automatic smooth scrolling for Summer Specials
  useEffect(() => {
    const el = summerScrollRef.current
    if (!el) return

    let animationId
    let isInteracting = false
    let interactionTimeout
    let direction = 1 // 1 = right, -1 = left
    let currentScroll = el.scrollLeft
    let lastTime = performance.now()
    const speed = 0.05 // pixels per millisecond (approx 50px/sec, highly smooth and consistent)

    const handleInteractionStart = () => {
      isInteracting = true
      if (interactionTimeout) clearTimeout(interactionTimeout)
    }

    const handleInteractionEnd = () => {
      if (interactionTimeout) clearTimeout(interactionTimeout)
      interactionTimeout = setTimeout(() => {
        isInteracting = false
        currentScroll = el.scrollLeft // Sync to actual scroll position on resume
        lastTime = performance.now() // Reset timer accumulator
      }, 3000) // Resume after 3s of inactivity
    }

    const handleWheel = () => {
      handleInteractionStart()
      handleInteractionEnd()
    }

    el.addEventListener('mouseenter', handleInteractionStart, { passive: true })
    el.addEventListener('mouseleave', handleInteractionEnd, { passive: true })
    el.addEventListener('touchstart', handleInteractionStart, { passive: true })
    el.addEventListener('touchend', handleInteractionEnd, { passive: true })
    el.addEventListener('mousedown', handleInteractionStart, { passive: true })
    el.addEventListener('mouseup', handleInteractionEnd, { passive: true })
    el.addEventListener('wheel', handleWheel, { passive: true })

    const animate = (time) => {
      const delta = time - lastTime
      lastTime = time

      // Clamp delta to prevent huge jumps (e.g. when tab is backgrounded)
      const cappedDelta = Math.min(delta, 100)

      if (!isInteracting && el.scrollWidth > el.clientWidth) {
        currentScroll += speed * cappedDelta * direction
        el.scrollLeft = Math.round(currentScroll)

        if (direction === 1 && el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) {
          direction = -1
          currentScroll = el.scrollLeft
        } else if (direction === -1 && el.scrollLeft <= 1) {
          direction = 1
          currentScroll = el.scrollLeft
        }
      } else if (isInteracting) {
        currentScroll = el.scrollLeft // Keep internal state updated with user gestures
      }
      animationId = requestAnimationFrame(animate)
    }

    const initialTimeout = setTimeout(() => {
      lastTime = performance.now()
      animationId = requestAnimationFrame(animate)
    }, 1500)

    return () => {
      clearTimeout(initialTimeout)
      cancelAnimationFrame(animationId)
      if (interactionTimeout) clearTimeout(interactionTimeout)
      el.removeEventListener('mouseenter', handleInteractionStart)
      el.removeEventListener('mouseleave', handleInteractionEnd)
      el.removeEventListener('touchstart', handleInteractionStart)
      el.removeEventListener('touchend', handleInteractionEnd)
      el.removeEventListener('mousedown', handleInteractionStart)
      el.removeEventListener('mouseup', handleInteractionEnd)
      el.removeEventListener('wheel', handleWheel)
    }
  }, [displaySummerSpecials])

  // Computed / fallback budget products under 50
  const displayBudgetProducts = useMemo(() => {
    const fallbackBudget = [
      { id: 'budget-1', name: 'Amul Vanilla Ice Cream Cup', price: 20, mrp: 20, discount_percentage: 0, unit: '100ml', image_url: 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/baskin-robbins-vanilla-ice-cream-tub-450ml.png', is_available: true, category_id: 'ice-cream' },
      { id: 'budget-2', name: 'Amul Chocobar Ice Cream', price: 30, mrp: 30, discount_percentage: 0, unit: '60ml', image_url: 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/minus-thirty-vanilla-mini-ice-cream-stick-vegan-sugar-free-40ml.png', is_available: true, category_id: 'ice-cream' },
      { id: 'budget-3', name: 'Pepsi Soft Drink', price: 40, mrp: 40, discount_percentage: 0, unit: '750ml', image_url: 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/pepsi-soft-drink-750ml.png', is_available: true, category_id: 'beverages' },
      { id: 'budget-4', name: 'Coca-Cola Soft Drink Can', price: 35, mrp: 40, discount_percentage: 12, unit: '250ml', image_url: 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/coca-cola-diet-coke-soft-drink-no-caffeine-330ml.png', is_available: true, category_id: 'beverages' },
      { id: 'budget-5', name: "Haldiram's Aloo Bhujia", price: 20, mrp: 20, discount_percentage: 0, unit: '85g', image_url: 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/haldirams-aloo-bhujia-85g.png', is_available: true, category_id: 'snacks' },
      { id: 'budget-6', name: "Haldiram's Khatta Meetha Namkeen", price: 20, mrp: 20, discount_percentage: 0, unit: '85g', image_url: 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/haldirams-khatta-meetha-mixture-namkeen-85g.png', is_available: true, category_id: 'snacks' },
      { id: 'budget-7', name: 'Sweet Gulab Jamun Cup', price: 30, mrp: 35, discount_percentage: 14, unit: '2 pcs', image_url: 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/bauli-moonfils-choco-vanilla-twin-crme-soft-croissant-eggless-110g.png', is_available: true, category_id: 'sweets' },
      { id: 'budget-8', name: 'Fresh Banana (Kela)', price: 49, mrp: 60, discount_percentage: 18, unit: '1 Dozen', image_url: 'https://raw.githubusercontent.com/mishra-aashu/ozo/master/public/images/products/fresh-banana-kela-fres.jpg', is_available: true, category_id: 'fruits-vegetables' }
    ];

    if (budgetProductsData && budgetProductsData.length > 0) {
      const isUpcoming = (p) => {
        const isQtyOOS = p.quantity_available !== null && p.quantity_available !== undefined && p.quantity_available === 0;
        const isOOS = !p.is_available || isQtyOOS;
        return (launchConfig?.launch_mode_enabled && isOOS) ? true : (p.is_upcoming || false);
      };
      const filteredBudget = budgetProductsData.filter(p => !isUpcoming(p));
      const excludedIds = new Set([
        ...displayStealDeals.map(p => p.id),
        ...displayMandi.map(p => p.id)
      ]);
      const filtered = filteredBudget.filter(p => !excludedIds.has(p.id));

      const inStock = filtered.filter(p => p.is_available && !(p.quantity_available !== null && p.quantity_available === 0));
      const outOfStock = filtered.filter(p => !p.is_available || (p.quantity_available !== null && p.quantity_available === 0));

      const mixedInStock = mixCategories(inStock, shuffleSeed, 150);
      const mixedOutOfStock = mixCategories(outOfStock, shuffleSeed, 150);

      return [...mixedInStock, ...mixedOutOfStock].slice(0, 12);
    }

    return mixCategories(fallbackBudget, shuffleSeed, 12);
  }, [budgetProductsData, displayStealDeals, displayMandi, shuffleSeed, launchConfig]);

  const features = [
    {
      icon: Clock,
      title: '30 Minutes Delivery',
      description: 'Super fast delivery at your doorstep',
      color: 'text-ozo-red',
      bgColor: 'bg-red-50 dark:bg-ozo-red/10',
    },
    {
      icon: Truck,
      title: freeAbove > 5000 ? 'Fast Delivery' : 'Free Delivery',
      description: freeAbove > 5000 ? `Base fee ₹${deliveryConfig?.base_fee ?? 30}` : `On orders above ₹${freeAbove}`,
      color: 'text-ozo-green',
      bgColor: 'bg-green-50 dark:bg-ozo-green/10',
    },
    {
      icon: ShieldCheck,
      title: 'Safe & Secure',
      description: '100% secure payments',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-600/10',
    },
    {
      icon: Gift,
      title: 'Exciting Offers',
      description: 'Best deals and discounts',
      color: 'text-ozo-yellow',
      bgColor: 'bg-yellow-50 dark:bg-ozo-yellow/10',
    },
  ]

  const demoBanners = [
    {
      id: 'demo-1',
      title: t('banner1Title') || 'Fresh Organic Vegetables',
      subtitle: t('banner1Subtitle') || 'Farm-fresh arrivals delivered in 30 mins',
      image_url: '/images/banners/banner1.png',
      tagline: t('banner1Tagline') || 'Farm Fresh',
      categorySlug: 'vegetables'
    },
    {
      id: 'demo-2',
      title: t('banner2Title') || 'Fresh & Juicy Fruits',
      subtitle: t('banner2Subtitle') || 'Premium quality fruits loaded with vitamins',
      image_url: '/images/banners/banner2.png',
      tagline: t('banner2Tagline') || 'Premium Fruits',
      categorySlug: 'fruits'
    },
    {
      id: 'demo-3',
      title: t('banner3Title') || 'Authentic Mithila Delights',
      subtitle: t('banner3Subtitle') || 'Traditional home-made pickles, sweets, & special treats',
      image_url: '/images/banners/mithila_banner.png',
      tagline: t('banner3Tagline') || 'Mithila Special',
      categorySlug: 'mithila-specials'
    }
  ]

  const getBannerLink = (offer) => {
    if (offer?.categorySlug) return `/category/${offer.categorySlug}`;
    if (offer?.category_slug) return `/category/${offer.category_slug}`;
    const title = offer?.title?.toLowerCase() || '';
    if (title.includes('mithila') || title.includes('मिथिला') || title.includes('மிதிலா') || title.includes('మిథిలా') || title.includes('ಮಿಥಿಲಾ')) return '/category/mithila-specials';
    if (title.includes('vegetable') || title.includes('सब्जी') || title.includes('காய்கறி') || title.includes('కూరగాయ') || title.includes('ತರಕಾರಿ')) return '/category/vegetables';
    if (title.includes('fruit') || title.includes('फल') || title.includes('பழம்') || title.includes('పండు') || title.includes('ಹಣ್ಣು')) return '/category/fruits';
    return '/products';
  };

  const displayOffers = [
    ...(offers || []).filter(o => o?.offer_type === 'banner'),
    ...demoBanners.filter(d => !((offers || []).filter(o => o?.offer_type === 'banner')).some(o => o?.title?.toLowerCase() === d?.title?.toLowerCase()))
  ];

  const displayBestsellers = useMemo(() => {
    if (!bestsellerProducts || bestsellerProducts.length === 0) return [];

    const excludedIds = new Set([
      ...displayStealDeals.map(p => p.id),
      ...displayMandi.map(p => p.id),
      ...displayBudgetProducts.map(p => p.id)
    ]);
    const filtered = bestsellerProducts.filter(p => !excludedIds.has(p.id));

    const inStock = filtered.filter(p => p.is_available && !(p.quantity_available !== null && p.quantity_available === 0));
    const outOfStock = filtered.filter(p => !p.is_available || (p.quantity_available !== null && p.quantity_available === 0));

    const shuffledInStock = seededSort(inStock, shuffleSeed);

    let result = [...shuffledInStock, ...outOfStock];
    if (result.length < 10 && bestsellerProducts.length > 0) {
      const duplicates = bestsellerProducts.filter(p => excludedIds.has(p.id));
      const shuffledDuplicates = seededSort(duplicates, shuffleSeed);
      result = [...result, ...shuffledDuplicates];
    }

    // Pad with featuredProducts or other products if we have fewer than 10 items to prevent empty spaces in rows
    if (result.length < 10) {
      const existingIds = new Set(result.map(p => p.id));
      const candidates = (featuredProducts || []).filter(p => p.is_available && !existingIds.has(p.id) && !excludedIds.has(p.id));
      const shuffledCandidates = seededSort(candidates, shuffleSeed);
      result = [...result, ...shuffledCandidates];
    }

    return result.slice(0, 10);
  }, [bestsellerProducts, featuredProducts, displayStealDeals, displayMandi, displayBudgetProducts, shuffleSeed]);
  const filteredCategoryProducts = useMemo(() => {
    const isUpcoming = (p) => {
      const isQtyOOS = p.quantity_available !== null && p.quantity_available !== undefined && p.quantity_available === 0;
      const isOOS = !p.is_available || isQtyOOS;
      return (launchConfig?.launch_mode_enabled && isOOS) ? true : (p.is_upcoming || false);
    };
    return (categoryProducts || []).filter(p => !isUpcoming(p));
  }, [categoryProducts, launchConfig]);

  const displayedFeaturedProducts = useMemo(() => {
    const baseList = selectedFeaturedCategory === 'all' ? featuredProducts : filteredCategoryProducts;
    if (!baseList || baseList.length === 0) return [];

    if (selectedFeaturedCategory === 'all') {
      const inStock = baseList.filter(p => p.is_available && !(p.quantity_available !== null && p.quantity_available === 0));
      const outOfStock = baseList.filter(p => !p.is_available || (p.quantity_available !== null && p.quantity_available === 0));

      const shuffledInStock = seededSort(inStock, shuffleSeed);
      let result = [...shuffledInStock, ...outOfStock];

      // Pad with bestsellerProducts or other products if we have fewer than 15 items to prevent empty spaces in rows
      if (result.length < 15) {
        const existingIds = new Set(result.map(p => p.id));
        const candidates = (bestsellerProducts || []).filter(p => p.is_available && !existingIds.has(p.id));
        const shuffledCandidates = seededSort(candidates, shuffleSeed);
        result = [...result, ...shuffledCandidates];
      }

      return result.slice(0, 15);
    }

    return baseList.slice(0, 15);
  }, [selectedFeaturedCategory, featuredProducts, filteredCategoryProducts, bestsellerProducts, shuffleSeed]);

  const parentCats = useMemo(() => categories.filter(c => !c.parent_id), [categories]);

  const gridProducts = useMemo(() => [
    ...featuredProducts,
    ...displayBestsellers,
    ...(typeof displayStealDeals !== 'undefined' ? displayStealDeals : []),
    ...(typeof displayMandi !== 'undefined' ? displayMandi : []),
    ...(typeof displayBudgetProducts !== 'undefined' ? displayBudgetProducts : [])
  ], [featuredProducts, displayBestsellers, displayStealDeals, displayMandi, displayBudgetProducts])

  const responsiveLimit = useMemo(() => {
    if (windowWidth >= 1280) return 9
    if (windowWidth >= 1024) return 8
    if (windowWidth >= 768) return 12
    if (windowWidth >= 640) return 10
    if (windowWidth >= 475) return 8
    return 9
  }, [windowWidth])

  const gridCategories = useMemo(() => {
    return showAllCategories ? parentCats : parentCats.slice(0, responsiveLimit)
  }, [showAllCategories, parentCats, responsiveLimit])

  const handleCategoryClick = useCallback((cat) => {
    navigate(`/category/${cat.slug}`)
  }, [navigate])

  return (
    <div className="min-h-screen pb-16">
      <SEO 
        title="OZO Mart | 30-Min Grocery Delivery in Aurangabad"
        description="Order fresh vegetables, fruits, dairy, and daily groceries on OZO Mart. Fast 30-minute delivery in Aurangabad, Bihar. सोचो मत, #OZOपेखोजो!"
        keywords="ozo mart, ozo delivery, online grocery, grocery delivery, fresh fruits, vegetables, Patna grocery delivery, Aurangabad grocery delivery, Bihar quick commerce, Mithila specials"
        schema={homeSchema}
      />
      <section className="relative overflow-hidden transition-colors duration-500">
        {/* Eye-soothing blurry background gradients */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Main Hero Gradients */}
          <div className="absolute inset-0 bg-gradient-hero dark:bg-gradient-hero-dark opacity-100 transition-colors duration-500" />
          
          {/* Dynamic Blurry Blobs */}
          <div className="absolute -top-[10%] -left-[5%] w-[50%] h-[50%] bg-ozo-red/10 dark:bg-ozo-red/20 blur-[120px] rounded-full animate-float opacity-70" />
          <div className="absolute top-[20%] -right-[10%] w-[45%] h-[45%] bg-ozo-green/10 dark:bg-ozo-green/15 blur-[100px] rounded-full animate-pulse-slow opacity-60" />
          <div className="absolute -bottom-[15%] left-[20%] w-[55%] h-[55%] bg-indigo-500/10 dark:bg-indigo-500/15 blur-[140px] rounded-full animate-float opacity-50" style={{ animationDelay: '2s' }} />
          
          {/* Texture Overlay */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        </div>

        <div className="container-custom py-4 md:py-8 relative z-10">
          <Swiper
            spaceBetween={16}
            slidesPerView={1}
            grabCursor={true}
            speed={600}
            watchSlidesProgress={true}
            breakpoints={{
              768: {
                slidesPerView: 2,
                spaceBetween: 20
              },
              1024: {
                slidesPerView: 3,
                spaceBetween: 24
              }
            }}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
            }}
            pagination={{
              clickable: true,
              dynamicBullets: true,
            }}
            navigation={true}
            modules={[Autoplay, Pagination, Navigation]}
            className="rounded-[2rem] md:rounded-[2.5rem] overflow-hidden h-[220px] sm:h-[280px] md:h-[340px] lg:h-[380px] shadow-premium"
          >
            {displayOffers.map((offer, index) => {
              const isFreeDeliveryOffer = offer?.coupon_code === 'FREEDELIVERY' || offer?.title?.toLowerCase() === 'free delivery';
              
              const titleText = isFreeDeliveryOffer 
                ? (freeAbove > 5000 ? t('fastDeliveryTitle') || 'Fast Delivery' : t('freeDeliveryTitle') || 'Free Delivery')
                : (offer.title);
                
              const subtitleText = isFreeDeliveryOffer
                ? (freeAbove > 5000 
                    ? (t('fastDeliveryBaseFee') || 'Base fee: ₹{amount}').replace('{amount}', deliveryConfig?.base_fee ?? 30)
                    : (t('freeDeliveryAbove') || 'On orders above ₹{amount}').replace('{amount}', freeAbove)
                  )
                : (offer.subtitle || offer.description);

              return (
                <SwiperSlide key={offer.id} className="transform-gpu">
                  <Link 
                    to={getBannerLink(offer)} 
                    className="relative block w-full h-full group cursor-pointer overflow-hidden rounded-[2rem] md:rounded-[2.5rem] transform-gpu"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <OptimizedImage
                      src={offer.image_url}
                      alt={titleText}
                      width={800}
                      quality={85}
                      loading={index < 3 ? "eager" : "lazy"}
                      fetchPriority={index < 3 ? "high" : "low"}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 transform-gpu"
                      style={{ willChange: 'transform' }}
                      containerClassName="w-full h-full"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-4 sm:p-6 md:p-8">
                      <div className="w-full">
                        <span className="inline-block px-3 py-1 rounded-full bg-ozo-red text-white text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] mb-1.5 sm:mb-3 shadow-md">
                          {offer.tagline || 'Special Offer'}
                        </span>
                        <h2 className="text-base sm:text-2xl md:text-3xl lg:text-2xl font-black text-white mb-1 sm:mb-2 leading-[1.15] tracking-tight">
                          {renderTitleWithHighlights(titleText)}
                        </h2>
                        <p className="text-white/90 text-[10px] sm:text-xs md:text-sm font-semibold mb-2.5 sm:mb-4 line-clamp-1 sm:line-clamp-2 leading-relaxed">
                          {subtitleText}
                        </p>
                        <div 
                          className="group relative w-fit flex items-center gap-2 bg-white text-gray-900 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl font-bold hover:bg-ozo-red hover:text-white transition-all transform-gpu hover:scale-[1.02] active:scale-[0.98] overflow-hidden shadow-lg"
                          style={{ willChange: 'transform' }}
                        >
                          <span className="relative z-10 text-[10px] sm:text-xs">Order Now</span>
                          <ArrowRight size={12} className="relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-gradient-to-r from-ozo-red to-ozo-red-dark opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>
      </section>

      {/* Homepage Main Layout Grid */}
      <section className="py-6">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Product Sections & Interactive elements */}
            <div className="lg:col-span-12 xl:col-span-12 space-y-8">
              
              {/* Categories Horizontal Slider */}
              <div className="bg-white dark:bg-[#111] border border-gray-100 dark:border-white/5 rounded-3xl p-5 md:p-6 shadow-premium transition-colors duration-300 overflow-hidden">
                <div className="flex items-start justify-between gap-2 md:gap-4 mb-6">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-tight">
                      Shop by <span className="text-gradient">Category.</span>
                    </h2>
                    <div className="h-1 w-20 bg-ozo-red mt-2 rounded-full" />
                  </div>
                  <Link to="/categories" className="text-xs text-ozo-red font-black uppercase tracking-wider hover:underline flex items-center gap-1 flex-shrink-0 whitespace-nowrap mt-1">
                    View All <ChevronRight size={14} />
                  </Link>
                </div>
                
                <OzoLoadingGuard
                  isLoading={isHomeDataLoading && categories.length === 0}
                  skeleton={
                    <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-9 gap-2 xs:gap-2.5 sm:gap-4.5 w-full">
                      {[...Array(9)].map((_, i) => (
                        <div key={i} className="w-full aspect-square bg-gray-150 dark:bg-white/5 rounded-[1.75rem] sm:rounded-[2rem] animate-pulse" />
                      ))}
                    </div>
                  }
                >
                  <OzoCategoryGrid 
                    categories={gridCategories} 
                    products={gridProducts}
                    onCategoryClick={handleCategoryClick}
                  />
                  
                  {parentCats.length > responsiveLimit && (
                    <div className="flex justify-center mt-6">
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowAllCategories(!showAllCategories)}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-ozo-red/20 dark:border-white/10 text-ozo-red dark:text-zinc-200 font-bold uppercase text-xs tracking-wider bg-white/50 dark:bg-white/5 hover:border-ozo-red hover:text-white hover:bg-ozo-red shadow-premium hover:shadow-lg transition-all duration-300 backdrop-blur-sm cursor-pointer"
                      >
                        {showAllCategories ? (
                          <>
                            Show Less <ChevronUp size={16} />
                          </>
                        ) : (
                          <>
                            More Categories <ChevronDown size={16} />
                          </>
                        )}
                      </motion.button>
                    </div>
                  )}
                </OzoLoadingGuard>
              </div>

              {/* SECTION: Summer Specials / Today's Offers */}
              {displaySummerSpecials.length > 0 && (
                <div className="bg-white dark:bg-[#111] border border-gray-100 dark:border-white/5 rounded-3xl p-5 md:p-6 shadow-premium transition-colors duration-300 overflow-hidden">
                  <div className="flex items-start justify-between gap-2 md:gap-4 mb-6">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg md:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-start gap-2 leading-tight">
                        <Sun className="w-5 h-5 md:w-6 md:h-6 text-orange-500 dark:text-amber-400 shrink-0 mt-0.5" />
                        <span>Summer Selections / <span className="text-gradient">Today's Offers.</span></span>
                      </h3>
                      <div className="h-1 w-20 bg-ozo-red mt-2 rounded-full" />
                    </div>
                    <Link to="/category/summer-specials" className="text-xs text-ozo-red font-black uppercase tracking-wider hover:underline flex items-center gap-1 flex-shrink-0 whitespace-nowrap mt-1">
                      View All <ChevronRight size={14} />
                    </Link>
                  </div>

                  {/* Summer Specials Product Scroll List */}
                  <div
                    ref={summerScrollRef}
                    className="flex overflow-x-auto gap-3 xs:gap-4 py-2 px-1 scrollbar-hide no-scrollbar"
                    style={{ scrollBehavior: 'auto' }}
                  >
                    {displaySummerSpecials.map((product) => {
                      const qty = getItemQuantity(product.id)
                      const isOutOfStock = !product.is_available 
                        || (product.quantity_available !== null && product.quantity_available !== undefined && product.quantity_available === 0)
                      const isUpcoming = (launchConfig?.launch_mode_enabled && isOutOfStock) 
                        ? true 
                        : (product.is_upcoming || false);
                      const discount = product.discount_percentage || (product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0)

                      return (
                        <div
                          key={product.id}
                          className="flex-shrink-0 w-[130px] xs:w-[145px] sm:w-44 bg-gray-55 dark:bg-[#161616] hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-150 dark:border-white/5 rounded-[1.75rem] sm:rounded-3xl p-2.5 xs:p-3 flex flex-col justify-between h-[16.5rem] xs:h-[17.5rem] sm:h-72 relative hover:border-ozo-red/30 transition-all duration-300 shadow-sm"
                        >
                          <div>
                            {/* Floating Discount Tag */}
                            {discount > 0 && (
                              <span className="absolute top-2 left-2 z-10 bg-ozo-red text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-md">
                                {discount}% OFF
                              </span>
                            )}

                            <Link to={selectedCitySlug ? `/${selectedCitySlug}/${product.slug}` : `/product/${product.slug}`} className="block relative aspect-square overflow-hidden bg-white/50 dark:bg-white/5 rounded-xl xs:rounded-2xl mb-2">
                              <OptimizedImage
                                src={product.image_url}
                                slug={product.slug}
                                alt={product.name}
                                width={300}
                                loading="lazy"
                                className={`w-full h-full object-contain p-2.5 sm:p-4 group-hover:scale-105 transition-transform duration-500 ${
                                  isOutOfStock ? 'grayscale opacity-60 contrast-75' : ''
                                }`}
                                containerClassName="w-full h-full"
                                fallbackSrc="https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&q=60&w=300"
                              />
                              {isOutOfStock && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/5 pointer-events-none select-none">
                                  <div className="flex flex-col items-center gap-1">
                                    {isUpcoming ? (
                                      <div className="bg-amber-500 text-white font-black text-[9px] px-2 py-1 rounded-lg shadow-md tracking-wider uppercase flex items-center gap-1.5 border border-white/10">
                                        Listing Soon
                                      </div>
                                    ) : (
                                      <div className="bg-ozo-red/90 text-white font-black text-[9px] px-2 py-1 rounded-lg shadow-md tracking-wider uppercase flex items-center gap-1.5 border border-white/10">
                                        OUT OF STOCK
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Link>
                            <Link to={selectedCitySlug ? `/${selectedCitySlug}/${product.slug}` : `/product/${product.slug}`} className="block min-h-[32px] xs:min-h-[36px]">
                              <h4 className="font-black text-[10px] xs:text-xs md:text-sm text-gray-900 dark:text-zinc-100 line-clamp-2 leading-tight">
                                {product.name}
                              </h4>
                            </Link>
                            <p className="text-[9px] xs:text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mt-0.5 xs:mt-1">{product.unit || '500g'}</p>
                          </div>

                          <div className="mt-auto pt-1.5 xs:pt-2 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-1.5">
                            <div className="flex flex-wrap items-baseline gap-1.5">
                              <span className="text-xs xs:text-sm font-black text-gray-900 dark:text-white">₹{product.price}</span>
                              {discount > 0 && (
                                <span className="text-[10px] xs:text-xs text-zinc-400 dark:text-zinc-500 line-through font-bold">
                                  ₹{product.mrp}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between w-full min-h-[28px] xs:min-h-[32px]">
                              <span className="text-[9px] xs:text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                                {qty > 0 ? 'In Cart' : ''}
                              </span>
                              <div className="flex-shrink-0">
                                {isOutOfStock ? (
                                  ((isUpcoming && launchConfig?.show_listing_soon_btn !== false) ||
                                   (!isUpcoming && launchConfig?.show_out_of_stock_btn !== false)) && (
                                    <button
                                      onClick={(e) => handleNotifyMe(product, e)}
                                      className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                                        notifiedProducts[product.id]
                                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                          : 'border-ozo-red/30 text-ozo-red bg-ozo-red/5 hover:bg-gradient-ozo hover:text-white hover:border-transparent shadow-sm'
                                      }`}
                                    >
                                      {notifiedProducts[product.id] ? (
                                        <>
                                          <Check size={10} className="stroke-[3px]" />
                                          <span>Req ✓</span>
                                        </>
                                      ) : (
                                        <>
                                          <Bell size={10} className="stroke-[2.5px]" />
                                          <span>Notify</span>
                                        </>
                                      )}
                                    </button>
                                  )
                                ) : qty > 0 ? (
                                  <div className="flex items-center gap-1 xs:gap-1.5 bg-ozo-green text-white rounded-full p-0.5 xs:p-1">
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleCustomDecrement(product);
                                      }}
                                      className="p-0.5 xs:p-1 hover:bg-white/20 rounded-full transition-colors"
                                    >
                                      <Minus size={8} className="stroke-[3px] scale-75 xs:scale-100" />
                                    </button>
                                    <span className="font-black text-[9px] xs:text-[10px] min-w-[6px] xs:min-w-[8px] text-center">{qty}</span>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleCustomIncrement(product);
                                      }}
                                      className="p-0.5 xs:p-1 hover:bg-white/20 rounded-full transition-colors"
                                    >
                                      <Plus size={8} className="stroke-[3px] scale-75 xs:scale-100" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleCustomAddToCart(product);
                                    }}
                                    className="p-1.5 xs:p-2 rounded-lg xs:rounded-xl bg-ozo-green hover:bg-opacity-90 text-white flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
                                  >
                                    <Plus size={10} className="stroke-[3px] xs:scale-110" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* SECTION: Explore Local Marts */}
              {marts.length > 0 && (
                <div className="bg-white dark:bg-[#111] border border-gray-100 dark:border-white/5 rounded-3xl p-5 md:p-6 shadow-premium transition-colors duration-300 overflow-hidden">
                  <div className="flex items-start justify-between gap-2 md:gap-4 mb-6">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg md:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-start gap-2 leading-tight">
                        <Store className="w-5 h-5 md:w-6 md:h-6 text-ozo-red shrink-0 mt-0.5" />
                        <span>Explore Nearby <span className="text-gradient">Stores.</span></span>
                      </h3>
                      <div className="h-1 w-20 bg-ozo-red mt-2 rounded-full" />
                    </div>
                  </div>

                  <div className="flex overflow-x-auto scrollbar-hide gap-3.5 py-2 px-1 w-full md:grid md:grid-cols-[repeat(auto-fit,minmax(130px,1fr))] md:gap-4">
                    {marts.map((mart, index) => {
                      let isStoreOpen = true
                      if (mart.is_active && !mart.is_24_7 && mart.opens_at && mart.closes_at) {
                        const now = new Date()
                        const currentTime = now.getHours() * 60 + now.getMinutes()
                        const [openH, openM] = mart.opens_at.split(':').map(Number)
                        const [closeH, closeM] = mart.closes_at.split(':').map(Number)
                        const openTime = openH * 60 + openM
                        const closeTime = closeH * 60 + closeM
                        if (closeTime > openTime) {
                          isStoreOpen = currentTime >= openTime && currentTime <= closeTime
                        } else {
                          isStoreOpen = currentTime >= openTime || currentTime <= closeTime
                        }
                      }

                      const preset = MART_COLOR_PRESETS[index % MART_COLOR_PRESETS.length]

                      return (
                        <Link
                          key={mart.id}
                          to={`/mart/${mart.slug}`}
                          className="w-[95px] shrink-0 bg-gray-55 dark:bg-[#161616] hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-150 dark:border-white/5 rounded-xl md:rounded-[2.25rem] p-2.5 md:p-4 flex flex-col items-center justify-center hover:border-ozo-red/35 hover:-translate-y-1 transition-all duration-300 shadow-sm md:w-auto md:shrink"
                        >
                          {/* Circular/Curved Shop Icon Container */}
                          <div className={`w-11 h-11 md:w-16 md:h-16 rounded-xl md:rounded-[1.75rem] bg-gradient-to-tr ${preset.bg} border ${preset.border} flex items-center justify-center shadow-inner overflow-hidden shrink-0`}>
                            {mart.logo_url ? (
                              <img src={mart.logo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Store className={`w-5 h-5 md:w-8 md:h-8 ${preset.icon}`} />
                            )}
                          </div>
                          
                          {/* Mart Name */}
                          <span className="text-[10px] md:text-xs font-black text-center mt-2 md:mt-3 text-gray-900 dark:text-white line-clamp-2 leading-tight">
                            {mart.name}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 2: Steal Deals / Today's Offers */}
              <div className="bg-white dark:bg-[#111] border border-gray-100 dark:border-white/5 rounded-3xl p-5 md:p-6 shadow-premium transition-colors duration-300">
                <div className="flex items-start justify-between gap-2 md:gap-4 mb-6">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg md:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-tight">
                      Steal Deals / <span className="text-gradient">Today's Offers.</span>
                    </h3>
                    <div className="h-1 w-20 bg-ozo-red mt-2 rounded-full" />
                  </div>
                  <Link to="/products" className="text-xs text-ozo-red font-black uppercase tracking-wider hover:underline flex items-center gap-1 flex-shrink-0 whitespace-nowrap mt-1">
                    View All <ChevronRight size={14} />
                  </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {displayStealDeals.map((product) => {
                    const qty = getItemQuantity(product.id)
                    const cartItem = cartItems.find(item => item.productId === product.id)
                    const discount = product.discount_percentage || (product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0)
                    const isOutOfStock = !product.is_available || (product.quantity_available !== undefined && product.quantity_available === 0)
                    const isUpcoming = (launchConfig?.launch_mode_enabled && isOutOfStock) ? true : (product.is_upcoming || false);

                    return (
                      <div
                        key={product.id}
                        className="relative group bg-white dark:bg-[#111] border border-gray-100 dark:border-white/5 rounded-3xl p-3 flex flex-col h-full shadow-premium hover:shadow-ozo-lg transition-shadow duration-300"
                      >
                        {/* Floating Discount Tag */}
                        {discount > 0 && (
                          <span className="absolute top-2 left-2 z-10 bg-ozo-red text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-md">
                            {discount}% OFF
                          </span>
                        )}

                        {/* Product Image Link */}
                        <Link to={selectedCitySlug ? `/${selectedCitySlug}/${product.slug}` : `/product/${product.slug}`} className="block relative aspect-square overflow-hidden bg-gray-55 dark:bg-white/5 rounded-2xl mb-2">
                          <OptimizedImage
                            src={product.image_url}
                            slug={product.slug}
                            alt={product.name}
                            width={300}
                            loading="lazy"
                            className={`w-full h-full object-contain p-2.5 sm:p-4 group-hover:scale-105 transition-transform duration-500 ${
                              isOutOfStock ? 'grayscale opacity-60 contrast-75' : ''
                            }`}
                            containerClassName="w-full h-full"
                          />
                          {isOutOfStock && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/5 pointer-events-none select-none">
                              <div className="flex flex-col items-center gap-1">
                                {isUpcoming ? (
                                  <div className="bg-amber-500 text-white font-black text-[9px] px-2 py-1 rounded-lg shadow-md tracking-wider uppercase flex items-center gap-1.5 border border-white/10">
                                    Listing Soon
                                  </div>
                                ) : (
                                  <div className="bg-ozo-red/90 text-white font-black text-[9px] px-2 py-1 rounded-lg shadow-md tracking-wider uppercase flex items-center gap-1.5 border border-white/10">
                                    OUT OF STOCK
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Link>

                        {/* Product Details */}
                        <div className="flex flex-col flex-grow">
                          <Link to={selectedCitySlug ? `/${selectedCitySlug}/${product.slug}` : `/product/${product.slug}`}>
                            <h4 className="font-black text-xs md:text-sm line-clamp-1 text-gray-800 dark:text-white leading-tight mb-1">
                              {product.name}
                            </h4>
                          </Link>
                          <p className="text-[10px] font-bold text-zinc-400 mb-2">{product.unit || '1 unit'}</p>
                          
                          <div className="mt-auto pt-2 border-t border-gray-100 dark:border-white/5 flex flex-col gap-2">
                            <div className="flex flex-wrap items-baseline gap-1.5">
                              <span className="text-sm font-black text-gray-900 dark:text-white leading-none">₹{product.price}</span>
                              {product.mrp > product.price && (
                                <span className="text-[10px] text-zinc-450 line-through font-bold leading-none">₹{product.mrp}</span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between w-full min-h-[32px]">
                              <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-400">
                                {qty > 0 ? 'In Cart' : ''}
                              </span>
                              <div className="flex-shrink-0">
                                {isOutOfStock ? (
                                  ((isUpcoming && launchConfig?.show_listing_soon_btn !== false) ||
                                   (!isUpcoming && launchConfig?.show_out_of_stock_btn !== false)) && (
                                    <button
                                      onClick={(e) => handleNotifyMe(product, e)}
                                      className={`text-[9px] font-black uppercase px-2 py-1 rounded-xl border transition-all flex items-center gap-1 ${
                                        notifiedProducts[product.id]
                                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                          : 'border-ozo-red/30 text-ozo-red bg-ozo-red/5 hover:bg-gradient-ozo hover:text-white hover:border-transparent shadow-sm'
                                      }`}
                                    >
                                      {notifiedProducts[product.id] ? (
                                        <>
                                          <Check size={10} className="stroke-[3px]" />
                                          <span>Req ✓</span>
                                        </>
                                      ) : (
                                        <>
                                          <Bell size={10} className="stroke-[2.5px]" />
                                          <span>Notify</span>
                                        </>
                                      )}
                                    </button>
                                  )
                                ) : qty > 0 ? (
                                  <div className="flex items-center gap-1.5 bg-ozo-green text-white rounded-full p-1 shadow-lg">
                                    <button
                                      onClick={() => handleCustomDecrement(product)}
                                      className="p-1 hover:bg-white/20 rounded-full transition-colors"
                                    >
                                      <Minus size={10} className="stroke-[3px]" />
                                    </button>
                                    <span className="font-black text-[10px] min-w-[10px] text-center">{qty}</span>
                                    <button
                                      onClick={() => handleCustomIncrement(product)}
                                      className="p-1 hover:bg-white/20 rounded-full transition-colors"
                                    >
                                      <Plus size={10} className="stroke-[3px]" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleCustomAddToCart(product)}
                                    className="w-8 h-8 rounded-full bg-gradient-ozo text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                                  >
                                    <Plus size={14} className="stroke-[3px]" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* SECTION 3: Fresh Mandi Arrivals */}
              {!!launchConfig?.show_mandi_section && (
                <div className="bg-white dark:bg-[#111] border border-gray-100 dark:border-white/5 rounded-3xl p-3 xs:p-4 md:p-6 shadow-premium transition-all duration-300 overflow-hidden">
                <div className="flex items-start justify-between gap-2 md:gap-4 mb-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg md:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-tight">
                      Freshly Sourced <span className="text-gradient">This Morning.</span>
                    </h3>
                    <p className="hidden sm:block text-xs text-zinc-500 dark:text-zinc-400 font-bold mt-1">Freshly sourced from the local farms to your doorstep</p>
                  </div>
                  <Link to="/category/vegetables" className="text-xs text-ozo-red font-black uppercase tracking-wider hover:underline flex items-center gap-1 flex-shrink-0 whitespace-nowrap mt-1">
                    View All <ChevronRight size={14} />
                  </Link>
                </div>

                {/* Product Scroll List */}
                <div
                  ref={mandiScrollRef}
                  className="flex overflow-x-auto gap-3 xs:gap-4 py-2 px-1 scrollbar-hide"
                  style={{ scrollBehavior: 'auto' }}
                >
                  {displayMandi.map((product) => {
                    const qty = getItemQuantity(product.id)
                    // OOS = is_available is false, OR quantity is explicitly 0 (null = untracked = not OOS)
                    const isOutOfStock = !product.is_available 
                      || (product.quantity_available !== null && product.quantity_available !== undefined && product.quantity_available === 0)
                    // "Listing Soon" when launch_mode_enabled is on AND product is OOS,
                    // OR when product itself is flagged is_upcoming=true
                    const isUpcoming = (launchConfig?.launch_mode_enabled && isOutOfStock) 
                      ? true 
                      : (product.is_upcoming || false);
                    return (
                       <div
                        key={product.id}
                        className="flex-shrink-0 w-[130px] xs:w-[145px] sm:w-44 bg-zinc-900 text-white border border-zinc-800 rounded-[1.75rem] sm:rounded-3xl p-2.5 xs:p-3 flex flex-col justify-between h-[16.5rem] xs:h-[17.5rem] sm:h-72 relative hover:border-ozo-red/30 transition-all duration-300"
                      >
                        <div>
                          <Link to={selectedCitySlug ? `/${selectedCitySlug}/${product.slug}` : `/product/${product.slug}`} className="block relative aspect-square overflow-hidden bg-zinc-800 rounded-xl xs:rounded-2xl mb-2">
                            <OptimizedImage
                              src={product.image_url}
                              slug={product.slug}
                              alt={product.name}
                              width={300}
                              loading="lazy"
                              className={`w-full h-full object-contain p-2.5 sm:p-4 group-hover:scale-105 transition-transform duration-500 ${
                                isOutOfStock ? 'grayscale opacity-60 contrast-75' : ''
                              }`}
                              containerClassName="w-full h-full"
                              fallbackSrc="https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&q=60&w=300"
                            />
                            {isOutOfStock && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/5 pointer-events-none select-none">
                                <div className="flex flex-col items-center gap-1">
                                  {isUpcoming ? (
                                    <div className="bg-amber-500 text-white font-black text-[9px] px-2 py-1 rounded-lg shadow-md tracking-wider uppercase flex items-center gap-1.5 border border-white/10">
                                      Listing Soon
                                    </div>
                                  ) : (
                                    <div className="bg-ozo-red/90 text-white font-black text-[9px] px-2 py-1 rounded-lg shadow-md tracking-wider uppercase flex items-center gap-1.5 border border-white/10">
                                      OUT OF STOCK
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Link>
                          <Link to={selectedCitySlug ? `/${selectedCitySlug}/${product.slug}` : `/product/${product.slug}`} className="block min-h-[32px] xs:min-h-[36px]">
                            <h4 className="font-black text-[10px] xs:text-xs md:text-sm text-gray-900 dark:text-zinc-100 line-clamp-2 leading-tight">
                              {product.name}
                            </h4>
                          </Link>
                          <p className="text-[9px] xs:text-[10px] font-bold text-zinc-500 dark:text-zinc-400 mt-0.5 xs:mt-1">{product.unit || '500g'}</p>
                        </div>

                        <div className="mt-auto pt-1.5 xs:pt-2 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-1.5">
                          <div className="flex flex-wrap items-baseline gap-1.5">
                            <span className="text-xs xs:text-sm font-black text-gray-900 dark:text-white">₹{product.price}</span>
                            <span className="text-[10px] xs:text-xs text-zinc-400 dark:text-zinc-500 line-through font-bold">
                              ₹{(product.mrp && product.mrp > product.price) ? product.mrp : Math.round(product.price * 1.25)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between w-full min-h-[28px] xs:min-h-[32px]">
                            <span className="text-[9px] xs:text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                              {qty > 0 ? 'In Cart' : ''}
                            </span>
                            <div className="flex-shrink-0">
                              {isOutOfStock ? (
                                ((isUpcoming && launchConfig?.show_listing_soon_btn !== false) ||
                                 (!isUpcoming && launchConfig?.show_out_of_stock_btn !== false)) && (
                                  <button
                                    onClick={(e) => handleNotifyMe(product, e)}
                                    className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                                      notifiedProducts[product.id]
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                        : 'border-ozo-red/30 text-ozo-red bg-ozo-red/5 hover:bg-gradient-ozo hover:text-white hover:border-transparent shadow-sm'
                                    }`}
                                  >
                                    {notifiedProducts[product.id] ? (
                                      <>
                                        <Check size={10} className="stroke-[3px]" />
                                        <span>Req ✓</span>
                                      </>
                                    ) : (
                                      <>
                                        <Bell size={10} className="stroke-[2.5px]" />
                                        <span>Notify</span>
                                      </>
                                    )}
                                  </button>
                                )
                              ) : qty > 0 ? (
                                <div className="flex items-center gap-1 xs:gap-1.5 bg-ozo-green text-white rounded-full p-0.5 xs:p-1">
                                  <button
                                    onClick={() => handleCustomDecrement(product)}
                                    className="p-0.5 xs:p-1 hover:bg-white/20 rounded-full transition-colors"
                                  >
                                    <Minus size={8} className="stroke-[3px] scale-75 xs:scale-100" />
                                  </button>
                                  <span className="font-black text-[9px] xs:text-[10px] min-w-[6px] xs:min-w-[8px] text-center">{qty}</span>
                                  <button
                                    onClick={() => handleCustomIncrement(product)}
                                    className="p-0.5 xs:p-1 hover:bg-white/20 rounded-full transition-colors"
                                  >
                                    <Plus size={8} className="stroke-[3px] scale-75 xs:scale-100" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleCustomAddToCart(product)}
                                  className="p-1.5 xs:p-2 rounded-lg xs:rounded-xl bg-ozo-green hover:bg-opacity-90 text-white flex items-center justify-center transition-all shadow-md active:scale-95"
                                >
                                  <Plus size={10} className="stroke-[3px] xs:scale-110" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              )}

              {/* SECTION 4: Custom "Product Request" Feature Banner */}
              <div className="w-full rounded-[1.8rem] md:rounded-[2.5rem] bg-gradient-to-r from-ozo-red to-ozo-red-dark p-5 md:p-8 flex flex-col md:flex-row justify-between items-center text-white relative overflow-hidden shadow-xl md:shadow-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full" />
                <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-ozo-red/20 blur-3xl rounded-full" />
                
                <div className="relative z-10 max-w-xl text-center md:text-left mb-4 md:mb-0">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-black mb-1 uppercase leading-snug">
                    Can't find what you need?
                  </h3>
                  <p className="text-xs sm:text-sm font-medium text-red-100/90">
                    We will stock it for you on OZO within 24 hours!
                  </p>
                </div>

                <button
                  onClick={() => setIsRequestModalOpen(true)}
                  className="relative z-10 bg-white text-ozo-red hover:bg-red-50 px-4.5 py-2.5 md:px-6 md:py-3.5 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 hover:scale-105"
                >
                  Request Product
                </button>
              </div>

              {/* SECTION 5: Pocket-Friendly Bites (Under ₹50) */}
              {!!launchConfig?.show_budget_section && (
                <div className="bg-white dark:bg-[#111] border border-gray-100 dark:border-white/5 rounded-3xl p-5 md:p-6 shadow-premium transition-all duration-300">
                  <div className="flex items-start justify-between gap-2 md:gap-4 mb-6">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg md:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-tight">
                        Pocket-Friendly Bites / <span className="text-gradient">Under ₹50.</span>
                      </h3>
                      <p className="hidden sm:block text-xs text-zinc-500 dark:text-zinc-400 font-bold mt-1">Super cheap snacks, ice creams, and daily essentials for your cart</p>
                    </div>
                    <Link to="/products" className="text-xs text-ozo-red font-black uppercase tracking-wider hover:underline flex items-center gap-1 flex-shrink-0 whitespace-nowrap mt-1">
                      View All <ChevronRight size={14} />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {isBudgetLoading && displayBudgetProducts.length === 0 ? (
                      [...Array(4)].map((_, i) => (
                        <div key={i} className="h-72 bg-gray-100 dark:bg-white/5 rounded-3xl animate-pulse" />
                      ))
                    ) : (
                      displayBudgetProducts.slice(0, 8).map((product, idx) => (
                        <ProductCard key={product.id} product={product} index={idx} />
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>



          </div>
        </div>
      </section>

      {/* Bestseller Section */}
      <section className="py-12 bg-ozo-gray-bg dark:bg-[#0a0a0a] transition-colors border-t border-gray-100 dark:border-white/5">
        <div className="container-custom">
          <div className="flex items-start justify-between gap-2 md:gap-4 mb-8">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-tight">
                Best<span className="text-gradient">sellers.</span>
              </h2>
              <div className="h-1 w-20 bg-ozo-red mt-2 rounded-full" />
            </div>
            <Link to="/products?filter=bestseller" className="btn bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-ozo-red hover:text-ozo-red flex items-center gap-2 flex-shrink-0 whitespace-nowrap mt-1">
              See All <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
            {(isBestsellersLoading || isHomeDataLoading) && displayBestsellers.length === 0 ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="h-80 bg-white dark:bg-white/5 rounded-3xl animate-pulse" />
              ))
            ) : (
              displayBestsellers.map((product, idx) => (
                <ProductCard key={product.id} product={product} index={idx} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Promo Banner Section */}
      <section className="py-12">
        <div className="container-custom">
          <div className="relative rounded-3xl overflow-hidden bg-red-50/50 dark:bg-[#111111]/80 border border-red-100/50 dark:border-white/5 p-6 md:p-10 transition-colors duration-500">
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 dark:opacity-20 pointer-events-none">
               <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-ozo-red blur-[120px] rounded-full" />
            </div>
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-xl md:text-3xl font-black text-gray-900 dark:text-white mb-3 leading-tight uppercase tracking-tight">
                {freeAbove > 5000 
                  ? <>Fast & fresh delivery at your <span className="text-gradient">doorstep.</span></>
                  : <>Get FREE delivery on orders above ₹{freeAbove}<span className="text-gradient">.</span></>
                }
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm mb-6 font-medium leading-relaxed">
                Download the OZO app now and experience the fastest fresh delivery in India. Freshness guaranteed at your doorstep.
              </p>
              <div className="flex flex-wrap gap-3">
                  <Link 
                    to="/products"
                    className="flex items-center gap-2 text-white bg-ozo-red px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all transform hover:scale-105 active:scale-95 text-xs md:text-sm w-fit"
                  >
                    Shop Now <ArrowRight size={16} />
                  </Link>
                <button className="border border-ozo-red/20 dark:border-white/20 text-ozo-red dark:text-white px-5 py-2.5 rounded-xl font-bold hover:bg-ozo-red/5 dark:hover:bg-white/5 transition-all text-xs md:text-sm active:scale-95">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section className="py-12 bg-white dark:bg-[#0a0a0a] pb-24 transition-colors">
        <div className="container-custom">
          <div className="flex items-start justify-between gap-2 md:gap-4 mb-6">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-tight">
                Featured <span className="text-gradient">Products.</span>
              </h2>
              <div className="h-1 w-20 bg-ozo-red mt-2 rounded-full" />
            </div>
            <Link to="/products?filter=featured" className="btn bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-ozo-red hover:text-ozo-red flex items-center gap-2 flex-shrink-0 whitespace-nowrap mt-1">
              See All <ArrowRight size={18} />
            </Link>
          </div>

          {/* Category tabs/tablets for filtering */}
          <TopCategories
            selectedCategory={selectedFeaturedCategory}
            onSelectCategory={setSelectedFeaturedCategory}
          />

          <div
            key={selectedFeaturedCategory}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6"
          >
            {(isFeaturedLoading || isHomeDataLoading || isCategoryProductsLoading) ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="h-80 bg-white dark:bg-white/5 rounded-3xl animate-pulse" />
              ))
            ) : displayedFeaturedProducts.length === 0 ? (
              <div className="col-span-full py-12 text-center text-gray-500 font-bold">
                No products found in this category.
              </div>
            ) : (
              displayedFeaturedProducts.map((product, idx) => (
                <ProductCard key={product.id} product={product} index={idx} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Request Modal Overlay */}
      <AnimatePresence>
        {isRequestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] w-full max-w-lg p-6 md:p-8 shadow-2xl relative overflow-hidden"
            >
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-zinc-400 dark:text-zinc-505 transition-colors z-10"
              >
                <X size={20} />
              </button>

              <div className="mb-6">
                <span className="text-xs font-extrabold uppercase text-ozo-red tracking-widest block">
                  Direct to OZO Team
                </span>
                <h4 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mt-1">
                  Tell us what you need
                </h4>
                <p className="text-sm text-zinc-650 dark:text-zinc-300 font-medium mt-1.5 leading-relaxed">
                  We will make it available for you on OZO within 24 hours.
                </p>
              </div>

              <form onSubmit={handleRequestSubmit} className="space-y-5">
                {/* Scrollable Container to prevent overflow on mobile devices */}
                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2 scrollbar-thin">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                      What do you need? <span className="text-ozo-red">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Fortune Mustard Oil 1L, Amul Butter 500g"
                      value={requestName}
                      onChange={(e) => setRequestName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-medium text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-ozo-red/20 focus:border-ozo-red transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                      Additional details / notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Any specific brand preference, quantity or delivery urgency"
                      value={requestDescription}
                      onChange={(e) => setRequestDescription(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-medium text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-ozo-red/20 focus:border-ozo-red transition-all resize-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingRequest || isUploadingImage}
                  className="w-full py-3.5 bg-gradient-to-r from-ozo-red to-ozo-red-dark hover:from-ozo-red-dark hover:to-ozo-red text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-red-500/20 active:scale-95 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingRequest ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting Request...
                    </>
                  ) : (
                    <span>Submit Request</span>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Home