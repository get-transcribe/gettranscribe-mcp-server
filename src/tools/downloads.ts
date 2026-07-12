import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Env } from "../index.js";
import {
  apiRequest,
  handleApiError,
  resolveApiKey,
} from "../services/api-client.js";

interface DownloadVideoResponse {
  id: number;
  url: string;
  platform?: string;
  user_id?: number;
  download_url?: string;
  thumbnail?: string;
  created_at?: string;
  updated_at?: string;
}

function formatDownloadMarkdown(d: DownloadVideoResponse): string {
  const lines: string[] = [];
  lines.push(`# Video Download #${d.id}`);
  lines.push("");
  if (d.platform) lines.push(`**Platform:** ${d.platform}`);
  lines.push(`**Source URL:** ${d.url}`);
  if (d.thumbnail) lines.push(`**Thumbnail:** ${d.thumbnail}`);
  lines.push("");
  if (d.download_url) {
    lines.push(`**Download URL:** ${d.download_url}`);
    lines.push("");
    lines.push(
      "⚠️ This is a temporary direct link served by the platform's CDN — it expires within minutes. Download the file promptly, and call this tool again if you need a fresh link."
    );
  } else {
    lines.push("No download URL could be resolved for this video.");
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

export function registerDownloadTools(server: McpServer, env: Env) {
  server.registerTool(
    "gettranscribe_download_video",
    {
      title: "Download Video",
      description: `Resolve a fresh, direct download URL (video file) for a video from a supported platform: Instagram, TikTok, YouTube, Facebook, Twitter/X, Pinterest, Google Drive, or a direct video URL.

Returns a temporary CDN link to the video file plus a thumbnail when available. The link expires within minutes, so download the file right away and call this tool again if you need a new link.

Notes:
- This does NOT create a transcription. Use gettranscribe_create_transcription_job to transcribe.
- Each call debits a small amount ($0.01) from the user's GetTranscribe wallet balance.
- Each call resolves a fresh URL, so repeated calls for the same video are billed separately.`,
      inputSchema: {
        url: z.string().url().describe("Full video URL from a supported platform (Instagram, TikTok, YouTube, Facebook, Twitter/X, Pinterest, Google Drive, or direct video URL)"),
        api_key: z.string().optional().describe("Your GetTranscribe API key (gtr_...). Not needed if already configured via Authorization header"),
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

        // Unlike other tools, this calls the download-video REST service directly:
        // it already supports API-key auth, balance checks, and wallet billing.
        const result = await apiRequest<DownloadVideoResponse>(
          env, apiKey, "download-video",
          {
            method: "POST",
            body: { url: args.url },
          }
        );

        if (!result?.download_url) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No download URL could be resolved for ${args.url}. The video may be private, deleted, or from an unsupported platform.`,
              },
            ],
          };
        }

        return {
          content: [{ type: "text" as const, text: formatDownloadMarkdown(result) }],
          structuredContent: {
            id: result.id,
            source_url: result.url,
            platform: result.platform,
            download_url: result.download_url,
            thumbnail: result.thumbnail,
            created_at: result.created_at,
            expires_note: "Temporary CDN link — expires within minutes, download promptly.",
          },
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
