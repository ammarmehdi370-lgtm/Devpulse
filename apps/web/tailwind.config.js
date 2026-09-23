/** @type {import('tailwindcss').Config} */
const rootConfig = require('../../tailwind.config.js');

module.exports = {
  ...rootConfig,
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
};
