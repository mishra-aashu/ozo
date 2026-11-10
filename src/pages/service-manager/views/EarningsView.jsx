import React, { useState } from 'react'
import { 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Calendar,
  FileCheck
} from 'lucide-react'

export default function EarningsView({
  earnings = {},
  provider,
  isLoading = false,
  onRequestPayout
}) {
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)

  const pendingPayout = earnings.pendingPayout || 0
  const totalRevenue = earnings.totalRevenue || 0
  const netEarnings = earnings.netEarnings || 0
  const platformCommission = earnings.platformCommission || 0
  const completedJobsCount = earnings.completedJobsCount || 0
  const payoutHistory = earnings.payoutHistory || []

  const handleWithdraw = async (e) => {
    e.preventDefault()
    const amt = Number(withdrawAmount) || pendingPayout
    if (amt <= 0 || amt > pendingPayout) return

    setIsWithdrawing(true)
    try {
      await onRequestPayout(amt)
      setIsWithdrawModalOpen(false)
      setWithdrawAmount('')
    } finally {
      setIsWithdrawing(false)
    }
  }

  return (
    <div className="space-y-6 text-left">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-amber-500/10 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
            Financial Ledger & Settlements
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-2">
            Partner Revenue & Payouts
          </h2>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1 max-w-lg">
            Direct doorstep service settlements deposited to your registered bank account or UPI.
          </p>
        </div>

        <button
          onClick={() => {
            setWithdrawAmount(pendingPayout.toString())
            setIsWithdrawModalOpen(true)
          }}
          disabled={pendingPayout <= 0}
          className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl text-sm sm:text-base font-black tracking-wide shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2.5 shrink-0 active:scale-95"
        >
          <ArrowUpRight size={18} />
          <span>Request Payout (₹{Math.round(pendingPayout)})</span>
        </button>
      </div>

      {/* 4 Revenue Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
            Total Revenue Billed
          </span>
          <div className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
            ₹{Math.round(totalRevenue)}
          </div>
          <span className="text-xs sm:text-sm text-gray-400 mt-1.5 block font-semibold">
            From {completedJobsCount} completed jobs
          </span>
        </div>

        <div className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
            Platform Cut ({provider?.commission_percentage || 15}%)
          </span>
          <div className="text-3xl sm:text-4xl font-black text-amber-500">
            ₹{Math.round(platformCommission)}
          </div>
          <span className="text-xs sm:text-sm text-gray-400 mt-1.5 block font-semibold">
            Ozo Operations & Tech Fee
          </span>
        </div>

        <div className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
            Net Partner Share
          </span>
          <div className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400">
            ₹{Math.round(netEarnings)}
          </div>
          <span className="text-xs sm:text-sm text-gray-400 mt-1.5 block font-semibold">
            Labor + Parts Margin
          </span>
        </div>

        <div className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
            Available For Withdrawal
          </span>
          <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{Math.round(pendingPayout)}
          </div>
          <span className="text-xs sm:text-sm text-emerald-500 font-bold mt-1.5 block">
            Ready to transfer
          </span>
        </div>
      </div>

      {/* Payout History Ledger */}
      <div className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-3xl p-7 shadow-sm">
        <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-5 flex items-center gap-2.5">
          <FileCheck className="w-6 h-6 text-emerald-500" />
          <span>Settlement & Payout Transactions</span>
        </h3>

        {payoutHistory.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            <Clock className="w-10 h-10 text-gray-300 dark:text-white/20 mx-auto mb-3" />
            <p className="font-bold text-base">No previous payout settlements</p>
            <p className="text-xs sm:text-sm mt-1">Payout requests and bank transfers will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/10 text-xs font-black uppercase tracking-wider text-gray-400">
                  <th className="pb-3.5">Transfer Ref / UTR</th>
                  <th className="pb-3.5">Period</th>
                  <th className="pb-3.5">Gross</th>
                  <th className="pb-3.5">Net Deposited</th>
                  <th className="pb-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-semibold">
                {payoutHistory.map((payout) => (
                  <tr key={payout.id} className="text-gray-700 dark:text-gray-300">
                    <td className="py-3.5 font-mono font-bold">
                      {payout.utr_reference || `REQ-${payout.id?.slice(0, 8)}`}
                    </td>
                    <td className="py-3.5 text-gray-400">
                      {payout.period_start} to {payout.period_end}
                    </td>
                    <td className="py-3 font-mono">₹{payout.gross_earnings}</td>
                    <td className="py-3 font-mono font-black text-emerald-600 dark:text-emerald-400">
                      ₹{payout.net_payout}
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        payout.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {payout.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Withdrawal Request Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-left">
            <h3 className="text-base font-black text-gray-900 dark:text-white">
              Confirm Bank Settlement Request
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Funds will be deposited to your registered bank account or UPI ID.
            </p>

            <form onSubmit={handleWithdraw} className="py-4 space-y-4">
              <div>
                <label className="text-[11px] font-black uppercase text-gray-400">Withdrawal Amount (₹)</label>
                <input
                  type="number"
                  max={pendingPayout}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full mt-1 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-base font-black text-emerald-600 focus:outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Max available: ₹{Math.round(pendingPayout)}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isWithdrawing || !withdrawAmount || Number(withdrawAmount) <= 0}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black shadow-md transition-all"
                >
                  {isWithdrawing ? 'Submitting...' : 'Confirm Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
