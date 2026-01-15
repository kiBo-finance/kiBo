import { cn } from '~/lib/utils'

describe('Utility Functions', () => {
  describe('cn (className utility)', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2')
    })

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'conditional')).toBe('base conditional')
      expect(cn('base', false && 'conditional')).toBe('base')
    })

    it('should handle undefined and null values', () => {
      expect(cn('base', undefined, null)).toBe('base')
    })

    it('should merge Tailwind classes correctly', () => {
      // This test assumes the cn function uses tailwind-merge
      expect(cn('px-2 py-1 px-3')).toBe('py-1 px-3')
    })
  })
})
