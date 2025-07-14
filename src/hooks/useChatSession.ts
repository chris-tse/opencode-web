import { useState, useEffect, useCallback } from 'react'
import { useSessionStore } from '../stores/sessionStore'
import { useMessageStore } from '../stores/messageStore'
import { useEventStream } from './useEventStream'
import { useMessageHandling } from './useMessageHandling'
import { DEFAULT_SETTINGS } from '../utils/constants'

export function useChatSession() {
  const [selectedMode, setSelectedMode] = useState<string>(DEFAULT_SETTINGS.MODE)
  
  const { sessionId, isInitializing, error: sessionError, initializeSession } = useSessionStore()
  const { addErrorMessage } = useMessageStore()
  
  const { hasReceivedFirstEvent, setHasReceivedFirstEvent, isLoading, setIsLoading } = useEventStream()
  const { handleMessageSubmit } = useMessageHandling()

  // Initialize session on hook initialization
  useEffect(() => {
    initializeSession()
  }, [initializeSession])

  // Display session error if any
  useEffect(() => {
    if (sessionError) {
      addErrorMessage(sessionError)
    }
  }, [sessionError, addErrorMessage])

  const submitMessage = useCallback(async (userInput: string, mode?: string) => {
    const modeToUse = mode || selectedMode
    await handleMessageSubmit(
      userInput, 
      modeToUse, 
      isLoading, 
      setIsLoading, 
      hasReceivedFirstEvent, 
      setHasReceivedFirstEvent
    )
  }, [handleMessageSubmit, selectedMode, isLoading, setIsLoading, hasReceivedFirstEvent, setHasReceivedFirstEvent])

  return {
    // Session state
    sessionId,
    isInitializing,
    isLoading,
    
    // Mode management
    selectedMode,
    setSelectedMode,
    
    // Message submission
    submitMessage,
    
    // Computed states
    isDisabled: isLoading || !sessionId || isInitializing
  }
}