/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is a placeholder config to help Vercel identify the project
  // The actual build process will still be handled by Expo
  reactStrictMode: true,
  swcMinify: true,
  // We need to tell Next.js where the output is
  distDir: 'dist'
};

module.exports = nextConfig;
