import type { Config } from 'waku/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const config: Config = {
  // Vite configuration
  // See https://vite.dev/guide/api-environment-plugins.html
  vite: {
    plugins: [tsconfigPaths({ root: __dirname })],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      // Dev server only: Allow all hosts when behind reverse proxy
      allowedHosts: process.env.ALLOWED_HOSTS ? process.env.ALLOWED_HOSTS.split(',') : true,
    },
    build: {
      rollupOptions: {
        // Externalize Prisma - it's handled by prisma-resolver-hook.mjs
        external: ['@prisma/client', /^@prisma\/.*/, /^\.prisma\/.*/],
        onwarn(warning, warn) {
          // Suppress Prisma external dependency warnings
          if (warning.code === 'UNRESOLVED_IMPORT' && warning.exporter?.includes('.prisma')) {
            return
          }
          warn(warning)
        },
      },
    },
    optimizeDeps: {
      exclude: ['@prisma/client'],
    },
  },
}

export default config
