#!/usr/bin/env node

import { API_URL, DEFAULT_API_KEY, TRANSPORT_MODE } from './src/config/environment.js';
import { startHTTPServer } from './src/transport/http.js';
import { startStdioServer } from './src/transport/stdio.js';

async function main() {
  console.error('🚀 Starting GetTranscribe MCP Server...');
  console.error(`📡 API URL: ${API_URL}`);
  console.error(`🔑 Default API Key: ${DEFAULT_API_KEY ? '***' + DEFAULT_API_KEY.slice(-4) : 'NOT SET (clients must provide api_key parameter)'}`);

  const useHTTP = TRANSPORT_MODE === 'http' || TRANSPORT_MODE === 'sse' || !!process.env.PORT;

  if (useHTTP) {
    await startHTTPServer();
  } else {
    await startStdioServer();
  }
}

main().catch((error) => {
  console.error('💥 Failed to start MCP server:', error);
  process.exit(1);
});
