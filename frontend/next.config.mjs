/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Backend origin injected at build/runtime via env.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000",
  },

  // Compress all responses with gzip (default in prod; explicit for clarity).
  compress: true,

  // Optimise packages that ship un-tree-shaken ESM bundles.
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },

  // Long-lived cache headers for immutable Next.js static assets (_next/static).
  // API and page responses are intentionally left uncached (dynamic).
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
