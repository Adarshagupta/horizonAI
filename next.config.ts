import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    unoptimized: true
  },
  allowedDevOrigins: [
            'localhost:3000',
    'localhost:3000',
    '192.168.1.47:3000'
  ],
  async headers() {
    return [
      {
        // Allow OAuth popups for all pages
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'unsafe-none',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
