import React from 'react'
import { useCaptainStore } from '../../stores/captainStore'
import { useAuthStore } from '../../stores/authStore'
import { useShallow } from 'zustand/react/shallow'
import { 
  Award, 
  IndianRupee, 
  MapPin, 
  Star, 
  TrendingUp, 
  Wallet, 
  ShieldCheck, 
  Activity, 
  LogOut,
  Mail,
  User,
  Clock
} from 'lucide-react'
import toast from 'react-hot-toast'

const CaptainProfile = () => {
  const { captainProfile, completedDeliveriesCount } = useCaptainStore(useShallow(state => ({
    captainProfile: state.captainProfile ? {
      full_name: state.captainProfile.full_name,
      phone: state.captainProfile.phone,
      bike_number: state.captainProfile.bike_number,
      earnings: state.captainProfile.earnings,
      cash_in_hand: state.captainProfile.cash_in_hand,
      rating: state.captainProfile.rating
    } : null,
    completedDeliveriesCount: state.completedDeliveriesCount
  })))
  const { signOut } = useAuthStore()

  const handleLogout = async () => {
    await signOut()
  }

  // Calculate earnings details
  const earnings = parseFloat(captainProfile?.earnings || 0)
  const cashInHand = parseFloat(captainProfile?.cash_in_hand || 0)
  const rating = parseFloat(captainProfile?.rating || 5.0)

  return (
    <div className="flex-1 p-4 sm:p-5 max-w-md w-full mx-auto space-y-5 pb-36 bg-gray-50 dark:bg-[#070709] text-gray-900 dark:text-white transition-colors duration-300">
      {/* Rider Card Header */}
      <div className="bg-white dark:bg-[#0c0c14] border border-gray-200/80 dark:border-[#1c1c30] rounded-[2rem] p-5 relative overflow-hidden flex items-center gap-4 shadow-sm backdrop-blur-md">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#00FF66]/5 rounded-full blur-xl pointer-events-none"></div>

        {/* Profile Avatar / Initial */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#00FF66] to-[#00CC52] text-black font-black text-xl flex items-center justify-center shrink-0 shadow-md shadow-[#00FF66]/10 ring-2 ring-white dark:ring-[#0c0c14]">
          {captainProfile?.full_name?.charAt(0) || 'R'}
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-extrabold text-base sm:text-lg leading-tight tracking-tight">{captainProfile?.full_name}</h3>
            <span className="bg-emerald-50 dark:bg-[#00FF66]/10 border border-emerald-250 dark:border-[#00FF66]/20 text-emerald-600 dark:text-[#00FF66] p-0.5 rounded-full" title="Verified Rider Profile">
              <ShieldCheck className="w-3.5 h-3.5 fill-emerald-50 dark:fill-[#00FF66]/10" />
            </span>
          </div>
          <p className="text-[11px] text-gray-550 dark:text-gray-400 font-mono tracking-wide">{captainProfile?.phone}</p>
          {captainProfile?.bike_number ? (
            <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-[#161626] border border-gray-200 dark:border-[#232338] px-2 py-0.5 rounded-lg text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
              Vehicle: {captainProfile.bike_number}
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/20 dark:border-amber-500/20 px-2 py-0.5 rounded-lg text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
              Vehicle: N/A
            </div>
          )}
        </div>
      </div>

      {/* Verification status notice */}
      <div className="bg-emerald-50/30 dark:bg-[#00FF66]/5 border border-emerald-100/70 dark:border-[#00FF66]/10 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-[#00FF66] shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-wider">Active Duty Account Verified</p>
          <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
            Your verification status is approved. You have full access to order broadcasts and captain rewards program.
          </p>
        </div>
      </div>

      {/* Wallet Cards (Grid of Earnings) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Earnings Card */}
        <div className="bg-white dark:bg-[#0c0c14] border border-gray-200/80 dark:border-[#1c1c30] rounded-[2rem] p-4.5 space-y-3 relative overflow-hidden group shadow-sm flex flex-col justify-between">
          <div className="bg-emerald-50 dark:bg-[#00FF66]/10 w-8.5 h-8.5 rounded-xl flex items-center justify-center text-emerald-600 dark:text-[#00FF66] border border-emerald-100/50 dark:border-[#00FF66]/10 shrink-0">
            <IndianRupee className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider truncate">Today's Earnings</p>
            <p className="text-[1.325rem] sm:text-2xl font-black text-emerald-600 dark:text-[#00FF66] mt-0.5 font-mono truncate leading-none" title={`₹${earnings.toFixed(2)}`}>
              ₹{earnings.toFixed(2)}
            </p>
          </div>
        </div>
 
        {/* Cash In Hand Card */}
        <div className="bg-white dark:bg-[#0c0c14] border border-gray-200/80 dark:border-[#1c1c30] rounded-[2rem] p-4.5 space-y-3 relative overflow-hidden group shadow-sm flex flex-col justify-between">
          <div className="bg-red-50 dark:bg-[#FF3366]/10 w-8.5 h-8.5 rounded-xl flex items-center justify-center text-red-500 dark:text-[#FF3366] border border-red-100/50 dark:border-[#FF3366]/10 shrink-0">
            <Wallet className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider truncate">Cash In Hand (COD)</p>
            <p className="text-[1.325rem] sm:text-2xl font-black text-red-500 dark:text-[#FF3366] mt-0.5 font-mono truncate leading-none" title={`₹${cashInHand.toFixed(2)}`}>
              ₹{cashInHand.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="bg-white dark:bg-[#0c0c14] border border-gray-200/80 dark:border-[#1c1c30] rounded-[2rem] p-5 divide-y divide-gray-100 dark:divide-[#1c1c33] space-y-4.5 shadow-sm">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-1">
          Duty Achievements
        </h4>
        
        {/* Stat Item 1 */}
        <div className="flex items-center justify-between pt-3">
          <div className="flex items-center gap-2.5">
            <Award className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Deliveries Completed</span>
          </div>
          <span className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white">{completedDeliveriesCount}</span>
        </div>

        {/* Stat Item 2 */}
        <div className="flex items-center justify-between pt-3.5">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Customer Rating</span>
          </div>
          <span className="font-extrabold text-xs sm:text-sm text-emerald-600 dark:text-[#00FF66] bg-emerald-50 dark:bg-[#00FF66]/10 px-2 py-1 rounded-lg flex items-center gap-1 border border-emerald-100 dark:border-[#00FF66]/10">
            <Star className="w-3.5 h-3.5 fill-emerald-500 dark:fill-[#00FF66] text-transparent" /> {rating.toFixed(1)}
          </span>
        </div>

        {/* Stat Item 3 */}
        <div className="flex items-center justify-between pt-3.5">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Average Transit Time</span>
          </div>
          <span className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white">12 mins</span>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2">
        <button
          onClick={handleLogout}
          className="w-full bg-gray-100 dark:bg-[#161624] border border-gray-200 dark:border-[#27273f] hover:bg-gray-200 dark:hover:bg-[#1a1a2b] hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white py-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <LogOut className="w-4 h-4" /> Logout Duty Profile
        </button>
      </div>
    </div>
  )
}

export default CaptainProfile
