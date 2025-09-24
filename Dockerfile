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
ENV MCP_TRANSPORT=sse
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Expose port
EXPOSE 8080

# Start the MCP server
CMD ["node", "mcp-server.js"]