import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wrench, Zap, Snowflake, Hammer, Sparkles, Paintbrush, Bug, Search, ArrowRight, ShieldCheck } from 'lucide-react'

const SERVICE_CATEGORIES_LIST = [
  {
    id: 'plumbing',
    title: 'Plumbing Services',
    slug: 'plumbing',
    icon: Wrench,
    badge: 'Popular',
    color: 'from-blue-500 to-cyan-600',
    desc: 'Tap repair, pipe leaks, bathroom fitting & drainage clearing',
    subservices: ['Tap Leakage Repair', 'Flush Tank & Toilet Fix', 'Pipe Blockage Clearing', 'Basin & Sink Fitting'],
    priceStarting: 199,
  },
  {
    id: 'electrician',
    title: 'Electrician Services',
    slug: 'electrician',
    icon: Zap,
    badge: '60 Min Arrival',
    color: 'from-amber-500 to-yellow-600',
    desc: 'Switchboards, wiring, fan & light installation, MCB trip fix',
    subservices: ['Switch & Socket Repair', 'Ceiling Fan Installation', 'MCB & Main Wiring Fix', 'Light & Chandelier Fitting'],
    priceStarting: 149,
  },
  {
    id: 'ac-appliance',
    title: 'AC & Appliance Repair',
    slug: 'ac-appliance',
    icon: Snowflake,
    badge: 'Summer Offer',
    color: 'from-sky-500 to-blue-700',
    desc: 'AC foam servicing, gas charging, washing machine & fridge repair',
    subservices: ['AC Foam Jet Deep Service', 'AC Gas Refill & Leak Weld', 'Washing Machine Repair', 'Refrigerator Checkup'],
    priceStarting: 299,
  },
  {
    id: 'carpentry',
    title: 'Carpentry & Furniture',
    slug: 'carpentry',
    icon: Hammer,
    color: 'from-amber-700 to-orange-800',
    desc: 'Door lock replacement, furniture assembly & wooden repairs',
    subservices: ['Door Lock Fitting', 'Bed & Table Repair', 'Modular Furniture Assembly', 'Hinges & Handle Replacement'],
    priceStarting: 249,
  },
  {
    id: 'home-cleaning',
    title: 'Deep Home Cleaning',
    slug: 'home-cleaning',
    icon: Sparkles,
    badge: 'Top Rated',
    color: 'from-emerald-500 to-teal-600',
    desc: 'Bathroom, kitchen, sofa & full home deep sanitization',
    subservices: ['Bathroom Deep Clean', 'Kitchen Degreasing', 'Sofa & Carpet Shampooing', 'Full Home Sanitization'],
    priceStarting: 499,
  },
  {
    id: 'painting',
    title: 'Painting & Damp Proofing',
    slug: 'painting',
    icon: Paintbrush,
    color: 'from-purple-500 to-pink-600',
    desc: 'Wall touchup, damp proofing & complete interior/exterior paint',
    subservices: ['Wall Touchup & Repair', 'Damp Leakage Proofing', 'Interior Full Paint', 'Exterior Weather Proof'],
    priceStarting: 999,
  },
  {
    id: 'pest-control',
    title: 'Pest Control',
    slug: 'pest-control',
    icon: Bug,
    color: 'from-rose-500 to-red-600',
    desc: 'Termite, cockroach, mosquito & bedbug chemical treatment',
    subservices: ['Cockroach & Ant Control', 'Termite Treatment', 'Bedbug Eradication', 'Mosquito Control'],
    priceStarting: 399,
  },
]

export default function ServiceCategories() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const filteredCategories = SERVICE_CATEGORIES_LIST.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.desc.toLowerCase().includes(search.toLowerCase()) ||
      c.subservices.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] py-8 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-black rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden text-left">
          <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-black uppercase px-3 py-1 rounded-full tracking-wider">
            OZO Doorstep Catalog
          </span>
          <h1 className="text-2xl sm:text-4xl font-black mt-3">All Service Categories</h1>
          <p className="text-xs sm:text-sm text-gray-300 mt-1">
            Choose a service category to view certified technicians and instant pricing
          </p>

          {/* Search bar */}
          <div className="mt-6 relative max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search 'plumbing', 'AC service', 'electrician'..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-sm font-bold text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCategories.map((cat) => {
            const IconComp = cat.icon
            return (
              <div
                key={cat.id}
                onClick={() => navigate(`/services/category/${cat.slug}`)}
                className="group bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 text-left flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${cat.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                      <IconComp size={24} />
                    </div>

                    {cat.badge && (
                      <span className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full">
                        {cat.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-black text-gray-900 dark:text-white group-hover:text-sky-500 transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{cat.desc}</p>

                  {/* Subservices Pill tags */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {cat.subservices.map((sub) => (
                      <span
                        key={sub}
                        className="text-[10px] font-bold bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-lg"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">
                    Starts at <strong className="text-sm font-black text-gray-900 dark:text-white">₹{cat.priceStarting}</strong>
                  </span>

                  <span className="text-xs font-bold text-sky-500 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    View Services <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
