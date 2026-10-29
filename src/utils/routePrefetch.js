// Route prefetching utility for instant page transitions (0ms loading latency)
// Automatically preloads critical JS chunks in the background during idle time,
// and prefetches routes on link hover / touchstart.

const prefetchedRoutes = new Set()

// Mapping of route patterns to their dynamic import loaders
const routeLoaders = {
  '/': () => import('../pages/Home'),
  '/products': () => import('../pages/Products'),
  '/product': () => import('../pages/ProductDetail'),
  '/category': () => import('../pages/CategoryProducts'),
  '/categories': () => import('../pages/Categories'),
  '/cart': () => import('../pages/Cart'),
  '/checkout': () => import('../pages/Checkout'),
  '/orders': () => import('../pages/Orders'),
  '/profile': () => import('../pages/Profile'),
  '/search': () => import('../pages/SearchedPage'),
  '/wishlist': () => import('../pages/Wishlist'),
  '/help': () => import('../pages/Help'),
  '/offers': () => import('../pages/Offers')
}

/**
 * Prefetch a specific route chunk by path
 * @param {string} path - URL path (e.g. '/cart', '/categories', '/product/milk')
 */
export const prefetchRoute = (path) => {
  if (!path || typeof path !== 'string') return

  // Normalize path to match key in routeLoaders
  const cleanPath = path.split('?')[0].split('#')[0]

  let loader = null

  if (routeLoaders[cleanPath]) {
    loader = routeLoaders[cleanPath]
  } else if (cleanPath.startsWith('/category/') || cleanPath.includes('/category/')) {
    loader = routeLoaders['/category']
  } else if (cleanPath.startsWith('/product/') || cleanPath.split('/').length >= 4) {
    loader = routeLoaders['/product']
  } else if (cleanPath.startsWith('/order/')) {
    loader = () => import('../pages/OrderDetail')
  }

  if (loader && !prefetchedRoutes.has(loader)) {
    prefetchedRoutes.add(loader)
    try {
      // Execute the dynamic import to download and cache the JS chunk in browser cache
      loader().catch(() => {
        // Silently swallow in case of network issue; will retry on actual navigation
        prefetchedRoutes.delete(loader)
      })
    } catch (_) {}
  }
}

/**
 * Initialize idle prefetch for high-traffic routes
 * Uses requestIdleCallback so it runs strictly when the browser is not busy.
 */
export const initIdlePrefetch = () => {
  if (typeof window === 'undefined') return

  const preloadPriorityRoutes = () => {
    const priority = ['/products', '/product', '/categories', '/category', '/cart', '/profile', '/search']
    priority.forEach((path, index) => {
      setTimeout(() => {
        prefetchRoute(path)
      }, index * 250) // Stagger by 250ms so network stays quiet
    })
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      preloadPriorityRoutes()
    }, { timeout: 3000 })
  } else {
    setTimeout(preloadPriorityRoutes, 1500)
  }
}
