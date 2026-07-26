import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { createMcpHandler } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTranscriptionTools } from "./tools/transcriptions.js";
import { registerJobTools } from "./tools/jobs.js";
import { registerFolderTools } from "./tools/folders.js";
import { registerDownloadTools } from "./tools/downloads.js";
import {
  isMcpAdminUserId,
  registerAdminSqlTools,
} from "./tools/admin-sql.js";
import {
  BRAND,
  buildServerIcons,
  enrichOAuthMetadata,
  getPublicOrigin,
  handleBrandingRequest,
} from "./branding/assets.js";

export interface Env {
  GETTRANSCRIBE_API_URL: string;
  GETTRANSCRIBE_API_KEY?: string;
  /** Numeric GetTranscribe user id from OAuth props (stringified). */
  MCP_USER_ID?: string;
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

function createServer(env: Env, publicOrigin: string) {
  // SEP-973 / MCP 2025-11-25 Implementation metadata (icons, title, websiteUrl)
  const server = new McpServer({
    name: BRAND.name,
    title: BRAND.title,
    version: BRAND.version,
    description: BRAND.description,
    websiteUrl: BRAND.websiteUrl,
    icons: buildServerIcons(publicOrigin),
  });

  registerTranscriptionTools(server, env);
  registerJobTools(server, env);
  registerFolderTools(server, env);
  registerDownloadTools(server, env);

  // Admin SQL tools only appear in tools/list for user id 1 or 2
  if (isMcpAdminUserId(env.MCP_USER_ID)) {
    registerAdminSqlTools(server, env);
  }

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
    .btn:disabled { opacity: 0.6; cursor: default; }
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
      <div class="hint">Learn how to get your API key in the <a href="https://gettranscribe.ai/api-documentation/authentication" target="_blank" style="color:#6942e2">authentication guide</a></div>
      <div class="error" id="errorMsg"></div>
      <button type="submit" class="btn btn-primary" id="authBtn">Authorize</button>
    </form>
    <div class="link">
      <a href="https://gettranscribe.ai" target="_blank">Don't have an account? Sign up</a>
    </div>
  </div>
  <script>document.getElementById('authForm').addEventListener('submit',function(){var b=document.getElementById('authBtn');b.disabled=true;b.textContent='Authorizing...';});</script>
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
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'sha256-7r3LAjmn8Igd8xF8PVYuQqIlqPxFyw25NeYLZQ856pA='; form-action 'self' https:; frame-ancestors 'none'; base-uri 'self'; img-src 'self' https:; connect-src 'self'",
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
          return new Response(
            "This authorization request was already completed or has expired. Go back to Claude and start the connection again.",
            { status: 400 }
          );
        }

        const apiUrl = env.GETTRANSCRIBE_API_URL || "https://api.gettranscribe.ai";
        let userId = "unknown";
        try {
          // Resolve the real numeric user id (needed for admin-only tool gating)
          const verifyRes = await fetch(`${apiUrl}/users/me`, {
            method: "GET",
            headers: {
              Accept: "application/json",
              "x-api-key": apiKey,
            },
          });
          if (!verifyRes.ok) {
            return new Response("Invalid API key. Please check and try again.", {
              status: 400,
              headers: { "Content-Type": "text/plain" },
            });
          }
          const me = (await verifyRes.json()) as { id?: number | string };
          if (me?.id == null || Number.isNaN(Number(me.id))) {
            return new Response("Could not resolve user for this API key.", {
              status: 400,
              headers: { "Content-Type": "text/plain" },
            });
          }
          userId = String(me.id);
        } catch {
          return new Response("Could not verify API key. Please try again.", { status: 500 });
        }

        await env.OAUTH_KV.delete(`auth_req:${stateId}`);

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
    // OAuthProvider decrypts the grant props and attaches them to ctx.props
    // before invoking the API handler. getMcpAuthContext() is not usable here
    // because its AsyncLocalStorage scope only exists inside createMcpHandler.
    const props = (ctx as ExecutionContext & { props?: Record<string, unknown> }).props;
    const apiKey = (props?.apiKey as string) || undefined;
    let userId =
      props?.userId != null && String(props.userId).trim() !== ""
        ? String(props.userId)
        : undefined;

    // Older OAuth grants stored a hash as userId — refresh from /users/me when needed
    if (apiKey && (!userId || Number.isNaN(Number(userId)))) {
      try {
        const apiUrl = env.GETTRANSCRIBE_API_URL || "https://api.gettranscribe.ai";
        const meRes = await fetch(`${apiUrl}/users/me`, {
          headers: { Accept: "application/json", "x-api-key": apiKey },
        });
        if (meRes.ok) {
          const me = (await meRes.json()) as { id?: number | string };
          if (me?.id != null) userId = String(me.id);
        }
      } catch {
        // Keep non-admin tool set if lookup fails
      }
    }

    const enrichedEnv: Env = {
      ...env,
      ...(apiKey ? { GETTRANSCRIBE_API_KEY: apiKey } : {}),
      ...(userId ? { MCP_USER_ID: userId } : {}),
    };

    const publicOrigin = getPublicOrigin(request);
    const server = createServer(enrichedEnv, publicOrigin);
    return createMcpHandler(server)(request, enrichedEnv, ctx);
  },
};

const oauthProvider = new OAuthProvider({
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

/**
 * When CloudFront (or another proxy) forwards to workers.dev, rewrite the request
 * URL to the public branded origin so OAuth issuer/audience and MCP icons match
 * mcp.gettranscribe.ai instead of *.workers.dev.
 */
function withPublicOrigin(request: Request): Request {
  const publicOrigin = getPublicOrigin(request);
  const url = new URL(request.url);
  if (publicOrigin === url.origin) return request;

  const publicUrl = new URL(url.pathname + url.search, publicOrigin);
  return new Request(publicUrl.toString(), request);
}

/**
 * Wrap OAuthProvider so we can:
 * 1) Serve public branding assets (/icon.png, favicon, landing) with no auth
 * 2) Enrich RFC 8414 AS metadata with logo_uri (Claude/ChatGPT discovery paths)
 * 3) Honor X-Forwarded-Host for branded custom domains
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const publicRequest = withPublicOrigin(request);

    const branding = handleBrandingRequest(publicRequest);
    if (branding) return branding;

    const response = await oauthProvider.fetch(publicRequest, env, ctx);
    return enrichOAuthMetadata(response, publicRequest);
  },
};
