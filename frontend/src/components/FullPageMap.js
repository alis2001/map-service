// components/FullPageMap.js - UPDATED VERSION with Two Loading Systems
// Location: /map-service/frontend/src/components/FullPageMap.js

import React, { useRef, useEffect, useState, useCallback } from 'react';
import LoadingScreen from './LoadingScreen';
import MapUpdateLoader from './MapUpdateLoader'; // NEW IMPORT
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
  onLocationRequest,
  locationLoading,
  locationError
}) => {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef(new Map());
  const userMarkerRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const userLocationButtonRef = useRef(null);
  
  // UPDATED: Separate loading states
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [googleMapsReady, setGoogleMapsReady] = useState(false);
  const [googleMapsError, setGoogleMapsError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [markersLoaded, setMarkersLoaded] = useState(false);
  const [markersLoading, setMarkersLoading] = useState(false);
  
  // NEW: Map update loading state (for drag updates)
  const [isMapUpdating, setIsMapUpdating] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false); // Track if map loaded once
  
  // Smart movement detection
  const lastSearchLocationRef = useRef(null);
  const isUserDraggingRef = useRef(false);
  const debounceTimeoutRef = useRef(null);
  const immediateSearchTimeoutRef = useRef(null);

  // Loading progress simulation - ONLY for initial load
  useEffect(() => {
    if (!mapLoaded && googleMapsReady && !hasInitialLoad) {
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          const newProgress = prev + Math.random() * 15;
          if (newProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return newProgress;
        });
      }, 200);
      
      return () => clearInterval(interval);
    }
  }, [mapLoaded, googleMapsReady, hasInitialLoad]);

  // UPDATED: Mark initial load as complete
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

  // Smart zone-based movement detection for responsive updates
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

    // Dynamic threshold based on search radius for better responsiveness
    const dynamicThreshold = Math.max(searchRadius * 0.3, 200);
    const hasMovedSignificantly = distance > dynamicThreshold;

    return hasMovedSignificantly;
  }, [searchRadius]);

  // UPDATED: Adaptive debouncing with map update loading
  const debouncedCenterChange = useCallback((newCenter) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (immediateSearchTimeoutRef.current) {
      clearTimeout(immediateSearchTimeoutRef.current);
    }

    const shouldSearch = shouldTriggerNewSearch(newCenter);
    const delay = shouldSearch ? 600 : 1200;

    if (shouldSearch && hasInitialLoad) {
      setIsMapUpdating(true);
      console.log('🗺️ Map update loading started for search');
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (!isUserDraggingRef.current && shouldSearch) {
        console.log('🗺️ Triggering optimized search');
        lastSearchLocationRef.current = newCenter;
        
        if (onCenterChange) {
          onCenterChange(newCenter);
        }
      } else if (!shouldSearch) {
        // Hide loader if no search needed
        setIsMapUpdating(false);
      }
    }, delay);
  }, [onCenterChange, shouldTriggerNewSearch, hasInitialLoad]);

  // UPDATED: Hide map update loader when search completes
  useEffect(() => {
    if (!loading && !markersLoading && isMapUpdating) {
      // Small delay to show completion
      setTimeout(() => {
        setIsMapUpdating(false);
        console.log('✅ Map update completed - hiding loader');
      }, 300);
    }
  }, [loading, markersLoading, isMapUpdating]);

  // ENHANCED: Create WWDC-style User Location Button
  const createWWDCLocationButton = useCallback(() => {
    if (!googleMapRef.current || userLocationButtonRef.current) return;

    // Create button container
    const locationButton = document.createElement('div');
    locationButton.className = 'wwdc-location-button';
    
    // Create inner content
    locationButton.innerHTML = `
      <div class="wwdc-location-content">
        <div class="location-rings">
          <div class="location-ring ring-1"></div>
          <div class="location-ring ring-2"></div>
        </div>
        <div class="location-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
          </svg>
        </div>
      </div>
    `;

    // Add WWDC styles
    const style = document.createElement('style');
    style.textContent = `
      .wwdc-location-button {
        position: absolute;
        right: 16px;
        bottom: 120px;
        width: 48px;
        height: 48px;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
      }

      .wwdc-location-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(45deg, #007AFF, #5856D6, #AF52DE, #FF2D92);
        opacity: 0;
        transition: opacity 0.3s ease;
        border-radius: 12px;
      }

      .wwdc-location-button:hover::before {
        opacity: 0.1;
      }

      .wwdc-location-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 122, 255, 0.3);
        border-color: rgba(0, 122, 255, 0.3);
      }

      .wwdc-location-button:active {
        transform: scale(0.95);
      }

      .wwdc-location-button.has-location {
        background: linear-gradient(45deg, #007AFF, #5856D6);
        border-color: rgba(0, 122, 255, 0.3);
        box-shadow: 0 0 20px rgba(0, 122, 255, 0.4);
      }

      .wwdc-location-button.has-location .location-center {
        color: white;
      }

      .wwdc-location-button.loading .location-rings {
        animation: wwdcLocationSpin 2s linear infinite;
      }

      .wwdc-location-content {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;
      }

      .location-rings {
        position: absolute;
        width: 40px;
        height: 40px;
      }

      .location-ring {
        position: absolute;
        border-radius: 50%;
        border: 1px solid rgba(0, 122, 255, 0.3);
        animation: wwdcLocationPulse 2s ease-in-out infinite;
      }

      .ring-1 {
        width: 40px;
        height: 40px;
        top: 0;
        left: 0;
        animation-delay: 0s;
      }

      .ring-2 {
        width: 30px;
        height: 30px;
        top: 5px;
        left: 5px;
        animation-delay: 0.5s;
      }

      .location-center {
        color: #007AFF;
        transition: color 0.3s ease;
        z-index: 3;
        position: relative;
      }

      .wwdc-location-button.has-location .location-rings .location-ring {
        border-color: rgba(255, 255, 255, 0.5);
        animation: wwdcLocationPulseActive 1.5s ease-in-out infinite;
      }

      @keyframes wwdcLocationPulse {
        0%, 100% { 
          opacity: 0.3;
          transform: scale(0.8);
        }
        50% { 
          opacity: 0.8;
          transform: scale(1.2);
        }
      }

      @keyframes wwdcLocationPulseActive {
        0%, 100% { 
          opacity: 0.6;
          transform: scale(0.9);
        }
        50% { 
          opacity: 1;
          transform: scale(1.3);
        }
      }

      @keyframes wwdcLocationSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      @media (max-width: 768px) {
        .wwdc-location-button {
          right: 12px;
          bottom: 100px;
          width: 44px;
          height: 44px;
        }
      }
    `;

    // Add styles to head if not already added
    if (!document.querySelector('style[data-wwdc-location]')) {
      style.setAttribute('data-wwdc-location', 'true');
      document.head.appendChild(style);
    }

    // Add click handler
    locationButton.addEventListener('click', () => {
      if (onLocationRequest) {
        onLocationRequest();
      }
    });

    // Update button state based on location status
    const updateButtonState = () => {
      if (locationLoading) {
        locationButton.classList.add('loading');
        locationButton.classList.remove('has-location');
      } else if (userLocation) {
        locationButton.classList.remove('loading');
        locationButton.classList.add('has-location');
      } else {
        locationButton.classList.remove('loading', 'has-location');
      }
    };

    updateButtonState();

    // Add to map
    googleMapRef.current.controls[window.google.maps.ControlPosition.RIGHT_BOTTOM].push(locationButton);
    userLocationButtonRef.current = locationButton;

    console.log('🎯 WWDC-style location button created');
  }, [onLocationRequest, locationLoading, userLocation]);

  // ENHANCED: Initialize Google Map with FIXED WWDC-style design
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
          
          // FIXED: Dark elegant map style
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
          
          // Disable default UI to create custom WWDC-style controls
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

        // UPDATED: Event listeners with map update loading
        googleMapRef.current.addListener('dragstart', () => {
          isUserDraggingRef.current = true;
          console.log('🗺️ User started dragging map');
          
          // IMMEDIATELY show map update loader when dragging starts
          if (hasInitialLoad) {
            setIsMapUpdating(true);
            console.log('🔄 Map update loading started');
          }
          
          if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
          }
        });

        googleMapRef.current.addListener('dragend', () => {
          isUserDraggingRef.current = false;
          console.log('🗺️ User finished dragging map');
          
          immediateSearchTimeoutRef.current = setTimeout(() => {
            const newCenter = googleMapRef.current.getCenter();
            const newCenterObj = {
              lat: newCenter.lat(),
              lng: newCenter.lng()
            };
            
            console.log('🗺️ Movement check:', {
              from: lastSearchLocationRef.current,
              to: newCenterObj,
              shouldSearch: shouldTriggerNewSearch(newCenterObj)
            });
            
            debouncedCenterChange(newCenterObj);
          }, 500);
        });

        googleMapRef.current.addListener('idle', () => {
          if (!isUserDraggingRef.current) {
            const newCenter = googleMapRef.current.getCenter();
            const currentZoom = googleMapRef.current.getZoom();
            
            if (Math.abs(currentZoom - zoom) >= 2) {
              debouncedCenterChange({
                lat: newCenter.lat(),
                lng: newCenter.lng()
              });
            }
          }
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
          
          setTimeout(resolve, 3000);
        });

        await tilesLoadedPromise;

        // Create WWDC-style location button
        createWWDCLocationButton();

        console.log('✅ WWDC-style Google Map loaded successfully');
        
        // FIX: Ensure these states are set properly
        setMapLoaded(true);           // ← This is critical
        setMapError(null);
        setMapInitialized(true);
        setLoadingProgress(100);      // ← This too
        
        lastSearchLocationRef.current = { lat: center.lat, lng: center.lng };

      } catch (error) {
        console.error('❌ Failed to initialize WWDC-style Google Map:', error);
        setMapError('Failed to initialize map: ' + error.message);
        setMapLoaded(false);          // ← Ensure loading stops on error
        setLoadingProgress(100);      // ← Stop progress animation
      }
    };

    initMap();
  }, [mapInitialized]);

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
    
    // Update location button state
    if (userLocationButtonRef.current) {
      if (locationLoading) {
        userLocationButtonRef.current.classList.add('loading');
        userLocationButtonRef.current.classList.remove('has-location');
      } else {
        userLocationButtonRef.current.classList.remove('loading');
        userLocationButtonRef.current.classList.add('has-location');
      }
    }

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

  // WWDC helper functions for venue markers
  const getWWDCVenueColor = (cafe) => {
    if (cafe.distance && cafe.distance < 200) return '#00FF88'; // Very close - WWDC green
    if (cafe.distance && cafe.distance < 500) return '#FFD60A'; // Close - WWDC yellow
    if (cafe.rating && cafe.rating >= 4.5) return '#BF5AF2';     // High rated - WWDC purple
    if (cafe.type === 'restaurant') return '#FF453A';           // Restaurants - WWDC red
    
    return '#007AFF'; // Default - WWDC blue
  };

  const getWWDCVenueColorSecondary = (cafe) => {
    if (cafe.distance && cafe.distance < 200) return '#00D787'; // Darker WWDC green
    if (cafe.distance && cafe.distance < 500) return '#FFB000'; // Darker WWDC yellow
    if (cafe.rating && cafe.rating >= 4.5) return '#A040D1';     // Darker WWDC purple
    if (cafe.type === 'restaurant') return '#D70015';           // Darker WWDC red
    
    return '#0056CC'; // Darker WWDC blue
  };

  const getVenueEmoji = (cafe) => {
    const nameLower = (cafe.name || '').toLowerCase();
    
    if (nameLower.includes('gelateria') || nameLower.includes('gelato')) return '🍦';
    if (nameLower.includes('pizzeria') || nameLower.includes('pizza')) return '🍕';
    if (nameLower.includes('pasticceria') || nameLower.includes('dolc')) return '🧁';
    if (nameLower.includes('panetteria') || nameLower.includes('pane')) return '🥖';
    
    switch (cafe.type || cafe.placeType) {
      case 'restaurant': return '🍽️';
      case 'cafe':
      default: return '☕';
    }
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
      {/* UPDATED: Initial Loading Screen - ONLY for first map load */}
      {(!hasInitialLoad && (!mapLoaded || !googleMapsReady || loading)) && (
        <LoadingScreen 
          message="Inizializzazione mappa italiana..."
          subMessage="Preparazione dell'esperienza di ricerca locali"
          progress={loadingProgress}
        />
      )}

      {/* NEW: Map Update Loader - For drag updates */}
      <MapUpdateLoader
        loading={isMapUpdating || (hasInitialLoad && loading)}
        venueCount={cafes.length}
        searchType={cafeType}
        userLocation={userLocation}
      />

      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="map-canvas"
        style={{ 
          width: '100%', 
          height: '100%',
          backgroundColor: '#000000', // WWDC dark background
          borderRadius: isEmbedMode ? '12px' : '0'
        }}
      />

      {/* Map Controls */}
      {showControls && mapLoaded && (
        <MapControls
          cafeType={cafeType}
          searchRadius={searchRadius}
          onSearchChange={onSearchChange}
          onRefresh={onRefresh}
          onLocationRequest={onLocationRequest}
          locationLoading={locationLoading}
          hasUserLocation={!!userLocation}
          cafesCount={cafes.length}
          isEmbedMode={isEmbedMode}
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

      {/* WWDC-style Map Legend */}
      <div style={{
        position: 'absolute',
        bottom: '60px',
        left: '16px',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(20px)',
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        fontSize: '12px',
        color: 'white',
        fontWeight: '500',
        zIndex: 1000,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
      }}>
        <div style={{ 
          marginBottom: '8px', 
          fontWeight: '600',
          background: 'linear-gradient(45deg, #007AFF, #5856D6, #AF52DE)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          🗺️ WWDC Map
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ 
            width: '12px', 
            height: '12px', 
            borderRadius: '50%', 
            background: 'linear-gradient(45deg, #007AFF, #5856D6)',
            border: '2px solid rgba(255,255,255,0.3)'
          }} />
          <span>Your location</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span>☕</span>
          <span>Coffee shops</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🍽️</span>
          <span>Restaurants</span>
        </div>
      </div>
    </div>
  );
};

export default FullPageMap;