# Dynamic Tool Bubbles Technical Specification

## Overview

This specification outlines the implementation of dynamic tool status bubbles that update in-place rather than creating multiple status messages for each tool execution phase. The goal is to replace the current behavior of showing 4+ separate bubbles per tool with a single, updating bubble that shows the tool's progression from pending to completion.

## Current Problem

Currently, a single tool execution (e.g., `read` command) generates multiple status bubbles:
1. "Reading file..." (pending)
2. "Read file" (running with title)
3. "Read" (running simplified)
4. "✓ Read completed" (completed)

This creates visual clutter and poor UX. Users want a single bubble per tool that updates its content dynamically.

## Solution Architecture

### 1. Enhanced Message Store

#### New Message Type
```typescript
interface ToolMessage extends ChatMessage {
  type: 'tool'
  toolId: string           // Unique tool invocation ID from API
  toolName: string         // Tool name (read, bash, edit, etc.)
  status: ToolStatus       // Current tool status
  title: string           // Contextual title (e.g., "Read package.json")
  subtext: string         // Status description (e.g., "Reading file...")
  startTime: number       // Tool start timestamp
  endTime?: number        // Tool completion timestamp
  metadata?: ToolMetadata // Additional tool-specific data
}

type ToolStatus = 'pending' | 'running' | 'completed' | 'error'

interface ToolMetadata {
  filePath?: string
  command?: string
  url?: string
  description?: string
  output?: string
  error?: string
}
```

#### Store Enhancements
```typescript
interface MessageState {
  // Existing fields...
  toolMessages: Map<string, ToolMessage>  // toolId -> ToolMessage
  
  // New actions
  createOrUpdateToolMessage: (toolId: string, update: Partial<ToolMessage>) => void
  removeToolMessage: (toolId: string) => void
  removeCompletedToolMessages: () => void
  getToolMessage: (toolId: string) => ToolMessage | undefined
}
```

### 2. Event Processing Updates

#### Modified Event Handlers
```typescript
// App.tsx - updateStatusFromPart
const updateStatusFromPart = useCallback((part: AssistantMessagePart, messageId: string, messageMetadata?: MessageMetadata) => {
  if (part.type === 'tool' && part.state) {
    const toolUpdate = buildToolUpdate(part, messageMetadata)
    createOrUpdateToolMessage(part.id, toolUpdate)
    
    // Remove old-style status messages for this tool
    removeStatusMessagesForTool(part.id)
  }
  // Handle other part types...
}, [createOrUpdateToolMessage, removeStatusMessagesForTool])

// Helper function to build tool update
const buildToolUpdate = (toolPart: ToolPart, metadata?: MessageMetadata): Partial<ToolMessage> => {
  const { tool, state, id } = toolPart
  
  return {
    toolId: id,
    toolName: tool,
    status: state.status,
    title: getContextualToolTitle(tool, state, metadata),
    subtext: getToolStatusSubtext(tool, state.status),
    startTime: state.time?.start || Date.now(),
    endTime: state.time?.end,
    metadata: extractToolMetadata(tool, state)
  }
}
```

#### Session Idle Cleanup
```typescript
// Clean up completed tool messages on session idle
eventStream.subscribe('session.idle', (data: { sessionID: string }) => {
  if (data.sessionID === sessionId) {
    setIdle(true)
    setIsLoading(false)
    
    // Remove completed tool messages after delay
    setTimeout(() => {
      removeCompletedToolMessages()
    }, 2000) // 2 second delay to show completion state
    
    setLastStatusMessage('')
  }
})
```

### 3. Enhanced Tool Status Helpers

#### Contextual Title Generation
```typescript
// utils/toolStatusHelpers.ts
export const getContextualToolTitle = (
  toolName: string,
  state: ToolState,
  metadata?: MessageMetadata
): string => {
  const args = state.status !== 'pending' ? state.input : undefined
  const serverCwd = metadata?.path?.cwd
  
  switch (toolName) {
    case 'read':
    case 'edit':
    case 'write': {
      const filePath = args?.filePath as string
      const relativePath = getRelativePath(filePath, serverCwd)
      return `${getToolDisplayName(toolName)} ${relativePath}`
    }
    
    case 'bash': {
      const description = args?.description as string || state.title
      return `${description || 'Run command'}`
    }
    
    case 'webfetch': {
      const url = args?.url as string
      if (url) {
        try {
          const urlObj = new URL(url)
          return `Fetch ${urlObj.hostname}`
        } catch {
          return `Fetch ${url.slice(0, 30)}...`
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

export const getToolStatusSubtext = (toolName: string, status: ToolStatus): string => {
  switch (status) {
    case 'pending':
      return getToolActionMessage(toolName) // "Reading file...", "Writing command...", etc.
    case 'running':
      return 'Processing...'
    case 'completed':
      return 'Completed'
    case 'error':
      return 'Failed'
    default:
      return 'Working...'
  }
}
```

### 4. Dynamic Tool Bubble Component

#### New ToolBubble Component
```typescript
// components/Chat/ToolBubble.tsx
interface ToolBubbleProps {
  toolMessage: ToolMessage
}

export const ToolBubble = memo(({ toolMessage }: ToolBubbleProps) => {
  const { toolName, status, title, subtext, startTime, endTime, metadata } = toolMessage
  
  const duration = endTime ? endTime - startTime : Date.now() - startTime
  const isActive = status === 'pending' || status === 'running'
  
  return (
    <div className="flex items-start gap-3">
      <Avatar className="w-8 h-8">
        <AvatarFallback>
          <ToolIcon toolName={toolName} status={status} />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <div className={`rounded-lg p-3 transition-all duration-300 ${
          status === 'completed' ? 'bg-green-50 border-green-200' :
          status === 'error' ? 'bg-red-50 border-red-200' :
          status === 'running' ? 'bg-blue-50 border-blue-200' :
          'bg-gray-50 border-gray-200'
        } border`}>
          
          {/* Tool Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{title}</span>
              <StatusIndicator status={status} />
            </div>
            <span className="text-xs text-gray-500">
              {formatDuration(duration)}
            </span>
          </div>
          
          {/* Status Subtext */}
          <div className="text-sm text-gray-600 flex items-center gap-2">
            {isActive && <LoadingSpinner size="sm" />}
            <span>{subtext}</span>
          </div>
          
          {/* Tool Output (for completed tools) */}
          {status === 'completed' && metadata?.output && (
            <ToolOutput 
              toolName={toolName}
              output={metadata.output}
              collapsed={true}
            />
          )}
          
          {/* Error Details */}
          {status === 'error' && metadata?.error && (
            <div className="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded">
              {metadata.error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
```

#### Supporting Components
```typescript
// Tool-specific icons
const ToolIcon = ({ toolName, status }: { toolName: string, status: ToolStatus }) => {
  const iconMap = {
    read: '📖',
    write: '✏️',
    edit: '✏️',
    bash: '⚡',
    webfetch: '🌐',
    glob: '🔍',
    grep: '🔍',
    todowrite: '📋',
    todoread: '📋'
  }
  
  const icon = iconMap[toolName] || '🔧'
  
  if (status === 'completed') return '✅'
  if (status === 'error') return '❌'
  if (status === 'running') return '⚙️'
  
  return icon
}

// Status indicator with animation
const StatusIndicator = ({ status }: { status: ToolStatus }) => {
  switch (status) {
    case 'pending':
      return <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
    case 'running':
      return <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
    case 'completed':
      return <div className="w-2 h-2 bg-green-500 rounded-full" />
    case 'error':
      return <div className="w-2 h-2 bg-red-500 rounded-full" />
  }
}
```

### 5. Updated ChatContainer Integration

#### Modified Message Rendering
```typescript
// components/Chat/ChatContainer.tsx
export const ChatContainer = ({ messages, isLoading }: ChatContainerProps) => {
  const { toolMessages } = useMessageStore()
  
  // Combine regular messages with tool messages, sorted by timestamp
  const allMessages = useMemo(() => {
    const combined = [
      ...messages,
      ...Array.from(toolMessages.values())
    ].sort((a, b) => a.timestamp - b.timestamp)
    
    return combined
  }, [messages, toolMessages])

  return (
    <ScrollArea ref={scrollAreaRef} className="h-[calc(100vh-280px)] mb-4 border rounded-lg p-4">
      <div className="space-y-4">
        {allMessages.map((message) => (
          message.type === 'tool' ? (
            <ToolBubble key={message.id} toolMessage={message as ToolMessage} />
          ) : (
            <MessageBubble key={message.id} message={message} />
          )
        ))}
      </div>
    </ScrollArea>
  )
}
```

## Implementation Plan

### Phase 1: Core Infrastructure
1. **Update Message Store Types** - Add ToolMessage interface and Map storage
2. **Implement Store Actions** - Add createOrUpdateToolMessage, removeToolMessage methods
3. **Create ToolBubble Component** - Basic component with status display

### Phase 2: Event Integration
1. **Modify updateStatusFromPart** - Route tool events to new system
2. **Update Session Idle Handler** - Clean up completed tools
3. **Remove Legacy Status Messages** - Phase out old event-based status

### Phase 3: Enhanced UX
1. **Add Tool Output Display** - Collapsible output for completed tools
2. **Implement Animations** - Smooth transitions between states
3. **Add Progress Indicators** - Visual feedback for active tools

### Phase 4: Polish & Testing
1. **Error Handling** - Robust error states and recovery
2. **Performance Optimization** - Efficient re-renders and cleanup
3. **Accessibility** - Screen reader support and keyboard navigation

## Migration Strategy

### Backward Compatibility
- Keep existing event message system during transition
- Gradually phase out old status messages
- Maintain existing MessageBubble for non-tool messages

### Rollout Plan
1. **Feature Flag** - Enable dynamic bubbles behind flag
2. **A/B Testing** - Compare user experience metrics
3. **Gradual Migration** - Tool by tool enablement
4. **Full Deployment** - Remove legacy system

## Success Metrics

### User Experience
- **Reduced Visual Clutter** - 75% fewer status messages
- **Improved Readability** - Single bubble per tool action
- **Better Status Clarity** - Real-time progress updates

### Technical Metrics
- **Performance** - No regression in render times
- **Memory Usage** - Efficient cleanup of completed tools
- **Event Processing** - Reliable state updates

## Risk Mitigation

### Potential Issues
1. **State Synchronization** - Tool state updates out of order
2. **Memory Leaks** - Accumulating tool messages
3. **Race Conditions** - Rapid tool state changes

### Mitigation Strategies
1. **Idempotent Updates** - Safe to apply same update multiple times
2. **Automatic Cleanup** - Remove old tools on session idle
3. **Debounced Updates** - Batch rapid state changes

## Future Enhancements

### Advanced Features
- **Tool Grouping** - Batch related tools (e.g., multi-file edits)
- **Progress Bars** - Visual progress for long-running tools
- **Tool History** - Expandable history of recent tool executions
- **Interactive Tools** - Click to expand output, retry failed tools

### Integration Opportunities
- **Tool Recommendations** - Suggest related tools
- **Workflow Visualization** - Show tool dependency chains
- **Performance Analytics** - Track tool execution times