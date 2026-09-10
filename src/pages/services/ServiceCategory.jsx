import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Clock, ShieldCheck, Check, Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const MOCK_SERVICES = {
  plumbing: [
    { id: 'p1', title: 'Tap Leakage & Replacement', desc: 'Repair leaky taps, wall mixers, flush tanks', price: 199, duration: 45, rating: 4.8 },
    { id: 'p2', title: 'Flush Tank & Toilet Repair', desc: 'Western/Indian toilet leak repair & flush tank fitting', price: 299, duration: 60, rating: 4.9 },
    { id: 'p3', title: 'Drainage & Pipe Blockage Clearing', desc: 'Sink, bathroom drain, and main line unblocking', price: 399, duration: 90, rating: 4.7 },
  ],
  electrician: [
    { id: 'e1', title: 'Switch & Socket Installation/Repair', desc: 'Fix spark issues, replace modular switches', price: 149, duration: 30, rating: 4.9 },
    { id: 'e2', title: 'Ceiling Fan Installation & Repair', desc: 'Fan mounting, regulator replacement, noise fix', price: 199, duration: 45, rating: 4.8 },
    { id: 'e3', title: 'MCB & Main Wiring Troubleshooting', desc: 'Short circuit fix, trip issues & fuse replacement', price: 349, duration: 60, rating: 4.9 },
  ],
  'ac-appliance': [
    { id: 'ac1', title: 'AC Foam Jet Deep Service', desc: 'Foam wash, indoor/outdoor unit deep clean, filter wash', price: 499, duration: 60, rating: 4.9 },
    { id: 'ac2', title: 'AC Gas Charging & Leak Repair', desc: 'Refrigerant refill & copper pipe leakage welding', price: 1499, duration: 90, rating: 4.8 },
    { id: 'ac3', title: 'Washing Machine Repair Checkup', desc: 'Drain issues, motor noise & PCB repair inspection', price: 299, duration: 45, rating: 4.7 },
  ],
}

export default function ServiceCategory() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchServices() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('services_catalog')
          .select('*, service_categories!inner(slug)')
          .eq('service_categories.slug', slug)

        if (!error && data && data.length > 0) {
          setServices(data)
        } else {
          // Fallback to mock catalog items if DB records not created yet
          setServices(MOCK_SERVICES[slug] || MOCK_SERVICES.plumbing)
        }
      } catch (err) {
        setServices(MOCK_SERVICES[slug] || MOCK_SERVICES.plumbing)
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [slug])

  const categoryName = slug ? slug.replace('-', ' ').toUpperCase() : 'SERVICES'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/services')}
          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to All Services</span>
        </button>

        <div className="bg-gradient-to-r from-sky-600 to-blue-700 rounded-3xl p-6 sm:p-8 text-white mb-8 shadow-lg">
          <span className="bg-white/20 text-xs font-black uppercase px-3 py-1 rounded-full tracking-wider">
            Verified Doorstep Catalog
          </span>
          <h1 className="text-3xl font-black mt-2 capitalize">{categoryName} Services</h1>
          <p className="text-xs sm:text-sm text-sky-100 mt-1">Book certified technicians near your location</p>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-32 bg-gray-200 dark:bg-white/5 rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {services.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-200 dark:border-white/10 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">{item.title}</h3>
                    {item.rating && (
                      <span className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
                        <Star size={12} fill="currentColor" /> {item.rating}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.desc || item.description}</p>

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> ~{item.estimated_duration_mins || item.duration || 45} mins
                    </span>
                    <span className="flex items-center gap-1 text-emerald-500">
                      <ShieldCheck size={14} /> 30-Day Warranty
                    </span>
                  </div>
                </div>

                <div className="flex items-center sm:flex-col items-end justify-between w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-0 border-gray-100 dark:border-white/5">
                  <div className="text-left sm:text-right">
                    <span className="text-xl font-black text-gray-900 dark:text-white">₹{item.price}</span>
                  </div>

                  <button
                    onClick={() => navigate(`/services/booking/${item.id}`, { state: { service: item } })}
                    className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-md transition-all hover:scale-105 active:scale-95"
                  >
                    Add Service
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
