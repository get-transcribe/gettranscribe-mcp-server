o w# GetTranscribe MCP Server

MCP (Model Context Protocol) server for [GetTranscribe](https://gettranscribe.ai) - AI-powered video transcription service. This allows you to interact with your GetTranscribe transcriptions through AI assistants like Claude, ChatGPT, and other MCP-compatible clients.

**Supports both MCP transports:**
- **stdio** - For standard MCP client integration (Claude Desktop, VS Code, etc.)
- **Streamable HTTP** - For web-based and advanced clients (ChatGPT, remote access)

📖 **See [TRANSPORT-COMPARISON.md](./TRANSPORT-COMPARISON.md) for detailed transport comparison and usage guide.**

## 🔗 Client-Specific Setup

### 🤖 ChatGPT Users
ChatGPT requires OAuth 2.0 authentication. See **[README-CHATGPT.md](README-CHATGPT.md)** for complete setup guide.

### 🔧 OpenAI API Users
OpenAI API supports both custom headers and Bearer tokens:

**Option 1: Custom Header (x-api-key)**
```bash
curl -X POST https://api.gettranscribe.ai/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "x-api-key: your_gtr_api_key" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

**Option 2: Authorization Bearer Token**
```bash
curl -X POST https://api.gettranscribe.ai/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer your_gtr_api_key" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

**MCP Client Configuration Example:**
```json
{
  "mcpServers": {
    "gettranscribe": {
      "url": "https://api.gettranscribe.ai/mcp",
      "headers": {
        "Authorization": "Bearer your_gtr_api_key"
      }
    }
  }
}
```

### 🎯 Cursor IDE & Other MCP Clients

**🌟 Recommended: SSE Transport (HTTP)**
Add to your `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "gettranscribe": {
      "url": "https://api.gettranscribe.ai/mcp",
      "headers": {
        "Authorization": "Bearer your_gtr_api_key"
      }
    }
  }
}
```

**Alternative: stdio Transport**
```json
{
  "mcpServers": {
    "gettranscribe": {
      "command": "npx",
      "args": ["-y", "gettranscribe-mcp@latest"],
      "env": {
        "GETTRANSCRIBE_API_KEY": "your_gtr_api_key"
      }
    }
  }
}
```

**For Development (Local Server):**
```json
{
  "mcpServers": {
    "gettranscribe-local": {
      "url": "http://localhost:8080/mcp",
      "headers": {
        "Authorization": "Bearer your_gtr_api_key"
      }
    }
  }
}
```

## 🚀 Quick Start

### Installation

```bash
npm install -g gettranscribe-mcp-server
```

### Configuration

#### For stdio transport (most common):

Add to your MCP client configuration (e.g., `~/.cursor/mcp.json`):

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

#### For Streamable HTTP transport:

Start the server:
```bash
MCP_TRANSPORT=http PORT=8080 GETTRANSCRIBE_API_KEY=your_key gettranscribe-mcp
```

Or use npm scripts:
```bash
npm run start:http        # General HTTP mode
npm run start:chatgpt     # Alias for ChatGPT users
npm run dev               # Development mode
```

Then configure your client to connect to `http://localhost:8080/mcp`

#### 🤖 ChatGPT Integration

This server is **fully compatible with ChatGPT** connectors and deep research. It implements the required `search` and `fetch` tools.

📖 **See [README-CHATGPT.md](./README-CHATGPT.md) for detailed ChatGPT setup instructions.**

### Get Your API Key

1. Visit [GetTranscribe.ai](https://gettranscribe.ai)
2. Create an account or sign in
3. Go to Settings → API Keys
4. Generate a new API key
5. Copy it to your MCP configuration

## 🛠️ Available Tools

### ChatGPT-Compatible Tools

- **`search`** - Search transcriptions by keywords (required for ChatGPT)
- **`fetch`** - Retrieve complete transcription content by ID (required for ChatGPT)

### Transcription Tools

- **`create_transcription`** - Create transcription from video URL (YouTube, Instagram, TikTok, Meta)
- **`get_transcription`** - Retrieve specific transcription by ID
- **`list_transcriptions`** - List your transcriptions with filtering

### Folder Management Tools

- **`create_transcription_folder`** - Create folders to organize transcriptions
- **`get_transcription_folder`** - Get folder details and contents
- **`list_transcription_folders`** - List your folders

## 🎯 Cursor IDE Setup Guide

### Step 1: Open Cursor Configuration
Open `~/.cursor/mcp.json` in your editor (create if it doesn't exist).

### Step 2: Add GetTranscribe Configuration
**🌟 Recommended (SSE/HTTP):**
```json
{
  "mcpServers": {
    "gettranscribe": {
      "url": "https://api.gettranscribe.ai/mcp",
      "headers": {
        "Authorization": "Bearer gtr_your_api_key_here"
      }
    }
  }
}
```

### Step 3: Restart Cursor
Restart Cursor IDE to load the new MCP server.

### Step 4: Test the Connection
In Cursor chat, try: *"List my recent transcriptions"*

## 💬 Example Usage

After setup, you can ask your AI assistant:

- *"Create a transcription from this YouTube video: https://youtube.com/watch?v=dQw4w9WgXcQ"*
- *"Transcribe this video with timestamps: https://youtube.com/watch?v=example"*
- *"Show me my recent transcriptions"*
- *"Create a folder called 'Podcast Episodes'"*
- *"Get the transcription with ID 123"*
- *"List all my YouTube transcriptions"*

## ⏱️ Transcription Segments

When creating transcriptions, you can request timestamped segments by setting `include_segments: true`. This provides the transcription broken down by time intervals:

**Basic transcription:**
```
✅ Transcription created successfully!
**ID:** 492
**Transcription:**
Welcome to our video about AI and machine learning...
```

**With segments:**
```
✅ Transcription created successfully!
**ID:** 492
**Transcription:**
Welcome to our video about AI and machine learning...

**Transcription Segments:**
[0:00 - 0:05] Welcome to our video about AI
[0:05 - 0:12] and machine learning. Today we'll cover
[0:12 - 0:18] the fundamental concepts you need to know.
```

## 🔧 Tool Parameters

### create_transcription
```json
{
  "url": "https://youtube.com/watch?v=example",     // Required: Video URL
  "folder_id": 123,                                // Optional: Folder ID
  "prompt": "Focus on key takeaways",              // Optional: Custom prompt
  "language": "en",                                // Optional: Language code
  "include_segments": true                         // Optional: Include timestamped segments
}
```

### list_transcriptions
```json
{
  "folder_id": 123,                               // Optional: Filter by folder
  "platform": "youtube",                         // Optional: Filter by platform
  "limit": 10,                                   // Optional: Results limit (max 50)
  "skip": 0                                      // Optional: Pagination offset
}
```

### create_transcription_folder
```json
{
  "name": "My Folder",                           // Required: Folder name
  "parent_id": 456                               // Optional: Parent folder ID
}
```

## 🌐 Environment Variables

- **`GETTRANSCRIBE_API_KEY`** (required) - Your GetTranscribe API key
- **`GETTRANSCRIBE_API_URL`** (optional) - API endpoint (defaults to https://gettranscribe.ai)
- **`MCP_TRANSPORT`** (optional) - Transport mode: "stdio" (default) or "http"
- **`PORT`** (optional) - HTTP server port (default: 8080, only for HTTP transport)
- **`MCP_PATH`** (optional) - HTTP endpoint path (default: "/mcp", only for HTTP transport)

## 🔧 Transport Configuration

### 📊 Quick Reference

| Transport | Use For | Configuration | URL |
|-----------|---------|---------------|-----|
| **SSE (HTTP)** ⭐ | Cursor, MCP Clients | URL + headers | `https://api.gettranscribe.ai/mcp` |
| **stdio** | Claude Desktop, VS Code | Command + env | N/A |
| **HTTP Local** | Development, ChatGPT | `npm run start:http` | `http://localhost:8080/mcp` |

⭐ **SSE is recommended** for most applications as it provides better performance and real-time capabilities.

### 📟 stdio Transport (Default - for MCP Clients)
For Claude Desktop, VS Code, and other MCP clients:

```bash
# Default mode - starts in stdio
node mcp-server.js

# Or explicitly specify stdio
MCP_TRANSPORT=stdio node mcp-server.js

# With API key
GETTRANSCRIBE_API_KEY=your_key node mcp-server.js
```

**Use Case:** Standard MCP client integration

### 🌐 HTTP Transport (for ChatGPT, OpenAI API, Web Clients)
For ChatGPT connectors, OpenAI API, and web-based access:

```bash
# Start HTTP server on port 8080
MCP_TRANSPORT=http PORT=8080 node mcp-server.js

# With API key (optional, can use headers)
MCP_TRANSPORT=http PORT=8080 GETTRANSCRIBE_API_KEY=your_key node mcp-server.js

# Custom port and endpoint
MCP_TRANSPORT=http PORT=3000 MCP_PATH=/api/mcp node mcp-server.js

# Production mode
MCP_TRANSPORT=http PORT=8080 GETTRANSCRIBE_API_URL=https://api.gettranscribe.ai node mcp-server.js
```

**Use Case:** ChatGPT connectors, OpenAI API, browser-based clients

### 🚀 Quick Start Scripts
```bash
# For MCP clients (Claude, VS Code)
npm run start:stdio

# For ChatGPT and OpenAI API
npm run start:http

# For development
npm run dev
```

### 📡 HTTP Transport Features
The HTTP transport includes:
- **SSE (Server-Sent Events)** for real-time communication
- **OAuth 2.0** support for ChatGPT integration
- **Multiple auth methods:** `x-api-key` header, `Bearer` token, OAuth JWT
- **Session management** with `Mcp-Session-Id` headers
- **Health check** endpoint at `/health`
- **CORS support** for browser clients

> **Note:** HTTP transport automatically includes SSE support. When you start with `MCP_TRANSPORT=http`, the server handles both regular HTTP requests and SSE streams on the same endpoint.

## 📋 Supported Platforms

- YouTube
- Instagram (posts, reels, stories)
- TikTok
- Meta/Facebook

## 🔐 Authentication & Privacy

### Authentication Methods

**📱 ChatGPT Users:**
- OAuth 2.0 flow (required by ChatGPT)
- Users authorize with their GetTranscribe API key through a secure web form
- Access tokens are JWT-based with 24-hour expiration

**🔧 OpenAI API Users:**
- `x-api-key` header authentication OR
- `Authorization: Bearer <api_key>` authentication
- No OAuth flow needed for programmatic access

**🎯 MCP Clients (Claude, etc.):**
- Environment variable authentication
- API key set in client configuration

### Privacy & Security
- Each user connects with their own API key
- All data remains private to your GetTranscribe account
- Secure API communication with HTTPS
- No data is stored by the MCP server
- OAuth tokens are temporary and automatically expire

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Support

- 📧 Email: support@gettranscribe.ai
- 🌐 Website: [gettranscribe.ai](https://gettranscribe.ai)
- 📖 Documentation: [docs.gettranscribe.ai](https://docs.gettranscribe.ai)

## 🔄 Version History

### 1.1.0
- ✨ **NEW:** Added `include_segments` parameter to `create_transcription`
- ✨ **NEW:** Timestamped segment support with formatted output
- 📝 Enhanced response format with full transcription text
- 🛠️ Improved error handling for segment parsing

### 1.0.0
- Initial release
- Support for all 6 core tools
- Full MCP protocol compatibility
- Authentication via API keys