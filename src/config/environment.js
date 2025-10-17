export const API_URL = process.env.GETTRANSCRIBE_API_URL || 'https://api.gettranscribe.ai';
export const DEFAULT_API_KEY = process.env.GETTRANSCRIBE_API_KEY;

export const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID || 'gettranscribe-mcp';
export const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || 'mcp-secret-2024';
export const JWT_SECRET = process.env.JWT_SECRET || 'gettranscribe-jwt-secret-2024';
export const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;

export const PORT = Number(process.env.PORT || 8080);
export const MCP_PATH = process.env.MCP_PATH || '/mcp';
export const TRANSPORT_MODE = (process.env.MCP_TRANSPORT || '').toLowerCase();

