import type { Config } from 'waku/config'

// Waku unstable API configuration
// Note: unstable_viteConfigs is a runtime feature not yet in type definitions
const config = {
  // Configure Vite to handle Prisma correctly
  // Note: Prisma ESM compatibility is handled by prisma-resolver-hook.mjs
  // which is loaded via NODE_OPTIONS in package.json build/start scripts
  unstable_viteConfigs: {
    common: () => ({
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
