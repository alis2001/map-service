// App.js - ULTRA-FAST LOADING - Instant Ready
// Location: /map-service/frontend/src/App.js

import React, { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import FullPageMap from './components/FullPageMap';
import LoadingScreen from './components/LoadingScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useGeolocation } from './hooks/useGeolocation';
import { useCafes } from './hooks/useCafes';
import { healthAPI } from './services/apiService';
import './styles/App.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 2 * 60 * 1000, // 2 minutes
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
  // ULTRA-FAST initialization states
  const [backendReady, setBackendReady] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [appReady, setAppReady] = useState(false);
  
  // App state management
  const [selectedCafe, setSelectedCafe] = useState(null);
  const [mapCenter, setMapCenter] = useState({
    lat: parseFloat(process.env.REACT_APP_DEFAULT_LOCATION_LAT) || 45.0703,
    lng: parseFloat(process.env.REACT_APP_DEFAULT_LOCATION_LNG) || 7.6869
  });
  const [zoom, setZoom] = useState(parseInt(process.env.REACT_APP_DEFAULT_ZOOM) || 15);
  const [searchRadius, setSearchRadius] = useState(1500);
  const [cafeType, setCafeType] = useState('cafe');
  const [showControls, setShowControls] = useState(true);

  // ULTRA-FAST geolocation hook
  const { 
    location: userLocation, 
    loading: locationLoading, 
    error: locationError,
    detectionMethod,
    locationCapability,
    hasLocation,
    isHighAccuracy,
    qualityText,
    sourceText,
    isDetecting,
    isDefault
  } = useGeolocation();

  const {
    cafes,
    loading: cafesLoading,
    error: cafesError,
    refetch: refetchCafes
  } = useCafes(mapCenter.lat, mapCenter.lng, searchRadius, cafeType);

  // 🏥 **ULTRA-FAST BACKEND CHECK**
  const checkBackendHealth = useCallback(async () => {
    try {
      console.log('🔍 Ultra-fast backend check...');
      
      const healthResult = await healthAPI.checkHealth();
      
      if (healthResult.success && (healthResult.status === 'OK' || healthResult.status === 'healthy' || healthResult.status === 'DEGRADED')) {
        console.log('✅ Backend ready instantly');
        setBackendReady(true);
        setBackendError(null);
        return true;
      } else {
        throw new Error(healthResult.error || `Backend status: ${healthResult.status || 'unknown'}`);
      }
    } catch (error) {
      console.warn(`⚠️ Backend not ready:`, error.message);
      setBackendError('Backend starting up...');
      setBackendReady(false);
      return false;
    }
  }, []);

  // 🚀 **INSTANT INITIALIZATION**
  useEffect(() => {
    console.log('🚀 Starting INSTANT app initialization...');
    
    const initializeInstantly = async () => {
      // Quick backend check
      const backendOk = await checkBackendHealth();
      
      if (backendOk) {
        console.log('⚡ App ready INSTANTLY');
        setAppReady(true);
      } else {
        // Don't block the app - continue with degraded mode
        console.log('⚡ App ready with degraded backend');
        setAppReady(true);
      }
    };

    // Start immediately - no artificial delays
    initializeInstantly();
  }, [checkBackendHealth]);

  // 🗺️ **INSTANT MAP CENTER UPDATE**
  useEffect(() => {
    if (userLocation && !locationLoading && hasLocation && !isDefault) {
      console.log('📍 INSTANT map update to user location:', {
        lat: userLocation.latitude.toFixed(6),
        lng: userLocation.longitude.toFixed(6),
        source: sourceText,
        quality: qualityText
      });
      
      // Instantly move to user location
      setMapCenter({
        lat: userLocation.latitude,
        lng: userLocation.longitude
      });
      
      // Smart zoom based on accuracy
      if (isHighAccuracy) {
        setZoom(17);
      } else {
        setZoom(16);
      }
    }
  }, [userLocation, locationLoading, hasLocation, isHighAccuracy, qualityText, sourceText, isDefault]);

  // 🔄 **INSTANT CAFE DATA REFRESH**
  useEffect(() => {
    if (mapCenter.lat && mapCenter.lng && appReady) {
      console.log('🔄 INSTANT cafe data refresh');
      refetchCafes();
    }
  }, [mapCenter, searchRadius, cafeType, refetchCafes, appReady]);

  // 🎛️ **URL PARAMETERS**
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

    if (embedType && ['cafe', 'restaurant'].includes(embedType)) {
      setCafeType(embedType);
    }

    if (embedRadius) {
      setSearchRadius(parseInt(embedRadius));
    }

    if (hideControls === 'true') {
      setShowControls(false);
    }
  }, []);

  // 📱 **DETECT EMBED MODE**
  const isEmbedMode = new URLSearchParams(window.location.search).get('embed') === 'true';

  // 🎬 **MINIMAL LOADING SCREEN - Only show for 500ms max**
  if (!appReady) {
    return (
      <LoadingScreen 
        message="Avvio mappa..."
        subMessage={backendError || "Preparazione"}
        progress={90} // Always show high progress
        showRetry={!!backendError}
        onRetry={() => {
          setBackendError(null);
          checkBackendHealth();
        }}
      />
    );
  }

  // 🎯 **EVENT HANDLERS**
  const handleCafeSelect = (venue) => {
    setSelectedCafe(venue);
    setMapCenter({
      lat: venue.location.latitude,
      lng: venue.location.longitude
    });
    setZoom(17);
  };

  const handleMapCenterChange = (newCenter) => {
    setMapCenter(newCenter);
  };

  const handleSearchChange = (options) => {
    if (options.radius !== undefined) {
      setSearchRadius(options.radius);
    }
    if (options.type !== undefined) {
      if (['cafe', 'restaurant'].includes(options.type)) {
        setCafeType(options.type);
        setSelectedCafe(null);
      }
    }
  };

  const handleClosePopup = () => {
    setSelectedCafe(null);
  };

  return (
    <div className="map-app">
      {/* INSTANT Full-Page Map */}
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
        locationLoading={locationLoading}
        locationError={locationError}
        detectionMethod={detectionMethod}
        locationCapability={locationCapability}
      />

      {/* Debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '11px',
          fontFamily: 'monospace',
          zIndex: 10000,
          maxWidth: '300px'
        }}>
          <div>🗺️ Map: {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}</div>
          <div>📍 Location: {sourceText} ({qualityText})</div>
          <div>☕ Cafes: {cafes.length} found</div>
          <div>⚡ Backend: {backendReady ? 'Ready' : 'Loading'}</div>
          {isDefault && <div style={{color: '#fbbf24'}}>🎯 Using default Turin location</div>}
        </div>
      )}
    </div>
  );
}

export default App;