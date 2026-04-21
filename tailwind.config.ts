import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#ffffff",
          elevated: "#f8f9fa",
          card: "#f3f4f6",
        },
        border: {
          DEFAULT: "#e5e7eb",
          subtle: "#f0f0f0",
        },
        text: {
          DEFAULT: "#111827",
          muted: "#6b7280",
          dim: "#9ca3af",
        },
        accent: {
          DEFAULT: "#b8942f",
          dim: "rgba(184, 148, 47, 0.08)",
          glow: "rgba(184, 148, 47, 0.04)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
