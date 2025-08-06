/**
 * Test Validation Script
 * Validates that the test framework and core components are working correctly
 */

// Simple validation function to check if tests can run
function validateTestEnvironment() {
  const results = {
    framework: false,
    models: false,
    dom: false,
    errors: []
  };
  
  try {
    // Test framework validation
    if (typeof testFramework !== 'undefined' && 
        typeof describe === 'function' && 
        typeof it === 'function') {
      results.framework = true;
    } else {
      results.errors.push('Test framework not properly loaded');
    }
    
    // Model validation
    if (typeof User !== 'undefined' && 
        typeof Message !== 'undefined' && 
        typeof ChatState !== 'undefined' && 
        typeof AvatarGenerator !== 'undefined') {
      results.models = true;
    } else {
      results.errors.push('Core models not properly loaded');
    }
    
    // DOM validation
    if (typeof document !== 'undefined' && document.body) {
      results.dom = true;
    } else {
      results.errors.push('DOM not available');
    }
    
  } catch (error) {
    results.errors.push(`Validation error: ${error.message}`);
  }
  
  return results;
}

// Quick smoke test for core functionality
function runSmokeTests() {
  const smokeResults = {
    passed: 0,
    failed: 0,
    errors: []
  };
  
  try {
    // Test User model
    const user = new User('testuser');
    if (user.handle === 'testuser' && typeof user.id === 'string') {
      smokeResults.passed++;
    } else {
      smokeResults.failed++;
      smokeResults.errors.push('User model smoke test failed');
    }
    
    // Test Message model
    const message = new Message('testuser', 'Hello');
    if (message.handle === 'testuser' && message.text === 'Hello') {
      smokeResults.passed++;
    } else {
      smokeResults.failed++;
      smokeResults.errors.push('Message model smoke test failed');
    }
    
    // Test ChatState
    const chatState = new ChatState();
    if (chatState.users instanceof Map && Array.isArray(chatState.messages)) {
      smokeResults.passed++;
    } else {
      smokeResults.failed++;
      smokeResults.errors.push('ChatState smoke test failed');
    }
    
    // Test AvatarGenerator
    const avatarGen = new AvatarGenerator();
    const avatar = avatarGen.generateAvatar('testuser');
    if (avatar && avatar.type && avatar.initial) {
      smokeResults.passed++;
    } else {
      smokeResults.failed++;
      smokeResults.errors.push('AvatarGenerator smoke test failed');
    }
    
  } catch (error) {
    smokeResults.failed++;
    smokeResults.errors.push(`Smoke test error: ${error.message}`);
  }
  
  return smokeResults;
}

// Export validation functions
window.validateTestEnvironment = validateTestEnvironment;
window.runSmokeTests = runSmokeTests;

// Auto-run validation when script loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔍 Running test environment validation...');
  
  const validation = validateTestEnvironment();
  const smokeTests = runSmokeTests();
  
  console.log('📊 Validation Results:');
  console.log(`  Framework: ${validation.framework ? '✅' : '❌'}`);
  console.log(`  Models: ${validation.models ? '✅' : '❌'}`);
  console.log(`  DOM: ${validation.dom ? '✅' : '❌'}`);
  
  console.log('🚀 Smoke Test Results:');
  console.log(`  Passed: ${smokeTests.passed}`);
  console.log(`  Failed: ${smokeTests.failed}`);
  
  if (validation.errors.length > 0) {
    console.log('⚠️ Validation Errors:');
    validation.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (smokeTests.errors.length > 0) {
    console.log('⚠️ Smoke Test Errors:');
    smokeTests.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  const allPassed = validation.framework && validation.models && validation.dom && smokeTests.failed === 0;
  console.log(`\n${allPassed ? '🎉' : '⚠️'} Test environment ${allPassed ? 'ready' : 'has issues'}`);
});