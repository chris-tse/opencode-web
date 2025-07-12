# STATUS_MESSAGE_PRD_v2.md

## Product Requirements Document: TUI-Aligned Status Messages (Revised)

### **Overview**

This document outlines the revised requirements and implementation plan for aligning the opencode-ui status message system with the TUI Status Display Specification. This version addresses architectural flaws identified in v1 and provides a more robust implementation approach.

### **Changes from v1**

#### **Critical Issues Addressed**:
- ❌ **v1 Issue**: Assumed `MessageMetadata` available in tool status functions
- ✅ **v2 Fix**: Updated data flow to pass metadata from App.tsx event handlers
- ❌ **v1 Issue**: Used `process.cwd()` in browser environment  
- ✅ **v2 Fix**: Use server-provided `cwd` from `MessageMetadata.assistant.path`
- ❌ **v1 Issue**: Type safety issues with `TodoItem` interface
- ✅ **v2 Fix**: Added proper type guards and safe casting
- ❌ **v1 Issue**: Inconsistent event handling between individual parts and full messages
- ✅ **v2 Fix**: Unified approach with metadata propagation

### **Current State Analysis**

#### **Existing Architecture**
- **Event Stream**: Server-Sent Events from `/event` endpoint
- **Processing**: `App.tsx` handles `message.updated` and `message.part.updated` events
- **Status Generation**: `toolStatusHelpers.ts` provides generic status messages
- **Display**: Status bubbles rendered as `type: 'event'` messages

#### **Current Data Flow Issues**
```typescript
// CURRENT (v1 Problem)
updateStatusFromPart(part: ToolPart) → getOverallToolStatus([part]) → Generic Status

// MISSING: MessageMetadata with file paths, todo data, tool metadata
```

#### **Required Data Flow**
```typescript
// NEW (v2 Solution)  
updateStatusFromPart(part: ToolPart, messageMetadata: MessageMetadata) → 
getContextualToolStatus(part, messageMetadata) → Contextual Status
```

### **Requirements**

#### **R1: Enhanced Data Flow**
**Priority**: Critical  
**Description**: Fix metadata propagation from App.tsx to status helpers.

**Current Implementation**:
```typescript
// App.tsx:106 - No metadata passed
const status = getOverallToolStatus([part])
```

**Required Implementation**:
```typescript
// App.tsx - Pass metadata through event handlers
const status = getContextualToolStatus(part, message.metadata)
```

#### **R2: Browser-Safe Path Resolution**
**Priority**: High  
**Description**: Use server-provided paths instead of browser `process.cwd()`.

**Implementation**:
```typescript
export const getRelativePath = (
  filePath?: string, 
  serverCwd?: string
): string => {
  if (!filePath) return 'file'
  if (!serverCwd) return filePath.split('/').pop() || filePath
  
  if (filePath.startsWith(serverCwd)) {
    return filePath.slice(serverCwd.length + 1) || filePath
  }
  
  return filePath.split('/').pop() || filePath
}
```

#### **R3: Type-Safe Todo Detection**
**Priority**: High  
**Description**: Safely detect and handle todo phases with proper type guards.

**Implementation**:
```typescript
interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  id: string
  priority: 'high' | 'medium' | 'low'
}

const isTodoArgs = (args?: Record<string, unknown>): args is { todos: TodoItem[] } => {
  return args != null && 
         Array.isArray(args.todos) && 
         args.todos.every(todo => 
           typeof todo === 'object' && 
           todo != null &&
           typeof todo.content === 'string' &&
           typeof todo.status === 'string'
         )
}
```

#### **R4: Contextual Running State Messages**
**Priority**: High  
**Description**: Show file paths and command descriptions in running state.

**Required Behavior**:
```typescript
// read tool → "Read src/App.tsx" (with relative path)
// edit tool → "Edit components/Chat.tsx" (with relative path) 
// bash tool → "Run build command" (with description)
```

#### **R5: Unified Event Handler Updates**
**Priority**: High  
**Description**: Update both message and part handlers to support metadata.

**Required Changes**:
- `updateStatusFromMessage()` - Already has access to full message
- `updateStatusFromPart()` - Needs message metadata parameter added

### **Technical Implementation Plan**

#### **Phase 1: Data Flow Architecture (Critical)**

**Files to Modify**:
- `src/App.tsx` - Event handler signatures
- `src/utils/toolStatusHelpers.ts` - Function signatures

**Changes Required**:

1. **Update App.tsx Event Handlers**:
```typescript
// Current signature
const updateStatusFromPart = useCallback((part: AssistantMessagePart, messageId: string) => {

// New signature  
const updateStatusFromPart = useCallback((
  part: AssistantMessagePart, 
  messageId: string,
  messageMetadata?: MessageMetadata
) => {
  // ... existing logic
  if (part.type === 'tool' && part.state) {
    const status = getContextualToolStatus(part, messageMetadata)
    addStatusMessage(status)
  }
}, [])
```

2. **Update toolStatusHelpers.ts**:
```typescript
// New main function
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
      return getCompletedMessage(toolName, toolPart.state as ToolStateCompleted, messageMetadata)
    case 'error':
      return formatToolError(toolName, toolPart.state as ToolStateError)
    default:
      return getToolActionMessage(toolName)
  }
}
```

#### **Phase 2: Running State Enhancement**

**Implementation**:
```typescript
export const getToolTitle = (
  toolName: string,
  args?: Record<string, unknown>,
  serverCwd?: string
): string => {
  switch (toolName) {
    case 'read':
    case 'edit':
    case 'write':
      const filePath = args?.filePath as string
      const relativePath = getRelativePath(filePath, serverCwd)
      return `${getToolDisplayName(toolName)} ${relativePath}`
      
    case 'bash':
      const description = args?.description as string
      return `Bash ${description || 'command'}`
      
    case 'todowrite':
      return getTodoPhase(args)
      
    case 'webfetch':
      const url = args?.url as string
      try {
        const urlObj = new URL(url)
        return `Fetch ${urlObj.hostname}`
      } catch {
        return `Fetch ${url || 'URL'}`
      }
      
    default:
      return getToolDisplayName(toolName)
  }
}
```

#### **Phase 3: Todo Phase Detection (Type-Safe)**

**Implementation**:
```typescript
export const getTodoPhase = (args?: Record<string, unknown>): string => {
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
```

#### **Phase 4: Event Stream Integration**

**Update Event Handlers**:
```typescript
// In App.tsx - Update event stream handlers to pass metadata
useEffect(() => {
  const unsubscribe = eventStreamService.subscribe((event) => {
    switch (event.type) {
      case 'message.updated':
        const message = event.properties.info
        updateStatusFromMessage(message)
        break
        
      case 'message.part.updated':
        const { part, messageID } = event.properties
        // Get the current message to access metadata
        const currentMessage = messages.find(m => m.id === messageID)
        updateStatusFromPart(part, messageID, currentMessage?.metadata)
        break
    }
  })
  
  return unsubscribe
}, [messages, updateStatusFromMessage, updateStatusFromPart])
```

#### **Phase 5: Completed State Specialization**

**Implementation**:
```typescript
export const getCompletedMessage = (
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
```

### **Type Definitions**

#### **New Types in `src/services/types.ts`**:
```typescript
// Add TodoItem interface for type safety
export interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  id: string
  priority: 'high' | 'medium' | 'low'
}

// Type guard helper
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

### **Migration Strategy**

#### **Backward Compatibility Approach**:
1. **Gradual Function Replacement**:
   - Keep `getOverallToolStatus()` for fallback
   - Introduce `getContextualToolStatus()` alongside  
   - Switch callers one by one

2. **Safe Metadata Access**:
   - All metadata parameters are optional
   - Graceful degradation when metadata unavailable
   - Fallback to current behavior on errors

3. **Feature Flag Support**:
```typescript
const USE_CONTEXTUAL_STATUS = true // Feature flag

const status = USE_CONTEXTUAL_STATUS 
  ? getContextualToolStatus(part, metadata)
  : getOverallToolStatus([part])
```

### **Testing Strategy**

#### **Unit Tests**:
```typescript
describe('getContextualToolStatus', () => {
  it('handles missing metadata gracefully', () => {
    const toolPart = createMockToolPart('read', 'running')
    expect(getContextualToolStatus(toolPart)).toBe('Read file')
  })
  
  it('uses relative paths when server cwd available', () => {
    const toolPart = createMockToolPart('read', 'running', { 
      filePath: '/Users/test/project/src/App.tsx' 
    })
    const metadata = createMockMetadata({ cwd: '/Users/test/project' })
    expect(getContextualToolStatus(toolPart, metadata)).toBe('Read src/App.tsx')
  })
  
  it('detects todo phases safely', () => {
    const toolPart = createMockToolPart('todowrite', 'running', {
      todos: [{ content: 'Fix bug', status: 'in_progress', id: '1', priority: 'high' }]
    })
    expect(getContextualToolStatus(toolPart)).toBe('Working on: Fix bug')
  })
})
```

#### **Integration Tests**:
- Test full event flow with real metadata
- Verify fallback behavior when data missing
- Test type safety with malformed todo data

### **Performance Considerations**

#### **Optimizations**:
- **Path Caching**: Cache relative path calculations per message
- **Type Guard Memoization**: Cache todo validation results  
- **Metadata Access**: Minimize metadata object traversal

#### **Monitoring**:
```typescript
// Add performance timing
const startTime = performance.now()
const status = getContextualToolStatus(part, metadata)
const duration = performance.now() - startTime

if (duration > 5) {
  console.warn(`Slow status generation: ${duration}ms for ${part.tool}`)
}
```

### **Risk Mitigation**

#### **High Risk - Breaking Changes**:
- **Mitigation**: Phased rollout with feature flags
- **Fallback**: Keep existing functions as backup
- **Testing**: Comprehensive test coverage before deployment

#### **Medium Risk - Type Safety**:
- **Mitigation**: Strict type guards and runtime validation
- **Fallback**: Graceful degradation for invalid data
- **Monitoring**: Log type validation failures

#### **Low Risk - Performance**:
- **Mitigation**: Performance benchmarks and monitoring
- **Optimization**: Lazy evaluation and caching where appropriate

### **Implementation Timeline**

#### **Week 1**: Data Flow Architecture
- Phase 1: Update function signatures and basic data flow
- Basic testing and validation

#### **Week 2**: Feature Implementation  
- Phase 2-3: Running state enhancement and todo detection
- Type safety implementation and testing

#### **Week 3**: Polish and Integration
- Phase 4-5: Event stream integration and completed states
- Comprehensive testing and performance optimization

#### **Week 4**: Deployment and Monitoring
- Gradual rollout with feature flags
- Performance monitoring and bug fixes

### **Success Criteria**

1. ✅ All existing status displays continue working (no regressions)
2. ✅ File paths display as relative when server cwd available  
3. ✅ Todo phases detect correctly with type safety
4. ✅ Running state shows contextual information (file paths, descriptions)
5. ✅ Completed states use tool-specific messages when metadata available
6. ✅ Performance impact < 5ms per status update
7. ✅ Error handling gracefully degrades to current behavior
8. ✅ Type safety prevents runtime errors with malformed data

### **Future Enhancements**

#### **Phase 6: Advanced Features** (Post-MVP)
- Custom status message templates
- User preferences for status verbosity  
- Tool execution time display
- Enhanced error diagnostics

#### **Phase 7: Extensibility** (Future)
- Plugin system for custom tool handlers
- Configurable status message formats
- Integration with external monitoring tools

---

**Document Version**: 2.0  
**Created**: Based on v1 + architectural review  
**Last Updated**: $(date)  
**Owner**: opencode-ui team  
**Status**: Ready for Implementation

## Implementation Notes

### **Key Differences from v1**:
1. **Metadata Propagation**: Fixed data flow from App.tsx event handlers
2. **Browser Compatibility**: Removed `process.cwd()`, use server-provided paths
3. **Type Safety**: Added proper type guards and validation
4. **Backward Compatibility**: Gradual migration strategy with fallbacks
5. **Performance**: Added monitoring and optimization considerations

### **Critical Implementation Order**:
1. **Phase 1** (Critical): Fix data flow architecture first
2. **Phase 2-3** (High): Add contextual features safely
3. **Phase 4-5** (Medium): Polish and complete feature set
4. **Testing** (Continuous): Test each phase thoroughly before proceeding

This revised approach addresses the architectural flaws while maintaining system stability and providing a clear migration path.