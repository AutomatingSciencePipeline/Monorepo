const { orange } = require('tailwindcss/colors');

module.exports = {
	content: [
		'./pages/**/*.{js,jsx,ts,tsx,mdx}',
		'./components/**/*.{js,jsx,ts,tsx,mdx}',
	],
	theme: {
		extend: {},
	},
	plugins: [require('@tailwindcss/forms')],
};
