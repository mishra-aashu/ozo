import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Wrench, 
  Zap, 
  Snowflake, 
  Hammer, 
  Sparkles, 
  Paintbrush, 
  Bug, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Star, 
  Phone,
  Search,
  ChevronRight,
  ArrowRight,
  Shield,
  ThumbsUp,
  Tag,
  Calendar
} from 'lucide-react'
import SEO from '../../components/SEO'

const SERVICE_CATEGORIES = [
  {
    id: 'plumbing',
    title: 'Plumbing',
    slug: 'plumbing',
    icon: Wrench,
    badge: 'Popular',
    desc: 'Tap repair, pipe leaks, bathroom fitting & drainage',
    color: 'from-blue-500 to-cyan-600',
    bgColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    priceStarting: 199,
  },
  {
    id: 'electrician',
    title: 'Electrician',
    slug: 'electrician',
    icon: Zap,
    badge: 'Urgent',
    desc: 'Switchboard repair, wiring, fan & light installation',
    color: 'from-amber-500 to-yellow-600',
    bgColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    priceStarting: 149,
  },
  {
    id: 'ac-appliance',
    title: 'AC Repair',
    slug: 'ac-appliance',
    icon: Snowflake,
    badge: 'Offer',
    desc: 'AC foam jet service, washing machine & fridge repair',
    color: 'from-sky-500 to-blue-700',
    bgColor: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    priceStarting: 299,
  },
  {
    id: 'carpentry',
    title: 'Carpentry',
    slug: 'carpentry',
    icon: Hammer,
    desc: 'Door locks, furniture assembly & wooden repairs',
    color: 'from-amber-700 to-orange-800',
    bgColor: 'bg-amber-700/10 text-amber-700 dark:text-amber-500',
    priceStarting: 249,
  },
  {
    id: 'home-cleaning',
    title: 'Cleaning',
    slug: 'home-cleaning',
    icon: Sparkles,
    badge: 'Top Rated',
    desc: 'Bathroom, kitchen, sofa & full home sanitization',
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    priceStarting: 499,
  },
  {
    id: 'painting',
    title: 'Painting',
    slug: 'painting',
    icon: Paintbrush,
    desc: 'Wall touchup, damp proofing & interior paint',
    color: 'from-purple-500 to-pink-600',
    bgColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    priceStarting: 999,
  },
  {
    id: 'pest-control',
    title: 'Pest Control',
    slug: 'pest-control',
    icon: Bug,
    desc: 'Termite, cockroach & mosquito treatment',
    color: 'from-rose-500 to-red-600',
    bgColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    priceStarting: 399,
  },
]

const POPULAR_SERVICES = [
  {
    id: 'tap-leakage-fix',
    title: 'Tap Repair & Leakage Fixing',
    category: 'Plumbing',
    slug: 'plumbing',
    rating: 4.8,
    reviewsCount: '1.4k',
    price: 199,
    originalPrice: 299,
    duration: '30 mins',
    tag: 'Bestseller',
    color: 'bg-blue-500'
  },
  {
    id: 'ac-foam-jet-service',
    title: 'Split AC Foam Jet Service',
    category: 'AC & Appliance',
    slug: 'ac-appliance',
    rating: 4.9,
    reviewsCount: '2.1k',
    price: 499,
    originalPrice: 799,
    duration: '60 mins',
    tag: '25% OFF',
    color: 'bg-sky-500'
  },
  {
    id: 'fan-light-installation',
    title: 'Ceiling Fan / Light Fitting',
    category: 'Electrician',
    slug: 'electrician',
    rating: 4.7,
    reviewsCount: '980',
    price: 149,
    originalPrice: 199,
    duration: '40 mins',
    tag: 'Quick Visit',
    color: 'bg-amber-500'
  },
  {
    id: 'bathroom-deep-cleaning',
    title: 'Bathroom Deep Cleaning & Sanitization',
    category: 'Deep Cleaning',
    slug: 'home-cleaning',
    rating: 4.9,
    reviewsCount: '3.4k',
    price: 399,
    originalPrice: 599,
    duration: '60 mins',
    tag: 'Top Rated',
    color: 'bg-emerald-500'
  },
  {
    id: 'door-lock-fitting',
    title: 'Door Lock Repair & Fitting',
    category: 'Carpentry',
    slug: 'carpentry',
    rating: 4.6,
    reviewsCount: '540',
    price: 249,
    originalPrice: 349,
    duration: '45 mins',
    tag: 'Doorstep',
    color: 'bg-amber-700'
  },
  {
    id: 'cockroach-control',
    title: 'Cockroach & Anti-Pest Treatment',
    category: 'Pest Control',
    slug: 'pest-control',
    rating: 4.8,
    reviewsCount: '1.1k',
    price: 499,
    originalPrice: 699,
    duration: '45 mins',
    tag: 'Safe Spray',
    color: 'bg-rose-500'
  }
]

export default function ServicesHome() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`)
    } else {
      navigate('/search')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f] pb-24 transition-colors">
      <SEO 
        title="OZO Doorstep Home Services - Plumber, Electrician, AC Repair"
        description="Book local home services near you. Verified plumbers, electricians, AC mechanics & home cleaning with 30-day service guarantee."
      />

      {/* Hero Header & Search Section */}
      <div className="bg-gradient-to-b from-gray-900 via-gray-900 to-[#141824] text-white pt-6 pb-10 px-4 sm:px-6 lg:px-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-80 h-80 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10 text-left">
          {/* Header Badge */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="inline-flex items-center gap-1.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 px-3 py-1 rounded-full text-[11px] font-black tracking-wide shrink-0 whitespace-nowrap">
              <Wrench size={13} className="animate-pulse" />
              <span>OZO SERVICES</span>
            </div>

            <Link
              to="/services/my-bookings"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition-all border border-white/10 shrink-0 whitespace-nowrap shadow-sm hover:scale-105 active:scale-95"
            >
              <Calendar size={13} />
              <span>My Bookings</span>
            </Link>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Local Doorstep Services, <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-400">
              Delivered in Minutes
            </span>
          </h1>

          <p className="mt-2 text-gray-300 text-xs sm:text-sm font-medium max-w-xl">
            Verified plumbers, electricians, AC mechanics & home repair experts at transparent pricing.
          </p>

          {/* Quick Search Input */}
          <form onSubmit={handleSearchSubmit} className="mt-5 max-w-2xl">
            <div className="relative flex items-center bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-sky-400 transition-all shadow-lg">
              <Search className="ml-3 text-gray-400 flex-shrink-0" size={18} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search plumber, electrician, AC repair, cleaning..."
                className="w-full bg-transparent border-none pl-3 pr-3 py-2 text-xs sm:text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-0 font-medium"
              />
              <button 
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-xl font-bold text-xs shadow-md transition-transform active:scale-95 flex-shrink-0"
              >
                Search
              </button>
            </div>
          </form>

          {/* Quick Tags */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar text-[11px] font-semibold text-gray-300">
            <span className="text-gray-400 flex-shrink-0">Popular:</span>
            {['Plumber', 'AC Jet Service', 'Electrician', 'Deep Cleaning', 'Door Locks'].map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)}
                className="px-2.5 py-0.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex-shrink-0 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Categories Section (Urban Company Style Grid) */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-20">
        <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-5 sm:p-6 shadow-xl border border-gray-100 dark:border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-left">
              <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                What service do you need?
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Tap category to view verified technicians & rates
              </p>
            </div>
            
            <Link to="/services/categories" className="text-xs font-bold text-sky-500 hover:text-sky-400 flex items-center gap-1 shrink-0 whitespace-nowrap">
              View All <ChevronRight size={14} />
            </Link>
          </div>

          {/* Icon Grid: 4 columns on mobile, 7 on desktop */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 sm:gap-4 text-center">
            {SERVICE_CATEGORIES.map((cat) => {
              const IconComp = cat.icon
              return (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/services/category/${cat.slug}`)}
                  className="group flex flex-col items-center justify-start p-1.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-200"
                >
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${cat.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200 relative`}>
                    <IconComp size={22} className="sm:w-6 sm:h-6" />
                    {cat.badge && (
                      <span className="absolute -top-1.5 -right-1.5 bg-[#e23744] text-white text-[7.5px] font-black px-1.5 py-0.5 rounded-full shadow-sm border border-white dark:border-[#1a1a1a] z-10 whitespace-nowrap">
                        {cat.badge}
                      </span>
                    )}
                  </div>
                  <span className="mt-2 text-[11px] sm:text-xs font-extrabold text-gray-800 dark:text-gray-200 leading-tight group-hover:text-sky-500 transition-colors text-center whitespace-nowrap sm:whitespace-normal">
                    {cat.title}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                    From ₹{cat.priceStarting}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Promotional Offers & Deals Carousel / Cards */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div 
            onClick={() => navigate('/services/category/ac-appliance')}
            className="cursor-pointer bg-gradient-to-r from-sky-600 to-blue-700 rounded-2xl p-4 text-white shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5 flex items-center justify-between text-left"
          >
            <div>
              <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                Summer Special
              </span>
              <h3 className="text-base font-extrabold mt-1.5">AC Foam Jet Service @ ₹499</h3>
              <p className="text-xs text-sky-100 mt-0.5 font-medium">Deep coil cleaning with 2x cooling boost</p>
            </div>
            <Snowflake size={36} className="text-sky-200 flex-shrink-0 opacity-80" />
          </div>

          <div 
            onClick={() => navigate('/services/category/plumbing')}
            className="cursor-pointer bg-gradient-to-r from-amber-600 to-orange-700 rounded-2xl p-4 text-white shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5 flex items-center justify-between text-left"
          >
            <div>
              <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                Emergency 30 Mins
              </span>
              <h3 className="text-base font-extrabold mt-1.5">Plumbing Leaks & Taps</h3>
              <p className="text-xs text-amber-100 mt-0.5 font-medium">Mechanic visits within 30 minutes</p>
            </div>
            <Wrench size={36} className="text-amber-200 flex-shrink-0 opacity-80" />
          </div>

          <div 
            onClick={() => navigate('/services/category/home-cleaning')}
            className="cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-4 text-white shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5 flex items-center justify-between text-left sm:col-span-2 lg:col-span-1"
          >
            <div>
              <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                Flat 20% OFF
              </span>
              <h3 className="text-base font-extrabold mt-1.5">Deep Bathroom Cleaning</h3>
              <p className="text-xs text-emerald-100 mt-0.5 font-medium">Stain removal & full sanitization</p>
            </div>
            <Sparkles size={36} className="text-emerald-200 flex-shrink-0 opacity-80" />
          </div>
        </div>
      </div>

      {/* Bestseller & Popular Doorstep Visits */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 text-left">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
              Most Booked Doorstep Services
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Fixed rate card with background checked experts
            </p>
          </div>
          <Link to="/services/categories" className="text-xs font-bold text-sky-500 hover:text-sky-400 flex items-center gap-1 shrink-0 whitespace-nowrap">
            See All <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {POPULAR_SERVICES.map((item) => (
            <div 
              key={item.id}
              className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-md">
                    {item.category}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    {item.tag}
                  </span>
                </div>

                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white leading-snug">
                  {item.title}
                </h3>

                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star size={13} fill="currentColor" />
                    <span>{item.rating}</span>
                  </div>
                  <span>•</span>
                  <span>{item.reviewsCount} bookings</span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    <Clock size={12} /> {item.duration}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-black text-gray-900 dark:text-white">₹{item.price}</span>
                    {item.originalPrice && (
                      <span className="text-xs font-semibold text-gray-400 line-through">₹{item.originalPrice}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">Fixed service charge</span>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/services/booking/${item.id}?name=${encodeURIComponent(item.title)}&price=${item.price}&category=${encodeURIComponent(item.category)}`)}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow transition-transform active:scale-95"
                >
                  Book Visit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust & Guarantee Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 text-left">
        <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-white/5 shadow-sm">
          <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white mb-6 text-center">
            The OZO Service Guarantee
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">Verified Technicians</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium leading-relaxed">
                  Every technician undergoes background check & police verification.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">30-Day Service Warranty</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium leading-relaxed">
                  If any issue recurs within 30 days, we fix it completely free.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
                <Tag size={20} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">Transparent Rate Cards</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium leading-relaxed">
                  Upfront fixed prices before technician arrives. No surprise costs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Helpline Banner */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-gradient-to-r from-gray-900 to-black rounded-3xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl border border-white/10">
          <div className="text-center sm:text-left">
            <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
              Need Instant Help?
            </span>
            <h3 className="text-lg font-black mt-2">Emergency Pipe Leak or Power Breakdown?</h3>
            <p className="text-xs text-gray-300 mt-1 font-medium">Our dispatch team immediately pairs you with nearest active expert.</p>
          </div>
          <a
            href="tel:+918000000000"
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs rounded-2xl shadow-lg transition-transform active:scale-95 flex-shrink-0"
          >
            <Phone size={16} />
            <span>Call OZO Support</span>
          </a>
        </div>
      </div>
    </div>
  )
}
