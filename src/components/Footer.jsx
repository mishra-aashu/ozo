import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import OzoLogo from './OzoLogo'
import { 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Instagram, 
  ArrowRight,
  ShieldCheck,
  Truck,
  Zap,
  Lock,
  Headphones,
  Award,
  ChevronRight,
  CreditCard
} from 'lucide-react'
import { useCartStore } from '../stores/cartStore'
import { useServiceModeStore } from '../stores/serviceModeStore'
import { useProductStore } from '../stores/productStore'
import { useLocationStore } from '../stores/locationStore'
import toast from 'react-hot-toast'

const Footer = () => {
  const currentYear = new Date().getFullYear()
  const deliveryConfig = useCartStore(state => state.deliveryConfig)
  const freeAbove = deliveryConfig?.free_above ?? 99
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const currentMode = useServiceModeStore(state => state.currentMode)
  const servicesConfig = useCartStore(state => state.servicesConfig)
  const isServicesEnabled = servicesConfig?.enabled !== false && servicesConfig?.show_in_app !== false
  const isServices = isServicesEnabled && currentMode === 'services'

  const categories = useProductStore(state => state.categories)
  const fetchCategories = useProductStore(state => state.fetchCategories)
  const activeCities = useLocationStore(state => state.activeCities)
  const fetchActiveCities = useLocationStore(state => state.fetchActiveCities)
  const selectedCitySlug = useLocationStore(state => state.selectedCitySlug)

  useEffect(() => {
    if (!categories || categories.length === 0) {
      fetchCategories().catch(() => {})
    }
    if (!activeCities || activeCities.length === 0) {
      fetchActiveCities().catch(() => {})
    }
  }, [categories, activeCities, fetchCategories, fetchActiveCities])

  const popularCategories = useMemo(() => {
    if (!categories || categories.length === 0) {
      return [
        { name: 'Fruits & Vegetables', slug: 'fruits-vegetables' },
        { name: 'Dairy & Breakfast', slug: 'dairy-breakfast' },
        { name: 'Cold Drinks & Juices', slug: 'cold-drinks-juices' },
        { name: 'Snacks & Munchies', slug: 'snacks-munchies' },
        { name: 'Instant Food', slug: 'instant-food' },
        { name: 'Mithila Specials', slug: 'mithila-specials' },
      ]
    }
    return categories
      .filter(c => !c.parent_id)
      .slice(0, 6)
      .map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug
      }))
  }, [categories])

  const displayCities = useMemo(() => {
    if (activeCities && activeCities.length > 0) {
      return activeCities.filter(c => c.is_active !== false)
    }
    return [
      { id: '1', name: 'Bhagalpur', slug: 'bhagalpur' },
      { id: '2', name: 'Aurangabad', slug: 'aurangabad' },
      { id: '3', name: 'Patna', slug: 'patna' },
      { id: '4', name: 'Gaya', slug: 'gaya' },
      { id: '5', name: 'Darbhanga', slug: 'darbhanga' }
    ]
  }, [activeCities])

  const handleSubscribe = (e) => {
    e.preventDefault()
    if (!newsletterEmail.trim()) {
      toast.error('Please enter your email address')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newsletterEmail)) {
      toast.error('Please enter a valid email address')
      return
    }
    toast.success(isServices ? 'Subscribed to OZO Services updates!' : 'Thank you for subscribing to OZO Mart updates!')
    setNewsletterEmail('')
  }

  const trustFeatures = isServices
    ? [
        {
          icon: ShieldCheck,
          colorClass: 'text-sky-500 bg-sky-50 dark:bg-sky-500/10',
          title: 'Verified Experts',
          desc: '100% Background checked mechanics & technicians'
        },
        {
          icon: Award,
          colorClass: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
          title: '30-Day Guarantee',
          desc: 'Quality warranty on all completed jobs'
        },
        {
          icon: Lock,
          colorClass: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
          title: 'Transparent Rates',
          desc: 'Standardized rate card & zero hidden charges'
        },
        {
          icon: Headphones,
          colorClass: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10',
          title: 'Dedicated Support',
          desc: 'Instant assistance for bookings & warranty claims'
        }
      ]
    : [
        {
          icon: Zap,
          colorClass: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
          title: '10-30 Min Delivery',
          desc: 'Dispatched from nearby neighborhood dark stores'
        },
        {
          icon: Award,
          colorClass: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
          title: 'Best Market Rates',
          desc: 'Direct farm-fresh produce & daily brand discounts'
        },
        {
          icon: Lock,
          colorClass: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
          title: '100% Safe Payments',
          desc: 'Encrypted UPI, Cards, NetBanking, Wallets & COD'
        },
        {
          icon: Truck,
          colorClass: 'text-ozo-red bg-red-50 dark:bg-red-500/10',
          title: freeAbove > 5000 ? 'Nominal Delivery' : 'Free Delivery',
          desc: freeAbove > 5000 ? `₹${deliveryConfig?.base_fee ?? 30} base charge` : `On orders over ₹${freeAbove}`
        }
      ]

  const footerLinks = isServices
    ? {
        company: [
          { label: 'About OZO Services', to: '/about' },
          { label: 'All Service Categories', to: '/services/categories' },
          { label: 'Become a Service Partner', to: '/profile' },
          { label: 'The Founder', to: '/developer' },
          { label: 'Careers & Hiring', to: '/careers' },
          { label: 'Press & Media', to: '/press' },
        ],
        support: [
          { label: 'Track My Bookings', to: '/services/my-bookings' },
          { label: 'Doorstep Guarantee', to: '/help' },
          { label: 'Help Center & FAQs', to: '/help' },
          { label: 'Contact Support', to: '/contact' },
        ],
        legal: [
          { label: 'Privacy Policy', to: '/privacy' },
          { label: 'Terms of Service', to: '/terms' },
          { label: 'Cookie Policy', to: '/cookies' },
          { label: 'Safety & Trust', to: '/shipping' },
        ]
      }
    : {
        company: [
          { label: 'About OZO', to: '/about' },
          { label: 'The Founder', to: '/developer' },
          { label: 'Careers & Hiring', to: '/careers' },
          { label: 'OZO Blog', to: '/blog' },
          { label: 'Press & Media', to: '/press' },
          { label: 'Offers & Coupons', to: '/offers' },
        ],
        ecosystem: [
          { label: 'OZO Mart (Quick Grocery)', to: '/' },
          { label: 'OZO Care (Health & OPD)', to: '/care' },
          { label: 'OZO Services (Home Experts)', to: '/services' },
          { label: 'Order Medicines (Pharmacy)', to: '/care/order-medicines' },
          { label: 'Doctor Workstation', to: '/doctor' },
          { label: 'Chemist Partner Portal', to: '/pharmacy' },
        ],
        support: [
          { label: 'Help Center & FAQs', to: '/help' },
          { label: 'Track Live Orders', to: '/orders' },
          { label: 'Returns & Refunds', to: '/refund-policy' },
          { label: 'Shipping & Delivery Policy', to: '/shipping' },
          { label: 'Contact Helpline', to: '/contact' },
        ],
        legal: [
          { label: 'Privacy Policy', to: '/privacy' },
          { label: 'Terms of Service', to: '/terms' },
          { label: 'Cookie Policy', to: '/cookies' },
          { label: 'Refund Policy', to: '/refund-policy' },
        ]
      }

  return (
    <footer className="bg-white dark:bg-[#0d0d0f] border-t border-gray-100 dark:border-white/5 pt-12 pb-24 md:pb-8 transition-colors duration-300">
      <div className="container-custom">
        
        {/* 1. Value Props Trust Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pb-12 mb-12 border-b border-gray-100 dark:border-white/5 text-left">
          {trustFeatures.map((feat, idx) => (
            <div 
              key={idx}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gray-50/70 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 transition-colors"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${feat.colorClass}`}>
                <feat.icon size={22} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white truncate">
                  {feat.title}
                </h4>
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {feat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 2. Main Navigation Links Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 mb-12 text-left">
          
          {/* Brand Info Column */}
          <div className="lg:col-span-4 space-y-5">
            <Link to={isServices ? "/services" : "/"} className="inline-flex items-center gap-2.5 group">
              <OzoLogo
                verticalMode={currentMode}
                size="md"
                subText={isServices ? "Verified Doorstep Experts" : "Jo Chahiye, Jab Chahiye"}
                subTextClassName="text-[10px] tracking-widest mt-1"
                imgClassName="group-hover:scale-105 transition-transform"
              />
            </Link>

            <p className="text-gray-600 dark:text-gray-400 font-medium text-xs leading-relaxed max-w-sm">
              {isServices 
                ? "India's trusted hyper-local doorstep service platform. Book verified electricians, plumbers, appliances and home repair specialists in minutes."
                : "Experience lightning-fast instant delivery. Fresh vegetables, daily groceries, dairy and authentic Mithila specials delivered to your doorstep in 10-30 minutes."
              }
            </p>

            {/* Direct Contact Badges */}
            <div className="space-y-2 pt-1">
              <a 
                href="tel:+917635071221" 
                className="flex items-center gap-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-ozo-red dark:hover:text-ozo-red transition-colors w-fit"
              >
                <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 text-ozo-red flex items-center justify-center shrink-0">
                  <Phone size={13} />
                </div>
                <span>+91 76350 71221</span>
                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/5">
                  Daily 6 AM - 11 PM
                </span>
              </a>

              <a 
                href="mailto:support@ozomart.store" 
                className="flex items-center gap-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:text-ozo-red dark:hover:text-ozo-red transition-colors w-fit"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Mail size={13} />
                </div>
                <span>support@ozomart.store</span>
              </a>

              <div className="flex items-center gap-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 pt-0.5">
                <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 flex items-center justify-center shrink-0">
                  <MapPin size={13} />
                </div>
                <span>Bihar, India • Rapidly Expanding Hubs</span>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center gap-2.5 pt-2">
              {[
                { 
                  icon: Facebook, 
                  bgClass: 'bg-[#1877F2]/10 text-[#1877F2]', 
                  hoverClass: 'hover:bg-[#1877F2] hover:text-white hover:shadow-[0_6px_20px_rgba(24,119,242,0.35)]',
                  href: 'https://www.facebook.com/ozomart.store',
                  label: 'Facebook'
                },
                { 
                  icon: Twitter, 
                  bgClass: 'bg-[#1DA1F2]/10 text-[#1DA1F2]', 
                  hoverClass: 'hover:bg-[#1DA1F2] hover:text-white hover:shadow-[0_6px_20px_rgba(29,161,242,0.35)]',
                  href: 'https://twitter.com/ozomart_store',
                  label: 'Twitter'
                },
                { 
                  icon: Instagram, 
                  bgClass: 'bg-[#E4405F]/10 text-[#E4405F]', 
                  hoverClass: 'hover:bg-gradient-to-tr hover:from-[#f9ce34] hover:via-[#ee2a7b] hover:to-[#6228d7] hover:text-white hover:shadow-[0_6px_20px_rgba(238,42,123,0.35)]',
                  href: 'https://www.instagram.com/ozomart.store',
                  label: 'Instagram'
                },
              ].map((social, i) => (
                <a 
                  key={i} 
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 ${social.bgClass} ${social.hoverClass}`}
                >
                  <social.icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Commerce Categories / Service Verticals */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-8 text-left">
            
            {/* Dynamic Categories Column */}
            <div>
              <h4 className="text-gray-900 dark:text-white font-black uppercase tracking-wider text-xs mb-4 flex items-center gap-1.5">
                <span>{isServices ? 'Services' : 'Categories'}</span>
              </h4>
              <ul className="space-y-2.5">
                {isServices ? (
                  footerLinks.company.map(link => (
                    <li key={link.label}>
                      <Link to={link.to} className="text-gray-600 dark:text-gray-400 hover:text-sky-500 dark:hover:text-sky-400 font-semibold text-xs transition-colors line-clamp-1">
                        {link.label}
                      </Link>
                    </li>
                  ))
                ) : (
                  <>
                    {popularCategories.map(cat => {
                      const linkUrl = selectedCitySlug ? `/${selectedCitySlug}/${cat.slug}` : `/category/${cat.slug}`
                      return (
                        <li key={cat.slug}>
                          <Link 
                            to={linkUrl} 
                            className="text-gray-600 dark:text-gray-400 hover:text-ozo-red dark:hover:text-white font-semibold text-xs transition-colors line-clamp-1 block"
                          >
                            {cat.name}
                          </Link>
                        </li>
                      )
                    })}
                    <li className="pt-1">
                      <Link 
                        to="/categories" 
                        className="text-ozo-red font-black text-xs inline-flex items-center gap-1 hover:underline"
                      >
                        <span>All Categories</span>
                        <ChevronRight size={13} />
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Ecosystem & Portals Column */}
            {!isServices && (
              <div>
                <h4 className="text-gray-900 dark:text-white font-black uppercase tracking-wider text-xs mb-4">
                  Ecosystem
                </h4>
                <ul className="space-y-2.5">
                  {footerLinks.ecosystem.map(link => (
                    <li key={link.label}>
                      <Link to={link.to} className="text-gray-600 dark:text-gray-400 hover:text-ozo-red dark:hover:text-white font-semibold text-xs transition-colors line-clamp-1 block">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Support & Help Column */}
            <div>
              <h4 className="text-gray-900 dark:text-white font-black uppercase tracking-wider text-xs mb-4">
                Support
              </h4>
              <ul className="space-y-2.5">
                {footerLinks.support.map(link => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-gray-600 dark:text-gray-400 hover:text-ozo-red dark:hover:text-white font-semibold text-xs transition-colors line-clamp-1 block">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter Subscription Column */}
            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-gray-900 dark:text-white font-black uppercase tracking-wider text-xs mb-4">
                Newsletter
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium leading-relaxed">
                {isServices 
                  ? 'Subscribe for expert home maintenance tips & exclusive service discounts.'
                  : 'Subscribe to get coupon codes, festival specials & weekly mandi discounts.'
                }
              </p>
              
              <form onSubmit={handleSubscribe} className="flex items-center bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl transition-all p-1 focus-within:ring-2 focus-within:ring-ozo-red/20 focus-within:border-ozo-red">
                <input 
                  type="email" 
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="flex-1 bg-transparent border-none pl-3 pr-2 py-2 text-xs font-bold text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-0"
                />
                <button 
                  type="submit" 
                  aria-label="Subscribe"
                  className="p-2 bg-gradient-ozo text-white rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
                >
                  <ArrowRight size={14} />
                </button>
              </form>

              {/* Secure Payment Modes */}
              <div className="pt-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5 flex items-center gap-1">
                  <CreditCard size={11} />
                  <span>Accepted Payments</span>
                </p>
                <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-black text-gray-500 dark:text-gray-400">
                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-white/5">UPI</span>
                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-white/5">RuPay</span>
                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-white/5">Visa</span>
                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-white/5">Mastercard</span>
                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-white/5">Net Banking</span>
                  <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-white/5">Cash on Delivery</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Dynamic Operating Cities Strip */}
        <div className="pt-6 pb-8 border-t border-gray-100 dark:border-white/5 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
              <MapPin size={13} className="text-ozo-red" />
              <span>Cities We Deliver To</span>
            </span>
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">
              Expanding rapidly across Tier 2 & Tier 3 hubs in Bihar
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {displayCities.map(city => (
              <Link
                key={city.id || city.slug}
                to={`/${city.slug}`}
                className={`text-xs font-bold px-3 py-1 rounded-lg border transition-all ${
                  selectedCitySlug === city.slug
                    ? 'bg-ozo-red text-white border-ozo-red shadow-xs'
                    : 'bg-gray-50/80 dark:bg-white/[0.03] text-gray-600 dark:text-gray-300 border-gray-200/80 dark:border-white/10 hover:border-ozo-red hover:text-ozo-red'
                }`}
              >
                {city.name}
              </Link>
            ))}
            <Link
              to="/select-location"
              className="text-xs font-black text-ozo-red dark:text-red-400 hover:underline px-2 py-1 flex items-center gap-1"
            >
              <span>Change City</span>
              <ChevronRight size={12} />
            </Link>
          </div>
        </div>

        {/* 4. Bottom Legal, Copyright & Badges */}
        <div className="pt-6 border-t border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-bold text-gray-500 dark:text-gray-400">
          <div className="flex flex-wrap items-center gap-2 text-left">
            <span>© {currentYear} <strong className="font-black text-gray-800 dark:text-white notranslate" translate="no">{isServices ? 'OZO Services Pvt. Ltd.' : 'OZO Mart Retail Pvt. Ltd.'}</strong></span>
            <span className="hidden sm:inline">•</span>
            <span className="text-[11px] font-normal text-gray-400">All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-[11px] font-black uppercase tracking-wider">
            {footerLinks.legal.map(link => (
              <Link 
                key={link.label} 
                to={link.to} 
                className="text-gray-500 dark:text-gray-400 hover:text-ozo-red dark:hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </footer>
  )
}

export default Footer
