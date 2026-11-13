/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(process.env.LOCAL_PREVIEW_HOST
    ? { allowedDevOrigins: [process.env.LOCAL_PREVIEW_HOST] }
    : {}),
  experimental: {
    optimizePackageImports: ["lucide-react"]
  }
};

module.exports = nextConfig;
