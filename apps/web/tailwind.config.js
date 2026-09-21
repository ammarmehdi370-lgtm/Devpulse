/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        devpulse: {
          purple: "#6C63FF",
          cyan: "#0DF5C4",
          bg: "#09090e",
          panel: "#111118",
          text: "#ededf5",
          muted: "#8c8ca5",
        },
      },
      fontFamily: {
        sans: ["Inter", "Space Grotesk", "ui-sans-serif", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
