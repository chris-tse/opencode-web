import { useEffect, useMemo, useCallback, useState } from 'react'
import { createEventStream } from '../services/eventStream'
import type { Message, AssistantMessagePart, MessageMetadata, MessageUpdatedProperties, MessagePartUpdatedProperties, SessionErrorProperties } from '../services/types'
import { getOverallToolStatus, getContextualToolStatus, hasActiveToolExecution, getToolProgress } from '../utils/toolStatusHelpers'
import { useSessionStore } from '../stores/sessionStore'
import { useMessageStore } from '../stores/messageStore'

export function useEventStream() {
  const [hasReceivedFirstEvent, setHasReceivedFirstEvent] = useState(false)
  const [currentMessageMetadata, setCurrentMessageMetadata] = useState<MessageMetadata | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  
  const eventStream = useMemo(() => createEventStream(), [])
  const { sessionId, setIdle } = useSessionStore()
  const { 
    addStatusMessage, 
    addTextMessage, 
    addErrorMessage, 
    removeLastEventMessage, 
    setLastStatusMessage 
  } = useMessageStore()

  const updateStatusFromMessage = useCallback((message: Message) => {
    if (!hasReceivedFirstEvent) {
      setHasReceivedFirstEvent(true)
    }
    
    setCurrentMessageMetadata(message.metadata)
    
    if (message.metadata?.time?.completed) {
      setIsLoading(false)
      return
    }

    if (hasActiveToolExecution(message)) {
      const status = getOverallToolStatus(message.parts || [])
      addStatusMessage(status)
    } else {
      const progress = getToolProgress(message)
      if (progress.total > 0) {
        addStatusMessage(`✓ Completed ${progress.total} tool${progress.total > 1 ? 's' : ''}`)
      }
      // Don't show "Generating response..." - text parts will indicate response generation
    }
  }, [hasReceivedFirstEvent, addStatusMessage])

  const updateStatusFromPart = useCallback((part: AssistantMessagePart, messageId: string, messageMetadata?: MessageMetadata) => {
    if (!hasReceivedFirstEvent) {
      setHasReceivedFirstEvent(true)
    }

    if (part.type === 'tool' && part.state) {
      const status = getContextualToolStatus(part, messageMetadata)
      addStatusMessage(status)
      
      if (part.state.status === 'completed') {
        // Don't add "Generating response..." status as text parts will arrive immediately
        // and the presence of text indicates response generation
      }
    } else if (part.type === 'text') {
      if (part.text && part.text.trim()) {
        addTextMessage(part.text, messageId)
      }
    } else if (part.type === 'step-start') {
      // TODO: Handle step-start differently - commented out for now
      // if (hasReceivedFirstEvent) {
      //   addStatusMessage('Processing next step...')
      // }
    }
  }, [hasReceivedFirstEvent, isLoading, addStatusMessage, addTextMessage])

  useEffect(() => {
    eventStream.connect()
    
    eventStream.subscribe('message.updated', (data: MessageUpdatedProperties) => {
      updateStatusFromMessage(data.info)
    })
    
    eventStream.subscribe('message.part.updated', (data: MessagePartUpdatedProperties) => {
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
        removeLastEventMessage()
        setLastStatusMessage('')
      }
    })
    
    return () => {
      eventStream.disconnect()
    }
  }, [eventStream, updateStatusFromMessage, updateStatusFromPart, currentMessageMetadata, sessionId, setIdle, addErrorMessage, removeLastEventMessage, setLastStatusMessage])

  return {
    hasReceivedFirstEvent,
    setHasReceivedFirstEvent,
    isLoading,
    setIsLoading
  }
}