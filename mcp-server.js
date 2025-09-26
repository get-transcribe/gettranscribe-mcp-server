#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import { randomUUID } from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';

// Configuration from environment variables
const API_URL = process.env.GETTRANSCRIBE_API_URL || 'https://api.gettranscribe.ai';
const DEFAULT_API_KEY = process.env.GETTRANSCRIBE_API_KEY;

// OAuth Configuration
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID || 'gettranscribe-mcp';
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || 'mcp-secret-2024';
const JWT_SECRET = process.env.JWT_SECRET || 'gettranscribe-jwt-secret-2024';
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;

// Helper function to create client with API key
function createClient(apiKey) {
  return axios.create({
    baseURL: API_URL,
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    }
  });
}

// OAuth helper functions
function generateAuthCode() {
  return randomUUID();
}

function generateAccessToken(userApiKey) {
  return jwt.sign(
    { 
      api_key: userApiKey,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
    },
    JWT_SECRET
  );
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// In-memory storage for auth codes (in production, use Redis or database)
const authCodes = new Map();
const accessTokens = new Map();

// Create MCP server
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
    },
    protocolVersion: '2025-06-18',
  }
);

// Add connection logging (these might not be available in this SDK version, so let's comment them out for now)
// mcpServer.onRequest = (request) => {
//   console.error(`📥 [MCP] Received request: ${request.method || 'unknown'}`);
//   console.error(`📥 [MCP] Request details:`, JSON.stringify(request, null, 2));
// };

// mcpServer.onNotification = (notification) => {
//   console.error(`📬 [MCP] Received notification: ${notification.method || 'unknown'}`);
//   console.error(`📬 [MCP] Notification details:`, JSON.stringify(notification, null, 2));
// };

// Note: Initialize handler is built-in to the MCP server, no need to define it manually

// Tool definitions - ChatGPT requires 'search' and 'fetch' tools
const TOOLS = [
//   {
//     name: "search",
//     description: "Search for transcriptions using keywords or platform filters",
//     inputSchema: {
//       type: "object",
//       properties: {
//         query: {
//           type: "string",
//           description: "Search query string for finding relevant transcriptions"
//         }
//       },
//       required: ["query"]
//     }
//   },
//   {
//     name: "fetch",
//     description: "Retrieve complete transcription content by ID",
//     inputSchema: {
//       type: "object",
//       properties: {
//         id: {
//           type: "string",
//           description: "Transcription ID to retrieve"
//         }
//       },
//       required: ["id"]
//     }
//   },
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

// Note: Tool handlers are now set up in createServerInstance() for HTTP transport


// Start the server
async function main() {
  console.error('🚀 Starting GetTranscribe MCP Server...');
  console.error(`📡 API URL: ${API_URL}`);
  console.error(`🔑 Default API Key: ${DEFAULT_API_KEY ? '***' + DEFAULT_API_KEY.slice(-4) : 'NOT SET (clients must provide api_key parameter)'}`);

  // Decide transport: HTTP if MCP_TRANSPORT=http or PORT is set, otherwise STDIO
  const transportMode = (process.env.MCP_TRANSPORT || '').toLowerCase();
  const useHTTP = transportMode === 'http' || transportMode === 'sse' || !!process.env.PORT;

  if (useHTTP) {
    const port = Number(process.env.PORT || 8080);
    const mcpPath = process.env.MCP_PATH || '/mcp';

    const app = express();
    app.use(express.json());

    // CORS middleware
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, Last-Event-ID, MCP-Protocol-Version, x-api-key');
      res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.header('Access-Control-Expose-Headers', 'Mcp-Session-Id');
      
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    // OAuth Endpoints
    
    // OAuth Authorization endpoint
    app.get('/oauth/authorize', (req, res) => {
      const { client_id, redirect_uri, state, response_type } = req.query;
      
      console.error(`🔐 [OAuth] Authorization request: client_id=${client_id}, redirect_uri=${redirect_uri}`);
      
      if (client_id !== OAUTH_CLIENT_ID) {
        return res.status(400).json({ error: 'invalid_client_id' });
      }
      
      if (response_type !== 'code') {
        return res.status(400).json({ error: 'unsupported_response_type' });
      }
      
      // Show authorization form
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>GetTranscribe MCP Authorization</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; padding: 40px; background: #f5f5f5; }
            .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #6942e2; margin-bottom: 20px; }
            input, button { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; }
            button { background: #6942e2; color: white; border: none; cursor: pointer; }
            button:hover { background: #5a38c7; }
            .info { background: #f0f0f0; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎥 GetTranscribe MCP</h1>
            <div class="info">
              <strong>ChatGPT/Claude</strong> wants to access your GetTranscribe account to search and fetch video transcriptions.
            </div>
            <form method="POST" action="/oauth/authorize">
              <input type="hidden" name="client_id" value="${client_id}">
              <input type="hidden" name="redirect_uri" value="${redirect_uri}">
              <input type="hidden" name="state" value="${state || ''}">
              <input type="hidden" name="response_type" value="${response_type}">
              
              <label for="api_key">Your GetTranscribe API Key:</label>
              <input type="password" name="api_key" placeholder="gtr_..." required>
              
              <button type="submit">✅ Authorize Access</button>
            </form>
            <p style="font-size: 12px; color: #666; text-align: center;">
              Get your API key from <a href="https://www.gettranscribe.ai" target="_blank">gettranscribe.ai</a>
            </p>
          </div>
        </body>
        </html>
      `);
    });
    
    // OAuth Authorization form submission
    app.post('/oauth/authorize', express.urlencoded({ extended: true }), (req, res) => {
      const { client_id, redirect_uri, state, api_key } = req.body;
      
      console.error(`🔐 [OAuth] Authorization submission: client_id=${client_id}, api_key=${api_key?.slice(0, 8)}...`);
      
      if (!api_key || !api_key.startsWith('gtr_')) {
        return res.status(400).send('Invalid API key format. Must start with "gtr_"');
      }
      
      // Generate authorization code
      const authCode = generateAuthCode();
      authCodes.set(authCode, { 
        api_key, 
        client_id, 
        expires: Date.now() + 600000 // 10 minutes
      });
      
      console.error(`🔐 [OAuth] Generated auth code: ${authCode}`);
      
      // Redirect back to client with code
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.set('code', authCode);
      if (state) redirectUrl.searchParams.set('state', state);
      
      res.redirect(redirectUrl.toString());
    });
    
    // OAuth Token endpoint
    app.post('/oauth/token', (req, res) => {
      const { grant_type, code, client_id, client_secret } = req.body;
      
      console.error(`🔐 [OAuth] Token request: grant_type=${grant_type}, code=${code}, client_id=${client_id}`);
      
      if (grant_type !== 'authorization_code') {
        return res.status(400).json({ error: 'unsupported_grant_type' });
      }
      
      if (client_id !== OAUTH_CLIENT_ID || client_secret !== OAUTH_CLIENT_SECRET) {
        return res.status(401).json({ error: 'invalid_client' });
      }
      
      const authData = authCodes.get(code);
      if (!authData || authData.expires < Date.now()) {
        return res.status(400).json({ error: 'invalid_or_expired_code' });
      }
      
      // Generate access token
      const accessToken = generateAccessToken(authData.api_key);
      accessTokens.set(accessToken, authData.api_key);
      
      // Clean up auth code
      authCodes.delete(code);
      
      console.error(`🔐 [OAuth] Access token generated successfully`);
      
      res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 86400 // 24 hours
      });
    });
    
    // OAuth endpoint discovery
    app.get('/.well-known/oauth-authorization-server', (req, res) => {
      // Use HTTPS in production (when behind reverse proxy like Render)
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const baseUrl = protocol + '://' + req.get('host');
      res.json({
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/oauth/authorize`,
        token_endpoint: `${baseUrl}/oauth/token`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code'],
        code_challenge_methods_supported: []
      });
    });

    // Store active transports by session ID (for backwards compatibility)
    const transports = {};
    const sseTransports = {}; // For old SSE transport

    // Helper function to create a new server instance
    function createServerInstance(httpApiKey = null) {
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
          },
          protocolVersion: '2025-06-18',
        }
      );

      // Set up handlers
      serverInstance.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error(`🔧 [MCP] Handling tools/list request`);
  return {
    tools: TOOLS
  };
});

      serverInstance.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    console.error(`🚀 [MCP] Calling tool: ${name}`);

          // For HTTP requests, use x-api-key header or default. For stdio, use default only
          const apiKey = httpApiKey || DEFAULT_API_KEY;

    if (!apiKey) {
            const errorMsg = httpApiKey !== null 
              ? `❌ API key required. Please provide x-api-key header when making requests to /mcp endpoint, or set GETTRANSCRIBE_API_KEY environment variable.`
              : `❌ API key required. Please set GETTRANSCRIBE_API_KEY environment variable.`;
            
      return {
        content: [{
          type: "text",
                text: errorMsg
        }],
        isError: true
      };
    }

    // Create client with the appropriate API key
    const client = createClient(apiKey);

          // Use args directly (no need to remove api_key anymore)
          const cleanArgs = args || {};

          // Handle ChatGPT required tools with special logic
          if (name === 'search') {
            // For search tool, call list_transcriptions with query-based filtering
            const response = await client.post('/mcp', {
              method: 'tools/call',
              params: {
                name: 'list_transcriptions',
                arguments: {
                  limit: 10,
                  ...cleanArgs
                }
              }
            });

            // Extract and parse the transcriptions from the formatted response
            const responseText = response.data?.content?.[0]?.text || '';
            
            // Parse transcription IDs and info from formatted text  
            // Format: **1. ID: 490** (instagram)... 🔗 https://www.instagram.com/reel/DI4q2F4R2NF/...
            const transcriptionMatches = responseText.match(/\*\*\d+\. ID: \d+\*\* \([^)]+\)[\s\S]*?🔗 [^\n.]+/g) || [];
            const results = transcriptionMatches.map(match => {
              const idMatch = match.match(/\*\*\d+\. ID: (\d+)\*\*/);
              const platformMatch = match.match(/\*\* \(([^)]+)\)/);
              const urlMatch = match.match(/🔗 ([^\n]+)/);
              
              const id = idMatch?.[1] || 'unknown';
              const platform = platformMatch?.[1] || 'unknown';
              const url = urlMatch?.[1]?.replace(/\.\.\.$/, '') || `${API_URL}/transcriptions/${id}`;
              
              return {
                id: id,
                title: `${platform} Transcription ${id}`,
                url: url
              };
            });

            return {
              content: [{
                type: "text",
                text: JSON.stringify({ results })
              }]
            };
          }

          if (name === 'fetch') {
            // For fetch tool, get full transcription content
            const transcriptionId = cleanArgs.id;
            const response = await client.post('/mcp', {
              method: 'tools/call',
              params: {
                name: 'get_transcription',
                arguments: {
                  transcription_id: parseInt(transcriptionId)
                }
              }
            });

            // Extract transcription data from formatted response
            const responseText = response.data?.content?.[0]?.text || '';
            
            // For now, return the formatted response as-is for fetch
            // TODO: Parse the formatted response to extract structured data
            const result = {
              id: String(transcriptionId),
              title: `Transcription ${transcriptionId}`,
              text: responseText,
              url: `${API_URL}/transcriptions/${transcriptionId}`,
              metadata: {
                source: 'gettranscribe_mcp'
              }
            };

            return {
              content: [{
                type: "text",
                text: JSON.stringify(result)
              }]
            };
          }

          // For other tools, make the regular request
    const response = await client.post('/mcp', {
      method: 'tools/call',
      params: {
        name,
        arguments: cleanArgs
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

      return serverInstance;
    }

    // Handle POST requests for client-to-server communication (Stateless mode)
    app.post(mcpPath, async (req, res) => {
      console.error('📨 [POST] Received MCP request (stateless)');
      
      try {
        // Authentication: 
        // - ChatGPT: Uses OAuth Bearer tokens (JWT)
        // - OpenAI API: Can use x-api-key headers OR Authorization Bearer with raw API key
        // - MCP Clients: Use environment variables (stdio transport)
        let httpApiKey = req.headers['x-api-key'];
        
        // Check for Authorization Bearer token
        const authHeader = req.headers['authorization'];
        if (!httpApiKey && authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          
          // First try to verify as OAuth JWT token (for ChatGPT)
          const decoded = verifyAccessToken(token);
          if (decoded && decoded.api_key) {
            httpApiKey = decoded.api_key;
            console.error(`🔐 [OAuth] Using API key from JWT Bearer token`);
          } else if (token.startsWith('gtr_')) {
            // If JWT verification fails but token looks like GetTranscribe API key,
            // treat it as raw API key (for OpenAI API Bearer auth)
            httpApiKey = token;
            console.error(`🔐 [Bearer] Using raw API key from Authorization header`);
          }
        }
        
        // Create a new instance of transport and server for each request
        // to ensure complete isolation and avoid request ID collisions
        const server = createServerInstance(httpApiKey);
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // Stateless mode
        });
        
        res.on('close', () => {
          console.error('🔌 [POST] Request closed');
          transport.close();
          server.close();
        });
        
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        console.error('✅ [POST] Request handled successfully');
        
      } catch (error) {
        console.error('❌ [POST] Error handling MCP request:', error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          });
        }
      }
    });

    // SSE notifications not supported in stateless mode
    app.get(mcpPath, async (req, res) => {
      console.error('🔗 [GET] Received GET MCP request (stateless mode)');
      res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Method not allowed - SSE not supported in stateless mode."
        },
        id: null
      }));
    });

    // Session termination not needed in stateless mode
    app.delete(mcpPath, async (req, res) => {
      console.error('🗑️ [DELETE] Received DELETE MCP request (stateless mode)');
      res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Method not allowed - sessions not used in stateless mode."
        },
        id: null
      }));
    });

    // Health check endpoint
    app.get(['/health', '/'], (req, res) => {
      // Use HTTPS in production (when behind reverse proxy like Render)
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const baseUrl = protocol + '://' + req.get('host');
      res.json({
        status: 'ok',
        transport: 'streamable-http',
        name: 'GetTranscribe MCP Server',
        version: '1.0.0',
        tools: TOOLS.map(t => t.name),
        chatgpt_compatible: true,
        api_url: API_URL,
        endpoint: `${baseUrl}${mcpPath}`,
        active_sessions: Object.keys(transports).length,
        sse_sessions: Object.keys(sseTransports).length
      });
    });

    // Backwards compatibility: Old SSE transport for MCP Inspector
    app.get('/sse', async (req, res) => {
      console.error('🔗 [OLD SSE] Inspector connection attempt');
      
      try {
        const sessionId = randomUUID();
        // Extract API key from header or Bearer token
        let httpApiKey = req.headers['x-api-key'];
        
        // Check for Authorization Bearer token
        const authHeader = req.headers['authorization'];
        if (!httpApiKey && authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          
          // First try to verify as OAuth JWT token (for ChatGPT)
          const decoded = verifyAccessToken(token);
          if (decoded && decoded.api_key) {
            httpApiKey = decoded.api_key;
            console.error(`🔐 [OAuth] Using API key from JWT Bearer token in SSE`);
          } else if (token.startsWith('gtr_')) {
            // If JWT verification fails but token looks like GetTranscribe API key,
            // treat it as raw API key (for OpenAI API Bearer auth)
            httpApiKey = token;
            console.error(`🔐 [Bearer] Using raw API key from Authorization header in SSE`);
          }
        }
        const server = createServerInstance(httpApiKey);
        const transport = new SSEServerTransport('/messages', res);
        
        sseTransports[sessionId] = { server, transport };
        
        // Clean up on close
        res.on('close', () => {
          console.error(`🗑️ [OLD SSE] Session closed: ${sessionId}`);
          if (sseTransports[sessionId]) {
            sseTransports[sessionId].server.close();
            delete sseTransports[sessionId];
          }
        });
        
        await server.connect(transport);
        console.error(`✅ [OLD SSE] Connected session: ${sessionId}`);
        
      } catch (error) {
        console.error('❌ [OLD SSE] Error:', error);
        if (!res.headersSent) {
          res.status(500).send('SSE connection failed');
        }
      }
    });

    // Backwards compatibility: Old messages endpoint
    app.post('/messages', async (req, res) => {
      console.error('📨 [OLD MESSAGES] Received POST');
      
      // Find any active SSE transport to handle this message
      const sessionIds = Object.keys(sseTransports);
      if (sessionIds.length === 0) {
        return res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'No active SSE session'
          },
          id: null
        });
      }
      
      // Use the first available session
      const sessionId = sessionIds[0];
      const { transport } = sseTransports[sessionId];
      
      try {
        await transport.handleMessage(req.body);
        res.status(200).send('OK');
      } catch (error) {
        console.error('❌ [OLD MESSAGES] Error:', error);
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error'
          },
          id: null
        });
      }
    });

    // Start server
    app.listen(port, () => {
      console.error(`✅ GetTranscribe MCP Server (Streamable HTTP) listening on port ${port}`);
      console.error(`🔗 MCP endpoint: http://localhost:${port}${mcpPath}`);
      console.error(`🏥 Health check: http://localhost:${port}/health`);
      console.error(`📖 MCP Inspector: npx @modelcontextprotocol/inspector http://localhost:${port}${mcpPath}`);
    });

  } else {
    // Use stdio transport
    // Set up handlers for stdio transport
    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      console.error(`🔧 [MCP] Handling tools/list request`);
      return {
        tools: TOOLS
      };
    });

    mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        console.error(`🚀 [MCP] Calling tool: ${name}`);

        // For stdio mode, use default API key only
        const apiKey = DEFAULT_API_KEY;

        if (!apiKey) {
          return {
            content: [{
              type: "text",
              text: `❌ API key required. Please set GETTRANSCRIBE_API_KEY environment variable.`
            }],
            isError: true
          };
        }

        // Create client with the appropriate API key
        const client = createClient(apiKey);

        // Use args directly (no api_key parameter anymore)
        const cleanArgs = args || {};

        // Handle ChatGPT required tools with special logic
        if (name === 'search') {
          // For search tool, call list_transcriptions with query-based filtering
          const response = await client.post('/mcp', {
            method: 'tools/call',
            params: {
              name: 'list_transcriptions',
              arguments: {
                limit: 10,
                ...cleanArgs
              }
            }
          });

          // Transform response to ChatGPT search format
          const transcriptions = response.data?.content?.[0]?.text ? JSON.parse(response.data.content[0].text) : { data: [] };
          const results = transcriptions.data?.map((t, index) => ({
            id: String(t.id || index),
            title: t.title || t.video_title || `Transcription ${t.id}`,
            url: t.video_url || `${API_URL}/transcriptions/${t.id}`
          })) || [];

          return {
            content: [{
              type: "text",
              text: JSON.stringify({ results })
            }]
          };
        }

        if (name === 'fetch') {
          // For fetch tool, get full transcription content
          const transcriptionId = cleanArgs.id;
          const response = await client.post('/mcp', {
            method: 'tools/call',
            params: {
              name: 'get_transcription',
              arguments: {
                transcription_id: parseInt(transcriptionId)
              }
            }
          });

          // Transform response to ChatGPT fetch format
          const transcription = response.data?.content?.[0]?.text ? JSON.parse(response.data.content[0].text) : {};
          const result = {
            id: String(transcription.id || transcriptionId),
            title: transcription.title || transcription.video_title || `Transcription ${transcriptionId}`,
            text: transcription.transcription || transcription.content || 'No transcription content available',
            url: transcription.video_url || `${API_URL}/transcriptions/${transcriptionId}`,
            metadata: {
              platform: transcription.platform,
              language: transcription.language,
              created_at: transcription.created_at,
              duration: transcription.duration
            }
          };

          return {
            content: [{
              type: "text",
              text: JSON.stringify(result)
            }]
          };
        }

        // For other tools, make the regular request
        const response = await client.post('/mcp', {
          method: 'tools/call',
          params: {
            name,
            arguments: cleanArgs
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

    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error('✅ GetTranscribe MCP Server (stdio) started successfully');
  }
}

main().catch((error) => {
  console.error('💥 Failed to start MCP server:', error);
  process.exit(1);
});
