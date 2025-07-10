// services/locationService.js - COMPREHENSIVE LOCATION DETECTION SERVICE
// Location: /frontend/src/services/locationService.js

import { apiUtils } from './apiService';

// Enhanced Location Service - Complete Implementation with PDF Optimizations
// Location: /frontend/src/services/locationService.js

class EnhancedLocationService {
  constructor() {
    this.cache = new Map();
    this.capabilities = null;
    this.permissionState = 'prompt';
    this.lastLocation = null;
    
    // Italian IP service for better local precision
    this.italianIPService = 'https://api.ipinfo.io/json?token=YOUR_TOKEN';
    
    // Enhanced detection methods with progressive enhancement
    this.config = {
      detectionMethods: [
        {
          id: 'gps_ultra_high',
          name: 'GPS Ultra High Accuracy',
          options: { enableHighAccuracy: true, timeout: 25000, maximumAge: 60000 },
          priority: 1,
          timeout: 25000,
          requiresPermission: true
        },
        {
          id: 'gps_desktop_optimized',
          name: 'Desktop Optimized GPS',
          options: { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
          priority: 2,
          timeout: 10000,
          requiresPermission: true
        },
        {
          id: 'gps_quick',
          name: 'Quick GPS',
          options: { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 },
          priority: 3,
          timeout: 5000,
          requiresPermission: true
        },
        {
          id: 'enhanced_ip',
          name: 'Enhanced IP Location',
          priority: 4,
          timeout: 5000,
          requiresPermission: false
        },
        {
          id: 'basic_ip',
          name: 'Basic IP Location',
          priority: 5,
          timeout: 3000,
          requiresPermission: false
        }
      ]
    };
  }

  // 🚀 **MAIN DETECTION METHOD WITH PROGRESSIVE ENHANCEMENT**
  async detectLocation(options = {}) {
    try {
      console.log('🚀 Starting enhanced location detection...');
      
      // Check cache first (15 minutes for desktop)
      const cached = this.getCachedLocation(900000);
      if (cached && !options.forceRefresh) {
        console.log('💾 Using cached location');
        return cached;
      }

      // Analyze device capabilities
      const capabilities = await this.analyzeCapabilities();
      
      // Progressive approach based on PDF recommendations
      try {
        // 1. Try standard geolocation with desktop-optimized settings
        const location = await this.getDesktopOptimizedLocation();
        
        // 2. Verify we got local precision, not Rome
        if (this.isLocalPrecision(location)) {
          this.cacheLocation(location);
          return location;
        }
        
        // 3. Fall back to enhanced IP + manual refinement
        return await this.getIPWithRefinement();
        
      } catch (error) {
        // 4. Final fallback: Enhanced IP location
        console.warn('GPS failed, using IP fallback:', error.message);
        return await this.getEnhancedIPLocation();
      }
      
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

  // 🎯 **DESKTOP OPTIMIZED LOCATION (PDF RECOMMENDATION)**
  async getDesktopOptimizedLocation() {
    const options = {
      enableHighAccuracy: false, // Critical for desktop
      timeout: 10000,           // 10 seconds for desktop
      maximumAge: 300000        // 5 minute cache acceptable
    };

    return new Promise((resolve, reject) => {
      // Browser-specific handling from PDF
      if (this.isChrome()) {
        this.getChromeLocation().then(resolve).catch(reject);
      } else if (this.isFirefox()) {
        this.getFirefoxLocation().then(resolve).catch(reject);
      } else {
        // Standard implementation for other browsers
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date().toISOString(),
              source: 'gps',
              method: 'Desktop Optimized GPS',
              quality: this.calculateQuality(position.coords),
              confidence: this.calculateConfidence(position.coords)
            });
          },
          reject,
          options
        );
      }
    });
  }

  // 🔥 **CHROME-SPECIFIC OPTIMIZATION (PDF)**
  getChromeLocation() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      
      function attempt() {
        navigator.geolocation.getCurrentPosition(
          position => resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
            source: 'gps',
            method: 'Chrome Optimized',
            quality: 'good'
          }),
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
  }

  // 🦊 **FIREFOX-SPECIFIC OPTIMIZATION (PDF)**
  getFirefoxLocation() {
    return new Promise((resolve, reject) => {
      let completed = false;
      
      // Manual timeout to bypass Firefox bugs
      const timeoutId = setTimeout(() => {
        if (!completed) {
          completed = true;
          reject(new Error('Manual timeout'));
        }
      }, 12000);

      navigator.geolocation.getCurrentPosition(
        position => {
          if (!completed) {
            completed = true;
            clearTimeout(timeoutId);
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: new Date().toISOString(),
              source: 'gps',
              method: 'Firefox Optimized',
              quality: 'good'
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
  }

  // 🌍 **ENHANCED IP GEOLOCATION (PDF)**
  async getEnhancedIPLocation() {
    try {
      // IPinfo provides neighborhood-level data for Italian IPs
      const response = await fetch('https://ipinfo.io/json?token=YOUR_TOKEN');
      const data = await response.json();
      
      // Returns actual city, not just major metropolitan area
      return {
        latitude: parseFloat(data.loc.split(',')[0]),
        longitude: parseFloat(data.loc.split(',')[1]),
        accuracy: 5000, // City-district level
        city: data.city,
        region: data.region,
        country: data.country,
        timestamp: new Date().toISOString(),
        source: 'ip',
        method: 'Enhanced IP Location',
        quality: 'acceptable',
        confidence: 0.7
      };
    } catch (error) {
      // Fallback to multiple IP services
      return await this.getMultipleIPServices();
    }
  }

  // 🔄 **MULTIPLE IP SERVICES FALLBACK**
  async getMultipleIPServices() {
    const ipServices = [
      'https://ipapi.co/json/',
      'https://ip-api.com/json/',
      'https://ipinfo.io/json'
    ];
    
    for (const service of ipServices) {
      try {
        const response = await fetch(service, { timeout: 3000 });
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
          return {
            latitude: lat,
            longitude: lng,
            accuracy: 5000,
            city,
            country,
            timestamp: new Date().toISOString(),
            source: 'ip',
            method: 'IP Geolocation',
            quality: 'acceptable',
            confidence: 0.6
          };
        }
      } catch (serviceError) {
        console.warn(`IP service ${service} failed:`, serviceError.message);
        continue;
      }
    }
    
    throw new Error('All IP services failed');
  }

  // 🔍 **PROGRESSIVE ENHANCEMENT WITH REFINEMENT**
  async getLocationProgressive() {
    // First: Get quick approximate location
    const quickOptions = {
      enableHighAccuracy: false,
      timeout: 5000,
      maximumAge: 600000 // 10 minutes
    };

    try {
      const rough = await this.getCurrentPosition(quickOptions);
      this.displayLocation(rough); // Show results immediately
      
      // Then: Refine if accuracy > 200m
      if (rough.coords.accuracy > 200) {
        const preciseOptions = {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        };
        const precise = await this.getCurrentPosition(preciseOptions);
        this.updateLocation(precise);
        return precise;
      }
      
      return rough;
    } catch (error) {
      // Fallback to alternative methods
      throw error;
    }
  }

  // 🧠 **INTELLIGENT CACHING (PDF)**
  cacheLocation(location) {
    const cacheKey = 'desktop_location';
    const cacheEntry = {
      ...location,
      timestamp: Date.now(),
      expiresAt: Date.now() + (15 * 60 * 1000) // 15 minutes for desktop
    };

    this.cache.set(cacheKey, cacheEntry);
    
    try {
      localStorage.setItem('enhanced_location_cache', JSON.stringify(cacheEntry));
      console.log('💾 Location cached (15min)');
    } catch (e) {
      console.warn('Cache write failed:', e);
    }
  }

  getCachedLocation(maxAge = 900000) {
    const cacheKey = 'desktop_location';
    const cached = this.cache.get(cacheKey);
    
    // Desktop cache valid for 15 minutes
    if (cached && (Date.now() - cached.timestamp < maxAge)) {
      return cached;
    }

    // Try localStorage
    try {
      const stored = localStorage.getItem('enhanced_location_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.expiresAt > Date.now()) {
          console.log('📦 Fresh cache found');
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Cache read failed:', e);
    }
    
    return null;
  }

  // 🎯 **LOCAL PRECISION VALIDATION (PDF)**
  isLocalPrecision(location) {
    // Check if accuracy is neighborhood-level (< 1km)
    // and not defaulting to Rome coordinates
    const romeLat = 41.9028;
    const romeLng = 12.4964;
    
    const notRome = Math.abs(location.latitude - romeLat) > 0.5 ||
                   Math.abs(location.longitude - romeLng) > 0.5;
    
    return location.accuracy < 1000 && notRome;
  }

  // 📊 **MULTI-STAGE FALLBACK CHAIN (PDF)**
  async getLocationWithFallbacks() {
    const methods = [
      { name: 'GPS', func: () => this.getDesktopOptimizedLocation(), timeout: 10000 },
      { name: 'Enhanced IP', func: () => this.getEnhancedIPLocation(), timeout: 5000 },
      { name: 'Basic IP', func: () => this.getMultipleIPServices(), timeout: 3000 },
      { name: 'Manual', func: () => this.promptManualEntry(), timeout: null }
    ];

    for (const method of methods) {
      try {
        console.log(`Trying ${method.name}...`);
        const location = await method.func();
        if (location && location.accuracy < 10000) {
          return { ...location, method: method.name };
        }
      } catch (error) {
        console.warn(`${method.name} failed:`, error.message);
        continue;
      }
    }
    
    throw new Error('All location methods failed');
  }

  // 🔧 **BROWSER DETECTION UTILITIES**
  isChrome() {
    return /chrome/i.test(navigator.userAgent) && !/edge/i.test(navigator.userAgent);
  }

  isFirefox() {
    return /firefox/i.test(navigator.userAgent);
  }

  isSafari() {
    return /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
  }

  // 📐 **QUALITY CALCULATION**
  calculateQuality(coords) {
    if (coords.accuracy <= 50) return 'excellent';
    if (coords.accuracy <= 200) return 'good';
    if (coords.accuracy <= 1000) return 'acceptable';
    if (coords.accuracy <= 5000) return 'poor';
    return 'very_poor';
  }

  calculateConfidence(coords) {
    let confidence = 0.5; // Base confidence
    
    if (coords.accuracy <= 50) confidence += 0.4;
    else if (coords.accuracy <= 200) confidence += 0.3;
    else if (coords.accuracy <= 1000) confidence += 0.2;
    else if (coords.accuracy <= 5000) confidence += 0.1;

    if (coords.speed !== null) confidence += 0.05;
    if (coords.heading !== null) confidence += 0.05;
    if (coords.altitude !== null) confidence += 0.03;

    return Math.min(confidence, 1.0);
  }

  // 🔍 **DEVICE CAPABILITY ANALYSIS**
  async analyzeCapabilities() {
    if (this.capabilities) return this.capabilities;

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
      } catch (e) {
        capabilities.permission = 'unknown';
      }
    }

    // Determine overall capability level
    capabilities.level = this.determineCapabilityLevel(capabilities);
    this.capabilities = capabilities;
    
    return capabilities;
  }

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

  analyzeConnection() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    return {
      available: !!connection,
      type: connection?.effectiveType || 'unknown',
      speed: connection?.downlink || 0,
      quality: this.getConnectionQuality(connection)
    };
  }

  getConnectionQuality(connection) {
    if (!connection) return 'unknown';
    
    const effectiveType = connection.effectiveType;
    if (effectiveType === '4g') return 'excellent';
    if (effectiveType === '3g') return 'good';
    if (effectiveType === '2g') return 'poor';
    return 'fair';
  }

  // 🚀 **HELPER METHODS**
  getCurrentPosition(options) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  displayLocation(location) {
    // Update UI immediately with approximate location
    console.log('📍 Displaying approximate location:', location);
  }

  updateLocation(location) {
    // Update UI with refined location
    console.log('🎯 Updating with precise location:', location);
  }

  getFallbackLocation() {
    // Return any cached location as emergency fallback
    try {
      const stored = localStorage.getItem('enhanced_location_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('🆘 Using emergency fallback cache');
        return { ...parsed, source: 'fallback_cache' };
      }
    } catch (e) {
      console.warn('Fallback cache read failed:', e);
    }
    return null;
  }

  async promptManualEntry() {
    // This would integrate with your UI for manual location entry
    throw new Error('Manual entry not implemented');
  }
}

// Export singleton instance
export const enhancedLocationService = new EnhancedLocationService();
export default enhancedLocationService;