// components/FullPageMap.js - ULTRA-SMOOTH INTERACTIONS VERSION
// Location: /frontend/src/components/FullPageMap.js

import React, { useRef, useEffect, useState, useCallback } from 'react';
import LoadingScreen from './LoadingScreen';
import MapUpdateLoader from './MapUpdateLoader';
import CafePopup from './CafePopup';
import MapControls from './MapControls';
import MarkerHoverTooltip from './MarkerHoverTooltip';

const FullPageMap = ({
  center,
  zoom,
  cafes,
  selectedCafe,
  userLocation,
  onCafeSelect,
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
  sourceText
}) => {

  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef(new Map());
  const userMarkerRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const activeMarkersRef = useRef(new Set());
  const infoWindowRef = useRef(null);
  
  // Core map states
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [googleMapsReady, setGoogleMapsReady] = useState(false);
  const [googleMapsError, setGoogleMapsError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  
  // 🎬 ULTRA-SMOOTH INTERACTION STATES
  const [isMapInteracting, setIsMapInteracting] = useState(false);
  const [hoveredCafe, setHoveredCafe] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverDelayRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [smoothTransition, setSmoothTransition] = useState(false);
  const [isMapUpdating, setIsMapUpdating] = useState(false);
  const [hoveredMarker, setHoveredMarker] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(zoom || 15);
  const [isZoomingIn, setIsZoomingIn] = useState(false);
  const [isZoomingOut, setIsZoomingOut] = useState(false);
  
  // Movement detection refs
  const lastSearchLocationRef = useRef(null);
  const isUserDraggingRef = useRef(false);
  const debounceTimeoutRef = useRef(null);
  const currentFilterRef = useRef(cafeType);
  const smoothSearchTimeoutRef = useRef(null);
  const interactionTimeoutRef = useRef(null);
  const refreshAnimationRef = useRef(null);
  const debouncedSearchTimeoutRef = useRef(null);
  const dragStartTimeRef = useRef(null);
  const lastDragPositionRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const lastZoomRef = useRef(zoom || 15);
  const zoomTimeoutRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const markerAnimationRef = useRef(new Map());

  // 🎯 ENHANCED POPULARITY-BASED MARKER SIZING SYSTEM
  const calculatePopularityScore = (place) => {
    const rating = place.rating || 0;
    const reviewCount = place.user_ratings_total || place.userRatingsTotal || 0;
    
    // Weight: 70% rating, 30% review count (normalized)
    const ratingScore = (rating / 5) * 0.7; // 0-0.7
    const reviewScore = Math.min(reviewCount / 100, 1) * 0.3; // 0-0.3 (capped at 100 reviews = max)
    
    return ratingScore + reviewScore; // 0-1 score
  };
  // Add this utility function near the top of the component (after the imports)
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const getMarkerSizeFromPopularity = (popularityScore, currentZoom = 15) => {
    // Dynamic sizing based on zoom level
    const zoomMultiplier = Math.min(Math.max(currentZoom / 15, 0.7), 1.5);
    
    const baseSize = 24 * zoomMultiplier;
    const maxSize = 48 * zoomMultiplier;
    const minSize = 18 * zoomMultiplier;
    
    // Scale size based on popularity
    const dynamicSize = minSize + (popularityScore * (maxSize - minSize));
    
    return Math.round(dynamicSize);
  };
  // 🎯 ULTRA-SMOOTH LOCATION NAVIGATION
  const handleGoToUserLocation = useCallback(() => {
    if (!userLocation || !googleMapRef.current) {
      console.log('❌ No user location or map available');
      return;
    }

    console.log('🎯 Ultra-smooth navigation to user location:', userLocation);
    
    // Hide any tooltips and popups
    setShowTooltip(false);
    setHoveredCafe(null);
    setHoveredMarker(null);
    if (selectedCafe) {
      onClosePopup();
    }
    
    // Prevent any map interactions during animation
    setIsMapInteracting(true);
    setSmoothTransition(true);
    
    const currentCenter = googleMapRef.current.getCenter();
    const currentZoom = googleMapRef.current.getZoom();
    // Handle different location formats for search markers
    const targetPosition = {
      lat: userLocation.latitude,
      lng: userLocation.longitude
    };

    console.log('🎯 Target position for zoom:', targetPosition);

    // Ensure we have valid coordinates
    if (!targetPosition.lat || !targetPosition.lng) {
      console.error('❌ Invalid target position for marker click:', userLocation);
      return;
    }
    
    // Calculate optimal zoom level for user location (good overview)
    const targetZoom = Math.max(16, currentZoom);
    
    // Check if we need to move significantly
    const needsMovement = currentCenter && (
      Math.abs(currentCenter.lat() - targetPosition.lat) > 0.001 ||
      Math.abs(currentCenter.lng() - targetPosition.lng) > 0.001
    );
    
    console.log('🎬 USER LOCATION ANIMATION:', {
      currentCenter: currentCenter ? { lat: currentCenter.lat(), lng: currentCenter.lng() } : null,
      targetPosition,
      currentZoom,
      targetZoom,
      needsMovement
    });
    
    // 🎬 FLAWLESS USER LOCATION ANIMATION SEQUENCE
    if (needsMovement) {
      // Step 1: Smooth pan to user location first
      googleMapRef.current.panTo(targetPosition);
      
      // Step 2: Wait for pan to complete, then smooth zoom
      setTimeout(() => {
        if (googleMapRef.current && Math.abs(currentZoom - targetZoom) > 0.5) {
          googleMapRef.current.setZoom(targetZoom);
        }
      }, 400); // Slightly longer wait for smooth pan
      
      // Step 3: Update search location and trigger refresh after animations
      setTimeout(() => {
        // Update the search center to user location
        lastSearchLocationRef.current = targetPosition;
        onCenterChange({
          lat: targetPosition.lat,
          lng: targetPosition.lng
        });
        
        // Clear existing markers for fresh search around user
        console.log('🧹 Clearing markers for user location search');
        markersRef.current.forEach((marker) => {
          if (marker && marker.setMap) {
            marker.setMap(null);
          }
        });
        markersRef.current.clear();
        activeMarkersRef.current.clear();
        
        // Trigger search for venues around user location
        setTimeout(() => {
          console.log('🔍 Searching venues around user location');
          if (onRefresh) {
            onRefresh();
          }
        }, 200);
        
        // End animation states
        setIsMapInteracting(false);
        setSmoothTransition(false);
      }, 800); // Wait for both pan and zoom
      
    } else {
      // If already at user location, just zoom smoothly
      if (Math.abs(currentZoom - targetZoom) > 0.5) {
        googleMapRef.current.setZoom(targetZoom);
      }
      
      // Still trigger a refresh to find venues around user
      setTimeout(() => {
        if (onRefresh) {
          onRefresh();
        }
        setIsMapInteracting(false);
        setSmoothTransition(false);
      }, 400);
    }
    
  }, [userLocation, selectedCafe, onClosePopup, onCenterChange, onRefresh]);
  // Replace the createEnhancedDarkMapMarker function with this enhanced version:
  const createEnhancedDarkMapMarker = (cafe, index, currentType, isHovered = false, isSearchResult = false) => {
    const rating = cafe.rating || 0;
    const reviewCount = cafe.user_ratings_total || cafe.userRatingsTotal || 0;
    
    // 🎯 PRECISE 5-TIER QUALITY SYSTEM
    const getQualityTier = () => {
      const ratingScore = (rating / 5) * 0.7;
      const reviewScore = Math.min(reviewCount / 80, 1) * 0.3;
      const totalScore = ratingScore + reviewScore;
      
      if (totalScore >= 0.85) return 5; // Exceptional
      if (totalScore >= 0.70) return 4; // Excellent  
      if (totalScore >= 0.55) return 3; // Very good
      if (totalScore >= 0.40) return 2; // Good
      return 1;                         // Basic
    };
    
    const qualityLevel = getQualityTier();
    
    // 🎨 PURE TYPE-BASED COLORS with hover enhancement
    const getTypeColor = () => {
      const baseColors = currentType === 'restaurant' ? {
        primary: '#E74C3C',
        secondary: '#C0392B',
        glow: '#FF6B6B'
      } : {
        primary: '#FF9500',
        secondary: '#E67E22', 
        glow: '#FFB84D'
      };
      
      // Enhanced colors when hovered
      if (isHovered) {
        return {
          primary: currentType === 'restaurant' ? '#FF5733' : '#FFB84D',
          secondary: currentType === 'restaurant' ? '#E74C3C' : '#FF9500',
          glow: currentType === 'restaurant' ? '#FF8566' : '#FFC266'
        };
      }
      
      return baseColors;
    };
    
    const colors = getTypeColor();
    // 🎯 SPECIAL SEARCH RESULT MARKER TREATMENT
    if (isSearchResult) {
      colors.primary = '#9C27B0';  // Purple for search results
      colors.secondary = '#7B1FA2';
      colors.glow = '#BA68C8';
      console.log('🔍 Creating special search result marker for:', cafe.name);
    }
    
    // 📏 DYNAMIC SIZE PROGRESSION with zoom awareness AND HOVER ENLARGEMENT
    const getMarkerSize = () => {
      const baseSizes = {
        5: 56, 4: 48, 3: 40, 2: 34, 1: 28
      };
      
      const baseSize = baseSizes[qualityLevel] || 32;
      const zoomMultiplier = Math.min(Math.max(zoomLevel / 15, 0.8), 1.3);
      const hoverMultiplier = isHovered ? 1.3 : 1; // 30% larger when hovered
      
      return Math.round(baseSize * zoomMultiplier * hoverMultiplier);
    };
    
    const markerSize = getMarkerSize();
    
    // ⭐ BEAUTIFUL STAR SYSTEM
    const getStarDisplay = () => {
      const starSize = Math.max(8, markerSize * 0.18);
      const starColor = isHovered ? '#FFE55C' : '#FFD700';
      
      const patterns = {
        5: 'crown-full', 4: 'crown-4', 3: 'triangle', 2: 'sides', 1: 'single'
      };
      
      return {
        count: qualityLevel,
        pattern: patterns[qualityLevel],
        size: starSize,
        color: starColor
      };
    };
    
    const starDisplay = getStarDisplay();
    const isVeryClose = cafe.distance && cafe.distance < 200;
    
    // Calculate total SVG size to accommodate curved text
    const totalSize = markerSize + (isHovered ? 80 : 24); // Extra space for curved text when hovered
    
    return `
      <svg width="${totalSize}" height="${totalSize}" viewBox="0 0 ${totalSize} ${totalSize}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow${index}${isHovered ? 'hover' : ''}">
            <feGaussianBlur stdDeviation="${isHovered ? '4' : '3'}" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <radialGradient id="grad${index}${isHovered ? 'hover' : ''}" cx="50%" cy="30%" r="70%">
            <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
            <stop offset="70%" style="stop-color:${colors.secondary};stop-opacity:0.9" />
            <stop offset="100%" style="stop-color:${colors.primary};stop-opacity:0.8" />
          </radialGradient>
          ${isHovered ? `
            <radialGradient id="pulseGrad${index}" cx="50%" cy="50%" r="50%">
              <stop offset="0%" style="stop-color:${colors.glow};stop-opacity:0.3" />
              <stop offset="100%" style="stop-color:${colors.glow};stop-opacity:0" />
            </radialGradient>
            <!-- Path for curved text -->
            <path id="textPath${index}" d="M ${totalSize/2 - 35} ${totalSize/2 - 25} A 35 35 0 0 1 ${totalSize/2 + 35} ${totalSize/2 - 25}" fill="none" stroke="none"/>
          ` : ''}
        </defs>
        
        ${isHovered ? `
          <!-- Hover pulse effect -->
          <circle cx="${totalSize / 2}" cy="${totalSize / 2}" r="${markerSize / 2 + 12}" 
                  fill="url(#pulseGrad${index})">
            <animate attributeName="r" values="${markerSize / 2 + 12};${markerSize / 2 + 18};${markerSize / 2 + 12}" 
                    dur="2s" repeatCount="indefinite"/>
          </circle>
          
          <!-- Curved rainbow text above marker -->
          <text font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="white" stroke="rgba(0,0,0,0.8)" stroke-width="2">
            <textPath href="#textPath${index}" startOffset="50%" text-anchor="middle">
              ${cafe.name || 'Unknown Place'}
            </textPath>
          </text>
          <text font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="${colors.primary}">
            <textPath href="#textPath${index}" startOffset="50%" text-anchor="middle">
              ${cafe.name || 'Unknown Place'}
            </textPath>
          </text>
        ` : ''}
        
        <!-- Main marker circle with WHITE BORDER when hovered -->
        <circle cx="${totalSize / 2}" cy="${totalSize / 2}" r="${markerSize / 2}" 
                fill="url(#grad${index}${isHovered ? 'hover' : ''})" 
                filter="url(#glow${index}${isHovered ? 'hover' : ''})"
                stroke="${isHovered ? 'white' : 'rgba(255,255,255,0.6)'}" 
                stroke-width="${isHovered ? '4' : '2'}"/>
        
        <!-- Venue type emoji -->
        <text x="${totalSize / 2}" y="${totalSize / 2 + 6}" 
              text-anchor="middle" 
              font-size="${Math.max(16, markerSize * 0.35)}" 
              fill="white"
              style="filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.8));">
          ${currentType === 'restaurant' ? '🍽️' : '☕'}
        </text>
        
        ${starDisplay.pattern === 'crown-full' ? `
          <text x="${totalSize / 2}" y="16" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
          <text x="${totalSize / 2 - 12}" y="22" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
          <text x="${totalSize / 2 + 12}" y="22" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
          <text x="${totalSize / 2 - 7}" y="28" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
          <text x="${totalSize / 2 + 7}" y="28" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
        ` : starDisplay.pattern === 'crown-4' ? `
          <text x="${totalSize / 2 - 9}" y="18" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
          <text x="${totalSize / 2 + 9}" y="18" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
          <text x="${totalSize / 2 - 5}" y="26" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
          <text x="${totalSize / 2 + 5}" y="26" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
        ` : starDisplay.pattern === 'triangle' ? `
          <text x="${totalSize / 2}" y="16" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
          <text x="${totalSize / 2 - 9}" y="26" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
          <text x="${totalSize / 2 + 9}" y="26" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
        ` : starDisplay.pattern === 'sides' ? `
          <text x="${totalSize / 2 - 11}" y="20" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
          <text x="${totalSize / 2 + 11}" y="20" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
        ` : starDisplay.pattern === 'single' ? `
          <text x="${totalSize / 2}" y="16" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
        ` : ''}
        
        ${qualityLevel >= 4 && rating > 0 ? `
          <circle cx="${totalSize / 2}" cy="${markerSize + 16}" r="${isHovered ? '11' : '10'}" 
                  fill="rgba(0,0,0,0.8)" 
                  stroke="white" 
                  stroke-width="1"/>
          <text x="${totalSize / 2}" y="${markerSize + 20}" 
                text-anchor="middle" 
                font-size="${isHovered ? '11' : '10'}" 
                fill="white" 
                font-weight="bold">
            ${rating.toFixed(1)}
          </text>
        ` : ''}
        
        ${isVeryClose ? `
          <circle cx="${markerSize + 8}" cy="${markerSize + 8}" r="${isHovered ? '9' : '8'}" 
                  fill="#9B59B6" 
                  stroke="white" 
                  stroke-width="2"/>
          <text x="${markerSize + 8}" y="${markerSize + 12}" 
                text-anchor="middle" 
                font-size="10" 
                fill="white">📍</text>
        ` : ''}
      </svg>
    `;
  };

  // 🎯 REAL-TIME MARKER HOVER UPDATES
  const updateMarkerHoverState = useCallback((cafeId, isHovered) => {
    const marker = markersRef.current.get(cafeId);
    if (!marker) return;

    // Find the cafe data
    const cafe = cafes.find(c => (c.id || c.googlePlaceId) === cafeId);
    if (!cafe) return;

    // Get the marker's current position and index
    const position = marker.getPosition();
    const index = Array.from(markersRef.current.keys()).indexOf(cafeId);

    // Create new marker SVG with hover state
    const markerSVG = createEnhancedDarkMapMarker(cafe, index, currentFilterRef.current, isHovered);
    
    // Calculate size based on hover state
    const popularityScore = calculatePopularityScore(cafe);
    const baseSize = getMarkerSizeFromPopularity(popularityScore, zoomLevel);
    const hoverMultiplier = isHovered ? 1.3 : 1;
    const markerSize = Math.round(baseSize * hoverMultiplier);
    const totalSize = markerSize + (isHovered ? 80 : 24);

    // Update the marker icon with smooth transition
    marker.setIcon({
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerSVG),
      scaledSize: new window.google.maps.Size(totalSize, totalSize),
      anchor: new window.google.maps.Point(totalSize / 2, totalSize / 2)
    });

    // Update z-index for hover state
    const newZIndex = Math.round(popularityScore * 1000) + 100 + (isHovered ? 2000 : 0);
    marker.setZIndex(newZIndex);

  }, [cafes, zoomLevel, calculatePopularityScore, getMarkerSizeFromPopularity, createEnhancedDarkMapMarker]);

  // ⚡ ULTRA-SENSITIVE TRIGGERING for responsive search
  const shouldTriggerNewSearch = useCallback((newCenter) => {
    if (!lastSearchLocationRef.current) {
      console.log('🔍 SHOULD SEARCH: No previous search location');
      return true;
    }
    
    const lastSearch = lastSearchLocationRef.current;
    const distance = calculateDistance(
      lastSearch.lat, lastSearch.lng,
      newCenter.lat, newCenter.lng
    );
    
    // More sensitive threshold - search if moved more than 150m
    const threshold = 150;
    const shouldSearch = distance > threshold;
    
    console.log('🔍 SHOULD SEARCH CHECK:', {
      distance: Math.round(distance),
      threshold,
      shouldSearch,
      lastSearch,
      newCenter
    });
    
    return shouldSearch;
  }, []);

  // 🎯 INTELLIGENT SMOOTH SEARCH (enhanced to always use current map center)
  const handleSmoothSearch = useCallback(() => {
    if (!googleMapRef.current || isDragging) return;
    
    // ALWAYS get the current visible map center, not the stored center
    const currentCenter = googleMapRef.current.getCenter();
    const newCenter = {
      lat: currentCenter.lat(),
      lng: currentCenter.lng()
    };
    
    console.log('🔄 Smooth search with current map center:', newCenter);
    
    // Update the search location to current map center
    lastSearchLocationRef.current = newCenter;
    
    // Update parent component with the current map center
    onCenterChange({
      lat: newCenter.lat,
      lng: newCenter.lng
    });
    
    // Show dragging loading during search
    setIsRefreshing(true);

    // Trigger refresh
    if (onRefresh) {
      onRefresh();
    }

    // Hide loading after search completes - shorter duration for better UX
    // End refresh animation smoothly
    setTimeout(() => {
      setIsRefreshing(false);
      setSmoothTransition(false);
    }, 1000); // Change this from 1500 to 1000
    
  }, [onCenterChange, onRefresh, isDragging]);

  // 🎬 ULTRA-SMOOTH DRAG DETECTION
  const handleDragStart = useCallback(() => {
    console.log('🎬 Ultra-smooth drag started');
    setIsDragging(true);
    setIsMapInteracting(true);
    setSmoothTransition(false);
    dragStartTimeRef.current = Date.now();
    isUserDraggingRef.current = true;
    
    // Store initial position
    if (googleMapRef.current) {
      const center = googleMapRef.current.getCenter();
      lastDragPositionRef.current = {
        lat: center.lat(),
        lng: center.lng()
      };
    }
    
    // Clear any pending searches
    if (smoothSearchTimeoutRef.current) {
      clearTimeout(smoothSearchTimeoutRef.current);
    }
    if (debouncedSearchTimeoutRef.current) {
      clearTimeout(debouncedSearchTimeoutRef.current);
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    console.log('🎬 Ultra-smooth drag ended');
    const dragDuration = Date.now() - (dragStartTimeRef.current || 0);
    
    // Immediate feedback
    setTimeout(() => {
      setIsDragging(false);
      isUserDraggingRef.current = false;
    }, 50);
    
    // End interaction smoothly
    setTimeout(() => {
      setIsMapInteracting(false);
      setSmoothTransition(true);
      setTimeout(() => setSmoothTransition(false), 200);
    }, 100);
    
    // 🚀 FORCE SEARCH FOR NEW MAP AREA
    const currentCenter = googleMapRef.current?.getCenter();
    if (currentCenter) {
      const newCenter = {
        lat: currentCenter.lat(),
        lng: currentCenter.lng()
      };
      
      // Calculate distance moved
      const lastPosition = lastSearchLocationRef.current;
      let significantMove = true;
      
      if (lastPosition) {
        const distance = calculateDistance(
          lastPosition.lat, lastPosition.lng,
          newCenter.lat, newCenter.lng
        );
        significantMove = distance > 200; // 200 meters threshold
      }
      
      console.log('🗺️ Drag ended - analyzing move:', {
        newCenter,
        lastPosition,
        significantMove,
        willSearch: true // Always search after drag
      });
      
      // ALWAYS trigger search after drag for new area
      // Clear existing markers immediately for fresh start
      console.log('🧹 Clearing old markers for new area search');
      markersRef.current.forEach((marker) => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      markersRef.current.clear();
      activeMarkersRef.current.clear();
      
      // Update the center immediately
      lastSearchLocationRef.current = newCenter;
      onCenterChange({
        lat: newCenter.lat,
        lng: newCenter.lng
      });
      
      // Schedule search for new area
      let searchDelay;
      if (zoomLevel >= 16) {
        searchDelay = 300; // Very fast for zoomed in
      } else if (zoomLevel >= 14) {
        searchDelay = 500; // Fast for medium zoom
      } else {
        searchDelay = 700; // Still fast for zoomed out
      }
      
      console.log(`🚀 NEW AREA search scheduled in ${searchDelay}ms`);
      
      // Clear any existing search timeouts
      if (smoothSearchTimeoutRef.current) {
        clearTimeout(smoothSearchTimeoutRef.current);
      }
      if (debouncedSearchTimeoutRef.current) {
        clearTimeout(debouncedSearchTimeoutRef.current);
      }
      
      smoothSearchTimeoutRef.current = setTimeout(() => {
        console.log('🔍 Executing NEW AREA search with current map center');
        
        // Get the EXACT current center of the visible map
        const finalCenter = googleMapRef.current?.getCenter();
        if (finalCenter) {
          const exactCenter = {
            lat: finalCenter.lat(),
            lng: finalCenter.lng()
          };
          
          console.log('📍 Forcing search at exact map center:', exactCenter);
          
          // Update the search location to EXACTLY what's visible
          lastSearchLocationRef.current = exactCenter;
          
          // Force the parent to update its center to the exact map center
          onCenterChange({
            lat: exactCenter.lat,
            lng: exactCenter.lng
          });
          
          // Trigger the actual refresh with the correct coordinates
          if (onRefresh) {
            onRefresh();
          }
        }
      }, searchDelay);
    }
  }, [handleSmoothSearch, zoomLevel, onCenterChange]);

  // 🎯 ULTRA-SMOOTH MARKER CLICK with perfect animation
  const handleSmoothMarkerClick = useCallback((cafe) => {
    console.log('🎯 Ultra-smooth marker click:', cafe.name);
    
    // Immediately hide tooltip and clear hover states
    setShowTooltip(false);
    setHoveredCafe(null);
    setHoveredMarker(null);
    
    // Prevent any map interactions during animation
    setIsMapInteracting(true);
    setSmoothTransition(true);
    
    if (!googleMapRef.current) return;
    
    const currentCenter = googleMapRef.current.getCenter();
    const currentZoom = googleMapRef.current.getZoom();
    const targetPosition = {
      lat: cafe.location.latitude,
      lng: cafe.location.longitude
    };
    
    // Calculate optimal zoom level (not too close, not too far)
    const targetZoom = Math.min(Math.max(currentZoom + 1, 16), 18);
    
    // Check if we need to move significantly
    const needsMovement = currentCenter && (
      Math.abs(currentCenter.lat() - targetPosition.lat) > 0.001 ||
      Math.abs(currentCenter.lng() - targetPosition.lng) > 0.001
    );
    
    // 🎬 FLAWLESS ANIMATION SEQUENCE
    if (needsMovement) {
      // Step 1: Smooth pan first (no zoom change yet)
      googleMapRef.current.panTo(targetPosition);
      
      // Step 2: Wait for pan to complete, then smooth zoom
      setTimeout(() => {
        if (googleMapRef.current && Math.abs(currentZoom - targetZoom) > 0.5) {
          // Use smooth zoom transition
          googleMapRef.current.setZoom(targetZoom);
        }
      }, 300); // Wait for pan animation
      
      // Step 3: Show popup after all animations complete
      setTimeout(() => {
        setIsMapInteracting(false);
        setSmoothTransition(false);
        onCafeSelect(cafe);
      }, 600); // Wait for both pan and zoom
      
    } else {
      // If no movement needed, just zoom smoothly
      if (Math.abs(currentZoom - targetZoom) > 0.5) {
        googleMapRef.current.setZoom(targetZoom);
      }
      
      // Show popup quickly since no movement
      setTimeout(() => {
        setIsMapInteracting(false);
        setSmoothTransition(false);
        onCafeSelect(cafe);
      }, 300);
    }
    
  }, [onCafeSelect, zoomLevel]);

  // 🎯 SMOOTH POPUP CLOSE
  const handleSmoothPopupClose = useCallback(() => {
    console.log('🎬 Smooth popup close');
    setSmoothTransition(true);
    
    setTimeout(() => {
      onClosePopup();
      setSmoothTransition(false);
    }, 200);
    
  }, [onClosePopup]);

  // 🎯 ULTRA-SENSITIVE ZOOM HANDLING
  const handleZoomChanged = useCallback(() => {
    if (!googleMapRef.current) return;
    
    const newZoom = googleMapRef.current.getZoom();
    const oldZoom = lastZoomRef.current;
    
    setZoomLevel(newZoom);
    lastZoomRef.current = newZoom;
    
    // Determine zoom direction
    if (newZoom > oldZoom) {
      setIsZoomingIn(true);
      setIsZoomingOut(false);
      console.log('🔍 ZOOMING IN to level:', newZoom);
    } else if (newZoom < oldZoom) {
      setIsZoomingOut(true);
      setIsZoomingIn(false);
      console.log('🔍 ZOOMING OUT to level:', newZoom);
    }
    
    // Clear zoom state after animation
    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
    }
    
    zoomTimeoutRef.current = setTimeout(() => {
      setIsZoomingIn(false);
      setIsZoomingOut(false);
    }, 300); // Faster animation clear
    
    // 🚀 ULTRA-SENSITIVE AUTO-REFRESH on zoom changes
    const zoomDifference = Math.abs(newZoom - oldZoom);
    
    // Much more sensitive - trigger on any significant zoom change
    if (zoomDifference >= 1 && !isDragging) {
      console.log('🔄 SENSITIVE zoom change detected, triggering refresh after zoom settles');
      
      // Clear existing timeouts
      if (debouncedSearchTimeoutRef.current) {
        clearTimeout(debouncedSearchTimeoutRef.current);
      }
      
      // Longer delay to let zoom animation complete and prevent marker flickering
      const refreshDelay = 1500; // Increased delay for stability
      
      console.log(`🚀 ZOOM refresh scheduled in ${refreshDelay}ms`);
      
      debouncedSearchTimeoutRef.current = setTimeout(() => {
        // Only refresh if not currently interacting
        if (!isDragging && !isMapInteracting && !isZoomingIn && !isZoomingOut) {
          handleSmoothSearch();
        }
      }, refreshDelay);
    }
    
  }, [isDragging, handleSmoothSearch]);

  // 🎯 ENHANCED MARKER HOVER HANDLING with Beautiful Tooltip
  // 🎯 ENHANCED MARKER HOVER HANDLING with Beautiful Tooltip
  const handleMarkerHover = useCallback((cafe, isEntering) => {
    // Skip hover effects during interactions to prevent flickering
    if (isDragging || isMapInteracting || isZoomingIn || isZoomingOut) {
      return;
    }
    
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (hoverDelayRef.current) {
      clearTimeout(hoverDelayRef.current);
    }
    
    if (isEntering) {
      setHoveredMarker(cafe.id || cafe.googlePlaceId);
      console.log('🖱️ Beautiful hover:', cafe.name);
      
      // Show tooltip with slight delay for smooth UX
      hoverDelayRef.current = setTimeout(() => {
        setHoveredCafe(cafe);
        setShowTooltip(true);
      }, 200); // Reduced delay since it's at top of page
      
    } else {
      // Hide tooltip immediately on mouse leave
      setShowTooltip(false);
      setHoveredCafe(null);
      
      // Delayed hover marker removal for smoother UX
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredMarker(null);
      }, 150);
    }
  }, [isDragging, isMapInteracting, isZoomingIn, isZoomingOut]);

  // ✨ NEW: Handle mouse move for tooltip positioning
  const handleMouseMove = useCallback((mouseEvent) => {
    if (showTooltip && hoveredCafe) {
      setTooltipPosition({
        x: mouseEvent.clientX,
        y: mouseEvent.clientY
      });
    }
  }, [showTooltip, hoveredCafe]);

  // Check Google Maps availability with complete API check
  const checkGoogleMapsAvailability = useCallback(() => {
    if (typeof window !== 'undefined' && 
        window.google && 
        window.google.maps && 
        window.google.maps.Map &&
        window.google.maps.MapTypeId &&
        window.google.maps.MapTypeId.ROADMAP) {
      console.log('✅ Google Maps API fully available');
      setGoogleMapsReady(true);
      return true;
    }
    return false;
  }, []);

  // Google Maps API Loading
  useEffect(() => {
    console.log('🔄 Loading Google Maps API...');
    setLoadingProgress(10);

    if (checkGoogleMapsAvailability()) {
      setLoadingProgress(100);
      return;
    }

    // Listen for the global callback
    const handleGoogleMapsLoad = () => {
      console.log('✅ Google Maps loaded via event');
      // Add a small delay to ensure everything is ready
      setTimeout(() => {
        if (checkGoogleMapsAvailability()) {
          setGoogleMapsReady(true);
          setLoadingProgress(100);
        }
      }, 100);
    };

    window.addEventListener('googleMapsLoaded', handleGoogleMapsLoad);

    // Polling fallback with more thorough checking
    const pollInterval = setInterval(() => {
      setLoadingProgress(prev => Math.min(prev + 10, 90));
      if (checkGoogleMapsAvailability()) {
        clearInterval(pollInterval);
        setLoadingProgress(100);
        console.log('✅ Google Maps API fully ready via polling');
      }
    }, 300); // Slightly slower polling for stability

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      if (!googleMapsReady) {
        console.error('❌ Google Maps loading timeout');
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
  }, [checkGoogleMapsAvailability, googleMapsReady]);

  // 🗺️ ENHANCED MAP INITIALIZATION with smooth interactions
  useEffect(() => {
    console.log('🗺️ Enhanced map initialization check:', {
      googleMapsReady,
      center,
      mapInitialized,
      mapRefCurrent: !!mapRef.current
    });

    if (!googleMapsReady || !center || mapInitialized || !mapRef.current) {
      console.log('🗺️ Enhanced map initialization conditions not met');
      return;
    }

    const initMap = async () => {
      try {
        console.log('🗺️ Initializing dark interactive map...');
        
        // Double-check Google Maps API availability
        if (!window.google || !window.google.maps || !window.google.maps.MapTypeId) {
          throw new Error('Google Maps API not fully loaded');
        }
        
        setLoadingProgress(95);

        const mapOptions = {
          center: { lat: center.lat, lng: center.lng },
          zoom: zoom || 15,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          
          // 🎬 ULTRA-SMOOTH ANIMATION OPTIONS
          gestureHandling: 'greedy',
          clickableIcons: false,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          scaleControl: false,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: false,
          
          // Animation settings for smooth transitions
          animation: window.google.maps.Animation.DROP,
          optimized: true,
          
          // Smooth zoom and pan settings
          zoomControlOptions: {
            position: window.google.maps.ControlPosition.RIGHT_BOTTOM
          },
          
          // 🎨 DARK MAP STYLING
          styles: [
            { elementType: "geometry", stylers: [{ color: "#212121" }] },
            { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
            { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
            { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
            { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
            { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
            { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
            { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
            { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
            { featureType: "poi.park", elementType: "labels.text.stroke", stylers: [{ color: "#1b1b1b" }] },
            { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
            { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
            { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
            { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
            { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4e4e4e" }] },
            { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
            { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
            { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] }
          ],
          
          // 🎯 SMOOTH INTERACTION OPTIONS
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          scaleControl: true,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: !isEmbedMode,
          gestureHandling: 'greedy',
          
          // 🎬 SMOOTH ANIMATIONS
          animation: window.google.maps.Animation.DROP,
          clickableIcons: false,
          keyboardShortcuts: true,
          scrollwheel: true,
          draggable: true
        };

        console.log('🗺️ Creating enhanced Google Maps instance...');
        googleMapRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
        
        console.log('✅ Enhanced Google Maps instance created');
        
        // 🎬 ENHANCED MAP EVENT LISTENERS
        googleMapRef.current.addListener('dragstart', handleDragStart);
        googleMapRef.current.addListener('dragend', handleDragEnd);
        googleMapRef.current.addListener('zoom_changed', handleZoomChanged);
        
        // 🎯 ULTRA-SENSITIVE CENTER CHANGE (immediate response)
        let centerChangeTimeout;
        googleMapRef.current.addListener('center_changed', () => {
          if (centerChangeTimeout) clearTimeout(centerChangeTimeout);
          centerChangeTimeout = setTimeout(() => {
            if (!isDragging && !isUserDraggingRef.current) {
              console.log('📍 SENSITIVE center change detected');
              
              // Get the CURRENT visible map center
              const currentMapCenter = googleMapRef.current?.getCenter();
              if (currentMapCenter) {
                const actualCenter = {
                  lat: currentMapCenter.lat(),
                  lng: currentMapCenter.lng()
                };
                
                // Check if we should trigger search based on actual map center
                if (shouldTriggerNewSearch(actualCenter)) {
                  console.log('🚀 CENTER CHANGE triggering search at visible center:', actualCenter);
                  
                  // Update search location to actual visible center
                  lastSearchLocationRef.current = actualCenter;
                  
                  // Update parent with actual center
                  onCenterChange({
                    lat: actualCenter.lat,
                    lng: actualCenter.lng
                  });
                  
                  // Clear existing timeouts
                  if (smoothSearchTimeoutRef.current) {
                    clearTimeout(smoothSearchTimeoutRef.current);
                  }
                  
                  // Trigger refresh with actual center
                  smoothSearchTimeoutRef.current = setTimeout(() => {
                    if (onRefresh) {
                      onRefresh();
                    }
                  }, zoomLevel >= 16 ? 300 : 600);
                }
              }
            }
          }, 50); // Very fast response
        });
        
        // 🎯 SMOOTH IDLE EVENT
        googleMapRef.current.addListener('idle', () => {
          if (!isDragging) {
            console.log('😴 Map idle - ready for smooth interactions');
            setIsMapInteracting(false);
          }
        });

        setMapInitialized(true);
        setMapLoaded(true);
        setLoadingProgress(100);
        setHasInitialLoad(true);

        console.log('✅ Dark interactive map created successfully');

        // Close popup if clicking on map
        googleMapRef.current.addListener('click', () => {
          if (selectedCafe && !isDragging) {
            handleSmoothPopupClose();
          }
        });
        if (mapRef.current) {
          mapRef.current.addEventListener('mousemove', handleMouseMove);
        }

        lastSearchLocationRef.current = { lat: center.lat, lng: center.lng };

      } catch (error) {
        console.error('❌ Failed to initialize dark map:', error);
        setMapError('Failed to initialize map: ' + error.message);
        setMapLoaded(false);
        setLoadingProgress(100);
      }
    };

    initMap();
  }, [googleMapsReady, center, mapInitialized, zoom, isEmbedMode, handleDragStart, handleDragEnd, handleZoomChanged, isDragging, selectedCafe, handleSmoothPopupClose]);
  
  // Update map center only for external changes
  useEffect(() => {
    if (googleMapRef.current && mapLoaded && mapInitialized && !isUserDraggingRef.current) {
      const currentCenter = googleMapRef.current.getCenter();
      const currentZoom = googleMapRef.current.getZoom();
      
      const newCenter = { lat: center.lat, lng: center.lng };
      
      const isExternalChange = !lastSearchLocationRef.current || 
        (Math.abs(currentCenter?.lat() - newCenter.lat) > 0.001 || 
         Math.abs(currentCenter?.lng() - newCenter.lng) > 0.001);
      
      if (isExternalChange) {
        console.log('🗺️ Updating dark map center:', newCenter);
        googleMapRef.current.setCenter(newCenter);
        lastSearchLocationRef.current = newCenter;
        
        if (Math.abs(currentZoom - zoom) > 1) {
          console.log('🗺️ Updating dark map zoom:', zoom);
          googleMapRef.current.setZoom(zoom);
        }
      }
    }
  }, [center.lat, center.lng, zoom, mapLoaded, mapInitialized]);

  // 🎯 Enhanced User location marker
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    console.log('🎯 Creating enhanced user location marker');

    const userLocationSVG = `
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Outer pulse gradient -->
          <radialGradient id="outerPulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:#4285F4;stop-opacity:0.8" />
            <stop offset="50%" style="stop-color:#4285F4;stop-opacity:0.4" />
            <stop offset="100%" style="stop-color:#4285F4;stop-opacity:0.1" />
          </radialGradient>
          
          <!-- Main button gradient that changes from dark to light -->
          <radialGradient id="mainButton" cx="30%" cy="30%" r="70%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.4" />
            <stop offset="30%" style="stop-color:#4285F4;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1557b0;stop-opacity:1" />
            <animateTransform attributeName="gradientTransform" type="rotate" 
                            values="0 20 20;360 20 20" dur="3s" repeatCount="indefinite"/>
          </radialGradient>
          
          <!-- Lightening overlay gradient -->
          <radialGradient id="lightenOverlay" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.8" />
            <stop offset="70%" style="stop-color:#87ceeb;stop-opacity:0.6" />
            <stop offset="100%" style="stop-color:#4285F4;stop-opacity:0.2" />
          </radialGradient>
          
          <!-- Glow effect -->
          <filter id="buttonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- Outer pulsing circle -->
        <circle cx="20" cy="20" r="18" fill="url(#outerPulse)">
          <animate attributeName="r" values="18;24;18" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite"/>
        </circle>
        
        <!-- Main blue button -->
        <circle cx="20" cy="20" r="10" fill="url(#mainButton)" 
                stroke="rgba(255,255,255,0.6)" stroke-width="2" 
                filter="url(#buttonGlow)"/>
        
        <!-- Lightening overlay that pulses -->
        <circle cx="20" cy="20" r="10" fill="url(#lightenOverlay)">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        
        <!-- Bright flash effect -->
        <circle cx="20" cy="20" r="8" fill="#ffffff">
          <animate attributeName="opacity" values="0;0.6;0" dur="2s" repeatCount="indefinite"/>
        </circle>
      </svg>
    `;

    userMarkerRef.current = new window.google.maps.Marker({
      position: { lat: userLocation.latitude, lng: userLocation.longitude },
      map: googleMapRef.current,
      title: 'La tua posizione',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(userLocationSVG),
        scaledSize: new window.google.maps.Size(40, 40),
        anchor: new window.google.maps.Point(20, 20)
      },
      zIndex: 1000,
      optimized: false
    });

    console.log('🎯 Enhanced user location marker updated');
  }, [userLocation, mapLoaded]);

  // 🎨 STABLE MARKER UPDATES - No flickering during interactions
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;

    console.log('☕ STABLE MARKER UPDATE:', {
      totalCafes: cafes.length,
      selectedType: cafeType,
      zoomLevel,
      isDragging,
      isMapInteracting,
      allCafes: cafes.map(cafe => ({
        name: cafe.name,
        type: cafe.type,
        placeType: cafe.placeType,
        hasLocation: !!(cafe.location && cafe.location.latitude && cafe.location.longitude)
      })),
      rawCafesArray: cafes
    });

    currentFilterRef.current = cafeType;

    // FIXED: Since useCafes already filters by type, use all provided cafes
    const perfectlyFilteredCafes = cafes.filter(cafeItem => {
      // Basic validation - ensure we have location data
      return cafeItem.location && cafeItem.location.latitude && cafeItem.location.longitude;
    });

    // 🔧 STABILITY: Only update markers when NOT interacting
    if (isDragging || isMapInteracting || isZoomingIn || isZoomingOut) {
      console.log('🎬 STABLE: Preserving markers during interaction');
      return; // Keep existing markers stable
    }

    // 🔧 SIMPLIFIED UPDATES: Allow all marker updates
    const existingMarkerCount = markersRef.current.size;
    const newMarkerCount = perfectlyFilteredCafes.length;

    console.log(`🔧 UPDATE CHECK: ${newMarkerCount} new markers vs ${existingMarkerCount} existing`);

    // Only skip if we have no new markers and no existing markers (avoid empty updates)
    if (newMarkerCount === 0 && existingMarkerCount === 0) {
      console.log('📍 SKIP: No markers to show');
      return;
    }

    console.log(`🎯 STABLE UPDATE: ${perfectlyFilteredCafes.length} markers (was ${existingMarkerCount})`);

    // Clear existing markers efficiently
    markersRef.current.forEach((marker) => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    markersRef.current.clear();
    activeMarkersRef.current.clear();

    if (perfectlyFilteredCafes.length === 0) {
      console.log('📍 No matches found');
      return;
    }

    // 🚀 CREATE STABLE MARKERS
    perfectlyFilteredCafes.forEach((cafe, index) => {
      if (!cafe.location || !cafe.location.latitude || !cafe.location.longitude) {
        return;
      }

      const position = {
        lat: cafe.location.latitude,
        lng: cafe.location.longitude
      };

      const cafeId = cafe.id || cafe.googlePlaceId;
      
      // Use stable hover state (don't check real-time hover during creation)
      const isHovered = !isDragging && !isMapInteracting && hoveredMarker === cafeId;

      // Special handling for search result markers
      const isSearchMarker = cafe.source === 'search' || cafe.isSearchResult;
      const markerSVG = createEnhancedDarkMapMarker(cafe, index, currentFilterRef.current, isHovered, isSearchMarker);

      const popularityScore = calculatePopularityScore(cafe);
      const markerSize = getMarkerSizeFromPopularity(popularityScore, zoomLevel);

      // Calculate z-index with special priority for search results
      const baseZIndex = Math.round(popularityScore * 1000) + 100;
      const hoverZIndex = isHovered ? 1000 : 0;
      const searchZIndex = isSearchMarker ? 5000 : 0; // Highest priority for search results

      const marker = new window.google.maps.Marker({
        position: position,
        map: googleMapRef.current,
        title: `${isSearchMarker ? '🔍 ' : ''}${cafe.emoji || (currentFilterRef.current === 'restaurant' ? '🍽️' : '☕')} ${cafe.name}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerSVG),
          scaledSize: new window.google.maps.Size(markerSize + 24, markerSize + 24),
          anchor: new window.google.maps.Point((markerSize + 24) / 2, (markerSize + 24) / 2)
        },
        zIndex: baseZIndex + hoverZIndex + searchZIndex,
        optimized: true, // Enable optimization for stability
        visible: true
      });

      // Log search marker creation
      if (isSearchMarker) {
        console.log('🎯 Search marker created with highest priority:', {
          name: cafe.name,
          zIndex: baseZIndex + hoverZIndex + searchZIndex,
          position: position
        });
      }

      // ✨ ENHANCED: Add hover and click listeners with special handling for search markers
      marker.addListener('click', () => {
        if (isSearchMarker) {
          console.log('🔍 Search marker clicked - triggering enhanced zoom:', cafe.name);
        }
        handleSmoothMarkerClick(cafe);
      });

      // Add mouseover listener for beautiful tooltip
      marker.addListener('mouseover', () => {
        handleMarkerHover(cafe, true);
      });

      // Add mouseout listener
      marker.addListener('mouseout', () => {
        handleMarkerHover(cafe, false);
      });

      // Track mouse movement for smooth tooltip following
      marker.addListener('mousemove', (event) => {
        if (event.domEvent) {
          handleMouseMove(event.domEvent);
        }
      });

      markersRef.current.set(cafeId, marker);
      activeMarkersRef.current.add(cafeId);
    });

    console.log(`🎉 STABLE: ${perfectlyFilteredCafes.length} markers created successfully`);

  }, [cafes, cafeType, mapLoaded, isDragging, isMapInteracting, isZoomingIn, isZoomingOut, handleSmoothMarkerClick, handleMarkerHover, zoomLevel]); // Removed hoveredMarker dependency

  // 🎬 SMOOTH LOADING ANIMATIONS
  const SmoothLoader = ({ isVisible, message = "Caricamento..." }) => (
    <div 
      className={`smooth-loader ${isVisible ? 'visible' : 'hidden'}`}
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '25px',
        backdropFilter: 'blur(10px)',
        zIndex: 1000,
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.9)',
        opacity: isVisible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '14px',
        fontWeight: '500'
      }}
    >
      <div 
        style={{
          width: '16px',
          height: '16px',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          borderTop: '2px solid white',
          borderRadius: '50%',
          animation: isVisible ? 'smoothSpin 1s linear infinite' : 'none'
        }}
      />
      {message}
    </div>
  );

  // CSS for smooth animations
  const smoothStyles = `
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
    
    /* Prevent white flashes during transitions */
    .map-canvas * {
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    
    /* Ultra-smooth Google Maps animations */
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
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      z-index: 999;
      pointer-events: none;
      opacity: ${isZoomingIn || isZoomingOut ? 1 : 0};
      transition: opacity 0.3s ease;
    }
  `;

  // Handle Google Maps loading error
  if (googleMapsError) {
    return (
      <div className="full-page-map error-state">
        <div className="error-message">
          <h3>🗺️ Errore Mappa</h3>
          <p>{googleMapsError}</p>
          <button 
            className="retry-button primary"
            onClick={() => window.location.reload()}
          >
            🔄 Ricarica Pagina
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="full-page-map dark-map-theme">
      <style>{smoothStyles}</style>
      
      {/* Zoom Indicator */}
      <div className="zoom-indicator">
        {isZoomingIn ? '🔍 Zoom In' : isZoomingOut ? '🔍 Zoom Out' : ''}
      </div>
      
      {/* Smooth Loading Indicators - ONLY for map dragging */}
      <SmoothLoader 
        isVisible={isRefreshing && !error} 
        message="🔄 Aggiornamento luoghi..." 
      />

      {/* Initial Loading Screen */}
      {(!hasInitialLoad && (!mapLoaded || !googleMapsReady || loading)) && (
        <LoadingScreen 
          message="Caricamento mappa ultra-smooth..."
          subMessage="Preparazione interazioni fluide"
          progress={loadingProgress}
        />
      )}

      {/* Map dragging/update loading - ONLY for normal map interactions */}
      {(isRefreshing || (loading && !error)) && !selectedCafe && (
        <MapUpdateLoader
          loading={true}
          searchType={cafeType}
          forcefulMode={false}
        />
      )}

      {/* Map with ultra-smooth interactions */}
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

      {/* Controls with smooth transitions */}
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
            cafes={cafes}
            cafesCount={cafes.filter(cafeItem => {
              const cafeType_normalized = (cafeItem.type || cafeItem.placeType || '').toLowerCase();
              return cafeType_normalized === cafeType.toLowerCase();
            }).length}
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
          />
        </div>
      )}

      {/* Enhanced Popup */}
      {selectedCafe && mapLoaded && (
        <CafePopup
          cafe={selectedCafe}
          onClose={handleSmoothPopupClose}
          userLocation={userLocation}
        />
      )}

      {/* ✨ Beautiful Animated Hover Tooltip */}
      <MarkerHoverTooltip
        cafe={hoveredCafe}
        isVisible={showTooltip && hoveredCafe && !selectedCafe}
        onClose={() => {
          setShowTooltip(false);
          setHoveredCafe(null);
        }}
      />

      {/* Dark Theme Error Message */}
      {error && (
        <div className="map-error-toast dark-theme">
          <span>❌ {error.message || 'Error loading data'}</span>
          <button onClick={handleSmoothSearch}>Retry</button>
        </div>
      )}
    </div>
  );
};

export default FullPageMap;