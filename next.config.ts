import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root so Next doesn't pick up the parent dir's lockfile.
    root: __dirname,
  },
};

export default nextConfig;
