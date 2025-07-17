// components/FullPageMap.js - PRODUCTION READY DUAL MODE MAP - FIXED VERSION
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
  users, // User array for people mode
  selectedCafe,
  selectedUser, // Selected user
  userLocation,
  onCafeSelect,
  onUserSelect, // User selection callback
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
  mapMode, // 'people' | 'places'
  isSelectingPlace // Place selection mode for invitations
}) => {

  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef(new Map()); // Place markers
  const userMarkersRef = useRef(new Map()); // User markers
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
  
  // ENHANCED: Ultra-smooth interaction states
  const [isMapInteracting, setIsMapInteracting] = useState(false);
  const [hoveredCafe, setHoveredCafe] = useState(null);
  const [hoveredUser, setHoveredUser] = useState(null);
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
  const [currentVisibleMarkers, setCurrentVisibleMarkers] = useState(new Set());

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

  // ENHANCED: Popularity-based marker sizing system
  const calculatePopularityScore = (place) => {
    const rating = place.rating || 0;
    const reviewCount = place.user_ratings_total || place.userRatingsTotal || 0;
    
    // Weight: 70% rating, 30% review count (normalized)
    const ratingScore = (rating / 5) * 0.7; // 0-0.7
    const reviewScore = Math.min(reviewCount / 100, 1) * 0.3; // 0-0.3 (capped at 100 reviews = max)
    
    return ratingScore + reviewScore; // 0-1 score
  };

  // ENHANCED: Distance calculation utility
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

  // ENHANCED: User marker creation with profile photos and status
  const createUserMarker = useCallback((user) => {
    if (!googleMapRef.current || !user) return null;

    console.log('👤 Creating enhanced user marker:', user.firstName);

    // Calculate online status with more precise timing
    const getStatusColor = () => {
      if (!user.isLive) return '#6b7280';
      
      const timeDiff = new Date() - new Date(user.lastSeen);
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));
      
      if (minutesAgo < 2) return '#10b981'; // Bright green - very recent
      if (minutesAgo < 5) return '#22c55e'; // Green - online now
      if (minutesAgo < 15) return '#eab308'; // Yellow - recently active
      if (minutesAgo < 30) return '#f59e0b'; // Orange - away
      return '#6b7280'; // Gray - offline
    };

    const statusColor = getStatusColor();
    const markerSize = 52; // Slightly larger for better visibility
    const totalSize = markerSize + 20;

    // Enhanced user status text
    const getStatusText = () => {
      if (!user.isLive) return 'Offline';
      
      const timeDiff = new Date() - new Date(user.lastSeen);
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));
      
      if (minutesAgo < 2) return 'Online now';
      if (minutesAgo < 5) return 'Active now';
      if (minutesAgo < 15) return `${minutesAgo}m ago`;
      if (minutesAgo < 30) return 'Recently active';
      return 'Away';
    };

    // Enhanced SVG for user marker with better status indicators
    const userMarkerSVG = `
      <svg width="${totalSize}" height="${totalSize}" viewBox="0 0 ${totalSize} ${totalSize}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="circleClip${user.userId || user.id}">
            <circle cx="${totalSize / 2}" cy="${totalSize / 2}" r="${markerSize / 2 - 4}"/>
          </clipPath>
          <filter id="glow${user.userId || user.id}">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <radialGradient id="profileGrad${user.userId || user.id}" cx="30%" cy="30%" r="70%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.6" />
            <stop offset="50%" style="stop-color:${statusColor};stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:${statusColor};stop-opacity:0.8" />
          </radialGradient>
        </defs>
        
        <!-- Outer status ring -->
        <circle cx="${totalSize / 2}" cy="${totalSize / 2}" r="${markerSize / 2 + 2}" 
                fill="none" stroke="${statusColor}" stroke-width="4" opacity="0.8"
                filter="url(#glow${user.userId || user.id})"/>
        
        <!-- White background -->
        <circle cx="${totalSize / 2}" cy="${totalSize / 2}" r="${markerSize / 2}" 
                fill="white" stroke="${statusColor}" stroke-width="3"/>
        
        <!-- Profile photo or initials -->
        ${user.profilePic ? `
          <image x="${(totalSize - markerSize + 8) / 2}" y="${(totalSize - markerSize + 8) / 2}" 
                 width="${markerSize - 8}" height="${markerSize - 8}" 
                 href="${user.profilePic}" clip-path="url(#circleClip${user.userId || user.id})"/>
        ` : `
          <circle cx="${totalSize / 2}" cy="${totalSize / 2}" r="${markerSize / 2 - 4}" 
                  fill="url(#profileGrad${user.userId || user.id})"/>
          <text x="${totalSize / 2}" y="${totalSize / 2 + 6}" 
                text-anchor="middle" font-size="20" font-weight="bold" fill="white">
            ${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}
          </text>
        `}
        
        <!-- Enhanced status indicator -->
        <circle cx="${totalSize - 8}" cy="12" r="8" fill="${statusColor}" stroke="white" stroke-width="3"/>
        
        <!-- Distance badge if available -->
        ${user.distance && user.distance < 1000 ? `
          <rect x="2" y="${totalSize - 18}" width="24" height="16" rx="8" 
                fill="rgba(0,0,0,0.8)" stroke="white" stroke-width="1"/>
          <text x="14" y="${totalSize - 8}" text-anchor="middle" 
                font-size="9" font-weight="bold" fill="white">
            ${Math.round(user.distance)}m
          </text>
        ` : ''}
        
        ${user.isLive && statusColor === '#10b981' ? `
          <!-- Active pulse animation -->
          <circle cx="${totalSize / 2}" cy="${totalSize / 2}" r="${markerSize / 2 + 8}" 
                  fill="none" stroke="${statusColor}" stroke-width="2" opacity="0.6">
            <animate attributeName="r" values="${markerSize / 2 + 8};${markerSize / 2 + 16};${markerSize / 2 + 8}" 
                     dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite"/>
          </circle>
        ` : ''}
      </svg>
    `;

    const marker = new window.google.maps.Marker({
      position: { lat: user.latitude, lng: user.longitude },
      map: googleMapRef.current,
      title: `${user.firstName} ${user.lastName} • ${getStatusText()}`,
      icon: {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(userMarkerSVG)}`,
        scaledSize: new window.google.maps.Size(totalSize, totalSize),
        anchor: new window.google.maps.Point(totalSize / 2, totalSize / 2),
      },
      zIndex: 2000, // Higher than places
      optimized: false
    });

    marker.addListener('click', () => {
      console.log('👤 User marker clicked:', user.firstName);
      onUserSelect(user);
    });

    marker.addListener('mouseover', () => {
      if (!isDragging && !isMapInteracting) {
        setHoveredUser({
          ...user,
          statusText: getStatusText(),
          statusColor: statusColor
        });
        setShowTooltip(true);
      }
    });

    marker.addListener('mouseout', () => {
      setHoveredUser(null);
      setShowTooltip(false);
    });

    return marker;
  }, [onUserSelect, isDragging, isMapInteracting]);

  // ENHANCED: Go to user location with better animation
  const handleGoToUserLocation = useCallback(() => {
    if (!userLocation || !googleMapRef.current) {
      console.log('❌ No user location or map available');
      return;
    }

    console.log('🎯 Enhanced navigation to user location:', userLocation);
    
    // Hide any active tooltips and popups
    setShowTooltip(false);
    setHoveredCafe(null);
    setHoveredUser(null);
    setHoveredMarker(null);
    
    if (selectedCafe || selectedUser) {
      onClosePopup();
    }
    
    // Start smooth transition
    setIsMapInteracting(true);
    setSmoothTransition(true);
    
    const currentCenter = googleMapRef.current.getCenter();
    const currentZoom = googleMapRef.current.getZoom();
    const targetPosition = {
      lat: userLocation.latitude,
      lng: userLocation.longitude
    };

    // Calculate optimal zoom level based on mode
    const targetZoom = mapMode === 'people' ? 
      Math.max(16, currentZoom) : // Closer for people discovery
      Math.max(15, currentZoom);  // Standard for places
    
    // Check if significant movement is needed
    const needsMovement = currentCenter && (
      Math.abs(currentCenter.lat() - targetPosition.lat) > 0.001 ||
      Math.abs(currentCenter.lng() - targetPosition.lng) > 0.001
    );
    
    console.log('🎬 USER LOCATION ANIMATION:', {
      currentCenter: currentCenter ? { lat: currentCenter.lat(), lng: currentCenter.lng() } : null,
      targetPosition,
      currentZoom,
      targetZoom,
      needsMovement,
      mapMode
    });
    
    // Enhanced animation sequence
    if (needsMovement) {
      // Step 1: Smooth pan to user location
      googleMapRef.current.panTo(targetPosition);
      
      // Step 2: Smooth zoom after pan completes
      setTimeout(() => {
        if (googleMapRef.current && Math.abs(currentZoom - targetZoom) > 0.5) {
          googleMapRef.current.setZoom(targetZoom);
        }
      }, 400);
      
      // Step 3: Update location and refresh data
      setTimeout(() => {
        lastSearchLocationRef.current = targetPosition;
        onCenterChange(targetPosition);
        
        // Clear existing markers for fresh search
        if (mapMode === 'places') {
          markersRef.current.forEach((marker) => {
            if (marker && marker.setMap) {
              marker.setMap(null);
            }
          });
          markersRef.current.clear();
        } else {
          userMarkersRef.current.forEach((marker) => {
            if (marker && marker.setMap) {
              marker.setMap(null);
            }
          });
          userMarkersRef.current.clear();
        }
        
        activeMarkersRef.current.clear();
        
        // Trigger refresh for current mode
        setTimeout(() => {
          console.log(`🔍 Refreshing ${mapMode} around user location`);
          if (onRefresh) {
            console.log(`🔄 Calling refresh for ${mapMode} mode`);
            onRefresh();
          }
        }, 200);
        
        // End animation states
        setIsMapInteracting(false);
        setSmoothTransition(false);
      }, 800);
      
    } else {
      // Already at location, just zoom if needed
      if (Math.abs(currentZoom - targetZoom) > 0.5) {
        googleMapRef.current.setZoom(targetZoom);
      }
      
      // Still refresh data
      setTimeout(() => {
        if (onRefresh) {
          onRefresh();
        }
        setIsMapInteracting(false);
        setSmoothTransition(false);
      }, 400);
    }
    
  }, [userLocation, selectedCafe, selectedUser, onClosePopup, onCenterChange, onRefresh, mapMode]);

  // ENHANCED: Place marker creation with better styling
  const createEnhancedDarkMapMarker = (cafe, index, currentType, isHovered = false, isSearchResult = false) => {
    const rating = cafe.rating || 0;
    const reviewCount = cafe.user_ratings_total || cafe.userRatingsTotal || 0;
    
    // Enhanced 5-tier quality system
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
    
    // Enhanced type-based colors
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
      
      // Special colors for selection mode
      if (isSelectingPlace) {
        return {
          primary: '#10B981',
          secondary: '#059669',
          glow: '#34D399'
        };
      }
      
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
    
    // Special search result marker treatment
    if (isSearchResult) {
      colors.primary = '#9C27B0';
      colors.secondary = '#7B1FA2';
      colors.glow = '#BA68C8';
    }
    
    // Dynamic size with hover enhancement
    const getMarkerSize = () => {
      const baseSizes = {
        5: 56, 4: 48, 3: 40, 2: 34, 1: 28
      };
      
      const baseSize = baseSizes[qualityLevel] || 32;
      const zoomMultiplier = Math.min(Math.max(zoomLevel / 15, 0.8), 1.3);
      const hoverMultiplier = isHovered ? 1.3 : 1;
      const selectionMultiplier = isSelectingPlace ? 1.2 : 1;
      
      return Math.round(baseSize * zoomMultiplier * hoverMultiplier * selectionMultiplier);
    };
    
    const markerSize = getMarkerSize();
    
    // Enhanced star display system
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
    
    // Calculate total SVG size
    const totalSize = markerSize + (isHovered ? 80 : 24);
    
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
            <path id="textPath${index}" d="M ${totalSize/2 - 35} ${totalSize/2 - 25} A 35 35 0 0 1 ${totalSize/2 + 35} ${totalSize/2 - 25}" fill="none"/>
          ` : ''}
        </defs>
        
        ${isHovered ? `
          <!-- Hover pulse effect -->
          <circle cx="${totalSize / 2}" cy="${totalSize / 2}" r="${markerSize / 2 + 12}" 
                  fill="url(#pulseGrad${index})">
            <animate attributeName="r" values="${markerSize / 2 + 12};${markerSize / 2 + 18};${markerSize / 2 + 12}" 
                    dur="2s" repeatCount="indefinite"/>
          </circle>
          
          <!-- Curved text above marker -->
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
        
        ${isSelectingPlace ? `
          <!-- Selection mode indicator -->
          <circle cx="${totalSize / 2}" cy="${totalSize / 2}" r="${markerSize / 2 + 8}" 
                  fill="none" stroke="#10B981" stroke-width="3" opacity="0.8">
            <animate attributeName="stroke-width" values="3;6;3" dur="1.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.5s" repeatCount="indefinite"/>
          </circle>
        ` : ''}
        
        <!-- Main marker circle -->
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

  // ENHANCED: Real-time marker hover updates
  const updateMarkerHoverState = useCallback((cafeId, isHovered) => {
    const marker = markersRef.current.get(cafeId);
    if (!marker) return;

    const cafe = cafes.find(c => (c.id || c.googlePlaceId) === cafeId);
    if (!cafe) return;

    const position = marker.getPosition();
    const index = Array.from(markersRef.current.keys()).indexOf(cafeId);

    const markerSVG = createEnhancedDarkMapMarker(cafe, index, currentFilterRef.current, isHovered);
    
    const popularityScore = calculatePopularityScore(cafe);
    const baseSize = getMarkerSizeFromPopularity(popularityScore, zoomLevel);
    const hoverMultiplier = isHovered ? 1.3 : 1;
    const markerSize = Math.round(baseSize * hoverMultiplier);
    const totalSize = markerSize + (isHovered ? 80 : 24);

    marker.setIcon({
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerSVG),
      scaledSize: new window.google.maps.Size(totalSize, totalSize),
      anchor: new window.google.maps.Point(totalSize / 2, totalSize / 2)
    });

    const newZIndex = Math.round(popularityScore * 1000) + 100 + (isHovered ? 2000 : 0);
    marker.setZIndex(newZIndex);

  }, [cafes, zoomLevel, calculatePopularityScore, getMarkerSizeFromPopularity, createEnhancedDarkMapMarker]);

  // ENHANCED: Smart search trigger
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
    
    // Mode-specific search thresholds
    const threshold = mapMode === 'people' ? 100 : 150; // More sensitive for people
    const shouldSearch = distance > threshold;
    
    console.log(`🔍 SHOULD SEARCH CHECK (${mapMode}):`, {
      distance: Math.round(distance),
      threshold,
      shouldSearch,
      lastSearch,
      newCenter
    });
    
    return shouldSearch;
  }, [mapMode]);

  // ENHANCED: Intelligent smooth search
  const handleSmoothSearch = useCallback(() => {
    if (!googleMapRef.current || isDragging) return;
    
    const currentCenter = googleMapRef.current.getCenter();
    const newCenter = {
      lat: currentCenter.lat(),
      lng: currentCenter.lng()
    };
    
    console.log(`🔄 Smooth search (${mapMode}) with current map center:`, newCenter);
    
    lastSearchLocationRef.current = newCenter;
    onCenterChange(newCenter);
    
    setIsRefreshing(true);

    if (onRefresh) {
      onRefresh();
    }

    setTimeout(() => {
      setIsRefreshing(false);
      setSmoothTransition(false);
    }, 1000);
    
  }, [onCenterChange, onRefresh, isDragging, mapMode]);

  // ENHANCED: Drag handling with mode awareness
  const handleDragStart = useCallback(() => {
    console.log(`🎬 Drag started (${mapMode})`);
    setIsDragging(true);
    setIsMapInteracting(true);
    setSmoothTransition(false);
    dragStartTimeRef.current = Date.now();
    isUserDraggingRef.current = true;
    
    if (googleMapRef.current) {
      const center = googleMapRef.current.getCenter();
      lastDragPositionRef.current = {
        lat: center.lat(),
        lng: center.lng()
      };
    }
    
    // Clear pending searches
    if (smoothSearchTimeoutRef.current) {
      clearTimeout(smoothSearchTimeoutRef.current);
    }
    if (debouncedSearchTimeoutRef.current) {
      clearTimeout(debouncedSearchTimeoutRef.current);
    }
  }, [mapMode]);

  const handleDragEnd = useCallback(() => {
    console.log(`🎬 Drag ended (${mapMode})`);
    const dragDuration = Date.now() - (dragStartTimeRef.current || 0);
    
    setTimeout(() => {
      setIsDragging(false);
      isUserDraggingRef.current = false;
    }, 50);
    
    setTimeout(() => {
      setIsMapInteracting(false);
      setSmoothTransition(true);
      setTimeout(() => setSmoothTransition(false), 200);
    }, 100);
    
    // Force search for new area with mode-specific logic
    const currentCenter = googleMapRef.current?.getCenter();
    if (currentCenter) {
      const newCenter = {
        lat: currentCenter.lat(),
        lng: currentCenter.lng()
      };
      
      const lastPosition = lastSearchLocationRef.current;
      let significantMove = true;
      
      if (lastPosition) {
        const distance = calculateDistance(
          lastPosition.lat, lastPosition.lng,
          newCenter.lat, newCenter.lng
        );
        const threshold = mapMode === 'people' ? 150 : 200;
        significantMove = distance > threshold;
      }
      
      console.log(`🗺️ Drag ended (${mapMode}) - analyzing move:`, {
        newCenter,
        lastPosition,
        significantMove,
        willSearch: true
      });
      
      // Clear existing markers based on mode
      if (mapMode === 'places') {
        markersRef.current.forEach((marker) => {
          if (marker && marker.setMap) {
            marker.setMap(null);
          }
        });
        markersRef.current.clear();
      } else {
        userMarkersRef.current.forEach((marker) => {
          if (marker && marker.setMap) {
            marker.setMap(null);
          }
        });
        userMarkersRef.current.clear();
      }
      
      activeMarkersRef.current.clear();
      
      lastSearchLocationRef.current = newCenter;
      onCenterChange(newCenter);
      
      // Mode-specific search delays
      const searchDelay = mapMode === 'people' ? 400 : (zoomLevel >= 16 ? 300 : 500);
      
      console.log(`🚀 ${mapMode.toUpperCase()} search scheduled in ${searchDelay}ms`);
      
      if (smoothSearchTimeoutRef.current) {
        clearTimeout(smoothSearchTimeoutRef.current);
      }
      
      smoothSearchTimeoutRef.current = setTimeout(() => {
        const finalCenter = googleMapRef.current?.getCenter();
        if (finalCenter) {
          const exactCenter = {
            lat: finalCenter.lat(),
            lng: finalCenter.lng()
          };
          
          console.log(`📍 Executing ${mapMode} search at exact center:`, exactCenter);
          
          lastSearchLocationRef.current = exactCenter;
          onCenterChange(exactCenter);
          
          if (onRefresh) {
            onRefresh();
          }
        }
      }, searchDelay);
    }
  }, [handleSmoothSearch, zoomLevel, onCenterChange, mapMode]);

  // ENHANCED: Smooth marker click
  const handleSmoothMarkerClick = useCallback((cafe) => {
    console.log('🎯 Enhanced marker click:', cafe.name);
    
    setShowTooltip(false);
    setHoveredCafe(null);
    setHoveredUser(null);
    setHoveredMarker(null);
    
    setIsMapInteracting(true);
    setSmoothTransition(true);
    
    if (!googleMapRef.current) return;
    
    const currentCenter = googleMapRef.current.getCenter();
    const currentZoom = googleMapRef.current.getZoom();
    const targetPosition = {
      lat: cafe.location.latitude,
      lng: cafe.location.longitude
    };
    
    const targetZoom = Math.min(Math.max(currentZoom + 1, 16), 18);
    
    const needsMovement = currentCenter && (
      Math.abs(currentCenter.lat() - targetPosition.lat) > 0.001 ||
      Math.abs(currentCenter.lng() - targetPosition.lng) > 0.001
    );
    
    // Enhanced animation sequence
    if (needsMovement) {
      googleMapRef.current.panTo(targetPosition);
      
      setTimeout(() => {
        if (googleMapRef.current && Math.abs(currentZoom - targetZoom) > 0.5) {
          googleMapRef.current.setZoom(targetZoom);
        }
      }, 300);
      
      setTimeout(() => {
        setIsMapInteracting(false);
        setSmoothTransition(false);
        onCafeSelect(cafe);
      }, 600);
      
    } else {
      if (Math.abs(currentZoom - targetZoom) > 0.5) {
        googleMapRef.current.setZoom(targetZoom);
      }
      
      setTimeout(() => {
        setIsMapInteracting(false);
        setSmoothTransition(false);
        onCafeSelect(cafe);
      }, 300);
    }
    
  }, [onCafeSelect]);

  // ENHANCED: Popup close
  const handleSmoothPopupClose = useCallback(() => {
    console.log('🎬 Enhanced popup close');
    setSmoothTransition(true);
    
    setTimeout(() => {
      onClosePopup();
      setSmoothTransition(false);
    }, 200);
    
  }, [onClosePopup]);

  // ENHANCED: Zoom handling
  const handleZoomChanged = useCallback(() => {
    if (!googleMapRef.current) return;
    
    const newZoom = googleMapRef.current.getZoom();
    const oldZoom = lastZoomRef.current;
    
    setZoomLevel(newZoom);
    lastZoomRef.current = newZoom;
    
    if (newZoom > oldZoom) {
      setIsZoomingIn(true);
      setIsZoomingOut(false);
      console.log(`🔍 ZOOMING IN (${mapMode}) to level:`, newZoom);
    } else if (newZoom < oldZoom) {
      setIsZoomingOut(true);
      setIsZoomingIn(false);
      console.log(`🔍 ZOOMING OUT (${mapMode}) to level:`, newZoom);
    }
    
    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
    }
    
    zoomTimeoutRef.current = setTimeout(() => {
      setIsZoomingIn(false);
      setIsZoomingOut(false);
    }, 300);
    
    // Mode-aware zoom refresh
    const zoomDifference = Math.abs(newZoom - oldZoom);
    
    if (zoomDifference >= 1 && !isDragging) {
      console.log(`🔄 ${mapMode.toUpperCase()} zoom change detected, triggering refresh`);
      
      if (debouncedSearchTimeoutRef.current) {
        clearTimeout(debouncedSearchTimeoutRef.current);
      }
      
      const refreshDelay = mapMode === 'people' ? 1200 : 1500;
      
      debouncedSearchTimeoutRef.current = setTimeout(() => {
        if (!isDragging && !isMapInteracting && !isZoomingIn && !isZoomingOut) {
          handleSmoothSearch();
        }
      }, refreshDelay);
    }
    
  }, [isDragging, handleSmoothSearch, mapMode]);

  // ENHANCED: Marker hover handling
  const handleMarkerHover = useCallback((item, isEntering, itemType = 'cafe') => {
    if (isDragging || isMapInteracting || isZoomingIn || isZoomingOut) {
      return;
    }
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (hoverDelayRef.current) {
      clearTimeout(hoverDelayRef.current);
    }
    
    if (isEntering) {
      if (itemType === 'user') {
        setHoveredMarker(item.userId || item.id);
        hoverDelayRef.current = setTimeout(() => {
          setHoveredUser(item);
          setShowTooltip(true);
        }, 200);
      } else {
        setHoveredMarker(item.id || item.googlePlaceId);
        hoverDelayRef.current = setTimeout(() => {
          setHoveredCafe(item);
          setShowTooltip(true);
        }, 200);
      }
      
      console.log(`🖱️ Enhanced hover (${itemType}):`, item.name || item.firstName);
      
    } else {
      setShowTooltip(false);
      setHoveredCafe(null);
      setHoveredUser(null);
      
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredMarker(null);
      }, 150);
    }
  }, [isDragging, isMapInteracting, isZoomingIn, isZoomingOut]);

  // ENHANCED: Mouse move for tooltip positioning
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

    const handleGoogleMapsLoad = () => {
      console.log('✅ Google Maps loaded via event');
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
        console.log('✅ Google Maps API ready via polling');
      }
    }, 300);

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

  // FIXED: Map initialization with proper dependency array
  useEffect(() => {
    // Prevent multiple initializations with stricter checks
    if (googleMapsReady || mapInitialized || !mapRef.current) return;
    
    console.log('🔄 Loading Google Maps API...');
    
    const initMap = async () => {
      try {
        if (!window.google || !window.google.maps) {
          console.log('⚠️ Google Maps API not loaded');
          return;
        }
        
        console.log('✅ Google Maps API fully available');
        setGoogleMapsReady(true);
        
        // Add a small delay to prevent rapid re-initialization
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log(`🗺️ Initializing enhanced ${mapMode} map...`);
        
        if (!window.google || !window.google.maps || !window.google.maps.MapTypeId) {
          throw new Error('Google Maps API not fully loaded');
        }
        
        setLoadingProgress(95);

        const mapOptions = {
          center: { lat: center.lat, lng: center.lng },
          zoom: zoom || 15,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          
          // Enhanced animation options
          gestureHandling: 'greedy',
          clickableIcons: false,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          scaleControl: false,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: !isEmbedMode,
          
          zoomControlOptions: {
            position: window.google.maps.ControlPosition.RIGHT_BOTTOM
          },
          
          // Enhanced dark theme
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
          ]
        };

        console.log('🗺️ Creating enhanced Google Maps instance...');
        googleMapRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
        
        console.log('✅ Enhanced dual-mode map created');
        
        // Enhanced event listeners
        googleMapRef.current.addListener('dragstart', handleDragStart);
        googleMapRef.current.addListener('dragend', handleDragEnd);
        googleMapRef.current.addListener('zoom_changed', handleZoomChanged);
        
        // Enhanced center change handling
        let centerChangeTimeout;
        googleMapRef.current.addListener('center_changed', () => {
          if (centerChangeTimeout) clearTimeout(centerChangeTimeout);
          centerChangeTimeout = setTimeout(() => {
            if (!isDragging && !isUserDraggingRef.current) {
              console.log(`📍 ${mapMode.toUpperCase()} center change detected`);
              
              const currentMapCenter = googleMapRef.current?.getCenter();
              if (currentMapCenter) {
                const actualCenter = {
                  lat: currentMapCenter.lat(),
                  lng: currentMapCenter.lng()
                };
                
                if (shouldTriggerNewSearch(actualCenter)) {
                  console.log(`🚀 ${mapMode.toUpperCase()} center change triggering search:`, actualCenter);
                  
                  lastSearchLocationRef.current = actualCenter;
                  onCenterChange(actualCenter);
                  
                  if (smoothSearchTimeoutRef.current) {
                    clearTimeout(smoothSearchTimeoutRef.current);
                  }

                  const delay = mapMode === 'people' ? 400 : (zoomLevel >= 16 ? 300 : 600);
                  smoothSearchTimeoutRef.current = setTimeout(() => {
                    if (onRefresh) {
                      console.log(`🔄 Auto-refresh triggered for ${mapMode} mode`);
                      onRefresh();
                    }
                  }, delay);
                }
              }
            }
          }, 50);
        });
        
        googleMapRef.current.addListener('idle', () => {
          if (!isDragging) {
            console.log(`😴 ${mapMode} map idle - ready for interactions`);
            setIsMapInteracting(false);
          }
        });

        setMapInitialized(true);
        setMapLoaded(true);
        setLoadingProgress(100);
        setHasInitialLoad(true);

        console.log(`✅ Enhanced ${mapMode} map created successfully`);

        // Close popup if clicking on map
        googleMapRef.current.addListener('click', () => {
          if ((selectedCafe || selectedUser) && !isDragging) {
            handleSmoothPopupClose();
          }
        });
        
        if (mapRef.current) {
          mapRef.current.addEventListener('mousemove', handleMouseMove);
        }

        lastSearchLocationRef.current = { lat: center.lat, lng: center.lng };

      } catch (error) {
        console.error('❌ Failed to initialize enhanced map:', error);
        setMapError('Failed to initialize map: ' + error.message);
        setMapLoaded(false);
        setLoadingProgress(100);
      }
    };

    initMap();
  }, [center.lat, center.lng]); // FIXED: Remove googleMapsReady and mapInitialized from dependencies
  
  // Update map center for external changes
  useEffect(() => {
    if (googleMapRef.current && mapLoaded && mapInitialized && !isUserDraggingRef.current) {
      const currentCenter = googleMapRef.current.getCenter();
      
      const latDiff = Math.abs(currentCenter.lat() - center.lat);
      const lngDiff = Math.abs(currentCenter.lng() - center.lng);
      
      // Only update if there's a significant difference (avoid micro-updates)
      if (latDiff > 0.0001 || lngDiff > 0.0001) {
        console.log('📍 Updating map center externally');
        googleMapRef.current.setCenter(center);
      }
    }
  }, [center.lat, center.lng, mapLoaded, mapInitialized]);

  // ENHANCED: User location marker
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    console.log('🎯 Creating enhanced user location marker');

    const userLocationSVG = `
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="outerPulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:#4285F4;stop-opacity:0.8" />
            <stop offset="50%" style="stop-color:#4285F4;stop-opacity:0.4" />
            <stop offset="100%" style="stop-color:#4285F4;stop-opacity:0.1" />
          </radialGradient>
          
          <radialGradient id="mainButton" cx="30%" cy="30%" r="70%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.4" />
            <stop offset="30%" style="stop-color:#4285F4;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1557b0;stop-opacity:1" />
            <animateTransform attributeName="gradientTransform" type="rotate" 
                            values="0 22 22;360 22 22" dur="3s" repeatCount="indefinite"/>
          </radialGradient>
          
          <radialGradient id="lightenOverlay" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.8" />
            <stop offset="70%" style="stop-color:#87ceeb;stop-opacity:0.6" />
            <stop offset="100%" style="stop-color:#4285F4;stop-opacity:0.2" />
          </radialGradient>
          
          <filter id="buttonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- Outer pulsing circle -->
        <circle cx="22" cy="22" r="20" fill="url(#outerPulse)">
          <animate attributeName="r" values="20;26;20" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite"/>
        </circle>
        
        <!-- Main blue button -->
        <circle cx="22" cy="22" r="12" fill="url(#mainButton)" 
                stroke="rgba(255,255,255,0.6)" stroke-width="2" 
                filter="url(#buttonGlow)"/>
        
        <!-- Lightening overlay -->
        <circle cx="22" cy="22" r="12" fill="url(#lightenOverlay)">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        
        <!-- Bright flash effect -->
        <circle cx="22" cy="22" r="10" fill="#ffffff">
          <animate attributeName="opacity" values="0;0.6;0" dur="2s" repeatCount="indefinite"/>
        </circle>
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
      zIndex: 3000, // Highest priority
      optimized: false
    });

    console.log('🎯 Enhanced user location marker created');
  }, [userLocation, mapLoaded]);

  // ENHANCED: Dual marker management (places + users)
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;

    console.log('🗺️ ENHANCED DUAL MARKER UPDATE:', {
      mapMode,
      totalCafes: cafes?.length || 0,
      totalUsers: users?.length || 0,
      selectedType: cafeType,
      zoomLevel,
      isDragging,
      isMapInteracting,
      isSelectingPlace
    });

    currentFilterRef.current = cafeType;

    // Preserve markers during interactions for stability
    if (isDragging || isMapInteracting || isZoomingIn || isZoomingOut) {
      console.log('🎬 STABLE: Preserving markers during interaction');
      return;
    }

    // Clear existing markers efficiently
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current.clear();
    
    userMarkersRef.current.forEach(marker => marker.setMap(null));
    userMarkersRef.current.clear();
    
    activeMarkersRef.current.clear();

    if (mapMode === 'places' && cafes && cafes.length > 0) {
      // PLACES MODE: Create place markers
      const validCafes = cafes.filter(cafeItem => {
        return cafeItem.location && cafeItem.location.latitude && cafeItem.location.longitude;
      });

      console.log(`🏪 Creating ${validCafes.length} enhanced place markers`);

      validCafes.forEach((cafe, index) => {
        const position = {
          lat: cafe.location.latitude,
          lng: cafe.location.longitude
        };

        const cafeId = cafe.id || cafe.googlePlaceId;
        const isHovered = !isDragging && !isMapInteracting && hoveredMarker === cafeId;
        const isSearchMarker = cafe.source === 'search' || cafe.isSearchResult;
        
        const markerSVG = createEnhancedDarkMapMarker(cafe, index, currentFilterRef.current, isHovered, isSearchMarker);
        const popularityScore = calculatePopularityScore(cafe);
        const markerSize = getMarkerSizeFromPopularity(popularityScore, zoomLevel);
        const totalSize = markerSize + (isHovered ? 80 : 24);

        const marker = new window.google.maps.Marker({
          position: position,
          map: googleMapRef.current,
          title: `${isSearchMarker ? '🔍 ' : ''}${cafe.emoji || (currentFilterRef.current === 'restaurant' ? '🍽️' : '☕')} ${cafe.name}`,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerSVG),
            scaledSize: new window.google.maps.Size(totalSize, totalSize),
            anchor: new window.google.maps.Point(totalSize / 2, totalSize / 2)
          },
          zIndex: isSearchMarker ? 5000 : Math.round(popularityScore * 1000) + 100,
          optimized: true,
          visible: true
        });

        // Enhanced place marker events - ALWAYS show popup first
        marker.addListener('click', () => {
          console.log('📍 Marker clicked, showing popup for:', cafe.name);
          handleSmoothMarkerClick(cafe);
        });

        marker.addListener('mouseover', () => {
          handleMarkerHover(cafe, true, 'cafe');
        });

        marker.addListener('mouseout', () => {
          handleMarkerHover(cafe, false, 'cafe');
        });

        markersRef.current.set(cafeId, marker);
        activeMarkersRef.current.add(cafeId);
      });

      console.log(`✅ Created ${validCafes.length} enhanced place markers`);

    } else if (mapMode === 'people' && users && users.length > 0) {
      // PEOPLE MODE: Create user markers
      console.log(`👥 Creating ${users.length} enhanced user markers`);

      users.forEach(user => {
        if (!user.latitude || !user.longitude) {
          console.warn('⚠️ User missing location:', user.firstName);
          return;
        }

        const marker = createUserMarker(user);
        if (marker) {
          const userId = user.userId || user.id;
          userMarkersRef.current.set(userId, marker);
          activeMarkersRef.current.add(userId);
        }
      });

      console.log(`✅ Created ${userMarkersRef.current.size} enhanced user markers`);
    }

    console.log(`🎉 ENHANCED DUAL MARKER UPDATE completed - Mode: ${mapMode}`);

  }, [cafes, users, mapMode, cafeType, mapLoaded, isDragging, isMapInteracting, isZoomingIn, isZoomingOut, handleSmoothMarkerClick, handleMarkerHover, zoomLevel, createUserMarker, isSelectingPlace, onCafeSelect]);

  // ENHANCED: Smooth loading animations
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

  // ENHANCED: CSS for smooth animations
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
    
    .selecting-place-indicator {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #10B981, #059669);
      color: white;
      padding: 18px 28px;
      border-radius: 18px;
      box-shadow: 0 10px 40px rgba(16, 185, 129, 0.4);
      z-index: 1000;
      animation: pulseIndicator 2s infinite;
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .selecting-place-content {
      text-align: center;
    }
    
    .selecting-place-content span {
      display: block;
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 4px;
    }
    
    .selecting-place-content small {
      font-size: 13px;
      opacity: 0.9;
    }
    
    @keyframes pulseIndicator {
      0%, 100% { transform: translateX(-50%) scale(1); }
      50% { transform: translateX(-50%) scale(1.05); }
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
    <div className="full-page-map dark-map-theme">
      <style>{enhancedStyles}</style>
      
      {/* Enhanced Zoom Indicator */}
      <div className="zoom-indicator">
        {isZoomingIn ? `🔍 Zoom In (${mapMode})` : isZoomingOut ? `🔍 Zoom Out (${mapMode})` : ''}
      </div>
      
      {/* Enhanced Loading Indicators */}
      <SmoothLoader 
        isVisible={isRefreshing && !error} 
        message={mapMode === 'people' ? "🔄 Updating users..." : "🔄 Updating places..."} 
      />

      {/* Initial Loading Screen */}
      {(!hasInitialLoad && (!mapLoaded || !googleMapsReady || loading)) && (
        <LoadingScreen 
          message={mapMode === 'people' ? "Loading users..." : "Loading enhanced map..."}
          subMessage={mapMode === 'people' ? "Searching for people nearby" : "Preparing smooth interactions"}
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
            console.log('🎯 FullPageMap: Location selected from popup:', cafe?.name);
            console.log('🔍 isSelectingPlace:', isSelectingPlace);
            
            if (isSelectingPlace) {
              console.log('✅ Calling handlePlaceClick from popup');
              // This will call the actual selection logic
              if (window.handlePlaceClickFromPopup) {
                window.handlePlaceClickFromPopup(cafe);
              }
            }
          }}
        />
      )}

      {/* Enhanced Hover Tooltip - Supports both users and places */}
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
          <button onClick={handleSmoothSearch}>Retry</button>
        </div>
      )}
    </div>
  );
};

export default FullPageMap;