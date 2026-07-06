import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useEffect, useState, lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import OzoSplashScreen from './components/OzoSplashScreen'

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
        const isChunkLoadFailed = error.name === 'ChunkLoadError' || 
                                  error.message?.includes('Failed to fetch dynamically imported module') ||
                                  error.message?.includes('Error importing');
                                  
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
import { useCartStore } from './stores/cartStore'
import { useThemeStore } from './stores/themeStore'
import { useNotificationStore } from './stores/notificationStore'
import { useLanguageStore } from './stores/languageStore'
import { useLocationStore } from './stores/locationStore'

// Protected Route Component
import { initOneSignal } from './utils/onesignal'
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, profile, isAdmin, isInitialized } = useAuthStore()

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

  if (user && !profile?.phone) {
    return <Navigate to="/complete-profile" replace />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}

// Public Only Route (redirect if logged in)
const PublicOnlyRoute = ({ children }) => {
  const { user, profile, isInitialized } = useAuthStore()

  if (!isInitialized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-transparent">
        <div className="w-10 h-10 border-4 border-ozo-red border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm font-medium animate-pulse">Initializing session...</p>
      </div>
    )
  }

  if (user) {
    if (!profile?.phone) {
      return <Navigate to="/complete-profile" replace />
    }
    return <Navigate to="/" replace />
  }

  return children
}

// Complete Profile Route (only for authenticated users with incomplete profiles)
const CompleteProfileRoute = ({ children }) => {
  const { user, profile, isInitialized } = useAuthStore()

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

  if (user && profile?.phone) {
    return <Navigate to="/" replace />
  }

  return children
}

// Premium OZO Page Loader for React.Suspense
const OzoPageLoader = () => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center bg-transparent">
    <div className="relative flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-ozo-red/20 border-t-ozo-red rounded-full animate-spin" />
      <div className="absolute w-8 h-8 border-4 border-ozo-green/20 border-b-ozo-green rounded-full animate-spin [animation-direction:reverse] [animation-duration:1s]" />
    </div>
    <p className="mt-6 text-gray-850 dark:text-gray-200 text-xs font-black uppercase tracking-widest animate-pulse notranslate" translate="no">
      OZO is loading...
    </p>
  </div>
)

function App() {
  const { initializeAuth, user, isInitialized } = useAuthStore()
  const { fetchCart } = useCartStore()
  const { fetchNotifications, subscribeToNotifications, unsubscribeFromNotifications } = useNotificationStore()
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
      initOneSignal().catch(console.error)
      await initializeAuth()
      try {
        await useLocationStore.getState().fetchUserAddresses()
      } catch (err) {
        console.error('Failed to fetch/sync addresses on app init:', err)
      }
      try {
        await useCartStore.getState().fetchSettings()
      } catch (err) {
        console.error('Failed to fetch system settings on app init:', err)
      }
    }
    init()
    initTheme()
  }, [initializeAuth, initTheme])

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

  return (
    <>
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

      <Router basename="/" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <Suspense fallback={<OzoPageLoader />}>
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path=":city" element={<Home />} />
            <Route path="products" element={<Products />} />
            <Route path="product/:category/:slug" element={<ProductDetail />} />
            <Route path="product/:slug" element={<ProductDetail />} />
            <Route path=":city/:category/:slug" element={<ProductDetail />} />
            <Route path=":city/:slug" element={<ProductDetail />} />
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

            {/* Complete Profile Route */}
            <Route
              path="complete-profile"
              element={
                <CompleteProfileRoute>
                  <CompleteProfile />
                </CompleteProfileRoute>
              }
            />

            {/* Protected Routes */}
            <Route
              path="cart"
              element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              }
            />
            <Route
              path="checkout"
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="orders"
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              }
            />
            <Route
              path="order/:id"
              element={
                <ProtectedRoute>
                  <OrderDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile/addresses"
              element={
                <ProtectedRoute>
                  <Addresses />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile/payments"
              element={
                <ProtectedRoute>
                  <Payments />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings/security"
              element={
                <ProtectedRoute>
                  <Security />
                </ProtectedRoute>
              }
            />
            <Route
              path="wishlist"
              element={
                <ProtectedRoute>
                  <Wishlist />
                </ProtectedRoute>
              }
            />
            <Route
              path="notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="referral"
              element={
                <ProtectedRoute>
                  <Referral />
                </ProtectedRoute>
              }
            />

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
          </Route>

          {/* Mart & Captain Standalone Portals */}
          <Route
            path="/mart"
            element={
              <ProtectedRoute>
                <MartDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/captain"
            element={
              <ProtectedRoute>
                <CaptainDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rider-dashboard"
            element={
              <ProtectedRoute>
                <CaptainDashboard />
              </ProtectedRoute>
            }
          />

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