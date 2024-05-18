/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
	output: 'standalone', // For deployment, https://nextjs.org/docs/advanced-features/output-file-tracing
	images: {
		// https://nextjs.org/docs/api-reference/next/image#remote-patterns
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'tailwindui.com',
				pathname: '/img/**'
			},
		],
	}
};

export default nextConfig;
