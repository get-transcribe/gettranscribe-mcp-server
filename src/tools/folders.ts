import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Env } from "../index.js";
import {
  apiRequest,
  handleApiError,
  resolveApiKey,
} from "../services/api-client.js";

interface FolderResponse {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

interface FolderDetailResponse extends FolderResponse {
  subfolders?: {
    total: number;
    data: FolderResponse[];
  };
  transcriptions?: {
    total: number;
    data: {
      id: number;
      url: string;
      title?: string;
      platform: string;
      duration?: number;
      word_count?: number;
      created_at: string;
      thumbnail_url?: string;
    }[];
  };
}

interface PaginatedResponse<T> {
  total: number;
  limit: number;
  skip: number;
  data: T[];
}

function folderToRecord(folder: FolderResponse | FolderDetailResponse): Record<string, unknown> {
  return { ...folder } as Record<string, unknown>;
}

function formatFolderMarkdown(folder: FolderDetailResponse): string {
  const lines: string[] = [];
  lines.push(`# Folder: ${folder.name} (ID: ${folder.id})`);
  lines.push("");
  if (folder.parent_id) lines.push(`**Parent Folder ID:** ${folder.parent_id}`);
  lines.push(`**Created:** ${new Date(folder.created_at).toLocaleDateString()}`);
  lines.push("");

  if (folder.subfolders && folder.subfolders.data.length > 0) {
    lines.push(`## Subfolders (${folder.subfolders.total})`);
    lines.push("");
    for (const sf of folder.subfolders.data) {
      lines.push(`- **${sf.name}** (ID: ${sf.id})`);
    }
    lines.push("");
  }

  if (folder.transcriptions && folder.transcriptions.data.length > 0) {
    lines.push(`## Transcriptions (${folder.transcriptions.total})`);
    lines.push("");
    for (const t of folder.transcriptions.data) {
      lines.push(
        `- **#${t.id}** ${t.title || `${t.platform} video`} (${t.platform})${t.duration ? ` - ${Math.round(t.duration / 60)}m` : ""}`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

function formatFolderListMarkdown(data: FolderResponse[], total: number): string {
  if (data.length === 0) {
    return "No folders found. Create one to organize your transcriptions.";
  }

  const lines: string[] = [];
  lines.push(`# Your Folders (${total} total)`);
  lines.push("");

  for (const folder of data) {
    lines.push(`## ${folder.name} (ID: ${folder.id})`);
    if (folder.parent_id) lines.push(`- Parent Folder ID: ${folder.parent_id}`);
    lines.push(`- Created: ${new Date(folder.created_at).toLocaleDateString()}`);
    lines.push("");
  }

  if (total > data.length) {
    lines.push(`_Showing ${data.length} of ${total} folders_`);
  }

  return lines.join("\n");
}

function noApiKeyError() {
  return {
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text: "Error: API key required. Provide api_key parameter or set GETTRANSCRIBE_API_KEY secret.",
      },
    ],
  };
}

export function registerFolderTools(server: McpServer, env: Env) {
  server.registerTool(
    "gettranscribe_create_folder",
    {
      title: "Create Folder",
      description: `Create a new folder to organize your transcriptions. Folders can be nested by specifying a parent_id.`,
      inputSchema: {
        name: z.string().min(1).max(255).describe("Name for the new folder"),
        api_key: z.string().optional().describe("Your GetTranscribe API key (gtr_...). Not needed if already configured via Authorization header"),
        parent_id: z.number().int().optional().describe("Parent folder ID for nested folder structure"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const apiKey = resolveApiKey(env, args.api_key);
        if (!apiKey) return noApiKeyError();

        const result = await apiRequest<{ content: { type: string; text: string }[] }>(
          env, apiKey, "mcp",
          {
            method: "POST",
            body: {
              method: "tools/call",
              params: {
                name: "create_transcription_folder",
                arguments: { name: args.name, parent_id: args.parent_id || null },
              },
            },
          }
        );

        const responseText = result.content?.[0]?.text;
        if (!responseText) {
          return { content: [{ type: "text" as const, text: "Folder created but no details returned." }] };
        }

        let folder: FolderResponse;
        try {
          folder = JSON.parse(responseText);
        } catch {
          return { content: [{ type: "text" as const, text: responseText }] };
        }

        return {
          content: [{ type: "text" as const, text: `Folder "${folder.name}" created successfully (ID: ${folder.id}).` }],
          structuredContent: folderToRecord(folder),
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
    "gettranscribe_get_folder",
    {
      title: "Get Folder",
      description: `Retrieve a specific folder by ID, including its subfolders and transcriptions.`,
      inputSchema: {
        folder_id: z.number().int().positive().describe("The numeric ID of the folder to retrieve"),
        api_key: z.string().optional().describe("Your GetTranscribe API key (gtr_...). Not needed if already configured via Authorization header"),
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

        const result = await apiRequest<{ content: { type: string; text: string }[] }>(
          env, apiKey, "mcp",
          {
            method: "POST",
            body: {
              method: "tools/call",
              params: {
                name: "get_transcription_folder",
                arguments: { folder_id: args.folder_id },
              },
            },
          }
        );

        const responseText = result.content?.[0]?.text;
        if (!responseText) {
          return { content: [{ type: "text" as const, text: "Folder not found." }] };
        }

        let folder: FolderDetailResponse;
        try {
          folder = JSON.parse(responseText);
        } catch {
          return { content: [{ type: "text" as const, text: responseText }] };
        }

        return {
          content: [{ type: "text" as const, text: formatFolderMarkdown(folder) }],
          structuredContent: folderToRecord(folder),
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
    "gettranscribe_list_folders",
    {
      title: "List Folders",
      description: `List your transcription folders with optional filtering and pagination. Filter by parent_id to get subfolders of a specific folder.`,
      inputSchema: {
        api_key: z.string().optional().describe("Your GetTranscribe API key (gtr_...). Not needed if already configured via Authorization header"),
        parent_id: z.number().int().optional().describe("Filter by parent folder ID. Omit to list root folders"),
        limit: z.number().int().min(1).max(50).default(10).describe("Results per page (default: 10, max: 50)"),
        skip: z.number().int().min(0).default(0).describe("Number of results to skip for pagination"),
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

        const toolArgs: Record<string, unknown> = {
          limit: args.limit,
          skip: args.skip,
        };
        if (args.parent_id !== undefined) toolArgs.parent_id = args.parent_id;

        const result = await apiRequest<{ content: { type: string; text: string }[] }>(
          env, apiKey, "mcp",
          {
            method: "POST",
            body: {
              method: "tools/call",
              params: { name: "list_transcription_folders", arguments: toolArgs },
            },
          }
        );

        const responseText = result.content?.[0]?.text;
        if (!responseText) {
          return { content: [{ type: "text" as const, text: "No folders found." }] };
        }

        let parsed: PaginatedResponse<FolderResponse>;
        try {
          parsed = JSON.parse(responseText);
        } catch {
          return { content: [{ type: "text" as const, text: responseText }] };
        }

        const markdown = formatFolderListMarkdown(parsed.data, parsed.total);

        const structuredOutput: Record<string, unknown> = {
          total: parsed.total,
          count: parsed.data.length,
          limit: parsed.limit,
          skip: parsed.skip,
          has_more: parsed.total > parsed.skip + parsed.data.length,
          data: parsed.data.map(folderToRecord),
        };
        if (parsed.total > parsed.skip + parsed.data.length) {
          structuredOutput.next_skip = parsed.skip + parsed.data.length;
        }

        return {
          content: [{ type: "text" as const, text: markdown }],
          structuredContent: structuredOutput,
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
