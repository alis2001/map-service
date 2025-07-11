// components/FullPageMap.js - COMPLETE SMOOTH INTERACTIONS VERSION
// Location: /frontend/src/components/FullPageMap.js

import React, { useRef, useEffect, useState, useCallback } from 'react';
import LoadingScreen from './LoadingScreen';
import MapUpdateLoader from './MapUpdateLoader';
import CafePopup from './CafePopup';
import MapControls from './MapControls';

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
  
  // Core map states
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [googleMapsReady, setGoogleMapsReady] = useState(false);
  const [googleMapsError, setGoogleMapsError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  
  // 🎬 SMOOTH INTERACTION STATES
  const [isMapInteracting, setIsMapInteracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [smoothTransition, setSmoothTransition] = useState(false);
  const [isMapUpdating, setIsMapUpdating] = useState(false);
  
  // Movement detection refs
  const lastSearchLocationRef = useRef(null);
  const isUserDraggingRef = useRef(false);
  const debounceTimeoutRef = useRef(null);
  const currentFilterRef = useRef(cafeType);
  const activeMarkersRef = useRef(new Set());

  // 🎬 SMOOTH INTERACTION REFS
  const dragStartTimeRef = useRef(null);
  const lastDragPositionRef = useRef(null);
  const smoothSearchTimeoutRef = useRef(null);
  const interactionTimeoutRef = useRef(null);
  const refreshAnimationRef = useRef(null);
  const debouncedSearchTimeoutRef = useRef(null);

  // 🎯 POPULARITY-BASED MARKER SIZING SYSTEM
  const calculatePopularityScore = (place) => {
    const rating = place.rating || 0;
    const reviewCount = place.user_ratings_total || place.userRatingsTotal || 0;
    
    // Weight: 70% rating, 30% review count (normalized)
    const ratingScore = (rating / 5) * 0.7; // 0-0.7
    const reviewScore = Math.min(reviewCount / 100, 1) * 0.3; // 0-0.3 (capped at 100 reviews = max)
    
    return ratingScore + reviewScore; // 0-1 score
  };

  const getMarkerSizeFromPopularity = (popularityScore) => {
    const baseSize = 24;
    const maxSize = 48;
    const minSize = 18;
    
    // Scale size based on popularity (18px to 48px)
    const dynamicSize = minSize + (popularityScore * (maxSize - minSize));
    
    console.log('📊 Marker size:', { popularityScore: popularityScore.toFixed(2), size: Math.round(dynamicSize) });
    
    return Math.round(dynamicSize);
  };

  // 🌟 CLEAN TYPE-BASED COLORS + SIZE/STARS QUALITY SYSTEM
  const createEnhancedDarkMapMarker = (cafe, index, currentType) => {
    const rating = cafe.rating || 0;
    const reviewCount = cafe.user_ratings_total || cafe.userRatingsTotal || 0;
    
    // 🎯 PRECISE 5-TIER QUALITY SYSTEM
    const getQualityTier = () => {
      const ratingScore = (rating / 5) * 0.7;
      const reviewScore = Math.min(reviewCount / 80, 1) * 0.3;
      const totalScore = ratingScore + reviewScore;
      
      if (totalScore >= 0.85) return 5; // Exceptional (4.8+ rating + 70+ reviews)
      if (totalScore >= 0.70) return 4; // Excellent (4.5+ rating + 50+ reviews)  
      if (totalScore >= 0.55) return 3; // Very good (4.2+ rating + 35+ reviews)
      if (totalScore >= 0.40) return 2; // Good (3.8+ rating + 20+ reviews)
      return 1;                         // Basic (below 3.8 rating or few reviews)
    };
    
    const qualityLevel = getQualityTier();
    
    // 🎨 PURE TYPE-BASED COLORS (no quality variation in color)
    const getTypeColor = () => {
      if (currentType === 'restaurant') {
        return {
          primary: '#E74C3C',   // Pure red for all restaurants
          secondary: '#C0392B',
          glow: '#FF6B6B'
        };
      } else { // cafe/bar
        return {
          primary: '#FF9500',   // Pure orange for all bars/cafes
          secondary: '#E67E22', 
          glow: '#FFB84D'
        };
      }
    };
    
    const colors = getTypeColor();
    
    // 📏 DRAMATIC SIZE PROGRESSION (quality = size)
    const getMarkerSize = () => {
      switch(qualityLevel) {
        case 5: return 56; // Exceptional - HUGE
        case 4: return 48; // Excellent - Large
        case 3: return 40; // Very good - Medium-large
        case 2: return 34; // Good - Medium
        case 1: return 28; // Basic - Small
        default: return 32;
      }
    };
    
    const markerSize = getMarkerSize();
    
    // ⭐ BEAUTIFUL STAR SYSTEM (quality = stars)
    const getStarDisplay = () => {
      const starSize = Math.max(10, markerSize * 0.2); // Stars scale with marker size
      const starColor = '#FFD700'; // Golden stars
      
      switch(qualityLevel) {
        case 5: return {
          count: 5,
          pattern: 'crown-full', // 5 stars in crown formation
          size: starSize,
          color: starColor
        };
        case 4: return {
          count: 4, 
          pattern: 'crown-4', // 4 stars in crown formation
          size: starSize,
          color: starColor
        };
        case 3: return {
          count: 3,
          pattern: 'triangle', // 3 stars in triangle
          size: starSize,
          color: starColor
        };
        case 2: return {
          count: 2,
          pattern: 'sides', // 2 stars on sides
          size: starSize,
          color: starColor
        };
        case 1: return {
          count: 1,
          pattern: 'single', // 1 star on top
          size: starSize,
          color: starColor
        };
      }
    };
    
    const starDisplay = getStarDisplay();
    const isVeryClose = cafe.distance && cafe.distance < 200;
    
    return `
      <svg width="${markerSize + 24}" height="${markerSize + 24}" viewBox="0 0 ${markerSize + 24} ${markerSize + 24}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow${index}">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <radialGradient id="grad${index}" cx="50%" cy="30%" r="70%">
            <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
            <stop offset="70%" style="stop-color:${colors.secondary};stop-opacity:0.9" />
            <stop offset="100%" style="stop-color:${colors.primary};stop-opacity:0.8" />
          </radialGradient>
        </defs>
        
        <!-- Main marker circle (pure type color) -->
        <circle cx="${(markerSize + 24) / 2}" cy="${(markerSize + 24) / 2}" r="${markerSize / 2}" 
                fill="url(#grad${index})" 
                filter="url(#glow${index})"
                stroke="white" 
                stroke-width="2"/>
        
        <!-- Venue type emoji (scales with marker) -->
        <text x="${(markerSize + 24) / 2}" y="${(markerSize + 24) / 2 + 6}" 
              text-anchor="middle" 
              font-size="${Math.max(18, markerSize * 0.4)}" 
              fill="white"
              style="filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.8));">
          ${currentType === 'restaurant' ? '🍽️' : '☕'}
        </text>
        
        <!-- ⭐ BEAUTIFUL STAR PATTERNS (quality indicator) -->
        ${starDisplay.pattern === 'crown-full' ? `
          <!-- 5 stars crown formation -->
          <text x="${(markerSize + 24) / 2}" y="16" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
          <text x="${(markerSize + 24) / 2 - 14}" y="22" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
          <text x="${(markerSize + 24) / 2 + 14}" y="22" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
          <text x="${(markerSize + 24) / 2 - 8}" y="28" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
          <text x="${(markerSize + 24) / 2 + 8}" y="28" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
        ` : starDisplay.pattern === 'crown-4' ? `
          <!-- 4 stars crown formation -->
          <text x="${(markerSize + 24) / 2 - 10}" y="18" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
          <text x="${(markerSize + 24) / 2 + 10}" y="18" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
          <text x="${(markerSize + 24) / 2 - 6}" y="26" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
          <text x="${(markerSize + 24) / 2 + 6}" y="26" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
        ` : starDisplay.pattern === 'triangle' ? `
          <!-- 3 stars triangle formation -->
          <text x="${(markerSize + 24) / 2}" y="16" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
          <text x="${(markerSize + 24) / 2 - 10}" y="26" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
          <text x="${(markerSize + 24) / 2 + 10}" y="26" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
        ` : starDisplay.pattern === 'sides' ? `
          <!-- 2 stars on sides -->
          <text x="${(markerSize + 24) / 2 - 12}" y="20" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
          <text x="${(markerSize + 24) / 2 + 12}" y="20" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
        ` : starDisplay.pattern === 'single' ? `
          <!-- 1 star on top -->
          <text x="${(markerSize + 24) / 2}" y="16" text-anchor="middle" font-size="${starDisplay.size}" fill="${starDisplay.color}">⭐</text>
        ` : ''}
        
        <!-- Quality level indicator (rating for top venues) -->
        ${qualityLevel >= 4 && rating > 0 ? `
          <circle cx="${(markerSize + 24) / 2}" cy="${markerSize + 16}" r="10" 
                  fill="rgba(0,0,0,0.8)" 
                  stroke="white" 
                  stroke-width="1"/>
          <text x="${(markerSize + 24) / 2}" y="${markerSize + 20}" 
                text-anchor="middle" 
                font-size="10" 
                fill="white" 
                font-weight="bold">
            ${rating.toFixed(1)}
          </text>
        ` : ''}
        
        <!-- Proximity indicator -->
        ${isVeryClose ? `
          <circle cx="${markerSize + 8}" cy="${markerSize + 8}" r="8" 
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

  // ⚡ LESS AGGRESSIVE TRIGGERING to prevent rate limits
  const shouldTriggerNewSearch = useCallback((newCenter) => {
    if (!lastSearchLocationRef.current) {
      return true;
    }

    const lastLocation = lastSearchLocationRef.current;
    
    const R = 6371e3;
    const φ1 = lastLocation.lat * Math.PI / 180;
    const φ2 = newCenter.lat * Math.PI / 180;
    const Δφ = (newCenter.lat - lastLocation.lat) * Math.PI / 180;
    const Δλ = (newCenter.lng - lastLocation.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // 🔧 INCREASED threshold to reduce API calls
    const threshold = 500; // INCREASED from 100m to 500m
    
    console.log(`🔍 Distance moved: ${Math.round(distance)}m (threshold: ${threshold}m)`);
    
    return distance > threshold;
  }, []);

  // 🎯 ULTRA-SMOOTH DRAG DETECTION (replace existing handleDragStart/End)
  const handleDragStart = useCallback(() => {
    console.log('🎬 Ultra-smooth drag started');
    setIsDragging(true);
    setIsMapInteracting(true);
    setSmoothTransition(false); // Disable transitions during drag for performance
    dragStartTimeRef.current = Date.now();
    isUserDraggingRef.current = true;
    
    // Clear any pending searches immediately
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
    
    // Immediate feedback - no delay
    setIsDragging(false);
    isUserDraggingRef.current = false;
    
    // Very short delay before enabling interactions again
    setTimeout(() => {
      setIsMapInteracting(false);
      setSmoothTransition(true); // Re-enable transitions
    }, 100); // Reduced from 300ms to 100ms
    
    // Faster search scheduling
    const searchDelay = dragDuration > 2000 ? 800 : 1200; // Slightly longer to prevent too frequent updates
    
    smoothSearchTimeoutRef.current = setTimeout(() => {
      handleSmoothSearch();
    }, searchDelay);
    
  }, [handleSmoothSearch]);

  // 🎯 INTELLIGENT SMOOTH SEARCH
  const handleSmoothSearch = useCallback(() => {
    if (!googleMapRef.current || isDragging) return;
    
    const currentCenter = googleMapRef.current.getCenter();
    const newCenter = {
      lat: currentCenter.lat(),
      lng: currentCenter.lng()
    };
    
    if (shouldTriggerNewSearch(newCenter)) {
      console.log('🔄 Triggering smooth search animation');
      
      // Smooth loading animation
      setIsRefreshing(true);
      setSmoothTransition(true);
      
      // Update map center for new search
      lastSearchLocationRef.current = newCenter;
      onCenterChange({
        lat: newCenter.lat,
        lng: newCenter.lng
      });
      
      // End refresh animation smoothly
      setTimeout(() => {
        setIsRefreshing(false);
        setSmoothTransition(false);
      }, 1500);
    }
  }, [shouldTriggerNewSearch, onCenterChange, isDragging]);

  // 🎯 SMOOTH MARKER CLICK HANDLER
  const handleSmoothMarkerClick = useCallback((cafe) => {
    console.log('🎯 Smooth marker click:', cafe.name);
    
    // Immediate visual feedback
    setSmoothTransition(true);
    
    // Smooth zoom animation
    if (googleMapRef.current) {
      googleMapRef.current.panTo({
        lat: cafe.location.latitude,
        lng: cafe.location.longitude
      });
      
      // Gentle zoom sequence
      setTimeout(() => googleMapRef.current.setZoom(17), 200);
      setTimeout(() => googleMapRef.current.setZoom(16), 600);
    }
    
    // Show popup with smooth delay
    setTimeout(() => {
      onCafeSelect(cafe);
      setSmoothTransition(false);
    }, 400);
    
  }, [onCafeSelect]);

  // 🎯 SMOOTH POPUP CLOSE
  const handleSmoothPopupClose = useCallback(() => {
    console.log('🎬 Smooth popup close');
    setSmoothTransition(true);
    
    // Smooth close animation
    setTimeout(() => {
      onClosePopup();
      setSmoothTransition(false);
    }, 200);
    
  }, [onClosePopup]);

  // 🔧 DEBOUNCED search to prevent rapid API calls
  const handleMapCenterChange = useCallback(() => {
    if (isUserDraggingRef.current || !googleMapRef.current) return;

    const currentCenter = googleMapRef.current.getCenter();
    const newCenter = {
      lat: currentCenter.lat(),
      lng: currentCenter.lng()
    };

    if (shouldTriggerNewSearch(newCenter)) {
      // Clear existing timeout
      if (debouncedSearchTimeoutRef.current) {
        clearTimeout(debouncedSearchTimeoutRef.current);
      }

      // 🔧 DEBOUNCE: Wait 2 seconds before making API call
      debouncedSearchTimeoutRef.current = setTimeout(() => {
        console.log('🔍 DEBOUNCED search triggered after 2s delay');
        lastSearchLocationRef.current = newCenter;
        
        onCenterChange({
          lat: newCenter.lat,
          lng: newCenter.lng
        });
      }, 2000); // 2 second delay

      console.log('⏱️ Search scheduled in 2 seconds...');
    }
  }, [shouldTriggerNewSearch, onCenterChange]);

  // Check Google Maps availability
  const checkGoogleMapsAvailability = useCallback(() => {
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      console.log('✅ Google Maps detected via polling');
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
      setGoogleMapsReady(true);
      setLoadingProgress(100);
    };

    window.addEventListener('googleMapsLoaded', handleGoogleMapsLoad);

    // Polling fallback
    const pollInterval = setInterval(() => {
      setLoadingProgress(prev => Math.min(prev + 10, 90));
      if (checkGoogleMapsAvailability()) {
        clearInterval(pollInterval);
        setLoadingProgress(100);
      }
    }, 200);

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
    };
  }, [checkGoogleMapsAvailability, googleMapsReady]);

  // 🗺️ ENHANCED MAP INITIALIZATION with smooth interactions
  useEffect(() => {
    if (!googleMapsReady || !center || mapInitialized || !mapRef.current) return;

    const initMap = async () => {
      try {
        console.log('🗺️ Initializing dark interactive map...');
        setLoadingProgress(95);

        const mapOptions = {
          center: { lat: center.lat, lng: center.lng },
          zoom: zoom || 15,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          
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

        googleMapRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
        
        // 🎬 OPTIMIZED MAP EVENT LISTENERS
        googleMapRef.current.addListener('dragstart', handleDragStart);
        googleMapRef.current.addListener('dragend', handleDragEnd);
        
        // 🎯 SMOOTH ZOOM EVENTS  
        googleMapRef.current.addListener('zoom_changed', () => {
          if (!isDragging) {
            console.log('🔍 Smooth zoom changed');
            setSmoothTransition(true);
            setTimeout(() => setSmoothTransition(false), 300);
          }
        });
        
        // 🎯 SMOOTH CENTER CHANGE (throttled)
        let centerChangeTimeout;
        googleMapRef.current.addListener('center_changed', () => {
          if (centerChangeTimeout) clearTimeout(centerChangeTimeout);
          centerChangeTimeout = setTimeout(() => {
            if (!isDragging) {
              console.log('📍 Smooth center change detected');
            }
          }, 100);
        });
        
        // 🎯 SMOOTH IDLE EVENT (when user stops interacting)
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

        lastSearchLocationRef.current = { lat: center.lat, lng: center.lng };

      } catch (error) {
        console.error('❌ Failed to initialize dark map:', error);
        setMapError('Failed to initialize map: ' + error.message);
        setMapLoaded(false);
        setLoadingProgress(100);
      }
    };

    initMap();
  }, [mapInitialized, center.lat, center.lng, zoom, isEmbedMode, checkGoogleMapsAvailability, handleDragStart, handleDragEnd, isDragging, selectedCafe, handleSmoothPopupClose]);

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

  // 🎯 Enhanced User location marker for dark map
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    console.log('🎯 Creating bright user location marker for dark map');

    const userLocationSVG = `
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="userGradientDark" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:#00D4FF;stop-opacity:1" />
            <stop offset="70%" style="stop-color:#0099CC;stop-opacity:0.8" />
            <stop offset="100%" style="stop-color:#00D4FF;stop-opacity:0.6" />
          </radialGradient>
          <filter id="userGlowDark">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="18" cy="18" r="16" fill="url(#userGradientDark)" filter="url(#userGlowDark)" stroke="white" stroke-width="3"/>
        <circle cx="18" cy="18" r="6" fill="white"/>
        <text x="18" y="22" text-anchor="middle" font-size="12" fill="white">📍</text>
      </svg>
    `;

    userMarkerRef.current = new window.google.maps.Marker({
      position: { lat: userLocation.latitude, lng: userLocation.longitude },
      map: googleMapRef.current,
      title: 'La tua posizione',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(userLocationSVG),
        scaledSize: new window.google.maps.Size(36, 36),
        anchor: new window.google.maps.Point(18, 18)
      },
      zIndex: 1000,
      optimized: false
    });

    console.log('🎯 Bright user location marker updated for dark map');
  }, [userLocation, mapLoaded]);

  // 🎨 SMOOTH MARKER UPDATES (replace the existing marker update useEffect)
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;

    console.log('☕ SMOOTH MARKER UPDATE - No flickering:', {
      totalCafes: cafes.length,
      selectedType: cafeType,
      mapReady: mapLoaded
    });

    // Update current filter immediately
    currentFilterRef.current = cafeType;

    // 🔧 PREVENT FLICKERING: Only update if data actually changed
    const perfectlyFilteredCafes = cafes.filter(cafe => {
      const cafeType_raw = cafe.type || cafe.placeType || '';
      const cafeType_normalized = cafeType_raw.toLowerCase().trim();
      const selectedType_normalized = currentFilterRef.current.toLowerCase().trim();
      return cafeType_normalized === selectedType_normalized;
    });

    // 🔧 SMART UPDATE: Only clear and recreate if needed
    const currentMarkerCount = activeMarkersRef.current.size;
    const newMarkerCount = perfectlyFilteredCafes.length;
    
    // If dragging, keep existing markers visible to prevent flickering
    if (isDragging || isMapInteracting) {
      console.log('🎬 Map interaction in progress - keeping markers stable');
      return;
    }

    // Only update if marker count changed significantly or type changed
    if (Math.abs(currentMarkerCount - newMarkerCount) < 5 && currentMarkerCount > 0) {
      console.log('📍 Minor change - keeping existing markers for smoothness');
      return;
    }

    console.log(`🎯 SMOOTH MARKER UPDATE: ${perfectlyFilteredCafes.length}/${cafes.length} places match "${currentFilterRef.current}"`);

    if (perfectlyFilteredCafes.length === 0) {
      // Only clear if we have no results
      markersRef.current.forEach((marker) => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      markersRef.current.clear();
      activeMarkersRef.current.clear();
      console.log('📍 NO MATCHES - Cleared markers smoothly');
      return;
    }

    // 🎬 BATCH UPDATE: Clear and recreate quickly to minimize flicker
    const markersToCreate = [];
    
    // Quick clear (minimize visible time)
    markersRef.current.forEach((marker) => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });
    markersRef.current.clear();
    activeMarkersRef.current.clear();

    // 🚀 IMMEDIATE RECREATION: Create all markers in one batch
    perfectlyFilteredCafes.forEach((cafe, index) => {
      if (!cafe.location || !cafe.location.latitude || !cafe.location.longitude) {
        return;
      }

      const position = {
        lat: cafe.location.latitude,
        lng: cafe.location.longitude
      };

      const popularityData = {
        rating: cafe.rating || 0,
        reviewCount: cafe.user_ratings_total || cafe.userRatingsTotal || 0,
        name: cafe.name,
        types: cafe.types || []
      };

      const markerSVG = createEnhancedDarkMapMarker(cafe, index, currentFilterRef.current);

      const marker = new window.google.maps.Marker({
        position: position,
        map: googleMapRef.current, // Add to map immediately
        title: `${cafe.emoji || (currentFilterRef.current === 'restaurant' ? '🍽️' : '☕')} ${cafe.name}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerSVG),
          scaledSize: new window.google.maps.Size(
            getMarkerSizeFromPopularity(calculatePopularityScore(popularityData)) + 24,
            getMarkerSizeFromPopularity(calculatePopularityScore(popularityData)) + 24
          ),
          anchor: new window.google.maps.Point(
            (getMarkerSizeFromPopularity(calculatePopularityScore(popularityData)) + 24) / 2,
            (getMarkerSizeFromPopularity(calculatePopularityScore(popularityData)) + 24) / 2
          )
        },
        zIndex: Math.round(calculatePopularityScore(popularityData) * 1000) + 100,
        optimized: false,
        // 🔧 IMMEDIATE VISIBILITY
        visible: true
      });

      // Event listeners
      marker.addListener('click', () => {
        handleSmoothMarkerClick(cafe);
      });

      marker.addListener('mouseover', () => {
        if (!isDragging && !isMapInteracting) {
          marker.setZIndex(2000);
        }
      });

      marker.addListener('mouseout', () => {
        if (!isDragging && !isMapInteracting) {
          marker.setZIndex(Math.round(calculatePopularityScore(popularityData) * 1000) + 100);
        }
      });

      markersRef.current.set(cafe.id || cafe.googlePlaceId, marker);
      activeMarkersRef.current.add(cafe.id || cafe.googlePlaceId);
    });

    console.log(`🎉 SMOOTH MARKERS: ${perfectlyFilteredCafes.length} markers updated instantly - no flicker`);

  }, [cafes, cafeType, mapLoaded, isDragging, isMapInteracting, handleSmoothMarkerClick]);

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
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    
    .map-canvas {
      transition: ${smoothTransition ? 'filter 0.3s ease' : 'none'};
      filter: ${isMapInteracting ? 'brightness(1.05)' : 'brightness(1)'};
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
      
      {/* Smooth Loading Indicators */}
      <SmoothLoader 
        isVisible={isRefreshing} 
        message="Ricerca luoghi..." 
      />
      
      <SmoothLoader 
        isVisible={loading && !isRefreshing} 
        message="Caricamento mappa..." 
      />

      {/* Initial Loading Screen */}
      {(!hasInitialLoad && (!mapLoaded || !googleMapsReady || loading)) && (
        <LoadingScreen 
          message="Caricamento mappa dark..."
          subMessage="Preparazione esperienza dark interattiva"
          progress={loadingProgress}
        />
      )}

      {/* INSTANT Map Update Loader */}
      {(isMapUpdating || (hasInitialLoad && loading)) && (
        <MapUpdateLoader
          loading={isMapUpdating || (hasInitialLoad && loading)}
          searchType={cafeType}
          forcefulMode={false}
        />
      )}

      {/* Map with smooth interactions */}
      <div 
        ref={mapRef} 
        className={`map-canvas dark-map-canvas ${smoothTransition ? 'smooth-transition' : ''}`}
        style={{ 
          width: '100%', 
          height: '100%',
          backgroundColor: '#1a1a1a',
          borderRadius: isEmbedMode ? '12px' : '0',
          transform: isDragging ? 'scale(1.001)' : 'scale(1)', // Subtle scale on drag
          transition: 'transform 0.2s ease'
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
            onRefresh={handleSmoothSearch}
            hasUserLocation={!!userLocation}
            cafesCount={cafes.filter(cafe => {
              const cafeType_normalized = (cafe.type || cafe.placeType || '').toLowerCase();
              return cafeType_normalized === cafeType.toLowerCase();
            }).length}
            isEmbedMode={isEmbedMode}
            userLocation={userLocation}
            onLocationRetry={onLocationRetry}
            onPreciseLocation={onPreciseLocation}
            locationLoading={locationLoading}
            locationError={locationError}
            detectionMethod={detectionMethod}
            qualityText={qualityText}
            sourceText={sourceText}
          />
        </div>
      )}

      {/* Ultra-Smooth Popup - Fixed Positioning */}
      {selectedCafe && mapLoaded && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          pointerEvents: 'none', // Allow clicks through the wrapper
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', // Faster transition
          transform: smoothTransition ? 'scale(1.01)' : 'scale(1)' // Subtle scale
        }}>
          <div style={{ pointerEvents: 'auto' }}> {/* Re-enable clicks on popup */}
            <CafePopup
              cafe={selectedCafe}
              onClose={handleSmoothPopupClose}
              userLocation={userLocation}
            />
          </div>
        </div>
      )}

      {/* Dark Theme Error Message */}
      {error && (
        <div className="map-error-toast dark-theme">
          <span>❌ {error.message || 'Error loading data'}</span>
          <button onClick={handleSmoothSearch}>Retry</button>
        </div>
      )}

      {/* Dark Map Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="dark-map-debug-info" style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#00D4FF',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontFamily: 'monospace',
          border: '1px solid rgba(0, 212, 255, 0.3)',
          backdropFilter: 'blur(10px)'
        }}>
          🌑 Dark Map | {cafeType}: {cafes.filter(c => (c.type || c.placeType) === cafeType).length} | 
          Total: {cafes.length} | Method: {detectionMethod || 'unknown'}
        </div>
      )}
    </div>
  );
};

export default FullPageMap;