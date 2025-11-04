/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}", // scan all React source files
    "./public/**/*.{png,jpg,svg}", // ✅ add this if not present
  ],
  theme: {
    extend: {
      keyframes: {
        "ping-once": {
          "0%": { transform: "scale(1)", opacity: "1", boxShadow: "0 0 0 0 rgba(147, 51, 234, 0.7)" },
          "50%": { transform: "scale(1.2)", opacity: "0.7", boxShadow: "0 0 20px 6px rgba(147, 51, 234, 0.7)" },
          "100%": { transform: "scale(1)", opacity: "1", boxShadow: "0 0 0 0 rgba(147, 51, 234, 0)" },
        },
      },
      animation: {
        "ping-once": "ping-once 1.5s ease-in-out 1",
      },
    },
  },
  plugins: [],
};
