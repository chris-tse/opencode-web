import { create } from 'zustand'
import { createSession } from '../services/api'

interface SessionState {
  sessionId: string | null
  isInitializing: boolean
  error: string | null
  isIdle: boolean
  initializeSession: () => Promise<void>
  clearSession: () => void
  setIdle: (idle: boolean) => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessionId: null,
  isInitializing: false,
  error: null,
  isIdle: false,

  initializeSession: async () => {
    console.log('initializeSession')
    const { sessionId, isInitializing } = get()
    
    // Don't create a new session if one already exists or is being created
    if (sessionId || isInitializing) {
      return
    }

    set({ isInitializing: true, error: null })

    try {
      const session = await createSession()
      set({ sessionId: session.id, isInitializing: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      set({ 
        error: `Failed to initialize session - ${errorMessage}`, 
        isInitializing: false 
      })
    }
  },

  clearSession: () => {
    set({ sessionId: null, error: null, isInitializing: false, isIdle: false })
  },

  setIdle: (idle: boolean) => {
    set({ isIdle: idle })
  }
}))
