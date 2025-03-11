import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/media/(.*)", // Match all files under /media
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable", // 1 year, immutable
          },
        ],
      },
    ];
  },
};

export default nextConfig;
