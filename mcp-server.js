#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { createServer } from 'http';

// Configuration from environment variables
const API_URL = process.env.GETTRANSCRIBE_API_URL || 'https://gettranscribe.ai';
const API_KEY = process.env.GETTRANSCRIBE_API_KEY;

if (!API_KEY) {
  console.error('❌ GETTRANSCRIBE_API_KEY environment variable is required');
  process.exit(1);
}

// Create HTTP client for GetTranscribe API
const client = axios.create({
  baseURL: API_URL,
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json'
  }
});

// Create MCP server
const mcpServer = new Server(
  {
    name: 'gettranscribe',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const TOOLS = [
  {
    name: "create_transcription",
    description: "Create a new transcription from a video URL (Instagram, TikTok, YouTube, Meta)",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Video URL from supported platforms"
        },
        folder_id: {
          type: "number",
          description: "Optional folder ID to organize the transcription"
        },
        prompt: {
          type: "string", 
          description: "Optional custom prompt for transcription"
        },
        language: {
          type: "string",
          description: "Optional target language code (e.g., 'en', 'es', 'fr')"
        },
        include_segments: {
          type: "boolean",
          description: "Include transcription segments with timestamps (default: false)"
        }
      },
      required: ["url"]
    }
  },
  {
    name: "get_transcription",
    description: "Retrieve a specific transcription by ID",
    inputSchema: {
      type: "object",
      properties: {
        transcription_id: {
          type: "number",
          description: "ID of the transcription to retrieve"
        }
      },
      required: ["transcription_id"]
    }
  },
  {
    name: "list_transcriptions", 
    description: "List transcriptions with optional filtering and pagination",
    inputSchema: {
      type: "object",
      properties: {
        folder_id: {
          type: "number",
          description: "Filter by folder ID"
        },
        platform: {
          type: "string",
          description: "Filter by platform (instagram, tiktok, youtube, meta)"
        },
        limit: {
          type: "number",
          description: "Number of results to return (default: 10, max: 50)"
        },
        skip: {
          type: "number", 
          description: "Number of results to skip for pagination"
        }
      }
    }
  },
  {
    name: "create_transcription_folder",
    description: "Create a new folder for organizing transcriptions",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the folder"
        },
        parent_id: {
          type: "number",
          description: "Optional parent folder ID for nested structure"
        }
      },
      required: ["name"]
    }
  },
  {
    name: "get_transcription_folder",
    description: "Retrieve a specific folder by ID with its contents",
    inputSchema: {
      type: "object", 
      properties: {
        folder_id: {
          type: "number",
          description: "ID of the folder to retrieve"
        }
      },
      required: ["folder_id"]
    }
  },
  {
    name: "list_transcription_folders",
    description: "List folders with optional filtering and pagination",
    inputSchema: {
      type: "object",
      properties: {
        parent_id: {
          type: "number",
          description: "Filter by parent folder ID (null for root folders)"
        },
        limit: {
          type: "number",
          description: "Number of results to return (default: 10)"
        },
        skip: {
          type: "number",
          description: "Number of results to skip for pagination"
        }
      }
    }
  }
];

// List tools handler
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS
  };
});

// Call tool handler
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    console.error(`🚀 [MCP] Calling tool: ${name}`);

    // Make request to GetTranscribe MCP service
    const response = await client.post('/mcp', {
      method: 'tools/call',
      params: {
        name,
        arguments: args
      }
    });

    // Return the response from the service
    return response.data;

  } catch (error) {
    console.error(`❌ [MCP] Error calling tool ${name}:`, error.message);
    
    // Return error in MCP format
    return {
      content: [{
        type: "text",
        text: `❌ Error calling ${name}: ${error.response?.data?.message || error.message}`
      }],
      isError: true
    };
  }
});

// Start the server
async function main() {
  console.error('🚀 Starting GetTranscribe MCP Server...');
  console.error(`📡 API URL: ${API_URL}`);
  console.error(`🔑 API Key: ${API_KEY ? '***' + API_KEY.slice(-4) : 'NOT SET'}`);

  // Decide transport: SSE if MCP_TRANSPORT=sse or PORT is set, otherwise STDIO
  const transportMode = (process.env.MCP_TRANSPORT || '').toLowerCase();
  const useSSE = transportMode === 'sse' || !!process.env.PORT;

  if (useSSE) {
    const port = Number(process.env.PORT || 8080);
    const ssePath = process.env.MCP_SSE_PATH || '/mcp/sse';

    const httpServer = createServer(async (req, res) => {
      try {
        if (req.method === 'GET' && req.url && (req.url === ssePath || req.url.startsWith(`${ssePath}?`))) {
          console.error('🔗 [SSE] New connection attempt');
          
          // Set SSE headers
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
          });
          
          // Send initial MCP handshake
          const initMessage = {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2024-11-05",
              capabilities: { tools: {} },
              clientInfo: { name: "gettranscribe", version: "1.0.0" }
            }
          };
          
          res.write(`data: ${JSON.stringify(initMessage)}\n\n`);
          console.error('✅ [SSE] MCP connection established');
          
          // Keep connection alive
          const keepAlive = setInterval(() => {
            try {
              res.write('data: {"jsonrpc":"2.0","method":"ping"}\n\n');
            } catch (e) {
              clearInterval(keepAlive);
            }
          }, 30000);
          
          // Clean up on disconnect
          req.on('close', () => {
            clearInterval(keepAlive);
            console.error('🔌 [SSE] Client disconnected');
          });
          
          req.on('error', () => {
            clearInterval(keepAlive);
          });
        } else if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', transport: 'sse' }));
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
      } catch (err) {
        console.error('❌ HTTP server error:', err?.message || err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        }
      }
    });

    httpServer.listen(port, () => {
      console.error(`✅ GetTranscribe MCP SSE server listening on port ${port}`);
      console.error(`🔗 SSE endpoint: http://localhost:${port}${ssePath}`);
    });
  } else {
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error('✅ GetTranscribe MCP Server (stdio) started successfully');
  }
}

main().catch((error) => {
  console.error('💥 Failed to start MCP server:', error);
  process.exit(1);
});
