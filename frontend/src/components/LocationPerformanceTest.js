// components/LocationPerformanceTest.js - Optional Testing Component
// Location: /frontend/src/components/LocationPerformanceTest.js

import React, { useState, useEffect } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';

const LocationPerformanceTest = () => {
  const [testStartTime, setTestStartTime] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [isRunningTest, setIsRunningTest] = useState(false);

  const {
    location,
    loading,
    error,
    hasLocation,
    isHighAccuracy,
    qualityText,
    sourceText,
    detectionMethod,
    refreshLocation,
    getPreciseLocation,
    detectionTime
  } = useGeolocation();

  // Start performance test
  const startPerformanceTest = () => {
    setIsRunningTest(true);
    setTestStartTime(Date.now());
    setTestResults([]);
    
    console.log('🚀 Starting location performance test...');
    refreshLocation();
  };

  // Record test result when location is detected
  useEffect(() => {
    if (hasLocation && testStartTime && isRunningTest) {
      const totalTime = Date.now() - testStartTime;
      
      const result = {
        timestamp: new Date().toISOString(),
        detectionTime: totalTime,
        method: detectionMethod,
        source: sourceText,
        quality: qualityText,
        accuracy: location?.accuracy,
        latitude: location?.latitude,
        longitude: location?.longitude,
        isHighAccuracy,
        success: true
      };

      setTestResults(prev => [...prev, result]);
      setIsRunningTest(false);
      
      console.log('✅ Performance test completed:', result);
    }
  }, [hasLocation, testStartTime, isRunningTest, detectionMethod, sourceText, qualityText, location, isHighAccuracy]);

  // Record error result
  useEffect(() => {
    if (error && testStartTime && isRunningTest) {
      const totalTime = Date.now() - testStartTime;
      
      const result = {
        timestamp: new Date().toISOString(),
        detectionTime: totalTime,
        error: error,
        success: false
      };

      setTestResults(prev => [...prev, result]);
      setIsRunningTest(false);
      
      console.log('❌ Performance test failed:', result);
    }
  }, [error, testStartTime, isRunningTest]);

  const getAverageDetectionTime = () => {
    const successfulTests = testResults.filter(r => r.success);
    if (successfulTests.length === 0) return 0;
    
    const total = successfulTests.reduce((sum, result) => sum + result.detectionTime, 0);
    return Math.round(total / successfulTests.length);
  };

  const getSuccessRate = () => {
    if (testResults.length === 0) return 0;
    const successful = testResults.filter(r => r.success).length;
    return Math.round((successful / testResults.length) * 100);
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '16px',
      borderRadius: '12px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 10000,
      maxWidth: '300px',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    }}>
      <div style={{ 
        color: '#00ff88', 
        fontWeight: 'bold', 
        marginBottom: '12px',
        fontSize: '14px'
      }}>
        🚀 Location Performance Test
      </div>
      
      {/* Current Status */}
      <div style={{ marginBottom: '12px' }}>
        <div>Status: {loading ? '🔄 Detecting...' : hasLocation ? '✅ Located' : error ? '❌ Failed' : '⏳ Ready'}</div>
        <div>Method: {detectionMethod || 'None'}</div>
        <div>Source: {sourceText || 'None'}</div>
        <div>Quality: {qualityText || 'None'}</div>
        {location && (
          <>
            <div>Accuracy: {Math.round(location.accuracy)}m</div>
            <div>Coords: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</div>
          </>
        )}
        {detectionTime && <div>Time: {detectionTime}ms</div>}
      </div>

      {/* Test Controls */}
      <div style={{ marginBottom: '12px' }}>
        <button
          onClick={startPerformanceTest}
          disabled={isRunningTest}
          style={{
            background: '#00ff88',
            color: 'black',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: isRunningTest ? 'not-allowed' : 'pointer',
            marginRight: '8px',
            opacity: isRunningTest ? 0.6 : 1
          }}
        >
          {isRunningTest ? 'Testing...' : 'Run Test'}
        </button>
        
        <button
          onClick={getPreciseLocation}
          disabled={loading || !hasLocation}
          style={{
            background: '#ff6b6b',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: (loading || !hasLocation) ? 'not-allowed' : 'pointer',
            opacity: (loading || !hasLocation) ? 0.6 : 1
          }}
        >
          🎯 Precise
        </button>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div>
          <div style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px',
            color: '#ffd93d'
          }}>
            📊 Test Results ({testResults.length} runs)
          </div>
          <div>Avg Time: {getAverageDetectionTime()}ms</div>
          <div>Success Rate: {getSuccessRate()}%</div>
          
          {/* Last 3 Results */}
          <div style={{ marginTop: '8px', fontSize: '11px' }}>
            {testResults.slice(-3).reverse().map((result, index) => (
              <div key={index} style={{ 
                marginBottom: '4px',
                color: result.success ? '#00ff88' : '#ff6b6b'
              }}>
                {result.success ? '✅' : '❌'} {result.detectionTime}ms - {result.method || result.error}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{ 
          marginTop: '8px',
          padding: '8px',
          background: 'rgba(255, 107, 107, 0.2)',
          borderRadius: '4px',
          fontSize: '11px'
        }}>
          ❌ {error}
        </div>
      )}
    </div>
  );
};

export default LocationPerformanceTest;