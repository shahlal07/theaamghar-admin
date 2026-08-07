import type { NextConfig } from "next";

const SUPABASE_ORIGIN = "https://eznxsosvsgkhexbjoolh.supabase.co";

const CSP = [
  "default-src 'self'",
  // Next.js dev/HMR and inline bootstrap scripts need 'unsafe-inline'/'unsafe-eval' in dev;
  // Turbopack's production output relies on nonce-less inline scripts too, so keep this
  // permissive for 'self' scripts rather than breaking the build with a stricter policy.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${SUPABASE_ORIGIN} wss://eznxsosvsgkhexbjoolh.supabase.co`,
  `img-src 'self' data: blob: ${SUPABASE_ORIGIN}`,
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // pdfkit reads its .afm font metrics via fs + __dirname at runtime; bundling
  // it rewrites __dirname and breaks that lookup (ENOENT on Helvetica.afm).
  // Keeping it external forces Node's native module resolution instead.
  serverExternalPackages: ["pdfkit"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
