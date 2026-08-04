import type { NextConfig } from 'next';

const API_TARGET = process.env.API_TARGET || 'http://localhost:1337';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_TARGET}/api/:path*` },
      { source: '/uploads/:path*', destination: `${API_TARGET}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
