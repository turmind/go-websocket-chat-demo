// ===== MODERN CHAT APPLICATION ARCHITECTURE =====

/**
 * Core data models for the chat application
 */

/**
 * User model representing a chat user
 */
class User {
  constructor(handle, avatar = null, avatarType = 'initial') {
    this.id = this.generateId();
    this.handle = handle;
    this.avatar = avatar;
    this.avatarType = avatarType;
    this.isOnline = true;
    this.lastSeen = Date.now();
    this.lastActivity = Date.now();
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  updateActivity() {
    this.lastActivity = Date.now();
  }

  setOffline() {
    this.isOnline = false;
    this.lastSeen = Date.now();
  }

  setOnline() {
    this.isOnline = true;
    this.updateActivity();
  }

  toJSON() {
    return {
      id: this.id,
      handle: this.handle,
      avatar: this.avatar,
      avatarType: this.avatarType,
      isOnline: this.isOnline,
      lastSeen: this.lastSeen,
      lastActivity: this.lastActivity
    };
  }

  static fromJSON(data) {
    const user = new User(data.handle, data.avatar, data.avatarType);
    user.id = data.id;
    user.isOnline = data.isOnline;
    user.lastSeen = data.lastSeen;
    user.lastActivity = data.lastActivity;
    return user;
  }
}

/**
 * Message model representing a chat message
 */
class Message {
  constructor(handle, text, type = 'chat') {
    this.id = this.generateId();
    this.handle = handle;
    this.text = text;
    this.type = type; // 'chat', 'system', 'user_join', 'user_leave'
    this.timestamp = Date.now();
    this.isSelf = false;
    this.status = 'received'; // 'sending', 'sent', 'failed', 'received'
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  markAsSelf() {
    this.isSelf = true;
    this.status = 'sending';
  }

  updateStatus(status) {
    this.status = status;
  }

  toJSON() {
    return {
      id: this.id,
      handle: this.handle,
      text: this.text,
      type: this.type,
      timestamp: this.timestamp,
      isSelf: this.isSelf,
      status: this.status
    };
  }

  static fromJSON(data) {
    const message = new Message(data.handle, data.text, data.type);
    message.id = data.id;
    message.timestamp = data.timestamp;
    message.isSelf = data.isSelf;
    message.status = data.status;
    return message;
  }
}

/**
 * Central state management for the chat application
 */
class ChatState {
  constructor() {
    this.currentUser = null;
    this.users = new Map();
    this.messages = [];
    this.selectedUser = null;
    this.connectionStatus = 'disconnected';
    this.eventListeners = new Map();
    this.maxMessages = 1000; // Limit messages for performance
  }

  // User management
  setCurrentUser(user) {
    this.currentUser = user;
    this.emit('currentUserChanged', user);
  }

  addUser(userData) {
    const user = userData instanceof User ? userData : new User(userData.handle, userData.avatar, userData.avatarType);
    this.users.set(user.id, user);
    this.emit('userAdded', user);
    return user;
  }

  removeUser(userId) {
    const user = this.users.get(userId);
    if (user) {
      this.users.delete(userId);
      this.emit('userRemoved', user);
    }
    return user;
  }

  updateUser(userId, updates) {
    const user = this.users.get(userId);
    if (user) {
      Object.assign(user, updates);
      this.emit('userUpdated', user);
    }
    return user;
  }

  getUserByHandle(handle) {
    for (const user of this.users.values()) {
      if (user.handle === handle) {
        return user;
      }
    }
    return null;
  }

  getOnlineUsers() {
    return Array.from(this.users.values()).filter(user => user.isOnline);
  }

  // Message management
  addMessage(messageData) {
    const message = messageData instanceof Message ? messageData : new Message(messageData.handle, messageData.text, messageData.type);
    
    // Set isSelf flag if message is from current user
    if (this.currentUser && message.handle === this.currentUser.handle) {
      message.markAsSelf();
    }

    this.messages.push(message);
    
    // Limit messages for performance
    if (this.messages.length > this.maxMessages) {
      const removed = this.messages.splice(0, this.messages.length - this.maxMessages);
      this.emit('messagesRemoved', removed);
    }

    this.emit('messageAdded', message);
    return message;
  }

  updateMessage(messageId, updates) {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      Object.assign(message, updates);
      this.emit('messageUpdated', message);
    }
    return message;
  }

  getMessages() {
    return [...this.messages];
  }

  getRecentMessages(count = 50) {
    return this.messages.slice(-count);
  }

  // Connection status management
  setConnectionStatus(status) {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.emit('connectionStatusChanged', status);
    }
  }

  // Event system for component communication
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // State persistence
  saveToStorage() {
    try {
      const state = {
        currentUser: this.currentUser ? this.currentUser.toJSON() : null,
        users: Array.from(this.users.values()).map(user => user.toJSON()),
        messages: this.messages.slice(-100).map(message => message.toJSON()) // Save only recent messages
      };
      localStorage.setItem('chatState', JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save state to storage:', error);
    }
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('chatState');
      if (stored) {
        const state = JSON.parse(stored);
        
        if (state.currentUser) {
          this.currentUser = User.fromJSON(state.currentUser);
        }
        
        if (state.users) {
          state.users.forEach(userData => {
            const user = User.fromJSON(userData);
            this.users.set(user.id, user);
          });
        }
        
        if (state.messages) {
          this.messages = state.messages.map(messageData => Message.fromJSON(messageData));
        }
      }
    } catch (error) {
      console.error('Failed to load state from storage:', error);
    }
  }

  // Clear all data
  clear() {
    this.currentUser = null;
    this.users.clear();
    this.messages = [];
    this.selectedUser = null;
    this.emit('stateCleared');
  }
}

// ===== AVATAR GENERATION SYSTEM =====

/**
 * Avatar generation and management system
 */
class AvatarGenerator {
  constructor() {
    this.avatarCache = new Map();
    this.colorPalette = [
      '#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8',
      '#6f42c1', '#e83e8c', '#fd7e14', '#20c997', '#6c757d',
      '#343a40', '#495057', '#0056b3', '#1e7e34', '#c82333',
      '#e0a800', '#138496', '#5a32a3', '#d91a72', '#e8650e'
    ];
    this.presetAvatars = [
      { id: 'default', name: '默认头像', type: 'initial' },
      { id: 'avatar1', name: '头像1', emoji: '😀' },
      { id: 'avatar2', name: '头像2', emoji: '😎' },
      { id: 'avatar3', name: '头像3', emoji: '🤖' },
      { id: 'avatar4', name: '头像4', emoji: '👨‍💻' },
      { id: 'avatar5', name: '头像5', emoji: '👩‍💻' },
      { id: 'avatar6', name: '头像6', emoji: '🦄' },
      { id: 'avatar7', name: '头像7', emoji: '🐱' },
      { id: 'avatar8', name: '头像8', emoji: '🐶' },
      { id: 'avatar9', name: '头像9', emoji: '🌟' },
      { id: 'avatar10', name: '头像10', emoji: '🎯' }
    ];
    this.initializePresetAvatars();
  }

  /**
   * Generate avatar based on username
   * @param {string} username - User's name
   * @param {string} type - Avatar type ('initial', 'preset', 'custom')
   * @param {string} customValue - Custom avatar value (emoji or image URL)
   * @returns {Object} Avatar configuration
   */
  generateAvatar(username, type = 'initial', customValue = null) {
    const cacheKey = `${username}-${type}-${customValue}`;
    
    if (this.avatarCache.has(cacheKey)) {
      return this.avatarCache.get(cacheKey);
    }

    let avatar;
    
    switch (type) {
      case 'preset':
        avatar = this.generatePresetAvatar(username, customValue);
        break;
      case 'custom':
        avatar = this.generateCustomAvatar(username, customValue);
        break;
      case 'initial':
      default:
        avatar = this.generateInitialAvatar(username);
        break;
    }

    this.avatarCache.set(cacheKey, avatar);
    return avatar;
  }

  /**
   * Generate initial-based avatar (first letter of username)
   * @param {string} username - User's name
   * @returns {Object} Avatar configuration
   */
  generateInitialAvatar(username) {
    if (!username || username.trim() === '') {
      return {
        type: 'initial',
        initial: '?',
        backgroundColor: this.colorPalette[0],
        textColor: '#ffffff'
      };
    }

    const cleanName = username.trim();
    const initial = this.getInitial(cleanName);
    const backgroundColor = this.getColorForName(cleanName);

    return {
      type: 'initial',
      initial: initial,
      backgroundColor: backgroundColor,
      textColor: '#ffffff'
    };
  }

  /**
   * Generate preset emoji avatar
   * @param {string} username - User's name
   * @param {string} presetId - Preset avatar ID
   * @returns {Object} Avatar configuration
   */
  generatePresetAvatar(username, presetId) {
    const preset = this.presetAvatars.find(p => p.id === presetId);
    if (!preset) {
      return this.generateInitialAvatar(username);
    }

    if (preset.type === 'initial') {
      return this.generateInitialAvatar(username);
    }

    return {
      type: 'preset',
      emoji: preset.emoji,
      backgroundColor: '#f8f9fa',
      textColor: '#212529'
    };
  }

  /**
   * Generate custom avatar (emoji or image)
   * @param {string} username - User's name
   * @param {string} customValue - Custom emoji or image URL
   * @returns {Object} Avatar configuration
   */
  generateCustomAvatar(username, customValue) {
    if (!customValue) {
      return this.generateInitialAvatar(username);
    }

    // Check if it's an emoji (simple check for unicode emoji)
    if (this.isEmoji(customValue)) {
      return {
        type: 'custom',
        emoji: customValue,
        backgroundColor: '#f8f9fa',
        textColor: '#212529'
      };
    }

    // Assume it's an image URL
    return {
      type: 'custom',
      imageUrl: customValue,
      backgroundColor: '#f8f9fa',
      textColor: '#212529'
    };
  }

  /**
   * Get the first character/initial from a name
   * @param {string} name - User's name
   * @returns {string} First character or initial
   */
  getInitial(name) {
    if (!name) return '?';
    
    // Handle Chinese characters, English letters, and other unicode characters
    const firstChar = name.charAt(0).toUpperCase();
    
    // If it's a Chinese character, return it directly
    if (this.isChinese(firstChar)) {
      return firstChar;
    }
    
    // If it's an English letter, return it
    if (/[A-Z]/.test(firstChar)) {
      return firstChar;
    }
    
    // For other characters, try to get the first meaningful character
    const meaningfulChar = name.match(/[\u4e00-\u9fff\u3400-\u4dbf\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}\u{2b740}-\u{2b81f}\u{2b820}-\u{2ceaf}\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f\uf900-\ufaff\u{2f800}-\u{2fa1f}a-zA-Z]/u);
    
    return meaningfulChar ? meaningfulChar[0].toUpperCase() : '?';
  }

  /**
   * Check if a character is Chinese
   * @param {string} char - Character to check
   * @returns {boolean} True if Chinese character
   */
  isChinese(char) {
    return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(char);
  }

  /**
   * Check if a string is an emoji
   * @param {string} str - String to check
   * @returns {boolean} True if emoji
   */
  isEmoji(str) {
    const emojiRegex = /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/gu;
    return emojiRegex.test(str);
  }

  /**
   * Generate a consistent color for a given name
   * @param {string} name - User's name
   * @returns {string} Hex color code
   */
  getColorForName(name) {
    if (!name) return this.colorPalette[0];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % this.colorPalette.length;
    return this.colorPalette[index];
  }

  /**
   * Initialize preset avatar options in the UI
   */
  initializePresetAvatars() {
    const select = document.getElementById('user-avatar-select');
    if (select) {
      // Clear existing options except default
      select.innerHTML = '<option value="default">默认头像</option>';
      
      // Add preset options
      this.presetAvatars.slice(1).forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.id;
        option.textContent = `${preset.emoji} ${preset.name}`;
        select.appendChild(option);
      });
    }
  }

  /**
   * Create avatar HTML element
   * @param {Object} avatarConfig - Avatar configuration
   * @param {string} size - Avatar size ('sm', 'md', 'lg')
   * @returns {string} HTML string for avatar
   */
  createAvatarHTML(avatarConfig, size = 'md') {
    const sizeClass = size !== 'md' ? `avatar-${size}` : '';
    
    if (avatarConfig.type === 'custom' && avatarConfig.imageUrl) {
      return `<div class="avatar ${sizeClass}" style="background-image: url('${avatarConfig.imageUrl}'); background-size: cover; background-position: center;"></div>`;
    }
    
    if (avatarConfig.emoji) {
      return `<div class="avatar ${sizeClass}" style="background-color: ${avatarConfig.backgroundColor}; color: ${avatarConfig.textColor};">
        <span style="font-size: 1.2em;">${avatarConfig.emoji}</span>
      </div>`;
    }
    
    return `<div class="avatar ${sizeClass}" style="background-color: ${avatarConfig.backgroundColor}; color: ${avatarConfig.textColor};">
      <span>${avatarConfig.initial}</span>
    </div>`;
  }

  /**
   * Update avatar in the DOM
   * @param {string} selector - CSS selector for avatar container
   * @param {Object} avatarConfig - Avatar configuration
   * @param {string} size - Avatar size
   */
  updateAvatarInDOM(selector, avatarConfig, size = 'md') {
    const container = document.querySelector(selector);
    if (container) {
      container.innerHTML = this.createAvatarHTML(avatarConfig, size);
    }
  }

  /**
   * Get cached avatar or generate new one
   * @param {string} username - User's name
   * @param {string} type - Avatar type
   * @param {string} customValue - Custom value
   * @returns {Object} Avatar configuration
   */
  getAvatar(username, type = 'initial', customValue = null) {
    return this.generateAvatar(username, type, customValue);
  }

  /**
   * Clear avatar cache
   */
  clearCache() {
    this.avatarCache.clear();
  }

  /**
   * Get all preset avatars
   * @returns {Array} Array of preset avatar configurations
   */
  getPresetAvatars() {
    return this.presetAvatars;
  }
}

// ===== CONNECTION STATUS AND ERROR HANDLING SYSTEM =====

/**
 * Connection status management class
 */
class ConnectionStatusManager {
  constructor() {
    this.status = 'disconnected';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.connectionTimeout = null;
    this.isReconnecting = false;
    this.lastPingTime = null;
    this.connectionQuality = 'good'; // 'good', 'poor', 'bad'
    
    this.initializeStatusIndicator();
  }

  /**
   * Initialize connection status indicator in UI
   */
  initializeStatusIndicator() {
    let statusElement = document.getElementById('connection-status');
    if (!statusElement) {
      statusElement = document.createElement('div');
      statusElement.id = 'connection-status';
      statusElement.className = 'connection-status';
      statusElement.setAttribute('role', 'status');
      statusElement.setAttribute('aria-live', 'polite');
      document.body.appendChild(statusElement);
    }
  }

  /**
   * Update connection status with visual feedback
   * @param {string} status - Connection status
   * @param {string} message - Optional custom message
   */
  updateStatus(status, message = null) {
    this.status = status;
    const statusElement = document.getElementById('connection-status');
    const chatStatusElement = document.getElementById('chat-status');
    
    const statusConfig = {
      'connecting': {
        message: message || '连接中...',
        className: 'connecting',
        chatMessage: '连接中...',
        autoHide: false
      },
      'connected': {
        message: message || '已连接',
        className: 'connected',
        chatMessage: '已连接',
        autoHide: true,
        autoHideDelay: 2000
      },
      'reconnecting': {
        message: message || `重连中... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
        className: 'reconnecting',
        chatMessage: '重新连接中...',
        autoHide: false
      },
      'disconnected': {
        message: message || '连接断开',
        className: 'disconnected',
        chatMessage: '连接断开',
        autoHide: false
      },
      'error': {
        message: message || '连接错误',
        className: 'error',
        chatMessage: '连接错误',
        autoHide: false
      },
      'poor_connection': {
        message: message || '网络连接不稳定',
        className: 'warning',
        chatMessage: '网络不稳定',
        autoHide: true,
        autoHideDelay: 5000
      }
    };

    const config = statusConfig[status] || statusConfig['error'];
    
    // Update main status indicator
    if (statusElement) {
      statusElement.className = `connection-status ${config.className}`;
      statusElement.innerHTML = `<span class="status-text">${config.message}</span>`;
      
      // Show status indicator
      statusElement.classList.add('visible');
      
      // Auto-hide if configured
      if (config.autoHide) {
        setTimeout(() => {
          statusElement.classList.remove('visible');
        }, config.autoHideDelay);
      }
    }
    
    // Update chat header status
    if (chatStatusElement) {
      chatStatusElement.textContent = config.chatMessage;
      chatStatusElement.className = `chat-subtitle ${config.className}`;
    }
    
    // Update connection quality indicator
    this.updateConnectionQualityIndicator();
    
    console.log(`Connection status updated: ${status} - ${config.message}`);
  }

  /**
   * Update connection quality indicator
   */
  updateConnectionQualityIndicator() {
    const qualityElement = document.querySelector('.connection-quality');
    if (qualityElement) {
      qualityElement.className = `connection-quality ${this.connectionQuality}`;
      
      const qualityTexts = {
        'good': '网络良好',
        'poor': '网络较慢',
        'bad': '网络很差'
      };
      
      qualityElement.textContent = qualityTexts[this.connectionQuality] || '';
    }
  }

  /**
   * Show error notification with retry option
   * @param {string} errorMessage - Error message
   * @param {boolean} showRetry - Whether to show retry button
   */
  showErrorNotification(errorMessage, showRetry = true) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-notification';
    errorElement.setAttribute('role', 'alert');
    errorElement.innerHTML = `
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-message">${errorMessage}</span>
        ${showRetry ? '<button class="retry-button" onclick="connectionStatusManager.retryConnection()">重试</button>' : ''}
        <button class="close-error" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    document.body.appendChild(errorElement);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (errorElement.parentNode) {
        errorElement.parentNode.removeChild(errorElement);
      }
    }, 10000);
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (box && box.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now();
        try {
          box.send(JSON.stringify({ type: 'ping', timestamp: this.lastPingTime }));
        } catch (error) {
          console.warn('Failed to send heartbeat:', error);
          this.handleConnectionError('心跳检测失败');
        }
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle heartbeat response
   * @param {number} responseTime - Response time in milliseconds
   */
  handleHeartbeatResponse(responseTime) {
    const latency = responseTime - this.lastPingTime;
    
    // Update connection quality based on latency
    if (latency < 100) {
      this.connectionQuality = 'good';
    } else if (latency < 500) {
      this.connectionQuality = 'poor';
    } else {
      this.connectionQuality = 'bad';
      this.updateStatus('poor_connection', `网络延迟较高 (${latency}ms)`);
    }
    
    this.updateConnectionQualityIndicator();
  }

  /**
   * Handle connection error
   * @param {string} errorMessage - Error message
   */
  handleConnectionError(errorMessage) {
    this.updateStatus('error', errorMessage);
    this.showErrorNotification(errorMessage);
    
    // Start reconnection if not already reconnecting
    if (!this.isReconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.startReconnection();
    }
  }

  /**
   * Start reconnection process
   */
  startReconnection() {
    if (this.isReconnecting) return;
    
    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    this.updateStatus('reconnecting');
    
    // Exponential backoff for reconnection delay
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    setTimeout(() => {
      this.attemptReconnection();
    }, delay);
  }

  /**
   * Attempt to reconnect
   */
  attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateStatus('error', '连接失败，请刷新页面重试');
      this.showErrorNotification('连接失败，请刷新页面重试', false);
      this.isReconnecting = false;
      return;
    }
    
    try {
      // Create new WebSocket connection
      box = new ReconnectingWebSocket(location.protocol.replace("http","ws") + "//" + location.host + "/ws");
      this.setupWebSocketHandlers();
    } catch (error) {
      console.error('Reconnection failed:', error);
      this.startReconnection();
    }
  }

  /**
   * Manual retry connection
   */
  retryConnection() {
    this.reconnectAttempts = 0;
    this.isReconnecting = false;
    this.startReconnection();
  }

  /**
   * Reset connection state
   */
  resetConnectionState() {
    this.reconnectAttempts = 0;
    this.isReconnecting = false;
    this.connectionQuality = 'good';
    this.stopHeartbeat();
  }

  /**
   * Setup WebSocket event handlers
   */
  setupWebSocketHandlers() {
    box.onopen = () => {
      console.log('WebSocket connected');
      this.resetConnectionState();
      this.updateStatus('connected');
      this.startHeartbeat();
      
      // Dispatch connection restored event
      document.dispatchEvent(new CustomEvent('connectionRestored'));
      
      // Request current user list
      if (userStatusManager.currentUser) {
        box.send(JSON.stringify({ 
          type: 'request_user_list',
          handle: userStatusManager.currentUser.handle 
        }));
      }
    };

    box.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.stopHeartbeat();
      
      if (event.code === 1000) {
        // Normal closure
        this.updateStatus('disconnected', '连接已关闭');
      } else {
        // Abnormal closure
        this.handleConnectionError('连接意外断开');
      }
    };

    box.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.handleConnectionError('网络连接错误');
    };

    box.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data);
        
        // Handle heartbeat response
        if (data.type === 'pong') {
          this.handleHeartbeatResponse(data.timestamp);
          return;
        }
        
        // Handle different message types
        if (data.type === 'user_join') {
          userStatusManager.addUser({
            handle: data.handle,
            status: 'online'
          });
        } else if (data.type === 'user_leave') {
          const userId = userStatusManager.generateUserId(data.handle);
          userStatusManager.removeUser(userId);
        } else if (data.type === 'user_list') {
          if (data.users && Array.isArray(data.users)) {
            data.users.forEach(user => {
              userStatusManager.addUser({
                handle: user.handle || user,
                status: 'online'
              });
            });
          }
        } else {
          // Regular chat message
          handleChatMessage(data);
          
          // Update user activity
          const userId = userStatusManager.generateUserId(data.handle);
          userStatusManager.updateUserActivity(userId);
        }
        
        // Add message through performance manager
        messagePerformanceManager.addMessage({
          id: data.id || messagePerformanceManager.generateMessageId(),
          handle: data.handle,
          text: data.text,
          timestamp: data.timestamp || Date.now(),
          type: data.type || 'incoming'
        });

        // Legacy support
        $("#chat-text").append("<div class='panel panel-default'><div class='panel-heading'>" + $('<span/>').text(data.handle).html() + "</div><div class='panel-body'>" + $('<span/>').text(data.text).html() + "</div></div>");
        $("#chat-text").stop().animate({
          scrollTop: $('#chat-text')[0].scrollHeight
        }, 800);
        
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
  }
}

// ===== WEBSOCKET INTEGRATION WITH USER MANAGEMENT =====

// ===== MODERN WEBSOCKET INTEGRATION =====

/**
 * Modern WebSocket manager with event-driven architecture
 */
class WebSocketManager {
  constructor(chatState) {
    this.chatState = chatState;
    this.websocket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.isReconnecting = false;
    this.messageQueue = [];
    
    this.setupEventListeners();
  }

  /**
   * Initialize WebSocket connection
   */
  connect() {
    try {
      const wsUrl = location.protocol.replace("http", "ws") + "//" + location.host + "/ws";
      this.websocket = new ReconnectingWebSocket(wsUrl);
      this.setupWebSocketHandlers();
      this.chatState.setConnectionStatus('connecting');
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.chatState.setConnectionStatus('error');
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupWebSocketHandlers() {
    if (!this.websocket) return;

    this.websocket.onopen = (event) => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      this.chatState.setConnectionStatus('connected');
      this.startHeartbeat();
      this.processMessageQueue();
      
      // Request current user list if we have a current user
      if (this.chatState.currentUser) {
        this.sendMessage({
          type: 'request_user_list',
          handle: this.chatState.currentUser.handle
        });
      }
    };

    this.websocket.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.stopHeartbeat();
      
      if (event.code === 1000) {
        this.chatState.setConnectionStatus('disconnected');
      } else {
        this.chatState.setConnectionStatus('error');
        this.handleReconnection();
      }
    };

    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.chatState.setConnectionStatus('error');
    };

    this.websocket.onmessage = (event) => {
      this.handleMessage(event);
    };
  }

  /**
   * Handle incoming WebSocket messages with enhanced processing
   * @param {MessageEvent} event - WebSocket message event
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      // Add message metadata
      data.receivedAt = Date.now();
      data.processed = false;
      
      // Validate message structure
      if (!this.validateMessage(data)) {
        console.warn('Invalid message received:', data);
        return;
      }
      
      // Route message based on type
      this.routeMessage(data);
      
      // Mark as processed
      data.processed = true;
      
      // Emit raw message event for debugging/logging
      this.chatState.emit('messageReceived', data);
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      this.chatState.emit('messageError', { error, rawData: event.data });
    }
  }

  /**
   * Validate incoming message structure
   * @param {Object} data - Message data
   * @returns {boolean} True if valid
   */
  validateMessage(data) {
    // Basic validation
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check for required fields based on message type
    switch (data.type) {
      case 'chat':
        return data.handle && data.text;
      case 'user_join':
      case 'user_leave':
        return data.handle;
      case 'user_list':
        return Array.isArray(data.users);
      case 'system':
        return data.text;
      case 'pong':
        return data.timestamp;
      default:
        // Legacy format validation
        return data.handle && data.text;
    }
  }

  /**
   * Route message to appropriate handler using MessageRouter
   * @param {Object} data - Message data
   */
  routeMessage(data) {
    // Use the global message router for processing
    if (typeof messageRouter !== 'undefined') {
      messageRouter.processMessage(data);
    } else {
      // Fallback to legacy handling
      this.handleLegacyRouting(data);
    }
  }

  /**
   * Legacy message routing fallback
   * @param {Object} data - Message data
   */
  handleLegacyRouting(data) {
    const messageType = data.type || 'chat';
    
    // Get handler method name
    const handlerName = `handle${messageType.charAt(0).toUpperCase() + messageType.slice(1).replace('_', '')}Message`;
    
    // Check if handler exists
    if (typeof this[handlerName] === 'function') {
      this[handlerName](data);
    } else {
      // Fallback to generic handler
      this.handleGenericMessage(data);
    }
  }

  /**
   * Handle generic/unknown message types
   * @param {Object} data - Message data
   */
  handleGenericMessage(data) {
    console.log('Handling generic message:', data);
    
    // Try to handle as legacy chat message
    if (data.handle && data.text) {
      this.handleChatMessage(data);
    } else {
      console.warn('Unknown message type:', data);
    }
  }

  /**
   * Handle chat messages
   * @param {Object} data - Message data
   */
  handleChatMessage(data) {
    const message = new Message(data.handle, data.text, 'chat');
    message.timestamp = data.timestamp || Date.now();
    
    // Update user activity
    const user = this.chatState.getUserByHandle(data.handle);
    if (user) {
      user.updateActivity();
    }
    
    this.chatState.addMessage(message);
  }

  /**
   * Handle user join events with enhanced processing
   * @param {Object} data - User join data
   */
  handleUserjoinMessage(data) {
    // Check if user already exists
    let existingUser = this.chatState.getUserByHandle(data.handle);
    
    if (existingUser) {
      // User rejoined - update status
      existingUser.setOnline();
      this.chatState.emit('userRejoined', existingUser);
    } else {
      // New user joined
      const user = new User(data.handle, data.avatar, data.avatarType);
      this.chatState.addUser(user);
    }
    
    // Add system message with timestamp
    const systemMessage = new Message('系统', `${data.handle} 加入了聊天`, 'user_join');
    systemMessage.timestamp = data.timestamp || Date.now();
    this.chatState.addMessage(systemMessage);
    
    // Emit specific join event
    this.chatState.emit('userJoinedChat', { handle: data.handle, timestamp: systemMessage.timestamp });
  }

  /**
   * Handle user leave events with enhanced processing
   * @param {Object} data - User leave data
   */
  handleUserleaveMessage(data) {
    const user = this.chatState.getUserByHandle(data.handle);
    if (user) {
      // Mark user as offline instead of removing immediately
      user.setOffline();
      
      // Remove after delay to handle quick reconnections
      setTimeout(() => {
        const stillOfflineUser = this.chatState.getUserByHandle(data.handle);
        if (stillOfflineUser && !stillOfflineUser.isOnline) {
          this.chatState.removeUser(stillOfflineUser.id);
        }
      }, 30000); // 30 second grace period
      
      // Add system message with timestamp
      const systemMessage = new Message('系统', `${data.handle} 离开了聊天`, 'user_leave');
      systemMessage.timestamp = data.timestamp || Date.now();
      this.chatState.addMessage(systemMessage);
      
      // Emit specific leave event
      this.chatState.emit('userLeftChat', { handle: data.handle, timestamp: systemMessage.timestamp });
    }
  }

  /**
   * Handle typing indicator messages
   * @param {Object} data - Typing data
   */
  handleTypingMessage(data) {
    const user = this.chatState.getUserByHandle(data.handle);
    if (user) {
      user.isTyping = data.isTyping;
      this.chatState.emit('userTypingChanged', { user, isTyping: data.isTyping });
    }
  }

  /**
   * Handle user status update messages
   * @param {Object} data - Status update data
   */
  handleStatusMessage(data) {
    const user = this.chatState.getUserByHandle(data.handle);
    if (user) {
      if (data.status === 'online') {
        user.setOnline();
      } else if (data.status === 'offline') {
        user.setOffline();
      }
      
      // Update other user properties if provided
      if (data.avatar !== undefined) {
        user.avatar = data.avatar;
      }
      if (data.avatarType !== undefined) {
        user.avatarType = data.avatarType;
      }
      
      this.chatState.emit('userStatusUpdated', user);
    }
  }

  /**
   * Handle message acknowledgment
   * @param {Object} data - Acknowledgment data
   */
  handleAckMessage(data) {
    if (data.messageId) {
      const message = this.chatState.messages.find(m => m.id === data.messageId);
      if (message) {
        message.updateStatus('delivered');
        this.chatState.emit('messageDelivered', message);
      }
    }
  }

  /**
   * Handle error messages from server
   * @param {Object} data - Error data
   */
  handleErrorMessage(data) {
    console.error('Server error:', data);
    
    // Add error message to chat
    const errorMessage = new Message('系统', `错误: ${data.message || '未知错误'}`, 'error');
    this.chatState.addMessage(errorMessage);
    
    // Emit error event
    this.chatState.emit('serverError', data);
  }

  /**
   * Handle user list updates
   * @param {Object} data - User list data
   */
  handleUserList(data) {
    if (data.users && Array.isArray(data.users)) {
      // Clear existing users (except current user)
      const currentUserId = this.chatState.currentUser ? this.chatState.currentUser.id : null;
      this.chatState.users.clear();
      
      // Re-add current user if exists
      if (currentUserId && this.chatState.currentUser) {
        this.chatState.users.set(currentUserId, this.chatState.currentUser);
      }
      
      // Add users from server
      data.users.forEach(userData => {
        const handle = userData.handle || userData;
        if (!this.chatState.currentUser || handle !== this.chatState.currentUser.handle) {
          const user = new User(handle, userData.avatar, userData.avatarType);
          this.chatState.addUser(user);
        }
      });
    }
  }

  /**
   * Handle heartbeat response
   * @param {Object} data - Heartbeat data
   */
  handleHeartbeatResponse(data) {
    // Connection quality monitoring could be implemented here
    console.log('Heartbeat response received');
  }

  /**
   * Handle system messages
   * @param {Object} data - System message data
   */
  handleSystemMessage(data) {
    const systemMessage = new Message('系统', data.text, 'system');
    this.chatState.addMessage(systemMessage);
  }

  /**
   * Handle legacy message format (for backward compatibility)
   * @param {Object} data - Legacy message data
   */
  handleLegacyMessage(data) {
    if (data.handle && data.text) {
      this.handleChatMessage(data);
    }
  }

  /**
   * Send message through WebSocket
   * @param {Object} messageData - Message data to send
   * @returns {Promise} Promise that resolves when message is sent
   */
  sendMessage(messageData) {
    return new Promise((resolve, reject) => {
      if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
        // Queue message for later sending
        this.messageQueue.push({ messageData, resolve, reject });
        reject(new Error('WebSocket not connected - message queued'));
        return;
      }

      try {
        this.websocket.send(JSON.stringify(messageData));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send chat message with enhanced processing
   * @param {string} handle - User handle
   * @param {string} text - Message text
   * @returns {Promise} Promise that resolves when message is sent
   */
  sendChatMessage(handle, text) {
    const messageId = this.generateMessageId();
    const messageData = {
      type: 'chat',
      id: messageId,
      handle: handle,
      text: text,
      timestamp: Date.now()
    };

    // Add to local state immediately for better UX
    const message = new Message(handle, text, 'chat');
    message.id = messageId;
    message.markAsSelf();
    this.chatState.addMessage(message);

    return this.sendMessage(messageData)
      .then(() => {
        // Update message status on successful send
        message.updateStatus('sent');
        this.chatState.emit('messageSent', message);
      })
      .catch(error => {
        // Update message status on failure
        message.updateStatus('failed');
        this.chatState.emit('messageFailed', { message, error });
        throw error;
      });
  }

  /**
   * Send typing indicator
   * @param {string} handle - User handle
   * @param {boolean} isTyping - Whether user is typing
   * @returns {Promise} Promise that resolves when sent
   */
  sendTypingIndicator(handle, isTyping) {
    const messageData = {
      type: 'typing',
      handle: handle,
      isTyping: isTyping,
      timestamp: Date.now()
    };

    return this.sendMessage(messageData);
  }

  /**
   * Send user status update
   * @param {string} handle - User handle
   * @param {string} status - User status ('online', 'offline', 'away')
   * @param {Object} additionalData - Additional user data
   * @returns {Promise} Promise that resolves when sent
   */
  sendUserStatus(handle, status, additionalData = {}) {
    const messageData = {
      type: 'status',
      handle: handle,
      status: status,
      timestamp: Date.now(),
      ...additionalData
    };

    return this.sendMessage(messageData);
  }

  /**
   * Send user join notification
   * @param {string} handle - User handle
   * @param {Object} userInfo - User information
   * @returns {Promise} Promise that resolves when sent
   */
  sendUserJoin(handle, userInfo = {}) {
    const messageData = {
      type: 'user_join',
      handle: handle,
      avatar: userInfo.avatar,
      avatarType: userInfo.avatarType,
      timestamp: Date.now()
    };

    return this.sendMessage(messageData);
  }

  /**
   * Request user list from server
   * @returns {Promise} Promise that resolves when sent
   */
  requestUserList() {
    const messageData = {
      type: 'request_user_list',
      timestamp: Date.now()
    };

    return this.sendMessage(messageData);
  }

  /**
   * Generate unique message ID
   * @returns {string} Message ID
   */
  generateMessageId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Process queued messages when connection is restored
   */
  processMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`Processing ${this.messageQueue.length} queued messages`);
    
    const queue = [...this.messageQueue];
    this.messageQueue = [];

    queue.forEach(({ messageData, resolve, reject }) => {
      this.sendMessage(messageData)
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'ping',
          timestamp: Date.now()
        }).catch(error => {
          console.warn('Failed to send heartbeat:', error);
        });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle reconnection logic
   */
  handleReconnection() {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    this.chatState.setConnectionStatus('reconnecting');

    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    setTimeout(() => {
      console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.connect();
    }, delay);
  }

  /**
   * Setup event listeners for chat state changes
   */
  setupEventListeners() {
    // Listen for current user changes
    this.chatState.on('currentUserChanged', (user) => {
      if (user && this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'user_join',
          handle: user.handle,
          avatar: user.avatar,
          avatarType: user.avatarType
        }).catch(error => {
          console.error('Failed to announce user join:', error);
        });
      }
    });
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    this.stopHeartbeat();
    if (this.websocket) {
      this.websocket.close(1000, 'User disconnected');
      this.websocket = null;
    }
    this.chatState.setConnectionStatus('disconnected');
  }

  /**
   * Get connection status
   * @returns {string} Connection status
   */
  getConnectionStatus() {
    if (!this.websocket) return 'disconnected';
    
    switch (this.websocket.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'disconnecting';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }
}

// ===== MESSAGE ROUTING AND PROCESSING SYSTEM =====

/**
 * Enhanced message router for handling different message types
 */
class MessageRouter {
  constructor(chatState) {
    this.chatState = chatState;
    this.messageHandlers = new Map();
    this.messageFilters = [];
    this.messageMiddleware = [];
    
    this.setupDefaultHandlers();
  }

  /**
   * Setup default message handlers
   */
  setupDefaultHandlers() {
    // Chat message handler
    this.registerHandler('chat', (data) => {
      const message = new Message(data.handle, data.text, 'chat');
      message.timestamp = data.timestamp || Date.now();
      
      if (data.id) {
        message.id = data.id;
      }
      
      // Check if message is from current user
      if (this.chatState.currentUser && message.handle === this.chatState.currentUser.handle) {
        message.markAsSelf();
      }
      
      this.chatState.addMessage(message);
      return message;
    });

    // System message handler
    this.registerHandler('system', (data) => {
      const message = new Message('系统', data.text, 'system');
      message.timestamp = data.timestamp || Date.now();
      this.chatState.addMessage(message);
      return message;
    });

    // User join handler
    this.registerHandler('user_join', (data) => {
      let user = this.chatState.getUserByHandle(data.handle);
      
      if (!user) {
        user = new User(data.handle, data.avatar, data.avatarType);
        this.chatState.addUser(user);
      } else {
        user.setOnline();
      }
      
      // Don't add system message for current user joining
      if (!this.chatState.currentUser || data.handle !== this.chatState.currentUser.handle) {
        const systemMessage = new Message('系统', `${data.handle} 加入了聊天`, 'user_join');
        systemMessage.timestamp = data.timestamp || Date.now();
        this.chatState.addMessage(systemMessage);
      }
      
      return user;
    });

    // User leave handler
    this.registerHandler('user_leave', (data) => {
      const user = this.chatState.getUserByHandle(data.handle);
      if (user) {
        user.setOffline();
        
        // Add system message
        const systemMessage = new Message('系统', `${data.handle} 离开了聊天`, 'user_leave');
        systemMessage.timestamp = data.timestamp || Date.now();
        this.chatState.addMessage(systemMessage);
        
        // Remove user after delay
        setTimeout(() => {
          const stillOfflineUser = this.chatState.getUserByHandle(data.handle);
          if (stillOfflineUser && !stillOfflineUser.isOnline) {
            this.chatState.removeUser(stillOfflineUser.id);
          }
        }, 30000);
      }
      
      return user;
    });

    // User list handler
    this.registerHandler('user_list', (data) => {
      if (data.users && Array.isArray(data.users)) {
        // Clear existing users except current user
        const currentUserId = this.chatState.currentUser ? this.chatState.currentUser.id : null;
        const currentUser = this.chatState.currentUser;
        
        this.chatState.users.clear();
        
        // Re-add current user
        if (currentUser) {
          this.chatState.users.set(currentUserId, currentUser);
        }
        
        // Add users from server
        data.users.forEach(userData => {
          const handle = userData.handle || userData;
          if (!currentUser || handle !== currentUser.handle) {
            const user = new User(handle, userData.avatar, userData.avatarType);
            this.chatState.addUser(user);
          }
        });
      }
      
      return data.users;
    });

    // Typing indicator handler
    this.registerHandler('typing', (data) => {
      const user = this.chatState.getUserByHandle(data.handle);
      if (user) {
        user.isTyping = data.isTyping;
        this.chatState.emit('userTypingChanged', { user, isTyping: data.isTyping });
      }
      return user;
    });

    // Status update handler
    this.registerHandler('status', (data) => {
      const user = this.chatState.getUserByHandle(data.handle);
      if (user) {
        if (data.status === 'online') {
          user.setOnline();
        } else if (data.status === 'offline') {
          user.setOffline();
        }
        
        // Update user properties
        if (data.avatar !== undefined) user.avatar = data.avatar;
        if (data.avatarType !== undefined) user.avatarType = data.avatarType;
        
        this.chatState.emit('userStatusUpdated', user);
      }
      return user;
    });

    // Error handler
    this.registerHandler('error', (data) => {
      const errorMessage = new Message('系统', `错误: ${data.message || '未知错误'}`, 'error');
      this.chatState.addMessage(errorMessage);
      this.chatState.emit('serverError', data);
      return errorMessage;
    });

    // Heartbeat response handler
    this.registerHandler('pong', (data) => {
      this.chatState.emit('heartbeatResponse', data);
      return data;
    });
  }

  /**
   * Register a message handler
   * @param {string} messageType - Message type
   * @param {Function} handler - Handler function
   */
  registerHandler(messageType, handler) {
    this.messageHandlers.set(messageType, handler);
  }

  /**
   * Unregister a message handler
   * @param {string} messageType - Message type
   */
  unregisterHandler(messageType) {
    this.messageHandlers.delete(messageType);
  }

  /**
   * Add message filter
   * @param {Function} filter - Filter function that returns true to allow message
   */
  addFilter(filter) {
    this.messageFilters.push(filter);
  }

  /**
   * Add message middleware
   * @param {Function} middleware - Middleware function
   */
  addMiddleware(middleware) {
    this.messageMiddleware.push(middleware);
  }

  /**
   * Process incoming message
   * @param {Object} data - Message data
   * @returns {Object|null} Processed result or null if filtered
   */
  processMessage(data) {
    try {
      // Apply filters
      for (const filter of this.messageFilters) {
        if (!filter(data)) {
          console.log('Message filtered out:', data);
          return null;
        }
      }

      // Apply middleware (can modify data)
      for (const middleware of this.messageMiddleware) {
        data = middleware(data) || data;
      }

      // Get message type
      const messageType = data.type || 'chat';
      
      // Get handler
      const handler = this.messageHandlers.get(messageType);
      
      if (handler) {
        const result = handler(data);
        this.chatState.emit('messageProcessed', { type: messageType, data, result });
        return result;
      } else {
        console.warn(`No handler found for message type: ${messageType}`);
        
        // Try to handle as generic chat message
        if (data.handle && data.text) {
          const chatHandler = this.messageHandlers.get('chat');
          if (chatHandler) {
            return chatHandler(data);
          }
        }
        
        return null;
      }
    } catch (error) {
      console.error('Error processing message:', error, data);
      this.chatState.emit('messageProcessingError', { error, data });
      return null;
    }
  }

  /**
   * Get all registered handlers
   * @returns {Array} Array of handler names
   */
  getRegisteredHandlers() {
    return Array.from(this.messageHandlers.keys());
  }
}

// ===== APPLICATION INITIALIZATION =====

// Initialize core components
const chatState = new ChatState();
const messageRouter = new MessageRouter(chatState);
const avatarGenerator = new AvatarGenerator();
const connectionStatusManager = new ConnectionStatusManager();
const webSocketManager = new WebSocketManager(chatState);

// Initialize WebSocket connection
webSocketManager.connect();

// Legacy support - maintain global box variable for backward compatibility
var box = webSocketManager.websocket;

// Handle form submissions (both legacy and modern)
$("#input-form").on("submit", function(event) {
  event.preventDefault();
  var handle = $("#input-handle")[0].value;
  var text = $("#input-text")[0].value;
  
  if (handle && text) {
    webSocketManager.sendChatMessage(handle, text)
      .catch(error => {
        console.error('Failed to send message:', error);
      });
    $("#input-text")[0].value = "";
  }
});

// ===== MESSAGE SENDING STATUS AND RETRY SYSTEM =====

/**
 * Message sending status manager
 */
class MessageSendingManager {
  constructor() {
    this.pendingMessages = new Map();
    this.offlineQueue = [];
    this.maxRetryAttempts = 3;
    this.retryDelay = 2000;
  }

  /**
   * Send message with retry mechanism
   * @param {Object} messageData - Message data
   * @returns {Promise} Promise that resolves when message is sent
   */
  async sendMessage(messageData) {
    const messageId = this.generateMessageId();
    messageData.id = messageId;
    messageData.status = 'sending';
    messageData.retryCount = 0;
    
    // Add to pending messages
    this.pendingMessages.set(messageId, messageData);
    
    // Create message element immediately
    const messageElement = this.createMessageElement(messageData);
    
    // Check connection status
    if (connectionStatusManager.status !== 'connected') {
      this.queueOfflineMessage(messageData, messageElement);
      return;
    }
    
    // Attempt to send message
    return this.attemptSendMessage(messageData, messageElement);
  }

  /**
   * Attempt to send a message
   * @param {Object} messageData - Message data
   * @param {HTMLElement} messageElement - Message DOM element
   */
  async attemptSendMessage(messageData, messageElement) {
    try {
      // Show sending status
      this.updateMessageStatus(messageElement, 'sending');
      updateMessageInputStatus('sending');
      
      // Send via WebSocket
      await this.sendViaWebSocket(messageData);
      
      // Success
      this.updateMessageStatus(messageElement, 'sent');
      updateMessageInputStatus('sent');
      this.pendingMessages.delete(messageData.id);
      
      // Clear status after delay
      setTimeout(() => {
        updateMessageInputStatus('idle');
      }, 1000);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Retry logic
      if (messageData.retryCount < this.maxRetryAttempts) {
        messageData.retryCount++;
        this.updateMessageStatus(messageElement, 'retrying', `重试中 (${messageData.retryCount}/${this.maxRetryAttempts})`);
        
        setTimeout(() => {
          this.attemptSendMessage(messageData, messageElement);
        }, this.retryDelay * messageData.retryCount);
        
      } else {
        // Failed after all retries
        this.updateMessageStatus(messageElement, 'failed');
        updateMessageInputStatus('error');
        this.addRetryButton(messageElement, messageData);
        
        setTimeout(() => {
          updateMessageInputStatus('idle');
        }, 3000);
      }
    }
  }

  /**
   * Send message via WebSocket
   * @param {Object} messageData - Message data
   * @returns {Promise} Promise that resolves when sent
   */
  sendViaWebSocket(messageData) {
    return new Promise((resolve, reject) => {
      if (!box || box.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      
      try {
        box.send(JSON.stringify({
          handle: messageData.handle,
          text: messageData.text,
          id: messageData.id,
          timestamp: messageData.timestamp
        }));
        
        // Simulate network delay for better UX
        setTimeout(resolve, 300);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Queue message for offline sending
   * @param {Object} messageData - Message data
   * @param {HTMLElement} messageElement - Message DOM element
   */
  queueOfflineMessage(messageData, messageElement) {
    this.offlineQueue.push({ messageData, messageElement });
    this.updateMessageStatus(messageElement, 'queued', '等待连接...');
    updateMessageInputStatus('queued');
    
    // Show offline notification
    this.showOfflineNotification();
  }

  /**
   * Process offline message queue when connection is restored
   */
  processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    
    console.log(`Processing ${this.offlineQueue.length} offline messages`);
    
    const queuedMessages = [...this.offlineQueue];
    this.offlineQueue = [];
    
    queuedMessages.forEach(({ messageData, messageElement }) => {
      this.attemptSendMessage(messageData, messageElement);
    });
  }

  /**
   * Create message element in DOM
   * @param {Object} messageData - Message data
   * @returns {HTMLElement} Message element
   */
  createMessageElement(messageData) {
    // Use existing message renderer if available
    if (typeof messageRenderer !== 'undefined' && messageRenderer.addMessage) {
      const messageElement = messageRenderer.addMessage(messageData, true);
      if (messageElement) {
        messageElement.setAttribute('data-message-id', messageData.id);
        messageElement.classList.add('sending');
        
        // Add status indicator
        this.addStatusIndicatorToMessage(messageElement, 'sending');
        return messageElement;
      }
    }
    
    // Fallback to manual creation
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return null;
    
    const messageElement = document.createElement('div');
    messageElement.className = 'message outgoing sending';
    messageElement.setAttribute('data-message-id', messageData.id);
    messageElement.innerHTML = `
      <div class="message-content">
        <div class="message-bubble">
          ${this.escapeHtml(messageData.text)}
        </div>
        <div class="message-meta">
          <span class="message-time">${this.formatTime(messageData.timestamp)}</span>
          <span class="message-status sending">发送中...</span>
        </div>
      </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Animate entrance
    if (animationManager) {
      animationManager.animateMessageEntrance(messageElement);
    }
    
    return messageElement;
  }

  /**
   * Add status indicator to existing message element
   * @param {HTMLElement} messageElement - Message element
   * @param {string} status - Status to set
   */
  addStatusIndicatorToMessage(messageElement, status) {
    if (!messageElement) return;
    
    let metaElement = messageElement.querySelector('.message-meta');
    if (!metaElement) {
      // Create meta element if it doesn't exist
      metaElement = document.createElement('div');
      metaElement.className = 'message-meta';
      
      const contentElement = messageElement.querySelector('.message-content');
      if (contentElement) {
        contentElement.appendChild(metaElement);
      }
    }
    
    // Add time if not present
    let timeElement = metaElement.querySelector('.message-time');
    if (!timeElement) {
      timeElement = document.createElement('span');
      timeElement.className = 'message-time';
      timeElement.textContent = this.formatTime(Date.now());
      metaElement.appendChild(timeElement);
    }
    
    // Add or update status element
    let statusElement = metaElement.querySelector('.message-status');
    if (!statusElement) {
      statusElement = document.createElement('span');
      statusElement.className = 'message-status';
      metaElement.appendChild(statusElement);
    }
    
    this.updateMessageStatus(messageElement, status);
  }

  /**
   * Update message status in DOM
   * @param {HTMLElement} messageElement - Message element
   * @param {string} status - Status ('sending', 'sent', 'failed', 'retrying', 'queued')
   * @param {string} customText - Custom status text
   */
  updateMessageStatus(messageElement, status, customText = null) {
    if (!messageElement) return;
    
    const statusElement = messageElement.querySelector('.message-status');
    if (!statusElement) return;
    
    const statusTexts = {
      'sending': '发送中...',
      'sent': '已发送',
      'failed': '发送失败',
      'retrying': '重试中...',
      'queued': '等待发送'
    };
    
    statusElement.className = `message-status ${status}`;
    statusElement.textContent = customText || statusTexts[status] || '';
    
    // Update message element class
    messageElement.className = `message outgoing ${status}`;
    
    // Add animation for status change
    if (animationManager) {
      animationManager.animateStatusChange(statusElement);
    }
  }

  /**
   * Add retry button to failed message
   * @param {HTMLElement} messageElement - Message element
   * @param {Object} messageData - Message data
   */
  addRetryButton(messageElement, messageData) {
    const metaElement = messageElement.querySelector('.message-meta');
    if (!metaElement) return;
    
    // Remove existing retry button
    const existingButton = metaElement.querySelector('.retry-button');
    if (existingButton) {
      existingButton.remove();
    }
    
    const retryButton = document.createElement('button');
    retryButton.className = 'retry-button';
    retryButton.textContent = '重试';
    retryButton.setAttribute('aria-label', '重新发送消息');
    retryButton.onclick = () => {
      messageData.retryCount = 0;
      this.attemptSendMessage(messageData, messageElement);
      retryButton.remove();
    };
    
    metaElement.appendChild(retryButton);
  }

  /**
   * Show offline notification
   */
  showOfflineNotification() {
    const notification = document.createElement('div');
    notification.className = 'offline-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">📡</span>
        <span class="notification-text">网络断开，消息将在连接恢复后发送</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Generate unique message ID
   * @returns {string} Message ID
   */
  generateMessageId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Format timestamp for display
   * @param {number} timestamp - Timestamp
   * @returns {string} Formatted time
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clear all pending messages
   */
  clearPendingMessages() {
    this.pendingMessages.clear();
    this.offlineQueue = [];
  }
}

// ===== MESSAGE PERFORMANCE OPTIMIZATION SYSTEM =====

/**
 * Message performance manager for handling large message lists
 */
class MessagePerformanceManager {
  constructor() {
    this.maxMessages = 500; // Maximum messages to keep in DOM
    this.cleanupThreshold = 600; // Trigger cleanup when exceeding this
    this.virtualScrollEnabled = true;
    this.messageCache = new Map(); // Cache for removed messages
    this.visibleRange = { start: 0, end: 50 }; // Initially visible messages
    this.messageHeight = 80; // Estimated message height in pixels
    this.containerHeight = 0;
    this.scrollPosition = 0;
    this.isScrolling = false;
    this.scrollTimeout = null;
    this.observer = null;
    
    this.initializePerformanceOptimizations();
  }

  /**
   * Initialize performance optimizations
   */
  initializePerformanceOptimizations() {
    this.setupVirtualScrolling();
    this.setupIntersectionObserver();
    this.setupScrollOptimization();
    this.startPerformanceMonitoring();
  }

  /**
   * Setup virtual scrolling for message container
   */
  setupVirtualScrolling() {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;

    // Create virtual scroll wrapper
    const virtualWrapper = document.createElement('div');
    virtualWrapper.className = 'virtual-scroll-wrapper';
    virtualWrapper.style.cssText = `
      position: relative;
      overflow-y: auto;
      height: 100%;
    `;

    // Create virtual content container
    const virtualContent = document.createElement('div');
    virtualContent.className = 'virtual-scroll-content';
    virtualContent.id = 'virtual-messages-content';

    // Create spacer elements for virtual scrolling
    const topSpacer = document.createElement('div');
    topSpacer.className = 'virtual-scroll-spacer-top';
    topSpacer.style.height = '0px';

    const bottomSpacer = document.createElement('div');
    bottomSpacer.className = 'virtual-scroll-spacer-bottom';
    bottomSpacer.style.height = '0px';

    // Setup structure
    virtualContent.appendChild(topSpacer);
    virtualContent.appendChild(bottomSpacer);
    virtualWrapper.appendChild(virtualContent);

    // Replace messages container content
    messagesContainer.innerHTML = '';
    messagesContainer.appendChild(virtualWrapper);

    // Setup scroll event handler
    virtualWrapper.addEventListener('scroll', this.handleVirtualScroll.bind(this), { passive: true });

    // Store references
    this.virtualWrapper = virtualWrapper;
    this.virtualContent = virtualContent;
    this.topSpacer = topSpacer;
    this.bottomSpacer = bottomSpacer;
    this.messagesContainer = messagesContainer;

    console.log('Virtual scrolling initialized');
  }

  /**
   * Setup intersection observer for message visibility
   */
  setupIntersectionObserver() {
    if (!window.IntersectionObserver) return;

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const messageElement = entry.target;
        if (entry.isIntersecting) {
          messageElement.classList.add('visible');
          this.loadMessageContent(messageElement);
        } else {
          messageElement.classList.remove('visible');
          this.unloadMessageContent(messageElement);
        }
      });
    }, {
      root: this.virtualWrapper,
      rootMargin: '100px 0px',
      threshold: 0.1
    });
  }

  /**
   * Setup scroll optimization with throttling
   */
  setupScrollOptimization() {
    // Throttled scroll handler
    this.throttledScrollHandler = this.throttle(this.handleScroll.bind(this), 16); // ~60fps
    
    // Debounced scroll end handler
    this.debouncedScrollEndHandler = this.debounce(this.handleScrollEnd.bind(this), 150);
  }

  /**
   * Handle virtual scroll events
   * @param {Event} event - Scroll event
   */
  handleVirtualScroll(event) {
    if (!this.virtualScrollEnabled) return;

    const scrollTop = event.target.scrollTop;
    const containerHeight = event.target.clientHeight;
    
    this.scrollPosition = scrollTop;
    this.containerHeight = containerHeight;

    // Calculate visible range
    const startIndex = Math.floor(scrollTop / this.messageHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / this.messageHeight) + 5,
      this.getTotalMessageCount()
    );

    this.updateVisibleRange(startIndex, endIndex);
    this.throttledScrollHandler();
  }

  /**
   * Update visible message range
   * @param {number} startIndex - Start index
   * @param {number} endIndex - End index
   */
  updateVisibleRange(startIndex, endIndex) {
    if (startIndex === this.visibleRange.start && endIndex === this.visibleRange.end) {
      return; // No change needed
    }

    this.visibleRange = { start: startIndex, end: endIndex };
    this.renderVisibleMessages();
  }

  /**
   * Render only visible messages
   */
  renderVisibleMessages() {
    if (!this.virtualContent) return;

    const messages = this.getAllMessages();
    const visibleMessages = messages.slice(this.visibleRange.start, this.visibleRange.end);

    // Update spacer heights
    const topSpacerHeight = this.visibleRange.start * this.messageHeight;
    const bottomSpacerHeight = (messages.length - this.visibleRange.end) * this.messageHeight;

    this.topSpacer.style.height = `${topSpacerHeight}px`;
    this.bottomSpacer.style.height = `${bottomSpacerHeight}px`;

    // Clear current visible messages
    const existingMessages = this.virtualContent.querySelectorAll('.message:not(.virtual-scroll-spacer-top):not(.virtual-scroll-spacer-bottom)');
    existingMessages.forEach(msg => msg.remove());

    // Render visible messages
    visibleMessages.forEach((messageData, index) => {
      const messageElement = this.createOptimizedMessageElement(messageData, this.visibleRange.start + index);
      this.virtualContent.insertBefore(messageElement, this.bottomSpacer);
      
      if (this.observer) {
        this.observer.observe(messageElement);
      }
    });
  }

  /**
   * Add message with performance optimization
   * @param {Object} messageData - Message data
   * @returns {HTMLElement} Message element
   */
  addMessage(messageData) {
    // Add to message cache
    const messageId = messageData.id || this.generateMessageId();
    messageData.id = messageId;
    this.messageCache.set(messageId, messageData);

    // Check if cleanup is needed
    if (this.getTotalMessageCount() > this.cleanupThreshold) {
      this.performMessageCleanup();
    }

    // If virtual scrolling is enabled, update virtual list
    if (this.virtualScrollEnabled) {
      this.updateVirtualList();
      return null; // Virtual scrolling handles rendering
    }

    // Fallback to direct DOM manipulation
    return this.createOptimizedMessageElement(messageData);
  }

  /**
   * Create optimized message element
   * @param {Object} messageData - Message data
   * @param {number} index - Message index
   * @returns {HTMLElement} Message element
   */
  createOptimizedMessageElement(messageData, index = 0) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${messageData.type || 'incoming'}`;
    messageElement.setAttribute('data-message-id', messageData.id);
    messageElement.setAttribute('data-index', index);
    
    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Create message structure
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Avatar (if needed)
    if (messageData.handle && messageData.type !== 'system') {
      const avatar = this.createMessageAvatar(messageData.handle);
      messageContent.appendChild(avatar);
    }
    
    // Message bubble
    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble';
    
    // Use textContent for security and performance
    if (messageData.text) {
      messageBubble.textContent = messageData.text;
    }
    
    messageContent.appendChild(messageBubble);
    
    // Message meta information
    if (messageData.timestamp || messageData.handle) {
      const messageMeta = document.createElement('div');
      messageMeta.className = 'message-meta';
      
      if (messageData.handle && messageData.type !== 'system') {
        const senderName = document.createElement('span');
        senderName.className = 'message-sender';
        senderName.textContent = messageData.handle;
        messageMeta.appendChild(senderName);
      }
      
      if (messageData.timestamp) {
        const messageTime = document.createElement('span');
        messageTime.className = 'message-time';
        messageTime.textContent = this.formatTime(messageData.timestamp);
        messageMeta.appendChild(messageTime);
      }
      
      messageContent.appendChild(messageMeta);
    }
    
    messageElement.appendChild(messageContent);
    
    // Lazy load content if not immediately visible
    if (index > this.visibleRange.end + 10) {
      messageElement.classList.add('lazy-load');
      this.unloadMessageContent(messageElement);
    }
    
    return messageElement;
  }

  /**
   * Create message avatar element
   * @param {string} handle - User handle
   * @returns {HTMLElement} Avatar element
   */
  createMessageAvatar(handle) {
    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'message-avatar';
    
    // Use avatar generator if available
    if (typeof avatarGenerator !== 'undefined') {
      const avatarConfig = avatarGenerator.generateAvatar(handle);
      avatarContainer.innerHTML = avatarGenerator.createAvatarHTML(avatarConfig, 'sm');
    } else {
      // Fallback avatar
      const avatar = document.createElement('div');
      avatar.className = 'avatar avatar-sm';
      avatar.style.backgroundColor = this.getColorForName(handle);
      avatar.textContent = handle.charAt(0).toUpperCase();
      avatarContainer.appendChild(avatar);
    }
    
    return avatarContainer;
  }

  /**
   * Load message content (for lazy loading)
   * @param {HTMLElement} messageElement - Message element
   */
  loadMessageContent(messageElement) {
    if (!messageElement.classList.contains('lazy-load')) return;
    
    const messageId = messageElement.getAttribute('data-message-id');
    const messageData = this.messageCache.get(messageId);
    
    if (messageData) {
      // Restore full content
      const messageBubble = messageElement.querySelector('.message-bubble');
      if (messageBubble && messageData.text) {
        messageBubble.textContent = messageData.text;
      }
      
      messageElement.classList.remove('lazy-load');
    }
  }

  /**
   * Unload message content (for memory optimization)
   * @param {HTMLElement} messageElement - Message element
   */
  unloadMessageContent(messageElement) {
    if (messageElement.classList.contains('lazy-load')) return;
    
    // Only unload if message is far from viewport
    const index = parseInt(messageElement.getAttribute('data-index') || '0');
    const distanceFromVisible = Math.min(
      Math.abs(index - this.visibleRange.start),
      Math.abs(index - this.visibleRange.end)
    );
    
    if (distanceFromVisible > 20) {
      const messageBubble = messageElement.querySelector('.message-bubble');
      if (messageBubble) {
        messageBubble.textContent = '...'; // Placeholder
      }
      messageElement.classList.add('lazy-load');
    }
  }

  /**
   * Perform message cleanup to maintain performance
   */
  performMessageCleanup() {
    const messages = Array.from(this.messageCache.keys());
    const messagesToRemove = messages.slice(0, messages.length - this.maxMessages);
    
    messagesToRemove.forEach(messageId => {
      this.messageCache.delete(messageId);
      
      // Remove from DOM if present
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
      if (messageElement) {
        if (this.observer) {
          this.observer.unobserve(messageElement);
        }
        messageElement.remove();
      }
    });
    
    console.log(`Cleaned up ${messagesToRemove.length} old messages`);
  }

  /**
   * Update virtual list after changes
   */
  updateVirtualList() {
    if (!this.virtualScrollEnabled) return;
    
    // Recalculate total height
    const totalMessages = this.getTotalMessageCount();
    const totalHeight = totalMessages * this.messageHeight;
    
    // Update container height
    if (this.virtualContent) {
      this.virtualContent.style.height = `${totalHeight}px`;
    }
    
    // Re-render visible messages
    this.renderVisibleMessages();
    
    // Auto-scroll to bottom if user was at bottom
    if (this.shouldAutoScroll()) {
      this.scrollToBottom();
    }
  }

  /**
   * Check if should auto-scroll to bottom
   * @returns {boolean} True if should auto-scroll
   */
  shouldAutoScroll() {
    if (!this.virtualWrapper) return true;
    
    const scrollTop = this.virtualWrapper.scrollTop;
    const scrollHeight = this.virtualWrapper.scrollHeight;
    const clientHeight = this.virtualWrapper.clientHeight;
    
    // Consider user at bottom if within 100px of bottom
    return (scrollHeight - scrollTop - clientHeight) < 100;
  }

  /**
   * Scroll to bottom of messages
   */
  scrollToBottom() {
    if (this.virtualWrapper) {
      this.virtualWrapper.scrollTop = this.virtualWrapper.scrollHeight;
    }
  }

  /**
   * Get total message count
   * @returns {number} Total message count
   */
  getTotalMessageCount() {
    return this.messageCache.size;
  }

  /**
   * Get all messages as array
   * @returns {Array} Array of message data
   */
  getAllMessages() {
    return Array.from(this.messageCache.values());
  }

  /**
   * Handle scroll events (throttled)
   */
  handleScroll() {
    this.isScrolling = true;
    
    // Clear existing timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    // Set scroll end timeout
    this.scrollTimeout = setTimeout(() => {
      this.debouncedScrollEndHandler();
    }, 150);
  }

  /**
   * Handle scroll end (debounced)
   */
  handleScrollEnd() {
    this.isScrolling = false;
    
    // Perform cleanup if needed
    this.optimizeVisibleMessages();
  }

  /**
   * Optimize visible messages after scroll
   */
  optimizeVisibleMessages() {
    const visibleMessages = this.virtualContent.querySelectorAll('.message.visible');
    const invisibleMessages = this.virtualContent.querySelectorAll('.message:not(.visible)');
    
    // Unload content from invisible messages
    invisibleMessages.forEach(msg => {
      this.unloadMessageContent(msg);
    });
    
    // Ensure visible messages have content loaded
    visibleMessages.forEach(msg => {
      this.loadMessageContent(msg);
    });
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    // Monitor memory usage
    setInterval(() => {
      if (performance.memory) {
        const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
        
        if (memoryUsage > 100) { // If using more than 100MB
          console.warn(`High memory usage detected: ${memoryUsage.toFixed(2)}MB`);
          this.performMessageCleanup();
        }
      }
    }, 30000); // Check every 30 seconds
    
    // Monitor DOM node count
    setInterval(() => {
      const messageElements = document.querySelectorAll('.message');
      if (messageElements.length > this.maxMessages * 1.2) {
        console.warn(`Too many message elements in DOM: ${messageElements.length}`);
        this.performMessageCleanup();
      }
    }, 60000); // Check every minute
  }

  /**
   * Throttle function execution
   * @param {Function} func - Function to throttle
   * @param {number} limit - Time limit in milliseconds
   * @returns {Function} Throttled function
   */
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Debounce function execution
   * @param {Function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, delay) {
    let timeoutId;
    return function() {
      const args = arguments;
      const context = this;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(context, args), delay);
    };
  }

  /**
   * Generate message ID
   * @returns {string} Message ID
   */
  generateMessageId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Format timestamp
   * @param {number} timestamp - Timestamp
   * @returns {string} Formatted time
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Get color for name
   * @param {string} name - Name
   * @returns {string} Color
   */
  getColorForName(name) {
    const colors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Disable virtual scrolling (fallback mode)
   */
  disableVirtualScrolling() {
    this.virtualScrollEnabled = false;
    console.log('Virtual scrolling disabled - using fallback mode');
  }

  /**
   * Enable virtual scrolling
   */
  enableVirtualScrolling() {
    this.virtualScrollEnabled = true;
    this.setupVirtualScrolling();
    console.log('Virtual scrolling enabled');
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance stats
   */
  getPerformanceStats() {
    return {
      totalMessages: this.getTotalMessageCount(),
      visibleRange: this.visibleRange,
      virtualScrollEnabled: this.virtualScrollEnabled,
      memoryUsage: performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 'N/A',
      domNodes: document.querySelectorAll('.message').length
    };
  }
}

// ===== ACCESSIBILITY SUPPORT SYSTEM =====

/**
 * Accessibility manager for keyboard navigation and screen reader support
 */
class AccessibilityManager {
  constructor() {
    this.focusableElements = [];
    this.currentFocusIndex = -1;
    this.keyboardShortcuts = new Map();
    this.screenReaderAnnouncements = [];
    this.highContrastMode = false;
    this.reducedMotion = false;
    this.fontSize = 'normal';
    
    this.initializeAccessibility();
  }

  /**
   * Initialize accessibility features
   */
  initializeAccessibility() {
    this.setupKeyboardNavigation();
    this.setupScreenReaderSupport();
    this.setupKeyboardShortcuts();
    this.detectAccessibilityPreferences();
    this.enhanceFormAccessibility();
    this.setupFocusManagement();
    this.addAccessibilityControls();
  }

  /**
   * Setup keyboard navigation
   */
  setupKeyboardNavigation() {
    // Define focusable elements
    this.updateFocusableElements();
    
    // Global keyboard event handler
    document.addEventListener('keydown', (event) => {
      this.handleGlobalKeydown(event);
    });

    // Update focusable elements when DOM changes
    const observer = new MutationObserver(() => {
      this.updateFocusableElements();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['tabindex', 'disabled', 'aria-hidden']
    });
  }

  /**
   * Update list of focusable elements
   */
  updateFocusableElements() {
    const focusableSelectors = [
      'button:not([disabled]):not([aria-hidden="true"])',
      'input:not([disabled]):not([aria-hidden="true"])',
      'textarea:not([disabled]):not([aria-hidden="true"])',
      'select:not([disabled]):not([aria-hidden="true"])',
      '[tabindex]:not([tabindex="-1"]):not([aria-hidden="true"])',
      'a[href]:not([aria-hidden="true"])',
      '.contact-item:not([aria-hidden="true"])',
      '.message:not([aria-hidden="true"])'
    ].join(', ');

    this.focusableElements = Array.from(document.querySelectorAll(focusableSelectors))
      .filter(el => this.isElementVisible(el));
  }

  /**
   * Check if element is visible
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} True if visible
   */
  isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return rect.width > 0 && 
           rect.height > 0 && 
           style.visibility !== 'hidden' && 
           style.display !== 'none' &&
           element.offsetParent !== null;
  }

  /**
   * Handle global keyboard events
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleGlobalKeydown(event) {
    // Check for keyboard shortcuts first
    const shortcutKey = this.getShortcutKey(event);
    if (this.keyboardShortcuts.has(shortcutKey)) {
      event.preventDefault();
      this.keyboardShortcuts.get(shortcutKey)();
      return;
    }

    // Handle navigation keys
    switch (event.key) {
      case 'Tab':
        this.handleTabNavigation(event);
        break;
      case 'Escape':
        this.handleEscapeKey(event);
        break;
      case 'Enter':
        this.handleEnterKey(event);
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        this.handleArrowNavigation(event);
        break;
      case 'Home':
      case 'End':
        this.handleHomeEndNavigation(event);
        break;
    }
  }

  /**
   * Handle tab navigation
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleTabNavigation(event) {
    // Let browser handle normal tab navigation
    // But announce focus changes for screen readers
    setTimeout(() => {
      const activeElement = document.activeElement;
      if (activeElement) {
        this.announceFocusChange(activeElement);
      }
    }, 0);
  }

  /**
   * Handle escape key
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleEscapeKey(event) {
    // Close modals
    const openModal = document.querySelector('.modal-overlay:not([aria-hidden="true"])');
    if (openModal) {
      event.preventDefault();
      this.closeModal(openModal);
      return;
    }

    // Clear focus from message input if focused
    const messageInput = document.getElementById('message-input');
    if (document.activeElement === messageInput) {
      event.preventDefault();
      messageInput.blur();
      this.announceToScreenReader('已退出消息输入框');
    }
  }

  /**
   * Handle enter key
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleEnterKey(event) {
    const activeElement = document.activeElement;
    
    // Handle contact item selection
    if (activeElement && activeElement.classList.contains('contact-item')) {
      event.preventDefault();
      activeElement.click();
      this.announceToScreenReader(`已选择联系人: ${this.getContactName(activeElement)}`);
    }
    
    // Handle message input (Shift+Enter for new line)
    if (activeElement && activeElement.id === 'message-input') {
      if (!event.shiftKey) {
        event.preventDefault();
        const form = document.getElementById('message-form');
        if (form) {
          form.dispatchEvent(new Event('submit'));
        }
      }
    }
  }

  /**
   * Handle arrow key navigation
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleArrowNavigation(event) {
    const activeElement = document.activeElement;
    
    // Navigate through contact list
    if (activeElement && activeElement.classList.contains('contact-item')) {
      event.preventDefault();
      const contactList = activeElement.parentElement;
      const contacts = Array.from(contactList.querySelectorAll('.contact-item'));
      const currentIndex = contacts.indexOf(activeElement);
      
      let nextIndex;
      if (event.key === 'ArrowUp') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : contacts.length - 1;
      } else {
        nextIndex = currentIndex < contacts.length - 1 ? currentIndex + 1 : 0;
      }
      
      contacts[nextIndex].focus();
      this.announceToScreenReader(`联系人: ${this.getContactName(contacts[nextIndex])}`);
    }
    
    // Navigate through messages
    if (activeElement && activeElement.classList.contains('message')) {
      event.preventDefault();
      const messagesContainer = document.getElementById('messages-container');
      const messages = Array.from(messagesContainer.querySelectorAll('.message[tabindex="0"]'));
      const currentIndex = messages.indexOf(activeElement);
      
      let nextIndex;
      if (event.key === 'ArrowUp') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : messages.length - 1;
      } else {
        nextIndex = currentIndex < messages.length - 1 ? currentIndex + 1 : 0;
      }
      
      if (messages[nextIndex]) {
        messages[nextIndex].focus();
        messages[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.announceMessageContent(messages[nextIndex]);
      }
    }
  }

  /**
   * Handle Home/End navigation
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleHomeEndNavigation(event) {
    const activeElement = document.activeElement;
    
    // Navigate to first/last contact
    if (activeElement && activeElement.classList.contains('contact-item')) {
      event.preventDefault();
      const contactList = activeElement.parentElement;
      const contacts = Array.from(contactList.querySelectorAll('.contact-item'));
      
      const targetContact = event.key === 'Home' ? contacts[0] : contacts[contacts.length - 1];
      if (targetContact) {
        targetContact.focus();
        this.announceToScreenReader(`${event.key === 'Home' ? '第一个' : '最后一个'}联系人: ${this.getContactName(targetContact)}`);
      }
    }
    
    // Navigate to first/last message
    if (activeElement && activeElement.classList.contains('message')) {
      event.preventDefault();
      const messagesContainer = document.getElementById('messages-container');
      const messages = Array.from(messagesContainer.querySelectorAll('.message[tabindex="0"]'));
      
      const targetMessage = event.key === 'Home' ? messages[0] : messages[messages.length - 1];
      if (targetMessage) {
        targetMessage.focus();
        targetMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.announceToScreenReader(`${event.key === 'Home' ? '第一条' : '最后一条'}消息`);
        this.announceMessageContent(targetMessage);
      }
    }
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    // Define keyboard shortcuts
    this.keyboardShortcuts.set('ctrl+/', () => {
      this.showKeyboardShortcutsHelp();
    });
    
    this.keyboardShortcuts.set('ctrl+m', () => {
      const messageInput = document.getElementById('message-input');
      if (messageInput) {
        messageInput.focus();
        this.announceToScreenReader('消息输入框已聚焦');
      }
    });
    
    this.keyboardShortcuts.set('ctrl+l', () => {
      const firstContact = document.querySelector('.contact-item');
      if (firstContact) {
        firstContact.focus();
        this.announceToScreenReader('联系人列表已聚焦');
      }
    });
    
    this.keyboardShortcuts.set('ctrl+,', () => {
      const settingsButton = document.querySelector('.settings-button');
      if (settingsButton) {
        settingsButton.click();
        this.announceToScreenReader('用户设置已打开');
      }
    });
    
    this.keyboardShortcuts.set('ctrl+shift+h', () => {
      this.toggleHighContrastMode();
    });
    
    this.keyboardShortcuts.set('ctrl+shift+f', () => {
      this.cycleFontSize();
    });
  }

  /**
   * Get shortcut key string from event
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {string} Shortcut key string
   */
  getShortcutKey(event) {
    const parts = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');
    parts.push(event.key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Setup screen reader support
   */
  setupScreenReaderSupport() {
    // Create live region for announcements
    this.createLiveRegion();
    
    // Enhance existing elements with ARIA labels
    this.enhanceAriaLabels();
    
    // Setup message announcements
    this.setupMessageAnnouncements();
  }

  /**
   * Create live region for screen reader announcements
   */
  createLiveRegion() {
    const liveRegion = document.createElement('div');
    liveRegion.id = 'screen-reader-announcements';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(liveRegion);
    
    this.liveRegion = liveRegion;
  }

  /**
   * Announce message to screen reader
   * @param {string} message - Message to announce
   * @param {string} priority - Priority ('polite' or 'assertive')
   */
  announceToScreenReader(message, priority = 'polite') {
    if (!this.liveRegion) return;
    
    this.liveRegion.setAttribute('aria-live', priority);
    this.liveRegion.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      this.liveRegion.textContent = '';
    }, 1000);
  }

  /**
   * Enhance ARIA labels for existing elements
   */
  enhanceAriaLabels() {
    // Enhance message input
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
      messageInput.setAttribute('aria-label', '消息输入框，按 Enter 发送，Shift+Enter 换行');
      messageInput.setAttribute('aria-describedby', 'message-help');
    }
    
    // Enhance send button
    const sendButton = document.querySelector('.send-button');
    if (sendButton) {
      sendButton.setAttribute('aria-label', '发送消息，快捷键 Ctrl+Enter');
    }
    
    // Enhance contact items
    const contactItems = document.querySelectorAll('.contact-item');
    contactItems.forEach((item, index) => {
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
      const contactName = this.getContactName(item);
      item.setAttribute('aria-label', `联系人 ${contactName}，按 Enter 选择`);
    });
    
    // Enhance messages
    this.enhanceMessageAccessibility();
  }

  /**
   * Enhance message accessibility
   */
  enhanceMessageAccessibility() {
    const messages = document.querySelectorAll('.message');
    messages.forEach((message, index) => {
      message.setAttribute('tabindex', '0');
      message.setAttribute('role', 'article');
      
      const messageContent = this.getMessageContent(message);
      const sender = this.getMessageSender(message);
      const time = this.getMessageTime(message);
      
      let ariaLabel = '';
      if (sender) {
        ariaLabel += `${sender}说: `;
      }
      ariaLabel += messageContent;
      if (time) {
        ariaLabel += `, 时间 ${time}`;
      }
      
      message.setAttribute('aria-label', ariaLabel);
    });
  }

  /**
   * Setup message announcements
   */
  setupMessageAnnouncements() {
    // Listen for new messages
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('message')) {
              this.announceNewMessage(node);
            }
          });
        });
      });
      
      observer.observe(messagesContainer, { childList: true, subtree: true });
    }
  }

  /**
   * Announce new message to screen reader
   * @param {HTMLElement} messageElement - Message element
   */
  announceNewMessage(messageElement) {
    const sender = this.getMessageSender(messageElement);
    const content = this.getMessageContent(messageElement);
    
    if (sender && content) {
      const announcement = `新消息来自 ${sender}: ${content}`;
      this.announceToScreenReader(announcement, 'polite');
    }
  }

  /**
   * Announce focus change
   * @param {HTMLElement} element - Focused element
   */
  announceFocusChange(element) {
    if (element.classList.contains('contact-item')) {
      const contactName = this.getContactName(element);
      this.announceToScreenReader(`已聚焦联系人: ${contactName}`);
    } else if (element.classList.contains('message')) {
      this.announceMessageContent(element);
    } else if (element.id === 'message-input') {
      this.announceToScreenReader('消息输入框已聚焦，输入消息后按 Enter 发送');
    }
  }

  /**
   * Announce message content
   * @param {HTMLElement} messageElement - Message element
   */
  announceMessageContent(messageElement) {
    const sender = this.getMessageSender(messageElement);
    const content = this.getMessageContent(messageElement);
    const time = this.getMessageTime(messageElement);
    
    let announcement = '';
    if (sender) {
      announcement += `${sender}的消息: `;
    }
    announcement += content;
    if (time) {
      announcement += `, 发送时间 ${time}`;
    }
    
    this.announceToScreenReader(announcement);
  }

  /**
   * Detect accessibility preferences
   */
  detectAccessibilityPreferences() {
    // Detect reduced motion preference
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.reducedMotion = true;
      document.body.classList.add('reduced-motion');
      console.log('Reduced motion preference detected');
    }
    
    // Detect high contrast preference
    if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
      this.highContrastMode = true;
      document.body.classList.add('high-contrast');
      console.log('High contrast preference detected');
    }
    
    // Listen for preference changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        this.reducedMotion = e.matches;
        document.body.classList.toggle('reduced-motion', e.matches);
      });
      
      window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
        this.highContrastMode = e.matches;
        document.body.classList.toggle('high-contrast', e.matches);
      });
    }
  }

  /**
   * Enhance form accessibility
   */
  enhanceFormAccessibility() {
    // Add form validation announcements
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', (event) => {
        const isValid = form.checkValidity();
        if (!isValid) {
          event.preventDefault();
          this.announceFormErrors(form);
        }
      });
    });
    
    // Enhance input fields
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('invalid', () => {
        const errorMessage = input.validationMessage || '输入无效';
        this.announceToScreenReader(`${input.getAttribute('aria-label') || '输入字段'}: ${errorMessage}`, 'assertive');
      });
    });
  }

  /**
   * Setup focus management
   */
  setupFocusManagement() {
    // Focus trap for modals
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        const openModal = document.querySelector('.modal-overlay:not([aria-hidden="true"])');
        if (openModal) {
          this.trapFocusInModal(event, openModal);
        }
      }
    });
    
    // Restore focus when modals close
    this.setupModalFocusRestore();
  }

  /**
   * Trap focus within modal
   * @param {KeyboardEvent} event - Keyboard event
   * @param {HTMLElement} modal - Modal element
   */
  trapFocusInModal(event, modal) {
    const focusableElements = modal.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * Setup modal focus restore
   */
  setupModalFocusRestore() {
    let lastFocusedElement = null;
    
    // Store focus when modal opens
    document.addEventListener('click', (event) => {
      if (event.target.classList.contains('settings-button')) {
        lastFocusedElement = event.target;
      }
    });
    
    // Restore focus when modal closes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          const modal = mutation.target;
          if (modal.classList.contains('modal-overlay') && modal.getAttribute('aria-hidden') === 'true') {
            if (lastFocusedElement) {
              lastFocusedElement.focus();
              lastFocusedElement = null;
            }
          }
        }
      });
    });
    
    observer.observe(document.body, { attributes: true, subtree: true });
  }

  /**
   * Add accessibility controls
   */
  addAccessibilityControls() {
    const accessibilityPanel = document.createElement('div');
    accessibilityPanel.id = 'accessibility-controls';
    accessibilityPanel.className = 'accessibility-controls';
    accessibilityPanel.setAttribute('role', 'region');
    accessibilityPanel.setAttribute('aria-label', '辅助功能控制');
    accessibilityPanel.innerHTML = `
      <button class="accessibility-toggle" aria-label="打开辅助功能控制" title="辅助功能">
        <span aria-hidden="true">♿</span>
      </button>
      <div class="accessibility-panel" aria-hidden="true">
        <h3>辅助功能设置</h3>
        <div class="accessibility-options">
          <button class="accessibility-option" data-action="toggle-high-contrast">
            <span class="option-icon" aria-hidden="true">🎨</span>
            <span class="option-text">高对比度模式</span>
            <span class="option-status" aria-live="polite">${this.highContrastMode ? '开启' : '关闭'}</span>
          </button>
          <button class="accessibility-option" data-action="cycle-font-size">
            <span class="option-icon" aria-hidden="true">🔤</span>
            <span class="option-text">字体大小</span>
            <span class="option-status" aria-live="polite">${this.fontSize}</span>
          </button>
          <button class="accessibility-option" data-action="show-shortcuts">
            <span class="option-icon" aria-hidden="true">⌨️</span>
            <span class="option-text">键盘快捷键</span>
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(accessibilityPanel);
    
    // Setup event handlers
    this.setupAccessibilityControlHandlers(accessibilityPanel);
  }

  /**
   * Setup accessibility control handlers
   * @param {HTMLElement} panel - Accessibility panel
   */
  setupAccessibilityControlHandlers(panel) {
    const toggle = panel.querySelector('.accessibility-toggle');
    const accessibilityPanel = panel.querySelector('.accessibility-panel');
    const options = panel.querySelectorAll('.accessibility-option');
    
    // Toggle panel
    toggle.addEventListener('click', () => {
      const isOpen = accessibilityPanel.getAttribute('aria-hidden') === 'false';
      accessibilityPanel.setAttribute('aria-hidden', !isOpen);
      toggle.setAttribute('aria-expanded', !isOpen);
      
      if (!isOpen) {
        this.announceToScreenReader('辅助功能控制面板已打开');
      }
    });
    
    // Handle option clicks
    options.forEach(option => {
      option.addEventListener('click', () => {
        const action = option.getAttribute('data-action');
        this.handleAccessibilityAction(action, option);
      });
    });
    
    // Close panel when clicking outside
    document.addEventListener('click', (event) => {
      if (!panel.contains(event.target)) {
        accessibilityPanel.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /**
   * Handle accessibility actions
   * @param {string} action - Action to perform
   * @param {HTMLElement} button - Button element
   */
  handleAccessibilityAction(action, button) {
    const statusElement = button.querySelector('.option-status');
    
    switch (action) {
      case 'toggle-high-contrast':
        this.toggleHighContrastMode();
        statusElement.textContent = this.highContrastMode ? '开启' : '关闭';
        break;
      case 'cycle-font-size':
        this.cycleFontSize();
        statusElement.textContent = this.fontSize;
        break;
      case 'show-shortcuts':
        this.showKeyboardShortcutsHelp();
        break;
    }
  }

  /**
   * Toggle high contrast mode
   */
  toggleHighContrastMode() {
    this.highContrastMode = !this.highContrastMode;
    document.body.classList.toggle('high-contrast', this.highContrastMode);
    
    const message = this.highContrastMode ? '高对比度模式已开启' : '高对比度模式已关闭';
    this.announceToScreenReader(message);
    
    // Save preference
    localStorage.setItem('accessibility-high-contrast', this.highContrastMode);
  }

  /**
   * Cycle through font sizes
   */
  cycleFontSize() {
    const sizes = ['normal', 'large', 'extra-large'];
    const currentIndex = sizes.indexOf(this.fontSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    
    this.fontSize = sizes[nextIndex];
    
    // Remove existing font size classes
    sizes.forEach(size => {
      document.body.classList.remove(`font-size-${size}`);
    });
    
    // Add new font size class
    document.body.classList.add(`font-size-${this.fontSize}`);
    
    const sizeNames = {
      'normal': '正常',
      'large': '大',
      'extra-large': '特大'
    };
    
    this.announceToScreenReader(`字体大小已设置为${sizeNames[this.fontSize]}`);
    
    // Save preference
    localStorage.setItem('accessibility-font-size', this.fontSize);
  }

  /**
   * Show keyboard shortcuts help
   */
  showKeyboardShortcutsHelp() {
    const helpModal = document.createElement('div');
    helpModal.className = 'modal-overlay keyboard-shortcuts-modal';
    helpModal.setAttribute('role', 'dialog');
    helpModal.setAttribute('aria-labelledby', 'shortcuts-modal-title');
    helpModal.setAttribute('aria-modal', 'true');
    helpModal.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <h2 id="shortcuts-modal-title" class="modal-title">键盘快捷键</h2>
          <button class="modal-close" aria-label="关闭快捷键帮助">
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="shortcuts-list">
            <div class="shortcut-group">
              <h3>导航</h3>
              <div class="shortcut-item">
                <kbd>Tab</kbd> / <kbd>Shift+Tab</kbd>
                <span>在界面元素间导航</span>
              </div>
              <div class="shortcut-item">
                <kbd>↑</kbd> / <kbd>↓</kbd>
                <span>在联系人或消息间导航</span>
              </div>
              <div class="shortcut-item">
                <kbd>Home</kbd> / <kbd>End</kbd>
                <span>跳转到第一个/最后一个项目</span>
              </div>
            </div>
            <div class="shortcut-group">
              <h3>操作</h3>
              <div class="shortcut-item">
                <kbd>Enter</kbd>
                <span>激活选中的项目或发送消息</span>
              </div>
              <div class="shortcut-item">
                <kbd>Shift+Enter</kbd>
                <span>在消息输入框中换行</span>
              </div>
              <div class="shortcut-item">
                <kbd>Escape</kbd>
                <span>关闭模态框或退出输入框</span>
              </div>
            </div>
            <div class="shortcut-group">
              <h3>快捷键</h3>
              <div class="shortcut-item">
                <kbd>Ctrl+M</kbd>
                <span>聚焦到消息输入框</span>
              </div>
              <div class="shortcut-item">
                <kbd>Ctrl+L</kbd>
                <span>聚焦到联系人列表</span>
              </div>
              <div class="shortcut-item">
                <kbd>Ctrl+,</kbd>
                <span>打开用户设置</span>
              </div>
              <div class="shortcut-item">
                <kbd>Ctrl+/</kbd>
                <span>显示此帮助</span>
              </div>
            </div>
            <div class="shortcut-group">
              <h3>辅助功能</h3>
              <div class="shortcut-item">
                <kbd>Ctrl+Shift+H</kbd>
                <span>切换高对比度模式</span>
              </div>
              <div class="shortcut-item">
                <kbd>Ctrl+Shift+F</kbd>
                <span>循环切换字体大小</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" id="close-shortcuts-help">关闭</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(helpModal);
    
    // Setup event handlers
    const closeButton = helpModal.querySelector('.modal-close');
    const closeFooterButton = helpModal.querySelector('#close-shortcuts-help');
    
    const closeModal = () => {
      document.body.removeChild(helpModal);
      this.announceToScreenReader('快捷键帮助已关闭');
    };
    
    closeButton.addEventListener('click', closeModal);
    closeFooterButton.addEventListener('click', closeModal);
    
    // Focus first focusable element
    setTimeout(() => {
      closeButton.focus();
    }, 100);
    
    this.announceToScreenReader('键盘快捷键帮助已打开');
  }

  /**
   * Utility functions for getting element information
   */
  getContactName(contactElement) {
    const nameElement = contactElement.querySelector('.contact-name');
    return nameElement ? nameElement.textContent.trim() : '未知联系人';
  }

  getMessageContent(messageElement) {
    const bubbleElement = messageElement.querySelector('.message-bubble');
    return bubbleElement ? bubbleElement.textContent.trim() : '';
  }

  getMessageSender(messageElement) {
    const senderElement = messageElement.querySelector('.message-sender');
    return senderElement ? senderElement.textContent.trim() : null;
  }

  getMessageTime(messageElement) {
    const timeElement = messageElement.querySelector('.message-time');
    return timeElement ? timeElement.textContent.trim() : null;
  }

  closeModal(modal) {
    modal.setAttribute('aria-hidden', 'true');
    this.announceToScreenReader('模态框已关闭');
  }

  announceFormErrors(form) {
    const invalidInputs = form.querySelectorAll(':invalid');
    if (invalidInputs.length > 0) {
      const firstInvalid = invalidInputs[0];
      const errorMessage = firstInvalid.validationMessage || '输入无效';
      this.announceToScreenReader(`表单验证失败: ${errorMessage}`, 'assertive');
      firstInvalid.focus();
    }
  }

  /**
   * Load saved accessibility preferences
   */
  loadAccessibilityPreferences() {
    // Load high contrast preference
    const savedHighContrast = localStorage.getItem('accessibility-high-contrast');
    if (savedHighContrast === 'true') {
      this.highContrastMode = true;
      document.body.classList.add('high-contrast');
    }
    
    // Load font size preference
    const savedFontSize = localStorage.getItem('accessibility-font-size');
    if (savedFontSize && ['normal', 'large', 'extra-large'].includes(savedFontSize)) {
      this.fontSize = savedFontSize;
      document.body.classList.add(`font-size-${this.fontSize}`);
    }
  }

  /**
   * Initialize accessibility on page load
   */
  init() {
    this.loadAccessibilityPreferences();
    this.announceToScreenReader('聊天应用已加载，按 Ctrl+/ 查看键盘快捷键');
  }
}

// Initialize message performance manager
const messagePerformanceManager = new MessagePerformanceManager();

// Initialize accessibility manager
const accessibilityManager = new AccessibilityManager();

// Initialize message sending manager
const messageSendingManager = new MessageSendingManager();

// Enhanced message form submission handler
$("#message-form").on("submit", function(event) {
  event.preventDefault();
  var handle = $("#input-handle")[0].value;
  var text   = $("#message-input")[0].value;
  
  if (text.trim() === '') return;
  
  // Send message with retry mechanism
  messageSendingManager.sendMessage({
    handle: handle,
    text: text.trim(),
    timestamp: Date.now()
  });
  
  // Clear input
  $("#message-input")[0].value = "";
  
  // Reset textarea height
  if (typeof resetMessageInput === 'function') {
    resetMessageInput();
  }
});

// Process offline queue when connection is restored
document.addEventListener('connectionRestored', () => {
  messageSendingManager.processOfflineQueue();
});

// Initialize accessibility when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  accessibilityManager.init();
  
  // Auto-load user settings as early as possible
  const savedSettings = localStorage.getItem('userSettings');
  if (savedSettings) {
    try {
      const config = JSON.parse(savedSettings);
      if (config && config.username) {
        // Set handle immediately for WebSocket connection
        const handleInput = document.getElementById('input-handle');
        if (handleInput) {
          handleInput.value = config.username;
        }
        
        // Update chat status
        const chatStatus = document.getElementById('chat-status');
        if (chatStatus && chatStatus.textContent === '连接中...') {
          chatStatus.textContent = '在线';
        }
      }
    } catch (error) {
      console.warn('Failed to auto-load user settings:', error);
    }
  }
});

// ===== BACKWARD COMPATIBILITY FUNCTIONS =====

/**
 * Update connection status (backward compatibility)
 * @param {string} status - Connection status
 * @param {string} message - Optional message
 */
function updateConnectionStatus(status, message = null) {
  if (connectionStatusManager) {
    connectionStatusManager.updateStatus(status, message);
  }
}

/**
 * Update message input status (backward compatibility)
 * @param {string} status - Input status
 */
function updateMessageInputStatus(status) {
  if (animationManager) {
    if (status === 'sending') {
      animationManager.showMessageSendingState();
    } else {
      animationManager.hideMessageSendingState(status);
    }
  }
  
  // Also update status indicator
  const statusIndicator = document.querySelector('.input-status-indicator');
  if (statusIndicator) {
    const statusTexts = {
      'idle': '',
      'typing': '正在输入...',
      'sending': '发送中...',
      'sent': '已发送',
      'error': '发送失败',
      'queued': '等待发送',
      'retrying': '重试中...'
    };
    
    statusIndicator.textContent = statusTexts[status] || '';
    statusIndicator.className = `input-status-indicator ${status}`;
    
    // Clear status after delay for success/error states
    if (status === 'sent' || status === 'error') {
      setTimeout(() => {
        statusIndicator.textContent = '';
        statusIndicator.className = 'input-status-indicator';
      }, 2000);
    }
  }
}

/**
 * Update message status (backward compatibility)
 * @param {HTMLElement} messageElement - Message element
 * @param {string} status - Message status
 */
function updateMessageStatus(messageElement, status) {
  if (messageSendingManager) {
    messageSendingManager.updateMessageStatus(messageElement, status);
  }
}

// ===== AVATAR SYSTEM INTEGRATION =====

/**
 * Generate and display avatar for a user
 * @param {string} username - User's name
 * @param {string} containerId - Container element ID
 * @param {string} type - Avatar type
 * @param {string} customValue - Custom avatar value
 */
function generateUserAvatar(username, containerId, type = 'initial', customValue = null) {
  const avatar = avatarGenerator.generateAvatar(username, type, customValue);
  const container = document.getElementById(containerId);
  
  if (container) {
    container.innerHTML = avatarGenerator.createAvatarHTML(avatar);
  }
  
  return avatar;
}

/**
 * Update user avatar in contact list
 * @param {string} userId - User ID
 * @param {string} username - User's name
 * @param {string} type - Avatar type
 * @param {string} customValue - Custom avatar value
 */
function updateContactAvatar(userId, username, type = 'initial', customValue = null) {
  const avatar = avatarGenerator.generateAvatar(username, type, customValue);
  const selector = `[data-contact-id="${userId}"] .avatar`;
  avatarGenerator.updateAvatarInDOM(selector, avatar);
}

/**
 * Initialize avatar system when page loads
 */
$(document).ready(function() {
  // Initialize preset avatars in select dropdown
  avatarGenerator.initializePresetAvatars();
  
  // Generate default avatar for group chat
  const groupAvatar = avatarGenerator.generateAvatar('全体成员', 'initial');
  avatarGenerator.updateAvatarInDOM('[data-contact-id="group"] .avatar', groupAvatar);
  
  // Initialize avatar preview functionality
  initializeAvatarPreview();
});

/**
 * Initialize avatar preview and selection functionality
 */
function initializeAvatarPreview() {
  const nameInput = document.getElementById('user-name-input');
  const avatarSelect = document.getElementById('user-avatar-select');
  const customEmojiInput = document.getElementById('custom-emoji-input');
  const avatarPreview = document.getElementById('avatar-preview');
  
  // Update preview when name changes
  if (nameInput) {
    nameInput.addEventListener('input', updateAvatarPreview);
  }
  
  // Update preview when avatar selection changes
  if (avatarSelect) {
    avatarSelect.addEventListener('change', updateAvatarPreview);
  }
  
  // Update preview when custom emoji changes
  if (customEmojiInput) {
    customEmojiInput.addEventListener('input', updateAvatarPreview);
  }
  
  // Initial preview update
  updateAvatarPreview();
}

/**
 * Update avatar preview based on current form values
 */
function updateAvatarPreview() {
  const nameInput = document.getElementById('user-name-input');
  const avatarSelect = document.getElementById('user-avatar-select');
  const customEmojiInput = document.getElementById('custom-emoji-input');
  const avatarPreview = document.getElementById('avatar-preview');
  
  if (!avatarPreview) return;
  
  const username = nameInput ? nameInput.value.trim() : '';
  const selectedAvatar = avatarSelect ? avatarSelect.value : 'default';
  const customEmoji = customEmojiInput ? customEmojiInput.value.trim() : '';
  
  let avatar;
  
  // Priority: custom emoji > preset selection > initial
  if (customEmoji && avatarGenerator.isEmoji(customEmoji)) {
    avatar = avatarGenerator.generateAvatar(username, 'custom', customEmoji);
  } else if (selectedAvatar && selectedAvatar !== 'default') {
    avatar = avatarGenerator.generateAvatar(username, 'preset', selectedAvatar);
  } else {
    avatar = avatarGenerator.generateAvatar(username, 'initial');
  }
  
  // Update preview
  avatarPreview.innerHTML = avatarGenerator.createAvatarHTML(avatar, 'lg');
}

/**
 * Get current user avatar configuration from form
 * @returns {Object} Avatar configuration
 */
function getCurrentUserAvatarConfig() {
  const nameInput = document.getElementById('user-name-input');
  const avatarSelect = document.getElementById('user-avatar-select');
  const customEmojiInput = document.getElementById('custom-emoji-input');
  
  const username = nameInput ? nameInput.value.trim() : '';
  const selectedAvatar = avatarSelect ? avatarSelect.value : 'default';
  const customEmoji = customEmojiInput ? customEmojiInput.value.trim() : '';
  
  if (customEmoji && avatarGenerator.isEmoji(customEmoji)) {
    return {
      username: username,
      type: 'custom',
      value: customEmoji
    };
  } else if (selectedAvatar && selectedAvatar !== 'default') {
    return {
      username: username,
      type: 'preset',
      value: selectedAvatar
    };
  } else {
    return {
      username: username,
      type: 'initial',
      value: null
    };
  }
}

/**
 * Save user avatar configuration to localStorage
 * @param {Object} config - Avatar configuration
 */
function saveUserAvatarConfig(config) {
  try {
    localStorage.setItem('userAvatarConfig', JSON.stringify(config));
  } catch (error) {
    console.warn('Failed to save avatar configuration:', error);
  }
}

/**
 * Load user avatar configuration from localStorage
 * @returns {Object|null} Avatar configuration or null
 */
function loadUserAvatarConfig() {
  try {
    const saved = localStorage.getItem('userAvatarConfig');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn('Failed to load avatar configuration:', error);
    return null;
  }
}

/**
 * Apply saved avatar configuration to form
 * @param {Object} config - Avatar configuration
 */
function applySavedAvatarConfig(config) {
  if (!config) return;
  
  const nameInput = document.getElementById('user-name-input');
  const avatarSelect = document.getElementById('user-avatar-select');
  const customEmojiInput = document.getElementById('custom-emoji-input');
  
  if (nameInput && config.username) {
    nameInput.value = config.username;
  }
  
  if (config.type === 'custom' && customEmojiInput && config.value) {
    customEmojiInput.value = config.value;
  } else if (config.type === 'preset' && avatarSelect && config.value) {
    avatarSelect.value = config.value;
  }
  
  updateAvatarPreview();
}

// ===== USER STATUS MANAGEMENT SYSTEM =====

/**
 * User status management class
 */
class UserStatusManager {
  constructor() {
    this.users = new Map();
    this.currentUser = null;
    this.statusUpdateInterval = null;
    this.sortOrder = 'alphabetical'; // 'alphabetical', 'status', 'recent'
  }

  /**
   * Add or update a user in the system
   * @param {Object} userData - User data
   */
  addUser(userData) {
    const user = {
      id: userData.id || this.generateUserId(userData.handle),
      handle: userData.handle,
      status: userData.status || 'online',
      lastSeen: Date.now(),
      joinedAt: userData.joinedAt || Date.now(),
      avatar: userData.avatar || null
    };

    this.users.set(user.id, user);
    this.updateContactList();
    this.updateOnlineCount();
    
    // Show join notification if not current user
    if (user.id !== this.getCurrentUserId()) {
      this.showUserJoinNotification(user);
    }
  }

  /**
   * Remove a user from the system
   * @param {string} userId - User ID
   */
  removeUser(userId) {
    const user = this.users.get(userId);
    if (user) {
      this.users.delete(userId);
      this.removeContactFromList(userId);
      this.updateOnlineCount();
      
      // Show leave notification if not current user
      if (userId !== this.getCurrentUserId()) {
        this.showUserLeaveNotification(user);
      }
    }
  }

  /**
   * Update user status
   * @param {string} userId - User ID
   * @param {string} status - New status ('online', 'away', 'busy', 'offline')
   */
  updateUserStatus(userId, status) {
    const user = this.users.get(userId);
    if (user) {
      user.status = status;
      user.lastSeen = Date.now();
      this.updateContactStatus(userId, status);
      this.updateContactList();
    }
  }

  /**
   * Update user's last seen timestamp
   * @param {string} userId - User ID
   */
  updateUserActivity(userId) {
    const user = this.users.get(userId);
    if (user) {
      user.lastSeen = Date.now();
      if (user.status === 'offline') {
        user.status = 'online';
        this.updateContactStatus(userId, 'online');
      }
    }
  }

  /**
   * Get all users sorted by current sort order
   * @returns {Array} Sorted array of users
   */
  getSortedUsers() {
    const usersArray = Array.from(this.users.values());
    
    switch (this.sortOrder) {
      case 'status':
        return this.sortByStatus(usersArray);
      case 'recent':
        return this.sortByRecentActivity(usersArray);
      case 'alphabetical':
      default:
        return this.sortAlphabetically(usersArray);
    }
  }

  /**
   * Sort users alphabetically
   * @param {Array} users - Array of users
   * @returns {Array} Sorted users
   */
  sortAlphabetically(users) {
    return users.sort((a, b) => {
      return a.handle.localeCompare(b.handle, 'zh-CN');
    });
  }

  /**
   * Sort users by status (online first, then by name)
   * @param {Array} users - Array of users
   * @returns {Array} Sorted users
   */
  sortByStatus(users) {
    const statusOrder = { 'online': 0, 'away': 1, 'busy': 2, 'offline': 3 };
    
    return users.sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return a.handle.localeCompare(b.handle, 'zh-CN');
    });
  }

  /**
   * Sort users by recent activity
   * @param {Array} users - Array of users
   * @returns {Array} Sorted users
   */
  sortByRecentActivity(users) {
    return users.sort((a, b) => {
      return b.lastSeen - a.lastSeen;
    });
  }

  /**
   * Update the contact list in the UI
   */
  updateContactList() {
    const contactList = document.querySelector('.contact-list');
    if (!contactList) return;

    const sortedUsers = this.getSortedUsers();
    const groupItem = contactList.querySelector('[data-contact-id="group"]');
    
    // Remove all user contacts (keep group chat)
    const userContacts = contactList.querySelectorAll('.contact-item:not([data-contact-id="group"])');
    userContacts.forEach(contact => contact.remove());
    
    // Add sorted users
    sortedUsers.forEach(user => {
      if (user.id !== 'group') {
        this.addContactToList(user);
      }
    });
  }

  /**
   * Add a contact to the contact list
   * @param {Object} user - User object
   */
  addContactToList(user) {
    const contactList = document.querySelector('.contact-list');
    if (!contactList) return;

    const avatar = avatarGenerator.generateAvatar(user.handle, user.avatar?.type || 'initial', user.avatar?.value);
    const statusClass = this.getStatusClass(user.status);
    const statusText = this.getStatusText(user.status);
    const timeText = this.getRelativeTime(user.lastSeen);

    const contactHTML = `
      <div class="contact-item" role="listitem" tabindex="0" aria-selected="false" data-contact-id="${user.id}">
        <div class="contact-avatar">
          ${avatarGenerator.createAvatarHTML(avatar)}
          <div class="status-indicator ${statusClass}" aria-label="${statusText}"></div>
        </div>
        <div class="contact-info">
          <div class="contact-name">${this.escapeHtml(user.handle)}</div>
          <div class="contact-status">${statusText}</div>
          <div class="contact-last-message">刚刚加入</div>
        </div>
        <div class="contact-meta">
          <div class="contact-time">${timeText}</div>
          <div class="contact-badge" style="display: none;">
            <span class="badge-count">0</span>
          </div>
        </div>
      </div>
    `;

    contactList.insertAdjacentHTML('beforeend', contactHTML);
  }

  /**
   * Remove a contact from the contact list
   * @param {string} userId - User ID
   */
  removeContactFromList(userId) {
    const contact = document.querySelector(`[data-contact-id="${userId}"]`);
    if (contact) {
      contact.remove();
    }
  }

  /**
   * Update contact status indicator
   * @param {string} userId - User ID
   * @param {string} status - New status
   */
  updateContactStatus(userId, status) {
    const contact = document.querySelector(`[data-contact-id="${userId}"]`);
    if (contact) {
      const statusIndicator = contact.querySelector('.status-indicator');
      const statusText = contact.querySelector('.contact-status');
      
      if (statusIndicator) {
        statusIndicator.className = `status-indicator ${this.getStatusClass(status)}`;
        statusIndicator.setAttribute('aria-label', this.getStatusText(status));
      }
      
      if (statusText) {
        statusText.textContent = this.getStatusText(status);
      }
    }
  }

  /**
   * Get CSS class for status
   * @param {string} status - User status
   * @returns {string} CSS class
   */
  getStatusClass(status) {
    const statusClasses = {
      'online': 'online',
      'away': 'away',
      'busy': 'busy',
      'offline': 'offline'
    };
    return statusClasses[status] || 'offline';
  }

  /**
   * Get display text for status
   * @param {string} status - User status
   * @returns {string} Display text
   */
  getStatusText(status) {
    const statusTexts = {
      'online': '在线',
      'away': '离开',
      'busy': '忙碌',
      'offline': '离线'
    };
    return statusTexts[status] || '离线';
  }

  /**
   * Get relative time text
   * @param {number} timestamp - Timestamp
   * @returns {string} Relative time text
   */
  getRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return new Date(timestamp).toLocaleDateString('zh-CN');
  }

  /**
   * Update online count display
   */
  updateOnlineCount() {
    const onlineCountElement = document.getElementById('online-count');
    if (onlineCountElement) {
      const onlineUsers = Array.from(this.users.values()).filter(user => user.status === 'online');
      onlineCountElement.textContent = `${onlineUsers.length} 人在线`;
    }
  }

  /**
   * Show user join notification
   * @param {Object} user - User object
   */
  showUserJoinNotification(user) {
    this.addSystemMessage(`${user.handle} 加入了聊天室`);
  }

  /**
   * Show user leave notification
   * @param {Object} user - User object
   */
  showUserLeaveNotification(user) {
    this.addSystemMessage(`${user.handle} 离开了聊天室`);
  }

  /**
   * Add system message to chat
   * @param {string} message - System message
   */
  addSystemMessage(message) {
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      const messageHTML = `
        <div class="message system" role="article">
          <div class="message-content">
            <div class="message-bubble">
              ${this.escapeHtml(message)}
            </div>
          </div>
        </div>
      `;
      messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  /**
   * Generate user ID from handle
   * @param {string} handle - User handle
   * @returns {string} User ID
   */
  generateUserId(handle) {
    return 'user_' + btoa(encodeURIComponent(handle)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10) + '_' + Date.now();
  }

  /**
   * Get current user ID
   * @returns {string} Current user ID
   */
  getCurrentUserId() {
    return this.currentUser ? this.currentUser.id : null;
  }

  /**
   * Set current user
   * @param {Object} userData - User data
   */
  setCurrentUser(userData) {
    this.currentUser = {
      id: userData.id || this.generateUserId(userData.handle),
      handle: userData.handle,
      status: 'online',
      avatar: userData.avatar || null
    };
    this.addUser(this.currentUser);
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Start periodic status updates
   */
  startStatusUpdates() {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
    }
    
    this.statusUpdateInterval = setInterval(() => {
      this.updateRelativeTimes();
    }, 60000); // Update every minute
  }

  /**
   * Update relative times in contact list
   */
  updateRelativeTimes() {
    const timeElements = document.querySelectorAll('.contact-time');
    timeElements.forEach(element => {
      const contactItem = element.closest('.contact-item');
      if (contactItem) {
        const userId = contactItem.getAttribute('data-contact-id');
        const user = this.users.get(userId);
        if (user) {
          element.textContent = this.getRelativeTime(user.lastSeen);
        }
      }
    });
  }

  /**
   * Stop status updates
   */
  stopStatusUpdates() {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
    }
  }
}

// ===== ANIMATION AND INTERACTION SYSTEM =====

/**
 * Animation and interaction management system
 */
class AnimationManager {
  constructor() {
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.activeAnimations = new Set();
    this.transitionQueue = [];
    this.isTransitioning = false;
    
    this.initializeAnimationSystem();
  }

  /**
   * Initialize animation system and event listeners
   */
  initializeAnimationSystem() {
    // Listen for reduced motion preference changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.isReducedMotion = e.matches;
    });

    // Initialize button interactions
    this.initializeButtonAnimations();
    
    // Initialize page transition system
    this.initializePageTransitions();
    
    // Initialize loading animations
    this.initializeLoadingAnimations();
    
    // Initialize modal animations
    this.initializeModalAnimations();
  }

  /**
   * Initialize button interaction animations
   */
  initializeButtonAnimations() {
    // Send button interactions
    const sendButton = document.querySelector('.send-button');
    if (sendButton) {
      this.addButtonRippleEffect(sendButton);
      this.addButtonHoverEffects(sendButton);
    }

    // Settings button interactions
    const settingsButton = document.querySelector('.settings-button');
    if (settingsButton) {
      this.addButtonHoverEffects(settingsButton);
    }

    // Mobile menu toggle interactions
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    if (mobileToggle) {
      this.addButtonHoverEffects(mobileToggle);
    }

    // Modal buttons
    document.querySelectorAll('.btn').forEach(button => {
      this.addButtonHoverEffects(button);
    });

    // Contact items
    document.querySelectorAll('.contact-item').forEach(item => {
      this.addContactItemAnimations(item);
    });
  }

  /**
   * Add ripple effect to button
   * @param {HTMLElement} button - Button element
   */
  addButtonRippleEffect(button) {
    if (this.isReducedMotion) return;

    button.addEventListener('click', (e) => {
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        pointer-events: none;
        animation: buttonRipple 0.6s ease-out;
      `;

      button.appendChild(ripple);
      
      setTimeout(() => {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      }, 600);
    });
  }

  /**
   * Add hover effects to button
   * @param {HTMLElement} button - Button element
   */
  addButtonHoverEffects(button) {
    if (this.isReducedMotion) return;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = '';
    });

    button.addEventListener('mousedown', () => {
      button.style.transform = 'translateY(0) scale(0.98)';
    });

    button.addEventListener('mouseup', () => {
      button.style.transform = 'translateY(-2px)';
    });
  }

  /**
   * Add animations to contact items
   * @param {HTMLElement} item - Contact item element
   */
  addContactItemAnimations(item) {
    if (this.isReducedMotion) return;

    item.addEventListener('click', () => {
      item.classList.add('selecting');
      setTimeout(() => {
        item.classList.remove('selecting');
      }, 300);
    });
  }

  /**
   * Initialize page transition system
   */
  initializePageTransitions() {
    // Chat area transitions
    const chatArea = document.querySelector('.chat-area');
    if (chatArea) {
      this.setupChatAreaTransitions(chatArea);
    }
  }

  /**
   * Setup chat area transition effects
   * @param {HTMLElement} chatArea - Chat area element
   */
  setupChatAreaTransitions(chatArea) {
    // Add transition class for smooth animations
    chatArea.classList.add('chat-transition');
  }

  /**
   * Trigger page fade transition
   * @param {string} direction - 'in' or 'out'
   * @param {Function} callback - Callback function
   */
  triggerPageTransition(direction = 'in', callback = null) {
    if (this.isReducedMotion) {
      if (callback) callback();
      return;
    }

    const chatArea = document.querySelector('.chat-area');
    if (!chatArea) return;

    if (direction === 'out') {
      chatArea.classList.add('fade-out');
      setTimeout(() => {
        chatArea.classList.remove('fade-out');
        if (callback) callback();
      }, 300);
    } else {
      chatArea.classList.add('fade-in');
      setTimeout(() => {
        chatArea.classList.remove('fade-in');
        if (callback) callback();
      }, 300);
    }
  }

  /**
   * Initialize loading animation system
   */
  initializeLoadingAnimations() {
    // Message input loading states
    this.setupMessageInputLoading();
    
    // Send button loading states
    this.setupSendButtonLoading();
  }

  /**
   * Setup message input loading animations
   */
  setupMessageInputLoading() {
    const inputWrapper = document.querySelector('.message-input-wrapper');
    const statusIndicator = document.querySelector('.input-status-indicator');
    
    if (inputWrapper && statusIndicator) {
      // Add loading class management
      this.messageInputWrapper = inputWrapper;
      this.statusIndicator = statusIndicator;
    }
  }

  /**
   * Setup send button loading animations
   */
  setupSendButtonLoading() {
    const sendButton = document.querySelector('.send-button');
    if (sendButton) {
      this.sendButton = sendButton;
    }
  }

  /**
   * Show message sending loading state
   */
  showMessageSendingState() {
    if (this.isReducedMotion) return;

    // Add loading class to send button
    if (this.sendButton) {
      this.sendButton.classList.add('loading');
      this.sendButton.disabled = true;
    }

    // Add loading class to input wrapper
    if (this.messageInputWrapper) {
      this.messageInputWrapper.classList.add('loading');
    }

    // Update status indicator
    if (this.statusIndicator) {
      this.statusIndicator.textContent = '发送中';
      this.statusIndicator.className = 'input-status-indicator sending';
    }
  }

  /**
   * Hide message sending loading state
   * @param {string} status - 'sent', 'error', or 'idle'
   */
  hideMessageSendingState(status = 'sent') {
    // Remove loading classes
    if (this.sendButton) {
      this.sendButton.classList.remove('loading');
      this.sendButton.disabled = false;
    }

    if (this.messageInputWrapper) {
      this.messageInputWrapper.classList.remove('loading');
    }

    // Update status indicator
    if (this.statusIndicator) {
      const statusTexts = {
        'sent': '已发送',
        'error': '发送失败',
        'idle': ''
      };
      
      this.statusIndicator.textContent = statusTexts[status] || '';
      this.statusIndicator.className = `input-status-indicator ${status}`;
      
      // Clear status after delay
      if (status !== 'idle') {
        setTimeout(() => {
          this.statusIndicator.textContent = '';
          this.statusIndicator.className = 'input-status-indicator';
        }, 2000);
      }
    }
  }

  /**
   * Initialize modal animation system
   */
  initializeModalAnimations() {
    const modal = document.getElementById('user-settings-modal');
    if (modal) {
      this.setupModalAnimations(modal);
    }
  }

  /**
   * Setup modal transition animations
   * @param {HTMLElement} modal - Modal element
   */
  setupModalAnimations(modal) {
    const closeButton = modal.querySelector('.modal-close');
    const cancelButton = modal.querySelector('#cancel-settings');
    
    // Add close button animations
    if (closeButton) {
      this.addButtonHoverEffects(closeButton);
    }
    
    if (cancelButton) {
      this.addButtonHoverEffects(cancelButton);
    }
  }

  /**
   * Show modal with animation
   * @param {HTMLElement} modal - Modal element
   */
  showModal(modal) {
    if (this.isReducedMotion) {
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
      return;
    }

    modal.style.display = 'flex';
    modal.classList.remove('closing');
    modal.setAttribute('aria-hidden', 'false');
    
    // Trigger animation
    requestAnimationFrame(() => {
      modal.classList.add('visible');
    });
  }

  /**
   * Hide modal with animation
   * @param {HTMLElement} modal - Modal element
   * @param {Function} callback - Callback after animation
   */
  hideModal(modal, callback = null) {
    if (this.isReducedMotion) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      if (callback) callback();
      return;
    }

    modal.classList.add('closing');
    
    setTimeout(() => {
      modal.style.display = 'none';
      modal.classList.remove('visible', 'closing');
      modal.setAttribute('aria-hidden', 'true');
      if (callback) callback();
    }, 300);
  }

  /**
   * Animate message bubble entrance
   * @param {HTMLElement} messageElement - Message element
   */
  animateMessageEntrance(messageElement) {
    if (this.isReducedMotion) return;

    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateY(20px) scale(0.95)';
    
    requestAnimationFrame(() => {
      messageElement.style.transition = 'all 0.3s ease-out';
      messageElement.style.opacity = '1';
      messageElement.style.transform = 'translateY(0) scale(1)';
    });
  }

  /**
   * Animate contact item addition
   * @param {HTMLElement} contactElement - Contact element
   */
  animateContactAddition(contactElement) {
    if (this.isReducedMotion) return;

    contactElement.style.opacity = '0';
    contactElement.style.transform = 'translateX(-20px)';
    
    requestAnimationFrame(() => {
      contactElement.style.transition = 'all 0.3s ease-out';
      contactElement.style.opacity = '1';
      contactElement.style.transform = 'translateX(0)';
    });
  }

  /**
   * Animate status indicator change
   * @param {HTMLElement} indicator - Status indicator element
   */
  animateStatusChange(indicator) {
    if (this.isReducedMotion) return;

    indicator.classList.add('changing');
    setTimeout(() => {
      indicator.classList.remove('changing');
    }, 300);
  }

  /**
   * Show connection status notification
   * @param {string} status - Connection status
   * @param {string} message - Status message
   */
  showConnectionStatus(status, message) {
    let statusElement = document.getElementById('connection-status');
    
    if (!statusElement) {
      statusElement = document.createElement('div');
      statusElement.id = 'connection-status';
      statusElement.className = 'connection-status';
      statusElement.setAttribute('role', 'status');
      statusElement.setAttribute('aria-live', 'polite');
      document.body.appendChild(statusElement);
    }

    statusElement.className = `connection-status ${status}`;
    statusElement.innerHTML = `<span class="status-text">${message}</span>`;
    
    if (!this.isReducedMotion) {
      statusElement.classList.add('visible');
    }

    // Auto-hide success messages
    if (status === 'connected') {
      setTimeout(() => {
        this.hideConnectionStatus();
      }, 3000);
    }
  }

  /**
   * Hide connection status notification
   */
  hideConnectionStatus() {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      if (this.isReducedMotion) {
        statusElement.remove();
      } else {
        statusElement.classList.remove('visible');
        setTimeout(() => {
          if (statusElement.parentNode) {
            statusElement.parentNode.removeChild(statusElement);
          }
        }, 300);
      }
    }
  }

  /**
   * Add loading animation to element
   * @param {HTMLElement} element - Element to animate
   * @param {string} type - Animation type ('pulse', 'spinner', 'dots')
   */
  addLoadingAnimation(element, type = 'pulse') {
    if (this.isReducedMotion) return;

    element.classList.add('loading', `loading-${type}`);
    this.activeAnimations.add(element);
  }

  /**
   * Remove loading animation from element
   * @param {HTMLElement} element - Element to stop animating
   */
  removeLoadingAnimation(element) {
    element.classList.remove('loading', 'loading-pulse', 'loading-spinner', 'loading-dots');
    this.activeAnimations.delete(element);
  }

  /**
   * Clean up all active animations
   */
  cleanup() {
    this.activeAnimations.forEach(element => {
      this.removeLoadingAnimation(element);
    });
    this.activeAnimations.clear();
  }
}

// Initialize animation manager
const animationManager = new AnimationManager();

// Initialize connection status on page load
$(document).ready(function() {
  // Set initial connection status
  updateConnectionStatus('connecting');
  
  // Initialize user status manager
  if (typeof userStatusManager === 'undefined') {
    window.userStatusManager = new UserStatusManager();
  }
});

// ===== ENHANCED MESSAGE AND UI FUNCTIONS =====

/**
 * Update connection status with animation
 * @param {string} status - Connection status
 */
function updateConnectionStatus(status) {
  const statusMessages = {
    'connecting': '连接中...',
    'connected': '已连接',
    'disconnected': '连接断开',
    'error': '连接错误'
  };
  
  const message = statusMessages[status] || status;
  animationManager.showConnectionStatus(status, message);
  
  // Update chat status
  const chatStatus = document.getElementById('chat-status');
  if (chatStatus) {
    chatStatus.textContent = message;
  }
}

/**
 * Update message input status with animation
 * @param {string} status - Input status
 */
function updateMessageInputStatus(status) {
  if (status === 'sending') {
    animationManager.showMessageSendingState();
  } else {
    animationManager.hideMessageSendingState(status);
  }
}

/**
 * Update message status with animation
 * @param {HTMLElement} messageElement - Message element
 * @param {string} status - Message status
 */
function updateMessageStatus(messageElement, status) {
  if (!messageElement) return;
  
  const statusElement = messageElement.querySelector('.message-status');
  if (statusElement) {
    statusElement.className = `message-status ${status}`;
    
    const statusTexts = {
      'sending': '发送中...',
      'sent': '已发送',
      'failed': '发送失败'
    };
    
    statusElement.textContent = statusTexts[status] || '';
  }
  
  // Remove sending animation
  if (status !== 'sending') {
    messageElement.classList.remove('sending');
  }
}

/**
 * Handle chat message with animations
 * @param {Object} data - Message data
 */
function handleChatMessage(data) {
  const messagesContainer = document.getElementById('messages-container');
  if (!messagesContainer) return;
  
  // Create message element
  const messageElement = createMessageElement(data);
  
  // Add to container
  messagesContainer.appendChild(messageElement);
  
  // Animate entrance
  animationManager.animateMessageEntrance(messageElement);
  
  // Scroll to bottom with animation
  setTimeout(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, 100);
}

/**
 * Create message element with proper structure
 * @param {Object} data - Message data
 * @returns {HTMLElement} Message element
 */
function createMessageElement(data) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message other';
  messageDiv.setAttribute('role', 'article');
  
  const avatar = avatarGenerator.generateAvatar(data.handle);
  const timeString = new Date(data.timestamp || Date.now()).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  messageDiv.innerHTML = `
    <div class="message-avatar">
      ${avatarGenerator.createAvatarHTML(avatar, 'sm')}
    </div>
    <div class="message-content">
      <div class="message-header">
        <span class="message-sender">${escapeHtml(data.handle)}</span>
        <span class="message-time">${timeString}</span>
      </div>
      <div class="message-bubble">
        ${escapeHtml(data.text)}
      </div>
      <div class="message-meta">
        <span class="message-status sent">已发送</span>
      </div>
    </div>
  `;
  
  return messageDiv;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== MODAL ANIMATION INTEGRATION =====

/**
 * Show user settings modal with animation
 */
function showUserSettingsModal() {
  const modal = document.getElementById('user-settings-modal');
  if (modal) {
    animationManager.showModal(modal);
    
    // Focus first input
    const firstInput = modal.querySelector('input');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }
}

/**
 * Hide user settings modal with animation
 */
function hideUserSettingsModal() {
  const modal = document.getElementById('user-settings-modal');
  if (modal) {
    animationManager.hideModal(modal);
  }
}

// ===== EVENT LISTENERS FOR ANIMATIONS =====

$(document).ready(function() {
  // Settings button click handler
  $('.settings-button').on('click', function() {
    showUserSettingsModal();
  });
  
  // Modal close handlers
  $('.modal-close, #cancel-settings').on('click', function() {
    hideUserSettingsModal();
  });
  
  // Reset settings handler
  $('#reset-settings').on('click', function() {
    if (userSettingsModal) {
      userSettingsModal.resetSettings();
    }
  });
  
  // Modal overlay click handler
  $('#user-settings-modal').on('click', function(e) {
    if (e.target === this) {
      hideUserSettingsModal();
    }
  });
  
  // Enhanced form submission with animations
  $('#message-form').off('submit').on('submit', function(e) {
    e.preventDefault();
    
    const handle = $('#input-handle')[0].value;
    const text = $('#message-input')[0].value;
    
    if (text.trim() === '') return;
    
    // Show sending animation
    updateMessageInputStatus('sending');
    
    // Create and show outgoing message immediately
    const outgoingMessageData = {
      handle: handle,
      text: text,
      timestamp: Date.now(),
      status: 'sending'
    };
    
    const messageElement = createMessageElement(outgoingMessageData);
    messageElement.classList.add('self', 'sending');
    
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      messagesContainer.appendChild(messageElement);
      animationManager.animateMessageEntrance(messageElement);
      
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    }
    
    // Send via WebSocket
    try {
      box.send(JSON.stringify({ handle: handle, text: text }));
      
      // Update to sent status
      setTimeout(() => {
        updateMessageStatus(messageElement, 'sent');
        updateMessageInputStatus('sent');
      }, 500);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      updateMessageStatus(messageElement, 'failed');
      updateMessageInputStatus('error');
    }
    
    // Clear input
    $('#message-input')[0].value = '';
    resetMessageInput();
  });
  
  // Contact item click animations
  $(document).on('click', '.contact-item', function() {
    // Remove active class from all items
    $('.contact-item').removeClass('active');
    
    // Add active class to clicked item
    $(this).addClass('active');
    
    // Trigger selection animation
    if (!animationManager.isReducedMotion) {
      this.classList.add('selecting');
      setTimeout(() => {
        this.classList.remove('selecting');
      }, 300);
    }
  });
});

// Initialize user status manager
const userStatusManager = new UserStatusManager();
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
    }
  }
}

// Initialize user status manager
const userStatusManager = new UserStatusManager();

// ===== MESSAGE INPUT ENHANCEMENT SYSTEM =====

/**
 * Message input enhancement class
 */
class MessageInputEnhancer {
  constructor() {
    this.textarea = null;
    this.sendButton = null;
    this.characterCount = null;
    this.statusIndicator = null;
    this.maxLength = 1000;
    this.minHeight = 40;
    this.maxHeight = 120;
    this.isComposing = false;
    
    this.init();
  }

  /**
   * Initialize the message input enhancer
   */
  init() {
    this.textarea = document.getElementById('message-input');
    this.sendButton = document.querySelector('.send-button');
    
    if (!this.textarea) return;
    
    this.setupAutoResize();
    this.setupKeyboardShortcuts();
    this.setupCharacterCount();
    this.setupInputValidation();
    this.setupStatusIndicator();
    this.setupCompositionHandling();
  }

  /**
   * Setup auto-resize functionality for textarea
   */
  setupAutoResize() {
    if (!this.textarea) return;
    
    // Set initial height
    this.textarea.style.height = this.minHeight + 'px';
    this.textarea.style.minHeight = this.minHeight + 'px';
    this.textarea.style.maxHeight = this.maxHeight + 'px';
    
    // Auto-resize on input
    this.textarea.addEventListener('input', () => {
      this.adjustHeight();
      this.updateCharacterCount();
      this.validateInput();
    });
    
    // Auto-resize on paste
    this.textarea.addEventListener('paste', () => {
      setTimeout(() => {
        this.adjustHeight();
        this.updateCharacterCount();
        this.validateInput();
      }, 0);
    });
  }

  /**
   * Adjust textarea height based on content
   */
  adjustHeight() {
    if (!this.textarea) return;
    
    // Reset height to calculate scroll height
    this.textarea.style.height = 'auto';
    
    // Calculate new height
    const scrollHeight = this.textarea.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, this.minHeight), this.maxHeight);
    
    // Apply new height
    this.textarea.style.height = newHeight + 'px';
    
    // Show/hide scrollbar if content exceeds max height
    if (scrollHeight > this.maxHeight) {
      this.textarea.style.overflowY = 'auto';
    } else {
      this.textarea.style.overflowY = 'hidden';
    }
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    if (!this.textarea) return;
    
    this.textarea.addEventListener('keydown', (event) => {
      // Handle composition events (for Chinese input)
      if (this.isComposing) return;
      
      // Enter to send (without Shift)
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        this.sendMessage();
        return;
      }
      
      // Shift+Enter for new line (default behavior)
      if (event.key === 'Enter' && event.shiftKey) {
        // Allow default behavior (new line)
        return;
      }
      
      // Escape to clear input
      if (event.key === 'Escape') {
        event.preventDefault();
        this.clearInput();
        return;
      }
      
      // Ctrl/Cmd + A to select all
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        // Allow default behavior
        return;
      }
    });
  }

  /**
   * Setup composition handling for IME input
   */
  setupCompositionHandling() {
    if (!this.textarea) return;
    
    this.textarea.addEventListener('compositionstart', () => {
      this.isComposing = true;
    });
    
    this.textarea.addEventListener('compositionend', () => {
      this.isComposing = false;
    });
  }

  /**
   * Setup character count display
   */
  setupCharacterCount() {
    // Create character count element if it doesn't exist
    const inputWrapper = document.querySelector('.message-input-wrapper');
    if (inputWrapper && !this.characterCount) {
      this.characterCount = document.createElement('div');
      this.characterCount.className = 'character-count';
      this.characterCount.setAttribute('aria-live', 'polite');
      inputWrapper.appendChild(this.characterCount);
    }
    
    this.updateCharacterCount();
  }

  /**
   * Update character count display
   */
  updateCharacterCount() {
    if (!this.textarea || !this.characterCount) return;
    
    const currentLength = this.textarea.value.length;
    const remaining = this.maxLength - currentLength;
    
    this.characterCount.textContent = `${currentLength}/${this.maxLength}`;
    
    // Update styling based on remaining characters
    if (remaining < 50) {
      this.characterCount.className = 'character-count warning';
    } else if (remaining < 0) {
      this.characterCount.className = 'character-count error';
    } else {
      this.characterCount.className = 'character-count';
    }
  }

  /**
   * Setup input validation
   */
  setupInputValidation() {
    if (!this.textarea) return;
    
    let typingTimer = null;
    const typingDelay = 1000; // 1 second
    
    this.textarea.addEventListener('input', () => {
      this.validateInput();
      
      // Show typing status
      if (this.textarea.value.trim().length > 0) {
        this.updateStatus('typing');
        
        // Clear previous timer
        if (typingTimer) {
          clearTimeout(typingTimer);
        }
        
        // Set timer to clear typing status
        typingTimer = setTimeout(() => {
          this.updateStatus('idle');
        }, typingDelay);
      } else {
        this.updateStatus('idle');
        if (typingTimer) {
          clearTimeout(typingTimer);
        }
      }
    });
    
    // Clear typing status when focus is lost
    this.textarea.addEventListener('blur', () => {
      if (typingTimer) {
        clearTimeout(typingTimer);
      }
      if (this.textarea.value.trim().length === 0) {
        this.updateStatus('idle');
      }
    });
  }

  /**
   * Validate input and update send button state
   */
  validateInput() {
    if (!this.textarea || !this.sendButton) return;
    
    const text = this.textarea.value.trim();
    const isValid = text.length > 0 && text.length <= this.maxLength;
    
    this.sendButton.disabled = !isValid;
    
    // Update button appearance
    if (isValid) {
      this.sendButton.classList.remove('disabled');
    } else {
      this.sendButton.classList.add('disabled');
    }
  }

  /**
   * Setup status indicator
   */
  setupStatusIndicator() {
    const inputWrapper = document.querySelector('.message-input-wrapper');
    if (inputWrapper && !this.statusIndicator) {
      this.statusIndicator = document.createElement('div');
      this.statusIndicator.className = 'input-status-indicator';
      this.statusIndicator.setAttribute('aria-live', 'polite');
      inputWrapper.appendChild(this.statusIndicator);
    }
  }

  /**
   * Update input status
   * @param {string} status - Status ('idle', 'typing', 'sending', 'sent', 'error')
   */
  updateStatus(status) {
    if (!this.statusIndicator) return;
    
    const statusMessages = {
      'idle': '',
      'typing': '正在输入...',
      'sending': '发送中...',
      'sent': '已发送',
      'error': '发送失败'
    };
    
    const statusClasses = {
      'idle': '',
      'typing': 'typing',
      'sending': 'sending',
      'sent': 'sent',
      'error': 'error'
    };
    
    this.statusIndicator.textContent = statusMessages[status] || '';
    this.statusIndicator.className = `input-status-indicator ${statusClasses[status] || ''}`;
  }

  /**
   * Send message
   */
  sendMessage() {
    if (!this.textarea) return;
    
    const text = this.textarea.value.trim();
    if (text === '' || text.length > this.maxLength) return;
    
    // Trigger form submission
    const form = document.getElementById('message-form');
    if (form) {
      const event = new Event('submit', { bubbles: true, cancelable: true });
      form.dispatchEvent(event);
    }
  }

  /**
   * Clear input
   */
  clearInput() {
    if (!this.textarea) return;
    
    this.textarea.value = '';
    this.adjustHeight();
    this.updateCharacterCount();
    this.validateInput();
    this.updateStatus('idle');
    this.textarea.focus();
  }

  /**
   * Reset input to initial state
   */
  reset() {
    this.clearInput();
  }

  /**
   * Focus input
   */
  focus() {
    if (this.textarea) {
      this.textarea.focus();
    }
  }

  /**
   * Get current input value
   * @returns {string} Current input value
   */
  getValue() {
    return this.textarea ? this.textarea.value : '';
  }

  /**
   * Set input value
   * @param {string} value - Value to set
   */
  setValue(value) {
    if (!this.textarea) return;
    
    this.textarea.value = value;
    this.adjustHeight();
    this.updateCharacterCount();
    this.validateInput();
  }
}

// Initialize message input enhancer
let messageInputEnhancer = null;

/**
 * Update message input status
 * @param {string} status - Status to update to
 */
function updateMessageInputStatus(status) {
  if (messageInputEnhancer) {
    messageInputEnhancer.updateStatus(status);
  }
}

/**
 * Reset message input to initial state
 */
function resetMessageInput() {
  if (messageInputEnhancer) {
    messageInputEnhancer.reset();
  }
}

/**
 * Focus message input
 */
function focusMessageInput() {
  if (messageInputEnhancer) {
    messageInputEnhancer.focus();
  }
}

// Load saved configuration on page load
$(document).ready(function() {
  const savedConfig = loadUserAvatarConfig();
  if (savedConfig) {
    applySavedAvatarConfig(savedConfig);
  }
  
  // Start status updates
  userStatusManager.startStatusUpdates();
  
  // Initialize connection status
  updateConnectionStatus('connecting');
  
  // Initialize message input enhancer
  messageInputEnhancer = new MessageInputEnhancer();
});

/**
 * Handle incoming chat message
 * @param {Object} data - Message data
 */
function handleChatMessage(data) {
  const messagesContainer = document.getElementById('messages-container');
  if (!messagesContainer) return;
  
  const currentUserHandle = userStatusManager.currentUser ? userStatusManager.currentUser.handle : '';
  const isSelf = data.handle === currentUserHandle;
  const messageClass = isSelf ? 'self' : 'other';
  
  // Generate avatar for the sender
  const avatar = avatarGenerator.generateAvatar(data.handle, 'initial');
  const avatarHTML = avatarGenerator.createAvatarHTML(avatar, 'sm');
  
  // Format timestamp
  const timestamp = new Date().toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const messageHTML = `
    <div class="message ${messageClass}" role="article">
      <div class="message-avatar">
        ${avatarHTML}
      </div>
      <div class="message-content">
        <div class="message-bubble">
          ${userStatusManager.escapeHtml(data.text)}
        </div>
        <div class="message-meta">
          <span class="message-sender">${userStatusManager.escapeHtml(data.handle)}</span>
          <span class="message-time">${timestamp}</span>
        </div>
      </div>
    </div>
  `;
  
  messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Update connection status indicator
 * @param {string} status - Connection status ('connecting', 'connected', 'disconnected', 'error')
 */
function updateConnectionStatus(status) {
  const statusElement = document.getElementById('connection-status');
  const chatStatusElement = document.getElementById('chat-status');
  
  const statusTexts = {
    'connecting': '连接中...',
    'connected': '已连接',
    'disconnected': '连接断开',
    'error': '连接错误'
  };
  
  const statusText = statusTexts[status] || '未知状态';
  
  if (statusElement) {
    statusElement.className = `connection-status ${status}`;
    statusElement.querySelector('.status-text').textContent = statusText;
    
    // Show status temporarily
    statusElement.classList.add('show');
    setTimeout(() => {
      if (status === 'connected') {
        statusElement.classList.remove('show');
      }
    }, 3000);
  }
  
  if (chatStatusElement) {
    chatStatusElement.textContent = statusText;
  }
}

/**
 * Initialize user settings form handling
 */
$(document).ready(function() {
  const settingsButton = document.querySelector('.settings-button');
  const userSettings = document.querySelector('.user-settings');
  const userSettingsForm = document.getElementById('user-settings-form');
  const cancelButton = document.getElementById('cancel-settings');
  
  // Show settings
  if (settingsButton) {
    settingsButton.addEventListener('click', function() {
      if (userSettings) {
        userSettings.style.display = 'block';
        userSettings.classList.add('show');
      }
    });
  }
  
  // Hide settings
  if (cancelButton) {
    cancelButton.addEventListener('click', function() {
      if (userSettings) {
        userSettings.classList.add('hide');
        setTimeout(() => {
          userSettings.style.display = 'none';
          userSettings.classList.remove('show', 'hide');
        }, 300);
      }
    });
  }
  
  // Handle settings form submission
  if (userSettingsForm) {
    userSettingsForm.addEventListener('submit', function(event) {
      event.preventDefault();
      
      const config = getCurrentUserAvatarConfig();
      if (config.username.trim() === '') {
        alert('请输入用户名');
        return;
      }
      
      // Save configuration
      saveUserAvatarConfig(config);
      
      // Set current user in status manager
      userStatusManager.setCurrentUser({
        handle: config.username,
        avatar: {
          type: config.type,
          value: config.value
        }
      });
      
      // Update hidden input for legacy compatibility
      const handleInput = document.getElementById('input-handle');
      if (handleInput) {
        handleInput.value = config.username;
      }
      
      // Hide settings
      if (userSettings) {
        userSettings.classList.add('hide');
        setTimeout(() => {
          userSettings.style.display = 'none';
          userSettings.classList.remove('show', 'hide');
        }, 300);
      }
      
      // Show success message
      userStatusManager.addSystemMessage(`欢迎 ${config.username}！您已成功设置用户信息。`);
    });
  }
  
  // Initialize mobile menu toggle
  const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const chatContainer = document.querySelector('.chat-container');
  
  if (mobileMenuToggle && sidebar) {
    mobileMenuToggle.addEventListener('click', function() {
      const isOpen = sidebar.classList.contains('open');
      
      if (isOpen) {
        sidebar.classList.remove('open');
        sidebar.classList.add('closing');
        chatContainer.classList.remove('sidebar-open');
        
        setTimeout(() => {
          sidebar.classList.remove('closing');
        }, 300);
      } else {
        sidebar.classList.add('open');
        chatContainer.classList.add('sidebar-open');
      }
      
      // Update ARIA attributes
      mobileMenuToggle.setAttribute('aria-expanded', !isOpen);
    });
  }
  
  // Initialize message input auto-resize
  const messageInput = document.getElementById('message-input');
  if (messageInput) {
    messageInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    
    // Handle Enter key for sending messages
    messageInput.addEventListener('keydown', function(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        document.getElementById('message-form').dispatchEvent(new Event('submit'));
      }
    });
    
    // Enable/disable send button based on input
    messageInput.addEventListener('input', function() {
      const sendButton = document.querySelector('.send-button');
      if (sendButton) {
        sendButton.disabled = this.value.trim() === '';
      }
    });
  }
  
  // Initialize contact item click handlers
  $(document).on('click', '.contact-item', function() {
    // Remove active class from all contacts
    $('.contact-item').removeClass('active').attr('aria-selected', 'false');
    
    // Add active class to clicked contact
    $(this).addClass('active').attr('aria-selected', 'true');
    
    // Update chat header with selected contact info
    const contactName = $(this).find('.contact-name').text();
    const chatTitle = document.querySelector('.chat-title');
    if (chatTitle) {
      chatTitle.textContent = contactName;
    }
    
    // Close mobile sidebar if open
    if (window.innerWidth <= 767) {
      sidebar.classList.remove('open');
      chatContainer.classList.remove('sidebar-open');
      if (mobileMenuToggle) {
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
      }
    }
  });
});

// ===== MESSAGE BUBBLE SYSTEM =====

/**
 * Handle incoming chat messages and display them
 * @param {Object} data - Message data from WebSocket
 */
function handleChatMessage(data) {
  const messagesContainer = document.getElementById('messages-container');
  if (!messagesContainer) return;

  // Create message element
  const messageElement = createMessageBubble(data);
  
  // Apply grouping if applicable
  applyMessageGrouping(messageElement);
  
  // Add to container with smooth animation
  messagesContainer.appendChild(messageElement);
  
  // Smooth scroll to bottom
  smoothScrollToBottom(messagesContainer);
  
  // Update contact list with last message
  updateContactLastMessage(data.handle, data.text);
}

/**
 * Create a message bubble element
 * @param {Object} messageData - Message data
 * @returns {HTMLElement} Message element
 */
function createMessageBubble(messageData) {
  const currentUser = userStatusManager.currentUser;
  const isSelf = currentUser && messageData.handle === currentUser.handle;
  const isSystem = messageData.type === 'system';
  
  // Create message container
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isSelf ? 'self' : isSystem ? 'system' : 'other'}`;
  messageDiv.setAttribute('role', 'article');
  messageDiv.setAttribute('data-message-id', generateMessageId());
  messageDiv.setAttribute('data-sender', messageData.handle);
  messageDiv.setAttribute('data-timestamp', Date.now());
  
  if (isSystem) {
    // System message (simple structure)
    messageDiv.innerHTML = `
      <div class="message-content">
        <div class="message-bubble">
          ${escapeHtml(messageData.text)}
        </div>
      </div>
    `;
  } else {
    // Regular user message
    const avatar = avatarGenerator.generateAvatar(messageData.handle, 'initial');
    const metadata = getMessageMetadata(messageData);
    const statusHTML = isSelf ? createMessageStatusHTML(messageData.status || 'sent') : '';
    
    messageDiv.innerHTML = `
      ${!isSelf ? `
        <div class="message-avatar">
          ${avatarGenerator.createAvatarHTML(avatar, 'sm')}
        </div>
      ` : ''}
      <div class="message-content">
        <div class="message-header">
          <span class="message-sender">${escapeHtml(messageData.handle)}</span>
          <span class="message-time" title="${metadata.fullTimeString}">${metadata.timeString}</span>
        </div>
        <div class="message-bubble" tabindex="0" aria-label="消息内容">
          ${formatMessageContent(messageData.text)}
        </div>
        <div class="message-meta">
          ${statusHTML}
        </div>
      </div>
      ${isSelf ? `
        <div class="message-avatar">
          ${avatarGenerator.createAvatarHTML(avatar, 'sm')}
        </div>
      ` : ''}
    `;
  }
  
  return messageDiv;
}

/**
 * Create a message bubble for outgoing messages (before sending)
 * @param {string} text - Message text
 * @param {string} handle - Sender handle
 * @returns {HTMLElement} Message element
 */
function createOutgoingMessageBubble(text, handle) {
  const messageData = {
    handle: handle,
    text: text,
    timestamp: Date.now(),
    status: 'sending'
  };
  
  const messageElement = createMessageBubble(messageData);
  messageElement.classList.add('loading');
  
  // Update status to sending
  const statusElement = messageElement.querySelector('.message-status');
  if (statusElement) {
    statusElement.className = 'message-status sending';
    statusElement.innerHTML = '<span class="message-status-icon">⏳</span>';
  }
  
  return messageElement;
}

/**
 * Update message status (sending, sent, failed)
 * @param {HTMLElement} messageElement - Message element
 * @param {string} status - New status ('sending', 'sent', 'failed')
 */
function updateMessageStatus(messageElement, status) {
  const statusElement = messageElement.querySelector('.message-status');
  if (!statusElement) return;
  
  statusElement.className = `message-status ${status}`;
  
  switch (status) {
    case 'sending':
      statusElement.innerHTML = '<span class="message-status-icon">⏳</span>';
      messageElement.classList.add('loading');
      break;
    case 'sent':
      statusElement.innerHTML = '<span class="message-status-icon">✓</span>';
      messageElement.classList.remove('loading', 'error');
      break;
    case 'failed':
      statusElement.innerHTML = '<span class="message-status-icon">✗</span><button class="message-retry" onclick="retryMessage(this)">重试</button>';
      messageElement.classList.remove('loading');
      messageElement.classList.add('error');
      break;
  }
}

/**
 * Format message content (handle line breaks, basic formatting)
 * @param {string} text - Raw message text
 * @returns {string} Formatted HTML
 */
function formatMessageContent(text) {
  if (!text) return '';
  
  // Escape HTML first
  let formatted = escapeHtml(text);
  
  // Convert line breaks to <br>
  formatted = formatted.replace(/\n/g, '<br>');
  
  // Simple URL detection and linking
  formatted = formatted.replace(
    /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  
  return formatted;
}

/**
 * Format message timestamp
 * @param {Date} timestamp - Message timestamp
 * @returns {string} Formatted time string
 */
function formatMessageTime(timestamp) {
  const now = new Date();
  const messageDate = new Date(timestamp);
  
  // If today, show time only
  if (messageDate.toDateString() === now.toDateString()) {
    return messageDate.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  // If yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (messageDate.toDateString() === yesterday.toDateString()) {
    return '昨天 ' + messageDate.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  // If this year, show month and day
  if (messageDate.getFullYear() === now.getFullYear()) {
    return messageDate.toLocaleDateString('zh-CN', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  // Show full date
  return messageDate.toLocaleDateString('zh-CN', { 
    year: 'numeric',
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Generate unique message ID
 * @returns {string} Unique message ID
 */
function generateMessageId() {
  return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Smooth scroll to bottom of messages container
 * @param {HTMLElement} container - Messages container
 */
function smoothScrollToBottom(container) {
  if (!container) return;
  
  const scrollHeight = container.scrollHeight;
  const height = container.clientHeight;
  const maxScrollTop = scrollHeight - height;
  
  // Only scroll if not already at bottom (within 50px)
  if (container.scrollTop < maxScrollTop - 50) {
    container.scrollTo({
      top: maxScrollTop,
      behavior: 'smooth'
    });
  }
}

/**
 * Check if messages should be grouped (same sender, within time threshold)
 * @param {HTMLElement} previousMessage - Previous message element
 * @param {HTMLElement} currentMessage - Current message element
 * @returns {boolean} True if messages should be grouped
 */
function shouldGroupMessages(previousMessage, currentMessage) {
  if (!previousMessage || !currentMessage) return false;
  
  const prevSender = previousMessage.getAttribute('data-sender');
  const currSender = currentMessage.getAttribute('data-sender');
  const prevTimestamp = parseInt(previousMessage.getAttribute('data-timestamp'));
  const currTimestamp = parseInt(currentMessage.getAttribute('data-timestamp'));
  
  // Same sender and within 5 minutes
  return prevSender === currSender && 
         (currTimestamp - prevTimestamp) < 300000 && // 5 minutes
         !previousMessage.classList.contains('system') &&
         !currentMessage.classList.contains('system');
}

/**
 * Apply message grouping
 * @param {HTMLElement} messageElement - Message element to potentially group
 */
function applyMessageGrouping(messageElement) {
  const messagesContainer = messageElement.parentElement;
  if (!messagesContainer) return;
  
  const previousMessage = messageElement.previousElementSibling;
  
  if (shouldGroupMessages(previousMessage, messageElement)) {
    messageElement.classList.add('grouped');
  }
}

/**
 * Retry sending a failed message
 * @param {HTMLElement} retryButton - Retry button element
 */
function retryMessage(retryButton) {
  const messageElement = retryButton.closest('.message');
  if (!messageElement) return;
  
  const messageText = messageElement.querySelector('.message-bubble').textContent;
  const handle = messageElement.getAttribute('data-sender');
  
  // Update status to sending
  updateMessageStatus(messageElement, 'sending');
  
  // Attempt to resend
  try {
    box.send(JSON.stringify({ handle: handle, text: messageText }));
    
    // Simulate successful send after a delay
    setTimeout(() => {
      updateMessageStatus(messageElement, 'sent');
    }, 1000);
  } catch (error) {
    console.error('Failed to retry message:', error);
    updateMessageStatus(messageElement, 'failed');
  }
}

/**
 * Update contact's last message in the contact list
 * @param {string} handle - User handle
 * @param {string} message - Last message text
 */
function updateContactLastMessage(handle, message) {
  const userId = userStatusManager.generateUserId(handle);
  const contactElement = document.querySelector(`[data-contact-id="${userId}"]`);
  
  if (contactElement) {
    const lastMessageElement = contactElement.querySelector('.contact-last-message');
    if (lastMessageElement) {
      // Truncate long messages
      const truncated = message.length > 30 ? message.substring(0, 30) + '...' : message;
      lastMessageElement.textContent = truncated;
    }
    
    // Update timestamp
    const timeElement = contactElement.querySelector('.contact-time');
    if (timeElement) {
      timeElement.textContent = formatMessageTime(new Date());
    }
  }
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
// 
===== MESSAGE INPUT HELPER FUNCTIONS =====

/**
 * Reset message input to default state
 */
function resetMessageInput() {
  const messageInput = document.getElementById('message-input');
  if (messageInput) {
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
  }
}

/**
 * Update message input status indicator
 * @param {string} status - Status ('idle', 'typing', 'sending', 'sent', 'error')
 */
function updateMessageInputStatus(status) {
  const statusIndicator = document.querySelector('.input-status-indicator');
  if (!statusIndicator) return;
  
  statusIndicator.className = `input-status-indicator ${status}`;
  
  switch (status) {
    case 'idle':
      statusIndicator.textContent = '';
      break;
    case 'typing':
      statusIndicator.textContent = '正在输入...';
      break;
    case 'sending':
      statusIndicator.textContent = '发送中...';
      break;
    case 'sent':
      statusIndicator.textContent = '已发送';
      break;
    case 'error':
      statusIndicator.textContent = '发送失败';
      break;
  }
}

/**
 * Update connection status indicator
 * @param {string} status - Connection status ('connected', 'disconnected', 'reconnecting', 'error')
 */
function updateConnectionStatus(status) {
  const statusElement = document.getElementById('connection-status');
  const statusText = statusElement ? statusElement.querySelector('.status-text') : null;
  const chatStatus = document.getElementById('chat-status');
  
  if (statusElement) {
    statusElement.className = `connection-status ${status} show`;
    
    // Hide after a delay for successful connections
    if (status === 'connected') {
      setTimeout(() => {
        statusElement.classList.remove('show');
      }, 2000);
    }
  }
  
  if (statusText) {
    switch (status) {
      case 'connected':
        statusText.textContent = '已连接';
        break;
      case 'disconnected':
        statusText.textContent = '连接断开';
        break;
      case 'reconnecting':
        statusText.textContent = '重新连接中...';
        break;
      case 'error':
        statusText.textContent = '连接错误';
        break;
    }
  }
  
  if (chatStatus) {
    switch (status) {
      case 'connected':
        chatStatus.textContent = '在线';
        break;
      case 'disconnected':
        chatStatus.textContent = '离线';
        break;
      case 'reconnecting':
        chatStatus.textContent = '重新连接中...';
        break;
      case 'error':
        chatStatus.textContent = '连接错误';
        break;
    }
  }
}// 
===== MESSAGE METADATA MANAGEMENT =====

/**
 * Start periodic updates for relative timestamps
 */
function startMessageTimeUpdates() {
  // Update relative times every minute
  setInterval(updateAllMessageTimes, 60000);
}

/**
 * Update all message timestamps to show relative time
 */
function updateAllMessageTimes() {
  const timeElements = document.querySelectorAll('.message-time');
  timeElements.forEach(element => {
    const messageElement = element.closest('.message');
    if (messageElement) {
      const timestamp = parseInt(messageElement.getAttribute('data-timestamp'));
      if (timestamp) {
        element.classList.add('updating');
        const newTimeString = formatMessageTime(new Date(timestamp));
        element.textContent = newTimeString;
        
        // Remove updating class after animation
        setTimeout(() => {
          element.classList.remove('updating');
        }, 200);
      }
    }
  });
}

/**
 * Add read receipt to message
 * @param {HTMLElement} messageElement - Message element
 * @param {boolean} isRead - Whether message is read
 */
function updateMessageReadReceipt(messageElement, isRead) {
  if (!messageElement) return;
  
  const metaElement = messageElement.querySelector('.message-meta');
  if (!metaElement) return;
  
  let receiptElement = metaElement.querySelector('.message-read-receipt');
  
  if (!receiptElement) {
    receiptElement = document.createElement('div');
    receiptElement.className = 'message-read-receipt';
    receiptElement.innerHTML = '<span class="message-read-receipt-icon"></span>';
    metaElement.appendChild(receiptElement);
  }
  
  if (isRead) {
    receiptElement.classList.add('read');
    receiptElement.title = '已读';
  } else {
    receiptElement.classList.remove('read');
    receiptElement.title = '未读';
  }
}

/**
 * Mark message as edited
 * @param {HTMLElement} messageElement - Message element
 */
function markMessageAsEdited(messageElement) {
  if (!messageElement) return;
  
  const metaElement = messageElement.querySelector('.message-meta');
  if (!metaElement) return;
  
  let editedElement = metaElement.querySelector('.message-edited');
  
  if (!editedElement) {
    editedElement = document.createElement('span');
    editedElement.className = 'message-edited';
    editedElement.textContent = '已编辑';
    metaElement.appendChild(editedElement);
  }
}

/**
 * Update message delivery status with animation
 * @param {HTMLElement} messageElement - Message element
 * @param {string} status - New status
 * @param {number} delay - Delay before update (ms)
 */
function updateMessageStatusWithDelay(messageElement, status, delay = 0) {
  setTimeout(() => {
    updateMessageStatus(messageElement, status);
  }, delay);
}

/**
 * Get formatted message metadata
 * @param {Object} messageData - Message data
 * @returns {Object} Formatted metadata
 */
function getMessageMetadata(messageData) {
  const timestamp = new Date(messageData.timestamp || Date.now());
  const timeString = formatMessageTime(timestamp);
  const fullTimeString = timestamp.toLocaleString('zh-CN');
  
  return {
    timeString: timeString,
    fullTimeString: fullTimeString,
    timestamp: timestamp.getTime(),
    sender: messageData.handle,
    messageId: messageData.id || generateMessageId()
  };
}

/**
 * Enhanced relative time formatting with more granular updates
 * @param {Date} timestamp - Message timestamp
 * @returns {string} Formatted relative time
 */
function getRelativeTimeString(timestamp) {
  const now = new Date();
  const messageDate = new Date(timestamp);
  const diffMs = now - messageDate;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 30) {
    return '刚刚';
  } else if (diffSeconds < 60) {
    return `${diffSeconds}秒前`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return messageDate.toLocaleDateString('zh-CN');
  }
}

/**
 * Create message status indicator HTML
 * @param {string} status - Message status
 * @returns {string} HTML string
 */
function createMessageStatusHTML(status) {
  const statusConfig = {
    sending: { icon: '⏳', text: '发送中' },
    sent: { icon: '✓', text: '已发送' },
    delivered: { icon: '✓✓', text: '已送达' },
    read: { icon: '✓✓', text: '已读' },
    failed: { icon: '✗', text: '发送失败' }
  };
  
  const config = statusConfig[status] || statusConfig.sent;
  
  return `
    <div class="message-status ${status}" title="${config.text}">
      <span class="message-status-icon">${config.icon}</span>
    </div>
  `;
}

/**
 * Initialize message metadata system
 */
function initializeMessageMetadata() {
  // Start periodic time updates
  startMessageTimeUpdates();
  
  // Add hover effects for message metadata
  document.addEventListener('mouseover', function(event) {
    const messageElement = event.target.closest('.message');
    if (messageElement && !messageElement.classList.contains('system')) {
      messageElement.classList.add('metadata-visible');
    }
  });
  
  document.addEventListener('mouseout', function(event) {
    const messageElement = event.target.closest('.message');
    if (messageElement) {
      messageElement.classList.remove('metadata-visible');
    }
  });
}

// Initialize metadata system when DOM is ready
$(document).ready(function() {
  initializeMessageMetadata();
});/
/ ===== MESSAGE RENDERING AND SCROLLING SYSTEM =====

/**
 * Message renderer class for handling dynamic message rendering
 */
class MessageRenderer {
  constructor() {
    this.messagesContainer = document.getElementById('messages-container');
    this.messageHistory = [];
    this.maxMessages = 1000; // Maximum messages to keep in memory
    this.renderBatchSize = 20; // Number of messages to render at once
    this.isAutoScrollEnabled = true;
    this.scrollThreshold = 100; // Pixels from bottom to consider "at bottom"
    this.lastScrollPosition = 0;
    this.isScrolling = false;
    
    this.initializeScrollHandling();
  }

  /**
   * Initialize scroll event handling
   */
  initializeScrollHandling() {
    if (!this.messagesContainer) return;
    
    // Throttled scroll handler
    let scrollTimeout;
    this.messagesContainer.addEventListener('scroll', () => {
      this.isScrolling = true;
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.isScrolling = false;
        this.handleScrollEnd();
      }, 150);
      
      this.handleScroll();
    });
    
    // Handle resize events
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  /**
   * Handle scroll events
   */
  handleScroll() {
    if (!this.messagesContainer) return;
    
    const { scrollTop, scrollHeight, clientHeight } = this.messagesContainer;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // Update auto-scroll state based on scroll position
    this.isAutoScrollEnabled = distanceFromBottom <= this.scrollThreshold;
    
    // Load more messages if scrolled to top
    if (scrollTop === 0) {
      this.loadMoreMessages();
    }
    
    this.lastScrollPosition = scrollTop;
  }

  /**
   * Handle scroll end
   */
  handleScrollEnd() {
    // Update scroll position indicator if needed
    this.updateScrollIndicator();
  }

  /**
   * Handle window resize
   */
  handleResize() {
    if (this.isAutoScrollEnabled) {
      this.scrollToBottom(false); // No animation on resize
    }
  }

  /**
   * Add a message to the renderer
   * @param {Object} messageData - Message data
   * @param {boolean} shouldScroll - Whether to scroll to bottom
   */
  addMessage(messageData, shouldScroll = true) {
    if (!this.messagesContainer) return;
    
    // Add to history
    this.messageHistory.push(messageData);
    
    // Limit message history
    if (this.messageHistory.length > this.maxMessages) {
      this.messageHistory.shift();
      this.removeOldestMessage();
    }
    
    // Create and add message element
    const messageElement = createMessageBubble(messageData);
    this.renderMessage(messageElement, shouldScroll);
    
    return messageElement;
  }

  /**
   * Render a message element with animation
   * @param {HTMLElement} messageElement - Message element
   * @param {boolean} shouldScroll - Whether to scroll to bottom
   */
  renderMessage(messageElement, shouldScroll = true) {
    if (!messageElement || !this.messagesContainer) return;
    
    // Apply grouping
    applyMessageGrouping(messageElement);
    
    // Add with entrance animation
    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateY(20px)';
    
    this.messagesContainer.appendChild(messageElement);
    
    // Trigger animation
    requestAnimationFrame(() => {
      messageElement.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
      messageElement.style.opacity = '1';
      messageElement.style.transform = 'translateY(0)';
    });
    
    // Scroll to bottom if needed
    if (shouldScroll && this.isAutoScrollEnabled) {
      this.scrollToBottom(true);
    }
  }

  /**
   * Remove the oldest message from DOM
   */
  removeOldestMessage() {
    if (!this.messagesContainer) return;
    
    const firstMessage = this.messagesContainer.querySelector('.message');
    if (firstMessage) {
      firstMessage.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
      firstMessage.style.opacity = '0';
      firstMessage.style.transform = 'translateY(-10px)';
      
      setTimeout(() => {
        if (firstMessage.parentNode) {
          firstMessage.parentNode.removeChild(firstMessage);
        }
      }, 200);
    }
  }

  /**
   * Scroll to bottom with smooth animation
   * @param {boolean} smooth - Whether to use smooth scrolling
   */
  scrollToBottom(smooth = true) {
    if (!this.messagesContainer) return;
    
    const scrollOptions = {
      top: this.messagesContainer.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    };
    
    this.messagesContainer.scrollTo(scrollOptions);
  }

  /**
   * Load more messages (placeholder for pagination)
   */
  loadMoreMessages() {
    // This would typically load older messages from server
    console.log('Loading more messages...');
    
    // Show loading indicator
    this.showLoadingIndicator();
    
    // Simulate loading delay
    setTimeout(() => {
      this.hideLoadingIndicator();
    }, 1000);
  }

  /**
   * Show loading indicator at top of messages
   */
  showLoadingIndicator() {
    if (!this.messagesContainer) return;
    
    let indicator = this.messagesContainer.querySelector('.loading-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'loading-indicator';
      indicator.innerHTML = `
        <div class="loading-spinner"></div>
        <span>加载更多消息...</span>
      `;
      this.messagesContainer.insertBefore(indicator, this.messagesContainer.firstChild);
    }
    
    indicator.style.display = 'flex';
  }

  /**
   * Hide loading indicator
   */
  hideLoadingIndicator() {
    const indicator = this.messagesContainer?.querySelector('.loading-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  /**
   * Update scroll indicator (show/hide "scroll to bottom" button)
   */
  updateScrollIndicator() {
    let scrollButton = document.querySelector('.scroll-to-bottom');
    
    if (!this.isAutoScrollEnabled) {
      if (!scrollButton) {
        scrollButton = this.createScrollToBottomButton();
        document.body.appendChild(scrollButton);
      }
      scrollButton.classList.add('visible');
    } else if (scrollButton) {
      scrollButton.classList.remove('visible');
    }
  }

  /**
   * Create scroll to bottom button
   * @returns {HTMLElement} Scroll button element
   */
  createScrollToBottomButton() {
    const button = document.createElement('button');
    button.className = 'scroll-to-bottom';
    button.innerHTML = `
      <span class="scroll-icon">↓</span>
      <span class="scroll-text">回到底部</span>
    `;
    button.setAttribute('aria-label', '滚动到最新消息');
    
    button.addEventListener('click', () => {
      this.isAutoScrollEnabled = true;
      this.scrollToBottom(true);
    });
    
    return button;
  }

  /**
   * Clear all messages
   */
  clearMessages() {
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = '';
    }
    this.messageHistory = [];
  }

  /**
   * Get message count
   * @returns {number} Number of messages
   */
  getMessageCount() {
    return this.messageHistory.length;
  }

  /**
   * Enable auto-scroll
   */
  enableAutoScroll() {
    this.isAutoScrollEnabled = true;
    this.scrollToBottom(true);
  }

  /**
   * Disable auto-scroll
   */
  disableAutoScroll() {
    this.isAutoScrollEnabled = false;
  }
}

// Initialize message renderer
const messageRenderer = new MessageRenderer();

/**
 * Enhanced smooth scroll function with easing
 * @param {HTMLElement} container - Container to scroll
 * @param {number} targetPosition - Target scroll position
 * @param {number} duration - Animation duration in ms
 */
function smoothScrollToPosition(container, targetPosition, duration = 300) {
  if (!container) return;
  
  const startPosition = container.scrollTop;
  const distance = targetPosition - startPosition;
  const startTime = performance.now();
  
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  }
  
  function animateScroll(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeInOutCubic(progress);
    
    container.scrollTop = startPosition + distance * easedProgress;
    
    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    }
  }
  
  requestAnimationFrame(animateScroll);
}

/**
 * Update the global handleChatMessage function to use the renderer
 */
const originalHandleChatMessage = handleChatMessage;
function handleChatMessage(data) {
  // Use the message renderer for better performance and animations
  messageRenderer.addMessage(data);
  
  // Update contact list with last message
  updateContactLastMessage(data.handle, data.text);
}

// Add CSS for loading indicator and scroll button
const additionalStyles = `
.loading-indicator {
  display: none;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.scroll-to-bottom {
  position: fixed;
  bottom: 100px;
  right: var(--spacing-md);
  background-color: var(--primary-color);
  color: var(--text-white);
  border: none;
  border-radius: var(--border-radius-full);
  padding: var(--spacing-sm) var(--spacing-md);
  box-shadow: var(--shadow-lg);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  z-index: var(--z-floating);
  opacity: 0;
  transform: translateY(20px);
  transition: all var(--transition-normal);
  pointer-events: none;
}

.scroll-to-bottom.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.scroll-to-bottom:hover {
  background-color: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-xl);
}

.scroll-icon {
  font-size: var(--font-size-lg);
  line-height: 1;
}

@media (max-width: 767px) {
  .scroll-to-bottom {
    bottom: 80px;
    right: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
  }
  
  .scroll-text {
    display: none;
  }
}
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
// =====
 USER SETTINGS MODAL SYSTEM =====

/**
 * User Settings Modal Manager
 */
class UserSettingsModal {
  constructor() {
    this.modal = null;
    this.overlay = null;
    this.form = null;
    this.isOpen = false;
    this.focusableElements = [];
    this.previousFocus = null;
    
    this.init();
  }

  /**
   * Initialize the modal system
   */
  init() {
    this.modal = document.getElementById('user-settings-modal');
    this.overlay = this.modal;
    this.form = document.getElementById('user-settings-form');
    
    if (!this.modal || !this.form) {
      console.error('User settings modal elements not found');
      return;
    }

    this.bindEvents();
    this.loadSavedSettings();
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Settings button click
    const settingsButton = document.querySelector('.settings-button');
    if (settingsButton) {
      settingsButton.addEventListener('click', () => this.open());
    }

    // Close button click
    const closeButton = this.modal.querySelector('.modal-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.close());
    }

    // Cancel button click
    const cancelButton = document.getElementById('cancel-settings');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => this.close());
    }

    // Overlay click to close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Form submission
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSettings();
    });

    // Real-time avatar preview updates
    const nameInput = document.getElementById('user-name-input');
    const avatarSelect = document.getElementById('user-avatar-select');
    const customEmojiInput = document.getElementById('custom-emoji-input');

    if (nameInput) {
      nameInput.addEventListener('input', () => this.updateAvatarPreview());
    }

    if (avatarSelect) {
      avatarSelect.addEventListener('change', () => this.updateAvatarPreview());
    }

    if (customEmojiInput) {
      customEmojiInput.addEventListener('input', () => this.updateAvatarPreview());
    }

    // Form validation
    if (nameInput) {
      nameInput.addEventListener('blur', () => this.validateUsername());
    }

    if (customEmojiInput) {
      customEmojiInput.addEventListener('blur', () => this.validateCustomEmoji());
    }
  }

  /**
   * Open the modal
   */
  open() {
    if (this.isOpen) return;

    this.previousFocus = document.activeElement;
    this.isOpen = true;

    // Show modal
    this.overlay.classList.add('show');
    this.overlay.setAttribute('aria-hidden', 'false');

    // Focus management
    this.updateFocusableElements();
    this.trapFocus();

    // Focus first input
    const firstInput = this.modal.querySelector('input, select, textarea, button');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Load current settings
    this.loadCurrentSettings();
    this.updateAvatarPreview();

    // Announce to screen readers
    this.announceModalOpen();
  }

  /**
   * Close the modal
   */
  close() {
    if (!this.isOpen) return;

    this.isOpen = false;

    // Hide modal
    this.overlay.classList.remove('show');
    this.overlay.setAttribute('aria-hidden', 'true');

    // Restore focus
    if (this.previousFocus) {
      this.previousFocus.focus();
    }

    // Restore body scroll
    document.body.style.overflow = '';

    // Clear form validation states
    this.clearValidationStates();

    // Announce to screen readers
    this.announceModalClose();
  }

  /**
   * Update focusable elements list
   */
  updateFocusableElements() {
    const focusableSelectors = [
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'button:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ];

    this.focusableElements = Array.from(
      this.modal.querySelectorAll(focusableSelectors.join(', '))
    );
  }

  /**
   * Trap focus within modal
   */
  trapFocus() {
    const handleTabKey = (e) => {
      if (e.key !== 'Tab' || !this.isOpen) return;

      const firstElement = this.focusableElements[0];
      const lastElement = this.focusableElements[this.focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);

    // Store reference to remove later
    this.tabKeyHandler = handleTabKey;
  }

  /**
   * Load current user settings into form
   */
  loadCurrentSettings() {
    const currentUser = userStatusManager.currentUser;
    const nameInput = document.getElementById('user-name-input');
    const avatarSelect = document.getElementById('user-avatar-select');
    const customEmojiInput = document.getElementById('custom-emoji-input');

    // Load from current user or localStorage
    const savedConfig = this.loadSavedUserConfig();

    if (nameInput) {
      nameInput.value = currentUser?.handle || savedConfig?.username || '';
    }

    if (avatarSelect && savedConfig?.avatarType === 'preset') {
      avatarSelect.value = savedConfig.avatarValue || 'default';
    }

    if (customEmojiInput && savedConfig?.avatarType === 'custom') {
      customEmojiInput.value = savedConfig.avatarValue || '';
    }
  }

  /**
   * Save user settings
   */
  async saveSettings() {
    if (!this.validateForm()) {
      return;
    }

    const saveButton = this.form.querySelector('button[type="submit"]');
    const originalText = saveButton.textContent;

    try {
      // Show loading state
      saveButton.classList.add('loading');
      saveButton.disabled = true;

      // Get form values
      const formData = this.getFormData();

      // Save to localStorage
      this.saveUserConfig(formData);

      // Update current user
      this.updateCurrentUser(formData);

      // Update UI
      this.updateUserInterface(formData);

      // Show success feedback
      this.showSuccessMessage();

      // Close modal after short delay
      setTimeout(() => {
        this.close();
      }, 1000);

    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showErrorMessage('保存设置失败，请重试');
    } finally {
      // Restore button state
      saveButton.classList.remove('loading');
      saveButton.disabled = false;
    }
  }

  /**
   * Get form data
   * @returns {Object} Form data
   */
  getFormData() {
    const nameInput = document.getElementById('user-name-input');
    const avatarSelect = document.getElementById('user-avatar-select');
    const customEmojiInput = document.getElementById('custom-emoji-input');

    const username = nameInput?.value.trim() || '';
    const selectedAvatar = avatarSelect?.value || 'default';
    const customEmoji = customEmojiInput?.value.trim() || '';

    // Determine avatar configuration
    let avatarType = 'initial';
    let avatarValue = null;

    if (customEmoji && avatarGenerator.isEmoji(customEmoji)) {
      avatarType = 'custom';
      avatarValue = customEmoji;
    } else if (selectedAvatar && selectedAvatar !== 'default') {
      avatarType = 'preset';
      avatarValue = selectedAvatar;
    }

    return {
      username,
      avatarType,
      avatarValue
    };
  }

  /**
   * Validate form
   * @returns {boolean} True if valid
   */
  validateForm() {
    let isValid = true;

    // Validate username
    if (!this.validateUsername()) {
      isValid = false;
    }

    // Validate custom emoji
    if (!this.validateCustomEmoji()) {
      isValid = false;
    }

    return isValid;
  }

  /**
   * Validate username
   * @returns {boolean} True if valid
   */
  validateUsername() {
    const nameInput = document.getElementById('user-name-input');
    const formGroup = nameInput?.closest('.form-group');
    
    if (!nameInput || !formGroup) return true;

    const username = nameInput.value.trim();
    const helpText = formGroup.querySelector('.form-text');

    // Clear previous states
    formGroup.classList.remove('has-error', 'has-success');

    if (!username) {
      this.setFieldError(formGroup, helpText, '请输入用户名');
      return false;
    }

    if (username.length > 20) {
      this.setFieldError(formGroup, helpText, '用户名不能超过20个字符');
      return false;
    }

    if (username.length < 2) {
      this.setFieldError(formGroup, helpText, '用户名至少需要2个字符');
      return false;
    }

    // Success state
    this.setFieldSuccess(formGroup, helpText, '用户名可用');
    return true;
  }

  /**
   * Validate custom emoji
   * @returns {boolean} True if valid
   */
  validateCustomEmoji() {
    const customEmojiInput = document.getElementById('custom-emoji-input');
    const formGroup = customEmojiInput?.closest('.form-group');
    
    if (!customEmojiInput || !formGroup) return true;

    const emoji = customEmojiInput.value.trim();
    const helpText = formGroup.querySelector('.form-text');

    // Clear previous states
    formGroup.classList.remove('has-error', 'has-success');

    if (emoji && !avatarGenerator.isEmoji(emoji)) {
      this.setFieldError(formGroup, helpText, '请输入有效的表情符号');
      return false;
    }

    if (emoji && emoji.length > 2) {
      this.setFieldError(formGroup, helpText, '表情符号不能超过2个字符');
      return false;
    }

    // Success or neutral state
    if (emoji) {
      this.setFieldSuccess(formGroup, helpText, '表情符号有效');
    } else {
      this.setFieldNeutral(formGroup, helpText, '输入表情符号来创建个性化头像');
    }

    return true;
  }

  /**
   * Set field error state
   */
  setFieldError(formGroup, helpText, message) {
    formGroup.classList.add('has-error');
    if (helpText) {
      helpText.textContent = message;
    }
  }

  /**
   * Set field success state
   */
  setFieldSuccess(formGroup, helpText, message) {
    formGroup.classList.add('has-success');
    if (helpText) {
      helpText.textContent = message;
    }
  }

  /**
   * Set field neutral state
   */
  setFieldNeutral(formGroup, helpText, message) {
    if (helpText) {
      helpText.textContent = message;
    }
  }

  /**
   * Clear validation states
   */
  clearValidationStates() {
    const formGroups = this.form.querySelectorAll('.form-group');
    formGroups.forEach(group => {
      group.classList.remove('has-error', 'has-success');
    });
  }

  /**
   * Update avatar preview
   */
  updateAvatarPreview() {
    const formData = this.getFormData();
    const avatar = avatarGenerator.generateAvatar(
      formData.username,
      formData.avatarType,
      formData.avatarValue
    );

    const previewContainer = document.getElementById('avatar-preview');
    if (previewContainer) {
      previewContainer.innerHTML = avatarGenerator.createAvatarHTML(avatar, 'lg');
    }
  }

  /**
   * Save user configuration to localStorage
   */
  saveUserConfig(config) {
    try {
      const userConfig = {
        username: config.username,
        avatarType: config.avatarType,
        avatarValue: config.avatarValue,
        savedAt: Date.now(),
        version: '1.0' // Add version for future migrations
      };

      localStorage.setItem('userSettings', JSON.stringify(userConfig));
      
      // Trigger save event for other components
      const event = new CustomEvent('userSettingsSaved', {
        detail: { config: userConfig }
      });
      document.dispatchEvent(event);
      
      console.log('User settings saved successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to save user config to localStorage:', error);
      
      // Show error message to user
      this.showSaveErrorMessage();
      return false;
    }
  }
  
  /**
   * Show save error message
   */
  showSaveErrorMessage() {
    const errorMessage = '保存设置失败，可能是存储空间不足。请清理浏览器数据后重试。';
    
    // Show in modal if open
    if (this.isOpen) {
      const modalBody = this.modal.querySelector('.modal-body');
      if (modalBody) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.textContent = errorMessage;
        modalBody.insertBefore(errorDiv, modalBody.firstChild);
        
        // Remove error after 5 seconds
        setTimeout(() => {
          if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
          }
        }, 5000);
      }
    }
    
    // Also log to console
    console.error('Settings save failed:', errorMessage);
  }

  /**
   * Load saved user configuration from localStorage
   */
  loadSavedUserConfig() {
    try {
      const saved = localStorage.getItem('userSettings');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Failed to load user config from localStorage:', error);
      return null;
    }
  }

  /**
   * Load saved settings on initialization
   */
  loadSavedSettings() {
    const savedConfig = this.loadSavedUserConfig();
    if (savedConfig && savedConfig.username) {
      // Auto-apply saved settings if available
      this.applyUserConfig(savedConfig);
      
      // Update form fields if modal is available
      this.loadCurrentSettings();
      
      console.log('Auto-loaded user settings:', savedConfig.username);
    }
  }

  /**
   * Apply user configuration
   */
  applyUserConfig(config) {
    if (!config || !config.username) return;

    // Update current user in status manager
    userStatusManager.setCurrentUser({
      handle: config.username,
      avatar: {
        type: config.avatarType,
        value: config.avatarValue
      }
    });

    // Update input handle for WebSocket
    const handleInput = document.getElementById('input-handle');
    if (handleInput) {
      handleInput.value = config.username;
    }

    // Update UI elements
    this.updateUserInterface(config);
  }

  /**
   * Update current user
   */
  updateCurrentUser(config) {
    // Update status manager
    userStatusManager.setCurrentUser({
      handle: config.username,
      avatar: {
        type: config.avatarType,
        value: config.avatarValue
      }
    });

    // Update WebSocket handle
    const handleInput = document.getElementById('input-handle');
    if (handleInput) {
      handleInput.value = config.username;
    }
  }

  /**
   * Update user interface elements
   */
  updateUserInterface(config) {
    // Update chat header if needed
    const chatTitle = document.querySelector('.chat-title');
    if (chatTitle && chatTitle.textContent === '设置用户名') {
      chatTitle.textContent = '全体成员';
    }

    // Update connection status
    updateConnectionStatus('connected');

    // Show welcome message if first time setup
    if (!userStatusManager.currentUser) {
      this.showWelcomeMessage(config.username);
    }
  }

  /**
   * Show welcome message
   */
  showWelcomeMessage(username) {
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      const welcomeMessage = `欢迎 ${username}！您已成功设置用户信息。`;
      
      const messageHTML = `
        <div class="message system" role="article">
          <div class="message-content">
            <div class="message-bubble">
              ${this.escapeHtml(welcomeMessage)}
            </div>
          </div>
        </div>
      `;
      
      messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  /**
   * Show success message
   */
  showSuccessMessage() {
    // You could implement a toast notification here
    console.log('Settings saved successfully');
  }

  /**
   * Show error message
   */
  showErrorMessage(message) {
    // You could implement a toast notification here
    console.error('Settings error:', message);
    alert(message); // Temporary fallback
  }

  /**
   * Announce modal open to screen readers
   */
  announceModalOpen() {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = '用户设置对话框已打开';
    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Announce modal close to screen readers
   */
  announceModalClose() {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = '用户设置对话框已关闭';
    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Reset settings to default
   */
  resetSettings() {
    if (confirm('确定要重置所有设置吗？这将清除您保存的用户信息。')) {
      try {
        // Clear localStorage
        localStorage.removeItem('userSettings');
        localStorage.removeItem('userAvatarConfig'); // Clear legacy data too
        
        // Reset form
        this.form.reset();
        
        // Clear current user
        if (userStatusManager) {
          userStatusManager.currentUser = null;
        }
        
        // Clear WebSocket handle
        const handleInput = document.getElementById('input-handle');
        if (handleInput) {
          handleInput.value = '';
        }
        
        // Update preview
        this.updateAvatarPreview();
        
        // Clear validation states
        this.clearValidationStates();
        
        // Reset UI elements
        const chatStatus = document.getElementById('chat-status');
        if (chatStatus) {
          chatStatus.textContent = '请设置用户名';
        }
        
        // Show success message
        this.showResetSuccessMessage();
        
        console.log('Settings reset successfully');
        
      } catch (error) {
        console.error('Failed to reset settings:', error);
        alert('重置设置时出现错误，请刷新页面重试。');
      }
    }
  }
  
  /**
   * Show reset success message
   */
  showResetSuccessMessage() {
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      const resetMessage = '设置已重置，请重新配置您的用户信息。';
      
      const messageHTML = `
        <div class="message system" role="article">
          <div class="message-content">
            <div class="message-bubble">
              ${this.escapeHtml(resetMessage)}
            </div>
          </div>
        </div>
      `;
      
      messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  /**
   * Check if modal is open
   */
  isModalOpen() {
    return this.isOpen;
  }
}

// Initialize user settings modal
let userSettingsModal;

$(document).ready(function() {
  userSettingsModal = new UserSettingsModal();
  
  // Auto-load and apply saved settings immediately
  userSettingsModal.loadSavedSettings();
  
  // Auto-open settings if no user is configured
  setTimeout(() => {
    const savedConfig = userSettingsModal.loadSavedUserConfig();
    if (!savedConfig || !savedConfig.username) {
      userSettingsModal.open();
    }
  }, 1000);
});

// ===== SETTINGS INTEGRATION WITH EXISTING SYSTEMS =====

/**
 * Enhanced user status manager integration
 */
if (typeof userStatusManager !== 'undefined') {
  const originalSetCurrentUser = userStatusManager.setCurrentUser;
  
  userStatusManager.setCurrentUser = function(userData) {
    originalSetCurrentUser.call(this, userData);
    
    // Update settings form if modal is open
    if (userSettingsModal && userSettingsModal.isModalOpen()) {
      userSettingsModal.loadCurrentSettings();
    }
  };
}

/**
 * Enhanced connection status updates
 */
function updateConnectionStatus(status) {
  const statusElement = document.getElementById('connection-status');
  const statusText = statusElement?.querySelector('.status-text');
  const chatStatus = document.getElementById('chat-status');
  
  if (!statusElement || !statusText) return;
  
  // Remove existing status classes
  statusElement.classList.remove('connected', 'connecting', 'disconnected', 'error');
  
  switch (status) {
    case 'connected':
      statusElement.classList.add('connected');
      statusText.textContent = '已连接';
      if (chatStatus) chatStatus.textContent = '在线';
      break;
    case 'connecting':
      statusElement.classList.add('connecting');
      statusText.textContent = '连接中...';
      if (chatStatus) chatStatus.textContent = '连接中...';
      break;
    case 'disconnected':
      statusElement.classList.add('disconnected');
      statusText.textContent = '连接断开';
      if (chatStatus) chatStatus.textContent = '离线';
      break;
    case 'error':
      statusElement.classList.add('error');
      statusText.textContent = '连接错误';
      if (chatStatus) chatStatus.textContent = '连接错误';
      break;
  }
}

// Initialize connection status
updateConnectionStatus('connecting');// ===
== USER INFORMATION PERSISTENCE SYSTEM =====

/**
 * Enhanced User Persistence Manager
 */
class UserPersistenceManager {
  constructor() {
    this.storageKey = 'userSettings';
    this.backupKey = 'userSettingsBackup';
    this.version = '1.0';
    this.maxBackups = 5;
    
    this.init();
  }

  /**
   * Initialize persistence manager
   */
  init() {
    this.migrateOldData();
    this.setupAutoSave();
    this.loadAndApplySettings();
  }

  /**
   * Save user settings with backup
   * @param {Object} settings - User settings
   */
  saveSettings(settings) {
    try {
      const settingsData = {
        ...settings,
        version: this.version,
        savedAt: Date.now(),
        id: this.generateSettingsId()
      };

      // Create backup before saving
      this.createBackup();

      // Save main settings
      localStorage.setItem(this.storageKey, JSON.stringify(settingsData));

      // Trigger save event
      this.triggerSaveEvent(settingsData);

      console.log('User settings saved successfully');
      return true;

    } catch (error) {
      console.error('Failed to save user settings:', error);
      this.handleSaveError(error);
      return false;
    }
  }

  /**
   * Load user settings
   * @returns {Object|null} User settings or null
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (!saved) return null;

      const settings = JSON.parse(saved);
      
      // Validate settings structure
      if (!this.validateSettings(settings)) {
        console.warn('Invalid settings structure, attempting recovery');
        return this.recoverFromBackup();
      }

      return settings;

    } catch (error) {
      console.error('Failed to load user settings:', error);
      return this.recoverFromBackup();
    }
  }

  /**
   * Load and apply settings automatically
   */
  loadAndApplySettings() {
    const settings = this.loadSettings();
    if (settings && settings.username) {
      this.applySettings(settings);
    }
  }

  /**
   * Apply settings to the application
   * @param {Object} settings - Settings to apply
   */
  applySettings(settings) {
    if (!settings || !settings.username) return;

    // Update user status manager
    if (typeof userStatusManager !== 'undefined') {
      userStatusManager.setCurrentUser({
        handle: settings.username,
        avatar: {
          type: settings.avatarType || 'initial',
          value: settings.avatarValue || null
        }
      });
    }

    // Update WebSocket handle
    const handleInput = document.getElementById('input-handle');
    if (handleInput) {
      handleInput.value = settings.username;
    }

    // Update UI elements
    this.updateUIWithSettings(settings);

    console.log('User settings applied:', settings.username);
  }

  /**
   * Update UI elements with settings
   * @param {Object} settings - User settings
   */
  updateUIWithSettings(settings) {
    // Update connection status
    updateConnectionStatus('connected');

    // Update any other UI elements that depend on user settings
    const chatStatus = document.getElementById('chat-status');
    if (chatStatus && chatStatus.textContent === '请设置用户名') {
      chatStatus.textContent = '在线';
    }
  }

  /**
   * Reset settings to default
   * @param {boolean} confirm - Whether to show confirmation
   */
  resetSettings(confirm = true) {
    if (confirm && !window.confirm('确定要重置所有设置吗？这将清除您保存的用户信息。')) {
      return false;
    }

    try {
      // Create backup before reset
      this.createBackup();

      // Clear main settings
      localStorage.removeItem(this.storageKey);

      // Reset current user
      if (typeof userStatusManager !== 'undefined') {
        userStatusManager.currentUser = null;
      }

      // Clear WebSocket handle
      const handleInput = document.getElementById('input-handle');
      if (handleInput) {
        handleInput.value = '';
      }

      // Reset UI
      this.resetUI();

      // Trigger reset event
      this.triggerResetEvent();

      console.log('User settings reset successfully');
      return true;

    } catch (error) {
      console.error('Failed to reset settings:', error);
      return false;
    }
  }

  /**
   * Reset UI to default state
   */
  resetUI() {
    // Reset form if modal is open
    if (userSettingsModal && userSettingsModal.isModalOpen()) {
      const form = document.getElementById('user-settings-form');
      if (form) {
        form.reset();
        userSettingsModal.updateAvatarPreview();
        userSettingsModal.clearValidationStates();
      }
    }

    // Update connection status
    updateConnectionStatus('connecting');

    // Reset chat status
    const chatStatus = document.getElementById('chat-status');
    if (chatStatus) {
      chatStatus.textContent = '请设置用户名';
    }
  }

  /**
   * Create backup of current settings
   */
  createBackup() {
    try {
      const currentSettings = this.loadSettings();
      if (!currentSettings) return;

      const backups = this.getBackups();
      backups.unshift({
        ...currentSettings,
        backedUpAt: Date.now()
      });

      // Keep only the most recent backups
      const trimmedBackups = backups.slice(0, this.maxBackups);
      
      localStorage.setItem(this.backupKey, JSON.stringify(trimmedBackups));

    } catch (error) {
      console.warn('Failed to create settings backup:', error);
    }
  }

  /**
   * Get all backups
   * @returns {Array} Array of backup settings
   */
  getBackups() {
    try {
      const saved = localStorage.getItem(this.backupKey);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.warn('Failed to load backups:', error);
      return [];
    }
  }

  /**
   * Recover settings from backup
   * @returns {Object|null} Recovered settings or null
   */
  recoverFromBackup() {
    try {
      const backups = this.getBackups();
      if (backups.length === 0) return null;

      const latestBackup = backups[0];
      console.log('Recovering settings from backup');
      
      // Restore from backup
      this.saveSettings(latestBackup);
      
      return latestBackup;

    } catch (error) {
      console.error('Failed to recover from backup:', error);
      return null;
    }
  }

  /**
   * Validate settings structure
   * @param {Object} settings - Settings to validate
   * @returns {boolean} True if valid
   */
  validateSettings(settings) {
    if (!settings || typeof settings !== 'object') return false;
    
    // Required fields
    if (!settings.username || typeof settings.username !== 'string') return false;
    
    // Optional but typed fields
    if (settings.avatarType && !['initial', 'preset', 'custom'].includes(settings.avatarType)) return false;
    if (settings.savedAt && typeof settings.savedAt !== 'number') return false;
    
    return true;
  }

  /**
   * Generate unique settings ID
   * @returns {string} Unique ID
   */
  generateSettingsId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Setup automatic saving
   */
  setupAutoSave() {
    // Auto-save when page is about to unload
    window.addEventListener('beforeunload', () => {
      if (userStatusManager && userStatusManager.currentUser) {
        const currentSettings = {
          username: userStatusManager.currentUser.handle,
          avatarType: userStatusManager.currentUser.avatar?.type || 'initial',
          avatarValue: userStatusManager.currentUser.avatar?.value || null
        };
        this.saveSettings(currentSettings);
      }
    });

    // Auto-save periodically (every 5 minutes)
    setInterval(() => {
      this.autoSave();
    }, 5 * 60 * 1000);
  }

  /**
   * Automatic save of current state
   */
  autoSave() {
    if (userStatusManager && userStatusManager.currentUser) {
      const currentSettings = {
        username: userStatusManager.currentUser.handle,
        avatarType: userStatusManager.currentUser.avatar?.type || 'initial',
        avatarValue: userStatusManager.currentUser.avatar?.value || null
      };
      
      // Only save if settings have changed
      const existingSettings = this.loadSettings();
      if (!this.settingsEqual(currentSettings, existingSettings)) {
        this.saveSettings(currentSettings);
        console.log('Auto-saved user settings');
      }
    }
  }

  /**
   * Compare two settings objects
   * @param {Object} settings1 - First settings
   * @param {Object} settings2 - Second settings
   * @returns {boolean} True if equal
   */
  settingsEqual(settings1, settings2) {
    if (!settings1 || !settings2) return false;
    
    return settings1.username === settings2.username &&
           settings1.avatarType === settings2.avatarType &&
           settings1.avatarValue === settings2.avatarValue;
  }

  /**
   * Migrate old data format
   */
  migrateOldData() {
    try {
      // Check for old userAvatarConfig format
      const oldConfig = localStorage.getItem('userAvatarConfig');
      if (oldConfig) {
        const parsed = JSON.parse(oldConfig);
        if (parsed.username) {
          const newSettings = {
            username: parsed.username,
            avatarType: parsed.type || 'initial',
            avatarValue: parsed.value || null
          };
          
          this.saveSettings(newSettings);
          localStorage.removeItem('userAvatarConfig');
          console.log('Migrated old user settings');
        }
      }
    } catch (error) {
      console.warn('Failed to migrate old data:', error);
    }
  }

  /**
   * Handle save errors
   * @param {Error} error - Save error
   */
  handleSaveError(error) {
    if (error.name === 'QuotaExceededError') {
      // Storage quota exceeded, try to clean up
      this.cleanupStorage();
    }
  }

  /**
   * Clean up storage space
   */
  cleanupStorage() {
    try {
      // Remove old backups
      const backups = this.getBackups();
      const reducedBackups = backups.slice(0, 2); // Keep only 2 most recent
      localStorage.setItem(this.backupKey, JSON.stringify(reducedBackups));
      
      console.log('Cleaned up storage space');
    } catch (error) {
      console.warn('Failed to cleanup storage:', error);
    }
  }

  /**
   * Trigger save event
   * @param {Object} settings - Saved settings
   */
  triggerSaveEvent(settings) {
    const event = new CustomEvent('userSettingsSaved', {
      detail: { settings }
    });
    document.dispatchEvent(event);
  }

  /**
   * Trigger reset event
   */
  triggerResetEvent() {
    const event = new CustomEvent('userSettingsReset');
    document.dispatchEvent(event);
  }

  /**
   * Export settings for backup
   * @returns {string} JSON string of settings
   */
  exportSettings() {
    const settings = this.loadSettings();
    const backups = this.getBackups();
    
    const exportData = {
      current: settings,
      backups: backups,
      exportedAt: Date.now(),
      version: this.version
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import settings from backup
   * @param {string} jsonData - JSON string of settings
   * @returns {boolean} True if successful
   */
  importSettings(jsonData) {
    try {
      const importData = JSON.parse(jsonData);
      
      if (importData.current && this.validateSettings(importData.current)) {
        this.saveSettings(importData.current);
        this.applySettings(importData.current);
        
        // Restore backups if available
        if (importData.backups && Array.isArray(importData.backups)) {
          localStorage.setItem(this.backupKey, JSON.stringify(importData.backups));
        }
        
        console.log('Settings imported successfully');
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }

  /**
   * Get storage usage information
   * @returns {Object} Storage usage info
   */
  getStorageInfo() {
    try {
      const settings = localStorage.getItem(this.storageKey);
      const backups = localStorage.getItem(this.backupKey);
      
      return {
        settingsSize: settings ? settings.length : 0,
        backupsSize: backups ? backups.length : 0,
        totalSize: (settings ? settings.length : 0) + (backups ? backups.length : 0),
        backupCount: this.getBackups().length
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

// Initialize persistence manager
const userPersistenceManager = new UserPersistenceManager();

// ===== INTEGRATION WITH SETTINGS MODAL =====

// Enhance the settings modal with persistence features
if (typeof UserSettingsModal !== 'undefined') {
  const originalSaveSettings = UserSettingsModal.prototype.saveSettings;
  
  UserSettingsModal.prototype.saveSettings = async function() {
    if (!this.validateForm()) {
      return;
    }

    const saveButton = this.form.querySelector('button[type="submit"]');
    const originalText = saveButton.textContent;

    try {
      // Show loading state
      saveButton.classList.add('loading');
      saveButton.disabled = true;

      // Get form data
      const formData = this.getFormData();

      // Save using both the modal's method and persistence manager
      const modalSaveSuccess = this.saveUserConfig(formData);
      const persistenceSuccess = userPersistenceManager.saveSettings(formData);
      
      if (modalSaveSuccess && persistenceSuccess) {
        // Apply settings
        userPersistenceManager.applySettings(formData);

        // Show success feedback
        this.showSuccessMessage();

        // Close modal after short delay
        setTimeout(() => {
          this.close();
        }, 1000);
      } else {
        throw new Error('Failed to save settings');
      }

    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showErrorMessage('保存设置失败，请重试');
    } finally {
      // Restore button state
      saveButton.classList.remove('loading');
      saveButton.disabled = false;
    }
  };

  // Add reset functionality to modal
  UserSettingsModal.prototype.resetSettings = function() {
    const success = userPersistenceManager.resetSettings(true);
    
    if (success) {
      // Reset form
      this.form.reset();
      this.updateAvatarPreview();
      this.clearValidationStates();
      
      // Show success message
      this.showSuccessMessage('设置已重置');
      
      // Close modal
      setTimeout(() => {
        this.close();
      }, 1000);
    }
  };

  // Enhanced load current settings
  UserSettingsModal.prototype.loadCurrentSettings = function() {
    const settings = userPersistenceManager.loadSettings();
    
    if (settings) {
      const nameInput = document.getElementById('user-name-input');
      const avatarSelect = document.getElementById('user-avatar-select');
      const customEmojiInput = document.getElementById('custom-emoji-input');

      if (nameInput) {
        nameInput.value = settings.username || '';
      }

      if (avatarSelect && settings.avatarType === 'preset') {
        avatarSelect.value = settings.avatarValue || 'default';
      }

      if (customEmojiInput && settings.avatarType === 'custom') {
        customEmojiInput.value = settings.avatarValue || '';
      }
    }
  };
}

// ===== EVENT LISTENERS FOR PERSISTENCE =====

// Listen for settings save events
document.addEventListener('userSettingsSaved', (event) => {
  console.log('User settings saved:', event.detail.settings);
  
  // Update any UI elements that depend on settings
  const chatTitle = document.querySelector('.chat-title');
  if (chatTitle && chatTitle.textContent === '设置用户名') {
    chatTitle.textContent = '全体成员';
  }
});

// Listen for settings reset events
document.addEventListener('userSettingsReset', () => {
  console.log('User settings reset');
  
  // Reset UI elements
  const chatTitle = document.querySelector('.chat-title');
  if (chatTitle) {
    chatTitle.textContent = '设置用户名';
  }
  
  // Show settings modal after reset
  setTimeout(() => {
    if (userSettingsModal) {
      userSettingsModal.open();
    }
  }, 500);
});

// Add reset button to modal footer (optional enhancement)
$(document).ready(function() {
  const modalFooter = document.querySelector('#user-settings-modal .modal-footer');
  if (modalFooter) {
    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'btn btn-outline-danger';
    resetButton.textContent = '重置设置';
    resetButton.title = '重置所有设置到默认值';
    
    resetButton.addEventListener('click', () => {
      if (userSettingsModal) {
        userSettingsModal.resetSettings();
      }
    });
    
    // Insert before cancel button
    const cancelButton = modalFooter.querySelector('#cancel-settings');
    if (cancelButton) {
      modalFooter.insertBefore(resetButton, cancelButton);
    }
  }
});

console.log('User persistence system initialized');
//
 ===== MOBILE INTERACTION SYSTEM =====

/**
 * Mobile interaction management system
 */
class MobileInteractionManager {
  constructor() {
    this.isMobile = window.innerWidth <= 767;
    this.isTouch = 'ontouchstart' in window;
    this.sidebarOpen = false;
    this.swipeThreshold = 50;
    this.longPressTimeout = null;
    this.longPressDuration = 500;
    this.keyboardOpen = false;
    this.originalViewportHeight = window.innerHeight;
    
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchCurrentX = 0;
    this.touchCurrentY = 0;
    this.isSwiping = false;
    this.swipeDirection = null;
    
    this.initializeMobileInteractions();
  }

  /**
   * Initialize mobile interaction system
   */
  initializeMobileInteractions() {
    // Listen for window resize to detect mobile/desktop changes
    window.addEventListener('resize', () => {
      this.handleResize();
    });

    // Initialize touch gestures
    if (this.isTouch) {
      this.initializeTouchGestures();
    }

    // Initialize virtual keyboard handling
    this.initializeVirtualKeyboard();

    // Initialize mobile navigation
    this.initializeMobileNavigation();

    // Initialize haptic feedback
    this.initializeHapticFeedback();

    // Initialize pull-to-refresh
    this.initializePullToRefresh();

    // Add mobile-specific event listeners
    this.addMobileEventListeners();
  }

  /**
   * Handle window resize
   */
  handleResize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 767;
    
    // If switching between mobile and desktop
    if (wasMobile !== this.isMobile) {
      this.handleLayoutChange();
    }
    
    // Handle virtual keyboard
    this.handleVirtualKeyboardResize();
  }

  /**
   * Handle layout change between mobile and desktop
   */
  handleLayoutChange() {
    const sidebar = document.querySelector('.sidebar');
    const chatArea = document.querySelector('.chat-area');
    const overlay = document.querySelector('.mobile-overlay');
    
    if (this.isMobile) {
      // Switch to mobile layout
      if (sidebar) {
        sidebar.classList.remove('mobile-open');
      }
      if (chatArea) {
        chatArea.classList.remove('sidebar-overlay');
      }
      this.sidebarOpen = false;
    } else {
      // Switch to desktop layout
      if (overlay) {
        overlay.classList.remove('active');
      }
      if (sidebar) {
        sidebar.classList.remove('mobile-open');
      }
      if (chatArea) {
        chatArea.classList.remove('sidebar-overlay');
      }
    }
  }

  /**
   * Initialize touch gesture handling
   */
  initializeTouchGestures() {
    const chatContainer = document.querySelector('.chat-container');
    if (!chatContainer) return;

    // Add touch event listeners
    chatContainer.addEventListener('touchstart', (e) => {
      this.handleTouchStart(e);
    }, { passive: false });

    chatContainer.addEventListener('touchmove', (e) => {
      this.handleTouchMove(e);
    }, { passive: false });

    chatContainer.addEventListener('touchend', (e) => {
      this.handleTouchEnd(e);
    }, { passive: false });

    // Add long press support
    this.initializeLongPress();
  }

  /**
   * Handle touch start
   * @param {TouchEvent} e - Touch event
   */
  handleTouchStart(e) {
    if (!this.isMobile) return;

    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchCurrentX = touch.clientX;
    this.touchCurrentY = touch.clientY;
    this.isSwiping = false;
    this.swipeDirection = null;
  }

  /**
   * Handle touch move
   * @param {TouchEvent} e - Touch event
   */
  handleTouchMove(e) {
    if (!this.isMobile) return;

    const touch = e.touches[0];
    this.touchCurrentX = touch.clientX;
    this.touchCurrentY = touch.clientY;

    const deltaX = this.touchCurrentX - this.touchStartX;
    const deltaY = this.touchCurrentY - this.touchStartY;

    // Determine if this is a horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      this.isSwiping = true;
      this.swipeDirection = deltaX > 0 ? 'right' : 'left';

      // Handle sidebar swipe
      if (this.touchStartX < 50 && deltaX > 0) {
        // Swipe right from left edge - open sidebar
        this.handleSidebarSwipe(deltaX);
        e.preventDefault();
      } else if (this.sidebarOpen && deltaX < 0) {
        // Swipe left when sidebar is open - close sidebar
        this.handleSidebarSwipe(deltaX);
        e.preventDefault();
      }
    }
  }

  /**
   * Handle touch end
   * @param {TouchEvent} e - Touch event
   */
  handleTouchEnd(e) {
    if (!this.isMobile || !this.isSwiping) return;

    const deltaX = this.touchCurrentX - this.touchStartX;
    const deltaY = this.touchCurrentY - this.touchStartY;

    // Check if swipe threshold is met
    if (Math.abs(deltaX) > this.swipeThreshold) {
      if (this.swipeDirection === 'right' && this.touchStartX < 50) {
        // Open sidebar
        this.openSidebar();
      } else if (this.swipeDirection === 'left' && this.sidebarOpen) {
        // Close sidebar
        this.closeSidebar();
      }
    }

    // Reset swipe state
    this.isSwiping = false;
    this.swipeDirection = null;
  }

  /**
   * Handle sidebar swipe animation
   * @param {number} deltaX - Horizontal delta
   */
  handleSidebarSwipe(deltaX) {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    const maxDelta = 280; // Sidebar width
    let translateX;

    if (this.sidebarOpen) {
      // Sidebar is open, swiping left to close
      translateX = Math.max(-maxDelta, deltaX - maxDelta);
    } else {
      // Sidebar is closed, swiping right to open
      translateX = Math.min(0, deltaX - maxDelta);
    }

    sidebar.style.transform = `translateX(${translateX}px)`;
  }

  /**
   * Open sidebar with animation
   */
  openSidebar() {
    if (!this.isMobile) return;

    const sidebar = document.querySelector('.sidebar');
    const chatArea = document.querySelector('.chat-area');
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    
    if (sidebar) {
      sidebar.classList.add('mobile-open');
      sidebar.style.transform = '';
    }
    
    if (chatArea) {
      chatArea.classList.add('sidebar-overlay');
    }
    
    if (mobileToggle) {
      mobileToggle.setAttribute('aria-expanded', 'true');
    }

    // Create and show overlay
    this.showMobileOverlay();
    
    this.sidebarOpen = true;
    
    // Show swipe indicator
    this.showSwipeIndicator('向左滑动关闭');
  }

  /**
   * Close sidebar with animation
   */
  closeSidebar() {
    if (!this.isMobile) return;

    const sidebar = document.querySelector('.sidebar');
    const chatArea = document.querySelector('.chat-area');
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    
    if (sidebar) {
      sidebar.classList.remove('mobile-open');
      sidebar.style.transform = '';
    }
    
    if (chatArea) {
      chatArea.classList.remove('sidebar-overlay');
    }
    
    if (mobileToggle) {
      mobileToggle.setAttribute('aria-expanded', 'false');
    }

    // Hide overlay
    this.hideMobileOverlay();
    
    this.sidebarOpen = false;
    
    // Hide swipe indicator
    this.hideSwipeIndicator();
  }

  /**
   * Show mobile overlay
   */
  showMobileOverlay() {
    let overlay = document.querySelector('.mobile-overlay');
    
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'mobile-overlay';
      overlay.addEventListener('click', () => {
        this.closeSidebar();
      });
      document.body.appendChild(overlay);
    }
    
    overlay.classList.add('active');
  }

  /**
   * Hide mobile overlay
   */
  hideMobileOverlay() {
    const overlay = document.querySelector('.mobile-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  /**
   * Initialize mobile navigation
   */
  initializeMobileNavigation() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => {
        if (this.sidebarOpen) {
          this.closeSidebar();
        } else {
          this.openSidebar();
        }
      });
    }
  }

  /**
   * Initialize virtual keyboard handling
   */
  initializeVirtualKeyboard() {
    if (!this.isMobile) return;

    const messageInput = document.querySelector('.message-input');
    if (!messageInput) return;

    // Listen for input focus/blur
    messageInput.addEventListener('focus', () => {
      this.handleKeyboardOpen();
    });

    messageInput.addEventListener('blur', () => {
      this.handleKeyboardClose();
    });

    // Listen for viewport changes (keyboard open/close)
    window.addEventListener('resize', () => {
      this.handleVirtualKeyboardResize();
    });
  }

  /**
   * Handle virtual keyboard resize
   */
  handleVirtualKeyboardResize() {
    if (!this.isMobile) return;

    const currentHeight = window.innerHeight;
    const heightDifference = this.originalViewportHeight - currentHeight;
    
    // If height decreased significantly, keyboard is likely open
    if (heightDifference > 150) {
      if (!this.keyboardOpen) {
        this.handleKeyboardOpen();
      }
    } else {
      if (this.keyboardOpen) {
        this.handleKeyboardClose();
      }
    }
  }

  /**
   * Handle virtual keyboard open
   */
  handleKeyboardOpen() {
    this.keyboardOpen = true;
    document.body.classList.add('keyboard-open');
    
    // Scroll to bottom of messages
    setTimeout(() => {
      const messagesContainer = document.querySelector('.messages-container');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 300);
  }

  /**
   * Handle virtual keyboard close
   */
  handleKeyboardClose() {
    this.keyboardOpen = false;
    document.body.classList.remove('keyboard-open');
  }

  /**
   * Initialize long press functionality
   */
  initializeLongPress() {
    document.addEventListener('touchstart', (e) => {
      const target = e.target.closest('.contact-item, .message-bubble');
      if (target) {
        this.startLongPress(target, e);
      }
    });

    document.addEventListener('touchend', () => {
      this.endLongPress();
    });

    document.addEventListener('touchmove', () => {
      this.endLongPress();
    });
  }

  /**
   * Start long press timer
   * @param {HTMLElement} element - Target element
   * @param {TouchEvent} e - Touch event
   */
  startLongPress(element, e) {
    this.endLongPress(); // Clear any existing timer
    
    this.longPressTimeout = setTimeout(() => {
      this.handleLongPress(element, e);
    }, this.longPressDuration);
  }

  /**
   * End long press timer
   */
  endLongPress() {
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout);
      this.longPressTimeout = null;
    }
    
    // Remove long press visual feedback
    document.querySelectorAll('.long-press-active').forEach(el => {
      el.classList.remove('long-press-active');
    });
  }

  /**
   * Handle long press action
   * @param {HTMLElement} element - Target element
   * @param {TouchEvent} e - Touch event
   */
  handleLongPress(element, e) {
    // Add visual feedback
    element.classList.add('long-press-active');
    
    // Trigger haptic feedback
    this.triggerHapticFeedback('medium');
    
    // Handle different element types
    if (element.classList.contains('contact-item')) {
      this.handleContactLongPress(element);
    } else if (element.classList.contains('message-bubble')) {
      this.handleMessageLongPress(element);
    }
  }

  /**
   * Handle contact item long press
   * @param {HTMLElement} element - Contact element
   */
  handleContactLongPress(element) {
    // Could show context menu for contact actions
    console.log('Contact long press:', element);
  }

  /**
   * Handle message bubble long press
   * @param {HTMLElement} element - Message element
   */
  handleMessageLongPress(element) {
    // Could show context menu for message actions
    console.log('Message long press:', element);
  }

  /**
   * Initialize haptic feedback
   */
  initializeHapticFeedback() {
    // Check if haptic feedback is supported
    this.hapticSupported = 'vibrate' in navigator;
  }

  /**
   * Trigger haptic feedback
   * @param {string} type - Feedback type ('light', 'medium', 'heavy')
   */
  triggerHapticFeedback(type = 'light') {
    if (!this.hapticSupported || !this.isMobile) return;

    const patterns = {
      'light': [10],
      'medium': [20],
      'heavy': [30]
    };

    const pattern = patterns[type] || patterns['light'];
    navigator.vibrate(pattern);
  }

  /**
   * Initialize pull-to-refresh
   */
  initializePullToRefresh() {
    if (!this.isMobile) return;

    const messagesContainer = document.querySelector('.messages-container');
    if (!messagesContainer) return;

    let pullDistance = 0;
    let isPulling = false;
    let pullIndicator = null;

    messagesContainer.addEventListener('touchstart', (e) => {
      if (messagesContainer.scrollTop === 0) {
        isPulling = true;
        pullDistance = 0;
      }
    });

    messagesContainer.addEventListener('touchmove', (e) => {
      if (!isPulling) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - this.touchStartY;

      if (deltaY > 0 && messagesContainer.scrollTop === 0) {
        pullDistance = Math.min(deltaY, 100);
        
        if (!pullIndicator) {
          pullIndicator = this.createPullIndicator();
          messagesContainer.appendChild(pullIndicator);
        }

        if (pullDistance > 60) {
          pullIndicator.classList.add('visible');
          pullIndicator.innerHTML = '↻';
        } else {
          pullIndicator.classList.remove('visible');
          pullIndicator.innerHTML = '↓';
        }

        e.preventDefault();
      }
    });

    messagesContainer.addEventListener('touchend', () => {
      if (isPulling && pullDistance > 60) {
        this.handlePullToRefresh();
      }
      
      isPulling = false;
      pullDistance = 0;
      
      if (pullIndicator) {
        pullIndicator.remove();
        pullIndicator = null;
      }
    });
  }

  /**
   * Create pull-to-refresh indicator
   * @returns {HTMLElement} Pull indicator element
   */
  createPullIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'pull-to-refresh';
    indicator.innerHTML = '↓';
    return indicator;
  }

  /**
   * Handle pull-to-refresh action
   */
  handlePullToRefresh() {
    // Trigger haptic feedback
    this.triggerHapticFeedback('medium');
    
    // Could refresh messages or connection
    console.log('Pull to refresh triggered');
    
    // Show loading state briefly
    const indicator = document.querySelector('.pull-to-refresh');
    if (indicator) {
      indicator.classList.add('loading');
      setTimeout(() => {
        indicator.remove();
      }, 1000);
    }
  }

  /**
   * Show swipe indicator
   * @param {string} text - Indicator text
   */
  showSwipeIndicator(text) {
    let indicator = document.querySelector('.swipe-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'swipe-indicator';
      document.body.appendChild(indicator);
    }
    
    indicator.textContent = text;
    indicator.classList.add('visible');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.hideSwipeIndicator();
    }, 3000);
  }

  /**
   * Hide swipe indicator
   */
  hideSwipeIndicator() {
    const indicator = document.querySelector('.swipe-indicator');
    if (indicator) {
      indicator.classList.remove('visible');
    }
  }

  /**
   * Add mobile-specific event listeners
   */
  addMobileEventListeners() {
    // Add touch feedback to interactive elements
    document.querySelectorAll('.contact-item, .send-button, .btn').forEach(element => {
      element.classList.add('touch-feedback');
    });

    // Handle contact item touches
    document.addEventListener('touchstart', (e) => {
      const contactItem = e.target.closest('.contact-item');
      if (contactItem && this.isMobile) {
        this.triggerHapticFeedback('light');
      }
    });

    // Handle button touches
    document.addEventListener('touchstart', (e) => {
      const button = e.target.closest('.send-button, .btn');
      if (button && this.isMobile) {
        this.triggerHapticFeedback('light');
      }
    });
  }

  /**
   * Toggle sidebar (public method)
   */
  toggleSidebar() {
    if (this.sidebarOpen) {
      this.closeSidebar();
    } else {
      this.openSidebar();
    }
  }

  /**
   * Check if device is mobile
   * @returns {boolean} True if mobile
   */
  isMobileDevice() {
    return this.isMobile;
  }

  /**
   * Check if sidebar is open
   * @returns {boolean} True if sidebar is open
   */
  isSidebarOpen() {
    return this.sidebarOpen;
  }
}

// Initialize mobile interaction manager
const mobileInteractionManager = new MobileInteractionManager();

// ===== ENHANCED MOBILE EVENT HANDLERS =====

$(document).ready(function() {
  // Enhanced mobile menu toggle
  $('.mobile-menu-toggle').on('click', function() {
    mobileInteractionManager.toggleSidebar();
  });
  
  // Close sidebar when clicking on chat area (mobile only)
  $('.chat-area').on('click', function(e) {
    if (mobileInteractionManager.isMobileDevice() && 
        mobileInteractionManager.isSidebarOpen() && 
        !$(e.target).closest('.sidebar').length) {
      mobileInteractionManager.closeSidebar();
    }
  });
  
  // Enhanced contact item interactions for mobile
  $(document).on('touchstart', '.contact-item', function() {
    if (mobileInteractionManager.isMobileDevice()) {
      $(this).addClass('touch-feedback');
    }
  });
  
  $(document).on('touchend', '.contact-item', function() {
    if (mobileInteractionManager.isMobileDevice()) {
      $(this).removeClass('touch-feedback');
    }
  });
  
  // Auto-close sidebar when selecting contact on mobile
  $(document).on('click', '.contact-item', function() {
    if (mobileInteractionManager.isMobileDevice() && 
        mobileInteractionManager.isSidebarOpen()) {
      setTimeout(() => {
        mobileInteractionManager.closeSidebar();
      }, 300);
    }
  });
  
  // Enhanced message input for mobile
  $('#message-input').on('focus', function() {
    if (mobileInteractionManager.isMobileDevice()) {
      // Scroll to input after keyboard opens
      setTimeout(() => {
        this.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  });
  
  // Prevent zoom on input focus (iOS)
  if (mobileInteractionManager.isMobileDevice()) {
    $('input, textarea, select').attr('autocomplete', 'off');
  }
});

// ===== MOBILE-SPECIFIC UTILITY FUNCTIONS =====

/**
 * Add touch feedback to element
 * @param {HTMLElement} element - Element to add feedback to
 */
function addTouchFeedback(element) {
  if (!element || !mobileInteractionManager.isMobileDevice()) return;
  
  element.classList.add('touch-feedback');
  
  element.addEventListener('touchstart', () => {
    mobileInteractionManager.triggerHapticFeedback('light');
  });
}

/**
 * Remove touch feedback from element
 * @param {HTMLElement} element - Element to remove feedback from
 */
function removeTouchFeedback(element) {
  if (!element) return;
  
  element.classList.remove('touch-feedback');
}

/**
 * Check if device supports haptic feedback
 * @returns {boolean} True if haptic feedback is supported
 */
function supportsHapticFeedback() {
  return 'vibrate' in navigator && mobileInteractionManager.isMobileDevice();
}

/**
 * Trigger haptic feedback
 * @param {string} type - Feedback type
 */
function triggerHaptic(type = 'light') {
  mobileInteractionManager.triggerHapticFeedback(type);
}

/**
 * Show mobile notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 */
function showMobileNotification(message, type = 'info') {
  if (!mobileInteractionManager.isMobileDevice()) return;
  
  const notification = document.createElement('div');
  notification.className = `mobile-notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    right: 20px;
    background: var(--primary-color);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    z-index: 9999;
    text-align: center;
    transform: translateY(-100px);
    transition: transform 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  requestAnimationFrame(() => {
    notification.style.transform = 'translateY(0)';
  });
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.style.transform = 'translateY(-100px)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}
// ===
== EVENT-DRIVEN COMPONENT COMMUNICATION =====

/**
 * Component communication manager for event-driven architecture
 */
class ComponentCommunicationManager {
  constructor(chatState) {
    this.chatState = chatState;
    this.components = new Map();
    this.eventBus = new EventTarget();
    
    this.setupChatStateListeners();
    this.setupGlobalEventListeners();
  }

  /**
   * Register a component for communication
   * @param {string} name - Component name
   * @param {Object} component - Component instance
   */
  registerComponent(name, component) {
    this.components.set(name, component);
    
    // If component has an init method, call it
    if (typeof component.init === 'function') {
      component.init(this.chatState, this.eventBus);
    }
    
    console.log(`Component registered: ${name}`);
  }

  /**
   * Unregister a component
   * @param {string} name - Component name
   */
  unregisterComponent(name) {
    const component = this.components.get(name);
    if (component && typeof component.destroy === 'function') {
      component.destroy();
    }
    this.components.delete(name);
    console.log(`Component unregistered: ${name}`);
  }

  /**
   * Get a registered component
   * @param {string} name - Component name
   * @returns {Object|null} Component instance
   */
  getComponent(name) {
    return this.components.get(name) || null;
  }

  /**
   * Broadcast event to all components
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   */
  broadcast(eventType, data) {
    const event = new CustomEvent(eventType, { detail: data });
    this.eventBus.dispatchEvent(event);
  }

  /**
   * Setup listeners for chat state changes
   */
  setupChatStateListeners() {
    // User management events
    this.chatState.on('userAdded', (user) => {
      this.broadcast('user:added', user);
    });

    this.chatState.on('userRemoved', (user) => {
      this.broadcast('user:removed', user);
    });

    this.chatState.on('userUpdated', (user) => {
      this.broadcast('user:updated', user);
    });

    this.chatState.on('currentUserChanged', (user) => {
      this.broadcast('user:currentChanged', user);
    });

    // Message events
    this.chatState.on('messageAdded', (message) => {
      this.broadcast('message:added', message);
    });

    this.chatState.on('messageUpdated', (message) => {
      this.broadcast('message:updated', message);
    });

    // Connection events
    this.chatState.on('connectionStatusChanged', (status) => {
      this.broadcast('connection:statusChanged', status);
    });

    // State events
    this.chatState.on('stateCleared', () => {
      this.broadcast('state:cleared');
    });
  }

  /**
   * Setup global event listeners
   */
  setupGlobalEventListeners() {
    // Window events
    window.addEventListener('beforeunload', () => {
      this.broadcast('app:beforeUnload');
    });

    window.addEventListener('online', () => {
      this.broadcast('connection:online');
    });

    window.addEventListener('offline', () => {
      this.broadcast('connection:offline');
    });

    // Visibility change events
    document.addEventListener('visibilitychange', () => {
      const isVisible = !document.hidden;
      this.broadcast('app:visibilityChanged', { isVisible });
    });

    // Storage events (for multi-tab communication)
    window.addEventListener('storage', (event) => {
      if (event.key === 'chatState') {
        this.broadcast('storage:stateChanged', event);
      }
    });
  }

  /**
   * Add event listener to the event bus
   * @param {string} eventType - Event type
   * @param {Function} callback - Event callback
   */
  addEventListener(eventType, callback) {
    this.eventBus.addEventListener(eventType, callback);
  }

  /**
   * Remove event listener from the event bus
   * @param {string} eventType - Event type
   * @param {Function} callback - Event callback
   */
  removeEventListener(eventType, callback) {
    this.eventBus.removeEventListener(eventType, callback);
  }

  /**
   * Get all registered components
   * @returns {Array} Array of component names
   */
  getRegisteredComponents() {
    return Array.from(this.components.keys());
  }
}

// ===== INITIALIZE COMPONENT COMMUNICATION =====

// Initialize component communication manager
const componentCommunicationManager = new ComponentCommunicationManager(chatState);

// Register core components
componentCommunicationManager.registerComponent('messageRouter', messageRouter);
componentCommunicationManager.registerComponent('avatarGenerator', avatarGenerator);
componentCommunicationManager.registerComponent('connectionStatusManager', connectionStatusManager);
componentCommunicationManager.registerComponent('webSocketManager', webSocketManager);

// Initialize message performance manager if available
if (typeof MessagePerformanceManager !== 'undefined') {
  const messagePerformanceManager = new MessagePerformanceManager();
  componentCommunicationManager.registerComponent('messagePerformanceManager', messagePerformanceManager);
}

// Initialize message sending manager if available
if (typeof MessageSendingManager !== 'undefined') {
  const messageSendingManager = new MessageSendingManager();
  componentCommunicationManager.registerComponent('messageSendingManager', messageSendingManager);
}

// ===== GLOBAL APPLICATION STATE =====

// Make core components globally available for backward compatibility
window.chatApp = {
  chatState,
  messageRouter,
  avatarGenerator,
  connectionStatusManager,
  webSocketManager,
  componentCommunicationManager,
  
  // Utility methods
  sendMessage: (handle, text) => webSocketManager.sendChatMessage(handle, text),
  sendTyping: (handle, isTyping) => webSocketManager.sendTypingIndicator(handle, isTyping),
  setCurrentUser: (user) => chatState.setCurrentUser(user),
  getUsers: () => chatState.getOnlineUsers(),
  getMessages: () => chatState.getMessages(),
  
  // Message routing methods
  registerMessageHandler: (type, handler) => messageRouter.registerHandler(type, handler),
  addMessageFilter: (filter) => messageRouter.addFilter(filter),
  addMessageMiddleware: (middleware) => messageRouter.addMiddleware(middleware),
  
  // Event methods
  on: (event, callback) => componentCommunicationManager.addEventListener(event, callback),
  off: (event, callback) => componentCommunicationManager.removeEventListener(event, callback),
  emit: (event, data) => componentCommunicationManager.broadcast(event, data)
};

// Load saved state on initialization
chatState.loadFromStorage();

// Save state periodically
setInterval(() => {
  chatState.saveToStorage();
}, 30000); // Save every 30 seconds

// Save state before page unload
window.addEventListener('beforeunload', () => {
  chatState.saveToStorage();
});

console.log('Modern chat application architecture initialized');
console.log('Available components:', componentCommunicationManager.getRegisteredComponents());// ====
= USER INTERFACE INTERACTION LOGIC =====

/**
 * UI interaction manager for handling user interface events and updates
 */
class UIInteractionManager {
  constructor(chatState, componentCommunicationManager) {
    this.chatState = chatState;
    this.communicationManager = componentCommunicationManager;
    this.selectedContactId = null;
    this.isTyping = false;
    this.typingTimeout = null;
    this.lastMessageTime = 0;
    
    this.setupEventListeners();
    this.setupUIEventHandlers();
    this.initializeUI();
  }

  /**
   * Initialize UI components and state
   */
  initializeUI() {
    this.updateContactList();
    this.updateMessageArea();
    this.updateConnectionStatus();
    this.setupMessageInput();
    this.setupContactSelection();
  }

  /**
   * Setup event listeners for chat state changes
   */
  setupEventListeners() {
    // User events
    this.chatState.on('userAdded', (user) => {
      this.addContactToUI(user);
      this.updateOnlineCount();
    });

    this.chatState.on('userRemoved', (user) => {
      this.removeContactFromUI(user);
      this.updateOnlineCount();
    });

    this.chatState.on('userUpdated', (user) => {
      this.updateContactInUI(user);
    });

    this.chatState.on('currentUserChanged', (user) => {
      this.updateCurrentUserUI(user);
    });

    // Message events
    this.chatState.on('messageAdded', (message) => {
      this.addMessageToUI(message);
      this.updateLastMessageTime();
    });

    this.chatState.on('messageUpdated', (message) => {
      this.updateMessageInUI(message);
    });

    // Connection events
    this.chatState.on('connectionStatusChanged', (status) => {
      this.updateConnectionStatusUI(status);
    });

    // Typing events
    this.communicationManager.addEventListener('user:typingChanged', (event) => {
      this.updateTypingIndicator(event.detail.user, event.detail.isTyping);
    });
  }

  /**
   * Setup UI event handlers for DOM elements
   */
  setupUIEventHandlers() {
    // Message input handling
    const messageInput = document.getElementById('message-input') || document.getElementById('input-text');
    if (messageInput) {
      messageInput.addEventListener('input', this.handleMessageInput.bind(this));
      messageInput.addEventListener('keydown', this.handleMessageKeydown.bind(this));
      messageInput.addEventListener('focus', this.handleMessageInputFocus.bind(this));
      messageInput.addEventListener('blur', this.handleMessageInputBlur.bind(this));
    }

    // Send button handling
    const sendButton = document.getElementById('send-button') || document.querySelector('button[type="submit"]');
    if (sendButton) {
      sendButton.addEventListener('click', this.handleSendMessage.bind(this));
    }

    // Form submission handling
    const messageForm = document.getElementById('input-form') || document.getElementById('message-form');
    if (messageForm) {
      messageForm.addEventListener('submit', this.handleFormSubmit.bind(this));
    }

    // Contact list handling
    const contactList = document.getElementById('contact-list') || document.querySelector('.contact-list');
    if (contactList) {
      contactList.addEventListener('click', this.handleContactClick.bind(this));
    }

    // Settings button handling
    const settingsButton = document.getElementById('settings-button');
    if (settingsButton) {
      settingsButton.addEventListener('click', this.handleSettingsClick.bind(this));
    }

    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    if (mobileMenuToggle) {
      mobileMenuToggle.addEventListener('click', this.handleMobileMenuToggle.bind(this));
    }
  }

  /**
   * Handle message input events
   * @param {Event} event - Input event
   */
  handleMessageInput(event) {
    const input = event.target;
    const text = input.value.trim();

    // Auto-resize textarea
    this.autoResizeTextarea(input);

    // Handle typing indicator
    if (text.length > 0 && !this.isTyping) {
      this.startTyping();
    } else if (text.length === 0 && this.isTyping) {
      this.stopTyping();
    }

    // Reset typing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    if (text.length > 0) {
      this.typingTimeout = setTimeout(() => {
        this.stopTyping();
      }, 3000); // Stop typing indicator after 3 seconds of inactivity
    }
  }

  /**
   * Handle message input keydown events
   * @param {Event} event - Keydown event
   */
  handleMessageKeydown(event) {
    // Send message on Enter (without Shift)
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendCurrentMessage();
    }

    // Handle other keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'k':
          event.preventDefault();
          this.focusContactSearch();
          break;
        case '/':
          event.preventDefault();
          this.showCommandPalette();
          break;
      }
    }
  }

  /**
   * Handle message input focus
   * @param {Event} event - Focus event
   */
  handleMessageInputFocus(event) {
    // Mark messages as read when input is focused
    this.markMessagesAsRead();
    
    // Update UI to show focused state
    const inputContainer = event.target.closest('.message-input-container');
    if (inputContainer) {
      inputContainer.classList.add('focused');
    }
  }

  /**
   * Handle message input blur
   * @param {Event} event - Blur event
   */
  handleMessageInputBlur(event) {
    // Stop typing indicator when input loses focus
    this.stopTyping();
    
    // Update UI to remove focused state
    const inputContainer = event.target.closest('.message-input-container');
    if (inputContainer) {
      inputContainer.classList.remove('focused');
    }
  }

  /**
   * Handle send message button click
   * @param {Event} event - Click event
   */
  handleSendMessage(event) {
    event.preventDefault();
    this.sendCurrentMessage();
  }

  /**
   * Handle form submission
   * @param {Event} event - Submit event
   */
  handleFormSubmit(event) {
    event.preventDefault();
    this.sendCurrentMessage();
  }

  /**
   * Handle contact click for selection
   * @param {Event} event - Click event
   */
  handleContactClick(event) {
    const contactElement = event.target.closest('.contact-item');
    if (contactElement) {
      const userId = contactElement.getAttribute('data-user-id');
      this.selectContact(userId);
    }
  }

  /**
   * Handle settings button click
   * @param {Event} event - Click event
   */
  handleSettingsClick(event) {
    event.preventDefault();
    this.showUserSettings();
  }

  /**
   * Handle mobile menu toggle
   * @param {Event} event - Click event
   */
  handleMobileMenuToggle(event) {
    event.preventDefault();
    this.toggleMobileMenu();
  }

  /**
   * Send current message from input
   */
  sendCurrentMessage() {
    const messageInput = document.getElementById('message-input') || document.getElementById('input-text');
    const handleInput = document.getElementById('input-handle');
    
    if (!messageInput || !handleInput) return;

    const text = messageInput.value.trim();
    const handle = handleInput.value.trim();

    if (!text || !handle) return;

    // Stop typing indicator
    this.stopTyping();

    // Send message through WebSocket manager
    if (webSocketManager) {
      webSocketManager.sendChatMessage(handle, text)
        .then(() => {
          // Clear input on successful send
          messageInput.value = '';
          this.autoResizeTextarea(messageInput);
          
          // Focus back to input
          messageInput.focus();
        })
        .catch(error => {
          console.error('Failed to send message:', error);
          this.showErrorNotification('消息发送失败，请重试');
        });
    }
  }

  /**
   * Select a contact for chat
   * @param {string} userId - User ID to select
   */
  selectContact(userId) {
    const user = this.chatState.users.get(userId);
    if (!user) return;

    // Update selected contact
    this.selectedContactId = userId;
    this.chatState.selectedUser = user;

    // Update UI
    this.updateContactSelection();
    this.updateChatHeader(user);
    this.scrollToBottom();

    // Emit selection event
    this.chatState.emit('contactSelected', user);

    // On mobile, switch to chat view
    if (this.isMobileView()) {
      this.showChatView();
    }
  }

  /**
   * Update contact list UI
   */
  updateContactList() {
    const contactList = document.getElementById('contact-list') || document.querySelector('.contact-list');
    if (!contactList) return;

    // Clear existing contacts
    contactList.innerHTML = '';

    // Add online users
    const onlineUsers = this.chatState.getOnlineUsers();
    onlineUsers.forEach(user => {
      this.addContactToUI(user);
    });

    // Update online count
    this.updateOnlineCount();
  }

  /**
   * Add contact to UI
   * @param {User} user - User to add
   */
  addContactToUI(user) {
    const contactList = document.getElementById('contact-list') || document.querySelector('.contact-list');
    if (!contactList) return;

    // Check if contact already exists
    const existingContact = contactList.querySelector(`[data-user-id="${user.id}"]`);
    if (existingContact) {
      this.updateContactInUI(user);
      return;
    }

    // Create contact element
    const contactElement = document.createElement('div');
    contactElement.className = 'contact-item';
    contactElement.setAttribute('data-user-id', user.id);
    contactElement.setAttribute('data-handle', user.handle);

    // Generate avatar
    const avatarConfig = avatarGenerator.generateAvatar(user.handle, user.avatarType, user.avatar);
    const avatarHTML = avatarGenerator.createAvatarHTML(avatarConfig, 'md');

    contactElement.innerHTML = `
      <div class="contact-avatar">
        ${avatarHTML}
      </div>
      <div class="contact-info">
        <div class="contact-name">${this.escapeHtml(user.handle)}</div>
        <div class="contact-status ${user.isOnline ? 'online' : 'offline'}">
          ${user.isOnline ? '在线' : '离线'}
        </div>
      </div>
      <div class="contact-meta">
        <div class="contact-time">${this.formatLastSeen(user.lastActivity)}</div>
        <div class="contact-indicator"></div>
      </div>
    `;

    // Add click handler
    contactElement.addEventListener('click', () => {
      this.selectContact(user.id);
    });

    // Insert in alphabetical order
    this.insertContactInOrder(contactList, contactElement, user.handle);
  }

  /**
   * Remove contact from UI
   * @param {User} user - User to remove
   */
  removeContactFromUI(user) {
    const contactElement = document.querySelector(`[data-user-id="${user.id}"]`);
    if (contactElement) {
      contactElement.remove();
    }
  }

  /**
   * Update contact in UI
   * @param {User} user - User to update
   */
  updateContactInUI(user) {
    const contactElement = document.querySelector(`[data-user-id="${user.id}"]`);
    if (!contactElement) return;

    // Update avatar
    const avatarContainer = contactElement.querySelector('.contact-avatar');
    if (avatarContainer) {
      const avatarConfig = avatarGenerator.generateAvatar(user.handle, user.avatarType, user.avatar);
      avatarContainer.innerHTML = avatarGenerator.createAvatarHTML(avatarConfig, 'md');
    }

    // Update name
    const nameElement = contactElement.querySelector('.contact-name');
    if (nameElement) {
      nameElement.textContent = user.handle;
    }

    // Update status
    const statusElement = contactElement.querySelector('.contact-status');
    if (statusElement) {
      statusElement.className = `contact-status ${user.isOnline ? 'online' : 'offline'}`;
      statusElement.textContent = user.isOnline ? '在线' : '离线';
    }

    // Update last seen time
    const timeElement = contactElement.querySelector('.contact-time');
    if (timeElement) {
      timeElement.textContent = this.formatLastSeen(user.lastActivity);
    }
  }

  /**
   * Update contact selection UI
   */
  updateContactSelection() {
    // Remove previous selection
    const previousSelected = document.querySelector('.contact-item.selected');
    if (previousSelected) {
      previousSelected.classList.remove('selected');
    }

    // Add selection to current contact
    if (this.selectedContactId) {
      const selectedContact = document.querySelector(`[data-user-id="${this.selectedContactId}"]`);
      if (selectedContact) {
        selectedContact.classList.add('selected');
      }
    }
  }

  /**
   * Update chat header with selected user info
   * @param {User} user - Selected user
   */
  updateChatHeader(user) {
    const chatHeader = document.getElementById('chat-header') || document.querySelector('.chat-header');
    if (!chatHeader) return;

    if (user) {
      const avatarConfig = avatarGenerator.generateAvatar(user.handle, user.avatarType, user.avatar);
      const avatarHTML = avatarGenerator.createAvatarHTML(avatarConfig, 'sm');

      chatHeader.innerHTML = `
        <div class="chat-header-avatar">
          ${avatarHTML}
        </div>
        <div class="chat-header-info">
          <div class="chat-header-name">${this.escapeHtml(user.handle)}</div>
          <div class="chat-header-status ${user.isOnline ? 'online' : 'offline'}">
            ${user.isOnline ? '在线' : '离线'}
          </div>
        </div>
      `;
    } else {
      chatHeader.innerHTML = `
        <div class="chat-header-info">
          <div class="chat-header-name">选择联系人开始聊天</div>
          <div class="chat-header-status">请从左侧选择一个联系人</div>
        </div>
      `;
    }
  }

  /**
   * Add message to UI
   * @param {Message} message - Message to add
   */
  addMessageToUI(message) {
    const messagesContainer = document.getElementById('messages-container') || document.getElementById('chat-text');
    if (!messagesContainer) return;

    // Use performance manager if available
    if (typeof messagePerformanceManager !== 'undefined') {
      messagePerformanceManager.addMessage(message);
      return;
    }

    // Fallback to direct DOM manipulation
    const messageElement = this.createMessageElement(message);
    messagesContainer.appendChild(messageElement);

    // Scroll to bottom if user is near bottom
    this.scrollToBottomIfNeeded();

    // Animate message entrance
    this.animateMessageEntrance(messageElement);
  }

  /**
   * Create message element
   * @param {Message} message - Message data
   * @returns {HTMLElement} Message element
   */
  createMessageElement(message) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.type} ${message.isSelf ? 'outgoing' : 'incoming'}`;
    messageElement.setAttribute('data-message-id', message.id);

    let avatarHTML = '';
    if (!message.isSelf && message.type !== 'system') {
      const avatarConfig = avatarGenerator.generateAvatar(message.handle, 'initial');
      avatarHTML = `
        <div class="message-avatar">
          ${avatarGenerator.createAvatarHTML(avatarConfig, 'sm')}
        </div>
      `;
    }

    const messageContent = `
      ${avatarHTML}
      <div class="message-content">
        ${message.type !== 'system' && !message.isSelf ? `<div class="message-sender">${this.escapeHtml(message.handle)}</div>` : ''}
        <div class="message-bubble">
          ${this.escapeHtml(message.text)}
        </div>
        <div class="message-meta">
          <span class="message-time">${this.formatTime(message.timestamp)}</span>
          ${message.isSelf ? `<span class="message-status ${message.status}">${this.getStatusText(message.status)}</span>` : ''}
        </div>
      </div>
    `;

    messageElement.innerHTML = messageContent;
    return messageElement;
  }

  /**
   * Update message in UI
   * @param {Message} message - Updated message
   */
  updateMessageInUI(message) {
    const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
    if (!messageElement) return;

    // Update status if it's an outgoing message
    if (message.isSelf) {
      const statusElement = messageElement.querySelector('.message-status');
      if (statusElement) {
        statusElement.className = `message-status ${message.status}`;
        statusElement.textContent = this.getStatusText(message.status);
      }
    }
  }

  /**
   * Update typing indicator
   * @param {User} user - User who is typing
   * @param {boolean} isTyping - Whether user is typing
   */
  updateTypingIndicator(user, isTyping) {
    const typingContainer = document.getElementById('typing-indicator') || document.querySelector('.typing-indicator');
    if (!typingContainer) return;

    const typingElement = typingContainer.querySelector(`[data-user-handle="${user.handle}"]`);

    if (isTyping) {
      if (!typingElement) {
        const indicator = document.createElement('div');
        indicator.className = 'typing-user';
        indicator.setAttribute('data-user-handle', user.handle);
        indicator.innerHTML = `
          <span class="typing-name">${this.escapeHtml(user.handle)}</span>
          <span class="typing-dots">
            <span></span><span></span><span></span>
          </span>
        `;
        typingContainer.appendChild(indicator);
      }
    } else {
      if (typingElement) {
        typingElement.remove();
      }
    }

    // Show/hide typing container
    const hasTypingUsers = typingContainer.children.length > 0;
    typingContainer.style.display = hasTypingUsers ? 'block' : 'none';
  }

  /**
   * Start typing indicator for current user
   */
  startTyping() {
    if (this.isTyping || !this.chatState.currentUser) return;

    this.isTyping = true;
    
    if (webSocketManager) {
      webSocketManager.sendTypingIndicator(this.chatState.currentUser.handle, true)
        .catch(error => {
          console.error('Failed to send typing indicator:', error);
        });
    }
  }

  /**
   * Stop typing indicator for current user
   */
  stopTyping() {
    if (!this.isTyping || !this.chatState.currentUser) return;

    this.isTyping = false;
    
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }

    if (webSocketManager) {
      webSocketManager.sendTypingIndicator(this.chatState.currentUser.handle, false)
        .catch(error => {
          console.error('Failed to send typing indicator:', error);
        });
    }
  }

  /**
   * Auto-resize textarea based on content
   * @param {HTMLElement} textarea - Textarea element
   */
  autoResizeTextarea(textarea) {
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Set height based on scrollHeight with limits
    const maxHeight = 120; // Maximum height in pixels
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    
    textarea.style.height = newHeight + 'px';
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }

  /**
   * Scroll to bottom of messages
   */
  scrollToBottom() {
    const messagesContainer = document.getElementById('messages-container') || document.getElementById('chat-text');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  /**
   * Scroll to bottom if user is near bottom
   */
  scrollToBottomIfNeeded() {
    const messagesContainer = document.getElementById('messages-container') || document.getElementById('chat-text');
    if (!messagesContainer) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    if (isNearBottom) {
      this.scrollToBottom();
    }
  }

  /**
   * Animate message entrance
   * @param {HTMLElement} messageElement - Message element
   */
  animateMessageEntrance(messageElement) {
    messageElement.style.opacity = '0';
    messageElement.style.transform = 'translateY(20px)';
    
    requestAnimationFrame(() => {
      messageElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      messageElement.style.opacity = '1';
      messageElement.style.transform = 'translateY(0)';
    });
  }

  /**
   * Update online count display
   */
  updateOnlineCount() {
    const onlineCountElement = document.getElementById('online-count') || document.querySelector('.online-count');
    if (onlineCountElement) {
      const count = this.chatState.getOnlineUsers().length;
      onlineCountElement.textContent = `${count} 人在线`;
    }
  }

  /**
   * Update connection status UI
   * @param {string} status - Connection status
   */
  updateConnectionStatusUI(status) {
    const statusElement = document.getElementById('connection-status') || document.querySelector('.connection-status');
    if (statusElement) {
      statusElement.className = `connection-status ${status}`;
      
      const statusTexts = {
        'connecting': '连接中...',
        'connected': '已连接',
        'reconnecting': '重连中...',
        'disconnected': '已断开',
        'error': '连接错误'
      };
      
      statusElement.textContent = statusTexts[status] || status;
    }
  }

  /**
   * Show user settings modal
   */
  showUserSettings() {
    // Implementation would depend on existing settings modal
    const settingsModal = document.getElementById('user-settings-modal');
    if (settingsModal) {
      settingsModal.style.display = 'block';
    }
  }

  /**
   * Toggle mobile menu
   */
  toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const chatArea = document.querySelector('.chat-area');
    
    if (sidebar && chatArea) {
      const isMenuOpen = sidebar.classList.contains('mobile-open');
      
      if (isMenuOpen) {
        sidebar.classList.remove('mobile-open');
        chatArea.classList.remove('mobile-hidden');
      } else {
        sidebar.classList.add('mobile-open');
        chatArea.classList.add('mobile-hidden');
      }
    }
  }

  /**
   * Show chat view on mobile
   */
  showChatView() {
    const sidebar = document.querySelector('.sidebar');
    const chatArea = document.querySelector('.chat-area');
    
    if (sidebar && chatArea) {
      sidebar.classList.remove('mobile-open');
      chatArea.classList.remove('mobile-hidden');
    }
  }

  /**
   * Check if current view is mobile
   * @returns {boolean} True if mobile view
   */
  isMobileView() {
    return window.innerWidth < 768;
  }

  /**
   * Insert contact in alphabetical order
   * @param {HTMLElement} container - Container element
   * @param {HTMLElement} contactElement - Contact element to insert
   * @param {string} handle - User handle for sorting
   */
  insertContactInOrder(container, contactElement, handle) {
    const existingContacts = Array.from(container.children);
    const insertIndex = existingContacts.findIndex(contact => {
      const contactHandle = contact.getAttribute('data-handle');
      return contactHandle && contactHandle.localeCompare(handle) > 0;
    });

    if (insertIndex === -1) {
      container.appendChild(contactElement);
    } else {
      container.insertBefore(contactElement, existingContacts[insertIndex]);
    }
  }

  /**
   * Format last seen time
   * @param {number} timestamp - Timestamp
   * @returns {string} Formatted time
   */
  formatLastSeen(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) { // Less than 1 minute
      return '刚刚';
    } else if (diff < 3600000) { // Less than 1 hour
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) { // Less than 1 day
      return `${Math.floor(diff / 3600000)}小时前`;
    } else {
      return new Date(timestamp).toLocaleDateString('zh-CN');
    }
  }

  /**
   * Format time for messages
   * @param {number} timestamp - Timestamp
   * @returns {string} Formatted time
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Get status text for message status
   * @param {string} status - Message status
   * @returns {string} Status text
   */
  getStatusText(status) {
    const statusTexts = {
      'sending': '发送中...',
      'sent': '已发送',
      'delivered': '已送达',
      'failed': '发送失败'
    };
    return statusTexts[status] || '';
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Show error notification
   * @param {string} message - Error message
   */
  showErrorNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">⚠️</span>
        <span class="notification-text">${this.escapeHtml(message)}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Mark messages as read
   */
  markMessagesAsRead() {
    // Implementation for marking messages as read
    this.chatState.emit('messagesRead');
  }

  /**
   * Focus contact search
   */
  focusContactSearch() {
    const searchInput = document.getElementById('contact-search');
    if (searchInput) {
      searchInput.focus();
    }
  }

  /**
   * Show command palette
   */
  showCommandPalette() {
    // Implementation for command palette
    console.log('Command palette not implemented yet');
  }

  /**
   * Update last message time
   */
  updateLastMessageTime() {
    this.lastMessageTime = Date.now();
  }

  /**
   * Setup message input with enhanced features
   */
  setupMessageInput() {
    const messageInput = document.getElementById('message-input') || document.getElementById('input-text');
    if (messageInput) {
      // Set initial height
      this.autoResizeTextarea(messageInput);
      
      // Add placeholder text
      if (!messageInput.placeholder) {
        messageInput.placeholder = '输入消息... (Enter发送, Shift+Enter换行)';
      }
    }
  }

  /**
   * Setup contact selection features
   */
  setupContactSelection() {
    // Auto-select first contact if none selected
    if (!this.selectedContactId) {
      const onlineUsers = this.chatState.getOnlineUsers();
      if (onlineUsers.length > 0) {
        this.selectContact(onlineUsers[0].id);
      }
    }
  }

  /**
   * Update current user UI
   * @param {User} user - Current user
   */
  updateCurrentUserUI(user) {
    // Update user info in header or sidebar
    const currentUserElement = document.getElementById('current-user-info');
    if (currentUserElement && user) {
      const avatarConfig = avatarGenerator.generateAvatar(user.handle, user.avatarType, user.avatar);
      const avatarHTML = avatarGenerator.createAvatarHTML(avatarConfig, 'md');
      
      currentUserElement.innerHTML = `
        <div class="current-user-avatar">
          ${avatarHTML}
        </div>
        <div class="current-user-name">${this.escapeHtml(user.handle)}</div>
      `;
    }
  }

  /**
   * Update message area
   */
  updateMessageArea() {
    // Initialize message area if needed
    const messagesContainer = document.getElementById('messages-container') || document.getElementById('chat-text');
    if (messagesContainer) {
      // Add existing messages to UI
      const messages = this.chatState.getRecentMessages(50);
      messages.forEach(message => {
        this.addMessageToUI(message);
      });
    }
  }

  /**
   * Update connection status
   */
  updateConnectionStatus() {
    this.updateConnectionStatusUI(this.chatState.connectionStatus);
  }
}

// Initialize UI interaction manager
const uiInteractionManager = new UIInteractionManager(chatState, componentCommunicationManager);

// Register UI interaction manager as a component
componentCommunicationManager.registerComponent('uiInteractionManager', uiInteractionManager);
// 
===== FINAL APPLICATION INTEGRATION =====

/**
 * Application initialization and integration manager
 */
class ApplicationManager {
  constructor() {
    this.initialized = false;
    this.components = new Map();
    this.startTime = Date.now();
    this.performanceMetrics = {
      initTime: 0,
      firstRender: 0,
      firstInteraction: 0
    };
  }

  /**
   * Initialize the complete application
   */
  async init() {
    if (this.initialized) {
      console.warn('Application already initialized');
      return;
    }

    console.log('🚀 Initializing Modern Chat Application...');
    
    try {
      // Initialize core components in order
      await this.initializeCore();
      await this.initializeUI();
      await this.initializeWebSocket();
      await this.setupEventListeners();
      await this.loadUserSettings();
      await this.performInitialTests();
      
      this.initialized = true;
      this.performanceMetrics.initTime = Date.now() - this.startTime;
      
      console.log(`✅ Application initialized successfully in ${this.performanceMetrics.initTime}ms`);
      this.showWelcomeMessage();
      
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      this.showErrorMessage('应用初始化失败，请刷新页面重试');
    }
  }

  /**
   * Initialize core components
   */
  async initializeCore() {
    console.log('📦 Initializing core components...');
    
    // Initialize global state
    if (typeof chatState === 'undefined') {
      window.chatState = new ChatState();
    }
    
    // Initialize avatar generator
    if (typeof avatarGenerator === 'undefined') {
      window.avatarGenerator = new AvatarGenerator();
    }
    
    // Initialize connection status manager
    if (typeof connectionStatusManager === 'undefined') {
      window.connectionStatusManager = new ConnectionStatusManager();
    }
    
    // Initialize component communication
    if (typeof componentCommunicationManager === 'undefined') {
      window.componentCommunicationManager = new ComponentCommunicationManager();
    }
    
    // Initialize performance manager
    if (typeof messagePerformanceManager === 'undefined') {
      window.messagePerformanceManager = new MessagePerformanceManager();
    }
    
    // Initialize user status manager
    if (typeof userStatusManager === 'undefined') {
      window.userStatusManager = new UserStatusManager(chatState);
    }
    
    // Initialize UI interaction manager
    if (typeof uiInteractionManager === 'undefined') {
      window.uiInteractionManager = new UIInteractionManager(chatState, componentCommunicationManager);
    }
    
    // Register all components
    this.registerComponents();
    
    console.log('✅ Core components initialized');
  }

  /**
   * Initialize UI components
   */
  async initializeUI() {
    console.log('🎨 Initializing UI components...');
    
    // Initialize accessibility
    if (typeof accessibilityManager !== 'undefined') {
      accessibilityManager.init();
    }
    
    // Setup responsive layout
    this.setupResponsiveLayout();
    
    // Initialize modal system
    this.initializeModals();
    
    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Initialize theme system
    this.initializeTheme();
    
    console.log('✅ UI components initialized');
  }

  /**
   * Initialize WebSocket connection
   */
  async initializeWebSocket() {
    console.log('🔌 Initializing WebSocket connection...');
    
    // Initialize WebSocket manager
    if (typeof webSocketManager === 'undefined') {
      window.webSocketManager = new WebSocketManager(chatState);
    }
    
    // Connect to WebSocket
    webSocketManager.connect();
    
    // Setup legacy WebSocket support
    this.setupLegacyWebSocket();
    
    console.log('✅ WebSocket connection initialized');
  }

  /**
   * Setup event listeners
   */
  async setupEventListeners() {
    console.log('🎧 Setting up event listeners...');
    
    // Setup chat state event listeners
    this.setupChatStateListeners();
    
    // Setup UI event listeners
    this.setupUIEventListeners();
    
    // Setup window event listeners
    this.setupWindowEventListeners();
    
    console.log('✅ Event listeners configured');
  }

  /**
   * Load user settings
   */
  async loadUserSettings() {
    console.log('⚙️ Loading user settings...');
    
    try {
      // Load from localStorage
      chatState.loadFromStorage();
      
      // Apply user preferences
      this.applyUserPreferences();
      
      console.log('✅ User settings loaded');
    } catch (error) {
      console.warn('⚠️ Failed to load user settings:', error);
    }
  }

  /**
   * Perform initial tests
   */
  async performInitialTests() {
    console.log('🧪 Performing initial component tests...');
    
    const testResults = {
      coreComponents: this.testCoreComponents(),
      uiComponents: this.testUIComponents(),
      connectivity: this.testConnectivity(),
      performance: this.testPerformance()
    };
    
    const allPassed = Object.values(testResults).every(result => result.passed);
    
    if (allPassed) {
      console.log('✅ All initial tests passed');
    } else {
      console.warn('⚠️ Some initial tests failed:', testResults);
    }
    
    return testResults;
  }

  /**
   * Register all components
   */
  registerComponents() {
    const components = [
      { name: 'chatState', instance: chatState },
      { name: 'avatarGenerator', instance: avatarGenerator },
      { name: 'connectionStatusManager', instance: connectionStatusManager },
      { name: 'messagePerformanceManager', instance: messagePerformanceManager },
      { name: 'userStatusManager', instance: userStatusManager },
      { name: 'uiInteractionManager', instance: uiInteractionManager }
    ];
    
    components.forEach(({ name, instance }) => {
      if (instance && componentCommunicationManager) {
        componentCommunicationManager.registerComponent(name, instance);
        this.components.set(name, instance);
      }
    });
  }

  /**
   * Setup responsive layout
   */
  setupResponsiveLayout() {
    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (mobileMenuToggle && sidebar) {
      mobileMenuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-visible');
        const isExpanded = sidebar.classList.contains('mobile-visible');
        mobileMenuToggle.setAttribute('aria-expanded', isExpanded);
      });
    }
    
    // Handle window resize
    window.addEventListener('resize', this.debounce(() => {
      this.handleWindowResize();
    }, 250));
  }

  /**
   * Initialize modals
   */
  initializeModals() {
    // User settings modal
    const settingsButton = document.querySelector('.settings-button');
    const settingsModal = document.getElementById('user-settings-modal');
    
    if (settingsButton && settingsModal) {
      settingsButton.addEventListener('click', () => {
        this.showUserSettingsModal();
      });
    }
    
    // Modal close handlers
    document.addEventListener('click', (event) => {
      if (event.target.classList.contains('modal-overlay')) {
        this.closeAllModals();
      }
      
      if (event.target.classList.contains('modal-close')) {
        this.closeAllModals();
      }
    });
    
    // ESC key to close modals
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Ctrl/Cmd + Enter to send message
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        const messageForm = document.getElementById('message-form');
        if (messageForm) {
          messageForm.dispatchEvent(new Event('submit'));
        }
      }
      
      // Ctrl/Cmd + K for command palette
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        uiInteractionManager.showCommandPalette();
      }
      
      // Ctrl/Cmd + / for help
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        this.showHelpModal();
      }
    });
  }

  /**
   * Initialize theme system
   */
  initializeTheme() {
    // Load saved theme
    const savedTheme = localStorage.getItem('chatTheme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Theme toggle functionality
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
  }

  /**
   * Setup chat state listeners
   */
  setupChatStateListeners() {
    chatState.on('messageAdded', (message) => {
      uiInteractionManager.addMessageToUI(message);
      messagePerformanceManager.addMessage(message);
    });
    
    chatState.on('userAdded', (user) => {
      uiInteractionManager.addUserToContactList(user);
    });
    
    chatState.on('userRemoved', (user) => {
      uiInteractionManager.removeUserFromContactList(user);
    });
    
    chatState.on('connectionStatusChanged', (status) => {
      connectionStatusManager.updateStatus(status);
    });
    
    chatState.on('currentUserChanged', (user) => {
      uiInteractionManager.updateCurrentUserUI(user);
    });
  }

  /**
   * Setup UI event listeners
   */
  setupUIEventListeners() {
    // Message form submission
    const messageForm = document.getElementById('message-form');
    if (messageForm) {
      messageForm.addEventListener('submit', (event) => {
        event.preventDefault();
        uiInteractionManager.handleMessageSubmit(event);
      });
    }
    
    // User settings form
    const userSettingsForm = document.getElementById('user-settings-form');
    if (userSettingsForm) {
      userSettingsForm.addEventListener('submit', (event) => {
        event.preventDefault();
        this.handleUserSettingsSubmit(event);
      });
    }
    
    // Contact selection
    document.addEventListener('click', (event) => {
      const contactItem = event.target.closest('.contact-item');
      if (contactItem) {
        const contactId = contactItem.dataset.contactId;
        uiInteractionManager.selectContact(contactId);
      }
    });
  }

  /**
   * Setup window event listeners
   */
  setupWindowEventListeners() {
    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        chatState.emit('pageHidden');
      } else {
        chatState.emit('pageVisible');
        uiInteractionManager.markMessagesAsRead();
      }
    });
    
    // Before unload
    window.addEventListener('beforeunload', () => {
      chatState.saveToStorage();
    });
    
    // Online/offline status
    window.addEventListener('online', () => {
      chatState.setConnectionStatus('connected');
    });
    
    window.addEventListener('offline', () => {
      chatState.setConnectionStatus('disconnected');
    });
  }

  /**
   * Setup legacy WebSocket support
   */
  setupLegacyWebSocket() {
    // Initialize legacy WebSocket if not already done
    if (typeof box === 'undefined') {
      window.box = new ReconnectingWebSocket(
        location.protocol.replace("http", "ws") + "//" + location.host + "/ws"
      );
      
      // Setup legacy handlers
      box.onopen = () => {
        console.log('Legacy WebSocket connected');
        chatState.setConnectionStatus('connected');
      };
      
      box.onclose = () => {
        console.log('Legacy WebSocket disconnected');
        chatState.setConnectionStatus('disconnected');
      };
      
      box.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleLegacyMessage(data);
        } catch (error) {
          console.error('Failed to parse legacy message:', error);
        }
      };
    }
  }

  /**
   * Handle legacy WebSocket messages
   */
  handleLegacyMessage(data) {
    // Convert legacy message format to modern format
    const message = new Message(data.handle, data.text, data.type || 'chat');
    chatState.addMessage(message);
    
    // Update user status
    if (data.handle && data.handle !== chatState.currentUser?.handle) {
      let user = chatState.getUserByHandle(data.handle);
      if (!user) {
        user = chatState.addUser({
          handle: data.handle,
          avatar: null,
          avatarType: 'initial'
        });
      }
      user.updateActivity();
    }
  }

  /**
   * Test core components
   */
  testCoreComponents() {
    try {
      // Test ChatState
      const testMessage = new Message('test', 'test message');
      chatState.addMessage(testMessage);
      
      // Test AvatarGenerator
      const testAvatar = avatarGenerator.generateAvatar('测试用户');
      
      // Test component communication
      componentCommunicationManager.emit('test', { data: 'test' });
      
      return { passed: true, details: 'All core components working' };
    } catch (error) {
      return { passed: false, error: error.message };
    }
  }

  /**
   * Test UI components
   */
  testUIComponents() {
    try {
      // Test essential DOM elements
      const requiredElements = [
        'messages-container',
        'message-input',
        'contact-list',
        'chat-header'
      ];
      
      const missingElements = requiredElements.filter(id => !document.getElementById(id));
      
      if (missingElements.length > 0) {
        return { 
          passed: false, 
          error: `Missing elements: ${missingElements.join(', ')}` 
        };
      }
      
      return { passed: true, details: 'All UI components present' };
    } catch (error) {
      return { passed: false, error: error.message };
    }
  }

  /**
   * Test connectivity
   */
  testConnectivity() {
    try {
      const isOnline = navigator.onLine;
      const hasWebSocket = typeof WebSocket !== 'undefined';
      
      return { 
        passed: isOnline && hasWebSocket, 
        details: `Online: ${isOnline}, WebSocket: ${hasWebSocket}` 
      };
    } catch (error) {
      return { passed: false, error: error.message };
    }
  }

  /**
   * Test performance
   */
  testPerformance() {
    try {
      const performanceData = {
        initTime: this.performanceMetrics.initTime,
        memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 'N/A',
        timing: performance.timing ? performance.timing.loadEventEnd - performance.timing.navigationStart : 'N/A'
      };
      
      return { 
        passed: true, 
        details: performanceData 
      };
    } catch (error) {
      return { passed: false, error: error.message };
    }
  }

  /**
   * Apply user preferences
   */
  applyUserPreferences() {
    // Apply theme
    const savedTheme = localStorage.getItem('chatTheme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    // Apply font size
    const savedFontSize = localStorage.getItem('chatFontSize');
    if (savedFontSize) {
      document.documentElement.style.setProperty('--font-size-base', savedFontSize);
    }
    
    // Apply other preferences
    const preferences = JSON.parse(localStorage.getItem('chatPreferences') || '{}');
    Object.entries(preferences).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--pref-${key}`, value);
    });
  }

  /**
   * Show welcome message
   */
  showWelcomeMessage() {
    // Add welcome message to chat
    const welcomeMessage = new Message('系统', '欢迎使用现代化聊天界面！请设置您的用户名开始聊天。', 'system');
    chatState.addMessage(welcomeMessage);
    
    // Show user settings modal if no current user
    if (!chatState.currentUser) {
      setTimeout(() => {
        this.showUserSettingsModal();
      }, 1000);
    }
  }

  /**
   * Show error message
   */
  showErrorMessage(message) {
    const errorMessage = new Message('系统', message, 'system');
    chatState.addMessage(errorMessage);
    
    // Also show notification
    uiInteractionManager.showErrorNotification(message);
  }

  /**
   * Show user settings modal
   */
  showUserSettingsModal() {
    const modal = document.getElementById('user-settings-modal');
    if (modal) {
      modal.classList.add('visible');
      modal.setAttribute('aria-hidden', 'false');
      
      // Focus first input
      const firstInput = modal.querySelector('input');
      if (firstInput) {
        firstInput.focus();
      }
      
      // Populate current values
      this.populateUserSettingsForm();
    }
  }

  /**
   * Close all modals
   */
  closeAllModals() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
      modal.classList.remove('visible');
      modal.setAttribute('aria-hidden', 'true');
    });
  }

  /**
   * Show help modal
   */
  showHelpModal() {
    // Implementation for help modal
    console.log('Help modal not implemented yet');
  }

  /**
   * Toggle theme
   */
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('chatTheme', newTheme);
    
    // Emit theme change event
    chatState.emit('themeChanged', newTheme);
  }

  /**
   * Handle user settings form submission
   */
  handleUserSettingsSubmit(event) {
    const formData = new FormData(event.target);
    const userName = formData.get('user-name') || document.getElementById('user-name-input')?.value;
    const avatarSelect = document.getElementById('user-avatar-select')?.value;
    const customEmoji = document.getElementById('custom-emoji-input')?.value;
    
    if (!userName || userName.trim() === '') {
      uiInteractionManager.showErrorNotification('请输入用户名');
      return;
    }
    
    // Determine avatar type and value
    let avatarType = 'initial';
    let avatarValue = null;
    
    if (customEmoji && customEmoji.trim() !== '') {
      avatarType = 'custom';
      avatarValue = customEmoji.trim();
    } else if (avatarSelect && avatarSelect !== 'default') {
      avatarType = 'preset';
      avatarValue = avatarSelect;
    }
    
    // Create or update user
    const user = new User(userName.trim(), avatarValue, avatarType);
    chatState.setCurrentUser(user);
    
    // Update hidden input for legacy compatibility
    const handleInput = document.getElementById('input-handle');
    if (handleInput) {
      handleInput.value = userName.trim();
    }
    
    // Close modal
    this.closeAllModals();
    
    // Show success message
    const successMessage = new Message('系统', `欢迎，${userName.trim()}！您现在可以开始聊天了。`, 'system');
    chatState.addMessage(successMessage);
    
    // Focus message input
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
      messageInput.focus();
    }
  }

  /**
   * Populate user settings form
   */
  populateUserSettingsForm() {
    const currentUser = chatState.currentUser;
    if (!currentUser) return;
    
    // Populate user name
    const userNameInput = document.getElementById('user-name-input');
    if (userNameInput) {
      userNameInput.value = currentUser.handle;
    }
    
    // Populate avatar selection
    const avatarSelect = document.getElementById('user-avatar-select');
    if (avatarSelect && currentUser.avatarType === 'preset') {
      avatarSelect.value = currentUser.avatar || 'default';
    }
    
    // Populate custom emoji
    const customEmojiInput = document.getElementById('custom-emoji-input');
    if (customEmojiInput && currentUser.avatarType === 'custom') {
      customEmojiInput.value = currentUser.avatar || '';
    }
    
    // Update avatar preview
    this.updateAvatarPreview();
  }

  /**
   * Update avatar preview
   */
  updateAvatarPreview() {
    const userNameInput = document.getElementById('user-name-input');
    const avatarSelect = document.getElementById('user-avatar-select');
    const customEmojiInput = document.getElementById('custom-emoji-input');
    const avatarPreview = document.getElementById('avatar-preview');
    
    if (!avatarPreview || !userNameInput) return;
    
    const userName = userNameInput.value || '用户';
    const selectedAvatar = avatarSelect?.value || 'default';
    const customEmoji = customEmojiInput?.value || '';
    
    let avatarType = 'initial';
    let avatarValue = null;
    
    if (customEmoji.trim() !== '') {
      avatarType = 'custom';
      avatarValue = customEmoji.trim();
    } else if (selectedAvatar !== 'default') {
      avatarType = 'preset';
      avatarValue = selectedAvatar;
    }
    
    const avatarConfig = avatarGenerator.generateAvatar(userName, avatarType, avatarValue);
    const avatarHTML = avatarGenerator.createAvatarHTML(avatarConfig, 'lg');
    
    avatarPreview.innerHTML = avatarHTML;
  }

  /**
   * Handle window resize
   */
  handleWindowResize() {
    // Update mobile layout
    const isMobile = window.innerWidth < 768;
    document.documentElement.classList.toggle('mobile', isMobile);
    
    // Emit resize event
    chatState.emit('windowResized', {
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile
    });
  }

  /**
   * Debounce utility function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Get application status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      components: Array.from(this.components.keys()),
      performance: this.performanceMetrics,
      connectionStatus: chatState.connectionStatus,
      userCount: chatState.users.size,
      messageCount: chatState.messages.length
    };
  }
}

// ===== GLOBAL APPLICATION INITIALIZATION =====

// Create global application manager
window.applicationManager = new ApplicationManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    applicationManager.init();
  });
} else {
  // DOM is already ready
  applicationManager.init();
}

// Setup user settings form event listeners
document.addEventListener('DOMContentLoaded', () => {
  // User name input change
  const userNameInput = document.getElementById('user-name-input');
  if (userNameInput) {
    userNameInput.addEventListener('input', () => {
      applicationManager.updateAvatarPreview();
    });
  }
  
  // Avatar select change
  const avatarSelect = document.getElementById('user-avatar-select');
  if (avatarSelect) {
    avatarSelect.addEventListener('change', () => {
      applicationManager.updateAvatarPreview();
    });
  }
  
  // Custom emoji input change
  const customEmojiInput = document.getElementById('custom-emoji-input');
  if (customEmojiInput) {
    customEmojiInput.addEventListener('input', () => {
      applicationManager.updateAvatarPreview();
    });
  }
  
  // Reset settings button
  const resetButton = document.getElementById('reset-settings');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      if (confirm('确定要重置所有设置吗？')) {
        localStorage.removeItem('chatState');
        localStorage.removeItem('chatTheme');
        localStorage.removeItem('chatPreferences');
        location.reload();
      }
    });
  }
  
  // Cancel settings button
  const cancelButton = document.getElementById('cancel-settings');
  if (cancelButton) {
    cancelButton.addEventListener('click', () => {
      applicationManager.closeAllModals();
    });
  }
});

// Export for testing and debugging
window.modernChatApp = {
  applicationManager,
  chatState,
  avatarGenerator,
  connectionStatusManager,
  componentCommunicationManager,
  messagePerformanceManager,
  userStatusManager,
  uiInteractionManager,
  webSocketManager
};

// Development helpers
if (typeof console !== 'undefined') {
  console.log('🎉 Modern Chat Application loaded successfully!');
  console.log('📱 Access app components via window.modernChatApp');
  console.log('🔧 Use applicationManager.getStatus() to check app status');
}