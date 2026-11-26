/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#04070a',
        surface: '#0b1017',
        neon: {
          emerald: '#10b981',
          bright: '#34d399',
          glow: '#059669',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        urdu: ['"Noto Nastaliq Urdu"', 'Cairo', 'serif'],
        arabic: ['Cairo', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'neon-green': '0 0 24px rgba(16, 185, 129, 0.35)',
        'glass-dark': '0 12px 40px rgba(0, 0, 0, 0.65)',
      },
    },
  },
  plugins: [],
};
