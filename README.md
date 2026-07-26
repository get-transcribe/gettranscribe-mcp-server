# GetTranscribe MCP Server

Remote MCP server for [GetTranscribe](https://gettranscribe.ai) — AI-powered video transcription. Deployed on Cloudflare Workers with OAuth 2.1 authentication and Streamable HTTP transport.

Transcribe videos from Instagram, TikTok, YouTube, and Meta (Facebook) directly from Claude or any MCP-compatible client.

## Tools

| Tool | Description | Read-only |
|------|------------|-----------|
| `gettranscribe_create_transcription_job` | Start an async transcription job (returns `job_id` immediately) | No |
| `gettranscribe_get_transcription_job` | Poll job status until completed/failed | Yes |
| `gettranscribe_get_transcription` | Get a specific transcription by ID | Yes |
| `gettranscribe_list_transcriptions` | List transcriptions with filtering and pagination | Yes |
| `gettranscribe_create_folder` | Create a folder to organize transcriptions | No |
| `gettranscribe_get_folder` | Get folder details with contents | Yes |
| `gettranscribe_list_folders` | List folders with filtering and pagination | Yes |
| `gettranscribe_download_video` | Resolve a fresh direct download URL for a video (temporary CDN link, debits $0.01 from wallet) | No |
| `gettranscribe_describe_schema` | Admin only (user 1\|2): list tables/columns | Yes |
| `gettranscribe_query_database` | Admin only (user 1\|2): read-only SELECT | Yes |

**Production MCP URL:** `https://mcp.gettranscribe.ai/mcp`

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

Your server will be live at `https://mcp.gettranscribe.ai/mcp`.

## Connect to Claude

### Claude.ai (Web) — Recommended

1. Go to **Settings → Connectors**
2. Add a new connector with URL: `https://mcp.gettranscribe.ai/mcp`
3. Claude will redirect you to the consent page to enter your API key
4. After authorization, GetTranscribe tools are available in all conversations

### Claude Desktop

> **Important:** Claude Desktop does NOT support remote MCP servers via `claude_desktop_config.json`. That file only works for local stdio servers, and adding a `url` entry can cause Claude Desktop to silently wipe your `mcpServers` config. Use one of the two methods below.

**Option A — Custom connector (recommended):**

1. In Claude Desktop, go to **Settings → Connectors**
2. Click **Add custom connector**
3. Paste the URL: `https://mcp.gettranscribe.ai/mcp`
4. Complete the OAuth flow (enter your `gtr_...` API key on the consent page)

Connectors are brokered through your Claude account, so a connector added on claude.ai is also available in Claude Desktop and the mobile apps.

**Option B — `mcp-remote` stdio bridge (advanced):**

```json
{
  "mcpServers": {
    "gettranscribe": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.gettranscribe.ai/mcp"]
    }
  }
}
```

### Troubleshooting the OAuth flow

- Start the connection from Claude's **Settings → Connectors** and complete the consent page in the same browser session. Copying the authorize URL to another browser or device breaks the flow (the callback can't reach the Claude session that initiated it).
- Pending authorization requests expire after 10 minutes and are one-time use. If you see "already completed or has expired", go back to Claude and reconnect from Settings → Connectors.
- Replay the entire OAuth flow against production with `GETTRANSCRIBE_API_KEY=gtr_... node examples/debug-oauth-flow.mjs` to verify the server end-to-end. Add `TEST_JOBS=1` to also run a full transcription job flow (costs credits) or `TEST_DOWNLOAD=1` to test the video download tool (costs $0.01).

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
    ├── transcriptions.ts # Transcription tools (get/list)
    ├── jobs.ts           # Async transcription job tools (create/poll)
    ├── folders.ts        # Folder tools (create/get/list)
    └── downloads.ts      # Video download tool (fresh CDN URL resolution)
```

## License

MIT
