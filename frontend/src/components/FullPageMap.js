// components/FullPageMap.js - ULTRA-OPTIMIZED for Instant Interactivity
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
  
  // INSTANT MOVEMENT DETECTION - Much more responsive
  const lastSearchLocationRef = useRef(null);
  const isUserDraggingRef = useRef(false);
  const debounceTimeoutRef = useRef(null);
  const currentFilterRef = useRef(cafeType);
  const activeMarkersRef = useRef(new Set());

  // ⚡ INSTANT TRIGGER DISTANCE - Ultra responsive
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

    // ULTRA-FAST trigger - 200m minimum for instant response
    const instantTrigger = Math.max(searchRadius * 0.15, 200);
    const hasMovedSignificantly = distance > instantTrigger;

    if (hasMovedSignificantly) {
      console.log(`⚡ INSTANT TRIGGER: Moved ${Math.round(distance)}m > ${Math.round(instantTrigger)}m`);
    }

    return hasMovedSignificantly;
  }, [searchRadius]);

  // 🚀 ULTRA-FAST CENTER CHANGE HANDLER
  const handleMapCenterChange = useCallback((newCenter) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const shouldSearch = shouldTriggerNewSearch(newCenter);
    
    // INSTANT response - very short delay
    const delay = shouldSearch ? 400 : 800; // Much faster

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
      // Very short minimum display time for instant feel
      const minDisplayTime = 800; // Reduced to 0.8 seconds
      
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
          const newProgress = prev + Math.random() * 25; // Faster progress
          if (newProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return newProgress;
        });
      }, 100); // Faster intervals
      
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
      }, 10000); // Shorter timeout

      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.Map) {
          console.log('✅ Google Maps detected via polling');
          setGoogleMapsReady(true);
          setGoogleMapsError(null);
          resolve(true);
          cleanup();
          clearInterval(checkInterval);
        }
      }, 200); // Faster polling

      setTimeout(() => {
        clearInterval(checkInterval);
      }, 10000);
    });
  }, []);

  // 🗺️ Map initialization
  useEffect(() => {
    if (mapInitialized || !mapRef.current) return;

    const initMap = async () => {
      try {
        console.log('🗺️ Initializing interactive map...');
        
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
          
          // UI Controls - minimal for speed
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
          
          // Beautiful light theme for better marker visibility
          styles: [
            {
              "featureType": "all",
              "elementType": "geometry",
              "stylers": [{ "color": "#f5f5f5" }]
            },
            {
              "featureType": "all",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#333333" }]
            },
            {
              "featureType": "administrative",
              "elementType": "geometry.stroke",
              "stylers": [
                { "color": "#c9c9c9" },
                { "weight": 0.8 }
              ]
            },
            {
              "featureType": "landscape",
              "elementType": "geometry",
              "stylers": [{ "color": "#f9f9f9" }]
            },
            
            // Hide POI icons for cleaner look
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
            
            // Parks in light green
            {
              "featureType": "poi.park",
              "elementType": "geometry",
              "stylers": [{ "color": "#e8f5e8" }]
            },
            
            // Roads in light colors
            {
              "featureType": "road",
              "elementType": "geometry.fill",
              "stylers": [{ "color": "#ffffff" }]
            },
            {
              "featureType": "road",
              "elementType": "geometry.stroke",
              "stylers": [{ "color": "#d4d4d4" }]
            },
            {
              "featureType": "road.highway",
              "elementType": "geometry",
              "stylers": [{ "color": "#f0f0f0" }]
            },
            
            // Water in light blue
            {
              "featureType": "water",
              "elementType": "geometry",
              "stylers": [{ "color": "#e6f3ff" }]
            }
          ],
          
          // Gestures for responsiveness
          gestureHandling: 'greedy',
          disableDoubleClickZoom: false,
          draggable: true,
          scrollwheel: true,
          
          // Disable default markers
          disableDefaultUI: false,
          clickableIcons: false
        };

        try {
          googleMapRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
          console.log('✅ Interactive map created successfully');
          
        } catch (mapCreationError) {
          console.error('❌ Failed to create map:', mapCreationError);
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

        // Quick tiles loading
        const tilesLoadedPromise = new Promise((resolve) => {
          const listener = googleMapRef.current.addListener('tilesloaded', () => {
            window.google.maps.event.removeListener(listener);
            resolve();
          });
          setTimeout(resolve, 1000); // Faster timeout
        });

        await tilesLoadedPromise;

        console.log('✅ Interactive map loaded');
        
        setMapLoaded(true);
        setMapError(null);
        setMapInitialized(true);
        setLoadingProgress(100);
        
        lastSearchLocationRef.current = { lat: center.lat, lng: center.lng };

      } catch (error) {
        console.error('❌ Failed to initialize map:', error);
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
        console.log('🗺️ Updating map center:', newCenter);
        googleMapRef.current.setCenter(newCenter);
        lastSearchLocationRef.current = newCenter;
        
        if (Math.abs(currentZoom - zoom) > 1) {
          console.log('🗺️ Updating map zoom:', zoom);
          googleMapRef.current.setZoom(zoom);
        }
      }
    }
  }, [center.lat, center.lng, zoom, mapLoaded, mapInitialized]);

  // User location marker
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    console.log('🎯 Creating user location marker');

    const userLocationSVG = `
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="userGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:#007AFF;stop-opacity:1" />
            <stop offset="70%" style="stop-color:#5856D6;stop-opacity:0.8" />
            <stop offset="100%" style="stop-color:#007AFF;stop-opacity:0" />
          </radialGradient>
        </defs>
        
        <circle cx="16" cy="16" r="14" fill="url(#userGradient)" opacity="0.4">
          <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite"/>
        </circle>
        
        <circle cx="16" cy="16" r="8" fill="#007AFF">
          <animate attributeName="r" values="6;9;6" dur="1.5s" repeatCount="indefinite"/>
        </circle>
        
        <circle cx="16" cy="16" r="3" fill="white"/>
      </svg>
    `;

    const userMarker = new window.google.maps.Marker({
      position: { 
        lat: userLocation.latitude, 
        lng: userLocation.longitude 
      },
      map: googleMapRef.current,
      title: `📍 Your location`,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(userLocationSVG),
        scaledSize: new window.google.maps.Size(32, 32),
        anchor: new window.google.maps.Point(16, 16)
      },
      zIndex: 10000,
      optimized: false
    });

    userMarkerRef.current = userMarker;
    console.log('🎯 User location marker updated');
  }, [userLocation, mapLoaded, locationLoading]);

  // Search radius circle
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
        fillColor: cafeType === 'restaurant' ? '#EF4444' : '#F97316',
        fillOpacity: 0.1,
        strokeColor: cafeType === 'restaurant' ? '#DC2626' : '#EA580C',
        strokeOpacity: 0.4,
        strokeWeight: 2,
        clickable: false
      });

      radiusCircleRef.current = circle;
      console.log('🔍 Search radius circle updated:', searchRadius);
    }
  }, [userLocation, searchRadius, mapLoaded, cafeType]);

  // 🚀 INSTANT MARKER RENDERING - Perfect filtering with cute markers
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;

    console.log('☕ INSTANT FILTERING - Starting marker update:', {
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

    // INSTANT FILTER - Perfect type matching
    const perfectlyFilteredCafes = cafes.filter(cafe => {
      const cafeType_raw = cafe.type || cafe.placeType || '';
      const cafeType_normalized = cafeType_raw.toLowerCase().trim();
      const selectedType_normalized = currentFilterRef.current.toLowerCase().trim();
      
      return cafeType_normalized === selectedType_normalized;
    });

    console.log(`🎯 INSTANT FILTER: ${perfectlyFilteredCafes.length}/${cafes.length} places match "${currentFilterRef.current}"`);

    if (perfectlyFilteredCafes.length === 0) {
      console.log('📍 NO MATCHES - Empty map');
      return;
    }

    // 🎨 INSTANT MARKER CREATION - Cute circular markers
    perfectlyFilteredCafes.forEach((cafe, index) => {
      if (!cafe.location || !cafe.location.latitude || !cafe.location.longitude) {
        return;
      }

      const position = {
        lat: cafe.location.latitude,
        lng: cafe.location.longitude
      };

      // 🎨 CUTE CIRCULAR MARKER
      const markerSVG = createCuteCircularMarker(cafe, index, currentFilterRef.current);

      const marker = new window.google.maps.Marker({
        position: position,
        map: googleMapRef.current,
        title: `${getCuteEmoji(cafe)} ${cafe.name}${cafe.rating ? ` (${cafe.rating}⭐)` : ''}${cafe.distance ? ` - ${cafe.formattedDistance}` : ''}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerSVG),
          scaledSize: new window.google.maps.Size(28, 28), // Small and cozy
          anchor: new window.google.maps.Point(14, 14),
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

    console.log(`🎉 INSTANT MARKERS: ${perfectlyFilteredCafes.length} cute ${currentFilterRef.current} markers added instantly`);

  }, [cafes, mapLoaded, onCafeSelect, cafeType]);

  // 🎨 CREATE CUTE CIRCULAR MARKER
  const createCuteCircularMarker = (cafe, index, selectedType) => {
    const colors = selectedType === 'restaurant' ? 
      { primary: '#EF4444', secondary: '#FEE2E2', accent: '#FECACA' } :
      { primary: '#F97316', secondary: '#FED7AA', accent: '#FDBA74' };
    
    const emoji = getCuteEmoji(cafe);
    const isClose = cafe.distance && cafe.distance < 300;
    
    return `
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="cuteGradient${index}" cx="50%" cy="30%" r="70%">
            <stop offset="0%" style="stop-color:white;stop-opacity:1" />
            <stop offset="60%" style="stop-color:${colors.primary};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colors.primary};stop-opacity:0.8" />
          </radialGradient>
          <filter id="cuteShadow${index}">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="${colors.primary}" flood-opacity="0.3"/>
          </filter>
        </defs>
        
        ${isClose ? `
          <circle cx="14" cy="14" r="16" fill="${colors.primary}" opacity="0.2">
            <animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite"/>
          </circle>
        ` : ''}
        
        <circle cx="14" cy="14" r="12" fill="url(#cuteGradient${index})" 
                filter="url(#cuteShadow${index})" stroke="white" stroke-width="2"/>
        
        <text x="14" y="18" text-anchor="middle" font-size="14" fill="white" 
              style="text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
          ${emoji}
        </text>
        
        ${cafe.rating && cafe.rating >= 4.5 ? `
          <circle cx="22" cy="6" r="5" fill="#FFD700" stroke="white" stroke-width="1"/>
          <text x="22" y="9" text-anchor="middle" font-size="8" fill="white" font-weight="bold">★</text>
        ` : ''}
        
        ${isClose ? `
          <circle cx="6" cy="6" r="4" fill="#00FF88" stroke="white" stroke-width="1"/>
          <text x="6" y="9" text-anchor="middle" font-size="7" fill="white" font-weight="bold">!</text>
        ` : ''}
      </svg>
    `;
  };

  // CUTE emoji mapping
  const getCuteEmoji = (cafe) => {
    const venueType = (cafe.type || cafe.placeType || '').toLowerCase();
    return venueType === 'restaurant' ? '🍽️' : '☕';
  };

  // Set initial load complete
  useEffect(() => {
    if (mapLoaded && googleMapsReady && !hasInitialLoad) {
      setHasInitialLoad(true);
      console.log('✅ Initial map load completed');
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
      {/* Initial Loading Screen - Fast completion */}
      {(!hasInitialLoad && (!mapLoaded || !googleMapsReady || loading)) && (
        <LoadingScreen 
          message="Caricamento mappa..."
          subMessage="Preparazione esperienza interattiva"
          progress={loadingProgress}
        />
      )}

      {/* INSTANT Map Update Loader */}
      {(isMapUpdating || (hasInitialLoad && loading)) && (
        <MapUpdateLoader
          loading={isMapUpdating || (hasInitialLoad && loading)}
          searchType={cafeType}
          forcefulMode={false} // Disable forceful mode for instant feel
        />
      )}

      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="map-canvas"
        style={{ 
          width: '100%', 
          height: '100%',
          backgroundColor: '#f5f5f5',
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