import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  HelpCircle, 
  Package, 
  CreditCard, 
  RefreshCcw, 
  User, 
  ShieldCheck, 
  ChevronRight,
  MessageCircle,
  Phone,
  Mail,
  Clock,
  Send,
  X,
  ArrowLeft,
  Bot,
  FileText,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Headphones
} from 'lucide-react'
import { useCartStore } from '../stores/cartStore'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import SEO from '../components/SEO'
import toast from 'react-hot-toast'
import { Link, useNavigate, useLocation } from 'react-router-dom'

const Help = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Chat states
  const { user, isAuthenticated } = useAuthStore()
  const [chatState, setChatState] = useState('menu') // 'menu', 'track_orders', 'report_issue_select_order', 'report_issue_reason', 'general_query_input', 'ticket_chat', 'view_tickets'

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('chat') === 'open' || location.state?.openChat) {
      if (!isAuthenticated) {
        toast.error('Please log in to chat with support')
        navigate('/auth?redirect=/help?chat=open')
        return
      }
      setIsChatOpen(true)
      setChatState('general_query_input')
      
      // Clear URL search params/state so refreshing or history navigation doesn't force re-opening
      navigate('/help', { replace: true, state: {} })
    }
  }, [location, isAuthenticated, navigate])
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [issueReason, setIssueReason] = useState('')
  const [issueDetail, setIssueDetail] = useState('')
  const [creatingTicket, setCreatingTicket] = useState(false)
  const [tickets, setTickets] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(false)
  
  const [activeTicket, setActiveTicket] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [newMessageText, setNewMessageText] = useState('')
  const [isAgentTyping, setIsAgentTyping] = useState(false)
  const [agentName, setAgentName] = useState('Rahul')

  const chatEndRef = useRef(null)
  const faqSectionRef = useRef(null)

  const helpSchema = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How do I track my OZO Mart order?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can track your order in real-time in the 'My Orders' section of the OZO app or website. We also send SMS tracking updates."
        }
      },
      {
        "@type": "Question",
        "name": "What is OZO Mart's average delivery time?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "OZO Mart delivers all groceries, vegetables, and fresh fruits within an average of 30 minutes depending on your distance from the nearest dark store."
        }
      },

      {
        "@type": "Question",
        "name": "How can I contact customer support?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our customer support team is available 24/7. You can start a live chat in the OZO app, call our support helpline, or email aashutoshk625@gmail.com."
        }
      }
    ]
  }), []);

  const categories = [
    { id: 'orders', title: 'Orders & Delivery', icon: Package, color: 'bg-blue-500', description: 'Tracking, delivery time, missing items' },
    { id: 'payments', title: 'Payments & Wallet', icon: CreditCard, color: 'bg-green-500', description: 'Payment methods, refunds, wallet issues' },
    { id: 'refunds', title: 'Returns & Refunds', icon: RefreshCcw, color: 'bg-red-500', description: 'Return policy, refund status' },
    { id: 'account', title: 'Account & Profile', icon: User, color: 'bg-purple-500', description: 'Login issues, manage address, profile' },
    { id: 'safety', title: 'Safety & Privacy', icon: ShieldCheck, color: 'bg-orange-500', description: 'Data privacy, secure payments' },
    { id: 'others', title: 'Others', icon: HelpCircle, color: 'bg-gray-500', description: 'General queries and feedback' },
  ]

  const { deliveryConfig } = useCartStore()
  const freeAbove = deliveryConfig?.free_above ?? 99

  const allFaqs = useMemo(() => [
    { category: 'orders', question: 'How can I track my order?', answer: 'You can track your order in the "My Orders" section of your profile. We also send real-time updates via SMS and push notifications as soon as the rider is assigned.' },
    { category: 'orders', question: 'What is OZO Mart delivery time?', answer: 'We deliver all OZO Mart orders within an average of 30 minutes, depending on your distance from our local dark store and traffic conditions.' },
    { category: 'orders', question: 'How do I cancel my order?', answer: 'Orders can be cancelled before they are dispatched or picked up by our captain. Open your order details under "My Orders" and select "Cancel Order". If the order has already been dispatched, please contact live chat support.' },
    { category: 'payments', question: 'What payment methods do you accept?', answer: 'We accept all major Credit/Debit cards, UPI payments (PhonePe, Google Pay, Paytm), Net Banking, OZO Wallet, and Cash on Delivery (COD) in all serviceable regions.' },
    { category: 'payments', question: 'My payment failed, but money was debited. What should I do?', answer: 'Please do not worry. Failed transactions are usually refunded by your bank automatically within 3-5 business days. If the status doesn\'t update, please start a live support chat and share the transaction ID.' },
    { category: 'refunds', question: 'How long does a refund take?', answer: 'Once approved, refunds for UPI or OZO Wallet transactions are credited within 24 hours. For Debit/Credit cards, it may take 3-5 business days depending on your bank\'s clearing cycle.' },
    { category: 'refunds', question: 'What is your return policy?', answer: 'Due to safety and hygiene standards, all grocery items are non-returnable once accepted. However, if you receive a damaged, spoiled, expired, or incorrect item, you must report it within 15 minutes of delivery via in-app Support with a live photo. To maintain food safety, since items include perishables requiring immediate refrigeration, logging issues within 15 minutes allows our dark stores to instantly investigate the batch and process your refund or replacement.' },
    { category: 'account', question: 'How do I add a new delivery address?', answer: 'Go to your Profile settings, click on "Addresses", and select "Add New Address". You can pin your exact GPS location on the map for automated delivery routing.' },
    { category: 'account', question: 'Can I change my registered phone number?', answer: 'Yes, but for account security, a phone number change requires OTP verification. You can update your details in your Profile section or drop a request on live support.' },
    { category: 'safety', question: 'Is my payment secure on OZO Mart?', answer: 'Absolutely! We use industry-standard encrypted gateways (PCI-DSS compliant SSL channels) to process all online payments. We never store or view your credit card credentials.' },
    { category: 'safety', question: 'How is my personal data protected?', answer: 'We strictly protect your privacy. Your data is encrypted and only shared with dark store operators and delivery riders to fulfill your orders. We never sell your personal information.' },
    { category: 'others', question: 'How do I contact OZO Mart for corporate partnerships?', answer: 'For marketing, business partnerships, or franchise enquiries, please drop us an email at aashutoshk625@gmail.com. Our corporate team will contact you within 24 hours.' },
    { category: 'others', question: 'Where does OZO Mart operate?', answer: 'We currently operate quick-commerce dark stores in Aurangabad and Patna, Bihar, and are expanding rapidly to other regional hubs.' }
  ], [freeAbove]);

  // Filter FAQs
  const filteredFaqs = useMemo(() => {
    return allFaqs.filter(faq => {
      const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory
      const query = searchQuery.toLowerCase().trim()
      if (!query) return matchesCategory

      return matchesCategory && (
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
      )
    })
  }, [selectedCategory, searchQuery, allFaqs])

  // Handle Category click
  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId === selectedCategory ? 'all' : categoryId)
    // Smooth scroll to FAQs
    if (faqSectionRef.current) {
      faqSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Scroll chat messages to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, isAgentTyping, chatState])

  // Realtime subscription setup for support messages
  useEffect(() => {
    if (!activeTicket) return

    const channel = supabase
      .channel(`support-chat-${activeTicket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_ticket_messages',
          filter: `ticket_id=eq.${activeTicket.id}`
        },
        (payload) => {
          setChatMessages((prev) => {
            if (prev.some(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [activeTicket])

  // Fetch user orders for support bot
  const fetchOrders = async () => {
    if (!user) return
    setLoadingOrders(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, created_at, total, delivery_city, recipient_name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      console.error('Error fetching orders:', err)
      toast.error('Failed to load recent orders')
    } finally {
      setLoadingOrders(false)
    }
  }

  // Fetch user's support tickets
  const fetchTickets = async () => {
    if (!user) return
    setLoadingTickets(true)
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, subject, status, priority, created_at, updated_at, order_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTickets(data || [])
    } catch (err) {
      console.error('Error fetching support tickets:', err)
      toast.error('Failed to load active tickets')
    } finally {
      setLoadingTickets(false)
    }
  }

  // Load chat messages for active ticket
  const loadTicketMessages = async (ticket) => {
    setActiveTicket(ticket)
    setLoadingMessages(true)
    try {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setChatMessages(data || [])
      setChatState('ticket_chat')

      // Check if ticket is fresh (only 1 user message, no agent replies) to simulate agent join
      const userMsgs = (data || []).filter(m => m.sender_role === 'user')
      const agentMsgs = (data || []).filter(m => m.sender_role === 'agent')
      if (userMsgs.length > 0 && agentMsgs.length === 0 && ticket.status === 'open') {
        triggerSimulatedAgent(ticket.id)
      }
    } catch (err) {
      console.error('Error fetching ticket messages:', err)
      toast.error('Failed to load conversation')
    } finally {
      setLoadingMessages(false)
    }
  }

  // Simulated agent response
  const triggerSimulatedAgent = (ticketId) => {
    const selectedName = 'Rahul'
    setAgentName(selectedName)

    setTimeout(() => {
      setIsAgentTyping(true)
      setTimeout(async () => {
        setIsAgentTyping(false)
        
        // Check if ticket is still active and status is open before inserting
        try {
          const { data: ticketCheck } = await supabase
            .from('support_tickets')
            .select('status')
            .eq('id', ticketId)
            .single()

          if (ticketCheck && ticketCheck.status !== 'closed') {
            const agentReplyText = `Namaste! I am ${selectedName} from OZO Customer Care. I have received your request regarding this query. Let me look into this for you right away. Could you please share any specific details if needed?`
            
            await supabase
              .from('support_ticket_messages')
              .insert({
                ticket_id: ticketId,
                sender_role: 'agent',
                message: agentReplyText
              })
          }
        } catch (e) {
          console.warn('Failed to insert simulated agent response:', e)
        }
      }, 3000)
    }, 2000)
  }

  // Create support ticket
  const handleCreateTicket = async (subject, initialMessage, orderId = null) => {
    if (!user) return
    setCreatingTicket(true)
    const toastId = toast.loading('Connecting to Support Desk...')
    try {
      // 1. Create support ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          order_id: orderId,
          subject: subject,
          message: initialMessage,
          status: 'open',
          priority: orderId ? 'high' : 'medium'
        })
        .select()
        .single()

      if (ticketError) throw ticketError

      // 2. Create initial message
      const { error: msgError } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          sender_role: 'user',
          message: initialMessage
        })

      if (msgError) throw msgError

      // 3. Create bot confirmation message
      const botConfirmText = `Your Support Ticket has been registered successfully (ID: ${ticket.id.slice(0,8)}). An agent is being assigned to help you.`
      await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: ticket.id,
          sender_role: 'bot',
          message: botConfirmText
        })

      toast.success('Ticket created successfully!', { id: toastId })
      
      // Reset inputs
      setIssueDetail('')
      setIssueReason('')
      setSelectedOrder(null)
      
      // Load the chat
      loadTicketMessages(ticket)
    } catch (err) {
      console.error('Error creating ticket:', err)
      toast.error('Failed to start chat support', { id: toastId })
    } finally {
      setCreatingTicket(false)
    }
  }

  // Send a new message in active thread
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessageText.trim() || !activeTicket) return

    const textToSend = newMessageText.trim()
    setNewMessageText('')

    try {
      const { error } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: activeTicket.id,
          sender_id: user.id,
          sender_role: 'user',
          message: textToSend
        })

      if (error) throw error

      // Trigger another simulated response if only bot/user messages exist to simulate agent dialogue
      const { data: currentMessages } = await supabase
        .from('support_ticket_messages')
        .select('sender_role')
        .eq('ticket_id', activeTicket.id)
      
      const agentReplies = currentMessages?.filter(m => m.sender_role === 'agent') || []
      if (agentReplies.length <= 1) {
        setTimeout(() => {
          setIsAgentTyping(true)
          setTimeout(async () => {
            setIsAgentTyping(false)
            try {
              const replies = [
                "I am checking the system logs for your account. Please give me a minute.",
                "Thank you for the information. I have escalated this to our dark store operations team. They will resolve this on priority.",
                "I completely understand your concern. We are processing the resolution, and it will reflect in your account shortly.",
                "Is there anything else I can help you with in the meantime?"
              ]
              const simulatedMsg = replies[Math.floor(Math.random() * replies.length)]
              
              await supabase
                .from('support_ticket_messages')
                .insert({
                  ticket_id: activeTicket.id,
                  sender_role: 'agent',
                  message: simulatedMsg
                })
            } catch (err) {
              console.warn(err)
            }
          }, 3000)
        }, 1500)
      }
    } catch (err) {
      console.error('Error sending message:', err)
      toast.error('Failed to send message')
    }
  }

  // Close active ticket
  const handleCloseTicket = async () => {
    if (!activeTicket) return
    if (!window.confirm('Are you sure you want to mark this support ticket as resolved?')) return

    const toastId = toast.loading('Closing ticket...')
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: 'resolved' })
        .eq('id', activeTicket.id)

      if (error) throw error

      await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: activeTicket.id,
          sender_role: 'system',
          message: 'This support session was marked as resolved by the customer.'
        })

      toast.success('Ticket resolved successfully', { id: toastId })
      // Reload tickets and return to list
      fetchTickets()
      setChatState('view_tickets')
      setActiveTicket(null)
    } catch (err) {
      console.error('Error closing ticket:', err)
      toast.error('Failed to update ticket', { id: toastId })
    }
  }

  // Helper to get highlight matches in FAQs
  const getHighlightedText = (text, highlight) => {
    if (!highlight.trim()) {
      return text
    }
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-300 dark:bg-yellow-500/30 text-black dark:text-yellow-100 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  // Open Chat interface helper
  const handleStartChat = () => {
    if (!isAuthenticated) {
      toast.error('Please log in to chat with support')
      navigate('/auth?redirect=/help')
      return
    }
    setIsChatOpen(true)
    setChatState('menu')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-12 transition-colors duration-300">
      <SEO 
        title="Help Center & Customer Support | OZO Mart"
        description="Get instant help and support for your OZO Mart orders, payment queries, refunds, cancellations, and tracking. Contact our 24/7 customer care team."
        keywords="ozo mart customer support, track order ozo, ozo refund policy, contact ozo care, Patna, Aurangabad"
        schema={helpSchema}
      />
      {/* Hero Section */}
      <div className="bg-gradient-ozo pt-12 pb-24 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>
        
        <div className="container-custom relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-black mb-4 font-display"
          >
            How can we help <span className="text-yellow-300">you?</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/80 max-w-2xl mx-auto mb-8 font-medium"
          >
            Search our help center or browse through categories to find the answers you need.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto relative group"
          >
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-ozo-gray dark:text-gray-400 group-focus-within:text-ozo-red transition-colors" />
            <input 
              type="text" 
              placeholder="Search for articles (e.g. refund status)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-16 pr-8 py-5 rounded-3xl text-gray-900 dark:text-white bg-white dark:bg-[#1a1a1a] shadow-2xl focus:outline-none focus:ring-4 focus:ring-white/20 transition-all font-semibold"
            />
          </motion.div>
        </div>
      </div>

      <div className="container-custom -mt-12 relative z-20">
        {/* Quick Links / Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {categories.map((category, index) => {
            const isSelected = selectedCategory === category.id
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
                whileHover={{ y: -5 }}
                onClick={() => handleCategorySelect(category.id)}
                className={`bg-white dark:bg-[#1a1a1a] p-6 rounded-[2rem] shadow-sm hover:shadow-xl border ${
                  isSelected ? 'border-ozo-red ring-2 ring-ozo-red/20' : 'border-gray-100 dark:border-white/5'
                } transition-all cursor-pointer group`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 ${category.color} rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <category.icon size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1 flex items-center justify-between">
                      {category.title}
                      <ChevronRight className={`w-5 h-5 text-gray-300 group-hover:text-ozo-red group-hover:translate-x-1 transition-all ${
                        isSelected ? 'rotate-90 text-ozo-red' : ''
                      }`} />
                    </h3>
                    <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium">
                      {category.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div ref={faqSectionRef} className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start scroll-mt-24">
          {/* FAQ Section */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                <span className="w-1.5 h-8 bg-ozo-red rounded-full" />
                Frequently Asked <span className="text-gradient">Questions.</span>
              </h2>
              {selectedCategory !== 'all' && (
                <button 
                  onClick={() => setSelectedCategory('all')}
                  className="text-xs font-black uppercase text-ozo-red bg-red-50 dark:bg-ozo-red/10 px-4 py-2 rounded-full hover:bg-ozo-red hover:text-white transition-all self-start sm:self-auto"
                >
                  Clear filter
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {filteredFaqs.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-100 dark:border-white/5">
                  <HelpCircle className="w-12 h-12 mx-auto text-ozo-gray mb-4" />
                  <p className="font-bold text-gray-800 dark:text-gray-200">No articles matched your search query</p>
                  <p className="text-sm text-ozo-gray dark:text-gray-500 mt-1">Try searching another phrase or open live support chat.</p>
                </div>
              ) : (
                filteredFaqs.map((faq, index) => (
                  <motion.details 
                    key={index}
                    className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden group"
                  >
                    <summary className="p-6 cursor-pointer list-none flex items-center justify-between font-bold text-gray-800 dark:text-gray-200 focus:outline-none select-none">
                      <span>{getHighlightedText(faq.question, searchQuery)}</span>
                      <div className="w-8 h-8 bg-gray-50 dark:bg-white/5 rounded-lg flex items-center justify-center group-hover:bg-red-50 dark:group-hover:bg-ozo-red/10 group-hover:text-ozo-red transition-colors flex-shrink-0">
                        <ChevronRight className="w-5 h-5 transition-transform group-open:rotate-90" />
                      </div>
                    </summary>
                    <div className="px-6 pb-6 text-ozo-gray dark:text-gray-400 font-medium leading-relaxed border-t border-gray-50 dark:border-white/[0.01] pt-4">
                      {getHighlightedText(faq.answer, searchQuery)}
                    </div>
                  </motion.details>
                ))
              )}
            </div>
          </div>

          {/* Contact Support */}
          <div className="space-y-8">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
              <span className="w-1.5 h-8 bg-ozo-green rounded-full" />
              Still Need <span className="text-gradient">Help?</span>
            </h2>

            <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-8 shadow-ozo/5 border border-gray-100 dark:border-white/5 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-ozo-green/10 rounded-xl flex items-center justify-center text-ozo-green">
                  <MessageCircle size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Chat with us</h4>
                  <p className="text-xs text-ozo-gray dark:text-gray-400 font-medium">Available 24/7</p>
                </div>
                <button 
                  onClick={handleStartChat}
                  className="ml-auto px-5 py-2.5 bg-ozo-green hover:bg-ozo-green/90 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-ozo-green/30 transition-all active:scale-95"
                >
                  Start
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-ozo-red/10 rounded-xl flex items-center justify-center text-ozo-red">
                  <Phone size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Call Support</h4>
                  <p className="text-xs text-ozo-gray dark:text-gray-400 font-medium">24 Hours</p>
                </div>
                <a 
                  href="tel:+916206359094"
                  className="ml-auto px-5 py-2.5 bg-ozo-red hover:bg-ozo-red/90 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-ozo-red/30 transition-all active:scale-95 text-center"
                >
                  Call
                </a>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                  <Mail size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Email Us</h4>
                  <p className="text-xs text-ozo-gray dark:text-gray-400 font-medium">Reply within 24h</p>
                </div>
                <a 
                  href="mailto:aashutoshk625@gmail.com"
                  className="ml-auto px-5 py-2.5 bg-blue-500 hover:bg-blue-500/90 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 text-center"
                >
                  Email
                </a>
              </div>

              <div className="pt-6 border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3 text-sm font-semibold text-ozo-gray dark:text-gray-400 bg-gray-50 dark:bg-white/5 p-4 rounded-xl">
                  <Clock size={18} className="text-ozo-red flex-shrink-0" />
                  <span>Average response time: 2 mins</span>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center justify-center gap-4">
              {[
                { name: 'Twitter', href: 'https://twitter.com/ozomart_store' },
                { name: 'Instagram', href: 'https://www.instagram.com/ozomart.store' },
                { name: 'Facebook', href: 'https://www.facebook.com/ozomart.store' }
              ].map(social => (
                <a 
                  key={social.name} 
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-black uppercase tracking-widest text-ozo-gray hover:text-ozo-red transition-colors"
                >
                  {social.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PERSISTENT FLOATING CHAT BUTTON */}
      {isAuthenticated && (
        <motion.button
          onClick={handleStartChat}
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-ozo text-white rounded-full flex items-center justify-center shadow-2xl z-40 hover:shadow-ozo-red/30 transition-shadow border-4 border-white dark:border-[#0a0a0a]"
        >
          <MessageCircle size={28} className="animate-pulse" />
        </motion.button>
      )}

      {/* SUPPORT LIVE CHAT DRAWER */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 cursor-pointer backdrop-blur-xs"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white dark:bg-[#0c0c12] border-l border-gray-200 dark:border-white/5 shadow-2xl z-50 flex flex-col font-sans overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gradient-ozo text-white relative">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center relative">
                    <Headphones size={20} />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                      OZO Support Desk
                    </h3>
                    <p className="text-[10px] opacity-80 font-medium">Online • Standard reply: 2m</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-black/20">
                {/* 1. Main Menu State */}
                {chatState === 'menu' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-ozo-red/10 text-ozo-red flex items-center justify-center flex-shrink-0">
                        <Bot size={18} />
                      </div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        Namaste {user?.user_metadata?.full_name || 'Customer'}! Welcome to OZO Mart support. How can I help you today?
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => { fetchOrders(); setChatState('track_orders'); }}
                        className="w-full p-4 text-left bg-white dark:bg-[#1a1a1a] hover:bg-red-50/20 dark:hover:bg-ozo-red/5 border border-gray-100 dark:border-white/5 rounded-2xl flex items-center justify-between font-bold text-gray-800 dark:text-gray-200 group transition-all"
                      >
                        <span className="flex items-center gap-3">
                          <Package size={18} className="text-blue-500" />
                          Track Active Orders
                        </span>
                        <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      <button
                        onClick={() => { fetchOrders(); setChatState('report_issue_select_order'); }}
                        className="w-full p-4 text-left bg-white dark:bg-[#1a1a1a] hover:bg-red-50/20 dark:hover:bg-ozo-red/5 border border-gray-100 dark:border-white/5 rounded-2xl flex items-center justify-between font-bold text-gray-800 dark:text-gray-200 group transition-all"
                      >
                        <span className="flex items-center gap-3">
                          <AlertTriangle size={18} className="text-amber-500" />
                          Report Order Issue
                        </span>
                        <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      <button
                        onClick={() => setChatState('general_query_input')}
                        className="w-full p-4 text-left bg-white dark:bg-[#1a1a1a] hover:bg-red-50/20 dark:hover:bg-ozo-red/5 border border-gray-100 dark:border-white/5 rounded-2xl flex items-center justify-between font-bold text-gray-800 dark:text-gray-200 group transition-all"
                      >
                        <span className="flex items-center gap-3">
                          <MessageCircle size={18} className="text-green-500" />
                          Chat with Support Agent
                        </span>
                        <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      <button
                        onClick={() => { fetchTickets(); setChatState('view_tickets'); }}
                        className="w-full p-4 text-left bg-white dark:bg-[#1a1a1a] hover:bg-red-50/20 dark:hover:bg-ozo-red/5 border border-gray-100 dark:border-white/5 rounded-2xl flex items-center justify-between font-bold text-gray-800 dark:text-gray-200 group transition-all"
                      >
                        <span className="flex items-center gap-3">
                          <FileText size={18} className="text-purple-500" />
                          My Support Tickets
                        </span>
                        <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* 2. Track Orders State */}
                {chatState === 'track_orders' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <button 
                      onClick={() => setChatState('menu')} 
                      className="flex items-center gap-1.5 text-xs font-bold text-ozo-red hover:underline"
                    >
                      <ArrowLeft size={14} /> Back to Menu
                    </button>

                    <h4 className="font-extrabold text-sm text-gray-800 dark:text-gray-200">Active / Recent Orders</h4>

                    {loadingOrders ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-ozo-red" />
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="p-6 text-center bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 text-sm text-gray-500">
                        You have no orders placed recently.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {orders.map(order => (
                          <div 
                            key={order.id} 
                            className="bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl border border-gray-100 dark:border-white/5 space-y-3"
                          >
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-900 dark:text-white">Order #{order.order_number}</span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                ['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(order.status)
                                  ? 'bg-green-100 dark:bg-green-950/20 text-green-600'
                                  : ['cancelled', 'CANCELLED_BY_USER'].includes(order.status)
                                  ? 'bg-red-100 dark:bg-red-950/20 text-red-600'
                                  : 'bg-blue-100 dark:bg-blue-950/20 text-blue-600'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 font-medium">
                              Placed on: {new Date(order.created_at).toLocaleDateString()} • Total: ₹{order.total}
                            </div>
                            {order.estimated_delivery && !['delivered', 'DELIVERED_VERIFYING', 'COMPLETED', 'cancelled', 'CANCELLED_BY_USER'].includes(order.status) && (
                              <div className="flex items-center gap-1.5 text-xs text-green-600 font-bold bg-green-50 dark:bg-green-950/10 p-2 rounded-lg">
                                <Clock size={12} />
                                Estimated: {new Date(order.estimated_delivery).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                            <button
                              onClick={() => { setSelectedOrder(order); setChatState('report_issue_reason'); }}
                              className="w-full py-2 bg-red-50 dark:bg-ozo-red/10 text-ozo-red text-xs font-black uppercase rounded-xl hover:bg-ozo-red hover:text-white transition-all"
                            >
                              Need help with this order?
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 3. Report Issue - Select Order */}
                {chatState === 'report_issue_select_order' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <button 
                      onClick={() => setChatState('menu')} 
                      className="flex items-center gap-1.5 text-xs font-bold text-ozo-red hover:underline"
                    >
                      <ArrowLeft size={14} /> Back to Menu
                    </button>

                    <h4 className="font-extrabold text-sm text-gray-800 dark:text-gray-200">Select Order to Report Issue</h4>

                    {loadingOrders ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-ozo-red" />
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="p-6 text-center bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 text-sm text-gray-500">
                        You have no orders placed recently.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {orders.map(order => (
                          <button
                            key={order.id}
                            onClick={() => { setSelectedOrder(order); setChatState('report_issue_reason'); }}
                            className="w-full p-4 text-left bg-white dark:bg-[#1a1a1a] hover:border-ozo-red border border-gray-100 dark:border-white/5 rounded-2xl flex items-center justify-between font-bold text-gray-800 dark:text-gray-200 transition-all group"
                          >
                            <div>
                              <div className="text-xs font-black text-gray-900 dark:text-white">Order #{order.order_number}</div>
                              <div className="text-[11px] text-gray-400 mt-1">Total: ₹{order.total} • Status: {order.status}</div>
                            </div>
                            <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 4. Report Issue - Select Reason */}
                {chatState === 'report_issue_reason' && selectedOrder && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <button 
                      onClick={() => setChatState('report_issue_select_order')} 
                      className="flex items-center gap-1.5 text-xs font-bold text-ozo-red hover:underline"
                    >
                      <ArrowLeft size={14} /> Back to Select Order
                    </button>

                    <h4 className="font-extrabold text-sm text-gray-800 dark:text-gray-200">
                      Report issue: Order #{selectedOrder.order_number}
                    </h4>

                    <div className="space-y-2">
                      {[
                        'Damaged items delivered',
                        'Missing items in my order',
                        'Wrong items delivered',
                        'Delay in delivery',
                        'Other order issue'
                      ].map(reason => (
                        <button
                          key={reason}
                          onClick={() => setIssueReason(reason)}
                          className={`w-full p-3.5 text-left rounded-xl text-xs font-bold transition-all border ${
                            issueReason === reason
                              ? 'bg-red-50 dark:bg-ozo-red/10 border-ozo-red text-ozo-red'
                              : 'bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-white/5 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>

                    {issueReason && (
                      <div className="space-y-3 pt-2">
                        <label className="text-xs font-bold text-gray-500">Provide details of the issue</label>
                        <textarea
                          value={issueDetail}
                          onChange={(e) => setIssueDetail(e.target.value)}
                          placeholder="Please write which items are missing/damaged or describe the query..."
                          className="w-full p-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-ozo-red text-gray-900 dark:text-white min-h-[80px]"
                        />
                        <button
                          onClick={() => handleCreateTicket(
                            `${issueReason} - Order #${selectedOrder.order_number}`,
                            `Issue Category: ${issueReason}\n\nDetails:\n${issueDetail || 'No detailed text provided.'}`,
                            selectedOrder.id
                          )}
                          disabled={creatingTicket}
                          className="w-full py-3 bg-gradient-ozo text-white text-xs font-black uppercase rounded-xl shadow-lg disabled:opacity-50"
                        >
                          {creatingTicket ? 'Submitting...' : 'Register Ticket & Start Chat'}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 5. General Query Input */}
                {chatState === 'general_query_input' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <button 
                      onClick={() => setChatState('menu')} 
                      className="flex items-center gap-1.5 text-xs font-bold text-ozo-red hover:underline"
                    >
                      <ArrowLeft size={14} /> Back to Menu
                    </button>

                    <h4 className="font-extrabold text-sm text-gray-800 dark:text-gray-200">Chat with Support Agent</h4>
                    <p className="text-xs text-gray-400">Describe your query below, and our support ticket will open instantly to connect you.</p>

                    <div className="space-y-3">
                      <textarea
                        value={issueDetail}
                        onChange={(e) => setIssueDetail(e.target.value)}
                        placeholder="Type your message or issue details..."
                        className="w-full p-4 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-ozo-red text-gray-900 dark:text-white min-h-[120px] font-medium"
                      />
                      <button
                        onClick={() => handleCreateTicket('General Query', issueDetail.trim() || 'Need assistance from a support agent.', null)}
                        disabled={creatingTicket || !issueDetail.trim()}
                        className="w-full py-3 bg-gradient-ozo text-white text-xs font-black uppercase rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {creatingTicket ? 'Starting Chat...' : 'Start Live Chat'}
                        <Send size={14} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* 6. View Support Tickets */}
                {chatState === 'view_tickets' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <button 
                      onClick={() => setChatState('menu')} 
                      className="flex items-center gap-1.5 text-xs font-bold text-ozo-red hover:underline"
                    >
                      <ArrowLeft size={14} /> Back to Menu
                    </button>

                    <h4 className="font-extrabold text-sm text-gray-800 dark:text-gray-200">My Support Tickets</h4>

                    {loadingTickets ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-ozo-red" />
                      </div>
                    ) : tickets.length === 0 ? (
                      <div className="p-6 text-center bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 text-sm text-gray-500">
                        You have no active support tickets.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {tickets.map(ticket => (
                          <button
                            key={ticket.id}
                            onClick={() => loadTicketMessages(ticket)}
                            className="w-full p-4 text-left bg-white dark:bg-[#1a1a1a] hover:border-ozo-red border border-gray-100 dark:border-white/5 rounded-2xl flex items-center justify-between font-bold text-gray-800 dark:text-gray-200 transition-all group"
                          >
                            <div className="space-y-1">
                              <div className="text-xs font-black text-gray-900 dark:text-white line-clamp-1">{ticket.subject}</div>
                              <div className="text-[10px] text-gray-400 font-medium">Created: {new Date(ticket.created_at).toLocaleDateString()}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                ticket.status === 'open'
                                  ? 'bg-red-100 dark:bg-red-950/20 text-red-600'
                                  : ticket.status === 'in_progress'
                                  ? 'bg-amber-100 dark:bg-amber-950/20 text-amber-600'
                                  : 'bg-green-100 dark:bg-green-950/20 text-green-600'
                              }`}>
                                {ticket.status}
                              </span>
                              <ChevronRight size={14} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 7. Live Chat Thread */}
                {chatState === 'ticket_chat' && activeTicket && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col h-full space-y-3"
                  >
                    {/* Header bar in thread */}
                    <div className="flex items-center justify-between bg-gray-100 dark:bg-white/5 p-3 rounded-xl">
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase font-black text-gray-400 tracking-wider">Active Chat</span>
                        <h5 className="text-xs font-black text-gray-850 dark:text-gray-200 truncate pr-2">{activeTicket.subject}</h5>
                      </div>
                      <div className="flex items-center gap-2">
                        {activeTicket.status !== 'resolved' && activeTicket.status !== 'closed' && (
                          <button
                            onClick={handleCloseTicket}
                            className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                          >
                            Resolve
                          </button>
                        )}
                        <button 
                          onClick={() => { fetchTickets(); setChatState('view_tickets'); setActiveTicket(null); }}
                          className="p-1 text-gray-500 hover:text-ozo-red rounded"
                          title="Back to Tickets"
                        >
                          <ArrowLeft size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Messages Container */}
                    <div className="flex-1 overflow-y-auto space-y-3 min-h-[300px] max-h-[420px] p-2 bg-gray-150/50 dark:bg-[#08080f] rounded-2xl border border-gray-100 dark:border-white/5 scrollbar-thin">
                      {loadingMessages ? (
                        <div className="flex items-center justify-center py-20">
                          <Loader2 className="w-6 h-6 animate-spin text-ozo-red" />
                        </div>
                      ) : chatMessages.length === 0 ? (
                        <div className="text-center py-10 text-xs text-gray-400 font-medium">No messages in this chat.</div>
                      ) : (
                        chatMessages.map((msg, index) => {
                          const isUser = msg.sender_role === 'user'
                          const isBot = msg.sender_role === 'bot'
                          const isSystem = msg.sender_role === 'system'

                          if (isSystem) {
                            return (
                              <div key={msg.id || index} className="text-center my-2">
                                <span className="px-3 py-1 bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 rounded-lg text-[9px] font-bold uppercase tracking-wider inline-block">
                                  {msg.message}
                                </span>
                              </div>
                            )
                          }

                          return (
                            <div 
                              key={msg.id || index} 
                              className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}
                            >
                              {!isUser && (
                                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center bg-gray-200 dark:bg-white/10 text-gray-650 dark:text-gray-300">
                                  {isBot ? <Bot size={12} /> : <Headphones size={12} className="text-ozo-red" />}
                                </div>
                              )}
                              <div className={`max-w-[75%] p-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
                                isUser 
                                  ? 'bg-gradient-ozo text-white rounded-br-none' 
                                  : isBot
                                  ? 'bg-amber-100/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 rounded-bl-none border border-amber-200/20'
                                  : 'bg-white dark:bg-[#1a1a1a] text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-white/5 rounded-bl-none'
                              }`}>
                                {!isUser && !isBot && (
                                  <div className="text-[9px] font-black uppercase text-ozo-red mb-1">{agentName} (OZO Care)</div>
                                )}
                                {msg.message}
                                <div className={`text-[8px] text-right mt-1.5 font-normal ${isUser ? 'text-white/60' : 'text-gray-400'}`}>
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                      
                      {/* Typing indicator */}
                      {isAgentTyping && (
                        <div className="flex justify-start gap-2">
                          <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center bg-gray-200 dark:bg-white/10 text-gray-650 dark:text-gray-300">
                            <Headphones size={12} className="text-ozo-red animate-pulse" />
                          </div>
                          <div className="bg-white dark:bg-[#1a1a1a] p-3 rounded-2xl rounded-bl-none text-xs text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5 flex items-center gap-1.5 shadow-sm">
                            <span className="font-bold text-[9px] uppercase tracking-wider text-ozo-red animate-pulse">{agentName} is typing</span>
                            <span className="flex gap-0.5">
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                            </span>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chat Send Form */}
                    {activeTicket.status !== 'resolved' && activeTicket.status !== 'closed' ? (
                      <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                          type="text"
                          value={newMessageText}
                          onChange={(e) => setNewMessageText(e.target.value)}
                          placeholder="Type your reply..."
                          className="flex-1 px-4 py-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-ozo-red text-gray-900 dark:text-white font-medium"
                        />
                        <button
                          type="submit"
                          disabled={!newMessageText.trim()}
                          className="p-3 bg-gradient-ozo text-white rounded-xl shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <Send size={16} />
                        </button>
                      </form>
                    ) : (
                      <div className="p-3 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-xl text-center text-xs font-bold uppercase tracking-wider border border-dashed border-gray-200 dark:border-white/10">
                        This session is resolved & closed.
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Help
