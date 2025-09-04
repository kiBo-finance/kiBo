const { TextEncoder, TextDecoder } = require('util')

// Mock global objects needed for Next.js tests
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock fetch for tests
global.fetch = jest.fn()

// Mock global Request if not available (for Next.js server-side tests)
if (typeof global.Request === 'undefined') {
  class MockRequest {
    constructor(url, init = {}) {
      this.url = url
      this.method = init.method || 'GET'
      this.headers = new Map()
      this.body = init.body
      
      if (init.headers) {
        Object.entries(init.headers).forEach(([key, value]) => {
          this.headers.set(key, value)
        })
      }
    }
    
    async json() {
      try {
        return JSON.parse(this.body)
      } catch {
        return null
      }
    }
  }
  
  global.Request = MockRequest
}

// Suppress console errors in tests unless we're specifically testing them
const originalError = console.error
beforeEach(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || 
       args[0].includes('React will try to recreate') ||
       args[0].includes('useLayoutEffect'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterEach(() => {
  console.error = originalError
})