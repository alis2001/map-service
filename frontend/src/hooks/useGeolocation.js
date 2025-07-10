// Complete Enhanced Geolocation Hook - With All PDF Optimizations
// Location: /frontend/src/hooks/useGeolocation.js

import { useState, useEffect, useCallback, useRef } from 'react';

export const useEnhancedGeolocation = () => {
  // Core states
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Detection states
  const [detectionMethod, setDetectionMethod] = useState('detecting');
  const [detectionPhase, setDetectionPhase] = useState('initializing');
  const [locationCapability, setLocationCapability] = useState('unknown');
  const [permissionState, setPermissionState] = useState('prompt');
  
  // Performance tracking
  const [detectionTime, setDetectionTime] = useState(null);
  const [qualityMetrics, setQualityMetrics] = useState(null);
  
  // Refs for tracking
  const detectionCompletedRef = useRef(false);
  const watchIdRef = useRef(null);
  const startTimeRef = useRef(null);

  // 🌍 **INSTANT IP-BASED LOCATION DETECTION**
  const getIPLocation = useCallback(async () => {
    try {
      console.log('🌍 Trying IP-based location (instant)...');
      
      // Try multiple IP geolocation services
      const ipServices = [
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

  // 📍 **DESKTOP OPTIMIZED GPS LOCATION (PDF APPROACH)**
  const getDesktopOptimizedLocation = useCallback(async () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      
      console.log('🖥️ Trying desktop-optimized geolocation...');
      
      // PDF-recommended desktop options
      const desktopOptions = {
        enableHighAccuracy: false, // Critical for desktop - uses WiFi positioning
        timeout: 10000,           // 10 seconds for desktop
        maximumAge: 300000        // 5 minute cache acceptable
      };
      
      const timeoutId = setTimeout(() => {
        reject(new Error('Desktop geolocation timeout'));
      }, desktopOptions.timeout);
      
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
            source: 'gps',
            method: 'Desktop Optimized GPS',
            quality: coords.accuracy < 100 ? 'excellent' : 
                    coords.accuracy < 500 ? 'good' : 
                    coords.accuracy < 2000 ? 'acceptable' : 'poor',
            confidence: calculateConfidence(coords),
            detectionTime: Date.now()
          };
          
          console.log('🖥️ Desktop GPS SUCCESS:', {
            accuracy: Math.round(coords.accuracy) + 'm',
            quality: result.quality
          });
          
          resolve(result);
        },
        (error) => {
          clearTimeout(timeoutId);
          console.warn('🖥️ Desktop GPS failed:', error.message);
          reject(error);
        },
        desktopOptions
      );
    });
  }, []);

  // 🔥 **CHROME-SPECIFIC OPTIMIZATION**
  const getChromeOptimizedLocation = useCallback(async () => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      
      function attempt() {
        navigator.geolocation.getCurrentPosition(
          position => {
            const coords = position.coords;
            resolve({
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
              heading: coords.heading,
              speed: coords.speed,
              altitude: coords.altitude,
              timestamp: new Date().toISOString(),
              source: 'gps',
              method: 'Chrome Optimized',
              quality: coords.accuracy < 200 ? 'good' : 'acceptable'
            });
          },
          error => {
            if (error.code === 3 && attempts < 2) {
              attempts++;
              setTimeout(attempt, 1000); // Retry after 1 second
            } else {
              reject(error);
            }
          },
          {
            enableHighAccuracy: false,
            timeout: 8000 + (attempts * 4000), // Increase timeout on retry
            maximumAge: 300000
          }
        );
      }
      
      attempt();
    });
  }, []);

  // 🦊 **FIREFOX-SPECIFIC OPTIMIZATION**
  const getFirefoxOptimizedLocation = useCallback(async () => {
    return new Promise((resolve, reject) => {
      let completed = false;
      
      // Manual timeout to bypass Firefox bugs
      const timeoutId = setTimeout(() => {
        if (!completed) {
          completed = true;
          reject(new Error('Firefox manual timeout'));
        }
      }, 12000);

      navigator.geolocation.getCurrentPosition(
        position => {
          if (!completed) {
            completed = true;
            clearTimeout(timeoutId);
            const coords = position.coords;
            resolve({
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
              heading: coords.heading,
              speed: coords.speed,
              altitude: coords.altitude,
              timestamp: new Date().toISOString(),
              source: 'gps',
              method: 'Firefox Optimized',
              quality: coords.accuracy < 200 ? 'good' : 'acceptable'
            });
          }
        },
        error => {
          if (!completed) {
            completed = true;
            clearTimeout(timeoutId);
            reject(error);
          }
        },
        { enableHighAccuracy: false, timeout: 15000 }
      );
    });
  }, []);

  // 🔍 **LOCAL PRECISION VALIDATION (AVOID ROME PROBLEM)**
  const isLocalPrecision = useCallback((location) => {
    // Check if accuracy is neighborhood-level (< 1km)
    // and not defaulting to Rome coordinates
    const romeLat = 41.9028;
    const romeLng = 12.4964;
    
    const notRome = Math.abs(location.latitude - romeLat) > 0.5 ||
                   Math.abs(location.longitude - romeLng) > 0.5;
    
    return location.accuracy < 1000 && notRome;
  }, []);

  // 🚀 **PROGRESSIVE ENHANCEMENT DETECTION**
  const runProgressiveDetection = useCallback(async () => {
    try {
      console.log('🚀 Starting progressive enhancement detection...');
      
      // Phase 1: Immediate IP location for user feedback
      setDetectionPhase('getting_ip_location');
      const ipLocationPromise = getIPLocation();
      
      // Phase 2: GPS detection in parallel
      setDetectionPhase('attempting_gps');
      const gpsLocationPromise = getBrowserOptimizedLocation();
      
      // Show IP location immediately if available
      const ipResult = await ipLocationPromise;
      if (ipResult) {
        setLocation({ ...ipResult, preliminary: true });
        console.log('📍 Showing IP location immediately');
      }

      // Wait for GPS with timeout
      try {
        const gpsResult = await Promise.race([
          gpsLocationPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('GPS timeout')), 12000)
          )
        ]);

        // Prefer GPS if it has local precision
        if (gpsResult && isLocalPrecision(gpsResult)) {
          console.log('🎯 GPS provided local precision, using GPS');
          return gpsResult;
        }
      } catch (gpsError) {
        console.warn('GPS failed or timeout:', gpsError.message);
      }

      // Fall back to IP location
      if (ipResult) {
        console.log('🌍 Using IP location as final result');
        return { ...ipResult, preliminary: false };
      }

      throw new Error('All detection methods failed');

    } catch (error) {
      console.error('Progressive detection failed:', error);
      throw error;
    }
  }, [getIPLocation, isLocalPrecision]);

  // 🔧 **BROWSER-OPTIMIZED GPS DETECTION**
  const getBrowserOptimizedLocation = useCallback(async () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent)) {
      console.log('🔥 Using Chrome optimization');
      return await getChromeOptimizedLocation();
    } else if (/firefox/i.test(userAgent)) {
      console.log('🦊 Using Firefox optimization');
      return await getFirefoxOptimizedLocation();
    } else {
      console.log('🖥️ Using standard desktop optimization');
      return await getDesktopOptimizedLocation();
    }
  }, [getChromeOptimizedLocation, getFirefoxOptimizedLocation, getDesktopOptimizedLocation]);

  // 🚀 **MAIN DETECTION FUNCTION**
  const runEnhancedDetection = useCallback(async () => {
    if (detectionCompletedRef.current) return;

    try {
      setLoading(true);
      setError(null);
      setDetectionPhase('initializing');
      startTimeRef.current = Date.now();
      
      console.log('🚀 Starting enhanced geolocation detection...');

      // Check cache first
      const cached = getCachedLocation();
      if (cached) {
        setLocation(cached);
        setDetectionMethod('cache');
        setLoading(false);
        detectionCompletedRef.current = true;
        console.log('💾 Using cached location');
        return;
      }

      // Run progressive detection
      const detectedLocation = await runProgressiveDetection();

      if (detectedLocation) {
        const finalLocation = {
          ...detectedLocation,
          detectionTime: Date.now() - startTimeRef.current,
          browserOptimized: true,
          progressive: true
        };

        setLocation(finalLocation);
        setDetectionMethod(finalLocation.method || 'progressive');
        setDetectionTime(finalLocation.detectionTime);
        setQualityMetrics({
          accuracy: finalLocation.accuracy,
          quality: finalLocation.quality,
          confidence: finalLocation.confidence,
          source: finalLocation.source
        });

        // Cache the result
        cacheLocation(finalLocation);
        
        detectionCompletedRef.current = true;
        console.log('✅ Enhanced detection completed:', {
          method: finalLocation.method,
          accuracy: Math.round(finalLocation.accuracy) + 'm',
          time: finalLocation.detectionTime + 'ms'
        });
      }

    } catch (detectionError) {
      console.error('❌ Enhanced detection failed:', detectionError);
      setError(detectionError.message);
      setDetectionMethod('failed');
      
      // Emergency fallback
      await tryEmergencyFallback();
    } finally {
      setLoading(false);
      setDetectionPhase('completed');
    }
  }, [runProgressiveDetection]);

  // 🆘 **EMERGENCY FALLBACK**
  const tryEmergencyFallback = useCallback(async () => {
    console.log('🆘 Attempting emergency fallback...');
    
    try {
      // Try basic IP location as last resort
      const fallbackLocation = await getIPLocation();
      
      if (fallbackLocation) {
        setLocation({
          ...fallbackLocation,
          emergency: true,
          method: 'Emergency IP Fallback'
        });
        setDetectionMethod('emergency_fallback');
        console.log('🆘 Emergency fallback successful');
      } else {
        // Final fallback: Turin, Italy default
        const defaultLocation = {
          latitude: 45.0703,
          longitude: 7.6869,
          accuracy: 10000,
          city: 'Turin',
          country: 'Italy',
          timestamp: new Date().toISOString(),
          source: 'default',
          method: 'Default Location',
          quality: 'poor',
          emergency: true,
          isDefault: true
        };
        
        setLocation(defaultLocation);
        setDetectionMethod('default_fallback');
        console.log('🏠 Using default Turin location');
      }
    } catch (fallbackError) {
      console.error('🆘 Emergency fallback also failed:', fallbackError);
    }
  }, [getIPLocation]);

  // 💾 **CACHE MANAGEMENT**
  const cacheLocation = useCallback((location) => {
    const cacheEntry = {
      ...location,
      cachedAt: Date.now(),
      expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
    };

    try {
      localStorage.setItem('enhanced_location_cache', JSON.stringify(cacheEntry));
      console.log('💾 Location cached (10min)');
    } catch (e) {
      console.warn('Cache write failed:', e);
    }
  }, []);

  const getCachedLocation = useCallback(() => {
    try {
      const stored = localStorage.getItem('enhanced_location_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.expiresAt > Date.now()) {
          console.log('📦 Fresh cache found');
          return { ...parsed, source: 'cache' };
        } else {
          localStorage.removeItem('enhanced_location_cache');
        }
      }
    } catch (e) {
      console.warn('Cache read failed:', e);
    }
    return null;
  }, []);

  // 🔄 **REFRESH LOCATION**
  const refreshLocation = useCallback(async () => {
    console.log('🔄 Refreshing location...');
    
    detectionCompletedRef.current = false;
    setLoading(true);
    setError(null);
    
    // Clear cache
    localStorage.removeItem('enhanced_location_cache');
    
    await runEnhancedDetection();
  }, [runEnhancedDetection]);

  // 🎯 **GET PRECISE LOCATION**
  const getPreciseLocation = useCallback(async () => {
    console.log('🎯 Getting precise location...');
    
    try {
      setLoading(true);
      
      const preciseOptions = {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      };

      const preciseLocation = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = position.coords;
            resolve({
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
              heading: coords.heading,
              speed: coords.speed,
              altitude: coords.altitude,
              timestamp: new Date().toISOString(),
              source: 'gps',
              method: 'High Precision GPS',
              quality: coords.accuracy < 50 ? 'excellent' : 
                      coords.accuracy < 100 ? 'good' : 'acceptable',
              confidence: calculateConfidence(coords)
            });
          },
          reject,
          preciseOptions
        );
      });
      
      setLocation(preciseLocation);
      setDetectionMethod('precise');
      cacheLocation(preciseLocation);
      
      return preciseLocation;
    } catch (error) {
      console.error('❌ Precise location failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [cacheLocation]);

  // 📊 **UTILITY FUNCTIONS**
  const calculateConfidence = useCallback((coords) => {
    let confidence = 0.5; // Base confidence
    
    if (coords.accuracy <= 50) confidence += 0.4;
    else if (coords.accuracy <= 200) confidence += 0.3;
    else if (coords.accuracy <= 1000) confidence += 0.2;
    else if (coords.accuracy <= 5000) confidence += 0.1;

    if (coords.speed !== null) confidence += 0.05;
    if (coords.heading !== null) confidence += 0.05;
    if (coords.altitude !== null) confidence += 0.03;

    return Math.min(confidence, 1.0);
  }, []);

  const clearLocationCache = useCallback(() => {
    localStorage.removeItem('enhanced_location_cache');
    console.log('🗑️ Location cache cleared');
  }, []);

  const getCacheInfo = useCallback(() => {
    const cached = getCachedLocation();
    return cached ? {
      hasCache: true,
      age: Date.now() - cached.cachedAt,
      expiresIn: cached.expiresAt - Date.now(),
      source: cached.source
    } : { hasCache: false };
  }, [getCachedLocation]);

  // 🎬 **INITIALIZE ON MOUNT**
  useEffect(() => {
    console.log('⚡ Initializing enhanced geolocation hook...');
    setLocationCapability('good'); // Assume good with IP fallback
    
    // Start detection immediately
    runEnhancedDetection();
    
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [runEnhancedDetection]);

  // 📊 **COMPUTED VALUES**
  const hasLocation = !!location;
  const isHighAccuracy = location?.accuracy && location.accuracy < 200;
  const isPreliminary = location?.preliminary === true;
  const isEmergency = location?.emergency === true;
  const isDefault = location?.isDefault === true;
  const isCached = location?.source === 'cache';
  
  const qualityText = location?.quality || 'unknown';
  const sourceText = location?.source === 'gps' ? 'GPS' : 
                    location?.source === 'ip' ? 'IP Location' :
                    location?.source === 'cache' ? 'Cached' : 
                    location?.source === 'default' ? 'Default' :
                    'Unknown';

  const accuracyText = location?.accuracy ? 
    location.accuracy < 50 ? 'Very High' :
    location.accuracy < 200 ? 'High' :
    location.accuracy < 1000 ? 'Medium' :
    location.accuracy < 5000 ? 'Low' : 'Very Low'
    : 'Unknown';

  // 📤 **RETURN ENHANCED LOCATION DATA**
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
    
    // Performance metrics
    detectionTime,
    qualityMetrics,
    
    // Computed values
    hasLocation,
    isHighAccuracy,
    isPreliminary,
    isEmergency,
    isDefault,
    isCached,
    qualityText,
    sourceText,
    accuracyText,
    
    // Cache information
    cacheInfo: getCacheInfo(),
    
    // Actions
    refreshLocation,
    getPreciseLocation,
    clearLocationCache,
    
    // Advanced capabilities
    capabilities: locationCapability,
    browserOptimized: true,
    progressiveEnhancement: true,
    
    // Debug info
    startTime: startTimeRef.current,
    detectionCompleted: detectionCompletedRef.current
  };
};

export default useEnhancedGeolocation;