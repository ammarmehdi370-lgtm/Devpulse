/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@devpulse/ui', '@devpulse/types', '@devpulse/utils'],
  experimental: { typedRoutes: true }
};

export default nextConfig;
