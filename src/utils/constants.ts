// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4096',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // 1 second
} as const

// Default Provider/Model Settings
export const DEFAULT_SETTINGS = {
  PROVIDER: 'anthropic',
  MODEL: 'claude-3-5-sonnet-20241022'
} as const

// Event Stream Configuration
export const EVENT_STREAM_CONFIG = {
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  RECONNECT_BACKOFF_MULTIPLIER: 2
} as const

// UI Constants
export const UI_CONFIG = {
  MAX_MESSAGE_LENGTH: 10000,
  TYPING_INDICATOR_DELAY: 500,
  AUTO_SCROLL_THRESHOLD: 100
} as const

// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  TOOL_INVOCATION: 'tool-invocation',
  REASONING: 'reasoning',
  FILE: 'file',
  SOURCE_URL: 'source-url'
} as const

// Tool States
export const TOOL_STATES = {
  CALL: 'call',
  PARTIAL_CALL: 'partial-call',
  RESULT: 'result'
} as const

// Event Types
export const EVENT_TYPES = {
  MESSAGE_UPDATED: 'message.updated',
  MESSAGE_PART_UPDATED: 'message.part.updated',
  SESSION_ERROR: 'session.error',
  SESSION_IDLE: 'session.idle'
} as const

// Error Names
export const ERROR_NAMES = {
  PROVIDER_AUTH_ERROR: 'ProviderAuthError',
  UNKNOWN_ERROR: 'UnknownError',
  MESSAGE_OUTPUT_LENGTH_ERROR: 'MessageOutputLengthError'
} as const