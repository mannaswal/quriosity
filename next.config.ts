import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	/* config options here */
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '04vt4pj5xf.ufs.sh',
			},
		],
	},
};

export default nextConfig;
