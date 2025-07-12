// App.js - UPDATED VERSION - No Default Location, Ultra-Fast Detection + RATE LIMIT RECOVERY
// Location: /map-service/frontend/src/App.js

import React, { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import FullPageMap from './components/FullPageMap';
import LoadingScreen from './components/LoadingScreen';
import StartupLoadingScreen from './components/StartupLoadingScreen'; // ADDED: Missing import
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
  const [searchRadius, setSearchRadius] = useState(2000);
  const [cafeType, setCafeType] = useState('cafe');
  const [showControls, setShowControls] = useState(true);
  const [isEmbedMode] = useState(false);
  const [locationRequested, setLocationRequested] = useState(false);
  const [locationCapability, setLocationCapability] = useState('unknown');

  // Rate limit recovery state
  const [isRateLimitRecovery, setIsRateLimitRecovery] = useState(false);

  // ADDED: Missing startup loading state variables
  const [loadingStage, setLoadingStage] = useState('initializing');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isFullyReady, setIsFullyReady] = useState(false);

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
    refetch: refetchCafes,
    isRefreshing // from enhanced useCafes hook
  } = useCafes(
    mapCenter?.lat, 
    mapCenter?.lng, 
    searchRadius, 
    cafeType
  );

  // Rate limit detection - ONLY for confirmed API errors
  useEffect(() => {
    if (cafesError && cafesError.message) {
      // VERY PRECISE detection - only trigger on confirmed rate limit message
      const isConfirmedRateLimit = 
        cafesError.message.includes('RATE_LIMIT_CONFIRMED:') ||
        cafesError.message.includes('troppe richieste') ||
        cafesError.message.includes('Too Many Requests') ||
        cafesError.message.includes('429') ||
        (cafesError.status === 429);
      
      if (isConfirmedRateLimit && !isRateLimitRecovery) {
        console.log('🚫 CONFIRMED Rate limit detected:', cafesError.message);
        setIsRateLimitRecovery(true);
        
        // Auto-recovery after 8 seconds
        const recoveryTimer = setTimeout(() => {
          console.log('✅ Rate limit recovery completed, reloading...');
          setIsRateLimitRecovery(false);
          window.location.reload();
        }, 8000);
        
        return () => clearTimeout(recoveryTimer);
      }
    } else {
      // Clear rate limit recovery if error is resolved
      setIsRateLimitRecovery(false);
    }
  }, [cafesError, isRateLimitRecovery]);

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

  // 🚀 **APP INITIALIZATION WITH LOADING STAGES**
  useEffect(() => {
    console.log('🚀 Starting app initialization...');
    setLoadingStage('initializing');
    setLoadingProgress(0);
    
    const initializeApp = async () => {
      // Stage 1: Backend Health Check
      setLoadingProgress(20);
      const backendOk = await checkBackendHealth();
      
      if (backendOk) {
        console.log('✅ Backend ready');
        setLoadingProgress(40);
        setAppReady(true);
      } else {
        // Continue with degraded mode
        console.log('⚡ App ready with degraded backend');
        setLoadingProgress(30);
        setAppReady(true);
      }
      
      // Stage 2: Location Detection
      setLoadingStage('location');
      setLoadingProgress(50);
    };

    initializeApp();
  }, [checkBackendHealth]);

  // 📍 **LOCATION STAGE MANAGEMENT**
  useEffect(() => {
    if (appReady && !locationRequested && !userLocation && !locationLoading) {
      console.log('📍 Auto-requesting location...');
      setLocationRequested(true);
      setLoadingStage('location');
      setLoadingProgress(60);
      
      if (refreshLocation) {
        refreshLocation();
      }
    }
  }, [appReady, locationRequested, userLocation, locationLoading, refreshLocation]);

  // 📍 **LOCATION PROGRESS TRACKING**
  useEffect(() => {
    if (locationLoading) {
      setLoadingStage('location');
      setLoadingProgress(70);
    } else if (userLocation && hasLocation) {
      setLoadingProgress(80);
    }
  }, [locationLoading, userLocation, hasLocation]);

  // 🗺️ **MAP CENTER UPDATE AND STAGE PROGRESSION**
  useEffect(() => {
    if (userLocation && hasLocation && !locationLoading) {
      console.log('📍 Setting map center to user location:', {
        lat: userLocation.latitude.toFixed(6),
        lng: userLocation.longitude.toFixed(6)
      });
      
      setMapCenter({
        lat: userLocation.latitude,
        lng: userLocation.longitude
      });
      
      // Move to map stage
      setLoadingStage('map');
      setLoadingProgress(90);
    }
  }, [userLocation, hasLocation, locationLoading]);

  // 🗺️ **FINAL READINESS CHECK**
  useEffect(() => {
    // App is fully ready when we have a map center and not in rate limit recovery
    if (appReady && mapCenter && !isRateLimitRecovery) {
      // Small delay to ensure everything is settled
      const timer = setTimeout(() => {
        setLoadingStage('ready');
        setLoadingProgress(100);
        setIsFullyReady(true);
        console.log('🎉 App fully ready!');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [appReady, mapCenter, isRateLimitRecovery]);

  // 🔄 **SEARCH CHANGE HANDLER**
  const handleSearchChange = useCallback((changes) => {
    console.log('🔍 Search parameters changed:', changes);
    
    if (changes.type !== undefined) {
      setCafeType(changes.type);
    }
    
    if (changes.radius !== undefined) {
      setSearchRadius(parseInt(changes.radius));
    }
    
    // Auto-refetch with new parameters
    setTimeout(() => {
      if (refetchCafes && mapCenter) {
        console.log('🔄 Auto-refetching with new search params');
        refetchCafes();
      }
    }, 300);
    
  }, [refetchCafes, mapCenter]);

  // 📍 **LOCATION HANDLERS**
  const handleLocationRetry = useCallback(() => {
    console.log('🔄 Retrying location detection...');
    setLocationRequested(false);
    if (refreshLocation) {
      refreshLocation();
    }
  }, [refreshLocation]);

  const handlePreciseLocation = useCallback(() => {
    console.log('🎯 Requesting precise location...');
    if (getPreciseLocation) {
      getPreciseLocation();
    }
  }, [getPreciseLocation]);

  // Go to user location handler with smooth animation
  const handleGoToUserLocation = useCallback(() => {
    if (!userLocation) {
      console.log('❌ No user location available');
      if (refreshLocation) {
        refreshLocation();
      }
      return;
    }
    
    console.log('📍 Navigating to user location:', userLocation);
    
    // Update map center to user location
    setMapCenter({
      lat: userLocation.latitude,
      lng: userLocation.longitude
    });
    
    // Trigger a refresh of cafes around user location
    setTimeout(() => {
      if (refetchCafes) {
        refetchCafes();
      }
    }, 500); // Small delay to ensure map center is updated
    
  }, [userLocation, refreshLocation, refetchCafes]);

  // 1. Rate limit recovery screen (highest priority) - ONLY for confirmed API errors
  if (isRateLimitRecovery) {
    return (
      <LoadingScreen 
        message="Troppo veloce!"
        subMessage="Sto ricaricando l'applicazione per tornare operativo..."
        progress={100}
        isRateLimitRecovery={true}
      />
    );
  }

  // 2. Creative startup loading screen (before map is ready)
  if (!isFullyReady) {
    const getMessage = () => {
      switch (loadingStage) {
        case 'initializing': return 'Avvio applicazione...';
        case 'location': return 'Rilevamento posizione...';
        case 'map': return 'Preparazione mappa...';
        case 'ready': return 'Finalizzazione...';
        default: return 'Caricamento...';
      }
    };

    const getSubMessage = () => {
      switch (loadingStage) {
        case 'initializing': return 'Controllo servizi backend';
        case 'location': return qualityText && sourceText ? `${qualityText} • ${sourceText}` : 'Attivazione GPS';
        case 'map': return 'Configurazione interfaccia mappa';
        case 'ready': return 'Caricamento dati locali';
        default: return '';
      }
    };

    return (
      <StartupLoadingScreen
        stage={loadingStage}
        progress={loadingProgress}
        message={getMessage()}
        subMessage={getSubMessage()}
        locationQuality={qualityText}
        onLocationRetry={loadingStage === 'location' ? handleLocationRetry : null}
      />
    );
  }

  // 3. Location error state (if location failed and no map center)
  if (!mapCenter && locationError && !locationLoading && appReady) {
    return (
      <StartupLoadingScreen
        stage="location"
        progress={50}
        message="Posizione richiesta"
        subMessage="Per trovare i migliori locali nelle vicinanze"
        onLocationRetry={handleLocationRetry}
      />
    );
  }

  // ❌ **FALLBACK ERROR STATE**
  if (!mapCenter && locationError && !locationLoading) {
    return (
      <div className="map-app">
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '32px',
          borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
          maxWidth: '400px',
          width: '90%'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📍</div>
          <h3 style={{ marginBottom: '12px', color: '#1F2937' }}>Posizione richiesta</h3>
          <p style={{ color: '#6B7280', marginBottom: '24px', lineHeight: '1.5' }}>
            Per trovare i migliori locali nelle vicinanze, abbiamo bisogno della tua posizione.
          </p>
          <button
            onClick={handleLocationRetry}
            style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
            }}
          >
            📍 Consenti Posizione
          </button>
        </div>
      </div>
    );
  }

  // 🗺️ **MAIN APP WITH MAP**
  return (
    <div className="map-app">
      <FullPageMap
        center={mapCenter}
        zoom={zoom}
        cafes={cafes || []}
        selectedCafe={selectedCafe}
        userLocation={userLocation}
        onCafeSelect={setSelectedCafe}
        onCenterChange={setMapCenter}
        onClosePopup={() => setSelectedCafe(null)}
        loading={cafesLoading}
        error={cafesError}
        searchRadius={searchRadius}
        cafeType={cafeType}
        showControls={showControls}
        isEmbedMode={isEmbedMode}
        onSearchChange={handleSearchChange}
        onRefresh={refetchCafes}
        onGoToUserLocation={handleGoToUserLocation}
        locationLoading={locationLoading}
        locationError={locationError}
        detectionMethod={detectionMethod || 'browser'}
        locationCapability={locationCapability}
        onLocationRetry={handleLocationRetry}
        onPreciseLocation={handlePreciseLocation}
        qualityText={qualityText || 'good'}
        sourceText={sourceText || 'GPS'}
      />

      {/* 🏥 Backend Status Toast */}
      {backendError && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'rgba(251, 146, 60, 0.95)',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '14px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 10000
        }}>
          ⚠️ {backendError}
        </div>
      )}
    </div>
  );
}

export default App;