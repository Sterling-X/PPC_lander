import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./public/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f8ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a"
        }
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem"
      },
      boxShadow: {
        card: "0 20px 60px rgba(15, 23, 42, 0.10)"
      }
    }
  }
};

export default config;
