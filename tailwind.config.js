/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'fifa-green': '#0a2f1b',
        'fifa-mint': '#76e5a2',
        'fifa-cream': '#f7f3e3',
        'fifa-gold': '#e6c15b',
        'fifa-dark': '#1a1a1a',
      },
      fontFamily: {
        retro: [
          '"Press Start 2P"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
        headline: [
          '"Orbitron"',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      boxShadow: {
        retro: '0 2px 8px 0 rgba(10,47,27,0.25)',
      },
    },
  },
  plugins: [],
}