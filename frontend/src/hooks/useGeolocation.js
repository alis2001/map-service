// hooks/useGeolocation.js - FULLY AUTOMATIC LOCATION DETECTION
// Location: /frontend/src/hooks/useGeolocation.js

import { useState, useEffect, useCallback, useRef } from 'react';

export const useGeolocation = () => {
  // Core states
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Detection states (simplified)
  const [detectionMethod, setDetectionMethod] = useState('detecting');
  const [detectionPhase, setDetectionPhase] = useState('initializing');
  const [locationCapability, setLocationCapability] = useState('unknown');
  
  // Refs for tracking
  const detectionCompletedRef = useRef(false);
  const watchIdRef = useRef(null);

  // 🎯 **OPTIMIZED DETECTION CONFIGURATION**
  const DETECTION_CONFIG = {
    // Reduced timeout for faster results
    methods: {
      gps_fast: {
        name: 'GPS Fast',
        priority: 1,
        timeout: 8000, // Reduced from 15000
        options: { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      },
      browser_quick: {
        name: 'Browser Quick',
        priority: 2,
        timeout: 5000, // Reduced from 10000
        options: { enableHighAccuracy: false, timeout: 5000, maximumAge: 120000 }
      },
      cached_fallback: {
        name: 'Cached Fallback',
        priority: 3,
        timeout: 2000, // Very fast fallback
        options: { enableHighAccuracy: false, timeout: 2000, maximumAge: 600000 }
      }
    },
    
    // Quality thresholds (simplified)
    accuracy: {
      excellent: 50,    // More lenient for faster results
      good: 200,
      acceptable: 1000,
      poor: 5000
    }
  };

  // 🔍 **QUICK CAPABILITY CHECK**
  const checkCapabilities = useCallback(() => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasGeolocation = !!navigator.geolocation;
    
    let capability = 'limited';
    if (hasGeolocation) {
      capability = isMobile ? 'excellent' : 'good';
    }
    
    setLocationCapability(capability);
    return capability;
  }, []);

  // 🏃‍♂️ **FAST PARALLEL DETECTION**
  const runAutomaticDetection = useCallback(async () => {
    if (detectionCompletedRef.current) return;

    console.log('🏁 Starting automatic location detection...');
    setDetectionPhase('detecting');
    setLoading(true);

    // Check for cached location first
    const cached = getCachedLocation();
    if (cached && isLocationFresh(cached, 10 * 60 * 1000)) { // 10 minutes fresh
      console.log('📦 Using fresh cached location');
      setLocation(cached);
      setDetectionMethod('cache');
      setError(null);
      setLoading(false);
      setDetectionPhase('completed');
      detectionCompletedRef.current = true;
      return;
    }

    const capability = checkCapabilities();
    
    if (!navigator.geolocation) {
      console.log('❌ Geolocation not supported');
      setError({ code: 'NOT_SUPPORTED', message: 'Geolocation not supported' });
      setLoading(false);
      setDetectionPhase('completed');
      return;
    }

    // Create fast detection promises
    const detectionPromises = [];
    
    // GPS attempt (if mobile)
    if (capability === 'excellent') {
      detectionPromises.push(createDetectionPromise(DETECTION_CONFIG.methods.gps_fast));
    }
    
    // Browser location (always)
    detectionPromises.push(createDetectionPromise(DETECTION_CONFIG.methods.browser_quick));
    
    // Cached fallback (always)
    if (cached) {
      detectionPromises.push(Promise.resolve({
        ...cached,
        source: 'cache',
        method: 'Cached Location',
        quality: 'acceptable'
      }));
    }

    try {
      // Race all methods - first successful wins
      const result = await Promise.race(detectionPromises.filter(p => p));
      
      if (result && !detectionCompletedRef.current) {
        console.log('🏆 Location detected:', {
          method: result.method,
          accuracy: result.accuracy ? Math.round(result.accuracy) + 'm' : 'unknown',
          source: result.source
        });

        detectionCompletedRef.current = true;
        setLocation(result);
        setDetectionMethod(result.source);
        setError(null);
        setLoading(false);
        setDetectionPhase('completed');

        // Cache successful result
        cacheLocation(result);
      }

    } catch (detectionError) {
      console.log('⚠️ All detection methods failed, using fallback or continuing without location');
      
      if (cached) {
        // Use stale cache as last resort
        setLocation({ ...cached, source: 'cache', isStale: true });
        setDetectionMethod('cache');
      } else {
        setError({ 
          code: 'DETECTION_FAILED', 
          message: 'Could not detect location automatically' 
        });
      }
      
      setLoading(false);
      setDetectionPhase('completed');
      detectionCompletedRef.current = true;
    }
  }, [checkCapabilities]);

  // 🎯 **CREATE DETECTION PROMISE**
  const createDetectionPromise = (methodConfig) => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`${methodConfig.name} timeout`));
      }, methodConfig.timeout);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          
          const coords = position.coords;
          const locationData = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            heading: coords.heading,
            speed: coords.speed,
            timestamp: new Date().toISOString(),
            source: methodConfig.name.toLowerCase().includes('gps') ? 'gps' : 'browser',
            method: methodConfig.name,
            quality: determineLocationQuality(coords.accuracy),
            detectionTime: Date.now()
          };

          resolve(locationData);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        methodConfig.options
      );
    });
  };

  // 🎯 **DETERMINE LOCATION QUALITY**
  const determineLocationQuality = (accuracy) => {
    if (!accuracy) return 'unknown';
    if (accuracy < DETECTION_CONFIG.accuracy.excellent) return 'excellent';
    if (accuracy < DETECTION_CONFIG.accuracy.good) return 'good';
    if (accuracy < DETECTION_CONFIG.accuracy.acceptable) return 'acceptable';
    return 'poor';
  };

  // 💾 **CACHE OPERATIONS**
  const cacheLocation = (location) => {
    try {
      const cacheEntry = {
        ...location,
        cachedAt: Date.now(),
        expiresAt: Date.now() + (15 * 60 * 1000) // 15 minutes
      };
      localStorage.setItem('auto_location_cache', JSON.stringify(cacheEntry));
    } catch (e) {
      console.warn('Failed to cache location:', e);
    }
  };

  const getCachedLocation = () => {
    try {
      const stored = localStorage.getItem('auto_location_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.expiresAt > Date.now()) {
          return parsed;
        } else {
          localStorage.removeItem('auto_location_cache');
        }
      }
    } catch (e) {
      console.warn('Failed to get cached location:', e);
    }
    return null;
  };

  const isLocationFresh = (location, maxAge) => {
    return location && location.cachedAt && (Date.now() - location.cachedAt) < maxAge;
  };

  // 🎬 **AUTO-START DETECTION ON MOUNT**
  useEffect(() => {
    runAutomaticDetection();
    
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [runAutomaticDetection]);

  // 📊 **RETURN SIMPLIFIED GEOLOCATION DATA**
  return {
    // Core data
    location,
    loading,
    error,
    
    // Detection information (simplified)
    detectionMethod,
    detectionPhase,
    locationCapability,
    
    // Computed values
    hasLocation: !!location,
    isHighAccuracy: location?.accuracy && location.accuracy < DETECTION_CONFIG.accuracy.excellent,
    qualityText: location?.quality || 'unknown',
    sourceText: location?.source === 'gps' ? 'GPS' : 
                location?.source === 'browser' ? 'Browser' :
                location?.source === 'cache' ? 'Cache' : 'Unknown',
    
    // Status helpers
    isDetecting: detectionPhase === 'detecting',
    isCompleted: detectionPhase === 'completed',
    
    // Manual refresh function (hidden from UI but available)
    requestLocation: runAutomaticDetection,
    requestFreshGPS: runAutomaticDetection, // Same as regular detection
    clearPermissionDenied: () => {
      setError(null);
      detectionCompletedRef.current = false;
      runAutomaticDetection();
    },
    
    // Debug info (minimal)
    debugInfo: {
      detectionMethod,
      capability: locationCapability,
      phase: detectionPhase,
      completed: detectionCompletedRef.current
    }
  };
};