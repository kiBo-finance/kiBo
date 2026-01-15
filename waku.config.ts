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
        // Dev server only: Allow all hosts when behind reverse proxy
        // Note: This may not work with Waku's unstable API
        // Production uses `bun run start` which doesn't use Vite dev server
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
