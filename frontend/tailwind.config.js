/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        rank: {
          A: "#22c55e",
          B: "#84cc16",
          C: "#eab308",
          D: "#f97316",
          E: "#ef4444",
          F: "#7f1d1d",
        },
      },
    },
  },
  plugins: [],
};
