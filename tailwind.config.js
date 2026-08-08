const withOpacity = (variableName, fallbackRgb) => {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableName}, ${fallbackRgb}), ${opacityValue})`
    }
    return `rgb(var(${variableName}, ${fallbackRgb}))`
  }
}

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // OZO Primary Colors - Red & Green Theme
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        secondary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        // Custom OZO Colors
        ozo: {
          red: withOpacity('--color-ozo-red-rgb', '226, 55, 68'),
          'red-light': withOpacity('--color-ozo-red-light-rgb', '255, 107, 107'),
          'red-dark': withOpacity('--color-ozo-red-dark-rgb', '196, 30, 58'),
          green: withOpacity('--color-ozo-green-rgb', '13, 158, 79'),
          'green-light': withOpacity('--color-ozo-green-light-rgb', '46, 204, 113'),
          'green-dark': withOpacity('--color-ozo-green-dark-rgb', '10, 123, 62'),
          yellow: withOpacity('--color-ozo-yellow-rgb', '255, 184, 0'),
          orange: withOpacity('--color-ozo-orange-rgb', '255, 107, 53'),
          gray: '#686B78',
          'gray-light': '#93959F',
          'gray-lighter': '#D4D5D9',
          'gray-bg': '#F8F8F8',
          dark: '#1C1C1C',
        },
        // Custom Gray Steps
        gray: {
          150: '#F0F2F5',
          250: '#E1E5EB',
          350: '#CDD2DA',
          450: '#8E9AA8',
          550: '#5F6C7D',
          650: '#465362',
          750: '#2D3845',
          850: '#1D2530',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'ozo': '0 4px 14px 0 rgba(var(--color-ozo-red-rgb, 226, 55, 68), 0.2)',
        'ozo-lg': '0 10px 40px 0 rgba(var(--color-ozo-red-rgb, 226, 55, 68), 0.3)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 25px rgba(0, 0, 0, 0.15)',
        'bottom-nav': '0 -4px 20px rgba(0, 0, 0, 0.1)',
        'premium': '0 20px 50px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        'slide-left': 'slideLeft 0.4s ease-out',
        'slide-right': 'slideRight 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      backgroundImage: {
        'gradient-ozo': 'linear-gradient(135deg, var(--color-ozo-red, #E23744) 0%, var(--color-ozo-red-dark, #C41E3A) 100%)',
        'gradient-green': 'linear-gradient(135deg, var(--color-ozo-green, #0D9E4F) 0%, var(--color-ozo-green-dark, #0A7B3E) 100%)',
        'gradient-mixed': 'linear-gradient(135deg, var(--color-ozo-red, #E23744) 0%, var(--color-ozo-green, #0D9E4F) 100%)',
        'gradient-hero': 'linear-gradient(180deg, rgba(var(--color-ozo-red-rgb, 226, 55, 68), 0.05) 0%, rgba(250, 250, 250, 1) 100%)',
        'gradient-hero-dark': 'linear-gradient(180deg, rgba(var(--color-ozo-red-rgb, 226, 55, 68), 0.08) 0%, #0a0a0a 100%)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      screens: {
        'xs': '475px',
        '3xl': '1920px',
      },
    },
  },
  plugins: [],
}