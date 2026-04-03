import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Env } from "../index.js";
import {
  apiRequest,
  handleApiError,
  resolveApiKey,
} from "../services/api-client.js";

const CHARACTER_LIMIT = 25000;

interface TranscriptionResponse {
  id: number;
  url: string;
  title?: string;
  platform: string;
  transcription: string;
  transcription_segments?: string;
  language?: string;
  duration?: number;
  created_at: string;
  thumbnail_url?: string;
  folder_id?: number;
  word_count?: number;
}

interface PaginatedResponse<T> {
  total: number;
  limit: number;
  skip: number;
  data: T[];
}

function formatTranscription(t: TranscriptionResponse): Record<string, unknown> {
  return {
    id: t.id,
    video_url: t.url,
    video_title: t.title || `${t.platform} video ${t.id}`,
    platform: t.platform,
    transcription: t.transcription,
    language: t.language,
    duration: t.duration,
    created_at: t.created_at,
    thumbnail_url: t.thumbnail_url,
    folder_id: t.folder_id,
    word_count: t.word_count,
  };
}

function formatTranscriptionMarkdown(t: TranscriptionResponse): string {
  const lines: string[] = [];
  lines.push(`# Transcription #${t.id}`);
  lines.push("");
  lines.push(`**Platform:** ${t.platform}`);
  if (t.duration)
    lines.push(
      `**Duration:** ${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, "0")}`
    );
  if (t.word_count) lines.push(`**Word Count:** ${t.word_count}`);
  if (t.language) lines.push(`**Language:** ${t.language.toUpperCase()}`);
  lines.push(`**Created:** ${new Date(t.created_at).toLocaleDateString()}`);
  if (t.url) lines.push(`**URL:** ${t.url}`);
  lines.push("");
  if (t.transcription) {
    lines.push("## Transcription Text");
    lines.push("");
    lines.push(t.transcription);
  }
  return lines.join("\n");
}

function formatTranscriptionListMarkdown(
  data: TranscriptionResponse[],
  total: number
): string {
  if (data.length === 0) {
    return "No transcriptions found. Create one by providing a video URL.";
  }

  const lines: string[] = [];
  lines.push(`# Your Transcriptions (${total} total)`);
  lines.push("");

  const platformLabel: Record<string, string> = {
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    meta: "Meta",
  };

  for (const t of data) {
    lines.push(
      `## ${t.id}. ${t.title || `${t.platform} video`} (${platformLabel[t.platform] || t.platform})`
    );
    if (t.language) lines.push(`- Language: ${t.language.toUpperCase()}`);
    if (t.duration) lines.push(`- Duration: ${Math.round(t.duration / 60)}m`);
    lines.push(`- Created: ${new Date(t.created_at).toLocaleDateString()}`);
    if (t.url) lines.push(`- URL: ${t.url}`);
    if (t.transcription) {
      const preview = t.transcription.substring(0, 150);
      lines.push(
        `- Preview: "${preview}${t.transcription.length > 150 ? "..." : ""}"`
      );
    }
    lines.push("");
  }

  if (total > data.length) {
    lines.push(`_Showing ${data.length} of ${total} transcriptions_`);
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

export function registerTranscriptionTools(server: McpServer, env: Env) {
  server.registerTool(
    "gettranscribe_create_transcription",
    {
      title: "Create Transcription",
      description: `Create a new transcription from a video URL. Supports Instagram, TikTok, YouTube, and Meta (Facebook) videos. The transcription process downloads the video, extracts audio, and transcribes it using AI. This may take 10-60 seconds depending on video length.`,
      inputSchema: {
        url: z.string().url().describe("Full video URL from a supported platform"),
        api_key: z.string().optional().describe("Your GetTranscribe API key (gtr_...). Not needed if already configured via Authorization header"),
        folder_id: z.number().int().optional().describe("Folder ID to organize the transcription into"),
        prompt: z.string().optional().describe("Custom prompt to guide the transcription"),
        language: z.string().max(5).optional().describe("Target language code (e.g., 'en', 'es', 'fr')"),
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
                name: "create_transcription",
                arguments: {
                  url: args.url,
                  folder_id: args.folder_id || null,
                  prompt: args.prompt || null,
                  language: args.language || null,
                },
              },
            },
          }
        );

        const responseText = result.content?.[0]?.text;
        if (!responseText) {
          return { content: [{ type: "text" as const, text: "Transcription created but no content returned." }] };
        }

        let transcription: TranscriptionResponse;
        try {
          transcription = JSON.parse(responseText);
        } catch {
          return { content: [{ type: "text" as const, text: responseText }] };
        }

        return {
          content: [{ type: "text" as const, text: formatTranscriptionMarkdown(transcription) }],
          structuredContent: formatTranscription(transcription),
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
    "gettranscribe_get_transcription",
    {
      title: "Get Transcription",
      description: `Retrieve a specific transcription by its ID. Returns full transcription details including the transcribed text, video metadata, platform info, and timestamps.`,
      inputSchema: {
        transcription_id: z.number().int().positive().describe("The numeric ID of the transcription to retrieve"),
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
                name: "get_transcription",
                arguments: { transcription_id: args.transcription_id },
              },
            },
          }
        );

        const responseText = result.content?.[0]?.text;
        if (!responseText) {
          return { content: [{ type: "text" as const, text: "No transcription found." }] };
        }

        let transcription: TranscriptionResponse;
        try {
          transcription = JSON.parse(responseText);
        } catch {
          return { content: [{ type: "text" as const, text: responseText }] };
        }

        return {
          content: [{ type: "text" as const, text: formatTranscriptionMarkdown(transcription) }],
          structuredContent: formatTranscription(transcription),
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
    "gettranscribe_list_transcriptions",
    {
      title: "List Transcriptions",
      description: `List your transcriptions with optional filtering by folder or platform, and pagination support. Returns a paginated list of transcriptions with metadata.`,
      inputSchema: {
        api_key: z.string().optional().describe("Your GetTranscribe API key (gtr_...). Not needed if already configured via Authorization header"),
        folder_id: z.number().int().optional().describe("Filter by folder ID. Omit to list all transcriptions"),
        platform: z.enum(["instagram", "tiktok", "youtube", "meta"]).optional().describe("Filter by platform"),
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
        if (args.folder_id !== undefined) toolArgs.folder_id = args.folder_id;
        if (args.platform !== undefined) toolArgs.platform = args.platform;

        const result = await apiRequest<{ content: { type: string; text: string }[] }>(
          env, apiKey, "mcp",
          {
            method: "POST",
            body: {
              method: "tools/call",
              params: { name: "list_transcriptions", arguments: toolArgs },
            },
          }
        );

        const responseText = result.content?.[0]?.text;
        if (!responseText) {
          return { content: [{ type: "text" as const, text: "No transcriptions found." }] };
        }

        let parsed: PaginatedResponse<TranscriptionResponse>;
        try {
          parsed = JSON.parse(responseText);
        } catch {
          return { content: [{ type: "text" as const, text: responseText }] };
        }

        let markdown = formatTranscriptionListMarkdown(parsed.data, parsed.total);
        if (markdown.length > CHARACTER_LIMIT) {
          const half = Math.max(1, Math.floor(parsed.data.length / 2));
          markdown = formatTranscriptionListMarkdown(parsed.data.slice(0, half), parsed.total);
          markdown += "\n\n_Response truncated. Use skip parameter to see more results._";
        }

        const structuredOutput: Record<string, unknown> = {
          total: parsed.total,
          count: parsed.data.length,
          limit: parsed.limit,
          skip: parsed.skip,
          has_more: parsed.total > parsed.skip + parsed.data.length,
          data: parsed.data.map(formatTranscription),
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
