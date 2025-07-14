interface Logger {
  log: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
  debug: (message: string, ...args: unknown[]) => void
}

const isDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return params.has('debug') && params.get('debug') !== 'false'
}

const createLogger = (): Logger => {
  const enabled = isDebugEnabled()

  const noop = () => {}

  return {
    log: enabled ? console.log.bind(console) : noop,
    info: enabled ? console.info.bind(console) : noop,
    warn: enabled ? console.warn.bind(console) : noop,
    error: enabled ? console.error.bind(console) : noop,
    debug: enabled ? console.debug.bind(console) : noop,
  }
}

export const logger = createLogger()