/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.giphy.com' },
      { protocol: 'https', hostname: 'media.tenor.com' },
    ],
  },
};

module.exports = nextConfig;
