import React from 'react';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { useLanguageStore, LANGUAGES } from '../stores/languageStore';

const LanguageModal = ({ isOpen, onClose }) => {
  const { language, setLanguage } = useLanguageStore();

  if (!isOpen) return null;

  const changeLanguageViaBrowser = (langCode) => {
    // 1. Target Google's hidden native select element
    const googleSelect = document.querySelector('.goog-te-combo');
    
    if (googleSelect) {
      // 2. Set language code
      googleSelect.value = langCode; 
      
      // 3. Dispatch native event to trigger Google translation
      googleSelect.dispatchEvent(new Event('change'));
    }
    
    // 4. Update the Zustand store for React state consistency
    setLanguage(langCode);
    
    // 5. Update the googtrans cookie for browser persistence
    if (langCode === 'en') {
      const domains = [
        window.location.hostname,
        '.' + window.location.hostname,
        ''
      ];
      const parts = window.location.hostname.split('.');
      if (parts.length >= 2) {
        const rootDomain = parts.slice(-2).join('.');
        domains.push(rootDomain);
        domains.push('.' + rootDomain);
      }
      domains.forEach(d => {
        const domainAttr = d ? `; domain=${d}` : '';
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/${domainAttr}`;
      });
    } else {
      document.cookie = `googtrans=/en/${langCode}; path=/;`;
      document.cookie = `googtrans=/en/${langCode}; path=/; domain=${window.location.hostname};`;
      document.cookie = `googtrans=/en/${langCode}; path=/; domain=.${window.location.hostname};`;
      const parts = window.location.hostname.split('.');
      if (parts.length >= 2) {
        const rootDomain = parts.slice(-2).join('.');
        document.cookie = `googtrans=/en/${langCode}; path=/; domain=${rootDomain};`;
        document.cookie = `googtrans=/en/${langCode}; path=/; domain=.${rootDomain};`;
      }
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Premium Light Theme Container matching the design system */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white border border-gray-100 shadow-2xl rounded-3xl p-6 w-[90%] max-w-sm relative z-10 text-gray-800"
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1.5 h-6 bg-[#E23744] rounded-full"></div>
          <h2 className="text-xl font-bold text-gray-900">Select Language</h2>
        </div>
        <p className="text-gray-500 text-xs mb-6">Choose your preferred language for the OZO application.</p>

        {/* Language Options List */}
        <div className="flex flex-col gap-3">
          {LANGUAGES.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => changeLanguageViaBrowser(lang.code)}
                className={`w-full flex items-center justify-between border py-3.5 px-4 rounded-xl transition-all duration-200 text-sm focus:outline-none ${
                  isSelected 
                    ? 'border-[#E23744] bg-[#E23744]/5 text-[#E23744] font-bold' 
                    : 'border-gray-200/80 bg-gray-50/50 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <span className={isSelected ? 'text-[#E23744]' : 'text-gray-700'}>{lang.label}</span>
                {isSelected && <Check size={18} strokeWidth={3} className="text-[#E23744]" />}
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default LanguageModal;
