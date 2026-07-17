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
    // Admins may upload SVGs. The optimizer blocks SVG by default because it
    // can embed scripts — these two headers are the officially recommended
    // mitigation: never execute scripts, never render inline as a document.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
