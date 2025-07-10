// components/FullPageMap.js - FIXED VERSION - All Errors Resolved
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

  // Fast loading progress simulation
  useEffect(() => {
    if (!mapLoaded && googleMapsReady && !hasInitialLoad) {
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          const newProgress = prev + Math.random() * 20; // Faster progress
          if (newProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return newProgress;
        });
      }, 150); // Faster updates
      
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
      // Check if already loaded
      if (window.google && window.google.maps && window.google.maps.Map) {
        console.log('✅ Google Maps already available');
        setGoogleMapsReady(true);
        resolve(true);
        return;
      }

      // Listen for the custom event from index.html
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

      // Add event listeners
      window.addEventListener('googleMapsLoaded', handleGoogleMapsLoaded);
      window.addEventListener('googleMapsError', handleGoogleMapsError);

      // Set timeout for loading
      const timeoutId = setTimeout(() => {
        console.error('❌ Google Maps loading timeout after 15 seconds');
        setGoogleMapsError('Google Maps failed to load within 15 seconds. Please check your internet connection and API key.');
        setGoogleMapsReady(false);
        resolve(false);
        cleanup();
      }, 15000);

      // Check periodically if Google Maps becomes available
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

      // Clean up interval after timeout
      setTimeout(() => {
        clearInterval(checkInterval);
      }, 15000);
    });
  }, []);

  // UPDATED: Much smaller trigger distance for more responsive updates
  const shouldTriggerNewSearch = useCallback((newCenter) => {
    if (!lastSearchLocationRef.current) {
      return true; // First search
    }

    const lastLocation = lastSearchLocationRef.current;
    
    // Calculate distance moved in meters
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lastLocation.lat * Math.PI / 180;
    const φ2 = newCenter.lat * Math.PI / 180;
    const Δφ = (newCenter.lat - lastLocation.lat) * Math.PI / 180;
    const Δλ = (newCenter.lng - lastLocation.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // ULTRA-FAST: Trigger on very small movements
    const ultraFastThreshold = Math.max(searchRadius * 0.05, 30); // Just 30 meters!
    const hasMovedSignificantly = distance > ultraFastThreshold;

    if (hasMovedSignificantly) {
      console.log(`🚀 ULTRA-FAST TRIGGER: Moved ${Math.round(distance)}m > ${Math.round(ultraFastThreshold)}m`);
    }

    return hasMovedSignificantly;
  }, [searchRadius]);

  // FIXED: Add the missing handleMapCenterChange function
  const handleMapCenterChange = useCallback((newCenter) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (immediateSearchTimeoutRef.current) {
      clearTimeout(immediateSearchTimeoutRef.current);
    }

    const shouldSearch = shouldTriggerNewSearch(newCenter);
    
    // LIGHTNING-FAST delays
    const delay = shouldSearch ? 200 : 400; // Super fast! Down from 800/1500

    console.log(`⚡ LIGHTNING search scheduled in ${delay}ms, shouldSearch: ${shouldSearch}`);

    debounceTimeoutRef.current = setTimeout(() => {
      if (!isUserDraggingRef.current && shouldSearch) {
        console.log('⚡ LIGHTNING-FAST search triggered!');
        lastSearchLocationRef.current = newCenter;
        
        if (onCenterChange) {
          onCenterChange(newCenter);
        }
      } else if (!shouldSearch) {
        // Quick hide if no search needed
        setTimeout(() => {
          setIsMapUpdating(false);
        }, 200);
      }
    }, delay);
  }, [onCenterChange, shouldTriggerNewSearch, hasInitialLoad]);

  // NEW: Real-time updates during drag for ultra-responsive feel
  const handleRealTimeDrag = useCallback((newCenter) => {
    // Update search immediately on significant movement during drag
    const shouldSearch = shouldTriggerNewSearch(newCenter);
    
    if (shouldSearch && isUserDraggingRef.current) {
      console.log('🔥 REAL-TIME drag update triggered!');
      
      // Cancel any pending searches
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Trigger search with minimal delay
      debounceTimeoutRef.current = setTimeout(() => {
        lastSearchLocationRef.current = newCenter;
        if (onCenterChange) {
          onCenterChange(newCenter);
        }
      }, 100); // Almost instant - just 100ms!
    }
  }, [shouldTriggerNewSearch, onCenterChange]);

  // UPDATED: Enhanced loading management with perfect timing
  useEffect(() => {
    if (!loading && !markersLoading && isMapUpdating) {
      // Show loader for minimum 2-3 seconds for smooth UX
      const minDisplayTime = 2500; // 2.5 seconds minimum
      const loaderStartTime = loaderStartTimeRef.current || Date.now();
      
      setTimeout(() => {
        const elapsedTime = Date.now() - loaderStartTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
        
        setTimeout(() => {
          setIsMapUpdating(false);
          console.log('✨ Beautiful loading animation completed');
        }, remainingTime);
      }, 300); // Small buffer for smooth transition
    }
  }, [loading, markersLoading, isMapUpdating]);

  // ENHANCED: Map initialization with light theme and POI hiding
  // ENHANCED: Map initialization with light theme and POI hiding (CORRECTED VERSION)
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
          
          // CORRECTED: Light theme with streets and roads visible, only hiding POI markers
          // UPDATED: Beautiful dark creative theme
          styles: [
            {
              "featureType": "all",
              "elementType": "geometry",
              "stylers": [{ "color": "#1a1a1a" }] // Rich dark background
            },
            {
              "featureType": "all",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#ffffff" }] // White text for contrast
            },
            {
              "featureType": "all",
              "elementType": "labels.text.stroke",
              "stylers": [{ "color": "#000000" }] // Black text stroke
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
              "featureType": "administrative",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#8a8a8a" }]
            },
            {
              "featureType": "landscape",
              "elementType": "geometry",
              "stylers": [{ "color": "#161616" }] // Very dark landscape
            },
            
            // ONLY HIDE POI ICONS/MARKERS - KEEP EVERYTHING ELSE
            {
              "featureType": "poi",
              "elementType": "labels.icon",
              "stylers": [{ "visibility": "off" }] // Hide POI icons only
            },
            {
              "featureType": "poi.business",
              "elementType": "all",
              "stylers": [{ "visibility": "off" }] // Hide business markers
            },
            {
              "featureType": "poi.attraction",
              "elementType": "labels.icon",
              "stylers": [{ "visibility": "off" }]
            },
            {
              "featureType": "poi.medical",
              "elementType": "labels.icon", 
              "stylers": [{ "visibility": "off" }]
            },
            {
              "featureType": "poi.place_of_worship",
              "elementType": "labels.icon",
              "stylers": [{ "visibility": "off" }]
            },
            {
              "featureType": "poi.school",
              "elementType": "labels.icon",
              "stylers": [{ "visibility": "off" }]
            },
            {
              "featureType": "poi.sports_complex",
              "elementType": "labels.icon",
              "stylers": [{ "visibility": "off" }]
            },
            
            // PARKS - Dark theme with subtle green
            {
              "featureType": "poi.park",
              "elementType": "geometry",
              "stylers": [{ "color": "#1e3a1e" }] // Dark green for parks
            },
            {
              "featureType": "poi.park",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#4CAF50" }] // Bright green text
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
              "stylers": [{ "color": "#2c2c2c" }] // Dark gray roads
            },
            {
              "featureType": "road",
              "elementType": "geometry.stroke",
              "stylers": [{ "color": "#3c3c3c" }] // Slightly lighter stroke
            },
            {
              "featureType": "road",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#8a8a8a" }] // Light gray road labels
            },
            {
              "featureType": "road.arterial",
              "elementType": "geometry",
              "stylers": [{ "color": "#373737" }] // Medium dark arterial roads
            },
            {
              "featureType": "road.highway",
              "elementType": "geometry",
              "stylers": [{ "color": "#3c3c3c" }] // Dark highways with subtle accent
            },
            {
              "featureType": "road.highway",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#f3d19c" }] // Golden highway labels
            },
            {
              "featureType": "road.local",
              "elementType": "geometry",
              "stylers": [{ "color": "#2a2a2a" }] // Very dark local roads
            },
            
            // TRANSIT - Dark with accent colors
            {
              "featureType": "transit.line",
              "elementType": "geometry",
              "stylers": [{ "color": "#2f3948" }] // Dark blue-gray transit lines
            },
            {
              "featureType": "transit.station",
              "elementType": "labels.icon",
              "stylers": [{ "visibility": "off" }]
            },
            {
              "featureType": "transit.station",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#515c6d" }] // Muted blue-gray station text
            },
            
            // WATER - Beautiful dark blue
            {
              "featureType": "water",
              "elementType": "geometry",
              "stylers": [{ "color": "#17263c" }] // Deep dark blue water
            },
            {
              "featureType": "water",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#515c6d" }] // Muted blue water labels
            },
            
            // CREATIVE ACCENTS - Adding some subtle color variety
            {
              "featureType": "administrative.country",
              "elementType": "geometry.stroke",
              "stylers": [{ "color": "#4a5568" }] // Subtle blue-gray borders
            },
            {
              "featureType": "administrative.locality",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#a0aec0" }] // Light blue-gray city labels
            }
          ],
          
          // Gestures
          gestureHandling: 'greedy',
          disableDoubleClickZoom: false,
          draggable: true,
          scrollwheel: true,
          
          // CRITICAL: Disable Google's default markers
          disableDefaultUI: false,
          clickableIcons: false // This disables POI markers
        };

        try {
          googleMapRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
          console.log('✅ WWDC-style Google Map instance created successfully');
          
          // 🚫 HIDE ONLY POI MARKERS - KEEP STREETS AND ROADS
          if (googleMapRef.current) {
            console.log('🚫 Hiding only POI markers, keeping streets visible...');
            
            // Only hide POI icons and business markers, not the entire map
            const stylesToHide = [
              {
                featureType: 'poi.business',
                elementType: 'all',
                stylers: [{ visibility: 'off' }]
              },
              {
                featureType: 'poi.place_of_worship',
                elementType: 'labels.icon',
                stylers: [{ visibility: 'off' }]
              },
              {
                featureType: 'poi.school',
                elementType: 'labels.icon',
                stylers: [{ visibility: 'off' }]
              },
              {
                featureType: 'poi.medical',
                elementType: 'labels.icon',
                stylers: [{ visibility: 'off' }]
              },
              {
                featureType: 'poi.government',
                elementType: 'labels.icon',
                stylers: [{ visibility: 'off' }]
              },
              {
                featureType: 'poi.attraction',
                elementType: 'labels.icon',
                stylers: [{ visibility: 'off' }]
              },
              {
                featureType: 'poi.sports_complex',
                elementType: 'labels.icon',
                stylers: [{ visibility: 'off' }]
              }
            ];
            
            // Apply the styles - this will keep roads and streets
            googleMapRef.current.setOptions({
              styles: [
                ...mapOptions.styles, // Your corrected light styles above
                ...stylesToHide // Only hide POI icons, not geography
              ]
            });
            
            console.log('✅ POI markers hidden, streets and roads remain visible');
          }
          
        } catch (mapCreationError) {
          console.error('❌ Failed to create Google Map instance:', mapCreationError);
          setMapError('Error creating map instance');
          return;
        }

        // Add map event listeners (drag, zoom, etc.)
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

        const tilesLoadedPromise = new Promise((resolve) => {
          const listener = googleMapRef.current.addListener('tilesloaded', () => {
            window.google.maps.event.removeListener(listener);
            resolve();
          });
          setTimeout(resolve, 2000); // Faster timeout
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

    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    console.log('🎯 Creating WWDC-style user location marker:', {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      accuracy: userLocation.accuracy,
      source: userLocation.source
    });

    // WWDC-style blue pulsing marker
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
        
        <!-- Outer pulsing ring -->
        <circle cx="24" cy="24" r="22" fill="url(#wwdcOuterPulse)" opacity="0.6">
          <animate attributeName="r" values="18;28;18" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite"/>
        </circle>
        
        <!-- Middle ring -->
        <circle cx="24" cy="24" r="14" fill="rgba(0,122,255,0.3)" opacity="0.8">
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        
        <!-- Main gradient dot -->
        <circle cx="24" cy="24" r="10" fill="url(#wwdcInnerGradient)" filter="url(#wwdcShadow)">
          <animate attributeName="r" values="8;11;8" dur="1s" repeatCount="indefinite"/>
        </circle>
        
        <!-- Inner white dot -->
        <circle cx="24" cy="24" r="4" fill="white" opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.6;0.9" dur="1s" repeatCount="indefinite"/>
        </circle>
        
        <!-- Accuracy ring -->
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

  // Update search radius circle with WWDC styling
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded || !userLocation || !searchRadius) return;

    // Remove existing circle
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setMap(null);
    }

    // Only show radius circle if user location is accurate
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

  // ENHANCED: WWDC-style venue markers with loading tracking
  // ENHANCED: WWDC-style venue markers with optimized clearing and type filtering
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;

    console.log('☕ Starting optimized marker update:', {
      totalCafes: cafes.length,
      selectedType: cafeType,
      mapReady: mapLoaded
    });

    // 🧹 STEP 1: COMPLETELY CLEAR ALL EXISTING MARKERS
    console.log('🧹 Clearing all existing markers...');
    markersRef.current.forEach((marker, markerId) => {
      marker.setMap(null); // Remove from map
      marker = null; // Clear reference
    });
    markersRef.current.clear(); // Clear the Map completely
    console.log('✅ All previous markers cleared');

    // 🔄 STEP 2: SHOW BEAUTIFUL LOADING ANIMATION
    setMarkersLoading(true);
    setMarkersLoaded(false);

    // Add a small delay for smooth UX
    setTimeout(() => {
      // 🎯 STEP 3: FILTER CAFES BY SELECTED TYPE ONLY
      const filteredCafes = cafes.filter(cafe => {
        const cafeType_normalized = (cafe.type || cafe.placeType || '').toLowerCase();
        const selectedType_normalized = cafeType.toLowerCase();
        
        console.log('🔍 Filtering cafe:', {
          name: cafe.name,
          cafeType: cafeType_normalized,
          selectedType: selectedType_normalized,
          matches: cafeType_normalized === selectedType_normalized
        });
        
        return cafeType_normalized === selectedType_normalized;
      });

      console.log(`🎯 Filtered results: ${filteredCafes.length}/${cafes.length} places match type "${cafeType}"`);

      // If no places match, mark as loaded immediately
      if (filteredCafes.length === 0) {
        console.log('📍 No places match current filter, showing empty map');
        setMarkersLoading(false);
        setMarkersLoaded(true);
        return;
      }

      // 🎨 STEP 4: CREATE NEW MARKERS FOR FILTERED PLACES ONLY
      const bounds = new window.google.maps.LatLngBounds();
      let markersAdded = 0;
      
      // Process markers in batches for smooth animation
      const processBatch = (startIndex) => {
        const batchSize = 3; // Smaller batches for smoother loading
        const endIndex = Math.min(startIndex + batchSize, filteredCafes.length);
        
        for (let i = startIndex; i < endIndex; i++) {
          const cafe = filteredCafes[i];
          
          if (!cafe.location || !cafe.location.latitude || !cafe.location.longitude) {
            console.warn('⚠️ Skipping cafe with invalid location:', cafe.name);
            continue;
          }

          const position = {
            lat: cafe.location.latitude,
            lng: cafe.location.longitude
          };

          // Enhanced marker with type-specific styling
          const markerSVG = createEnhancedMarkerSVG(cafe, i, cafeType);

          const marker = new window.google.maps.Marker({
            position: position,
            map: googleMapRef.current,
            title: `${getVenueEmoji(cafe)} ${cafe.name}${cafe.rating ? ` (${cafe.rating}⭐)` : ''}${cafe.distance ? ` - ${cafe.formattedDistance}` : ''}`,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerSVG),
              scaledSize: new window.google.maps.Size(36, 44),
              anchor: new window.google.maps.Point(18, 44)
            },
            zIndex: cafe.distance ? Math.round(1000 - cafe.distance / 10) : 500,
            animation: cafe.distance && cafe.distance < 200 ? 
              window.google.maps.Animation.DROP : null, // Smooth drop animation
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
          
          console.log(`✅ Added ${cafeType} marker: ${cafe.name}`);
        }

        // Continue with next batch or finish
        if (endIndex < filteredCafes.length) {
          // Process next batch with smooth delay
          setTimeout(() => processBatch(endIndex), 200); // 200ms between batches
        } else {
          // All markers processed
          console.log(`🎉 Marker update complete: ${markersAdded} ${cafeType} markers added`);
          setMarkersLoading(false);
          setMarkersLoaded(true);
        }
      };

      // Start processing markers
      processBatch(0);

    }, 500); // 500ms delay for smooth UX

  }, [cafes, mapLoaded, onCafeSelect, cafeType]); // Added cafeType dependency for filtering

  // FIXED: Proper color coding - Orange for cafe/bar, Red for restaurant
  const getWWDCVenueColor = (cafe) => {
    // FIXED: All cafes and bars get orange, restaurants get red
    if (cafe.type === 'restaurant' || cafe.placeType === 'restaurant') {
      return '#EF4444'; // Red for restaurants
    }
    
    // Everything else (cafe, bar, etc.) gets orange
    return '#F97316'; // Orange for cafes/bars
  };
  // 🎨 CREATE ENHANCED MARKER SVG WITH TYPE-SPECIFIC STYLING
const createEnhancedMarkerSVG = (cafe, index, selectedType) => {
  // Type-specific colors
  const getTypeColors = (type) => {
    switch (type) {
      case 'restaurant':
        return {
          primary: '#EF4444',
          secondary: '#DC2626',
          accent: '#FEE2E2'
        };
      case 'cafe':
      default:
        return {
          primary: '#F97316',
          secondary: '#EA580C', 
          accent: '#FED7AA'
        };
    }
  };

  const colors = getTypeColors(selectedType);
  const emoji = getVenueEmoji(cafe);
  
  return `
    <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="wwdcVenueFilter${index}" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="rgba(0,0,0,0.4)"/>
        </filter>
        <linearGradient id="wwdcVenueGradient${index}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
        </linearGradient>
        <radialGradient id="pulseGradient${index}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:${colors.primary};stop-opacity:0" />
        </radialGradient>
      </defs>
      
      <!-- Pulsing ring for very close venues -->
      ${cafe.distance && cafe.distance < 200 ? `
        <circle cx="18" cy="18" r="20" fill="url(#pulseGradient${index})">
          <animate attributeName="r" values="15;25;15" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite"/>
        </circle>
      ` : ''}
      
      <!-- Pin shadow -->
      <ellipse cx="18" cy="41" rx="12" ry="4" fill="rgba(0,0,0,0.3)"/>
      
      <!-- Main pin shape with enhanced gradient -->
      <path d="M18 0C8.059 0 0 8.059 0 18C0 28 18 44 18 44S36 28 36 18C36 8.059 27.941 0 18 0Z" 
            fill="url(#wwdcVenueGradient${index})" 
            filter="url(#wwdcVenueFilter${index})"/>
      
      <!-- Inner circle with glassmorphism -->
      <circle cx="18" cy="18" r="13" fill="rgba(255,255,255,0.2)" 
              stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
      
      <!-- Venue emoji -->
      <text x="18" y="23" text-anchor="middle" font-size="16" fill="white" font-weight="600">
        ${emoji}
      </text>
      
      <!-- Rating badge for high-rated venues -->
      ${cafe.rating && cafe.rating >= 4.5 ? `
        <circle cx="28" cy="8" r="7" fill="${colors.primary}" stroke="white" stroke-width="2"/>
        <text x="28" y="11" text-anchor="middle" font-size="9" fill="white" font-weight="bold">★</text>
      ` : ''}
    </svg>
  `;
};

  const getWWDCVenueColorSecondary = (cafe) => {
    // FIXED: Matching secondary colors
    if (cafe.type === 'restaurant' || cafe.placeType === 'restaurant') {
      return '#DC2626'; // Darker red
    }
    
    return '#EA580C'; // Darker orange
  };

  // FIXED: Consistent emoji mapping regardless of Google's classification
  const getVenueEmoji = (cafe) => {
    // FIXED: Base it on OUR type classification, not name analysis
    if (cafe.type === 'restaurant' || cafe.placeType === 'restaurant') {
      return '🍽️'; // All restaurants get this
    }
    
    // All cafes/bars get coffee emoji (includes bars from Google)
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
    setHasInitialLoad(false); // Reset initial load state
    
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

      {(isMapUpdating || (hasInitialLoad && loading)) && (
        <MapUpdateLoader
          loading={isMapUpdating || (hasInitialLoad && loading)}
          searchType={cafeType}
        />
      )}

      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="map-canvas"
        style={{ 
          width: '100%', 
          height: '100%',
          backgroundColor: '#1a1a1a', // UPDATED: Dark background to match
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
          cafesCount={cafes.length}
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