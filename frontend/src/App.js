// App.js - FULLY AUTOMATIC LOCATION & FAST LOADING
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
      retry: 1, // Reduced retries for faster experience
      staleTime: 3 * 60 * 1000, // 3 minutes (reduced)
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
  // Fast initialization states
  const [backendReady, setBackendReady] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [initializationProgress, setInitializationProgress] = useState(0);
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

  // Automatic geolocation hook
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
    isDetecting
  } = useGeolocation();

  const {
    cafes,
    loading: cafesLoading,
    error: cafesError,
    refetch: refetchCafes
  } = useCafes(mapCenter.lat, mapCenter.lng, searchRadius, cafeType);

  // 🏥 **FAST BACKEND HEALTH CHECK**
  const checkBackendHealth = useCallback(async () => {
    try {
      console.log('🔍 Fast backend health check...');
      setInitializationProgress(20);
      
      const healthResult = await healthAPI.checkHealth();
      
      if (healthResult.success && (healthResult.status === 'OK' || healthResult.status === 'healthy' || healthResult.status === 'DEGRADED')) {
        console.log('✅ Backend ready');
        setBackendReady(true);
        setBackendError(null);
        setInitializationProgress(60);
        return true;
      } else {
        throw new Error(healthResult.error || `Backend status: ${healthResult.status || 'unknown'}`);
      }
    } catch (error) {
      console.error(`❌ Backend health check failed:`, error.message);
      setBackendError('Servizio temporaneamente non disponibile');
      setBackendReady(false);
      return false;
    }
  }, []);

  // 🚀 **FAST INITIALIZATION**
  useEffect(() => {
    console.log('🚀 Starting fast app initialization...');
    setInitializationProgress(10);
    
    const initializeApp = async () => {
      // Quick backend check
      const backendOk = await checkBackendHealth();
      
      if (backendOk) {
        setInitializationProgress(80);
        
        // Short delay to show we're ready
        setTimeout(() => {
          setAppReady(true);
          setInitializationProgress(100);
        }, 300); // Very short delay
      }
    };

    initializeApp();
  }, [checkBackendHealth]);

  // 🗺️ **AUTO-UPDATE MAP CENTER WHEN LOCATION IS FOUND**
  useEffect(() => {
    if (userLocation && !locationLoading && hasLocation) {
      console.log('📍 Auto-updating map to user location:', {
        lat: userLocation.latitude.toFixed(6),
        lng: userLocation.longitude.toFixed(6),
        source: sourceText,
        quality: qualityText
      });
      
      // Automatically move to user location
      setMapCenter({
        lat: userLocation.latitude,
        lng: userLocation.longitude
      });
      
      // Auto-adjust zoom based on accuracy
      if (isHighAccuracy) {
        setZoom(17); // High accuracy - zoom in more
      } else {
        setZoom(16); // Standard zoom
      }
    }
  }, [userLocation, locationLoading, hasLocation, isHighAccuracy, qualityText, sourceText]);

  // 🔄 **AUTO-REFRESH CAFE DATA**
  useEffect(() => {
    if (mapCenter.lat && mapCenter.lng && backendReady && appReady) {
      console.log('🔄 Auto-refreshing cafe data');
      refetchCafes();
    }
  }, [mapCenter, searchRadius, cafeType, refetchCafes, backendReady, appReady]);

  // 🎛️ **URL PARAMETERS HANDLING**
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

  // 🎬 **FAST LOADING SCREEN LOGIC**
  if (!appReady) {
    let loadingMessage = "Caricamento mappa...";
    let subMessage = "";
    
    if (backendError) {
      loadingMessage = "Riconnessione...";
      subMessage = backendError;
    } else if (initializationProgress < 60) {
      loadingMessage = "Avvio servizi...";
      subMessage = "Connessione backend";
    } else if (initializationProgress < 80) {
      loadingMessage = "Preparazione mappa...";
      subMessage = "Inizializzazione componenti";
    } else {
      loadingMessage = "Quasi pronto...";
      subMessage = "Finalizzazione";
    }

    return (
      <LoadingScreen 
        message={loadingMessage}
        subMessage={subMessage}
        progress={initializationProgress}
        showRetry={!!backendError}
        onRetry={() => {
          setBackendError(null);
          setInitializationProgress(5);
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
        locationLoading={locationLoading}
        locationError={locationError}
        detectionMethod={detectionMethod}
        locationCapability={locationCapability}
      />

      {/* Simplified Status Indicator (No Location Controls) */}
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
            background: 
              !backendReady ? '#EF4444' :
              hasLocation && userLocation?.source === 'gps' ? '#10B981' :
              hasLocation && userLocation?.source === 'browser' ? '#8B5CF6' :
              hasLocation && userLocation?.source === 'cache' ? '#F59E0B' : '#6B7280'
          }} />
          <span>
            {!backendReady ? '🔴 Offline' :
            hasLocation && userLocation?.source === 'gps' ? '📍 GPS' :
            hasLocation && userLocation?.source === 'browser' ? '🌐 Rete' :
            hasLocation && userLocation?.source === 'cache' ? '💾 Cache' :
            isDetecting ? '🔄 Ricerca...' :
            '📍 Predefinita'}
            {userLocation?.accuracy && userLocation.accuracy < 100 && (
              <span style={{ color: '#10B981', fontWeight: '600', marginLeft: '4px' }}>
                ±{Math.round(userLocation.accuracy)}m
              </span>
            )}
          </span>
        </div>
      )}

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          top: '16px',
          left: '16px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px',
          borderRadius: '8px',
          fontSize: '10px',
          fontFamily: 'monospace',
          zIndex: 1001,
          maxWidth: '200px'
        }}>
          <div>Detecting: {isDetecting ? 'Yes' : 'No'}</div>
          <div>Method: {detectionMethod}</div>
          <div>Capability: {locationCapability}</div>
          <div>Source: {sourceText}</div>
          <div>Quality: {qualityText}</div>
          {userLocation && (
            <>
              <div>Lat: {userLocation.latitude.toFixed(6)}</div>
              <div>Lng: {userLocation.longitude.toFixed(6)}</div>
              <div>Acc: {Math.round(userLocation.accuracy || 0)}m</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;