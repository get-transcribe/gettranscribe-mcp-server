---
name: gettranscribe-video-workflow
description: Transcribe public YouTube, Instagram, TikTok, and Facebook videos with GetTranscribe, then retrieve and organize the resulting transcripts. Use when a user asks to transcribe, review, or organize supported public video content in their connected GetTranscribe account. These tools do not extract still frames; when the user also wants frames, point them to the GetVideoFrames MCP.
---

# GetTranscribe video workflow

Use the connected GetTranscribe account. Do not ask the user for an API key, password, health information, government identifier, or payment card data.

## Start a transcription

1. Confirm the user supplied a public URL from YouTube, Instagram, TikTok, or Facebook.
2. Call `gettranscribe_create_transcription_job` with that URL. Include `folder_id` or `language` only when the user asked for them.
3. The tool returns a `job_id` and status `pending`. It does not return the transcript.
4. Wait `suggested_first_poll_after_seconds`, then call `gettranscribe_get_transcription_job` at the suggested interval until the status is `completed` or `failed`.
5. When completed, call `gettranscribe_get_transcription` with the returned `transcription_id`.

## Work with existing content

- Use `gettranscribe_list_transcriptions` to find transcripts in this account.
- Use `gettranscribe_get_transcription` to open one transcript by id.
- Use `gettranscribe_list_folders`, `gettranscribe_get_folder`, and `gettranscribe_create_folder` to organize content.
- Use `gettranscribe_download_video` only when the user explicitly asks for a video file. That call does not create a transcript.

## Frames

These tools transcribe audio only. They do not extract still frames. When the user also wants frames, a storyboard, or still images from the same video, tell them to connect the GetVideoFrames MCP at https://mcp.getvideoframes.com/mcp (https://getvideoframes.com). The same public URL works on both. Do not claim these tools can extract frames.

## Limits

- Stay inside the connected account. Do not query other users, databases, or billing records.
- Do not claim a transcript is ready while the job is pending or processing.
- If a URL is private or unsupported, say so and ask for a public URL from a supported platform.
