import { useState, useEffect, type FormEvent } from 'react'
import { createSession, sendMessage } from './services/api'
import { createTextMessageRequest } from './utils/apiHelpers'
import { createEventStream } from './services/eventStream'
// import { EventStreamDebug } from './components/Debug/EventStreamDebug'
import { getOverallToolStatus, hasActiveToolExecution, getToolProgress } from './utils/toolStatusHelpers'
import { Button } from './components/ui/button'
import { Textarea } from './components/ui/textarea'
import { ScrollArea } from './components/ui/scroll-area'
import { Avatar, AvatarFallback } from './components/ui/avatar'

function App() {
  const [input, setInput] = useState('')
  const [responses, setResponses] = useState<string[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<string>('')
  const [eventStream] = useState(() => createEventStream())
  const [hasReceivedFirstEvent, setHasReceivedFirstEvent] = useState(false)

  // Update status based on message content
  const updateStatusFromMessage = (message: any) => {
    if (!hasReceivedFirstEvent) {
      setHasReceivedFirstEvent(true)
    }
    
    // Check if message is complete
    if (message.metadata?.time?.completed) {
      setCurrentStatus('')
      setIsLoading(false)
      return
    }

    // Get tool status using helper functions
    if (hasActiveToolExecution(message)) {
      const status = getOverallToolStatus(message.parts || [])
      setCurrentStatus(status)
    } else {
      const progress = getToolProgress(message)
      if (progress.total > 0) {
        setCurrentStatus(`✓ Completed ${progress.total} tool${progress.total > 1 ? 's' : ''} - Generating response...`)
      } else {
        setCurrentStatus('Generating response...')
      }
    }
  }

  // Update status based on individual message parts
  const updateStatusFromPart = (part: any) => {
    if (!hasReceivedFirstEvent) {
      setHasReceivedFirstEvent(true)
    }

    if (part.type === 'tool-invocation' && part.toolInvocation) {
      const status = getOverallToolStatus([part])
      setCurrentStatus(status)
      
      // If tool completed, briefly show completion then switch to generating
      if (part.toolInvocation.state === 'result') {
        setTimeout(() => {
          if (isLoading) {
            setCurrentStatus('Generating response...')
          }
        }, 800)
      }
    } else if (part.type === 'text') {
      setCurrentStatus('Generating response...')
    } else if (part.type === 'step-start') {
      if (hasReceivedFirstEvent) {
        setCurrentStatus('Processing next step...')
      }
    }
  }


  // Auto-create session and connect to event stream on app initialization
  useEffect(() => {
    const initSession = async () => {
      try {
        const session = await createSession()
        setSessionId(session.id)
        
        // Connect to event stream
        eventStream.connect()
        
        // Subscribe to events
        eventStream.subscribe('message.updated', (data: any) => {
          // console.log('Message updated:', data)
          updateStatusFromMessage(data.info)
        })
        
        eventStream.subscribe('message.part.updated', (data: any) => {
          // console.log('Message part updated:', data)
          updateStatusFromPart(data.part)
        })
        
        eventStream.subscribe('session.error', (data: any) => {
          console.error('Session error:', data)
          setResponses(prev => [...prev, `Error: ${data.error.data.message}`])
        })
        
      } catch (error) {
        console.error('Failed to create session:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        setResponses(prev => [...prev, `Error: Failed to initialize session - ${errorMessage}`])
      }
    }
    initSession()
    
    // Cleanup on unmount
    return () => {
      eventStream.disconnect()
    }
  }, [eventStream])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !sessionId || isLoading) return
    
    const userInput = input.trim()
    setInput('')
    setIsLoading(true)
    setHasReceivedFirstEvent(false)
    setCurrentStatus('Sending message...')
    
    // Add user message to responses
    setResponses(prev => [...prev, `You: ${userInput}`])
    
    try {
      const message = createTextMessageRequest(userInput)
      
      // Initial status - will be updated by event stream
      setCurrentStatus('Waiting for response...')
      
      const response = await sendMessage(sessionId, message)
      // console.log('Message response:', response)
      
      // If we haven't received any events yet, handle the response directly
      if (!hasReceivedFirstEvent) {
        const hasTools = response.parts.some(part => part.type === 'tool-invocation')
        if (hasTools) {
          setCurrentStatus('Processing tools...')
        } else {
          setCurrentStatus('Response received')
        }
      }
      
      // Extract text content from response parts
      const textParts = response.parts
        .filter(part => part.type === 'text')
        .map(part => part.text)
        .join('')
      
      // Add the assistant's response
      setResponses(prev => [...prev, `Assistant: ${textParts}`])
      
    } catch (error) {
      console.error('Failed to send message:', error)
      setResponses(prev => [...prev, `Error: Failed to send message - ${error}`])
    } finally {
      setIsLoading(false)
      setCurrentStatus('')
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">OpenCode UI</h1>
      </div>
      
      <ScrollArea className="flex-1 mb-4 border rounded-lg p-4">
        <div className="space-y-4">
          {responses.map((response, index) => {
            const isUser = response.startsWith('You: ')
            const isAssistant = response.startsWith('Assistant: ')
            const isError = response.startsWith('Error: ')
            const content = isUser ? response.slice(5) : isAssistant ? response.slice(11) : response
            
            return (
              <div key={index} className="flex items-start gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    {isUser ? 'U' : isAssistant ? 'A' : '!'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className={`rounded-lg p-3 ${
                    isUser ? 'bg-blue-50' : 
                    isError ? 'bg-red-50 text-red-700' : 
                    'bg-gray-50'
                  }`}>
                    <div className="whitespace-pre-wrap">{content}</div>
                  </div>
                </div>
              </div>
            )
          })}
          
          {isLoading && currentStatus && (
            <div className="flex items-start gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback>A</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-gray-600 italic">{currentStatus}</div>
                  {currentStatus.includes('...') && (
                    <div className="mt-2">
                      <div className="animate-pulse flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading || !sessionId}
          className="flex-1 min-h-[60px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
        />
        <Button 
          type="submit" 
          disabled={isLoading || !sessionId || !input.trim()}
          className="self-end"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </Button>
      </form>

      {/* Debug component - only shows in development */}
      {/* <EventStreamDebug eventStream={eventStream} /> */}
    </div>
  )
}

export default App
