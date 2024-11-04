import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    './app/**/*.{js,jsx,ts,tsx,mdx}', // Include the new app directory
    './app/components/**/*.{js,jsx,ts,tsx,mdx}', // Include the components inside the app directory
    './pages/**/*.{js,jsx,ts,tsx,mdx}', // Keep the pages directory if it still exists
  ],
  theme: {
    extend: {},
  },
  plugins: [require('@tailwindcss/forms')],
};

export default config;