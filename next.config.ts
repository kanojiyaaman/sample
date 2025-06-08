=import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "/api/auth0/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

