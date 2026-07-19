import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Package, 
  Heart, 
  Settings, 
  LogOut, 
  ChevronRight,
  ChevronDown,
  Camera,
  Bell,
  Shield,
  CreditCard,
  Upload,
  X,
  Check,
  Bike,
  Store,
  Gift
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useShallow } from 'zustand/react/shallow'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from '../hooks/useTranslation'
import UserAvatar from '../components/UserAvatar'
import ImageUpload from '../components/ImageUpload'

const PRESET_AVATARS = [
  { name: 'Chef Cookie', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Cookie' },
  { name: 'Happy Honey', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Honey' },
  { name: 'Chef Pepper', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Pepper' },
  { name: 'Sweet Berry', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Berry' },
  { name: 'Adventure Felix', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix' },
  { name: 'Adventure Aneka', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka' },
  { name: 'Robo Buster', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Buster' },
  { name: 'Robo Penny', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Penny' },
]

const Profile = () => {
  const { t } = useTranslation()
  const { user, profile, signOut, updateProfile, isAdmin } = useAuthStore(useShallow(state => ({
    user: state.user,
    profile: state.profile,
    signOut: state.signOut,
    updateProfile: state.updateProfile,
    isAdmin: state.isAdmin,
  })))
  const isCaptain = profile?.role === 'captain' || isAdmin
  const isMartOperator = profile?.role === 'mart_operator' || isAdmin
  const isCityManager = profile?.isCityManager
  const isCustomerOnly = !isCaptain && !isMartOperator && !isCityManager
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  })
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isRiderExpanded, setIsRiderExpanded] = useState(false)
  const [isMartExpanded, setIsMartExpanded] = useState(false)
  const [isCityExpanded, setIsCityExpanded] = useState(false)



  const handlePresetSelect = async (url) => {
    try {
      const result = await updateProfile({ avatar_url: url })
      if (result.success) {
        toast.success('Avatar updated successfully')
        setIsAvatarModalOpen(false)
      }
    } catch (err) {
      console.error('Error updating preset avatar:', err)
      toast.error('Failed to update avatar')
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      const result = await updateProfile({ avatar_url: '' })
      if (result.success) {
        toast.success('Avatar removed successfully')
        setIsAvatarModalOpen(false)
      }
    } catch (err) {
      console.error('Error removing avatar:', err)
      toast.error('Failed to remove avatar')
    }
  }

  const handleLogout = async () => {
    const result = await signOut()
    if (result.success) {
      navigate('/')
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    const result = await updateProfile(formData)
    if (result.success) {
      setIsEditing(false)
    }
  }

  const menuItems = [
    ...(isAdmin ? [{ label: profile?.isSuperAdmin ? 'Admin Panel' : 'City Manager Portal', icon: Shield, to: '/admin', color: 'text-ozo-red', bgColor: 'bg-red-50 dark:bg-ozo-red/10' }] : []),
    { label: t('myOrders'), icon: Package, to: '/orders', color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'Refer & Earn', icon: Gift, to: '/referral', color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-500/10' },
    { label: t('wishlist'), icon: Heart, to: '/wishlist', color: 'text-pink-500', bgColor: 'bg-pink-50 dark:bg-pink-500/10' },
    { label: t('savedAddresses'), icon: MapPin, to: '/profile/addresses', color: 'text-ozo-green', bgColor: 'bg-green-50 dark:bg-ozo-green/10' },
    { label: t('paymentMethods'), icon: CreditCard, to: '/profile/payments', color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-500/10' },
    { label: t('notifications'), icon: Bell, to: '/notifications', color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-500/10' },
    { label: t('security'), icon: Shield, to: '/settings/security', color: 'text-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-500/10' },
    { label: t('settings'), icon: Settings, to: '/settings', color: 'text-gray-500', bgColor: 'bg-gray-50 dark:bg-gray-500/10' },
  ]

  const renderTitle = (titleString) => {
    if (!titleString) return null
    const words = titleString.trim().split(/\s+/)
    if (words.length <= 1) {
      return <>{titleString}<span className="text-yellow-300">.</span></>
    }
    const firstPart = words.slice(0, -1).join(' ')
    const lastWord = words[words.length - 1]
    return <>{firstPart} <span className="text-yellow-300">{lastWord}.</span></>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] pb-24 transition-colors duration-300">
      {/* Header / Hero */}
      <div className="bg-gradient-ozo pt-12 pb-24 relative overflow-hidden">
        <div className="container-custom relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-8 text-white">
            <div className="relative group">
              <div 
                onClick={() => setIsAvatarModalOpen(true)}
                className="w-32 h-32 rounded-[2.5rem] bg-white p-1 shadow-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform active:scale-95 duration-300"
              >
                <UserAvatar 
                  profile={profile} 
                  user={user} 
                  className="w-full h-full rounded-[2.2rem] bg-gradient-green flex items-center justify-center"
                  imgClassName="w-full h-full object-cover rounded-[2.2rem]"
                />
              </div>
              <button 
                onClick={() => setIsAvatarModalOpen(true)}
                className="absolute bottom-0 right-0 w-10 h-10 bg-white text-ozo-red rounded-2xl flex items-center justify-center shadow-lg border-4 border-ozo-red transform hover:scale-110 transition-transform"
              >
                <Camera size={20} />
              </button>
            </div>
            
            <div className="text-center md:text-left flex-1">
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl md:text-4xl font-black mb-2 font-display"
              >
                {renderTitle(profile?.full_name || t('welcomeBack'))}
              </motion.h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <span className="flex items-center gap-2 text-white/80 text-sm font-semibold bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  <Mail size={16} />
                  {user?.email}
                </span>
                {profile?.phone && (
                  <span className="flex items-center gap-2 text-white/80 text-sm font-semibold bg-white/10 px-3 py-1 rounded-full border border-white/10">
                    <Phone size={16} />
                    {profile.phone}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-4">
               <button 
                onClick={() => setIsEditing(!isEditing)}
                className="px-6 py-3 bg-white text-ozo-red rounded-2xl font-black shadow-lg hover:bg-red-50 transition-all active:scale-95"
               >
                 {isEditing ? t('cancel') : t('editProfile')}
               </button>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -ml-24 -mb-24" />
      </div>

      <div className="container-custom -mt-12 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {isEditing && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] p-8 shadow-xl border border-gray-100 dark:border-white/5"
              >
                <h2 className="text-xl font-black mb-6 flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-ozo-red rounded-full" />
                  {t('editPersonalInfo')}
                </h2>
                <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">{t('fullName')}</label>
                    <div className="input-group">
                      <User className="input-icon" />
                      <input 
                        type="text" 
                        value={formData.full_name}
                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                        className="input input-with-icon" 
                        placeholder="Your full name"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">{t('phoneNumber')}</label>
                    <div className="input-group">
                      <Phone className="input-icon" />
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="input input-with-icon" 
                        placeholder="Your phone number"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-4 mt-2">
                    <button type="submit" className="btn btn-primary px-10">{t('saveChanges')}</button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Account Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-white/5 group hover:shadow-xl transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-red-50 dark:bg-ozo-red/10 rounded-2xl flex items-center justify-center text-ozo-red group-hover:scale-110 transition-transform">
                      <Package size={28} />
                    </div>
                    <span className="text-3xl font-black text-gray-200 dark:text-white/5">01</span>
                  </div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">Ongoing Order</h3>
                  <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium mb-6">Track your current delivery</p>
                  <Link to="/orders" className="flex items-center gap-2 text-ozo-red font-bold text-sm">
                    View Details <ChevronRight size={16} />
                  </Link>
               </div>

               <div className="bg-white dark:bg-[#1a1a1a] p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-white/5 group hover:shadow-xl transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-green-50 dark:bg-ozo-green/10 rounded-2xl flex items-center justify-center text-ozo-green group-hover:scale-110 transition-transform">
                      <MapPin size={28} />
                    </div>
                    <span className="text-3xl font-black text-gray-200 dark:text-white/5">02</span>
                  </div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">Primary Address</h3>
                  <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium mb-6 truncate">{profile?.address || 'Set your delivery address'}</p>
                  <Link to="/profile/addresses" className="flex items-center gap-2 text-ozo-green font-bold text-sm">
                    Manage Addresses <ChevronRight size={16} />
                  </Link>
               </div>
            </div>

            {/* OZO Service Portals */}
            <div className="space-y-4 pt-2">
              <h2 className="text-xl font-black flex items-center gap-3 text-gray-900 dark:text-white">
                <span className="w-1.5 h-6 bg-ozo-red rounded-full animate-pulse" />
                {isCustomerOnly ? 'Earn with OZO' : 'Service Portals'}
              </h2>
              <div className="flex flex-col gap-4">
                {isCityManager && (
                  <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden transition-all duration-300 hover:shadow-md">
                    <button
                      onClick={() => setIsCityExpanded(!isCityExpanded)}
                      className="w-full p-6 flex items-center justify-between gap-4 text-left outline-none"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-red-50 dark:bg-ozo-red/10 rounded-2xl flex items-center justify-center text-ozo-red flex-shrink-0">
                          <Shield size={24} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-black text-gray-900 dark:text-white truncate">City Manager Portal</h3>
                          <span className="inline-block mt-0.5 text-[9px] font-black uppercase tracking-wider bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full text-ozo-red">City</span>
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: isCityExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-gray-400"
                      >
                        <ChevronDown size={20} />
                      </motion.div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isCityExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 pt-2 border-t border-gray-50 dark:border-white/5">
                            <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium mb-4 leading-relaxed">
                              Manage products, orders, reviews, rider settings, and mart settings scoped to your assigned city.
                            </p>
                            <Link to="/admin" className="inline-flex items-center gap-2 text-ozo-red font-bold text-sm bg-red-50 dark:bg-ozo-red/10 px-4 py-2 rounded-xl hover:opacity-90 transition-opacity">
                              Open City Manager Console <ChevronRight size={16} />
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {isCaptain && (
                  <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden transition-all duration-300 hover:shadow-md">
                    <button
                      onClick={() => setIsRiderExpanded(!isRiderExpanded)}
                      className="w-full p-6 flex items-center justify-between gap-4 text-left outline-none"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 rounded-2xl flex items-center justify-center text-ozo-green flex-shrink-0">
                          <Bike size={24} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-black text-gray-900 dark:text-white truncate">Rider Duty Console</h3>
                          <span className="inline-block mt-0.5 text-[9px] font-black uppercase tracking-wider bg-[#00FF66]/10 border border-[#00FF66]/20 px-2 py-0.5 rounded-full text-ozo-green">Rider</span>
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: isRiderExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-gray-400"
                      >
                        <ChevronDown size={20} />
                      </motion.div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isRiderExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 pt-2 border-t border-gray-50 dark:border-white/5">
                            <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium mb-4 leading-relaxed">
                              Earn by delivering orders nearby. Access live order radar and track your earnings.
                            </p>
                            <Link to="/captain" className="inline-flex items-center gap-2 text-ozo-green font-bold text-sm bg-green-50 dark:bg-ozo-green/10 px-4 py-2 rounded-xl hover:opacity-90 transition-opacity">
                              Open Rider Console <ChevronRight size={16} />
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {isMartOperator && (
                  <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden transition-all duration-300 hover:shadow-md">
                    <button
                      onClick={() => setIsMartExpanded(!isMartExpanded)}
                      className="w-full p-6 flex items-center justify-between gap-4 text-left outline-none"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 flex-shrink-0">
                          <Store size={24} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-black text-gray-900 dark:text-white truncate">Mart Operator Portal</h3>
                          <span className="inline-block mt-0.5 text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-indigo-500">Store</span>
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: isMartExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-gray-400"
                      >
                        <ChevronDown size={20} />
                      </motion.div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isMartExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 pt-2 border-t border-gray-50 dark:border-white/5">
                            <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium mb-4 leading-relaxed">
                              Fulfill incoming customer order baskets and control local store inventory availability.
                            </p>
                            <Link to="/mart" className="inline-flex items-center gap-2 text-indigo-500 font-bold text-sm bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2 rounded-xl hover:opacity-90 transition-opacity">
                              Manage Supermarket <ChevronRight size={16} />
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {isCustomerOnly && (
                  <>
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden transition-all duration-300 hover:shadow-md">
                      <button
                        onClick={() => setIsRiderExpanded(!isRiderExpanded)}
                        className="w-full p-6 flex items-center justify-between gap-4 text-left outline-none"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 bg-green-50 dark:bg-ozo-green/10 rounded-2xl flex items-center justify-center text-ozo-green flex-shrink-0">
                            <Bike size={24} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-black text-gray-900 dark:text-white truncate">Become a Rider</h3>
                            <span className="inline-block mt-0.5 text-[9px] font-black uppercase tracking-wider bg-green-50 dark:bg-ozo-green/10 border border-ozo-green/20 px-2.5 py-0.5 rounded-full text-ozo-green">Hiring</span>
                          </div>
                        </div>
                        <motion.div
                          animate={{ rotate: isRiderExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-gray-400"
                        >
                          <ChevronDown size={20} />
                        </motion.div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isRiderExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-6 pt-2 border-t border-gray-50 dark:border-white/5">
                              <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium mb-4 leading-relaxed">
                                Earn on your own schedule by delivering OZO orders near you. Flexible hours, daily payouts.
                              </p>
                              <Link to="/captain" className="inline-flex items-center gap-2 text-ozo-green font-bold text-sm bg-green-50 dark:bg-ozo-green/10 px-4 py-2 rounded-xl hover:opacity-90 transition-opacity">
                                Apply Now <ChevronRight size={16} />
                              </Link>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden transition-all duration-300 hover:shadow-md">
                      <button
                        onClick={() => setIsMartExpanded(!isMartExpanded)}
                        className="w-full p-6 flex items-center justify-between gap-4 text-left outline-none"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 flex-shrink-0">
                            <Store size={24} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-black text-gray-900 dark:text-white truncate">Apply for Mart</h3>
                            <span className="inline-block mt-0.5 text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-indigo-500">Partner</span>
                          </div>
                        </div>
                        <motion.div
                          animate={{ rotate: isMartExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-gray-400"
                        >
                          <ChevronDown size={20} />
                        </motion.div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isMartExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-6 pt-2 border-t border-gray-50 dark:border-white/5">
                              <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium mb-4 leading-relaxed">
                                Partner with OZO and bring your store online. Reach thousands of customers in your area.
                              </p>
                              <Link to="/mart" className="inline-flex items-center gap-2 text-indigo-500 font-bold text-sm bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2 rounded-xl hover:opacity-90 transition-opacity">
                                Apply Now <ChevronRight size={16} />
                              </Link>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Secondary Menu */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">
               {menuItems.map((item, index) => (
                 <Link 
                  key={index} 
                  to={item.to}
                  className={`flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-white/5 transition-all group ${index !== menuItems.length - 1 ? 'border-b border-gray-50 dark:border-white/5' : ''}`}
                 >
                   <div className="flex items-center gap-4">
                     <div className={`w-12 h-12 ${item.bgColor} ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                       <item.icon size={22} />
                     </div>
                     <span className="font-bold text-gray-700 dark:text-gray-200">{item.label}</span>
                   </div>
                   <ChevronRight size={20} className="text-gray-300 group-hover:text-ozo-red group-hover:translate-x-1 transition-all" />
                 </Link>
               ))}
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
            {/* Account Summary */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-white/5">
              <h3 className="text-lg font-black mb-6">Account Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-ozo-gray dark:text-gray-400 font-medium">Member Since</span>
                  <span className="text-gray-900 dark:text-white font-bold">May 2024</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-ozo-gray dark:text-gray-400 font-medium">Total Orders</span>
                  <span className="text-gray-900 dark:text-white font-bold">12</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-ozo-gray dark:text-gray-400 font-medium">OZO Coins</span>
                  <span className="text-ozo-red font-black">450</span>
                </div>
              </div>
              <div className="mt-8 pt-8 border-t border-gray-100 dark:border-white/5">
                <button 
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-red-50 dark:bg-ozo-red/10 text-ozo-red rounded-2xl font-black hover:bg-ozo-red hover:text-white transition-all active:scale-95 group"
                >
                  <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                  Logout Account
                </button>
              </div>
            </div>

            {/* Promo Card */}
            <Link 
              to="/referral"
              className="block bg-gradient-green rounded-[2.5rem] p-8 text-white relative overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-300"
            >
               <div className="relative z-10">
                 <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-2">{t('referEarn')}</p>
                 <h4 className="text-xl font-black mb-4">{t('referralPromo')}</h4>
                 <span className="inline-block px-6 py-2 bg-white text-ozo-green rounded-xl font-bold text-sm shadow-xl group-hover:scale-105 transition-transform">
                   {t('inviteFriends')}
                 </span>
               </div>
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
            </Link>
          </div>
        </div>
      </div>

      {/* Avatar Edit Modal */}
      <AnimatePresence>
        {isAvatarModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAvatarModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-white/5 w-full max-w-lg relative z-10 max-h-[90vh] overflow-y-auto scrollbar-hide text-gray-800 dark:text-white"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsAvatarModalOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <h3 className="text-2xl font-black mb-2 flex items-center gap-3">
                <span className="w-1.5 h-6 bg-ozo-red rounded-full" />
                Customize Avatar
              </h3>
              <p className="text-sm text-ozo-gray dark:text-gray-400 font-medium mb-6">
                Choose a fun preset character or upload your own photo.
              </p>

              {/* Upload Section */}
              <div className="mb-8">
                <ImageUpload
                  value={profile?.avatar_url || ''}
                  onChange={async (uploadedUrl) => {
                    if (uploadedUrl) {
                      const result = await updateProfile({ avatar_url: uploadedUrl })
                      if (result.success) {
                        toast.success('Avatar uploaded successfully')
                        setIsAvatarModalOpen(false)
                      }
                    }
                  }}
                  customNamePrefix={`avatar_${user.id}`}
                  label="Upload Custom Image"
                  disabled={uploading}
                  onUploadingStateChange={setUploading}
                  maxSize={2 * 1024 * 1024}
                />
              </div>

              {/* Presets Section */}
              <div className="mb-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-ozo-gray dark:text-gray-400 mb-4">
                  Select Preset Character
                </h4>
                <div className="grid grid-cols-4 gap-4">
                  {PRESET_AVATARS.map((preset) => {
                    const isSelected = profile?.avatar_url === preset.url
                    return (
                      <button
                        key={preset.name}
                        onClick={() => handlePresetSelect(preset.url)}
                        className={`relative aspect-square rounded-2xl bg-gray-50 dark:bg-white/5 border-2 transition-all p-1 hover:scale-105 active:scale-95 ${
                          isSelected
                            ? 'border-ozo-red ring-2 ring-ozo-red/20 shadow-md'
                            : 'border-transparent hover:border-gray-200 dark:hover:border-white/10'
                        }`}
                        title={preset.name}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-contain"
                        />
                        {isSelected && (
                          <div className="absolute -top-1.5 -right-1.5 bg-ozo-red text-white rounded-full p-0.5 shadow-md">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {profile?.avatar_url && (
                <button
                  onClick={handleRemoveAvatar}
                  className="w-full py-3 bg-red-50 dark:bg-ozo-red/10 text-ozo-red rounded-2xl font-black text-sm hover:bg-ozo-red hover:text-white transition-all active:scale-95"
                >
                  Remove Custom Avatar
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000]"
            />
            
            {/* Modal Container */}
            <div className="fixed inset-0 flex items-center justify-center p-4 z-[1001] pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="w-full max-w-sm bg-white dark:bg-[#121214] rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-white/5 pointer-events-auto"
              >
                {/* Warning Icon Container */}
                <div className="mx-auto w-14 h-14 bg-red-50 dark:bg-red-950/20 text-ozo-red rounded-full flex items-center justify-center mb-4 shadow-inner">
                  <LogOut size={24} className="stroke-[2.5]" />
                </div>
                
                {/* Title & Desc */}
                <h3 className="text-lg font-black text-gray-900 dark:text-white text-center tracking-tight mb-2">
                  Confirm Logout
                </h3>
                <p className="text-sm text-ozo-gray dark:text-gray-400 text-center font-semibold mb-6 leading-relaxed">
                  Are you sure you want to log out of your OZO account? You will need to log in again to manage orders.
                </p>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 py-3 px-4 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-250 text-sm font-black rounded-2xl transition-all border border-gray-150/10 dark:border-white/5 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setShowLogoutConfirm(false)
                      await handleLogout()
                    }}
                    className="flex-1 py-3 px-4 bg-gradient-ozo hover:opacity-95 text-white text-sm font-black rounded-2xl transition-all shadow-[0_4px_12px_rgba(227,30,36,0.25)] hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Yes, Logout
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Profile
