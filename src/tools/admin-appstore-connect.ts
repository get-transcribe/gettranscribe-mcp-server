import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Env } from "../index.js";
import {
  ApiError,
  resolveApiKey,
} from "../services/api-client.js";
import {
  ascRequest,
  handleAscError,
  type AscHttpMethod,
} from "../services/asc-client.js";
import { isMcpAdminUserId } from "./admin-sql.js";

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

async function assertMcpAdmin(env: Env, apiKey: string): Promise<void> {
  const baseUrl = env.GETTRANSCRIBE_API_URL || "https://api.gettranscribe.ai";
  const res = await fetch(`${baseUrl}/users/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "x-api-key": apiKey,
    },
  });

  if (!res.ok) {
    throw new ApiError(
      res.status === 401
        ? "Invalid API key. Please check your GetTranscribe API key and try again."
        : `Could not verify user (status ${res.status})`,
      res.status
    );
  }

  const me = (await res.json()) as { id?: number | string };
  if (!isMcpAdminUserId(me.id)) {
    throw new ApiError(
      "Admin only (user id 1 or 2). Your API key cannot use App Store Connect tools.",
      403
    );
  }
}

/**
 * Admin-only App Store Connect proxy. Register only when MCP_USER_ID is 1 or 2.
 */
export function registerAdminAppStoreConnectTools(server: McpServer, env: Env) {
  const vendorNumber = env.APPLE_VENDOR_NUMBER?.trim() || "";
  const vendorHint = vendorNumber
    ? ` For finance/sales reports (/v1/salesReports, /v1/financeReports) always pass query filter[vendorNumber]=${vendorNumber} (configured Apple vendor number).`
    : " For finance/sales reports, APPLE_VENDOR_NUMBER is not configured on this Worker.";

  server.registerTool(
    "gettranscribe_appstore_connect_request",
    {
      title: "App Store Connect API Request",
      description:
        "Admin only (user id 1 or 2). Send any HTTP request to Apple's App Store Connect API " +
        "(https://api.appstoreconnect.apple.com). " +
        "Pass a relative path such as /v1/apps, /v1/apps/{id}, /v1/salesReports, /v1/financeReports, etc. " +
        "Auth (JWT ES256) is handled by the server — do not pass Apple credentials. " +
        "Sales/finance report endpoints return gzip (application/a-gzip); this tool auto-decompresses them to TSV text — do not expect JSON for those. " +
        "Use filter[…] and include query params as documented by Apple. " +
        "GET for reads; POST/PATCH/DELETE for mutations (be careful — these change ASC data)." +
        vendorHint,
      inputSchema: {
        method: z
          .enum(["GET", "POST", "PATCH", "DELETE"])
          .describe("HTTP method for the App Store Connect API call"),
        path: z
          .string()
          .min(1)
          .describe(
            'Relative API path starting with /v1/… (e.g. "/v1/apps", "/v1/apps/1234567890"). Do not pass a full URL.'
          ),
        query: z
          .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
          .optional()
          .describe(
            'Optional query parameters as a flat object (e.g. { "filter[bundleId]": "ai.gettranscribe.ios", "limit": 50 })'
          ),
        body: z
          .union([z.record(z.string(), z.unknown()), z.array(z.unknown()), z.string()])
          .optional()
          .describe(
            "Optional JSON body for POST/PATCH (object, array, or JSON string). Omit for GET/DELETE."
          ),
        api_key: z
          .string()
          .optional()
          .describe(
            "Your GetTranscribe API key (gtr_...). Not needed if already configured via OAuth."
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const apiKey = resolveApiKey(env, args.api_key);
        if (!apiKey) return noApiKeyError();

        await assertMcpAdmin(env, apiKey);

        const result = await ascRequest(env, {
          method: args.method as AscHttpMethod,
          path: args.path,
          query: args.query,
          body: args.body,
        });

        const payload = {
          status: result.status,
          statusText: result.statusText,
          vendorNumber: vendorNumber || null,
          body: result.body,
        };
        const responseText = truncate(JSON.stringify(payload, null, 2));
        const isError = result.status >= 400;

        return {
          isError,
          content: [{ type: "text" as const, text: responseText }],
          structuredContent: {
            status: result.status,
            statusText: result.statusText,
            vendorNumber: vendorNumber || null,
            headers: result.headers,
            body: result.body,
          },
        };
      } catch (error) {
        const message =
          error instanceof ApiError
            ? `Error: ${error.message}`
            : handleAscError(error);
        return {
          isError: true as const,
          content: [{ type: "text" as const, text: message }],
        };
      }
    }
  );
}
