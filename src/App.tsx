import { useState, useEffect, useRef, type FormEvent } from 'react'
import { createSession, sendMessage } from './services/api'
import { createTextMessageRequest } from './utils/apiHelpers'
import { createEventStream } from './services/eventStream'
import type { StreamEvent } from './services/types'
import './App.css'

function App() {
  const [input, setInput] = useState('')
  const [responses, setResponses] = useState<string[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentResponse, setCurrentResponse] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const eventStreamRef = useRef<ReturnType<typeof createEventStream> | null>(null)

  // Auto-create session on app initialization
  useEffect(() => {
    const initSession = async () => {
      try {
        const session = await createSession()
        setSessionId(session.id)
      } catch (error) {
        console.error('Failed to create session:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        setResponses(prev => [...prev, `Error: Failed to initialize session - ${errorMessage}`])
      }
    }
    initSession()
  }, [])

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventStreamRef.current) {
        eventStreamRef.current.disconnect()
      }
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !sessionId || isLoading) return
    
    const userInput = input.trim()
    setInput('')
    setIsLoading(true)
    
    // Add user message to responses
    setResponses(prev => [...prev, `You: ${userInput}`])
    
    try {
      const message = createTextMessageRequest(userInput)
      const response = await sendMessage(sessionId, message)
      
      console.log('Message response:', response)
      
      // Start streaming the response
      setIsStreaming(true)
      setCurrentResponse('')
      
      // Create EventStream connection for streaming with session ID
      const eventStream = createEventStream()
      eventStreamRef.current = eventStream
      
      // Subscribe to all event types for debugging
      eventStream.subscribe('message.updated', (data: StreamEvent) => {
        console.log('message.updated event:', data)
        handleStreamEvent(data)
      })
      
      eventStream.subscribe('session.idle', (data: StreamEvent) => {
        console.log('session.idle event:', data)
        handleStreamEvent(data)
      })
      
      eventStream.subscribe('session.error', (data: StreamEvent) => {
        console.log('session.error event:', data)
        handleStreamEvent(data)
      })
      
      // Connect to the stream
      eventStream.connect()
      
    } catch (error) {
      console.error('Failed to send message:', error)
      setResponses(prev => [...prev, `Error: Failed to send message - ${error}`])
    } finally {
      setIsLoading(false)
    }
  }

  const handleStreamEvent = (event: StreamEvent) => {
    console.log('Stream chunk received:', event)
    
    if (event.type === 'message.updated') {
      // Update the current streaming response
      const content = extractTextContent(event)
      setCurrentResponse(content)
    } else if (event.type === 'session.idle') {
      // Stream finished
      setIsStreaming(false)
      if (currentResponse) {
        setResponses(prev => [...prev, `Assistant: ${currentResponse}`])
        setCurrentResponse('')
      }
    }
  }

  const extractTextContent = (event: StreamEvent): string => {
    // Extract text content from the stream event
    // This is a simplified version - you may need to adjust based on the actual event structure
    try {
      return JSON.stringify(event.properties, null, 2)
    } catch {
      return 'Streaming response...'
    }
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      {/* Response area */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        marginBottom: '20px',
        border: '1px solid #ccc',
        padding: '10px',
        borderRadius: '4px'
      }}>
        {responses.map((response, index) => (
          <div key={index} style={{ marginBottom: '10px' }}>
            {response}
          </div>
        ))}
        {isStreaming && (
          <div style={{ 
            marginBottom: '10px', 
            fontStyle: 'italic',
            color: '#666',
            borderLeft: '3px solid #007bff',
            paddingLeft: '10px'
          }}>
            Assistant: {currentResponse || 'Thinking...'}
          </div>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          style={{
            flex: 1,
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px'
          }}
        />
        <button 
          type="submit"
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Send
        </button>
      </form>
    </div>
  )
}

export default App
