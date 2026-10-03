import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const config: NextConfig = {
  output: "standalone",
  outputFileTracingExcludes: {
    "/*": [".local/**/*", ".env*", "test-results/**/*", "playwright-report/**/*"],
  },
  poweredByHeader: false,
  logging: { incomingRequests: false, serverFunctions: false },
  experimental: { serverActions: { bodySizeLimit: "1mb" } },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default createNextIntlPlugin("./src/i18n/request.ts")(config);
