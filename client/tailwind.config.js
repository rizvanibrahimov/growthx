/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0a0b0f',
        darkCard: '#12131a',
        darkCardHover: '#181a24',
        darkBorder: '#1e2030',
        profit: '#22c55e',
        loss: '#ef4444'
      }
    },
  },
  plugins: [],
}
