/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#284a37",
          greenDark: "#0e2018",
          greenLight: "#0b7f4f",
          black: "#121212"
        }
      }
    },
  },
  plugins: [],
};
