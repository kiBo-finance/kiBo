/**
 * Simple logger utility for conditional logging
 * Logs are disabled in production unless explicitly enabled
 */

const isDev = process.env.NODE_ENV !== 'production'
const isDebugEnabled = process.env.DEBUG_LOG === 'true'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerOptions {
  prefix?: string
  enabled?: boolean
}

function createLogger(options: LoggerOptions = {}) {
  const { prefix = '', enabled = isDev || isDebugEnabled } = options

  const formatMessage = (message: string) => (prefix ? `[${prefix}] ${message}` : message)

  return {
    debug: (...args: unknown[]) => {
      if (enabled) {
        console.log(formatMessage(String(args[0])), ...args.slice(1))
      }
    },
    info: (...args: unknown[]) => {
      if (enabled) {
        console.info(formatMessage(String(args[0])), ...args.slice(1))
      }
    },
    warn: (...args: unknown[]) => {
      // Warnings are always logged
      console.warn(formatMessage(String(args[0])), ...args.slice(1))
    },
    error: (...args: unknown[]) => {
      // Errors are always logged
      console.error(formatMessage(String(args[0])), ...args.slice(1))
    },
  }
}

// Pre-configured loggers for different modules
export const emailLogger = createLogger({ prefix: 'Email' })
export const reminderLogger = createLogger({ prefix: 'Reminder' })
export const syncLogger = createLogger({ prefix: 'SyncService' })
export const pwaLogger = createLogger({ prefix: 'PWA' })

// Generic logger
export const logger = createLogger()

export { createLogger }
