import { importPKCS8, SignJWT } from "jose";
import type { Env } from "../index.js";

const ASC_BASE_URL = "https://api.appstoreconnect.apple.com";
const ASC_AUDIENCE = "appstoreconnect-v1";
/** Apple rejects tokens with exp more than 20 minutes after iat. */
const TOKEN_TTL_SECONDS = 19 * 60;

export type AscHttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface AscRequestOptions {
  method: AscHttpMethod;
  /** Absolute path on App Store Connect API, e.g. `/v1/apps`. */
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

export interface AscResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  bodyText: string;
}

export class AscError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "AscError";
    this.status = status;
  }
}

function requireAscCredentials(env: Env): {
  keyId: string;
  issuerId: string;
  privateKeyPem: string;
} {
  const keyId = env.APPLE_APPSTORE_CONNECT_API_KEY?.trim();
  const issuerId = env.APPLE_APPSTORE_CONNECT_ISSUER_ID?.trim();
  const privateKeyPem = env.APPLE_APPSTORE_CONNECT_PRIVATE_KEY?.trim();

  if (!keyId || !issuerId || !privateKeyPem) {
    throw new AscError(
      "App Store Connect credentials are not configured on this Worker. " +
        "Set APPLE_APPSTORE_CONNECT_API_KEY, APPLE_APPSTORE_CONNECT_ISSUER_ID, " +
        "and APPLE_APPSTORE_CONNECT_PRIVATE_KEY (wrangler secret / .dev.vars).",
      500
    );
  }

  return { keyId, issuerId, privateKeyPem };
}

/**
 * Normalize and validate a path so we only ever call api.appstoreconnect.apple.com.
 */
export function normalizeAscPath(rawPath: string): string {
  const trimmed = rawPath.trim();
  if (!trimmed) {
    throw new AscError("path is required (e.g. /v1/apps)", 400);
  }
  if (/^https?:\/\//i.test(trimmed)) {
    throw new AscError(
      "path must be a relative API path starting with / (e.g. /v1/apps), not a full URL",
      400
    );
  }
  if (trimmed.includes("://") || trimmed.includes("\\") || trimmed.includes("..")) {
    throw new AscError("path contains invalid characters", 400);
  }

  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (!/^\/v\d+(\/|$)/.test(withSlash)) {
    throw new AscError(
      "path must start with an App Store Connect version prefix such as /v1/…",
      400
    );
  }

  return withSlash;
}

async function createAscJwt(env: Env): Promise<string> {
  const { keyId, issuerId, privateKeyPem } = requireAscCredentials(env);
  const key = await importPKCS8(privateKeyPem, "ES256");
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId, typ: "JWT" })
    .setIssuer(issuerId)
    .setIssuedAt(now)
    .setExpirationTime(now + TOKEN_TTL_SECONDS)
    .setAudience(ASC_AUDIENCE)
    .sign(key);
}

const GZIP_MAGIC_0 = 0x1f;
const GZIP_MAGIC_1 = 0x8b;

function isGzipBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === GZIP_MAGIC_0 && bytes[1] === GZIP_MAGIC_1;
}

function looksLikeReportPath(path: string): boolean {
  return /\/(financeReports|salesReports)(\/|$|\?)/i.test(path);
}

async function gunzipToText(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

async function parseAscResponseBody(
  response: Response,
  path: string
): Promise<{ body: unknown; bodyText: string; encoding?: string }> {
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  const bytes = new Uint8Array(await response.arrayBuffer());

  if (bytes.length === 0) {
    return { body: null, bodyText: "" };
  }

  const isAGzip =
    contentType.includes("application/a-gzip") ||
    contentType.includes("application/gzip") ||
    isGzipBytes(bytes);

  if (isAGzip || (response.ok && looksLikeReportPath(path) && isGzipBytes(bytes))) {
    try {
      const text = await gunzipToText(bytes);
      return {
        body: {
          format: "tsv",
          encoding: "gzip-decompressed",
          contentType: contentType || "application/a-gzip",
          text,
          lineCount: text.split("\n").filter((l) => l.length > 0).length,
        },
        bodyText: text,
        encoding: "gzip-decompressed",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new AscError(
        `Failed to gunzip App Store Connect report (${contentType || "binary"}): ${message}`,
        502
      );
    }
  }

  const bodyText = new TextDecoder().decode(bytes);
  let body: unknown = bodyText;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = bodyText;
  }
  return { body, bodyText };
}

export async function ascRequest(
  env: Env,
  options: AscRequestOptions
): Promise<AscResponse> {
  const path = normalizeAscPath(options.path);
  const url = new URL(`${ASC_BASE_URL}${path}`);

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  if (url.origin !== ASC_BASE_URL) {
    throw new AscError("Refusing to call a host other than api.appstoreconnect.apple.com", 400);
  }

  const token = await createAscJwt(env);
  // finance/sales reports return application/a-gzip; JSON APIs return application/json
  const headers: Record<string, string> = {
    Accept: "application/json, application/a-gzip",
    Authorization: `Bearer ${token}`,
  };

  let bodyInit: string | undefined;
  if (options.body !== undefined && options.body !== null) {
    headers["Content-Type"] = "application/json";
    bodyInit =
      typeof options.body === "string" ? options.body : JSON.stringify(options.body);
  }

  const response = await fetch(url.toString(), {
    method: options.method,
    headers,
    body: bodyInit,
  });

  const parsed = await parseAscResponseBody(response, path);

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "authorization") return;
    responseHeaders[key] = value;
  });

  return {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body: parsed.body,
    bodyText: parsed.bodyText,
  };
}

export function handleAscError(error: unknown): string {
  if (error instanceof AscError) {
    return `Error: ${error.message}`;
  }
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return "Error: An unexpected App Store Connect error occurred.";
}
