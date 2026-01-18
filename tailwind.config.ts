import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--color-canvas) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-2": "rgb(var(--color-surface-2) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        text: "rgb(var(--color-text) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        "accent-2": "rgb(var(--color-accent-2) / <alpha-value>)",
        "accent-3": "rgb(var(--color-accent-3) / <alpha-value>)",
        "accent-4": "rgb(var(--color-accent-4) / <alpha-value>)",
        prereq: "rgb(var(--color-prereq) / <alpha-value>)",
        unlock: "rgb(var(--color-unlock) / <alpha-value>)",
        elective: "rgb(var(--color-elective) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"]
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(154, 92, 255, 0.2), 0 18px 50px rgba(4, 6, 10, 0.6)",
        tile: "0 1px 0 rgba(148, 163, 184, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.04)"
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" }
        }
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out forwards",
        "float-slow": "float-slow 6s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
