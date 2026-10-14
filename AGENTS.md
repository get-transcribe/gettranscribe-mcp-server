# AGENTS.md

## Cursor Cloud specific instructions

Remote MCP server on Cloudflare Workers (Wrangler). Standard commands are in `package.json` (`npm run dev`, `npm run deploy`, `npm run typecheck`, `npm run cf-typegen`). Node `>= 18`.

### Running locally
- `npm run dev` starts `wrangler dev` on `http://localhost:8787`. It uses local (Miniflare) KV automatically, so the production `OAUTH_KV` id in `wrangler.toml` is not needed for local dev.
- Only `/mcp` and the OAuth paths are served. `GET /` returns 404 — that is expected; verify liveness via `GET /.well-known/oauth-authorization-server` (returns JSON metadata) instead.
- `wrangler.toml` `[vars] GETTRANSCRIBE_API_URL` points at production (`https://api.gettranscribe.ai`). To exercise the MCP → backend path against a local backend, override it (e.g. a `.dev.vars` `GETTRANSCRIBE_API_URL=http://localhost:3031`). Full OAuth E2E still requires a real GetTranscribe API key (`gtr_...`) verified by the backend.
- There is no lint or test script; `npm run typecheck` (`tsc --noEmit`) is the check.
- The `web/` subfolder is a separate esbuild project for ChatGPT Apps SDK UI components (`web/` has its own `package.json`).
