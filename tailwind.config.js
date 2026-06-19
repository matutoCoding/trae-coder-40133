/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        tennis: {
          50: '#f1f8e9',
          100: '#dcedc8',
          200: '#c5e1a5',
          300: '#aed581',
          400: '#9ccc65',
          500: '#8bc34a',
          600: '#7cb342',
          700: '#689f38',
          800: '#558b2f',
          900: '#33691e',
          950: '#1b5e20',
        },
        ball: {
          300: '#fff59d',
          400: '#ffee58',
          500: '#fdd835',
          600: '#fbc02d',
          700: '#f9a825',
        },
        clay: {
          400: '#e57373',
          500: '#ef5350',
          600: '#d84315',
        },
        hard: {
          400: '#90a4ae',
          500: '#607d8b',
          600: '#455a64',
        },
        grass: {
          400: '#81c784',
          500: '#4caf50',
          600: '#2e7d32',
        }
      },
      fontFamily: {
        display: ['"Oswald"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'tennis': '0 4px 14px 0 rgba(27, 94, 32, 0.15)',
        'tennis-hover': '0 8px 24px 0 rgba(27, 94, 32, 0.25)',
      }
    },
  },
  plugins: [],
};
