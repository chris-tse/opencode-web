import { useCallback } from 'react'
import { sendMessage } from '../services/api'
import { createTextMessageRequest } from '../utils/apiHelpers'
import { useSessionStore } from '../stores/sessionStore'
import { useModelStore } from '../stores/modelStore'
import { useMessageStore } from '../stores/messageStore'
import { logger } from '../lib/logger'

export function useMessageHandling() {
  const { sessionId, isInitializing, setIdle } = useSessionStore()
  const { selectedModel, getProviderForModel } = useModelStore()
  const { 
    addStatusMessage, 
    addUserMessage, 
    addErrorMessage, 
    setLastStatusMessage 
  } = useMessageStore()

  const handleMessageSubmit = useCallback(async (
    userInput: string, 
    selectedMode: string,
    isLoading: boolean,
    setIsLoading: (loading: boolean) => void,
    hasReceivedFirstEvent: boolean,
    setHasReceivedFirstEvent: (received: boolean) => void
  ) => {
    if (!userInput || !sessionId || isLoading || isInitializing) return
    
    setIsLoading(true)
    setHasReceivedFirstEvent(false)
    setLastStatusMessage('') // Reset last status for new conversation
    setIdle(false) // Reset idle state when starting new message
    
    // Add user message to messages
    addUserMessage(userInput)
    
    try {
      // Get the correct provider for the selected model
      const providerId = getProviderForModel(selectedModel)
      const message = createTextMessageRequest(userInput, sessionId, providerId, selectedModel, selectedMode)
      
      const response = await sendMessage(sessionId, message)
      // logger.debug('Message response:', response)
      
      // If we haven't received any events yet, handle the response directly
      if (!hasReceivedFirstEvent) {
        const hasTools = response.parts.some(part => part.type === 'tool')
        if (hasTools) {
          addStatusMessage('Processing tools...')
        }
        // Omit "Response received" status since receiving a message makes this apparent
      }
      
      // Note: Individual text parts will be added via event stream
      // No fallback needed - event stream handles all text parts
      
    } catch (error) {
      logger.error('Failed to send message:', error)
      addErrorMessage(`Failed to send message - ${error}`)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, isInitializing, selectedModel, getProviderForModel, addUserMessage, addStatusMessage, setLastStatusMessage, setIdle, addErrorMessage])

  return {
    handleMessageSubmit
  }
}