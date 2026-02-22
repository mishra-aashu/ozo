import React, { useEffect } from 'react';
import OzoLogo from './OzoLogo';

const OzoSplashScreen = ({ onAnimationComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, 4500); // 4.5 seconds total duration (matches CSS overlay exit completion)
    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  return (
    <div 
      className="ozo-splash-overlay"
      onClick={() => { if (onAnimationComplete) onAnimationComplete(); }}
      title="Click to skip"
    >
      <style>{`
        .ozo-splash-overlay {
          position: fixed;
          inset: 0;
          background-color: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          overflow: hidden;
          user-select: none;
          will-change: opacity, transform, filter;
          transition: background-color 0.3s ease;
          animation: ozoOverlayExit 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 3.9s;
        }

        .dark .ozo-splash-overlay {
          background-color: #060608;
        }

        /* Cinematic Background Radial Glow */
        .ozo-splash-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(255, 0, 63, 0.08) 0%, rgba(255, 255, 255, 0) 75%);
          pointer-events: none;
        }

        .dark .ozo-splash-glow {
          background: radial-gradient(circle at center, rgba(255, 0, 63, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
        }

        /* High-tech Grid Mask */
        .ozo-splash-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(0, 0, 0, 0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.015) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(ellipse 60% 50% at 50% 50%, #000 70%, transparent 100%);
          -webkit-mask-image: radial-gradient(ellipse 60% 50% at 50% 50%, #000 70%, transparent 100%);
          pointer-events: none;
        }

        .dark .ozo-splash-grid {
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.012) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.012) 1px, transparent 1px);
        }

        /* Content Wrapper */
        .ozo-splash-content {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Wrapper for brand box and dust trail */
        .ozo-brand-box-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Dust particles trailing the sliding cart */
        .ozo-dust-particle {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 0, 63, 0.8) 0%, rgba(255, 0, 63, 0) 70%);
          pointer-events: none;
          opacity: 0;
          will-change: transform, opacity;
        }

        .ozo-dust-1 {
          width: 32px;
          height: 32px;
          left: -40px;
          top: 15px;
          animation: ozoDustTrail1 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.1s;
        }

        .ozo-dust-2 {
          width: 40px;
          height: 40px;
          left: -60px;
          top: 35px;
          animation: ozoDustTrail2 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.2s;
        }

        .ozo-dust-3 {
          width: 24px;
          height: 24px;
          left: -30px;
          top: 55px;
          animation: ozoDustTrail3 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.15s;
        }

        .ozo-dust-4 {
          width: 36px;
          height: 36px;
          left: -50px;
          top: -5px;
          animation: ozoDustTrail4 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.25s;
        }

        .ozo-brand-box {
          position: relative;
          width: 90px;
          height: 90px;
          display: flex;
          align-items: center;
          justify-content: center;
          will-change: transform, opacity;
          transform: translate3d(-100vw, 0, 0) scale(0.7) rotate(-15deg);
          opacity: 0;
          animation: ozoBrandBoxEntrance 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @media (min-width: 475px) {
          .ozo-brand-box {
            width: 110px;
            height: 110px;
          }
        }

        @media (min-width: 640px) {
          .ozo-brand-box {
            width: 140px;
            height: 140px;
          }
        }

        @media (min-width: 768px) {
          .ozo-brand-box {
            width: 180px;
            height: 180px;
          }
        }

        /* Sequenced Icons */
        .ozo-splash-icon {
          position: absolute;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          will-change: transform, opacity;
          transform: scale3d(0.4, 0.4, 1) rotate3d(0, 0, 1, -45deg);
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
        }

        @media (min-width: 640px) {
          .ozo-splash-icon {
            width: 56px;
            height: 56px;
          }
        }

        /* Staggered CSS Animation sequence: 4 items over 4 seconds */
        .ozo-icon-1 { animation: ozoIconSeqFirst 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0s; }
        .ozo-icon-2 { animation: ozoIconSeq 1s cubic-bezier(0.23, 1, 0.32, 1) forwards; animation-delay: 1.1s; }
        .ozo-icon-3 { animation: ozoIconSeq 1s cubic-bezier(0.23, 1, 0.32, 1) forwards; animation-delay: 2.0s; }
        .ozo-icon-4 { animation: ozoIconSeqFinal 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; animation-delay: 2.9s; }

        /* Text Layout */
        .ozo-text-container {
          height: 72px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding-left: 16px;
          overflow: hidden;
        }
        @media (min-width: 475px) {
          .ozo-text-container {
            height: 88px;
            padding-left: 20px;
          }
        }
        @media (min-width: 640px) {
          .ozo-text-container {
            height: 112px;
            padding-left: 32px;
          }
        }

        .ozo-title {
          color: #FF003F;
          font-size: 2.25rem;
          line-height: 1;
          font-weight: 900;
          font-family: 'Poppins', sans-serif;
          letter-spacing: 0.05em;
          text-shadow: 0 0 25px rgba(255, 0, 63, 0.25);
          opacity: 0;
          will-change: transform, opacity;
          transform: translate3d(-60px, 0, 0);
          animation: ozoTitleEntrance 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.8s;
        }
        @media (min-width: 475px) {
          .ozo-title {
            font-size: 2.75rem;
          }
        }
        @media (min-width: 640px) {
          .ozo-title {
            font-size: 3.5rem;
          }
        }
        @media (min-width: 768px) {
          .ozo-title {
            font-size: 5rem;
          }
        }

        .ozo-subtitle {
          color: rgba(255, 0, 63, 0.9);
          font-size: 0.45rem;
          font-weight: 700;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          margin-top: 4px;
          margin-left: 2px;
          opacity: 0;
          will-change: transform, opacity;
          transform: translate3d(0, 10px, 0);
          animation: ozoSubtitleEntrance 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 1.4s;
        }
        @media (min-width: 475px) {
          .ozo-subtitle {
            font-size: 0.55rem;
            letter-spacing: 0.4em;
            margin-top: 5px;
          }
        }
        @media (min-width: 640px) {
          .ozo-subtitle {
            font-size: 0.6rem;
            letter-spacing: 0.5em;
            margin-top: 6px;
            margin-left: 2px;
          }
        }
        @media (min-width: 768px) {
          .ozo-subtitle {
            font-size: 0.7rem;
            letter-spacing: 0.55em;
            margin-top: 8px;
            margin-left: 4px;
          }
        }

        /* Progress Bar */
        .ozo-progress-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: linear-gradient(90deg, #FF003F 0%, #FF5A87 50%, #FF003F 100%);
          will-change: width;
          width: 0%;
          animation: ozoProgressBarFill 3.9s linear forwards;
        }

        /* GPU Accelerated Keyframes */
        @keyframes ozoBrandBoxEntrance {
          0% {
            opacity: 0;
            transform: translate3d(-100vw, 0, 0) scale3d(0.7, 0.7, 1) rotate3d(0, 0, 1, -15deg);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale3d(1, 1, 1) rotate3d(0, 0, 1, 0deg);
          }
        }

        @keyframes ozoTitleEntrance {
          0% {
            opacity: 0;
            transform: translate3d(-60px, 0, 0);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes ozoSubtitleEntrance {
          0% {
            opacity: 0;
            transform: translate3d(0, 10px, 0);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes ozoIconSeqFirst {
          0%, 75% {
            opacity: 1;
            transform: scale3d(1, 1, 1) rotate3d(0, 0, 1, 0deg);
          }
          100% {
            opacity: 0;
            transform: scale3d(0.4, 0.4, 1) rotate3d(0, 0, 1, 45deg);
          }
        }

        @keyframes ozoIconSeq {
          0% {
            opacity: 0;
            transform: scale3d(0.4, 0.4, 1) rotate3d(0, 0, 1, -45deg);
          }
          15%, 85% {
            opacity: 1;
            transform: scale3d(1, 1, 1) rotate3d(0, 0, 1, 0deg);
          }
          100% {
            opacity: 0;
            transform: scale3d(0.4, 0.4, 1) rotate3d(0, 0, 1, 45deg);
          }
        }

        /* Final icon (Cart) animates in and stays visible */
        @keyframes ozoIconSeqFinal {
          0% {
            opacity: 0;
            transform: scale3d(0.4, 0.4, 1) rotate3d(0, 0, 1, -45deg);
          }
          20%, 100% {
            opacity: 1;
            transform: scale3d(1, 1, 1) rotate3d(0, 0, 1, 0deg);
          }
        }

        @keyframes ozoProgressBarFill {
          0% { width: 0%; }
          100% { width: 100%; }
        }

        @keyframes ozoDustTrail1 {
          0% {
            opacity: 0;
            transform: translate3d(-100vw, 0, 0) scale(0.2);
          }
          30% {
            opacity: 0.9;
            transform: translate3d(-60vw, -10px, 0) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translate3d(-120vw, -20px, 0) scale(1.8) filter(blur(6px));
          }
        }

        @keyframes ozoDustTrail2 {
          0% {
            opacity: 0;
            transform: translate3d(-100vw, 0, 0) scale(0.2);
          }
          30% {
            opacity: 0.8;
            transform: translate3d(-70vw, 15px, 0) scale(1.3);
          }
          100% {
            opacity: 0;
            transform: translate3d(-130vw, 30px, 0) scale(2.2) filter(blur(8px));
          }
        }

        @keyframes ozoDustTrail3 {
          0% {
            opacity: 0;
            transform: translate3d(-100vw, 0, 0) scale(0.2);
          }
          30% {
            opacity: 0.95;
            transform: translate3d(-50vw, 5px, 0) scale(1.1);
          }
          100% {
            opacity: 0;
            transform: translate3d(-110vw, 10px, 0) scale(1.5) filter(blur(5px));
          }
        }

        @keyframes ozoDustTrail4 {
          0% {
            opacity: 0;
            transform: translate3d(-100vw, 0, 0) scale(0.2);
          }
          30% {
            opacity: 0.75;
            transform: translate3d(-80vw, -15px, 0) scale(1.4);
          }
          100% {
            opacity: 0;
            transform: translate3d(-140vw, -30px, 0) scale(2.5) filter(blur(10px));
          }
        }

        @keyframes ozoOverlayExit {
          0% {
            opacity: 1;
            transform: scale3d(1, 1, 1);
            filter: blur(0px);
          }
          1% {
            pointer-events: none;
          }
          100% {
            opacity: 0;
            transform: scale3d(1.04, 1.04, 1);
            filter: blur(8px);
            pointer-events: none;
          }
        }
      `}</style>

      {/* Decorative Cinematic Effects */}
      <div className="ozo-splash-glow" />
      <div className="ozo-splash-grid" />

      {/* Content wrapper */}
      <div className="ozo-splash-content">
        {/* Red Icon Container */}
        {/* Red Icon Container Wrapper with Dust Trail */}
        <div className="ozo-brand-box-wrapper">
          {/* Dust Particles */}
          <div className="ozo-dust-particle ozo-dust-1" />
          <div className="ozo-dust-particle ozo-dust-2" />
          <div className="ozo-dust-particle ozo-dust-3" />
          <div className="ozo-dust-particle ozo-dust-4" />

          <div className="ozo-brand-box">
            <OzoLogo mode="logo" size="splash" />
          </div>
        </div>

        {/* Text Container */}
        <div className="ozo-text-container font-display">
          <OzoLogo
            mode="text"
            size="splash"
            textClassName="ozo-title flex items-baseline justify-center gap-1.5"
            subText="JO CHAHIYE, JAB CHAHIYE."
            subTextClassName="ozo-subtitle mt-1.5 ml-0.5"
          />
        </div>
      </div>

      {/* Loading Progress Bar */}
      <div className="ozo-progress-bar" />
    </div>
  );
};

export default OzoSplashScreen;
