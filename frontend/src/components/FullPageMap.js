// components/FullPageMap.js
// Location: /map-service/frontend/src/components/FullPageMap.js

import React, { useRef, useEffect, useState, useCallback } from 'react';
import CafePopup from './CafePopup';
import MapControls from './MapControls';
import { MapLoadingOverlay } from './MapLoadingOverlay';

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

  // Initialize Google Map
  useEffect(() => {
    const initMap = () => {
      if (!window.google || !window.google.maps) {
        console.error('Google Maps API not loaded');
        setMapError('Google Maps API non disponibile');
        return;
      }

      if (!mapRef.current) {
        console.error('Map container ref not available');
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
          
          // Restrictions for better UX
          restriction: {
            latLngBounds: {
              north: 85,
              south: -85,
              west: -180,
              east: 180
            }
          },
          
          // Gestures
          gestureHandling: 'greedy',
          disableDoubleClickZoom: false,
          draggable: true,
          scrollwheel: true
        };

        googleMapRef.current = new window.google.maps.Map(mapRef.current, mapOptions);

        // Map event listeners
        googleMapRef.current.addListener('center_changed', () => {
          const newCenter = googleMapRef.current.getCenter();
          if (onCenterChange) {
            onCenterChange({
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
  }, [center.lat, center.lng, zoom, isEmbedMode, onCenterChange, onClosePopup, selectedCafe]);

  // Update map center and zoom
  useEffect(() => {
    if (googleMapRef.current && mapLoaded) {
      const currentCenter = googleMapRef.current.getCenter();
      const currentZoom = googleMapRef.current.getZoom();
      
      const newCenter = { lat: center.lat, lng: center.lng };
      
      // Only update if significantly different to avoid infinite loops
      if (!currentCenter || 
          Math.abs(currentCenter.lat() - newCenter.lat) > 0.0001 || 
          Math.abs(currentCenter.lng() - newCenter.lng) > 0.0001) {
        googleMapRef.current.panTo(newCenter);
      }
      
      if (currentZoom !== zoom) {
        googleMapRef.current.setZoom(zoom);
      }
    }
  }, [center.lat, center.lng, zoom, mapLoaded]);

  // Update user location marker
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded || !userLocation) return;

    // Remove existing user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    // Create new user marker
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
          </svg>
        `),
        scaledSize: new window.google.maps.Size(24, 24),
        anchor: new window.google.maps.Point(12, 12)
      },
      zIndex: 1000
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

    // Create new radius circle
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
      strokeOpacity: 0.3,
      strokeWeight: 2,
      clickable: false
    });

    radiusCircleRef.current = circle;

    console.log('🔍 Search radius circle updated:', searchRadius);
  }, [userLocation, searchRadius, mapLoaded]);

  // Update cafe markers
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;

    console.log('☕ Updating cafe markers:', cafes.length);

    // Clear existing markers
    markersRef.current.forEach(marker => {
      marker.setMap(null);
    });
    markersRef.current.clear();

    // Add new markers
    cafes.forEach(cafe => {
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
              <text x="16" y="20" text-anchor="middle" font-size="12" fill="${getMarkerColor(cafe)}">${cafe.emoji || '☕'}</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 40),
          anchor: new window.google.maps.Point(16, 40)
        },
        animation: cafe.distance && cafe.distance < 500 ? 
          window.google.maps.Animation.BOUNCE : null,
        zIndex: cafe.distance ? Math.round(1000 - cafe.distance / 10) : 500
      });

      // Add click listener
      marker.addListener('click', () => {
        if (onCafeSelect) {
          onCafeSelect(cafe);
        }
      });

      markersRef.current.set(cafe.id || cafe.googlePlaceId, marker);
    });

    console.log('✅ Cafe markers updated:', markersRef.current.size);
  }, [cafes, mapLoaded, onCafeSelect]);

  // Helper function to get marker color based on cafe properties
  const getMarkerColor = (cafe) => {
    if (cafe.distance && cafe.distance < 300) return '#10B981'; // Very close - green
    if (cafe.distance && cafe.distance < 600) return '#F59E0B'; // Close - amber
    if (cafe.rating && cafe.rating >= 4.5) return '#8B5CF6';     // High rated - purple
    if (cafe.type === 'bar') return '#EF4444';                  // Bars - red
    return '#6366F1';                                            // Default - indigo
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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
    
    // Reload the page to reinitialize Google Maps
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
    </div>
  );
};

export default FullPageMap;