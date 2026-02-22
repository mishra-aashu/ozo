import { motion } from 'framer-motion'
import { Cookie, Settings2, Activity, FileText } from 'lucide-react'
import SEO from '../components/SEO'

const CookiePolicy = () => {
  const lastUpdated = 'May 28, 2026'

  const sections = [
    {
      title: 'What Are Cookies & Web Storage?',
      content: 'Cookies are small text files stored on your device when you load websites. Along with cookies, we utilize HTML5 Web Storage technologies (LocalStorage and SessionStorage) to securely store your active login sessions, authorization tokens, user preferences, theme options, and cached shopping cart items on your browser or device.',
      icon: Cookie
    },
    {
      title: 'Essential Storage & Cookies We Use',
      content: 'These cookies and web storage keys are absolutely necessary for the application to function. They hold authentication tokens, active shopping cart lists, and temporary location details to ensure seamless, real-time checkout and rapid order dispatch.',
      icon: FileText
    },
    {
      title: 'Performance & Analytics',
      content: 'We use analytics tracking to understand how our users interact with OZO. This helps us optimize delivery routes, identify high-demand areas, and fix software bugs or performance drops.',
      icon: Activity
    },
    {
      title: 'Managing Your Preferences',
      content: 'You can disable non-essential cookies via your browser settings or clear LocalStorage/SessionStorage manually. However, please note that blocking or clearing these might sign you out, empty your cart, or prevent the app from remembering your location preferences.',
      icon: Settings2
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300">
      <SEO
        title="Cookie Policy | OZO Mart"
        description="Learn how OZO Mart uses cookies and tracking technologies to improve your grocery shopping experience. Manage your cookie preferences and understand what data we collect."
        keywords="OZO Mart cookies, cookie policy, tracking policy, browser cookies grocery app"
      />
      {/* Header */}
      <div className="bg-white dark:bg-[#0d0d0d] pt-24 pb-32 border-b border-gray-100 dark:border-white/5 relative overflow-hidden">
        <div className="container-custom relative z-10 text-center max-w-3xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 font-display"
          >
            Cookie <span className="text-gradient">Policy.</span>
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
                OZO Mart uses cookies to deliver a tailored, smooth, and highly responsive shopping experience. By using our website and mobile application, you agree to our cookie configuration.
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

              <div className="mt-20 p-8 bg-gray-50 dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/5">
                 <h3 className="text-xl font-black mb-4">Cookie Consent Questions?</h3>
                 <p className="text-ozo-gray dark:text-gray-400 font-medium mb-6">If you have questions about how we use tracking technologies, email us at tech@ozomart.store.</p>
                 <button className="text-ozo-red font-black uppercase tracking-widest text-xs hover:underline">Change Cookie Preferences</button>
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}

export default CookiePolicy
