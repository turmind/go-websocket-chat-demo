/**
 * Unit Tests for Message Model
 * Tests the Message class functionality including creation, serialization, and status management
 */

describe('Message Model', () => {
  
  it('should create a message with valid properties', () => {
    const message = new Message('testuser', 'Hello world!', 'chat');
    
    assertType(message.id, 'string', 'Message ID should be a string');
    assertEqual(message.handle, 'testuser', 'Message handle should match input');
    assertEqual(message.text, 'Hello world!', 'Message text should match input');
    assertEqual(message.type, 'chat', 'Message type should match input');
    assertType(message.timestamp, 'number', 'Message timestamp should be a number');
    assertFalsy(message.isSelf, 'Message should not be marked as self by default');
    assertEqual(message.status, 'received', 'Message status should be received by default');
  });

  it('should generate unique IDs for different messages', () => {
    const message1 = new Message('user1', 'Message 1');
    const message2 = new Message('user2', 'Message 2');
    
    assert(message1.id !== message2.id, 'Message IDs should be unique');
    assertType(message1.id, 'string', 'Message ID should be a string');
    assert(message1.id.length > 0, 'Message ID should not be empty');
  });

  it('should handle default values correctly', () => {
    const message = new Message('testuser', 'Hello');
    
    assertEqual(message.type, 'chat', 'Default message type should be chat');
    assertFalsy(message.isSelf, 'Default isSelf should be false');
    assertEqual(message.status, 'received', 'Default status should be received');
    assertType(message.timestamp, 'number', 'Timestamp should be generated automatically');
  });

  it('should mark message as self correctly', () => {
    const message = new Message('testuser', 'Hello');
    
    message.markAsSelf();
    
    assertTruthy(message.isSelf, 'Message should be marked as self');
    assertEqual(message.status, 'sending', 'Status should be updated to sending');
  });

  it('should update message status correctly', () => {
    const message = new Message('testuser', 'Hello');
    
    message.updateStatus('sent');
    assertEqual(message.status, 'sent', 'Status should be updated to sent');
    
    message.updateStatus('failed');
    assertEqual(message.status, 'failed', 'Status should be updated to failed');
  });

  it('should serialize to JSON correctly', () => {
    const message = new Message('testuser', 'Hello world!', 'system');
    message.markAsSelf();
    const json = message.toJSON();
    
    assertType(json, 'object', 'toJSON should return an object');
    assertEqual(json.id, message.id, 'JSON should contain message ID');
    assertEqual(json.handle, message.handle, 'JSON should contain message handle');
    assertEqual(json.text, message.text, 'JSON should contain message text');
    assertEqual(json.type, message.type, 'JSON should contain message type');
    assertEqual(json.timestamp, message.timestamp, 'JSON should contain message timestamp');
    assertEqual(json.isSelf, message.isSelf, 'JSON should contain isSelf flag');
    assertEqual(json.status, message.status, 'JSON should contain message status');
  });

  it('should deserialize from JSON correctly', () => {
    const originalMessage = new Message('testuser', 'Hello world!', 'system');
    originalMessage.markAsSelf();
    originalMessage.updateStatus('sent');
    
    const json = originalMessage.toJSON();
    const deserializedMessage = Message.fromJSON(json);
    
    assertInstanceOf(deserializedMessage, Message, 'Deserialized object should be a Message instance');
    assertEqual(deserializedMessage.id, originalMessage.id, 'Deserialized message should have same ID');
    assertEqual(deserializedMessage.handle, originalMessage.handle, 'Deserialized message should have same handle');
    assertEqual(deserializedMessage.text, originalMessage.text, 'Deserialized message should have same text');
    assertEqual(deserializedMessage.type, originalMessage.type, 'Deserialized message should have same type');
    assertEqual(deserializedMessage.timestamp, originalMessage.timestamp, 'Deserialized message should have same timestamp');
    assertEqual(deserializedMessage.isSelf, originalMessage.isSelf, 'Deserialized message should have same isSelf flag');
    assertEqual(deserializedMessage.status, originalMessage.status, 'Deserialized message should have same status');
  });

  it('should handle different message types', () => {
    const chatMessage = new Message('user', 'Hello', 'chat');
    const systemMessage = new Message('system', 'User joined', 'system');
    const joinMessage = new Message('user', 'joined', 'user_join');
    const leaveMessage = new Message('user', 'left', 'user_leave');
    
    assertEqual(chatMessage.type, 'chat', 'Chat message type should be preserved');
    assertEqual(systemMessage.type, 'system', 'System message type should be preserved');
    assertEqual(joinMessage.type, 'user_join', 'Join message type should be preserved');
    assertEqual(leaveMessage.type, 'user_leave', 'Leave message type should be preserved');
  });

  it('should handle empty or invalid text gracefully', () => {
    const message1 = new Message('user', '');
    const message2 = new Message('user', null);
    const message3 = new Message('user', undefined);
    
    assertEqual(message1.text, '', 'Empty text should be preserved');
    assertEqual(message2.text, null, 'Null text should be preserved');
    assertEqual(message3.text, undefined, 'Undefined text should be preserved');
    
    // All should still have valid IDs and timestamps
    assertType(message1.id, 'string', 'Message with empty text should still have ID');
    assertType(message2.id, 'string', 'Message with null text should still have ID');
    assertType(message3.id, 'string', 'Message with undefined text should still have ID');
  });

  it('should maintain consistent state after multiple operations', () => {
    const message = new Message('testuser', 'Hello');
    
    // Perform multiple state changes
    message.markAsSelf();
    message.updateStatus('sent');
    message.updateStatus('failed');
    message.updateStatus('sent');
    
    // Verify final state is consistent
    assertTruthy(message.isSelf, 'Message should still be marked as self');
    assertEqual(message.status, 'sent', 'Message should have final status');
    assertType(message.timestamp, 'number', 'Timestamp should remain valid');
    assertEqual(message.handle, 'testuser', 'Handle should remain unchanged');
    assertEqual(message.text, 'Hello', 'Text should remain unchanged');
  });

  it('should handle status transitions correctly', () => {
    const message = new Message('testuser', 'Hello');
    
    // Test valid status transitions
    const validStatuses = ['sending', 'sent', 'failed', 'received'];
    
    validStatuses.forEach(status => {
      message.updateStatus(status);
      assertEqual(message.status, status, `Status should be updated to ${status}`);
    });
  });

  it('should preserve timestamp accuracy', () => {
    const beforeCreation = Date.now();
    const message = new Message('testuser', 'Hello');
    const afterCreation = Date.now();
    
    assert(message.timestamp >= beforeCreation, 'Timestamp should be >= creation start time');
    assert(message.timestamp <= afterCreation, 'Timestamp should be <= creation end time');
  });

});