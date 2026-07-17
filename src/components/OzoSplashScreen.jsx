import React, { useEffect, useRef, useState } from 'react';

const OzoSplashScreen = ({ onAnimationComplete }) => {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // If the video takes more than 3.5 seconds to start playing (due to extremely slow network),
    // we automatically skip the splash screen so the user doesn't get stuck on a loading screen.
    const loadTimeout = setTimeout(() => {
      if (isLoading) {
        console.log("Intro video load took too long on slow network. Skipping to app.");
        handleExit();
      }
    }, 3500);

    // Hard fallback timer (video is 10s)
    const fallbackTimer = setTimeout(() => {
      handleExit();
    }, 11000);

    return () => {
      clearTimeout(loadTimeout);
      clearTimeout(fallbackTimer);
    };
  }, [isLoading]);

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

  const handleCanPlayThrough = () => {
    setIsLoading(false);
    setHasStarted(true);
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.warn("Autoplay blocked or failed:", err);
      });
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
          background: radial-gradient(circle, #851c20 0%, #7d1a1d 60%, #761a1d 100%);
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

        /* Aspect Ratio Wrapper to contain the video layout */
        .ozo-video-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ozo-video-inner {
          position: relative;
          aspect-ratio: 16 / 9;
          width: 100%;
          max-height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        /* Desktop/Landscape screen limit to make the video smaller and elegant in the center */
        @media (min-aspect-ratio: 1/1) {
          .ozo-video-inner {
            max-width: 55%; /* Centered container is 55% of screen width */
            max-height: 60vh; /* Centered container is max 60% of screen height */
          }
        }

        .ozo-intro-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          pointer-events: none; /* Prevents clicks/taps on the video from triggering native browser controls */
          
          /* Radial mask fades video edges to 100% transparency so they blend seamlessly into overlay background */
          -webkit-mask-image: radial-gradient(50% 42% at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 100%);
          mask-image: radial-gradient(50% 42% at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 100%);
        }

        /* Premium Loader styling */
        .ozo-loader-container {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 99998;
          transition: opacity 0.3s ease;
        }

        .ozo-loader-logo {
          width: 150px;
          height: auto;
          margin-bottom: 24px;
          filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.25));
          animation: ozoLogoPulse 1.6s ease-in-out infinite;
        }

        .ozo-premium-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255, 255, 255, 0.15);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: ozoSpin 0.8s linear infinite;
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
          font-size: 0.82rem;
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

        @keyframes ozoSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes ozoLogoPulse {
          0%, 100% {
            transform: scale(0.96);
            opacity: 0.75;
          }
          50% {
            transform: scale(1.04);
            opacity: 1;
            filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.45));
          }
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
        {isLoading && !error && (
          <div className="ozo-loader-container">
            <img 
              src="/images/logo_transparent.png" 
              className="ozo-loader-logo" 
              alt="OZO Logo"
            />
            <div className="ozo-premium-spinner" />
          </div>
        )}

        {!error ? (
          <div className="ozo-video-wrapper">
            <div className="ozo-video-inner">
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
                preload="auto"
                onTimeUpdate={handleTimeUpdate}
                onCanPlayThrough={handleCanPlayThrough}
                onPlay={() => {
                  setIsLoading(false);
                  setHasStarted(true);
                }}
                onError={() => setError(true)}
              />
            </div>
          </div>
        ) : (
          <div className="text-white text-sm font-semibold opacity-60">Loading intro...</div>
        )}
      </div>
    </div>
  );
};

export default OzoSplashScreen;
