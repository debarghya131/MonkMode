/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Primary heading font - custom Google Font
        "heading-display": ["Bitcount Prop Double Ink", "Poppins", "sans-serif"],
        // Secondary heading/emphasis font
        heading: ["Poppins", "sans-serif"],
        // Body text
        body: ["Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
      },
      fontSize: {
        // Display headings (e.g., large welcome messages)
        "heading-xl": ["2.5rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "heading-lg": ["2rem", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "700" }],
        // Section headings (e.g., MAIN, OVERVIEW, INSIGHTS)
        "heading-md": ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.005em", fontWeight: "600" }],
        "heading-sm": ["1.125rem", { lineHeight: "1.35", letterSpacing: "0em", fontWeight: "600" }],
        // Section labels/overlines (e.g., small uppercase titles)
        "label-lg": ["0.875rem", { lineHeight: "1.4", letterSpacing: "0.12em", fontWeight: "600" }],
        "label-md": ["0.75rem", { lineHeight: "1.5", letterSpacing: "0.15em", fontWeight: "600" }],
        "label-sm": ["0.6875rem", { lineHeight: "1.5", letterSpacing: "0.18em", fontWeight: "700" }],
        // Body text variants
        "body-lg": ["1rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["0.9375rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        "body-xs": ["0.8125rem", { lineHeight: "1.5", fontWeight: "400" }],
      },
      opacity: {
        65: "0.65",
        75: "0.75",
        85: "0.85",
      },
    },
  },
  plugins: [],
};