/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "background-ink": "#000000",
        "surface-zinc": "#0A0A0A",
        "surface-container": "#111111",
        "surface-container-low": "#080808",
        "surface-container-high": "#1C1C1C",
        "surface-container-highest": "#262626",
        "text-primary": "#FFFFFF",
        "text-muted": "#A1A1AA",
        "accent-orange": "#FF4500",
        "primary": "#FF5722",
        "primary-container": "#E64A19",
        "secondary": "#E4E4E7",
        "tertiary": "#FFB875",
        "error": "#FF4C4C",
      },
    },
  },
  plugins: [],
};
