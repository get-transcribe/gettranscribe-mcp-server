import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { TOOLS } from '../tools/definitions.js';
import { handleToolCall } from '../tools/handlers.js';
import { 
  getResourcesList, 
  getResourceTemplates, 
  readResourceContent 
} from './resources.js';

export function createServerInstance(httpApiKey = null) {
  const serverInstance = new Server(
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

  serverInstance.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error(`🔧 [MCP] Handling tools/list request`);
    return {
      tools: TOOLS
    };
  });

  serverInstance.setRequestHandler(ListResourcesRequestSchema, async () => {
    return getResourcesList();
  });

  serverInstance.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    return readResourceContent(uri);
  });

  serverInstance.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    return getResourceTemplates();
  });

  serverInstance.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return handleToolCall(name, args, httpApiKey);
  });

  return serverInstance;
}

