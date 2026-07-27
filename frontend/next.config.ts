import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cloudinary already serves the thumbnail sizes the API generates, so
    // re-optimising them would spend Vercel image quota for nothing.
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
