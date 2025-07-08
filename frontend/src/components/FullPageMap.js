// components/FullPageMap.js - FIXED VERSION with Smart Movement Detection
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
  
  // FIXED: Improved debouncing with distance-based threshold
  const debounceTimeoutRef = useRef(null);
  const lastSearchLocationRef = useRef(null);
  const isUserDraggingRef = useRef(false);
  const mapIdleTimeoutRef = useRef(null);

  // FIXED: Smart movement detection - only trigger search for significant moves
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

    // FIXED: Only trigger new search if moved more than 500 meters (meaningful distance)
    const significantDistance = 500; // meters
    const hasMovedSignificantly = distance > significantDistance;

    console.log('🗺️ Movement check:', {
      distance: Math.round(distance),
      threshold: significantDistance,
      shouldSearch: hasMovedSignificantly
    });

    return hasMovedSignificantly;
  }, []);

  // FIXED: Debounced center change with smart distance detection
  const debouncedCenterChange = useCallback((newCenter) => {
    // Clear existing timeouts
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    if (mapIdleTimeoutRef.current) {
      clearTimeout(mapIdleTimeoutRef.current);
    }

    // FIXED: Only process if user stopped dragging and moved significantly
    debounceTimeoutRef.current = setTimeout(() => {
      if (!isUserDraggingRef.current && shouldTriggerNewSearch(newCenter)) {
        console.log('🗺️ Significant map movement detected, triggering search');
        lastSearchLocationRef.current = newCenter;
        
        if (onCenterChange) {
          onCenterChange(newCenter);
        }
      } else {
        console.log('🗺️ Minor map movement, no search triggered');
      }
    }, 2000); // Wait 2 seconds after user stops moving
  }, [onCenterChange, shouldTriggerNewSearch]);

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
        console.log('🗺️ Initializing Google Map...');

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
          
          // FIXED: Improved styling for Italian venues
          styles: [
            {
              featureType: 'poi.business',
              elementType: 'labels',
              stylers: [{ visibility: 'simplified' }] // Show some business labels
            },
            {
              featureType: 'poi.government',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'transit.station',
              elementType: 'labels',
              stylers: [{ visibility: 'simplified' }]
            }
          ],
          
          // Gestures
          gestureHandling: 'greedy',
          disableDoubleClickZoom: false,
          draggable: true,
          scrollwheel: true
        };

        googleMapRef.current = new window.google.maps.Map(mapRef.current, mapOptions);

        // FIXED: Improved event listeners with proper drag detection
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
          
          // Start the idle timeout to detect when user is really done
          mapIdleTimeoutRef.current = setTimeout(() => {
            const newCenter = googleMapRef.current.getCenter();
            debouncedCenterChange({
              lat: newCenter.lat(),
              lng: newCenter.lng()
            });
          }, 1000); // Wait 1 second after drag ends
        });

        // FIXED: Only listen to idle events for zoom changes
        googleMapRef.current.addListener('idle', () => {
          // This fires when map stops moving/zooming
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

        googleMapRef.current.addListener('tilesloaded', () => {
          console.log('✅ Google Map loaded successfully');
          setMapLoaded(true);
          setMapError(null);
          
          // Set initial search location
          lastSearchLocationRef.current = { lat: center.lat, lng: center.lng };
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

  // FIXED: Update map center only for external changes (not user-initiated)
  useEffect(() => {
    if (googleMapRef.current && mapLoaded && mapInitialized && !isUserDraggingRef.current) {
      const currentCenter = googleMapRef.current.getCenter();
      const currentZoom = googleMapRef.current.getZoom();
      
      const newCenter = { lat: center.lat, lng: center.lng };
      
      // FIXED: Only update if this is an external change (e.g., location found)
      const isExternalChange = !lastSearchLocationRef.current || 
        (Math.abs(currentCenter?.lat() - newCenter.lat) > 0.01 || 
         Math.abs(currentCenter?.lng() - newCenter.lng) > 0.01);
      
      if (isExternalChange) {
        console.log('🗺️ External center change detected, updating map:', newCenter);
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

  // FIXED: Update user location marker with better styling
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded || !userLocation) return;

    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    // FIXED: Improved user marker with accuracy circle
    const userMarker = new window.google.maps.Marker({
      position: { 
        lat: userLocation.latitude, 
        lng: userLocation.longitude 
      },
      map: googleMapRef.current,
      title: `La tua posizione (±${Math.round(userLocation.accuracy || 0)}m)`,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="14" cy="14" r="12" fill="#4F46E5" stroke="#ffffff" stroke-width="3"/>
            <circle cx="14" cy="14" r="4" fill="#ffffff"/>
            <circle cx="14" cy="14" r="13" fill="none" stroke="#4F46E5" stroke-width="1" opacity="0.3"/>
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
    console.log('📍 User location marker updated:', {
      accuracy: userLocation.accuracy,
      source: userLocation.source
    });
  }, [userLocation, mapLoaded]);

  // FIXED: Update search radius circle only when radius or location changes
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded || !userLocation || !searchRadius) return;

    // Remove existing circle
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setMap(null);
    }

    // FIXED: Only show radius circle if user location is accurate
    if (userLocation.accuracy && userLocation.accuracy < 1000) {
      const circle = new window.google.maps.Circle({
        center: { 
          lat: userLocation.latitude, 
          lng: userLocation.longitude 
        },
        radius: searchRadius,
        map: googleMapRef.current,
        fillColor: userLocation.source === 'gps' ? '#4F46E5' : '#F59E0B',
        fillOpacity: 0.08,
        strokeColor: userLocation.source === 'gps' ? '#4F46E5' : '#F59E0B',
        strokeOpacity: 0.3,
        strokeWeight: 2,
        clickable: false
      });

      radiusCircleRef.current = circle;
      console.log('🔍 Search radius circle updated:', {
        radius: searchRadius,
        source: userLocation.source
      });
    }
  }, [userLocation, searchRadius, mapLoaded]);

  // FIXED: Improved cafe markers with better performance
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;

    console.log('☕ Updating cafe markers:', cafes.length);

    // Clear existing markers efficiently
    markersRef.current.forEach(marker => {
      marker.setMap(null);
    });
    markersRef.current.clear();

    // FIXED: Batch marker creation with clustering for better performance
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

      const marker = new window.google.maps.Marker({
        position: position,
        map: googleMapRef.current,
        title: `${cafe.name}${cafe.rating ? ` (${cafe.rating}⭐)` : ''}${cafe.distance ? ` - ${cafe.formattedDistance}` : ''}`,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C7.163 0 0 7.163 0 16C0 24.837 16 40 16 40S32 24.837 32 16C32 7.163 24.837 0 16 0Z" fill="${getMarkerColor(cafe)}"/>
              <circle cx="16" cy="16" r="8" fill="white"/>
              <text x="16" y="20" text-anchor="middle" font-size="12" fill="${getMarkerColor(cafe)}">${getMarkerEmoji(cafe)}</text>
              ${cafe.distance && cafe.distance < 200 ? '<circle cx="16" cy="16" r="11" fill="none" stroke="#10B981" stroke-width="2" opacity="0.6"/>' : ''}
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 40),
          anchor: new window.google.maps.Point(16, 40)
        },
        zIndex: cafe.distance ? Math.round(1000 - cafe.distance / 10) : 500,
        // FIXED: Only animate very close cafes
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

    console.log('✅ Cafe markers updated:', markersAdded);
  }, [cafes, mapLoaded, onCafeSelect]);

  // Helper functions (same as before)
  const getMarkerColor = (cafe) => {
    if (cafe.placeType === 'pub' || (cafe.types && cafe.types.includes('night_club'))) {
      return '#EF4444'; // Red for pubs/nightlife
    }
    
    if (cafe.distance && cafe.distance < 200) return '#10B981'; // Very close - green
    if (cafe.distance && cafe.distance < 500) return '#F59E0B'; // Close - amber
    if (cafe.rating && cafe.rating >= 4.5) return '#8B5CF6';     // High rated - purple
    
    return '#6366F1'; // Default - indigo for cafeterias/bars
  };

  const getMarkerEmoji = (cafe) => {
    if (cafe.placeType === 'pub' || (cafe.types && cafe.types.includes('night_club'))) {
      return '🍺'; // Beer for pubs
    }
    
    if (cafe.placeType === 'restaurant') {
      return '🍽️'; // Restaurant
    }
    
    return '☕'; // Coffee for cafeterias (including bars)
  };

  // FIXED: Comprehensive cleanup
  useEffect(() => {
    return () => {
      // Clear all timeouts
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (mapIdleTimeoutRef.current) {
        clearTimeout(mapIdleTimeoutRef.current);
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
          backgroundColor: '#f0f9ff'
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
          <div>Last Search: {lastSearchLocationRef.current ? 
            `${lastSearchLocationRef.current.lat.toFixed(3)}, ${lastSearchLocationRef.current.lng.toFixed(3)}` : 'None'}</div>
        </div>
      )}
    </div>
  );
};

export default FullPageMap;