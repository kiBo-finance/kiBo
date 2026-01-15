/**
 * Node.js custom loader to resolve .prisma/client/default imports
 * This is needed because Node.js ESM doesn't recognize .prisma as a valid package
 */

import { resolve as pathResolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export async function resolve(specifier, context, nextResolve) {
  // Handle .prisma/client/default import
  if (specifier === '.prisma/client/default' || specifier.startsWith('.prisma/')) {
    // Redirect to @prisma/client
    return nextResolve('@prisma/client', context)
  }

  return nextResolve(specifier, context)
}
