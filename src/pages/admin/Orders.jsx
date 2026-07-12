import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ChevronRight,
  ChevronLeft,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  Eye,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  Calendar,
  DollarSign,
  ShoppingBag,
  User,
  Phone,
  Mail,
  FileText,
  ChevronDown,
  ArrowRight,
  TrendingUp,
  Package,
  Printer,
  Star,
  ExternalLink,
  CreditCard,
  Camera,
  Trash2,
  Send,
  Bell
} from 'lucide-react'
import { useOrderStore } from '../../stores/orderStore'
import { supabase as supabaseClient, supabaseAdmin as supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import RiderAdmin from './RiderAdmin'
import { useMartStore } from '../../stores/martStore'
import MartAdmin from './MartAdmin'

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

const CoolingTimer = ({ order, serverTimeOffset }) => {
  const [timeLeft, setTimeLeft] = useState('')
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    if (order.status !== 'PLACED_COOLING' || !order.created_at) {
      setIsExpired(true)
      setTimeLeft('')
      return
    }

    const createdAt = new Date(order.created_at)
    const expiryTime = new Date(createdAt.getTime() + 5 * 60 * 1000)

    const update = () => {
      const estimatedServerTime = new Date(new Date().getTime() + serverTimeOffset)
      const diffMs = expiryTime.getTime() - estimatedServerTime.getTime()

      if (diffMs <= 0) {
        setIsExpired(true)
        setTimeLeft('Expired')
      } else {
        setIsExpired(false)
        const mins = Math.floor(diffMs / 60000)
        const secs = Math.floor((diffMs % 60000) / 1000)
        setTimeLeft(`${mins}m ${secs}s`)
      }
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [order, serverTimeOffset])

  if (isExpired) {
    return (
      <span className="text-[10px] text-gray-400 font-medium block mt-1">
        Cooling: Expired
      </span>
    )
  }

  return (
    <span className="text-[10px] text-rose-500 font-extrabold animate-pulse block mt-1">
      Cooling: {timeLeft} left
    </span>
  )
}

const STATUS_COLORS = {
  pending: { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-900/30', label: 'Pending Acceptance' },
  PLACED_COOLING: { bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-900/30', label: 'Cooling Period' },
  CONFIRMED_SYSTEM: { bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-900/30', label: 'System Confirmed' },
  confirmed: { bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-900/30', label: 'Confirmed' },
  preparing: { bg: 'bg-indigo-50 dark:bg-indigo-950/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-900/30', label: 'Preparing' },
  packed: { bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-900/30', label: 'Packed' },
  assigned: { bg: 'bg-cyan-50 dark:bg-cyan-950/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-100 dark:border-cyan-900/30', label: 'Rider Assigned' },
  preparing_order: { bg: 'bg-teal-50 dark:bg-teal-950/20', text: 'text-teal-650 dark:text-teal-400', border: 'border-teal-100 dark:border-teal-900/30', label: 'Rider At Mart' },
  picked_up: { bg: 'bg-pink-50 dark:bg-pink-950/20', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-100 dark:border-pink-900/30', label: 'Picked Up' },
  dispatched: { bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-900/30', label: 'Out for Delivery' },
  delivered: { bg: 'bg-green-50 dark:bg-green-950/20', text: 'text-green-600 dark:text-green-400', border: 'border-green-100 dark:border-green-900/30', label: 'Delivered' },
  DELIVERED_VERIFYING: { bg: 'bg-green-50 dark:bg-green-950/20', text: 'text-green-600 dark:text-green-400', border: 'border-green-100 dark:border-green-900/30', label: 'Delivery Verifying' },
  COMPLETED: { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-900/30', label: 'Completed' },
  cancelled: { bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-100 dark:border-red-900/30', label: 'Cancelled' },
  CANCELLED_BY_USER: { bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-100 dark:border-red-900/30', label: 'Cancelled By User' },
  RETURN_REQUESTED: { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-900/30', label: 'Return Requested' }
}

const getSuggestions = (rating) => {
  if (rating >= 4) {
    return [
      "Thank you for the support! Glad you loved it. 😊",
      "Happy to serve you! Thanks for choosing OZO. 🙌",
      "Awesome! We appreciate your support. 🌟"
    ]
  } else if (rating === 3) {
    return [
      "Thank you for your feedback. We will work to improve this! 👍",
      "Thanks for sharing. We're aiming for a 5-star experience next time!",
      "Apologies for not meeting expectations. We will improve."
    ]
  } else {
    return [
      "We sincerely apologize for this. We are looking into it immediately. 😔",
      "Extremely sorry for the experience. Our team will resolve this.",
      "Apologies. Let us know how we can make this right for you!"
    ]
  }
}

const Orders = () => {
  const { 
    orders, 
    isLoading, 
    adminFetchOrders, 
    adminUpdateOrderStatus, 
    adminUpdatePaymentStatus,
    adminAssignMart,
    serverTimeOffset
  } = useOrderStore()
  const { marts, fetchMarts } = useMartStore()

  useEffect(() => {
    fetchMarts()
  }, [fetchMarts])

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const [selectedOrder, setSelectedOrder] = useState(null)
  const selectedOrderIdRef = useRef(null)
  useEffect(() => {
    selectedOrderIdRef.current = selectedOrder?.id
  }, [selectedOrder?.id])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [updatingStatusId, setUpdatingStatusId] = useState(null)
  const [updatingPaymentId, setUpdatingPaymentId] = useState(null)
  const [paymentDetails, setPaymentDetails] = useState(null)
  const [isLoadingPaymentDetails, setIsLoadingPaymentDetails] = useState(false)

  const [isEditingItems, setIsEditingItems] = useState(false)
  const [editedItems, setEditedItems] = useState([])
  const [isSavingItems, setIsSavingItems] = useState(false)

  const [updatingProductId, setUpdatingProductId] = useState(null)

  // Personal notification form states
  const [notificationTitle, setNotificationTitle] = useState('')
  const [notificationMessage, setNotificationMessage] = useState('')
  const [isSendingNotification, setIsSendingNotification] = useState(false)
  const [showNotificationForm, setShowNotificationForm] = useState(false)

  const handleSendPersonalNotification = async (userId) => {
    if (!notificationTitle.trim()) {
      toast.error('Please enter a notification title')
      return
    }
    if (!notificationMessage.trim()) {
      toast.error('Please enter a notification message')
      return
    }
    if (!userId) {
      toast.error('User ID is missing. Cannot send notification.')
      return
    }

    setIsSendingNotification(true)
    const toastId = toast.loading('Sending push notification...')
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: userId,
            title: notificationTitle.trim(),
            message: notificationMessage.trim(),
            type: 'admin_personal',
            data: selectedOrder ? {
              order_id: selectedOrder.id,
              order_number: selectedOrder.order_number,
              sent_by: 'admin'
            } : { sent_by: 'admin' }
          }
        ])

      if (error) throw error

      toast.success('Push notification sent successfully!', { id: toastId })
      setNotificationTitle('')
      setNotificationMessage('')
      setShowNotificationForm(false)
    } catch (err) {
      console.error('[AdminOrders] Error sending push notification:', err)
      toast.error(err.message || 'Failed to send notification', { id: toastId })
    } finally {
      setIsSendingNotification(false)
    }
  }

  const handleToggleProductAvailability = async (productId, currentStatus) => {
    setUpdatingProductId(productId)
    const toastId = toast.loading(currentStatus ? 'Marking as Out of Stock...' : 'Marking as Available...')
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_available: !currentStatus })
        .eq('id', productId)

      if (error) throw error

      toast.success(currentStatus ? 'Marked as Out of Stock' : 'Marked as Available', { id: toastId })

      // Update in selectedOrder.order_items
      if (selectedOrder) {
        const updatedItems = (selectedOrder.order_items || []).map(item => {
          if (item.product_id === productId) {
            return { ...item, is_available: !currentStatus }
          }
          return item
        })
        setSelectedOrder(prev => prev ? { ...prev, order_items: updatedItems } : null)
      }

      // Also update in useOrderStore's orders array
      const storeOrders = useOrderStore.getState().orders
      const updatedStoreOrders = storeOrders.map(order => {
        if (order.order_items) {
          const newItems = order.order_items.map(item => {
            if (item.product_id === productId) {
              return { ...item, is_available: !currentStatus }
            }
            return item
          })
          return { ...order, order_items: newItems }
        }
        return order
      })
      useOrderStore.setState({ orders: updatedStoreOrders })

      // Trigger IndexNow (same as Products.jsx)
      const targetItem = selectedOrder?.order_items?.find(item => item.product_id === productId)
      if (targetItem && targetItem.product_slug) {
        try {
          fetch('/api/index-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productSlug: targetItem.product_slug })
          }).catch(err => console.warn('Async IndexNow ping failed:', err))
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error updating availability:', err)
      toast.error('Failed to update product status', { id: toastId })
    } finally {
      setUpdatingProductId(null)
    }
  }

  const [adminCancelTimeLeftStr, setAdminCancelTimeLeftStr] = useState('')
  const [adminCancelWindowExpired, setAdminCancelWindowExpired] = useState(true)

  const [isApprovingSelfDelivery, setIsApprovingSelfDelivery] = useState(false)
  const handleApproveSelfDelivery = async (orderId) => {
    setIsApprovingSelfDelivery(true)
    const toastId = toast.loading('Approving self-delivery request...')
    try {
      const order = orders.find(o => o.id === orderId)
      if (!order) return

      let newInstructions = order.delivery_instructions || ''
      if (newInstructions.includes('[SELF_DELIVERY_REQUESTED]')) {
        newInstructions = newInstructions.replace('[SELF_DELIVERY_REQUESTED]', '[SELF_DELIVERY_APPROVED]')
      } else if (!newInstructions.includes('[SELF_DELIVERY_APPROVED]')) {
        newInstructions = `[SELF_DELIVERY_APPROVED] ${newInstructions}`.trim()
      }

      const { error } = await supabase
        .from('orders')
        .update({
          delivery_instructions: newInstructions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      if (error) throw error

      toast.success('Self-delivery approved! Details shared with Mart.', { id: toastId })
      
      setSelectedOrder(prev => {
        if (prev && prev.id === orderId) {
          return { ...prev, delivery_instructions: newInstructions }
        }
        return prev
      })

      await adminFetchOrders()
    } catch (err) {
      console.error('Approve self-delivery error:', err)
      toast.error('Failed to approve request: ' + err.message, { id: toastId })
    } finally {
      setIsApprovingSelfDelivery(false)
    }
  }

  useEffect(() => {
    if (!selectedOrder || selectedOrder.status !== 'PLACED_COOLING' || !selectedOrder.created_at) {
      setAdminCancelWindowExpired(true)
      setAdminCancelTimeLeftStr('')
      return
    }

    const createdAt = new Date(selectedOrder.created_at)
    const expiryTime = new Date(createdAt.getTime() + 5 * 60 * 1000)

    const updateTimer = () => {
      const estimatedServerTime = new Date(new Date().getTime() + serverTimeOffset)
      const diffMs = expiryTime.getTime() - estimatedServerTime.getTime()

      if (diffMs <= 0) {
        setAdminCancelWindowExpired(true)
        setAdminCancelTimeLeftStr('Expired')
      } else {
        setAdminCancelWindowExpired(false)
        const mins = Math.floor(diffMs / 60000)
        const secs = Math.floor((diffMs % 60000) / 1000)
        setAdminCancelTimeLeftStr(`${mins}m ${secs}s left`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [selectedOrder, serverTimeOffset])

  useEffect(() => {
    if (selectedOrder && selectedOrder.transaction_id && selectedOrder.transaction_id.startsWith('pay_')) {
      const fetchPaymentDetails = async () => {
        setIsLoadingPaymentDetails(true)
        setPaymentDetails(null)
        try {
          const { data, error } = await supabaseClient.functions.invoke('verify-razorpay-payment', {
            body: {
              action: 'get_payment_details',
              paymentId: selectedOrder.transaction_id
            }
          })
          if (data && data.success) {
            setPaymentDetails(data.payment)
          } else {
            console.error('Error fetching payment details:', error || data?.error)
          }
        } catch (err) {
          console.error('Error invoking function:', err)
        } finally {
          setIsLoadingPaymentDetails(false)
        }
      }
      fetchPaymentDetails()
    } else {
      setPaymentDetails(null)
    }
  }, [selectedOrder?.id, selectedOrder?.transaction_id])

  const handlePaymentStatusChange = async (orderId, newPaymentStatus) => {
    setUpdatingPaymentId(orderId)
    const res = await adminUpdatePaymentStatus(orderId, newPaymentStatus)
    setUpdatingPaymentId(null)
    
    // Refresh modal info if currently selected
    if (res.success && selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(prev => ({ ...prev, payment_status: newPaymentStatus }))
    }
  }

  const handleAssignRider = async (riderId) => {
    if (!selectedOrder) return
    try {
      const oldRiderId = selectedOrder.rider_id

      // 1. Update the order
      const { data: updatedOrder, error: orderError } = await supabase
        .from('orders')
        .update({
          rider_id: riderId,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id)
        .select()
        .single()

      if (orderError) throw orderError

      // 2. Set new rider status to busy
      const { error: newRiderError } = await supabase
        .from('captains')
        .update({ status: 'busy' })
        .eq('id', riderId)

      if (newRiderError) throw newRiderError

      // 3. If there was a previous rider, set them back to online
      if (oldRiderId && oldRiderId !== riderId) {
        await supabase
          .from('captains')
          .update({ status: 'online' })
          .eq('id', oldRiderId)
      }

      // 4. Notifications are centrally handled by database triggers to prevent duplicates and ensure consistency.

      // 5. Toast success
      toast.success('Captain assigned successfully!')

      // 6. Refresh admin orders in store
      await adminFetchOrders()

      // 7. Update selectedOrder in local state by finding the latest version from updated list
      const latestOrder = useOrderStore.getState().orders.find(o => o.id === selectedOrder.id)
      if (latestOrder) {
        setSelectedOrder(latestOrder)
      }
    } catch (err) {
      console.error('Failed to assign captain:', err)
      toast.error('Failed to assign captain')
    }
  }

  const handleAssignMart = async (martId) => {
    if (!selectedOrder) return
    try {
      const res = await adminAssignMart(selectedOrder.id, martId)
      if (res.success) {
        const latestOrder = useOrderStore.getState().orders.find(o => o.id === selectedOrder.id)
        if (latestOrder) {
          setSelectedOrder(latestOrder)
        }
      }
    } catch (err) {
      console.error('Failed to assign mart:', err)
      toast.error('Failed to assign mart')
    }
  }
  const [selectedOrderReviews, setSelectedOrderReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [editingReplyId, setEditingReplyId] = useState(null)
  const [replyInput, setReplyInput] = useState('')
  
  // Cancellation form states inside details modal
  const [showCancelPrompt, setShowCancelPrompt] = useState(false)
  const [cancelReason, setCancelReason] = useState('Customer requested cancellation')
  const [cancelNote, setCancelNote] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)

  // Return requests states
  const [selectedOrderReturnRequest, setSelectedOrderReturnRequest] = useState(null)
  const [isLoadingReturnRequest, setIsLoadingReturnRequest] = useState(false)
  const [returnAdminComment, setReturnAdminComment] = useState('')
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false)

  const fetchReturnRequestForOrder = async (orderId) => {
    if (!orderId) return
    setIsLoadingReturnRequest(true)
    try {
      const { data, error } = await supabase
        .from('return_requests')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle()
      if (error) throw error
      setSelectedOrderReturnRequest(data || null)
    } catch (err) {
      console.error('Error fetching return request:', err)
    } finally {
      setIsLoadingReturnRequest(false)
    }
  }

  const handleApproveReturn = async (retReq) => {
    if (!window.confirm('Are you sure you want to APPROVE this return request? The order amount will be credited back to the customer\'s wallet immediately.')) return
    setIsSubmittingReturn(true)
    const toastId = toast.loading('Processing approval & wallet refund...')
    try {
      const { error } = await supabase
        .from('return_requests')
        .update({ 
          status: 'approved',
          admin_comment: returnAdminComment || 'Approved'
        })
        .eq('id', retReq.id)
      if (error) throw error

      toast.success('Return request approved & refunded successfully!', { id: toastId })
      setReturnAdminComment('')
      // Refresh
      fetchReturnRequestForOrder(selectedOrder.id)
      adminFetchOrders()
    } catch (err) {
      console.error(err)
      toast.error('Failed to approve return: ' + err.message, { id: toastId })
    } finally {
      setIsSubmittingReturn(false)
    }
  }

  const handleRejectReturn = async (retReq) => {
    if (!returnAdminComment.trim()) {
      toast.error('Please enter a rejection reason in feedback comments')
      return
    }
    if (!window.confirm('Are you sure you want to REJECT this return request?')) return
    setIsSubmittingReturn(true)
    const toastId = toast.loading('Processing rejection...')
    try {
      const { error } = await supabase
        .from('return_requests')
        .update({ 
          status: 'rejected',
          admin_comment: returnAdminComment
        })
        .eq('id', retReq.id)
      if (error) throw error

      toast.success('Return request rejected.', { id: toastId })
      setReturnAdminComment('')
      // Refresh
      fetchReturnRequestForOrder(selectedOrder.id)
      adminFetchOrders()
    } catch (err) {
      console.error(err)
      toast.error('Failed to reject return: ' + err.message, { id: toastId })
    } finally {
      setIsSubmittingReturn(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    const safeFetchOrders = async () => {
      if (isMounted) {
        await adminFetchOrders()
      }
    }

    safeFetchOrders()

    // Subscribe to order updates in realtime
    const channel = supabase
      .channel('orders-admin-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new
          const oldOrder = payload.old
          
          if (newOrder) {
            const isSelected = selectedOrderIdRef.current === newOrder.id
            const hasStatusChanged = !oldOrder || oldOrder.status !== newOrder.status
            const isActive = !['delivered', 'cancelled'].includes(newOrder.status)
            
            if (isSelected || hasStatusChanged || isActive) {
              safeFetchOrders()
            }
          } else {
            // Refetch on deletes or inserts
            safeFetchOrders()
          }
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [adminFetchOrders])

  // Sync selectedOrder with updated orders from store
  useEffect(() => {
    if (selectedOrder) {
      const latestOrder = orders.find(o => o.id === selectedOrder.id)
      if (latestOrder) {
        if (
          latestOrder.status !== selectedOrder.status ||
          latestOrder.updated_at !== selectedOrder.updated_at ||
          latestOrder.rider_id !== selectedOrder.rider_id ||
          latestOrder.mart_id !== selectedOrder.mart_id ||
          JSON.stringify(latestOrder.rider) !== JSON.stringify(selectedOrder.rider) ||
          JSON.stringify(latestOrder.mart) !== JSON.stringify(selectedOrder.mart)
        ) {
          setSelectedOrder(latestOrder)
        }
      }
    }
  }, [orders, selectedOrder?.id])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  const fetchOrderReviews = async (orderId) => {
    if (!orderId) return
    setReviewsLoading(true)
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('order_id', orderId)
      if (error) throw error
      setSelectedOrderReviews(data || [])
    } catch (err) {
      console.error('Error fetching order reviews:', err)
      setSelectedOrderReviews([])
    } finally {
      setReviewsLoading(false)
    }
  }

  const handleSaveReply = async (e, review) => {
    e.preventDefault()
    if (!replyInput.trim()) return
    
    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          reply_text: replyInput.trim(),
          replied_at: new Date().toISOString()
        })
        .eq('id', review.id)
      
      if (error) throw error

      // Create notification for the user who wrote the review
      if (review.user_id) {
        const { error: notifError } = await supabase.from('notifications').insert([
          {
            user_id: review.user_id,
            title: 'Reply from OZO Official',
            message: `OZO Official replied to your feedback: "${replyInput.trim().slice(0, 50)}${replyInput.trim().length > 50 ? '...' : ''}"`,
            type: 'review_reply',
            data: { 
              review_id: review.id,
              order_id: review.order_id,
              product_id: review.product_id
            },
          },
        ])
        if (notifError) {
          console.error('[AdminOrders] Failed to insert notification in database:', notifError)
        }
      }
      
      if (selectedOrder?.id) {
        fetchOrderReviews(selectedOrder.id)
      }
      setEditingReplyId(null)
      setReplyInput('')
      toast.success('Reply saved successfully!')
    } catch (err) {
      console.error('Error saving reply:', err)
      toast.error('Failed to save reply')
    }
  }

  useEffect(() => {
    setIsEditingItems(false)
    setEditedItems([])
    if (selectedOrder?.id) {
      fetchOrderReviews(selectedOrder.id)
      fetchReturnRequestForOrder(selectedOrder.id)
    } else {
      setSelectedOrderReviews([])
      setSelectedOrderReturnRequest(null)
    }
  }, [selectedOrder?.id])

  // Parse cancellation details from instructions string helper
  const parseCancellation = (instructions) => {
    if (!instructions) return null
    const reasonMatch = instructions.match(/\[Cancel Reason:\s*([^\]]+)\]/)
    const noteMatch = instructions.match(/\[Cancel Note:\s*([^\]]*)\]/)
    if (reasonMatch) {
      return {
        reason: reasonMatch[1],
        note: noteMatch ? noteMatch[1] : ''
      }
    }
    return null
  }

  const startEditingItems = () => {
    setEditedItems(selectedOrder.order_items.map(item => ({ ...item })))
    setIsEditingItems(true)
  }

  const handleUpdateItemQty = (id, qty) => {
    const parsedQty = Math.max(1, parseInt(qty) || 1)
    setEditedItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantity: parsedQty, total_price: parsedQty * item.unit_price } : item
    ))
  }

  const handleUpdateItemPrice = (id, price) => {
    const parsedPrice = Math.max(0, parseFloat(price) || 0)
    setEditedItems(prev => prev.map(item => 
      item.id === id ? { ...item, unit_price: parsedPrice, total_price: item.quantity * parsedPrice } : item
    ))
  }

  const handleToggleCancelItem = (id) => {
    setEditedItems(prev => {
      const target = prev.find(item => item.id === id)
      if (!target) return prev
      
      const newCancelled = !target.is_cancelled
      if (newCancelled) {
        const activeCount = prev.filter(item => !item.is_cancelled && item.id !== id).length
        if (activeCount === 0) {
          toast.error("Cannot cancel all items. If you want to cancel the entire order, please use the main Cancel Order action.")
          return prev
        }
      }
      
      return prev.map(item => 
        item.id === id ? { ...item, is_cancelled: newCancelled } : item
      )
    })
  }

  const editedSubtotal = editedItems ? editedItems.filter(item => !item.is_cancelled).reduce((sum, item) => sum + item.total_price, 0) : 0
  const editedTotal = editedItems ? editedSubtotal + parseFloat(selectedOrder?.delivery_fee || 0) - parseFloat(selectedOrder?.discount || 0) + parseFloat(selectedOrder?.platform_fee || 0) : 0

  const handleSaveEditedItems = async () => {
    setIsSavingItems(true)
    const toastId = toast.loading('Saving edited order items and updating totals...')
    try {
      const originalItems = selectedOrder.order_items || []
      const itemsToDelete = originalItems.filter(orig => !editedItems.some(ed => ed.id === orig.id))
      const itemsToUpdate = editedItems.filter(ed => {
        const orig = originalItems.find(o => o.id === ed.id)
        return orig && (
          orig.quantity !== ed.quantity || 
          orig.unit_price !== ed.unit_price ||
          !!orig.is_cancelled !== !!ed.is_cancelled
        )
      })

      // Delete items
      for (const item of itemsToDelete) {
        const { error: delError } = await supabase
          .from('order_items')
          .delete()
          .eq('id', item.id)
        if (delError) throw delError
      }

      // Update items
      for (const item of itemsToUpdate) {
        const { error: updError } = await supabase
          .from('order_items')
          .update({
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            packed_quantity: Math.min(item.quantity, item.packed_quantity || 0),
            is_packed: item.quantity === (item.packed_quantity || 0),
            is_cancelled: !!item.is_cancelled
          })
          .eq('id', item.id)
        if (updError) throw updError
      }

      const newSubtotal = editedSubtotal
      const newTotal = Math.max(0, editedTotal)

      let newInstructions = selectedOrder.delivery_instructions || ''
      if (!newInstructions.includes('[Order Edited: true]')) {
        newInstructions = `[Order Edited: true] ${newInstructions}`.trim()
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          subtotal: newSubtotal,
          total: newTotal,
          delivery_instructions: newInstructions,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id)
      
      if (orderError) throw orderError

      toast.success('Order items and prices updated successfully!', { id: toastId })
      setIsEditingItems(false)
      await adminFetchOrders()

      setSelectedOrder(prev => {
        if (prev && prev.id === selectedOrder.id) {
          return {
            ...prev,
            subtotal: newSubtotal,
            total: newTotal,
            delivery_instructions: newInstructions,
            order_items: editedItems
          }
        }
        return prev
      })
    } catch (err) {
      console.error('Error saving edited order items:', err)
      toast.error('Failed to save changes: ' + err.message, { id: toastId })
    } finally {
      setIsSavingItems(false)
    }
  }

  // Get status transition action
  const getNextStatusAction = (status) => {
    switch (status) {
      case 'pending':
      case 'PLACED_COOLING':
      case 'CONFIRMED_SYSTEM':
        return { next: 'confirmed', label: 'Accept Order', color: 'bg-blue-600 text-white hover:bg-blue-700' }
      case 'confirmed':
        return { next: 'preparing', label: 'Start Preparing', color: 'bg-indigo-600 text-white hover:bg-indigo-700' }
      case 'preparing':
        return { next: 'packed', label: 'Mark Packed', color: 'bg-purple-600 text-white hover:bg-purple-700' }
      case 'packed':
        return { next: 'assigned', label: 'Assign Captain', color: 'bg-cyan-600 text-white hover:bg-cyan-700' }
      case 'assigned':
        return { next: 'preparing_order', label: 'Mark Arrived at Mart', color: 'bg-teal-600 text-white hover:bg-teal-700' }
      case 'preparing_order':
      case 'picked_up':
        return { next: 'dispatched', label: 'Dispatch Order', color: 'bg-orange-600 text-white hover:bg-orange-700' }
      case 'dispatched':
        return { next: 'DELIVERED_VERIFYING', label: 'Complete Delivery', color: 'bg-green-600 text-white hover:bg-green-700' }
      case 'DELIVERED_VERIFYING':
        return { next: 'COMPLETED', label: 'Complete Inspection', color: 'bg-emerald-600 text-white hover:bg-emerald-700' }
      default:
        return null
    }
  }

  // Handle Quick status change
  const handleQuickStatusChange = async (orderId, nextStatus) => {
    setUpdatingStatusId(orderId)
    await adminUpdateOrderStatus(orderId, nextStatus)
    setUpdatingStatusId(null)
    
    // Refresh modal info if currently selected
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(prev => ({ ...prev, status: nextStatus }))
    }
  }

  // Handle submit cancellation
  const handleCancelOrderSubmit = async (e) => {
    e.preventDefault()
    if (!selectedOrder) return

    setIsCancelling(true)
    const res = await adminUpdateOrderStatus(selectedOrder.id, 'cancelled', {
      reason: cancelReason,
      note: cancelNote
    })

    if (res.success) {
      setSelectedOrder(prev => ({
        ...prev,
        status: 'cancelled',
        delivery_instructions: `${prev.delivery_instructions || ''} [Cancel Reason: ${cancelReason}] [Cancel Note: ${cancelNote}]`.trim()
      }))
      setShowCancelPrompt(false)
      setCancelNote('')
    }
    setIsCancelling(false)
  }

  // Filter Logic
  const filteredOrders = orders.filter(order => {
    // Search filter
    const orderNum = order.order_number || order.id.slice(0, 8)
    const matchesSearch = 
      orderNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer?.phone || '').includes(searchQuery)

    // Status filter - cancelled filter matches both store-cancelled and user-cancelled
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'cancelled'
        ? ['cancelled', 'CANCELLED_BY_USER'].includes(order.status)
        : order.status === statusFilter)

    return matchesSearch && matchesStatus
  })

  // Metric Stats Calculations
  const stats = {
    total: orders.length,
    pending: orders.filter(o => ['pending', 'PLACED_COOLING', 'CONFIRMED_SYSTEM'].includes(o.status)).length,
    inTransit: orders.filter(o => ['confirmed', 'preparing', 'packed', 'assigned', 'preparing_order', 'picked_up', 'dispatched'].includes(o.status)).length,
    delivered: orders.filter(o => ['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(o.status)).length,
    revenue: orders.filter(o => ['delivered', 'DELIVERED_VERIFYING', 'COMPLETED'].includes(o.status)).reduce((sum, o) => sum + (o.total || 0), 0)
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 shadow-premium">
        <div>
          <h1 className="text-3xl font-black text-gradient">Orders Management</h1>
          <p className="text-sm text-ozo-gray mt-1">Customer orders ko dispatch, track, aur cancel krein.</p>
        </div>
        <button
          onClick={() => adminFetchOrders()}
          className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-white px-5 py-3 rounded-2xl font-bold border border-gray-200/50 dark:border-white/10 hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh List
        </button>
      </div>

      {/* Metric Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Total Orders</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-gray-900 dark:text-white">{stats.total}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Pending Acceptance</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-amber-600">{stats.pending}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Active Delivery</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-blue-600">{stats.inTransit}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Delivered</span>
            <div className="p-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-green-600">{stats.delivered}</p>
        </div>

        <div className="p-5 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase">Delivered Sales</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black mt-2 text-emerald-600">₹{stats.revenue.toFixed(0)}</p>
        </div>
      </div>

      {/* Search and Filters Controls */}
      <div className="flex flex-col gap-4 p-4 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Order #, customer name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ozo-red text-gray-800 dark:text-white"
            />
          </div>

          {/* Quick Filter Selection tabs */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {[
              { id: 'all', label: 'ALL' },
              { id: 'PLACED_COOLING', label: 'COOLING' },
              { id: 'CONFIRMED_SYSTEM', label: 'SYSTEM CONFIRMED' },
              { id: 'preparing', label: 'PREPARING' },
              { id: 'packed', label: 'PACKED' },
              { id: 'assigned', label: 'ASSIGNED' },
              { id: 'preparing_order', label: 'AT MART' },
              { id: 'picked_up', label: 'PICKED UP' },
              { id: 'dispatched', label: 'DISPATCHED' },
              { id: 'DELIVERED_VERIFYING', label: 'VERIFYING' },
              { id: 'COMPLETED', label: 'COMPLETED' },
              { id: 'cancelled', label: 'CANCELLED' },
              { id: 'RETURN_REQUESTED', label: 'RETURN REQUESTED' }
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setStatusFilter(id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  statusFilter === id
                    ? 'bg-gradient-ozo text-white shadow-md shadow-ozo/10'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List Container */}
      <div className="bg-transparent lg:bg-white dark:lg:bg-[#1a1a1a] lg:rounded-3xl lg:border lg:border-gray-100 lg:dark:border-white/5 lg:shadow-premium overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <RefreshCw className="w-10 h-10 animate-spin text-ozo-red" />
            <p className="text-sm font-semibold text-gray-500">Orders pull ho rhe hain...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center text-2xl mb-4">
              📦
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Koi orders nahi mile</h3>
            <p className="text-sm text-gray-500 max-w-sm mt-1">Status tab badalkar ya search badalkar check krein.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] text-xs uppercase tracking-wider font-bold text-gray-400">
                    <th className="p-4">Order info</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Items / Summary</th>
                    <th className="p-4">Delivery City</th>
                    <th className="p-4">Total Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Quick Step</th>
                    <th className="p-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm">
                  {filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((order) => {
                    const orderNum = order.order_number || order.id.slice(0, 8)
                    const dateString = new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                    const statusInfo = STATUS_COLORS[order.status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: order.status }
                    const nextAction = getNextStatusAction(order.status)
                    const isTransitioning = updatingStatusId === order.id

                    return (
                      <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-all">
                        {/* Order info */}
                        <td className="p-4">
                          <div className="font-black text-gray-900 dark:text-white">#{orderNum}</div>
                          <div className="text-xs text-gray-450 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {dateString}
                          </div>
                          <div className="text-[10px] flex items-center gap-1 mt-1 font-bold">
                            <span className="text-gray-400">Mart:</span>
                            {order.mart ? (
                              <span className="text-ozo-red">{order.mart.name}</span>
                            ) : (
                              <span className="text-amber-500 font-extrabold uppercase tracking-wider">Not Assigned</span>
                            )}
                          </div>
                          {order.delivery_instructions?.includes('[SELF_DELIVERY_REQUESTED]') && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 animate-pulse uppercase tracking-wider">
                                Self-Delivery Requested
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Customer info */}
                        <td className="p-4">
                          <div className="font-bold text-gray-800 dark:text-gray-200">
                            {order.customer?.full_name || 'Guest User'}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{order.customer?.phone || 'No phone'}</div>
                        </td>

                        {/* Items info */}
                        <td className="p-4 max-w-[240px]">
                          <div className="text-xs truncate text-gray-600 dark:text-gray-400 font-medium">
                            {order.order_items?.map(i => `${i.product_name} (${i.quantity}x)`).join(', ') || 'No Items'}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            <span>{order.order_items?.length || 0} unique item(s)</span>
                          </div>
                        </td>

                        {/* Address info */}
                        <td className="p-4">
                          {order.address ? (
                            <a 
                              href={getGoogleMapsUrl(order.address, order)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 hover:text-ozo-green transition-colors group"
                              title="Open in Google Maps"
                            >
                              <MapPin className="w-3.5 h-3.5 text-gray-400 group-hover:text-ozo-green transition-colors" />
                              <span className="border-b border-dashed border-gray-400 dark:border-gray-500 group-hover:border-ozo-green">{order.address.city}</span>
                              <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Self Pickup</span>
                            </div>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="p-4">
                          <div className="font-extrabold text-gray-900 dark:text-white">₹{order.total}</div>
                          <div className="flex flex-col gap-1 mt-0.5">
                            <span className="text-[10px] text-gray-400 capitalize">
                              {order.payment_method === 'cod' ? 'COD' : (order.transaction_id?.startsWith('pay_') ? 'Online (Razorpay)' : (order.transaction_id?.startsWith('OZO_') ? 'Online (Cashfree)' : 'Online'))}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md w-fit border flex items-center gap-1 ${
                              order.payment_status === 'paid'
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/25'
                                : 'bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/25'
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${order.payment_status === 'paid' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                              {order.payment_status === 'paid' ? 'Paid' : 'Not Paid'}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <div className="flex flex-col items-start gap-1">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                              {statusInfo.label}
                            </span>
                            {order.status === 'PLACED_COOLING' && (
                              <CoolingTimer order={order} serverTimeOffset={serverTimeOffset} />
                            )}
                          </div>
                        </td>

                        {/* Quick action button */}
                        <td className="p-4 text-center">
                          {nextAction ? (
                            <button
                              onClick={() => handleQuickStatusChange(order.id, nextAction.next)}
                              disabled={isTransitioning}
                              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 mx-auto ${nextAction.color} shadow-sm active:scale-95 disabled:opacity-50`}
                            >
                              {isTransitioning ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <span>{nextAction.label}</span>
                              )}
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 font-medium">No actions</span>
                          )}
                        </td>

                        {/* Details button */}
                        <td className="p-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedOrder(order)
                              setIsModalOpen(true)
                              setShowCancelPrompt(false)
                            }}
                            className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-gray-650 dark:text-gray-300 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="lg:hidden space-y-4 py-2">
              {filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((order) => {
                const orderNum = order.order_number || order.id.slice(0, 8)
                const dateString = new Date(order.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })
                const statusInfo = STATUS_COLORS[order.status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: order.status }
                const nextAction = getNextStatusAction(order.status)
                const isTransitioning = updatingStatusId === order.id

                return (
                  <div key={order.id} className="bg-white dark:bg-[#1a1a1a] rounded-3xl border border-gray-100 dark:border-white/5 p-5 shadow-premium hover:shadow-hover transition-all duration-300 space-y-4">
                    {/* Top Row: Order ID, Date & Status, Details eye icon */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="font-black text-base text-gray-900 dark:text-white flex items-center gap-1.5">
                          <span>#{orderNum}</span>
                          {order.delivery_instructions?.includes('[SELF_DELIVERY_REQUESTED]') && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-wider animate-pulse">
                              Self-Delivery
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-450 dark:text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {dateString}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                          {statusInfo.label}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedOrder(order)
                            setIsModalOpen(true)
                            setShowCancelPrompt(false)
                          }}
                          className="p-2 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-gray-650 dark:text-gray-300 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Middle Info: Mart Name, Customer Details styled as cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50/50 dark:bg-white/[0.01] p-3 rounded-2xl border border-gray-100 dark:border-white/5 flex flex-col justify-between">
                        <span className="text-[9px] text-gray-400 uppercase font-black tracking-wider block mb-1">Mart</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center text-xs">
                            🏪
                          </div>
                          {order.mart ? (
                            <span className="font-extrabold text-xs text-ozo-red truncate max-w-[100px]">{order.mart.name}</span>
                          ) : (
                            <span className="text-amber-500 font-extrabold uppercase text-[9px]">Not Assigned</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50/50 dark:bg-white/[0.01] p-3 rounded-2xl border border-gray-100 dark:border-white/5 flex flex-col justify-between">
                        <span className="text-[9px] text-gray-400 uppercase font-black tracking-wider block mb-1">Customer</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-xs">
                            👤
                          </div>
                          <div className="truncate">
                            <div className="font-extrabold text-xs text-gray-800 dark:text-gray-200 truncate max-w-[100px]">
                              {order.customer?.full_name || 'Guest User'}
                            </div>
                            <div className="text-[9px] text-gray-500 font-bold">{order.customer?.phone || 'No phone'}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Items Box with Summary Header */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-gray-450 uppercase font-black tracking-wider px-1">
                        <span>Items ({order.order_items?.length || 0})</span>
                        <span>{order.order_items?.reduce((s, i) => s + i.quantity, 0) || 0} qty total</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {order.order_items?.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 bg-gray-50 dark:bg-white/[0.02] border border-gray-150/30 dark:border-white/5 rounded-xl px-2.5 py-1 text-xs">
                            <span className="font-extrabold text-gray-700 dark:text-gray-300 truncate max-w-[130px]">{item.product_name}</span>
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-red-500/10 text-ozo-red dark:text-red-400">
                              x{item.quantity}
                            </span>
                          </div>
                        )) || <span className="text-xs text-gray-450">No Items</span>}
                      </div>
                    </div>

                    {/* Location, Total Amount & Payment Details */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="space-y-1">
                        <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider block">Address</span>
                        {order.address ? (
                          <a 
                            href={getGoogleMapsUrl(order.address, order)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] text-gray-700 dark:text-gray-300 hover:text-ozo-green transition-colors font-bold"
                          >
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="border-b border-dashed border-gray-400 dark:border-gray-500 truncate max-w-[120px]">{order.address.city}</span>
                          </a>
                        ) : (
                          <div className="flex items-center gap-1 text-[11px] text-gray-450 dark:text-gray-555 font-bold">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span>Self Pickup</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right space-y-1">
                        <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider block">Total Amount</span>
                        <div className="flex flex-col items-end">
                          <span className="font-black text-base text-gray-900 dark:text-white">₹{order.total}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] text-gray-450 capitalize font-bold">
                              {order.payment_method === 'cod' ? 'COD' : 'Online'}
                            </span>
                            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                              order.payment_status === 'paid'
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/25'
                                : 'bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/25'
                            }`}>
                              {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action or Cooling Timer */}
                    {nextAction || order.status === 'PLACED_COOLING' ? (
                      <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-3">
                        <div>
                          {order.status === 'PLACED_COOLING' && (
                            <CoolingTimer order={order} serverTimeOffset={serverTimeOffset} />
                          )}
                        </div>
                        {nextAction && (
                          <button
                            onClick={() => handleQuickStatusChange(order.id, nextAction.next)}
                            disabled={isTransitioning}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${nextAction.color} shadow-sm active:scale-95 disabled:opacity-50`}
                          >
                            {isTransitioning ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <span>{nextAction.label}</span>
                            )}
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Pagination Controls */}
        {!isLoading && filteredOrders.length > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing <span className="font-bold text-gray-800 dark:text-gray-200">{Math.min(filteredOrders.length, (currentPage - 1) * pageSize + 1)}</span> to{' '}
              <span className="font-bold text-gray-800 dark:text-gray-200">{Math.min(filteredOrders.length, currentPage * pageSize)}</span> of{' '}
              <span className="font-bold text-gray-800 dark:text-gray-200">{filteredOrders.length}</span> orders
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Page {currentPage} of {Math.ceil(filteredOrders.length / pageSize)}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredOrders.length / pageSize), prev + 1))}
                disabled={currentPage === Math.ceil(filteredOrders.length / pageSize)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Order Modal */}
      <AnimatePresence>
        {isModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm overflow-hidden">
            {/* Backdrop click handler to close */}
            <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />
            
            <motion.div
              initial={{ x: '100%', opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative bg-white dark:bg-[#141414] w-full max-w-2xl h-full shadow-2xl overflow-hidden flex flex-col border-l border-gray-100 dark:border-white/5 z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors flex items-center justify-center border border-gray-200/60 dark:border-white/10 shadow-sm"
                    aria-label="Go back"
                  >
                    <ChevronLeft className="w-5 h-5 stroke-[2.5px]" />
                  </button>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-none">
                        Order #{selectedOrder.order_number || selectedOrder.id.slice(0, 8)}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border ${STATUS_COLORS[selectedOrder.status]?.bg} ${STATUS_COLORS[selectedOrder.status]?.text} ${STATUS_COLORS[selectedOrder.status]?.border}`}>
                        {STATUS_COLORS[selectedOrder.status]?.label}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Placed on: {new Date(selectedOrder.created_at).toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="hidden sm:block p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {selectedOrder.delivery_instructions?.includes('[SELF_DELIVERY_REQUESTED]') && (
                <div className="px-6 py-3.5 bg-blue-500/10 border-b border-blue-500/20 text-blue-700 dark:text-blue-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                  <div className="flex items-start gap-2">
                    <ShoppingBag className="w-4.5 h-4.5 text-blue-500 mt-0.5 shrink-0 animate-bounce" />
                    <div>
                      <p className="text-xs font-black">Mart has requested Self-Delivery for this order!</p>
                      <p className="text-[10px] text-blue-600 dark:text-blue-500 font-semibold mt-0.5">
                        Approval will share customer contact number & address details directly with the Mart.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => handleApproveSelfDelivery(selectedOrder.id)}
                      disabled={isApprovingSelfDelivery}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                    >
                      {isApprovingSelfDelivery ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      Approve & Share Details
                    </button>
                  </div>
                </div>
              )}

              {selectedOrder.delivery_instructions?.includes('[SELF_DELIVERY_APPROVED]') && (
                <div className="px-6 py-3 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <div>
                      <p className="text-xs font-black">Self-Delivery Approved & Details Shared with Mart</p>
                      <p className="text-[10px] text-emerald-650 dark:text-emerald-500 font-semibold mt-0.5">
                        Mart has access to the customer's phone number and delivery address.
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 whitespace-nowrap">
                    Self-Delivery Active
                  </span>
                </div>
              )}

              {selectedOrder.status === 'PLACED_COOLING' && (
                <div className={`px-6 py-3 border-b flex items-center justify-between shrink-0 transition-colors ${
                  adminCancelWindowExpired
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-455'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-455'
                }`}>
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${!adminCancelWindowExpired ? 'animate-pulse text-rose-500' : 'text-amber-500'}`} />
                    <span className="text-xs font-black">
                      {adminCancelWindowExpired
                        ? 'Cooling period has expired (System will auto-confirm or Admin can manually Accept)'
                        : `Customer can cancel this order. Cooling window active: ${adminCancelTimeLeftStr} remaining`}
                    </span>
                  </div>
                  {!adminCancelWindowExpired && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                      Cancellation Active
                    </span>
                  )}
                </div>
              )}

              {/* Scrollable content body */}
              <div className="p-6 flex flex-col gap-6 overflow-y-auto flex-1">
                {/* Left Column: items & breakdown */}
                <div className="space-y-6">
                  {/* Items list */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <Package className="w-4 h-4" />
                        Items Ordered
                      </h4>
                      {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'CANCELLED_BY_USER' && (
                        <div className="flex items-center gap-2">
                          {isEditingItems ? (
                            <>
                              <button
                                onClick={handleSaveEditedItems}
                                disabled={isSavingItems}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                              >
                                {isSavingItems ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Save Changes
                              </button>
                              <button
                                onClick={() => setIsEditingItems(false)}
                                className="px-3 py-1 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 text-gray-750 dark:text-gray-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={startEditingItems}
                              className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                            >
                              Edit Items
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-white/5">
                      {(isEditingItems ? editedItems : selectedOrder.order_items)?.map((item) => (
                        <div key={item.id} className={`p-4 transition-colors duration-200 ${item.is_cancelled ? 'opacity-60 bg-red-500/[0.02]' : 'bg-gray-50/20 dark:bg-white/[0.01]'}`}>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <img
                                src={item.product_image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=80'}
                                alt={item.product_name}
                                className={`w-10 h-10 object-cover rounded-lg border border-gray-200/50 dark:border-white/10 transition-all ${item.is_cancelled ? 'grayscale contrast-75' : ''}`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className={`font-bold text-xs sm:text-sm truncate transition-all duration-200 ${item.is_cancelled ? 'line-through text-red-650 dark:text-red-400 font-medium' : 'text-gray-900 dark:text-white'}`}>
                                    {item.product_name}
                                  </p>
                                  {item.is_cancelled && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-black bg-red-100 dark:bg-red-950/40 text-red-750 dark:text-red-400 border border-red-200/50 dark:border-red-900/50 rounded-md uppercase tracking-wider scale-95 origin-left">
                                      Cancelled
                                    </span>
                                  )}
                                </div>
                                {!isEditingItems ? (
                                  <p className={`text-xs ${item.is_cancelled ? 'line-through text-gray-400' : 'text-gray-400'}`}>{item.quantity} x ₹{item.unit_price}</p>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-4 mt-1">
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-gray-400 uppercase font-bold">Qty:</span>
                                      <input
                                        type="number"
                                        min="1"
                                        disabled={item.is_cancelled}
                                        value={item.quantity}
                                        onChange={(e) => handleUpdateItemQty(item.id, e.target.value)}
                                        className="w-16 px-1.5 py-0.5 text-xs text-gray-900 dark:text-white bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                                      />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-gray-400 uppercase font-bold">Price:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        disabled={item.is_cancelled}
                                        value={item.unit_price}
                                        onChange={(e) => handleUpdateItemPrice(item.id, e.target.value)}
                                        className="w-20 px-1.5 py-0.5 text-xs text-gray-900 dark:text-white bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {!isEditingItems && (
                                <div className="flex items-center gap-1.5 mr-2">
                                  {item.product_slug && (
                                    <a
                                      href={`/product/${item.product_slug}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/10 rounded transition-all"
                                      title="Open product page in new tab"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  {item.product_id && (
                                    <button
                                      disabled={updatingProductId === item.product_id}
                                      onClick={() => handleToggleProductAvailability(item.product_id, item.is_available)}
                                      className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded-md transition-all flex items-center gap-1 border ${
                                        item.is_available
                                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/25'
                                          : 'bg-rose-500/10 text-rose-600 border-rose-500/25 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/25'
                                      }`}
                                      title={item.is_available ? "Click to mark Out of Stock" : "Click to mark Available"}
                                    >
                                      <span className={`w-1 h-1 rounded-full ${item.is_available ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                      {item.is_available ? 'In Stock' : 'OOS'}
                                    </button>
                                  )}
                                </div>
                              )}
                              <div className={`font-extrabold text-sm whitespace-nowrap transition-colors duration-200 ${item.is_cancelled ? 'line-through text-red-500/60 dark:text-red-400/60' : 'text-gray-900 dark:text-white'}`}>
                                ₹{item.total_price.toFixed(2)}
                              </div>
                              {isEditingItems && (
                                <button
                                  onClick={() => handleToggleCancelItem(item.id)}
                                  className={`p-1.5 rounded transition-all border ${
                                    item.is_cancelled
                                      ? 'text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                                      : 'text-rose-500 hover:text-rose-700 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20'
                                  }`}
                                  title={item.is_cancelled ? "Restore Item" : "Cancel/Cross Out Item"}
                                >
                                  {item.is_cancelled ? <Check className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Breakdown */}
                  <div className="p-5 bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5 space-y-3">
                    <h4 className="text-xs font-bold uppercase text-gray-400">Bill Details</h4>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Items Subtotal</span>
                        <span>₹{(isEditingItems ? editedSubtotal : selectedOrder.subtotal)?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Delivery Partner Fee</span>
                        <span>₹{selectedOrder.delivery_fee?.toFixed(2)}</span>
                      </div>
                      {selectedOrder.distance > 0 && (
                        <div className="flex justify-between text-xs text-gray-455 dark:text-gray-500 -mt-1 font-semibold">
                          <span>Delivery Distance</span>
                          <span>{Number(selectedOrder.distance).toFixed(1)} km</span>
                        </div>
                      )}
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount Applied</span>
                          <span>- ₹{selectedOrder.discount?.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t border-gray-100 dark:border-white/5 pt-2.5 flex justify-between font-black text-gray-900 dark:text-white text-base">
                        <span>Grand Total</span>
                        <span>₹{(isEditingItems ? editedTotal : selectedOrder.total)?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cancellation Alert if Status Cancelled */}
                  {selectedOrder.status === 'cancelled' && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl">
                      <div className="flex gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                        <div>
                          <h5 className="font-extrabold text-red-800 dark:text-red-400 text-sm">Order Cancelled Details</h5>
                          {(() => {
                            const details = parseCancellation(selectedOrder.delivery_instructions)
                            return details ? (
                              <div className="text-xs text-red-700 dark:text-red-300 mt-1 space-y-1">
                                <p><strong>Reason:</strong> {details.reason}</p>
                                {details.note && <p><strong>Remarks:</strong> {details.note}</p>}
                              </div>
                            ) : (
                              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                                {selectedOrder.delivery_instructions || 'No cancellation logs found.'}
                              </p>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: customer details & status override */}
                <div className="space-y-6">
                  {/* Customer details */}
                  <div className="p-5 bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      Customer Details
                    </h4>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-ozo text-white flex items-center justify-center font-extrabold text-sm uppercase">
                        {selectedOrder.customer?.full_name?.slice(0, 2) || 'GU'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white text-sm">{selectedOrder.customer?.full_name || 'Guest User'}</div>
                        <div className="text-xs text-gray-400">Customer ID: {selectedOrder.customer?.id?.slice(0, 8)}</div>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs pt-2 border-t border-gray-100 dark:border-white/5">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{selectedOrder.customer?.email || 'No email'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{selectedOrder.customer?.phone || 'No phone number'}</span>
                      </div>
                    </div>

                    {/* Direct Notification Section */}
                    <div className="pt-3 border-t border-gray-100 dark:border-white/5 space-y-3">
                      <button
                        onClick={() => setShowNotificationForm(!showNotificationForm)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm border border-red-500/20"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        {showNotificationForm ? 'Cancel Message' : 'Send Push Notification'}
                      </button>

                      {showNotificationForm && (
                        <div className="space-y-3 p-3 bg-white dark:bg-[#1a1a22] border border-gray-100 dark:border-white/5 rounded-xl">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Notification Title</label>
                            <input
                              type="text"
                              value={notificationTitle}
                              onChange={(e) => setNotificationTitle(e.target.value)}
                              placeholder="e.g., Order Cancellation Update"
                              className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-white/10 bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Message Body</label>
                            <textarea
                              value={notificationMessage}
                              onChange={(e) => setNotificationMessage(e.target.value)}
                              placeholder="Type personal message here..."
                              rows={3}
                              className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-white/10 bg-transparent text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                            />
                          </div>

                          <button
                            onClick={() => handleSendPersonalNotification(selectedOrder.customer?.id || selectedOrder.user_id)}
                            disabled={isSendingNotification}
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-ozo text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
                          >
                            {isSendingNotification ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                Send Realtime
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mart Details */}
                  <MartAdmin 
                    mart={selectedOrder.mart}
                    order={selectedOrder}
                    marts={marts}
                    onAssignMart={handleAssignMart}
                  />

                  {/* Rider Details */}
                  <RiderAdmin 
                    rider={selectedOrder.rider} 
                    order={selectedOrder} 
                    onAssignRider={handleAssignRider} 
                  />

                  {/* Delivery Address */}
                  <div className="p-5 bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5 space-y-3">
                    <h4 className="text-sm font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      Delivery Location
                    </h4>
                    {selectedOrder.address ? (
                      <div className="space-y-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          <p className="font-bold text-gray-800 dark:text-gray-200">
                            {selectedOrder.address.address_line1 && selectedOrder.address.address_line1.startsWith('Location Link: ') ? (
                              <>
                                Location Link:{' '}
                                <a
                                  href={selectedOrder.google_maps_url || selectedOrder.address.google_maps_url || selectedOrder.address.address_line1.replace('Location Link: ', '')}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-ozo-red hover:underline break-all font-bold"
                                >
                                  {selectedOrder.google_maps_url || selectedOrder.address.google_maps_url || selectedOrder.address.address_line1.replace('Location Link: ', '')}
                                </a>
                              </>
                            ) : (
                              selectedOrder.address.address_line1
                            )}
                          </p>
                          {selectedOrder.address.address_line2 && <p>{selectedOrder.address.address_line2}</p>}
                          <p>{selectedOrder.address.city}, {selectedOrder.address.state} - {selectedOrder.address.pincode}</p>
                        </div>
                        <a 
                          href={getGoogleMapsUrl(selectedOrder.address, selectedOrder)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ozo-green/10 hover:bg-ozo-green/20 text-ozo-green text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm border border-ozo-green/20"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View on Google Maps
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Address not attached. Check delivery instructions or self-pickup status.</p>
                    )}
                    {selectedOrder.delivery_instructions && 
                     !selectedOrder.delivery_instructions.includes('[Cancel Reason:') && 
                     selectedOrder.delivery_instructions.replace(/\[SELF_DELIVERY_REQUESTED\]/gi, '').trim().length > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-white/5 text-[11px] text-gray-500">
                        <p className="font-bold text-gray-600 dark:text-gray-400">Special Instructions:</p>
                        <p className="mt-0.5">
                          {selectedOrder.delivery_instructions.replace(/\[SELF_DELIVERY_REQUESTED\]/gi, '').trim()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Payment Details Card */}
                  <div className="p-5 bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" />
                      Payment Details
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Method</span>
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider w-fit ${
                            selectedOrder.payment_method === 'cod'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {selectedOrder.payment_method === 'cod' ? 'COD' : 'Online'}
                          </span>
                          {selectedOrder.payment_method !== 'cod' && selectedOrder.transaction_id?.startsWith('pay_') && (
                            <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider w-fit">
                              Razorpay Secured
                            </span>
                          )}
                          {selectedOrder.payment_method !== 'cod' && selectedOrder.transaction_id?.startsWith('OZO_') && (
                            <span className="inline-flex items-center gap-1 bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider w-fit">
                              Cashfree Secured
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Status</span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${
                          selectedOrder.payment_status === 'paid'
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/25'
                            : 'bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/25'
                        }`}>
                          {selectedOrder.payment_status === 'paid' ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                              PAID
                            </>
                          ) : (
                            <>
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                              </span>
                              NOT PAID
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {selectedOrder.transaction_id && (
                      <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                          {selectedOrder.transaction_id.startsWith('pay_') ? 'Razorpay Payment ID' : (selectedOrder.transaction_id.startsWith('OZO_') ? 'Cashfree Order ID' : 'Transaction ID / UTR')}
                        </span>
                        <code className="text-xs font-mono font-bold bg-gray-150 dark:bg-white/5 px-2.5 py-1.5 rounded-xl text-gray-800 dark:text-gray-250 break-all select-all block mt-1 border border-gray-200/50 dark:border-white/5">
                          {selectedOrder.transaction_id}
                        </code>
                      </div>
                    )}

                    {/* Razorpay Online Payment Details */}
                    {selectedOrder.transaction_id && selectedOrder.transaction_id.startsWith('pay_') && (
                      <div className="pt-2 border-t border-gray-100 dark:border-white/5 space-y-2.5">
                        {isLoadingPaymentDetails && (
                          <div className="flex items-center justify-center py-4 gap-2 text-xs text-gray-400 font-bold">
                            <RefreshCw className="w-4 h-4 animate-spin text-ozo-red" />
                            Loading payment details...
                          </div>
                        )}

                        {!isLoadingPaymentDetails && paymentDetails && (
                          <div className="bg-gray-100/50 dark:bg-white/[0.01] rounded-xl p-3 border border-gray-200/40 dark:border-white/5 space-y-2">
                            <span className="text-[9px] uppercase tracking-wider font-black text-indigo-500 block">
                              Razorpay Transaction Info
                            </span>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                              {/* Contact */}
                              {paymentDetails.contact && (
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span className="text-gray-500 font-medium select-all truncate">
                                    {paymentDetails.contact}
                                  </span>
                                </div>
                              )}
                              
                              {/* Email */}
                              {paymentDetails.email && (
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span className="text-gray-500 font-medium select-all truncate">
                                    {paymentDetails.email}
                                  </span>
                                </div>
                              )}

                              {/* Method specific fields */}
                              <div className="md:col-span-2 flex flex-wrap gap-x-4 gap-y-1.5 pt-1 border-t border-gray-100 dark:border-white/5">
                                {/* Payment Method Type */}
                                <div className="flex items-center gap-1 text-[11px] font-bold text-gray-700 dark:text-gray-300">
                                  <span className="text-gray-400 font-normal">Method:</span>
                                  <span className="uppercase">{paymentDetails.method}</span>
                                </div>

                                {/* Card Details */}
                                {paymentDetails.method === 'card' && paymentDetails.card && (
                                  <div className="flex items-center gap-1 text-[11px] font-bold text-gray-750 dark:text-gray-300">
                                    <span className="text-gray-400 font-normal">Card:</span>
                                    <span>
                                      {paymentDetails.card.network} •••• {paymentDetails.card.last4} ({paymentDetails.card.type})
                                    </span>
                                  </div>
                                )}

                                {/* UPI Details */}
                                {paymentDetails.method === 'upi' && paymentDetails.vpa && (
                                  <div className="flex items-center gap-1 text-[11px] font-bold text-gray-750 dark:text-gray-300 min-w-0">
                                    <span className="text-gray-400 font-normal">UPI VPA:</span>
                                    <span className="select-all truncate">{paymentDetails.vpa}</span>
                                  </div>
                                )}

                                {/* Netbanking Details */}
                                {paymentDetails.method === 'netbanking' && paymentDetails.bank && (
                                  <div className="flex items-center gap-1 text-[11px] font-bold text-gray-750 dark:text-gray-300">
                                    <span className="text-gray-400 font-normal">Bank:</span>
                                    <span>{paymentDetails.bank}</span>
                                  </div>
                                )}

                                {/* Wallet Details */}
                                {paymentDetails.method === 'wallet' && paymentDetails.wallet && (
                                  <div className="flex items-center gap-1 text-[11px] font-bold text-gray-750 dark:text-gray-300">
                                    <span className="text-gray-400 font-normal">Wallet:</span>
                                    <span>{paymentDetails.wallet}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Fee / Tax / Created */}
                            <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex justify-between text-[10px] text-gray-400 font-bold">
                              <div>
                                Status: <span className="uppercase text-emerald-500 font-extrabold">{paymentDetails.status}</span>
                              </div>
                              {paymentDetails.fee !== undefined && (
                                <div>
                                  Rzp Fee: ₹{((paymentDetails.fee || 0) / 100).toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="pt-3 border-t border-gray-100 dark:border-white/5 space-y-2">
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {selectedOrder.payment_method === 'cod' 
                          ? 'COD order details check krein aur receipt check kr ke payment status verify krein.'
                          : 'Online transaction update hone ke baad status dynamically update hota hai.'
                        }
                      </p>
                      <div className="flex gap-2">
                        {selectedOrder.payment_status !== 'paid' ? (
                          <button
                            onClick={() => handlePaymentStatusChange(selectedOrder.id, 'paid')}
                            disabled={updatingPaymentId === selectedOrder.id}
                            className="w-full flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 disabled:opacity-50"
                          >
                            {updatingPaymentId === selectedOrder.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Verify & Mark as Paid
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePaymentStatusChange(selectedOrder.id, 'pending')}
                            disabled={updatingPaymentId === selectedOrder.id}
                            className="w-full flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-750 dark:text-gray-300 py-2.5 rounded-xl text-xs font-black transition-all border border-gray-200/50 dark:border-white/10 active:scale-95 disabled:opacity-50"
                          >
                            {updatingPaymentId === selectedOrder.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5" />
                                Mark as Unpaid / Pending
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Return Request Panel */}
                  {selectedOrderReturnRequest && (
                    <div className="p-5 bg-red-500/5 dark:bg-red-500/[0.02] rounded-2xl border border-red-500/10 dark:border-red-500/20 space-y-4">
                      <h4 className="text-sm font-black uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
                        <RefreshCw className="w-4 h-4 animate-spin animate-duration-10000 text-red-500" />
                        Customer Return Request
                      </h4>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Return Status</span>
                          <div className="mt-1">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                              selectedOrderReturnRequest.status === 'pending'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse'
                                : selectedOrderReturnRequest.status === 'rejected'
                                ? 'bg-red-500/10 border-red-500/20 text-red-500'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                            }`}>
                              {selectedOrderReturnRequest.status}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Requested On</span>
                          <p className="text-xs font-extrabold text-gray-800 dark:text-gray-250 mt-1">
                            {new Date(selectedOrderReturnRequest.created_at).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 dark:border-white/5 pt-3">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Reason for Return</span>
                        <p className="text-xs font-black text-gray-900 dark:text-white mt-0.5">
                          {selectedOrderReturnRequest.reason}
                        </p>
                      </div>

                      {selectedOrderReturnRequest.custom_note && (
                        <div className="border-t border-gray-100 dark:border-white/5 pt-3">
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Customer Note</span>
                          <p className="text-xs font-medium text-gray-800 dark:text-gray-300 leading-relaxed mt-0.5">
                            {selectedOrderReturnRequest.custom_note}
                          </p>
                        </div>
                      )}

                      {/* Customer Photo Proof */}
                      {selectedOrderReturnRequest.proof_image && (
                        <div className="border-t border-gray-100 dark:border-white/5 pt-3">
                          <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Customer Live Photo Proof</span>
                          <a
                            href={selectedOrderReturnRequest.proof_image}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative block rounded-2xl overflow-hidden border border-gray-200/50 dark:border-white/10 aspect-video hover:border-red-500 transition-all duration-300 hover:scale-[1.02] cursor-zoom-in max-w-sm"
                          >
                            <img
                              src={selectedOrderReturnRequest.proof_image}
                              alt="Customer Proof"
                              className="w-full h-full object-cover"
                            />
                          </a>
                        </div>
                      )}

                      {/* Approve / Reject Actions (Only if status is pending) */}
                      {selectedOrderReturnRequest.status === 'pending' ? (
                        <div className="border-t border-gray-100 dark:border-white/5 pt-4 space-y-3">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                              Admin Feedback / Reason Comments
                            </label>
                            <textarea
                              rows={2}
                              value={returnAdminComment}
                              onChange={(e) => setReturnAdminComment(e.target.value)}
                              placeholder="Explain reason for rejection or approval remarks..."
                              className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] px-3.5 py-2 text-xs focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:text-white font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:opacity-50 resize-none"
                            />
                          </div>

                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => handleRejectReturn(selectedOrderReturnRequest)}
                              disabled={isSubmittingReturn}
                              className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-550 border border-red-500/25 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                            >
                              Reject Request
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveReturn(selectedOrderReturnRequest)}
                              disabled={isSubmittingReturn}
                              className="flex-1 py-2 bg-gradient-ozo text-white rounded-xl font-black text-xs hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              Approve & Refund Wallet
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-t border-gray-100 dark:border-white/5 pt-3 bg-gray-50/50 dark:bg-white/[0.01] p-3 rounded-xl">
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Admin Comments / Remarks</span>
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-250 mt-1 italic">
                            "{selectedOrderReturnRequest.admin_comment || 'No comments provided.'}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Delivery Proof Photos from Rider */}
                  {selectedOrder.status === 'delivered' && (selectedOrder.delivery_proof_image_1 || selectedOrder.delivery_proof_image_2) && (
                    <div className="p-5 bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5 space-y-3">
                      <h4 className="text-sm font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-[#00FF66]" />
                        Rider Delivery Proof Photos
                      </h4>
                      <div className="grid grid-cols-2 gap-4 pt-1">
                        {selectedOrder.delivery_proof_image_1 ? (
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-450 dark:text-gray-400 font-bold uppercase tracking-wider">Photo 1: Doorstep Proof</span>
                            <a
                              href={selectedOrder.delivery_proof_image_1}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative block rounded-2xl overflow-hidden border border-gray-200/50 dark:border-white/10 aspect-video hover:border-[#00FF66] transition-all duration-300 hover:scale-[1.02] cursor-zoom-in"
                            >
                              <img
                                src={selectedOrder.delivery_proof_image_1}
                                alt="Rider Proof 1"
                                className="w-full h-full object-cover"
                              />
                            </a>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-450 italic flex items-center justify-center border border-dashed border-gray-250 dark:border-white/10 rounded-2xl h-24">
                            Photo 1 not available
                          </div>
                        )}

                        {selectedOrder.delivery_proof_image_2 ? (
                          <div className="space-y-1">
                            <span className="text-[10px] text-gray-450 dark:text-gray-400 font-bold uppercase tracking-wider">Photo 2: Location Proof</span>
                            <a
                              href={selectedOrder.delivery_proof_image_2}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative block rounded-2xl overflow-hidden border border-gray-200/50 dark:border-white/10 aspect-video hover:border-[#00FF66] transition-all duration-300 hover:scale-[1.02] cursor-zoom-in"
                            >
                              <img
                                src={selectedOrder.delivery_proof_image_2}
                                alt="Rider Proof 2"
                                className="w-full h-full object-cover"
                              />
                            </a>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-450 italic flex items-center justify-center border border-dashed border-gray-250 dark:border-white/10 rounded-2xl h-24">
                            Photo 2 not available
                          </div>
                        )}
                      </div>
                      
                      {selectedOrder.delivered_at && (
                        <p className="text-[10px] text-gray-400 mt-1 font-semibold">
                          Delivered at: {new Date(selectedOrder.delivered_at).toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Customer Feedback Card inside Info Modal */}
                  {selectedOrderReviews && selectedOrderReviews.length > 0 && (
                    <div className="p-5 bg-amber-500/5 dark:bg-amber-500/[0.02] rounded-2xl border border-amber-500/10 dark:border-amber-500/20 space-y-3">
                      <h4 className="text-sm font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        Customer Feedback ({selectedOrderReviews.length})
                      </h4>
                      <div className="space-y-4 divide-y divide-amber-500/10">
                        {selectedOrderReviews.map((rev, idx) => (
                          <div key={rev.id} className={`${idx > 0 ? 'pt-4' : ''} space-y-2`}>
                            <div className="flex items-center justify-between">
                              <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    size={12}
                                    className={`${
                                      i < rev.rating
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-gray-300 dark:text-gray-700'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] text-gray-400">
                                {new Date(rev.created_at).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short'
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-gray-750 dark:text-gray-300 italic">
                              "{rev.review_text}"
                            </p>
                            {rev.images && rev.images.length > 0 && (
                              <div className="flex gap-1.5 flex-wrap pt-1">
                                {rev.images.map((imgUrl, imgIdx) => (
                                  <a
                                    key={imgIdx}
                                    href={imgUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative block w-10 h-10 rounded-lg overflow-hidden border border-amber-500/10 hover:border-amber-500 transition-all duration-300 hover:scale-[6] hover:z-50 hover:shadow-2xl cursor-zoom-in"
                                  >
                                    <img
                                      src={imgUrl}
                                      alt={`Review upload ${imgIdx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </a>
                                ))}
                              </div>
                            )}
                            
                            {/* Official Admin Reply Section */}
                            {editingReplyId === rev.id ? (
                              <div className="relative mt-3 ml-10 mr-4">
                                {/* Connecting Thread Line */}
                                <div className="absolute right-full mr-2 -top-6 bottom-1/2 w-4 border-l-2 border-b-2 border-red-500/20 dark:border-red-500/30 rounded-bl-lg pointer-events-none" />
                                
                                <form 
                                  onSubmit={(e) => handleSaveReply(e, rev)} 
                                  className="p-3 bg-red-50/50 dark:bg-red-950/10 border border-red-500/10 dark:border-red-500/20 rounded-2xl flex flex-col gap-2"
                                >
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-black text-red-600 dark:text-red-400">ozoofficial</span>
                                  <span className="w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px] font-black shadow-sm">✓</span>
                                  <span className="text-[10px] text-gray-400 font-medium ml-1">
                                    replying to @{selectedOrder?.customer?.full_name || 'customer'}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-1.5 my-1">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-red-500/60 dark:text-red-400/50">Suggestions:</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {getSuggestions(rev.rating).map((sugg, sIdx) => (
                                      <button
                                        key={sIdx}
                                        type="button"
                                        onClick={() => setReplyInput(sugg)}
                                        className="text-[10px] text-red-600 dark:text-red-300 bg-white hover:bg-red-50/50 dark:bg-black/20 dark:hover:bg-red-950/20 px-2.5 py-1 rounded-xl border border-red-200/60 dark:border-red-900/30 font-bold transition-all text-left truncate max-w-full shadow-sm hover:scale-[1.01]"
                                        title={sugg}
                                      >
                                        {sugg}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <input
                                  type="text"
                                  value={replyInput}
                                  onChange={(e) => setReplyInput(e.target.value)}
                                  placeholder="Type official reply..."
                                  className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-red-200 dark:border-red-900/30 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-red-500 text-gray-900 dark:text-white"
                                  autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      setEditingReplyId(null)
                                      setReplyInput('')
                                    }}
                                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-650 dark:text-gray-300 rounded-xl text-[10px] font-extrabold transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    type="submit" 
                                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black shadow-sm transition-colors"
                                  >
                                    Save Reply
                                  </button>
                                </div>
                               </form>
                              </div>
                            ) : rev.reply_text ? (
                              <div className="relative mt-3 ml-10 mr-4">
                                {/* Connecting Thread Line */}
                                <div className="absolute right-full mr-2 -top-6 bottom-1/2 w-4 border-l-2 border-b-2 border-red-500/20 dark:border-red-500/30 rounded-bl-lg pointer-events-none" />
                                
                                <div className="p-3 bg-red-50/50 dark:bg-red-950/10 border border-red-500/10 dark:border-red-500/20 rounded-2xl space-y-1">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-black text-red-600 dark:text-red-400">ozoofficial</span>
                                      <span className="w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[8px] font-black shadow-sm">✓</span>
                                      <span className="text-[10px] text-gray-400 font-medium ml-1">
                                        replying to @{selectedOrder?.customer?.full_name || 'customer'}
                                      </span>
                                    </div>
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        setEditingReplyId(rev.id)
                                        setReplyInput(rev.reply_text)
                                      }}
                                      className="text-[10px] text-gray-400 hover:text-red-600 font-extrabold transition-colors"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                  <p className="text-xs text-gray-800 dark:text-gray-200">
                                    {rev.reply_text}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 ml-4 mr-4">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingReplyId(rev.id)
                                    setReplyInput('')
                                  }}
                                  className="text-xs font-black text-red-600 hover:text-red-750 dark:text-red-400 flex items-center gap-1 transition-colors"
                                >
                                  Reply as ozoofficial
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Manual Status Override */}
                  <div className="p-5 bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5 space-y-3">
                    <h4 className="text-sm font-black uppercase tracking-wider text-gray-400">Override Status</h4>
                    <div className="relative">
                      <select
                        value={selectedOrder.status}
                        onChange={(e) => handleQuickStatusChange(selectedOrder.id, e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-800 dark:text-white focus:outline-none focus:border-ozo-red focus:ring-4 focus:ring-ozo-red/15 cursor-pointer appearance-none bg-no-repeat bg-[right_12px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')] dark:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
                      >
                        {Object.keys(STATUS_COLORS).map((status) => (
                          <option key={status} value={status} className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">
                            {STATUS_COLORS[status].label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] gap-3">
                <div className="w-full sm:w-auto flex gap-2">
                  <button
                    onClick={() => {
                      window.print()
                    }}
                    className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-800 dark:text-white px-4 py-2.5 rounded-xl font-extrabold text-xs border border-gray-200/50 dark:border-white/10"
                  >
                    <Printer className="w-4 h-4" />
                    Print Receipt
                  </button>
                  {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                    <button
                      onClick={() => setShowCancelPrompt(!showCancelPrompt)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-950/40 px-4 py-2.5 rounded-xl font-extrabold text-xs border border-red-100 dark:border-red-950/30"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>

                <div className="w-full sm:w-auto flex items-center justify-end gap-2">
                  {getNextStatusAction(selectedOrder.status) && (
                    <button
                      onClick={() => {
                        const action = getNextStatusAction(selectedOrder.status)
                        handleQuickStatusChange(selectedOrder.id, action.next)
                      }}
                      className="bg-gradient-ozo text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-ozo hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto"
                    >
                      Advance to {getNextStatusAction(selectedOrder.status).label}
                    </button>
                  )}
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="bg-gray-800 text-white dark:bg-white dark:text-gray-900 px-5 py-2.5 rounded-xl font-black text-xs w-full sm:w-auto hover:opacity-90 active:scale-95 transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>

              {/* Inline Cancellation prompt overlay */}
              {showCancelPrompt && (
                <div className="p-6 bg-red-50/95 dark:bg-[#201010]/95 border-t border-red-100 dark:border-red-900/30">
                  <form onSubmit={handleCancelOrderSubmit} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-red-800 dark:text-red-400 text-sm">Cancel Order Confirmation</h4>
                      <button
                        type="button"
                        onClick={() => setShowCancelPrompt(false)}
                        className="text-red-500 hover:text-red-700 font-bold text-xs"
                      >
                        Dismiss
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-red-700 dark:text-red-300 mb-1.5">Select Cancellation Reason</label>
                        <select
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          className="w-full pl-3 pr-10 py-2.5 bg-white dark:bg-[#1a1a1a] border border-red-200 dark:border-red-900/40 rounded-xl text-xs font-bold text-gray-800 dark:text-white focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/15 cursor-pointer appearance-none bg-no-repeat bg-[right_12px_center] bg-[size:14px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23ef4444%22%20stroke-width%3D%222.5%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]"
                        >
                          <option value="Customer requested cancellation" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Customer requested cancellation</option>
                          <option value="Out of stock / Unavailable" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Out of stock / Unavailable</option>
                          <option value="Rider not available" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Rider not available</option>
                          <option value="Outside delivery zone" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Outside delivery zone</option>
                          <option value="Test order / Mistake" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Test order / Mistake</option>
                          <option value="Other / Store closure" className="bg-white dark:bg-[#1c1c24] text-gray-900 dark:text-white">Other / Store closure</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-red-700 dark:text-red-300 mb-1.5">Custom Notes / Reason details</label>
                        <input
                          type="text"
                          placeholder="Provide details about why order is cancelled..."
                          value={cancelNote}
                          onChange={(e) => setCancelNote(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white dark:bg-[#1a1a1a] border border-red-200 dark:border-red-900/40 rounded-xl text-xs focus:outline-none text-gray-800 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCancelPrompt(false)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-gray-600 border border-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isCancelling}
                        className="px-5 py-2 rounded-xl text-xs font-extrabold bg-red-600 hover:bg-red-700 text-white shadow-sm disabled:opacity-50"
                      >
                        {isCancelling ? 'Processing...' : 'Confirm Cancellation'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Orders