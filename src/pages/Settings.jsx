import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  CreditCard, 
  Smartphone, 
  Languages, 
  HelpCircle,
  ChevronRight,
  Moon,
  Sun,
  ArrowLeft,
  X,
  Check
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useThemeStore } from '../stores/themeStore'
import { useLanguageStore } from '../stores/languageStore'
import LanguageModal from '../components/LanguageModal'

const Settings = () => {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()
  const { t, setLanguage, getCurrentLanguageLabel } = useLanguageStore()
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false)
  
  const [settings, setSettings] = useState({
    notifications: true,
    marketing: false,
    orderUpdates: true,
    twoFactor: true,
  })

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const sections = [
    {
      title: t('generalSettings'),
      items: [
        { label: t('editProfile'), icon: User, to: '/profile' },
        { label: t('deliveryAddresses'), icon: Smartphone, to: '/profile/addresses' },
        { label: t('language'), icon: Languages, value: getCurrentLanguageLabel(), onClick: () => setIsLanguageModalOpen(true) },
      ]
    },
    {
      title: t('security'),
      items: [
        { label: t('savedCards'), icon: CreditCard, to: '/profile/payments' },
        { label: t('passwordLogin'), icon: SettingsIcon, to: '/settings/security' },
      ]
    },
  ]

  const renderTitle = (titleString) => {
    if (!titleString) return null
    const words = titleString.trim().split(/\s+/)
    if (words.length <= 1) {
      return <>{titleString}<span className="text-gradient">.</span></>
    }
    const firstPart = words.slice(0, -1).join(' ')
    const lastWord = words[words.length - 1]
    return <>{firstPart} <span className="text-gradient">{lastWord}.</span></>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300">
      {/* Header */}
      <div className="page-header-sticky">
        <div className="container-custom">
           <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                 <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
              </button>
              <div>
                 <h1 className="text-3xl font-black text-gray-900 dark:text-white font-display">{renderTitle(t('settings'))}</h1>
                 <p className="text-ozo-gray dark:text-gray-400 font-medium">{t('managePreferences')}</p>
              </div>
           </div>
        </div>
      </div>

      <div className="container-custom py-12">
        <div className="max-w-3xl mx-auto space-y-12">
          
          {/* Theme Selector (Special) */}
          <section>
            <h3 className="text-xs font-black uppercase tracking-widest text-ozo-gray dark:text-gray-500 mb-6">{t('appearance')}</h3>
            <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-white/5 flex items-center gap-4">
               <button 
                onClick={() => theme === 'dark' && toggleTheme()}
                className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.8rem] transition-all ${theme === 'light' ? 'bg-red-50 text-ozo-red shadow-lg' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}
               >
                 <Sun size={20} />
                 <span className="font-black uppercase tracking-widest text-xs">{t('lightMode')}</span>
               </button>
               <button 
                onClick={() => theme === 'light' && toggleTheme()}
                className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.8rem] transition-all ${theme === 'dark' ? 'bg-white/10 text-white shadow-lg' : 'text-ozo-gray hover:bg-gray-50 dark:hover:bg-white/5'}`}
               >
                 <Moon size={20} />
                 <span className="font-black uppercase tracking-widest text-xs">{t('darkMode')}</span>
               </button>
            </div>
          </section>

          {sections.map((section) => (
            <section key={section.title}>
               <h3 className="text-xs font-black uppercase tracking-widest text-ozo-gray dark:text-gray-500 mb-6">{section.title}</h3>
               <div className="bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
                  {section.items.map((item, i) => (
                    <div 
                      key={item.label}
                      onClick={() => {
                        if (item.onClick) {
                          item.onClick()
                        } else if (item.to) {
                          navigate(item.to)
                        }
                      }}
                      className={`flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-white/5 transition-all group cursor-pointer ${i !== section.items.length - 1 ? 'border-b border-gray-50 dark:border-white/5' : ''}`}
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 text-ozo-gray dark:text-gray-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                             <item.icon size={22} />
                          </div>
                          <div>
                             <p className="font-bold text-gray-900 dark:text-white">{item.label}</p>
                             {item.value && <p className="text-xs text-ozo-red font-bold">{item.value}</p>}
                          </div>
                       </div>
                       
                       {item.isToggle ? (
                         <button 
                          onClick={(e) => { e.stopPropagation(); toggleSetting(item.key); }}
                          className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${settings[item.key] ? 'bg-ozo-green' : 'bg-gray-200 dark:bg-white/10'}`}
                         >
                            <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${settings[item.key] ? 'translate-x-6' : 'translate-x-0'}`} />
                         </button>
                       ) : (
                         <ChevronRight size={20} className="text-gray-300 group-hover:text-ozo-red group-hover:translate-x-1 transition-all" />
                       )}
                    </div>
                  ))}
               </div>
            </section>
          ))}



        </div>
      </div>

      {/* Language Selection Modal */}
      <AnimatePresence>
        {isLanguageModalOpen && (
          <LanguageModal
            isOpen={isLanguageModalOpen}
            onClose={() => setIsLanguageModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default Settings
