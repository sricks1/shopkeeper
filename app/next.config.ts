import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow testing the dev server from phones/tablets on the LAN. Dev-only;
  // has no effect on production builds.
  allowedDevOrigins: ["192.168.1.249"],
};

export default nextConfig;
