import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useEffect, useState, lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
// Intro splash component (commented out for now)
// import OzoSplashScreen from './components/OzoSplashScreen'
import { syncFcmTokenWithDatabase, onMessageListener } from './firebase'
import { supabase, authHelpers } from './lib/supabase'
import { initOneSignal } from './utils/onesignal'
import { useRef } from 'react'

// Layouts
import MainLayout from './layouts/MainLayout'
import AdminLayout from './layouts/AdminLayout'

// Helper for lazy loading with automatic retry on chunk load failure (e.g. on new deployments)
const lazyWithRetry = (importFn) => {
  return lazy(() => 
    importFn()
      .then((module) => {
        sessionStorage.removeItem('ozo-chunk-reload-attempted');
        return module;
      })
      .catch((error) => {
        const errorMsg = error.message || '';
        const isChunkLoadFailed = error.name === 'ChunkLoadError' || 
                                  errorMsg.includes('Failed to fetch dynamically imported module') ||
                                  errorMsg.includes('Error importing') ||
                                  errorMsg.includes('Unable to preload CSS') ||
                                  errorMsg.includes('preload CSS') ||
                                  errorMsg.includes('Load failed');
                                  
        if (isChunkLoadFailed) {
          const hasReloaded = sessionStorage.getItem('ozo-chunk-reload-attempted');
          if (!hasReloaded) {
            sessionStorage.setItem('ozo-chunk-reload-attempted', 'true');
            
            // Show toast notification and schedule a reload. We re-throw a
            // recognisable error so React Suspense propagates it to the nearest
            // ErrorBoundary, which renders the "Reload Page" UI instead of
            // leaving the Suspense fallback spinner frozen indefinitely.
            toast.loading('Updating OZO to the latest version...', {
              id: 'ozo-chunk-reload-toast',
              duration: 3500,
            });

            setTimeout(() => {
              window.location.reload();
            }, 1200);

            // Reject so the ErrorBoundary catches it — the page reloads in 1.2s
            // anyway, but this prevents the Suspense boundary from hanging forever
            // if the reload is somehow delayed.
            throw Object.assign(
              new Error('New version available — reloading...'),
              { isChunkReload: true }
            );
          } else {
            // Already reloaded once and failed — likely slow/offline network
            toast.error('Network connection is slow or offline. Please refresh the page manually.', {
              id: 'ozo-chunk-error-toast',
              duration: 6000,
            });
          }
        }
        throw error;
      })
  );
};

// Lazy loaded Pages
const Home = lazyWithRetry(() => import('./pages/Home'))
const Products = lazyWithRetry(() => import('./pages/Products'))
const ProductDetail = lazyWithRetry(() => import('./pages/ProductDetail'))
const Cart = lazyWithRetry(() => import('./pages/Cart'))
const ComboDetail = lazyWithRetry(() => import('./pages/ComboDetail'))
const Checkout = lazyWithRetry(() => import('./pages/Checkout'))
const Orders = lazyWithRetry(() => import('./pages/Orders'))
const OrderDetail = lazyWithRetry(() => import('./pages/OrderDetail'))
const Profile = lazyWithRetry(() => import('./pages/Profile'))
const Addresses = lazyWithRetry(() => import('./pages/Addresses'))
const Payments = lazyWithRetry(() => import('./pages/Payments'))
const Security = lazyWithRetry(() => import('./pages/Security'))
const Wishlist = lazyWithRetry(() => import('./pages/Wishlist'))
const SearchedPage = lazyWithRetry(() => import('./pages/SearchedPage'))
const SelectLocation = lazyWithRetry(() => import('./pages/SelectLocation'))
const Categories = lazyWithRetry(() => import('./pages/Categories'))
const CategoryProducts = lazyWithRetry(() => import('./pages/CategoryProducts'))
const Auth = lazyWithRetry(() => import('./pages/Auth'))
const AuthCallback = lazyWithRetry(() => import('./pages/AuthCallback'))
const CompleteProfile = lazyWithRetry(() => import('./pages/CompleteProfile'))
const NotFound = lazyWithRetry(() => import('./pages/NotFound'))
const Help = lazyWithRetry(() => import('./pages/Help'))
const Offers = lazyWithRetry(() => import('./pages/Offers'))
const About = lazyWithRetry(() => import('./pages/About'))
const Contact = lazyWithRetry(() => import('./pages/Contact'))
const PrivacyPolicy = lazyWithRetry(() => import('./pages/PrivacyPolicy'))
const TermsOfService = lazyWithRetry(() => import('./pages/TermsOfService'))
const RefundPolicy = lazyWithRetry(() => import('./pages/RefundPolicy'))
const CookiePolicy = lazyWithRetry(() => import('./pages/CookiePolicy'))
const ShippingPolicy = lazyWithRetry(() => import('./pages/ShippingPolicy'))
const Careers = lazyWithRetry(() => import('./pages/Careers'))
const Blog = lazyWithRetry(() => import('./pages/Blog'))
const BlogDetail = lazyWithRetry(() => import('./pages/BlogDetail'))
const Press = lazyWithRetry(() => import('./pages/Press'))
const Notifications = lazyWithRetry(() => import('./pages/Notifications'))
const Settings = lazyWithRetry(() => import('./pages/Settings'))
const Developer = lazyWithRetry(() => import('./pages/Developer'))
const Referral = lazyWithRetry(() => import('./pages/Referral'))
const MartProfile = lazyWithRetry(() => import('./pages/MartProfile'))
const PhoneCapture = lazyWithRetry(() => import('./pages/PhoneCapture'))


// Lazy loaded Admin Pages
const AdminDashboard = lazyWithRetry(() => import('./pages/admin/Dashboard'))
const AdminProducts = lazyWithRetry(() => import('./pages/admin/Products'))
const AdminProfitOptimizer = lazyWithRetry(() => import('./pages/admin/ProfitOptimizer'))
const AdminCategories = lazyWithRetry(() => import('./pages/admin/Categories'))
const AdminCities = lazyWithRetry(() => import('./pages/admin/Cities'))
const AdminOrders = lazyWithRetry(() => import('./pages/admin/Orders'))
const AdminOffers = lazyWithRetry(() => import('./pages/admin/Offers'))
const AdminUsers = lazyWithRetry(() => import('./pages/admin/Users'))
const AdminRequests = lazyWithRetry(() => import('./pages/admin/Requests'))
const AdminReviews = lazyWithRetry(() => import('./pages/admin/Reviews'))
const AdminSqlConsole = lazyWithRetry(() => import('./pages/admin/SqlConsole'))
const AdminSettings = lazyWithRetry(() => import('./pages/admin/Settings'))
const AdminMessages = lazyWithRetry(() => import('./pages/admin/Messages'))
const AdminSeoDashboard = lazyWithRetry(() => import('./pages/admin/SeoDashboard'))
const AdminRiders = lazyWithRetry(() => import('./pages/admin/RiderManageAdmin'))
const AdminMarts = lazyWithRetry(() => import('./pages/admin/MartManageAdmin'))
const AdminMartPayouts = lazyWithRetry(() => import('./pages/admin/MartPayoutsAdmin'))
const AdminBackup = lazyWithRetry(() => import('./pages/admin/Backup'))
const AdminBlog = lazyWithRetry(() => import('./pages/admin/Blog'))
const AdminPhoneCaptureSandbox = lazyWithRetry(() => import('./pages/admin/PhoneCaptureSandbox'))
const AdminFestivals = lazyWithRetry(() => import('./pages/admin/Festivals'))
const AdminErrorLogs = lazyWithRetry(() => import('./pages/admin/ErrorLogs'))


// Lazy loaded Mart & Captain Dashboards
const MartDashboard = lazyWithRetry(() => import('./pages/mart/Dashboard'))
const CaptainDashboard = lazyWithRetry(() => import('./pages/captain/Dashboard'))

// Components
import ScrollToTop from './components/ScrollToTop'
import NotificationPromptModal from './components/NotificationPromptModal'
import ServiceabilityModal from './components/ServiceabilityModal'
import LocationPromptModal from './components/LocationPromptModal'

// Hooks
import { useAuthStore } from './stores/authStore'
import { useCartStore, applyDynamicTheme } from './stores/cartStore'
import { useThemeStore } from './stores/themeStore'
import { useNotificationStore } from './stores/notificationStore'
import { useLanguageStore } from './stores/languageStore'
import { useLocationStore } from './stores/locationStore'

// Protected Route Component (requires authentication)
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, isInitialized, isAdmin, profile } = useAuthStore()

  useEffect(() => {
    // Safety fallback: If session initialization takes more than 5 seconds
    // (matching the 4s session-fetch timeout + margin), force isInitialized
    // so the user is never stuck on a blank/spinner screen.
    if (!isInitialized) {
      const timer = setTimeout(() => {
        if (!useAuthStore.getState().isInitialized) {
          console.warn('[ProtectedRoute] Session init timeout safety triggered.')
          useAuthStore.setState({ isInitialized: true })
        }
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [isInitialized])

  if (!isInitialized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-transparent">
        <div className="w-10 h-10 border-4 border-ozo-red border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm font-medium animate-pulse">Initializing session...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  if (adminOnly) {
    // Check both the store flag AND direct profile roles as a safety net
    // in case the persisted isAdmin is stale from a previous session.
    const hasAdminRole = isAdmin ||
      profile?.isSuperAdmin ||
      profile?.isCityManager ||
      profile?.role === 'super_admin' ||
      profile?.role === 'admin' ||
      profile?.role === 'city_manager'
    if (!hasAdminRole) {
      return <Navigate to="/" replace />
    }
  }

  return children ? children : <Outlet />
}

// Public Only Route (redirect if logged in)
const PublicOnlyRoute = ({ children }) => {
  const { user } = useAuthStore()

  if (user) {
    return <Navigate to="/" replace />
  }

  return children ? children : <Outlet />
}

// Complete Profile Route — directly queries public.users to verify phone.
// Never trusts the in-memory store profile, which may be stale or missing.
const CompleteProfileRoute = ({ children }) => {
  const { user, isInitialized } = useAuthStore()
  const [checking, setChecking] = useState(true)
  const [hasPhone, setHasPhone] = useState(false)
  const checkedRef = useRef(false)

  useEffect(() => {
    if (!user?.id || checkedRef.current) return
    checkedRef.current = true

    const checkPhone = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token
        if (token && typeof window !== 'undefined') {
          window.__ozo_access_token = token
        }

        const { data: dbProfile } = await authHelpers.getUserProfile(user.id, token)

        if (dbProfile?.phone) {
          setHasPhone(true)
          useAuthStore.setState((state) => ({
            profile: {
              ...(state.profile || {}),
              ...dbProfile,
              isFallback: false,
            }
          }))
        }
      } catch (err) {
        console.warn('[CompleteProfileRoute] DB phone check failed:', err)
      } finally {
        setChecking(false)
      }
    }

    checkPhone()
  }, [user?.id])

  if (!isInitialized || (user && checking)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-transparent">
        <div className="w-10 h-10 border-4 border-ozo-red border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm font-medium animate-pulse">Checking profile status...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  // Phone confirmed in DB — no need to complete profile
  if (hasPhone) {
    return <Navigate to="/" replace />
  }

  // Phone is genuinely missing in DB — show the form
  return children
}

// Normal OZO Shimmer Page Loader for React.Suspense
const OzoPageLoader = () => (
  <div className="min-h-[80vh] container-custom py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fade-in">
    {/* Banner shimmer */}
    <div className="w-full h-36 sm:h-64 rounded-3xl shimmer" />
    
    {/* Title shimmer */}
    <div className="flex justify-between items-center">
      <div className="w-40 sm:w-48 h-7 sm:h-8 rounded-xl shimmer" />
      <div className="w-20 sm:w-24 h-5 sm:h-6 rounded-lg shimmer" />
    </div>

    {/* Grid shimmer */}
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-[#161616] p-3 sm:p-4 rounded-3xl space-y-3 border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="w-full h-28 sm:h-32 rounded-2xl shimmer" />
          <div className="w-3/4 h-3.5 sm:h-4 rounded-lg shimmer" />
          <div className="w-1/2 h-3 rounded-lg shimmer" />
          <div className="flex justify-between items-center pt-1 sm:pt-2">
            <div className="w-12 sm:w-16 h-4 sm:h-5 rounded-lg shimmer" />
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl shimmer" />
          </div>
        </div>
      ))}
    </div>
  </div>
)

function App() {
  const { initializeAuth, user, isInitialized } = useAuthStore()
  const { fetchCart } = useCartStore()
  const { fetchNotifications, subscribeToNotifications, unsubscribeFromNotifications } = useNotificationStore()
  // Intro splash screen disabled for now
  /*
  const [showSplash, setShowSplash] = useState(() => {
    try {
      // Skip splash if shown in the current tab session (handles reloads/refreshes)
      if (sessionStorage.getItem('ozo_splash_shown') === 'true') {
        return false;
      }
      // Skip splash if shown in the last 30 minutes (handles rapid revisits/new tabs)
      const lastShown = localStorage.getItem('ozo_splash_last_shown');
      if (lastShown) {
        const timeDiff = Date.now() - parseInt(lastShown, 10);
        const cooldown = 30 * 60 * 1000; // 30 minutes cooldown
        if (timeDiff < cooldown) {
          sessionStorage.setItem('ozo_splash_shown', 'true');
          return false;
        }
      }
    } catch (e) {
      console.warn('Splash state check error:', e);
    }
    return true;
  })
  */
  const [showSplash, setShowSplash] = useState(false)
  const themeConfig = useCartStore(state => state.themeConfig)

  useEffect(() => {
    if (themeConfig) {
      applyDynamicTheme(themeConfig)
    }
  }, [themeConfig])

  const { initTheme } = useThemeStore()
  const { language } = useLanguageStore()
  const { coordinates, detectLocation, fetchActiveCities } = useLocationStore()

  // Geolocation and active cities fetch relocated to MainLayout.jsx (inside Router context)

  useEffect(() => {
    const loadGoogleTranslate = () => {
      // 1. If script is already injected, check if we need to initialize TranslateElement
      if (document.getElementById('google-translate-script')) {
        if (window.google?.translate?.TranslateElement) {
          try {
            if (!document.querySelector('.goog-te-combo')) {
              new window.google.translate.TranslateElement({
                pageLanguage: 'en',
                includedLanguages: 'hi,ta,te,kn', 
                autoDisplay: false
              }, 'google_translate_element');
            }
          } catch (e) {
            console.error('Google Translate Init Error:', e);
          }
        }
        return;
      }

      // 2. Set the global initialization callback
      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: 'hi,ta,te,kn', 
          autoDisplay: false
        }, 'google_translate_element');
      };

      // 3. Create and inject script tag
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.type = 'text/javascript';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    };

    // Sync Google Translate cookie
    if (language && language !== 'en') {
      document.cookie = `googtrans=/en/${language}; path=/;`;
      document.cookie = `googtrans=/en/${language}; path=/; domain=${window.location.hostname};`;
      document.cookie = `googtrans=/en/${language}; path=/; domain=.${window.location.hostname};`;
      
      const parts = window.location.hostname.split('.');
      if (parts.length >= 2) {
        const rootDomain = parts.slice(-2).join('.');
        document.cookie = `googtrans=/en/${language}; path=/; domain=${rootDomain};`;
        document.cookie = `googtrans=/en/${language}; path=/; domain=.${rootDomain};`;
      }
      
      // Load Google Translate script dynamically on demand
      loadGoogleTranslate();
    } else {
      // Clear cookie comprehensively for all domain variations to ensure English is default
      const domains = [
        window.location.hostname,
        '.' + window.location.hostname,
        ''
      ];
      
      const parts = window.location.hostname.split('.');
      if (parts.length >= 2) {
        const rootDomain = parts.slice(-2).join('.');
        domains.push(rootDomain);
        domains.push('.' + rootDomain);
      }
      
      domains.forEach(d => {
        const domainAttr = d ? `; domain=${d}` : '';
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/${domainAttr}`;
      });

      // If page is already translated, switch combo back to english
      const combo = document.querySelector('.goog-te-combo');
      if (combo) {
        combo.value = 'en';
        combo.dispatchEvent(new Event('change'));
      }
    }
  }, [language])

  useEffect(() => {
    // Initialize auth, local/sync addresses, theme, and OneSignal on app load
    const init = async () => {
      // Non-blocking OneSignal init
      initOneSignal().catch((err) => console.warn('[OneSignal] Non-fatal init warning:', err))

      await initializeAuth()
      try {
        useLocationStore.getState().fetchUserAddresses().catch(() => {})
      } catch (err) {
        console.error('Failed to fetch/sync addresses on app init:', err)
      }
      try {
        useCartStore.getState().fetchSettings().catch(() => {})
      } catch (err) {
        console.error('Failed to fetch system settings on app init:', err)
      }
    }
    init()
    initTheme()
  }, [initializeAuth, initTheme])

  useEffect(() => {
    // Subscribe to realtime updates on app_settings table to sync settings and theme
    const channel = supabase
      .channel('public:app_settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        (payload) => {
          console.log('[OZO Realtime] app_settings change detected:', payload)
          if (payload.new) {
            const key = payload.new.key
            const val = payload.new.value
            
            // Immediately apply theme changes without waiting for fetchSettings network trip
            if (key === 'theme_config') {
              useCartStore.setState({ themeConfig: val })
              applyDynamicTheme(val)
            }
          }
          // Fetch settings to update stores in sync, bypassing cache
          useCartStore.getState().fetchSettings(true).catch(() => {})
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    // Fetch cart and notifications when user logs in
    if (user) {
      fetchCart()
      fetchNotifications()
      subscribeToNotifications()
    } else {
      unsubscribeFromNotifications()
    }
    return () => {
      unsubscribeFromNotifications()
    }
  }, [user, fetchCart, fetchNotifications, subscribeToNotifications, unsubscribeFromNotifications])

  // Firebase Cloud Messaging (FCM) Integration for Push Notifications
  useEffect(() => {
    let unsubscribe = () => {}

    if (user) {
      // 1. Request FCM Token silently on mount or user login (do NOT force prompt)
      syncFcmTokenWithDatabase(user.id, false)

      // 2. Register Foreground Message listener
      unsubscribe = onMessageListener((payload) => {
        const title = payload.notification?.title || 'Order Update'
        const body = payload.notification?.body || 'You have received a new update.'
        
        toast.success(
          <div className="flex flex-col text-left">
            <span className="font-semibold text-sm text-gray-900">{title}</span>
            <span className="text-xs text-gray-500 mt-0.5">{body}</span>
          </div>,
          {
            duration: 6000,
            icon: '🔔',
            style: {
              borderRadius: '16px',
              background: '#ffffff',
              color: '#333333',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              padding: '12px 16px',
            }
          }
        )
      })
    }

    return () => {
      unsubscribe()
    }
  }, [user])


  return (
    <>
      {/* Intro splash screen disabled/commented out for now
      <AnimatePresence mode="wait">
        {showSplash && (
          <OzoSplashScreen
            key="splash"
            onAnimationComplete={() => {
              try {
                sessionStorage.setItem('ozo_splash_shown', 'true');
                localStorage.setItem('ozo_splash_last_shown', Date.now().toString());
              } catch (e) {
                console.warn('Failed to save splash state:', e);
              }
              setShowSplash(false);
            }}
          />
        )}
      </AnimatePresence>
      */}

      <Router basename="/" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <Suspense fallback={<OzoPageLoader />}>
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="products" element={<Products />} />
            <Route path="product/:category/:slug" element={<ProductDetail />} />
            <Route path="product/:slug" element={<ProductDetail />} />
            <Route path="combo/:id" element={<ComboDetail />} />
            <Route path="categories" element={<Categories />} />
            <Route path="category/:slug" element={<CategoryProducts />} />
            <Route path="search" element={<SearchedPage />} />
            <Route path="select-location" element={<SelectLocation />} />
            <Route path="help" element={<Help />} />
            <Route path="offers" element={<Offers />} />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="privacy" element={<PrivacyPolicy />} />
            <Route path="terms" element={<TermsOfService />} />
            <Route path="refund-policy" element={<RefundPolicy />} />
            <Route path="cookies" element={<CookiePolicy />} />
            <Route path="shipping" element={<ShippingPolicy />} />
            <Route path="careers" element={<Careers />} />
            <Route path="blog" element={<Blog />} />
            <Route path="blog/:slug" element={<BlogDetail />} />
            <Route path="press" element={<Press />} />
            <Route path="developer" element={<Developer />} />
            <Route path="founder" element={<Developer />} />
            <Route path="mart/:slug" element={<MartProfile />} />

            {/* Auth Route */}
            <Route
              path="auth"
              element={
                <PublicOnlyRoute>
                  <Auth />
                </PublicOnlyRoute>
              }
            />

            {/* Auth Callback Route — handles Google OAuth redirect */}
            <Route path="auth/callback" element={<AuthCallback />} />
            {/* Legacy callback path — keep for backward compatibility */}
            <Route path="auth/v1/callback" element={<AuthCallback />} />

            {/* Complete Profile Route */}
            <Route
              path="complete-profile"
              element={
                <CompleteProfileRoute>
                  <CompleteProfile />
                </CompleteProfileRoute>
              }
            />

            {/* Protected Routes Group (Layout-level Route Guard) */}
            <Route element={<ProtectedRoute />}>
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="orders" element={<Orders />} />
              <Route path="order/:id" element={<OrderDetail />} />
              <Route path="profile" element={<Profile />} />
              <Route path="profile/addresses" element={<Addresses />} />
              <Route path="profile/payments" element={<Payments />} />
              <Route path="settings/security" element={<Security />} />
              <Route path="wishlist" element={<Wishlist />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="settings" element={<Settings />} />
              <Route path="referral" element={<Referral />} />
            </Route>

            {/* Dynamic parameters routes placed last to prevent greeting static routes like auth/v1/callback */}
            <Route path=":city" element={<Home />} />
            <Route path=":city/category/:slug" element={<CategoryProducts />} />
            <Route path=":city/:category/:slug" element={<ProductDetail />} />
            <Route path=":city/:slug" element={<ProductDetail />} />

          </Route>

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="profit-optimizer" element={<AdminProfitOptimizer />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="cities" element={<AdminCities />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="offers" element={<AdminOffers />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="requests" element={<AdminRequests />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="sql" element={<AdminSqlConsole />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="seo" element={<AdminSeoDashboard />} />
            <Route path="riders" element={<AdminRiders />} />
            <Route path="marts" element={<AdminMarts />} />
            <Route path="marts/payouts" element={<AdminMartPayouts />} />
            <Route path="backup" element={<AdminBackup />} />
            <Route path="blog" element={<AdminBlog />} />
            <Route path="phone-capture-sandbox" element={<AdminPhoneCaptureSandbox />} />
            <Route path="festivals" element={<AdminFestivals />} />
            <Route path="errors" element={<AdminErrorLogs />} />
          </Route>

          {/* Mart & Captain Standalone Portals */}
          <Route element={<ProtectedRoute />}>
            <Route path="/mart" element={<MartDashboard />} />
            <Route path="/captain" element={<CaptainDashboard />} />
            <Route path="/rider-dashboard" element={<CaptainDashboard />} />
          </Route>

          <Route path="/capture/:sessionId" element={<PhoneCapture />} />

          {/* 404 Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>

        {/* Global Modals inside Router Context */}
        <NotificationPromptModal />
        <ServiceabilityModal />
        <LocationPromptModal />
      </Router>
    </>
  )
}

export default App