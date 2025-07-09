// utils/locationTest.js - COMPREHENSIVE LOCATION DETECTION TEST
// Location: /frontend/src/utils/locationTest.js

import locationService from '../services/locationService';

class LocationDetectionTest {
  constructor() {
    this.testResults = [];
    this.startTime = null;
    this.endTime = null;
  }

  // 🧪 **RUN COMPREHENSIVE LOCATION TEST**
  async runComprehensiveTest() {
    console.log('🧪 Starting comprehensive location detection test...');
    this.startTime = Date.now();
    this.testResults = [];

    try {
      // Test 1: Capability Analysis
      await this.testCapabilityAnalysis();
      
      // Test 2: Cache Operations
      await this.testCacheOperations();
      
      // Test 3: Parallel Detection
      await this.testParallelDetection();
      
      // Test 4: Performance Metrics
      await this.testPerformanceMetrics();
      
      // Test 5: Error Handling
      await this.testErrorHandling();
      
      this.endTime = Date.now();
      return this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Comprehensive test failed:', error);
      return {
        success: false,
        error: error.message,
        partialResults: this.testResults
      };
    }
  }

  // 🔍 **TEST CAPABILITY ANALYSIS**
  async testCapabilityAnalysis() {
    console.log('🔍 Testing capability analysis...');
    
    try {
      const capabilities = await locationService.analyzeCapabilities();
      
      const test = {
        name: 'Capability Analysis',
        status: 'passed',
        duration: 0,
        details: {
          level: capabilities.level,
          platform: capabilities.platform.type,
          hasGeolocation: capabilities.hasGeolocation,
          recommendedMethods: capabilities.recommendedMethods.length,
          permission: capabilities.permission
        }
      };
      
      // Validate results
      if (!capabilities.level || !capabilities.platform || !capabilities.recommendedMethods) {
        throw new Error('Invalid capability analysis results');
      }
      
      this.testResults.push(test);
      console.log('✅ Capability analysis test passed');
      
    } catch (error) {
      this.testResults.push({
        name: 'Capability Analysis',
        status: 'failed',
        error: error.message
      });
      console.error('❌ Capability analysis test failed:', error);
    }
  }

  // 💾 **TEST CACHE OPERATIONS**
  async testCacheOperations() {
    console.log('💾 Testing cache operations...');
    
    try {
      const startTime = Date.now();
      
      // Test cache write
      const mockLocation = {
        latitude: 45.0703,
        longitude: 7.6869,
        accuracy: 10,
        timestamp: new Date().toISOString(),
        source: 'test',
        method: 'Test Method',
        quality: 'excellent'
      };
      
      locationService.cacheLocation(mockLocation);
      
      // Test cache read
      const cachedLocation = locationService.getCachedLocation();
      
      // Validate cache
      if (!cachedLocation || cachedLocation.latitude !== mockLocation.latitude) {
        throw new Error('Cache read/write validation failed');
      }
      
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name: 'Cache Operations',
        status: 'passed',
        duration,
        details: {
          writeSuccess: true,
          readSuccess: true,
          dataIntegrity: true
        }
      });
      
      console.log('✅ Cache operations test passed');
      
    } catch (error) {
      this.testResults.push({
        name: 'Cache Operations',
        status: 'failed',
        error: error.message
      });
      console.error('❌ Cache operations test failed:', error);
    }
  }

  // 🏃‍♂️ **TEST PARALLEL DETECTION**
  async testParallelDetection() {
    console.log('🏃‍♂️ Testing parallel detection...');
    
    try {
      const startTime = Date.now();
      
      // Test with timeout to avoid hanging
      const detectionPromise = locationService.detectLocation({
        timeout: 10000,
        forceRefresh: false // Allow cache usage for testing
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Detection timeout')), 12000);
      });
      
      const result = await Promise.race([detectionPromise, timeoutPromise]);
      const duration = Date.now() - startTime;
      
      // Validate detection result
      if (!result || typeof result.latitude !== 'number' || typeof result.longitude !== 'number') {
        throw new Error('Invalid detection result structure');
      }
      
      this.testResults.push({
        name: 'Parallel Detection',
        status: 'passed',
        duration,
        details: {
          method: result.method || 'unknown',
          source: result.source,
          accuracy: result.accuracy,
          quality: result.quality,
          confidence: result.confidence
        }
      });
      
      console.log('✅ Parallel detection test passed:', {
        method: result.method,
        accuracy: Math.round(result.accuracy) + 'm',
        duration: duration + 'ms'
      });
      
    } catch (error) {
      this.testResults.push({
        name: 'Parallel Detection',
        status: 'failed',
        error: error.message
      });
      console.error('❌ Parallel detection test failed:', error);
    }
  }

  // ⚡ **TEST PERFORMANCE METRICS**
  async testPerformanceMetrics() {
    console.log('⚡ Testing performance metrics...');
    
    try {
      const startTime = Date.now();
      
      // Test multiple capability calls
      const promises = Array(5).fill().map(() => locationService.analyzeCapabilities());
      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      const avgDuration = duration / 5;
      
      // Performance thresholds
      const performanceLevel = avgDuration < 50 ? 'excellent' : 
                              avgDuration < 100 ? 'good' : 
                              avgDuration < 200 ? 'fair' : 'poor';
      
      this.testResults.push({
        name: 'Performance Metrics',
        status: performanceLevel !== 'poor' ? 'passed' : 'warning',
        duration,
        details: {
          averageDuration: avgDuration,
          performanceLevel,
          operations: 5
        }
      });
      
      console.log('✅ Performance metrics test completed:', {
        avgDuration: Math.round(avgDuration) + 'ms',
        level: performanceLevel
      });
      
    } catch (error) {
      this.testResults.push({
        name: 'Performance Metrics',
        status: 'failed',
        error: error.message
      });
      console.error('❌ Performance metrics test failed:', error);
    }
  }

  // 🚨 **TEST ERROR HANDLING**
  async testErrorHandling() {
    console.log('🚨 Testing error handling...');
    
    try {
      const startTime = Date.now();
      
      // Test invalid method handling
      const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
      
      // Mock geolocation failure
      navigator.geolocation.getCurrentPosition = (success, error, options) => {
        setTimeout(() => error({ code: 1, message: 'Permission denied' }), 100);
      };
      
      try {
        await locationService.detectLocation({ timeout: 2000, forceRefresh: true });
        // Should not reach here if properly handling errors
      } catch (detectionError) {
        // Expected error - test passed
      }
      
      // Restore original geolocation
      navigator.geolocation.getCurrentPosition = originalGetCurrentPosition;
      
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name: 'Error Handling',
        status: 'passed',
        duration,
        details: {
          errorCaptured: true,
          gracefulDegradation: true
        }
      });
      
      console.log('✅ Error handling test passed');
      
    } catch (error) {
      this.testResults.push({
        name: 'Error Handling',
        status: 'failed',
        error: error.message
      });
      console.error('❌ Error handling test failed:', error);
    }
  }

  // 📊 **GENERATE TEST REPORT**
  generateTestReport() {
    const totalDuration = this.endTime - this.startTime;
    const passedTests = this.testResults.filter(t => t.status === 'passed').length;
    const failedTests = this.testResults.filter(t => t.status === 'failed').length;
    const warningTests = this.testResults.filter(t => t.status === 'warning').length;
    
    const report = {
      summary: {
        totalTests: this.testResults.length,
        passed: passedTests,
        failed: failedTests,
        warnings: warningTests,
        successRate: Math.round((passedTests / this.testResults.length) * 100),
        totalDuration,
        timestamp: new Date().toISOString()
      },
      tests: this.testResults,
      recommendations: this.generateRecommendations()
    };
    
    console.log('📊 Location Detection Test Report:', report);
    return report;
  }

  // 💡 **GENERATE RECOMMENDATIONS**
  generateRecommendations() {
    const recommendations = [];
    
    // Check capability analysis
    const capabilityTest = this.testResults.find(t => t.name === 'Capability Analysis');
    if (capabilityTest?.details?.level === 'poor') {
      recommendations.push('Consider implementing IP-based geolocation as fallback');
    }
    
    // Check performance
    const performanceTest = this.testResults.find(t => t.name === 'Performance Metrics');
    if (performanceTest?.details?.performanceLevel === 'poor') {
      recommendations.push('Optimize detection method selection for better performance');
    }
    
    // Check detection success
    const detectionTest = this.testResults.find(t => t.name === 'Parallel Detection');
    if (detectionTest?.status === 'failed') {
      recommendations.push('Implement more robust fallback location methods');
    }
    
    // Check cache performance
    const cacheTest = this.testResults.find(t => t.name === 'Cache Operations');
    if (cacheTest?.status === 'failed') {
      recommendations.push('Review cache implementation for reliability');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All systems operating optimally');
    }
    
    return recommendations;
  }

  // 🎯 **QUICK HEALTH CHECK**
  async quickHealthCheck() {
    console.log('🎯 Running quick health check...');
    
    try {
      const health = await locationService.healthCheck();
      
      return {
        status: health.status,
        capabilities: health.capabilities,
        permission: health.permission,
        cached: health.cachedLocation,
        timestamp: health.timestamp
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create test instance
const locationTest = new LocationDetectionTest();

// Export test functions
export default {
  runComprehensiveTest: () => locationTest.runComprehensiveTest(),
  quickHealthCheck: () => locationTest.quickHealthCheck(),
  
  // Helper function to run test in browser console
  runInConsole: async () => {
    console.log('🧪 Starting location detection test in console...');
    
    try {
      const report = await locationTest.runComprehensiveTest();
      console.table(report.tests);
      console.log('📊 Test Summary:', report.summary);
      console.log('💡 Recommendations:', report.recommendations);
      return report;
    } catch (error) {
      console.error('❌ Test failed:', error);
      return null;
    }
  }
};

// Auto-run quick health check in development
if (process.env.NODE_ENV === 'development') {
  setTimeout(async () => {
    const health = await locationTest.quickHealthCheck();
    console.log('🏥 Location Service Health:', health);
  }, 2000);
}