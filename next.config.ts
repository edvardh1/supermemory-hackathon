import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compile the shared workspace package (it ships raw TypeScript).
  transpilePackages: ["@job-automation/core"],
};

export default nextConfig;
