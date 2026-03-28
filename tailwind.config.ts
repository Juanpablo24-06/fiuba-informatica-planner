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
        "accent-contrast": "rgb(var(--color-accent-contrast) / <alpha-value>)",
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
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"]
      },
      boxShadow: {
        glow: "0 0 0 1px rgb(var(--color-accent) / 0.25), 0 22px 60px rgb(var(--shadow-color) / 0.24)",
        tile: "0 1px 0 rgb(var(--color-border) / 0.35), inset 0 1px 0 rgb(var(--color-surface-2) / 0.35)",
        soft: "0 10px 30px rgb(var(--shadow-color) / 0.08)"
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" }
        },
        "dialog-overlay-in": {
          from: { opacity: "0", backdropFilter: "blur(0px)" },
          to: { opacity: "1", backdropFilter: "blur(6px)" }
        },
        "dialog-overlay-out": {
          from: { opacity: "1", backdropFilter: "blur(6px)" },
          to: { opacity: "0", backdropFilter: "blur(0px)" }
        },
        "dialog-panel-in": {
          "0%": { opacity: "0", transform: "translate(-50%, -44%) scale(0.92)" },
          "60%": { opacity: "1", transform: "translate(-50%, -51%) scale(1.01)" },
          "100%": { opacity: "1", transform: "translate(-50%, -50%) scale(1)" }
        },
        "dialog-panel-out": {
          from: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
          to: { opacity: "0", transform: "translate(-50%, -46%) scale(0.96)" }
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(26px)" },
          to: { opacity: "1", transform: "translateX(0)" }
        },
        "message-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "eye-blink": {
          "0%, 42%, 46%, 100%": { transform: "scaleY(1)" },
          "44%": { transform: "scaleY(0.1)" }
        },
        "caret-blink": {
          "0%, 45%": { opacity: "1" },
          "46%, 100%": { opacity: "0.25" }
        },
        "logo-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-1px)" }
        },
        "shimmer-sweep": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-50% 0" }
        },
        "stagger-fade-in": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out forwards",
        "float-slow": "float-slow 6s ease-in-out infinite",
        "dialog-overlay-in": "dialog-overlay-in 220ms ease-out forwards",
        "dialog-overlay-out": "dialog-overlay-out 160ms ease-in forwards",
        "dialog-panel-in": "dialog-panel-in 420ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "dialog-panel-out": "dialog-panel-out 200ms ease-in forwards",
        "slide-in-right": "slide-in-right 260ms ease-out forwards",
        "message-in": "message-in 220ms ease-out forwards",
        "eye-blink": "eye-blink 4.2s ease-in-out infinite",
        "caret-blink": "caret-blink 1.1s steps(2, end) infinite",
        "logo-float": "logo-float 3.8s ease-in-out infinite",
        "shimmer": "shimmer-sweep 2.2s ease-in-out infinite",
        "stagger-in": "stagger-fade-in 0.45s cubic-bezier(.22,1,.36,1) forwards"
      }
    }
  },
  plugins: []
};

export default config;
