import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Env } from "../index.js";
import {
  apiRequest,
  handleApiError,
  resolveApiKey,
} from "../services/api-client.js";

interface TranscriptionJobResponse {
  job_id: number;
  status: string;
  video_url?: string;
  platform?: string;
  folder_id?: number | null;
  transcription_id?: number | null;
  error_message?: string | null;
  created_at?: string;
  updated_at?: string;
  typical_video_duration_seconds?: { p50?: number; p90?: number };
  suggested_first_poll_after_seconds?: number;
  suggested_poll_interval_seconds?: number;
  estimated_ready_within_seconds?: number;
  wait_guidance?: string;
  duration_source?: string;
  duration_note?: string;
}

function formatJobMarkdown(job: TranscriptionJobResponse): string {
  const lines: string[] = [];
  lines.push(`# Transcription Job #${job.job_id}`);
  lines.push("");
  lines.push(`**Status:** ${job.status}`);
  if (job.video_url) lines.push(`**URL:** ${job.video_url}`);
  if (job.platform) lines.push(`**Platform:** ${job.platform}`);
  if (job.folder_id) lines.push(`**Folder ID:** ${job.folder_id}`);
  if (job.created_at) lines.push(`**Created:** ${new Date(job.created_at).toLocaleString()}`);
  lines.push("");

  if (job.status === "pending" || job.status === "processing") {
    if (job.typical_video_duration_seconds?.p50 != null) {
      lines.push("## Wait guidance (historical averages for this platform)");
      lines.push("");
      lines.push(
        `- Typical video length: ~${job.typical_video_duration_seconds.p50}s median` +
          (job.typical_video_duration_seconds.p90 != null
            ? `, ~${job.typical_video_duration_seconds.p90}s at p90`
            : "")
      );
      if (job.suggested_first_poll_after_seconds != null) {
        lines.push(`- First poll after: **${job.suggested_first_poll_after_seconds}s**`);
      }
      if (job.suggested_poll_interval_seconds != null) {
        lines.push(`- Then poll every: **${job.suggested_poll_interval_seconds}s**`);
      }
      if (job.estimated_ready_within_seconds != null) {
        lines.push(`- Often ready within: **~${job.estimated_ready_within_seconds}s**`);
      }
      if (job.wait_guidance) {
        lines.push(`- ${job.wait_guidance}`);
      }
      lines.push("");
    }
  }

  switch (job.status) {
    case "completed":
      lines.push(`✅ The transcription is ready. Call gettranscribe_get_transcription with transcription_id ${job.transcription_id} to fetch the full transcript.`);
      break;
    case "failed":
      lines.push(`❌ The job failed: ${job.error_message || "Unknown error"}`);
      break;
    default:
      lines.push(
        `⏳ Still ${job.status}. Wait about ${job.suggested_first_poll_after_seconds ?? 15}s, then check again with gettranscribe_get_transcription_job (job_id ${job.job_id})${
          job.suggested_poll_interval_seconds
            ? ` every ~${job.suggested_poll_interval_seconds}s`
            : ""
        } until status is completed or failed.`
      );
      break;
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

export function registerJobTools(server: McpServer, env: Env) {
  server.registerTool(
    "gettranscribe_create_transcription_job",
    {
      title: "Create Transcription Job",
      description: `Start an asynchronous transcription job for a video URL (Instagram, TikTok, YouTube, Meta/Facebook). Returns a job_id immediately without blocking or timing out. This is the only way to create transcriptions via MCP.

The create response includes wait guidance from historical duration percentiles for that platform (median/p90 video length, suggested first poll delay, poll interval, and estimated ready window). Use those fields to decide when to poll — do not busy-loop.

Workflow:
1. Call this tool with the video URL → returns job_id with status "pending" plus wait guidance.
2. Wait suggested_first_poll_after_seconds, then poll gettranscribe_get_transcription_job every suggested_poll_interval_seconds until status is "completed" (or failed).
3. When completed, fetch the full transcript with gettranscribe_get_transcription using the returned transcription_id.`,
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
                name: "create_transcription_job",
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
          return { content: [{ type: "text" as const, text: "Job created but no content returned." }] };
        }

        let job: TranscriptionJobResponse;
        try {
          job = JSON.parse(responseText);
        } catch {
          return { content: [{ type: "text" as const, text: responseText }] };
        }

        return {
          content: [{ type: "text" as const, text: formatJobMarkdown(job) }],
          structuredContent: { ...job },
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
    "gettranscribe_get_transcription_job",
    {
      title: "Get Transcription Job Status",
      description: `Check the status of an asynchronous transcription job created with gettranscribe_create_transcription_job.

Statuses:
- "pending" or "processing": not ready yet — wait a few seconds and call this tool again.
- "completed": the response includes transcription_id — fetch the full transcript with gettranscribe_get_transcription.
- "failed": error_message explains what went wrong.`,
      inputSchema: {
        job_id: z.number().int().positive().describe("The numeric ID of the transcription job to check"),
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
                name: "get_transcription_job",
                arguments: { job_id: args.job_id },
              },
            },
          }
        );

        const responseText = result.content?.[0]?.text;
        if (!responseText) {
          return { content: [{ type: "text" as const, text: "No job found." }] };
        }

        let job: TranscriptionJobResponse;
        try {
          job = JSON.parse(responseText);
        } catch {
          return { content: [{ type: "text" as const, text: responseText }] };
        }

        return {
          content: [{ type: "text" as const, text: formatJobMarkdown(job) }],
          structuredContent: { ...job },
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
