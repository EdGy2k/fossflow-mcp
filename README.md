# FossFLOW MCP

AI-powered diagramming with [FossFLOW](https://github.com/stan-smith/FossFLOW) via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io).

## What This Enables

```
┌─────────────────┐     MCP Protocol     ┌──────────────────┐
│ Claude/Cursor   │──────────────────────│   MCP Server     │
│  /AI Agent      │    (stdio)           │  (this repo)     │
└─────────────────┘                       └────────┬─────────┘
                                                   │
                                                   │ WebSocket
                                                   ▼
                                          ┌──────────────────┐
                                          │ WebSocket Bridge │
                                          │  (FossFLOW fork) │
                                          └────────┬─────────┘
                                                   │
                                                   │ WebSocket
                                                   ▼
                                          ┌──────────────────┐
                                          │    FossFLOW      │
                                          │  (React App)     │
                                          └──────────────────┘
```

**With this setup, you can say:**
> "Design a 3-tier web architecture with a load balancer, two app servers, and a PostgreSQL database"

And Claude will create the diagram for you in real-time.

## Quick Start

### 1. Clone and Start FossFLOW (MCP-enabled fork)

```bash
git clone https://github.com/EdGy2k/fossflow-mcp-fork.git
cd fossflow-mcp-fork
npm install

# Terminal 1: Start WebSocket bridge
node packages/fossflow-backend/websocketServer.js

# Terminal 2: Start FossFLOW
npm run dev
```

FossFLOW opens at `http://localhost:3000` with WebSocket bridge at `ws://localhost:3333`.

### 2. Configure Your AI Client

#### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%/Claude/claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "fossflow": {
      "command": "npx",
      "args": ["-y", "fossflow-mcp"]
    }
  }
}
```

#### Cursor

Add to Cursor Settings > MCP:
- Name: `fossflow`
- Command: `npx -y fossflow-mcp`

### 3. Start Diagramming with AI

Open Claude/Cursor and ask:
- "Create a cloud architecture diagram with AWS services"
- "Add a database node connected to the API server"
- "Export this diagram as JSON"

## Available Tools

| Tool | Description |
|------|-------------|
| `add_node` | Add a node with semantic icon matching (e.g., "aws lambda", "database") |
| `connect_nodes` | Draw arrows between nodes |
| `move_node` | Reposition nodes on the grid |
| `delete_element` | Remove nodes or connectors |
| `undo` / `redo` | History operations |
| `list_nodes` | Get all nodes with positions |
| `search_icons` | Find available icons |
| `export_diagram` | Save as JSON |

## Semantic Icon Matching

The `add_node` tool uses fuzzy search:

```
"AWS Lambda" → matches aws-lambda icon
"PostgreSQL" → matches postgresql icon
"load balancer" → matches load-balancer icon
```

Available icon packs: `isoflow`, `aws`, `gcp`, `azure`, `kubernetes`

## Repository Structure

```
fossflow-mcp/
├── src/
│   ├── index.ts           # MCP server entry
│   ├── fossflowClient.ts  # WebSocket client
│   ├── iconMatcher.ts     # Fuzzy icon search
│   └── types.ts           # Type definitions
├── dist/                  # Compiled JavaScript
├── package.json
└── README.md
```

## Development

```bash
npm install
npm run build
npm start
```

## Integration Details

This MCP server connects to FossFLOW via a WebSocket bridge. The fork adds:

- **WebSocket Server** (`websocketServer.js`) - Bridges MCP to FossFLOW
- **McpBridge Component** - Handles operations inside FossFLOW React app
- **WebSocket Service** - Client connection from browser to bridge

**Original FossFLOW changes (minimal):**
- `Isoflow.tsx`: Adds `<McpBridge />` component
- `App.tsx`: Adds `useWebSocketIntegration()` hook
- `package.json`: Adds `ws` dependency

## License

MIT
