import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: { agentFeedback: true },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: { root: process.cwd() },
};
export default nextConfig;
