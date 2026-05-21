import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["@pulse-flags/sdk"], // Just in case
  allowedDevOrigins: ["localhost", "127.0.0.1", "http://127.0.0.1:3002", "http://localhost:3002"]
};

export default nextConfig;
