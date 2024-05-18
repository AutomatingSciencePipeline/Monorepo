import type { Config } from "tailwindcss";

const config: Config = {
  content: [
		'./pages/**/*.{js,jsx,ts,tsx,mdx}',
		'./components/**/*.{js,jsx,ts,tsx,mdx}',
	],
	theme: {
		extend: {},
	},
	plugins: [require('@tailwindcss/forms')],
};
export default config;
