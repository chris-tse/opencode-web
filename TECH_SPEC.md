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
│   │   └── TypingIndicator.tsx    # Loading state
│   ├── ToolExecution/
│   │   ├── ToolCall.tsx           # Tool invocation display
│   │   └── ToolResult.tsx         # Tool result display
│   └── ModelSelector.tsx          # Provider/model dropdown
├── hooks/
│   ├── useSession.ts              # Session management
│   ├── useMessages.ts             # Message state
│   ├── useEventStream.ts          # SSE connection
│   └── useProviders.ts            # Provider/model data
├── services/
│   ├── api.ts                     # API client
│   ├── eventStream.ts             # EventSource wrapper
│   └── types.ts                   # TypeScript definitions
└── utils/
    ├── messageParser.ts           # Parse message parts
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

#### Get Providers and Models
```typescript
GET /config/providers

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
  parts: MessagePart[]; // Message content
}

interface MessagePart {
  type: 'text' | 'file' | 'source-url';
  text?: string;        // For text parts
  mediaType?: string;   // For file parts
  filename?: string;    // For file parts
  url?: string;         // For file/source-url parts
}

// Response: 200 OK
{
  id: string;           // Message ID
  role: 'user' | 'assistant';
  parts: MessagePart[];
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
```

### Message Part Types

#### Text Part
```typescript
{
  type: 'text';
  text: string;
}
```

#### Tool Invocation Part
```typescript
{
  type: 'tool-invocation';
  toolInvocation: {
    state: 'call' | 'partial-call' | 'result';
    step?: number;
    toolCallId: string;
    toolName: string;
    args: Record<string, any>;
    result?: string;    // Only present when state === 'result'
  };
}
```

#### Reasoning Part
```typescript
{
  type: 'reasoning';
  text: string;
  providerMetadata?: Record<string, any>;
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
const session = await api.createSession()

// 2. Send message
const message = await api.sendMessage(session.id, {
  providerID: 'anthropic',
  modelID: 'claude-3-5-sonnet-20241022',
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
  type: 'text' | 'tool-invocation' | 'reasoning' | 'file' | 'source-url'
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

### ToolCall Component
```typescript
interface ToolCallProps {
  toolInvocation: ToolInvocation
  expanded?: boolean
}

// Responsibilities:
// - Display tool name and arguments
// - Show execution state (call/partial/result)
// - Collapsible tool details
// - Format tool results
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

## Future Considerations

### Scalability Preparation
- **State management** - Easy migration to Redux/Zustand
- **Component library** - Reusable UI components
- **API abstraction** - Swappable backend services
- **Plugin architecture** - Extensible tool system

### Performance Monitoring
- **Bundle analysis** - Track size growth
- **Runtime metrics** - Message rendering performance
- **Error tracking** - Production error monitoring
- **User analytics** - Usage patterns and bottlenecks

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