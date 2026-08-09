import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Mail, 
  Phone, 
  MapPin, 
  MessageSquare, 
  Clock, 
  Globe,
  ArrowRight
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import SEO from '../components/SEO'

const Contact = () => {
  const navigate = useNavigate()
  const contactSchema = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "mainEntity": {
      "@type": "Organization",
      "name": "OZO Mart",
      "alternateName": ["OZO", "Ozo Mart", "OZO Delivery"],
      "url": "https://ozomart.store",
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+91-XXXXXXXXXX",
        "contactType": "customer service",
        "email": "aashutoshk625@gmail.com",
        "contactOption": "TollFree",
        "areaServed": "IN",
        "availableLanguage": ["English", "Hindi"]
      }
    }
  }), []);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    subject: 'Order Issue',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error('Please fill in all fields')
      return
    }
    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('contact_messages').insert({
        full_name: formData.fullName,
        email: formData.email,
        subject: formData.subject,
        message: formData.message
      })
      if (error) throw error
      toast.success('Your message has been sent successfully!')
      setFormData({
        fullName: '',
        email: '',
        subject: 'Order Issue',
        message: ''
      })
    } catch (err) {
      console.error('Error sending message:', err)
      toast.error(err.message || 'Failed to send message')
    } finally {
      setIsSubmitting(false)
    }
  }
  const contactMethods = [
    { 
      title: 'Email Us', 
      value: 'aashutoshk625@gmail.com', 
      desc: 'Get a response within 2 hours',
      icon: Mail, 
      color: 'text-blue-500', 
      bgColor: 'bg-blue-50 dark:bg-blue-500/10',
      action: () => window.location.href = 'mailto:aashutoshk625@gmail.com'
    },
    { 
      title: 'Call Us', 
      value: '+91 6206359094', 
      desc: 'Mon-Sun, 6 AM - 12 AM',
      icon: Phone, 
      color: 'text-ozo-green', 
      bgColor: 'bg-green-50 dark:bg-ozo-green/10',
      action: () => window.location.href = 'tel:+916206359094'
    },
    { 
      title: 'Live Chat', 
      value: 'Open App for Chat', 
      desc: 'Instant help from our team',
      icon: MessageSquare, 
      color: 'text-ozo-red', 
      bgColor: 'bg-red-50 dark:bg-ozo-red/10',
      action: () => navigate('/help?chat=open')
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300">
      <SEO 
        title="Contact Us | OZO Mart - 24/7 Customer Care Helpline"
        description="Contact OZO Mart customer support. Connect via live chat, call our customer care helpline, or send a message for quick assistance with orders, refunds, and partner enquiries."
        keywords="contact ozo mart, ozo customer care number, ozo support email, contact ozo delivery, Patna, Aurangabad"
        schema={contactSchema}
      />
      {/* Header */}
      <div className="bg-white dark:bg-[#0d0d0d] pt-24 pb-32 relative overflow-hidden border-b border-gray-100 dark:border-white/5">
        <div className="container-custom relative z-10 text-center max-w-3xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 font-display"
          >
            We're here to <span className="text-gradient">Help.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-ozo-gray dark:text-gray-400 font-medium"
          >
            Have a question or feedback? Our team is available 24/7 to ensure your experience is nothing short of perfect.
          </motion.p>
        </div>
      </div>

      <div className="container-custom -mt-16 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
           {contactMethods.map((method, i) => (
             <motion.div 
              key={method.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white dark:bg-[#1a1a1a] p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-white/5 group hover:border-ozo-red transition-all cursor-pointer select-none"
              onClick={method.action}
             >
                <div className={`w-14 h-14 ${method.bgColor} ${method.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                   <method.icon size={28} />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">{method.title}</h3>
                <p className="text-lg font-bold text-ozo-red mb-2">{method.value}</p>
                <p className="text-sm text-ozo-gray dark:text-gray-500 font-medium">{method.desc}</p>
             </motion.div>
           ))}
        </div>

        {/* Contact Form & Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
           <div className="bg-white dark:bg-[#1a1a1a] p-8 md:p-12 rounded-[3rem] shadow-sm border border-gray-100 dark:border-white/5">
              <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-8">
                Send us a <span className="text-gradient">Message.</span>
              </h2>
               <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label className="label">Full Name</label>
                        <input 
                           type="text" 
                           className="input" 
                           placeholder="Your name" 
                           value={formData.fullName}
                           onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                           required
                        />
                     </div>
                     <div>
                        <label className="label">Email Address</label>
                        <input 
                           type="email" 
                           className="input" 
                           placeholder="Your email" 
                           value={formData.email}
                           onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                           required
                        />
                     </div>
                  </div>
                  <div>
                     <label className="label">Subject</label>
                     <select 
                        className="input appearance-none bg-no-repeat bg-[right_1.5rem_center]"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                     >
                        <option>Order Issue</option>
                        <option>Payment Query</option>
                        <option>Feedback</option>
                        <option>Other</option>
                     </select>
                  </div>
                  <div>
                     <label className="label">Message</label>
                     <textarea 
                        className="input min-h-[150px] py-4" 
                        placeholder="How can we help you?"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                     ></textarea>
                  </div>
                  <button 
                     type="submit" 
                     disabled={isSubmitting}
                     className="btn btn-primary w-full py-5 text-lg shadow-ozo flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     {isSubmitting ? 'Sending...' : 'Send Message'}
                     <ArrowRight size={22} />
                  </button>
               </form>
           </div>

           <div className="space-y-12 py-8">
              <div>
                 <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-8">
                   Visit our <span className="text-gradient">Hubs.</span>
                 </h2>
                 <div className="space-y-8">
                    <div className="flex gap-6">
                       <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center flex-shrink-0 text-ozo-red">
                          <MapPin size={24} />
                       </div>
                       <div>
                          <h4 className="font-black text-gray-900 dark:text-white mb-2 uppercase tracking-widest text-xs">Corporate Office</h4>
                          <p className="text-lg text-ozo-gray dark:text-gray-400 font-medium">OZO HQ, <br />Aurangabad, Bihar - 824101</p>
                       </div>
                    </div>
                    <div className="flex gap-6">
                       <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center flex-shrink-0 text-ozo-green">
                          <Clock size={24} />
                       </div>
                       <div>
                          <h4 className="font-black text-gray-900 dark:text-white mb-2 uppercase tracking-widest text-xs">Business Hours</h4>
                          <p className="text-lg text-ozo-gray dark:text-gray-400 font-medium">Customer Support: 24/7 <br />Corporate: Mon-Fri, 9 AM - 6 PM</p>
                       </div>
                    </div>
                 </div>
              </div>
              
              <div className="p-8 bg-gradient-ozo rounded-[2.5rem] text-white">
                 <h4 className="text-xl font-black mb-4">Partner with us?</h4>
                 <p className="text-sm font-medium opacity-90 mb-6">Want to list your store on OZO Mart? Join our network of 5000+ happy partners.</p>
                 <button className="px-6 py-3 bg-white text-ozo-red rounded-xl font-black shadow-lg hover:scale-105 transition-transform">
                    Register your Store
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}

export default Contact
