# opencode-web

A web-based user interface for [opencode](https://github.com/sst/opencode), providing a modern chat interface to interact with AI coding agents.

## Features

- **Real-time chat interface** with AI coding agents
- **Live streaming responses** via Server-Sent Events
- **Tool execution display** with enhanced diff viewing for code changes
- **Model selection** from multiple AI providers
- **Responsive design** for desktop and mobile
- **Auto-session creation** for immediate use

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- Running [opencode](https://github.com/sst/opencode) API server

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/opencode-ui.git
cd opencode-ui

# Install dependencies
bun install

# Start opencode server
cd /path/to/your-project
opencode serve

# Start development server
bun dev
```

The application will be available at `http://localhost:5173`

### Configuration

The app will auto-detect your opencode API server. If running on a different host/port, configure the API endpoint in your environment.

## Development

### Available Scripts

- `bun dev` - Start development server with hot reload
- `bun run build` - Build for production
- `bun run lint` - Run ESLint
- `bun run preview` - Preview production build

### Tech Stack

- **React 19** with TypeScript
- **Vite** for build tooling
- **EventSource** for real-time streaming
- **CSS Modules** for styling

### Project Structure

```
src/
├── components/
│   ├── Chat/           # Chat interface components
│   └── Debug/          # Development debugging tools
├── hooks/              # Custom React hooks
├── services/           # API integration
└── utils/              # Helper functions
```

## Usage

1. **Start a conversation** - Type your coding request in the chat input
2. **Watch AI work** - See real-time tool execution and code changes
3. **Review results** - Enhanced diff viewer shows exactly what changed
4. **Continue iterating** - Build on previous responses naturally

## License

This project is dual-licensed:

### Open Source License
AGPL-3.0 for personal, educational, and open source projects.

### Commercial License
Required for commercial use, proprietary software, or if you cannot comply with AGPL-3.0 terms.

Contact [your-email] for commercial licensing.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Related Projects

- [opencode](https://github.com/sst/opencode) - The AI coding agent backend
- [opencode TUI](https://github.com/sst/opencode) - Terminal interface

## Support

- [Documentation](./PRD.md) - Product requirements and features
- [Technical Specification](./TECH_SPEC.md) - Architecture details
- [Issues](https://github.com/your-username/opencode-ui/issues) - Bug reports and feature requests

## Additional Links

- [opencode](https://github.com/sst/opencode) - The main opencode CLI and API server
- [opencode.ai](https://opencode.ai) - Official website and documentation
