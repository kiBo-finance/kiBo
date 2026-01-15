import type { Config } from 'waku/config'

// Waku unstable API configuration
// Note: unstable_viteConfigs is a runtime feature not yet in type definitions
const config = {
  // Configure Vite to handle Prisma correctly
  // Note: Prisma ESM compatibility is handled by prisma-resolver-hook.mjs
  // which is loaded via NODE_OPTIONS in package.json build/start scripts
  unstable_viteConfigs: {
    common: () => ({
      server: {
        // Allow all hosts in production (typically behind reverse proxy)
        // Or specify via ALLOWED_HOSTS env var (comma-separated)
        allowedHosts: process.env.ALLOWED_HOSTS
          ? process.env.ALLOWED_HOSTS.split(',')
          : true,
      },
      build: {
        rollupOptions: {
          external: ['@prisma/client', /^@prisma\/.*/],
        },
      },
      optimizeDeps: {
        exclude: ['@prisma/client'],
      },
    }),
  },
}

export default config as Config
