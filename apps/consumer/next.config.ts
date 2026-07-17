import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16's Cache Components model: rendering is dynamic by default, data
  // streams in via <Suspense>, and caching is opted into with 'use cache'.
  cacheComponents: true,
  images: {
    // Product images are served from Convex storage.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.convex.cloud",
      },
    ],
  },
};

export default nextConfig;
