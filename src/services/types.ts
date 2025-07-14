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

// Message part types for assistant messages
export type AssistantMessagePart = TextPart | ToolPart | StepStartPart | StepFinishPart

export interface StepStartPart {
  type: 'step-start'
  text: string
}

export interface StepFinishPart {
  type: 'step-finish'
  text: string
}

export interface ToolPart {
  type: 'tool'
  id: string
  tool: string
  state: ToolState
}

export type ToolState = ToolStatePending | ToolStateRunning | ToolStateCompleted | ToolStateError

export interface ToolStatePending {
  status: 'pending'
}

export interface ToolStateRunning {
  status: 'running'
  args?: Record<string, unknown>
}

export interface ToolStateCompleted {
  status: 'completed'
  args?: Record<string, unknown>
  result?: string
}

export interface ToolStateError {
  status: 'error'
  args?: Record<string, unknown>
  error?: string
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
  parts: AssistantMessagePart[]
  metadata: MessageMetadata
}

// Request Types
export interface SendMessageRequest {
  messageID: string
  providerID: string
  modelID: string
  mode: string
  parts: UserMessagePart[]
}

// User message part types (limited to text and file only)
export type UserMessagePart = TextPart | FilePart

export interface TextPart {
  id: string
  sessionID: string
  messageID: string
  type: 'text'
  text: string
}

export interface FilePart {
  id: string
  sessionID: string
  messageID: string
  type: 'file'
  mime: string
  url: string
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
  part: AssistantMessagePart
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

// Todo Types
export interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  id: string
  priority: 'high' | 'medium' | 'low'
}

export const isTodoArgs = (args?: Record<string, unknown>): args is { todos: TodoItem[] } => {
  return args != null && 
         Array.isArray(args.todos) && 
         args.todos.every(todo => 
           typeof todo === 'object' && 
           todo != null &&
           typeof todo.content === 'string' &&
           typeof todo.status === 'string' &&
           typeof todo.id === 'string' &&
           typeof todo.priority === 'string'
         )
}

// Config Types
export interface Config {
  API_BASE_URL: string
  DEFAULT_PROVIDER: string
  DEFAULT_MODEL: string
  EVENT_STREAM_URL: string
}