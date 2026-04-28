import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@aimbig/chat-ui", "@aimbig/wa-client"],
};

export default nextConfig;
