# ChatGPT MCP Setup Guide

## Quick Setup

1. Go to ChatGPT Settings → Connections → Add New Connector
2. Fill out the form:

```
Name: GetTranscribe
Description: AI video transcription from YouTube, Instagram, TikTok, Meta
MCP Server URL: https://api.gettranscribe.ai/mcp
Authentication: API Key
```

3. Get your API key from [GetTranscribe.ai](https://gettranscribe.ai) → Settings → API Keys
4. Enter your API key when prompted
5. Click "Create" and trust the application

## Usage Examples

Once connected, you can ask ChatGPT:

- *"Create a transcription from this YouTube video: https://youtube.com/watch?v=example"*
- *"Transcribe this with timestamps: https://youtube.com/watch?v=example"*
- *"Show me my recent transcriptions"*
- *"Create a folder called 'Podcast Episodes'"*
- *"Get transcription #123"*

## Available Tools

- **create_transcription** - Transcribe videos from YouTube, Instagram, TikTok, Meta
- **get_transcription** - Retrieve specific transcription by ID
- **list_transcriptions** - List your transcriptions with filtering
- **create_transcription_folder** - Create folders to organize transcriptions
- **get_transcription_folder** - Get folder details and contents
- **list_transcription_folders** - List your folders

## Troubleshooting

- **Authentication Error**: Make sure your API key is valid
- **Connection Failed**: Check that the URL is exactly `https://api.gettranscribe.ai/mcp`
- **No Response**: Ensure you have transcription credits in your GetTranscribe account
