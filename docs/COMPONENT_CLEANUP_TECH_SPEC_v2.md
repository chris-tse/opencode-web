# Component Cleanup & Refactoring Technical Specification v2

## Overview

This document outlines a revised plan to refactor the monolithic `App.tsx` into a well-structured, maintainable component architecture by leveraging existing components and implementing incremental, testable changes.

## Audit Findings

### Existing Components Analysis

**Actually Unused Components** (confirmed via import analysis):
- `src/components/Debug/EventStreamDebug.tsx` (82 lines) - Development debug tool, not imported
- `src/components/MarkdownRenderer.tsx` (36 lines) - Standalone renderer, not imported
- `src/components/Chat/StreamingIndicator.tsx` (106 lines) - Advanced streaming UI with progress tracking
- `src/components/Chat/StreamingIndicator.css` - Associated styles
- `src/hooks/useStreamingState.ts` (100 lines) - Comprehensive streaming state management

**Existing Components**:
- `src/components/Chat/MessageBubble.tsx` (82 lines) - Simple message rendering component (extracted from App.tsx inline implementation)

### App.tsx Current State
- **286 lines** (after Phase 1 cleanup)
- **Mixed concerns**: UI, state management, event handling, API calls
- **Opportunity**: Extract remaining inline components and logic
- **Business logic**: Complex event stream handling that should be extracted to hooks

## Revised Implementation Strategy

### Pre-Work Phase (Completed)
Extracted the working inline MessageComponent from App.tsx to MessageBubble.tsx using the simple implementation.

### Phase 1: Safe Cleanup (Low Risk)
Remove truly unused components and verify build integrity.

### Phase 2: Component Extraction (Medium Risk)
Extract remaining inline components from App.tsx.

### Phase 3: Logic Extraction (High Risk)
Extract business logic to custom hooks while preserving functionality.

### Phase 4: Final Refactoring (High Risk)
Complete the App.tsx simplification and add missing features.

## Detailed Implementation Plan

### Pre-Work Phase: Extract MessageBubble (Completed)
**Goal**: Move inline message rendering to reusable component

**Implementation**:
1. Replaced sophisticated MessageBubble implementation with working inline version from App.tsx
2. Updated App.tsx to use new MessageBubble directly
3. Cleaned up unused imports and fixed types

**Files Modified**: `src/components/Chat/MessageBubble.tsx`, `src/App.tsx`

**Status**: Completed - Functionality preserved, build/lint passing

### Phase 1: Safe Cleanup (0.5 days)

#### Step 1.1: Remove Confirmed Unused Components
```bash
# Safe to delete - confirmed no imports
rm src/components/Debug/EventStreamDebug.tsx
rm src/components/MarkdownRenderer.tsx
rm src/components/Chat/StreamingIndicator.tsx
rm src/components/Chat/StreamingIndicator.css
rm src/hooks/useStreamingState.ts
```

#### Step 1.2: Clean Up Related Imports
- Remove unused imports from `src/utils/streamingHelpers.ts`
- Verify no other files reference deleted components
- Update any type definitions that may be orphaned

#### Step 1.3: Verify Build Integrity
- Run `bun build` to ensure no broken imports
- Run `bun lint` to check for issues
- Test basic functionality

**Acceptance Criteria:**
- [ ] Build succeeds without errors
- [ ] Lint passes
- [ ] App loads and basic chat works

---

### Phase 2: Component Extraction (2-3 days)

#### Step 2.1: Extract ChatContainer Component
**Goal**: Create reusable chat container with scroll management

**Extract from App.tsx**:
- Lines 230-236: ScrollArea and message list rendering
- Auto-scroll logic (handled by ScrollArea component)
- Scroll ref management

**New File**: `src/components/Chat/ChatContainer.tsx`

```typescript
interface ChatContainerProps {
  messages: ChatMessage[]
  isLoading: boolean
}

export const ChatContainer = ({ messages, isLoading }: ChatContainerProps) => {
  // Extract scroll logic and message rendering
  // Use MessageBubble for individual messages
}
```

**Files Modified**: `src/App.tsx`, **Created**: `src/components/Chat/ChatContainer.tsx`

**Acceptance Criteria:**
- [ ] Auto-scroll behavior preserved
- [ ] Message rendering works correctly
- [ ] Component is reusable and well-typed

#### Step 2.2: Extract MessageInput Component
**Goal**: Create reusable message input with form handling

**Extract from App.tsx**:
- Lines 264-279: Form, textarea, and submit button
- Lines 167-214: Submit handler logic (partial)
- Lines 217-222: Keyboard event handling

**New File**: `src/components/Chat/MessageInput.tsx`

```typescript
interface MessageInputProps {
  onSubmit: (message: string) => void
  disabled: boolean
  isLoading: boolean
}

export const MessageInput = ({ onSubmit, disabled, isLoading }: MessageInputProps) => {
  // Local state for input value
  // Keyboard event handling
  // Form submission
}
```

**Files Modified**: `src/App.tsx`, **Created**: `src/components/Chat/MessageInput.tsx`

**Acceptance Criteria:**
- [ ] Enter key submission works
- [ ] Disabled states work correctly
- [ ] Input clears after submission
- [ ] Loading states display properly

#### Step 2.3: Extract SettingsPanel Component
**Goal**: Create reusable settings panel

**Extract from App.tsx**:
- Lines 238-262: Mode and model selection UI
- Mode selection dropdown with labels
- Integration with existing ModelSelect component

**New File**: `src/components/Settings/SettingsPanel.tsx`

```typescript
interface SettingsPanelProps {
  selectedMode: string
  onModeChange: (mode: string) => void
  disabled: boolean
}

export const SettingsPanel = ({ selectedMode, onModeChange, disabled }: SettingsPanelProps) => {
  // Mode selection dropdown
  // Integration with existing ModelSelect
}
```

**Files Modified**: `src/App.tsx`, **Created**: `src/components/Settings/SettingsPanel.tsx`

**Acceptance Criteria:**
- [ ] Mode selection works
- [ ] Model selection preserved
- [ ] Disabled states work
- [ ] Styling consistent



---

### Phase 3: Logic Extraction (2-3 days)

#### Step 3.1: Extract useEventStream Hook
**Goal**: Isolate event stream management logic

**Extract from App.tsx**:
- Lines 182-222: Event stream initialization and subscriptions
- Event handler setup and cleanup

**New File**: `src/hooks/useEventStream.ts`

```typescript
export const useEventStream = (sessionId: string | null) => {
  // EventSource connection management
  // Event subscriptions
  // Cleanup logic
  // Return connection state and handlers
}
```

**Files Modified**: `src/App.tsx`, **Created**: `src/hooks/useEventStream.ts`

**Acceptance Criteria:**
- [ ] Event stream connects properly
- [ ] All event types handled
- [ ] Cleanup on unmount works
- [ ] No memory leaks

#### Step 3.2: Extract useMessageHandling Hook
**Goal**: Isolate message processing logic

**Extract from App.tsx**:
- Lines 123-179: Status update logic
- Message and part update handlers
- Loading state management

**New File**: `src/hooks/useMessageHandling.ts`

```typescript
export const useMessageHandling = () => {
  // Message status updates
  // Tool execution tracking
  // Loading state coordination
  // Return message handlers
}
```

**Files Modified**: `src/App.tsx`, **Created**: `src/hooks/useMessageHandling.ts`

**Acceptance Criteria:**
- [ ] Message updates work correctly
- [ ] Tool status tracking preserved
- [ ] Loading states accurate
- [ ] Error handling maintained

#### Step 3.3: Extract useChatSession Hook
**Goal**: Create unified chat session interface

**Combine logic from**:
- Session management
- Message submission flow
- State coordination between stores

**New File**: `src/hooks/useChatSession.ts`

```typescript
export const useChatSession = () => {
  // Use other extracted hooks
  // Coordinate session, message, and model stores
  // Handle message submission
  // Return unified interface
}
```

**Files Modified**: `src/App.tsx`, **Created**: `src/hooks/useChatSession.ts`

**Acceptance Criteria:**
- [ ] Session initialization works
- [ ] Message submission flow preserved
- [ ] Store coordination maintained
- [ ] Error handling complete

---

### Phase 4: Final Refactoring (1-2 days)

#### Step 4.1: Simplify App.tsx
**Goal**: Reduce App.tsx to ~50 lines using extracted components and hooks

**Target Structure**:
```typescript
function App() {
  const { messages, isLoading, submitMessage } = useChatSession()
  const [selectedMode, setSelectedMode] = useState(DEFAULT_SETTINGS.MODE)

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">OpenCode UI</h1>
      </div>
      
      <ChatContainer messages={messages} isLoading={isLoading} />
      
      <div className="space-y-2">
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
      </div>
    </div>
  )
}
```

**Files Modified**: `src/App.tsx`

**Acceptance Criteria:**
- [ ] App.tsx under 80 lines (reduced from 286 lines)
- [ ] All functionality preserved
- [ ] Clean component composition
- [ ] Proper TypeScript types

#### Step 4.2: Add Missing Features
**Goal**: Leverage sophisticated existing components fully

**Enhancements**:
- Enable streaming indicators in MessageBubble
- Add progress tracking for tool execution
- Improve error handling and display

**Files Modified**: Various component files

**Acceptance Criteria:**
- [ ] Streaming indicators visible
- [ ] Tool progress shows correctly
- [ ] Error states handled gracefully
- [ ] Performance not degraded

---

## File Structure After Refactoring

```
src/
├── components/
│   ├── Chat/
│   │   ├── ChatContainer.tsx          # New - extracted from App.tsx
│   │   ├── MessageBubble.tsx          # Existing - now used in App.tsx
│   │   ├── MessageInput.tsx           # New - extracted from App.tsx
│   │   └── StreamingIndicator.tsx     # Existing - used by MessageBubble
│   ├── Settings/
│   │   └── SettingsPanel.tsx          # New - extracted from App.tsx
│   ├── ui/                            # Existing shadcn components
│   └── ModelSelect.tsx                # Existing - used by SettingsPanel
├── hooks/
│   ├── useEventStream.ts              # New - extracted from App.tsx
│   ├── useMessageHandling.ts          # New - extracted from App.tsx
│   ├── useChatSession.ts              # New - coordinates other hooks
│   └── useStreamingState.ts           # Existing - used by MessageBubble
├── stores/                            # Existing - unchanged
├── services/                          # Existing - unchanged
├── utils/                             # Existing - unchanged
└── App.tsx                            # Simplified to ~50 lines
```

## Testing Strategy

### Per-Step Testing
Each step includes specific acceptance criteria that must pass before proceeding.

### Integration Testing
- Message sending/receiving end-to-end
- Model/mode switching
- Error scenarios
- Session management
- Streaming functionality

### Regression Testing
- Compare functionality before/after each phase
- Performance benchmarking
- Visual regression testing

## Risk Mitigation

### Incremental Approach
- Each step is independently testable
- Can rollback individual steps
- Functionality preserved at each checkpoint

### Backup Strategy
- Create feature branch for all changes
- Keep original App.tsx as App.backup.tsx during Phase 4
- Commit after each successful step

### Validation Checklist (Per Step)
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] Build succeeds
- [ ] Manual testing passes
- [ ] No console errors
- [ ] Performance not degraded

## Success Metrics

### Code Quality
- **App.tsx size**: Reduced from 286 to ~80 lines (72% reduction)
- **Component reusability**: 3 new reusable components
- **Code duplication**: Eliminated inline MessageComponent
- **Separation of concerns**: Business logic in hooks, UI in components

### Developer Experience
- **Testability**: Each component/hook testable in isolation
- **Maintainability**: Single responsibility principle
- **Debugging**: Clear component boundaries
- **Type safety**: Improved TypeScript interfaces

### Functionality
- **Feature parity**: All existing functionality preserved
- **Enhanced features**: Better streaming indicators and progress tracking
- **Performance**: Potential improvements through better memoization

## Timeline

- **Phase 1 (Safe Cleanup)**: 0.5 days
- **Phase 2 (Component Integration)**: 2-3 days
- **Phase 3 (Logic Extraction)**: 2-3 days  
- **Phase 4 (Final Refactoring)**: 1-2 days
- **Testing & Polish**: 1 day

**Total Estimated Time**: 6.5-9.5 days

## Dependencies

### No New External Dependencies
- Leverage existing: React 19, TypeScript, Zustand, shadcn/ui
- Use existing sophisticated components instead of recreating

### Internal Dependencies
- Existing Zustand stores (unchanged)
- Existing type definitions (enhanced)
- Existing utility functions (unchanged)
- Existing streaming infrastructure (better utilized)

## Key Improvements Over v1

1. **Accurate Analysis**: Based on actual code audit, not assumptions
2. **Leverage Existing Work**: Use sophisticated existing components instead of recreating
3. **Incremental Approach**: Each step is testable and reversible
4. **Risk Management**: Lower risk through smaller, focused changes
5. **Better Utilization**: Unlock existing streaming and progress features
6. **Realistic Timeline**: Based on actual scope of changes needed