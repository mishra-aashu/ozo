import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Building,
  Scale,
  UserCheck,
  Truck,
  CreditCard,
  XCircle,
  RefreshCw,
  Coins,
  ShieldAlert,
  BookOpen,
  Lock,
  AlertTriangle,
  FileText,
  UserX,
  Gavel,
  Calendar,
  Layers,
  Mail
} from 'lucide-react'
import SEO from '../components/SEO'

const TermsOfService = () => {
  const lastUpdated = 'January 2025'
  const [activeSection, setActiveSection] = useState('info')

  const tocItems = [
    { id: 'info', label: 'Company Info', icon: Building },
    { id: 'sec1', label: '1. Acceptance of Terms', icon: Scale },
    { id: 'sec2', label: '2. Eligibility & Account', icon: UserCheck },
    { id: 'sec3', label: '3. Services Offered', icon: Truck },
    { id: 'sec4', label: '4. Pricing & Payments', icon: CreditCard },
    { id: 'sec5', label: '5. Cancellation Policy', icon: XCircle },
    { id: 'sec6', label: '6. Refund & Return', icon: RefreshCw },
    { id: 'sec7', label: '7. COD Policy', icon: Coins },
    { id: 'sec8', label: '8. User Conduct', icon: ShieldAlert },
    { id: 'sec9', label: '9. Intellectual Property', icon: BookOpen },
    { id: 'sec10', label: '10. Privacy & Data', icon: Lock },
    { id: 'sec11', label: '11. Limitation of Liability', icon: AlertTriangle },
    { id: 'sec12', label: '12. Indemnification', icon: FileText },
    { id: 'sec13', label: '13. Account Suspension', icon: UserX },
    { id: 'sec14', label: '14. Dispute Resolution', icon: Gavel },
    { id: 'sec15', label: '15. Amendments', icon: Calendar },
    { id: 'sec16', label: '16. Miscellaneous', icon: Layers },
    { id: 'sec17', label: '17. Contact Us', icon: Mail }
  ]

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 250 // Offset for fixed header
      
      // Find the current active section
      for (let i = tocItems.length - 1; i >= 0; i--) {
        const item = tocItems[i]
        const el = document.getElementById(item.id)
        if (el) {
          const top = el.offsetTop
          if (scrollPosition >= top) {
            setActiveSection(item.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (el) {
      const offset = 100 // Sticky header height offset
      const bodyRect = document.body.getBoundingClientRect().top
      const elementRect = el.getBoundingClientRect().top
      const elementPosition = elementRect - bodyRect
      const offsetPosition = elementPosition - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
      setActiveSection(id)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300">
      <SEO
        title="Terms of Service | OZO Mart"
        description="Read OZO Mart's Terms of Service. Learn about our policies on orders, cancellations, refunds, user conduct, and legal terms for grocery delivery in Aurangabad and Patna, Bihar."
        keywords="OZO Mart terms, terms of service grocery, OZO delivery policy, refund policy, cancellation policy Bihar"
      />
      {/* Header */}
      <div className="bg-white dark:bg-[#0d0d0d] pt-24 pb-32 border-b border-gray-100 dark:border-white/5 relative overflow-hidden">
        <div className="container-custom relative z-10 text-center max-w-3xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 font-display"
          >
            Terms of <span className="text-gradient">Service.</span>
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
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 blur-3xl rounded-full -mr-32 -mt-32" />
      </div>

      <div className="container-custom -mt-16 relative z-20">
        {/* Horizontal Navigation for Mobile */}
        <div className="flex lg:hidden overflow-x-auto py-4 px-2 gap-2 scrollbar-hide border-b border-gray-100 dark:border-white/5 mb-8 bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-md sticky top-16 z-30">
          {tocItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSection === item.id
                  ? 'bg-ozo-green text-white shadow-md'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar TOC - Desktop Only */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
              <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm space-y-1">
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 mb-3">Sections</p>
                {tocItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all border-l-2 text-left ${
                      activeSection === item.id
                        ? 'border-ozo-green text-ozo-green bg-green-50/50 dark:bg-ozo-green/5'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <item.icon size={16} className={activeSection === item.id ? 'text-ozo-green' : 'text-gray-400'} />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-[#1a1a1a] p-8 md:p-12 rounded-[3rem] shadow-xl border border-gray-100 dark:border-white/5 space-y-12">
              
              {/* Intro Summary */}
              <div className="border-b border-gray-100 dark:border-white/5 pb-8">
                <p className="text-ozo-gray dark:text-gray-400 font-medium leading-relaxed text-lg">
                  Welcome to OZO Mart. Please read these Terms of Service carefully before using our website or mobile application operated by OZO Retail Private Limited.
                </p>
              </div>

              {/* Company Info section */}
              <section id="info" className="scroll-mt-24">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-2xl flex items-center justify-center">
                    <Building size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Company Information</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <h3 className="text-xs uppercase font-bold tracking-widest text-ozo-gray dark:text-gray-500 mb-4">
                      Legal & Registration
                    </h3>
                    <dl className="space-y-3 text-sm">
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400 font-medium">Legal Entity Name / Brand</dt>
                        <dd className="font-bold text-gray-900 dark:text-white">OZO Mart</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400 font-medium">Registration Status</dt>
                        <dd className="font-bold text-gray-900 dark:text-white">Operated under Proprietorship by Aashutosh Kumar Mishra</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400 font-medium">Website</dt>
                        <dd className="font-bold text-ozo-green hover:underline">
                          <a href="https://www.ozomart.store" target="_blank" rel="noopener noreferrer">www.ozomart.store</a>
                        </dd>
                      </div>
                    </dl>
                  </div>
                  
                  <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <h3 className="text-xs uppercase font-bold tracking-widest text-ozo-gray dark:text-gray-500 mb-4">
                      Addresses & Help Desk
                    </h3>
                    <dl className="space-y-3 text-sm">
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400 font-medium">Registered Office</dt>
                        <dd className="font-semibold text-gray-800 dark:text-gray-300">OZO HQ, Aurangabad, Bihar - 824101</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400 font-medium">Corporate Office</dt>
                        <dd className="font-semibold text-gray-800 dark:text-gray-300">OZO HQ, Aurangabad, Bihar - 824101</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400 font-medium">Emails & Support</dt>
                        <dd className="font-bold text-gray-900 dark:text-white space-y-1">
                          <span className="block">Email: <a href="mailto:aashutoshk625@gmail.com" className="text-ozo-green hover:underline">aashutoshk625@gmail.com</a></span>
                          <span className="block">Care: <a href="tel:+916206359094" className="text-ozo-green hover:underline">+91 6206359094 (10 AM - 10 PM, All Days)</a></span>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="p-6 bg-yellow-50/30 dark:bg-yellow-950/10 border border-yellow-100 dark:border-yellow-900/30 rounded-2xl mt-6">
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-xl bg-yellow-100/60 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400 flex-shrink-0">
                      <Gavel size={20} />
                    </div>
                    <div className="text-sm w-full">
                      <h4 className="font-black text-gray-900 dark:text-white uppercase mb-2">Grievance Redressal</h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-3 font-medium">
                        For escalations, contact our Grievance Officer in writing:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-gray-800 dark:text-gray-300">
                        <div>
                          <span className="block text-gray-400 mb-0.5">Name</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">Aashutosh Kumar Mishra</span>
                        </div>
                        <div>
                          <span className="block text-gray-400 mb-0.5">Email</span>
                          <span className="text-sm font-bold text-ozo-red"><a href="mailto:aashutoshk625@gmail.com" className="hover:underline">aashutoshk625@gmail.com</a></span>
                        </div>
                        <div>
                          <span className="block text-gray-400 mb-0.5">Contact</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">+91 6206359094</span>
                        </div>
                        <div>
                          <span className="block text-gray-400 mb-0.5">Working Hours & SLA</span>
                          <span className="text-sm text-gray-900 dark:text-white">Mon-Sat, 10 AM - 6 PM (TAT: 48 Hours)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 1. Acceptance of Terms */}
              <section id="sec1" className="scroll-mt-24 border-t border-gray-100 dark:border-white/5 pt-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-2xl flex items-center justify-center">
                    <Scale size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">1. Acceptance of Terms</h2>
                </div>
                <div className="text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed space-y-4">
                  <p>
                    By downloading, accessing, or using the OZO mobile application or website ("Platform"), you ("User", "Customer", "You") agree to be legally bound by these Terms of Service ("Terms"). If you do not agree, please discontinue use immediately.
                  </p>
                </div>
              </section>

              {/* 2. Eligibility and Account Registration */}
              <section id="sec2" className="scroll-mt-24 border-t border-gray-100 dark:border-white/5 pt-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-2xl flex items-center justify-center">
                    <UserCheck size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">2. Eligibility & Account Registration</h2>
                </div>
                <div className="text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">2.1 Age Requirement</h3>
                    <p>
                      You must be at least 18 years of age to create an account and place orders. Minors may use the Platform only under direct parental/guardian supervision.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">2.2 Account Security</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>You are responsible for maintaining confidentiality of your password, OTP, and account credentials.</li>
                      <li>All activity under your account is your responsibility.</li>
                      <li>Notify us immediately at <a href="mailto:aashutoshk625@gmail.com" className="text-ozo-green hover:underline">aashutoshk625@gmail.com</a> if you suspect unauthorized access.</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">2.3 Accurate Information</h3>
                    <p className="mb-3">
                      You must provide accurate, current, and complete information including:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Delivery address (with landmark)</li>
                      <li>Valid phone number</li>
                      <li>Correct payment details</li>
                    </ul>
                    <p className="mt-3 text-sm italic font-semibold text-ozo-red">
                      Providing fake/burner contact details or non-existent addresses may result in account suspension after verification.
                    </p>
                  </div>
                </div>
              </section>

              {/* 3. Services Offered */}
              <section id="sec3" className="scroll-mt-24 border-t border-gray-100 dark:border-white/5 pt-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-2xl flex items-center justify-center">
                    <Truck size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">3. Services Offered</h2>
                </div>
                <div className="text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">3.1 Nature of Service</h3>
                    <p>
                      OZO is a quick-commerce platform delivering groceries, fresh produce, dairy, daily essentials, and household items from local dark stores/warehouses.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">3.2 Delivery Timeline</h3>
                    <p className="mb-3">
                      We aim to deliver within <span className="font-bold text-ozo-green">10-15 minutes</span> of order confirmation.
                    </p>
                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 text-sm">
                      <p className="font-bold text-gray-900 dark:text-white mb-2">Disclaimer & Variance factors:</p>
                      <p className="mb-2">
                        This is an <span className="font-bold text-ozo-red">estimated timeline</span>, NOT a guaranteed service level agreement (SLA). Delivery times may vary due to:
                      </p>
                      <ul className="list-disc pl-6 space-y-1 text-xs">
                        <li>Traffic conditions</li>
                        <li>Weather (rain, storms, fog)</li>
                        <li>Distance from dark store</li>
                        <li>Peak demand hours</li>
                        <li>Force majeure events</li>
                        <li>Address accessibility issues</li>
                      </ul>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">3.3 Service Areas</h3>
                    <p>
                      We operate only in select pin codes. Serviceability is checked automatically at checkout.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">3.4 Product Availability</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Inventory is updated in real-time but not guaranteed until order confirmation.</li>
                      <li>We reserve the right to cancel items or entire orders if products go out of stock.</li>
                      <li>In case of partial unavailability, you will be notified via app/SMS, and charged only for delivered items.</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 4. Pricing, Payments & Charges */}
              <section id="sec4" className="scroll-mt-24 border-t border-gray-100 dark:border-white/5 pt-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-2xl flex items-center justify-center">
                    <CreditCard size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">4. Pricing, Payments & Charges</h2>
                </div>
                <div className="text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">4.1 Product Pricing</h3>
                    <p className="mb-2">
                      Prices are displayed on the product page at the time of browsing.
                    </p>
                    <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
                      * Prices for perishable items (fruits, vegetables, dairy) may change daily based on market rates.
                    </p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      Final price = Price at checkout, not browsing time.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">4.2 Additional Charges</h3>
                    <p className="mb-3">
                      The following may apply and will be shown in the bill breakdown before payment:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-sm">
                      <li><span className="font-bold text-gray-900 dark:text-white">Delivery Fee:</span> ₹0 - ₹50 (based on distance/order value)</li>
                      <li><span className="font-bold text-gray-900 dark:text-white">Platform Fee:</span> ₹2 - ₹5 per order</li>
                      <li><span className="font-bold text-gray-900 dark:text-white">Surge Fee:</span> ₹10 - ₹30 (during peak hours, rain, or late night 10 PM - 7 AM)</li>
                      <li><span className="font-bold text-gray-900 dark:text-white">Small Order Fee:</span> May apply for orders below ₹99</li>
                      <li><span className="font-bold text-gray-900 dark:text-white">Packaging Charges:</span> For certain fragile/premium items</li>
                      <li><span className="font-bold text-gray-900 dark:text-white">Mandatory Staples Delivery Fee:</span> For staple category items (oil, flour, pulses, grains), delivery charges apply when the order contains &le; 3 items, regardless of the subtotal or order value.</li>
                    </ul>
                    <p className="mt-3 text-xs text-gray-500">
                      All taxes (GST) are included in the displayed price unless specified otherwise.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">4.3 Payment Methods</h3>
                    <p className="mb-2">
                      We support multiple payment methods for your convenience:
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs font-bold my-3">
                      <span className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-gray-300 rounded-lg">UPI (Google Pay, PhonePe, Paytm, BHIM, etc.)</span>
                      <span className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-gray-300 rounded-lg">Credit/Debit Cards (Visa, MasterCard, RuPay, Amex)</span>
                      <span className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-gray-300 rounded-lg">Net Banking</span>
                      <span className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-gray-300 rounded-lg">Digital Wallets</span>
                      <span className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-gray-300 rounded-lg">Cash on Delivery (COD) - subject to availability</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">4.4 Payment Security</h3>
                    <p>
                      All digital payments are processed through PCI-DSS compliant payment gateways. We do not store your card/banking details.
                    </p>
                  </div>
                </div>
              </section>

              {/* 5. Order Cancellation Policy */}
              <section id="sec5" className="scroll-mt-24 border-t border-gray-100 dark:border-white/5 pt-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-2xl flex items-center justify-center">
                    <XCircle size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">5. Order Cancellation Policy</h2>
                </div>
                <div className="text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">5.1 Cancellation by Customer</h3>
                    <p className="mb-4">
                      The cancellation options and refund policies vary based on the order lifecycle status:
                    </p>

                    <div className="overflow-x-auto my-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                            <th className="p-4 text-sm font-bold text-gray-900 dark:text-white">Order Status</th>
                            <th className="p-4 text-sm font-bold text-gray-900 dark:text-white">Cancellation Allowed?</th>
                            <th className="p-4 text-sm font-bold text-gray-900 dark:text-white">Refund</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm text-ozo-gray dark:text-gray-400 font-medium">
                          <tr className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                            <td className="p-4 font-bold text-gray-900 dark:text-white">Order Placed (not yet assigned to rider)</td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400" /> Yes, free cancellation
                              </span>
                            </td>
                            <td className="p-4 text-gray-900 dark:text-white font-bold">100% refund</td>
                          </tr>
                          <tr className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                            <td className="p-4 font-bold text-gray-900 dark:text-white">Assigned to Delivery Partner (within 2 mins)</td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400" /> Yes
                              </span>
                            </td>
                            <td className="p-4 text-gray-900 dark:text-white font-bold">100% refund</td>
                          </tr>
                          <tr className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                            <td className="p-4 font-bold text-gray-900 dark:text-white">Being Packed (2-5 mins)</td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 dark:bg-yellow-400" /> Allowed, fee applies
                              </span>
                            </td>
                            <td className="p-4">Refund minus <span className="text-ozo-red font-bold">₹20</span> cancellation fee</td>
                          </tr>
                          <tr className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                            <td className="p-4 font-bold text-gray-900 dark:text-white">Out for Delivery</td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400" /> Not allowed
                              </span>
                            </td>
                            <td className="p-4 text-red-500 font-bold">No refund</td>
                          </tr>
                          <tr className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                            <td className="p-4 font-bold text-gray-900 dark:text-white">Delivered</td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400" /> No returns
                              </span>
                            </td>
                            <td className="p-4 text-xs font-bold">Except quality/damage reported with live photo within 15 mins</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-4">
                      Important: Once the order is out for delivery, cancellation is not possible. However, you may refuse delivery citing valid quality issues (see Section 7).
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">5.2 Cancellation by OZO</h3>
                    <p className="mb-2">
                      We may cancel your order in the following cases:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 mb-3">
                      <li>Product out of stock</li>
                      <li>Address unserviceable/incorrect</li>
                      <li>Payment failure or suspected fraud</li>
                      <li>Force majeure events</li>
                    </ul>
                    <p>
                      You will receive a <span className="font-bold text-ozo-green">full refund within 5-7 business days</span> (or instant reversal for UPI/Wallets where applicable).
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">5.3 Repeat Cancellations</h3>
                    <p>
                      Frequent cancellations (more than 3 in 7 days) after assignment may lead to temporary account restrictions to prevent system abuse.
                    </p>
                  </div>
                </div>
              </section>

              {/* 6. Refund & Return Policy */}
              <section id="sec6" className="scroll-mt-24 border-t border-gray-100 dark:border-white/5 pt-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-2xl flex items-center justify-center">
                    <RefreshCw size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">6. Refund & Return Policy</h2>
                </div>
                <div className="text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">6.1 Refund Eligibility</h3>
                    <p className="mb-4">
                      Due to strict hygiene and safety standards, items available on OZO Mart are generally classified as Non-Returnable. Once a delivery has been accepted, it cannot be returned or taken back. You are only eligible for a refund or replacement under the exceptions listed below:
                    </p>
                    <ul className="list-disc pl-6 mb-4 text-sm space-y-1">
                      <li><span className="font-bold text-gray-900 dark:text-white">Fresh & Perishable Goods</span> (milk, bread, butter, curd, fresh fruits, vegetables, frozen items): Discrepancies must be reported strictly <span className="font-bold text-red-500">within 15 minutes</span> of delivery to ensure proper food safety and refrigeration audits.</li>
                      <li><span className="font-bold text-gray-900 dark:text-white">Packaged & Sealed Goods</span> (packaged snacks, detergents, household cleaning items, beauty & personal care products): Discrepancies regarding damage, expiry, or manufacturing defects must be reported <span className="font-bold text-red-500">within 24 hours</span> of delivery (provided they are unused/unconsumed).</li>
                    </ul>

                    <div className="overflow-x-auto my-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                            <th className="p-4 text-sm font-bold text-gray-900 dark:text-white">Issue</th>
                            <th className="p-4 text-sm font-bold text-gray-900 dark:text-white">Action</th>
                            <th className="p-4 text-sm font-bold text-gray-900 dark:text-white">Proof Required</th>
                            <th className="p-4 text-sm font-bold text-gray-900 dark:text-white">Reporting Window</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm text-ozo-gray dark:text-gray-400 font-medium">
                          <tr className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                            <td className="p-4 font-bold text-gray-900 dark:text-white">Wrong item delivered</td>
                            <td className="p-4 text-ozo-green font-bold">Replacement or refund</td>
                            <td className="p-4 font-bold text-red-500">Live In-App Photo</td>
                            <td className="p-4 font-bold text-red-500">15 Mins (Perishable) / 24 Hours (Packaged)</td>
                          </tr>
                          <tr className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                            <td className="p-4 font-bold text-gray-900 dark:text-white">Missing item(s)</td>
                            <td className="p-4 text-ozo-green font-bold">Refund for missing item</td>
                            <td className="p-4 text-gray-400 dark:text-gray-600">—</td>
                            <td className="p-4 font-bold text-red-500">15 Mins (Perishable) / 24 Hours (Packaged)</td>
                          </tr>
                          <tr className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                            <td className="p-4 font-bold text-gray-900 dark:text-white">Damaged/rotten produce</td>
                            <td className="p-4 text-ozo-green font-bold">Replacement or refund</td>
                            <td className="p-4 font-bold text-red-500">Live In-App Photo</td>
                            <td className="p-4 font-bold text-red-500">Within 15 Mins</td>
                          </tr>
                          <tr className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                            <td className="p-4 font-bold text-gray-900 dark:text-white">Expired product delivered</td>
                            <td className="p-4 text-ozo-green font-bold">Full refund + replacement</td>
                            <td className="p-4 font-bold text-red-500">Live In-App Photo (Showing Expiry)</td>
                            <td className="p-4 font-bold text-red-500">15 Mins (Perishable) / 24 Hours (Packaged)</td>
                          </tr>
                          <tr className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                            <td className="p-4 font-bold text-gray-900 dark:text-white">Quantity mismatch</td>
                            <td className="p-4 text-ozo-green font-bold">Refund for difference</td>
                            <td className="p-4 font-bold text-red-500">Live In-App Photo</td>
                            <td className="p-4 font-bold text-red-500">15 Mins (Perishable) / 24 Hours (Packaged)</td>
                          </tr>
                          <tr className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                            <td className="p-4 font-bold text-gray-900 dark:text-white">Quality issue (spoilt/stale)</td>
                            <td className="p-4 text-ozo-green font-bold">Refund or replacement</td>
                            <td className="p-4 font-bold text-red-500">Live In-App Photo</td>
                            <td className="p-4 font-bold text-red-500">Within 15 Mins</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">6.2 How to Raise a Complaint</h3>
                    <p className="mb-3">
                      Please reach out to support through the following channels:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-sm">
                      <li><span className="font-bold text-gray-900 dark:text-white">In-App Chat / Support Section:</span> Open app &rarr; Go to "My Orders" &rarr; Select the order &rarr; Click "Help" or "Report Issue"</li>
                      <li><span className="font-bold text-gray-900 dark:text-white">Email:</span> <a href="mailto:aashutoshk625@gmail.com" className="text-ozo-green hover:underline">aashutoshk625@gmail.com</a> with Order ID and Live Photo proof</li>
                      <li><span className="font-bold text-gray-900 dark:text-white">Call:</span> <a href="tel:+916206359094" className="text-ozo-green hover:underline">+91 6206359094</a></li>
                    </ul>
                    <div className="mt-3 p-4 bg-red-50/50 dark:bg-red-950/15 border border-red-100 dark:border-red-900/30 rounded-xl text-xs font-bold text-red-650 dark:text-red-400 space-y-2">
                      <p>
                        Timeline to report: strictly within 15 minutes for perishables, and within 24 hours for packaged goods. Any requests raised after these thresholds will be rejected automatically.
                      </p>
                      <p className="font-semibold text-gray-500 dark:text-gray-400">
                        To maintain the highest standards of food safety and hygiene, OZO Mart operates a strict quality check loop. Since grocery items include fresh perishables (milk, vegetables, frozen goods) that require immediate refrigeration, any discrepancy in quality, expiry, or items must be logged within 15 minutes of delivery. For non-perishable packaged items, we allow up to 24 hours to report any damages or expirations.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">6.3 Live Photo Proof Requirement</h3>
                    <p className="mb-2">
                      To prevent fraud and abuse, you must provide a <strong>live photo</strong> taken directly through the OZO app's camera of the defective, damaged, or incorrect product.
                    </p>
                    <div className="p-4 bg-red-50 dark:bg-red-950/15 border border-red-100 dark:border-red-900/30 rounded-xl text-sm font-bold text-red-600 dark:text-red-400">
                      Gallery uploads or pre-saved photos are strictly prohibited and blocked by the application. Requests using non-live images will be rejected.
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">6.4 Refund Processing & Wallet Credit</h3>
                    <p className="mb-2">
                      Upon successful verification and proper investigation of the live photo, the refund or replacement will be credited to your OZO Wallet or original payment source (UPI, Card, Net Banking).
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-sm">
                      <li><span className="font-bold text-gray-900 dark:text-white">OZO Wallet:</span> Instant credit (within 10-15 minutes of approval)</li>
                      <li><span className="font-bold text-gray-900 dark:text-white">UPI / Wallets:</span> 1-3 business days</li>
                      <li><span className="font-bold text-gray-900 dark:text-white">Cards / Net Banking:</span> 5-7 business days</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">6.5 Non-Refundable / No Loophole Policy</h3>
                    <p className="mb-2">
                      To safeguard our platform against fraudulent claims, the following cases are strictly non-refundable and ineligible for return/replacement:
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-sm">
                      <li>Any complaints raised past the reporting window (15 minutes for fresh perishables, 24 hours for packaged goods).</li>
                      <li>Claims filed without a live photo taken through the OZO app camera.</li>
                      <li>Pre-saved images, gallery uploads, edited, cropped, or stock photos.</li>
                      <li>Any items consumed, cooked, partially eaten, or discarded prior to validation by OZO support.</li>
                      <li>Cases where the customer refuses to allow inspection or cannot present the physical item upon request.</li>
                      <li>Issues stemming from incorrect product storage (e.g., leaving frozen/dairy items in hot areas) after delivery.</li>
                      <li>Change of mind or subjective taste/preference differences.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">6.6 Branded/Packaged Products Disclaimer</h3>
                    <p>
                      For third-party branded products (biscuits, chips, soaps, etc.), manufacturing defects or health issues are the liability of the brand/manufacturer. OZO acts as a facilitator. However, we will assist in the return process as per our policy.
                    </p>
                  </div>
                </div>
              </section>

              {/* 7. Cash on Delivery (COD) Policy */}
              <section id="sec7" className="scroll-mt-24 border-t border-gray-100 dark:border-white/5 pt-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-2xl flex items-center justify-center">
                    <Coins size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">7. Cash on Delivery (COD) Policy</h2>
                </div>
                <div className="text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">7.1 COD Availability</h3>
                    <p>
                      COD is available for select users and pin codes at our discretion.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">7.2 Refusal of COD Orders</h3>
                    <p className="mb-2">
                      You may refuse a COD order at the time of delivery ONLY for valid quality issues (damaged, wrong, or expired items).
                    </p>
                    <p className="text-sm font-semibold text-ozo-red">
                      If you refuse delivery without valid reason more than 2 times in 30 days, COD option will be temporarily disabled for your account for 90 days.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">7.3 Keep Exact Change</h3>
                    <p>
                      Please keep exact change ready. Our delivery partners may not always carry change for large denominations.
                    </p>
                  </div>
                </div>
              </section>

              {/* 8. User Conduct & Prohibited Activities */}
              <section id="sec8" className="scroll-mt-24 border-t border-gray-100 dark:border-white/5 pt-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-2xl flex items-center justify-center">
                    <ShieldAlert size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">8. User Conduct & Prohibited Activities</h2>
                </div>
                <div className="text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">8.1 General Conduct</h3>
                    <p className="mb-2">
                      You agree NOT to:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>Use the Platform for any unlawful purpose.</li>
                      <li>Provide false, misleading, or fraudulent information.</li>
                      <li>Impersonate another person or entity.</li>
                      <li>Use automated bots, scripts, or scrapers to access the Platform.</li>
                      <li>Reverse-engineer, decompile, or hack the app/website.</li>
                      <li>Attempt to gain unauthorized access to our systems.</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">8.2 Coupon/Offer Abuse</h3>
                    <p className="mb-2">
                      Creating multiple accounts to exploit "first order" discounts, referral bonuses, or promo codes is strictly prohibited.
                    </p>
                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 text-sm font-semibold text-ozo-red">
                      If detected, we reserve the right to cancel the fraudulent orders, block the accounts, and blacklist the device ID and phone number.
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">8.3 Zero Tolerance for Delivery Partner Harassment</h3>
                    
                    <div className="p-6 rounded-[2rem] bg-red-50/50 dark:bg-red-950/10 border-2 border-red-100 dark:border-red-900/30">
                      <div className="flex gap-4 items-start">
                        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 flex-shrink-0">
                          <ShieldAlert size={20} />
                        </div>
                        <div className="text-sm">
                          <p className="font-bold text-red-700 dark:text-red-400 mb-3">
                            We have a strict zero-tolerance policy for abuse toward our delivery partners.
                          </p>
                          
                          <div className="space-y-2 mb-4 text-gray-700 dark:text-gray-300">
                            <p className="font-semibold text-gray-950 dark:text-white">Prohibited behavior includes:</p>
                            <ul className="list-disc pl-5 space-y-1">
                              <li>Verbal abuse, threats, or use of offensive language</li>
                              <li>Physical assault or intimidation</li>
                              <li>Sexual harassment</li>
                              <li>Discrimination based on caste, religion, gender, or appearance</li>
                              <li>Demanding delivery partners to perform tasks beyond delivery (e.g., "bring it to 5th floor without elevator")</li>
                            </ul>
                          </div>

                          <div className="bg-white/60 dark:bg-[#1a1a1a]/60 p-4 rounded-xl border border-red-200/50 dark:border-red-900/20 text-gray-800 dark:text-gray-200">
                            <p className="font-bold text-red-600 dark:text-red-400 mb-1">Consequences:</p>
                            <ul className="list-disc pl-5 space-y-1">
                              <li>Immediate and permanent account ban</li>
                              <li>Legal action, including police complaint under IPC sections 504, 506, 509 (as applicable)</li>
                              <li>Liability for damages</li>
                            </ul>
                            <p className="mt-3 font-semibold italic text-xs text-gray-500 dark:text-gray-400">
                              * Note: Our delivery partners wear body cameras in select locations for safety. Footage may be used as evidence.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 9. Intellectual Property */}
              <section id="sec9" className="scroll-mt-24 border-t border-gray-100 dark:border-white/5 pt-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-2xl flex items-center justify-center">
                    <BookOpen size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">9. Intellectual Property</h2>
                </div>
                <div className="text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed space-y-4">
                  <p>
                    All content on the Platform, including but not limited to logos, trademarks, text, graphics, software, and design, is the property of OZO Retail Private Limited and protected under Indian copyright and trademark laws.
                  </p>
                  <p className="font-semibold text-gray-950 dark:text-white">
                    You may not:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>Copy, reproduce, or distribute any content without written permission.</li>
                    <li>Use our brand name or logo for commercial purposes.</li>
                  </ul>
                </div>
              </section>

              {/* 10. Privacy & Data Protection */}
              <section id="sec10" className="scroll-mt-24 border-t border-gray-100 dark:border-white/5 pt-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-2xl flex items-center justify-center">
                    <Lock size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">10. Privacy & Data Protection</h2>
                </div>
                <div className="text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed space-y-4">
                  <p>
                    Your use of the Platform is also governed by our <a href="/privacy" className="text-ozo-green font-semibold hover:underline">Privacy Policy</a>, which explains how we collect, use, store, and protect your personal information in compliance with the Information Technology Act, 2000 and applicable data protection regulations.
                  </p>
                </div>
              </section>

              {/* 11. Limitation of Liability */}
              <section id="sec11" className="scroll-mt-24 border-t border-gray-100 dark:border-white/5 pt-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-2xl flex items-center justify-center">
                    <AlertTriangle size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">11. Limitation of Liability</h2>
                </div>
                <div className="text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">11.1 Service Availability</h3>
                    <p>
                      We strive for 99.9% uptime but do not guarantee uninterrupted or error-free service. The Platform may be temporarily unavailable due to maintenance, technical issues, or circumstances beyond our control.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">11.2 Indirect Damages</h3>
                    <p className="mb-2">
                      To the maximum extent permitted by law, OZO shall not be liable for:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>Indirect, incidental, or consequential damages.</li>
                      <li>Loss of profits, data, or business opportunities.</li>
                      <li>Damages arising from delayed delivery (beyond our estimated timeline).</li>
                      <li>Issues caused by third-party payment gateways or telecom providers.</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">11.3 Maximum Liability</h3>
                    <p>
                      Our total liability for any claim related to the Platform shall not exceed the amount you paid for the specific order in question.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">11.4 Force Majeure</h3>
                    <p className="mb-2">
                      We are not liable for failure to perform due to:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>Natural disasters (floods, earthquakes, pandemics).</li>
                      <li>Riots, strikes, or civil unrest.</li>
                      <li>Government restrictions or lockdowns.</li>
                      <li>Wars or acts of terrorism.</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 12. Indemnification */}
              <section id="sec12" className="scroll-mt-24 border-t border-gray-100 dark:border-white/5 pt-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-2xl flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">12. Indemnification</h2>
                </div>
                <div className="text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed space-y-4">
                  <p>
                    You agree to indemnify, defend, and hold harmless OZO Retail Private Limited, its directors, employees, partners, and affiliates from any claims, damages, losses, or expenses (including legal fees) arising from:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 text-sm">
                    <li>Your violation of these Terms.</li>
                    <li>Your misuse of the Platform.</li>
                    <li>Your violation of any third-party rights.</li>
                    <li>Fraudulent activity from your account.</li>
                  </ul>
                </div>
              </section>

              {/* 13. Account Suspension & Termination */}
              <section id="sec13" className="scroll-mt-24 border-t border-gray-100 dark:border-white/5 pt-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-2xl flex items-center justify-center">
                    <UserX size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">13. Account Suspension & Termination</h2>
                </div>
                <div className="text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">13.1 Termination by You</h3>
                    <p>
                      You may delete your account anytime via the app settings or by emailing <a href="mailto:aashutoshk625@gmail.com" className="text-ozo-green hover:underline">aashutoshk625@gmail.com</a>. Any pending refunds will be processed as per policy.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">13.2 Termination/Suspension by OZO</h3>
                    <p className="mb-3">
                      We reserve the right to suspend or permanently terminate your account, without prior notice, if:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm mb-3">
                      <li>You violate any provision of these Terms.</li>
                      <li>You engage in fraudulent or abusive behavior.</li>
                      <li>You have unpaid dues or chargebacks.</li>
                      <li>We suspect security risks or illegal activity.</li>
                    </ul>
                    <p className="text-sm">
                      You will be notified via email/SMS. You may appeal by contacting the Grievance Officer within 15 days.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">13.3 Effect of Termination</h3>
                    <p className="mb-2">
                      Upon termination:
                    </p>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                      <li>You lose access to the Platform.</li>
                      <li>Pending orders may be cancelled.</li>
                      <li>Refunds (if any) will be processed as per policy.</li>
                      <li>We may retain certain data as required by law.</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 14. Dispute Resolution */}
              <section id="sec14" className="scroll-mt-24 border-t border-gray-100 dark:border-white/5 pt-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-2xl flex items-center justify-center">
                    <Gavel size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">14. Dispute Resolution</h2>
                </div>
                <div className="text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">14.1 Grievance Redressal</h3>
                    <ol className="list-decimal pl-6 space-y-2 text-sm">
                      <li>Contact Customer Care: <a href="tel:+916206359094" className="text-ozo-green hover:underline">+91 6206359094</a> or <a href="mailto:aashutoshk625@gmail.com" className="text-ozo-green hover:underline">aashutoshk625@gmail.com</a></li>
                      <li>If unresolved, escalate to Grievance Officer: <a href="mailto:grievance@ozomart.store" className="text-ozo-red hover:underline">grievance@ozomart.store</a></li>
                      <li>Grievance Officer will respond within <span className="font-bold text-gray-950 dark:text-white">48 hours</span> and resolve within <span className="font-bold text-gray-950 dark:text-white">30 days</span>.</li>
                    </ol>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">14.2 Mediation</h3>
                    <p>
                      Before initiating legal proceedings, both parties agree to attempt resolution through good-faith mediation.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">14.3 Governing Law</h3>
                    <p>
                      These Terms are governed by the <span className="font-bold text-gray-950 dark:text-white">laws of India</span>.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">14.4 Jurisdiction</h3>
                    <p>
                      Any disputes shall be subject to the <span className="font-bold text-gray-950 dark:text-white">exclusive jurisdiction of courts in Aurangabad, Bihar</span>.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">14.5 Consumer Rights</h3>
                    <p>
                      Nothing in these Terms limits your statutory rights under the <span className="font-bold text-gray-950 dark:text-white">Consumer Protection Act, 2019</span> or other applicable consumer laws.
                    </p>
                  </div>
                </div>
              </section>

              {/* 15. Amendments to Terms */}
              <section id="sec15" className="scroll-mt-24 border-t border-gray-100 dark:border-white/5 pt-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-2xl flex items-center justify-center">
                    <Calendar size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">15. Amendments to Terms</h2>
                </div>
                <div className="text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed space-y-4">
                  <p>
                    We may update these Terms from time to time. Changes will be notified via:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-sm">
                    <li>In-app notification</li>
                    <li>Email to registered users</li>
                    <li>Update on website</li>
                  </ul>
                  <p className="font-bold text-gray-950 dark:text-white">
                    Continued use of the Platform after changes constitutes acceptance.
                  </p>
                  <p className="text-sm">
                    Material changes will have a 15-day notice period. Version History: Available at <span className="text-ozo-green font-semibold">www.ozomart.store/terms-history</span>
                  </p>
                </div>
              </section>

              {/* 16. Miscellaneous */}
              <section id="sec16" className="scroll-mt-24 border-t border-gray-100 dark:border-white/5 pt-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-2xl flex items-center justify-center">
                    <Layers size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">16. Miscellaneous</h2>
                </div>
                <div className="text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">16.1 Severability</h3>
                    <p>
                      If any provision is found invalid or unenforceable, the remaining provisions remain in full effect.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">16.2 Waiver</h3>
                    <p>
                      Failure to enforce any right or provision does not constitute a waiver of that right.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">16.3 Assignment</h3>
                    <p>
                      You may not transfer or assign your rights under these Terms. We may assign our rights to any successor or affiliate.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">16.4 Entire Agreement</h3>
                    <p>
                      These Terms, along with our Privacy Policy and other policies, constitute the entire agreement between you and OZO.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-950 dark:text-white mb-2">16.5 Language</h3>
                    <p>
                      In case of conflict between English and any translated version, the English version prevails.
                    </p>
                  </div>
                </div>
              </section>

              {/* 17. Contact Us */}
              <section id="sec17" className="scroll-mt-24 border-t border-gray-100 dark:border-white/5 pt-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 text-ozo-green rounded-2xl flex items-center justify-center">
                    <Mail size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">17. Contact Us</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-6">
                  <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider text-xs">For Support</h4>
                    <ul className="space-y-2 text-sm font-semibold text-gray-800 dark:text-gray-300">
                      <li>📧 Email: <a href="mailto:aashutoshk625@gmail.com" className="text-ozo-green hover:underline">aashutoshk625@gmail.com</a></li>
                      <li>📞 Phone: <a href="tel:+916206359094" className="text-ozo-green hover:underline">+91 6206359094</a></li>
                      <li>🕒 Hours: 10 AM - 10 PM, All Days</li>
                    </ul>
                  </div>

                  <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider text-xs">For Grievances</h4>
                    <ul className="space-y-2 text-sm font-semibold text-gray-800 dark:text-gray-300">
                      <li>📧 Email: <a href="mailto:aashutoshk625@gmail.com" className="text-ozo-red hover:underline">aashutoshk625@gmail.com</a></li>
                      <li>👤 Grievance Officer: <span className="font-bold text-gray-900 dark:text-white">Aashutosh Kumar Mishra</span></li>
                      <li>📞 Phone: <a href="tel:+916206359094" className="text-ozo-green hover:underline">+91 6206359094</a></li>
                    </ul>
                  </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 text-center mt-6">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-wider text-xs">Registered Office</h4>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-400">
                    OZO Retail Private Limited,<br />
                    Aurangabad, Bihar - 824101
                  </p>
                </div>

                <div className="p-8 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/5 mt-10">
                  <p className="text-sm font-bold text-gray-950 dark:text-white text-center">
                    By using OZO, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
                  </p>
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TermsOfService
