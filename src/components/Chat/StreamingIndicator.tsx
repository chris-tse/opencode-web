import { useStreamingState } from '../../hooks/useStreamingState'
import type { Message } from '../../services/types'

interface StreamingIndicatorProps {
  message: Message
  className?: string
}

export const StreamingIndicator = ({ message, className = '' }: StreamingIndicatorProps) => {
  const {
    isStreaming,
    isComplete,
    hasToolExecution,
    statusText,
    showTypingIndicator,
    progress
  } = useStreamingState(message)

  if (isComplete) {
    return null
  }

  return (
    <div className={`streaming-indicator ${className}`}>
      {/* Status text */}
      <div className="status-text">
        {statusText}
      </div>

      {/* Progress bar for multi-step operations */}
      {hasToolExecution && progress && (
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className="progress-text">
            {progress.current} / {progress.total} steps
          </div>
        </div>
      )}

      {/* Typing dots animation */}
      {showTypingIndicator && (
        <div className="typing-dots">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      )}

      {/* Streaming pulse indicator */}
      {isStreaming && (
        <div className="pulse-indicator" />
      )}
    </div>
  )
}

// Component to show tool execution status
interface ToolExecutionStatusProps {
  message: Message
  toolCallId: string
}

export const ToolExecutionStatus = ({ message, toolCallId }: ToolExecutionStatusProps) => {
  const { isToolRunning } = useStreamingState(message)
  const isRunning = isToolRunning(toolCallId)

  if (!isRunning) {
    return <span className="tool-status completed">✓</span>
  }

  return (
    <div className="tool-status running">
      <div className="spinner" />
      <span>Running...</span>
    </div>
  )
}

// Component to show overall chat streaming state
interface ChatStreamingStatusProps {
  messages: Message[]
}

export const ChatStreamingStatus = ({ messages }: ChatStreamingStatusProps) => {
  const lastMessage = messages[messages.length - 1]
  const { isStreaming, statusText } = useStreamingState(lastMessage)

  if (!isStreaming) {
    return null
  }

  return (
    <div className="chat-streaming-status">
      <div className="status-indicator">
        <div className="pulse" />
        <span>{statusText}</span>
      </div>
    </div>
  )
}

export default StreamingIndicator