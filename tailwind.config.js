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
          950: 'var(--bg-main)',
          900: 'var(--bg-sub)',
          850: 'var(--bg-card)',
          800: 'var(--bg-card)',
          700: 'var(--border-subtle)',
          600: '#475569',
          500: '#64748B',
        },
        mint: {
          300: '#86EFAC',
          400: '#22C55E',
          500: 'var(--accent-primary)',
          600: '#16A34A',
          700: '#15803D',
        },
        signal: {
          indigo: '#6366F1',
          amber: '#F59E0B',
          rose: '#EF4444',
        },
      },
      boxShadow: {
        card: 'var(--card-shadow)',
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        xl2: '0.75rem',
      },
    },
  },
  plugins: [],
}

