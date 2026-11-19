/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#04070a",
          900: "#070c12",
          850: "#0a1119",
          800: "#0e1721",
          700: "#16222f",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        panel:
          "0 24px 80px -24px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
        glow: "0 0 70px -18px rgba(52, 211, 153, 0.4)",
        "glow-red": "0 0 70px -18px rgba(248, 113, 113, 0.45)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(1000%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.55s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        "pulse-soft": "pulse-soft 2.8s ease-in-out infinite",
        scan: "scan 8s linear infinite",
      },
    },
  },
  plugins: [],
};
