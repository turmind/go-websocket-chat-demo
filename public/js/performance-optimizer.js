/**
 * Performance Optimization Module
 * Optimizes loading performance and user experience
 */

class PerformanceOptimizer {
  constructor() {
    this.metrics = {
      loadTime: 0,
      renderTime: 0,
      interactionTime: 0,
      memoryUsage: 0
    };
    this.observers = new Map();
    this.optimizations = new Set();
  }

  /**
   * Initialize performance optimizations
   */
  init() {
    console.log('🚀 Initializing performance optimizations...');
    
    this.measureLoadTime();
    this.setupLazyLoading();
    this.optimizeScrolling();
    this.setupVirtualization();
    this.optimizeAnimations();
    this.setupMemoryManagement();
    this.setupNetworkOptimizations();
    
    console.log('✅ Performance optimizations initialized');
  }

  /**
   * Measure application load time
   */
  measureLoadTime() {
    if (performance.timing) {
      this.metrics.loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    }
    
    // Measure time to first meaningful paint
    if (performance.getEntriesByType) {
      const paintEntries = performance.getEntriesByType('paint');
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcp) {
        this.metrics.renderTime = fcp.startTime;
      }
    }
    
    // Measure time to first interaction
    document.addEventListener('click', () => {
      if (this.metrics.interactionTime === 0) {
        this.metrics.interactionTime = performance.now();
      }
    }, { once: true });
  }

  /**
   * Setup lazy loading for images and content
   */
  setupLazyLoading() {
    // Lazy load images
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      });

      // Observe all images with data-src
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });

      this.observers.set('images', imageObserver);
    }

    // Lazy load message content
    this.setupMessageLazyLoading();
  }

  /**
   * Setup lazy loading for messages
   */
  setupMessageLazyLoading() {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer || !('IntersectionObserver' in window)) return;

    const messageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const message = entry.target;
        if (entry.isIntersecting) {
          // Load message content if not already loaded
          if (message.dataset.lazy === 'true') {
            this.loadMessageContent(message);
            message.removeAttribute('data-lazy');
          }
        }
      });
    }, {
      rootMargin: '100px 0px' // Load messages 100px before they come into view
    });

    this.observers.set('messages', messageObserver);
  }

  /**
   * Load message content
   */
  loadMessageContent(messageElement) {
    // Implementation for loading message content
    const messageId = messageElement.dataset.messageId;
    if (messageId && messagePerformanceManager) {
      const message = messagePerformanceManager.getMessage(messageId);
      if (message) {
        // Render full message content
        this.renderMessageContent(messageElement, message);
      }
    }
  }

  /**
   * Render message content
   */
  renderMessageContent(element, message) {
    // Efficient message rendering
    const bubble = element.querySelector('.message-bubble');
    if (bubble && message.text) {
      bubble.textContent = message.text;
      element.classList.add('loaded');
    }
  }

  /**
   * Optimize scrolling performance
   */
  optimizeScrolling() {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;

    let isScrolling = false;
    let scrollTimeout;

    // Throttle scroll events
    messagesContainer.addEventListener('scroll', () => {
      if (!isScrolling) {
        isScrolling = true;
        requestAnimationFrame(() => {
          this.handleScroll(messagesContainer);
          isScrolling = false;
        });
      }

      // Clear existing timeout
      clearTimeout(scrollTimeout);
      
      // Set timeout to detect scroll end
      scrollTimeout = setTimeout(() => {
        this.handleScrollEnd(messagesContainer);
      }, 150);
    }, { passive: true });

    // Use passive listeners for better performance
    messagesContainer.addEventListener('touchstart', () => {}, { passive: true });
    messagesContainer.addEventListener('touchmove', () => {}, { passive: true });
  }

  /**
   * Handle scroll events
   */
  handleScroll(container) {
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    // Show/hide scroll to bottom button
    const scrollButton = document.querySelector('.scroll-to-bottom');
    if (scrollButton) {
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      scrollButton.classList.toggle('visible', !isNearBottom);
    }

    // Load more messages if scrolled to top
    if (scrollTop < 100) {
      this.loadMoreMessages();
    }
  }

  /**
   * Handle scroll end
   */
  handleScrollEnd(container) {
    // Mark messages as read when scroll ends
    if (uiInteractionManager) {
      uiInteractionManager.markMessagesAsRead();
    }
  }

  /**
   * Load more messages (pagination)
   */
  loadMoreMessages() {
    if (this.isLoadingMessages) return;
    
    this.isLoadingMessages = true;
    
    // Simulate loading more messages
    setTimeout(() => {
      // Implementation would load older messages from server
      this.isLoadingMessages = false;
    }, 500);
  }

  /**
   * Setup message virtualization for large lists
   */
  setupVirtualization() {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;

    // Only virtualize if we have many messages
    const messageThreshold = 100;
    
    if (chatState && chatState.messages.length > messageThreshold) {
      this.enableMessageVirtualization(messagesContainer);
    }
  }

  /**
   * Enable message virtualization
   */
  enableMessageVirtualization(container) {
    const itemHeight = 60; // Approximate message height
    const containerHeight = container.clientHeight;
    const visibleItems = Math.ceil(containerHeight / itemHeight) + 5; // Buffer

    let startIndex = 0;
    let endIndex = visibleItems;

    const updateVisibleMessages = () => {
      const scrollTop = container.scrollTop;
      startIndex = Math.floor(scrollTop / itemHeight);
      endIndex = Math.min(startIndex + visibleItems, chatState.messages.length);

      this.renderVisibleMessages(container, startIndex, endIndex);
    };

    // Throttled scroll handler for virtualization
    let virtualScrollTimeout;
    container.addEventListener('scroll', () => {
      clearTimeout(virtualScrollTimeout);
      virtualScrollTimeout = setTimeout(updateVisibleMessages, 16); // ~60fps
    }, { passive: true });

    // Initial render
    updateVisibleMessages();
  }

  /**
   * Render only visible messages
   */
  renderVisibleMessages(container, startIndex, endIndex) {
    const messages = chatState.messages.slice(startIndex, endIndex);
    const fragment = document.createDocumentFragment();

    messages.forEach((message, index) => {
      const messageElement = this.createMessageElement(message, startIndex + index);
      fragment.appendChild(messageElement);
    });

    // Replace container content efficiently
    container.innerHTML = '';
    container.appendChild(fragment);

    // Set container height to maintain scroll position
    const totalHeight = chatState.messages.length * 60;
    container.style.height = `${totalHeight}px`;
  }

  /**
   * Create optimized message element
   */
  createMessageElement(message, index) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.isSelf ? 'self' : 'other'}`;
    messageDiv.dataset.messageId = message.id;
    messageDiv.style.position = 'absolute';
    messageDiv.style.top = `${index * 60}px`;
    messageDiv.style.width = '100%';

    // Minimal initial content
    messageDiv.innerHTML = `
      <div class="message-content">
        <div class="message-bubble">
          ${this.escapeHtml(message.text)}
        </div>
      </div>
    `;

    return messageDiv;
  }

  /**
   * Optimize animations
   */
  optimizeAnimations() {
    // Reduce animations on low-end devices
    if (this.isLowEndDevice()) {
      document.documentElement.classList.add('reduce-animations');
    }

    // Use CSS containment for better performance
    const animatedElements = document.querySelectorAll('.message, .contact-item, .modal-container');
    animatedElements.forEach(element => {
      element.style.contain = 'layout style paint';
    });

    // Optimize will-change property usage
    this.optimizeWillChange();
  }

  /**
   * Detect low-end devices
   */
  isLowEndDevice() {
    // Simple heuristics for low-end device detection
    const memory = navigator.deviceMemory || 4; // Default to 4GB if not available
    const cores = navigator.hardwareConcurrency || 4; // Default to 4 cores
    const connection = navigator.connection;

    return (
      memory < 2 || // Less than 2GB RAM
      cores < 4 || // Less than 4 CPU cores
      (connection && connection.effectiveType === 'slow-2g') // Slow connection
    );
  }

  /**
   * Optimize will-change property
   */
  optimizeWillChange() {
    const elementsToOptimize = document.querySelectorAll('.message-bubble, .contact-item, .avatar');
    
    elementsToOptimize.forEach(element => {
      // Add will-change before animation
      element.addEventListener('mouseenter', () => {
        element.style.willChange = 'transform, opacity';
      });

      // Remove will-change after animation
      element.addEventListener('mouseleave', () => {
        element.style.willChange = 'auto';
      });
    });
  }

  /**
   * Setup memory management
   */
  setupMemoryManagement() {
    // Monitor memory usage
    if (performance.memory) {
      setInterval(() => {
        this.metrics.memoryUsage = performance.memory.usedJSHeapSize;
        this.checkMemoryUsage();
      }, 30000); // Check every 30 seconds
    }

    // Clean up old messages
    this.setupMessageCleanup();

    // Clean up event listeners
    this.setupEventListenerCleanup();
  }

  /**
   * Check memory usage and clean up if needed
   */
  checkMemoryUsage() {
    if (!performance.memory) return;

    const usedMemory = performance.memory.usedJSHeapSize;
    const totalMemory = performance.memory.totalJSHeapSize;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    if (memoryUsagePercent > 80) {
      console.warn('High memory usage detected, performing cleanup...');
      this.performMemoryCleanup();
    }
  }

  /**
   * Perform memory cleanup
   */
  performMemoryCleanup() {
    // Clean up old messages
    if (chatState && chatState.messages.length > 500) {
      const messagesToRemove = chatState.messages.length - 300;
      chatState.messages.splice(0, messagesToRemove);
      console.log(`Cleaned up ${messagesToRemove} old messages`);
    }

    // Clear avatar cache
    if (avatarGenerator) {
      avatarGenerator.clearCache();
      console.log('Cleared avatar cache');
    }

    // Clear performance metrics
    if (messagePerformanceManager) {
      messagePerformanceManager.clearOldMetrics();
      console.log('Cleared old performance metrics');
    }

    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }

  /**
   * Setup message cleanup
   */
  setupMessageCleanup() {
    // Clean up messages periodically
    setInterval(() => {
      if (chatState && chatState.messages.length > 1000) {
        const messagesToKeep = 500;
        const removedMessages = chatState.messages.splice(0, chatState.messages.length - messagesToKeep);
        console.log(`Cleaned up ${removedMessages.length} old messages`);
      }
    }, 60000); // Every minute
  }

  /**
   * Setup event listener cleanup
   */
  setupEventListenerCleanup() {
    // Track event listeners for cleanup
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const eventListeners = new WeakMap();

    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (!eventListeners.has(this)) {
        eventListeners.set(this, []);
      }
      eventListeners.get(this).push({ type, listener, options });
      return originalAddEventListener.call(this, type, listener, options);
    };

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanupEventListeners();
    });
  }

  /**
   * Cleanup event listeners
   */
  cleanupEventListeners() {
    // Cleanup observers
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();

    console.log('Cleaned up event listeners and observers');
  }

  /**
   * Setup network optimizations
   */
  setupNetworkOptimizations() {
    // Implement request batching
    this.setupRequestBatching();

    // Setup connection monitoring
    this.setupConnectionMonitoring();

    // Implement offline support
    this.setupOfflineSupport();
  }

  /**
   * Setup request batching
   */
  setupRequestBatching() {
    this.requestQueue = [];
    this.batchTimeout = null;

    // Batch requests every 100ms
    this.batchRequests = () => {
      if (this.requestQueue.length === 0) return;

      const requests = [...this.requestQueue];
      this.requestQueue = [];

      // Send batched requests
      this.sendBatchedRequests(requests);
    };
  }

  /**
   * Send batched requests
   */
  sendBatchedRequests(requests) {
    // Implementation would batch multiple requests into one
    console.log(`Sending ${requests.length} batched requests`);
  }

  /**
   * Setup connection monitoring
   */
  setupConnectionMonitoring() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      const updateConnectionInfo = () => {
        const connectionType = connection.effectiveType;
        const downlink = connection.downlink;
        
        // Adjust performance based on connection
        if (connectionType === 'slow-2g' || connectionType === '2g') {
          this.enableLowBandwidthMode();
        } else {
          this.disableLowBandwidthMode();
        }
      };

      connection.addEventListener('change', updateConnectionInfo);
      updateConnectionInfo(); // Initial check
    }
  }

  /**
   * Enable low bandwidth mode
   */
  enableLowBandwidthMode() {
    document.documentElement.classList.add('low-bandwidth');
    console.log('Low bandwidth mode enabled');
  }

  /**
   * Disable low bandwidth mode
   */
  disableLowBandwidthMode() {
    document.documentElement.classList.remove('low-bandwidth');
    console.log('Low bandwidth mode disabled');
  }

  /**
   * Setup offline support
   */
  setupOfflineSupport() {
    window.addEventListener('online', () => {
      console.log('Connection restored');
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      console.log('Connection lost, enabling offline mode');
      this.enableOfflineMode();
    });
  }

  /**
   * Enable offline mode
   */
  enableOfflineMode() {
    document.documentElement.classList.add('offline-mode');
    
    // Show offline indicator
    const offlineIndicator = document.createElement('div');
    offlineIndicator.id = 'offline-indicator';
    offlineIndicator.className = 'offline-indicator';
    offlineIndicator.textContent = '离线模式';
    document.body.appendChild(offlineIndicator);
  }

  /**
   * Sync offline data
   */
  syncOfflineData() {
    document.documentElement.classList.remove('offline-mode');
    
    // Remove offline indicator
    const offlineIndicator = document.getElementById('offline-indicator');
    if (offlineIndicator) {
      offlineIndicator.remove();
    }

    // Sync any offline data
    console.log('Syncing offline data...');
  }

  /**
   * Escape HTML for security
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      optimizations: Array.from(this.optimizations),
      timestamp: Date.now()
    };
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const metrics = this.getMetrics();
    const report = {
      loadTime: `${metrics.loadTime}ms`,
      renderTime: `${metrics.renderTime}ms`,
      interactionTime: `${metrics.interactionTime}ms`,
      memoryUsage: performance.memory ? `${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB` : 'N/A',
      optimizations: metrics.optimizations,
      recommendations: this.getRecommendations()
    };

    console.log('📊 Performance Report:', report);
    return report;
  }

  /**
   * Get performance recommendations
   */
  getRecommendations() {
    const recommendations = [];

    if (this.metrics.loadTime > 3000) {
      recommendations.push('Consider reducing initial bundle size');
    }

    if (this.metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
      recommendations.push('High memory usage detected, consider cleanup');
    }

    if (chatState && chatState.messages.length > 500) {
      recommendations.push('Consider implementing message pagination');
    }

    return recommendations;
  }
}

// Initialize performance optimizer
window.performanceOptimizer = new PerformanceOptimizer();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    performanceOptimizer.init();
  });
} else {
  performanceOptimizer.init();
}