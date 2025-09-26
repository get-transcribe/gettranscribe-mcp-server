# GetTranscribe MCP Server for ChatGPT

This MCP server has been optimized for ChatGPT compatibility and implements the required `search` and `fetch` tools for deep research integration.

## ChatGPT Compatibility Features

- ✅ Required `search` and `fetch` tools implemented
- ✅ JSON-encoded responses as required by ChatGPT
- ✅ Proper CORS headers for browser clients
- ✅ Streamable HTTP transport with session management
- ✅ Tool responses follow ChatGPT format specifications

## Quick Start

### 1. Environment Setup

```bash
export GETTRANSCRIBE_API_KEY="your-api-key-here"
export GETTRANSCRIBE_API_URL="https://gettranscribe.ai"  # optional, defaults to this
export PORT=8080  # optional, defaults to 8080
export MCP_TRANSPORT=http  # use HTTP transport
```

### 2. Start the Server

**Option A: Using the startup script (Recommended)**
```bash
./start-http.sh
```

**Option B: Using environment variables**
```bash
export MCP_TRANSPORT=http
export PORT=8080
node mcp-server.js
```

**Option C: One-liner**
```bash
MCP_TRANSPORT=http PORT=8080 node mcp-server.js
```

The server will start on `http://localhost:8080` by default.

**Expected Output:**
```
🚀 Starting GetTranscribe MCP Server...
📡 API URL: https://gettranscribe.ai
🔑 Default API Key: NOT SET (clients must provide api_key parameter)
✅ GetTranscribe MCP Server (Streamable HTTP) listening on port 8080
🔗 MCP endpoint: http://localhost:8080/mcp
```

### 3. Health Check

Visit `http://localhost:8080/health` to verify the server is running:

```json
{
  "status": "ok",
  "transport": "streamable-http",
  "name": "GetTranscribe MCP Server",
  "version": "1.0.0",
  "tools": ["search", "fetch", "create_transcription", "get_transcription", "list_transcriptions", "create_transcription_folder", "get_transcription_folder", "list_transcription_folders"],
  "chatgpt_compatible": true,
  "api_url": "https://gettranscribe.ai"
}
```

## ChatGPT Integration

### Using with ChatGPT Connectors

1. Go to ChatGPT Settings → Connectors
2. Add a new MCP server with URL: `http://localhost:8080/mcp`
3. The server will appear in "Deep Research" and "Use Connectors" tools

### Using with Deep Research API

```bash
curl https://api.openai.com/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
  "model": "o4-mini-deep-research",
  "input": [
    {
      "role": "developer",
      "content": [
        {
          "type": "input_text",
          "text": "You are a research assistant that searches transcriptions to find answers."
        }
      ]
    },
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": "Find transcriptions about cooking tutorials from Instagram"
        }
      ]
    }
  ],
  "reasoning": {
    "summary": "auto"
  },
  "tools": [
    {
      "type": "mcp",
      "server_label": "gettranscribe",
      "server_url": "http://localhost:8080/mcp",
      "allowed_tools": [
        "search",
        "fetch"
      ],
      "require_approval": "never"
    }
  ]
}'
```

## Tool Reference

### `search` Tool

Searches for transcriptions using keywords or platform filters.

**Parameters:**
- `query` (required): Search query string
- `api_key` (optional): Override default API key

**Response Format:**
```json
{
  "results": [
    {
      "id": "123",
      "title": "Cooking Tutorial: Pasta Making",
      "url": "https://instagram.com/p/xyz"
    }
  ]
}
```

### `fetch` Tool

Retrieves complete transcription content by ID.

**Parameters:**
- `id` (required): Transcription ID to retrieve
- `api_key` (optional): Override default API key

**Response Format:**
```json
{
  "id": "123",
  "title": "Cooking Tutorial: Pasta Making",
  "text": "Welcome to my cooking tutorial...",
  "url": "https://instagram.com/p/xyz",
  "metadata": {
    "platform": "instagram",
    "language": "en",
    "created_at": "2024-01-01T00:00:00Z",
    "duration": 120
  }
}
```

## Security Considerations

- Always use HTTPS in production
- Set appropriate CORS origins instead of `*` for production
- Use environment variables for API keys
- Consider implementing rate limiting for public deployments

## Troubleshooting

### Common Issues

1. **Server starts in stdio mode instead of HTTP**: 
   - Make sure to set `MCP_TRANSPORT=http` environment variable
   - Or set `PORT=8080` to automatically enable HTTP mode
   - Use the provided `start-http.sh` script

2. **CORS Errors**: Make sure CORS headers are properly configured

3. **Session ID Missing**: Ensure `Mcp-Session-Id` header is exposed

4. **Tool Errors**: Check that your GetTranscribe API key is valid

5. **Connection Issues**: Verify the server is accessible at the configured URL

### Wrong Transport Mode

If you see this output:
```
✅ GetTranscribe MCP Server (stdio) started successfully
```

The server is running in stdio mode (for command-line clients). For ChatGPT, you need HTTP mode. Restart with:
```bash
MCP_TRANSPORT=http PORT=8080 node mcp-server.js
```

You should see:
```
✅ GetTranscribe MCP Server (Streamable HTTP) listening on port 8080
🔗 MCP endpoint: http://localhost:8080/mcp
```

### Debug Mode

Enable detailed logging by setting:
```bash
export DEBUG=true
```

### Testing with MCP Inspector

You can test the server using the MCP Inspector:
```bash
npx @modelcontextprotocol/inspector http://localhost:8080/mcp
```

## Production Deployment

For production deployment:

1. Use a process manager like PM2
2. Set up proper SSL/TLS certificates
3. Configure appropriate CORS origins
4. Implement rate limiting
5. Set up monitoring and logging
6. Use environment-specific configuration

Example PM2 configuration:
```json
{
  "name": "gettranscribe-mcp",
  "script": "mcp-server.js",
  "env": {
    "NODE_ENV": "production",
    "PORT": "8080",
    "GETTRANSCRIBE_API_KEY": "your-production-key"
  }
}
```
