import type { SendMessageRequest, UserMessagePart } from '../services/types'
import { API_CONFIG, DEFAULT_SETTINGS } from './constants'

// Retry logic with exponential backoff
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  maxAttempts: number = API_CONFIG.RETRY_ATTEMPTS,
  baseDelay: number = API_CONFIG.RETRY_DELAY
): Promise<T> => {
  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await requestFn()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on client errors (4xx)
      if (error instanceof Error && 'statusCode' in error) {
        const statusCode = (error as { statusCode: number }).statusCode
        if (statusCode >= 400 && statusCode < 500) {
          throw error
        }
      }

      if (attempt === maxAttempts) {
        break
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// Request timeout wrapper
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = API_CONFIG.TIMEOUT
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ])
}

// ID generation utility
const generateId = (): string => {
  return crypto.randomUUID()
}

// Message creation helpers
export const createTextMessageRequest = (
  text: string,
  sessionID: string,
  providerID: string = DEFAULT_SETTINGS.PROVIDER,
  modelID: string = DEFAULT_SETTINGS.MODEL,
  mode: string = 'build'
): SendMessageRequest => {
  const messageID = generateId()
  return {
    messageID,
    providerID,
    modelID,
    mode,
    parts: [{
      id: generateId(),
      sessionID,
      messageID,
      type: 'text',
      text
    }]
  }
}

export const createFileMessageRequest = (
  mime: string,
  url: string,
  sessionID: string,
  providerID: string = DEFAULT_SETTINGS.PROVIDER,
  modelID: string = DEFAULT_SETTINGS.MODEL,
  mode: string = 'build'
): SendMessageRequest => {
  const messageID = generateId()
  return {
    messageID,
    providerID,
    modelID,
    mode,
    parts: [{
      id: generateId(),
      sessionID,
      messageID,
      type: 'file',
      mime,
      url
    }]
  }
}

export const createMixedMessageRequest = (
  parts: UserMessagePart[],
  providerID: string = DEFAULT_SETTINGS.PROVIDER,
  modelID: string = DEFAULT_SETTINGS.MODEL,
  mode: string = 'build'
): SendMessageRequest => ({
  messageID: generateId(),
  providerID,
  modelID,
  mode,
  parts
})

// Validation helpers
export const validateMessageText = (text: string): boolean => {
  return text.trim().length > 0 && text.length <= 10000
}

export const validateProviderModel = (providerID: string, modelID: string): boolean => {
  return providerID.length > 0 && modelID.length > 0
}

// Error formatting
export const formatApiError = (error: unknown): string => {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>
    
    if (err.data && typeof err.data === 'object') {
      const data = err.data as Record<string, unknown>
      if (typeof data.message === 'string') {
        return data.message
      }
    }
    
    if (typeof err.message === 'string') {
      return err.message
    }
    
    if (typeof err.statusCode === 'number') {
      const statusText = typeof err.statusText === 'string' ? err.statusText : 'Unknown error'
      return `HTTP ${err.statusCode}: ${statusText}`
    }
  }
  
  return 'An unexpected error occurred'
}

// Session ID validation
export const isValidSessionId = (sessionId: string): boolean => {
  return sessionId.startsWith('ses') && sessionId.length > 3
}

// URL validation for file uploads
export const isValidFileUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// MIME type validation
export const isValidMediaType = (mediaType: string): boolean => {
  const validTypes = [
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
  
  return validTypes.includes(mediaType) || mediaType.startsWith('text/') || mediaType.startsWith('image/')
}