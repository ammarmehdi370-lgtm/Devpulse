/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./apps/web/**/*.{js,ts,jsx,tsx,mdx}', './packages/ui/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        devpulse: {
          purple: '#7C3AED',
          cyan: '#06B6D4',
          bg: '#0A0A0F',
          panel: '#111118',
          text: '#e8e8f0',
          muted: '#7a7a9a'
        }
      },
      fontFamily: {
        sans: ['Space Grotesk', 'ui-sans-serif', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      }
    }
  },
  plugins: []
};
