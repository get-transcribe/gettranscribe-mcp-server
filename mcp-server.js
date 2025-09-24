#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

// Configuration from environment variables
const API_URL = process.env.GETTRANSCRIBE_API_URL || 'https://gettranscribe.ai';
const API_KEY = process.env.GETTRANSCRIBE_API_KEY;

if (!API_KEY) {
  console.error('❌ GETTRANSCRIBE_API_KEY environment variable is required');
  process.exit(1);
}

// Create HTTP client for GetTranscribe API
const client = axios.create({
  baseURL: API_URL,
  headers: {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json'
  }
});

// Create MCP server
const server = new Server(
  {
    name: 'gettranscribe',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const TOOLS = [
  {
    name: "create_transcription",
    description: "Create a new transcription from a video URL (Instagram, TikTok, YouTube, Meta)",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Video URL from supported platforms"
        },
        folder_id: {
          type: "number",
          description: "Optional folder ID to organize the transcription"
        },
        prompt: {
          type: "string", 
          description: "Optional custom prompt for transcription"
        },
        language: {
          type: "string",
          description: "Optional target language code (e.g., 'en', 'es', 'fr')"
        },
        include_segments: {
          type: "boolean",
          description: "Include transcription segments with timestamps (default: false)"
        }
      },
      required: ["url"]
    }
  },
  {
    name: "get_transcription",
    description: "Retrieve a specific transcription by ID",
    inputSchema: {
      type: "object",
      properties: {
        transcription_id: {
          type: "number",
          description: "ID of the transcription to retrieve"
        }
      },
      required: ["transcription_id"]
    }
  },
  {
    name: "list_transcriptions", 
    description: "List transcriptions with optional filtering and pagination",
    inputSchema: {
      type: "object",
      properties: {
        folder_id: {
          type: "number",
          description: "Filter by folder ID"
        },
        platform: {
          type: "string",
          description: "Filter by platform (instagram, tiktok, youtube, meta)"
        },
        limit: {
          type: "number",
          description: "Number of results to return (default: 10, max: 50)"
        },
        skip: {
          type: "number", 
          description: "Number of results to skip for pagination"
        }
      }
    }
  },
  {
    name: "create_transcription_folder",
    description: "Create a new folder for organizing transcriptions",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the folder"
        },
        parent_id: {
          type: "number",
          description: "Optional parent folder ID for nested structure"
        }
      },
      required: ["name"]
    }
  },
  {
    name: "get_transcription_folder",
    description: "Retrieve a specific folder by ID with its contents",
    inputSchema: {
      type: "object", 
      properties: {
        folder_id: {
          type: "number",
          description: "ID of the folder to retrieve"
        }
      },
      required: ["folder_id"]
    }
  },
  {
    name: "list_transcription_folders",
    description: "List folders with optional filtering and pagination",
    inputSchema: {
      type: "object",
      properties: {
        parent_id: {
          type: "number",
          description: "Filter by parent folder ID (null for root folders)"
        },
        limit: {
          type: "number",
          description: "Number of results to return (default: 10)"
        },
        skip: {
          type: "number",
          description: "Number of results to skip for pagination"
        }
      }
    }
  }
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    console.error(`🚀 [MCP] Calling tool: ${name}`);

    // Make request to GetTranscribe MCP service
    const response = await client.post('/mcp', {
      method: 'tools/call',
      params: {
        name,
        arguments: args
      }
    });

    // Return the response from the service
    return response.data;

  } catch (error) {
    console.error(`❌ [MCP] Error calling tool ${name}:`, error.message);
    
    // Return error in MCP format
    return {
      content: [{
        type: "text",
        text: `❌ Error calling ${name}: ${error.response?.data?.message || error.message}`
      }],
      isError: true
    };
  }
});

// Start the server
async function main() {
  console.error('🚀 Starting GetTranscribe MCP Server...');
  console.error(`📡 API URL: ${API_URL}`);
  console.error(`🔑 API Key: ${API_KEY ? '***' + API_KEY.slice(-4) : 'NOT SET'}`);
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('✅ GetTranscribe MCP Server started successfully');
}

main().catch((error) => {
  console.error('💥 Failed to start MCP server:', error);
  process.exit(1);
});
