import type { NextConfig } from "next";

// Baseline security headers (ScoutLane audit §1.5). CSP is intentionally not
// nonce-based yet — Next injects inline bootstrap styles/scripts, so a strict
// nonce CSP needs middleware wiring (deferred to P1). This baseline still blocks
// framing, MIME-sniffing, object embeds, and base-tag hijacking.
// React needs eval() in dev mode only (HMR/debugging); never in production.
const isDev = process.env.NODE_ENV === "development";
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Effective only over HTTPS (browsers ignore on http://localhost) — for the P1 deploy.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      scriptSrc,
      "connect-src 'self'",
      "font-src 'self' data:",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
