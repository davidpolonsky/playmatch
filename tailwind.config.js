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
        'fifa-green':  '#0a2f1b',   // dark green — primary bg
        'fifa-mid':    '#14532d',   // mid green — card bg
        'fifa-mint':   '#4ade80',   // bright mint — accent on dark only
        'fifa-cream':  '#f1efe3',   // off-white — text on dark, light bg
        'fifa-amber':  '#f59e0b',   // amber/gold — only on dark backgrounds
        'fifa-dark':   '#060f09',   // near-black green
        'fifa-border': '#1e5c33',   // subtle border on dark
        // Basketball theme
        'bball-dark':   '#0f0a00',   // near-black brown
        'bball-mid':    '#1c1200',   // hardwood dark
        'bball-court':  '#2d1f00',   // court brown
        'bball-orange': '#f97316',   // basketball orange accent
        'bball-gold':   '#fbbf24',   // gold highlights
        'bball-border': '#3d2c00',   // subtle border
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
        body: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      boxShadow: {
        retro:      '0 2px 12px 0 rgba(0,0,0,0.45)',
        glow:       '0 0 12px rgba(74,222,128,0.4)',
        'glow-orange': '0 0 12px rgba(249,115,22,0.5)',
      },
    },
  },
  plugins: [],
}
