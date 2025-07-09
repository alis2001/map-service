// hooks/useGeolocation.js - ENHANCED DUAL DETECTION SYSTEM
// Location: /frontend/src/hooks/useGeolocation.js

import { useState, useEffect, useCallback, useRef } from 'react';

export const useGeolocation = () => {
  // Core states
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  
  // Detection states
  const [detectionMethod, setDetectionMethod] = useState('unknown'); // 'gps', 'browser', 'ip', 'cache'
  const [detectionPhase, setDetectionPhase] = useState('initializing'); // 'initializing', 'detecting', 'completed'
  const [availableMethods, setAvailableMethods] = useState([]);
  
  // Advanced states
  const [permissionState, setPermissionState] = useState('prompt');
  const [locationCapability, setLocationCapability] = useState('unknown');
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Refs for tracking
  const watchIdRef = useRef(null);
  const detectionPromisesRef = useRef([]);
  const firstLocationFoundRef = useRef(false);
  const isDetectingRef = useRef(false);

  // 🎯 **ENHANCED DETECTION CONFIGURATION**
  const DETECTION_CONFIG = {
    // Multiple detection methods in parallel
    methods: {
      gps_high: {
        name: 'GPS High Accuracy',
        priority: 1,
        timeout: 15000,
        options: { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      },
      gps_balanced: {
        name: 'GPS Balanced',
        priority: 2,
        timeout: 20000,
        options: { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
      },
      browser_network: {
        name: 'Browser Network',
        priority: 3,
        timeout: 10000,
        options: { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      },
      browser_cached: {
        name: 'Browser Cached',
        priority: 4,
        timeout: 5000,
        options: { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
      }
    },
    
    // Quality thresholds
    accuracy: {
      excellent: 10,    // < 10m = mobile GPS
      good: 50,         // < 50m = mobile network
      acceptable: 500,  // < 500m = WiFi/IP
      poor: 2000       // < 2km = rough location
    },
    
    // Parallel detection settings
    parallel: {
      maxConcurrent: 4,  // Run all methods simultaneously
      firstWins: true,   // First successful detection wins
      fallbackDelay: 3000, // Wait 3s before starting fallbacks
    }
  };

  // 🔍 **CHECK DEVICE CAPABILITIES**
  const checkLocationCapabilities = useCallback(async () => {
    console.log('🔍 Analyzing device location capabilities...');
    
    const capabilities = {
      hasGeolocation: !!navigator.geolocation,
      hasMobileFeatures: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      hasMotionSensors: 'DeviceMotionEvent' in window,
      hasOrientationSensors: 'DeviceOrientationEvent' in window,
      supportsBatteryAPI: 'getBattery' in navigator,
      supportsConnectionAPI: 'connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator
    };

    // Check permissions if available
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionState(permission.state);
        
        permission.addEventListener('change', () => {
          setPermissionState(permission.state);
          console.log('📍 Permission state changed:', permission.state);
        });
      } catch (e) {
        console.warn('⚠️ Could not check geolocation permissions');
      }
    }

    // Determine capability level
    let capability = 'poor';
    if (capabilities.hasGeolocation) {
      if (capabilities.hasMobileFeatures && capabilities.hasMotionSensors) {
        capability = 'excellent'; // Mobile with GPS
      } else if (capabilities.hasMobileFeatures) {
        capability = 'good'; // Mobile without motion sensors
      } else {
        capability = 'acceptable'; // Desktop browser
      }
    } else {
      capability = 'none';
    }

    setLocationCapability(capability);
    
    // Set available methods based on capabilities
    const methods = [];
    if (capabilities.hasGeolocation) {
      methods.push('gps_high', 'gps_balanced', 'browser_network', 'browser_cached');
    }
    
    setAvailableMethods(methods);
    
    console.log('📱 Device capabilities:', {
      capability,
      methods: methods.length,
      mobile: capabilities.hasMobileFeatures,
      sensors: capabilities.hasMotionSensors
    });

    return { capability, methods, capabilities };
  }, []);

  // 🏃‍♂️ **PARALLEL DETECTION RUNNER**
  const runParallelDetection = useCallback(async () => {
    if (isDetectingRef.current || firstLocationFoundRef.current) {
      console.log('🚫 Detection already in progress or completed');
      return;
    }

    console.log('🏁 Starting parallel location detection...');
    isDetectingRef.current = true;
    setDetectionPhase('detecting');
    setLoading(true);
    setError(null);

    // Clear any existing detection promises
    detectionPromisesRef.current = [];

    // Create detection promises for all available methods
    const detectionPromises = availableMethods.map(methodKey => 
      createDetectionPromise(methodKey, DETECTION_CONFIG.methods[methodKey])
    );

    detectionPromisesRef.current = detectionPromises;

    try {
      // Race all detection methods - first one wins!
      const firstResult = await Promise.race(detectionPromises);
      
      if (firstResult && !firstLocationFoundRef.current) {
        console.log('🏆 FIRST LOCATION DETECTED:', {
          method: firstResult.method,
          accuracy: Math.round(firstResult.accuracy) + 'm',
          coordinates: `${firstResult.latitude.toFixed(4)}, ${firstResult.longitude.toFixed(4)}`
        });

        firstLocationFoundRef.current = true;
        setLocation(firstResult);
        setAccuracy(firstResult.accuracy);
        setDetectionMethod(firstResult.source);
        setError(null);
        setLoading(false);
        setDetectionPhase('completed');
        setLastUpdate(new Date());

        // Cache the successful result
        try {
          localStorage.setItem('lastDetectedLocation', JSON.stringify({
            ...firstResult,
            cachedAt: Date.now(),
            expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
          }));
        } catch (e) {
          console.warn('Failed to cache location:', e);
        }

        // Cancel other detection attempts
        cancelOtherDetections(firstResult.method);
      }

    } catch (error) {
      console.error('❌ All location detection methods failed:', error);
      
      // Try cached location as last resort
      const cachedResult = await tryLoadCachedLocation();
      if (cachedResult) {
        setLocation(cachedResult);
        setAccuracy(cachedResult.accuracy);
        setDetectionMethod('cache');
        setError(null);
        setLoading(false);
        setDetectionPhase('completed');
      } else {
        // Complete failure - use fallback location
        setError({
          code: 'ALL_METHODS_FAILED',
          message: 'Unable to detect your location. Using default area.',
          allMethodsFailed: true
        });
        setLoading(false);
        setDetectionPhase('completed');
      }
    } finally {
      isDetectingRef.current = false;
    }
  }, [availableMethods]);

  // 🎯 **CREATE INDIVIDUAL DETECTION PROMISE**
  const createDetectionPromise = useCallback((methodKey, methodConfig) => {
    return new Promise((resolve, reject) => {
      console.log(`🎯 Starting ${methodConfig.name}...`);

      const timeoutId = setTimeout(() => {
        console.log(`⏰ ${methodConfig.name} timeout after ${methodConfig.timeout}ms`);
        reject(new Error(`${methodConfig.name} timeout`));
      }, methodConfig.timeout);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          
          const coords = position.coords;
          const detectedLocation = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            heading: coords.heading,
            speed: coords.speed,
            altitude: coords.altitude,
            timestamp: new Date().toISOString(),
            source: methodKey.startsWith('gps') ? 'gps' : 'browser',
            method: methodConfig.name,
            quality: determineLocationQuality(coords.accuracy),
            isLive: false,
            detectionTime: Date.now()
          };

          console.log(`✅ ${methodConfig.name} SUCCESS:`, {
            accuracy: Math.round(coords.accuracy) + 'm',
            quality: detectedLocation.quality
          });

          resolve(detectedLocation);
        },
        (error) => {
          clearTimeout(timeoutId);
          console.warn(`❌ ${methodConfig.name} failed:`, error.message);
          reject(error);
        },
        methodConfig.options
      );
    });
  }, []);

  // 🏆 **DETERMINE LOCATION QUALITY**
  const determineLocationQuality = useCallback((accuracy) => {
    if (accuracy < DETECTION_CONFIG.accuracy.excellent) return 'excellent';
    if (accuracy < DETECTION_CONFIG.accuracy.good) return 'good';
    if (accuracy < DETECTION_CONFIG.accuracy.acceptable) return 'acceptable';
    return 'poor';
  }, []);

  // 🛑 **CANCEL OTHER DETECTIONS**
  const cancelOtherDetections = useCallback((winningMethod) => {
    console.log(`🛑 Cancelling other detection methods (${winningMethod} won)`);
    // Note: We can't actually cancel getCurrentPosition calls, but we ignore their results
    detectionPromisesRef.current.forEach(promise => {
      if (promise.method !== winningMethod) {
        // Mark as cancelled (for logging purposes)
        promise.cancelled = true;
      }
    });
  }, []);

  // 💾 **TRY LOAD CACHED LOCATION**
  const tryLoadCachedLocation = useCallback(async () => {
    try {
      const cached = localStorage.getItem('lastDetectedLocation');
      if (cached) {
        const parsedCache = JSON.parse(cached);
        if (parsedCache.expiresAt > Date.now()) {
          console.log('📦 Using cached location as fallback');
          return {
            ...parsedCache,
            source: 'cache',
            method: 'Cached Location',
            isStale: true
          };
        } else {
          console.log('🗑️ Cached location expired, removing');
          localStorage.removeItem('lastDetectedLocation');
        }
      }
    } catch (e) {
      console.warn('Failed to load cached location:', e);
    }
    return null;
  }, []);

  // 🔄 **MANUAL LOCATION REQUEST**
  const requestLocation = useCallback(async () => {
    console.log('🔄 Manual location request initiated');
    
    // Reset states
    firstLocationFoundRef.current = false;
    isDetectingRef.current = false;
    setLoading(true);
    setError(null);
    setDetectionPhase('detecting');

    // Check capabilities and start detection
    await checkLocationCapabilities();
    await runParallelDetection();
  }, [checkLocationCapabilities, runParallelDetection]);

  // 🎯 **ENHANCED GPS REQUEST**
  const requestFreshGPS = useCallback(async () => {
    console.log('🎯 Fresh GPS request (high accuracy priority)');
    
    // Prioritize GPS methods only
    setAvailableMethods(['gps_high', 'gps_balanced']);
    firstLocationFoundRef.current = false;
    isDetectingRef.current = false;
    
    await runParallelDetection();
  }, [runParallelDetection]);

  // 🔴 **START LIVE TRACKING**
  const startLiveTracking = useCallback(() => {
    if (watchIdRef.current || !location) {
      console.log('📍 Live tracking conditions not met');
      return;
    }

    console.log('🎯 Starting live location tracking...');
    setIsLiveTracking(true);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = position.coords;
        
        // Calculate movement from last position
        let movement = 0;
        if (location) {
          const R = 6371e3; // Earth's radius
          const φ1 = location.latitude * Math.PI / 180;
          const φ2 = coords.latitude * Math.PI / 180;
          const Δφ = (coords.latitude - location.latitude) * Math.PI / 180;
          const Δλ = (coords.longitude - location.longitude) * Math.PI / 180;

          const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ/2) * Math.sin(Δλ/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          movement = R * c;
        }

        // Only update if significant movement or better accuracy
        if (movement > 10 || coords.accuracy < location.accuracy) {
          const liveLocationData = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            heading: coords.heading,
            speed: coords.speed,
            altitude: coords.altitude,
            timestamp: new Date().toISOString(),
            source: 'gps_live',
            method: 'Live GPS Tracking',
            quality: determineLocationQuality(coords.accuracy),
            isLive: true,
            movement: Math.round(movement)
          };

          console.log('📍 Live location update:', {
            movement: Math.round(movement) + 'm',
            accuracy: Math.round(coords.accuracy) + 'm'
          });

          setLocation(liveLocationData);
          setAccuracy(coords.accuracy);
          setLastUpdate(new Date());
        }
      },
      (error) => {
        console.warn('⚠️ Live tracking error:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 10000
      }
    );

    watchIdRef.current = watchId;
  }, [location, determineLocationQuality]);

  // 🛑 **STOP LIVE TRACKING**
  const stopLiveTracking = useCallback(() => {
    if (watchIdRef.current) {
      console.log('🛑 Stopping live location tracking');
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsLiveTracking(false);
    }
  }, []);

  // 📍 **GET DISTANCE TO POINT**
  const getDistanceTo = useCallback((targetLat, targetLng) => {
    if (!location) return null;

    const R = 6371e3;
    const φ1 = location.latitude * Math.PI / 180;
    const φ2 = targetLat * Math.PI / 180;
    const Δφ = (targetLat - location.latitude) * Math.PI / 180;
    const Δλ = (targetLng - location.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }, [location]);

  // 🎬 **INITIALIZATION EFFECT**
  useEffect(() => {
    if (isDetectingRef.current) {
      console.log('🚫 Detection already in progress, skipping initialization');
      return;
    }

    console.log('🎬 Initializing enhanced dual detection system...');
    
    const initializeDetection = async () => {
      // Check capabilities first
      await checkLocationCapabilities();
      
      // Check for cached location
      const cached = await tryLoadCachedLocation();
      if (cached) {
        console.log('📦 Found cached location, using while detecting fresh...');
        setLocation(cached);
        setAccuracy(cached.accuracy);
        setDetectionMethod('cache');
        setLoading(false);
        setLastUpdate(new Date(cached.timestamp));
        
        // Still run detection for fresh location in background
        setTimeout(() => {
          if (!firstLocationFoundRef.current) {
            runParallelDetection();
          }
        }, 1000);
      } else {
        // No cache, start immediate detection
        runParallelDetection();
      }
    };

    initializeDetection();
  }, []);

  // 🧹 **CLEANUP**
  useEffect(() => {
    return () => {
      stopLiveTracking();
      isDetectingRef.current = false;
    };
  }, [stopLiveTracking]);

  // 📊 **RETURN ENHANCED GEOLOCATION DATA**
  return {
    // Core data
    location,
    loading,
    error,
    accuracy,
    
    // Detection information
    detectionMethod,
    detectionPhase,
    availableMethods,
    locationCapability,
    
    // Advanced data
    permissionState,
    isLiveTracking,
    lastUpdate,
    
    // Actions
    requestLocation,
    requestFreshGPS,
    startLiveTracking,
    stopLiveTracking,
    getDistanceTo,
    
    // Computed values
    hasLocation: !!location,
    isHighAccuracy: accuracy && accuracy < DETECTION_CONFIG.accuracy.excellent,
    isGoodAccuracy: accuracy && accuracy < DETECTION_CONFIG.accuracy.good,
    isAcceptableAccuracy: accuracy && accuracy < DETECTION_CONFIG.accuracy.acceptable,
    qualityText: location?.quality || 'unknown',
    sourceText: location?.source === 'gps_live' ? 'Live GPS' : 
                location?.source === 'gps' ? 'GPS' : 
                location?.source === 'browser' ? 'Browser' :
                location?.source === 'cache' ? 'Cached' : 'Unknown',
    
    // Status helpers
    isDetecting: detectionPhase === 'detecting',
    isCompleted: detectionPhase === 'completed',
    needsPermission: permissionState === 'denied',
    canRetry: !loading && error && !error.allMethodsFailed,
    hasExcellentAccuracy: location?.quality === 'excellent',
    hasGoodAccuracy: location?.quality === 'good',
    
    // Clear permission helper
    clearPermissionDenied: () => {
      localStorage.removeItem('gpsPermissionGranted');
      setPermissionState('prompt');
      setError(null);
    },
    
    // Debug info
    debugInfo: {
      detectionMethod,
      availableMethods,
      capability: locationCapability,
      permission: permissionState,
      phase: detectionPhase,
      isDetecting: isDetectingRef.current,
      firstFound: firstLocationFoundRef.current
    }
  };
};