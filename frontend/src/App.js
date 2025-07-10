// App.js - UPDATED VERSION - No Default Location, Ultra-Fast Detection
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
  // Backend status
  const [backendReady, setBackendReady] = useState(false);
  const [backendError, setBackendError] = useState(null);
  const [appReady, setAppReady] = useState(false);
  
  // App state management
  const [selectedCafe, setSelectedCafe] = useState(null);
  const [mapCenter, setMapCenter] = useState(null); // No default center
  const [zoom, setZoom] = useState(15);
  const [searchRadius, setSearchRadius] = useState(1500);
  const [cafeType, setCafeType] = useState('cafe');
  const [showControls, setShowControls] = useState(true);
  const [locationRequested, setLocationRequested] = useState(false);

  // 🚀 **ULTRA-FAST GEOLOCATION HOOK**
  const { 
    location: userLocation, 
    loading: locationLoading, 
    error: locationError,
    hasLocation,
    isHighAccuracy,
    qualityText,
    sourceText,
    isDetecting,
    detectionMethod,
    refreshLocation,
    getPreciseLocation
  } = useGeolocation();

  // Only fetch cafes when we have a real user location
  const {
    cafes,
    loading: cafesLoading,
    error: cafesError,
    refetch: refetchCafes
  } = useCafes(
    mapCenter?.lat, 
    mapCenter?.lng, 
    searchRadius, 
    cafeType
  );

  // 🏥 **BACKEND HEALTH CHECK**
  const checkBackendHealth = useCallback(async () => {
    try {
      console.log('🔍 Checking backend health...');
      const healthResult = await healthAPI.checkHealth();
      
      if (healthResult.success && (healthResult.status === 'OK' || healthResult.status === 'healthy' || healthResult.status === 'DEGRADED')) {
        console.log('✅ Backend ready');
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

  // 🚀 **APP INITIALIZATION**
  useEffect(() => {
    console.log('🚀 Starting app initialization...');
    
    const initializeApp = async () => {
      // Quick backend check
      const backendOk = await checkBackendHealth();
      
      if (backendOk) {
        console.log('⚡ App ready');
        setAppReady(true);
      } else {
        // Continue with degraded mode
        console.log('⚡ App ready with degraded backend');
        setAppReady(true);
      }
    };

    initializeApp();
  }, [checkBackendHealth]);

  // 🗺️ **MAP CENTER UPDATE - Only from Real User Location**
  useEffect(() => {
    if (userLocation && hasLocation && !locationLoading) {
      console.log('📍 Setting map center to user location:', {
        lat: userLocation.latitude.toFixed(6),
        lng: userLocation.longitude.toFixed(6),
        source: sourceText,
        quality: qualityText,
        method: detectionMethod
      });
      
      // Set map center to user's actual location
      setMapCenter({
        lat: userLocation.latitude,
        lng: userLocation.longitude
      });
      
      // Smart zoom based on accuracy
      if (isHighAccuracy) {
        setZoom(17); // High accuracy = close zoom
      } else if (userLocation.accuracy < 1000) {
        setZoom(16); // Good accuracy = medium zoom
      } else {
        setZoom(15); // Lower accuracy = wider zoom
      }
      
      setLocationRequested(true);
    }
  }, [userLocation, hasLocation, locationLoading, isHighAccuracy, qualityText, sourceText, detectionMethod]);

  // 🔄 **CAFE DATA REFRESH**
  useEffect(() => {
    if (mapCenter && mapCenter.lat && mapCenter.lng && appReady) {
      console.log('🔄 Refreshing cafe data for location');
      refetchCafes();
    }
  }, [mapCenter, searchRadius, cafeType, refetchCafes, appReady]);

  // 🎛️ **URL PARAMETERS**
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const embedType = urlParams.get('type');
    const embedRadius = urlParams.get('radius');
    const hideControls = urlParams.get('hideControls');

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

  // 🎬 **LOADING SCREEN CONDITIONS**
  if (!appReady) {
    return (
      <LoadingScreen 
        message="Avvio applicazione..."
        subMessage={backendError || "Preparazione servizi"}
        progress={85}
        showRetry={!!backendError}
        onRetry={() => {
          setBackendError(null);
          checkBackendHealth();
        }}
      />
    );
  }

  // 📍 **WAITING FOR LOCATION**
  if (locationLoading || isDetecting || !hasLocation) {
    return (
      <LoadingScreen 
        message={
          locationLoading ? "Rilevamento posizione..." :
          isDetecting ? "Localizzazione in corso..." :
          locationError ? "Posizione richiesta" : "Attesa posizione..."
        }
        subMessage={
          locationError ? 
            "Abilita la localizzazione per utilizzare l'app" :
            `Metodo: ${detectionMethod || 'in corso'} • Qualità: ${qualityText || 'rilevamento'}`
        }
        progress={locationLoading ? 60 : 90}
        showRetry={!!locationError}
        onRetry={() => {
          console.log('🔄 User requested location retry');
          refreshLocation();
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

  const handleLocationRetry = () => {
    console.log('🔄 Retrying location detection...');
    refreshLocation();
  };

  const handlePreciseLocation = async () => {
    try {
      console.log('🎯 Getting precise location...');
      await getPreciseLocation();
    } catch (error) {
      console.error('❌ Precise location failed:', error);
    }
  };

  return (
    <div className="map-app">
      {/* Main Map Interface */}
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
        locationCapability={hasLocation ? 'good' : 'unknown'}
        onLocationRetry={handleLocationRetry}
        onPreciseLocation={handlePreciseLocation}
        qualityText={qualityText}
        sourceText={sourceText}
      />


    </div>
  );
}

export default App;