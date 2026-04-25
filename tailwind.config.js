/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4A3AFF',
          gradientStart: '#4A3AFF',
          gradientEnd: '#6D3AFF'
        },
        success: '#3EFF3A',
        warning: '#FFEB3A',
        danger: '#FF3A46',
        info: '#3A95FF',
        neutral: {
          headings: '#0D0A2C',
          text: '#615E83',
          600: '#807E9A',
          500: '#E5E5EF',
          400: '#F2F1FF',
          300: '#F7F7FB',
          200: '#F8F8FF',
          white: '#ffffff',
        },
        magenta: {
          400: '#4A3AFF',
          300: '#A59DFF',
          200: '#D2CEFF',
          100: '#E9E7FF',
        },
        blue: {
          400: '#3A95FF',
          300: '#9DCAFF',
          200: '#CDE4FF',
          100: '#ECF5FF',
        },
        green: {
          400: '#3EFF3A',
          300: '#9FFF9D',
          200: '#CEFFCD',
          100: '#ECFFEC',
        },
        yellow: {
          400: '#FFEB3A',
          300: '#FFF69D',
          200: '#FFFACD',
          100: '#FFFDEC',
        },
        red: {
          400: '#FF3A46',
          300: '#FF9DA3',
          200: '#FFCDD0',
          100: '#FFECED',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        rotunda: ['Rotunda', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'display-1': ['78px', { lineHeight: '84px', fontWeight: '700' }],
        'display-2': ['62px', { lineHeight: '76px', fontWeight: '700' }],
        'display-3': ['44px', { lineHeight: '52px', fontWeight: '700' }],
        'display-4': ['28px', { lineHeight: '40px', fontWeight: '700' }],
        'h1': ['42px', { lineHeight: '54px', fontWeight: '700' }],
        'h2': ['32px', { lineHeight: '48px', fontWeight: '700' }],
        'h3': ['24px', { lineHeight: '34px', fontWeight: '700' }],
        'h4': ['22px', { lineHeight: '28px', fontWeight: '700' }],
        'h5': ['18px', { lineHeight: '24px', fontWeight: '700' }],
        'h6': ['16px', { lineHeight: '22px', fontWeight: '700' }],
        'body-lg': ['18px', { lineHeight: '32px', fontWeight: '400' }],
        'body-default': ['14px', { lineHeight: '26px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '22px', fontWeight: '400' }],
        'text-400': ['18px', { lineHeight: '20px' }],
        'text-300': ['16px', { lineHeight: '18px' }],
        'text-200': ['14px', { lineHeight: '16px' }],
        'text-100': ['12px', { lineHeight: '14px' }],
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        pulseSoft: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.8' },
        }
      },
      animation: {
        shake: 'shake 0.5s ease-in-out',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
