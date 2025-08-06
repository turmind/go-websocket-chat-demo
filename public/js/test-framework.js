/**
 * Simple Test Framework for Modern Chat Application
 * Provides basic testing utilities for unit testing JavaScript components
 */

class TestFramework {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      total: 0
    };
    this.currentSuite = null;
  }

  /**
   * Create a test suite
   * @param {string} name - Suite name
   * @param {Function} callback - Suite callback function
   */
  describe(name, callback) {
    this.currentSuite = name;
    console.group(`📋 Test Suite: ${name}`);
    callback();
    console.groupEnd();
    this.currentSuite = null;
  }

  /**
   * Create a test case
   * @param {string} description - Test description
   * @param {Function} testFunction - Test function
   */
  it(description, testFunction) {
    const testName = this.currentSuite ? `${this.currentSuite} - ${description}` : description;
    
    try {
      testFunction();
      this.results.passed++;
      console.log(`✅ ${testName}`);
    } catch (error) {
      this.results.failed++;
      console.error(`❌ ${testName}`);
      console.error(`   Error: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack: ${error.stack}`);
      }
    }
    
    this.results.total++;
  }

  /**
   * Assert that a condition is true
   * @param {boolean} condition - Condition to test
   * @param {string} message - Error message if assertion fails
   */
  assert(condition, message = 'Assertion failed') {
    if (!condition) {
      throw new Error(message);
    }
  }

  /**
   * Assert that two values are equal
   * @param {*} actual - Actual value
   * @param {*} expected - Expected value
   * @param {string} message - Error message if assertion fails
   */
  assertEqual(actual, expected, message) {
    const defaultMessage = `Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`;
    this.assert(actual === expected, message || defaultMessage);
  }

  /**
   * Assert that two objects are deeply equal
   * @param {*} actual - Actual value
   * @param {*} expected - Expected value
   * @param {string} message - Error message if assertion fails
   */
  assertDeepEqual(actual, expected, message) {
    const defaultMessage = `Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`;
    this.assert(JSON.stringify(actual) === JSON.stringify(expected), message || defaultMessage);
  }

  /**
   * Assert that a value is truthy
   * @param {*} value - Value to test
   * @param {string} message - Error message if assertion fails
   */
  assertTruthy(value, message) {
    const defaultMessage = `Expected truthy value, but got ${JSON.stringify(value)}`;
    this.assert(!!value, message || defaultMessage);
  }

  /**
   * Assert that a value is falsy
   * @param {*} value - Value to test
   * @param {string} message - Error message if assertion fails
   */
  assertFalsy(value, message) {
    const defaultMessage = `Expected falsy value, but got ${JSON.stringify(value)}`;
    this.assert(!value, message || defaultMessage);
  }

  /**
   * Assert that a function throws an error
   * @param {Function} fn - Function to test
   * @param {string} expectedMessage - Expected error message (optional)
   * @param {string} message - Error message if assertion fails
   */
  assertThrows(fn, expectedMessage, message) {
    let threw = false;
    let actualError = null;
    
    try {
      fn();
    } catch (error) {
      threw = true;
      actualError = error;
    }
    
    this.assert(threw, message || 'Expected function to throw an error');
    
    if (expectedMessage && actualError) {
      this.assert(
        actualError.message.includes(expectedMessage),
        `Expected error message to contain "${expectedMessage}", but got "${actualError.message}"`
      );
    }
  }

  /**
   * Assert that a value is of a specific type
   * @param {*} value - Value to test
   * @param {string} expectedType - Expected type
   * @param {string} message - Error message if assertion fails
   */
  assertType(value, expectedType, message) {
    const actualType = typeof value;
    const defaultMessage = `Expected type ${expectedType}, but got ${actualType}`;
    this.assert(actualType === expectedType, message || defaultMessage);
  }

  /**
   * Assert that a value is an instance of a specific class
   * @param {*} value - Value to test
   * @param {Function} expectedClass - Expected class constructor
   * @param {string} message - Error message if assertion fails
   */
  assertInstanceOf(value, expectedClass, message) {
    const defaultMessage = `Expected instance of ${expectedClass.name}, but got ${value.constructor.name}`;
    this.assert(value instanceof expectedClass, message || defaultMessage);
  }

  /**
   * Create a mock function that tracks calls
   * @param {Function} implementation - Optional implementation
   * @returns {Function} Mock function
   */
  createMock(implementation) {
    const mock = function(...args) {
      mock.calls.push(args);
      mock.callCount++;
      if (implementation) {
        return implementation.apply(this, args);
      }
    };
    
    mock.calls = [];
    mock.callCount = 0;
    mock.reset = () => {
      mock.calls = [];
      mock.callCount = 0;
    };
    
    return mock;
  }

  /**
   * Create a spy that wraps an existing function
   * @param {Object} object - Object containing the method
   * @param {string} methodName - Method name to spy on
   * @returns {Function} Spy function
   */
  createSpy(object, methodName) {
    const originalMethod = object[methodName];
    const spy = this.createMock(originalMethod);
    
    object[methodName] = spy;
    spy.restore = () => {
      object[methodName] = originalMethod;
    };
    
    return spy;
  }

  /**
   * Run all tests and display results
   */
  runTests() {
    console.log('\n🧪 Running Unit Tests...\n');
    
    // Reset results
    this.results = { passed: 0, failed: 0, total: 0 };
    
    // Run tests (tests are executed when defined)
    
    // Display final results
    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Total: ${this.results.total}`);
    
    const successRate = this.results.total > 0 ? (this.results.passed / this.results.total * 100).toFixed(1) : 0;
    console.log(`🎯 Success Rate: ${successRate}%`);
    
    if (this.results.failed === 0) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('⚠️ Some tests failed. Please check the errors above.');
    }
    
    return this.results;
  }

  /**
   * Setup DOM testing environment
   */
  setupDOMTesting() {
    // Create a test container in the DOM
    let testContainer = document.getElementById('test-container');
    if (!testContainer) {
      testContainer = document.createElement('div');
      testContainer.id = 'test-container';
      testContainer.style.display = 'none';
      document.body.appendChild(testContainer);
    }
    
    return testContainer;
  }

  /**
   * Clean up DOM testing environment
   */
  cleanupDOMTesting() {
    const testContainer = document.getElementById('test-container');
    if (testContainer) {
      testContainer.innerHTML = '';
    }
  }

  /**
   * Wait for a condition to be true (for async testing)
   * @param {Function} condition - Condition function
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise} Promise that resolves when condition is true
   */
  waitFor(condition, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(check, 10);
        }
      };
      
      check();
    });
  }
}

// Create global test framework instance
const testFramework = new TestFramework();

// Export common testing functions globally
window.describe = testFramework.describe.bind(testFramework);
window.it = testFramework.it.bind(testFramework);
window.assert = testFramework.assert.bind(testFramework);
window.assertEqual = testFramework.assertEqual.bind(testFramework);
window.assertDeepEqual = testFramework.assertDeepEqual.bind(testFramework);
window.assertTruthy = testFramework.assertTruthy.bind(testFramework);
window.assertFalsy = testFramework.assertFalsy.bind(testFramework);
window.assertThrows = testFramework.assertThrows.bind(testFramework);
window.assertType = testFramework.assertType.bind(testFramework);
window.assertInstanceOf = testFramework.assertInstanceOf.bind(testFramework);
window.createMock = testFramework.createMock.bind(testFramework);
window.createSpy = testFramework.createSpy.bind(testFramework);
window.waitFor = testFramework.waitFor.bind(testFramework);

// Export test framework
window.testFramework = testFramework;