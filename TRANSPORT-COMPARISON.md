# Transport Comparison Guide

The GetTranscribe MCP Server supports both **stdio** and **HTTP** transports. Here's when to use each:

## Transport Overview

| Feature | stdio Transport | HTTP Transport |
|---------|----------------|----------------|
| **Best for** | Local MCP clients | Web clients, ChatGPT |
| **Setup complexity** | Simple | Moderate |
| **Performance** | Fast (direct process) | Good (network) |
| **Security** | Process isolation | Requires CORS/auth |
| **Multiple clients** | No | Yes |
| **Remote access** | No | Yes |
| **ChatGPT compatible** | ❌ No | ✅ Yes |

## When to Use stdio Transport

**Use stdio transport for:**
- 🖥️ **Local MCP clients** (Claude Desktop, Cline, Continue, etc.)
- 🔒 **Security-sensitive** applications (runs as local process)
- ⚡ **Best performance** (no network overhead)
- 🎯 **Single-user** scenarios

**Example clients:**
- Claude Desktop app
- VS Code extensions (Cline, Continue)
- Local AI assistants
- Development tools

**Start command:**
```bash
# Default mode (stdio)
gettranscribe-mcp

# Explicit stdio mode
npm run start:stdio
```

## When to Use HTTP Transport

**Use HTTP transport for:**
- 🌐 **ChatGPT integration** (connectors, deep research)
- 🔗 **Remote clients** (web-based, cloud)
- 👥 **Multiple concurrent users**
- 🔄 **Server-to-client notifications**

**Example clients:**
- ChatGPT (web interface)
- Custom web applications
- Remote AI services
- Cloud deployments

**Start command:**
```bash
# HTTP mode for ChatGPT
npm run start:chatgpt

# General HTTP mode
npm run start:http

# Development mode
npm run dev
```

## Configuration Differences

### stdio Transport Configuration

**For Claude Desktop** (`~/.claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "gettranscribe": {
      "command": "gettranscribe-mcp",
      "env": {
        "GETTRANSCRIBE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

**For VS Code/Cline** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "gettranscribe": {
      "command": "gettranscribe-mcp",
      "env": {
        "GETTRANSCRIBE_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### HTTP Transport Configuration

**Environment variables:**
```bash
export GETTRANSCRIBE_API_KEY="your_api_key_here"
export MCP_TRANSPORT=http
export PORT=8080
```

**For ChatGPT:**
- Server URL: `http://localhost:8080/mcp`
- Required tools: `search`, `fetch`
- Set `require_approval: "never"`

## Tool Availability

### Both Transports Support

All standard GetTranscribe tools:
- `create_transcription`
- `get_transcription` 
- `list_transcriptions`
- `create_transcription_folder`
- `get_transcription_folder`
- `list_transcription_folders`

### HTTP Transport Additional Tools

**ChatGPT-specific tools:**
- `search` - Required by ChatGPT for finding content
- `fetch` - Required by ChatGPT for retrieving full content

These tools are automatically added when using HTTP transport and format responses specifically for ChatGPT compatibility.

## Security Considerations

### stdio Transport
- ✅ **Process isolation** - Runs as separate process
- ✅ **No network exposure** - Local communication only
- ✅ **Environment variables** - API keys in process env
- ❌ **Single user only** - Cannot share between users

### HTTP Transport
- ⚠️ **Network exposure** - Requires proper security
- ⚠️ **CORS configuration** - Must be configured correctly
- ⚠️ **API key handling** - Can be passed in requests
- ✅ **Multiple users** - Supports concurrent connections

## Migration Between Transports

**From stdio to HTTP:**
1. Stop the stdio server
2. Set environment variables for HTTP mode
3. Start with `npm run start:http`
4. Update client configurations to use HTTP endpoint

**From HTTP to stdio:**
1. Stop the HTTP server
2. Update MCP client configuration
3. Start with default mode or `npm run start:stdio`

## Troubleshooting

### Wrong Transport Mode

**Problem:** Server starts in wrong mode

**Solution:** Check these in order:
1. Environment variable `MCP_TRANSPORT`
2. Environment variable `PORT` (auto-enables HTTP)
3. Default is stdio mode

**Expected output:**
```bash
# stdio mode
✅ GetTranscribe MCP Server (stdio) started successfully

# HTTP mode  
✅ GetTranscribe MCP Server (Streamable HTTP) listening on port 8080
```

### Common Issues

| Issue | Transport | Solution |
|-------|-----------|----------|
| "Cannot connect" | stdio | Check command path and permissions |
| "CORS error" | HTTP | Verify CORS headers configuration |
| "Session not found" | HTTP | Check session management setup |
| "Tool not found" | Both | Verify API key and backend connectivity |

## Recommendations

### For Local Development
- **Use stdio transport** with Claude Desktop or VS Code extensions
- Simpler setup, better security, faster performance

### For ChatGPT Integration
- **Use HTTP transport** with ChatGPT-specific configuration
- Follow the [ChatGPT setup guide](./README-CHATGPT.md)

### For Production
- **stdio**: Deploy as part of larger application
- **HTTP**: Deploy as standalone service with proper security

Both transports use the same core functionality and connect to the same GetTranscribe API backend. Choose based on your client requirements and deployment scenario.
