import React from 'react'

export default function ProductSkeleton({ viewMode = 'grid', count = 8 }) {
  if (viewMode === 'list') {
    return (
      <div className="grid grid-cols-1 gap-2 sm:gap-6">
        {[...Array(count)].map((_, i) => (
          <div
            key={i}
            className="flex gap-5 p-5 bg-white dark:bg-[#111111] rounded-3xl shadow-premium border border-white/20 dark:border-white/5"
          >
            {/* Image placeholder */}
            <div className="w-32 h-32 rounded-2xl shimmer flex-shrink-0" />
            
            {/* Content info */}
            <div className="flex-1 flex flex-col justify-center space-y-3">
              {/* Category */}
              <div className="w-20 h-3 shimmer rounded" />
              {/* Title */}
              <div className="w-3/4 h-5 shimmer rounded-lg" />
              {/* Unit */}
              <div className="w-16 h-3 shimmer rounded" />
              {/* Price */}
              <div className="flex items-center gap-2 pt-1">
                <div className="w-24 h-6 shimmer rounded" />
              </div>
            </div>
            
            {/* Right side wishlist & button */}
            <div className="flex flex-col items-end justify-between py-1">
              <div className="w-10 h-10 rounded-2xl shimmer" />
              <div className="w-24 h-10 rounded-2xl shimmer" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Grid view skeleton (default)
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-6`}>
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#111111] rounded-[2.5rem] p-4 h-80 border border-gray-100 dark:border-white/5 shadow-sm flex flex-col justify-between"
        >
          <div className="space-y-4">
            {/* Image container placeholder */}
            <div className="w-full h-36 shimmer rounded-2xl" />
            
            {/* Title / Info placeholder */}
            <div className="space-y-2">
              <div className="w-1/3 h-3 shimmer rounded" />
              <div className="w-3/4 h-4 shimmer rounded" />
              <div className="w-1/2 h-3.5 shimmer rounded" />
            </div>
          </div>
          
          {/* Price & button footer */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-50 dark:border-white/5">
            <div className="w-1/3 h-5 shimmer rounded" />
            <div className="w-20 h-8 shimmer rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}
