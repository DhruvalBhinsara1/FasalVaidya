import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'jtefnnlcikvyswmuowxd.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5000',
        pathname: '/api/images/**',
      },
      {
        protocol: 'http',
        hostname: '10.224.29.156',
        port: '5000',
        pathname: '/api/images/**',
      },
    ],
  },
};

export default nextConfig;
