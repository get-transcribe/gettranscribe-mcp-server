import { ICON_PNG_DATA_URI } from "./icon-data-uri.js";

/** Same 128×128 PNG bytes used for data URI + static routes. */
export function getIconPngBytes(): Uint8Array {
  const b64 = ICON_PNG_DATA_URI.replace(/^data:image\/png;base64,/, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export const BRAND = {
  name: "gettranscribe-mcp-server",
  title: "GetTranscribe",
  version: "2.0.0",
  description:
    "Transcribe Instagram, TikTok, YouTube, and Meta videos. Create jobs, list transcripts, organize folders, and download video files.",
  websiteUrl: "https://www.gettranscribe.ai",
  docsUrl: "https://www.gettranscribe.ai/integrations/claude",
} as const;

/**
 * MCP Implementation.icons per SEP-973 / spec 2025-11-25.
 * Prefer same-origin HTTPS URL; include data URI so clients that skip network fetches still work.
 */
export function buildServerIcons(publicOrigin: string) {
  const origin = publicOrigin.replace(/\/$/, "");
  return [
    {
      src: `${origin}/icon.png`,
      mimeType: "image/png" as const,
      sizes: ["128x128"],
    },
    {
      src: `${origin}/icon-512.png`,
      mimeType: "image/png" as const,
      sizes: ["512x512"],
    },
    {
      src: ICON_PNG_DATA_URI,
      mimeType: "image/png" as const,
      sizes: ["128x128"],
    },
  ];
}

function pngResponse(bytes: Uint8Array, cacheSeconds = 86400): Response {
  return new Response(bytes, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": `public, max-age=${cacheSeconds}, immutable`,
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function landingHtml(origin: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>GetTranscribe MCP</title>
  <link rel="icon" href="/favicon.ico" type="image/png" sizes="128x128" />
  <link rel="icon" href="/icon.png" type="image/png" sizes="128x128" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="128x128" />
  <link rel="manifest" href="/manifest.json" />
  <meta property="og:title" content="GetTranscribe MCP" />
  <meta property="og:description" content="${BRAND.description}" />
  <meta property="og:image" content="${origin}/icon-512.png" />
  <meta property="og:url" content="${origin}/" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0;
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(160deg, #f4f2fb 0%, #f7f9ff 50%, #f0faf8 100%); color: #081428; }
    .card { background: #fff; border-radius: 16px; padding: 40px; max-width: 440px; width: 90%;
      box-shadow: 0 8px 32px rgba(105,66,226,0.10); text-align: center; }
    img { width: 72px; height: 72px; margin-bottom: 16px; }
    h1 { font-size: 24px; margin: 0 0 8px; }
    h1 span { color: #6942e2; }
    p { opacity: 0.6; font-size: 14px; line-height: 1.5; margin: 0 0 20px; }
    code { font-size: 12px; background: rgba(234,234,234,0.8); padding: 8px 10px; border-radius: 8px; display: block; word-break: break-all; }
    a { color: #6942e2; }
  </style>
</head>
<body>
  <div class="card">
    <img src="/icon.png" width="72" height="72" alt="GetTranscribe" />
    <h1>Get<span>Transcribe</span> MCP</h1>
    <p>${BRAND.description}</p>
    <code>${origin}/mcp</code>
    <p style="margin-top:16px"><a href="${BRAND.docsUrl}">Setup guide</a></p>
  </div>
</body>
</html>`;
}

/** Prefer CloudFront / proxy public host when present. */
export function getPublicOrigin(request: Request): string {
  const xfHost = request.headers.get("X-Forwarded-Host")?.split(",")[0]?.trim();
  if (xfHost) {
    const proto = request.headers.get("X-Forwarded-Proto")?.split(",")[0]?.trim() || "https";
    return `${proto}://${xfHost}`;
  }
  return new URL(request.url).origin;
}

/**
 * Public branding routes (no auth). Used by MCP clients / favicon crawlers / OAuth logo_uri.
 */
export function handleBrandingRequest(request: Request): Response | null {
  const url = new URL(request.url);
  const path = url.pathname;
  const origin = getPublicOrigin(request);
  const png = getIconPngBytes();

  if (path === "/icon.png" || path === "/favicon.png" || path === "/favicon.ico" || path === "/apple-touch-icon.png") {
    return pngResponse(png);
  }

  if (path === "/icon-512.png") {
    // Same mark; clients that ask for 512 get the 128 PNG (acceptable for connector lists).
    return pngResponse(png);
  }

  if (path === "/manifest.json") {
    return Response.json(
      {
        name: BRAND.title,
        short_name: BRAND.title,
        description: BRAND.description,
        start_url: "/",
        display: "standalone",
        icons: [
          { src: "/icon.png", sizes: "128x128", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        ],
      },
      {
        headers: {
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  if (path === "/" || path === "") {
    return new Response(landingHtml(origin), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" },
    });
  }

  return null;
}

function rewriteOriginUrls(value: unknown, fromOrigin: string, toOrigin: string): unknown {
  if (typeof value === "string" && value.startsWith(fromOrigin)) {
    return toOrigin + value.slice(fromOrigin.length);
  }
  if (Array.isArray(value)) {
    return value.map((v) => rewriteOriginUrls(v, fromOrigin, toOrigin));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = rewriteOriginUrls(v, fromOrigin, toOrigin);
    }
    return out;
  }
  return value;
}

/**
 * Patch RFC 8414 AS metadata with logo_uri and rewrite issuer/endpoints to the
 * public branded origin when the Worker sits behind CloudFront.
 */
export async function enrichOAuthMetadata(response: Response, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const isAsMeta = path === "/.well-known/oauth-authorization-server";
  const isRsMeta = path === "/.well-known/oauth-protected-resource";
  if (!isAsMeta && !isRsMeta) return response;
  if (!response.ok) return response;

  try {
    const meta = (await response.json()) as Record<string, unknown>;
    const workerOrigin = url.origin;
    const publicOrigin = getPublicOrigin(request);
    let patched = meta;
    if (publicOrigin !== workerOrigin) {
      patched = rewriteOriginUrls(meta, workerOrigin, publicOrigin) as Record<string, unknown>;
    }
    if (isAsMeta) {
      patched = {
        ...patched,
        logo_uri: `${publicOrigin}/icon.png`,
        service_documentation: BRAND.docsUrl,
      };
    }
    return Response.json(patched, {
      status: response.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return response;
  }
}
