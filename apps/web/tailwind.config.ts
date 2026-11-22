import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: "#090d16",
        surface: "#0e1320",
        cardBg: "#121828",
        borderLine: "#1e293b",
        emeraldMint: "#10B981",
        electricViolet: "#8B5CF6",
        crimsonBear: "#F43F5E",
        amberLevel: "#F59E0B",
        cyanHighlight: "#06B6D4",
      },
      fontFamily: {
        sans: ["'Inter Tight'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
