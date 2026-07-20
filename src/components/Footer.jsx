import { useState } from 'react'
import { Link } from 'react-router-dom'
import OzoLogo from './OzoLogo'
import { 
  ShoppingCart, 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Instagram, 
  ArrowRight,
  ShieldCheck,
  Truck,
  Clock,
  Heart
} from 'lucide-react'
import { useCartStore } from '../stores/cartStore'
import toast from 'react-hot-toast'

const Footer = () => {
  const currentYear = new Date().getFullYear()
  const deliveryConfig = useCartStore(state => state.deliveryConfig)
  const freeAbove = deliveryConfig?.free_above ?? 99
  const [newsletterEmail, setNewsletterEmail] = useState('')

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
    toast.success('Thank you for subscribing to our newsletter!')
    setNewsletterEmail('')
  }

  const footerLinks = {
    company: [
      { label: 'About Us', to: '/about' },
      { label: 'The Founder', to: '/developer' },
      { label: 'Careers', to: '/careers' },
      { label: 'Blog', to: '/blog' },
      { label: 'Press', to: '/press' },
    ],
    support: [
      { label: 'Help Center', to: '/help' },
      { label: 'Contact Us', to: '/contact' },
      { label: 'Order Tracking', to: '/orders' },
      { label: 'Returns & Refunds', to: '/refund-policy' },
    ],
    legal: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
      { label: 'Cookie Policy', to: '/cookies' },
      { label: 'Shipping Policy', to: '/shipping' },
    ]
  }

  return (
    <footer className="bg-white dark:bg-[#0d0d0d] border-t border-gray-100 dark:border-white/5 pt-16 pb-28 md:pb-8 transition-colors duration-300">
      <div className="container-custom">
        {/* Top Section: Branding & Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16 text-left">
          <div className="lg:col-span-4 space-y-6">
            <Link to="/" className="flex items-center justify-start gap-2.5 group">
              <OzoLogo
                size="md"
                subText="Jo Chahiye, Jab Chahiye"
                subTextClassName="text-[10px] tracking-widest mt-1"
                imgClassName="group-hover:scale-110 transition-transform"
              />
            </Link>
            <p className="text-ozo-gray dark:text-gray-400 max-w-sm lg:mx-0 font-medium leading-relaxed">
              Experience the future of fresh delivery. Get fresh fruits, vegetables, and Mithila specials at your doorstep in 30 minutes. 
            </p>
            <div className="flex items-center justify-start gap-4">
              {[
                { 
                  icon: Facebook, 
                  bgClass: 'bg-[#1877F2]/10 text-[#1877F2]', 
                  hoverClass: 'hover:bg-[#1877F2] hover:text-white hover:shadow-[0_6px_20px_rgba(24,119,242,0.35)]',
                  href: 'https://www.facebook.com/ozomart.store'
                },
                { 
                  icon: Twitter, 
                  bgClass: 'bg-[#1DA1F2]/10 text-[#1DA1F2]', 
                  hoverClass: 'hover:bg-[#1DA1F2] hover:text-white hover:shadow-[0_6px_20px_rgba(29,161,242,0.35)]',
                  href: 'https://twitter.com/ozomart_store'
                },
                { 
                  icon: Instagram, 
                  bgClass: 'bg-[#E4405F]/10 text-[#E4405F]', 
                  hoverClass: 'hover:bg-gradient-to-tr hover:from-[#f9ce34] hover:via-[#ee2a7b] hover:to-[#6228d7] hover:text-white hover:shadow-[0_6px_20px_rgba(238,42,123,0.35)]',
                  href: 'https://www.instagram.com/ozomart.store'
                },
              ].map((social, i) => (
                <a 
                  key={i} 
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 ${social.bgClass} ${social.hoverClass}`}
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8 text-left">
            <div>
              <h4 className="text-gray-900 dark:text-white font-black uppercase tracking-widest text-xs mb-6">Company</h4>
              <ul className="space-y-4">
                {footerLinks.company.map(link => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-ozo-gray dark:text-gray-400 hover:text-ozo-red dark:hover:text-ozo-red font-semibold text-sm transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 dark:text-white font-black uppercase tracking-widest text-xs mb-6">Support</h4>
              <ul className="space-y-4">
                {footerLinks.support.map(link => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-ozo-gray dark:text-gray-400 hover:text-ozo-red dark:hover:text-ozo-red font-semibold text-sm transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1 text-left">
              <h4 className="text-gray-900 dark:text-white font-black uppercase tracking-widest text-xs mb-6">Newsletter</h4>
              <p className="text-xs text-ozo-gray dark:text-gray-400 mb-4 font-medium">Subscribe to get special offers and updates.</p>
              <form onSubmit={handleSubscribe} className="flex items-center bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl focus-within:ring-2 focus-within:ring-ozo-red/20 transition-all max-w-md p-1">
                <input 
                  type="email" 
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Your email"
                  className="flex-1 bg-transparent border-none pl-3 pr-2 py-2.5 focus:outline-none focus:ring-0 font-bold text-sm text-gray-800 dark:text-white placeholder:text-gray-400"
                />
                <button type="submit" className="p-2.5 bg-gradient-ozo text-white rounded-lg shadow-md hover:scale-105 active:scale-95 transition-all flex-shrink-0 flex items-center justify-center">
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Middle Section: App Download & Certs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-10 border-y border-gray-100 dark:border-white/5 mb-10 text-left">
          <div className="flex flex-wrap items-center justify-start gap-6 sm:gap-8">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-green-50 dark:bg-ozo-green/10 rounded-xl flex items-center justify-center text-ozo-green">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-ozo-gray dark:text-gray-500">100% Secure</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">Safe Payments</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-red-50 dark:bg-ozo-red/10 rounded-xl flex items-center justify-center text-ozo-red">
                <Truck size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-ozo-gray dark:text-gray-500">
                  {freeAbove > 5000 ? 'Delivery Fee' : 'Free Delivery'}
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {freeAbove > 5000 ? `₹${deliveryConfig?.base_fee ?? 30} base charge` : `Orders over ₹${freeAbove}`}
                </p>
              </div>
            </div>
          </div>
          {/* Hide App Store / Google Play buttons for now */}
          {/* <div className="flex items-center justify-center md:justify-end gap-4">
             <button className="h-10 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg flex items-center gap-2 hover:scale-105 transition-transform">
                <div className="text-left leading-none">
                  <p className="text-[8px] font-medium">Download on</p>
                  <p className="text-xs font-black">App Store</p>
                </div>
             </button>
             <button className="h-10 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg flex items-center gap-2 hover:scale-105 transition-transform">
                <div className="text-left leading-none">
                  <p className="text-[8px] font-medium">Get it on</p>
                  <p className="text-xs font-black">Google Play</p>
                </div>
             </button>
          </div> */}
        </div>

        {/* Bottom Section: Copyright & Legal */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <p className="text-xs text-ozo-gray dark:text-gray-500 font-bold text-left">
            © 2026 <span className="notranslate" translate="no">OZO Mart Retail Pvt. Ltd.</span> All rights reserved.
          </p>
          <div className="flex flex-wrap justify-start md:justify-end gap-6">
            {footerLinks.legal.slice(0, 3).map(link => (
              <Link key={link.label} to={link.to} className="text-[10px] uppercase tracking-widest font-black text-ozo-gray dark:text-gray-500 hover:text-ozo-red transition-colors">
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
