import { motion } from 'framer-motion'
import { Shield, Lock, Eye, Globe } from 'lucide-react'
import SEO from '../components/SEO'

const PrivacyPolicy = () => {
  const lastUpdated = 'May 15, 2024'

  const sections = [
    {
      title: 'Information We Collect',
      content: 'We collect information that you provide directly to us when you create an account, place an order, or contact us for support. This includes your name, email address, phone number, delivery address, and payment information.',
      icon: Eye
    },
    {
      title: 'How We Use Your Data',
      content: 'We use the information we collect to process your orders, provide customer support, send you updates about your delivery, and improve our services. We may also send you promotional offers if you have opted in to receive them.',
      icon: Globe
    },
    {
      title: 'Data Security',
      content: 'We take the security of your personal information seriously. We use industry-standard encryption and security measures to protect your data from unauthorized access, disclosure, or alteration.',
      icon: Shield
    },
    {
      title: 'Your Privacy Rights',
      content: 'You have the right to access, update, or delete your personal information at any time. You can also opt out of receiving marketing communications from us by following the instructions in our emails.',
      icon: Lock
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300">
      <SEO
        title="Privacy Policy | OZO Mart"
        description="Read OZO Mart's Privacy Policy. Learn how we collect, use, and protect your personal data when you use our grocery delivery service in Aurangabad and Patna, Bihar."
        keywords="OZO Mart privacy policy, data protection, user data OZO, privacy Bihar grocery"
      />
      {/* Header */}
      <div className="bg-white dark:bg-[#0d0d0d] pt-24 pb-32 border-b border-gray-100 dark:border-white/5 relative overflow-hidden">
        <div className="container-custom relative z-10 text-center max-w-3xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 font-display"
          >
            Privacy <span className="text-gradient">Policy.</span>
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
              <p className="text-ozo-gray dark:text-gray-400 font-medium mb-12 leading-relaxed">
                At OZO Mart, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our website and mobile application.
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
                      <p className="text-lg text-ozo-gray dark:text-gray-400 font-medium leading-relaxed pl-0 md:pl-16">
                         {section.content}
                      </p>
                   </div>
                 ))}
              </div>

              <div className="mt-20 p-8 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/5 space-y-6">
                 <div>
                   <h3 className="text-xl font-black mb-2">Grievance Redressal & Support</h3>
                   <p className="text-ozo-gray dark:text-gray-400 font-medium mb-2">For privacy inquiries or grievances, contact our designated Grievance Officer under the Consumer Protection Rules and DPDP Act:</p>
                   <div className="text-sm font-semibold text-gray-800 dark:text-gray-300 space-y-1">
                     <p>👤 <span className="text-gray-500">Officer:</span> Aashutosh Kumar Mishra</p>
                     <p>📧 <span className="text-gray-500">Email:</span> <a href="mailto:aashutoshk625@gmail.com" className="text-ozo-red hover:underline">aashutoshk625@gmail.com</a></p>
                     <p>📞 <span className="text-gray-500">Contact:</span> +91 6206359094</p>
                   </div>
                 </div>
                 <div>
                   <button className="text-ozo-red font-black uppercase tracking-widest text-xs hover:underline">Download PDF Version</button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy
