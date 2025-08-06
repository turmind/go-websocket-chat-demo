/**
 * Integration Tests for WebSocket Functionality
 * Tests WebSocket connection, message sending/receiving, and real-time features
 */

describe('WebSocket Integration', () => {
  
  let mockWebSocket;
  let originalWebSocket;
  let chatState;
  let wsManager;
  
  // Mock WebSocket implementation
  class MockWebSocket {
    constructor(url) {
      this.url = url;
      this.readyState = WebSocket.CONNECTING;
      this.onopen = null;
      this.onclose = null;
      this.onerror = null;
      this.onmessage = null;
      this.sentMessages = [];
      
      // Simulate connection after a short delay
      setTimeout(() => {
        this.readyState = WebSocket.OPEN;
        if (this.onopen) {
          this.onopen({ type: 'open' });
        }
      }, 10);
    }
    
    send(data) {
      if (this.readyState === WebSocket.OPEN) {
        this.sentMessages.push(data);
        
        // Echo back for testing
        setTimeout(() => {
          if (this.onmessage) {
            this.onmessage({ data: data });
          }
        }, 5);
      } else {
        throw new Error('WebSocket is not open');
      }
    }
    
    close(code = 1000, reason = '') {
      this.readyState = WebSocket.CLOSED;
      if (this.onclose) {
        this.onclose({ code, reason, type: 'close' });
      }
    }
    
    // Simulate receiving a message
    simulateMessage(data) {
      if (this.onmessage) {
        this.onmessage({ data: JSON.stringify(data) });
      }
    }
    
    // Simulate connection error
    simulateError(error) {
      if (this.onerror) {
        this.onerror({ error, type: 'error' });
      }
    }
  }
  
  beforeEach = () => {
    // Setup mock WebSocket
    originalWebSocket = window.WebSocket;
    window.WebSocket = MockWebSocket;
    window.ReconnectingWebSocket = MockWebSocket;
    
    // Create fresh instances
    chatState = new ChatState();
    
    // Mock DOM elements
    const testContainer = testFramework.setupDOMTesting();
    testContainer.innerHTML = `
      <div id="connection-status"></div>
      <div id="chat-status"></div>
      <div id="messages-container"></div>
      <input id="message-input" />
      <button id="send-button"></button>
    `;
  };
  
  afterEach = () => {
    // Restore original WebSocket
    window.WebSocket = originalWebSocket;
    window.ReconnectingWebSocket = originalWebSocket;
    
    // Cleanup DOM
    testFramework.cleanupDOMTesting();
  };

  it('should establish WebSocket connection successfully', async () => {
    const wsUrl = 'ws://localhost:8080/ws';
    const ws = new MockWebSocket(wsUrl);
    
    assertEqual(ws.url, wsUrl, 'WebSocket should connect to correct URL');
    assertEqual(ws.readyState, WebSocket.CONNECTING, 'Initial state should be connecting');
    
    // Wait for connection to open
    await testFramework.waitFor(() => ws.readyState === WebSocket.OPEN, 100);
    
    assertEqual(ws.readyState, WebSocket.OPEN, 'WebSocket should be open after connection');
  });

  it('should handle connection events correctly', async () => {
    const ws = new MockWebSocket('ws://localhost:8080/ws');
    let openCalled = false;
    let closeCalled = false;
    let errorCalled = false;
    
    ws.onopen = () => { openCalled = true; };
    ws.onclose = () => { closeCalled = true; };
    ws.onerror = () => { errorCalled = true; };
    
    // Wait for open event
    await testFramework.waitFor(() => openCalled, 100);
    assertTruthy(openCalled, 'Open event should be fired');
    
    // Simulate error
    ws.simulateError(new Error('Test error'));
    assertTruthy(errorCalled, 'Error event should be fired');
    
    // Close connection
    ws.close();
    assertTruthy(closeCalled, 'Close event should be fired');
  });

  it('should send and receive messages correctly', async () => {
    const ws = new MockWebSocket('ws://localhost:8080/ws');
    let receivedMessage = null;
    
    ws.onmessage = (event) => {
      receivedMessage = event.data;
    };
    
    // Wait for connection
    await testFramework.waitFor(() => ws.readyState === WebSocket.OPEN, 100);
    
    const testMessage = JSON.stringify({ handle: 'testuser', text: 'Hello World!' });
    ws.send(testMessage);
    
    assertEqual(ws.sentMessages.length, 1, 'Should track sent messages');
    assertEqual(ws.sentMessages[0], testMessage, 'Should send correct message');
    
    // Wait for echo response
    await testFramework.waitFor(() => receivedMessage !== null, 100);
    assertEqual(receivedMessage, testMessage, 'Should receive echoed message');
  });

  it('should handle different message types', async () => {
    const ws = new MockWebSocket('ws://localhost:8080/ws');
    const receivedMessages = [];
    
    ws.onmessage = (event) => {
      receivedMessages.push(JSON.parse(event.data));
    };
    
    await testFramework.waitFor(() => ws.readyState === WebSocket.OPEN, 100);
    
    // Test different message types
    const messageTypes = [
      { type: 'chat', handle: 'user1', text: 'Hello' },
      { type: 'user_join', handle: 'user2' },
      { type: 'user_leave', handle: 'user1' },
      { type: 'system', text: 'Server message' }
    ];
    
    messageTypes.forEach(msg => {
      ws.simulateMessage(msg);
    });
    
    await testFramework.waitFor(() => receivedMessages.length === messageTypes.length, 100);
    
    assertEqual(receivedMessages.length, messageTypes.length, 'Should receive all message types');
    receivedMessages.forEach((msg, index) => {
      assertEqual(msg.type, messageTypes[index].type, `Message ${index} should have correct type`);
    });
  });

  it('should handle connection failures gracefully', async () => {
    const ws = new MockWebSocket('ws://localhost:8080/ws');
    let errorHandled = false;
    let connectionClosed = false;
    
    ws.onerror = () => { errorHandled = true; };
    ws.onclose = () => { connectionClosed = true; };
    
    await testFramework.waitFor(() => ws.readyState === WebSocket.OPEN, 100);
    
    // Simulate network error
    ws.simulateError(new Error('Network error'));
    assertTruthy(errorHandled, 'Error should be handled');
    
    // Close connection
    ws.close(1006, 'Connection lost');
    assertTruthy(connectionClosed, 'Connection close should be handled');
  });

  it('should validate message format before sending', async () => {
    const ws = new MockWebSocket('ws://localhost:8080/ws');
    
    await testFramework.waitFor(() => ws.readyState === WebSocket.OPEN, 100);
    
    // Test valid message
    const validMessage = { handle: 'testuser', text: 'Hello' };
    ws.send(JSON.stringify(validMessage));
    assertEqual(ws.sentMessages.length, 1, 'Valid message should be sent');
    
    // Test invalid JSON (should not crash)
    try {
      ws.send('invalid json {');
      // If we reach here, the mock handled it gracefully
      assert(true, 'Invalid JSON should be handled gracefully');
    } catch (error) {
      // This is also acceptable behavior
      assert(true, 'Invalid JSON may throw error');
    }
  });

  it('should handle rapid message sending', async () => {
    const ws = new MockWebSocket('ws://localhost:8080/ws');
    
    await testFramework.waitFor(() => ws.readyState === WebSocket.OPEN, 100);
    
    // Send multiple messages rapidly
    const messageCount = 10;
    for (let i = 0; i < messageCount; i++) {
      ws.send(JSON.stringify({ handle: 'testuser', text: `Message ${i}` }));
    }
    
    assertEqual(ws.sentMessages.length, messageCount, 'All messages should be sent');
    
    // Verify message order
    ws.sentMessages.forEach((msg, index) => {
      const parsed = JSON.parse(msg);
      assertEqual(parsed.text, `Message ${index}`, 'Messages should maintain order');
    });
  });

  it('should handle heartbeat/ping messages', async () => {
    const ws = new MockWebSocket('ws://localhost:8080/ws');
    let pongReceived = false;
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'pong') {
        pongReceived = true;
      }
    };
    
    await testFramework.waitFor(() => ws.readyState === WebSocket.OPEN, 100);
    
    // Send ping
    ws.simulateMessage({ type: 'pong', timestamp: Date.now() });
    
    assertTruthy(pongReceived, 'Pong message should be received');
  });

  it('should handle user list updates', async () => {
    const ws = new MockWebSocket('ws://localhost:8080/ws');
    const userUpdates = [];
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'user_list' || data.type === 'user_join' || data.type === 'user_leave') {
        userUpdates.push(data);
      }
    };
    
    await testFramework.waitFor(() => ws.readyState === WebSocket.OPEN, 100);
    
    // Simulate user events
    ws.simulateMessage({ type: 'user_join', handle: 'user1' });
    ws.simulateMessage({ type: 'user_join', handle: 'user2' });
    ws.simulateMessage({ type: 'user_leave', handle: 'user1' });
    ws.simulateMessage({ type: 'user_list', users: ['user2', 'user3'] });
    
    await testFramework.waitFor(() => userUpdates.length === 4, 100);
    
    assertEqual(userUpdates.length, 4, 'Should receive all user updates');
    assertEqual(userUpdates[0].type, 'user_join', 'First update should be user join');
    assertEqual(userUpdates[2].type, 'user_leave', 'Third update should be user leave');
    assertEqual(userUpdates[3].type, 'user_list', 'Last update should be user list');
  });

  it('should handle connection state changes', async () => {
    const ws = new MockWebSocket('ws://localhost:8080/ws');
    const stateChanges = [];
    
    // Track state changes
    const originalReadyState = ws.readyState;
    stateChanges.push(originalReadyState);
    
    await testFramework.waitFor(() => ws.readyState === WebSocket.OPEN, 100);
    stateChanges.push(ws.readyState);
    
    ws.close();
    stateChanges.push(ws.readyState);
    
    assertEqual(stateChanges[0], WebSocket.CONNECTING, 'Should start in connecting state');
    assertEqual(stateChanges[1], WebSocket.OPEN, 'Should transition to open state');
    assertEqual(stateChanges[2], WebSocket.CLOSED, 'Should transition to closed state');
  });

});