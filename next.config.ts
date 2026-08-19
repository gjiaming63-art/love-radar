import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "lovescannerai.com",
          },
        ],
        destination: "https://www.lovescannerai.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
