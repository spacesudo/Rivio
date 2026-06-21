import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        violet: {
          DEFAULT: "#6C63FF",
          soft: "#A59EFF",
          mist: "#F0EFFE",
        },
        obsidian: "#0D0D0D",
        surface: "#F9F9F9",
        border: {
          light: "#E5E5E5",
          dark: "rgba(255,255,255,0.08)",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
        pill: "999px",
      },
      maxWidth: {
        shell: "430px",
      },
      borderWidth: {
        "0.5": "0.5px",
      },
    },
  },
  plugins: [],
};

export default config;
