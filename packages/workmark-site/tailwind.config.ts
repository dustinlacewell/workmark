import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: '#0d1117',
          soft: '#161b22',
          line: '#30363d',
        },
        paper: {
          DEFAULT: '#fafafa',
          soft: '#f0f0f0',
          line: '#d0d0d0',
        },
        accent: {
          DEFAULT: '#5eead4',
          deep: '#14b8a6',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
