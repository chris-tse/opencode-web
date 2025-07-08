// Utility functions for tool status display

// Get a user-friendly tool name
export const getToolDisplayName = (toolName: string): string => {
  const toolNames: Record<string, string> = {
    'read': 'Reading file',
    'write': 'Writing file', 
    'edit': 'Editing file',
    'bash': 'Running command',
    'list': 'Listing directory',
    'glob': 'Finding files',
    'grep': 'Searching content',
    'webfetch': 'Fetching web content',
    'todowrite': 'Updating tasks',
    'todoread': 'Reading tasks'
  }
  
  return toolNames[toolName] || `Running ${toolName}`
}

// Get status message for tool state
export const getToolStatusMessage = (toolName: string, state: string): string => {
  const displayName = getToolDisplayName(toolName)
  
  switch (state) {
    case 'call':
      return `${displayName}...`
    case 'partial-call':
      return `${displayName} (in progress)...`
    case 'result':
      return `✓ ${displayName} completed`
    default:
      return `${displayName}...`
  }
}

// Get overall status for multiple tools
export const getOverallToolStatus = (toolParts: any[]): string => {
  if (toolParts.length === 0) return ''
  
  const activeTool = toolParts.find(part => 
    part.type === 'tool-invocation' && 
    part.toolInvocation?.state !== 'result'
  )
  
  if (activeTool) {
    return getToolStatusMessage(
      activeTool.toolInvocation.toolName, 
      activeTool.toolInvocation.state
    )
  }
  
  // All tools completed
  const completedCount = toolParts.filter(part => 
    part.type === 'tool-invocation' && 
    part.toolInvocation?.state === 'result'
  ).length
  
  if (completedCount > 0) {
    return `✓ Completed ${completedCount} tool${completedCount > 1 ? 's' : ''}`
  }
  
  return 'Processing tools...'
}

// Check if message has active tool execution
export const hasActiveToolExecution = (message: any): boolean => {
  if (!message?.parts) return false
  
  return message.parts.some((part: any) => 
    part.type === 'tool-invocation' && 
    part.toolInvocation?.state !== 'result'
  )
}

// Get progress information for tools
export const getToolProgress = (message: any): { current: number; total: number } => {
  if (!message?.parts) return { current: 0, total: 0 }
  
  const toolParts = message.parts.filter((part: any) => part.type === 'tool-invocation')
  const completedParts = toolParts.filter((part: any) => part.toolInvocation?.state === 'result')
  
  return {
    current: completedParts.length,
    total: toolParts.length
  }
}