// components/FullPageMap.js - FIXED VERSION with Debouncing
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
  
  // FIXED: Add debouncing for map movement
  const debounceTimeoutRef = useRef(null);
  const lastCenterRef = useRef(null);
  const isUserDraggingRef = useRef(false);

  // FIXED: Debounced center change handler
  const debouncedCenterChange = useCallback((newCenter) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      // Only trigger if user is not currently dragging and center actually changed
      if (!isUserDraggingRef.current && onCenterChange) {
        const lastCenter = lastCenterRef.current;
        if (!lastCenter || 
            Math.abs(lastCenter.lat - newCenter.lat) > 0.001 || 
            Math.abs(lastCenter.lng - newCenter.lng) > 0.001) {
          
          console.log('🗺️ Map center changed (debounced):', newCenter);
          lastCenterRef.current = newCenter;
          onCenterChange(newCenter);
        }
      }
    }, 1000); // Wait 1 second after user stops moving map
  }, [onCenterChange]);

  // Initialize Google Map ONLY ONCE
  useEffect(() => {
    if (mapInitialized || !mapRef.current) return;

    const initMap = () => {
      if (!window.google || !window.google.maps) {
        console.error('Google Maps API not loaded');
        setMapError('Google Maps API non disponibile');
        return;
      }

      try {
        console.log('🗺️ Initializing Google Map ONCE...');

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
          
          // Styling
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'transit',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ],
          
          // Gestures
          gestureHandling: 'greedy',
          disableDoubleClickZoom: false,
          draggable: true,
          scrollwheel: true
        };

        googleMapRef.current = new window.google.maps.Map(mapRef.current, mapOptions);

        // FIXED: Improved map event listeners with debouncing
        googleMapRef.current.addListener('dragstart', () => {
          console.log('🗺️ User started dragging map');
          isUserDraggingRef.current = true;
        });

        googleMapRef.current.addListener('dragend', () => {
          console.log('🗺️ User finished dragging map');
          isUserDraggingRef.current = false;
          
          // Trigger debounced center change after drag ends
          const newCenter = googleMapRef.current.getCenter();
          debouncedCenterChange({
            lat: newCenter.lat(),
            lng: newCenter.lng()
          });
        });

        // FIXED: Less aggressive center change monitoring
        googleMapRef.current.addListener('center_changed', () => {
          if (!isUserDraggingRef.current) {
            const newCenter = googleMapRef.current.getCenter();
            debouncedCenterChange({
              lat: newCenter.lat(),
              lng: newCenter.lng()
            });
          }
        });

        googleMapRef.current.addListener('click', () => {
          if (selectedCafe && onClosePopup) {
            onClosePopup();
          }
        });

        googleMapRef.current.addListener('tilesloaded', () => {
          console.log('✅ Google Map loaded successfully');
          setMapLoaded(true);
          setMapError(null);
        });

        setMapInitialized(true);
        console.log('✅ Google Map initialized');

      } catch (error) {
        console.error('❌ Failed to initialize Google Map:', error);
        setMapError('Errore nell\'inizializzazione della mappa');
      }
    };

    // Check if Google Maps API is ready
    if (window.google && window.google.maps) {
      initMap();
    } else {
      // Wait for Google Maps API to load
      const checkGoogleMaps = () => {
        if (window.google && window.google.maps) {
          initMap();
        } else {
          setTimeout(checkGoogleMaps, 100);
        }
      };
      checkGoogleMaps();
    }
  }, []); // Empty dependency array - only run once!

  // Update map center and zoom when props change (but only if not user-initiated)
  useEffect(() => {
    if (googleMapRef.current && mapLoaded && mapInitialized && !isUserDraggingRef.current) {
      const currentCenter = googleMapRef.current.getCenter();
      const currentZoom = googleMapRef.current.getZoom();
      
      const newCenter = { lat: center.lat, lng: center.lng };
      
      // Only update if significantly different to avoid infinite loops
      if (!currentCenter || 
          Math.abs(currentCenter.lat() - newCenter.lat) > 0.01 || 
          Math.abs(currentCenter.lng() - newCenter.lng) > 0.01) {
        console.log('🗺️ Updating map center from props:', newCenter);
        googleMapRef.current.setCenter(newCenter);
        lastCenterRef.current = newCenter;
      }
      
      if (Math.abs(currentZoom - zoom) > 1) {
        console.log('🗺️ Updating map zoom from props:', zoom);
        googleMapRef.current.setZoom(zoom);
      }
    }
  }, [center.lat, center.lng, zoom, mapLoaded, mapInitialized]);

  // Update user location marker
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded || !userLocation) return;

    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    // Create new user marker with improved styling
    const userMarker = new window.google.maps.Marker({
      position: { 
        lat: userLocation.latitude, 
        lng: userLocation.longitude 
      },
      map: googleMapRef.current,
      title: 'La tua posizione',
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="8" fill="#4F46E5" stroke="#ffffff" stroke-width="3"/>
            <circle cx="12" cy="12" r="3" fill="#ffffff"/>
            <circle cx="12" cy="12" r="11" fill="none" stroke="#4F46E5" stroke-width="1" opacity="0.3"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(24, 24),
        anchor: new window.google.maps.Point(12, 12)
      },
      zIndex: 1000,
      animation: window.google.maps.Animation.DROP
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

    // Create new radius circle with improved styling
    const circle = new window.google.maps.Circle({
      center: { 
        lat: userLocation.latitude, 
        lng: userLocation.longitude 
      },
      radius: searchRadius,
      map: googleMapRef.current,
      fillColor: '#4F46E5',
      fillOpacity: 0.1,
      strokeColor: '#4F46E5',
      strokeOpacity: 0.4,
      strokeWeight: 2,
      clickable: false
    });

    radiusCircleRef.current = circle;
    console.log('🔍 Search radius circle updated:', searchRadius);
  }, [userLocation, searchRadius, mapLoaded]);

  // FIXED: Improved cafe markers with better clustering and performance
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;

    console.log('☕ Updating cafe markers:', cafes.length);

    // Clear existing markers efficiently
    markersRef.current.forEach(marker => {
      marker.setMap(null);
    });
    markersRef.current.clear();

    // Batch marker creation for better performance
    const markers = [];
    
    cafes.forEach((cafe, index) => {
      if (!cafe.location || !cafe.location.latitude || !cafe.location.longitude) {
        console.warn('Skipping cafe with invalid location:', cafe);
        return;
      }

      const marker = new window.google.maps.Marker({
        position: {
          lat: cafe.location.latitude,
          lng: cafe.location.longitude
        },
        map: googleMapRef.current,
        title: cafe.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C7.163 0 0 7.163 0 16C0 24.837 16 40 16 40S32 24.837 32 16C32 7.163 24.837 0 16 0Z" fill="${getMarkerColor(cafe)}"/>
              <circle cx="16" cy="16" r="8" fill="white"/>
              <text x="16" y="20" text-anchor="middle" font-size="12" fill="${getMarkerColor(cafe)}">${getMarkerEmoji(cafe)}</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 40),
          anchor: new window.google.maps.Point(16, 40)
        },
        zIndex: cafe.distance ? Math.round(1000 - cafe.distance / 10) : 500,
        // FIXED: Add animation for very close cafes
        animation: cafe.distance && cafe.distance < 300 ? 
          window.google.maps.Animation.BOUNCE : null
      });

      // Add click listener
      marker.addListener('click', () => {
        if (onCafeSelect) {
          onCafeSelect(cafe);
        }
      });

      markers.push(marker);
      markersRef.current.set(cafe.id || cafe.googlePlaceId, marker);
    });

    console.log('✅ Cafe markers updated:', markersRef.current.size);
  }, [cafes, mapLoaded, onCafeSelect]);

  // FIXED: Helper function to get marker color based on cafe properties and type
  const getMarkerColor = (cafe) => {
    // Different colors for different venue types
    if (cafe.placeType === 'pub' || (cafe.types && cafe.types.includes('night_club'))) {
      return '#EF4444'; // Red for pubs/nightlife
    }
    
    if (cafe.distance && cafe.distance < 300) return '#10B981'; // Very close - green
    if (cafe.distance && cafe.distance < 600) return '#F59E0B'; // Close - amber
    if (cafe.rating && cafe.rating >= 4.5) return '#8B5CF6';     // High rated - purple
    
    return '#6366F1'; // Default - indigo for cafeterias/bars
  };

  // FIXED: Helper function to get marker emoji based on Italian venue type
  const getMarkerEmoji = (cafe) => {
    if (cafe.placeType === 'pub' || (cafe.types && cafe.types.includes('night_club'))) {
      return '🍺'; // Beer for pubs
    }
    
    if (cafe.placeType === 'restaurant') {
      return '🍽️'; // Restaurant
    }
    
    return '☕'; // Coffee for cafeterias (including bars)
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear debounce timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
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
    setMapLoaded(false);
    setMapInitialized(false);
    
    // Force reload by refreshing the page
    window.location.reload();
  }, []);

  if (mapError) {
    return (
      <div className="map-error-container">
        <div className="map-error-content">
          <div className="error-icon">🗺️❌</div>
          <h3>Errore Mappa</h3>
          <p>{mapError}</p>
          <button 
            className="btn-apple-base btn-primary"
            onClick={handleRetryMap}
          >
            Riprova
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
          backgroundColor: '#f0f9ff' // Light blue background while loading
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
      {(loading || !mapLoaded) && (
        <MapLoadingOverlay 
          loading={loading}
          mapLoaded={mapLoaded}
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
          <span>❌ {error.message || 'Errore nel caricamento dei dati'}</span>
          <button onClick={onRefresh}>Riprova</button>
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
          <div>Map: {mapLoaded ? '✅' : '⏳'}</div>
          <div>Cafes: {cafes.length}</div>
          <div>Dragging: {isUserDraggingRef.current ? '🖱️' : '✋'}</div>
        </div>
      )}
    </div>
  );
};

export default FullPageMap;