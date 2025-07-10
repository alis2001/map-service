// hooks/useGeolocation.js - FIXED - PERMISSION AWARE INSTANT DETECTION
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
  const [permissionState, setPermissionState] = useState('prompt');
  
  // Refs for tracking
  const detectionCompletedRef = useRef(false);
  const watchIdRef = useRef(null);
  const permissionRequestedRef = useRef(false);

  // 🎯 **PERMISSION-AWARE DETECTION CONFIGURATION**
  const DETECTION_CONFIG = {
    // Longer timeouts to account for permission prompts
    methods: {
      gps_with_permission: {
        name: 'GPS with Permission',
        priority: 1,
        timeout: 15000, // 15 seconds for permission + location
        options: { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      },
      browser_with_permission: {
        name: 'Browser with Permission',
        priority: 2,
        timeout: 10000, // 10 seconds for permission + location
        options: { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      },
      cached_instant: {
        name: 'Cached Instant',
        priority: 3,
        timeout: 500,
        options: { enableHighAccuracy: false, timeout: 500, maximumAge: 300000 }
      }
    },
    
    // More lenient accuracy thresholds
    accuracy: {
      excellent: 100,
      good: 500,
      acceptable: 2000,
      poor: 10000
    }
  };

  // 🔍 **CHECK PERMISSIONS FIRST**
  const checkPermissions = useCallback(async () => {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionState(permission.state);
        
        // Listen for permission changes
        permission.addEventListener('change', () => {
          console.log('📍 Permission changed to:', permission.state);
          setPermissionState(permission.state);
          
          // If permission was granted, retry detection
          if (permission.state === 'granted' && !detectionCompletedRef.current) {
            console.log('✅ Permission granted, retrying detection...');
            detectionCompletedRef.current = false;
            runPermissionAwareDetection();
          }
        });
        
        console.log('📍 Current permission state:', permission.state);
        return permission.state;
      }
    } catch (e) {
      console.warn('Cannot check permissions:', e);
    }
    return 'prompt';
  }, []);

  // 🔍 **INSTANT CAPABILITY CHECK**
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

  // 🏃‍♂️ **PERMISSION-AWARE DETECTION**
  const runPermissionAwareDetection = useCallback(async () => {
    if (detectionCompletedRef.current) return;

    console.log('🚀 Starting PERMISSION-AWARE location detection...');
    setDetectionPhase('detecting');
    setLoading(true);

    // 1. FIRST: Check for very fresh cached location (under 5 minutes)
    const cached = getCachedLocation();
    if (cached && isLocationFresh(cached, 5 * 60 * 1000)) {
      console.log('⚡ Using fresh cached location - INSTANT RESULT');
      setLocation(cached);
      setDetectionMethod('cache');
      setError(null);
      setLoading(false);
      setDetectionPhase('completed');
      detectionCompletedRef.current = true;
      return;
    }

    // 2. Check capabilities and permissions
    const capability = checkCapabilities();
    const currentPermission = await checkPermissions();
    
    if (!navigator.geolocation) {
      console.log('❌ Geolocation not supported');
      setError({ code: 'NOT_SUPPORTED', message: 'Geolocation not supported' });
      setLoading(false);
      setDetectionPhase('completed');
      return;
    }

    // 3. Handle different permission states
    if (currentPermission === 'denied') {
      console.log('❌ Geolocation permission denied');
      // Use stale cache if available
      if (cached) {
        console.log('📦 Using stale cache due to denied permission');
        setLocation({ ...cached, source: 'cache', isStale: true });
        setDetectionMethod('cache');
        setLoading(false);
        setDetectionPhase('completed');
        detectionCompletedRef.current = true;
        return;
      }
      
      setError({ code: 'PERMISSION_DENIED', message: 'Location access denied' });
      setLoading(false);
      setDetectionPhase('completed');
      return;
    }

    // 4. Try to get location (will prompt if needed)
    console.log('📍 Attempting location detection with permission state:', currentPermission);
    
    try {
      const promises = [];
      
      // Add appropriate detection methods based on capability
      if (capability === 'excellent') {
        promises.push(createPermissionAwarePromise(DETECTION_CONFIG.methods.gps_with_permission));
      }
      
      // Always try browser method
      promises.push(createPermissionAwarePromise(DETECTION_CONFIG.methods.browser_with_permission));
      
      // Add stale cache as fallback
      if (cached) {
        // Delay cache fallback to give real detection a chance
        const cachePromise = new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ...cached,
              source: 'cache',
              method: 'Stale Cache Fallback',
              quality: 'acceptable',
              isStale: true
            });
          }, 8000); // Wait 8 seconds before using stale cache
        });
        promises.push(cachePromise);
      }

      // Race all methods
      const result = await Promise.race(promises.filter(p => p));
      
      if (result && !detectionCompletedRef.current) {
        console.log('🏆 Location detection SUCCESS:', {
          method: result.method,
          accuracy: result.accuracy ? Math.round(result.accuracy) + 'm' : 'unknown',
          source: result.source,
          isStale: result.isStale || false
        });

        detectionCompletedRef.current = true;
        setLocation(result);
        setDetectionMethod(result.source);
        setError(null);
        setLoading(false);
        setDetectionPhase('completed');

        // Cache successful result (only if not stale)
        if (!result.isStale) {
          cacheLocation(result);
        }
      }

    } catch (detectionError) {
      console.log('⚠️ All detection methods failed:', detectionError.message);
      
      // Use any available cache as absolute last resort
      if (cached) {
        console.log('🆘 Using any available cache as last resort');
        setLocation({ ...cached, source: 'cache', isStale: true });
        setDetectionMethod('cache');
      } else {
        setError({ 
          code: 'DETECTION_FAILED', 
          message: 'Could not detect your location. Please enable location access and refresh.' 
        });
      }
      
      setLoading(false);
      setDetectionPhase('completed');
      detectionCompletedRef.current = true;
    }
  }, [checkCapabilities, checkPermissions]);

  // 🎯 **CREATE PERMISSION-AWARE DETECTION PROMISE**
  const createPermissionAwarePromise = (methodConfig) => {
    if (!navigator.geolocation) {
      console.warn('❌ Geolocation not supported for', methodConfig.name);
      return null;
    }

    return new Promise((resolve, reject) => {
      console.log(`📍 Starting ${methodConfig.name}...`);
      
      if (!permissionRequestedRef.current) {
        console.log('📍 This may show a permission prompt - please allow location access');
        permissionRequestedRef.current = true;
      }

      const timeoutId = setTimeout(() => {
        console.log(`⏰ ${methodConfig.name} timeout after ${methodConfig.timeout}ms`);
        reject(new Error(`${methodConfig.name} timeout`));
      }, methodConfig.timeout);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          
          const coords = position.coords;
          const now = new Date();
          
          const locationData = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            heading: coords.heading,
            speed: coords.speed,
            altitude: coords.altitude,
            timestamp: now.toISOString(),
            source: methodConfig.name.toLowerCase().includes('gps') ? 'gps' : 'browser',
            method: methodConfig.name,
            methodId: methodConfig.name.toLowerCase().replace(/\s+/g, '_'),
            quality: determineLocationQuality(coords.accuracy),
            confidence: calculateConfidence(coords, methodConfig),
            detectionTime: Date.now()
          };

          console.log(`✅ ${methodConfig.name} SUCCESS:`, {
            accuracy: Math.round(coords.accuracy) + 'm',
            quality: locationData.quality,
            confidence: locationData.confidence,
            lat: coords.latitude.toFixed(6),
            lng: coords.longitude.toFixed(6)
          });

          resolve(locationData);
        },
        (error) => {
          clearTimeout(timeoutId);
          console.warn(`❌ ${methodConfig.name} failed:`, {
            code: error.code,
            message: error.message
          });
          
          // Handle specific error types
          if (error.code === 1) { // PERMISSION_DENIED
            setPermissionState('denied');
          } else if (error.code === 2) { // POSITION_UNAVAILABLE
            console.log('📍 Position unavailable, but permission might be granted');
          } else if (error.code === 3) { // TIMEOUT
            console.log('📍 Location request timed out');
          }
          
          reject(error);
        },
        methodConfig.options
      );
    });
  };

  // 🎯 **DETERMINE LOCATION QUALITY**
  const determineLocationQuality = (accuracy) => {
    const thresholds = DETECTION_CONFIG.accuracy;
    
    if (accuracy <= thresholds.excellent) return 'excellent';
    if (accuracy <= thresholds.good) return 'good';
    if (accuracy <= thresholds.acceptable) return 'acceptable';
    return 'poor';
  };

  // 🎯 **CALCULATE CONFIDENCE**
  const calculateConfidence = (coords, method) => {
    let confidence = 0.5; // Base confidence

    // Accuracy bonus (more lenient)
    if (coords.accuracy <= 50) confidence += 0.4;
    else if (coords.accuracy <= 200) confidence += 0.3;
    else if (coords.accuracy <= 1000) confidence += 0.2;
    else if (coords.accuracy <= 5000) confidence += 0.1;

    // Method bonus
    if (method.name.includes('GPS')) confidence += 0.2;
    if (method.name.includes('Permission')) confidence += 0.1;

    // Additional signals
    if (coords.speed !== null) confidence += 0.05;
    if (coords.heading !== null) confidence += 0.05;
    if (coords.altitude !== null) confidence += 0.03;

    return Math.min(confidence, 1.0);
  };

  // 💾 **CACHE MANAGEMENT**
  const cacheLocation = (location) => {
    const cacheEntry = {
      ...location,
      cachedAt: Date.now(),
      expiresAt: Date.now() + (15 * 60 * 1000) // 15 minutes expiry
    };

    try {
      localStorage.setItem('permission_location_cache', JSON.stringify(cacheEntry));
      console.log('💾 Location cached successfully');
    } catch (e) {
      console.warn('Failed to cache location:', e);
    }
  };

  const getCachedLocation = () => {
    try {
      const stored = localStorage.getItem('permission_location_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.expiresAt > Date.now()) {
          console.log('📦 Found valid cached location');
          return parsed;
        } else {
          console.log('📦 Found expired cached location');
          localStorage.removeItem('permission_location_cache');
          return parsed; // Return expired cache for fallback use
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

  // 🎬 **AUTO-START PERMISSION-AWARE DETECTION ON MOUNT**
  useEffect(() => {
    console.log('🚀 Initializing PERMISSION-AWARE geolocation...');
    
    // Small delay to let the UI settle, then start detection
    const startTimer = setTimeout(() => {
      runPermissionAwareDetection();
    }, 500);
    
    return () => {
      clearTimeout(startTimer);
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [runPermissionAwareDetection]);

  // 📊 **RETURN PERMISSION-AWARE GEOLOCATION DATA**
  return {
    // Core data
    location,
    loading,
    error,
    
    // Detection information
    detectionMethod,
    detectionPhase,
    locationCapability,
    permissionState,
    
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
    needsPermission: permissionState === 'prompt',
    permissionDenied: permissionState === 'denied',
    
    // Manual actions
    requestLocation: () => {
      detectionCompletedRef.current = false;
      permissionRequestedRef.current = false;
      runPermissionAwareDetection();
    },
    requestFreshGPS: () => {
      detectionCompletedRef.current = false;
      permissionRequestedRef.current = false;
      runPermissionAwareDetection();
    },
    clearPermissionDenied: () => {
      setError(null);
      setPermissionState('prompt');
      detectionCompletedRef.current = false;
      permissionRequestedRef.current = false;
      runPermissionAwareDetection();
    },
    
    // Debug info
    debugInfo: {
      detectionMethod,
      capability: locationCapability,
      phase: detectionPhase,
      permission: permissionState,
      completed: detectionCompletedRef.current,
      requested: permissionRequestedRef.current
    }
  };
};