// hooks/useGeolocation.js - FIXED VERSION - Complete with Live Location Tracking
// Location: /frontend/src/hooks/useGeolocation.js

import { useState, useEffect, useCallback } from 'react';

export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true); // Start with loading = true
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Geolocation options for better accuracy
  const options = {
    enableHighAccuracy: true,
    timeout: 15000, // 15 seconds timeout
    maximumAge: 5 * 60 * 1000 // 5 minutes cache
  };

  // Turin fallback only as last resort
  const setTurinFallback = useCallback(() => {
    const fallbackLocation = {
      latitude: 45.0703,
      longitude: 7.6869,
      accuracy: 50000,
      timestamp: new Date().toISOString(),
      source: 'fallback',
      city: 'Torino',
      country: 'Italy',
      note: 'Using fallback location - enable GPS for better experience'
    };

    console.log('📍 Using Turin fallback location as last resort:', fallbackLocation);
    setLocation(fallbackLocation);
    setLoading(false);
    setError(null);
    setPermissionGranted(false);
  }, []);

  // IMPROVED: IP geolocation as intermediate fallback
  const tryIPGeolocation = useCallback(async () => {
    try {
      console.log('🌐 Attempting IP-based geolocation...');
      setLoading(true);
      
      const providers = [
        { url: 'https://ipapi.co/json/', type: 'ipapi' },
        { url: 'https://ipinfo.io/json', type: 'ipinfo' },
        { url: 'http://ip-api.com/json', type: 'ipapi_com' }
      ];

      for (const provider of providers) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(provider.url, { 
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          const data = await response.json();
          let latitude, longitude, city, country;

          // Parse different provider formats
          switch (provider.type) {
            case 'ipapi':
              latitude = data.latitude;
              longitude = data.longitude;
              city = data.city;
              country = data.country_name;
              break;
            case 'ipinfo':
              const [lat, lng] = (data.loc || '').split(',');
              latitude = parseFloat(lat);
              longitude = parseFloat(lng);
              city = data.city;
              country = data.country;
              break;
            case 'ipapi_com':
              latitude = data.lat;
              longitude = data.lon;
              city = data.city;
              country = data.country;
              break;
          }

          if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
            const ipLocation = {
              latitude: parseFloat(latitude),
              longitude: parseFloat(longitude),
              accuracy: 10000, // IP location is less accurate
              timestamp: new Date().toISOString(),
              source: 'ip',
              city,
              country,
              provider: provider.type,
              note: 'Location based on IP address - enable GPS for precise location'
            };

            console.log('✅ IP-based location found:', ipLocation);
            setLocation(ipLocation);
            setLoading(false);
            setError(null);
            
            // Cache IP location
            try {
              const locationWithExpiry = {
                ...ipLocation,
                expiresAt: Date.now() + (15 * 60 * 1000) // 15 minutes for IP location
              };
              localStorage.setItem('lastKnownLocation', JSON.stringify(locationWithExpiry));
            } catch (e) {
              console.warn('Failed to cache IP location:', e);
            }
            
            return true;
          }
        } catch (providerError) {
          console.warn(`IP provider ${provider.type} failed:`, providerError);
          continue;
        }
      }

      throw new Error('All IP geolocation providers failed');

    } catch (ipError) {
      console.warn('IP geolocation failed, using Turin fallback:', ipError);
      setTurinFallback();
      return false;
    }
  }, [setTurinFallback]);

  // Check cached location but prioritize fresh GPS
  const checkCachedLocation = useCallback(() => {
    try {
      const cachedLocation = localStorage.getItem('lastKnownLocation');
      const permissionStatus = localStorage.getItem('locationPermissionGranted');
      
      if (permissionStatus === 'true') {
        setPermissionGranted(true);
      }
      
      if (cachedLocation) {
        const parsedLocation = JSON.parse(cachedLocation);
        
        // Use cached location temporarily while we try to get fresh GPS
        if (parsedLocation.latitude && parsedLocation.longitude) {
          console.log('📍 Using cached location temporarily');
          setLocation({
            ...parsedLocation,
            source: 'cache',
            note: 'Cached location - requesting fresh GPS data'
          });
          return true;
        }
      }
      
      return false;
    } catch (e) {
      console.warn('Failed to retrieve cached location:', e);
      return false;
    }
  }, []);

  // SUCCESS: GPS location obtained
  const onSuccess = useCallback((position) => {
    const coords = position.coords;
    
    console.log('✅ GPS location success:', {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      timestamp: new Date(position.timestamp).toISOString()
    });

    // Validate coordinates
    if (coords.latitude === 0 && coords.longitude === 0) {
      console.warn('📍 Invalid coordinates (0,0) received');
      tryIPGeolocation();
      return;
    }

    const newLocation = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      timestamp: new Date().toISOString(),
      source: 'gps',
      isAccurate: coords.accuracy < 100,
      heading: coords.heading,
      speed: coords.speed,
      note: `GPS location with ${Math.round(coords.accuracy)}m accuracy`
    };

    setLocation(newLocation);
    setLoading(false);
    setError(null);
    setPermissionGranted(true);

    // Store GPS location and permission status
    try {
      const locationWithExpiry = {
        ...newLocation,
        expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes expiry
      };
      localStorage.setItem('lastKnownLocation', JSON.stringify(locationWithExpiry));
      localStorage.setItem('locationPermissionGranted', 'true');
      localStorage.setItem('lastLocationUpdate', Date.now().toString());
      console.log('💾 GPS location cached successfully');
    } catch (e) {
      console.warn('Failed to store location in localStorage:', e);
    }
  }, [tryIPGeolocation]);

  // ERROR: GPS failed
  const onError = useCallback((error) => {
    console.error('❌ Geolocation error:', error);
    
    let errorMessage = '';
    let errorCode = '';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'GPS access denied by user';
        errorCode = 'PERMISSION_DENIED';
        localStorage.setItem('locationPermissionGranted', 'denied');
        setPermissionGranted(false);
        // Try IP geolocation if GPS denied
        console.log('📍 GPS denied, trying IP geolocation...');
        setTimeout(() => tryIPGeolocation(), 1000);
        break;
        
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'GPS position unavailable';
        errorCode = 'POSITION_UNAVAILABLE';
        // Try IP geolocation if GPS unavailable
        console.log('📍 GPS unavailable, trying IP geolocation...');
        setTimeout(() => tryIPGeolocation(), 1000);
        break;
        
      case error.TIMEOUT:
        errorMessage = 'GPS timeout';
        errorCode = 'TIMEOUT';
        // Try IP geolocation if GPS times out
        console.log('📍 GPS timeout, trying IP geolocation...');
        setTimeout(() => tryIPGeolocation(), 1000);
        break;
        
      default:
        errorMessage = 'GPS error occurred';
        errorCode = 'UNKNOWN_ERROR';
        setTimeout(() => tryIPGeolocation(), 1000);
        break;
    }

    setError({
      message: errorMessage,
      code: errorCode,
      originalError: error
    });

    // Don't set loading to false here - let IP geolocation handle it
    
  }, [tryIPGeolocation]);

  // REQUEST: Get user's GPS location
  const requestLocation = useCallback(() => {
    console.log('📍 Requesting user GPS location...');
    
    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      setError({
        message: 'Geolocation not supported by this browser',
        code: 'NOT_SUPPORTED'
      });
      setLoading(false);
      // Try IP geolocation as fallback
      setTimeout(() => tryIPGeolocation(), 1000);
      return;
    }

    setLoading(true);
    setError(null);

    // Clear any permission denied status for retry
    localStorage.removeItem('locationPermissionGranted');

    // Try high accuracy GPS first
    navigator.geolocation.getCurrentPosition(
      onSuccess, 
      (error) => {
        if (error.code === error.TIMEOUT && options.enableHighAccuracy) {
          console.log('📍 High accuracy GPS failed, trying standard accuracy...');
          navigator.geolocation.getCurrentPosition(
            onSuccess,
            onError,
            {
              ...options,
              enableHighAccuracy: false,
              timeout: 10000
            }
          );
        } else {
          onError(error);
        }
      }, 
      options
    );
  }, [onSuccess, onError, options, tryIPGeolocation]);

  // FIXED: Live Location Tracking with proper parent communication
  const startLiveLocationTracking = useCallback(() => {
    if (!navigator.geolocation || watchId) return;

    console.log('🎯 Starting live location tracking...');

    const liveOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000 // 30 seconds
    };

    const onLocationUpdate = (position) => {
      const newLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString(),
        source: 'gps_live',
        heading: position.coords.heading,
        speed: position.coords.speed,
        isAccurate: position.coords.accuracy < 100,
        note: `Live GPS tracking with ${Math.round(position.coords.accuracy)}m accuracy`
      };

      console.log('📍 Live location update:', {
        lat: newLocation.latitude.toFixed(6),
        lng: newLocation.longitude.toFixed(6),
        accuracy: Math.round(newLocation.accuracy)
      });

      // FIXED: Update location state directly
      setLocation(newLocation);
      setLoading(false);
      setError(null);
      setPermissionGranted(true);

      // Cache the live location
      try {
        const locationWithExpiry = {
          ...newLocation,
          expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes expiry
        };
        localStorage.setItem('lastKnownLocation', JSON.stringify(locationWithExpiry));
        localStorage.setItem('locationPermissionGranted', 'true');
        localStorage.setItem('lastLocationUpdate', Date.now().toString());
      } catch (e) {
        console.warn('Failed to cache live location:', e);
      }
    };

    const onLocationError = (error) => {
      console.warn('⚠️ Live location error:', error.message);
      // Don't stop tracking on individual errors, just log them
    };

    try {
      const id = navigator.geolocation.watchPosition(
        onLocationUpdate,
        onLocationError,
        liveOptions
      );
      
      setWatchId(id);
      console.log('✅ Live location tracking started');
    } catch (error) {
      console.error('❌ Failed to start live tracking:', error);
    }
  }, [watchId]);

  // INITIALIZATION: Try to get user's actual location on mount
  useEffect(() => {
    console.log('🔍 Initializing geolocation...');
    
    // Check permission status first
    const permissionStatus = localStorage.getItem('locationPermissionGranted');
    
    if (permissionStatus === 'denied') {
      console.log('📍 GPS previously denied, trying IP geolocation directly');
      tryIPGeolocation();
      return;
    }

    // Load cached location temporarily
    const hasCachedLocation = checkCachedLocation();
    
    // ALWAYS try to get fresh GPS location (this is the key fix)
    console.log('🎯 Attempting to get user\'s actual GPS location...');
    requestLocation();
    
    // If no cached location and GPS takes too long, fallback to IP after 8 seconds
    if (!hasCachedLocation) {
      const fallbackTimer = setTimeout(() => {
        if (loading) {
          console.log('📍 GPS taking too long, trying IP geolocation...');
          tryIPGeolocation();
        }
      }, 8000);
      
      return () => clearTimeout(fallbackTimer);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  // Clear permission denied status
  const clearPermissionDenied = useCallback(() => {
    localStorage.removeItem('locationPermissionGranted');
    setPermissionGranted(false);
    setError(null);
    setLoading(true);
    
    // Retry getting GPS location
    requestLocation();
  }, [requestLocation]);

  // Start watching position (for continuous tracking) - UPDATED
  const startWatching = useCallback(() => {
    // Use the new live tracking function
    startLiveLocationTracking();
  }, [startLiveLocationTracking]);

  const stopWatching = useCallback(() => {
    if (watchId) {
      console.log('📍 Stopping GPS position watching...');
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  const getDistanceTo = useCallback((targetLat, targetLng) => {
    if (!location) return null;

    const R = 6371e3; // Earth's radius in meters
    const φ1 = location.latitude * Math.PI / 180;
    const φ2 = targetLat * Math.PI / 180;
    const Δφ = (targetLat - location.latitude) * Math.PI / 180;
    const Δλ = (targetLng - location.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }, [location]);

  const formatLocation = useCallback(() => {
    if (!location) return null;

    return {
      ...location,
      formattedCoords: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
      accuracyText: location.accuracy < 50 ? 'High precision' : 
                   location.accuracy < 200 ? 'Good precision' : 
                   location.accuracy < 1000 ? 'Medium precision' : 'Low precision',
      sourceText: {
        gps: 'GPS',
        gps_live: 'Live GPS',
        ip: 'IP Address',
        cache: 'Cached',
        fallback: 'Default Location'
      }[location.source] || 'Unknown',
      isReliable: (location.source === 'gps' || location.source === 'gps_live') && location.accuracy < 100
    };
  }, [location]);

  return {
    location,
    loading,
    error,
    isWatching: !!watchId,
    permissionGranted,
    requestLocation,
    startWatching,
    stopWatching,
    getDistanceTo,
    formatLocation,
    clearPermissionDenied,
    startLiveLocationTracking, // NEW: Added live tracking function
    
    // Helper methods
    hasReliableLocation: (location?.source === 'gps' || location?.source === 'gps_live') && location?.accuracy < 100,
    hasAnyLocation: !!location,
    isHighAccuracy: location?.accuracy && location.accuracy < 50,
    isUsingFallback: location?.source === 'fallback',
    isUsingGPS: location?.source === 'gps' || location?.source === 'gps_live',
    isUsingIP: location?.source === 'ip',
    isLiveTracking: !!watchId && location?.source === 'gps_live',
    
    // Show modal only for explicit permission denial
    shouldShowLocationModal: error?.code === 'PERMISSION_DENIED' && 
                            localStorage.getItem('locationPermissionGranted') === 'denied'
  };
};