# Agent Guidelines for opencode-ui

## Project Documentation
- **PRD.md** - Product Requirements Document with MVP scope and features
- **TECH_SPEC.md** - Technical specification with architecture and implementation details
- **spec.json** - OpenAPI specification for the opencode API
- **IMPORTANT**: Always reference these documents before making architectural decisions

## Build/Test Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production (runs TypeScript check + Vite build)
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build
- No test framework configured yet

## MVP Scope (from PRD.md)
- **Single session chat interface** - No session switching/management
- **Auto-create session** on app initialization
- **Real-time message streaming** via EventSource/SSE
- **Basic tool execution display** (collapsed by default)
- **Simple model selection** dropdown

## Architecture (from TECH_SPEC.md)
- **React 19 + TypeScript** with Vite
- **Component structure**: Chat/, ToolExecution/, hooks/, services/
- **State management**: Custom hooks, no external libraries
- **API integration**: Fetch API with EventSource for streaming
- **Key endpoints**: POST /session, POST /session/{id}/message, GET /event

## Code Style
- **Language**: TypeScript with strict mode enabled
- **Framework**: React 19 with Vite
- **Imports**: Use named imports, import React hooks from 'react'
- **File extensions**: .tsx for React components, .ts for utilities
- **Formatting**: 2-space indentation, single quotes for strings
- **Types**: Strict TypeScript, no unused locals/parameters
- **Components**: Function components with PascalCase naming
- **Exports**: Default exports for components, named for utilities
- **JSX**: Use react-jsx transform (no React import needed)
- **Assets**: Import assets directly (e.g., `import logo from './logo.svg'`)

## ESLint Config
- Uses typescript-eslint, react-hooks, and react-refresh plugins
- Targets ES2022 with browser globals
- Enforces React hooks rules and refresh patterns