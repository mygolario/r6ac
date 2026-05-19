/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#C8102E',
        'primary-dark': '#9B0D22',
        'accent': '#00BFFF',
        'accent-dark': '#0099CC',
        'bg': '#0D0D0F',
        'surface': '#161618',
        'surface-2': '#1E1E21',
        'border': '#2A2A2E',
        'text-primary': '#F5F5F7',
        'text-secondary': '#8E8E93',
        'text-muted': '#48484A',
        'success': '#30D158',
        'warning': '#FFD60A',
        'danger': '#FF453A',
        'danger-dark': '#CC2B22',
      },
      fontFamily: {
        'vazir': ['Vazirmatn', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
