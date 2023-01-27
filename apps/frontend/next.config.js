/**
 * @type {import('next').NextConfig}
 */
// TODO VSCode is detecting error "Parsing error: Cannot find module 'next/babel'" but the fix below just causes ESLint errors:
// https://stackoverflow.com/questions/71662525/failed-to-load-config-next-babel-to-extend-from-eslintrc-json
// https://nextjs.org/docs/api-reference/next.config.js/introduction

const nextConfig = {
	reactStrictMode: true,
};

module.exports = nextConfig;
