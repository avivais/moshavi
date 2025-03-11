import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async headers() {
        return [
            { source: "/media/(.*)", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
            { source: "/_next/image(.*)", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
            { source: "/_next/image?url=%2Fmedia%2F(.*)", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }, // Add this
        ];
    },
};

export default nextConfig;