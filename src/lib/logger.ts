interface Logger {
  log: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
}

const isDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return params.has('debug') && params.get('debug') !== 'false'
}

const createLogger = (): Logger => {
  const noop = () => {}

  return {
    log: (...args) => isDebugEnabled() ? console.log(...args) : noop(),
    info: (...args) => isDebugEnabled() ? console.info(...args) : noop(),
    warn: (...args) => isDebugEnabled() ? console.warn(...args) : noop(),
    error: (...args) => isDebugEnabled() ? console.error(...args) : noop(),
    debug: (...args) => isDebugEnabled() ? console.debug(...args) : noop(),
  }
}

export const logger = createLogger()