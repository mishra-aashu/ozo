import React from 'react';
import { AlertCircle } from 'lucide-react';

export const OzoLoadingGuard = ({ isLoading, isError, isEmpty, skeleton, children, fallback, errorFallback, errorMsg, onRetry }) => {
  if (isLoading) return skeleton;
  
  if (isError) {
    if (errorFallback) return errorFallback;
    return (
      <div className="card-premium p-12 text-center rounded-[2.5rem] max-w-md mx-auto border border-dashed border-red-100 dark:border-red-900/20 my-8">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-ozo-red rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
           <AlertCircle size={28} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Kuchh gadbad hui!</h2>
        <p className="text-ozo-gray dark:text-gray-400 mb-6 text-sm">
          {errorMsg || 'Data load karne mein samasya aayi hai. Kripya apna internet connection check karein aur punah prayas karein.'}
        </p>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="btn btn-primary"
          >
            Retry Loading
          </button>
        )}
      </div>
    );
  }
  
  if (isEmpty) return fallback || <div className="text-zinc-500 p-4 text-center text-sm">Yahan koi data nahi hai.</div>;
  
  return children;
};

export default OzoLoadingGuard;
