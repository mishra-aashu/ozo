import React, { useState, useEffect } from 'react'
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
  Calendar,
  Camera
} from 'lucide-react'
import SEO from '../../components/SEO'
import { useServicesStore } from '../../stores/servicesStore'
import CategoryIcon from '../../utils/serviceIcons'

export default function ServicesHome() {
  const navigate = useNavigate()
  const { categories, services, fetchCategories, fetchServices } = useServicesStore()

  useEffect(() => {
    fetchCategories()
    fetchServices()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f] pb-24 transition-colors">
      <SEO 
        title="OZO Doorstep Home Services - Plumber, Electrician, AC Repair"
        description="Book local home services near you. Verified plumbers, electricians, AC mechanics & home cleaning with 30-day service guarantee."
      />

      {/* Hero Header Section */}
      <div className="bg-gradient-to-b from-gray-900 via-[#0f1420] to-[#141824] text-white pt-5 pb-12 sm:pt-8 sm:pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container-custom mx-auto relative z-10 text-left">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <h1 className="text-lg sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-2 shrink-0">
              <span>Doorstep Services</span>
              <span className="text-[10px] sm:text-xs font-black text-sky-400 bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block">
                OZO Guaranteed
              </span>
            </h1>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
              <Link
                to="/services/inquiry"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-full text-xs font-extrabold transition-all shadow-sm hover:scale-105 active:scale-95 shrink-0"
              >
                <Camera size={14} />
                <span>Custom Inquiry</span>
              </Link>

              <Link
                to="/services/my-bookings"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition-all border border-white/10 shadow-sm hover:scale-105 active:scale-95 shrink-0"
              >
                <Calendar size={14} />
                <span>My Bookings</span>
              </Link>
            </div>
          </div>

          {/* Minimal 1-Line Trust Bar */}
          <div className="flex items-center gap-2.5 sm:gap-4 text-[11px] sm:text-xs text-gray-300 font-semibold overflow-x-auto no-scrollbar py-1">
            <span className="flex items-center gap-1 shrink-0 text-sky-200">
              <Zap size={13} className="text-amber-400" />
              <span>Visits in 30-45 Mins</span>
            </span>
            <span className="text-white/20 shrink-0">•</span>
            <span className="flex items-center gap-1 shrink-0 text-sky-200">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>30-Day Guarantee</span>
            </span>
            <span className="text-white/20 shrink-0">•</span>
            <span className="flex items-center gap-1 shrink-0 text-sky-200">
              <Star size={13} className="text-amber-300 fill-amber-300" />
              <span>4.8/5 Rated Experts</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Categories Section (Urban Company Style Grid) */}
      <div className="container-custom mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 lg:-mt-12 relative z-20">
        <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-5 sm:p-7 lg:p-8 shadow-2xl border border-gray-100 dark:border-white/5">
          <div className="flex items-center justify-between mb-5 lg:mb-6">
            <div className="text-left">
              <h2 className="text-base sm:text-xl lg:text-2xl font-black text-gray-900 dark:text-white">
                What service do you need?
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                Tap category to view verified technicians & rates
              </p>
            </div>
            
            <Link to="/services/categories" className="text-xs sm:text-sm font-extrabold text-sky-500 hover:text-sky-400 flex items-center gap-1 shrink-0 whitespace-nowrap">
              View All <ChevronRight size={16} />
            </Link>
          </div>

          {/* Service Categories Vertical Scroll List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {categories.filter(c => c.is_active !== false).map((cat) => {
              return (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/services/category/${cat.slug}`)}
                  className="group flex items-center gap-3.5 p-3.5 bg-white dark:bg-[#1a1a1a] hover:bg-sky-50/60 dark:hover:bg-white/10 border border-gray-200/80 dark:border-white/10 rounded-3xl transition-all duration-300 text-left hover:border-sky-500/40 shadow-sm hover:shadow-xl"
                >
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden shadow-md group-hover:scale-105 transition-transform duration-300 relative bg-gray-100 dark:bg-gray-800 border border-gray-200/80 dark:border-white/10 flex items-center justify-center shrink-0">
                    <CategoryIcon icon={cat.icon} slug={cat.slug} title={cat.title} className="w-full h-full object-cover rounded-2xl" />
                    {cat.badge && (
                      <span className="absolute -top-1 -right-1 bg-[#e23744] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-md border border-white dark:border-[#1a1a1a] z-10 whitespace-nowrap">
                        {cat.badge}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white leading-tight group-hover:text-sky-500 transition-colors truncate">
                      {cat.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-1">
                      Starting @ <span className="text-emerald-600 dark:text-emerald-400 font-black">₹{cat.priceStarting || 199}</span>
                    </p>
                  </div>

                  <ChevronRight size={18} className="text-gray-400 group-hover:text-sky-500 group-hover:translate-x-1 transition-all shrink-0 ml-auto" />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Promotional Offers & Deals Carousel / Cards */}
      <div className="container-custom mx-auto px-4 sm:px-6 lg:px-8 mt-8 lg:mt-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <div 
            onClick={() => navigate('/services/category/ac-appliance')}
            className="cursor-pointer bg-gradient-to-r from-sky-600 to-blue-700 rounded-2xl lg:rounded-3xl p-5 lg:p-6 text-white shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center justify-between text-left"
          >
            <div>
              <span className="bg-white/20 text-white text-[10px] lg:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Summer Special
              </span>
              <h3 className="text-base lg:text-lg font-extrabold mt-2">AC Foam Jet Service @ ₹499</h3>
              <p className="text-xs lg:text-sm text-sky-100 mt-0.5 font-medium">Deep coil cleaning with 2x cooling boost</p>
            </div>
            <Snowflake size={40} className="text-sky-200 flex-shrink-0 opacity-80 lg:w-12 lg:h-12" />
          </div>

          <div 
            onClick={() => navigate('/services/category/plumbing')}
            className="cursor-pointer bg-gradient-to-r from-amber-600 to-orange-700 rounded-2xl lg:rounded-3xl p-5 lg:p-6 text-white shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center justify-between text-left"
          >
            <div>
              <span className="bg-white/20 text-white text-[10px] lg:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Emergency 30 Mins
              </span>
              <h3 className="text-base lg:text-lg font-extrabold mt-2">Plumbing Leaks & Taps</h3>
              <p className="text-xs lg:text-sm text-amber-100 mt-0.5 font-medium">Mechanic visits within 30 minutes</p>
            </div>
            <Wrench size={40} className="text-amber-200 flex-shrink-0 opacity-80 lg:w-12 lg:h-12" />
          </div>

          <div 
            onClick={() => navigate('/services/category/home-cleaning')}
            className="cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl lg:rounded-3xl p-5 lg:p-6 text-white shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center justify-between text-left sm:col-span-2 lg:col-span-1"
          >
            <div>
              <span className="bg-white/20 text-white text-[10px] lg:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Flat 20% OFF
              </span>
              <h3 className="text-base lg:text-lg font-extrabold mt-2">Deep Bathroom Cleaning</h3>
              <p className="text-xs lg:text-sm text-emerald-100 mt-0.5 font-medium">Stain removal & full sanitization</p>
            </div>
            <Sparkles size={40} className="text-emerald-200 flex-shrink-0 opacity-80 lg:w-12 lg:h-12" />
          </div>
        </div>
      </div>

      {/* Bestseller & Popular Doorstep Visits */}
      <div className="container-custom mx-auto px-4 sm:px-6 lg:px-8 mt-10 lg:mt-16 text-left">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white">
              Most Booked Doorstep Services
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-0.5">
              Fixed rate card with background checked experts
            </p>
          </div>
          <Link to="/services/categories" className="text-xs sm:text-sm font-extrabold text-sky-500 hover:text-sky-400 flex items-center gap-1 shrink-0 whitespace-nowrap">
            See All <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {services.filter(s => s.is_active !== false).map((item) => (
            <div 
              key={item.id}
              className="bg-white dark:bg-[#1a1a1a] rounded-2xl lg:rounded-3xl p-4 lg:p-5 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-xl hover:border-sky-500/30 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] lg:text-xs font-extrabold uppercase tracking-wider text-sky-500 bg-sky-500/10 px-2.5 py-0.5 rounded-md">
                    {item.category || item.category_slug}
                  </span>
                  <span className="text-[10px] lg:text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md">
                    {item.tag || item.badge || 'Verified'}
                  </span>
                </div>

                <h3 className="text-sm lg:text-base font-extrabold text-gray-900 dark:text-white leading-snug group-hover:text-sky-500 transition-colors">
                  {item.title}
                </h3>

                <div className="flex items-center gap-2 mt-2.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star size={14} fill="currentColor" />
                    <span>{item.rating || 5.0}</span>
                  </div>
                  <span>•</span>
                  <span>{item.reviews_count || item.reviewsCount || 100}+ visits</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock size={13} /> {item.estimated_duration_mins || item.duration || 45} mins
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base lg:text-lg font-black text-gray-900 dark:text-white">₹{item.price}</span>
                    {item.original_price && (
                      <span className="text-xs font-semibold text-gray-400 line-through">₹{item.original_price}</span>
                    )}
                  </div>
                  <span className="text-[10px] lg:text-xs text-gray-400 font-medium">Fixed service charge</span>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/services/booking/${item.id}?name=${encodeURIComponent(item.title)}&price=${item.price}&category=${encodeURIComponent(item.category || item.category_slug)}`)}
                  className="px-4 py-2 lg:px-5 lg:py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-black text-xs lg:text-xs rounded-xl shadow-md transition-all hover:scale-105 active:scale-95"
                >
                  Book Visit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust & Guarantee Section */}
      <div className="container-custom mx-auto px-4 sm:px-6 lg:px-8 mt-12 lg:mt-16 text-left">
        <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 sm:p-8 lg:p-10 border border-gray-100 dark:border-white/5 shadow-sm">
          <h2 className="text-base sm:text-xl lg:text-2xl font-black text-gray-900 dark:text-white mb-6 lg:mb-8 text-center">
            The OZO Service Guarantee
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={24} className="lg:w-7 lg:h-7" />
              </div>
              <div>
                <h4 className="text-sm lg:text-base font-extrabold text-gray-900 dark:text-white">Verified Technicians</h4>
                <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium leading-relaxed">
                  Every technician undergoes background check & police verification.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={24} className="lg:w-7 lg:h-7" />
              </div>
              <div>
                <h4 className="text-sm lg:text-base font-extrabold text-gray-900 dark:text-white">30-Day Service Warranty</h4>
                <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium leading-relaxed">
                  If any issue recurs within 30 days, we fix it completely free.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
                <Tag size={24} className="lg:w-7 lg:h-7" />
              </div>
              <div>
                <h4 className="text-sm lg:text-base font-extrabold text-gray-900 dark:text-white">Transparent Rate Cards</h4>
                <p className="text-xs lg:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium leading-relaxed">
                  Upfront fixed prices before technician arrives. No surprise costs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Inquiry Photo Upload Banner */}
      <div className="container-custom mx-auto px-4 sm:px-6 lg:px-8 mt-8 lg:mt-12">
        <div className="bg-gradient-to-r from-sky-950 via-gray-900 to-slate-900 rounded-3xl p-6 sm:p-8 lg:p-10 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl border border-sky-500/20 text-left">
          <div className="text-center sm:text-left">
            <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-sky-400 bg-sky-500/15 px-3 py-1 rounded-full border border-sky-500/30">
              Doorstep Diagnostic & Inspection
            </span>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-black mt-2">Can't Find Your Service or Have a Photo?</h3>
            <p className="text-xs sm:text-sm text-gray-300 mt-1 font-medium">
              Upload photo of issue or describe your custom job. Expert technician visit at doorstep!
            </p>
          </div>
          <Link
            to="/services/inquiry"
            className="flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 flex-shrink-0"
          >
            <Camera size={18} />
            <span>Upload Photo & Inquire</span>
          </Link>
        </div>
      </div>

      {/* Emergency Helpline Banner */}
      <div className="container-custom mx-auto px-4 sm:px-6 lg:px-8 mt-8 lg:mt-12">
        <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-black rounded-3xl p-6 sm:p-8 lg:p-10 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl border border-white/10">
          <div className="text-center sm:text-left">
            <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
              Need Instant Help?
            </span>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-black mt-2">Emergency Pipe Leak or Power Breakdown?</h3>
            <p className="text-xs sm:text-sm text-gray-300 mt-1 font-medium">Our dispatch team immediately pairs you with nearest active expert.</p>
          </div>
          <a
            href="tel:+918000000000"
            className="flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 flex-shrink-0"
          >
            <Phone size={18} />
            <span>Call OZO Support</span>
          </a>
        </div>
      </div>
    </div>
  )
}
