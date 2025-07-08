// hooks/useGeolocation.js - FIXED VERSION for Better Location Detection
// Location: /map-service/frontend/src/hooks/useGeolocation.js

import { useState, useEffect, useCallback } from 'react';

export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);

  // IMPROVED: More aggressive geolocation options for better accuracy
  const options = {
    enableHighAccuracy: true,
    timeout: 15000, // Increased to 15 seconds for better GPS lock
    maximumAge: 2 * 60 * 1000 // 2 minutes cache (reduced for fresher location)
  };

  // Success callback with improved validation
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

    // Check if coordinates are within reasonable bounds for Italy/Europe
    const isReasonableLocation = 
      coords.latitude >= 35 && coords.latitude <= 47 &&  // Italy latitude range
      coords.longitude >= 6 && coords.longitude <= 19;   // Italy longitude range

    const newLocation = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
      timestamp: new Date().toISOString(),
      source: isReasonableLocation ? 'gps' : 'gps-global',
      isAccurate: coords.accuracy < 100, // High accuracy if < 100m
      heading: coords.heading,
      speed: coords.speed
    };

    setLocation(newLocation);
    setLoading(false);
    setError(null);

    // Store in localStorage with longer expiration for Italian users
    try {
      const locationWithExpiry = {
        ...newLocation,
        expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes expiry
      };
      localStorage.setItem('lastKnownLocation', JSON.stringify(locationWithExpiry));
      console.log('📍 Location cached for 30 minutes');
    } catch (e) {
      console.warn('Failed to store location in localStorage:', e);
    }
  }, []);

  // IMPROVED: Better error handling with Italian-specific fallbacks
  const onError = useCallback((error) => {
    console.error('❌ Geolocation error:', error);
    
    let errorMessage = '';
    let errorCode = '';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Accesso alla posizione negato. Abilita la geolocalizzazione nelle impostazioni del browser.';
        errorCode = 'PERMISSION_DENIED';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Posizione GPS non disponibile. Provo con la posizione IP...';
        errorCode = 'POSITION_UNAVAILABLE';
        break;
      case error.TIMEOUT:
        errorMessage = 'Timeout GPS. Provo con la posizione IP...';
        errorCode = 'TIMEOUT';
        break;
      default:
        errorMessage = 'Errore di geolocalizzazione. Provo con metodi alternativi...';
        errorCode = 'UNKNOWN_ERROR';
        break;
    }

    setError({
      message: errorMessage,
      code: errorCode,
      originalError: error
    });
    setLoading(false);

    // IMPROVED: Better fallback chain
    tryLastKnownLocation() || tryIPGeolocation();
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

  // IMPROVED: IP-based geolocation with multiple providers
  const tryIPGeolocation = useCallback(async () => {
    try {
      console.log('🌐 Trying IP-based geolocation...');
      
      // Try multiple IP geolocation services for better coverage in Italy
      const providers = [
        'https://ipapi.co/json/',
        'https://ipinfo.io/json',
        'https://ip-api.com/json'
      ];

      for (const provider of providers) {
        try {
          const response = await fetch(provider, { timeout: 5000 });
          const data = await response.json();

          let latitude, longitude, city, country;

          // Handle different provider response formats
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
              provider: provider.split('/')[2] // Extract domain name
            };

            console.log('📍 IP-based location found:', ipLocation);
            setLocation(ipLocation);
            setError(null);
            return;
          }
        } catch (providerError) {
          console.warn(`IP provider ${provider} failed:`, providerError);
          continue; // Try next provider
        }
      }

      // If all IP providers fail, use Italian default
      throw new Error('All IP geolocation providers failed');

    } catch (ipError) {
      console.warn('All IP geolocation methods failed:', ipError);
      useItalianDefault();
    }
  }, []);

  // IMPROVED: Use smart Italian default based on common cities
  const useItalianDefault = useCallback(() => {
    // Default to major Italian cities based on time zone or browser language
    const italianCities = [
      { name: 'Roma', lat: 41.9028, lng: 12.4964 },
      { name: 'Milano', lat: 45.4642, lng: 9.1900 },
      { name: 'Napoli', lat: 40.8518, lng: 14.2681 },
      { name: 'Torino', lat: 45.0703, lng: 7.6869 },
      { name: 'Firenze', lat: 43.7696, lng: 11.2558 }
    ];

    // Use Turin as default (or detect from browser)
    const defaultCity = italianCities.find(city => city.name === 'Torino') || italianCities[0];
    
    const defaultLocation = {
      latitude: defaultCity.lat,
      longitude: defaultCity.lng,
      accuracy: 50000,
      timestamp: new Date().toISOString(),
      source: 'default',
      city: defaultCity.name,
      country: 'Italy'
    };

    console.log('📍 Using Italian default location:', defaultLocation);
    setLocation(defaultLocation);
  }, []);

  // IMPROVED: More reliable position request
  const requestLocation = useCallback(() => {
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

    console.log('📍 Requesting high-accuracy geolocation...');
    
    // IMPROVED: Try high accuracy first, then fallback to lower accuracy
    navigator.geolocation.getCurrentPosition(
      onSuccess, 
      (error) => {
        if (error.code === error.TIMEOUT && options.enableHighAccuracy) {
          console.log('📍 High accuracy failed, trying standard accuracy...');
          // Retry with lower accuracy requirements
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
  }, [onSuccess, onError, options]);

  // Auto-request with smart timing
  useEffect(() => {
    const autoLocation = process.env.REACT_APP_ENABLE_GEOLOCATION === 'true';
    
    if (autoLocation && !location && !loading && !error) {
      // IMPROVED: Check for cached location first
      if (!tryLastKnownLocation()) {
        // Small delay to allow component to mount properly
        const timer = setTimeout(() => {
          requestLocation();
        }, 200);

        return () => clearTimeout(timer);
      }
    }
  }, [location, loading, error, requestLocation, tryLastKnownLocation]);

  // Keep existing methods but improve them...
  const startWatching = useCallback(() => {
    if (!navigator.geolocation || watchId) return;

    console.log('📍 Starting position watch...');
    const id = navigator.geolocation.watchPosition(onSuccess, onError, {
      ...options,
      timeout: 30000,
      maximumAge: 60 * 1000 // 1 minute cache for watching
    });

    setWatchId(id);
  }, [watchId, onSuccess, onError, options]);

  const stopWatching = useCallback(() => {
    if (watchId) {
      console.log('📍 Stopping position watch...');
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  // IMPROVED: Distance calculation helper
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

  // IMPROVED: Better location formatting
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
        'gps-global': 'GPS (globale)',
        ip: 'Indirizzo IP',
        cache: 'Posizione salvata',
        default: 'Posizione predefinita'
      }[location.source] || 'Sconosciuta',
      isReliable: location.source === 'gps' && location.accuracy < 100
    };
  }, [location]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, [stopWatching]);

  return {
    location,
    loading,
    error,
    isWatching: !!watchId,
    requestLocation,
    startWatching,
    stopWatching,
    getDistanceTo,
    formatLocation,
    
    // New helper methods
    hasReliableLocation: location?.source === 'gps' && location?.accuracy < 100,
    hasAnyLocation: !!location,
    isHighAccuracy: location?.accuracy && location.accuracy < 50
  };
};