# GetTranscribe MCP Server Distribution

## For External Users

### Installation via NPM (Recommended)

```bash
npm install -g @gettranscribe/mcp-server
```

### MCP Configuration for Users

Users add this to their `~/.cursor/mcp.json` or MCP client configuration:

```json
{
  "mcpServers": {
    "gettranscribe": {
      "command": "gettranscribe-mcp",
      "env": {
        "GETTRANSCRIBE_API_KEY": "user_api_key_here"
      }
    }
  }
}
```

### Getting an API Key

1. Visit [GetTranscribe](https://gettranscribe.ai)
2. Create an account or log in
3. Go to Settings → API Keys
4. Generate a new API key
5. Copy the key to your MCP configuration

## Alternative Distribution Methods

### Option 1: Direct Download
```json
{
  "mcpServers": {
    "gettranscribe": {
      "command": "npx",
      "args": [
        "-y",
        "@gettranscribe/mcp-server"
      ],
      "env": {
        "GETTRANSCRIBE_API_KEY": "user_api_key_here"
      }
    }
  }
}
```

### Option 2: GitHub Installation
```json
{
  "mcpServers": {
    "gettranscribe": {
      "command": "npx",
      "args": [
        "-y",
        "https://github.com/yourusername/gettranscribe-mcp"
      ],
      "env": {
        "GETTRANSCRIBE_API_KEY": "user_api_key_here"
      }
    }
  }
}
```

### Option 3: Docker Container
```json
{
  "mcpServers": {
    "gettranscribe": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "--env",
        "GETTRANSCRIBE_API_KEY=user_api_key_here",
        "gettranscribe/mcp-server"
      ]
    }
  }
}
```

## Publishing Steps

### 1. Publish to NPM

```bash
cd /path/to/mcp
npm login
npm publish --access public
```

### 2. Create GitHub Repository

```bash
git init
git add .
git commit -m "Initial MCP server release"
git remote add origin https://github.com/yourusername/gettranscribe-mcp.git
git push -u origin main
```

### 3. Docker Image (Optional)

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "mcp-server.js"]
```

Build and push:
```bash
docker build -t gettranscribe/mcp-server .
docker push gettranscribe/mcp-server
```

## User Documentation

### Available Tools

- `create_transcription` - Create transcription from video URL
- `get_transcription` - Get transcription by ID  
- `list_transcriptions` - List user's transcriptions
- `create_transcription_folder` - Create organization folder
- `get_transcription_folder` - Get folder details
- `list_transcription_folders` - List user's folders

### Example Usage

After setup, users can ask their AI assistant:

- *"Create a transcription from this YouTube video: https://youtube.com/watch?v=example"*
- *"Show me my recent transcriptions"*
- *"Create a folder called 'Podcast Episodes'"*
- *"Get transcription #123"*

## Environment Variables

- `GETTRANSCRIBE_API_KEY` (required) - User's API key from GetTranscribe
- `GETTRANSCRIBE_API_URL` (optional) - API endpoint, defaults to https://gettranscribe.ai
