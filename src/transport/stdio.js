import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { TOOLS } from '../tools/definitions.js';
import { handleToolCall } from '../tools/handlers.js';

export async function startStdioServer() {
  const mcpServer = new Server(
    {
      name: 'gettranscribe',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {
          listChanged: true
        },
        resources: {}
      },
      protocolVersion: '2025-06-18',
    }
  );

  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error(`🔧 [MCP] Handling tools/list request`);
    return {
      tools: TOOLS
    };
  });

  mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return handleToolCall(name, args);
  });

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error('✅ GetTranscribe MCP Server (stdio) started successfully');
}

