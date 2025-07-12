import { useState, useEffect, useCallback, useRef, type FormEvent, useMemo } from 'react'
import { sendMessage } from './services/api'
import { createTextMessageRequest } from './utils/apiHelpers'
import { createEventStream } from './services/eventStream'
import type { Message, AssistantMessagePart, MessageMetadata, MessageUpdatedProperties, MessagePartUpdatedProperties, SessionErrorProperties } from './services/types'
// import { EventStreamDebug } from './components/Debug/EventStreamDebug'
import { getOverallToolStatus, getContextualToolStatus, hasActiveToolExecution, getToolProgress } from './utils/toolStatusHelpers'
import { MODE_LABELS, DEFAULT_SETTINGS } from './utils/constants'
import { useSessionStore } from './stores/sessionStore'
import { useModelStore } from './stores/modelStore'
import { useMessageStore } from './stores/messageStore'
import { Button } from './components/ui/button'
import { Textarea } from './components/ui/textarea'
import { ScrollArea } from './components/ui/scroll-area'
import { Avatar, AvatarFallback } from './components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import { ModelSelect } from './components/ModelSelect'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

function App() {
  const [isLoading, setIsLoading] = useState(false)
  const eventStream = useMemo(() => createEventStream(), [])
  const [hasReceivedFirstEvent, setHasReceivedFirstEvent] = useState(false)
  const [selectedMode, setSelectedMode] = useState<string>(DEFAULT_SETTINGS.MODE)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

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

  async function handleSubmit(e: FormEvent) {
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
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">OpenCode UI</h1>
      </div>
      
      <ScrollArea ref={scrollAreaRef} className="h-[calc(100vh-280px)] mb-4 border rounded-lg p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            return (
              <div key={message.id} className="flex items-start gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    {message.type === 'user' ? 'U' : 
                     message.type === 'assistant' ? 'A' : 
                     message.type === 'event' ? '⚡' : '!'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                   <div className={`rounded-lg p-3 ${
                     message.type === 'user' ? 'bg-blue-50' : 
                     message.type === 'event' ? 'bg-yellow-50 text-yellow-800' :
                     message.type === 'error' ? 'bg-red-50 text-red-700' : 
                     'bg-gray-50'
                   } ${message.type === 'assistant' ? 'prose prose-sm max-w-none' : ''}`}>                     {message.type === 'assistant' ? (
                        <ReactMarkdown
                          components={{
                            code({ inline, className, children, ...props }: {
                              inline?: boolean
                              className?: string
                              children?: React.ReactNode
                            }) {
                              const match = /language-(\w+)/.exec(className || '')
                              return !inline && match ? (                               <SyntaxHighlighter
                                 style={oneDark}
                                 language={match[1]}
                                 PreTag="div"
                                 {...props}
                               >
                                 {String(children).replace(/\n$/, '')}
                               </SyntaxHighlighter>
                             ) : (
                               <code className={className} {...props}>
                                 {children}
                               </code>
                             )
                           },
                         }}
                       >
                         {message.content}
                       </ReactMarkdown>
                     ) : (
                       <div className="whitespace-pre-wrap">{message.content}</div>
                     )}                    {message.type === 'event' && message.content.includes('...') && (
                      <div className="mt-2">
                        <div className="animate-pulse flex space-x-1">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

        </div>
      </ScrollArea>

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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
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

      {/* Debug component - only shows in development */}
      {/* <EventStreamDebug eventStream={eventStream} /> */}
    </div>
  )
}

export default App
