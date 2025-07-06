# Product Requirements Document: opencode-ui

## Overview

**Product Name**: opencode-ui  
**Version**: MVP 1.0  
**Date**: July 2025  
**Team**: opencode Development Team

## Executive Summary

opencode-ui is a web-based user interface that provides a chat-like interface to interact with the opencode API. The MVP will replicate the core functionality of the existing Terminal User Interface (TUI) in a modern, accessible web application.

## Problem Statement

Users need a web-based alternative to the command-line opencode TUI that provides:
- Easy access without terminal knowledge
- Better accessibility and user experience
- Cross-platform compatibility
- Shareable sessions via web links

## Target Audience

**Primary Users**:
- Developers who prefer GUI over CLI
- Teams collaborating on code projects
- Users on restricted environments where CLI access is limited

**Secondary Users**:
- Non-technical stakeholders reviewing AI-assisted code changes
- Educational users learning to code with AI assistance

## Product Goals

### Primary Goals
1. Provide feature parity with opencode TUI for core chat functionality
2. Enable seamless session management and sharing
3. Deliver real-time AI conversation experience
4. Support multiple AI providers and models

### Secondary Goals
1. Improve accessibility over CLI interface
2. Enable better collaboration through web sharing
3. Provide foundation for future advanced features

## MVP Feature Requirements

### Core Features

#### 1. Single Session Chat
- **Auto-create session** on app initialization via POST /session
- **Send messages** via POST /session/{id}/message
- **Stream responses** via GET /event for real-time updates
- **Support for basic message types**:
  - Text parts (user input and AI responses)
  - Tool invocations with results (display only)

#### 2. Provider & Model Selection
- **Provider listing** via GET /config/providers
- **Simple model dropdown** for session
- **Use default provider/model** if none selected

#### 3. Real-time Updates
- **EventSource/SSE connection** for live message streaming
- **Message part updates** as AI responds
- **Basic typing indicators** during AI response

### User Interface Requirements

#### Layout
- **Single-pane chat interface** - full width
- **Simple, clean design** focused on conversation
- **Mobile-friendly responsive** layout

#### Chat Interface
- **Message bubbles** with user/assistant distinction
- **Basic tool execution display** (collapsed by default)
- **Typing indicators** during AI response
- **Auto-scroll** to latest message
- **Message input** with send button

### Technical Requirements

#### Frontend
- **React 19** with TypeScript
- **Real-time communication** via EventSource or WebSocket
- **State management** for sessions and messages
- **Responsive CSS** framework
- **Error handling** for API failures

#### API Integration
- **Full OpenAPI spec compliance**
- **Event streaming** implementation
- **File upload/download** support
- **Authentication** (if required)

#### Performance
- **Message virtualization** for large conversations
- **Lazy loading** of session history
- **Optimistic UI updates**
- **Offline state handling**

## User Stories

### Core Chat Experience
- As a user, I want to send a message and see the AI response stream in real-time
- As a user, I want to see when AI is using tools so I understand what's happening
- As a user, I want a simple, focused chat interface without distractions

### Configuration
- As a user, I want to select an AI model from a dropdown
- As a user, I want the app to work with sensible defaults if I don't configure anything

## Success Metrics

### MVP Success Criteria
- **Functional parity** with TUI core features
- **Sub-2 second** message response time
- **99% uptime** for web interface
- **Cross-browser compatibility** (Chrome, Firefox, Safari, Edge)

### User Experience Metrics
- **Session completion rate** > 80%
- **Average session duration** > 5 minutes
- **User retention** after first session > 60%

## Technical Constraints

### API Limitations
- Must work within existing opencode API structure
- Real-time updates dependent on event streaming
- File operations limited to API capabilities

### Browser Support
- Modern browsers with ES2022 support
- WebSocket/EventSource support required
- Local storage for session persistence

## Future Considerations

### Post-MVP Features
- **Session management** (create, list, switch, delete)
- **Session sharing** and collaboration
- **File operations** and search
- **Advanced tool displays** with file previews
- **Reasoning display** for supported models
- **Session persistence** and history

### Scalability
- **Multi-user support** with authentication
- **Team workspaces** and permissions
- **Session templates** and automation
- **Integration** with IDEs and other tools

## Dependencies

### External Dependencies
- opencode API server running and accessible
- AI provider API keys configured
- Modern web browser with JavaScript enabled

### Internal Dependencies
- React 19 and TypeScript setup
- Build and deployment pipeline
- Error monitoring and logging

## Timeline

### Phase 1: Core Chat (Week 1)
- Project setup and API client
- Auto-session creation
- Basic message send/receive

### Phase 2: Real-time Streaming (Week 2)
- Event streaming implementation
- Message part updates
- Tool execution display

### Phase 3: Polish (Week 3)
- UI improvements and responsive design
- Error handling
- Model selection dropdown

## Risks & Mitigation

### Technical Risks
- **Event streaming complexity**: Start with polling fallback
- **Large message handling**: Implement virtualization early
- **API rate limits**: Add proper error handling and retry logic

### User Experience Risks
- **Learning curve**: Provide onboarding and help documentation
- **Performance on large sessions**: Implement pagination and lazy loading
- **Browser compatibility**: Test early and often across browsers

## Conclusion

The opencode-ui MVP will provide a solid foundation for web-based AI-assisted coding, replicating the core TUI functionality while laying groundwork for future enhancements. Success will be measured by functional parity, performance, and user adoption.