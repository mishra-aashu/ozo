import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Briefcase, MapPin, Clock, ArrowRight, Truck, Store } from 'lucide-react'
import SEO from '../components/SEO'

const Careers = () => {
  const navigate = useNavigate()
  const jobs = [
    {
      title: 'Senior Frontend Engineer (React)',
      department: 'Engineering',
      location: 'Bengaluru, India',
      type: 'Full-Time',
      description: 'Build premium, ultra-fast interfaces for OZO web & partner dashboards.'
    },
    {
      title: 'Dark Store Operations Manager',
      department: 'Operations',
      location: 'New Delhi, India',
      type: 'Full-Time',
      description: 'Supervise micro-fulfillment operations, inventory sorting, and packing speeds.'
    },
    {
      title: 'Product Designer (UI/UX)',
      department: 'Design',
      location: 'Remote (India)',
      type: 'Full-Time',
      description: 'Design intuitive buying flows and next-gen fresh food shopping experiences.'
    },
    {
      title: 'Delivery Executive Coordinator',
      department: 'Logistics',
      location: 'Mumbai, India',
      type: 'Full-Time',
      description: 'Coordinate delivery fleets, assign routes, and manage driver relations.'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300">
      <SEO
        title="Careers at OZO Mart | Join India's Fastest Grocery Delivery Team"
        description="Work at OZO Mart — India's 30-minute hyperlocal grocery delivery company. We are hiring engineers, operations managers, designers, and delivery executives."
        keywords="OZO careers, OZO jobs, grocery delivery jobs, quick commerce jobs India, Aurangabad jobs"
      />
      {/* Header */}
      <div className="bg-white dark:bg-[#0d0d0d] pt-24 pb-32 border-b border-gray-100 dark:border-white/5 relative overflow-hidden">
        <div className="container-custom relative z-10 text-center max-w-3xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 font-display"
          >
            Join the <span className="text-gradient">OZO Team.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-ozo-gray dark:text-gray-400 font-semibold"
          >
            We are redefining the fresh delivery experience. Join us on our mission to deliver within 30 minutes.
          </motion.p>
        </div>
        <div className="absolute top-0 left-0 w-64 h-64 bg-red-500/5 blur-3xl rounded-full -ml-32 -mt-32" />
      </div>

      <div className="container-custom -mt-16 relative z-20">
        {/* Partner Programs Section */}
        <div className="max-w-4xl mx-auto mb-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Rider Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden bg-white dark:bg-[#1a1a1a] p-8 rounded-[2.5rem] border border-gray-200 dark:border-white/5 shadow-xl group hover:border-blue-500/50 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/30 text-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                <Truck size={28} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
                Become a <span className="text-blue-500 dark:text-blue-400">Delivery Partner</span>
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium leading-relaxed">
                Join our fleet as a Delivery Captain. Earn competitive payouts, choose your own working hours, and enjoy comprehensive insurance coverage.
              </p>
              <ul className="space-y-2.5 mb-8 text-xs font-bold text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Earn up to ₹35,000 / month
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Weekly direct bank payouts
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Flexible shifts & part-time options
                </li>
              </ul>
            </div>
            <button 
              onClick={() => navigate('/captain')}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-blue-600/10"
            >
              Register as Rider
            </button>
          </motion.div>

          {/* Mart Partner Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden bg-white dark:bg-[#1a1a1a] p-8 rounded-[2.5rem] border border-gray-200 dark:border-white/5 shadow-xl group hover:border-ozo-red transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 bg-red-50 dark:bg-ozo-red/10 text-ozo-red rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                <Store size={28} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
                Become a <span className="text-gradient">Store Partner</span>
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium leading-relaxed">
                Launch your own OZO Mart dark store franchise. Partner with India's fastest-growing grocery delivery network and expand your business.
              </p>
              <ul className="space-y-2.5 mb-8 text-xs font-bold text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-ozo-red" /> High profit margins & supply support
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-ozo-red" /> Advanced inventory system access
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-ozo-red" /> Guaranteed orders & local marketing
                </li>
              </ul>
            </div>
            <button 
              onClick={() => navigate('/mart')}
              className="w-full py-4 bg-gradient-ozo hover:opacity-90 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-ozo-red/10"
            >
              Register as Mart Partner
            </button>
          </motion.div>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-white dark:bg-[#1a1a1a] p-8 md:p-12 rounded-[3rem] shadow-xl border border-gray-100 dark:border-white/5">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-8 uppercase tracking-tight">
              Open <span className="text-gradient">Positions.</span>
            </h2>
            
            <div className="space-y-6">
              {jobs.map((job, index) => (
                <div 
                  key={index} 
                  className="p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 hover:shadow-lg transition-all group flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                >
                  <div className="space-y-3">
                    <span className="px-3 py-1 bg-red-50 dark:bg-ozo-red/10 text-ozo-red rounded-full text-xs font-black uppercase tracking-widest">
                      {job.department}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-ozo-red transition-colors">
                      {job.title}
                    </h3>
                    <p className="text-sm text-ozo-gray dark:text-gray-400 max-w-xl font-medium">
                      {job.description}
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs font-bold text-ozo-gray dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {job.type}
                      </span>
                    </div>
                  </div>
                  <button className="self-end md:self-center px-5 py-3 bg-white dark:bg-[#111] hover:bg-gradient-ozo hover:text-white text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 rounded-xl flex items-center gap-2 font-black transition-all group-hover:scale-105">
                    Apply Now
                    <ArrowRight size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-16 text-center p-8 bg-gradient-ozo text-white rounded-[2rem] shadow-xl">
              <h3 className="text-2xl font-black mb-2">Don't see your role?</h3>
              <p className="font-semibold text-white/80 mb-6">We are always looking for smart, ambitious minds to join our teams. Send your resume directly to our inbox.</p>
              <a 
                href="mailto:careers@ozomart.store"
                className="inline-block px-8 py-4 bg-white text-ozo-red font-black uppercase tracking-widest text-xs rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
              >
                Send Open Application
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Careers
