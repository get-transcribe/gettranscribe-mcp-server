# Testing MCP Server with Inspector

## 1. Stop the current server
Press `Ctrl+C` in your terminal to stop the current server if it's running.

## 2. Start the improved server
```bash
./start-http.sh
```

## 3. Test with MCP Inspector

In a new terminal window, run:
```bash
npx @modelcontextprotocol/inspector http://localhost:8080/mcp
```

## 4. Alternative: Test with curl

```bash
# Test health endpoint
curl http://localhost:8080/health

# Test MCP endpoint
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

## Expected Behavior

The server should:
1. Accept POST requests with JSON-RPC messages
2. Return proper MCP responses
3. Handle SSE connections for GET requests
4. Work with the MCP Inspector tool

## What Changed

- Simplified HTTP transport implementation using Express
- Fixed session management
- Proper JSON-RPC message handling
- Better error handling and logging
- Stateless approach for better compatibility
