import React from 'react';

/**
 * Reusable branding component for OZO Mart.
 * Supports rendering the logo image, the text, or both with uniform styling and high-contrast filters.
 */
export default function OzoLogo({
  mode = 'both', // 'both' | 'logo' | 'text'
  size = 'md',   // 'sm' | 'md' | 'lg' | 'xl' | 'splash'
  admin = false, // renders 'Admin' suffix next to mart
  subText = '',  // optional subtitle text
  subTextClassName = '',
  centered = false,
  className = '',
  imgClassName = '',
  textClassName = '',
}) {
  // Logo image dimensions mapping
  const imgSizes = {
    sm: 'w-[44px] h-[44px] xs:w-[52px] xs:h-[52px] md:w-[64px] md:h-[64px]',
    md: 'w-[56px] h-[56px]',
    lg: 'w-[72px] h-[72px]',
    xl: 'w-[110px] h-[110px]',
    splash: 'w-[90px] h-[90px] xs:w-[110px] xs:h-[110px] sm:w-[140px] sm:h-[140px] md:w-[180px] md:h-[180px]',
  };

  // Brand title font size mapping
  const textSizes = {
    sm: 'text-lg xs:text-xl md:text-3xl',
    md: 'text-xl md:text-2xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
    splash: 'text-2xl xs:text-3xl sm:text-4xl md:text-5xl',
  };

  const selectedImgSize = imgSizes[size] || size;
  const selectedTextSize = textSizes[size] || 'text-xl';

  const renderLogo = () => (
    <div 
      className={`${selectedImgSize} flex items-center justify-center flex-shrink-0 ${imgClassName}`}
    >
      <img
        src="/images/logo_transparent.png"
        alt="OZO Logo"
        className="w-full h-full object-contain flex-shrink-0"
        style={{
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.12))"
        }}
      />
    </div>
  );

  const renderText = () => (
    <div className={`flex flex-col ${centered ? 'items-center' : 'items-start'} leading-none`}>
      <span className={`${selectedTextSize} font-display font-black tracking-tighter notranslate flex items-baseline gap-0.5 ${textClassName}`} translate="no">
        <span className="text-gradient">OZO</span>
        <span 
          style={{ fontFamily: "'Dancing Script', cursive" }} 
          className="text-amber-600 dark:text-yellow-400 font-bold text-[0.95em] tracking-wide normal-case translate-y-[-1px] select-none"
        >
          mart
        </span>
        {admin && (
          <span className="text-gray-500 dark:text-gray-400 font-semibold text-[0.75em] tracking-normal ml-1">
            Admin
          </span>
        )}
      </span>
      {subText && (
        <span className={`text-[8px] md:text-[9px] font-black text-gray-500 dark:text-gray-400 tracking-wider uppercase leading-none mt-1 ${subTextClassName}`}>
          {subText}
        </span>
      )}
    </div>
  );

  if (mode === 'logo') {
    return renderLogo();
  }

  if (mode === 'text') {
    return renderText();
  }

  return (
    <div className={`flex ${centered ? 'flex-col items-center justify-center' : 'items-center gap-2.5'} ${className}`}>
      {renderLogo()}
      {renderText()}
    </div>
  );
}
