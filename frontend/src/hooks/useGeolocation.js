// hooks/useGeolocation.js - ULTRA-FAST OPTIMIZED VERSION
// Location: /frontend/src/hooks/useGeolocation.js

import { useState, useEffect, useCallback, useRef } from 'react';

export const useGeolocation = () => {
  // Core states
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Detection metadata
  const [detectionMethod, setDetectionMethod] = useState('detecting');
  const [locationCapability, setLocationCapability] = useState('unknown');
  const [hasLocation, setHasLocation] = useState(false);
  const [isHighAccuracy, setIsHighAccuracy] = useState(false);
  const [qualityText, setQualityText] = useState('unknown');
  const [sourceText, setSourceText] = useState('detecting');
  const [isDetecting, setIsDetecting] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  
  // Detection tracking
  const detectionStartRef = useRef(null);
  const detectionCompletedRef = useRef(false);
  const watchIdRef = useRef(null);
  const timeoutRef = useRef(null);

  // 🚀 **ULTRA-FAST DEVICE-SPECIFIC DETECTION**
  const detectDeviceType = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;
    
    const browser = /chrome/i.test(userAgent) ? 'chrome' : 
                   /firefox/i.test(userAgent) ? 'firefox' :
                   /safari/i.test(userAgent) ? 'safari' :
                   /edge/i.test(userAgent) ? 'edge' : 'other';

    return {
      isMobile,
      isTablet,
      isDesktop,
      browser,
      platform: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
    };
  }, []);

  // 📱 **MOBILE OPTIMIZED LOCATION (HIGH ACCURACY)**
  const getMobileOptimizedLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      const options = {
        enableHighAccuracy: true,    // Critical for mobile GPS
        timeout: 15000,             // 15 seconds for mobile
        maximumAge: 60000           // 1 minute cache for mobile
      };

      const timeoutId = setTimeout(() => {
        reject(new Error('Mobile GPS timeout'));
      }, options.timeout);

      navigator.geolocation.getCurrentPosition(
        (position) => {
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
            method: 'Mobile GPS',
            quality: coords.accuracy < 50 ? 'excellent' : 
                    coords.accuracy < 200 ? 'good' : 'acceptable',
            confidence: calculateConfidence(coords)
          });
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        options
      );
    });
  }, []);

  // 🖥️ **DESKTOP OPTIMIZED LOCATION (WIFI/NETWORK)**
  const getDesktopOptimizedLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      const options = {
        enableHighAccuracy: false,   // Use WiFi/network positioning
        timeout: 8000,              // 8 seconds for desktop
        maximumAge: 300000          // 5 minutes cache for desktop
      };

      const timeoutId = setTimeout(() => {
        reject(new Error('Desktop location timeout'));
      }, options.timeout);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          const coords = position.coords;
          
          resolve({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            timestamp: new Date().toISOString(),
            source: 'network',
            method: 'Desktop WiFi/Network',
            quality: coords.accuracy < 100 ? 'excellent' : 
                    coords.accuracy < 500 ? 'good' : 
                    coords.accuracy < 2000 ? 'acceptable' : 'poor',
            confidence: calculateConfidence(coords)
          });
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        options
      );
    });
  }, []);

  // 🔥 **CHROME ULTRA-FAST DETECTION**
  const getChromeOptimizedLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 2;
      
      function attemptLocation() {
        const options = {
          enableHighAccuracy: attempts === 0 ? false : true,
          timeout: attempts === 0 ? 5000 : 10000,
          maximumAge: attempts === 0 ? 300000 : 60000
        };

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = position.coords;
            resolve({
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
              timestamp: new Date().toISOString(),
              source: options.enableHighAccuracy ? 'gps' : 'network',
              method: `Chrome Optimized (attempt ${attempts + 1})`,
              quality: coords.accuracy < 100 ? 'excellent' : 'good'
            });
          },
          (error) => {
            if (error.code === 3 && attempts < maxAttempts - 1) {
              attempts++;
              console.log(`🔄 Chrome retry attempt ${attempts + 1}`);
              setTimeout(attemptLocation, 1000);
            } else {
              reject(error);
            }
          },
          options
        );
      }
      
      attemptLocation();
    });
  }, []);

  // 🦊 **FIREFOX OPTIMIZED DETECTION**
  const getFirefoxOptimizedLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      let completed = false;
      
      // Firefox needs longer timeouts and special handling
      const manualTimeoutId = setTimeout(() => {
        if (!completed) {
          completed = true;
          reject(new Error('Firefox manual timeout'));
        }
      }, 12000);

      const options = {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!completed) {
            completed = true;
            clearTimeout(manualTimeoutId);
            
            const coords = position.coords;
            resolve({
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
              timestamp: new Date().toISOString(),
              source: 'network',
              method: 'Firefox Optimized',
              quality: coords.accuracy < 200 ? 'good' : 'acceptable'
            });
          }
        },
        (error) => {
          if (!completed) {
            completed = true;
            clearTimeout(manualTimeoutId);
            reject(error);
          }
        },
        options
      );
    });
  }, []);

  // 🌍 **IP GEOLOCATION FALLBACK (ONLY IF GPS FAILS)**
  const getIPGeolocation = useCallback(async () => {
    console.log('🌍 Attempting IP geolocation as fallback...');
    
    const services = [
      'https://ipapi.co/json/',
      'https://ip-api.com/json/',
      'https://ipinfo.io/json'
    ];
    
    for (const service of services) {
      try {
        const response = await fetch(service, { 
          timeout: 3000,
          headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) continue;
        
        const data = await response.json();
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
          console.log('🌍 IP location successful:', { lat, lng, city });
          
          return {
            latitude: lat,
            longitude: lng,
            accuracy: 5000, // City-level accuracy
            city,
            country,
            timestamp: new Date().toISOString(),
            source: 'ip',
            method: 'IP Geolocation',
            quality: 'poor',
            confidence: 0.6
          };
        }
      } catch (serviceError) {
        console.warn(`IP service ${service} failed:`, serviceError.message);
        continue;
      }
    }
    
    throw new Error('All IP geolocation services failed');
  }, []);

  // 🎯 **MAIN DETECTION ORCHESTRATOR**
  const startLocationDetection = useCallback(async () => {
    if (detectionCompletedRef.current) return;

    setLoading(true);
    setError(null);
    setIsDetecting(true);
    detectionStartRef.current = Date.now();
    
    console.log('🚀 Starting ultra-fast location detection...');

    try {
      // Step 1: Analyze device capabilities
      const deviceInfo = detectDeviceType();
      console.log('📱 Device detected:', deviceInfo);
      
      setLocationCapability(deviceInfo.platform);

      // Step 2: Choose optimal detection method based on device
      let detectionPromise;
      
      if (deviceInfo.isMobile || deviceInfo.isTablet) {
        console.log('📱 Using mobile-optimized detection');
        detectionPromise = getMobileOptimizedLocation();
        setDetectionMethod('mobile_gps');
      } else if (deviceInfo.browser === 'chrome') {
        console.log('🔥 Using Chrome-optimized detection');
        detectionPromise = getChromeOptimizedLocation();
        setDetectionMethod('chrome_optimized');
      } else if (deviceInfo.browser === 'firefox') {
        console.log('🦊 Using Firefox-optimized detection');
        detectionPromise = getFirefoxOptimizedLocation();
        setDetectionMethod('firefox_optimized');
      } else {
        console.log('🖥️ Using desktop-optimized detection');
        detectionPromise = getDesktopOptimizedLocation();
        setDetectionMethod('desktop_network');
      }

      // Step 3: Race between optimal method and fallback
      const raceTimeout = deviceInfo.isMobile ? 20000 : 12000;
      
      const timeoutPromise = new Promise((_, reject) => {
        timeoutRef.current = setTimeout(() => {
          reject(new Error(`Detection timeout after ${raceTimeout}ms`));
        }, raceTimeout);
      });

      const result = await Promise.race([detectionPromise, timeoutPromise]);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Step 4: Validate and set location
      if (result && isValidLocation(result)) {
        const detectionTime = Date.now() - detectionStartRef.current;
        console.log(`✅ Location detected in ${detectionTime}ms:`, {
          method: result.method,
          accuracy: Math.round(result.accuracy) + 'm',
          quality: result.quality
        });

        setLocation(result);
        setHasLocation(true);
        setIsHighAccuracy(result.accuracy < 200);
        setQualityText(result.quality);
        setSourceText(result.source);
        setDetectionMethod(result.method);
        setIsDefault(false);
        
        // Cache successful location
        cacheLocation(result);
        
        detectionCompletedRef.current = true;
      } else {
        throw new Error('Invalid location data received');
      }

    } catch (primaryError) {
      console.warn('⚠️ Primary detection failed:', primaryError.message);
      
      // ONLY use IP fallback if explicitly requested (removed by default)
      console.log('❌ No fallback - requiring actual user location');
      
      setError('Unable to detect your location. Please enable location services.');
      setHasLocation(false);
      setIsDefault(false);
      
    } finally {
      setLoading(false);
      setIsDetecting(false);
    }
  }, [detectDeviceType, getMobileOptimizedLocation, getDesktopOptimizedLocation, getChromeOptimizedLocation, getFirefoxOptimizedLocation]);

  // 🔄 **REFRESH LOCATION**
  const refreshLocation = useCallback(() => {
    console.log('🔄 Refreshing location...');
    
    detectionCompletedRef.current = false;
    setLocation(null);
    setHasLocation(false);
    setError(null);
    clearLocationCache();
    
    startLocationDetection();
  }, [startLocationDetection]);

  // 🎯 **GET HIGH PRECISION LOCATION**
  const getPreciseLocation = useCallback(async () => {
    console.log('🎯 Getting high precision location...');
    
    try {
      setLoading(true);
      
      const options = {
        enableHighAccuracy: true,
        timeout: 25000,
        maximumAge: 0 // Force fresh location
      };

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });

      const coords = position.coords;
      const preciseLocation = {
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
      };

      setLocation(preciseLocation);
      setHasLocation(true);
      setIsHighAccuracy(true);
      cacheLocation(preciseLocation);
      
      return preciseLocation;
    } catch (error) {
      console.error('❌ High precision location failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 🧮 **UTILITY FUNCTIONS**
  const calculateConfidence = useCallback((coords) => {
    let confidence = 0.5;
    
    if (coords.accuracy <= 50) confidence += 0.4;
    else if (coords.accuracy <= 200) confidence += 0.3;
    else if (coords.accuracy <= 1000) confidence += 0.2;
    else if (coords.accuracy <= 5000) confidence += 0.1;

    if (coords.speed !== null) confidence += 0.05;
    if (coords.heading !== null) confidence += 0.05;
    if (coords.altitude !== null) confidence += 0.03;

    return Math.min(confidence, 1.0);
  }, []);

  const isValidLocation = useCallback((location) => {
    return location &&
           typeof location.latitude === 'number' &&
           typeof location.longitude === 'number' &&
           Math.abs(location.latitude) <= 90 &&
           Math.abs(location.longitude) <= 180 &&
           location.accuracy > 0;
  }, []);

  // 💾 **CACHE MANAGEMENT**
  const cacheLocation = useCallback((location) => {
    try {
      const cacheEntry = {
        ...location,
        cachedAt: Date.now(),
        expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
      };
      
      localStorage.setItem('fast_location_cache', JSON.stringify(cacheEntry));
      console.log('💾 Location cached successfully');
    } catch (error) {
      console.warn('Cache write failed:', error);
    }
  }, []);

  const getCachedLocation = useCallback(() => {
    try {
      const cached = localStorage.getItem('fast_location_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.expiresAt > Date.now()) {
          console.log('📦 Using fresh cached location');
          return { ...parsed, source: 'cache' };
        } else {
          localStorage.removeItem('fast_location_cache');
        }
      }
    } catch (error) {
      console.warn('Cache read failed:', error);
    }
    return null;
  }, []);

  const clearLocationCache = useCallback(() => {
    try {
      localStorage.removeItem('fast_location_cache');
      console.log('🗑️ Location cache cleared');
    } catch (error) {
      console.warn('Cache clear failed:', error);
    }
  }, []);

  // 🎬 **INITIALIZE ON MOUNT**
  useEffect(() => {
    console.log('⚡ Initializing ultra-fast geolocation...');
    
    // Check for cached location first
    const cached = getCachedLocation();
    if (cached) {
      console.log('💾 Found cached location, using immediately');
      setLocation(cached);
      setHasLocation(true);
      setIsHighAccuracy(cached.accuracy < 200);
      setQualityText(cached.quality || 'cached');
      setSourceText(cached.source);
      setDetectionMethod('cache');
      setLoading(false);
      setIsDetecting(false);
      detectionCompletedRef.current = true;
    } else {
      // Start fresh detection
      startLocationDetection();
    }

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [startLocationDetection, getCachedLocation]);

  // 📊 **RETURN OPTIMIZED LOCATION DATA**
  return {
    // Core location data
    location,
    loading,
    error,
    
    // Status indicators  
    hasLocation,
    isHighAccuracy,
    isDetecting,
    isDefault,
    
    // Quality indicators
    qualityText,
    sourceText,
    detectionMethod,
    locationCapability,
    
    // Actions
    refreshLocation,
    getPreciseLocation,
    clearLocationCache,
    
    // Performance info
    detectionTime: detectionStartRef.current ? Date.now() - detectionStartRef.current : null,
    
    // Compatibility info
    browserSupported: !!navigator.geolocation,
    permissionsAPI: 'permissions' in navigator
  };
};

export default useGeolocation;