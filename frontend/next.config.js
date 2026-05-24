/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.TAURI_BUILD === '1' ? 'export' : undefined,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  async rewrites() {
    if (process.env.TAURI_BUILD === '1') return [];
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:5001/api/:path*',
      },
    ];
  },
}

module.exports = nextConfig
