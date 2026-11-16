/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        geo: {
          dark: '#08131d',
          darker: '#040b11',
          card: '#0f2231',
          border: '#1a3a52',
          accent: '#10b981',
          emerald: '#059669',
          cyan: '#06b6d4',
          blue: '#2563eb',
          amber: '#f59e0b',
          rose: '#f43f5e'
        }
      }
    },
  },
  plugins: [],
}
