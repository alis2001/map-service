// App.js - FIXED VERSION with Better Location Permission Handling
// Location: /map-service/frontend/src/App.js

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import FullPageMap from './components/FullPageMap';
import LoadingScreen from './components/LoadingScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useGeolocation } from './hooks/useGeolocation';
import { useCafes } from './hooks/useCafes';
import './styles/App.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <MapApp />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

function MapApp() {
  // State management
  const [selectedCafe, setSelectedCafe] = useState(null);
  const [mapCenter, setMapCenter] = useState({
    lat: parseFloat(process.env.REACT_APP_DEFAULT_LOCATION_LAT) || 45.0703,
    lng: parseFloat(process.env.REACT_APP_DEFAULT_LOCATION_LNG) || 7.6869
  });
  const [zoom, setZoom] = useState(parseInt(process.env.REACT_APP_DEFAULT_ZOOM) || 15);
  const [searchRadius, setSearchRadius] = useState(1500);
  const [cafeType, setCafeType] = useState('cafe');
  const [showControls, setShowControls] = useState(true);

  // Custom hooks
  const { 
    location: userLocation, 
    loading: locationLoading, 
    error: locationError,
    permissionGranted,
    shouldShowLocationModal,
    requestLocation,
    clearPermissionDenied
  } = useGeolocation();

  const {
    cafes,
    loading: cafesLoading,
    error: cafesError,
    refetch: refetchCafes
  } = useCafes(mapCenter.lat, mapCenter.lng, searchRadius, cafeType);

  // Update map center when user location is obtained
  useEffect(() => {
    if (userLocation && userLocation.source === 'gps') {
      console.log('📍 Updating map center to user location:', userLocation);
      setMapCenter({
        lat: userLocation.latitude,
        lng: userLocation.longitude
      });
      setZoom(16); // Zoom in when we have user location
    }
  }, [userLocation]);

  // Auto-refresh cafes when location changes
  useEffect(() => {
    if (mapCenter.lat && mapCenter.lng) {
      refetchCafes();
    }
  }, [mapCenter, searchRadius, cafeType, refetchCafes]);

  // Check for embed mode (when used as widget)
  const isEmbedMode = new URLSearchParams(window.location.search).get('embed') === 'true';
  
  // Handle URL parameters for embedding
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const embedLat = urlParams.get('lat');
    const embedLng = urlParams.get('lng');
    const embedType = urlParams.get('type');
    const embedRadius = urlParams.get('radius');
    const hideControls = urlParams.get('hideControls');

    if (embedLat && embedLng) {
      setMapCenter({
        lat: parseFloat(embedLat),
        lng: parseFloat(embedLng)
      });
    }

    if (embedType) {
      setCafeType(embedType);
    }

    if (embedRadius) {
      setSearchRadius(parseInt(embedRadius));
    }

    if (hideControls === 'true') {
      setShowControls(false);
    }
  }, []);

  // FIXED: Only show loading screen for initial app load, not location issues
  if (locationLoading && !userLocation && !isEmbedMode && !mapCenter.lat) {
    return (
      <LoadingScreen 
        message="Inizializzazione mappa..."
        subMessage="Preparazione del servizio di localizzazione"
      />
    );
  }

  // Handle cafe selection
  const handleCafeSelect = (cafe) => {
    setSelectedCafe(cafe);
    setMapCenter({
      lat: cafe.location.latitude,
      lng: cafe.location.longitude
    });
    setZoom(17);
  };

  // Handle map center change (when user drags the map)
  const handleMapCenterChange = (newCenter) => {
    setMapCenter(newCenter);
  };

  // Handle search options change
  const handleSearchChange = (options) => {
    if (options.radius !== undefined) {
      setSearchRadius(options.radius);
    }
    if (options.type !== undefined) {
      setCafeType(options.type);
      setSelectedCafe(null);
    }
  };

  // Handle close popup
  const handleClosePopup = () => {
    setSelectedCafe(null);
  };

  // FIXED: Better location request handling
  const handleLocationRequest = () => {
    // Clear any previous permission denied status
    clearPermissionDenied();
    // Request location again
    requestLocation();
  };

  // FIXED: Handle continue without GPS
  const handleContinueWithoutGPS = () => {
    // Just close the modal and continue with current location
    clearPermissionDenied();
  };

  return (
    <div className="map-app">
      {/* Full-Page Map */}
      <FullPageMap
        center={mapCenter}
        zoom={zoom}
        cafes={cafes}
        selectedCafe={selectedCafe}
        userLocation={userLocation}
        onCafeSelect={handleCafeSelect}
        onCenterChange={handleMapCenterChange}
        onClosePopup={handleClosePopup}
        loading={cafesLoading}
        error={cafesError}
        searchRadius={searchRadius}
        cafeType={cafeType}
        showControls={showControls}
        isEmbedMode={isEmbedMode}
        onSearchChange={handleSearchChange}
        onRefresh={refetchCafes}
        onLocationRequest={handleLocationRequest}
        locationLoading={locationLoading}
        locationError={locationError}
      />

      {/* FIXED: Location Permission Modal - Show on first visit or when permission needed */}
      {(!userLocation && !locationLoading && (shouldShowLocationModal || (!permissionGranted && !userLocation))) && !isEmbedMode && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>📍 Accesso alla Posizione</h3>
            </div>
            <div className="modal-content">
              <p>
                Per trovare i migliori caffè nelle vicinanze, abbiamo bisogno 
                di accedere alla tua posizione. Puoi anche continuare e cercare 
                manualmente spostando la mappa.
              </p>
              
              {/* Show current status */}
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                background: 'rgba(79, 70, 229, 0.05)',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#6B7280'
              }}>
                {userLocation ? (
                  <span>✅ Posizione attuale: {userLocation.city || 'Rilevata'} 
                    ({userLocation.source === 'gps' ? 'GPS' : 
                      userLocation.source === 'ip' ? 'IP' : 'Predefinita'})
                  </span>
                ) : (
                  <span>📍 In attesa di localizzazione...</span>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button 
                className="btn-apple-base btn-primary"
                onClick={handleLocationRequest}
                disabled={locationLoading}
              >
                {locationLoading ? 'Rilevamento...' : 'Abilita GPS'}
              </button>
              <button 
                className="btn-apple-base btn-secondary"
                onClick={handleContinueWithoutGPS}
              >
                Continua senza GPS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIXED: Status indicator for location */}
      {!isEmbedMode && (
        <div style={{
          position: 'fixed',
          bottom: '16px',
          left: '16px',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          padding: '8px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          color: '#6B7280',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          zIndex: 1000
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: userLocation?.source === 'gps' ? '#10B981' : 
                        userLocation?.source === 'ip' ? '#F59E0B' : '#6B7280'
          }} />
          <span>
            {userLocation?.source === 'gps' ? '📍 GPS attivo' :
             userLocation?.source === 'ip' ? '🌐 Posizione IP' :
             userLocation?.source === 'cache' ? '💾 Posizione salvata' :
             '📍 Posizione predefinita'}
          </span>
          {userLocation?.accuracy && userLocation.accuracy < 100 && (
            <span style={{ color: '#10B981', fontWeight: '600' }}>
              ±{Math.round(userLocation.accuracy)}m
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default App;