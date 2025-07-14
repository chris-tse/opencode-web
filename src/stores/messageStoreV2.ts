import { create } from 'zustand'

// API-aligned types from OpenAPI spec
interface Message {
  id: string
  sessionID: string
  role: 'user' | 'assistant'
  time: {
    created: number
    completed?: number
  }
  // Assistant-specific fields
  error?: any
  system?: string[]
  modelID?: string
  providerID?: string
  path?: {
    cwd: string
    root: string
  }
  summary?: boolean
  cost?: number
  tokens?: {
    input: number
    output: number
    reasoning: number
    cache: {
      read: number
      write: number
    }
  }
}

interface Part {
  id: string
  sessionID: string
  messageID: string
  type: 'text' | 'file' | 'tool' | 'step-start' | 'step-finish'
  // Type-specific fields will be added based on part type
  text?: string
  synthetic?: boolean
  time?: {
    start: number
    end?: number
  }
  // Tool-specific fields
  callID?: string
  tool?: string
  state?: any
  // File-specific fields
  mime?: string
  filename?: string
  url?: string
  // Step-specific fields
  cost?: number
  tokens?: any
}

interface MessageWithParts {
  info: Message
  parts: Part[]
}

interface MessageStoreV2State {
  messages: MessageWithParts[]
  
  // Session management
  hydrateFromSession: (messages: MessageWithParts[]) => void
  
  // Event stream handlers
  handleMessageUpdated: (info: Message) => void
  handlePartUpdated: (part: Part) => void
  handleMessageRemoved: (messageId: string) => void
  
  // User actions
  addUserMessage: (content: string, messageId: string) => void
  clearMessages: () => void
}

export const useMessageStoreV2 = create<MessageStoreV2State>((set) => ({
  messages: [],
  
  hydrateFromSession: (messages: MessageWithParts[]) => {
    set({ messages })
  },
  
  handleMessageUpdated: (info: Message) => {
    set((state) => {
      const existingIndex = state.messages.findIndex(msg => msg.info.id === info.id)
      if (existingIndex >= 0) {
        const updatedMessages = [...state.messages]
        updatedMessages[existingIndex] = {
          ...updatedMessages[existingIndex],
          info
        }
        return { messages: updatedMessages }
      } else {
        return {
          messages: [...state.messages, { info, parts: [] }]
        }
      }
    })
  },
  
  handlePartUpdated: (part: Part) => {
    set((state) => {
      const messageIndex = state.messages.findIndex(msg => msg.info.id === part.messageID)
      if (messageIndex >= 0) {
        const updatedMessages = [...state.messages]
        const message = updatedMessages[messageIndex]
        const partIndex = message.parts.findIndex(p => p.id === part.id)
        
        if (partIndex >= 0) {
          message.parts[partIndex] = part
        } else {
          message.parts.push(part)
        }
        
        return { messages: updatedMessages }
      }
      return state
    })
  },
  
  handleMessageRemoved: (messageId: string) => {
    set((state) => ({
      messages: state.messages.filter(msg => msg.info.id !== messageId)
    }))
  },
  
  addUserMessage: (content: string, messageId: string) => {
    const userMessage: MessageWithParts = {
      info: {
        id: messageId,
        sessionID: '', // Will be set by caller
        role: 'user',
        time: { created: Date.now() }
      },
      parts: [{
        id: `${messageId}-text`,
        sessionID: '',
        messageID: messageId,
        type: 'text',
        text: content,
        time: { start: Date.now() }
      }]
    }
    
    set((state) => ({
      messages: [...state.messages, userMessage]
    }))
  },
  
  clearMessages: () => {
    set({ messages: [] })
  }
}))