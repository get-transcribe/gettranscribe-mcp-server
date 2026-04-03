import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { createMcpHandler, getMcpAuthContext } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTranscriptionTools } from "./tools/transcriptions.js";
import { registerFolderTools } from "./tools/folders.js";

export interface Env {
  GETTRANSCRIBE_API_URL: string;
  GETTRANSCRIBE_API_KEY?: string;
  MCP_PATH?: string;
  OAUTH_KV: KVNamespace;
  OAUTH_PROVIDER: OAuthHelpers;
  COOKIE_SECRET?: string;
}

interface OAuthHelpers {
  parseAuthRequest(request: Request): Promise<AuthRequest>;
  lookupClient(clientId: string): Promise<ClientInfo | null>;
  completeAuthorization(params: CompleteAuthParams): Promise<{ redirectTo: string }>;
}

interface AuthRequest {
  clientId: string;
  redirectUri: string;
  scope: string[];
  state?: string;
  [key: string]: unknown;
}

interface ClientInfo {
  clientName?: string;
  logoUri?: string;
  [key: string]: unknown;
}

interface CompleteAuthParams {
  request: AuthRequest;
  userId: string;
  metadata: Record<string, unknown>;
  scope: string[];
  props: Record<string, unknown>;
}

function createServer(env: Env) {
  const server = new McpServer({
    name: "gettranscribe-mcp-server",
    version: "2.0.0",
  });

  registerTranscriptionTools(server, env);
  registerFolderTools(server, env);

  return server;
}

function sanitizeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderConsentPage(clientName: string, csrfToken: string, oauthReqInfo: string): string {
  const safeName = sanitizeText(clientName || "MCP Client");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect to GetTranscribe</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(160deg, #f4f2fb 0%, #f7f9ff 50%, #f0faf8 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(105, 66, 226, 0.10);
      padding: 40px;
      max-width: 440px;
      width: 100%;
    }
    .logo { text-align: center; margin-bottom: 24px; }
    .logo h1 { font-size: 24px; color: #081428; }
    .logo span { color: #6942e2; }
    .subtitle {
      text-align: center;
      color: #081428;
      opacity: 0.55;
      font-size: 14px;
      margin-bottom: 32px;
      line-height: 1.5;
    }
    .client-name {
      font-weight: 600;
      color: #081428;
      opacity: 1;
    }
    label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #081428;
      margin-bottom: 8px;
    }
    input[type="text"] {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid rgba(8, 20, 40, 0.10);
      border-radius: 8px;
      font-size: 15px;
      background: rgba(234, 234, 234, 0.5);
      outline: none;
      transition: border-color 0.2s;
    }
    input[type="text"]:focus { border-color: rgba(105, 66, 226, 0.3); }
    .hint {
      font-size: 12px;
      color: #081428;
      opacity: 0.4;
      margin-top: 6px;
    }
    .btn {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 24px;
      transition: transform 0.1s;
    }
    .btn:active { transform: scale(0.98); }
    .btn-primary {
      background: linear-gradient(135deg, #6942e2, #28e7c5);
      color: white;
    }
    .error {
      background: #fff0f0;
      border: 1px solid #ffcdd2;
      color: #c62828;
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      margin-top: 16px;
      display: none;
    }
    .link {
      text-align: center;
      margin-top: 20px;
      font-size: 13px;
    }
    .link a { color: #6942e2; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <h1>Get<span>Transcribe</span></h1>
    </div>
    <p class="subtitle">
      <span class="client-name">${safeName}</span> wants to access your GetTranscribe account.
      Enter your API key to authorize.
    </p>
    <form method="POST" action="/authorize" id="authForm">
      <input type="hidden" name="csrf_token" value="${csrfToken}" />
      <input type="hidden" name="oauth_req" value="${sanitizeText(oauthReqInfo)}" />
      <label for="api_key">API Key</label>
      <input type="text" id="api_key" name="api_key" placeholder="gtr_..." required autocomplete="off" />
      <div class="hint">Find your API key at <a href="https://gettranscribe.ai/home" target="_blank" style="color:#6942e2">gettranscribe.ai/home</a></div>
      <div class="error" id="errorMsg"></div>
      <button type="submit" class="btn btn-primary">Authorize</button>
    </form>
    <div class="link">
      <a href="https://gettranscribe.ai" target="_blank">Don't have an account? Sign up</a>
    </div>
  </div>
</body>
</html>`;
}

const authHandler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/authorize") {
      if (request.method === "GET") {
        const oauthReqInfo = await env.OAUTH_PROVIDER.parseAuthRequest(request);
        const csrfToken = crypto.randomUUID();
        const clientInfo = await env.OAUTH_PROVIDER.lookupClient(oauthReqInfo.clientId);
        const clientName = clientInfo?.clientName || "MCP Client";

        const stateId = crypto.randomUUID();
        await env.OAUTH_KV.put(
          `auth_req:${stateId}`,
          JSON.stringify(oauthReqInfo),
          { expirationTtl: 600 }
        );

        const html = renderConsentPage(clientName, csrfToken, stateId);

        return new Response(html, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Set-Cookie": `__Host-CSRF_TOKEN=${csrfToken}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=600`,
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; img-src 'self' https:; connect-src 'self'",
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }

      if (request.method === "POST") {
        const formData = await request.formData();
        const csrfTokenForm = formData.get("csrf_token") as string;
        const apiKey = (formData.get("api_key") as string)?.trim();
        const stateId = formData.get("oauth_req") as string;

        const cookieHeader = request.headers.get("Cookie") || "";
        const csrfTokenCookie = cookieHeader
          .split(";")
          .find((c) => c.trim().startsWith("__Host-CSRF_TOKEN="))
          ?.split("=")[1]
          ?.trim();

        if (!csrfTokenForm || !csrfTokenCookie || csrfTokenForm !== csrfTokenCookie) {
          return new Response("CSRF token mismatch. Please try again.", { status: 403 });
        }

        if (!apiKey || !apiKey.startsWith("gtr_")) {
          return new Response("Invalid API key. Must start with gtr_", { status: 400 });
        }

        const storedReq = await env.OAUTH_KV.get(`auth_req:${stateId}`);
        if (!storedReq) {
          return new Response("Authorization request expired. Please start over.", { status: 400 });
        }
        await env.OAUTH_KV.delete(`auth_req:${stateId}`);

        const apiUrl = env.GETTRANSCRIBE_API_URL || "https://api.gettranscribe.ai";
        let userId = "unknown";
        try {
          const verifyRes = await fetch(`${apiUrl}/mcp`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "x-api-key": apiKey,
            },
            body: JSON.stringify({
              method: "tools/list",
              params: {},
            }),
          });
          if (!verifyRes.ok) {
            return new Response("Invalid API key. Please check and try again.", {
              status: 400,
              headers: { "Content-Type": "text/plain" },
            });
          }
          const hashBuffer = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(apiKey)
          );
          userId = Array.from(new Uint8Array(hashBuffer).slice(0, 8))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        } catch {
          return new Response("Could not verify API key. Please try again.", { status: 500 });
        }

        let oauthReqInfo: AuthRequest;
        try {
          oauthReqInfo = JSON.parse(storedReq);
        } catch {
          return new Response("Invalid request data.", { status: 400 });
        }

        const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
          request: oauthReqInfo,
          userId,
          metadata: { label: "GetTranscribe API Key" },
          scope: oauthReqInfo.scope || ["transcribe"],
          props: {
            apiKey,
            userId,
          },
        });

        return Response.redirect(redirectTo, 302);
      }
    }

    return new Response("Not found", { status: 404 });
  },
};

const mcpHandler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const auth = getMcpAuthContext();
    const apiKey = (auth?.props?.apiKey as string) || undefined;

    const enrichedEnv: Env = apiKey
      ? { ...env, GETTRANSCRIBE_API_KEY: apiKey }
      : env;

    const server = createServer(enrichedEnv);
    return createMcpHandler(server)(request, enrichedEnv, ctx);
  },
};

export default new OAuthProvider({
  apiRoute: "/mcp",
  apiHandler: mcpHandler,
  defaultHandler: authHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
  scopesSupported: ["transcribe"],
  accessTokenTTL: 86400 * 30,
  refreshTokenTTL: 86400 * 90,
});
