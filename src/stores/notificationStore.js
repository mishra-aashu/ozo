import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useAuthStore } from './authStore'
import toast from 'react-hot-toast'

let notificationSubscription = null

export const useNotificationStore = create((set, get) => ({
  // State
  notifications: [],
  isLoading: false,

  // Fetch notifications
  fetchNotifications: async () => {
    try {
      const user = useAuthStore.getState().user
      if (!user) {
        set({ notifications: [] })
        return
      }

      set({ isLoading: true })

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ notifications: data || [], isLoading: false })
    } catch (error) {
      console.error('Fetch notifications error:', error)
      set({ isLoading: false })
    }
  },

  // Mark a single notification as read
  markAsRead: async (id) => {
    try {
      const user = useAuthStore.getState().user
      if (!user) return

      // Optimistic update
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
      }))

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error
    } catch (error) {
      console.error('Mark as read error:', error)
      // Refetch on error
      get().fetchNotifications()
    }
  },

  // Mark all notifications as read
  markAllAsRead: async (silent = false) => {
    try {
      const user = useAuthStore.getState().user
      if (!user) return

      // Optimistic update
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      }))

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error
      if (!silent) {
        toast.success('All notifications marked as read')
      }
    } catch (error) {
      console.error('Mark all as read error:', error)
      get().fetchNotifications()
    }
  },

  // Delete a single notification
  deleteNotification: async (id) => {
    try {
      const user = useAuthStore.getState().user
      if (!user) return

      // Optimistic update
      const previousNotifications = get().notifications
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }))

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        set({ notifications: previousNotifications })
        throw error
      }
      toast.success('Notification deleted')
    } catch (error) {
      console.error('Delete notification error:', error)
    }
  },

  // Clear all notifications
  clearAllNotifications: async () => {
    try {
      const user = useAuthStore.getState().user
      if (!user) return

      const previousNotifications = get().notifications
      set({ notifications: [] })

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        set({ notifications: previousNotifications })
        throw error
      }
      toast.success('All notifications cleared')
    } catch (error) {
      console.error('Clear all notifications error:', error)
    }
  },

  // Sound chime for new notifications
  playNotificationSound: () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const playTone = (freq, duration, delay) => {
        setTimeout(() => {
          const osc = audioContext.createOscillator()
          const gain = audioContext.createGain()
          osc.connect(gain)
          gain.connect(audioContext.destination)
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, audioContext.currentTime)
          gain.gain.setValueAtTime(0.12, audioContext.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration - 0.02)
          osc.start()
          osc.stop(audioContext.currentTime + duration)
        }, delay)
      }
      
      // Beautiful chime sound (E5 -> A5)
      playTone(659.25, 0.2, 0)
      playTone(880.00, 0.4, 120)
    } catch (err) {
      console.warn('Audio notification feedback failed', err)
    }
  },

  // Subscribe to real-time notification updates
  subscribeToNotifications: () => {
    if (notificationSubscription) return

    const user = useAuthStore.getState().user
    if (!user) return

    notificationSubscription = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new
          
          // Play sound chime
          get().playNotificationSound()
          
          // Show toast notification
          toast(`${newNotif.title}: ${newNotif.message}`, {
            icon: '🔔',
            duration: 4000,
          })

          // Update local state
          set((state) => ({
            notifications: [newNotif, ...state.notifications],
          }))
        }
      )
      .subscribe((status, err) => {
        if (err || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[NotificationStore] Realtime channel status: ${status}`, err)
          // Clean up the broken channel so that a subsequent call or component refresh can retry subscribing
          if (notificationSubscription) {
            supabase.removeChannel(notificationSubscription)
            notificationSubscription = null
          }
        } else {
          console.log(`[NotificationStore] Realtime subscription status: ${status}`)
        }
      })
  },

  // Unsubscribe
  unsubscribeFromNotifications: () => {
    if (notificationSubscription) {
      supabase.removeChannel(notificationSubscription)
      notificationSubscription = null
    }
  },
}))
