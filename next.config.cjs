/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'better-auth'],
  images: {
    domains: ['localhost'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    esmExternals: 'loose',
  },
  output: 'standalone',
  // DevContainer用のホットリロード設定
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // ファイル監視をポーリングモードに設定
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      }
    }
    return config
  },
}

module.exports = nextConfig
