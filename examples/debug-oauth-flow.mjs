#!/usr/bin/env node

// Replays the exact OAuth 2.1 + PKCE flow that Claude performs against the
// production MCP server, printing the result of every step.
// Run with: GETTRANSCRIBE_API_KEY=gtr_... node examples/debug-oauth-flow.mjs

import { createHash, randomBytes } from "node:crypto";

const BASE = process.env.MCP_BASE_URL || "https://gettranscribe-mcp-server.daniel-c6b.workers.dev";
const API_KEY = process.env.GETTRANSCRIBE_API_KEY;
const REDIRECT_URI = "http://localhost:8788/callback";

function log(step, data) {
  console.log(`[MCP:OAuthDebug] ${step}`, typeof data === "string" ? data : JSON.stringify(data, null, 2));
}

function fail(step, data) {
  log(`FAILED at ${step}`, data);
  process.exit(1);
}

function b64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function main() {
  if (!API_KEY || !API_KEY.startsWith("gtr_")) {
    fail("setup", "Set GETTRANSCRIBE_API_KEY env var to a valid gtr_ key");
  }

  // Step 0: metadata discovery
  const metaRes = await fetch(`${BASE}/.well-known/oauth-authorization-server`);
  const meta = await metaRes.json().catch(() => null);
  log("0. authorization-server metadata", { status: metaRes.status, ok: metaRes.ok, meta });
  if (!metaRes.ok) fail("metadata", meta);

  const prmRes = await fetch(`${BASE}/.well-known/oauth-protected-resource`);
  const prm = await prmRes.json().catch(() => null);
  log("0b. protected-resource metadata", { status: prmRes.status, prm });

  // Step 1: dynamic client registration (like Claude does)
  const regRes = await fetch(`${BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "oauth-debug-client",
      redirect_uris: [REDIRECT_URI],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }),
  });
  const reg = await regRes.json().catch(() => null);
  log("1. client registration", { status: regRes.status, client_id: reg?.client_id, auth_method: reg?.token_endpoint_auth_method });
  if (!regRes.ok || !reg?.client_id) fail("register", reg);

  // Step 2: GET /authorize (consent page)
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
  log("2. GET /authorize (consent page)", {
    status: consentRes.status,
    hasCsrf: !!csrfMatch,
    hasOauthReq: !!oauthReqMatch,
    setCookiePresent: !!setCookie,
  });
  if (consentRes.status !== 200 || !csrfMatch || !oauthReqMatch) {
    fail("GET /authorize", { status: consentRes.status, body: consentHtml.slice(0, 500) });
  }

  const csrfToken = csrfMatch[1];
  const oauthReq = oauthReqMatch[1];
  const cookie = setCookie.split(";")[0];

  // Step 3: POST /authorize (press "Authorize")
  const form = new URLSearchParams({ csrf_token: csrfToken, oauth_req: oauthReq, api_key: API_KEY });
  const postRes = await fetch(`${BASE}/authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
    body: form.toString(),
    redirect: "manual",
  });
  const location = postRes.headers.get("location");
  const postBody = postRes.status !== 302 ? await postRes.text() : "";
  log("3. POST /authorize", { status: postRes.status, location, body: postBody.slice(0, 500) });
  if (postRes.status !== 302 || !location) fail("POST /authorize", { status: postRes.status, body: postBody.slice(0, 500) });

  const redirect = new URL(location);
  const code = redirect.searchParams.get("code");
  const returnedState = redirect.searchParams.get("state");
  log("3b. redirect parsed", {
    redirectOrigin: redirect.origin + redirect.pathname,
    codePresent: !!code,
    stateMatches: returnedState === state,
    allParams: Object.fromEntries(redirect.searchParams.entries().map(([k, v]) => [k, k === "code" ? `${v.slice(0, 12)}...` : v])),
  });
  if (!code) fail("redirect", "no authorization code in redirect");

  // Step 4: POST /token (what Claude's backend does — the invisible step)
  const tokenForm = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: reg.client_id,
    code_verifier: verifier,
    resource: `${BASE}/`,
  });
  const tokenRes = await fetch(`${BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenForm.toString(),
  });
  const tokenBody = await tokenRes.json().catch(async () => ({ raw: "non-json response" }));
  log("4. POST /token", {
    status: tokenRes.status,
    ok: tokenRes.ok,
    hasAccessToken: !!tokenBody?.access_token,
    hasRefreshToken: !!tokenBody?.refresh_token,
    error: tokenBody?.error,
    errorDescription: tokenBody?.error_description,
  });
  if (!tokenRes.ok || !tokenBody?.access_token) fail("POST /token", tokenBody);

  // Step 5: authenticated MCP call
  const mcpRes = await fetch(`${BASE}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${tokenBody.access_token}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "oauth-debug-client", version: "1.0.0" },
      },
    }),
  });
  const mcpBody = await mcpRes.text();
  log("5. POST /mcp initialize", { status: mcpRes.status, body: mcpBody.slice(0, 800) });

  const toolsRes = await fetch(`${BASE}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${tokenBody.access_token}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
  });
  const toolsBody = await toolsRes.text();
  log("6. POST /mcp tools/list", { status: toolsRes.status, body: toolsBody.slice(0, 800) });

  // Step 7: real tool call — verifies the API key from the OAuth grant props
  // reaches the tool handlers (regression check for "API key required" errors)
  const callRes = await fetch(`${BASE}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${tokenBody.access_token}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "gettranscribe_list_folders", arguments: {} },
    }),
  });
  const callBody = await callRes.text();
  log("7. POST /mcp tools/call gettranscribe_list_folders", { status: callRes.status, body: callBody.slice(0, 800) });
  if (callBody.includes("API key required")) fail("tools/call", "Tool did not receive the API key from OAuth props");

  const callTool = async (name, args, id) => {
    const res = await fetch(`${BASE}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${tokenBody.access_token}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } }),
    });
    const text = await res.text();
    // SSE responses can contain multiple events; find the one carrying our result.
    let parsed = null;
    for (const line of text.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      try {
        const candidate = JSON.parse(line.slice(6));
        if (candidate?.result) {
          parsed = candidate;
          break;
        }
      } catch {
        // Ignore partial/non-JSON data lines
      }
    }
    return { status: res.status, structured: parsed?.result?.structuredContent, raw: text.slice(0, 600) };
  };

  // Step 8 (optional, costs credits): full async job flow — create job, poll
  // until completed, fetch the transcription. Enable with TEST_JOBS=1 and
  // optionally TEST_JOBS_URL=<video url>.
  if (process.env.TEST_JOBS === "1") {
    const videoUrl = process.env.TEST_JOBS_URL || "https://www.youtube.com/watch?v=jNQXAC9IVRw";

    const created = await callTool("gettranscribe_create_transcription_job", { url: videoUrl }, 10);
    log("8. create_transcription_job", created.structured || created.raw);
    const jobId = created.structured?.job_id;
    if (!jobId) fail("create_transcription_job", created.raw);

    let job;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const polled = await callTool("gettranscribe_get_transcription_job", { job_id: jobId }, 11 + i);
      job = polled.structured;
      log(`8b. poll #${i + 1}`, { status: job?.status, transcription_id: job?.transcription_id });
      if (job?.status === "completed" || job?.status === "failed") break;
    }
    if (job?.status !== "completed") fail("get_transcription_job", job || "job did not complete in time");

    const transcript = await callTool("gettranscribe_get_transcription", { transcription_id: job.transcription_id }, 99);
    log("8c. get_transcription", {
      status: transcript.status,
      id: transcript.structured?.id,
      preview: String(transcript.structured?.transcription || "").slice(0, 120),
    });
  }

  // Step 9 (optional, costs $0.01): download-video tool. Enable with
  // TEST_DOWNLOAD=1 and optionally TEST_DOWNLOAD_URL=<video url>.
  if (process.env.TEST_DOWNLOAD === "1") {
    const downloadUrl = process.env.TEST_DOWNLOAD_URL || "https://www.youtube.com/watch?v=jNQXAC9IVRw";
    const download = await callTool("gettranscribe_download_video", { url: downloadUrl }, 200);
    log("9. download_video", {
      status: download.status,
      id: download.structured?.id,
      platform: download.structured?.platform,
      hasDownloadUrl: !!download.structured?.download_url,
    });
    if (!download.structured?.download_url) fail("download_video", download.raw);
  }

  log("DONE", "Full flow completed — see statuses above");
}

main().catch((err) => fail("unexpected", err.stack || String(err)));
