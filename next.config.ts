import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = isGitHubPages
  ? {
      output: "export",
      assetPrefix: "/maple-285-planner/",
      trailingSlash: true,
    }
  : {};

export default nextConfig;
