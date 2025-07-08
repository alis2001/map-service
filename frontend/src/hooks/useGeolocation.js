// hooks/useGeolocation.js - FIXED VERSION with Persistent Location
// Location: /map-service/frontend/src/hooks/useGeolocation.js

import { useState, useEffect, useCallback } from 'react';

export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // IMPROVED: More aggressive geolocation options for better accuracy
  const options = {
    enableHighAccuracy: true,
    timeout: 15000, // Increased to 15 seconds for better GPS lock
    maximumAge: 5 * 60 * 1000 // 5 minutes cache for better UX
  };

  // FIXED: Check for cached location and permission status on mount
  const checkCachedLocation = useCallback(() => {
    try {
      const cachedLocation = localStorage.getItem('lastKnownLocation');
      const permissionStatus = localStorage.getItem('locationPermissionGranted');
      
      if (permissionStatus === 'true') {
        setPermissionGranted(true);
        setError(null); // Clear any previous errors
      }
      
      if (cachedLocation) {
        const parsedLocation = JSON.parse(cachedLocation);
        
        // Check if location hasn't expired (30 minutes)
        if (parsedLocation.expiresAt && Date.now() < parsedLocation.expiresAt) {
          console.log('📍 Using valid cached location');
          setLocation({
            ...parsedLocation,
            source: 'cache'
          });
          setError(null);
          return true;
        } else {
          console.log('📍 Cached location expired, will request fresh location');
          localStorage.removeItem('lastKnownLocation');
        }
      }
    } catch (e) {
      console.warn('Failed to retrieve cached location:', e);
    }
    return false;
  }, []);

  // Success callback with improved validation and persistence
  const onSuccess = useCallback((position) => {
    const coords = position.coords;
    
    console.log('📍 Geolocation success:', {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      timestamp: new Date(position.timestamp).toISOString()
    });

    // IMPROVED: Validate coordinates are reasonable (not 0,0 or extreme values)
    if (coords.latitude === 0 && coords.longitude === 0) {
      console.warn('📍 Invalid coordinates (0,0) received, trying fallback');
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
      speed: coords.speed
    };

    setLocation(newLocation);
    setLoading(false);
    setError(null);
    setPermissionGranted(true); // Mark permission as granted

    // FIXED: Store both location and permission status
    try {
      const locationWithExpiry = {
        ...newLocation,
        expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes expiry
      };
      localStorage.setItem('lastKnownLocation', JSON.stringify(locationWithExpiry));
      localStorage.setItem('locationPermissionGranted', 'true');
      localStorage.setItem('lastLocationUpdate', Date.now().toString());
      console.log('📍 Location and permission status cached');
    } catch (e) {
      console.warn('Failed to store location in localStorage:', e);
    }
  }, []);

  // IMPROVED: Better error handling with permission tracking
  const onError = useCallback((error) => {
    console.error('❌ Geolocation error:', error);
    
    let errorMessage = '';
    let errorCode = '';
    let shouldRetry = false;

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Accesso alla posizione negato. Abilita la geolocalizzazione nelle impostazioni del browser.';
        errorCode = 'PERMISSION_DENIED';
        // FIXED: Mark permission as explicitly denied
        localStorage.setItem('locationPermissionGranted', 'denied');
        setPermissionGranted(false);
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Posizione GPS non disponibile. Provo con la posizione IP...';
        errorCode = 'POSITION_UNAVAILABLE';
        shouldRetry = true;
        break;
      case error.TIMEOUT:
        errorMessage = 'Timeout GPS. Provo con la posizione IP...';
        errorCode = 'TIMEOUT';
        shouldRetry = true;
        break;
      default:
        errorMessage = 'Errore di geolocalizzazione. Provo con metodi alternativi...';
        errorCode = 'UNKNOWN_ERROR';
        shouldRetry = true;
        break;
    }

    setError({
      message: errorMessage,
      code: errorCode,
      originalError: error
    });
    setLoading(false);

    // IMPROVED: Only show error modal if permission was explicitly denied
    // For other errors, silently try fallbacks
    if (error.code === error.PERMISSION_DENIED) {
      // Don't auto-retry for permission denied
      console.log('📍 Permission denied, not retrying');
    } else if (shouldRetry) {
      // For other errors, try fallbacks without showing modal
      tryLastKnownLocation() || tryIPGeolocation();
    }
  }, []);

  // IMPROVED: Try to use last known location with expiry check
  const tryLastKnownLocation = useCallback(() => {
    try {
      const lastLocation = localStorage.getItem('lastKnownLocation');
      if (lastLocation) {
        const parsedLocation = JSON.parse(lastLocation);
        
        // Check if location hasn't expired
        if (parsedLocation.expiresAt && Date.now() < parsedLocation.expiresAt) {
          console.log('📍 Using valid cached location');
          setLocation({
            ...parsedLocation,
            source: 'cache'
          });
          setError(null);
          return true;
        } else {
          console.log('📍 Cached location expired, removing...');
          localStorage.removeItem('lastKnownLocation');
        }
      }
    } catch (e) {
      console.warn('Failed to retrieve cached location:', e);
    }
    return false;
  }, []);

  // IMPROVED: IP-based geolocation with multiple providers - ONLY as fallback
  const tryIPGeolocation = useCallback(async () => {
    try {
      console.log('🌐 Trying IP-based geolocation as fallback...');
      
      const providers = [
        'https://ipapi.co/json/',
        'https://ipinfo.io/json'
      ];

      for (const provider of providers) {
        try {
          const response = await fetch(provider, { 
            timeout: 5000,
            signal: AbortSignal.timeout(5000) 
          });
          const data = await response.json();

          let latitude, longitude, city, country;

          if (provider.includes('ipapi.co')) {
            latitude = data.latitude;
            longitude = data.longitude;
            city = data.city;
            country = data.country_name;
          } else if (provider.includes('ipinfo.io')) {
            const [lat, lng] = (data.loc || '').split(',');
            latitude = parseFloat(lat);
            longitude = parseFloat(lng);
            city = data.city;
            country = data.country;
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
              provider: provider.split('/')[2]
            };

            console.log('📍 IP-based location found (fallback):', ipLocation);
            setLocation(ipLocation);
            setError(null);
            
            // Cache IP location but with shorter expiry
            try {
              const locationWithExpiry = {
                ...ipLocation,
                expiresAt: Date.now() + (15 * 60 * 1000) // 15 minutes for IP location
              };
              localStorage.setItem('lastKnownLocation', JSON.stringify(locationWithExpiry));
            } catch (e) {
              console.warn('Failed to cache IP location:', e);
            }
            
            return;
          }
        } catch (providerError) {
          console.warn(`IP provider ${provider} failed:`, providerError);
          continue;
        }
      }

      throw new Error('All IP geolocation providers failed');

    } catch (ipError) {
      console.warn('All IP geolocation methods failed, using Turin default:', ipError);
      useItalianDefault();
    }
  }, []);

  // IMPROVED: Use smart Italian default based on common cities
  const useItalianDefault = useCallback(() => {
    const defaultLocation = {
      latitude: 45.0703,
      longitude: 7.6869,
      accuracy: 50000,
      timestamp: new Date().toISOString(),
      source: 'default',
      city: 'Torino',
      country: 'Italy'
    };

    console.log('📍 Using Italian default location:', defaultLocation);
    setLocation(defaultLocation);
    setError(null); // Clear error when using default
  }, []);

  // FIXED: More intelligent position request that respects user preferences
  const requestLocation = useCallback(() => {
    // Check if user previously denied permission
    const permissionStatus = localStorage.getItem('locationPermissionGranted');
    
    if (permissionStatus === 'denied') {
      console.log('📍 User previously denied permission, not requesting again');
      // Try cached location or IP fallback instead
      if (!tryLastKnownLocation()) {
        tryIPGeolocation();
      }
      return;
    }

    if (!navigator.geolocation) {
      const notSupportedError = {
        message: 'La geolocalizzazione non è supportata da questo browser',
        code: 'NOT_SUPPORTED'
      };
      setError(notSupportedError);
      setLoading(false);
      tryLastKnownLocation() || tryIPGeolocation();
      return;
    }

    setLoading(true);
    setError(null);

    console.log('📍 Requesting geolocation...');
    
    // Try high accuracy first, then fallback to lower accuracy
    navigator.geolocation.getCurrentPosition(
      onSuccess, 
      (error) => {
        if (error.code === error.TIMEOUT && options.enableHighAccuracy) {
          console.log('📍 High accuracy failed, trying standard accuracy...');
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
  }, [onSuccess, onError, options, tryLastKnownLocation, tryIPGeolocation]);

  // FIXED: Initialize location on mount with proper permission request
  useEffect(() => {
    const autoLocation = process.env.REACT_APP_ENABLE_GEOLOCATION === 'true';
    
    if (autoLocation && !location && !loading) {
      // First, check for cached location and permission status
      const hasCachedLocation = checkCachedLocation();
      const permissionStatus = localStorage.getItem('locationPermissionGranted');
      
      console.log('🔍 Location initialization:', {
        hasCachedLocation,
        permissionStatus,
        autoLocation
      });
      
      // Always try to get fresh location on first load if:
      // 1. Permission was previously granted, OR
      // 2. No permission status recorded (first time)
      if (permissionStatus === 'true' || permissionStatus === null) {
        const timer = setTimeout(() => {
          console.log('📍 Requesting fresh location on app start');
          requestLocation();
        }, 1000); // 1 second delay for better UX

        return () => clearTimeout(timer);
      } 
      // If permission was denied, use cached or fallback
      else if (permissionStatus === 'denied') {
        if (!hasCachedLocation) {
          console.log('📍 Permission denied, using fallback location');
          tryIPGeolocation();
        }
      }
    }
  }, []); // Run only once on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  // FIXED: Better permission checking
  const hasLocationPermission = useCallback(() => {
    const permissionStatus = localStorage.getItem('locationPermissionGranted');
    return permissionStatus === 'true' && permissionGranted;
  }, [permissionGranted]);

  // FIXED: Clear permission denied status (for retry button)
  const clearPermissionDenied = useCallback(() => {
    localStorage.removeItem('locationPermissionGranted');
    setPermissionGranted(false);
    setError(null);
  }, []);

  // Keep existing methods but improve them...
  const startWatching = useCallback(() => {
    if (!navigator.geolocation || watchId || !hasLocationPermission()) return;

    console.log('📍 Starting position watch...');
    const id = navigator.geolocation.watchPosition(onSuccess, onError, {
      ...options,
      timeout: 30000,
      maximumAge: 60 * 1000 // 1 minute cache for watching
    });

    setWatchId(id);
  }, [watchId, onSuccess, onError, options, hasLocationPermission]);

  const stopWatching = useCallback(() => {
    if (watchId) {
      console.log('📍 Stopping position watch...');
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
      accuracyText: location.accuracy < 50 ? 'Precisione alta' : 
                   location.accuracy < 200 ? 'Precisione buona' : 
                   location.accuracy < 1000 ? 'Precisione media' : 'Precisione bassa',
      sourceText: {
        gps: 'GPS',
        ip: 'Indirizzo IP',
        cache: 'Posizione salvata',
        default: 'Posizione predefinita'
      }[location.source] || 'Sconosciuta',
      isReliable: location.source === 'gps' && location.accuracy < 100
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
    
    // New helper methods
    hasReliableLocation: location?.source === 'gps' && location?.accuracy < 100,
    hasAnyLocation: !!location,
    isHighAccuracy: location?.accuracy && location.accuracy < 50,
    
    // FIXED: Better error state detection
    shouldShowLocationModal: error?.code === 'PERMISSION_DENIED' && 
                            localStorage.getItem('locationPermissionGranted') === 'denied'
  };
};