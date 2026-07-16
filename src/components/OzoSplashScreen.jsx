import React, { useEffect, useRef, useState } from 'react';

const OzoSplashScreen = ({ onAnimationComplete }) => {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [error, setError] = useState(false);

  // Fallback timer to ensure splash ends if video fails to load or play
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      handleExit();
    }, 11000); // 11s fallback (video is 10s)

    return () => clearTimeout(fallbackTimer);
  }, []);

  const handleExit = () => {
    setIsExiting(true);
  };

  // Exit animation wrapper before calling onAnimationComplete
  useEffect(() => {
    if (isExiting) {
      const exitTimer = setTimeout(() => {
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      }, 600); // Matches the CSS exit animation duration
      return () => clearTimeout(exitTimer);
    }
  }, [isExiting, onAnimationComplete]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const { currentTime, duration } = videoRef.current;
      // Start exit transition 0.6s before video ends to make a cinematic blend
      if (duration && currentTime >= duration - 0.6) {
        handleExit();
      }
    }
  };

  const handleSkip = (e) => {
    e.stopPropagation();
    handleExit();
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      const newMuted = !videoRef.current.muted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  return (
    <div 
      className={`ozo-splash-overlay ${isExiting ? 'ozo-exiting' : ''}`}
      onClick={handleSkip}
      title="Click to skip"
    >
      <style>{`
        .ozo-splash-overlay {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle, #821b1f 0%, #761a1d 100%); /* Flawlessly matches video background colors */
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          overflow: hidden;
          user-select: none;
          will-change: opacity, transform, filter;
        }

        .ozo-splash-overlay.ozo-exiting {
          animation: ozoOverlayExit 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .ozo-video-container {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ozo-intro-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1.08); /* Slightly zoomed in properly as requested */
          transition: opacity 0.5s ease;
          opacity: ${hasStarted ? 1 : 0};
          pointer-events: none; /* Prevents clicks/taps on the video from triggering native browser controls */
        }

        /* Absolutely hide any native browser media player controls / logo panels */
        video::-webkit-media-controls,
        video::-webkit-media-controls-panel,
        video::-webkit-media-controls-panel-container,
        video::-webkit-media-controls-start-panel-button,
        video::-webkit-media-controls-play-button,
        video::-webkit-media-controls-enclosure {
          display: none !important;
          -webkit-appearance: none !important;
          opacity: 0 !important;
        }

        /* Premium Controls styling */
        .ozo-splash-control {
          position: absolute;
          z-index: 100000;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #ffffff;
          padding: 10px 20px;
          border-radius: 9999px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .ozo-splash-control:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px) scale(1.04);
          border-color: rgba(255, 255, 255, 0.25);
        }

        .ozo-splash-control:active {
          transform: translateY(0px) scale(0.98);
        }

        .ozo-splash-mute {
          bottom: 32px;
          left: 32px;
        }

        .ozo-splash-skip {
          bottom: 32px;
          right: 32px;
          letter-spacing: 0.05em;
        }

        @keyframes ozoOverlayExit {
          0% {
            opacity: 1;
            transform: scale3d(1, 1, 1);
            filter: blur(0px);
          }
          100% {
            opacity: 0;
            transform: scale3d(1.04, 1.04, 1);
            filter: blur(8px);
            pointer-events: none;
          }
        }
      `}</style>

      <div className="ozo-video-container">
        {!error ? (
          <video
            ref={videoRef}
            className="ozo-intro-video"
            src="/A_professional_D_minimalist_t.mp4"
            autoPlay
            muted={isMuted}
            playsInline
            controls={false}
            controlsList="nodownload nofullscreen noremoteplayback"
            disablePictureInPicture
            disableRemotePlayback
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setHasStarted(true)}
            onError={() => setError(true)}
          />
        ) : (
          <div className="text-white text-sm font-semibold opacity-60">Loading intro...</div>
        )}

        {/* Audio Mute/Unmute Toggle */}
        <button 
          className="ozo-splash-control ozo-splash-mute" 
          onClick={toggleMute}
          aria-label={isMuted ? "Unmute audio" : "Mute audio"}
        >
          {isMuted ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4.5 h-4.5">
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.063.922-2.063 2.063v4.875c0 1.141.922 2.062 2.063 2.062h1.932l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z" />
              </svg>
              <span>Unmute</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4.5 h-4.5">
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.063.922-2.063 2.063v4.875c0 1.141.922 2.062 2.063 2.062h1.932l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zM18.563 12c0-2.183-1.374-4.05-3.313-4.785a.75.75 0 10-.53 1.403C16.1 9.1 17.063 10.45 17.063 12c0 1.55-.964 2.9-2.343 3.418a.75.75 0 10.53 1.403C17.189 16.05 18.563 14.183 18.563 12z" />
                <path d="M20.43 5.47a.75.75 0 00-1.06 1.06 9.71 9.71 0 010 10.94.75.75 0 101.06 1.06 11.21 11.21 0 000-13.06z" />
              </svg>
              <span>Mute</span>
            </>
          )}
        </button>

        {/* Skip Button */}
        <button 
          className="ozo-splash-control ozo-splash-skip" 
          onClick={handleSkip}
          aria-label="Skip Intro"
        >
          <span>Skip Intro</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4.5 h-4.5">
            <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default OzoSplashScreen;
