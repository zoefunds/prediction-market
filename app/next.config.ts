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
      };
      // Stub out pino-pretty (transitive dep we never use)
      config.resolve.alias = {
        ...(config.resolve.alias ?? {}),
        "pino-pretty": path.resolve(__dirname, "src/lib/stubs/pino-pretty.js"),
      };
    }
    return config;
  },
  serverExternalPackages: ["@arcium-hq/client", "@coral-xyz/anchor"],
};

export default nextConfig;
