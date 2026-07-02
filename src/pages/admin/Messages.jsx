import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Search,
  Mail,
  Trash2,
  Calendar,
  Clock,
  User,
  X,
  RefreshCw,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Headphones,
  CheckCircle2,
  Send,
  MessageCircle
} from 'lucide-react'
import { supabaseAdmin as supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { useAdminIndicatorStore } from '../../stores/adminIndicatorStore'


const Messages = () => {
  // Desk Mode
  const [deskMode, setDeskMode] = useState('contact') // 'contact' or 'tickets'

  // Contact form state
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [contactStats, setContactStats] = useState({
    total: 0,
    orderIssues: 0,
    paymentQueries: 0,
    feedback: 0,
    other: 0
  })

  // Live Support Tickets state
  const [tickets, setTickets] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [ticketSearchQuery, setTicketSearchQuery] = useState('')
  const [activeTicketFilter, setActiveTicketFilter] = useState('all') // 'all', 'open', 'in_progress', 'resolved'
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [ticketMessages, setTicketMessages] = useState([])
  const [loadingTicketMessages, setLoadingTicketMessages] = useState(false)
  const [adminNewMessage, setAdminNewMessage] = useState('')
  const [sendingAdminMessage, setSendingAdminMessage] = useState(false)

  const [ticketStats, setTicketStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0
  })

  const messagesEndRef = useRef(null)

  // =============================================
  // CONTACT MESSAGES HANDLERS
  // =============================================

  const loadMessages = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setMessages(data || [])
      calculateContactStats(data || [])
    } catch (error) {
      console.error('Error loading support messages:', error)
      toast.error('Failed to load support messages')
    } finally {
      setLoading(false)
    }
  }

  const calculateContactStats = (data) => {
    const total = data.length
    const orderIssues = data.filter((m) => m.subject === 'Order Issue').length
    const paymentQueries = data.filter((m) => m.subject === 'Payment Query').length
    const feedback = data.filter((m) => m.subject === 'Feedback').length
    const other = data.filter((m) => m.subject === 'Other').length

    setContactStats({ total, orderIssues, paymentQueries, feedback, other })
  }

  const handleDeleteMessage = async (id) => {
    if (!window.confirm('Are you sure you want to delete this message? This action is permanent.')) return
    
    setIsDeleting(true)
    const toastId = toast.loading('Deleting support message...')
    try {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Message deleted successfully', { id: toastId })
      setSelectedMessage(null)
      loadMessages()
    } catch (err) {
      console.error('Error deleting message:', err)
      toast.error('Failed to delete message: ' + err.message, { id: toastId })
    } finally {
      setIsDeleting(false)
    }
  }

  const getFilteredMessages = () => {
    return messages.filter((msg) => {
      if (activeTab !== 'all' && msg.subject !== activeTab) {
        return false
      }
      const query = searchQuery.toLowerCase().trim()
      if (!query) return true

      return (
        msg.full_name?.toLowerCase().includes(query) ||
        msg.email?.toLowerCase().includes(query) ||
        msg.message?.toLowerCase().includes(query) ||
        msg.subject?.toLowerCase().includes(query)
      )
    })
  }

  const getSubjectBadgeStyles = (subject) => {
    switch (subject) {
      case 'Order Issue':
        return 'bg-red-500/10 border border-red-500/20 text-red-500'
      case 'Payment Query':
        return 'bg-amber-500/10 border border-amber-500/20 text-amber-500'
      case 'Feedback':
        return 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
      default:
        return 'bg-blue-500/10 border border-blue-500/20 text-blue-500'
    }
  }

  // =============================================
  // SUPPORT TICKETS & CHATS HANDLERS
  // =============================================

  const loadTickets = async () => {
    setLoadingTickets(true)
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          users (
            full_name,
            email,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setTickets(data || [])
      calculateTicketStats(data || [])
    } catch (error) {
      console.error('Error loading support tickets:', error)
      toast.error('Failed to load live support tickets')
    } finally {
      setLoadingTickets(false)
    }
  }

  const calculateTicketStats = (data) => {
    const total = data.length
    const open = data.filter((t) => t.status === 'open').length
    const inProgress = data.filter((t) => t.status === 'in_progress').length
    const resolved = data.filter((t) => ['resolved', 'closed'].includes(t.status)).length

    setTicketStats({ total, open, inProgress, resolved })
  }

  const getFilteredTickets = () => {
    return tickets.filter((t) => {
      // Keep selected ticket visible in list even if filter doesn't match anymore
      if (selectedTicket?.id === t.id) return true

      if (activeTicketFilter !== 'all') {
        if (activeTicketFilter === 'resolved') {
          if (t.status !== 'resolved' && t.status !== 'closed') return false
        } else if (t.status !== activeTicketFilter) {
          return false
        }
      }

      const query = ticketSearchQuery.toLowerCase().trim()
      if (!query) return true

      return (
        t.subject?.toLowerCase().includes(query) ||
        t.message?.toLowerCase().includes(query) ||
        t.users?.full_name?.toLowerCase().includes(query) ||
        t.users?.email?.toLowerCase().includes(query) ||
        t.id?.toLowerCase().includes(query)
      )
    })
  }

  const loadTicketMessages = async (ticket) => {
    setSelectedTicket(ticket)
    setLoadingTicketMessages(true)

    // Automatically mark the ticket status as 'in_progress' (seen) when opened if it was 'open'
    if (ticket.status === 'open') {
      try {
        await supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', ticket.id)

        // Add system message logging the update
        await supabase
          .from('support_ticket_messages')
          .insert({
            ticket_id: ticket.id,
            sender_role: 'system',
            message: `Ticket status marked as IN_PROGRESS (seen by admin).`
          })

        // Update local ticket details in the list and current stats
        const updatedTickets = tickets.map(t => t.id === ticket.id ? { ...t, status: 'in_progress' } : t)
        setTickets(updatedTickets)
        calculateTicketStats(updatedTickets)
        setSelectedTicket(prev => prev && prev.id === ticket.id ? { ...prev, status: 'in_progress' } : prev)

        // Refresh sidebar badges
        useAdminIndicatorStore.getState().fetchCounts()
      } catch (err) {
        console.error('Error auto-marking ticket status:', err)
      }
    }

    try {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setTicketMessages(data || [])
    } catch (err) {
      console.error('Error loading ticket messages:', err)
      toast.error('Failed to load conversation messages')
    } finally {
      setLoadingTicketMessages(false)
    }
  }

  const handleSendAdminReply = async (e) => {
    e.preventDefault()
    if (!adminNewMessage.trim() || !selectedTicket) return

    setSendingAdminMessage(true)
    const replyText = adminNewMessage.trim()
    setAdminNewMessage('')

    try {
      const { data: authUser } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_id: authUser?.user?.id || null,
          sender_role: 'agent',
          message: replyText
        })

      if (error) throw error

      // Update ticket status to in_progress if it was open
      if (selectedTicket.status === 'open') {
        await handleUpdateTicketStatus(selectedTicket.id, 'in_progress', false)
      }
    } catch (err) {
      console.error('Error sending admin reply:', err)
      toast.error('Failed to send message')
    } finally {
      setSendingAdminMessage(false)
    }
  }

  const handleUpdateTicketStatus = async (ticketId, newStatus, notify = true) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus })
        .eq('id', ticketId)

      if (error) throw error

      // Add system message logging the update
      await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: ticketId,
          sender_role: 'system',
          message: `Ticket status marked as ${newStatus.toUpperCase()} by Support Desk.`
        })

      if (notify) {
        toast.success(`Ticket status updated to ${newStatus}`)
      }

      // Update local ticket details
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t))
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => ({ ...prev, status: newStatus }))
      }
      calculateTicketStats(tickets)
    } catch (err) {
      console.error('Error updating ticket status:', err)
      toast.error('Failed to update status')
    }
  }

  const handleDeleteTicket = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this ticket and all its chat messages permanently?')) return

    const toastId = toast.loading('Deleting ticket...')
    try {
      const { error } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', ticketId)

      if (error) throw error

      toast.success('Ticket deleted successfully', { id: toastId })
      setSelectedTicket(null)
      loadTickets()
    } catch (err) {
      console.error('Error deleting ticket:', err)
      toast.error('Failed to delete ticket', { id: toastId })
    }
  }

  // Auto scroll messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [ticketMessages, selectedTicket])

  // Realtime messages subscription for admin view
  useEffect(() => {
    if (!selectedTicket) return

    const channel = supabase
      .channel(`admin-ticket-chat-${selectedTicket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_messages',
          filter: `ticket_id=eq.${selectedTicket.id}`
        },
        (payload) => {
          setTicketMessages((prev) => {
            if (prev.some(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [selectedTicket])

  // Load appropriate data based on tab selection
  useEffect(() => {
    if (deskMode === 'contact') {
      loadMessages()
    } else {
      loadTickets()
    }
  }, [deskMode])

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium">
        <div>
          <h1 className="text-3xl font-black text-gradient">Support Desk</h1>
          <p className="text-sm text-ozo-gray mt-1">
            {deskMode === 'contact' 
              ? 'Review contact form submissions and guest messages.' 
              : 'Interact with registered customers in real-time support chat rooms.'}
          </p>
        </div>
        
        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* Segmented Control Mode Switcher */}
          <div className="flex bg-gray-150 dark:bg-white/5 p-1 rounded-2xl border border-gray-200/50 dark:border-white/5">
            <button
              onClick={() => setDeskMode('contact')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
                deskMode === 'contact'
                  ? 'bg-gradient-ozo text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Mail size={14} />
              Inbox Form
            </button>
            <button
              onClick={() => setDeskMode('tickets')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
                deskMode === 'tickets'
                  ? 'bg-gradient-ozo text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <MessageCircle size={14} />
              Live Tickets
            </button>
          </div>

          <button
            onClick={deskMode === 'contact' ? loadMessages : loadTickets}
            className="p-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-2xl border border-gray-200 dark:border-white/10 transition-all flex items-center justify-center"
            title="Reload Data"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || loadingTickets) ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INBOX/CONTACT MESSAGES TAB */}
      {/* ========================================================================= */}
      {deskMode === 'contact' && (
        <>
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">Total Inbox</span>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600">
                  <MessageSquare className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black mt-2 text-gray-900 dark:text-white">{contactStats.total}</p>
            </div>

            <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">Order Issues</span>
                <div className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black mt-2 text-red-600">{contactStats.orderIssues}</p>
            </div>

            <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">Payments</span>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black mt-2 text-amber-600">{contactStats.paymentQueries}</p>
            </div>

            <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">Feedback</span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
                  <User className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black mt-2 text-emerald-600">{contactStats.feedback}</p>
            </div>

            <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">Others</span>
                <div className="p-2 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-500">
                  <MessageSquare className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black mt-2 text-gray-900 dark:text-white">{contactStats.other}</p>
            </div>
          </div>

          {/* Tabs & Search Controls */}
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between p-4 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
            <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl w-full lg:w-auto overflow-x-auto whitespace-nowrap">
              {['all', 'Order Issue', 'Payment Query', 'Feedback', 'Other'].map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSelectedMessage(null); }}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                    activeTab === tab
                      ? 'bg-white dark:bg-[#161622] text-[#FF3366] shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab} ({
                    tab === 'all' ? contactStats.total
                    : tab === 'Order Issue' ? contactStats.orderIssues
                    : tab === 'Payment Query' ? contactStats.paymentQueries
                    : tab === 'Feedback' ? contactStats.feedback
                    : contactStats.other
                  })
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, email, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-ozo-red text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Inbox List Table */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-ozo-red" />
                <p className="text-sm font-semibold text-gray-500">Retrieving messages...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Sender</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Subject</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Message Preview</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Submitted On</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-gray-300">
                    {getFilteredMessages().length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-12 text-center text-sm text-gray-500">
                          No customer contact messages found.
                        </td>
                      </tr>
                    ) : (
                      getFilteredMessages().map((msg) => (
                        <tr
                          key={msg.id}
                          onClick={() => setSelectedMessage(msg)}
                          className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors cursor-pointer"
                        >
                          <td className="p-4">
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white">{msg.full_name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{msg.email}</div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getSubjectBadgeStyles(msg.subject)}`}>
                              {msg.subject}
                            </span>
                          </td>
                          <td className="p-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 max-w-[280px]">
                              {msg.message}
                            </p>
                          </td>
                          <td className="p-4 text-xs text-gray-500 font-semibold">
                            {new Date(msg.created_at).toLocaleString()}
                          </td>
                          <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedMessage(msg)}
                                className="p-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg transition-all"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-2 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/45 text-red-650 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* LIVE SUPPORT TICKETS TAB */}
      {/* ========================================================================= */}
      {deskMode === 'tickets' && (
        <>
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">Total Tickets</span>
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600">
                  <MessageCircle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black mt-2 text-gray-900 dark:text-white">{ticketStats.total}</p>
            </div>

            <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">Open / New</span>
                <div className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black mt-2 text-red-600">{ticketStats.open}</p>
            </div>

            <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">In Progress</span>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black mt-2 text-amber-600">{ticketStats.inProgress}</p>
            </div>

            <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase">Resolved</span>
                <div className="p-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-black mt-2 text-green-600">{ticketStats.resolved}</p>
            </div>
          </div>

          {/* Tabs & Search Controls */}
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between p-4 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
            <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl w-full lg:w-auto overflow-x-auto whitespace-nowrap">
              {['all', 'open', 'in_progress', 'resolved'].map(filter => (
                <button
                  key={filter}
                  onClick={() => { setActiveTicketFilter(filter); setSelectedTicket(null); }}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                    activeTicketFilter === filter
                      ? 'bg-white dark:bg-[#161622] text-[#FF3366] shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter.replace('_', ' ')} ({
                    filter === 'all' ? ticketStats.total
                    : filter === 'open' ? ticketStats.open
                    : filter === 'in_progress' ? ticketStats.inProgress
                    : ticketStats.resolved
                  })
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search ticket subject, user name, ID..."
                value={ticketSearchQuery}
                onChange={(e) => setTicketSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-ozo-red text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Tickets List Table */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium overflow-hidden">
            {loadingTickets ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-ozo-red" />
                <p className="text-sm font-semibold text-gray-500">Retrieving support tickets...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Ticket ID</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Customer</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Subject</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Priority</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Created</th>
                      <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-700 dark:text-gray-300">
                    {getFilteredTickets().length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-12 text-center text-sm text-gray-500">
                          No customer support tickets found.
                        </td>
                      </tr>
                    ) : (
                      getFilteredTickets().map((t) => (
                        <tr
                          key={t.id}
                          onClick={() => loadTicketMessages(t)}
                          className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors cursor-pointer"
                        >
                          <td className="p-4 text-xs font-black text-gray-500">
                            #{t.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="p-4">
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white">{t.users?.full_name || 'Ozo Customer'}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{t.users?.email}</div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-bold text-gray-850 dark:text-gray-200 block text-xs truncate max-w-[200px]">
                              {t.subject}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              t.status === 'open'
                                ? 'bg-red-500/10 text-red-500 border border-red-500/25'
                                : t.status === 'in_progress'
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/25'
                                : 'bg-green-500/10 text-green-500 border border-green-500/25'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`text-[10px] font-bold ${
                              t.priority === 'high' ? 'text-red-550' : 'text-gray-450'
                            }`}>
                              {t.priority || 'medium'}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-gray-500 font-semibold">
                            {new Date(t.created_at).toLocaleString()}
                          </td>
                          <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => loadTicketMessages(t)}
                                className="p-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg transition-all"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTicket(t.id)}
                                className="p-2 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/45 text-red-650 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* MESSAGE DETAILS DRAWER OVERLAY (CONTACT SUBMISSIONS) */}
      <AnimatePresence>
        {selectedMessage && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMessage(null)}
              className="fixed inset-0 bg-black/60 z-50 cursor-pointer backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-xl bg-white dark:bg-[#0c0c12] border-l border-gray-200 dark:border-white/5 shadow-2xl z-50 flex flex-col font-sans overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50 dark:bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-950/30 p-2.5 rounded-xl text-blue-600">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-gray-900 dark:text-white uppercase tracking-tight">Support Message</h3>
                    <p className="text-xs text-gray-500">ID: {selectedMessage.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors text-gray-500 hover:text-gray-800 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Meta details */}
                <div className="p-5 bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl space-y-4">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Sender Name</span>
                    <p className="text-sm font-extrabold text-gray-950 dark:text-white mt-0.5">{selectedMessage.full_name}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Email Address</span>
                    <a
                      href={`mailto:${selectedMessage.email}`}
                      className="text-sm font-extrabold text-blue-600 hover:underline mt-0.5 flex items-center gap-1.5"
                    >
                      <Mail className="w-4 h-4" /> {selectedMessage.email} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Subject Tag</span>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getSubjectBadgeStyles(selectedMessage.subject)}`}>
                          {selectedMessage.subject}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Received On</span>
                      <p className="text-xs font-bold text-gray-950 dark:text-gray-200 mt-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {new Date(selectedMessage.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Message Body */}
                <div className="space-y-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Message Content</span>
                  <div className="p-5 bg-gray-50 dark:bg-white/[0.01] border border-gray-100 dark:border-white/5 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200 font-medium select-text">
                    {selectedMessage.message}
                  </div>
                </div>
              </div>

              {/* Drawer Actions */}
              <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.01] flex items-center justify-between gap-4">
                <button
                  onClick={() => handleDeleteMessage(selectedMessage.id)}
                  disabled={isDeleting}
                  className="flex items-center gap-2 border border-red-200 dark:border-red-950 text-red-650 hover:bg-red-500/5 px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete query
                </button>
                <a
                  href={`mailto:${selectedMessage.email}?subject=Re: [OZO Support] ${selectedMessage.subject}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-ozo text-white px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-opacity text-center shadow-lg"
                >
                  <Mail className="w-4 h-4" />
                  Reply via Email
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* TICKET CHAT ROOM DRAWER OVERLAY */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedTicket && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicket(null)}
              className="fixed inset-0 bg-black/60 z-50 cursor-pointer backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-xl bg-white dark:bg-[#0c0c12] border-l border-gray-200 dark:border-white/5 shadow-2xl z-50 flex flex-col font-sans overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50 dark:bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 dark:bg-purple-950/30 p-2.5 rounded-xl text-purple-600">
                    <MessageCircle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900 dark:text-white uppercase tracking-tight truncate max-w-[280px]">
                      {selectedTicket.subject}
                    </h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                      Ticket: #{selectedTicket.id.slice(0, 8).toUpperCase()} • Customer: {selectedTicket.users?.full_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors text-gray-500 hover:text-gray-800 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Header Actions Bar */}
              <div className="px-6 py-3 bg-gray-100/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-gray-400">Current Status:</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                    selectedTicket.status === 'open'
                      ? 'bg-red-500/10 text-red-500'
                      : selectedTicket.status === 'in_progress'
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-green-500/10 text-green-500'
                  }`}>
                    {selectedTicket.status}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-gray-400">Change Status:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'open')}
                      disabled={selectedTicket.status === 'open'}
                      className="px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded bg-red-100 dark:bg-red-950/20 text-red-600 disabled:opacity-40"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'in_progress')}
                      disabled={selectedTicket.status === 'in_progress'}
                      className="px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded bg-amber-100 dark:bg-amber-950/20 text-amber-600 disabled:opacity-40"
                    >
                      Investigate
                    </button>
                    <button
                      onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'resolved')}
                      disabled={selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'}
                      className="px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded bg-green-150 dark:bg-green-950/20 text-green-600 disabled:opacity-40"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              </div>

              {/* Chat Thread Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 dark:bg-black/20">
                {loadingTicketMessages ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-ozo-red" />
                    <p className="text-xs text-gray-400">Loading conversation thread...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Ticket details description card */}
                    <div className="p-4 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/5 rounded-2xl space-y-1">
                      <span className="text-[9px] font-black uppercase text-ozo-red tracking-wider">Initial Customer Query</span>
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-300 whitespace-pre-wrap leading-relaxed select-text">
                        {selectedTicket.message}
                      </p>
                      <div className="text-[9px] text-gray-500 pt-2 font-medium">
                        Created: {new Date(selectedTicket.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="border-b border-gray-200 dark:border-white/5 my-2" />

                    {/* Chat Bubbles */}
                    {ticketMessages.map((msg, idx) => {
                      const isAgent = msg.sender_role === 'agent'
                      const isBot = msg.sender_role === 'bot'
                      const isSystem = msg.sender_role === 'system'

                      if (isSystem) {
                        return (
                          <div key={msg.id || idx} className="text-center my-2">
                            <span className="px-3 py-1 bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 rounded-lg text-[9px] font-bold uppercase tracking-wider inline-block">
                              {msg.message}
                            </span>
                          </div>
                        )
                      }

                      return (
                        <div
                          key={msg.id || idx}
                          className={`flex ${isAgent ? 'justify-end' : 'justify-start'} gap-2`}
                        >
                          {!isAgent && (
                            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-bold text-xs uppercase">
                              {isBot ? 'B' : (selectedTicket.users?.full_name?.[0] || 'C')}
                            </div>
                          )}
                          <div className={`max-w-[75%] p-3.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
                            isAgent
                              ? 'bg-gradient-ozo text-white rounded-br-none'
                              : isBot
                              ? 'bg-amber-50 dark:bg-amber-900/15 text-amber-800 dark:text-amber-200 border border-amber-200/25 rounded-bl-none'
                              : 'bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white border border-gray-200 dark:border-white/5 rounded-bl-none'
                          }`}>
                            {isAgent && (
                              <div className="text-[8px] font-black uppercase text-white/75 mb-1">Support Desk Agent</div>
                            )}
                            {msg.message}
                            <div className={`text-[8px] text-right mt-1.5 font-normal ${isAgent ? 'text-white/60' : 'text-gray-400'}`}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Chat Send Reply Form */}
              {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' ? (
                <form onSubmit={handleSendAdminReply} className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.01] flex gap-2">
                  <input
                    type="text"
                    value={adminNewMessage}
                    onChange={(e) => setAdminNewMessage(e.target.value)}
                    placeholder="Type support reply or solution here..."
                    className="flex-1 px-4 py-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-ozo-red text-gray-900 dark:text-white font-medium"
                  />
                  <button
                    type="submit"
                    disabled={!adminNewMessage.trim() || sendingAdminMessage}
                    className="p-3 bg-gradient-ozo text-white rounded-xl shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                  >
                    {sendingAdminMessage ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-b-xl text-center text-xs font-bold uppercase tracking-wider border-t border-gray-200 dark:border-white/10">
                  This Ticket has been resolved and closed.
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Messages
