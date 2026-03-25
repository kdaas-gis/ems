import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  basePath: process.env.BASE_PATH || '/ems',
  output: 'standalone',
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
