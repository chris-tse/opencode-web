# STATUS_MESSAGE_TECH_SPEC.md

## Technical Specification: TUI-Aligned Status Messages Implementation

### **Overview**

This document provides detailed implementation specifications for aligning opencode-ui status messages with the TUI Status Display Specification. The implementation is broken down into small, workable chunks that can be completed incrementally with proper testing at each step.

### **Architecture Overview**

#### **Current Flow**
```
Event Stream → App.tsx → getOverallToolStatus([part]) → Generic Status
```

#### **Target Flow**
```
Event Stream → App.tsx → getContextualToolStatus(part, metadata) → Contextual Status
```

### **Implementation Phases**

---

## **Phase 1: Core Infrastructure (Foundation)**
*Estimated Time: 1-2 days*

### **Chunk 1.1: Update Function Signatures**
*Time: 2-3 hours*

**File**: `src/utils/toolStatusHelpers.ts`

**Task**: Add new main function alongside existing one

```typescript
// Add this new function (keep existing functions intact)
export const getContextualToolStatus = (
  toolPart: ToolPart,
  messageMetadata?: MessageMetadata
): string => {
  // Start with simple fallback to existing behavior
  return getOverallToolStatus([toolPart])
}
```

**Testing**: Verify new function returns same results as old function

**Success Criteria**: 
- [ ] New function exists and compiles
- [ ] Returns identical results to `getOverallToolStatus` for all tool types
- [ ] No breaking changes to existing functionality

---

### **Chunk 1.2: Update App.tsx Event Handler Signatures**
*Time: 1-2 hours*

**File**: `src/App.tsx`

**Task**: Update `updateStatusFromPart` to accept metadata parameter

```typescript
// Find this function (around line 74-127)
const updateStatusFromPart = useCallback((
  part: AssistantMessagePart, 
  messageId: string,
  messageMetadata?: MessageMetadata  // Add this parameter
) => {
  // Keep existing logic for now, just add the parameter
  if (part.type === 'tool' && part.state) {
    const status = getOverallToolStatus([part])  // Keep existing call for now
    // ... rest of existing logic
  }
}, [])
```

**Testing**: Verify app still works with new parameter (can pass `undefined`)

**Success Criteria**:
- [ ] Function signature updated
- [ ] App compiles and runs without errors
- [ ] Status messages still display correctly

---

### **Chunk 1.3: Update Event Stream Handlers**
*Time: 1-2 hours*

**File**: `src/App.tsx`

**Task**: Pass metadata from event handlers to `updateStatusFromPart`

```typescript
// Find the event stream useEffect (around line 138-169)
useEffect(() => {
  const unsubscribe = eventStreamService.subscribe((event) => {
    switch (event.type) {
      case 'message.part.updated':
        const { part, messageID } = event.properties
        // NEW: Get current message to access metadata
        const currentMessage = messages.find(m => m.id === messageID)
        updateStatusFromPart(part, messageID, currentMessage?.metadata)
        break
      // ... other cases unchanged
    }
  })
}, [messages, updateStatusFromMessage, updateStatusFromPart])
```

**Testing**: Verify metadata is properly passed (add console.log to verify)

**Success Criteria**:
- [ ] Metadata parameter is passed correctly
- [ ] No errors in event handling
- [ ] App functionality unchanged

---

## **Phase 2: Basic Contextual Messages (File Paths)**
*Estimated Time: 1-2 days*

### **Chunk 2.1: Add Path Utility Functions**
*Time: 2-3 hours*

**File**: `src/utils/pathUtils.ts` (new file)

**Task**: Create browser-safe path resolution

```typescript
export const getRelativePath = (
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

export const extractFilePath = (args?: Record<string, unknown>): string | undefined => {
  return args?.filePath as string | undefined
}
```

**Testing**: Unit tests for path resolution edge cases

**Success Criteria**:
- [ ] Handles absolute paths correctly
- [ ] Handles missing serverCwd gracefully
- [ ] Returns filename as fallback
- [ ] All unit tests pass

---

### **Chunk 2.2: Implement Running State for File Tools**
*Time: 2-3 hours*

**File**: `src/utils/toolStatusHelpers.ts`

**Task**: Add running state logic for file operations

```typescript
// Add this helper function
const getToolTitle = (
  toolName: string,
  args?: Record<string, unknown>,
  serverCwd?: string
): string => {
  switch (toolName) {
    case 'read':
    case 'edit':
    case 'write':
      const filePath = extractFilePath(args)
      const relativePath = getRelativePath(filePath, serverCwd)
      return `${getToolDisplayName(toolName)} ${relativePath}`
    
    default:
      return getToolDisplayName(toolName)
  }
}

// Update getContextualToolStatus to use it
export const getContextualToolStatus = (
  toolPart: ToolPart,
  messageMetadata?: MessageMetadata
): string => {
  const toolName = toolPart.tool
  const state = toolPart.state.status
  const args = toolPart.state.status !== 'pending' ? toolPart.state.args : undefined
  const serverCwd = messageMetadata?.assistant?.path?.cwd
  
  switch (state) {
    case 'running':
      return getToolTitle(toolName, args, serverCwd)
    default:
      return getOverallToolStatus([toolPart])  // Fallback for now
  }
}
```

**Testing**: Test file operations show correct paths

**Success Criteria**:
- [ ] `read src/App.tsx` displays for file reads
- [ ] `edit components/Chat.tsx` displays for file edits
- [ ] Fallback to filename when no server path
- [ ] No regressions in other tool types

---

### **Chunk 2.3: Switch App.tsx to Use New Function**
*Time: 1 hour*

**File**: `src/App.tsx`

**Task**: Switch from old to new status function

```typescript
// In updateStatusFromPart, change:
// const status = getOverallToolStatus([part])
// To:
const status = getContextualToolStatus(part, messageMetadata)
```

**Testing**: Manual testing of file operations

**Success Criteria**:
- [ ] File paths display correctly in status bubbles
- [ ] Other tools still work as before
- [ ] No console errors or crashes

---

## **Phase 3: Enhanced Tool Support**
*Estimated Time: 1-2 days*

### **Chunk 3.1: Add Bash Command Support**
*Time: 1-2 hours*

**File**: `src/utils/toolStatusHelpers.ts`

**Task**: Enhance bash tool running state

```typescript
// Update getToolTitle function
const getToolTitle = (
  toolName: string,
  args?: Record<string, unknown>,
  serverCwd?: string
): string => {
  switch (toolName) {
    case 'read':
    case 'edit':
    case 'write':
      const filePath = extractFilePath(args)
      const relativePath = getRelativePath(filePath, serverCwd)
      return `${getToolDisplayName(toolName)} ${relativePath}`
    
    case 'bash':
      const description = args?.description as string
      return `Bash ${description || 'command'}`
    
    default:
      return getToolDisplayName(toolName)
  }
}
```

**Testing**: Test bash commands show descriptions

**Success Criteria**:
- [ ] `Bash install dependencies` for npm install
- [ ] `Bash command` fallback when no description
- [ ] File tools still work correctly

---

### **Chunk 3.2: Add WebFetch Support**
*Time: 1-2 hours*

**File**: `src/utils/toolStatusHelpers.ts`

**Task**: Add webfetch tool support

```typescript
// Update getToolTitle function
case 'webfetch':
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
```

**Testing**: Test webfetch shows hostnames

**Success Criteria**:
- [ ] `Fetch github.com` for GitHub URLs
- [ ] `Fetch URL` fallback for invalid URLs
- [ ] No crashes on malformed URLs

---

### **Chunk 3.3: Handle All Tool States**
*Time: 2-3 hours*

**File**: `src/utils/toolStatusHelpers.ts`

**Task**: Complete the state machine

```typescript
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
    case 'error':
      return `${getToolDisplayName(toolName)}: ${(toolPart.state as ToolStateError).error.message}`
    default:
      return getToolActionMessage(toolName)
  }
}
```

**Testing**: Test all tool states work

**Success Criteria**:
- [ ] Pending states work (existing behavior)
- [ ] Running states show context
- [ ] Completed states show checkmark
- [ ] Error states show tool name + error

---

## **Phase 4: Todo Support**
*Estimated Time: 1-2 days*

### **Chunk 4.1: Add Todo Type Definitions**
*Time: 1 hour*

**File**: `src/services/types.ts`

**Task**: Add safe todo types

```typescript
export interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  id: string
  priority: 'high' | 'medium' | 'low'
}

export const isTodoArgs = (args?: Record<string, unknown>): args is { todos: TodoItem[] } => {
  return args != null && 
         Array.isArray(args.todos) && 
         args.todos.every(todo => 
           typeof todo === 'object' && 
           todo != null &&
           typeof todo.content === 'string' &&
           typeof todo.status === 'string' &&
           typeof todo.id === 'string' &&
           typeof todo.priority === 'string'
         )
}
```

**Testing**: Unit test the type guard

**Success Criteria**:
- [ ] Type guard correctly identifies valid todo arrays
- [ ] Type guard rejects invalid data safely
- [ ] No TypeScript errors

---

### **Chunk 4.2: Implement Todo Phase Detection**
*Time: 2-3 hours*

**File**: `src/utils/toolStatusHelpers.ts`

**Task**: Add todo phase logic

```typescript
import { isTodoArgs, TodoItem } from '../services/types'

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

// Update getToolTitle to use it
case 'todowrite':
  return getTodoPhase(args)
```

**Testing**: Test various todo configurations

**Success Criteria**:
- [ ] "Plan" for empty or invalid todos
- [ ] "Working on: Fix bug" for active todos
- [ ] "Completed: 2/5" for partial completion
- [ ] Handles malformed data gracefully

---

## **Phase 5: Advanced Features**
*Estimated Time: 1-2 days*

### **Chunk 5.1: Tool-Specific Completed Messages**
*Time: 2-3 hours*

**File**: `src/utils/toolStatusHelpers.ts`

**Task**: Implement specialized completion messages

```typescript
const getCompletedMessage = (
  toolName: string,
  state: ToolStateCompleted,
  messageMetadata?: MessageMetadata
): string => {
  const toolMetadata = messageMetadata?.tool?.[toolName]
  
  switch (toolName) {
    case 'read':
      return toolMetadata?.preview ? 'File preview available' : 'File read'
    case 'edit':
      return toolMetadata?.diff ? 'Changes made' : 'File edited'
    case 'write':
      return 'File written'
    case 'bash':
      return state.result ? 'Command completed' : 'Command executed'
    case 'todowrite':
      return 'Todo list updated'
    case 'todoread':
      return '' // Ignored per TUI spec
    default:
      return `✓ ${getToolDisplayName(toolName)} completed`
  }
}

// Update getContextualToolStatus completed case
case 'completed':
  return getCompletedMessage(toolName, toolPart.state as ToolStateCompleted, messageMetadata)
```

**Testing**: Test completion messages with/without metadata

**Success Criteria**:
- [ ] "File preview available" when preview exists
- [ ] "Changes made" when diff exists
- [ ] "Command completed" for bash with results
- [ ] Fallback messages work without metadata

---

### **Chunk 5.2: MCP Tool Support**
*Time: 1-2 hours*

**File**: `src/utils/toolStatusHelpers.ts`

**Task**: Handle MCP tool prefixes

```typescript
// Update getToolDisplayName to handle MCP prefixes
export const getToolDisplayName = (toolName: string): string => {
  // Remove MCP prefixes
  const cleanName = toolName.replace(/^(mcp_|localmcp_)/, '')
  
  const displayNames: Record<string, string> = {
    read: 'Reading file',
    edit: 'Preparing edit',
    write: 'Creating file',
    bash: 'Running command',
    todowrite: 'Updating todos',
    todoread: 'Reading todos',
    webfetch: 'Fetching URL',
    // Add other tool mappings as needed
  }
  
  return displayNames[cleanName] || cleanName
}
```

**Testing**: Test MCP tools display correctly

**Success Criteria**:
- [ ] `mcp_read` shows as "Reading file"
- [ ] `localmcp_search` shows as "search"
- [ ] Regular tools unchanged

---

## **Phase 6: Performance & Polish**
*Estimated Time: 1 day*

### **Chunk 6.1: Add Performance Monitoring**
*Time: 2-3 hours*

**File**: `src/utils/toolStatusHelpers.ts`

**Task**: Add performance timing and caching

```typescript
// Add performance wrapper
export const getContextualToolStatus = (
  toolPart: ToolPart,
  messageMetadata?: MessageMetadata
): string => {
  const startTime = performance.now()
  
  try {
    const result = getContextualToolStatusImpl(toolPart, messageMetadata)
    
    const duration = performance.now() - startTime
    if (duration > 5) {
      console.warn(`Slow status generation: ${duration.toFixed(2)}ms for ${toolPart.tool}`)
    }
    
    return result
  } catch (error) {
    console.error('Status generation error:', error)
    // Fallback to existing behavior
    return getOverallToolStatus([toolPart])
  }
}

// Rename current implementation
const getContextualToolStatusImpl = (
  // ... existing implementation
)
```

**Testing**: Monitor performance in dev tools

**Success Criteria**:
- [ ] Status generation < 5ms typically
- [ ] Errors logged but don't crash app
- [ ] Fallback works on errors

---

### **Chunk 6.2: Add Unit Tests**
*Time: 3-4 hours*

**File**: `src/utils/__tests__/toolStatusHelpers.test.ts` (new)

**Task**: Comprehensive test suite

```typescript
import { getContextualToolStatus, getTodoPhase, getRelativePath } from '../toolStatusHelpers'
import { isTodoArgs } from '../../services/types'

describe('getContextualToolStatus', () => {
  it('handles missing metadata gracefully', () => {
    const toolPart = createMockToolPart('read', 'running')
    expect(getContextualToolStatus(toolPart)).toBe('Reading file')
  })
  
  it('shows relative paths when server cwd available', () => {
    const toolPart = createMockToolPart('read', 'running', { 
      filePath: '/Users/test/project/src/App.tsx' 
    })
    const metadata = createMockMetadata({ cwd: '/Users/test/project' })
    expect(getContextualToolStatus(toolPart, metadata)).toBe('Read src/App.tsx')
  })
  
  // ... more tests
})

// Helper functions for creating mock data
const createMockToolPart = (tool: string, status: string, args?: any) => ({
  type: 'tool' as const,
  tool,
  state: { status, args }
})
```

**Testing**: All tests pass

**Success Criteria**:
- [ ] 90%+ code coverage
- [ ] Edge cases covered
- [ ] All tests pass in CI

---

## **Phase 7: Feature Flag & Rollout**
*Estimated Time: 0.5 days*

### **Chunk 7.1: Add Feature Flag Support**
*Time: 1-2 hours*

**File**: `src/utils/constants.ts`

**Task**: Add feature flag system

```typescript
// Add feature flags
export const FEATURE_FLAGS = {
  USE_CONTEXTUAL_STATUS: true,  // Can be toggled for rollout
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_STATUS_DEBUGGING: false,
} as const
```

**File**: `src/App.tsx`

**Task**: Use feature flag

```typescript
import { FEATURE_FLAGS } from './utils/constants'

// In updateStatusFromPart
const status = FEATURE_FLAGS.USE_CONTEXTUAL_STATUS
  ? getContextualToolStatus(part, messageMetadata)
  : getOverallToolStatus([part])
```

**Testing**: Verify flag toggles work

**Success Criteria**:
- [ ] Can switch between old/new behavior
- [ ] No crashes when toggling
- [ ] Easy to disable if issues found

---

### **Chunk 7.2: Clean Up Old Code**
*Time: 1-2 hours*

**Task**: Remove old functions and comments

```typescript
// Remove or deprecate old functions after successful rollout
// Add JSDoc comments to new functions
// Clean up any console.log statements used during development
```

**Testing**: Final integration test

**Success Criteria**:
- [ ] No unused code
- [ ] Clean, documented functions
- [ ] Ready for production

---

## **Testing Strategy**

### **Per-Chunk Testing**
- **Unit Tests**: Each chunk should have focused unit tests
- **Integration Tests**: Test chunk within full app context
- **Manual Testing**: Verify UI behavior for each change
- **Regression Tests**: Ensure existing functionality works

### **End-to-End Testing Scenarios**
1. **File Operations**: Read, edit, write files with various paths
2. **Todo Management**: Create, update todos with different states
3. **Command Execution**: Run bash commands with descriptions
4. **Error Handling**: Trigger errors and verify display
5. **Mixed Tool Usage**: Multiple tools in sequence

### **Performance Benchmarks**
- Status generation time < 5ms per tool
- No memory leaks in metadata processing
- Smooth UI updates during rapid tool execution

---

## **Risk Mitigation**

### **High-Risk Chunks**
- **1.2, 1.3**: App.tsx event handler changes
- **2.3**: Switching to new status function
- **7.1**: Feature flag rollout

### **Mitigation Strategies**
- **Gradual Rollout**: Use feature flags for safe deployment
- **Comprehensive Testing**: Test each chunk thoroughly before proceeding
- **Rollback Plan**: Keep old functions available for quick revert
- **Monitoring**: Add performance and error monitoring early

### **Success Metrics**
- Zero regressions in existing functionality
- Status messages match TUI specification
- Performance within acceptable bounds
- Type safety prevents runtime errors

---

**Document Version**: 1.0  
**Total Estimated Time**: 6-10 days (can be spread over multiple weeks)  
**Implementation Approach**: Incremental with testing at each step  
**Risk Level**: Low (due to careful chunking and feature flags)