/**
 * Resolve the GetTranscribe user id for admin tool gating.
 *
 * OAuth grants created before numeric ids stored a 16-char SHA-256 prefix as
 * `props.userId`. Some of those hashes are all digits, so they must not be
 * treated as account ids. Every MCP request re-reads `GET /users/me` when an
 * API key is available.
 */

export interface McpCaller {
  apiKey?: string;
  userId?: string;
}

export interface UnwrapTokenResult {
  userId?: string;
  grant?: { props?: Record<string, unknown> };
}

export interface McpIdentityEnv {
  GETTRANSCRIBE_API_URL?: string;
  OAUTH_PROVIDER?: {
    unwrapToken?: (token: string) => Promise<UnwrapTokenResult | null>;
  };
}

/** Pre-admin OAuth user ids: first 8 bytes of SHA-256(apiKey), hex. */
export function isLegacyOauthUserHash(value: string): boolean {
  return /^[0-9a-f]{16}$/i.test(value.trim());
}

/** Positive integer account id. Rejects hashes, blanks, and non-integers. */
export function normalizeAccountUserId(value: unknown): string | undefined {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value <= 0) return undefined;
    return String(value);
  }
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!/^[0-9]+$/.test(trimmed)) return undefined;
  if (isLegacyOauthUserHash(trimmed)) return undefined;
  const n = Number(trimmed);
  if (!Number.isSafeInteger(n) || n <= 0) return undefined;
  return String(n);
}

export function parseNumericUserId(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const record = body as Record<string, unknown>;
  const nested = [record.user, record.data].filter(
    (value): value is Record<string, unknown> =>
      !!value && typeof value === "object" && !Array.isArray(value)
  );
  const candidates = [
    record.id,
    record.userId,
    record.user_id,
    ...nested.flatMap((value) => [value.id, value.userId, value.user_id]),
  ];
  for (const candidate of candidates) {
    const id = normalizeAccountUserId(candidate);
    if (id) return id;
  }
  return undefined;
}

function readProps(props: Record<string, unknown> | undefined): McpCaller {
  if (!props) return {};
  const apiKey = typeof props.apiKey === "string" ? props.apiKey : undefined;
  const userId = normalizeAccountUserId(props.userId);
  return { apiKey, userId };
}

async function fetchAccountUserId(
  env: McpIdentityEnv,
  apiKey: string
): Promise<string | undefined> {
  const baseUrl = env.GETTRANSCRIBE_API_URL || "https://api.gettranscribe.ai";
  const res = await fetch(`${baseUrl}/users/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "x-api-key": apiKey,
    },
  });
  if (!res.ok) return undefined;
  const body = await res.json().catch(() => undefined);
  return parseNumericUserId(body);
}

/**
 * API key + numeric account id for this MCP request.
 * Prefers the live `/users/me` id over the id stored in the OAuth grant.
 */
export async function resolveMcpCaller(
  request: Request,
  env: McpIdentityEnv,
  ctx: { props?: Record<string, unknown> }
): Promise<McpCaller> {
  let caller = readProps(ctx.props);

  if (!caller.apiKey) {
    const header = request.headers.get("Authorization") || "";
    const match = /^Bearer\s+(\S+)/i.exec(header);
    const token = match?.[1];
    if (token && env.OAUTH_PROVIDER?.unwrapToken) {
      try {
        const unwrapped = await env.OAUTH_PROVIDER.unwrapToken(token);
        const fromGrant = readProps(unwrapped?.grant?.props);
        caller = {
          apiKey: caller.apiKey || fromGrant.apiKey,
          userId: caller.userId || fromGrant.userId || normalizeAccountUserId(unwrapped?.userId),
        };
      } catch {
        // Keep ctx.props. A bad unwrap must not fail the whole MCP request.
      }
    }
  }

  if (!caller.apiKey) return caller;

  try {
    const liveUserId = await fetchAccountUserId(env, caller.apiKey);
    if (liveUserId) caller = { ...caller, userId: liveUserId };
  } catch {
    // Keep the grant id when the backend is unreachable.
  }

  return caller;
}
