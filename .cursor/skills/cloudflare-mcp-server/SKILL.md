---
name: cloudflare-mcp-server
description: Guide for developing, deploying, and maintaining the GetTranscribe MCP server on Cloudflare Workers. Covers project architecture, adding new tools, deployment, environment configuration, and debugging. Use when working on the MCP server, adding MCP tools, deploying to Cloudflare Workers, or troubleshooting MCP issues.
---

# GetTranscribe MCP Server — Cloudflare Workers

## Architecture Overview

This is a **stateless MCP server** running on **Cloudflare Workers** using `@cloudflare/workers-oauth-provider` for OAuth 2.1 and `agents/mcp` for the MCP protocol. It acts as a proxy between AI clients (Claude, ChatGPT, etc.) and the `gettranscribe-backend` FeathersJS API.

```
AI Client (Claude/ChatGPT)
    │
    │ 1. OAuth 2.1 flow (/authorize → user enters gtr_ API key)
    │ 2. Streamable HTTP (POST /mcp with Bearer token)
    ▼
Cloudflare Worker (this project)
  ├── OAuthProvider (token mgmt, OAUTH_KV storage)
  ├── /authorize (consent page)
  └── /mcp (MCP tools handler)
    │
    │ REST API (POST /mcp with x-api-key)
    ▼
gettranscribe-backend (FeathersJS on AWS ECS)
```

**Key decisions:**
- Separate project from backend (different runtimes: V8 vs Node.js)
- Stateless — no sessions, no Durable Objects
- **OAuth 2.1** via `@cloudflare/workers-oauth-provider` — users authenticate once
- `createMcpHandler()` from `agents/mcp` handles the MCP protocol
- User's API key stored encrypted in OAuth token `props`, retrieved via `getMcpAuthContext()`
- Backend communication goes through the `/mcp` endpoint using `tools/call` method

## Project Structure

```
gettranscribe-mcp-server/
├── src/
│   ├── index.ts              # Entry point: creates McpServer, registers tools, exports fetch handler
│   ├── tools/
│   │   ├── transcriptions.ts # Transcription tools (create, get, list)
│   │   └── folders.ts        # Folder tools (create, get, list)
│   └── services/
│       └── api-client.ts     # Centralized fetch client for backend communication
├── wrangler.toml             # Cloudflare Worker config
├── tsconfig.json
└── package.json
```

## Tech Stack

- **Runtime:** Cloudflare Workers (V8 isolates)
- **Auth:** `@cloudflare/workers-oauth-provider` (OAuth 2.1 + PKCE)
- **MCP SDK:** `@modelcontextprotocol/sdk` (McpServer, registerTool)
- **Agents SDK:** `agents` package (`createMcpHandler`, `getMcpAuthContext`)
- **Validation:** `zod` v4 for input schemas
- **Token storage:** Cloudflare KV (`OAUTH_KV` namespace)
- **Language:** TypeScript (strict mode)
- **Build/Deploy:** `wrangler` CLI

## Adding a New Tool

### Step 1: Define the tool in the appropriate file

Tools live in `src/tools/`. Create a new file or add to an existing one.

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Env } from "../index.js";
import { apiRequest, handleApiError, resolveApiKey } from "../services/api-client.js";

export function registerMyTools(server: McpServer, env: Env) {
  server.registerTool(
    "gettranscribe_action_resource",
    {
      title: "Human-Readable Title",
      description: "Clear description of what this tool does, what it returns, and when to use it.",
      inputSchema: {
        param1: z.string().describe("Description of param1"),
        api_key: z.string().optional().describe("Your GetTranscribe API key (gtr_...)"),
      },
      annotations: {
        readOnlyHint: true,       // false if it creates/modifies data
        destructiveHint: false,
        idempotentHint: true,     // false if calling twice produces different results
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const apiKey = resolveApiKey(env, args.api_key);
        if (!apiKey) {
          return {
            isError: true as const,
            content: [{ type: "text" as const, text: "Error: API key required." }],
          };
        }

        const result = await apiRequest<{ content: { type: string; text: string }[] }>(
          env, apiKey, "mcp",
          {
            method: "POST",
            body: {
              method: "tools/call",
              params: {
                name: "backend_tool_name",
                arguments: { param1: args.param1 },
              },
            },
          }
        );

        const responseText = result.content?.[0]?.text;
        if (!responseText) {
          return { content: [{ type: "text" as const, text: "No data returned." }] };
        }

        let parsed: YourType;
        try {
          parsed = JSON.parse(responseText);
        } catch {
          return { content: [{ type: "text" as const, text: responseText }] };
        }

        return {
          content: [{ type: "text" as const, text: formatAsMarkdown(parsed) }],
          structuredContent: formatAsRecord(parsed),
        };
      } catch (error) {
        return {
          isError: true as const,
          content: [{ type: "text" as const, text: handleApiError(error) }],
        };
      }
    }
  );
}
```

### Step 2: Register in index.ts

```typescript
import { registerMyTools } from "./tools/my-tools.js";

function createServer(env: Env) {
  const server = new McpServer({ name: "gettranscribe-mcp-server", version: "2.0.0" });
  registerTranscriptionTools(server, env);
  registerFolderTools(server, env);
  registerMyTools(server, env);     // <-- add here
  return server;
}
```

### Step 3: Add backend handler

The backend must also handle the new tool. In `gettranscribe-backend`:
1. Create handler in `src/services/mcp/hooks/your-tool-name.js`
2. Register in `src/services/mcp/mcp.class.js` under `tools/call` dispatch

## Tool Naming Convention

All tool names: `gettranscribe_{action}_{resource}`

| Action | Use |
|--------|-----|
| `create` | Creates a new resource |
| `get` | Retrieves one resource by ID |
| `list` | Lists resources with pagination |
| `update` | Modifies an existing resource |
| `delete` | Removes a resource |

## API Client Pattern

All backend calls go through `src/services/api-client.ts`:

```typescript
const result = await apiRequest<ResponseType>(env, apiKey, "mcp", {
  method: "POST",
  body: {
    method: "tools/call",
    params: { name: "backend_tool_name", arguments: { ... } },
  },
});
```

- Always use `resolveApiKey(env, args.api_key)` for API key resolution
- Always wrap in try/catch and use `handleApiError(error)` for error formatting
- The backend endpoint is always `POST /mcp` with `x-api-key` header

## Response Format

Every tool must return both human-readable and structured content:

```typescript
return {
  content: [{ type: "text" as const, text: markdownString }],
  structuredContent: { ...recordObject },
};
```

- `content`: Markdown formatted text for display (limit to `CHARACTER_LIMIT = 25000` chars)
- `structuredContent`: `Record<string, unknown>` with typed data for programmatic use

## Environment Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `GETTRANSCRIBE_API_URL` | `wrangler.toml` [vars] | Backend API base URL |
| `MCP_PATH` | `wrangler.toml` [vars] | Route path (default: `/mcp`) |
| `OAUTH_KV` | `wrangler.toml` [[kv_namespaces]] | KV namespace for OAuth token storage |

## Authentication Model (OAuth 2.1)

The server uses `@cloudflare/workers-oauth-provider` wrapping the entire Worker. The `OAuthProvider` handles:
- Dynamic client registration (`/register`)
- Token exchange (`/token`)
- Token validation on every `/mcp` request
- `.well-known` metadata endpoints

**Flow:**
1. MCP client connects to `/mcp` → gets **401** with OAuth metadata
2. Client registers via `/register` (dynamic client registration)
3. Client redirects user to `/authorize` → consent page
4. User enters their `gtr_...` API key → verified against backend `GET /users/me`
5. `completeAuthorization()` stores the API key in encrypted `props`
6. Client exchanges auth code at `/token` → receives access + refresh tokens
7. On every MCP request, `OAuthProvider` validates the token and passes `props` to the handler
8. `getMcpAuthContext()` retrieves `props.apiKey` inside the MCP handler

**Key code in `src/index.ts`:**
```typescript
const mcpHandler = {
  async fetch(request, env, ctx) {
    const auth = getMcpAuthContext();
    const apiKey = auth?.props?.apiKey as string;
    const enrichedEnv = apiKey ? { ...env, GETTRANSCRIBE_API_KEY: apiKey } : env;
    const server = createServer(enrichedEnv);
    return createMcpHandler(server)(request, enrichedEnv, ctx);
  },
};

export default new OAuthProvider({
  apiRoute: "/mcp",
  apiHandler: mcpHandler,
  defaultHandler: authHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
```

**No API key is stored in plaintext** — the `OAuthProvider` encrypts `props` with the token as key material.

## Development

```bash
npm run dev          # Local dev server with wrangler
npm run typecheck    # TypeScript check
npm run cf-typegen   # Generate Cloudflare types
```

Local dev runs at `http://localhost:8787/mcp`

Test with curl:
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'
```

## Deployment

```bash
export CLOUDFLARE_API_TOKEN=your_token
npm run deploy
```

**Production URL:** `https://gettranscribe-mcp-server.daniel-c6b.workers.dev/mcp`

Token requirements: the Cloudflare API token needs `Workers Scripts:Edit` permission.

If `workers.dev` shows "Inactive" in the dashboard, enable it via: Worker > Settings > Domains & Routes > workers.dev > Enable.

## Debugging

- `wrangler tail` — live log streaming from production
- `wrangler deployments list` — see deployment history
- Check `Accept` headers: clients must send `Accept: application/json, text/event-stream`

## Important Constraints

1. **No Node.js APIs** — Workers use V8 runtime, not Node.js. Use `fetch` instead of `axios`, `crypto` via Web Crypto API, etc.
2. **No `server.tool()`** — use `server.registerTool()` (the former is deprecated)
3. **Zod v4** — this project uses Zod v4, not v3. Import is the same (`import { z } from "zod"`)
4. **structuredContent type** — must be `Record<string, unknown>` (include `[x: string]: unknown` in custom interfaces if needed)
5. **CHARACTER_LIMIT** — truncate Markdown responses exceeding 25000 chars
6. **All tools must accept `api_key`** as optional param for per-request override (OAuth provides the default)
7. **OAuthProvider is the default export** — it wraps the entire Worker, not `ExportedHandler`
8. **`getMcpAuthContext()`** — use this inside MCP tool handlers to get the authenticated user's `props` (contains `apiKey` and `userId`)
