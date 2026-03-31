/**
 * Test script for FossFLOW MCP integration
 *
 * Run: node test-integration.js
 */

import WebSocket from 'ws';

const WS_URL = 'ws://localhost:3333';

console.log('Testing FossFLOW WebSocket integration...\n');

// Test 1: Connect as MCP client
console.log('1. Connecting as MCP client...');
const mcpClient = new WebSocket(WS_URL);

mcpClient.on('open', () => {
  console.log('   ✓ MCP client connected');

  // Test 2: Send add_node operation
  console.log('\n2. Sending add_node operation...');
  mcpClient.send(JSON.stringify({
    type: 'operation',
    id: 'test-1',
    operation: 'add_node',
    payload: {
      name: 'Test Server',
      icon: 'server',
      position: { x: 0, y: 0 }
    }
  }));
});

mcpClient.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('   Received:', JSON.stringify(message, null, 2));

  if (message.type === 'state_update') {
    console.log('   ✓ State update received');
  } else if (message.type === 'operation_result') {
    if (message.success) {
      console.log('   ✓ Operation succeeded, created ID:', message.createdId);
    } else {
      console.log('   ✗ Operation failed:', message.error);
    }

    // Test complete, close connection
    setTimeout(() => {
      console.log('\n3. Closing connection...');
      mcpClient.close();
      console.log('   ✓ Connection closed');
      console.log('\n✓ All tests passed!');
      process.exit(0);
    }, 1000);
  }
});

mcpClient.on('error', (err) => {
  console.error('   ✗ Error:', err.message);
  process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.error('\n✗ Test timeout');
  process.exit(1);
}, 10000);
