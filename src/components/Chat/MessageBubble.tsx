import { useStreamingState } from '../../hooks/useStreamingState'
import { StreamingIndicator, ToolExecutionStatus } from './StreamingIndicator'
import { parseDiff, parseFileContent } from '../../utils/streamingHelpers'
import type { Message, MessagePart } from '../../services/types'
import './StreamingIndicator.css'

interface MessageBubbleProps {
  message: Message
  className?: string
}

export const MessageBubble = ({ message, className = '' }: MessageBubbleProps) => {
  const { isStreaming } = useStreamingState(message)

  return (
    <div className={`message-bubble ${message.role} ${className}`}>
      {/* Message content */}
      <div className="message-content">
        {message.parts.map((part, index) => (
          <MessagePartRenderer 
            key={index} 
            part={part} 
            message={message}
            isLast={index === message.parts.length - 1}
          />
        ))}
      </div>

      {/* Streaming indicator */}
      {isStreaming && (
        <StreamingIndicator message={message} />
      )}

      {/* Message metadata */}
      {!isStreaming && (
        <div className="message-metadata">
          <span className="timestamp">
            {new Date(message.metadata.time.created).toLocaleTimeString()}
          </span>
          {message.metadata.time.completed && (
            <span className="completion-time">
              Completed in {
                Math.round((message.metadata.time.completed - message.metadata.time.created) / 1000)
              }s
            </span>
          )}
        </div>
      )}
    </div>
  )
}

interface MessagePartRendererProps {
  part: MessagePart
  message: Message
  isLast: boolean
}

const MessagePartRenderer = ({ part, message }: MessagePartRendererProps) => {
  switch (part.type) {
    case 'text':
      return (
        <div className="text-part">
          {part.text}
        </div>
      )

    case 'tool-invocation':
      if (!part.toolInvocation) return null
      
      const toolMetadata = message.metadata.tool[part.toolInvocation.toolCallId]
      
      return (
        <div className="tool-invocation-part">
          <div className="tool-header">
            <span className="tool-name">{part.toolInvocation.toolName}</span>
            <ToolExecutionStatus 
              message={message} 
              toolCallId={part.toolInvocation.toolCallId} 
            />
          </div>
          
          {/* Tool arguments */}
          <div className="tool-args">
            <pre>{JSON.stringify(part.toolInvocation.args, null, 2)}</pre>
          </div>

          {/* Tool result */}
          {part.toolInvocation.result && (
            <div className="tool-result">
              <h4>Result:</h4>
              <pre>{part.toolInvocation.result}</pre>
            </div>
          )}

          {/* Rich tool metadata display */}
          {toolMetadata && (
            <ToolMetadataDisplay metadata={toolMetadata} />
          )}
        </div>
      )

    case 'step-start':
      // Don't render step-start parts directly, they're handled by streaming indicator
      return null

    case 'reasoning':
      return (
        <div className="reasoning-part">
          <h4>Reasoning:</h4>
          <div className="reasoning-content">{part.text}</div>
        </div>
      )

    case 'file':
      return (
        <div className="file-part">
          <a href={part.url} download={part.filename}>
            📎 {part.filename}
          </a>
        </div>
      )

    default:
      return null
  }
}

interface ToolMetadataDisplayProps {
  metadata: any
}

const ToolMetadataDisplay = ({ metadata }: ToolMetadataDisplayProps) => {
  return (
    <div className="tool-metadata">
      {/* File preview */}
      {metadata.preview && (
        <div className="file-preview">
          <h5>File Preview:</h5>
          <pre className="file-content">
            {parseFileContent(metadata.preview).map((line, i) => (
              <div key={i} className="file-line">
                <span className="line-number">{line.lineNumber.toString().padStart(5, '0')}</span>
                <span className="line-content">{line.content}</span>
              </div>
            ))}
          </pre>
        </div>
      )}

      {/* Diff display */}
      {metadata.diff && (
        <div className="diff-display">
          <h5>Changes:</h5>
          <div className="diff-content">
            {parseDiff(metadata.diff).map((line, i) => (
              <div key={i} className={`diff-line ${line.type}`}>
                {line.lineNumber && (
                  <span className="line-numbers">
                    <span className="old-line">{line.lineNumber.old || ''}</span>
                    <span className="new-line">{line.lineNumber.new || ''}</span>
                  </span>
                )}
                <span className="line-content">{line.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execution time */}
      {metadata.time && (
        <div className="execution-time">
          Executed in {metadata.time.end - metadata.time.start}ms
        </div>
      )}
    </div>
  )
}

export default MessageBubble