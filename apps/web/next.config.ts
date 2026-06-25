import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "lucide-react": "./node_modules/lucide-react/dist/esm/lucide-react.mjs",
    },
  },
};

export default nextConfig;
