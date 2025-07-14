import { create } from 'zustand'
import { logger } from '../lib/logger'

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'event' | 'error'
  content: string
  timestamp: number
}

interface MessageState {
  messages: ChatMessage[]
  lastStatusMessage: string
  
  // Actions
  addMessage: (message: ChatMessage) => void
  addMessages: (messages: ChatMessage[]) => void
  addStatusMessage: (status: string) => void
  addTextMessage: (text: string, messageId: string) => void
  addUserMessage: (content: string) => void
  addErrorMessage: (content: string) => void
  removeMessage: (id: string) => void
  removeLastEventMessage: () => void
  clearMessages: () => void
  setLastStatusMessage: (status: string) => void
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  lastStatusMessage: '',
  
  addMessage: (message: ChatMessage) => {
    set((state) => ({
      messages: [...state.messages, message]
    }))
  },
  
  addMessages: (messages: ChatMessage[]) => {
    set((state) => ({
      messages: [...state.messages, ...messages]
    }))
  },
  
  addStatusMessage: (status: string) => {
    const { lastStatusMessage } = get()
    if (status !== lastStatusMessage) {
      const message: ChatMessage = {
        id: `event-${Date.now()}-${Math.random()}`,
        type: 'event',
        content: status,
        timestamp: Date.now()
      }
      set((state) => ({
        messages: [...state.messages, message],
        lastStatusMessage: status
      }))
    }
  },
  
  addTextMessage: (text: string, messageId: string) => {
    set((state) => {
      // Debug: Log message details to help identify echo issue
      logger.debug('addTextMessage called:', { 
        messageId, 
        textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        lastMessageId: state.messages[state.messages.length - 1]?.id,
        lastMessageType: state.messages[state.messages.length - 1]?.type
      })
      
      // Check if the last message is an assistant message with the same messageId
      const lastMessage = state.messages[state.messages.length - 1]
      const canUpdateLastMessage = lastMessage && 
        lastMessage.type === 'assistant' && 
        lastMessage.id === messageId
      
      if (canUpdateLastMessage) {
        // Update the last message by replacing content
        const updatedMessages = [...state.messages]
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMessage,
          content: text,
          timestamp: Date.now()
        }
        return { messages: updatedMessages }
      } else {
        // Create new message
        const message: ChatMessage = {
          id: messageId,
          type: 'assistant',
          content: text,
          timestamp: Date.now()
        }
        return { messages: [...state.messages, message] }
      }
    })
  },
  
  addUserMessage: (content: string) => {
    const message: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content,
      timestamp: Date.now()
    }
    set((state) => ({
      messages: [...state.messages, message]
    }))
  },
  
  addErrorMessage: (content: string) => {
    const message: ChatMessage = {
      id: `error-${Date.now()}-${Math.random()}`,
      type: 'error',
      content,
      timestamp: Date.now()
    }
    set((state) => ({
      messages: [...state.messages, message]
    }))
  },
  
  removeMessage: (id: string) => {
    set((state) => ({
      messages: state.messages.filter(msg => msg.id !== id)
    }))
  },
  
  removeLastEventMessage: () => {
    set((state) => {
      const lastMsg = state.messages[state.messages.length - 1];
      if (
        lastMsg &&
        lastMsg.type === 'event' &&
        (
          lastMsg.content.includes('Processing tools...') ||
          lastMsg.content.includes('Executing tools...') ||
          lastMsg.content.includes('...')
        )
      ) {
        return {
          messages: state.messages.slice(0, -1)
        };
      }
      return state;
    });
  },
  
  clearMessages: () => {
    set({
      messages: [],
      lastStatusMessage: ''
    })
  },
  
  setLastStatusMessage: (status: string) => {
    set({ lastStatusMessage: status })
  }
}))
