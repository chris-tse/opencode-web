import { useState, useEffect, type FormEvent } from 'react'
import { createSession, sendMessage } from './services/api'
import { createTextMessageRequest } from './utils/apiHelpers'
import { createEventStream } from './services/eventStream'
import { EventStreamDebug } from './components/Debug/EventStreamDebug'
import { getOverallToolStatus, hasActiveToolExecution, getToolProgress } from './utils/toolStatusHelpers'
import './App.css'

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
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      {/* Debug component - only shows in development */}
      {/* <EventStreamDebug eventStream={eventStream} /> */}
      
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
        {isLoading && currentStatus && (
          <div style={{ 
            marginBottom: '10px', 
            fontStyle: 'italic',
            color: '#666',
            borderLeft: '3px solid #007bff',
            paddingLeft: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>{currentStatus}</span>
            {currentStatus.includes('...') && (
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #f3f3f3',
                borderTop: '2px solid #007bff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            )}
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
