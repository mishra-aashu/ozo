import React, { useState } from 'react'
import { Store, RefreshCw, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'

const MartAdmin = ({ mart, order, marts, onAssignMart }) => {
  const [isAssigning, setIsAssigning] = useState(null)
  const [showReassignList, setShowReassignList] = useState(false)

  const isOrderActive = order && !['delivered', 'DELIVERED_VERIFYING', 'COMPLETED', 'cancelled', 'CANCELLED_BY_USER'].includes(order.status)

  const activeMarts = marts.filter(m => m.is_active)
  const offlineMarts = marts.filter(m => !m.is_active)

  const handleAssign = async (martId) => {
    setIsAssigning(martId)
    await onAssignMart(martId)
    setIsAssigning(null)
    setShowReassignList(false)
  }

  const renderMartsList = () => {
    if (!isOrderActive) return null

    return (
      <div className="mt-4 pt-4 border-t border-gray-150 dark:border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-ozo-red" />
            Select Mart to Dispatch Order
          </h5>
        </div>

        {marts.length === 0 ? (
          <div className="p-4 bg-gray-50/30 dark:bg-white/[0.01] rounded-xl border border-gray-100 dark:border-white/5 text-center text-xs text-gray-400">
            <AlertCircle className="w-4 h-4 text-amber-500 mx-auto mb-1.5" />
            No marts available in the system.
          </div>
        ) : (
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {/* Active Marts */}
            {activeMarts.map((m) => {
              const isCurrent = mart?.id === m.id
              return (
                <div 
                  key={m.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 group/item ${
                    isCurrent 
                      ? 'bg-ozo-red/5 border-ozo-red/30' 
                      : 'bg-white dark:bg-white/[0.02] hover:bg-gray-50 dark:hover:bg-white/[0.04] border-gray-100 dark:border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase border ${
                      isCurrent 
                        ? 'bg-ozo-red/10 text-ozo-red border-ozo-red/20' 
                        : 'bg-ozo-red/5 text-ozo-red dark:text-ozo-red/80 border-ozo-red/10'
                    }`}>
                      {m.name?.slice(0, 2) || 'MT'}
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-bold text-gray-900 dark:text-white text-xs flex items-center gap-1.5">
                        {m.name || 'OZO Mart'}
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" title="Online / Live" />
                      </div>
                      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                        {m.slug || 'active-mart'}
                      </div>
                    </div>
                  </div>

                  {isCurrent ? (
                    <span className="text-[10px] font-black uppercase text-ozo-red flex items-center gap-1 px-3 py-1.5 bg-ozo-red/10 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Assigned
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAssign(m.id)}
                      disabled={isAssigning !== null}
                      className="px-3 py-1.5 bg-gradient-ozo hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-sm"
                    >
                      {isAssigning === m.id ? 'Assigning...' : 'Assign'}
                    </button>
                  )}
                </div>
              )
            })}

            {/* Offline Marts */}
            {offlineMarts.map((m) => {
              const isCurrent = mart?.id === m.id
              return (
                <div 
                  key={m.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-xl opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 text-gray-450 flex items-center justify-center font-bold text-xs uppercase border border-gray-200 dark:border-white/5">
                      {m.name?.slice(0, 2) || 'MT'}
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-bold text-gray-900 dark:text-white text-xs flex items-center gap-1.5">
                        {m.name || 'OZO Mart'}
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Offline / Closed" />
                      </div>
                      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                        {m.slug || 'offline-mart'} (Closed)
                      </div>
                    </div>
                  </div>

                  {isCurrent ? (
                    <span className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                      Assigned
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAssign(m.id)}
                      disabled={isAssigning !== null}
                      className="px-3 py-1.5 bg-gray-200 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-wider rounded-lg cursor-pointer hover:bg-gray-300 dark:hover:bg-white/10 transition-colors"
                    >
                      {isAssigning === m.id ? 'Assigning...' : 'Assign (Offline)'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (!mart) {
    return (
      <div className="p-5 bg-gradient-to-br from-gray-50/80 to-gray-50/30 dark:from-white/[0.03] dark:to-transparent rounded-2xl border border-gray-100 dark:border-white/5 space-y-4 hover:border-ozo-red/20 dark:hover:border-ozo-red/10 transition-all duration-300 shadow-sm relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-ozo-red/10 rounded-full blur-xl group-hover:bg-ozo-red/20 transition-all duration-500 pointer-events-none" />

        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
          <h4 className="text-sm font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Store className="w-4 h-4 text-ozo-red" />
            Supermarket Mart Assignment
          </h4>
          <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
            Unassigned
          </span>
        </div>

        <div className="flex flex-col items-center justify-center text-center py-6 bg-gray-50/50 dark:bg-white/[0.01] rounded-xl border border-dashed border-gray-200 dark:border-white/10 p-4">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-2">
            <Store className="w-5 h-5 animate-pulse" />
          </div>
          <h5 className="text-xs font-extrabold text-gray-700 dark:text-gray-300">No Mart Assigned</h5>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 max-w-[200px]">
            Please select a mart to dispatch this order for fulfillment.
          </p>
        </div>

        {renderMartsList()}
      </div>
    )
  }

  return (
    <div className="p-5 bg-gradient-to-br from-gray-50/80 to-gray-50/30 dark:from-white/[0.03] dark:to-transparent rounded-2xl border border-gray-100 dark:border-white/5 space-y-4 hover:border-ozo-red/20 dark:hover:border-ozo-red/10 transition-all duration-300 shadow-sm relative overflow-hidden group">
      {/* Decorative background glow */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-ozo-red/10 rounded-full blur-xl group-hover:bg-ozo-red/20 transition-all duration-500 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
        <h4 className="text-sm font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
          <Store className="w-4 h-4 text-ozo-red" />
          Supermarket Mart Assignment
        </h4>
        <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
          Assigned
        </span>
      </div>

      {/* Mart Info */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-ozo-red/10 text-ozo-red flex items-center justify-center font-extrabold text-sm uppercase border border-ozo-red/20 shadow-inner">
          {mart.name?.slice(0, 2) || 'MT'}
        </div>
        <div className="space-y-1">
          <div className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
            {mart.name || 'OZO Mart'}
            <span className={`w-1.5 h-1.5 rounded-full ${mart.is_active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          </div>
          <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
            Slug: {mart.slug || 'mart-details'}
          </div>
        </div>
      </div>

      {/* Reassign mart option */}
      {isOrderActive && (
        <div className="pt-2 border-t border-gray-100 dark:border-white/5">
          <button
            type="button"
            onClick={() => setShowReassignList(!showReassignList)}
            className="w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-750 dark:text-gray-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border border-gray-200/50 dark:border-white/5 flex items-center justify-center gap-1.5"
          >
            {showReassignList ? 'Cancel Reassignment' : 'Reassign Mart'}
            {showReassignList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showReassignList && renderMartsList()}
        </div>
      )}
    </div>
  )
}

export default MartAdmin
