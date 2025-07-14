# APP_CONTAINER_RESTRUCTURE_TECH_SPEC.md

## Overview

This document outlines the technical specification for restructuring `App.tsx` from a monolithic component into multiple focused container components, creating a clean application shell with well-separated concerns.

## Current State Analysis

### App.tsx Current Structure (239 lines)
- **Application shell**: Layout, header, main container
- **Business logic**: Message handling, event stream management, state coordination
- **Settings management**: Mode/model selection
- **Chat interface**: Message display and input coordination
- **Mixed concerns**: UI layout + business logic + state management

### Problems with Current Structure
1. **Single Responsibility Violation**: App.tsx handles layout AND business logic
2. **Testing Complexity**: Hard to test business logic separately from UI
3. **Reusability**: Business logic tied to specific layout structure
4. **Maintainability**: Changes to layout affect business logic and vice versa

## Target Architecture

### Container Component Hierarchy
```
App.tsx (Application Shell - ~15 lines)
├── AppHeader.tsx (Header/Navigation - ~20 lines)
├── ChatInterface.tsx (Chat Business Logic - ~150 lines)
│   ├── ChatContainer.tsx (existing)
│   ├── MessageInput.tsx (existing)
│   └── SettingsPanel.tsx (to be extracted)
└── AppFooter.tsx (Future: Status/Debug - ~10 lines)
```

### Separation of Concerns
- **App.tsx**: Pure layout shell, no business logic
- **AppHeader.tsx**: Application branding, navigation, global actions
- **ChatInterface.tsx**: Chat-specific business logic and state management
- **AppFooter.tsx**: Global status, debug info, app-level actions

## Implementation Plan

### Phase 1: Extract AppHeader Component
**Goal**: Separate application header from main logic
**Risk**: Low
**Estimated Effort**: 30 minutes

**Tasks**:
1. Create `src/components/App/AppHeader.tsx`
2. Extract header JSX and styling from App.tsx
3. Add props for future extensibility (title, actions)
4. Update App.tsx to use AppHeader component
5. Verify build and functionality

**Files Modified**:
- `src/App.tsx` (remove header JSX)
- `src/components/App/AppHeader.tsx` (new)

**Expected Outcome**:
- App.tsx reduced by ~10 lines
- Clean header component for future navigation features

### Phase 2: Extract SettingsPanel Component
**Goal**: Complete Phase 2 from previous spec
**Risk**: Low
**Estimated Effort**: 45 minutes

**Tasks**:
1. Create `src/components/Chat/SettingsPanel.tsx`
2. Extract mode/model selection UI from App.tsx
3. Create props interface for settings state and handlers
4. Update App.tsx to use SettingsPanel component
5. Verify all settings functionality works

**Files Modified**:
- `src/App.tsx` (remove settings JSX)
- `src/components/Chat/SettingsPanel.tsx` (new)

**Expected Outcome**:
- App.tsx reduced by ~25 lines
- Reusable settings component

### Phase 3: Extract Business Logic to Custom Hooks
**Goal**: Separate business logic from UI components
**Risk**: Medium
**Estimated Effort**: 2 hours

**Tasks**:
1. Create `src/hooks/useMessageHandler.ts`
   - Extract `handleMessageSubmit` function
   - Extract loading state management
   - Extract message coordination logic
2. Create `src/hooks/useEventStreamManager.ts`
   - Extract event stream setup and subscriptions
   - Extract status update functions
   - Extract event handling logic
3. Create `src/hooks/useSessionManager.ts`
   - Extract session initialization
   - Extract session state management
4. Update App.tsx to use custom hooks
5. Comprehensive testing of all functionality

**Files Created**:
- `src/hooks/useMessageHandler.ts`
- `src/hooks/useEventStreamManager.ts`
- `src/hooks/useSessionManager.ts`

**Expected Outcome**:
- App.tsx reduced by ~120 lines
- Testable business logic in isolated hooks
- Reusable logic across components

### Phase 4: Extract ChatInterface Container
**Goal**: Create dedicated chat container with all chat-related logic
**Risk**: Medium
**Estimated Effort**: 1 hour

**Tasks**:
1. Create `src/components/App/ChatInterface.tsx`
2. Move all chat-related logic from App.tsx to ChatInterface
3. Use custom hooks from Phase 3
4. Coordinate ChatContainer, MessageInput, and SettingsPanel
5. Update App.tsx to use ChatInterface component

**Files Modified**:
- `src/App.tsx` (remove chat logic, use ChatInterface)
- `src/components/App/ChatInterface.tsx` (new)

**Expected Outcome**:
- App.tsx becomes pure layout shell (~15 lines)
- Self-contained chat functionality
- Clear separation between app shell and chat features

### Phase 5: Add AppFooter for Future Features
**Goal**: Prepare foundation for status display and debug features
**Risk**: Low
**Estimated Effort**: 20 minutes

**Tasks**:
1. Create `src/components/App/AppFooter.tsx`
2. Add placeholder for future status/debug features
3. Update App.tsx to include AppFooter
4. Prepare props interface for future features

**Files Created**:
- `src/components/App/AppFooter.tsx`

**Expected Outcome**:
- Complete container structure
- Foundation for future status features

## Final Architecture

### App.tsx (Target: ~15 lines)
```tsx
function App() {
  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <AppHeader />
      <ChatInterface />
      <AppFooter />
    </div>
  )
}
```

### Component Responsibilities

**AppHeader.tsx**:
- Application branding and title
- Global navigation (future)
- User settings access (future)

**ChatInterface.tsx**:
- Chat business logic coordination
- Message handling and state management
- Event stream management
- Settings panel integration

**AppFooter.tsx**:
- Connection status display (future)
- Debug information toggle (future)
- App version/build info (future)

## Benefits

### Maintainability
- **Single Responsibility**: Each component has one clear purpose
- **Testability**: Business logic isolated in testable hooks
- **Modularity**: Components can be developed/tested independently

### Extensibility
- **Easy Feature Addition**: New features fit into appropriate containers
- **Layout Flexibility**: App shell can be modified without affecting business logic
- **Component Reuse**: Chat interface could be embedded elsewhere

### Developer Experience
- **Cleaner Code**: App.tsx becomes self-documenting layout
- **Easier Debugging**: Issues isolated to specific containers
- **Better IDE Support**: Smaller files with focused concerns

## Risk Mitigation

### Testing Strategy
- **After each phase**: Run full build and manual testing
- **Hook extraction**: Test all event stream functionality thoroughly
- **Component extraction**: Verify all props and state flow correctly

### Rollback Plan
- **Git commits after each phase**: Easy rollback points
- **Incremental changes**: Small, reversible modifications
- **Functionality preservation**: No feature changes, only restructuring

## Success Criteria

1. **App.tsx reduced to ~15 lines** of pure layout code
2. **All existing functionality preserved** with no regressions
3. **Clean component hierarchy** with clear responsibilities
4. **Testable business logic** extracted to custom hooks
5. **Build and TypeScript checks pass** after each phase
6. **Foundation prepared** for future features (status display, navigation)

## Timeline

- **Phase 1**: 30 minutes (AppHeader extraction)
- **Phase 2**: 45 minutes (SettingsPanel completion)
- **Phase 3**: 2 hours (Custom hooks extraction)
- **Phase 4**: 1 hour (ChatInterface container)
- **Phase 5**: 20 minutes (AppFooter foundation)

**Total Estimated Time**: 4.5 hours across multiple sessions