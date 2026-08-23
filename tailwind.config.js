/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Manrope"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      colors: {
        base: {
          950: '#07090F',
          900: '#0C0F17',
          850: '#10141D',
          800: '#151A24',
          700: '#1E2531',
          600: '#2A3242',
          500: '#3D4759',
        },
        mint: {
          400: '#34E0A1',
          500: '#1FCB8C',
          600: '#14A876',
        },
        signal: {
          indigo: '#7C8CFF',
          amber: '#F5B84E',
          rose: '#FB6F84',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(52,224,161,0.15), 0 8px 30px -8px rgba(52,224,161,0.25)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}
