/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.OUTPUT_EXPORT === "true" ? "export" : "standalone",
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
