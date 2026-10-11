import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Uploaded images are served from Convex file storage.
const convexHost = (() => {
  const url = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  try {
    return url ? new URL(url) : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The admin area is never linked or listed; this keeps it out of search too.
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      { source: "/admin", headers: noindex },
      { source: "/admin/:path*", headers: noindex },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.convex.cloud", pathname: "/api/storage/**" },
      ...(convexHost
        ? [
            {
              protocol: convexHost.protocol.replace(":", "") as "http" | "https",
              hostname: convexHost.hostname,
              port: convexHost.port,
              pathname: "/api/storage/**",
            },
          ]
        : []),
    ],
    // The local Convex backend runs on 127.0.0.1 in development only.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
