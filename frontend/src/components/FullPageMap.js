// components/FullPageMap.js - IMPROVED VERSION - Better Google Maps Loading
// Location: /map-service/frontend/src/components/FullPageMap.js

import React, { useRef, useEffect, useState, useCallback } from 'react';
import CafePopup from './CafePopup';
import MapControls from './MapControls';
import MapLoadingOverlay from './MapLoadingOverlay';

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
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [googleMapsReady, setGoogleMapsReady] = useState(false);
  const [googleMapsError, setGoogleMapsError] = useState(null);
  
  // Smart movement detection
  const lastSearchLocationRef = useRef(null);
  const isUserDraggingRef = useRef(false);
  const debounceTimeoutRef = useRef(null);
  const immediateSearchTimeoutRef = useRef(null);

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
      }, 15000); // Increased timeout to 15 seconds

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
    const dynamicThreshold = Math.max(searchRadius * 0.3, 200); // 30% of search radius, min 200m
    const hasMovedSignificantly = distance > dynamicThreshold;

    console.log('🗺️ Movement check:', {
      distance: Math.round(distance),
      threshold: Math.round(dynamicThreshold),
      searchRadius,
      shouldSearch: hasMovedSignificantly
    });

    return hasMovedSignificantly;
  }, [searchRadius]);

  // Adaptive debouncing for better user experience
  const debouncedCenterChange = useCallback((newCenter) => {
    // Clear existing timeouts
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (immediateSearchTimeoutRef.current) {
      clearTimeout(immediateSearchTimeoutRef.current);
    }

    // Adaptive delay based on movement distance
    const shouldSearch = shouldTriggerNewSearch(newCenter);
    const delay = shouldSearch ? 800 : 1500; // Faster response for significant moves

    debounceTimeoutRef.current = setTimeout(() => {
      if (!isUserDraggingRef.current && shouldSearch) {
        console.log('🗺️ Triggering optimized search');
        lastSearchLocationRef.current = newCenter;
        
        if (onCenterChange) {
          onCenterChange(newCenter);
        }
      }
    }, delay);
  }, [onCenterChange, shouldTriggerNewSearch]);

  // IMPROVED: Initialize Google Map with better error handling
  useEffect(() => {
    if (mapInitialized || !mapRef.current) return;

    const initMap = async () => {
      try {
        console.log('🗺️ Initializing Google Map...');
        
        // Wait for Google Maps to be ready
        const isReady = await checkGoogleMapsAvailability();
        if (!isReady) {
          return;
        }

        console.log('🗺️ Creating Google Map instance...');

        // IMPROVED: Validate mapRef.current exists
        if (!mapRef.current) {
          console.error('❌ Map container ref is null');
          setMapError('Map container not found');
          return;
        }

        const mapOptions = {
          center: { lat: center.lat, lng: center.lng },
          zoom: zoom,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
          
          // UI Controls
          zoomControl: true,
          zoomControlOptions: {
            position: window.google.maps.ControlPosition.RIGHT_BOTTOM
          },
          mapTypeControl: false,
          scaleControl: true,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: !isEmbedMode,
          
          // IMPROVED: Italian Coffee Shop & Restaurant Theme
          styles: [
            {
              "featureType": "all",
              "elementType": "all",
              "stylers": [
                { "saturation": -5 },
                { "lightness": 8 }
              ]
            },
            {
              "featureType": "water",
              "elementType": "geometry.fill",
              "stylers": [
                { "color": "#89CDF1" },
                { "saturation": -20 }
              ]
            },
            {
              "featureType": "landscape",
              "elementType": "geometry.fill",
              "stylers": [
                { "color": "#F5F3F0" },
                { "lightness": 15 }
              ]
            },
            {
              "featureType": "road",
              "elementType": "geometry.fill",
              "stylers": [
                { "color": "#FFFFFF" }
              ]
            },
            {
              "featureType": "road",
              "elementType": "geometry.stroke",
              "stylers": [
                { "color": "#E0DDD8" },
                { "weight": 1 }
              ]
            },
            {
              "featureType": "poi.business",
              "elementType": "labels.icon",
              "stylers": [
                { "visibility": "simplified" },
                { "saturation": 20 }
              ]
            },
            {
              "featureType": "poi.food",
              "elementType": "labels.icon",
              "stylers": [
                { "visibility": "on" },
                { "saturation": 15 },
                { "lightness": -5 }
              ]
            },
            {
              "featureType": "poi.park",
              "elementType": "geometry.fill",
              "stylers": [
                { "color": "#D4E6B7" }
              ]
            },
            {
              "featureType": "poi.place_of_worship",
              "elementType": "labels",
              "stylers": [
                { "visibility": "simplified" }
              ]
            },
            {
              "featureType": "administrative",
              "elementType": "labels.text.fill",
              "stylers": [
                { "color": "#8B7355" }
              ]
            },
            {
              "featureType": "poi.government",
              "stylers": [
                { "visibility": "simplified" }
              ]
            }
          ],
          
          // Gestures
          gestureHandling: 'greedy',
          disableDoubleClickZoom: false,
          draggable: true,
          scrollwheel: true
        };

        // IMPROVED: Create map with better error handling
        try {
          googleMapRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
          console.log('✅ Google Map instance created successfully');
        } catch (mapCreationError) {
          console.error('❌ Failed to create Google Map instance:', mapCreationError);
          setMapError('Error creating map instance');
          return;
        }

        // Event listeners with proper drag detection
        googleMapRef.current.addListener('dragstart', () => {
          console.log('🗺️ User started dragging map');
          isUserDraggingRef.current = true;
          
          // Clear any pending searches while dragging
          if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
          }
        });

        googleMapRef.current.addListener('dragend', () => {
          console.log('🗺️ User finished dragging map');
          isUserDraggingRef.current = false;
          
          // Start the search after a short delay
          immediateSearchTimeoutRef.current = setTimeout(() => {
            const newCenter = googleMapRef.current.getCenter();
            debouncedCenterChange({
              lat: newCenter.lat(),
              lng: newCenter.lng()
            });
          }, 500);
        });

        // Listen to idle events for zoom changes
        googleMapRef.current.addListener('idle', () => {
          if (!isUserDraggingRef.current) {
            const newCenter = googleMapRef.current.getCenter();
            const currentZoom = googleMapRef.current.getZoom();
            
            // Only trigger on significant zoom changes
            if (Math.abs(currentZoom - zoom) >= 2) {
              console.log('🗺️ Significant zoom change detected');
              debouncedCenterChange({
                lat: newCenter.lat(),
                lng: newCenter.lng()
              });
            }
          }
        });

        // Close popup on map click
        googleMapRef.current.addListener('click', () => {
          if (selectedCafe && onClosePopup) {
            onClosePopup();
          }
        });

        // IMPROVED: Better tiles loaded detection
        const tilesLoadedPromise = new Promise((resolve) => {
          const listener = googleMapRef.current.addListener('tilesloaded', () => {
            window.google.maps.event.removeListener(listener);
            resolve();
          });
          
          // Fallback timeout
          setTimeout(resolve, 3000);
        });

        await tilesLoadedPromise;

        console.log('✅ Google Map loaded successfully');
        setMapLoaded(true);
        setMapError(null);
        setMapInitialized(true);
        
        // Set initial search location
        lastSearchLocationRef.current = { lat: center.lat, lng: center.lng };

      } catch (error) {
        console.error('❌ Failed to initialize Google Map:', error);
        setMapError('Failed to initialize map: ' + error.message);
      }
    };

    initMap();
  }, [mapInitialized, center.lat, center.lng, zoom, isEmbedMode, checkGoogleMapsAvailability, debouncedCenterChange, selectedCafe, onClosePopup]);

  // Update map center only for external changes (not user-initiated)
  useEffect(() => {
    if (googleMapRef.current && mapLoaded && mapInitialized && !isUserDraggingRef.current) {
      const currentCenter = googleMapRef.current.getCenter();
      const currentZoom = googleMapRef.current.getZoom();
      
      const newCenter = { lat: center.lat, lng: center.lng };
      
      // Only update if this is an external change (e.g., location found)
      const isExternalChange = !lastSearchLocationRef.current || 
        (Math.abs(currentCenter?.lat() - newCenter.lat) > 0.01 || 
         Math.abs(currentCenter?.lng() - newCenter.lng) > 0.01);
      
      if (isExternalChange) {
        console.log('🗺️ Updating map center from props:', newCenter);
        googleMapRef.current.setCenter(newCenter);
        lastSearchLocationRef.current = newCenter;
        
        // Update zoom if significantly different
        if (Math.abs(currentZoom - zoom) > 1) {
          console.log('🗺️ Updating map zoom:', zoom);
          googleMapRef.current.setZoom(zoom);
        }
      }
    }
  }, [center.lat, center.lng, zoom, mapLoaded, mapInitialized]);

  // Update user location marker with better styling
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded || !userLocation) return;

    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    // IMPROVED: User marker with accuracy indicator
    const userMarker = new window.google.maps.Marker({
      position: { 
        lat: userLocation.latitude, 
        lng: userLocation.longitude 
      },
      map: googleMapRef.current,
      title: `Your location (±${Math.round(userLocation.accuracy || 0)}m)`,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="14" cy="14" r="12" fill="#6F4E37" stroke="#ffffff" stroke-width="3"/>
            <circle cx="14" cy="14" r="4" fill="#ffffff"/>
            <circle cx="14" cy="14" r="13" fill="none" stroke="#6F4E37" stroke-width="1" opacity="0.3"/>
            ${userLocation.accuracy < 50 ? '<circle cx="14" cy="14" r="2" fill="#10B981"/>' : ''}
          </svg>
        `),
        scaledSize: new window.google.maps.Size(28, 28),
        anchor: new window.google.maps.Point(14, 14)
      },
      zIndex: 1000,
      animation: userLocation.source === 'gps' ? window.google.maps.Animation.DROP : null
    });

    userMarkerRef.current = userMarker;
    console.log('📍 User location marker updated');
  }, [userLocation, mapLoaded]);

  // Update search radius circle
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
        fillColor: userLocation.source === 'gps' ? '#6F4E37' : '#F59E0B',
        fillOpacity: 0.08,
        strokeColor: userLocation.source === 'gps' ? '#6F4E37' : '#F59E0B',
        strokeOpacity: 0.3,
        strokeWeight: 2,
        clickable: false
      });

      radiusCircleRef.current = circle;
      console.log('🔍 Search radius circle updated:', searchRadius);
    }
  }, [userLocation, searchRadius, mapLoaded]);

  // IMPROVED: Italian venue markers (NO PUB MARKERS)
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;

    console.log('☕ Updating Italian venue markers:', cafes.length);

    // Clear existing markers efficiently
    markersRef.current.forEach(marker => {
      marker.setMap(null);
    });
    markersRef.current.clear();

    // Create new markers
    const bounds = new window.google.maps.LatLngBounds();
    let markersAdded = 0;
    
    cafes.forEach((cafe, index) => {
      if (!cafe.location || !cafe.location.latitude || !cafe.location.longitude) {
        console.warn('Skipping cafe with invalid location:', cafe.name);
        return;
      }

      const position = {
        lat: cafe.location.latitude,
        lng: cafe.location.longitude
      };

      // Use traditional Marker (most compatible)
      const marker = new window.google.maps.Marker({
        position: position,
        map: googleMapRef.current,
        title: `${cafe.name}${cafe.rating ? ` (${cafe.rating}⭐)` : ''}${cafe.distance ? ` - ${cafe.formattedDistance}` : ''}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C7.163 0 0 7.163 0 16C0 24.837 16 40 16 40S32 24.837 32 16C32 7.163 24.837 0 16 0Z" fill="${getItalianVenueMarkerColor(cafe)}"/>
              <circle cx="16" cy="16" r="8" fill="white"/>
              <text x="16" y="20" text-anchor="middle" font-size="12" fill="${getItalianVenueMarkerColor(cafe)}">${getItalianVenueEmoji(cafe)}</text>
              ${cafe.distance && cafe.distance < 200 ? '<circle cx="16" cy="16" r="11" fill="none" stroke="#10B981" stroke-width="2" opacity="0.6"/>' : ''}
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 40),
          anchor: new window.google.maps.Point(16, 40)
        },
        zIndex: cafe.distance ? Math.round(1000 - cafe.distance / 10) : 500,
        animation: cafe.distance && cafe.distance < 200 ? 
          window.google.maps.Animation.BOUNCE : null
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
    });

    console.log('✅ Italian venue markers updated:', markersAdded);
  }, [cafes, mapLoaded, onCafeSelect]);

  // Helper functions for Italian venues only (NO PUBS)
  const getItalianVenueMarkerColor = (cafe) => {
    if (cafe.distance && cafe.distance < 200) return '#10B981'; // Very close - green
    if (cafe.distance && cafe.distance < 500) return '#F59E0B'; // Close - amber
    if (cafe.rating && cafe.rating >= 4.5) return '#8B5CF6';     // High rated - purple
    if (cafe.type === 'restaurant') return '#CE2B37';           // Restaurants - Italian red
    
    return '#6F4E37'; // Default - coffee brown for cafeterias
  };

  // Italian venue emoji mapping (NO PUB EMOJIS)
  const getItalianVenueEmoji = (cafe) => {
    // Check for specific Italian venue types first
    const nameLower = (cafe.name || '').toLowerCase();
    
    if (nameLower.includes('gelateria') || nameLower.includes('gelato')) return '🍦';
    if (nameLower.includes('pizzeria') || nameLower.includes('pizza')) return '🍕';
    if (nameLower.includes('pasticceria') || nameLower.includes('dolc')) return '🧁';
    if (nameLower.includes('panetteria') || nameLower.includes('pane')) return '🥖';
    
    // Default based on type
    switch (cafe.type || cafe.placeType) {
      case 'restaurant': return '🍽️'; // Restaurant
      case 'cafe':
      default: return '☕'; // Coffee for cafeterias (including Italian bars)
    }
  };

  // Comprehensive cleanup
  useEffect(() => {
    return () => {
      // Clear all timeouts
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (immediateSearchTimeoutRef.current) {
        clearTimeout(immediateSearchTimeoutRef.current);
      }
      
      // Cleanup markers
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
    
    // Reload the page to reinitialize Google Maps
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
          <div className="error-details">
            <h4>Possible solutions:</h4>
            <ul>
              <li>Check your internet connection</li>
              <li>Verify your Google Maps API key is valid</li>
              <li>Ensure Places API is enabled in your Google Cloud Console</li>
              <li>Check if your API key has proper domain restrictions</li>
            </ul>
          </div>
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
      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="map-canvas"
        style={{ 
          width: '100%', 
          height: '100%',
          backgroundColor: '#F5F5DC'
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

      {/* Loading Overlay */}
      {(loading || !mapLoaded || !googleMapsReady) && (
        <MapLoadingOverlay 
          loading={loading}
          mapLoaded={mapLoaded && googleMapsReady}
          cafesCount={cafes.length}
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

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000
        }}>
          <div>Maps Ready: {googleMapsReady ? '✅' : '⏳'}</div>
          <div>Map Loaded: {mapLoaded ? '✅' : '⏳'}</div>
          <div>Italian Venues: {cafes.length}</div>
          <div>Dragging: {isUserDraggingRef.current ? '🖱️' : '✋'}</div>
        </div>
      )}
    </div>
  );
};

export default FullPageMap;