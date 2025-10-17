import express from 'express';
import { randomUUID } from 'crypto';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { setupOAuthRoutes } from '../auth/oauth.js';
import { verifyAccessToken } from '../auth/jwt.js';
import { createServerInstance } from '../server/instance.js';
import { TOOLS } from '../tools/definitions.js';
import { API_URL, PORT, MCP_PATH } from '../config/environment.js';

const transports = {};
const sseTransports = {};

export async function startHTTPServer() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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

  setupOAuthRoutes(app);

  app.post(MCP_PATH, async (req, res) => {
    console.error('📨 [POST] Received MCP request (stateless)');
    
    try {
      let httpApiKey = req.headers['x-api-key'];
      
      const authHeader = req.headers['authorization'];
      if (!httpApiKey && authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        const decoded = verifyAccessToken(token);
        if (decoded && decoded.api_key) {
          httpApiKey = decoded.api_key;
          console.error(`🔐 [OAuth] Using API key from JWT Bearer token`);
        } else if (token.startsWith('gtr_')) {
          httpApiKey = token;
          console.error(`🔐 [Bearer] Using raw API key from Authorization header`);
        }
      }
      
      const server = createServerInstance(httpApiKey);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
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

  app.get(MCP_PATH, async (req, res) => {
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

  app.delete(MCP_PATH, async (req, res) => {
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

  app.get(['/health', '/'], (req, res) => {
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
      endpoint: `${baseUrl}${MCP_PATH}`,
      active_sessions: Object.keys(transports).length,
      sse_sessions: Object.keys(sseTransports).length
    });
  });

  app.get('/sse', async (req, res) => {
    console.error('🔗 [OLD SSE] Inspector connection attempt');
    
    try {
      const sessionId = randomUUID();
      let httpApiKey = req.headers['x-api-key'];
      
      const authHeader = req.headers['authorization'];
      if (!httpApiKey && authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        const decoded = verifyAccessToken(token);
        if (decoded && decoded.api_key) {
          httpApiKey = decoded.api_key;
          console.error(`🔐 [OAuth] Using API key from JWT Bearer token in SSE`);
        } else if (token.startsWith('gtr_')) {
          httpApiKey = token;
          console.error(`🔐 [Bearer] Using raw API key from Authorization header in SSE`);
        }
      }
      const server = createServerInstance(httpApiKey);
      const transport = new SSEServerTransport('/messages', res);
      
      sseTransports[sessionId] = { server, transport };
      
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

  app.post('/messages', async (req, res) => {
    console.error('📨 [OLD MESSAGES] Received POST');
    
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

  app.listen(PORT, () => {
    console.error(`✅ GetTranscribe MCP Server (Streamable HTTP) listening on port ${PORT}`);
    console.error(`🔗 MCP endpoint: http://localhost:${PORT}${MCP_PATH}`);
    console.error(`🏥 Health check: http://localhost:${PORT}/health`);
    console.error(`📖 MCP Inspector: npx @modelcontextprotocol/inspector http://localhost:${PORT}${MCP_PATH}`);
  });
}

