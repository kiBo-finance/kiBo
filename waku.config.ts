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
    // Custom logger to suppress sourcemap warnings for "use client" directives
    customLogger: {
      info: console.info,
      warn: (msg: string) => {
        // Suppress sourcemap resolution warnings for "use client" directives
        if (msg.includes("Can't resolve original location of error")) {
          return
        }
        console.warn(msg)
      },
      warnOnce: (msg: string) => {
        if (msg.includes("Can't resolve original location of error")) {
          return
        }
        console.warn(msg)
      },
      error: console.error,
      clearScreen: () => {},
      hasErrorLogged: () => false,
      hasWarned: false,
    },
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
      // Disable sourcemaps in production to avoid sourcemap warnings
      sourcemap: false,
      rollupOptions: {
        // Externalize Prisma - it's handled by prisma-resolver-hook.mjs
        external: ['@prisma/client', /^@prisma\/.*/, /^\.prisma\/.*/],
        onwarn(warning, warn) {
          // Suppress Prisma external dependency warnings
          if (warning.code === 'UNRESOLVED_IMPORT' && warning.exporter?.includes('.prisma')) {
            return
          }
          // Suppress "use client" directive warnings (handled by Waku/RSC)
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client')) {
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
