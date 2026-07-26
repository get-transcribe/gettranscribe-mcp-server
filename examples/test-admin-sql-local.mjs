#!/usr/bin/env node

// Local OAuth + admin SQL tool gating test against wrangler dev.
// Prerequisites: backend on :3031, `npm run dev -- --var GETTRANSCRIBE_API_URL:http://localhost:3031`
//
//   ADMIN_API_KEY=gtr_... NON_ADMIN_API_KEY=gtr_... \
//   MCP_BASE_URL=http://localhost:8787 node examples/test-admin-sql-local.mjs

import { createHash, randomBytes } from "node:crypto";

const BASE = process.env.MCP_BASE_URL || "http://localhost:8787";
const ADMIN_KEY = process.env.ADMIN_API_KEY;
const NON_ADMIN_KEY = process.env.NON_ADMIN_API_KEY;
const REDIRECT_URI = "http://localhost:8788/callback";

function log(step, data) {
  console.log(`[MCP:AdminSqlLocal] ${step}`, typeof data === "string" ? data : JSON.stringify(data));
}

function fail(step, data) {
  log(`FAILED at ${step}`, data);
  process.exit(1);
}

function b64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function oauthAccessToken(apiKey) {
  const regRes = await fetch(`${BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "admin-sql-local-test",
      redirect_uris: [REDIRECT_URI],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }),
  });
  const reg = await regRes.json();
  if (!regRes.ok || !reg?.client_id) fail("register", reg);

  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const state = b64url(randomBytes(16));

  const authorizeUrl = new URL(`${BASE}/authorize`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", reg.client_id);
  authorizeUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("scope", "transcribe");
  authorizeUrl.searchParams.set("resource", `${BASE}/`);

  const consentRes = await fetch(authorizeUrl, { redirect: "manual" });
  const consentHtml = await consentRes.text();
  const setCookie = consentRes.headers.get("set-cookie") || "";
  const csrfMatch = consentHtml.match(/name="csrf_token" value="([^"]+)"/);
  const oauthReqMatch = consentHtml.match(/name="oauth_req" value="([^"]+)"/);
  if (!csrfMatch || !oauthReqMatch) fail("GET /authorize", consentHtml.slice(0, 300));

  const form = new URLSearchParams({
    csrf_token: csrfMatch[1],
    oauth_req: oauthReqMatch[1],
    api_key: apiKey,
  });
  const postRes = await fetch(`${BASE}/authorize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: setCookie.split(";")[0],
    },
    body: form.toString(),
    redirect: "manual",
  });
  const location = postRes.headers.get("location");
  if (postRes.status !== 302 || !location) {
    fail("POST /authorize", { status: postRes.status, body: await postRes.text() });
  }

  const code = new URL(location).searchParams.get("code");
  if (!code) fail("redirect code", location);

  const tokenRes = await fetch(`${BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: reg.client_id,
      code_verifier: verifier,
      resource: `${BASE}/`,
    }).toString(),
  });
  const tokenBody = await tokenRes.json();
  if (!tokenRes.ok || !tokenBody?.access_token) fail("token", tokenBody);
  return tokenBody.access_token;
}

async function mcpRpc(accessToken, id, method, params = {}) {
  const res = await fetch(`${BASE}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  const text = await res.text();
  let parsed = null;
  for (const line of text.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    try {
      const candidate = JSON.parse(line.slice(6));
      if (candidate?.result || candidate?.error) {
        parsed = candidate;
        break;
      }
    } catch {
      // ignore
    }
  }
  if (!parsed) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text.slice(0, 500) };
    }
  }
  return { status: res.status, parsed, raw: text.slice(0, 400) };
}

async function main() {
  if (!ADMIN_KEY?.startsWith("gtr_") || !NON_ADMIN_KEY?.startsWith("gtr_")) {
    fail("setup", "Set ADMIN_API_KEY and NON_ADMIN_API_KEY");
  }

  log("0. oauth admin", "…");
  const adminToken = await oauthAccessToken(ADMIN_KEY);
  await mcpRpc(adminToken, 1, "initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "admin-sql-local", version: "1.0.0" },
  });
  const adminTools = await mcpRpc(adminToken, 2, "tools/list", {});
  const adminNames = (adminTools.parsed?.result?.tools || []).map((t) => t.name);
  log("1. admin tools", adminNames);
  if (
    !adminNames.includes("gettranscribe_query_database") ||
    !adminNames.includes("gettranscribe_describe_schema")
  ) {
    fail("admin tools missing", adminNames);
  }

  const describe = await mcpRpc(adminToken, 3, "tools/call", {
    name: "gettranscribe_describe_schema",
    arguments: {},
  });
  const describeText =
    describe.parsed?.result?.content?.[0]?.text ||
    JSON.stringify(describe.parsed?.result?.structuredContent || describe.parsed);
  if (!/table_count|tables/i.test(describeText) || describe.parsed?.result?.isError) {
    fail("describe_schema", describe.raw);
  }
  log("2. describe_schema", "ok");

  const query = await mcpRpc(adminToken, 4, "tools/call", {
    name: "gettranscribe_query_database",
    arguments: { sql: "SELECT id, email FROM users WHERE id = 1" },
  });
  const queryText =
    query.parsed?.result?.content?.[0]?.text ||
    JSON.stringify(query.parsed?.result?.structuredContent || query.parsed);
  if (!/"id"\s*:\s*1/.test(queryText) && !query.parsed?.result?.structuredContent?.rows) {
    fail("query_database", query.raw);
  }
  log("3. query_database", "ok");

  log("4. oauth non-admin", "…");
  const otherToken = await oauthAccessToken(NON_ADMIN_KEY);
  await mcpRpc(otherToken, 10, "initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "admin-sql-local-other", version: "1.0.0" },
  });
  const otherTools = await mcpRpc(otherToken, 11, "tools/list", {});
  const otherNames = (otherTools.parsed?.result?.tools || []).map((t) => t.name);
  log("5. non-admin tools", otherNames);
  if (
    otherNames.includes("gettranscribe_query_database") ||
    otherNames.includes("gettranscribe_describe_schema")
  ) {
    fail("non-admin leaked admin tools", otherNames);
  }

  log("DONE", "Worker admin SQL gating works locally");
}

main().catch((err) => fail("unexpected", err.stack || String(err)));
