import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "background-ink": "#000000", // Pitch black
        "surface-zinc": "#0A0A0A", // Almost black
        "surface-container": "#111111", // Very dark grey
        "surface-container-low": "#080808",
        "surface-container-high": "#1C1C1C",
        "surface-container-highest": "#262626",
        "text-primary": "#FFFFFF", // Pure white
        "text-muted": "#A1A1AA", // Muted light grey
        "accent-orange": "#FF4500", // Reddish orange
        "primary": "#FF5722",
        "primary-container": "#E64A19",
        "secondary": "#E4E4E7",
        "tertiary": "#FFB875",
        "error": "#FF4C4C",
      },
      fontFamily: {
        sans: ["Geist", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      }
    },
  },
  plugins: [],
};
export default config;
