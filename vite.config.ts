import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    // Allow all hosts in production (typically behind reverse proxy)
    // Or specify via ALLOWED_HOSTS env var (comma-separated)
    allowedHosts: process.env.ALLOWED_HOSTS
      ? process.env.ALLOWED_HOSTS.split(',')
      : true,
  },
})
