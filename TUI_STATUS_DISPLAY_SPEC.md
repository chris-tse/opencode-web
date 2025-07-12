# TUI Status Display Specification

This document specifies how status text should be displayed in the opencode TUI based on message states and tool execution phases.

## Tool State Lifecycle

Tools progress through the following states:

1. **pending** - Tool call has been initiated but not yet started
2. **running** - Tool is actively executing
3. **completed** - Tool finished successfully
4. **error** - Tool failed with an error

## Status Messages by Tool State

### Pending State (`status: "pending"`)

When a tool is in pending state, display the action message using `renderToolAction()`:

| Tool Name   | Status Message             |
| ----------- | -------------------------- |
| `task`      | "Searching..."             |
| `bash`      | "Writing command..."       |
| `edit`      | "Preparing edit..."        |
| `webfetch`  | "Fetching from the web..." |
| `glob`      | "Finding files..."         |
| `grep`      | "Searching content..."     |
| `list`      | "Listing directory..."     |
| `read`      | "Reading file..."          |
| `write`     | "Preparing write..."       |
| `todowrite` | "Planning..."              |
| `todoread`  | "Planning..."              |
| `patch`     | "Preparing patch..."       |
| **Default** | "Working..."               |

### Running State (`status: "running"`)

Display the tool title with contextual information using `renderToolTitle()`:

| Tool Name   | Title Format                                  |
| ----------- | --------------------------------------------- |
| `read`      | "Read {filePath}"                             |
| `edit`      | "Edit {relativePath}"                         |
| `write`     | "Write {relativePath}"                        |
| `bash`      | "Bash {description}"                          |
| `task`      | "Task {description}"                          |
| `webfetch`  | "Fetch {url}"                                 |
| `todowrite` | Dynamic based on todo phase (see Todo Phases) |
| `todoread`  | "Plan"                                        |
| **Default** | "{ToolName} {args}"                           |

### Completed State (`status: "completed"`)

Display the tool result with appropriate formatting:

#### Special Tool Handling:

- **read**: Show file preview with syntax highlighting
- **edit**: Show diff of changes made
- **write**: Show "File written" confirmation
- **bash**: Show command output (truncated if long)
- **todowrite**: Show todo list summary
- **todoread**: Show current todo status
- **webfetch**: Show fetched content summary

#### Ignored Tools:

- `todoread` - Not displayed in completed state

### Error State (`status: "error"`)

Display error message with tool context:

- Format: "{ToolName}: {errorMessage}"
- Use error styling (red border/background)

## Tool Name Normalization

Tool names are normalized for display using `renderToolName()`:

| Internal Name | Display Name                                |
| ------------- | ------------------------------------------- |
| `webfetch`    | "Fetch"                                     |
| `opencode_*`  | Remove "opencode\_" prefix, then title case |
| **Default**   | Title case the tool name                    |

## Todo Tool Special Handling

### Todo Phases

The `todowrite` tool displays different phases based on todo status:

1. **"Plan"** - Default phase
2. **"Working on: {todo_content}"** - When a todo is in_progress
3. **"Completed: {completed_count}/{total_count}"** - When todos are completed

### Todo Title Logic

- If metadata contains todos array, analyze current phase
- Show active todo content if one is in_progress
- Show completion ratio if todos are completed
- Fall back to "Plan" if no specific phase detected

## MCP Tool Support

MCP (Model Context Protocol) tools follow the same state lifecycle but may have custom display names:

- Remove "mcp*" or "localmcp*" prefixes
- Apply title case normalization
- Use default status messages for pending/running states

## Event Triggers

Status updates are triggered by these events:

- `message.part.updated` - When tool state changes
- `tool-call` - When tool execution begins
- Tool state transitions: pending → running → completed/error

## Implementation Notes

### File Path Display

- Use relative paths when possible (`util.Relative()`)
- Truncate long paths to fit display width
- Show full path in tooltip/hover if truncated

### Content Truncation

- Limit output display to prevent UI overflow
- Show "..." indicator when content is truncated
- Provide way to view full content (expand/modal)

### Styling

- Use theme colors for different states
- Pending/Running: neutral colors
- Completed: success colors (green)
- Error: error colors (red)
- Apply appropriate borders and backgrounds

### Width Handling

- Respect terminal width constraints
- Truncate content to fit available space
- Use responsive layout for different screen sizes

## Examples

### Tool Execution Flow

```
1. User runs: opencode edit file.ts
2. TUI shows: "Preparing edit..." (pending)
3. TUI shows: "Edit file.ts" (running)
4. TUI shows: File diff with changes (completed)
```

### Error Handling

```
1. Tool fails during execution
2. TUI shows: "Edit: Permission denied" (error)
3. Error styling applied (red border)
```

### Todo Tool Flow

```
1. User creates todos
2. TUI shows: "Planning..." (pending)
3. TUI shows: "Plan" (running)
4. TUI shows: "Working on: Fix bug in auth" (completed, with active todo)
```

This specification ensures consistent status display across all tool types and states in the opencode TUI.
