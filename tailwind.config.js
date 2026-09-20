/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#15130F",        // near-black, warm
        paper: "#F1ECDA",      // aged flash-paper cream
        "paper-alt": "#E7DEC5",
        card: "#FBF8EF",
        "ink-red": "#9C2B23",  // traditional tattoo flash red ("blood")
        "ink-red-dark": "#7A211B",
        pine: "#42522F",
        ochre: "#B4832A",
        grey: "#7A7364",
        line: "#D8CFB8",
      },
      fontFamily: {
        display: ["Georgia", "Times New Roman", "serif"],
        sans: ["var(--font-body)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
