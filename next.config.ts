import type { NextConfig } from "next";

// The browser only talks to this Next.js server; /api/* is forwarded to the FastAPI backend,
// so the session cookie stays on one origin.
const API_URL = process.env.API_URL || "http://127.0.0.1:8100";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
  // Uploads of up to 40 PDFs at 25 MB each go through the rewrite.
  experimental: { proxyClientMaxBodySize: "1gb" },
};

export default nextConfig;
