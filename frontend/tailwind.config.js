/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "gd-green": "#00C853",
        "gd-blue": "#1E88E5",
        "gd-dark": "#0D1117",
        "gd-card": "#161B22",
        "gd-border": "#30363D",
        "gd-text": "#E6EDF3",
        "gd-muted": "#8B949E",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
