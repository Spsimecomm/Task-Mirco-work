/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"Hind Siliguri"', '"Noto Sans Bengali"', 'system-ui', '-apple-system', 'sans-serif'],
        inter: ['"Inter"', '"Hind Siliguri"', '"Noto Sans Bengali"', 'system-serif'],
        poppins: ['"Poppins"', '"Hind Siliguri"', '"Noto Sans Bengali"', 'sans-serif'],
        display: ['"Inter"', '"Hind Siliguri"', '"Noto Sans Bengali"', 'sans-serif'],
        body: ['"Inter"', '"Hind Siliguri"', '"Noto Sans Bengali"', 'sans-serif'],
        bengali: ['"Hind Siliguri"', '"Noto Sans Bengali"', '"Inter"', 'sans-serif'],
      },
      colors: {
        // Design System Colors from Mockup
        brand: {
          primary: '#22C55E',   // Green
          secondary: '#0366F1', // Blue
          accent: '#F59E0B',    // Amber
          danger: '#EF4444',    // Rose
        },
        dark: {
          '01': '#0B1020',      // Main Background Deep Blue-Black
          '02': '#111827',      // Card Background (Slate 900)
          '03': '#1F2937',      // Inner Surface / Highlight
          border: '#2A3348',    // Structural Border
        },
        light: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#CBD5E1',
          sub: '#F1F5F9',
        },
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
          indigo: '#0366F1',
          amber: '#F59E0B',
          rose: '#EF4444',
        },
      },
      boxShadow: {
        card: 'var(--card-shadow)',
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        glow: '0 0 20px -5px rgba(34, 197, 94, 0.25)',
      },
      borderRadius: {
        xl2: '0.75rem',
      },
    },
  },
  plugins: [],
}

