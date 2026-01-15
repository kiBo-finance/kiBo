/**
 * Node.js resolver hook to handle .prisma/client/default imports
 * Usage: NODE_OPTIONS="--import ./prisma-resolver-hook.mjs" waku build
 */

import { register } from 'node:module'

// Register the loader using import.meta.url as the base
register('./prisma-loader.mjs', import.meta.url)
