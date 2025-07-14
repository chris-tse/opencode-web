# Message Store V2 Technical Specification

## Overview

This document outlines the implementation plan for `messageStoreV2`, a new Zustand store that aligns with the opencode API structure to enable session resuming and improve real-time message handling.

## Problem Statement

The current `messageStore` uses a simplified `ChatMessage` structure that doesn't match the API's `Message` + `Part[]` format, making session resuming complex and requiring significant data transformation. The new store will:

1. **Mirror API structure** for direct session hydration
2. **Enable session resuming** without data transformation
3. **Simplify event stream integration** with native API event handling
4. **Support rich message parts** (text, tools, files, steps)

## Architecture

### Current vs New Structure

**Current Store:**
```typescript
interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'event' | 'error'
  content: string
  timestamp: number
}
```

**New Store (API-aligned):**
```typescript
interface MessageWithParts {
  info: Message    // From API schema
  parts: Part[]    // From API schema
}
```

### API Alignment

The new store directly mirrors the session message endpoint response:
- `GET /session/{id}/message` → `MessageWithParts[]`
- Event stream updates → Same data structures, incremental updates

## Phase 1: Core Store Implementation

### 1.1 Type Definitions

**Location:** `src/stores/messageStoreV2.ts`

**API-Aligned Types:**
```typescript
// Exact API schema types
interface Message {
  id: string
  sessionID: string
  role: 'user' | 'assistant'
  time: { created: number; completed?: number }
  // Assistant-specific fields
  error?: MessageError
  system?: string[]
  modelID?: string
  providerID?: string
  path?: { cwd: string; root: string }
  summary?: boolean
  cost?: number
  tokens?: TokenUsage
}

interface Part {
  id: string
  sessionID: string
  messageID: string
  type: 'text' | 'file' | 'tool' | 'step-start' | 'step-finish'
  // Type-specific fields based on discriminated union
}

interface MessageWithParts {
  info: Message
  parts: Part[]
}
```

### 1.2 Store State Structure

```typescript
interface MessageStoreV2State {
  messages: MessageWithParts[]
  
  // Session management
  hydrateFromSession: (messages: MessageWithParts[]) => void
  
  // Event stream handlers
  handleMessageUpdated: (info: Message) => void
  handlePartUpdated: (part: Part) => void
  handleMessageRemoved: (messageId: string) => void
  
  // User actions
  addUserMessage: (content: string, messageId: string, sessionId: string) => void
  clearMessages: () => void
}
```

### 1.3 Core Methods Implementation

**Session Hydration:**
```typescript
hydrateFromSession: (messages: MessageWithParts[]) => {
  set({ messages })
}
```

**Event Stream Integration:**
```typescript
handleMessageUpdated: (info: Message) => {
  // Find existing message or create new one
  // Update message info while preserving parts
}

handlePartUpdated: (part: Part) => {
  // Find message by part.messageID
  // Update or add part by part.id
  // Maintain chronological order within parts
}
```

**User Message Creation:**
```typescript
addUserMessage: (content: string, messageId: string, sessionId: string) => {
  // Create MessageWithParts structure
  // Add text part with proper timestamps
}
```

### 1.4 Event Stream Integration

**Event Handler Mapping:**
- `message.updated` → `handleMessageUpdated(event.properties.info)`
- `message.part.updated` → `handlePartUpdated(event.properties.part)`
- `message.removed` → `handleMessageRemoved(event.properties.messageID)`

**Implementation Notes:**
- Events contain exact same data structures as session endpoint
- No data transformation required
- Store methods handle incremental updates naturally

### 1.5 Session Resuming Flow

```typescript
// 1. Initialize session
const sessionId = await createSession()

// 2. Hydrate from existing messages (if any)
const existingMessages = await fetch(`/session/${sessionId}/message`)
hydrateFromSession(existingMessages)

// 3. Start event stream for real-time updates
const eventSource = new EventSource('/event')
eventSource.onmessage = (event) => {
  const eventData = JSON.parse(event.data)
  switch (eventData.type) {
    case 'message.updated':
      handleMessageUpdated(eventData.properties.info)
      break
    case 'message.part.updated':
      handlePartUpdated(eventData.properties.part)
      break
    // ...
  }
}
```

## Implementation Tasks

### Task 1: Complete Type Definitions
- [ ] Import exact types from API schema
- [ ] Create discriminated unions for Part types
- [ ] Add proper TypeScript strict typing
- [ ] Handle optional fields correctly

### Task 2: Implement Core Store Methods
- [ ] `hydrateFromSession` - Direct array assignment
- [ ] `handleMessageUpdated` - Message info updates
- [ ] `handlePartUpdated` - Part-level incremental updates
- [ ] `handleMessageRemoved` - Message deletion
- [ ] `addUserMessage` - User message creation
- [ ] `clearMessages` - State reset

### Task 3: Event Stream Integration
- [ ] Update `useEventStream` hook to use new store methods
- [ ] Map event types to store handlers
- [ ] Handle event parsing and error cases
- [ ] Maintain backward compatibility during transition

### Task 4: Session Hydration
- [ ] Add session hydration to session initialization
- [ ] Handle empty session state
- [ ] Ensure proper message ordering
- [ ] Add error handling for failed hydration

### Task 5: Testing & Validation
- [ ] Test with existing session data
- [ ] Verify event stream updates work correctly
- [ ] Validate message ordering preservation
- [ ] Test session resuming flow end-to-end

## Success Criteria

### Functional Requirements
- [ ] Store can hydrate from session endpoint without transformation
- [ ] Event stream updates work with new store structure
- [ ] Message ordering is preserved in all scenarios
- [ ] Session resuming works end-to-end
- [ ] No data loss during store operations

### Performance Requirements
- [ ] Hydration performance comparable to current implementation
- [ ] Event stream updates remain real-time
- [ ] Memory usage doesn't increase significantly
- [ ] Store operations remain synchronous where possible

### Compatibility Requirements
- [ ] New store can run alongside existing store
- [ ] No breaking changes to existing functionality
- [ ] Event stream integration maintains current behavior
- [ ] Session management remains unchanged

## Phase 2: Component Migration (Future)

Phase 2 will involve:
1. **Component Analysis** - Identify all components using current store
2. **Adapter Layer** - Create compatibility layer for gradual migration
3. **Component Updates** - Update components to use new store structure
4. **Message Rendering** - Handle rich part types (tools, files, steps)
5. **Legacy Cleanup** - Remove old store and adapters

## Risk Assessment

### Low Risk
- **API alignment** - Store structure matches API exactly
- **Event handling** - Same data structures, minimal changes needed
- **Session hydration** - Direct array assignment, very simple

### Medium Risk
- **Part ordering** - Need to ensure parts maintain correct order within messages
- **Event stream timing** - Handle rapid updates without race conditions
- **Memory management** - Large sessions with many parts

### Mitigation Strategies
- **Incremental development** - Build and test each method individually
- **Parallel implementation** - Keep existing store running during development
- **Comprehensive testing** - Test with real session data throughout development
- **Performance monitoring** - Track memory and performance impact

## Timeline Estimate

**Phase 1 Total: 2-3 days**

- **Day 1**: Type definitions and basic store structure (4-6 hours)
- **Day 2**: Core methods implementation and event integration (6-8 hours)
- **Day 3**: Session hydration, testing, and refinement (4-6 hours)

## Dependencies

### Internal Dependencies
- Current `sessionStore` for session management
- Current `useEventStream` hook for event handling
- API service layer for session endpoint calls

### External Dependencies
- Zustand store library (already installed)
- TypeScript for strict typing
- opencode API server running locally

## Conclusion

The messageStoreV2 implementation is straightforward due to perfect API alignment. The main complexity is ensuring proper event stream integration and maintaining message/part ordering. The parallel development approach minimizes risk while enabling thorough testing before migration.