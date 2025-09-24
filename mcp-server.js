#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { randomUUID } from 'crypto';
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

// Session storage for Streamable HTTP transport
const sessions = new Map();

// Start the server
async function main() {
  console.error('🚀 Starting GetTranscribe MCP Server...');
  console.error(`📡 API URL: ${API_URL}`);
  console.error(`🔑 API Key: ${API_KEY ? '***' + API_KEY.slice(-4) : 'NOT SET'}`);

  // Decide transport: HTTP if MCP_TRANSPORT=http or PORT is set, otherwise STDIO
  const transportMode = (process.env.MCP_TRANSPORT || '').toLowerCase();
  const useHTTP = transportMode === 'http' || transportMode === 'sse' || !!process.env.PORT;

  if (useHTTP) {
    const port = Number(process.env.PORT || 8080);
    const mcpPath = process.env.MCP_PATH || '/mcp';

    const httpServer = createServer(async (req, res) => {
      try {
        // Add CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, Last-Event-ID');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        // Parse URL and session ID
        const url = new URL(req.url, `http://localhost:${port}`);
        const sessionId = req.headers['mcp-session-id'];

        if (req.method === 'POST' && url.pathname === mcpPath) {
          // Handle Streamable HTTP POST requests (client-to-server messages)
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', async () => {
            try {
              const message = JSON.parse(body);
              console.error(`📨 [HTTP] Received message:`, message.method || 'response');

              // Check if this is an initialization request
              if (message.method === 'initialize') {
                // Create new session
                const newSessionId = randomUUID();
                sessions.set(newSessionId, { createdAt: Date.now() });
                
                // Create SSE transport for this session
                const transport = new SSEServerTransport(mcpPath, res);
                await mcpServer.connect(transport);
                
                // Set session header
                res.setHeader('Mcp-Session-Id', newSessionId);
                console.error(`🔑 [HTTP] Created session: ${newSessionId}`);
                return;
              }

              // Validate session for non-initialization requests
              if (!sessionId || !sessions.has(sessionId)) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Session not found' }));
                return;
              }

              // For notifications and responses, return 202 Accepted
              if (!message.id || message.method === undefined) {
                res.writeHead(202);
                res.end();
                return;
              }

              // For requests, use SSE transport
              const transport = new SSEServerTransport(mcpPath, res);
              await mcpServer.connect(transport);

            } catch (error) {
              console.error('❌ [HTTP] Error processing POST:', error);
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid JSON-RPC message' }));
            }
          });

        } else if (req.method === 'GET' && url.pathname === mcpPath) {
          // Handle SSE stream for server-to-client messages
          const lastEventId = req.headers['last-event-id'];
          
          if (sessionId && !sessions.has(sessionId)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Session not found' }));
            return;
          }

          console.error('🔗 [SSE] Opening stream', sessionId ? `for session ${sessionId}` : '(no session)');
          
          const transport = new SSEServerTransport(mcpPath, res);
          await mcpServer.connect(transport);

        } else if (req.method === 'DELETE' && url.pathname === mcpPath && sessionId) {
          // Handle session termination
          if (sessions.has(sessionId)) {
            sessions.delete(sessionId);
            console.error(`🗑️ [HTTP] Terminated session: ${sessionId}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'session terminated' }));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Session not found' }));
          }

        } else if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
          // Health check endpoint
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'ok', 
            transport: 'streamable-http',
            sessions: sessions.size 
          }));

        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }

      } catch (err) {
        console.error('❌ [HTTP] Server error:', err?.message || err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        }
      }
    });

    // Clean up expired sessions every 5 minutes
    setInterval(() => {
      const now = Date.now();
      const maxAge = 30 * 60 * 1000; // 30 minutes
      for (const [sessionId, session] of sessions.entries()) {
        if (now - session.createdAt > maxAge) {
          sessions.delete(sessionId);
          console.error(`🧹 [HTTP] Cleaned up expired session: ${sessionId}`);
        }
      }
    }, 5 * 60 * 1000);

    httpServer.listen(port, () => {
      console.error(`✅ GetTranscribe MCP Server (Streamable HTTP) listening on port ${port}`);
      console.error(`🔗 MCP endpoint: http://localhost:${port}${mcpPath}`);
    });

  } else {
    // Use stdio transport
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error('✅ GetTranscribe MCP Server (stdio) started successfully');
  }
}

main().catch((error) => {
  console.error('💥 Failed to start MCP server:', error);
  process.exit(1);
});
