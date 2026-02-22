import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { 
  Users, 
  Target, 
  Heart, 
  Zap, 
  ShoppingBag, 
  ShieldCheck, 
  Truck,
  MapPin,
  ChevronLeft
} from 'lucide-react'
import OptimizedImage from '../components/OptimizedImage'
import SEO from '../components/SEO'

const About = () => {
  const navigate = useNavigate()
  const aboutSchema = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "mainEntity": {
      "@type": "Organization",
      "name": "OZO Mart",
      "alternateName": ["OZO", "Ozo Mart", "OZO Delivery"],
      "url": "https://ozomart.store",
      "logo": "https://ozomart.store/apple-touch-icon.png",
      "description": "OZO Mart is an independent quick-commerce online grocery and fresh produce delivery service based in Patna and Aurangabad, Bihar, India. OZO Mart delivers daily essentials, farm-fresh fruits, organic vegetables, and Mithila regional specialties (including Mithila Makhana and Thekua) in 30 minutes.",
      "knowsAbout": ["Online Grocery Delivery", "Fresh Produce Logistics", "Mithila Regional Foods", "Quick Commerce Technology"]
    }
  }), []);

  const stats = [
    { label: 'Orders Delivered', value: '10,000+', icon: Truck, color: 'text-blue-500' },
    { label: 'Happy Customers', value: '5,000+', icon: Users, color: 'text-ozo-green' },
    { label: 'Store Partners', value: '100+', icon: MapPin, color: 'text-orange-500' },
    { label: 'Cities Covered', value: '10+', icon: Target, color: 'text-ozo-red' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300 relative">
      <SEO 
        title="About Us | OZO Mart - 30-Minute Grocery Delivery Revolution"
        description="Learn about OZO Mart, our mission to deliver farm-fresh fruits, organic vegetables, and authentic Mithila delicacies to Patna and Aurangabad in 30 minutes."
        keywords="about ozo mart, ozo story, Patna grocery, Aurangabad grocery, quick commerce India"
        schema={aboutSchema}
      />
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/80 dark:bg-[#1a1a1a]/85 backdrop-blur-md border border-gray-150/10 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:text-ozo-red dark:hover:text-white font-black text-xs uppercase tracking-widest transition-all shadow-sm group hover:border-ozo-red/50 hover:bg-white dark:hover:bg-white/10"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back
        </button>
      </div>

      {/* Hero Section */}
      <div className="bg-white dark:bg-[#0d0d0d] pt-24 pb-32 relative overflow-hidden">
        <div className="container-custom relative z-10 text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-4 py-2 bg-red-50 dark:bg-ozo-red/10 text-ozo-red rounded-full text-xs font-black uppercase tracking-widest mb-8"
          >
            <ShoppingBag size={16} />
            Our Journey
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-7xl font-black text-gray-900 dark:text-white mb-8 font-display leading-tight"
          >
            Revolutionizing Fresh <br /> <span className="text-gradient">Delivery in India.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-ozo-gray dark:text-gray-400 font-medium leading-relaxed"
          >
            Started with a simple idea: everyone deserves fresh produce and regional specialties delivered in minutes, not hours. Today, OZO Mart is India's fastest growing 30-minute fresh delivery platform.
          </motion.p>
        </div>
        
        {/* Decorative Gradients */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-red-50/50 dark:bg-ozo-red/5 blur-3xl rounded-full -mr-32" />
        <div className="absolute top-0 left-0 w-1/3 h-full bg-green-50/50 dark:bg-ozo-green/5 blur-3xl rounded-full -ml-32" />
      </div>

      <div className="container-custom -mt-16 relative z-20">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {stats.map((stat, i) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white dark:bg-[#1a1a1a] p-8 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-white/5 text-center group hover:border-ozo-red transition-all"
            >
              <div className={`w-12 h-12 ${stat.color} bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                 <stat.icon size={24} />
              </div>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-1 font-display">{stat.value}</h3>
              <p className="text-xs font-black uppercase tracking-widest text-ozo-gray dark:text-gray-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
           <div className="space-y-8">
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white leading-tight">
                Our Mission is <br /> <span className="text-gradient">Freshness First.</span>
              </h2>
              <p className="text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed">
                We believe that time is the most valuable asset. By combining cutting-edge technology with an extensive network of dark stores, we ensure your daily essentials are delivered before you even realize you've run out.
              </p>
              <div className="space-y-4 pt-4">
                 {[
                   { icon: ShieldCheck, title: 'Quality Guaranteed', desc: 'Every product is handpicked and quality-checked.' },
                   { icon: Zap, title: 'Lightning Fast', desc: 'Average delivery time of just 25 minutes.' },
                   { icon: Heart, title: 'Local Partnerships', desc: 'Supporting local farmers and neighborhood stores.' },
                 ].map((item, i) => (
                   <div key={i} className="flex gap-4">
                      <div className="w-10 h-10 bg-red-50 dark:bg-ozo-red/10 text-ozo-red rounded-xl flex items-center justify-center flex-shrink-0">
                         <item.icon size={20} />
                      </div>
                      <div>
                         <h4 className="font-bold text-gray-900 dark:text-white">{item.title}</h4>
                         <p className="text-sm text-ozo-gray dark:text-gray-500 font-medium">{item.desc}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
           <div className="relative">
              <div className="aspect-square bg-gradient-ozo rounded-[4rem] p-1 shadow-2xl overflow-hidden">
                 <div className="w-full h-full bg-[#0d0d0d] rounded-[3.8rem] flex items-center justify-center relative overflow-hidden">
                    <OptimizedImage 
                      src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000" 
                      alt="Fresh Produce" 
                      width={600}
                      className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
                      containerClassName="w-full h-full"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] to-transparent" />
                    <div className="absolute bottom-12 left-12 right-12">
                       <p className="text-white font-black text-2xl leading-tight">Delivering happiness, one basket at a time.</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}

export default About
