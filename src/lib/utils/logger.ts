type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function getMinLevel(): LogLevel {
  const env = process.env.NODE_ENV
  return env === 'production' ? 'info' : 'debug'
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

function formatPretty(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): string {
  const timestamp = new Date().toISOString()
  const levelTag = level.toUpperCase().padEnd(5)
  const contextStr = context ? ` ${JSON.stringify(context)}` : ''
  return `${timestamp} [${levelTag}] ${message}${contextStr}`
}

function formatJson(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && { context }),
  })
}

function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): void {
  if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[getMinLevel()]) {
    return
  }

  const output = isProduction()
    ? formatJson(level, message, context)
    : formatPretty(level, message, context)

  switch (level) {
    case 'error':
      // eslint-disable-next-line no-console
      console.error(output)
      break
    case 'warn':
      // eslint-disable-next-line no-console
      console.warn(output)
      break
    default:
      // eslint-disable-next-line no-console
      console.log(output)
      break
  }
}

const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    log('debug', message, context)
  },
  info(message: string, context?: Record<string, unknown>) {
    log('info', message, context)
  },
  warn(message: string, context?: Record<string, unknown>) {
    log('warn', message, context)
  },
  error(message: string, context?: Record<string, unknown>) {
    log('error', message, context)
  },
}

export default logger
