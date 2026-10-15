# gettranscribe-mcp-server

Rules are shared with Cursor in `.cursor/rules/`; skills in `.cursor/skills/` (linked from `.claude/skills`).

@.cursor/rules/general.mdc

Note: the folder tree in that rule is outdated. The server is now a Cloudflare Worker in TypeScript: entry `src/index.ts`, tools in `src/tools/*.ts`, API client in `src/services/api-client.ts`, config in `wrangler.toml`.

Commands: `npm run dev` (wrangler dev), `npm run typecheck`, `npm run deploy`.
