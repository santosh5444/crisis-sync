/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-red': '#D32F2F', // Brighter, more modern red
        'alert-red': '#FF1744',
        'dark-bg': '#050505',
        'card-bg': 'rgba(20, 20, 20, 0.6)', // Glassy
        'card-border': 'rgba(255, 255, 255, 0.08)',
        'success': '#00E676',
        'warning': '#FFEA00',
        'info': '#00B0FF',
        'severity-critical': '#D50000',
        'severity-high': '#FF6D00',
        'severity-medium': '#FFD600',
        'severity-low': '#00C853'
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

// Production Build Update
