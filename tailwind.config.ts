import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#09090b",
          elevated: "#131316",
          card: "#0f0f12",
        },
        border: {
          DEFAULT: "#1e1e22",
          subtle: "#16161a",
        },
        text: {
          DEFAULT: "#f0f0f0",
          muted: "#8a8a8e",
          dim: "#5a5a5e",
        },
        accent: {
          DEFAULT: "#c9a84c",
          dim: "rgba(201, 168, 76, 0.12)",
          glow: "rgba(201, 168, 76, 0.06)",
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
