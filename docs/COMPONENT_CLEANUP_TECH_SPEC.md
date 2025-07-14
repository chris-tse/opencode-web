# Component Cleanup & Refactoring Technical Specification

## Overview

This document outlines a comprehensive plan to clean up unused components and refactor the monolithic `App.tsx` into a well-structured, maintainable component architecture using Zustand for state management.

## Current State Analysis

### Unused Components (528 lines to remove)
- `src/components/Chat/MessageBubble.tsx` (197 lines) - Complex streaming component, not imported
- `src/components/Chat/StreamingIndicator.tsx` (107 lines) - Orphaned by MessageBubble
- `src/components/Chat/StreamingIndicator.css` - Associated styles
- `src/components/Debug/EventStreamDebug.tsx` (83 lines) - Debug component, not imported
- `src/components/MarkdownRenderer.tsx` (37 lines) - Standalone renderer, not imported
- `src/hooks/useStreamingState.ts` (101 lines) - Orphaned by StreamingIndicator

### App.tsx Issues
- **350 lines** of monolithic code
- **Mixed concerns**: UI, state management, event handling, API calls
- **Duplicate functionality**: Custom MessageComponent vs unused MessageBubble
- **Poor separation**: Business logic mixed with presentation
- **Hard to test**: Everything coupled together

## Implementation Plan

### Phase 1: Cleanup Unused Code

#### 1.1 Remove Unused Components
```bash
# Files to delete
rm src/components/Chat/MessageBubble.tsx
rm src/components/Chat/StreamingIndicator.tsx
rm src/components/Chat/StreamingIndicator.css
rm src/components/Debug/EventStreamDebug.tsx
rm src/components/MarkdownRenderer.tsx
rm src/hooks/useStreamingState.ts
```

#### 1.2 Clean Up Related Imports
- Remove unused imports from `src/utils/streamingHelpers.ts`
- Verify no other files reference deleted components
- Update any type definitions that may be orphaned

### Phase 2: Extract Components from App.tsx

#### 2.1 MessageBubble Component
**File**: `src/components/Chat/MessageBubble.tsx`

```typescript
interface MessageBubbleProps {
  message: {
    id: string
    type: 'user' | 'assistant' | 'event' | 'error'
    content: string
  }
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  // Extract lines 22-83 from App.tsx
  // Add proper TypeScript interfaces
  // Implement markdown rendering for assistant messages
}
```

**State Management**: None (pure presentation component)

#### 2.2 ChatContainer Component
**File**: `src/components/Chat/ChatContainer.tsx`

```typescript
interface ChatContainerProps {
  messages: Message[]
  isLoading: boolean
}

export const ChatContainer = ({ messages, isLoading }: ChatContainerProps) => {
  // Extract scroll area logic (lines 106-120, 294-300)
  // Manage auto-scroll behavior
  // Handle message rendering
}
```

**State Management**: Local scroll state only

#### 2.3 MessageInput Component
**File**: `src/components/Chat/MessageInput.tsx`

```typescript
interface MessageInputProps {
  onSubmit: (message: string) => void
  disabled: boolean
  isLoading: boolean
}

export const MessageInput = ({ onSubmit, disabled, isLoading }: MessageInputProps) => {
  // Extract form logic (lines 231-278, 328-343)
  // Manage textarea ref and input state
  // Handle keyboard events
}
```

**State Management**: Local input state via useState

#### 2.4 SettingsPanel Component
**File**: `src/components/Settings/SettingsPanel.tsx`

```typescript
interface SettingsPanelProps {
  selectedMode: string
  onModeChange: (mode: string) => void
  disabled: boolean
}

export const SettingsPanel = ({ selectedMode, onModeChange, disabled }: SettingsPanelProps) => {
  // Extract settings UI (lines 302-326)
  // Mode selection dropdown
  // Model selection (keep existing ModelSelect)
}
```

**State Management**: Props-based (parent manages state)

### Phase 3: Extract Custom Hooks

#### 3.1 useEventStream Hook
**File**: `src/hooks/useEventStream.ts`

```typescript
export const useEventStream = () => {
  // Extract event stream logic (lines 182-222)
  // Manage connection lifecycle
  // Handle event subscriptions
  // Return event handlers and connection state
}
```

**Responsibilities**:
- EventSource connection management
- Event subscription/unsubscription
- Reconnection logic
- Error handling

#### 3.2 useMessageHandling Hook
**File**: `src/hooks/useMessageHandling.ts`

```typescript
export const useMessageHandling = () => {
  // Extract status update logic (lines 123-179)
  // Handle message and part updates
  // Manage loading states and metadata
  // Return message handlers
}
```

**Responsibilities**:
- Message status updates
- Tool execution tracking
- Loading state management
- Error handling

#### 3.3 useChatSession Hook
**File**: `src/hooks/useChatSession.ts`

```typescript
export const useChatSession = () => {
  // Combine session, message, and model store logic
  // Handle message submission
  // Manage session lifecycle
  // Return unified chat interface
}
```

**Responsibilities**:
- Session initialization
- Message submission flow
- State coordination between stores
- Business logic orchestration

### Phase 4: Refactor App.tsx

#### 4.1 Simplified App Component
**Target**: Reduce from 350 lines to ~50 lines

```typescript
function App() {
  const { messages, isLoading, submitMessage } = useChatSession()
  const [selectedMode, setSelectedMode] = useState(DEFAULT_SETTINGS.MODE)

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">OpenCode UI</h1>
      </header>
      
      <ChatContainer messages={messages} isLoading={isLoading} />
      
      <footer className="space-y-2">
        <SettingsPanel 
          selectedMode={selectedMode}
          onModeChange={setSelectedMode}
          disabled={isLoading}
        />
        <MessageInput 
          onSubmit={(message) => submitMessage(message, selectedMode)}
          disabled={isLoading}
          isLoading={isLoading}
        />
      </footer>
    </div>
  )
}
```

#### 4.2 State Management Strategy

**Zustand Stores** (keep existing):
- `sessionStore` - Session lifecycle
- `messageStore` - Message history
- `modelStore` - Model/provider data

**Local Component State**:
- `selectedMode` - UI setting (App level)
- `inputValue` - Form input (MessageInput level)
- `scrollRef` - DOM reference (ChatContainer level)

**Custom Hooks**:
- Business logic and side effects
- Store coordination
- Event handling

## File Structure After Refactoring

```
src/
├── components/
│   ├── Chat/
│   │   ├── ChatContainer.tsx          # New
│   │   ├── MessageBubble.tsx          # Extracted from App.tsx
│   │   └── MessageInput.tsx           # New
│   ├── Settings/
│   │   └── SettingsPanel.tsx          # New
│   ├── ui/                            # Existing shadcn components
│   └── ModelSelect.tsx                # Keep existing
├── hooks/
│   ├── useEventStream.ts              # New
│   ├── useMessageHandling.ts          # New
│   └── useChatSession.ts              # New
├── stores/                            # Keep existing
├── services/                          # Keep existing
├── utils/                             # Keep existing
└── App.tsx                            # Simplified (~50 lines)
```

## Implementation Steps

### Step 1: Cleanup (Low Risk)
1. Remove unused components and files
2. Clean up orphaned imports
3. Verify build still works
4. Run linting and type checking

### Step 2: Extract Components (Medium Risk)
1. Create MessageBubble component
2. Create ChatContainer component  
3. Create MessageInput component
4. Create SettingsPanel component
5. Test each component in isolation

### Step 3: Extract Hooks (High Risk)
1. Create useEventStream hook
2. Create useMessageHandling hook
3. Create useChatSession hook
4. Test hook integration

### Step 4: Refactor App.tsx (High Risk)
1. Replace inline components with extracted ones
2. Replace inline logic with custom hooks
3. Verify all functionality works
4. Test edge cases and error scenarios

## Testing Strategy

### Unit Tests
- Each extracted component in isolation
- Custom hooks with mock dependencies
- Store interactions

### Integration Tests
- Component composition
- Hook coordination
- Event flow end-to-end

### Manual Testing
- Message sending/receiving
- Model/mode switching
- Error handling
- Session management

## Risk Mitigation

### Rollback Plan
- Keep original App.tsx as App.backup.tsx
- Implement changes in feature branch
- Incremental commits for each phase

### Validation Checklist
- [ ] All existing functionality preserved
- [ ] No TypeScript errors
- [ ] ESLint passes
- [ ] Build succeeds
- [ ] Manual testing passes
- [ ] Performance not degraded

## Success Metrics

### Code Quality
- **Lines of code**: App.tsx reduced from 350 to ~50 lines
- **Cyclomatic complexity**: Reduced by 70%
- **Component reusability**: 4 new reusable components
- **Test coverage**: Increase from 0% to 80%

### Developer Experience
- **Faster development**: Isolated components easier to modify
- **Better debugging**: Clear separation of concerns
- **Easier testing**: Smaller, focused units
- **Improved maintainability**: Single responsibility principle

### Performance
- **Bundle size**: Potential reduction through better tree-shaking
- **Render performance**: Better memoization opportunities
- **Memory usage**: Reduced re-renders through proper state isolation

## Timeline

- **Phase 1 (Cleanup)**: 1 day
- **Phase 2 (Extract Components)**: 2-3 days  
- **Phase 3 (Extract Hooks)**: 2-3 days
- **Phase 4 (Refactor App)**: 1-2 days
- **Testing & Polish**: 1-2 days

**Total Estimated Time**: 7-11 days

## Dependencies

### External
- No new dependencies required
- Existing: React 19, TypeScript, Zustand, shadcn/ui

### Internal
- Zustand stores (existing)
- Type definitions (existing)
- Utility functions (existing)

## Future Considerations

### Potential Enhancements
- Add React.memo to components for performance
- Implement error boundaries
- Add loading skeletons
- Enhance accessibility
- Add keyboard shortcuts

### Architecture Evolution
- Consider React Query for server state
- Evaluate component composition patterns
- Plan for internationalization
- Design system expansion