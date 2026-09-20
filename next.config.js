/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  poweredByHeader: false,

  compress: true,

  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },

  images: {
    unoptimized: false,
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
