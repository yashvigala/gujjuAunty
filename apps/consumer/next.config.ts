import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
