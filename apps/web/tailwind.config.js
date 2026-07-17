/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/features/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 五行主题配色
        wood: '#3fa34d',
        fire: '#e5484d',
        earth: '#c8952f',
        metal: '#d4af37',
        water: '#3b82f6',
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5dae2',
          300: '#b0bac9',
          400: '#8593a9',
          500: '#66748d',
          600: '#515d74',
          700: '#434c5e',
          800: '#3a4150',
          900: '#1f2430',
          950: '#141821',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 4px 24px -8px rgba(20, 24, 33, 0.18)',
      },
    },
  },
  plugins: [],
};
