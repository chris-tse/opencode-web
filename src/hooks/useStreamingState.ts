import { useMemo } from 'react'
import type { Message } from '../services/types'
import {
  getStreamingState,
  getStreamingStatusText,
  shouldShowTypingIndicator,
  hasDisplayableContent,
  isToolExecuting,
  type StreamingState
} from '../utils/streamingHelpers'

// Hook to manage streaming state for a message
export const useStreamingState = (message: Message | null) => {
  const streamingState = useMemo((): StreamingState | null => {
    if (!message) return null
    return getStreamingState(message)
  }, [message])

  const statusText = useMemo(() => {
    if (!streamingState) return ''
    return getStreamingStatusText(streamingState)
  }, [streamingState])

  const showTypingIndicator = useMemo(() => {
    if (!message) return false
    return shouldShowTypingIndicator(message)
  }, [message])

  const hasContent = useMemo(() => {
    if (!message) return false
    return hasDisplayableContent(message)
  }, [message])

  // Check if a specific tool is executing
  const isToolRunning = (toolCallId: string): boolean => {
    if (!message) return false
    return isToolExecuting(message, toolCallId)
  }

  // Get progress information
  const progress = useMemo(() => {
    if (!streamingState) return null
    
    return {
      current: streamingState.currentStep,
      total: streamingState.totalSteps,
      percentage: streamingState.totalSteps > 0 
        ? (streamingState.currentStep / streamingState.totalSteps) * 100 
        : 0
    }
  }, [streamingState])

  return {
    // State
    isStreaming: streamingState?.isStreaming ?? false,
    isComplete: streamingState?.isComplete ?? false,
    hasToolExecution: streamingState?.hasToolExecution ?? false,
    
    // Display helpers
    statusText,
    showTypingIndicator,
    hasContent,
    progress,
    
    // Utilities
    isToolRunning,
    streamingState
  }
}

// Hook for managing multiple messages streaming state
export const useMessagesStreamingState = (messages: Message[]) => {
  const streamingStates = useMemo(() => {
    return messages.map(message => getStreamingState(message))
  }, [messages])

  const hasAnyStreaming = useMemo(() => {
    return streamingStates.some(state => state.isStreaming)
  }, [streamingStates])

  const lastMessage = messages[messages.length - 1]
  const lastMessageStreaming = useMemo(() => {
    if (!lastMessage) return false
    return getStreamingState(lastMessage).isStreaming
  }, [lastMessage])

  return {
    streamingStates,
    hasAnyStreaming,
    lastMessageStreaming,
    totalMessages: messages.length,
    completedMessages: streamingStates.filter(state => state.isComplete).length
  }
}

export default useStreamingState