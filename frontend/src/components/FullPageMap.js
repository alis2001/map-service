// components/FullPageMap.js - COMPLETE DARK MAP VERSION with Enhanced Features
// Location: /map-service/frontend/src/components/FullPageMap.js

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
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [googleMapsReady, setGoogleMapsReady] = useState(false);
  const [googleMapsError, setGoogleMapsError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isMapUpdating, setIsMapUpdating] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  
  // INSTANT MOVEMENT DETECTION
  const lastSearchLocationRef = useRef(null);
  const isUserDraggingRef = useRef(false);
  const debounceTimeoutRef = useRef(null);
  const currentFilterRef = useRef(cafeType);
  const activeMarkersRef = useRef(new Set());

  // ⚡ INSTANT TRIGGER DISTANCE
  // ⚡ UPDATED: Less aggressive triggering to avoid rate limits
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

    // UPDATED: Larger trigger distance to reduce API calls
    const instantTrigger = Math.max(searchRadius * 0.4, 600); // Increased from 0.15 and 200
    const hasMovedSignificantly = distance > instantTrigger;

    if (hasMovedSignificantly) {
      console.log(`⚡ SEARCH TRIGGER: Moved ${Math.round(distance)}m > ${Math.round(instantTrigger)}m`);
    }

    return hasMovedSignificantly;
  }, [searchRadius]);

  // 🚀 ULTRA-FAST CENTER CHANGE HANDLER
  const handleMapCenterChange = useCallback((newCenter) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const shouldSearch = shouldTriggerNewSearch(newCenter);
    const delay = shouldSearch ? 400 : 800;

    console.log(`⚡ INSTANT search scheduled in ${delay}ms`);

    debounceTimeoutRef.current = setTimeout(() => {
      if (!isUserDraggingRef.current && shouldSearch) {
        console.log('⚡ INSTANT search triggered!');
        lastSearchLocationRef.current = newCenter;
        
        if (onCenterChange) {
          onCenterChange(newCenter);
        }
      } else if (!shouldSearch) {
        setTimeout(() => {
          setIsMapUpdating(false);
        }, 200);
      }
    }, delay);
  }, [onCenterChange, shouldTriggerNewSearch, hasInitialLoad]);

  // ⚡ INSTANT LOADING MANAGEMENT
  useEffect(() => {
    if (!loading && isMapUpdating) {
      const minDisplayTime = 800;
      
      setTimeout(() => {
        setIsMapUpdating(false);
        console.log('✨ INSTANT completion');
      }, minDisplayTime);
    }
  }, [loading, isMapUpdating]);

  // Fast loading progress simulation
  useEffect(() => {
    if (!mapLoaded && googleMapsReady && !hasInitialLoad) {
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          const newProgress = prev + Math.random() * 25;
          if (newProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return newProgress;
        });
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [mapLoaded, googleMapsReady, hasInitialLoad]);

  // ✅ Google Maps initialization
  const checkGoogleMapsAvailability = useCallback(() => {
    return new Promise((resolve) => {
      if (window.google && window.google.maps && window.google.maps.Map) {
        console.log('✅ Google Maps already available');
        setGoogleMapsReady(true);
        resolve(true);
        return;
      }

      const handleGoogleMapsLoaded = () => {
        console.log('✅ Google Maps loaded via event');
        setGoogleMapsReady(true);
        setGoogleMapsError(null);
        resolve(true);
        cleanup();
      };

      const handleGoogleMapsError = (event) => {
        console.error('❌ Google Maps loading error:', event.detail);
        setGoogleMapsError(event.detail.message || 'Failed to load Google Maps');
        setGoogleMapsReady(false);
        resolve(false);
        cleanup();
      };

      const cleanup = () => {
        window.removeEventListener('googleMapsLoaded', handleGoogleMapsLoaded);
        window.removeEventListener('googleMapsError', handleGoogleMapsError);
        clearTimeout(timeoutId);
      };

      window.addEventListener('googleMapsLoaded', handleGoogleMapsLoaded);
      window.addEventListener('googleMapsError', handleGoogleMapsError);

      const timeoutId = setTimeout(() => {
        console.error('❌ Google Maps loading timeout');
        setGoogleMapsError('Google Maps failed to load. Please check your internet connection.');
        setGoogleMapsReady(false);
        resolve(false);
        cleanup();
      }, 10000);

      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.Map) {
          console.log('✅ Google Maps detected via polling');
          setGoogleMapsReady(true);
          setGoogleMapsError(null);
          resolve(true);
          cleanup();
          clearInterval(checkInterval);
        }
      }, 200);

      setTimeout(() => {
        clearInterval(checkInterval);
      }, 10000);
    });
  }, []);

  // 🌑 ENHANCED DARK MAP STYLES
  const getDarkMapStyles = () => [
    // Base dark theme
    {
      "elementType": "geometry",
      "stylers": [{ "color": "#212121" }]
    },
    {
      "elementType": "labels.icon",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#757575" }]
    },
    {
      "elementType": "labels.text.stroke",
      "stylers": [{ "color": "#212121" }]
    },
    
    // Administrative areas
    {
      "featureType": "administrative",
      "elementType": "geometry",
      "stylers": [{ "color": "#757575" }, { "visibility": "off" }]
    },
    {
      "featureType": "administrative.country",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#9ca5b3" }]
    },
    {
      "featureType": "administrative.locality",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#bdbdbd" }]
    },
    
    // Hide POI for cleaner look
    {
      "featureType": "poi",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "featureType": "poi.business",
      "stylers": [{ "visibility": "off" }]
    },
    {
      "featureType": "poi.park",
      "elementType": "geometry",
      "stylers": [{ "color": "#263c3f" }]
    },
    
    // Enhanced roads
    {
      "featureType": "road",
      "elementType": "geometry.fill",
      "stylers": [{ "color": "#2c2c2c" }]
    },
    {
      "featureType": "road",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#8a8a8a" }]
    },
    {
      "featureType": "road.arterial",
      "elementType": "geometry",
      "stylers": [{ "color": "#373737" }]
    },
    {
      "featureType": "road.highway",
      "elementType": "geometry",
      "stylers": [{ "color": "#3c3c3c" }]
    },
    {
      "featureType": "road.local",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#616161" }]
    },
    
    // Hide transit
    {
      "featureType": "transit",
      "stylers": [{ "visibility": "off" }]
    },
    
    // Dark water
    {
      "featureType": "water",
      "elementType": "geometry",
      "stylers": [{ "color": "#000000" }]
    },
    {
      "featureType": "water",
      "elementType": "labels.text.fill",
      "stylers": [{ "color": "#3d3d3d" }]
    },
    
    // Dark landscape
    {
      "featureType": "landscape.man_made",
      "elementType": "geometry.fill",
      "stylers": [{ "color": "#1a1a1a" }]
    },
    {
      "featureType": "landscape.natural",
      "elementType": "geometry.fill",
      "stylers": [{ "color": "#2d2d2d" }]
    }
  ];

  // 🗺️ Enhanced Map initialization with dark theme
  useEffect(() => {
    if (mapInitialized || !mapRef.current) return;

    const initMap = async () => {
      try {
        console.log('🗺️ Initializing dark interactive map...');
        
        const isReady = await checkGoogleMapsAvailability();
        if (!isReady) {
          return;
        }

        if (!mapRef.current) {
          console.error('❌ Map container ref is null');
          setMapError('Map container not found');
          return;
        }

        const mapOptions = {
          center: { lat: center.lat, lng: center.lng },
          zoom: zoom,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          
          // UI Controls - minimal for dark theme
          zoomControl: true,
          zoomControlOptions: {
            position: window.google.maps.ControlPosition.RIGHT_BOTTOM,
            style: window.google.maps.ZoomControlStyle.SMALL
          },
          mapTypeControl: false,
          scaleControl: false,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: !isEmbedMode,
          
          // 🌑 ENHANCED DARK MAP STYLES
          styles: getDarkMapStyles(),
          
          // Gestures for responsiveness
          gestureHandling: 'greedy',
          disableDoubleClickZoom: false,
          draggable: true,
          scrollwheel: true,
          
          // Clean dark theme
          disableDefaultUI: false,
          clickableIcons: false,
          
          // Enhanced dark background
          backgroundColor: '#1a1a1a'
        };

        try {
          googleMapRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
          console.log('✅ Dark interactive map created successfully');
          
        } catch (mapCreationError) {
          console.error('❌ Failed to create dark map:', mapCreationError);
          setMapError('Error creating map instance');
          return;
        }

        // Add INSTANT event listeners
        googleMapRef.current.addListener('dragstart', () => {
          isUserDraggingRef.current = true;
          if (hasInitialLoad) {
            setIsMapUpdating(true);
          }
        });

        googleMapRef.current.addListener('dragend', () => {
          isUserDraggingRef.current = false;
          const newCenter = googleMapRef.current.getCenter();
          const newCenterObj = {
            lat: newCenter.lat(),
            lng: newCenter.lng()
          };
          handleMapCenterChange(newCenterObj);
        });

        googleMapRef.current.addListener('click', () => {
          if (selectedCafe && onClosePopup) {
            onClosePopup();
          }
        });

        // Quick tiles loading for dark map
        const tilesLoadedPromise = new Promise((resolve) => {
          const listener = googleMapRef.current.addListener('tilesloaded', () => {
            window.google.maps.event.removeListener(listener);
            resolve();
          });
          setTimeout(resolve, 1000);
        });

        await tilesLoadedPromise;

        console.log('✅ Dark interactive map loaded');
        
        setMapLoaded(true);
        setMapError(null);
        setMapInitialized(true);
        setLoadingProgress(100);
        
        lastSearchLocationRef.current = { lat: center.lat, lng: center.lng };

      } catch (error) {
        console.error('❌ Failed to initialize dark map:', error);
        setMapError('Failed to initialize map: ' + error.message);
        setMapLoaded(false);
        setLoadingProgress(100);
      }
    };

    initMap();
  }, [mapInitialized, center.lat, center.lng, zoom, isEmbedMode, checkGoogleMapsAvailability, handleMapCenterChange, hasInitialLoad, selectedCafe, onClosePopup]);

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
            <stop offset="100%" style="stop-color:#00D4FF;stop-opacity:0" />
          </radialGradient>
          <filter id="userGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- Outer pulsing ring -->
        <circle cx="18" cy="18" r="16" fill="url(#userGradientDark)" opacity="0.4">
          <animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite"/>
        </circle>
        
        <!-- Middle ring -->
        <circle cx="18" cy="18" r="10" fill="#00D4FF" opacity="0.6" filter="url(#userGlow)">
          <animate attributeName="r" values="8;12;8" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        
        <!-- Inner bright core -->
        <circle cx="18" cy="18" r="6" fill="#FFFFFF" stroke="#00D4FF" stroke-width="2"/>
        <circle cx="18" cy="18" r="3" fill="#00D4FF"/>
      </svg>
    `;

    const userMarker = new window.google.maps.Marker({
      position: { 
        lat: userLocation.latitude, 
        lng: userLocation.longitude 
      },
      map: googleMapRef.current,
      title: `📍 Your location (${detectionMethod || 'detected'})`,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(userLocationSVG),
        scaledSize: new window.google.maps.Size(36, 36),
        anchor: new window.google.maps.Point(18, 18)
      },
      zIndex: 10000,
      optimized: false
    });

    userMarkerRef.current = userMarker;
    console.log('🎯 Bright user location marker updated for dark map');
  }, [userLocation, mapLoaded, locationLoading, detectionMethod]);

  // 🔍 Enhanced Search radius circle for dark map
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded || !userLocation || !searchRadius) return;

    if (radiusCircleRef.current) {
      radiusCircleRef.current.setMap(null);
    }

    if (userLocation.accuracy && userLocation.accuracy < 1000) {
      const circleColors = cafeType === 'restaurant' ? 
        { fill: '#A55EEA', stroke: '#8B5CF6' } : 
        { fill: '#FF9F43', stroke: '#F97316' };

      const circle = new window.google.maps.Circle({
        center: { 
          lat: userLocation.latitude, 
          lng: userLocation.longitude 
        },
        radius: searchRadius,
        map: googleMapRef.current,
        fillColor: circleColors.fill,
        fillOpacity: 0.15,
        strokeColor: circleColors.stroke,
        strokeOpacity: 0.6,
        strokeWeight: 2,
        clickable: false
      });

      radiusCircleRef.current = circle;
      console.log('🔍 Bright search radius circle updated for dark map:', searchRadius);
    }
  }, [userLocation, searchRadius, mapLoaded, cafeType]);

  // 🎨 ENHANCED DARK MAP MARKER CREATION
  // 🎨 ENHANCED DARK MAP MARKER CREATION - LARGER & BETTER COLORS
  // 🎨 BEAUTIFUL CIRCULAR MARKERS - NO BACKGROUND
  const createEnhancedDarkMapMarker = (cafe, index, selectedType) => {
    // Bright, vibrant colors for dark map
    const colors = selectedType === 'restaurant' ? 
      { 
        primary: '#FF6B6B',      // Bright coral red
        secondary: '#FF4757',    // Deeper red
        accent: '#FFD93D',       // Golden yellow
        ring: '#FF8E8E'          // Light coral ring
      } :
      { 
        primary: '#FFA726',      // Bright orange
        secondary: '#FF8F00',    // Deep orange
        accent: '#00D4FF',       // Bright cyan
        ring: '#FFB74D'          // Light orange ring
      };
    
    const emoji = selectedType === 'restaurant' ? '🍽️' : '☕';
    const isClose = cafe.distance && cafe.distance < 300;
    const isVeryClose = cafe.distance && cafe.distance < 150;
    const isHighRated = cafe.rating && cafe.rating >= 4.5;
    
    // Larger sizes for better visibility
    const baseSize = isVeryClose ? 48 : isClose ? 44 : 40;
    const centerRadius = baseSize / 2 - 4;
    
    return `
      <svg width="${baseSize}" height="${baseSize}" viewBox="0 0 ${baseSize} ${baseSize}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="circleGradient${index}" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
            <stop offset="70%" style="stop-color:${colors.secondary};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colors.primary};stop-opacity:0.8" />
          </radialGradient>
          
          <filter id="markerGlow${index}">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        ${isVeryClose ? `
          <!-- Pulsing outer ring for very close places -->
          <circle cx="${baseSize/2}" cy="${baseSize/2}" r="${centerRadius + 8}" 
                  fill="none" stroke="${colors.accent}" stroke-width="2" opacity="0.6">
            <animate attributeName="r" values="${centerRadius + 4};${centerRadius + 12};${centerRadius + 4}" 
                    dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite"/>
          </circle>
        ` : ''}
        
        ${isClose ? `
          <!-- Subtle glow ring for close places -->
          <circle cx="${baseSize/2}" cy="${baseSize/2}" r="${centerRadius + 6}" 
                  fill="none" stroke="${colors.ring}" stroke-width="1.5" opacity="0.4">
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="3s" repeatCount="indefinite"/>
          </circle>
        ` : ''}
        
        <!-- Main circular marker -->
        <circle cx="${baseSize/2}" cy="${baseSize/2}" r="${centerRadius}" 
                fill="url(#circleGradient${index})" 
                stroke="white" 
                stroke-width="3" 
                filter="url(#markerGlow${index})"
                style="drop-shadow(0 0 8px ${colors.secondary})"/>
        
        <!-- Emoji icon centered -->
        <text x="${baseSize/2}" y="${baseSize/2 + 4}" 
              text-anchor="middle" 
              dominant-baseline="central"
              font-size="${baseSize * 0.45}" 
              fill="white" 
              style="text-shadow: 0 0 6px rgba(0,0,0,0.8); font-weight: bold;">
          ${emoji}
        </text>
        
        ${isHighRated ? `
          <!-- Star badge for high rating -->
          <circle cx="${baseSize - 10}" cy="10" r="7" 
                  fill="${colors.accent}" 
                  stroke="white" 
                  stroke-width="2"/>
          <text x="${baseSize - 10}" y="14" 
                text-anchor="middle" 
                font-size="9" 
                fill="white" 
                font-weight="bold">★</text>
        ` : ''}
        
        ${isVeryClose ? `
          <!-- Exclamation badge for very close -->
          <circle cx="10" cy="10" r="6" 
                  fill="#26DE81" 
                  stroke="white" 
                  stroke-width="2"/>
          <text x="10" y="14" 
                text-anchor="middle" 
                font-size="8" 
                fill="white" 
                font-weight="bold">!</text>
        ` : ''}
      </svg>
    `;
  };

  // 🚀 INSTANT MARKER RENDERING with Enhanced Dark Map Markers
  // 🚀 INSTANT MARKER RENDERING with Enhanced Dark Map Markers
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;

    console.log('☕ INSTANT FILTERING - Dark map marker update:', {
      totalCafes: cafes.length,
      selectedType: cafeType,
      mapReady: mapLoaded
    });

    // Update current filter immediately
    currentFilterRef.current = cafeType;

    // INSTANT CLEAR all existing markers
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    markersRef.current.clear();
    activeMarkersRef.current.clear();

    // IMPROVED FILTERING - Check both type and placeType fields
    const perfectlyFilteredCafes = cafes.filter(cafe => {
      const cafeType_raw = cafe.type || cafe.placeType || '';
      const cafeType_normalized = cafeType_raw.toLowerCase().trim();
      const selectedType_normalized = currentFilterRef.current.toLowerCase().trim();
      
      console.log('🔍 FILTERING PLACE:', {
        name: cafe.name,
        rawType: cafeType_raw,
        normalizedType: cafeType_normalized,
        selectedType: selectedType_normalized,
        matches: cafeType_normalized === selectedType_normalized
      });
      
      return cafeType_normalized === selectedType_normalized;
    });

    console.log(`🎯 DARK MAP FILTER: ${perfectlyFilteredCafes.length}/${cafes.length} places match "${currentFilterRef.current}"`);

    if (perfectlyFilteredCafes.length === 0) {
      console.log('📍 NO MATCHES - Empty dark map');
      return;
    }

    // 🎨 ENHANCED DARK MAP MARKER CREATION
    perfectlyFilteredCafes.forEach((cafe, index) => {
      if (!cafe.location || !cafe.location.latitude || !cafe.location.longitude) {
        console.warn('⚠️ Skipping place with missing coordinates:', cafe.name);
        return;
      }

      const position = {
        lat: cafe.location.latitude,
        lng: cafe.location.longitude
      };

      // 🎨 ENHANCED DARK MAP MARKER
      const markerSVG = createEnhancedDarkMapMarker(cafe, index, currentFilterRef.current);

      const marker = new window.google.maps.Marker({
        position: position,
        map: googleMapRef.current,
        title: `${cafe.emoji || (currentFilterRef.current === 'restaurant' ? '🍽️' : '☕')} ${cafe.name}${cafe.rating ? ` (${cafe.rating}⭐)` : ''}${cafe.distance ? ` - ${cafe.formattedDistance}` : ''}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerSVG),
          scaledSize: new window.google.maps.Size(
            cafe.distance && cafe.distance < 150 ? 48 : 
            cafe.distance && cafe.distance < 300 ? 44 : 40, 
            cafe.distance && cafe.distance < 150 ? 48 : 
            cafe.distance && cafe.distance < 300 ? 44 : 40
          ),
          anchor: new window.google.maps.Point(
            cafe.distance && cafe.distance < 150 ? 24 : 
            cafe.distance && cafe.distance < 300 ? 22 : 20,
            cafe.distance && cafe.distance < 150 ? 24 : 
            cafe.distance && cafe.distance < 300 ? 22 : 20
          ),
          optimized: false
        },
        zIndex: cafe.distance ? Math.round(2000 - cafe.distance / 10) : 1000,
        optimized: false
      });

      // Add click listener
      marker.addListener('click', () => {
        if (onCafeSelect) {
          onCafeSelect(cafe);
        }
      });

      // Track marker
      const markerId = cafe.id || cafe.googlePlaceId;
      markersRef.current.set(markerId, marker);
      activeMarkersRef.current.add(`${markerId}:${currentFilterRef.current}`);
    });

    console.log(`🎉 DARK MAP MARKERS: ${perfectlyFilteredCafes.length} enhanced ${currentFilterRef.current} markers added instantly`);

  }, [cafes, mapLoaded, onCafeSelect, cafeType]);

  // Set initial load complete
  useEffect(() => {
    if (mapLoaded && googleMapsReady && !hasInitialLoad) {
      setHasInitialLoad(true);
      console.log('✅ Initial dark map load completed');
    }
  }, [mapLoaded, googleMapsReady, hasInitialLoad]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      if (userMarkerRef.current) {
        userMarkerRef.current.setMap(null);
      }
      if (radiusCircleRef.current) {
        radiusCircleRef.current.setMap(null);
      }
      markersRef.current.forEach(marker => {
        marker.setMap(null);
      });
      markersRef.current.clear();
      activeMarkersRef.current.clear();
    };
  }, []);

  // Handle retry map loading
  const handleRetryMap = useCallback(() => {
    setMapError(null);
    setGoogleMapsError(null);
    setMapLoaded(false);
    setMapInitialized(false);
    setGoogleMapsReady(false);
    setLoadingProgress(0);
    setHasInitialLoad(false);
    
    window.location.reload();
  }, []);

  // Error handling
  const errorMessage = mapError || googleMapsError;

  if (errorMessage) {
    return (
      <div className="map-error-container">
        <div className="map-error-content">
          <div className="error-icon">🗺️❌</div>
          <h3>Dark Map Error</h3>
          <p>{errorMessage}</p>
          <button 
            className="btn-apple-base btn-primary"
            onClick={handleRetryMap}
          >
            🔄 Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="full-page-map dark-map-theme">
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

      {/* Dark Map Container */}
      <div 
        ref={mapRef} 
        className="map-canvas dark-map-canvas"
        style={{ 
          width: '100%', 
          height: '100%',
          backgroundColor: '#1a1a1a',
          borderRadius: isEmbedMode ? '12px' : '0'
        }}
      />

      {showControls && mapLoaded && (
        <MapControls
          cafeType={cafeType}
          searchRadius={searchRadius}
          onSearchChange={onSearchChange}
          onRefresh={onRefresh}
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
      )}

      {/* Enhanced Cafe Popup for Dark Theme */}
      {selectedCafe && mapLoaded && (
        <CafePopup
          cafe={selectedCafe}
          onClose={onClosePopup}
          userLocation={userLocation}
        />
      )}

      {/* Dark Theme Error Message */}
      {error && (
        <div className="map-error-toast dark-theme">
          <span>❌ {error.message || 'Error loading data'}</span>
          <button onClick={onRefresh}>Retry</button>
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