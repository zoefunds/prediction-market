import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        net: false,
        tls: false,
        child_process: false,
        worker_threads: false,
      };
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        "pino-pretty": path.resolve(__dirname, "src/lib/stubs/pino-pretty.js"),
      };
    }
    return config;
  },
  serverExternalPackages: ["@arcium-hq/client", "@coral-xyz/anchor"],
  // Skip ESLint errors during build (we'll catch them with lint separately)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // TypeScript: don't fail build on type errors (still flagged by editor)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
