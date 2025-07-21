// components/FullPageMap.js - COMPLETE AIRBNB MARKER RENDERING SYSTEM
// Location: /frontend/src/components/FullPageMap.js

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import LoadingScreen from './LoadingScreen';
import MapUpdateLoader from './MapUpdateLoader';
import CafePopup from './CafePopup';
import MapControls from './MapControls';
import MarkerHoverTooltip from './MarkerHoverTooltip';

// AIRBNB'S MARKER POOL SYSTEM - Eliminates marker flickering
class AirbnbMarkerPool {
  constructor(mapInstance) {
    this.map = mapInstance;
    this.pool = [];
    this.activeMarkers = new Map();
    this.maxPoolSize = 100;
    this.animationFrameId = null;
    
    console.log('🏊‍♂️ Airbnb Marker Pool initialized');
  }

  getMarker(id, type = 'place') {
    let marker;
    
    if (this.pool.length > 0) {
      marker = this.pool.pop();
      console.log(`♻️ Reusing pooled marker for ${id}`);
    } else {
      marker = new window.google.maps.Marker({
        map: this.map,
        optimized: false // Required for smooth animations
      });
      console.log(`🆕 Created new marker for ${id}`);
    }

    // Add custom properties for tracking
    marker._poolId = id;
    marker._poolType = type;
    marker._isActive = true;
    marker._fadeElement = null;
    
    this.activeMarkers.set(id, marker);
    return marker;
  }

  releaseMarker(id) {
    const marker = this.activeMarkers.get(id);
    if (!marker) return;

    // Smooth fade out using CSS transforms
    this.fadeOutMarker(marker, () => {
      marker.setVisible(false);
      marker._isActive = false;
      
      // Return to pool if under limit
      if (this.pool.length < this.maxPoolSize) {
        this.pool.push(marker);
        console.log(`🔄 Released marker ${id} to pool`);
      } else {
        marker.setMap(null);
        console.log(`🗑️ Discarded excess marker ${id}`);
      }
    });

    this.activeMarkers.delete(id);
  }

  fadeOutMarker(marker, callback) {
    // Use requestAnimationFrame for smooth 60fps animation
    let opacity = 1;
    const fadeStep = () => {
      opacity -= 0.1;
      
      if (opacity <= 0) {
        callback();
        return;
      }
      
      // Apply hardware-accelerated opacity change
      if (marker.getIcon && marker.getIcon()) {
        const icon = marker.getIcon();
        const newIcon = {
          ...icon,
          url: icon.url + `&opacity=${opacity}`
        };
        marker.setIcon(newIcon);
      }
      
      this.animationFrameId = requestAnimationFrame(fadeStep);
    };
    
    this.animationFrameId = requestAnimationFrame(fadeStep);
  }

  clearPool() {
    // Cancel any ongoing animations
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Release all active markers
    this.activeMarkers.forEach((marker, id) => {
      this.releaseMarker(id);
    });
    
    // Clear the pool
    this.pool.forEach(marker => {
      if (marker.setMap) marker.setMap(null);
    });
    this.pool = [];
    
    console.log('🧹 Marker pool cleared');
  }

  getStats() {
    return {
      active: this.activeMarkers.size,
      pooled: this.pool.length,
      total: this.activeMarkers.size + this.pool.length
    };
  }
}

// AIRBNB'S VIEWPORT CULLING SYSTEM
class AirbnbViewportCuller {
  constructor() {
    this.currentViewport = null;
    this.observer = null;
    this.intersectionCallbacks = new Map();
    this.culledMarkers = new Set();
    
    console.log('👁️ Airbnb Viewport Culler initialized');
  }

  setViewport(bounds) {
    this.currentViewport = {
      north: bounds.getNorthEast().lat(),
      south: bounds.getSouthWest().lat(),
      east: bounds.getNorthEast().lng(),
      west: bounds.getSouthWest().lng()
    };
  }

  isInViewport(lat, lng, buffer = 0.01) {
    if (!this.currentViewport) return true;
    
    return lat >= this.currentViewport.south - buffer &&
           lat <= this.currentViewport.north + buffer &&
           lng >= this.currentViewport.west - buffer &&
           lng <= this.currentViewport.east + buffer;
  }

  cullMarkers(markers) {
    if (!this.currentViewport) return markers;
    
    return markers.filter(marker => {
      const lat = marker.location?.latitude || marker.latitude;
      const lng = marker.location?.longitude || marker.longitude;
      
      const isVisible = this.isInViewport(lat, lng, 0.005); // Smaller buffer for precise culling
      
      if (!isVisible) {
        this.culledMarkers.add(marker.id || marker.googlePlaceId || marker.userId);
      } else {
        this.culledMarkers.delete(marker.id || marker.googlePlaceId || marker.userId);
      }
      
      return isVisible;
    });
  }

  initIntersectionObserver(container) {
    if (this.observer) this.observer.disconnect();

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const markerId = entry.target.dataset.markerId;
        const callback = this.intersectionCallbacks.get(markerId);
        
        if (callback) {
          callback(entry.isIntersecting, entry.intersectionRatio);
        }
      });
    }, {
      root: container,
      rootMargin: '100px', // Load markers slightly outside viewport
      threshold: [0, 0.25, 0.5, 0.75, 1.0] // Multiple thresholds for smooth transitions
    });

    console.log('👁️ Intersection Observer initialized');
  }

  observeMarker(markerId, element, callback) {
    if (!this.observer || !element) return;
    
    element.dataset.markerId = markerId;
    this.intersectionCallbacks.set(markerId, callback);
    this.observer.observe(element);
  }

  unobserveMarker(markerId) {
    this.intersectionCallbacks.delete(markerId);
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.intersectionCallbacks.clear();
    this.culledMarkers.clear();
  }
}

// AIRBNB'S FRAME-BASED RENDERER
class AirbnbFrameRenderer {
  constructor() {
    this.pendingUpdates = [];
    this.isRendering = false;
    this.frameId = null;
    this.lastFrameTime = 0;
    this.targetFPS = 60;
    this.frameInterval = 1000 / this.targetFPS;
    
    console.log('🎬 Airbnb Frame Renderer initialized');
  }

  scheduleUpdate(updateFn, priority = 'normal') {
    this.pendingUpdates.push({
      fn: updateFn,
      priority: priority === 'high' ? 1 : 0,
      timestamp: performance.now()
    });

    // Sort by priority
    this.pendingUpdates.sort((a, b) => b.priority - a.priority);

    if (!this.isRendering) {
      this.startRenderLoop();
    }
  }

  startRenderLoop() {
    this.isRendering = true;
    this.renderFrame();
  }

  renderFrame = (currentTime) => {
    if (currentTime - this.lastFrameTime >= this.frameInterval) {
      const startTime = performance.now();
      const frameBudget = 12; // Leave 4ms for other operations in 16ms frame
      
      while (this.pendingUpdates.length > 0 && 
             (performance.now() - startTime) < frameBudget) {
        const update = this.pendingUpdates.shift();
        try {
          update.fn();
        } catch (error) {
          console.error('Frame render error:', error);
        }
      }
      
      this.lastFrameTime = currentTime;
    }

    if (this.pendingUpdates.length > 0) {
      this.frameId = requestAnimationFrame(this.renderFrame);
    } else {
      this.isRendering = false;
    }
  }

  clearPendingUpdates() {
    this.pendingUpdates = [];
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.isRendering = false;
  }
}

// ENHANCED AIRBNB'S SMOOTH MARKER MANAGER WITH MODE SWITCHING FIX
class AirbnbSmoothMarkerManager {
  constructor(map) {
    this.map = map;
    this.markerPool = new AirbnbMarkerPool(map);
    this.viewportCuller = new AirbnbViewportCuller();
    this.frameRenderer = new AirbnbFrameRenderer();
    this.activeMarkers = new Map();
    this.markerElements = new Map();
    this.transitioningMarkers = new Set();
    this.currentMode = null; // Track current mode
    
    console.log('🎯 Airbnb Smooth Marker Manager initialized');
  }

  // FIX: Force clear all markers when switching modes
  forceClearAllMarkers() {
    console.log('🧹 Force clearing all markers for mode switch');
    
    // Clear all active markers immediately
    this.activeMarkers.forEach((markerInfo, id) => {
      if (markerInfo.marker) {
        markerInfo.marker.setVisible(false);
        markerInfo.marker.setMap(null);
      }
    });
    
    // Clear all data structures
    this.activeMarkers.clear();
    this.transitioningMarkers.clear();
    
    // Clear the marker pool
    this.markerPool.clearPool();
    
    console.log('✅ All markers force cleared');
  }

  updateMarkers(newMarkers, mapMode, currentFilter) {
    // FIX: Force clear when mode changes
    if (this.currentMode && this.currentMode !== mapMode) {
      console.log(`🔄 Mode changed from ${this.currentMode} to ${mapMode} - force clearing`);
      this.forceClearAllMarkers();
    }
    this.currentMode = mapMode;

    // Use frame-based rendering for smooth updates
    this.frameRenderer.scheduleUpdate(() => {
      this.performMarkerUpdate(newMarkers, mapMode, currentFilter);
    }, 'high');
  }

  performMarkerUpdate(newMarkers, mapMode, currentFilter) {
    // Step 1: Cull markers outside viewport
    const visibleMarkers = this.viewportCuller.cullMarkers(newMarkers || []);
    
    // Step 2: Create sets for comparison
    const newMarkerIds = new Set(
      visibleMarkers.map(m => m.id || m.googlePlaceId || m.userId).filter(Boolean)
    );
    const currentMarkerIds = new Set(this.activeMarkers.keys());
    
    // Step 3: Remove markers that are no longer needed
    currentMarkerIds.forEach(id => {
      if (!newMarkerIds.has(id)) {
        this.removeMarkerSmoothly(id);
      }
    });
    
    // Step 4: Add or update markers
    visibleMarkers.forEach((markerData, index) => {
      if (!markerData) return;
      
      const id = markerData.id || markerData.googlePlaceId || markerData.userId;
      if (!id) return;
      
      if (this.activeMarkers.has(id)) {
        this.updateExistingMarker(id, markerData, index, currentFilter);
      } else {
        this.addMarkerSmoothly(id, markerData, index, mapMode, currentFilter);
      }
    });

    console.log(`🎯 Updated markers: ${visibleMarkers.length} visible, ${this.activeMarkers.size} active, mode: ${mapMode}`);
  }

  addMarkerSmoothly(id, markerData, index, mapMode, currentFilter) {
    if (this.transitioningMarkers.has(id)) return;
    
    this.transitioningMarkers.add(id);
    
    // Get marker from pool
    const marker = this.markerPool.getMarker(id, mapMode);
    if (!marker) {
      this.transitioningMarkers.delete(id);
      return;
    }
    
    // Set position
    const position = mapMode === 'people' 
      ? { lat: markerData.latitude, lng: markerData.longitude }
      : { lat: markerData.location.latitude, lng: markerData.location.longitude };
    
    if (!position.lat || !position.lng) {
      this.markerPool.releaseMarker(id);
      this.transitioningMarkers.delete(id);
      return;
    }
    
    marker.setPosition(position);
    
    // Create appropriate icon with enhanced styling
    const icon = this.createMarkerIcon(markerData, index, mapMode, currentFilter);
    if (icon) marker.setIcon(icon);
    
    // Smooth fade in
    marker.setVisible(false);
    this.frameRenderer.scheduleUpdate(() => {
      marker.setVisible(true);
      this.fadeInMarker(marker, () => {
        this.transitioningMarkers.delete(id);
      });
    });
    
    // Store reference
    this.activeMarkers.set(id, { marker, data: markerData });
    
    console.log(`➕ Added ${mapMode} marker ${id} smoothly`);
  }

  removeMarkerSmoothly(id) {
    const markerInfo = this.activeMarkers.get(id);
    if (!markerInfo || this.transitioningMarkers.has(id)) return;
    
    this.transitioningMarkers.add(id);
    
    // Smooth fade out
    this.markerPool.releaseMarker(id);
    this.activeMarkers.delete(id);
    
    setTimeout(() => {
      this.transitioningMarkers.delete(id);
    }, 200);
    
    console.log(`➖ Removed marker ${id} smoothly`);
  }

  updateExistingMarker(id, markerData, index, currentFilter) {
    const markerInfo = this.activeMarkers.get(id);
    if (!markerInfo) return;
    
    const { marker } = markerInfo;
    
    // Update icon with enhanced styling
    const newIcon = this.createMarkerIcon(markerData, index, 
      markerData.firstName ? 'people' : 'places', currentFilter);
    
    if (newIcon) {
      this.frameRenderer.scheduleUpdate(() => {
        marker.setIcon(newIcon);
      });
    }
    
    markerInfo.data = markerData;
  }

  fadeInMarker(marker, callback) {
    let opacity = 0;
    const fadeStep = () => {
      opacity += 0.2;
      
      if (opacity >= 1) {
        callback();
        return;
      }
      
      requestAnimationFrame(fadeStep);
    };
    
    requestAnimationFrame(fadeStep);
  }

  createMarkerIcon(markerData, index, mapMode, currentFilter) {
    if (mapMode === 'people') {
      return this.createEnhancedUserMarkerIcon(markerData);
    } else {
      return this.createPlaceMarkerIcon(markerData, index, currentFilter);
    }
  }

  // ENHANCED: Emotional people markers with same impact as places
  createEnhancedUserMarkerIcon(user) {
    const getStatusColor = () => {
      if (!user.isLive) return '#6b7280';
      
      const timeDiff = new Date() - new Date(user.lastSeen);
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));
      
      if (minutesAgo < 2) return '#10b981'; // Very active - bright green
      if (minutesAgo < 5) return '#22c55e';  // Active - green
      if (minutesAgo < 15) return '#eab308'; // Recently active - yellow
      if (minutesAgo < 30) return '#f59e0b'; // Less active - orange
      return '#6b7280'; // Inactive - gray
    };

    const getActivityLevel = () => {
      if (!user.isLive) return 0;
      const timeDiff = new Date() - new Date(user.lastSeen);
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));
      
      if (minutesAgo < 2) return 5;  // Very active
      if (minutesAgo < 5) return 4;  // Active  
      if (minutesAgo < 15) return 3; // Recently active
      if (minutesAgo < 30) return 2; // Less active
      return 1; // Inactive
    };

    const statusColor = getStatusColor();
    const activityLevel = getActivityLevel();
    const baseSize = 32; // Increased base size
    const markerSize = baseSize + (activityLevel * 4); // Dynamic sizing based on activity
    const totalSize = markerSize + 16;
    const userId = user.userId || user.id || 'unknown';

    // Enhanced gradient based on activity and mood
    const getPersonalityGradient = () => {
      // Base personality colors
      if (user.interests?.includes('coffee') || user.bio?.toLowerCase().includes('coffee')) {
        return {
          primary: '#8B4513',   // Coffee brown
          secondary: '#D2691E', // Sandy brown
          accent: '#CD853F'     // Peru
        };
      }
      if (user.interests?.includes('travel') || user.bio?.toLowerCase().includes('travel')) {
        return {
          primary: '#4169E1',   // Royal blue
          secondary: '#87CEEB', // Sky blue  
          accent: '#6495ED'     // Cornflower blue
        };
      }
      if (user.interests?.includes('food') || user.bio?.toLowerCase().includes('food')) {
        return {
          primary: '#FF6347',   // Tomato
          secondary: '#FFA07A', // Light salmon
          accent: '#FF7F50'     // Coral
        };
      }
      
      // Default warm gradient
      return {
        primary: '#a855f7',   // Purple
        secondary: '#7c3aed', // Darker purple
        accent: '#c084fc'     // Light purple
      };
    };

    const colors = getPersonalityGradient();
    
    // Enhanced SVG with emotional depth
    const userMarkerSVG = `
      <svg width="${totalSize}" height="${totalSize}" viewBox="0 0 ${totalSize} ${totalSize}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Enhanced gradient with personality -->
          <radialGradient id="personalityGrad${userId}" cx="30%" cy="30%" r="70%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.9" />
            <stop offset="25%" style="stop-color:${colors.accent};stop-opacity:0.8" />
            <stop offset="60%" style="stop-color:${colors.primary};stop-opacity:0.9" />
            <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
          </radialGradient>
          
          <!-- Activity ring gradient -->
          <radialGradient id="activityRing${userId}" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:${statusColor};stop-opacity:0.6" />
            <stop offset="70%" style="stop-color:${statusColor};stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:${statusColor};stop-opacity:0.1" />
          </radialGradient>
          
          <!-- Shadow filter for depth -->
          <filter id="shadow${userId}" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        
        <!-- Outer activity ring with pulsing animation for very active users -->
        ${activityLevel >= 4 ? `
          <circle cx="${totalSize / 2}" cy="${totalSize / 2}" r="${markerSize / 2 + 8}" 
                  fill="url(#activityRing${userId})" opacity="0.7">
            <animate attributeName="r" 
                     values="${markerSize / 2 + 8};${markerSize / 2 + 14};${markerSize / 2 + 8}" 
                     dur="${activityLevel === 5 ? '1.5s' : '2.5s'}" 
                     repeatCount="indefinite"/>
            <animate attributeName="opacity" 
                     values="0.7;0.2;0.7" 
                     dur="${activityLevel === 5 ? '1.5s' : '2.5s'}" 
                     repeatCount="indefinite"/>
          </circle>
        ` : ''}
        
        <!-- Subtle outer ring for presence -->
        <circle cx="${totalSize / 2}" cy="${totalSize / 2}" r="${markerSize / 2 + 3}" 
                fill="none" stroke="${colors.primary}" stroke-width="2" opacity="0.5"/>
        
        <!-- Main avatar circle with personality gradient -->
        <circle cx="${totalSize / 2}" cy="${totalSize / 2}" r="${markerSize / 2}" 
                fill="url(#personalityGrad${userId})" 
                stroke="${colors.secondary}" 
                stroke-width="3"
                filter="url(#shadow${userId})"/>
        
        <!-- User avatar/initial area -->
        <circle cx="${totalSize / 2}" cy="${totalSize / 2}" r="${markerSize / 2 - 6}" 
                fill="rgba(255,255,255,0.9)" 
                stroke="none"/>
        
        <!-- User initial or emoji -->
        <text x="${totalSize / 2}" y="${totalSize / 2 + 4}" 
              text-anchor="middle" 
              font-size="${Math.max(12, markerSize * 0.3)}" 
              font-weight="600"
              fill="${colors.secondary}"
              font-family="system-ui, -apple-system, sans-serif">
          ${user.firstName ? user.firstName.charAt(0).toUpperCase() : '👤'}
        </text>
        
        <!-- Status indicator dot -->
        <circle cx="${totalSize / 2 + markerSize / 2 - 3}" cy="${totalSize / 2 - markerSize / 2 + 3}" 
                r="4" 
                fill="${statusColor}" 
                stroke="white" 
                stroke-width="2">
          ${activityLevel >= 4 ? `
            <animate attributeName="r" 
                     values="4;6;4" 
                     dur="2s" 
                     repeatCount="indefinite"/>
          ` : ''}
        </circle>
        
        <!-- Coffee interest indicator -->
        ${user.interests?.includes('coffee') || user.bio?.toLowerCase().includes('coffee') ? `
          <text x="${totalSize / 2 - markerSize / 2 + 3}" y="${totalSize / 2 + markerSize / 2 - 3}" 
                text-anchor="middle" 
                font-size="8" 
                fill="#8B4513">☕</text>
        ` : ''}
        
        <!-- Activity level indicator (small dots) -->
        ${Array.from({length: activityLevel}, (_, i) => `
          <circle cx="${totalSize / 2 - 8 + i * 3}" cy="${totalSize / 2 + markerSize / 2 + 6}" 
                  r="1.5" 
                  fill="${statusColor}" 
                  opacity="0.8"/>
        `).join('')}
      </svg>
    `;

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(userMarkerSVG)}`,
      scaledSize: new window.google.maps.Size(totalSize, totalSize),
      anchor: new window.google.maps.Point(totalSize / 2, totalSize / 2),
    };
  }

  createPlaceMarkerIcon(cafe, index, currentType) {
    const rating = cafe.rating || 0;
    const reviewCount = cafe.user_ratings_total || cafe.userRatingsTotal || 0;
    
    // Airbnb's quality-based sizing
    const getQualityTier = () => {
      const ratingScore = (rating / 5) * 0.7;
      const reviewScore = Math.min(reviewCount / 80, 1) * 0.3;
      const totalScore = ratingScore + reviewScore;
      
      if (totalScore >= 0.85) return 5;
      if (totalScore >= 0.70) return 4;
      if (totalScore >= 0.55) return 3;
      if (totalScore >= 0.40) return 2;
      return 1;
    };
    
    const qualityLevel = getQualityTier();
    const markerSize = [28, 34, 40, 48, 56][qualityLevel - 1] || 32;
    
    const colors = currentType === 'restaurant' ? {
      primary: '#E74C3C',
      secondary: '#C0392B'
    } : {
      primary: '#FF9500',
      secondary: '#E67E22'
    };

    const placeMarkerSVG = `
      <svg width="${markerSize + 10}" height="${markerSize + 10}" viewBox="0 0 ${markerSize + 10} ${markerSize + 10}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="grad${index}" cx="50%" cy="30%" r="70%">
            <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
            <stop offset="70%" style="stop-color:${colors.secondary};stop-opacity:0.9" />
            <stop offset="100%" style="stop-color:${colors.primary};stop-opacity:0.8" />
          </radialGradient>
        </defs>
        
        <circle cx="${(markerSize + 10) / 2}" cy="${(markerSize + 10) / 2}" r="${markerSize / 2}" 
                fill="url(#grad${index})" 
                stroke="rgba(255,255,255,0.6)" 
                stroke-width="2"/>
        
        <text x="${(markerSize + 10) / 2}" y="${(markerSize + 10) / 2 + 6}" 
              text-anchor="middle" 
              font-size="${Math.max(16, markerSize * 0.35)}" 
              fill="white">
          ${currentType === 'restaurant' ? '🍽️' : '☕'}
        </text>
      </svg>
    `;

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(placeMarkerSVG)}`,
      scaledSize: new window.google.maps.Size(markerSize + 10, markerSize + 10),
      anchor: new window.google.maps.Point((markerSize + 10) / 2, (markerSize + 10) / 2),
    };
  }

  updateViewport(bounds) {
    this.viewportCuller.setViewport(bounds);
  }

  destroy() {
    this.frameRenderer.clearPendingUpdates();
    this.markerPool.clearPool();
    this.viewportCuller.destroy();
    this.activeMarkers.clear();
    this.transitioningMarkers.clear();
    console.log('🧹 Airbnb Marker Manager destroyed');
  }
}

// MAIN FULLPAGE MAP COMPONENT WITH AIRBNB SYSTEM
const FullPageMap = ({
  center,
  zoom,
  cafes,
  users,
  selectedCafe,
  selectedUser,
  userLocation,
  onCafeSelect,
  onUserSelect,
  onCenterChange,
  onClosePopup,
  loading,
  error,
  searchRadius,
  cafeType,
  showControls,
  isEmbedMode,
  onSearchChange,
  onRefresh,
  onGoToUserLocation,
  locationLoading,
  locationError,
  detectionMethod,
  locationCapability,
  onLocationRetry,
  onPreciseLocation,
  qualityText,
  sourceText,
  mapMode,
  isSelectingPlace,
  allowDataFetching,
}) => {

  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markerManagerRef = useRef(null);
  const userMarkerRef = useRef(null);
  
  // Core map states
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [googleMapsReady, setGoogleMapsReady] = useState(false);
  const [googleMapsError, setGoogleMapsError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  
  // Interaction states
  const [isMapInteracting, setIsMapInteracting] = useState(false);
  const [hoveredCafe, setHoveredCafe] = useState(null);
  const [hoveredUser, setHoveredUser] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [smoothTransition, setSmoothTransition] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(zoom || 15);
  const [isZoomingIn, setIsZoomingIn] = useState(false);
  const [isZoomingOut, setIsZoomingOut] = useState(false);

  // Movement detection refs
  const lastSearchLocationRef = useRef(null);
  const isUserDraggingRef = useRef(false);
  const currentFilterRef = useRef(cafeType);
  const smoothSearchTimeoutRef = useRef(null);
  const dragStartTimeRef = useRef(null);
  const lastZoomRef = useRef(zoom || 15);
  const zoomTimeoutRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  // Distance calculation utility
  const calculateDistance = useCallback((lat1, lng1, lat2, lng2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }, []);

  // AIRBNB-STYLE: Enhanced go to user location
  const handleGoToUserLocation = useCallback(() => {
    if (!userLocation || !googleMapRef.current) return;
    
    setShowTooltip(false);
    setHoveredCafe(null);
    setHoveredUser(null);
    
    if (selectedCafe || selectedUser) {
      onClosePopup();
    }
    
    setIsMapInteracting(true);
    setSmoothTransition(true);
    
    const targetPosition = {
      lat: userLocation.latitude,
      lng: userLocation.longitude
    };

    const targetZoom = mapMode === 'people' ? 16 : 15;
    
    googleMapRef.current.panTo(targetPosition);
    
    setTimeout(() => {
      googleMapRef.current.setZoom(targetZoom);
    }, 400);

    setTimeout(() => {
      lastSearchLocationRef.current = targetPosition;
      onCenterChange(targetPosition);
      
      if (onRefresh) {
        onRefresh();
      }
      
      setIsMapInteracting(false);
      setSmoothTransition(false);
    }, 800);
    
  }, [userLocation, selectedCafe, selectedUser, onClosePopup, onCenterChange, onRefresh, mapMode]);

  // Smart search trigger
  const shouldTriggerNewSearch = useCallback((newCenter) => {
    if (!lastSearchLocationRef.current) return true;
    
    const lastSearch = lastSearchLocationRef.current;
    const distance = calculateDistance(
      lastSearch.lat, lastSearch.lng,
      newCenter.lat, newCenter.lng
    );
    
    const threshold = mapMode === 'people' ? 150 : 200;
    return distance > threshold;
  }, [mapMode, calculateDistance]);

  // Smooth search with caching
  const handleSmoothSearch = useCallback(() => {
    if (!googleMapRef.current || isDragging) return;
    
    const currentCenter = googleMapRef.current.getCenter();
    const newCenter = {
      lat: currentCenter.lat(),
      lng: currentCenter.lng()
    };
    
    lastSearchLocationRef.current = newCenter;
    onCenterChange(newCenter);
    
    setIsRefreshing(true);

    setTimeout(() => {
      if (onRefresh) {
        onRefresh();
      }
      
      setTimeout(() => {
        setIsRefreshing(false);
        setSmoothTransition(false);
      }, 1000);
    }, 100);
    
  }, [onCenterChange, onRefresh, isDragging]);

  // Enhanced drag handling
  const handleDragStart = useCallback(() => {
    console.log('🎬 Drag started - preserving markers');
    setIsDragging(true);
    setIsMapInteracting(true);
    setSmoothTransition(false);
    dragStartTimeRef.current = Date.now();
    isUserDraggingRef.current = true;
    
    // Clear pending searches
    if (smoothSearchTimeoutRef.current) {
      clearTimeout(smoothSearchTimeoutRef.current);
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    console.log('🎬 Drag ended - updating markers smoothly');
    
    setTimeout(() => {
      setIsDragging(false);
      isUserDraggingRef.current = false;
    }, 50);
    
    setTimeout(() => {
      setIsMapInteracting(false);
      setSmoothTransition(true);
      setTimeout(() => setSmoothTransition(false), 200);
    }, 100);
    
    // Update viewport for marker manager
    if (markerManagerRef.current && googleMapRef.current) {
      const bounds = googleMapRef.current.getBounds();
      markerManagerRef.current.updateViewport(bounds);
    }
    
    // Smart search triggering
    const currentCenter = googleMapRef.current?.getCenter();
    if (currentCenter) {
      const newCenter = {
        lat: currentCenter.lat(),
        lng: currentCenter.lng()
      };
      
      if (shouldTriggerNewSearch(newCenter)) {
        lastSearchLocationRef.current = newCenter;
        onCenterChange(newCenter);
        
        const searchDelay = mapMode === 'people' ? 400 : 500;
        
        if (smoothSearchTimeoutRef.current) {
          clearTimeout(smoothSearchTimeoutRef.current);
        }
        
        smoothSearchTimeoutRef.current = setTimeout(() => {
          if (onRefresh) {
            onRefresh();
          }
        }, searchDelay);
      }
    }
  }, [shouldTriggerNewSearch, onCenterChange, mapMode, onRefresh]);

  // Smooth marker click
  const handleSmoothMarkerClick = useCallback((item) => {
    setShowTooltip(false);
    setHoveredCafe(null);
    setHoveredUser(null);
    
    setIsMapInteracting(true);
    setSmoothTransition(true);
    
    if (!googleMapRef.current) return;
    
    const targetPosition = item.firstName ? 
      { lat: item.latitude, lng: item.longitude } :
      { lat: item.location.latitude, lng: item.location.longitude };
    
    const targetZoom = Math.min(Math.max(googleMapRef.current.getZoom() + 1, 16), 18);
    
    googleMapRef.current.panTo(targetPosition);
    
    setTimeout(() => {
      googleMapRef.current.setZoom(targetZoom);
    }, 300);
    
    setTimeout(() => {
      setIsMapInteracting(false);
      setSmoothTransition(false);
      
      if (item.firstName) {
        onUserSelect(item);
      } else {
        onCafeSelect(item);
      }
    }, 600);
    
  }, [onCafeSelect, onUserSelect]);

  // Popup close
  const handleSmoothPopupClose = useCallback(() => {
    setSmoothTransition(true);
    
    setTimeout(() => {
      onClosePopup();
      setSmoothTransition(false);
    }, 200);
    
  }, [onClosePopup]);

  // Zoom handling
  const handleZoomChanged = useCallback(() => {
    if (!googleMapRef.current) return;
    
    const newZoom = googleMapRef.current.getZoom();
    const oldZoom = lastZoomRef.current;
    
    setZoomLevel(newZoom);
    lastZoomRef.current = newZoom;
    
    if (newZoom > oldZoom) {
      setIsZoomingIn(true);
      setIsZoomingOut(false);
    } else if (newZoom < oldZoom) {
      setIsZoomingOut(true);
      setIsZoomingIn(false);
    }
    
    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
    }
    
    zoomTimeoutRef.current = setTimeout(() => {
      setIsZoomingIn(false);
      setIsZoomingOut(false);
    }, 300);
    
  }, []);

  // Marker hover handling
  const handleMarkerHover = useCallback((item, isEntering, itemType = 'cafe') => {
    if (isDragging || isMapInteracting || isZoomingIn || isZoomingOut) {
      return;
    }
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    if (isEntering) {
      setTimeout(() => {
        if (itemType === 'user') {
          setHoveredUser(item);
        } else {
          setHoveredCafe(item);
        }
        setShowTooltip(true);
      }, 200);
    } else {
      setShowTooltip(false);
      setHoveredCafe(null);
      setHoveredUser(null);
    }
  }, [isDragging, isMapInteracting, isZoomingIn, isZoomingOut]);

  // Mouse move for tooltip positioning
  const handleMouseMove = useCallback((mouseEvent) => {
    if (showTooltip && (hoveredCafe || hoveredUser)) {
      setTooltipPosition({
        x: mouseEvent.clientX,
        y: mouseEvent.clientY
      });
    }
  }, [showTooltip, hoveredCafe, hoveredUser]);

  // Google Maps availability check
  const checkGoogleMapsAvailability = useCallback(() => {
    if (typeof window !== 'undefined' && 
        window.google && 
        window.google.maps && 
        window.google.maps.Map &&
        window.google.maps.MapTypeId &&
        window.google.maps.MapTypeId.ROADMAP) {
      setGoogleMapsReady(true);
      return true;
    }
    return false;
  }, []);

  // Google Maps API Loading
  useEffect(() => {
    setLoadingProgress(10);

    if (checkGoogleMapsAvailability()) {
      setLoadingProgress(100);
      return;
    }

    const handleGoogleMapsLoad = () => {
      setTimeout(() => {
        if (checkGoogleMapsAvailability()) {
          setGoogleMapsReady(true);
          setLoadingProgress(100);
        }
      }, 100);
    };

    window.addEventListener('googleMapsLoaded', handleGoogleMapsLoad);

    const pollInterval = setInterval(() => {
      setLoadingProgress(prev => Math.min(prev + 10, 90));
      if (checkGoogleMapsAvailability()) {
        clearInterval(pollInterval);
        setLoadingProgress(100);
      }
    }, 300);

    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      if (!googleMapsReady) {
        setGoogleMapsError('Google Maps failed to load');
        setLoadingProgress(100);
      }
    }, 10000);

    return () => {
      window.removeEventListener('googleMapsLoaded', handleGoogleMapsLoad);
      clearInterval(pollInterval);
      clearTimeout(timeout);
      if (mapRef.current) {
        mapRef.current.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [checkGoogleMapsAvailability, googleMapsReady, handleMouseMove]);

  // Map initialization
  useEffect(() => {
    if (!googleMapsReady || mapInitialized || !mapRef.current) return;
    
    const initMap = async () => {
      try {
        if (!window.google || !window.google.maps) return;
        
        setGoogleMapsReady(true);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!window.google || !window.google.maps || !window.google.maps.MapTypeId) {
          throw new Error('Google Maps API not fully loaded');
        }
        
        setLoadingProgress(95);

        const mapOptions = {
          center: { lat: center.lat, lng: center.lng },
          zoom: zoom || 15,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          gestureHandling: 'greedy',
          clickableIcons: false,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: !isEmbedMode,
          
          // Enhanced dark theme
          styles: [
            { elementType: "geometry", stylers: [{ color: "#212121" }] },
            { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
            { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] }
          ]
        };

        googleMapRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
        
        // Initialize Airbnb marker manager
        markerManagerRef.current = new AirbnbSmoothMarkerManager(googleMapRef.current);
        
        // Event listeners
        googleMapRef.current.addListener('dragstart', handleDragStart);
        googleMapRef.current.addListener('dragend', handleDragEnd);
        googleMapRef.current.addListener('zoom_changed', handleZoomChanged);
        
        // Center change handling
        let centerChangeTimeout;
        googleMapRef.current.addListener('center_changed', () => {
          if (centerChangeTimeout) clearTimeout(centerChangeTimeout);
          centerChangeTimeout = setTimeout(() => {
            if (!isDragging && !isUserDraggingRef.current && markerManagerRef.current) {
              const bounds = googleMapRef.current.getBounds();
              markerManagerRef.current.updateViewport(bounds);
            }
          }, 50);
        });
        
        googleMapRef.current.addListener('idle', () => {
          if (!isDragging) {
            setIsMapInteracting(false);
          }
        });

        setMapInitialized(true);
        setMapLoaded(true);
        setLoadingProgress(100);
        setHasInitialLoad(true);

        // Close popup on map click
        googleMapRef.current.addListener('click', () => {
          if ((selectedCafe || selectedUser) && !isDragging) {
            handleSmoothPopupClose();
          }
        });
        
        if (mapRef.current) {
          mapRef.current.addEventListener('mousemove', handleMouseMove);
        }

        lastSearchLocationRef.current = { lat: center.lat, lng: center.lng };

        console.log('✅ Airbnb-style map initialized successfully');

      } catch (error) {
        console.error('❌ Failed to initialize map:', error);
        setMapError('Failed to initialize map: ' + error.message);
        setMapLoaded(false);
        setLoadingProgress(100);
      }
    };

    initMap();
  }, [center.lat, center.lng, googleMapsReady, mapInitialized, zoom, isEmbedMode, handleDragStart, handleDragEnd, handleZoomChanged, isDragging, selectedCafe, selectedUser, handleSmoothPopupClose, handleMouseMove]);
  
  // Update map center for external changes
  useEffect(() => {
    if (googleMapRef.current && mapLoaded && mapInitialized && !isUserDraggingRef.current) {
      const currentCenter = googleMapRef.current.getCenter();
      
      const latDiff = Math.abs(currentCenter.lat() - center.lat);
      const lngDiff = Math.abs(currentCenter.lng() - center.lng);
      
      if (latDiff > 0.0001 || lngDiff > 0.0001) {
        googleMapRef.current.setCenter(center);
      }
    }
  }, [center.lat, center.lng, mapLoaded, mapInitialized]);

  // User location marker
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    const userLocationSVG = `
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="outerPulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:#4285F4;stop-opacity:0.8" />
            <stop offset="50%" style="stop-color:#4285F4;stop-opacity:0.4" />
            <stop offset="100%" style="stop-color:#4285F4;stop-opacity:0.1" />
          </radialGradient>
        </defs>
        
        <circle cx="22" cy="22" r="20" fill="url(#outerPulse)">
          <animate attributeName="r" values="20;26;20" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite"/>
        </circle>
        
        <circle cx="22" cy="22" r="12" fill="#4285F4" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>
        
        <circle cx="22" cy="22" r="6" fill="white"/>
      </svg>
    `;

    userMarkerRef.current = new window.google.maps.Marker({
      position: { lat: userLocation.latitude, lng: userLocation.longitude },
      map: googleMapRef.current,
      title: 'Your location',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(userLocationSVG),
        scaledSize: new window.google.maps.Size(44, 44),
        anchor: new window.google.maps.Point(22, 22)
      },
      zIndex: 3000,
      optimized: false
    });

  }, [userLocation, mapLoaded]);

  // AIRBNB MARKER SYSTEM: Update markers using the smooth manager
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded || !allowDataFetching || !markerManagerRef.current) return;

    currentFilterRef.current = cafeType;

    // Don't update markers during interactions to prevent flickering
    if (isDragging || isMapInteracting || isZoomingIn || isZoomingOut) {
      console.log('🔒 Preserving markers during interaction');
      return;
    }

    console.log('🎯 Updating markers with Airbnb system');

    if (mapMode === 'places' && cafes && cafes.length > 0) {
      const validCafes = cafes.filter(cafeItem => {
        return cafeItem.location && cafeItem.location.latitude && cafeItem.location.longitude;
      });

      // Use Airbnb's smooth marker manager
      markerManagerRef.current.updateMarkers(validCafes, 'places', currentFilterRef.current);
      
      // Add event listeners for interaction
      validCafes.forEach(cafe => {
        const markerId = cafe.id || cafe.googlePlaceId;
        const markerInfo = markerManagerRef.current.activeMarkers.get(markerId);
        
        if (markerInfo && markerInfo.marker) {
          const marker = markerInfo.marker;
          
          // Remove existing listeners to prevent duplicates
          window.google.maps.event.clearListeners(marker, 'click');
          window.google.maps.event.clearListeners(marker, 'mouseover');
          window.google.maps.event.clearListeners(marker, 'mouseout');
          
          // Add new listeners
          marker.addListener('click', () => {
            handleSmoothMarkerClick(cafe);
          });

          marker.addListener('mouseover', () => {
            handleMarkerHover(cafe, true, 'cafe');
          });

          marker.addListener('mouseout', () => {
            handleMarkerHover(cafe, false, 'cafe');
          });
        }
      });

    } else if (mapMode === 'people' && users && users.length > 0) {
      const activeUsers = users.filter(user => {
        return user.latitude && user.longitude;
      });

      // Use Airbnb's smooth marker manager
      markerManagerRef.current.updateMarkers(activeUsers, 'people', currentFilterRef.current);
      
      // Add event listeners for interaction
      activeUsers.forEach(user => {
        const markerId = user.userId || user.id;
        const markerInfo = markerManagerRef.current.activeMarkers.get(markerId);
        
        if (markerInfo && markerInfo.marker) {
          const marker = markerInfo.marker;
          
          // Remove existing listeners to prevent duplicates
          window.google.maps.event.clearListeners(marker, 'click');
          window.google.maps.event.clearListeners(marker, 'mouseover');
          window.google.maps.event.clearListeners(marker, 'mouseout');
          
          // Add new listeners
          marker.addListener('click', () => {
            handleSmoothMarkerClick(user);
          });

          marker.addListener('mouseover', () => {
            handleMarkerHover(user, true, 'user');
          });

          marker.addListener('mouseout', () => {
            handleMarkerHover(user, false, 'user');
          });
        }
      });
    }

  }, [cafes, users, mapMode, cafeType, mapLoaded, allowDataFetching, isDragging, isMapInteracting, isZoomingIn, isZoomingOut, handleSmoothMarkerClick, handleMarkerHover]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (markerManagerRef.current) {
        markerManagerRef.current.destroy();
      }
    };
  }, []);

  // Loading animations
  const SmoothLoader = ({ isVisible, message = "Loading..." }) => (
    <div 
      className={`smooth-loader ${isVisible ? 'visible' : 'hidden'}`}
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: '14px 22px',
        borderRadius: '28px',
        backdropFilter: 'blur(12px)',
        zIndex: 1000,
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.9)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '14px',
        fontWeight: '500',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      <div 
        style={{
          width: '18px',
          height: '18px',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          borderTop: '2px solid white',
          borderRadius: '50%',
          animation: isVisible ? 'smoothSpin 1s linear infinite' : 'none'
        }}
      />
      {message}
    </div>
  );

  // Enhanced CSS for smooth animations
  const enhancedStyles = `
    @keyframes smoothSpin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .smooth-transition {
      transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
    }
    
    .map-canvas {
      transition: ${smoothTransition ? 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)' : 'none'};
      filter: ${isMapInteracting ? 'brightness(1.01) contrast(1.02)' : 'brightness(1) contrast(1)'};
      transform: ${smoothTransition ? 'scale(1.002)' : 'scale(1)'};
      will-change: transform, filter;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      -webkit-transform-style: preserve-3d;
      transform-style: preserve-3d;
    }
    
    .map-canvas * {
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    
    .gm-style {
      transition: all 0.3s ease !important;
    }
    
    .gm-style > div {
      transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
    }
    
    .zoom-indicator {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 10px 18px;
      border-radius: 22px;
      font-size: 14px;
      font-weight: 600;
      z-index: 999;
      pointer-events: none;
      opacity: ${isZoomingIn || isZoomingOut ? 1 : 0};
      transition: opacity 0.3s ease;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .map-error-toast {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(220, 38, 38, 0.95);
      color: white;
      padding: 12px 20px;
      border-radius: 12px;
      display: flex;
      alignItems: center;
      gap: 12px;
      backdrop-filter: blur(8px);
      z-index: 1000;
    }
    
    .map-error-toast button {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .map-error-toast button:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  `;

  // Handle Google Maps loading error
  if (googleMapsError) {
    return (
      <div className="full-page-map error-state">
        <div className="error-message">
          <h3>🗺️ Map Error</h3>
          <p>{googleMapsError}</p>
          <button 
            className="retry-button primary"
            onClick={() => window.location.reload()}
          >
            🔄 Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="full-page-map dark-map-theme airbnb-optimized">
      <style>{enhancedStyles}</style>
      
      {/* Enhanced Zoom Indicator */}
      <div className="zoom-indicator">
        {isZoomingIn ? `🔍 Zoom In (${mapMode})` : isZoomingOut ? `🔍 Zoom Out (${mapMode})` : ''}
      </div>
      
      {/* Optimized Loading Indicators */}
      <SmoothLoader 
        isVisible={isRefreshing && !error} 
        message={mapMode === 'people' ? "🔄 Finding users..." : "🔄 Finding places..."} 
      />

      {/* Initial Loading Screen */}
      {(!hasInitialLoad && (!mapLoaded || !googleMapsReady || loading)) && (
        <LoadingScreen 
          message="Loading Airbnb-style map..."
          subMessage="Initializing smooth marker system"
          progress={loadingProgress}
        />
      )}

      {/* Map update loading */}
      {(isRefreshing || (loading && !error)) && !selectedCafe && !selectedUser && (
        <MapUpdateLoader
          loading={true}
          searchType={mapMode === 'people' ? 'people' : cafeType}
          forcefulMode={false}
          message={mapMode === 'people' ? "Updating users..." : "Updating places..."}
        />
      )}

      {/* Enhanced Map Canvas */}
      <div 
        ref={mapRef} 
        className={`map-canvas dark-map-canvas ${smoothTransition ? 'smooth-transition' : ''}`}
        style={{ 
          width: '100%', 
          height: '100%',
          backgroundColor: '#1a1a1a',
          borderRadius: isEmbedMode ? '12px' : '0',
          transform: isDragging ? 'scale(1.001)' : 'scale(1)',
          transition: 'transform 0.2s ease',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      />

      {/* Enhanced Controls */}
      {showControls && mapLoaded && (
        <div style={{ 
          transition: 'opacity 0.3s ease',
          opacity: isMapInteracting ? 0.7 : 1 
        }}>
          <MapControls
            cafeType={cafeType}
            searchRadius={searchRadius}
            onSearchChange={onSearchChange}
            onRefresh={onRefresh}
            hasUserLocation={!!userLocation}
            cafes={cafes || []}
            users={users || []}
            cafesCount={mapMode === 'places' ? 
              (cafes || []).filter(cafeItem => {
                const cafeType_normalized = (cafeItem.type || cafeItem.placeType || '').toLowerCase();
                return cafeType_normalized === cafeType.toLowerCase();
              }).length : 0
            }
            usersCount={mapMode === 'people' ? (users || []).length : 0}
            isEmbedMode={isEmbedMode}
            userLocation={userLocation}
            onLocationRetry={onLocationRetry}
            onGoToLocation={handleGoToUserLocation}
            onPreciseLocation={onPreciseLocation}
            locationLoading={locationLoading}
            locationError={locationError}
            detectionMethod={detectionMethod}
            qualityText={qualityText}
            sourceText={sourceText}
            mapMode={mapMode}
            isSelectingPlace={isSelectingPlace}
          />
        </div>
      )}

      {/* Enhanced Popup for Places */}
      {selectedCafe && mapLoaded && (
        <CafePopup
          cafe={selectedCafe}
          onClose={handleSmoothPopupClose}
          userLocation={userLocation}
          isLocationSelecting={isSelectingPlace}
          onLocationSelect={(cafe) => {
            if (isSelectingPlace && window.handlePlaceClickFromPopup) {
              window.handlePlaceClickFromPopup(cafe);
            }
          }}
          onInviteHere={(cafe) => {
            if (window.handleInviteHereFromPopup) {
              window.handleInviteHereFromPopup(cafe);
            }
          }}
        />
      )}

      {/* Enhanced Hover Tooltip */}
      <MarkerHoverTooltip
        cafe={hoveredCafe}
        user={hoveredUser}
        isVisible={showTooltip && (hoveredCafe || hoveredUser) && !selectedCafe && !selectedUser}
        onClose={() => {
          setShowTooltip(false);
          setHoveredCafe(null);
          setHoveredUser(null);
        }}
      />

      {/* Enhanced Error Message */}
      {error && (
        <div className="map-error-toast dark-theme">
          <span>❌ {error.message || 'Error loading data'}</span>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
    </div>
  );
};

export default FullPageMap;