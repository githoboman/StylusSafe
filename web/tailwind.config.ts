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
        "background-ink": "#18181b",
        "surface-zinc": "#27272a",
        "surface-container": "#1f1f22",
        "surface-container-low": "#1b1b1e",
        "surface-container-high": "#2a2a2d",
        "surface-container-highest": "#353438",
        "text-primary": "#f4f4f5",
        "text-muted": "#71717a",
        "accent-azure": "#0284c7",
        "primary": "#93ccff",
        "primary-container": "#3198dc",
        "secondary": "#c6c5cf",
        "tertiary": "#ffb875",
        "error": "#ffb4ab",
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
