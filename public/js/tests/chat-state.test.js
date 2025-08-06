/**
 * Unit Tests for ChatState
 * Tests the ChatState class functionality including user management, message handling, and event system
 */

describe('ChatState', () => {
  
  let chatState;
  
  // Setup before each test
  beforeEach = () => {
    chatState = new ChatState();
  };

  it('should initialize with default values', () => {
    const state = new ChatState();
    
    assertEqual(state.currentUser, null, 'Current user should be null initially');
    assertInstanceOf(state.users, Map, 'Users should be a Map');
    assertEqual(state.users.size, 0, 'Users map should be empty initially');
    assertInstanceOf(state.messages, Array, 'Messages should be an array');
    assertEqual(state.messages.length, 0, 'Messages array should be empty initially');
    assertEqual(state.selectedUser, null, 'Selected user should be null initially');
    assertEqual(state.connectionStatus, 'disconnected', 'Connection status should be disconnected initially');
    assertInstanceOf(state.eventListeners, Map, 'Event listeners should be a Map');
    assertEqual(state.maxMessages, 1000, 'Max messages should be 1000');
  });

  it('should set current user correctly', () => {
    const state = new ChatState();
    const user = new User('testuser');
    let eventFired = false;
    
    // Listen for event
    state.on('currentUserChanged', (userData) => {
      eventFired = true;
      assertEqual(userData, user, 'Event should pass the user data');
    });
    
    state.setCurrentUser(user);
    
    assertEqual(state.currentUser, user, 'Current user should be set');
    assertTruthy(eventFired, 'currentUserChanged event should be fired');
  });

  it('should add users correctly', () => {
    const state = new ChatState();
    let eventFired = false;
    let eventUser = null;
    
    // Listen for event
    state.on('userAdded', (user) => {
      eventFired = true;
      eventUser = user;
    });
    
    const userData = { handle: 'testuser', avatar: 'avatar.png', avatarType: 'custom' };
    const addedUser = state.addUser(userData);
    
    assertInstanceOf(addedUser, User, 'Added user should be a User instance');
    assertEqual(addedUser.handle, 'testuser', 'User handle should match');
    assertTruthy(state.users.has(addedUser.id), 'User should be in users map');
    assertTruthy(eventFired, 'userAdded event should be fired');
    assertEqual(eventUser, addedUser, 'Event should pass the added user');
  });

  it('should add User instances directly', () => {
    const state = new ChatState();
    const user = new User('testuser');
    
    const addedUser = state.addUser(user);
    
    assertEqual(addedUser, user, 'Should return the same User instance');
    assertTruthy(state.users.has(user.id), 'User should be in users map');
  });

  it('should remove users correctly', () => {
    const state = new ChatState();
    const user = new User('testuser');
    let eventFired = false;
    let eventUser = null;
    
    state.addUser(user);
    
    // Listen for event
    state.on('userRemoved', (removedUser) => {
      eventFired = true;
      eventUser = removedUser;
    });
    
    const removedUser = state.removeUser(user.id);
    
    assertEqual(removedUser, user, 'Should return the removed user');
    assertFalsy(state.users.has(user.id), 'User should be removed from users map');
    assertTruthy(eventFired, 'userRemoved event should be fired');
    assertEqual(eventUser, user, 'Event should pass the removed user');
  });

  it('should handle removing non-existent user', () => {
    const state = new ChatState();
    
    const removedUser = state.removeUser('nonexistent');
    
    assertEqual(removedUser, undefined, 'Should return undefined for non-existent user');
  });

  it('should update users correctly', () => {
    const state = new ChatState();
    const user = new User('testuser');
    let eventFired = false;
    
    state.addUser(user);
    
    // Listen for event
    state.on('userUpdated', (updatedUser) => {
      eventFired = true;
      assertEqual(updatedUser, user, 'Event should pass the updated user');
    });
    
    const updates = { isOnline: false, avatar: 'new-avatar.png' };
    const updatedUser = state.updateUser(user.id, updates);
    
    assertEqual(updatedUser, user, 'Should return the updated user');
    assertFalsy(user.isOnline, 'User online status should be updated');
    assertEqual(user.avatar, 'new-avatar.png', 'User avatar should be updated');
    assertTruthy(eventFired, 'userUpdated event should be fired');
  });

  it('should find user by handle', () => {
    const state = new ChatState();
    const user1 = new User('user1');
    const user2 = new User('user2');
    
    state.addUser(user1);
    state.addUser(user2);
    
    const foundUser = state.getUserByHandle('user1');
    assertEqual(foundUser, user1, 'Should find user by handle');
    
    const notFound = state.getUserByHandle('nonexistent');
    assertEqual(notFound, null, 'Should return null for non-existent handle');
  });

  it('should get online users correctly', () => {
    const state = new ChatState();
    const user1 = new User('user1');
    const user2 = new User('user2');
    const user3 = new User('user3');
    
    user2.setOffline();
    
    state.addUser(user1);
    state.addUser(user2);
    state.addUser(user3);
    
    const onlineUsers = state.getOnlineUsers();
    
    assertEqual(onlineUsers.length, 2, 'Should return 2 online users');
    assertTruthy(onlineUsers.includes(user1), 'Should include user1');
    assertFalsy(onlineUsers.includes(user2), 'Should not include offline user2');
    assertTruthy(onlineUsers.includes(user3), 'Should include user3');
  });

  it('should add messages correctly', () => {
    const state = new ChatState();
    const currentUser = new User('currentuser');
    state.setCurrentUser(currentUser);
    
    let eventFired = false;
    let eventMessage = null;
    
    // Listen for event
    state.on('messageAdded', (message) => {
      eventFired = true;
      eventMessage = message;
    });
    
    const messageData = { handle: 'testuser', text: 'Hello', type: 'chat' };
    const addedMessage = state.addMessage(messageData);
    
    assertInstanceOf(addedMessage, Message, 'Added message should be a Message instance');
    assertEqual(addedMessage.handle, 'testuser', 'Message handle should match');
    assertEqual(state.messages.length, 1, 'Messages array should have one message');
    assertTruthy(eventFired, 'messageAdded event should be fired');
    assertEqual(eventMessage, addedMessage, 'Event should pass the added message');
  });

  it('should mark self messages correctly', () => {
    const state = new ChatState();
    const currentUser = new User('currentuser');
    state.setCurrentUser(currentUser);
    
    const messageData = { handle: 'currentuser', text: 'Hello', type: 'chat' };
    const addedMessage = state.addMessage(messageData);
    
    assertTruthy(addedMessage.isSelf, 'Message from current user should be marked as self');
    assertEqual(addedMessage.status, 'sending', 'Self message should have sending status');
  });

  it('should limit messages for performance', () => {
    const state = new ChatState();
    state.maxMessages = 3; // Set low limit for testing
    
    let removedMessages = null;
    state.on('messagesRemoved', (removed) => {
      removedMessages = removed;
    });
    
    // Add messages beyond limit
    for (let i = 0; i < 5; i++) {
      state.addMessage({ handle: `user${i}`, text: `Message ${i}` });
    }
    
    assertEqual(state.messages.length, 3, 'Should limit messages to maxMessages');
    assertTruthy(removedMessages, 'Should fire messagesRemoved event');
    assertEqual(removedMessages.length, 2, 'Should remove 2 oldest messages');
    assertEqual(state.messages[0].text, 'Message 2', 'Should keep newest messages');
  });

  it('should update message status', () => {
    const state = new ChatState();
    const message = new Message('testuser', 'Hello');
    state.messages.push(message);
    
    let eventFired = false;
    state.on('messageUpdated', (updatedMessage) => {
      eventFired = true;
      assertEqual(updatedMessage, message, 'Event should pass updated message');
    });
    
    const updatedMessage = state.updateMessage(message.id, { status: 'sent' });
    
    assertEqual(updatedMessage, message, 'Should return the updated message');
    assertEqual(message.status, 'sent', 'Message status should be updated');
    assertTruthy(eventFired, 'messageUpdated event should be fired');
  });

  it('should get messages correctly', () => {
    const state = new ChatState();
    const message1 = new Message('user1', 'Hello');
    const message2 = new Message('user2', 'Hi');
    
    state.messages.push(message1, message2);
    
    const messages = state.getMessages();
    
    assertInstanceOf(messages, Array, 'Should return an array');
    assertEqual(messages.length, 2, 'Should return all messages');
    assert(messages !== state.messages, 'Should return a copy, not the original array');
  });

  it('should get recent messages correctly', () => {
    const state = new ChatState();
    
    // Add 10 messages
    for (let i = 0; i < 10; i++) {
      state.messages.push(new Message(`user${i}`, `Message ${i}`));
    }
    
    const recentMessages = state.getRecentMessages(5);
    
    assertEqual(recentMessages.length, 5, 'Should return requested number of recent messages');
    assertEqual(recentMessages[0].text, 'Message 5', 'Should return the most recent messages');
    assertEqual(recentMessages[4].text, 'Message 9', 'Should include the latest message');
  });

  it('should manage connection status', () => {
    const state = new ChatState();
    let eventFired = false;
    let eventStatus = null;
    
    state.on('connectionStatusChanged', (status) => {
      eventFired = true;
      eventStatus = status;
    });
    
    state.setConnectionStatus('connected');
    
    assertEqual(state.connectionStatus, 'connected', 'Connection status should be updated');
    assertTruthy(eventFired, 'connectionStatusChanged event should be fired');
    assertEqual(eventStatus, 'connected', 'Event should pass the new status');
  });

  it('should not fire event if connection status unchanged', () => {
    const state = new ChatState();
    let eventCount = 0;
    
    state.on('connectionStatusChanged', () => {
      eventCount++;
    });
    
    state.setConnectionStatus('disconnected'); // Same as initial
    state.setConnectionStatus('connected');
    state.setConnectionStatus('connected'); // Same as previous
    
    assertEqual(eventCount, 1, 'Event should only fire when status actually changes');
  });

  it('should handle event system correctly', () => {
    const state = new ChatState();
    let callCount = 0;
    let lastData = null;
    
    const callback = (data) => {
      callCount++;
      lastData = data;
    };
    
    // Add listener
    state.on('testEvent', callback);
    
    // Emit event
    state.emit('testEvent', 'test data');
    
    assertEqual(callCount, 1, 'Callback should be called once');
    assertEqual(lastData, 'test data', 'Callback should receive event data');
    
    // Remove listener
    state.off('testEvent', callback);
    
    // Emit again
    state.emit('testEvent', 'new data');
    
    assertEqual(callCount, 1, 'Callback should not be called after removal');
    assertEqual(lastData, 'test data', 'Data should not change after removal');
  });

  it('should handle multiple event listeners', () => {
    const state = new ChatState();
    let call1 = false;
    let call2 = false;
    
    state.on('testEvent', () => { call1 = true; });
    state.on('testEvent', () => { call2 = true; });
    
    state.emit('testEvent');
    
    assertTruthy(call1, 'First callback should be called');
    assertTruthy(call2, 'Second callback should be called');
  });

  it('should handle event listener errors gracefully', () => {
    const state = new ChatState();
    let goodCallbackCalled = false;
    
    // Add a callback that throws an error
    state.on('testEvent', () => {
      throw new Error('Test error');
    });
    
    // Add a good callback
    state.on('testEvent', () => {
      goodCallbackCalled = true;
    });
    
    // This should not throw, and good callback should still be called
    state.emit('testEvent');
    
    assertTruthy(goodCallbackCalled, 'Good callback should be called despite error in other callback');
  });

  it('should clear state correctly', () => {
    const state = new ChatState();
    const user = new User('testuser');
    const message = new Message('testuser', 'Hello');
    
    // Set up some state
    state.setCurrentUser(user);
    state.addUser(user);
    state.addMessage(message);
    state.selectedUser = user;
    
    let eventFired = false;
    state.on('stateCleared', () => {
      eventFired = true;
    });
    
    state.clear();
    
    assertEqual(state.currentUser, null, 'Current user should be cleared');
    assertEqual(state.users.size, 0, 'Users should be cleared');
    assertEqual(state.messages.length, 0, 'Messages should be cleared');
    assertEqual(state.selectedUser, null, 'Selected user should be cleared');
    assertTruthy(eventFired, 'stateCleared event should be fired');
  });

});