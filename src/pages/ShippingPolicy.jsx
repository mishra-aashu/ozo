import { motion } from 'framer-motion'
import { Truck, MapPin, AlertCircle, Calendar } from 'lucide-react'
import { useCartStore } from '../stores/cartStore'
import SEO from '../components/SEO'

const ShippingPolicy = () => {
  const lastUpdated = 'May 28, 2026'
  const { deliveryConfig } = useCartStore()
  const freeAbove = deliveryConfig?.free_above ?? 99
  const baseFee = deliveryConfig?.base_fee ?? 30

  const sections = [
    {
      title: '30-Minute Delivery Guarantee',
      content: 'We source items directly from our local OZO Dark Stores scattered across prime residential zones. Because we store products locally and assign delivery partners within 30 seconds of order creation, we can guarantee delivery at your doorstep within 30 minutes of ordering.',
      icon: Truck
    },
    {
      title: 'Shipping Fees & Charges',
      content: freeAbove > 5000 
        ? `A nominal delivery fee of ₹${baseFee} applies to all orders. Please note that for staple category items (e.g., oil, flour, pulses, grains), delivery charges apply when the order contains ≤ 3 items, regardless of the order subtotal. During periods of heavy rain, high traffic demand, or late-night shifts, a minor surge fee may be dynamically appended.`
        : `Orders exceeding ₹${freeAbove} qualify for Free Delivery (except for staple category items like oil, flour, pulses, grains, where delivery charges apply when the order contains ≤ 3 items, regardless of the subtotal). For other orders below ₹${freeAbove}, a nominal delivery fee of ₹${baseFee} applies. During periods of heavy rain, high traffic demand, or late-night shifts, a minor surge fee may be dynamically appended.`,
      icon: AlertCircle
    },
    {
      title: 'Delivery Coverage Zones',
      content: 'We operate specifically in authorized zones. You can search or pin your exact location on our interactive home page to check if we service your area. If we don’t currently deliver to you, sign up to be notified when we expand.',
      icon: MapPin
    },
    {
      title: 'Hours of Operation',
      content: 'OZO delivery services are available during store operating hours (normally 7 AM – 10 PM, subject to partner store availability and local zone constraints), allowing you to get fresh food, fruits, vegetables, and regional specialties delivered in minutes.',
      icon: Calendar
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300">
      <SEO
        title="Shipping & Delivery Policy | OZO Mart"
        description="OZO Mart delivers groceries to your doorstep in 30 minutes. Learn about our delivery charges, free delivery threshold, coverage zones, and operating hours in Aurangabad and Patna."
        keywords="OZO Mart delivery, shipping policy, grocery delivery charges, free delivery Aurangabad, 30 minute delivery Bihar"
      />
      {/* Header */}
      <div className="bg-white dark:bg-[#0d0d0d] pt-24 pb-32 border-b border-gray-100 dark:border-white/5 relative overflow-hidden">
        <div className="container-custom relative z-10 text-center max-w-3xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 font-display"
          >
            Shipping <span className="text-gradient">Policy.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-ozo-gray dark:text-gray-400 font-medium"
          >
            Last Updated: {lastUpdated}
          </motion.p>
        </div>
        <div className="absolute top-0 left-0 w-64 h-64 bg-red-500/5 blur-3xl rounded-full -ml-32 -mt-32" />
      </div>

      <div className="container-custom -mt-16 relative z-20">
        <div className="max-w-4xl mx-auto space-y-8">
           <div className="bg-white dark:bg-[#1a1a1a] p-8 md:p-12 rounded-[3rem] shadow-xl border border-gray-100 dark:border-white/5 content-area">
              <p className="text-ozo-gray dark:text-gray-400 font-medium mb-12 leading-relaxed text-lg">
                OZO Mart delivers fresh produce, fruits, vegetables, and regional specialties directly to your doorstep in minutes. Learn more about how our shipping infrastructure functions.
              </p>

              <div className="space-y-12">
                 {sections.map((section, i) => (
                   <div key={i} className="group">
                      <div className="flex items-center gap-4 mb-6">
                         <div className="w-12 h-12 bg-red-50 dark:bg-ozo-red/10 text-ozo-red rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <section.icon size={24} />
                         </div>
                         <h2 className="text-2xl font-black text-gray-900 dark:text-white">{section.title}</h2>
                      </div>
                      <p className="text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed pl-0 md:pl-16">
                         {section.content}
                      </p>
                   </div>
                 ))}
              </div>

              <div className="mt-20 p-8 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/5">
                 <h3 className="text-xl font-black mb-4">Delivery Inquiry?</h3>
                 <p className="text-ozo-gray dark:text-gray-400 font-medium mb-6">If your order is delayed or you have any issues with delivery, connect with our support agents instantly using our in-app chat.</p>
                 <button className="text-ozo-red font-black uppercase tracking-widest text-xs hover:underline">Track Active Order</button>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}

export default ShippingPolicy
