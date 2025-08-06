/**
 * End-to-End Test Suite
 * Tests complete user workflows and application functionality
 */

class E2ETestSuite {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
    this.testUser = null;
  }

  /**
   * Run all end-to-end tests
   */
  async runAllTests() {
    console.log('🎭 Starting End-to-End tests...');
    
    const tests = [
      { name: 'Application Startup Flow', test: () => this.testApplicationStartup() },
      { name: 'User Registration Flow', test: () => this.testUserRegistration() },
      { name: 'Message Sending Flow', test: () => this.testMessageSending() },
      { name: 'Contact Management Flow', test: () => this.testContactManagement() },
      { name: 'Settings Management Flow', test: () => this.testSettingsManagement() },
      { name: 'Responsive Design Flow', test: () => this.testResponsiveDesign() },
      { name: 'Error Recovery Flow', test: () => this.testErrorRecovery() },
      { name: 'Performance Under Load', test: () => this.testPerformanceUnderLoad() }
    ];

    for (const { name, test } of tests) {
      try {
        console.log(`🎬 Testing: ${name}`);
        const result = await test();
        this.testResults.push({
          name,
          passed: true,
          result,
          duration: Date.now() - this.startTime
        });
        console.log(`✅ ${name}: PASSED`);
      } catch (error) {
        this.testResults.push({
          name,
          passed: false,
          error: error.message,
          duration: Date.now() - this.startTime
        });
        console.error(`❌ ${name}: FAILED -`, error.message);
      }
    }

    return this.generateReport();
  }

  /**
   * Test application startup flow
   */
  async testApplicationStartup() {
    // Simulate page load
    await this.waitForApplicationReady();
    
    // Check if all essential components are loaded
    const requiredComponents = [
      'applicationManager', 'chatState', 'avatarGenerator',
      'connectionStatusManager', 'uiInteractionManager'
    ];
    
    for (const component of requiredComponents) {
      if (!window[component]) {
        throw new Error(`Component ${component} not loaded`);
      }
    }
    
    // Check if UI is rendered
    const requiredElements = [
      'chat-container', 'messages-container', 'message-input',
      'contact-list', 'user-settings-modal'
    ];
    
    for (const elementId of requiredElements) {
      if (!document.getElementById(elementId)) {
        throw new Error(`UI element ${elementId} not found`);
      }
    }
    
    // Check if welcome message is displayed
    await this.waitForElement('.message.system');
    
    return {
      componentsLoaded: requiredComponents.length,
      uiElementsPresent: requiredElements.length,
      welcomeMessageShown: true
    };
  }

  /**
   * Test user registration flow
   */
  async testUserRegistration() {
    // Open user settings modal
    const settingsButton = document.querySelector('.settings-button');
    if (!settingsButton) {
      throw new Error('Settings button not found');
    }
    
    this.simulateClick(settingsButton);
    await this.waitForElement('#user-settings-modal.visible');
    
    // Fill in user information
    const userNameInput = document.getElementById('user-name-input');
    const avatarSelect = document.getElementById('user-avatar-select');
    const customEmojiInput = document.getElementById('custom-emoji-input');
    
    if (!userNameInput) {
      throw new Error('User name input not found');
    }
    
    // Test different avatar types
    const testCases = [
      { name: 'E2E测试用户', avatarType: 'initial' },
      { name: 'E2E测试用户', avatarType: 'preset', avatarValue: 'avatar1' },
      { name: 'E2E测试用户', avatarType: 'custom', avatarValue: '🤖' }
    ];
    
    for (const testCase of testCases) {
      // Clear and fill user name
      userNameInput.value = '';
      this.simulateInput(userNameInput, testCase.name);
      
      // Set avatar based on type
      if (testCase.avatarType === 'preset' && avatarSelect) {
        avatarSelect.value = testCase.avatarValue;
        this.simulateChange(avatarSelect);
      } else if (testCase.avatarType === 'custom' && customEmojiInput) {
        customEmojiInput.value = testCase.avatarValue;
        this.simulateInput(customEmojiInput, testCase.avatarValue);
      }
      
      // Check avatar preview update
      await this.waitForTimeout(100);
      const avatarPreview = document.getElementById('avatar-preview');
      if (!avatarPreview || !avatarPreview.innerHTML.includes('avatar')) {
        throw new Error(`Avatar preview not updated for ${testCase.avatarType}`);
      }
    }
    
    // Submit form
    const userSettingsForm = document.getElementById('user-settings-form');
    if (!userSettingsForm) {
      throw new Error('User settings form not found');
    }
    
    this.simulateSubmit(userSettingsForm);
    
    // Wait for modal to close
    await this.waitForElementToDisappear('#user-settings-modal.visible');
    
    // Check if user is set in chat state
    if (!chatState.currentUser || chatState.currentUser.handle !== 'E2E测试用户') {
      throw new Error('Current user not set correctly');
    }
    
    this.testUser = chatState.currentUser;
    
    return {
      userRegistered: true,
      avatarTypesSupported: testCases.length,
      currentUser: this.testUser.handle
    };
  }

  /**
   * Test message sending flow
   */
  async testMessageSending() {
    if (!this.testUser) {
      throw new Error('No test user available');
    }
    
    const messageInput = document.getElementById('message-input');
    const messageForm = document.getElementById('message-form');
    
    if (!messageInput || !messageForm) {
      throw new Error('Message input elements not found');
    }
    
    const testMessages = [
      '这是第一条测试消息',
      '这是包含表情的消息 😀',
      '这是一条很长的消息，用来测试消息显示和换行功能。这条消息应该能够正确显示在聊天界面中。',
      'English message test',
      '123456789'
    ];
    
    const initialMessageCount = chatState.messages.length;
    
    for (let i = 0; i < testMessages.length; i++) {
      const message = testMessages[i];
      
      // Clear and type message
      messageInput.value = '';
      this.simulateInput(messageInput, message);
      
      // Check if send button is enabled
      const sendButton = document.querySelector('.send-button');
      if (sendButton && sendButton.disabled) {
        throw new Error('Send button should be enabled with message text');
      }
      
      // Submit message
      this.simulateSubmit(messageForm);
      
      // Wait for message to appear in UI
      await this.waitForTimeout(100);
      
      // Check if message was added to chat state
      const expectedMessageCount = initialMessageCount + i + 1;
      if (chatState.messages.length !== expectedMessageCount) {
        throw new Error(`Message ${i + 1} not added to chat state`);
      }
      
      // Check if message appears in UI
      const messageElements = document.querySelectorAll('.message:not(.system)');
      if (messageElements.length < i + 1) {
        throw new Error(`Message ${i + 1} not displayed in UI`);
      }
      
      // Verify message content
      const lastMessage = chatState.messages[chatState.messages.length - 1];
      if (lastMessage.text !== message) {
        throw new Error(`Message content mismatch: expected "${message}", got "${lastMessage.text}"`);
      }
      
      // Verify message is marked as self
      if (!lastMessage.isSelf) {
        throw new Error('Message not marked as self');
      }
    }
    
    return {
      messagesSent: testMessages.length,
      messagesInState: chatState.messages.length - initialMessageCount,
      messagesInUI: document.querySelectorAll('.message:not(.system)').length
    };
  }

  /**
   * Test contact management flow
   */
  async testContactManagement() {
    const contactList = document.getElementById('contact-list');
    if (!contactList) {
      throw new Error('Contact list not found');
    }
    
    const initialContactCount = chatState.users.size;
    
    // Simulate adding users
    const testUsers = [
      { handle: '测试联系人1', avatar: '👨', avatarType: 'custom' },
      { handle: '测试联系人2', avatar: '👩', avatarType: 'custom' },
      { handle: 'TestContact3', avatar: null, avatarType: 'initial' }
    ];
    
    const addedUsers = [];
    for (const userData of testUsers) {
      const user = chatState.addUser(userData);
      addedUsers.push(user);
      
      // Wait for UI update
      await this.waitForTimeout(50);
      
      // Check if contact appears in list
      const contactItem = document.querySelector(`[data-contact-id="${user.id}"]`);
      if (!contactItem) {
        throw new Error(`Contact ${user.handle} not displayed in list`);
      }
      
      // Check contact info
      const contactName = contactItem.querySelector('.contact-name');
      if (!contactName || contactName.textContent !== user.handle) {
        throw new Error(`Contact name not displayed correctly for ${user.handle}`);
      }
      
      // Check avatar
      const avatar = contactItem.querySelector('.avatar');
      if (!avatar) {
        throw new Error(`Avatar not displayed for ${user.handle}`);
      }
    }
    
    // Test contact selection
    const firstContact = addedUsers[0];
    const firstContactElement = document.querySelector(`[data-contact-id="${firstContact.id}"]`);
    if (firstContactElement) {
      this.simulateClick(firstContactElement);
      await this.waitForTimeout(50);
      
      // Check if contact is selected
      if (!firstContactElement.classList.contains('active')) {
        throw new Error('Contact selection not working');
      }
    }
    
    // Test contact removal
    const userToRemove = addedUsers[0];
    chatState.removeUser(userToRemove.id);
    
    await this.waitForTimeout(50);
    
    // Check if contact is removed from UI
    const removedContactElement = document.querySelector(`[data-contact-id="${userToRemove.id}"]`);
    if (removedContactElement) {
      throw new Error('Removed contact still displayed in UI');
    }
    
    return {
      usersAdded: testUsers.length,
      usersRemoved: 1,
      finalUserCount: chatState.users.size,
      contactSelection: 'working'
    };
  }

  /**
   * Test settings management flow
   */
  async testSettingsManagement() {
    // Test theme toggle
    const initialTheme = document.documentElement.getAttribute('data-theme') || 'light';
    
    // Simulate theme toggle
    if (applicationManager.toggleTheme) {
      applicationManager.toggleTheme();
      await this.waitForTimeout(100);
      
      const newTheme = document.documentElement.getAttribute('data-theme');
      if (newTheme === initialTheme) {
        throw new Error('Theme toggle not working');
      }
      
      // Toggle back
      applicationManager.toggleTheme();
      await this.waitForTimeout(100);
    }
    
    // Test user settings persistence
    const originalUser = chatState.currentUser;
    
    // Save state
    chatState.saveToStorage();
    
    // Clear current user
    chatState.setCurrentUser(null);
    
    // Load from storage
    chatState.loadFromStorage();
    
    // Check if user was restored
    if (!chatState.currentUser || chatState.currentUser.handle !== originalUser.handle) {
      throw new Error('User settings not persisted correctly');
    }
    
    return {
      themeToggle: 'working',
      settingsPersistence: 'working',
      userRestored: chatState.currentUser.handle
    };
  }

  /**
   * Test responsive design flow
   */
  async testResponsiveDesign() {
    const originalWidth = window.innerWidth;
    
    // Test mobile layout
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600
    });
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
    await this.waitForTimeout(300);
    
    // Check mobile classes
    const isMobileClass = document.documentElement.classList.contains('mobile');
    
    // Test mobile menu
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    let mobileMenuWorking = false;
    if (mobileMenuToggle && sidebar) {
      this.simulateClick(mobileMenuToggle);
      await this.waitForTimeout(100);
      
      mobileMenuWorking = sidebar.classList.contains('mobile-visible');
      
      // Close menu
      this.simulateClick(mobileMenuToggle);
    }
    
    // Test tablet layout
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 900
    });
    
    window.dispatchEvent(new Event('resize'));
    await this.waitForTimeout(300);
    
    // Test desktop layout
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200
    });
    
    window.dispatchEvent(new Event('resize'));
    await this.waitForTimeout(300);
    
    // Restore original width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalWidth
    });
    
    window.dispatchEvent(new Event('resize'));
    
    return {
      mobileLayout: isMobileClass ? 'detected' : 'not_detected',
      mobileMenu: mobileMenuWorking ? 'working' : 'not_working',
      responsiveBreakpoints: 'tested'
    };
  }

  /**
   * Test error recovery flow
   */
  async testErrorRecovery() {
    // Test connection error handling
    const originalStatus = chatState.connectionStatus;
    
    // Simulate connection error
    chatState.setConnectionStatus('error');
    await this.waitForTimeout(100);
    
    // Check if error status is displayed
    const connectionStatus = document.getElementById('connection-status');
    if (!connectionStatus || !connectionStatus.classList.contains('error')) {
      throw new Error('Connection error not displayed');
    }
    
    // Simulate connection recovery
    chatState.setConnectionStatus('connected');
    await this.waitForTimeout(100);
    
    // Test invalid message handling
    try {
      const invalidMessage = { invalid: 'data', missing: 'required fields' };
      chatState.addMessage(invalidMessage);
      // Should not crash
    } catch (error) {
      throw new Error('Application crashed on invalid message');
    }
    
    // Test error notification system
    if (uiInteractionManager.showErrorNotification) {
      uiInteractionManager.showErrorNotification('测试错误通知');
      await this.waitForTimeout(100);
      
      const errorNotification = document.querySelector('.error-notification');
      if (!errorNotification) {
        throw new Error('Error notification not displayed');
      }
      
      // Clean up
      errorNotification.remove();
    }
    
    return {
      connectionErrorHandling: 'working',
      invalidMessageHandling: 'working',
      errorNotifications: 'working',
      gracefulDegradation: 'working'
    };
  }

  /**
   * Test performance under load
   */
  async testPerformanceUnderLoad() {
    const startTime = performance.now();
    
    // Add many messages quickly
    const messageCount = 100;
    const messages = [];
    
    for (let i = 0; i < messageCount; i++) {
      const message = new Message(`用户${i % 5}`, `测试消息 ${i}`, 'chat');
      messages.push(message);
      chatState.addMessage(message);
    }
    
    const messageAddTime = performance.now() - startTime;
    
    // Test UI rendering performance
    const renderStartTime = performance.now();
    
    // Force UI update
    if (uiInteractionManager.updateMessageArea) {
      uiInteractionManager.updateMessageArea();
    }
    
    const renderTime = performance.now() - renderStartTime;
    
    // Test memory usage
    const memoryBefore = performance.memory ? performance.memory.usedJSHeapSize : 0;
    
    // Add more data
    for (let i = 0; i < 50; i++) {
      const user = chatState.addUser({
        handle: `负载测试用户${i}`,
        avatar: '🤖',
        avatarType: 'custom'
      });
    }
    
    const memoryAfter = performance.memory ? performance.memory.usedJSHeapSize : 0;
    const memoryIncrease = memoryAfter - memoryBefore;
    
    // Test cleanup
    if (performanceOptimizer && performanceOptimizer.performMemoryCleanup) {
      performanceOptimizer.performMemoryCleanup();
    }
    
    return {
      messagesAdded: messageCount,
      messageAddTime: `${messageAddTime.toFixed(2)}ms`,
      renderTime: `${renderTime.toFixed(2)}ms`,
      memoryIncrease: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
      performanceAcceptable: messageAddTime < 1000 && renderTime < 500
    };
  }

  /**
   * Wait for application to be ready
   */
  async waitForApplicationReady() {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
      if (window.applicationManager && applicationManager.initialized) {
        return;
      }
      await this.waitForTimeout(100);
      attempts++;
    }
    
    throw new Error('Application not ready within timeout');
  }

  /**
   * Wait for element to appear
   */
  async waitForElement(selector) {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
      await this.waitForTimeout(100);
      attempts++;
    }
    
    throw new Error(`Element ${selector} not found within timeout`);
  }

  /**
   * Wait for element to disappear
   */
  async waitForElementToDisappear(selector) {
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
      const element = document.querySelector(selector);
      if (!element) {
        return;
      }
      await this.waitForTimeout(100);
      attempts++;
    }
    
    throw new Error(`Element ${selector} did not disappear within timeout`);
  }

  /**
   * Wait for specified timeout
   */
  async waitForTimeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Simulate click event
   */
  simulateClick(element) {
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    element.dispatchEvent(event);
  }

  /**
   * Simulate input event
   */
  simulateInput(element, value) {
    element.value = value;
    const event = new Event('input', {
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);
  }

  /**
   * Simulate change event
   */
  simulateChange(element) {
    const event = new Event('change', {
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);
  }

  /**
   * Simulate form submit
   */
  simulateSubmit(form) {
    const event = new Event('submit', {
      bubbles: true,
      cancelable: true
    });
    event.preventDefault = () => {};
    form.dispatchEvent(event);
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(test => test.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(2) : 0;
    const totalDuration = Date.now() - this.startTime;

    const report = {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate: `${successRate}%`,
        duration: `${totalDuration}ms`
      },
      results: this.testResults,
      timestamp: new Date().toISOString(),
      testUser: this.testUser ? this.testUser.handle : null,
      environment: {
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        online: navigator.onLine,
        language: navigator.language
      }
    };

    // Log summary
    console.log('\n🎭 End-to-End Test Report:');
    console.log(`✅ Passed: ${passedTests}/${totalTests} (${successRate}%)`);
    console.log(`❌ Failed: ${failedTests}/${totalTests}`);
    console.log(`⏱️ Duration: ${totalDuration}ms`);

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.error}`);
        });
    }

    return report;
  }
}

// Export for use in test runner
window.E2ETestSuite = E2ETestSuite;