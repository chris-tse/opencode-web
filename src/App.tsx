import {memo, useState, useEffect, useCallback } from 'react'
import { DEFAULT_SETTINGS } from './utils/constants'
import { useSessionStore } from './stores/sessionStore'
import { useMessageStore } from './stores/messageStore'
import { useEventStream } from './hooks/useEventStream'
import { useMessageHandling } from './hooks/useMessageHandling'
import { ChatContainer } from './components/Chat/ChatContainer'
import { MessageInput } from './components/Chat/MessageInput'
import { SettingsPanel } from './components/Settings/SettingsPanel'

const MemoizedSettingsPanel = memo(SettingsPanel)

function App() {
  const [selectedMode, setSelectedMode] = useState<string>(DEFAULT_SETTINGS.MODE)
  
  const { sessionId, isInitializing, error: sessionError, initializeSession } = useSessionStore()
  const { 
    addErrorMessage
  } = useMessageStore()
  
  const { hasReceivedFirstEvent, setHasReceivedFirstEvent, isLoading, setIsLoading } = useEventStream()
  const { handleMessageSubmit } = useMessageHandling()



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

  const onMessageSubmit = useCallback(async (userInput: string) => {
    await handleMessageSubmit(
      userInput, 
      selectedMode, 
      isLoading, 
      setIsLoading, 
      hasReceivedFirstEvent, 
      setHasReceivedFirstEvent
    )
  }, [handleMessageSubmit, selectedMode, isLoading, setIsLoading, hasReceivedFirstEvent, setHasReceivedFirstEvent])



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
          onSubmit={onMessageSubmit}
          disabled={isLoading || !sessionId || isInitializing}
          isLoading={isLoading}
          isInitializing={isInitializing}
        />
      </div>
    </div>
  )
}

export default App
