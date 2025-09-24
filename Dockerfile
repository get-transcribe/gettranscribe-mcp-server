FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY mcp-server.js ./

# Make the script executable
RUN chmod +x mcp-server.js

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcpserver -u 1001
USER mcpserver

# Set environment variables
ENV NODE_ENV=production

# Start the MCP server
CMD ["node", "mcp-server.js"]
