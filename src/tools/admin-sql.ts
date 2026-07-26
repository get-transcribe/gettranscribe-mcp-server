import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Env } from "../index.js";
import {
  apiRequest,
  handleApiError,
  resolveApiKey,
} from "../services/api-client.js";

const CHARACTER_LIMIT = 25000;

function noApiKeyError() {
  return {
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text: "Error: API key required. Connect via OAuth or pass api_key.",
      },
    ],
  };
}

function truncate(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return (
    text.slice(0, CHARACTER_LIMIT) +
    `\n\n… truncated (${text.length} chars total; limit ${CHARACTER_LIMIT})`
  );
}

async function callBackendAdminTool(
  env: Env,
  apiKey: string,
  name: "describe_schema" | "query_database",
  args: Record<string, unknown>
) {
  return apiRequest<{ content: { type: string; text: string }[]; isError?: boolean }>(
    env,
    apiKey,
    "mcp",
    {
      method: "POST",
      body: {
        method: "tools/call",
        params: { name, arguments: args },
      },
    }
  );
}

/**
 * Admin-only SQL tools. Caller must only register these when MCP_USER_ID is 1 or 2.
 */
export function registerAdminSqlTools(server: McpServer, env: Env) {
  server.registerTool(
    "gettranscribe_describe_schema",
    {
      title: "Describe Database Schema",
      description:
        "Admin only (user id 1 or 2). START HERE before writing SQL. " +
        "Step 1: call with no args to list every public table. " +
        "Step 2: call again with table=<name> to see columns + indexes for that table. " +
        "Then use gettranscribe_query_database with a SELECT that only uses those columns. " +
        "Covers the full public schema (users, wallets, transcriptions, jobs, folders, webhooks, etc.). Read-only.",
      inputSchema: {
        table: z
          .string()
          .optional()
          .describe(
            'Omit to list ALL public tables first. Then pass one table name (e.g. "users", "transcriptions", "wallet_transactions") to list its columns and indexes before querying.'
          ),
        api_key: z
          .string()
          .optional()
          .describe(
            "Your GetTranscribe API key (gtr_...). Not needed if already configured via OAuth."
          ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const apiKey = resolveApiKey(env, args.api_key);
        if (!apiKey) return noApiKeyError();

        const result = await callBackendAdminTool(env, apiKey, "describe_schema", {
          table: args.table,
        });

        const responseText = result.content?.[0]?.text || "No data returned.";
        let structured: Record<string, unknown> = { raw: responseText };
        try {
          structured = JSON.parse(responseText) as Record<string, unknown>;
        } catch {
          // keep raw
        }

        return {
          isError: Boolean(result.isError),
          content: [{ type: "text" as const, text: truncate(responseText) }],
          structuredContent: structured,
        };
      } catch (error) {
        return {
          isError: true as const,
          content: [{ type: "text" as const, text: handleApiError(error) }],
        };
      }
    }
  );

  server.registerTool(
    "gettranscribe_query_database",
    {
      title: "Query Database (Read-Only)",
      description:
        "Admin only (user id 1 or 2). Run ONE read-only SELECT (or WITH … SELECT) against any public table. " +
        "REQUIRED WORKFLOW: (1) gettranscribe_describe_schema with no args → pick tables, " +
        "(2) describe_schema with table=<name> → confirm columns, " +
        "(3) then call this tool. Do not guess column names. " +
        "Mutations/DDL rejected. Auto LIMIT default 100 (max 500). " +
        "TOAST safety: never SELECT * / transcription / original_transcription / segments / words / analysis blobs " +
        "on transcriptions or transcription_demo for multi-row queries — use char_count, word_count, platform, created_at, etc. " +
        "Heavy text only with WHERE id = <single id> when the user explicitly needs that row.",
      inputSchema: {
        sql: z
          .string()
          .min(1)
          .describe(
            "A single SELECT or WITH … SELECT. Prefer explicit columns discovered via gettranscribe_describe_schema. Always include WHERE + LIMIT for exploratory queries."
          ),
        max_rows: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .describe("Max rows to return (default 100, max 500)"),
        api_key: z
          .string()
          .optional()
          .describe(
            "Your GetTranscribe API key (gtr_...). Not needed if already configured via OAuth."
          ),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const apiKey = resolveApiKey(env, args.api_key);
        if (!apiKey) return noApiKeyError();

        const result = await callBackendAdminTool(env, apiKey, "query_database", {
          sql: args.sql,
          max_rows: args.max_rows,
        });

        const responseText = result.content?.[0]?.text || "No data returned.";
        let structured: Record<string, unknown> = { raw: responseText };
        try {
          structured = JSON.parse(responseText) as Record<string, unknown>;
        } catch {
          // keep raw
        }

        return {
          isError: Boolean(result.isError),
          content: [{ type: "text" as const, text: truncate(responseText) }],
          structuredContent: structured,
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

/** Numeric GetTranscribe user ids allowed to see/use admin SQL tools. */
export const MCP_ADMIN_USER_IDS = [1, 2] as const;

export function isMcpAdminUserId(userId: unknown): boolean {
  const n = Number(userId);
  return MCP_ADMIN_USER_IDS.includes(n as 1 | 2);
}
