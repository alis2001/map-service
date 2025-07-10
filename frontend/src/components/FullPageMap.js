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
  const activeMarkersRef = useRef(new Set()); // Track currently displayed markers

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
    const delay = shouldSearch ? 1200 : 1800; // Increased delays for forceful API

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
      const minDisplayTime = 6000; // Increased to 6 seconds for forceful completion
      const loaderStartTime = loaderStartTimeRef.current || Date.now();
      
      setTimeout(() => {
        const elapsedTime = Date.now() - loaderStartTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
        
        setTimeout(() => {
          setIsMapUpdating(false);
          console.log('✨ FORCEFUL API completion - Beautiful loading finished');
        }, remainingTime);
      }, 800); // Increased buffer for smooth transition
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

  // CRITICAL FIX: Perfect venue filtering with beautiful markers - COMPLETELY REWRITTEN
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;

    console.log('☕ PERFECT FILTERING - Starting marker update:', {
      totalCafes: cafes.length,
      selectedType: cafeType,
      currentFilter: currentFilterRef.current,
      mapReady: mapLoaded
    });

    // 🚨 CRITICAL: Update current filter reference IMMEDIATELY
    currentFilterRef.current = cafeType;

    // 🧹 STEP 1: COMPLETELY CLEAR ALL EXISTING MARKERS - AGGRESSIVE CLEARING
    console.log('🧹 AGGRESSIVE CLEAR - Removing all existing markers...');
    markersRef.current.forEach((marker, markerId) => {
      try {
        marker.setMap(null);
        if (marker.removeListener) {
          marker.removeListener();
        }
      } catch (e) {
        console.warn('Error removing marker:', e);
      }
    });
    markersRef.current.clear();
    activeMarkersRef.current.clear();
    console.log('✅ AGGRESSIVE CLEAR - All previous markers destroyed');

    // 🔄 STEP 2: SHOW BEAUTIFUL LOADING ANIMATION FOR LONGER
    setMarkersLoading(true);
    setMarkersLoaded(false);
    loaderStartTimeRef.current = Date.now();

    // MUCH LONGER delay for ultra-forceful API completion
    setTimeout(() => {
      // 🎯 STEP 3: PERFECT FILTERING - ULTRA STRICT TYPE MATCHING
      console.log(`🎯 ULTRA-STRICT FILTERING for type: "${currentFilterRef.current}"`);
      
      const perfectlyFilteredCafes = cafes.filter(cafe => {
        const cafeType_raw = cafe.type || cafe.placeType || '';
        const cafeType_normalized = cafeType_raw.toLowerCase().trim();
        const selectedType_normalized = currentFilterRef.current.toLowerCase().trim();
        
        // ULTRA-STRICT EXACT MATCHING ONLY
        const isExactMatch = cafeType_normalized === selectedType_normalized;
        
        console.log('🎯 ULTRA-STRICT FILTER:', {
          name: cafe.name,
          cafeType: cafeType_normalized,
          selectedType: selectedType_normalized,
          exactMatch: isExactMatch,
          ACCEPTED: isExactMatch ? '✅' : '❌'
        });
        
        return isExactMatch;
      });

      console.log(`🎯 ULTRA-STRICT FILTERING RESULT: ${perfectlyFilteredCafes.length}/${cafes.length} places exactly match "${currentFilterRef.current}"`);

      // If no places match, complete loading immediately
      if (perfectlyFilteredCafes.length === 0) {
        console.log('📍 NO EXACT MATCHES - Showing empty map');
        setMarkersLoading(false);
        setMarkersLoaded(true);
        return;
      }

      // 🎨 STEP 4: CREATE ULTRA-BEAUTIFUL MARKERS FOR EXACT MATCHES ONLY
      console.log('🎨 CREATING ULTRA-BEAUTIFUL MARKERS...');
      let markersAdded = 0;
      
      // Process markers in smaller batches for ultra-smooth animation
      const processBatch = (startIndex) => {
        const batchSize = 1; // ONE marker at a time for smoothest animation
        const endIndex = Math.min(startIndex + batchSize, perfectlyFilteredCafes.length);
        
        for (let i = startIndex; i < endIndex; i++) {
          const cafe = perfectlyFilteredCafes[i];
          
          if (!cafe.location || !cafe.location.latitude || !cafe.location.longitude) {
            console.warn('⚠️ SKIPPING - Invalid location:', cafe.name);
            continue;
          }

          const position = {
            lat: cafe.location.latitude,
            lng: cafe.location.longitude
          };

          // 🎨 ULTRA-BEAUTIFUL ENHANCED MARKER
          const markerSVG = createUltraBeautifulMarker(cafe, i, currentFilterRef.current);

          console.log(`🎨 CREATING ULTRA-BEAUTIFUL MARKER ${i + 1}/${perfectlyFilteredCafes.length}: ${cafe.name} (${currentFilterRef.current})`);

          const marker = new window.google.maps.Marker({
            position: position,
            map: googleMapRef.current,
            title: `${getUltraBeautifulEmoji(cafe)} ${cafe.name}${cafe.rating ? ` (${cafe.rating}⭐)` : ''}${cafe.distance ? ` - ${cafe.formattedDistance}` : ''}`,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerSVG),
              scaledSize: new window.google.maps.Size(50, 62), // Larger, more beautiful markers
              anchor: new window.google.maps.Point(25, 62),
              optimized: false // Force high quality rendering
            },
            zIndex: cafe.distance ? Math.round(2000 - cafe.distance / 10) : 1000,
            animation: cafe.distance && cafe.distance < 200 ? 
              window.google.maps.Animation.DROP : 
              window.google.maps.Animation.BOUNCE,
            optimized: false // Force beautiful rendering
          });

          // Add click listener
          marker.addListener('click', () => {
            if (onCafeSelect) {
              onCafeSelect(cafe);
            }
          });

          // Track marker for type consistency
          const markerId = cafe.id || cafe.googlePlaceId;
          markersRef.current.set(markerId, marker);
          activeMarkersRef.current.add(`${markerId}:${currentFilterRef.current}`);
          markersAdded++;
          
          console.log(`✅ ULTRA-BEAUTIFUL MARKER ADDED: ${currentFilterRef.current} - ${cafe.name}`);
        }

        // Continue with next batch or finish
        if (endIndex < perfectlyFilteredCafes.length) {
          // LONGER delay between batches for ultra-forceful completion
          setTimeout(() => processBatch(endIndex), 600); // Smooth one-by-one rendering
        } else {
          // All markers processed - ULTRA-FORCEFUL completion
          console.log(`🎉 ULTRA-STRICT FILTERING COMPLETE: ${markersAdded} ${currentFilterRef.current} markers added`);
          
          // ULTRA-LONG completion delay for maximum quality
          setTimeout(() => {
            setMarkersLoading(false);
            setMarkersLoaded(true);
            console.log('✨ ULTRA-FORCEFUL API COMPLETION - Perfect filtering finished');
          }, 1200); // Ultra-long delay for forceful completion
        }
      };

      // Start processing markers
      processBatch(0);

    }, 1500); // ULTRA-LONG initial delay for maximum forceful API completion

  }, [cafes, mapLoaded, onCafeSelect, cafeType]); // Keep cafeType dependency for filtering

  // 🎨 CREATE ULTRA-BEAUTIFUL MARKER SVG
  const createUltraBeautifulMarker = (cafe, index, selectedType) => {
    // Ultra-beautiful type-specific colors
    const getUltraBeautifulColors = (type) => {
      switch (type) {
        case 'restaurant':
          return {
            primary: '#EF4444',
            secondary: '#DC2626',
            accent: '#FEE2E2',
            glow: '#FF6B6B',
            shadow: 'rgba(239, 68, 68, 0.5)'
          };
        case 'cafe':
        default:
          return {
            primary: '#F97316',
            secondary: '#EA580C', 
            accent: '#FED7AA',
            glow: '#FFB347',
            shadow: 'rgba(249, 115, 22, 0.5)'
          };
      }
    };

    const colors = getUltraBeautifulColors(selectedType);
    const emoji = getUltraBeautifulEmoji(cafe);
    
    return `
      <svg width="50" height="62" viewBox="0 0 50 62" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="ultraFilter${index}" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="${colors.shadow}"/>
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          </filter>
          <linearGradient id="ultraGradient${index}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
            <stop offset="30%" style="stop-color:${colors.glow};stop-opacity:1" />
            <stop offset="70%" style="stop-color:${colors.secondary};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colors.primary};stop-opacity:1" />
          </linearGradient>
          <radialGradient id="ultraPulse${index}" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:0.6" />
            <stop offset="100%" style="stop-color:${colors.primary};stop-opacity:0" />
          </radialGradient>
          <linearGradient id="ultraInner${index}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:rgba(255,255,255,0.4);stop-opacity:1" />
            <stop offset="50%" style="stop-color:rgba(255,255,255,0.1);stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgba(255,255,255,0.3);stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Ultra-beautiful pulsing ring for very close venues -->
        ${cafe.distance && cafe.distance < 200 ? `
          <circle cx="25" cy="25" r="30" fill="url(#ultraPulse${index})">
            <animate attributeName="r" values="20;35;20" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite"/>
          </circle>
        ` : ''}
        
        <!-- Ultra-soft pin shadow -->
        <ellipse cx="25" cy="58" rx="18" ry="6" fill="rgba(0,0,0,0.2)" opacity="0.7"/>
        
        <!-- Main ultra-beautiful pin shape -->
        <path d="M25 2C13.954 2 5 10.954 5 22C5 36 25 60 25 60S45 36 45 22C45 10.954 36.046 2 25 2Z" 
              fill="url(#ultraGradient${index})" 
              filter="url(#ultraFilter${index})"
              stroke="rgba(255,255,255,0.4)" 
              stroke-width="2"/>
        
        <!-- Ultra-beautiful inner glassmorphism circle -->
        <circle cx="25" cy="22" r="16" fill="url(#ultraInner${index})" 
                stroke="rgba(255,255,255,0.6)" stroke-width="2"/>
        
        <!-- Ultra-sharp emoji -->
        <text x="25" y="28" text-anchor="middle" font-size="20" fill="white" 
              font-weight="900" style="text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
          ${emoji}
        </text>
        
        <!-- Ultra-beautiful rating badge for high-rated venues -->
        ${cafe.rating && cafe.rating >= 4.5 ? `
          <circle cx="38" cy="9" r="9" fill="${colors.primary}" stroke="white" stroke-width="2" filter="url(#ultraFilter${index})"/>
          <text x="38" y="13" text-anchor="middle" font-size="11" fill="white" font-weight="bold">★</text>
        ` : ''}
        
        <!-- Ultra-beautiful distance indicator for very close venues -->
        ${cafe.distance && cafe.distance < 100 ? `
          <circle cx="12" cy="9" r="7" fill="rgba(0,255,136,0.95)" stroke="white" stroke-width="2"/>
          <text x="12" y="13" text-anchor="middle" font-size="9" fill="white" font-weight="bold">!</text>
        ` : ''}
        
        <!-- Ultra-beautiful quality indicator -->
        <circle cx="25" cy="22" r="2" fill="rgba(255,255,255,0.9)" opacity="0.8">
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.5s" repeatCount="indefinite"/>
        </circle>
      </svg>
    `;
  };

  // ULTRA-BEAUTIFUL emoji mapping for exact venue types
  const getUltraBeautifulEmoji = (cafe) => {
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

      {/* ENHANCED Map Update Loader with ultra-long display for forceful API completion */}
      {(isMapUpdating || (hasInitialLoad && loading)) && (
        <MapUpdateLoader
          loading={isMapUpdating || (hasInitialLoad && loading)}
          searchType={cafeType}
          forcefulMode={true} // Enable ultra-forceful mode for maximum display time
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
          }).length} // Show ultra-strict filtered count
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