/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1d332b",
        muted: "#718078",
        paper: "#f6f7f4",
        leaf: "#2f7657",
        lime: "#d8f278",
        line: "#e7ebe5"
      },
      boxShadow: { card: "0 5px 20px rgba(27,52,40,.045)" },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"] }
    }
  },
  plugins: []
};
