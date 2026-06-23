import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Ported from the original IESR brand (blue/cyan), modernized.
        brand: {
          50: "#eff6ff", 100: "#dbeafe", 500: "#0b66ff", 600: "#0a57db", 700: "#0846b0", 900: "#062b6b",
        },
        accent: { 500: "#00c8ff" },
        // KPLC / IESR institutional palette (from the Kenya Power IESR mark)
        kplc: {
          navy: "#0b2e63",
          blue: "#1466b8",
          green: "#3aa856",
          yellow: "#f5c518",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(2,6,23,.04), 0 8px 24px -12px rgba(2,6,23,.12)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: { "fade-up": "fade-up .5s ease-out both" },
    },
  },
  plugins: [],
} satisfies Config;
