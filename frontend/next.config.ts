import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence the warning — Turbopack handles Node.js fallbacks automatically
  turbopack: {},
};

export default nextConfig;
