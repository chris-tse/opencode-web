import {memo, useState, useEffect, useCallback } from 'react'
import { sendMessage } from './services/api'
import { createTextMessageRequest } from './utils/apiHelpers'
import { DEFAULT_SETTINGS } from './utils/constants'
import { useSessionStore } from './stores/sessionStore'
import { useModelStore } from './stores/modelStore'
import { useMessageStore } from './stores/messageStore'
import { useEventStream } from './hooks/useEventStream'
import { ChatContainer } from './components/Chat/ChatContainer'
import { MessageInput } from './components/Chat/MessageInput'
import { SettingsPanel } from './components/Settings/SettingsPanel'

const MemoizedSettingsPanel = memo(SettingsPanel)

function App() {
  const [selectedMode, setSelectedMode] = useState<string>(DEFAULT_SETTINGS.MODE)
  
  const { sessionId, isInitializing, error: sessionError, initializeSession, setIdle } = useSessionStore()
  const { selectedModel, getProviderForModel } = useModelStore()
  const { 
    addStatusMessage, 
    addUserMessage, 
    addErrorMessage, 
    setLastStatusMessage 
  } = useMessageStore()
  
  const { hasReceivedFirstEvent, setHasReceivedFirstEvent, isLoading, setIsLoading } = useEventStream()



  // Initialize session on app initialization
  useEffect(() => {
    initializeSession()
  }, [initializeSession])

  // Display session error if any
  useEffect(() => {
    if (sessionError) {
      addErrorMessage(sessionError)
    }
  }, [sessionError, addErrorMessage])

  const handleMessageSubmit = useCallback(async (userInput: string) => {
    if (!userInput || !sessionId || isLoading || isInitializing) return
    
    setIsLoading(true)
    setHasReceivedFirstEvent(false)
    setLastStatusMessage('') // Reset last status for new conversation
    setIdle(false) // Reset idle state when starting new message
    
    // Add user message to messages
    addUserMessage(userInput)
    addStatusMessage('Sending message...')
    
    try {
      // Get the correct provider for the selected model
      const providerId = getProviderForModel(selectedModel)
      const message = createTextMessageRequest(userInput, providerId, selectedModel, selectedMode)
      
      // Initial status - will be updated by event stream
      addStatusMessage('Waiting for response...')
      
      const response = await sendMessage(sessionId, message)
      // console.log('Message response:', response)
      
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
      console.error('Failed to send message:', error)
      addErrorMessage(`Failed to send message - ${error}`)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, isLoading, isInitializing, hasReceivedFirstEvent, selectedModel, selectedMode, getProviderForModel, addUserMessage, addStatusMessage, setLastStatusMessage, setIdle, addErrorMessage])



  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">OpenCode UI</h1>
      </div>
      
      <ChatContainer isLoading={isLoading} />

      <div className="space-y-2">
        <MemoizedSettingsPanel 
          selectedMode={selectedMode}
          onModeChange={setSelectedMode}
        />
        
        <MessageInput
          onSubmit={handleMessageSubmit}
          disabled={isLoading || !sessionId || isInitializing}
          isLoading={isLoading}
          isInitializing={isInitializing}
        />
      </div>
    </div>
  )
}

export default App
