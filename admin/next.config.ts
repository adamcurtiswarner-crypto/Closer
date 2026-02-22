import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, ".."),
    resolveAlias: {
      "@shared/types": path.resolve(__dirname, "../specs/types.ts"),
    },
  },
  webpack: (config) => {
    config.resolve.alias["@shared/types"] = path.resolve(
      __dirname,
      "../specs/types.ts"
    );
    return config;
  },
};

export default nextConfig;
