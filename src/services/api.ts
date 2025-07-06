import type {
  Session,
  ProvidersResponse,
  Message,
  SendMessageRequest,
  AppError
} from './types'
import { retryRequest, withTimeout } from '../utils/apiHelpers'
import { API_CONFIG } from '../utils/constants'

// Configuration
const API_BASE_URL = API_CONFIG.BASE_URL

// Utility function to create AppError from response
const createAppError = async (response: Response): Promise<AppError> => {
  let errorData: Record<string, unknown> = {}
  
  try {
    errorData = await response.json()
  } catch {
    // If JSON parsing fails, use response text
    errorData = { message: response.statusText }
  }

  const message = typeof errorData.message === 'string' ? errorData.message : `HTTP ${response.status}`
  const error = new Error(message) as AppError
  error.statusCode = response.status
  error.code = typeof errorData.code === 'string' ? errorData.code : undefined
  error.data = errorData
  
  return error
}

// Generic fetch wrapper with error handling, timeout, and retry
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  }

  const makeRequest = async (): Promise<T> => {
    const response = await fetch(url, { ...defaultOptions, ...options })

    if (!response.ok) {
      throw await createAppError(response)
    }

    return response.json()
  }

  // Apply timeout and retry logic
  return retryRequest(() => withTimeout(makeRequest(), API_CONFIG.TIMEOUT))
}

// Session Management
export const createSession = async (): Promise<Session> => {
  return apiRequest<Session>('/session', {
    method: 'POST'
  })
}

export const listSessions = async (): Promise<Session[]> => {
  return apiRequest<Session[]>('/session')
}

export const deleteSession = async (sessionId: string): Promise<boolean> => {
  return apiRequest<boolean>(`/session/${sessionId}`, {
    method: 'DELETE'
  })
}

// Provider and Model Management
export const getProviders = async (): Promise<ProvidersResponse> => {
  return apiRequest<ProvidersResponse>('/config/providers')
}

// Message Management
export const sendMessage = async (
  sessionId: string,
  request: SendMessageRequest
): Promise<Message> => {
  return apiRequest<Message>(`/session/${sessionId}/message`, {
    method: 'POST',
    body: JSON.stringify(request)
  })
}

// App Management
export const getAppInfo = async (): Promise<Record<string, unknown>> => {
  return apiRequest<Record<string, unknown>>('/app')
}

export const initializeApp = async (): Promise<boolean> => {
  return apiRequest<boolean>('/app/init', {
    method: 'POST'
  })
}

export const getConfig = async (): Promise<Record<string, unknown>> => {
  return apiRequest<Record<string, unknown>>('/config')
}

// Utility functions for common operations
export const createTextMessage = (text: string): SendMessageRequest['parts'] => [
  { type: 'text', text }
]

export const createFileMessage = (
  filename: string,
  mediaType: string,
  url: string
): SendMessageRequest['parts'] => [
  { type: 'file', filename, mediaType, url }
]

// Default export with all API functions
export const api = {
  // Session
  createSession,
  listSessions,
  deleteSession,
  
  // Providers
  getProviders,
  
  // Messages
  sendMessage,
  
  // App
  getAppInfo,
  initializeApp,
  getConfig,
  
  // Utilities
  createTextMessage,
  createFileMessage
}

export default api