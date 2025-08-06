/**
 * Unit Tests for User Model
 * Tests the User class functionality including creation, serialization, and state management
 */

describe('User Model', () => {
  
  it('should create a user with valid properties', () => {
    const user = new User('testuser', 'avatar.png', 'custom');
    
    assertType(user.id, 'string', 'User ID should be a string');
    assertEqual(user.handle, 'testuser', 'User handle should match input');
    assertEqual(user.avatar, 'avatar.png', 'User avatar should match input');
    assertEqual(user.avatarType, 'custom', 'User avatar type should match input');
    assertTruthy(user.isOnline, 'User should be online by default');
    assertType(user.lastSeen, 'number', 'Last seen should be a timestamp');
    assertType(user.lastActivity, 'number', 'Last activity should be a timestamp');
  });

  it('should generate unique IDs for different users', () => {
    const user1 = new User('user1');
    const user2 = new User('user2');
    
    assert(user1.id !== user2.id, 'User IDs should be unique');
    assertType(user1.id, 'string', 'User ID should be a string');
    assert(user1.id.length > 0, 'User ID should not be empty');
  });

  it('should handle default values correctly', () => {
    const user = new User('testuser');
    
    assertEqual(user.avatar, null, 'Default avatar should be null');
    assertEqual(user.avatarType, 'initial', 'Default avatar type should be initial');
    assertTruthy(user.isOnline, 'User should be online by default');
  });

  it('should update activity timestamp', () => {
    const user = new User('testuser');
    const originalActivity = user.lastActivity;
    
    // Wait a bit to ensure timestamp difference
    setTimeout(() => {
      user.updateActivity();
      assert(user.lastActivity > originalActivity, 'Activity timestamp should be updated');
    }, 10);
  });

  it('should set user offline correctly', () => {
    const user = new User('testuser');
    const beforeOffline = Date.now();
    
    user.setOffline();
    
    assertFalsy(user.isOnline, 'User should be offline');
    assert(user.lastSeen >= beforeOffline, 'Last seen should be updated when going offline');
  });

  it('should set user online correctly', () => {
    const user = new User('testuser');
    user.setOffline();
    const beforeOnline = user.lastActivity;
    
    user.setOnline();
    
    assertTruthy(user.isOnline, 'User should be online');
    assert(user.lastActivity > beforeOnline, 'Activity should be updated when going online');
  });

  it('should serialize to JSON correctly', () => {
    const user = new User('testuser', 'avatar.png', 'custom');
    const json = user.toJSON();
    
    assertType(json, 'object', 'toJSON should return an object');
    assertEqual(json.id, user.id, 'JSON should contain user ID');
    assertEqual(json.handle, user.handle, 'JSON should contain user handle');
    assertEqual(json.avatar, user.avatar, 'JSON should contain user avatar');
    assertEqual(json.avatarType, user.avatarType, 'JSON should contain avatar type');
    assertEqual(json.isOnline, user.isOnline, 'JSON should contain online status');
    assertEqual(json.lastSeen, user.lastSeen, 'JSON should contain last seen timestamp');
    assertEqual(json.lastActivity, user.lastActivity, 'JSON should contain last activity timestamp');
  });

  it('should deserialize from JSON correctly', () => {
    const originalUser = new User('testuser', 'avatar.png', 'custom');
    const json = originalUser.toJSON();
    const deserializedUser = User.fromJSON(json);
    
    assertInstanceOf(deserializedUser, User, 'Deserialized object should be a User instance');
    assertEqual(deserializedUser.id, originalUser.id, 'Deserialized user should have same ID');
    assertEqual(deserializedUser.handle, originalUser.handle, 'Deserialized user should have same handle');
    assertEqual(deserializedUser.avatar, originalUser.avatar, 'Deserialized user should have same avatar');
    assertEqual(deserializedUser.avatarType, originalUser.avatarType, 'Deserialized user should have same avatar type');
    assertEqual(deserializedUser.isOnline, originalUser.isOnline, 'Deserialized user should have same online status');
    assertEqual(deserializedUser.lastSeen, originalUser.lastSeen, 'Deserialized user should have same last seen');
    assertEqual(deserializedUser.lastActivity, originalUser.lastActivity, 'Deserialized user should have same last activity');
  });

  it('should handle empty or invalid handle gracefully', () => {
    const user1 = new User('');
    const user2 = new User(null);
    const user3 = new User(undefined);
    
    assertEqual(user1.handle, '', 'Empty handle should be preserved');
    assertEqual(user2.handle, null, 'Null handle should be preserved');
    assertEqual(user3.handle, undefined, 'Undefined handle should be preserved');
    
    // All should still have valid IDs
    assertType(user1.id, 'string', 'User with empty handle should still have ID');
    assertType(user2.id, 'string', 'User with null handle should still have ID');
    assertType(user3.id, 'string', 'User with undefined handle should still have ID');
  });

  it('should maintain consistent state after multiple operations', () => {
    const user = new User('testuser');
    
    // Perform multiple state changes
    user.setOffline();
    user.updateActivity();
    user.setOnline();
    user.updateActivity();
    
    // Verify final state is consistent
    assertTruthy(user.isOnline, 'User should be online after final setOnline');
    assertType(user.lastSeen, 'number', 'Last seen should still be a valid timestamp');
    assertType(user.lastActivity, 'number', 'Last activity should still be a valid timestamp');
    assert(user.lastActivity >= user.lastSeen, 'Last activity should be >= last seen');
  });

});