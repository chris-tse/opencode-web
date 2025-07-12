import { useStreamingState } from '../../hooks/useStreamingState'
import { StreamingIndicator } from './StreamingIndicator'
import { parseDiff, parseFileContent } from '../../utils/streamingHelpers'
import type { Message, AssistantMessagePart } from '../../services/types'
import ReactMarkdown from 'react-markdown'
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
  part: AssistantMessagePart
  message: Message
  isLast: boolean
}

const MessagePartRenderer = ({ part, message }: MessagePartRendererProps) => {
  switch (part.type) {
    case 'text':
      return (
        <div className="text-part">
          {message.role === 'assistant' ? (
            <ReactMarkdown>{part.text}</ReactMarkdown>
          ) : (
            part.text
          )}
        </div>
      )

    case 'tool': {
      const toolMetadata = message.metadata.tool[part.id]
      
      return (
        <div className="tool-part">
          <div className="tool-header">
            <span className="tool-name">{part.tool}</span>
            <span className="tool-status">{part.state.status}</span>
          </div>
          
          {/* Tool arguments */}
          {part.state.status === 'running' && part.state.args && (
            <div className="tool-args">
              <h4>Arguments:</h4>
              <pre>{JSON.stringify(part.state.args, null, 2)}</pre>
            </div>
          )}

          {/* Tool result */}
          {part.state.status === 'completed' && part.state.result && (
            <div className="tool-result">
              <h4>Result:</h4>
              <pre>{part.state.result}</pre>
            </div>
          )}

          {/* Tool error */}
          {part.state.status === 'error' && part.state.error && (
            <div className="tool-error">
              <h4>Error:</h4>
              <pre>{part.state.error}</pre>
            </div>
          )}

          {/* Rich tool metadata display */}
          {toolMetadata && (
            <ToolMetadataDisplay metadata={toolMetadata} />
          )}
        </div>
      )
    }

    case 'step-start':
      return (
        <div className="step-start-part">
          <div className="step-indicator">
            {part.text}
          </div>
        </div>
      )

    case 'step-finish':
      return (
        <div className="step-finish-part">
          <div className="step-indicator">
            ✓ {part.text}
          </div>
        </div>
      )

    default:
      return null
  }
}

interface ToolMetadataDisplayProps {
  metadata: {
    preview?: string
    diff?: string
    time?: {
      start: number
      end: number
    }
  }
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