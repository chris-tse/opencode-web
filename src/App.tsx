import React, { useState, useEffect, useCallback, useRef, type FormEvent, useMemo } from 'react'
import { sendMessage } from './services/api'
import { createTextMessageRequest } from './utils/apiHelpers'
import { createEventStream } from './services/eventStream'
import type { Message, AssistantMessagePart, MessageMetadata, MessageUpdatedProperties, MessagePartUpdatedProperties, SessionErrorProperties } from './services/types'
import { getOverallToolStatus, getContextualToolStatus, hasActiveToolExecution, getToolProgress } from './utils/toolStatusHelpers'
import { MODE_LABELS, DEFAULT_SETTINGS } from './utils/constants'
import { useSessionStore } from './stores/sessionStore'
import { useModelStore } from './stores/modelStore'
import { useMessageStore } from './stores/messageStore'
import { Button } from './components/ui/button'
import { Textarea } from './components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import { ModelSelect } from './components/ModelSelect'
import { ChatContainer } from './components/Chat/ChatContainer'



function App() {
  const [isLoading, setIsLoading] = useState(false)
  const eventStream = useMemo(() => createEventStream(), [])
  const [hasReceivedFirstEvent, setHasReceivedFirstEvent] = useState(false)
  const [selectedMode, setSelectedMode] = useState<string>(DEFAULT_SETTINGS.MODE)

  const [currentMessageMetadata, setCurrentMessageMetadata] = useState<MessageMetadata | undefined>(undefined)
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { sessionId, isInitializing, error: sessionError, initializeSession, setIdle } = useSessionStore()
  const { selectedModel, getProviderForModel } = useModelStore()
  const { 
    messages, 
    addStatusMessage, 
    addTextMessage, 
    addUserMessage, 
    addErrorMessage, 
    removeLastEventMessage, 
    setLastStatusMessage 
  } = useMessageStore()



  // Update status based on message content
  const updateStatusFromMessage = useCallback((message: Message) => {
    if (!hasReceivedFirstEvent) {
      setHasReceivedFirstEvent(true)
    }
    
    // Store the current message metadata for use in part updates
    setCurrentMessageMetadata(message.metadata)
    
    // Check if message is complete
    if (message.metadata?.time?.completed) {
      setIsLoading(false)
      return
    }

    // Get tool status using helper functions
    if (hasActiveToolExecution(message)) {
      const status = getOverallToolStatus(message.parts || [])
      addStatusMessage(status)
    } else {
      const progress = getToolProgress(message)
      if (progress.total > 0) {
        addStatusMessage(`✓ Completed ${progress.total} tool${progress.total > 1 ? 's' : ''} - Generating response...`)
      } else {
        addStatusMessage('Generating response...')
      }
    }
  }, [hasReceivedFirstEvent, addStatusMessage])

  // Update status based on individual message parts
  const updateStatusFromPart = useCallback((part: AssistantMessagePart, messageId: string, messageMetadata?: MessageMetadata) => {
    if (!hasReceivedFirstEvent) {
      setHasReceivedFirstEvent(true)
    }

    if (part.type === 'tool' && part.state) {
      const status = getContextualToolStatus(part, messageMetadata)
      addStatusMessage(status)
      
      // If tool completed, add a generating response event
      if (part.state.status === 'completed') {
        setTimeout(() => {
          if (isLoading) {
            addStatusMessage('Generating response...')
          }
        }, 800)
      }
    } else if (part.type === 'text') {
      // Add each text part as a separate message bubble
      if (part.text && part.text.trim()) {
        addTextMessage(part.text, messageId)
      }
    } else if (part.type === 'step-start') {
      if (hasReceivedFirstEvent) {
        addStatusMessage('Processing next step...')
      }
    }
  }, [hasReceivedFirstEvent, isLoading, addStatusMessage, addTextMessage])


  // Initialize session and connect to event stream on app initialization
  useEffect(() => {
    initializeSession()
    
    // Connect to event stream
    eventStream.connect()
    
    // Subscribe to events
    eventStream.subscribe('message.updated', (data: MessageUpdatedProperties) => {
      // console.log('Message updated:', data)
      updateStatusFromMessage(data.info)
    })
    
    eventStream.subscribe('message.part.updated', (data: MessagePartUpdatedProperties) => {
      // console.log('Message part updated:', data)
      updateStatusFromPart(data.part, data.messageID, currentMessageMetadata)
    })
    
    eventStream.subscribe('session.error', (data: SessionErrorProperties) => {
      console.error('Session error:', data)
      addErrorMessage(data.error.data.message)
    })

    eventStream.subscribe('session.idle', (data: { sessionID: string }) => {
      if (data.sessionID === sessionId) {
        setIdle(true)
        setIsLoading(false)
        
        // Remove any lingering processing status messages
        removeLastEventMessage()
        
        // Reset last status message to prevent duplicates
        setLastStatusMessage('')
      }
    })
    
    // Cleanup on unmount
    return () => {
      eventStream.disconnect()
    }
  }, [eventStream, initializeSession, updateStatusFromMessage, updateStatusFromPart, currentMessageMetadata, sessionId, setIdle, addErrorMessage, removeLastEventMessage, setLastStatusMessage])

  // Display session error if any
  useEffect(() => {
    if (sessionError) {
      addErrorMessage(sessionError)
    }
  }, [sessionError, addErrorMessage])

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    const userInput = textareaRef.current?.value.trim() ?? '';
    if (!userInput || !sessionId || isLoading || isInitializing) return
    
    if (textareaRef.current) {
      textareaRef.current.value = '';
    }
    
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

  // Memoized keyboard event handler to prevent unnecessary re-renders
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  }, [handleSubmit])

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">OpenCode UI</h1>
      </div>
      
      <ChatContainer messages={messages} isLoading={isLoading} />

      <div className="space-y-2">
        <div className="flex gap-4 items-center">
          <div className="flex gap-2 items-center">
            <label htmlFor="mode-select" className="text-sm font-medium">Mode:</label>
            <Select value={selectedMode} onValueChange={setSelectedMode}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MODE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2 items-center">
            <label htmlFor="model-select" className="text-sm font-medium">Model:</label>
            <ModelSelect 
              disabled={isLoading || isInitializing}
            />
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            placeholder="Type your message..."
            disabled={isLoading || !sessionId || isInitializing}
            className="flex-1 min-h-[60px] resize-none"
            onKeyDown={handleKeyDown}
          />
          <Button 
            type="submit" 
            disabled={isLoading || !sessionId || isInitializing}
            className="self-end"
          >
            {isLoading ? 'Sending...' : isInitializing ? 'Initializing...' : 'Send'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default App
