import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow HMR from network IP for mobile/other device testing
  allowedDevOrigins: ['192.168.0.108'],
};

export default nextConfig;
