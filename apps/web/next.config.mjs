/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://nova-assistant-api.onrender.com/api/v1';

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@assistant/shared'],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl.replace(/\/+$/, '')}/:path*`,
      },
    ];
  },
};

export default nextConfig;

