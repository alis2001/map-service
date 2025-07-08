// hooks/useGeolocation.js
// Location: /map-service/frontend/src/hooks/useGeolocation.js

import { useState, useEffect, useCallback } from 'react';

export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);

  // Geolocation options
  const options = {
    enableHighAccuracy: true,
    timeout: 10000, // 10 seconds
    maximumAge: 5 * 60 * 1000 // 5 minutes cache
  };

  // Success callback
  const onSuccess = useCallback((position) => {
    console.log('📍 Geolocation success:', {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy
    });

    const newLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: new Date().toISOString(),
      source: 'gps'
    };

    setLocation(newLocation);
    setLoading(false);
    setError(null);

    // Store in localStorage for future use
    try {
      localStorage.setItem('lastKnownLocation', JSON.stringify(newLocation));
    } catch (e) {
      console.warn('Failed to store location in localStorage:', e);
    }
  }, []);

  // Error callback
  const onError = useCallback((error) => {
    console.error('❌ Geolocation error:', error);
    
    let errorMessage = '';
    let errorCode = '';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Accesso alla posizione negato dall\'utente';
        errorCode = 'PERMISSION_DENIED';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Informazioni sulla posizione non disponibili';
        errorCode = 'POSITION_UNAVAILABLE';
        break;
      case error.TIMEOUT:
        errorMessage = 'Timeout nella richiesta di posizione';
        errorCode = 'TIMEOUT';
        break;
      default:
        errorMessage = 'Errore sconosciuto nel rilevamento posizione';
        errorCode = 'UNKNOWN_ERROR';
        break;
    }

    setError({
      message: errorMessage,
      code: errorCode,
      originalError: error
    });
    setLoading(false);

    // Try to use last known location from localStorage
    try {
      const lastLocation = localStorage.getItem('lastKnownLocation');
      if (lastLocation) {
        const parsedLocation = JSON.parse(lastLocation);
        // Check if location is not too old (less than 1 hour)
        const locationAge = Date.now() - new Date(parsedLocation.timestamp).getTime();
        if (locationAge < 60 * 60 * 1000) { // 1 hour
          console.log('📍 Using cached location from localStorage');
          setLocation({
            ...parsedLocation,
            source: 'cache'
          });
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to retrieve cached location:', e);
    }

    // Try IP-based geolocation as fallback
    tryIPGeolocation();
  }, []);

  // IP-based geolocation fallback
  const tryIPGeolocation = useCallback(async () => {
    try {
      console.log('🌐 Trying IP-based geolocation fallback...');
      
      // You can use services like ipapi.co, ipinfo.io, etc.
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();

      if (data.latitude && data.longitude) {
        const ipLocation = {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          accuracy: 10000, // IP location is less accurate
          timestamp: new Date().toISOString(),
          source: 'ip',
          city: data.city,
          country: data.country_name
        };

        console.log('📍 IP-based location found:', ipLocation);
        setLocation(ipLocation);
        setError(null);
      }
    } catch (ipError) {
      console.warn('IP geolocation also failed:', ipError);
      // Use default location (Turin, Italy) as final fallback
      const defaultLocation = {
        latitude: parseFloat(process.env.REACT_APP_DEFAULT_LOCATION_LAT) || 45.0703,
        longitude: parseFloat(process.env.REACT_APP_DEFAULT_LOCATION_LNG) || 7.6869,
        accuracy: 50000,
        timestamp: new Date().toISOString(),
        source: 'default',
        city: 'Torino',
        country: 'Italy'
      };

      console.log('📍 Using default location:', defaultLocation);
      setLocation(defaultLocation);
    }
  }, []);

  // Request current position
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      const notSupportedError = {
        message: 'La geolocalizzazione non è supportata da questo browser',
        code: 'NOT_SUPPORTED'
      };
      setError(notSupportedError);
      setLoading(false);
      tryIPGeolocation();
      return;
    }

    setLoading(true);
    setError(null);

    console.log('📍 Requesting geolocation permission...');
    navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
  }, [onSuccess, onError, options, tryIPGeolocation]);

  // Start watching position
  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported for watching');
      return;
    }

    if (watchId) {
      console.log('Already watching position');
      return;
    }

    console.log('📍 Starting position watch...');
    const id = navigator.geolocation.watchPosition(onSuccess, onError, {
      ...options,
      timeout: 30000, // Longer timeout for watching
      maximumAge: 30 * 1000 // 30 seconds cache for watching
    });

    setWatchId(id);
  }, [watchId, onSuccess, onError, options]);

  // Stop watching position
  const stopWatching = useCallback(() => {
    if (watchId) {
      console.log('📍 Stopping position watch...');
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  // Auto-request location on mount (if enabled)
  useEffect(() => {
    const autoLocation = process.env.REACT_APP_ENABLE_GEOLOCATION === 'true';
    
    if (autoLocation && !location && !loading && !error) {
      // Small delay to allow component to mount properly
      const timer = setTimeout(() => {
        requestLocation();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [location, loading, error, requestLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, [stopWatching]);

  // Check if location permission was previously granted
  const checkPermission = useCallback(async () => {
    if (!navigator.permissions) {
      return 'unknown';
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      return permission.state; // 'granted', 'denied', or 'prompt'
    } catch (e) {
      console.warn('Failed to check geolocation permission:', e);
      return 'unknown';
    }
  }, []);

  // Get distance from current location to a point
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

  // Format location for display
  const formatLocation = useCallback(() => {
    if (!location) return null;

    return {
      ...location,
      formattedCoords: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
      accuracyText: location.accuracy < 100 ? 'Alta precisione' : 
                   location.accuracy < 1000 ? 'Media precisione' : 'Bassa precisione',
      sourceText: {
        gps: 'GPS',
        ip: 'Indirizzo IP',
        cache: 'Posizione salvata',
        default: 'Posizione predefinita'
      }[location.source] || 'Sconosciuta'
    };
  }, [location]);

  return {
    location,
    loading,
    error,
    isWatching: !!watchId,
    requestLocation,
    startWatching,
    stopWatching,
    checkPermission,
    getDistanceTo,
    formatLocation
  };
};