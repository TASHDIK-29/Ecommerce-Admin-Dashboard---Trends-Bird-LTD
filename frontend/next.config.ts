import type { NextConfig } from "next";

/**
 * In production the dashboard and the API live on two different *.vercel.app
 * hosts. `.vercel.app` sits on the Public Suffix List, so a cookie set by the
 * API host is a third-party cookie to the dashboard — Safari blocks those
 * outright and Chrome does the same in incognito, which would leave login
 * returning 200 while the session silently never persists.
 *
 * Proxying the API through this origin makes the auth cookies first-party.
 * The backend stays directly reachable for Postman; only the browser takes
 * the extra hop.
 *
 * Unset locally, where the browser talks to http://localhost:5000 directly
 * and the cookies are already `SameSite=Lax` over plain http.
 */
const backendOrigin = process.env.BACKEND_ORIGIN?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  images: {
    // Cloudinary already serves the thumbnail sizes the API generates, so
    // re-optimising them would spend Vercel image quota for nothing.
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },

  async rewrites() {
    if (!backendOrigin) return [];

    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
