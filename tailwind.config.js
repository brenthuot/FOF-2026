/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy:   { DEFAULT: '#0f1b2d', 50: '#e8ecf3', 100: '#c5d0e0', 200: '#8fa6c6', 300: '#5a7cac', 400: '#2f5693', 500: '#1a3a6b', 600: '#152f57', 700: '#102344', 800: '#0c1a32', 900: '#0f1b2d' },
        brand:  { DEFAULT: '#2563eb', light: '#3b82f6', dark: '#1d4ed8' },
        pitch:  { DEFAULT: '#dc2626', light: '#ef4444', muted: '#fef2f2', border: '#fecaca' },
        hit:    { DEFAULT: '#16a34a', light: '#22c55e', muted: '#f0fdf4', border: '#bbf7d0' },
        tier:   ['#1e3a5f','#1e4d2e','#4a1d4d','#4d3a1d','#1d3d4d','#4d1d1d','#1d4d3d','#3d1d4d','#4d4d1d','#1d4d4d'],
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
