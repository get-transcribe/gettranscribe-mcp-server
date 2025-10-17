import express from 'express';
import { randomUUID } from 'crypto';
import { 
  OAUTH_CLIENT_ID, 
  OAUTH_CLIENT_SECRET 
} from '../config/environment.js';
import { 
  generateAuthCode, 
  generateAccessToken, 
  authCodes, 
  accessTokens, 
  registeredClients 
} from './jwt.js';

export function setupOAuthRoutes(app) {
  app.get('/oauth/authorize', (req, res) => {
    const { client_id, redirect_uri, state, response_type } = req.query;
    
    console.error(`🔐 [OAuth] Authorization request: client_id=${client_id}, redirect_uri=${redirect_uri}`);
    
    const isValidClientId = (client_id === OAUTH_CLIENT_ID || registeredClients.has(client_id));
    
    if (!isValidClientId) {
      return res.status(400).json({ error: 'invalid_client_id' });
    }
    
    if (response_type !== 'code') {
      return res.status(400).json({ error: 'unsupported_response_type' });
    }
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>GetTranscribe MCP Authorization</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; padding: 40px; background: #f5f5f5; }
          .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #6942e2; margin-bottom: 20px; }
          input, button { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; }
          button { background: #6942e2; color: white; border: none; cursor: pointer; }
          button:hover { background: #5a38c7; }
          .info { background: #f0f0f0; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎥 GetTranscribe MCP</h1>
          <div class="info">
            <strong>ChatGPT/Claude</strong> wants to access your GetTranscribe account to search and fetch video transcriptions.
          </div>
          <form method="POST" action="/oauth/authorize">
            <input type="hidden" name="client_id" value="${client_id}">
            <input type="hidden" name="redirect_uri" value="${redirect_uri}">
            <input type="hidden" name="state" value="${state || ''}">
            <input type="hidden" name="response_type" value="${response_type}">
            
            <label for="api_key">Your GetTranscribe API Key:</label>
            <input type="password" name="api_key" placeholder="gtr_..." required>
            
            <button type="submit">✅ Authorize Access</button>
          </form>
          <p style="font-size: 12px; color: #666; text-align: center;">
            Get your API key from <a href="https://www.gettranscribe.ai" target="_blank">gettranscribe.ai</a>
          </p>
        </div>
      </body>
      </html>
    `);
  });
  
  app.post('/oauth/authorize', express.urlencoded({ extended: true }), (req, res) => {
    const { client_id, redirect_uri, state, api_key } = req.body;
    
    console.error(`🔐 [OAuth] Authorization submission: client_id=${client_id}, api_key=${api_key?.slice(0, 8)}...`);
    
    if (!api_key || !api_key.startsWith('gtr_')) {
      return res.status(400).send('Invalid API key format. Must start with "gtr_"');
    }
    
    const authCode = generateAuthCode();
    authCodes.set(authCode, { 
      api_key, 
      client_id, 
      expires: Date.now() + 600000
    });
    
    console.error(`🔐 [OAuth] Generated auth code: ${authCode}`);
    
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', authCode);
    if (state) redirectUrl.searchParams.set('state', state);
    
    res.redirect(redirectUrl.toString());
  });
  
  app.post('/oauth/token', (req, res) => {
    console.error(`🔐 [OAuth] Token request received`);
    console.error(`🔐 [OAuth] Headers:`, JSON.stringify(req.headers, null, 2));
    console.error(`🔐 [OAuth] Body:`, JSON.stringify(req.body, null, 2));
    
    let { grant_type, code, client_id, client_secret, redirect_uri } = req.body;
    
    const authHeader = req.headers['authorization'];
    if (!client_id && authHeader && authHeader.startsWith('Basic ')) {
      try {
        const base64Credentials = authHeader.substring(6);
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [headerClientId, headerClientSecret] = credentials.split(':');
        client_id = headerClientId;
        client_secret = headerClientSecret;
        console.error(`🔐 [OAuth] Using Basic Auth credentials: client_id=${client_id}`);
      } catch (error) {
        console.error(`🔐 [OAuth] Error parsing Basic Auth:`, error);
        return res.status(400).json({ 
          error: 'invalid_request',
          error_description: 'Invalid Basic Auth format'
        });
      }
    }
    
    console.error(`🔐 [OAuth] Token request: grant_type=${grant_type}, code=${code}, client_id=${client_id}, redirect_uri=${redirect_uri}`);
    
    if (!grant_type) {
      return res.status(400).json({ 
        error: 'invalid_request',
        error_description: 'Missing grant_type parameter'
      });
    }
    
    if (grant_type !== 'authorization_code') {
      return res.status(400).json({ 
        error: 'unsupported_grant_type',
        error_description: `Grant type '${grant_type}' is not supported. Only 'authorization_code' is supported.`
      });
    }
    
    if (!code) {
      return res.status(400).json({ 
        error: 'invalid_request',
        error_description: 'Missing code parameter'
      });
    }
    
    if (!client_id) {
      return res.status(400).json({ 
        error: 'invalid_request',
        error_description: 'Missing client_id parameter'
      });
    }
    
    if (!client_secret) {
      return res.status(400).json({ 
        error: 'invalid_client',
        error_description: 'Missing client_secret parameter'
      });
    }
    
    const isValidClient = (
      (client_id === OAUTH_CLIENT_ID && client_secret === OAUTH_CLIENT_SECRET) ||
      (registeredClients.has(client_id) && registeredClients.get(client_id).client_secret === client_secret)
    );
    
    if (!isValidClient) {
      console.error(`🔐 [OAuth] Invalid client credentials: client_id=${client_id}`);
      console.error(`🔐 [OAuth] Available registered clients:`, Array.from(registeredClients.keys()));
      return res.status(401).json({ 
        error: 'invalid_client',
        error_description: 'Invalid client credentials'
      });
    }
    
    const authData = authCodes.get(code);
    if (!authData) {
      console.error(`🔐 [OAuth] Authorization code not found: ${code}`);
      console.error(`🔐 [OAuth] Available auth codes:`, Array.from(authCodes.keys()));
      return res.status(400).json({ 
        error: 'invalid_grant',
        error_description: 'Authorization code not found or invalid'
      });
    }
    
    if (authData.expires < Date.now()) {
      console.error(`🔐 [OAuth] Authorization code expired: ${code}`);
      authCodes.delete(code);
      return res.status(400).json({ 
        error: 'invalid_grant',
        error_description: 'Authorization code has expired'
      });
    }
    
    if (authData.client_id !== client_id) {
      console.error(`🔐 [OAuth] Client ID mismatch: expected ${authData.client_id}, got ${client_id}`);
      return res.status(400).json({ 
        error: 'invalid_grant',
        error_description: 'Authorization code was issued to a different client'
      });
    }
    
    const accessToken = generateAccessToken(authData.api_key);
    accessTokens.set(accessToken, authData.api_key);
    
    authCodes.delete(code);
    
    console.error(`🔐 [OAuth] Access token generated successfully for client: ${client_id}`);
    
    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 86400
    });
  });
  
  app.post('/oauth/register', (req, res) => {
    console.error(`🔐 [OAuth] Client registration request received`);
    console.error(`🔐 [OAuth] Request body:`, JSON.stringify(req.body, null, 2));
    
    const { client_name, redirect_uris, client_uri } = req.body;
    
    console.error(`🔐 [OAuth] Client registration: client_name=${client_name}, redirect_uris=${JSON.stringify(redirect_uris)}`);
    
    const isValidChatGPT = client_name && (
      client_name.toLowerCase().includes('chatgpt') ||
      client_name.toLowerCase().includes('openai') ||
      (redirect_uris && redirect_uris.some(uri => uri.includes('chatgpt.com')))
    );
    
    if (!isValidChatGPT) {
      console.error(`🔐 [OAuth] Registration rejected: Not a ChatGPT/OpenAI client`);
      return res.status(400).json({
        error: 'invalid_client_metadata',
        error_description: 'This registration endpoint is specifically for ChatGPT/OpenAI clients'
      });
    }
    
    const clientId = `chatgpt_${randomUUID()}`;
    const clientSecret = randomUUID();
    
    registeredClients.set(clientId, {
      client_secret: clientSecret,
      client_name: client_name,
      redirect_uris: redirect_uris || [],
      created_at: Math.floor(Date.now() / 1000)
    });
    
    console.error(`🔐 [OAuth] ✅ Registered new client: ${clientId}`);
    console.error(`🔐 [OAuth] Total registered clients: ${registeredClients.size}`);
    
    res.status(201).json({
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0,
      redirect_uris: redirect_uris || [],
      client_name: client_name,
      token_endpoint_auth_method: 'client_secret_post'
    });
  });
  
  app.get('/.well-known/oauth-authorization-server', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const baseUrl = protocol + '://' + req.get('host');
    res.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/oauth/token`,
      registration_endpoint: `${baseUrl}/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic']
    });
  });
}

