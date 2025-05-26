/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      /* пример кастом‑цвета: */
      colors: {
        brand: {
          DEFAULT: "#1e40af",
          light: "#3b82f6",
        },
      },
    },
  },
  darkMode: "class", // переключатель тёмной темы (по классу)
  plugins: [],
};
