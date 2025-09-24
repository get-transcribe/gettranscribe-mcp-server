#!/usr/bin/env node

import { createServer } from 'http';

const port = 8789;

const server = createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', transport: 'sse' }));
    return;
  }
  
  if (req.method === 'GET' && req.url === '/mcp/sse') {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    // Send initial message
    res.write('data: {"type":"hello","message":"SSE connection established"}\n\n');
    
    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write('data: {"type":"ping"}\n\n');
    }, 30000);
    
    // Clean up on close
    req.on('close', () => {
      clearInterval(keepAlive);
      console.log('Client disconnected');
    });
    
    return;
  }
  
  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(port, () => {
  console.log(`🚀 Test SSE server listening on port ${port}`);
  console.log(`🔗 Health: http://localhost:${port}/health`);
  console.log(`🔗 SSE: http://localhost:${port}/mcp/sse`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
});
