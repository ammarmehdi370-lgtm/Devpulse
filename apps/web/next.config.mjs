/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  transpilePackages: ['@devpulse/ui', '@devpulse/types', '@devpulse/utils'],
  experimental: { typedRoutes: true },
  webpack(config, { isServer }) {
    if (!isServer) {
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
        layers: true,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
};

export default nextConfig;
