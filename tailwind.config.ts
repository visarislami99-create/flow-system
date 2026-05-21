import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#FFFFFF",
        warm: "#F5F3EE",
        ink: "#0A0A0A",
        accent: "#C9A77A",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        serif: [
          'Editorial New',
          "ui-serif",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "Times",
          "serif",
        ],
      },
      fontSize: {
        display: ["clamp(48px, 8vw, 144px)", { lineHeight: "0.95", letterSpacing: "-0.02em" }],
        h2: ["clamp(28px, 3.6vw, 56px)", { lineHeight: "1.12", letterSpacing: "-0.015em" }],
        body: ["clamp(15px, 1.8vw, 18px)", { lineHeight: "1.65" }],
        "body-sm": ["clamp(13px, 1.5vw, 16px)", { lineHeight: "1.6" }],
      },
    },
  },
  plugins: [],
};

export default config;
