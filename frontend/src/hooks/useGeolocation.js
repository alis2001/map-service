// hooks/useGeolocation.js - FIXED GPS SYSTEM - Complete Rebuild
// Location: /frontend/src/hooks/useGeolocation.js

import { useState, useEffect, useCallback, useRef } from 'react';

export const useGeolocation = () => {
  // Core states
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  
  // Advanced states
  const [permissionState, setPermissionState] = useState('prompt'); // 'granted', 'denied', 'prompt'
  const [gpsCapability, setGpsCapability] = useState('unknown'); // 'excellent', 'good', 'poor', 'none'
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Refs for tracking
  const watchIdRef = useRef(null);
  const attemptCountRef = useRef(0);
  const lastLocationRef = useRef(null);
  const isRequestingRef = useRef(false);

  // 🎯 **FIXED GPS CONFIGURATION - More Patient Timeouts**
  const GPS_CONFIG = {
    // FIXED: More patient timeout phases
    phases: [
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },     // 20s for high accuracy
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 }, // 30s with 1min cache
      { enableHighAccuracy: false, timeout: 25000, maximumAge: 300000 } // 25s with 5min cache
    ],
    
    // Quality thresholds
    accuracy: {
      excellent: 10,    // < 10m = excellent (mobile GPS)
      good: 50,         // < 50m = good (mobile network)
      acceptable: 500,  // < 500m = acceptable (PC wifi)
      poor: 2000       // < 2km = poor but usable
    },
    
    // Tracking settings
    liveTracking: {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 10000  // 10 seconds for live tracking
    }
  };

  // 🌐 **IP GEOLOCATION FALLBACK**
  // 🌐 **BROWSER LOCATION FALLBACK - No CORS Issues**
  const getBrowserLocation = useCallback(async () => {
    try {
      console.log('🌐 Attempting browser-based location fallback...');
      
      // Use a simple geolocation call with very relaxed settings
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = position.coords;
            const browserLocationData = {
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy || 10000,
              timestamp: new Date().toISOString(),
              source: 'browser_fallback',
              quality: 'acceptable',
              isLive: false
            };
            
            console.log('🌐 Browser fallback location obtained:', {
              accuracy: Math.round(coords.accuracy || 10000) + 'm'
            });
            
            setLocation(browserLocationData);
            setAccuracy(coords.accuracy || 10000);
            setError(null);
            setLoading(false);
            lastLocationRef.current = browserLocationData;
            
            resolve(true);
          },
          (error) => {
            console.warn('⚠️ Browser fallback failed:', error);
            resolve(false);
          },
          {
            enableHighAccuracy: false,
            timeout: 60000, // Very long timeout
            maximumAge: 600000 // Accept 10-minute old location
          }
        );
      });
    } catch (error) {
      console.warn('⚠️ Browser geolocation fallback failed:', error);
      return false;
    }
  }, []);

  // 🔍 **CHECK GPS CAPABILITIES**
  const checkGPSCapabilities = useCallback(async () => {
    console.log('🔍 Checking GPS capabilities...');
    
    // Check basic support
    if (!navigator.geolocation) {
      setGpsCapability('none');
      setError({ code: 'NO_SUPPORT', message: 'GPS not supported on this device' });
      return 'none';
    }

    // Check permissions API if available
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionState(permission.state);
        console.log('📍 GPS permission state:', permission.state);
        
        // Listen for permission changes
        permission.addEventListener('change', () => {
          setPermissionState(permission.state);
          console.log('📍 GPS permission changed to:', permission.state);
        });
        
      } catch (permError) {
        console.warn('⚠️ Could not check permissions:', permError);
      }
    }

    // Detect device capabilities
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasMotion = 'DeviceMotionEvent' in window;
    
    if (isMobile && hasMotion) {
      setGpsCapability('excellent');
      console.log('📱 Mobile device detected - Excellent GPS expected');
      return 'excellent';
    } else if (isMobile) {
      setGpsCapability('good');
      console.log('📱 Mobile device detected - Good GPS expected');
      return 'good';
    } else {
      setGpsCapability('acceptable');
      console.log('💻 Desktop device detected - Acceptable GPS expected');
      return 'acceptable';
    }
  }, []);

  // 🎯 **FIXED PROGRESSIVE GPS ATTEMPT**
  const attemptGPSLocation = useCallback((phaseIndex = 0) => {
    if (phaseIndex >= GPS_CONFIG.phases.length) {
      console.log('❌ All GPS phases failed, trying browser fallback...');
      
      // FIXED: Try browser fallback instead of IP
      getBrowserLocation().then(fallbackSuccess => {
        if (!fallbackSuccess) {
          console.log('⚠️ All location methods failed, using default');
          setError({ 
            code: 'ALL_METHODS_FAILED', 
            message: 'Unable to determine precise location. Using default area.' 
          });
          setLoading(false);
        }
      });
      return;
    }

    const phase = GPS_CONFIG.phases[phaseIndex];
    console.log(`🎯 GPS Phase ${phaseIndex + 1}:`, phase);

    // FIXED: Show progress during GPS attempts
    setError({ 
      code: 'GPS_SEARCHING', 
      message: `Searching for GPS signal... (attempt ${phaseIndex + 1}/3)`,
      phase: phaseIndex + 1,
      isProgress: true
    });

    navigator.geolocation.getCurrentPosition(
      // ✅ SUCCESS
      (position) => {
        const coords = position.coords;
        const locationAccuracy = coords.accuracy;
        
        console.log('✅ GPS SUCCESS - Phase', phaseIndex + 1, {
          latitude: coords.latitude.toFixed(6),
          longitude: coords.longitude.toFixed(6),
          accuracy: Math.round(locationAccuracy),
          timestamp: new Date(position.timestamp).toISOString()
        });

        // Determine quality
        let quality = 'poor';
        if (locationAccuracy < GPS_CONFIG.accuracy.excellent) quality = 'excellent';
        else if (locationAccuracy < GPS_CONFIG.accuracy.good) quality = 'good';
        else if (locationAccuracy < GPS_CONFIG.accuracy.acceptable) quality = 'acceptable';

        const locationData = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: locationAccuracy,
          heading: coords.heading,
          speed: coords.speed,
          altitude: coords.altitude,
          timestamp: new Date().toISOString(),
          source: 'gps',
          quality,
          phase: phaseIndex + 1,
          isLive: false
        };

        setLocation(locationData);
        setAccuracy(locationAccuracy);
        setError(null);
        setLoading(false);
        setPermissionState('granted');
        setLastUpdate(new Date());
        lastLocationRef.current = locationData;

        // Cache the location
        try {
          localStorage.setItem('lastGPSLocation', JSON.stringify({
            ...locationData,
            expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
          }));
          localStorage.setItem('gpsPermissionGranted', 'true');
        } catch (e) {
          console.warn('Failed to cache GPS location:', e);
        }

        console.log(`🎯 GPS Quality: ${quality} (${Math.round(locationAccuracy)}m accuracy)`);
      },
      
      // ❌ ERROR
      (error) => {
        console.warn(`❌ GPS Phase ${phaseIndex + 1} failed:`, {
          code: error.code,
          message: error.message
        });

        if (error.code === error.PERMISSION_DENIED) {
          setPermissionState('denied');
          setError({ 
            code: 'PERMISSION_DENIED', 
            message: 'GPS access denied. Please enable location access in your browser.' 
          });
          setLoading(false);
          localStorage.setItem('gpsPermissionGranted', 'denied');
          return;
        }

        // FIXED: Try next phase with progressive delay
        const delay = (phaseIndex + 1) * 2000; // 2s, 4s, 6s delays
        console.log(`⏳ Trying next GPS method in ${delay}ms...`);
        
        setTimeout(() => {
          attemptGPSLocation(phaseIndex + 1);
        }, delay);
      },
      
      phase
    );
  }, [getBrowserLocation]);
  // 🔄 **MANUAL GPS REQUEST - More Aggressive**
  const requestFreshGPS = useCallback(async () => {
    console.log('🎯 Manual fresh GPS request initiated');
    setLoading(true);
    setError(null);
    
    // Clear any existing request state
    isRequestingRef.current = false;
    
    // Try immediate GPS with very long timeout
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = position.coords;
        const freshLocationData = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          heading: coords.heading,
          speed: coords.speed,
          altitude: coords.altitude,
          timestamp: new Date().toISOString(),
          source: 'gps_manual',
          quality: coords.accuracy < 10 ? 'excellent' : 
                  coords.accuracy < 50 ? 'good' : 'acceptable',
          isLive: false
        };

        console.log('✅ Manual GPS SUCCESS:', {
          accuracy: Math.round(coords.accuracy) + 'm',
          source: 'manual'
        });

        setLocation(freshLocationData);
        setAccuracy(coords.accuracy);
        setError(null);
        setLoading(false);
        setPermissionState('granted');
        setLastUpdate(new Date());
        lastLocationRef.current = freshLocationData;

        // Cache the fresh location
        try {
          localStorage.setItem('lastGPSLocation', JSON.stringify({
            ...freshLocationData,
            expiresAt: Date.now() + (10 * 60 * 1000)
          }));
        } catch (e) {
          console.warn('Failed to cache manual GPS location:', e);
        }
      },
      (error) => {
        console.warn('❌ Manual GPS failed:', error.message);
        setError({ 
          code: 'MANUAL_GPS_FAILED', 
          message: 'GPS signal not available. Using last known position.' 
        });
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 90000, // 90 seconds
        maximumAge: 0 // Force fresh location
      }
    );
  }, []);
  // 🔄 **START LIVE TRACKING**
  const startLiveTracking = useCallback(() => {
    if (watchIdRef.current || !location) {
      console.log('📍 Live tracking already active or no initial location');
      return;
    }

    console.log('🎯 Starting live GPS tracking...');
    setIsLiveTracking(true);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = position.coords;
        
        // Calculate movement from last position
        let distance = 0;
        if (lastLocationRef.current) {
          const R = 6371e3; // Earth's radius
          const φ1 = lastLocationRef.current.latitude * Math.PI / 180;
          const φ2 = coords.latitude * Math.PI / 180;
          const Δφ = (coords.latitude - lastLocationRef.current.latitude) * Math.PI / 180;
          const Δλ = (coords.longitude - lastLocationRef.current.longitude) * Math.PI / 180;

          const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ/2) * Math.sin(Δλ/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          distance = R * c;
        }

        // Only update if significant movement (> 5 meters) or better accuracy
        if (distance > 5 || coords.accuracy < (lastLocationRef.current?.accuracy || Infinity)) {
          const liveLocationData = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            heading: coords.heading,
            speed: coords.speed,
            altitude: coords.altitude,
            timestamp: new Date().toISOString(),
            source: 'gps_live',
            quality: coords.accuracy < 10 ? 'excellent' : 
                    coords.accuracy < 50 ? 'good' : 'acceptable',
            isLive: true,
            movement: Math.round(distance)
          };

          console.log('📍 Live GPS update:', {
            lat: coords.latitude.toFixed(6),
            lng: coords.longitude.toFixed(6),
            accuracy: Math.round(coords.accuracy),
            movement: Math.round(distance) + 'm'
          });

          setLocation(liveLocationData);
          setAccuracy(coords.accuracy);
          setLastUpdate(new Date());
          lastLocationRef.current = liveLocationData;
        }
      },
      (error) => {
        console.warn('⚠️ Live tracking error:', error.message);
        // Don't stop tracking on individual errors
      },
      GPS_CONFIG.liveTracking
    );

    watchIdRef.current = watchId;
  }, [location]);

  // 🛑 **STOP LIVE TRACKING**
  const stopLiveTracking = useCallback(() => {
    if (watchIdRef.current) {
      console.log('🛑 Stopping live GPS tracking');
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsLiveTracking(false);
    }
  }, []);

  // 🔄 **REQUEST LOCATION (Main Function)**
  const requestLocation = useCallback(async () => {
    if (isRequestingRef.current) {
      console.log('📍 GPS request already in progress');
      return;
    }

    console.log('🚀 Starting modern GPS location request...');
    isRequestingRef.current = true;
    setLoading(true);
    setError(null);
    attemptCountRef.current++;

    // Check capabilities first
    const capability = await checkGPSCapabilities();
    
    if (capability === 'none') {
      isRequestingRef.current = false;
      return;
    }

    // Start GPS attempt
    attemptGPSLocation(0);
    
    // Set requesting to false after timeout
    setTimeout(() => {
      isRequestingRef.current = false;
    }, 90000); // INCREASED: 90 second timeout for all phases
  }, [checkGPSCapabilities, attemptGPSLocation]);

  // 🔄 **RETRY LOCATION**
  const retryLocation = useCallback(() => {
    console.log('🔄 Retrying GPS location...');
    setError(null);
    setLoading(true);
    isRequestingRef.current = false;
    requestLocation();
  }, [requestLocation]);

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

  // 🎬 **FIXED INITIALIZATION - Use Cache Immediately**
  // 🎬 **FIXED INITIALIZATION - Stop Multiple Requests**
  useEffect(() => {
    console.log('🎬 Initializing modern GPS system...');
    
    // FIXED: Prevent multiple GPS requests
    if (isRequestingRef.current) {
      console.log('🚫 GPS already initializing, skipping...');
      return;
    }
    
    // FIXED: Check for cached location FIRST and use it immediately
    try {
      const cached = localStorage.getItem('lastGPSLocation');
      const permission = localStorage.getItem('gpsPermissionGranted');
      
      if (permission === 'denied') {
        setPermissionState('denied');
        setError({ 
          code: 'PERMISSION_DENIED', 
          message: 'GPS access was previously denied. Click "Enable GPS" to try again.' 
        });
        setLoading(false);
        return;
      }
      
      // FIXED: Use cached location immediately while fetching fresh
      if (cached) {
        const parsedCache = JSON.parse(cached);
        if (parsedCache.expiresAt > Date.now()) {
          console.log('📦 Found cached GPS location, using immediately while fetching fresh...');
          setLocation({
            ...parsedCache,
            source: 'cache',
            isStale: true
          });
          setAccuracy(parsedCache.accuracy);
          setError(null);
          setLoading(false); // Show cached location immediately
          setLastUpdate(new Date(parsedCache.timestamp));
          lastLocationRef.current = parsedCache;
          
          // FIXED: Don't request fresh GPS immediately if cache is recent (< 5 minutes)
          const cacheAge = Date.now() - new Date(parsedCache.timestamp).getTime();
          if (cacheAge < 5 * 60 * 1000) { // Less than 5 minutes old
            console.log('📦 Cache is fresh, skipping GPS request');
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to check cached location:', e);
    }

    // FIXED: Only request fresh GPS if cache is old or missing
    setTimeout(() => {
      if (!location || (location.source === 'cache' && location.isStale)) {
        console.log('🔄 Cache is stale, requesting fresh GPS...');
        setLoading(true);
        requestLocation();
      }
    }, 2000); // Wait 2 seconds before requesting fresh GPS
  }, []); // FIXED: Remove requestLocation dependency to prevent loops

  // 🧹 **CLEANUP**
  useEffect(() => {
    return () => {
      stopLiveTracking();
    };
  }, [stopLiveTracking]);

  // 📊 **RETURN VALUES**
  return {
    // Core data
    location,
    loading,
    error,
    accuracy,
    
    // FIXED: Add manual GPS function
    requestFreshGPS,
    
    // Advanced data
    permissionState,
    gpsCapability,
    isLiveTracking,
    lastUpdate,
    
    // Actions
    requestLocation,
    retryLocation,
    startLiveTracking,
    stopLiveTracking,
    getDistanceTo,
    
    // Computed values
    hasLocation: !!location,
    isHighAccuracy: accuracy && accuracy < GPS_CONFIG.accuracy.excellent,
    isGoodAccuracy: accuracy && accuracy < GPS_CONFIG.accuracy.good,
    isAcceptableAccuracy: accuracy && accuracy < GPS_CONFIG.accuracy.acceptable,
    qualityText: location?.quality || 'unknown',
    sourceText: location?.source === 'gps_live' ? 'Live GPS' : 
                location?.source === 'gps' ? 'GPS' : 
                location?.source === 'cache' ? 'Cached' :
                location?.source === 'ip' ? 'Network' : 'Unknown',
    
    // Status helpers
    isWaitingForGPS: loading && !error,
    needsPermission: permissionState === 'denied' || (error?.code === 'PERMISSION_DENIED'),
    canRetry: !loading && error && error.code !== 'NO_SUPPORT',
    
    // FIXED: Clear permission denied helper
    clearPermissionDenied: () => {
      localStorage.removeItem('gpsPermissionGranted');
      setPermissionState('prompt');
      setError(null);
    },
    
    // Debug info
    debugInfo: {
      attemptCount: attemptCountRef.current,
      capability: gpsCapability,
      permission: permissionState,
      phase: location?.phase,
      movement: location?.movement
    }
  };
};