#!/usr/bin/env node

/**
 * Test script to verify both stdio and HTTP transports work correctly
 * Run with: node examples/test-both-transports.js
 */

import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const API_KEY = process.env.GETTRANSCRIBE_API_KEY || 'test-key';

async function testStdioTransport() {
  console.log('🧪 Testing stdio transport...');
  
  try {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['mcp-server.js'],
      env: {
        ...process.env,
        GETTRANSCRIBE_API_KEY: API_KEY,
        MCP_TRANSPORT: 'stdio'
      }
    });

    const client = new Client({
      name: 'test-client',
      version: '1.0.0'
    });

    await client.connect(transport);
    console.log('✅ stdio transport connected');

    // Test listing tools
    const tools = await client.listTools();
    console.log(`✅ Found ${tools.tools.length} tools in stdio mode`);
    console.log('   Tools:', tools.tools.map(t => t.name).join(', '));

    await client.close();
    console.log('✅ stdio transport test completed\n');
    return true;
  } catch (error) {
    console.error('❌ stdio transport test failed:', error.message);
    return false;
  }
}

async function testHttpTransport() {
  console.log('🧪 Testing HTTP transport...');
  
  // Start HTTP server
  const serverProcess = spawn('node', ['mcp-server.js'], {
    env: {
      ...process.env,
      GETTRANSCRIBE_API_KEY: API_KEY,
      MCP_TRANSPORT: 'http',
      PORT: '8081' // Use different port to avoid conflicts
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    const transport = new StreamableHTTPClientTransport(
      new URL('http://localhost:8081/mcp')
    );

    const client = new Client({
      name: 'test-client',
      version: '1.0.0'
    });

    await client.connect(transport);
    console.log('✅ HTTP transport connected');

    // Test listing tools
    const tools = await client.listTools();
    console.log(`✅ Found ${tools.tools.length} tools in HTTP mode`);
    console.log('   Tools:', tools.tools.map(t => t.name).join(', '));

    // Check for ChatGPT-specific tools
    const hasSearch = tools.tools.some(t => t.name === 'search');
    const hasFetch = tools.tools.some(t => t.name === 'fetch');
    
    if (hasSearch && hasFetch) {
      console.log('✅ ChatGPT-compatible tools (search, fetch) found');
    } else {
      console.log('⚠️  Missing ChatGPT tools:', 
        !hasSearch ? 'search' : '', 
        !hasFetch ? 'fetch' : ''
      );
    }

    await client.close();
    console.log('✅ HTTP transport test completed\n');
    return true;
  } catch (error) {
    console.error('❌ HTTP transport test failed:', error.message);
    return false;
  } finally {
    // Clean up server process
    serverProcess.kill();
  }
}

async function testHealthEndpoint() {
  console.log('🧪 Testing health endpoint...');
  
  try {
    const response = await fetch('http://localhost:8081/health');
    const data = await response.json();
    
    console.log('✅ Health endpoint responded');
    console.log('   Status:', data.status);
    console.log('   ChatGPT compatible:', data.chatgpt_compatible);
    console.log('   Available tools:', data.tools?.length || 0);
    
    return true;
  } catch (error) {
    console.error('❌ Health endpoint test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 GetTranscribe MCP Server Transport Test\n');
  
  if (!API_KEY || API_KEY === 'test-key') {
    console.log('⚠️  No API key set. Set GETTRANSCRIBE_API_KEY environment variable for full testing.\n');
  }

  const results = [];
  
  // Test stdio transport
  results.push(await testStdioTransport());
  
  // Test HTTP transport
  results.push(await testHttpTransport());
  
  // Test health endpoint
  results.push(await testHealthEndpoint());
  
  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All transports working correctly!');
    console.log('\n📖 Usage guides:');
    console.log('   • stdio transport: See README.md');
    console.log('   • HTTP transport: See README-CHATGPT.md');
    console.log('   • Comparison: See TRANSPORT-COMPARISON.md');
  } else {
    console.log('❌ Some tests failed. Check the error messages above.');
    process.exit(1);
  }
}

main().catch(console.error);
