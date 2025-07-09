// hooks/useGeolocation.js - MODERN GPS SYSTEM - Complete Rebuild
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

  // 🎯 **MODERN GPS CONFIGURATION**
  const GPS_CONFIG = {
    // Progressive accuracy approach
    phases: [
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },     // Phase 1: Best possible
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }, // Phase 2: Good with cache
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 } // Phase 3: Network location
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
    const hasOrientation = 'DeviceOrientationEvent' in window;
    
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

  // 🎯 **PROGRESSIVE GPS ATTEMPT**
  const attemptGPSLocation = useCallback((phaseIndex = 0) => {
    if (phaseIndex >= GPS_CONFIG.phases.length) {
      console.error('❌ All GPS phases failed');
      setError({ 
        code: 'ALL_PHASES_FAILED', 
        message: 'Unable to determine your location. Please ensure GPS is enabled and try again.' 
      });
      setLoading(false);
      return;
    }

    const phase = GPS_CONFIG.phases[phaseIndex];
    console.log(`🎯 GPS Phase ${phaseIndex + 1}:`, phase);

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
          message: error.message,
          PERMISSION_DENIED: error.PERMISSION_DENIED,
          POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
          TIMEOUT: error.TIMEOUT
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

        // Try next phase
        setTimeout(() => {
          attemptGPSLocation(phaseIndex + 1);
        }, 1000);
      },
      
      phase
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
    }, 30000); // 30 second timeout for all phases
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

  // 🎬 **INITIALIZATION**
  useEffect(() => {
    console.log('🎬 Initializing modern GPS system...');
    
    // Check for cached location (but don't use it - wait for real GPS)
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
      
      // Don't show cached location - wait for real GPS
      if (cached) {
        const parsedCache = JSON.parse(cached);
        if (parsedCache.expiresAt > Date.now()) {
          console.log('📦 Found cached GPS location, but waiting for fresh GPS...');
        }
      }
    } catch (e) {
      console.warn('Failed to check cached location:', e);
    }

    // Always request fresh GPS location
    requestLocation();
  }, [requestLocation]);

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
                location?.source === 'gps' ? 'GPS' : 'Unknown',
    
    // Status helpers
    isWaitingForGPS: loading && !error,
    needsPermission: permissionState === 'denied' || (error?.code === 'PERMISSION_DENIED'),
    canRetry: !loading && error && error.code !== 'NO_SUPPORT',
    
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