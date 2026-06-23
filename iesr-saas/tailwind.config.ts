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
      },
      fontFamily: {
        sans: ["Exo 2", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Rajdhani", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
