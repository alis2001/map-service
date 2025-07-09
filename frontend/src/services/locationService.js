// services/locationService.js - COMPREHENSIVE LOCATION DETECTION SERVICE
// Location: /frontend/src/services/locationService.js

import { apiUtils } from './apiService';

class LocationService {
  constructor() {
    this.cache = new Map();
    this.activeDetections = new Map();
    this.lastLocation = null;
    this.capabilities = null;
    this.permissionState = 'prompt';
    
    // Service configuration
    this.config = {
      // Detection methods ranked by priority and accuracy
      detectionMethods: [
        {
          id: 'gps_ultra',
          name: 'GPS Ultra High Accuracy',
          priority: 1,
          timeout: 20000,
          options: { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
          expectedAccuracy: 5
        },
        {
          id: 'gps_high',
          name: 'GPS High Accuracy',
          priority: 2,
          timeout: 25000,
          options: { enableHighAccuracy: true, timeout: 25000, maximumAge: 30000 },
          expectedAccuracy: 15
        },
        {
          id: 'gps_balanced',
          name: 'GPS Balanced',
          priority: 3,
          timeout: 20000,
          options: { enableHighAccuracy: true, timeout: 20000, maximumAge: 120000 },
          expectedAccuracy: 50
        },
        {
          id: 'browser_network',
          name: 'Browser Network',
          priority: 4,
          timeout: 15000,
          options: { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
          expectedAccuracy: 200
        },
        {
          id: 'browser_cached',
          name: 'Browser Cached',
          priority: 5,
          timeout: 10000,
          options: { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
          expectedAccuracy: 500
        }
      ],
      
      // Quality thresholds
      qualityThresholds: {
        excellent: 20,
        good: 100,
        acceptable: 1000,
        poor: 5000
      },
      
      // Cache settings
      cache: {
        maxAge: 10 * 60 * 1000, // 10 minutes
        fallbackAge: 60 * 60 * 1000 // 1 hour for fallback
      }
    };
  }

  // 🔍 **ANALYZE DEVICE CAPABILITIES**
  async analyzeCapabilities() {
    if (this.capabilities) {
      return this.capabilities;
    }

    console.log('🔍 Analyzing device location capabilities...');
    
    const capabilities = {
      hasGeolocation: !!navigator.geolocation,
      platform: this.detectPlatform(),
      connection: this.analyzeConnection(),
      sensors: this.analyzeSensors(),
      performance: await this.analyzePerformance()
    };

    // Check permissions
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        this.permissionState = permission.state;
        capabilities.permission = permission.state;
        
        permission.addEventListener('change', () => {
          this.permissionState = permission.state;
          console.log('📍 Permission changed:', permission.state);
        });
      } catch (e) {
        capabilities.permission = 'unknown';
      }
    }

    // Determine overall capability level
    capabilities.level = this.determineCapabilityLevel(capabilities);
    capabilities.recommendedMethods = this.getRecommendedMethods(capabilities);

    this.capabilities = capabilities;
    
    console.log('📊 Device capabilities analyzed:', {
      level: capabilities.level,
      platform: capabilities.platform.type,
      methods: capabilities.recommendedMethods.length
    });

    return capabilities;
  }

  // 📱 **DETECT PLATFORM**
  detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    return {
      type: /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ? 'mobile' : 'desktop',
      os: /android/i.test(userAgent) ? 'android' : 
          /iphone|ipad|ipod/i.test(userAgent) ? 'ios' :
          /windows/i.test(userAgent) ? 'windows' :
          /mac/i.test(userAgent) ? 'mac' : 'unknown',
      browser: /chrome/i.test(userAgent) ? 'chrome' :
               /firefox/i.test(userAgent) ? 'firefox' :
               /safari/i.test(userAgent) ? 'safari' : 'other'
    };
  }

  // 🌐 **ANALYZE CONNECTION**
  analyzeConnection() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    return {
      available: !!connection,
      type: connection?.effectiveType || 'unknown',
      speed: connection?.downlink || 0,
      quality: this.getConnectionQuality(connection)
    };
  }

  // 📡 **ANALYZE SENSORS**
  analyzeSensors() {
    return {
      deviceMotion: 'DeviceMotionEvent' in window,
      deviceOrientation: 'DeviceOrientationEvent' in window,
      magnetometer: 'Magnetometer' in window,
      accelerometer: 'Accelerometer' in window,
      gyroscope: 'Gyroscope' in window
    };
  }

  // ⚡ **ANALYZE PERFORMANCE**
  async analyzePerformance() {
    const startTime = performance.now();
    
    // Simple performance test
    await new Promise(resolve => setTimeout(resolve, 1));
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    return {
      memory: navigator.deviceMemory || 0,
      cores: navigator.hardwareConcurrency || 1,
      responseTime,
      performanceLevel: responseTime < 2 ? 'high' : responseTime < 5 ? 'medium' : 'low'
    };
  }

  // 🎯 **DETERMINE CAPABILITY LEVEL**
  determineCapabilityLevel(capabilities) {
    let score = 0;

    // Base geolocation support
    if (!capabilities.hasGeolocation) return 'none';
    score += 10;

    // Platform bonus
    if (capabilities.platform.type === 'mobile') {
      score += 30;
      if (capabilities.sensors.deviceMotion) score += 10;
      if (capabilities.sensors.deviceOrientation) score += 5;
    } else {
      score += 15; // Desktop still decent
    }

    // Connection quality
    if (capabilities.connection.quality === 'excellent') score += 15;
    else if (capabilities.connection.quality === 'good') score += 10;
    else if (capabilities.connection.quality === 'fair') score += 5;

    // Permission state
    if (capabilities.permission === 'granted') score += 20;
    else if (capabilities.permission === 'prompt') score += 10;

    // Performance bonus
    if (capabilities.performance.performanceLevel === 'high') score += 10;
    else if (capabilities.performance.performanceLevel === 'medium') score += 5;

    // Determine level
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'acceptable';
    if (score >= 20) return 'poor';
    return 'limited';
  }

  // 🔧 **GET RECOMMENDED METHODS**
  getRecommendedMethods(capabilities) {
    const allMethods = [...this.config.detectionMethods];
    
    // Filter based on capability level
    switch (capabilities.level) {
      case 'excellent':
        return allMethods; // Use all methods
      case 'good':
        return allMethods.slice(0, 4); // Skip lowest priority
      case 'acceptable':
        return allMethods.slice(1, 4); // Skip ultra high, keep practical ones
      case 'poor':
        return allMethods.slice(2); // Only basic methods
      default:
        return allMethods.slice(3); // Only cached/network
    }
  }

  // 🏃‍♂️ **PARALLEL DETECTION SYSTEM**
  async detectLocation(options = {}) {
    const {
      preferredMethods = null,
      forceRefresh = false,
      timeout = 30000
    } = options;

    console.log('🏁 Starting parallel location detection...');

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.getCachedLocation();
      if (cached) {
        console.log('📦 Using cached location while detecting fresh...');
        // Return cached immediately but continue detection in background
        this.detectFreshLocation();
        return cached;
      }
    }

    return this.detectFreshLocation(preferredMethods, timeout);
  }

  // 🎯 **DETECT FRESH LOCATION**
  async detectFreshLocation(preferredMethods = null, timeout = 30000) {
    const capabilities = await this.analyzeCapabilities();
    const methods = preferredMethods || capabilities.recommendedMethods;

    console.log(`🎯 Running ${methods.length} detection methods in parallel...`);

    // Create detection promises
    const detectionPromises = methods.map(method => 
      this.createDetectionPromise(method)
    );

    try {
      // Race all methods - first successful wins
      const winnerPromise = Promise.race(
        detectionPromises.filter(promise => promise !== null)
      );

      // Also set a global timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Global detection timeout')), timeout);
      });

      const result = await Promise.race([winnerPromise, timeoutPromise]);

      console.log('🏆 Location detection winner:', {
        method: result.method,
        accuracy: Math.round(result.accuracy) + 'm',
        quality: result.quality
      });

      // Cache the result
      this.cacheLocation(result);
      this.lastLocation = result;

      return result;

    } catch (error) {
      console.error('❌ All location detection methods failed:', error);
      
      // Try fallback cache
      const fallback = this.getFallbackLocation();
      if (fallback) {
        console.log('🆘 Using fallback cached location');
        return fallback;
      }

      throw new Error('Location detection completely failed');
    }
  }

  // 🎯 **CREATE DETECTION PROMISE**
  createDetectionPromise(method) {
    if (!navigator.geolocation) {
      console.warn('❌ Geolocation not supported for', method.name);
      return null;
    }

    return new Promise((resolve, reject) => {
      console.log(`🎯 Starting ${method.name}...`);

      const timeoutId = setTimeout(() => {
        console.log(`⏰ ${method.name} timeout after ${method.timeout}ms`);
        reject(new Error(`${method.name} timeout`));
      }, method.timeout);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          
          const coords = position.coords;
          const now = new Date();
          
          const locationData = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            heading: coords.heading,
            speed: coords.speed,
            altitude: coords.altitude,
            timestamp: now.toISOString(),
            source: method.id.startsWith('gps') ? 'gps' : 'browser',
            method: method.name,
            methodId: method.id,
            quality: this.determineLocationQuality(coords.accuracy),
            confidence: this.calculateConfidence(coords, method),
            detectionTime: Date.now()
          };

          console.log(`✅ ${method.name} SUCCESS:`, {
            accuracy: Math.round(coords.accuracy) + 'm',
            quality: locationData.quality,
            confidence: locationData.confidence
          });

          resolve(locationData);
        },
        (error) => {
          clearTimeout(timeoutId);
          console.warn(`❌ ${method.name} failed:`, error.message);
          reject(error);
        },
        method.options
      );
    });
  }

  // 🎯 **DETERMINE LOCATION QUALITY**
  determineLocationQuality(accuracy) {
    const thresholds = this.config.qualityThresholds;
    
    if (accuracy <= thresholds.excellent) return 'excellent';
    if (accuracy <= thresholds.good) return 'good';
    if (accuracy <= thresholds.acceptable) return 'acceptable';
    return 'poor';
  }

  // 🎯 **CALCULATE CONFIDENCE**
  calculateConfidence(coords, method) {
    let confidence = 0.5; // Base confidence

    // Accuracy bonus
    if (coords.accuracy <= 10) confidence += 0.4;
    else if (coords.accuracy <= 50) confidence += 0.3;
    else if (coords.accuracy <= 200) confidence += 0.2;
    else if (coords.accuracy <= 1000) confidence += 0.1;

    // Method bonus
    if (method.id.includes('gps')) confidence += 0.2;
    if (method.id.includes('ultra')) confidence += 0.1;

    // Additional signals
    if (coords.speed !== null) confidence += 0.05;
    if (coords.heading !== null) confidence += 0.05;
    if (coords.altitude !== null) confidence += 0.03;

    return Math.min(confidence, 1.0);
  }

  // 💾 **CACHE MANAGEMENT**
  cacheLocation(location) {
    const cacheEntry = {
      ...location,
      cachedAt: Date.now(),
      expiresAt: Date.now() + this.config.cache.maxAge
    };

    try {
      localStorage.setItem('location_service_cache', JSON.stringify(cacheEntry));
      this.cache.set('current', cacheEntry);
      console.log('💾 Location cached successfully');
    } catch (e) {
      console.warn('Failed to cache location:', e);
    }
  }

  getCachedLocation() {
    try {
      // Check memory cache first
      const memoryCache = this.cache.get('current');
      if (memoryCache && memoryCache.expiresAt > Date.now()) {
        console.log('📦 Using memory cached location');
        return { ...memoryCache, source: 'cache' };
      }

      // Check localStorage
      const stored = localStorage.getItem('location_service_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.expiresAt > Date.now()) {
          console.log('📦 Using stored cached location');
          this.cache.set('current', parsed);
          return { ...parsed, source: 'cache' };
        } else {
          localStorage.removeItem('location_service_cache');
        }
      }
    } catch (e) {
      console.warn('Failed to get cached location:', e);
    }

    return null;
  }

  getFallbackLocation() {
    try {
      const stored = localStorage.getItem('location_service_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Use even expired cache as fallback
        if (parsed.cachedAt > Date.now() - this.config.cache.fallbackAge) {
          console.log('🆘 Using fallback cached location');
          return { ...parsed, source: 'fallback', isStale: true };
        }
      }
    } catch (e) {
      console.warn('Failed to get fallback location:', e);
    }

    return null;
  }

  // 🌍 **UTILITY METHODS**
  calculateDistance(lat1, lng1, lat2, lng2) {
    return apiUtils.calculateDistance(lat1, lng1, lat2, lng2);
  }

  formatDistance(distance) {
    return apiUtils.formatDistance(distance);
  }

  getConnectionQuality(connection) {
    if (!connection) return 'unknown';
    
    const effectiveType = connection.effectiveType;
    const downlink = connection.downlink || 0;

    if (effectiveType === '4g' && downlink > 10) return 'excellent';
    if (effectiveType === '4g' || downlink > 5) return 'good';
    if (effectiveType === '3g' || downlink > 1) return 'fair';
    return 'poor';
  }

  // 🏥 **HEALTH CHECK**
  async healthCheck() {
    try {
      const capabilities = await this.analyzeCapabilities();
      
      return {
        status: 'healthy',
        capabilities: capabilities.level,
        permission: this.permissionState,
        cachedLocation: !!this.getCachedLocation(),
        lastLocation: !!this.lastLocation,
        recommendedMethods: capabilities.recommendedMethods.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // 🧹 **CLEANUP**
  cleanup() {
    this.cache.clear();
    this.activeDetections.clear();
    console.log('🧹 Location service cleaned up');
  }
}

// Create and export singleton instance
const locationService = new LocationService();

export default locationService;