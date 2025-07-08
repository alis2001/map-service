// hooks/useGeolocation.js - FIXED VERSION with Immediate Default Location
// Location: /map-service/frontend/src/hooks/useGeolocation.js

import { useState, useEffect, useCallback } from 'react';

export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // OPTIMIZED: Geolocation options for better accuracy
  const options = {
    enableHighAccuracy: true,
    timeout: 10000, // 10 seconds timeout
    maximumAge: 5 * 60 * 1000 // 5 minutes cache
  };

  // OPTIMIZED: Use Italian default immediately without delay
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
    setLoading(false); // Stop loading
    setError(null); // Clear error
    setPermissionGranted(false); // Mark as no permission but working
    
    // Cache default location
    try {
      const locationWithExpiry = {
        ...defaultLocation,
        expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour expiry for default
      };
      localStorage.setItem('lastKnownLocation', JSON.stringify(locationWithExpiry));
    } catch (e) {
      console.warn('Failed to cache default location:', e);
    }
  }, []);

  // OPTIMIZED: Faster IP geolocation with shorter timeout
  const tryIPGeolocation = useCallback(async () => {
    try {
      console.log('🌐 Trying IP-based geolocation...');
      
      const providers = [
        'https://ipapi.co/json/',
        'https://ipinfo.io/json',
        'http://ip-api.com/json'
      ];

      for (const provider of providers) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
          
          const response = await fetch(provider, { 
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
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
          } else if (provider.includes('ip-api.com')) {
            latitude = data.lat;
            longitude = data.lon;
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

            console.log('📍 IP-based location found:', ipLocation);
            setLocation(ipLocation);
            setLoading(false);
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
      console.warn('All IP geolocation methods failed, using Italian default:', ipError);
      useItalianDefault();
    }
  }, [useItalianDefault]);

  // OPTIMIZED: Better cached location handling with immediate fallback
  const checkCachedLocation = useCallback(() => {
    try {
      const cachedLocation = localStorage.getItem('lastKnownLocation');
      const permissionStatus = localStorage.getItem('locationPermissionGranted');
      
      if (permissionStatus === 'true') {
        setPermissionGranted(true);
        setError(null);
      }
      
      if (cachedLocation) {
        const parsedLocation = JSON.parse(cachedLocation);
        
        // Use cached location even if expired (better than nothing)
        if (parsedLocation.latitude && parsedLocation.longitude) {
          console.log('📍 Using cached location (may be expired)');
          setLocation({
            ...parsedLocation,
            source: 'cache'
          });
          setError(null);
          return true;
        }
      }
      
      // If no cached location, use default immediately
      console.log('📍 No cached location, using default');
      useItalianDefault();
      return false;
    } catch (e) {
      console.warn('Failed to retrieve cached location:', e);
      useItalianDefault();
    }
    return false;
  }, [useItalianDefault]);

  // Success callback with improved validation and persistence
  const onSuccess = useCallback((position) => {
    const coords = position.coords;
    
    console.log('📍 Geolocation success:', {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      timestamp: new Date(position.timestamp).toISOString()
    });

    // Validate coordinates are reasonable (not 0,0 or extreme values)
    if (coords.latitude === 0 && coords.longitude === 0) {
      console.warn('📍 Invalid coordinates (0,0) received, keeping current location');
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
    setPermissionGranted(true);

    // Store both location and permission status
    try {
      const locationWithExpiry = {
        ...newLocation,
        expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes expiry
      };
      localStorage.setItem('lastKnownLocation', JSON.stringify(locationWithExpiry));
      localStorage.setItem('locationPermissionGranted', 'true');
      localStorage.setItem('lastLocationUpdate', Date.now().toString());
      console.log('📍 GPS location and permission status cached');
    } catch (e) {
      console.warn('Failed to store location in localStorage:', e);
    }
  }, []);

  // OPTIMIZED: Better error handling with permission tracking
  const onError = useCallback((error) => {
    console.error('❌ Geolocation error:', error);
    
    let errorMessage = '';
    let errorCode = '';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Accesso alla posizione negato.';
        errorCode = 'PERMISSION_DENIED';
        localStorage.setItem('locationPermissionGranted', 'denied');
        setPermissionGranted(false);
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Posizione GPS non disponibile.';
        errorCode = 'POSITION_UNAVAILABLE';
        break;
      case error.TIMEOUT:
        errorMessage = 'Timeout GPS.';
        errorCode = 'TIMEOUT';
        break;
      default:
        errorMessage = 'Errore di geolocalizzazione.';
        errorCode = 'UNKNOWN_ERROR';
        break;
    }

    setError({
      message: errorMessage,
      code: errorCode,
      originalError: error
    });
    setLoading(false);

    // For non-permission errors, silently continue with current location
    if (error.code !== error.PERMISSION_DENIED) {
      console.log('📍 GPS failed, continuing with current location or using IP fallback');
      if (!location) {
        tryIPGeolocation();
      }
    }
  }, [location, tryIPGeolocation]);

  // OPTIMIZED: More intelligent position request
  const requestLocation = useCallback(() => {
    // Check if user previously denied permission
    const permissionStatus = localStorage.getItem('locationPermissionGranted');
    
    if (permissionStatus === 'denied') {
      console.log('📍 User previously denied permission, not requesting again');
      return;
    }

    if (!navigator.geolocation) {
      const notSupportedError = {
        message: 'La geolocalizzazione non è supportata da questo browser',
        code: 'NOT_SUPPORTED'
      };
      setError(notSupportedError);
      setLoading(false);
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
              timeout: 8000
            }
          );
        } else {
          onError(error);
        }
      }, 
      options
    );
  }, [onSuccess, onError, options]);

  // OPTIMIZED: Initialize location immediately without waiting for permission
  useEffect(() => {
    if (!location && !loading) {
      console.log('🔍 Initializing location immediately...');
      
      // First check cached location, if none use default immediately
      const hasCachedLocation = checkCachedLocation();
      
      // Try to get GPS in background if geolocation is enabled
      if (process.env.REACT_APP_ENABLE_GEOLOCATION === 'true') {
        setTimeout(() => {
          console.log('📍 Trying GPS in background...');
          requestLocation();
        }, 2000); // Try GPS after 2 seconds in background
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

  // Clear permission denied status (for retry button)
  const clearPermissionDenied = useCallback(() => {
    localStorage.removeItem('locationPermissionGranted');
    setPermissionGranted(false);
    setError(null);
  }, []);

  // Start watching position
  const startWatching = useCallback(() => {
    if (!navigator.geolocation || watchId || !permissionGranted) return;

    console.log('📍 Starting position watch...');
    const id = navigator.geolocation.watchPosition(onSuccess, onError, {
      ...options,
      timeout: 30000,
      maximumAge: 60 * 1000 // 1 minute cache for watching
    });

    setWatchId(id);
  }, [watchId, onSuccess, onError, options, permissionGranted]);

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
    
    // OPTIMIZED: Better error state detection - only show modal for explicit permission denial
    shouldShowLocationModal: error?.code === 'PERMISSION_DENIED' && 
                            localStorage.getItem('locationPermissionGranted') === 'denied'
  };
};