// Utility functions for tool status display

import type { ToolPart, MessageMetadata, AssistantMessagePart } from '../services/types'
import { isTodoArgs } from '../services/types'

// Get pending action message for tool (matches TUI spec)
export const getToolActionMessage = (toolName: string): string => {
  const actionMessages: Record<string, string> = {
    'task': 'Searching...',
    'bash': 'Writing command...',
    'edit': 'Preparing edit...',
    'webfetch': 'Fetching from the web...',
    'glob': 'Finding files...',
    'grep': 'Searching content...',
    'list': 'Listing directory...',
    'read': 'Reading file...',
    'write': 'Preparing write...',
    'todowrite': 'Planning...',
    'todoread': 'Planning...',
    'patch': 'Preparing patch...'
  }
  
  return actionMessages[toolName] || 'Working...'
}

// Get normalized tool name for display (matches TUI spec)
export const getToolDisplayName = (toolName: string): string => {
  // Handle MCP tools
  if (toolName.startsWith('mcp_') || toolName.startsWith('localmcp_')) {
    const cleanName = toolName.replace(/^(local)?mcp_/, '')
    return cleanName.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }
  
  // Handle specific tool name mappings
  const toolNames: Record<string, string> = {
    'webfetch': 'Fetch',
    'todowrite': 'Plan',
    'todoread': 'Plan'
  }
  
  if (toolNames[toolName]) {
    return toolNames[toolName]
  }
  
  // Default: title case the tool name
  return toolName.charAt(0).toUpperCase() + toolName.slice(1)
}

// Get status message for tool state (matches TUI spec)
export const getToolStatusMessage = (toolName: string, state: string): string => {
  switch (state) {
    case 'pending':
      return getToolActionMessage(toolName)
    case 'running':
      // For running state, we'll use display name for now
      // TODO: Add contextual info like file paths
      return getToolDisplayName(toolName)
    case 'completed':
      return `✓ ${getToolDisplayName(toolName)} completed`
    case 'error':
      return `✗ ${getToolDisplayName(toolName)} failed`
    default:
      return getToolActionMessage(toolName)
  }
}

// Get overall status for multiple tools
export const getOverallToolStatus = (toolParts: AssistantMessagePart[]): string => {
  if (toolParts.length === 0) return ''
  
  // Filter for actual tool parts
  const actualToolParts = toolParts.filter((part): part is ToolPart => part.type === 'tool')
  
  if (actualToolParts.length === 0) return ''
  
  // Check for active tool
  const activeTool = actualToolParts.find(part => 
    part.state?.status !== 'completed'
  )
  
  if (activeTool) {
    return getToolStatusMessage(
      activeTool.tool, 
      activeTool.state?.status || 'pending'
    )
  }
  
  // Count completed tools
  const completedCount = actualToolParts.filter(part => 
    part.state?.status === 'completed'
  ).length
  
  if (completedCount > 0) {
    return `✓ Completed ${completedCount} tool${completedCount > 1 ? 's' : ''}`
  }
  
  // Only show "Processing tools..." if we have tools that aren't completed yet
  if (actualToolParts.length > 0) {
    return 'Processing tools...'
  }
  
  return ''
}

// Check if message has active tool execution
export const hasActiveToolExecution = (message: { parts?: AssistantMessagePart[]; metadata?: { time?: { completed?: number } } }): boolean => {
  if (!message?.parts) return false
  
  // If message is completed, no tools are actively executing
  if (message.metadata?.time?.completed) return false
  
  return message.parts.some((part: AssistantMessagePart) => 
    part.type === 'tool' && 
    (part as ToolPart).state?.status !== 'completed'
  )
}

// Get progress information for tools
export const getToolProgress = (message: { parts?: AssistantMessagePart[] }): { current: number; total: number } => {
  if (!message?.parts) return { current: 0, total: 0 }
  
  const toolParts = message.parts.filter((part): part is ToolPart => part.type === 'tool')
  const completedParts = toolParts.filter((part) => part.state?.status === 'completed')
  
  return {
    current: completedParts.length,
    total: toolParts.length
  }
}

// Extract file path from tool args safely
const extractFilePath = (args?: Record<string, unknown>): string | undefined => {
  return args?.filePath as string | undefined
}

// Get relative path for display
const getRelativePath = (
  filePath?: string,
  serverCwd?: string
): string => {
  if (!filePath) return 'file'
  
  // If no server cwd, just return filename
  if (!serverCwd) {
    return filePath.split('/').pop() || filePath
  }
  
  // Convert absolute to relative if possible
  if (filePath.startsWith(serverCwd)) {
    const relativePath = filePath.slice(serverCwd.length + 1)
    return relativePath || filePath
  }
  
  // Fallback to filename
  return filePath.split('/').pop() || filePath
}

// Get todo phase based on todo state
const getTodoPhase = (args?: Record<string, unknown>): string => {
  if (!isTodoArgs(args)) {
    return 'Plan'
  }
  
  const todos = args.todos
  
  // Find active todo
  const activeTodo = todos.find(todo => todo.status === 'in_progress')
  if (activeTodo) {
    return `Working on: ${activeTodo.content}`
  }
  
  // Check completion ratio
  const completed = todos.filter(todo => todo.status === 'completed').length
  if (completed > 0 && completed < todos.length) {
    return `Completed: ${completed}/${todos.length}`
  }
  
  return 'Plan'
}

// Get contextual tool title based on args and server context
const getToolTitle = (
  toolName: string,
  args?: Record<string, unknown>,
  serverCwd?: string
): string => {
  switch (toolName) {
    case 'read':
    case 'edit':
    case 'write': {
      const filePath = extractFilePath(args)
      const relativePath = getRelativePath(filePath, serverCwd)
      return `${getToolDisplayName(toolName)} ${relativePath}`
    }
    
    case 'bash': {
      const description = args?.description as string
      return `Bash ${description || 'command'}`
    }
    
    case 'webfetch': {
      const url = args?.url as string
      if (url) {
        try {
          const urlObj = new URL(url)
          return `Fetch ${urlObj.hostname}`
        } catch {
          return `Fetch ${url}`
        }
      }
      return 'Fetch URL'
    }
    
    case 'todowrite': {
      return getTodoPhase(args)
    }
    
    default:
      return getToolDisplayName(toolName)
  }
}

// New contextual status function with path utilities
export const getContextualToolStatus = (
  toolPart: ToolPart,
  messageMetadata?: MessageMetadata
): string => {
  const toolName = toolPart.tool
  const state = toolPart.state.status
  const args = toolPart.state.status !== 'pending' ? toolPart.state.args : undefined
  const serverCwd = messageMetadata?.assistant?.path?.cwd
  
  switch (state) {
    case 'pending':
      return getToolActionMessage(toolName)
    case 'running':
      return getToolTitle(toolName, args, serverCwd)
    case 'completed':
      return `✓ ${getToolDisplayName(toolName)} completed`  // Simple for now
    case 'error': {
      const errorState = toolPart.state as { status: 'error'; error?: string }
      return `${getToolDisplayName(toolName)}: ${errorState.error || 'Error'}`
    }
    default:
      return getToolActionMessage(toolName)
  }
}