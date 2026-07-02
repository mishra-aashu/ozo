import { create } from 'zustand'
import { supabaseAdmin } from '../lib/supabase'

let activeChannels = []
let pollInterval = null

const getStoredLastSeen = () => {
  try {
    const val = localStorage.getItem('ozo_admin_last_seen')
    return val ? JSON.parse(val) : {}
  } catch (e) {
    return {}
  }
}

const setStoredLastSeen = (lastSeen) => {
  try {
    localStorage.setItem('ozo_admin_last_seen', JSON.stringify(lastSeen))
  } catch (e) {}
}

export const useAdminIndicatorStore = create((set, get) => ({
  badges: {
    orders: 0,
    requests: 0,
    reviews: 0,
    messages: 0,
    users: 0,
  },
  todayStats: {
    sales: 0,
    orders: 0,
  },
  lastSeen: getStoredLastSeen(),
  isLoading: false,

  markAsSeen: (section) => {
    const nowISO = new Date().toISOString()
    const updatedLastSeen = {
      ...get().lastSeen,
      [section]: nowISO
    }
    setStoredLastSeen(updatedLastSeen)
    set({ lastSeen: updatedLastSeen })
    get().fetchCounts()
  },

  fetchCounts: async () => {
    try {
      const lastSeen = get().lastSeen || {}
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayStartISO = todayStart.toISOString()

      // Define default cutoff timestamps
      const ordersCutoff = lastSeen.orders || '1970-01-01T00:00:00.000Z'
      const requestsCutoff = lastSeen.requests || '1970-01-01T00:00:00.000Z'
      const reviewsCutoff = lastSeen.reviews || '1970-01-01T00:00:00.000Z'
      const messagesCutoff = lastSeen.messages || '1970-01-01T00:00:00.000Z'
      // For users, default to maximum of 24h ago or lastSeen.users
      const usersCutoff = lastSeen.users && lastSeen.users > oneDayAgo ? lastSeen.users : oneDayAgo

      const [
        ordersRes,
        captainsRes,
        martAppsRes,
        returnReqsRes,
        reviewsRes,
        ticketsRes,
        usersRes,
        todayOrdersRes
      ] = await Promise.all([
        supabaseAdmin
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'CONFIRMED_SYSTEM')
          .gt('created_at', ordersCutoff),

        supabaseAdmin
          .from('captains')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending_verification')
          .gt('created_at', requestsCutoff),

        supabaseAdmin
          .from('mart_applications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending_verification')
          .gt('created_at', requestsCutoff),

        supabaseAdmin
          .from('return_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .gt('created_at', requestsCutoff),

        supabaseAdmin
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .eq('is_image_approved', false)
          .gt('created_at', reviewsCutoff),

        supabaseAdmin
          .from('support_tickets')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'open')
          .gt('created_at', messagesCutoff),

        supabaseAdmin
          .from('users')
          .select('id', { count: 'exact', head: true })
          .gt('created_at', usersCutoff),

        supabaseAdmin
          .from('orders')
          .select('total, status')
          .gte('created_at', todayStartISO)
      ])

      const todayOrders = todayOrdersRes.data || []
      const todaySales = todayOrders
        .filter(o => o.status !== 'cancelled' && o.status !== 'CANCELLED_BY_USER')
        .reduce((sum, o) => sum + (o.total || 0), 0)

      set({
        badges: {
          orders: ordersRes.count || 0,
          requests: (captainsRes.count || 0) + (martAppsRes.count || 0) + (returnReqsRes.count || 0),
          reviews: reviewsRes.count || 0,
          messages: ticketsRes.count || 0,
          users: usersRes.count || 0,
        },
        todayStats: {
          sales: todaySales,
          orders: todayOrders.length,
        }
      })
    } catch (err) {
      console.warn('[IndicatorStore] Failed to fetch badge counts:', err)
    }
  },

  startSubscribing: () => {
    const { fetchCounts } = get()
    
    // Fetch immediately
    fetchCounts()

    // Setup periodic polling
    if (!pollInterval) {
      pollInterval = setInterval(fetchCounts, 30000)
    }

    // Setup realtime channels
    if (activeChannels.length === 0) {
      const subscribeToTable = (table, event = '*') => {
        const channel = supabaseAdmin
          .channel(`admin-indicator-${table}`)
          .on(
            'postgres_changes',
            { event, schema: 'public', table },
            () => {
              fetchCounts()
            }
          )
          .subscribe()
        activeChannels.push(channel)
      }

      subscribeToTable('orders')
      subscribeToTable('captains')
      subscribeToTable('mart_applications')
      subscribeToTable('return_requests')
      subscribeToTable('reviews')
      subscribeToTable('support_tickets')
      subscribeToTable('users', 'INSERT')
    }
  },

  stopSubscribing: () => {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }

    if (activeChannels.length > 0) {
      activeChannels.forEach(ch => supabaseAdmin.removeChannel(ch))
      activeChannels = []
    }
  }
}))
