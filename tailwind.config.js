/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          700: '#32261F',
          800: '#241B18',
          900: '#1A1311',
          950: '#120D0B',
        },
        gold: {
          300: '#F4D9A4',
          400: '#E9BC6F',
          500: '#D9A24E',
          600: '#B98235',
        },
        cream: {
          50: '#FBF5EA',
          100: '#F3E9D8',
          200: '#E2D3BC',
          400: '#B3A596',
        },
        sage: {
          400: '#8FB09A',
          500: '#6E9580',
        },
        ember: {
          400: '#EE8B63',
          500: '#DB6E45',
        },
        success: {
          400: '#5CC08A',
          500: '#3FA674',
        },
        warning: {
          400: '#F2C14E',
          500: '#D9A62B',
        },
        error: {
          400: '#F07167',
          500: '#E0533F',
        },
      },
      fontFamily: {
        sans: ['Tajawal', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'serif'],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'scale(0.96) translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'pop-in': 'pop-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
