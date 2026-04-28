/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Don't cache dynamic pages in the client router — changes show immediately on navigation
    staleTimes: { dynamic: 0, static: 180 },
  },
};

export default nextConfig;
