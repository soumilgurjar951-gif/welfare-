/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Backend origin injected at build/runtime via env.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000",
  },

  // Compress all responses with gzip (default in prod; explicit for clarity).
  compress: true,

  // Officer-only pivot: old citizen bookmarks land on officer equivalents
  // instead of 404 (e.g. /dashboard -> /admin/dashboard).
  async redirects() {
    return [
      { source: "/dashboard", destination: "/admin/dashboard", permanent: false },
      { source: "/login", destination: "/admin/login", permanent: false },
      { source: "/register", destination: "/admin/login", permanent: false },
      { source: "/profile", destination: "/admin/dashboard", permanent: false },
      { source: "/applications/:path*", destination: "/admin/applications", permanent: false },
      { source: "/schemes", destination: "/", permanent: false },
      { source: "/eligibility", destination: "/", permanent: false },
      { source: "/grievances", destination: "/admin/grievances", permanent: false },
      { source: "/apply/:path*", destination: "/", permanent: false },
    ];
  },

  // Optimise packages that ship un-tree-shaken ESM bundles.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // CERT-In baseline security headers on every page (HSTS, CSP, framing, MIME…).
  // Dev note: 'unsafe-inline'/'unsafe-eval' + ws:/localhost connect-src keep
  // Next.js HMR working; tighten script-src when shipping a static prod build.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self' http://localhost:* http://127.0.0.1:* https: wss: ws:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "form-action 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
    ].join("; ");
    const security = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
      },
      { key: "Content-Security-Policy", value: csp },
      // Ignored by browsers on plain http (dev); enforced once served over TLS.
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
    ];
    return [
      {
        source: "/:path*",
        headers: security,
      },
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
