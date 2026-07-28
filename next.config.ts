import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  outputFileTracingIncludes: {
    "/api/cv/[cvId]/export": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
