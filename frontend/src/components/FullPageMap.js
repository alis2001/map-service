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
  locationCapability
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

  // UPDATED: Shorter minimum display time for faster feel
  useEffect(() => {
    if (!loading && !markersLoading && isMapUpdating) {
      // Shorter minimum display time - just 800ms
      const minDisplayTime = 800; // Reduced from 1500ms
      const loaderStartTime = loaderStartTimeRef.current || Date.now();
      
      setTimeout(() => {
        const elapsedTime = Date.now() - loaderStartTime;
        const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
        
        setTimeout(() => {
          setIsMapUpdating(false);
          console.log('⚡ Map update completed - FAST hide');
        }, remainingTime);
      }, 100); // Quicker completion check
    }
  }, [loading, markersLoading, isMapUpdating]);

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
          
          // Dark elegant map style
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
                { "weight": 0.6 }
              ]
            },
            {
              "featureType": "landscape",
              "elementType": "geometry",
              "stylers": [{ "color": "#161616" }]
            },
            {
              "featureType": "poi",
              "elementType": "geometry",
              "stylers": [{ "color": "#2a2a2a" }]
            },
            {
              "featureType": "poi",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#8a8a8a" }]
            },
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
              "featureType": "road.highway",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#f3d19c" }]
            },
            {
              "featureType": "transit",
              "elementType": "geometry",
              "stylers": [{ "color": "#2f3948" }]
            },
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
          
          disableDefaultUI: false,
          clickableIcons: true
        };

        try {
          googleMapRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
          console.log('✅ WWDC-style Google Map instance created successfully');
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
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;

    console.log('☕ Updating WWDC-style venue markers:', cafes.length);

    // Start markers loading
    setMarkersLoading(true);
    setMarkersLoaded(false);

    // Clear existing markers efficiently
    markersRef.current.forEach(marker => {
      marker.setMap(null);
    });
    markersRef.current.clear();

    // If no cafes, mark as loaded immediately
    if (cafes.length === 0) {
      setMarkersLoading(false);
      setMarkersLoaded(true);
      return;
    }

    // Create new markers for venues
    const bounds = new window.google.maps.LatLngBounds();
    let markersAdded = 0;
    
    // Process markers in batches for better performance
    const processBatch = (startIndex) => {
      const batchSize = 5; // Process 5 markers at a time
      const endIndex = Math.min(startIndex + batchSize, cafes.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        const cafe = cafes[i];
        
        if (!cafe.location || !cafe.location.latitude || !cafe.location.longitude) {
          console.warn('Skipping cafe with invalid location:', cafe.name);
          continue;
        }

        const position = {
          lat: cafe.location.latitude,
          lng: cafe.location.longitude
        };

        // WWDC-style venue markers
        const markerSVG = `
          <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="wwdcVenueFilter${i}" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
              </filter>
              <linearGradient id="wwdcVenueGradient${i}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${getWWDCVenueColor(cafe)};stop-opacity:1" />
                <stop offset="100%" style="stop-color:${getWWDCVenueColorSecondary(cafe)};stop-opacity:1" />
              </linearGradient>
            </defs>
            
            <!-- Pin shadow -->
            <ellipse cx="18" cy="41" rx="10" ry="3" fill="rgba(0,0,0,0.2)"/>
            
            <!-- Main pin shape with WWDC gradient -->
            <path d="M18 0C8.059 0 0 8.059 0 18C0 28 18 44 18 44S36 28 36 18C36 8.059 27.941 0 18 0Z" 
                  fill="url(#wwdcVenueGradient${i})" 
                  filter="url(#wwdcVenueFilter${i})"/>
            
            <!-- Inner circle with glassmorphism -->
            <circle cx="18" cy="18" r="12" fill="rgba(255,255,255,0.15)" 
                    stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
            
            <!-- Venue icon -->
            <text x="18" y="23" text-anchor="middle" font-size="16" fill="white" font-weight="600">
              ${getVenueEmoji(cafe)}
            </text>
            
            <!-- Distance pulse for very close venues -->
            ${cafe.distance && cafe.distance < 200 ? `
              <circle cx="18" cy="18" r="15" fill="none" stroke="#00FF88" stroke-width="2" opacity="0.8">
                <animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite"/>
              </circle>
            ` : ''}
            
            <!-- WWDC-style rating badge -->
            ${cafe.rating && cafe.rating >= 4.5 ? `
              <circle cx="28" cy="8" r="6" fill="url(#wwdcVenueGradient${i})" stroke="white" stroke-width="2"/>
              <text x="28" y="11" text-anchor="middle" font-size="8" fill="white" font-weight="bold">★</text>
            ` : ''}
          </svg>
        `;

        const marker = new window.google.maps.Marker({
          position: position,
          map: googleMapRef.current,
          title: `${cafe.emoji || getVenueEmoji(cafe)} ${cafe.name}${cafe.rating ? ` (${cafe.rating}⭐)` : ''}${cafe.distance ? ` - ${cafe.formattedDistance}` : ''}`,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerSVG),
            scaledSize: new window.google.maps.Size(36, 44),
            anchor: new window.google.maps.Point(18, 44)
          },
          zIndex: cafe.distance ? Math.round(1000 - cafe.distance / 10) : 500,
          animation: cafe.distance && cafe.distance < 200 ? 
            window.google.maps.Animation.BOUNCE : null,
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
      }

      // Process next batch or finish
      if (endIndex < cafes.length) {
        // Process next batch after a small delay for smooth loading
        setTimeout(() => processBatch(endIndex), 50);
      } else {
        // All markers processed
        console.log('✅ WWDC-style venue markers updated:', markersAdded);
        setMarkersLoading(false);
        setMarkersLoaded(true);
      }
    };

    // Start processing markers
    processBatch(0);

  }, [cafes, mapLoaded, onCafeSelect, cafeType]); // Added cafeType dependency

  // FIXED: Proper color coding - Orange for cafe/bar, Red for restaurant
  const getWWDCVenueColor = (cafe) => {
    // FIXED: All cafes and bars get orange, restaurants get red
    if (cafe.type === 'restaurant' || cafe.placeType === 'restaurant') {
      return '#EF4444'; // Red for restaurants
    }
    
    // Everything else (cafe, bar, etc.) gets orange
    return '#F97316'; // Orange for cafes/bars
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
          backgroundColor: '#000000',
          borderRadius: isEmbedMode ? '12px' : '0'
        }}
      />

      {/* Map Controls - WITHOUT location controls */}
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