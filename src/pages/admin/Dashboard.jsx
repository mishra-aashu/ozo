import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package,
  ShoppingBag,
  Tag,
  Users,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Plus,
  DollarSign,
  Star,
  Clock,
  Truck,
  CheckCircle2,
  RefreshCw,
  Eye,
  Activity,
  UserCheck,
  ChevronRight,
  Settings,
  ShieldCheck,
  MessageSquare,
  Bike,
  Store,
  Stethoscope,
  Wrench,
  Pill,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Layers,
  MapPin,
  RotateCcw,
  Sparkles,
  Calendar,
  Building2,
  FileText
} from 'lucide-react'
import { supabaseAdmin } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

const Dashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    productsCount: 0,
    outOfStockCount: 0,
    categoriesCount: 0,
    martsCount: 0,
    ordersCount: 0,
    usersCount: 0,
    captainsCount: 0,
    activeCaptainsCount: 0,
    revenue: 0,
    todaySales: 0,
    todayOrdersCount: 0,
    avgRating: 0.0,
    deliveredOrdersCount: 0,
    activeOrdersCount: 0,
    pendingOrdersCount: 0,
    cancelledOrdersCount: 0,
    // Ecosystem stats
    doctorsCount: 0,
    pharmaciesCount: 0,
    careAppointmentsCount: 0,
    servicesCount: 0,
    serviceCategoriesCount: 0
  })

  // Pending requests breakdown
  const [pendingRequests, setPendingRequests] = useState({
    pendingCaptains: 0,
    pendingMarts: 0,
    pendingDoctors: 0,
    pendingPharmacies: 0,
    pendingReturns: 0,
    pendingInquiries: 0,
    openTickets: 0
  })

  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [recentProducts, setRecentProducts] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [topSellers, setTopSellers] = useState([])
  const [criticalLowStock, setCriticalLowStock] = useState([])
  const [dailyData, setDailyData] = useState([])
  const [allOrders, setAllOrders] = useState([])
  const [chartTimeframe, setChartTimeframe] = useState(30)
  
  // Interactive Chart States
  const [activeChartTab, setActiveChartTab] = useState('sales') // 'sales' or 'orders'
  const [hoveredPoint, setHoveredPoint] = useState(null)

  const fetchDashboardStats = async (isSync = false) => {
    if (isSync) setSyncing(true)
    else setLoading(true)

    // Resolve user roles and scoped entities
    const { profile, getScopedCities } = useAuthStore.getState()
    const isCityManager = profile?.isCityManager
    const scopedCities = isCityManager ? getScopedCities() : []

    let scopedMartIds = []
    let riderUserIds = []

    if (isCityManager) {
      try {
        if (scopedCities.length > 0) {
          const { data: managerMarts } = await supabaseAdmin
            .from('marts')
            .select('id')
            .in('city_id', scopedCities)
          scopedMartIds = (managerMarts || []).map(m => m.id)
        }

        if (scopedCities.length > 0) {
          const { data: riderRoles } = await supabaseAdmin
            .from('user_roles')
            .select('user_id')
            .eq('role', 'rider')
            .in('city_id', scopedCities)
          riderUserIds = (riderRoles || []).map(r => r.user_id)
        }
      } catch (err) {
        console.error('[Dashboard] Error pre-fetching scoping data:', err)
      }
    }

    const timeoutMs = 8000
    const withTimeout = (promise) => 
      Promise.race([
        promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database request timed out')), timeoutMs)
        )
      ])

    try {
      // 1. Core Mart queries
      let productsQuery = supabaseAdmin.from('products').select('*', { count: 'exact', head: true })
      let outOfStockQuery = supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('is_available', false)
      let categoriesQuery = supabaseAdmin.from('categories').select('*', { count: 'exact', head: true })
      let martsQuery = supabaseAdmin.from('marts').select('*', { count: 'exact', head: true })
      let usersQuery = supabaseAdmin.from('users').select('*', { count: 'exact', head: true })
      let captainsQuery = supabaseAdmin.from('captains').select('status')
      let reviewsQuery = supabaseAdmin.from('reviews').select('rating')
      let ordersQuery = supabaseAdmin.from('orders').select('total, status, created_at')
      let recentOrdersQuery = supabaseAdmin.from('orders').select(`
        id,
        order_number,
        total,
        status,
        created_at,
        payment_status,
        payment_method,
        customer:users (
          full_name,
          email,
          phone,
          avatar_url
        )
      `).order('created_at', { ascending: false }).limit(5)
      let itemsQuery = supabaseAdmin.from('order_items').select('product_name, quantity, total_price, order:orders(status)').limit(500)
      let recentProdQuery = supabaseAdmin.from('products').select('id, name, price, mrp, image_url, created_at').order('created_at', { ascending: false }).limit(4)
      let lowStockListQuery = supabaseAdmin.from('products').select('id, name, price, mrp, image_url, is_available').eq('is_available', false).limit(4)

      // 2. Pending requests & cross-vertical queries
      let pendingCaptainsQuery = supabaseAdmin.from('captains').select('id', { count: 'exact', head: true }).eq('status', 'pending_verification')
      let pendingMartsQuery = supabaseAdmin.from('mart_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending_verification')
      let pendingDoctorsQuery = supabaseAdmin.from('care_doctors').select('id', { count: 'exact', head: true }).eq('is_verified', false)
      let pendingPharmaciesQuery = supabaseAdmin.from('care_pharmacies').select('id', { count: 'exact', head: true }).eq('is_verified', false)
      let pendingReturnsQuery = supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'RETURN_REQUESTED')
      let pendingInquiriesQuery = supabaseAdmin.from('service_inquiries').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      let openTicketsQuery = supabaseAdmin.from('contact_messages').select('id', { count: 'exact', head: true }).or('status.eq.new,status.eq.unread,is_read.eq.false')

      // 3. Multi-vertical health metrics
      let doctorsTotalQuery = supabaseAdmin.from('care_doctors').select('id', { count: 'exact', head: true })
      let pharmaciesTotalQuery = supabaseAdmin.from('care_pharmacies').select('id', { count: 'exact', head: true })
      let appointmentsQuery = supabaseAdmin.from('care_appointments').select('id', { count: 'exact', head: true })
      let servicesQuery = supabaseAdmin.from('services_catalog').select('id', { count: 'exact', head: true })
      let serviceCategoriesQuery = supabaseAdmin.from('service_categories').select('id', { count: 'exact', head: true })

      if (isCityManager) {
        if (scopedMartIds.length > 0) {
          productsQuery = productsQuery.in('mart_id', scopedMartIds)
          outOfStockQuery = outOfStockQuery.in('mart_id', scopedMartIds)
          ordersQuery = ordersQuery.in('mart_id', scopedMartIds)
          recentOrdersQuery = recentOrdersQuery.in('mart_id', scopedMartIds)
          recentProdQuery = recentProdQuery.in('mart_id', scopedMartIds)
          lowStockListQuery = lowStockListQuery.in('mart_id', scopedMartIds)
          
          itemsQuery = supabaseAdmin.from('order_items')
            .select('product_name, quantity, total_price, order:orders!inner(status, mart_id)')
            .in('order.mart_id', scopedMartIds)
            .limit(500)

          reviewsQuery = supabaseAdmin.from('reviews')
            .select('rating, products!inner(mart_id)')
            .in('products.mart_id', scopedMartIds)
        } else {
          productsQuery = productsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
          outOfStockQuery = outOfStockQuery.eq('id', '00000000-0000-0000-0000-000000000000')
          ordersQuery = ordersQuery.eq('id', '00000000-0000-0000-0000-000000000000')
          recentOrdersQuery = recentOrdersQuery.eq('id', '00000000-0000-0000-0000-000000000000')
          recentProdQuery = recentProdQuery.eq('id', '00000000-0000-0000-0000-000000000000')
          lowStockListQuery = lowStockListQuery.eq('id', '00000000-0000-0000-0000-000000000000')
          
          itemsQuery = supabaseAdmin.from('order_items')
            .select('product_name, quantity, total_price, order:orders!inner(status, mart_id)')
            .eq('id', '00000000-0000-0000-0000-000000000000')
            .limit(500)

          reviewsQuery = supabaseAdmin.from('reviews')
            .select('rating, products!inner(mart_id)')
            .eq('id', '00000000-0000-0000-0000-000000000000')
        }

        if (scopedCities.length > 0) {
          martsQuery = martsQuery.in('city_id', scopedCities)
        } else {
          martsQuery = martsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
        }

        if (riderUserIds.length > 0) {
          captainsQuery = captainsQuery.in('id', riderUserIds)
          pendingCaptainsQuery = pendingCaptainsQuery.in('id', riderUserIds)
        } else {
          captainsQuery = captainsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
          pendingCaptainsQuery = pendingCaptainsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
        }

        if (scopedMartIds.length > 0) {
          usersQuery = supabaseAdmin.from('users')
            .select('*, orders!inner(mart_id)', { count: 'exact', head: true })
            .in('orders.mart_id', scopedMartIds)
        } else {
          usersQuery = usersQuery.eq('id', '00000000-0000-0000-0000-000000000000')
        }
      }

      const [
        productsRes,
        outOfStockRes,
        categoriesRes,
        martsRes,
        usersRes,
        captainsRes,
        reviewsRes,
        ordersRes,
        recentOrdersRes,
        itemsRes,
        recentProdRes,
        lowStockRes,
        pendingCaptainsRes,
        pendingMartsRes,
        pendingDoctorsRes,
        pendingPharmaciesRes,
        pendingReturnsRes,
        pendingInquiriesRes,
        openTicketsRes,
        doctorsTotalRes,
        pharmaciesTotalRes,
        appointmentsRes,
        servicesRes,
        serviceCategoriesRes
      ] = await Promise.allSettled([
        withTimeout(productsQuery),
        withTimeout(outOfStockQuery),
        withTimeout(categoriesQuery),
        withTimeout(martsQuery),
        withTimeout(usersQuery),
        withTimeout(captainsQuery),
        withTimeout(reviewsQuery),
        withTimeout(ordersQuery),
        withTimeout(recentOrdersQuery),
        withTimeout(itemsQuery),
        withTimeout(recentProdQuery),
        withTimeout(lowStockListQuery),
        withTimeout(pendingCaptainsQuery),
        withTimeout(pendingMartsQuery),
        withTimeout(pendingDoctorsQuery),
        withTimeout(pendingPharmaciesQuery),
        withTimeout(pendingReturnsQuery),
        withTimeout(pendingInquiriesQuery),
        withTimeout(openTicketsQuery),
        withTimeout(doctorsTotalQuery),
        withTimeout(pharmaciesTotalQuery),
        withTimeout(appointmentsQuery),
        withTimeout(servicesQuery),
        withTimeout(serviceCategoriesQuery)
      ])

      // Helper for counts
      const countOf = (res) => (res.status === 'fulfilled' && res.value?.count != null ? res.value.count : 0)
      const dataOf = (res) => (res.status === 'fulfilled' && res.value?.data ? res.value.data : [])

      const productsCount = countOf(productsRes)
      const outOfStockCount = countOf(outOfStockRes)
      const categoriesCount = countOf(categoriesRes)
      const martsCount = countOf(martsRes)
      const usersCount = countOf(usersRes)
      
      const captainsData = dataOf(captainsRes)
      const reviewsData = dataOf(reviewsRes)
      const ordersData = dataOf(ordersRes)
      const recentOrdersData = dataOf(recentOrdersRes)
      const itemsData = dataOf(itemsRes)
      const recentProdData = dataOf(recentProdRes)
      const lowStockData = dataOf(lowStockRes)

      // Pending counts
      const pendingCaptains = countOf(pendingCaptainsRes)
      const pendingMarts = countOf(pendingMartsRes)
      const pendingDoctors = countOf(pendingDoctorsRes)
      const pendingPharmacies = countOf(pendingPharmaciesRes)
      const pendingReturns = countOf(pendingReturnsRes)
      const pendingInquiries = countOf(pendingInquiriesRes)
      const openTickets = countOf(openTicketsRes)

      // Ecosystem counts
      const doctorsCount = countOf(doctorsTotalRes)
      const pharmaciesCount = countOf(pharmaciesTotalRes)
      const careAppointmentsCount = countOf(appointmentsRes)
      const servicesCount = countOf(servicesRes)
      const serviceCategoriesCount = countOf(serviceCategoriesRes)

      // Calculate Captain counts
      const captainsCount = captainsData.length
      const activeCaptainsCount = captainsData.filter(c => c.status === 'online' || c.status === 'busy' || c.status === 'active').length

      // Calculate Review Average
      const avgRating = reviewsData.length > 0
        ? parseFloat((reviewsData.reduce((acc, r) => acc + (r.rating || 0), 0) / reviewsData.length).toFixed(1))
        : 0.0

      // Calculate Orders count & delivered revenue
      const ordersCount = ordersData.length
      const revenue = ordersData
        ? ordersData
            .filter(o => ['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(o.status))
            .reduce((acc, curr) => acc + parseFloat(curr.total || 0), 0)
        : 0

      // Calculate Today's Stats (since midnight)
      const todayMidnight = new Date()
      todayMidnight.setHours(0, 0, 0, 0)
      const todayOrders = ordersData.filter(o => new Date(o.created_at) >= todayMidnight)
      const todayOrdersCount = todayOrders.length
      const todaySales = todayOrders
        .filter(o => ['delivered', 'DELIVERED_VERIFYING', 'COMPLETED', 'CONFIRMED_SYSTEM', 'confirmed', 'preparing', 'dispatched'].includes(o.status))
        .reduce((acc, curr) => acc + parseFloat(curr.total || 0), 0)

      // Calculate Order breakdown counts
      const deliveredOrdersCount = ordersData.filter(o => ['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(o.status)).length
      const activeOrdersCount = ordersData.filter(o => ['CONFIRMED_SYSTEM', 'confirmed', 'preparing', 'packed', 'assigned', 'dispatched', 'PLACED_COOLING'].includes(o.status)).length
      const pendingOrdersCount = ordersData.filter(o => ['pending', 'PLACED_COOLING'].includes(o.status)).length
      const cancelledOrdersCount = ordersData.filter(o => ['cancelled', 'CANCELLED_BY_USER', 'RETURN_REQUESTED'].includes(o.status)).length

      // Calculate Top Products dynamically
      const productMap = {}
      itemsData.forEach(item => {
        const orderStatus = item.order?.status
        if (!['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(orderStatus)) {
          return
        }
        const name = item.product_name
        const qty = parseInt(item.quantity || 0)
        const price = parseFloat(item.total_price || 0)
        if (!productMap[name]) {
          productMap[name] = { name, quantity: 0, revenue: 0 }
        }
        productMap[name].quantity += qty
        productMap[name].revenue += price
      })
      const sortedTopProducts = Object.values(productMap)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 4)

      setStats({
        productsCount,
        outOfStockCount,
        categoriesCount,
        martsCount,
        ordersCount,
        usersCount,
        captainsCount,
        activeCaptainsCount,
        revenue,
        todaySales,
        todayOrdersCount,
        avgRating,
        deliveredOrdersCount,
        activeOrdersCount,
        pendingOrdersCount,
        cancelledOrdersCount,
        doctorsCount,
        pharmaciesCount,
        careAppointmentsCount,
        servicesCount,
        serviceCategoriesCount
      })

      setPendingRequests({
        pendingCaptains,
        pendingMarts,
        pendingDoctors,
        pendingPharmacies,
        pendingReturns,
        pendingInquiries,
        openTickets
      })

      setRecentProducts(recentProdData || [])
      setRecentOrders(recentOrdersData || [])
      setTopSellers(sortedTopProducts)
      setCriticalLowStock(lowStockData || [])
      setAllOrders(ordersData || [])
    } catch (err) {
      console.error('[Dashboard] Error fetching dashboard statistics:', err)
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  useEffect(() => {
    const days = []
    for (let i = chartTimeframe - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push({
        dateStr: d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
        rawDate: d,
        sales: 0,
        orders: 0
      })
    }

    allOrders.forEach(order => {
      const orderDate = new Date(order.created_at)
      days.forEach(day => {
        if (orderDate.toDateString() === day.rawDate.toDateString()) {
          day.orders += 1
          if (['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(order.status)) {
            day.sales += parseFloat(order.total || 0)
          }
        }
      })
    })

    setDailyData(days)
  }, [allOrders, chartTimeframe])

  const handleSync = () => {
    fetchDashboardStats(true)
  }

  // Sparkline data generator helper
  const getSparklinePath = (values, width = 120, height = 36) => {
    if (!values || values.length === 0) return ''
    const max = Math.max(...values, 0)
    const min = Math.min(...values, 0)
    const range = max - min
    
    return values.map((val, i) => {
      const x = (i / (values.length - 1)) * width
      const y = range > 0 
        ? height - 2 - ((val - min) / range) * (height - 4)
        : height - 2
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    }).join(' ')
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120 } }
  }

  // Total pending requests count
  const totalPending = 
    pendingRequests.pendingCaptains +
    pendingRequests.pendingMarts +
    pendingRequests.pendingDoctors +
    pendingRequests.pendingPharmacies +
    pendingRequests.pendingReturns +
    pendingRequests.pendingInquiries +
    pendingRequests.openTickets

  // Top 5 Executive Stat Cards
  const statCards = [
    {
      title: 'Total Platform GMV',
      value: `₹${(stats.revenue || 0).toLocaleString('en-IN')}`,
      badge: stats.todaySales > 0 ? `+₹${Math.round(stats.todaySales)} today` : 'Lifetime',
      badgeColor: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400',
      sparkValues: dailyData.length > 0 ? dailyData.map(d => d.sales) : [0, 0, 0, 0, 0, 0, 0],
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20'
    },
    {
      title: 'Orders & Fulfillment',
      value: `${stats.ordersCount}`,
      badge: `${stats.activeOrdersCount} active / transit`,
      badgeColor: 'text-purple-600 bg-purple-500/10 dark:text-purple-400',
      sparkValues: dailyData.length > 0 ? dailyData.map(d => d.orders) : [0, 0, 0, 0, 0, 0, 0],
      icon: ShoppingBag,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10 border-purple-500/20'
    },
    {
      title: 'Active Rider Fleet',
      value: `${stats.activeCaptainsCount} / ${stats.captainsCount}`,
      badge: `${Math.round((stats.activeCaptainsCount / Math.max(stats.captainsCount, 1)) * 100)}% deployed`,
      badgeColor: 'text-sky-600 bg-sky-500/10 dark:text-sky-400',
      sparkValues: Array(7).fill(stats.activeCaptainsCount),
      icon: Bike,
      color: 'text-sky-500',
      bgColor: 'bg-sky-500/10 border-sky-500/20'
    },
    {
      title: 'Catalog Health',
      value: `${stats.productsCount} SKUs`,
      badge: stats.outOfStockCount > 0 ? `${stats.outOfStockCount} out of stock` : 'All Available',
      badgeColor: stats.outOfStockCount > 0 ? 'text-rose-600 bg-rose-500/10 dark:text-rose-400' : 'text-emerald-600 bg-emerald-500/10',
      sparkValues: Array(7).fill(stats.outOfStockCount),
      icon: Package,
      color: stats.outOfStockCount > 0 ? 'text-rose-500' : 'text-emerald-500',
      bgColor: stats.outOfStockCount > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
    },
    {
      title: 'Customer Satisfaction',
      value: stats.avgRating > 0 ? `${stats.avgRating} ★` : '5.0 ★',
      badge: `${stats.usersCount} registered users`,
      badgeColor: 'text-amber-600 bg-amber-500/10 dark:text-amber-400',
      sparkValues: Array(7).fill(stats.avgRating || 5),
      icon: Star,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10 border-amber-500/20'
    }
  ]

  // Math for SVG Area Chart
  const chartWidth = 500
  const chartHeight = 200
  const paddingLeft = 45
  const paddingRight = 15
  const paddingTop = 25
  const paddingBottom = 30

  let chartPoints = []
  let chartLinePath = ''
  let chartAreaPath = ''
  let maxChartValue = 1000

  if (dailyData.length > 0) {
    const rawMax = Math.max(...dailyData.map(d => activeChartTab === 'sales' ? d.sales : d.orders), 0)
    maxChartValue = rawMax > 0 ? rawMax : (activeChartTab === 'sales' ? 1000 : 10)
    
    chartPoints = dailyData.map((d, i) => {
      const val = activeChartTab === 'sales' ? d.sales : d.orders
      const x = paddingLeft + (i / (dailyData.length - 1)) * (chartWidth - paddingLeft - paddingRight)
      const y = chartHeight - paddingBottom - (val / maxChartValue) * (chartHeight - paddingTop - paddingBottom)
      return { x, y, val, label: d.dateStr }
    })

    chartLinePath = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
    chartAreaPath = chartPoints.length > 0 ? `${chartLinePath} L ${chartPoints[chartPoints.length - 1].x.toFixed(1)} ${(chartHeight - paddingBottom).toFixed(1)} L ${chartPoints[0].x.toFixed(1)} ${(chartHeight - paddingBottom).toFixed(1)} Z` : ''
  }

  const sliceWidth = dailyData.length > 1 ? (chartWidth - paddingLeft - paddingRight) / (dailyData.length - 1) : 0

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Banner & Live Telemetry Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 sm:p-6 bg-white dark:bg-[#15171c] rounded-3xl border border-gray-200/70 dark:border-white/10 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-1.5 bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-lg flex items-center justify-center shadow-sm">
              <Activity className="w-4 h-4 animate-pulse" />
            </span>
            <span className="text-xs font-black text-ozo-red dark:text-red-400 uppercase tracking-widest">
              OZO Super Admin Command Center
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live Telemetry
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Executive Ecosystem Pulse
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Real-time operations, pending approvals, financial velocity & multi-vertical health.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-gray-300">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-amber-600 text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow-md hover:shadow-red-500/20 active:scale-95 transition-all w-full sm:w-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Fast Sync DB'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: Top 5 Executive Metric Pulse Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4"
      >
        {statCards.map((stat, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            className="p-4 sm:p-5 bg-white dark:bg-[#15171c] rounded-2xl sm:rounded-3xl border border-gray-200/70 dark:border-white/10 shadow-md flex flex-col justify-between group hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider block truncate">
                  {stat.title}
                </span>
                <h3 className="text-xl sm:text-2xl font-black mt-1 text-gray-900 dark:text-white truncate">
                  {loading ? (
                    <span className="inline-block w-20 h-6 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
                  ) : (
                    stat.value
                  )}
                </h3>
              </div>
              <div className={`p-2.5 rounded-xl border flex-shrink-0 ${stat.bgColor} ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex items-end justify-between gap-2">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border border-current/20 truncate ${stat.badgeColor}`}>
                {stat.badge}
              </span>
              <div className="opacity-75 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <svg className={`w-16 h-6 ${stat.color}`} viewBox="0 0 120 36">
                  <path
                    d={getSparklinePath(stat.sparkValues)}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* SECTION 2: Action Center - Pending Requests & Approvals (Dynamic High-Visibility Strip) */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-500/10 via-red-500/5 to-purple-500/10 dark:from-amber-500/[0.08] dark:to-purple-500/[0.08] rounded-3xl border border-amber-500/20 dark:border-amber-500/25 shadow-lg space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
              Attention Required: Pending Requests & Verifications
            </h2>
          </div>
          {totalPending > 0 ? (
            <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-black text-xs animate-bounce">
              {totalPending} Action{totalPending > 1 ? 's' : ''} Pending
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              All Clear
            </span>
          )}
        </div>

        {totalPending > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-1">
            {/* 1. Rider Onboarding */}
            <Link
              to="/admin/requests"
              className="p-3 rounded-2xl bg-white/80 dark:bg-[#1a1c22]/90 border border-gray-200/80 dark:border-white/10 hover:border-sky-500 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <Bike className="w-4 h-4 text-sky-500" />
                <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${pendingRequests.pendingCaptains > 0 ? 'bg-sky-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                  {pendingRequests.pendingCaptains}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 leading-tight">Riders</p>
                <p className="text-[9px] text-gray-400 truncate">Verification</p>
              </div>
            </Link>

            {/* 2. Mart Applications */}
            <Link
              to="/admin/requests"
              className="p-3 rounded-2xl bg-white/80 dark:bg-[#1a1c22]/90 border border-gray-200/80 dark:border-white/10 hover:border-orange-500 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <Store className="w-4 h-4 text-orange-500" />
                <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${pendingRequests.pendingMarts > 0 ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                  {pendingRequests.pendingMarts}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 leading-tight">Mart Stores</p>
                <p className="text-[9px] text-gray-400 truncate">Onboarding</p>
              </div>
            </Link>

            {/* 3. Doctors Approvals */}
            <Link
              to="/admin/care"
              className="p-3 rounded-2xl bg-white/80 dark:bg-[#1a1c22]/90 border border-gray-200/80 dark:border-white/10 hover:border-emerald-500 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <Stethoscope className="w-4 h-4 text-emerald-500" />
                <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${pendingRequests.pendingDoctors > 0 ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                  {pendingRequests.pendingDoctors}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 leading-tight">Doctors</p>
                <p className="text-[9px] text-gray-400 truncate">Medical License</p>
              </div>
            </Link>

            {/* 4. Pharmacy Approvals */}
            <Link
              to="/admin/care"
              className="p-3 rounded-2xl bg-white/80 dark:bg-[#1a1c22]/90 border border-gray-200/80 dark:border-white/10 hover:border-teal-500 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <Pill className="w-4 h-4 text-teal-500" />
                <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${pendingRequests.pendingPharmacies > 0 ? 'bg-teal-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                  {pendingRequests.pendingPharmacies}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 leading-tight">Pharmacies</p>
                <p className="text-[9px] text-gray-400 truncate">Chemist Partner</p>
              </div>
            </Link>

            {/* 5. Returns & Refunds */}
            <Link
              to="/admin/requests"
              className="p-3 rounded-2xl bg-white/80 dark:bg-[#1a1c22]/90 border border-gray-200/80 dark:border-white/10 hover:border-rose-500 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <RotateCcw className="w-4 h-4 text-rose-500" />
                <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${pendingRequests.pendingReturns > 0 ? 'bg-rose-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                  {pendingRequests.pendingReturns}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 leading-tight">Return Claims</p>
                <p className="text-[9px] text-gray-400 truncate">Refund Requests</p>
              </div>
            </Link>

            {/* 6. Service Inquiries */}
            <Link
              to="/admin/services"
              className="p-3 rounded-2xl bg-white/80 dark:bg-[#1a1c22]/90 border border-gray-200/80 dark:border-white/10 hover:border-purple-500 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <Wrench className="w-4 h-4 text-purple-500" />
                <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${pendingRequests.pendingInquiries > 0 ? 'bg-purple-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                  {pendingRequests.pendingInquiries}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 leading-tight">Services</p>
                <p className="text-[9px] text-gray-400 truncate">Custom Inquiries</p>
              </div>
            </Link>

            {/* 7. Support Messages */}
            <Link
              to="/admin/messages"
              className="p-3 rounded-2xl bg-white/80 dark:bg-[#1a1c22]/90 border border-gray-200/80 dark:border-white/10 hover:border-amber-500 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <MessageSquare className="w-4 h-4 text-amber-500" />
                <span className={`text-xs font-black px-1.5 py-0.5 rounded-full ${pendingRequests.openTickets > 0 ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                  {pendingRequests.openTickets}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 leading-tight">Help Tickets</p>
                <p className="text-[9px] text-gray-400 truncate">User Support</p>
              </div>
            </Link>
          </div>
        ) : (
          <div className="py-2 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Zero backlogs! All onboarding applications, medical verifications, and customer return claims are up to date.</span>
          </div>
        )}
      </div>

      {/* SECTION 3: 4-Pillar Multi-Vertical Ecosystem Pulse Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pillar 1: OZO Mart */}
        <div className="p-5 bg-white dark:bg-[#15171c] rounded-3xl border border-gray-200/70 dark:border-white/10 shadow-md hover:border-orange-500/40 transition-all flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 font-black text-[10px] uppercase tracking-wider">
                OZO Mart
              </span>
              <Store className="w-4 h-4 text-orange-500" />
            </div>
            <h4 className="text-base font-black text-gray-900 dark:text-white mt-2">
              Grocery & Retail Marts
            </h4>
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Active Stores</p>
                <p className="text-sm font-black text-gray-800 dark:text-gray-100 mt-0.5">{stats.martsCount} Marts</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Today Orders</p>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.todayOrdersCount}</p>
              </div>
            </div>
          </div>
          <Link
            to="/admin/orders"
            className="flex items-center justify-between text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline pt-2 border-t border-gray-100 dark:border-white/5"
          >
            <span>Manage Orders & Catalog</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Pillar 2: OZO Fleet / Captains */}
        <div className="p-5 bg-white dark:bg-[#15171c] rounded-3xl border border-gray-200/70 dark:border-white/10 shadow-md hover:border-sky-500/40 transition-all flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-black text-[10px] uppercase tracking-wider">
                OZO Fleet
              </span>
              <Bike className="w-4 h-4 text-sky-500" />
            </div>
            <h4 className="text-base font-black text-gray-900 dark:text-white mt-2">
              Logistics & Captains
            </h4>
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Online Fleet</p>
                <p className="text-sm font-black text-sky-600 dark:text-sky-400 mt-0.5">{stats.activeCaptainsCount} Riders</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Pending Verification</p>
                <p className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">{pendingRequests.pendingCaptains}</p>
              </div>
            </div>
          </div>
          <Link
            to="/admin/rider-manage"
            className="flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline pt-2 border-t border-gray-100 dark:border-white/5"
          >
            <span>Dispatch & Rider Radar</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Pillar 3: OZO Care */}
        <div className="p-5 bg-white dark:bg-[#15171c] rounded-3xl border border-gray-200/70 dark:border-white/10 shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-wider">
                OZO Care
              </span>
              <Stethoscope className="w-4 h-4 text-emerald-500" />
            </div>
            <h4 className="text-base font-black text-gray-900 dark:text-white mt-2">
              Healthcare & Pharmacy
            </h4>
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Doctors Verified</p>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.doctorsCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Pharmacies</p>
                <p className="text-sm font-black text-teal-600 dark:text-teal-400 mt-0.5">{stats.pharmaciesCount}</p>
              </div>
            </div>
          </div>
          <Link
            to="/admin/care"
            className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline pt-2 border-t border-gray-100 dark:border-white/5"
          >
            <span>Manage Care & Appointments</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Pillar 4: OZO Services */}
        <div className="p-5 bg-white dark:bg-[#15171c] rounded-3xl border border-gray-200/70 dark:border-white/10 shadow-md hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black text-[10px] uppercase tracking-wider">
                OZO Services
              </span>
              <Wrench className="w-4 h-4 text-purple-500" />
            </div>
            <h4 className="text-base font-black text-gray-900 dark:text-white mt-2">
              Home Maintenance & Urban
            </h4>
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Service Catalog</p>
                <p className="text-sm font-black text-purple-600 dark:text-purple-400 mt-0.5">{stats.servicesCount || stats.serviceCategoriesCount || 12} Skills</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Customer Inquiries</p>
                <p className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">{pendingRequests.pendingInquiries}</p>
              </div>
            </div>
          </div>
          <Link
            to="/admin/services"
            className="flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline pt-2 border-t border-gray-100 dark:border-white/5"
          >
            <span>Services & Proposals</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* SECTION 4: Interactive Charts & Order Pipeline (2/3 + 1/3 Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Interactive Financial / Volume Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#15171c] rounded-3xl border border-gray-200/70 dark:border-white/10 p-5 sm:p-6 shadow-md relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  Sales & Orders Velocity
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] rounded-full font-black uppercase tracking-wider">
                    Live Telemetry
                  </span>
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Daily aggregated financial turnover across the last {chartTimeframe} days.
                </p>
              </div>
              
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Timeframe Select */}
                <select
                  value={chartTimeframe}
                  onChange={(e) => {
                    setChartTimeframe(Number(e.target.value))
                    setHoveredPoint(null)
                  }}
                  className="bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-200/70 dark:border-white/10 outline-none cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <option value={7} className="bg-white dark:bg-[#1a1a1a]">Last 7 Days</option>
                  <option value={15} className="bg-white dark:bg-[#1a1a1a]">Last 15 Days</option>
                  <option value={30} className="bg-white dark:bg-[#1a1a1a]">Last 30 Days</option>
                </select>

                {/* Tab toggle */}
                <div className="flex items-center p-1 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200/50 dark:border-white/10">
                  <button
                    onClick={() => {
                      setActiveChartTab('sales')
                      setHoveredPoint(null)
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      activeChartTab === 'sales'
                        ? 'bg-white dark:bg-white/20 text-emerald-600 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                    }`}
                  >
                    Revenue (₹)
                  </button>
                  <button
                    onClick={() => {
                      setActiveChartTab('orders')
                      setHoveredPoint(null)
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                      activeChartTab === 'orders'
                        ? 'bg-white dark:bg-white/20 text-purple-600 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                    }`}
                  >
                    Order Vol
                  </button>
                </div>
              </div>
            </div>

            {/* SVG Chart Rendering */}
            <div className="relative w-full aspect-[21/9] sm:aspect-[2.4/1] mt-2 select-none">
              {dailyData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 italic">
                  Awaiting live transaction telemetry...
                </div>
              ) : (
                <>
                  <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={activeChartTab === 'sales' ? '#10B981' : '#8B5CF6'} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={activeChartTab === 'sales' ? '#10B981' : '#8B5CF6'} stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Guideline grid */}
                    {[0, 0.25, 0.5, 0.75, 1].map((tick, index) => {
                      const y = chartHeight - paddingBottom - tick * (chartHeight - paddingTop - paddingBottom)
                      const tickVal = Math.round(tick * maxChartValue)
                      return (
                        <g key={index} className="opacity-15 dark:opacity-10">
                          <line
                            x1={paddingLeft}
                            y1={y}
                            x2={chartWidth - paddingRight}
                            y2={y}
                            stroke="currentColor"
                            strokeWidth="1"
                            strokeDasharray="4,4"
                          />
                          <text
                            x={paddingLeft - 8}
                            y={y + 4}
                            className="text-[9px] fill-current font-semibold text-right"
                            textAnchor="end"
                          >
                            {activeChartTab === 'sales' ? `₹${tickVal}` : tickVal}
                          </text>
                        </g>
                      )
                    })}

                    {/* Area fill */}
                    <path d={chartAreaPath} fill="url(#chartGradient)" />

                    {/* Line stroke */}
                    <path
                      d={chartLinePath}
                      fill="none"
                      stroke={activeChartTab === 'sales' ? '#10B981' : '#8B5CF6'}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Axis line */}
                    <line
                      x1={paddingLeft}
                      y1={chartHeight - paddingBottom}
                      x2={chartWidth - paddingRight}
                      y2={chartHeight - paddingBottom}
                      className="stroke-gray-200 dark:stroke-white/10"
                      strokeWidth="1"
                    />

                    {/* Grid Point Dots */}
                    {chartPoints.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={hoveredPoint?.label === p.label ? "6" : "3.5"}
                        className={`fill-white dark:fill-[#15171c] transition-all duration-150 ${activeChartTab === 'sales' ? 'stroke-emerald-500' : 'stroke-purple-500'}`}
                        strokeWidth="2.5"
                      />
                    ))}

                    {/* Interactive vertical tracking line */}
                    {hoveredPoint && (
                      <line
                        x1={hoveredPoint.x}
                        y1={paddingTop}
                        x2={hoveredPoint.x}
                        y2={chartHeight - paddingBottom}
                        className={activeChartTab === 'sales' ? 'stroke-emerald-500/40' : 'stroke-purple-500/40'}
                        strokeWidth="1.5"
                        strokeDasharray="3,3"
                      />
                    )}

                    {/* Bottom Date labels */}
                    {chartPoints.map((p, i) => {
                      const labelInterval = Math.ceil(dailyData.length / 6)
                      const isEdge = i === 0 || i === chartPoints.length - 1
                      const isStep = i % labelInterval === 0
                      if (!isEdge && !isStep) return null

                      return (
                        <text
                          key={i}
                          x={p.x}
                          y={chartHeight - paddingBottom + 16}
                          className="text-[9px] fill-gray-400 dark:fill-gray-500 font-bold"
                          textAnchor="middle"
                        >
                          {p.label}
                        </text>
                      )
                    })}

                    {/* Hover detector zones */}
                    {chartPoints.map((p, i) => {
                      const zoneX = p.x - sliceWidth / 2
                      return (
                        <rect
                          key={i}
                          x={zoneX}
                          y={0}
                          width={sliceWidth}
                          height={chartHeight}
                          fill="transparent"
                          className="cursor-crosshair"
                          onMouseEnter={() => setHoveredPoint(p)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      )
                    })}
                  </svg>

                  {/* Tooltip Card overlay */}
                  <AnimatePresence>
                    {hoveredPoint && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute p-3 bg-white dark:bg-[#1e2028] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl z-30 pointer-events-none text-xs flex flex-col gap-0.5 min-w-[130px]"
                        style={{
                          left: `${((hoveredPoint.x - paddingLeft) / (chartWidth - paddingLeft - paddingRight)) * 88 + 4}%`,
                          top: `${hoveredPoint.y - 65}px`
                        }}
                      >
                        <span className="text-[10px] text-gray-400 font-bold uppercase">{hoveredPoint.label}</span>
                        <span className="font-black text-gray-900 dark:text-white text-sm">
                          {activeChartTab === 'sales' ? `₹${hoveredPoint.val.toLocaleString('en-IN')}` : `${hoveredPoint.val} Orders`}
                        </span>
                        <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3" />
                          Tracked
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Fulfillment Pipeline Desk (1/3 width) */}
        <div className="bg-white dark:bg-[#15171c] rounded-3xl border border-gray-200/70 dark:border-white/10 p-5 sm:p-6 shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">Fulfillment Pipeline</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Live order statuses breakdown.</p>

            <div className="mt-6 space-y-4">
              {(() => {
                const total = stats.ordersCount || 1
                const dataList = [
                  { label: 'Delivered', count: stats.deliveredOrdersCount, color: 'bg-emerald-500', barBg: 'bg-emerald-500/10' },
                  { label: 'In Transit / Dispatched', count: stats.activeOrdersCount, color: 'bg-sky-500', barBg: 'bg-sky-500/10' },
                  { label: 'Pending Acceptance', count: stats.pendingOrdersCount, color: 'bg-amber-500', barBg: 'bg-amber-500/10' },
                  { label: 'Cancelled / Returned', count: stats.cancelledOrdersCount, color: 'bg-rose-500', barBg: 'bg-rose-500/10' }
                ]

                return dataList.map((item, index) => {
                  const pct = Math.round((item.count / total) * 100)
                  return (
                    <div key={index} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{item.label}</span>
                        <span className="text-gray-400 dark:text-gray-500 font-bold">
                          {item.count} ({pct}%)
                        </span>
                      </div>
                      <div className={`w-full h-2 rounded-full overflow-hidden ${item.barBg}`}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1 }}
                          className={`h-full rounded-full ${item.color}`}
                        />
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>

          <Link
            to="/admin/orders"
            className="w-full mt-6 py-2.5 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl text-center text-xs font-black text-gray-700 dark:text-gray-200 transition-colors block"
          >
            Manage Fulfillment Orders
          </Link>
        </div>
      </div>

      {/* SECTION 5: Live Activity Desk & Inventory Watchlist (2/3 + 1/3 Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Activity (2/3 width) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#15171c] rounded-3xl border border-gray-200/70 dark:border-white/10 p-5 sm:p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">Recent Orders Stream</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Latest real-time checkouts across active marts.</p>
              </div>
              <Link 
                to="/admin/orders" 
                className="text-xs font-black text-ozo-red hover:underline flex items-center gap-0.5"
              >
                <span>Orders Desk</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-12 bg-gray-100 dark:bg-white/5 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-xs text-gray-400 italic">No checkout orders registered yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5 sm:-mx-6">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] text-[10px] uppercase tracking-wider font-bold text-gray-400">
                      <th className="px-6 py-3">Order Number</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Payment</th>
                      <th className="px-6 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:border-white/5 text-xs">
                    {recentOrders.map((order) => {
                      const orderNum = order.order_number || order.id.slice(0, 8)
                      const isPaid = order.payment_status === 'paid'
                      
                      const STATUS_BADGES = {
                        pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400',
                        PLACED_COOLING: 'bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400',
                        CONFIRMED_SYSTEM: 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400',
                        confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400',
                        preparing: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400',
                        packed: 'bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400',
                        assigned: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/20 dark:text-cyan-400',
                        dispatched: 'bg-orange-100 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400',
                        delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400',
                        COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400',
                        cancelled: 'bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400',
                        CANCELLED_BY_USER: 'bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400',
                        RETURN_REQUESTED: 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                      }
                      
                      const badgeClass = STATUS_BADGES[order.status] || 'bg-gray-100 text-gray-700 dark:bg-white/5'

                      return (
                        <tr 
                          key={order.id} 
                          onClick={() => navigate('/admin/orders')} 
                          className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-all cursor-pointer"
                        >
                          <td className="px-6 py-3 font-black text-gray-900 dark:text-white">
                            #{orderNum}
                            <span className="text-[9px] text-gray-400 block font-normal mt-0.5">
                              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="font-bold text-gray-800 dark:text-gray-200 truncate">{order.customer?.full_name || 'Guest User'}</p>
                                <p className="text-[9px] text-gray-400 truncate">{order.customer?.phone || 'No phone'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 ${
                              isPaid
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            }`}>
                              {isPaid ? 'Paid' : 'Unpaid'}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right font-black text-gray-900 dark:text-white">
                            ₹{order.total}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Low-Stock / Restock Watchlist (1/3 width) */}
        <div className="bg-white dark:bg-[#15171c] rounded-3xl border border-gray-200/70 dark:border-white/10 p-5 sm:p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Stock Watchlist</h3>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${stats.outOfStockCount > 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-600'}`}>
                {stats.outOfStockCount} Out of Stock
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Fast items needing replenishment.</p>

            <div className="space-y-3">
              {criticalLowStock.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400 italic">
                  All active items are healthy and in stock!
                </div>
              ) : (
                criticalLowStock.map((prod) => (
                  <div key={prod.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-white/10 overflow-hidden flex-shrink-0">
                        {prod.image_url ? (
                          <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{prod.name}</p>
                        <p className="text-[10px] text-rose-500 font-bold">Out of stock</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-gray-900 dark:text-white">
                      ₹{prod.price}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link
            to="/admin/products"
            className="w-full mt-4 py-2.5 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl text-center text-xs font-black text-gray-700 dark:text-gray-200 transition-colors block"
          >
            Open Catalog Inventory
          </Link>
        </div>
      </div>

      {/* SECTION 6: Super Admin Command Operations Shortcuts */}
      <div className="bg-white dark:bg-[#15171c] rounded-3xl border border-gray-200/70 dark:border-white/10 p-5 sm:p-6 shadow-md">
        <h3 className="text-base font-black text-gray-900 dark:text-white mb-3">Super Admin Quick Operations Shortcuts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Link
            to="/admin/products"
            className="flex items-center justify-between p-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-ozo-red dark:hover:border-ozo-red hover:bg-ozo-red/5 group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-ozo-red/10 dark:bg-ozo-red/20 text-ozo-red rounded-xl">
                <Plus className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-gray-800 dark:text-white text-xs">Add New Product</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Catalog & SKU restock</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-ozo-red group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/admin/requests"
            className="flex items-center justify-between p-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-sky-500 dark:hover:border-sky-500 hover:bg-sky-500/5 group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-100 dark:bg-sky-950/20 text-sky-500 rounded-xl">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-gray-800 dark:text-white text-xs">Review Requests</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Riders & Mart approvals</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/admin/cities"
            className="flex items-center justify-between p-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-500/5 group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/20 text-emerald-500 rounded-xl">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-gray-800 dark:text-white text-xs">Cities & Zones</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Pincodes & delivery radius</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            to="/admin/settings"
            className="flex items-center justify-between p-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-500/5 group transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 dark:bg-purple-950/20 text-purple-500 rounded-xl">
                <Settings className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-gray-800 dark:text-white text-xs">System Settings</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Fees, policies & gateway</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Dashboard