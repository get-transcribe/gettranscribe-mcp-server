# GetTranscribe MCP Server

Remote MCP server for [GetTranscribe](https://gettranscribe.ai) — AI-powered video transcription. Deployed on Cloudflare Workers with OAuth 2.1 authentication and Streamable HTTP transport.

Transcribe videos from Instagram, TikTok, YouTube, and Meta (Facebook) directly from Claude or any MCP-compatible client.

## Tools

| Tool | Description | Read-only |
|------|------------|-----------|
| `gettranscribe_create_transcription` | Create a transcription from a video URL | No |
| `gettranscribe_get_transcription` | Get a specific transcription by ID | Yes |
| `gettranscribe_list_transcriptions` | List transcriptions with filtering and pagination | Yes |
| `gettranscribe_create_folder` | Create a folder to organize transcriptions | No |
| `gettranscribe_get_folder` | Get folder details with contents | Yes |
| `gettranscribe_list_folders` | List folders with filtering and pagination | Yes |

## Authentication

The server uses **OAuth 2.1** for authentication. When a user connects via Claude or any MCP client:

1. The client discovers OAuth endpoints via `/.well-known/oauth-authorization-server`
2. The user is redirected to a consent page at `/authorize`
3. The user enters their GetTranscribe API key (`gtr_...`)
4. The key is verified against the backend, and an OAuth token is issued
5. The client stores the token and sends it automatically on every request

Users authenticate **once** and never need to enter their API key again.

### OAuth Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/.well-known/oauth-authorization-server` | OAuth metadata discovery |
| `/.well-known/oauth-protected-resource` | Protected resource metadata |
| `/authorize` | Consent page (user enters API key) |
| `/token` | Token exchange |
| `/register` | Dynamic client registration |

## Setup

### Prerequisites

- Node.js >= 18
- A [GetTranscribe](https://gettranscribe.ai) API key (`gtr_...`)
- A Cloudflare account (for deployment)

### Local Development

```bash
npm install
npm run dev
```

The server will start at `http://localhost:8787/mcp`.

### Deploy to Cloudflare Workers

```bash
npm run deploy
```

Your server will be live at `https://gettranscribe-mcp-server.<your-account>.workers.dev/mcp`.

## Connect to Claude

### Claude.ai (Web) — Recommended

1. Go to **Settings → Connectors**
2. Add a new connector with URL: `https://gettranscribe-mcp-server.daniel-c6b.workers.dev/mcp`
3. Claude will redirect you to the consent page to enter your API key
4. After authorization, GetTranscribe tools are available in all conversations

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gettranscribe": {
      "url": "https://gettranscribe-mcp-server.daniel-c6b.workers.dev/mcp"
    }
  }
}
```

Claude Desktop will handle the OAuth flow automatically on first use.

## Architecture

```
Claude / MCP Client
      │
      │ Streamable HTTP + OAuth 2.1
      ▼
Cloudflare Workers (this server)
  ├── OAuthProvider (token mgmt, KV storage)
  ├── /authorize (consent page)
  └── /mcp (MCP tools handler)
      │
      │ REST + API Key
      ▼
GetTranscribe Backend (AWS ECS)
      │
      ▼
   PostgreSQL
```

## Project Structure

```
src/
├── index.ts              # Entry point, OAuthProvider + MCP handler
├── services/
│   └── api-client.ts     # Backend API client (fetch-based)
└── tools/
    ├── transcriptions.ts # Transcription tools (create/get/list)
    └── folders.ts        # Folder tools (create/get/list)
```

## License

MIT
