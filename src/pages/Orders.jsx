import { useEffect, useMemo, useCallback } from 'react'
import Breadcrumb from '../components/Breadcrumb'
import { useTranslation } from '../hooks/useTranslation'
import { motion } from 'framer-motion'
import { 
  Package, 
  ChevronRight, 
  Search, 
  Calendar, 
  MapPin, 
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
  XCircle,
  Truck,
  ExternalLink,
  RefreshCw
} from 'lucide-react'
import { useOrderStore } from '../stores/orderStore'
import { useCartStore } from '../stores/cartStore'
import { Link, useNavigate } from 'react-router-dom'
import { useOzoQuery } from '../hooks/useOzoQuery'
import OzoLoadingGuard from '../components/OzoLoadingGuard'
import OptimizedImage from '../components/OptimizedImage'

const getGoogleMapsUrl = (address, order) => {
  if (order && order.latitude && order.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${order.latitude},${order.longitude}`;
  }
  if (address && address.latitude && address.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${address.latitude},${address.longitude}`;
  }
  if (!address) return '';
  const addressParts = [
    address.address_line1,
    address.address_line2,
    address.city,
    address.state,
    address.pincode
  ].filter(Boolean);
  const addressString = addressParts.join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressString)}`;
};

const Orders = () => {
  const orders = useOrderStore(state => state.orders)
  const fetchOrders = useOrderStore(state => state.fetchOrders)
  const isCartLoading = useCartStore(state => state.isLoading)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const breadcrumbItems = useMemo(() => {
    return [
      { name: t('home') || 'Home', url: '/' },
      { name: t('myOrders') || 'My Orders', url: null }
    ]
  }, [t])

  const { isLoading: isOrdersLoading, isError, refetch } = useOzoQuery(
    async (signal) => {
      const res = await fetchOrders({ signal })
      if (!res.success) {
        throw res.error || new Error('Failed to fetch orders')
      }
    },
    [fetchOrders]
  )

  const handleOrderAgain = useCallback(async (orderItems) => {
    if (!orderItems || orderItems.length === 0) return
    const res = await useCartStore.getState().reorder(orderItems)
    if (res && res.success) {
      navigate('/cart')
    }
  }, [navigate])

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
      case 'DELIVERED_VERIFYING':
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-500/20'
      case 'cancelled':
      case 'CANCELLED_BY_USER':
        return 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20'
      case 'pending':
      case 'placed':
      case 'PLACED_COOLING':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20'
      case 'CONFIRMED_SYSTEM':
      case 'confirmed':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
      case 'preparing':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20'
      case 'packed':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20'
      case 'dispatched':
      case 'out_for_delivery':
      case 'assigned':
      case 'picked_up':
        return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20'
      case 'RETURN_REQUESTED':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400 border border-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
      case 'DELIVERED_VERIFYING':
      case 'COMPLETED':
        return <CheckCircle2 size={13} />
      case 'cancelled':
      case 'CANCELLED_BY_USER':
        return <XCircle size={13} />
      case 'pending':
      case 'placed':
      case 'PLACED_COOLING':
        return <Clock size={13} className="animate-pulse" />
      case 'CONFIRMED_SYSTEM':
      case 'confirmed':
        return <CheckCircle2 size={13} />
      case 'preparing':
        return <Clock size={13} />
      case 'packed':
        return <Package size={13} />
      case 'dispatched':
      case 'out_for_delivery':
      case 'assigned':
      case 'picked_up':
        return <Truck size={13} />
      case 'RETURN_REQUESTED':
        return <RefreshCw size={13} className="animate-spin" style={{ animationDuration: '4s' }} />
      default:
        return <Package size={13} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-[#0d0d0d] border-b border-gray-100 dark:border-white/5 pt-12 pb-8">
        <div className="container-custom">
          {/* SEO Breadcrumb Trail */}
          <Breadcrumb items={breadcrumbItems} className="mb-4" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white font-display mb-2">
                My <span className="text-ozo-red">Orders.</span>
              </h1>
              <p className="text-ozo-gray dark:text-gray-400 font-medium">Track and manage your order history</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ozo-gray dark:text-gray-500 group-focus-within:text-ozo-red transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Search by ID or product..."
                  className="pl-12 pr-6 py-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-ozo-red/20 transition-all font-bold text-sm min-w-[280px]"
                />
              </div>
              <button className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl text-ozo-gray hover:text-ozo-red transition-colors">
                <Filter size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-12">
        <OzoLoadingGuard
          isLoading={isOrdersLoading}
          isError={isError}
          onRetry={refetch}
          skeleton={
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 bg-white dark:bg-white/5 rounded-[2.5rem] animate-pulse border border-gray-50 dark:border-white/5" />
              ))}
            </div>
          }
          isEmpty={orders.length === 0}
          fallback={
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-24 h-24 bg-red-50 dark:bg-ozo-red/10 rounded-[2rem] flex items-center justify-center text-ozo-red mb-6 shadow-xl">
                <Package size={48} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">No Orders Yet</h2>
              <p className="text-ozo-gray dark:text-gray-400 font-medium max-w-sm mb-8">
                Looks like you haven't placed any orders yet. Start shopping and explore our fresh collection!
              </p>
              <Link to="/products" className="btn btn-primary px-10 rounded-2xl shadow-ozo">
                Start Shopping <ArrowRight size={20} />
              </Link>
            </motion.div>
          }
        >
          <div className="space-y-6">
            {orders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-[#121212] rounded-[2rem] shadow-sm hover:shadow-md border border-gray-100 dark:border-white/5 transition-all duration-300 overflow-hidden group"
              >
                {/* Header row: Order ID, Date, and Status */}
                <div className="px-6 py-4 bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
                    <span className="text-sm font-black text-gray-900 dark:text-white tracking-tight break-all">
                      Order #{order.order_number || order.id.slice(0, 8)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium flex-shrink-0">
                      • {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm border flex-shrink-0 ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    {order.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left part: product list compact badges */}
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-450 dark:text-gray-500 uppercase tracking-widest mb-3">Order Items</p>
                    <div className="flex flex-wrap gap-2.5 py-1">
                      {order.order_items && order.order_items.length > 0 ? (
                        order.order_items.map((item) => (
                          <div key={item.id} className="flex items-center gap-2.5 bg-gray-50 dark:bg-white/[0.02] border border-gray-150/40 dark:border-white/5 rounded-2xl p-1.5 pr-3 shadow-sm hover:shadow-md transition-all duration-200">
                            <div className="w-9 h-9 rounded-xl bg-white dark:bg-black/10 border border-gray-100 dark:border-white/5 flex-shrink-0 overflow-hidden p-0.5 flex items-center justify-center">
                              <OptimizedImage
                                src={item.product_image}
                                slug={item.product_slug || ''}
                                alt={item.product_name}
                                width={80}
                                className="w-full h-full object-contain rounded-lg"
                                containerClassName="w-full h-full"
                              />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate max-w-[110px] leading-tight">
                                {item.product_name}
                              </span>
                              <span className="text-[9px] text-gray-450 dark:text-gray-500 font-extrabold mt-0.5">
                                {item.quantity} x ₹{item.unit_price}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/[0.02] border border-gray-150/50 dark:border-white/10 rounded-2xl p-2 pr-3.5">
                          <Package size={16} className="text-gray-400" />
                          <span className="text-xs text-gray-500 font-semibold">No items info</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right part: Amount and delivery info */}
                  <div className="flex items-center gap-8 justify-between sm:justify-end flex-wrap sm:flex-nowrap border-t sm:border-t-0 pt-4 sm:pt-0 border-gray-100 dark:border-white/5">
                    <div className="text-left sm:text-right space-y-0.5">
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Total Amount</p>
                      <p className="text-base font-black text-gray-900 dark:text-white">₹{order.total.toLocaleString()}</p>
                    </div>
                    <div className="text-left sm:text-right space-y-0.5">
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Delivery To</p>
                      {order.address ? (
                        <a 
                          href={getGoogleMapsUrl(order.address, order)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-bold text-gray-900 dark:text-white hover:text-ozo-red transition-colors flex items-center gap-1 sm:justify-end group"
                          title="Open in Google Maps"
                        >
                          <MapPin size={12} className="text-ozo-green group-hover:text-ozo-red transition-colors" />
                          <span className="border-b border-dashed border-gray-400 dark:border-gray-600 group-hover:border-ozo-red">{order.address.city}</span>
                          <ExternalLink size={10} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      ) : (
                        <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1 sm:justify-end">
                          <MapPin size={12} className="text-ozo-green" />
                          <span>Default Location</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer bar: Payment summary and Actions */}
                <div className="px-6 py-4 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-ozo-green animate-pulse" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                      {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(order.status) && (
                      <button 
                        onClick={() => handleOrderAgain(order.order_items)}
                        disabled={isCartLoading}
                        className="text-xs text-ozo-red font-black uppercase tracking-wider hover:underline px-3 py-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCartLoading ? 'Adding...' : 'Order Again'}
                      </button>
                    )}
                    <Link 
                      to={`/order/${order.id}`}
                      className="px-5 py-2.5 bg-ozo-red hover:bg-ozo-red/90 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-sm shadow-ozo-red/20 active:scale-[0.98] flex items-center gap-1.5"
                    >
                      View Details
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </OzoLoadingGuard>
      </div>
    </div>
  )
}

export default Orders
