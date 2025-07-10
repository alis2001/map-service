// hooks/useGeolocation.js - INSTANT IP-BASED LOCATION + Geolocation Backup
// Location: /frontend/src/hooks/useGeolocation.js

import { useState, useEffect, useCallback, useRef } from 'react';

export const useGeolocation = () => {
  // Core states
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Detection states
  const [detectionMethod, setDetectionMethod] = useState('detecting');
  const [detectionPhase, setDetectionPhase] = useState('initializing');
  const [locationCapability, setLocationCapability] = useState('unknown');
  const [permissionState, setPermissionState] = useState('prompt');
  
  // Refs for tracking
  const detectionCompletedRef = useRef(false);
  const watchIdRef = useRef(null);

  // 🌍 **INSTANT IP-BASED LOCATION DETECTION**
  const getIPLocation = useCallback(async () => {
    try {
      console.log('🌍 Trying IP-based location (instant)...');
      
      // Try multiple IP geolocation services
      const ipServices = [
        // Free, fast IP location services
        'https://ipapi.co/json/',
        'https://ip-api.com/json/',
        'https://ipinfo.io/json'
      ];
      
      for (const service of ipServices) {
        try {
          const response = await fetch(service, { timeout: 2000 });
          if (!response.ok) continue;
          
          const data = await response.json();
          
          // Parse different service formats
          let lat, lng, city, country;
          
          if (service.includes('ipapi.co')) {
            lat = data.latitude;
            lng = data.longitude;
            city = data.city;
            country = data.country_name;
          } else if (service.includes('ip-api.com')) {
            lat = data.lat;
            lng = data.lon;
            city = data.city;
            country = data.country;
          } else if (service.includes('ipinfo.io')) {
            const coords = data.loc?.split(',');
            lat = coords ? parseFloat(coords[0]) : null;
            lng = coords ? parseFloat(coords[1]) : null;
            city = data.city;
            country = data.country;
          }
          
          if (lat && lng && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
            console.log('🌍 IP location SUCCESS:', { lat, lng, city, country });
            
            return {
              latitude: lat,
              longitude: lng,
              accuracy: 5000, // IP location is city-level
              timestamp: new Date().toISOString(),
              source: 'ip',
              method: 'IP Geolocation',
              quality: 'acceptable',
              confidence: 0.7,
              city,
              country,
              detectionTime: Date.now()
            };
          }
        } catch (serviceError) {
          console.warn(`IP service ${service} failed:`, serviceError.message);
          continue;
        }
      }
      
      throw new Error('All IP services failed');
      
    } catch (error) {
      console.warn('🌍 IP location failed:', error.message);
      return null;
    }
  }, []);

  // 📍 **BROWSER GEOLOCATION (BACKUP)**
  const getBrowserLocation = useCallback(async () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      
      console.log('📍 Trying browser geolocation (backup)...');
      
      const timeoutId = setTimeout(() => {
        reject(new Error('Browser geolocation timeout'));
      }, 5000); // 5 second timeout
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          const coords = position.coords;
          
          const result = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            heading: coords.heading,
            speed: coords.speed,
            altitude: coords.altitude,
            timestamp: new Date().toISOString(),
            source: coords.accuracy < 100 ? 'gps' : 'browser',
            method: 'Browser Geolocation',
            quality: determineLocationQuality(coords.accuracy),
            confidence: calculateConfidence(coords),
            detectionTime: Date.now()
          };
          
          console.log('📍 Browser location SUCCESS:', {
            accuracy: Math.round(coords.accuracy) + 'm',
            source: result.source
          });
          
          resolve(result);
        },
        (error) => {
          clearTimeout(timeoutId);
          console.warn('📍 Browser location failed:', error.message);
          reject(error);
        },
        {
          enableHighAccuracy: false, // Keep this false for speed
          timeout: 4000,
          maximumAge: 60000
        }
      );
    });
  }, []);

  // ⚡ **INSTANT MULTI-METHOD DETECTION**
  const runInstantDetection = useCallback(async () => {
    if (detectionCompletedRef.current) return;

    console.log('⚡ Starting INSTANT location detection...');
    setDetectionPhase('detecting');
    setLoading(true);

    // 1. INSTANT: Check cache first (under 5 minutes = fresh)
    const cached = getCachedLocation();
    if (cached && isLocationFresh(cached, 5 * 60 * 1000)) {
      console.log('⚡ INSTANT cached location');
      setLocation(cached);
      setDetectionMethod('cache');
      setError(null);
      setLoading(false);
      setDetectionPhase('completed');
      detectionCompletedRef.current = true;
      return;
    }

    try {
      // 2. PARALLEL: Try IP location AND browser geolocation simultaneously
      console.log('🏃‍♂️ Running parallel detection: IP + Browser...');
      
      const detectionPromises = [
        getIPLocation(),
        getBrowserLocation()
      ];
      
      // Race all methods - first successful wins
      const results = await Promise.allSettled(detectionPromises);
      
      // Check results in order of preference
      let bestResult = null;
      
      // Prefer GPS/accurate browser location if available
      const browserResult = results[1];
      if (browserResult.status === 'fulfilled' && browserResult.value) {
        if (browserResult.value.accuracy < 1000) {
          bestResult = browserResult.value;
          console.log('🏆 Winner: High-accuracy browser location');
        }
      }
      
      // Otherwise use IP location (should be instant)
      if (!bestResult) {
        const ipResult = results[0];
        if (ipResult.status === 'fulfilled' && ipResult.value) {
          bestResult = ipResult.value;
          console.log('🏆 Winner: IP-based location');
        }
      }
      
      // Fallback to any browser location
      if (!bestResult && browserResult.status === 'fulfilled' && browserResult.value) {
        bestResult = browserResult.value;
        console.log('🏆 Winner: Any browser location');
      }
      
      if (bestResult) {
        console.log('🎯 Detection SUCCESS:', {
          method: bestResult.method,
          accuracy: bestResult.accuracy ? Math.round(bestResult.accuracy) + 'm' : 'city-level',
          source: bestResult.source
        });

        detectionCompletedRef.current = true;
        setLocation(bestResult);
        setDetectionMethod(bestResult.source);
        setError(null);
        setLoading(false);
        setDetectionPhase('completed');
        cacheLocation(bestResult);
        return;
      }

    } catch (detectionError) {
      console.warn('⚠️ All detection methods failed:', detectionError.message);
    }
    
    // 3. FALLBACK: Use stale cache if available
    if (cached) {
      console.log('📦 Using stale cache as fallback');
      setLocation({ ...cached, source: 'cache', isStale: true });
      setDetectionMethod('cache');
      setError(null);
      setLoading(false);
      setDetectionPhase('completed');
      detectionCompletedRef.current = true;
      return;
    }
    
    // 4. ULTIMATE FALLBACK: Default Turin location
    console.log('🎯 Using default Turin location');
    const defaultLocation = {
      latitude: 45.0703,
      longitude: 7.6869,
      accuracy: 10000,
      timestamp: new Date().toISOString(),
      source: 'default',
      method: 'Default Turin',
      quality: 'acceptable',
      confidence: 0.5,
      city: 'Turin',
      country: 'Italy',
      detectionTime: Date.now(),
      isDefault: true
    };
    
    setLocation(defaultLocation);
    setDetectionMethod('default');
    setError(null);
    setLoading(false);
    setDetectionPhase('completed');
    detectionCompletedRef.current = true;
  }, [getIPLocation, getBrowserLocation]);

  // 🎯 **DETERMINE LOCATION QUALITY**
  const determineLocationQuality = (accuracy) => {
    if (!accuracy) return 'acceptable'; // IP location
    if (accuracy <= 100) return 'excellent';
    if (accuracy <= 500) return 'good';
    if (accuracy <= 2000) return 'acceptable';
    return 'poor';
  };

  // 🎯 **CALCULATE CONFIDENCE**
  const calculateConfidence = (coords) => {
    let confidence = 0.5;
    
    if (coords.accuracy <= 50) confidence += 0.4;
    else if (coords.accuracy <= 200) confidence += 0.3;
    else if (coords.accuracy <= 1000) confidence += 0.2;
    else if (coords.accuracy <= 5000) confidence += 0.1;

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
      expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
    };

    try {
      localStorage.setItem('instant_location_cache', JSON.stringify(cacheEntry));
      console.log('💾 Location cached (10min)');
    } catch (e) {
      console.warn('Cache write failed:', e);
    }
  };

  const getCachedLocation = () => {
    try {
      const stored = localStorage.getItem('instant_location_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.expiresAt > Date.now()) {
          console.log('📦 Fresh cache found');
          return parsed;
        } else {
          localStorage.removeItem('instant_location_cache');
          return parsed; // Return expired for fallback
        }
      }
    } catch (e) {
      console.warn('Cache read failed:', e);
    }
    return null;
  };

  const isLocationFresh = (location, maxAge) => {
    return location && location.cachedAt && (Date.now() - location.cachedAt) < maxAge;
  };

  // 🎬 **INSTANT START ON MOUNT**
  useEffect(() => {
    console.log('⚡ Initializing INSTANT location detection...');
    setLocationCapability('good'); // Assume good with IP fallback
    
    // Start detection immediately
    runInstantDetection();
    
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [runInstantDetection]);

  // 📊 **RETURN INSTANT LOCATION DATA**
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
    isHighAccuracy: location?.accuracy && location.accuracy < 200,
    qualityText: location?.quality || 'unknown',
    sourceText: location?.source === 'gps' ? 'GPS' : 
                location?.source === 'browser' ? 'Browser' :
                location?.source === 'ip' ? 'IP Location' :
                location?.source === 'cache' ? 'Cache' : 
                location?.source === 'default' ? 'Default' : 'Unknown',
    
    // Status helpers
    isDetecting: detectionPhase === 'detecting',
    isCompleted: detectionPhase === 'completed',
    isDefault: location?.isDefault || false,
    isStale: location?.isStale || false,
    
    // Manual actions
    requestLocation: () => {
      console.log('🔄 Manual location refresh requested');
      detectionCompletedRef.current = false;
      setLoading(true);
      runInstantDetection();
    },
    
    requestFreshGPS: () => {
      console.log('🛰️ Fresh GPS requested');
      detectionCompletedRef.current = false;
      setLoading(true);
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = position.coords;
            const result = {
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
              timestamp: new Date().toISOString(),
              source: 'gps',
              method: 'Fresh GPS',
              quality: determineLocationQuality(coords.accuracy),
              confidence: calculateConfidence(coords),
              detectionTime: Date.now()
            };
            
            setLocation(result);
            setDetectionMethod('gps');
            setError(null);
            setLoading(false);
            setDetectionPhase('completed');
            cacheLocation(result);
          },
          (error) => {
            console.error('GPS request failed:', error);
            setError(error);
            setLoading(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      }
    },
    
    // Debug info
    debugInfo: {
      detectionMethod,
      phase: detectionPhase,
      capability: locationCapability,
      completed: detectionCompletedRef.current
    }
  };
};