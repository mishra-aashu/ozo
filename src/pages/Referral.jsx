import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { 
  Gift, 
  Copy, 
  Check, 
  Share2, 
  Users, 
  ArrowLeft, 
  Info, 
  Compass, 
  Truck, 
  Clock,
  Sparkles
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function Referral() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuthStore()
  const [copied, setCopied] = useState(false)
  const [friendCode, setFriendCode] = useState('')
  const [isApplying, setIsApplying] = useState(false)
  const [referrals, setReferrals] = useState([])
  const [isLoadingReferrals, setIsLoadingReferrals] = useState(true)

  useEffect(() => {
    fetchReferrals()
    refreshProfile()
  }, [])

  const fetchReferrals = async () => {
    try {
      setIsLoadingReferrals(true)
      // Fetch referrals where current user is the referrer
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          id,
          status,
          created_at,
          referred_id
        `)
        .eq('referrer_id', profile?.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch names of referred users securely
      if (data && data.length > 0) {
        const referredIds = data.map(r => r.referred_id)
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', referredIds)

        if (usersError) throw usersError

        const userMap = new Map(usersData.map(u => [u.id, u.full_name]))
        const mapped = data.map(r => ({
          ...r,
          friend_name: userMap.get(r.referred_id) || 'Ozo User'
        }))
        setReferrals(mapped)
      } else {
        setReferrals([])
      }
    } catch (err) {
      console.error('Failed to fetch referrals:', err)
    } finally {
      setIsLoadingReferrals(false)
    }
  }

  const handleCopy = () => {
    if (!profile?.referral_code) return
    navigator.clipboard.writeText(profile.referral_code)
    setCopied(true)
    toast.success('Referral code copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = async () => {
    if (!profile?.referral_code) return
    const shareText = `Hey! Use my referral code ${profile.referral_code} to get FREE DELIVERY on your next 3 orders with Ozo! Download & order now: ${window.location.origin}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Ozo',
          text: shareText,
          url: window.location.origin
        })
      } catch (err) {
        console.warn('Share cancelled or failed', err)
      }
    } else {
      handleCopy()
    }
  }

  const handleApplyCode = async (e) => {
    e.preventDefault()
    if (!friendCode.trim()) return

    try {
      setIsApplying(true)
      const { data, error } = await supabase.rpc('apply_referral_code', {
        p_referral_code: friendCode.trim().toUpperCase()
      })

      if (error) throw error

      toast.success(data?.message || 'Referral code applied successfully!')
      setFriendCode('')
      await refreshProfile()
    } catch (err) {
      console.error('Apply referral code error:', err)
      toast.error(err.message || 'Failed to apply referral code')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12 transition-colors duration-255">
      {/* Top Navigation */}
      <div className="sticky top-0 z-40 bg-white dark:bg-gray-950 border-b border-gray-150 dark:border-gray-800 px-4 py-4 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full text-gray-700 dark:text-gray-300 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-ozo-red animate-pulse" /> Refer & Earn
        </h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6 space-y-6">
        {/* Banner Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ozo-red to-orange-600 text-white shadow-xl">
          {/* Decorative shapes */}
          <div className="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-white/10 blur-xl" />
          <div className="absolute -left-16 -bottom-16 w-44 h-44 rounded-full bg-black/10 blur-xl" />

          <div className="grid md:grid-cols-5 items-center gap-6 p-6">
            <div className="md:col-span-3 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md">
                <Gift className="w-3.5 h-3.5" /> Ozo Invite Program
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                Refer Karo,<br />
                Dono Ko FREE DELIVERY!
              </h2>
              <p className="text-white/80 text-sm font-medium">
                Dono ko FREE DELIVERY milegi next 3 orders pe! Zero margins, real cash zero expense for you.
              </p>
            </div>
            <div className="md:col-span-2 flex justify-center">
              <img 
                src="/images/referral_banner.png" 
                alt="Referral Gift Banner" 
                className="w-40 h-40 object-contain drop-shadow-2xl animate-float"
              />
            </div>
          </div>
        </div>

        {/* Free Deliveries Left Badge */}
        {profile?.free_delivery_orders_left > 0 && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-800/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Free Deliveries Active</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Applicable on orders above Rs. 99</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-green-600 dark:text-green-400">
                {profile.free_delivery_orders_left}
              </span>
              <p className="text-[10px] uppercase font-bold text-gray-400">Orders left</p>
            </div>
          </div>
        )}

        {/* Share Section */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-150 dark:border-gray-800 p-6 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <h3 className="font-bold text-gray-900 dark:text-white">Your Unique Referral Code</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Share this code with your friends to unlock delivery benefits</p>
          </div>

          <div className="relative flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-250 dark:border-gray-700">
            <span className="text-3xl font-black tracking-widest text-gray-800 dark:text-gray-255 select-all">
              {profile?.referral_code || 'LOADING...'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-900 transition-all text-sm active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold hover:opacity-90 transition-all text-sm active:scale-95 shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Code</span>
            </button>
          </div>
        </div>

        {/* Apply Referral Code Input (Only if user has not applied one yet and has 0 orders) */}
        {!profile?.referred_by_id && (
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-150 dark:border-gray-800 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
              <Gift className="w-4 h-4 text-ozo-red" /> Have a Referral Code?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Apply a code to claim your first 3 FREE deliveries instantly. (Valid before your first order)
            </p>
            <form onSubmit={handleApplyCode} className="flex gap-3">
              <input
                type="text"
                placeholder="ENTER REFERRAL CODE"
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-bold uppercase tracking-wider text-sm focus:outline-none focus:border-ozo-red"
              />
              <button
                type="submit"
                disabled={isApplying || !friendCode.trim()}
                className="px-6 py-3 rounded-xl bg-ozo-red hover:bg-red-600 disabled:opacity-50 text-white font-bold text-sm transition-all active:scale-95"
              >
                {isApplying ? 'Applying...' : 'Apply'}
              </button>
            </form>
          </div>
        )}

        {/* Steps Info */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-150 dark:border-gray-800 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">How it Works</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center font-black text-sm shrink-0">
                1
              </div>
              <div>
                <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Invite Friends</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Share your invite link or code with your friends.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/40 text-ozo-red flex items-center justify-center font-black text-sm shrink-0">
                2
              </div>
              <div>
                <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Friend applies code</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Your friend gets 3 FREE deliveries immediately upon code application.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400 flex items-center justify-center font-black text-sm shrink-0">
                3
              </div>
              <div>
                <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Get Rewarded</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Once your friend places their first order and it is delivered, you get 3 FREE deliveries too!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Referrals History */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-150 dark:border-gray-800 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-blue-500" /> Friends Referred ({referrals.length})
          </h3>

          {isLoadingReferrals ? (
            <div className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-ozo-red border-t-transparent rounded-full animate-spin" />
            </div>
          ) : referrals.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-gray-400 text-sm">No friends referred yet.</p>
              <button 
                onClick={handleShare}
                className="text-xs text-ozo-red font-bold hover:underline"
              >
                Share code now &rarr;
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {referrals.map((ref) => (
                <div key={ref.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{ref.friend_name}</h4>
                    <p className="text-[10px] text-gray-400">
                      Joined {new Date(ref.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    {ref.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-bold">
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                        Pending Order
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
