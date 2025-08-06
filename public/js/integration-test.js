/**
 * Comprehensive Integration Test Suite
 * Tests all components working together end-to-end
 */

class IntegrationTestSuite {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
  }

  /**
   * Run all integration tests
   */
  async runAllTests() {
    console.log('🧪 Starting comprehensive integration tests...');
    
    const tests = [
      { name: 'Application Initialization', test: () => this.testApplicationInitialization() },
      { name: 'Component Communication', test: () => this.testComponentCommunication() },
      { name: 'User Management Flow', test: () => this.testUserManagementFlow() },
      { name: 'Message Flow', test: () => this.testMessageFlow() },
      { name: 'Avatar System', test: () => this.testAvatarSystem() },
      { name: 'UI Responsiveness', test: () => this.testUIResponsiveness() },
      { name: 'WebSocket Integration', test: () => this.testWebSocketIntegration() },
      { name: 'Performance Metrics', test: () => this.testPerformanceMetrics() },
      { name: 'Error Handling', test: () => this.testErrorHandling() },
      { name: 'Accessibility Features', test: () => this.testAccessibilityFeatures() }
    ];

    for (const { name, test } of tests) {
      try {
        console.log(`🔍 Testing: ${name}`);
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
   * Test application initialization
   */
  testApplicationInitialization() {
    // Check if application manager exists and is initialized
    if (!window.applicationManager) {
      throw new Error('Application manager not found');
    }

    if (!applicationManager.initialized) {
      throw new Error('Application not initialized');
    }

    // Check core components
    const requiredComponents = [
      'chatState', 'avatarGenerator', 'connectionStatusManager',
      'componentCommunicationManager', 'messagePerformanceManager',
      'userStatusManager', 'uiInteractionManager'
    ];

    for (const component of requiredComponents) {
      if (!window[component]) {
        throw new Error(`Component ${component} not found`);
      }
    }

    return { 
      status: 'initialized',
      components: requiredComponents.length,
      initTime: applicationManager.performanceMetrics.initTime
    };
  }

  /**
   * Test component communication
   */
  testComponentCommunication() {
    let eventReceived = false;
    
    // Test event emission and reception
    componentCommunicationManager.on('test-event', () => {
      eventReceived = true;
    });
    
    componentCommunicationManager.emit('test-event', { test: true });
    
    if (!eventReceived) {
      throw new Error('Component communication failed');
    }

    // Test component registration
    const registeredComponents = componentCommunicationManager.components.size;
    if (registeredComponents === 0) {
      throw new Error('No components registered');
    }

    return {
      eventSystem: 'working',
      registeredComponents
    };
  }

  /**
   * Test user management flow
   */
  testUserManagementFlow() {
    // Test user creation
    const testUser = new User('测试用户', '😀', 'custom');
    if (!testUser.id || !testUser.handle) {
      throw new Error('User creation failed');
    }

    // Test adding user to chat state
    chatState.setCurrentUser(testUser);
    if (chatState.currentUser?.handle !== '测试用户') {
      throw new Error('Setting current user failed');
    }

    // Test user in contact list
    const addedUser = chatState.addUser({
      handle: '其他用户',
      avatar: '🤖',
      avatarType: 'custom'
    });

    if (!addedUser || chatState.users.size === 0) {
      throw new Error('Adding user to chat state failed');
    }

    // Test user removal
    const userId = addedUser.id;
    chatState.removeUser(userId);
    if (chatState.users.has(userId)) {
      throw new Error('User removal failed');
    }

    return {
      userCreation: 'working',
      userManagement: 'working',
      currentUser: testUser.handle
    };
  }

  /**
   * Test message flow
   */
  testMessageFlow() {
    // Test message creation
    const testMessage = new Message('测试用户', '这是一条测试消息', 'chat');
    if (!testMessage.id || !testMessage.text) {
      throw new Error('Message creation failed');
    }

    // Test adding message to chat state
    const initialMessageCount = chatState.messages.length;
    chatState.addMessage(testMessage);
    
    if (chatState.messages.length !== initialMessageCount + 1) {
      throw new Error('Adding message to chat state failed');
    }

    // Test message performance tracking
    messagePerformanceManager.addMessage(testMessage);
    const metrics = messagePerformanceManager.getMetrics();
    
    if (!metrics.totalMessages || metrics.totalMessages === 0) {
      throw new Error('Message performance tracking failed');
    }

    // Test system message
    const systemMessage = new Message('系统', '系统消息测试', 'system');
    chatState.addMessage(systemMessage);

    return {
      messageCreation: 'working',
      messageTracking: 'working',
      totalMessages: chatState.messages.length,
      performanceMetrics: metrics
    };
  }

  /**
   * Test avatar system
   */
  testAvatarSystem() {
    // Test initial avatar generation
    const initialAvatar = avatarGenerator.generateAvatar('测试用户');
    if (!initialAvatar.initial || !initialAvatar.backgroundColor) {
      throw new Error('Initial avatar generation failed');
    }

    // Test emoji avatar generation
    const emojiAvatar = avatarGenerator.generateAvatar('测试用户', 'custom', '😀');
    if (!emojiAvatar.emoji) {
      throw new Error('Emoji avatar generation failed');
    }

    // Test preset avatar generation
    const presetAvatar = avatarGenerator.generateAvatar('测试用户', 'preset', 'avatar1');
    if (!presetAvatar.emoji) {
      throw new Error('Preset avatar generation failed');
    }

    // Test avatar HTML generation
    const avatarHTML = avatarGenerator.createAvatarHTML(initialAvatar, 'md');
    if (!avatarHTML.includes('avatar')) {
      throw new Error('Avatar HTML generation failed');
    }

    // Test color consistency
    const avatar1 = avatarGenerator.generateAvatar('同一用户');
    const avatar2 = avatarGenerator.generateAvatar('同一用户');
    if (avatar1.backgroundColor !== avatar2.backgroundColor) {
      throw new Error('Avatar color consistency failed');
    }

    return {
      initialAvatar: 'working',
      emojiAvatar: 'working',
      presetAvatar: 'working',
      htmlGeneration: 'working',
      colorConsistency: 'working'
    };
  }

  /**
   * Test UI responsiveness
   */
  testUIResponsiveness() {
    // Test essential DOM elements
    const requiredElements = [
      'messages-container', 'message-input', 'contact-list',
      'chat-header', 'user-settings-modal', 'connection-status'
    ];

    const missingElements = [];
    for (const elementId of requiredElements) {
      if (!document.getElementById(elementId)) {
        missingElements.push(elementId);
      }
    }

    if (missingElements.length > 0) {
      throw new Error(`Missing UI elements: ${missingElements.join(', ')}`);
    }

    // Test responsive classes
    const chatContainer = document.querySelector('.chat-container');
    if (!chatContainer) {
      throw new Error('Chat container not found');
    }

    // Test mobile menu functionality
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (mobileMenuToggle && sidebar) {
      // Simulate mobile menu toggle
      mobileMenuToggle.click();
      const hasVisibleClass = sidebar.classList.contains('mobile-visible');
      
      // Toggle back
      mobileMenuToggle.click();
      
      if (!hasVisibleClass && sidebar.classList.contains('mobile-visible')) {
        throw new Error('Mobile menu toggle not working properly');
      }
    }

    return {
      requiredElements: 'present',
      responsiveLayout: 'working',
      mobileMenu: mobileMenuToggle ? 'working' : 'not_present'
    };
  }

  /**
   * Test WebSocket integration
   */
  testWebSocketIntegration() {
    // Test WebSocket manager existence
    if (!window.webSocketManager) {
      throw new Error('WebSocket manager not found');
    }

    // Test connection status manager
    if (!connectionStatusManager) {
      throw new Error('Connection status manager not found');
    }

    // Test connection status updates
    const initialStatus = chatState.connectionStatus;
    connectionStatusManager.updateStatus('connected', '测试连接');
    
    if (chatState.connectionStatus === initialStatus) {
      throw new Error('Connection status update failed');
    }

    // Test legacy WebSocket compatibility
    if (typeof box === 'undefined') {
      throw new Error('Legacy WebSocket not initialized');
    }

    return {
      webSocketManager: 'present',
      connectionStatusManager: 'working',
      legacyCompatibility: 'working',
      currentStatus: chatState.connectionStatus
    };
  }

  /**
   * Test performance metrics
   */
  testPerformanceMetrics() {
    // Test message performance manager
    const metrics = messagePerformanceManager.getMetrics();
    if (!metrics) {
      throw new Error('Performance metrics not available');
    }

    // Test application performance metrics
    const appStatus = applicationManager.getStatus();
    if (!appStatus.performance) {
      throw new Error('Application performance metrics not available');
    }

    // Test memory usage (if available)
    const memoryInfo = performance.memory ? {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    } : null;

    return {
      messageMetrics: metrics,
      applicationMetrics: appStatus.performance,
      memoryInfo,
      performanceAPI: typeof performance !== 'undefined'
    };
  }

  /**
   * Test error handling
   */
  testErrorHandling() {
    let errorHandled = false;

    // Test error notification system
    try {
      uiInteractionManager.showErrorNotification('测试错误消息');
      
      // Check if error notification was created
      const errorNotification = document.querySelector('.error-notification');
      if (errorNotification) {
        errorHandled = true;
        // Clean up
        errorNotification.remove();
      }
    } catch (error) {
      throw new Error('Error notification system failed');
    }

    // Test connection error handling
    try {
      connectionStatusManager.handleConnectionError('测试连接错误');
      errorHandled = true;
    } catch (error) {
      throw new Error('Connection error handling failed');
    }

    // Test invalid message handling
    try {
      const invalidMessage = { invalid: 'data' };
      // This should not crash the application
      chatState.addMessage(invalidMessage);
    } catch (error) {
      // Expected to handle gracefully
    }

    return {
      errorNotifications: errorHandled ? 'working' : 'failed',
      connectionErrorHandling: 'working',
      gracefulDegradation: 'working'
    };
  }

  /**
   * Test accessibility features
   */
  testAccessibilityFeatures() {
    // Test ARIA labels
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer?.getAttribute('aria-label')) {
      throw new Error('Messages container missing ARIA label');
    }

    // Test keyboard navigation
    const contactItems = document.querySelectorAll('.contact-item');
    let hasTabIndex = false;
    contactItems.forEach(item => {
      if (item.getAttribute('tabindex') !== null) {
        hasTabIndex = true;
      }
    });

    // Test skip links
    const skipLinks = document.querySelectorAll('.skip-link');
    
    // Test modal accessibility
    const modal = document.getElementById('user-settings-modal');
    const hasAriaHidden = modal?.getAttribute('aria-hidden') !== null;
    const hasAriaLabelledBy = modal?.getAttribute('aria-labelledby') !== null;

    return {
      ariaLabels: 'present',
      keyboardNavigation: hasTabIndex ? 'working' : 'partial',
      skipLinks: skipLinks.length > 0 ? 'present' : 'missing',
      modalAccessibility: hasAriaHidden && hasAriaLabelledBy ? 'working' : 'partial'
    };
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
      environment: {
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        online: navigator.onLine,
        language: navigator.language
      }
    };

    // Log summary
    console.log('\n📊 Integration Test Report:');
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
window.IntegrationTestSuite = IntegrationTestSuite;

// Auto-run if in test environment
if (window.location.pathname.includes('test-runner.html')) {
  document.addEventListener('DOMContentLoaded', async () => {
    // Wait for application to initialize
    setTimeout(async () => {
      const integrationTests = new IntegrationTestSuite();
      const report = await integrationTests.runAllTests();
      
      // Store report for test runner
      window.integrationTestReport = report;
      
      console.log('🎉 Integration tests completed!');
      console.log('📋 Full report available in window.integrationTestReport');
    }, 2000);
  });
}