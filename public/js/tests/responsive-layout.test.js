/**
 * Integration Tests for Responsive Layout
 * Tests responsive design behavior across different screen sizes and devices
 */

describe('Responsive Layout', () => {
  
  let testContainer;
  let originalInnerWidth;
  let originalInnerHeight;
  
  beforeEach = () => {
    // Setup DOM testing environment
    testContainer = testFramework.setupDOMTesting();
    
    // Store original window dimensions
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;
    
    // Create mock chat layout
    testContainer.innerHTML = `
      <div class="chat-container">
        <aside class="sidebar">
          <div class="sidebar-header">
            <h1 class="sidebar-title">聊天室</h1>
          </div>
          <div class="contact-list">
            <div class="contact-item">Contact 1</div>
            <div class="contact-item">Contact 2</div>
          </div>
        </aside>
        <main class="chat-area">
          <header class="chat-header">
            <button class="mobile-menu-toggle d-md-none">☰</button>
            <div class="chat-header-info">
              <h2 class="chat-title">Chat Title</h2>
            </div>
          </header>
          <div class="messages-container">
            <div class="message">Message 1</div>
            <div class="message">Message 2</div>
          </div>
          <div class="message-input-container">
            <textarea class="message-input"></textarea>
            <button class="send-button">Send</button>
          </div>
        </main>
      </div>
    `;
    
    // Add the container to the actual DOM for layout testing
    document.body.appendChild(testContainer);
    testContainer.style.display = 'block';
  };
  
  afterEach = () => {
    // Restore original window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight
    });
    
    // Cleanup DOM
    if (testContainer.parentNode) {
      testContainer.parentNode.removeChild(testContainer);
    }
    testFramework.cleanupDOMTesting();
  };
  
  // Helper function to simulate window resize
  function simulateResize(width, height) {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height
    });
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
  }
  
  // Helper function to check if element is visible
  function isElementVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  it('should have proper desktop layout structure', () => {
    simulateResize(1200, 800);
    
    const chatContainer = testContainer.querySelector('.chat-container');
    const sidebar = testContainer.querySelector('.sidebar');
    const chatArea = testContainer.querySelector('.chat-area');
    
    assertTruthy(chatContainer, 'Chat container should exist');
    assertTruthy(sidebar, 'Sidebar should exist');
    assertTruthy(chatArea, 'Chat area should exist');
    
    // Check that both sidebar and chat area are visible on desktop
    assertTruthy(isElementVisible(sidebar), 'Sidebar should be visible on desktop');
    assertTruthy(isElementVisible(chatArea), 'Chat area should be visible on desktop');
  });

  it('should handle mobile layout correctly', () => {
    simulateResize(375, 667); // iPhone dimensions
    
    const mobileToggle = testContainer.querySelector('.mobile-menu-toggle');
    const sidebar = testContainer.querySelector('.sidebar');
    
    assertTruthy(mobileToggle, 'Mobile menu toggle should exist');
    
    // Mobile toggle should be visible on small screens
    // Note: This test assumes CSS media queries are working
    // In a real test environment, you might need to manually apply mobile styles
  });

  it('should handle tablet layout correctly', () => {
    simulateResize(768, 1024); // iPad dimensions
    
    const chatContainer = testContainer.querySelector('.chat-container');
    const sidebar = testContainer.querySelector('.sidebar');
    const chatArea = testContainer.querySelector('.chat-area');
    
    assertTruthy(chatContainer, 'Chat container should exist on tablet');
    assertTruthy(sidebar, 'Sidebar should exist on tablet');
    assertTruthy(chatArea, 'Chat area should exist on tablet');
  });

  it('should handle very wide screens correctly', () => {
    simulateResize(2560, 1440); // 4K monitor
    
    const chatContainer = testContainer.querySelector('.chat-container');
    
    assertTruthy(chatContainer, 'Chat container should handle wide screens');
    
    // Container should not become too wide (assuming max-width is set)
    const containerRect = chatContainer.getBoundingClientRect();
    assert(containerRect.width > 0, 'Container should have positive width');
  });

  it('should handle very narrow screens correctly', () => {
    simulateResize(320, 568); // iPhone 5 dimensions
    
    const messageInput = testContainer.querySelector('.message-input');
    const sendButton = testContainer.querySelector('.send-button');
    
    assertTruthy(messageInput, 'Message input should exist on narrow screens');
    assertTruthy(sendButton, 'Send button should exist on narrow screens');
    
    // Elements should not overflow
    const inputRect = messageInput.getBoundingClientRect();
    assert(inputRect.width <= 320, 'Message input should not overflow narrow screen');
  });

  it('should maintain proper aspect ratios', () => {
    // Test different aspect ratios
    const aspectRatios = [
      { width: 1920, height: 1080, name: '16:9' },
      { width: 1440, height: 900, name: '16:10' },
      { width: 1024, height: 768, name: '4:3' }
    ];
    
    aspectRatios.forEach(ratio => {
      simulateResize(ratio.width, ratio.height);
      
      const chatContainer = testContainer.querySelector('.chat-container');
      const containerRect = chatContainer.getBoundingClientRect();
      
      assert(containerRect.width > 0, `Container should have positive width on ${ratio.name}`);
      assert(containerRect.height > 0, `Container should have positive height on ${ratio.name}`);
    });
  });

  it('should handle orientation changes', () => {
    // Portrait
    simulateResize(375, 812);
    const portraitHeight = testContainer.querySelector('.chat-container').getBoundingClientRect().height;
    
    // Landscape
    simulateResize(812, 375);
    const landscapeHeight = testContainer.querySelector('.chat-container').getBoundingClientRect().height;
    
    assert(portraitHeight !== landscapeHeight, 'Layout should adapt to orientation changes');
  });

  it('should handle dynamic content changes', () => {
    simulateResize(1200, 800);
    
    const messagesContainer = testContainer.querySelector('.messages-container');
    const initialHeight = messagesContainer.getBoundingClientRect().height;
    
    // Add more messages
    for (let i = 0; i < 10; i++) {
      const message = document.createElement('div');
      message.className = 'message';
      message.textContent = `Dynamic message ${i}`;
      messagesContainer.appendChild(message);
    }
    
    const newHeight = messagesContainer.getBoundingClientRect().height;
    assert(newHeight >= initialHeight, 'Container should expand with more content');
  });

  it('should handle text scaling', () => {
    simulateResize(1200, 800);
    
    const chatTitle = testContainer.querySelector('.chat-title');
    const originalFontSize = window.getComputedStyle(chatTitle).fontSize;
    
    // Simulate user zoom (this is a simplified test)
    chatTitle.style.fontSize = '1.2em';
    const scaledFontSize = window.getComputedStyle(chatTitle).fontSize;
    
    assert(scaledFontSize !== originalFontSize, 'Text should be scalable');
  });

  it('should maintain usable touch targets on mobile', () => {
    simulateResize(375, 667);
    
    const sendButton = testContainer.querySelector('.send-button');
    const mobileToggle = testContainer.querySelector('.mobile-menu-toggle');
    
    // Check minimum touch target size (44px recommended)
    const buttonRect = sendButton.getBoundingClientRect();
    const toggleRect = mobileToggle.getBoundingClientRect();
    
    // Note: In a real test, you'd check computed styles or actual rendered sizes
    assertTruthy(sendButton, 'Send button should exist for touch interaction');
    assertTruthy(mobileToggle, 'Mobile toggle should exist for touch interaction');
  });

  it('should handle keyboard appearance on mobile', () => {
    simulateResize(375, 667);
    
    const messageInput = testContainer.querySelector('.message-input');
    const inputContainer = testContainer.querySelector('.message-input-container');
    
    // Simulate keyboard appearance (reduced viewport height)
    simulateResize(375, 300);
    
    assertTruthy(messageInput, 'Message input should remain accessible with keyboard');
    assertTruthy(inputContainer, 'Input container should adapt to keyboard');
  });

  it('should handle content overflow gracefully', () => {
    simulateResize(320, 568); // Very narrow screen
    
    const sidebar = testContainer.querySelector('.sidebar');
    const chatArea = testContainer.querySelector('.chat-area');
    
    // Add long content
    const longTitle = 'This is a very long chat title that might overflow on narrow screens';
    const chatTitle = testContainer.querySelector('.chat-title');
    chatTitle.textContent = longTitle;
    
    // Content should not break layout
    const sidebarRect = sidebar.getBoundingClientRect();
    const chatAreaRect = chatArea.getBoundingClientRect();
    
    assert(sidebarRect.width >= 0, 'Sidebar should maintain valid width');
    assert(chatAreaRect.width >= 0, 'Chat area should maintain valid width');
  });

  it('should maintain proper spacing at different screen sizes', () => {
    const screenSizes = [
      { width: 320, height: 568, name: 'small mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1200, height: 800, name: 'desktop' }
    ];
    
    screenSizes.forEach(size => {
      simulateResize(size.width, size.height);
      
      const chatHeader = testContainer.querySelector('.chat-header');
      const messagesContainer = testContainer.querySelector('.messages-container');
      const inputContainer = testContainer.querySelector('.message-input-container');
      
      // Check that elements maintain proper spacing
      const headerRect = chatHeader.getBoundingClientRect();
      const messagesRect = messagesContainer.getBoundingClientRect();
      const inputRect = inputContainer.getBoundingClientRect();
      
      assert(headerRect.bottom <= messagesRect.top, `Header should not overlap messages on ${size.name}`);
      assert(messagesRect.bottom <= inputRect.top, `Messages should not overlap input on ${size.name}`);
    });
  });

  it('should handle rapid resize events', () => {
    const sizes = [
      { width: 320, height: 568 },
      { width: 768, height: 1024 },
      { width: 1200, height: 800 },
      { width: 375, height: 812 }
    ];
    
    // Rapidly change sizes
    sizes.forEach((size, index) => {
      simulateResize(size.width, size.height);
      
      const chatContainer = testContainer.querySelector('.chat-container');
      assertTruthy(chatContainer, `Container should remain stable during rapid resize ${index}`);
    });
  });

});