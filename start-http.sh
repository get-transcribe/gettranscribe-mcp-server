#!/bin/bash

# GetTranscribe MCP Server HTTP Startup Script
# This script starts the MCP server with HTTP/SSE transport for ChatGPT compatibility

echo "🚀 Starting GetTranscribe MCP Server with HTTP transport..."

# Set environment variables for HTTP transport
export MCP_TRANSPORT=http
export PORT=8080
export MCP_PATH=/mcp

# Optional: Set your API key here or pass it as parameter
# export GETTRANSCRIBE_API_KEY="your-api-key-here"

# Optional: Set API URL (defaults to https://gettranscribe.ai)
# export GETTRANSCRIBE_API_URL="https://your-custom-api.com"

# Start the server
node mcp-server.js

echo "Server stopped."
