/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'admin.togahh.com',
      },
    ],
  },
};

module.exports = nextConfig;
