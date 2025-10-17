# GetTranscribe MCP Server Architecture

## Overview

The MCP server has been refactored from a single 1238-line file into a modular architecture for better maintainability, testability, and scalability.

## Project Structure

```
gettranscribe-mcp-server/
├── mcp-server.js                    # Main entry point (simplified to ~30 lines)
├── component-helper.js              # Helper for formatting transcriptions
├── src/
│   ├── config/
│   │   └── environment.js           # Environment variables and configuration
│   ├── auth/
│   │   ├── jwt.js                   # JWT token generation and verification
│   │   └── oauth.js                 # OAuth 2.0 flow implementation
│   ├── tools/
│   │   ├── definitions.js           # MCP tool definitions (schemas)
│   │   └── handlers.js              # Tool execution logic
│   ├── server/
│   │   ├── instance.js              # MCP server instance creation
│   │   ├── resources.js             # UI resources for OpenAI Apps SDK
│   │   └── handlers.js              # Request handlers (if needed later)
│   ├── transport/
│   │   ├── http.js                  # HTTP/SSE transport setup
│   │   └── stdio.js                 # Stdio transport setup
│   └── utils/
│       └── client.js                # Axios client factory
└── web/                             # UI components (unchanged)
```

## Module Responsibilities

### 1. Main Entry Point (`mcp-server.js`)
- Minimal bootstrapping logic
- Determines transport mode (HTTP vs stdio)
- Delegates to appropriate transport module

### 2. Configuration (`src/config/environment.js`)
- Centralizes all environment variables
- Exports configuration constants
- Single source of truth for app config

### 3. Authentication (`src/auth/`)

#### `jwt.js`
- JWT token generation and verification
- Auth code management
- In-memory storage for tokens and auth codes

#### `oauth.js`
- Complete OAuth 2.0 flow
- Authorization endpoint with HTML form
- Token exchange endpoint
- Dynamic client registration
- OAuth discovery endpoint

### 4. Tools (`src/tools/`)

#### `definitions.js`
- MCP tool schemas
- Tool metadata for OpenAI Apps SDK
- Input validation schemas

#### `handlers.js`
- Tool execution logic
- API client integration
- Response formatting
- Error handling
- Special handling for `search` and `fetch` tools

### 5. Server (`src/server/`)

#### `instance.js`
- Creates MCP server instances
- Sets up request handlers
- Configures server capabilities

#### `resources.js`
- UI resource definitions
- HTML template loading
- Component bundle integration

### 6. Transport (`src/transport/`)

#### `http.js`
- Express app setup
- CORS configuration
- OAuth route integration
- Streamable HTTP transport
- Legacy SSE support
- Health check endpoint

#### `stdio.js`
- Stdio transport setup
- Simple request/response handling
- No OAuth (uses environment API key)

### 7. Utils (`src/utils/`)

#### `client.js`
- Axios client factory
- API key injection
- Base URL configuration

## Key Features

### Separation of Concerns
Each module has a single, well-defined responsibility:
- **Config**: Environment variables
- **Auth**: Authentication and authorization
- **Tools**: Business logic for MCP tools
- **Server**: MCP protocol handling
- **Transport**: Communication layer
- **Utils**: Shared utilities

### Maintainability Benefits
1. **Easier to navigate**: Find code by responsibility
2. **Easier to test**: Each module can be tested independently
3. **Easier to modify**: Changes are isolated to specific modules
4. **Easier to understand**: Smaller files with clear purposes

### Backward Compatibility
The refactored server maintains 100% compatibility with:
- Existing HTTP/SSE clients
- Stdio clients (Claude Desktop, MCP Inspector)
- ChatGPT integration
- OAuth flow
- All existing tools and functionality

## Usage

The server works exactly as before:

```bash
# Stdio mode
npm run start:stdio

# HTTP mode
npm run start:http

# Default (detects from environment)
npm start
```

## Future Improvements

Potential enhancements now that the code is modular:

1. **Add tests**: Unit tests for each module
2. **Add TypeScript**: Type safety across modules
3. **Add database**: Replace in-memory storage with Redis/PostgreSQL
4. **Add logging**: Structured logging with Winston/Pino
5. **Add monitoring**: Metrics and tracing
6. **Add validation**: Request/response validation middleware
7. **Add documentation**: Auto-generate API docs from schemas

## Migration Notes

The original `mcp-server.js` file has been split but no functionality was removed or changed. All features work identically:

- ✅ OAuth 2.0 flow
- ✅ JWT token handling
- ✅ All MCP tools
- ✅ UI components for ChatGPT
- ✅ HTTP and stdio transports
- ✅ Legacy SSE support
- ✅ Health check endpoint
- ✅ CORS handling
- ✅ Error handling

## Development

When adding new features:

1. **New tool**: Add to `src/tools/definitions.js` and handler to `src/tools/handlers.js`
2. **New config**: Add to `src/config/environment.js`
3. **New auth flow**: Modify `src/auth/oauth.js`
4. **New endpoint**: Add to `src/transport/http.js`
5. **New utility**: Add to `src/utils/`

Keep modules focused on their single responsibility.

