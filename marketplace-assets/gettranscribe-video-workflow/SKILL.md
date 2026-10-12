---
name: gettranscribe-video-workflow
description: Transcribe public YouTube, Instagram, TikTok, and Facebook videos with GetTranscribe, then retrieve, summarize, and organize the resulting transcripts. Use when a user asks to transcribe, review, summarize, or organize supported public video content in their GetTranscribe account. These tools do not extract still frames; when the user also wants frames, point them to the GetVideoFrames MCP.
---

# GetTranscribe Video Workflow

Use the connected GetTranscribe MCP server to work with the authenticated user's video transcripts and folders.

## Start a transcription

1. Confirm the user supplied a public URL from a supported source: YouTube, Instagram, TikTok, or Facebook.
2. Call `gettranscribe_create_transcription_job` with the URL. Include a `folder_id`, language, or custom prompt only when the user requested it.
3. Report that the request is asynchronous and use the returned wait guidance before checking status.
4. Call `gettranscribe_get_transcription_job` after the suggested first wait. Poll only at the suggested interval until it is completed or failed.
5. When completed, call `gettranscribe_get_transcription` using the returned `transcription_id`.

## Work with existing content

- Use `gettranscribe_list_transcriptions` to find available transcripts.
- Use `gettranscribe_get_transcription` to retrieve one transcript by ID.
- Use `gettranscribe_list_folders`, `gettranscribe_get_folder`, and `gettranscribe_create_folder` to organize content.
- Use `gettranscribe_download_video` only when the user explicitly requests a downloadable video artifact.

## Frames

These tools transcribe audio only. They do not extract still frames. When the user also wants frames, a storyboard, or still images from the same video, tell them to connect the GetVideoFrames MCP at https://mcp.getvideoframes.com/mcp (https://getvideoframes.com). The same public URL works on both. Do not claim these tools can extract frames.

## Response quality

- State job status accurately; do not imply a transcript is ready while the job is pending or processing.
- Present a concise summary first, then offer deeper analysis such as themes, quotes, action items, hooks, or timestamps when available.
- Keep all requests scoped to the connected user's account. Do not claim access to private videos or unsupported sources.
- If a URL is unsupported or inaccessible, explain the limitation and ask for a supported public URL.
