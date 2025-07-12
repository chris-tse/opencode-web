# Technical Specification: opencode-ui MVP

## Overview

This document outlines the technical implementation details for the opencode-ui MVP - a single-session chat interface that communicates with the opencode API.

## Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React SPA     │    │  opencode API   │    │   AI Provider   │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Chat UI     │ │◄──►│ │ HTTP/REST   │ │◄──►│ │ Claude/GPT  │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │                 │
│ │ EventSource │ │◄──►│ │ SSE Stream  │ │    │                 │
│ └─────────────┘ │    │ └─────────────┘ │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Structure
```
src/
├── components/
│   ├── Chat/
│   │   ├── ChatContainer.tsx      # Main chat layout
│   │   ├── MessageList.tsx        # Message display
│   │   ├── MessageBubble.tsx      # Individual message
│   │   ├── MessageInput.tsx       # Input field + send
│   │   ├── StreamingIndicator.tsx # Real-time status display
│   │   └── TypingIndicator.tsx    # Loading state
│   ├── ToolExecution/
│   │   ├── ToolResultDisplay.tsx  # Central tool result dispatcher
│   │   ├── DiffViewer.tsx         # Unified diff display (MVP)
│   │   ├── CollapsibleToolResult.tsx # Wrapper for tool results
│   │   └── ToolExecutionStatus.tsx # Tool progress indicators
│   ├── Debug/
│   │   └── EventStreamDebug.tsx   # Development debugging panel
│   └── ModelSelector.tsx          # Provider/model dropdown
├── hooks/
│   ├── useSession.ts              # Session management
│   ├── useMessages.ts             # Message state
│   ├── useEventStream.ts          # SSE connection
│   ├── useStreamingState.ts       # Streaming status management
│   └── useProviders.ts            # Provider/model data
├── services/
│   ├── api.ts                     # API client
│   ├── eventStream.ts             # EventSource wrapper
│   └── types.ts                   # TypeScript definitions
└── utils/
    ├── messageParser.ts           # Parse message parts
    ├── streamingHelpers.ts        # Streaming detection utilities
    ├── toolStatusHelpers.ts       # Tool status display helpers
    └── constants.ts               # API endpoints, etc.
```

## Core Technologies

### Frontend Stack
- **React 19** - Latest React with concurrent features
- **TypeScript 5.8** - Strict type checking
- **Vite 7** - Fast build tool and dev server
- **CSS Modules** or **Styled Components** - Component styling
- **EventSource API** - Server-sent events for streaming

### State Management
- **React useState/useReducer** - Local component state
- **Custom hooks** - Shared state logic
- **No external state library** - Keep it simple for MVP

### HTTP Client
- **Fetch API** - Native browser HTTP client
- **Custom wrapper** - Type-safe API calls
- **Error handling** - Retry logic and user feedback

## API Specification

### Core Endpoints

#### Get Session Messages
```typescript
GET /session/{id}/message

// Path Parameters
id: string;             // Session ID

// Response: 200 OK
Message[]               // Array of messages in the session
```

#### Initialize Session
```typescript
POST /session/{id}/init

// Path Parameters
id: string;             // Session ID

// Response: 200 OK
// Session initialization response
```

#### Create Session
```typescript
POST /session
Content-Type: application/json

// Request Body: None

// Response: 200 OK
{
  id: string;           // Session ID (starts with "ses")
  title: string;        // Session title
  version: string;      // API version
  time: {
    created: number;    // Unix timestamp
    updated: number;    // Unix timestamp
  };
}
```

#### Get App Info
```typescript
GET /app

// Response: 200 OK
{
  // App information schema
}
```

#### Initialize App
```typescript
POST /app/init

// Response: 200 OK
boolean  // Initialization success status
```

#### Get Config (Providers and Models)
```typescript
GET /config

// Response: 200 OK
{
  providers: Provider[];
  default: Record<string, string>;  // Default provider/model mapping
}

interface Provider {
  id: string;           // Provider ID (e.g., "anthropic")
  name: string;         // Display name
  env: string[];        // Required environment variables
  models: Record<string, Model>;
}

interface Model {
  id: string;           // Model ID
  name: string;         // Display name
  release_date: string; // ISO date string
  attachment: boolean;  // Supports file attachments
  reasoning: boolean;   // Supports reasoning
  temperature: boolean; // Supports temperature control
  tool_call: boolean;   // Supports tool calling
  cost: {
    input: number;      // Cost per input token
    output: number;     // Cost per output token
    cache_read?: number;
    cache_write?: number;
  };
  limit: {
    context: number;    // Max context tokens
    output: number;     // Max output tokens
  };
}
```

#### Send Message
```typescript
POST /session/{id}/message
Content-Type: application/json

// Path Parameters
id: string;             // Session ID

// Request Body
{
  providerID: string;   // Provider ID (e.g., "anthropic")
  modelID: string;      // Model ID (e.g., "claude-3-5-sonnet-20241022")
  mode: string;         // Interaction mode (e.g., "build", "plan", or custom mode)
  parts: MessagePart[]; // Message content
}

interface UserMessagePart {
  type: 'text' | 'file';
  text?: string;        // For text parts
  mediaType?: string;   // For file parts
  filename?: string;    // For file parts
  url?: string;         // For file parts
}

interface AssistantMessagePart {
  type: 'text' | 'tool' | 'step-start' | 'step-finish';
  // Type-specific properties based on part type
}

// Response: 200 OK
// Returns AssistantMessage schema
{
  id: string;           // Message ID
  role: 'assistant';
  parts: AssistantMessagePart[];
  metadata: MessageMetadata;
}

interface MessageMetadata {
  time: {
    created: number;    // Unix timestamp
    completed?: number; // Unix timestamp (when response complete)
  };
  sessionID: string;
  tool: Record<string, ToolMetadata>;
  assistant?: {
    system: string[];   // System prompts
    modelID: string;
    providerID: string;
    path: {
      cwd: string;      // Current working directory
      root: string;     // Project root
    };
    cost: number;       // Total cost
    tokens: {
      input: number;
      output: number;
      reasoning: number;
      cache: {
        read: number;
        write: number;
      };
    };
  };
}

interface ToolMetadata {
  preview?: string;     // File content preview (for read operations)
  diff?: string;        // Unified diff format (for edit operations)
  diagnostics?: Record<string, any>; // Error/warning information
  title?: string;       // File name or operation title
  time?: {
    start: number;      // Tool execution start time
    end: number;        // Tool execution end time
  };
}
```

#### Event Stream (Server-Sent Events)
```typescript
GET /event
Accept: text/event-stream

// Response: 200 OK (streaming)
// Content-Type: text/event-stream

// Event Types:
data: {
  type: 'message.updated';
  properties: {
    info: Message;      // Complete message object
  };
}

data: {
  type: 'message.part.updated';
  properties: {
    part: MessagePart;  // Updated message part
    sessionID: string;
    messageID: string;
  };
}

data: {
  type: 'message.removed';
  properties: {
    sessionID: string;
    messageID: string;
  };
}

data: {
  type: 'session.updated';
  properties: {
    session: Session;   // Updated session object
  };
}

data: {
  type: 'session.deleted';
  properties: {
    sessionID: string;
  };
}

data: {
  type: 'session.error';
  properties: {
    error: {
      name: 'ProviderAuthError' | 'UnknownError' | 'MessageOutputLengthError';
      data: {
        message: string;
        providerID?: string;
      };
    };
  };
}

data: {
  type: 'session.idle';
  properties: {
    sessionID: string;
  };
}

data: {
  type: 'file.edited';
  properties: {
    path: string;
    content?: string;
  };
}

data: {
  type: 'file.watcher.updated';
  properties: {
    path: string;
    event: string;
  };
}

data: {
  type: 'storage.write';
  properties: {
    key: string;
    value: any;
  };
}

data: {
  type: 'permission.updated';
  properties: {
    permission: string;
    granted: boolean;
  };
}

data: {
  type: 'installation.updated';
  properties: {
    package: string;
    status: string;
  };
}

data: {
  type: 'lsp.client.diagnostics';
  properties: {
    uri: string;
    diagnostics: any[];
  };
}
```

### Message Part Types

#### Text Part
```typescript
{
  type: 'text';
  text: string;
}
```

#### Tool Part (Updated)
```typescript
{
  type: 'tool';
  id: string;           // Tool execution ID
  tool: string;         // Tool name (e.g., "read", "edit", "bash")
  state: ToolState;     // Tool execution state
}

interface ToolState {
  status: 'pending' | 'running' | 'completed' | 'error';
  input: Record<string, any>;     // Tool input arguments
  output?: string;                // Tool output (when completed)
  title?: string;                 // Display title
  metadata?: Record<string, any>; // Additional metadata
  time?: {
    start: number;                // Start timestamp
    end: number;                  // End timestamp
  };
}
```

#### Step Start Part
```typescript
{
  type: 'step-start';
}
```

#### Step Finish Part
```typescript
{
  type: 'step-finish';
}
```

#### File Part
```typescript
{
  type: 'file';
  mediaType: string;  // MIME type
  filename: string;
  url: string;        // File URL or data URL
}
```

### API Integration

#### Session Lifecycle
```typescript
// 1. App initialization
await api.initializeApp()
const session = await api.createSession()
await api.initializeSession(session.id)

// 2. Send message
const message = await api.sendMessage(session.id, {
  providerID: 'anthropic',
  modelID: 'claude-3-5-sonnet-20241022',
  mode: 'build',  // Available modes: "build", "plan", or custom modes
  parts: [{ type: 'text', text: userInput }]
})

// 3. Stream response
const eventSource = new EventSource(`/event`)
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // Handle message updates
}
```

### Error Handling
```typescript
// HTTP Error Responses
interface ApiError {
  data: Record<string, any>;
}

// 400 Bad Request - Invalid request data
// 500 Internal Server Error - Server error

// Event Stream Errors
interface ProviderAuthError {
  name: 'ProviderAuthError';
  data: {
    providerID: string;
    message: string;
  };
}

interface UnknownError {
  name: 'UnknownError';
  data: {
    message: string;
  };
}
```

## Data Models

### Core Types
```typescript
interface Session {
  id: string
  title: string
  version: string
  time: {
    created: number
    updated: number
  }
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  parts: MessagePart[]
  metadata: MessageMetadata
}

interface MessagePart {
  type: 'text' | 'tool-invocation' | 'reasoning' | 'file' | 'source-url' | 'step-start'
  // ... type-specific properties
}

interface Provider {
  id: string
  name: string
  models: Record<string, Model>
}

interface Model {
  id: string
  name: string
  attachment: boolean
  reasoning: boolean
  tool_call: boolean
  cost: {
    input: number
    output: number
  }
}
```

## Component Specifications

### ChatContainer
```typescript
interface ChatContainerProps {
  sessionId: string
}

// Responsibilities:
// - Manage overall chat layout
// - Coordinate message flow
// - Handle session state
```

### MessageList
```typescript
interface MessageListProps {
  messages: Message[]
  isLoading: boolean
}

// Responsibilities:
// - Render message history
// - Auto-scroll to bottom
// - Handle message updates
// - Show typing indicator
```

### MessageInput
```typescript
interface MessageInputProps {
  onSendMessage: (text: string) => void
  disabled: boolean
  placeholder?: string
}

// Responsibilities:
// - Text input with send button
// - Handle Enter key submission
// - Disable during AI response
// - Basic input validation
```

### ToolResultDisplay Component
```typescript
interface ToolResultDisplayProps {
  toolInvocation: ToolInvocation
  metadata: ToolMetadata
}

// Responsibilities:
// - Central dispatcher for all tool result rendering
// - Route to appropriate display component based on tool type
// - Provide fallback for unknown tools
// - Handle tool execution states

// MVP Implementation:
const ToolResultDisplay = ({ toolInvocation, metadata }) => {
  // Enhanced display for edit tool only
  if (toolInvocation.toolName === 'edit' && metadata.diff) {
    return <DiffViewer diff={metadata.diff} filename={metadata.title} />
  }
  
  // All other tools: simple codeblock
  return (
    <pre className="tool-output">
      <code>{toolInvocation.result}</code>
    </pre>
  )
}
```

### DiffViewer Component (MVP Priority)
```typescript
interface DiffViewerProps {
  diff: string              // Unified diff format
  filename?: string         // File being modified
  language?: string         // Syntax highlighting language
}

// Responsibilities:
// - Parse unified diff format (@@ headers, +/- lines)
// - Display side-by-side or unified diff view
// - Syntax highlighting for code changes
// - Line number display
// - Collapsible by default per PRD requirements
```

### CollapsibleToolResult Component
```typescript
interface CollapsibleToolResultProps {
  toolName: string
  state: 'call' | 'partial-call' | 'result'
  duration?: number
  expanded?: boolean        // Default false per PRD
  children: React.ReactNode
}

// Responsibilities:
// - Consistent wrapper for all tool results
// - Show/hide tool execution details
// - Display tool execution timing
// - Tool status indicators (running/completed/error)
```

## Real-time Communication

### EventSource Implementation
```typescript
class EventStreamService {
  private eventSource: EventSource | null = null
  private listeners: Map<string, Function[]> = new Map()

  connect(url: string) {
    this.eventSource = new EventSource(url)
    this.eventSource.onmessage = this.handleMessage
    this.eventSource.onerror = this.handleError
  }

  subscribe(eventType: string, callback: Function) {
    // Add event listener
  }

  disconnect() {
    this.eventSource?.close()
  }
}
```

### Message Streaming Flow
1. User sends message → optimistic UI update
2. API call to POST /session/{id}/message
3. EventSource receives message.updated events
4. UI updates with streaming message parts
5. Final message.updated event marks completion

### Message Part Flow Pattern
Based on observed API responses, messages typically follow this pattern:
```
step-start → action (text/tool-invocation) → step-start → action → ...
```

**Simple Text Response:**
```
step-start → text
```

**Multi-step Tool Response:**
```
step-start → tool-invocation (read) → step-start → tool-invocation (edit) → step-start → text
```

### Tool Execution Display
Tool invocations include rich metadata for UI display:

**Unified Diff Format** (from edit operations):
```diff
Index: /path/to/file.md
===================================================================
--- /path/to/file.md
+++ /path/to/file.md
@@ -76,4 +76,6 @@
 
 **Join our community** [YouTube](https://example.com) | [X.com](https://x.com)
+
+edited by opencode
```

**File Content with Line Numbers** (from read operations):
```
00001| <p align="center">
00002|   <a href="https://opencode.ai">
00076| **Join our community** [YouTube](https://example.com)
```

**Parsing Opportunities:**
- Extract line numbers from `@@` headers in diffs
- Parse `+`/`-` prefixes for added/removed lines
- Use line numbers from read operations for navigation
- Display side-by-side diffs with syntax highlighting

## Error Handling

### Error Types
- **Network errors** - Connection failures, timeouts
- **API errors** - 4xx/5xx responses, validation errors
- **Stream errors** - EventSource disconnection
- **Provider errors** - AI model failures, auth issues

### Error Recovery
```typescript
interface ErrorBoundary {
  // Network retry with exponential backoff
  retryRequest(request: ApiRequest, maxRetries: number): Promise<Response>
  
  // Stream reconnection
  reconnectEventSource(): void
  
  // User-friendly error messages
  displayError(error: AppError): void
}
```

## Performance Considerations

### Optimization Strategies
- **Message virtualization** - Only render visible messages
- **Debounced input** - Prevent excessive API calls
- **Memoized components** - Reduce unnecessary re-renders
- **Lazy loading** - Code splitting for tool components

### Bundle Size
- **Target**: < 500KB gzipped
- **Tree shaking** - Remove unused code
- **Dynamic imports** - Split large components
- **Minimal dependencies** - Avoid heavy libraries

## Security

### API Security
- **CORS configuration** - Proper origin validation
- **Input sanitization** - Prevent XSS attacks
- **Rate limiting** - Client-side request throttling

### Data Handling
- **No sensitive data storage** - Session data only
- **Secure communication** - HTTPS only
- **Error message sanitization** - No sensitive info in errors

## Development Workflow

### Local Development
```bash
# Start development server
npm run dev

# Run type checking
npm run build

# Run linting
npm run lint
```

### Environment Configuration
```typescript
interface Config {
  API_BASE_URL: string
  DEFAULT_PROVIDER: string
  DEFAULT_MODEL: string
  EVENT_STREAM_URL: string
}
```

### Testing Strategy
- **Unit tests** - Component logic and utilities
- **Integration tests** - API client and event handling
- **E2E tests** - Full chat flow (future)
- **Manual testing** - Cross-browser compatibility

## Deployment

### Build Process
1. TypeScript compilation
2. Vite bundling and optimization
3. Static asset generation
4. Environment variable injection

### Hosting Requirements
- **Static hosting** - CDN or web server
- **HTTPS support** - Required for EventSource
- **Gzip compression** - Reduce bundle size
- **Cache headers** - Optimize loading

## Tool Result Display Architecture

### MVP Tool Rendering Strategy

**Enhanced Components (High Value)**
```typescript
// edit tool - Unified diff display
interface DiffViewerProps {
  diff: string              // Unified diff format from metadata.diff
  filename?: string         // From metadata.title
  language?: string         // Auto-detect from filename extension
}
```

**Simple Codeblock Fallback (MVP)**
```typescript
// All other tools: read, bash, list, glob, grep, webfetch, todo
<pre className="tool-output">
  <code>{toolInvocation.result}</code>
</pre>
```

### Post-MVP Enhanced Components

**File Operations**
```typescript
// read tool - Syntax highlighted file preview
interface FilePreviewProps {
  content: string           // From metadata.preview
  filename: string          // From metadata.title
  language?: string         // Auto-detect from extension
  highlightLines?: number[] // Context-specific highlighting
  maxLines?: number         // Truncation for large files
}
```

**Command Execution**
```typescript
// bash tool - Rich command output
interface CommandOutputProps {
  command: string           // From toolInvocation.args.command
  output: string            // From toolInvocation.result
  exitCode?: number         // From metadata.exitCode
  duration: number          // From metadata.time
}
```

**File System Operations**
```typescript
// list/glob tools - Interactive directory tree
interface DirectoryTreeProps {
  path: string              // From toolInvocation.args.path
  items: DirectoryItem[]    // Parsed from toolInvocation.result
  expandable: boolean       // Interactive expansion
}

// grep tool - Clickable search results
interface SearchResultsProps {
  pattern: string           // From toolInvocation.args.pattern
  matches: SearchMatch[]    // Parsed from toolInvocation.result
  totalFiles: number        // From metadata
}
```

**Web and Task Operations**
```typescript
// webfetch tool - Formatted web content
interface WebContentPreviewProps {
  url: string               // From toolInvocation.args.url
  content: string           // From toolInvocation.result
  format: 'markdown' | 'html' | 'text' // From toolInvocation.args.format
}

// todo tools - Interactive task management
interface TodoListProps {
  todos: TodoItem[]         // Parsed from toolInvocation.result
  changes?: TodoChange[]    // From metadata.changes
}
```

### Streaming Status Enhancement

**Real-time Tool Progress**
```typescript
// Status message progression
"Waiting for response..."                    // Initial wait only
"Reading file..."                           // Specific tool execution
"✓ Reading file completed"                  // Brief completion feedback
"Editing file..."                           // Next tool
"✓ Completed 3 tools - Generating response..." // Overall progress
```

**Status Helper Functions**
```typescript
// Tool display name mapping
getToolDisplayName(toolName: string): string
// "read" → "Reading file", "bash" → "Running command"

// Status message generation
getToolStatusMessage(toolName: string, state: string): string
// Combines tool name with execution state

// Overall progress tracking
getOverallToolStatus(toolParts: MessagePart[]): string
// Analyzes all tools in message for comprehensive status
```

## Future Considerations

### Scalability Preparation
- **State management** - Easy migration to Redux/Zustand
- **Component library** - Reusable UI components
- **API abstraction** - Swappable backend services
- **Plugin architecture** - Extensible tool system
- **Tool result caching** - Avoid re-parsing large outputs

### Performance Monitoring
- **Bundle analysis** - Track size growth
- **Runtime metrics** - Message rendering performance
- **Error tracking** - Production error monitoring
- **User analytics** - Usage patterns and bottlenecks
- **Tool execution metrics** - Track tool usage and performance

## Implementation Phases

### Phase 1: Core Chat (Week 1)
- Basic React setup with TypeScript
- Simple message send/receive
- Auto-session creation
- Basic UI layout

### Phase 2: Real-time Streaming (Week 2)
- EventSource integration
- Message part streaming
- Tool execution display
- Error handling

### Phase 3: Polish (Week 3)
- Model selection dropdown
- UI improvements and responsive design
- Performance optimization
- Cross-browser testing