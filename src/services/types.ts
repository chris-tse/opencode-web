// Core API Types
export interface Session {
  id: string
  title: string
  version: string
  time: {
    created: number
    updated: number
  }
}

export interface Provider {
  id: string
  name: string
  env: string[]
  models: Record<string, Model>
}

export interface Model {
  id: string
  name: string
  release_date: string
  attachment: boolean
  reasoning: boolean
  temperature: boolean
  tool_call: boolean
  cost: {
    input: number
    output: number
    cache_read?: number
    cache_write?: number
  }
  limit: {
    context: number
    output: number
  }
}

export interface ProvidersResponse {
  providers: Provider[]
  default: Record<string, string>
}

// Message Types
export interface MessagePart {
  type: 'text' | 'tool-invocation' | 'reasoning' | 'file' | 'source-url' | 'step-start'
  text?: string
  mediaType?: string
  filename?: string
  url?: string
  toolInvocation?: ToolInvocation
  providerMetadata?: Record<string, unknown>
}

export interface ToolInvocation {
  state: 'call' | 'partial-call' | 'result'
  step?: number
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  result?: string
}

export interface MessageMetadata {
  time: {
    created: number
    completed?: number
  }
  sessionID: string
  tool: Record<string, ToolMetadata>
  assistant?: {
    system: string[]
    modelID: string
    providerID: string
    path: {
      cwd: string
      root: string
    }
    cost: number
    tokens: {
      input: number
      output: number
      reasoning: number
      cache: {
        read: number
        write: number
      }
    }
  }
}

export interface ToolMetadata {
  preview?: string     // File content preview (for read operations)
  diff?: string        // Unified diff format (for edit operations)
  diagnostics?: Record<string, unknown> // Error/warning information
  title?: string       // File name or operation title
  time?: {
    start: number      // Tool execution start time
    end: number        // Tool execution end time
  }
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  parts: MessagePart[]
  metadata: MessageMetadata
}

// Request Types
export interface SendMessageRequest {
  providerID: string
  modelID: string
  parts: MessagePart[]
}

// Event Stream Types
export interface StreamEvent {
  type: 'message.updated' | 'message.part.updated' | 'session.error' | 'session.idle'
  properties: StreamEventProperties
}

export type StreamEventProperties = 
  | MessageUpdatedProperties
  | MessagePartUpdatedProperties
  | SessionErrorProperties
  | SessionIdleProperties

export interface MessageUpdatedProperties {
  info: Message
}

export interface MessagePartUpdatedProperties {
  part: MessagePart
  sessionID: string
  messageID: string
}

export interface SessionErrorProperties {
  error: {
    name: 'ProviderAuthError' | 'UnknownError' | 'MessageOutputLengthError'
    data: {
      message: string
      providerID?: string
    }
  }
}

export interface SessionIdleProperties {
  sessionID: string
}

// Error Types
export interface ApiError {
  data: Record<string, unknown>
}

export interface AppError extends Error {
  code?: string
  statusCode?: number
  data?: unknown
}

// Config Types
export interface Config {
  API_BASE_URL: string
  DEFAULT_PROVIDER: string
  DEFAULT_MODEL: string
  EVENT_STREAM_URL: string
}