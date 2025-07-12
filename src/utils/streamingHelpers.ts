import type { Message, AssistantMessagePart } from '../services/types'

// Streaming state detection utilities
export interface StreamingState {
  isStreaming: boolean
  isComplete: boolean
  hasToolExecution: boolean
  currentStep: number
  totalSteps: number
}

// Check if a message is currently streaming
export const isMessageStreaming = (message: Message, sessionIdle = false): boolean => {
  // Message is streaming if:
  // 1. No completion timestamp
  // 2. Has incomplete tool invocations
  // 3. Ends with step-start (indicating more content coming)
  // 4. Session is not idle
  
  if (message.metadata.time.completed) {
    return false
  }

  // If session is idle, message is not streaming
  if (sessionIdle) {
    return false
  }

  // Check for incomplete tool invocations
  const hasIncompleteTools = message.parts.some(part => 
    part.type === 'tool' && 
    part.state?.status !== 'completed'
  )

  // Check if last part is step-start (more content expected)
  const lastPart = message.parts[message.parts.length - 1]
  const endsWithStepStart = lastPart?.type === 'step-start'

  return hasIncompleteTools || endsWithStepStart
}

// Get streaming state for a message
export const getStreamingState = (message: Message, sessionIdle = false): StreamingState => {
  const isStreaming = isMessageStreaming(message, sessionIdle)
  const isComplete = !!message.metadata.time.completed || sessionIdle
  
  // Count steps and tool executions
  const stepStarts = message.parts.filter(part => part.type === 'step-start').length
  const toolInvocations = message.parts.filter(part => part.type === 'tool').length

  return {
    isStreaming,
    isComplete,
    hasToolExecution: toolInvocations > 0,
    currentStep: stepStarts,
    totalSteps: isComplete ? stepStarts : stepStarts + 1 // +1 if still streaming
  }
}

// Check if a specific tool is still executing
export const isToolExecuting = (message: Message, toolId: string): boolean => {
  const toolPart = message.parts.find(part => 
    part.type === 'tool' && 
    part.id === toolId
  ) as any
  
  return toolPart?.state?.status !== 'completed'
}

// Get the current streaming status text
export const getStreamingStatusText = (state: StreamingState): string => {
  if (state.isComplete) {
    return 'Complete'
  }
  
  if (state.hasToolExecution) {
    return `Executing tools... (Step ${state.currentStep})`
  }
  
  return 'Thinking...'
}



// Check if message has any content to display
export const hasDisplayableContent = (message: Message): boolean => {
  return message.parts.some(part => 
    part.type === 'text' || 
    part.type === 'tool'
  )
}

// Get the last meaningful content part (excluding step-start)
export const getLastContentPart = (message: Message): AssistantMessagePart | null => {
  for (let i = message.parts.length - 1; i >= 0; i--) {
    const part = message.parts[i]
    if (part.type !== 'step-start') {
      return part
    }
  }
  return null
}

// Check if we should show a typing indicator
export const shouldShowTypingIndicator = (message: Message, sessionIdle = false): boolean => {
  const state = getStreamingState(message, sessionIdle)
  
  // Show typing if streaming and either:
  // 1. No content yet
  // 2. Last part is step-start (more content coming)
  if (!state.isStreaming) {
    return false
  }

  const hasContent = hasDisplayableContent(message)
  const lastPart = message.parts[message.parts.length - 1]
  
  return !hasContent || lastPart?.type === 'step-start'
}

// Parse unified diff for display
export interface DiffLine {
  type: 'context' | 'added' | 'removed' | 'header'
  content: string
  lineNumber?: {
    old?: number
    new?: number
  }
}

export const parseDiff = (diffText: string): DiffLine[] => {
  const lines = diffText.split('\n')
  const result: DiffLine[] = []
  let oldLineNum = 0
  let newLineNum = 0

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Parse hunk header: @@ -76,4 +76,6 @@
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
      if (match) {
        oldLineNum = parseInt(match[1])
        newLineNum = parseInt(match[2])
      }
      result.push({ type: 'header', content: line })
    } else if (line.startsWith('+')) {
      result.push({
        type: 'added',
        content: line.slice(1),
        lineNumber: { new: newLineNum++ }
      })
    } else if (line.startsWith('-')) {
      result.push({
        type: 'removed',
        content: line.slice(1),
        lineNumber: { old: oldLineNum++ }
      })
    } else if (line.startsWith(' ')) {
      result.push({
        type: 'context',
        content: line.slice(1),
        lineNumber: { old: oldLineNum++, new: newLineNum++ }
      })
    } else if (line.startsWith('Index:') || line.startsWith('===') || line.startsWith('---') || line.startsWith('+++')) {
      result.push({ type: 'header', content: line })
    }
  }

  return result
}

// Extract file content with line numbers
export interface FileContentLine {
  lineNumber: number
  content: string
}

export const parseFileContent = (content: string): FileContentLine[] => {
  const lines = content.split('\n')
  return lines
    .filter(line => line.match(/^\d{5}\|/)) // Match line number format
    .map(line => {
      const match = line.match(/^(\d{5})\|\s*(.*)$/)
      if (match) {
        return {
          lineNumber: parseInt(match[1]),
          content: match[2]
        }
      }
      return { lineNumber: 0, content: line }
    })
}