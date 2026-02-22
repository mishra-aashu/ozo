import { motion } from 'framer-motion'
import { RefreshCw, ShieldAlert, DollarSign, Clock } from 'lucide-react'
import SEO from '../components/SEO'

const RefundPolicy = () => {
  const lastUpdated = 'June 14, 2026'

  const sections = [
    {
      title: 'No-Return Policy',
      content: 'Due to strict hygiene and safety standards, all groceries, fresh produce, and household essentials available on OZO Mart are classified as Non-Returnable. Once a delivery has been accepted, it cannot be returned or taken back.',
      icon: ShieldAlert
    },
    {
      title: 'Exceptions & Reporting Windows',
      content: 'To request a refund or replacement for damaged, spoiled, expired, or incorrect items, you must report the issue through the in-app \'Support\' section within the following windows:\n\n• Perishable Goods (fresh milk, bread, butter, curd, fresh fruits, vegetables, paneer, frozen items): Must be reported strictly within 15 minutes of delivery to ensure food safety and immediate refrigeration audit.\n\n• Packaged & Non-Perishable Goods (packaged snacks, detergents, household cleaning items, beauty & personal care products): Must be reported within 24 hours of delivery (provided they are unused/unconsumed). No complaints or claims will be accepted after these respective windows.',
      icon: RefreshCw
    },
    {
      title: 'Mandatory Condition',
      content: 'To request a refund or replacement, it is mandatory to upload a live photo of the damaged or incorrect item directly within the app. Gallery uploads or pre-saved images are strictly prohibited and blocked to prevent fraudulent activity. Following review, approved refunds will be credited to your OZO Wallet or your original payment source.',
      icon: DollarSign
    },
    {
      title: 'Anti-Fraud & Zero Loophole Clause',
      content: 'OZO Mart maintains a zero-tolerance policy towards fraudulent claims. Any attempt to upload pre-saved images, stock photos, or files from the gallery, or to file a complaint past the respective reporting windows (15 minutes for perishables, 24 hours for packaged goods), will lead to automatic rejection of the claim and may result in account suspension.',
      icon: Clock
    }
  ]


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300">
      <SEO
        title="Refund Policy | OZO Mart"
        description="OZO Mart's refund and return policy for fresh groceries. Understand how to report issues within 15 minutes of delivery and get refunds for wrong, damaged, or missing items."
        keywords="OZO Mart refund, grocery refund policy, return policy OZO, damaged item refund Bihar"
      />
      {/* Header */}
      <div className="bg-white dark:bg-[#0d0d0d] pt-24 pb-32 border-b border-gray-100 dark:border-white/5 relative overflow-hidden">
        <div className="container-custom relative z-10 text-center max-w-3xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 font-display"
          >
            Refund <span className="text-gradient">Policy.</span>
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
        <div className="absolute top-0 left-0 w-64 h-64 bg-red-500/5 blur-3xl rounded-full -ml-32 -mt-32" />
      </div>

      <div className="container-custom -mt-16 relative z-20">
        <div className="max-w-4xl mx-auto space-y-8">
           <div className="bg-white dark:bg-[#1a1a1a] p-8 md:p-12 rounded-[3rem] shadow-xl border border-gray-100 dark:border-white/5 content-area">
              <p className="text-ozo-gray dark:text-gray-400 font-medium mb-12 leading-relaxed text-lg">
                At OZO Mart, customer safety and satisfaction are our top priorities. Since we deliver fresh groceries and perishables within minutes, we maintain a strict, fast-verification policy for returns and refunds to ensure absolute hygiene and prevent abuse.
              </p>

              <div className="space-y-12">
                 {sections.map((section, i) => (
                   <div key={i} className="group">
                      <div className="flex items-center gap-4 mb-6">
                         <div className="w-12 h-12 bg-red-50 dark:bg-ozo-red/10 text-ozo-red rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <section.icon size={24} />
                         </div>
                         <h2 className="text-2xl font-black text-gray-900 dark:text-white">{section.title}</h2>
                      </div>
                      <p className="text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed pl-0 md:pl-16 whitespace-pre-line">
                         {section.content}
                      </p>
                   </div>
                 ))}
              </div>

              <div className="mt-20 p-8 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/5">
                 <h3 className="text-xl font-black mb-4">Need Help with a Refund?</h3>
                 <p className="text-ozo-gray dark:text-gray-400 font-medium mb-6">If you have any questions or would like to request a refund, please open the OZO chat or contact us at aashutoshk625@gmail.com.</p>
                 <button className="text-ozo-red font-black uppercase tracking-widest text-xs hover:underline">Download Policy PDF</button>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}

export default RefundPolicy
