/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    staleTimes: { dynamic: 0, static: 180 },
    serverBodySizeLimit: '10mb',
  },
};

export default nextConfig;
