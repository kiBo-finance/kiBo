/**
 * Configuration tests for Phase 1 infrastructure
 */

describe('Project Configuration', () => {
  describe('Environment Variables', () => {
    it('should have test environment variables set', () => {
      expect(process.env.BETTER_AUTH_SECRET).toBeDefined()
      expect(process.env.BETTER_AUTH_URL).toBeDefined()
      expect(process.env.DATABASE_URL).toBeDefined()
    })

    it('should have valid auth secret length', () => {
      const secret = process.env.BETTER_AUTH_SECRET || ''
      expect(secret.length).toBeGreaterThanOrEqual(32)
    })

    it('should have valid database URL format', () => {
      const dbUrl = process.env.DATABASE_URL || ''
      expect(dbUrl).toMatch(/^postgresql:\/\//)
    })
  })

  describe('Package Configuration', () => {
    const packageJson = require('../package.json')

    it('should have all required dependencies', () => {
      const requiredDeps = [
        'next',
        'react',
        '@prisma/client',
        'better-auth',
        'jotai',
        'tailwindcss',
        'zod',
        'decimal.js',
      ]

      requiredDeps.forEach((dep) => {
        expect(packageJson.dependencies[dep]).toBeDefined()
      })

      // Check dev dependencies separately
      expect(packageJson.devDependencies['typescript']).toBeDefined()
    })

    it('should have testing dependencies', () => {
      expect(packageJson.devDependencies['jest']).toBeDefined()
      expect(packageJson.devDependencies['@testing-library/react']).toBeDefined()
      expect(packageJson.devDependencies['@testing-library/jest-dom']).toBeDefined()
    })

    it('should have required scripts', () => {
      expect(packageJson.scripts.test).toBeDefined()
      expect(packageJson.scripts.lint).toBeDefined()
      expect(packageJson.scripts['type-check']).toBeDefined()
    })
  })
})
