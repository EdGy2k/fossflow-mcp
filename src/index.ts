#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { FossflowClient } from './fossflowClient.js';
import { matchIcon, getIconCatalog, findIconByExactId, initializeIconCatalog } from './iconMatcher.js';
import { DiagramData } from './types.js';

const server = new Server(
  {
    name: 'fossflow-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize FossFLOW client
let fossflowClient = new FossflowClient({
  host: process.env.FOSSFLOW_HOST || 'localhost',
  port: parseInt(process.env.FOSSFLOW_PORT || '3333', 10),
  onStateUpdate: (diagram: DiagramData) => {
    // Update icon catalog with all icons from the diagram state
    if (diagram.icons && diagram.icons.length > 0) {
      initializeIconCatalog(diagram.icons);
    }
  },
  onConnectionChange: (connected: boolean) => {
    console.error(`[MCP] FossFLOW connection: ${connected ? 'connected' : 'disconnected'}`);
  },
});

// Tool definitions
const TOOLS = [
  {
    name: 'connect_fossflow',
    description: 'Connect to a running FossFLOW instance. FossFLOW must be running with WebSocket server enabled.',
    inputSchema: {
      type: 'object',
      properties: {
        host: { type: 'string', description: 'FossFLOW WebSocket host (default: localhost)' },
        port: { type: 'number', description: 'FossFLOW WebSocket port (default: 3333)' },
      },
    },
  },
  {
    name: 'add_node',
    description: 'Add a node to the FossFLOW diagram. Use semantic icon matching - describe the icon you want (e.g., "aws lambda", "database", "server").',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name/label for the node' },
        icon: { type: 'string', description: 'Icon name or description (e.g., "aws lambda", "database", "server")' },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'Grid X position' },
            y: { type: 'number', description: 'Grid Y position' },
          },
          description: 'Optional position. If omitted, auto-places the node.',
        },
      },
      required: ['name', 'icon'],
    },
  },
  {
    name: 'connect_nodes',
    description: 'Connect two nodes with a connector arrow.',
    inputSchema: {
      type: 'object',
      properties: {
        fromNodeId: { type: 'string', description: 'ID of the source node' },
        toNodeId: { type: 'string', description: 'ID of the target node' },
        label: { type: 'string', description: 'Optional label for the connector' },
        style: { type: 'string', enum: ['SOLID', 'DOTTED', 'DASHED'], description: 'Connector line style' },
        color: { type: 'string', description: 'Color ID or hex value' },
      },
      required: ['fromNodeId', 'toNodeId'],
    },
  },
  {
    name: 'list_nodes',
    description: 'List all nodes in the current diagram with their IDs and names.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'move_node',
    description: 'Move a node to a new position on the diagram grid.',
    inputSchema: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of the node to move' },
        x: { type: 'number', description: 'New grid X position' },
        y: { type: 'number', description: 'New grid Y position' },
      },
      required: ['nodeId', 'x', 'y'],
    },
  },
  {
    name: 'delete_element',
    description: 'Delete an element (node, connector, text box, or rectangle) from the diagram.',
    inputSchema: {
      type: 'object',
      properties: {
        elementId: { type: 'string', description: 'ID of the element to delete' },
        elementType: {
          type: 'string',
          enum: ['item', 'connector', 'textBox', 'rectangle'],
          description: 'Type of element to delete (default: item)',
        },
      },
      required: ['elementId'],
    },
  },
  {
    name: 'undo',
    description: 'Undo the last operation.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'redo',
    description: 'Redo the last undone operation.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'export_diagram',
    description: 'Export the current diagram as a JSON file.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to save the diagram (e.g., "diagram.json")' },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_icons',
    description: 'Search available icons by name. Use this to discover icon IDs for add_node.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (e.g., "aws", "database", "server")' },
        limit: { type: 'number', description: 'Maximum results to return (default: 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_diagram_state',
    description: 'Get the current diagram state including all nodes and connectors.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'connect_fossflow': {
      const host = (args?.host as string) || 'localhost';
      const port = (args?.port as number) || 3333;
      try {
        // Reconnect with new settings
        fossflowClient.disconnect();
        // Create new client with provided settings
        fossflowClient = new FossflowClient({
          host,
          port,
          onStateUpdate: (diagram) => {
            if (diagram.icons && diagram.icons.length > 0) {
              initializeIconCatalog(diagram.icons);
            }
          },
        });
        await fossflowClient.connect();
        return {
          content: [
            {
              type: 'text',
              text: `Connected to FossFLOW at ws://${host}:${port}`,
            },
          ],
        };
      } catch (err: any) {
        throw new McpError(ErrorCode.InternalError, `Failed to connect: ${err.message}`);
      }
    }

    case 'add_node': {
      if (!fossflowClient.isConnected()) {
        throw new McpError(ErrorCode.InternalError, 'Not connected to FossFLOW. Use connect_fossflow first.');
      }

      const nodeName = args?.name as string;
      const iconQuery = args?.icon as string;
      const position = args?.position as { x: number; y: number } | undefined;

      if (!nodeName || !iconQuery) {
        throw new McpError(ErrorCode.InvalidParams, 'name and icon are required');
      }

      // Match icon
      const icon = matchIcon(iconQuery);
      if (!icon) {
        const suggestions = getIconCatalog()
          .slice(0, 5)
          .map(i => `${i.id} (${i.name})`)
          .join(', ');
        throw new McpError(
          ErrorCode.InvalidParams,
          `No icon found matching "${iconQuery}". Try: ${suggestions}`
        );
      }

      try {
        const result = await fossflowClient.addNode(nodeName, icon.id, position);
        return {
          content: [
            {
              type: 'text',
              text: `Added node "${nodeName}" with icon "${icon.name}" (ID: ${result.nodeId})`,
            },
          ],
        };
      } catch (err: any) {
        throw new McpError(ErrorCode.InternalError, `Failed to add node: ${err.message}`);
      }
    }

    case 'connect_nodes': {
      if (!fossflowClient.isConnected()) {
        throw new McpError(ErrorCode.InternalError, 'Not connected to FossFLOW');
      }

      const fromNodeId = args?.fromNodeId as string;
      const toNodeId = args?.toNodeId as string;
      const label = args?.label as string | undefined;
      const style = args?.style as 'SOLID' | 'DOTTED' | 'DASHED' | undefined;
      const color = args?.color as string | undefined;

      if (!fromNodeId || !toNodeId) {
        throw new McpError(ErrorCode.InvalidParams, 'fromNodeId and toNodeId are required');
      }

      try {
        // Resolve node names from cached diagram for name-based fallback in browser
        const diagram = fossflowClient.getDiagram();
        let fromName: string | undefined;
        let toName: string | undefined;
        if (diagram) {
          const fromItem = diagram.items.find((i: any) => i.id === fromNodeId);
          const toItem = diagram.items.find((i: any) => i.id === toNodeId);
          fromName = fromItem?.name;
          toName = toItem?.name;
        }

        const result = await fossflowClient.connectNodes(fromNodeId, toNodeId, label, style, color, fromName, toName);
        return {
          content: [
            {
              type: 'text',
              text: `Connected ${fromNodeId} → ${toNodeId} (connector ID: ${result.connectorId})`,
            },
          ],
        };
      } catch (err: any) {
        throw new McpError(ErrorCode.InternalError, `Failed to connect nodes: ${err.message}`);
      }
    }

    case 'list_nodes': {
      if (!fossflowClient.isConnected()) {
        throw new McpError(ErrorCode.InternalError, 'Not connected to FossFLOW');
      }

      const diagram = fossflowClient.getDiagram();
      if (!diagram) {
        return {
          content: [{ type: 'text', text: 'No diagram loaded' }],
        };
      }

      // Get view items (positioned nodes)
      const view = diagram.views[0];
      if (!view) {
        return {
          content: [{ type: 'text', text: 'No view in diagram' }],
        };
      }

      const nodes = view.items.map(viewItem => {
        const modelItem = diagram.items.find(i => i.id === viewItem.id);
        return {
          id: viewItem.id,
          name: modelItem?.name || 'Unknown',
          position: viewItem.tile,
          icon: modelItem?.icon,
        };
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(nodes, null, 2),
          },
        ],
      };
    }

    case 'move_node': {
      if (!fossflowClient.isConnected()) {
        throw new McpError(ErrorCode.InternalError, 'Not connected to FossFLOW');
      }

      const nodeId = args?.nodeId as string;
      const x = args?.x as number;
      const y = args?.y as number;

      if (!nodeId || x === undefined || y === undefined) {
        throw new McpError(ErrorCode.InvalidParams, 'nodeId, x, and y are required');
      }

      try {
        await fossflowClient.moveNode(nodeId, { x, y });
        return {
          content: [
            {
              type: 'text',
              text: `Moved node ${nodeId} to (${x}, ${y})`,
            },
          ],
        };
      } catch (err: any) {
        throw new McpError(ErrorCode.InternalError, `Failed to move node: ${err.message}`);
      }
    }

    case 'delete_element': {
      if (!fossflowClient.isConnected()) {
        throw new McpError(ErrorCode.InternalError, 'Not connected to FossFLOW');
      }

      const elementId = args?.elementId as string;
      const elementType = (args?.elementType as 'item' | 'connector' | 'textBox' | 'rectangle') || 'item';

      try {
        await fossflowClient.deleteElement(elementId, elementType);
        return {
          content: [
            {
              type: 'text',
              text: `Deleted ${elementType} ${elementId}`,
            },
          ],
        };
      } catch (err: any) {
        throw new McpError(ErrorCode.InternalError, `Failed to delete: ${err.message}`);
      }
    }

    case 'undo': {
      if (!fossflowClient.isConnected()) {
        throw new McpError(ErrorCode.InternalError, 'Not connected to FossFLOW');
      }

      try {
        await fossflowClient.undo();
        return {
          content: [{ type: 'text', text: 'Undone' }],
        };
      } catch (err: any) {
        throw new McpError(ErrorCode.InternalError, `Failed to undo: ${err.message}`);
      }
    }

    case 'redo': {
      if (!fossflowClient.isConnected()) {
        throw new McpError(ErrorCode.InternalError, 'Not connected to FossFLOW');
      }

      try {
        await fossflowClient.redo();
        return {
          content: [{ type: 'text', text: 'Redone' }],
        };
      } catch (err: any) {
        throw new McpError(ErrorCode.InternalError, `Failed to redo: ${err.message}`);
      }
    }

    case 'export_diagram': {
      const path = args?.path as string;
      if (!path) {
        throw new McpError(ErrorCode.InvalidParams, 'path is required');
      }

      const diagram = fossflowClient.getDiagram();
      if (!diagram) {
        throw new McpError(ErrorCode.InternalError, 'No diagram to export');
      }

      const fs = await import('fs/promises');
      await fs.writeFile(path, JSON.stringify(diagram, null, 2));

      return {
        content: [
          {
            type: 'text',
            text: `Exported diagram to ${path}`,
          },
        ],
      };
    }

    case 'search_icons': {
      const query = args?.query as string;
      const limit = (args?.limit as number) || 10;

      if (!query) {
        throw new McpError(ErrorCode.InvalidParams, 'query is required');
      }

      const icons = getIconCatalog()
        .filter(icon =>
          icon.name.toLowerCase().includes(query.toLowerCase()) ||
          icon.id.toLowerCase().includes(query.toLowerCase()) ||
          (icon.collection && icon.collection.toLowerCase().includes(query.toLowerCase()))
        )
        .slice(0, limit);

      return {
        content: [
          {
            type: 'text',
            text: icons.map(i => `${i.id}: ${i.name} (${i.collection || 'default'})`).join('\n'),
          },
        ],
      };
    }

    case 'get_diagram_state': {
      if (!fossflowClient.isConnected()) {
        throw new McpError(ErrorCode.InternalError, 'Not connected to FossFLOW');
      }

      const diagram = fossflowClient.getDiagram();
      if (!diagram) {
        return {
          content: [{ type: 'text', text: 'No diagram loaded' }],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(diagram, null, 2),
          },
        ],
      };
    }

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('FossFLOW MCP server started');
}

main().catch((err) => {
  console.error('Server error:', err);
  process.exit(1);
});
