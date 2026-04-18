import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/media/gallery/:path*", destination: "/api/media/gallery/:path*" },
      // Sets/posters: serve via filesystem stream (same pattern as gallery). Relying on Next static
      // file serving alone can 404 for files added after deploy; explicit routes always read from disk.
      { source: "/media/sets/:path*", destination: "/api/media/sets/:path*" },
      { source: "/media/poster/:path*", destination: "/api/media/poster/:path*" },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=()" },
        ],
      },
      {
        source: "/media/:path((?!gallery/).*)", // Static files in /public/media except gallery (served by API)
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/image/:path*", // Match all /_next/image requests
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;