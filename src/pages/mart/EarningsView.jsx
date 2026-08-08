import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useMartStore } from '../../stores/martStore'
import toast from 'react-hot-toast'
import OptimizedImage from '../../components/OptimizedImage'
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  Search,
  RefreshCw,
  ArrowLeft,
  CreditCard,
  User,
  Phone,
  Package,
  FileText,
  CheckCircle,
  Clock,
  Download,
  Calendar,
  Printer,
  Info,
  X
} from 'lucide-react'

const EarningsView = () => {
  const {
    pastOrders,
    isLoadingPastOrders,
    fetchPastOrders,
    currentMart
  } = useMartStore()

  // Local state
  const [selectedPastOrderId, setSelectedPastOrderId] = useState(null)
  const [pastSearchQuery, setPastSearchQuery] = useState('')
  const [commissionPct, setCommissionPct] = useState(24)
  const [dateFilter, setDateFilter] = useState('all') // 'all', 'today', 'yesterday', 'week', 'month', 'custom'
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showFormulaBanner, setShowFormulaBanner] = useState(() => {
    const saved = localStorage.getItem('ozo_show_formula_banner');
    return saved !== 'false';
  })

  const handleDismissFormula = () => {
    setShowFormulaBanner(false);
    localStorage.setItem('ozo_show_formula_banner', 'false');
  }

  useEffect(() => {
    const fetchPlatformSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('key, value')
          .eq('key', 'platform_config')
          .single()
        
        if (data && data.value && typeof data.value.global_commission_pct === 'number') {
          setCommissionPct(data.value.global_commission_pct)
        }
      } catch (err) {
        console.error('Failed to fetch platform commission setting:', err)
      }
    }
    fetchPlatformSettings()
  }, [])

  // Fetch past orders
  useEffect(() => {
    if (currentMart) {
      fetchPastOrders()
    }
  }, [currentMart, fetchPastOrders])

  // Date range filtering logic
  const filterOrdersByDate = (orders) => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000)
    
    return orders.filter(o => {
      const orderDate = new Date(o.created_at)
      
      if (dateFilter === 'all') return true
      if (dateFilter === 'today') {
        return orderDate >= startOfToday
      }
      if (dateFilter === 'yesterday') {
        return orderDate >= startOfYesterday && orderDate < startOfToday
      }
      if (dateFilter === 'week') {
        const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000)
        return orderDate >= startOfWeek
      }
      if (dateFilter === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        return orderDate >= startOfMonth
      }
      if (dateFilter === 'custom') {
        let match = true
        if (customStartDate) {
          const start = new Date(customStartDate)
          match = match && orderDate >= start
        }
        if (customEndDate) {
          const end = new Date(customEndDate)
          end.setHours(23, 59, 59, 999)
          match = match && orderDate <= end
        }
        return match
      }
      return true
    })
  }

  const dateFilteredOrders = filterOrdersByDate(pastOrders)

  const completedPastOrders = dateFilteredOrders.filter(o => ['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(o.status))
  const cancelledPastOrders = dateFilteredOrders.filter(o => ['cancelled', 'CANCELLED_BY_USER', 'CANCELLED_BY_MART'].includes(o.status))
  
  // Gross Sales (total sales of completed orders)
  const totalEarnings = completedPastOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0)
  
  // Average Order Value
  const avgOrderValue = completedPastOrders.length > 0 ? (totalEarnings / completedPastOrders.length) : 0

  // Net Payouts Total (completed orders payout after platform commission)
  const netEarningsTotal = completedPastOrders.reduce((sum, o) => sum + (o.subtotal || 0) * (1 - commissionPct / 100), 0)

  // Paid Out (completed orders where mart_payout_status is paid)
  const totalSettled = completedPastOrders
    .filter(o => o.mart_payout_status === 'paid')
    .reduce((sum, o) => sum + (o.subtotal || 0) * (1 - commissionPct / 100), 0)

  // Pending Payout (completed orders where mart_payout_status is not paid)
  const pendingSettlement = completedPastOrders
    .filter(o => o.mart_payout_status !== 'paid')
    .reduce((sum, o) => sum + (o.subtotal || 0) * (1 - commissionPct / 100), 0)

  // Filter past orders based on search query
  const filteredPastOrders = dateFilteredOrders.filter(o => {
    if (!pastSearchQuery) return true
    const searchLower = pastSearchQuery.toLowerCase()
    const matchOrderNumber = o.order_number?.toLowerCase().includes(searchLower)
    const matchCustomerName = o.user?.full_name?.toLowerCase().includes(searchLower)
    return matchOrderNumber || matchCustomerName
  })

  const selectedPastOrder = pastOrders.find(o => o.id === selectedPastOrderId)

  // Export to CSV Function
  const exportToCSV = () => {
    if (dateFilteredOrders.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = [
      'Order Number',
      'Date',
      'Status',
      'Gross Amount (₹)',
      'Platform Commission (%)',
      'Platform Cut (₹)',
      'Net Payout (₹)',
      'Payout Status',
      'Settlement Date',
      'Payout Reference'
    ]

    const rows = dateFilteredOrders.map(o => {
      const isCompleted = ['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(o.status)
      const commissionAmount = isCompleted ? (o.subtotal * (commissionPct / 100)) : 0
      const netPayout = isCompleted ? (o.subtotal * (1 - commissionPct / 100)) : 0
      
      return [
        o.order_number || 'N/A',
        new Date(o.created_at).toLocaleString(),
        o.status,
        o.subtotal || 0,
        commissionPct,
        commissionAmount,
        netPayout,
        o.mart_payout_status || 'unpaid',
        o.mart_payout_date ? new Date(o.mart_payout_date).toLocaleString() : 'N/A',
        o.mart_payout_reference || 'N/A'
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `OZO_Mart_Earnings_${dateFilter}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('CSV report downloaded successfully!')
  }

  // Print invoice function
  const printInvoice = (order) => {
    const printWindow = window.open('', '_blank')
    const itemsHtml = order.order_items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product_name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₹${item.unit_price?.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₹${item.total_price?.toFixed(2)}</td>
      </tr>
    `).join('')

    const invoiceHtml = `
      <html>
        <head>
          <title>Invoice - #${order.order_number}</title>
          <style>
            body { font-family: monospace; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 20px; }
            .details { margin-bottom: 20px; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .totals { text-align: right; line-height: 1.8; }
            .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h2>OZO MART RECEIPT</h2>
            <p>Order #${order.order_number}</p>
            <p>${new Date(order.created_at).toLocaleString()}</p>
          </div>
          <div class="details">
            <strong>Customer:</strong> ${order.user?.full_name || 'Ozo Customer'}<br>
            <strong>Phone:</strong> ${order.user?.phone || 'N/A'}<br>
            <strong>Payment Method:</strong> ${order.payment_method || 'N/A'}<br>
          </div>
          <table>
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="padding: 8px; text-align: left;">Item</th>
                <th style="padding: 8px; text-align: center;">Qty</th>
                <th style="padding: 8px; text-align: right;">Price</th>
                <th style="padding: 8px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="totals">
            Subtotal: <strong>₹${order.subtotal?.toFixed(2)}</strong><br>
            ${order.discount > 0 ? `Discount: <strong>-₹${order.discount?.toFixed(2)}</strong><br>` : ''}
            Delivery Fee: <strong>₹${order.delivery_fee?.toFixed(2)}</strong><br>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 5px 0;">
            Grand Total: <strong style="font-size: 16px;">₹${order.total?.toFixed(2)}</strong><br>
            ${['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(order.status) ? `
              <hr style="border: none; border-top: 1px dashed #ddd; margin: 10px 0;">
              Mart Payout (Net): <strong>₹${(order.subtotal * (1 - commissionPct / 100)).toFixed(2)}</strong><br>
              Payout Status: <strong>${(order.mart_payout_status || 'unpaid').toUpperCase()}</strong><br>
            ` : ''}
          </div>
          <div class="footer">
            <p>Thank you for partnering with OZO Mart!</p>
            <p>System Generated Invoice</p>
          </div>
        </body>
      </html>
    `
    printWindow.document.write(invoiceHtml)
    printWindow.document.close()
  }

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 bg-gray-50 dark:bg-slate-950 w-full min-w-0 overflow-y-auto">
      {/* Earnings Info Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Earnings & Store Performance</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track your store sales, payouts, and order history.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportToCSV}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white dark:text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md shadow-blue-500/10 cursor-pointer border border-transparent dark:border-none"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Range Picker */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 mb-4 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-gray-150 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
            <Calendar className="w-4 h-4 text-blue-500 dark:text-blue-500" />
            <span>Date Range Filter</span>
          </div>
          <span className="text-[10px] bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-500 px-2 py-0.5 rounded font-black uppercase tracking-wider">
            {dateFilter === 'all' ? 'All Time' : dateFilter}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'month', label: 'This Month' },
            { id: 'custom', label: 'Custom Range' }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => {
                setDateFilter(btn.id)
                setSelectedPastOrderId(null)
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                dateFilter === btn.id
                  ? 'bg-blue-600 border-blue-600 text-white dark:bg-blue-600 dark:border-blue-500 dark:text-white'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-750 dark:bg-slate-900/60 dark:border-white/5 dark:hover:bg-slate-800 dark:text-gray-300'
              }`}
            >
              {btn.label}
            </button>
          ))}

          {dateFilter === 'custom' && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:ml-auto mt-2 sm:mt-0 animate-fadeIn w-full sm:w-auto">
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-gray-205 dark:border-white/5">
                <span className="text-[10px] text-gray-400 font-bold uppercase">From</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value)
                    setSelectedPastOrderId(null)
                  }}
                  className="bg-transparent border-none text-xs text-gray-800 dark:text-gray-250 font-bold focus:outline-none dark:color-scheme-dark"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-gray-205 dark:border-white/5">
                <span className="text-[10px] text-gray-400 font-bold uppercase">To</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value)
                    setSelectedPastOrderId(null)
                  }}
                  className="bg-transparent border-none text-xs text-gray-800 dark:text-gray-250 font-bold focus:outline-none dark:color-scheme-dark"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="w-full min-w-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5 mb-4 shrink-0">
        {/* Card 1: Total Sales */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:shadow-md hover:border-blue-500/20 hover:-translate-y-0.5 transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Total Sales</span>
            <span className="text-lg font-extrabold text-gray-955 dark:text-white">₹{totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-blue-600/10 dark:bg-blue-600/20 p-2 rounded-xl text-blue-600 dark:text-blue-500 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: Completed Orders */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:shadow-md hover:border-blue-500/20 hover:-translate-y-0.5 transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Completed</span>
            <span className="text-lg font-extrabold text-gray-955 dark:text-white">{completedPastOrders.length}</span>
          </div>
          <div className="bg-blue-500/10 dark:bg-blue-500/20 p-2 rounded-xl text-blue-500 dark:text-blue-400 shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </div>
        </div>

        {/* Card 3: Net Payout */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:shadow-md hover:border-blue-500/30 hover:-translate-y-0.5 transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-blue-800 dark:text-blue-500 uppercase tracking-wider block">Net Payout</span>
            <span className="text-lg font-extrabold text-blue-600 dark:text-blue-500">₹{netEarningsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-blue-600/15 dark:bg-blue-600/25 p-2 rounded-xl text-blue-600 dark:text-blue-500 shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        {/* Card 4: Settled Payouts */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:shadow-md hover:border-blue-500/20 hover:-translate-y-0.5 transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Settled (Paid)</span>
            <span className="text-lg font-extrabold text-blue-600 dark:text-blue-500">₹{totalSettled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-blue-600/10 dark:bg-blue-600/20 p-2 rounded-xl text-blue-600 dark:text-blue-500 shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>

        {/* Card 5: Pending Payouts */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:shadow-md hover:border-amber-500/20 hover:-translate-y-0.5 transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Pending</span>
            <span className="text-lg font-extrabold text-amber-600 dark:text-amber-450">₹{pendingSettlement.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-amber-500/10 dark:bg-amber-500/20 p-2 rounded-xl text-amber-505 dark:text-amber-400 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* Card 6: Cancelled Orders */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:shadow-md hover:border-red-500/20 hover:-translate-y-0.5 transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Cancelled</span>
            <span className="text-lg font-extrabold text-red-500">{cancelledPastOrders.length}</span>
          </div>
          <div className="bg-red-500/10 dark:bg-red-500/20 p-2 rounded-xl text-red-500 dark:text-red-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Financial Transparency & Payout Breakdown Card (Dismissible) */}
      {showFormulaBanner && (
        <div className="relative bg-gradient-to-r from-blue-600/10 via-blue-500/5 to-teal-500/10 border border-blue-500/20 rounded-2xl p-4 mb-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 transition-all">
          <button 
            onClick={handleDismissFormula}
            className="absolute top-3 right-3 p-1 rounded-lg hover:bg-gray-150/50 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all cursor-pointer"
            title="Dismiss formula banner"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 pr-6">
            <div className="bg-blue-600/10 dark:bg-blue-600/25 p-2 rounded-xl text-blue-600 dark:text-blue-500 hidden sm:block">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Payout Formula</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Your net earnings after {commissionPct}% platform commission deduction.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 shrink-0 flex-wrap pr-8">
            <div className="text-center bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 px-4 py-2 rounded-xl min-w-[110px]">
              <span className="text-[9px] font-bold text-gray-500 uppercase">Gross Sales</span>
              <p className="text-sm font-extrabold text-gray-900 dark:text-white mt-0.5">₹{totalEarnings.toFixed(2)}</p>
            </div>
            <span className="text-gray-400 font-bold text-lg">-</span>
            <div className="text-center bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 px-4 py-2 rounded-xl min-w-[110px]">
              <span className="text-[9px] font-bold text-gray-500 uppercase">Commission ({commissionPct}%)</span>
              <p className="text-sm font-extrabold text-red-500 mt-0.5">₹{(totalEarnings * (commissionPct / 100)).toFixed(2)}</p>
            </div>
            <span className="text-gray-400 font-bold text-lg">=</span>
            <div className="text-center bg-blue-600/15 border border-blue-500/30 px-5 py-2 rounded-xl min-w-[120px]">
              <span className="text-[9px] font-black text-blue-700 dark:text-blue-500 uppercase">Net Payout</span>
              <p className="text-base font-black text-blue-600 dark:text-blue-500 mt-0.5">₹{netEarningsTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Split */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 w-full min-w-0 mb-8 items-start">
        {/* Left Panel: History List */}
        <div className={`w-full lg:w-[380px] xl:w-[420px] flex flex-col shrink-0 ${selectedPastOrderId ? 'hidden lg:flex' : 'flex'}`}>
          {/* Search container - its own card */}
          <div className="p-4 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl mb-4 shadow-sm flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by Order # or Customer..."
                value={pastSearchQuery}
                onChange={(e) => setPastSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all"
              />
            </div>
          </div>

          {/* Cards container */}
          <div className="space-y-3.5 w-full">
            {isLoadingPastOrders ? (
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="w-8 h-8 text-blue-500 dark:text-blue-500 animate-spin" />
                  <p className="text-xs text-gray-550 font-bold uppercase tracking-wider">Loading history...</p>
                </div>
              </div>
            ) : filteredPastOrders.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center text-center text-gray-500">
                <ShoppingBag className="w-12 h-12 text-gray-300 dark:text-gray-800 mb-2" />
                <p className="text-sm font-bold text-gray-800 dark:text-gray-300">No past orders found</p>
                <p className="text-xs text-gray-400 dark:text-gray-555 mt-0.5">Completed and cancelled orders will show up here.</p>
              </div>
            ) : (
              filteredPastOrders.map((order) => {
                const isSelected = order.id === selectedPastOrderId
                const orderDate = new Date(order.created_at)
                const formattedDate = orderDate.toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })
                const formattedTime = orderDate.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })

                return (
                  <button
                    key={order.id}
                    onClick={() => setSelectedPastOrderId(order.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 shadow-sm hover:shadow-md cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-50/20 dark:bg-blue-600/5 border-blue-500 dark:border-blue-500 ring-1 ring-blue-500/20' 
                        : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                          #{order.order_number || 'N/A'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(order.status) && (
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded select-none ${
                              order.mart_payout_status === 'paid'
                                ? 'bg-blue-600/10 border border-blue-500/20 text-blue-600 dark:text-blue-500'
                                : 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400'
                            }`}>
                              {order.mart_payout_status === 'paid' ? 'Settled' : 'Unpaid'}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full select-none ${
                            ['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(order.status)
                              ? 'bg-blue-50 dark:bg-blue-600/10 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-500'
                              : 'bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400'
                          }`}>
                            {['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(order.status) ? 'Delivered' : 'Cancelled'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-700 dark:text-gray-300 truncate mr-2">
                          {order.user?.full_name || 'Ozo Customer'}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white whitespace-nowrap">
                          ₹{order.subtotal?.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-555 font-bold uppercase tracking-wider">
                        <span>{formattedDate} • {formattedTime}</span>
                        <span>{order.order_items?.length || 0} items</span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className={`flex-1 min-w-0 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex flex-col shadow-sm lg:sticky lg:top-4 ${!selectedPastOrderId ? 'hidden lg:flex' : 'flex'}`}>
          {selectedPastOrder ? (
            <div className="flex flex-col">
              {/* Panel Header */}
              <div className="p-4 md:p-6 border-b border-gray-200 dark:border-slate-800 bg-gradient-to-b from-gray-50/80 to-gray-50/40 dark:from-slate-900/80 dark:to-slate-900/40 backdrop-blur-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => setSelectedPastOrderId(null)}
                    className="lg:hidden flex-shrink-0 p-2.5 bg-gray-150 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-gray-205 dark:border-white/5 rounded-xl text-gray-700 dark:text-gray-300 transition-colors cursor-pointer flex items-center justify-center mr-1"
                    title="Back to Earnings List"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                      Order #{selectedPastOrder.order_number}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-gray-550 dark:text-gray-400 mt-0.5">
                      Placed on {new Date(selectedPastOrder.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-between sm:justify-end border-t sm:border-t-0 border-gray-100 dark:border-white/5 pt-2.5 sm:pt-0">
                  <button
                    onClick={() => printInvoice(selectedPastOrder)}
                    className="bg-white hover:bg-gray-50 border border-gray-250 dark:bg-slate-800 dark:border-white/5 dark:hover:bg-slate-750 text-gray-750 dark:text-gray-300 text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                    title="Print Receipt"
                  >
                    <Printer className="w-3.5 h-3.5 text-gray-400" />
                    <span>Print Receipt</span>
                  </button>
                  {selectedPastOrder.payment_method && (
                    <span className="bg-gray-100 dark:bg-slate-800 text-gray-750 dark:text-gray-300 text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-xl border border-gray-200 dark:border-white/5 flex items-center gap-1 uppercase select-none shrink-0">
                      <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                      {selectedPastOrder.payment_method}
                    </span>
                  )}
                  <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-xl uppercase tracking-wider select-none shrink-0 border ${
                    ['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(selectedPastOrder.status)
                      ? 'bg-blue-50 dark:bg-blue-600/10 border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-500'
                      : 'bg-red-500/10 border-red-500/20 text-red-500'
                  }`}>
                    {['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(selectedPastOrder.status) ? 'Delivered' : 'Cancelled'}
                  </span>
                </div>
              </div>

              {/* Panel Body */}
              <div className="p-4 sm:p-5 space-y-4 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto custom-scrollbar">
                {/* Customer Information Banner */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-3 text-xs">
                  <div className="flex items-center gap-2 text-gray-550 dark:text-gray-400">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-bold text-[9px] text-gray-400 uppercase tracking-wider">Customer:</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{selectedPastOrder.user?.full_name || 'Ozo Customer'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-550 dark:text-gray-400">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-bold text-[9px] text-gray-400 uppercase tracking-wider">Phone:</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{selectedPastOrder.user?.phone || 'N/A'}</span>
                  </div>
                </div>

                           {/* Items & Summary Grid */}
                <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
                  {/* Left Column: Items */}
                  <div className="flex-1 w-full space-y-2 sm:space-y-3">
                    <h4 className="text-[10px] sm:text-xs font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">Items Ordered</h4>
                    <div className="border border-gray-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
                      <table className="w-full text-left text-xs sm:text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 text-[9px] sm:text-[10px] font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider">
                            <th className="p-2 sm:p-4">Item Details</th>
                            <th className="p-2 sm:p-4 text-center">Qty</th>
                            <th className="p-2 sm:p-4 text-right">Price</th>
                            <th className="p-2 sm:p-4 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 dark:divide-slate-800">
                          {selectedPastOrder.order_items?.map((item) => (
                             <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-850 transition-all">
                              <td className="p-2 sm:p-4 flex items-center gap-2 sm:gap-3 min-w-0">
                                <OptimizedImage
                                  src={item.product_image}
                                  slug={item.product_slug}
                                  alt={item.product_name}
                                  width={40}
                                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-lg bg-gray-55 dark:bg-slate-900 border border-gray-105 dark:border-white/5 shrink-0"
                                  containerClassName="w-8 h-8 sm:w-10 sm:h-10 shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-gray-800 dark:text-gray-200 break-words">{item.product_name}</p>
                                </div>
                              </td>
                              <td className="p-2 sm:p-4 text-center font-bold text-gray-700 dark:text-gray-300">
                                {item.quantity}
                              </td>
                              <td className="p-2 sm:p-4 text-right font-medium text-gray-650 dark:text-gray-400 whitespace-nowrap">
                                ₹{item.unit_price?.toFixed(2)}
                              </td>
                              <td className="p-2 sm:p-4 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                ₹{item.total_price?.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column: Calculations */}
                  <div className="w-full lg:w-[340px] shrink-0 space-y-4">
                    {/* Order Grand Total Summary */}
                    <div className="border border-gray-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-2.5 sm:space-y-3 bg-gray-50/30 dark:bg-slate-950/40">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>Subtotal</span>
                        <span className="font-bold text-gray-800 dark:text-gray-205">₹{selectedPastOrder.subtotal?.toFixed(2)}</span>
                      </div>
                      {selectedPastOrder.discount > 0 && (
                        <div className="flex justify-between text-xs text-red-500">
                          <span>Discount</span>
                          <span className="font-bold">-₹{selectedPastOrder.discount?.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>Delivery Partner Fee</span>
                        <span className="font-bold text-gray-800 dark:text-gray-205">₹{selectedPastOrder.delivery_fee?.toFixed(2)}</span>
                      </div>
                      <div className="h-px bg-gray-200 dark:bg-slate-700 my-1"></div>
                      <div className="flex justify-between text-sm font-extrabold text-gray-900 dark:text-white">
                        <span>Grand Total</span>
                        <span>₹{selectedPastOrder.total?.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Partner Net Payout Breakdown */}
                    {['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(selectedPastOrder.status) && (
                      <div className="bg-blue-600/5 dark:bg-blue-600/5 border border-blue-500/10 dark:border-blue-500/10 rounded-2xl p-4 sm:p-5 space-y-2.5">
                        <h4 className="text-[10px] font-black text-blue-800 dark:text-blue-500 uppercase tracking-wider">Supermarket Payout Details</h4>
                        
                        <div className="flex justify-between text-xs text-gray-650 dark:text-gray-400">
                          <span>Gross Sales (Subtotal)</span>
                          <span className="font-bold text-gray-800 dark:text-gray-200">₹{selectedPastOrder.subtotal?.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex justify-between text-xs text-red-500">
                          <span>Platform Commission ({commissionPct}%)</span>
                          <span className="font-bold">-₹{(selectedPastOrder.subtotal * (commissionPct / 100))?.toFixed(2)}</span>
                        </div>
                        
                        <div className="h-px bg-blue-600/10 dark:bg-blue-600/10 my-1"></div>
                        
                        <div className="flex justify-between text-sm font-extrabold text-blue-600 dark:text-blue-500">
                          <span>Net Payout</span>
                          <span>₹{(selectedPastOrder.subtotal * (1 - commissionPct / 100))?.toFixed(2)}</span>
                        </div>

                        {/* Payout Status Section */}
                        <div className="mt-2 pt-2 border-t border-blue-500/10 dark:border-blue-500/10 flex flex-col gap-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Payout Status</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase select-none ${
                              selectedPastOrder.mart_payout_status === 'paid'
                                ? 'bg-blue-600/10 text-blue-600 dark:text-blue-500 border border-blue-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20'
                            }`}>
                              {selectedPastOrder.mart_payout_status === 'paid' ? 'Paid / Settled' : 'Unpaid / Pending'}
                            </span>
                          </div>
                          {selectedPastOrder.mart_payout_status === 'paid' && (
                            <>
                              {selectedPastOrder.mart_payout_date && (
                                <div className="flex justify-between text-[10px] text-gray-550 dark:text-gray-450">
                                  <span>Settlement Date</span>
                                  <span className="font-mono text-gray-800 dark:text-gray-200">
                                    {new Date(selectedPastOrder.mart_payout_date).toLocaleDateString('en-IN', { 
                                      day: '2-digit', 
                                      month: 'short', 
                                      year: 'numeric' 
                                    })}
                                  </span>
                                </div>
                              )}
                              {selectedPastOrder.mart_payout_reference && (
                                <div className="flex justify-between text-[10px] text-gray-550 dark:text-gray-450">
                                  <span>Reference Ref #</span>
                                  <span className="font-mono select-all bg-gray-150 dark:bg-black/40 px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-200">
                                    {selectedPastOrder.mart_payout_reference}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        
                        <div className="bg-white/50 dark:bg-black/20 rounded-xl p-2 border border-blue-500/5 dark:border-blue-500/5 text-center">
                          <p className="text-[9px] text-gray-500 dark:text-gray-400 font-semibold italic">
                            Formula: Gross Sales - {commissionPct}% Commission = Net Payout
                          </p>
                          <p className="text-[9px] font-mono text-blue-700 dark:text-blue-500 mt-0.5">
                            ₹{selectedPastOrder.subtotal?.toFixed(2)} - ₹{(selectedPastOrder.subtotal * (commissionPct / 100))?.toFixed(2)} = ₹{(selectedPastOrder.subtotal * (1 - commissionPct / 100))?.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-500">
              <FileText className="w-16 h-16 text-gray-350 dark:text-gray-800 mb-3" />
              <p className="text-lg font-bold text-gray-800 dark:text-gray-350 font-sans">Select an order from history</p>
              <p className="text-sm text-gray-500 mt-1 max-w-sm leading-relaxed">Use the left column to select any past completed or cancelled order to inspect its invoices and itemized pricing details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default EarningsView
