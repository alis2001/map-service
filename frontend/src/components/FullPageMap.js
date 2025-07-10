// components/FullPageMap.js - FIXED VERSION with Perfect Filtering & Beautiful Markers
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
  const [markersLoaded, setMarkersLoaded] = useState(false);
  const [markersLoading, setMarkersLoading] = useState(false);
  const errorCountRef = useRef(0);
  const loaderStartTimeRef = useRef(null);
  const [isMapUpdating, setIsMapUpdating] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  
  // Smart movement detection
  const lastSearchLocationRef = useRef(null);
  const isUserDraggingRef = useRef(false);
  const debounceTimeoutRef = useRef(null);
  const immediateSearchTimeoutRef = useRef(null);
  
  // CRITICAL: Track current filter to prevent mixed results
  const currentFilterRef = useRef(cafeType);
  const lastSuccessfulSearchRef = useRef(null);

  // Fast loading progress simulation
  useEffect(() => {
    if (!mapLoaded && googleMapsReady && !hasInitialLoad) {
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          const newProgress = prev + Math.random() * 20;
          if (newProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return newProgress;
        });
      }, 150);
      
      return () => clearInterval(interval);
    }
  }, [mapLoaded, googleMapsReady, hasInitialLoad]);

  useEffect(() => {
    if (mapLoaded && googleMapsReady && !hasInitialLoad) {
      setHasInitialLoad(true);
      console.log('✅ Initial map load completed');
    }
  }, [mapLoaded, googleMapsReady, hasInitialLoad]);

  // IMPROVED: Better Google Maps availability checking
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
        console.error('❌ Google Maps loading timeout after 15 seconds');
        setGoogleMapsError('Google Maps failed to load within 15 seconds. Please check your internet connection and API key.');
        setGoogleMapsReady(false);
        resolve(false);
        cleanup();
      }, 15000);

      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.Map) {
          console.log('✅ Google Maps detected via polling');
          setGoogleMapsReady(true);
          setGoogleMapsError(null);
          resolve(true);
          cleanup();
          clearInterval(checkInterval);
        }
      }, 500);

      setTimeout(() => {
        clearInterval(checkInterval);
      }, 15000);
    });
  }, []);

  // UPDATED: Smaller trigger distance for more responsive updates
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

    const ultraFastThreshold = Math.max(searchRadius * 0.05, 30);
    const hasMovedSignificantly = distance > ultraFastThreshold;

    if (hasMovedSignificantly) {
      console.log(`🚀 ULTRA-FAST TRIGGER: Moved ${Math.round(distance)}m > ${Math.round(ultraFastThreshold)}m`);
    }

    return hasMovedSignificantly;
  }, [searchRadius]);

  const handleMapCenterChange = useCallback((newCenter) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (immediateSearchTimeoutRef.current) {
      clearTimeout(immediateSearchTimeoutRef.current);
    }

    const shouldSearch = shouldTriggerNewSearch(newCenter);
    
    // LONGER delays for forceful API completion
    const delay = shouldSearch ? 800 : 1200; // Increased from 200/400

    console.log(`⚡ FORCEFUL search scheduled in ${delay}ms, shouldSearch: ${shouldSearch}`);

    debounceTimeoutRef.current = setTimeout(() => {
      if (!isUserDraggingRef.current && shouldSearch) {
        console.log('⚡ FORCEFUL search triggered!');
        lastSearchLocationRef.current = newCenter;
        
        if (onCenterChange) {
          onCenterChange(newCenter);
        }
      } else if (!shouldSearch) {
        setTimeout(() => {
          setIsMapUpdating(false);
        }, 400);
      }
    }, delay);
  }, [onCenterChange, shouldTriggerNewSearch, hasInitialLoad]);

  // ENHANCED: Perfect loading management with longer minimum display
  useEffect(() => {
    if (!loading && !markersLoading && isMapUpdating) {
      // LONGER minimum display time for forceful API completion
      const minDisplayTime = 4000; // Increased from 2500 to 4000ms
      const loaderStartTime = loaderStartTimeRef.current || Date.now();
      
      setTimeout(() => {
        const elapsedTime = Date.now() - loaderStartTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
        
        setTimeout(() => {
          setIsMapUpdating(false);
          console.log('✨ FORCEFUL API completion - Beautiful loading finished');
        }, remainingTime);
      }, 600); // Increased buffer for smooth transition
    }
  }, [loading, markersLoading, isMapUpdating]);

  // ENHANCED: Map initialization with dark theme
  useEffect(() => {
    if (mapInitialized || !mapRef.current) return;

    const initMap = async () => {
      try {
        console.log('🗺️ Initializing WWDC-style Google Map...');
        
        const isReady = await checkGoogleMapsAvailability();
        if (!isReady) {
          return;
        }

        console.log('🗺️ Creating WWDC-style Google Map instance...');

        if (!mapRef.current) {
          console.error('❌ Map container ref is null');
          setMapError('Map container not found');
          return;
        }

        const mapOptions = {
          center: { lat: center.lat, lng: center.lng },
          zoom: zoom,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          
          // UI Controls - WWDC minimal
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
          
          // Beautiful dark creative theme
          styles: [
            {
              "featureType": "all",
              "elementType": "geometry",
              "stylers": [{ "color": "#1a1a1a" }]
            },
            {
              "featureType": "all",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#ffffff" }]
            },
            {
              "featureType": "all",
              "elementType": "labels.text.stroke",
              "stylers": [{ "color": "#000000" }]
            },
            {
              "featureType": "administrative",
              "elementType": "geometry.stroke",
              "stylers": [
                { "color": "#444444" },
                { "weight": 0.8 }
              ]
            },
            {
              "featureType": "landscape",
              "elementType": "geometry",
              "stylers": [{ "color": "#161616" }]
            },
            
            // ONLY HIDE POI ICONS/MARKERS - KEEP EVERYTHING ELSE
            {
              "featureType": "poi",
              "elementType": "labels.icon",
              "stylers": [{ "visibility": "off" }]
            },
            {
              "featureType": "poi.business",
              "elementType": "all",
              "stylers": [{ "visibility": "off" }]
            },
            
            // PARKS - Dark theme with subtle green
            {
              "featureType": "poi.park",
              "elementType": "geometry",
              "stylers": [{ "color": "#1e3a1e" }]
            },
            {
              "featureType": "poi.park",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#4CAF50" }]
            },
            {
              "featureType": "poi.park",
              "elementType": "labels.icon",
              "stylers": [{ "visibility": "off" }]
            },
            
            // ROADS - Beautiful dark theme
            {
              "featureType": "road",
              "elementType": "geometry.fill",
              "stylers": [{ "color": "#2c2c2c" }]
            },
            {
              "featureType": "road",
              "elementType": "geometry.stroke",
              "stylers": [{ "color": "#3c3c3c" }]
            },
            {
              "featureType": "road",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#8a8a8a" }]
            },
            {
              "featureType": "road.highway",
              "elementType": "geometry",
              "stylers": [{ "color": "#3c3c3c" }]
            },
            {
              "featureType": "road.highway",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#f3d19c" }]
            },
            
            // WATER - Beautiful dark blue
            {
              "featureType": "water",
              "elementType": "geometry",
              "stylers": [{ "color": "#17263c" }]
            },
            {
              "featureType": "water",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#515c6d" }]
            }
          ],
          
          // Gestures
          gestureHandling: 'greedy',
          disableDoubleClickZoom: false,
          draggable: true,
          scrollwheel: true,
          
          // CRITICAL: Disable Google's default markers
          disableDefaultUI: false,
          clickableIcons: false
        };

        try {
          googleMapRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
          console.log('✅ WWDC-style Google Map instance created successfully');
          
        } catch (mapCreationError) {
          console.error('❌ Failed to create Google Map instance:', mapCreationError);
          setMapError('Error creating map instance');
          return;
        }

        // Add map event listeners
        googleMapRef.current.addListener('dragstart', () => {
          isUserDraggingRef.current = true;
          if (hasInitialLoad) {
            setIsMapUpdating(true);
            loaderStartTimeRef.current = Date.now(); // Track start time
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

        const tilesLoadedPromise = new Promise((resolve) => {
          const listener = googleMapRef.current.addListener('tilesloaded', () => {
            window.google.maps.event.removeListener(listener);
            resolve();
          });
          setTimeout(resolve, 2000);
        });

        await tilesLoadedPromise;

        console.log('✅ WWDC-style Google Map loaded successfully');
        
        setMapLoaded(true);
        setMapError(null);
        setMapInitialized(true);
        setLoadingProgress(100);
        
        lastSearchLocationRef.current = { lat: center.lat, lng: center.lng };

      } catch (error) {
        console.error('❌ Failed to initialize WWDC-style Google Map:', error);
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
        (Math.abs(currentCenter?.lat() - newCenter.lat) > 0.01 || 
         Math.abs(currentCenter?.lng() - newCenter.lng) > 0.01);
      
      if (isExternalChange) {
        console.log('🗺️ Updating map center from props:', newCenter);
        googleMapRef.current.setCenter(newCenter);
        lastSearchLocationRef.current = newCenter;
        
        if (Math.abs(currentZoom - zoom) > 1) {
          console.log('🗺️ Updating map zoom:', zoom);
          googleMapRef.current.setZoom(zoom);
        }
      }
    }
  }, [center.lat, center.lng, zoom, mapLoaded, mapInitialized]);

  // ENHANCED: WWDC-style blue pulsing user location marker
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    console.log('🎯 Creating WWDC-style user location marker:', {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      accuracy: userLocation.accuracy,
      source: userLocation.source
    });

    const userLocationSVG = `
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="wwdcShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,122,255,0.4)"/>
          </filter>
          <radialGradient id="wwdcOuterPulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:rgba(0,122,255,0.4);stop-opacity:1" />
            <stop offset="70%" style="stop-color:rgba(88,86,214,0.2);stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgba(175,82,222,0);stop-opacity:0" />
          </radialGradient>
          <linearGradient id="wwdcInnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#007AFF;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#5856D6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#AF52DE;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <circle cx="24" cy="24" r="22" fill="url(#wwdcOuterPulse)" opacity="0.6">
          <animate attributeName="r" values="18;28;18" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite"/>
        </circle>
        
        <circle cx="24" cy="24" r="14" fill="rgba(0,122,255,0.3)" opacity="0.8">
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        
        <circle cx="24" cy="24" r="10" fill="url(#wwdcInnerGradient)" filter="url(#wwdcShadow)">
          <animate attributeName="r" values="8;11;8" dur="1s" repeatCount="indefinite"/>
        </circle>
        
        <circle cx="24" cy="24" r="4" fill="white" opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.6;0.9" dur="1s" repeatCount="indefinite"/>
        </circle>
        
        ${userLocation.accuracy < 100 ? `
          <circle cx="24" cy="24" r="19" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-dasharray="2,2">
            <animateTransform attributeName="transform" type="rotate" values="0 24 24;360 24 24" dur="4s" repeatCount="indefinite"/>
          </circle>
        ` : ''}
      </svg>
    `;

    const userMarker = new window.google.maps.Marker({
      position: { 
        lat: userLocation.latitude, 
        lng: userLocation.longitude 
      },
      map: googleMapRef.current,
      title: `📍 Your location (±${Math.round(userLocation.accuracy || 0)}m accuracy) - ${userLocation.source}`,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(userLocationSVG),
        scaledSize: new window.google.maps.Size(48, 48),
        anchor: new window.google.maps.Point(24, 24)
      },
      zIndex: 10000,
      optimized: false
    });

    userMarkerRef.current = userMarker;

    console.log('🎯 WWDC-style blue pulsing user location marker updated');
  }, [userLocation, mapLoaded, locationLoading]);

  // Update search radius circle
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded || !userLocation || !searchRadius) return;

    if (radiusCircleRef.current) {
      radiusCircleRef.current.setMap(null);
    }

    if (userLocation.accuracy && userLocation.accuracy < 1000) {
      const circle = new window.google.maps.Circle({
        center: { 
          lat: userLocation.latitude, 
          lng: userLocation.longitude 
        },
        radius: searchRadius,
        map: googleMapRef.current,
        fillColor: '#007AFF',
        fillOpacity: 0.1,
        strokeColor: '#5856D6',
        strokeOpacity: 0.4,
        strokeWeight: 2,
        clickable: false
      });

      radiusCircleRef.current = circle;
      console.log('🔍 WWDC-style search radius circle updated:', searchRadius);
    }
  }, [userLocation, searchRadius, mapLoaded]);

  // CRITICAL FIX: Perfect venue filtering with beautiful markers
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;

    console.log('☕ PERFECT FILTERING - Starting marker update:', {
      totalCafes: cafes.length,
      selectedType: cafeType,
      currentFilter: currentFilterRef.current,
      mapReady: mapLoaded
    });

    // 🚨 CRITICAL: Update current filter reference
    currentFilterRef.current = cafeType;

    // 🧹 STEP 1: COMPLETELY CLEAR ALL EXISTING MARKERS
    console.log('🧹 PERFECT CLEAR - Removing all existing markers...');
    markersRef.current.forEach((marker, markerId) => {
      marker.setMap(null);
      marker = null;
    });
    markersRef.current.clear();
    console.log('✅ PERFECT CLEAR - All previous markers removed');

    // 🔄 STEP 2: SHOW BEAUTIFUL LOADING ANIMATION
    setMarkersLoading(true);
    setMarkersLoaded(false);
    loaderStartTimeRef.current = Date.now(); // Track loader start time

    // LONGER delay for forceful API completion
    setTimeout(() => {
      // 🎯 STEP 3: PERFECT FILTERING - Only show selected type
      const perfectlyFilteredCafes = cafes.filter(cafe => {
        const cafeType_normalized = (cafe.type || cafe.placeType || '').toLowerCase();
        const selectedType_normalized = currentFilterRef.current.toLowerCase();
        
        const isExactMatch = cafeType_normalized === selectedType_normalized;
        
        console.log('🎯 PERFECT FILTER CHECK:', {
          name: cafe.name,
          cafeType: cafeType_normalized,
          selectedType: selectedType_normalized,
          exactMatch: isExactMatch
        });
        
        return isExactMatch;
      });

      console.log(`🎯 PERFECT FILTERING RESULT: ${perfectlyFilteredCafes.length}/${cafes.length} places match "${currentFilterRef.current}"`);

      // If no places match, complete loading immediately
      if (perfectlyFilteredCafes.length === 0) {
        console.log('📍 PERFECT FILTER - No places match current filter, showing empty map');
        setMarkersLoading(false);
        setMarkersLoaded(true);
        return;
      }

      // 🎨 STEP 4: CREATE BEAUTIFUL MARKERS FOR FILTERED PLACES ONLY
      const bounds = new window.google.maps.LatLngBounds();
      let markersAdded = 0;
      
      // Process markers in batches for smooth animation
      const processBatch = (startIndex) => {
        const batchSize = 2; // Smaller batches for forceful completion
        const endIndex = Math.min(startIndex + batchSize, perfectlyFilteredCafes.length);
        
        for (let i = startIndex; i < endIndex; i++) {
          const cafe = perfectlyFilteredCafes[i];
          
          if (!cafe.location || !cafe.location.latitude || !cafe.location.longitude) {
            console.warn('⚠️ PERFECT FILTER - Skipping cafe with invalid location:', cafe.name);
            continue;
          }

          const position = {
            lat: cafe.location.latitude,
            lng: cafe.location.longitude
          };

          // 🎨 BEAUTIFUL ENHANCED MARKER with perfect type matching
          const markerSVG = createPerfectMarkerSVG(cafe, i, currentFilterRef.current);

          const marker = new window.google.maps.Marker({
            position: position,
            map: googleMapRef.current,
            title: `${getPerfectVenueEmoji(cafe)} ${cafe.name}${cafe.rating ? ` (${cafe.rating}⭐)` : ''}${cafe.distance ? ` - ${cafe.formattedDistance}` : ''}`,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerSVG),
              scaledSize: new window.google.maps.Size(42, 52), // Larger, more beautiful markers
              anchor: new window.google.maps.Point(21, 52)
            },
            zIndex: cafe.distance ? Math.round(1000 - cafe.distance / 10) : 500,
            animation: cafe.distance && cafe.distance < 200 ? 
              window.google.maps.Animation.DROP : null,
            optimized: false
          });

          // Add click listener
          marker.addListener('click', () => {
            if (onCafeSelect) {
              onCafeSelect(cafe);
            }
          });

          bounds.extend(position);
          markersRef.current.set(cafe.id || cafe.googlePlaceId, marker);
          markersAdded++;
          
          console.log(`✅ PERFECT MARKER ADDED: ${currentFilterRef.current} - ${cafe.name}`);
        }

        // Continue with next batch or finish
        if (endIndex < perfectlyFilteredCafes.length) {
          // LONGER delay between batches for forceful completion
          setTimeout(() => processBatch(endIndex), 400); // Increased from 200ms
        } else {
          // All markers processed - FORCEFUL completion
          console.log(`🎉 PERFECT FILTERING COMPLETE: ${markersAdded} ${currentFilterRef.current} markers added`);
          
          // LONGER completion delay for forceful API
          setTimeout(() => {
            setMarkersLoading(false);
            setMarkersLoaded(true);
            console.log('✨ FORCEFUL API COMPLETION - Perfect filtering finished');
          }, 800); // Additional delay for forceful completion
        }
      };

      // Start processing markers
      processBatch(0);

    }, 1000); // LONGER initial delay for forceful API completion

  }, [cafes, mapLoaded, onCafeSelect, cafeType]); // Keep cafeType dependency for filtering

  // 🎨 CREATE PERFECT BEAUTIFUL MARKER SVG
  const createPerfectMarkerSVG = (cafe, index, selectedType) => {
    // Perfect type-specific colors
    const getPerfectTypeColors = (type) => {
      switch (type) {
        case 'restaurant':
          return {
            primary: '#EF4444',
            secondary: '#DC2626',
            accent: '#FEE2E2',
            shadow: 'rgba(239, 68, 68, 0.4)'
          };
        case 'cafe':
        default:
          return {
            primary: '#F97316',
            secondary: '#EA580C', 
            accent: '#FED7AA',
            shadow: 'rgba(249, 115, 22, 0.4)'
          };
      }
    };

    const colors = getPerfectTypeColors(selectedType);
    const emoji = getPerfectVenueEmoji(cafe);
    
    return `
      <svg width="42" height="52" viewBox="0 0 42 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="perfectFilter${index}" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="${colors.shadow}"/>
          </filter>
          <linearGradient id="perfectGradient${index}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
            <stop offset="50%" style="stop-color:${colors.secondary};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colors.primary};stop-opacity:1" />
          </linearGradient>
          <radialGradient id="perfectPulse${index}" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:0.4" />
            <stop offset="100%" style="stop-color:${colors.primary};stop-opacity:0" />
          </radialGradient>
        </defs>
        
        <!-- Pulsing ring for very close venues -->
        ${cafe.distance && cafe.distance < 200 ? `
          <circle cx="21" cy="21" r="25" fill="url(#perfectPulse${index})">
            <animate attributeName="r" values="18;30;18" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite"/>
          </circle>
        ` : ''}
        
        <!-- Pin shadow -->
        <ellipse cx="21" cy="48" rx="15" ry="5" fill="rgba(0,0,0,0.3)"/>
        
        <!-- Main pin shape with perfect gradient -->
        <path d="M21 0C9.954 0 1 8.954 1 20C1 32 21 52 21 52S41 32 41 20C41 8.954 32.046 0 21 0Z" 
              fill="url(#perfectGradient${index})" 
              filter="url(#perfectFilter${index})"
              stroke="rgba(255,255,255,0.3)" 
              stroke-width="1"/>
        
        <!-- Inner circle with glassmorphism -->
        <circle cx="21" cy="20" r="15" fill="rgba(255,255,255,0.2)" 
                stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
        
        <!-- Venue emoji -->
        <text x="21" y="26" text-anchor="middle" font-size="18" fill="white" font-weight="700">
          ${emoji}
        </text>
        
        <!-- Rating badge for high-rated venues -->
        ${cafe.rating && cafe.rating >= 4.5 ? `
          <circle cx="33" cy="8" r="8" fill="${colors.primary}" stroke="white" stroke-width="2"/>
          <text x="33" y="12" text-anchor="middle" font-size="10" fill="white" font-weight="bold">★</text>
        ` : ''}
        
        <!-- Distance indicator for very close venues -->
        ${cafe.distance && cafe.distance < 100 ? `
          <circle cx="9" cy="8" r="6" fill="rgba(0,255,136,0.9)" stroke="white" stroke-width="1.5"/>
          <text x="9" y="11" text-anchor="middle" font-size="8" fill="white" font-weight="bold">!</text>
        ` : ''}
      </svg>
    `;
  };

  // PERFECT emoji mapping for exact venue types
  const getPerfectVenueEmoji = (cafe) => {
    const venueType = (cafe.type || cafe.placeType || '').toLowerCase();
    
    if (venueType === 'restaurant') {
      return '🍽️'; // Always restaurant emoji for restaurants
    }
    
    // Everything else gets coffee emoji (includes cafes and bars)
    return '☕';
  };

  // Comprehensive cleanup
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (immediateSearchTimeoutRef.current) {
        clearTimeout(immediateSearchTimeoutRef.current);
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

  // Determine the error message to show
  const errorMessage = mapError || googleMapsError;

  if (errorMessage) {
    return (
      <div className="map-error-container">
        <div className="map-error-content">
          <div className="error-icon">🗺️❌</div>
          <h3>Google Maps Error</h3>
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
    <div className="full-page-map">
      {/* Initial Loading Screen - Only for first map load */}
      {(!hasInitialLoad && (!mapLoaded || !googleMapsReady || loading)) && (
        <LoadingScreen 
          message="Caricamento mappa..."
          subMessage="Preparazione dell'esperienza"
          progress={loadingProgress}
        />
      )}

      {/* ENHANCED Map Update Loader with longer display for forceful API completion */}
      {(isMapUpdating || (hasInitialLoad && loading)) && (
        <MapUpdateLoader
          loading={isMapUpdating || (hasInitialLoad && loading)}
          searchType={cafeType}
          forcefulMode={true} // Enable forceful mode for longer display
        />
      )}

      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="map-canvas"
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
          }).length} // Show filtered count
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

      {/* Cafe Popup */}
      {selectedCafe && mapLoaded && (
        <CafePopup
          cafe={selectedCafe}
          onClose={onClosePopup}
          userLocation={userLocation}
        />
      )}

      {/* Error Message */}
      {error && (
        <div className="map-error-toast">
          <span>❌ {error.message || 'Error loading data'}</span>
          <button onClick={onRefresh}>Retry</button>
        </div>
      )}
    </div>
  );
};

export default FullPageMap;