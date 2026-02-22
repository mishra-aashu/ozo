import { motion } from 'framer-motion'
import { Newspaper, Download, ExternalLink, Share2 } from 'lucide-react'
import SEO from '../components/SEO'

const Press = () => {
  const articles = [
    {
      title: 'OZO Mart Secures $25M Series A Funding led by Top-Tier VCs',
      source: 'TechCrunch',
      date: 'May 20, 2026',
      description: 'The fresh funding will accelerate expansion into tier-2 cities and help optimize dark store robotics.'
    },
    {
      title: 'How Instant Delivery is Transforming Fresh Produce Retail in Indian Subcontinent',
      source: 'The Economic Times',
      date: 'April 14, 2026',
      description: 'An analysis of OZO’s local sourcing strategy and its positive impact on neighborhood merchant stores.'
    },
    {
      title: 'OZO Partners with Local Agri-Cooperatives to Deliver Fresh Produce Direct from Farms',
      source: 'Business Standard',
      date: 'March 28, 2026',
      description: 'Our farm-to-fork initiative ensures that fruits and vegetables are sourced directly, paying farmers better prices and delivering fresh food.'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300">
      <SEO
        title="Press Room | OZO Mart Media Coverage & News"
        description="Read the latest news and media coverage about OZO Mart — India's 30-minute grocery delivery startup. Download press kits, logos, and media assets."
        keywords="OZO Mart press, OZO news, grocery startup news, quick commerce India media, OZO funding"
      />
      {/* Header */}
      <div className="bg-white dark:bg-[#0d0d0d] pt-24 pb-32 border-b border-gray-100 dark:border-white/5 relative overflow-hidden">
        <div className="container-custom relative z-10 text-center max-w-3xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 font-display"
          >
            Press <span className="text-gradient">Room.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-ozo-gray dark:text-gray-400 font-semibold"
          >
            Latest news, media coverage, and official press kits.
          </motion.p>
        </div>
        <div className="absolute top-0 left-0 w-64 h-64 bg-red-500/5 blur-3xl rounded-full -ml-32 -mt-32" />
      </div>

      <div className="container-custom -mt-16 relative z-20">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-white dark:bg-[#1a1a1a] p-8 md:p-12 rounded-[3rem] shadow-xl border border-gray-100 dark:border-white/5">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-8 flex items-center gap-3 uppercase tracking-tight">
              <Newspaper className="text-ozo-red" size={28} />
              Recent <span className="text-gradient">Coverage.</span>
            </h2>
            
            <div className="space-y-8">
              {articles.map((art, index) => (
                <div 
                  key={index}
                  className="p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 hover:bg-white dark:hover:bg-[#222] hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-red-50 dark:bg-ozo-red/10 text-ozo-red rounded-full text-xs font-black uppercase tracking-widest">
                      {art.source}
                    </span>
                    <span className="text-xs font-bold text-ozo-gray dark:text-gray-500">
                      {art.date}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {art.title}
                  </h3>
                  <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium mb-4 leading-relaxed">
                    {art.description}
                  </p>
                  <div className="flex gap-4">
                    <button className="text-xs font-black uppercase tracking-widest text-ozo-red flex items-center gap-1 hover:underline">
                      Read Full Article
                      <ExternalLink size={14} />
                    </button>
                    <button className="text-xs font-black uppercase tracking-widest text-ozo-gray dark:text-gray-400 flex items-center gap-1 hover:text-gray-950 dark:hover:text-white">
                      Share
                      <Share2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-16 p-8 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h3 className="text-xl font-black mb-2 text-gray-900 dark:text-white">Official Media Kit</h3>
                <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium">Download our brand guidelines, high-res logos, and executive headshots.</p>
              </div>
              <button className="px-6 py-4 bg-gradient-ozo text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform self-stretch md:self-auto justify-center">
                <Download size={16} />
                Download Zip (14.2 MB)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Press
