import React from 'react';

const EarthGlobeBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-gray-50/95 dark:bg-[#080808]/98 transition-colors duration-300 flex items-center justify-center">
      {/* Grid Lines Background */}
      <div 
        className="absolute inset-0" 
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(128,128,128,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 12%, #000 70%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 60% 50% at 50% 12%, #000 70%, transparent 100%)'
        }}
      />
      
      {/* Glowing Orbs */}
      <div 
        className="absolute left-1/2 top-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-80 blur-[60px] dark:opacity-60 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at center, rgba(239,68,68,0.12) 0%, transparent 70%)'
        }}
      />
      
      {/* Premium Rotating Earth Globe */}
      <div className="relative w-[75vw] h-[75vw] max-w-[340px] max-h-[340px] opacity-85 dark:opacity-75 transition-opacity duration-300 mt-20">
        <svg 
          viewBox="95 5 170 170" 
          className="w-full h-full text-gray-400 dark:text-white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* 3D Spherical Shading Gradient */}
            <radialGradient id="globe-shading-shared" cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.15)" />
              <stop offset="50%" stopColor="rgba(0, 0, 0, 0)" />
              <stop offset="100%" stopColor="rgba(0, 0, 0, 0.75)" />
            </radialGradient>

            {/* Glowing Outer Atmospheric Glow */}
            <radialGradient id="globe-halo-shared" cx="50%" cy="50%" r="50%">
              <stop offset="85%" stopColor="#ef4444" stopOpacity="0" />
              <stop offset="95%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Glowing Outer Atmosphere Ring */}
          <circle cx="180" cy="90" r="92" fill="url(#globe-halo-shared)" />

          {/* Ocean / Sphere Base */}
          <circle 
            cx="180" 
            cy="90" 
            r="85" 
            className="fill-gray-100/50 dark:fill-[#0a0d14] stroke-gray-200/50 dark:stroke-red-950/20" 
            strokeWidth="1" 
          />

          {/* Clip Path for Continents */}
          <clipPath id="globe-clip-shared">
            <circle cx="180" cy="90" r="85" />
          </clipPath>

          {/* Rotating Landmasses */}
          <g clipPath="url(#globe-clip-shared)">
            <g>
              {/* First Map Copy */}
              <g transform="translate(0, 0)">
                {/* North America */}
                <path className="fill-gray-300/40 dark:fill-red-950/20 stroke-gray-400/50 dark:stroke-red-500/25 stroke-linejoin-round" strokeWidth="0.5" d="M30,25 L65,15 L90,15 L125,25 L115,45 L105,42 L85,75 L75,72 L72,82 L65,78 L62,65 L48,65 L48,55 L35,45 Z" />
                {/* South America */}
                <path className="fill-gray-300/40 dark:fill-red-950/20 stroke-gray-400/50 dark:stroke-red-500/25 stroke-linejoin-round" strokeWidth="0.5" d="M85,78 L105,82 L120,95 L125,110 L105,145 L95,160 L90,160 L90,135 L80,110 L78,92 Z" />
                {/* Eurasia */}
                <path className="fill-gray-300/40 dark:fill-red-950/20 stroke-gray-400/50 dark:stroke-red-500/25 stroke-linejoin-round" strokeWidth="0.5" d="M165,25 L190,18 L240,15 L300,18 L335,22 L330,42 L315,55 L305,75 L285,82 L265,72 L250,78 L235,68 L215,70 L205,58 L190,58 L180,48 L162,45 L160,32 Z" />
                {/* Africa */}
                <path className="fill-gray-300/40 dark:fill-red-950/20 stroke-gray-400/50 dark:stroke-red-500/25 stroke-linejoin-round" strokeWidth="0.5" d="M165,52 L185,50 L205,62 L215,62 L225,75 L228,95 L210,122 L200,140 L195,140 L190,110 L170,92 L158,82 L155,68 Z" />
                {/* Australia */}
                <path className="fill-gray-300/40 dark:fill-red-950/20 stroke-gray-400/50 dark:stroke-red-500/25 stroke-linejoin-round" strokeWidth="0.5" d="M290,105 L315,102 L325,115 L322,128 L308,132 L292,125 L285,115 Z" />
                {/* Antarctica */}
                <path className="fill-gray-300/40 dark:fill-red-950/20 stroke-gray-400/50 dark:stroke-red-500/25 stroke-linejoin-round" strokeWidth="0.5" d="M10,172 H350 L330,178 L280,176 L210,178 L150,176 L80,178 L30,175 Z" />
                
                {/* Connected Hubs (Copy 1) */}
                <circle cx="250" cy="75" r="2" className="fill-ozo-red animate-pulse" />
                <circle cx="250" cy="75" r="4.5" className="fill-ozo-red/40 animate-ping" />
                
                <circle cx="180" cy="45" r="1.5" className="fill-ozo-red/80" />
                <circle cx="85" cy="45" r="1.5" className="fill-ozo-red/80" />
              </g>

              {/* Second Map Copy (for wrapping rotation) */}
              <g transform="translate(360, 0)">
                {/* North America */}
                <path className="fill-gray-300/40 dark:fill-red-950/20 stroke-gray-400/50 dark:stroke-red-500/25 stroke-linejoin-round" strokeWidth="0.5" d="M30,25 L65,15 L90,15 L125,25 L115,45 L105,42 L85,75 L75,72 L72,82 L65,78 L62,65 L48,65 L48,55 L35,45 Z" />
                {/* South America */}
                <path className="fill-gray-300/40 dark:fill-red-950/20 stroke-gray-400/50 dark:stroke-red-500/25 stroke-linejoin-round" strokeWidth="0.5" d="M85,78 L105,82 L120,95 L125,110 L105,145 L95,160 L90,160 L90,135 L80,110 L78,92 Z" />
                {/* Eurasia */}
                <path className="fill-gray-300/40 dark:fill-red-950/20 stroke-gray-400/50 dark:stroke-red-500/25 stroke-linejoin-round" strokeWidth="0.5" d="M165,25 L190,18 L240,15 L300,18 L335,22 L330,42 L315,55 L305,75 L285,82 L265,72 L250,78 L235,68 L215,70 L205,58 L190,58 L180,48 L162,45 L160,32 Z" />
                {/* Africa */}
                <path className="fill-gray-300/40 dark:fill-red-950/20 stroke-gray-400/50 dark:stroke-red-500/25 stroke-linejoin-round" strokeWidth="0.5" d="M165,52 L185,50 L205,62 L215,62 L225,75 L228,95 L210,122 L200,140 L195,140 L190,110 L170,92 L158,82 L155,68 Z" />
                {/* Australia */}
                <path className="fill-gray-300/40 dark:fill-red-950/20 stroke-gray-400/50 dark:stroke-red-500/25 stroke-linejoin-round" strokeWidth="0.5" d="M290,105 L315,102 L325,115 L322,128 L308,132 L292,125 L285,115 Z" />
                {/* Antarctica */}
                <path className="fill-gray-300/40 dark:fill-red-950/20 stroke-gray-400/50 dark:stroke-red-500/25 stroke-linejoin-round" strokeWidth="0.5" d="M10,172 H350 L330,178 L280,176 L210,178 L150,176 L80,178 L30,175 Z" />
                
                {/* Connected Hubs (Copy 2) */}
                <circle cx="250" cy="75" r="2" className="fill-ozo-red animate-pulse" />
                <circle cx="250" cy="75" r="4.5" className="fill-ozo-red/40 animate-ping" />
                
                <circle cx="180" cy="45" r="1.5" className="fill-ozo-red/80" />
                <circle cx="85" cy="45" r="1.5" className="fill-ozo-red/80" />
              </g>

              {/* Horizontal Scroll Translation Loop */}
              <animateTransform
                attributeName="transform"
                type="translate"
                from="0,0"
                to="-360,0"
                dur="32s"
                repeatCount="indefinite"
              />
            </g>
          </g>

          {/* 3D Sphere Spherical Shading Overlay */}
          <circle cx="180" cy="90" r="85" fill="url(#globe-shading-shared)" pointerEvents="none" />

          {/* Spherical Graticule Grid Lines (Latitudes/Longitudes Overlay) */}
          <g clipPath="url(#globe-clip-shared)" pointerEvents="none">
            {/* Latitudes */}
            <line x1="95" y1="90" x2="265" y2="90" className="stroke-gray-300/30 dark:stroke-white/10" strokeWidth="0.5" />
            <ellipse cx="180" cy="65" rx="81" ry="18" fill="none" className="stroke-gray-300/20 dark:stroke-white/5" strokeWidth="0.5" />
            <ellipse cx="180" cy="40" rx="69" ry="12" fill="none" className="stroke-gray-300/20 dark:stroke-white/5" strokeWidth="0.5" />
            <ellipse cx="180" cy="115" rx="81" ry="18" fill="none" className="stroke-gray-300/20 dark:stroke-white/5" strokeWidth="0.5" />
            <ellipse cx="180" cy="140" rx="69" ry="12" fill="none" className="stroke-gray-300/20 dark:stroke-white/5" strokeWidth="0.5" />
            
            {/* Longitudes */}
            <line x1="180" y1="5" x2="180" y2="175" className="stroke-gray-300/30 dark:stroke-white/10" strokeWidth="0.5" />
            <ellipse cx="180" cy="90" rx="30" ry="85" fill="none" className="stroke-gray-300/25 dark:stroke-white/10" strokeWidth="0.5" />
            <ellipse cx="180" cy="90" rx="60" ry="85" fill="none" className="stroke-gray-300/15 dark:stroke-white/5" strokeWidth="0.5" />
          </g>

          {/* Tilted Satellite Orbit */}
          <g transform="rotate(-25 180 90)">
            <ellipse 
              cx="180" 
              cy="90" 
              rx="105" 
              ry="28" 
              fill="none" 
              className="stroke-gray-300/40 dark:stroke-white/20" 
              strokeWidth="0.75" 
              strokeDasharray="3 3" 
            />
            
            {/* Orbiting Pulse Node */}
            <g>
              <circle cx="285" cy="90" r="2.5" className="fill-ozo-red" />
              <circle cx="285" cy="90" r="6" className="fill-ozo-red/30 animate-ping" />
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 180 90"
                to="360 180 90"
                dur="12s"
                repeatCount="indefinite"
              />
            </g>
          </g>
        </svg>
      </div>

      {/* Smooth bottom gradient fade */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-gray-50 to-transparent dark:from-[#080808] to-transparent pointer-events-none" />
    </div>
  );
};

export default EarthGlobeBackground;
