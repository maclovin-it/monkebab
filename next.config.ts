import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @napi-rs/canvas ships a native .node addon — it must not be bundled by
  // Turbopack/webpack (that breaks its relative-path binary resolution).
  serverExternalPackages: ["@napi-rs/canvas"],
};

export default nextConfig;
