// App.js - Full-Page Map Component
// Location: /map-service/frontend/src/App.js

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import FullPageMap from './components/FullPageMap';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
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
    requestLocation 
  } = useGeolocation();

  const {
    cafes,
    loading: cafesLoading,
    error: cafesError,
    refetch: refetchCafes
  } = useCafes(mapCenter.lat, mapCenter.lng, searchRadius, cafeType);

  // Update map center when user location is obtained
  useEffect(() => {
    if (userLocation) {
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

  // Show loading screen while initializing (only if not embed mode)
  if (locationLoading && !userLocation && !isEmbedMode) {
    return (
      <LoadingScreen 
        message="Rilevamento posizione..."
        subMessage="Stiamo trovando i migliori caffè nelle vicinanze"
      />
    );
  }

  // Handle location permission denied
  const handleLocationRequest = () => {
    requestLocation();
  };

  // Handle cafe selection
  const handleCafeSelect = (cafe) => {
    setSelectedCafe(cafe);
    // Center map on selected cafe with smooth animation
    setMapCenter({
      lat: cafe.location.latitude,
      lng: cafe.location.longitude
    });
    setZoom(17); // Zoom in closer when selecting a cafe
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
      setSelectedCafe(null); // Clear selection when changing type
    }
  };

  // Handle close popup
  const handleClosePopup = () => {
    setSelectedCafe(null);
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

      {/* Location Permission Modal (only if not embed mode) */}
      {locationError && !isEmbedMode && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>📍 Accesso alla Posizione</h3>
            </div>
            <div className="modal-content">
              <p>
                Per trovare i migliori caffè nelle vicinanze, abbiamo bisogno 
                di accedere alla tua posizione. Puoi anche cercare manualmente 
                spostando la mappa.
              </p>
            </div>
            <div className="modal-actions">
              <button 
                className="btn-apple-base btn-primary"
                onClick={handleLocationRequest}
              >
                Riprova
              </button>
              <button 
                className="btn-apple-base btn-secondary"
                onClick={() => window.location.reload()}
              >
                Continua senza GPS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;