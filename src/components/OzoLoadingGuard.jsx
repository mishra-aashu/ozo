import React from 'react';
import { AlertCircle } from 'lucide-react';

export const OzoLoadingGuard = ({ isLoading, isError, isEmpty, skeleton, children, fallback, errorFallback, errorMsg, onRetry }) => {
  if (isLoading) return skeleton;
  
  if (isError) {
    if (errorFallback) return errorFallback;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const isAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
    const isNoNavPage = typeof window !== 'undefined' && ['/select-location', '/auth'].includes(window.location.pathname);
    const showBottomNav = isMobile && !isAdmin && !isNoNavPage;

    return (
      <div 
        className="fixed left-0 right-0 z-40 bg-gray-50/95 dark:bg-[#0c0c14]/95 backdrop-blur-sm flex items-center justify-center p-6 transition-all"
        style={{
          top: 'var(--header-height, 136px)',
          bottom: showBottomNav ? '80px' : '0px'
        }}
      >
        <div className="card-premium p-8 md:p-12 text-center rounded-[2.5rem] max-w-md w-full border border-dashed border-red-100 dark:border-red-900/20 shadow-2xl bg-white dark:bg-[#151521] my-auto">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-[#E23744] rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
             <AlertCircle size={28} />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Unable to load data</h2>
          <p className="text-ozo-gray dark:text-gray-400 mb-6 text-sm leading-relaxed">
            {errorMsg || 'We encountered a temporary issue while retrieving the requested information. Please check your connection and try again.'}
          </p>
          {onRetry && (
            <button 
              onClick={onRetry}
              className="px-8 py-3 rounded-2xl bg-gradient-ozo text-white font-bold shadow-ozo hover:scale-[1.02] active:scale-95 transition-all text-sm cursor-pointer"
            >
              Retry Loading
            </button>
          )}
        </div>
      </div>
    );
  }
  
  if (isEmpty) return fallback || <div className="text-zinc-500 p-4 text-center text-sm">No items found.</div>;
  
  return children;
};

export default OzoLoadingGuard;
